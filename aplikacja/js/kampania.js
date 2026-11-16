// Strona kampanii (kampania.html?k=iliac): zakładki (Notatki, mapy, Admin), indeks,
// karta miejsca i panel admina. Łączy wszystkie moduły w całość.
// Bez logowania strona niczego nie pokazuje (przekierowuje do logowania), a kampanii
// ukrytej przez admina gracze nie otworzą (także z odnośnika).
import { DaneKampanii } from "./dane.js";
import { Stan } from "./stan.js";
import { PrzegladarkaMapy } from "./mapa.js";
import { Indeks } from "./indeks.js";
import { PanelElementu } from "./panel.js";
import { WidokNotatek } from "./notatki.js";
import { WidokAdmina } from "./admin.js";
import { sprawdzKonto } from "./logowanie.js";
import {
  jestAdminem,
  kampaniaDlaUzytkownika,
  naZmianeSesji,
  nazwaKonta,
  pobierzSesje,
  uwzglednijSprawdzenieKonta,
  wyczyscSesje
} from "./sesja.js";
import { KLUCZ_INDEKSU, MOTYWY, ZAKLADKI_STALE } from "./konfiguracja.js";
import {
  el,
  komunikat,
  opisBledu,
  pamiecOdczyt,
  pamiecZapis,
  parametrAdresu,
  ustawTrybKomunikatow,
  wczytajJson,
  wyczysc
} from "./narzedzia.js";

// Indeks jako stała kolumna obok mapy dopiero od 1280 px — węziej wysuwa się nad mapę.
const SZEROKI = window.matchMedia("(min-width: 1280px)");

const $ = (id) => document.getElementById(id);

function ustawMotyw(nazwa) {
  for (const m of Object.keys(MOTYWY)) document.body.classList.toggle(`motyw-${m}`, m === nazwa);
}

function ekranKomunikatu(naglowek, tekst) {
  const srodek = $("srodek");
  wyczysc(srodek);
  // Puste paski zakładek i stanu tylko by przeszkadzały.
  $("zakladki").hidden = true;
  $("status").hidden = true;
  srodek.append(
    el("div.tresc-widoku", [
      el("h2", { tekst: naglowek }),
      el("p", { tekst }),
      el("p", [el("a.odnosnik", { tekst: "◂ Wróć do wyboru kampanii", atrybuty: { href: "index.html" } })])
    ])
  );
}

function bladStartu(tekst) {
  ekranKomunikatu("+++ BŁĄD ODCZYTU DANYCH +++", tekst);
}

/** Gracz otworzył kampanię, której admin nie udostępnił (bez zdradzania jej nazwy). */
function kampaniaNiedostepna() {
  document.title = "Data-Slate — kampania niedostępna";
  ekranKomunikatu("+++ KAMPANIA NIEDOSTĘPNA +++", "Mistrz Gry nie udostępnił tej kampanii.");
}

/** Przy wylogowaniu — wszystko znika, wracamy do logowania. */
function doLogowania(id = null) {
  location.replace(id ? `index.html?k=${encodeURIComponent(id)}${location.hash}` : "index.html");
}

