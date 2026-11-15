# Nazwa i kolejność kampanii — zmiana przez admina w aplikacji

Analiza z 2026-11-15. **Nic z tego nie jest wdrożone** — to materiał do decyzji.

Pytanie: czy i jak dodać do aplikacji mechanizm, dzięki któremu **admin** sam zmieni
**nazwę kampanii** i jej **miejsce na liście** „WYBIERZ KAMPANIĘ” — bez proszenia
agenta AI o zmianę plików w repozytorium.

## W skrócie

* **Da się to zrobić prosto**, w tym samym stylu, w jakim admin już dziś ukrywa i
  odsłania kampanie: aplikacja zapisuje w bazie „nadpisanie” nazwy i pozycji, a
  rejestr `kampanie.json` zostaje ustawieniem domyślnym.
* **Identyfikatora kampanii (`id`, np. `iliac`, `wzor`) nie wolno zmieniać** — pod nim
  leżą w bazie wszystkie notatki. Zmiana nazwy dotyczy tylko tego, co widać na ekranie.
* Wymaga **nowej wersji reguł bazy** (dwa nowe pola), którą trzeba wkleić w konsoli
  Firebase (instrukcja krok po kroku jak przy poprzednich zmianach).
* **Rekomendacja:** jeśli nazwy i kolejność zmieniasz rzadko (kilka razy w roku) —
  nic nie budować i poprosić agenta o zmianę `kampanie.json` (wariant A). Jeśli chcesz
  to robić sam, od ręki, np. przed sesją — **wariant B** (przyciski ▲ ▼ i „zmień
  nazwę” na liście kampanii, zapis w bazie). Warianty C i D — nie polecam.

## 1. Jak jest dziś

* **Lista kampanii** powstaje z rejestru [`kampanie.json`](../kampanie.json) (plik w
  repozytorium). **Kolejność na liście = kolejność wpisów w tym pliku.** Dlatego
  kampania „Wzór” stoi pierwsza — jest wpisana jako pierwsza.
* **Nazwa na liście** to pole `nazwa` z rejestru (pisana wielkimi literami: „▸ WZÓR”).
  Na stronie kampanii nagłówek i tytuł karty przeglądarki biorą nazwę z manifestu
  kampanii (`naglowek`, `nazwa` w `kampanie/…/kampania.json`).
* **Widoczność kampanii** admin zmienia już w aplikacji — zapisuje się w bazie, w
  dokumencie `kampanie/{id}` (pole `widoczna`). Gracze widzą zmianę od razu, bez
  odświeżania. Brak wpisu w bazie = wartość domyślna z rejestru.
* Zmiana nazwy albo kolejności wymaga dziś zmiany pliku i wypchnięcia na `main`
  (strona publikuje się po 1–2 minutach).

## 2. Co trzeba rozstrzygnąć

1. **Gdzie zapisać zmiany admina?** W pliku w repozytorium (jak dziś) czy w bazie (jak
   widoczność kampanii)?
2. **Jaka nazwa gdzie?** Tylko na liście kampanii czy także w nagłówku strony kampanii?
3. **Jak przesuwać?** Przyciski „wyżej / niżej”, przeciąganie myszą czy wpisywanie numeru?
4. **Co z nowymi kampaniami** dopisanymi później do rejestru — gdzie mają się pojawić?
5. **Jak wrócić do ustawień z rejestru** („przywróć domyślne”)?

## 3. Czego nie zmieniamy (niezależnie od wariantu)

* **Identyfikator (`id`) zostaje na zawsze.** Notatki, ustawienia map i widoczność są w
  bazie pod `kampanie/{id}/…`. „Zmiana nazwy” przez przeniesienie danych pod nowy
  identyfikator to kopiowanie wszystkich notatek — ryzykowne i niepotrzebne.
* **Folder kampanii** (`kampanie/Template`, `kampanie/Iliac`) — tylko w repozytorium;
  gracze go nie widzą (nazwa folderu nie musi pasować do nazwy kampanii).
