# Narzędzia

Skrypty uruchamiane z katalogu głównego repozytorium. Wymagają tylko Pythona 3.9+
(bez dodatkowych pakietów). Aplikacja działa bez nich — to pomoc przy mapach i publikacji.

| Plik | Do czego służy |
|---|---|
| `przygotuj_mape.py` | Z rysunku od MG robi mapy dla graczy w stylu Data-Slate: usuwa grupy `tylko-mg`, sprawdza, czy nie zostały ślady materiału MG, wycina obszary map z manifestu, nadaje kolory motywów i porównuje miejsca z manifestem. Szczegóły: `Scenariusze/README.md`. |
| `zbuduj_strone.py` | Składa stronę do publikacji w folderze `_site` — tylko z dozwolonych plików (rysunki MG, narzędzia i testy zostają poza stroną). Używa go GitHub Actions. |
| `szablon_scenariusza/` | Szablon manifestu `kampania.json` dla nowego scenariusza. |

```bash
python3 narzedzia/przygotuj_mape.py Scenariusze/Iliac --sprawdz   # tylko raport
python3 narzedzia/przygotuj_mape.py Scenariusze/Iliac             # zapis map
python3 narzedzia/zbuduj_strone.py                                # podgląd tego, co trafi na stronę
```
