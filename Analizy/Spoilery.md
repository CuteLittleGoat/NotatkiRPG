# Odkrywanie miejsc na mapach — admin zasłania i odsłania je graczom

Analiza z 2026-11-16. **Nic z tego nie jest wdrożone** — to materiał do decyzji.

Pytanie: czy admin może w aplikacji **odkrywać i zasłaniać miejsca na mapach** — nie
tylko decydować, czy miejsce jest klikalne, ale też, **czy gracze w ogóle je widzą**.
Przykłady: „Smocza Jama” pojawia się na mapie dopiero wtedy, gdy gracze wyśledzą
gniazdo smoka; ukryte przejście w pałacu pojawia się na planie, gdy gracze je znajdą.
Pomysł: przy każdym miejscu dwa pola wyboru — **„widoczne”** i **„klikalne”**;
„klikalne” da się zaznaczyć tylko wtedy, gdy zaznaczone jest „widoczne” (inaczej to
pole jest nieaktywne).

## W skrócie

* **Da się — i pasuje to do tego, jak aplikacja działa dziś.** Przy każdym miejscu
  będą dwa pola: **👁 widoczne** i **◈ klikalne**. Dopóki „widoczne” jest odznaczone,
  pole „klikalne” jest szare (nieaktywne).
* **Odkrycie działa od razu:** gracze zobaczą nowe miejsce na swoich ekranach w
  chwili, gdy je zaznaczysz — bez odświeżania strony (tak jak dziś działa pole
  „dostępne dla graczy”). Można więc odkrywać miejsca **w trakcie sesji**.
* **Nowe schematy rysunku nie są potrzebne.** Miejsce do odkrycia rysuje się tak jak
  każde inne miejsce (znacznik `data-element`), a w manifeście dostaje nowe pole „na
  start niewidoczne” (`"widocznyDomyslnie": false`). Specyfikację rysunku trzeba
  uzupełnić o kilka zasad (np. pod miejscem musi być narysowane pełne tło) —
  rozdział 6. Opcjonalnie dochodzi jeden nowy, prosty znacznik.
* **Jedno ograniczenie, takie samo jak przy wszystkich dzisiejszych ukryciach:**
  zasłonięte miejsce jest w pliku mapy, który pobiera przeglądarka. Gracz, który
  korzysta z aplikacji normalnie, go nie zobaczy. Gracz, który **celowo** zajrzy do
  plików strony (narzędziami przeglądarki), mógłby je znaleźć — tak samo jak dziś może
  przeczytać nazwy nieudostępnionych miejsc w manifeście albo rysunki MG w
  repozytorium. **Najważniejsze tajemnice zostają jak dziś w `tylko-mg`.**
* **Wymaga nowego pola w bazie** — czyli nowej wersji reguł bazy do wklejenia w
  konsoli Firebase (ok. 5 minut, instrukcja krok po kroku, jak przy poprzednich zmianach).
* **Rekomendacja: wariant A** („zasłona w aplikacji”). Nakład pracy: **średni** —
  podobny jak przy zapamiętanym logowaniu.

## 1. Jak jest dziś

* Każde miejsce z manifestu ma dziś **jedno** ustawienie admina: **„dostępne dla
  graczy”** (pole wyboru w indeksie, w karcie miejsca i w zakładce ADMIN).
  Zaznaczone = złote narożniki, miejsce można kliknąć i robić przy nim notatki.
  Odznaczone = miejsce **dalej jest narysowane na mapie**, tylko wygląda jak tło i nie
  da się go kliknąć.
* Przykład z kampanii Wzór: „Smocza Jama” jest na start nieklikalna, ale **jaskinię i
  napis „Smocza Jama” widać na mapie Kraina** — gracze od początku wiedzą, gdzie jest.
