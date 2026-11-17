# Giętkie kable i przenoszenie pokoi

Aktualizacja wydajności 2026-11-17: stary limit 30 FPS został usunięty.
Aktualny renderer, pomiary sprzętowe i zmiany solvera:
[idle-performance.md](idle-performance.md). Wyniki i hash poniżej dokumentują
poprzednie wydanie funkcji, nie aktualny benchmark.

Aktualny zakres zastępuje opis sztywnych tras i stałych czasów w
`four-rooms.md`. Bez nowych zależności, zmiany GLB, publikacji i wysyłania maili.

## Sterowanie

- Krótko kliknij pokój, aby wejść do aplikacji na jego monitorze.
- Przytrzymaj przez **350 ms**, przeciągnij i puść, aby postawić całą wyspę.
  Działa myszą i dotykiem, również po opuszczeniu obrysu pokoju.
- Escape lub anulowanie dotyku przywraca położenie sprzed chwytu.
- Klawiatura: ustaw fokus na pokoju, **M**, strzałki, **Enter**, aby postawić.
  Strzałka przesuwa o 0,25 jednostki; Shift zwiększa krok do 1.
  Zwykłe Enter/spacja nadal otwiera monitor.
- Wyspy nie mogą nachodzić na inne wyspy ani rack. Nie ma sztywnej granicy mapy
  ani ograniczenia odległości przez kabel. Kamera obejmuje nowy układ po puszczeniu.
- Układ istnieje tylko do odświeżenia strony. Nie korzystamy z localStorage.

## Kabel

`rooms.js` określa wyłącznie początkowe pozycje, kolory i odpowiednie porty A.
Punkt B wynika z aktualnej pozycji tylnej powierzchni monitora. Nie ma już
list ręcznie zapisanych zakrętów, dawnych kanciastych obudów ani sztywnych złączek
wzdłuż przewodu. Wtyczki na końcach zostały.

Algorytm widoczności szuka początkowej drogi pomiędzy końcami na podstawie
rzeczywistych przeszkód. Następnie trwały łańcuch punktów ma grawitację,
tłumienie, ograniczenia odcinków, miękkie zginanie i ślizgające się kontakty
z tarciem. Kontakty nie są nieruchomymi kotwicami w powietrzu. Materiał jest
dodawany przy odsuwaniu i zwijany przy przybliżaniu. Kabel ma zaokrąglony
przekrój o promieniu 0,085; smuga biegnie po jego aktualnej powierzchni.
Niewidoczne podparcie y=-0,60 zapobiega opadaniu w pustkę.

Kolizje dotyczą odcinków z uwzględnieniem grubości, nie tylko samych węzłów.
Obejmują podłogi, ściany i obramowania, wyposażenie stanowisk oraz bryły
oryginalnego racka. Przenoszenie obcej wyspy również zmienia przeszkody kabla.
Wyjątek przy gnieździe dotyczy tylko krótkiego zakończenia i jego własnego
portu; nie wyłączamy kolizji całego pokoju czy serwera.
Pozycje brył są interpolowane również dla własnego pokoju kabla. Indeks
przestrzenny używa obszarów przesunięcia tylko do wyszukania kandydatów;
nie traktuje całego przebytego obszaru jako nowej bryły. Odpowiedź CCD wymaga
potwierdzonego kontaktu przy rzeczywistym promieniu przewodu i odpycha materiał
przed poruszającą się powierzchnię. Dotyczy także przeszkody trafiającej
w środek odcinka oraz odwrotnego ruchu kabla przez nieruchomy mebel.

## Architektura

| Moduł | Odpowiedzialność |
|---|---|
| `room-layout.js` | Bieżące pozycje i sprawdzanie ustawienia; definicje startowe pozostają niezmienne. |
| `room-drag.js` | Przytrzymanie, pointer capture, klik kontra drag, klawiatura i anulowanie. |
| `collisions.js` | Bryły z geometrii, indeks przestrzenny, grubość odcinków, wyjście z nakładających się brył. |
| `cable-physics.js` | Końce, automatyczna droga, trwała symulacja, kontakty i zwijanie materiału. |
| `cable-mesh.js` | Ciągła sześcioboczna tuba i współrzędne długości na powierzchni. |
| `cable-world.js` | Jedna aktualizacja pięciu kabli i przeszkód przed oboma przebiegami renderowania. |
| `signals.js` | Zdarzeniowy zegar transmisji odporny na zmiany długości. |

Podkroki fizyki: maksymalnie 1/120 s, maksymalnie 0,1 s nadrabiania po przerwie.
Kolor i bloom korzystają z tego samego stanu i buforów, bez podwójnego kroku.
Liczba próbek/pojemność buforów jest dostosowywana zamiast narzucać limit długości.
Nie ma dodatkowego kontekstu WebGL ani osobnej pętli dla każdego kabla.

