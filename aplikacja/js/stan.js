// Wspólny stan strony kampanii: manifest, ustawienia admina, wpisy z bazy, sesja.
// Moduły widoków subskrybują zmiany i odświeżają się same.
import { MOTYW_DOMYSLNY, MOTYWY, ZAKLADKI_STALE } from "./konfiguracja.js";
import { jestAdminem } from "./sesja.js";

export class Stan {
  constructor({ kampania, manifest, folder }) {
    this.kampania = kampania; // wpis z kampanie.json
    this.manifest = manifest; // Iliac/kampania.json
    this.folder = folder;
    this.sesja = null;
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

  elementZaznaczony(element) {
    const wartosc = this.ustawienia?.elementy?.[element.id];
    return typeof wartosc === "boolean" ? wartosc : Boolean(element.dostepnyDomyslnie);
  }

  /** Element dostępny dla graczy: zaznaczony przez admina i na widocznej mapie. */
  elementDostepnyDlaGraczy(element) {
    const mapa = this.mapyWgId.get(element.mapa);
    return Boolean(mapa) && this.mapaWidocznaDlaGraczy(mapa) && this.elementZaznaczony(element);
  }

  /** Mapy pokazywane bieżącemu użytkownikowi jako zakładki. */
  mapyDlaUzytkownika() {
    const wszystkie = this.manifest.mapy || [];
    return this.widokAdmina() ? wszystkie : wszystkie.filter((m) => this.mapaWidocznaDlaGraczy(m));
  }

  /** Czy bieżący użytkownik może kliknąć element (gracz/gość: tylko dostępne; admin: wszystkie). */
  elementDlaUzytkownika(element) {
    return this.widokAdmina() || this.elementDostepnyDlaGraczy(element);
  }

  elementyDlaUzytkownika() {
    return (this.manifest.elementy || []).filter((e) => this.elementDlaUzytkownika(e));
  }

  kolorKampanii() {
    const k = this.ustawienia?.kolor;
    if (k && MOTYWY[k]) return k;
    return MOTYWY[this.manifest.kolor] ? this.manifest.kolor : MOTYW_DOMYSLNY;
  }

  kolorMapy(mapa) {
    const k = this.ustawienia?.mapy?.[mapa.id]?.kolor;
    if (k && MOTYWY[k]) return k;
    return MOTYWY[mapa.kolor] ? mapa.kolor : this.kolorKampanii();
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

  /** Czerwona kropka przy miejscu: są notatki, a admin zaznaczył miejsce jako dostępne. */
  elementMaKropke(element) {
    return this.elementZaznaczony(element) && this.notatki.some((n) => n.elementId === element.id);
  }
}
