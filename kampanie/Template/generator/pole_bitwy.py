"""Generator rysunku mapy „Pole bitwy” (Rysunek_pole_bitwy.svg) kampanii „Wzór” — mapa taktyczna sci-fi.

Użycie (z katalogu głównego repozytorium):

    python3 kampanie/Template/generator/pole_bitwy.py
    python3 narzedzia/przygotuj_mape.py kampanie/Template

Zapisuje kampanie/Template/Rysunek_pole_bitwy.svg (ziarno losowania stałe — wynik zawsze ten sam).
Generator jest pomocą, nie obowiązkiem: źródłem mapy jest plik SVG. Jeśli poprawisz rysunek
ręcznie, nie uruchamiaj potem generatora — nadpisze Twoje zmiany.
"""
import math
import random
import sys
from pathlib import Path
from wspolne import (catmull, el, f, odl_lamana, poisson, probkuj_krzywa, pts, sciezka_lamanej, tekst, tekst_wiele,
                     w_wielokacie)

rng = random.Random(247)
W, H = 1500, 1000
GRUNT = "#c9b58b"
TUSZ = "#26231f"
out = []
o = out.append

# ------------------------------------------------------------------ pomocnicze
def offset(punkty, d):
    """Linia równoległa do łamanej (połączenia ukośne, z ograniczeniem)."""
    wynik = []
    n = len(punkty)
    for i in range(n):
        normalne = []
        if i > 0:
            (ax, ay), (bx, by) = punkty[i - 1], punkty[i]
            dl = math.hypot(bx - ax, by - ay) or 1
            normalne.append((-(by - ay) / dl, (bx - ax) / dl))
        if i < n - 1:
            (ax, ay), (bx, by) = punkty[i], punkty[i + 1]
            dl = math.hypot(bx - ax, by - ay) or 1
            normalne.append((-(by - ay) / dl, (bx - ax) / dl))
        mx = sum(v[0] for v in normalne)
        my = sum(v[1] for v in normalne)
        dl = math.hypot(mx, my) or 1
        mx, my = mx / dl, my / dl
        cos = mx * normalne[0][0] + my * normalne[0][1]
        k = d / max(cos, 0.5)
        wynik.append((punkty[i][0] + mx * k, punkty[i][1] + my * k))
    return wynik


def linia_okopu(x0, x1, y_bazy, okres=56, glebokosc=16):
    """Linia okopu „w zęby” (stanowiska i trawersy)."""
    punkty = []
    x = x0
    gora = True
    while x < x1:
        y = y_bazy(x) + (0 if gora else glebokosc)
        nx_ = min(x1, x + okres * rng.uniform(0.8, 1.15))
        punkty.append((x, y))
        punkty.append((nx_, y_bazy(nx_) + (0 if gora else glebokosc)))
        x = nx_
        gora = not gora
    return punkty


def okop(punkty, szer=15, parapet=-1, kolor_dna="#5b4630"):
    """Okop: dno, worki z piaskiem po stronie wroga (parapet=-1: północ), deski na dnie."""
    lewa = offset(punkty, szer / 2)
    prawa = offset(punkty, -szer / 2)
    czesci = [el("polygon", points=pts(lewa + prawa[::-1]), fill=kolor_dna, stroke="#3b2c1d", stroke_width="1.2", stroke_linejoin="round")]
    # deski
    d = []
    for i in range(len(punkty) - 1):
        (ax, ay), (bx, by) = punkty[i], punkty[i + 1]
        dl = math.hypot(bx - ax, by - ay)
        if dl < 1:
            continue
        ux, uy = (bx - ax) / dl, (by - ay) / dl
        nx_, ny_ = -uy, ux
        k = 4.0
        while k < dl - 2:
            cx, cy = ax + ux * k, ay + uy * k
            d.append(f"M{f(cx + nx_ * (szer / 2 - 3))} {f(cy + ny_ * (szer / 2 - 3))} L{f(cx - nx_ * (szer / 2 - 3))} {f(cy - ny_ * (szer / 2 - 3))}")
            k += 6
    czesci.append(el("path", d=" ".join(d), fill="none", stroke="#8a6a3e", stroke_width="1.2"))
    # worki z piaskiem
    worki = offset(punkty, parapet * (szer / 2 + 4))
    czesci += worki_z_piaskiem(worki)
    return czesci


def worki_z_piaskiem(punkty, zamknieta=False):
    d = sciezka_lamanej(punkty, zamknieta)
    szwy = []
    lista = punkty + ([punkty[0]] if zamknieta else [])
    for i in range(len(lista) - 1):
        (ax, ay), (bx, by) = lista[i], lista[i + 1]
        dl = math.hypot(bx - ax, by - ay)
        if dl < 1:
            continue
        ux, uy = (bx - ax) / dl, (by - ay) / dl
        nx_, ny_ = -uy, ux
        k = 5.0
        while k < dl:
            cx, cy = ax + ux * k, ay + uy * k
            szwy.append(f"M{f(cx + nx_ * 3.2)} {f(cy + ny_ * 3.2)} L{f(cx - nx_ * 3.2)} {f(cy - ny_ * 3.2)}")
            k += 9
    return [el("path", d=d, fill="none", stroke="#6f5f3e", stroke_width="8.5", stroke_linejoin="round", stroke_linecap="round"),
            el("path", d=d, fill="none", stroke="#d6c596", stroke_width="6.4", stroke_linejoin="round", stroke_linecap="round"),
            el("path", d=" ".join(szwy), fill="none", stroke="#8f7d52", stroke_width="1")]


def zasieki(punkty):
    """Drut kolczasty: pętle wzdłuż łamanej + paliki."""
    gesta = []
    for i in range(len(punkty) - 1):
        (ax, ay), (bx, by) = punkty[i], punkty[i + 1]
        dl = math.hypot(bx - ax, by - ay)
        n = max(1, int(dl / 6))
        for k in range(n):
            gesta.append((ax + (bx - ax) * k / n, ay + (by - ay) * k / n))
    gesta.append(punkty[-1])
    d = [f"M{f(gesta[0][0])} {f(gesta[0][1])}"]
    for p in gesta[1:]:
        d.append(f"A4.2 4.2 0 1 1 {f(p[0])} {f(p[1])}")
    paliki = " ".join(f"M{f(x - 2.5)} {f(y - 2.5)} l5 5 M{f(x + 2.5)} {f(y - 2.5)} l-5 5" for x, y in gesta[::7])
    return [el("path", d=" ".join(d), fill="none", stroke="#5d6772", stroke_width="0.9"),
            el("path", d=paliki, fill="none", stroke="#3a332a", stroke_width="1.6")]