* Jeśli już samo istnienie miejsca jest tajemnicą, dziś rysuje się je w grupie
  `tylko-mg` — skrypt map usuwa je z map dla graczy. Żeby je później odkryć, trzeba
  **zmienić rysunek** (przenieść miejsce z `tylko-mg` na mapę), uruchomić skrypt map i
  opublikować stronę — czyli poprosić agenta AI. **W trakcie sesji tego się nie zrobi.**
* Ustawienia admina leżą w bazie (dokument `ustawienia/mapy` kampanii) i docierają do
  graczy na żywo. Domyślne wartości są w manifeście (`dostepnyDomyslnie`).

## 2. Co trzeba rozstrzygnąć

1. **Jak bardzo tajne ma być zasłonięte miejsce?** Czy wystarczy, że nie widać go w
   aplikacji, czy ma go nie być także w plikach, które pobiera przeglądarka gracza?
   To pytanie najmocniej wpływa na nakład pracy (rozdział 3).
2. **Jak dokładnie działają dwa pola** — co się dzieje przy odznaczeniu „widoczne”,
   czy odkrycie od razu robi miejsce klikalnym, czy odkrycie wymaga potwierdzenia
   (rozdział 5 i decyzje w rozdziale 9).
3. **Jak rysować miejsca do odkrycia** — co trzeba dopisać do specyfikacji rysunku
   (rozdział 6).

## 3. Możliwe rozwiązania

### Wariant A — zasłona w aplikacji (polecany)

Jak to działa:

* **Rysunek:** miejsce do odkrycia rysuje się jako zwykłe miejsce `data-element` —
  **tak, jak gracze mają je zobaczyć po odkryciu**. Dopiski dla MG o tym miejscu
  zostają osobno w `tylko-mg`.
* **Manifest:** przy tym miejscu nowe pole `"widocznyDomyslnie": false` („na start
  niewidoczne”). Bez tego pola miejsce jest widoczne — więc w istniejących kampaniach
  nic się nie zmienia.
* **Plik mapy** zawiera to miejsce, ale aplikacja **zasłania** je u graczy, zanim mapa
  pojawi się na ekranie.
* **Admin** widzi zasłonięte miejsce przygaszone (półprzezroczyste) — może je kliknąć,
  otworzyć kartę i zaznaczyć „widoczne”.
* Po zaznaczeniu „widoczne” aplikacja zapisuje to w bazie, a gracze widzą miejsce od
  razu.

Zalety: odkrycie jednym kliknięciem, na żywo, w trakcie sesji; bez nowych plików; małe
zmiany w skrypcie map; ochrona na tym samym poziomie co dzisiejsze ukrycia.
Wady: ciekawski gracz może znaleźć zasłonięte miejsce w pliku mapy (rozdział 7).
Nakład: **średni**. Wymaga nowej wersji reguł bazy.

### Wariant B — odkrycia w osobnych plikach

* Skrypt wycina miejsca do odkrycia z pliku mapy do osobnych małych plików, a
  aplikacja pobiera taki plik dopiero po odkryciu.
* Zaleta: dopóki miejsce jest zasłonięte, przeglądarka gracza go nie pobiera —
  zajrzenie do plików otwartej mapy nic nie da.
* Wady: pliki i tak leżą w publicznym repozytorium, a ich nazwy da się odgadnąć z
  publicznego manifestu — więc ochrona jest **niewiele większa** niż w wariancie A.
  Za to dużo pracy: skrypt musi przygotować kolory i definicje (desenie, gradienty)
  osobno dla każdego takiego pliku, a aplikacja — wstawić rysunek dokładnie w to samo
  miejsce warstw rysunku (inaczej np. jaskinia przykryłaby góry, które powinny leżeć
  na niej). Więcej rzeczy może się zepsuć na tabletach.
* Nakład: **duży**. Nie polecam.

### Wariant C — odkrycia zapisywane w bazie

