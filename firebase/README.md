# Firebase — konfiguracja, reguły bazy i App Check

W tym folderze:

| Plik | Co to jest |
|---|---|
| `firebase-config.js` | Adres projektu Firebase (`notatkirpg-b601c`) i klucz witryny reCAPTCHA dla App Check. **Oba klucze są publiczne** — z założenia trafiają do przeglądarki każdego gościa strony. |
| `firestore.rules` | Reguły bazy danych (wersja 3 — z widocznością zakładek; bez usuniętych zakładek Postęp i Powiązania). **Trzeba je ręcznie wkleić w konsoli Firebase** — instrukcja niżej. Aplikacja sama ich nie publikuje. |

## Reguły bazy — co robią (wyjaśnienie bez żargonu)

Reguły to coś w rodzaju regulaminu wejścia do bazy. Ponieważ logowanie odbywa
się przez kolekcję `secrets` (a nie przez logowanie Firebase), baza **nie wie,
kto pyta** — nie odróżni gracza od gościa ani od admina. Reguły pilnują więc
tego, **co** wolno zrobić:

* **Odczyt** — wszystko, czego potrzebuje aplikacja (notatki, ustawienia map i
  zakładek, a także konta — bez tego nie działałoby logowanie).
* **Zapis** — tylko w miejscach, których używa aplikacja (notatki, ustawienia map
  i zakładek), i tylko we właściwym kształcie: znane pola,
  rozsądna długość tekstów (np. tytuł do 200 znaków, treść do 20 000).
* **Wszystko inne jest zablokowane** — nikt nie dopisze do bazy własnych kolekcji
  ani dziwnych pól.
* **Konta (`admins`, `secrets`) są tylko do odczytu.** Nikt — także przez
  aplikację — nie zmieni haseł ani ról. Konta zmieniasz ręcznie w konsoli
  Firebase (tak jak je zakładałeś). Dlatego przywracanie kopii z panelu admina
  pomija konta.

Reguły sprawdzono testami w lokalnym emulatorze bazy (`testy/reguly/`):
wszystkie zapisy aplikacji przechodzą, a niedozwolone są odrzucane.

### Jak opublikować reguły (krok po kroku)

1. Wejdź na <https://console.firebase.google.com> i otwórz projekt **notatkirpg-b601c**.
2. W menu po lewej wybierz **Firestore Database** → zakładka **Reguły** („Rules”).
3. Usuń wszystko, co jest w okienku, i wklej **całą** zawartość pliku `firebase/firestore.rules`.
4. Kliknij **Opublikuj** („Publish”). Zmiana działa po około minucie.
5. Odśwież stronę aplikacji i sprawdź, czy da się dodać notatkę.

Gdyby po publikacji coś przestało działać, możesz na chwilę wkleić poprzednią
wersję reguł (zakładka „Reguły” ma historię zmian) i dać znać, co się stało.

## App Check — co to jest i co daje

App Check to **przepustka** dla przeglądarki. Gdy ktoś otwiera stronę aplikacji,
Google po cichu (niewidzialna reCAPTCHA — nikt niczego nie klika) sprawdza, czy to
prawdziwa strona pod adresem `cutelittlegoat.github.io` w zwykłej przeglądarce.
Jeśli tak, przeglądarka dostaje przepustkę i dołącza ją do każdego zapytania do bazy.

Po **włączeniu wymuszania** (niżej) baza przyjmuje tylko zapytania z przepustką,
czyli **wyłącznie z aplikacji na jej adresie**. Skrypty, inne strony i programy,
które znają konfigurację, dostają odmowę.

Czego App Check **nie** załatwia: osoba, która otworzy prawdziwą stronę i użyje
narzędzi deweloperskich przeglądarki, nadal może zadawać bazie pytania (ma
przepustkę). Przed tym chronią już tylko reguły (np. konta są tylko do odczytu).

### Długość ważności przepustki (ustawiłeś 7 dni)

* Przepustka jest ważna do 7 dni; aplikacja **sama odnawia ją w tle**, zanim
  wygaśnie. Gracze i admin niczego nie zauważą: nie ma okienek, logowania ani klikania.
* Przepustka jest zapisana w przeglądarce na danym urządzeniu. Po wyczyszczeniu
  danych przeglądarki albo na nowym urządzeniu aplikacja po prostu pobierze nową
  (niewidocznie, przy otwarciu strony).
* Plus 7 dni: rzadziej trzeba sprawdzać przeglądarkę (mniej zapytań do reCAPTCHA).
  Minus: gdyby ktoś skopiował przepustkę z przeglądarki, mógłby jej używać poza
  aplikacją do 7 dni. Krótszy czas (np. 1 dzień) jest bezpieczniejszy, a przy kilku
  graczach i tak mieści się z ogromnym zapasem w darmowym limicie reCAPTCHA.
  Obie wartości są w porządku — to kwestia wyboru.
