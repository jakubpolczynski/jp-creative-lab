# 60 FPS podczas przenoszenia pokoju

Cel obejmuje **ciągłe przeciąganie**, nie oczekiwanie w idle przed chwytem.
Pozostają animowane wiązki, grawitacja i zginanie kabli, ich oba podpięte końce,
kolizje całych odcinków, wyposażenie pokoi i oba przebiegi bloom.
Bez nowych zależności i zmiany GLB. Commit/push i publikacja wyłącznie
na oddzielne polecenie użytkownika.

## Końcowy wynik — szybkie przeciąganie

**15 poprawnych prób sprzętowych po ostatniej zmianie**: każdy z pięciu pokoi
w 1440×1000 i 1920×1080 (headless) oraz w normalnym oknie Edge 1280×720.
Wszystkie przy amplitudzie X 80 px / Y 40 px i okresie 1,5 s.

| Pomiar | Wynik |
|---|---|
| Średni FPS w poszczególnych próbach | **164,47–165,00** |
| Najwolniejsza pełna sekunda spośród wszystkich prób | **161 klatek** |
| Największy odstęp pomiędzy klatkami | **12,3 ms** |
| Największe p95 kosztu JS | **7,8 ms** |
| Faktyczne zmiany położenia pokoju w 10 s | **590–600** |
| Odstępy >25 ms / long tasks / błędy | **0 / 0 / 0** |

Kable i wiązki zmieniały dane GPU w każdej próbie; pointer capture pozostawał
aktywny do końca pomiaru. Weryfikacja surowych danych potwierdziła wszystkie
15 przypadków, nie tylko deklarowaną średnią FPS.

Dowody: [`drag-performance-evidence/`](drag-performance-evidence/).
`fast-final/` zawiera 10 prób desktop, `headed-fast-1280/` pięć prób okienkowych;
są tam wyniki JSON, każda klatka, zmiany centrum pokoju i zrzuty ekranu.
`source-hashes.json` identyfikuje aktualne moduły produkcyjne.
Renderer `viewer.62ca3dcbbe48.js` nie zmienił zawartości w tej iteracji,
więc zachowuje prawidłowy hash; zmieniły się importowane moduły solvera.

## Zmiany

- `collisions.js`: indeks przestrzenny otrzymuje tylko zmienione bryły.
  Każda ma własną listę komórek; przesunięcie usuwa poprzednie wpisy i dodaje
  aktualne, wraz z granicami czasowego sweepu. Nieruchome pokoje i rack
  nie są ponownie indeksowane przy każdym podkroku innego pokoju.
- Cache kandydatów jest unieważniany po zmianie indeksu. Aktualizacja wymaga
  niezmiennych obiektów brył; pełne `set()` nadal wymusza przebudowę.
  Usuwanie brył, wygaszanie granic `previous` oraz duplikaty ID są obsługiwane.
- `transformBox()` wylicza AABB analitycznie z centrum/półrozmiarów,
  z obrotem fotela i skalą. Wynik odpowiada transformacji wszystkich ośmiu
  narożników, również dla ujemnej skali.
- `cable-world.js`: transformacje są buforowane **osobno dla właścicieli**.
  Przeniesienie jednego pokoju nie tworzy geometrii kolizji pozostałych.
  Zmiana pozycji, unoszenia, skali lub fotela unieważnia właściwą grupę.
- `sweptSegment()` odrzuca rozłączne obszary ruchu przed rekursywnym CCD,
  liczy prędkość materiału raz i pomija statyczne bryły tylko wtedy,
  gdy materiał również jest nieruchomy. Test predykatowy nie alokuje normalnych
  dla odrzuceń; rzeczywisty kontakt nadal wymaga potwierdzenia pełnego promienia.
- Szybkość kursora nie mnoży już liczby pełnych kroków świata przez
  `przesunięcie / 0,12`. Translacja, unoszenie i skala przy stałej pozie fotela
  dają liniowo ruchome powierzchnie AABB, dla których działa ciągłe CCD. Kroki fizyki pozostają
  czasowe, najwyżej 1/120 s. Obrót fotela nadal dostaje dodatkowe próbki
  co najwyżej 0,03 rad, bo jego granice nie są funkcją liniową.
  Podczas przeciągania fotel ma stałą pozę i skala pokoju wynosi 1.
  Jednoczesna zmiana offsetu fotela i skali jest biliniowa; nie traktujemy
  takiej dowolnej kombinacji API jako dokładnego liniowego sweepu.
