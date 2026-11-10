// Okna formularzy: notatka, cel/wątek (postęp), powiązanie.
// Treść pól trafia do bazy jako zwykły tekst; wyświetlamy ją przez textContent.
import { KATEGORIE_NOTATEK, KLUCZ_PODPISU, LIMITY, RODZAJE_POWIAZAN, STANY_POSTEPU } from "./konfiguracja.js";
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
 */
function okno(naglowek, pola, zapisz) {
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
  const pierwsze = formularz.querySelector("input, textarea, select");
  if (pierwsze) pierwsze.focus();
  return dialog;
}

function bladUzytkownika(tekst) {
  const e = new Error(tekst);
  e.uzytkownika = true;
  return e;
}

function polePodpisu(stan, wartosc) {
  const znane = [...stan.notatki, ...stan.postep, ...stan.powiazania].map((w) => w.podpis);
  const [idListy, datalist] = listaPodpowiedzi(znane);
  const input = el("input.pole", {
    atrybuty: { type: "text", maxlength: LIMITY.podpis, list: idListy, autocomplete: "off", value: wartosc ?? pamiecOdczyt(KLUCZ_PODPISU, "") }
  });
  return { input, wezel: el("div", [pole("PODPIS / POSTAĆ (opcjonalnie)", input, "Kto z drużyny to zapisał."), datalist]) };
}

function zapamietajPodpis(podpis) {
  if (podpis) pamiecZapis(KLUCZ_PODPISU, podpis);
}

function przytnij(tekst, limit) {
  return String(tekst || "").trim().slice(0, limit);
}

/**
 * Notatka — nowa (bez `notatka`) albo edycja.
 * @param {object} opcje { stan, dane, sesja, notatka, elementId }
 */
export function oknoNotatki({ stan, dane, sesja, notatka = null, elementId = undefined }) {
  const tytul = el("input.pole", { atrybuty: { type: "text", maxlength: LIMITY.tytul, required: true, value: notatka?.tytul ?? "" } });
  const tresc = el("textarea.pole", { atrybuty: { rows: "8", maxlength: LIMITY.tresc } });
  tresc.value = notatka?.tresc ?? "";
  const kategoria = lista(KATEGORIE_NOTATEK, notatka?.kategoria ?? (elementId ? "miejsce" : "inne"));

  // Miejsce: notatka ogólna albo element dostępny dla użytkownika.
  const biezace = notatka ? notatka.elementId ?? null : elementId ?? null;
  const opcjeMiejsca = [["", "— notatka ogólna (bez miejsca) —"]];
  for (const e of stan.elementyDlaUzytkownika()) opcjeMiejsca.push([e.id, e.nazwa]);
  if (biezace && !opcjeMiejsca.some(([id]) => id === biezace)) {
    // Element niedostępny albo usunięty z manifestu — zachowujemy powiązanie.
    opcjeMiejsca.push([biezace, "(miejsce niedostępne na mapie)"]);
  }
  const miejsce = lista(opcjeMiejsca, biezace ?? "");
  const { input: podpis, wezel: wezelPodpisu } = polePodpisu(stan, notatka?.podpis);

  okno(
    notatka ? "EDYCJA NOTATKI" : "NOWA NOTATKA",
    [
      pole("TYTUŁ", tytul),
      pole("MIEJSCE NA MAPIE", miejsce),
      pole("KATEGORIA", kategoria),
      pole("TREŚĆ", tresc),
      wezelPodpisu
    ],
    async () => {
      const wpis = {
        tytul: przytnij(tytul.value, LIMITY.tytul),
        tresc: String(tresc.value || "").slice(0, LIMITY.tresc),
        kategoria: kategoria.value,
        elementId: miejsce.value || null,
        podpis: przytnij(podpis.value, LIMITY.podpis)
      };
      if (!wpis.tytul && !wpis.tresc.trim()) throw bladUzytkownika("Wpisz tytuł albo treść notatki.");
      if (!wpis.tytul) wpis.tytul = wpis.tresc.trim().split("\n")[0].slice(0, 60);
      if (notatka) await dane.zmien("notatki", notatka.id, wpis, sesja);
      else await dane.dodaj("notatki", wpis, sesja);
      zapamietajPodpis(wpis.podpis);
      komunikat(notatka ? "Zapisano zmiany w notatce." : "Dodano notatkę.", "ok");
    }
  );
}

