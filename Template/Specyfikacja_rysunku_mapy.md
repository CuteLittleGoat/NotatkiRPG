# Specyfikacja rysunku mapy — plik źródłowy dla interaktywnej mapy NotatkiRPG

Instrukcja dla agenta AI (albo człowieka), który **rysuje mapę** do aplikacji
NotatkiRPG. Opisuje, jaki plik ma powstać, jakie musi mieć znaczniki, czego w nim nie
wolno używać i jak sprawdzić, czy jest gotowy. Do pracy wystarczy ten plik i
przykładowe rysunki — dostęp do kodu aplikacji nie jest potrzebny.

## Pliki

| Plik | Gdzie jest |
|---|---|
| ta specyfikacja | `Template/Specyfikacja_rysunku_mapy.md` |
| przykład 1 — mapa krainy fantasy: `Rysunek_kraina.svg` | `Template/Przyklady/Rysunek_kraina.svg` |
| przykład 2 — plan budynku, szkic grozy: `Rysunek_palac.svg` | `Template/Przyklady/Rysunek_palac.svg` |
| przykład 3 — mapa taktyczna sci-fi: `Rysunek_pole_bitwy.svg` | `Template/Przyklady/Rysunek_pole_bitwy.svg` |

> Kolumnę „Gdzie jest” dostosowuje osoba, która przekazuje zadanie: w innym
> repozytorium — właściwe ścieżki, w oknie rozmowy — „plik załączony w rozmowie”.
> Dalej w tekście przykłady są nazywane tylko nazwami plików. Jeśli któregoś przykładu
> nie dostałeś, ta specyfikacja i tak wystarczy — przykłady pokazują ją w praktyce.

