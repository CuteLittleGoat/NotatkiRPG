#!/usr/bin/env python3
"""Przygotowanie map dla graczy z rysunku Mistrza Gry.

Użycie (z katalogu głównego repozytorium):

    python3 narzedzia/przygotuj_mape.py kampanie/Iliac             # mapy według kampanie/Iliac/kampania.json
    python3 narzedzia/przygotuj_mape.py kampanie/Iliac --sprawdz   # tylko sprawdza, niczego nie zapisuje

Konwencja rysunku od MG (szczegóły: kampanie/README.md):

* miejsce klikalne:      <g data-element="id-miejsca"> ... </g>
* treść tylko dla MG:    <g class="tylko-mg"> ... </g>

Skrypt:

1. usuwa wszystkie grupy „tylko-mg”, komentarze i opisy rysunku,
2. sprawdza, czy nie zostało nic podejrzanego (dopisek „dla MG”, czerwone linie
   przerywane) — jeśli tak, przerywa pracę,
3. wycina obszar każdej mapy z manifestu (mapy[].zrodlo.obszar),
4. przemalowuje rysunek na styl Data-Slate (fosfor na ciemnym tle; osobne kolory
   dla każdego motywu — aplikacja przełącza je klasą „motyw-…”),
5. zapisuje pliki map (mapy[].plik) i porównuje elementy z manifestem.

Skrypt NIGDY nie wypisuje treści usuniętych ani podejrzanych fragmentów —
podaje tylko ich liczbę i położenie, żeby nie zdradzać spoilerów osobie,
która go uruchamia.

Wymaga wyłącznie Pythona 3.9+ (biblioteka standardowa).
"""

from __future__ import annotations

import argparse
import copy
import json
import math
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

SVG_NS = "http://www.w3.org/2000/svg"
XLINK_NS = "http://www.w3.org/1999/xlink"
ET.register_namespace("", SVG_NS)
ET.register_namespace("xlink", XLINK_NS)

# ---------------------------------------------------------------------------
# Motywy ekranu. Te same nazwy i kolory są w aplikacja/css/slate.css
# (zmienne --tlo i --fosfor). Dodanie motywu = wpis tutaj + w CSS
# + ponowne uruchomienie skryptu dla każdej kampanii.
# ---------------------------------------------------------------------------
MOTYWY = {
    "zielony": {"tlo": "#020b05", "fosfor": "#6cf58c"},
    "bursztynowy": {"tlo": "#0d0702", "fosfor": "#ffb347"},
}
MOTYW_DOMYSLNY = "zielony"

# Jasność wypełnień: małe kształty (ikony, „tusz”) świecą pełną mocą,
# duże plamy (morze, teren) są przygaszone, żeby nie oślepiały.
WYPELNIENIE_MAX_DUZE = 0.40
POLE_MALE = 300.0  # jednostek² — do tej wielkości kształt traktujemy jak tusz
POLE_DUZE = 40000.0  # od tej wielkości — jak plama terenu
TEKSTURA = 0.55  # przygaszenie wzorów (kreskowanie, kropki) w <pattern>

ZNACZNIKI_GRAFIKI = {"rect", "circle", "ellipse", "line", "polyline", "polygon", "path", "text", "image", "use"}
WLASCIWOSCI_KOLORU = ("fill", "stroke", "stop-color")


class BladPrzygotowania(Exception):
    """Błąd, po którym skrypt kończy pracę bez zapisywania plików."""


# ---------------------------------------------------------------------------
# Pomocnicze
# ---------------------------------------------------------------------------
def lokalna(tag) -> str:
    if not isinstance(tag, str):
        return ""
    return tag.split("}", 1)[1] if "}" in tag else tag


def klasy(el) -> list[str]:
    return (el.get("class") or "").split()


def dodaj_klase(el, nazwa: str) -> None:
    obecne = klasy(el)
    if nazwa not in obecne:
        obecne.append(nazwa)
    el.set("class", " ".join(obecne))


def liczba(tekst, domyslna=0.0) -> float:
    if tekst is None:
        return domyslna
    m = re.match(r"\s*(-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)", str(tekst))
    return float(m.group(1)) if m else domyslna


def styl_na_slownik(styl: str | None) -> dict[str, str]:
    wynik: dict[str, str] = {}
    for kawalek in (styl or "").split(";"):
        if ":" in kawalek:
            k, v = kawalek.split(":", 1)
            wynik[k.strip()] = v.strip()
    return wynik


def slownik_na_styl(slownik: dict[str, str]) -> str:
    return ";".join(f"{k}:{v}" for k, v in slownik.items())


