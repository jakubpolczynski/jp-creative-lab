---
goal: Formularz kontaktowy na froncie serwera 3D
version: 1
date_created: 2026-11-16
last_updated: 2026-11-16
owner: JP Creative Lab
status: Completed
tags: [feature, webgl, contact]
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

Użytkownik zatwierdził formularz wkomponowany we front serwera z zachowaniem
analogicznym do pokoju i zezwolił kontynuować realizację bez dalszych ustaleń.
Wykorzystujemy istniejący model, renderer i Web3Forms; nie dodajemy backendu.

## 1. Requirements & Constraints

- **REQ-001**: Serwer ma niezależne hover, wciśnięcie, odbicie, kliknięcie i obsługę klawiatury.
- **REQ-002**: Kamera przybliża panel [JP] na ścianie +Z serwera; HTML formularza pokrywa fizyczny prostokąt tego panelu, nie półki +X, monitor ani osobny modal.
- **REQ-003**: Escape i przycisk powrotu przywracają widok ogólny i fokus serwera; pokój oraz ASCII zachowują dotychczasowe działanie.
- **REQ-004**: Formularz zawiera imię, email i wiadomość oraz stan wysyłania, sukcesu i błędu; szkic pozostaje po błędzie i zamknięciu.
- **SEC-001**: Brak klucza Web3Forms blokuje sieć i nie symuluje sukcesu; publiczny klucz konfiguruje `contact-config.js`.
- **SEC-002**: Jedno żądanie naraz, walidacja długości, honeypot, timeout oraz sukces tylko po potwierdzeniu API; brak automatycznych ponowień.
- **CON-001**: Bez nowych zależności runtime, regeneracji GLB, wdrożenia i push; zachować ograniczenie ruchu i pauzę niewidocznej karty.
- **PAT-001**: Wspólna sprężyna z `interaction.js`, przejście z `monitor.js`, maska odwrotna do `_BUTTON` porusza serwer i drugi koniec kabla.

## 2. Implementation Steps

### Implementation Phase 1

- **GOAL-001**: Wprowadzić niezależne moduły kontaktu i testy logiki.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Dodać `server.js` z geometrią powierzchni kontaktowej i `serverFrame(width,height)` zachowującym proporcje fizycznego frontu. | Tak | 2026-11-16 |
| TASK-002 | Dodać `contact-config.js` z pustym publicznym kluczem oraz `contact.js` z walidacją, budową payloadu, wysyłką i kontrolerem DOM. | Tak | 2026-11-16 |
| TASK-003 | Dodać `tests/server.test.mjs` i `tests/contact.test.mjs`, bez rzeczywistych żądań email. | Tak | 2026-11-16 |

### Implementation Phase 2

Zależność: zakończona faza 1.

- **GOAL-002**: Podłączyć fizyczny serwer, UI i przejścia.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-004 | Rozszerzyć renderer: shader ruchu serwera, hover, wyciszenie otoczenia, wspólny wybór celu kamery, dostępne przyciski i przywracanie fokusu. Nadać nazwę według SHA-1: `viewer.5dfeb71381e0.js` i zaktualizować odwołania. | Tak | 2026-11-16 |
| TASK-005 | W `index.html` dodać `#server-button`, obrys fokusu, `#server-app` i semantyczny formularz z polskimi komunikatami; style dopasowane do zielonych neonów. | Tak | 2026-11-16 |
| TASK-006 | Dodać `tests/server.html` z deterministycznymi przejściami i `tests/contact.html` z atrapą API; aktualizować `README.md`, `Agent.md` i `docs/contact.md`. | Tak | 2026-11-16 |

### Implementation Phase 3

Zależność: zakończona faza 2.

- **GOAL-003**: Potwierdzić integrację i brak regresji.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-007 | Uruchomić wszystkie `tests/*.test.mjs`, `python tests/test_cable.py`, strony testowe w Edge oraz scenariusze desktop/mobile/reduced-motion z atrapą Web3Forms. | Tak | 2026-11-16 |
| TASK-008 | Sprawdzić `git diff --check`, odświeżyć lokalny graf Graphify i pozostawić uruchomiony podgląd bez wysyłania prawdziwego maila. | Tak | 2026-11-16 |

## 3. Alternatives

- **ALT-001**: Pełnoekranowy modal odrzucony: użytkownik wybrał fizyczny front serwera.
- **ALT-002**: Nowy model GLB z ekranem odrzucony: istniejący front mieści powierzchnię HTML, a maska `_BUTTON` umożliwia ruch bez zmiany assetu.
- **ALT-003**: Własny endpoint SMTP odrzucony: zbędny backend i sekrety dla statycznego projektu.

## 4. Dependencies

- **DEP-001**: Istniejące funkcje `createRoomMotion`, `stepRoomMotion`, `createMonitorTransition`, `monitorProgress`.
- **DEP-002**: Web3Forms `https://api.web3forms.com/submit`; rzeczywiste wysyłanie wymaga zweryfikowanego adresu odbiorcy i publicznego klucza.
- **DEP-003**: Node.js i lokalna przeglądarka WebGL2 do testowania; Playwright tylko jako zewnętrzne narzędzie testowe, poza repo.

## 5. Files

- **FILE-001**: `server.js`, `contact.js`, `contact-config.js` — nowe moduły produkcyjne.
- **FILE-002**: `index.html`, `viewer.<hash>.js` — integracja sceny.
- **FILE-003**: `tests/server.test.mjs`, `tests/contact.test.mjs`, `tests/server.html`, `tests/contact.html` — testy.
- **FILE-004**: `README.md`, `Agent.md`, `docs/contact.md` — obsługa i konfiguracja.

## 6. Testing

- **TEST-001**: Proporcje frontu, centrowanie, wąskie i niskie okna, poprawne wartości geometryczne.
- **TEST-002**: Brak klucza, nieprawidłowe dane, honeypot, błąd sieci, timeout, odrzucenie API i poprawna odpowiedź.
- **TEST-003**: Rozłączne hitboxy, hover i klik serwera, kamera, fokus, Escape, klawiatura, powrót, niezależność pokoju.
- **TEST-004**: Formularz w granicach frontu, przewijanie na małych ekranach, zachowanie szkicu, blokada duplikatów i atrapa wysyłki.
- **TEST-005**: Dotychczasowe testy ASCII, animacji, oświetlenia, monitora, logo i krzesła.

## 7. Risks & Assumptions

- **RISK-001**: Brak klucza blokuje dostarczanie maila; gotowe UI i zachowanie można przetestować lokalnie z atrapą.
- **RISK-002**: Wysyłka do dostawcy wymaga poinformowania użytkownika o przetwarzaniu danych; nie przedstawiamy ogólnego tekstu jako kompletnej polityki prywatności.
- **ASSUMPTION-001**: Imię, adres zwrotny i treść wystarczają; nie dodajemy załączników ani newslettera.
- **ASSUMPTION-002**: Klucz formularza jest publicznym identyfikatorem, nie kluczem administracyjnym i nie hasłem skrzynki.

## 8. Related Specifications / Further Reading

- `../Agent.md`
- `../docs/deployment.md`
- `../docs/contact.md` — konfiguracja i wynik weryfikacji.
- https://docs.web3forms.com/getting-started/examples/ajax-contact-form-using-javascript
