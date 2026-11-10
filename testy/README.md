# Testy

Polecenia uruchamiaj z katalogu głównego repozytorium.

| Test | Polecenie | Wymaga |
|---|---|---|
| jednostkowe — format kopii CSV, kodowanie typów, wyszukiwanie, profile kont, widoczność kampanii | `node testy/jednostkowe.mjs` | Node 22+ |
| skrypt map i mapy graczy (bez śladów materiału MG) | `python3 -m unittest discover -s testy -p "test_*.py" -v` | Python 3.9+ |
| cała aplikacja w przeglądarce (komputer, telefony, tablet) | `node testy/e2e/uruchom.cjs` | pakiet `playwright` + Chromium |
| reguły bazy (`firebase/firestore.rules`) w emulatorze Firestore | `cd testy/reguly && npm install && npm test` | Node 20+, Java 11+ (pakiety instaluje `npm install` w tym folderze) |

Pierwsze dwa uruchamia też GitHub Actions po każdej zmianie na `main` (zakładka Actions → „Testy”).

## Test całej aplikacji (e2e)

* Działa na **udawanym Firebase** (`e2e/falszywy-firebase/`) — podstawianym w
  miejsce bibliotek z `gstatic`. Prawdziwa baza nie jest używana. Dane testowe
  (w tym konta `test-admin` / `test-skryba` / `test-gracz`) są wymyślone.
* Rejestr kampanii w teście ma dodatkowo „Kampanię próbną” (domyślnie ukrytą) —
  do sprawdzenia, że gracze widzą tylko kampanie udostępnione przez admina.
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
  notatki, ustawienia admina z widocznością zakładek, kopia i przywracanie) i sprawdza, że przechodzą, a zapisy
  niedozwolone (obce pola, za długie teksty, nieznane kolekcje — także usunięte
  `postep` i `powiazania` — zmiany kont) — nie.
* Po każdej zmianie reguł albo pól zapisywanych przez aplikację: popraw test, uruchom go,
  a potem wklej nowe reguły w konsoli Firebase (`firebase/README.md`).
