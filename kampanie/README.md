# Kampanie — mapy i manifesty

Każda kampania ma tu własny folder, np. `kampanie/Iliac/`, i
wpis w rejestrze [`kampanie.json`](../kampanie.json) w katalogu głównym.

## Co jest w folderze kampanii

| Plik | Co to jest |
|---|---|
| `kampania.json` | **manifest** — mapy (zakładki), miejsca, nazwy, opisy, ustawienia domyślne |
| `mapa_*.svg` | mapy dla graczy w stylu Data-Slate — **robi je skrypt**, nie edytuj ręcznie |
| rysunek od MG, np. `Rysunki_*.svg` | wzór od Mistrza Gry, **zawiera spoilery** — aplikacja go nie wczytuje |
| `README.md` | opis kampanii |

Aplikacja wczytuje tylko manifest i pliki map wskazane w manifeście. Rysunki od MG
leżą w repozytorium (to w porządku — gracze korzystają tylko ze stron aplikacji).

## Konwencja rysunku od MG

Żeby skrypt sam zrobił z rysunku mapę dla graczy, rysunek SVG musi mieć znaczniki:

* **miejsce klikalne** — grupa z identyfikatorem:
  `<g data-element="iglica-sentinel"> … kształty i podpis … </g>`
* **treść tylko dla MG** — grupa z klasą:
  `<g class="tylko-mg"> … </g>`
  Wszystko w tych grupach (z podpisami, liniami, legendą) skrypt usuwa.

Zasady identyfikatorów (`data-element`):

* małe litery bez polskich znaków, cyfry i myślniki, np. `port-sw-betony`;
* **raz nadanego identyfikatora nie zmieniamy** — notatki graczy są przypięte do
  identyfikatora, nie do nazwy;
* każdy identyfikator występuje na rysunku tylko raz.

Skrypt dodatkowo pilnuje bezpieczeństwa: jeśli **poza** grupami `tylko-mg`
znajdzie dopisek „dla MG” albo czerwoną linię przerywaną (w legendzie MG: „to, o
czym postacie nie wiedzą”), **przerywa pracę i niczego nie zapisuje**. Podaje
tylko numer i rodzaj podejrzanego elementu, nigdy jego treść (żeby osoba
uruchamiająca skrypt nie zobaczyła spoilera).

## Nowa wersja rysunku — krok po kroku

1. Wgraj nowy rysunek do folderu kampanii (pod tą samą nazwą co poprzedni albo
   pod nową — wtedy popraw `zrodlo.plik` w manifeście).
2. Uruchom skrypt (z katalogu głównego repozytorium; wystarczy Python 3.9+):

   ```bash
   python3 narzedzia/przygotuj_mape.py kampanie/Iliac --sprawdz
   ```

   Tryb `--sprawdz` niczego nie zapisuje — tylko pokazuje raport.
3. Przeczytaj raport:
   * **NOWE ELEMENTY** — miejsca z rysunku, których nie ma w manifeście. Skrypt
     wypisuje gotowe wpisy JSON; dopisz do `elementy` w `kampania.json` te, które
     mają być klikalne (popraw nazwę, opis, kategorię, `dostepnyDomyslnie`).
   * **BRAK NA RYSUNKU** — miejsce jest w manifeście, ale zniknęło z rysunku. Jego
     notatki nie giną: trafią do listy „Notatki bez miejsca na mapie”.
   * **UWAGA** — np. miejsce trafiło na inną mapę niż w manifeście (sprawdź `obszar`).
   * **BŁĄD** — znalezione ślady materiału MG poza grupami `tylko-mg` → popraw rysunek.
4. Gdy raport jest w porządku, wygeneruj mapy:

   ```bash
   python3 narzedzia/przygotuj_mape.py kampanie/Iliac
   ```

5. Zmień `wersjaMapy` w manifeście (data), zapisz zmiany i wypchnij je na `main` —
   strona opublikuje się sama.

