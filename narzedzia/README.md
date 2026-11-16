# Narzędzia

Skrypty uruchamiane z katalogu głównego repozytorium. Aplikacja działa bez nich — to
pomoc przy mapach.

| Plik | Do czego służy |
|---|---|
| `przygotuj_mape.py` | Z rysunku od MG robi mapy dla graczy w stylu Data-Slate: usuwa grupy `tylko-mg` i wszystkie arkusze `<style>` rysunku, sprawdza, czy nie zostały ślady materiału MG, wycina obszary map z manifestu, nadaje kolory motywów (zostawiając oryginalne kolory rysunku dla trybu „kolory oryginału”) i porównuje miejsca z manifestem. Wymaga tylko Pythona 3.9+. Wypisuje też miejsca do odkrycia (`widocznyDomyslnie: false`) i sprawdza grupy `data-nalezy-do`. Szczegóły: `kampanie/README.md`, wymagania wobec rysunku: `Template/Specyfikacja_rysunku_mapy.md`. |
| `podglad_mapy.cjs` | Obrazki PNG mapy (albo rysunku) we wszystkich trybach kolorów — kolory oryginału, zielony, bursztynowy, czerwony — bez uruchamiania aplikacji. Opcja `--na-start` — mapa tak, jak gracze widzą ją na początku (bez miejsc do odkrycia z manifestu). Zapisuje do `testy/e2e/wyniki/podglad/` (poza repozytorium). Wymaga pakietu `playwright` z Chromium (jak test e2e). |
| `szablon_kampanii/` | Szablon manifestu `kampania.json` dla nowej kampanii (pełny przykład: `kampanie/Template/`). |

Instrukcja rysowania map i przykładowe rysunki: folder [`Template/`](../Template/README.md).

```bash
python3 narzedzia/przygotuj_mape.py kampanie/Iliac --sprawdz   # tylko raport
python3 narzedzia/przygotuj_mape.py kampanie/Iliac             # zapis map
node narzedzia/podglad_mapy.cjs kampanie/Iliac/mapa_okolice.svg                      # podgląd w 4 trybach
node narzedzia/podglad_mapy.cjs kampanie/Iliac/mapa_okolice.svg --motywy=zielony --szerokosc=3000 --wycinek=800,500,1000,600
node narzedzia/podglad_mapy.cjs kampanie/Template/mapa_kraina.svg --na-start         # bez miejsc do odkrycia
```