def lej(cx, cy, r, woda=False):
    def nieregularny(rr, n=11):
        return [(cx + rr * rng.uniform(0.82, 1.12) * math.cos(2 * math.pi * k / n), cy + rr * rng.uniform(0.82, 1.12) * math.sin(2 * math.pi * k / n)) for k in range(n)]
    czesci = [el("path", d=catmull(nieregularny(r * 1.3), True), fill="#dccba3"),
              el("path", d=catmull(nieregularny(r), True), fill="#8a7350", stroke="#5e4a33", stroke_width="0.8"),
              el("path", d=catmull(nieregularny(r * 0.5, 8), True), fill="#6e8c87" if woda else "#574531")]
    return czesci


def ogien(x, y, s=1.0):
    zew = [(x - 9 * s, y), (x - 6 * s, y - 10 * s), (x - 2 * s, y - 6 * s), (x, y - 17 * s), (x + 3 * s, y - 8 * s),
           (x + 7 * s, y - 13 * s), (x + 9 * s, y)]
    wew = [(x - 5 * s, y), (x - 2 * s, y - 7 * s), (x + 1 * s, y - 4 * s), (x + 4 * s, y - 9 * s), (x + 5 * s, y)]
    return [el("polygon", points=pts(zew), fill="#f08a24", stroke="#9a3f12", stroke_width="0.8", stroke_linejoin="round"),
            el("polygon", points=pts(wew), fill="#ffd23a")]


def dym(x, y, kierunek=(1.0, -0.6), n=6, s=1.0):
    czesci = []
    for k in range(n):
        r = (7 + k * 3.2) * s
        czesci.append(el("circle", cx=f(x + kierunek[0] * k * 13 * s), cy=f(y + kierunek[1] * k * 13 * s), r=f(r),
                         fill="#7d7a74", fill_opacity=f(max(0.12, 0.5 - k * 0.07))))
    return czesci


def skrzynia(x, y, w=14, h=10, kat=0, kolor="#6f6a3a"):
    tr = f"rotate({kat} {f(x)} {f(y)})" if kat else None
    return [el("rect", x=f(x - w / 2), y=f(y - h / 2), width=f(w), height=f(h), fill=kolor, stroke=TUSZ, stroke_width="0.9", transform=tr),
            el("path", d=f"M{f(x - w / 2)} {f(y - h / 2)} L{f(x + w / 2)} {f(y + h / 2)} M{f(x + w / 2)} {f(y - h / 2)} L{f(x - w / 2)} {f(y + h / 2)}",
               fill="none", stroke="#3f3b22", stroke_width="0.7", transform=tr)]


def znacznik(x, y, wlasne=True, napis=None, kotwica="start"):
    czesci = []
    if wlasne:
        czesci.append(el("rect", x=f(x - 13), y=f(y - 8), width=26, height=16, fill="#2f6fae", stroke="#12345a", stroke_width="1.2"))
    else:
        czesci.append(el("polygon", points=pts([(x, y - 12), (x + 13, y), (x, y + 12), (x - 13, y)]), fill="#b52a1e", stroke="#5a1410", stroke_width="1.2"))
    czesci.append(el("path", d=f"M{f(x - 7)} {f(y - 4.5)} L{f(x + 7)} {f(y + 4.5)} M{f(x + 7)} {f(y - 4.5)} L{f(x - 7)} {f(y + 4.5)}",
                     fill="none", stroke="#f4f1e8", stroke_width="1.6"))
    if napis:
        dx = 18 if kotwica == "start" else -18
        czesci.append(tekst(x + dx, y + 4, napis, class_="h", font_size="11", font_weight="bold", text_anchor=kotwica,
                            fill="#12345a" if wlasne else "#6e1810"))
    return czesci


def jeze(punkty):
    d = []
    for x, y in punkty:
        d.append(f"M{f(x - 6)} {f(y - 6)} L{f(x + 6)} {f(y + 6)} M{f(x + 6)} {f(y - 6)} L{f(x - 6)} {f(y + 6)} M{f(x)} {f(y - 7)} v14")
    return el("path", d=" ".join(d), fill="none", stroke="#46423c", stroke_width="2.6", stroke_linecap="round")


# ------------------------------------------------------------------ geometria
DROGA = [(272, 1004), (380, 905), (520, 762), (640, 622), (760, 452), (852, 300), (942, 150), (1012, -4)]
DROGA_G = probkuj_krzywa(DROGA, 10)
y_obrony = lambda x: 700 + 14 * math.sin(x / 170)
y_wroga = lambda x: 236 + 12 * math.sin(x / 150 + 1)
PRZERWA_OBRONY = (528, 606)
PRZERWA_WROGA = (850, 922)
NICZYJA = [(24, 318), (300, 304), (620, 322), (900, 300), (1200, 318), (1476, 306), (1476, 628), (1200, 640), (900, 624),
           (600, 644), (300, 628), (24, 640)]
MINY = [(118, 418), (380, 404), (402, 560), (130, 576)]
RUINY = (1080, 350, 1390, 610)


def przy_drodze(x, y, zapas=32):
    return odl_lamana(x, y, DROGA_G) < zapas