**Zmiana nazwy miejsca:** zmień `nazwa` w manifeście, a starą nazwę dopisz do
`aliasy` (wyszukiwarka nadal ją znajdzie). Identyfikatora nie zmieniaj.

**Nowe miejsce:** nowa grupa `<g data-element="…">` na rysunku + nowy wpis w manifeście.

## Nowa kampania — krok po kroku

1. Utwórz folder `kampanie/NazwaKampanii/`.
2. Skopiuj do niego szablon [`narzedzia/szablon_kampanii/kampania.json`](../narzedzia/szablon_kampanii/kampania.json)
   i uzupełnij (opis pól niżej). Wgraj rysunek od MG ze znacznikami.
3. Dopisz kampanię do [`kampanie.json`](../kampanie.json):
   `{ "id": "nazwa", "nazwa": "Nazwa", "folder": "kampanie/NazwaKampanii" }`.
   `id` — małe litery bez polskich znaków, cyfry i myślniki, najwyżej 40 znaków
   (tego pilnują reguły bazy); pod nim zapiszą się dane w bazie (`kampanie/{id}`) i
   **nie należy go potem zmieniać**. Pola opcjonalne: `opis` (krótki napis pod
   nazwą na liście kampanii) i `widocznaDomyslnie` — bez niego nowa kampania jest
   **ukryta przed graczami**, dopóki admin nie zaznaczy jej na liście „WYBIERZ
   KAMPANIĘ” (`true` = od razu widoczna). Nazwę z rejestru da się przeczytać w
   pliku — wpisuj tylko taką, która niczego nie zdradza.
4. Uruchom skrypt map (jak wyżej). Kod aplikacji się nie zmienia.

## Manifest `kampania.json` — pola

| Pole | Znaczenie |
|---|---|
| `id`, `nazwa`, `naglowek` | identyfikator (jak w rejestrze), nazwa, napis w nagłówku ekranu |
| `wersjaMapy` | data wersji map (widoczna na dole ekranu) |
| `kolor` | kolor ekranu poza mapami: `zielony` albo `bursztynowy` (admin może zmienić w aplikacji) |
| `mapy[]` | zakładki z mapami, w kolejności wyświetlania |
| `mapy[].id`, `nazwa`, `plik` | identyfikator mapy, nazwa zakładki, plik mapy dla graczy |
| `mapy[].kolor` | kolor ekranu na tej mapie |
| `mapy[].widocznaDomyslnie` | czy gracze widzą zakładkę, dopóki admin tego nie zmieni |
| `mapy[].start` | punkt `{x, y}` rysunku, na którym mapa otwiera się na małym ekranie |
| `mapy[].zrodlo` | dla skryptu: `plik` (rysunek MG) i `obszar` (`"x y szerokość wysokość"` — fragment rysunku z tą mapą). Aplikacja z tego nie korzysta. |
| `kategorie` | nazwy grup w indeksie, np. `"iglica": "Iglice"` (kolejność = kolejność w indeksie) |
| `elementy[]` | miejsca klikalne |
| `elementy[].id` | identyfikator — taki sam jak `data-element` na rysunku |
| `elementy[].nazwa`, `aliasy` | nazwa wyświetlana; dawne/inne nazwy (dla wyszukiwarki) |
| `elementy[].kategoria`, `opis` | grupa w indeksie; krótki **jawny** opis w karcie miejsca |
| `elementy[].mapa` | na której mapie leży miejsce |
| `elementy[].dostepnyDomyslnie` | czy miejsce jest klikalne dla graczy, dopóki admin tego nie zmieni |
| `elementy[].mapaSzczegolowa` | (opcjonalnie) mapa z planem tego miejsca — karta pokaże przycisk „Otwórz mapę” |

Pamiętaj: manifest jest publiczny. Admin może ukryć miejsce w aplikacji, ale jego
nazwę i opis da się przeczytać w pliku — wpisuj tylko rzeczy jawne.