def wlasciwosc(el, nazwa: str) -> str | None:
    """Wartość właściwości z atrybutu albo z atrybutu style (style ma pierwszeństwo)."""
    styl = styl_na_slownik(el.get("style"))
    if nazwa in styl:
        return styl[nazwa]
    return el.get(nazwa)


def usun_wlasciwosc(el, nazwa: str) -> None:
    if nazwa in el.attrib:
        del el.attrib[nazwa]
    if el.get("style"):
        styl = styl_na_slownik(el.get("style"))
        if nazwa in styl:
            del styl[nazwa]
            if styl:
                el.set("style", slownik_na_styl(styl))
            else:
                del el.attrib["style"]


# ---------------------------------------------------------------------------
# Kolory
# ---------------------------------------------------------------------------
NAZWANE_KOLORY = {
    "black": (0, 0, 0),
    "white": (255, 255, 255),
    "red": (255, 0, 0),
    "green": (0, 128, 0),
    "blue": (0, 0, 255),
    "gray": (128, 128, 128),
    "grey": (128, 128, 128),
    "silver": (192, 192, 192),
    "maroon": (128, 0, 0),
    "darkred": (139, 0, 0),
    "crimson": (220, 20, 60),
    "firebrick": (178, 34, 34),
    "brown": (165, 42, 42),
    "orange": (255, 165, 0),
    "yellow": (255, 255, 0),
}


def parsuj_kolor(wartosc: str | None):
    """Zwraca (r, g, b) w zakresie 0–255 albo None, gdy to nie kolor (none, url(...), itp.)."""
    if wartosc is None:
        return None
    w = wartosc.strip().lower()
    if not w or w in ("none", "transparent", "inherit", "currentcolor") or w.startswith("url("):
        return None
    if w.startswith("#"):
        h = w[1:]
        if len(h) in (3, 4):
            return tuple(int(c * 2, 16) for c in h[:3])
        if len(h) in (6, 8):
            return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))
        return None
    m = re.match(r"rgba?\(\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?", w)
    if m:
        return tuple(min(255, int(float(x))) for x in m.groups())
    return NAZWANE_KOLORY.get(w)


def intensywnosc(rgb) -> float:
    """„Ile tuszu”: 1 = czarny tusz (świeci pełną mocą), 0 = jasny papier (tło)."""
    def liniowy(c: float) -> float:
        c /= 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = rgb
    y = 0.2126 * liniowy(r) + 0.7152 * liniowy(g) + 0.0722 * liniowy(b)
    f = y ** (1 / 3) if y > 216 / 24389 else (24389 / 27 * y + 16) / 116
    jasnosc = (116 * f - 16) / 100
    return max(0.0, min(1.0, (1.0 - jasnosc - 0.05) / 0.70))


def czy_czerwony(rgb) -> bool:
    r, g, b = (c / 255.0 for c in rgb)
    mx, mn = max(r, g, b), min(r, g, b)
    if mx < 0.35 or mx - mn < 0.25 or mx != r:
        return False
    odcien = ((g - b) / (mx - mn)) * 60.0
    return -20.0 <= odcien <= 15.0


def mieszaj(tlo: str, fosfor: str, udzial: float) -> str:
    t = parsuj_kolor(tlo)
    f = parsuj_kolor(fosfor)
    wynik = (round(t[i] + (f[i] - t[i]) * udzial) for i in range(3))
    return "#" + "".join(f"{c:02x}" for c in wynik)


def skala_wypelnienia(pole: float | None) -> float:
    if pole is None:
        return WYPELNIENIE_MAX_DUZE
    if pole <= POLE_MALE:
        return 1.0
    if pole >= POLE_DUZE:
        return WYPELNIENIE_MAX_DUZE
    t = (math.log10(pole) - math.log10(POLE_MALE)) / (math.log10(POLE_DUZE) - math.log10(POLE_MALE))
    t = t * t * (3 - 2 * t)
    return 1.0 - (1.0 - WYPELNIENIE_MAX_DUZE) * t


# ---------------------------------------------------------------------------
# Geometria (zgrubne prostokąty otaczające — wystarczą do przydziału do obszaru)
# ---------------------------------------------------------------------------
def mnoz(a, b):
    a1, b1, c1, d1, e1, f1 = a
    a2, b2, c2, d2, e2, f2 = b
    return (
        a1 * a2 + c1 * b2,
        b1 * a2 + d1 * b2,
        a1 * c2 + c1 * d2,
        b1 * c2 + d1 * d2,
        a1 * e2 + c1 * f2 + e1,
        b1 * e2 + d1 * f2 + f1,
    )


JEDNOSTKOWA = (1.0, 0.0, 0.0, 1.0, 0.0, 0.0)


