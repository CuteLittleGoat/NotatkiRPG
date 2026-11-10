# Kopiec Iliac

Kampania Warhammer 40,000 / Wrath & Glory. Identyfikator w rejestrze i w bazie: `iliac`.
Ogólne zasady (konwencja rysunku, nowa wersja mapy, pola manifestu):
[`Scenariusze/README.md`](../README.md).

## Pliki

| Plik | Co to jest | Na stronie? |
|---|---|---|
| `kampania.json` | manifest: mapy, miejsca, opisy, ustawienia domyślne | tak |
| `mapa_okolice.svg` | mapa „Okolice” dla graczy (Data-Slate) — wygenerowana skryptem | tak |
| `mapa_kopiec.svg` | mapa „Kopiec” dla graczy (Data-Slate) — wygenerowana skryptem | tak |
| `Rysunki_kopca_Iliac.svg` | **rysunek od MG ze znacznikami — spoilery**; źródło dla skryptu | **nie** |
| `Rysunki_kopca_Iliac_gracze.svg` | wersja dla graczy w stylu pergaminu (od MG); aplikacja jej nie używa | nie |

Mapy odtwarza polecenie (z katalogu głównego repozytorium):

```bash
python3 narzedzia/przygotuj_mape.py Scenariusze/Iliac
```

## Mapy (zakładki)

| Zakładka | Fragment rysunku (`obszar`) | Na start dla graczy |
|---|---|---|
| **Okolice** (`okolice`) | panel A — `20 84 1160 740` | widoczna |
| **Kopiec** (`kopiec`) | panel B — `20 844 1160 810` | **ukryta** (odsłania admin) |

Panel C rysunku (przekrój) nie jest używany — w obecnej postaci to materiał MG.

## Miejsca i ustawienia początkowe

Admin może to zmienić w aplikacji w każdej chwili; tabela pokazuje stan, dopóki
nic nie zmieniono (`dostepnyDomyslnie` w manifeście).

| Mapa | Dostępne od początku | Czekają na zaznaczenie przez admina |
|---|---|---|
| Okolice | `kopiec-iliac`, `ocean-sciekow`, `droga-wybrzeza`, `trakt` | `kanion-gorniczy`, `szkielet-karnozaura`, `brassyl` |
| Kopiec | `zatoka`, `iglica-daggerfall`, `dzielnica-smoka`, `iglica-sentinel`, `iglica-wayrest`, `port-sw-betony`, `iglica-cumownicza`, `szprychy`, `wieza-chlodnicy` | `wrothgar`, `balfiera`, `hala-cryngaine`, `reich-gradkeep`, `menevia`, `cybiades`, `woodborne-hall`, `orsinium` |

Miejsce `kopiec-iliac` doszło w rysunku ze znacznikami (nie było go na liście w
poleceniu). W karcie tego miejsca jest przycisk „Otwórz mapę: Kopiec”, gdy
zakładka Kopiec jest dostępna.

Opisy miejsc w manifeście są robocze i minimalne — do uzupełnienia.
