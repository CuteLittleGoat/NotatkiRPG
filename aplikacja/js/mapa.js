// Przeglądarka mapy SVG: wczytanie pliku mapy, przesuwanie i przybliżanie
// (mysz, dotyk, klawiatura), stan elementów (klikalny / tło) i zaznaczenie.
//
// Rozwiązania problemów z dotykiem przejęte z wzoru (Kod_Wzoru.txt), gdzie
// zostały sprawdzone na tabletach:
//  * touch-action:none na kontenerze HTML, nie tylko na SVG — inaczej przeglądarka
//    uznaje gest za przewijanie i przerywa go zdarzeniem pointercancel;
//  * wskaźnik przechwytujemy dopiero po przekroczeniu progu ruchu — przechwycenie
//    przy pointerdown przekierowałoby kliknięcie i elementy przestałyby reagować;
//  * rejestr palców czyszczony, gdy pojawi się „duch” (zgubione pointerup);
//  * gest przeliczany najwyżej raz na klatkę (requestAnimationFrame);
//  * po szczypaniu ruch pozostałego palca liczony od jego bieżącego położenia;
//  * pointerup/pointercancel nasłuchiwane na oknie;
//  * lostpointercapture brany pod uwagę tylko z samego kontenera;
//  * pomiar kontenera odporny na zerowe wymiary (inaczej viewBox = „NaN NaN …”);
//  * napisy znikają na czas szczypania (to był główny koszt klatki);
//  * ResizeObserver zamiast zdarzenia resize.

const NS = "http://www.w3.org/2000/svg";
const PX_MIN = 0.8; // px na jednostkę mapy — poniżej podpisy są nieczytelne; wtedy start przybliżony
const PX_MAX_START = 1.0; // …ale bez przesady: przy starcie najwyżej 1 px na jednostkę
const ZOOM_MAX = 6; // największe przybliżenie względem całej mapy…
const ZOOM_OD_DOMYSLNEGO = 3; // …ale co najmniej 3× od widoku startowego
const PROG = 5; // px — od tylu zaczyna się przeciąganie (mniej = stuknięcie)
const MIN_STREFA = 30; // jednostki mapy — minimalny rozmiar strefy kliknięcia

export class PrzegladarkaMapy {
  /**
   * @param {HTMLElement} kontener element .plansza (touch-action: none)
   * @param {object} opcje { nazwa, start: {x,y}, onWybor(id), onTlo() }
   */
  constructor(kontener, opcje = {}) {
    this.kontener = kontener;
    this.opcje = opcje;
    this.svg = null;
    this.elementy = new Map();
    this.srodki = new Map();
    this.stany = new Map();
    this.wybrany = null;
    this.dekoracjeGotowe = false;
    this.vb = { x: 0, y: 0, w: 1, h: 1 };
    this.skala = null;
    // Czy użytkownik sam zmienił kadr (przesunął, przybliżył). Dopóki nie — po zmianie
    // rozmiaru planszy liczymy od nowa widok startowy zamiast zachowywać skalę.
    this.uzytkownikZmienil = false;
    this.gest = { wskazniki: new Map(), ciagniemy: false, ciagniete: false, ostatni: null, start: null, rozstaw: 0, srodek: null, klatka: 0, przechwycony: null };
    this.ratujemy = false;
  }

  // ------------------------------------------------------------------ wczytanie

