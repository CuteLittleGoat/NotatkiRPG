"""Generator rysunku mapy „Pałac” (Rysunek_palac.svg) kampanii „Wzór” — szkic planu w klimacie horroru.

Użycie (z katalogu głównego repozytorium):

    python3 kampanie/Template/generator/palac.py
    python3 narzedzia/przygotuj_mape.py kampanie/Template

Zapisuje kampanie/Template/Rysunek_palac.svg (ziarno losowania stałe — wynik zawsze ten sam).
Generator jest pomocą, nie obowiązkiem: źródłem mapy jest plik SVG. Jeśli poprawisz rysunek
ręcznie, nie uruchamiaj potem generatora — nadpisze Twoje zmiany.
"""
import math
import random
import sys
from pathlib import Path
from wspolne import atr, catmull, drgajaca, el, f, pts, sciezka_lamanej, tekst, tekst_wiele

rng = random.Random(1924)
W, H = 1400, 1000
PAPIER = "#ebdfbf"
TUSZ = "#3b2a1e"
OLOWEK_CZ = "#a8352a"  # czerwony ołówek — tylko linie ciągłe
OLOWEK_NB = "#2f5a8a"
out = []
o = out.append


def linia(punkty, kolor=TUSZ, grubosc=1.2, amp=0.6, krok=12, **kw):
    kw.setdefault("stroke_linecap", "round")
    return el("path", d=sciezka_lamanej(drgajaca(punkty, rng, krok, amp)), fill="none", stroke=kolor, stroke_width=grubosc,
              stroke_linejoin="round", **kw)


def prostokat_odreczny(x, y, w, h, kolor=TUSZ, grubosc=1.1, amp=0.5, wypelnienie="none", **kw):
    p = drgajaca([(x, y), (x + w, y), (x + w, y + h), (x, y + h)], rng, 14, amp, zamknieta=True)
    return el("path", d=sciezka_lamanej(p, True), fill=wypelnienie, stroke=kolor, stroke_width=grubosc, stroke_linejoin="round", **kw)


