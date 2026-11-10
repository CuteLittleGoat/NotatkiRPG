// Uruchomienie strony kampanii. Osobny, mały moduł bez zależności: jeśli główna
// część aplikacji (albo Firebase z serwera Google) się nie wczyta, pokazujemy
// zrozumiały komunikat zamiast pustego ekranu.
import("./kampania.js").catch((blad) => {
  console.error(blad);
  const srodek = document.getElementById("srodek");
  if (!srodek) return;
  srodek.textContent = "";
  const p = document.createElement("p");
  p.className = "formularz-blad tresc-widoku";
  p.textContent =
    "Nie udało się uruchomić aplikacji. Najczęstsza przyczyna: brak połączenia z internetem albo z serwerem Firebase. Odśwież stronę za chwilę.";
  srodek.append(p);
});
