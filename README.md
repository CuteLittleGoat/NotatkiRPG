# NotatkiRPG — mapy i notatki drużyny (Data-Slate)

Aplikacja internetowa dla graczy kampanii RPG. Łączy **interaktywne mapy w stylu
ekranu Data-Slate** ze **wspólnym notatnikiem drużyny** zapisywanym na żywo
w Firebase. Pierwsza kampania: **Kopiec Iliac** (Warhammer 40,000 / Wrath & Glory).

> **Etap: pierwszy szkic.** Bazę chronią reguły (tylko zapisy używane przez
> aplikację, konta tylko do odczytu) i App Check (zapytania tylko ze strony
> aplikacji). Logowanie przez kolekcję `secrets` zostaje świadomie — co z tego
> wynika, opisuje rozdział [Bezpieczeństwo](#bezpieczeństwo).

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

* **Logowanie wymagane** — bez logowania strona pokazuje tylko formularz (bez map
  i bez nazw kampanii). Trzy profile: **Admin**, **Skryba** (pisze notatki) i
  **Gracz** (tylko czyta) — opis w rozdziale [Role i uprawnienia](#role-i-uprawnienia).
* **Wybór kampanii** po zalogowaniu — admin widzi wszystkie kampanie i przy każdej
  zaznacza, czy jest **widoczna dla graczy**; Skryba i Gracz widzą tylko kampanie
  udostępnione (admin może więc spokojnie przygotowywać kilka kampanii naraz).
* **Zakładki** — pierwsza jest **Notatki**, potem mapy (każda mapa to osobna
  zakładka). **Każdą zakładkę admin może ukryć albo odsłonić graczom** polem wyboru
  przy jej nazwie (widzi je tylko admin). Kolor ekranu (zielony albo bursztynowy)
  admin ustawia osobno dla każdej mapy.
* **Miejsca na mapie** — admin zaznacza przy miejscu pole „dostępne dla graczy”.
  Zaznaczone miejsce dostaje złote narożniki: można je kliknąć i robić przy nim
  notatki. Odznaczone wygląda jak zwykłe tło mapy (żeby nie zdradzać, że jest ważne).
* **Czerwona kropka** w prawym górnym rogu złotej ramki — przy tym miejscu są
  notatki. Widać ją tylko przy miejscach odsłoniętych przez admina.
* **Indeks z boku mapy** z wyszukiwarką — gracze widzą tylko to, co mają
  dostępne; admin widzi wszystko i ma przy każdym miejscu pole wyboru.
* **Notatki** przy miejscach i ogólne. Etykieta notatki pokazuje miejsce, podpis,
  datę i godzinę. Zmiany widać u wszystkich od razu, bez odświeżania strony.
* **Kopia zapasowa bazy** do pliku CSV i **przywracanie** (tryb „Scal” albo „Zastąp”) — tylko admin.
* **LOG w zakładce Admin** — potwierdzenia zmian admina zapisują się w polu stałej
  wielkości z przewijaniem (na komputerze z boku, na telefonie i tablecie u dołu
  zakładki), zamiast wyskakiwać na ekranie. Log znika po wylogowaniu albo
  zamknięciu przeglądarki. Błędy nadal pokazują się na ekranie (najwyżej dwa naraz).
* **Telefon, tablet, komputer** — przesuwanie palcem, szczypanie, kółko myszy,
  obsługa klawiaturą; bez przewijania strony na boki.
* **Wiele kampanii** — każda w osobnym folderze w `kampanie/`.

## Pierwsze uruchomienie — krok po kroku

1. **Opublikuj reguły bazy** z pliku `firebase/firestore.rules` — instrukcja w
   [`firebase/README.md`](firebase/README.md).
2. **Ustaw repozytorium jako publiczne** (Settings → General → Danger Zone →
   Change visibility). W darmowym planie GitHub Pages działa tylko dla repozytoriów publicznych.
3. **Włącz GitHub Pages** (jednorazowo, zrobione): **Settings → Pages → Build and
   deployment → Deploy from a branch** → gałąź `main`, folder `/ (root)`.
4. Od tej chwili **po każdej zmianie na gałęzi `main` strona publikuje się sama**
   (trwa 1–2 minuty; w zakładce Actions widać „pages build and deployment”, a obok
   test „Testy”). Adres: `https://cutelittlegoat.github.io/NotatkiRPG/`.
5. Otwórz stronę, **zaloguj się kontem admina**, zakładka **ADMIN** → sekcja
   **ZABEZPIECZENIA**: powinno być „Działa”. Wtedy **włącz wymuszanie App Check**
   dla Cloud Firestore (krok po kroku w [`firebase/README.md`](firebase/README.md)).
6. Na liście **WYBIERZ KAMPANIĘ** zaznacz, które kampanie widzą gracze, a w
   zakładce **ADMIN** kampanii — co w niej widzą (zakładki, miejsca, kolory).
7. **Rób kopię zapasową** (zakładka ADMIN) — najlepiej po każdej sesji.

Strona publikuje się wprost z repozytorium, więc pod jej adresem leżą wszystkie
pliki (także rysunki od MG). Aplikacja ich nie wczytuje ani nie pokazuje — gracze
korzystają tylko ze stron aplikacji (Twoja decyzja).

## Role i uprawnienia

| Kto | Może |
|---|---|
| bez logowania | nic — widzi tylko formularz logowania (bez map i nazw kampanii) |
| **Gracz** (dziś `Player3`) | przeglądać udostępnione kampanie: mapy, miejsca i notatki (bez dodawania i zmian) |
| **Skryba** (dziś `Player2`) | to samo co Gracz oraz dodawać, edytować i usuwać notatki |
| **Admin** (dziś `Player1`) | widzieć wszystkie kampanie, zakładki i miejsca; przeglądać notatki (bez edycji); ukrywać i odsłaniać kampanie, zakładki i miejsca, ustawiać kolory, robić kopię zapasową i przywracać bazę |

**Skąd aplikacja wie, kto jest kim** (konta zakładasz ręcznie w konsoli Firebase):

* **Admin** — konto z polem `rola: "admin"` w dokumencie `admins/{id}` (jak dotąd).
* **Skryba** — konto, którego pole **`DisplayName`** brzmi **„Skryba”** (wielkość liter
  nie ma znaczenia).
* **Gracz** — każde inne konto (np. `DisplayName` = „Gracz”). Gdy zmienisz komuś
  `DisplayName` na „Skryba”, zyska edycję notatek — i odwrotnie.

Na górze ekranu przy „KONTO:” widać login (`PlayerName`), a na dole — nazwę konta
(`DisplayName`). Przy wpisie jest pole **„podpis / postać”**, bo z jednego konta
może korzystać kilka osób. Logowanie trwa do zamknięcia karty przeglądarki (sesja
w `sessionStorage`, bez hasła); po wylogowaniu aplikacja wraca do ekranu logowania.

## Jak tego używać

**Mapa:** przeciągnij (myszą albo palcem), żeby przesunąć; kółko myszy albo dwa
palce — przybliżanie; przyciski `+` `−` `⌂` (⌂ = widok początkowy); podwójne
kliknięcie w tło też wraca do widoku początkowego. Z klawiatury: Tab przechodzi
po miejscach, Enter otwiera kartę, strzałki przesuwają, `+`/`-` przybliżają,
Home — widok początkowy, Esc zamyka kartę albo indeks.

**Miejsca:** kliknij miejsce ze złotymi narożnikami. Otworzy się karta z jawnym
opisem i notatkami. Skryba ma tam przycisk „+ DODAJ NOTATKĘ”.

**Indeks:** przycisk INDEKS (na szerokim ekranie indeks jest otwarty z boku).
Wyszukiwarka przeszukuje nazwy miejsc, dawne nazwy (aliasy), opisy i notatki —
bez rozróżniania wielkości liter i polskich znaków.

**Admin — kampanie:** na liście **WYBIERZ KAMPANIĘ** przy każdej kampanii jest pole
„widoczna dla graczy”. Odznaczona kampania (przerywana ramka, znak ⊘) znika
Skrybie i Graczowi z listy, a kto ją właśnie ogląda, zobaczy informację „KAMPANIA
NIEDOSTĘPNA”. To samo pole jest w zakładce ADMIN kampanii → „KAMPANIA”.

**Admin — zakładki i miejsca:** przy każdej zakładce (w pasku na górze) jest pole wyboru —
zaznaczone = zakładka widoczna dla graczy, odznaczone = ukryta (ukryte zakładki
mają przerywaną ramkę i znak ⊘). To samo jest w zakładce ADMIN → „ZAKŁADKI”.
Pola wyboru przy miejscach są w indeksie, w karcie miejsca i w zakładce ADMIN.
Tam też: kolory, „ZAZNACZ/ODZNACZ WSZYSTKIE”, „PRZYWRÓĆ DOMYŚLNE” (ustawienia z
manifestu), kopia i przywracanie. Pole **PODGLĄD GRACZA** w nagłówku pokazuje
zakładki, mapy i indeks tak, jak widzą je gracze.

**Admin — LOG:** w zakładce ADMIN pole „LOG” zbiera potwierdzenia wszystkich zmian
(najnowsze na górze, z godziną) — także tych zrobionych w pasku zakładek, w indeksie
i na liście kampanii. Przycisk WYCZYŚĆ opróżnia log.

## Struktura repozytorium

```
NotatkiRPG/
├── index.html                 strona startowa: logowanie, potem wybór kampanii
├── kampania.html              strona kampanii (?k=iliac): notatki, mapy, admin
├── kampanie.json              rejestr kampanii (id, nazwa, folder, widocznaDomyslnie)
├── aplikacja/                 wspólny kod aplikacji
│   ├── css/slate.css          wygląd Data-Slate (motywy zielony / bursztynowy)
│   ├── grafika/ikona.svg      ikona karty przeglądarki
│   └── js/                    moduły ES (opis niżej)
├── firebase/                  firebase-config.js, firestore.rules, README.md (reguły, App Check)
├── kampanie/                  kampanie — każda w osobnym folderze
│   ├── README.md              konwencja rysunków MG, nowa wersja mapy, nowa kampania
│   └── Iliac/                 kampania „Kopiec Iliac” (manifest, mapy, rysunki MG)
├── narzedzia/                 skrypt przygotowania map, szablon kampanii
├── testy/                     testy automatyczne (jednostkowe, skryptów, reguł bazy, całej aplikacji)
├── dokumentacja/              materiały pomocnicze (Kod_Wzoru.txt — wzór klikalnej mapy)
├── .github/workflows/         testy uruchamiane po każdej zmianie na main
├── AGENTS.md                  zasady pracy dla agentów AI
└── README.md                  ten plik
```

Moduły w `aplikacja/js/`:

| Plik | Za co odpowiada |
|---|---|
| `firebase.js` | jedyne miejsce ładowania Firebase 13.2.0 (wszystkie moduły w tej samej wersji) i uruchomienia App Check |
| `konfiguracja.js` | nazwy kolekcji, motywy, zakładki stałe (`ZAKLADKI_STALE` — nowa zakładka = nowy wpis tutaj) |
| `sesja.js`, `logowanie.js` | sesja, profile (Admin / Skryba / Gracz), kto widzi którą kampanię; logowanie (kolekcje `secrets`, `admins`) |
| `dane.js`, `stan.js` | odczyt/zapis w Firestore na żywo; wspólny stan strony i ustawienia domyślne |
| `mapa.js` | wczytanie mapy SVG, przesuwanie i przybliżanie (mysz, dotyk, klawiatura) |
| `indeks.js`, `panel.js` | indeks z wyszukiwarką; karta miejsca |
| `notatki.js`, `karty.js`, `formularze.js` | zakładka „Notatki”, karta notatki, okno formularza notatki |
| `admin.js`, `kopia.js`, `kopia-format.js` | panel admina; kopia i przywracanie; format pliku CSV |
| `kampania.js`, `uruchom-kampanie.js`, `start.js` | złożenie strony kampanii (bez logowania — przekierowanie do logowania); strona startowa (logowanie, lista kampanii) |
| `narzedzia.js` | drobne narzędzia (tworzenie elementów przez `textContent`, daty, komunikaty i log admina) |

## Uruchomienie na własnym komputerze

Moduły JavaScript nie działają po otwarciu pliku z dysku (`file://`), potrzebny
jest prosty serwer. Z katalogu repozytorium:

```bash
python3 -m http.server 8000
```

Potem w przeglądarce: <http://localhost:8000>. Strona łączy się z prawdziwą bazą
Firebase (ten sam projekt co wersja w internecie). Gdy wymuszanie App Check jest
włączone, na komputerze potrzebny jest zarejestrowany **token debugowania** —
instrukcja w [`firebase/README.md`](firebase/README.md) („Testowanie na własnym komputerze”).

## Dane w Firestore

Dane każdej kampanii są osobno, pod jej identyfikatorem (dla Iliac: `iliac`):

| Ścieżka | Pola |
|---|---|
| `kampanie/{kampaniaId}` | `nazwa`, `utworzono`, `widoczna` (czy gracze widzą kampanię: true/false), `zmieniono`, `kontoIdZmiany` — tworzy go aplikacja przy pierwszym zapisie |
| `…/notatki/{id}` | `elementId` (id miejsca albo `null` = notatka ogólna), `tytul`, `tresc`, `podpis`, `kontoId`, `utworzono`, `zmieniono`, `kontoIdZmiany` (starsze notatki mogą mieć jeszcze pole `kategoria` — aplikacja go już nie używa) |
| `…/ustawienia/mapy` | ustawienia admina: `zakladki.{id}` (widoczność zakładek innych niż mapy, np. `notatki`), `mapy.{mapaId}.widoczna`, `mapy.{mapaId}.kolor`, `elementy.{elementId}` (true/false), `kolor` (ekran poza mapami) |

Brak wpisu w `ustawienia/mapy` = ustawienie domyślne (z manifestu kampanii:
`widocznaDomyslnie`, `dostepnyDomyslnie`, `kolor`; zakładka Notatki — widoczna).
Brak pola `widoczna` w `kampanie/{id}` = wartość `widocznaDomyslnie` z rejestru
`kampanie.json` (Iliac: widoczna; nowa kampania bez tego pola — ukryta).

Konta (zakładane ręcznie w konsoli Firebase, aplikacja je tylko czyta):

| Ścieżka | Pola |
|---|---|
| `secrets/{id}` | `PlayerName` (login), `PlayerPassword` (hasło), `DisplayName` (nazwa konta na dole ekranu; „Skryba” = konto, które pisze notatki) |
| `admins/{id}` | `rola: "admin"` — konto admina (ten sam `{id}` co w `secrets`) |

Zakładki Postęp i Powiązania
zostały usunięte — jeśli zostały po nich wpisy w bazie (`kampanie/iliac/postep`,
`…/powiazania`), aplikacja ich nie używa; można je usunąć w konsoli Firebase.

## Kopia zapasowa i przywracanie

**Plik CSV** (`NotatkiRPG_kopia_RRRR-MM-DD_GGMM.csv`): UTF-8 z BOM (Excel poprawnie
pokaże polskie znaki), cytowanie RFC 4180, kolumny `sciezka` i `dane` (pola
dokumentu jako JSON). Pierwszy wiersz danych to `#meta` (format, wersja, data,
zakres). Znaczniki czasu i inne typy spoza JSON są zapisane jawnie, np.
`{"__typ": "timestamp", "s": 1762790400, "ns": 0}`.

**Zakres:** przeglądarka nie umie wylistować kolekcji, więc kopia obejmuje
kolekcje znane aplikacji: `kampanie/{id}` wszystkich kampanii z `kampanie.json`
(z podkolekcjami `notatki` i `ustawienia`) i `admins`.
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
5. **Kont (`admins`, `secrets`) aplikacja nie przywraca** — reguły bazy pozwalają je
   tylko czytać. Kopia nadal je zawiera (dla porządku), a podgląd informuje, że
   zostaną pominięte. Konta zmieniasz ręcznie w konsoli Firebase.

## Bezpieczeństwo

**Co chroni bazę teraz:**

1. **Reguły bazy** (`firebase/firestore.rules`, wersja 4): dostępne są tylko kolekcje
   aplikacji, zapisy muszą mieć właściwe pola i długość tekstów, a **konta (`admins`,
   `secrets`) są tylko do odczytu** — nikt nie zmieni haseł ani ról przez aplikację
   ani poza nią. Reguły sprawdzono testami w emulatorze bazy (`testy/reguly/`).
2. **App Check** (reCAPTCHA Enterprise, klucz dla `cutelittlegoat.github.io`): po
   włączeniu wymuszania w konsoli Firebase baza przyjmuje zapytania **wyłącznie z
   aplikacji na jej adresie**. Skrypty i inne strony, które znają konfigurację,
   dostają odmowę. Przepustka (token) ważna 7 dni, odnawia się sama — gracze niczego
   nie zauważają. Szczegóły i kolejność włączania: [`firebase/README.md`](firebase/README.md).

**Czego to nie zmienia** (bo logowanie zostaje oparte na kolekcji `secrets`, bez
logowania Firebase — Twoja decyzja):

1. **Baza nie wie, kto pyta.** Profile Admin, Skryba i Gracz oraz wymóg logowania
   działają tylko w wyglądzie aplikacji. Ktoś, kto otworzy prawdziwą stronę i użyje
   narzędzi deweloperskich przeglądarki, może czytać bazę bez logowania oraz dodawać,
   zmieniać i usuwać notatki i ustawienia (ale nie konta).
2. **Hasła da się podejrzeć** w ten sam sposób — logowanie wymaga odczytu kolekcji
   `secrets`. **Używaj haseł, których nie używasz nigdzie indziej.**
3. **Ukrywanie kampanii, miejsc i zakładek działa tylko w wyglądzie aplikacji.**
   Rejestr kampanii (`kampanie.json`), manifesty (`kampania.json`) i pliki map są
   publiczne — ciekawski gracz może w nich przeczytać nazwy wszystkich kampanii oraz
   nazwy i opisy wszystkich miejsc z manifestu. W tych plikach trzymaj tylko rzeczy,
   których odkrycie nie zepsuje gry.
4. **Repozytorium jest publiczne**, a strona publikuje się wprost z niego — rysunki
   od MG (`Rysunki_*.svg`) może otworzyć każdy, kto zna ich adres. Aplikacja ich nie
   pokazuje; gracze korzystają tylko z jej stron (Twoja decyzja).

Kopia zapasowa po każdej sesji to najlepsza ochrona przed przypadkowym lub
złośliwym skasowaniem notatek.

**Dalsze możliwości** (nic z tego nie jest wdrożone):

* **Ograniczenie klucza API** do adresu strony w Google Cloud Console (Interfejsy API
  i usługi → Dane logowania → klucz przeglądarki → ograniczenie do witryn
  `https://cutelittlegoat.github.io/*`) — dodatkowa warstwa obok App Check.
* Logowanie przez Firebase Authentication — świadomie odrzucone; bez niego hasła i
  role nie mogą być chronione przez bazę.

## Decyzje do potwierdzenia

Przyjęte na tym etapie — każdą można zmienić:

1. **Publikacja:** GitHub Pages wprost z gałęzi `main` (Deploy from a branch).
   Repozytorium publiczne, rysunki MG w repozytorium — aplikacja z nich nie korzysta.
2. **Reguły bazy (wersja 4):** zapis tylko tam i tylko w takim kształcie, jakiego
   używa aplikacja; konta tylko do odczytu, więc **przywracanie kopii pomija konta**.
   Wersja 3 dodała widoczność zakładek (`zakladki`) i zablokowała usunięte zakładki
   Postęp i Powiązania; wersja 4 — widoczność kampanii (`widoczna` w `kampanie/{id}`).
3. **Mapy:** dwie zakładki — **Okolice** (panel A rysunku; domyślnie widoczna) i
   **Kopiec** (panel B; domyślnie ukryta). Przekrój (panel C) pominięty — to materiał MG.
   Każda mapa to osobny plik SVG (zamiast jednego pliku z widokami), bo admin może
   ukryć zakładkę, a z jednego pliku dałoby się podejrzeć ukrytą część przez oddalenie.
4. **Miejsca na start:** 23 miejsca z polecenia + `kopiec-iliac` (doszło w nowym
   rysunku). Część domyślnie dostępna, część czeka na zaznaczenie przez admina —
   lista w [`kampanie/Iliac/README.md`](kampanie/Iliac/README.md).
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
9. **Folder `kampanie/`** (Twoja prośba) — nazwa spójna z rejestrem `kampanie.json`
   i z danymi w bazie (`kampanie/{id}`).
10. **Nowy dokument ustawień** `kampanie/{id}/ustawienia/mapy` i pole `kontoIdZmiany`
    (kto ostatnio zmienił wpis).
11. **Plik `Kod_Wzoru.txt`** przeniesiony do `dokumentacja/` (porządek w katalogu głównym).
12. **App Check** w aplikacji (reCAPTCHA Enterprise, klucz witryny w
    `firebase/firebase-config.js`); na komputerze lokalnym — token debugowania.
    Napis „chronione przez reCAPTCHA…” usunięty ze stopek (Twoja prośba). Uwaga:
    zasady Google wymagają, żeby na stronie był ten napis albo znaczek reCAPTCHA —
    jeśli zechcesz się ich trzymać, znaczek można przywrócić (mały, w rogu ekranu).
13. **Zakładki:** tylko **Notatki** (pierwsza i domyślna) oraz mapy. Zakładki Postęp
    i Powiązania (z grafem) oraz pole „Kategoria” w notatkach usunięte (Twoja prośba).
    Każdą zakładkę admin ukrywa albo odsłania polem wyboru przy jej nazwie.
14. **Czerwona kropka** przy miejscu z notatkami — tylko gdy miejsce jest odsłonięte
    dla graczy; w podglądzie admina zasada jest ta sama (kropka nie zdradza
    ukrytych miejsc).
15. **Formularz notatki:** kursor od razu w polu „Treść”; tytuł jest opcjonalny —
    jeśli pusty, aplikacja bierze pierwszą linię treści.
16. **Trzy profile** (Twoja prośba): Admin — jak dotąd z kolekcji `admins`; Skryba —
    konto z `DisplayName` = „Skryba”; każde inne konto to Gracz (tylko czyta). Dzięki
    temu nie trzeba zakładać nowych pól w bazie. Stare sesje (sprzed tej zmiany)
    wymagają ponownego zalogowania.
17. **Bez logowania nic nie widać** — ani map, ani nazw kampanii; strona kampanii
    otwarta bez logowania przenosi do logowania, a po zalogowaniu wraca do tej
    kampanii.
18. **Widoczność kampanii:** admin widzi wszystkie kampanie z rejestru, gracze —
    tylko udostępnione. Domyślną widoczność (zanim admin cokolwiek zmieni) podaje
    pole `widocznaDomyslnie` w `kampanie.json` — Iliac: widoczna; nowa kampania bez
    tego pola jest ukryta. Kampanii nieudostępnionej gracz nie otworzy także z
    odnośnika (zobaczy „KAMPANIA NIEDOSTĘPNA”, bez jej nazwy).
19. **Opis kampanii** na liście bez dopisku „Warhammer 40,000 / Wrath & Glory”
    (pole `opis` w rejestrze jest opcjonalne).
20. **LOG admina** w zakładce Admin: do 300 ostatnich komunikatów w `sessionStorage`
    (znika po wylogowaniu albo zamknięciu przeglądarki). U admina potwierdzenia nie
    wyskakują na ekranie; błędy tak (najwyżej dwa naraz — dotyczy to wszystkich kont).

## Testy — co sprawdzono, a czego nie

Sprawdzone automatycznie (szczegóły i polecenia: [`testy/README.md`](testy/README.md)):

* **Testy jednostkowe** (Node, 22): format CSV (cudzysłowy, przecinki, nowe linie,
  BOM), kodowanie typów Firestore, odczyt błędnych plików, partie po 500,
  wyszukiwanie bez polskich znaków, profile kont (Admin / Skryba / Gracz) i
  widoczność kampanii (z bazy albo domyślna z rejestru).
* **Skrypty** (Python, 9): przygotowanie map — usuwanie materiału MG, przerwanie
  przy śladach MG poza grupami `tylko-mg` (bez wypisywania ich treści), raport
  nowych i brakujących miejsc; mapy graczy wszystkich kampanii bez śladów materiału MG.
* **Reguły bazy w emulatorze Firestore** (27): każdy zapis i odczyt aplikacji
  (logowanie, lista kampanii, widoczność kampanii, notatki — także starsze z polem
  `kategoria`, ustawienia admina z widocznością zakładek, kopia i przywracanie)
  przechodzi; obce pola, za długie teksty, widoczność inna niż tak/nie, nieznane
  kolekcje (w tym usunięte `postep` i `powiazania`) i każda zmiana kont są
  odrzucane; partia przywracania z kontem zostaje odrzucona w całości.
* **Cała aplikacja w przeglądarce** (Chromium, 66 kroków) na **udawanym Firebase**:
  bez logowania nic nie widać (strona startowa bez nazw kampanii, strona kampanii
  przenosi do logowania i po nim wraca), trzy profile (Gracz tylko czyta, Skryba
  pisze, Admin ustawia), login u góry i `DisplayName` u dołu, stara sesja wymaga
  ponownego logowania, lista kampanii (gracz widzi tylko udostępnione, admin — wszystkie
  z polem widoczności; zmiany na żywo; ukrycie oglądanej kampanii → „KAMPANIA
  NIEDOSTĘPNA”, a po odsłonięciu powrót), ogólny komunikat błędu logowania, Notatki
  jako pierwsza zakładka, notatki (dodanie z kursorem w „Treści”, etykieta z nazwą
  miejsca, edycja, usunięcie z potwierdzeniem, notatka ogólna), czerwona kropka,
  zmiany na żywo w drugiej karcie, checkboxy admina działające na żywo u gracza,
  ukrywanie i odsłanianie każdej zakładki i kolor bursztynowy, „podgląd gracza”,
  LOG admina (wpisy z godziną, najnowsze na górze, bez wyskakujących potwierdzeń,
  przetrwa odświeżenie, czyści się przyciskiem i przy wylogowaniu; przy błędach
  najwyżej dwa komunikaty na ekranie), status App Check, kopia CSV (z `secrets` i
  bez), przywracanie „Scal” i „Zastąp” (z kopią bezpieczeństwa, z pominięciem kont),
  odporność na wstrzyknięcie HTML w notatce, klawiatura, komunikat przy odmowie
  dostępu; **telefony (iPhone 13, Pixel 5) i tablet (iPad Mini pionowo i poziomo)**:
  brak przewijania w bok (logowanie, listy kampanii, mapa, indeks, panel admina),
  przesuwanie palcem, szczypanie dwoma palcami, stuknięcie w miejsce, log admina
  widoczny na ekranie.
* **Prawdziwe biblioteki Firebase 13.2.0** (aplikacja, App Check, baza) wczytują się z
  `gstatic` i uruchamiają bez błędów (połączenia z usługami Google zablokowane na
  czas testu). Wcześniej, przy zamkniętych regułach, sprawdzono też połączenie z
  projektem `notatkirpg-b601c` — baza odmówiła dostępu, a aplikacja pokazała
  zrozumiały komunikat.

**Czego nie dało się sprawdzić** (i jak to zrobić ręcznie):

* **Działania App Check w testach automatycznych** — klucz reCAPTCHA działa tylko
  pod adresem `cutelittlegoat.github.io`, więc sprawdza się go na opublikowanej
  stronie: zakładka ADMIN → ZABEZPIECZENIA ma pokazać „Działa”; potem wykres w
  konsoli Firebase (App Check → Cloud Firestore) — żądania „zweryfikowane”.
* **Zapisu i odczytu w prawdziwej bazie** (nie zapisuję nic w Twojej bazie). Po
  opublikowaniu reguł i strony:
  1. Otwórz stronę w dwóch kartach (albo na dwóch urządzeniach).
  2. Zaloguj się w pierwszej jako Skryba, dodaj notatkę przy dowolnym miejscu —
     powinna od razu pojawić się w drugiej karcie (zalogowanej jako Gracz).
  3. Zaloguj się jako Gracz — nie powinno być przycisków „NOWA NOTATKA”,
     „DODAJ NOTATKĘ”, „EDYTUJ” ani „USUŃ”.
  4. Zaloguj się w drugiej karcie jako admin, zaznacz w indeksie ukryte miejsce — w
     pierwszej karcie powinno od razu stać się klikalne (złote narożniki).
  5. Jako admin odznacz kampanię na liście „WYBIERZ KAMPANIĘ” — u Gracza powinna
     zniknąć z listy (a otwarta — pokazać „KAMPANIA NIEDOSTĘPNA”). Zaznacz z powrotem.
  6. W zakładce ADMIN pobierz kopię, usuń jedną notatkę, przywróć kopię trybem
     „Scal” — notatka powinna wrócić.
  7. Po włączeniu wymuszania App Check powtórz punkt 2.
* **Prawdziwych telefonów i tabletów** — testy używały emulacji w Chromium. Warto
  sprawdzić przesuwanie i szczypanie na telefonie i tablecie przy stole.

## Ograniczenia

* Kopia zapasowa obejmuje tylko kolekcje znane aplikacji (SDK w przeglądarce nie
  umie wylistować kolekcji).
* JavaScript nie odróżnia liczb całkowitych od zmiennoprzecinkowych — po
  przywróceniu kopii np. `5.0` zapisze się jako `5` (aplikacja i tak nie zapisuje liczb).
* Wyszukiwanie działa w przeglądarce — przy tysiącach notatek może zwolnić.
* Strona jest publiczna: każdy, kto zna adres, może ją oglądać (bez logowania — tylko podgląd).
