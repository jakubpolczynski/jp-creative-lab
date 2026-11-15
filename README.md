# JP Creative Lab — izometryczny pokój 3D (v1.2)

Prototyp GLB: granatowo-fioletowy rack z zielonymi akcentami świetlnymi, kabel z dolnej półki do monitora, biurko, klawiatura, mysz i fotel. Kamera startuje w nieruchomym widoku izometrycznym; kliknięcie pokoju przybliża ekran monitora i ustawia go na wprost. Co 10 sekund zielony impuls biegnie do komputera, niebieski wraca i wyzwala krótki niebieski blink wyłącznie akcentów świetlnych; kolor obudowy pozostaje bez zmian. Kryształ ma świecącą powierzchnię, która również miga na niebiesko. Po dotarciu zielonego impulsu do komputera lampa nad biurkiem, napis i narożniki na monitorze, neon `ASCI ART` na tylnej ścianie oraz LED przy podłodze na krótko zmieniają kolor z cyjanu na zielony. Kabel omija zakończenie ściany zamiast przez nią prześwitywać. Animacja respektuje ograniczenie ruchu, zatrzymuje się w niewidocznej karcie i działa maksymalnie w 30 klatkach/s.

## Aktualizacja pamięci podręcznej

Poprzednia wersja używała niezmiennego adresu `room-server.glb`, z rocznym cache i `force-cache`. To mogło powodować wyświetlanie starego modelu po kolejnych wdrożeniach.

W tym wydaniu model ma nazwę opartą na SHA-1: `room-server.44b95fcd4e41.glb`. Kod renderera to `viewer.3f202608f649.js`. Strona główna wymaga rewalidacji. Przy każdej przyszłej zmianie GLB **wygeneruj nową nazwę na podstawie jego zawartości**.

## Pliki produkcyjne

- `index.html` — pojedynczy ekran.
- `viewer.3f202608f649.js` — własny WebGL2 renderer z animacją.
- `signals.js` — deterministyczny harmonogram impulsów i blinka.
- `room-server.44b95fcd4e41.glb` — mesh GLB, 824316 B, z dystansem kabla `_SIGNAL`, maską akcentów racka `_RACK`, odbiornika `_ROOM` i ruchu pokoju `_BUTTON` oraz krzesła `_CHAIR`.
- `favicon.svg` i `vercel.json`.

## Uruchomienie lokalne

`python -m http.server 8000` i otwórz `http://localhost:8000`. WebGL2 potrzebuje wspieranej przeglądarki i grafiki.

## Test oświetlenia

Otwórz `http://localhost:8000/tests/lighting.html` po uruchomieniu serwera. Test używa produkcyjnego renderera i małych scen GLB: porównuje piksele dla neonu zasłoniętego ścianą, sprawdza widoczność odsłoniętego źródła oraz zachowanie jego poświaty. Wynik jest widoczny na stronie i w `window.testResults`.

Bufor poświaty zawiera także nieświecącą geometrię z zapisem głębi, dzięki czemu ściany i obudowa racka zasłaniają ukryte neony. Po zmianie kodu renderera zaktualizuj również hash w jego nazwie i odwołanie w `index.html`.

## Test transmisji

- `python tests/test_cable.py` — dolna półka, ciągłość trasy do monitora i atrybuty modelu (NumPy).
- `node tests/signals.test.mjs` — kierunki, czas odbioru, blink, cykl i ograniczenie ruchu.
- `http://localhost:8000/tests/animation.html` — test pikselowy rzeczywistej sceny: oba impulsy, ruch, blink i powrót do zieleni; wynik także w `window.testResults`.

## Pokój jako przycisk

Najazd unosi pokój i rozjaśnia jego neony. Przytrzymanie wciska go i lekko zmniejsza; puszczenie daje sprężyste odbicie. Rack pozostaje nieruchomy, a kabel płynnie dopasowuje się do ruchu pokoju. Kliknięcie emituje zdarzenie `roomactivate` i płynnie przenosi kamerę do monitora, bez przeładowania strony. Przycisk obsługuje dotyk, Enter i spację, ma widoczny fokus klawiatury. Przy ograniczeniu ruchu zostaje odpowiedź światłem bez unoszenia.