def parsuj_transform(tekst: str | None):
    m = JEDNOSTKOWA
    if not tekst:
        return m
    for nazwa, argumenty in re.findall(r"(\w+)\s*\(([^)]*)\)", tekst):
        a = [float(x) for x in re.findall(r"-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?", argumenty)]
        if nazwa == "matrix" and len(a) == 6:
            t = tuple(a)
        elif nazwa == "translate":
            t = (1, 0, 0, 1, a[0] if a else 0, a[1] if len(a) > 1 else 0)
        elif nazwa == "scale":
            sx = a[0] if a else 1
            sy = a[1] if len(a) > 1 else sx
            t = (sx, 0, 0, sy, 0, 0)
        elif nazwa == "rotate":
            kat = math.radians(a[0] if a else 0)
            cos, sin = math.cos(kat), math.sin(kat)
            obrot = (cos, sin, -sin, cos, 0, 0)
            if len(a) >= 3:
                cx, cy = a[1], a[2]
                t = mnoz(mnoz((1, 0, 0, 1, cx, cy), obrot), (1, 0, 0, 1, -cx, -cy))
            else:
                t = obrot
        elif nazwa == "skewX":
            t = (1, 0, math.tan(math.radians(a[0] if a else 0)), 1, 0, 0)
        elif nazwa == "skewY":
            t = (1, math.tan(math.radians(a[0] if a else 0)), 0, 1, 0, 0)
        else:
            continue
        m = mnoz(m, t)
    return m


def punkty_sciezki(d: str) -> list[tuple[float, float]]:
    """Punkty (z punktami kontrolnymi) ścieżki SVG — do zgrubnego prostokąta otaczającego."""
    tokeny = re.findall(r"[MmLlHhVvCcSsQqTtAaZz]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?", d or "")
    punkty: list[tuple[float, float]] = []
    i = 0
    x = y = 0.0
    sx = sy = 0.0
    komenda = None
    ile = {"m": 2, "l": 2, "h": 1, "v": 1, "c": 6, "s": 4, "q": 4, "t": 2, "a": 7, "z": 0}
    while i < len(tokeny):
        tok = tokeny[i]
        if re.match(r"[A-Za-z]", tok):
            komenda = tok
            i += 1
            if komenda in "Zz":
                x, y = sx, sy
                punkty.append((x, y))
                continue
        if komenda is None:
            i += 1
            continue
        n = ile[komenda.lower()]
        arg = []
        while len(arg) < n and i < len(tokeny) and not re.match(r"[A-Za-z]", tokeny[i]):
            arg.append(float(tokeny[i]))
            i += 1
        if len(arg) < n:
            break
        wzgledna = komenda.islower()
        k = komenda.lower()
        if k == "h":
            x = x + arg[0] if wzgledna else arg[0]
        elif k == "v":
            y = y + arg[0] if wzgledna else arg[0]
        elif k == "a":
            nx = x + arg[5] if wzgledna else arg[5]
            ny = y + arg[6] if wzgledna else arg[6]
            rx, ry = abs(arg[0]), abs(arg[1])
            sxm, sym = (x + nx) / 2, (y + ny) / 2
            punkty.extend([(sxm - rx, sym - ry), (sxm + rx, sym + ry)])
            x, y = nx, ny
        else:
            pary = [(arg[j], arg[j + 1]) for j in range(0, n, 2)]
            for px, py in pary:
                punkty.append((x + px, y + py) if wzgledna else (px, py))
            ox, oy = pary[-1]
            x, y = (x + ox, y + oy) if wzgledna else (ox, oy)
        punkty.append((x, y))
        if k == "m":
            sx, sy = x, y
            komenda = "l" if wzgledna else "L"
    return punkty


def punkty_listy(tekst: str | None) -> list[tuple[float, float]]:
    liczby = [float(v) for v in re.findall(r"-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?", tekst or "")]
    return [(liczby[i], liczby[i + 1]) for i in range(0, len(liczby) - 1, 2)]


def prostokat_punktow(punkty, m):
    if not punkty:
        return None
    pts = [(m[0] * px + m[2] * py + m[4], m[1] * px + m[3] * py + m[5]) for px, py in punkty]
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return (min(xs), min(ys), max(xs), max(ys))


def polacz(a, b):
    if a is None:
        return b
    if b is None:
        return a
    return (min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3]))


def rozmiar_czcionki(el, odziedziczony: float) -> float:
    styl = styl_na_slownik(el.get("style"))
    if "font-size" in styl:
        return liczba(styl["font-size"], odziedziczony)
    if el.get("font-size"):
        return liczba(el.get("font-size"), odziedziczony)
    return odziedziczony


