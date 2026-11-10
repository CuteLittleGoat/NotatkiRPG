// Panel boczny miejsca: nazwa, jawny opis z manifestu, notatki o miejscu.
// Admin dodatkowo przełącza tu dostępność miejsca dla graczy.
import { el, komunikat, opisBledu, wyczysc } from "./narzedzia.js";
import { jestAdminem, mozeEdytowac } from "./sesja.js";
import { kartaNotatki, odNajnowszych } from "./karty.js";
import { oknoNotatki } from "./formularze.js";

export class PanelElementu {
  /**
   * @param {HTMLElement} kontener <aside class="panel-elementu">
   * @param {object} opcje { stan, dane, onZamknij(), onOtworzMape(mapaId), onMiejsce(id) }
   */
  constructor(kontener, opcje) {
    this.kontener = kontener;
    this.opcje = opcje;
    this.id = null;
    this.tresc = el("div.panel-tresc");
    const zamknij = el("button.przycisk-ikona", {
      tekst: "×",
      atrybuty: { type: "button", "aria-label": "Zamknij kartę miejsca" },
      zdarzenia: { click: () => this.opcje.onZamknij?.() }
    });
    this.kontener.append(el("div.panel-pasek", [el("span.ozdoba", { tekst: "+++ REKORD ODCZYTANY +++" }), zamknij]), this.tresc);
  }

  pokaz(id) {
    this.id = id;
    this.kontener.hidden = false;
    this.kontener.scrollTop = 0;
    this.render();
  }

  ukryj() {
    this.id = null;
    this.kontener.hidden = true;
    wyczysc(this.tresc);
  }

  render() {
    if (!this.id) return;
    const { stan, dane } = this.opcje;
    const element = stan.elementyWgId.get(this.id);
    // Miejsce mogło właśnie przestać być dostępne (admin odznaczył) — zamykamy kartę.
    if (!element || !stan.elementDlaUzytkownika(element)) {
      this.opcje.onZamknij?.();
      return;
    }
    const sesja = stan.sesja;
    const mapa = stan.mapyWgId.get(element.mapa);
    const kategoria = (stan.manifest.kategorie || {})[element.kategoria] || element.kategoria || "";
    wyczysc(this.tresc);

    this.tresc.append(
      el("h2.panel-nazwa", { tekst: element.nazwa }),
      el("p.panel-klasa", { tekst: [kategoria, mapa ? `mapa: ${mapa.nazwa}` : ""].filter(Boolean).join(" · ") })
    );
    if (element.aliasy && element.aliasy.length) {
      this.tresc.append(el("p.panel-klasa", { tekst: `dawniej / inaczej: ${element.aliasy.join(", ")}` }));
    }
    if (element.opis) this.tresc.append(el("p.panel-opis", { tekst: element.opis }));

    if (jestAdminem(sesja)) this.tresc.append(this.sekcjaAdmina(element, mapa));

    if (element.mapaSzczegolowa) {
      const szczegolowa = stan.mapyWgId.get(element.mapaSzczegolowa);
      if (szczegolowa && stan.mapyDlaUzytkownika().includes(szczegolowa)) {
        this.tresc.append(
          el("button.przycisk", {
            tekst: `▸ OTWÓRZ MAPĘ: ${szczegolowa.nazwa.toUpperCase()}`,
            atrybuty: { type: "button" },
            zdarzenia: { click: () => this.opcje.onOtworzMape?.(szczegolowa.id) }
          })
        );
      }
    }

    const notatki = stan.notatkiElementu(element.id).sort(odNajnowszych);
    const naglowek = el("div.panel-sekcja-naglowek", [el("h3", { tekst: `NOTATKI (${notatki.length})` })]);
    if (mozeEdytowac(sesja)) {
      naglowek.append(
        el("button.przycisk.przycisk-glowny", {
          tekst: "+ DODAJ NOTATKĘ",
          atrybuty: { type: "button" },
          zdarzenia: { click: () => oknoNotatki({ stan, dane, sesja, elementId: element.id }) }
        })
      );
    }
    this.tresc.append(naglowek);
    if (!notatki.length) {
      this.tresc.append(
        el("p.przygaszony", {
          tekst: mozeEdytowac(sesja)
            ? "Brak notatek o tym miejscu."
            : jestAdminem(sesja)
              ? "Brak notatek o tym miejscu. (Admin przegląda wpisy, nie edytuje ich.)"
              : "Brak notatek o tym miejscu. Zaloguj się jako gracz, aby dodawać notatki."
        })
      );
    }
    for (const n of notatki) {
      this.tresc.append(kartaNotatki(n, { stan, dane, sesja }));
    }
  }

  sekcjaAdmina(element, mapa) {
    const { stan, dane } = this.opcje;
    const pole = el("input.przelacznik", {
      atrybuty: { type: "checkbox", checked: stan.elementZaznaczony(element), id: "panel-dostepny" }
    });
    pole.addEventListener("change", async () => {
      pole.disabled = true;
      try {
        await dane.zapiszUstawienia({ elementy: { [element.id]: pole.checked } }, stan.sesja);
        komunikat(pole.checked ? "Miejsce dostępne dla graczy." : "Miejsce ukryte przed graczami.", "ok");
      } catch (e) {
        komunikat(opisBledu(e), "blad", 8000);
      } finally {
        pole.disabled = false;
      }
    });
    const sekcja = el("div.panel-admin", [
      el("label.przelacznik-etykieta", { atrybuty: { for: "panel-dostepny" } }, [pole, el("span", { tekst: "Dostępne dla graczy (klikalne, można robić notatki)" })])
    ]);
    if (mapa && !stan.mapaWidocznaDlaGraczy(mapa)) {
      sekcja.append(
        el("p.ostrzezenie", {
          tekst: `Zakładka „${mapa.nazwa}” jest ukryta przed graczami — nie zobaczą tego miejsca, dopóki jej nie odsłonisz (zakładka ADMIN).`
        })
      );
    }
    return sekcja;
  }
}
