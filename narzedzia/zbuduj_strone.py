#!/usr/bin/env python3
"""Składa stronę do publikacji (GitHub Pages) — WYŁĄCZNIE z plików dozwolonych.

Użycie (z katalogu głównego repozytorium):

    python3 narzedzia/zbuduj_strone.py            # wynik w folderze _site
    python3 narzedzia/zbuduj_strone.py inny_folder

To NIE jest krok budowania aplikacji (aplikacja działa bez niego, wprost z plików).
Skrypt tylko kopiuje to, co ma trafić do internetu:

* index.html, kampania.html, kampanie.json,
* cały folder aplikacja/ (kod, style, grafika),
* firebase/firebase-config.js,
* dla każdej kampanii z kampanie.json: jej kampania.json (bez sekcji „zrodlo”)
  i pliki map wskazane w manifeście (mapy[].plik).

Wszystko inne — rysunki od MG, narzędzia, testy, dokumentacja — zostaje poza stroną.
Skrypt sprawdza też, czy w publikowanych mapach nie ma śladów materiału MG
(klasa „tylko-mg”, dopisek „dla MG”); jeśli są — przerywa publikację.
"""

from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path

KORZEN = Path(__file__).resolve().parent.parent
PLIKI_GLOWNE = ["index.html", "kampania.html", "kampanie.json"]
FOLDERY = ["aplikacja"]
POJEDYNCZE = ["firebase/firebase-config.js"]
SLADY_MG = re.compile(r"tylko-mg|\bdla\s+MG\b|\(MG\)", re.IGNORECASE)
BEZPIECZNA_SCIEZKA = re.compile(r"^[A-Za-z0-9_\-./ ]+$")


class BladPublikacji(Exception):
    pass


def bezpieczna(sciezka: str) -> Path:
    """Ścieżka względna wewnątrz repozytorium (bez „..”, bez ścieżek bezwzględnych)."""
    if not sciezka or not BEZPIECZNA_SCIEZKA.match(sciezka) or sciezka.startswith("/") or ".." in Path(sciezka).parts:
        raise BladPublikacji(f"Niedozwolona ścieżka: {sciezka!r}")
    return Path(sciezka)


def kopiuj(zrodlo: Path, cel: Path, wynik: Path, lista: list[str]) -> None:
    docelowy = wynik / cel
    docelowy.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(zrodlo, docelowy)
    lista.append(str(cel))


def zbuduj(wynik: Path) -> list[str]:
    if wynik.exists():
        shutil.rmtree(wynik)
    wynik.mkdir(parents=True)
    opublikowane: list[str] = []

    for nazwa in PLIKI_GLOWNE + POJEDYNCZE:
        kopiuj(KORZEN / nazwa, Path(nazwa), wynik, opublikowane)
    for folder in FOLDERY:
        for plik in sorted((KORZEN / folder).rglob("*")):
            if plik.is_file() and not plik.name.startswith("."):
                kopiuj(plik, plik.relative_to(KORZEN), wynik, opublikowane)

    rejestr = json.loads((KORZEN / "kampanie.json").read_text(encoding="utf-8"))
    for kampania in rejestr.get("kampanie", []):
        folder = bezpieczna(kampania["folder"])
        manifest = json.loads((KORZEN / folder / "kampania.json").read_text(encoding="utf-8"))
        zrodla = set()
        for mapa in manifest.get("mapy", []):
            zrodlo = mapa.pop("zrodlo", None)  # informacja dla narzędzi, nie dla strony
            if zrodlo and zrodlo.get("plik"):
                zrodla.add(str(folder / bezpieczna(zrodlo["plik"])))
            plik_mapy = folder / bezpieczna(mapa["plik"])
            if str(plik_mapy) in zrodla:
                raise BladPublikacji(f"Mapa {plik_mapy} wskazuje na rysunek MG — publikacja przerwana.")
            tresc = (KORZEN / plik_mapy).read_text(encoding="utf-8")
            if SLADY_MG.search(tresc):
                raise BladPublikacji(
                    f"W pliku {plik_mapy} są ślady materiału MG (tylko-mg / „dla MG”). "
                    "Przygotuj mapę ponownie skryptem narzedzia/przygotuj_mape.py."
                )
            kopiuj(KORZEN / plik_mapy, plik_mapy, wynik, opublikowane)
        cel_manifestu = wynik / folder / "kampania.json"
        cel_manifestu.parent.mkdir(parents=True, exist_ok=True)
        cel_manifestu.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        opublikowane.append(str(folder / "kampania.json"))
        for z in zrodla:
            if z in opublikowane:
                raise BladPublikacji(f"Rysunek MG {z} trafiłby na stronę — publikacja przerwana.")
    return opublikowane


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    wynik = Path(argv[0]) if argv else KORZEN / "_site"
    try:
        opublikowane = zbuduj(wynik)
    except (BladPublikacji, OSError, KeyError, json.JSONDecodeError) as blad:
        print(f"BŁĄD: {blad}", file=sys.stderr)
        return 1
    print(f"Strona złożona w {wynik} — {len(opublikowane)} plików:")
    for p in opublikowane:
        print(f"  {p}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
