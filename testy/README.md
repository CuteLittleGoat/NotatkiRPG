# Testy

Polecenia uruchamiaj z katalogu głównego repozytorium.

| Test | Polecenie | Wymaga |
|---|---|---|
| jednostkowe — format kopii CSV, kodowanie typów, wyszukiwanie, profile kont, sesja (zapamiętane logowanie), widoczność kampanii, domyślne kolory map i interfejsu, pola miejsc „widoczne” i „klikalne” | `node testy/jednostkowe.mjs` | Node 22+ |
| skrypt map i mapy graczy wszystkich kampanii z rejestru (bez śladów materiału MG, zgodne z manifestem, aktualne względem rysunków), miejsca do odkrycia i `data-nalezy-do`, kopie przykładów w `Template/Przyklady/` | `python3 -m unittest discover -s testy -p "test_*.py" -v` | Python 3.9+ |
| cała aplikacja w przeglądarce (komputer, telefony, tablet) | `node testy/e2e/uruchom.cjs` | pakiet `playwright` + Chromium |
| reguły bazy (`firebase/firestore.rules`) w emulatorze Firestore | `cd testy/reguly && npm install && npm test` | Node 20+, Java 11+ (pakiety instaluje `npm install` w tym folderze) |

Pierwsze dwa uruchamia też GitHub Actions po każdej zmianie na `main` (zakładka Actions → „Testy”).

## Test całej aplikacji (e2e)

* Działa na **udawanym Firebase** (`e2e/falszywy-firebase/`) — podstawianym w
  miejsce bibliotek z `gstatic`. Prawdziwa baza nie jest używana. Dane testowe
  (w tym konta `test-admin` / `test-edytor` / `test-gracz`) są wymyślone. Ich
  `DisplayName` są celowo mylące (np. konto do przeglądania nazywa się „Skryba”) —
  test sprawdza, że uprawnienia wynikają tylko z pola `rola` w `admins`.
* Rejestr kampanii w teście to prawdziwy `kampanie.json` (Wzór, Kopiec Iliac) i
  dodatkowo „Kampania próbna” (domyślnie ukryta) — do sprawdzenia, że gracze widzą tylko
  kampanie udostępnione przez admina, w kolejności z rejestru.
* Kampania Wzór: trzy mapy w kolorach oryginału, miejsca dostępne i ukryte, przejście do
  mapy szczegółowej, brak materiału MG; na telefonach i tablecie — pole bitwy bez
  przewijania w bok i stuknięcie w czołg.
* Logowanie: pomocnik `zaloguj()` domyślnie **odznacza** „Zapamiętaj mnie” (sesja tylko w
  karcie), bo testy mają w jednej przeglądarce karty zalogowane na różne konta, a
  zapamiętane logowanie jest wspólne dla wszystkich kart. Zapamiętanie sprawdza osobna
  część „[zapamiętane logowanie]” (nowa karta, ponowne uruchomienie przeglądarki przez
  `storageState`, wygasanie, WYLOGUJ we wszystkich kartach, zmiana roli i loginu w
  udawanej bazie). Przeglądarka testowa nie ma menedżera haseł — kroki „Chrome i Edge”
  podstawiają udawany `navigator.credentials` (hasła testowe są wymyślone), a krok
  „Firefox i Safari” usuwa `PasswordCredential`. Ten krok przerywa też pierwsze
  wczytanie `kampanie.json` po zalogowaniu (tak robi przeglądarka, gdy strona przechodzi
  na nowy adres) i pilnuje, żeby nawet na chwilę nie pojawił się czerwony napis
  „Nie udało się wczytać listy kampanii”.
* Indeks: na zakładce mapy — tylko miejsca tej mapy (admin: z polami wyboru), na zakładce
  Notatki — miejsca wszystkich map (przycisk INDEKS w nagłówku Notatek); wybór miejsca
  z indeksu otwiera jego mapę. Na telefonach i tablecie — indeks na Notatkach bez
  przewijania w bok.
* Miejsca do odkrycia (kampania Wzór, osobna karta Gracza): gracz nie widzi zasłoniętych
  miejsc — skrypt w karcie (`MutationObserver`) zapisuje, czy któreś choć na chwilę
  trafiło na stronę bez zasłony; admin widzi je przygaszone, ◈ nieaktywne; odkrycie z
  potwierdzeniem (i ANULUJ) działa na żywo, z napisem i mruganiem u gracza; zasłonięcie
  odznacza ◈; podgląd gracza; przyciski zbiorcze nie odkrywają; „PRZYWRÓĆ DOMYŚLNE”.
  **Uwaga przy pisaniu testów:** przyciski indeksu też mają atrybut `data-element` —
  miejsce na mapie wskazuj selektorem `.plansza svg [data-element="…"]`.
* Serwer plików: `e2e/serwer.cjs` (można go uruchomić osobno: `node testy/e2e/serwer.cjs 8000`).
* Zrzuty ekranu i pobrane w teście pliki kopii: `e2e/wyniki/` (nie trafiają do repozytorium).
* `CZCIONKI=1 node testy/e2e/uruchom.cjs` — z prawdziwymi czcionkami z Google Fonts
  (ładniejsze zrzuty; wymaga internetu).
* Instalacja Playwright, jeśli go nie ma: `npm i -D playwright && npx playwright install chromium`
  (w folderze poza repozytorium albo bez zapisywania `node_modules` w repozytorium).

## Test reguł bazy (`reguly/`)

* Uruchamia lokalny **emulator Firestore** w trybie „demo” — nie łączy się z prawdziwym
  projektem. Przy pierwszym uruchomieniu pobiera emulator (ok. 60 MB).
* Odtwarza dokładnie zapisy aplikacji (logowanie, lista i widoczność kampanii,
  notatki, ustawienia admina z widocznością zakładek, odkrywanie i zasłanianie miejsc,
  kopia i przywracanie) i sprawdza, że przechodzą, a zapisy
  niedozwolone (obce pola, za długie teksty, nieznane kolekcje — także usunięte
  `postep` i `powiazania` — zmiany kont) — nie.
* Po każdej zmianie reguł albo pól zapisywanych przez aplikację: popraw test, uruchom go,
  a potem wklej nowe reguły w konsoli Firebase (`firebase/README.md`).
