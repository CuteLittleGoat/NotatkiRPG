# Blokada jednoczesnego logowania — konta admina i edytora

Analiza z 2026-11-10. **Nic z tego nie jest wdrożone** — to materiał do decyzji.

Dotyczy kont z rolą w kolekcji `admins`: **admina** (`Player1`) i **edytora**
(`Player2`). Konto **do przeglądania** (`Player3`) zostaje bez ograniczeń — może
być na nim zalogowanych wiele osób naraz (Twoja decyzja).

## W skrócie

* **Da się** zrobić „uprzejmą” blokadę: aplikacja zapisuje w bazie, na którym
  urządzeniu konto jest zalogowane, i reaguje na drugie logowanie.
* **Nie da się** zrobić blokady, której nie obejdzie ktoś, kto zna hasło i umie
  posługiwać się narzędziami przeglądarki. Baza nie wie, kto pyta (logowanie bez
  Firebase Authentication — Twoja decyzja), więc blokada będzie porządkiem i
  wygodą, nie zabezpieczeniem.
* Najprostszy i najpewniejszy wariant to **„ostatnie logowanie wygrywa”**: gdy ktoś
  zaloguje się na konto admina albo edytora na nowym urządzeniu, poprzednie
  urządzenie samo się wylogowuje z komunikatem.
* **Rekomendacja:** na razie nie wprowadzać. Jeśli kiedyś — wariant A (niżej).

## 1. Jak jest dziś

* Logowanie odbywa się w przeglądarce: aplikacja porównuje login i hasło z kolekcją
  `secrets`. W bazie **nie zostaje żaden ślad**, że ktoś jest zalogowany.
* Zalogowanie trzyma się **jednej karty przeglądarki** (pamięć karty,
  `sessionStorage`). Zamknięcie karty = wylogowanie. Druga karta otwarta „od zera”
  wymaga ponownego logowania.
* Na każde konto może się zalogować dowolnie wiele osób i urządzeń naraz.

## 2. Dlaczego to nie jest jeden przełącznik

1. **Brak własnego serwera.** Aplikacja to sama strona + baza Firestore. Nie ma
   miejsca, które „pilnowałoby” logowań — każde urządzenie decyduje samo, a baza
   tylko przechowuje dane.
2. **Baza nie widzi zamknięcia karty.** Firestore nie ma mechanizmu „ktoś się
   rozłączył”. Gdy ktoś zamknie kartę bez wylogowania, przeglądarka zwykle nie
   zdąży nic zapisać. Blokada, która czeka na wylogowanie, mogłaby więc „wisieć”.
3. **Telefony usypiają karty w tle.** Telefon w kieszeni przestaje wysyłać
   cokolwiek do bazy — z punktu widzenia bazy wygląda to tak samo jak zamknięcie karty.
4. **Każda karta to osobne logowanie.** Bez dodatkowej pracy druga karta tej samej
   osoby wyglądałaby jak „drugie urządzenie” i blokada wyrzucałaby samą siebie.
5. **Baza nie wie, kto pyta.** Reguły bazy nie odróżnią admina od gracza, więc nie
   mogą zabronić „obcemu” zmiany wpisu o zalogowaniu. Blokadę da się obejść (np.
   usunąć jej wpis) — tak jak dziś da się podejrzeć hasła w `secrets`.

## 3. Jak duży jest problem dziś

Jednoczesne używanie konta admina albo edytora przez dwie osoby **niczego nie psuje**:

* zmiany widać u wszystkich od razu (oba urządzenia widzą te same dane na żywo);
* jedyna kolizja: dwie osoby zmieniają **tę samą notatkę** w tej samej chwili —
  zostaje wersja zapisana jako druga (pierwsza zmiana przepada);
* u admina podobnie: jeśli dwie osoby przełączają to samo pole, wygrywa ostatnie
  kliknięcie (wszystko trafia do LOGU na urządzeniu, które klikało).

