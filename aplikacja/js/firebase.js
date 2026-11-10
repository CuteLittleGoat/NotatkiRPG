// Jedyne miejsce, w którym ładujemy Firebase. Wszystkie moduły SDK muszą mieć
// TĘ SAMĄ wersję (13.2.0) — zmieniając ją, zmień oba adresy naraz.
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
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
import { firebaseConfig } from "../../firebase/firebase-config.js";

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

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
