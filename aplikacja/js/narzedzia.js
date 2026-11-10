// Drobne narzędzia wspólne dla całej aplikacji.
// ZASADA: treść wpisów (notatki, opisy, podpisy) trafia na stronę WYŁĄCZNIE
// przez textContent — nigdy przez innerHTML. Przy otwartych regułach bazy każdy
// może zapisać do niej dowolny tekst, także fragment kodu HTML.

/**
 * Tworzy element DOM.
 * @param {string} tag nazwa znacznika, np. "div" albo "button.przycisk" (kropka = klasa)
 * @param {object} [opcje] { tekst, atrybuty, klasa, zdarzenia, dzieci, dane }
 * @param {Array} [dzieci] dodatkowe dzieci (elementy albo teksty)
 */
export function el(tag, opcje = {}, dzieci = []) {
  const [nazwa, ...klasy] = tag.split(".");
  const wezel = document.createElement(nazwa);
  if (klasy.length) wezel.classList.add(...klasy);
  if (Array.isArray(opcje) || opcje instanceof Node || typeof opcje === "string") {
    dzieci = opcje;
    opcje = {};
  }
  if (opcje.klasa) wezel.classList.add(...String(opcje.klasa).split(/\s+/).filter(Boolean));
  if (opcje.tekst !== undefined && opcje.tekst !== null) wezel.textContent = String(opcje.tekst);
  for (const [k, v] of Object.entries(opcje.atrybuty || {})) {
    if (v === false || v === null || v === undefined) continue;
    wezel.setAttribute(k, v === true ? "" : String(v));
  }
  for (const [k, v] of Object.entries(opcje.dane || {})) wezel.dataset[k] = String(v);
  for (const [k, v] of Object.entries(opcje.zdarzenia || {})) wezel.addEventListener(k, v);
  dolacz(wezel, opcje.dzieci);
  dolacz(wezel, dzieci);
  return wezel;
}

function dolacz(wezel, dzieci) {
  if (dzieci === undefined || dzieci === null) return;
  for (const d of Array.isArray(dzieci) ? dzieci : [dzieci]) {
    if (d === null || d === undefined || d === false) continue;
    wezel.append(d instanceof Node ? d : document.createTextNode(String(d)));
  }
}

/** Usuwa wszystkie dzieci elementu. */
export function wyczysc(wezel) {
  while (wezel.firstChild) wezel.removeChild(wezel.firstChild);
  return wezel;
}