Impulsy mają **5 jednostek długości kabla/s**. Zielony idzie od serwera,
odpowiedź w kolorze pokoju zaczyna się sekundę po rzeczywistym odbiorze.
Zmiana długości nie zeruje postępu ani innych połączeń. Światła odbiorcy reagują
dopiero po dotarciu czoła; najpóźniejsza odpowiedź wyznacza kolor racka.
Stałe czasy dotarcia z wcześniejszych raportów nie obowiązują.

Ograniczenie ruchu zachowuje drag i kolizje, ale usuwa kołysanie i animowane smugi.
Ukrycie karty oraz utrata WebGL anulują gest; niewidoczna karta nie utrzymuje RAF.

## Weryfikacja

```powershell
node --test tests/*.test.mjs
python tests/test_cable.py
$env:NODE_PATH = 'C:\Users\Kuba\AppData\Local\Temp\opencode\jp-browser-tests\node_modules'
node tests/flexible-cables.cjs
node tests/browser-regression.cjs
node tests/four-rooms.cjs
```

Procesy przeglądarkowe uruchamiać **szeregowo** z działającym serwerem portu 8000.
`tests/rope-fixture.js` odczytuje faktycznie wysłane bufory GPU i uniformy,
więc nie zgaduje tras na podstawie definicji pokoju. Sprawdza oba końce,
smugi, rzeczywistą propagację oraz piksele odbioru. Fixture nie instaluje
globalnych haków testowych w kodzie produkcyjnym.

Nowe testy obejmują także dziesięć sekund pracy wszystkich kabli z prawdziwą
geometrią racka, brak przecinania całych segmentów, brak narastających pętli,
rozsunięcie i zwinięcie, nakładające się elementy fotela, przeniesione monitory,
drugi palec i anulowanie. Finalne wyniki i obrazy: `four-rooms-evidence/`.

Niezależny przegląd wskazał i pomógł usunąć luki w czasowych kolizjach,
wyjątkach przy portach, głębi kamery, czasie skróconej transmisji, kotwiczeniu
kontaktów i anulowaniu gestu. Regresje obejmują także kamerę po przesunięciu
pokoju o ponad 60 jednostek oraz brak wstecznego datowania odbioru.

### Wynik końcowy

| Weryfikacja | Wynik |
|---|---|
| Node: logika, fizyka, kolizje, sygnały, aplikacje | **36 PASS, 0 FAIL** |
| Python: oryginalna geometria kabla/GLB | **8 PASS, 0 FAIL** |
| Drag: 1440×1000, 390×844, 844×390, animowane 1100×850 | **4 grupy, 0 błędów** |
| Regresje przeglądarkowe i rzeczywiste piksele | **11 scenariuszy, 195 asercji, 0 błędów** |
| Aplikacje, WebGL/Audio, mobile i lifecycle | **14 grup, 0 błędów** |

Ostateczny renderer: `viewer.606ceb00e1e1.js`.
SHA-1: `606ceb00e1e14e7055f3f97fa518a5e5bdc2e9bf`.
GLB zachował SHA-256
`8b4b82ab815b34eb73dff520e89edc535eff9745642c20cdfb87effd081f3f18`.
Wyniki JSON i zrzuty zostały skopiowane do `four-rooms-evidence/`.

Łączne polecenie trzech runnerów przekroczyło limit czasu hosta po zaliczeniu
regresji; ostatni runner aplikacji wykonany osobno zakończył się sukcesem.
Nie pominięto testów. Powrót po kliknięciu z reduced motion nadal daje
**0 pozostałych zmienionych kanałów pikseli**; zmiana samego hover/glow nie
uruchamia już ponownego układania statycznego kabla.

## Świadome granice

- To lekka symulacja przewodu do interaktywnej sceny, nie przemysłowy solver
  sprężystych materiałów. Kontakty są konserwatywnymi bryłami pudełkowymi;
  obrócony fotel może mieć nieco większy obszar kontaktu niż jego dokładny mesh.
- Drobne klawisze, litery i ornamenty korzystają z głównej bryły obudowy/podłoża.
- Nie ma kolizji między kablami, supłów, rozłączania wtyczek ani fizyki mebli.
- Brak sztucznego limitu odległości nie oznacza nieskończonej precyzji GPU
  i niezmiennej wydajności przy dowolnie wielkim świecie.
- Sprawdzenia telefonu dotyczą emulowanych rozmiarów/dotyku w Edge/SwiftShader,
  nie fizycznego urządzenia ani gwarancji 30 FPS na każdej karcie.
