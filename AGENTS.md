# AGENTS.md — zasady pracy dla agentów AI w repozytorium NotatkiRPG

Przeczytaj ten plik w całości, zanim cokolwiek zmienisz. Potem: `README.md`
(opis aplikacji, decyzje, bezpieczeństwo) i `kampanie/README.md` (mapy i manifesty).

## 1. Współpraca z użytkownikiem

* **Język:** interfejs aplikacji, komunikaty, dokumentacja, komentarze w kodzie i
  opisy commitów — **po polsku**. Identyfikatory w kodzie i w bazie — po polsku,
  **bez polskich znaków** (`dostepnyDomyslnie`, nie `dostępnyDomyślnie`).
* **Użytkownik nie jest informatykiem.** Pytania i wyjaśnienia formułuj tak, żeby
  zrozumiała je osoba bez wiedzy technicznej: bez żargonu, z przykładem albo
  porównaniem, z proponowaną odpowiedzią domyślną.
* Nie twierdź, że coś działa, jeśli tego nie sprawdziłeś. Jeśli czegoś nie da się
  sprawdzić (np. prawdziwej bazy), napisz to wprost i podaj instrukcję testu ręcznego.
* Zmiany wypychaj na gałąź wskazaną przez użytkownika (dotąd prosił o wypychanie
  prosto na `main`).

## 2. Spoilery — materiał Mistrza Gry

* Rysunki od MG (np. `kampanie/Iliac/Rysunki_kopca_Iliac.svg`) zawierają
  **spoilery**. Treści w grupach `<g class="tylko-mg">`, podpisy „(dla MG)” i
  czerwone linie przerywane to wiedza tylko dla MG.
* **Nie przenoś** niczego z materiału MG do części dla graczy (mapy dla graczy,
  manifesty, interfejs) i **nie opisuj** tych treści w kodzie, komentarzach,
  commitach, dokumentacji ani w odpowiedziach w czacie (użytkownik może być graczem).
* Mapy dla graczy robi **wyłącznie** skrypt `narzedzia/przygotuj_mape.py` —
  nie edytuj plików `mapa_*.svg` ręcznie i nie wyłączaj kontroli bezpieczeństwa skryptu.
* Aplikacja nigdy nie wczytuje rysunków MG. Strona jest publikowana przez GitHub Pages
  **wprost z gałęzi `main`** (całe repozytorium, także rysunki MG) — to świadoma decyzja
  użytkownika: gracze korzystają tylko ze stron aplikacji, a w repozytorium mogą być
  sekrety MG. **Nie dodawaj zabezpieczeń przed przeglądaniem plików** (list wykluczeń,
  osobnej publikacji itp.), jeśli użytkownik o to nie poprosi.
* **Nie dopisuj do manifestów miejsc z własnej inicjatywy** — o tym, co jest
  klikalne, decyduje użytkownik. Skrypt map wypisuje nowe miejsca jako propozycję.

## 3. Dane i bezpieczeństwo

* **Nigdy** nie zapisuj haseł ani loginów w repozytorium, logach, komunikatach ani
  commitach. Konta w testach (`test-admin`, `test-edytor`, `test-gracz`) są wymyślone.
* **Profile kont** (`aplikacja/js/sesja.js`) — **wyłącznie** z pola `rola` w
  `admins/{id}`: `"admin"` = **Admin**; `"edytor"` = **Edytor** (dodaje, zmienia,
  usuwa notatki); brak dokumentu albo inna wartość = **Gracz** (tylko czyta; wiele
  osób naraz). `DisplayName` i `PlayerName` służą tylko do wyświetlania — **nie
  uzależniaj od nich uprawnień**. Liczba logowań nie jest ograniczona (analiza:
  `Analizy/Blokada_kont.md`). **Bez
  logowania aplikacja niczego nie pokazuje** (ani map, ani nazw kampanii) — nie
  dodawaj widoków dla niezalogowanych. Gracze widzą tylko kampanie udostępnione
  przez admina (`kampanie/{id}.widoczna`, domyślnie `widocznaDomyslnie` z rejestru
  `kampanie.json`); nieudostępnionych kampanii nie wstawiaj do strony gracza nawet ukrytych.