  async wczytaj(adres) {
    const odp = await fetch(adres, { cache: "no-cache" });
    if (!odp.ok) throw new Error(`Nie udało się wczytać mapy (${odp.status}).`);
    const tekst = await odp.text();
    const dok = new DOMParser().parseFromString(tekst, "image/svg+xml");
    const korzen = dok.documentElement;
    if (!korzen || korzen.localName !== "svg" || dok.getElementsByTagName("parsererror").length) {
      throw new Error("Plik mapy jest uszkodzony.");
    }
    oczysc(korzen);
    const svg = document.importNode(korzen, true);
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.setAttribute("role", "group");
    svg.setAttribute("aria-label", `Mapa: ${this.opcje.nazwa || ""}`.trim());
    const vb = (svg.getAttribute("viewBox") || "0 0 1000 1000").split(/[\s,]+/).map(Number);
    [this.X0, this.Y0, this.SZER, this.WYS] = vb.length === 4 && vb.every(Number.isFinite) ? vb : [0, 0, 1000, 1000];
    this.vb = { x: this.X0, y: this.Y0, w: this.SZER, h: this.WYS };
    this.kontener.append(svg);
    this.svg = svg;
    for (const g of svg.querySelectorAll("[data-element]")) {
      g.classList.add("el");
      this.elementy.set(g.getAttribute("data-element"), g);
    }
    this.podepnijZdarzenia();
    this.domierz();
    return this;
  }

  /** Wywoływane, gdy zakładka z mapą stała się widoczna. */
  pokazano() {
    this.domierz();
    if (!this.dekoracjeGotowe && this.wymiary()) {
      const gotowe = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
      gotowe.then(() => {
        if (this.wymiary()) this.przygotujDekoracje();
      });
    }
  }

  // ---------------------------------------------------------- strefy i narożniki

  /**
   * Dla każdego elementu: przezroczyste strefy kliknięcia (grube linie, prostokąty
   * pod podpisami, minimalny rozmiar małych elementów) i narożniki wokół podpisu.
   * Wymaga wyrenderowanej mapy (getBBox), dlatego robimy to po pokazaniu zakładki.
   */
  przygotujDekoracje() {
    if (!this.svg) return;
    for (const [id, g] of this.elementy) {
      g.querySelectorAll(".el-dekor").forEach((n) => n.remove());
      const warstwaStref = document.createElementNS(NS, "g");
      warstwaStref.setAttribute("class", "el-dekor el-strefy");
      const warstwaNaroznikow = document.createElementNS(NS, "g");
      warstwaNaroznikow.setAttribute("class", "el-dekor el-narozniki");

      for (const k of g.querySelectorAll("path, line, polyline, polygon, rect, circle, ellipse")) {
        const styl = getComputedStyle(k);
        if (styl.fill === "none" && styl.stroke !== "none") {
          const kopia = k.cloneNode(false);
          for (const a of ["class", "id", "opacity", "stroke-dasharray", "marker-start", "marker-end"]) kopia.removeAttribute(a);
          kopia.setAttribute("class", "el-strefa-linia");
          warstwaStref.append(kopia);
        }
      }

      const teksty = [...g.querySelectorAll("text")];
      const rozmiar = (t) => parseFloat(getComputedStyle(t).fontSize) || 0;
      const najwiekszy = Math.max(0, ...teksty.map(rozmiar));
      let srodek = null;
      for (const t of teksty) {
        let b;
        try {
          b = t.getBBox();
        } catch {
          continue;
        }
        if (!b || !b.width) continue;
        const transform = t.getAttribute("transform");
        const strefa = prostokat(b.x - 4, b.y - 3, b.width + 8, b.height + 6, "el-strefa");
        if (transform) strefa.setAttribute("transform", transform);
        warstwaStref.append(strefa);
        if (rozmiar(t) >= najwiekszy - 0.01) {
          const naroznik = document.createElementNS(NS, "path");
          naroznik.setAttribute("d", sciezkaNaroznikow(b.x - 4, b.y - 3, b.width + 8, b.height + 6));
          naroznik.setAttribute("class", "el-naroznik");
          if (transform) naroznik.setAttribute("transform", transform);
          warstwaNaroznikow.append(naroznik);
          if (!srodek) {
            const p = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
            const m = t.transform && t.transform.baseVal.consolidate();
            srodek = m ? new DOMPoint(p.x, p.y).matrixTransform(m.matrix) : p;
            // Czerwona kropka „są notatki” — prawy górny róg złotej ramki głównego podpisu.
            warstwaNaroznikow.append(kropka(b.x + b.width + 4, b.y - 3, transform));
          }
        }
      }

      let calosc = null;
      try {
        calosc = g.getBBox();
      } catch {
        calosc = null;
      }
      if (calosc && (calosc.width < MIN_STREFA || calosc.height < MIN_STREFA)) {
        const w = Math.max(MIN_STREFA, calosc.width + 8);
        const h = Math.max(MIN_STREFA, calosc.height + 8);
        warstwaStref.append(prostokat(calosc.x + calosc.width / 2 - w / 2, calosc.y + calosc.height / 2 - h / 2, w, h, "el-strefa"));
      }
      if (!srodek && calosc) {
        srodek = { x: calosc.x + calosc.width / 2, y: calosc.y + calosc.height / 2 };
        warstwaNaroznikow.append(kropka(calosc.x + calosc.width, calosc.y, null));
      }
      if (srodek) this.srodki.set(id, srodek);

      g.insertBefore(warstwaStref, g.firstChild);
      g.append(warstwaNaroznikow);
    }
    this.dekoracjeGotowe = true;
  }

