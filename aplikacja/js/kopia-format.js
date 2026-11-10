// Format pliku kopii zapasowej (CSV) — czyste funkcje, bez Firebase,
// dzięki czemu da się je sprawdzić testami w Node (testy/jednostkowe.mjs).
//
// Plik: UTF-8 z BOM, pola cytowane zgodnie z RFC 4180, wiersze CRLF.
//   sciezka,dane
//   #meta,"{""format"":""NotatkiRPG-kopia"",""wersja"":1,…}"
//   kampanie/iliac/notatki/abc123,"{""tytul"":""…""}"
// Typy, których JSON nie przenosi, są zapisane jawnie, np. znacznik czasu:
//   {"__typ":"timestamp","s":1762790400,"ns":0}

export const FORMAT = "NotatkiRPG-kopia";
export const WERSJA_FORMATU = 1;
export const NAGLOWEK = ["sciezka", "dane"];
const BOM = "﻿";

export class BladKopii extends Error {}

/**
 * Koduje wartość z Firestore do postaci JSON.
 * @param {*} v wartość
 * @param {object} typy { Timestamp, GeoPoint, Bytes, DocumentReference } — klasy SDK
 */
export function zakodujWartosc(v, typy = {}) {
  if (v === null || v === undefined) return null;
  if (typeof v === "boolean" || typeof v === "string") return v;
  if (typeof v === "number") {
    if (Number.isFinite(v)) return v;
    return { __typ: "liczba", wartosc: String(v) };
  }
  if (Array.isArray(v)) return v.map((x) => zakodujWartosc(x, typy));
  if (typy.Timestamp && v instanceof typy.Timestamp) return { __typ: "timestamp", s: v.seconds, ns: v.nanoseconds };
  if (typy.GeoPoint && v instanceof typy.GeoPoint) return { __typ: "geopunkt", lat: v.latitude, lng: v.longitude };
  if (typy.Bytes && v instanceof typy.Bytes) return { __typ: "bajty", base64: v.toBase64() };
  if (typy.DocumentReference && v instanceof typy.DocumentReference) return { __typ: "referencja", sciezka: v.path };
  if (v instanceof Date) {
    const ms = v.getTime();
    return { __typ: "timestamp", s: Math.floor(ms / 1000), ns: (ms % 1000) * 1e6 };
  }
  if (typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype) {
    const wynik = {};
    for (const [k, x] of Object.entries(v)) wynik[k] = zakodujWartosc(x, typy);
    // Zwykła mapa z polem „__typ” byłaby myląca przy odczycie — owijamy ją.
    if (Object.prototype.hasOwnProperty.call(v, "__typ")) return { __typ: "mapa", wartosc: wynik };
    return wynik;
  }
  throw new BladKopii(`Nieobsługiwany typ wartości: ${Object.prototype.toString.call(v)}`);
}

/**
 * Odkodowuje wartość z pliku.
 * @param {*} v wartość z JSON
 * @param {object} fabryka { timestamp(s, ns), geopunkt(lat, lng), bajty(base64), referencja(sciezka) }
 */
