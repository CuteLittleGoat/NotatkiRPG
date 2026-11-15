// Stałe aplikacji. Nazwy kolekcji i pól w Firestore: po polsku, bez polskich znaków.

/** Kolekcje kampanii: kampanie/{kampaniaId}/{podkolekcja}/{dokument}. */
export const KOLEKCJA_KAMPANII = "kampanie";
export const PODKOLEKCJE = ["notatki", "ustawienia"];
export const DOKUMENT_USTAWIEN = "mapy"; // kampanie/{id}/ustawienia/mapy

/** Kolekcje kont — utworzone ręcznie przez właściciela. Aplikacja je tylko czyta
 *  (reguły bazy nie pozwalają ich zmieniać; przywracanie kopii je pomija). */
export const KOLEKCJA_ADMINOW = "admins";
export const KOLEKCJA_SEKRETOW = "secrets";

/** Motywy ekranu: identyfikator → nazwa na liście admina. Kolory motywów fosforu
 *  muszą być zgodne z aplikacja/css/slate.css i z MOTYWY w narzedzia/przygotuj_mape.py.
 *  „oryginalny” — mapa w kolorach rysunku, interfejs zielony (tylko dla map). */
export const MOTYWY = {
  zielony: "zielony",
  bursztynowy: "bursztynowy",
  czerwony: "czerwony",
  oryginalny: "kolory oryginału"
};
export const MOTYW_DOMYSLNY = "zielony";
export const MOTYW_ORYGINALNY = "oryginalny";
/** Motywy ekranu poza mapami (bez „oryginalny” — tam nie ma czego pokazać w oryginale). */
export const MOTYWY_EKRANU = Object.fromEntries(Object.entries(MOTYWY).filter(([k]) => k !== MOTYW_ORYGINALNY));

/** Zakładki inne niż mapy. Każdą admin może ukryć albo odsłonić graczom
 *  (ustawienia: kampanie/{id}/ustawienia/mapy → pole „zakladki”). Kolejność = kolejność
 *  w pasku zakładek (przed mapami). */
export const ZAKLADKI_STALE = [{ id: "notatki", nazwa: "Notatki", widocznaDomyslnie: true }];

/** Ograniczenia długości pól (ochrona przed przypadkowym wklejeniem ogromnego tekstu). */
export const LIMITY = {
  tytul: 200,
  tresc: 20000,
  podpis: 80
};

export const KLUCZ_SESJI = "notatkirpg.sesja";
export const KLUCZ_LOGU = "notatkirpg.log"; // log komunikatów admina (sessionStorage)
export const KLUCZ_PODPISU = "notatkirpg.podpis";
export const KLUCZ_INDEKSU = "notatkirpg.indeks";
