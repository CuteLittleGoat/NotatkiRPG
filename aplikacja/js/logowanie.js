// Logowanie: porównanie loginu i hasła z kolekcją „secrets” (świadoma decyzja —
// bez logowania Firebase). UWAGA: przeglądarka musi czytać kolekcję secrets, więc
// hasła są widoczne dla każdego, kto zajrzy do bazy — opis w README.md.
//
// Dokument konta w secrets: PlayerName (login, widoczny u góry ekranu),
// PlayerPassword (hasło), DisplayName (nazwa konta na dole ekranu). Uprawnienia —
// WYŁĄCZNIE pole „rola” w admins/{id} („admin” albo „edytor”; brak = tylko czyta).
// Kolekcji kont aplikacja nie zmienia.
import { db, collection, doc, getDoc, getDocs, query, where } from "./firebase.js";
import { KOLEKCJA_ADMINOW, KOLEKCJA_SEKRETOW } from "./konfiguracja.js";
import { el, opisBledu } from "./narzedzia.js";
import { rolaKonta, zapiszSesje } from "./sesja.js";

export const KOMUNIKAT_BLEDNE_DANE = "Nieprawidłowy login lub hasło.";

const tekst = (v) => (typeof v === "string" ? v.trim() : "");

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
  const blad = el("p.formularz-blad", { atrybuty: { role: "alert", hidden: true } });
  const przycisk = el("button.przycisk.przycisk-glowny", { tekst: "ZALOGUJ", atrybuty: { type: "submit" } });
  const formularz = el("form.formularz.formularz-logowania", { atrybuty: { novalidate: true } }, [
    etykietaLogin,
    etykietaHaslo,
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
      poleHaslo.value = "";
      zapiszSesje(sesja);
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
