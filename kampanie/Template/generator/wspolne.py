"""Wspólne narzędzia generatorów rysunków kampanii „Wzór”: zapis SVG, gładkie krzywe,
rozkład punktów (np. drzewa w lesie), linie „odręczne”. Tylko biblioteka standardowa Pythona."""
import math
import random
from xml.sax.saxutils import escape


def f(v):
    r = round(float(v), 1)
    if r == 0:
        return "0"
    if r == int(r):
        return str(int(r))
    return f"{r:.1f}"


def pts(lista):
    return " ".join(f"{f(x)},{f(y)}" for x, y in lista)


def atr(**kw):
    out = []
    for k, v in kw.items():
        if v is None:
            continue
        k = k.rstrip("_").replace("__", ":").replace("_", "-")
        out.append(f'{k}="{escape(str(v), {chr(34): "&quot;"})}"')
    return " ".join(out)


def el(tag, **kw):
    return f"<{tag} {atr(**kw)}/>"


def tekst(x, y, t, **kw):
    return f"<text {atr(x=f(x), y=f(y), **kw)}>{escape(t)}</text>"


def tekst_wiele(x, y, linie, odstep, **kw):
    """Napis wieloliniowy: <text> z <tspan x dy>."""
    czesci = []
    for i, linia in enumerate(linie):
        czesci.append(f'<tspan x="{f(x)}" dy="{f(0 if i == 0 else odstep)}">{escape(linia)}</tspan>')
    return f"<text {atr(x=f(x), y=f(y), **kw)}>{''.join(czesci)}</text>"


def catmull(punkty, zamknieta=False):
    """Gładka ścieżka przez punkty (Catmull-Rom → krzywe Béziera)."""
    n = len(punkty)
    if zamknieta:
        P = [punkty[-1]] + list(punkty) + [punkty[0], punkty[1]]
    else:
        P = [punkty[0]] + list(punkty) + [punkty[-1]]
    d = [f"M{f(P[1][0])} {f(P[1][1])}"]
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d.append(f"C{f(c1[0])} {f(c1[1])} {f(c2[0])} {f(c2[1])} {f(p2[0])} {f(p2[1])}")
    if zamknieta:
        d.append("Z")
    return " ".join(d)


def w_wielokacie(x, y, wiel):
    wynik = False
    n = len(wiel)
    j = n - 1
    for i in range(n):
        xi, yi = wiel[i]
        xj, yj = wiel[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi:
            wynik = not wynik
        j = i
    return wynik


def odl_odcinek(px, py, a, b):
    ax, ay = a
    bx, by = b
    dx, dy = bx - ax, by - ay
    l2 = dx * dx + dy * dy
    t = 0 if l2 == 0 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / l2))
    qx, qy = ax + t * dx, ay + t * dy
    return math.hypot(px - qx, py - qy)


def odl_lamana(px, py, lamana):
    return min(odl_odcinek(px, py, lamana[i], lamana[i + 1]) for i in range(len(lamana) - 1))


def probkuj_krzywa(punkty, gestosc=4):
    """Gęsta łamana wzdłuż gładkiej krzywej przez punkty (do liczenia odległości)."""
    P = [punkty[0]] + list(punkty) + [punkty[-1]]
    wynik = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(gestosc):
            t = k / gestosc
            t2, t3 = t * t, t * t * t
            x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3)
            y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
            wynik.append((x, y))
    wynik.append(punkty[-1])
    return wynik


def poisson(ramka, r, rng, warunek, k=24):
    """Rozkład punktów (Bridson) w prostokącie ramka=(x0,y0,x1,y1), z warunkiem warunek(x,y)."""
    x0, y0, x1, y1 = ramka
    kom = r / math.sqrt(2)
    nx, ny = int((x1 - x0) / kom) + 1, int((y1 - y0) / kom) + 1
    siatka = {}
    punkty = []
    aktywne = []

    def dobry(x, y):
        if not (x0 <= x < x1 and y0 <= y < y1):
            return False
        gx, gy = int((x - x0) / kom), int((y - y0) / kom)
        for i in range(max(0, gx - 2), min(nx, gx + 3)):
            for j in range(max(0, gy - 2), min(ny, gy + 3)):
                q = siatka.get((i, j))
                if q and (q[0] - x) ** 2 + (q[1] - y) ** 2 < r * r:
                    return False
        return True

    def dodaj(x, y):
        punkty.append((x, y))
        aktywne.append((x, y))
        siatka[(int((x - x0) / kom), int((y - y0) / kom))] = (x, y)

    # wiele punktów startowych, żeby objąć niespójne obszary
    for _ in range(400):
        x, y = rng.uniform(x0, x1), rng.uniform(y0, y1)
        if warunek(x, y) and dobry(x, y):
            dodaj(x, y)
            break
    proby_startu = 0
    while True:
        while aktywne:
            i = rng.randrange(len(aktywne))
            px, py = aktywne[i]
            for _ in range(k):
                a = rng.uniform(0, 2 * math.pi)
                d = rng.uniform(r, 2 * r)
                x, y = px + d * math.cos(a), py + d * math.sin(a)
                if dobry(x, y) and warunek(x, y):
                    dodaj(x, y)
                    break
            else:
                aktywne.pop(i)
        # dosiej w pustych miejscach (osobne fragmenty obszaru)
        dodano = False
        for _ in range(300):
            x, y = rng.uniform(x0, x1), rng.uniform(y0, y1)
            if warunek(x, y) and dobry(x, y):
                dodaj(x, y)
                dodano = True
                break
        proby_startu += 1
        if not dodano or proby_startu > 200:
            break
    return punkty


def drgajaca(punkty, rng, krok=10, amp=0.8, zamknieta=False):
    """Linia „odręczna”: dzieli odcinki i lekko przesuwa punkty w poprzek."""
    wynik = []
    lista = list(punkty) + ([punkty[0]] if zamknieta else [])
    for i in range(len(lista) - 1):
        (ax, ay), (bx, by) = lista[i], lista[i + 1]
        dl = math.hypot(bx - ax, by - ay)
        n = max(1, int(dl / krok))
        nx_, ny_ = (-(by - ay) / dl, (bx - ax) / dl) if dl else (0, 0)
        for k in range(n):
            t = k / n
            o = rng.uniform(-amp, amp) if (k or i) else 0
            wynik.append((ax + (bx - ax) * t + nx_ * o, ay + (by - ay) * t + ny_ * o))
    if not zamknieta:
        wynik.append(lista[-1])
    return wynik


def sciezka_lamanej(punkty, zamknieta=False):
    d = "M" + " L".join(f"{f(x)} {f(y)}" for x, y in punkty)
    return d + (" Z" if zamknieta else "")
