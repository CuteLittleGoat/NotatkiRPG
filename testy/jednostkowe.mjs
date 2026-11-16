// Testy jednostkowe (Node 18+, bez dodatkowych pakietów):
//   node testy/jednostkowe.mjs
// Sprawdzają format kopii zapasowej (CSV, kodowanie typów), wyszukiwanie tekstu
// oraz profile kont, sesję (zapamiętane logowanie), widoczność kampanii i domyślne
// kolory map i interfejsu.
import assert from "node:assert/strict";
import {
  BladKopii,
  csvNaWiersze,
  nazwaPliku,
  odkodujWartosc,
  podsumuj,
  podzielNaPartie,
  poleCsv,
  poprawnaSciezka,
  wczytajPlik,
  wierszeNaCsv,
  zakodujWartosc,
  zbudujPlik
} from "../aplikacja/js/kopia-format.js";
import { normalizuj, pasuje } from "../aplikacja/js/narzedzia.js";
import {
  ROLE,
  kampaniaDlaUzytkownika,
  kampaniaWidocznaDlaGraczy,
  mozeEdytowac,
  nazwaKonta,
  odswiezSesje,
  pobierzSesje,
  rolaKonta,
  swiezoWylogowano,
  uwzglednijSprawdzenieKonta,
  wyczyscSesje,
  zapiszSesje
} from "../aplikacja/js/sesja.js";
import { MOTYWY, MOTYWY_EKRANU } from "../aplikacja/js/konfiguracja.js";
import { Stan } from "../aplikacja/js/stan.js";

// Udawane klasy SDK (te same nazwy pól co w Firestore).
class Timestamp {
  constructor(s, ns) {
    this.seconds = s;
    this.nanoseconds = ns;
  }
}
class GeoPoint {
  constructor(lat, lng) {
    this.latitude = lat;
    this.longitude = lng;
  }
}
class Bytes {
  constructor(b) {
    this.b = b;
  }
  toBase64() {
    return this.b;
  }
}
class DocumentReference {
  constructor(p) {
    this.path = p;
  }
}
const TYPY = { Timestamp, GeoPoint, Bytes, DocumentReference };
const FABRYKA = {
  timestamp: (s, ns) => new Timestamp(s, ns),
  geopunkt: (a, b) => new GeoPoint(a, b),
  bajty: (b) => new Bytes(b),
  referencja: (p) => new DocumentReference(p)
};

let ok = 0;
let zle = 0;
function test(nazwa, f) {
  try {
    f();
    ok++;
    console.log(`  OK    ${nazwa}`);
  } catch (e) {
    zle++;
    console.log(`  BŁĄD  ${nazwa}\n        ${e.message}`);
  }
}

console.log("[CSV]");
test("pole CSV: cytowanie przecinka, cudzysłowu i nowej linii", () => {
  assert.equal(poleCsv("abc"), "abc");
  assert.equal(poleCsv("a,b"), '"a,b"');
  assert.equal(poleCsv('a"b'), '"a""b"');
  assert.equal(poleCsv("a\nb"), '"a\nb"');
  assert.equal(poleCsv("a\r\nb"), '"a\r\nb"');
});
test("CSV: BOM na początku, CRLF między wierszami", () => {
  const t = wierszeNaCsv([["a", "b"], ["1", "2"]]);
  assert.equal(t, "﻿a,b\r\n1,2\r\n");
});
test("CSV: zapis i odczyt dają to samo (trudne znaki)", () => {
  const wiersze = [
    ["sciezka", "dane"],
    ["x", 'tekst z "cudzysłowem", przecinkiem\ni nową linią'],
    ["y", "zażółć gęślą jaźń ✠ 🙂"],
    ["z", ""],
    ["w", "\r\nCRLF w środku\r\n"]
  ];
  assert.deepEqual(csvNaWiersze(wierszeNaCsv(wiersze)), wiersze);
});
test("CSV: plik z samymi LF i bez końcowej nowej linii", () => {
  assert.deepEqual(csvNaWiersze("a,b\n1,2"), [["a", "b"], ["1", "2"]]);
});
test("CSV: niedomknięty cudzysłów → błąd", () => {
  assert.throws(() => csvNaWiersze('a,"b\n'), BladKopii);
});

