# JP Creative Lab — instrukcja pracy dla agenta

## Cel i obecny zakres

JP Creative Lab to statyczny, interaktywny prototyp strony z izometryczną
sceną voxel 3D. Serwer rack jest połączony kablem z komputerem w pokoju.
Kliknięcie pokoju odsuwa krzesło i przybliża kamerę do monitora, na którym
działa lokalny konwerter obrazów na kolorowe ASCII z panelem remiksowania.
Serwer jest drugim przyciskiem: kamera przybliża jego front, na którym mieści się
formularz kontaktowy. Wysyłkę obsługuje opcjonalnie skonfigurowany Web3Forms.

Świat zawiera także cztery działające, proceduralne pokoje: galerię projektów,
laboratorium cząsteczek, studio materiałów i pokój dźwięku. Każdy ma kabel,
niezależny cel kamery i dostępne sterowanie. Szczegóły: `docs/four-rooms.md`.
Sekwencer wymaga Start i zatrzymuje się po wyjściu, ukryciu lub utracie WebGL.
Każdy nowy pokój ma wyposażenie w stylu pierwszego ASCII: drewniane biurko,
komputer, klawiaturę, mysz, fotel i duży dwuwierszowy napis voxel na ścianie.
Nie zastępuj tego wyposażenia samym podestem eksperymentu.
Kamera każdego nowego pokoju przybliża monitor komputera dokładnie jak ASCII.
Cały projekt, jego kontrolki i podgląd WebGL mieszczą się w fizycznym ekranie.
Nie przywracaj zewnętrznych paneli bocznych ani aktywnych eksperymentów na podestach.
Użytkownik usunął również dekoracyjne modele eksperymentów z pokoi:
bez podestów, mini-serwera, kuli, chmury punktów i sprzętu muzycznego.
Zachowaj działanie tych projektów na monitorach i podstawowe stanowiska komputerowe.
Kable mają zaokrąglony przekrój o średnicy 0,17, końcowe wtyczki,
kolorowe smugi i bloom z głębią. Bez sztywnych kolanek ani złączek wzdłuż
przewodu. Łączą półki racka na +X z tyłem monitorów,
nie panel JP ani podłogę. Dawne sztywne trasy zostały zastąpione symulacją
opisaną w `docs/flexible-cables.md`; nie przywracaj ich.
Pokoje są rozsunięte: galeria [-10,0,-14], cząsteczki [6,0,-14],
materiały [-10,0,13], dźwięk [6,0,14]. Kolory nie powtarzają się:
ASCII cyjan, galeria czerwień, cząsteczki róż, materiały bursztyn, dźwięk fiolet.
Zielony jest zarezerwowany dla transmisji serwera.
ASCII również korzysta z `buildRoom` i tego samego shadera.
`ASCII_ROOM` i `WORLD_ROOMS` w `rooms.js` opisują jego geometrię i sieć;
`ROOMS` nadal oznacza cztery aplikacje obsługiwane przez `lab-ui.js`.
Nie przywracaj większego, jaśniejszego pokoju ani starego kabla z GLB.
Pełny świat rysuje z GLB wyłącznie prefix racka wybrany przez `scene-geometry.js`.
Kamera i HTML ASCII korzystają ze wspólnych współrzędnych `LAB_MONITOR`.
Pokoje można przeciągać po przytrzymaniu 350 ms. `room-layout.js` przechowuje
bieżące pozycje osobno od definicji startowych; krótki klik nadal otwiera monitor.
Nie zapisujemy układu po odświeżeniu. M/strzałki/Enter przesuwają klawiaturą,
Escape anuluje. Kabel ma przypięte A/B, sam się układa, wydłuża i ma kolizje
całych odcinków z wyposażeniem, pokojami i rackiem. Brak kolizji kabel–kabel.

Opisuj stan wynikający z kodu, a nie planowaną wizję produktu. Nie zakładaj,
że istnieją dodatkowe podstrony portfolio, konta użytkowników lub API.

