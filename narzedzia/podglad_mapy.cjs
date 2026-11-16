// Podgląd pliku SVG (mapy dla graczy albo rysunku od MG) jako obrazki PNG — w każdym
// trybie kolorów aplikacji, bez uruchamiania aplikacji i bez bazy.
//
// Użycie (z katalogu głównego repozytorium):
//   node narzedzia/podglad_mapy.cjs kampanie/Template/mapa_kraina.svg
//   node narzedzia/podglad_mapy.cjs kampanie/Template/mapa_palac.svg --motywy=oryginalny,zielony --szerokosc=2400
//   node narzedzia/podglad_mapy.cjs kampanie/Template/mapa_pole-bitwy.svg --wycinek=600,500,700,400 --szerokosc=3000
//
// Opcje:
//   --motywy=…     oryginalny, zielony, bursztynowy, czerwony (domyślnie wszystkie cztery)
//   --szerokosc=…  szerokość obrazka w pikselach (domyślnie 1600); większa = „przybliżenie”
//   --wycinek=x,y,w,h  tylko fragment obrazka (w pikselach obrazka, nie jednostkach mapy)
//   --folder=…     gdzie zapisać obrazki (domyślnie testy/e2e/wyniki/podglad — poza repozytorium)
//   --na-start     mapa tak, jak gracze widzą ją na start: bez miejsc do odkrycia (w manifeście
//                  kampania.json z folderu pliku: "widocznyDomyslnie": false) i bez ich grup
//                  data-nalezy-do. Obrazki dostają w nazwie „_na-start”. Pozwala sprawdzić, czy pod
//                  zasłoniętym miejscem jest pełne tło (Template/Specyfikacja_rysunku_mapy.md, 5.7).
//
// Mapa dla graczy zawiera kolory wszystkich motywów (skrypt przygotuj_mape.py), więc obrazki
// pokazują, jak wygląda w aplikacji. Rysunek od MG pokazuje się zawsze w swoich kolorach.
// Czcionka: jak w aplikacji, ale bez pobierania z Google Fonts — użyta zostanie czcionka
// zastępcza o stałej szerokości (zwykle szersza niż Ubuntu Mono). Jeśli napisy mieszczą się
// tutaj, zmieszczą się też w aplikacji.
//
// Wymaga pakietu „playwright” z przeglądarką Chromium (jak test e2e — testy/README.md).

const fs = require("fs");
const path = require("path");

const KORZEN = path.join(__dirname, "..");
const MOTYWY = ["oryginalny", "zielony", "bursztynowy", "czerwony"];

function opcja(nazwa, domyslna) {
  const arg = process.argv.find((a) => a.startsWith(`--${nazwa}=`));
  return arg ? arg.slice(nazwa.length + 3) : domyslna;
}

(async () => {
  const plik = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (!plik) {
    console.error("Podaj plik SVG, np.: node narzedzia/podglad_mapy.cjs kampanie/Template/mapa_kraina.svg");
    process.exit(2);
  }
  let chromium;
  try {
    ({ chromium } = require("playwright"));
  } catch {
    console.error("Brak pakietu „playwright” (instrukcja: testy/README.md, rozdział o teście e2e).");
    process.exit(2);
  }
  const motywy = opcja("motywy", MOTYWY.join(",")).split(",").filter(Boolean);
  const zle = motywy.filter((m) => !MOTYWY.includes(m));
  if (zle.length) {
    console.error(`Nieznany motyw: ${zle.join(", ")}. Dozwolone: ${MOTYWY.join(", ")}.`);
    process.exit(2);
  }
  const szerokosc = Number(opcja("szerokosc", "1600"));
  const wycinek = opcja("wycinek", "");
  const folder = path.resolve(KORZEN, opcja("folder", path.join("testy", "e2e", "wyniki", "podglad")));
  fs.mkdirSync(folder, { recursive: true });

  // Na start: zasłonięte miejsca z manifestu kampanii (z folderu pliku) — tak jak w aplikacji.
  let zasloniecie = "";
  if (process.argv.includes("--na-start")) {
    const plikManifestu = path.join(path.dirname(plik), "kampania.json");
    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(plikManifestu, "utf8"));
    } catch (e) {
      console.error(`--na-start: nie da się odczytać manifestu ${plikManifestu} (${e.message}).`);
      process.exit(2);
    }
    const ids = (manifest.elementy || []).filter((e) => e.widocznyDomyslnie === false).map((e) => e.id);
    console.log(`Na start zasłonięte: ${ids.join(", ") || "(brak)"}`);
    zasloniecie = ids
      .flatMap((id) => [`[data-element="${id}"]`, `[data-element="${id}"] *`, `[data-nalezy-do="${id}"]`, `[data-nalezy-do="${id}"] *`])
      .join(",");
    if (zasloniecie) zasloniecie += "{visibility:hidden!important}";
  }

  // Komentarze z pliku nie są potrzebne do podglądu; reszta trafia na stronę tak jak w aplikacji.
  const svg = fs.readFileSync(plik, "utf8").replace(/<!--[\s\S]*?-->/g, "");
  const przegladarka = await chromium.launch();
  const strona = await przegladarka.newPage({ viewport: { width: szerokosc, height: 900 }, deviceScaleFactor: 1 });
  const nazwa = path.basename(plik, ".svg") + (process.argv.includes("--na-start") ? "_na-start" : "");
  for (const motyw of motywy) {
    await strona.setContent(
      `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#111}` +
        `.ramka{width:${szerokosc}px}.ramka svg{width:100%;height:auto;display:block}${zasloniecie}</style></head>` +
        `<body class="motyw-${motyw}"><div class="ramka">${svg}</div></body></html>`
    );
    await strona.waitForTimeout(150);
    const mapa = await strona.$(".ramka svg");
    if (!mapa) throw new Error("Plik nie zawiera elementu <svg>.");
    const wynik = path.join(folder, `${nazwa}_${motyw}.png`);
    if (wycinek) {
      const [x, y, w, h] = wycinek.split(",").map(Number);
      const r = await mapa.boundingBox();
      await strona.screenshot({ path: wynik, fullPage: true, clip: { x: r.x + x, y: r.y + y, width: w, height: h } });
    } else {
      await mapa.screenshot({ path: wynik });
    }
    console.log(`Zapisano ${path.relative(KORZEN, wynik)}`);
  }
  await przegladarka.close();
})().catch((e) => {
  console.error(`BŁĄD: ${e.message}`);
  process.exit(1);
});
