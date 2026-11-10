// Jedyne miejsce, w którym ładujemy Firebase. Wszystkie moduły SDK muszą mieć
// TĘ SAMĄ wersję (13.2.0) — zmieniając ją, zmień wszystkie adresy naraz.
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import { initializeAppCheck, ReCaptchaEnterpriseProvider, getToken } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app-check.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
  deleteField,
  Timestamp,
  GeoPoint,
  Bytes,
  DocumentReference
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";
import { appCheckKluczWitryny, firebaseConfig } from "../../firebase/firebase-config.js";

export const app = initializeApp(firebaseConfig);

// App Check: przeglądarka dostaje od Google „przepustkę” (token) potwierdzającą,
// że zapytania idą z tej aplikacji na jej prawdziwym adresie. Musi ruszyć PRZED
// pierwszym zapytaniem do bazy. reCAPTCHA Enterprise działa niewidocznie — nikt
// niczego nie klika. Przepustka odnawia się sama.
//
// Na własnym komputerze (localhost) reCAPTCHA nie zadziała, bo klucz zna tylko
// adres strony. Wtedy używamy tokenu debugowania: przy pierwszym uruchomieniu
// przeglądarka wypisze go w konsoli, a właściciel dopisuje go w konsoli Firebase
// (instrukcja: firebase/README.md, „Testowanie na własnym komputerze”).
let lokalnie = false;
try {
  lokalnie = ["localhost", "127.0.0.1"].includes(window.location.hostname);
} catch {
  lokalnie = false;
}
if (lokalnie && appCheckKluczWitryny) self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;

export const appCheck = appCheckKluczWitryny
  ? initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(appCheckKluczWitryny),
      isTokenAutoRefreshEnabled: true
    })
  : null;

export const db = getFirestore(app);

/**
 * Czy ta strona dostała przepustkę App Check. Do podglądu w panelu admina.
 * @returns {Promise<{ok: boolean, powod?: string, lokalnie: boolean}>}
 */
export async function sprawdzAppCheck(limitMs = 15000) {
  if (!appCheck) return { ok: false, powod: "App Check jest wyłączony (brak klucza witryny).", lokalnie };
  let licznik = null;
  try {
    await Promise.race([
      getToken(appCheck, false),
      new Promise((_, odrzuc) => {
        licznik = setTimeout(() => odrzuc(new Error("brak odpowiedzi w ciągu 15 s")), limitMs);
      })
    ]);
    return { ok: true, lokalnie };
  } catch (e) {
    return { ok: false, powod: String((e && (e.code || e.message)) || e), lokalnie };
  } finally {
    clearTimeout(licznik);
  }
}

export {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
  deleteField,
  Timestamp,
  GeoPoint,
  Bytes,
  DocumentReference
};
