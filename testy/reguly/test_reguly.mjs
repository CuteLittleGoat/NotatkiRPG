// Test reguł Firestore (firebase/firestore.rules) w lokalnym emulatorze.
// Uruchomienie (wymaga Javy 11+):
//   cd testy/reguly && npm install && npm test
// Emulator działa w trybie „demo” — nie łączy się z prawdziwym projektem Firebase.
//
// Zapisy w testach odtwarzają DOKŁADNIE to, co robi aplikacja (aplikacja/js/dane.js,
// kopia.js, logowanie.js). Gdy aplikacja zacznie zapisywać nowe pole — dopisz je
// do reguł i do tego testu.
import { readFileSync } from "node:fs";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import {
  setLogLevel,
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch
} from "firebase/firestore";

setLogLevel("silent"); // odrzucenia są tu oczekiwane — bez zaśmiecania wyniku
const reguly = readFileSync(new URL("../../firebase/firestore.rules", import.meta.url), "utf8");
const srodowisko = await initializeTestEnvironment({ projectId: "demo-notatkirpg", firestore: { rules: reguly } });

// Konta TESTOWE (wymyślone) — wpisane z pominięciem reguł, jak ręcznie w konsoli.
await srodowisko.withSecurityRulesDisabled(async (kontekst) => {
  const baza = kontekst.firestore();
  await setDoc(doc(baza, "secrets/Player1"), { PlayerName: "test-admin", PlayerPassword: "haslo-admina", DisplayName: "Admin" });
  await setDoc(doc(baza, "secrets/Player2"), { PlayerName: "test-edytor", PlayerPassword: "haslo-edytora", DisplayName: "Edytor" });
  await setDoc(doc(baza, "secrets/Player3"), { PlayerName: "test-gracz", PlayerPassword: "haslo-gracza", DisplayName: "Gracz" });
  await setDoc(doc(baza, "admins/Player1"), { rola: "admin" });
  await setDoc(doc(baza, "admins/Player2"), { rola: "edytor" });
});

// Bez logowania Firebase każde zapytanie jest „niezalogowane” — tak jak w aplikacji.
const db = srodowisko.unauthenticatedContext().firestore();

let ok = 0;
let zle = 0;
async function test(nazwa, funkcja) {
  try {
    await funkcja();
    ok++;
    console.log(`  OK    ${nazwa}`);
  } catch (e) {
    zle++;
    console.log(`  BŁĄD  ${nazwa}\n        ${String(e.message).split("\n")[0]}`);
  }
}

const NOTATKI = collection(db, "kampanie", "iliac", "notatki");
const notatka = (dodatki = {}) => ({
  tytul: "Konwój na Trakcie",
  tresc: "Wiersz 1\nWiersz 2",
  elementId: "trakt",
  podpis: "Brat Kael",
  kontoId: "Player2",
  utworzono: serverTimestamp(),
  zmieniono: serverTimestamp(),
  ...dodatki
});

console.log("[odczyt]");
await test("logowanie: zapytanie o login w secrets i odczyt admins", async () => {
  await assertSucceeds(getDocs(query(collection(db, "secrets"), where("PlayerName", "==", "test-gracz"))));
  await assertSucceeds(getDoc(doc(db, "admins", "Player1")));
  await assertSucceeds(getDoc(doc(db, "admins", "Player2"))); // rola „edytor”
  await assertSucceeds(getDoc(doc(db, "admins", "Player3"))); // brak dokumentu = tylko czyta
});
await test("lista kampanii po zalogowaniu: odczyt wszystkich dokumentów kampanii", async () => {
  await assertSucceeds(getDocs(collection(db, "kampanie")));
});
await test("odczyt danych kampanii (lista i pojedynczy dokument)", async () => {
  await assertSucceeds(getDocs(NOTATKI));
  await assertSucceeds(getDoc(doc(db, "kampanie", "iliac")));
  await assertSucceeds(getDoc(doc(db, "kampanie", "iliac", "ustawienia", "mapy")));
});
await test("kopia zapasowa: odczyt wszystkich znanych kolekcji", async () => {
  for (const k of ["notatki", "ustawienia"]) await assertSucceeds(getDocs(collection(db, "kampanie", "iliac", k)));
  await assertSucceeds(getDocs(collection(db, "admins")));
  await assertSucceeds(getDocs(collection(db, "secrets")));
});
await test("nieznana kolekcja: brak odczytu", async () => {
  await assertFails(getDocs(collection(db, "inne")));
});

