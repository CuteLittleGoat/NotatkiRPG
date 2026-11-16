// Wspólny stan strony kampanii: manifest, ustawienia admina, wpisy z bazy, sesja.
// Moduły widoków subskrybują zmiany i odświeżają się same.
import { MOTYW_DOMYSLNY, MOTYW_MAPY_DOMYSLNY, MOTYWY, MOTYWY_EKRANU, ZAKLADKI_STALE } from "./konfiguracja.js";
import { jestAdminem, kampaniaWidocznaDlaGraczy } from "./sesja.js";

/** Czy wartość (np. z bazy) to nazwa motywu z listy — bez pól dziedziczonych typu „constructor”. */
function jestMotywem(lista, nazwa) {
  return typeof nazwa === "string" && Object.prototype.hasOwnProperty.call(lista, nazwa);
}

export class Stan {
  constructor({ kampania, manifest, folder }) {
    this.kampania = kampania; // wpis z kampanie.json
    this.manifest = manifest; // Iliac/kampania.json
    this.folder = folder;
    this.sesja = null;
    this.dokumentKampanii = null; // kampanie/{id} z bazy (pole „widoczna”)
    this.podgladGracza = false; // admin: „pokaż tak, jak widzi gracz”
    this.ustawienia = {};
    this.notatki = [];
    this.wczytano = { ustawienia: false, notatki: false };
    this.polaczenie = "laczenie"; // laczenie | na-zywo | pamiec | blad
    this.sluchacze = new Set();
    this.elementyWgId = new Map((manifest.elementy || []).map((e) => [e.id, e]));
    this.mapyWgId = new Map((manifest.mapy || []).map((m) => [m.id, m]));
  }

  sluchaj(funkcja) {
    this.sluchacze.add(funkcja);
    return () => this.sluchacze.delete(funkcja);
  }

  powiadom(co) {
    for (const f of this.sluchacze) {
      try {
        f(co);
      } catch (e) {
        console.error(e);
      }
    }
  }

  ustaw(co, wartosc) {
    this[co] = wartosc;
    if (co in this.wczytano) this.wczytano[co] = true;
    this.powiadom(co);
  }

  /** Czy bieżący użytkownik widzi wszystko jak admin (a nie jak gracz). */
  widokAdmina() {
    return jestAdminem(this.sesja) && !this.podgladGracza;
  }

  /** Czy gracze widzą tę kampanię na liście kampanii (i mogą ją otworzyć). */
  kampaniaWidocznaDlaGraczy() {
    return kampaniaWidocznaDlaGraczy(this.kampania, this.dokumentKampanii);
  }

  // ---- ustawienia z domyślnymi wartościami z manifestu ----

  /** Zakładka inna niż mapa (np. „notatki”): czy widoczna dla graczy. */
  zakladkaWidocznaDlaGraczy(id) {
    const wartosc = this.ustawienia?.zakladki?.[id];
    if (typeof wartosc === "boolean") return wartosc;
    const opis = ZAKLADKI_STALE.find((z) => z.id === id);
    return opis ? opis.widocznaDomyslnie !== false : true;
  }

  zakladkaDlaUzytkownika(id) {
    return this.widokAdmina() || this.zakladkaWidocznaDlaGraczy(id);
  }

  mapaWidocznaDlaGraczy(mapa) {
    const wartosc = this.ustawienia?.mapy?.[mapa.id]?.widoczna;
    return typeof wartosc === "boolean" ? wartosc : Boolean(mapa.widocznaDomyslnie);
  }

  // Miejsce ma dwa ustawienia admina (Analizy/Spoilery.md, wariant A):
  //   👁 widoczne — gracze widzą je na mapie (elementyWidoczne.{id}; domyślnie
  //      widocznyDomyslnie z manifestu, a bez tego pola — widoczne),
  //   ◈ klikalne — karta i notatki (elementy.{id}; domyślnie dostepnyDomyslnie).
  // Klikalne jest tylko miejsce widoczne — także przy niespójnych danych.

