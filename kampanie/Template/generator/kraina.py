"""Generator rysunku mapy „Kraina” (Rysunek_kraina.svg) kampanii „Wzór” — mapa fantasy.

Użycie (z katalogu głównego repozytorium):

    python3 kampanie/Template/generator/kraina.py
    python3 narzedzia/przygotuj_mape.py kampanie/Template

Zapisuje kampanie/Template/Rysunek_kraina.svg (ziarno losowania stałe — wynik zawsze ten sam).
Generator jest pomocą, nie obowiązkiem: źródłem mapy jest plik SVG. Jeśli poprawisz rysunek
ręcznie, nie uruchamiaj potem generatora — nadpisze Twoje zmiany.
"""
import math
import random
import sys
from pathlib import Path
from wspolne import (atr, catmull, el, f, odl_lamana, poisson, probkuj_krzywa, pts, tekst, tekst_wiele,
                     w_wielokacie, zapisz_rysunek)

rng = random.Random(20261115)
W, H = 1600, 1100
PAPIER = "#efe3c3"
TUSZ = "#3d3226"
out = []
o = out.append

# ------------------------------------------------------------------ geografia
GRZBIET = [(545, 150), (720, 128), (880, 162), (1040, 212), (1180, 262), (1320, 308), (1450, 368), (1548, 452)]
GRZBIET_G = probkuj_krzywa(GRZBIET, 12)

LAS = [(24, 236), (120, 196), (250, 210), (360, 184), (470, 214), (556, 288), (588, 388), (560, 478), (598, 556),
       (586, 618), (528, 700), (546, 800), (480, 872), (372, 858), (262, 902), (152, 880), (60, 920), (24, 900)]
POLANA_WOLKA = (332, 616, 62)  # x, y, promień
POLANA_RUINY = (190, 424, 36)

RZEKA_GORNA = [(1166, 336), (1186, 382), (1214, 432), (1240, 482)]
RZEKA = [(1152, 590), (1096, 598), (1040, 612), (990, 626), (955, 642), (915, 656), (880, 668), (852, 690), (835, 725),
         (822, 760), (808, 800), (790, 845), (768, 890), (745, 940), (722, 990), (708, 1040), (700, 1078)]
DOPLYW = [(826, 188), (836, 250), (850, 322), (866, 402), (878, 480), (884, 550), (882, 612), (880, 668)]
RZEKA_G = probkuj_krzywa(RZEKA, 6)
GORNA_G = probkuj_krzywa(RZEKA_GORNA, 6)
DOPLYW_G = probkuj_krzywa(DOPLYW, 6)

JEZIORO = [(1158, 548), (1196, 500), (1252, 482), (1320, 488), (1392, 476), (1448, 508), (1458, 560), (1430, 610),
           (1360, 632), (1290, 626), (1226, 640), (1172, 620)]

TRAKT_ZACHOD = [(22, 702), (110, 690), (200, 662), (280, 632), (332, 616), (402, 626), (482, 646), (562, 652),
                (642, 650), (702, 652), (752, 658)]
TRAKT_POLNOC = [(928, 600), (952, 548), (978, 500), (1000, 458), (1022, 410), (1046, 362), (1068, 312), (1084, 262),
                (1098, 204), (1110, 140), (1118, 70), (1122, 22)]
TRAKT_WSCHOD = [(956, 672), (1040, 698), (1120, 712), (1230, 722), (1330, 712), (1402, 702), (1480, 718), (1578, 744)]
DROGA_POLUDNIE = [(812, 746), (790, 790), (762, 838), (738, 870), (700, 908), (636, 940), (566, 958), (530, 1000),
                  (512, 1040), (504, 1078)]
SCIEZKA_LESNA = [(334, 650), (342, 712), (366, 772), (414, 832), (470, 892), (534, 946)]
SCIEZKA_RUINY = [(306, 592), (276, 548), (240, 500), (208, 458)]
SCIEZKA_ZAGORZE = [(692, 356), (720, 420), (752, 486), (782, 548), (812, 580)]
SCIEZKA_RYBAKI = [(1120, 712), (1146, 690), (1170, 664)]
SCIEZKA_PALAC = [(1402, 702), (1428, 664), (1450, 630), (1468, 604)]
DROGA_DEBOWO = [(1230, 722), (1240, 780), (1246, 838), (1240, 884)]

DROGI_G = [probkuj_krzywa(d, 6) for d in (TRAKT_ZACHOD, TRAKT_POLNOC, TRAKT_WSCHOD, DROGA_POLUDNIE,
                                          SCIEZKA_LESNA, SCIEZKA_RUINY, SCIEZKA_ZAGORZE, SCIEZKA_RYBAKI, SCIEZKA_PALAC,
                                          DROGA_DEBOWO)]

MIASTO = [(752, 640), (778, 598), (830, 574), (890, 578), (930, 600), (952, 640), (956, 690), (926, 730), (870, 748),
          (815, 746), (772, 720), (752, 680)]

OSADY = {  # środek i promień „zajętego” miejsca
    "wolka": (332, 610, 40), "brzezina": (552, 960, 44), "mlynek": (752, 852, 30), "rybaki": (1180, 662, 32),
    "kamieniec": (998, 452, 36), "zagorze": (688, 336, 28), "palac": (1490, 560, 58), "ruiny": (190, 424, 30),
    "debowo": (1240, 902, 34), "karczma": (1076, 726, 20), "krag": (700, 556, 26), "kurhan": (772, 470, 24),
    "mokradla": (1000, 934, 62),
}


def odl_drog(x, y):
    return min(odl_lamana(x, y, d) for d in DROGI_G)


def w_lesie(x, y):
    return w_wielokacie(x, y, LAS)


def w_jeziorze(x, y, zapas=0):
    if zapas:
        return w_wielokacie(x, y, JEZIORO) or any(w_wielokacie(x + dx, y + dy, JEZIORO) for dx, dy in
                                                    ((zapas, 0), (-zapas, 0), (0, zapas), (0, -zapas)))
    return w_wielokacie(x, y, JEZIORO)


def odl_rzek(x, y):
    return min(odl_lamana(x, y, RZEKA_G), odl_lamana(x, y, GORNA_G), odl_lamana(x, y, DOPLYW_G))


def odl_gor(x, y):
    return odl_lamana(x, y, GRZBIET_G)