console.log("[zapisy aplikacji — muszą przejść]");
let idNotatki = null;
await test("dokument kampanii przy pierwszym zapisie (setDoc ze scalaniem)", async () => {
  await assertSucceeds(setDoc(doc(db, "kampanie", "iliac"), { nazwa: "Kopiec Iliac", utworzono: serverTimestamp() }, { merge: true }));
});
await test("admin: widoczność kampanii dla graczy (nowy dokument i zmiana, setDoc ze scalaniem)", async () => {
  await assertSucceeds(
    setDoc(doc(db, "kampanie", "nowa-kampania"), { nazwa: "Nowa", widoczna: false, zmieniono: serverTimestamp(), kontoIdZmiany: "Player1" }, { merge: true })
  );
  await assertSucceeds(
    setDoc(doc(db, "kampanie", "iliac"), { nazwa: "Kopiec Iliac", widoczna: true, zmieniono: serverTimestamp(), kontoIdZmiany: "Player1" }, { merge: true })
  );
  await assertSucceeds(
    setDoc(doc(db, "kampanie", "iliac"), { nazwa: "Kopiec Iliac", widoczna: false, zmieniono: serverTimestamp(), kontoIdZmiany: "Player1" }, { merge: true })
  );
});
await test("edytor: nowa notatka przy miejscu", async () => {
  const ref = await assertSucceeds(addDoc(NOTATKI, notatka()));
  idNotatki = ref.id;
});
await test("edytor: notatka ogólna (elementId = null), pusty podpis", async () => {
  await assertSucceeds(addDoc(NOTATKI, notatka({ elementId: null, podpis: "" })));
});
await test("edytor: edycja notatki (updateDoc jak w aplikacji)", async () => {
  await assertSucceeds(
    updateDoc(doc(NOTATKI, idNotatki), {
      tytul: "Konwój (potwierdzone)",
      tresc: "nowa treść",
      elementId: "trakt",
      podpis: "Mira",
      kontoIdZmiany: "Player2",
      zmieniono: serverTimestamp()
    })
  );
});
await test("edytor: edycja starszej notatki, która ma jeszcze pole kategoria", async () => {
  await srodowisko.withSecurityRulesDisabled(async (k) => {
    await setDoc(doc(k.firestore(), "kampanie/iliac/notatki/stara"), { tytul: "Stara", tresc: "", kategoria: "miejsce", elementId: "trakt", podpis: "", kontoId: "Player2" });
  });
  await assertSucceeds(updateDoc(doc(NOTATKI, "stara"), { tytul: "Stara (zmieniona)", tresc: "x", elementId: "trakt", podpis: "Ola", kontoIdZmiany: "Player2", zmieniono: serverTimestamp() }));
});
await test("edytor: najdłuższe dozwolone teksty", async () => {
  await assertSucceeds(addDoc(NOTATKI, notatka({ tytul: "T".repeat(200), tresc: "x".repeat(20000), podpis: "P".repeat(80) })));
});
await test("edytor: usunięcie notatki", async () => {
  await assertSucceeds(deleteDoc(doc(NOTATKI, idNotatki)));
});
const USTAWIENIA = doc(db, "kampanie", "iliac", "ustawienia", "mapy");
await test("admin: odsłonięcie miejsca, zakładki i zmiana kolorów (setDoc ze scalaniem)", async () => {
  await assertSucceeds(setDoc(USTAWIENIA, { elementy: { brassyl: true }, zmieniono: serverTimestamp(), kontoIdZmiany: "Player1" }, { merge: true }));
  await assertSucceeds(setDoc(USTAWIENIA, { mapy: { kopiec: { widoczna: true } }, zmieniono: serverTimestamp(), kontoIdZmiany: "Player1" }, { merge: true }));
  await assertSucceeds(setDoc(USTAWIENIA, { mapy: { okolice: { kolor: "bursztynowy" } }, zmieniono: serverTimestamp(), kontoIdZmiany: "Player1" }, { merge: true }));
  await assertSucceeds(setDoc(USTAWIENIA, { kolor: "zielony", zmieniono: serverTimestamp(), kontoIdZmiany: "Player1" }, { merge: true }));
  await assertSucceeds(
    setDoc(USTAWIENIA, { elementy: { trakt: false, kanion: true, brassyl: false }, zmieniono: serverTimestamp(), kontoIdZmiany: "Player1" }, { merge: true })
  );
});
await test("admin: ukrycie i odsłonięcie zakładki Notatki (pole zakladki)", async () => {
  await assertSucceeds(setDoc(USTAWIENIA, { zakladki: { notatki: false }, zmieniono: serverTimestamp(), kontoIdZmiany: "Player1" }, { merge: true }));
  await assertSucceeds(setDoc(USTAWIENIA, { zakladki: { notatki: true }, zmieniono: serverTimestamp(), kontoIdZmiany: "Player1" }, { merge: true }));
  await assertSucceeds(setDoc(USTAWIENIA, { zakladki: { notatki: deleteField() }, zmieniono: serverTimestamp(), kontoIdZmiany: "Player1" }, { merge: true }));
});
await test("admin: przywrócenie ustawień domyślnych (deleteField)", async () => {
  await assertSucceeds(
    setDoc(USTAWIENIA, { mapy: { kopiec: deleteField() }, elementy: { brassyl: deleteField(), trakt: deleteField() }, zmieniono: serverTimestamp(), kontoIdZmiany: "Player1" }, { merge: true })
  );
});
await test("przywracanie kopii: partia z usunięciami i dokumentami ze starymi znacznikami czasu", async () => {
  const stary = new Timestamp(1762790400, 0);
  const partia = writeBatch(db);
  partia.set(doc(db, "kampanie", "iliac"), { nazwa: "Kopiec Iliac", utworzono: stary, widoczna: true, zmieniono: stary, kontoIdZmiany: "Player1" });
  partia.set(doc(NOTATKI, "abcDEF123_-"), { tytul: "Z kopii", tresc: "", kategoria: "inne", elementId: null, podpis: "", kontoId: "Player2", utworzono: stary, zmieniono: stary });
  partia.set(USTAWIENIA, { mapy: { okolice: { widoczna: true, kolor: "zielony" } }, elementy: { trakt: true }, kolor: "zielony", zmieniono: stary, kontoIdZmiany: "Player1" });
  partia.delete(doc(NOTATKI, "nie-ma-takiej"));
  await assertSucceeds(partia.commit());
});

