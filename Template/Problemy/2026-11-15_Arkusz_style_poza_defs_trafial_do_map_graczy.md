# Arkusz `<style>` spoza `<defs>` trafiał do map graczy

**Zgłoszono:** 2026-11-15 (zapis wsteczny — problem wykryto i naprawiono przy
przygotowaniu kampanii „Wzór”, przed założeniem folderu `Template/Problemy/`)
**Dotyczy:** skrypt map — `narzedzia/przygotuj_mape.py`
**Stan:** naprawiony 2026-11-15 (commit `7458fb5`; `Template/Changelog.md`, wpis z tą datą)

## Objaw

Problem **nie zgłaszał się sam**: skrypt kończył pracę bez błędów i bez ostrzeżeń, a
w pliku `mapa_*.svg` zostawał arkusz stylów z rysunku. Poznać go było można dopiero
po zawartości pliku mapy (więcej niż jeden znacznik `<style>`) albo po skutkach w
aplikacji: mapa jest wstawiana w stronę, więc arkusz z rysunku działał na **całą
stronę** — mógł zmienić jej wygląd, a nawet ją ukryć.

## Przyczyna

Skrypt usuwał arkusze `<style>` tylko w dwóch miejscach: bezpośrednio w `<defs>` i
bezpośrednio w korzeniu `<svg>`. Arkusz schowany głębiej — w zwykłej grupie `<g>`,
w deseniu `<pattern>` albo zapisany w przestrzeni nazw XHTML — przechodził do mapy
graczy bez zmian.

## Jak odtworzyć (na wersji sprzed naprawy)

Wymyślony rysunek z arkuszem w grupie:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">
  <rect width="500" height="500" fill="#efe3c4"/>
  <g><style>body { display: none }</style></g>
  <g data-element="wieza"><title>Wieża</title>
    <circle cx="100" cy="100" r="10" fill="#2b2116"/>
    <text x="115" y="105" font-size="12">Wieża</text>
  </g>
</svg>
```

Po `python3 narzedzia/przygotuj_mape.py …` plik mapy zawierał `body { display: none }`
— po otwarciu mapy w aplikacji strona przestałaby być widoczna.

## Naprawa

Skrypt usuwa **każdy** `<style>` (oraz `<title>`, `<desc>`, `<metadata>`) w dowolnym
miejscu rysunku i w dowolnej przestrzeni nazw (funkcja `usun_znaczniki`). Z arkusza
rysunku zostaje wyłącznie kolor obwódki napisów `.h` (funkcja `kolor_obwodki`).
Specyfikacja (rozdział 7 i tabela w rozdziale 10) opisuje to wprost.

Pilnuje tego test `test_arkusze_stylow_rysunku_usuwane_wszedzie` w
`testy/test_przygotuj_mape.py` (arkusze w zwykłej grupie, w grupie miejsca klikalnego,
w deseniu i w przestrzeni nazw XHTML — w mapie zostaje tylko jeden `<style>`, ten
dopisany przez skrypt).