* Przy odkryciu aplikacja admina kopiuje rysunek miejsca do bazy, a gracze pobierają
  go stamtąd. Przed odkryciem rysunku nie ma w żadnym pliku, który pobiera
  przeglądarka gracza — ochrona jak dziś przy `tylko-mg`.
* Przeszkody: aplikacja admina musiałaby czytać rysunek MG (tylko tam jest zasłonięte
  miejsce) — a zasada projektu brzmi: **aplikacja nigdy nie wczytuje rysunków MG**
  (gdyby to robiła, cały rysunek MG trafiałby do przeglądarki, a jeden błąd w kodzie
  mógłby pokazać go graczom). Do tego obróbka kolorów (dziś w skrypcie map) musiałaby
  zostać przepisana do aplikacji.
* Nakład: **bardzo duży**, sprzeczny z zasadami projektu. Nie polecam.

### Wariant D — bez zmian w aplikacji (jak dziś)

* Tajemnica jest w `tylko-mg`; kiedy gracze ją odkryją, prosisz agenta o zmianę
  rysunku i nową wersję strony.
* Zaleta: najlepsza ochrona, jaką ten projekt może dać — zasłoniętego rysunku nie ma w
  żadnym pliku, który pobiera aplikacja. Zero pracy teraz.
* Wada: odkrycie nie w trakcie sesji, tylko między sesjami; za każdym razem prośba do
  agenta.
* **Zostaje** jako sposób na najważniejsze tajemnice — także po wdrożeniu wariantu A.

## 4. Porównanie

| | A: zasłona w aplikacji | B: osobne pliki | C: w bazie | D: jak dziś |
|---|---|---|---|---|
| Odkrycie w trakcie sesji, jednym kliknięciem | **tak** | tak | tak | nie (prośba do agenta) |
| Gracz korzystający z aplikacji nie widzi zasłoniętego miejsca | tak | tak | tak | tak |
| Ciekawski z narzędziami przeglądarki | może znaleźć w pliku mapy | trudniej (musi odgadnąć adres pliku) | musi znaleźć rysunek MG w repozytorium | musi znaleźć rysunek MG w repozytorium |
| Zmiany w bazie i regułach | jedno nowe pole | jedno nowe pole | nowe dane w bazie | nie |
| Zmiany w skrypcie map | małe | duże | duże | nie |
| Zgodne z zasadami projektu | tak | tak | **nie** (aplikacja czytałaby rysunek MG) | tak |
| Nakład pracy | **średni** | duży | bardzo duży | brak |

## 5. Jak to będzie wyglądać (wariant A)

**Admin:**

* Dwa pola przy każdym miejscu — w indeksie, w karcie miejsca i w zakładce ADMIN:
  * **👁 widoczne** — gracze widzą to miejsce na mapie;
  * **◈ klikalne** — gracze mogą je kliknąć, otworzyć kartę, czytać i pisać notatki
    (to dzisiejsze „dostępne dla graczy”). Gdy 👁 jest odznaczone, ◈ jest szare
    (nieaktywne), a po najechaniu pokazuje podpowiedź „Najpierw zaznacz »widoczne«”.

  Przykład — indeks mapy Kraina w widoku admina:

  ```
  ◈ KRAINA                      👁  ◈
    Wysogród                    ☑   ☑    widoczne i klikalne
    Kamieniec                   ☑   ☐    widoczne, nie da się kliknąć (jak dziś)
    Smocza Jama                 ☐   ▒    zasłonięta — pole ◈ nieaktywne
  ```

* **Na mapie** admin widzi miejsce zasłonięte przed graczami **przygaszone**
  (półprzezroczyste, z przerywanymi narożnikami), a w jego karcie dopisek „niewidoczne
  dla graczy”. Dzięki temu wie, gdzie ono jest, i może je kliknąć, żeby odkryć.
* **Odkrycie** (zaznaczenie 👁) pyta o potwierdzenie: „Odkryć graczom »Smocza Jama«?
  Zobaczą ją od razu na mapie.” — żeby przypadkowe kliknięcie w trakcie sesji nie
  zdradziło tajemnicy. **Zasłonięcie** — bez pytania.