def prostokat_otaczajacy(el, m=JEDNOSTKOWA, czcionka=16.0):
    """Zgrubny prostokąt otaczający (x1, y1, x2, y2) w układzie rysunku albo None."""
    tag = lokalna(el.tag)
    if tag in ("defs", "style", "title", "desc", "metadata", "clipPath", "mask", "pattern", "marker", "symbol"):
        return None
    m = mnoz(m, parsuj_transform(el.get("transform")))
    czcionka = rozmiar_czcionki(el, czcionka)
    if tag in ("g", "a", "svg", "switch"):
        wynik = None
        for dziecko in el:
            wynik = polacz(wynik, prostokat_otaczajacy(dziecko, m, czcionka))
        return wynik
    if tag in ("rect", "image"):
        x, y = liczba(el.get("x")), liczba(el.get("y"))
        w, h = liczba(el.get("width")), liczba(el.get("height"))
        return prostokat_punktow([(x, y), (x + w, y), (x, y + h), (x + w, y + h)], m)
    if tag == "circle":
        cx, cy, r = liczba(el.get("cx")), liczba(el.get("cy")), liczba(el.get("r"))
        return prostokat_punktow([(cx - r, cy - r), (cx + r, cy + r), (cx - r, cy + r), (cx + r, cy - r)], m)
    if tag == "ellipse":
        cx, cy = liczba(el.get("cx")), liczba(el.get("cy"))
        rx, ry = liczba(el.get("rx")), liczba(el.get("ry"))
        return prostokat_punktow([(cx - rx, cy - ry), (cx + rx, cy + ry), (cx - rx, cy + ry), (cx + rx, cy - ry)], m)
    if tag == "line":
        return prostokat_punktow(
            [(liczba(el.get("x1")), liczba(el.get("y1"))), (liczba(el.get("x2")), liczba(el.get("y2")))], m
        )
    if tag in ("polyline", "polygon"):
        return prostokat_punktow(punkty_listy(el.get("points")), m)
    if tag == "path":
        return prostokat_punktow(punkty_sciezki(el.get("d")), m)
    if tag == "text":
        x, y = liczba(el.get("x")), liczba(el.get("y"))
        tekst = "".join(el.itertext())
        szer = len(tekst) * czcionka * 0.55 + liczba(el.get("letter-spacing")) * len(tekst)
        kotwica = el.get("text-anchor") or styl_na_slownik(el.get("style")).get("text-anchor", "start")
        if kotwica == "middle":
            x1 = x - szer / 2
        elif kotwica == "end":
            x1 = x - szer
        else:
            x1 = x
        return prostokat_punktow([(x1, y - czcionka), (x1 + szer, y - czcionka), (x1, y + czcionka * 0.3), (x1 + szer, y + czcionka * 0.3)], m)
    return None


def przecina(a, b) -> bool:
    return a is not None and b is not None and a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]


# ---------------------------------------------------------------------------
# Etapy przetwarzania
# ---------------------------------------------------------------------------
def wczytaj_svg(sciezka: Path):
    # Domyślny parser ElementTree pomija komentarze i instrukcje przetwarzania —
    # komentarze w rysunku MG mogą zawierać notatki, więc to pożądane.
    try:
        return ET.parse(sciezka).getroot()
    except ET.ParseError as blad:
        raise BladPrzygotowania(f"Nie da się odczytać pliku {sciezka}: {blad}") from blad


def usun_tylko_mg(korzen) -> int:
    usuniete = 0
    for rodzic in list(korzen.iter()):
        for dziecko in list(rodzic):
            if "tylko-mg" in klasy(dziecko):
                rodzic.remove(dziecko)
                usuniete += 1
    return usuniete


WZOR_MG = re.compile(r"(\bdla\s+MG\b|\(MG\)|\bMG\s*:|\bspoiler)", re.IGNORECASE)


def kontrola_bezpieczenstwa(korzen) -> list[str]:
    """Szuka śladów materiału MG. Zwraca opisy problemów BEZ treści elementów."""
    problemy = []
    for nr, el in enumerate(korzen.iter()):
        tag = lokalna(el.tag)
        if not tag:
            continue
        teksty = [el.text or "", el.tail or ""] + [v for k, v in el.attrib.items() if k not in ("d", "points", "transform")]
        if any(WZOR_MG.search(t) for t in teksty):
            problemy.append(f"element nr {nr} <{tag}>: dopisek wskazujący na materiał MG")
        if any("mg" == k.lower() or k.lower().endswith("-mg") or k.lower().startswith("mg-") for k in klasy(el)):
            problemy.append(f"element nr {nr} <{tag}>: klasa sugerująca materiał MG")
        kreska = wlasciwosc(el, "stroke-dasharray")
        kolor = parsuj_kolor(wlasciwosc(el, "stroke"))
        if kreska and kreska.strip() not in ("none", "0") and kolor and czy_czerwony(kolor):
            problemy.append(f"element nr {nr} <{tag}>: czerwona linia przerywana (w legendzie MG oznacza wiedzę ukrytą)")
    return problemy


