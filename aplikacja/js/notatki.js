// Zakładka „Notatki”: wszystkie notatki z filtrami i wyszukiwarką (w przeglądarce).
// Szukanie obejmuje tytuł, treść, podpis, kategorię oraz nazwę i aliasy miejsca —
// ale tylko miejsc dostępnych dla bieżącego użytkownika (bez spoilerów).
import { KATEGORIE_NOTATEK, etykieta } from "./konfiguracja.js";
import { el, opoznij, pasuje, wyczysc } from "./narzedzia.js";
import { mozeEdytowac } from "./sesja.js";
import { kartaNotatki, odNajnowszych } from "./karty.js";
import { oknoNotatki } from "./formularze.js";

export class WidokNotatek {
  constructor(kontener, opcje) {
    this.kontener = kontener;
    this.opcje = opcje; // { stan, dane, onMiejsce(id) }
    this.zbuduj();
  }

  zbuduj() {
    const { stan, dane } = this.opcje;
    this.przyciskNowa = el("button.przycisk.przycisk-glowny", {
      tekst: "+ NOWA NOTATKA",
      atrybuty: { type: "button" },
      zdarzenia: { click: () => oknoNotatki({ stan, dane, sesja: stan.sesja }) }
    });
    this.szukaj = el("input.pole", { atrybuty: { type: "search", placeholder: "Szukaj w notatkach…", "aria-label": "Szukaj w notatkach" } });
    this.miejsce = el("select.pole", { atrybuty: { "aria-label": "Filtr: miejsce" } });
    this.kategoria = el("select.pole", { atrybuty: { "aria-label": "Filtr: kategoria" } }, [
      el("option", { tekst: "Wszystkie kategorie", atrybuty: { value: "" } }),
      ...KATEGORIE_NOTATEK.map(([k, v]) => el("option", { tekst: v, atrybuty: { value: k } }))
    ]);
    this.podpis = el("select.pole", { atrybuty: { "aria-label": "Filtr: podpis" } });
    const odswiez = opoznij(() => this.renderListy(), 120);
    this.szukaj.addEventListener("input", odswiez);
    for (const s of [this.miejsce, this.kategoria, this.podpis]) s.addEventListener("change", () => this.renderListy());
    this.info = el("p.przygaszony", { atrybuty: { "aria-live": "polite" } });
    this.lista = el("div.lista-wpisow");
    this.naglowek = el("div.widok-naglowek", [el("h2", { tekst: "▤ NOTATKI" }), this.przyciskNowa]);
    this.kontener.append(
      el("div.tresc-widoku", [
        this.naglowek,
        el("div.filtry", [this.szukaj, this.miejsce, this.kategoria, this.podpis]),
        this.info,
        this.lista
      ])
    );
  }

  /** Ustawienie filtrów z zewnątrz (np. z indeksu). miejsce: "" | "ogolne" | "bez-miejsca" | id. */
  ustawFiltr({ szukaj = null, miejsce = null } = {}) {
    if (szukaj !== null) this.szukaj.value = szukaj;
    this.render();
    if (miejsce !== null) {
      this.miejsce.value = miejsce;
      this.renderListy();
    }
  }

