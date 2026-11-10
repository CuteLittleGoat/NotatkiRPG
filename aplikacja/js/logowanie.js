// Logowanie na etapie szkicu: porównanie loginu i hasła z kolekcją „secrets”.
// UWAGA: przeglądarka musi czytać kolekcję secrets, więc hasła są widoczne dla
// każdego, kto zajrzy do bazy — opis i droga na później w README.md.
import { db, collection, doc, getDoc, getDocs, query, where } from "./firebase.js";
import { KOLEKCJA_ADMINOW, KOLEKCJA_SEKRETOW } from "./konfiguracja.js";
import { el, opisBledu } from "./narzedzia.js";
import { ROLE, zapiszSesje } from "./sesja.js";

export const KOMUNIKAT_BLEDNE_DANE = "Nieprawidłowy login lub hasło.";

/**
 * Sprawdza login i hasło. Zwraca { kontoId, login, rola } albo null.
 * Rzuca błąd tylko przy problemie z bazą (np. brak uprawnień).
 */
export async function sprawdzLogowanie(login, haslo) {
  const czystyLogin = String(login || "").trim();
  const czysteHaslo = String(haslo || "");
  if (!czystyLogin || !czysteHaslo) return null;
  const wynik = await getDocs(query(collection(db, KOLEKCJA_SEKRETOW), where("PlayerName", "==", czystyLogin)));
  let kontoId = null;
  wynik.forEach((d) => {
    if (!kontoId && d.data().PlayerPassword === czysteHaslo) kontoId = d.id;
  });
  if (!kontoId) return null;
  const admin = await getDoc(doc(db, KOLEKCJA_ADMINOW, kontoId));
  const rola = admin.exists() && admin.data().rola === "admin" ? ROLE.ADMIN : ROLE.GRACZ;
  return { kontoId, login: czystyLogin, rola };
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

/** Okno logowania (na stronie kampanii). */
export function oknoLogowania(poZalogowaniu) {
  const okno = el("dialog.okno.okno-male", { atrybuty: { "aria-label": "Logowanie" } });
  const zamknij = el("button.przycisk-ikona", { tekst: "×", atrybuty: { type: "button", "aria-label": "Zamknij" } });
  const { formularz, fokus } = formularzLogowania((sesja) => {
    okno.close();
    okno.remove();
    poZalogowaniu?.(sesja);
  });
  okno.append(
    el("div.okno-pasek", [el("span.ozdoba", { tekst: "+++ IDENTYFIKACJA UŻYTKOWNIKA +++" }), zamknij]),
    el("p.okno-tresc.przygaszony", { tekst: "Bez logowania możesz tylko przeglądać. Gracze dzielą jedno konto — przy wpisie możesz podać swój podpis." }),
    formularz
  );
  zamknij.addEventListener("click", () => {
    okno.close();
    okno.remove();
  });
  okno.addEventListener("close", () => okno.remove());
  document.body.append(okno);
  okno.showModal();
  fokus();
}
