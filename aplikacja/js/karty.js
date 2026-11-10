// Karty wpisów (notatka, cel, powiązanie) używane w panelu miejsca i w zakładkach.
// Treść zawsze przez textContent (z zachowaniem podziałów wierszy w CSS: white-space: pre-wrap).
import { KATEGORIE_NOTATEK, RODZAJE_POWIAZAN, STANY_POSTEPU, etykieta } from "./konfiguracja.js";
import { el, formatujDate, komunikat, opisBledu, potwierdz } from "./narzedzia.js";
import { mozeEdytowac } from "./sesja.js";
import { oknoNotatki, oknoPostepu, oknoPowiazania } from "./formularze.js";

function metadane(wpis, dodatki = []) {
  const czesci = [...dodatki];
  if (wpis.podpis) czesci.push(`podpis: ${wpis.podpis}`);
  const data = formatujDate(wpis.zmieniono || wpis.utworzono);
  if (data) czesci.push(data);
  return el("p.karta-meta", { tekst: czesci.filter(Boolean).join(" · ") });
}

function przyciskiEdycji({ sesja, naEdycje, naUsuniecie, nazwa }) {
  if (!mozeEdytowac(sesja)) return null;
  return el("div.karta-przyciski", [
    el("button.przycisk.przycisk-maly", { tekst: "EDYTUJ", atrybuty: { type: "button", "aria-label": `Edytuj: ${nazwa}` }, zdarzenia: { click: naEdycje } }),
    el("button.przycisk.przycisk-maly.przycisk-niebezpieczny", {
      tekst: "USUŃ",
      atrybuty: { type: "button", "aria-label": `Usuń: ${nazwa}` },
      zdarzenia: { click: naUsuniecie }
    })
  ]);
}

async function usunWpis(dane, kolekcja, wpis, opis) {
  const ok = await potwierdz(`Usunąć ${opis} „${wpis.tytul || wpis.od || ""}”? Tej operacji nie da się cofnąć.`, {
    tak: "USUŃ",
    niebezpieczne: true
  });
  if (!ok) return;
  try {
    await dane.usun(kolekcja, wpis.id);
    komunikat("Usunięto.", "ok");
  } catch (e) {
    komunikat(opisBledu(e), "blad", 8000);
  }
}

/**
 * @param {object} notatka
 * @param {object} kontekst { stan, dane, sesja, pokazMiejsce, naMiejsce(id) }
 */
export function kartaNotatki(notatka, { stan, dane, sesja, pokazMiejsce = true, naMiejsce = null }) {
  const dodatki = [etykieta(KATEGORIE_NOTATEK, notatka.kategoria)];
  let odnosnik = null;
  if (pokazMiejsce) {
    const rodzaj = stan.rodzajNotatki(notatka);
    if (rodzaj === "miejsce") {
      const element = stan.elementyWgId.get(notatka.elementId);
      odnosnik = el("button.odnosnik", {
        tekst: `◈ ${element.nazwa}`,
        atrybuty: { type: "button", title: "Pokaż na mapie" },
        zdarzenia: { click: () => naMiejsce?.(element.id) }
      });
      if (!stan.elementDostepnyDlaGraczy(element)) dodatki.push("miejsce ukryte przed graczami");
    } else if (rodzaj === "bez-miejsca") {
      dodatki.push("miejsce niedostępne na mapie");
    } else {
      dodatki.push("notatka ogólna");
    }
  }
  return el("article.karta", { dane: { id: notatka.id } }, [
    el("h4.karta-tytul", { tekst: notatka.tytul || "(bez tytułu)" }),
    odnosnik,
    metadane(notatka, dodatki),
    notatka.tresc ? el("p.karta-tresc", { tekst: notatka.tresc }) : null,
    przyciskiEdycji({
      sesja,
      nazwa: notatka.tytul,
      naEdycje: () => oknoNotatki({ stan, dane, sesja, notatka }),
      naUsuniecie: () => usunWpis(dane, "notatki", notatka, "notatkę")
    })
  ]);
}

export function kartaPostepu(wpis, { stan, dane, sesja }) {
  return el("article.karta", { klasa: `karta-stan-${wpis.stan}`, dane: { id: wpis.id } }, [
    el("h4.karta-tytul", [el("span.znacznik-stanu", { tekst: `[${etykieta(STANY_POSTEPU, wpis.stan).toUpperCase()}]` }), " ", wpis.tytul || "(bez tytułu)"]),
    metadane(wpis),
    wpis.opis ? el("p.karta-tresc", { tekst: wpis.opis }) : null,
    przyciskiEdycji({
      sesja,
      nazwa: wpis.tytul,
      naEdycje: () => oknoPostepu({ stan, dane, sesja, wpis }),
      naUsuniecie: () => usunWpis(dane, "postep", wpis, "cel")
    })
  ]);
}

export function kartaPowiazania(wpis, { stan, dane, sesja }) {
  return el("article.karta.karta-powiazanie", { klasa: `rodzaj-${wpis.rodzaj}`, dane: { id: wpis.id } }, [
    el("h4.karta-tytul", [
      el("span", { tekst: wpis.od }),
      el("span.relacja", { tekst: ` —[ ${etykieta(RODZAJE_POWIAZAN, wpis.rodzaj).toUpperCase()} ]→ ` }),
      el("span", { tekst: wpis.do })
    ]),
    metadane(wpis),
    wpis.opis ? el("p.karta-tresc", { tekst: wpis.opis }) : null,
    przyciskiEdycji({
      sesja,
      nazwa: `${wpis.od} – ${wpis.do}`,
      naEdycje: () => oknoPowiazania({ stan, dane, sesja, wpis }),
      naUsuniecie: () => usunWpis(dane, "powiazania", { ...wpis, tytul: `${wpis.od} – ${wpis.do}` }, "powiązanie")
    })
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
