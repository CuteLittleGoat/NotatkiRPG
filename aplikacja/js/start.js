// Strona startowa (index.html): wybór kampanii i logowanie.
// Moduł logowania (a z nim Firebase) ładujemy osobno — gdyby serwer Firebase był
// niedostępny, lista kampanii i tak się pokaże.
import { naZmianeSesji, opisRoli, pobierzSesje, wyczyscSesje } from "./sesja.js";
import { el, wczytajJson, wyczysc } from "./narzedzia.js";

async function pokazKampanie() {
  const lista = document.getElementById("kampanie");
  try {
    const rejestr = await wczytajJson("kampanie.json");
    wyczysc(lista);
    for (const k of rejestr.kampanie || []) {
      lista.append(
        el("li", [
          el("a.kampania", { atrybuty: { href: `kampania.html?k=${encodeURIComponent(k.id)}` } }, [
            el("span.kampania-nazwa", { tekst: `▸ ${String(k.nazwa || k.id).toUpperCase()}` }),
            k.opis ? el("span.kampania-opis", { tekst: k.opis }) : null
          ])
        ])
      );
    }
    if (!lista.children.length) lista.append(el("li.przygaszony", { tekst: "Rejestr kampanii jest pusty." }));
  } catch (e) {
    wyczysc(lista);
    lista.append(el("li.formularz-blad", { tekst: `Nie udało się wczytać listy kampanii: ${e.message}` }));
  }
}

async function pokazLogowanie() {
  const tresc = document.getElementById("logowanie-tresc");
  let formularzLogowania = null;
  try {
    ({ formularzLogowania } = await import("./logowanie.js"));
  } catch {
    wyczysc(tresc);
    tresc.append(el("p.formularz-blad", { tekst: "Nie udało się połączyć z Firebase — logowanie chwilowo niedostępne. Sprawdź internet i odśwież stronę." }));
    return;
  }
  const render = (sesja) => {
    wyczysc(tresc);
    if (sesja) {
      tresc.append(
        el("p", { tekst: `Zalogowano na konto: ${sesja.login} (${opisRoli(sesja).toLowerCase()}).` }),
        el("p.przygaszony", { tekst: "Sesja trwa do zamknięcia tej karty przeglądarki." }),
        el("button.przycisk", { tekst: "WYLOGUJ", atrybuty: { type: "button" }, zdarzenia: { click: () => wyczyscSesje() } })
      );
      return;
    }
    const { formularz } = formularzLogowania();
    tresc.append(
      el("p.przygaszony", {
        tekst: "Bez logowania możesz tylko przeglądać. Gracze dzielą jedno konto — przy każdym wpisie można podać swój podpis."
      }),
      formularz
    );
  };
  render(pobierzSesje());
  naZmianeSesji(render);
}

pokazKampanie();
pokazLogowanie();
