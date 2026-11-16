// Dwa ustawienia admina przy każdym miejscu (Analizy/Spoilery.md, wariant A):
//   👁 „widoczne” — gracze widzą miejsce na mapie (ustawienia/mapy → elementyWidoczne.{id});
//   ◈ „klikalne” — gracze mogą je kliknąć, czytać i pisać notatki (→ elementy.{id}).
// „Klikalne” da się zaznaczyć tylko przy zaznaczonym „widoczne” (inaczej pole jest
// nieaktywne). Odkrycie wymaga potwierdzenia — przypadkowe kliknięcie w trakcie sesji
// zdradziłoby tajemnicę. Zasłonięcie odznacza też „klikalne” (jeden zapis, więc pola
// zawsze pokazują to, co mają gracze).
// Wspólne dla indeksu, karty miejsca i zakładki Admin.
import { el, komunikat, opisBledu, potwierdz } from "./narzedzia.js";

export const IKONA_WIDOCZNE = "👁";
export const IKONA_KLIKALNE = "◈";

/** Zapis widoczności miejsca; przed odkryciem pyta o potwierdzenie. Zwraca true po zapisie. */
export async function ustawWidocznosc({ stan, dane, element, widoczne }) {
  if (widoczne) {
    const mapa = stan.mapyWgId.get(element.mapa);
    const zakladkaUkryta = Boolean(mapa) && !stan.mapaWidocznaDlaGraczy(mapa);
    const ok = await potwierdz(
      zakladkaUkryta
        ? `Odkryć graczom „${element.nazwa}”? Zobaczą to miejsce, gdy odsłonisz zakładkę „${mapa.nazwa}”.`
        : `Odkryć graczom „${element.nazwa}”? Zobaczą to miejsce od razu na mapie${mapa ? ` „${mapa.nazwa}”` : ""}.`,
      { tak: "ODKRYJ" }
    );
    if (!ok) return false;
  }
  const zmiany = widoczne
    ? { elementyWidoczne: { [element.id]: true } }
    : { elementyWidoczne: { [element.id]: false }, elementy: { [element.id]: false } };
  try {
    await dane.zapiszUstawienia(zmiany, stan.sesja);
    komunikat(widoczne ? `Odkryto graczom: „${element.nazwa}”.` : `Zasłonięto przed graczami: „${element.nazwa}”.`, "ok");
    return true;
  } catch (e) {
    komunikat(opisBledu(e), "blad", 8000);
    return false;
  }
}

/** Zapis klikalności miejsca (interfejs pozwala na to tylko przy miejscu widocznym). */
export async function ustawKlikalnosc({ stan, dane, element, klikalne }) {
  try {
    await dane.zapiszUstawienia({ elementy: { [element.id]: klikalne } }, stan.sesja);
    komunikat(klikalne ? `Miejsce „${element.nazwa}” klikalne dla graczy.` : `Miejsce „${element.nazwa}” nieklikalne dla graczy.`, "ok");
    return true;
  } catch (e) {
    komunikat(opisBledu(e), "blad", 8000);
    return false;
  }
}

/**
 * Para pól wyboru 👁 i ◈ dla miejsca (tylko admin).
 * @param {object} o { stan, dane, element, oczekujace (Map — zapisy w toku, wspólna dla
 *   widoku; nowa wartość widać, zanim baza ją potwierdzi), idPola (przedrostek id pól),
 *   poZmianie() — wywoływane po zapisie albo rezygnacji }
 * @returns {{ widoczne: HTMLInputElement, klikalne: HTMLInputElement, odswiez: Function }}
 */
export function polaMiejsca({ stan, dane, element, oczekujace = new Map(), idPola = null, poZmianie = null }) {
  const kluczW = `${element.id}:widoczne`;
  const kluczK = `${element.id}:klikalne`;
  const widoczne = el("input.przelacznik.pole-widoczne", {
    atrybuty: {
      type: "checkbox",
      title: "Widoczne dla graczy (narysowane na mapie)",
      "aria-label": `Widoczne dla graczy: ${element.nazwa}`,
      ...(idPola ? { id: `${idPola}-widoczne` } : {})
    }
  });
  const klikalne = el("input.przelacznik.pole-klikalne", {
    atrybuty: {
      type: "checkbox",
      "aria-label": `Klikalne dla graczy: ${element.nazwa}`,
      ...(idPola ? { id: `${idPola}-klikalne` } : {})
    }
  });

  const odswiez = () => {
    const w = oczekujace.has(kluczW) ? oczekujace.get(kluczW) : stan.elementWidoczny(element);
    const k = oczekujace.has(kluczK) ? oczekujace.get(kluczK) : stan.elementZaznaczony(element);
    widoczne.checked = w;
    klikalne.checked = w && k;
    klikalne.disabled = !w;
    klikalne.title = w
      ? "Klikalne dla graczy (karta miejsca i notatki)"
      : "Najpierw zaznacz „widoczne” — zasłoniętego miejsca gracze nie mogą kliknąć";
  };

  widoczne.addEventListener("change", async () => {
    const wartosc = widoczne.checked;
    oczekujace.set(kluczW, wartosc);
    if (!wartosc) oczekujace.set(kluczK, false);
    odswiez();
    try {
      await ustawWidocznosc({ stan, dane, element, widoczne: wartosc });
    } finally {
      oczekujace.delete(kluczW);
      oczekujace.delete(kluczK);
      odswiez();
      poZmianie?.();
    }
  });
  klikalne.addEventListener("change", async () => {
    oczekujace.set(kluczK, klikalne.checked);
    try {
      await ustawKlikalnosc({ stan, dane, element, klikalne: klikalne.checked });
    } finally {
      oczekujace.delete(kluczK);
      odswiez();
      poZmianie?.();
    }
  });
  odswiez();
  return { widoczne, klikalne, odswiez };
}