Blokada chroniłaby więc głównie przed **zapomnianym zalogowaniem** (np. konto
admina zostawione na cudzym komputerze) i przed „podkradaniem” konta edytora przez
innego gracza — o ile ten gracz nie zna sposobów na jej obejście.

## 4. Możliwe rozwiązania

### Wariant A — „ostatnie logowanie wygrywa” (przejęcie konta)

**Jak działa:** przy logowaniu na konto admina albo edytora aplikacja zapisuje w
bazie losowy numer tego logowania (i numer przeglądarki). Każda otwarta strona tego
konta słucha tego wpisu. Gdy numer się zmieni — bo ktoś zalogował się na innym
urządzeniu — poprzednie urządzenie samo się wylogowuje.

**Co zobaczysz:** na starym urządzeniu: „+++ SESJA PRZEJĘTA +++ Na to konto
zalogowano się na innym urządzeniu.” i ekran logowania. Nowe urządzenie działa normalnie.

* **Zalety:** proste; nic nie „wisi” (nie ma blokady do zwolnienia); bardzo mało
  zapisów w bazie; kilka kart tej samej przeglądarki liczy się jako jedno urządzenie.
* **Wady:** nie zatrzymuje drugiej osoby — wyrzuca pierwszą. Dwie osoby mogą się
  nawzajem wyrzucać. Trzeba zadbać, żeby edytorowi wyrzuconemu w trakcie pisania
  nie przepadł tekst notatki (np. zostaje w okienku do skopiowania).
* **Nakład pracy:** mały.

### Wariant B — „pierwszy ma pierwszeństwo” (blokada z odliczaniem)

**Jak działa:** zalogowane urządzenie co minutę „melduje się” w bazie. Kto próbuje
się zalogować, gdy ostatni meldunek jest świeży (np. sprzed mniej niż 3 minut),
dostaje odmowę. Po wylogowaniu wpis znika; po zamknięciu karty bez wylogowania
blokada wygasa sama po tych kilku minutach.

**Co zobaczysz:** „+++ KONTO W UŻYCIU +++ To konto jest używane na innym urządzeniu
(od 20:15).” — opcjonalnie z przyciskiem „PRZEJMIJ”.

* **Zalety:** naprawdę zatrzymuje drugą osobę (o ile ta nie kliknie „PRZEJMIJ”).
* **Wady:** po zamknięciu karty bez wylogowania konto jest zablokowane jeszcze
  przez kilka minut; telefon z uśpioną kartą przestaje się meldować, więc blokada
  wygasa, a po powrocie trzeba się logować od nowa; ryzyko „zakleszczenia” (nikt nie
  może wejść) — potrzebny przycisk przejęcia albo ręczne usunięcie wpisu w konsoli
  Firebase; więcej zapisów w bazie; więcej kodu i przypadków do przetestowania.
* **Nakład pracy:** średni (ok. 2–3 razy więcej niż A).

### Wariant C — tylko informacja, bez blokady

**Jak działa:** w zakładce Admin widać, gdzie zalogowane są konta admina i edytora
(np. „edytor: telefon, od 19:40”). Nic nie jest blokowane.

* **Zalety:** zero ryzyka zablokowania kogokolwiek; dobrze łączy się z wariantem A
  (wpis o logowaniu i tak powstaje).
* **Wady:** niczemu nie zapobiega — tylko pokazuje. Bez meldunków (jak w B) nie
  wiadomo, czy ktoś nadal patrzy, czy tylko kiedyś się zalogował.
* **Nakład pracy:** mały (razem z A — bardzo mały dodatek).

### Wariant D — druga baza Google z wykrywaniem rozłączenia

Firebase ma drugą bazę, **Realtime Database**, która — w odróżnieniu od Firestore —
sama zauważa rozłączenie urządzenia i może wtedy usunąć wpis o zalogowaniu. To
usuwa największą wadę wariantu B (blokady „wiszące” po zamknięciu karty).

