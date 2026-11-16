# Wzór — kampania przykładowa (szablon i prezentacja aplikacji)

Kampania do **pokazania, jak działa aplikacja**, i **wzór do kopiowania** przy zakładaniu
nowej kampanii. Identyfikator w rejestrze i w bazie: `wzor`; w aplikacji nazywa się
**Wzór** i stoi **pierwsza** na liście kampanii (kolejność listy = kolejność wpisów w
[`kampanie.json`](../../kampanie.json)). Od początku jest **widoczna dla graczy**
(`widocznaDomyslnie: true` w rejestrze) — admin może ją ukryć jednym kliknięciem na
liście „WYBIERZ KAMPANIĘ”.

Notatki i ustawienia admina zapisują się w Firebase tak jak w każdej kampanii
(`kampanie/wzor/…`), loginy i hasła są te same co w całej aplikacji.

Ogólne zasady (konwencja rysunku, nowa wersja mapy, pola manifestu):
[`kampanie/README.md`](../README.md); wymagania wobec rysunku:
[`Template/Specyfikacja_rysunku_mapy.md`](../../Template/Specyfikacja_rysunku_mapy.md)
(rozdział 17 — praktyczne wskazówki z rysowania tych map). Kopie trzech rysunków leżą
też w [`Template/Przyklady/`](../../Template/README.md) — wzór dla agentów rysujących
mapy (generatory zapisują oba miejsca naraz; test pilnuje, żeby kopie były identyczne).

## Pliki

| Plik | Co to jest |
|---|---|
| `kampania.json` | manifest: 3 mapy, 45 miejsc (w tym 8 do odkrycia), opisy, ustawienia domyślne |
| `Rysunek_kraina.svg`, `Rysunek_palac.svg`, `Rysunek_pole_bitwy.svg` | rysunki od MG ze znacznikami — **osobny plik na każdą mapę** (w kampanii Iliac jest odwrotnie: jeden rysunek z panelami); aplikacja ich nie wczytuje |
| `mapa_kraina.svg`, `mapa_palac.svg`, `mapa_pole-bitwy.svg` | mapy dla graczy — **robi je skrypt**, nie edytuj ręcznie |
| `generator/` | skrypty Pythona, którymi narysowano trzy rysunki (las z setek drzew, góry, okopy, linie „odręczne”) — pomoc i przykład dla kolejnych map, nieobowiązkowe |

Każdy rysunek ma jedną przykładową grupę `tylko-mg` (ramka z napisem „Przykład:
notatka dla MG…”) — pokazuje, że skrypt usuwa materiał MG z map dla graczy. Nie ma w
niej żadnych tajemnic.

Mapy odtwarza polecenie (z katalogu głównego repozytorium):

```bash
python3 narzedzia/przygotuj_mape.py kampanie/Template
```

Podgląd mapy we wszystkich kolorach (obrazki PNG w `testy/e2e/wyniki/podglad/`):

```bash
node narzedzia/podglad_mapy.cjs kampanie/Template/mapa_kraina.svg
node narzedzia/podglad_mapy.cjs kampanie/Template/mapa_kraina.svg --na-start   # bez miejsc do odkrycia
```

Rysunki odtwarzają generatory (zapisują też kopie w `Template/Przyklady/`); po zmianie
generatora uruchom go, a potem skrypt map:

```bash
python3 kampanie/Template/generator/kraina.py
python3 narzedzia/przygotuj_mape.py kampanie/Template
```

## Mapy (zakładki)

Wszystkie trzy są od początku widoczne dla graczy i otwierają się w **kolorach
oryginału** (admin może zmienić kolor osobno dla każdej mapy).

| Zakładka | Styl | Rysunek (`obszar`) | Na start na telefonie |
|---|---|---|---|
| **Kraina** (`kraina`) | mapa fantasy: duże miasto, osady połączone traktami, puszcza, łańcuch górski, rzeka, jezioro | `Rysunek_kraina.svg` — `0 0 1600 1100` | miasto Wysogród |
| **Pałac** (`palac`) | szkic planu parteru w klimacie horroru (pożółkły papier w kratkę, atrament, dopiski ołówkiem) | `Rysunek_palac.svg` — `0 0 1400 1000` | hol i dziedziniec |
| **Pole bitwy** (`pole-bitwy`) | mapa taktyczna sci-fi: czołg, okopy, barykady, zasieki, leje, ruiny, lądowisko | `Rysunek_pole_bitwy.svg` — `0 0 1500 1000` | barykada drogowa |

