// Sesja zalogowanego konta. Przechowujemy WYŁĄCZNIE: identyfikator konta, login
// (PlayerName), nazwę wyświetlaną (DisplayName), profil i — przy zapamiętaniu — datę
// ważności. Nigdy hasło (hasło może zapamiętać menedżer haseł przeglądarki, nie aplikacja).
//
// Gdzie (analiza i decyzje: Analizy/Logowanie.md):
//   * „Zapamiętaj mnie na tym urządzeniu” (domyślnie zaznaczone) — localStorage,
//     ważna ZAPAMIETANIE_DNI dni od zalogowania, wspólna dla wszystkich kart tej
//     przeglądarki: WYLOGUJ w jednej karcie wylogowuje pozostałe (zdarzenie „storage”);
//   * bez zapamiętania — sessionStorage: tylko ta karta, do jej zamknięcia.
// Przy każdym otwarciu strony konto jest sprawdzane w bazie (sprawdzKonto w
// logowanie.js): usunięte konto albo zmieniony login = wylogowanie, zmieniona rola =
// nowy profil (uwzglednijSprawdzenieKonta).
//
// Profile (role) — WYŁĄCZNIE z pola „rola” w dokumencie admins/{id} (DisplayName
// i PlayerName nie mają wpływu na uprawnienia):
//   admin  — „rola: admin”: ustawienia, kopie; notatki tylko czyta;
//   edytor — „rola: edytor”: dodaje, zmienia i usuwa notatki;
//   gracz  — konto bez dokumentu w admins (albo z inną rolą): tylko czyta. Na to
//            konto może być zalogowanych wiele osób naraz.
// Bez logowania aplikacja niczego nie pokazuje (ani map, ani nazw kampanii).
import { KLUCZ_LOGU, KLUCZ_SESJI, ZAPAMIETANIE_DNI } from "./konfiguracja.js";
import { normalizuj } from "./narzedzia.js";

export const ROLE = { GRACZ: "gracz", EDYTOR: "edytor", ADMIN: "admin" };
const ZNANE_ROLE = Object.values(ROLE);
// 4: sesja zapamiętana (localStorage) z datą ważności. Starsze sesje (np. 3 — sprzed
// zapamiętywania, 2 — sprzed profilu edytora) trzeba zalogować ponownie.
const WERSJA_SESJI = 4;
const DZIEN_MS = 24 * 60 * 60 * 1000;

const ZDARZENIE = "notatkirpg-sesja";
// Znacznik „w tej karcie przed chwilą wylogowano” (sessionStorage) — strona startowa nie
// loguje wtedy automatycznie hasłem z menedżera haseł, także po przejściu ze strony kampanii.
const KLUCZ_WYLOGOWANO = "notatkirpg.wylogowano";

// Magazyny sesji: „karta” — tylko ta karta (sessionStorage), „trwaly” — zapamiętana
// na tym urządzeniu (localStorage). Dostęp zawsze w try/catch: tryb prywatny albo
// zablokowane dane strony potrafią rzucić błąd już przy odczycie właściwości.
const MAGAZYNY = { karta: "sessionStorage", trwaly: "localStorage" };

function magazyn(rodzaj) {
  try {
    return globalThis[MAGAZYNY[rodzaj]] ?? null;
  } catch {
    return null;
  }
}

function odczytaj(rodzaj) {
  try {
    const tekst = magazyn(rodzaj)?.getItem(KLUCZ_SESJI);
    return tekst ? JSON.parse(tekst) : null;
  } catch {
    return null; // uszkodzony wpis — jak bez logowania
  }
}

function zapisz(rodzaj, dane) {
  try {
    const m = magazyn(rodzaj);
    if (!m) return false;
    m.setItem(KLUCZ_SESJI, JSON.stringify(dane));
    return true;
  } catch {
    return false;
  }
}

function usun(rodzaj) {
  try {
    magazyn(rodzaj)?.removeItem(KLUCZ_SESJI);
  } catch {
    /* nic do zrobienia */
  }
}

function wyczyscLogAdmina() {
  try {
    sessionStorage.removeItem(KLUCZ_LOGU);
  } catch {
    /* nic do zrobienia */
  }
}

function powiadom() {
  try {
    globalThis.dispatchEvent?.(new CustomEvent(ZDARZENIE));
  } catch {
    /* środowisko bez zdarzeń (np. testy w Node) */
  }
}