def odczytaj_elementy(korzen) -> dict[str, dict]:
    """Elementy klikalne: id → {tytul, prostokat}."""
    elementy: dict[str, dict] = {}
    for el in korzen.iter():
        ident = el.get("data-element")
        if ident is None:
            continue
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", ident):
            raise BladPrzygotowania(
                f"Nieprawidłowy identyfikator data-element=\"{ident}\" — dozwolone: małe litery bez polskich znaków, cyfry i myślniki."
            )
        if ident in elementy:
            raise BladPrzygotowania(f"Identyfikator „{ident}” występuje na rysunku więcej niż raz.")
        tytul_el = next((d for d in el if lokalna(d.tag) == "title"), None)
        elementy[ident] = {
            "tytul": "".join(tytul_el.itertext()).strip() if tytul_el is not None else "",
            "prostokat": prostokat_otaczajacy(el),
        }
    return elementy


def wytnij_obszar(korzen, obszar):
    """Kopia rysunku tylko z tymi elementami najwyższego poziomu, które przecinają obszar."""
    x, y, w, h = obszar
    ramka = (x, y, x + w, y + h)
    kopia = copy.deepcopy(korzen)
    for dziecko in list(kopia):
        tag = lokalna(dziecko.tag)
        if tag in ("defs", "style"):
            continue
        if tag in ("title", "desc", "metadata"):
            kopia.remove(dziecko)
            continue
        if not przecina(prostokat_otaczajacy(dziecko), ramka):
            kopia.remove(dziecko)
    return kopia


def odwolania(el) -> set[str]:
    wynik = set()
    for k, v in el.attrib.items():
        wynik.update(re.findall(r"url\(\s*#([^)\s]+)\s*\)", v))
        if lokalna(k) == "href" and v.startswith("#"):
            wynik.add(v[1:])
    return wynik


def usun_nieuzywane_definicje(korzen) -> None:
    """Usuwa gradienty, wzory i znaczniki, do których nic się nie odwołuje."""
    while True:
        definicje = {}
        for defs in korzen.iter(f"{{{SVG_NS}}}defs"):
            for d in defs:
                if d.get("id"):
                    definicje[d.get("id")] = (defs, d)
        uzywane = set()
        for el in korzen.iter():
            uzywane |= odwolania(el)
        nieuzywane = [i for i in definicje if i not in uzywane]
        if not nieuzywane:
            return
        for i in nieuzywane:
            rodzic, d = definicje[i]
            rodzic.remove(d)


def dodaj_przedrostek_id(korzen, przedrostek: str) -> None:
    mapa = {}
    for el in korzen.iter():
        if el.get("id"):
            nowe = f"{przedrostek}-{el.get('id')}"
            mapa[el.get("id")] = nowe
            el.set("id", nowe)
    if not mapa:
        return
    for el in korzen.iter():
        for k, v in list(el.attrib.items()):
            if "url(" in v:
                el.set(k, re.sub(r"url\(\s*#([^)\s]+)\s*\)", lambda m: f"url(#{mapa.get(m.group(1), m.group(1))})", v))
            elif lokalna(k) == "href" and v.startswith("#") and v[1:] in mapa:
                el.set(k, "#" + mapa[v[1:]])