* **Nazwa w rejestrze jest publiczna** — da się ją przeczytać w pliku `kampanie.json`.
  Nazwa zmieniona w bazie nie trafia do repozytorium, ale baza też jest do odczytania
  dla kogoś, kto umie posługiwać się narzędziami przeglądarki (rozdział
  „Bezpieczeństwo” w README). Nazwy kampanii nadal nie mogą niczego zdradzać.

## 4. Możliwe rozwiązania

### Wariant A — bez zmian w aplikacji (edycja rejestru)

**Jak działa:** jak dziś. Kolejność i nazwę zmienia się w `kampanie.json` (można
poprosić agenta AI: „przesuń kampanię X na górę listy i nazwij ją Y”). Nagłówek strony
kampanii — w jej manifeście (`naglowek`).

* **Zalety:** zero nowego kodu i zero zmian w regułach bazy; historia zmian w repozytorium.
* **Wady:** nie z poziomu aplikacji; zmiana widoczna po opublikowaniu strony (1–2 minuty);
  wymaga dostępu do repozytorium (albo agenta).
* **Nakład pracy:** brak.

### Wariant B — nadpisanie w bazie, w dokumencie kampanii (polecany, jeśli w aplikacji)

**Jak działa:** w dokumencie `kampanie/{id}` (tym samym, w którym jest już pole
`widoczna`) dochodzą dwa pola:

| Pole | Znaczenie | Brak pola |
|---|---|---|
| `nazwaWyswietlana` | nazwa kampanii nadana przez admina (do 80 znaków) | nazwa z rejestru |
| `pozycja` | miejsce na liście (liczba: 0 = pierwsza) | miejsce z rejestru |

**Co zobaczysz (admin)** na liście „WYBIERZ KAMPANIĘ”, przy każdej kampanii, obok pola
„widoczna dla graczy”: przyciski **▲** i **▼** (wyżej / niżej) oraz **✎ NAZWA** —
okienko z polem tekstowym, przyciskami **ZAPISZ**, **NAZWA Z REJESTRU** (powrót do
nazwy z pliku) i **ANULUJ**. Pod listą: **PRZYWRÓĆ KOLEJNOŚĆ Z REJESTRU**. Każda zmiana
trafia do LOGU admina, np. „Kampania „Wzór” przeniesiona wyżej.”, „Zmieniono nazwę
kampanii: „Wzór” → „Prezentacja”.”

**Co zobaczą gracze:** nową nazwę i kolejność od razu, bez odświeżania (lista już
dziś słucha zmian w bazie). Na stronie kampanii nowa nazwa w nagłówku i tytule karty.

Szczegóły zachowania:

* **Przesunięcie** zapisuje od razu pozycje **wszystkich** kampanii z rejestru (jedna
  paczka zapisów) — kolejność jest zawsze jednoznaczna, także gdy dwie osoby klikają
  naraz (wygrywa ostatnie kliknięcie).
* **Nowa kampania** dopisana później do rejestru (bez `pozycja` w bazie) pojawia się
  **na końcu listy**, dopóki admin jej nie przesunie.
* **Pusta nazwa** = powrót do nazwy z rejestru. Napis wyświetlany jak wszystkie teksty
  z bazy — wyłącznie jako zwykły tekst (bez ryzyka wstrzyknięcia kodu).
* **Kampania ukryta** przed graczami nadal nie trafia na ich stronę — ani pod starą,
  ani pod nową nazwą (jak dziś).
* **Kopia zapasowa** obejmuje dokumenty `kampanie/{id}`, więc nowe pola zapiszą się i
  przywrócą same; stare kopie (bez tych pól) przywracają się bez zmian.

* **Zalety:** wszystko z poziomu aplikacji, natychmiast, u wszystkich na żywo; ten sam
  mechanizm co widoczność kampanii (mało nowego kodu); rejestr zostaje ustawieniem
  domyślnym; łatwy powrót do ustawień z pliku.
