// Testy jednostkowe (Node 18+, bez dodatkowych pakietów):
//   node testy/jednostkowe.mjs
// Sprawdzają format kopii zapasowej (CSV, kodowanie typów), wyszukiwanie tekstu
// oraz profile kont i widoczność kampanii.
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
  rolaKonta
} from "../aplikacja/js/sesja.js";

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
test("profil: admin z kolekcji admins, Skryba z DisplayName, reszta — Gracz", () => {
  assert.equal(rolaKonta({ rolaAdmina: "admin", nazwa: "Admin" }), ROLE.ADMIN);
  assert.equal(rolaKonta({ rolaAdmina: "admin", nazwa: "Skryba" }), ROLE.ADMIN);
  assert.equal(rolaKonta({ nazwa: "Skryba" }), ROLE.SKRYBA);
  assert.equal(rolaKonta({ nazwa: "  skryba " }), ROLE.SKRYBA);
  assert.equal(rolaKonta({ nazwa: "Gracz" }), ROLE.GRACZ);
  assert.equal(rolaKonta({ nazwa: "Admin" }), ROLE.GRACZ, "sama nazwa „Admin” nie daje uprawnień admina");
  assert.equal(rolaKonta({ rolaAdmina: "gracz" }), ROLE.GRACZ);
  assert.equal(rolaKonta({}), ROLE.GRACZ);
});
test("edycja notatek tylko dla Skryby; nazwa konta z DisplayName", () => {
  assert.ok(mozeEdytowac({ rola: ROLE.SKRYBA }));
  assert.ok(!mozeEdytowac({ rola: ROLE.GRACZ }));
  assert.ok(!mozeEdytowac({ rola: ROLE.ADMIN }));
  assert.ok(!mozeEdytowac(null));
  assert.equal(nazwaKonta({ rola: ROLE.GRACZ, nazwa: "Drużyna" }), "Drużyna");
  assert.equal(nazwaKonta({ rola: ROLE.SKRYBA, nazwa: "" }), "Skryba");
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
  assert.ok(!kampaniaDlaUzytkownika({ rola: ROLE.SKRYBA }, ukryta, null));
  assert.ok(!kampaniaDlaUzytkownika({ rola: ROLE.GRACZ }, ukryta, null));
  assert.ok(kampaniaDlaUzytkownika({ rola: ROLE.GRACZ }, widoczna, null));
  assert.ok(!kampaniaDlaUzytkownika(null, widoczna, null));
});

console.log(`\nWynik: ${ok}/${ok + zle} testów OK.`);
process.exit(zle ? 1 : 0);
