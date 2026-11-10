// Testy całej aplikacji w prawdziwej przeglądarce (Chromium przez Playwright),
// z UDAWANYM Firebase (testy/e2e/falszywy-firebase) — prawdziwa baza nie jest używana.
//
// Uruchomienie (z katalogu głównego repozytorium):
//   node testy/e2e/uruchom.cjs
// Wymaga pakietu „playwright” z przeglądarką Chromium (npm i -D playwright && npx playwright install chromium).
// Zrzuty ekranu trafiają do testy/e2e/wyniki/ (folder nie jest wersjonowany).
// Zmienna CZCIONKI=1 pozwala pobrać czcionki z Google Fonts (ładniejsze zrzuty).

const { chromium, devices } = require("playwright");
const fs = require("fs");
const path = require("path");
const { uruchomSerwer } = require("./serwer.cjs");

const KORZEN = path.join(__dirname, "..", "..");
const FALSZYWY = path.join(__dirname, "falszywy-firebase");
const WYNIKI = path.join(__dirname, "wyniki");
fs.mkdirSync(WYNIKI, { recursive: true });

// Konta TESTOWE — wymyślone na potrzeby testów, nie mają nic wspólnego z prawdziwymi.
// Profile wynikają WYŁĄCZNIE z pola „rola” w admins: Admin („admin”), Edytor („edytor” —
// pisze notatki), Gracz (bez wpisu — tylko czyta). Nazwy DisplayName są celowo mylące
// (konto do przeglądania nazywa się „Skryba”, edytor — „Kronikarz”), żeby sprawdzić,
// że nazwa konta nie wpływa na uprawnienia.
const KONTA = {
  "secrets/Player1": { PlayerName: "test-admin", PlayerPassword: "haslo-admina", DisplayName: "Admin" },
  "secrets/Player2": { PlayerName: "test-edytor", PlayerPassword: "haslo-edytora", DisplayName: "Kronikarz" },
  "secrets/Player3": { PlayerName: "test-gracz", PlayerPassword: "haslo-gracza", DisplayName: "Skryba" },
  "admins/Player1": { rola: "admin" },
  "admins/Player2": { rola: "edytor" }
};
const NOTATKI_STARTOWE = {
  // notatka o miejscu, którego nie ma w manifeście
  "kampanie/iliac/notatki/sierota": { elementId: "miejsce-usuniete", tytul: "Stara notatka", tresc: "o zniknietym miejscu", kategoria: "miejsce", podpis: "Ala", kontoId: "Player2" },
  // notatka o miejscu, które jest domyślnie niedostępne dla graczy
  "kampanie/iliac/notatki/ukryta": { elementId: "brassyl", tytul: "Notatka z ukrytego miejsca", tresc: "tekst", kategoria: "miejsce", podpis: "Ola", kontoId: "Player2" }
};
// Rejestr kampanii w teście: prawdziwy + druga, domyślnie ukryta kampania próbna.
const REJESTR = JSON.parse(fs.readFileSync(path.join(KORZEN, "kampanie.json"), "utf8"));
REJESTR.kampanie.push({ id: "proba", nazwa: "Kampania próbna", folder: "kampanie/Iliac" });
const POLE_ILIAC = '#kampanie input[aria-label="Kampania Kopiec Iliac widoczna dla graczy"]';
const POLE_PROBNEJ = '#kampanie input[aria-label="Kampania Kampania próbna widoczna dla graczy"]';

const wyniki = [];
async function krok(nazwa, funkcja) {
  try {
    await funkcja();
    wyniki.push({ nazwa, ok: true });
    console.log(`  OK    ${nazwa}`);
  } catch (e) {
    wyniki.push({ nazwa, ok: false, blad: e.message });
    console.log(`  BŁĄD  ${nazwa}\n        ${String(e.message).split("\n")[0]}`);
  }
}
function zalozenie(warunek, opis) {
  if (!warunek) throw new Error(opis);
}

async function nowyKontekst(przegladarka, opcje = {}) {
  const ctx = await przegladarka.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true, ...opcje });
  await ctx.route("https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js", (r) =>
    r.fulfill({ contentType: "text/javascript", body: fs.readFileSync(path.join(FALSZYWY, "firebase-app.js"), "utf8") })
  );
  await ctx.route("https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js", (r) =>
    r.fulfill({ contentType: "text/javascript", body: fs.readFileSync(path.join(FALSZYWY, "firebase-firestore.js"), "utf8") })
  );
  await ctx.route("https://www.gstatic.com/firebasejs/13.2.0/firebase-app-check.js", (r) =>
    r.fulfill({ contentType: "text/javascript", body: fs.readFileSync(path.join(FALSZYWY, "firebase-app-check.js"), "utf8") })
  );
  await ctx.route(/\/kampanie\.json(\?.*)?$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify(REJESTR) }));
  // Nic nie może wyjść do prawdziwych usług Google (reCAPTCHA, App Check, Firestore).
  await ctx.route(/(google\.com\/recaptcha|firebaseappcheck\.googleapis\.com|firestore\.googleapis\.com)/, (r) => r.abort());
  if (!process.env.CZCIONKI) {
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
  }
  const baza = { ...KONTA, ...NOTATKI_STARTOWE };
  await ctx.addInitScript((dane) => {
    if (!localStorage.getItem("falszywa-baza")) localStorage.setItem("falszywa-baza", JSON.stringify(dane));
  }, baza);
  return ctx;
}

async function nowaStrona(ctx, bledy) {
  const strona = await ctx.newPage();
  strona.on("pageerror", (e) => bledy.push(`pageerror: ${e.message}`));
  strona.on("console", (m) => {
    if (m.type() === "error") bledy.push(`console: ${m.text()}`);
  });
  return strona;
}

// Logowanie na stronie startowej (bez logowania aplikacja niczego nie pokazuje).
async function zaloguj(strona, login, haslo) {
  await strona.waitForSelector("#sekcja-logowania:not([hidden]) input[name=login]");
  await strona.fill("input[name=login]", login);
  await strona.fill("input[name=haslo]", haslo);
  await strona.click("button[type=submit]");
  await strona.waitForSelector("#sekcja-kampanii:not([hidden])");
}

async function wyloguj(strona) {
  await strona.click("#konto button:has-text('WYLOGUJ')");
  await strona.waitForSelector("#sekcja-logowania:not([hidden]) input[name=login]");
}

async function bezPrzewijaniaWBok(strona) {
  const { szer, okno } = await strona.evaluate(() => ({ szer: document.documentElement.scrollWidth, okno: window.innerWidth }));
  zalozenie(szer <= okno, `strona przewija się w bok (${szer}px > ${okno}px)`);
}

