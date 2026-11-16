# Logowanie bez wpisywania hasła za każdym razem

Analiza z 2026-11-16. **Nic z tego nie jest wdrożone** — to materiał do decyzji.

Pytanie: czy da się sprawić, żeby przeglądarka **pamiętała zalogowanie** i **pozwalała
zapisać hasło** (jak na innych stronach), zamiast wymagać wpisywania loginu i hasła
przy każdym otwarciu aplikacji.

## W skrócie

* **Da się, i to niewielkim kosztem** — bez zmian w bazie i w jej regułach.
* Dziś aplikacja pamięta zalogowanie **tylko w jednej karcie przeglądarki, dopóki ta
  karta jest otwarta**. Każda nowa karta, ponowne otwarcie strony z zakładki albo
  telefon, który w tle zamknął przeglądarkę — i trzeba logować się od nowa.
* Proponuję dwie rzeczy naraz:
  1. **„Zapamiętaj mnie na tym urządzeniu”** — pole przy logowaniu (domyślnie
     zaznaczone). Aplikacja pamięta zalogowanie np. **30 dni**, także po zamknięciu
     przeglądarki, aż do kliknięcia WYLOGUJ. **Hasło nie jest nigdzie zapisywane.**
  2. **Formularz przyjazny menedżerom haseł** — po zalogowaniu przeglądarka zaproponuje
     „Zapisać hasło?”, a później sama wypełni pola (wystarczy stuknąć ZALOGUJ).
     W Chrome i Edge może nawet zalogować automatycznie.
* **Rekomendacja:** wdrożyć oba (warianty A i B poniżej). Nakład pracy: mały.

## 1. Jak jest dziś (sprawdzone w przeglądarce testowej)

Po zalogowaniu aplikacja zapisuje w przeglądarce, kto jest zalogowany (numer konta,
login, nazwa konta i profil — **bez hasła**). Zapisuje to w **pamięci karty**
(`sessionStorage`) — to schowek, który przeglądarka trzyma osobno dla każdej karty i
opróżnia, gdy kartę się zamknie. To była świadoma decyzja z początku projektu:
„logowanie trwa do zamknięcia karty”.

| Sytuacja | Trzeba logować się ponownie? |
|---|---|
| odświeżenie strony (F5, „odśwież”) w tej samej karcie | **nie** |
| przejście do kampanii i z powrotem, wpisanie adresu w tej samej karcie | **nie** |
| otwarcie strony w **nowej karcie** (z zakładki, z linku w komunikatorze, z historii) | **tak** |
| link do kampanii otwarty w nowej karcie | **tak** (logowanie, potem powrót do kampanii) |
| zamknięcie karty albo całej przeglądarki i ponowne otwarcie | **tak** |
| telefon: przeglądarka zamknięta w tle, ikona strony na ekranie głównym telefonu | **zwykle tak** — telefon otwiera stronę „od zera” albo czyści pamięć karty |
| tryb prywatny (incognito) po zamknięciu okna | **tak** |

Jeśli u Ciebie wylogowuje **samo odświeżenie w tej samej karcie**, napisz, na jakim
urządzeniu i w jakiej przeglądarce — to byłby błąd do sprawdzenia osobno. Najczęściej
jednak „przeładowanie” to jedna z sytuacji z dolnej części tabeli, a na telefonach
zdarzają się one bardzo często.

**Zapisywanie hasła w przeglądarce** — pola formularza są już poprawnie oznaczone jako
„login” i „hasło”, więc przeglądarka, która ma zapisane hasło, potrafi je wpisać. Ale
propozycja „Zapisać hasło?” pojawia się **nieregularnie**, bo:

* po zalogowaniu strona **nie przechodzi na nowy adres** — zmienia tylko zawartość
  (formularz znika, pojawia się lista kampanii). Przeglądarki najpewniej rozpoznają
  udane logowanie po przejściu na nową stronę;
* aplikacja **czyści pole hasła tuż po zalogowaniu** — część przeglądarek nie ma już
  wtedy czego zapamiętać.

## 2. Możliwe rozwiązania

### Wariant A — „Zapamiętaj mnie na tym urządzeniu” (polecany)