> **Najkrócej:** jeden plik **SVG** (nie HTML); kolory wpisane w atrybuty
> `fill`/`stroke` jako `#rrggbb`; rysunek ma dobrze wyglądać **w swoich kolorach**
> (tryb „kolory oryginału”) i mieć wyraźne różnice **jasności** (motywy fosforu:
> zielony, bursztynowy, czerwony); każde klikalne miejsce w osobnej grupie
> `<g data-element="id-miejsca">` z podpisem `<text>`, wszystko tajne w
> `<g class="tylko-mg">`, każda mapa w osobnym, nienachodzącym prostokącie rysunku.
> Miejsce, które admin ma **odkryć graczom w trakcie gry** (np. kryjówkę, ukryte
> przejście), rysuje się jak zwykłe miejsce — z pełnym tłem pod spodem — i zgłasza
> jako „do odkrycia” ([rozdział 5.7](#57-miejsca-do-odkrycia-na-start-zasłonięte)).
> Oddajesz plik `.svg` i listę miejsc ([rozdział 11](#11-co-oddajesz-rysunek-i-dane-do-manifestu)).
> Na koniec przejdź listę kontrolną ([rozdział 15](#15-lista-kontrolna)).

## Spis treści

1. [To jest plik SVG, a nie HTML](#1-to-jest-plik-svg-a-nie-html)
2. [Jak rysunek staje się interaktywną mapą](#2-jak-rysunek-staje-się-interaktywną-mapą)
3. [Wymagania dotyczące pliku](#3-wymagania-dotyczące-pliku)
4. [Układ rysunku: panele i obszary map](#4-układ-rysunku-panele-i-obszary-map)
5. [Znacznik 1: miejsce klikalne `data-element`](#5-znacznik-1-miejsce-klikalne-data-element)
   (w tym [5.7 Miejsca do odkrycia](#57-miejsca-do-odkrycia-na-start-zasłonięte) i
   [5.8 `data-nalezy-do`](#58-grafika-miejsca-poza-jego-grupą-data-nalezy-do))
6. [Znacznik 2: treść tylko dla MG `tylko-mg`](#6-znacznik-2-treść-tylko-dla-mg-tylko-mg)
7. [Znacznik 3: napis z obwódką `h`](#7-znacznik-3-napis-z-obwódką-h)
8. [Kolory i sposób rysowania](#8-kolory-i-sposób-rysowania)
9. [Napisy i czytelność](#9-napisy-i-czytelność)
10. [Dozwolone i zakazane elementy SVG](#10-dozwolone-i-zakazane-elementy-svg)
11. [Co oddajesz: rysunek i dane do manifestu](#11-co-oddajesz-rysunek-i-dane-do-manifestu)
12. [Sprawdzenie gotowego rysunku](#12-sprawdzenie-gotowego-rysunku)
13. [Typowe błędy](#13-typowe-błędy)
14. [Nowa wersja istniejącego rysunku](#14-nowa-wersja-istniejącego-rysunku)
15. [Lista kontrolna](#15-lista-kontrolna)
16. [Pełny przykład](#16-pełny-przykład)
17. [Praktyczne wskazówki (z rysowania przykładowych map)](#17-praktyczne-wskazówki-z-rysowania-przykładowych-map)

---

## 1. To jest plik SVG, a nie HTML

Rysunek, z którego powstają mapy, to **samodzielny plik `.svg`** (grafika wektorowa).
Zapisuje się go znacznikami podobnymi do HTML i otwiera w przeglądarce jak stronę,
ale **nie jest to strona HTML**:

* plik jest czytany jako **XML** — korzeniem pliku musi być `<svg>`;
* strona HTML z osadzonym `<svg>` (`<!DOCTYPE html><html><body><svg>…`) **nie zadziała**:
  przygotowanie map nie zgłosi błędu, tylko po cichu da **puste mapy** (0 miejsc
  klikalnych) — sprawdzone;
* aplikacja wczytuje mapy jako `image/svg+xml` i odrzuca plik, którego korzeń nie jest `<svg>`.

**Jeśli pracujesz w HTML** (np. żeby podglądać rysunek), na koniec wytnij cały element
`<svg>…</svg>` do osobnego pliku `.svg` i dopilnuj zasad XML z rozdziału 3
(`xmlns`, zamknięte znaczniki, brak encji HTML takich jak `&nbsp;`).

**Jeden plik czy kilka?** Oba warianty działają:

* **jeden rysunek z kilkoma panelami** — każda mapa (zakładka w aplikacji) to
  prostokątny fragment rysunku (`obszar`);
* **osobny plik na każdą mapę** (tak są zrobione wszystkie trzy przykłady) — wtedy
  `obszar` mapy obejmuje cały rysunek (`"0 0 szerokość wysokość"` z `viewBox`).
  Prostsze: nie trzeba pilnować granic paneli (rozdział 4).

---

## 2. Jak rysunek staje się interaktywną mapą

```
rysunek MG (.svg, ze spoilerami)            ← to rysujesz Ty
   │  narzędzie przygotowania map (+ manifest kampanii)
   ▼
mapa_{id}.svg — po jednym pliku na zakładkę, bez spoilerów, w stylu Data-Slate
   │  aplikacja w przeglądarce
   ▼
interaktywna mapa: przesuwanie, przybliżanie, klikalne miejsca, notatki
```

Rysunek nie trafia do graczy wprost. Osoba prowadząca aplikację przepuszcza go przez
**narzędzie przygotowania map**, które po kolei:

1. Wczytuje rysunek. Komentarze `<!-- … -->` **znikają** już przy wczytaniu.
2. Usuwa **każdy** element z klasą `tylko-mg` (razem z całą zawartością).
3. Dla każdej mapy wycina jej `obszar`: zostawia tylko te elementy **najwyższego
   poziomu** (bezpośrednie dzieci `<svg>`), których prostokąt otaczający **przecina**
   obszar. Reszta znika z pliku tej mapy.
4. **Kontrola bezpieczeństwa** — jeśli w wyciętym fragmencie zostały ślady materiału
   MG (rozdział 6.3), przerywa pracę i **nie zapisuje żadnego pliku**.
5. Odczytuje miejsca klikalne (`data-element`) i sprawdza ich identyfikatory oraz
   grupy `data-nalezy-do` (czy wskazują miejsce z tej samej mapy — rozdział 5.8).
6. Usuwa wszystkie `<title>`, `<desc>`, `<metadata>`, atrybuty `font-family`,
   nieużywane definicje (`<defs>`) i **wszystkie arkusze `<style>`** — w dowolnym
   miejscu rysunku, także schowane w grupie albo w deseniu (rozdział 7).
7. **Dodaje kolory motywów fosforu**: każdemu kształtowi nadaje klasę z poziomem
   jasności liczonym z jego koloru (rozdział 8) i dopisuje reguły dla motywów
   zielonego, bursztynowego i czerwonego. **Oryginalne kolory zostają** w atrybutach
   `fill`, `stroke`, `stop-color` (kolor zapisany w `style` przenosi do atrybutu) —
   widać je w trybie „kolory oryginału”.
8. Dokleja nazwę mapy na początek każdego atrybutu `id` (np. `piasek` →
   `okolice-piasek`) i poprawia odwołania `url(#…)` oraz `href="#…"`.
9. Przycina rysunek do obszaru (zaokrąglone rogi) i zapisuje plik mapy.
10. Porównuje miejsca z rysunku z manifestem kampanii (lista miejsc z nazwami i
    ustawieniami) i wypisuje raport — także listę miejsc do odkrycia.

**Aplikacja** przy wczytaniu mapy:

* usuwa `<script>`, `<foreignObject>`, `<iframe>`, `<object>`, `<embed>`, atrybuty
  `on…` i każdy `href`, który nie zaczyna się od `#` (czyli wszystkie odnośniki
  i obrazki z zewnątrz albo `data:`);
* każdą grupę `data-element`, którą manifest i admin pozwalają kliknąć, zamienia w
  przycisk: dodaje **przezroczyste strefy kliknięcia** (pod napisami, grube pasy
  wzdłuż linii, co najmniej 30×30 jednostek dla małych miejsc), **złote narożniki**
  wokół głównego podpisu, podświetlenie napisów po najechaniu i **czerwoną kropkę**
  „są notatki”;
* tło rysunku nie reaguje na kliknięcia — klikalne są tylko miejsca dostępne dla
  bieżącego użytkownika. Miejsca nieklikalne wyglądają **dokładnie jak tło**, ale
  **są widoczne** (rysunek i podpis zostają na mapie);
* miejsca **zasłonięte** przez admina (miejsca do odkrycia, rozdział 5.7) gracz w
  ogóle nie widzi — znika cała grupa `data-element` razem z jej grupami
  `data-nalezy-do`, zanim mapa pojawi się na ekranie. Admin widzi je przygaszone; gdy
  je odkryje, gracze zobaczą je od razu (z krótkim napisem „Nowe odkrycie…” i
  mruganiem miejsca);
* pokazuje mapę w kolorze wybranym przez admina osobno dla każdej mapy: **kolory
  oryginału** (mapa w kolorach rysunku — domyślnie) albo **zielony**,
  **bursztynowy**, **czerwony** (fosfor na ciemnym ekranie). Jeden plik mapy obsługuje
  wszystkie tryby.

Wniosek dla rysującego: **nie rysuj** własnych ramek podświetlenia, kropek, przycisków
ani pól do kliknięcia — aplikacja dodaje je sama. Rysujesz tylko samą mapę.

---

## 3. Wymagania dotyczące pliku

| Wymaganie | Szczegóły |
|---|---|
| Format | Poprawny **XML**: każdy znacznik zamknięty (`<rect … />`), atrybuty w cudzysłowach, wielkość liter ma znaczenie. |
| Korzeń | `<svg xmlns="http://www.w3.org/2000/svg" viewBox="…">` — **`xmlns` obowiązkowy** (bez niego przeglądarka nie pokaże rysunku). Jeśli używasz `xlink:href`, dodaj też `xmlns:xlink="http://www.w3.org/1999/xlink"` — lepiej jednak pisać samo `href`. |
| `viewBox` | Obowiązkowy, cztery liczby `"0 0 szerokość wysokość"`. **Wszystkie współrzędne** (obszary map, punkt `start`) podaje się w tych jednostkach. `width`/`height` nieobowiązkowe (i tak są usuwane). |
| Kodowanie | **UTF-8**. Polskie litery piszemy wprost (`Przełęcz`). Deklaracja `<?xml …?>` nie jest potrzebna. |
| Encje | Wolno tylko `&amp;` `&lt;` `&gt;` `&quot;` `&apos;` i liczbowe (`&#160;`). **`&nbsp;` i inne encje HTML sprawiają, że pliku nie da się odczytać** („undefined entity”). |
| Bez `DOCTYPE` | Nie dodawaj `<!DOCTYPE>` ani deklaracji encji. |
| Jednostki | Liczby bez jednostek (`font-size="14"`, `stroke-width="2"`). Nie używaj `em`, `%`, `pt`, `mm`. |
| Nazwa pliku | Bez spacji i polskich znaków, np. `Rysunek_MG.svg`, `Rysunek_okolice.svg`. **Nie** zaczynaj od `mapa_` — ten przedrostek mają pliki map dla graczy. |

---

## 4. Układ rysunku: panele i obszary map

Każda zakładka z mapą w aplikacji to **prostokątny fragment rysunku** — `obszar`,
zapisany jako `"x y szerokość wysokość"` w jednostkach `viewBox`.

### Zasady

1. **Obszary nie nachodzą na siebie.** Zostaw między panelami odstęp (np. 20–40
   jednostek). Przykład: panel A `20 20 1160 780`, panel B `20 840 1160 820`.
2. **Każdy element najwyższego poziomu leży w całości w jednym obszarze.** Element
   trafia na mapę, gdy jego prostokąt otaczający **choćby częściowo zachodzi** na
   obszar — element na granicy trafi na **obie** mapy (w raporcie: „trafił na kilka
   map naraz”).
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

* Dłuższy bok jednego panelu: najlepiej **1000–1600 jednostek** (przykłady: Kraina
  1600×1100, Pałac 1400×1000, Pole bitwy 1500×1000). Aplikacja pozwala przybliżyć mapę
  ok. 6× względem widoku całości (i co najmniej 3× względem widoku startowego) —
  najdrobniejsze szczegóły muszą być czytelne przy takim przybliżeniu.
* Na komputerze mapa otwiera się w całości, jeśli wychodzi co najmniej 0,8 piksela
  na jednostkę; na telefonie i tablecie w pionie otwiera się **przybliżona na punkt
  `start`** — wybierz go w najważniejszym miejscu panelu (rozdział 11).
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
* **Bez zagnieżdżania**: grupa `data-element` nie może zawierać innej grupy
  `data-element` ani grupy `data-nalezy-do`.
* **Nie** wkładaj jej do `tylko-mg` — zniknie razem z nią (patrz 6.2).
* W grupie umieść **wszystko, co tworzy miejsce**: kształt (budynek, znacznik,
  obrys dzielnicy, linia drogi) **i** jego podpis.

### 5.2 Identyfikator (wartość `data-element`)

* Tylko **małe litery bez polskich znaków, cyfry i pojedyncze myślniki**
  (wzór `^[a-z0-9]+(-[a-z0-9]+)*$`). Bez spacji, podkreśleń, wielkich liter i
  myślnika na początku/końcu. Zły identyfikator zatrzymuje przygotowanie map.
* Zamiana polskich liter: ą→a, ć→c, ę→e, ł→l, ń→n, ó→o, ś→s, ź→z, ż→z
  (`Przełęcz Wiatru` → `przelecz-wiatru`).
* **Unikalny** w całej kampanii — na rysunku występuje raz (duplikat w obszarze
  jednej mapy zatrzymuje przygotowanie map, w obszarach dwóch map daje ostrzeżenie).
* Krótki i opisowy: najlepiej do 40 znaków (baza przyjmuje najwyżej 100).
* **Nigdy go nie zmieniaj**, gdy już jest używany w kampanii — notatki graczy są
  przypięte do identyfikatora, nie do nazwy.
* **Jawny**: identyfikator widać w publicznych plikach map i w manifeście. Nie może
  niczego zdradzać (zły przykład: `kryjowka-zdrajcy`).

### 5.3 `<title>` w grupie

* Pierwszym dzieckiem grupy powinien być `<title>` z **jawną** nazwą miejsca.
* Przygotowanie map wypisuje go w raporcie jako propozycję nazwy, a potem **usuwa**
  z mapy dla graczy (dymek przeglądarki zdradzałby nieodkryte miejsca).
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

* Na rysunku może być więcej grup `data-element`, niż trafi do manifestu. Miejsca spoza
  manifestu są zwykłym tłem (widać je, ale nie da się ich kliknąć). **O tym, które
  miejsca trafią do manifestu, decyduje użytkownik** (rozdział 11).
* Miejsce **nieklikalne** **dalej widać** na mapie — tylko nie da się go kliknąć.
* Jeśli samo istnienie miejsca jest tajemnicą, są dwie drogi:
  * gracze mają je **odkryć w trakcie gry** (admin odsłoni je jednym kliknięciem) —
    **miejsce do odkrycia** (rozdział 5.7);
  * ma zostać tajemnicą **na stałe** albo jest tak ważne, że nie może trafić do pliku
    mapy, który pobiera przeglądarka gracza — całe należy do `tylko-mg` (rozdział 6).

### 5.7 Miejsca do odkrycia (na start zasłonięte)

Miejsce, którego gracze na początku **w ogóle nie widzą**, a admin odsłania je, gdy
gracze je znajdą (np. jaskinię smoka, ukryte przejście, pole minowe).

**Jak działa:** w manifeście miejsce dostaje `"widocznyDomyslnie": false`. Aplikacja
zasłania je przed graczami (cała grupa `data-element` i jej grupy `data-nalezy-do`
znikają z mapy, z indeksu i z wyszukiwarki, zanim mapa pojawi się na ekranie). Admin
widzi je przygaszone i ma przy każdym miejscu dwa pola: **👁 widoczne** i
**◈ klikalne** (◈ jest nieaktywne, dopóki 👁 jest odznaczone). Po zaznaczeniu 👁
(z potwierdzeniem) gracze widzą miejsce od razu, z krótkim napisem „Nowe odkrycie na
mapie…”. Na rysunku miejsce do odkrycia wygląda jak każde inne — o tym, że jest
zasłonięte, decyduje tylko manifest.

**Zasady rysowania:**

1. **Rysuj miejsce tak, jak gracze mają je zobaczyć po odkryciu** — zwykła grupa
   `data-element` z `<title>` i podpisem `<text>`, **poza** `tylko-mg`. To nie jest
   materiał MG: trafia do pliku mapy dla graczy. Dopiski dla MG o tym miejscu — osobno,
   w `tylko-mg`.
2. **Pod miejscem pełne tło** — tak, jakby miejsca nie było (zbocze góry pod jaskinią,
   cała ściana pod drzwiami ukrytego przejścia, zryta pociskami ziemia pod polem
   minowym). Po zasłonięciu widać właśnie to tło, a nie „dziurę” albo podejrzanie
   pusty prostokąt. Miejsce rysuj **po** tle (wyżej w kolejności rysowania).
3. **Wszystko, co zdradza miejsce, w jego grupie**: znak, podpis, ścieżka prowadząca
   do niego, otwór w ścianie. To, co zostanie poza grupą, gracze zobaczą od początku.
   Gdy część musi leżeć w innej warstwie rysunku (np. ścieżka pod górami) — grupa
   `data-nalezy-do` (rozdział 5.8).
4. **Bez czerwonych linii przerywanych** — kontrola bezpieczeństwa (rozdział 6.3)
   obejmuje też miejsca do odkrycia. Ukryte przejście w wersji dla graczy — np. linia
   przerywana brązowa albo czarna.
5. **Identyfikator, nazwa i opis są jawne już przed odkryciem** — leżą w publicznych
   plikach (mapa, manifest), jak nazwy miejsc nieklikalnych. Dobieraj je tak, żeby
   przypadkowe zobaczenie nie popsuło gry; identyfikator najlepiej obojętny
   (`jaskinia-wschodnia`, `stanowisko-w-ruinach` zamiast `kryjowka-smoka`).
6. **Napis miejsca nie może nachodzić na inne napisy** — po odkryciu pojawi się na
   gotowej mapie; sprawdź rysunek w obu stanach (rozdział 12).
7. **Legenda** nie powinna zdradzać zasłoniętych miejsc — nie dodawaj do niej
   oznaczenia, które występuje wyłącznie przy miejscach do odkrycia.
8. **Zgłoś miejsca do odkrycia** w liście miejsc, którą oddajesz (rozdział 11).

**Poziom tajemnicy:** zasłonięcie działa w wyglądzie aplikacji. Gracz, który korzysta
z aplikacji normalnie, nie zobaczy miejsca; gracz, który celowo zajrzy do plików
strony (np. narzędziami przeglądarki), mógłby je znaleźć — tak samo jak może
przeczytać nazwy miejsc w manifeście. Najważniejsze tajemnice fabuły — w `tylko-mg`.

```xml
<!-- Jaskinia na zboczu góry: góra narysowana wcześniej (w tle) jest cała. -->
<g data-element="jaskinia-wschodnia">
  <title>Smocza Jama</title>
  <path d="M1364 372 q0 -16 14 -16 q14 0 14 16 Z" fill="#2a2420" stroke="#2b1d10" stroke-width="1.4"/>
  <text class="h" x="1378" y="398" font-size="13" text-anchor="middle" fill="#2b1d10">Smocza Jama</text>
</g>
```

```json
{ "id": "jaskinia-wschodnia", "nazwa": "Smocza Jama", "aliasy": [], "kategoria": "teren",
  "opis": "Jaskinia we wschodniej części gór.", "mapa": "kraina",
  "widocznyDomyslnie": false, "dostepnyDomyslnie": false }
```

**Przykłady w przykładowych rysunkach** (w plikach szukaj komentarza albo grup o
podanych identyfikatorach):

| Rysunek | Miejsce (`data-element`) | Co pokazuje |
|---|---|---|
| `Rysunek_kraina.svg` | Smocza Jama (`smocza-jama`) | punkt na zboczu gór + ścieżka do niej **pod** górami (`data-nalezy-do`) |
| `Rysunek_kraina.svg` | Chata Zielarki (`chata-na-mokradlach`) | budynek z kładką i dymem na mokradłach (tło: sitowie) |
| `Rysunek_kraina.svg` | Stara sztolnia (`stara-sztolnia`) | wejście do kopalni na łące, napis pod spodem |
| `Rysunek_palac.svg` | Ukryte przejście (`przejscie-w-galerii`) | otwór w ścianie narysowany **na** całej ścianie (zasłonięty — zwykła ściana) |
| `Rysunek_palac.svg` | Skrytka za kominkiem (`skrytka-w-bibliotece`) | klapa w podłodze (podpis krótszy niż nazwa w manifeście) |
| `Rysunek_pole_bitwy.svg` | Pole minowe (`pole-minowe`) | duży obszar — pod spodem dorysowane leje, żeby po zasłonięciu nie został czysty prostokąt |
| `Rysunek_pole_bitwy.svg` | Tunel (`tunel-wschodni`) | linia przerywana w kolorze ziemi (nie czerwona) z dwoma włazami |
| `Rysunek_pole_bitwy.svg` | Gniazdo snajpera (`stanowisko-w-ruinach`) | stanowisko w ruinach, napis w ciemnej czerwieni (ciągły kolor — dozwolony) |

### 5.8 Grafika miejsca poza jego grupą: `data-nalezy-do`

Czasem część miejsca musi leżeć **w innej warstwie** rysunku niż reszta — np. ścieżka
do jaskini wije się **pod** górami (góry rysowane później ją przykrywają), a sama
jaskinia z napisem leży **nad** górami. Wtedy tę część rysuje się w osobnej grupie:

```xml
<!-- przed górami: ścieżka (należy do miejsca „jaskinia-wschodnia”) -->
<g data-nalezy-do="jaskinia-wschodnia">
  <path d="M1290 472 C 1300 440, 1320 400, 1364 372" fill="none" stroke="#7a5232"
        stroke-width="1.6" stroke-dasharray="1.5 4.5" stroke-linecap="round"/>
</g>
<!-- … góry … -->
<!-- po górach: samo miejsce -->
<g data-element="jaskinia-wschodnia"> … </g>
```

Zasady:

* `data-nalezy-do` stawiamy **tylko na `<g>`**; wartość = identyfikator miejsca
  (`data-element`) **z tej samej mapy**.
* Grupa **nie może leżeć w grupie `data-element`** (grafika w grupie miejsca i tak
  znika razem z nim) i **nie może zawierać** miejsc `data-element`.
* Aplikacja zasłania i odkrywa ją razem z miejscem, a u admina przygasza; **nie jest
  klikalna** (bez stref kliknięcia i narożników).
* Jednemu miejscu może odpowiadać kilka takich grup. Działa przy każdym miejscu, ale
  ma sens głównie przy miejscach do odkrycia.
* Przygotowanie map zatrzymuje się, gdy grupa wskazuje miejsce, którego nie ma na tej
  mapie, leży w grupie miejsca, zawiera miejsce albo stoi na innym elemencie niż `<g>`.

---

## 6. Znacznik 2: treść tylko dla MG `tylko-mg`

```xml
<g class="tylko-mg">
  <text x="300" y="700" font-size="12" fill="#9b2f1c">notatka MG</text>
  <polyline points="860,200 440,300" fill="none" stroke="#9b2f1c" stroke-dasharray="5 3"/>
</g>
```

### 6.1 Zasady

* Przy przygotowaniu map usuwany jest **każdy element** z klasą `tylko-mg` — w
  dowolnym miejscu drzewa, z całą zawartością. Klasę można łączyć z innymi:
  `class="tylko-mg legenda"`.
* Zalecana forma to grupa `<g class="tylko-mg">`; w jednym panelu może być wiele
  takich grup.
* **Wszystko poza grupami `tylko-mg` jest publiczne** — trafia do plików map, które
  może otworzyć każdy. Gdy masz wątpliwość, czy coś jest tajne: do `tylko-mg`.

### 6.2 Co musi trafić do `tylko-mg`

* notatki, dopiski i podpisy dla MG (np. z dopiskiem „(dla MG)”);
* ukryte przejścia, tajne miejsca, prawdziwe nazwy, „to, o czym postacie nie wiedzą” —
  chyba że admin ma je **odkryć graczom w trakcie gry**: wtedy wersję „po odkryciu”
  rysuje się jako miejsce do odkrycia (rozdział 5.7), a dopiski MG o nim — dalej tutaj;
* **czerwone linie przerywane** (w konwencji rysunków MG oznaczają wiedzę ukrytą);
* legenda MG, objaśnienia oznaczeń MG;
* całe miejsca, których istnienia gracze nie znają (kształt **i** podpis);
* opisy przekrojów i panele, które w całości są wiedzą MG (albo zostaw je poza
  obszarami map — patrz 4, zasada 5 — ale `tylko-mg` jest pewniejsze).

### 6.3 Kontrola bezpieczeństwa

Jeśli **poza** grupami `tylko-mg` (w obszarze którejś mapy) znajdą się poniższe
ślady, przygotowanie map **zatrzymuje się i nie zapisuje żadnego pliku**. Raport podaje
tylko numer i rodzaj elementu, nigdy jego treść. Kontrola obejmuje także miejsca do
odkrycia (rozdział 5.7) — są w pliku mapy dla graczy, tylko zasłonięte.

| Ślad | Gdzie jest szukany |
|---|---|
| tekst `dla MG`, `(MG)`, `MG:` albo słowo `spoiler` (wielkość liter bez znaczenia) | w napisach, `<title>` i w wartościach atrybutów (oprócz `d`, `points`, `transform`) |
| klasa `mg`, klasa zaczynająca się od `mg-` albo kończąca na `-mg` | atrybut `class` |
| **czerwona linia przerywana** | element, który **sam** ma `stroke` w odcieniu czerwieni i `stroke-dasharray` |

Wnioski:

* przerywane linie dla graczy (drogi, granice, szlaki) rysuj w kolorach
  **nieczerwonych**: czarny, szary, brązowy (np. `#6e3f22` przechodzi kontrolę);
* ciągła czerwona linia nie zatrzymuje przygotowania map (w motywach fosforu będzie
  zwykłą jasną linią, w kolorach oryginału — czerwoną);
* nie używaj słów „spoiler”, „MG:” ani „(MG)” w napisach dla graczy;
* **nie obchodź tej kontroli** — popraw rysunek.

---

## 7. Znacznik 3: napis z obwódką `h`

`class="h"` na `<text>` daje napisowi **obwódkę w kolorze tła** (tzw. halo), żeby był
czytelny na liniach i deseniach. W rysunku zdefiniuj ją w `<defs>`:

```xml
<style>.h { stroke: #efe3c4; stroke-width: 3px; paint-order: stroke; stroke-linejoin: round; }</style>
```

* W motywach fosforu ta reguła i tak zostaje podmieniona (obwódka w kolorze ekranu).
* W trybie **kolory oryginału** obwódka ma kolor `stroke` z reguły `.h` rysunku
  (tylko kolor — `#rrggbb` albo `rgb()`; grubość zawsze 3). Bez takiej reguły —
  biała. Ustaw więc `stroke` na kolor „papieru” Twojej mapy (np. `#f3ead2`).
* Z arkuszy `<style>` brany jest **tylko** ten kolor, a same arkusze są usuwane —
  **każdy**, w dowolnym miejscu rysunku (także schowany w grupie). W aplikacji mapa
  staje się częścią strony, więc arkusz z rysunku działałby na **całą stronę** (np.
  mógłby ją ukryć) — dlatego żaden nie trafia do mapy graczy. Regułę `.h` trzymaj
  dla porządku w `<defs>`. Nie definiuj w arkuszu kolorów innych elementów
  (rozdział 8) — i tak przepadną.

**Nazwy klas zarezerwowane** — nie nadawaj ich elementom rysunku: `el`, `el-…`
(m.in. `el-dostepny`, `el-niewidoczny`, `el-zasloniety`, `el-odkryte`), `ds-…`,
`wybrany`, `mapa-slate`, `motyw-…`, `plansza` (używa ich aplikacja) oraz `mg`, `mg-…`,
`…-mg` (kontrola bezpieczeństwa). `tylko-mg` — wyłącznie dla treści MG.
**Atrybuty zarezerwowane:** `data-element` (rozdział 5), `data-nalezy-do` (5.8),
`data-mapa`, `data-wersja` (nadawane przy przygotowaniu map) — tylko w tych znaczeniach.

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

Każdy kolor zamieniany jest na **jasność fosforu** na ciemnym ekranie, jak przy
rysunku ciemnym tuszem na jasnym papierze:

* ciemny kolor (czarny tusz) → **jasno świecąca** linia lub plama;
* jasny kolor (papier, biel) → **ciemne tło** ekranu;
* odcień (czerwony, niebieski, zielony) **przepada** — liczy się tylko jasność.

Najlepiej więc rysować na **jasnym tle** (papier, beż, jasny błękit) **ciemniejszymi**
liniami i napisami. Ciemne tło w oryginale (np. nocna mapa) da w motywach fosforu
jaskrawą, oślepiającą planszę z ciemnymi napisami.

Dodatkowo duże powierzchnie są **przygaszane**, żeby nie oślepiały:

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
  także na kolorowych mapach zatrzymują przygotowanie map.

### 8.4 Jak zapisywać kolory

| Dobrze | Źle (co się stanie) |
|---|---|
| atrybuty: `fill="#2b2116"`, `stroke="#4d4030"` | kolor w klasie z `<style>` (`.las{fill:…}`) — `<style>` jest usuwany, kształt dostaje domyślne **czarne** wypełnienie: w oryginale czarna plama, w fosforze świeci pełną mocą (sprawdzone) |
| styl w elemencie: `style="fill:#2b2116;stroke:#000"` (kolor zostanie przeniesiony do atrybutu) | `hsl(…)`, `currentColor`, nazwy typu `navy`, `teal`, `beige` — **nie zostaną przeliczone**: w motywach fosforu zostaną w oryginalnej barwie na ciemnym ekranie (sprawdzone) |
| `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb(…)`, `rgba(…)` | |
| nazwy: `black`, `white`, `gray`/`grey`, `silver`, `red`, `green`, `blue`, `maroon`, `darkred`, `crimson`, `firebrick`, `brown`, `orange`, `yellow` | inne nazwy kolorów |
| `fill="none"`, `fill="url(#deseń)"` | |

### 8.5 Pułapki

* **Domyślne wypełnienie w SVG jest czarne.** Linie łamane (`<polyline>`) i otwarte
  ścieżki (`<path>`) bez `fill="none"` zostaną wypełnione (czarna albo świecąca
  plama). Każdej linii daj jawnie `fill="none"`.
* Grupy mogą przekazywać kolor dzieciom (`<g fill="#000">`) — to działa w obu
  trybach, ale prościej i pewniej wpisywać kolor w każdy kształt.
* Nie używaj filtrów (`<filter>`, cienie, rozmycia, poświata) — ich kolory nie zostaną
  przeliczone, a na tabletach filtry spowalniają przesuwanie mapy. Poświatę i linie
  skanowania (w motywach fosforu) dodaje aplikacja.
* Nie używaj masek (`<mask>`) — w motywach fosforu przestają działać poprawnie.
* Nie rysuj w kolorach ekranu (zielony fosfor itp.) — motywy policzą się same.
  Rysuj w kolorach, w jakich mapa ma wyglądać w trybie oryginału.

---

## 9. Napisy i czytelność

* **Krój pisma znika**: wszystkie `font-family` są usuwane, mapa używa czcionki
  o stałej szerokości (Ubuntu Mono / DejaVu Sans Mono / Consolas) — w każdym trybie,
  także w kolorach oryginału. Napisy będą zwykle **szersze** niż w podglądzie
  rysunku — zostaw wokół nich zapas miejsca. Licz szerokość napisu jak dla
  najszerszej z tych czcionek: **liczba znaków × `font-size` × 0,6**
  (+ `letter-spacing` × liczba znaków), np. „Zejście do piwnic” w rozmiarze 13 ≈ 133
  jednostki (rozdział 17.2).
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
| `defs`, `pattern`, `linearGradient`, `radialGradient`, `stop`, `marker`, `clipPath` | ✅ | definicje w `<defs>`; nieużywane są usuwane |
| `title` | ✅ | w grupie `data-element` (5.3); w mapach dla graczy jest usuwany |
| atrybut `id` | ✅ | unikalny w pliku; odwołania tylko przez `url(#id)` i `href="#id"` (nazwa mapy zostanie doklejona do obu) |
| `transform` | ✅ | `translate`, `rotate`, `scale`, `matrix`, `skewX`, `skewY` |
| `style` (atrybut w elemencie) | ✅ | tylko proste właściwości (`fill`, `stroke`, …) |
| `<style>` (arkusz) | ⚠️ | tylko reguła `.h`, najlepiej w `<defs>` (rozdział 7); brany jest z niej tylko kolor obwódki, a **każdy** arkusz jest usuwany (w dowolnym miejscu rysunku) — kolorów innych elementów w nim nie definiuj |
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
kilka tysięcy elementów na mapę (przykłady: ok. 550–1800) i unikaj gigantycznych
ścieżek z automatycznej wektoryzacji. Desenie (`<pattern>`) są w porządku.

---

## 11. Co oddajesz: rysunek i dane do manifestu

Twoim rezultatem jest **rysunek** (plik `.svg`). Rysunek działa w parze z
**manifestem kampanii** (plik `kampania.json`), w którym są mapy (zakładki) i lista
miejsc z nazwami, opisami i ustawieniami. Manifest uzupełnia osoba prowadząca
aplikację — **o tym, które miejsca do niego trafią, co będzie klikalne i co jest do
odkrycia, decyduje użytkownik**. Ty podajesz dane, z których go przygotuje.

**Oddaj razem z rysunkiem:**

1. **Listę miejsc** — dla każdej grupy `data-element`: identyfikator, jawną nazwę,
   proponowaną kategorię i krótki **jawny** opis (to, co mogą wiedzieć gracze) oraz
   informację, czy ma być **klikalne od początku** i czy jest **do odkrycia**
   (`"widocznyDomyslnie": false`).
2. **Dla każdej mapy (zakładki):** proponowany identyfikator i nazwę, `obszar`
   (`"x y szerokość wysokość"` — przy osobnym pliku na mapę to cały `viewBox`) i punkt
   `start` (`{ "x": …, "y": … }` wewnątrz obszaru — na nim mapa otwiera się na
   telefonie; wybierz najważniejsze miejsce mapy).
3. Jeśli jakieś miejsce ma prowadzić do innej mapy (np. pałac na mapie krainy otwiera
   plan pałacu) — wskaż, do której (`mapaSzczegolowa`).

Pola manifestu związane z rysunkiem (dla zrozumienia, co podajesz):

| Pole | Znaczenie |
|---|---|
| `mapy[].id` | identyfikator mapy (małe litery, cyfry, myślniki), np. `okolice`; doklejany do `id` w pliku mapy |
| `mapy[].nazwa` | nazwa zakładki w aplikacji |
| `mapy[].zrodlo.plik`, `mapy[].zrodlo.obszar` | nazwa pliku rysunku i `"x y szerokość wysokość"` fragmentu z tą mapą (rozdział 4) |
| `mapy[].kolor` | kolor na start: `oryginalny` (mapa w kolorach rysunku — domyślny), `zielony`, `bursztynowy` albo `czerwony` (admin zmienia go w aplikacji) |
| `mapy[].start` | punkt **wewnątrz obszaru**, na który mapa otwiera się na telefonie |
| `elementy[].id` | dokładnie taki sam jak `data-element` na rysunku |
| `elementy[].nazwa`, `aliasy` | nazwa wyświetlana; dawne/inne nazwy (dla wyszukiwarki) |
| `elementy[].kategoria`, `opis` | grupa w indeksie miejsc; krótki **jawny** opis w karcie miejsca |
| `elementy[].mapa` | `id` mapy, na której obszarze leży miejsce |
| `elementy[].widocznyDomyslnie` | `false` = **miejsce do odkrycia** — na start zasłonięte przed graczami (rozdział 5.7); brak pola albo `true` = widoczne |
| `elementy[].dostepnyDomyslnie` | `true` = na start **klikalne** dla graczy (karta i notatki); przy miejscu do odkrycia — klikalne od razu po odkryciu (zwykle `false`: klikalność admin zaznacza osobno) |
| `elementy[].mapaSzczegolowa` | (opcjonalnie) `id` innej mapy z planem tego miejsca |

Zasady:

* **Nie wymyślaj miejsc, nazw ani treści fabularnych**, o które nie proszono.
* Manifest jest **publiczny**: nazwy, aliasy i opisy muszą być jawne — także przy
  miejscach do odkrycia.
* Wartości domyślne (`widocznyDomyslnie`, `dostepnyDomyslnie`) obowiązują, dopóki
  admin nie zmieni ich w aplikacji; plik mapy od nich nie zależy.

Przykład pasującego fragmentu manifestu: rozdział 16.

---

## 12. Sprawdzenie gotowego rysunku

Po oddaniu pliku osoba prowadząca aplikację sprawdza go narzędziem przygotowania map.
Zanim oddasz plik, sprawdź go sam — tak, żeby to sprawdzenie przeszło bez błędów:

1. **Otwórz plik SVG w przeglądarce.** Jeśli się nie wyświetla — błąd XML (rozdział 3:
   niezamknięty znacznik, `&nbsp;`, brak `xmlns`).
2. **Policz miejsca:** każda grupa `data-element` ma poprawny, unikalny identyfikator
   (5.2), `<title>` i podpis; liczba grup zgadza się z listą miejsc, którą oddajesz.
3. **Obszary:** każdy element najwyższego poziomu leży w całości w jednym obszarze;
   nic ważnego nie leży poza obszarami (rozdział 4).
4. **Materiał MG:** poza `tylko-mg` nie ma słów „dla MG”, „(MG)”, „MG:”, „spoiler”,
   klas `mg`/`mg-…`/`…-mg` ani czerwonych linii przerywanych (rozdział 6.3) — inaczej
   przygotowanie map się zatrzyma.
5. **Grupy `data-nalezy-do`:** tylko na `<g>`, wskazują istniejące miejsce z tej samej
   mapy, nie leżą w grupie miejsca i nie zawierają miejsc (5.8).
6. **Napisy:** policz szerokość dłuższych napisów (znaki × `font-size` × 0,6) — mieszczą
   się w kadrze i nie nachodzą na inne napisy w czcionce o stałej szerokości.
7. **Dwa stany mapy** (gdy są miejsca do odkrycia): obejrzyj rysunek normalnie i bez
   miejsc do odkrycia (np. tymczasowo dopisz im `visibility="hidden"` albo wyobraź
   sobie je usunięte) — w zasłoniętym miejscu nie może być dziury ani niczego, co je
   zdradza; po odkryciu napisy nie nachodzą na inne.
8. **Kolory:** wyobraź sobie mapę w odcieniach jednego koloru (jasność odwrócona —
   rozdział 8.2): czy rzeczy do odróżnienia różnią się jasnością, kreską albo deseniem?

Przygotowanie map wypisuje też miejsca z rysunku, których nie ma w manifeście, i
miejsca z manifestu, których zabrakło na rysunku — dlatego lista miejsc z rozdziału 11
musi się zgadzać z rysunkiem.

---

## 13. Typowe błędy

| Objaw | Przyczyna | Naprawa |
|---|---|---|
| mapy są puste (0 miejsc), choć nie ma błędu | plik to strona HTML z osadzonym `<svg>` albo zły `obszar` | samodzielny plik `.svg` (rozdział 1); popraw `obszar` |
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
| przygotowanie map zatrzymuje się na „czerwonej linii przerywanej” | przerywana linia w czerwonym odcieniu poza `tylko-mg` | jeśli to MG — do `tylko-mg`; jeśli dla graczy — zmień kolor na nieczerwony |
| po zasłonięciu miejsca na mapie gracza jest dziura albo podejrzanie pusty obszar | pod miejscem do odkrycia nie ma pełnego tła | dorysuj tło pod miejscem (rozdział 5.7, zasada 2) |
| po zasłonięciu dalej widać część miejsca (ścieżkę, napis, otwór w ścianie) | ta część leży poza grupą `data-element` | przenieś ją do grupy albo do grupy `data-nalezy-do` (5.8) |
| miejsce do odkrycia widać u graczy od początku | nie zostało zgłoszone jako „do odkrycia” (brak `"widocznyDomyslnie": false` w manifeście) albo admin już je odkrył | zgłoś je w liście miejsc (rozdział 11) |

---

## 14. Nowa wersja istniejącego rysunku

* **Zachowaj wszystkie identyfikatory `data-element`** z poprzedniej wersji — także
  gdy zmienia się kształt, położenie albo nazwa miejsca.
* Zmiana nazwy miejsca: zmienia się `<title>` i podpis na rysunku, a w manifeście
  `nazwa` (starą nazwę dopisuje się do `aliasy`). Identyfikator zostaje.
* Usunięcie miejsca z rysunku nie kasuje notatek graczy — trafią do listy „Notatki bez
  miejsca na mapie”. Zgłoś usunięte miejsca razem z nową wersją.
* Stan miejsc w aplikacji (odkryte, klikalne) jest zapisany przy **identyfikatorze** —
  nowa wersja rysunku go nie zmienia (miejsce odkryte zostaje odkryte).
* Nie przesuwaj paneli bez potrzeby — zmiana położenia panelu wymaga zmiany
  `obszar` i `start` w manifeście.

---

## 15. Lista kontrolna

Plik:

- [ ] samodzielny plik `.svg` (nie HTML), korzeń `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 W H">`
- [ ] poprawny XML: zamknięte znaczniki, brak `&nbsp;` i innych encji HTML, UTF-8
- [ ] brak `<image>`, `<use>`, `<filter>`, `<mask>`, `<script>`, `<foreignObject>`, odnośników, animacji
- [ ] `<style>` (jeśli jest) tylko z regułą `.h`, w `<defs>`; brak skrótu `style="font: …"`

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

Miejsca do odkrycia (jeśli są):

- [ ] narysowane jak zwykłe miejsca (wersja „po odkryciu”), poza `tylko-mg`; identyfikatory obojętne
- [ ] pod każdym pełne tło; wszystko, co je zdradza, w jego grupie albo w `data-nalezy-do`
- [ ] rysunek bez miejsc do odkrycia nie ma dziur ani śladów; legenda ich nie zdradza

Kolory i napisy:

- [ ] mapa dobrze wygląda w swoich kolorach (tryb „kolory oryginału”), każdy panel ma pełne tło
- [ ] rzeczy do odróżnienia różnią się jasnością, kreską albo deseniem — nie tylko barwą (motywy fosforu)
- [ ] jasne tło, ciemniejsze linie i napisy; kolory nic nie zdradzają
- [ ] kolory w atrybutach `fill`/`stroke` (`#rrggbb`, `rgb()`), nie w `<style>`; linie z `fill="none"`
- [ ] przerywane linie dla graczy w kolorach nieczerwonych; malinowego `#e6007e` nie używaj do oznaczeń
- [ ] reguła `.h { stroke: <kolor papieru> }` w `<defs>`
- [ ] `font-size` liczbowy, podpisy 11–16; zapas miejsca na szerszą czcionkę; napisy na liniach z `class="h"`

Na koniec:

- [ ] sprawdzenie z rozdziału 12 bez zastrzeżeń
- [ ] oddajesz plik `.svg` i listę miejsc (identyfikator, nazwa, opis, klikalne od początku?, do odkrycia?) oraz obszary i punkty `start` map (rozdział 11)
- [ ] nie dodano miejsc, nazw ani treści, o które nie proszono

---

## 16. Pełny przykład

Wymyślony rysunek (nie pochodzi z żadnej kampanii) z dwoma panelami: **A — Okolice**
i **B — Miasto**. W panelu A jest miejsce do odkrycia (**Stara Kopalnia**) z grupą
`data-nalezy-do` (ścieżka do kopalni). Sprawdzony narzędziem przygotowania map:
2 grupy `tylko-mg` usunięte, 4 miejsca na mapie „okolice”, 2 na mapie „miasto”, bez
błędów.

Większe, kompletne przykłady (osobny plik na każdą mapę, dziesiątki miejsc, desenie,
napisy z obwódką, przykładowa grupa `tylko-mg`, miejsca do odkrycia i grupa
`data-nalezy-do`): `Rysunek_kraina.svg` (mapa fantasy), `Rysunek_palac.svg` (plan
budynku, szkic) i `Rysunek_pole_bitwy.svg` (mapa taktyczna) — patrz rozdział „Pliki”.

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

  <!-- Miejsce do odkrycia: w manifeście "widocznyDomyslnie": false. Pod nim jest tylko
       tło panelu (piasek), więc po zasłonięciu nie zostaje dziura. Ścieżka do kopalni
       leży poza grupą miejsca, ale znika i pojawia się razem z nim (data-nalezy-do). -->
  <g data-nalezy-do="kopalnia-polnocna">
    <path d="M900 360 C 950 400, 1000 520, 1040 600" fill="none" stroke="#6e3f22" stroke-width="2"
          stroke-dasharray="2 5" stroke-linecap="round"/>
  </g>
  <g data-element="kopalnia-polnocna">
    <title>Stara Kopalnia</title>
    <path d="M1026 620 q0 -22 18 -22 q18 0 18 22 Z" fill="#2a2420" stroke="#2b1d10" stroke-width="1.5"/>
    <text class="h" x="1044" y="645" font-size="14" text-anchor="middle" fill="#2b2116">Stara Kopalnia</text>
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

Pasujący fragment manifestu (przygotowany z listy miejsc z rozdziału 11 — tu dwa wpisy
z sześciu):

```json
"elementy": [
  { "id": "przelecz-wiatru", "nazwa": "Przełęcz Wiatru", "aliasy": [], "kategoria": "szlak",
    "opis": "Przełęcz w górach na północy.", "mapa": "okolice", "dostepnyDomyslnie": true },
  { "id": "kopalnia-polnocna", "nazwa": "Stara Kopalnia", "aliasy": [], "kategoria": "budowla",
    "opis": "Zapomniane wejście do kopalni.", "mapa": "okolice",
    "widocznyDomyslnie": false, "dostepnyDomyslnie": false }
],
"mapy": [
  {
    "id": "okolice", "nazwa": "Okolice", "plik": "mapa_okolice.svg",
    "kolor": "oryginalny", "widocznaDomyslnie": true,
    "start": { "x": 600, "y": 400 },
    "zrodlo": { "plik": "Rysunek_MG.svg", "obszar": "20 20 1160 780" }
  },
  {
    "id": "miasto", "nazwa": "Miasto", "plik": "mapa_miasto.svg",
    "kolor": "oryginalny", "widocznaDomyslnie": false,
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
  kontrolę bezpieczeństwa; czerwona przerywana poza `tylko-mg` zatrzymałaby
  przygotowanie map;
* `Stara Kopalnia` trafia do mapy „okolice” razem ze ścieżką (`data-nalezy-do`);
  gracze nie widzą ani kopalni, ani ścieżki, dopóki admin jej nie odkryje;
* deseń `piasek` dostaje w pliku mapy nazwę `okolice-piasek`; czcionka Georgia
  i wszystkie `<title>` znikają;
* w motywach fosforu jasne tło `#efe3c4` staje się ciemnym ekranem, a ciemne linie i
  napisy — jasnym fosforem; w trybie kolorów oryginału mapa wygląda jak rysunek
  (beżowy papier, brązowe linie), a napisy z `class="h"` mają obwódkę `#efe3c4`
  z reguły `.h` (sprawdzone w przeglądarce we wszystkich czterech trybach).

---

## 17. Praktyczne wskazówki (z rysowania przykładowych map)

Trzy przykładowe mapy — `Rysunek_kraina.svg` (fantasy), `Rysunek_palac.svg` (szkic
planu pałacu) i `Rysunek_pole_bitwy.svg` (mapa taktyczna) — powstały z krótkich
skryptów w Pythonie. Poniżej problemy, które wyszły przy ich rysowaniu, i sprawdzone
rozwiązania. Liczby (rozmiary, liczba elementów) pochodzą z tych map.

### 17.1 Sposób pracy

* **Skrypt zamiast ręcznego rysowania**, gdy na mapie są setki powtarzalnych rzeczy
  (drzewa, góry, domy, leje, worki z piaskiem). Skrypt ze **stałym ziarnem losowania**
  daje za każdym razem ten sam plik, więc poprawka = zmiana w skrypcie i ponowne
  uruchomienie. Wystarczy biblioteka standardowa (gładkie krzywe, losowanie punktów w
  obszarze, linie „odręczne”). Rysunek z Inkscape też jest w porządku — specyfikacja
  dotyczy pliku, nie narzędzia.
* **Oglądaj wynik w czcionce o stałej szerokości i w powiększeniu** — nachodzące
  napisy i źle narysowane drzwi widać dopiero przy 2–3×. Najpierw całość, potem
  fragmenty.
* **Osobny plik na każdą mapę** (`obszar` = cały rysunek) jest prostszy niż jeden
  rysunek z panelami — nie trzeba pilnować granic paneli.

### 17.2 Napisy — najczęstszy problem

* W aplikacji napisy mają czcionkę o stałej szerokości, szerszą niż szeryfowa czy
  odręczna z rysunku. **Pięć napisów** w przykładowych mapach wychodziło za kadr albo
  nachodziło na inne dopiero w mapie dla graczy. Planuj miejsce wzorem
  **znaki × `font-size` × 0,6** (czcionka zastępcza DejaVu Sans Mono; Ubuntu Mono
  ma ok. 0,5 — margines bezpieczeństwa).
* Przy prawej krawędzi: `text-anchor="end"` albo napis w dwóch liniach (`<tspan>`).
  Nazwę złożoną z kilku linii zapisz jako **jeden** `<text>` z kilkoma `<tspan>` —
  złote narożniki obejmą wtedy cały blok.
* **Napis na gęstym tle** (las, góry, leje): zostaw w tle wolne miejsce na napis
  (np. nie stawiaj drzew w prostokącie napisu) zamiast liczyć tylko na obwódkę `h`.
  Nazwę pasma gór najlepiej postawić w pustym miejscu obok gór, nie na szczytach.
* **Napis na drodze** (asfalt): jasny tekst bez `class="h"`, przesunięty z linii
  środkowej — przerywana linia przecinała litery.
* Mapa szersza niż ekran otwiera się **przybliżona na punkt `start`** (na komputerze
  1280 px mapa 1600 jednostek też) — miejsca przy brzegach są wtedy poza kadrem i
  gracz dochodzi do nich przesuwaniem albo przez indeks. `start` stawiaj w
  najważniejszym miejscu (w przykładach: miasto, hol pałacu, barykada).

### 17.3 Duże obszary klikalne i kolejność rysowania

* **Las, jezioro, ziemia niczyja:** jako pierwszy kształt w grupie `data-element`
  daj półprzezroczysty wielokąt w kolorze obszaru (`fill-opacity="0.4"`–`0.6`) —
  dzięki niemu klikalny jest cały obszar, a nie tylko pojedyncze drzewa czy leje.
  Taką grupę zapisz **przed** mniejszymi miejscami, które na niej leżą.
* **Rzeka przez miasto:** wypełniony grunt miasta (w grupie miasta) zasłania rzekę
  narysowaną wcześniej — narysuj ten odcinek rzeki jeszcze raz w grupie miasta (tą
  samą ścieżką; poza murami pokrywa się z oryginałem i nie widać różnicy).
* **Plan budynku:** pomieszczenie = grupa `data-element` z wypełnionym prostokątem
  podłogi (klikalna cała podłoga), meblami i podpisem; korytarze i pomieszczenia
  gospodarcze jako zwykłe tło. **Ściany rysuj na końcu** (na wierzchu): tło nie
  przechwytuje kliknięć, więc pokój pod ścianą dalej działa, a ściany są wyraźne.
* **Obrócony obiekt** (np. czołg wzdłuż drogi): kształty w zwykłej podgrupie
  `<g transform="rotate(…)">` wewnątrz grupy `data-element`, a podpis **poza**
  obrotem — zostanie poziomy i czytelny.
* Nie wszystko musi być klikalne: małe osady, karczma czy korytarze jako tło
  pokazują graczom, że mapa jest „pełna”, a indeks zostaje krótki.

### 17.4 Kolory i motywy fosforu

* **Grube linie świecą pełną mocą.** Przygaszane są tylko duże **wypełnienia**
  (rozdział 8.2), obrysy nie. Szeroką drogę, rzekę czy pas startowy rysuj jako
  **wypełniony wielokąt** (brzegi = linia środkowa przesunięta w obie strony), nie
  jako `stroke-width="40"` — inaczej w motywie zielonym będzie oślepiającym pasem.
* **Czerwona przerywana linia jest zakazana także w treści dla graczy** (np. trasa
  patrolu wroga na mapie wojskowej) — przygotowanie map się zatrzyma. Użyj linii
  ciągłej albo przerywanej pomarańczowej/żółtej (np. `#d9a520`; „czerwony” to odcień
  do ok. 15°).
* Wzór o dużym kontraście na dużej powierzchni (szachownica posadzki) męczy oko —
  rozjaśnij ciemne pola.
* Tytuł i legendę stawiaj na **jasnej** tabliczce z ciemnym tekstem (np. `#e6dcc0`) —
  dobrze wygląda w obu rodzajach trybów. Ciemna tabliczka z jasnym tekstem zamieni się
  w motywach fosforu w świecący prostokąt z ciemnymi literami.
* „Akwarelowe” podbarwienie pomieszczeń czy pól: wypełnienie z `fill-opacity` —
  działa w obu trybach. Palety przykładów: fantasy — 6 rodzin barw (papier, zielenie
  lasu, szarości gór, błękit wody, czerwień dachów, brąz dróg); pałac — sepia z
  przygaszonymi kolorami pomieszczeń; pole bitwy — najwięcej barw (ochra gruntu,
  oliwkowy czołg, żółto-czarne pasy ostrzegawcze, błękit sił własnych, czerwień wroga,
  zieleń skażenia, ogień), a mimo to czytelna, bo każda barwa ma jedno znaczenie.

### 17.5 Liczba elementów i wydajność

* **Wiele drobnych kresek w jednym kolorze** (kępki trawy, pagórki, szwy worków z
  piaskiem, deski w okopach, gruz, pnie drzew) → **jedna** ścieżka `<path>` z wieloma
  odcinkami `M…`. Przykłady: Kraina ok. 1800 elementów (ok. 520 drzew po 2
  elementy), Pole bitwy ok. 800, Pałac ok. 550 — wszystkie płynnie przesuwają się na
  telefonach i tablecie.
* **Drzewa:** pnie wszystkich drzew w jednej ścieżce narysowanej **przed** koronami,
  a korony posortowane od góry mapy do dołu — bliższe drzewa przykrywają dalsze.
* **Naturalny rozkład** (drzewa, leje, kępki): punkty w minimalnej odległości od siebie
  (tzw. losowanie Poissona) zamiast siatki albo zwykłego losowania (zlepione grupy i
  dziury).
* **Nie przesadzaj z gęstością:** pierwsza wersja pola bitwy miała 220 lejów, które
  zasłaniały obiekty i napisy. Pomogła lista prostokątów „bez lejów” wokół obiektów i
  napisów — zostało ok. 90.

### 17.6 Styl „odręczny” bez filtrów

* Filtrów nie wolno (rozdział 8.5), więc szkic robi się geometrią: linie podzielone na
  krótkie odcinki lekko przesunięte w poprzek, druga cienka kreska obok grubej ściany,
  nieregularne krzywe dla plam, kleksów i brzegów.
* **Postarzały papier:** kratka jako `<pattern>`, ciemniejszy brzeg arkusza jako jedna
  ścieżka z dziurą (`fill-rule="evenodd"`), plamy po kawie jako półprzezroczyste okręgi.
  Unikaj dużego, wyraźnego owalu na środku mapy — wygląda jak błąd rysunku.
* **Drzwi i okna na planie:** przerwa w ścianie + skrzydło (kreska) + ćwierćokrąg
  otwarcia (`A` w ścieżce); okno — jasny prostokąt na ścianie z cienką kreską szyby.
* Odręczne dopiski („ołówkiem”) dodają klimatu, ale są **jawne** — na mapie dla graczy
  piszemy tylko to, co postacie mogą wiedzieć.

### 17.7 Przykładowa treść dla MG

* Każdy przykładowy rysunek ma jedną przykładową grupę `tylko-mg` (ramka z napisem
  „Przykład: notatka dla MG…”, czerwona przerywana obwódka). Przy przygotowaniu map
  znika w całości — tak samo zrób z treścią dla MG na własnym rysunku.

### 17.8 Miejsca do odkrycia (z rysowania przykładów)

Na każdej przykładowej mapie są 2–3 miejsca do odkrycia (tabela w rozdziale 5.7).
Przy ich rysowaniu wyszło:

* **Najprościej, gdy miejsce leży na tle, nie w tle.** Jaskinia nad zboczem gór, chata
  na sitowiu, sztolnia na łące, skrytka na podłodze — wystarczyło narysować je **po**
  tle. Smocza Jama była tak narysowana od początku, więc stała się miejscem do odkrycia
  bez zmiany rysunku (tylko `widocznyDomyslnie: false` w manifeście).
* **Otwór w ścianie** (ukryte przejście): ściana zostaje cała, a miejsce do odkrycia
  rysuje na niej prostokąt w kolorze podłogi (otwór), ościeża i drzwi. Zasłonięte —
  widać zwykłą ścianę. Grupę miejsca zapisz **po** ścianach.
* **Duży obszar** (pole minowe): pod nim było puste pole (bez lejów, żeby nie zasłaniały
  min) — po zasłonięciu zostałby podejrzanie czysty prostokąt w zrytej ziemi. Pomogło
  kilka lejów narysowanych **pod** polem minowym; prześwitują przez jego
  półprzezroczyste wypełnienie i wyglądają naturalnie w obu stanach.
* **Skrypt z ziarnem losowania:** nowe elementy dorysowuj **bez** zmiany kolejności
  losowania — osobnym generatorem liczb losowych albo bez losowania. Inaczej przesunie
  się cała reszta mapy (drzewa, leje) i napisy zaczną na siebie nachodzić.
* **Ścieżka pod górami** (`data-nalezy-do`): grupa zapisana przed górami — szczyty
  przykrywają jej fragmenty i ścieżka „wije się” między nimi. Prowadź ją tak, żeby nie
  przechodziła pod napisem miejsca.
* **Legenda:** oznaczenie „jaskinia” zostało, bo jaskinię ma też jawna osada na tej
  samej mapie. Gdyby występowało tylko przy miejscu do odkrycia, zdradzałoby je.
* Sprawdzaj oba stany: z odkrytymi miejscami (napisy nie nachodzą na inne) i bez nich
  (bez dziur, bez śladów).