* **Odznaczenie 👁 odznacza też ◈** — pola zawsze pokazują dokładnie to, co mają gracze.
* **Przyciski zbiorcze** w zakładce ADMIN („ZAZNACZ WSZYSTKIE”, „ODZNACZ WSZYSTKIE”)
  zmieniają tylko klikalność **widocznych** miejsc — nigdy nie odkrywają niczego
  hurtem. „PRZYWRÓĆ DOMYŚLNE” przywraca oba pola do ustawień z manifestu (czyli
  zasłania z powrotem miejsca, które były na start niewidoczne).
* **PODGLĄD GRACZA:** zasłonięte miejsca znikają — admin widzi mapę dokładnie tak jak
  gracze.
* **LOG** w zakładce ADMIN: „Odkryto graczom: Smocza Jama”, „Zasłonięto przed
  graczami: …”, „… klikalne dla graczy”, „… nieklikalne”.

**Gracz (konta Edytor i Gracz):**

* Zasłoniętego miejsca **nie ma** na mapie, w indeksie, w wyszukiwarce ani w filtrze
  notatek. Nie da się na nie trafić klawiaturą ani czytnikiem ekranu.
* Po odkryciu pojawia się na mapie od razu, bez odświeżania strony. Proponuję też
  krótki napis „Nowe odkrycie na mapie »Kraina«” i podświetlenie miejsca przez kilka
  sekund (decyzja 6) — żeby gracze zauważyli zmianę.
* Gdy admin zasłoni miejsce z powrotem, znika ono z mapy, a notatki przy nim
  przechodzą do listy „Notatki bez miejsca na mapie” (z dopiskiem „miejsce niedostępne
  na mapie”, bez nazwy miejsca) — tak jak dziś przy miejscach nieklikalnych. Notatki
  nie giną; wrócą do miejsca po ponownym odkryciu.

**Mapa szczegółowa:** zasłonięcie miejsca nie ukrywa zakładki jego mapy szczegółowej
(np. „Pałac Kruków” → zakładka „Pałac”) — zakładki ukrywa się osobno, jak dziś.

## 6. Rysowanie miejsc do odkrycia — zmiany w specyfikacji

**Nowych schematów nie trzeba:** miejsce do odkrycia to zwykłe miejsce `data-element`.
Dochodzi kilka zasad rysowania (nowy podrozdział specyfikacji „Miejsca do odkrycia”):

1. **Rysuj miejsce tak, jak gracze mają je zobaczyć po odkryciu** — grupa
   `data-element` z podpisem, **poza** `tylko-mg`. To nie jest materiał MG: trafia do
   pliku mapy dla graczy (zasłonięte). Dopiski dla MG o tym miejscu — osobno w `tylko-mg`.
2. **Pod miejscem pełne tło** — tak, jakby miejsca nie było (np. zbocze góry pod
   jaskinią, cała ściana pod drzwiami ukrytego przejścia). Po zasłonięciu widać właśnie
   to tło, a nie „dziurę” w rysunku.
3. **Wszystko, co zdradza miejsce, w jego grupie**: znak, podpis, ścieżka prowadząca
   do niego, drzwi w ścianie. To, co zostanie poza grupą, gracze zobaczą od początku.
4. **Bez czerwonych linii przerywanych** — w rysunkach MG oznaczają wiedzę ukrytą i
   skrypt map je zatrzymuje. Ukryte przejście w wersji dla graczy — np. linia
   przerywana w kolorze brązowym albo czarnym.
5. **Identyfikator, nazwa i opis są jawne już przed odkryciem** (są w publicznych
   plikach — jak dziś nazwy nieudostępnionych miejsc). Dobieraj je tak, żeby
   przypadkowe zobaczenie nie popsuło gry; identyfikator najlepiej obojętny (np.
   `jaskinia-wschodnia` zamiast `kryjowka-smoka`).