* **Nie zmieniaj** kolekcji `admins` i `secrets`, ich dokumentów ani pól. Reguły
  bazy pozwalają je tylko czytać (potrzebne do logowania); przywracanie kopii je pomija.
  Konta zmienia użytkownik ręcznie w konsoli Firebase.
* Treść wpisów wyświetlaj **wyłącznie przez `textContent`** (funkcja `el()` w
  `aplikacja/js/narzedzia.js`) — nigdy przez `innerHTML`. Każdy, kto ma dostęp do
  strony, może zapisać w bazie dowolny tekst (reguły sprawdzają tylko pola i długość).
* **Nie wdrażaj** Firebase Authentication — użytkownik świadomie zostaje przy
  logowaniu przez kolekcję `secrets`.
* **App Check** (reCAPTCHA Enterprise) jest wdrożony w `aplikacja/js/firebase.js` —
  musi ruszać PRZED pierwszym zapytaniem do bazy; nie usuwaj go. Na `localhost`
  aplikacja używa tokenu debugowania. **Nigdy nie zapisuj tokenów debugowania** w
  repozytorium ani w czacie.
* **Reguły bazy** (`firebase/firestore.rules`) przepuszczają tylko znane kolekcje,
  dokumenty i pola. **Każde nowe pole, dokument albo kolekcja zapisywane przez
  aplikację trzeba dopisać do reguł i do testu `testy/reguly/test_reguly.mjs`**, a
  potem poprosić użytkownika (krok po kroku, prostym językiem) o wklejenie reguł w
  konsoli Firebase. Reguł nie publikujesz sam (instrukcja: `firebase/README.md`).
* Nie wysyłaj danych użytkownika do zewnętrznych usług. Nie łącz się z prawdziwą
  bazą w celach testowych poza odczytem niezbędnym do sprawdzenia połączenia.

## 4. Technologia

* Statyczna strona: HTML, CSS, czysty JavaScript (moduły ES). **Bez kroku
  budowania** i bez bibliotek do działania aplikacji.
* Firebase z CDN `https://www.gstatic.com/firebasejs/13.2.0/…` — **wszystkie moduły
  w tej samej wersji**, ładowane tylko w `aplikacja/js/firebase.js`.
* `sessionStorage` i `localStorage` zawsze w `try/catch`. Sesja: tylko id konta,
  login (`PlayerName`), nazwa konta (`DisplayName`) i profil — nigdy hasło. Zmiana
  kształtu sesji = podbij `WERSJA_SESJI` w `sesja.js` (stare sesje trzeba odrzucić).
* Komunikaty tylko przez `komunikat()` z `narzedzia.js`: na ekranie najwyżej dwa
  naraz; u admina potwierdzenia trafiają wyłącznie do LOGU w zakładce Admin
  (`sessionStorage`, czyszczony przy wylogowaniu), a na ekranie zostają same błędy.
* Styl Data-Slate: własny, ogólny — **bez logotypów, grafik i cytatów Games Workshop**.
* Motywy kolorów są w trzech miejscach, które muszą się zgadzać:
  `aplikacja/css/slate.css` (`.motyw-…`), `MOTYWY` w `narzedzia/przygotuj_mape.py`,
  `MOTYWY` w `aplikacja/js/konfiguracja.js`. Po zmianie kolorów uruchom ponownie
  skrypt map dla każdej kampanii.
* Strona musi działać na **telefonach, tabletach i komputerach**, bez przewijania
  strony na boki. Sprawdzaj to testem e2e (zawiera iPhone, Pixel, iPad).

### Mapa — rozwiązania, których nie wolno zepsuć

W `aplikacja/js/mapa.js` są rozwiązania problemów z dotykiem przejęte z działającego
wzoru (`dokumentacja/Kod_Wzoru.txt`). Każde naprawia błąd widziany na tabletach:

* `touch-action: none` na kontenerze HTML (`.plansza`), nie tylko na SVG;
* `overscroll-behavior: none` na `html, body`;
* przechwycenie wskaźnika (`setPointerCapture`) dopiero po przekroczeniu progu
  ruchu — przy `pointerdown` psuło kliknięcia w miejsca;
