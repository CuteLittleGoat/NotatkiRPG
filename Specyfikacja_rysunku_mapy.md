# Specyfikacja rysunku mapy — plik źródłowy dla interaktywnej mapy

Plik pomocniczy dla agenta AI (albo człowieka), który **przygotowuje rysunek mapy**
dla aplikacji NotatkiRPG. Opisuje, jaki plik ma powstać, jakie musi mieć znaczniki,
czego w nim nie wolno używać i jak sprawdzić, czy jest gotowy.

Wszystko poniżej sprawdzono na kodzie skryptu `narzedzia/przygotuj_mape.py` i
przeglądarki map `aplikacja/js/mapa.js` (stan z 2026-11-15). Gdy kod się zmieni,
pierwszeństwo ma kod — popraw wtedy ten plik.

> **Najkrócej:** jeden plik **SVG** (nie HTML); kolory wpisane w atrybuty
> `fill`/`stroke` jako `#rrggbb`; rysunek ma dobrze wyglądać **w swoich kolorach**
> (tryb „kolory oryginału”) i mieć wyraźne różnice **jasności** (motywy fosforu:
> zielony, bursztynowy, czerwony); każde klikalne miejsce w osobnej grupie
> `<g data-element="id-miejsca">` z podpisem `<text>`, wszystko tajne w
> `<g class="tylko-mg">`, każda mapa w osobnym, nienachodzącym prostokącie rysunku.
> Na koniec: `python3 narzedzia/przygotuj_mape.py kampanie/NazwaKampanii --sprawdz`.

## Spis treści

