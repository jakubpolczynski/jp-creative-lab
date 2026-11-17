# Idle: 60 FPS z animacją i fizyką

Rozszerzenie optymalizacji na aktywne przenoszenie pokoi:
[drag-performance.md](drag-performance.md). Poniższe wyniki dokumentują etap idle.

Cel: co najmniej 60 rzeczywiście renderowanych klatek/s w widoku ogólnym,
bez zatrzymywania kabli, wyłączania kolizji, sygnałów albo bloom.
Nie wprowadzono frameworka ani nowych zależności produkcyjnych.
Pomiary dotyczą uruchomienia lokalnego; commit/push/wdrożenie wyłącznie
na oddzielne polecenie użytkownika.

## Wynik końcowy

Windows, Edge, **NVIDIA GeForce RTX 4070 Ti / ANGLE D3D11**, DPR 1,
animacja i fizyka włączone. Końcowy renderer: `viewer.62ca3dcbbe48.js`.

| Próba | Klatki / czas | Średnio FPS | Minimum w oknie 1 s | Odstęp p95 | JS p95 |
|---|---|---:|---:|---:|---:|
| Przed zmianami, 1440×1000 | 73 / 10,014 s | **7,29** | — | 169,8 ms | 169,2 ms |
| Po, 1440×1000 headless | 3199 / 20,005 s | **159,91** | **157** | 6,3 ms | 4,2 ms |
| Po, 1920×1080 headless | 3296 / 20,022 s | **164,62** | **160** | 6,2 ms | 4,3 ms |
| Po, 1440×1000 normalne okno | 3299 / 20,011 s | **164,86** | **163** | 6,1 ms | 4,0 ms |

W trzech końcowych próbach: **zero odstępów >25 ms, zero long tasks i błędów**.
Każda próba wykazała >11 tys. zmian wysłanej geometrii i >19 tys. zmian sygnałów.
To nie jest wynik zatrzymanej symulacji. Na 165 Hz renderer korzysta z tego
odświeżania; nie wymusza dokładnie 60 na szybszym ekranie.
Te końcowe dane spełniają również pierwotny, niekalibrowany warunek p95 <18 ms.

Wcześniejsze próby, gdy Edge pracował w rytmie około 60 Hz, osiągały około
61–63 FPS i ≥60 klatek w każdej sekundzie, z p95 około 18,4–18,7 ms.
Nie traktujemy jednego szybkiego przebiegu jako gwarancji identycznego
planowania klatek przez system w każdych warunkach.

Dowody: [`idle-performance-evidence/`](idle-performance-evidence/):
`baseline.json`, `desktop-results.json`, `headed-results.json`, surowe dane
każdej klatki, zrzuty oraz wyniki regresji. SHA-1 renderera:
`62ca3dcbbe4808a4aa31d69bd4e61a222a8da373`.

Regresje końcowej wersji: **37 testów Node, 8 Python, 195 asercji
przeglądarkowych, 4 grupy przeciągania, 14 grup aplikacji — bez błędów**.
Dodatkowa symulacja 60 s: 7201 kroków każdego kabla, maksymalnie 84 próbki
jednego przewodu, końcowy brak przecięć pełnych odcinków z promieniem 0,085;
wersja indeksu brył pozostała 3, zamiast zmieniać się co klatkę.

## Co zmieniono

- Usunięto ograniczenie `1000/30`. Jeden RAF rysuje raz w natywnym rytmie
  przeglądarki. Ekran 60 Hz ma 60 FPS, a 144/165 Hz nie musi być sztucznie
  ograniczany. Nie ma nowego „licznika FPS” w interfejsie.
- Indeks przestrzenny pozostaje ważny, gdy bryły nie zmieniają położenia.
  Cache przechowuje **kandydatów z komórek**, nigdy wynik dokładnej kolizji.
  Każdy nowy segment nadal sprawdza rzeczywiste granice i grubość.
  Klucze liczbowe mają tekstowy fallback dla odległych współrzędnych.
- Dodano bezalokacyjne testy logiczne odcinków i wspólne wyszukanie kandydatów
  dla obu części zgięcia. Odpowiedź z normalną nadal obsługuje rzeczywiste
  kontakty, nakładające się bryły i czasowe CCD.
- Nieruchome bryły nie przechodzą ponownie przez interpolację transformacji.
  Solver kabli **nadal działa w stałych podkrokach 1/120 s**, z akumulatorem
  niezależnym od 60/144/165 Hz i od zdarzeń UI. Po przerwie nadgania najwyżej
  0,1 s. Przy ruchu pokoju/fotela/racka nadal działa ścieżka ruchomych kolizji.
- Pomija się redundantny sweep sprzed integracji tylko wtedy, gdy końce
  i przeszkody są nieruchome. Nie pomija się grawitacji, ograniczeń,
  projekcji, zgięć ani naprawy pełnych segmentów.
- Siatka kabla uzupełnia istniejące tablice `Float32Array`, zamiast budować
  nowe obiekty dla każdego trójkąta. Przekrój, obie wtyczki, kolory i metry
  powierzchni pozostają. Oba przebiegi renderują ten sam wynik.
- Bufory GPU nie są wysyłane ponownie, jeśli nie wykonano nowego kroku.
  Przy tej samej topologii pomija się także stałe kolory.
- Obrysy przycisków, etykiety i niewidoczne panele HTML aktualizują się przy
  zmianie kamery, położenia, rozmiaru albo stanu. Sprężyny i wejście
  użytkownika nadal są przeliczane. Audio zachowuje aktualizację kroku.
- Sprężyna hover po zejściu poniżej niewidocznego progu liczbowego osiąga
  dokładną pozycję docelową, zamiast bez końca przebudowywać kolizje z powodu
  ogona zmiennoprzecinkowego.

