"""Testy skryptu narzedzia/zbuduj_strone.py — co trafia na stronę, a co nie.

    python3 -m unittest discover -s testy -p "test_*.py" -v
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
spec = importlib.util.spec_from_file_location("zbuduj_strone", KORZEN / "narzedzia" / "zbuduj_strone.py")
zs = importlib.util.module_from_spec(spec)
spec.loader.exec_module(zs)


class TestPublikacji(unittest.TestCase):
    def test_strona_bez_rysunkow_mg_i_narzedzi(self):
        with tempfile.TemporaryDirectory() as t:
            wynik = Path(t) / "_site"
            with contextlib.redirect_stdout(io.StringIO()):
                kod = zs.main([str(wynik)])
            self.assertEqual(kod, 0)
            pliki = {str(p.relative_to(wynik)) for p in wynik.rglob("*") if p.is_file()}
            for wymagany in ("index.html", "kampania.html", "kampanie.json", "firebase/firebase-config.js", "aplikacja/js/kampania.js"):
                self.assertIn(wymagany, pliki)
            rejestr = json.loads((KORZEN / "kampanie.json").read_text(encoding="utf-8"))
            for kampania in rejestr["kampanie"]:
                folder = kampania["folder"]
                manifest = json.loads((wynik / folder / "kampania.json").read_text(encoding="utf-8"))
                for mapa in manifest["mapy"]:
                    self.assertIn(f"{folder}/{mapa['plik']}", pliki)
                    self.assertNotIn("zrodlo", mapa, "opublikowany manifest wskazuje rysunek MG")
            for p in pliki:
                self.assertFalse(p.startswith(("narzedzia/", "testy/", ".github/")), p)
                self.assertNotIn("Rysunki_", p, f"rysunek MG na stronie: {p}")
                self.assertFalse(p.endswith((".py", ".md", ".rules", ".txt", ".csv")), p)
                self.assertNotEqual(p, "firebase/firestore.rules")


if __name__ == "__main__":
    unittest.main()