  render() {
    const { stan } = this.opcje;
    this.przyciskNowa.hidden = !mozeEdytowac(stan.sesja);

    // Opcje filtra miejsca — tylko miejsca dostępne dla użytkownika.
    const poprzednie = this.miejsce.value;
    wyczysc(this.miejsce);
    this.miejsce.append(
      el("option", { tekst: "Wszystkie miejsca", atrybuty: { value: "" } }),
      el("option", { tekst: "Notatki ogólne (bez miejsca)", atrybuty: { value: "ogolne" } }),
      el("option", { tekst: "Bez miejsca na mapie", atrybuty: { value: "bez-miejsca" } })
    );
    for (const mapa of stan.mapyDlaUzytkownika()) {
      const grupa = el("optgroup", { atrybuty: { label: mapa.nazwa } });
      for (const e of stan.elementyDlaUzytkownika().filter((x) => x.mapa === mapa.id)) {
        grupa.append(el("option", { tekst: e.nazwa, atrybuty: { value: e.id } }));
      }
      if (grupa.children.length) this.miejsce.append(grupa);
    }
    this.miejsce.value = [...this.miejsce.options].some((o) => o.value === poprzednie) ? poprzednie : "";

    const poprzedniPodpis = this.podpis.value;
    wyczysc(this.podpis);
    this.podpis.append(el("option", { tekst: "Wszystkie podpisy", atrybuty: { value: "" } }));
    for (const p of [...new Set(stan.notatki.map((n) => n.podpis).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pl"))) {
      this.podpis.append(el("option", { tekst: p, atrybuty: { value: p } }));
    }
    this.podpis.value = [...this.podpis.options].some((o) => o.value === poprzedniPodpis) ? poprzedniPodpis : "";
    this.renderListy();
  }

  renderListy() {
    const { stan, dane, onMiejsce } = this.opcje;
    const zapytanie = this.szukaj.value;
    const filtrMiejsca = this.miejsce.value;
    const filtrKategorii = this.kategoria.value;
    const filtrPodpisu = this.podpis.value;

    const pasujace = stan.notatki
      .filter((n) => {
        const rodzaj = stan.rodzajNotatki(n);
        if (filtrMiejsca === "ogolne" && rodzaj !== "ogolna") return false;
        if (filtrMiejsca === "bez-miejsca" && rodzaj !== "bez-miejsca") return false;
        if (filtrMiejsca && !["ogolne", "bez-miejsca"].includes(filtrMiejsca) && n.elementId !== filtrMiejsca) return false;
        if (filtrKategorii && n.kategoria !== filtrKategorii) return false;
        if (filtrPodpisu && n.podpis !== filtrPodpisu) return false;
        const element = rodzaj === "miejsce" ? stan.elementyWgId.get(n.elementId) : null;
        return pasuje(
          zapytanie,
          n.tytul,
          n.tresc,
          n.podpis,
          etykieta(KATEGORIE_NOTATEK, n.kategoria),
          element ? [element.nazwa, ...(element.aliasy || [])] : []
        );
      })
      .sort(odNajnowszych);

    wyczysc(this.lista);
    this.info.textContent = stan.wczytano.notatki ? `Notatki: ${pasujace.length} z ${stan.notatki.length}` : "Wczytywanie notatek…";
    const kontekst = { stan, dane, sesja: stan.sesja, naMiejsce: onMiejsce };

    const sekcja = (tytul, wpisy, podzialNaMiejsca = false) => {
      if (!wpisy.length) return;
      const s = el("section.sekcja-wpisow", [el("h3.sekcja-tytul", { tekst: `${tytul} (${wpisy.length})` })]);
      if (podzialNaMiejsca) {
        const wgMiejsca = new Map();
        for (const n of wpisy) {
          if (!wgMiejsca.has(n.elementId)) wgMiejsca.set(n.elementId, []);
          wgMiejsca.get(n.elementId).push(n);
        }
        const kolejnosc = [...wgMiejsca.keys()].sort((a, b) =>
          stan.elementyWgId.get(a).nazwa.localeCompare(stan.elementyWgId.get(b).nazwa, "pl")
        );
        for (const id of kolejnosc) {
          const element = stan.elementyWgId.get(id);
          s.append(
            el("h4.podsekcja", [
              el("button.odnosnik", {
                tekst: `◈ ${element.nazwa}`,
                atrybuty: { type: "button", title: "Pokaż na mapie" },
                zdarzenia: { click: () => onMiejsce?.(id) }
              })
            ])
          );
          for (const n of wgMiejsca.get(id)) s.append(kartaNotatki(n, { ...kontekst, pokazMiejsce: false }));
        }
      } else {
        for (const n of wpisy) s.append(kartaNotatki(n, kontekst));
      }
      this.lista.append(s);
    };

    sekcja("NOTATKI OGÓLNE", pasujace.filter((n) => stan.rodzajNotatki(n) === "ogolna"));
    sekcja("NOTATKI PRZY MIEJSCACH", pasujace.filter((n) => stan.rodzajNotatki(n) === "miejsce"), true);
    sekcja("NOTATKI BEZ MIEJSCA NA MAPIE", pasujace.filter((n) => stan.rodzajNotatki(n) === "bez-miejsca"));
    if (!pasujace.length && stan.wczytano.notatki) {
      this.lista.append(el("p.przygaszony", { tekst: stan.notatki.length ? "Brak notatek pasujących do filtrów." : "Nie ma jeszcze żadnych notatek." }));
    }
  }
}
