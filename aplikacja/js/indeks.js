// Indeks z boku mapy: lista miejsc z wyszukiwarką.
// Gracz i gość widzą tylko miejsca dostępne (zaznaczone przez admina, na widocznej
// zakładce). Admin widzi wszystko i przy każdym miejscu ma pole „dostępne dla graczy”.
import { el, komunikat, normalizuj, opisBledu, opoznij, pasuje, wyczysc } from "./narzedzia.js";

export class Indeks {
  /**
   * @param {HTMLElement} kontener <nav class="indeks">
   * @param {object} opcje { stan, dane, onPokaz(id), onZamknij(), onSzukajWNotatkach(tekst) }
   */
  constructor(kontener, opcje) {
    this.kontener = kontener;
    this.opcje = opcje;
    this.oczekujace = new Map(); // id miejsca → wartość zapisywana właśnie do bazy
    this.oczekujaceMapy = new Map(); // id mapy → widoczność zapisywana właśnie do bazy
    this.zbuduj();
  }

  zbuduj() {
    const zamknij = el("button.przycisk-ikona.indeks-zamknij", {
      tekst: "×",
      atrybuty: { type: "button", "aria-label": "Zamknij indeks" },
      zdarzenia: { click: () => this.opcje.onZamknij?.() }
    });
    this.pole = el("input.pole.indeks-szukaj", {
      atrybuty: { type: "search", placeholder: "Szukaj miejsca lub notatki…", "aria-label": "Szukaj w indeksie", autocomplete: "off" }
    });
    this.pole.addEventListener("input", opoznij(() => this.render(), 120));
    this.info = el("p.indeks-info.przygaszony", { atrybuty: { "aria-live": "polite" } });
    this.lista = el("div.indeks-lista");
    this.kontener.append(
      el("div.indeks-pasek", [el("span.ozdoba", { tekst: "+++ INDEKS +++" }), zamknij]),
      el("div.indeks-szukajka", [this.pole]),
      this.info,
      this.lista
    );
  }

  fokus() {
    this.pole.focus();
  }

  render() {
    const { stan } = this.opcje;
    const admin = stan.widokAdmina();
    const zapytanie = this.pole.value;
    wyczysc(this.lista);
    let ile = 0;
    const kategorie = stan.manifest.kategorie || {};
    const kolejnoscKategorii = Object.keys(kategorie);

    for (const mapa of stan.mapyDlaUzytkownika()) {
      const elementy = (stan.manifest.elementy || [])
        .filter((e) => e.mapa === mapa.id && stan.elementDlaUzytkownika(e))
        .filter((e) => this.pasujeElement(e, zapytanie));
      if (!elementy.length && zapytanie) continue;
      const sekcja = el("section.indeks-mapa", { atrybuty: { "aria-label": `Mapa ${mapa.nazwa}` } }, [
        el("h3.indeks-naglowek", { tekst: `◈ ${mapa.nazwa.toUpperCase()}` })
      ]);
      if (admin) sekcja.append(this.przelacznikMapy(mapa));
      if (!elementy.length) sekcja.append(el("p.przygaszony.indeks-pusto", { tekst: "Brak dostępnych miejsc." }));

      const grupy = new Map();
      for (const e of elementy) {
        const k = e.kategoria || "inne";
        if (!grupy.has(k)) grupy.set(k, []);
        grupy.get(k).push(e);
      }
      const klucze = [...grupy.keys()].sort((a, b) => {
        const ia = kolejnoscKategorii.indexOf(a);
        const ib = kolejnoscKategorii.indexOf(b);
        return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
      });
      for (const k of klucze) {
        sekcja.append(el("h4.indeks-kategoria", { tekst: kategorie[k] || k }));
        const ul = el("ul.indeks-pozycje");
        for (const e of grupy.get(k).sort((a, b) => a.nazwa.localeCompare(b.nazwa, "pl"))) {
          ul.append(this.pozycja(e, admin));
          ile++;
        }
        sekcja.append(ul);
      }
      this.lista.append(sekcja);
    }

    const ogolne = stan.notatki.filter((n) => stan.rodzajNotatki(n) === "ogolna").length;
    const bezMiejsca = stan.notatki.filter((n) => stan.rodzajNotatki(n) === "bez-miejsca").length;
    const stopka = el("section.indeks-mapa", [el("h3.indeks-naglowek", { tekst: "▤ NOTATKI" })]);
    stopka.append(
      el("button.indeks-pozycja", {
        atrybuty: { type: "button" },
        zdarzenia: { click: () => this.opcje.onSzukajWNotatkach?.(zapytanie, "ogolne") }
      }, [el("span.indeks-nazwa", { tekst: "Notatki ogólne" }), el("span.licznik", { tekst: String(ogolne) })])
    );
    if (bezMiejsca) {
      stopka.append(
        el("button.indeks-pozycja", {
          atrybuty: { type: "button" },
          zdarzenia: { click: () => this.opcje.onSzukajWNotatkach?.(zapytanie, "bez-miejsca") }
        }, [el("span.indeks-nazwa", { tekst: "Bez miejsca na mapie" }), el("span.licznik", { tekst: String(bezMiejsca) })])
      );
    }
    if (zapytanie.trim()) {
      stopka.append(
        el("button.indeks-pozycja", {
          atrybuty: { type: "button" },
          zdarzenia: { click: () => this.opcje.onSzukajWNotatkach?.(zapytanie, "") }
        }, [el("span.indeks-nazwa", { tekst: `Szukaj „${zapytanie.trim()}” we wszystkich notatkach →` })])
      );
    }
    this.lista.append(stopka);

    const mapy = stan.mapyDlaUzytkownika().length;
    if (!mapy) this.info.textContent = "Żadna mapa nie jest jeszcze udostępniona.";
    else if (zapytanie.trim()) this.info.textContent = `Znalezione miejsca: ${ile}`;
    else this.info.textContent = admin ? "Widok admina: wszystkie miejsca. ☑ = dostępne dla graczy." : `Dostępne miejsca: ${ile}`;
  }