- `interaction.js` — sprężyna i obrys obszaru przycisku.
- `node tests/interaction.test.mjs` — hover, wciśnięcie, odbicie i ograniczenie ruchu.

## Aplikacja wewnątrz monitora

Po kliknięciu pokoju krzesło płynnie obraca się w lewo i jednocześnie odjeżdża w prawo, odsłaniając monitor, a kamera zbliża się do ekranu. Po powrocie krzesło odtwarza ruch wstecz i wraca dokładnie na miejsce. Interaktywna powierzchnia HTML `#monitor-content` jest dopasowana do ekranu 3D (nie jest osobnym pełnoekranowym oknem). Działa tu konwerter obrazu na ASCII: przeciągnij obraz, wybierz plik lub wklej zrzut przez Ctrl + V / „Wklej ze schowka”; wynik pojawia się automatycznie, a znaki zachowują kolory obrazu. Wybór formatu umożliwia pobranie `.html`, `.png`, `.jpg` (kolorowe znaki) lub `.txt` (sam tekst bez kolorów). Podgląd wypełnia szerokość ekranu; dłuższe obrazy przewija się wewnątrz monitora zamiast zmniejszać do miniatury. Konwersja odbywa się lokalnie w przeglądarce, bez wysyłania obrazu. Obsługiwane są PNG, JPG, SVG, WebP, GIF, BMP i AVIF (do 20 MB; do 32 megapikseli). SVG jest oczyszczany z aktywnej zawartości i odwołań zewnętrznych. Podczas przybliżenia znak `[ JP ]` i jego narożniki znikają z ekranu wraz z poświatą; wracają dopiero w widoku całego pokoju. Przycisk „Wróć do pokoju” znajduje się na ekranie monitora; Escape także cofa kamerę. Fokus wraca do przycisku pokoju. Widok dopasowuje się do rozmiaru okna i ograniczenia ruchu.

- `ascii.js` — lokalne wczytywanie obrazów i schowka, rasteryzacja SVG, kolorowe znaki ASCII i samodzielny eksport HTML.
- `ascii-remix.js` — lokalny silnik edycji: jasność, kontrast, nasycenie, kontury, palety i zestaw znaków.
- `node tests/ascii-remix.test.mjs` — deterministyczne testy ustawień, bezpieczeństwa znaków i resetu.
- `docs/ascii-reference-analysis.md` — źródła obserwacji i identyfikator analizy REA strony referencyjnej.
- Po konwersji przycisk **Remixuj** otwiera opcjonalne ustawienia na żywo. Szczegółowość i pionowe proporcje są przeliczane z zachowanego obrazu źródłowego; pozostałe suwaki zmieniają znaki i kolory. Presety: Oryginał, Więcej detali, Matrix, Bursztyn, Kontury. Resetuj przywraca oryginał. Przycisk pobierania pozostaje niewidoczny na życzenie użytkownika; generator plików uwzględnia bieżący remiks.
- `node tests/ascii.test.mjs` — jasność, przezroczystość i proporcje wyniku.
- `http://localhost:8000/tests/ascii.html` — wybór PNG/JPG, przeciąganie SVG, podgląd, treść pobrania, błędy plików i powrót do monitora.
- `http://localhost:8000/tests/chair.html` — maska krzesła, zmiana pikseli przy tej samej kamerze oraz dokładny powrót pozycji.
- `monitor.js` — czas przejścia, choreografia krzesła i proporcje ekranu.
- `node tests/monitor.test.mjs` — przejście, proporcje, desktop/telefon.
- `http://localhost:8000/tests/monitor.html` — przejście, aktywny HTML, przycisk powrotu i Escape.

## Regenerowanie

`pip install -r requirements.txt && python build_model.py`, następnie sprawdź `python verify_model.py`, nadaj wygenerowanemu GLB nową nazwę hash i zaktualizuj URL w skrypcie.
