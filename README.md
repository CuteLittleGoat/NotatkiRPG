# NotatkiRPG — mapy i notatki drużyny (Data-Slate)

Aplikacja internetowa dla graczy kampanii RPG. Łączy **interaktywne mapy w stylu
ekranu Data-Slate** ze **wspólnym notatnikiem drużyny** zapisywanym na żywo
w Firebase. Pierwsza kampania: **Kopiec Iliac** (Warhammer 40,000 / Wrath & Glory).
Kampania przykładowa **Wzór** (pierwsza na liście) pokazuje możliwości aplikacji na
trzech mapach w różnych stylach i jest wzorem do kopiowania przy nowej kampanii —
opis: [`kampanie/Template/README.md`](kampanie/Template/README.md).

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
6. [Gdzie co zmieniać](#gdzie-co-zmieniać)
7. [Uruchomienie na własnym komputerze](#uruchomienie-na-własnym-komputerze)
8. [Dane w Firestore](#dane-w-firestore)
9. [Kopia zapasowa i przywracanie](#kopia-zapasowa-i-przywracanie)
10. [Bezpieczeństwo](#bezpieczeństwo)
11. [Decyzje do potwierdzenia](#decyzje-do-potwierdzenia)
12. [Testy — co sprawdzono, a czego nie](#testy--co-sprawdzono-a-czego-nie)
13. [Ograniczenia](#ograniczenia)

## Co potrafi

* **Logowanie wymagane** — bez logowania strona pokazuje tylko formularz (bez map
  i bez nazw kampanii). Trzy profile: **Admin**, **Edytor** (pisze notatki) i
  **Gracz** (tylko czyta) — opis w rozdziale [Role i uprawnienia](#role-i-uprawnienia).
* **„Zapamiętaj mnie na tym urządzeniu”** — logowanie pamiętane przez 30 dni (także
  po zamknięciu przeglądarki, we wszystkich kartach), aż do kliknięcia WYLOGUJ;
  przeglądarka może zapisać hasło, a Chrome i Edge — logować automatycznie.
* **Wybór kampanii** po zalogowaniu — admin widzi wszystkie kampanie i przy każdej
  zaznacza, czy jest **widoczna dla graczy**; Edytor i Gracz widzą tylko kampanie
  udostępnione (admin może więc spokojnie przygotowywać kilka kampanii naraz).
  Kolejność na liście = kolejność wpisów w rejestrze `kampanie.json` (zmiana nazwy i
  kolejności z poziomu aplikacji — analiza: [`Analizy/Kolejnosc.md`](Analizy/Kolejnosc.md)).
* **Zakładki** — pierwsza jest **Notatki**, potem mapy (każda mapa to osobna
  zakładka). **Każdą zakładkę admin może ukryć albo odsłonić graczom** polem wyboru
  przy jej nazwie (widzi je tylko admin); ukryta zakładka ma przerywaną ramkę. Kolor
  map (**kolory oryginału** — mapa w kolorach rysunku, domyślnie — albo zielony,
  bursztynowy, czerwony) admin ustawia osobno dla każdej mapy, a **kolor interface**
  (ekranu poza mapami; domyślnie zielony) — osobno dla kampanii.
* **Miejsca na mapie** — admin ma przy każdym miejscu dwa pola: **◈ klikalne** —
  miejsce dostaje złote narożniki, można je kliknąć i robić przy nim notatki
  (odznaczone wygląda jak zwykłe tło mapy, żeby nie zdradzać, że jest ważne) — oraz
  **👁 widoczne**.
* **Miejsca do odkrycia** — miejsce z odznaczonym 👁 jest **zasłonięte**: gracze w
  ogóle go nie widzą (ani na mapie, ani w indeksie). Gdy gracze je znajdą (np. jaskinię
  smoka, ukryte przejście), admin zaznacza 👁 (z potwierdzeniem) i miejsce pojawia się
  u graczy od razu, z napisem „Nowe odkrycie…”. Klikalne może być tylko miejsce
  widoczne. Analiza i decyzje: [`Analizy/Spoilery.md`](Analizy/Spoilery.md).
* **Czerwona kropka** w prawym górnym rogu złotej ramki — przy tym miejscu są
  notatki. Widać ją tylko przy miejscach widocznych i klikalnych dla graczy.
* **Indeks** z wyszukiwarką — na zakładce mapy pokazuje miejsca tej mapy, na
  zakładce Notatki — miejsca ze wszystkich map. Gracze widzą tylko to, co mają
  dostępne; admin widzi wszystko i ma przy każdym miejscu pola 👁 i ◈.
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
| **Gracz** (dziś `Player3`) | przeglądać udostępnione kampanie: mapy, miejsca i notatki (bez dodawania i zmian); na to konto może być zalogowanych wiele osób naraz |
| **Edytor** (dziś `Player2`) | to samo co Gracz oraz dodawać, edytować i usuwać notatki |
| **Admin** (dziś `Player1`) | widzieć wszystkie kampanie, zakładki i miejsca; przeglądać notatki (bez edycji); ukrywać i odsłaniać kampanie, zakładki i miejsca, ustawiać kolory, robić kopię zapasową i przywracać bazę |

**Skąd aplikacja wie, kto jest kim** — wyłącznie z pola **`rola`** w dokumencie
`admins/{id}` (konta zakładasz ręcznie w konsoli Firebase):

* `rola: "admin"` — **Admin**;
* `rola: "edytor"` — **Edytor**;
* brak dokumentu w `admins` (albo inna wartość) — **Gracz**, tylko czyta.

`DisplayName` i `PlayerName` **nie wpływają na uprawnienia** — możesz je zmieniać
dowolnie. Na górze ekranu przy „KONTO:” widać login (`PlayerName`), a na dole —
nazwę konta (`DisplayName`). Przy wpisie jest pole **„podpis / postać”**, bo z
jednego konta może korzystać kilka osób.

**Jak długo trwa zalogowanie** (analiza i decyzje: [`Analizy/Logowanie.md`](Analizy/Logowanie.md)):

* Pole **„Zapamiętaj mnie na tym urządzeniu”** (domyślnie zaznaczone) — aplikacja
  pamięta zalogowanie **30 dni** od zalogowania, także po zamknięciu przeglądarki,
  we wszystkich kartach tej przeglądarki (`localStorage`). **Hasła aplikacja nie
  zapisuje** — tylko numer konta, login, nazwę konta, profil i datę ważności.
* Odznaczone (na **cudzym lub wspólnym komputerze**) — tylko do zamknięcia karty
  (`sessionStorage`); odświeżenie strony nie wylogowuje, nowa karta już tak.
* **WYLOGUJ** wylogowuje wszystkie karty tej przeglądarki; inne urządzenia zostają
  zalogowane (każde pamięta osobno).
* Przy każdym otwarciu strony aplikacja **sprawdza konto w bazie**: zmiana roli w
  konsoli Firebase działa od razu, usunięte konto wylogowuje się samo. **Wylogowanie
  wszystkich urządzeń konta** (np. po zgubieniu telefonu): zmień jego login
  (`PlayerName`) w konsoli Firebase — sama zmiana hasła zapamiętanych urządzeń nie
  wyloguje. Bez internetu aplikacja nikogo nie wylogowuje.
* **Hasło w przeglądarce:** pola są oznaczone dla menedżerów haseł, więc przeglądarka
  proponuje „Zapisać hasło?” i potem wypełnia formularz. W Chrome i Edge aplikacja sama
  prosi o zapis, a gdy zapamiętanie wygaśnie — loguje automatycznie hasłem z
  przeglądarki (po kliknięciu WYLOGUJ już nie, dopóki ktoś nie zaloguje się sam).
* Chcesz mieć w jednej przeglądarce dwie karty na **różnych kontach** (np. admin i
  gracz)? Loguj się bez „Zapamiętaj mnie” albo użyj okna prywatnego — zapamiętane
  logowanie jest wspólne dla wszystkich kart. Admin ma też pole **PODGLĄD GRACZA**.

Liczba jednocześnie zalogowanych osób nie jest ograniczona —
analiza takiej blokady dla kont admina i edytora: [`Analizy/Blokada_kont.md`](Analizy/Blokada_kont.md).

## Jak tego używać

**Mapa:** przeciągnij (myszą albo palcem), żeby przesunąć; kółko myszy albo dwa
palce — przybliżanie; przyciski `+` `−` `⌂` (⌂ = widok początkowy); podwójne
kliknięcie w tło też wraca do widoku początkowego. Z klawiatury: Tab przechodzi
po miejscach, Enter otwiera kartę, strzałki przesuwają, `+`/`-` przybliżają,
Home — widok początkowy, Esc zamyka kartę albo indeks.

**Miejsca:** kliknij miejsce ze złotymi narożnikami. Otworzy się karta z jawnym
opisem i notatkami. Edytor ma tam przycisk „+ DODAJ NOTATKĘ”.

**Indeks:** przycisk INDEKS — na mapie w prawym górnym rogu, na zakładce Notatki
obok „+ NOWA NOTATKA” (na szerokim ekranie indeks jest otwarty z boku). Na zakładce
mapy indeks pokazuje tylko miejsca tej mapy, a na zakładce Notatki — miejsca ze
wszystkich map; kliknięcie miejsca otwiera jego mapę i kartę. Wyszukiwarka przeszukuje
nazwy miejsc, dawne nazwy (aliasy), opisy i notatki — bez rozróżniania wielkości
liter i polskich znaków.

**Admin — kampanie:** na liście **WYBIERZ KAMPANIĘ** przy każdej kampanii jest pole
„widoczna dla graczy”. Odznaczona kampania (przerywana ramka, znak ⊘) znika
Edytorowi i Graczowi z listy, a kto ją właśnie ogląda, zobaczy informację „KAMPANIA
NIEDOSTĘPNA”. To samo pole jest w zakładce ADMIN kampanii → „KAMPANIA”.

**Admin — zakładki i miejsca:** przy każdej zakładce (w pasku na górze) jest pole wyboru —
zaznaczone = zakładka widoczna dla graczy, odznaczone = ukryta (ukryte zakładki
mają przerywaną ramkę i znak ⊘). To samo jest w zakładce ADMIN → „ZAKŁADKI”.
Przy każdym miejscu są dwa pola (w indeksie, w karcie miejsca i w zakładce ADMIN):
**👁 widoczne** — odznaczone = miejsce zasłonięte przed graczami (admin widzi je
przygaszone, kursywą, ze znakiem ⊘); zaznaczenie pyta „Odkryć graczom…?” — po ODKRYJ
gracze widzą miejsce od razu; odznaczenie zasłania je bez pytania i odznacza też ◈.
**◈ klikalne** — gracze mogą kliknąć miejsce i robić przy nim notatki; pole jest szare,
dopóki 👁 jest odznaczone. W zakładce ADMIN są też: kolory („Kolor interface” — ekran
poza mapami, „Kolor map” — przy każdej mapie), „ZAZNACZ/ODZNACZ WSZYSTKIE” (zmieniają
tylko ◈ miejsc widocznych — nigdy niczego nie odkrywają), „PRZYWRÓĆ DOMYŚLNE”
(ustawienia z manifestu — zasłania z powrotem miejsca do odkrycia), kopia i
przywracanie. Pole **PODGLĄD GRACZA** w nagłówku pokazuje zakładki, mapy i indeks tak,
jak widzą je gracze (bez zasłoniętych miejsc).

**Admin — LOG:** w zakładce ADMIN pole „LOG” zbiera potwierdzenia wszystkich zmian
(najnowsze na górze, z godziną) — także tych zrobionych w pasku zakładek, w indeksie
i na liście kampanii. Przycisk WYCZYŚĆ opróżnia log.

## Struktura repozytorium

```
NotatkiRPG/
├── index.html                 strona startowa: logowanie, potem wybór kampanii
├── kampania.html              strona kampanii (?k=iliac): notatki, mapy, admin
├── kampanie.json              rejestr kampanii (id, nazwa, folder, widocznaDomyslnie); kolejność = kolejność na liście
├── aplikacja/                 wspólny kod aplikacji
│   ├── css/slate.css          wygląd Data-Slate (motywy zielony / bursztynowy / czerwony / kolory oryginału)
│   ├── grafika/ikona.svg      ikona karty przeglądarki
│   └── js/                    moduły ES (opis niżej)
├── firebase/                  firebase-config.js, firestore.rules, README.md (reguły, App Check)
├── kampanie/                  kampanie — każda w osobnym folderze
│   ├── README.md              konwencja rysunków MG, nowa wersja mapy, nowa kampania
│   ├── Template/              kampania przykładowa „Wzór” (3 mapy: fantasy, plan pałacu, pole bitwy; generatory rysunków)
│   └── Iliac/                 kampania „Kopiec Iliac” (manifest, mapy, rysunki MG)
├── Template/                  wzór do pracy nad mapami (dla agentów AI i ludzi):
│   ├── Specyfikacja_rysunku_mapy.md  jak przygotować rysunek SVG, z którego powstają mapy
│   ├── Przyklady/             kopie rysunków kampanii „Wzór” (przykładowe pliki dla innego agenta)
│   ├── Problemy/              zgłoszenia problemów z mechanizmem map (RRRR-MM-DD_Opis.md)
│   ├── Changelog.md           dziennik zmian wzoru
│   └── README.md              co jest w folderze, polecenie do wklejenia innemu agentowi
├── narzedzia/                 skrypt przygotowania map, podgląd map w kolorach motywów, szablon kampanii
├── testy/                     testy automatyczne (jednostkowe, skryptów, reguł bazy, całej aplikacji)
├── dokumentacja/              materiały pomocnicze (Kod_Wzoru.txt — wzór klikalnej mapy)
├── Analizy/                   analizy pomysłów do decyzji (np. Blokada_kont.md) — nie są częścią aplikacji
├── .github/workflows/         testy uruchamiane po każdej zmianie na main
├── AGENTS.md                  zasady pracy dla agentów AI (zmienia go tylko użytkownik)
└── README.md                  ten plik
```

Moduły w `aplikacja/js/`:

| Plik | Za co odpowiada |
|---|---|
| `firebase.js` | jedyne miejsce ładowania Firebase 13.2.0 (wszystkie moduły w tej samej wersji) i uruchomienia App Check |
| `konfiguracja.js` | nazwy kolekcji, motywy, zakładki stałe (`ZAKLADKI_STALE` — nowa zakładka = nowy wpis tutaj) |
| `sesja.js`, `logowanie.js` | sesja, profile (Admin / Edytor / Gracz), kto widzi którą kampanię; logowanie (kolekcje `secrets`, `admins`) |
| `dane.js`, `stan.js` | odczyt/zapis w Firestore na żywo; wspólny stan strony i ustawienia domyślne |
| `mapa.js` | wczytanie mapy SVG, przesuwanie i przybliżanie (mysz, dotyk, klawiatura) |
| `indeks.js`, `panel.js` | indeks z wyszukiwarką; karta miejsca |
| `odkrycia.js` | pola admina przy miejscu: 👁 widoczne (odkrycie z potwierdzeniem, zasłonięcie) i ◈ klikalne — wspólne dla indeksu, karty miejsca i zakładki Admin |
| `notatki.js`, `karty.js`, `formularze.js` | zakładka „Notatki”, karta notatki, okno formularza notatki |
| `admin.js`, `kopia.js`, `kopia-format.js` | panel admina; kopia i przywracanie; format pliku CSV |
| `kampania.js`, `uruchom-kampanie.js`, `start.js` | złożenie strony kampanii (bez logowania — przekierowanie do logowania); strona startowa (logowanie, lista kampanii) |
| `narzedzia.js` | drobne narzędzia (tworzenie elementów przez `textContent`, daty, komunikaty i log admina) |

## Gdzie co zmieniać

Mapa projektu dla programisty i agenta AI. Zasady pracy agentów są w `AGENTS.md`
(agenci go nie zmieniają); **tę tabelę agent aktualizuje** przy każdej zmianie, która
ją dezaktualizuje (nowy plik, przeniesiona funkcja, nowa ścieżka).

| Zadanie | Miejsce |
|---|---|
| nowa wersja rysunku MG, nowe miejsca, zmiana nazw, miejsce do odkrycia (krok po kroku) | `kampanie/README.md` |
| przygotowanie rysunku mapy (format SVG, znaczniki, kolory, zakazy, miejsca do odkrycia) | `Template/Specyfikacja_rysunku_mapy.md` (rozdział 17 — praktyczne wskazówki); przykłady: `Template/Przyklady/`; podgląd: `node narzedzia/podglad_mapy.cjs … [--na-start]` |
| przekazanie rysowania mapy innemu agentowi (pliki i polecenie do wklejenia); sprawdzanie rysunku skryptem map i podglądem | `Template/README.md` (specyfikacja jest samodzielna — bez poleceń tego repozytorium; ścieżki do plików w tabeli „Pliki” na jej początku) |
| problemy i zmiany mechanizmu map | zgłoszenia: `Template/Problemy/`; dziennik: `Template/Changelog.md` |
| nowa kampania | `kampanie/README.md`, szablon `narzedzia/szablon_kampanii/`; pełny przykład: `kampanie/Template/` (kampania „Wzór”; generatory rysunków zapisują też kopie do `Template/Przyklady/`) |
| kolejność kampanii na liście | kolejność wpisów w `kampanie.json` (zmiana z aplikacji — analiza: `Analizy/Kolejnosc.md`) |
| kolory map i interfejsu (domyślne, lista) | `MOTYWY`, `MOTYW_DOMYSLNY` (interfejs), `MOTYW_MAPY_DOMYSLNY` (mapy) w `aplikacja/js/konfiguracja.js`; wybór w `aplikacja/js/stan.js`; motywy także w `slate.css` i w skrypcie map (muszą się zgadzać — pilnuje test) |
| wygląd | `aplikacja/css/slate.css` |
| zachowanie mapy (przesuwanie, dotyk, strefy kliknięcia) | `aplikacja/js/mapa.js` |
| logowanie, lista kampanii (widoczność kampanii) | `aplikacja/js/start.js`, `logowanie.js`; profile i dostęp do kampanii: `sesja.js` |
| zakładki, przepływ strony kampanii | `aplikacja/js/kampania.js` |
| indeks miejsc (na mapie — jej miejsca, na Notatkach — wszystkich map) | `aplikacja/js/indeks.js` (`ustawZakres`); otwieranie i zakres — `ustawIndeks()` w `kampania.js` |
| pola admina przy miejscach: 👁 widoczne, ◈ klikalne | `aplikacja/js/odkrycia.js`; logika: `stan.js` (`elementWidoczny`, `elementDostepnyDlaGraczy`); zasłanianie na mapie: `mapa.js` (`ustawStany`, `data-nalezy-do`); napis „Nowe odkrycie” u graczy: `sprawdzOdkrycia()` w `kampania.js` |
| nowa zakładka (inna niż mapa) | wpis w `ZAKLADKI_STALE` (`konfiguracja.js`), sekcja `widok-{id}` w `kampania.html`, obsługa w `przelacz()` w `kampania.js`; widoczność dla graczy zapisuje się sama w `ustawienia/mapy` → `zakladki.{id}` |
| widoczność (domyślne z manifestu + ustawienia admina) | `aplikacja/js/stan.js` |
| zapis/odczyt bazy | `aplikacja/js/dane.js` |
| kopia i przywracanie | `aplikacja/js/kopia.js`, format: `kopia-format.js` |
| komunikaty i LOG admina | `komunikat()` w `aplikacja/js/narzedzia.js`; pole LOG w `admin.js` |
| analizy pomysłów do decyzji użytkownika | `Analizy/` (zasady: `AGENTS.md`) |
| publikacja strony | GitHub Pages: Settings → Pages → Deploy from a branch (`main`, `/`); testy po zmianach: `.github/workflows/testy.yml` |
| reguły bazy i ich test | `firebase/firestore.rules`, `testy/reguly/`, opis i wklejanie: `firebase/README.md` |
| App Check | `aplikacja/js/firebase.js`, klucz witryny w `firebase/firebase-config.js` |
| testy | `testy/README.md` (polecenia i co sprawdzają) |

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
| `…/ustawienia/mapy` | ustawienia admina: `zakladki.{id}` (widoczność zakładek innych niż mapy, np. `notatki`), `mapy.{mapaId}.widoczna`, `mapy.{mapaId}.kolor`, `elementy.{elementId}` (◈ klikalne: true/false), `elementyWidoczne.{elementId}` (👁 widoczne na mapie: true/false; false = zasłonięte), `kolor` (kolor interface — ekran poza mapami) |

Brak wpisu w `ustawienia/mapy` = ustawienie domyślne (z manifestu kampanii:
`widocznaDomyslnie`, `dostepnyDomyslnie`, `widocznyDomyslnie`, `kolor`; zakładka
Notatki — widoczna; miejsce bez `widocznyDomyslnie` — widoczne). Klikalne jest tylko
miejsce widoczne (także gdy w bazie zapisano inaczej).
Brak pola `widoczna` w `kampanie/{id}` = wartość `widocznaDomyslnie` z rejestru
`kampanie.json` (Iliac i Wzór: widoczne; nowa kampania bez tego pola — ukryta).
Kampania Wzór zapisuje dane tak samo jak każda inna: `kampanie/wzor/…`.

Konta (zakładane ręcznie w konsoli Firebase, aplikacja je tylko czyta):

| Ścieżka | Pola |
|---|---|
| `secrets/{id}` | `PlayerName` (login, u góry ekranu), `PlayerPassword` (hasło), `DisplayName` (nazwa konta na dole ekranu) — nie wpływają na uprawnienia |
| `admins/{id}` | `rola`: `"admin"` (admin) albo `"edytor"` (pisze notatki); ten sam `{id}` co w `secrets`. Konto bez dokumentu tutaj tylko czyta |

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

1. **Reguły bazy** (`firebase/firestore.rules`, wersja 5): dostępne są tylko kolekcje
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

1. **Baza nie wie, kto pyta.** Profile Admin, Edytor i Gracz oraz wymóg logowania
   działają tylko w wyglądzie aplikacji. Ktoś, kto otworzy prawdziwą stronę i użyje
   narzędzi deweloperskich przeglądarki, może czytać bazę bez logowania oraz dodawać,
   zmieniać i usuwać notatki i ustawienia (ale nie konta).
2. **Hasła da się podejrzeć** w ten sam sposób — logowanie wymaga odczytu kolekcji
   `secrets`. **Używaj haseł, których nie używasz nigdzie indziej.**
3. **Ukrywanie kampanii, miejsc i zakładek działa tylko w wyglądzie aplikacji.**
   Rejestr kampanii (`kampanie.json`), manifesty (`kampania.json`) i pliki map są
   publiczne — ciekawski gracz może w nich przeczytać nazwy wszystkich kampanii oraz
   nazwy i opisy wszystkich miejsc z manifestu. **Miejsca do odkrycia** (zasłonięte)
   też są w pliku mapy — kto celowo zajrzy do plików strony, znajdzie je. W tych
   plikach trzymaj tylko rzeczy, których odkrycie nie zepsuje gry; najważniejsze
   tajemnice fabuły — w grupach `tylko-mg` rysunków MG (analiza:
   [`Analizy/Spoilery.md`](Analizy/Spoilery.md)).
4. **Repozytorium jest publiczne**, a strona publikuje się wprost z niego — rysunki
   od MG (`Rysunki_*.svg`) może otworzyć każdy, kto zna ich adres. Aplikacja ich nie
   pokazuje; gracze korzystają tylko z jej stron (Twoja decyzja).
5. **Zapamiętane logowanie działa dla każdego, kto używa tego urządzenia** (jak poczta
   czy komunikator na telefonie). Na cudzym lub wspólnym komputerze odznacz „Zapamiętaj
   mnie” albo klikaj WYLOGUJ — szczególnie na koncie admina. Wylogowanie wszystkich
   urządzeń konta: zmiana loginu (`PlayerName`) w konsoli Firebase. Ochrony bazy to nie
   zmienia (rozdział [Role i uprawnienia](#role-i-uprawnienia)).

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
2. **Reguły bazy (wersja 5):** zapis tylko tam i tylko w takim kształcie, jakiego
   używa aplikacja; konta tylko do odczytu, więc **przywracanie kopii pomija konta**.
   Wersja 3 dodała widoczność zakładek (`zakladki`) i zablokowała usunięte zakładki
   Postęp i Powiązania; wersja 4 — widoczność kampanii (`widoczna` w `kampanie/{id}`);
   wersja 5 — zasłanianie i odkrywanie miejsc (`elementyWidoczne` w ustawieniach).
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
6. **Kolory:** admin ustawia kolor osobno dla każdej mapy („Kolor map”) i dla
   ekranu poza mapami („Kolor interface”). Motywy: zielony, bursztynowy, czerwony
   oraz — tylko dla map — **kolory oryginału** (mapa w kolorach rysunku od MG,
   interfejs zielony). Mapy domyślnie są w **kolorach oryginału** (pierwsza pozycja
   na liście; Twoja prośba), interfejs — **zielony**. Domyślne kolory podaje manifest
   kampanii (`mapy[].kolor`, `kolor`); kolor wybrany przez admina w aplikacji ma
   pierwszeństwo, a „PRZYWRÓĆ DOMYŚLNE” wraca do koloru z manifestu. W motywach bursztynowym i czerwonym klikalność oznacza błękit
   (złoto byłoby nieodróżnialne od bursztynu), w czerwonym kropka „są notatki” i
   błędy są żółte, a w kolorach oryginału klikalne miejsca na mapie mają malinowe
   narożniki (widoczne i na jasnym, i na ciemnym rysunku). Pliki map zawierają
   oba zestawy kolorów naraz, więc zmiana nie wymaga nowych plików.
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
16. **Trzy profile** (Twoja prośba) — wyłącznie z pola `rola` w kolekcji `admins`:
    `admin` = Admin, `edytor` = Edytor (pisze notatki), brak wpisu = Gracz (tylko
    czyta). `DisplayName` i `PlayerName` służą tylko do wyświetlania. Stare sesje
    (sprzed tej zmiany) wymagają ponownego zalogowania. Liczba zalogowanych osób nie
    jest ograniczona (analiza blokady: `Analizy/Blokada_kont.md`).
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
21. **Kampania przykładowa „Wzór”** (Twoja prośba; folder `kampanie/Template`,
    identyfikator `wzor`): **pierwsza na liście** (pierwszy wpis w `kampanie.json`) i od
    początku **widoczna dla graczy** — do prezentacji aplikacji; admin ukrywa ją jednym
    kliknięciem. Trzy mapy (fantasy z miastem i osadami połączonymi traktami, plan
    pałacu w stylu szkicu grozy, pole bitwy sci-fi), wszystkie widoczne, w kolorach
    oryginału; 45 miejsc: 31 klikalnych od początku, 6 widocznych, ale nieklikalnych,
    i 8 do odkrycia (po 2–3 na każdej mapie). Miejsce „Pałac Kruków” otwiera mapę
    „Pałac” (przykład mapy szczegółowej). Rysunki zrobiono skryptami z
    `kampanie/Template/generator/` (pomoc dla kolejnych map); ich kopie są w
    `Template/Przyklady/`.
22. **Kolor map domyślnie „kolory oryginału”** (Twoja prośba) — pierwsza pozycja na
    liście kolorów mapy; dotyczy też map Iliac (manifest: `oryginalny`). Kolor
    interfejsu domyślnie zielony. Pola w zakładce Admin: „Kolor interface” (dawniej
    „Kolor ekranu poza mapami”) i „Kolor map” (dawniej „Kolor mapy”). Kolor wybrany
    wcześniej przez admina w aplikacji zostaje bez zmian.
23. **Skrypt map usuwa każdy arkusz `<style>` z rysunku** (także schowany w grupie) —
    wcześniej taki arkusz trafiał do mapy graczy i mógł zmienić wygląd całej strony.
    Z arkusza rysunku skrypt bierze tylko kolor obwódki napisów (`.h`).
24. **Zapamiętane logowanie i hasło w przeglądarce** (Twoja decyzja — warianty A + B z
    [`Analizy/Logowanie.md`](Analizy/Logowanie.md), wszystkie rekomendacje): „Zapamiętaj
    mnie na tym urządzeniu” domyślnie zaznaczone, 30 dni, tak samo dla admina; konto
    sprawdzane w bazie przy każdym otwarciu strony; formularz przyjazny menedżerom
    haseł (w Firefoksie i Safari po zalogowaniu strona przeładowuje się — sygnał dla
    menedżera haseł); w Chrome i Edge prośba o zapis hasła i automatyczne logowanie;
    wylogowanie wszystkich urządzeń przez zmianę loginu w konsoli Firebase. Sesja w
    wersji 4 — wcześniejsze zalogowania wymagają jednorazowo ponownego logowania.
25. **Miejsca do odkrycia** (Twoja decyzja — wariant A z
    [`Analizy/Spoilery.md`](Analizy/Spoilery.md), wszystkie proponowane odpowiedzi): przy
    każdym miejscu pola 👁 „widoczne” i ◈ „klikalne” (◈ nieaktywne bez 👁); odkrycie z
    potwierdzeniem, zasłonięcie odznacza ◈; przyciski zbiorcze nigdy nie odkrywają;
    gracze dostają napis „Nowe odkrycie…”, a miejsce mruga kilka sekund; znacznik
    rysunku `data-nalezy-do`. Mapy Iliac bez zmian (będą rysowane od nowa według
    nowych zasad). Zasady rysowania i przykłady: folder `Template/`.
26. **Folder `Template/`** (Twoja prośba): specyfikacja rysunku map (przeniesiona z
    katalogu głównego), kopie przykładowych rysunków, zgłoszenia problemów
    (`Template/Problemy/`) i dziennik zmian (`Template/Changelog.md`) — do przekazania
    innemu agentowi razem z gotowym poleceniem (`Template/README.md`).

## Testy — co sprawdzono, a czego nie

Sprawdzone automatycznie (szczegóły i polecenia: [`testy/README.md`](testy/README.md)):

* **Testy jednostkowe** (Node, 29): format CSV (cudzysłowy, przecinki, nowe linie,
  BOM), kodowanie typów Firestore, odczyt błędnych plików, partie po 500,
  wyszukiwanie bez polskich znaków, profile kont (Admin / Edytor / Gracz — tylko z pola `rola`),
  sesja (zapamiętanie na 30 dni bez hasła, tylko karta, wygasanie, stare wersje,
  odświeżenie profilu z bazy, wylogowanie, brak dostępu do pamięci przeglądarki),
  widoczność kampanii (z bazy albo domyślna z rejestru), domyślne kolory (mapy —
  kolory oryginału, pierwsze na liście; interfejs — zielony) oraz pola miejsc
  „widoczne” i „klikalne” (domyślne z manifestu, klikalne tylko widoczne, kropka i
  notatki przy zasłoniętym miejscu, podgląd gracza).
* **Skrypty** (Python, 18): przygotowanie map — usuwanie materiału MG, przerwanie
  przy śladach MG poza grupami `tylko-mg` (bez wypisywania ich treści), usuwanie
  każdego arkusza `<style>` z rysunku (także schowanego w grupie), raport nowych i
  brakujących miejsc, miejsca do odkrycia i grupy `data-nalezy-do` (także błędne);
  dla wszystkich kampanii z rejestru: raport bez uwag, mapy graczy bez śladów materiału
  MG i **aktualne** względem rysunków; kopie przykładów w `Template/Przyklady/`
  identyczne z rysunkami kampanii „Wzór”.
* **Reguły bazy w emulatorze Firestore** (28): każdy zapis i odczyt aplikacji
  (logowanie, lista kampanii, widoczność kampanii, notatki — także starsze z polem
  `kategoria`, ustawienia admina z widocznością zakładek, odkrywanie i zasłanianie
  miejsc, kopia i przywracanie) przechodzi; obce pola, za długie teksty, widoczność
  inna niż tak/nie, nieznane kolekcje (w tym usunięte `postep` i `powiazania`) i każda
  zmiana kont są odrzucane; partia przywracania z kontem zostaje odrzucona w całości.
* **Cała aplikacja w przeglądarce** (Chromium, 89 kroków) na **udawanym Firebase**:
  bez logowania nic nie widać (strona startowa bez nazw kampanii, strona kampanii
  przenosi do logowania i po nim wraca), trzy profile (Gracz tylko czyta — nawet z
  `DisplayName` „Skryba”, Edytor pisze — z dowolnym `DisplayName`, Admin ustawia),
  login u góry i `DisplayName` u dołu, stare sesje wymagają ponownego logowania,
  lista kampanii (gracz widzi tylko udostępnione, admin — wszystkie
  z polem widoczności; zmiany na żywo; ukrycie oglądanej kampanii → „KAMPANIA
  NIEDOSTĘPNA”, a po odsłonięciu powrót), ogólny komunikat błędu logowania, Notatki
  jako pierwsza zakładka, notatki (dodanie z kursorem w „Treści”, etykieta z nazwą
  miejsca, edycja, usunięcie z potwierdzeniem, notatka ogólna), czerwona kropka,
  zmiany na żywo w drugiej karcie, checkboxy admina działające na żywo u gracza,
  ukrywanie i odsłanianie każdej zakładki (bez paska na mapie), kolory bursztynowy,
  czerwony i kolory oryginału (mapa w kolorach rysunku, interfejs zielony; listy
  kolorów — „kolory oryginału” pierwsze i domyślne dla map), „podgląd gracza”,
  kampania Wzór (pierwsza na liście, trzy mapy w kolorach oryginału, miejsca dostępne
  i ukryte, przejście z „Pałacu Kruków” do mapy „Pałac”, bez materiału MG),
  LOG admina (wpisy z godziną, najnowsze na górze, bez wyskakujących potwierdzeń,
  przetrwa odświeżenie, czyści się przyciskiem i przy wylogowaniu; przy błędach
  najwyżej dwa komunikaty na ekranie), status App Check, kopia CSV (z `secrets` i
  bez), przywracanie „Scal” i „Zastąp” (z kopią bezpieczeństwa, z pominięciem kont),
  odporność na wstrzyknięcie HTML w notatce, klawiatura, komunikat przy odmowie
  dostępu; **zapamiętane logowanie** („Zapamiętaj mnie” domyślnie zaznaczone, nowa
  karta i ponowne uruchomienie przeglądarki bez logowania, sesja bez hasła i z
  30-dniową ważnością, wygasanie, WYLOGUJ we wszystkich kartach, bez zapamiętania —
  tylko karta, zmiana roli w bazie działa od razu, zmiana loginu wylogowuje),
  **menedżer haseł** (pola oznaczone dla menedżerów haseł; z udawanym mechanizmem
  Chrome/Edge: prośba o zapis, automatyczne logowanie, brak automatycznego logowania
  po WYLOGUJ — także ze strony kampanii; bez tego mechanizmu, jak w Firefoksie i
  Safari: przejście na nową stronę po zalogowaniu, bez mignięcia czerwonego napisu
  „Nie udało się wczytać listy kampanii”); **zakres indeksu** (na zakładce mapy —
  tylko jej miejsca, u admina i u gracza; na zakładce Notatki — miejsca wszystkich
  map; wybór miejsca z indeksu otwiera jego mapę); **miejsca do odkrycia** (gracz nie
  widzi zasłoniętych miejsc — na mapie, także w chwili jej wczytania, w indeksie i w
  filtrze notatek; admin widzi je przygaszone, ◈ nieaktywne; odkrycie z potwierdzeniem
  i ANULUJ; gracz widzi odkrycie od razu, z napisem i mruganiem; ◈ po odkryciu,
  zasłonięcie odznacza ◈; podgląd gracza; przyciski zbiorcze nie odkrywają;
  „PRZYWRÓĆ DOMYŚLNE”);
  **telefony (iPhone 13, Pixel 5) i tablet (iPad Mini pionowo i poziomo)**:
  brak przewijania w bok (logowanie, listy kampanii, mapa, indeks na mapie i na
  zakładce Notatki, panel admina,
  pole bitwy kampanii Wzór), przesuwanie palcem, szczypanie dwoma palcami, stuknięcie
  w miejsce, log admina widoczny na ekranie.
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
* **Okienek menedżera haseł i automatycznego logowania** w prawdziwych przeglądarkach
  (przeglądarka testowa nie ma menedżera haseł — test używa udawanego). Ręcznie: zaloguj
  się na telefonie i na komputerze — przeglądarka powinna zaproponować „Zapisać hasło?”;
  po WYLOGUJ pola powinny wypełnić się same (albo pojawi się podpowiedź nad klawiaturą).
  Zamknij przeglądarkę i otwórz stronę ponownie — z zaznaczonym „Zapamiętaj mnie” od
  razu lista kampanii. Szczegóły: [`Analizy/Logowanie.md`](Analizy/Logowanie.md), rozdział 7.
* **Zapisu i odczytu w prawdziwej bazie** (nie zapisuję nic w Twojej bazie). Po
  opublikowaniu reguł i strony:
  1. Otwórz stronę w dwóch kartach (albo na dwóch urządzeniach). W jednej przeglądarce
     loguj się na różne konta **bez** „Zapamiętaj mnie” — zapamiętane logowanie jest
     wspólne dla wszystkich kart.
  2. Zaloguj się w pierwszej jako edytor (`Player2`), dodaj notatkę przy dowolnym miejscu —
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
  8. **Miejsca do odkrycia** (wymaga reguł bazy w wersji 5): jako admin otwórz kampanię
     Wzór → KRAINA; Smocza Jama jest przygaszona, a w indeksie pole 👁 odznaczone, ◈
     szare. U Gracza jaskini nie ma ani na mapie, ani w indeksie. Zaznacz 👁 i potwierdź
     „ODKRYJ” — u Gracza jaskinia pojawia się od razu z napisem „Nowe odkrycie…”.
     Zaznacz ◈ — Gracz może ją kliknąć. Odznacz 👁 — znika u Gracza, a ◈ odznacza się
     samo. Na koniec „PRZYWRÓĆ DOMYŚLNE” przy mapie Kraina w zakładce ADMIN.
* **Prawdziwych telefonów i tabletów** — testy używały emulacji w Chromium. Warto
  sprawdzić przesuwanie i szczypanie na telefonie i tablecie przy stole.

## Ograniczenia

* Kopia zapasowa obejmuje tylko kolekcje znane aplikacji (SDK w przeglądarce nie
  umie wylistować kolekcji).
* JavaScript nie odróżnia liczb całkowitych od zmiennoprzecinkowych — po
  przywróceniu kopii np. `5.0` zapisze się jako `5` (aplikacja i tak nie zapisuje liczb).
* Wyszukiwanie działa w przeglądarce — przy tysiącach notatek może zwolnić.
* Strona jest publiczna: każdy, kto zna adres, może ją oglądać (bez logowania — tylko podgląd).