class Przemalowanie:
    """Zamienia kolory rysunku na klasy Data-Slate i zbiera użyte poziomy jasności."""

    def __init__(self):
        self.poziomy = {"f": set(), "s": set(), "c": set()}

    def klasa(self, rodzaj: str, udzial: float) -> str:
        poziom = max(0, min(100, int(round(udzial * 100))))
        self.poziomy[rodzaj].add(poziom)
        return f"ds-{rodzaj}{poziom}"

    def przemaluj(self, el, wypelnienie=None, kontur=None, w_teksturze=False, czcionka=16.0):
        tag = lokalna(el.tag)
        if not tag:
            return
        usun_wlasciwosc(el, "font-family")
        czcionka = rozmiar_czcionki(el, czcionka)
        if tag == "pattern":
            w_teksturze = True

        wlasne_w = wlasciwosc(el, "fill")
        wlasne_k = wlasciwosc(el, "stroke")
        if wlasne_w is not None:
            wypelnienie = wlasne_w
        if wlasne_k is not None:
            kontur = wlasne_k

        if tag == "stop":
            kolor = parsuj_kolor(wlasciwosc(el, "stop-color"))
            usun_wlasciwosc(el, "stop-color")
            if kolor is not None:
                dodaj_klase(el, self.klasa("c", intensywnosc(kolor) * WYPELNIENIE_MAX_DUZE * (TEKSTURA if w_teksturze else 1)))
            return

        if tag in ZNACZNIKI_GRAFIKI:
            mnoznik = TEKSTURA if w_teksturze else 1.0
            # Wypełnienie: domyślnie czarne (jak w SVG), chyba że ustawiono inaczej.
            efektywne_w = wypelnienie if wypelnienie is not None else "black"
            kolor_w = parsuj_kolor(efektywne_w)
            if kolor_w is not None:
                if tag == "text":
                    skala = 1.0
                else:
                    p = prostokat_otaczajacy(el)
                    pole = (p[2] - p[0]) * (p[3] - p[1]) if p else None
                    skala = skala_wypelnienia(pole)
                usun_wlasciwosc(el, "fill")
                dodaj_klase(el, self.klasa("f", intensywnosc(kolor_w) * skala * mnoznik))
            elif wlasne_w is None and wypelnienie is not None:
                # wartość „none” albo url(...) odziedziczona — przepisz jawnie,
                # bo rodzic może stracić atrybut przy przemalowaniu
                el.set("fill", wypelnienie)
            kolor_k = parsuj_kolor(kontur)
            if kolor_k is not None:
                usun_wlasciwosc(el, "stroke")
                dodaj_klase(el, self.klasa("s", intensywnosc(kolor_k) * mnoznik))
            elif wlasne_k is None and kontur is not None:
                el.set("stroke", kontur)
            # <tspan> i <textPath> dziedziczą po <text>; własne kolory też przemalowujemy.
            for potomek in el.iter():
                if potomek is el:
                    continue
                usun_wlasciwosc(potomek, "font-family")
                kolor = parsuj_kolor(wlasciwosc(potomek, "fill"))
                if kolor is not None:
                    usun_wlasciwosc(potomek, "fill")
                    dodaj_klase(potomek, self.klasa("f", intensywnosc(kolor) * mnoznik))
                kolor = parsuj_kolor(wlasciwosc(potomek, "stroke"))
                if kolor is not None:
                    usun_wlasciwosc(potomek, "stroke")
                    dodaj_klase(potomek, self.klasa("s", intensywnosc(kolor) * mnoznik))
            return

        # Grupy i pojemniki: kolory przekazujemy dzieciom, z siebie usuwamy.
        if parsuj_kolor(wlasne_w) is not None:
            usun_wlasciwosc(el, "fill")
        if parsuj_kolor(wlasne_k) is not None:
            usun_wlasciwosc(el, "stroke")
        for dziecko in el:
            self.przemaluj(dziecko, wypelnienie, kontur, w_teksturze, czcionka)

    def arkusz(self, id_mapy: str) -> str:
        """Arkusz stylów osadzany w pliku mapy. Działa też przy otwarciu pliku wprost."""
        zakres = f'svg.mapa-slate[data-mapa="{id_mapy}"]'
        tlo = MOTYWY[MOTYW_DOMYSLNY]["tlo"]
        linie = [
            f'{zakres}{{font-family:"Ubuntu Mono","DejaVu Sans Mono",Consolas,monospace;background:{tlo}}}',
        ]
        for nazwa, motyw in MOTYWY.items():
            if nazwa == MOTYW_DOMYSLNY:
                przed = ""
            else:
                przed = f".motyw-{nazwa} "
            linie.append(
                f"{przed}{zakres} .h{{paint-order:stroke;stroke:{motyw['tlo']};stroke-width:3px;stroke-linejoin:round}}"
            )
            for rodzaj, wlasc in (("f", "fill"), ("s", "stroke"), ("c", "stop-color")):
                for poziom in sorted(self.poziomy[rodzaj]):
                    kolor = mieszaj(motyw["tlo"], motyw["fosfor"], poziom / 100)
                    linie.append(f"{przed}{zakres} .ds-{rodzaj}{poziom}{{{wlasc}:{kolor}}}")
        return "\n".join(linie)


