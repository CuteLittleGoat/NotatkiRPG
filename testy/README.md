# Testy

Polecenia uruchamiaj z katalogu głównego repozytorium.

| Test | Polecenie | Wymaga |
|---|---|---|
| jednostkowe — format kopii CSV, kodowanie typów, wyszukiwanie | `node testy/jednostkowe.mjs` | Node 22+ |
| skrypty map i publikacji | `python3 -m unittest discover -s testy -p "test_*.py" -v` | Python 3.9+ |
| cała aplikacja w przeglądarce (komputer, telefony, tablet) | `node testy/e2e/uruchom.cjs` | pakiet `playwright` + Chromium |

Pierwsze dwa uruchamia też GitHub Actions przed każdą publikacją strony.

## Test całej aplikacji (e2e)

* Działa na **udawanym Firebase** (`e2e/falszywy-firebase/`) — podstawianym w
  miejsce bibliotek z `gstatic`. Prawdziwa baza nie jest używana. Dane testowe
  (w tym konta `test-admin` / `test-gracz`) są wymyślone.
* Serwer plików: `e2e/serwer.cjs` (można go uruchomić osobno: `node testy/e2e/serwer.cjs 8000`).
* Zrzuty ekranu i pobrane w teście pliki kopii: `e2e/wyniki/` (nie trafiają do repozytorium).
* `CZCIONKI=1 node testy/e2e/uruchom.cjs` — z prawdziwymi czcionkami z Google Fonts
  (ładniejsze zrzuty; wymaga internetu).
* Instalacja Playwright, jeśli go nie ma: `npm i -D playwright && npx playwright install chromium`
  (w folderze poza repozytorium albo bez zapisywania `node_modules` w repozytorium).
