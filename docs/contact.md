# Formularz kontaktowy na serwerze

## Obsługa

Kliknięcie serwera rack przybliża panel z napisem **[JP]** (ściana +Z), nie
półki na ścianie +X ani monitor komputera, i odsłania formularz HTML
dopasowany do fizycznego panelu. Serwer ma własne uniesienie, wciśnięcie,
światło oraz obrys fokusu; nie porusza przy tym pokojem.

- Mysz i dotyk: kliknięcie serwera.
- Klawiatura: Tab do serwera, Enter lub spacja.
- Powrót: „Wróć do sceny” albo Escape; fokus wraca do serwera.
- Escape może odwrócić również niedokończone przybliżenie.
- Ograniczenie ruchu wyłącza przesunięcia i przejście kamery, zachowując światło.
- Na małym ekranie formularz przewija się wewnątrz serwera.
- Zamknięcie formularza i błąd wysyłki nie kasują szkicu. Szkic pozostaje
  wyłącznie w pamięci otwartej strony — odświeżenie go usuwa.

## Włączenie wysyłania

Publiczny klucz odbiorcy znajduje się w `contact-config.js`. Jeśli jest pusty
lub ma nieprawidłowy format, formularz informuje o braku konfiguracji,
przycisk wysyłania jest wyłączony i nie kontaktuje się z API.

1. Otwórz https://web3forms.com/ i utwórz formularz dla swojego adresu email.
2. Zweryfikuj adres odbiorcy zgodnie z instrukcjami usługi.
3. W `contact-config.js` wpisz otrzymany **publiczny identyfikator formularza**
   jako `CONTACT_CONFIG.accessKey`.
4. Sprawdź własną politykę prywatności i warunki przetwarzania danych przez
   dostawcę. Notka przy formularzu nie jest pełną polityką prywatności strony.
5. Odśwież stronę i wykonaj świadomy test dostarczenia wiadomości. Sprawdź
   również folder spam w skrzynce odbiorcy.

Klucz Web3Forms przeznaczony do formularza frontendowego jest widoczny w kodzie
strony. Nie wstawiaj tutaj hasła pocztowego, tokenu administracyjnego ani
sekretnego klucza innej usługi. Sprawdź bieżące limity i zabezpieczenia planu
w panelu dostawcy; honeypot nie zastępuje ochrony po stronie API.

## Wysyłka i bezpieczeństwo

`contact.js` przesyła wyłącznie imię, email, adres zwrotny, treść i stały temat
na `https://api.web3forms.com/submit`. Nie wysyła obrazu używanego w ASCII.
Do wysyłki nie jest potrzebny własny backend ani biblioteka runtime.

- Imię: do 80 znaków; email: do 254; wiadomość: do 5000.
- Honeypot blokuje żądanie, jeżeli ukryty checkbox jest zaznaczony.
- Podczas żądania pola i przycisk są zablokowane; nie ma równoległych wysyłek.
- Po 15 sekundach brak potwierdzenia jest zgłaszany jako błąd. Żądanie jest
  przerywane lokalnie; nie gwarantuje to wycofania wiadomości już przyjętej przez
  dostawcę. Nie ma automatycznych ponowień.
- Sukces wymaga odpowiedzi HTTP 2xx i `success: true` od Web3Forms.
  Oznacza przyjęcie do wysyłania, nie dowód dostarczenia do skrzynki.
- Błąd API lub sieci zachowuje treść; komunikaty są stałym tekstem, nie HTML
  otrzymanym od dostawcy.
- Powrót do sceny nie anuluje trwającej wysyłki i nie powoduje kradzieży fokusu
  po jej zakończeniu. Po ponownym otwarciu widać rzeczywisty stan żądania.

## Geometria i pliki

- `server.js`: powierzchnia kontaktowa, obrys serwera i dopasowanie prostokąta
  HTML do viewportu; cel kamery na panelu [JP] i kierunek patrzenia +Z.
- `viewer.<hash>.js`: niezależny ruch serwera, kamera i shader ukrywający
  otoczenie oraz diody pod formularzem.
- `index.html`: przycisk, obrys, panel HTML i style.
- `contact-config.js`: publiczna konfiguracja odbiorcy.
- `contact.js`: walidacja, API oraz stan formularza.

Nie przebudowano GLB. Odwrotność istniejącego `_BUTTON` porusza rack
i stopniowo deformuje koniec kabla przy racku. Maska `_RACK` nadal określa
wyłącznie świecące akcenty; nie jest maską całej obudowy.

## Testy

```powershell
node tests/server.test.mjs
node tests/contact.test.mjs
```

`http://localhost:8000/tests/server.html` sprawdza prawdziwy renderer, przejścia,
fokus, szkic i powrót do monitora. Nie wysyła prawdziwego maila.
Testy integracji z usługą należy wykonywać z atrapą odpowiedzi API; rzeczywiste
dostarczenie maila weryfikuje właściciel po skonfigurowaniu adresu odbiorcy.

`http://localhost:8000/tests/contact.html` sprawdza rzeczywisty kod kontrolera
formularza na kopii produkcyjnego HTML: walidację, honeypot, błędy, blokadę
duplikatów, zachowanie szkicu, timeout i poprawnie potwierdzoną wysyłkę.
Transport jest atrapą — żaden email nie jest wysyłany.

### Wynik weryfikacji — 2026-11-16

- Wszystkie 7 plików `tests/*.test.mjs`: zaliczone.
- `python tests/test_cable.py`: 8 testów zaliczonych, bez regeneracji assetu w repo.
- Edge headless z programowym WebGL (SwiftShader): 13 scenariuszy zaliczonych,
  obejmujących istniejące strony testowe, kontakt, klawiaturę, atrapy API
  i emulowane widoki 390×844 oraz 844×390.
- Sprawdzono zrzuty desktop/mobile i zgodność hasha renderera z nazwą.
- Regresja celu kamery sprawdza kliknięcie dokładnie w logo JP, rzeczywistą
  macierz widoku +Z oraz zgodność granic HTML z projekcją panelu JP.
- Pierwszy przebieg wykonano z pustym kluczem; rzeczywiste dostarczenie emaila
  nie było testowane.

### Konfiguracja odbiorcy — 2026-11-16

Na zlecenie właściciela wpisano dostarczony publiczny klucz formularza
do `contact-config.js`. Odbiorcę określa powiązanie klucza w Web3Forms,
nie osobny adres w HTML. Nie wykonano rzeczywistej wysyłki ani weryfikacji
dostarczenia do skrzynki.