def przygotuj_mape(korzen_mg, mapa: dict, wersja: str) -> tuple[ET.Element, dict]:
    obszar = [float(v) for v in str(mapa["zrodlo"]["obszar"]).replace(",", " ").split()]
    if len(obszar) != 4 or obszar[2] <= 0 or obszar[3] <= 0:
        raise BladPrzygotowania(f"Mapa „{mapa['id']}”: obszar musi mieć postać \"x y szerokość wysokość\".")
    svg = wytnij_obszar(korzen_mg, obszar)

    # Kontrola przed przemalowaniem — sprawdza oryginalne kolory i podpisy.
    problemy = kontrola_bezpieczenstwa(svg)
    if problemy:
        raise BladPrzygotowania(
            f"Mapa „{mapa['id']}”: po usunięciu grup tylko-mg zostały podejrzane elementy:\n  - "
            + "\n  - ".join(problemy)
            + "\nPopraw rysunek (owiń je w <g class=\"tylko-mg\">) i uruchom skrypt ponownie."
        )
    elementy = odczytaj_elementy(svg)

    # Tytuły elementów usuwamy: podpowiedź przeglądarki przy najechaniu
    # wyróżniałaby elementy, których gracze jeszcze nie odkryli.
    for el in svg.iter():
        for dziecko in list(el):
            if lokalna(dziecko.tag) in ("title", "desc", "metadata"):
                el.remove(dziecko)
    for defs in svg.iter(f"{{{SVG_NS}}}defs"):
        for dziecko in list(defs):
            if lokalna(dziecko.tag) == "style":
                defs.remove(dziecko)
    for dziecko in list(svg):
        if lokalna(dziecko.tag) == "style":
            svg.remove(dziecko)

    usun_nieuzywane_definicje(svg)
    malarz = Przemalowanie()
    for dziecko in list(svg):
        malarz.przemaluj(dziecko)
    dodaj_przedrostek_id(svg, mapa["id"])

    # Przycięcie do kadru mapy.
    x, y, w, h = obszar
    tresc = [d for d in list(svg) if lokalna(d.tag) != "defs"]
    defs = next((d for d in svg if lokalna(d.tag) == "defs"), None)
    if defs is None:
        defs = ET.Element(f"{{{SVG_NS}}}defs")
        svg.insert(0, defs)
    kadr = ET.SubElement(defs, f"{{{SVG_NS}}}clipPath", {"id": f"{mapa['id']}-kadr"})
    ET.SubElement(kadr, f"{{{SVG_NS}}}rect", {"x": f"{x:g}", "y": f"{y:g}", "width": f"{w:g}", "height": f"{h:g}", "rx": "8"})
    warstwa = ET.Element(f"{{{SVG_NS}}}g", {"class": "ds-rysunek", "clip-path": f"url(#{mapa['id']}-kadr)"})
    for d in tresc:
        svg.remove(d)
        warstwa.append(d)
    svg.append(warstwa)

    styl = ET.Element(f"{{{SVG_NS}}}style")
    styl.text = "\n" + malarz.arkusz(mapa["id"]) + "\n"
    defs.insert(0, styl)

    # Atrybuty korzenia.
    for atr in list(svg.attrib):
        if atr not in ("viewBox",):
            del svg.attrib[atr]
    svg.set("viewBox", f"{x:g} {y:g} {w:g} {h:g}")
    svg.set("class", "mapa-slate")
    svg.set("data-mapa", mapa["id"])
    svg.set("data-wersja", wersja)
    svg.set("role", "img")
    svg.set("aria-label", f"Mapa: {mapa.get('nazwa', mapa['id'])}")
    svg.set("preserveAspectRatio", "xMidYMid meet")
    return svg, elementy


NAGLOWEK = (
    "Mapa dla graczy w stylu Data-Slate. Plik wygenerowany przez narzedzia/przygotuj_mape.py "
    "na podstawie rysunku od MG — nie edytuj go ręcznie, tylko uruchom skrypt ponownie."
)


def wciecia(el, poziom: int = 0) -> None:
    """Jak ET.indent, ale nie dotyka wnętrza <text> (dodatkowe spacje zmieniłyby napis)."""
    if lokalna(el.tag) in ("text", "style") or len(el) == 0:
        return
    odstep = "\n" + " " * (poziom + 1)
    if not (el.text or "").strip():
        el.text = odstep
    for dziecko in el:
        wciecia(dziecko, poziom + 1)
        if not (dziecko.tail or "").strip():
            dziecko.tail = odstep
    if not (el[-1].tail or "").strip():
        el[-1].tail = "\n" + " " * poziom


def zapisz_svg(svg, sciezka: Path) -> None:
    wciecia(svg)
    tresc = ET.tostring(svg, encoding="unicode")
    sciezka.write_text(f"<!-- {NAGLOWEK} -->\n{tresc}\n", encoding="utf-8")