  // ------------------------------------------------------------- stan elementów

  /**
   * @param {Map<string, {klikalny: boolean, ukryty: boolean, kropka: boolean, nazwa: string}>} stany
   * Elementy bez wpisu (np. spoza manifestu) są zwykłym tłem.
   */
  ustawStany(stany) {
    this.stany = stany;
    for (const [id, g] of this.elementy) {
      const s = stany.get(id);
      const klikalny = Boolean(s && s.klikalny);
      g.classList.toggle("el-dostepny", klikalny);
      g.classList.toggle("el-ukryty", Boolean(s && s.klikalny && s.ukryty));
      g.classList.toggle("el-ma-notatki", Boolean(s && s.klikalny && s.kropka));
      if (klikalny) {
        g.setAttribute("tabindex", "0");
        g.setAttribute("role", "button");
        g.setAttribute("aria-label", s.ukryty ? `${s.nazwa} (ukryte przed graczami)` : s.nazwa);
      } else {
        g.removeAttribute("tabindex");
        g.removeAttribute("role");
        g.removeAttribute("aria-label");
        if (this.wybrany === id) this.odznacz();
      }
    }
  }

  wybierz(id, { przesun = true } = {}) {
    const g = this.elementy.get(id);
    if (!g) return;
    this.odznacz();
    this.wybrany = id;
    g.classList.add("wybrany");
    if (przesun) {
      const s = this.srodki.get(id);
      if (s) this.pokazPunkt(s.x, s.y);
    }
  }

  odznacz() {
    if (this.wybrany && this.elementy.get(this.wybrany)) this.elementy.get(this.wybrany).classList.remove("wybrany");
    this.wybrany = null;
  }

  fokus(id) {
    const g = this.elementy.get(id);
    if (g && g.getAttribute("tabindex") === "0") g.focus({ preventScroll: true });
  }

  // ------------------------------------------------------------------ kadr

  wymiary() {
    const r = this.kontener.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? r : null;
  }

  poprawny(v) {
    return [v.x, v.y, v.w, v.h].every(Number.isFinite) && v.w > 0 && v.h > 0;
  }

  zastosuj() {
    if (!this.svg) return;
    if (!this.poprawny(this.vb)) {
      if (this.ratujemy) return;
      this.ratujemy = true;
      try {
        this.widokDomyslny();
      } finally {
        this.ratujemy = false;
      }
      return;
    }
    const { x, y, w, h } = this.vb;
    this.svg.setAttribute("viewBox", `${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`);
  }

  zapamietajSkale(r) {
    r = r || this.wymiary();
    if (r && this.poprawny(this.vb)) this.skala = this.vb.w / r.width;
  }

  /** Szerokość kadru, przy której widać całą mapę (także w pionie). */
  dopasowanie(r) {
    return Math.max(this.SZER, this.WYS * (r.width / r.height));
  }