6. **Opcjonalnie: grafika poza grupą miejsca.** Gdy część rysunku musi leżeć w innej
   warstwie niż reszta miejsca (np. droga do jaskini narysowana pod górami, a napis nad
   nimi), można ją oznaczyć nowym znacznikiem `<g data-nalezy-do="id-miejsca">`.
   Aplikacja zasłania i odkrywa ją razem z miejscem; taka grafika nie jest klikalna.

**Specyfikacja rysunku** (`Specyfikacja_rysunku_mapy.md`) — do uzupełnienia przy
wdrożeniu: rozdział 2 (co robi aplikacja z zasłoniętymi miejscami), 5.6 i nowy 5.7
(zasady powyżej), 6.2 (tajne miejsca: `tylko-mg` albo „do odkrycia” — kiedy co), 11
(pole `widocznyDomyslnie` w manifeście), 12 (nowe komunikaty skryptu), 15 (lista
kontrolna), 16 (przykład z miejscem do odkrycia), 17 (wskazówki z rysowania
przykładów). Do tego `kampanie/README.md` (pole manifestu i krok po kroku „jak zrobić
miejsce do odkrycia”) oraz szablon manifestu.

**Przykłady w kampanii Wzór:**

* **„Smocza Jama”** — jest już narysowana jako osobna grupa nad zboczem gór, z pełnym
  tłem pod spodem. Wystarczy zmiana w manifeście (`"widocznyDomyslnie": false`), bez
  zmian w rysunku.
* **„Ukryte przejście” w pałacu** — nowe miejsce do odkrycia, wymyślone na potrzeby
  przykładu: dorysowane w generatorze rysunku pałacu i wpisane do manifestu (na start
  niewidoczne i nieklikalne).

**Kampania Iliac:** nic się nie zmienia samo — wszystkie jej miejsca zostają widoczne.
Jeśli zechcesz, żeby któreś tajemnice z rysunku MG dało się odkrywać w aplikacji,
trzeba je przerysować według zasad powyżej — to osobna decyzja, miejsce po miejscu.

## 7. Bezpieczeństwo — co się zmienia, a co nie

* **Ochrona bazy — bez zmian.** Reguły dostaną jedno nowe pole z wartościami tak/nie,
  takie samo jak dzisiejsze pole „dostępne dla graczy”.
* **Zasłonięcie działa w wyglądzie aplikacji** — jak ukrywanie kampanii, zakładek i
  dzisiejsze „dostępne dla graczy” (README, rozdział „Bezpieczeństwo”, punkt 3). Kto
  celowo zajrzy do pliku mapy (pod jego adresem albo narzędziami przeglądarki),
  zobaczy także miejsca zasłonięte. Ich nazwy i opisy są też w publicznym manifeście.
* **Co realnie się zmienia:** miejsce przeniesione z `tylko-mg` do „do odkrycia” trafia
  z rysunku MG (którego aplikacja nie pobiera) do pliku mapy (który pobiera
  przeglądarka każdego gracza). Dla ciekawskiego różnica jest niewielka: dziś musiałby
  znaleźć rysunek MG w repozytorium, po zmianie — zajrzeć do pliku mapy. W obu
  przypadkach trzeba **celowo szukać**; przypadkiem, przy zwykłym korzystaniu z
  aplikacji, nikt tego nie zobaczy.
* **Zalecenie:** „do odkrycia” — dla rzeczy, których wykrycie przez ciekawskiego nie
  zepsuje gry (miejsca do znalezienia, przejścia, kryjówki). **Najważniejsze tajemnice
  fabuły — dalej w `tylko-mg`** (wariant D).
* Skrypt map dalej sprawdza, czy w plikach dla graczy nie ma śladów materiału MG
  (dopisków „dla MG”, czerwonych linii przerywanych) — także w miejscach do odkrycia.

