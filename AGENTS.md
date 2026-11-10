# AGENTS.md — zasady pracy dla agentów AI w repozytorium NotatkiRPG

Przeczytaj ten plik w całości, zanim cokolwiek zmienisz. Potem: `README.md`
(opis aplikacji, decyzje, bezpieczeństwo) i `Scenariusze/README.md` (mapy i manifesty).

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

* Rysunki od MG (np. `Scenariusze/Iliac/Rysunki_kopca_Iliac.svg`) zawierają
  **spoilery**. Treści w grupach `<g class="tylko-mg">`, podpisy „(dla MG)” i
  czerwone linie przerywane to wiedza tylko dla MG.
* **Nie przenoś** niczego z materiału MG do części dla graczy (mapy dla graczy,
  manifesty, interfejs) i **nie opisuj** tych treści w kodzie, komentarzach,
  commitach, dokumentacji ani w odpowiedziach w czacie (użytkownik może być graczem).
* Mapy dla graczy robi **wyłącznie** skrypt `narzedzia/przygotuj_mape.py` —
  nie edytuj plików `mapa_*.svg` ręcznie i nie wyłączaj kontroli bezpieczeństwa skryptu.
* Aplikacja nigdy nie wczytuje rysunków MG; na stronę trafia tylko to, co wybiera
  `narzedzia/zbuduj_strone.py` (lista dozwolonych plików — nie zamieniaj jej na listę zakazanych).
* **Nie dopisuj do manifestów miejsc z własnej inicjatywy** — o tym, co jest
  klikalne, decyduje użytkownik. Skrypt map wypisuje nowe miejsca jako propozycję.

## 3. Dane i bezpieczeństwo

* **Nigdy** nie zapisuj haseł ani loginów w repozytorium, logach, komunikatach ani
  commitach. Konta w testach (`test-admin`, `test-gracz`) są wymyślone.
* **Nie zmieniaj** kolekcji `admins` i `secrets`, ich dokumentów ani pól (wyjątek:
  przywracanie kopii, która je zawiera — tak działa `aplikacja/js/kopia.js`).
* Treść wpisów wyświetlaj **wyłącznie przez `textContent`** (funkcja `el()` w
  `aplikacja/js/narzedzia.js`) — nigdy przez `innerHTML`. Baza jest otwarta, każdy
  może zapisać w niej dowolny tekst.
* **Nie wdrażaj** Firebase Authentication, App Check ani zamkniętych reguł bez
  wyraźnej zgody użytkownika. Reguł nie publikujesz sam — robi to użytkownik
  (instrukcja: `firebase/README.md`).
* Nie wysyłaj danych użytkownika do zewnętrznych usług. Nie łącz się z prawdziwą
  bazą w celach testowych poza odczytem niezbędnym do sprawdzenia połączenia.

## 4. Technologia

* Statyczna strona: HTML, CSS, czysty JavaScript (moduły ES). **Bez kroku
  budowania** i bez bibliotek do działania aplikacji.
* Firebase z CDN `https://www.gstatic.com/firebasejs/13.2.0/…` — **wszystkie moduły
  w tej samej wersji**, ładowane tylko w `aplikacja/js/firebase.js`.
* `sessionStorage` i `localStorage` zawsze w `try/catch`. Sesja: tylko id konta,
  login i rola — nigdy hasło.
* Styl Data-Slate: własny, ogólny — **bez logotypów, grafik i cytatów Games Workshop**.
* Motywy kolorów są w trzech miejscach, które muszą się zgadzać:
  `aplikacja/css/slate.css` (`.motyw-…`), `MOTYWY` w `narzedzia/przygotuj_mape.py`,
  `MOTYWY` w `aplikacja/js/konfiguracja.js`. Po zmianie kolorów uruchom ponownie
  skrypt map dla każdego scenariusza.
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
| nowa wersja rysunku MG, nowe miejsca, zmiana nazw | `Scenariusze/README.md` (krok po kroku) |
| nowy scenariusz | `Scenariusze/README.md`, szablon `narzedzia/szablon_scenariusza/` |
| wygląd | `aplikacja/css/slate.css` |
| zachowanie mapy | `aplikacja/js/mapa.js` |
| zakładki, przepływ strony kampanii | `aplikacja/js/kampania.js` |
| widoczność (domyślne z manifestu + ustawienia admina) | `aplikacja/js/stan.js` |
| zapis/odczyt bazy | `aplikacja/js/dane.js` |
| kopia i przywracanie | `aplikacja/js/kopia.js`, format: `aplikacja/js/kopia-format.js` |
| publikacja strony | `narzedzia/zbuduj_strone.py`, `.github/workflows/strona.yml` |
| reguły bazy | `firebase/firestore.rules` + `firebase/README.md` |

Model danych w Firestore jest opisany w `README.md` (rozdział „Dane w Firestore”).
Nowe kolekcje i pola: po polsku, bez polskich znaków. Notatki wiążą się z `id`
miejsca, nigdy z jego nazwą.

## 6. Testy — przed każdym wypchnięciem

```bash
node testy/jednostkowe.mjs
python3 -m unittest discover -s testy -p "test_*.py" -v
node testy/e2e/uruchom.cjs
```

* Pierwsze dwa nie wymagają żadnych pakietów (Node 22+, Python 3.9+) i uruchamia
  je też GitHub Actions przed publikacją.
* Test e2e wymaga pakietu `playwright` z Chromium; używa **udawanego Firebase**
  (`testy/e2e/falszywy-firebase/`), nie prawdziwej bazy. Zrzuty ekranu zapisuje w
  `testy/e2e/wyniki/` (folder nie jest wersjonowany) — obejrzyj je po zmianach wyglądu.
* Jeśli zmieniasz API Firestore używane przez aplikację, uzupełnij udawany Firestore.
