// Prosty serwer plików statycznych do testów (Node, bez zależności).
// Użycie samodzielne: node testy/e2e/serwer.cjs [port]
const http = require("http");
const fs = require("fs");
const path = require("path");

const TYPY = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".csv": "text/csv; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

function uruchomSerwer(katalog, port = 0) {
  const korzen = path.resolve(katalog);
  const serwer = http.createServer((zad, odp) => {
    const adres = decodeURIComponent(new URL(zad.url, "http://localhost").pathname);
    let plik = path.normalize(path.join(korzen, adres));
    if (!plik.startsWith(korzen)) {
      odp.writeHead(403).end();
      return;
    }
    if (fs.existsSync(plik) && fs.statSync(plik).isDirectory()) plik = path.join(plik, "index.html");
    fs.readFile(plik, (blad, dane) => {
      if (blad) {
        odp.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("404");
        return;
      }
      odp.writeHead(200, { "Content-Type": TYPY[path.extname(plik)] || "application/octet-stream", "Cache-Control": "no-store" });
      odp.end(dane);
    });
  });
  return new Promise((ok) => serwer.listen(port, "127.0.0.1", () => ok(serwer)));
}

module.exports = { uruchomSerwer };

if (require.main === module) {
  const port = Number(process.argv[2] || 8000);
  uruchomSerwer(path.join(__dirname, "..", ".."), port).then(() => console.log(`Serwer: http://127.0.0.1:${port}/`));
}
