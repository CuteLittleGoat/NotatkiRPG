// Sesja zalogowanego konta — w sessionStorage (znika po zamknięciu karty).
// Przechowujemy WYŁĄCZNIE: identyfikator konta, login i rolę. Nigdy hasło.
import { KLUCZ_SESJI } from "./konfiguracja.js";

export const ROLE = { GOSC: "gosc", GRACZ: "gracz", ADMIN: "admin" };

const ZDARZENIE = "notatkirpg-sesja";

export function pobierzSesje() {
  try {
    const tekst = sessionStorage.getItem(KLUCZ_SESJI);
    if (!tekst) return null;
    const s = JSON.parse(tekst);
    if (s && typeof s.kontoId === "string" && (s.rola === ROLE.GRACZ || s.rola === ROLE.ADMIN)) {
      return { kontoId: s.kontoId, login: String(s.login || ""), rola: s.rola };
    }
  } catch {
    /* brak dostępu do sessionStorage albo uszkodzony wpis — traktujemy jak gościa */
  }
  return null;
}

export function zapiszSesje({ kontoId, login, rola }) {
  let zapisano = false;
  try {
    sessionStorage.setItem(KLUCZ_SESJI, JSON.stringify({ kontoId, login, rola }));
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
  } catch {
    /* nic do zrobienia */
  }
  window.dispatchEvent(new CustomEvent(ZDARZENIE));
}

export function naZmianeSesji(funkcja) {
  window.addEventListener(ZDARZENIE, () => funkcja(pobierzSesje()));
}

export function rola(sesja) {
  return sesja ? sesja.rola : ROLE.GOSC;
}

/** Gracz może dodawać, zmieniać i usuwać wpisy. Admin — tylko przegląda wpisy. */
export function mozeEdytowac(sesja) {
  return rola(sesja) === ROLE.GRACZ;
}

export function jestAdminem(sesja) {
  return rola(sesja) === ROLE.ADMIN;
}

export function opisRoli(sesja) {
  const r = rola(sesja);
  if (r === ROLE.ADMIN) return "ADMIN";
  if (r === ROLE.GRACZ) return "GRACZ";
  return "GOŚĆ";
}
