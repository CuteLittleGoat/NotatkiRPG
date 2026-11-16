// Logowanie: porównanie loginu i hasła z kolekcją „secrets” (świadoma decyzja —
// bez logowania Firebase). UWAGA: przeglądarka musi czytać kolekcję secrets, więc
// hasła są widoczne dla każdego, kto zajrzy do bazy — opis w README.md.
//
// Dokument konta w secrets: PlayerName (login, widoczny u góry ekranu),
// PlayerPassword (hasło), DisplayName (nazwa konta na dole ekranu). Uprawnienia —
// WYŁĄCZNIE pole „rola” w admins/{id} („admin” albo „edytor”; brak = tylko czyta).
// Kolekcji kont aplikacja nie zmienia.
//
// Zapamiętywanie (Analizy/Logowanie.md): pole „Zapamiętaj mnie na tym urządzeniu”
// (sesja.js) i współpraca z menedżerem haseł przeglądarki — pole hasła nie jest
// czyszczone przed opuszczeniem strony, w Chrome i Edge aplikacja sama prosi o zapis
// hasła i potrafi zalogować automatycznie (Credential Management API); w pozostałych
// przeglądarkach start.js przechodzi po zalogowaniu na nową stronę (sygnał dla
// menedżera haseł, że logowanie się udało). Aplikacja hasła nigdzie nie zapisuje.
import { db, collection, doc, getDoc, getDocs, query, where } from "./firebase.js";
import { KOLEKCJA_ADMINOW, KOLEKCJA_SEKRETOW, ZAPAMIETANIE_DNI } from "./konfiguracja.js";
import { el, opisBledu } from "./narzedzia.js";
import { rolaKonta, zapiszSesje } from "./sesja.js";

export const KOMUNIKAT_BLEDNE_DANE = "Nieprawidłowy login lub hasło.";

const tekst = (v) => (typeof v === "string" ? v.trim() : "");
const czekaj = (ms) => new Promise((rozwiaz) => setTimeout(() => rozwiaz(null), ms));

/**
 * Sprawdza login i hasło. Zwraca { kontoId, login, nazwa, rola } albo null.
 * Rzuca błąd tylko przy problemie z bazą (np. brak uprawnień).
 */
export async function sprawdzLogowanie(login, haslo) {
  const czystyLogin = String(login || "").trim();
  const czysteHaslo = String(haslo || "");
  if (!czystyLogin || !czysteHaslo) return null;
  const wynik = await getDocs(query(collection(db, KOLEKCJA_SEKRETOW), where("PlayerName", "==", czystyLogin)));
  let konto = null;
  wynik.forEach((d) => {
    const dane = d.data();
    if (!konto && dane.PlayerPassword === czysteHaslo) {
      // Tylko to, co potrzebne — hasło nie wychodzi poza tę funkcję.
      konto = { kontoId: d.id, login: tekst(dane.PlayerName) || czystyLogin, nazwa: tekst(dane.DisplayName) };
    }
  });
  if (!konto) return null;
  const admin = await getDoc(doc(db, KOLEKCJA_ADMINOW, konto.kontoId));
  const daneAdmina = admin.exists() ? admin.data() : {};
  // DisplayName może być też w dokumencie admins/{id} — wtedy bierzemy go stamtąd.
  if (!konto.nazwa) konto.nazwa = tekst(daneAdmina.DisplayName);
  return { ...konto, rola: rolaKonta(daneAdmina.rola) };
}

/**
 * Sprawdzenie zalogowanego konta przy otwarciu strony: czy konto nadal istnieje, czy
 * login (PlayerName) się nie zmienił, jaka jest teraz rola i nazwa konta. Zwraca
 * { kontoId, login, nazwa, rola } albo null (trzeba zalogować się ponownie).
 * Przy problemie z bazą albo siecią rzuca błąd — wtedy sesja zostaje bez zmian (bez
 * internetu nikogo nie wylogowujemy). Zmiana loginu w konsoli Firebase = wylogowanie
 * wszystkich zapamiętanych urządzeń tego konta.
 */
export async function sprawdzKonto(sesja) {
  const [konto, admin] = await Promise.all([
    getDoc(doc(db, KOLEKCJA_SEKRETOW, sesja.kontoId)),
    getDoc(doc(db, KOLEKCJA_ADMINOW, sesja.kontoId))
  ]);
  if (!konto.exists()) return null;
  const dane = konto.data();
  if (tekst(dane.PlayerName) !== sesja.login) return null;
  const daneAdmina = admin.exists() ? admin.data() : {};
  return {
    kontoId: sesja.kontoId,
    login: sesja.login,
    nazwa: tekst(dane.DisplayName) || tekst(daneAdmina.DisplayName),
    rola: rolaKonta(daneAdmina.rola)
  };
}

// ---------------------------------------------------------------- menedżer haseł przeglądarki

/** Chrome i Edge mają mechanizm zapisu haseł dla stron (Credential Management API); Firefox i Safari — nie. */
export function obslugaZapisuHasel() {
  try {
    return typeof globalThis.PasswordCredential === "function" && typeof navigator.credentials?.store === "function";
  } catch {
    return false;
  }
}