# ------------------------------------------------------------------ nagłówek i definicje
o(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="Consolas, monospace">')
o("<title>Rubież Ferrum — sektor 7G. Rysunek mapy pola bitwy (kampania Wzór)</title>")
o("<!-- Rysunek źródłowy mapy „Pole bitwy”. Mapę dla graczy robi skrypt narzedzia/przygotuj_mape.py. -->")
o("<defs>")
o(f"<style>.h {{ stroke: {GRUNT}; stroke-width: 3px; paint-order: stroke; stroke-linejoin: round; }}</style>")
o('<pattern id="ostrzezenie" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
  '<rect width="10" height="10" fill="#f2c12e"/><rect width="5" height="10" fill="#2a2724"/></pattern>')
o('<pattern id="siatka-maskujaca" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">'
  '<path d="M0 0 L8 8 M8 0 L0 8" fill="none" stroke="#4f5a36" stroke-width="1.2"/></pattern>')
o('<pattern id="beton" width="18" height="18" patternUnits="userSpaceOnUse">'
  '<rect width="18" height="18" fill="#a9a69c"/><circle cx="4" cy="5" r="1" fill="#85827a"/><circle cx="13" cy="12" r="1.2" fill="#85827a"/>'
  '<circle cx="10" cy="3" r="0.7" fill="#c4c1b8"/></pattern>')
o('<pattern id="kratownica" width="12" height="12" patternUnits="userSpaceOnUse">'
  '<rect width="12" height="12" fill="#6f6c66"/><path d="M0 0 L12 12 M12 0 L0 12" fill="none" stroke="#3e3c38" stroke-width="1"/></pattern>')
o("</defs>")

# ------------------------------------------------------------------ grunt
o(el("rect", x=0, y=0, width=W, height=H, fill=GRUNT))
for _ in range(16):
    cx, cy = rng.uniform(60, W - 60), rng.uniform(60, H - 60)
    rx, ry = rng.uniform(60, 160), rng.uniform(30, 90)
    plama = [(cx + rx * rng.uniform(0.7, 1.1) * math.cos(2 * math.pi * k / 9), cy + ry * rng.uniform(0.7, 1.1) * math.sin(2 * math.pi * k / 9)) for k in range(9)]
    o(el("path", d=catmull(plama, True), fill=rng.choice(["#b9a273", "#d4c39b", "#bfae84"]), fill_opacity="0.55"))
kamyki = " ".join(f"M{f(x)} {f(y)} h1.6" for x, y in [(rng.uniform(20, W - 20), rng.uniform(20, H - 20)) for _ in range(420)])
o(el("path", d=kamyki, fill="none", stroke="#8b7653", stroke_width="1.6", stroke_linecap="round"))

# siatka taktyczna (pod obiektami)
siatka = " ".join([f"M{x} 0 V{H}" for x in range(125, W, 125)] + [f"M0 {y} H{W}" for y in range(125, H, 125)])
o(el("path", d=siatka, fill="none", stroke="#2f8f9a", stroke_width="0.9", stroke_opacity="0.55"))

# ------------------------------------------------------------------ ZIEMIA NICZYJA (klikalna)
o('<g data-element="ziemia-niczyja">')
o("<title>Ziemia niczyja</title>")
o(el("path", d=catmull(NICZYJA, True), fill="#a48c63", fill_opacity="0.38"))
o(tekst(452, 352, "ZIEMIA NICZYJA", class_="h", font_size="24", font_weight="bold", letter_spacing="7", text_anchor="middle", fill="#3b2c1d"))
o("</g>")

# ------------------------------------------------------------------ leje po pociskach (tło)
STREFY_BEZ_LEJOW = [  # (x0, y0, x1, y1): obiekty i napisy
    (RUINY[0] - 14, RUINY[1] - 14, RUINY[2] + 14, RUINY[3] + 44), (870, 420, 1060, 600), (290, 326, 620, 368),
    (585, 380, 700, 482), (640, 586, 860, 624), (744, 572, 912, 604), (96, 396, 424, 596), (36, 40, 476, 136),
    (1164, 36, 1476, 226), (330, 740, 620, 900), (90, 760, 290, 950), (680, 840, 880, 1000), (940, 840, 1100, 970),
    (1160, 760, 1420, 960), (1100, 740, 1220, 830), (680, 80, 790, 180), (800, 30, 1130, 92), (770, 405, 935, 444)]


def wolne_na_lej(x, y):
    if any(a < x < c and b < y < d for a, b, c, d in STREFY_BEZ_LEJOW):
        return False
    if 330 < y < 620:
        return True
    return rng.random() < 0.06 and abs(y - 700) > 46 and abs(y - 236) > 40


leje = [(x, y) for x, y in poisson((40, 40, W - 40, H - 40), 52, rng, wolne_na_lej) if 44 < y < 960]
szprychy = []
o("<g>")
for x, y in leje:
    r = rng.uniform(7, 13) if not (330 < y < 620) else rng.uniform(8, 22)
    out.extend(lej(x, y, r, woda=rng.random() < 0.25))
    for k in range(rng.randint(5, 8)):
        a = rng.uniform(0, 2 * math.pi)
        szprychy.append(f"M{f(x + r * 1.35 * math.cos(a))} {f(y + r * 1.35 * math.sin(a))} l{f(r * 0.5 * math.cos(a))} {f(r * 0.5 * math.sin(a))}")
o(el("path", d=" ".join(szprychy), fill="none", stroke="#6e5a3e", stroke_width="1", stroke_linecap="round"))
o("</g>")
print("leje:", len(leje), file=sys.stderr)

# skażenie (tło)
o("<g>")
kaluza = [(640 + 46 * rng.uniform(0.75, 1.1) * math.cos(2 * math.pi * k / 12), 424 + 30 * rng.uniform(0.75, 1.1) * math.sin(2 * math.pi * k / 12)) for k in range(12)]
o(el("path", d=catmull(kaluza, True), fill="#8dbf3e", stroke="#4f7a23", stroke_width="2"))
o(el("path", d=catmull([(640 + (x - 640) * 0.6, 424 + (y - 424) * 0.6) for x, y in kaluza], True), fill="#a8d64e"))
for x, y, r in ((628, 418, 3), (652, 430, 2.2), (646, 410, 1.6), (622, 434, 1.8)):
    o(el("circle", cx=x, cy=y, r=r, fill="none", stroke="#4f7a23", stroke_width="0.9"))
o(tekst(640, 470, "SKAŻENIE", class_="h", font_size="11", font_weight="bold", letter_spacing="2", text_anchor="middle", fill="#3d5e18"))
o("</g>")

# ------------------------------------------------------------------ droga (tło)
o("<g>")
lewa = offset(DROGA_G, 22)
prawa = offset(DROGA_G, -22)
o(el("polygon", points=pts(lewa + prawa[::-1]), fill="#5f5b55"))
o(el("path", d=sciezka_lamanej(offset(DROGA_G, 18)), fill="none", stroke="#d8d2c4", stroke_width="1.4"))
o(el("path", d=sciezka_lamanej(offset(DROGA_G, -18)), fill="none", stroke="#d8d2c4", stroke_width="1.4"))
o(el("path", d=sciezka_lamanej(DROGA_G), fill="none", stroke="#e8c547", stroke_width="2", stroke_dasharray="16 12"))
rysy = []
for t in (0.18, 0.33, 0.47, 0.58, 0.72, 0.86):
    x, y = DROGA_G[int(t * len(DROGA_G))]
    rysy.append(f"M{f(x - 12)} {f(y + 3)} l6 -4 l4 5 l5 -3 l7 2")
o(el("path", d=" ".join(rysy), fill="none", stroke="#2f2c28", stroke_width="1.1"))
for t in (0.4, 0.52, 0.63):
    x, y = DROGA_G[int(t * len(DROGA_G))]
    out.extend(lej(x + rng.uniform(-8, 8), y + rng.uniform(-6, 6), 10))
o(tekst(976, 110, "DROGA 7G-NORD", font_size="10", font_weight="bold", letter_spacing="1", text_anchor="middle", fill="#ece6d6",
        transform="rotate(-65 976 110)"))
o("</g>")

# ------------------------------------------------------------------ OKOPY — pierwsza linia (klikalne)
o('<g data-element="okopy-obrony">')
o("<title>Okopy — pierwsza linia</title>")
for x0, x1 in ((40, PRZERWA_OBRONY[0]), (PRZERWA_OBRONY[1], 1460)):
    out.extend(okop(linia_okopu(x0, x1, y_obrony), parapet=-1))
# rowy łącznikowe na tyły
for punkty in ([(200, 712), (206, 752), (196, 790), (204, 820)], [(1010, 712), (1004, 760), (1016, 800), (1010, 846)],
               [(780, 718), (790, 760), (780, 800), (790, 846)]):
    out.extend(okop(punkty, szer=10, parapet=1))
o(tekst(1150, 746, "Okopy — pierwsza linia", class_="h", font_size="15", font_weight="bold", text_anchor="middle", fill="#2a1f12"))
o("</g>")

# ------------------------------------------------------------------ OKOPY WROGA (klikalne)
o('<g data-element="okopy-wroga">')
o("<title>Okopy wroga</title>")
for x0, x1 in ((40, PRZERWA_WROGA[0]), (PRZERWA_WROGA[1], 1460)):
    out.extend(okop(linia_okopu(x0, x1, y_wroga), parapet=1, kolor_dna="#4f3c2a"))
for punkty in ([(420, 228), (414, 190), (424, 150), (418, 120)], [(1240, 230), (1246, 190), (1236, 160)]):
    out.extend(okop(punkty, szer=10, parapet=-1, kolor_dna="#4f3c2a"))
o(tekst(300, 206, "Okopy wroga", class_="h", font_size="15", font_weight="bold", text_anchor="middle", fill="#5a1410"))
o("</g>")

# ------------------------------------------------------------------ zasieki (tło)
o("<g>")
for punkty in ([(40, 652), (300, 664), (520, 650)], [(616, 654), (900, 664), (1200, 650), (1460, 660)],
               [(40, 296), (400, 286), (840, 296)], [(930, 292), (1200, 284), (1460, 294)]):
    out.extend(zasieki(punkty))
o("</g>")

# ------------------------------------------------------------------ POLE MINOWE (klikalne)
o('<g data-element="pole-minowe">')
o("<title>Pole minowe</title>")
o(el("polygon", points=pts(MINY), fill="#b8a57a", fill_opacity="0.35", stroke="#d9a520", stroke_width="2", stroke_dasharray="7 5"))
miny = poisson((130, 420, 390, 570), 26, rng, lambda x, y: w_wielokacie(x, y, MINY) and not (170 < x < 350 and 476 < y < 506))
o(el("path", d=" ".join(f"M{f(x)} {f(y)} m-3.2 0 a3.2 3.2 0 1 0 6.4 0 a3.2 3.2 0 1 0 -6.4 0" for x, y in miny), fill="#4a4844", stroke="#26231f", stroke_width="0.8"))
o(el("path", d=" ".join(f"M{f(x - 2)} {f(y)} h4 M{f(x)} {f(y - 2)} v4" for x, y in miny), fill="none", stroke="#d8d2c4", stroke_width="0.8"))
for x, y in ((118, 418), (380, 404), (402, 560), (130, 576)):
    o(el("polygon", points=pts([(x, y - 14), (x + 8, y), (x - 8, y)]), fill="#f2c12e", stroke="#26231f", stroke_width="1"))
o(tekst(260, 496, "Pole minowe", class_="h", font_size="15", font_weight="bold", text_anchor="middle", fill="#5a3a10"))
o("</g>")

# ------------------------------------------------------------------ BARYKADA DROGOWA (klikalna)
o('<g data-element="barykada-drogowa">')
o("<title>Barykada drogowa</title>")
bx, by = 604, 646  # na drodze przed własną linią
kat = -52  # w poprzek drogi
for k in range(-3, 4):
    cx, cy = bx + k * 16 * math.cos(math.radians(kat)), by + k * 16 * math.sin(math.radians(kat))
    o(el("rect", x=f(cx - 7), y=f(cy - 6), width=14, height=12, fill="url(#ostrzezenie)", stroke=TUSZ, stroke_width="1.2",
         transform=f"rotate({kat} {f(cx)} {f(cy)})"))
out.extend(worki_z_piaskiem([(548, 664), (566, 686)]))
out.extend(worki_z_piaskiem([(640, 610), (662, 628)]))
o(jeze([(586, 610), (608, 598), (630, 588), (574, 626), (650, 574)]))
o(tekst(690, 606, "Barykada drogowa", class_="h", font_size="15", font_weight="bold", text_anchor="start", fill="#2a1f12"))
o("</g>")

# barykada wroga na drodze (tło)
o("<g>")
for k in range(-2, 3):
    cx, cy = 884 + k * 15 * math.cos(math.radians(-60)), 270 + k * 15 * math.sin(math.radians(-60))
    o(el("rect", x=f(cx - 6), y=f(cy - 6), width=12, height=12, fill="#8a8780", stroke=TUSZ, stroke_width="1.1", transform=f"rotate(-60 {f(cx)} {f(cy)})"))
o(jeze([(862, 312), (884, 318), (906, 310)]))
o("</g>")

# ------------------------------------------------------------------ RUINY MANUFAKTURY (klikalne)
o('<g data-element="ruiny-manufaktury">')
o("<title>Ruiny manufaktury</title>")
x0, y0, x1, y1 = RUINY
o(el("polygon", points=pts([(x0 + 10, y0 + 20), (x1 - 30, y0), (x1, y1 - 40), (x0 + 40, y1)]), fill="url(#beton)", fill_opacity="0.9"))
sciany = [[(x0 + 10, y0 + 20), (x0 + 120, y0 + 12)], [(x0 + 150, y0 + 10), (x1 - 30, y0)], [(x1 - 30, y0), (x1 - 12, y0 + 120)],
          [(x1 - 6, y0 + 160), (x1, y1 - 40)], [(x1, y1 - 40), (x1 - 110, y1 - 18)], [(x0 + 120, y1 - 8), (x0 + 40, y1)],
          [(x0 + 40, y1), (x0 + 22, y0 + 160)], [(x0 + 16, y0 + 110), (x0 + 10, y0 + 20)],
          [(x0 + 120, y0 + 12), (x0 + 128, y0 + 110)], [(x0 + 128, y0 + 140), (x0 + 136, y1 - 10)], [(x0 + 136, y0 + 130), (x1 - 80, y0 + 122)]]
for s in sciany:
    o(el("path", d=sciezka_lamanej(s), fill="none", stroke="#4f4c46", stroke_width="9", stroke_linecap="butt"))
    o(el("path", d=sciezka_lamanej(s), fill="none", stroke="#8c8980", stroke_width="5", stroke_linecap="butt"))
gruz = []
for x, y in poisson((x0, y0, x1, y1), 9, rng, lambda x, y: rng.random() < 0.35):
    s = rng.uniform(2, 5)
    gruz.append(f"M{f(x)} {f(y)} l{f(s)} {f(-s * 0.6)} l{f(s * 0.4)} {f(s)} Z")
o(el("path", d=" ".join(gruz), fill="#6e6b64", stroke="#3e3c38", stroke_width="0.6"))
# wielkie koło zębate (resztki maszyny)
cx, cy = x0 + 220, y0 + 210
zeby = []
for k in range(24):
    a1 = 2 * math.pi * k / 24
    r = 36 if k % 2 == 0 else 29
    zeby.append((cx + r * math.cos(a1), cy + r * math.sin(a1)))
o(el("polygon", points=pts(zeby), fill="#8a5a32", stroke="#3e2a18", stroke_width="1.4"))
o(el("circle", cx=f(cx), cy=f(cy), r=12, fill="#5d5a55", stroke="#3e2a18", stroke_width="1.2"))
o(el("path", d=f"M{f(x0 + 60)} {f(y0 + 70)} a26 26 0 0 1 52 0", fill="none", stroke="#4f4c46", stroke_width="6"))
out.extend(ogien(x0 + 70, y0 + 210, 1.1))
out.extend(dym(x0 + 72, y0 + 192, (0.8, -0.8), 5, 0.9))
o(tekst(x0 + 160, y1 + 30, "Ruiny manufaktury", class_="h", font_size="16", font_weight="bold", text_anchor="middle", fill="#2a1f12"))
o("</g>")

# ------------------------------------------------------------------ WRAK TRANSPORTERA (klikalny)
o('<g data-element="wrak-transportera">')
o("<title>Wrak transportera</title>")
wx, wy = 960, 500
tr = f"rotate(28 {wx} {wy})"
o(el("rect", x=wx - 30, y=wy - 52, width=60, height=104, rx=6, fill="#3a3430", stroke="#1a1714", stroke_width="1.4", transform=tr))
o(el("rect", x=wx - 38, y=wy - 48, width=10, height=96, fill="#24211e", transform=tr))
o(el("rect", x=wx + 28, y=wy - 30, width=10, height=70, fill="#24211e", transform=tr))
o(el("path", d=f"M{wx - 20} {wy - 30} l40 18 M{wx - 18} {wy + 10} l34 -8 M{wx - 10} {wy + 30} l26 6", fill="none", stroke="#6e3a1e", stroke_width="2", transform=tr))
o(el("rect", x=wx + 32, y=wy + 52, width=10, height=26, fill="#24211e", transform=f"rotate(70 {wx} {wy})"))
out.extend(ogien(wx - 6, wy - 4, 1.4))
out.extend(ogien(wx + 14, wy + 18, 1.0))
out.extend(dym(wx + 4, wy - 20, (1.0, -0.9), 7, 1.1))
o(tekst_wiele(wx - 48, wy - 72, ["Wrak", "transportera"], 16, class_="h", font_size="15", font_weight="bold", text_anchor="end", fill="#2a1f12"))
o("</g>")

# ------------------------------------------------------------------ BUNKIER DOWODZENIA (klikalny)
o('<g data-element="bunkier-dowodzenia">')
o("<title>Bunkier dowodzenia</title>")
cx, cy = 190, 846
osm = [(cx + 62 * math.cos(math.pi / 8 + k * math.pi / 4), cy + 44 * math.sin(math.pi / 8 + k * math.pi / 4)) for k in range(8)]
out.extend(worki_z_piaskiem([(cx + 74 * math.cos(math.pi / 8 + k * math.pi / 4), cy + 56 * math.sin(math.pi / 8 + k * math.pi / 4)) for k in range(8)], zamknieta=True))
o(el("polygon", points=pts(osm), fill="url(#beton)", stroke="#3a3a38", stroke_width="4", stroke_linejoin="round"))
o(el("rect", x=cx - 30, y=cy - 18, width=60, height=36, fill="#3a3a38", stroke="#1e1e1c", stroke_width="1"))
o(el("path", d=f"M{cx - 40} {cy - 40} h22 M{cx - 8} {cy - 44} h16 M{cx + 18} {cy - 40} h22", fill="none", stroke="#1e1e1c", stroke_width="3"))
o(el("circle", cx=cx + 38, cy=cy + 18, r=9, fill="#c8c4b8", stroke=TUSZ, stroke_width="1.2"))
o(el("path", d=f"M{cx + 38} {cy + 18} l7 -7 M{cx - 40} {cy + 10} l-26 -22", fill="none", stroke=TUSZ, stroke_width="1.4"))
o(el("polygon", points=pts([(cx - 70, cy - 30), (cx - 20, cy - 52), (cx + 30, cy - 46), (cx - 30, cy - 10)]), fill="url(#siatka-maskujaca)"))
o(el("circle", cx=cx - 66, cy=cy - 12, r=3, fill="#4fc3e8", stroke=TUSZ, stroke_width="0.8"))
o(tekst(cx, cy + 82, "Bunkier dowodzenia", class_="h", font_size="15", font_weight="bold", text_anchor="middle", fill="#2a1f12"))
o("</g>")

# ------------------------------------------------------------------ CZOŁG (klikalny)
o('<g data-element="czolg">')
o("<title>Czołg „Młot”</title>")
tx, ty, tkat = 452, 840, 38  # przodem na północny wschód, wzdłuż drogi
def T(*a):
    return f"rotate({tkat} {tx} {ty})"
# ślady gąsienic za czołgiem
slady = []
for dx in (-37, 37):
    p = [(tx + dx * math.cos(math.radians(tkat)) - s * math.sin(math.radians(tkat)), ty + dx * math.sin(math.radians(tkat)) + s * math.cos(math.radians(tkat))) for s in (70, 120, 170)]
    slady.append(sciezka_lamanej(p))
o(el("path", d=" ".join(slady), fill="none", stroke="#8a7350", stroke_width="16", stroke_opacity="0.5"))
o(el("path", d=" ".join(slady), fill="none", stroke="#6e5a3e", stroke_width="12", stroke_dasharray="2 4", stroke_opacity="0.7"))
out.extend(dym(tx - 70 * math.sin(math.radians(tkat)) * 0.62, ty + 70 * math.cos(math.radians(tkat)) + 4, (-0.35, 0.9), 4, 0.8))
g = f'<g transform="rotate({tkat} {tx} {ty})">'
o(g)
o(el("rect", x=tx - 46, y=ty - 72, width=18, height=144, rx=3, fill="#3a3a36", stroke="#1e1e1c", stroke_width="1.2"))
o(el("rect", x=tx + 28, y=ty - 72, width=18, height=144, rx=3, fill="#3a3a36", stroke="#1e1e1c", stroke_width="1.2"))
o(el("path", d=" ".join(f"M{tx - 46} {ty - 70 + k * 6} h18 M{tx + 28} {ty - 70 + k * 6} h18" for k in range(24)), fill="none", stroke="#5c5c56", stroke_width="1.1"))
o(el("rect", x=tx - 30, y=ty - 66, width=60, height=136, rx=4, fill="#6b7a4a", stroke="#2a3020", stroke_width="1.6"))
o(el("polygon", points=pts([(tx - 30, ty - 52), (tx - 24, ty - 66), (tx + 24, ty - 66), (tx + 30, ty - 52)]), fill="#7d8c58", stroke="#2a3020", stroke_width="1"))
for poly, kolor in (([(tx - 26, ty - 40), (tx - 8, ty - 46), (tx - 2, ty - 30), (tx - 20, ty - 22)], "#4f5a36"),
                    ([(tx + 6, ty + 18), (tx + 26, ty + 12), (tx + 24, ty + 36), (tx + 8, ty + 32)], "#4f5a36"),
                    ([(tx - 26, ty + 40), (tx - 10, ty + 34), (tx - 6, ty + 52), (tx - 24, ty + 56)], "#8e8e6a")):
    o(el("polygon", points=pts(poly), fill=kolor))
o(el("rect", x=tx - 24, y=ty + 34, width=48, height=30, fill="#5a6640", stroke="#2a3020", stroke_width="1"))
o(el("path", d=" ".join(f"M{tx - 20} {ty + 38 + k * 5} h40" for k in range(5)), fill="none", stroke="#39412a", stroke_width="1.2"))
o(el("rect", x=tx - 30, y=ty + 66, width=60, height=6, fill="url(#ostrzezenie)", stroke="#1e1e1c", stroke_width="0.8"))
for sx in (-1, 1):
    o(el("rect", x=tx + sx * 46 - (10 if sx < 0 else 0), y=ty - 14, width=10, height=26, fill="#5a6640", stroke="#2a3020", stroke_width="1.1"))
    o(el("rect", x=tx + sx * 56 - (12 if sx < 0 else 0), y=ty - 6, width=12, height=4, fill="#4a4f3e", stroke="#1e1e1c", stroke_width="0.8"))
o(el("rect", x=tx - 5, y=ty - 150, width=10, height=124, fill="#4a4f3e", stroke="#1e1e1c", stroke_width="1.1"))
o(el("rect", x=tx - 8, y=ty - 160, width=16, height=12, fill="#3a3e30", stroke="#1e1e1c", stroke_width="1"))
o(el("path", d=f"M{tx - 25} {ty - 30} L{tx - 15} {ty - 42} H{tx + 15} L{tx + 25} {ty - 30} V{ty + 14} L{tx + 15} {ty + 24} H{tx - 15} L{tx - 25} {ty + 14} Z",
     fill="#7d8c58", stroke="#2a3020", stroke_width="1.6"))
o(el("circle", cx=tx + 9, cy=ty + 2, r=7.5, fill="#6b7a4a", stroke="#2a3020", stroke_width="1.2"))
o(el("rect", x=tx - 16, y=ty - 2, width=10, height=6, fill="#4fc3e8", stroke="#1e1e1c", stroke_width="0.8"))
o(el("path", d=f"M{tx - 18} {ty + 16} l-16 22", fill="none", stroke="#1e1e1c", stroke_width="1.2"))
o(tekst(tx, ty + 56, "VII-3", font_size="9", font_weight="bold", text_anchor="middle", fill="#f4f1e8"))
o("</g>")
o(tekst(tx + 94, ty + 6, "Czołg „Młot”", class_="h", font_size="16", font_weight="bold", text_anchor="start", fill="#2a1f12"))
o(tekst(tx + 94, ty + 21, "czołg ciężki, 7. kompania", class_="h", font_size="11", font_style="italic", text_anchor="start", fill="#3b2c1d"))
o("</g>")

# ------------------------------------------------------------------ STANOWISKO ARTYLERII (klikalne)
o('<g data-element="stanowisko-artylerii">')
o("<title>Stanowisko artylerii</title>")
for cx, cy in ((720, 900), (812, 916)):
    out.extend(worki_z_piaskiem([(cx + 30 * math.cos(a), cy + 24 * math.sin(a)) for a in [math.pi * (0.15 + k / 9 * 1.7) for k in range(10)]]))
    o(el("rect", x=cx - 10, y=cy - 8, width=20, height=18, rx=3, fill="#5a6640", stroke="#2a3020", stroke_width="1.2"))
    o(el("rect", x=cx - 3, y=cy - 52, width=6, height=46, fill="#4a4f3e", stroke="#1e1e1c", stroke_width="1"))
    o(el("path", d=f"M{cx - 10} {cy + 10} l-16 14 M{cx + 10} {cy + 10} l16 14", fill="none", stroke="#2a3020", stroke_width="2.4"))
for k in range(5):
    o(el("rect", x=760 + k * 6, y=948, width=4, height=12, rx=2, fill="#c9a24a", stroke="#5a4416", stroke_width="0.6"))
o(tekst(766, 984, "Stanowisko artylerii", class_="h", font_size="15", font_weight="bold", text_anchor="middle", fill="#2a1f12"))
o("</g>")

# ------------------------------------------------------------------ SKŁAD AMUNICJI (klikalny)
o('<g data-element="sklad-amunicji">')
o("<title>Skład amunicji</title>")
o(el("rect", x=960, y=856, width=124, height=78, fill="url(#siatka-maskujaca)", stroke="#4f5a36", stroke_width="1.2"))
for i, (x, y) in enumerate([(978, 872), (994, 872), (1010, 872), (978, 884), (994, 884), (1026, 892), (1042, 892), (1034, 904),
                            (980, 912), (996, 912), (1012, 912)]):
    out.extend(skrzynia(x, y, kolor="#6f6a3a" if i % 3 else "#7a5a32"))
for x, y in ((1064, 872), (1072, 888), (1060, 902), (1070, 918)):
    o(el("circle", cx=x, cy=y, r=6.5, fill="#b5542a", stroke="#4a1e0c", stroke_width="1"))
    o(el("circle", cx=x, cy=y, r=2, fill="#4a1e0c"))
o(tekst(1022, 954, "Skład amunicji", class_="h", font_size="15", font_weight="bold", text_anchor="middle", fill="#2a1f12"))
o("</g>")

# ------------------------------------------------------------------ LĄDOWISKO (klikalne)
o('<g data-element="ladowisko">')
o("<title>Lądowisko</title>")
lx, ly = 1322, 862
o(el("circle", cx=lx, cy=ly, r=74, fill="url(#ostrzezenie)", stroke="#1e1e1c", stroke_width="1.2"))
o(el("circle", cx=lx, cy=ly, r=64, fill="#5d5a55", stroke="#e8c547", stroke_width="3"))
o(el("path", d=f"M{lx - 26} {ly - 18} L{lx} {ly + 14} L{lx + 26} {ly - 18} M{lx - 26} {ly - 2} L{lx} {ly + 30} L{lx + 26} {ly - 2}",
     fill="none", stroke="#f4f1e8", stroke_width="5", stroke_linejoin="miter"))
for k in range(8):
    a = 2 * math.pi * k / 8
    o(el("circle", cx=f(lx + 57 * math.cos(a)), cy=f(ly + 57 * math.sin(a)), r=3, fill="#4fc3e8", stroke="#1e1e1c", stroke_width="0.8"))
o(el("rect", x=lx - 140, y=ly + 40, width=28, height=48, rx=12, fill="#9a9890", stroke=TUSZ, stroke_width="1.2"))
o(el("path", d=f"M{lx - 126} {ly + 40} v-24 h46", fill="none", stroke="#3a3a38", stroke_width="2"))
o(tekst(lx, ly - 86, "Lądowisko", class_="h", font_size="16", font_weight="bold", text_anchor="middle", fill="#2a1f12"))
o("</g>")

# ------------------------------------------------------------------ tyły: wieża łączności, kable, znaczniki jednostek (tło)
o("<g>")
wx, wy = 1150, 790
o(el("rect", x=wx - 14, y=wy - 14, width=28, height=28, fill="url(#kratownica)", stroke=TUSZ, stroke_width="1.2"))
o(el("circle", cx=wx + 26, cy=wy - 20, r=11, fill="#c8c4b8", stroke=TUSZ, stroke_width="1.2"))
o(el("path", d=f"M{wx} {wy} L{wx + 26} {wy - 20}", fill="none", stroke="#26231f", stroke_width="1.2"))
o(tekst(wx, wy + 32, "wieża łączności", class_="h", font_size="11", font_style="italic", text_anchor="middle", fill="#2a1f12"))
for x, y, t in ((140, 760, "1. pluton"), (360, 740, "2. pluton"), (900, 762, "3. pluton"), (1300, 748, "4. pluton")):
    out.extend(znacznik(x, y, True, t))
for x, y, t in ((560, 168, "wróg (szac.)"), (1060, 186, "wróg (szac.)"), (190, 160, None)):
    out.extend(znacznik(x, y, False, t))
# kierunek natarcia (strzałka)
grot = [(1112, 572), (1088, 560), (1100, 594)]
o(el("path", d="M884 640 C 950 630, 1030 610, 1094 578", fill="none", stroke="#2f6fae", stroke_width="5", stroke_opacity="0.75", stroke_linecap="round"))
o(el("polygon", points=pts(grot), fill="#2f6fae", fill_opacity="0.85", stroke="#12345a", stroke_width="1"))
o("</g>")

# bunkier wroga i spalone drzewa na zapleczu wroga (tło)
o("<g>")
o(el("rect", x=690, y=96, width=80, height=50, rx=8, fill="#8a8780", stroke="#3a3a38", stroke_width="3"))
o(el("path", d="M700 146 h20 M740 146 h20", fill="none", stroke="#1e1e1c", stroke_width="3"))
o(tekst(730, 168, "bunkier wroga", class_="h", font_size="11", font_style="italic", text_anchor="middle", fill="#5a1410"))
pnie = []
for x, y in ((620, 70), (650, 104), (860, 90), (1110, 110), (1150, 80), (300, 120), (340, 140), (1400, 120)):
    pnie.append(f"M{x} {y} l0 -14 M{x} {y - 8} l-6 -5 M{x} {y - 10} l5 -6")
o(el("path", d=" ".join(pnie), fill="none", stroke="#2e2a25", stroke_width="1.8", stroke_linecap="round"))
o("</g>")

# ------------------------------------------------------------------ opisy siatki
o("<g>")
for i, litera in enumerate("ABCDEFGHIJKL"):
    o(tekst(62 + i * 125, 34, litera, font_size="13", font_weight="bold", text_anchor="middle", fill="#1f6f7a"))
for j in range(8):
    o(tekst(30, 70 + j * 125, str(j + 1), font_size="13", font_weight="bold", text_anchor="middle", fill="#1f6f7a"))
o("</g>")

# ------------------------------------------------------------------ tytuł, legenda, podziałka, północ
o("<g>")
o(el("rect", x=44, y=50, width=420, height=78, fill="#e6dcc0", stroke="#26231f", stroke_width="1.6"))
o(el("rect", x=44, y=50, width=420, height=9, fill="url(#ostrzezenie)", stroke="#26231f", stroke_width="1"))
o(tekst(58, 88, "RUBIEŻ FERRUM · SEKTOR 7G", font_size="22", font_weight="bold", letter_spacing="1", fill="#1e1b17"))
o(tekst(58, 112, "mapa taktyczna · zwiad orbitalny · dzień 247", font_size="12", fill="#3b3a36"))
o(el("path", d="M440 70 L452 104 L440 96 L428 104 Z", fill="#26231f"))
o(tekst(440, 122, "N", font_size="12", font_weight="bold", text_anchor="middle", fill="#26231f"))
lx, ly = 1176, 44
o(el("rect", x=lx, y=ly, width=290, height=174, fill="#e6dcc0", stroke="#26231f", stroke_width="1.6"))
o(tekst(lx + 12, ly + 22, "LEGENDA", font_size="13", font_weight="bold", letter_spacing="2", fill="#1e1b17"))
pozycje = ["okopy", "zasieki", "barykada", "lej po pocisku", "siły własne", "wróg (szacunkowo)", "skażenie", "kierunek natarcia"]
for i, opis in enumerate(pozycje):
    y = ly + 40 + i * 17
    x = lx + 14
    if opis == "okopy":
        o(el("rect", x=x, y=y - 8, width=30, height=8, fill="#5b4630", stroke="#3b2c1d", stroke_width="1"))
        o(el("path", d=f"M{x} {y - 10} h30", fill="none", stroke="#d6c596", stroke_width="3"))
    elif opis == "zasieki":
        out.extend(zasieki([(x, y - 5), (x + 30, y - 5)]))
    elif opis == "barykada":
        o(el("rect", x=x + 4, y=y - 11, width=22, height=10, fill="url(#ostrzezenie)", stroke=TUSZ, stroke_width="1"))
    elif opis == "lej po pocisku":
        o(el("circle", cx=x + 15, cy=y - 5, r=7, fill="#8a7350", stroke="#5e4a33", stroke_width="0.8"))
        o(el("circle", cx=x + 15, cy=y - 5, r=3, fill="#574531"))
    elif opis == "siły własne":
        out.extend(znacznik(x + 15, y - 5, True))
    elif opis == "wróg (szacunkowo)":
        out.extend(znacznik(x + 15, y - 5, False))
    elif opis == "skażenie":
        o(el("ellipse", cx=x + 15, cy=y - 5, rx=13, ry=6, fill="#8dbf3e", stroke="#4f7a23", stroke_width="1.2"))
    elif opis == "kierunek natarcia":
        o(el("path", d=f"M{x} {y - 4} h22", fill="none", stroke="#2f6fae", stroke_width="4", stroke_opacity="0.75"))
        o(el("polygon", points=pts([(x + 22, y - 10), (x + 32, y - 4), (x + 22, y + 2)]), fill="#2f6fae", stroke="#12345a", stroke_width="0.8"))
    o(tekst(x + 44, y, opis, font_size="11", fill="#1e1b17"))
o(el("rect", x=50, y=962, width=200, height=7, fill="#e6dcc0", stroke="#26231f", stroke_width="1"))
o(el("rect", x=50, y=962, width=50, height=7, fill="#26231f"))
o(el("rect", x=150, y=962, width=50, height=7, fill="#26231f"))
for i, t in enumerate(("0", "25", "50", "75", "100 m")):
    o(tekst(50 + i * 50, 956, t, font_size="11", text_anchor="middle" if i < 4 else "start", fill="#26231f"))
o("</g>")

# ------------------------------------------------------------------ przykład treści tylko dla MG (skrypt ją usuwa)
o('<g class="tylko-mg">')
o(el("rect", x=820, y=36, width=300, height=46, rx=4, fill="#fbf6e6", stroke="#b0281c", stroke_width="1.6", stroke_dasharray="6 4"))
o(tekst_wiele(832, 55, ["Przykład: notatka dla MG — skrypt usuwa", "grupę „tylko-mg” z mapy dla graczy."], 16, font_size="11", fill="#8f1d14"))
o("</g>")

# ------------------------------------------------------------------ ramka
o("<g>")
o(el("rect", x=8, y=8, width=W - 16, height=H - 16, fill="none", stroke="#26231f", stroke_width="3"))
o(el("rect", x=16, y=16, width=W - 32, height=H - 32, fill="none", stroke="#2f8f9a", stroke_width="1.2"))
for x, y, sx, sy in ((16, 16, 1, 1), (W - 16, 16, -1, 1), (16, H - 16, 1, -1), (W - 16, H - 16, -1, -1)):
    o(el("path", d=f"M{x} {y + sy * 26} V{y} H{x + sx * 26}", fill="none", stroke="#2f8f9a", stroke_width="4"))
o("</g>")
o("</svg>")

sciezka = sys.argv[1] if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent / "Rysunek_pole_bitwy.svg"
with open(sciezka, "w", encoding="utf-8") as plik:
    plik.write("\n".join(out) + "\n")
print("elementów:", sum(s.count("<") - s.count("</") for s in out), file=sys.stderr)