/** Tekst do wyszukiwania: małe litery, bez polskich znaków i akcentów. */
export function normalizuj(tekst) {
  return String(tekst ?? "")
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Czy wszystkie słowa zapytania występują w tekście (po normalizacji). */
export function pasuje(zapytanie, ...teksty) {
  const slowa = normalizuj(zapytanie).split(" ").filter(Boolean);
  if (!slowa.length) return true;
  const calosc = normalizuj(teksty.flat().filter(Boolean).join(" \u0000 "));
  return slowa.every((s) => calosc.includes(s));
}

const FORMAT_DATY = new Intl.DateTimeFormat("pl-PL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

/** Data z pola Firestore (Timestamp), Date albo liczby milisekund. */
export function formatujDate(wartosc) {
  const d = naDate(wartosc);
  return d ? FORMAT_DATY.format(d) : "";
}

export function naDate(wartosc) {
  if (!wartosc) return null;
  if (wartosc instanceof Date) return wartosc;
  if (typeof wartosc.toDate === "function") return wartosc.toDate();
  if (typeof wartosc === "number") return new Date(wartosc);
  if (typeof wartosc.seconds === "number") return new Date(wartosc.seconds * 1000);
  return null;
}

export function czasMs(wartosc) {
  const d = naDate(wartosc);
  return d ? d.getTime() : 0;
}

/** Odczyt/zapis localStorage — tylko wygody (zapamiętany podpis, stan indeksu). */
export function pamiecOdczyt(klucz, domyslna = null) {
  try {
    const v = localStorage.getItem(klucz);
    return v === null ? domyslna : v;
  } catch {
    return domyslna;
  }
}

export function pamiecZapis(klucz, wartosc) {
  try {
    localStorage.setItem(klucz, wartosc);
  } catch {
    /* brak dostępu do pamięci przeglądarki — trudno, to tylko wygoda */
  }
}

export function opoznij(funkcja, ms = 150) {
  let licznik = null;
  return (...arg) => {
    clearTimeout(licznik);
    licznik = setTimeout(() => funkcja(...arg), ms);
  };
}

/** Zrozumiały opis błędu Firebase dla osoby bez wiedzy technicznej. */
export function opisBledu(blad) {
  const kod = blad && (blad.code || blad.name);
  if (kod === "permission-denied") {
    return "Baza danych odmówiła dostępu. Najczęściej znaczy to, że reguły Firestore nie zostały jeszcze opublikowane (instrukcja: firebase/README.md). Po zmianie reguł odśwież stronę.";
  }
  if (kod === "unavailable" || kod === "deadline-exceeded") {
    return "Brak połączenia z bazą danych. Sprawdź internet — zmiany zapiszą się, gdy połączenie wróci.";
  }
  if (kod === "resource-exhausted") {
    return "Przekroczono dzienny limit bezpłatnego planu Firebase. Spróbuj ponownie jutro.";
  }
  if (kod === "invalid-argument") {
    return "Baza danych odrzuciła zapis (nieprawidłowe dane).";
  }
  return `Błąd bazy danych${kod ? ` (${kod})` : ""}. Spróbuj ponownie.`;
}

let pojemnikKomunikatow = null;

/** Krótki komunikat na dole ekranu. rodzaj: "info" | "blad" | "ok". */
export function komunikat(tekst, rodzaj = "info", czas = 5000) {
  if (!pojemnikKomunikatow) {
    pojemnikKomunikatow = el("div.komunikaty", { atrybuty: { "aria-live": "polite", role: "status" } });
    document.body.append(pojemnikKomunikatow);
  }
  const wpis = el("div.komunikat", { klasa: `komunikat-${rodzaj}`, tekst });
  pojemnikKomunikatow.append(wpis);
  setTimeout(() => wpis.remove(), czas);
}

/** Okno potwierdzenia w stylu ekranu. Zwraca Promise<boolean>. */
export function potwierdz(tresc, { tak = "TAK", nie = "ANULUJ", niebezpieczne = false } = {}) {
  return new Promise((rozwiaz) => {
    const okno = el("dialog.okno.okno-male", { atrybuty: { "aria-label": "Potwierdzenie" } });
    const przyciskTak = el("button.przycisk", { tekst: tak, klasa: niebezpieczne ? "przycisk-niebezpieczny" : "", atrybuty: { type: "button" } });
    const przyciskNie = el("button.przycisk", { tekst: nie, atrybuty: { type: "button" } });
    okno.append(
      el("p.okno-naglowek", { tekst: "+++ WYMAGANE POTWIERDZENIE +++" }),
      el("p.okno-tresc", { tekst: tresc }),
      el("div.okno-przyciski", [przyciskNie, przyciskTak])
    );
    const zamknij = (wynik) => {
      okno.close();
      okno.remove();
      rozwiaz(wynik);
    };
    przyciskTak.addEventListener("click", () => zamknij(true));
    przyciskNie.addEventListener("click", () => zamknij(false));
    okno.addEventListener("cancel", (ev) => {
      ev.preventDefault();
      zamknij(false);
    });
    document.body.append(okno);
    okno.showModal();
    przyciskNie.focus();
  });
}

/** Pobranie pliku wygenerowanego w przeglądarce. */
export function pobierzPlik(nazwa, tresc, typ = "text/csv;charset=utf-8") {
  const blob = new Blob([tresc], { type: typ });
  const adres = URL.createObjectURL(blob);
  const a = el("a", { atrybuty: { href: adres, download: nazwa } });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(adres), 10000);
}

/** Bezpieczne odczytanie parametru z adresu strony. */
export function parametrAdresu(nazwa) {
  try {
    return new URL(window.location.href).searchParams.get(nazwa);
  } catch {
    return null;
  }
}

export async function wczytajJson(adres) {
  const odp = await fetch(adres, { cache: "no-cache" });
  if (!odp.ok) throw new Error(`Nie udało się wczytać ${adres} (HTTP ${odp.status}).`);
  return odp.json();
}
