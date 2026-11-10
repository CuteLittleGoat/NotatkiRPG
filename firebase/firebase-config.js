// Konfiguracja aplikacji webowej Firebase (projekt notatkirpg-b601c).
// Klucz apiKey NIE jest tajny — to publiczny identyfikator aplikacji, który i tak
// trafia do przeglądarki każdego gościa strony. O dostępie do danych decydują
// reguły Firestore (firebase/firestore.rules) i App Check, nie ten plik.
export const firebaseConfig = {
  apiKey: "AIzaSyANTv6H1DUwJEprMey2U94FNBT0MiYuqr4",
  authDomain: "notatkirpg-b601c.firebaseapp.com",
  projectId: "notatkirpg-b601c",
  storageBucket: "notatkirpg-b601c.firebasestorage.app",
  messagingSenderId: "188005892104",
  appId: "1:188005892104:web:29f087347cb3ba80f151bd"
};

// App Check — klucz witryny reCAPTCHA Enterprise (klucz „NotatkiRPG” w projekcie
// Google Cloud notatkirpg-b601c — tym samym co Firebase; typ: witryna, dozwolona
// domena: cutelittlegoat.github.io). Klucz witryny też NIE jest tajny — reCAPTCHA
// z definicji działa w przeglądarce. Pusty tekst wyłącza App Check.
export const appCheckKluczWitryny = "6LeeqhkuAAAAABPqUDvYOXV6TmvisxcrPM1HC0Po";
