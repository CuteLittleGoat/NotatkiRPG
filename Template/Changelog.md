# Changelog — wzór do pracy nad mapami

Zmiany specyfikacji rysunku, skryptu map, podglądu, generatorów i przykładów — od
najnowszych. Każdy wpis: **co** się zmieniło, **dlaczego** i **skąd wiadomo, że działa**.
Zasady: [`README.md`](README.md).

## 2026-11-16 — miejsca do odkrycia, folder `Template/`

**Co:**

* Miejsca do odkrycia: w manifeście `elementy[].widocznyDomyslnie: false` — miejsce na
  start zasłonięte przed graczami; admin odkrywa je w aplikacji (pole 👁 obok ◈).
  Specyfikacja: nowe rozdziały 5.7 (zasady rysowania: wersja „po odkryciu”, pełne tło
  pod spodem, wszystko w grupie miejsca, jawne identyfikatory i nazwy) i 5.8.
* Nowy znacznik `<g data-nalezy-do="id-miejsca">` — grafika miejsca poza jego grupą
  (np. ścieżka pod górami), zasłaniana i odkrywana razem z nim; skrypt map sprawdza go
  (istniejące miejsce z tej samej mapy, tylko na `<g>`, nie w grupie miejsca, bez
  miejsc w środku).
* Skrypt map: lista „Do odkrycia (na start zasłonięte przed graczami)”, uwaga przy
  wartościach innych niż true/false, pole `widocznyDomyslnie` w propozycji „NOWE
  ELEMENTY”.
* Podgląd: opcja `--na-start` (mapa bez miejsc do odkrycia — sprawdzenie „dziur”).
* Przykłady: po 2–3 miejsca do odkrycia na każdej mapie kampanii „Wzór” (Smocza Jama ze
  ścieżką `data-nalezy-do`, Chata Zielarki, Stara sztolnia, Ukryte przejście, Skrytka za
  kominkiem, Pole minowe — z lejami dorysowanymi pod spodem, Tunel, Gniazdo snajpera).
* Folder `Template/`: specyfikacja przeniesiona z katalogu głównego
  (`Template/Specyfikacja_rysunku_mapy.md`), kopie przykładowych rysunków w
  `Template/Przyklady/` (generatory zapisują je razem z oryginałami), zgłoszenia w
  `Template/Problemy/`, ten dziennik. Specyfikacja przejrzana i uzupełniona (stan kodu
  z 2026-11-16).

**Dlaczego:** decyzja użytkownika po analizie `Analizy/Spoilery.md` (wariant A); folder
`Template/` — żeby innemu agentowi dało się przekazać instrukcję i przykładowy plik.

**Skąd wiadomo, że działa:** testy skryptu (`testy/test_przygotuj_mape.py`: miejsca do
odkrycia, błędy `data-nalezy-do`, wartości pól w manifeście, kopie przykładów identyczne
z oryginałami, mapy aktualne względem rysunków), test e2e (gracz nie widzi zasłoniętych
miejsc — także w chwili wczytania mapy; odkrycie na żywo), pełny przykład z rozdziału 16
sprawdzony skryptem (2 grupy `tylko-mg`, 4 + 2 miejsca, bez błędów), podglądy wszystkich
map „Wzoru” z odkrytymi i z zasłoniętymi miejscami (`--na-start`) — bez dziur.

## 2026-11-15 — kampania „Wzór”, arkusze stylów, kolory oryginału

**Co:**

* Skrypt map usuwa **każdy** arkusz `<style>` z rysunku — także w grupie, w deseniu i w
  przestrzeni nazw XHTML (wcześniej przechodził do mapy graczy — zgłoszenie
  `Problemy/2026-11-15_Arkusz_style_poza_defs_trafial_do_map_graczy.md`).
* Kampania „Wzór” (`kampanie/Template/`): trzy mapy z generatorami rysunków
  (`kampanie/Template/generator/`) — fantasy, plan pałacu, mapa taktyczna.
* Kolory: „kolory oryginału” domyślne dla map; podgląd mapy we wszystkich trybach
  (`narzedzia/podglad_mapy.cjs`).
* Specyfikacja: rozdział 17 — praktyczne wskazówki z rysowania map „Wzoru”; zasada
  szerokości napisów (znaki × `font-size` × 0,6).

**Dlaczego:** wzór i prezentacja aplikacji; przy rysowaniu wyszła luka w usuwaniu
arkuszy stylów.

**Skąd wiadomo, że działa:** test `test_arkusze_stylow_rysunku_usuwane_wszedzie`, testy
„raport bez uwag” i „mapy aktualne względem rysunków” dla każdej kampanii z rejestru,
test e2e kampanii „Wzór” (komputer, telefony, tablet).

## Wcześniej

Pierwsza wersja specyfikacji i skryptu map powstała przy kampanii Iliac — historia w
repozytorium (`git log -- narzedzia/przygotuj_mape.py`).