  /**
   * Skala widoku startowego (px na jednostkę mapy). Cała mapa, jeśli podpisy są
   * wtedy czytelne; inaczej (telefon, tablet w pionie) przybliżenie w stronę
   * wypełnienia ekranu, z punktem startowym z manifestu na środku.
   */
  skalaStartowa(r) {
    const zawiera = Math.min(r.width / this.SZER, r.height / this.WYS);
    if (zawiera >= PX_MIN) return zawiera;
    const pokrywa = Math.max(r.width / this.SZER, r.height / this.WYS);
    return Math.max(PX_MIN, Math.min(pokrywa, PX_MAX_START));
  }

  ogranicz() {
    const r = this.wymiary();
    if (!r) return;
    const maxW = this.dopasowanie(r);
    const startW = Math.min(maxW, r.width / this.skalaStartowa(r));
    const minW = Math.min(this.SZER / ZOOM_MAX, startW / ZOOM_OD_DOMYSLNEGO);
    const vb = this.vb;
    vb.w = Math.max(minW, Math.min(maxW, vb.w));
    vb.h = vb.w * (r.height / r.width);
    // Wolno wyjechać najwyżej pół kadru poza mapę.
    vb.x = Math.max(this.X0 - vb.w / 2, Math.min(this.X0 + this.SZER - vb.w / 2, vb.x));
    vb.y = Math.max(this.Y0 - vb.h / 2, Math.min(this.Y0 + this.WYS - vb.h / 2, vb.y));
  }

  widokDomyslny() {
    const r = this.wymiary();
    if (!r || !this.svg) return;
    const pelna = this.dopasowanie(r);
    const vb = this.vb;
    vb.w = Math.min(pelna, r.width / this.skalaStartowa(r));
    vb.h = vb.w * (r.height / r.width);
    if (vb.w >= pelna - 0.5) {
      vb.x = this.X0 + (this.SZER - vb.w) / 2;
      vb.y = this.Y0 + (this.WYS - vb.h) / 2;
    } else {
      // Za wąsko na całość — otwieramy przybliżeni na punkt startowy z manifestu.
      const s = this.opcje.start || { x: this.X0 + this.SZER / 2, y: this.Y0 + this.WYS / 2 };
      vb.x = s.x - vb.w / 2;
      vb.y = s.y - vb.h / 2;
    }
    this.ogranicz();
    this.zastosuj();
    this.zapamietajSkale(r);
    this.uzytkownikZmienil = false;
  }

  /** Po zmianie rozmiaru kontenera zachowujemy skalę i środek kadru. */
  przelicz() {
    const r = this.wymiary();
    if (!r || !this.svg) return;
    if (this.skala === null || !this.poprawny(this.vb) || !this.uzytkownikZmienil) {
      this.widokDomyslny();
      return;
    }
    const vb = this.vb;
    const sx = vb.x + vb.w / 2;
    const sy = vb.y + vb.h / 2;
    vb.w = this.skala * r.width;
    vb.h = vb.w * (r.height / r.width);
    vb.x = sx - vb.w / 2;
    vb.y = sy - vb.h / 2;
    this.ogranicz();
    vb.x = sx - vb.w / 2;
    vb.y = sy - vb.h / 2;
    this.ogranicz();
    this.zastosuj();
    this.zapamietajSkale(r);
  }

  domierz() {
    if (this.skala === null || !this.poprawny(this.vb)) this.widokDomyslny();
    else this.przelicz();
  }

  naMape(kx, ky) {
    const r = this.wymiary();
    if (!r) return null;
    return { x: this.vb.x + ((kx - r.left) / r.width) * this.vb.w, y: this.vb.y + ((ky - r.top) / r.height) * this.vb.h };
  }

