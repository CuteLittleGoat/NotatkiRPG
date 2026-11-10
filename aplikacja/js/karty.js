// Karta notatki — w karcie miejsca i w zakładce „Notatki”.
// Treść zawsze przez textContent (podziały wierszy zachowuje CSS: white-space: pre-wrap).
import { el, formatujDate, komunikat, opisBledu, potwierdz } from "./narzedzia.js";
import { jestAdminem, mozeEdytowac } from "./sesja.js";
import { oknoNotatki } from "./formularze.js";

/** Opis miejsca notatki: nazwa miejsca, „notatka ogólna” albo „miejsce niedostępne”. */
function opisMiejsca(notatka, stan) {
  const rodzaj = stan.rodzajNotatki(notatka);
  if (rodzaj === "ogolna") return "notatka ogólna";
  if (rodzaj === "bez-miejsca") return "miejsce niedostępne na mapie";
  const element = stan.elementyWgId.get(notatka.elementId);
  const ukryte = jestAdminem(stan.sesja) && !stan.elementDostepnyDlaGraczy(element);
  return `◈ ${element.nazwa}${ukryte ? " (ukryte przed graczami)" : ""}`;
}

async function usunNotatke(dane, notatka) {
  const ok = await potwierdz(`Usunąć notatkę „${notatka.tytul || ""}”? Tej operacji nie da się cofnąć.`, {
    tak: "USUŃ",
    niebezpieczne: true
  });
  if (!ok) return;
  try {
    await dane.usun("notatki", notatka.id);
    komunikat("Usunięto notatkę.", "ok");
  } catch (e) {
    komunikat(opisBledu(e), "blad", 8000);
  }
}

/**
 * @param {object} notatka
 * @param {object} kontekst { stan, dane, sesja }
 */
export function kartaNotatki(notatka, { stan, dane, sesja }) {
  const meta = [opisMiejsca(notatka, stan)];
  if (notatka.podpis) meta.push(`podpis: ${notatka.podpis}`);
  const data = formatujDate(notatka.zmieniono || notatka.utworzono);
  if (data) meta.push(data);

  const przyciski = mozeEdytowac(sesja)
    ? el("div.karta-przyciski", [
        el("button.przycisk.przycisk-maly", {
          tekst: "EDYTUJ",
          atrybuty: { type: "button", "aria-label": `Edytuj: ${notatka.tytul}` },
          zdarzenia: { click: () => oknoNotatki({ stan, dane, sesja, notatka }) }
        }),
        el("button.przycisk.przycisk-maly.przycisk-niebezpieczny", {
          tekst: "USUŃ",
          atrybuty: { type: "button", "aria-label": `Usuń: ${notatka.tytul}` },
          zdarzenia: { click: () => usunNotatke(dane, notatka) }
        })
      ])
    : null;

  return el("article.karta", { dane: { id: notatka.id } }, [
    el("h4.karta-tytul", { tekst: notatka.tytul || "(bez tytułu)" }),
    el("p.karta-meta", { tekst: meta.join(" · ") }),
    notatka.tresc ? el("p.karta-tresc", { tekst: notatka.tresc }) : null,
    przyciski
  ]);
}

/** Sortowanie: najnowsze zmiany na górze. */
export function odNajnowszych(a, b) {
  const t = (w) => {
    const z = w.zmieniono || w.utworzono;
    if (!z) return Number.MAX_SAFE_INTEGER; // świeży wpis jeszcze bez znacznika serwera
    return typeof z.toMillis === "function" ? z.toMillis() : 0;
  };
  return t(b) - t(a);
}
