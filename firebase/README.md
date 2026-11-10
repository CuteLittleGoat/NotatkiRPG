# Firebase — konfiguracja i reguły bazy

W tym folderze:

| Plik | Co to jest |
|---|---|
| `firebase-config.js` | Adres projektu Firebase (`notatkirpg-b601c`), z którego korzysta strona. Klucz `apiKey` **nie jest tajny** — to publiczny identyfikator aplikacji, który i tak trafia do przeglądarki każdego gościa strony. |
| `firestore.rules` | Reguły bazy danych na etap szkicu. **Trzeba je ręcznie wkleić w konsoli Firebase** — instrukcja niżej. Aplikacja sama ich nie publikuje. |

## Czym są reguły (wyjaśnienie bez żargonu)

Baza danych w Firebase ma coś w rodzaju zamka na drzwiach. Reguły mówią, kto
może wejść i co może zrobić.

* **Teraz** w projekcie są reguły domyślne: drzwi są zamknięte dla wszystkich.
  Aplikacja nie może wtedy ani zapisać, ani odczytać notatek — zobaczysz komunikat
  „Baza danych odmówiła dostępu”.
* **Plik `firestore.rules`** otwiera drzwi dla wszystkich i **bez terminu** (tak
  zdecydowałeś/-aś 10.11.2026). Aplikacja zacznie działać od razu po opublikowaniu.

## Jak opublikować reguły (krok po kroku)

1. Wejdź na <https://console.firebase.google.com> i zaloguj się kontem Google, na którym jest projekt.
2. Kliknij projekt **notatkirpg-b601c**.
3. W menu po lewej wybierz **Firestore Database** (bywa w grupie „Kompilacja” / „Build”).
4. Otwórz zakładkę **Reguły** („Rules”).
5. Usuń wszystko, co jest w okienku, i wklej całą zawartość pliku `firebase/firestore.rules`.
6. Kliknij **Opublikuj** („Publish”). Zmiana działa po około minucie.
7. Odśwież stronę aplikacji — na dole ekranu powinno pojawić się „BAZA: NA ŻYWO”.

Firebase będzie co jakiś czas wysyłać e-maile, że reguły są „niezabezpieczone”
(„insecure rules”). Na etapie szkicu to oczekiwane — tak właśnie jest.

## Co oznaczają otwarte reguły — przeczytaj

* **Każdy**, kto zna adres strony, może przez narzędzia przeglądarki **czytać,
  zmieniać i usuwać wszystkie dane** — notatki, ustawienia map, konta.
* Logowanie na tym etapie porównuje login i hasło z kolekcją `secrets`, więc
  przeglądarka musi tę kolekcję czytać. **Hasła są widoczne dla każdego**, kto
  zajrzy do bazy albo do narzędzi deweloperskich przeglądarki.
  → **Używaj haseł, których nie używasz nigdzie indziej.**
* Role (gracz / admin) działają **tylko w wyglądzie aplikacji** — baza ich nie pilnuje.
* Ochroną przed przypadkiem (ktoś coś skasuje) jest kopia zapasowa z panelu admina.
  Rób ją regularnie, np. po każdej sesji.

## Gdybyś chciał(a) jednak termin ważności

Zamiast `allow read, write: if true;` można wpisać np.:

```
allow read, write: if request.time < timestamp.date(2027, 6, 30);
```

Po tej dacie baza sama się „zamknie” i aplikacja przestanie działać, dopóki ktoś
nie zmieni daty w konsoli (te same kroki co wyżej).

## Droga na później

Opis, jak docelowo zabezpieczyć bazę (logowanie Firebase Authentication, reguły
oparte na zalogowanym użytkowniku, App Check, ograniczenie klucza do adresu
strony), jest w głównym `README.md`, w rozdziale „Bezpieczeństwo”. Nic z tego nie
jest wdrożone bez Twojej zgody.
