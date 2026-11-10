// Zakładka „Admin”: widoczność kampanii i zakładek, dostępność miejsc dla graczy,
// kolory ekranu, kopia zapasowa i przywracanie bazy, LOG komunikatów.
// Admin NIE edytuje wpisów graczy — tylko je przegląda (rozdz. 3 polecenia).
import { MOTYWY, ZAKLADKI_STALE } from "./konfiguracja.js";
import { el, komunikat, naZmianeLogu, opisBledu, potwierdz, wpisyLogu, wyczysc, wyczyscLog } from "./narzedzia.js";
import { zapiszWidocznoscKampanii } from "./dane.js";
import { pobierzKopie, przeanalizujPlik, przywroc } from "./kopia.js";
import { sprawdzAppCheck } from "./firebase.js";
import { BladKopii } from "./kopia-format.js";

const NAZWY_KOLOROW = { zielony: "zielony", bursztynowy: "bursztynowy" };
const FORMAT_CZASU = new Intl.DateTimeFormat("pl-PL", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export class WidokAdmina {
  /**
   * @param {HTMLElement} kontener
   * @param {object} opcje { stan, dane, rejestr (kampanie.json) }
   */
  constructor(kontener, opcje) {
    this.kontener = kontener;
    this.opcje = opcje;
    this.pola = { zakladki: new Map(), kolory: new Map(), elementy: new Map() };
    this.analiza = null;
    this.zbuduj();
  }

  zapisz(zmiany, opis) {
    const { dane, stan } = this.opcje;
    return dane
      .zapiszUstawienia(zmiany, stan.sesja)
      .then(() => opis && komunikat(opis, "ok"))
      .catch((e) => {
        komunikat(opisBledu(e), "blad", 8000);
        this.render();
      });
  }

  listaKolorow(wartosc) {
    const s = el("select.pole");
    for (const k of Object.keys(MOTYWY)) s.append(el("option", { tekst: NAZWY_KOLOROW[k] || k, atrybuty: { value: k, selected: k === wartosc } }));
    return s;
  }

  zbuduj() {
    const { stan } = this.opcje;
    const tresc = el("div.tresc-widoku.admin-tresc");
    tresc.append(el("div.widok-naglowek", [el("h2", { tekst: "⚙ PANEL ADMINA" })]));
    tresc.append(
      el("p.przygaszony", {
        tekst: "Admin przegląda wpisy graczy, ale ich nie edytuje. Tutaj decydujesz, co gracze widzą, i robisz kopie zapasowe bazy."
      })
    );
    // Sekcje ustawień, obok (na wąskim ekranie: u dołu) — LOG komunikatów.
    const sekcje = el("div.admin-sekcje");

    // ---- kampania ----
    const nazwaKampanii = stan.kampania.nazwa || stan.kampania.id;
    this.poleKampanii = el("input.przelacznik", {
      atrybuty: { type: "checkbox", id: "admin-kampania", "aria-label": `Kampania ${nazwaKampanii} widoczna dla graczy` }
    });
    this.poleKampanii.addEventListener("change", () => this.przelaczKampanie(this.poleKampanii.checked));
    sekcje.append(
      el("section.panel-ramka", [
        el("h3.sekcja-tytul", { tekst: "KAMPANIA — WIDOCZNA DLA GRACZY" }),
        el("label.przelacznik-etykieta", { atrybuty: { for: "admin-kampania" } }, [
          this.poleKampanii,
          el("span", { tekst: `„${nazwaKampanii}” na liście kampanii Skryby i Gracza` })
        ]),
        el("p.przygaszony", {
          tekst: "Odznaczona kampania znika graczom z listy na stronie startowej, a kto ją właśnie ogląda, zobaczy informację, że jest niedostępna. To samo pole jest przy kampanii na liście „WYBIERZ KAMPANIĘ”."
        })
      ])
    );

    // ---- zakładki ----
    const listaZakladek = el("ul.lista-elementow");
    const dodajZakladke = (id, nazwa, zapis) => {
      const pole = el("input.przelacznik", { atrybuty: { type: "checkbox", id: `admin-zakladka-${id}`, "aria-label": `Zakładka ${nazwa} widoczna dla graczy` } });
      pole.addEventListener("change", () =>
        this.zapisz(zapis(pole.checked), pole.checked ? `Zakładka „${nazwa}” widoczna dla graczy.` : `Zakładka „${nazwa}” ukryta przed graczami.`)
      );
      this.pola.zakladki.set(id, pole);
      listaZakladek.append(el("li", [el("label.przelacznik-etykieta", { atrybuty: { for: `admin-zakladka-${id}` } }, [pole, el("span", { tekst: nazwa })])]));
    };
    for (const z of ZAKLADKI_STALE) dodajZakladke(z.id, z.nazwa, (w) => ({ zakladki: { [z.id]: w } }));
    for (const mapa of stan.manifest.mapy || []) dodajZakladke(`mapa-${mapa.id}`, mapa.nazwa, (w) => ({ mapy: { [mapa.id]: { widoczna: w } } }));
    sekcje.append(
      el("section.panel-ramka", [
        el("h3.sekcja-tytul", { tekst: "ZAKŁADKI — WIDOCZNE DLA GRACZY" }),
        el("p.przygaszony", {
          tekst: "Zaznaczona zakładka jest widoczna dla graczy, odznaczona — ukryta. To samo pole jest przy każdej zakładce w pasku na górze ekranu (widzi je tylko admin)."
        }),
        listaZakladek
      ])
    );

    // ---- mapy i miejsca ----
    const sekcjaMap = el("section.panel-ramka", [
      el("h3.sekcja-tytul", { tekst: "MAPY I MIEJSCA" }),
      el("p.przygaszony", { tekst: "Dostępność miejsc zmienisz też w indeksie obok mapy (pola wyboru) albo w karcie miejsca." })
    ]);
    this.kolorKampanii = this.listaKolorow(stan.kolorKampanii());
    this.kolorKampanii.addEventListener("change", () =>
      this.zapisz({ kolor: this.kolorKampanii.value }, `Kolor ekranu poza mapami: ${NAZWY_KOLOROW[this.kolorKampanii.value] || this.kolorKampanii.value}.`)
    );
    sekcjaMap.append(el("label.etykieta.etykieta-pozioma", [el("span", { tekst: "Kolor ekranu poza mapami:" }), this.kolorKampanii]));

    for (const mapa of stan.manifest.mapy || []) {
      const kolor = this.listaKolorow(stan.kolorMapy(mapa));
      kolor.setAttribute("aria-label", `Kolor mapy ${mapa.nazwa}`);
      kolor.addEventListener("change", () =>
        this.zapisz({ mapy: { [mapa.id]: { kolor: kolor.value } } }, `Kolor mapy „${mapa.nazwa}”: ${NAZWY_KOLOROW[kolor.value] || kolor.value}.`)
      );
      this.pola.kolory.set(mapa.id, kolor);

      const elementy = (stan.manifest.elementy || []).filter((e) => e.mapa === mapa.id);
      const ustawWszystkie = (wartosc) =>
        this.zapisz(
          { elementy: Object.fromEntries(elementy.map((e) => [e.id, wartosc])) },
          wartosc ? `Zaznaczono wszystkie miejsca na mapie „${mapa.nazwa}”.` : `Odznaczono wszystkie miejsca na mapie „${mapa.nazwa}”.`
        );
      const domyslne = async () => {
        const ok = await potwierdz(`Przywrócić ustawienia mapy „${mapa.nazwa}” z manifestu (widoczność zakładki, kolor i dostępność miejsc)?`);
        if (!ok) return;
        this.zapisz(
          { mapy: { [mapa.id]: null }, elementy: Object.fromEntries(elementy.map((e) => [e.id, null])) },
          `Przywrócono ustawienia domyślne mapy „${mapa.nazwa}”.`
        );
      };
      const lista = el("ul.lista-elementow");
      for (const e of elementy) {
        const pole = el("input.przelacznik", { atrybuty: { type: "checkbox", id: `admin-el-${e.id}` } });
        pole.addEventListener("change", () =>
          this.zapisz({ elementy: { [e.id]: pole.checked } }, pole.checked ? `Miejsce „${e.nazwa}” dostępne dla graczy.` : `Miejsce „${e.nazwa}” ukryte przed graczami.`)
        );
        this.pola.elementy.set(e.id, pole);
        lista.append(el("li", [el("label.przelacznik-etykieta", { atrybuty: { for: `admin-el-${e.id}` } }, [pole, el("span", { tekst: e.nazwa })])]));
      }
      sekcjaMap.append(
        el("div.admin-mapa", [
          el("h4.podsekcja", { tekst: `◈ ${mapa.nazwa.toUpperCase()}` }),
          el("div.admin-wiersz", [el("label.etykieta.etykieta-pozioma", [el("span", { tekst: "Kolor mapy:" }), kolor])]),
          el("p.przygaszony", { tekst: "Zaznaczone miejsca są dla graczy klikalne i można przy nich robić notatki. Odznaczone wyglądają jak zwykłe tło mapy." }),
          el("div.admin-wiersz", [
            el("button.przycisk.przycisk-maly", { tekst: "ZAZNACZ WSZYSTKIE", atrybuty: { type: "button" }, zdarzenia: { click: () => ustawWszystkie(true) } }),
            el("button.przycisk.przycisk-maly", { tekst: "ODZNACZ WSZYSTKIE", atrybuty: { type: "button" }, zdarzenia: { click: () => ustawWszystkie(false) } }),
            el("button.przycisk.przycisk-maly", { tekst: "PRZYWRÓĆ DOMYŚLNE", atrybuty: { type: "button" }, zdarzenia: { click: domyslne } })
          ]),
          lista
        ])
      );
    }
    sekcje.append(sekcjaMap);

    // ---- kopia zapasowa ----
    this.zSecrets = el("input.przelacznik", { atrybuty: { type: "checkbox", id: "kopia-secrets" } });
    this.statusKopii = el("p.przygaszony", { atrybuty: { "aria-live": "polite" } });
    const przyciskKopii = el("button.przycisk.przycisk-glowny", { tekst: "POBIERZ KOPIĘ (CSV)", atrybuty: { type: "button", id: "przycisk-kopii" } });
    przyciskKopii.addEventListener("click", () => this.wykonajKopie(przyciskKopii));
    sekcje.append(
      el("section.panel-ramka", [
        el("h3.sekcja-tytul", { tekst: "KOPIA ZAPASOWA" }),
        el("p", { tekst: "Kopia obejmuje dane wszystkich kampanii z rejestru (notatki i ustawienia map) oraz kolekcję admins." }),
        el("label.przelacznik-etykieta", { atrybuty: { for: "kopia-secrets" } }, [this.zSecrets, el("span", { tekst: "Dołącz kolekcję secrets (loginy i hasła)" })]),
        el("p.ostrzezenie", { tekst: "Uwaga: z tą opcją plik będzie zawierał hasła zapisane zwykłym tekstem. Nie wysyłaj go nikomu i nie wrzucaj do repozytorium." }),
        el("div.admin-wiersz", [przyciskKopii]),
        this.statusKopii
      ])
    );

    // ---- przywracanie ----
    this.plik = el("input.pole", { atrybuty: { type: "file", accept: ".csv,text/csv", "aria-label": "Plik kopii zapasowej" } });
    this.plik.addEventListener("change", () => this.wczytajPlik());
    this.podglad = el("div.podglad-kopii");
    this.trybScal = el("input", { atrybuty: { type: "radio", name: "tryb-przywracania", value: "scal", checked: true, id: "tryb-scal" } });
    this.trybZastap = el("input", { atrybuty: { type: "radio", name: "tryb-przywracania", value: "zastap", id: "tryb-zastap" } });
    this.potwierdzenie = el("input.pole", { atrybuty: { type: "text", autocomplete: "off", placeholder: "PRZYWRÓĆ", "aria-label": "Słowo potwierdzenia" } });
    this.wierszPotwierdzenia = el("label.etykieta", { atrybuty: { hidden: true } }, [
      el("span", { tekst: "Tryb „Zastąp” usuwa dane. Wpisz słowo PRZYWRÓĆ, aby potwierdzić:" }),
      this.potwierdzenie
    ]);
    for (const r of [this.trybScal, this.trybZastap]) r.addEventListener("change", () => (this.wierszPotwierdzenia.hidden = !this.trybZastap.checked));
    this.przyciskPrzywroc = el("button.przycisk.przycisk-niebezpieczny", { tekst: "PRZYWRÓĆ", atrybuty: { type: "button", disabled: true, id: "przycisk-przywroc" } });
    this.przyciskPrzywroc.addEventListener("click", () => this.wykonajPrzywracanie());
    this.dziennik = el("pre.dziennik", { atrybuty: { "aria-live": "polite", hidden: true } });
    sekcje.append(
      el("section.panel-ramka", [
        el("h3.sekcja-tytul", { tekst: "PRZYWRACANIE Z KOPII" }),
        el("p", { tekst: "1. Wybierz plik kopii. 2. Sprawdź podgląd. 3. Wybierz tryb. Przed przywróceniem aplikacja sama pobierze świeżą kopię obecnego stanu bazy." }),
        el("p.przygaszony", { tekst: "Kont (admins, secrets) aplikacja nie przywraca — baza pozwala je tylko czytać. Konta zmieniasz ręcznie w konsoli Firebase." }),
        this.plik,
        this.podglad,
        el("fieldset.tryby", [
          el("legend", { tekst: "Tryb przywracania" }),
          el("label.przelacznik-etykieta", { atrybuty: { for: "tryb-scal" } }, [this.trybScal, el("span", { tekst: "SCAL — zapisz dokumenty z pliku, resztę zostaw bez zmian." })]),
          el("label.przelacznik-etykieta", { atrybuty: { for: "tryb-zastap" } }, [
            this.trybZastap,
            el("span", { tekst: "ZASTĄP — w kolekcjach objętych kopią usuń wszystko, czego nie ma w pliku, potem zapisz dokumenty z pliku." })
          ])
        ]),
        this.wierszPotwierdzenia,
        el("div.admin-wiersz", [this.przyciskPrzywroc]),
        this.dziennik
      ])
    );

    this.statusAppCheck = el("p", { tekst: "Sprawdzam…", atrybuty: { "aria-live": "polite" } });
    const przyciskAppCheck = el("button.przycisk.przycisk-maly", {
      tekst: "SPRAWDŹ PONOWNIE",
      atrybuty: { type: "button" },
      zdarzenia: { click: () => this.sprawdzZabezpieczenie() }
    });
    sekcje.append(
      el("section.panel-ramka", [
        el("h3.sekcja-tytul", { tekst: "ZABEZPIECZENIA" }),
        el("p", { tekst: "App Check — czy ta strona dostała od Google przepustkę do bazy:" }),
        this.statusAppCheck,
        el("div.admin-wiersz", [przyciskAppCheck]),
        el("p.przygaszony", {
          tekst:
            "Gdy na stronie w internecie widać tu „działa”, możesz w konsoli Firebase włączyć wymuszanie App Check dla Cloud Firestore — wtedy baza przyjmie zapytania wyłącznie z tej strony (instrukcja: firebase/README.md)."
        }),
        el("p.przygaszony", {
          tekst:
            "Reguły bazy pozwalają tylko na zapisy, których używa aplikacja, a konta (admins, secrets) są tylko do odczytu. Nadal jednak baza nie wie, kto pyta: profile Admin, Skryba i Gracz działają w wyglądzie aplikacji, a hasła z kolekcji secrets da się podejrzeć. Szczegóły: README.md."
        })
      ])
    );
    this.sprawdzZabezpieczenie();
    tresc.append(el("div.admin-uklad", [sekcje, this.zbudujLog()]));
    this.kontener.append(tresc);
  }

  // ---- log komunikatów ----
  zbudujLog() {
    this.logLista = el("ol.log-lista", { atrybuty: { "aria-label": "Log komunikatów, od najnowszego", tabindex: "0" } });
    const przyciskCzyszczenia = el("button.przycisk.przycisk-maly", {
      tekst: "WYCZYŚĆ",
      atrybuty: { type: "button", id: "przycisk-czysc-log" },
      zdarzenia: { click: () => wyczyscLog() }
    });
    naZmianeLogu(() => this.renderLogu());
    this.renderLogu();
    return el("aside.panel-ramka.admin-log", { atrybuty: { id: "admin-log", "aria-label": "Log" } }, [
      el("div.log-naglowek", [el("h3.sekcja-tytul", { tekst: "LOG" }), przyciskCzyszczenia]),
      this.logLista
    ]);
  }

  renderLogu() {
    const wpisy = wpisyLogu();
    wyczysc(this.logLista);
    if (!wpisy.length) {
      this.logLista.append(
        el("li.log-pusto", { tekst: "Brak komunikatów. Tu zapisują się potwierdzenia Twoich zmian; log znika po wylogowaniu albo zamknięciu przeglądarki." })
      );
      return;
    }
    for (const w of [...wpisy].reverse()) {
      const czas = Number.isFinite(w.c) ? new Date(w.c) : null;
      this.logLista.append(
        el("li.log-wpis", { klasa: `log-${w.r === "blad" ? "blad" : w.r === "ok" ? "ok" : "info"}` }, [
          czas ? el("time.log-czas", { tekst: FORMAT_CZASU.format(czas), atrybuty: { datetime: czas.toISOString() } }) : null,
          el("span.log-tekst", { tekst: w.t })
        ])
      );
    }
  }

  async przelaczKampanie(widoczna) {
    const { stan } = this.opcje;
    const nazwa = stan.kampania.nazwa || stan.kampania.id;
    try {
      await zapiszWidocznoscKampanii(stan.kampania, widoczna, stan.sesja);
      komunikat(widoczna ? `Kampania „${nazwa}” widoczna dla graczy.` : `Kampania „${nazwa}” ukryta przed graczami.`, "ok");
    } catch (e) {
      komunikat(opisBledu(e), "blad", 8000);
      this.render();
    }
  }

  async sprawdzZabezpieczenie() {
    this.statusAppCheck.className = "";
    this.statusAppCheck.textContent = "Sprawdzam…";
    const wynik = await sprawdzAppCheck();
    if (wynik.ok) {
      this.statusAppCheck.className = "status-na-zywo";
      this.statusAppCheck.textContent = wynik.lokalnie
        ? "Działa (token debugowania — strona uruchomiona na tym komputerze)."
        : "Działa — strona dostała przepustkę App Check.";
    } else {
      this.statusAppCheck.className = "formularz-blad";
      this.statusAppCheck.textContent = wynik.lokalnie
        ? `Nie działa na tym komputerze (${wynik.powod}). To normalne poza adresem strony — zarejestruj token debugowania (firebase/README.md).`
        : `Nie działa (${wynik.powod}). Nie włączaj wymuszania App Check, dopóki to się nie zmieni — gracze straciliby dostęp do bazy.`;
    }
  }

  /** Odświeża stan pól (bez przebudowy — nie gubimy fokusu). */
  render() {
    const { stan } = this.opcje;
    this.poleKampanii.checked = stan.kampaniaWidocznaDlaGraczy();
    this.kolorKampanii.value = stan.kolorKampanii();
    for (const z of ZAKLADKI_STALE) this.pola.zakladki.get(z.id).checked = stan.zakladkaWidocznaDlaGraczy(z.id);
    for (const mapa of stan.manifest.mapy || []) {
      this.pola.zakladki.get(`mapa-${mapa.id}`).checked = stan.mapaWidocznaDlaGraczy(mapa);
      this.pola.kolory.get(mapa.id).value = stan.kolorMapy(mapa);
    }
    for (const e of stan.manifest.elementy || []) {
      const pole = this.pola.elementy.get(e.id);
      if (pole) pole.checked = stan.elementZaznaczony(e);
    }
  }

  kampanieZRejestru() {
    const { rejestr, stan } = this.opcje;
    const ids = (rejestr?.kampanie || []).map((k) => k.id).filter(Boolean);
    return ids.length ? ids : [stan.kampania.id];
  }

  async wykonajKopie(przycisk) {
    przycisk.disabled = true;
    this.statusKopii.textContent = "Tworzę kopię…";
    try {
      const wynik = await pobierzKopie({ kampanie: this.kampanieZRejestru(), zSecrets: this.zSecrets.checked }, (t) => (this.statusKopii.textContent = t));
      this.statusKopii.textContent = `Pobrano plik ${wynik.nazwa} (${wynik.liczba} dokumentów).`;
      komunikat(`Pobrano kopię zapasową: ${wynik.nazwa} (${wynik.liczba} dokumentów).`, "ok");
    } catch (e) {
      this.statusKopii.textContent = e instanceof BladKopii ? e.message : opisBledu(e);
    } finally {
      przycisk.disabled = false;
    }
  }

  async wczytajPlik() {
    wyczysc(this.podglad);
    this.analiza = null;
    this.przyciskPrzywroc.disabled = true;
    const plik = this.plik.files && this.plik.files[0];
    if (!plik) return;
    try {
      const tekst = await plik.text();
      this.analiza = przeanalizujPlik(tekst);
    } catch (e) {
      this.podglad.append(el("p.formularz-blad", { tekst: e instanceof BladKopii ? e.message : `Nie udało się odczytać pliku: ${e.message}` }));
      return;
    }
    const { meta, podsumowanie, maAdmins, maSecrets, kampanie, konta } = this.analiza;
    const tabela = el("table.tabela", [el("thead", [el("tr", [el("th", { tekst: "Kolekcja" }), el("th", { tekst: "Dokumenty" })])])]);
    const tbody = el("tbody");
    for (const [kolekcja, liczba] of podsumowanie) tbody.append(el("tr", [el("td", { tekst: kolekcja }), el("td", { tekst: String(liczba) })]));
    tabela.append(tbody);
    this.podglad.append(
      el("p", { tekst: `Kopia z: ${new Date(meta.wykonano).toLocaleString("pl-PL")} · wersja formatu ${meta.wersja} · dokumentów: ${this.analiza.dokumenty.length}` }),
      el("p", { tekst: `Zakres: kampanie ${kampanie.join(", ") || "—"}; ${maAdmins ? "zawiera admins" : "bez admins"}; ${maSecrets ? "ZAWIERA secrets (hasła)" : "bez secrets"}.` }),
      tabela
    );
    if (konta) {
      this.podglad.append(
        el("p.ostrzezenie", {
          tekst: `Dokumenty kont w pliku (${konta}) zostaną pominięte — baza pozwala je tylko czytać. W razie potrzeby popraw konta ręcznie w konsoli Firebase.`
        })
      );
    }
    this.przyciskPrzywroc.disabled = false;
  }

  log(tekst) {
    this.dziennik.hidden = false;
    this.dziennik.textContent += `${tekst}\n`;
  }

  async wykonajPrzywracanie() {
    if (!this.analiza) return;
    const tryb = this.trybZastap.checked ? "zastap" : "scal";
    if (tryb === "zastap" && this.potwierdzenie.value.trim().toUpperCase() !== "PRZYWRÓĆ") {
      komunikat("Aby użyć trybu „Zastąp”, wpisz słowo PRZYWRÓĆ.", "blad");
      this.potwierdzenie.focus();
      return;
    }
    const ok = await potwierdz(
      tryb === "zastap"
        ? "Przywrócić bazę w trybie ZASTĄP? Dokumenty spoza pliku w kolekcjach objętych kopią zostaną usunięte."
        : "Przywrócić bazę w trybie SCAL? Dokumenty z pliku nadpiszą obecne wersje.",
      { tak: "PRZYWRÓĆ", niebezpieczne: true }
    );
    if (!ok) return;
    this.przyciskPrzywroc.disabled = true;
    this.dziennik.textContent = "";
    try {
      this.log("Krok 1: kopia bezpieczeństwa obecnego stanu…");
      const kopia = await pobierzKopie(
        { kampanie: this.kampanieZRejestru(), zSecrets: false, przedrostek: "przed-przywroceniem" },
        (t) => this.log(`  ${t}`)
      );
      this.log(`  Pobrano: ${kopia.nazwa} (${kopia.liczba} dokumentów).`);
      this.log(`Krok 2: przywracanie (${tryb === "zastap" ? "ZASTĄP" : "SCAL"})…`);
      const wynik = await przywroc(this.analiza, tryb, (t) => this.log(`  ${t}`));
      const opisz = (mapa) => [...mapa.entries()].map(([k, n]) => `${k}: ${n}`).join(", ") || "—";
      this.log(`Usunięte: ${opisz(wynik.wykonane.usuniete)}`);
      this.log(`Zapisane: ${opisz(wynik.wykonane.zapisane)}`);
      if (wynik.pominieteKonta) this.log(`Pominięte dokumenty kont (admins/secrets): ${wynik.pominieteKonta}.`);
      if (wynik.ok) {
        this.log(`GOTOWE. Partie: ${wynik.partie}.`);
        komunikat("Przywrócono dane z kopii.", "ok");
      } else {
        this.log(`ZATRZYMANO po ${wynik.partie} z ${wynik.wszystkiePartie} partii. Błąd: ${opisBledu(wynik.blad)}`);
        this.log("Powyżej: co zdążyło się zapisać. Kopia bezpieczeństwa pozwala wrócić do stanu sprzed przywracania.");
        komunikat("Przywracanie przerwane — szczegóły w dzienniku.", "blad", 8000);
      }
    } catch (e) {
      this.log(`BŁĄD: ${e instanceof BladKopii ? e.message : opisBledu(e)}`);
      this.log("Baza nie została zmieniona (błąd wystąpił przed zapisem).");
    } finally {
      this.przyciskPrzywroc.disabled = false;
    }
  }
}
