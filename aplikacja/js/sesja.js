// Sesja zalogowanego konta — w sessionStorage (znika po zamknięciu karty).
// Przechowujemy WYŁĄCZNIE: identyfikator konta, login (PlayerName), nazwę
// wyświetlaną (DisplayName) i profil. Nigdy hasło.
//
// Profile (role):
//   admin  — konto z rolą „admin” w kolekcji admins: ustawienia, kopie; notatki tylko czyta;
//   skryba — konto graczy z DisplayName „Skryba”: dodaje, zmienia i usuwa notatki;
//   gracz  — każde inne konto: tylko czyta.
// Bez logowania aplikacja niczego nie pokazuje (ani map, ani nazw kampanii).
import { KLUCZ_LOGU, KLUCZ_SESJI, NAZWA_SKRYBY } from "./konfiguracja.js";
import { normalizuj } from "./narzedzia.js";

export const ROLE = { GRACZ: "gracz", SKRYBA: "skryba", ADMIN: "admin" };
const ZNANE_ROLE = Object.values(ROLE);
const WERSJA_SESJI = 2; // starsze sesje (sprzed profili) trzeba zalogować ponownie

const ZDARZENIE = "notatkirpg-sesja";

/**
 * Profil konta z danych w bazie.
 * @param {{rolaAdmina?: string, nazwa?: string}} konto rolaAdmina — pole „rola” z admins/{id};
 *   nazwa — pole DisplayName
 */
export function rolaKonta({ rolaAdmina, nazwa } = {}) {
  if (rolaAdmina === "admin") return ROLE.ADMIN;
  if (normalizuj(nazwa) === NAZWA_SKRYBY) return ROLE.SKRYBA;
  return ROLE.GRACZ;
}

export function pobierzSesje() {
  try {
    const tekst = sessionStorage.getItem(KLUCZ_SESJI);
    if (!tekst) return null;
    const s = JSON.parse(tekst);
    if (s && s.wersja === WERSJA_SESJI && typeof s.kontoId === "string" && ZNANE_ROLE.includes(s.rola)) {
      return { kontoId: s.kontoId, login: String(s.login || ""), nazwa: String(s.nazwa || ""), rola: s.rola };
    }
  } catch {
    /* brak dostępu do sessionStorage albo uszkodzony wpis — jak bez logowania */
  }
  return null;
}

export function zapiszSesje({ kontoId, login, nazwa, rola }) {
  let zapisano = false;
  try {
    sessionStorage.setItem(KLUCZ_SESJI, JSON.stringify({ wersja: WERSJA_SESJI, kontoId, login, nazwa, rola }));
    sessionStorage.removeItem(KLUCZ_LOGU); // nowa sesja — pusty log
    zapisano = true;
  } catch {
    zapisano = false;
  }
  window.dispatchEvent(new CustomEvent(ZDARZENIE));
  return zapisano;
}

export function wyczyscSesje() {
  try {
    sessionStorage.removeItem(KLUCZ_SESJI);
    sessionStorage.removeItem(KLUCZ_LOGU); // log admina znika po wylogowaniu
  } catch {
    /* nic do zrobienia */
  }
  window.dispatchEvent(new CustomEvent(ZDARZENIE));
}

export function naZmianeSesji(funkcja) {
  window.addEventListener(ZDARZENIE, () => funkcja(pobierzSesje()));
}

export function rola(sesja) {
  return sesja ? sesja.rola : null;
}

/** Notatki dodaje, zmienia i usuwa tylko Skryba. Admin i Gracz — tylko czytają. */
export function mozeEdytowac(sesja) {
  return rola(sesja) === ROLE.SKRYBA;
}

export function jestAdminem(sesja) {
  return rola(sesja) === ROLE.ADMIN;
}

export function opisRoli(sesja) {
  return { [ROLE.ADMIN]: "Admin", [ROLE.SKRYBA]: "Skryba", [ROLE.GRACZ]: "Gracz" }[rola(sesja)] || "";
}

/** Nazwa konta na dole ekranu: pole DisplayName (a gdy go brak — nazwa profilu). */
export function nazwaKonta(sesja) {
  return (sesja?.nazwa || "").trim() || opisRoli(sesja);
}

// ---- kampanie: kto którą widzi ----

/**
 * Czy kampania jest widoczna dla graczy (Skryby i Gracza).
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