  pasujeElement(e, zapytanie) {
    if (!normalizuj(zapytanie)) return true;
    const { stan } = this.opcje;
    const notatki = stan.notatkiElementu(e.id).flatMap((n) => [n.tytul, n.tresc, n.podpis]);
    const kategoria = (stan.manifest.kategorie || {})[e.kategoria];
    return pasuje(zapytanie, e.nazwa, e.aliasy || [], e.opis, kategoria, notatki);
  }

  pozycja(e, admin) {
    const { stan } = this.opcje;
    const liczbaNotatek = stan.notatkiElementu(e.id).length;
    const przycisk = el("button.indeks-pozycja", {
      atrybuty: { type: "button" },
      dane: { element: e.id },
      zdarzenia: { click: () => this.opcje.onPokaz?.(e.id) }
    }, [el("span.indeks-nazwa", { tekst: e.nazwa }), liczbaNotatek ? el("span.licznik", { tekst: String(liczbaNotatek), atrybuty: { title: "Liczba notatek" } }) : null]);
    if (!admin) return el("li", [przycisk]);

    const zaznaczony = this.oczekujace.has(e.id) ? this.oczekujace.get(e.id) : stan.elementZaznaczony(e);
    const pole = el("input.przelacznik", {
      atrybuty: {
        type: "checkbox",
        checked: zaznaczony,
        title: "Dostępne dla graczy",
        "aria-label": `Dostępne dla graczy: ${e.nazwa}`
      }
    });
    pole.addEventListener("change", () => this.przelacz(e, pole.checked));
    const li = el("li.indeks-admin", { klasa: zaznaczony ? "" : "pozycja-ukryta" }, [pole, przycisk]);
    return li;
  }

  /** Admin: pole „zakładka widoczna dla graczy” pod nazwą mapy. */
  przelacznikMapy(mapa) {
    const { stan } = this.opcje;
    const widoczna = this.oczekujaceMapy.has(mapa.id) ? this.oczekujaceMapy.get(mapa.id) : stan.mapaWidocznaDlaGraczy(mapa);
    const pole = el("input.przelacznik", {
      atrybuty: { type: "checkbox", checked: widoczna, "aria-label": `Zakładka ${mapa.nazwa} widoczna dla graczy` }
    });
    pole.addEventListener("change", () => this.przelaczMape(mapa, pole.checked));
    return el("label.przelacznik-etykieta.indeks-zakladka", { klasa: widoczna ? "" : "pozycja-ukryta" }, [
      pole,
      el("span", { tekst: widoczna ? "zakładka widoczna dla graczy" : "zakładka ukryta przed graczami" })
    ]);
  }

  async przelaczMape(mapa, wartosc) {
    const { dane, stan } = this.opcje;
    this.oczekujaceMapy.set(mapa.id, wartosc);
    try {
      await dane.zapiszUstawienia({ mapy: { [mapa.id]: { widoczna: wartosc } } }, stan.sesja);
      komunikat(wartosc ? `Zakładka „${mapa.nazwa}” widoczna dla graczy.` : `Zakładka „${mapa.nazwa}” ukryta przed graczami.`, "ok");
    } catch (e) {
      komunikat(opisBledu(e), "blad", 8000);
    } finally {
      this.oczekujaceMapy.delete(mapa.id);
      this.render();
    }
  }

  async przelacz(element, wartosc) {
    const { dane, stan } = this.opcje;
    this.oczekujace.set(element.id, wartosc);
    try {
      await dane.zapiszUstawienia({ elementy: { [element.id]: wartosc } }, stan.sesja);
    } catch (e) {
      komunikat(opisBledu(e), "blad", 8000);
    } finally {
      this.oczekujace.delete(element.id);
      this.render();
    }
  }
}
