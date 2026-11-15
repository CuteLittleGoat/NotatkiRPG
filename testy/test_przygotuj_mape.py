"""Testy skryptu narzedzia/przygotuj_mape.py (Python 3.9+, bez dodatkowych pakietów).

    python3 -m unittest discover -s testy -p "test_*.py" -v

Rysunki testowe są wymyślone na potrzeby testu (nie zawierają materiałów kampanii).
"""

from __future__ import annotations

import contextlib
import importlib.util
import io
import json
import tempfile
import unittest
from pathlib import Path

KORZEN = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("przygotuj_mape", KORZEN / "narzedzia" / "przygotuj_mape.py")
pm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pm)

RYSUNEK = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" font-family="Georgia">
<!-- komentarz roboczy MG — nie może trafić do mapy -->
<title>Rysunek testowy</title>
<defs>
 <style>.h{stroke:#fff}</style>
 <pattern id="kropki" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#553311"/></pattern>
 <pattern id="nieuzywany" width="8" height="8"><rect width="8" height="8" fill="#9b2f1c"/></pattern>
</defs>
<rect x="0" y="0" width="1000" height="1000" fill="#efe3c4"/>
<rect x="10" y="10" width="480" height="480" fill="url(#kropki)" stroke="#4d4030"/>
<rect x="300" y="50" width="20" height="20" style="fill:#123456;opacity:0.5"/>
<g data-element="wieza-testowa"><title>Wieża testowa</title>
  <circle cx="100" cy="100" r="10" fill="#8f8170" stroke="#2b2116"/>
  <text x="115" y="105" font-size="12">Wieża testowa</text>
</g>
<g data-element="droga-testowa"><title>Droga testowa</title>
  <polyline points="20,300 400,320" fill="none" stroke="#6e3f22" stroke-dasharray="7 4"/>
  <text x="200" y="300" font-size="11" transform="rotate(-10 200 300)">Droga testowa</text>
</g>
<g class="tylko-mg">
  <text x="300" y="300" font-size="12">SEKRET-MG-123 (dla MG)</text>
  <polyline points="50,50 450,450" fill="none" stroke="#9b2f1c" stroke-dasharray="5 3"/>
</g>
<g data-element="w-innym-panelu"><circle cx="700" cy="700" r="10" fill="#000"/><text x="715" y="705">Inny panel</text></g>
DODATEK
</svg>
"""

MANIFEST = {
    "id": "test",
    "nazwa": "Test",
    "wersjaMapy": "2026-11-10",
    "mapy": [{"id": "plan", "nazwa": "Plan", "plik": "mapa_plan.svg", "zrodlo": {"plik": "rysunek_mg.svg", "obszar": "0 0 500 500"}}],
    "elementy": [
        {"id": "wieza-testowa", "nazwa": "Wieża testowa", "mapa": "plan"},
        {"id": "znikniety", "nazwa": "Zniknięty", "mapa": "plan"},
    ],
}


def przygotuj_folder(katalog: Path, dodatek: str = "", manifest: dict | None = None) -> Path:
    (katalog / "rysunek_mg.svg").write_text(RYSUNEK.replace("DODATEK", dodatek), encoding="utf-8")
    (katalog / "kampania.json").write_text(json.dumps(manifest or MANIFEST, ensure_ascii=False), encoding="utf-8")
    return katalog


def uruchom(*argumenty: str) -> tuple[int, str]:
    wyjscie = io.StringIO()
    with contextlib.redirect_stdout(wyjscie), contextlib.redirect_stderr(wyjscie):
        kod = pm.main(list(argumenty))
    return kod, wyjscie.getvalue()


class TestPrzygotujMape(unittest.TestCase):
    def test_mapa_bez_materialu_mg(self):
        with tempfile.TemporaryDirectory() as t:
            folder = przygotuj_folder(Path(t))
            kod, wyjscie = uruchom(str(folder))
            self.assertEqual(kod, 0, wyjscie)
            mapa = (folder / "mapa_plan.svg").read_text(encoding="utf-8")
            for zakazane in ("SEKRET-MG-123", "dla MG", "tylko-mg", "komentarz roboczy", "9b2f1c", "nieuzywany", "Georgia"):
                self.assertNotIn(zakazane, mapa)
            self.assertIn('data-element="wieza-testowa"', mapa)
            self.assertIn('data-element="droga-testowa"', mapa)
            self.assertNotIn('data-element="w-innym-panelu"', mapa, "element spoza obszaru mapy trafił do mapy")
            self.assertIn('viewBox="0 0 500 500"', mapa)
            self.assertIn("<style>", mapa)
            self.assertIn(".motyw-bursztynowy", mapa)
            self.assertNotIn("<title>", mapa, "tytuły elementów wyróżniałyby nieodkryte miejsca")
            self.assertIn('id="plan-kropki"', mapa, "identyfikatory definicji bez przedrostka mapy")
            self.assertNotIn("SEKRET-MG-123", wyjscie, "skrypt wypisał treść materiału MG")

    def test_motywy_i_kolory_oryginalu(self):
        with tempfile.TemporaryDirectory() as t:
            folder = przygotuj_folder(Path(t))
            kod, wyjscie = uruchom(str(folder))
            self.assertEqual(kod, 0, wyjscie)
            mapa = (folder / "mapa_plan.svg").read_text(encoding="utf-8")
            # Reguły każdego motywu fosforu; domyślny nie działa w trybie oryginalnym.
            for nazwa in pm.MOTYWY:
                if nazwa != pm.MOTYW_DOMYSLNY:
                    self.assertIn(f".motyw-{nazwa} svg.mapa-slate", mapa)
            self.assertIn(':not(.motyw-oryginalny *) .ds-f', mapa)
            # Oryginalne kolory zostają w atrybutach (kolor ze style też — przeniesiony do atrybutu,
            # bo w style wygrywałby z regułami motywów).
            self.assertIn('fill="#efe3c4"', mapa)
            self.assertIn('stroke="#4d4030"', mapa)
            self.assertIn('fill="#123456"', mapa)
            self.assertIn('style="opacity:0.5"', mapa)
            self.assertNotIn("fill:#123456", mapa)
            # Obwódka napisów „h” w trybie oryginalnym — kolor z reguły .h rysunku.
            self.assertRegex(mapa, r"\.motyw-oryginalny svg\.mapa-slate\[data-mapa=\"plan\"\] \.h\{[^}]*stroke:#ffffff")

    def test_raport_nowych_i_brakujacych_elementow(self):
        with tempfile.TemporaryDirectory() as t:
            folder = przygotuj_folder(Path(t))
            kod, wyjscie = uruchom(str(folder), "--sprawdz")
            self.assertEqual(kod, 0, wyjscie)
            self.assertIn("NOWE ELEMENTY", wyjscie)
            self.assertIn('"id": "droga-testowa"', wyjscie)
            self.assertIn("BRAK NA RYSUNKU: „znikniety”", wyjscie)
            self.assertFalse((folder / "mapa_plan.svg").exists(), "tryb --sprawdz zapisał plik")

    def test_czerwona_przerywana_poza_grupa_mg_przerywa(self):
        with tempfile.TemporaryDirectory() as t:
            folder = przygotuj_folder(Path(t), '<polyline points="60,60 300,300" fill="none" stroke="#9b2f1c" stroke-dasharray="5 3"/>')
            kod, wyjscie = uruchom(str(folder))
            self.assertEqual(kod, 1)
            self.assertIn("czerwona linia przerywana", wyjscie)
            self.assertFalse((folder / "mapa_plan.svg").exists())

    def test_dopisek_dla_mg_poza_grupa_przerywa_bez_wypisania_tresci(self):
        with tempfile.TemporaryDirectory() as t:
            folder = przygotuj_folder(Path(t), '<text x="100" y="200">TAJNE-XYZ (dla MG)</text>')
            kod, wyjscie = uruchom(str(folder))
            self.assertEqual(kod, 1)
            self.assertIn("materiał MG", wyjscie)
            self.assertNotIn("TAJNE-XYZ", wyjscie, "skrypt wypisał treść podejrzanego elementu")

    def test_zly_identyfikator(self):
        with tempfile.TemporaryDirectory() as t:
            folder = przygotuj_folder(Path(t), '<g data-element="Zły Id"><circle cx="50" cy="450" r="5"/></g>')
            kod, wyjscie = uruchom(str(folder))
            self.assertEqual(kod, 1)
            self.assertIn("Nieprawidłowy identyfikator", wyjscie)

    def test_prawdziwa_kampania_iliac(self):
        folder = KORZEN / "kampanie" / "Iliac"
        if not (folder / "Rysunki_kopca_Iliac.svg").exists():
            self.skipTest("brak rysunku MG kampanii Iliac w repozytorium")
        kod, wyjscie = uruchom(str(folder), "--sprawdz")
        self.assertEqual(kod, 0, wyjscie)
        self.assertNotIn("NOWE ELEMENTY", wyjscie)
        self.assertNotIn("BRAK NA RYSUNKU", wyjscie)
        self.assertNotIn("UWAGA", wyjscie)


class TestMapGraczy(unittest.TestCase):
    """Mapy, które pokazuje aplikacja: wszystkie kampanie z rejestru kampanie.json."""

    def test_mapy_graczy_bez_sladow_mg_i_zgodne_z_manifestem(self):
        import re

        rejestr = json.loads((KORZEN / "kampanie.json").read_text(encoding="utf-8"))
        for kampania in rejestr["kampanie"]:
            folder = KORZEN / kampania["folder"]
            manifest = json.loads((folder / "kampania.json").read_text(encoding="utf-8"))
            zrodla = {(m.get("zrodlo") or {}).get("plik") for m in manifest.get("mapy", [])}
            for mapa in manifest.get("mapy", []):
                self.assertNotIn(mapa["plik"], zrodla, f"{kampania['id']}: mapa graczy wskazuje na rysunek MG")
                tresc = (folder / mapa["plik"]).read_text(encoding="utf-8")
                self.assertIsNone(
                    re.search(r"tylko-mg|\bdla\s+MG\b|\(MG\)", tresc, re.IGNORECASE),
                    f"{kampania['id']}/{mapa['plik']}: ślady materiału MG na mapie graczy",
                )
                self.assertIn(f'data-mapa="{mapa["id"]}"', tresc)
                for element in manifest.get("elementy", []):
                    if element.get("mapa") == mapa["id"]:
                        self.assertIn(f'data-element="{element["id"]}"', tresc, f"brak miejsca {element['id']} na mapie {mapa['id']}")


class TestMotywow(unittest.TestCase):
    """Motywy są w trzech miejscach, które muszą się zgadzać (AGENTS.md, rozdział 4)."""

    def test_motywy_zgodne_w_css_konfiguracji_i_skrypcie(self):
        import re

        css = (KORZEN / "aplikacja" / "css" / "slate.css").read_text(encoding="utf-8")
        for nazwa, kolory in pm.MOTYWY.items():
            blok = re.search(r"\.motyw-" + nazwa + r"\s*\{([^}]*)\}", css)
            self.assertIsNotNone(blok, f"brak .motyw-{nazwa} w slate.css")
            for zmienna, klucz in (("--tlo", "tlo"), ("--fosfor", "fosfor")):
                wartosc = re.search(zmienna + r"\s*:\s*(#[0-9a-fA-F]{6})", blok.group(1))
                self.assertIsNotNone(wartosc, f"brak {zmienna} w .motyw-{nazwa}")
                self.assertEqual(wartosc.group(1).lower(), kolory[klucz], f"{zmienna} motywu {nazwa}: CSS ≠ skrypt")
        js = (KORZEN / "aplikacja" / "js" / "konfiguracja.js").read_text(encoding="utf-8")
        blok = re.search(r"export const MOTYWY = \{([^}]*)\}", js)
        klucze = set(re.findall(r"^\s*(\w+)\s*:", blok.group(1), re.MULTILINE))
        self.assertEqual(klucze, set(pm.MOTYWY) | {pm.MOTYW_ORYGINALNY}, "MOTYWY w konfiguracja.js ≠ skrypt")

    def test_kolor_obwodki(self):
        import xml.etree.ElementTree as ET

        def obwodka(styl):
            return pm.kolor_obwodki(ET.fromstring(f'<svg xmlns="http://www.w3.org/2000/svg"><style>{styl}</style></svg>'))

        self.assertEqual(obwodka(".h{stroke:#f3ead2;stroke-width:3px}"), "#f3ead2")
        self.assertEqual(obwodka("text.h, .x { stroke-width: 2; stroke: rgb(1,2,3) }"), "#010203")
        self.assertEqual(obwodka(".hh{stroke:#000}"), pm.OBWODKA_DOMYSLNA)
        self.assertEqual(obwodka(".h{stroke:url(#x)}"), pm.OBWODKA_DOMYSLNA)


class TestGeometrii(unittest.TestCase):
    def test_sciezka_wzgledna(self):
        punkty = pm.punkty_sciezki("M10 10 l10 0 q5 5 10 0 z")
        xs = [p[0] for p in punkty]
        self.assertEqual(min(xs), 10)
        self.assertEqual(max(xs), 30)

    def test_obrot(self):
        m = pm.parsuj_transform("rotate(90 0 0)")
        p = pm.prostokat_punktow([(10, 0)], m)
        self.assertAlmostEqual(p[1], 10)


if __name__ == "__main__":
    unittest.main()
