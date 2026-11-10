// Zakładka „Postęp”: cele i wątki drużyny ze stanem (otwarte / w toku / zamknięte).
import { STANY_POSTEPU } from "./konfiguracja.js";
import { el, opoznij, pasuje, wyczysc } from "./narzedzia.js";
import { mozeEdytowac } from "./sesja.js";
import { kartaPostepu, odNajnowszych } from "./karty.js";
import { oknoPostepu } from "./formularze.js";

export class WidokPostepu {
  constructor(kontener, opcje) {
    this.kontener = kontener;
    this.opcje = opcje; // { stan, dane }
    const { stan, dane } = opcje;
    this.przyciskNowy = el("button.przycisk.przycisk-glowny", {
      tekst: "+ NOWY CEL / WĄTEK",
      atrybuty: { type: "button" },
      zdarzenia: { click: () => oknoPostepu({ stan, dane, sesja: stan.sesja }) }
    });
    this.szukaj = el("input.pole", { atrybuty: { type: "search", placeholder: "Szukaj…", "aria-label": "Szukaj celów" } });
    this.filtr = el("select.pole", { atrybuty: { "aria-label": "Filtr: stan" } }, [
      el("option", { tekst: "Wszystkie stany", atrybuty: { value: "" } }),
      ...STANY_POSTEPU.map(([k, v]) => el("option", { tekst: v, atrybuty: { value: k } }))
    ]);
    this.szukaj.addEventListener("input", opoznij(() => this.render(), 120));
    this.filtr.addEventListener("change", () => this.render());
    this.lista = el("div.lista-wpisow");
    this.kontener.append(
      el("div.tresc-widoku", [
        el("div.widok-naglowek", [el("h2", { tekst: "▤ POSTĘP DRUŻYNY" }), this.przyciskNowy]),
        el("div.filtry", [this.szukaj, this.filtr]),
        this.lista
      ])
    );
  }

  render() {
    const { stan, dane } = this.opcje;
    this.przyciskNowy.hidden = !mozeEdytowac(stan.sesja);
    wyczysc(this.lista);
    const wpisy = stan.postep.filter((w) => (!this.filtr.value || w.stan === this.filtr.value) && pasuje(this.szukaj.value, w.tytul, w.opis, w.podpis));
    // Kolejność sekcji: najpierw to, co w toku.
    for (const klucz of ["w-toku", "otwarte", "zamkniete"]) {
      const grupa = wpisy.filter((w) => (w.stan || "otwarte") === klucz).sort(odNajnowszych);
      if (!grupa.length) continue;
      const nazwa = STANY_POSTEPU.find(([k]) => k === klucz)[1].toUpperCase();
      const s = el("section.sekcja-wpisow", [el("h3.sekcja-tytul", { tekst: `${nazwa} (${grupa.length})` })]);
      for (const w of grupa) s.append(kartaPostepu(w, { stan, dane, sesja: stan.sesja }));
      this.lista.append(s);
    }
    if (!wpisy.length) {
      this.lista.append(
        el("p.przygaszony", { tekst: !stan.wczytano.postep ? "Wczytywanie…" : stan.postep.length ? "Brak wpisów pasujących do filtrów." : "Nie ma jeszcze żadnych celów ani wątków." })
      );
    }
  }
}
