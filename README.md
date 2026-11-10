# NotatkiRPG — mapy i notatki drużyny (Data-Slate)

Aplikacja internetowa dla graczy kampanii RPG. Łączy **interaktywne mapy w stylu
ekranu Data-Slate** ze **wspólnym notatnikiem drużyny** zapisywanym na żywo
w Firebase. Pierwsza kampania: **Kopiec Iliac** (Warhammer 40,000 / Wrath & Glory).

> **Etap: pierwszy szkic.** Aplikacja działa, ale **nie ma zabezpieczeń** —
> przeczytaj rozdział [Bezpieczeństwo](#bezpieczeństwo).

## Spis treści

1. [Co potrafi](#co-potrafi)
2. [Pierwsze uruchomienie — krok po kroku](#pierwsze-uruchomienie--krok-po-kroku)
3. [Role i uprawnienia](#role-i-uprawnienia)
4. [Jak tego używać](#jak-tego-używać)
5. [Struktura repozytorium](#struktura-repozytorium)
6. [Uruchomienie na własnym komputerze](#uruchomienie-na-własnym-komputerze)
7. [Dane w Firestore](#dane-w-firestore)
8. [Kopia zapasowa i przywracanie](#kopia-zapasowa-i-przywracanie)
9. [Bezpieczeństwo](#bezpieczeństwo)
10. [Decyzje do potwierdzenia](#decyzje-do-potwierdzenia)
11. [Testy — co sprawdzono, a czego nie](#testy--co-sprawdzono-a-czego-nie)
12. [Ograniczenia](#ograniczenia)

## Co potrafi

* **Strona startowa** — wybór kampanii i logowanie.
* **Mapy jako zakładki** — każda mapa to osobna zakładka. Admin decyduje, które
  zakładki widzą gracze, i ustawia kolor ekranu (zielony albo bursztynowy) osobno
  dla każdej mapy.
* **Miejsca na mapie** — admin zaznacza przy miejscu pole „dostępne dla graczy”.
  Zaznaczone miejsce dostaje złote narożniki: można je kliknąć i robić przy nim
  notatki. Odznaczone wygląda jak zwykłe tło mapy (żeby nie zdradzać, że jest ważne).
* **Indeks z boku mapy** z wyszukiwarką — gracz i gość widzą tylko to, co mają
  dostępne; admin widzi wszystko i ma przy każdym miejscu pole wyboru.
* **Notatki** przy miejscach i ogólne, **postęp drużyny** (cele i wątki ze stanem),
  **powiązania** (kto — z kim — jaka relacja; lista i prosty graf). Zmiany widać
  u wszystkich od razu, bez odświeżania strony.
* **Kopia zapasowa bazy** do pliku CSV i **przywracanie** (tryb „Scal” albo „Zastąp”) — tylko admin.
* **Telefon, tablet, komputer** — przesuwanie palcem, szczypanie, kółko myszy,
  obsługa klawiaturą; bez przewijania strony na boki.
* **Wiele kampanii** — każda w osobnym folderze w `Scenariusze/`.

## Pierwsze uruchomienie — krok po kroku

1. **Opublikuj reguły bazy** — instrukcja w [`firebase/README.md`](firebase/README.md).
   Dopóki tego nie zrobisz, aplikacja pokazuje komunikat „Baza danych odmówiła dostępu”.
2. **Włącz GitHub Pages** (jednorazowo): w repozytorium na GitHubie wejdź w
   **Settings → Pages → Build and deployment → Source** i wybierz **GitHub Actions**.
3. Od tej chwili **po każdej zmianie na gałęzi `main` strona publikuje się sama**
   (zakładka **Actions** → „Publikacja strony (GitHub Pages)”; trwa 1–2 minuty).
   Adres strony pokaże się w Settings → Pages — zwykle
   `https://cutelittlegoat.github.io/NotatkiRPG/`.
4. Otwórz stronę, **zaloguj się kontem admina** i w zakładce **ADMIN** ustaw, co
   widzą gracze (zakładki map, miejsca, kolory).
5. **Rób kopię zapasową** (zakładka ADMIN) — najlepiej po każdej sesji.

Ważne: na stronę trafiają **tylko** pliki aplikacji, rejestr kampanii, manifesty
i mapy dla graczy. Rysunki od MG zostają wyłącznie w repozytorium (wybiera to
skrypt [`narzedzia/zbuduj_strone.py`](narzedzia/zbuduj_strone.py)).

## Role i uprawnienia

| Kto | Może |
|---|---|
| bez logowania (gość) | tylko przeglądać: mapy, notatki, postęp, powiązania |
| **gracz** (konto bez roli admina, dziś `Player2`) | przeglądać oraz dodawać, edytować i usuwać wpisy |
| **admin** (`rola: "admin"` w `admins/{id}`, dziś `Player1`) | przeglądać wpisy (bez edycji), ustawiać widoczność map i miejsc oraz kolory, robić kopię zapasową i przywracać bazę |

Gracze dzielą jedno konto, dlatego przy każdym wpisie jest pole **„podpis / postać”**.
Logowanie trwa do zamknięcia karty przeglądarki (sesja w `sessionStorage`, bez hasła).

## Jak tego używać

**Mapa:** przeciągnij (myszą albo palcem), żeby przesunąć; kółko myszy albo dwa
palce — przybliżanie; przyciski `+` `−` `⌂` (⌂ = widok początkowy); podwójne
kliknięcie w tło też wraca do widoku początkowego. Z klawiatury: Tab przechodzi
po miejscach, Enter otwiera kartę, strzałki przesuwają, `+`/`-` przybliżają,
Home — widok początkowy, Esc zamyka kartę albo indeks.

**Miejsca:** kliknij miejsce ze złotymi narożnikami. Otworzy się karta z jawnym
opisem i notatkami. Gracz ma tam przycisk „+ DODAJ NOTATKĘ”.

**Indeks:** przycisk INDEKS (na szerokim ekranie indeks jest otwarty z boku).
Wyszukiwarka przeszukuje nazwy miejsc, dawne nazwy (aliasy), opisy i notatki —
bez rozróżniania wielkości liter i polskich znaków.

**Admin:** pola wyboru przy miejscach są w indeksie, w karcie miejsca i w
zakładce ADMIN. Tam też: widoczność zakładek, kolory, „ZAZNACZ/ODZNACZ WSZYSTKIE”,
„PRZYWRÓĆ DOMYŚLNE” (ustawienia z manifestu), kopia i przywracanie. Pole
**PODGLĄD GRACZA** w nagłówku pokazuje mapy i indeks tak, jak widzą je gracze.

## Struktura repozytorium

```
NotatkiRPG/
├── index.html                 strona startowa: wybór kampanii, logowanie
├── kampania.html              strona kampanii (?k=iliac): mapy, notatki, postęp, powiązania, admin
├── kampanie.json              rejestr kampanii (id, nazwa, folder)
├── aplikacja/                 wspólny kod aplikacji
│   ├── css/slate.css          wygląd Data-Slate (motywy zielony / bursztynowy)
│   ├── grafika/ikona.svg      ikona karty przeglądarki
│   └── js/                    moduły ES (opis niżej)
├── firebase/                  firebase-config.js, firestore.rules, README.md (publikacja reguł)
├── Scenariusze/               kampanie — każda w osobnym folderze
│   ├── README.md              konwencja rysunków MG, nowa wersja mapy, nowa kampania
│   └── Iliac/                 kampania „Kopiec Iliac” (manifest, mapy, rysunki MG)
├── narzedzia/                 skrypty: przygotowanie map, złożenie strony, szablon scenariusza
├── testy/                     testy automatyczne (jednostkowe, skryptów, całej aplikacji)
├── dokumentacja/              materiały pomocnicze (Kod_Wzoru.txt — wzór klikalnej mapy)
├── .github/workflows/         automatyczna publikacja na GitHub Pages
├── AGENTS.md                  zasady pracy dla agentów AI
└── README.md                  ten plik
```

Moduły w `aplikacja/js/`:

| Plik | Za co odpowiada |
|---|---|
| `firebase.js` | jedyne miejsce ładowania Firebase 13.2.0 (wszystkie moduły w tej samej wersji) |
| `konfiguracja.js` | nazwy kolekcji, motywy, kategorie, stany, rodzaje relacji |
| `sesja.js`, `logowanie.js` | sesja i logowanie (kolekcje `secrets`, `admins`) |
| `dane.js`, `stan.js` | odczyt/zapis w Firestore na żywo; wspólny stan strony i ustawienia domyślne |
| `mapa.js` | wczytanie mapy SVG, przesuwanie i przybliżanie (mysz, dotyk, klawiatura) |
| `indeks.js`, `panel.js` | indeks z wyszukiwarką; karta miejsca |
| `notatki.js`, `postep.js`, `powiazania.js`, `karty.js`, `formularze.js` | zakładki z wpisami, karty wpisów, okna formularzy |
| `admin.js`, `kopia.js`, `kopia-format.js` | panel admina; kopia i przywracanie; format pliku CSV |
| `kampania.js`, `uruchom-kampanie.js`, `start.js` | złożenie strony kampanii; strona startowa |
| `narzedzia.js` | drobne narzędzia (tworzenie elementów przez `textContent`, daty, komunikaty) |

## Uruchomienie na własnym komputerze

Moduły JavaScript nie działają po otwarciu pliku z dysku (`file://`), potrzebny
jest prosty serwer. Z katalogu repozytorium:

```bash
python3 -m http.server 8000
```

Potem w przeglądarce: <http://localhost:8000>. Strona łączy się z prawdziwą bazą
Firebase (ten sam projekt co wersja w internecie).

## Dane w Firestore

Dane każdej kampanii są osobno, pod jej identyfikatorem (dla Iliac: `iliac`):

| Ścieżka | Pola |
|---|---|
| `kampanie/{kampaniaId}` | `nazwa`, `utworzono` — tworzy go aplikacja przy pierwszym zapisie |
| `…/notatki/{id}` | `elementId` (id miejsca albo `null` = notatka ogólna), `tytul`, `tresc`, `kategoria`, `podpis`, `kontoId`, `utworzono`, `zmieniono`, `kontoIdZmiany` |
| `…/postep/{id}` | `tytul`, `opis`, `stan` (`otwarte` / `w-toku` / `zamkniete`), `podpis`, `kontoId`, znaczniki czasu |
| `…/powiazania/{id}` | `od`, `do`, `rodzaj` (`sojusz`, `wrogosc`, `dlug`, `malzenstwo`, `zaleznosc`, `niepewne`, `inne`), `opis`, `podpis`, `kontoId`, znaczniki czasu |
| `…/ustawienia/mapy` | ustawienia admina: `mapy.{mapaId}.widoczna`, `mapy.{mapaId}.kolor`, `elementy.{elementId}` (true/false), `kolor` (ekran poza mapami) |

Brak wpisu w `ustawienia/mapy` = ustawienie domyślne z manifestu kampanii
(`widocznaDomyslnie`, `dostepnyDomyslnie`, `kolor`). Kolekcji `admins` i
`secrets` aplikacja nie zmienia (wyjątek: przywracanie kopii, która je zawiera).

## Kopia zapasowa i przywracanie

**Plik CSV** (`NotatkiRPG_kopia_RRRR-MM-DD_GGMM.csv`): UTF-8 z BOM (Excel poprawnie
pokaże polskie znaki), cytowanie RFC 4180, kolumny `sciezka` i `dane` (pola
dokumentu jako JSON). Pierwszy wiersz danych to `#meta` (format, wersja, data,
zakres). Znaczniki czasu i inne typy spoza JSON są zapisane jawnie, np.
`{"__typ": "timestamp", "s": 1762790400, "ns": 0}`.

**Zakres:** przeglądarka nie umie wylistować kolekcji, więc kopia obejmuje
kolekcje znane aplikacji: `kampanie/{id}` wszystkich kampanii z `kampanie.json`
(z podkolekcjami `notatki`, `postep`, `powiazania`, `ustawienia`) i `admins`.
**Kolekcja `secrets` domyślnie NIE trafia do kopii.** Admin może ją dołączyć
zaznaczeniem pola — wtedy plik zawiera hasła zwykłym tekstem (nie wysyłaj go
nikomu i nie wrzucaj do repozytorium; `.gitignore` blokuje takie pliki).

**Przywracanie:**
1. Wczytanie pliku, sprawdzenie formatu i podgląd: ile dokumentów w której kolekcji.
2. Tryb **„Scal”** — zapisuje dokumenty z pliku (każdy w całości zastępuje obecną
   wersję), resztę zostawia. Tryb **„Zastąp”** — w kolekcjach objętych kopią usuwa
   dokumenty, których nie ma w pliku, potem zapisuje dokumenty z pliku (wynik jest
   taki sam jak „usuń wszystko, zapisz z pliku”, ale z mniejszą liczbą operacji).
   „Zastąp” wymaga wpisania słowa **PRZYWRÓĆ**.
3. Przed przywróceniem aplikacja **sama pobiera świeżą kopię** obecnego stanu
   (plik `NotatkiRPG_kopia_przed-przywroceniem_…csv`).
4. Zapis partiami po najwyżej 500 operacji. Przy błędzie zatrzymuje się i pokazuje,
   co zdążyło się zapisać.
5. Konta: `admins` i `secrets` są zmieniane tylko wtedy, gdy plik zawiera z nich
   dokumenty. Podgląd ostrzega, jeśli w pliku brakuje Twojego konta admina.

## Bezpieczeństwo

Na Twoją prośbę na tym etapie **nie ma zabezpieczeń**. Konkretnie:

1. **Baza jest otwarta bez terminu** (`firebase/firestore.rules`). Każdy, kto zna
   konfigurację strony (jest w jej kodzie), może czytać, zmieniać i usuwać wszystkie dane.
2. **Hasła są widoczne.** Logowanie porównuje login i hasło z kolekcją `secrets`,
   więc przeglądarka musi ją czytać — hasła zobaczy każdy, kto zajrzy do bazy albo
   do narzędzi deweloperskich. **Używaj haseł, których nie używasz nigdzie indziej.**
3. **Role działają tylko w wyglądzie aplikacji** — baza ich nie pilnuje.
4. **Ukrywanie miejsc i zakładek działa tylko w wyglądzie aplikacji.** Plik
   manifestu (`kampania.json`) i pliki map są publiczne — ciekawski gracz może w
   nich przeczytać nazwy i opisy wszystkich miejsc z manifestu. Dlatego w manifeście
   trzymaj tylko rzeczy, których odkrycie nie zepsuje gry.
5. **Repozytorium jest publiczne** — rysunki od MG (`Rysunki_*.svg`) może obejrzeć
   każdy na GitHubie. Zdecydowałeś/-aś, że to akceptowalne. Na stronę (GitHub Pages)
   rysunki MG nie trafiają.

**Droga na później** (nic z tego nie jest wdrożone bez Twojej zgody):

* **Firebase Authentication** (logowanie e-mailem i hasłem „w Firebase”) zamiast
  kolekcji `secrets` — hasła przestają być widoczne.
* **Reguły oparte na zalogowanym użytkowniku** (`request.auth`): odczyt dla
  wszystkich albo tylko zalogowanych, zapis notatek tylko dla graczy, ustawienia i
  przywracanie tylko dla admina; `secrets` niedostępne z przeglądarki.
* **Rola admina** w dokumencie `admins/{uid}` sprawdzanym przez reguły albo w
  „custom claims” (wymaga jednorazowego skryptu administracyjnego).
* **App Check** — baza przyjmuje tylko zapytania z prawdziwej strony aplikacji.
* **Ograniczenie klucza API** do adresu strony w Google Cloud Console
  (Interfejsy API → Dane logowania).

## Decyzje do potwierdzenia

Przyjęte na tym etapie — każdą można zmienić:

1. **Publikacja:** GitHub Pages przez GitHub Actions; na stronę trafiają tylko pliki
   z listy dozwolonych (rysunki MG — nie). Repozytorium publiczne, rysunki MG w repozytorium.
2. **Reguły bazy:** otwarte bezterminowo (Twoja decyzja).
3. **Mapy:** dwie zakładki — **Okolice** (panel A rysunku; domyślnie widoczna) i
   **Kopiec** (panel B; domyślnie ukryta). Przekrój (panel C) pominięty — to materiał MG.
   Każda mapa to osobny plik SVG (zamiast jednego pliku z widokami), bo admin może
   ukryć zakładkę, a z jednego pliku dałoby się podejrzeć ukrytą część przez oddalenie.
4. **Miejsca na start:** 23 miejsca z polecenia + `kopiec-iliac` (doszło w nowym
   rysunku). Część domyślnie dostępna, część czeka na zaznaczenie przez admina —
   lista w [`Scenariusze/Iliac/README.md`](Scenariusze/Iliac/README.md).
5. **Miejsce niedostępne** wygląda jak tło mapy dla graczy: bez narożników,
   podświetlenia, podpowiedzi i bez reakcji na kliknięcie. Podpisy narysowane na
   mapie dla graczy zostają (to część zatwierdzonej mapy dla graczy).
6. **Kolory:** domyślnie zielony; admin ustawia kolor osobno dla każdej mapy i dla
   ekranu poza mapami. W motywie bursztynowym klikalność oznacza błękit (złoto
   byłoby nieodróżnialne od bursztynu).
7. **Opisy miejsc w manifeście są minimalne** — tylko to, co wynika z nazw i z mapy
   dla graczy. Do uzupełnienia przez Ciebie albo MG.
8. **Czcionki:** Ubuntu Mono (tekst) i VT323 (nagłówki) z Google Fonts — Share Tech
   Mono nie ma polskich liter.
9. **Folder `Scenariusze/`** (Twoja prośba). Rejestr nadal nazywa się `kampanie.json`,
   a dane w bazie leżą pod `kampanie/{id}` — tak jak w poleceniu.
10. **Nowy dokument ustawień** `kampanie/{id}/ustawienia/mapy` i pole `kontoIdZmiany`
    (kto ostatnio zmienił wpis).
11. **Plik `Kod_Wzoru.txt`** przeniesiony do `dokumentacja/` (porządek w katalogu głównym).

## Testy — co sprawdzono, a czego nie

Sprawdzone automatycznie (szczegóły i polecenia: [`testy/README.md`](testy/README.md)):

* **Testy jednostkowe** (Node): format CSV (cudzysłowy, przecinki, nowe linie, BOM),
  kodowanie typów Firestore, odczyt błędnych plików, partie po 500, wyszukiwanie bez polskich znaków.
* **Skrypty** (Python): przygotowanie map — usuwanie materiału MG, przerwanie przy
  śladach MG poza grupami `tylko-mg` (bez wypisywania ich treści), raport nowych i
  brakujących miejsc; złożenie strony — rysunki MG nie trafiają na stronę.
* **Cała aplikacja w przeglądarce** (Chromium, 52 kroki) na **udawanym Firebase**:
  role (gość/gracz/admin), logowanie i ogólny komunikat błędu, notatki (dodanie,
  edycja, usunięcie z potwierdzeniem, notatka ogólna), postęp, powiązania z grafem,
  zmiany na żywo w drugiej karcie, checkboxy admina działające na żywo u gracza,
  ukrywanie zakładki i kolor bursztynowy, „podgląd gracza”, kopia CSV (z `secrets`
  i bez), przywracanie „Scal” i „Zastąp” (z kopią bezpieczeństwa, bez naruszania
  kont), odporność na wstrzyknięcie HTML w notatce, klawiatura, komunikat przy
  zablokowanej bazie; **telefony (iPhone 13, Pixel 5) i tablet (iPad Mini pionowo i
  poziomo)**: brak przewijania w bok, przesuwanie palcem, szczypanie dwoma palcami,
  stuknięcie w miejsce, indeks, panel admina.
* **Prawdziwy Firebase 13.2.0:** biblioteki wczytują się z `gstatic`, aplikacja łączy
  się z projektem `notatkirpg-b601c`; przy obecnych (domyślnych, zamkniętych)
  regułach baza odmawia dostępu, a aplikacja pokazuje zrozumiały komunikat.

**Czego nie dało się sprawdzić** (i jak to zrobić ręcznie):

* **Zapisu i odczytu w prawdziwej bazie** — reguły są jeszcze zamknięte, a ich
  publikacja należy do Ciebie. Po opublikowaniu reguł:
  1. Otwórz stronę w dwóch kartach (albo na dwóch urządzeniach).
  2. Zaloguj się w pierwszej jako gracz, dodaj notatkę przy dowolnym miejscu —
     powinna od razu pojawić się w drugiej karcie.
  3. Zaloguj się w drugiej jako admin, zaznacz w indeksie ukryte miejsce — w
     pierwszej karcie powinno od razu stać się klikalne (złote narożniki).
  4. W zakładce ADMIN pobierz kopię, usuń jedną notatkę, przywróć kopię trybem
     „Scal” — notatka powinna wrócić.
* **Publikacji na GitHub Pages** — wymaga przełączenia „Source: GitHub Actions” w
  ustawieniach repozytorium (krok 2 wyżej). Potem sprawdź zakładkę Actions.
* **Prawdziwych telefonów i tabletów** — testy używały emulacji w Chromium. Warto
  sprawdzić przesuwanie i szczypanie na telefonie i tablecie przy stole.

## Ograniczenia

* Kopia zapasowa obejmuje tylko kolekcje znane aplikacji (SDK w przeglądarce nie
  umie wylistować kolekcji).
* JavaScript nie odróżnia liczb całkowitych od zmiennoprzecinkowych — po
  przywróceniu kopii np. `5.0` zapisze się jako `5` (aplikacja i tak nie zapisuje liczb).
* Wyszukiwanie działa w przeglądarce — przy tysiącach notatek może zwolnić.
* Strona jest publiczna: każdy, kto zna adres, może ją oglądać (bez logowania — tylko podgląd).
