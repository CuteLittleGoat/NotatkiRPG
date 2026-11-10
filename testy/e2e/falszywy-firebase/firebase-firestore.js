// UDAWANY Firestore — tylko do testów automatycznych (testy/e2e/uruchom.cjs).
// Implementuje ten podzbiór API Firestore 13.2.0, którego używa aplikacja.
// Dane trzyma w localStorage przeglądarki testowej (klucz „falszywa-baza”), więc
// przetrwają przejście między stronami, a zmiany widać na żywo w innych kartach
// (zdarzenie „storage”). Flaga localStorage „falszywa-baza-odmowa” = "1" udaje
// reguły blokujące dostęp (permission-denied).

const KLUCZ = "falszywa-baza";
const KLUCZ_ODMOWY = "falszywa-baza-odmowa";

export class Timestamp {
  constructor(seconds, nanoseconds) {
    this.seconds = seconds;
    this.nanoseconds = nanoseconds;
  }
  static now() {
    return Timestamp.fromMillis(Date.now());
  }
  static fromDate(d) {
    return Timestamp.fromMillis(d.getTime());
  }
  static fromMillis(ms) {
    return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1e6);
  }
  toMillis() {
    return this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6);
  }
  toDate() {
    return new Date(this.toMillis());
  }
}

export class GeoPoint {
  constructor(latitude, longitude) {
    this.latitude = latitude;
    this.longitude = longitude;
  }
}

export class Bytes {
  constructor(b64) {
    this._b64 = b64;
  }
  static fromBase64String(b64) {
    return new Bytes(b64);
  }
  toBase64() {
    return this._b64;
  }
}

export class DocumentReference {
  constructor(path) {
    this.type = "document";
    this.path = path;
    this.id = path.split("/").pop();
  }
}

class CollectionReference {
  constructor(path) {
    this.type = "collection";
    this.path = path;
    this.id = path.split("/").pop();
  }
}

const SERWER = { __znacznik: "serverTimestamp" };
const USUN = { __znacznik: "deleteField" };
export const serverTimestamp = () => SERWER;
export const deleteField = () => USUN;

function blad(kod) {
  const e = new Error(`[udawany Firestore] ${kod}`);
  e.code = kod;
  return e;
}
const odmowa = () => {
  try {
    return localStorage.getItem(KLUCZ_ODMOWY) === "1";
  } catch {
    return false;
  }
};

// ---- serializacja do localStorage ----
function doZapisu(v) {
  if (v instanceof Timestamp) return { __ts: [v.seconds, v.nanoseconds] };
  if (v instanceof GeoPoint) return { __geo: [v.latitude, v.longitude] };
  if (v instanceof Bytes) return { __bajty: v._b64 };
  if (v instanceof DocumentReference) return { __ref: v.path };
  if (Array.isArray(v)) return v.map(doZapisu);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, doZapisu(x)]));
  return v;
}
function zZapisu(v) {
  if (Array.isArray(v)) return v.map(zZapisu);
  if (v && typeof v === "object") {
    if (v.__ts) return new Timestamp(v.__ts[0], v.__ts[1]);
    if (v.__geo) return new GeoPoint(v.__geo[0], v.__geo[1]);
    if ("__bajty" in v) return new Bytes(v.__bajty);
    if ("__ref" in v) return new DocumentReference(v.__ref);
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, zZapisu(x)]));
  }
  return v;
}
function wczytaj() {
  try {
    return new Map(Object.entries(JSON.parse(localStorage.getItem(KLUCZ) || "{}")));
  } catch {
    return new Map();
  }
}
let baza = wczytaj();
function zapisz() {
  localStorage.setItem(KLUCZ, JSON.stringify(Object.fromEntries(baza)));
}

// ---- odwołania ----
export function getFirestore() {
  return { typ: "udawany-firestore" };
}
function sciezka(baza_, segmenty) {
  const przed = baza_ && baza_.path ? [baza_.path] : [];
  return [...przed, ...segmenty].join("/").replace(/\/+/g, "/");
}
export function collection(rodzic, ...segmenty) {
  const p = sciezka(rodzic, segmenty);
  if (p.split("/").length % 2 !== 1) throw new Error(`Zła ścieżka kolekcji: ${p}`);
  return new CollectionReference(p);
}
export function doc(rodzic, ...segmenty) {
  const p = sciezka(rodzic, segmenty);
  if (p.split("/").length % 2 !== 0) throw new Error(`Zła ścieżka dokumentu: ${p}`);
  return new DocumentReference(p);
}
export function where(pole, op, wartosc) {
  if (op !== "==") throw new Error("Udawany Firestore obsługuje tylko ==");
  return { pole, wartosc };
}
export function query(kolekcja, ...warunki) {
  return { type: "query", path: kolekcja.path, warunki };
}