- Nie zmieniono sterownika przeciągania ani nie odroczono ruchu do puszczenia.
  Nie wyłączono fizyki pozostałych kabli, kolizji ani świecenia.

## Metoda

`tests/drag-performance.cjs`:
1. Uruchamia sprzętowy Edge z włączonym ruchem.
2. Chwyta prawdziwym wskaźnikiem wybrany pokój po 350 ms.
3. Dopiero przy aktywnym pointer capture zaczyna pomiar.
4. Przez 10 s wysyła ruchy wskaźnika z docelowym rytmem 60/s po płynnej
   trajektorii w dwóch osiach; rejestruje faktyczne zmiany pozycji pokoju.
5. Zlicza rzeczywiste końcowe draw calls oraz zmiany wysłanej geometrii i wiązek.
   Zapisuje każdą klatkę, okna jednosekundowe, koszty JS i błędy.
6. Kończy pomiar przed puszczeniem; sprawdza brak przypadkowego wejścia do aplikacji.

Warunki: ≥59 FPS średnio **i w każdej pełnej sekundzie**, p95 odstępu ≤20 ms,
p99 <25 ms, <1% odstępów >25 ms, p95 JS <12 ms, >25 rzeczywistych zmian
położenia/s, zmieniające się kable i sygnały, zero błędów.
Nie wliczamy rozgrzewki, nieruchomego przytrzymania ani czasu po puszczeniu.

```powershell
python -m http.server 8000 --bind 127.0.0.1
# Drugi terminal; istniejący Playwright:
$env:NODE_PATH = 'C:\Users\Kuba\AppData\Local\Temp\opencode\jp-browser-tests\node_modules'
node tests/drag-performance.cjs
```

Domyślnie: wszystkie pięć pokoi w 1440×1000 i 1920×1080. Parametry:
`JP_DRAG_ROOMS=gallery,particles,materials,sound,monitor`,
`JP_PERF_SECONDS=10`, `JP_PERF_SIZES`, `JP_HEADED=1`,
`JP_DRAG_AMPLITUDE=40` (px), `JP_DRAG_PERIOD=3` (s).
`JP_PERF_BASELINE=1` zapisuje bez asercji; `JP_DRAG_PROFILE=1` dodaje profil CPU.
Szybszy test używa `JP_DRAG_AMPLITUDE=80` i `JP_DRAG_PERIOD=1.5`:
około czterokrotnie większa prędkość kursora, do około 474 px/s na przekątnej.
Domyślny katalog: `%LOCALAPPDATA%\Temp\opencode\jp-drag-performance`.
Tryb okienkowy wyłącza jedynie throttle natywnego zasłonięcia okna Windows,
tak jak [benchmark idle](idle-performance.md).

## Wyniki pierwszego etapu

Windows / Edge, RTX 4070 Ti, ANGLE D3D11, DPR 1. Po zmianie każdy pokój
zmieniał położenie 528–600 razy w ciągu 10 s; nie jest to pomiar statycznej sceny.
Trajektoria podstawowa: amplituda X 40 px, Y 20 px, okres 3 s.

| Pokój | Przed: średnio / minimum 1 s, 1440 | Po 1440: średnio / minimum | Po 1920: średnio / minimum | Normalne okno 1440: średnio / minimum |
|---|---:|---:|---:|---:|
| Galeria | 131,97 / 110 | 164,28 / 162 | 164,80 / 163 | 164,66 / 163 |
| Cząsteczki | 110,48 / 86 | 163,90 / 161 | 163,62 / 159 | 164,71 / 163 |
| Materiały | **51,16 / 20** | 163,97 / 159 | 163,85 / 158 | 163,67 / 152 |
| Dźwięk | **79,85 / 36** | 161,66 / 155 | 163,63 / 160 | 158,62 / 146 |
| ASCII | 160,77 / 155 | 164,44 / 162 | 164,71 / 163 | 164,74 / 163 |