## 8. Rekomendacja

1. Wdrożyć **wariant A**: dwa pola (👁 widoczne, ◈ klikalne — szare, gdy miejsce jest
   zasłonięte), potwierdzenie przy odkrywaniu, odkrycia widoczne u graczy na żywo.
2. Uzupełnić specyfikację rysunku i `kampanie/README.md`; dodać przykłady w kampanii
   Wzór (Smocza Jama, ukryte przejście w pałacu).
3. Warianty B i C — nie. Wariant D (`tylko-mg`) zostaje dla najważniejszych tajemnic.

## 9. Decyzje do podjęcia (z proponowaną odpowiedzią)

1. **Wdrażamy wariant A?** Proponuję: **tak**.
2. **Nazwy pól: „👁 widoczne” i „◈ klikalne”** (dzisiejsze „dostępne dla graczy” staje
   się „klikalne”)? Proponuję: **tak**.
3. **Odznaczenie „widoczne” odznacza też „klikalne”?** Proponuję: **tak** — pola zawsze
   pokazują to, co mają gracze.
4. **Odkrycie od razu robi miejsce klikalnym?** Proponuję: **nie** — odkrycie tylko
   pokazuje miejsce, a klikalność zaznaczasz osobno (tak jak w Twoim pomyśle). Inna
   możliwość: jedno kliknięcie odkrywa i od razu pozwala robić notatki.
5. **Potwierdzenie przy odkrywaniu?** Proponuję: **tak** (przy zasłanianiu — nie).
6. **Powiadomienie graczy o odkryciu** — krótki napis „Nowe odkrycie na mapie …” i
   podświetlenie miejsca przez kilka sekund? Proponuję: **tak**.
7. **Przyciski zbiorcze nigdy nie odkrywają hurtem** (zmieniają tylko klikalność
   widocznych miejsc)? Proponuję: **tak**.
8. **Znacznik `data-nalezy-do`** (grafika poza grupą miejsca, zasłaniana razem z nim)
   — od razu? Proponuję: **tak** (mały koszt; przyda się przy drogach i przejściach).
9. **Przykłady w kampanii Wzór** (Smocza Jama na start zasłonięta + przykładowe ukryte
   przejście w pałacu)? Proponuję: **tak**.

## 10. Jak to sprawdzić po wdrożeniu (test ręczny)

1. Wklej w konsoli Firebase nowe reguły bazy (instrukcja krok po kroku w
   `firebase/README.md` — dostaniesz ją razem z wdrożeniem).
2. Zaloguj się jako admin, otwórz kampanię Wzór → zakładka KRAINA. Smocza Jama jest
   przygaszona; w indeksie pole 👁 odznaczone, a ◈ szare.
3. Na drugim urządzeniu (telefon, tablet) zaloguj się jako gracz: jaskini nie ma na
   mapie ani w indeksie. W jednej przeglądarce dwa różne konta działają tylko wtedy, gdy
   w obu kartach logujesz się **bez** „Zapamiętaj mnie”.
4. Jako admin zaznacz 👁 przy Smoczej Jamie i potwierdź — u gracza jaskinia pojawia
   się od razu, ale nie da się jej kliknąć.
5. Zaznacz ◈ — u gracza pojawiają się złote narożniki i miejsce można kliknąć.
6. Odznacz 👁 — jaskinia znika u gracza, a u admina pole ◈ jest odznaczone i szare.
7. Zaznacz u góry ekranu PODGLĄD GRACZA — zasłonięte miejsca znikają także u admina.

---

## Dodatek — szczegóły techniczne (dla programisty albo agenta AI)

**Manifest** (`kampanie/*/kampania.json`): nowe pole `elementy[].widocznyDomyslnie`
(bool; brak pola = `true`). Zmiana tego pola **nie wymaga** ponownego uruchamiania
skryptu map — plik mapy nie zależy od wartości domyślnych.

