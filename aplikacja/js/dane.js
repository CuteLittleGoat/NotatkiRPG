// Dane kampanii w Firestore: kampanie/{kampaniaId}/(notatki|postep|powiazania|ustawienia).
// Zmiany przychodzą na żywo (onSnapshot), więc gracze widzą nawzajem swoje wpisy.
import {
  db,
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  deleteField
} from "./firebase.js";
import { DOKUMENT_USTAWIEN, KOLEKCJA_KAMPANII } from "./konfiguracja.js";

export class DaneKampanii {
  constructor(kampaniaId, nazwa) {
    this.id = kampaniaId;
    this.nazwa = nazwa;
    this.kampaniaGotowa = false;
  }

  kolekcja(nazwa) {
    return collection(db, KOLEKCJA_KAMPANII, this.id, nazwa);
  }

  dokument(kolekcja, id) {
    return doc(db, KOLEKCJA_KAMPANII, this.id, kolekcja, id);
  }

  /** Subskrypcja całej podkolekcji. Zwraca funkcję kończącą nasłuch. */
  subskrybuj(nazwa, przyDanych, przyBledzie) {
    return onSnapshot(
      this.kolekcja(nazwa),
      { includeMetadataChanges: false },
      (zdjecie) => {
        const wpisy = zdjecie.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }));
        przyDanych(wpisy, zdjecie.metadata);
      },
      przyBledzie
    );
  }

  subskrybujUstawienia(przyDanych, przyBledzie) {
    // includeMetadataChanges: dostajemy też informację „dane już z serwera”,
    // z której korzysta wskaźnik połączenia na dole ekranu.
    return onSnapshot(
      this.dokument("ustawienia", DOKUMENT_USTAWIEN),
      { includeMetadataChanges: true },
      (zdjecie) => przyDanych(zdjecie.exists() ? zdjecie.data({ serverTimestamps: "estimate" }) : {}, zdjecie.metadata),
      przyBledzie
    );
  }

  /** Dokument kampanii (nazwa, utworzono) tworzymy przy pierwszym zapisie. */
  async upewnijSieKampania() {
    if (this.kampaniaGotowa) return;
    const ref = doc(db, KOLEKCJA_KAMPANII, this.id);
    const zdjecie = await getDoc(ref);
    if (!zdjecie.exists()) {
      await setDoc(ref, { nazwa: this.nazwa, utworzono: serverTimestamp() }, { merge: true });
    }
    this.kampaniaGotowa = true;
  }

  async dodaj(nazwa, dane, sesja) {
    await this.upewnijSieKampania();
    return addDoc(this.kolekcja(nazwa), {
      ...dane,
      kontoId: sesja?.kontoId ?? null,
      utworzono: serverTimestamp(),
      zmieniono: serverTimestamp()
    });
  }

  async zmien(nazwa, id, dane, sesja) {
    await this.upewnijSieKampania();
    return updateDoc(this.dokument(nazwa, id), {
      ...dane,
      kontoIdZmiany: sesja?.kontoId ?? null,
      zmieniono: serverTimestamp()
    });
  }

  async usun(nazwa, id) {
    return deleteDoc(this.dokument(nazwa, id));
  }

  /**
   * Zmiana ustawień map (tylko admin). Zapis ze scalaniem — pozostałe pola zostają.
   * Wartość null oznacza „wróć do ustawienia domyślnego z manifestu”.
   */
  async zapiszUstawienia(zmiany, sesja) {
    await this.upewnijSieKampania();
    const zamien = (obiekt) => {
      const wynik = {};
      for (const [k, v] of Object.entries(obiekt)) {
        if (v === null) wynik[k] = deleteField();
        else if (typeof v === "object" && !Array.isArray(v)) wynik[k] = zamien(v);
        else wynik[k] = v;
      }
      return wynik;
    };
    return setDoc(
      this.dokument("ustawienia", DOKUMENT_USTAWIEN),
      { ...zamien(zmiany), zmieniono: serverTimestamp(), kontoIdZmiany: sesja?.kontoId ?? null },
      { merge: true }
    );
  }
}