Miejsce **Pałac Kruków** na mapie Kraina ma `mapaSzczegolowa: "palac"` — w jego karcie
jest przycisk „Otwórz mapę: Pałac” (przykład połączenia map).

## Miejsca i ustawienia początkowe

Admin może to zmienić w aplikacji w każdej chwili; tabela pokazuje stan, dopóki nic
nie zmieniono (`dostepnyDomyslnie` i `widocznyDomyslnie` w manifeście). Przy każdym
miejscu admin ma dwa pola: 👁 **widoczne** i ◈ **klikalne**.

* **Klikalne od początku** — złote narożniki, karta i notatki.
* **Widoczne, nieklikalne** — narysowane na mapie, ale wyglądają jak tło; admin
  zaznacza przy nich ◈, gdy gracze mają robić przy nich notatki.
* **Do odkrycia** — na start **zasłonięte**: gracze w ogóle ich nie widzą (ani na mapie,
  ani w indeksie); admin widzi je przygaszone i odkrywa polem 👁 (z potwierdzeniem) —
  gracze zobaczą je od razu, z napisem „Nowe odkrycie…”.

| Mapa | Klikalne od początku | Widoczne, nieklikalne | Do odkrycia (zasłonięte) |
|---|---|---|---|
| Kraina | `wysogrod`, `wilcza-wolka`, `brzezina`, `rybaki`, `palac-krukow`, `trakt-krolewski`, `trakt-wschodni`, `przelecz-wiatrow`, `puszcza-mglista`, `gory-sine`, `srebrnica`, `jezioro-ciche` | `kamieniec`, `ruiny-straznicy` | `smocza-jama` (ze ścieżką pod górami — `data-nalezy-do`), `chata-na-mokradlach`, `stara-sztolnia` |
| Pałac | `hol-wejsciowy`, `sala-balowa`, `salon-muzyczny`, `jadalnia`, `kuchnia`, `biblioteka`, `galeria-portretow`, `oranzeria`, `dziedziniec` | `gabinet`, `kaplica`, `zejscie-do-piwnic` | `przejscie-w-galerii` (ukryte przejście), `skrytka-w-bibliotece` |
| Pole bitwy | `okopy-obrony`, `okopy-wroga`, `barykada-drogowa`, `bunkier-dowodzenia`, `czolg`, `wrak-transportera`, `sklad-amunicji`, `ladowisko`, `ziemia-niczyja`, `ruiny-manufaktury` | `stanowisko-artylerii` | `pole-minowe`, `tunel-wschodni`, `stanowisko-w-ruinach` (gniazdo snajpera) |

Miejsca do odkrycia są w generatorach w sekcjach „MIEJSCA DO ODKRYCIA” — pod każdym jest
pełne tło (po zasłonięciu mapa wygląda naturalnie; sprawdzisz to opcją `--na-start`).

Na mapach są też rzeczy celowo **nieklikalne** (zwykłe tło): np. osady Młynek, Zagórze
i Dębowo, karczma, kamienny krąg, korytarze i spiżarnia pałacu, droga i wieża łączności
na polu bitwy. Pokazują, że nie wszystko, co narysowane, musi być miejscem z notatkami.

## Jak użyć tej kampanii jako wzoru

1. Skopiuj folder, np. do `kampanie/MojaKampania/` (bez folderu `generator/`, jeśli
   rysujesz inaczej).
2. W `kampania.json` zmień `id`, `nazwa`, `naglowek`, mapy i miejsca; podmień rysunki.
3. Dopisz kampanię do `kampanie.json` (miejsce na liście = kolejność wpisów).
4. Uruchom skrypt map — szczegóły: [`kampanie/README.md`](../README.md), „Nowa kampania”.