**Jak działa:** pod polami logowania pojawia się pole wyboru
**„Zapamiętaj mnie na tym urządzeniu”** (domyślnie zaznaczone). Zaznaczone = aplikacja
trzyma informację o zalogowaniu w **pamięci trwałej przeglądarki** (`localStorage` —
tej samej, w której dziś pamięta np. otwarty indeks obok mapy), z datą ważności, np.
**30 dni**. Odznaczone = jak dziś (do zamknięcia karty).

**Co zobaczysz:** po zalogowaniu na swoim telefonie albo komputerze aplikacja otwiera
się od razu na liście kampanii — także w nowej karcie, po zamknięciu przeglądarki, po
restarcie telefonu — aż do kliknięcia **WYLOGUJ** albo upływu ważności.

Szczegóły zachowania:

* **Hasło nie jest zapisywane** — tak jak dziś pamiętane są tylko: numer konta, login,
  nazwa konta, profil (i data ważności).
* **WYLOGUJ** wylogowuje wszystkie karty tej przeglądarki naraz (np. telefon z dwiema
  otwartymi kartami aplikacji). Inne urządzenia zostają zalogowane — każde pamięta
  osobno.
* **Profil sprawdzany przy każdym otwarciu:** dziś profil (Admin / Edytor / Gracz)
  jest odczytywany tylko przy logowaniu. Przy logowaniu na 30 dni aplikacja powinna
  przy każdym otwarciu strony odczytać z bazy aktualną rolę konta (2 odczyty — w
  darmowym limicie Firebase bez znaczenia). Dzięki temu zmiana roli w konsoli Firebase
  (np. odebranie edycji) działa od razu, a usunięte konto wylogowuje się samo. Bez
  internetu aplikacja nie wyloguje (zostaje ostatni znany profil).
* **Jak wylogować wszystkie urządzenia** (np. po zmianie hasła albo zgubieniu
  telefonu): zmiana samego hasła nie wyloguje zapamiętanych urządzeń (aplikacja nie zna
  hasła po zalogowaniu). Proponuję prostą dźwignię: aplikacja przy otwarciu porównuje
  zapamiętany login z loginem w bazie — **zmiana loginu (`PlayerName`) w konsoli
  Firebase wylogowuje wszystkie urządzenia tego konta**.
* **LOG admina** zostaje jak dziś: osobno w każdej karcie, czyszczony przy wylogowaniu.

* **Zalety:** rozwiązuje problem całkowicie na własnych urządzeniach graczy; bez zmian w
  bazie i jej regułach; hasło nigdzie nie jest przechowywane przez aplikację.
* **Wady:** kto weźmie do ręki odblokowany telefon gracza, ten jest w aplikacji
  zalogowany (jak w poczcie czy komunikatorze). Na **cudzym albo wspólnym komputerze**
  trzeba odznaczyć „Zapamiętaj mnie” (albo kliknąć WYLOGUJ) — szczególnie przy koncie
  admina. Safari na iPhonie potrafi sam wyczyścić pamięć strony nieużywanej przez ok.
  tydzień — wtedy po prostu trzeba się zalogować ponownie.
* **Nakład pracy:** mały.

### Wariant B — hasło w menedżerze haseł przeglądarki (polecany razem z A)

**Jak działa:** przeglądarka sama przechowuje hasło (w swoim menedżerze haseł,
zaszyfrowanym i chronionym blokadą telefonu albo kontem Google / Apple) i wpisuje je w
formularz. Aplikacja tylko „pomaga” przeglądarce rozpoznać udane logowanie:

1. po udanym logowaniu strona **przechodzi na nowy adres** (krótkie przeładowanie
   strony startowej albo przejście do kampanii) — to najczytelniejszy sygnał dla
   wszystkich przeglądarek, że logowanie się udało;
2. pole hasła **nie jest czyszczone** przed tym przejściem;
3. w **Chrome i Edge** na komputerze oraz w **Chrome na Androidzie** aplikacja dodatkowo
   sama prosi przeglądarkę o zapisanie hasła (specjalny mechanizm tych przeglądarek) — okienko „Zapisać hasło?”
   pojawia się od razu po zalogowaniu. Przy następnym logowaniu te przeglądarki mogą
   **zalogować automatycznie** (bez stukania), jeśli w ich ustawieniach włączone jest
   automatyczne logowanie.