* czyszczenie rejestru palców, gdy pojawi się trzeci („duch” po zgubionym `pointerup`);
* przeliczanie gestu raz na klatkę (`requestAnimationFrame`);
* po szczypaniu ruch pozostałego palca liczony od jego bieżącego położenia;
* `pointerup`/`pointercancel` na `window`; `lostpointercapture` tylko z samego kontenera;
* pomiar kontenera odporny na zerowe wymiary (inaczej `viewBox` = „NaN NaN …”);
* ukrywanie napisów na czas szczypania (wydajność); linie skanowania jako gradient
  CSS, nie filtr SVG;
* `ResizeObserver` zamiast `resize`.

## 5. Gdzie co zmieniać

| Zadanie | Miejsce |
|---|---|
| nowa wersja rysunku MG, nowe miejsca, zmiana nazw | `kampanie/README.md` (krok po kroku) |
| nowa kampania | `kampanie/README.md`, szablon `narzedzia/szablon_kampanii/` |
| wygląd | `aplikacja/css/slate.css` |
| zachowanie mapy | `aplikacja/js/mapa.js` |
| logowanie, lista kampanii (widoczność kampanii) | `aplikacja/js/start.js`, `logowanie.js`; profile i dostęp do kampanii: `sesja.js` |
| zakładki, przepływ strony kampanii | `aplikacja/js/kampania.js` |
| nowa zakładka (inna niż mapa) | wpis w `ZAKLADKI_STALE` (`aplikacja/js/konfiguracja.js`), sekcja `widok-{id}` w `kampania.html`, obsługa w `przelacz()` w `kampania.js`; widoczność dla graczy zapisuje się sama w `ustawienia/mapy` → `zakladki.{id}` |
| widoczność (domyślne z manifestu + ustawienia admina) | `aplikacja/js/stan.js` |
| zapis/odczyt bazy | `aplikacja/js/dane.js` |
| kopia i przywracanie | `aplikacja/js/kopia.js`, format: `aplikacja/js/kopia-format.js` |
| komunikaty i LOG admina | `komunikat()` w `aplikacja/js/narzedzia.js`; pole LOG w `aplikacja/js/admin.js` |
| analizy pomysłów do decyzji użytkownika | `Analizy/` (np. `Blokada_kont.md`) — po polsku, prostym językiem, z rekomendacją |
| publikacja strony | GitHub Pages: Settings → Pages → Deploy from a branch (`main`, `/`); testy po zmianach: `.github/workflows/testy.yml` |
| reguły bazy i ich test | `firebase/firestore.rules`, `testy/reguly/`, opis: `firebase/README.md` |
| App Check | `aplikacja/js/firebase.js`, klucz witryny w `firebase/firebase-config.js` |

Model danych w Firestore jest opisany w `README.md` (rozdział „Dane w Firestore”).
Nowe kolekcje i pola: po polsku, bez polskich znaków. Notatki wiążą się z `id`
miejsca, nigdy z jego nazwą.

## 6. Testy — przed każdym wypchnięciem

```bash
node testy/jednostkowe.mjs
python3 -m unittest discover -s testy -p "test_*.py" -v
node testy/e2e/uruchom.cjs
cd testy/reguly && npm install && npm test     # po każdej zmianie reguł lub zapisywanych pól
```

* Pierwsze dwa nie wymagają żadnych pakietów (Node 22+, Python 3.9+) i uruchamia
  je też GitHub Actions po każdej zmianie na `main` (workflow „Testy”).
* Test e2e wymaga pakietu `playwright` z Chromium; używa **udawanego Firebase**
  (`testy/e2e/falszywy-firebase/`), nie prawdziwej bazy. Zrzuty ekranu zapisuje w
  `testy/e2e/wyniki/` (folder nie jest wersjonowany) — obejrzyj je po zmianach wyglądu.
* Jeśli zmieniasz API Firestore (albo App Check) używane przez aplikację, uzupełnij
  udawane moduły w `testy/e2e/falszywy-firebase/`.
* Test reguł uruchamia lokalny emulator Firestore (wymaga Javy 11+; projekt „demo”, bez
  połączenia z prawdziwą bazą).