## Pomiar, nie symulowany zegar

```powershell
python -m http.server 8000 --bind 127.0.0.1
# W drugim terminalu, z istniejącą instalacją Playwright:
$env:NODE_PATH = 'C:\Users\Kuba\AppData\Local\Temp\opencode\jp-browser-tests\node_modules'
node tests/idle-performance.cjs
```

Domyślnie: sprzętowy Edge, 1440×1000 i 1920×1080, 5 s rozgrzewki i 20 s
pomiaru na rozmiar, bez `reduced-motion`. Test zlicza rzeczywiste końcowe
draw calls przebiegu bloom, czasy RAF i JS, timer queries GPU oraz zmiany
wysłanych pozycji kabla i sygnałów. Zapisuje JSON z każdą klatką i zrzut ekranu.
Nie podmienia zegara, nie wyłącza elementów sceny i nie szuka wyniku w DOM.
Domyślny katalog wyników: `%LOCALAPPDATA%\Temp\opencode\jp-idle-performance`.

Budżet:
- średnio ≥59 FPS i ≥59 faktycznych klatek w każdym pełnym oknie 1 s
  (tolerancja pojedynczej klatki na granicy okna przy 60 Hz);
- p99 odstępu <25 ms, mniej niż 1% odstępów >25 ms;
- p95 kosztu JS <12 ms, zmieniająca się geometria i sygnały, zero błędów;
- p95 odstępu nie większe niż p95 pustej przeglądarki w rytmie 60 Hz +1 ms, przy limicie
  bezwzględnym 20 ms i minimum budżetu 18 ms.

**Dlaczego kalibracja:** pierwotny stały warunek p95 <18 ms nie przechodził,
choć każda sekunda sceny miała co najmniej 60 klatek. Pomiar kontrolny pustej
strony ujawnił p95 samego RAF około 18,2–18,6 ms przy odświeżaniu około 60 Hz.
Dlatego test pokazuje i zapisuje kontrolę, zamiast ukrywać jitter Windows/Edge.
Kontrola używa slotów 60 Hz opartych na rzeczywistym RAF i osobno zapisuje
natywną częstotliwość. Na ekranie 165 Hz sloty 60 Hz wypadają co 2–3 odświeżenia
(12,1/18,2 ms); sama kalibracja pustego RAF 165 Hz nie opisuje przełączenia
Edge do rytmu 60 Hz podczas późniejszego pomiaru. Produkcyjny renderer
nadal rysuje w każdym RAF — sloty dotyczą wyłącznie pustej kontroli.
`JP_PERF_STRICT_18=1` zachowuje również opcjonalny pierwotny warunek <18 ms.
Kalibracja nie znosi ograniczeń liczby klatek, czasu JS ani długich przerw.

Normalne okno i stan hover można mierzyć osobno:

```powershell
$env:JP_HEADED = '1'
$env:JP_PERF_SIZES = '[{"width":1440,"height":1000}]'
$env:JP_PERF_HOVER = 'gallery' # opcjonalnie
node tests/idle-performance.cjs
```

W trybie headed runner ustawia `--disable-features=CalculateNativeWinOcclusion`
i przywołuje stronę na przód. Bez tego okna terminala/automatyzacji wywoływały
systemowy throttle **1 FPS**, mimo `document.hidden === false`. Ta flaga nie
zmienia aplikacji, fizyki, jakości obrazu, GPU ani rytmu vsync.
`JP_PERF_BASELINE=1` tylko zapisuje dane bez asercji; nie jest trybem zaliczenia.
`JP_GPU=software` jest opcją diagnostyczną, nie dowodem wydajności sprzętowej.

## Zakres weryfikacji

`tests/idle-optimization.test.mjs` sprawdza m.in. 4000 deterministycznych
porównań szybkiego predykatu z pełnym solverem, różne segmenty tej samej
komórki, unieważnienie cache i odległe współrzędne. Obejmuje też dokładny
kontakt ściany na końcu kroku i dalsze pchanie w obu kierunkach, krok fizyki
niezależny od RAF, brak zamrożenia geometrii oraz ponowne użycie tablic.
Istniejące testy nadal obejmują ruchome przeszkody, pełną grubość odcinków,
porty, skracanie/rozciąganie kabli i causalne światła.

Niezależny przegląd potwierdził zachowanie solvera, kolizji, sygnałów i obu
przebiegów bloom. Wskazany przypadek granicznego kontaktu został naprawiony
i dodany do testu; ponowny przegląd nie wskazał pozostałego blokera.

## Granice wyniku

To dowód na wskazanym GPU i w podanych rozmiarach, nie gwarancja dla każdej
karty, karty w tle, ograniczenia energii ani dowolnie rozciągniętego świata.
FPS oznacza rzeczywiste zgłoszenia końcowego renderowania i kadencję RAF,
nie niezależny pomiar fizycznych scanoutów monitora. Zrzuty pikselowe
SwiftShader sprawdzają regresje, nie FPS sprzętowe.

Zakres budżetu to **idle bez interakcji**, nie trzymanie/przenoszenie pokoju
ani przejście kamery. Dodatkowe próby hover w normalnym oknie bywały niestabilne:
jedna profilowana próba miała minimum 48 klatek w sekundzie, podczas gdy pusta
kontrola już nie utrzymywała 60 Hz; inna nieprofilowana próba również miała
długie klatki. Dane diagnostyczne zachowano jako `headed-hover-diagnostic.json`,
nie jako zaliczony benchmark. Osobny hardware headless hover przeszedł budżet
(60,54 FPS, p95 18,2 ms). Nie deklarujemy więc stałych 60 FPS dla wszystkich
stanów hover, aktywnego ruchu i zewnętrznego obciążenia Windows.
