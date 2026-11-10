# Narzędzia

Skrypty uruchamiane z katalogu głównego repozytorium. Wymagają tylko Pythona 3.9+
(bez dodatkowych pakietów). Aplikacja działa bez nich — to pomoc przy mapach.

| Plik | Do czego służy |
|---|---|
| `przygotuj_mape.py` | Z rysunku od MG robi mapy dla graczy w stylu Data-Slate: usuwa grupy `tylko-mg`, sprawdza, czy nie zostały ślady materiału MG, wycina obszary map z manifestu, nadaje kolory motywów i porównuje miejsca z manifestem. Szczegóły: `kampanie/README.md`. |
| `szablon_kampanii/` | Szablon manifestu `kampania.json` dla nowej kampanii. |

```bash
python3 narzedzia/przygotuj_mape.py kampanie/Iliac --sprawdz   # tylko raport
python3 narzedzia/przygotuj_mape.py kampanie/Iliac             # zapis map
```
