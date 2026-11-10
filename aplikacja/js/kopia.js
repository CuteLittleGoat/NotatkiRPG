// Kopia zapasowa bazy (plik CSV) i przywracanie — tylko dla admina.
//
// Przeglądarkowe SDK Firestore nie umie wylistować kolekcji, więc kopia obejmuje
// kolekcje znane aplikacji: kampanie/{id} z podkolekcjami (dla kampanii z rejestru
// kampanie.json) oraz admins. Kolekcja secrets — tylko na wyraźne życzenie admina.
import {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  Timestamp,
  GeoPoint,
  Bytes,
  DocumentReference
} from "./firebase.js";
import { KOLEKCJA_ADMINOW, KOLEKCJA_KAMPANII, KOLEKCJA_SEKRETOW, PODKOLEKCJE } from "./konfiguracja.js";
import {
  BladKopii,
  kolekcjaDokumentu,
  nazwaPliku,
  odkodujWartosc,
  podsumuj,
  podzielNaPartie,
  wczytajPlik,
  zbudujPlik
} from "./kopia-format.js";
import { pobierzPlik } from "./narzedzia.js";

const TYPY = { Timestamp, GeoPoint, Bytes, DocumentReference };
const FABRYKA = {
  timestamp: (s, ns) => new Timestamp(s, ns),
  geopunkt: (lat, lng) => new GeoPoint(lat, lng),
  bajty: (b64) => Bytes.fromBase64String(b64),
  referencja: (sciezka) => doc(db, sciezka)
};

/** Zbiera dokumenty z bazy. */
export async function zbierzDokumenty({ kampanie, zSecrets = false }, postep = () => {}) {
  const dokumenty = [];
  for (const id of kampanie) {
    postep(`Czytam kampanię ${id}…`);
    const kampania = await getDoc(doc(db, KOLEKCJA_KAMPANII, id));
    if (kampania.exists()) dokumenty.push({ sciezka: kampania.ref.path, dane: kampania.data() });
    for (const sub of PODKOLEKCJE) {
      const zdjecie = await getDocs(collection(db, KOLEKCJA_KAMPANII, id, sub));
      zdjecie.forEach((d) => dokumenty.push({ sciezka: d.ref.path, dane: d.data() }));
    }
  }
  postep("Czytam konta admina…");
  const admini = await getDocs(collection(db, KOLEKCJA_ADMINOW));
  admini.forEach((d) => dokumenty.push({ sciezka: d.ref.path, dane: d.data() }));
  if (zSecrets) {
    const sekrety = await getDocs(collection(db, KOLEKCJA_SEKRETOW));
    sekrety.forEach((d) => dokumenty.push({ sciezka: d.ref.path, dane: d.data() }));
  }
  return dokumenty;
}

/** Tworzy plik kopii i od razu go pobiera. Zwraca { nazwa, liczba }. */
export async function pobierzKopie({ kampanie, zSecrets = false, przedrostek = "" }, postep = () => {}) {
  const dokumenty = await zbierzDokumenty({ kampanie, zSecrets }, postep);
  const teraz = new Date();
  const kolekcje = [KOLEKCJA_ADMINOW, ...(zSecrets ? [KOLEKCJA_SEKRETOW] : [])];
  const tresc = zbudujPlik({ wykonano: teraz, zakres: { kampanie, kolekcje }, zawieraSecrets: zSecrets }, dokumenty, TYPY);
  const nazwa = przedrostek ? nazwaPliku(teraz).replace("NotatkiRPG_kopia_", `NotatkiRPG_kopia_${przedrostek}_`) : nazwaPliku(teraz);
  pobierzPlik(nazwa, tresc);
  return { nazwa, liczba: dokumenty.length, podsumowanie: podsumuj(dokumenty) };
}

/**
 * Analiza pliku przed przywróceniem — do podglądu.
 * @returns {{meta, dokumenty, podsumowanie, kampanie, maAdmins, maSecrets}}
 */
export function przeanalizujPlik(tekst) {
  const { meta, dokumenty } = wczytajPlik(tekst);
  const kampanie = new Set(meta.zakres.kampanie);
  for (const d of dokumenty) {
    const c = d.sciezka.split("/");
    if (c[0] === KOLEKCJA_KAMPANII) kampanie.add(c[1]);
  }
  return {
    meta,
    dokumenty,
    podsumowanie: podsumuj(dokumenty),
    kampanie: [...kampanie].sort(),
    maAdmins: dokumenty.some((d) => d.sciezka.startsWith(`${KOLEKCJA_ADMINOW}/`)),
    maSecrets: dokumenty.some((d) => d.sciezka.startsWith(`${KOLEKCJA_SEKRETOW}/`))
  };
}