  /** Pole „klikalne” (zapisane przez admina albo domyślne z manifestu). */
  elementZaznaczony(element) {
    const wartosc = this.ustawienia?.elementy?.[element.id];
    return typeof wartosc === "boolean" ? wartosc : Boolean(element.dostepnyDomyslnie);
  }

  /** Pole „widoczne”: czy miejsce jest odkryte (narysowane na mapie graczy). */
  elementWidoczny(element) {
    const wartosc = this.ustawienia?.elementyWidoczne?.[element.id];
    return typeof wartosc === "boolean" ? wartosc : element.widocznyDomyslnie !== false;
  }

  /** Czy miejsce jest narysowane na mapie bieżącego użytkownika (admin widzi wszystkie). */
  elementWidocznyDlaUzytkownika(element) {
    if (this.widokAdmina()) return true;
    const mapa = this.mapyWgId.get(element.mapa);
    return Boolean(mapa) && this.mapaWidocznaDlaGraczy(mapa) && this.elementWidoczny(element);
  }

  /** Element dostępny dla graczy: widoczny, zaznaczony jako klikalny i na widocznej mapie. */
  elementDostepnyDlaGraczy(element) {
    const mapa = this.mapyWgId.get(element.mapa);
    return Boolean(mapa) && this.mapaWidocznaDlaGraczy(mapa) && this.elementWidoczny(element) && this.elementZaznaczony(element);
  }

  /** Mapy pokazywane bieżącemu użytkownikowi jako zakładki. */
  mapyDlaUzytkownika() {
    const wszystkie = this.manifest.mapy || [];
    return this.widokAdmina() ? wszystkie : wszystkie.filter((m) => this.mapaWidocznaDlaGraczy(m));
  }

  /** Czy bieżący użytkownik może kliknąć element (gracze: tylko dostępne; admin: wszystkie). */
  elementDlaUzytkownika(element) {
    return this.widokAdmina() || this.elementDostepnyDlaGraczy(element);
  }

  elementyDlaUzytkownika() {
    return (this.manifest.elementy || []).filter((e) => this.elementDlaUzytkownika(e));
  }

  /** Kolor interfejsu — ekranu poza mapami (bez „oryginalny”; domyślnie zielony). */
  kolorKampanii() {
    const k = this.ustawienia?.kolor;
    if (jestMotywem(MOTYWY_EKRANU, k)) return k;
    return jestMotywem(MOTYWY_EKRANU, this.manifest.kolor) ? this.manifest.kolor : MOTYW_DOMYSLNY;
  }

  /** Kolor mapy — także „oryginalny” (kolory rysunku, interfejs zielony); domyślnie „oryginalny”. */
  kolorMapy(mapa) {
    const k = this.ustawienia?.mapy?.[mapa.id]?.kolor;
    if (jestMotywem(MOTYWY, k)) return k;
    return jestMotywem(MOTYWY, mapa.kolor) ? mapa.kolor : MOTYW_MAPY_DOMYSLNY;
  }

  // ---- notatki a miejsca ----

  /**
   * Gdzie pokazać notatkę: "ogolna" (bez miejsca), "miejsce" (element dostępny
   * dla użytkownika) albo "bez-miejsca" (element zniknął z manifestu albo jest
   * dla użytkownika niedostępny).
   */
  rodzajNotatki(notatka) {
    if (!notatka.elementId) return "ogolna";
    const element = this.elementyWgId.get(notatka.elementId);
    if (element && this.elementDlaUzytkownika(element)) return "miejsce";
    return "bez-miejsca";
  }

  notatkiElementu(id) {
    return this.notatki.filter((n) => n.elementId === id);
  }

  /** Czerwona kropka przy miejscu: są notatki, a miejsce jest widoczne i klikalne dla graczy. */
  elementMaKropke(element) {
    return this.elementWidoczny(element) && this.elementZaznaczony(element) && this.notatki.some((n) => n.elementId === element.id);
  }
}
