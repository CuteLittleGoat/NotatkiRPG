// Strona startowa (index.html): logowanie, a po zalogowaniu wybór kampanii.
// Bez logowania strona nie pokazuje niczego poza formularzem (ani nazw kampanii).
// Admin widzi wszystkie kampanie z rejestru i przy każdej pole „widoczna dla
// graczy”; gracze (Skryba, Gracz) — tylko kampanie udostępnione przez admina.
// Moduły z Firebase ładujemy osobno — gdyby serwer Firebase był niedostępny,
// strona pokaże zrozumiały komunikat zamiast pustego ekranu.
import { jestAdminem, kampaniaDlaUzytkownika, kampaniaWidocznaDlaGraczy, naZmianeSesji, nazwaKonta, pobierzSesje, wyczyscSesje } from "./sesja.js";
import { el, komunikat, opisBledu, parametrAdresu, ustawTrybKomunikatow, wczytajJson, wyczysc } from "./narzedzia.js";

const $ = (id) => document.getElementById(id);

let moduly = null; // logowanie.js i dane.js (z Firebase)
async function wczytajModuly() {
  if (!moduly) {
    const [logowanie, dane] = await Promise.all([import("./logowanie.js"), import("./dane.js")]);
    moduly = {
      formularzLogowania: logowanie.formularzLogowania,
      subskrybujKampanie: dane.subskrybujKampanie,
      zapiszWidocznoscKampanii: dane.zapiszWidocznoscKampanii
    };
  }
  return moduly;
}

let rejestr = null; // kampanie.json — wczytywany dopiero po zalogowaniu
let dokumenty = null; // Map id → dane kampanii z bazy (null = jeszcze nie przyszły)
let koniecNasluchu = null;
let przekierowanie = null; // { id, hash } z odnośnika — po zalogowaniu wracamy do kampanii
let pokolenie = 0; // chroni przed spóźnionym wczytaniem po wylogowaniu
const pozycje = new Map(); // id → { wpis, li, link, pole, opisPola, oczekuje }

// ------------------------------------------------------------- konto
function renderKonta(sesja) {
  const konto = $("konto");
  wyczysc(konto);
  konto.hidden = !sesja;
  $("status-konto").hidden = !sesja;
  if (!sesja) return;
  konto.append(
    el("span.konto-rola", ["KONTO: ", el("span.konto-login", { tekst: sesja.login, atrybuty: { title: sesja.login } })]),
    el("button.przycisk.przycisk-maly", { tekst: "WYLOGUJ", atrybuty: { type: "button" }, zdarzenia: { click: () => wyczyscSesje() } })
  );
  $("status-konto").textContent = `KONTO: ${nazwaKonta(sesja)}`;
}

// ------------------------------------------------------------- logowanie
async function pokazLogowanie(moje) {
  const tresc = $("logowanie-tresc");
  let m;
  try {
    m = await wczytajModuly();
  } catch {
    if (moje !== pokolenie) return;
    wyczysc(tresc);
    tresc.append(el("p.formularz-blad", { tekst: "Nie udało się połączyć z Firebase — logowanie chwilowo niedostępne. Sprawdź internet i odśwież stronę." }));
    return;
  }
  if (moje !== pokolenie) return;
  wyczysc(tresc);
  const { formularz } = m.formularzLogowania(() => {
    // Przyszliśmy tu z odnośnika do kampanii (np. zakładki w przeglądarce) — wrócimy tam.
    const k = parametrAdresu("k");
    if (k) {
      przekierowanie = { id: k, hash: location.hash };
      sprawdzPrzekierowanie(pobierzSesje());
    }
  });
  tresc.append(el("p.przygaszony", { tekst: "Zaloguj się, aby zobaczyć kampanie, mapy i notatki drużyny." }), formularz);
}