1. [To jest plik SVG, a nie HTML](#1-to-jest-plik-svg-a-nie-html)
2. [Jak rysunek staje się interaktywną mapą](#2-jak-rysunek-staje-się-interaktywną-mapą)
3. [Wymagania dotyczące pliku](#3-wymagania-dotyczące-pliku)
4. [Układ rysunku: panele i obszary map](#4-układ-rysunku-panele-i-obszary-map)
5. [Znacznik 1: miejsce klikalne `data-element`](#5-znacznik-1-miejsce-klikalne-data-element)
6. [Znacznik 2: treść tylko dla MG `tylko-mg`](#6-znacznik-2-treść-tylko-dla-mg-tylko-mg)
7. [Znacznik 3: napis z obwódką `h`](#7-znacznik-3-napis-z-obwódką-h)
8. [Kolory i sposób rysowania](#8-kolory-i-sposób-rysowania)
9. [Napisy i czytelność](#9-napisy-i-czytelność)
10. [Dozwolone i zakazane elementy SVG](#10-dozwolone-i-zakazane-elementy-svg)
11. [Manifest kampanii — co trzeba w nim ustawić](#11-manifest-kampanii--co-trzeba-w-nim-ustawić)
12. [Sprawdzenie gotowego rysunku](#12-sprawdzenie-gotowego-rysunku)
13. [Typowe błędy](#13-typowe-błędy)
14. [Nowa wersja istniejącego rysunku](#14-nowa-wersja-istniejącego-rysunku)
15. [Lista kontrolna](#15-lista-kontrolna)
16. [Pełny przykład](#16-pełny-przykład)

---

## 1. To jest plik SVG, a nie HTML

Rysunek, z którego powstają mapy, to **samodzielny plik `.svg`** (grafika wektorowa).
Zapisuje się go znacznikami podobnymi do HTML i otwiera w przeglądarce jak stronę,
ale **nie jest to strona HTML**:

* skrypt wczytuje plik parserem **XML** — korzeniem pliku musi być `<svg>`;
* strona HTML z osadzonym `<svg>` (`<!DOCTYPE html><html><body><svg>…`) **nie zadziała**:
  skrypt nie zgłosi błędu, tylko po cichu wygeneruje **puste mapy** (0 miejsc
  klikalnych) — sprawdzone;
* aplikacja wczytuje mapy jako `image/svg+xml` i odrzuca plik, którego korzeń nie jest `<svg>`.

**Jeśli pracujesz w HTML** (np. żeby podglądać rysunek), na koniec wytnij cały element
`<svg>…</svg>` do osobnego pliku `.svg` i dopilnuj zasad XML z rozdziału 3
(`xmlns`, zamknięte znaczniki, brak encji HTML takich jak `&nbsp;`).

**Jeden plik czy kilka?** Oba warianty działają:

* **jeden rysunek z kilkoma panelami** (tak jest w kampanii Iliac) — każda mapa to
  prostokątny fragment rysunku (`obszar`);
* **osobny plik na każdą mapę** — wtedy `obszar` danej mapy obejmuje cały rysunek
  (`"0 0 szerokość wysokość"` z `viewBox`).

---

## 2. Jak rysunek staje się interaktywną mapą

```
rysunek MG (.svg, ze spoilerami)
   │  narzedzia/przygotuj_mape.py  (+ manifest kampania.json)
   ▼
mapa_{id}.svg — po jednym pliku na zakładkę, bez spoilerów, w stylu Data-Slate
   │  aplikacja/js/mapa.js
   ▼
interaktywna mapa w przeglądarce: przesuwanie, przybliżanie, klikalne miejsca, notatki
```

**Skrypt** (`narzedzia/przygotuj_mape.py`), po kolei:

1. Wczytuje rysunek. Komentarze `<!-- … -->` **znikają** już przy wczytaniu.
2. Usuwa **każdy** element z klasą `tylko-mg` (razem z całą zawartością).
3. Dla każdej mapy z manifestu wycina jej `obszar`: zostawia tylko te elementy
   **najwyższego poziomu** (bezpośrednie dzieci `<svg>`), których prostokąt
   otaczający **przecina** obszar. Reszta znika z pliku tej mapy.
4. **Kontrola bezpieczeństwa** — jeśli w wyciętym fragmencie zostały ślady materiału
   MG (rozdział 6.3), przerywa pracę i **nie zapisuje żadnego pliku**.
5. Odczytuje miejsca klikalne (`data-element`) i sprawdza ich identyfikatory.
6. Usuwa wszystkie `<title>`, `<desc>`, `<metadata>`, atrybuty `font-family`,
   nieużywane definicje (`<defs>`) i arkusze `<style>` — ale **tylko te w `<defs>`
   i na najwyższym poziomie** (`<style>` schowany w grupie zostaje — rozdział 10).
7. **Dodaje kolory motywów fosforu**: każdemu kształtowi nadaje klasę `ds-…` z
   poziomem jasności liczonym z jego koloru (rozdział 8) i dopisuje reguły dla
   motywów zielonego, bursztynowego i czerwonego. **Oryginalne kolory zostają** w
   atrybutach `fill`, `stroke`, `stop-color` (kolor zapisany w `style` przenosi do
   atrybutu) — widać je w trybie „kolory oryginału”.
8. Dokleja nazwę mapy na początek każdego atrybutu `id` (np. `piasek` →
   `okolice-piasek`) i poprawia odwołania `url(#…)` oraz `href="#…"`.
9. Przycina rysunek do obszaru (zaokrąglone rogi), ustawia `viewBox` = obszar i
   zapisuje `mapa_{id}.svg`.
10. Porównuje miejsca z rysunku z manifestem i wypisuje raport (rozdział 12).

**Aplikacja** (`aplikacja/js/mapa.js`) przy wczytaniu mapy:

* usuwa `<script>`, `<foreignObject>`, `<iframe>`, `<object>`, `<embed>`, atrybuty
  `on…` i każdy `href`, który nie zaczyna się od `#` (czyli wszystkie odnośniki
  i obrazki z zewnątrz albo `data:`);
* każdą grupę `data-element`, którą manifest i admin pozwalają kliknąć, zamienia w
  przycisk: dodaje **przezroczyste strefy kliknięcia** (pod napisami, grube pasy
  wzdłuż linii, co najmniej 30×30 jednostek dla małych miejsc), **złote narożniki**
  wokół głównego podpisu, podświetlenie napisów po najechaniu i **czerwoną kropkę**
  „są notatki”;
* tło rysunku nie reaguje na kliknięcia — klikalne są tylko miejsca dostępne dla
  bieżącego użytkownika. Miejsca niedostępne wyglądają **dokładnie jak tło**, ale
  **są widoczne** (rysunek i podpis zostają na mapie);
* pokazuje mapę w kolorze wybranym przez admina osobno dla każdej mapy (domyślnie
  `mapy[].kolor` z manifestu): **zielony**, **bursztynowy**, **czerwony** (fosfor na
  ciemnym ekranie) albo **kolory oryginału** (mapa w kolorach rysunku, interfejs
  aplikacji zielony). Jeden plik mapy obsługuje wszystkie tryby — zmiana koloru nie
  wymaga ponownego uruchamiania skryptu.

Wniosek dla rysującego: **nie rysuj** własnych ramek podświetlenia, kropek, przycisków
ani pól do kliknięcia — aplikacja dodaje je sama. Rysujesz tylko samą mapę.

---

## 3. Wymagania dotyczące pliku

| Wymaganie | Szczegóły |
|---|---|
| Format | Poprawny **XML**: każdy znacznik zamknięty (`<rect … />`), atrybuty w cudzysłowach, wielkość liter ma znaczenie. |
| Korzeń | `<svg xmlns="http://www.w3.org/2000/svg" viewBox="…">` — **`xmlns` obowiązkowy** (bez niego przeglądarka nie pokaże rysunku). Jeśli używasz `xlink:href`, dodaj też `xmlns:xlink="http://www.w3.org/1999/xlink"` — lepiej jednak pisać samo `href`. |
| `viewBox` | Obowiązkowy, cztery liczby `"0 0 szerokość wysokość"`. **Wszystkie współrzędne** (obszary map, punkt `start`) podaje się w tych jednostkach. `width`/`height` nieobowiązkowe (skrypt i tak je usuwa). |
| Kodowanie | **UTF-8**. Polskie litery piszemy wprost (`Przełęcz`). Deklaracja `<?xml …?>` nie jest potrzebna. |
| Encje | Wolno tylko `&amp;` `&lt;` `&gt;` `&quot;` `&apos;` i liczbowe (`&#160;`). **`&nbsp;` i inne encje HTML przerywają skrypt** („undefined entity”). |
| Bez `DOCTYPE` | Nie dodawaj `<!DOCTYPE>` ani deklaracji encji. |
| Jednostki | Liczby bez jednostek (`font-size="14"`, `stroke-width="2"`). Nie używaj `em`, `%`, `pt`, `mm`. |
| Nazwa pliku | Bez spacji i polskich znaków, np. `Rysunek_MG.svg`, `Rysunki_kopca_Iliac.svg`. **Nie** zaczynaj od `mapa_` — ten przedrostek mają pliki tworzone przez skrypt. |
| Miejsce | Folder kampanii: `kampanie/NazwaKampanii/`. Ścieżkę podaje manifest: `mapy[].zrodlo.plik`. |

---

## 4. Układ rysunku: panele i obszary map

Każda zakładka z mapą w aplikacji to **prostokątny fragment rysunku** — `obszar`
w manifeście, zapisany jako `"x y szerokość wysokość"` w jednostkach `viewBox`.

### Zasady

1. **Obszary nie nachodzą na siebie.** Zostaw między panelami odstęp (np. 20–40
   jednostek). Przykład: panel A `20 20 1160 780`, panel B `20 840 1160 820`.
2. **Każdy element najwyższego poziomu leży w całości w jednym obszarze.** Skrypt
   przydziela element do mapy, gdy jego prostokąt otaczający **choćby częściowo
   zachodzi** na obszar — element na granicy trafi na **obie** mapy (raport:
   „UWAGA: … trafił na kilka map naraz”).
3. **Nie owijaj całego rysunku w jedną grupę** (np. „warstwę” z Inkscape:
   `<g id="layer1">…</g>`). Taka grupa przecina wszystkie obszary, więc **cała
   zawartość trafi na każdą mapę**, a każde miejsce na wszystkie mapy naraz
   (sprawdzone). Wolno natomiast zrobić **jedną grupę na panel**, jeśli leży w
   całości w swoim obszarze.
4. **Tło całego arkusza** (np. jeden duży `<rect>` pod wszystkimi panelami) jest
   dozwolone — trafi na każdą mapę i zostanie przycięte. Lepiej jednak dać każdemu
   panelowi własne tło.
5. Element, który **nie dotyka żadnego obszaru**, po cichu znika ze wszystkich map
   (także miejsce `data-element` — raport go nie pokaże). Panele, których żadna mapa
   nie używa, są więc pomijane.
6. Droga lub rzeka, która „przechodzi” z jednej mapy na drugą: narysuj ją osobno w
   każdym panelu; jeśli ma być klikalna na obu, daj **dwa różne identyfikatory**
   (np. `trakt` i `trakt-miasto`).
7. `transform` na grupach jest dozwolony, ale `obszar` i `start` podaje się zawsze we
   współrzędnych **korzenia** rysunku (po przekształceniu).

### Rozmiar

* Dłuższy bok jednego panelu: najlepiej **1000–1600 jednostek** (kampania Iliac:
  panele 1160×740 i 1160×810). Aplikacja pozwala przybliżyć mapę ok. 6× względem
  widoku całości (i co najmniej 3× względem widoku startowego) — najdrobniejsze
  szczegóły muszą być czytelne przy takim przybliżeniu.
* Na komputerze mapa otwiera się w całości, jeśli wychodzi co najmniej 0,8 piksela
  na jednostkę; na telefonie i tablecie w pionie otwiera się **przybliżona na punkt
  `start`** z manifestu — wybierz go w najważniejszym miejscu panelu.
* Proporcje dowolne; mapa jest wyśrodkowana, a poza nią widać ciemne tło.

---

## 5. Znacznik 1: miejsce klikalne `data-element`

```xml
<g data-element="przelecz-wiatru">
  <title>Przełęcz Wiatru</title>
  <polygon points="400,300 440,240 480,300" fill="#6f6250" stroke="#2b2116" stroke-width="1.5"/>
  <text class="h" x="440" y="326" font-size="14" text-anchor="middle" fill="#2b2116">Przełęcz Wiatru</text>
</g>
```

### 5.1 Zasady grupy

* Atrybut `data-element` stawiamy **tylko na `<g>`** (aplikacja dokleja do grupy
  strefy kliknięcia i narożniki — na `<path>` czy `<text>` to nie zadziała).
* Grupa jest **bezpośrednim dzieckiem `<svg>`** albo dzieckiem grupy panelu.
* **Bez zagnieżdżania**: grupa `data-element` nie może zawierać innej grupy `data-element`.
* **Nie** wkładaj jej do `tylko-mg` — zniknie razem z nią (patrz 6.2).
* W grupie umieść **wszystko, co tworzy miejsce**: kształt (budynek, znacznik,
  obrys dzielnicy, linia drogi) **i** jego podpis.

### 5.2 Identyfikator (wartość `data-element`)

* Tylko **małe litery bez polskich znaków, cyfry i pojedyncze myślniki**
  (wzór `^[a-z0-9]+(-[a-z0-9]+)*$`). Bez spacji, podkreśleń, wielkich liter i
  myślnika na początku/końcu. Skrypt przerywa pracę przy złym identyfikatorze.
* Zamiana polskich liter: ą→a, ć→c, ę→e, ł→l, ń→n, ó→o, ś→s, ź→z, ż→z
  (`Przełęcz Wiatru` → `przelecz-wiatru`).
* **Unikalny** w całej kampanii — na rysunku występuje raz (duplikat w obszarze
  jednej mapy przerywa skrypt, w obszarach dwóch map daje „UWAGA”).
* Krótki i opisowy: najlepiej do 40 znaków (baza przyjmuje najwyżej 100).
* **Nigdy go nie zmieniaj**, gdy już trafił do manifestu — notatki graczy są
  przypięte do identyfikatora, nie do nazwy.
* **Jawny**: identyfikator widać w publicznych plikach map i w manifeście. Nie może
  niczego zdradzać (zły przykład: `kryjowka-zdrajcy`).

### 5.3 `<title>` w grupie

* Pierwszym dzieckiem grupy powinien być `<title>` z **jawną** nazwą miejsca.
* Skrypt wypisuje go w raporcie jako propozycję nazwy do manifestu, a potem
  **usuwa** z mapy dla graczy (dymek przeglądarki zdradzałby nieodkryte miejsca).
* Zawsze to nazwa, którą mogą zobaczyć gracze — nigdy opis dla MG.

### 5.4 Podpis i strefa kliknięcia

* Każde miejsce powinno mieć **podpis `<text>`** w swojej grupie. Aplikacja rysuje
  złote narożniki wokół napisu (napisów) o **największym `font-size` w grupie** i
  stawia czerwoną kropkę w prawym górnym rogu pierwszego z nich. Główna nazwa
  miejsca musi więc mieć największą czcionkę w grupie; dopiski (np. „ruiny”) — mniejszą.
* Bez napisu miejsce nadal działa, ale nie dostanie narożników (kropka trafi w róg
  całej grupy).
* Napisy wieloliniowe: `<text>` z kilkoma `<tspan x="…" dy="…">` — działa.
* Napis może być obrócony (`transform="rotate(…)"` na `<text>`) — strefa i
  narożniki obracają się razem z nim.
* Klikalne są: **wypełnione kształty** grupy, **pas 16 px wzdłuż linii** bez
  wypełnienia (`fill="none"`), prostokąty pod napisami, a dla małych miejsc pole
  co najmniej 30×30 jednostek wokół środka.

### 5.5 Kolejność i nakładanie się

* Później zapisany element leży **wyżej** i przejmuje kliknięcia. Duże klikalne
  obszary (dzielnica, zatoka, las) zapisuj **wcześniej**, a małe miejsca leżące na
  nich (budynek w dzielnicy) — **później**. Inaczej duży obszar zasłoni małe miejsca.
* Nie przykrywaj klikalnych miejsc późniejszymi dużymi kształtami tła — tło nie
  reaguje na kliknięcia, ale zasłania.

### 5.6 Co wolno, a czego nie

* Na rysunku może być więcej grup `data-element`, niż jest w manifeście. Miejsca spoza
  manifestu są zwykłym tłem (widać je, ale nie da się ich kliknąć). **To użytkownik
  decyduje**, które miejsca trafią do manifestu.
* Miejsce nieudostępnione graczom (`dostepnyDomyslnie: false`) **dalej widać** na
  mapie — tylko nie da się go kliknąć. Jeśli już samo istnienie miejsca jest
  tajemnicą, ono całe należy do `tylko-mg`, a nie do `data-element`.

---

## 6. Znacznik 2: treść tylko dla MG `tylko-mg`

```xml
<g class="tylko-mg">
  <text x="300" y="700" font-size="12" fill="#9b2f1c">notatka MG</text>
  <polyline points="860,200 440,300" fill="none" stroke="#9b2f1c" stroke-dasharray="5 3"/>
</g>
```

### 6.1 Zasady

* Skrypt usuwa **każdy element** z klasą `tylko-mg` — w dowolnym miejscu drzewa, z
  całą zawartością. Klasę można łączyć z innymi: `class="tylko-mg legenda"`.
* Zalecana forma to grupa `<g class="tylko-mg">`; w jednym panelu może być wiele
  takich grup.
* **Wszystko poza grupami `tylko-mg` jest publiczne** — trafia do plików map, które
  może otworzyć każdy. Gdy masz wątpliwość, czy coś jest tajne: do `tylko-mg`.

### 6.2 Co musi trafić do `tylko-mg`

* notatki, dopiski i podpisy dla MG (np. z dopiskiem „(dla MG)”);
* ukryte przejścia, tajne miejsca, prawdziwe nazwy, „to, o czym postacie nie wiedzą”;
* **czerwone linie przerywane** (w konwencji rysunków MG oznaczają wiedzę ukrytą);
* legenda MG, objaśnienia oznaczeń MG;
* całe miejsca, których istnienia gracze nie znają (kształt **i** podpis);
* opisy przekrojów i panele, które w całości są wiedzą MG (albo zostaw je poza
  obszarami map — patrz 4, zasada 5 — ale `tylko-mg` jest pewniejsze).

### 6.3 Kontrola bezpieczeństwa skryptu

Jeśli **poza** grupami `tylko-mg` (w obszarze którejś mapy) skrypt znajdzie poniższe
ślady, **przerywa pracę i nie zapisuje żadnego pliku**. Podaje tylko numer i rodzaj
elementu, nigdy jego treść.

| Ślad | Gdzie szuka |
|---|---|
| tekst `dla MG`, `(MG)`, `MG:` albo słowo `spoiler` (wielkość liter bez znaczenia) | w napisach, `<title>` i w wartościach atrybutów (oprócz `d`, `points`, `transform`) |
| klasa `mg`, klasa zaczynająca się od `mg-` albo kończąca na `-mg` | atrybut `class` |
| **czerwona linia przerywana** | element, który **sam** ma `stroke` w odcieniu czerwieni i `stroke-dasharray` |

Wnioski:

* przerywane linie dla graczy (drogi, granice, szlaki) rysuj w kolorach
  **nieczerwonych**: czarny, szary, brązowy (np. `#6e3f22` przechodzi kontrolę);
* ciągła czerwona linia nie zatrzymuje skryptu (w motywach fosforu będzie zwykłą
  jasną linią, w kolorach oryginału — czerwoną);
* nie używaj słów „spoiler”, „MG:” ani „(MG)” w napisach dla graczy;
* **nie wyłączaj ani nie obchodź tej kontroli** — popraw rysunek.

---

## 7. Znacznik 3: napis z obwódką `h`

`class="h"` na `<text>` daje napisowi **obwódkę w kolorze tła** (tzw. halo), żeby był
czytelny na liniach i deseniach. W rysunku zdefiniuj ją w `<defs>`:

```xml
<style>.h { stroke: #efe3c4; stroke-width: 3px; paint-order: stroke; stroke-linejoin: round; }</style>
```

* W motywach fosforu skrypt i tak podmienia tę regułę na własną (obwódka w kolorze
  ekranu).
* W trybie **kolory oryginału** obwódka ma kolor `stroke` z reguły `.h` rysunku
  (tylko kolor — `#rrggbb` albo `rgb()`; grubość zawsze 3). Bez takiej reguły —
  biała. Ustaw więc `stroke` na kolor „papieru” Twojej mapy (np. `#f3ead2`).
* Z całego `<style>` skrypt bierze **tylko** ten kolor; resztę arkusza usuwa.
  `<style>` musi leżeć **w `<defs>`** (albo bezpośrednio w `<svg>`): `<style>`
  schowany w grupie przechodzi do mapy graczy, a w aplikacji działałby na **całą
  stronę** (sprawdzone). Nie definiuj w nim kolorów innych elementów (rozdział 8).

**Nazwy klas zarezerwowane** — nie nadawaj ich elementom rysunku: `el`, `el-…`,
`ds-…`, `wybrany`, `mapa-slate`, `motyw-…`, `plansza` (używa ich aplikacja) oraz
`mg`, `mg-…`, `…-mg` (kontrola bezpieczeństwa). `tylko-mg` — wyłącznie dla treści MG.

---

## 8. Kolory i sposób rysowania

### 8.1 Dwa sposoby wyświetlania tej samej mapy

Admin wybiera kolor osobno dla każdej mapy, a jeden plik mapy obsługuje wszystkie
tryby. Rysunek musi dobrze wyglądać w **obu** rodzajach:

| Tryb | Co widać | Co jest ważne w rysunku |
|---|---|---|
| **kolory oryginału** | mapa dokładnie w kolorach rysunku; interfejs aplikacji zielony | barwy, kontrast, czytelność — jak na zwykłej, kolorowej mapie |
| **zielony / bursztynowy / czerwony** (fosfor) | jednobarwna mapa: jasne linie na ciemnym ekranie | różnice **jasności** między rzeczami (barwa przepada) |

Możesz więc rysować **kolorowe mapy** (woda niebieska, las zielony, mury szare) —
pod warunkiem, że rzeczy, które trzeba odróżnić, różnią się też jasnością, grubością
linii, rodzajem kreski (`stroke-dasharray`) albo deseniem (`<pattern>`). Woda i las
w tej samej jasności będą w motywach fosforu nie do odróżnienia.

**Kolory też są jawne.** W trybie oryginału gracze widzą barwy rysunku — nie koduj
tajemnic kolorem (np. „na fioletowo miejsca, gdzie jest zdrajca”). Tajne rzeczy
idą do `tylko-mg` (rozdział 6).

### 8.2 Motywy fosforu — jak liczona jest jasność

Skrypt zamienia każdy kolor na **jasność fosforu** na ciemnym ekranie, jak przy
rysunku ciemnym tuszem na jasnym papierze:

* ciemny kolor (czarny tusz) → **jasno świecąca** linia lub plama;
* jasny kolor (papier, biel) → **ciemne tło** ekranu;
* odcień (czerwony, niebieski, zielony) **przepada** — liczy się tylko jasność.

Najlepiej więc rysować na **jasnym tle** (papier, beż, jasny błękit) **ciemniejszymi**
liniami i napisami. Ciemne tło w oryginale (np. nocna mapa) da w motywach fosforu
jaskrawą, oślepiającą planszę z ciemnymi napisami.

Dodatkowo skrypt **przygasza** duże powierzchnie, żeby nie oślepiały:

* kształty do ok. 300 jednostek² świecą pełną mocą;
* od ok. 40 000 jednostek² (np. 200×200) — najwyżej 40% jasności;
* gradienty — najwyżej 40%, wnętrza `<pattern>` — 55% jasności;
* napisy zawsze pełną mocą.

`opacity`, `fill-opacity` i `stroke-opacity` zostają bez zmian i działają w obu trybach.

### 8.3 Tryb kolorów oryginału — co trzeba wiedzieć

* Zachowane są kolory z `fill`, `stroke` i `stop-color` (gradienty), desenie,
  przezroczystość. **Nie** jest zachowany krój pisma (zawsze czcionka o stałej
  szerokości — rozdział 9) ani nic, co było w arkuszu `<style>` (poza kolorem
  obwódki `.h` — rozdział 7).
* Poza obszarem mapy widać ciemne tło aplikacji — daj każdemu panelowi własne,
  pełne tło (prostokąt w kolorze papieru), żeby mapa nie miała dziur.
* Aplikacja dorysowuje na mapie: **malinowe** narożniki i podświetlenie klikalnych
  miejsc (`#e6007e`) i **czerwoną** kropkę „są notatki” (`#ff2d2d`). Nie używaj
  tych kolorów do zwykłych oznaczeń, żeby się z nimi nie myliły.
* Czerwone **przerywane** linie dalej są zarezerwowane dla MG (rozdział 6.3) —
  także na kolorowych mapach skrypt zatrzyma się na nich.

### 8.4 Jak zapisywać kolory

| Dobrze | Źle (co się stanie) |
|---|---|
| atrybuty: `fill="#2b2116"`, `stroke="#4d4030"` | kolor w klasie z `<style>` (`.las{fill:…}`) — `<style>` jest usuwany, kształt dostaje domyślne **czarne** wypełnienie: w oryginale czarna plama, w fosforze świeci pełną mocą (sprawdzone) |
| styl w elemencie: `style="fill:#2b2116;stroke:#000"` (skrypt przeniesie kolor do atrybutu) | `hsl(…)`, `currentColor`, nazwy typu `navy`, `teal`, `beige` — skrypt ich **nie przeliczy**: w motywach fosforu zostaną w oryginalnej barwie na ciemnym ekranie (sprawdzone) |
| `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb(…)`, `rgba(…)` | |
| nazwy: `black`, `white`, `gray`/`grey`, `silver`, `red`, `green`, `blue`, `maroon`, `darkred`, `crimson`, `firebrick`, `brown`, `orange`, `yellow` | inne nazwy kolorów |
| `fill="none"`, `fill="url(#deseń)"` | |

### 8.5 Pułapki

* **Domyślne wypełnienie w SVG jest czarne.** Linie łamane (`<polyline>`) i otwarte
  ścieżki (`<path>`) bez `fill="none"` zostaną wypełnione (czarna albo świecąca
  plama). Każdej linii daj jawnie `fill="none"`.
* Grupy mogą przekazywać kolor dzieciom (`<g fill="#000">`) — skrypt to obsługuje
  w obu trybach, ale prościej i pewniej wpisywać kolor w każdy kształt.
* Nie używaj filtrów (`<filter>`, cienie, rozmycia, poświata) — skrypt nie przeliczy
  ich kolorów, a na tabletach filtry spowalniają przesuwanie mapy. Poświatę i linie
  skanowania (w motywach fosforu) dodaje aplikacja.
* Nie używaj masek (`<mask>`) — w motywach fosforu przestają działać poprawnie.
* Nie rysuj w kolorach ekranu (zielony fosfor itp.) — motywy policzą się same.
  Rysuj w kolorach, w jakich mapa ma wyglądać w trybie oryginału.

---

## 9. Napisy i czytelność

* **Krój pisma znika**: skrypt usuwa wszystkie `font-family`, mapa używa czcionki
  o stałej szerokości (Ubuntu Mono / DejaVu Sans Mono / Consolas) — w każdym trybie,
  także w kolorach oryginału. Napisy będą zwykle **szersze** niż w podglądzie —
  zostaw wokół nich zapas miejsca.
* Krój i rozmiar podawaj osobnymi atrybutami (`font-family`, `font-size`, …), **nie**
  skrótem `style="font: …"` — skrót nie jest rozpoznawany i zostaje w mapie razem z
  oryginalną czcionką (sprawdzone).
* `font-size` jako liczba w jednostkach rysunku, na każdym `<text>` (albo
  odziedziczony z grupy). Zalecane: podpisy miejsc **11–16**, nazwy paneli i
  dużych obszarów **18–26**, drobne dopiski nie mniej niż **9**.
* `font-weight`, `font-style`, `text-anchor`, `letter-spacing` — działają.
* Na czas szczypania (przybliżanie dwoma palcami) aplikacja **ukrywa napisy** —
  to celowe (wydajność). Nie rysuj „napisów” jako kształtów, żeby to obejść.
* Treść napisów to zwykły tekst — bez znaczników HTML i bez encji (rozdział 3).

---

## 10. Dozwolone i zakazane elementy SVG

| Element | Status | Uwagi |
|---|---|---|
| `g`, `rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`, `path` | ✅ | podstawowe kształty |
| `text`, `tspan` | ✅ | podpisy (rozdział 9) |
| `defs`, `pattern`, `linearGradient`, `radialGradient`, `stop`, `marker`, `clipPath` | ✅ | definicje w `<defs>`; nieużywane skrypt usuwa |
| `title` | ✅ | w grupie `data-element` (5.3); w mapach dla graczy jest usuwany |
| atrybut `id` | ✅ | unikalny w pliku; odwołania tylko przez `url(#id)` i `href="#id"` (skrypt dokleja do nich nazwę mapy) |
| `transform` | ✅ | `translate`, `rotate`, `scale`, `matrix`, `skewX`, `skewY` |
| `style` (atrybut w elemencie) | ✅ | tylko proste właściwości (`fill`, `stroke`, …) |
| `<style>` (arkusz) | ⚠️ | tylko reguła `.h` i **tylko w `<defs>`** (rozdział 7); skrypt bierze z niej kolor obwódki, a arkusz usuwa — kolorów innych elementów w nim nie definiuj |
| `use`, `symbol` | ❌ | `<use>` na najwyższym poziomie **znika** z map (sprawdzone); powiel kształty zamiast odwołań |
| `image` | ❌ | aplikacja usuwa obrazki z zewnątrz i `data:` — mapa ma być w pełni wektorowa |
| `filter`, `mask` | ❌ | rozdział 8.5 |
| `textPath` | ❌ | niepewne strefy kliknięcia i narożniki |
| zagnieżdżony `svg`, `switch`, `foreignObject`, `iframe`, `object`, `embed` | ❌ | |
| `script`, atrybuty `on…` (np. `onclick`) | ❌ | aplikacja i tak je usuwa; mapa nie może mieć kodu |
| `a` z `href` | ❌ | odnośniki usuwane; klikalność zapewnia `data-element` |
| animacje (`animate`, CSS `@keyframes`), `@font-face`, `@import` | ❌ | |
| komentarze `<!-- -->` | ⚠️ | usuwane już przy wczytaniu; nie trzymaj w nich niczego ważnego |

**Wydajność:** rysunek ma się płynnie przesuwać na tablecie. Celuj w najwyżej
kilka tysięcy elementów na mapę (cały rysunek Iliac ma ok. 600) i unikaj gigantycznych
ścieżek z automatycznej wektoryzacji. Desenie (`<pattern>`) są w porządku.

---

## 11. Manifest kampanii — co trzeba w nim ustawić

Rysunek działa w parze z plikiem `kampanie/NazwaKampanii/kampania.json` (pełny opis
pól: `kampanie/README.md`, szablon: `narzedzia/szablon_kampanii/kampania.json`).
Z rysunkiem wiążą się:

| Pole | Co wpisać |
|---|---|
| `mapy[].id` | identyfikator mapy (małe litery, cyfry, myślniki), np. `okolice`; skrypt dokleja go do `id` w pliku mapy |
| `mapy[].plik` | `mapa_{id}.svg` — plik, który zrobi skrypt |
| `mapy[].zrodlo.plik` | nazwa pliku rysunku, np. `Rysunek_MG.svg` |
| `mapy[].zrodlo.obszar` | `"x y szerokość wysokość"` panelu tej mapy (rozdział 4) |
| `mapy[].kolor` | kolor na start (admin może go zmienić w aplikacji): `zielony`, `bursztynowy`, `czerwony` albo `oryginalny` (mapa w kolorach rysunku) |
| `mapy[].start` | `{ "x": …, "y": … }` — punkt **wewnątrz obszaru**, na który mapa otwiera się na telefonie |
| `elementy[].id` | dokładnie taki sam jak `data-element` na rysunku |
| `elementy[].mapa` | `id` mapy, na której obszarze leży miejsce |
| `elementy[].mapaSzczegolowa` | (opcjonalnie) `id` innej mapy z planem tego miejsca — np. miasto na mapie okolic otwiera mapę miasta |

Zasady:

* **Nie dopisuj miejsc do `elementy` z własnej inicjatywy.** Skrypt wypisze nowe
  miejsca z rysunku jako gotowe wpisy JSON — o tym, które trafią do manifestu (i co
  będzie klikalne), decyduje użytkownik.
* Manifest jest **publiczny**: nazwy (`nazwa`, `aliasy`) i opisy (`opis`) muszą
  być jawne.
* Po nowej wersji map zmień `wersjaMapy` (data, np. `"2026-11-15"`).

---

## 12. Sprawdzenie gotowego rysunku

Z katalogu głównego repozytorium (wystarczy Python 3.9+):

```bash
python3 narzedzia/przygotuj_mape.py kampanie/NazwaKampanii --sprawdz
```

Tryb `--sprawdz` niczego nie zapisuje. Inny plik rysunku niż w manifeście (dla
wszystkich map naraz) można wskazać opcją `--zrodlo ścieżka/do/pliku.svg`.

| Komunikat | Znaczenie | Co zrobić |
|---|---|---|
| `usunięto N grup(y) „tylko-mg”` | ile elementów MG zostało usuniętych | sprawdź, czy liczba się zgadza |
| `Mapa „…”: N element(ów) klikalnych: …` | miejsca znalezione w obszarze mapy | czy są wszystkie i tylko te, które powinny? 0 = zły format pliku albo zły obszar |
| `NOWE ELEMENTY` + JSON | miejsca z rysunku, których nie ma w manifeście | przekaż użytkownikowi do decyzji (rozdział 11) |
| `BRAK NA RYSUNKU` | miejsce z manifestu zniknęło z rysunku | przywróć grupę z tym samym identyfikatorem (notatki graczy przeszłyby do „bez miejsca na mapie”) |
| `UWAGA: … trafił na kilka map naraz` | element dotyka kilku obszarów | przesuń go albo popraw obszary (rozdział 4) |
| `UWAGA: … jest w manifeście na mapie „…”, a na rysunku na „…”` | miejsce leży w innym panelu niż wpis w manifeście | popraw rysunek albo pole `mapa` |
| `BŁĄD: … podejrzane elementy` | ślady MG poza `tylko-mg` | owiń wskazane elementy w `<g class="tylko-mg">` (rozdział 6.3) |
| `BŁĄD: Nieprawidłowy identyfikator` | zły `data-element` | popraw zgodnie z 5.2 |
| `BŁĄD: Identyfikator „…” występuje na rysunku więcej niż raz` | duplikat | nadaj unikalne identyfikatory |
| `BŁĄD: Nie da się odczytać pliku` | plik nie jest poprawnym XML | rozdział 3 (najczęściej `&nbsp;` albo niezamknięty znacznik) |

Gdy raport jest czysty, zapis map (bez `--sprawdz`):

```bash
python3 narzedzia/przygotuj_mape.py kampanie/NazwaKampanii
```

Potem **obejrzyj wynik**: otwórz każdy `mapa_*.svg` w przeglądarce (ciemne tło,
jasne linie) i sprawdź, czy wszystko jest czytelne i czy nic nie zdradza tajemnic.
Na koniec testy z `AGENTS.md` (rozdział 6) — test
`testy/test_przygotuj_mape.py` sprawdza m.in., czy w mapach dla graczy nie ma śladów MG
i czy każde miejsce z manifestu jest na swojej mapie.

---

## 13. Typowe błędy

| Objaw | Przyczyna | Naprawa |
|---|---|---|
| skrypt nie zgłasza błędu, ale mapy są puste (0 miejsc) | plik to strona HTML z osadzonym `<svg>` albo zły `obszar` | samodzielny plik `.svg` (rozdział 1); popraw `obszar` |
| wszystkie miejsca na wszystkich mapach | cały rysunek w jednej grupie (warstwie) | grupy najwyżej na poziomie panelu (rozdział 4) |
| miejsce zniknęło bez śladu w raporcie | leży poza obszarami wszystkich map | przesuń je do panelu albo popraw `obszar` |
| jasny „papier” świeci jak plama (fosfor) albo jest czarny (oryginał) | kolor zdefiniowany w `<style>`/klasie | kolor w atrybucie `fill` |
| w motywach fosforu nie da się odróżnić wody od lądu | obie mają podobną jasność (barwa przepada) | zmień jasność jednej z nich albo dodaj deseń |
| w kolorach oryginału napisy mają białą obwódkę na beżowym tle | brak `stroke` w regule `.h` rysunku | `.h { stroke: <kolor papieru> }` w `<defs>` (rozdział 7) |
| fragment ma dziwną barwę (np. granatową) | `hsl()`, `navy` i inne nieobsługiwane zapisy | `#rrggbb` albo `rgb()` |
| linia drogi zamieniła się w świecący trójkąt | `<polyline>`/`<path>` bez `fill="none"` | dopisz `fill="none"` |
| powtarzane ikony (drzewa, domki) zniknęły | `<use>` na najwyższym poziomie | powiel kształty |
| nie da się kliknąć małego budynku w dzielnicy | duża klikalna dzielnica zapisana później i leży wyżej | zapisz dzielnicę wcześniej (5.5) |
| narożniki obejmują dopisek zamiast nazwy | dopisek ma większy `font-size` niż nazwa | nazwa = największa czcionka w grupie |
| napisy nachodzą na siebie na mapie | czcionka o stałej szerokości jest szersza | więcej miejsca wokół podpisów |
| skrypt przerywa: „czerwona linia przerywana” | przerywana linia w czerwonym odcieniu poza `tylko-mg` | jeśli to MG — do `tylko-mg`; jeśli dla graczy — zmień kolor na nieczerwony |

---

## 14. Nowa wersja istniejącego rysunku

* **Zachowaj wszystkie identyfikatory `data-element`** z poprzedniej wersji — także
  gdy zmienia się kształt, położenie albo nazwa miejsca.
* Zmiana nazwy miejsca: zmienia się `<title>` i podpis na rysunku, a w manifeście
  `nazwa` (starą nazwę dopisuje się do `aliasy`). Identyfikator zostaje.
* Usunięcie miejsca z rysunku nie kasuje notatek — trafią do listy „Notatki bez
  miejsca na mapie”. Raport pokaże to jako `BRAK NA RYSUNKU`.
* Nie przesuwaj paneli bez potrzeby — zmiana położenia panelu wymaga zmiany
  `obszar` i `start` w manifeście.
* Procedura krok po kroku: `kampanie/README.md`, rozdział „Nowa wersja rysunku”.

---

## 15. Lista kontrolna

Plik:

- [ ] samodzielny plik `.svg` (nie HTML), korzeń `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 W H">`
- [ ] poprawny XML: zamknięte znaczniki, brak `&nbsp;` i innych encji HTML, UTF-8
- [ ] brak `<image>`, `<use>`, `<filter>`, `<mask>`, `<script>`, `<foreignObject>`, odnośników, animacji
- [ ] `<style>` (jeśli jest) tylko w `<defs>`; brak skrótu `style="font: …"`

Układ:

- [ ] każda mapa ma swój prostokątny panel; panele nie nachodzą na siebie (odstęp)
- [ ] żaden element najwyższego poziomu nie dotyka dwóch paneli; brak jednej grupy na cały rysunek
- [ ] panele mają dłuższy bok ok. 1000–1600 jednostek

Miejsca klikalne:

- [ ] każde miejsce to `<g data-element="…">` (bez zagnieżdżeń), z `<title>` i podpisem `<text>`
- [ ] identyfikatory: `a-z`, `0-9`, myślniki; unikalne; jawne; dotychczasowe niezmienione
- [ ] główna nazwa ma największą czcionkę w grupie; duże obszary zapisane przed małymi miejscami

Tajemnice:

- [ ] wszystko dla MG w `<g class="tylko-mg">` (dopiski, tajne miejsca, czerwone przerywane, legenda MG)
- [ ] poza `tylko-mg` brak słów „dla MG”, „(MG)”, „MG:”, „spoiler”; brak klas `mg`/`mg-…`/`…-mg`
- [ ] identyfikatory, `<title>` i podpisy poza `tylko-mg` niczego nie zdradzają

Kolory i napisy:

- [ ] mapa dobrze wygląda w swoich kolorach (tryb „kolory oryginału”), każdy panel ma pełne tło
- [ ] rzeczy do odróżnienia różnią się jasnością, kreską albo deseniem — nie tylko barwą (motywy fosforu)
- [ ] jasne tło, ciemniejsze linie i napisy; kolory nic nie zdradzają
- [ ] kolory w atrybutach `fill`/`stroke` (`#rrggbb`, `rgb()`), nie w `<style>`; linie z `fill="none"`
- [ ] przerywane linie dla graczy w kolorach nieczerwonych; malinowego `#e6007e` nie używaj do oznaczeń
- [ ] reguła `.h { stroke: <kolor papieru> }` w `<defs>`
- [ ] `font-size` liczbowy, podpisy 11–16; zapas miejsca na szerszą czcionkę; napisy na liniach z `class="h"`

Na koniec:

- [ ] `python3 narzedzia/przygotuj_mape.py kampanie/… --sprawdz` bez `BŁĄD` i bez `UWAGA`
- [ ] lista „NOWE ELEMENTY” przekazana użytkownikowi do decyzji (manifestu nie uzupełniać samemu)

---

## 16. Pełny przykład

Wymyślony rysunek (nie pochodzi z żadnej kampanii) z dwoma panelami: **A — Okolice**
i **B — Miasto**. Sprawdzony skryptem: 2 grupy `tylko-mg` usunięte, 3 miejsca na
mapie „okolice”, 2 na mapie „miasto”, bez błędów.

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1700" width="1200" height="1700"
     font-family="Georgia, serif">
  <title>Przykładowa kampania — rysunek MG</title>

  <defs>
    <style>.h { stroke: #efe3c4; stroke-width: 3px; paint-order: stroke; }</style>
    <pattern id="piasek" width="10" height="10" patternUnits="userSpaceOnUse">
      <circle cx="3" cy="3" r="1" fill="#8a7a5c"/>
    </pattern>
  </defs>

  <!-- tło całego arkusza (jasny papier) -->
  <rect x="0" y="0" width="1200" height="1700" fill="#f3ead2"/>

  <!-- ============ PANEL A: Okolice (obszar 20 20 1160 780) ============ -->
  <g id="panel-a">
    <rect x="20" y="20" width="1160" height="780" rx="8" fill="#efe3c4" stroke="#4d4030" stroke-width="2"/>
    <text class="h" x="40" y="56" font-size="22" font-weight="bold" fill="#2b2116">A · OKOLICE</text>
    <path d="M20 500 C 300 460, 600 560, 1180 520 L1180 800 L20 800 Z" fill="url(#piasek)" stroke="none"/>
  </g>

  <g data-element="przelecz-wiatru">
    <title>Przełęcz Wiatru</title>
    <polygon points="400,300 440,240 480,300" fill="#6f6250" stroke="#2b2116" stroke-width="1.5"/>
    <text class="h" x="440" y="326" font-size="14" text-anchor="middle" fill="#2b2116">Przełęcz Wiatru</text>
  </g>

  <g data-element="stary-trakt">
    <title>Stary Trakt</title>
    <polyline points="60,420 400,300 900,360" fill="none" stroke="#6e3f22" stroke-width="3" stroke-dasharray="8 5"/>
    <text class="h" x="650" y="320" font-size="13" fill="#3a2a1a" transform="rotate(7 650 320)">Stary Trakt</text>
  </g>

  <g data-element="osada-brzeg">
    <title>Osada Brzeg</title>
    <circle cx="860" cy="200" r="9" fill="#2b2116"/>
    <text class="h" x="876" y="205" font-size="14" fill="#2b2116">Osada Brzeg</text>
  </g>

  <g class="tylko-mg">
    <text x="300" y="700" font-size="12" fill="#9b2f1c">notatka MG</text>
    <polyline points="860,200 440,300" fill="none" stroke="#9b2f1c" stroke-width="2" stroke-dasharray="5 3"/>
  </g>

  <!-- ============ PANEL B: Miasto (obszar 20 840 1160 820) ============ -->
  <g id="panel-b">
    <rect x="20" y="840" width="1160" height="820" rx="8" fill="#efe3c4" stroke="#4d4030" stroke-width="2"/>
    <text class="h" x="40" y="876" font-size="22" font-weight="bold" fill="#2b2116">B · MIASTO</text>
  </g>

  <g data-element="rynek">
    <title>Rynek</title>
    <rect x="520" y="1180" width="160" height="110" fill="#d8c9a6" stroke="#2b2116" stroke-width="2"/>
    <text class="h" x="600" y="1242" font-size="16" text-anchor="middle" fill="#2b2116">Rynek</text>
  </g>

  <g data-element="brama-polnocna">
    <title>Brama Północna</title>
    <rect x="585" y="900" width="30" height="40" fill="#4d4030"/>
    <text class="h" x="625" y="925" font-size="13" fill="#2b2116">
      <tspan x="625" dy="0">Brama</tspan>
      <tspan x="625" dy="15">Północna</tspan>
    </text>
  </g>

  <g class="tylko-mg legenda">
    <text x="900" y="1600" font-size="11">legenda MG</text>
  </g>
</svg>
```

Pasujący fragment manifestu (`elementy` uzupełnia się po raporcie skryptu i decyzji
użytkownika):

```json
"mapy": [
  {
    "id": "okolice", "nazwa": "Okolice", "plik": "mapa_okolice.svg",
    "kolor": "zielony", "widocznaDomyslnie": true,
    "start": { "x": 600, "y": 400 },
    "zrodlo": { "plik": "Rysunek_MG.svg", "obszar": "20 20 1160 780" }
  },
  {
    "id": "miasto", "nazwa": "Miasto", "plik": "mapa_miasto.svg",
    "kolor": "zielony", "widocznaDomyslnie": false,
    "start": { "x": 600, "y": 1230 },
    "zrodlo": { "plik": "Rysunek_MG.svg", "obszar": "20 840 1160 820" }
  }
]
```

Co dzieje się z przykładem:

* grupy `panel-a` i `panel-b` leżą w całości w swoich obszarach — trafiają tylko na
  swoją mapę; wielki `<rect>` tła dotyka obu obszarów, więc trafia na obie mapy
  (przycięty);
* obie grupy `tylko-mg` (z czerwoną przerywaną linią i dopiskami) znikają;
* `Stary Trakt` to przerywana linia w kolorze brązowym (`#6e3f22`) — przechodzi
  kontrolę bezpieczeństwa; czerwona przerywana poza `tylko-mg` zatrzymałaby skrypt;
* deseń `piasek` dostaje w pliku mapy nazwę `okolice-piasek`; czcionka Georgia
  i wszystkie `<title>` znikają;
* w motywach fosforu jasne tło `#efe3c4` staje się ciemnym ekranem, a ciemne linie i
  napisy — jasnym fosforem; w trybie kolorów oryginału mapa wygląda jak rysunek
  (beżowy papier, brązowe linie), a napisy z `class="h"` mają obwódkę `#efe3c4`
  z reguły `.h` (sprawdzone w przeglądarce we wszystkich czterech trybach).