console.log("[zapisy niedozwolone — muszą zostać odrzucone]");
await test("notatka z obcym polem", async () => {
  await assertFails(addDoc(NOTATKI, notatka({ skrypt: "<script>" })));
});
await test("notatka bez tytułu / tytuł za długi / treść za długa / zły typ", async () => {
  const bez = notatka();
  delete bez.tytul;
  await assertFails(addDoc(NOTATKI, bez));
  await assertFails(addDoc(NOTATKI, notatka({ tytul: "T".repeat(201) })));
  await assertFails(addDoc(NOTATKI, notatka({ tresc: "x".repeat(20001) })));
  await assertFails(addDoc(NOTATKI, notatka({ tresc: 123 })));
  await assertFails(addDoc(NOTATKI, notatka({ utworzono: "wczoraj" })));
});
await test("ustawienia: wartość inna niż tak/nie, obce pole, inny dokument", async () => {
  await assertFails(setDoc(USTAWIENIA, { elementy: { brassyl: "tak" } }, { merge: true }));
  await assertFails(setDoc(USTAWIENIA, { zakladki: { notatki: "nie" } }, { merge: true }));
  await assertFails(setDoc(USTAWIENIA, { obce: 1 }, { merge: true }));
  await assertFails(setDoc(doc(db, "kampanie", "iliac", "ustawienia", "inne"), { kolor: "zielony" }));
});
await test("usunięte zakładki: postęp i powiązania są zablokowane", async () => {
  await assertFails(addDoc(collection(db, "kampanie", "iliac", "postep"), { tytul: "x", stan: "otwarte" }));
  await assertFails(addDoc(collection(db, "kampanie", "iliac", "powiazania"), { od: "a", do: "b", rodzaj: "sojusz" }));
  await assertFails(getDocs(collection(db, "kampanie", "iliac", "postep")));
});
await test("nieznane kolekcje i podkolekcje", async () => {
  await assertFails(setDoc(doc(db, "inne", "x"), { a: 1 }));
  await assertFails(setDoc(doc(db, "kampanie", "iliac", "obce", "x"), { a: 1 }));
  await assertFails(setDoc(doc(db, "kampanie", "iliac", "notatki", "x", "glebiej", "y"), { a: 1 }));
});
await test("dziwny identyfikator kampanii", async () => {
  await assertFails(setDoc(doc(db, "kampanie", "Iliac!"), { nazwa: "x" }));
});
await test("dokument kampanii: widoczność inna niż tak/nie, obce pole, brak nazwy", async () => {
  await assertFails(setDoc(doc(db, "kampanie", "iliac"), { widoczna: "tak" }, { merge: true }));
  await assertFails(setDoc(doc(db, "kampanie", "iliac"), { ukryta: true }, { merge: true }));
  await assertFails(setDoc(doc(db, "kampanie", "bez-nazwy"), { widoczna: true }));
});
await test("konta (admins, secrets): bez dodawania, zmian i usuwania", async () => {
  await assertFails(setDoc(doc(db, "admins", "Player2"), { rola: "admin" }));
  await assertFails(updateDoc(doc(db, "admins", "Player2"), { rola: "admin" }));
  await assertFails(setDoc(doc(db, "admins", "Player3"), { rola: "edytor" })); // konto do przeglądania nie nada sobie edycji
  await assertFails(updateDoc(doc(db, "admins", "Player1"), { rola: "gracz" }));
  await assertFails(deleteDoc(doc(db, "admins", "Player1")));
  await assertFails(deleteDoc(doc(db, "admins", "Player2")));
  await assertFails(setDoc(doc(db, "secrets", "Player4"), { PlayerName: "x", PlayerPassword: "y" }));
  await assertFails(updateDoc(doc(db, "secrets", "Player3"), { DisplayName: "Edytor" }));
  await assertFails(updateDoc(doc(db, "secrets", "Player2"), { PlayerPassword: "nowe" }));
  await assertFails(deleteDoc(doc(db, "secrets", "Player2")));
});
await test("przywracanie: najkrótsza notatka z kopii (tylko tytuł i znaczniki czasu)", async () => {
  await assertSucceeds(setDoc(doc(NOTATKI, "minimalna"), { tytul: "x", utworzono: new Timestamp(1, 0), zmieniono: new Timestamp(1, 0) }));
});
await test("przywracanie: partia z kontem admina zostaje odrzucona w całości", async () => {
  const partia = writeBatch(db);
  partia.set(doc(NOTATKI, "zPartii1"), { tytul: "x", utworzono: new Timestamp(1, 0), zmieniono: new Timestamp(1, 0) });
  partia.set(doc(db, "admins", "Player1"), { rola: "admin" });
  await assertFails(partia.commit());
  await srodowisko.withSecurityRulesDisabled(async (k) => {
    const d = await getDoc(doc(k.firestore(), "kampanie/iliac/notatki/zPartii1"));
    if (d.exists()) throw new Error("część odrzuconej partii została zapisana");
  });
});

await srodowisko.cleanup();
console.log(`\nWynik: ${ok}/${ok + zle} testów reguł OK.`);
process.exit(zle ? 1 : 0);