* **Wady:** nowa wersja reguł bazy (trzeba ją wkleić w konsoli Firebase); dwa źródła
  nazwy (rejestr i baza) — w repozytorium widać nazwę „domyślną”, nie aktualną; jak
  wszystko w tej aplikacji — baza nie wie, kto pyta, więc zmienić to mógłby też ktoś z
  narzędziami przeglądarki (porządek, nie zabezpieczenie — tak samo jak widoczność).
* **Nakład pracy:** mały do średniego (ok. 200–300 wierszy kodu razem z testami).

### Wariant C — jeden wspólny dokument z ustawieniami listy

**Jak działa:** zamiast pól w dokumentach kampanii — jeden nowy dokument, np.
`aplikacja/lista`, z listą identyfikatorów w kolejności (`kolejnosc: ["wzor", "iliac"]`)
i słownikiem nazw (`nazwy: { "wzor": "Prezentacja" }`).

* **Zalety:** kolejność zapisuje się jednym zapisem; całość w jednym miejscu.
* **Wady:** nowa kolekcja w bazie — trzeba ją dopisać do reguł **i** do kopii zapasowej
  oraz przywracania (dziś kopia zna tylko `kampanie/{id}` i `admins`); reguły nie umieją
  sprawdzić każdego elementu listy. Więcej pracy niż B, bez korzyści dla użytkownika.
* **Nakład pracy:** średni.

### Wariant D — aplikacja zmienia plik `kampanie.json` w repozytorium

**Jak działa:** przycisk w aplikacji zapisuje zmiany prosto w repozytorium GitHub.

* **Wady:** wymagałby klucza dostępu do GitHuba w przeglądarce — każdy, kto otworzy
  stronę, mógłby go przejąć i zmieniać repozytorium. **Nie polecam.**

## 5. Porównanie

| | A: edycja rejestru | B: pola w dokumencie kampanii | C: wspólny dokument | D: zapis do GitHuba |
|---|---|---|---|---|
| Admin zmienia sam, w aplikacji | nie | **tak** | tak | tak |
| Zmiana widoczna od razu u wszystkich | nie (1–2 min) | **tak** | tak | nie |
| Nowe reguły bazy | nie | tak (2 pola) | tak (nowa kolekcja) | nie |
| Zmiany w kopii zapasowej | nie | nie (działa samo) | tak | nie |
| Bezpieczne | tak | tak (jak widoczność) | tak (jak widoczność) | **nie** |
| Nakład pracy | brak | mały–średni | średni | duży |

## 6. Rekomendacja

1. **Jeśli zmiany są rzadkie:** wariant **A** — nic nie budować. Kolejność i nazwę
   zmienia agent w `kampanie.json` (np. tak, jak teraz kampania „Wzór” trafiła na
   początek listy).
2. **Jeśli chcesz zmieniać sam, z aplikacji:** wariant **B** — przyciski ▲ ▼ i ✎ NAZWA
   na liście kampanii, nadpisanie w bazie, rejestr jako ustawienie domyślne, przyciski
   powrotu do ustawień z rejestru. To najmniejsza zmiana spójna z tym, jak aplikacja
   działa (tak samo jak „widoczna dla graczy”).
3. Warianty C i D — nie.

## 7. Decyzje do podjęcia (z proponowaną odpowiedzią)

1. **Budujemy mechanizm w aplikacji (B), czy zostajemy przy edycji rejestru (A)?**
   Proponuję: **A**, dopóki zmiany są rzadkie; **B**, gdy zechcesz zmieniać sam.
2. **Nowa nazwa także w nagłówku strony kampanii?** Proponuję: **tak** — jedna nazwa
   wszędzie (lista, nagłówek, tytuł karty); `naglowek` z manifestu tylko gdy admin nie
   nadał nazwy.