**Co zobaczysz:** po pierwszym logowaniu przeglądarka zapyta „Zapisać hasło?”. Gdy
kiedyś znów trzeba będzie się zalogować (nowe urządzenie, minęła ważność z wariantu A,
inna przeglądarka z tym samym kontem Google / Apple), pola będą już wypełnione albo
podpowiedziane nad klawiaturą — wystarczy stuknąć ZALOGUJ.

* **Zalety:** standardowe, bezpieczne miejsce na hasło; działa też na nowych
  urządzeniach (menedżer haseł synchronizuje się z kontem Google / Apple); nie wymaga
  zmian w bazie.
* **Wady:** to przeglądarka decyduje, czy zaproponuje zapis (użytkownik mógł to
  wyłączyć w ustawieniach); automatyczne logowanie i natychmiastowe okienko zapisu
  działają tylko w Chrome i Edge — w Safari (na iPhonie zwykle we **wszystkich**
  przeglądarkach, bo większość z nich działa tam na silniku Safari) i w Firefoksie
  zostaje zwykłe „Zapisać hasło?” i podpowiedź przy polach. Sam wariant B nie usuwa logowania —
  tylko je skraca do jednego stuknięcia.
* **Nakład pracy:** mały.

### Wariant C — aplikacja zapisuje hasło i loguje sama (NIE)

**Jak działa:** aplikacja trzyma login i hasło w pamięci przeglądarki i przy otwarciu
loguje się nimi sama.

* **Wady:** hasło leżałoby zwykłym tekstem w pamięci strony — do odczytania przez każdego,
  kto ma dostęp do urządzenia, i przez każdy kod uruchomiony na stronie. Zasady projektu
  (`AGENTS.md`) wprost zabraniają zapisywania hasła. Wariant A daje ten sam efekt bez
  hasła. **Nie polecam.**

### Wariant D — logowanie Firebase (Firebase Authentication) — odrzucone wcześniej

Logowanie przez usługę Google z trwałym zalogowaniem „z pudełka” i prawdziwą ochroną
bazy (baza wiedziałaby, kto pyta). Wymagałoby przeniesienia kont i haseł do tej usługi i
przepisania reguł bazy. Świadomie odrzucone na początku projektu — wspominam tylko
dla porządku; trwałe logowanie da się mieć bez tego (wariant A).

## 3. Porównanie

| | A: zapamiętaj mnie | B: menedżer haseł | A + B | C: hasło w aplikacji | D: Firebase Auth |
|---|---|---|---|---|---|
| Nowa karta / restart przeglądarki bez logowania | **tak** | nie (jedno stuknięcie) | **tak** | tak | tak |
| Hasło przechowuje… | nikt (aplikacja go nie zna) | menedżer haseł przeglądarki | menedżer haseł | **aplikacja (źle)** | Google |
| Nowe urządzenie | trzeba wpisać hasło | podpowiedź / autouzupełnienie | podpowiedź | trzeba wpisać | trzeba wpisać |
| Zmiany w bazie i regułach | nie | nie | nie | nie | duże |
| Zgodne z zasadami projektu | tak | tak | tak | **nie** | odrzucone |
| Nakład pracy | mały | mały | mały | mały | duży |

## 4. Bezpieczeństwo — co się zmienia, a co nie

* **Nic się nie zmienia w ochronie bazy.** Już dziś informacja „jestem zalogowany” leży
  tylko w przeglądarce i ktoś z narzędziami przeglądarki może ją sobie wpisać —
  ochrona działa „w wyglądzie aplikacji” (rozdział „Bezpieczeństwo” w README). Dłuższe
  pamiętanie zalogowania tego nie pogarsza.
* **Zmienia się dostęp fizyczny:** zapamiętane zalogowanie działa dla każdego, kto
  używa tego samego urządzenia i przeglądarki. Na własnym telefonie z blokadą ekranu to
  normalne (jak poczta czy komunikator). Na wspólnym komputerze — odznaczyć
  „Zapamiętaj mnie” albo klikać WYLOGUJ. Dotyczy to przede wszystkim **konta admina**.