  przyblizWokol(mnoznik, kx, ky) {
    const r = this.wymiary();
    if (!r) return;
    const p = this.naMape(kx, ky);
    if (!p) return;
    this.uzytkownikZmienil = true;
    const przed = this.vb.w;
    this.vb.w *= mnoznik;
    this.ogranicz();
    const k = this.vb.w / przed;
    this.vb.x = p.x - (p.x - this.vb.x) * k;
    this.vb.y = p.y - (p.y - this.vb.y) * k;
    this.ogranicz();
    this.zastosuj();
    this.zapamietajSkale(r);
  }

  przybliz() {
    const r = this.wymiary();
    if (r) this.przyblizWokol(1 / 1.3, r.left + r.width / 2, r.top + r.height / 2);
  }

  oddal() {
    const r = this.wymiary();
    if (r) this.przyblizWokol(1.3, r.left + r.width / 2, r.top + r.height / 2);
  }

  /** Przesuwa kadr tak, żeby punkt był widoczny (z marginesem). */
  pokazPunkt(x, y) {
    this.uzytkownikZmienil = true;
    const vb = this.vb;
    const m = Math.min(80, vb.w / 4);
    if (x < vb.x + m) vb.x = x - m;
    else if (x > vb.x + vb.w - m) vb.x = x - vb.w + m;
    if (y < vb.y + m) vb.y = y - m;
    else if (y > vb.y + vb.h - m) vb.y = y - vb.h + m;
    this.ogranicz();
    this.zastosuj();
  }

  przesun(dx, dy) {
    this.uzytkownikZmienil = true;
    this.vb.x += dx;
    this.vb.y += dy;
    this.ogranicz();
    this.zastosuj();
  }

  // ------------------------------------------------------------------ zdarzenia