# ------------------------------------------------------------------ nagłówek
o(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="\'Segoe Print\', \'Comic Sans MS\', cursive">')
o("<title>Pałac Kruków — parter. Rysunek planu (kampania Wzór)</title>")
o("<!-- Rysunek źródłowy mapy „Pałac”. Mapę dla graczy robi skrypt narzedzia/przygotuj_mape.py. -->")
o("<defs>")
o(f"<style>.h {{ stroke: {PAPIER}; stroke-width: 3px; paint-order: stroke; stroke-linejoin: round; }}</style>")
o('<pattern id="siatka" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0 L0 0 0 20" fill="none" stroke="#b4c3d2" stroke-width="0.7"/></pattern>')
o('<pattern id="szachownica" width="20" height="20" patternUnits="userSpaceOnUse">'
  '<rect width="20" height="20" fill="#e9e3d4"/><rect width="10" height="10" fill="#aaa496"/><rect x="10" y="10" width="10" height="10" fill="#aaa496"/></pattern>')
o('<pattern id="parkiet" width="14" height="14" patternUnits="userSpaceOnUse">'
  '<rect width="14" height="14" fill="#dcbc84"/><path d="M0 7 L7 0 M7 14 L14 7 M7 0 L14 7 M0 7 L7 14" fill="none" stroke="#b08c55" stroke-width="0.9"/></pattern>')
o('<pattern id="terakota" width="16" height="16" patternUnits="userSpaceOnUse">'
  '<rect width="16" height="16" fill="#d49a78"/><path d="M0 0 H16 M0 0 V16" fill="none" stroke="#9a6248" stroke-width="1"/></pattern>')
o('<pattern id="zwir" width="11" height="11" patternUnits="userSpaceOnUse">'
  '<rect width="11" height="11" fill="#d9ceb0"/><circle cx="2" cy="3" r="1" fill="#958867"/><circle cx="7.5" cy="8" r="0.9" fill="#958867"/><circle cx="8" cy="2.5" r="0.6" fill="#a99c7c"/></pattern>')
o('<pattern id="deski" width="40" height="12" patternUnits="userSpaceOnUse">'
  '<rect width="40" height="12" fill="#d3bb8e"/><path d="M0 0 H40 M24 0 V12" fill="none" stroke="#a88c5d" stroke-width="0.8"/></pattern>')
o('<pattern id="kamien" width="24" height="16" patternUnits="userSpaceOnUse">'
  '<rect width="24" height="16" fill="#cfc8b8"/><path d="M0 0 H24 M0 8 H24 M12 0 V8 M0 8 V16" fill="none" stroke="#968e7c" stroke-width="0.8"/></pattern>')
o("</defs>")

# ------------------------------------------------------------------ papier
o(el("rect", x=0, y=0, width=W, height=H, fill=PAPIER))
o(el("rect", x=0, y=0, width=W, height=H, fill="url(#siatka)"))
# pożółkłe brzegi i plamy
brzeg = []
for k in range(64):
    a = 2 * math.pi * k / 64
    rx, ry = W / 2 - 18 - rng.uniform(0, 14), H / 2 - 18 - rng.uniform(0, 14)
    brzeg.append((W / 2 + rx * math.cos(a), H / 2 + ry * math.sin(a)))
ramka = f"M0 0 H{W} V{H} H0 Z " + catmull(brzeg, True)
o(el("path", d=ramka, fill="#d6c294", fill_opacity="0.55", fill_rule="evenodd"))
for cx, cy, r in ((1180, 930, 46), (240, 70, 30)):
    o(el("circle", cx=cx, cy=cy, r=r, fill="none", stroke="#a77d4a", stroke_width="5", stroke_opacity="0.28"))
    o(el("circle", cx=cx + 2, cy=cy - 1, r=r - 6, fill="none", stroke="#a77d4a", stroke_width="1.5", stroke_opacity="0.25"))
for cx, cy, rx, ry in ((90, 600, 50, 80), (1330, 260, 40, 60), (980, 960, 90, 25)):
    blob = [(cx + rx * (0.8 + 0.3 * rng.random()) * math.cos(a), cy + ry * (0.8 + 0.3 * rng.random()) * math.sin(a))
            for a in [2 * math.pi * k / 10 for k in range(10)]]
    o(el("path", d=catmull(blob, True), fill="#cfb98a", fill_opacity="0.35"))
kropki = " ".join(f"M{f(x)} {f(y)} m-1.3 0 a1.3 1.3 0 1 0 2.6 0 a1.3 1.3 0 1 0 -2.6 0"
                  for x, y in [(rng.uniform(30, W - 30), rng.uniform(30, H - 30)) for _ in range(40)])
o(el("path", d=kropki, fill="#a07848", fill_opacity="0.4"))

# ------------------------------------------------------------------ pomieszczenia (klikalne i tło)
def pokoj_poczatek(ident, nazwa):
    o(f'<g data-element="{ident}">')
    o(f"<title>{nazwa}</title>")


def podpis(x, y, t, rozmiar=17, dopisek=None, kat=0):
    tr = f"rotate({kat} {f(x)} {f(y)})" if kat else None
    o(tekst(x, y, t, class_="h", font_size=str(rozmiar), font_weight="bold", font_style="italic", text_anchor="middle",
            fill="#2a1d14", transform=tr))
    if dopisek:
        o(tekst(x, y + 15, dopisek, class_="h", font_size="11", font_style="italic", text_anchor="middle", fill="#5a4636",
                transform=tr))


def kominek(x, y, kierunek="dol"):
    # kominek przy ścianie: prostokąt z paleniskiem
    if kierunek == "dol":
        o(el("rect", x=f(x - 22), y=f(y), width=44, height=14, fill="#b9ab90", stroke=TUSZ, stroke_width="1.1"))
        o(el("path", d=f"M{f(x - 12)} {f(y + 14)} v-8 h24 v8", fill="#3a2a20", stroke=TUSZ, stroke_width="1"))
        o(el("path", d=f"M{f(x - 6)} {f(y + 12)} q3 -7 6 -2 q3 -6 6 2", fill="#e0782a", stroke="none"))
    elif kierunek == "prawo":
        o(el("rect", x=f(x), y=f(y - 22), width=14, height=44, fill="#b9ab90", stroke=TUSZ, stroke_width="1.1"))
        o(el("path", d=f"M{f(x + 14)} {f(y - 12)} h-8 v24 h8", fill="#3a2a20", stroke=TUSZ, stroke_width="1"))
        o(el("path", d=f"M{f(x + 12)} {f(y - 6)} q-7 3 -2 6 q-6 3 2 6", fill="#e0782a", stroke="none"))
    elif kierunek == "lewo":
        o(el("rect", x=f(x - 14), y=f(y - 22), width=14, height=44, fill="#b9ab90", stroke=TUSZ, stroke_width="1.1"))
        o(el("path", d=f"M{f(x - 14)} {f(y - 12)} h8 v24 h-8", fill="#3a2a20", stroke=TUSZ, stroke_width="1"))
        o(el("path", d=f"M{f(x - 12)} {f(y - 6)} q7 3 2 6 q6 3 -2 6", fill="#e0782a", stroke="none"))


def zyrandol(x, y, r=13):
    o(el("circle", cx=f(x), cy=f(y), r=f(r), fill="none", stroke="#8a6a2a", stroke_width="1"))
    o(el("path", d=" ".join(f"M{f(x)} {f(y)} L{f(x + r * math.cos(a))} {f(y + r * math.sin(a))}" for a in
                            [k * math.pi / 4 for k in range(8)]), fill="none", stroke="#8a6a2a", stroke_width="0.8"))
    o(el("circle", cx=f(x), cy=f(y), r="3", fill="#e8c35a", stroke="#8a6a2a", stroke_width="0.8"))


def krzeslo(x, y, kat=0):
    return el("rect", x=f(x - 4.5), y=f(y - 4.5), width=9, height=9, rx=1.5, fill="#8a6440", stroke=TUSZ, stroke_width="0.8",
              transform=f"rotate({kat} {f(x)} {f(y)})" if kat else None)


def regal(x, y, w, h):
    # regał z książkami (wzdłuż dłuższego boku kreski grzbietów)
    o(el("rect", x=f(x), y=f(y), width=f(w), height=f(h), fill="#8a5f3a", stroke=TUSZ, stroke_width="1"))
    d = []
    if w >= h:
        for k in range(int(w / 5)):
            d.append(f"M{f(x + 3 + k * 5)} {f(y + 1.5)} v{f(h - 3)}")
    else:
        for k in range(int(h / 5)):
            d.append(f"M{f(x + 1.5)} {f(y + 3 + k * 5)} h{f(w - 3)}")
    o(el("path", d=" ".join(d), fill="none", stroke="#d8b878", stroke_width="1.4"))


# --- Gabinet (140..340 × 150..300)
pokoj_poczatek("gabinet", "Gabinet")
o(el("rect", x=140, y=150, width=200, height=150, fill="#6d7f5c", fill_opacity="0.45"))
o(el("rect", x=176, y=186, width=128, height=86, fill="#4f6a4a", fill_opacity="0.55", stroke="#3d523a", stroke_width="1"))
o(el("rect", x=212, y=200, width=66, height=34, fill="#6b4529", stroke=TUSZ, stroke_width="1.2"))
o(el("rect", x=228, y=206, width=16, height=11, fill="#efe6cf", stroke=TUSZ, stroke_width="0.6"))
o(el("circle", cx=268, cy=210, r=3, fill="#3b2a1e"))
o(krzeslo(245, 248))
regal(150, 160, 60, 10)
o(el("rect", x=296, y=160, width=34, height=26, fill="#5c5650", stroke=TUSZ, stroke_width="1.2"))
o(el("circle", cx=313, cy=173, r=5, fill="none", stroke="#d8c8a0", stroke_width="1.2"))
podpis(240, 286, "Gabinet")
o("</g>")

# --- Galeria portretów (340..860 × 150..300)
pokoj_poczatek("galeria-portretow", "Galeria portretów")
o(el("rect", x=340, y=150, width=520, height=150, fill="#b49a78", fill_opacity="0.35"))
o(el("rect", x=356, y=206, width=488, height=40, fill="#8c3b32", fill_opacity="0.75", stroke="#5e2420", stroke_width="1"))
o(el("path", d="M356 212 H844 M356 240 H844", fill="none", stroke="#c9a24a", stroke_width="1"))
for k in range(9):
    x = 372 + k * 54
    o(el("rect", x=f(x), y=158, width=28, height=10, fill="#c9a24a", stroke="#6e5420", stroke_width="1"))
    o(el("rect", x=f(x + 4), y=160.5, width=20, height=5, fill="#4a3a30"))
for x in (430, 590, 750):
    o(el("rect", x=f(x), y=268, width=46, height=12, rx=2, fill="#6b4529", stroke=TUSZ, stroke_width="0.9"))
podpis(600, 196, "Galeria portretów")
o("</g>")

# --- Kaplica (860..1060 × 150..300)
pokoj_poczatek("kaplica", "Kaplica")
o(el("rect", x=860, y=150, width=200, height=150, fill="#7d6a8c", fill_opacity="0.35"))
o(el("rect", x=930, y=158, width=60, height=22, fill="#d9d0c0", stroke=TUSZ, stroke_width="1.2"))
o(el("path", d="M960 160 v16 M954 166 h12", fill="none", stroke="#8a6a2a", stroke_width="1.6"))
for x in (936, 984):
    o(el("circle", cx=x, cy=169, r=2.6, fill="#e8c35a", stroke="#8a6a2a", stroke_width="0.6"))
for rzad in range(4):
    y = 204 + rzad * 20
    o(el("rect", x=880, y=f(y), width=64, height=10, fill="#6b4529", stroke=TUSZ, stroke_width="0.9"))
    o(el("rect", x=976, y=f(y), width=64, height=10, fill="#6b4529", stroke=TUSZ, stroke_width="0.9"))
podpis(960, 296, "Kaplica", 15)
o("</g>")

# --- tło: spiżarnia, pomywalnia, klatka schodowa, korytarz
o("<g>")
o(el("rect", x=1060, y=150, width=200, height=150, fill="#c2ad86", fill_opacity="0.4"))
for x, y in ((1076, 164), (1076, 196), (1076, 228)):
    o(el("rect", x=x, y=y, width=60, height=12, fill="#9a7a52", stroke=TUSZ, stroke_width="0.9"))
for cx, cy in ((1200, 180), (1224, 196), (1196, 210)):
    o(el("circle", cx=cx, cy=cy, r=9, fill="#a4794c", stroke=TUSZ, stroke_width="1"))
    o(el("circle", cx=cx, cy=cy, r=4, fill="none", stroke=TUSZ, stroke_width="0.7"))
o(tekst(1110, 288, "spiżarnia", class_="h", font_size="13", font_style="italic", text_anchor="middle", fill="#3b2a1e"))
o(el("rect", x=1060, y=300, width=200, height=80, fill="#b8b0a0", fill_opacity="0.45"))
o(el("rect", x=1196, y=312, width=50, height=22, fill="#9aa8b0", stroke=TUSZ, stroke_width="1"))
o(tekst(1130, 362, "pomywalnia", class_="h", font_size="12", font_style="italic", text_anchor="middle", fill="#3b2a1e"))
o(el("rect", x=930, y=300, width=130, height=80, fill="#c9b796", fill_opacity="0.5"))
schody = " ".join(f"M{f(946 + k * 9)} 308 v48" for k in range(11))
o(el("path", d=schody, fill="none", stroke=TUSZ, stroke_width="1"))
o(el("path", d="M948 332 H1040 M1032 326 l8 6 l-8 6", fill="none", stroke=OLOWEK_NB, stroke_width="1.4"))
o(tekst(995, 372, "schody na piętro", class_="h", font_size="11", font_style="italic", text_anchor="middle", fill=OLOWEK_NB))
# korytarz wokół dziedzińca
o(el("path", d="M470 300 H930 V660 H470 Z M520 350 V610 H880 V350 Z", fill="url(#deski)", fill_rule="evenodd"))
o(tekst(700, 330, "korytarz", class_="h", font_size="12", font_style="italic", text_anchor="middle", fill="#5a4636"))
o(tekst(495, 470, "korytarz", class_="h", font_size="12", font_style="italic", text_anchor="middle", fill="#5a4636",
        transform="rotate(-90 495 470)"))
o(tekst(905, 470, "korytarz", class_="h", font_size="12", font_style="italic", text_anchor="middle", fill="#5a4636",
        transform="rotate(90 905 470)"))
o(tekst(700, 642, "korytarz", class_="h", font_size="12", font_style="italic", text_anchor="middle", fill="#5a4636"))
o("</g>")

# --- Zejście do piwnic (w spiżarni)
pokoj_poczatek("zejscie-do-piwnic", "Zejście do piwnic")
o(el("rect", x=1150, y=232, width=96, height=50, fill="#4a3a30", fill_opacity="0.25", stroke=TUSZ, stroke_width="1"))
o(el("path", d=" ".join(f"M{f(1160 + k * 9)} 236 v42" for k in range(9)), fill="none", stroke=TUSZ, stroke_width="1"))
o(el("path", d="M1158 257 H1236 M1228 251 l8 6 l-8 6", fill="none", stroke=OLOWEK_CZ, stroke_width="1.5"))
o(tekst(1190, 228, "Zejście do piwnic", class_="h", font_size="12", font_weight="bold", font_style="italic", text_anchor="middle",
        fill="#2a1d14"))
o("</g>")

# --- Biblioteka (140..470 × 300..560)
pokoj_poczatek("biblioteka", "Biblioteka")
o(el("rect", x=140, y=300, width=330, height=260, fill="#a4825a", fill_opacity="0.32"))
regal(150, 310, 10, 238)
regal(160, 310, 120, 10)
regal(330, 310, 130, 10)
regal(160, 540, 110, 10)
regal(340, 540, 120, 10)
regal(236, 382, 10, 90)
regal(380, 382, 10, 90)
for x, y in ((296, 400), (296, 452)):
    o(el("rect", x=f(x - 26), y=f(y - 13), width=52, height=26, rx=2, fill="#7a5232", stroke=TUSZ, stroke_width="1"))
    o(el("circle", cx=f(x - 14), cy=f(y - 4), r=3.2, fill="#7fa05a", stroke="#3d523a", stroke_width="0.7"))
    for dx in (-18, 0, 18):
        o(krzeslo(x + dx, y + 19))
o(el("circle", cx=420, cy=350, r=11, fill="#9fb8a0", stroke=TUSZ, stroke_width="1.1"))
o(el("path", d="M409 350 h22 M420 339 q-6 11 0 22 q6 -11 0 -22", fill="none", stroke=TUSZ, stroke_width="0.8"))
kominek(150, 430, "prawo")
podpis(300, 512, "Biblioteka", 19)
o("</g>")

# --- Sala balowa (140..470 × 560..850)
pokoj_poczatek("sala-balowa", "Sala balowa")
o(el("rect", x=140, y=560, width=330, height=290, fill="url(#parkiet)", fill_opacity="0.85"))
for k in range(9):
    o(krzeslo(168 + k * 34, 580))
    o(krzeslo(168 + k * 34, 830))
for y in (630, 700, 770):
    o(krzeslo(158, y))
o(el("path", d="M462 590 V820", fill="none", stroke="#8fb3c8", stroke_width="3"))
for x, y in ((240, 660), (370, 660), (305, 760)):
    zyrandol(x, y)
podpis(305, 718, "Sala balowa", 20, dopisek="lustra na ścianie wschodniej")
o("</g>")

# --- Salonik (470..600 × 660..850) — tło
o("<g>")
o(el("rect", x=470, y=660, width=130, height=190, fill="#9c7d8a", fill_opacity="0.3"))
o(el("rect", x=488, y=700, width=58, height=20, rx=6, fill="#7a4a5a", stroke=TUSZ, stroke_width="1"))
o(el("rect", x=500, y=736, width=34, height=22, rx=3, fill="#6b4529", stroke=TUSZ, stroke_width="0.9"))
o(krzeslo(490, 790))
o(krzeslo(548, 790))
o(tekst(535, 828, "salonik", class_="h", font_size="13", font_style="italic", text_anchor="middle", fill="#3b2a1e"))
o("</g>")

# --- Hol wejściowy (600..800 × 660..850)
pokoj_poczatek("hol-wejsciowy", "Hol wejściowy")
o(el("rect", x=600, y=660, width=200, height=190, fill="url(#szachownica)"))
for x in (640, 760):
    o(el("circle", cx=x, cy=700, r=11, fill="#d9d4c8", stroke=TUSZ, stroke_width="1.3"))
    o(el("circle", cx=x, cy=700, r=6, fill="none", stroke=TUSZ, stroke_width="0.8"))
o(el("circle", cx=700, cy=752, r=16, fill="#6b4529", stroke=TUSZ, stroke_width="1.2"))
o(el("circle", cx=700, cy=752, r=5, fill="#7a8fa8", stroke=TUSZ, stroke_width="0.7"))
podpis(700, 806, "Hol wejściowy", 17)
o("</g>")

# --- Salon muzyczny (800..930 × 660..850)
pokoj_poczatek("salon-muzyczny", "Salon muzyczny")
o(el("rect", x=800, y=660, width=130, height=190, fill="#4f6a8a", fill_opacity="0.32"))
o(el("rect", x=814, y=680, width=102, height=88, rx=4, fill="#3f5a7a", fill_opacity="0.45", stroke="#2f4a6a", stroke_width="0.8"))
o(el("path", d="M826 692 h56 q24 0 24 26 q0 26 -30 32 h-50 Z", fill="#1f1a1a", stroke=TUSZ, stroke_width="1.1"))
o(el("path", d="M826 696 v48", fill="none", stroke="#efe6cf", stroke_width="3"))
o(krzeslo(818, 720))
o(el("path", d="M900 790 v26 M900 790 l14 26", fill="none", stroke="#8a6a2a", stroke_width="1.4"))
podpis(865, 842, "Salon muzyczny", 13)
o("</g>")

# --- Kuchnia (930..1260 × 380..560)
pokoj_poczatek("kuchnia", "Kuchnia")
o(el("rect", x=930, y=380, width=330, height=180, fill="url(#terakota)", fill_opacity="0.75"))
o(el("rect", x=1040, y=444, width=110, height=40, rx=2, fill="#a4794c", stroke=TUSZ, stroke_width="1.2"))
o(el("rect", x=1090, y=388, width=70, height=24, fill="#5c5650", stroke=TUSZ, stroke_width="1.2"))
o(el("path", d="M1100 410 q6 -14 12 -3 q6 -12 12 2 q6 -10 10 1", fill="#e0782a", stroke="none"))
for x in (1200, 1226):
    o(el("circle", cx=x, cy=406, r=9, fill="#a4794c", stroke=TUSZ, stroke_width="1"))
o(el("rect", x=944, y=520, width=46, height=26, fill="#9aa8b0", stroke=TUSZ, stroke_width="1"))
for x, y in ((1060, 470), (1090, 500), (1130, 470)):
    o(el("circle", cx=x, cy=y, r=4, fill="#c9c0aa", stroke=TUSZ, stroke_width="0.8"))
podpis(1100, 540, "Kuchnia", 19)
o("</g>")

# --- Jadalnia (930..1260 × 560..850)
pokoj_poczatek("jadalnia", "Jadalnia")
o(el("rect", x=930, y=560, width=330, height=290, fill="#7a3a34", fill_opacity="0.28"))
o(el("rect", x=966, y=624, width=258, height=166, rx=6, fill="#7a2e2a", fill_opacity="0.55", stroke="#5e2420", stroke_width="1"))
o(el("rect", x=1010, y=676, width=170, height=50, rx=6, fill="#6b4529", stroke=TUSZ, stroke_width="1.3"))
for k in range(6):
    o(krzeslo(1024 + k * 28, 664))
    o(krzeslo(1024 + k * 28, 738))
o(krzeslo(998, 701))
o(krzeslo(1192, 701))
for x in (1050, 1095, 1140):
    o(el("circle", cx=x, cy=701, r=3, fill="#e8c35a", stroke="#8a6a2a", stroke_width="0.7"))
kominek(1095, 836, "dol")
o(el("rect", x=940, y=596, width=14, height=60, fill="#6b4529", stroke=TUSZ, stroke_width="1"))
podpis(1095, 616, "Jadalnia", 19)
o("</g>")

# --- Oranżeria (1260..1356 × 580..820)
pokoj_poczatek("oranzeria", "Oranżeria")
o(el("rect", x=1262, y=582, width=92, height=236, fill="#b9d3dc", fill_opacity="0.55"))
for x, y, r in ((1290, 612, 12), (1326, 640, 10), (1288, 690, 9), (1326, 760, 13), (1290, 790, 10)):
    o(el("circle", cx=x, cy=y, r=r, fill="#6f8f5a", stroke="#3d523a", stroke_width="1"))
    o(el("circle", cx=x - r * 0.3, cy=y - r * 0.3, r=r * 0.5, fill="#93b06e"))
o(el("ellipse", cx=1312, cy=722, rx=16, ry=11, fill="#8fb3c8", stroke=TUSZ, stroke_width="0.9"))
o(el("path", d="M1262 582 H1354 V818 H1262", fill="none", stroke="#5a7a8a", stroke_width="3"))
o(el("path", d="M1262 582 H1354 V818 H1262", fill="none", stroke="#e8f0f2", stroke_width="1"))
o(tekst(1308, 668, "Oranżeria", class_="h", font_size="14", font_weight="bold", font_style="italic", text_anchor="middle",
        fill="#2a1d14", transform="rotate(-90 1308 668)"))
o("</g>")

# --- Dziedziniec (520..880 × 350..610)
pokoj_poczatek("dziedziniec", "Dziedziniec")
o(el("rect", x=520, y=350, width=360, height=260, fill="url(#zwir)"))
o(el("path", d="M520 480 H880 M700 350 V610", fill="none", stroke="#ece2c6", stroke_width="16"))
o(el("circle", cx=700, cy=480, r=34, fill="url(#kamien)", stroke=TUSZ, stroke_width="1.4"))
o(el("circle", cx=700, cy=480, r=24, fill="#8fb3c8", stroke=TUSZ, stroke_width="1"))
o(el("circle", cx=700, cy=480, r=5, fill="#cfc8b8", stroke=TUSZ, stroke_width="0.9"))
o(el("path", d="M598 412 l0 -26 M598 398 l-10 -12 M598 392 l9 -10 M598 404 l12 -6 M590 386 l-4 -6", fill="none", stroke="#2a1d14",
     stroke_width="1.6", stroke_linecap="round"))
for x, y in ((612, 560), (788, 560), (788, 392)):
    o(el("rect", x=f(x - 16), y=f(y - 5), width=32, height=10, rx=2, fill="#8a6440", stroke=TUSZ, stroke_width="0.9"))
for x, y in ((540, 370), (860, 370), (540, 590), (860, 590), (620, 450), (790, 520)):
    o(el("circle", cx=x, cy=y, r=5, fill="#7d8f5a", fill_opacity="0.7"))
podpis(700, 446, "Dziedziniec", 18)
o("</g>")

# ------------------------------------------------------------------ ściany (z otworami drzwi)
POZIOME = [  # y, x1, x2, grubość
    (150, 140, 1260, 10), (850, 140, 1260, 10), (300, 140, 1260, 6), (660, 470, 930, 6),
    (560, 140, 470, 6), (560, 930, 1260, 6), (380, 930, 1260, 6), (350, 520, 880, 8), (610, 520, 880, 8)]
PIONOWE = [  # x, y1, y2, grubość
    (140, 150, 850, 10), (1260, 150, 850, 10), (340, 150, 300, 6), (860, 150, 300, 6), (1060, 150, 380, 6),
    (470, 300, 850, 6), (930, 300, 850, 6), (520, 350, 610, 8), (880, 350, 610, 8), (600, 660, 850, 6), (800, 660, 850, 6)]
DRZWI = [  # (oś, położenie ściany, środek otworu, szerokość, strona skrzydła)
    ("y", 850, 700, 46, -1), ("y", 660, 700, 52, -1), ("x", 600, 760, 30, 1), ("x", 800, 760, 30, -1),
    ("y", 660, 536, 28, 1), ("x", 470, 790, 30, 1), ("y", 660, 864, 28, 1), ("x", 930, 790, 30, -1),
    ("x", 470, 610, 36, -1), ("x", 470, 430, 30, -1), ("y", 300, 250, 30, -1), ("y", 300, 600, 30, 1),
    ("y", 300, 780, 30, 1), ("x", 860, 225, 30, 1), ("x", 930, 325, 28, 1), ("x", 1060, 340, 28, 1),
    ("y", 300, 1160, 30, -1), ("y", 380, 1160, 30, 1), ("x", 930, 470, 30, 1), ("y", 560, 1010, 30, 1),
    ("x", 1260, 470, 30, -1), ("x", 930, 630, 30, 1), ("x", 1260, 700, 50, -1),
    ("y", 350, 700, 36, -1), ("y", 610, 700, 36, 1), ("x", 520, 480, 36, 1), ("x", 880, 480, 36, -1)]
OKNA = [  # (oś, położenie ściany, środek, szerokość)
    *[("y", 150, x, 30) for x in (200, 280, 420, 520, 620, 720, 800, 920, 1000, 1120, 1200)],
    *[("y", 850, x, 30) for x in (220, 320, 410, 535, 865, 1000, 1190)],
    *[("x", 140, y, 30) for y in (225, 360, 440, 510, 620, 700, 790)],
    *[("x", 1260, y, 26) for y in (225, 340, 420, 530)],
    *[("y", 350, x, 30) for x in (580, 820)], *[("y", 610, x, 30) for x in (580, 820)],
    *[("x", 520, y, 30) for y in (400, 560)], *[("x", 880, y, 30) for y in (400, 560)]]


def odcinki(os_, poz, a, b):
    otwory = sorted((s - w / 2, s + w / 2) for (o_, p, s, w, _) in DRZWI if o_ == os_ and abs(p - poz) < 0.1 and a < s < b)
    wynik = []
    start = a
    for o1, o2 in otwory:
        if o1 > start:
            wynik.append((start, o1))
        start = max(start, o2)
    if start < b:
        wynik.append((start, b))
    return wynik


o("<g>")
d_scian = []
for y, x1, x2, g in POZIOME:
    for a, b in odcinki("y", y, x1 - (g / 2 if x1 in (140,) else 0), x2 + (g / 2 if x2 in (1260,) else 0)):
        d_scian.append((g, [(a, y), (b, y)]))
for x, y1, y2, g in PIONOWE:
    for a, b in odcinki("x", x, y1, y2):
        d_scian.append((g, [(x, a), (x, b)]))
for g, odc in d_scian:
    o(linia(odc, TUSZ, g, amp=0.5, krok=16, stroke_linecap="square"))
# druga, cienka kreska „szkicu” obok grubych ścian
for g, odc in d_scian:
    (ax, ay), (bx, by) = odc
    przes = g / 2 + 1.6
    if ay == by:
        odc2 = [(ax + rng.uniform(-3, 3), ay - przes), (bx + rng.uniform(-3, 3), by - przes)]
    else:
        odc2 = [(ax - przes, ay + rng.uniform(-3, 3)), (bx - przes, by + rng.uniform(-3, 3))]
    o(linia(odc2, "#5a4636", 0.7, amp=0.9, krok=10))
# okna: jasna przerwa z szybą
for os_, poz, s, w in OKNA:
    g = 10 if poz in (140, 1260, 150, 850) else 8
    if os_ == "y":
        o(el("rect", x=f(s - w / 2), y=f(poz - g / 2 - 0.5), width=f(w), height=f(g + 1), fill="#f4ecd6", stroke=TUSZ, stroke_width="0.9"))
        o(el("line", x1=f(s - w / 2), y1=f(poz), x2=f(s + w / 2), y2=f(poz), stroke="#5a7a8a", stroke_width="1.2"))
    else:
        o(el("rect", x=f(poz - g / 2 - 0.5), y=f(s - w / 2), width=f(g + 1), height=f(w), fill="#f4ecd6", stroke=TUSZ, stroke_width="0.9"))
        o(el("line", x1=f(poz), y1=f(s - w / 2), x2=f(poz), y2=f(s + w / 2), stroke="#5a7a8a", stroke_width="1.2"))
# witraże kaplicy
for x, kolor in ((920, "#6a4c8c"), (1000, "#3a5a8a")):
    o(el("rect", x=f(x - 13), y=146, width=26, height=8, fill=kolor, stroke=TUSZ, stroke_width="0.8"))
# skrzydła drzwi i łuki otwarcia
d_skrzydla = []
for os_, poz, s, w, strona in DRZWI:
    if os_ == "y":
        x0, y0 = s - w / 2, poz
        d_skrzydla.append(f"M{f(x0)} {f(y0)} l0 {f(strona * w)} M{f(x0)} {f(y0 + strona * w)} A{f(w)} {f(w)} 0 0 {1 if strona < 0 else 0} {f(s + w / 2)} {f(y0)}")
    else:
        x0, y0 = poz, s - w / 2
        d_skrzydla.append(f"M{f(x0)} {f(y0)} l{f(strona * w)} 0 M{f(x0 + strona * w)} {f(y0)} A{f(w)} {f(w)} 0 0 {0 if strona < 0 else 1} {f(x0)} {f(s + w / 2)}")
o(el("path", d=" ".join(d_skrzydla), fill="none", stroke="#6b5442", stroke_width="0.8"))
o("</g>")

# ------------------------------------------------------------------ portyk i schody wejściowe
o("<g>")
o(el("rect", x=610, y=855, width=180, height=48, fill="url(#kamien)", stroke=TUSZ, stroke_width="1.2"))
for x in (626, 666, 734, 774):
    o(el("circle", cx=x, cy=878, r=7, fill="#e9e3d4", stroke=TUSZ, stroke_width="1.3"))
o(el("path", d=" ".join(f"M{640 - k * 6} {908 + k * 6} H{760 + k * 6}" for k in range(4)), fill="none", stroke=TUSZ, stroke_width="1.2"))
o(tekst(700, 954, "wejście główne", class_="h", font_size="12", font_style="italic", text_anchor="middle", fill="#3b2a1e"))
o(el("path", d="M1262 470 h40 M1292 462 l10 8 l-10 8", fill="none", stroke="#5a4636", stroke_width="1.2"))
o(tekst_wiele(1300, 436, ["wejście", "dla służby"], 13, class_="h", font_size="11", font_style="italic", fill="#3b2a1e"))
o("</g>")

# ------------------------------------------------------------------ odręczne dopiski (ołówek)
o("<g>")
dopiski = [
    (150, 912, ["okna sali balowej", "zabite deskami"], OLOWEK_CZ, [(230, 884), (220, 858)]),
    (520, 112, ["w nocy słychać tu kroki?"], OLOWEK_CZ, [(584, 118), (604, 152)]),
    (720, 124, ["portretów jest 9 — wczoraj było 8?"], OLOWEK_CZ, [(800, 130), (820, 156)]),
    (1080, 108, ["zegar stoi — 3:15"], OLOWEK_NB, [(1120, 116), (1150, 152)]),
    (40, 260, ["zamknięte", "na klucz"], OLOWEK_CZ, [(100, 262), (222, 298)]),
    (1258, 900, ["szklarnia —", "rośliny uschnięte"], OLOWEK_NB, [(1300, 872), (1306, 824)]),
]
for x, y, linie_, kolor, strzalka in dopiski:
    o(tekst_wiele(x, y, linie_, 14, class_="h", font_size="12", font_style="italic", fill=kolor))
    o(linia(strzalka, kolor, 1.1, amp=0.8, krok=8))
    (ax, ay), (bx, by) = strzalka
    kat = math.atan2(by - ay, bx - ax)
    grot = [(bx - 7 * math.cos(kat - 0.45), by - 7 * math.sin(kat - 0.45)), (bx, by), (bx - 7 * math.cos(kat + 0.45), by - 7 * math.sin(kat + 0.45))]
    o(el("path", d=sciezka_lamanej(grot), fill="none", stroke=kolor, stroke_width="1.1", stroke_linecap="round"))
# kółko ołówkiem wokół zejścia do piwnic i znak zapytania
o(linia([(1150 + 58 * math.cos(a) + 48, 258 + 34 * math.sin(a)) for a in [k * math.pi / 14 for k in range(29)]],
        OLOWEK_CZ, 1.2, amp=1.2, krok=6))
o(tekst(1288, 252, "?!", class_="h", font_size="22", font_weight="bold", fill=OLOWEK_CZ))
o("</g>")

# ------------------------------------------------------------------ tytuł, róża kierunków, podziałka
o("<g>")
o(tekst(142, 82, "Pałac Kruków — parter", font_size="34", font_weight="bold", font_style="italic", fill="#2a1d14"))
o(tekst(146, 110, "szkic z relacji ogrodnika · skala przybliżona", font_size="13", font_style="italic", fill="#5a4636"))
o(linia([(142, 92), (560, 94)], "#2a1d14", 1.4, amp=1, krok=20))
o(el("path", d="M1316 52 L1328 104 L1316 94 L1304 104 Z", fill="#3b2a1e", stroke="#2a1d14", stroke_width="1"))
o(tekst(1316, 46, "N", font_size="16", font_weight="bold", text_anchor="middle", fill="#2a1d14"))
o(linia([(150, 968), (350, 968)], "#2a1d14", 1.6, amp=0.4, krok=40))
o(el("path", d="M150 962 v12 M200 964 v8 M250 962 v12 M300 964 v8 M350 962 v12", fill="none", stroke="#2a1d14", stroke_width="1.2"))
o(tekst(150, 990, "0", font_size="11", text_anchor="middle", fill="#5a4636"))
o(tekst(250, 990, "10 kroków", font_size="11", text_anchor="middle", fill="#5a4636"))
o(tekst(350, 990, "20", font_size="11", text_anchor="middle", fill="#5a4636"))
o("</g>")

# ------------------------------------------------------------------ plamy (atrament, zaschnięte krople)
o("<g>")
klyks = [(470 + 16 * (0.7 + 0.5 * rng.random()) * math.cos(a), 950 + 12 * (0.7 + 0.5 * rng.random()) * math.sin(a))
         for a in [2 * math.pi * k / 9 for k in range(9)]]
o(el("path", d=catmull(klyks, True), fill="#2a1d14", fill_opacity="0.85"))
for x, y, r in ((494, 942, 2.4), (448, 962, 1.8), (500, 964, 1.4)):
    o(el("circle", cx=x, cy=y, r=r, fill="#2a1d14", fill_opacity="0.85"))
for x, y, r in ((1352, 120, 4), (1362, 134, 2.6), (1340, 140, 2), (1370, 150, 1.6)):
    o(el("circle", cx=x, cy=y, r=r, fill="#6e231c", fill_opacity="0.7"))
o("</g>")

# ------------------------------------------------------------------ przykład treści tylko dla MG (skrypt ją usuwa)
o('<g class="tylko-mg">')
o(el("rect", x=700, y=24, width=300, height=56, rx=4, fill="#fbf6e6", stroke="#b0281c", stroke_width="1.6", stroke_dasharray="6 4"))
o(tekst_wiele(712, 46, ["Przykład: notatka dla MG — skrypt usuwa", "grupę „tylko-mg” z mapy dla graczy."], 16, font_size="12", fill="#8f1d14"))
o("</g>")
o("</svg>")

sciezka = sys.argv[1] if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent / "Rysunek_palac.svg"
with open(sciezka, "w", encoding="utf-8") as plik:
    plik.write("\n".join(out) + "\n")
print("elementów:", sum(s.count("<") - s.count("</") for s in out), file=sys.stderr)