console.log("[kodowanie typów]");
test("znacznik czasu → jawny zapis i z powrotem", () => {
  const z = zakodujWartosc({ t: new Timestamp(1762790400, 5) }, TYPY);
  assert.deepEqual(z, { t: { __typ: "timestamp", s: 1762790400, ns: 5 } });
  const o = odkodujWartosc(JSON.parse(JSON.stringify(z)), FABRYKA);
  assert.ok(o.t instanceof Timestamp);
  assert.equal(o.t.seconds, 1762790400);
  assert.equal(o.t.nanoseconds, 5);
});
test("geopunkt, bajty, referencja, liczby specjalne", () => {
  const dane = { g: new GeoPoint(1.5, -2), b: new Bytes("QUJD"), r: new DocumentReference("kampanie/iliac"), n: NaN, i: -Infinity };
  const o = odkodujWartosc(JSON.parse(JSON.stringify(zakodujWartosc(dane, TYPY))), FABRYKA);
  assert.ok(o.g instanceof GeoPoint && o.g.latitude === 1.5 && o.g.longitude === -2);
  assert.ok(o.b instanceof Bytes && o.b.toBase64() === "QUJD");
  assert.ok(o.r instanceof DocumentReference && o.r.path === "kampanie/iliac");
  assert.ok(Number.isNaN(o.n));
  assert.equal(o.i, -Infinity);
});
test("zwykła mapa z polem __typ nie myli się z typem specjalnym", () => {
  const dane = { m: { __typ: "timestamp", s: "to tylko tekst" } };
  const o = odkodujWartosc(JSON.parse(JSON.stringify(zakodujWartosc(dane, TYPY))), FABRYKA);
  assert.deepEqual(o, dane);
});
test("tablice, null, zagnieżdżenia", () => {
  const dane = { a: [1, "dwa", null, { b: [true, false] }], c: null, d: { e: { f: "g" } } };
  assert.deepEqual(odkodujWartosc(JSON.parse(JSON.stringify(zakodujWartosc(dane, TYPY))), FABRYKA), dane);
});
test("nieobsługiwany typ → czytelny błąd", () => {
  assert.throws(() => zakodujWartosc({ x: new Map() }, TYPY), BladKopii);
});