## Technologie i architektura

- HTML i CSS w `index.html`, JavaScript jako natywne moduły ES.
- Własny renderer WebGL2 i shadery GLSL; bez Three.js i innych frameworków.
- Canvas 2D do próbkowania obrazów i eksportu grafiki ASCII.
- Model binarny glTF 2.0 (`.glb`), generowany proceduralnie w Pythonie z NumPy.
- Node.js do testów logiki; Python do generowania i testów geometrii.
- Hosting statyczny Vercel, konfiguracja w `vercel.json`.
- Brak `package.json`, procesu bundlowania, własnego backendu i bazy.
- Kontakt wymaga publicznego identyfikatora formularza Web3Forms; nie hasła skrzynki.
- Obrazy są przetwarzane w przeglądarce, bez przesyłania na serwer.

## Mapa plików

| Plik | Odpowiedzialność |
| --- | --- |
| `index.html` | Struktura strony, style, canvas, dostępny przycisk pokoju i HTML aplikacji na monitorze. |
| `viewer.606ceb00e1e1.js` | Wczytywanie GLB, geometria GPU, shadery, światło i bloom, kamera, obsługa sceny i pętla renderowania. |
| `scene-geometry.js` | Granica racka w GLB; wyklucza stary pokój i kabel z pełnego świata. |
| `rooms.js`, `room-world.js` | Rejestr pokojów, responsywne kamery, granice świata, voxelowe wyspy i kable. |
| `cables.js` | Wspólny styl, odległości wzdłuż przewodu i kolory smug; bez zapisanych tras. |
| `cable-physics.js`, `collisions.js` | Giętki przewód, automatyczna droga i kolizje pełnych odcinków z bryłami sceny. |
| `cable-world.js`, `cable-mesh.js` | Jeden krok świata i zaokrąglona dynamiczna siatka współdzielona przez kolor/bloom. |
| `room-layout.js`, `room-drag.js` | Pozycje sesji, przytrzymanie/przeciąganie, klawiatura i anulowanie. |
| `lab-renderer.js`, `lab-particles.js` | Rzeźba GLSL i deterministyczne cząsteczki; ten sam canvas i kontekst WebGL2. |
| `lab-ui.js`, `lab.css` | Panele, nawigacja, hitboxy, fokus i sterowanie eksperymentami. |
| `projects.js`, `lab-audio.js` | Prawdziwe portfolio i lokalna synteza rytmu. |
| `signals.js` | Wspólny zegar sieci, prędkość 5 jednostek/s, czasy dotarcia i kolor odebranego sygnału. |
| `interaction.js` | Sprężysty ruch pokoju oraz obrys jego klikalnego obszaru. |
| `monitor.js` | Postęp przejścia kamery, ruch krzesła i wymiary powierzchni monitora. |
| `server.js` | Powierzchnia frontu serwera, obrys i wymiary panelu kontaktu. |
| `contact.js`, `contact-config.js` | Formularz, walidacja i publiczna konfiguracja Web3Forms. |
| `ascii.js` | Pliki, schowek, drag & drop, oczyszczanie SVG, konwersja, interfejs i eksporty. |
| `ascii-remix.js` | Normalizacja ustawień, presety i czyste przekształcenia pikseli na znaki i kolory. |
| `build_model.py` | Proceduralny generator geometrii, atrybutów animacji i GLB. |
| `verify_model.py` | Weryfikacja struktury i wybranych zależności geometrii; importuje generator. |
| `room-server.44b95fcd4e41.glb` | Gotowy model używany przez stronę; do podglądu nie trzeba go generować. |
| `scene-description.json` | Metadane sceny zapisane przez generator, nie mechanizm sterowania aplikacją. |
| `tests/` | Testy logiki Node.js, geometrii Python i integracyjne strony HTML. |
| `docs/deployment.md` | Konfiguracja i zasady wdrożeń produkcyjnych. |
| `docs/ascii-reference-analysis.md` | Historia analizy referencji i granice zakresu remiksowania. |
| `vercel.json` | Routing oraz nagłówki bezpieczeństwa i cache. |