  podepnijZdarzenia() {
    if (this.podpiete) return;
    this.podpiete = true;
    const k = this.kontener;
    const gest = this.gest;

    const liczba = () => gest.wskazniki.size;
    const zerujGest = () => {
      if (gest.klatka) cancelAnimationFrame(gest.klatka);
      gest.klatka = 0;
      gest.wskazniki.clear();
      gest.ciagniemy = false;
      gest.ciagniete = false;
      gest.ostatni = null;
      gest.start = null;
      gest.rozstaw = 0;
      gest.srodek = null;
      k.classList.remove("ciagniemy", "szczypiemy");
      if (gest.przechwycony !== null) {
        try {
          k.releasePointerCapture(gest.przechwycony);
        } catch {
          /* już zwolniony */
        }
      }
      gest.przechwycony = null;
    };
    this.zerujGest = zerujGest;

    const klatkaGestu = () => {
      gest.klatka = 0;
      const r = this.wymiary();
      if (!r) return;
      const n = liczba();
      if (n === 2 && gest.rozstaw > 0) {
        const [a, b] = [...gest.wskazniki.values()];
        const nowy = Math.hypot(a.x - b.x, a.y - b.y);
        if (nowy > 0) {
          // Punkt mapy spod poprzedniego środka między palcami trafia pod nowy środek.
          const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          if (!gest.srodek) gest.srodek = m;
          const P = {
            x: this.vb.x + ((gest.srodek.x - r.left) / r.width) * this.vb.w,
            y: this.vb.y + ((gest.srodek.y - r.top) / r.height) * this.vb.h
          };
          this.uzytkownikZmienil = true;
          this.vb.w *= gest.rozstaw / nowy;
          this.ogranicz();
          this.vb.x = P.x - ((m.x - r.left) / r.width) * this.vb.w;
          this.vb.y = P.y - ((m.y - r.top) / r.height) * this.vb.h;
          this.ogranicz();
          this.zastosuj();
          this.zapamietajSkale(r);
          gest.rozstaw = nowy;
          gest.srodek = m;
        }
        return;
      }
      if (n === 1 && gest.ciagniemy && gest.ciagniete) {
        const q = [...gest.wskazniki.values()][0];
        const dx = ((q.x - gest.ostatni.x) / r.width) * this.vb.w;
        const dy = ((q.y - gest.ostatni.y) / r.height) * this.vb.h;
        gest.ostatni = { x: q.x, y: q.y };
        this.przesun(-dx, -dy);
      }
    };
    const zamowKlatke = () => {
      if (!gest.klatka) gest.klatka = requestAnimationFrame(klatkaGestu);
    };
    const doliczZalegla = () => {
      if (gest.klatka) {
        cancelAnimationFrame(gest.klatka);
        klatkaGestu();
      }
    };

    k.addEventListener("pointerdown", (ev) => {
      if (ev.pointerType === "mouse" && ev.button !== 0) return;
      // Trzeci wskaźnik = w rejestrze siedzi „duch”. Zaczynamy gest od nowa.
      if (liczba() >= 2 && !gest.wskazniki.has(ev.pointerId)) zerujGest();
      doliczZalegla();
      gest.wskazniki.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (liczba() === 1) {
        gest.ciagniemy = true;
        gest.ciagniete = false;
        gest.start = { x: ev.clientX, y: ev.clientY };
        gest.ostatni = { x: ev.clientX, y: ev.clientY };
      } else if (liczba() === 2) {
        const [a, b] = [...gest.wskazniki.values()];
        gest.rozstaw = Math.hypot(a.x - b.x, a.y - b.y);
        gest.srodek = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      }
    });

    k.addEventListener("pointermove", (ev) => {
      if (!gest.wskazniki.has(ev.pointerId)) return;
      gest.wskazniki.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      const n = liczba();
      if (n === 2 && gest.rozstaw > 0) {
        gest.ciagniete = true;
        k.classList.add("szczypiemy");
        zamowKlatke();
        return;
      }
      if (!gest.ciagniemy || n !== 1) return;
      if (!gest.ciagniete) {
        if (Math.abs(ev.clientX - gest.start.x) + Math.abs(ev.clientY - gest.start.y) < PROG) return;
        gest.ciagniete = true;
        k.classList.add("ciagniemy");
        try {
          k.setPointerCapture(ev.pointerId);
          gest.przechwycony = ev.pointerId;
        } catch {
          gest.przechwycony = null;
        }
      }
      zamowKlatke();
    });

    const koniec = (ev) => {
      if (!gest.wskazniki.has(ev.pointerId)) return;
      doliczZalegla();
      gest.wskazniki.delete(ev.pointerId);
      if (liczba() < 2) {
        gest.rozstaw = 0;
        gest.srodek = null;
        k.classList.remove("szczypiemy");
      }
      if (liczba() === 1) {
        const q = [...gest.wskazniki.values()][0];
        gest.ostatni = { x: q.x, y: q.y };
      }
      if (liczba() === 0) {
        gest.ciagniemy = false;
        k.classList.remove("ciagniemy");
        if (gest.przechwycony !== null) {
          try {
            k.releasePointerCapture(gest.przechwycony);
          } catch {
            /* już zwolniony */
          }
          gest.przechwycony = null;
        }
        // Znacznik przeciągania kasujemy PO zdarzeniu click.
        setTimeout(() => {
          gest.ciagniete = false;
        }, 0);
      }
    };
    window.addEventListener("pointerup", koniec);
    window.addEventListener("pointercancel", koniec);
    k.addEventListener("lostpointercapture", (ev) => {
      if (ev.target === k) koniec(ev);
    });

    k.addEventListener(
      "wheel",
      (ev) => {
        ev.preventDefault();
        const mnoznik = ev.deltaY > 0 ? 1.16 : 1 / 1.16;
        this.przyblizWokol(mnoznik, ev.clientX, ev.clientY);
      },
      { passive: false }
    );

    k.addEventListener("click", (ev) => {
      if (gest.ciagniete) return;
      const g = ev.target.closest && ev.target.closest(".el-dostepny");
      if (g && k.contains(g)) {
        ev.stopPropagation();
        this.opcje.onWybor?.(g.getAttribute("data-element"));
      } else {
        this.opcje.onTlo?.();
      }
    });

    k.addEventListener("dblclick", (ev) => {
      if (ev.target.closest && ev.target.closest(".el-dostepny")) return;
      ev.preventDefault();
      this.widokDomyslny();
    });

    k.addEventListener("keydown", (ev) => {
      const g = ev.target.closest && ev.target.closest(".el-dostepny");
      if (g && (ev.key === "Enter" || ev.key === " " || ev.key === "Spacebar")) {
        ev.preventDefault();
        this.opcje.onWybor?.(g.getAttribute("data-element"));
        return;
      }
      if (ev.key === "Home") {
        this.widokDomyslny();
        ev.preventDefault();
        return;
      }
      const krok = this.vb.w * 0.12;
      if (ev.key === "+" || ev.key === "=") this.przybliz();
      else if (ev.key === "-" || ev.key === "_") this.oddal();
      else if (ev.key === "ArrowLeft") this.przesun(-krok, 0);
      else if (ev.key === "ArrowRight") this.przesun(krok, 0);
      else if (ev.key === "ArrowUp") this.przesun(0, -krok);
      else if (ev.key === "ArrowDown") this.przesun(0, krok);
      else return;
      ev.preventDefault();
    });

    k.addEventListener("focusin", (ev) => {
      const g = ev.target.closest && ev.target.closest(".el-dostepny");
      if (!g) return;
      const s = this.srodki.get(g.getAttribute("data-element"));
      if (s) this.pokazPunkt(s.x, s.y);
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) zerujGest();
      else this.domierz();
    });
    window.addEventListener("blur", zerujGest);