# ------------------------------------------------------------------ nagłówek i definicje
o(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="Georgia, \'Times New Roman\', serif">')
o("<title>Kraina Srebrnicy — rysunek mapy (kampania Wzór)</title>")
o("<!-- Rysunek źródłowy mapy „Kraina”. Mapę dla graczy robi skrypt narzedzia/przygotuj_mape.py. -->")
o("<defs>")
o(f"<style>.h {{ stroke: {PAPIER}; stroke-width: 3px; paint-order: stroke; stroke-linejoin: round; }}</style>")
o('<pattern id="pole-zboze" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">'
  '<rect width="7" height="7" fill="#e8d59a"/><line x1="0" y1="0" x2="0" y2="7" stroke="#bfa665" stroke-width="1.6"/></pattern>')
o('<pattern id="pole-laka" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-20)">'
  '<rect width="8" height="8" fill="#d8dca0"/><line x1="0" y1="0" x2="0" y2="8" stroke="#a5ab6a" stroke-width="1.4"/></pattern>')
o('<pattern id="pole-ugor" width="6" height="6" patternUnits="userSpaceOnUse">'
  '<rect width="6" height="6" fill="#e3cfa2"/><circle cx="3" cy="3" r="0.9" fill="#a88a5a"/></pattern>')
o("</defs>")

# ------------------------------------------------------------------ papier i ramka
o(el("rect", x=0, y=0, width=W, height=H, fill=PAPIER))
for (cx, cy, rx, ry) in ((300, 990, 280, 80), (1240, 120, 320, 90), (1450, 990, 220, 70)):
    o(el("ellipse", cx=cx, cy=cy, rx=rx, ry=ry, fill="#e8d9b2", fill_opacity="0.45"))

# ------------------------------------------------------------------ łąki: kępki trawy i pagórki
def wolne(x, y, zapas=16):
    if w_lesie(x, y) or w_jeziorze(x, y, 8) or w_wielokacie(x, y, MIASTO):
        return False
    if odl_gor(x, y) < 120 or odl_rzek(x, y) < 12 or odl_drog(x, y) < 10:
        return False
    if any(math.hypot(x - a, y - b) < r + zapas for a, b, r in OSADY.values()):
        return False
    if x < 40 or y < 40 or x > W - 40 or y > H - 40:
        return False
    if x < 500 and y < 160:  # kartusz
        return False
    if x > 1300 and y > 850:  # legenda
        return False
    return True


kepki = poisson((40, 40, W - 40, H - 40), 46, rng, wolne)
d = []
for x, y in kepki:
    s = rng.uniform(0.8, 1.2)
    d.append(f"M{f(x - 4 * s)} {f(y)} l{f(2 * s)} {f(-5 * s)} M{f(x)} {f(y)} l{f(0.5 * s)} {f(-6.5 * s)} M{f(x + 4 * s)} {f(y)} l{f(-1.6 * s)} {f(-5 * s)}")
o(el("path", d=" ".join(d), fill="none", stroke="#9c9a5c", stroke_width="1", stroke_linecap="round"))

# pagórki u stóp gór i w kilku miejscach
pagorki = []
for i in range(0, len(GRZBIET_G), 3):
    x, y = GRZBIET_G[i]
    for odsuniecie in (95, 125):
        px, py = x + rng.uniform(-14, 14), y + odsuniecie + rng.uniform(-12, 12)
        if wolne(px, py, 6) or (odl_drog(px, py) > 14 and not w_lesie(px, py) and odl_rzek(px, py) > 14
                               and not any(math.hypot(px - a, py - b) < r + 10 for a, b, r in OSADY.values())
                               and odl_gor(px, py) >= 85):
            pagorki.append((px, py, rng.uniform(13, 20)))
for (px, py) in ((640, 520), (668, 548), (1010, 840), (1040, 868), (980, 880), (1200, 860), (1236, 884), (300, 1000), (260, 1030)):
    pagorki.append((px, py, rng.uniform(13, 18)))
d_wyp = []
d_kontur = []
for px, py, s in pagorki:
    d_wyp.append(f"M{f(px - s)} {f(py)} Q{f(px)} {f(py - s * 1.1)} {f(px + s)} {f(py)} Z")
    d_kontur.append(f"M{f(px - s)} {f(py)} Q{f(px)} {f(py - s * 1.1)} {f(px + s)} {f(py)}")
    d_kontur.append(f"M{f(px + s * 0.25)} {f(py - s * 0.42)} l{f(s * 0.22)} {f(s * 0.36)} M{f(px + s * 0.55)} {f(py - s * 0.22)} l{f(s * 0.2)} {f(s * 0.2)}")
o(el("path", d=" ".join(d_wyp), fill="#e2d1a2"))
o(el("path", d=" ".join(d_kontur), fill="none", stroke="#8a7452", stroke_width="1.2", stroke_linecap="round"))

# ------------------------------------------------------------------ pola uprawne
def pole(srodek, w, h, kat, wzor):
    cx, cy = srodek
    a = math.radians(kat)
    rogi = []
    for dx, dy in ((-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)):
        jx, jy = dx + rng.uniform(-2, 2), dy + rng.uniform(-2, 2)
        rogi.append((cx + jx * math.cos(a) - jy * math.sin(a), cy + jx * math.sin(a) + jy * math.cos(a)))
    return el("polygon", points=pts(rogi), fill=f"url(#{wzor})", stroke="#9c8656", stroke_width="0.8")


pola = [((690, 720), 46, 28, 8, "pole-zboze"), ((700, 690), 40, 22, 5, "pole-laka"), ((690, 760), 44, 26, 12, "pole-ugor"),
        ((990, 760), 50, 30, -6, "pole-laka"), ((1046, 780), 46, 26, -4, "pole-zboze"), ((980, 790), 42, 24, -10, "pole-ugor"),
        ((880, 800), 40, 26, 14, "pole-zboze"), ((910, 830), 44, 24, 10, "pole-laka"), ((620, 1000), 46, 28, -14, "pole-zboze"),
        ((600, 1030), 44, 24, -10, "pole-laka"), ((470, 1000), 42, 28, 6, "pole-ugor"), ((440, 1035), 46, 26, 4, "pole-zboze"),
        ((700, 820), 36, 24, 20, "pole-laka"), ((1110, 760), 44, 26, 2, "pole-ugor"), ((1160, 770), 40, 24, -2, "pole-zboze"),
        ((1260, 690), 48, 22, -2, "pole-laka"), ((646, 360), 34, 22, -10, "pole-ugor"), ((730, 330), 34, 22, 6, "pole-zboze")]
o("<g>")
for p in pola:
    o(pole(*p))
o("</g>")

# ------------------------------------------------------------------ pojedyncze drzewa i zagajniki poza puszczą
def drzewo_lisciaste(x, y, r, ciemne="#6d8d46", jasne="#95b266", kontur="#3c5a2b"):
    n = 7
    a0 = rng.uniform(0, math.pi)
    p = [(x + r * math.cos(a0 + 2 * math.pi * k / n), y + r * math.sin(a0 + 2 * math.pi * k / n)) for k in range(n)]
    rb = r * 0.52
    d = f"M{f(p[0][0])} {f(p[0][1])} " + " ".join(f"A{f(rb)} {f(rb)} 0 0 1 {f(q[0])} {f(q[1])}" for q in p[1:] + p[:1]) + " Z"
    return [el("path", d=d, fill=ciemne, stroke=kontur, stroke_width="1.1"),
            el("circle", cx=f(x - r * 0.2), cy=f(y - r * 0.24), r=f(r * 0.66), fill=jasne)]


def drzewo_iglaste(x, y, r):
    gora = y - r * 1.25
    d = (f"M{f(x)} {f(gora)} L{f(x + r * 0.55)} {f(y - r * 0.35)} L{f(x + r * 0.3)} {f(y - r * 0.35)} "
         f"L{f(x + r * 0.85)} {f(y + r * 0.55)} L{f(x - r * 0.85)} {f(y + r * 0.55)} L{f(x - r * 0.3)} {f(y - r * 0.35)} "
         f"L{f(x - r * 0.55)} {f(y - r * 0.35)} Z")
    jasna = (f"M{f(x)} {f(gora + 2)} L{f(x - r * 0.45)} {f(y - r * 0.4)} L{f(x - r * 0.18)} {f(y - r * 0.4)} "
             f"L{f(x - r * 0.68)} {f(y + r * 0.45)} L{f(x)} {f(y + r * 0.45)} Z")
    return [el("path", d=d, fill="#4f7a42", stroke="#2c4724", stroke_width="1.1", stroke_linejoin="round"),
            el("path", d=jasna, fill="#76a05a")]


def pnie(drzewa):
    d = []
    for x, y, r, rodzaj in drzewa:
        d.append(f"M{f(x)} {f(y + r * 0.3)} L{f(x)} {f(y + r + 3.5)}")
    return el("path", d=" ".join(d), fill="none", stroke="#5b4128", stroke_width="1.7", stroke_linecap="round")


def rysuj_drzewa(drzewa):
    czesci = [pnie(drzewa)]
    for x, y, r, rodzaj in sorted(drzewa, key=lambda t: t[1]):
        czesci += drzewo_iglaste(x, y, r) if rodzaj == "i" else drzewo_lisciaste(x, y, r)
    return czesci


zagajniki = [(620, 470, 6), (760, 950, 5), (1100, 820, 6), (1320, 800, 5), (1060, 560, 4),
             (240, 960, 4), (1250, 420, 3), (1460, 820, 4), (640, 600, 3), (900, 470, 3)]
pojedyncze = []
for cx, cy, n in zagajniki:
    for _ in range(n):
        x, y = cx + rng.uniform(-26, 26), cy + rng.uniform(-18, 18)
        if wolne(x, y, 4) or (not w_lesie(x, y) and odl_drog(x, y) > 9 and odl_rzek(x, y) > 10 and not w_jeziorze(x, y, 8)):
            pojedyncze.append((x, y, rng.uniform(6.5, 8.5), "i" if rng.random() < 0.35 else "l"))
o("<g>")
out.extend(rysuj_drzewa(pojedyncze))
o("</g>")

# ------------------------------------------------------------------ PUSZCZA MGLISTA (klikalna)
def w_puszczy(x, y):
    if not w_lesie(x, y):
        return False
    for cx, cy, r in (POLANA_WOLKA, POLANA_RUINY):
        if math.hypot(x - cx, y - cy) < r:
            return False
    if odl_drog(x, y) < 13:
        return False
    if 150 < x < 470 and 380 < y < 470:  # miejsce na nazwę puszczy
        return False
    return True


drzewa_lasu = []
for x, y in poisson((24, 170, 610, 930), 19.5, rng, w_puszczy):
    drzewa_lasu.append((x, y, rng.uniform(9, 11.2), "i" if rng.random() < 0.3 else "l"))
# brzeg lasu bardziej postrzępiony — kilka drzew tuż za granicą
o('<g data-element="puszcza-mglista">')
o("<title>Puszcza Mglista</title>")
o(el("path", d=catmull(LAS, True), fill="#c9d59f", fill_opacity="0.6"))
out.extend(rysuj_drzewa(drzewa_lasu))
o(tekst(312, 432, "PUSZCZA", class_="h", font_size="24", font_style="italic", letter_spacing="7", text_anchor="middle", fill="#24391b"))
o(tekst(312, 460, "MGLISTA", class_="h", font_size="24", font_style="italic", letter_spacing="7", text_anchor="middle", fill="#24391b"))
o("</g>")
print("drzewa w puszczy:", len(drzewa_lasu), file=sys.stderr)

# ------------------------------------------------------------------ GÓRY SINE (klikalne)
def gora(x, y, s):
    w = s * rng.uniform(1.05, 1.3)
    h = s * rng.uniform(0.85, 1.05)
    szczyt = (x + rng.uniform(-0.12, 0.12) * w, y - h)
    lewe = [(x - w / 2, y), (x - w * 0.32, y - h * rng.uniform(0.35, 0.45)), (x - w * 0.22, y - h * rng.uniform(0.5, 0.62)),
            (x - w * 0.12, y - h * rng.uniform(0.72, 0.84))]
    prawe = [(x + w * 0.1, y - h * rng.uniform(0.75, 0.86)), (x + w * 0.24, y - h * rng.uniform(0.5, 0.62)),
             (x + w * 0.36, y - h * rng.uniform(0.3, 0.42)), (x + w / 2, y)]
    obrys = lewe + [szczyt] + prawe
    srodek_podstawy = (x + w * 0.08, y)
    cien = [szczyt] + prawe + [srodek_podstawy]
    czesci = [el("polygon", points=pts(obrys), fill="#c2b59c", stroke="#4a3e31", stroke_width="1.4", stroke_linejoin="round"),
              el("polygon", points=pts(cien), fill="#8e8170")]
    if s > 58:
        snieg = [(szczyt[0] - w * 0.13, szczyt[1] + h * 0.24), (szczyt[0] - w * 0.05, szczyt[1] + h * 0.17),
                 (szczyt[0] + w * 0.02, szczyt[1] + h * 0.27), (szczyt[0] + w * 0.09, szczyt[1] + h * 0.18),
                 (szczyt[0] + w * 0.13, szczyt[1] + h * 0.23), szczyt]
        czesci.append(el("polygon", points=pts([szczyt] + snieg[:-1]), fill="#f7f3e8", stroke="#4a3e31", stroke_width="0.8",
                         stroke_linejoin="round"))
    # grzbiet i kreskowanie strony cienia
    kreski = [f"M{f(szczyt[0])} {f(szczyt[1])} L{f(srodek_podstawy[0])} {f(srodek_podstawy[1])}"]
    for t in (0.3, 0.5, 0.7):
        ax, ay = szczyt[0] + (srodek_podstawy[0] - szczyt[0]) * t, szczyt[1] + (srodek_podstawy[1] - szczyt[1]) * t
        kreski.append(f"M{f(ax + 2)} {f(ay)} l{f(w * 0.12)} {f(h * 0.1)}")
    czesci.append(el("path", d=" ".join(kreski), fill="none", stroke="#4a3e31", stroke_width="1", stroke_linecap="round"))
    return czesci


gory = []
TRAKT_POLNOC_G = probkuj_krzywa(TRAKT_POLNOC, 6)
for rzad, (odsuniecie, rozmiar, krok) in enumerate(((-46, 50, 46), (2, 72, 52), (50, 50, 44), (88, 34, 40))):
    pozycja = rng.uniform(0, krok)
    dlugosc = sum(math.hypot(GRZBIET_G[i + 1][0] - GRZBIET_G[i][0], GRZBIET_G[i + 1][1] - GRZBIET_G[i][1]) for i in range(len(GRZBIET_G) - 1))
    while pozycja < dlugosc:
        # punkt na grzbiecie w odległości „pozycja” od początku
        reszta = pozycja
        for i in range(len(GRZBIET_G) - 1):
            (ax, ay), (bx, by) = GRZBIET_G[i], GRZBIET_G[i + 1]
            odc = math.hypot(bx - ax, by - ay)
            if reszta <= odc:
                break
            reszta -= odc
        t = reszta / odc if odc else 0
        x, y = ax + (bx - ax) * t, ay + (by - ay) * t
        px, py = -(by - ay) / odc, (bx - ax) / odc  # prostopadła (w dół mapy)
        pozycja += krok * rng.uniform(0.8, 1.2)
        if rzad == 3 and rng.random() < 0.4:
            continue
        gx = x + px * odsuniecie + rng.uniform(-8, 8)
        gy = y + py * odsuniecie + rng.uniform(-6, 6)
        s = rozmiar * rng.uniform(0.85, 1.18)
        w_pol = s * 0.68
        if odl_lamana(gx, gy - s * 0.4, TRAKT_POLNOC_G) < 26 + s * 0.4:
            continue  # przełęcz — droga przez góry
        if gy - s < 36 or gx - w_pol < 470 or gx + w_pol > W - 34:
            continue
        gory.append((gx, gy, s))
# Ścieżka do Smoczej Jamy (miejsce do odkrycia) — wije się POD górami, więc musi być
# narysowana przed nimi, a nie w grupie Smoczej Jamy (ta leży wyżej, nad górami).
# Znacznik data-nalezy-do: aplikacja zasłania ją i odkrywa razem ze Smoczą Jamą.
SCIEZKA_JAMA = [(1290, 472), (1298, 446), (1306, 420), (1316, 398), (1334, 382), (1352, 374), (1364, 372)]
o('<g data-nalezy-do="smocza-jama">')
o(el("path", d=catmull(SCIEZKA_JAMA), fill="none", stroke="#7a5232", stroke_width="1.6", stroke_dasharray="1.5 4.5",
     stroke_linecap="round"))
o("</g>")

o('<g data-element="gory-sine">')
o("<title>Góry Sine</title>")
for gx, gy, s in sorted(gory, key=lambda t: t[1]):
    out.extend(gora(gx, gy, s))
o(tekst(1262, 132, "GÓRY SINE", class_="h", font_size="26", font_weight="bold", letter_spacing="10", text_anchor="middle",
        fill="#2e2a3a", transform="rotate(17 1262 132)"))
o("</g>")
print("góry:", len(gory), file=sys.stderr)

# ------------------------------------------------------------------ JEZIORO CICHE (klikalne)
def przesun_wiel(wiel, skala):
    cx = sum(p[0] for p in wiel) / len(wiel)
    cy = sum(p[1] for p in wiel) / len(wiel)
    return [(cx + (x - cx) * skala, cy + (y - cy) * skala) for x, y in wiel]


o('<g data-element="jezioro-ciche">')
o("<title>Jezioro Ciche</title>")
o(el("path", d=catmull(JEZIORO, True), fill="#a7c9dc", stroke="#45708f", stroke_width="1.8"))
o(el("path", d=catmull(przesun_wiel(JEZIORO, 0.9), True), fill="none", stroke="#7aa3bf", stroke_width="0.9"))
o(el("path", d=catmull(przesun_wiel(JEZIORO, 0.8), True), fill="none", stroke="#8db3cb", stroke_width="0.7"))
fale = []
for x, y in ((1230, 560), (1270, 530), (1350, 600), (1395, 530), (1300, 590), (1205, 600)):
    fale.append(f"M{f(x)} {f(y)} q4 -4 8 0 t8 0")
o(el("path", d=" ".join(fale), fill="none", stroke="#4f7e9c", stroke_width="1", stroke_linecap="round"))
o(tekst(1318, 566, "Jezioro Ciche", class_="h", font_size="17", font_style="italic", letter_spacing="2", text_anchor="middle", fill="#1f4560"))
o("</g>")

# ------------------------------------------------------------------ SREBRNICA (klikalna)
o('<g data-element="srebrnica">')
o("<title>Srebrnica</title>")
for punkty, szer in ((RZEKA_GORNA, (6, 3.4)), (DOPLYW, (6, 3.4)), (RZEKA[:7], (8, 4.6)), (RZEKA[6:], (10, 6))):
    o(el("path", d=catmull(punkty), fill="none", stroke="#45708f", stroke_width=szer[0], stroke_linecap="round", stroke_linejoin="round"))
    o(el("path", d=catmull(punkty), fill="none", stroke="#a7c9dc", stroke_width=szer[1], stroke_linecap="round", stroke_linejoin="round"))
o(tekst(748, 1004, "Srebrnica", class_="h", font_size="15", font_style="italic", letter_spacing="2", fill="#1f4560", transform="rotate(-70 748 1004)"))
o(tekst(1072, 590, "Srebrnica", class_="h", font_size="13", font_style="italic", letter_spacing="1", fill="#1f4560", transform="rotate(-10 1072 590)"))
o("</g>")


# ------------------------------------------------------------------ drogi
def droga(punkty, rodzaj):
    d = catmull(punkty)
    if rodzaj == "trakt":
        return [el("path", d=d, fill="none", stroke="#c8a56d", stroke_width="6", stroke_linecap="round", stroke_linejoin="round"),
                el("path", d=d, fill="none", stroke="#6b4423", stroke_width="1.8", stroke_dasharray="10 6", stroke_linecap="round")]
    if rodzaj == "droga":
        return [el("path", d=d, fill="none", stroke="#d2b585", stroke_width="4", stroke_linecap="round", stroke_linejoin="round"),
                el("path", d=d, fill="none", stroke="#7a5232", stroke_width="1.3", stroke_dasharray="6 5", stroke_linecap="round")]
    return [el("path", d=d, fill="none", stroke="#7a5232", stroke_width="1.5", stroke_dasharray="1.5 4.5", stroke_linecap="round")]


o("<g>")
for punkty, rodzaj in ((DROGA_POLUDNIE, "droga"), (SCIEZKA_LESNA, "sciezka"), (SCIEZKA_RUINY, "sciezka"),
                       (SCIEZKA_ZAGORZE, "droga"), (SCIEZKA_RYBAKI, "droga"), (SCIEZKA_PALAC, "sciezka"),
                       (DROGA_DEBOWO, "droga")):
    out.extend(droga(punkty, rodzaj))
o("</g>")

o('<g data-element="trakt-krolewski">')
o("<title>Trakt Królewski</title>")
out.extend(droga(TRAKT_ZACHOD, "trakt"))
out.extend(droga(TRAKT_POLNOC, "trakt"))
o(tekst(530, 637, "Trakt Królewski", class_="h", font_size="14", font_style="italic", letter_spacing="1", text_anchor="middle", fill="#4a2f17", transform="rotate(4 530 637)"))
o(tekst(1000, 548, "Trakt Królewski", class_="h", font_size="12", font_style="italic", text_anchor="middle", fill="#4a2f17", transform="rotate(-62 1000 548)"))
o("</g>")

o('<g data-element="trakt-wschodni">')
o("<title>Trakt Wschodni</title>")
out.extend(droga(TRAKT_WSCHOD, "trakt"))
o(tekst(1290, 742, "Trakt Wschodni", class_="h", font_size="14", font_style="italic", letter_spacing="1", text_anchor="middle", fill="#4a2f17", transform="rotate(-2 1290 742)"))
o("</g>")


# ------------------------------------------------------------------ osady (wspólne)
def dom(x, y, w, h, kat, dach="#b4553c"):
    a = math.radians(kat)
    c, s = math.cos(a), math.sin(a)
    rogi = [(x + dx * c - dy * s, y + dx * s + dy * c) for dx, dy in ((-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2))]
    kalenica = ((x - w / 2 * c, y - w / 2 * s), (x + w / 2 * c, y + w / 2 * s))
    return el("polygon", points=pts(rogi), fill=dach, stroke="#3a2a1a", stroke_width="0.9", stroke_linejoin="round"), kalenica


def osada(domy, dach="#b4553c"):
    czesci = []
    kalenice = []
    for x, y, w, h, kat in domy:
        wiel, kal = dom(x, y, w, h, kat, dach)
        czesci.append(wiel)
        kalenice.append(f"M{f(kal[0][0])} {f(kal[0][1])} L{f(kal[1][0])} {f(kal[1][1])}")
    czesci.append(el("path", d=" ".join(kalenice), fill="none", stroke="#5e2618", stroke_width="0.9"))
    return czesci


def losowe_domy(cx, cy, promien, n, rozmiar=(9, 12)):
    domy = []
    proby = 0
    while len(domy) < n and proby < 500:
        proby += 1
        a = rng.uniform(0, 2 * math.pi)
        r = promien * math.sqrt(rng.random())
        x, y = cx + r * math.cos(a), cy + r * math.sin(a)
        if odl_drog(x, y) < 6 or odl_rzek(x, y) < 9 or w_jeziorze(x, y, 6):
            continue
        if any(math.hypot(x - d[0], y - d[1]) < 12 for d in domy):
            continue
        w = rng.uniform(*rozmiar)
        domy.append((x, y, w, w * rng.uniform(0.62, 0.78), rng.choice((0, 0, 90)) + rng.uniform(-14, 14)))
    return domy


# ------------------------------------------------------------------ mniejsze osady (tło, bez data-element)
o("<g>")
# Młynek: domy na zachodnim brzegu i koło wodne
out.extend(osada(losowe_domy(732, 852, 22, 4)))
o(el("circle", cx=771, cy=858, r=7, fill="#d8c8a0", stroke="#3a2a1a", stroke_width="1.2"))
o(el("path", d="M764 858 h14 M771 851 v14 M766 853 l10 10 M776 853 l-10 10", fill="none", stroke="#3a2a1a", stroke_width="0.9"))
o(tekst(700, 830, "Młynek", class_="h", font_size="13", font_style="italic", text_anchor="end", fill=TUSZ))
# Zagórze: przysiółek pod górami
out.extend(osada(losowe_domy(686, 338, 16, 3)))
o(tekst(686, 312, "Zagórze", class_="h", font_size="13", font_style="italic", text_anchor="middle", fill=TUSZ))
# Dębowo: przysiółek na południe od Traktu Wschodniego
out.extend(osada(losowe_domy(1240, 904, 18, 4)))
o(tekst(1268, 930, "Dębowo", class_="h", font_size="13", font_style="italic", text_anchor="start", fill=TUSZ))
# karczma przy trakcie
o(el("rect", x=1066, y=718, width=16, height=11, fill="#b4553c", stroke="#3a2a1a", stroke_width="1"))
o(el("path", d="M1066 723.5 h16 M1085 718 v12 M1085 720 h6 v5 h-6", fill="none", stroke="#3a2a1a", stroke_width="0.9"))
o(tekst(1078, 746, "karczma „Pod Dzikiem”", class_="h", font_size="11", font_style="italic", text_anchor="middle", fill=TUSZ))
# kamienny krąg
for k in range(8):
    a = 2 * math.pi * k / 8
    o(el("circle", cx=f(700 + 12 * math.cos(a)), cy=f(552 + 9 * math.sin(a)), r="2.6", fill="#a99c84", stroke="#4a3e31", stroke_width="0.9"))
o(tekst(700, 580, "Kamienny Krąg", class_="h", font_size="11", font_style="italic", text_anchor="middle", fill=TUSZ))
# kurhan
o(el("path", d="M756 474 q16 -22 32 0 Z", fill="#d8c79c", stroke="#6b5a40", stroke_width="1.2"))
o(el("path", d="M766 466 l3 4 M774 462 l2 5 M781 467 l2 3", fill="none", stroke="#6b5a40", stroke_width="1"))
o(tekst(772, 490, "Kurhan", class_="h", font_size="11", font_style="italic", text_anchor="middle", fill=TUSZ))
# mokradła
mokre = []
for x, y in poisson((950, 900, 1052, 968), 15, rng, lambda x, y: ((x - 1000) / 54) ** 2 + ((y - 934) / 34) ** 2 < 1):
    mokre.append(f"M{f(x - 6)} {f(y)} h12 M{f(x - 3)} {f(y + 3)} h6 M{f(x - 2)} {f(y - 1)} l-2 -5 M{f(x)} {f(y - 1)} v-6 M{f(x + 2)} {f(y - 1)} l2 -5")
o(el("ellipse", cx=1000, cy=934, rx=56, ry=34, fill="#c7d3b4", fill_opacity="0.7"))
o(el("path", d=" ".join(mokre), fill="none", stroke="#5f7a6a", stroke_width="1.1", stroke_linecap="round"))
o(tekst(1000, 984, "Mokradła", class_="h", font_size="12", font_style="italic", text_anchor="middle", fill="#2f4a3a"))
o("</g>")

# ------------------------------------------------------------------ WYSOGRÓD (klikalny)
o('<g data-element="wysogrod">')
o("<title>Wysogród</title>")
o(el("path", d=catmull(MIASTO, True), fill="#e4d4a9"))
# rzeka w mieście (ta sama linia co Srebrnica — żeby grunt miasta jej nie zasłonił)
for punkty, szer in ((DOPLYW[4:], (6, 3.4)), (RZEKA[2:11], (8, 4.6))):
    o(el("path", d=catmull(punkty), fill="none", stroke="#45708f", stroke_width=szer[0], stroke_linecap="round"))
    o(el("path", d=catmull(punkty), fill="none", stroke="#a7c9dc", stroke_width=szer[1], stroke_linecap="round"))
# ulice
ulice = [[(752, 658), (800, 652), (846, 648), (900, 660), (956, 672)], [(812, 746), (826, 700), (846, 648), (858, 600), (862, 576)],
         [(928, 600), (900, 630), (900, 660)]]
for u in ulice:
    o(el("path", d=catmull(u), fill="none", stroke="#f3e9cf", stroke_width="4.5", stroke_linecap="round"))
ULICE_G = [probkuj_krzywa(u, 6) for u in ulice]
# zamek
o(el("rect", x=780, y=596, width=40, height=30, fill="#d6c7a4", stroke="#3a2a1a", stroke_width="1.6"))
o(el("rect", x=791, y=604, width=18, height=14, fill="#7d8597", stroke="#3a2a1a", stroke_width="1"))
for tx, ty in ((780, 596), (820, 596), (780, 626), (820, 626)):
    o(el("circle", cx=tx, cy=ty, r=5.5, fill="#7d8597", stroke="#3a2a1a", stroke_width="1.2"))
# rynek i świątynia
o(el("rect", x=826, y=622, width=30, height=20, fill="#efe3c3", stroke="#8a7452", stroke_width="0.9"))
o(el("circle", cx=841, cy=632, r=2.2, fill="#45708f"))
o(el("path", d="M908 690 h26 v12 h-26 Z M921 682 v28", fill="#cfc0a0", stroke="#3a2a1a", stroke_width="1.1"))
o(el("circle", cx=921, cy=696, r=4, fill="#7d8597", stroke="#3a2a1a", stroke_width="1"))


def w_miescie_wolne(x, y):
    if not w_wielokacie(x, y, przesun_wiel(MIASTO, 0.93)):
        return False
    if odl_lamana(x, y, RZEKA_G) < 10 or odl_lamana(x, y, DOPLYW_G) < 8:
        return False
    if any(odl_lamana(x, y, u) < 6.5 for u in ULICE_G):
        return False
    if 770 < x < 830 and 586 < y < 636:
        return False
    if 820 < x < 862 and 616 < y < 648:
        return False
    if 900 < x < 942 and 676 < y < 712:
        return False
    return True


domy_miasta = []
for x, y in poisson((750, 570, 960, 750), 12.5, rng, w_miescie_wolne):
    w = rng.uniform(8, 11)
    domy_miasta.append((x, y, w, w * rng.uniform(0.6, 0.75), rng.choice((0, 90)) + rng.uniform(-18, 18)))
out.extend(osada(domy_miasta))
# mosty
for (x1, y1, x2, y2) in ((893, 646, 903, 672), (836, 716, 812, 706)):
    o(el("line", x1=x1, y1=y1, x2=x2, y2=y2, stroke="#8a7452", stroke_width="7", stroke_linecap="butt"))
    o(el("line", x1=x1, y1=y1, x2=x2, y2=y2, stroke="#e0cfa6", stroke_width="4.5", stroke_linecap="butt"))
# mury i baszty
o(el("path", d=catmull(MIASTO, True), fill="none", stroke="#5a4632", stroke_width="4.5", stroke_linejoin="round"))
o(el("path", d=catmull(MIASTO, True), fill="none", stroke="#cdbb94", stroke_width="1.4"))
for i, (tx, ty) in enumerate(MIASTO):
    o(el("circle", cx=tx, cy=ty, r=6.5 if i % 3 else 7.5, fill="#cdbb94", stroke="#3a2a1a", stroke_width="1.4"))
domy_przedmiescia = losowe_domy(728, 676, 18, 4) + losowe_domy(980, 690, 18, 4) + losowe_domy(800, 770, 14, 3)
out.extend(osada(domy_przedmiescia))
o(tekst(904, 790, "WYSOGRÓD", class_="h", font_size="24", font_weight="bold", letter_spacing="4", text_anchor="middle", fill="#2b1d10"))
o(tekst(904, 807, "miasto królewskie", class_="h", font_size="12", font_style="italic", text_anchor="middle", fill=TUSZ))
o("</g>")
print("domy w mieście:", len(domy_miasta), file=sys.stderr)


# ------------------------------------------------------------------ osady klikalne
def osada_klikalna(ident, nazwa, cx, cy, promien, n, napis, rozmiar_napisu=15, dopisek=None, dodatki=(), dach="#b4553c"):
    o(f'<g data-element="{ident}">')
    o(f"<title>{nazwa}</title>")
    out.extend(dodatki)
    out.extend(osada(losowe_domy(cx, cy, promien, n), dach))
    nx_, ny_, kotwica = napis
    o(tekst(nx_, ny_, nazwa, class_="h", font_size=str(rozmiar_napisu), font_weight="bold", letter_spacing="1",
            text_anchor=kotwica, fill="#2b1d10"))
    if dopisek:
        o(tekst(nx_, ny_ + 14, dopisek, class_="h", font_size="11", font_style="italic", text_anchor=kotwica, fill=TUSZ))
    o("</g>")


palisada = el("circle", cx=332, cy=612, r=30, fill="#e6d8b0", stroke="#6b4423", stroke_width="1.6", stroke_dasharray="3 2")
osada_klikalna("wilcza-wolka", "Wilcza Wólka", 332, 612, 22, 6, (332, 666, "middle"), dopisek="osada drwali",
               dodatki=[palisada])
wiatrak = [el("path", d="M612 990 l0 -12 M606 984 l12 -12 M606 972 l12 12", fill="none", stroke="#3a2a1a", stroke_width="1.4"),
           el("circle", cx=612, cy=978, r=3, fill="#d6c7a4", stroke="#3a2a1a", stroke_width="1")]
osada_klikalna("brzezina", "Brzezina", 552, 962, 28, 7, (552, 1012, "middle"), dopisek="wieś", dodatki=wiatrak)
lodzie = [el("path", d="M1196 626 q8 6 16 0 Z M1214 604 q7 5 14 0 Z", fill="#7a5232", stroke="#3a2a1a", stroke_width="0.9"),
          el("path", d="M1186 646 l14 -14 M1192 650 l14 -14", fill="none", stroke="#6b4423", stroke_width="2")]
osada_klikalna("rybaki", "Rybaki", 1170, 668, 18, 5, (1112, 650, "end"), dopisek="wioska rybacka", dodatki=lodzie)
kopalnia = [el("path", d="M1030 444 a10 10 0 0 1 20 0 v6 h-20 Z", fill="#3a2f28", stroke="#3a2a1a", stroke_width="1"),
            el("path", d="M1056 452 q10 -14 22 0 Z", fill="#b9ab90", stroke="#5e5244", stroke_width="1"),
            el("path", d="M1026 430 l8 8 M1034 430 l-8 8", fill="none", stroke="#3a2a1a", stroke_width="1.4")]
osada_klikalna("kamieniec", "Kamieniec", 994, 456, 20, 5, (952, 470, "end"), dopisek="osada górnicza", dodatki=kopalnia, dach="#9a6a48")

# ------------------------------------------------------------------ Przełęcz Wiatrów (klikalna)
o('<g data-element="przelecz-wiatrow">')
o("<title>Przełęcz Wiatrów</title>")
o(el("path", d="M1064 258 q6 6 0 14 M1104 252 q-6 6 0 14", fill="none", stroke="#2b1d10", stroke_width="2.2", stroke_linecap="round"))
o(tekst(1112, 288, "Przełęcz Wiatrów", class_="h", font_size="14", font_weight="bold", font_style="italic", text_anchor="start", fill="#2b1d10"))
o("</g>")

# ------------------------------------------------------------------ Smocza Jama (klikalna)
o('<g data-element="smocza-jama">')
o("<title>Smocza Jama</title>")
o(el("path", d="M1364 372 q0 -16 14 -16 q14 0 14 16 Z", fill="#2a2420", stroke="#2b1d10", stroke_width="1.4"))
o(el("path", d="M1360 378 q18 6 36 0", fill="none", stroke="#2b1d10", stroke_width="1.2"))
o(tekst(1378, 398, "Smocza Jama", class_="h", font_size="13", font_style="italic", font_weight="bold", text_anchor="middle", fill="#2b1d10"))
o("</g>")

# ------------------------------------------------------------------ Ruiny Strażnicy (klikalne)
o('<g data-element="ruiny-straznicy">')
o("<title>Ruiny Strażnicy</title>")
o(el("path", d="M172 412 h14 M192 412 h8 v12 M200 430 v6 h-10 M182 436 h-10 v-8 M172 422 v-4", fill="none", stroke="#4a3e31",
     stroke_width="3", stroke_linecap="square"))
o(el("circle", cx=186, cy=424, r=4.5, fill="#a99c84", stroke="#4a3e31", stroke_width="1.2"))
o(el("path", d="M206 440 l3 -2 M210 444 l3 1 M166 440 l-2 2", fill="none", stroke="#4a3e31", stroke_width="1.6", stroke_linecap="round"))
o(tekst(188, 460, "Ruiny Strażnicy", class_="h", font_size="13", font_style="italic", text_anchor="middle", fill="#2b1d10"))
o("</g>")

# ------------------------------------------------------------------ Pałac Kruków (klikalny; plan: mapa „Pałac”)
o('<g data-element="palac-krukow">')
o("<title>Pałac Kruków</title>")
o(el("path", d="M1452 528 L1530 520 L1546 584 L1462 600 Z", fill="#d9cdb0", stroke="#4a3e31", stroke_width="1.2", stroke_dasharray="4 2"))
o(el("rect", x=1474, y=540, width=46, height=22, fill="#5b5566", stroke="#2b1d10", stroke_width="1.3"))
o(el("rect", x=1468, y=534, width=12, height=34, fill="#4a4458", stroke="#2b1d10", stroke_width="1.2"))
o(el("rect", x=1514, y=534, width=12, height=34, fill="#4a4458", stroke="#2b1d10", stroke_width="1.2"))
o(el("path", d="M1474 534 l0 -8 l6 0 l0 8 M1514 534 l0 -8 l6 0 l0 8 M1497 540 l0 -10", fill="none", stroke="#2b1d10", stroke_width="1.2"))
# martwe drzewa i kruki
o(el("path", d="M1458 612 v-14 l-5 -6 M1458 602 l5 -7 M1538 606 v-13 l4 -6 M1538 597 l-5 -5 M1446 572 v-12 l-4 -5 M1446 564 l4 -4",
     fill="none", stroke="#2b1d10", stroke_width="1.4", stroke_linecap="round"))
o(el("path", d="M1488 512 l4 3 l4 -3 M1500 506 l3 2 l3 -2 M1478 504 l3 2 l3 -2", fill="none", stroke="#2b1d10", stroke_width="1.3",
     stroke_linecap="round", stroke_linejoin="round"))
o(tekst(1496, 628, "Pałac Kruków", class_="h", font_size="15", font_weight="bold", text_anchor="middle", fill="#2b1d10"))
o(tekst(1496, 642, "(plan: mapa „Pałac”)", class_="h", font_size="10", font_style="italic", text_anchor="middle", fill=TUSZ))
o("</g>")

# ------------------------------------------------------------------ MIEJSCA DO ODKRYCIA (na start zasłonięte)
# W manifeście "widocznyDomyslnie": false — aplikacja zasłania je przed graczami, dopóki admin
# ich nie odkryje (także Smoczą Jamę wyżej). Pod każdym jest pełne tło (mokradła, łąka) —
# po zasłonięciu nie zostaje „dziura”, a wszystko, co zdradza miejsce, jest w jego grupie.

# Chata Zielarki — na mokradłach, z kładką i dymem z komina
o('<g data-element="chata-na-mokradlach">')
o("<title>Chata Zielarki</title>")
o(el("path", d="M1004 938 l12 -6 M1007 941 l12 -6", fill="none", stroke="#7a5232", stroke_width="1.4", stroke_linecap="round"))
chata, kalenica_chaty = dom(1026, 928, 14, 10, -8, dach="#6f5a3a")
o(chata)
o(el("path", d=f"M{f(kalenica_chaty[0][0])} {f(kalenica_chaty[0][1])} L{f(kalenica_chaty[1][0])} {f(kalenica_chaty[1][1])}",
     fill="none", stroke="#3a2a1a", stroke_width="0.9"))
o(el("path", d="M1030 921 q-5 -6 1 -11 q6 -5 0 -11", fill="none", stroke="#6b6458", stroke_width="1.1", stroke_linecap="round"))
o(tekst(1042, 934, "Chata Zielarki", class_="h", font_size="13", font_style="italic", font_weight="bold", text_anchor="start",
        fill="#2b1d10"))
o("</g>")

# Stara sztolnia — opuszczone wejście do kopalni nad Kamieńcem
o('<g data-element="stara-sztolnia">')
o("<title>Stara sztolnia</title>")
o(el("path", d="M1100 410 q0 -15 12 -15 q12 0 12 15 Z", fill="#2a2420", stroke="#2b1d10", stroke_width="1.2"))
o(el("path", d="M1098 411 v-17 h28 v17", fill="none", stroke="#7a5232", stroke_width="2.2", stroke_linejoin="round"))
o(el("path", d="M1128 412 q9 -10 18 0 Z", fill="#a99c84", stroke="#6b5a40", stroke_width="1"))
o(el("path", d="M1104 416 l-6 8 M1120 416 l6 8 M1100 420 h24", fill="none", stroke="#5a4a36", stroke_width="1", stroke_linecap="round"))
o(tekst(1114, 440, "Stara sztolnia", class_="h", font_size="13", font_style="italic", font_weight="bold", text_anchor="middle",
        fill="#2b1d10"))
o("</g>")

# ------------------------------------------------------------------ napisy kierunków (tło)
o("<g>")
for x, y, t, kotw, kat in ((1132, 60, "▲ ku Krainom Północnym", "start", 0), (40, 724, "◄ na zachód", "start", 0),
                           (1572, 770, "do Marchii Wschodniej ►", "end", 0), (712, 1066, "▼ do morza", "start", 0)):
    o(tekst(x, y, t, class_="h", font_size="11", font_style="italic", text_anchor=kotw, fill=TUSZ))
o("</g>")

# ------------------------------------------------------------------ kartusz z tytułem
o("<g>")
o(el("rect", x=40, y=36, width=430, height=104, rx=6, fill="#f6eed6", stroke="#5b4128", stroke_width="2.2"))
o(el("rect", x=47, y=43, width=416, height=90, rx=4, fill="none", stroke="#5b4128", stroke_width="0.9"))
o(tekst(255, 84, "KRAINA SREBRNICY", font_size="28", font_weight="bold", letter_spacing="4", text_anchor="middle", fill="#2b1d10"))
o(tekst(255, 108, "mapa wędrowca · północ u góry", font_size="13", font_style="italic", text_anchor="middle", fill=TUSZ))
o(el("path", d="M120 120 h270 M150 124 h210", fill="none", stroke="#8a5a2b", stroke_width="1"))
o("</g>")

# ------------------------------------------------------------------ róża wiatrów
o("<g>")
cx, cy = 1470, 150
o(el("circle", cx=cx, cy=cy, r=52, fill="none", stroke="#5b4128", stroke_width="1.2"))
o(el("circle", cx=cx, cy=cy, r=44, fill="none", stroke="#5b4128", stroke_width="0.7"))
for k in range(8):
    a = math.radians(k * 45 - 90)
    dl = 58 if k % 2 == 0 else 36
    p1 = (cx + dl * math.cos(a), cy + dl * math.sin(a))
    b1 = (cx + 8 * math.cos(a + math.pi / 2), cy + 8 * math.sin(a + math.pi / 2))
    b2 = (cx + 8 * math.cos(a - math.pi / 2), cy + 8 * math.sin(a - math.pi / 2))
    o(el("polygon", points=pts([(cx, cy), b1, p1]), fill="#5b4128" if k % 2 == 0 else "#a88a5a", stroke="#3a2a1a", stroke_width="0.8"))
    o(el("polygon", points=pts([(cx, cy), p1, b2]), fill="#e8d9b2", stroke="#3a2a1a", stroke_width="0.8"))
for t, dx, dy in (("N", 0, -66), ("S", 0, 78), ("E", 72, 5), ("W", -72, 5)):
    o(tekst(cx + dx, cy + dy, t, font_size="15", font_weight="bold", text_anchor="middle", fill="#2b1d10"))
o("</g>")

# ------------------------------------------------------------------ legenda i podziałka
o("<g>")
lx, ly = 1324, 868
o(el("rect", x=lx, y=ly, width=236, height=188, rx=5, fill="#f6eed6", stroke="#5b4128", stroke_width="1.6"))
o(tekst(lx + 14, ly + 24, "LEGENDA", font_size="14", font_weight="bold", letter_spacing="2", fill="#2b1d10"))
pozycje = [("miasto", "miasto (mury i baszty)"), ("wies", "wieś, osada"), ("trakt", "trakt"), ("droga", "droga"),
           ("sciezka", "ścieżka"), ("ruiny", "ruiny"), ("jaskinia", "jaskinia")]
for i, (rodzaj, opis) in enumerate(pozycje):
    y = ly + 46 + i * 20
    x = lx + 16
    if rodzaj == "miasto":
        o(el("circle", cx=x + 12, cy=y - 4, r=7, fill="#e4d4a9", stroke="#5a4632", stroke_width="2.4"))
    elif rodzaj == "wies":
        o(el("rect", x=x + 4, y=y - 9, width=9, height=7, fill="#b4553c", stroke="#3a2a1a", stroke_width="0.9"))
        o(el("rect", x=x + 15, y=y - 6, width=8, height=6, fill="#b4553c", stroke="#3a2a1a", stroke_width="0.9"))
    elif rodzaj in ("trakt", "droga", "sciezka"):
        out.extend(droga([(x, y - 4), (x + 26, y - 4)], rodzaj))
    elif rodzaj == "ruiny":
        o(el("path", d=f"M{x + 4} {y - 1} v-8 h8 M{x + 16} {y - 9} h6 v8", fill="none", stroke="#4a3e31", stroke_width="2.4"))
    elif rodzaj == "jaskinia":
        o(el("path", d=f"M{x + 6} {y} q0 -10 8 -10 q8 0 8 10 Z", fill="#2a2420", stroke="#2b1d10", stroke_width="1"))
    o(tekst(x + 40, y, opis, font_size="12", fill=TUSZ))
# podziałka
px0, py0 = 60, 1040
o(el("rect", x=px0, y=py0, width=200, height=7, fill="#f6eed6", stroke="#3a2a1a", stroke_width="1"))
o(el("rect", x=px0, y=py0, width=50, height=7, fill="#3a2a1a"))
o(el("rect", x=px0 + 100, y=py0, width=50, height=7, fill="#3a2a1a"))
for i, t in enumerate(("0", "5", "10", "15", "20 mil")):
    o(tekst(px0 + i * 50, py0 - 6, t, font_size="11", text_anchor="middle" if i < 4 else "start", fill=TUSZ))
o("</g>")

# ------------------------------------------------------------------ przykład treści tylko dla MG (skrypt ją usuwa)
o('<g class="tylko-mg">')
o(el("rect", x=1076, y=990, width=230, height=64, rx=4, fill="#fbf6e6", stroke="#b0281c", stroke_width="1.6", stroke_dasharray="6 4"))
o(tekst_wiele(1088, 1014, ["Przykład: notatka dla MG.", "Grupę „tylko-mg” skrypt usuwa", "z mapy dla graczy."], 14, font_size="12", fill="#8f1d14"))
o("</g>")

# ------------------------------------------------------------------ ramka
o("<g>")
o(el("rect", x=10, y=10, width=W - 20, height=H - 20, fill="none", stroke="#5b4128", stroke_width="3"))
o(el("rect", x=19, y=19, width=W - 38, height=H - 38, fill="none", stroke="#5b4128", stroke_width="1"))
for x, y in ((14.5, 14.5), (W - 14.5, 14.5), (14.5, H - 14.5), (W - 14.5, H - 14.5)):
    o(el("rect", x=f(x - 6), y=f(y - 6), width=12, height=12, fill="#8a5a2b", stroke="#3a2a1a", stroke_width="1",
         transform=f"rotate(45 {f(x)} {f(y)})"))
o("</g>")
o("</svg>")

zapisz_rysunek(out, "Rysunek_kraina.svg")