Nazwy plików z hashem mogą się zmienić; sprawdzaj aktualne odwołania w kodzie.

## Uruchamianie lokalne

Z katalogu głównego repozytorium:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Otwórz `http://localhost:8000`. Nie używaj `file://`: moduły i pobieranie GLB
wymagają serwera HTTP. Ścieżki zasobów zaczynają się od `/`, więc katalogiem
głównym serwera musi być katalog repozytorium.

Podgląd nie wymaga `npm install`, NumPy ani generowania modelu. Przeglądarka
musi obsługiwać WebGL2. Dostęp do schowka zależy od uprawnień przeglądarki;
interfejs ma również obsługę wklejania przez Ctrl+V.

## Zachowania, których nie należy przypadkowo zmieniać

### Scena i interakcje

- Widok startowy jest izometryczny i pokazuje całą scenę.
- Pokój reaguje na hover, wciśnięcie i puszczenie; rack pozostaje wtedy nieruchomy.
- Serwer ma niezależną sprężynę i światło; jego ruch nie może poruszać pokojem.
- Kabel łączy dolną półkę racka z monitorem, omija ścianę i dopasowuje się do ruchu.
- Serwer wysyła zielony impuls, każdy pokój odpowiada własnym kolorem.
- Wszystkie wiązki mają prędkość 5 jednostek sceny/s; długość kabla określa czas.
- Światła rozbłyskują dopiero po odbiorze i w kolorze odebranej wiązki.
- Przy nakładaniu odbiorów serwer przyjmuje kolor ostatniego dotarcia, bez mieszania.
- Po odbiorze sygnału reagują określone światła, nie cała obudowa racka.
- Nieświecąca geometria zapisuje głębię również w przebiegu bloom:
  ściany i meble mają zasłaniać ukryte neony.
- HTML aplikacji jest dopasowany do ekranu modelu, nie stanowi niezależnego
  pełnoekranowego panelu. Zmiany kamery, geometrii monitora i `monitorFrame`
  trzeba sprawdzać wspólnie.
- Powrót przyciskiem lub Escape odtwarza ruch krzesła i przywraca fokus pokoju.
- Logo `[ JP ]` i jego poświata znikają przy wejściu w monitor i wracają po wyjściu.
- Zachowaj obsługę dotyku, Enter, spacji, widocznego fokusu, `inert` i ARIA.
- Respektuj `prefers-reduced-motion`, pauzę niewidocznej karty i limit 30 FPS.
- Zachowaj czytelny komunikat przy braku lub utracie kontekstu WebGL2.

### Kontakt

- Formularz pokrywa panel [JP] na ścianie +Z serwera; nie kieruj kamery na półki +X ani monitor komputera i nie zastępuj panelu niezależnym modalem.
- Escape i przycisk powrotu przywracają fokus właściwego obiektu sceny.
- Bez `CONTACT_CONFIG.accessKey` nie wolno wykonywać wysyłki ani pokazywać sukcesu.
- Sukces wymaga potwierdzenia HTTP i `success: true` od API, nie samego wywołania fetch.
- Zachowuj szkic po błędzie i zamknięciu; blokuj duplikaty i nie ponawiaj automatycznie.
- Nie wysyłaj prawdziwych maili podczas testów; używaj atrap.
- Nie mieszaj przesyłanych danych kontaktowych z lokalnymi obrazami ASCII.
- Konfiguracja i ograniczenia: `docs/contact.md`.

### Konwerter ASCII

- Obsługiwane w interfejsie: PNG, JPG, SVG, WebP, GIF, BMP i AVIF.
- Limity wejścia: 20 MB i 32 megapiksele; wynik ma najwyżej 240 wierszy.
- Domyślnie wynik ma 120 kolumn, a panel szczegółowości pozwala wybrać 40–240.
- Remiks obejmuje jasność, kontrast, nasycenie, kontury, proporcje pionowe,
  zestaw znaków, inwersję, paletę i tło.
