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
   `narzedzia/przygotuj_mape.py`, kroki w `kampanie/README.md` i w rozdziale
   [„Sprawdzanie rysunku w tym repozytorium”](#sprawdzanie-rysunku-w-tym-repozytorium)).

**Specyfikacja jest samodzielna** — nie odwołuje się do plików ani narzędzi tego
repozytorium, więc działa też w innym repozytorium albo w oknie rozmowy. Na jej
początku jest tabela **„Pliki”** ze ścieżkami do specyfikacji i trzech przykładów.
Przed przekazaniem dostosuj kolumnę „Gdzie jest”: w innym repozytorium wpisz właściwe
ścieżki, w rozmowie — „plik załączony w rozmowie”. Nazwy plików przykładów zostają
takie jak w `Przyklady/`.

```text
Przygotuj rysunek mapy do aplikacji NotatkiRPG. Trzymaj się dokładnie załączonej specyfikacji (Specyfikacja_rysunku_mapy.md). Załączony plik SVG to przykład poprawnie przygotowanego rysunku — wzoruj się na jego budowie, nie na treści.

Mapa: [co przedstawia, styl, proporcje, najważniejsze elementy]
Miejsca klikalne: [lista nazw]
Miejsca do odkrycia (na start zasłonięte przed graczami): [lista nazw albo „brak”]
Treść tylko dla MG (grupa tylko-mg): [co ma się w niej znaleźć albo „brak”]

Oddaj jeden plik .svg oraz listę miejsc: identyfikator, nazwa, krótki jawny opis, czy jest klikalne od początku, czy jest do odkrycia. Przed oddaniem zrób sprawdzenie z rozdziału 12 specyfikacji i przejdź listę kontrolną z rozdziału 15. Nie dodawaj miejsc, nazw ani treści fabularnych, o które nie proszę.
```

## Sprawdzanie rysunku w tym repozytorium

Tę część wykonuje agent (albo osoba) z dostępem do repozytorium NotatkiRPG — po tym,
jak gotowy rysunek trafi do folderu kampanii. Polecenia uruchamia się z katalogu
głównego repozytorium.

### 1. Sprawdzenie skryptem map (wystarczy Python 3.9+)

```bash
python3 narzedzia/przygotuj_mape.py kampanie/NazwaKampanii --sprawdz
```

Tryb `--sprawdz` niczego nie zapisuje. Inny plik rysunku niż w manifeście (dla
wszystkich map naraz) można wskazać opcją `--zrodlo ścieżka/do/pliku.svg`.
Rozdziały w kolumnie „Co zrobić” to rozdziały specyfikacji.

| Komunikat | Znaczenie | Co zrobić |
|---|---|---|
| `usunięto N grup(y) „tylko-mg”` | ile elementów MG zostało usuniętych | sprawdź, czy liczba się zgadza |
| `Mapa „…”: N element(ów) klikalnych: …` | miejsca znalezione w obszarze mapy | czy są wszystkie i tylko te, które powinny? 0 = zły format pliku albo zły obszar |
| `NOWE ELEMENTY` + JSON | miejsca z rysunku, których nie ma w manifeście | przekaż użytkownikowi do decyzji (rozdział 11) |
| `BRAK NA RYSUNKU` | miejsce z manifestu zniknęło z rysunku | przywróć grupę z tym samym identyfikatorem (notatki graczy przeszłyby do „bez miejsca na mapie”) |
| `UWAGA: … trafił na kilka map naraz` | element dotyka kilku obszarów | przesuń go albo popraw obszary (rozdział 4) |
| `UWAGA: … jest w manifeście na mapie „…”, a na rysunku na „…”` | miejsce leży w innym panelu niż wpis w manifeście | popraw rysunek albo pole `mapa` |
| `BŁĄD: … podejrzane elementy` | ślady MG poza `tylko-mg` | owiń wskazane elementy w `<g class="tylko-mg">` (rozdział 6.3) |
| `BŁĄD: Nieprawidłowy identyfikator` | zły `data-element` albo `data-nalezy-do` | popraw zgodnie z 5.2 |
| `BŁĄD: Identyfikator „…” występuje na rysunku więcej niż raz` | duplikat | nadaj unikalne identyfikatory |
| `BŁĄD: Nie da się odczytać pliku` | plik nie jest poprawnym XML | rozdział 3 (najczęściej `&nbsp;` albo niezamknięty znacznik) |
| `Do odkrycia (na start zasłonięte przed graczami): „…”` | informacja: miejsce ma w manifeście `"widocznyDomyslnie": false` (dopiski: liczba grup `data-nalezy-do`, „po odkryciu od razu klikalne”) | sprawdź, czy lista się zgadza (rozdział 5.7) |
| `BŁĄD: … data-nalezy-do="…" wskazuje miejsce, którego nie ma na tej mapie` | literówka albo grupa w innym panelu niż miejsce | popraw identyfikator albo przenieś grupę (5.8) |
| `BŁĄD: … data-nalezy-do … leży wewnątrz miejsca` / `… zawiera miejsce` / `… tylko na <g>` | zła budowa grupy | rozdział 5.8 |
| `UWAGA: „…”: pole widocznyDomyslnie (dostepnyDomyslnie) w manifeście musi mieć wartość true albo false` | np. `"nie"` zamiast `false` | popraw manifest |

Gdy raport jest czysty (bez `BŁĄD` i bez `UWAGA`), zapis map:

```bash
python3 narzedzia/przygotuj_mape.py kampanie/NazwaKampanii
```

Po każdej zmianie rysunku albo manifestu uruchom skrypt ponownie — inaczej test „mapy
aktualne względem rysunków” (`testy/test_przygotuj_mape.py`) nie przejdzie.

### 2. Podgląd mapy dla graczy

Narzędzie robi obrazki PNG we wszystkich trybach kolorów (w `testy/e2e/wyniki/podglad/`,
poza repozytorium; wymaga pakietu `playwright` jak test e2e):

```bash
node narzedzia/podglad_mapy.cjs kampanie/NazwaKampanii/mapa_okolice.svg
```

```bash
node narzedzia/podglad_mapy.cjs kampanie/NazwaKampanii/mapa_okolice.svg --szerokosc=3000 --wycinek=900,600,1000,600
```

```bash
node narzedzia/podglad_mapy.cjs kampanie/NazwaKampanii/mapa_okolice.svg --na-start
```

Oglądaj **mapę dla graczy** (`mapa_*.svg`), nie tylko rysunek — dopiero w niej widać
czcionkę aplikacji i motywy fosforu. Najpierw całość, potem fragmenty w powiększeniu
(`--szerokosc` i `--wycinek`). Sprawdź, czy wszystko jest czytelne, czy napisy mieszczą
się w kadrze i nie nachodzą na siebie i czy nic nie zdradza tajemnic. Opcja
`--na-start` pokazuje mapę bez miejsc do odkrycia (tak, jak gracze widzą ją na
początku): w zasłoniętym miejscu nie może być „dziury” ani niczego, co je zdradza.
Bez tego narzędzia: otwórz `mapa_*.svg` w przeglądarce (motyw zielony).

### 3. Testy

Na koniec testy z `AGENTS.md` (rozdział 10, „Testy”). Test
`testy/test_przygotuj_mape.py` sprawdza m.in., czy w mapach dla graczy nie ma śladów
MG, czy każde miejsce z manifestu jest na swojej mapie, czy pliki `mapa_*.svg` są
**aktualne** (takie, jakie zrobiłby teraz skrypt z rysunku i manifestu) i czy kopie w
`Przyklady/` są identyczne z rysunkami kampanii „Wzór”.

### Generatory przykładowych rysunków

Rysunki kampanii „Wzór” powstają ze skryptów `kampanie/Template/generator/*.py`
(tylko biblioteka standardowa Pythona). Wspólne funkcje są w `wspolne.py`: gładkie
krzywe, losowanie punktów w minimalnej odległości (`poisson()`), linie „odręczne”
(`drgajaca()`). Każdy generator zapisuje rysunek w `kampanie/Template/` i kopię w
`Template/Przyklady/`. Cykl pracy: generator → `przygotuj_mape.py --sprawdz` →
`przygotuj_mape.py` → `podglad_mapy.cjs` → poprawki. Nowe elementy dorysowuj bez
zmiany kolejności losowania (osobny obiekt `random.Random(…)` albo bez losowania) —
inaczej przesunie się cała reszta mapy. Sekcje z miejscami do odkrycia są w
generatorach opisane komentarzem „MIEJSCA DO ODKRYCIA”.

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