* **Zalety:** blokada zwalnia się sama, bez meldowania się co minutę.
* **Wady:** druga baza do skonfigurowania (osobne reguły, osobne włączenie App
  Check), dodatkowy moduł Firebase w aplikacji; nadal da się ją obejść (bez
  Firebase Authentication baza nie wie, kto pyta). Duża zmiana jak na zysk.
* **Nakład pracy:** duży.

### Wariant E — własny serwer (Cloud Functions)

Pilnowanie logowań przez kod działający na serwerach Google. Wymaga planu **Blaze**
(płatny, z darmowym limitem) i odejścia od zasady „sama strona, bez serwera”.
Bez Firebase Authentication i tak nie dałoby pełnej ochrony. **Nie polecam.**

## 5. Porównanie

| | A: ostatni wygrywa | B: pierwszy ma pierwszeństwo | C: tylko informacja | D: druga baza | E: serwer |
|---|---|---|---|---|---|
| Druga osoba nie wejdzie | nie (wyrzuci pierwszą) | tak | nie | tak | tak |
| Blokada może „wisieć” | nie | tak, kilka minut | nie | rzadko | nie |
| Działa bez nowych usług | tak | tak | tak | nie | nie |
| Da się obejść | tak | tak | — | tak | trudniej |
| Nakład pracy | mały | średni | mały | duży | duży |

## 6. Bezpieczeństwo — czego żadna blokada nie da

* **Nie ochroni konta, którego hasło ktoś poznał.** Hasła da się dziś odczytać z
  bazy (kolekcja `secrets` musi być czytelna, żeby działało logowanie), więc kto
  zechce, zaloguje się albo obejdzie blokadę.
* Prawdziwe pilnowanie, kto i ile razy jest zalogowany, wymagałoby Firebase
  Authentication albo własnego serwera — oba świadomie odrzucone.
* Blokada to więc **porządek i wygoda** (zapomniane zalogowanie, „pożyczanie”
  konta), nie zabezpieczenie. Najlepszą ochroną danych pozostaje **kopia zapasowa
  po każdej sesji** (zakładka Admin) i włączone wymuszanie App Check.

## 7. Koszty w darmowym planie Firebase

Darmowy limit Firestore: **50 000 odczytów i 20 000 zapisów dziennie**.

* **A i C:** 1–2 zapisy przy każdym logowaniu i po jednym odczycie na każde otwarte
  urządzenie przy zmianie — pomijalne.
* **B:** jeden zapis na minutę na każde zalogowane urządzenie admina lub edytora.
  Czterogodzinna sesja to ok. 240 zapisów — nadal daleko od limitu.

## 8. Rekomendacja

1. **Na teraz: nie wprowadzać.** Konto admina ma jedna osoba, konto edytora — jedna;
   jednoczesne używanie niczego nie psuje (rozdział 3).
2. **Jeśli kiedyś:** wariant **A** („ostatnie logowanie wygrywa”) z dodatkiem **C**
   (w zakładce Admin informacja, gdzie zalogowane są konta admina i edytora).
3. Wariant B tylko wtedy, gdy naprawdę ważne jest, żeby druga osoba nie mogła
   wejść — za cenę blokad „wiszących” po zamknięciu karty.

## 9. Decyzje do podjęcia (z proponowaną odpowiedzią)

1. **Nowe logowanie ma wyrzucać stare (A) czy być blokowane (B)?** Proponuję: **A**.
2. **Kilka kart tej samej przeglądarki to jedno urządzenie?** Proponuję: **tak**
   (inaczej druga karta wyrzuci pierwszą).
3. **Co z niezapisaną notatką edytora, którego wyrzucono?** Proponuję: okienko
   zostaje otwarte z tekstem do skopiowania, ale przycisk ZAPISZ jest zablokowany.
4. **Czy admin ma widzieć w zakładce Admin, gdzie zalogowane są konta (C)?**
   Proponuję: **tak**, razem z A.
