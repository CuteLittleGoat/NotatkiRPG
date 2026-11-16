# Template — wzór do pracy nad mapami

Folder dla każdego, kto **rysuje mapy** do aplikacji NotatkiRPG — człowieka albo
agenta AI, także takiego, który nie ma dostępu do repozytorium (wystarczy przekazać mu
pliki z tego folderu). Nowe mapy (także mapy kampanii Iliac, które będą rysowane od
początku) przygotowuje się według tego wzoru.

## Co tu jest

| Plik / folder | Co to jest |
|---|---|
| [`Specyfikacja_rysunku_mapy.md`](Specyfikacja_rysunku_mapy.md) | **instrukcja**: jaki plik SVG ma powstać, znaczniki (`data-element`, `tylko-mg`, `data-nalezy-do`, napisy `h`), kolory, miejsca do odkrycia, sprawdzanie, typowe błędy, lista kontrolna, praktyczne wskazówki |
| [`Przyklady/`](Przyklady/) | **przykładowe rysunki** — trzy mapy kampanii „Wzór”: `Rysunek_kraina.svg` (mapa fantasy), `Rysunek_palac.svg` (plan budynku, szkic), `Rysunek_pole_bitwy.svg` (mapa taktyczna). Każdy ma przykładową grupę `tylko-mg` i 2–3 miejsca do odkrycia |
| [`Problemy/`](Problemy/README.md) | zgłoszenia problemów z mechanizmem map (zasady niżej) |
| [`Changelog.md`](Changelog.md) | dziennik zmian wzoru: co się zmieniło, dlaczego i skąd wiadomo, że działa |

Przykłady są **kopiami** rysunków z `kampanie/Template/` (kampania „Wzór” w
aplikacji). Nie poprawiaj ich ręcznie: tworzą je generatory
`kampanie/Template/generator/*.py`, które zapisują oba miejsca naraz, a test
`testy/test_przygotuj_mape.py` sprawdza, czy kopie są identyczne z oryginałami.
Manifest pasujący do przykładów: `kampanie/Template/kampania.json`.

## Jak przekazać zadanie innemu agentowi AI

1. Dołącz pliki: `Template/Specyfikacja_rysunku_mapy.md` i jeden z rysunków z
   `Template/Przyklady/` — najbliższy charakterem mapie, którą chcesz dostać (mapa
   krainy, plan budynku albo mapa taktyczna). Duże pliki (Kraina, Pole bitwy — ok.
   300 KB) można zastąpić mniejszym planem pałacu (ok. 80 KB).
2. Wklej polecenie z ramki niżej. Miejsca w nawiasach kwadratowych `[…]` uzupełnij
   przed wysłaniem.
3. Gotowy plik wrzuć do folderu kampanii (`kampanie/NazwaKampanii/`) i poproś agenta
   w tym repozytorium o przygotowanie map dla graczy (skrypt
   `narzedzia/przygotuj_mape.py`, kroki w `kampanie/README.md`).

```text
Przygotuj rysunek mapy do aplikacji NotatkiRPG. Trzymaj się dokładnie załączonej specyfikacji (Specyfikacja_rysunku_mapy.md). Załączony plik SVG to przykład poprawnie przygotowanego rysunku — wzoruj się na jego budowie, nie na treści.

Mapa: [co przedstawia, styl, proporcje, najważniejsze elementy]
Miejsca klikalne: [lista nazw]
Miejsca do odkrycia (na start zasłonięte przed graczami): [lista nazw albo „brak”]
Treść tylko dla MG (grupa tylko-mg): [co ma się w niej znaleźć albo „brak”]

Oddaj jeden plik .svg oraz listę miejsc: identyfikator, nazwa, czy jest do odkrycia. Na koniec przejdź listę kontrolną z rozdziału 15 specyfikacji, a jeśli możesz uruchomić Pythona — także sprawdzenie z rozdziału 12. Nie dodawaj miejsc, nazw ani treści fabularnych, o które nie proszę.
```

## Zgłaszanie problemów

1. **Każdy problem z mechanizmem map zapisz w `Template/Problemy/`.** Dotyczy to:
   specyfikacji (błąd, luka, niejasność), skryptu `narzedzia/przygotuj_mape.py`,
   podglądu `narzedzia/podglad_mapy.cjs`, generatorów i przykładowych rysunków oraz
   wyświetlania map w aplikacji (`aplikacja/js/mapa.js`).
2. **Nazwa pliku to data, podkreślnik i krótki opis problemu**, np.
   `Template/Problemy/2026-11-15_Arkusz_style_poza_defs_trafial_do_map_graczy.md`.
   Data w formacie `RRRR-MM-DD`. Opis ma nazywać problem, a nie okoliczność, w której
   go zauważono.
3. Zgłoszenie podaje objaw, przyczynę (jeśli znana), sposób odtworzenia i stan.
   Jeżeli problem nie zgłasza się sam (a w mechanizmie map większość tak działa:
   skrypt nie wypisuje błędu, tylko po cichu robi coś innego), napisz wprost, po czym
   go poznać. Szablon: [`Problemy/README.md`](Problemy/README.md).
4. **Bez spoilerów:** repozytorium jest publiczne — nie przepisuj treści z materiału MG;
   opisz problem na wymyślonym przykładzie.

## Zapisywanie napraw

5. **Naprawy i zmiany wzoru zapisuje się w `Template/Changelog.md`** — od najnowszego
   wpisu: co się zmieniło, dlaczego i skąd wiadomo, że działa (test, podgląd, raport
   skryptu).
6. **Poprawki wprowadza się najpierw we wzorze** (specyfikacja, skrypt, generatory,
   przykłady), a dopiero potem w kampaniach (ponowne uruchomienie skryptu map dla
   każdej kampanii). Odwrotna kolejność sprawia, że wzór zostaje z błędem, a każda
   kolejna mapa zaczyna od niego.
7. Po naprawie uzupełnij w zgłoszeniu pole „Stan” (data, wpis w `Changelog.md`).

## Czego nie robić

8. Nie usuwaj plików z `Template/Problemy/` po naprawie — opis problemu zostaje jako
   dokumentacja.
9. Nie poprawiaj ręcznie kopii w `Przyklady/` ani plików `mapa_*.svg` w kampaniach —
   tylko generatorami i skryptem map.
10. Nie przenoś do przykładów niczego z materiału MG prawdziwych kampanii.
