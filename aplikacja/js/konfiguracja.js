// Stałe aplikacji. Nazwy kolekcji i pól w Firestore: po polsku, bez polskich znaków.

/** Kolekcje kampanii: kampanie/{kampaniaId}/{podkolekcja}/{dokument}. */
export const KOLEKCJA_KAMPANII = "kampanie";
export const PODKOLEKCJE = ["notatki", "postep", "powiazania", "ustawienia"];
export const DOKUMENT_USTAWIEN = "mapy"; // kampanie/{id}/ustawienia/mapy

/** Kolekcje kont — utworzone ręcznie przez właściciela. Aplikacja ich NIE zmienia
 *  (wyjątek: przywracanie kopii, jeśli plik je zawiera — rozdz. 8 polecenia). */
export const KOLEKCJA_ADMINOW = "admins";
export const KOLEKCJA_SEKRETOW = "secrets";

/** Motywy ekranu. Kolory muszą być zgodne z aplikacja/css/slate.css
 *  i z MOTYWY w narzedzia/przygotuj_mape.py. */
export const MOTYWY = {
  zielony: "zielony",
  bursztynowy: "bursztynowy"
};
export const MOTYW_DOMYSLNY = "zielony";

export const KATEGORIE_NOTATEK = [
  ["miejsce", "Miejsce"],
  ["rod", "Ród"],
  ["postac", "Postać"],
  ["organizacja", "Organizacja"],
  ["watek", "Wątek"],
  ["inne", "Inne"]
];

export const STANY_POSTEPU = [
  ["otwarte", "Otwarte"],
  ["w-toku", "W toku"],
  ["zamkniete", "Zamknięte"]
];

export const RODZAJE_POWIAZAN = [
  ["sojusz", "Sojusz"],
  ["wrogosc", "Wrogość"],
  ["dlug", "Dług"],
  ["malzenstwo", "Małżeństwo"],
  ["zaleznosc", "Zależność"],
  ["niepewne", "Niepewne"],
  ["inne", "Inne"]
];

/** Ograniczenia długości pól (ochrona przed przypadkowym wklejeniem ogromnego tekstu). */
export const LIMITY = {
  tytul: 200,
  tresc: 20000,
  podpis: 80,
  nazwaStrony: 120
};

export const KLUCZ_SESJI = "notatkirpg.sesja";
export const KLUCZ_PODPISU = "notatkirpg.podpis";
export const KLUCZ_INDEKSU = "notatkirpg.indeks";

export function etykieta(lista, klucz) {
  const para = lista.find(([k]) => k === klucz);
  return para ? para[1] : klucz || "";
}