console.log("[plik kopii]");
const dokumenty = [
  { sciezka: "kampanie/iliac", dane: { nazwa: "Kopiec Iliac", utworzono: new Timestamp(10, 0) } },
  { sciezka: "kampanie/iliac/notatki/a1", dane: { tytul: 'Notatka "A", z przecinkiem', tresc: "wiersz 1\nwiersz 2", elementId: null } },
  { sciezka: "admins/Player1", dane: { rola: "admin" } }
];
const meta = { wykonano: new Date("2026-11-10T12:00:00Z"), zakres: { kampanie: ["iliac"], kolekcje: ["admins"] }, zawieraSecrets: false };
test("budowa i odczyt pliku kopii", () => {
  const tekst = zbudujPlik(meta, dokumenty, TYPY);
  assert.ok(tekst.startsWith("﻿sciezka,dane\r\n#meta,"));
  const { meta: m, dokumenty: d } = wczytajPlik(tekst);
  assert.equal(m.format, "NotatkiRPG-kopia");
  assert.equal(m.wersja, 1);
  assert.equal(m.liczbaDokumentow, 3);
  assert.deepEqual(m.zakres.kampanie, ["iliac"]);
  assert.equal(d.length, 3);
  assert.equal(d[1].dane.tresc, "wiersz 1\nwiersz 2");
  assert.deepEqual(d[0].dane.utworzono, { __typ: "timestamp", s: 10, ns: 0 });
});
test("podsumowanie: liczba dokumentów w kolekcjach", () => {
  const p = podsumuj(dokumenty);
  assert.equal(p.get("kampanie"), 1);
  assert.equal(p.get("kampanie/iliac/notatki"), 1);
  assert.equal(p.get("admins"), 1);
});
test("odczyt: odrzuca złe pliki", () => {
  assert.throws(() => wczytajPlik(""), BladKopii);
  assert.throws(() => wczytajPlik("a,b\n1,2\n"), /nagłówka/);
  assert.throws(() => wczytajPlik("sciezka,dane\nadmins/x,{}\n"), /#meta/);
  assert.throws(() => wczytajPlik('sciezka,dane\n#meta,"{""format"":""inny""}"\n'), /format/);
  assert.throws(() => wczytajPlik('sciezka,dane\n#meta,"{""format"":""NotatkiRPG-kopia"",""wersja"":99}"\n'), /wersję/);
  const naglowek = 'sciezka,dane\n#meta,"{""format"":""NotatkiRPG-kopia"",""wersja"":1}"\n';
  assert.throws(() => wczytajPlik(naglowek + "inne/x,{}\n"), /ścieżka/);
  assert.throws(() => wczytajPlik(naglowek + "admins/x,{}\nadmins/x,{}\n"), /dwa razy/);
  assert.throws(() => wczytajPlik(naglowek + "admins/x,{zepsute\n"), /JSON/);
  assert.throws(() => wczytajPlik(naglowek + 'admins/x,"[1,2]"\n'), /obiektem/);
});
test("ścieżki dokumentów", () => {
  for (const p of ["kampanie/iliac", "kampanie/iliac/notatki/abc", "admins/Player1", "secrets/Player2"]) assert.ok(poprawnaSciezka(p), p);
  for (const p of ["", "kampanie", "kampanie/iliac/notatki", "inne/x", "kampanie/../x", "admins/__x__", "admins//x"]) assert.ok(!poprawnaSciezka(p), p);
});
test("nazwa pliku: NotatkiRPG_kopia_RRRR-MM-DD_GGMM.csv", () => {
  assert.equal(nazwaPliku(new Date(2026, 10, 10, 9, 5)), "NotatkiRPG_kopia_2026-11-10_0905.csv");
});
test("partie po najwyżej 500 operacji", () => {
  const partie = podzielNaPartie(Array.from({ length: 1201 }, (_, i) => i));
  assert.deepEqual(partie.map((p) => p.length), [500, 500, 201]);
  assert.deepEqual(podzielNaPartie([]), []);
});

console.log("[wyszukiwanie]");
test("normalizacja: bez polskich znaków i wielkości liter", () => {
  assert.equal(normalizuj("  Łódź   ŻÓŁĆ "), "lodz zolc");
});
test("dopasowanie: wszystkie słowa, w dowolnej kolejności", () => {
  assert.ok(pasuje("nastepna sesje", "Plan na następną sesję"));
  assert.ok(pasuje("sentinel iglica", "Iglica Sentinel (ród Księżyca)"));
  assert.ok(!pasuje("wayrest", "Iglica Sentinel"));
  assert.ok(pasuje("", "cokolwiek"));
  assert.ok(pasuje("ksiezyca", ["inne", ["Iglica Sentinel (ród Księżyca)"]]));
});

console.log("[profile kont i kampanie]");
test("profil tylko z pola „rola” w admins: admin, edytor, reszta — Gracz", () => {
  assert.equal(rolaKonta("admin"), ROLE.ADMIN);
  assert.equal(rolaKonta(" Admin "), ROLE.ADMIN);
  assert.equal(rolaKonta("edytor"), ROLE.EDYTOR);
  assert.equal(rolaKonta("Edytor"), ROLE.EDYTOR);
  assert.equal(rolaKonta("skryba"), ROLE.GRACZ, "dawna nazwa profilu nie daje edycji");
  assert.equal(rolaKonta("gracz"), ROLE.GRACZ);
  assert.equal(rolaKonta(""), ROLE.GRACZ);
  assert.equal(rolaKonta(undefined), ROLE.GRACZ, "brak dokumentu w admins = tylko czyta");
  assert.equal(rolaKonta(123), ROLE.GRACZ);
});
test("edycja notatek tylko dla Edytora; nazwa konta z DisplayName", () => {
  assert.ok(mozeEdytowac({ rola: ROLE.EDYTOR }));
  assert.ok(!mozeEdytowac({ rola: ROLE.GRACZ }));
  assert.ok(!mozeEdytowac({ rola: ROLE.ADMIN }));
  assert.ok(!mozeEdytowac(null));
  assert.equal(nazwaKonta({ rola: ROLE.GRACZ, nazwa: "Drużyna" }), "Drużyna");
  assert.equal(nazwaKonta({ rola: ROLE.EDYTOR, nazwa: "" }), "Edytor");
});
test("kampania: widoczność z bazy, a bez wpisu — domyślna z rejestru", () => {
  const iliac = { id: "iliac", widocznaDomyslnie: true };
  const nowa = { id: "nowa" };
  assert.ok(kampaniaWidocznaDlaGraczy(iliac, null));
  assert.ok(!kampaniaWidocznaDlaGraczy(iliac, { widoczna: false }));
  assert.ok(!kampaniaWidocznaDlaGraczy(nowa, null), "nowa kampania domyślnie ukryta");
  assert.ok(kampaniaWidocznaDlaGraczy(nowa, { widoczna: true }));
  assert.ok(!kampaniaWidocznaDlaGraczy(nowa, { widoczna: "tak" }));
});
test("kampania: admin widzi wszystkie, gracze — udostępnione, bez logowania — żadnej", () => {
  const ukryta = { id: "nowa" };
  const widoczna = { id: "iliac", widocznaDomyslnie: true };
  assert.ok(kampaniaDlaUzytkownika({ rola: ROLE.ADMIN }, ukryta, null));
  assert.ok(!kampaniaDlaUzytkownika({ rola: ROLE.EDYTOR }, ukryta, null));
  assert.ok(!kampaniaDlaUzytkownika({ rola: ROLE.GRACZ }, ukryta, null));
  assert.ok(kampaniaDlaUzytkownika({ rola: ROLE.GRACZ }, widoczna, null));
  assert.ok(!kampaniaDlaUzytkownika(null, widoczna, null));
});

// ---- sesja: pamięć karty (sessionStorage) i zapamiętanie na urządzeniu (localStorage) ----
class PamiecTestowa {
  constructor() {
    this.dane = new Map();
  }
  getItem(k) {
    return this.dane.has(k) ? this.dane.get(k) : null;
  }
  setItem(k, v) {
    this.dane.set(k, String(v));
  }
  removeItem(k) {
    this.dane.delete(k);
  }
}
function nowePamieci() {
  for (const nazwa of ["sessionStorage", "localStorage"]) {
    Object.defineProperty(globalThis, nazwa, { value: new PamiecTestowa(), configurable: true, writable: true });
  }
}
const KLUCZ = "notatkirpg.sesja";
const DZIEN = 24 * 60 * 60 * 1000;

test("sesja: „zapamiętaj mnie” — na urządzeniu przez 30 dni, bez hasła; bez zapamiętania — tylko karta", () => {
  nowePamieci();
  const przed = Date.now();
  zapiszSesje({ kontoId: "K1", login: "gracz", nazwa: "Drużyna", rola: ROLE.GRACZ, haslo: "tajne-haslo" }, { zapamietaj: true });
  assert.equal(sessionStorage.getItem(KLUCZ), null);
  const zapis = localStorage.getItem(KLUCZ);
  assert.ok(!zapis.includes("tajne-haslo"), "hasło trafiło do zapisanej sesji");
  const dane = JSON.parse(zapis);
  assert.equal(dane.wersja, 4);
  const dni = (dane.wazneDo - przed) / DZIEN;
  assert.ok(dni > 29.99 && dni < 30.01, `ważność ${dni} dni`);
  const s = pobierzSesje();
  assert.deepEqual([s.kontoId, s.login, s.rola, s.zapamietana], ["K1", "gracz", ROLE.GRACZ, true]);
  // Logowanie bez zapamiętania: tylko ta karta, zapamiętana sesja znika z urządzenia.
  zapiszSesje({ kontoId: "K2", login: "edytor", nazwa: "", rola: ROLE.EDYTOR }, { zapamietaj: false });
  assert.equal(localStorage.getItem(KLUCZ), null);
  assert.deepEqual([pobierzSesje().kontoId, pobierzSesje().zapamietana, pobierzSesje().wazneDo], ["K2", false, null]);
});
test("sesja: po terminie ważności, bez daty ważności albo w starej wersji — logowanie od nowa", () => {
  nowePamieci();
  const sesja = { wersja: 4, kontoId: "K1", login: "g", nazwa: "", rola: "gracz" };
  localStorage.setItem(KLUCZ, JSON.stringify({ ...sesja, wazneDo: Date.now() - 1000 }));
  assert.equal(pobierzSesje(), null);
  assert.equal(localStorage.getItem(KLUCZ), null, "przeterminowana sesja nie została usunięta");
  localStorage.setItem(KLUCZ, JSON.stringify(sesja));
  assert.equal(pobierzSesje(), null, "zapamiętana sesja bez daty ważności");
  sessionStorage.setItem(KLUCZ, JSON.stringify({ ...sesja, wersja: 3 }));
  assert.equal(pobierzSesje(), null, "sesja w starej wersji (3)");
  sessionStorage.setItem(KLUCZ, "{uszkodzony");
  assert.equal(pobierzSesje(), null);
});
test("sesja: karta ma pierwszeństwo; odświeżenie profilu zachowuje ważność; WYLOGUJ czyści obie pamięci", () => {
  nowePamieci();
  zapiszSesje({ kontoId: "K1", login: "g", nazwa: "A", rola: ROLE.GRACZ }, { zapamietaj: true });
  const waznosc = pobierzSesje().wazneDo;
  assert.equal(odswiezSesje({ kontoId: "K1", nazwa: "B", rola: ROLE.EDYTOR }), true);
  const s = pobierzSesje();
  assert.deepEqual([s.rola, s.nazwa, s.login, s.zapamietana, s.wazneDo], [ROLE.EDYTOR, "B", "g", true, waznosc]);
  assert.equal(odswiezSesje({ kontoId: "K1", nazwa: "B", rola: ROLE.EDYTOR }), false, "bez zmian — bez zapisu");
  assert.equal(odswiezSesje({ kontoId: "INNE", nazwa: "B", rola: ROLE.ADMIN }), false, "dane innego konta");
  sessionStorage.setItem(KLUCZ, JSON.stringify({ wersja: 4, kontoId: "K9", login: "x", nazwa: "", rola: "admin" }));
  assert.equal(pobierzSesje().kontoId, "K9", "sesja tej karty nie ma pierwszeństwa");
  wyczyscSesje();
  assert.equal(pobierzSesje(), null);
  assert.equal(localStorage.getItem(KLUCZ), null);
  assert.equal(sessionStorage.getItem(KLUCZ), null);
  // Znacznik „przed chwilą wylogowano” (bez automatycznego logowania) — jednorazowy.
  assert.equal(swiezoWylogowano(), true);
  assert.equal(swiezoWylogowano(), false);
  wyczyscSesje();
  zapiszSesje({ kontoId: "K1", login: "g", nazwa: "", rola: ROLE.GRACZ }, { zapamietaj: true });
  assert.equal(swiezoWylogowano(), false, "znacznik został po ponownym zalogowaniu");
});
test("sesja: wynik sprawdzenia konta w bazie — usunięte konto wylogowuje, nowa rola od razu", () => {
  nowePamieci();
  zapiszSesje({ kontoId: "K1", login: "g", nazwa: "", rola: ROLE.EDYTOR }, { zapamietaj: true });
  const sesja = pobierzSesje();
  uwzglednijSprawdzenieKonta(sesja, { kontoId: "K1", login: "g", nazwa: "", rola: ROLE.GRACZ });
  assert.equal(pobierzSesje().rola, ROLE.GRACZ, "nowa rola z bazy nie została zapisana");
  uwzglednijSprawdzenieKonta({ kontoId: "INNE" }, null);
  assert.ok(pobierzSesje(), "wynik dla innego konta wylogował bieżące");
  uwzglednijSprawdzenieKonta(sesja, null);
  assert.equal(pobierzSesje(), null, "usunięte konto (albo zmieniony login) nie wylogowało");
});
test("sesja: przeglądarka nie pozwala zapamiętać — logowanie działa w tej karcie", () => {
  nowePamieci();
  localStorage.setItem = () => {
    throw new Error("QuotaExceededError");
  };
  assert.equal(zapiszSesje({ kontoId: "K1", login: "g", nazwa: "", rola: ROLE.GRACZ }, { zapamietaj: true }), true);
  assert.equal(pobierzSesje().zapamietana, false);
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    get() {
      throw new Error("SecurityError");
    }
  });
  assert.equal(pobierzSesje(), null, "błąd dostępu do pamięci nie może przerwać strony");
  delete globalThis.sessionStorage;
  delete globalThis.localStorage;
});