**Baza:** w `kampanie/{id}/ustawienia/mapy` nowe pole `elementyWidoczne.{elementId}`
(true/false). Dotychczasowe `elementy.{elementId}` zostaje bez zmian i znaczy
„klikalne” (zgodność ze starymi danymi i kopiami). Zapis przez `dane.zapiszUstawienia()`
(scalanie):

* odkrycie: `{ elementyWidoczne: { [id]: true } }`;
* zasłonięcie: `{ elementyWidoczne: { [id]: false }, elementy: { [id]: false } }` —
  jeden zapis, więc stan zawsze spójny;
* „PRZYWRÓĆ DOMYŚLNE”: oba pola `null` (usunięcie) dla miejsc danej mapy.

**Reguły** (`firebase/firestore.rules`, wersja 5): w `poprawneUstawienia` dopisać
`elementyWidoczne` do `hasOnly` i warunek jak dla `elementy` (mapa, najwyżej 1000
wpisów, wartości tylko true/false); test w `testy/reguly/test_reguly.mjs` (poprawny
zapis, wartość inna niż bool, za dużo wpisów, przywracanie kopii z tym polem).
**Kolejność wdrożenia: najpierw reguły, potem strona.** Nowe reguły przepuszczają też
zapisy starej wersji aplikacji. Odwrotnie nie: przy starych regułach baza odrzuci
zapis widoczności (aplikacja pokaże błąd, nic się nie zepsuje). Gdyby po użyciu nowej
funkcji wrócić do starych reguł, baza odrzucałaby **każdy** zapis ustawień — reguły
sprawdzają cały dokument po scaleniu, a w nim byłoby już pole `elementyWidoczne`.

**Logika** (`aplikacja/js/stan.js`):

* `elementWidoczny(e)` = wartość z `ustawienia.elementyWidoczne[e.id]`, a bez niej
  `e.widocznyDomyslnie !== false`;
* `elementDostepnyDlaGraczy(e)` = mapa widoczna **i** `elementWidoczny(e)` **i**
  `elementZaznaczony(e)` — klikalność wymaga widoczności także przy niespójnych danych;
* nowe `elementWidocznyDlaUzytkownika(e)` = `widokAdmina() || (mapa widoczna && elementWidoczny(e))`;
* `elementMaKropke(e)` — tylko dla widocznych;
* odkrycie zapisuje tylko widoczność, więc klikalność wraca do wartości zapisanej albo
  domyślnej (`dostepnyDomyslnie`). Miejsce do odkrycia ma więc zwykle
  `dostepnyDomyslnie: false`; `true` oznacza „po odkryciu od razu klikalne” — skrypt
  map wypisze to jako informację;
* `rodzajNotatki()`, indeks, wyszukiwarka i filtr notatek korzystają już z
  `elementDlaUzytkownika()` — zasłonięte miejsca znikają z nich same.

**Mapa** (`kampania.js` → `stanyElementow()`, `mapa.js` → `ustawStany()`, `slate.css`):

* stan elementu dostaje pola `widoczny` (dla bieżącego użytkownika) i `zasloniety`
  (niewidoczny dla graczy — dla przygaszenia u admina);
* gracz: klasa `el-niewidoczny` → `.plansza svg .el-niewidoczny, .plansza svg
  .el-niewidoczny * { visibility: hidden !important; }` (`!important`, bo rysunek może
  mieć `style="visibility:visible"` w środku grupy); bez `tabindex`, `role` i
  `aria-label`. **Nie** `display: none` — `przygotujDekoracje()` mierzy elementy przez
  `getBBox()`, a przy `display: none` nie ma czego mierzyć (miejsce odkryte w trakcie
  sesji nie miałoby stref kliknięcia ani narożników). Element z `visibility: hidden`
  i bez klasy `el-dostepny` nie przyjmuje kliknięć (jego strefy są ukryte jak dziś);