5. **Czy blokada obejmuje też admina?** Proponuję: **tak** (to samo zachowanie dla
   admina i edytora; konto do przeglądania bez zmian).

---

## Dodatek — szczegóły techniczne (dla programisty albo agenta AI)

**Model danych (A + C):** nowa kolekcja `sesje/{kontoId}` (po jednym dokumencie na
konto admina i edytora):

| Pole | Znaczenie |
|---|---|
| `token` | losowy ciąg (`crypto.randomUUID()`) — numer bieżącego logowania |
| `urzadzenie` | losowy ciąg trzymany w `localStorage` — ten sam dla wszystkich kart jednej przeglądarki |
| `opis` | „telefon” / „tablet” / „komputer” (z rozmiaru ekranu; bez danych osobowych) |
| `od` | `serverTimestamp()` przy logowaniu |
| `meldunek` | tylko wariant B: `serverTimestamp()` co minutę |

**Przepływ (A):**

* `sprawdzLogowanie()` (`aplikacja/js/logowanie.js`) — po rozpoznaniu roli `admin`
  albo `edytor` zapis `sesje/{kontoId}` (`token`, `urzadzenie`, `opis`, `od`); token
  trafia też do sesji w `sessionStorage` (podbić `WERSJA_SESJI` w `sesja.js`).
* `start.js` i `kampania.js` — nasłuch `onSnapshot` na `sesje/{kontoId}`; gdy
  `token` różny od własnego **i** `urzadzenie` różne od własnego → `wyczyscSesje()`
  i ekran „SESJA PRZEJĘTA”. Gdy `urzadzenie` to samo (inna karta tej samej
  przeglądarki) → przyjąć nowy token bez wylogowania.
* `wyczyscSesje()` przy wylogowaniu — usunąć `sesje/{kontoId}`, jeśli token jest
  własny (inaczej nie ruszać).
* Okno notatki (`formularze.js`) — po przejęciu zablokować zapis, zostawić tekst.
* Zakładka Admin (`admin.js`) — sekcja „ZALOGOWANE KONTA” z `opis` i `od` (wariant C).

**Reguły bazy (szkic):** reguły nie znają roli pytającego, ale mogą sprawdzić rolę
**konta**, którego dotyczy wpis, przez `get()` (jeden dodatkowy odczyt na zapis):

```
match /sesje/{kontoId} {
  allow read: if true;
  allow create, update: if get(/databases/$(database)/documents/admins/$(kontoId)).data.rola in ['admin', 'edytor']
                        && request.resource.data.keys().hasOnly(['token', 'urzadzenie', 'opis', 'od', 'meldunek'])
                        && request.resource.data.token is string && request.resource.data.token.size() <= 64
                        && request.resource.data.urzadzenie is string && request.resource.data.urzadzenie.size() <= 64;
  allow delete: if true;
}
```

Wariant B: dodatkowo `request.resource.data.meldunek == request.time` (meldunek
musi być znacznikiem czasu serwera). Po zmianie reguł: test w
`testy/reguly/test_reguly.mjs` i prośba do użytkownika o wklejenie reguł.

**Testy e2e:** dwa konteksty przeglądarki (dwa „urządzenia”) — logowanie na drugim
wylogowuje pierwsze; dwie karty jednego kontekstu nie wyrzucają się nawzajem;
konto do przeglądania — wiele logowań naraz bez reakcji; edytor wyrzucony w trakcie
pisania nie traci tekstu. Udawany Firestore (`testy/e2e/falszywy-firebase/`) już
obsługuje `onSnapshot` na dokumencie i zmiany między kartami.

**Pułapki:** kolejność zdarzeń przy logowaniu na dwóch urządzeniach naraz (wygrywa
ostatni zapis — to akceptowalne); brak dostępu do `localStorage` (np. tryb
prywatny) — wtedy każda karta to osobne urządzenie; App Check musi działać przed
pierwszym zapisem do `sesje`.
