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
const KONTA = {
  "secrets/Player1": { PlayerName: "test-admin", PlayerPassword: "haslo-admina" },
  "secrets/Player2": { PlayerName: "test-gracz", PlayerPassword: "haslo-gracza" },
  "admins/Player1": { rola: "admin" }
};
const NOTATKI_STARTOWE = {
  // notatka o miejscu, którego nie ma w manifeście
  "kampanie/iliac/notatki/sierota": { elementId: "miejsce-usuniete", tytul: "Stara notatka", tresc: "o zniknietym miejscu", kategoria: "miejsce", podpis: "Ala", kontoId: "Player2" },
  // notatka o miejscu, które jest domyślnie niedostępne dla graczy
  "kampanie/iliac/notatki/ukryta": { elementId: "brassyl", tytul: "Notatka z ukrytego miejsca", tresc: "tekst", kategoria: "miejsce", podpis: "Ola", kontoId: "Player2" }
};

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

async function zaloguj(strona, login, haslo) {
  await strona.click("#konto button:has-text('ZALOGUJ')");
  await strona.fill("dialog input[name=login]", login);
  await strona.fill("dialog input[name=haslo]", haslo);
  await strona.click("dialog button[type=submit]");
  await strona.waitForSelector("dialog", { state: "detached" });
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

  await krok("strona startowa: lista kampanii", async () => {
    await s.goto(`${ADRES}/index.html`);
    await s.waitForSelector("a.kampania");
    const tekst = await s.textContent("#kampanie");
    zalozenie(tekst.includes("KOPIEC ILIAC"), "brak kampanii Iliac");
    await s.screenshot({ path: path.join(WYNIKI, "01_start.png") });
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

  await krok("gość: tylko zakładka Okolice (Kopiec ukryty), bez Admin", async () => {
    await s.goto(`${ADRES}/kampania.html?k=iliac`);
    await s.waitForSelector(".plansza svg .el");
    const zakladki = await s.$$eval("#zakladki .zakladka", (z) => z.map((x) => x.textContent.trim()));
    zalozenie(zakladki.some((z) => z.includes("OKOLICE")), `brak Okolic: ${zakladki}`);
    zalozenie(!zakladki.some((z) => z.includes("KOPIEC")), `zakładka Kopiec widoczna dla gościa: ${zakladki}`);
    zalozenie(!zakladki.some((z) => z.includes("ADMIN")), "zakładka Admin widoczna dla gościa");
  });

  await krok("gość: część miejsc klikalna, część jak tło", async () => {
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
    await s.screenshot({ path: path.join(WYNIKI, "02_gosc_okolice.png") });
  });

  await krok("gość: indeks pokazuje tylko dostępne miejsca", async () => {
    const nazwy = await s.$$eval("#indeks .indeks-pozycje .indeks-nazwa", (n) => n.map((x) => x.textContent));
    zalozenie(nazwy.length === 4, `oczekiwano 4 miejsc, jest ${nazwy.length}: ${nazwy}`);
    zalozenie(!nazwy.some((n) => /Brassyl|Kanion|Szkielet/.test(n)), `w indeksie są ukryte miejsca: ${nazwy}`);
    await s.fill("#indeks .indeks-szukaj", "brassyl");
    await s.waitForTimeout(300);
    const poSzukaniu = await s.$$eval("#indeks .indeks-pozycje .indeks-nazwa", (n) => n.length);
    zalozenie(poSzukaniu === 0, "wyszukiwarka gościa znalazła ukryte miejsce");
    await s.fill("#indeks .indeks-szukaj", "trakt");
    await s.waitForTimeout(300);
    const trakt = await s.$$eval("#indeks .indeks-pozycje .indeks-nazwa", (n) => n.map((x) => x.textContent));
    zalozenie(trakt.length === 1 && trakt[0] === "Trakt", `szukanie „trakt”: ${trakt}`);
    await s.fill("#indeks .indeks-szukaj", "");
  });

  await krok("gość: adres #kopiec (ukryta mapa) → wraca do Okolic", async () => {
    await s.goto(`${ADRES}/kampania.html?k=iliac#kopiec`);
    await s.waitForSelector(".plansza svg");
    const aktywna = await s.textContent('#zakladki [aria-selected="true"]');
    zalozenie(aktywna.includes("OKOLICE"), `aktywna zakładka: ${aktywna}`);
    const mapa = await s.$eval(".plansza:not([hidden]) svg", (x) => x.dataset.mapa);
    zalozenie(mapa === "okolice", `wczytana mapa: ${mapa}`);
  });

  await krok("gość: kliknięcie miejsca otwiera kartę bez „Dodaj notatkę”", async () => {
    await s.waitForTimeout(400);
    await s.click('[data-element="kopiec-iliac"] text >> nth=0');
    await s.waitForSelector("#panel:not([hidden]) .panel-nazwa");
    zalozenie((await s.textContent(".panel-nazwa")) === "Kopiec Iliac", "zła nazwa w karcie");
    zalozenie((await s.$$("#panel button:has-text('DODAJ NOTATKĘ')")).length === 0, "gość widzi „Dodaj notatkę”");
    zalozenie(s.url().includes("#okolice/kopiec-iliac"), `adres nie wskazuje miejsca: ${s.url()}`);
  });

  await krok("gość: notatka o ukrytym miejscu w „bez miejsca na mapie”, bez nazwy miejsca", async () => {
    await s.click("#zakladki .zakladka:has-text('NOTATKI')");
    await s.waitForSelector("#widok-notatki .sekcja-tytul");
    const tekst = await s.textContent("#widok-notatki");
    zalozenie(tekst.includes("NOTATKI BEZ MIEJSCA NA MAPIE"), "brak sekcji „bez miejsca”");
    zalozenie(tekst.includes("Notatka z ukrytego miejsca") && tekst.includes("Stara notatka"), "brak notatek bez miejsca");
    zalozenie(!/Brassyl/i.test(tekst), "nazwa ukrytego miejsca wyciekła do widoku notatek");
  });

  // ---- gracz
  await krok("gracz: logowanie z okna na stronie kampanii", async () => {
    await zaloguj(s, "test-gracz", "haslo-gracza");
    const konto = await s.textContent("#konto");
    zalozenie(konto.includes("GRACZ: test-gracz"), `konto: ${konto}`);
    const sesja = await s.evaluate(() => sessionStorage.getItem("notatkirpg.sesja"));
    zalozenie(!/haslo/i.test(sesja), "hasło zapisane w sesji!");
  });

  const s2 = await nowaStrona(ctx, bledy); // druga karta (gość) — do sprawdzenia zmian na żywo
  await s2.goto(`${ADRES}/kampania.html?k=iliac#notatki`);
  await s2.waitForSelector("#widok-notatki .lista-wpisow");

  await krok("gracz: dodanie notatki przy miejscu (z podpisem, wiele wierszy, próba HTML)", async () => {
    await s.click("#zakladki .zakladka:has-text('OKOLICE')");
    await s.waitForTimeout(300);
    await s.click('[data-element="trakt"] text >> nth=0');
    await s.waitForSelector("#panel button:has-text('DODAJ NOTATKĘ')");
    await s.click("#panel button:has-text('DODAJ NOTATKĘ')");
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
    zalozenie((await s.textContent("#panel .karta-meta")).includes("Brat Kael"), "brak podpisu");
    await s.screenshot({ path: path.join(WYNIKI, "03_gracz_karta_miejsca.png") });
  });

  await krok("na żywo: druga karta widzi nową notatkę bez odświeżania", async () => {
    await s2.waitForSelector("#widok-notatki .karta-tytul:has-text('Przemytnicy na Trakcie')", { timeout: 4000 });
  });

  await krok("gracz: edycja notatki", async () => {
    await s.click("#panel .karta button:has-text('EDYTUJ')");
    await s.fill("dialog input >> nth=0", "Przemytnicy na Trakcie (potwierdzone)");
    await s.click("dialog button[type=submit]");
    await s.waitForSelector("#panel .karta-tytul:has-text('(potwierdzone)')");
  });

  await krok("gracz: notatka ogólna, cel w Postępie i powiązanie", async () => {
    await s.click("#zakladki .zakladka:has-text('NOTATKI')");
    await s.click("#widok-notatki button:has-text('NOWA NOTATKA')");
    await s.fill("dialog input >> nth=0", "Plan na następną sesję");
    await s.fill("dialog textarea", "Zapytać o Iglicę Cumowniczą.");
    await s.click("dialog button[type=submit]");
    await s.waitForSelector("#widok-notatki .sekcja-tytul:has-text('NOTATKI OGÓLNE')");
    await s.click("#zakladki .zakladka:has-text('POSTĘP')");
    await s.click("#widok-postep button:has-text('NOWY CEL')");
    await s.fill("dialog input >> nth=0", "Odnaleźć kontakt w porcie");
    await s.selectOption("dialog select", "w-toku");
    await s.click("dialog button[type=submit]");
    await s.waitForSelector("#widok-postep .karta-tytul:has-text('Odnaleźć kontakt')");
    await s.click("#zakladki .zakladka:has-text('POWIĄZANIA')");
    await s.click("#widok-powiazania button:has-text('NOWE POWIĄZANIE')");
    await s.fill("dialog input >> nth=0", "Ród Smoka");
    await s.fill("dialog input >> nth=1", "Ród Róży");
    await s.selectOption("dialog select", "wrogosc");
    await s.click("dialog button[type=submit]");
    await s.waitForSelector("#widok-powiazania .karta-tytul:has-text('Ród Smoka')");
    await s.click("#widok-powiazania button:has-text('POKAŻ GRAF')");
    await s.waitForSelector("#widok-powiazania .graf-svg");
    await s.screenshot({ path: path.join(WYNIKI, "04_powiazania_graf.png") });
  });

  await krok("gracz: filtr strony relacji", async () => {
    await s.fill("#widok-powiazania input[type=search]", "róży");
    await s.waitForTimeout(300);
    zalozenie((await s.$$("#widok-powiazania .karta")).length === 1, "filtr po stronie relacji nie działa");
    await s.fill("#widok-powiazania input[type=search]", "nikt-taki");
    await s.waitForTimeout(300);
    zalozenie((await s.$$("#widok-powiazania .karta")).length === 0, "filtr przepuszcza niepasujące");
    await s.fill("#widok-powiazania input[type=search]", "");
  });

  await krok("gracz: wyszukiwarka notatek (bez polskich znaków, po nazwie miejsca)", async () => {
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

  await krok("gracz: usunięcie notatki (z potwierdzeniem)", async () => {
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

  await krok("gracz: wylogowanie czyści sesję", async () => {
    await s.click("#konto button:has-text('WYLOGUJ')");
    const sesja = await s.evaluate(() => sessionStorage.getItem("notatkirpg.sesja"));
    zalozenie(sesja === null, "sesja nie została wyczyszczona");
    zalozenie((await s.textContent("#konto")).includes("GOŚĆ"), "po wylogowaniu nie jest gościem");
  });

  // ---- admin
  const sa = await nowaStrona(ctx, bledy);
  await krok("admin: logowanie, zakładki Kopiec (ukryta) i Admin", async () => {
    await sa.goto(`${ADRES}/kampania.html?k=iliac`);
    await sa.waitForSelector(".plansza svg");
    await zaloguj(sa, "test-admin", "haslo-admina");
    const zakladki = await sa.$$eval("#zakladki .zakladka", (z) => z.map((x) => x.textContent.trim()));
    zalozenie(zakladki.some((z) => z.includes("KOPIEC") && z.includes("⊘")), `brak ukrytej zakładki Kopiec: ${zakladki}`);
    zalozenie(zakladki.some((z) => z.includes("ADMIN")), "brak zakładki Admin");
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

  await krok("admin → gracz na żywo: zaznaczenie miejsca w indeksie", async () => {
    await s.goto(`${ADRES}/kampania.html?k=iliac`);
    await s.waitForSelector('.plansza svg [data-element="brassyl"]');
    await sa.click('#indeks li:has-text("Brassyl") input[type=checkbox]');
    await s.waitForSelector('.plansza svg [data-element="brassyl"].el-dostepny', { timeout: 4000 });
    await s.waitForSelector('#indeks .indeks-nazwa:has-text("Brassyl")', { timeout: 4000 });
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
    zalozenie(baza["secrets/Player1"] && baza["secrets/Player2"], "przywracanie naruszyło konta");
    const dziennik = await sa.textContent("#widok-admin .dziennik");
    zalozenie(dziennik.includes("Pominięte dokumenty kont (admins/secrets): 1"), "dziennik nie mówi o pominiętych kontach");
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
    zalozenie(baza["secrets/Player1"] && baza["secrets/Player2"] && baza["admins/Player1"], "ZASTĄP naruszył konta");
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
    await s3.addInitScript(() => localStorage.setItem("falszywa-baza-odmowa", "1"));
    await s3.goto(`${ADRES}/kampania.html?k=iliac`);
    await s3.waitForSelector("#baner:not([hidden])");
    const baner = await s3.textContent("#baner");
    zalozenie(baner.includes("reguły bazy") && baner.includes("App Check"), `brak wyjaśnienia o regułach i App Check: ${baner}`);
    await s3.evaluate(() => localStorage.removeItem("falszywa-baza-odmowa"));
    await s3.close();
  });

  await krok("komputer: brak przewijania w bok", async () => {
    await bezPrzewijaniaWBok(s);
    await bezPrzewijaniaWBok(sa);
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
    await krok(`${nazwa}: start bez przewijania w bok`, async () => {
      await t.goto(`${ADRES}/index.html`);
      await t.waitForSelector("a.kampania");
      await bezPrzewijaniaWBok(t);
      await t.screenshot({ path: path.join(WYNIKI, `10_${plik}_start.png`) });
    });
    await krok(`${nazwa}: mapa — przeciąganie palcem przesuwa mapę`, async () => {
      await t.goto(`${ADRES}/kampania.html?k=iliac`);
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
      for (const z of ["NOTATKI", "POSTĘP", "POWIĄZANIA"]) {
        await t.click(`#zakladki .zakladka:has-text('${z}')`);
        await t.waitForTimeout(150);
        await bezPrzewijaniaWBok(t);
      }
      await t.screenshot({ path: path.join(WYNIKI, `13_${plik}_notatki.png`) });
    });
    await krok(`${nazwa}: panel admina bez przewijania w bok`, async () => {
      await zaloguj(t, "test-admin", "haslo-admina");
      await t.click("#zakladki .zakladka:has-text('ADMIN')");
      await t.waitForSelector("#widok-admin .admin-mapa");
      await bezPrzewijaniaWBok(t);
      await t.screenshot({ path: path.join(WYNIKI, `14_${plik}_admin.png`) });
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