* **Hasło w menedżerze haseł** jest bezpieczniejsze niż hasło zapisane na kartce czy w
  notatkach — o ile hasło do aplikacji nie jest używane nigdzie indziej (to zalecenie
  obowiązuje już dziś, bo hasła da się podejrzeć w bazie).

## 5. Rekomendacja

1. Wdrożyć **A + B**: pole „Zapamiętaj mnie na tym urządzeniu” (domyślnie zaznaczone,
   ważność 30 dni, WYLOGUJ wylogowuje wszystkie karty) oraz formularz przyjazny
   menedżerom haseł (przejście na nową stronę po logowaniu, bez czyszczenia pola hasła,
   w Chrome i Edge okienko „Zapisać hasło?” i opcjonalne automatyczne logowanie).
2. Przy każdym otwarciu strony odświeżać profil konta z bazy (rola, istnienie konta,
   login) — żeby długie zalogowanie nie „zamrażało” uprawnień.
3. Warianty C i D — nie.

## 6. Decyzje do podjęcia (z proponowaną odpowiedzią)

1. **Wdrażamy A + B?** Proponuję: **tak**.
2. **„Zapamiętaj mnie” domyślnie zaznaczone?** Proponuję: **tak** (gracze zwykle
   korzystają z własnych telefonów); pod polem podpowiedź „odznacz na cudzym lub
   wspólnym komputerze”.
3. **Jak długo pamiętać zalogowanie?** Proponuję: **30 dni** od zalogowania. Inne
   możliwości: 7 dni, 90 dni albo „do wylogowania”.
4. **Takie samo dla admina?** Proponuję: **tak** (prościej). Ostrożniejsza możliwość:
   admin zawsze tylko do zamknięcia karty.
5. **Automatyczne logowanie w Chrome i Edge** (gdy hasło jest zapisane w przeglądarce, a
   zapamiętanie wygasło)? Proponuję: **tak** — po kliknięciu WYLOGUJ aplikacja nie
   zaloguje automatycznie, dopóki ktoś nie zaloguje się sam.
6. **„Wyloguj wszystkie urządzenia” przez zmianę loginu w konsoli Firebase?**
   Proponuję: **tak** (bez zmian w bazie; opis w README).

## 7. Jak to sprawdzić po wdrożeniu (test ręczny)

1. Zaloguj się na telefonie z zaznaczonym „Zapamiętaj mnie”. Zamknij przeglądarkę
   (także z listy ostatnich aplikacji), otwórz stronę ponownie — powinna od razu
   pokazać listę kampanii.
2. Przy pierwszym logowaniu przeglądarka powinna zaproponować zapisanie hasła — zgódź
   się. Kliknij WYLOGUJ: pola logowania powinny wypełnić się same (albo pojawić się
   podpowiedź nad klawiaturą).
3. Na komputerze zaloguj się z **odznaczonym** polem, zamknij kartę, otwórz stronę w
   nowej — powinien być formularz logowania (jak dziś).
4. Otwórz aplikację w dwóch kartach, w jednej kliknij WYLOGUJ — druga też powinna
   przejść do logowania.
5. W konsoli Firebase zmień rolę testowego konta (np. usuń „edytor”) — po odświeżeniu
   strony na zapamiętanym urządzeniu nie powinno być przycisków dodawania notatek.

---

## Dodatek — szczegóły techniczne (dla programisty albo agenta AI)

**Stan obecny:** `aplikacja/js/sesja.js` — sesja `{ wersja: 3, kontoId, login, nazwa,
rola }` w `sessionStorage` (`KLUCZ_SESJI = "notatkirpg.sesja"`); `zapiszSesje()` czyści
też LOG admina (`KLUCZ_LOGU`, `sessionStorage`). `aplikacja/js/logowanie.js` — formularz
z `autocomplete="username"` / `"current-password"`, `submit` z `preventDefault()`; po
sukcesie `poleHaslo.value = ""`, `zapiszSesje()`, bez nawigacji (na stronie startowej
`start.js` tylko przerysowuje widok; przejście jest tylko przy powrocie do kampanii z
odnośnika). Sprawdzone skryptem Playwright na udawanym Firebase: F5 w tej samej karcie
— sesja zostaje; nowa karta i zamknięcie karty — sesji brak.

**Wariant A:**