async function start() {
  const sesja = pobierzSesje();
  const idZAdresu = parametrAdresu("k");
  // Bez logowania nie pokazujemy niczego (ani nazwy kampanii) — logowanie na stronie
  // startowej, potem aplikacja wraca do tej kampanii.
  if (!sesja) {
    doLogowania(idZAdresu);
    return;
  }
  if (!idZAdresu) {
    doLogowania();
    return;
  }
  // Zmiana sesji — w tej karcie albo w innej (zapamiętane logowanie jest wspólne dla
  // kart): wylogowanie → logowanie; inne konto albo zmieniona rola → strona od nowa
  // (inne uprawnienia, inne zakładki); nowa nazwa konta → tylko odświeżenie napisów.
  let biezacaSesja = sesja;
  let poZmianieNazwyKonta = null; // ustawiane, gdy strona jest gotowa
  naZmianeSesji((nowa) => {
    if (!nowa) {
      doLogowania();
      return;
    }
    if (nowa.kontoId !== biezacaSesja.kontoId || nowa.rola !== biezacaSesja.rola) {
      location.reload();
      return;
    }
    biezacaSesja = nowa;
    poZmianieNazwyKonta?.(nowa);
  });
  // Konto sprawdzane w bazie przy każdym otwarciu strony (usunięte konto albo zmieniony
  // login → logowanie, zmieniona rola → nowy profil). Błąd sieci — sesja bez zmian.
  sprawdzKonto(sesja)
    .then((wynik) => uwzglednijSprawdzenieKonta(sesja, wynik))
    .catch(() => {});
  // Admin: potwierdzenia jego zmian trafiają do logu w zakładce Admin, na ekranie — tylko błędy.
  if (jestAdminem(sesja)) ustawTrybKomunikatow({ log: true, tylkoBledyNaEkranie: true });

  let rejestr;
  let kampania;
  try {
    rejestr = await wczytajJson("kampanie.json");
    kampania = (rejestr.kampanie || []).find((k) => k.id === idZAdresu);
    if (!kampania) throw new Error(`W rejestrze kampanii nie ma kampanii „${idZAdresu}”.`);
  } catch (e) {
    bladStartu(e.message);
    return;
  }

  // Czy wolno ją pokazać: dokument kampanii w bazie (pole „widoczna”) albo domyślnie z rejestru.
  const dane = new DaneKampanii(kampania.id, kampania.nazwa);
  let poZmianieKampanii = null; // ustawiane, gdy strona jest gotowa
  let poBledzieKampanii = null;
  let dokumentKampanii;
  try {
    dokumentKampanii = await new Promise((rozwiaz, odrzuc) => {
      let pierwszy = true;
      let dostep = null;
      dane.subskrybujDokumentKampanii(
        (dokument) => {
          const teraz = kampaniaDlaUzytkownika(sesja, kampania, dokument);
          if (pierwszy) {
            pierwszy = false;
            dostep = teraz;
            rozwiaz(dokument);
            return;
          }
          // Admin ukrył albo odsłonił kampanię, gdy gracz ją oglądał — budujemy stronę od nowa.
          if (teraz !== dostep) {
            location.reload();
            return;
          }
          poZmianieKampanii?.(dokument);
        },
        (e) => {
          if (pierwszy) {
            pierwszy = false;
            odrzuc(e);
          } else poBledzieKampanii?.(e);
        }
      );
    });
  } catch (e) {
    bladStartu(opisBledu(e));
    return;
  }
  if (!kampaniaDlaUzytkownika(sesja, kampania, dokumentKampanii)) {
    kampaniaNiedostepna();
    return;
  }

  let manifest;
  try {
    manifest = await wczytajJson(`${kampania.folder}/kampania.json`);
  } catch (e) {
    bladStartu(e.message);
    return;
  }

  const stan = new Stan({ kampania, manifest, folder: kampania.folder });
  stan.sesja = biezacaSesja; // mogła już zostać odświeżona (sprawdzenie konta w bazie)
  stan.dokumentKampanii = dokumentKampanii;
  dane.nazwa = manifest.nazwa || kampania.nazwa;
  document.title = `${manifest.nazwa || kampania.nazwa} — Data-Slate`;
  $("tytul").replaceChildren(
    el("span.tylko-szeroki", { tekst: "+++ DATA-SLATE // " }),
    (manifest.naglowek || manifest.nazwa || kampania.nazwa).toUpperCase(),
    el("span.tylko-szeroki", { tekst: " +++" })
  );
  ustawMotyw(stan.kolorKampanii());

  // ------------------------------------------------------------- układ
  const widokMap = $("widok-map");
  const obszarMap = $("obszar-map");
  const brakMap = $("brak-map");
  const przegladarki = new Map();
  const plansze = new Map();
  let biezaca = null; // { rodzaj: "mapa"|"widok", id }

  const indeksWezel = $("indeks");
  const indeks = new Indeks(indeksWezel, {
    stan,
    dane,
    onPokaz: (id) => pokazElement(id, { zIndeksu: true }),
    onZamknij: () => ustawIndeks(false),
    onSzukajWNotatkach: (tekst, miejsce) => {
      przelacz({ rodzaj: "widok", id: "notatki" });
      notatki.ustawFiltr({ szukaj: tekst, miejsce });
      // Węższy ekran: indeks zasłaniałby wyniki — chowamy go.
      if (!SZEROKI.matches) ustawIndeks(false);
    }
  });
  const panel = new PanelElementu($("panel"), {
    stan,
    dane,
    onZamknij: () => zamknijPanel(),
    onOtworzMape: (id) => przelacz({ rodzaj: "mapa", id }),
    onMiejsce: (id) => pokazElement(id)
  });
  const notatki = new WidokNotatek($("widok-notatki"), { stan, dane, onMiejsce: (id) => pokazElement(id), onIndeks: () => przelaczIndeks() });
  let admin = null;

  // ------------------------------------------------------------- indeks
  // Indeks jest na zakładkach map (tylko miejsca tej mapy) i na zakładce Notatki
  // (miejsca wszystkich map); na zakładce Admin go nie ma. Otwarcie zapamiętujemy
  // (szeroki ekran) — przechodzi z zakładki na zakładkę.
  let indeksOtwarty = SZEROKI.matches ? pamiecOdczyt(KLUCZ_INDEKSU, "1") === "1" : false;
  const indeksNaZakladce = () => Boolean(biezaca) && (biezaca.rodzaj === "mapa" || biezaca.id === "notatki");
  function ustawIndeks(otwarty) {
    indeksOtwarty = otwarty;
    const widoczny = otwarty && indeksNaZakladce();
    indeks.ustawZakres(biezaca?.rodzaj === "mapa" ? biezaca.id : null);
    $("srodek").classList.toggle("indeks-obok", widoczny);
    indeksWezel.hidden = !widoczny;
    for (const przycisk of document.querySelectorAll('[aria-controls="indeks"]')) przycisk.setAttribute("aria-expanded", String(widoczny));
    if (SZEROKI.matches) pamiecZapis(KLUCZ_INDEKSU, otwarty ? "1" : "0");
    if (widoczny) indeks.render();
    aktywnaPrzegladarka()?.przelicz();
  }
  function przelaczIndeks() {
    ustawIndeks(!(indeksOtwarty && !indeksWezel.hidden));
    // Na ekranach dotykowych bez automatycznego fokusu — klawiatura ekranowa zasłoniłaby indeks.
    if (!indeksWezel.hidden && !window.matchMedia("(pointer: coarse)").matches) indeks.fokus();
  }
  $("przycisk-indeks").addEventListener("click", przelaczIndeks);
  $("przycisk-przybliz").addEventListener("click", () => aktywnaPrzegladarka()?.przybliz());
  $("przycisk-oddal").addEventListener("click", () => aktywnaPrzegladarka()?.oddal());
  $("przycisk-calosc").addEventListener("click", () => aktywnaPrzegladarka()?.widokDomyslny());
  SZEROKI.addEventListener?.("change", () => ustawIndeks(SZEROKI.matches ? pamiecOdczyt(KLUCZ_INDEKSU, "1") === "1" : false));

  function aktywnaPrzegladarka() {
    return biezaca?.rodzaj === "mapa" ? przegladarki.get(biezaca.id) : null;
  }

  // ------------------------------------------------------------- mapy
  // Stan każdego miejsca mapy dla bieżącego użytkownika (mapa.js → ustawStany).
  function stanyElementow(mapa) {
    const stany = new Map();
    for (const e of manifest.elementy || []) {
      if (e.mapa !== mapa.id) continue;
      stany.set(e.id, {
        widoczny: stan.elementWidocznyDlaUzytkownika(e), // gracz nie widzi miejsc zasłoniętych
        zasloniety: !stan.elementWidoczny(e), // admin widzi je przygaszone
        klikalny: stan.elementDlaUzytkownika(e),
        nieklikalny: !stan.elementDostepnyDlaGraczy(e), // admin: przerywane narożniki
        kropka: stan.elementMaKropke(e),
        nazwa: e.nazwa
      });
    }
    return stany;
  }

  // Odkrycia na żywo (gracze): admin zaznaczył „widoczne” przy miejscu — krótki napis i
  // mruganie miejsca na mapie (od razu albo przy pierwszym otwarciu tej mapy).
  let odkryte = null; // id miejsc z zaznaczonym „widoczne”; null — przed pierwszym wczytaniem ustawień
  const doPodswietlenia = new Set();
  function sprawdzOdkrycia() {
    const teraz = new Set((manifest.elementy || []).filter((e) => stan.elementWidoczny(e)).map((e) => e.id));
    const poprzednie = odkryte;
    odkryte = teraz;
    if (!poprzednie || jestAdminem(stan.sesja)) return;
    const wgMapy = new Map();
    for (const e of manifest.elementy || []) {
      if (!teraz.has(e.id) || poprzednie.has(e.id) || !stan.elementWidocznyDlaUzytkownika(e)) continue;
      if (!wgMapy.has(e.mapa)) wgMapy.set(e.mapa, []);
      wgMapy.get(e.mapa).push(e);
    }
    for (const [mapaId, lista] of wgMapy) {
      const mapa = stan.mapyWgId.get(mapaId);
      komunikat(`${lista.length > 1 ? "Nowe odkrycia" : "Nowe odkrycie"} na mapie „${mapa?.nazwa ?? mapaId}”: ${lista.map((e) => e.nazwa).join(", ")}.`, "ok", 8000);
      for (const e of lista) doPodswietlenia.add(e.id);
    }
    podswietlOdkrycia();
  }
  /** Mruganie odkrytych miejsc — tylko na mapie, którą gracz właśnie ogląda. */
  function podswietlOdkrycia() {
    const p = aktywnaPrzegladarka();
    if (!p || !p.svg) return;
    for (const id of [...doPodswietlenia]) {
      if (stan.elementyWgId.get(id)?.mapa !== biezaca.id) continue;
      doPodswietlenia.delete(id);
      p.podswietl(id);
    }
  }

  async function przygotujMape(mapa) {
    if (przegladarki.has(mapa.id)) return przegladarki.get(mapa.id);
    const plansza = el("div.plansza", {
      atrybuty: {
        tabindex: "0",
        "aria-label": `Mapa ${mapa.nazwa}. Strzałki przesuwają, plus i minus przybliżają, Home pokazuje całość.`
      },
      dane: { mapa: mapa.id }
    });
    plansze.set(mapa.id, plansza);
    obszarMap.insertBefore(plansza, brakMap);
    const przegladarka = new PrzegladarkaMapy(plansza, {
      nazwa: mapa.nazwa,
      start: mapa.start,
      onWybor: (id) => pokazElement(id),
      onTlo: () => zamknijPanel()
    });
    przegladarki.set(mapa.id, przegladarka);
    const ladowanie = el("p.ladowanie", { tekst: "ODCZYT MAPY…" });
    plansza.append(ladowanie);
    try {
      // Stan miejsc nadany przed wstawieniem mapy — zasłonięte miejsce nie mignie graczowi.
      await przegladarka.wczytaj(`${kampania.folder}/${mapa.plik}`, stanyElementow(mapa));
    } catch (e) {
      plansza.append(el("p.formularz-blad", { tekst: `Nie udało się wczytać mapy „${mapa.nazwa}”: ${e.message}` }));
    } finally {
      ladowanie.remove();
    }
    przegladarka.ustawStany(stanyElementow(mapa));
    return przegladarka;
  }

  function odswiezMapy() {
    for (const mapa of manifest.mapy || []) {
      const p = przegladarki.get(mapa.id);
      if (p && p.svg) p.ustawStany(stanyElementow(mapa));
    }
  }

  // ------------------------------------------------------------- zakładki
  // Kolejność: Notatki (i inne stałe zakładki), mapy, na końcu Admin.
  function zakladki() {
    const lista = [];
    for (const z of ZAKLADKI_STALE) {
      if (stan.zakladkaDlaUzytkownika(z.id)) lista.push({ rodzaj: "widok", id: z.id, nazwa: z.nazwa, ukryta: !stan.zakladkaWidocznaDlaGraczy(z.id) });
    }
    for (const m of stan.mapyDlaUzytkownika()) lista.push({ rodzaj: "mapa", id: m.id, nazwa: m.nazwa, ukryta: !stan.mapaWidocznaDlaGraczy(m) });
    if (jestAdminem(stan.sesja)) lista.push({ rodzaj: "widok", id: "admin", nazwa: "Admin", stala: true });
    return lista;
  }

  /** Admin: widoczność zakładki dla graczy (mapa albo zakładka stała). */
  async function ustawWidocznoscZakladki(z, widoczna) {
    const zmiana = z.rodzaj === "mapa" ? { mapy: { [z.id]: { widoczna } } } : { zakladki: { [z.id]: widoczna } };
    try {
      await dane.zapiszUstawienia(zmiana, stan.sesja);
      komunikat(widoczna ? `Zakładka „${z.nazwa}” widoczna dla graczy.` : `Zakładka „${z.nazwa}” ukryta przed graczami.`, "ok");
    } catch (e) {
      komunikat(opisBledu(e), "blad", 8000);
      renderZakladek();
    }
  }

  function renderZakladek() {
    const pasek = $("zakladki");
    wyczysc(pasek);
    const lista = zakladki();
    for (const z of lista) {
      const aktywna = biezaca && biezaca.rodzaj === z.rodzaj && biezaca.id === z.id;
      const przycisk = el("button.zakladka", {
        klasa: `${z.rodzaj === "mapa" ? "zakladka-mapy" : ""} ${z.ukryta ? "zakladka-ukryta" : ""}`,
        atrybuty: {
          type: "button",
          role: "tab",
          "aria-selected": String(Boolean(aktywna)),
          "aria-controls": z.rodzaj === "mapa" ? "widok-map" : `widok-${z.id}`,
          title: z.ukryta ? "Zakładka ukryta przed graczami (widzisz ją jako admin)" : ""
        },
        zdarzenia: { click: () => przelacz({ rodzaj: z.rodzaj, id: z.id }) }
      }, [
        el("span.zakladka-ikona", { tekst: z.rodzaj === "mapa" ? "◈ " : z.id === "admin" ? "⚙ " : "▤ ", atrybuty: { "aria-hidden": "true" } }),
        z.nazwa.toUpperCase(),
        z.ukryta ? el("span.znacznik-ukrycia", { tekst: " ⊘", atrybuty: { "aria-label": "(ukryta przed graczami)" } }) : null
      ]);
      // Admin: stały przełącznik przy każdej zakładce — zaznaczone = widoczna dla graczy.
      if (stan.widokAdmina() && !z.stala) {
        const pole = el("input.przelacznik.zakladka-pole", {
          atrybuty: {
            type: "checkbox",
            checked: !z.ukryta,
            title: "Widoczna dla graczy",
            "aria-label": `Widoczna dla graczy: ${z.nazwa}`
          }
        });
        pole.addEventListener("change", () => ustawWidocznoscZakladki(z, pole.checked));
        pasek.append(el("span.zakladka-grupa", { klasa: z.ukryta ? "zakladka-grupa-ukryta" : "" }, [pole, przycisk]));
      } else {
        pasek.append(przycisk);
      }
    }
    // Gracz bez żadnej udostępnionej zakładki — informacja zamiast pustego ekranu.
    $("widok-pusto").hidden = lista.length > 0;
    // Brak udostępnionych map — informacja zamiast pustej planszy.
    brakMap.hidden = stan.mapyDlaUzytkownika().length > 0;
  }

  async function przelacz(cel, { zHasha = false } = {}) {
    const lista = zakladki();
    let wybor = cel && lista.find((z) => z.rodzaj === cel.rodzaj && z.id === cel.id);
    if (!wybor) wybor = lista[0];
    if (!wybor) {
      // Nic nie jest udostępnione (gracze, wszystkie zakładki ukryte).
      biezaca = null;
      for (const s of document.querySelectorAll(".widok")) s.hidden = true;
      zamknijPanel({ bezHasha: true });
      ustawIndeks(indeksOtwarty); // bez zakładki — bez indeksu
      renderZakladek();
      ustawMotyw(stan.kolorKampanii());
      return;
    }
    const zmiana = !biezaca || biezaca.rodzaj !== wybor.rodzaj || biezaca.id !== wybor.id;
    biezaca = { rodzaj: wybor.rodzaj, id: wybor.id };
    for (const s of document.querySelectorAll(".widok")) s.hidden = true;
    if (wybor.rodzaj === "mapa") {
      const mapa = stan.mapyWgId.get(wybor.id);
      widokMap.hidden = false;
      ustawMotyw(stan.kolorMapy(mapa));
      // Najpierw ostateczny układ (indeks, karta), dopiero potem pomiar mapy.
      ustawIndeks(indeksOtwarty);
      for (const [id, pl] of plansze) pl.hidden = id !== mapa.id;
      if (zmiana) zamknijPanel({ bezHasha: true });
      const p = await przygotujMape(mapa);
      if (biezaca.id !== mapa.id) return; // w międzyczasie przełączono gdzie indziej
      for (const [id, pl] of plansze) pl.hidden = id !== mapa.id;
      requestAnimationFrame(() => {
        p.pokazano();
        podswietlOdkrycia(); // miejsca odkryte, gdy gracz był na innej zakładce
      });
    } else {
      $(`widok-${wybor.id}`).hidden = false;
      ustawMotyw(stan.kolorKampanii());
      ustawIndeks(indeksOtwarty); // Notatki — indeks wszystkich map; Admin — bez indeksu
      if (wybor.id === "admin") {
        if (!admin) admin = new WidokAdmina($("widok-admin"), { stan, dane, rejestr });
        admin.render();
      }
      if (wybor.id === "notatki") notatki.render();
    }
    renderZakladek();
    if (!zHasha) zapiszHash();
  }

  function zapiszHash() {
    if (!biezaca) return;
    const czesc = biezaca.rodzaj === "mapa" && panel.id ? `${biezaca.id}/${panel.id}` : biezaca.id;
    try {
      history.replaceState(null, "", `#${czesc}`);
    } catch {
      /* np. strona otwarta z pliku */
    }
  }

  // ------------------------------------------------------------- miejsca
  async function pokazElement(id, { zIndeksu = false } = {}) {
    const element = stan.elementyWgId.get(id);
    if (!element || !stan.elementDlaUzytkownika(element)) return;
    if (!biezaca || biezaca.rodzaj !== "mapa" || biezaca.id !== element.mapa) await przelacz({ rodzaj: "mapa", id: element.mapa });
    const p = przegladarki.get(element.mapa);
    if (!p) return;
    if (zIndeksu && !SZEROKI.matches) ustawIndeks(false);
    panel.pokaz(id);
    p.przelicz();
    // Strefy i środki elementów liczymy po pokazaniu mapy — chwilę może to potrwać.
    if (!p.dekoracjeGotowe) {
      p.pokazano();
      await new Promise((r) => setTimeout(r, 60));
      if (document.fonts?.ready) await document.fonts.ready;
      if (!p.dekoracjeGotowe) p.przygotujDekoracje();
    }
    p.wybierz(id, { przesun: true });
    zapiszHash();
  }

  function zamknijPanel({ bezHasha = false } = {}) {
    if (!panel.id) return;
    const p = aktywnaPrzegladarka();
    panel.ukryj();
    if (p) {
      p.odznacz();
      p.przelicz();
    }
    if (!bezHasha) zapiszHash();
  }

  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "Escape" || document.querySelector("dialog[open]")) return;
    if (!indeksWezel.hidden && !SZEROKI.matches) ustawIndeks(false);
    else if (panel.id) {
      const id = panel.id;
      zamknijPanel();
      aktywnaPrzegladarka()?.fokus(id);
    }
  });

  // ------------------------------------------------------------- konto
  function renderKonta() {
    const konto = $("konto");
    wyczysc(konto);
    const s = stan.sesja;
    // U góry login konta (PlayerName), u dołu ekranu — jego nazwa (DisplayName).
    konto.append(el("span.konto-rola", ["KONTO: ", el("span.konto-login", { tekst: s.login, atrybuty: { title: s.login } })]));
    if (jestAdminem(s)) {
      const podglad = el("input.przelacznik", { atrybuty: { type: "checkbox", checked: stan.podgladGracza, id: "podglad-gracza" } });
      podglad.addEventListener("change", () => {
        stan.podgladGracza = podglad.checked;
        stan.powiadom("podglad");
      });
      konto.append(el("label.przelacznik-etykieta.konto-podglad", { atrybuty: { for: "podglad-gracza", title: "Pokaż mapy i indeks tak, jak widzą je gracze" } }, [podglad, el("span", ["PODGLĄD", el("span.tylko-szeroki", { tekst: " GRACZA" })])]));
    }
    konto.append(
      el("button.przycisk.przycisk-maly", {
        tekst: "WYLOGUJ",
        atrybuty: { type: "button" },
        zdarzenia: { click: () => wyczyscSesje() }
      })
    );
  }

  // Nowa nazwa konta (DisplayName) z bazy — napisy u góry i u dołu ekranu.
  // (Wylogowanie i zmianę roli obsługuje nasłuch na początku start().)
  poZmianieNazwyKonta = (nowa) => {
    stan.sesja = nowa;
    renderKonta();
    renderStatusu();
  };

  // ------------------------------------------------------------- status
  function renderStatusu() {
    const opis = {
      laczenie: "ŁĄCZENIE Z BAZĄ…",
      "na-zywo": "BAZA: NA ŻYWO",
      pamiec: "BAZA: DANE Z PAMIĘCI (BRAK POŁĄCZENIA?)",
      blad: "BAZA: BRAK DOSTĘPU"
    }[stan.polaczenie];
    const status = $("status");
    wyczysc(status);
    status.append(
      el("span", { klasa: `status-bazy status-${stan.polaczenie}`, tekst: opis }),
      el("span.status-konto", { tekst: `KONTO: ${nazwaKonta(stan.sesja)}` }),
      el("span.ozdoba", { tekst: `MAPA v${manifest.wersjaMapy || "?"}` }),
      el("span.ozdoba.ozdoba-dluga", { tekst: "+++ TRANSMISJA ZAKOŃCZONA POPRAWNIE +++" })
    );
  }

  function pokazBlad(e) {
    stan.polaczenie = "blad";
    const baner = $("baner");
    baner.textContent = opisBledu(e);
    baner.hidden = false;
    renderStatusu();
  }

  // ------------------------------------------------------------- reakcje na zmiany
  stan.sluchaj((co) => {
    if (co === "dokumentKampanii") admin?.render();
    if (co === "ustawienia" || co === "sesja" || co === "podglad") {
      renderKonta();
      odswiezMapy();
      // Bieżąca zakładka mogła zniknąć (admin ją ukrył) albo pojawić się pierwsza
      // (admin odsłonił zakładkę, gdy gracz nie miał żadnej) — przełącz na dostępną.
      const lista = zakladki();
      if (!biezaca ? lista.length > 0 : !lista.some((z) => z.rodzaj === biezaca.rodzaj && z.id === biezaca.id)) {
        przelacz(biezaca);
      } else if (biezaca?.rodzaj === "mapa") {
        ustawMotyw(stan.kolorMapy(stan.mapyWgId.get(biezaca.id)));
      } else {
        ustawMotyw(stan.kolorKampanii());
      }
      renderZakladek();
      indeks.render();
      panel.render();
      notatki.render();
      admin?.render();
    }
    // Po odświeżeniu map — odkryte miejsce jest już narysowane, więc może mrugać.
    if (co === "ustawienia") sprawdzOdkrycia();
    if (co === "notatki") {
      odswiezMapy(); // czerwone kropki przy miejscach z notatkami
      indeks.render();
      panel.render();
      notatki.render();
    }
    renderStatusu();
  });

  // ------------------------------------------------------------- start
  renderKonta();
  renderStatusu();
  poZmianieKampanii = (dokument) => stan.ustaw("dokumentKampanii", dokument);
  poBledzieKampanii = pokazBlad;
  dane.subskrybujUstawienia((u, meta) => {
    stan.polaczenie = meta.fromCache ? "pamiec" : "na-zywo";
    $("baner").hidden = true;
    stan.ustaw("ustawienia", u);
  }, pokazBlad);
  dane.subskrybuj("notatki", (w) => stan.ustaw("notatki", w), pokazBlad);

  // Zakładka z adresu (#okolice, #okolice/kopiec-iliac, #notatki…).
  // Bez adresu zakładki: pierwsza dostępna (Notatki).
  const celZHasha = () => {
    const [czesc, element] = decodeURIComponent((location.hash || "").slice(1)).split("/");
    const cel = stan.mapyWgId.has(czesc) ? { rodzaj: "mapa", id: czesc } : czesc ? { rodzaj: "widok", id: czesc } : null;
    return { cel, element };
  };
  const poczatek = celZHasha();
  await przelacz(poczatek.cel, { zHasha: true });
  if (poczatek.element) pokazElement(poczatek.element);
  // Ręczna zmiana adresu albo przycisk „wstecz” w obrębie strony.
  window.addEventListener("hashchange", async () => {
    const nowy = celZHasha();
    await przelacz(nowy.cel, { zHasha: true });
    if (nowy.element) pokazElement(nowy.element);
  });
}

start();