export function odkodujWartosc(v, fabryka = {}) {
  if (v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map((x) => odkodujWartosc(x, fabryka));
  if (typeof v.__typ === "string") {
    switch (v.__typ) {
      case "timestamp":
        if (!Number.isFinite(v.s) || !Number.isFinite(v.ns)) throw new BladKopii("Uszkodzony znacznik czasu w pliku.");
        return fabryka.timestamp ? fabryka.timestamp(v.s, v.ns) : { seconds: v.s, nanoseconds: v.ns };
      case "geopunkt":
        return fabryka.geopunkt ? fabryka.geopunkt(v.lat, v.lng) : { latitude: v.lat, longitude: v.lng };
      case "bajty":
        return fabryka.bajty ? fabryka.bajty(v.base64) : v.base64;
      case "referencja":
        return fabryka.referencja ? fabryka.referencja(v.sciezka) : v.sciezka;
      case "liczba":
        return Number(v.wartosc);
      case "mapa": {
        const wynik = {};
        for (const [k, x] of Object.entries(v.wartosc || {})) wynik[k] = odkodujWartosc(x, fabryka);
        return wynik;
      }
      default:
        throw new BladKopii(`Nieznany typ w pliku: ${v.__typ}`);
    }
  }
  const wynik = {};
  for (const [k, x] of Object.entries(v)) wynik[k] = odkodujWartosc(x, fabryka);
  return wynik;
}

/** Pole CSV zgodnie z RFC 4180 (cudzysłów, gdy zawiera przecinek, cudzysłów albo nową linię). */
export function poleCsv(tekst) {
  const s = String(tekst ?? "");
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function wierszeNaCsv(wiersze) {
  return BOM + wiersze.map((w) => w.map(poleCsv).join(",")).join("\r\n") + "\r\n";
}

/** Parser CSV (RFC 4180): cudzysłowy, podwojone cudzysłowy, nowe linie w polach, CRLF/LF, BOM. */
export function csvNaWiersze(tekst) {
  let s = String(tekst ?? "");
  if (s.startsWith(BOM)) s = s.slice(1);
  const wiersze = [];
  let wiersz = [];
  let pole = "";
  let wCudzyslowie = false;
  let i = 0;
  while (i < s.length) {
    const z = s[i];
    if (wCudzyslowie) {
      if (z === '"') {
        if (s[i + 1] === '"') {
          pole += '"';
          i += 2;
          continue;
        }
        wCudzyslowie = false;
        i++;
        continue;
      }
      pole += z;
      i++;
      continue;
    }
    if (z === '"') {
      if (pole.length) throw new BladKopii(`Nieprawidłowy cudzysłów w wierszu ${wiersze.length + 1}.`);
      wCudzyslowie = true;
      i++;
    } else if (z === ",") {
      wiersz.push(pole);
      pole = "";
      i++;
    } else if (z === "\r" || z === "\n") {
      wiersz.push(pole);
      wiersze.push(wiersz);
      wiersz = [];
      pole = "";
      i += z === "\r" && s[i + 1] === "\n" ? 2 : 1;
    } else {
      pole += z;
      i++;
    }
  }
  if (wCudzyslowie) throw new BladKopii("Plik urywa się w środku pola w cudzysłowie.");
  if (pole.length || wiersz.length) {
    wiersz.push(pole);
    wiersze.push(wiersz);
  }
  return wiersze.filter((w) => !(w.length === 1 && w[0] === ""));
}

const SEGMENT = /^[^/]+$/;

/** Ścieżka dokumentu: parzysta liczba segmentów, dozwolone kolekcje główne. */
export function poprawnaSciezka(sciezka) {
  if (typeof sciezka !== "string" || !sciezka || sciezka.length > 1500) return false;
  const czesci = sciezka.split("/");
  if (czesci.length % 2 !== 0) return false;
  if (!czesci.every((c) => SEGMENT.test(c) && c !== "." && c !== ".." && !/^__.*__$/.test(c))) return false;
  return ["kampanie", "admins", "secrets"].includes(czesci[0]);
}

/** Ścieżka kolekcji, do której należy dokument. */
export function kolekcjaDokumentu(sciezka) {
  return sciezka.split("/").slice(0, -1).join("/");
}

/**
 * Buduje treść pliku CSV.
 * @param {object} meta { wykonano: Date, zakres: {kampanie: string[], kolekcje: string[]}, zawieraSecrets }
 * @param {Array<{sciezka: string, dane: object}>} dokumenty
 */
export function zbudujPlik(meta, dokumenty, typy) {
  const wiersze = [NAGLOWEK];
  wiersze.push([
    "#meta",
    JSON.stringify({
      format: FORMAT,
      wersja: WERSJA_FORMATU,
      wykonano: meta.wykonano.toISOString(),
      zakres: meta.zakres,
      zawieraSecrets: Boolean(meta.zawieraSecrets),
      liczbaDokumentow: dokumenty.length
    })
  ]);
  for (const d of dokumenty) {
    if (!poprawnaSciezka(d.sciezka)) throw new BladKopii(`Nieprawidłowa ścieżka dokumentu: ${d.sciezka}`);
    wiersze.push([d.sciezka, JSON.stringify(zakodujWartosc(d.dane, typy))]);
  }
  return wierszeNaCsv(wiersze);
}

/**
 * Wczytuje i sprawdza plik kopii.
 * @returns {{meta: object, dokumenty: Array<{sciezka: string, dane: object}>}} dane jeszcze NIEodkodowane (JSON)
 */
export function wczytajPlik(tekst) {
  const wiersze = csvNaWiersze(tekst);
  if (!wiersze.length) throw new BladKopii("Plik jest pusty.");
  const [naglowek, ...reszta] = wiersze;
  if (naglowek.length < 2 || naglowek[0].trim() !== "sciezka" || naglowek[1].trim() !== "dane") {
    throw new BladKopii("To nie jest plik kopii NotatkiRPG (brak nagłówka „sciezka,dane”).");
  }
  if (!reszta.length || reszta[0][0] !== "#meta") throw new BladKopii("Brak wiersza #meta w pliku.");
  let meta;
  try {
    meta = JSON.parse(reszta[0][1]);
  } catch {
    throw new BladKopii("Uszkodzony wiersz #meta.");
  }
  if (!meta || meta.format !== FORMAT) throw new BladKopii("To nie jest plik kopii NotatkiRPG (zły format w #meta).");
  if (!Number.isInteger(meta.wersja) || meta.wersja > WERSJA_FORMATU) {
    throw new BladKopii(`Plik ma wersję formatu ${meta.wersja}, a aplikacja zna tylko wersję do ${WERSJA_FORMATU}.`);
  }
  const zakres = meta.zakres && typeof meta.zakres === "object" ? meta.zakres : {};
  meta.zakres = {
    kampanie: Array.isArray(zakres.kampanie) ? zakres.kampanie.filter((k) => typeof k === "string" && SEGMENT.test(k)) : [],
    kolekcje: Array.isArray(zakres.kolekcje) ? zakres.kolekcje.filter((k) => typeof k === "string") : []
  };
  const dokumenty = [];
  const widziane = new Set();
  reszta.slice(1).forEach((w, i) => {
    const nr = i + 3; // nagłówek + #meta + numeracja od 1
    if (w.length < 2) throw new BladKopii(`Wiersz ${nr}: brak kolumny „dane”.`);
    const sciezka = w[0].trim();
    if (!poprawnaSciezka(sciezka)) throw new BladKopii(`Wiersz ${nr}: nieprawidłowa ścieżka dokumentu.`);
    if (widziane.has(sciezka)) throw new BladKopii(`Wiersz ${nr}: dokument ${sciezka} występuje w pliku dwa razy.`);
    widziane.add(sciezka);
    let dane;
    try {
      dane = JSON.parse(w[1]);
    } catch {
      throw new BladKopii(`Wiersz ${nr}: uszkodzone dane JSON.`);
    }
    if (!dane || typeof dane !== "object" || Array.isArray(dane)) throw new BladKopii(`Wiersz ${nr}: dane dokumentu muszą być obiektem.`);
    dokumenty.push({ sciezka, dane });
  });
  return { meta, dokumenty };
}

/** Liczba dokumentów w każdej kolekcji: Map(ścieżka kolekcji → liczba). */
export function podsumuj(dokumenty) {
  const wynik = new Map();
  for (const d of dokumenty) {
    const k = kolekcjaDokumentu(d.sciezka);
    wynik.set(k, (wynik.get(k) || 0) + 1);
  }
  return new Map([...wynik.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

/** NotatkiRPG_kopia_RRRR-MM-DD_GGMM.csv (czas lokalny). */
export function nazwaPliku(data = new Date()) {
  const d = (n) => String(n).padStart(2, "0");
  return `NotatkiRPG_kopia_${data.getFullYear()}-${d(data.getMonth() + 1)}-${d(data.getDate())}_${d(data.getHours())}${d(data.getMinutes())}.csv`;
}

/** Dzieli listę operacji na partie (Firestore: najwyżej 500 operacji w partii). */
export function podzielNaPartie(operacje, rozmiar = 500) {
  const partie = [];
  for (let i = 0; i < operacje.length; i += rozmiar) partie.push(operacje.slice(i, i + rozmiar));
  return partie;
}
