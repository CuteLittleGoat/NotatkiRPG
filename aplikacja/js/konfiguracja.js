// Stałe aplikacji. Nazwy kolekcji i pól w Firestore: po polsku, bez polskich znaków.

/** Kolekcje kampanii: kampanie/{kampaniaId}/{podkolekcja}/{dokument}. */
export const KOLEKCJA_KAMPANII = "kampanie";
export const PODKOLEKCJE = ["notatki", "ustawienia"];
export const DOKUMENT_USTAWIEN = "mapy"; // kampanie/{id}/ustawienia/mapy

/** Kolekcje kont — utworzone ręcznie przez właściciela. Aplikacja je tylko czyta
 *  (reguły bazy nie pozwalają ich zmieniać; przywracanie kopii je pomija). */
export const KOLEKCJA_ADMINOW = "admins";
export const KOLEKCJA_SEKRETOW = "secrets";

/** Motywy ekranu. Kolory muszą być zgodne z aplikacja/css/slate.css
 *  i z MOTYWY w narzedzia/przygotuj_mape.py. */
export const MOTYWY = {
  zielony: "zielony",
  bursztynowy: "bursztynowy"
};
export const MOTYW_DOMYSLNY = "zielony";

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

/** Profil „Skryba” (może pisać notatki): konto, którego pole DisplayName w bazie
 *  brzmi tak (bez względu na wielkość liter). Inne konta graczy tylko czytają. */
export const NAZWA_SKRYBY = "skryba";

export const KLUCZ_SESJI = "notatkirpg.sesja";
export const KLUCZ_LOGU = "notatkirpg.log"; // log komunikatów admina (sessionStorage)
export const KLUCZ_PODPISU = "notatkirpg.podpis";
export const KLUCZ_INDEKSU = "notatkirpg.indeks";