* Zmiana tej długości dotyczy nowych przepustek; już wydane działają do końca swojego terminu.

### Ważne: klucz reCAPTCHA musi być w projekcie Firebase

Klucz reCAPTCHA (`6L…`) musi należeć do **tego samego projektu Google Cloud co
Firebase**, czyli projektu o identyfikatorze **`notatkirpg-b601c`**. Uwaga: projekty
mogą mieć taką samą nazwę („NotatkiRPG”) — liczy się **identyfikator**, widoczny w
oknie wyboru projektu w Google Cloud Console.

Objaw złego projektu: w panelu admina (ZABEZPIECZENIA) „Nie działa”, a w konsoli
przeglądarki błąd 400 z tekstem „…the site key is from the same project as the one
containing this app”.

Naprawa krok po kroku:

1. Otwórz <https://console.cloud.google.com/security/recaptcha?project=notatkirpg-b601c>
   (adres sam wybiera właściwy projekt; sprawdź u góry, że identyfikator to `notatkirpg-b601c`).
2. Jeśli pojawi się prośba o włączenie interfejsu reCAPTCHA Enterprise API — włącz go.
3. **Utwórz klucz**: nazwa np. `NotatkiRPG`, typ **Witryna** (sieć), domena
   `cutelittlegoat.github.io` (bez `https://` i bez `/NotatkiRPG`). Opcję „pole wyboru”
   („Use checkbox challenge”) zostaw **wyłączoną**, weryfikację domeny — **włączoną**.
   Nie dopisuj `localhost`.
4. Skopiuj identyfikator nowego klucza (zaczyna się od `6L`).
5. Konsola Firebase → **App Check** → **Aplikacje** → aplikacja webowa → dostawca
   reCAPTCHA Enterprise → wklej nowy klucz → **Zapisz** (ważność przepustki możesz zostawić).
6. Wpisz nowy klucz w `firebase/firebase-config.js` (`appCheckKluczWitryny`) — albo
   poproś o to agenta AI. Po publikacji strony panel admina powinien pokazać „Działa”.
7. Stary klucz (w innym projekcie) możesz usunąć, a niepotrzebny dodatkowy projekt —
   wyłączyć, żeby się nie myliły.

### Włączenie wymuszania App Check — krok po kroku

Kolejność jest ważna: **najpierw** strona musi działać w internecie z App Check,
**potem** włączasz wymuszanie. Odwrotnie — wszyscy (także Ty) stracą dostęp do bazy.

1. Opublikuj stronę (repozytorium publiczne + GitHub Pages — patrz `README.md`).
2. Otwórz stronę pod adresem `https://cutelittlegoat.github.io/NotatkiRPG/`, zaloguj
   się jako admin, zakładka **ADMIN** → sekcja **ZABEZPIECZENIA**. Powinno być
   „**Działa** — strona dostała przepustkę App Check”.
3. W konsoli Firebase: **App Check** → zakładka **Interfejsy API** („APIs”) →
   **Cloud Firestore**. Poużywaj chwilę aplikacji i sprawdź wykres: prawie wszystkie
   żądania powinny być „zweryfikowane” („verified”).
4. Kliknij **Wymuś** („Enforce”) przy Cloud Firestore i potwierdź. Zmiana zaczyna
   działać w ciągu kilkunastu minut.
5. Sprawdź jeszcze raz stronę — notatki powinny się wczytywać i zapisywać.

Wycofanie: w tym samym miejscu przycisk **Cofnij wymuszanie** („Unenforce”).

Gdy wymuszanie jest włączone, a któryś gracz widzi „Baza danych odmówiła
dostępu”: niech odświeży stronę, wyłączy na próbę VPN albo rozszerzenia blokujące
skrypty Google i upewni się, że otwiera stronę pod właściwym adresem.

### Testowanie na własnym komputerze

Klucz reCAPTCHA zna tylko adres `cutelittlegoat.github.io`, więc na komputerze
(`http://localhost:8000`) przepustki z reCAPTCHA nie będzie. Aplikacja uruchomiona
lokalnie przełącza się wtedy na **token debugowania**:

1. Uruchom stronę lokalnie (`README.md`, rozdział o uruchomieniu na komputerze) i
   otwórz konsolę przeglądarki (klawisz F12 → „Konsola”).
2. Skopiuj tekst po „Firebase App Check debug token:”.
3. Konsola Firebase → **App Check** → zakładka **Aplikacje** → menu (⋮) przy aplikacji
   webowej → **Zarządzaj tokenami debugowania** → dodaj i wklej token.

Token debugowania omija zabezpieczenie — **traktuj go jak hasło**: nie wysyłaj go
nikomu, nie wpisuj do repozytorium i usuń w konsoli, gdy nie jest już potrzebny.
Bez wymuszania App Check lokalna strona działa i bez tego tokenu.
