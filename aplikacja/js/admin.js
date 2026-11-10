// Zakładka „Admin”: widoczność zakładek z mapami, dostępność miejsc dla graczy,
// kolory ekranu, kopia zapasowa i przywracanie bazy.
// Admin NIE edytuje wpisów graczy — tylko je przegląda (rozdz. 3 polecenia).
import { MOTYWY } from "./konfiguracja.js";
import { el, komunikat, opisBledu, potwierdz, wyczysc } from "./narzedzia.js";
import { pobierzKopie, przeanalizujPlik, przywroc } from "./kopia.js";
import { sprawdzAppCheck } from "./firebase.js";
import { BladKopii } from "./kopia-format.js";

const NAZWY_KOLOROW = { zielony: "zielony", bursztynowy: "bursztynowy" };

export class WidokAdmina {
  /**
   * @param {HTMLElement} kontener
   * @param {object} opcje { stan, dane, rejestr (kampanie.json) }
   */
  constructor(kontener, opcje) {
    this.kontener = kontener;
    this.opcje = opcje;
    this.pola = { mapy: new Map(), kolory: new Map(), elementy: new Map() };
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
    const tresc = el("div.tresc-widoku");
    tresc.append(el("div.widok-naglowek", [el("h2", { tekst: "⚙ PANEL ADMINA" })]));
    tresc.append(
      el("p.przygaszony", {
        tekst: "Admin przegląda wpisy graczy, ale ich nie edytuje. Tutaj decydujesz, co gracze widzą na mapach, i robisz kopie zapasowe bazy."
      })
    );

    // ---- mapy i miejsca ----
    const sekcjaMap = el("section.panel-ramka", [el("h3.sekcja-tytul", { tekst: "MAPY I MIEJSCA" })]);
    this.kolorKampanii = this.listaKolorow(stan.kolorKampanii());
    this.kolorKampanii.addEventListener("change", () => this.zapisz({ kolor: this.kolorKampanii.value }, "Zmieniono kolor ekranu."));
    sekcjaMap.append(el("label.etykieta.etykieta-pozioma", [el("span", { tekst: "Kolor ekranu poza mapami:" }), this.kolorKampanii]));

    for (const mapa of stan.manifest.mapy || []) {
      const widoczna = el("input.przelacznik", { atrybuty: { type: "checkbox", "aria-label": `Zakładka ${mapa.nazwa} widoczna dla graczy` } });
      widoczna.addEventListener("change", () =>
        this.zapisz(
          { mapy: { [mapa.id]: { widoczna: widoczna.checked } } },
          widoczna.checked ? `Zakładka „${mapa.nazwa}” widoczna dla graczy.` : `Zakładka „${mapa.nazwa}” ukryta przed graczami.`
        )
      );
      const kolor = this.listaKolorow(stan.kolorMapy(mapa));
      kolor.setAttribute("aria-label", `Kolor mapy ${mapa.nazwa}`);
      kolor.addEventListener("change", () => this.zapisz({ mapy: { [mapa.id]: { kolor: kolor.value } } }, `Zmieniono kolor mapy „${mapa.nazwa}”.`));
      this.pola.mapy.set(mapa.id, widoczna);
      this.pola.kolory.set(mapa.id, kolor);

      const elementy = (stan.manifest.elementy || []).filter((e) => e.mapa === mapa.id);
      const ustawWszystkie = (wartosc) =>
        this.zapisz({ elementy: Object.fromEntries(elementy.map((e) => [e.id, wartosc])) }, wartosc ? "Zaznaczono wszystkie miejsca." : "Odznaczono wszystkie miejsca.");
      const domyslne = async () => {
        const ok = await potwierdz(`Przywrócić ustawienia mapy „${mapa.nazwa}” z manifestu (widoczność zakładki, kolor i dostępność miejsc)?`);
        if (!ok) return;
        this.zapisz(
          { mapy: { [mapa.id]: null }, elementy: Object.fromEntries(elementy.map((e) => [e.id, null])) },
          "Przywrócono ustawienia domyślne."
        );
      };
      const lista = el("ul.lista-elementow");
      for (const e of elementy) {
        const pole = el("input.przelacznik", { atrybuty: { type: "checkbox", id: `admin-el-${e.id}` } });
        pole.addEventListener("change", () => this.zapisz({ elementy: { [e.id]: pole.checked } }));
        this.pola.elementy.set(e.id, pole);
        lista.append(el("li", [el("label.przelacznik-etykieta", { atrybuty: { for: `admin-el-${e.id}` } }, [pole, el("span", { tekst: e.nazwa })])]));
      }
      sekcjaMap.append(
        el("div.admin-mapa", [
          el("h4.podsekcja", { tekst: `◈ ${mapa.nazwa.toUpperCase()}` }),
          el("div.admin-wiersz", [
            el("label.przelacznik-etykieta", [widoczna, el("span", { tekst: "Zakładka widoczna dla graczy" })]),
            el("label.etykieta.etykieta-pozioma", [el("span", { tekst: "Kolor mapy:" }), kolor])
          ]),
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
    tresc.append(sekcjaMap);

    // ---- kopia zapasowa ----
    this.zSecrets = el("input.przelacznik", { atrybuty: { type: "checkbox", id: "kopia-secrets" } });
    this.statusKopii = el("p.przygaszony", { atrybuty: { "aria-live": "polite" } });
    const przyciskKopii = el("button.przycisk.przycisk-glowny", { tekst: "POBIERZ KOPIĘ (CSV)", atrybuty: { type: "button", id: "przycisk-kopii" } });
    przyciskKopii.addEventListener("click", () => this.wykonajKopie(przyciskKopii));
    tresc.append(
      el("section.panel-ramka", [
        el("h3.sekcja-tytul", { tekst: "KOPIA ZAPASOWA" }),
        el("p", { tekst: "Kopia obejmuje dane wszystkich kampanii z rejestru (notatki, postęp, powiązania, ustawienia map) oraz kolekcję admins." }),
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
    tresc.append(
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
    tresc.append(
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
            "Reguły bazy pozwalają tylko na zapisy, których używa aplikacja, a konta (admins, secrets) są tylko do odczytu. Nadal jednak baza nie wie, kto pyta: role gracz/admin działają w wyglądzie aplikacji, a hasła z kolekcji secrets da się podejrzeć. Szczegóły: README.md."
        })
      ])
    );
    this.sprawdzZabezpieczenie();
    this.kontener.append(tresc);
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
    this.kolorKampanii.value = stan.kolorKampanii();
    for (const mapa of stan.manifest.mapy || []) {
      this.pola.mapy.get(mapa.id).checked = stan.mapaWidocznaDlaGraczy(mapa);
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