// ---- migawki ----
function kopiaDanych(surowe) {
  return zZapisu(JSON.parse(JSON.stringify(surowe)));
}
class DocumentSnapshot {
  constructor(path, surowe) {
    this.ref = new DocumentReference(path);
    this.id = this.ref.id;
    this._surowe = surowe;
    this.metadata = { fromCache: false, hasPendingWrites: false };
  }
  exists() {
    return this._surowe !== undefined;
  }
  data() {
    return this._surowe === undefined ? undefined : kopiaDanych(this._surowe);
  }
}
function dokumentyKolekcji(cel) {
  const wynik = [];
  for (const [p, surowe] of baza) {
    const czesci = p.split("/");
    if (czesci.slice(0, -1).join("/") !== cel.path) continue;
    const dane = zZapisu(surowe);
    if ((cel.warunki || []).every((w) => dane[w.pole] === w.wartosc)) wynik.push(new DocumentSnapshot(p, surowe));
  }
  return wynik.sort((a, b) => a.id.localeCompare(b.id));
}
function migawkaKolekcji(cel) {
  const docs = dokumentyKolekcji(cel);
  return { docs, size: docs.length, empty: !docs.length, forEach: (f) => docs.forEach(f), metadata: { fromCache: false, hasPendingWrites: false } };
}

export async function getDoc(ref) {
  if (odmowa()) throw blad("permission-denied");
  return new DocumentSnapshot(ref.path, baza.get(ref.path));
}
export async function getDocs(cel) {
  if (odmowa()) throw blad("permission-denied");
  return migawkaKolekcji(cel);
}

// ---- nasłuch ----
const sluchacze = new Set();
function powiadom() {
  for (const s of sluchacze) s();
}
export function onSnapshot(cel, ...reszta) {
  if (reszta[0] && typeof reszta[0] === "object" && typeof reszta[0] !== "function") reszta.shift();
  const [przyDanych, przyBledzie] = reszta;
  const wyslij = () => {
    if (odmowa()) {
      przyBledzie?.(blad("permission-denied"));
      return;
    }
    if (cel.type === "document") przyDanych(new DocumentSnapshot(cel.path, baza.get(cel.path)));
    else przyDanych(migawkaKolekcji(cel));
  };
  const s = () => setTimeout(wyslij, 0);
  sluchacze.add(s);
  s();
  return () => sluchacze.delete(s);
}
window.addEventListener("storage", (ev) => {
  if (ev.key === KLUCZ) {
    baza = wczytaj();
    powiadom();
  }
});

// ---- zapisy ----
function przetworz(dane, istniejace, scal) {
  const wynik = scal && istniejace ? JSON.parse(JSON.stringify(istniejace)) : {};
  const wpisz = (cel, zrodlo) => {
    for (const [k, v] of Object.entries(zrodlo)) {
      if (v === USUN) delete cel[k];
      else if (v === SERWER) cel[k] = doZapisu(Timestamp.now());
      else if (scal && v && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype) {
        if (!cel[k] || typeof cel[k] !== "object") cel[k] = {};
        wpisz(cel[k], v);
      } else cel[k] = doZapisu(v);
    }
  };
  wpisz(wynik, dane);
  return wynik;
}
function sprawdzZapis() {
  if (odmowa()) throw blad("permission-denied");
}
export async function setDoc(ref, dane, opcje = {}) {
  sprawdzZapis();
  baza.set(ref.path, przetworz(dane, baza.get(ref.path), Boolean(opcje.merge)));
  zapisz();
  powiadom();
}
export async function updateDoc(ref, dane) {
  sprawdzZapis();
  if (!baza.has(ref.path)) throw blad("not-found");
  const istniejace = baza.get(ref.path);
  const wynik = { ...istniejace };
  for (const [k, v] of Object.entries(dane)) {
    if (v === USUN) delete wynik[k];
    else if (v === SERWER) wynik[k] = doZapisu(Timestamp.now());
    else wynik[k] = doZapisu(v);
  }
  baza.set(ref.path, wynik);
  zapisz();
  powiadom();
}
let licznik = 0;
export async function addDoc(kolekcja, dane) {
  sprawdzZapis();
  const id = `t${Date.now().toString(36)}${(licznik++).toString(36)}`;
  const ref = new DocumentReference(`${kolekcja.path}/${id}`);
  baza.set(ref.path, przetworz(dane, null, false));
  zapisz();
  powiadom();
  return ref;
}
export async function deleteDoc(ref) {
  sprawdzZapis();
  baza.delete(ref.path);
  zapisz();
  powiadom();
}
export function writeBatch() {
  const operacje = [];
  return {
    set(ref, dane, opcje = {}) {
      operacje.push(() => baza.set(ref.path, przetworz(dane, baza.get(ref.path), Boolean(opcje.merge))));
      return this;
    },
    delete(ref) {
      operacje.push(() => baza.delete(ref.path));
      return this;
    },
    async commit() {
      sprawdzZapis();
      if (operacje.length > 500) throw blad("invalid-argument");
      for (const o of operacje) o();
      zapisz();
      powiadom();
    }
  };
}