* `sesja.js`: `WERSJA_SESJI = 4`; sesja `{ wersja, kontoId, login, nazwa, rola,
  zapamietana, wazneDo }` (`wazneDo` = znacznik czasu, np. +30 dni). `zapiszSesje(dane,
  { zapamietaj })` — `localStorage`, gdy `zapamietaj`, inaczej `sessionStorage`; zawsze
  usuwa sesję z drugiego magazynu. `pobierzSesje()` — najpierw `sessionStorage`, potem
  `localStorage`; sesja po `wazneDo` = brak sesji (i usunięcie wpisu). `wyczyscSesje()` —
  z obu magazynów. Wszystko w `try/catch` (tryb prywatny, zablokowane dane strony).
  Nigdy hasła (zasada z `AGENTS.md`).
* Wiele kart: `window.addEventListener("storage", …)` dla `KLUCZ_SESJI` → to samo co dziś
  `naZmianeSesji` (zdarzenie `storage` przychodzi tylko do **innych** kart); w
  `kampania.js` brak sesji → `doLogowania()`.
* Odświeżenie profilu przy starcie (`start.js` i `kampania.js`, przed pokazaniem treści
  albo zaraz po): `getDoc(secrets/{kontoId})` (istnieje? `PlayerName` = zapamiętany
  login?) i `getDoc(admins/{kontoId})` (aktualna `rola`, `DisplayName`); różnica →
  `wyczyscSesje()` albo aktualizacja sesji. Błąd sieci → bez wylogowania. Reguły bazy
  pozwalają na te odczyty — **bez zmian w regułach** (odczyt `secrets/{id}` jest już
  dziś potrzebny do logowania).
* Formularz: pole wyboru „Zapamiętaj mnie na tym urządzeniu” (`input.przelacznik`,
  domyślnie zaznaczone) z podpowiedzią.

**Wariant B:**

* Nie czyścić `poleHaslo` przed przejściem; po udanym logowaniu na stronie startowej
  `location.replace("index.html")` (albo do kampanii z odnośnika — jak dziś) — prawdziwa
  nawigacja to najpewniejszy sygnał udanego logowania dla menedżerów haseł.
* Chrome i Edge (`window.PasswordCredential` istnieje, strona przez HTTPS — GitHub Pages
  i `localhost` spełniają): po sukcesie
  `navigator.credentials.store(new PasswordCredential({ id: login, password: haslo, name: nazwa }))`
  (natychmiastowe okienko zapisu). Przy otwarciu strony bez sesji:
  `navigator.credentials.get({ password: true, mediation: "optional" })` → jeśli zwróci
  dane, `sprawdzLogowanie(id, password)`; przy WYLOGUJ
  `navigator.credentials.preventSilentAccess()` (żeby nie zalogowało z powrotem od razu).
  Firefox i Safari nie mają `PasswordCredential` — tylko zwykłe autouzupełnianie (sprawdzić
  `if (window.PasswordCredential)`).
* Hasło przechodzi wtedy przez kod strony (jak dziś przy porównaniu z `secrets`) — nie
  jest nigdzie zapisywane przez aplikację.

**Testy:**

* `testy/jednostkowe.mjs`: ważność sesji (`wazneDo`), wybór magazynu, odrzucenie sesji
  w starej wersji (3). Moduł `sesja.js` używa `sessionStorage`/`localStorage` — w Node
  podstawić proste obiekty zastępcze.
* `testy/e2e/uruchom.cjs`: „zapamiętaj mnie” → nowa karta i nowy kontekst z tym samym
  `localStorage` zalogowane; bez zaznaczenia → nowa karta wymaga logowania; WYLOGUJ w
  jednej karcie wylogowuje drugą; zmiana roli w udawanej bazie → po odświeżeniu nowy
  profil; zmiana `PlayerName` → wylogowanie; istniejący krok „stare sesje nie wpuszczają”
  — dopisać sesję w wersji 3. Okienek menedżera haseł nie da się sprawdzić automatycznie
  (przeglądarka testowa ich nie pokazuje) — test ręczny z rozdziału 7.
* Dokumentacja: README („Role i uprawnienia” — zdanie o logowaniu do zamknięcia karty;
  „Decyzje”), `AGENTS.md` (rozdział 4: sesja — gdzie przechowywana i jak długo).