# ---------------------------------------------------------------------------
# Porównanie z manifestem
# ---------------------------------------------------------------------------
def porownaj_z_manifestem(manifest: dict, znalezione: dict[str, dict[str, dict]]) -> list[str]:
    raport = []
    w_manifescie = {e["id"]: e for e in manifest.get("elementy", [])}
    wszystkie_na_rysunku = {}
    for id_mapy, elementy in znalezione.items():
        for ident, dane in elementy.items():
            wszystkie_na_rysunku.setdefault(ident, []).append(id_mapy)
    for ident, mapy in sorted(wszystkie_na_rysunku.items()):
        if len(mapy) > 1:
            raport.append(f"UWAGA: element „{ident}” trafił na kilka map naraz: {', '.join(mapy)} (sprawdź obszary).")
    nowe = []
    for id_mapy, elementy in znalezione.items():
        for ident, dane in elementy.items():
            if ident not in w_manifescie:
                nowe.append({"id": ident, "nazwa": dane["tytul"] or ident, "aliasy": [], "kategoria": "inne",
                             "opis": "", "mapa": id_mapy, "dostepnyDomyslnie": False})
            elif w_manifescie[ident].get("mapa") != id_mapy:
                raport.append(
                    f"UWAGA: „{ident}” jest w manifeście na mapie „{w_manifescie[ident].get('mapa')}”, a na rysunku na „{id_mapy}”."
                )
    for ident, element in w_manifescie.items():
        if ident not in wszystkie_na_rysunku:
            raport.append(
                f"BRAK NA RYSUNKU: „{ident}” jest w manifeście, ale nie ma go na żadnej mapie "
                "(jego notatki trafią do listy „bez miejsca na mapie”)."
            )
    if nowe:
        raport.append(
            "NOWE ELEMENTY na rysunku (nie ma ich w manifeście — dopisz je, jeśli mają być klikalne):\n"
            + json.dumps(nowe, ensure_ascii=False, indent=2)
        )
    return raport


# ---------------------------------------------------------------------------
# Program główny
# ---------------------------------------------------------------------------
def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Tworzy mapy dla graczy (Data-Slate) z rysunku MG według manifestu kampanii.")
    parser.add_argument("kampania", help="folder kampanii, np. kampanie/Iliac")
    parser.add_argument("--sprawdz", action="store_true", help="tylko sprawdź, nie zapisuj plików")
    parser.add_argument("--zrodlo", help="inny plik rysunku MG niż podany w manifeście (dla wszystkich map)")
    argumenty = parser.parse_args(argv)

    folder = Path(argumenty.kampania)
    plik_manifestu = folder / "kampania.json"
    try:
        manifest = json.loads(plik_manifestu.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as blad:
        print(f"BŁĄD: nie da się odczytać manifestu {plik_manifestu}: {blad}", file=sys.stderr)
        return 2

    wersja = str(manifest.get("wersjaMapy", ""))
    znalezione: dict[str, dict[str, dict]] = {}
    gotowe: list[tuple[ET.Element, Path]] = []
    rysunki: dict[Path, ET.Element] = {}
    try:
        for mapa in manifest.get("mapy", []):
            if "zrodlo" not in mapa:
                print(f"Mapa „{mapa.get('id')}”: brak sekcji „zrodlo” w manifeście — pomijam (plik mapy przygotowany ręcznie).")
                continue
            plik_zrodla = Path(argumenty.zrodlo) if argumenty.zrodlo else folder / mapa["zrodlo"]["plik"]
            if plik_zrodla not in rysunki:
                korzen = wczytaj_svg(plik_zrodla)
                usuniete = usun_tylko_mg(korzen)
                print(f"Rysunek {plik_zrodla}: usunięto {usuniete} grup(y) „tylko-mg”.")
                rysunki[plik_zrodla] = korzen
            svg, elementy = przygotuj_mape(rysunki[plik_zrodla], mapa, wersja)
            znalezione[mapa["id"]] = elementy
            gotowe.append((svg, folder / mapa["plik"]))
            print(f"Mapa „{mapa['id']}”: {len(elementy)} element(ów) klikalnych: {', '.join(sorted(elementy))}")
    except BladPrzygotowania as blad:
        print(f"BŁĄD: {blad}", file=sys.stderr)
        print("Nie zapisano żadnego pliku.", file=sys.stderr)
        return 1

    for linia in porownaj_z_manifestem(manifest, znalezione):
        print(linia)

    if argumenty.sprawdz:
        print("Tryb sprawdzania — nie zapisano plików.")
        return 0
    for svg, sciezka in gotowe:
        zapisz_svg(svg, sciezka)
        print(f"Zapisano {sciezka}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