- Presety: Oryginał, Więcej detali, Matrix, Bursztyn i Kontury.
- Zmiany przeliczaj z zachowanego obrazu źródłowego, nie z poprzedniego wyniku.
- Eksport HTML, PNG, JPG i TXT jest zaimplementowany, ale przycisk pobierania
  jest celowo ukryty regułą CSS. Nie pokazuj go bez wyraźnego zlecenia.
- Nie usuwaj oczyszczania SVG, walidacji ustawień ani zabezpieczeń HTML.
- Zachowaj zabezpieczenia przed spóźnionymi wynikami odczytu plików, schowka
  i eksportu. Starsze operacje nie mogą nadpisywać nowszego obrazu.
- Zwalniaj tworzone adresy `blob:`. Nie dodawaj zewnętrznego uploadu bez zgody.

## Testowanie

Testy logiki nie wymagają instalacji pakietów npm:

```powershell
node tests/signals.test.mjs
node tests/signal-network.test.mjs
node tests/cables.test.mjs
node tests/interaction.test.mjs
node tests/monitor.test.mjs
node tests/ascii.test.mjs
node tests/ascii-remix.test.mjs
node tests/server.test.mjs
node tests/contact.test.mjs
node tests/rooms.test.mjs
node tests/particles.test.mjs
node tests/audio.test.mjs
```

Testy geometrii wymagają NumPy z `requirements.txt`:

```powershell
python -m pip install -r requirements.txt
python tests/test_cable.py
```

Instaluj zależności tylko wtedy, gdy są potrzebne. Test kabla generuje model
w katalogu tymczasowym, bez nadpisywania modelu produkcyjnego.

Przy uruchomionym serwerze strony testowe są dostępne pod:

- `/tests/lighting.html` — zasłanianie neonów i bloom.
- `/tests/animation.html` — impulsy i reakcje świateł rzeczywistej sceny.
- `/tests/cables.html` — 36 kontroli pikseli pięciu kabli, wtyczek i koloru odbioru.
- `/tests/interaction-flash.html` — wygaszenie błysku po kliknięciu.
- `/tests/monitor.html` — przejście, aktywny HTML i powrót.
- `/tests/monitor-logo.html` — ukrywanie logo monitora.
- `/tests/chair.html` — maska, ruch i dokładny powrót krzesła.
- `/tests/ascii.html` — pliki, schowek, remiks, eksporty i błędy.
- `/tests/server.html` — serwer, kontakt, powrót i niezależność pokoju.
- `/tests/contact.html` — stany formularza i bezpieczne atrapy wysyłki.

Wyniki stron są udostępniane w `window.testResults`. Testy Node.js i samo
HTTP 200 nie dowodzą poprawnego renderowania: zmiany wizualne sprawdzaj
w przeglądarce, także na wąskim ekranie i z ograniczeniem ruchu.
Nie deklaruj testów przeglądarkowych jako wykonanych bez ich uruchomienia.

`tests/four-rooms.cjs` używa Playwright do sprawdzenia kamer, pikseli WebGL,
rzeczywistego sygnału Web Audio, mobile, klawiatury i sprzątania zasobów.
Instrukcja zależności zewnętrznych i dowody: `docs/four-rooms.md`.

## Generowanie modelu i wersjonowanie zasobów

**Uwaga: `build_model.py` zapisuje pliki także podczas importu.**
`verify_model.py` importuje go i przez to również uruchamia generowanie.
Oba skrypty mogą nadpisać `room-server.glb` i `scene-description.json`.
Nie używaj ich jako bezskutkowej inspekcji ani przy zwykłych zmianach dokumentacji.

Przy celowej zmianie geometrii:

1. Zmień generator i uruchom testy geometrii.
2. Wygeneruj model: `python build_model.py`.
3. Zweryfikuj go: `python verify_model.py`.
4. Nadaj GLB nazwę `room-server.<pierwsze 12 znaków SHA-1 zawartości>.glb`.
5. Zaktualizuj odwołanie w rendererze i ścieżkę w `vercel.json`;
   uaktualnij dokumentację i inne odwołania do starej nazwy.
6. Jeśli zmieniasz renderer, nadaj mu nowy hash zawartości w nazwie
   i zaktualizuj `index.html` oraz pozostałe odwołania.
7. Sprawdź scenę i odpowiednie testy przeglądarkowe z nowymi zasobami.

Zachowaj własne atrybuty GLB: `_SIGNAL`, `_RACK`, `_ROOM`, `_BUTTON`, `_CHAIR`.
Generator i renderer muszą interpretować je zgodnie. Renderer jest dostosowany
do konkretnego układu tego modelu, nie jest ogólnym silnikiem glTF.

Nie zmieniaj zawartości pod istniejącą nazwą GLB z rocznym cache `immutable`.
Nie usuwaj nieznanych plików ani zmian użytkownika podczas porządkowania zasobów.

## Graf kodu — Graphify

- Lokalny graf znajduje się w `graphify-out/`; instrukcja: `docs/graphify.md`.
- Przy pytaniach o strukturę zacznij od ukierunkowanego
  `graphify query "nazwy symboli lub modułów"`, potem potwierdź szczegóły w kodzie.
- Graf jest typu `--code-only`: nie zastępuje lektury HTML, dokumentacji,
  inspekcji modelu GLB ani testowania przeglądarkowego.
- Sprawdzaj aktualność grafu po zmianach źródeł. Katalog wynikowy jest ignorowany
  przez Git i nie należy do plików aplikacji.

## Wdrożenia i zasady pracy

### Skille do implementacji czterech nowych pokoi

Na polecenie użytkownika korzystaj z globalnie zainstalowanych skilli:

- `writing-plans` — plan realizacji zatwierdzonego projektu pokoi.
- `frontend-design` — wygląd i dostępne panele sterowania, spójne ze sceną voxel.
- `shader-dev` — natywne WebGL2/GLSL, materiały i efekty cząsteczkowe.
- `playwright-best-practices` — testy kamer, canvas/WebGL, mobile i regresji.
- `verification-before-completion` — aktualne dowody działania przed ogłoszeniem ukończenia.

Ładuj odpowiedni skill w momencie jego użycia. Nie zmieniaj stosu na React
lub Three.js tylko po to, żeby zastosować przykład ze skilla.

### Zasady ogólne

- Według `docs/deployment.md` produkcję obsługuje natywna integracja GitHub–Vercel,
  a push na `main` uruchamia wdrożenie produkcyjne.
- Produkcja: `https://jakub-polczynski-portfolio.vercel.app`.
- Nie wykonuj push ani wdrożeń bez polecenia użytkownika.
- Nie dodawaj tokenów do repo ani osobnego GitHub Actions do zwykłych wdrożeń.
- Nie wprowadzaj frameworka, bundlera czy backendu do zadania, które tego nie wymaga.
- Zachowuj lokalny styl kodu, rozdział logiki od DOM i deterministyczne funkcje.
- Aktualizuj powiązane testy oraz dokumentację przy zmianie zachowania.
- Przed pracą sprawdzaj `git status`; nie nadpisuj cudzych zmian.
- Komunikuj po polsku, podawaj wykonane testy i ograniczenia weryfikacji.
- Pytaj o decyzje produktowe nieobecne w kodzie, zamiast dopisywać je jako wymagania.

## Nazwa tej instrukcji

Plik ma nazwę `Agent.md` zgodnie ze zleceniem. Narzędzia automatycznie
odkrywające instrukcje często oczekują `AGENTS.md`; nie zakładaj, że odczytają
ten plik bez wskazania. Przy zmianie konwencji nazewniczej utrzymuj jedno
źródło instrukcji zamiast dwóch rozbieżnych kopii.