test("kolory: mapy domyślnie w kolorach oryginału (pierwsze na liście), interfejs — zielony", () => {
  assert.equal(Object.keys(MOTYWY)[0], "oryginalny", "„kolory oryginału” nie są pierwsze na liście kolorów map");
  assert.deepEqual(Object.keys(MOTYWY_EKRANU), ["zielony", "bursztynowy", "czerwony"]);
  const manifest = { mapy: [{ id: "bez-koloru" }, { id: "zielona", kolor: "zielony" }, { id: "zly", kolor: "constructor" }] };
  const stan = new Stan({ kampania: { id: "proba" }, manifest, folder: "" });
  const [bez, zielona, zly] = manifest.mapy;
  assert.equal(stan.kolorKampanii(), "zielony", "interfejs domyślnie nie jest zielony");
  assert.equal(stan.kolorMapy(bez), "oryginalny", "mapa bez koloru w manifeście nie jest w kolorach oryginału");
  assert.equal(stan.kolorMapy(zielona), "zielony", "kolor mapy z manifestu nie działa");
  assert.equal(stan.kolorMapy(zly), "oryginalny");
  // Ustawienia admina mają pierwszeństwo; interfejs nie przyjmuje „kolorów oryginału”.
  stan.ustawienia = { kolor: "oryginalny", mapy: { "bez-koloru": { kolor: "czerwony" } } };
  assert.equal(stan.kolorKampanii(), "zielony");
  assert.equal(stan.kolorMapy(bez), "czerwony");
  stan.ustawienia = { kolor: "bursztynowy" };
  assert.equal(stan.kolorKampanii(), "bursztynowy");
  assert.equal(stan.kolorMapy(bez), "oryginalny", "kolor interfejsu zmienił kolor mapy");
});