/** Poprawna sesja z magazynu albo null (stara wersja, uszkodzony wpis, po terminie ważności). */
function sprawdzona(s, rodzaj, teraz = Date.now()) {
  if (!s || s.wersja !== WERSJA_SESJI || typeof s.kontoId !== "string" || !s.kontoId || !ZNANE_ROLE.includes(s.rola)) return null;
  const zapamietana = rodzaj === "trwaly";
  if (zapamietana && !(typeof s.wazneDo === "number" && s.wazneDo > teraz)) return null;
  return {
    kontoId: s.kontoId,
    login: String(s.login || ""),
    nazwa: String(s.nazwa || ""),
    rola: s.rola,
    zapamietana,
    wazneDo: zapamietana ? s.wazneDo : null
  };
}

/**
 * Profil konta z pola „rola” w admins/{id} (wielkość liter i spacje nie mają znaczenia).
 * Brak dokumentu albo inna wartość = Gracz (tylko czyta).
 */
export function rolaKonta(rolaZBazy) {
  const r = normalizuj(typeof rolaZBazy === "string" ? rolaZBazy : "");
  if (r === ROLE.ADMIN) return ROLE.ADMIN;
  if (r === ROLE.EDYTOR) return ROLE.EDYTOR;
  return ROLE.GRACZ;
}

/**
 * Bieżąca sesja albo null. Najpierw sesja tej karty (logowanie bez zapamiętania),
 * potem zapamiętana na urządzeniu. Nieważne wpisy (stara wersja, po terminie) usuwa.
 * @returns {{kontoId, login, nazwa, rola, zapamietana: boolean, wazneDo: number|null}|null}
 */
export function pobierzSesje() {
  for (const rodzaj of ["karta", "trwaly"]) {
    const surowa = odczytaj(rodzaj);
    if (!surowa) continue;
    const sesja = sprawdzona(surowa, rodzaj);
    if (sesja) return sesja;
    usun(rodzaj);
  }
  return null;
}

/**
 * Zapis sesji po zalogowaniu. zapamietaj = true: na tym urządzeniu (localStorage) przez
 * ZAPAMIETANIE_DNI dni, we wszystkich kartach; false: tylko ta karta (sessionStorage).
 * Gdy przeglądarka nie pozwala zapamiętać (np. zablokowane dane stron) — tylko ta karta.
 * Zapisywane są wyłącznie wymienione pola — nigdy hasło.
 */
export function zapiszSesje({ kontoId, login, nazwa, rola }, { zapamietaj = false } = {}) {
  const dane = { wersja: WERSJA_SESJI, kontoId, login, nazwa, rola };
  let zapisano = false;
  if (zapamietaj) {
    usun("karta");
    zapisano = zapisz("trwaly", { ...dane, wazneDo: Date.now() + ZAPAMIETANIE_DNI * DZIEN_MS });
  }
  if (!zapisano) {
    usun("trwaly"); // „nie zapamiętuj” — nie zostawiamy zapamiętanej sesji na urządzeniu
    zapisano = zapisz("karta", dane);
  }
  wyczyscLogAdmina(); // nowa sesja — pusty log
  try {
    sessionStorage.removeItem(KLUCZ_WYLOGOWANO);
  } catch {
    /* nic do zrobienia */
  }
  powiadom();
  return zapisano;
}

/**
 * Nowe dane konta z bazy (rola, nazwa) — w tym samym miejscu i z tą samą ważnością.
 * Zwraca true, gdy coś się zmieniło.
 */
export function odswiezSesje({ kontoId, nazwa, rola }) {
  const sesja = pobierzSesje();
  if (!sesja || sesja.kontoId !== kontoId || !ZNANE_ROLE.includes(rola)) return false;
  if (sesja.rola === rola && sesja.nazwa === nazwa) return false;
  const dane = { wersja: WERSJA_SESJI, kontoId, login: sesja.login, nazwa: String(nazwa || ""), rola };
  if (sesja.zapamietana) dane.wazneDo = sesja.wazneDo;
  zapisz(sesja.zapamietana ? "trwaly" : "karta", dane);
  powiadom();
  return true;
}