W tych 15 próbach po zmianie: **zero odstępów >25 ms, zero long tasks,
zero błędów**. p95 kosztu JS najwyżej 10,4 ms. Każda próba przeszła budżet.
Pomiary przed zmianą miały także p95 JS do 54,2 ms i odstępy do 121,2 ms.
Ekran 165 Hz pozwala rendererowi przekraczać cel 60 FPS — nie narzucamy
sztucznego limitu 60 na szybszym monitorze.

Ta tabela opisuje pierwszy etap (indeks/transformacje) i trajektorię podstawową.
Próba szybsza wykryła następnie problem przestrzennych podkroków: materiały
miały minimum 41 FPS, dźwięk 31 FPS, p95 JS do 67,2 ms. Po zastąpieniu tego
mnożnika czasowym krokiem + CCD szybkie materiały i dźwięk przeszły test:
164,79 / 164,76 FPS, minimum 163 / 162 klatek w sekundzie, p95 JS 6,9 / 7,4 ms,
bez odstępów >25 ms. Końcowy pełny test szybkich trajektorii zapisano osobno,
aby nie mieszać etapów optymalizacji.

## Testy poprawności

- `tests/moving-world-optimization.test.mjs`: inkrementalne komórki,
  nieruchome/zmienione/usunięte bryły, czasowy sweep i jego czyszczenie,
  zgodność transformacji z narożnikami, kontakt w środku odcinka.
- `tests/moving-world-integration.test.mjs`: kolejne przeniesienia pokoju,
  zmiany unoszenia/skali i foteli, powrót do neutralnego stanu; po każdym
  kroku zgodność wszystkich brył ze świeżą geometrią, brak pozostałych
  `previous`, przypięte końce i prześwit pełnego promienia każdego kabla.
  Obcy pokój przechodzi przez rzeczywisty punkt poprzedniej trasy galerii.
  Osobny przypadek przeprowadza ścianę całkowicie przez materiał w **jednym**
  kroku 1/240 s, kończy ścianę w wolnym miejscu i wymaga pchnięcia kabla
  przed ścianę — sama końcowa naprawa/prześwit po tunelowaniu nie wystarczy.
- Istniejące testy zachowują kierunkowe CCD, wąskie wyjątki portów,
  nielimitowane wydłużanie/zwijanie, mysz/dotyk/klawiaturę i aplikacje monitorów.
- Niezależny przegląd nie znalazł defektu implementacji. Wskazaną lukę
  pokrycia cache właścicieli zamknął dodatkowy test integracyjny.

Końcowe polecenia weryfikacji:

```powershell
node --test tests/*.test.mjs
python tests/test_cable.py
node tests/browser-regression.cjs
node tests/flexible-cables.cjs
node tests/four-rooms.cjs
git diff --check
```

Wyniki: **39 testów Node, 8 Python, 195 asercji przeglądarkowych,
4 grupy przeciągania, 14 grup aplikacji — bez błędów**.
Runnerów GPU nie uruchamiano równolegle. Zapisano też red/green:
przywrócenie starego mnożnika kroków w kopii modułu powoduje porażkę regresji,
a obecny solver ją zalicza; bez modyfikowania plików produkcyjnych.

## Granice

To pomiar na wskazanym sprzęcie, przy zadanych rozmiarach i trajektorii,
nie gwarancja dowolnej prędkości, nieograniczonej liczby próbek, telefonu czy
zewnętrznego obciążenia systemu. FPS oznacza rzeczywiste zgłoszenia końcowego
renderowania i kadencję RAF, nie niezależny pomiar scanoutu monitora.
Kolizje pozostają konserwatywnymi bryłami; nie dodano kolizji kabel–kabel.
Regresje SwiftShader służą poprawności obrazu, nie potwierdzeniu sprzętowych FPS.

Próba szybkiego ruchu w większym normalnym oknie 1440×1000 miała część gestów
anulowanych przez lifecycle/capture. Runner ją **odrzucił**, zamiast uznać
późniejsze klatki idle za wynik przeciągania; diagnostyka jest zachowana jako
`invalid-headed-cancelled.json`. Końcowy poprawny test normalnego okna używa
1280×720 i zapisuje pusty dziennik anulowań. Nie przypisujemy nieustalonej
przyczyny anulowania do FPS ani nie włączamy tej próby do 15 zaliczonych.