/**
 * Przywraca dane z pliku.
 * tryb "scal": zapisuje dokumenty z pliku (nadpisuje te same), resztę zostawia.
 * tryb "zastap": usuwa dokumenty z kolekcji objętych kopią, których nie ma w pliku,
 *   potem zapisuje dokumenty z pliku. Kolekcje admins i secrets zmienia tylko wtedy,
 *   gdy plik zawiera z nich jakikolwiek dokument (żeby nie skasować kont).
 * Zapis partiami po najwyżej 500 operacji; przy błędzie zatrzymuje się.
 *
 * @returns {{ok: boolean, wykonane: {usuniete: Map, zapisane: Map}, partie: number, wszystkiePartie: number, blad?: string}}
 */
export async function przywroc(analiza, tryb, postep = () => {}) {
  if (tryb !== "scal" && tryb !== "zastap") throw new BladKopii("Nieznany tryb przywracania.");
  const wPliku = new Set(analiza.dokumenty.map((d) => d.sciezka));
  const operacje = [];

  // Odkodowanie wszystkiego PRZED pierwszym zapisem — błąd w pliku nie zostawi połowy zmian.
  const zapisy = analiza.dokumenty.map((d) => ({ rodzaj: "zapis", sciezka: d.sciezka, dane: odkodujWartosc(d.dane, FABRYKA) }));

  if (tryb === "zastap") {
    postep("Sprawdzam, co trzeba usunąć…");
    const doWyczyszczenia = new Set();
    for (const id of analiza.kampanie) {
      for (const sub of PODKOLEKCJE) doWyczyszczenia.add(`${KOLEKCJA_KAMPANII}/${id}/${sub}`);
    }
    for (const d of analiza.dokumenty) {
      const k = kolekcjaDokumentu(d.sciezka);
      if (k !== KOLEKCJA_KAMPANII) doWyczyszczenia.add(k);
    }
    if (!analiza.maAdmins) doWyczyszczenia.delete(KOLEKCJA_ADMINOW);
    if (!analiza.maSecrets) doWyczyszczenia.delete(KOLEKCJA_SEKRETOW);
    for (const sciezkaKolekcji of [...doWyczyszczenia].sort()) {
      const zdjecie = await getDocs(collection(db, sciezkaKolekcji));
      zdjecie.forEach((d) => {
        if (!wPliku.has(d.ref.path)) operacje.push({ rodzaj: "usuniecie", sciezka: d.ref.path });
      });
    }
    // Dokumenty samych kampanii (kampanie/{id}) — tylko tych objętych kopią.
    for (const id of analiza.kampanie) {
      const sciezka = `${KOLEKCJA_KAMPANII}/${id}`;
      if (!wPliku.has(sciezka)) {
        const d = await getDoc(doc(db, sciezka));
        if (d.exists()) operacje.push({ rodzaj: "usuniecie", sciezka });
      }
    }
  }
  operacje.push(...zapisy);

  const partie = podzielNaPartie(operacje, 500);
  const wykonane = { usuniete: new Map(), zapisane: new Map() };
  const dolicz = (mapa, sciezka) => {
    const k = kolekcjaDokumentu(sciezka) || sciezka;
    mapa.set(k, (mapa.get(k) || 0) + 1);
  };
  for (let i = 0; i < partie.length; i++) {
    postep(`Zapisuję partię ${i + 1} z ${partie.length}…`);
    const partia = writeBatch(db);
    for (const op of partie[i]) {
      if (op.rodzaj === "usuniecie") partia.delete(doc(db, op.sciezka));
      else partia.set(doc(db, op.sciezka), op.dane);
    }
    try {
      await partia.commit();
    } catch (e) {
      return { ok: false, wykonane, partie: i, wszystkiePartie: partie.length, blad: e };
    }
    for (const op of partie[i]) dolicz(op.rodzaj === "usuniecie" ? wykonane.usuniete : wykonane.zapisane, op.sciezka);
  }
  return { ok: true, wykonane, partie: partie.length, wszystkiePartie: partie.length };
}