3. **Przesuwanie: przyciski czy przeciąganie?** Proponuję: **przyciski ▲ ▼** — działają
   tak samo na telefonie, tablecie i z klawiatury; przeciąganie na ekranie dotykowym
   łatwo pomylić z przewijaniem listy.
4. **Gdzie nowe kampanie z rejestru?** Proponuję: **na końcu listy**, dopóki admin ich
   nie przesunie.
5. **Gdzie przyciski?** Proponuję: na liście „WYBIERZ KAMPANIĘ” (tam widać kolejność);
   pole nazwy także w zakładce ADMIN kampanii, w sekcji „KAMPANIA”.

---

## Dodatek — szczegóły techniczne wariantu B (dla programisty albo agenta AI)

* **Reguły bazy** (`firebase/firestore.rules`, wersja 5): w `poprawnaKampania(d)` dopisać
  do `hasOnly` pola `nazwaWyswietlana` i `pozycja`; warunki:
  `tekstOpcjonalny(d, 'nazwaWyswietlana', 80)` i
  `(!('pozycja' in d) || (d.pozycja is int && d.pozycja >= 0 && d.pozycja < 1000))`.
  Test: `testy/reguly/test_reguly.mjs` (poprawny zapis, za długa nazwa, pozycja
  ujemna / tekstowa / ułamkowa — odrzucone). Potem instrukcja dla użytkownika:
  wklejenie reguł w konsoli Firebase (`firebase/README.md`).
* **Wspólna logika** (`aplikacja/js/sesja.js`, obok `kampaniaWidocznaDlaGraczy`):
  `nazwaKampanii(wpis, dokument)` — `dokument.nazwaWyswietlana` (niepusty tekst) albo
  `wpis.nazwa`; `kolejnoscKampanii(rejestr, dokumenty)` — najpierw kampanie z
  `pozycja` (rosnąco, przy remisie kolejność z rejestru), potem bez `pozycja` w
  kolejności z rejestru. Testy jednostkowe w `testy/jednostkowe.mjs`.
* **Zapis** (`aplikacja/js/dane.js`): `zapiszNazweKampanii(wpis, nazwa, sesja)` —
  `setDoc(…, { nazwaWyswietlana | deleteField(), zmieniono, kontoIdZmiany }, { merge: true })`;
  `zapiszKolejnoscKampanii(idWKolejnosci, sesja)` — `writeBatch` z `pozycja: i` dla
  każdej kampanii (albo `deleteField()` przy „przywróć kolejność z rejestru”).
  `writeBatch` jest już w `aplikacja/js/firebase.js` (używa go przywracanie kopii) i w
  udawanym Firebase (`testy/e2e/falszywy-firebase/`).
* **Lista** (`aplikacja/js/start.js`): `odswiezListe()` układa pozycje według
  `kolejnoscKampanii` (u admina przesunięcie elementu `li` bez przebudowy listy, żeby
  nie gubić fokusu) i podmienia tekst nazwy; przyciski ▲ ▼ ✎ tylko u admina
  (`jestAdminem`). Komunikaty przez `komunikat()` (trafiają do LOGU admina).
* **Strona kampanii** (`aplikacja/js/kampania.js`): nagłówek i `document.title` z
  `nazwaKampanii(…)`, odświeżane przy zmianie dokumentu kampanii (subskrypcja już
  istnieje: `subskrybujDokumentKampanii`); w zakładce ADMIN (`admin.js`, sekcja
  „KAMPANIA”) pole nazwy.
* **Kopia zapasowa:** bez zmian — dokument `kampanie/{id}` jest już w kopii.
* **Test e2e** (`testy/e2e/uruchom.cjs`): admin przesuwa kampanię i zmienia nazwę → u
  gracza w drugiej karcie lista zmienia się na żywo; „przywróć z rejestru” wraca do
  stanu z pliku; telefon — przyciski bez przewijania w bok.