// ------------------------------------------------------------- lista kampanii
async function pokazKampanie(sesja, moje) {
  const admin = jestAdminem(sesja);
  const lista = $("kampanie");
  const opis = $("opis-listy");
  $("sekcja-kampanii").hidden = false;
  wyczysc(lista);
  pozycje.clear();
  opis.hidden = !admin;
  opis.textContent = admin
    ? "Zaznaczona kampania jest widoczna dla graczy (Skryby i Gracza). Odznaczoną widzisz tylko Ty — możesz ją spokojnie przygotowywać."
    : "";
  lista.append(el("li.przygaszony", { tekst: "Wczytywanie…", atrybuty: { id: "kampanie-ladowanie" } }));

  let m;
  try {
    [m, rejestr] = await Promise.all([wczytajModuly(), rejestr ? Promise.resolve(rejestr) : wczytajJson("kampanie.json")]);
  } catch (e) {
    if (moje !== pokolenie) return;
    wyczysc(lista);
    lista.append(el("li.formularz-blad", { tekst: `Nie udało się wczytać listy kampanii: ${e.message}` }));
    return;
  }
  if (moje !== pokolenie) return;

  wyczysc(lista);
  for (const wpis of rejestr.kampanie || []) {
    const nazwa = String(wpis.nazwa || wpis.id);
    const link = el("a.kampania", { atrybuty: { href: `kampania.html?k=${encodeURIComponent(wpis.id)}` } }, [
      el("span.kampania-nazwa", { tekst: `▸ ${nazwa.toUpperCase()}` }),
      wpis.opis ? el("span.kampania-opis", { tekst: wpis.opis }) : null
    ]);
    // Gracze: pozycja trafia na stronę dopiero, gdy baza potwierdzi, że kampania jest udostępniona.
    const li = el("li.kampania-pozycja", { atrybuty: { hidden: !admin } }, [link]);
    const pozycja = { wpis, li, link, oczekuje: undefined };
    if (admin) {
      pozycja.pole = el("input.przelacznik", {
        atrybuty: { type: "checkbox", disabled: true, "aria-label": `Kampania ${nazwa} widoczna dla graczy` }
      });
      pozycja.opisPola = el("span");
      pozycja.pole.addEventListener("change", () => przelaczKampanie(pozycja, pozycja.pole.checked, sesja));
      li.append(el("label.przelacznik-etykieta.kampania-przelacznik", [pozycja.pole, pozycja.opisPola]));
    }
    pozycje.set(wpis.id, pozycja);
    if (admin) lista.append(li);
  }
  lista.append(
    el("li.przygaszony", {
      tekst: admin ? "Rejestr kampanii jest pusty." : "Mistrz Gry nie udostępnił jeszcze żadnej kampanii.",
      atrybuty: { id: "kampanie-pusto", hidden: true }
    }),
    el("li.formularz-blad", { atrybuty: { id: "kampanie-blad", hidden: true } })
  );
  odswiezListe(sesja);

  koniecNasluchu?.();
  koniecNasluchu = m.subskrybujKampanie(
    (mapa) => {
      if (moje !== pokolenie) return;
      dokumenty = mapa;
      $("kampanie-blad").hidden = true;
      odswiezListe(sesja);
      sprawdzPrzekierowanie(sesja);
    },
    (e) => {
      if (moje !== pokolenie) return;
      dokumenty = null;
      odswiezListe(sesja);
      const blad = $("kampanie-blad");
      blad.textContent = opisBledu(e);
      blad.hidden = false;
    }
  );
}

function odswiezListe(sesja) {
  const admin = jestAdminem(sesja);
  const gotowe = dokumenty !== null;
  const lista = $("kampanie");
  const pusto = $("kampanie-pusto");
  let widocznych = 0;
  for (const p of pozycje.values()) {
    const dokument = dokumenty?.get(p.wpis.id) || null;
    const widoczna = kampaniaWidocznaDlaGraczy(p.wpis, dokument);
    // Zapis w toku: pokazujemy nową wartość, aż baza ją potwierdzi.
    if (p.oczekuje !== undefined && p.oczekuje === widoczna) p.oczekuje = undefined;
    const pokaz = p.oczekuje ?? widoczna;
    const naLiscie = admin || (gotowe && kampaniaDlaUzytkownika(sesja, p.wpis, dokument));
    // Gracze: kampanii nieudostępnionych w ogóle nie ma na stronie (także w jej kodzie).
    // Kolejność jak w rejestrze; u admina pozycje stoją w miejscu (nie gubią fokusu).
    if (!admin) {
      if (naLiscie && pusto) lista.insertBefore(p.li, pusto);
      else p.li.remove();
    }
    p.li.hidden = !naLiscie;
    if (naLiscie) widocznych++;
    if (p.pole) {
      p.li.classList.toggle("kampania-ukryta", !pokaz);
      p.pole.checked = pokaz;
      p.pole.disabled = !gotowe;
      p.opisPola.textContent = pokaz ? "widoczna dla graczy" : "⊘ ukryta przed graczami";
    }
  }
  $("kampanie-ladowanie")?.remove();
  if (pusto) pusto.hidden = !(admin || gotowe) || widocznych > 0;
}

async function przelaczKampanie(pozycja, widoczna, sesja) {
  const nazwa = pozycja.wpis.nazwa || pozycja.wpis.id;
  pozycja.oczekuje = widoczna;
  odswiezListe(sesja);
  try {
    await moduly.zapiszWidocznoscKampanii(pozycja.wpis, widoczna, sesja);
    komunikat(widoczna ? `Kampania „${nazwa}” widoczna dla graczy.` : `Kampania „${nazwa}” ukryta przed graczami.`, "ok");
  } catch (e) {
    pozycja.oczekuje = undefined;
    odswiezListe(sesja);
    komunikat(opisBledu(e), "blad", 8000);
  }
}

function sprawdzPrzekierowanie(sesja) {
  if (!przekierowanie || !sesja || dokumenty === null) return;
  const cel = przekierowanie;
  przekierowanie = null;
  const p = pozycje.get(cel.id);
  if (p && kampaniaDlaUzytkownika(sesja, p.wpis, dokumenty.get(cel.id) || null)) {
    location.href = `kampania.html?k=${encodeURIComponent(cel.id)}${cel.hash || ""}`;
  }
}

// ------------------------------------------------------------- całość
function render(sesja) {
  const moje = ++pokolenie;
  renderKonta(sesja);
  // Admin: potwierdzenia trafiają też do logu (widać go w zakładce Admin kampanii).
  ustawTrybKomunikatow({ log: jestAdminem(sesja) });
  $("sekcja-logowania").hidden = Boolean(sesja);
  if (sesja) {
    pokazKampanie(sesja, moje);
    return;
  }
  koniecNasluchu?.();
  koniecNasluchu = null;
  dokumenty = null;
  pozycje.clear();
  $("sekcja-kampanii").hidden = true;
  wyczysc($("kampanie"));
  pokazLogowanie(moje);
}

render(pobierzSesje());
naZmianeSesji(render);
