// Zakładka „Powiązania”: relacje między rodami, postaciami, organizacjami i miejscami.
// Lista z filtrem po stronie relacji + prosty graf (węzły na okręgu).
import { RODZAJE_POWIAZAN, etykieta } from "./konfiguracja.js";
import { el, normalizuj, opoznij, pasuje, wyczysc } from "./narzedzia.js";
import { mozeEdytowac } from "./sesja.js";
import { kartaPowiazania } from "./karty.js";
import { oknoPowiazania } from "./formularze.js";

const NS = "http://www.w3.org/2000/svg";

export class WidokPowiazan {
  constructor(kontener, opcje) {
    this.kontener = kontener;
    this.opcje = opcje; // { stan, dane }
    const { stan, dane } = opcje;
    this.przyciskNowe = el("button.przycisk.przycisk-glowny", {
      tekst: "+ NOWE POWIĄZANIE",
      atrybuty: { type: "button" },
      zdarzenia: { click: () => oknoPowiazania({ stan, dane, sesja: stan.sesja }) }
    });
    this.strona = el("input.pole", {
      atrybuty: { type: "search", placeholder: "Strona relacji (kto / z kim)…", "aria-label": "Filtr: strona relacji", list: "powiazania-strony" }
    });
    this.podpowiedzi = el("datalist", { atrybuty: { id: "powiazania-strony" } });
    this.rodzaj = el("select.pole", { atrybuty: { "aria-label": "Filtr: rodzaj relacji" } }, [
      el("option", { tekst: "Wszystkie rodzaje", atrybuty: { value: "" } }),
      ...RODZAJE_POWIAZAN.map(([k, v]) => el("option", { tekst: v, atrybuty: { value: k } }))
    ]);
    this.przyciskGraf = el("button.przycisk", { tekst: "POKAŻ GRAF", atrybuty: { type: "button", "aria-pressed": "false" } });
    this.przyciskGraf.addEventListener("click", () => {
      const wlaczony = this.przyciskGraf.getAttribute("aria-pressed") !== "true";
      this.przyciskGraf.setAttribute("aria-pressed", String(wlaczony));
      this.przyciskGraf.textContent = wlaczony ? "UKRYJ GRAF" : "POKAŻ GRAF";
      this.render();
    });
    this.strona.addEventListener("input", opoznij(() => this.render(), 120));
    this.rodzaj.addEventListener("change", () => this.render());
    this.graf = el("div.graf", { atrybuty: { hidden: true } });
    this.lista = el("div.lista-wpisow");
    this.kontener.append(
      el("div.tresc-widoku", [
        el("div.widok-naglowek", [el("h2", { tekst: "▤ POWIĄZANIA" }), this.przyciskNowe]),
        el("div.filtry", [this.strona, this.podpowiedzi, this.rodzaj, this.przyciskGraf]),
        this.graf,
        this.lista
      ])
    );
  }

  render() {
    const { stan, dane } = this.opcje;
    this.przyciskNowe.hidden = !mozeEdytowac(stan.sesja);
    wyczysc(this.podpowiedzi);
    for (const n of [...new Set(stan.powiazania.flatMap((p) => [p.od, p.do]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pl"))) {
      this.podpowiedzi.append(el("option", { atrybuty: { value: n } }));
    }
    const strona = this.strona.value;
    const wpisy = stan.powiazania
      .filter((p) => (!this.rodzaj.value || p.rodzaj === this.rodzaj.value) && (pasuje(strona, p.od) || pasuje(strona, p.do)))
      .sort((a, b) => String(a.od).localeCompare(String(b.od), "pl") || String(a.do).localeCompare(String(b.do), "pl"));

    wyczysc(this.lista);
    for (const p of wpisy) this.lista.append(kartaPowiazania(p, { stan, dane, sesja: stan.sesja }));
    if (!wpisy.length) {
      this.lista.append(
        el("p.przygaszony", { tekst: !stan.wczytano.powiazania ? "Wczytywanie…" : stan.powiazania.length ? "Brak powiązań pasujących do filtrów." : "Nie ma jeszcze żadnych powiązań." })
      );
    }
    const grafWlaczony = this.przyciskGraf.getAttribute("aria-pressed") === "true";
    this.graf.hidden = !grafWlaczony;
    if (grafWlaczony) this.rysujGraf(wpisy);
  }

  /** Prosty graf: węzły równo na okręgu, krawędzie z podpisem rodzaju relacji. */
  rysujGraf(wpisy) {
    wyczysc(this.graf);
    const nazwy = [];
    const klucz = (n) => normalizuj(n);
    const wgKlucza = new Map();
    for (const p of wpisy) {
      for (const n of [p.od, p.do]) {
        if (n && !wgKlucza.has(klucz(n))) {
          wgKlucza.set(klucz(n), nazwy.length);
          nazwy.push(n);
        }
      }
    }
    if (!nazwy.length) {
      this.graf.append(el("p.przygaszony", { tekst: "Brak powiązań do narysowania." }));
      return;
    }
    const R = Math.max(140, nazwy.length * 26);
    const M = 150; // margines na podpisy
    const rozmiar = 2 * (R + M);
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${rozmiar} ${rozmiar}`);
    svg.setAttribute("class", "graf-svg");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `Graf powiązań: ${nazwy.length} stron, ${wpisy.length} relacji`);
    const poz = nazwy.map((_, i) => {
      const kat = (2 * Math.PI * i) / nazwy.length - Math.PI / 2;
      return { x: R + M + R * Math.cos(kat), y: R + M + R * Math.sin(kat), kat };
    });
    const nowy = (tag, atrybuty, tekst) => {
      const w = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(atrybuty)) w.setAttribute(k, String(v));
      if (tekst !== undefined) w.textContent = tekst;
      svg.append(w);
      return w;
    };
    for (const p of wpisy) {
      const a = poz[wgKlucza.get(klucz(p.od))];
      const b = poz[wgKlucza.get(klucz(p.do))];
      if (!a || !b) continue;
      nowy("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: `graf-krawedz rodzaj-${p.rodzaj}` });
      nowy("text", { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 4, class: "graf-rodzaj", "text-anchor": "middle" }, etykieta(RODZAJE_POWIAZAN, p.rodzaj));
    }
    nazwy.forEach((n, i) => {
      const { x, y, kat } = poz[i];
      nowy("circle", { cx: x, cy: y, r: 6, class: "graf-wezel" });
      const prawo = Math.cos(kat) >= 0;
      nowy(
        "text",
        { x: x + (prawo ? 10 : -10), y: y + 4, class: "graf-nazwa", "text-anchor": Math.abs(Math.cos(kat)) < 0.2 ? "middle" : prawo ? "start" : "end" },
        n.length > 28 ? `${n.slice(0, 27)}…` : n
      );
    });
    this.graf.append(svg);
  }
}