(async () => {
  const serwer = await uruchomSerwer(KORZEN);
  const ADRES = `http://127.0.0.1:${serwer.address().port}`;
  const przegladarka = await chromium.launch();
  const bledy = [];

  // ===================================================================== komputer
  console.log("\n[komputer 1280×800]");
  const ctx = await nowyKontekst(przegladarka);
  const s = await nowaStrona(ctx, bledy);

  await krok("bez logowania: strona startowa pokazuje tylko logowanie — bez nazw kampanii", async () => {
    await s.goto(`${ADRES}/index.html`);
    await s.waitForSelector("#sekcja-logowania input[name=login]");
    zalozenie(await s.$eval("#sekcja-kampanii", (x) => x.hidden), "lista kampanii widoczna bez logowania");
    const tekst = await s.textContent("body");
    zalozenie(!/iliac|próbna/i.test(tekst), "nazwa kampanii widoczna bez logowania");
    zalozenie(!/reCAPTCHA/i.test(tekst), "w stopce nadal jest napis o reCAPTCHA");
    await s.screenshot({ path: path.join(WYNIKI, "01_start.png") });
  });

  await krok("bez logowania: strona kampanii przekierowuje do logowania (bez nazwy i map)", async () => {
    await s.goto(`${ADRES}/kampania.html?k=iliac#okolice`);
    await s.waitForURL(/index\.html\?k=iliac#okolice$/);
    await s.waitForSelector("#sekcja-logowania input[name=login]");
    zalozenie((await s.$$(".plansza")).length === 0, "mapa wczytana bez logowania");
    zalozenie(!/iliac/i.test(await s.textContent("body")), "nazwa kampanii widoczna bez logowania");
  });

  await krok("logowanie: złe hasło → ogólny komunikat", async () => {
    await s.fill("input[name=login]", "test-gracz");
    await s.fill("input[name=haslo]", "zle-haslo");
    await s.click("button[type=submit]");
    await s.waitForSelector(".formularz-blad:not([hidden])");
    const t = await s.textContent(".formularz-blad");
    zalozenie(t.includes("Nieprawidłowy login lub hasło"), `zły komunikat: ${t}`);
  });

  await krok("logowanie: nieznany login → ten sam komunikat", async () => {
    await s.fill("input[name=login]", "ktos-obcy");
    await s.fill("input[name=haslo]", "cokolwiek");
    await s.click("button[type=submit]");
    await s.waitForTimeout(200);
    const t = await s.textContent(".formularz-blad");
    zalozenie(t.includes("Nieprawidłowy login lub hasło"), `zły komunikat: ${t}`);
  });

  // ---- gracz (tylko czyta)
  await krok("gracz: po zalogowaniu wraca do kampanii z odnośnika; u góry login, u dołu DisplayName", async () => {
    await s.fill("input[name=login]", "test-gracz");
    await s.fill("input[name=haslo]", "haslo-gracza");
    await s.click("button[type=submit]");
    await s.waitForURL(/kampania\.html\?k=iliac#okolice$/);
    await s.waitForSelector(".plansza svg .el");
    const konto = await s.textContent("#konto");
    zalozenie(konto.includes("KONTO: test-gracz"), `konto u góry: ${konto}`);
    await s.waitForSelector("#status .status-konto");
    const dol = await s.textContent("#status .status-konto");
    // Konto do przeglądania ma w teście DisplayName „Skryba” — nazwa nie daje edycji.
    zalozenie(dol === "KONTO: Skryba", `konto u dołu: ${dol}`);
    zalozenie(!/reCAPTCHA/i.test(await s.textContent("#status")), "w stopce nadal jest napis o reCAPTCHA");
    const sesja = await s.evaluate(() => sessionStorage.getItem("notatkirpg.sesja"));
    zalozenie(!/haslo/i.test(sesja), "hasło zapisane w sesji!");
  });

  await krok("gracz: lista kampanii — tylko udostępnione (bez ukrytej kampanii próbnej), bez opisu", async () => {
    await s.goto(`${ADRES}/index.html`);
    await s.waitForSelector("#kampanie a.kampania");
    const nazwy = await s.$$eval("#kampanie li:not([hidden]) a.kampania", (a) => a.map((x) => x.textContent.trim()));
    zalozenie(JSON.stringify(nazwy) === JSON.stringify(["▸ KOPIEC ILIAC"]), `lista kampanii gracza: ${JSON.stringify(nazwy)}`);
    zalozenie(!/próbna/i.test(await s.textContent("#srodek")), "gracz widzi nazwę ukrytej kampanii");
    zalozenie((await s.$$("#kampanie input")).length === 0, "gracz widzi pola widoczności kampanii");
    zalozenie((await s.textContent("#status-konto")) === "KONTO: Skryba", "brak nazwy konta u dołu strony startowej");
    await s.screenshot({ path: path.join(WYNIKI, "02_gracz_lista_kampanii.png") });
  });

  await krok("gracz: ukryta kampania z odnośnika → „KAMPANIA NIEDOSTĘPNA” (bez nazwy)", async () => {
    await s.goto(`${ADRES}/kampania.html?k=proba`);
    await s.waitForSelector("#srodek h2:has-text('KAMPANIA NIEDOSTĘPNA')");
    zalozenie(!/próbna|iliac/i.test(await s.textContent("body")), "na ekranie jest nazwa ukrytej kampanii");
    zalozenie((await s.$$(".plansza")).length === 0, "mapa ukrytej kampanii została wczytana");
  });

  await krok("gracz: Notatki jako pierwsza i domyślna zakładka, potem Okolice; bez Kopca i Admina", async () => {
    await s.goto(`${ADRES}/kampania.html?k=iliac`);
    await s.waitForSelector("#widok-notatki:not([hidden]) .lista-wpisow");
    const zakladki = await s.$$eval("#zakladki .zakladka", (z) => z.map((x) => x.textContent.trim()));
    zalozenie(zakladki[0].includes("NOTATKI"), `pierwsza zakładka: ${zakladki[0]}`);
    zalozenie(zakladki.some((z) => z.includes("OKOLICE")), `brak Okolic: ${zakladki}`);
    zalozenie(!zakladki.some((z) => /KOPIEC|ADMIN/.test(z)), `nieoczekiwane zakładki: ${zakladki}`);
    zalozenie((await s.textContent('#zakladki [aria-selected="true"]')).includes("NOTATKI"), "domyślnie nie otwiera się zakładka Notatki");
    zalozenie((await s.$$("#zakladki .zakladka-pole")).length === 0, "gracz widzi przełączniki widoczności zakładek");
    zalozenie(await s.$eval("#widok-notatki button:has-text('NOWA NOTATKA')", (b) => b.hidden), "gracz może dodać notatkę");
    zalozenie((await s.$$("#widok-notatki button:has-text('EDYTUJ'), #widok-notatki button:has-text('USUŃ')")).length === 0, "gracz może zmieniać notatki");
    await s.click("#zakladki .zakladka:has-text('OKOLICE')");
    await s.waitForSelector(".plansza svg .el");
  });

  await krok("gracz: część miejsc klikalna, część jak tło", async () => {
    await s.waitForTimeout(400);
    const stany = await s.$$eval(".plansza svg [data-element]", (g) =>
      Object.fromEntries(g.map((x) => [x.dataset.element, { klik: x.classList.contains("el-dostepny"), tab: x.getAttribute("tabindex"), aria: x.getAttribute("aria-label") }]))
    );
    for (const id of ["kopiec-iliac", "ocean-sciekow", "droga-wybrzeza", "trakt"]) zalozenie(stany[id]?.klik && stany[id].tab === "0", `${id} powinien być klikalny`);
    for (const id of ["kanion-gorniczy", "szkielet-karnozaura", "brassyl"]) {
      zalozenie(!stany[id].klik && stany[id].tab === null && stany[id].aria === null, `${id} powinien wyglądać jak tło`);
    }
    // Niedostępny element: bez narożników i bez reakcji na wskaźnik.
    const naroznikiUkrytego = await s.$$eval('[data-element="brassyl"] .el-naroznik', (n) => n.filter((x) => x.getBoundingClientRect().width > 0).length);
    const naroznikiDostepnego = await s.$$eval('[data-element="trakt"] .el-naroznik', (n) => n.filter((x) => x.getBoundingClientRect().width > 0).length);
    zalozenie(naroznikiDostepnego > 0, "dostępny element nie ma widocznych narożników");
    zalozenie(naroznikiUkrytego === 0, "niedostępny element ma widoczne narożniki");
    const pe = await s.$eval('[data-element="brassyl"]', (g) => getComputedStyle(g).pointerEvents);
    zalozenie(pe === "none", `niedostępny element reaguje na wskaźnik (${pe})`);
    await s.screenshot({ path: path.join(WYNIKI, "02_gracz_okolice.png") });
  });

  await krok("gracz: indeks pokazuje tylko dostępne miejsca", async () => {
    const nazwy = await s.$$eval("#indeks .indeks-pozycje .indeks-nazwa", (n) => n.map((x) => x.textContent));
    zalozenie(nazwy.length === 4, `oczekiwano 4 miejsc, jest ${nazwy.length}: ${nazwy}`);
    zalozenie(!nazwy.some((n) => /Brassyl|Kanion|Szkielet/.test(n)), `w indeksie są ukryte miejsca: ${nazwy}`);
    await s.fill("#indeks .indeks-szukaj", "brassyl");
    await s.waitForTimeout(300);
    const poSzukaniu = await s.$$eval("#indeks .indeks-pozycje .indeks-nazwa", (n) => n.length);
    zalozenie(poSzukaniu === 0, "wyszukiwarka gracza znalazła ukryte miejsce");
    await s.fill("#indeks .indeks-szukaj", "trakt");
    await s.waitForTimeout(300);
    const trakt = await s.$$eval("#indeks .indeks-pozycje .indeks-nazwa", (n) => n.map((x) => x.textContent));
    zalozenie(trakt.length === 1 && trakt[0] === "Trakt", `szukanie „trakt”: ${trakt}`);
    await s.fill("#indeks .indeks-szukaj", "");
  });

  await krok("gracz: adres #kopiec (ukryta mapa) → pierwsza dostępna zakładka", async () => {
    await s.goto(`${ADRES}/kampania.html?k=iliac#kopiec`);
    await s.waitForSelector("#widok-notatki:not([hidden])");
    const aktywna = await s.textContent('#zakladki [aria-selected="true"]');
    zalozenie(aktywna.includes("NOTATKI"), `aktywna zakładka: ${aktywna}`);
    zalozenie((await s.$$('.plansza svg[data-mapa="kopiec"]')).length === 0, "ukryta mapa została wczytana");
    await s.goto(`${ADRES}/kampania.html?k=iliac#okolice`);
    await s.waitForSelector('.plansza:not([hidden]) svg[data-mapa="okolice"]');
  });

  await krok("gracz: kliknięcie miejsca otwiera kartę bez „Dodaj notatkę”", async () => {
    await s.waitForTimeout(400);
    await s.click('[data-element="kopiec-iliac"] text >> nth=0');
    await s.waitForSelector("#panel:not([hidden]) .panel-nazwa");
    zalozenie((await s.textContent(".panel-nazwa")) === "Kopiec Iliac", "zła nazwa w karcie");
    zalozenie((await s.$$("#panel button:has-text('DODAJ NOTATKĘ')")).length === 0, "gracz widzi „Dodaj notatkę”");
    zalozenie((await s.textContent("#panel")).includes("Notatki dodaje konto edytora"), "brak informacji, kto dodaje notatki");
    zalozenie(s.url().includes("#okolice/kopiec-iliac"), `adres nie wskazuje miejsca: ${s.url()}`);
  });

  await krok("gracz: notatka o ukrytym miejscu w „bez miejsca na mapie”, bez nazwy miejsca", async () => {
    await s.click("#zakladki .zakladka:has-text('NOTATKI')");
    await s.waitForSelector("#widok-notatki .sekcja-tytul");
    const tekst = await s.textContent("#widok-notatki");
    zalozenie(tekst.includes("NOTATKI BEZ MIEJSCA NA MAPIE"), "brak sekcji „bez miejsca”");
    zalozenie(tekst.includes("Notatka z ukrytego miejsca") && tekst.includes("Stara notatka"), "brak notatek bez miejsca");
    zalozenie(!/Brassyl/i.test(tekst), "nazwa ukrytego miejsca wyciekła do widoku notatek");
  });

  await krok("gracz: wylogowanie → ekran logowania, sesja wyczyszczona", async () => {
    await s.click("#konto button:has-text('WYLOGUJ')");
    await s.waitForURL(/index\.html$/);
    await s.waitForSelector("#sekcja-logowania:not([hidden]) input[name=login]");
    const sesja = await s.evaluate(() => sessionStorage.getItem("notatkirpg.sesja"));
    zalozenie(sesja === null, "sesja nie została wyczyszczona");
    zalozenie(await s.$eval("#sekcja-kampanii", (x) => x.hidden), "po wylogowaniu widać listę kampanii");
  });

  // ---- edytor (rola „edytor” w admins — pisze notatki)
  await krok("edytor: logowanie, wybór kampanii z listy; u góry login, u dołu DisplayName (dowolny)", async () => {
    await zaloguj(s, "test-edytor", "haslo-edytora");
    await s.click("#kampanie a.kampania:has-text('KOPIEC ILIAC')");
    await s.waitForSelector("#widok-notatki:not([hidden]) .lista-wpisow");
    zalozenie((await s.textContent("#konto")).includes("KONTO: test-edytor"), "zły login u góry");
    zalozenie((await s.textContent("#status .status-konto")) === "KONTO: Kronikarz", "zła nazwa konta u dołu");
    zalozenie(!(await s.$eval("#widok-notatki button:has-text('NOWA NOTATKA')", (b) => b.hidden)), "edytor nie może dodać notatki");
  });

  const s2 = await nowaStrona(ctx, bledy); // druga karta (Gracz) — do sprawdzenia zmian na żywo
  await s2.goto(`${ADRES}/index.html`);
  await zaloguj(s2, "test-gracz", "haslo-gracza");
  await s2.goto(`${ADRES}/kampania.html?k=iliac#notatki`);
  await s2.waitForSelector("#widok-notatki .lista-wpisow");

  await krok("edytor: dodanie notatki przy miejscu (z podpisem, wiele wierszy, próba HTML)", async () => {
    await s.click("#zakladki .zakladka:has-text('OKOLICE')");
    await s.waitForTimeout(300);
    await s.click('[data-element="trakt"] text >> nth=0');
    await s.waitForSelector("#panel button:has-text('DODAJ NOTATKĘ')");
    await s.click("#panel button:has-text('DODAJ NOTATKĘ')");
    await s.waitForSelector("dialog textarea");
    zalozenie((await s.evaluate(() => document.activeElement.tagName)) === "TEXTAREA", "kursor nie stoi w polu „Treść”");
    zalozenie((await s.$$("dialog select")).length === 1, "w formularzu nadal jest pole kategorii");
    await s.fill("dialog input >> nth=0", "Przemytnicy na Trakcie");
    await s.fill("dialog textarea", 'Pierwszy wiersz\nDrugi wiersz <img src=x onerror="window.__xss=1">');
    await s.fill("dialog input[list]", "Brat Kael");
    await s.click("dialog button[type=submit]");
    await s.waitForSelector("dialog", { state: "detached" });
    await s.waitForSelector("#panel .karta-tytul:has-text('Przemytnicy na Trakcie')");
    const tresc = await s.textContent("#panel .karta-tresc");
    zalozenie(tresc.includes('<img src=x onerror="window.__xss=1">'), "HTML nie został pokazany jako tekst");
    zalozenie((await s.evaluate(() => window.__xss)) === undefined, "kod z notatki się wykonał!");
    zalozenie((await s.$$("#panel .karta-tresc img")).length === 0, "w karcie powstał element <img>");
    const ws = await s.$eval("#panel .karta-tresc", (x) => getComputedStyle(x).whiteSpace);
    zalozenie(ws === "pre-wrap", "podziały wierszy nie są zachowane");
    const meta = await s.textContent("#panel .karta-meta");
    zalozenie(meta.includes("Brat Kael"), "brak podpisu");
    zalozenie(meta.startsWith("◈ Trakt"), `etykieta notatki nie pokazuje miejsca: ${meta}`);
    zalozenie(!meta.includes("Miejsce ·"), `etykieta nadal pokazuje kategorię: ${meta}`);
    // Czerwona kropka przy miejscu z notatką.
    await s.waitForSelector('[data-element="trakt"].el-ma-notatki');
    const kropka = await s.$eval('[data-element="trakt"] .el-kropka', (k) => k.getBoundingClientRect().width);
    zalozenie(kropka > 0, "brak czerwonej kropki przy miejscu z notatką");
    await s.screenshot({ path: path.join(WYNIKI, "03_edytor_karta_miejsca.png") });
  });

  await krok("na żywo: Gracz w drugiej karcie widzi nową notatkę bez odświeżania", async () => {
    await s2.waitForSelector("#widok-notatki .karta-tytul:has-text('Przemytnicy na Trakcie')", { timeout: 4000 });
  });

  await krok("edytor: edycja notatki", async () => {
    await s.click("#panel .karta button:has-text('EDYTUJ')");
    await s.fill("dialog input >> nth=0", "Przemytnicy na Trakcie (potwierdzone)");
    await s.click("dialog button[type=submit]");
    await s.waitForSelector("#panel .karta-tytul:has-text('(potwierdzone)')");
  });

  await krok("edytor: notatka ogólna (etykieta „notatka ogólna”)", async () => {
    await s.click("#zakladki .zakladka:has-text('NOTATKI')");
    await s.click("#widok-notatki button:has-text('NOWA NOTATKA')");
    await s.fill("dialog input >> nth=0", "Plan na następną sesję");
    await s.fill("dialog textarea", "Zapytać o Iglicę Cumowniczą.");
    await s.click("dialog button[type=submit]");
    await s.waitForSelector("#widok-notatki .sekcja-tytul:has-text('NOTATKI OGÓLNE')");
    const meta = await s.textContent("#widok-notatki .karta:has-text('Plan na następną sesję') .karta-meta");
    zalozenie(meta.startsWith("notatka ogólna"), `etykieta notatki ogólnej: ${meta}`);
  });
  await krok("edytor: wyszukiwarka notatek (bez polskich znaków, po nazwie miejsca)", async () => {
    await s.click("#zakladki .zakladka:has-text('NOTATKI')");
    await s.fill("#widok-notatki input[type=search]", "nastepna sesje");
    await s.waitForTimeout(300);
    let tytuly = await s.$$eval("#widok-notatki .karta-tytul", (t) => t.map((x) => x.textContent));
    zalozenie(tytuly.length === 1 && tytuly[0].includes("Plan na następną sesję"), `szukanie: ${tytuly}`);
    await s.fill("#widok-notatki input[type=search]", "trakt");
    await s.waitForTimeout(300);
    tytuly = await s.$$eval("#widok-notatki .karta-tytul", (t) => t.map((x) => x.textContent));
    zalozenie(tytuly.some((t) => t.includes("Przemytnicy")), "szukanie po nazwie miejsca nie działa");
    await s.fill("#widok-notatki input[type=search]", "");
    await s.waitForTimeout(200);
  });

  await krok("edytor: usunięcie notatki (z potwierdzeniem)", async () => {
    const przed = (await s.$$("#widok-notatki .karta")).length;
    await s.click("#widok-notatki .karta:has-text('Plan na następną sesję') button:has-text('USUŃ')");
    await s.click("dialog button:has-text('ANULUJ')");
    zalozenie((await s.$$("#widok-notatki .karta")).length === przed, "anulowanie usunęło notatkę");
    await s.click("#widok-notatki .karta:has-text('Plan na następną sesję') button:has-text('USUŃ')");
    await s.click("dialog button:has-text('USUŃ')");
    await s.waitForTimeout(300);
    zalozenie((await s.$$("#widok-notatki .karta")).length === przed - 1, "notatka nie została usunięta");
  });

  await krok("klawiatura: Tab do miejsca na mapie + Enter otwiera kartę", async () => {
    await s.click("#zakladki .zakladka:has-text('OKOLICE')");
    await s.waitForTimeout(400);
    await s.focus('[data-element="ocean-sciekow"]');
    await s.keyboard.press("Enter");
    await s.waitForSelector("#panel:not([hidden]) .panel-nazwa:has-text('Ocean ścieków')");
    await s.keyboard.press("Escape");
    await s.waitForSelector("#panel", { state: "hidden" });
  });

  // ---- admin
  const sa = await nowaStrona(ctx, bledy);
  await krok("admin: lista kampanii — wszystkie (także ukryta próbna) z polem „widoczna dla graczy”", async () => {
    await sa.goto(`${ADRES}/index.html`);
    await zaloguj(sa, "test-admin", "haslo-admina");
    await sa.waitForSelector(`${POLE_PROBNEJ}:not([disabled])`);
    const pola = await sa.$$eval("#kampanie input.przelacznik", (p) => p.map((x) => [x.getAttribute("aria-label"), x.checked]));
    zalozenie(
      JSON.stringify(pola) === JSON.stringify([["Kampania Kopiec Iliac widoczna dla graczy", true], ["Kampania Kampania próbna widoczna dla graczy", false]]),
      `pola widoczności kampanii: ${JSON.stringify(pola)}`
    );
    zalozenie((await sa.$$("#kampanie .kampania-ukryta")).length === 1, "ukryta kampania nie jest wyróżniona");
    zalozenie(!(await sa.textContent("#kampanie")).includes("Warhammer"), "opis kampanii nadal ma dopisek");
    await sa.screenshot({ path: path.join(WYNIKI, "04_admin_lista_kampanii.png") });
  });

  await krok("admin → gracz na żywo: odsłonięcie i ukrycie kampanii próbnej na liście", async () => {
    await s2.goto(`${ADRES}/index.html`);
    await s2.waitForSelector("#kampanie li:not([hidden]) a.kampania");
    zalozenie(!(await s2.textContent("#kampanie")).includes("PRÓBNA"), "gracz widzi ukrytą kampanię");
    await sa.check(POLE_PROBNEJ);
    await s2.waitForSelector("#kampanie li:not([hidden]) a.kampania:has-text('KAMPANIA PRÓBNA')", { timeout: 4000 });
    await sa.uncheck(POLE_PROBNEJ);
    await s2.waitForSelector("#kampanie li:has-text('KAMPANIA PRÓBNA')", { state: "hidden", timeout: 4000 });
  });

  await krok("admin → gracz na żywo: ukrycie oglądanej kampanii → „KAMPANIA NIEDOSTĘPNA”; odsłonięcie → wraca", async () => {
    await s2.goto(`${ADRES}/kampania.html?k=iliac#okolice`);
    await s2.waitForSelector(".plansza svg .el");
    await sa.uncheck(POLE_ILIAC);
    await s2.waitForSelector("#srodek h2:has-text('KAMPANIA NIEDOSTĘPNA')", { timeout: 6000 });
    zalozenie(!/iliac/i.test(await s2.textContent("body")), "na ekranie jest nazwa ukrytej kampanii");
    await s2.screenshot({ path: path.join(WYNIKI, "04b_gracz_kampania_niedostepna.png") });
    await sa.check(POLE_ILIAC);
    await s2.waitForSelector(".plansza svg .el", { timeout: 6000 });
  });

  await krok("admin: kampania z listy — zakładki Kopiec (ukryta) i Admin, przełącznik przy każdej zakładce", async () => {
    await sa.goto(`${ADRES}/kampania.html?k=iliac#okolice`);
    await sa.waitForSelector(".plansza svg");
    zalozenie((await sa.textContent("#konto")).includes("KONTO: test-admin"), "zły login u góry");
    zalozenie((await sa.textContent("#status .status-konto")) === "KONTO: Admin", "zła nazwa konta u dołu");
    const zakladki = await sa.$$eval("#zakladki .zakladka", (z) => z.map((x) => x.textContent.trim()));
    zalozenie(zakladki.some((z) => z.includes("KOPIEC") && z.includes("⊘")), `brak ukrytej zakładki Kopiec: ${zakladki}`);
    zalozenie(zakladki.some((z) => z.includes("ADMIN")), "brak zakładki Admin");
    const pola = await sa.$$eval("#zakladki .zakladka-pole", (p) => p.map((x) => [x.getAttribute("aria-label"), x.checked]));
    zalozenie(pola.length === 3, `oczekiwano 3 przełączników (Notatki, Okolice, Kopiec): ${JSON.stringify(pola)}`);
    zalozenie(JSON.stringify(pola) === JSON.stringify([["Widoczna dla graczy: Notatki", true], ["Widoczna dla graczy: Okolice", true], ["Widoczna dla graczy: Kopiec", false]]), `stan przełączników: ${JSON.stringify(pola)}`);
  });

  await krok("admin: indeks pokazuje wszystkie miejsca z polami wyboru", async () => {
    await sa.waitForSelector("#indeks .indeks-admin");
    const ile = await sa.$$eval("#indeks .indeks-admin", (n) => n.length);
    zalozenie(ile === 24, `oczekiwano 24 miejsc w indeksie admina, jest ${ile}`);
    await sa.fill("#indeks .indeks-szukaj", "brassyl");
    await sa.waitForTimeout(300);
    zalozenie((await sa.$$("#indeks .indeks-admin")).length === 1, "admin nie znalazł ukrytego miejsca");
    await sa.fill("#indeks .indeks-szukaj", "");
    await sa.screenshot({ path: path.join(WYNIKI, "05_admin_okolice.png") });
  });

  await krok("admin: przegląda wpisy, ale nie ma przycisków edycji", async () => {
    await sa.click('[data-element="trakt"] text >> nth=0');
    await sa.waitForSelector("#panel:not([hidden]) .karta");
    zalozenie((await sa.$$("#panel button:has-text('EDYTUJ'), #panel button:has-text('USUŃ'), #panel button:has-text('DODAJ')")).length === 0, "admin może edytować wpisy");
    zalozenie((await sa.$$("#panel .panel-admin input[type=checkbox]")).length === 1, "brak pola „dostępne dla graczy” w karcie");
  });

  await krok("admin → gracz na żywo: zaznaczenie miejsca w indeksie (z czerwoną kropką, bo są notatki)", async () => {
    await s.goto(`${ADRES}/kampania.html?k=iliac#okolice`);
    await s.waitForSelector('.plansza svg [data-element="brassyl"]');
    await s.waitForTimeout(400);
    zalozenie(!(await s.$eval('[data-element="brassyl"]', (g) => g.classList.contains("el-ma-notatki"))), "kropka przy miejscu ukrytym przed graczami");
    await sa.click('#indeks li:has-text("Brassyl") input[type=checkbox]');
    await s.waitForSelector('.plansza svg [data-element="brassyl"].el-dostepny', { timeout: 4000 });
    await s.waitForSelector('#indeks .indeks-nazwa:has-text("Brassyl")', { timeout: 4000 });
    await s.waitForSelector('[data-element="brassyl"].el-ma-notatki', { timeout: 4000 });
    zalozenie((await s.$eval('[data-element="brassyl"] .el-kropka', (k) => k.getBoundingClientRect().width)) > 0, "kropka niewidoczna");
  });

  await krok("czerwona kropka znika, gdy admin wyłączy miejsce", async () => {
    await sa.click('#indeks li:has-text("Brassyl") input[type=checkbox]');
    await s.waitForFunction(() => !document.querySelector('[data-element="brassyl"]').classList.contains("el-dostepny"), null, { timeout: 4000 });
    zalozenie((await s.$eval('[data-element="brassyl"] .el-kropka', (k) => k.getBoundingClientRect().width)) === 0, "kropka widoczna przy wyłączonym miejscu");
    await sa.click('#indeks li:has-text("Brassyl") input[type=checkbox]');
    await s.waitForSelector('[data-element="brassyl"].el-dostepny.el-ma-notatki', { timeout: 4000 });
  });

  await krok("admin → gracz na żywo: odsłonięcie zakładki Kopiec i kolor bursztynowy", async () => {
    await sa.click("#zakladki .zakladka:has-text('ADMIN')");
    await sa.waitForSelector("#widok-admin .admin-mapa");
    await sa.check('#widok-admin input[aria-label="Zakładka Kopiec widoczna dla graczy"]');
    await s.waitForSelector("#zakladki .zakladka:has-text('KOPIEC')", { timeout: 4000 });
    await sa.selectOption('#widok-admin select[aria-label="Kolor mapy Okolice"]', "bursztynowy");
    await s.waitForFunction(() => document.body.classList.contains("motyw-bursztynowy"), null, { timeout: 4000 });
    await s.screenshot({ path: path.join(WYNIKI, "06_gracz_okolice_bursztyn.png") });
    await s.click("#zakladki .zakladka:has-text('KOPIEC')");
    await s.waitForSelector('.plansza:not([hidden]) svg[data-mapa="kopiec"]');
    await s.waitForFunction(() => document.body.classList.contains("motyw-zielony"));
    const dostepne = await s.$$eval('.plansza:not([hidden]) svg [data-element].el-dostepny', (g) => g.map((x) => x.dataset.element));
    zalozenie(dostepne.includes("iglica-sentinel") && !dostepne.includes("wrothgar"), `dostępne na Kopcu: ${dostepne}`);
    await s.waitForTimeout(500);
    await s.screenshot({ path: path.join(WYNIKI, "07_gracz_kopiec.png") });
  });

  await krok("admin: przełącznik przy zakładce Notatki ukrywa ją i odsłania graczom (na żywo)", async () => {
    const pole = '#zakladki input[aria-label="Widoczna dla graczy: Notatki"]';
    await sa.uncheck(pole);
    await s.waitForFunction(() => ![...document.querySelectorAll("#zakladki .zakladka")].some((z) => z.textContent.includes("NOTATKI")), null, { timeout: 4000 });
    await sa.waitForSelector("#zakladki .zakladka-grupa-ukryta:has-text('NOTATKI')", { timeout: 4000 });
    await sa.screenshot({ path: path.join(WYNIKI, "08b_admin_przelaczniki_zakladek.png") });
    await sa.check(pole);
    await s.waitForSelector("#zakladki .zakladka:has-text('NOTATKI')", { timeout: 4000 });
  });

  await krok("admin: ukrycie zakładki w indeksie i odsłonięcie paskiem na mapie (na żywo u gracza)", async () => {
    await sa.click("#zakladki .zakladka:has-text('KOPIEC')");
    await sa.waitForSelector('.plansza:not([hidden]) svg[data-mapa="kopiec"]');
    if (!(await sa.$eval("#indeks", (x) => !x.hidden))) await sa.click("#przycisk-indeks");
    const pole = '#indeks input[aria-label="Zakładka Kopiec widoczna dla graczy"]';
    await sa.waitForSelector(pole);
    zalozenie(await sa.$eval(pole, (x) => x.checked), "pole w indeksie nie pokazuje, że zakładka jest widoczna");
    zalozenie(await sa.$eval("#pasek-ukrycia", (x) => x.hidden), "pasek ukrycia widoczny na widocznej zakładce");
    await sa.uncheck(pole);
    await s.waitForFunction(() => ![...document.querySelectorAll("#zakladki .zakladka")].some((z) => z.textContent.includes("KOPIEC")), null, { timeout: 4000 });
    await sa.waitForSelector("#pasek-ukrycia:not([hidden])");
    await sa.screenshot({ path: path.join(WYNIKI, "08a_admin_ukryta_zakladka.png") });
    await sa.click("#przycisk-odslon");
    await sa.waitForSelector("#pasek-ukrycia", { state: "hidden" });
    await s.waitForSelector("#zakladki .zakladka:has-text('KOPIEC')", { timeout: 4000 });
  });

  await krok("admin: podgląd gracza ukrywa niedostępne miejsca", async () => {
    await sa.click("#zakladki .zakladka:has-text('KOPIEC')");
    await sa.waitForSelector('.plansza:not([hidden]) svg[data-mapa="kopiec"]');
    await sa.waitForTimeout(400);
    const przed = await sa.$$eval('.plansza:not([hidden]) svg .el-dostepny', (g) => g.length);
    await sa.check("#podglad-gracza");
    await sa.waitForTimeout(200);
    const po = await sa.$$eval('.plansza:not([hidden]) svg .el-dostepny', (g) => g.length);
    zalozenie(przed === 17 && po < przed, `przed: ${przed}, po: ${po}`);
    await sa.uncheck("#podglad-gracza");
    await sa.screenshot({ path: path.join(WYNIKI, "08_admin_kopiec.png") });
  });

  await krok("admin: status App Check w panelu (działa / nie działa)", async () => {
    await sa.click("#zakladki .zakladka:has-text('ADMIN')");
    await sa.waitForSelector("#widok-admin .status-na-zywo:has-text('Działa')");
    await sa.evaluate(() => localStorage.setItem("falszywy-appcheck-blad", "1"));
    await sa.click("#widok-admin button:has-text('SPRAWDŹ PONOWNIE')");
    await sa.waitForSelector("#widok-admin .formularz-blad:has-text('Nie działa')");
    await sa.evaluate(() => localStorage.removeItem("falszywy-appcheck-blad"));
    await sa.click("#widok-admin button:has-text('SPRAWDŹ PONOWNIE')");
    await sa.waitForSelector("#widok-admin .status-na-zywo:has-text('Działa')");
  });

  await krok("admin: potwierdzenia w LOGU zakładki Admin zamiast wyskakujących komunikatów", async () => {
    // Admin przeklikał już wiele ustawień — na ekranie nie może być stosu komunikatów.
    zalozenie((await sa.$$(".komunikaty .komunikat")).length === 0, "u admina wyskakują komunikaty");
    await sa.click("#zakladki .zakladka:has-text('ADMIN')");
    await sa.waitForSelector("#admin-log .log-wpis");
    const wpisy = await sa.$$eval("#admin-log .log-wpis .log-tekst", (w) => w.map((x) => x.textContent));
    for (const oczekiwany of [
      /^Zakładka „Kopiec” widoczna dla graczy\.$/,
      /^Zakładka „Notatki” ukryta przed graczami\.$/,
      /^Miejsce „Brassyl[^”]*” dostępne dla graczy\.$/,
      /^Kolor mapy „Okolice”: bursztynowy\.$/,
      /^Kampania „Kampania próbna” widoczna dla graczy\.$/
    ]) {
      zalozenie(wpisy.some((w) => oczekiwany.test(w)), `brak w logu: ${oczekiwany} (są: ${wpisy.slice(0, 6).join(" | ")}…)`);
    }
    zalozenie(wpisy[0] === "Zakładka „Kopiec” widoczna dla graczy.", `najnowszy wpis nie jest na górze: ${wpisy[0]}`);
    // Pole stałej wielkości z własnym przewijaniem; godzina przy każdym wpisie.
    const lista = await sa.$eval("#admin-log .log-lista", (x) => ({ wys: x.clientHeight, przewijanie: getComputedStyle(x).overflowY }));
    zalozenie(lista.przewijanie === "auto" && lista.wys >= 100, `log nie jest polem z przewijaniem: ${JSON.stringify(lista)}`);
    const czas = await sa.textContent("#admin-log .log-czas");
    zalozenie(/^\d{2}:\d{2}:\d{2}$/.test(czas), `brak godziny przy wpisie: ${czas}`);
    await sa.screenshot({ path: path.join(WYNIKI, "08c_admin_log.png") });
    // Log przetrwa odświeżenie strony, a przycisk WYCZYŚĆ go czyści.
    await sa.reload();
    await sa.click("#zakladki .zakladka:has-text('ADMIN')");
    await sa.waitForSelector("#admin-log .log-wpis");
    zalozenie((await sa.$$("#admin-log .log-wpis")).length === wpisy.length, "log nie przetrwał odświeżenia strony");
    await sa.click("#przycisk-czysc-log");
    await sa.waitForSelector("#admin-log .log-pusto");
  });

  await krok("admin: błędy zapisu — najwyżej dwa komunikaty na ekranie, wpisy w logu", async () => {
    const pole = '#widok-admin input[aria-label="Zakładka Okolice widoczna dla graczy"]';
    await sa.evaluate(() => localStorage.setItem("falszywa-baza-odmowa", "1"));
    for (let i = 0; i < 3; i++) {
      await sa.click(pole);
      await sa.waitForFunction((n) => document.querySelectorAll("#admin-log .log-blad").length >= n, i + 1);
    }
    await sa.evaluate(() => localStorage.removeItem("falszywa-baza-odmowa"));
    const naEkranie = await sa.$$eval(".komunikaty .komunikat", (k) => k.length);
    zalozenie(naEkranie >= 1 && naEkranie <= 2, `komunikatów o błędach na ekranie: ${naEkranie}`);
    zalozenie(await sa.$eval(pole, (x) => x.checked), "po błędzie pole nie wróciło do stanu z bazy");
    await sa.click("#przycisk-czysc-log");
  });

  // ---- kopia zapasowa i przywracanie
  let plikKopii = null;
  await krok("admin: kopia CSV (BOM, nagłówek, #meta, bez secrets)", async () => {
    await sa.click("#zakladki .zakladka:has-text('ADMIN')");
    const [pobranie] = await Promise.all([sa.waitForEvent("download"), sa.click("#przycisk-kopii")]);
    zalozenie(/^NotatkiRPG_kopia_\d{4}-\d{2}-\d{2}_\d{4}\.csv$/.test(pobranie.suggestedFilename()), `nazwa pliku: ${pobranie.suggestedFilename()}`);
    plikKopii = path.join(WYNIKI, "kopia.csv");
    await pobranie.saveAs(plikKopii);
    const tekst = fs.readFileSync(plikKopii, "utf8");
    zalozenie(tekst.charCodeAt(0) === 0xfeff, "brak BOM");
    zalozenie(tekst.slice(1).startsWith("sciezka,dane\r\n#meta,"), "zły początek pliku");
    zalozenie(tekst.includes("kampanie/iliac/notatki/") && tekst.includes("admins/Player1"), "brak dokumentów w kopii");
    zalozenie(!tekst.includes("secrets/"), "secrets w kopii bez zgody admina!");
    zalozenie(tekst.includes('""__typ"":""timestamp""'), "znaczniki czasu nie są zakodowane jawnie");
  });

  await krok("admin: kopia z secrets tylko po zaznaczeniu pola", async () => {
    await sa.check("#kopia-secrets");
    const [pobranie] = await Promise.all([sa.waitForEvent("download"), sa.click("#przycisk-kopii")]);
    const p = path.join(WYNIKI, "kopia_z_secrets.csv");
    await pobranie.saveAs(p);
    zalozenie(fs.readFileSync(p, "utf8").includes("secrets/Player2"), "brak secrets mimo zaznaczenia");
    await sa.uncheck("#kopia-secrets");
  });

  await krok("przywracanie SCAL: usunięta notatka wraca, reszta zostaje", async () => {
    // zmiana danych po zrobieniu kopii
    await sa.evaluate(() => {
      const b = JSON.parse(localStorage.getItem("falszywa-baza"));
      delete b["kampanie/iliac/notatki/sierota"];
      b["kampanie/iliac/notatki/nowa-po-kopii"] = { elementId: null, tytul: "Dodana po kopii", tresc: "", kategoria: "inne", podpis: "", kontoId: "Player2" };
      localStorage.setItem("falszywa-baza", JSON.stringify(b));
    });
    await sa.reload();
    await sa.click("#zakladki .zakladka:has-text('ADMIN')");
    await sa.setInputFiles("#widok-admin input[type=file]", plikKopii);
    await sa.waitForSelector("#widok-admin .podglad-kopii table");
    const podglad = await sa.textContent("#widok-admin .podglad-kopii");
    zalozenie(podglad.includes("kampanie/iliac/notatki"), "podgląd nie pokazuje kolekcji");
    const [bezpieczenstwo] = await Promise.all([
      sa.waitForEvent("download"),
      (async () => {
        await sa.click("#przycisk-przywroc");
        await sa.click("dialog button:has-text('PRZYWRÓĆ')");
      })()
    ]);
    zalozenie(bezpieczenstwo.suggestedFilename().startsWith("NotatkiRPG_kopia_przed-przywroceniem_"), "brak kopii bezpieczeństwa przed przywróceniem");
    await sa.waitForSelector("#widok-admin .dziennik:has-text('GOTOWE')");
    const baza = await sa.evaluate(() => JSON.parse(localStorage.getItem("falszywa-baza")));
    zalozenie(baza["kampanie/iliac/notatki/sierota"], "usunięta notatka nie wróciła");
    zalozenie(baza["kampanie/iliac/notatki/nowa-po-kopii"], "SCAL usunął dokument spoza pliku");
    zalozenie(baza["secrets/Player1"] && baza["secrets/Player2"] && baza["secrets/Player3"], "przywracanie naruszyło konta");
    const dziennik = await sa.textContent("#widok-admin .dziennik");
    zalozenie(dziennik.includes("Pominięte dokumenty kont (admins/secrets): 2"), "dziennik nie mówi o pominiętych kontach (admin i edytor)");
    zalozenie((await sa.textContent("#widok-admin .podglad-kopii")).includes("zostaną pominięte"), "podgląd nie ostrzega o pominięciu kont");
  });

  await krok("przywracanie ZASTĄP: wymaga słowa PRZYWRÓĆ, usuwa dokumenty spoza pliku, nie rusza kont", async () => {
    await sa.check("#tryb-zastap");
    await sa.click("#przycisk-przywroc");
    await sa.waitForTimeout(200);
    zalozenie((await sa.$$("dialog[open]")).length === 0, "ZASTĄP ruszył bez słowa potwierdzenia");
    await sa.fill('#widok-admin input[aria-label="Słowo potwierdzenia"]', "przywróć");
    await Promise.all([
      sa.waitForEvent("download"),
      (async () => {
        await sa.click("#przycisk-przywroc");
        await sa.click("dialog button:has-text('PRZYWRÓĆ')");
      })()
    ]);
    await sa.waitForSelector("#widok-admin .dziennik:has-text('GOTOWE')");
    const baza = await sa.evaluate(() => JSON.parse(localStorage.getItem("falszywa-baza")));
    zalozenie(!baza["kampanie/iliac/notatki/nowa-po-kopii"], "ZASTĄP nie usunął dokumentu spoza pliku");
    zalozenie(baza["kampanie/iliac/notatki/sierota"], "ZASTĄP zgubił dokument z pliku");
    zalozenie(
      baza["secrets/Player1"] && baza["secrets/Player2"] && baza["secrets/Player3"] && baza["admins/Player1"]?.rola === "admin" && baza["admins/Player2"]?.rola === "edytor",
      "ZASTĄP naruszył konta"
    );
    await sa.screenshot({ path: path.join(WYNIKI, "09_admin_przywracanie.png"), fullPage: true });
  });

  await krok("przywracanie: zły plik → czytelny błąd", async () => {
    const zly = path.join(WYNIKI, "zly.csv");
    fs.writeFileSync(zly, "a,b\n1,2\n");
    await sa.setInputFiles("#widok-admin input[type=file]", zly);
    await sa.waitForSelector("#widok-admin .podglad-kopii .formularz-blad");
    zalozenie(await sa.$eval("#przycisk-przywroc", (b) => b.disabled), "przycisk przywracania aktywny przy złym pliku");
  });

  await krok("brak uprawnień w bazie → zrozumiały komunikat (reguły / App Check)", async () => {
    const s3 = await nowaStrona(ctx, []);
    await s3.addInitScript(() => {
      localStorage.setItem("falszywa-baza-odmowa", "1");
      sessionStorage.setItem("notatkirpg.sesja", JSON.stringify({ wersja: 3, kontoId: "Player3", login: "test-gracz", nazwa: "Gracz", rola: "gracz" }));
    });
    await s3.goto(`${ADRES}/kampania.html?k=iliac`);
    await s3.waitForSelector("#srodek h2:has-text('BŁĄD ODCZYTU DANYCH')");
    const tekst = await s3.textContent("#srodek");
    zalozenie(tekst.includes("reguły bazy") && tekst.includes("App Check"), `brak wyjaśnienia o regułach i App Check: ${tekst}`);
    await s3.evaluate(() => localStorage.removeItem("falszywa-baza-odmowa"));
    await s3.close();
  });

  await krok("stare sesje (sprzed profili i sprzed roli „edytor”) nie wpuszczają — trzeba zalogować się ponownie", async () => {
    for (const stara of [
      { kontoId: "Player2", login: "test-edytor", rola: "gracz" },
      { wersja: 2, kontoId: "Player2", login: "test-edytor", nazwa: "Skryba", rola: "skryba" }
    ]) {
      const s4 = await nowaStrona(ctx, bledy);
      await s4.addInitScript((sesja) => sessionStorage.setItem("notatkirpg.sesja", JSON.stringify(sesja)), stara);
      await s4.goto(`${ADRES}/kampania.html?k=iliac`);
      await s4.waitForURL(/index\.html\?k=iliac$/);
      await s4.close();
    }
  });

  await krok("komputer: brak przewijania w bok", async () => {
    await bezPrzewijaniaWBok(s);
    await bezPrzewijaniaWBok(sa);
  });

  await krok("admin: wylogowanie czyści sesję i log", async () => {
    await sa.click("#zakladki .zakladka:has-text('ADMIN')");
    await sa.click('#widok-admin input[aria-label="Zakładka Okolice widoczna dla graczy"]');
    await sa.waitForSelector("#admin-log .log-wpis");
    zalozenie((await sa.evaluate(() => sessionStorage.getItem("notatkirpg.log"))) !== null, "log nie jest zapisany w sesji");
    await sa.click('#widok-admin input[aria-label="Zakładka Okolice widoczna dla graczy"]');
    await sa.click("#konto button:has-text('WYLOGUJ')");
    await sa.waitForURL(/index\.html$/);
    const { sesja, log } = await sa.evaluate(() => ({ sesja: sessionStorage.getItem("notatkirpg.sesja"), log: sessionStorage.getItem("notatkirpg.log") }));
    zalozenie(sesja === null && log === null, `po wylogowaniu zostały dane: sesja=${sesja}, log=${log}`);
  });
  await ctx.close();

  // ===================================================================== telefon i tablet
  const urzadzenia = [
    ["telefon (iPhone 13)", devices["iPhone 13"], "telefon"],
    ["telefon (Pixel 5)", devices["Pixel 5"], "pixel"],
    ["tablet pionowo (iPad Mini)", devices["iPad Mini"], "tablet"],
    ["tablet poziomo (iPad Mini landscape)", devices["iPad Mini landscape"], "tablet_poziomo"]
  ];
  for (const [nazwa, urzadzenie, plik] of urzadzenia) {
    console.log(`\n[${nazwa}]`);
    const { defaultBrowserType, ...opcje } = urzadzenie;
    const c = await nowyKontekst(przegladarka, opcje);
    const t = await nowaStrona(c, bledy);
    await krok(`${nazwa}: logowanie i lista kampanii bez przewijania w bok`, async () => {
      await t.goto(`${ADRES}/index.html`);
      await t.waitForSelector("input[name=login]");
      await bezPrzewijaniaWBok(t);
      await t.screenshot({ path: path.join(WYNIKI, `10_${plik}_start.png`) });
      await zaloguj(t, "test-gracz", "haslo-gracza");
      await t.waitForSelector("#kampanie li:not([hidden]) a.kampania");
      await bezPrzewijaniaWBok(t);
      await t.screenshot({ path: path.join(WYNIKI, `10_${plik}_kampanie.png`) });
    });
    await krok(`${nazwa}: mapa — przeciąganie palcem przesuwa mapę`, async () => {
      await t.goto(`${ADRES}/kampania.html?k=iliac#okolice`);
      await t.waitForSelector(".plansza svg .el-dostepny");
      await t.waitForTimeout(500);
      await bezPrzewijaniaWBok(t);
      await t.screenshot({ path: path.join(WYNIKI, `10_${plik}_mapa.png`) });
      const przed = await t.$eval(".plansza:not([hidden]) svg", (x) => x.getAttribute("viewBox"));
      const ramka = await t.$eval(".plansza:not([hidden])", (x) => {
        const r = x.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      const cdp = await c.newCDPSession(t);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: ramka.x, y: ramka.y, id: 1 }] });
      for (let i = 1; i <= 8; i++) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: ramka.x - i * 12, y: ramka.y - i * 6, id: 1 }] });
        await t.waitForTimeout(20);
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await t.waitForTimeout(150);
      const po = await t.$eval(".plansza:not([hidden]) svg", (x) => x.getAttribute("viewBox"));
      zalozenie(przed !== po, `przeciąganie nie przesunęło mapy (${przed})`);
      // szczypanie dwoma palcami
      const [, , w1] = po.split(" ").map(Number);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: ramka.x - 30, y: ramka.y, id: 1 }, { x: ramka.x + 30, y: ramka.y, id: 2 }]
      });
      for (let i = 1; i <= 8; i++) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: ramka.x - 30 - i * 10, y: ramka.y, id: 1 }, { x: ramka.x + 30 + i * 10, y: ramka.y, id: 2 }]
        });
        await t.waitForTimeout(20);
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await t.waitForTimeout(150);
      const [, , w2] = (await t.$eval(".plansza:not([hidden]) svg", (x) => x.getAttribute("viewBox"))).split(" ").map(Number);
      zalozenie(w2 < w1, `szczypanie nie przybliżyło mapy (${w1} → ${w2})`);
      const napisy = await t.$eval(".plansza:not([hidden])", (x) => x.classList.contains("szczypiemy"));
      zalozenie(!napisy, "po szczypaniu napisy zostały ukryte");
    });
    await krok(`${nazwa}: stuknięcie w miejsce otwiera kartę`, async () => {
      await t.click("#przycisk-calosc");
      await t.waitForTimeout(200);
      await t.tap('[data-element="kopiec-iliac"] text >> nth=0');
      await t.waitForSelector("#panel:not([hidden]) .panel-nazwa");
      await bezPrzewijaniaWBok(t);
      await t.screenshot({ path: path.join(WYNIKI, `11_${plik}_karta.png`) });
      await t.click("#panel .przycisk-ikona");
      await t.waitForSelector("#panel", { state: "hidden" });
    });
    await krok(`${nazwa}: indeks i zakładki bez przewijania w bok`, async () => {
      if (!(await t.$eval("#indeks", (x) => !x.hidden))) await t.click("#przycisk-indeks");
      await t.waitForSelector("#indeks:not([hidden]) .indeks-pozycja");
      await bezPrzewijaniaWBok(t);
      await t.screenshot({ path: path.join(WYNIKI, `12_${plik}_indeks.png`) });
      await t.click("#indeks .indeks-pozycja:has-text('Trakt')");
      await t.waitForSelector("#panel:not([hidden]) .panel-nazwa:has-text('Trakt')");
      await t.click("#panel .przycisk-ikona");
      for (const z of ["NOTATKI"]) {
        await t.click(`#zakladki .zakladka:has-text('${z}')`);
        await t.waitForTimeout(150);
        await bezPrzewijaniaWBok(t);
      }
      await t.screenshot({ path: path.join(WYNIKI, `13_${plik}_notatki.png`) });
    });
    await krok(`${nazwa}: admin — lista kampanii i panel z logiem bez przewijania w bok`, async () => {
      await t.click("#konto button:has-text('WYLOGUJ')");
      await t.waitForURL(/index\.html$/);
      await zaloguj(t, "test-admin", "haslo-admina");
      await t.waitForSelector(`${POLE_ILIAC}:not([disabled])`);
      await bezPrzewijaniaWBok(t);
      await t.screenshot({ path: path.join(WYNIKI, `14_${plik}_admin_kampanie.png`) });
      await t.goto(`${ADRES}/kampania.html?k=iliac#admin`);
      await t.waitForSelector("#widok-admin .admin-mapa");
      await t.click('#widok-admin input[aria-label="Zakładka Okolice widoczna dla graczy"]');
      await t.waitForSelector("#admin-log .log-wpis");
      // Log widoczny na ekranie od razu (z boku albo przyklejony u dołu zakładki).
      const r = await t.$eval("#admin-log", (x) => {
        const b = x.getBoundingClientRect();
        return { gora: Math.round(b.top), dol: Math.round(b.bottom), wys: Math.round(b.height), okno: innerHeight };
      });
      zalozenie(r.gora >= 0 && r.dol <= r.okno + 1 && r.wys < r.okno * 0.6, `log nie mieści się na ekranie: ${JSON.stringify(r)}`);
      await bezPrzewijaniaWBok(t);
      await t.screenshot({ path: path.join(WYNIKI, `14_${plik}_admin.png`) });
      await t.click('#widok-admin input[aria-label="Zakładka Okolice widoczna dla graczy"]');
    });
    await c.close();
  }

  await przegladarka.close();
  serwer.close();

  const nieudane = wyniki.filter((w) => !w.ok);
  const bledyStrony = bledy.filter((b) => !b.includes("favicon"));
  console.log(`\nWynik: ${wyniki.length - nieudane.length}/${wyniki.length} kroków OK.`);
  if (bledyStrony.length) {
    console.log("Błędy JavaScript na stronach:");
    for (const b of [...new Set(bledyStrony)]) console.log(`  - ${b}`);
  }
  process.exit(nieudane.length || bledyStrony.length ? 1 : 0);
})();