test("miejsca: „widoczne” i „klikalne” — domyślne z manifestu, klikalne tylko widoczne", () => {
  const manifest = {
    mapy: [{ id: "m", widocznaDomyslnie: true }, { id: "ukryta", widocznaDomyslnie: false }],
    elementy: [
      { id: "zwykle", mapa: "m", dostepnyDomyslnie: true },
      { id: "nieklikalne", mapa: "m", dostepnyDomyslnie: false },
      { id: "zasloniete", mapa: "m", widocznyDomyslnie: false, dostepnyDomyslnie: false },
      { id: "po-odkryciu-klikalne", mapa: "m", widocznyDomyslnie: false, dostepnyDomyslnie: true },
      { id: "na-ukrytej", mapa: "ukryta", dostepnyDomyslnie: true }
    ]
  };
  const stan = new Stan({ kampania: { id: "proba" }, manifest, folder: "" });
  stan.sesja = { kontoId: "g", rola: "gracz" };
  const e = Object.fromEntries(manifest.elementy.map((x) => [x.id, x]));
  const widoczne = () => manifest.elementy.filter((x) => stan.elementWidocznyDlaUzytkownika(x)).map((x) => x.id);
  const klikalne = () => stan.elementyDlaUzytkownika().map((x) => x.id);
  // Bez pola widocznyDomyslnie miejsce jest widoczne (istniejące kampanie bez zmian).
  assert.deepEqual(widoczne(), ["zwykle", "nieklikalne"]);
  assert.deepEqual(klikalne(), ["zwykle"]);
  assert.equal(stan.elementWidoczny(e["na-ukrytej"]), true, "pole „widoczne” nie zależy od zakładki");
  // Admin odkrywa miejsca: klikalność wraca do zapisanej albo domyślnej wartości.
  stan.ustawienia = { elementyWidoczne: { zasloniete: true, "po-odkryciu-klikalne": true } };
  assert.deepEqual(widoczne(), ["zwykle", "nieklikalne", "zasloniete", "po-odkryciu-klikalne"]);
  assert.deepEqual(klikalne(), ["zwykle", "po-odkryciu-klikalne"]);
  // Zasłonięte miejsce nie jest klikalne, nawet gdy pole „klikalne” jest zapisane (niespójne dane).
  stan.ustawienia = { elementyWidoczne: { zwykle: false }, elementy: { zwykle: true } };
  assert.equal(stan.elementDostepnyDlaGraczy(e.zwykle), false);
  assert.equal(stan.elementWidocznyDlaUzytkownika(e.zwykle), false);
  assert.equal(stan.rodzajNotatki({ elementId: "zwykle" }), "bez-miejsca", "notatka przy zasłoniętym miejscu zdradza je graczom");
  // Czerwona kropka tylko przy widocznym i klikalnym miejscu.
  stan.notatki = [{ elementId: "zwykle" }, { elementId: "zasloniete" }];
  assert.equal(stan.elementMaKropke(e.zwykle), false);
  stan.ustawienia = { elementy: { zasloniete: true } };
  assert.equal(stan.elementMaKropke(e.zasloniete), false, "kropka przy zasłoniętym miejscu");
  assert.equal(stan.elementMaKropke(e.zwykle), true);
  // Admin widzi i może kliknąć wszystko; w podglądzie gracza — jak gracz.
  stan.sesja = { kontoId: "a", rola: "admin" };
  assert.equal(stan.elementWidocznyDlaUzytkownika(e.zasloniete), true);
  assert.equal(stan.elementDlaUzytkownika(e.zasloniete), true);
  stan.podgladGracza = true;
  assert.equal(stan.elementWidocznyDlaUzytkownika(e.zasloniete), false);
  assert.equal(stan.elementDlaUzytkownika(e.zasloniete), false);
});

console.log(`\nWynik: ${ok}/${ok + zle} testów OK.`);
process.exit(zle ? 1 : 0);
