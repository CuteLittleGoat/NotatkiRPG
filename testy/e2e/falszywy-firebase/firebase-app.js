// UDAWANY Firebase — tylko do testów automatycznych (testy/e2e/uruchom.cjs).
// Test podstawia ten plik w miejsce https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js.
export function initializeApp(konfiguracja) {
  return { name: "[DEFAULT]", options: konfiguracja };
}