/**
 * Wynik sprawdzenia konta w bazie przy otwarciu strony (sprawdzKonto w logowanie.js):
 * null = konto usunięte albo zmieniony login → wylogowanie; inaczej — aktualny profil.
 * Nic nie robi, jeśli w międzyczasie zalogowano się na inne konto.
 */
export function uwzglednijSprawdzenieKonta(sprawdzana, wynik) {
  if (pobierzSesje()?.kontoId !== sprawdzana.kontoId) return;
  if (wynik === null) wyczyscSesje();
  else odswiezSesje(wynik);
}

/** Wylogowanie w tej karcie i — przy sesji zapamiętanej — we wszystkich kartach tej przeglądarki. */
export function wyczyscSesje() {
  // Najpierw blokada automatycznego logowania, potem usunięcie sesji (na które reagują
  // inne karty) — żeby żadna karta nie zdążyła zalogować się z powrotem.
  zablokujAutomatyczneLogowanie();
  usun("karta");
  usun("trwaly");
  wyczyscLogAdmina(); // log admina znika po wylogowaniu
  try {
    sessionStorage.setItem(KLUCZ_WYLOGOWANO, "1");
  } catch {
    /* nic do zrobienia */
  }
  powiadom();
}

/** Czy w tej karcie przed chwilą wylogowano (odczyt kasuje znacznik). */
export function swiezoWylogowano() {
  try {
    const tak = sessionStorage.getItem(KLUCZ_WYLOGOWANO) === "1";
    sessionStorage.removeItem(KLUCZ_WYLOGOWANO);
    return tak;
  } catch {
    return false;
  }
}

/**
 * Chrome i Edge: po wylogowaniu przeglądarka nie zaloguje automatycznie hasłem z
 * menedżera haseł — dopiero gdy ktoś zaloguje się sam (Analizy/Logowanie.md, decyzja 5).
 */
function zablokujAutomatyczneLogowanie() {
  try {
    const obietnica = globalThis.navigator?.credentials?.preventSilentAccess?.();
    obietnica?.catch?.(() => {});
  } catch {
    /* przeglądarka bez menedżera haseł */
  }
}

/**
 * Zmiana sesji: w tej karcie (logowanie, wylogowanie, odświeżenie profilu) i w innych
 * kartach tej przeglądarki (sesja zapamiętana — zdarzenie „storage”).
 */
export function naZmianeSesji(funkcja) {
  window.addEventListener(ZDARZENIE, () => funkcja(pobierzSesje()));
  window.addEventListener("storage", (ev) => {
    if (ev.key === KLUCZ_SESJI || ev.key === null) funkcja(pobierzSesje());
  });
}

export function rola(sesja) {
  return sesja ? sesja.rola : null;
}

/** Notatki dodaje, zmienia i usuwa tylko Edytor. Admin i Gracz — tylko czytają. */
export function mozeEdytowac(sesja) {
  return rola(sesja) === ROLE.EDYTOR;
}

export function jestAdminem(sesja) {
  return rola(sesja) === ROLE.ADMIN;
}

export function opisRoli(sesja) {
  return { [ROLE.ADMIN]: "Admin", [ROLE.EDYTOR]: "Edytor", [ROLE.GRACZ]: "Gracz" }[rola(sesja)] || "";
}

/** Nazwa konta na dole ekranu: pole DisplayName (a gdy go brak — nazwa profilu). */
export function nazwaKonta(sesja) {
  return (sesja?.nazwa || "").trim() || opisRoli(sesja);
}

// ---- kampanie: kto którą widzi ----

/**
 * Czy kampania jest widoczna dla graczy (Edytora i Gracza).
 * @param {object} wpis wpis z rejestru kampanie.json (pole widocznaDomyslnie)
 * @param {object|null} dokument dane z bazy kampanie/{id} (pole widoczna)
 */
export function kampaniaWidocznaDlaGraczy(wpis, dokument) {
  const wartosc = dokument?.widoczna;
  if (typeof wartosc === "boolean") return wartosc;
  return wpis?.widocznaDomyslnie === true;
}

/** Admin widzi wszystkie kampanie, gracze — tylko udostępnione; bez logowania — żadnej. */
export function kampaniaDlaUzytkownika(sesja, wpis, dokument) {
  if (!sesja) return false;
  return jestAdminem(sesja) || kampaniaWidocznaDlaGraczy(wpis, dokument);
}