export function oknoPostepu({ stan, dane, sesja, wpis = null }) {
  const tytul = el("input.pole", { atrybuty: { type: "text", maxlength: LIMITY.tytul, required: true, value: wpis?.tytul ?? "" } });
  const opis = el("textarea.pole", { atrybuty: { rows: "6", maxlength: LIMITY.tresc } });
  opis.value = wpis?.opis ?? "";
  const stanPola = lista(STANY_POSTEPU, wpis?.stan ?? "otwarte");
  const { input: podpis, wezel: wezelPodpisu } = polePodpisu(stan, wpis?.podpis);
  okno(
    wpis ? "EDYCJA CELU" : "NOWY CEL / WĄTEK",
    [pole("TYTUŁ", tytul), pole("STAN", stanPola), pole("OPIS", opis), wezelPodpisu],
    async () => {
      const dane_ = {
        tytul: przytnij(tytul.value, LIMITY.tytul),
        opis: String(opis.value || "").slice(0, LIMITY.tresc),
        stan: stanPola.value,
        podpis: przytnij(podpis.value, LIMITY.podpis)
      };
      if (!dane_.tytul) throw bladUzytkownika("Wpisz tytuł celu albo wątku.");
      if (wpis) await dane.zmien("postep", wpis.id, dane_, sesja);
      else await dane.dodaj("postep", dane_, sesja);
      zapamietajPodpis(dane_.podpis);
      komunikat(wpis ? "Zapisano zmiany." : "Dodano cel / wątek.", "ok");
    }
  );
}

export function oknoPowiazania({ stan, dane, sesja, wpis = null }) {
  const nazwy = [
    ...stan.elementyDlaUzytkownika().map((e) => e.nazwa),
    ...stan.powiazania.flatMap((p) => [p.od, p.do])
  ];
  const [idListy, datalist] = listaPodpowiedzi(nazwy);
  const od = el("input.pole", { atrybuty: { type: "text", maxlength: LIMITY.nazwaStrony, list: idListy, required: true, autocomplete: "off", value: wpis?.od ?? "" } });
  const do_ = el("input.pole", { atrybuty: { type: "text", maxlength: LIMITY.nazwaStrony, list: idListy, required: true, autocomplete: "off", value: wpis?.do ?? "" } });
  const rodzaj = lista(RODZAJE_POWIAZAN, wpis?.rodzaj ?? "niepewne");
  const opis = el("textarea.pole", { atrybuty: { rows: "5", maxlength: LIMITY.tresc } });
  opis.value = wpis?.opis ?? "";
  const { input: podpis, wezel: wezelPodpisu } = polePodpisu(stan, wpis?.podpis);
  okno(
    wpis ? "EDYCJA POWIĄZANIA" : "NOWE POWIĄZANIE",
    [
      pole("KTO / CO", od, "Ród, postać, organizacja albo miejsce."),
      pole("RODZAJ RELACJI", rodzaj),
      pole("Z KIM / Z CZYM", do_),
      pole("OPIS", opis),
      wezelPodpisu,
      datalist
    ],
    async () => {
      const dane_ = {
        od: przytnij(od.value, LIMITY.nazwaStrony),
        do: przytnij(do_.value, LIMITY.nazwaStrony),
        rodzaj: rodzaj.value,
        opis: String(opis.value || "").slice(0, LIMITY.tresc),
        podpis: przytnij(podpis.value, LIMITY.podpis)
      };
      if (!dane_.od || !dane_.do) throw bladUzytkownika("Wpisz obie strony powiązania.");
      if (wpis) await dane.zmien("powiazania", wpis.id, dane_, sesja);
      else await dane.dodaj("powiazania", dane_, sesja);
      zapamietajPodpis(dane_.podpis);
      komunikat(wpis ? "Zapisano zmiany." : "Dodano powiązanie.", "ok");
    }
  );
}