* admin: klasa `el-zasloniety` → przygaszenie (`opacity` ok. 0,4) i przerywane
  narożniki; w PODGLĄDZIE GRACZA — jak u gracza;
* grupy `[data-nalezy-do="id"]` zbierane w `wczytaj()` i przełączane razem z miejscem;
* bez mignięcia: `ustawStany()` musi się wykonać przed pierwszym narysowaniem mapy
  (dziś `przygotujMape()` woła je zaraz po wczytaniu — sprawdzić testem e2e);
* powiadomienie (decyzja 6): przy zmianie ustawień porównać zbiór widocznych miejsc
  przed i po zmianie (nie przy pierwszym wczytaniu strony), dla nowych —
  `komunikat()` i klasa podświetlenia na kilka sekund;
* nie ruszać rozwiązań dotyku z `AGENTS.md` (ukrywanie napisów na czas szczypania
  działa przez `display: none` na `text` — z `visibility` się nie gryzie).

**Interfejs admina:** `indeks.js` → `pozycja()` (dwa pola), `panel.js` (dwa pola w
karcie miejsca), `admin.js` (lista miejsc, przyciski zbiorcze — tylko `elementy`
widocznych miejsc, „PRZYWRÓĆ DOMYŚLNE” — oba pola). Potwierdzenie odkrycia:
`potwierdz()` z `narzedzia.js`. Słownictwo: dziś „ukryte przed graczami” znaczy
„nieklikalne” (LOG, `aria-label`, przerywane narożniki) — po zmianie „nieklikalne”, a
„zasłonięte” = niewidoczne.

**Skrypt map** (`narzedzia/przygotuj_mape.py`): odczyt `widocznyDomyslnie` z manifestu
i raport („Na start zasłonięte: …”, informacja przy `dostepnyDomyslnie: true`);
sprawdzanie `data-nalezy-do` (wskazuje istniejące miejsce z tej samej mapy, nie leży
wewnątrz grupy `data-element`, poprawny identyfikator); w JSON „NOWE ELEMENTY” pole
`"widocznyDomyslnie": true`. Kontrola bezpieczeństwa bez zmian (obejmuje też miejsca
do odkrycia). Testy w `testy/test_przygotuj_mape.py`. Opcjonalnie
`narzedzia/podglad_mapy.cjs`: przełącznik podglądu „jak na start u graczy” (bez miejsc
zasłoniętych).

**Kampania Wzór:** manifest (Smocza Jama — `widocznyDomyslnie: false`; nowe miejsce
w pałacu), `generator/palac.py` (przykładowe ukryte przejście według zasad z
rozdziału 6), ponowne wygenerowanie rysunku i map, `kampanie/Template/README.md`.

**Testy e2e** (`testy/e2e/uruchom.cjs`): gracz nie widzi zasłoniętego miejsca (mapa —
także w pierwszej chwili po wczytaniu, indeks, wyszukiwarka, filtr notatek); admin
widzi je przygaszone; odkrycie z potwierdzeniem działa na żywo w drugiej karcie;
◈ nieaktywne przy odznaczonym 👁; zasłonięcie odznacza ◈; notatki przechodzą do „bez
miejsca” i wracają; PODGLĄD GRACZA; przyciski zbiorcze nie odkrywają; `data-nalezy-do`.
Testy jednostkowe dla nowych funkcji `stan.js`.

**Dokumentacja:** README („Co potrafi”, „Jak tego używać”, „Dane w Firestore”,
„Bezpieczeństwo” pkt 3, „Testy”), `AGENTS.md` (zasady spoilerów: miejsca do odkrycia
są częścią map dla graczy — agent nie przenosi do nich niczego z `tylko-mg` z własnej
inicjatywy; tabela „Gdzie co zmieniać”), `kampanie/README.md`, specyfikacja rysunku
(rozdział 6 tej analizy), `firebase/README.md` (wersja 5 reguł), `testy/README.md`.