    let czekaj = null;
    const nadzoruj = () => {
      clearTimeout(czekaj);
      czekaj = setTimeout(() => this.przelicz(), 120);
    };
    if (window.ResizeObserver) new ResizeObserver(nadzoruj).observe(k);
    else window.addEventListener("resize", nadzoruj);
  }
}

// ---------------------------------------------------------------- pomocnicze

/** Usuwa z pliku mapy wszystko, co mogłoby uruchomić kod albo pobrać coś z zewnątrz. */
function oczysc(korzen) {
  for (const n of [...korzen.querySelectorAll("script, foreignObject, iframe, object, embed")]) n.remove();
  for (const n of [korzen, ...korzen.querySelectorAll("*")]) {
    for (const a of [...n.attributes]) {
      const nazwa = a.name.toLowerCase();
      const wartosc = a.value.trim().toLowerCase();
      if (nazwa.startsWith("on")) n.removeAttribute(a.name);
      else if ((nazwa === "href" || nazwa === "xlink:href") && !wartosc.startsWith("#")) n.removeAttribute(a.name);
    }
  }
}

function prostokat(x, y, w, h, klasa) {
  const r = document.createElementNS(NS, "rect");
  r.setAttribute("x", x.toFixed(1));
  r.setAttribute("y", y.toFixed(1));
  r.setAttribute("width", w.toFixed(1));
  r.setAttribute("height", h.toFixed(1));
  r.setAttribute("class", klasa);
  return r;
}

function kropka(x, y, transform) {
  const c = document.createElementNS(NS, "circle");
  c.setAttribute("cx", x.toFixed(1));
  c.setAttribute("cy", y.toFixed(1));
  c.setAttribute("r", "4.5");
  c.setAttribute("class", "el-kropka");
  if (transform) c.setAttribute("transform", transform);
  return c;
}

function sciezkaNaroznikow(x, y, w, h) {
  const a = Math.max(4, Math.min(9, Math.min(w, h) * 0.45));
  const p = (v) => v.toFixed(1);
  const x2 = x + w;
  const y2 = y + h;
  return [
    `M${p(x)} ${p(y + a)}V${p(y)}H${p(x + a)}`,
    `M${p(x2 - a)} ${p(y)}H${p(x2)}V${p(y + a)}`,
    `M${p(x2)} ${p(y2 - a)}V${p(y2)}H${p(x2 - a)}`,
    `M${p(x + a)} ${p(y2)}H${p(x)}V${p(y2 - a)}`
  ].join("");
}
