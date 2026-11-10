// Okno formularza notatki (nowa notatka i edycja).
// Treść pól trafia do bazy jako zwykły tekst; wyświetlamy ją przez textContent.
import { KLUCZ_PODPISU, LIMITY } from "./konfiguracja.js";
import { el, komunikat, opisBledu, pamiecOdczyt, pamiecZapis } from "./narzedzia.js";

let licznik = 0;

function pole(etykieta, kontrolka, podpowiedz) {
  const id = `pole-${++licznik}`;
  kontrolka.id = id;
  return el("div.etykieta", [
    el("label", { tekst: etykieta, atrybuty: { for: id } }),
    kontrolka,
    podpowiedz ? el("small.przygaszony", { tekst: podpowiedz }) : null
  ]);
}

function lista(opcje, wybrana) {
  const s = el("select.pole");
  for (const [wartosc, opis] of opcje) {
    s.append(el("option", { tekst: opis, atrybuty: { value: wartosc, selected: wartosc === wybrana } }));
  }
  return s;
}

function listaPodpowiedzi(wartosci) {
  const id = `podpowiedzi-${++licznik}`;
  const dl = el("datalist", { atrybuty: { id } });
  for (const w of [...new Set(wartosci.filter(Boolean))].sort((a, b) => a.localeCompare(b, "pl"))) {
    dl.append(el("option", { atrybuty: { value: w } }));
  }
  return [id, dl];
}

/**
 * Wspólny szkielet okna z formularzem.
 * @param {string} naglowek np. "NOWA NOTATKA"
 * @param {HTMLElement[]} pola
 * @param {function} zapisz async () => void; rzuca błąd przy niepowodzeniu
 * @param {HTMLElement} [fokus] pole, w którym ma stanąć kursor po otwarciu
 */
function okno(naglowek, pola, zapisz, fokus = null) {
  const dialog = el("dialog.okno", { atrybuty: { "aria-label": naglowek } });
  const zamknijX = el("button.przycisk-ikona", { tekst: "×", atrybuty: { type: "button", "aria-label": "Zamknij" } });
  const blad = el("p.formularz-blad", { atrybuty: { role: "alert", hidden: true } });
  const przyciskZapisz = el("button.przycisk.przycisk-glowny", { tekst: "ZAPISZ", atrybuty: { type: "submit" } });
  const przyciskAnuluj = el("button.przycisk", { tekst: "ANULUJ", atrybuty: { type: "button" } });
  const formularz = el("form.formularz", { atrybuty: { novalidate: true } }, [...pola, blad, el("div.okno-przyciski", [przyciskAnuluj, przyciskZapisz])]);
  dialog.append(el("div.okno-pasek", [el("span.ozdoba", { tekst: `+++ ${naglowek} +++` }), zamknijX]), formularz);
  const zamknij = () => {
    dialog.close();
    dialog.remove();
  };
  zamknijX.addEventListener("click", zamknij);
  przyciskAnuluj.addEventListener("click", zamknij);
  dialog.addEventListener("close", () => dialog.remove());
  formularz.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    blad.hidden = true;
    przyciskZapisz.disabled = true;
    przyciskZapisz.textContent = "ZAPISUJĘ…";
    try {
      await zapisz();
      zamknij();
    } catch (e) {
      blad.textContent = e && e.uzytkownika ? e.message : opisBledu(e);
      blad.hidden = false;
    } finally {
      przyciskZapisz.disabled = false;
      przyciskZapisz.textContent = "ZAPISZ";
    }
  });
  document.body.append(dialog);
  dialog.showModal();
  (fokus || formularz.querySelector("input, textarea, select"))?.focus();
  return dialog;
}

function bladUzytkownika(tekst) {
  const e = new Error(tekst);
  e.uzytkownika = true;
  return e;
}

function przytnij(tekst, limit) {
  return String(tekst || "").trim().slice(0, limit);
}

/**
 * Notatka — nowa (bez `notatka`) albo edycja.
 * @param {object} opcje { stan, dane, sesja, notatka, elementId }
 */
export function oknoNotatki({ stan, dane, sesja, notatka = null, elementId = undefined }) {
  const tytul = el("input.pole", { atrybuty: { type: "text", maxlength: LIMITY.tytul, value: notatka?.tytul ?? "" } });
  const tresc = el("textarea.pole", { atrybuty: { rows: "8", maxlength: LIMITY.tresc } });
  tresc.value = notatka?.tresc ?? "";

  // Miejsce: notatka ogólna albo element dostępny dla użytkownika.
  const biezace = notatka ? notatka.elementId ?? null : elementId ?? null;
  const opcjeMiejsca = [["", "— notatka ogólna (bez miejsca) —"]];
  for (const e of stan.elementyDlaUzytkownika()) opcjeMiejsca.push([e.id, e.nazwa]);
  if (biezace && !opcjeMiejsca.some(([id]) => id === biezace)) {
    // Element niedostępny albo usunięty z manifestu — zachowujemy powiązanie.
    opcjeMiejsca.push([biezace, "(miejsce niedostępne na mapie)"]);
  }
  const miejsce = lista(opcjeMiejsca, biezace ?? "");

  const [idListy, podpowiedzi] = listaPodpowiedzi(stan.notatki.map((n) => n.podpis));
  const podpis = el("input.pole", {
    atrybuty: { type: "text", maxlength: LIMITY.podpis, list: idListy, autocomplete: "off", value: notatka?.podpis ?? pamiecOdczyt(KLUCZ_PODPISU, "") }
  });

  okno(
    notatka ? "EDYCJA NOTATKI" : "NOWA NOTATKA",
    [
      pole("TYTUŁ (opcjonalnie)", tytul, "Bez tytułu zostanie nim początek treści."),
      pole("MIEJSCE NA MAPIE", miejsce),
      pole("TREŚĆ", tresc),
      pole("PODPIS / POSTAĆ (opcjonalnie)", podpis, "Kto z drużyny to zapisał."),
      podpowiedzi
    ],
    async () => {
      const wpis = {
        tytul: przytnij(tytul.value, LIMITY.tytul),
        tresc: String(tresc.value || "").slice(0, LIMITY.tresc),
        elementId: miejsce.value || null,
        podpis: przytnij(podpis.value, LIMITY.podpis)
      };
      if (!wpis.tytul && !wpis.tresc.trim()) throw bladUzytkownika("Wpisz treść albo tytuł notatki.");
      if (!wpis.tytul) wpis.tytul = wpis.tresc.trim().split("\n")[0].slice(0, 60);
      if (notatka) await dane.zmien("notatki", notatka.id, wpis, sesja);
      else await dane.dodaj("notatki", wpis, sesja);
      if (wpis.podpis) pamiecZapis(KLUCZ_PODPISU, wpis.podpis);
      komunikat(notatka ? "Zapisano zmiany w notatce." : "Dodano notatkę.", "ok");
    },
    tresc
  );
}