/** Prośba do przeglądarki o zapisanie hasła („Zapisać hasło?”). Bez menedżera haseł — nic się nie dzieje. */
async function zapiszHasloWPrzegladarce(login, haslo, nazwa) {
  if (!obslugaZapisuHasel()) return;
  try {
    const dane = new globalThis.PasswordCredential({ id: login, password: haslo, name: nazwa || login });
    await Promise.race([navigator.credentials.store(dane), czekaj(2000)]);
  } catch {
    /* przeglądarka bez menedżera haseł albo zapis wyłączony — logowanie działa i tak */
  }
}

/**
 * Automatyczne logowanie hasłem zapisanym w przeglądarce (Chrome, Edge) — bez żadnych
 * okienek: tylko gdy przeglądarka na to pozwala (po wylogowaniu nie pozwala, dopóki
 * ktoś nie zaloguje się sam). Zwraca dane sesji albo null.
 */
export async function logowanieAutomatyczne() {
  if (!obslugaZapisuHasel() || typeof navigator.credentials.get !== "function") return null;
  let dane = null;
  try {
    dane = await Promise.race([navigator.credentials.get({ password: true, mediation: "silent" }), czekaj(3000)]);
  } catch {
    return null;
  }
  if (!dane || dane.type !== "password" || !dane.id || !dane.password) return null;
  try {
    return await sprawdzLogowanie(dane.id, dane.password);
  } catch {
    return null;
  }
}

/**
 * Formularz logowania (osadzony na stronie albo w oknie).
 * @param {function} poZalogowaniu wywoływana z danymi sesji
 */
export function formularzLogowania(poZalogowaniu) {
  const pole = (etykieta, atrybuty) => {
    const input = el("input.pole", { atrybuty });
    return [input, el("label.etykieta", [el("span", { tekst: etykieta }), input])];
  };
  const [poleLogin, etykietaLogin] = pole("LOGIN", {
    type: "text",
    name: "login",
    autocomplete: "username",
    autocapitalize: "off",
    spellcheck: "false",
    required: true,
    maxlength: "100"
  });
  const [poleHaslo, etykietaHaslo] = pole("HASŁO", {
    type: "password",
    name: "haslo",
    autocomplete: "current-password",
    required: true,
    maxlength: "200"
  });
  // „Zapamiętaj mnie” — domyślnie zaznaczone (gracze zwykle używają własnych telefonów).
  const poleZapamietaj = el("input.przelacznik", { atrybuty: { type: "checkbox", name: "zapamietaj", checked: true } });
  const zapamietaj = el("div.logowanie-zapamietaj", [
    el("label.przelacznik-etykieta", [poleZapamietaj, el("span", { tekst: "Zapamiętaj mnie na tym urządzeniu" })]),
    el("p.przygaszony.logowanie-podpowiedz", {
      tekst: `Na ${ZAPAMIETANIE_DNI} dni albo do kliknięcia WYLOGUJ. Odznacz na cudzym lub wspólnym komputerze — wtedy logowanie trwa tylko do zamknięcia karty.`
    })
  ]);
  const blad = el("p.formularz-blad", { atrybuty: { role: "alert", hidden: true } });
  const przycisk = el("button.przycisk.przycisk-glowny", { tekst: "ZALOGUJ", atrybuty: { type: "submit" } });
  const formularz = el("form.formularz.formularz-logowania", { atrybuty: { novalidate: true } }, [
    etykietaLogin,
    etykietaHaslo,
    zapamietaj,
    blad,
    el("div.okno-przyciski", [przycisk])
  ]);

  formularz.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    blad.hidden = true;
    if (!poleLogin.value.trim() || !poleHaslo.value) {
      blad.textContent = KOMUNIKAT_BLEDNE_DANE;
      blad.hidden = false;
      return;
    }
    przycisk.disabled = true;
    przycisk.textContent = "SPRAWDZAM…";
    try {
      const sesja = await sprawdzLogowanie(poleLogin.value, poleHaslo.value);
      if (!sesja) {
        blad.textContent = KOMUNIKAT_BLEDNE_DANE;
        blad.hidden = false;
        poleHaslo.select();
        return;
      }
      zapiszSesje(sesja, { zapamietaj: poleZapamietaj.checked });
      if (obslugaZapisuHasel()) {
        await zapiszHasloWPrzegladarce(sesja.login, poleHaslo.value, sesja.nazwa);
        poleHaslo.value = ""; // Chrome i Edge dostały już hasło do zapisania
      }
      // W pozostałych przeglądarkach pole hasła zostaje wypełnione, aż strona przejdzie
      // dalej (start.js) — menedżer haseł zapamiętuje to, co było w formularzu.
      poZalogowaniu?.(sesja);
    } catch (e) {
      blad.textContent = opisBledu(e);
      blad.hidden = false;
    } finally {
      przycisk.disabled = false;
      przycisk.textContent = "ZALOGUJ";
    }
  });
  return { formularz, fokus: () => poleLogin.focus() };
}
