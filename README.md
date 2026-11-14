# JP Creative Lab — izometryczny pokój 3D (v1.1.1)

Prototyp z prawdziwą geometrią 3D (GLB): rack serwerowy, przewody do ściany, biurko, klawiatura, mysz i fotel. Kamera nie jest interaktywna.

## Aktualizacja pamięci podręcznej

Poprzednia wersja używała niezmiennego adresu `room-server.glb`, z rocznym cache i `force-cache`. To mogło powodować wyświetlanie starego modelu po kolejnych wdrożeniach.

W tym wydaniu model ma nazwę opartą na SHA-1: `room-server.f22674c93f15.glb`. Kod renderera to `viewer.8286579392e8.js`. Strona główna wymaga rewalidacji. Przy każdej przyszłej zmianie GLB **wygeneruj nową nazwę na podstawie jego zawartości**.

## Pliki produkcyjne

- `index.html` — pojedynczy ekran.
- `viewer.8286579392e8.js` — własny WebGL2 renderer.
- `room-server.f22674c93f15.glb` — prawdziwy mesh GLB, 433,896 B.
- `favicon.svg` i `vercel.json`.

## Uruchomienie lokalne

`python -m http.server 8000` i otwórz `http://localhost:8000`. WebGL2 potrzebuje wspieranej przeglądarki i grafiki.

## Modyfikacja modelu

`pip install -r requirements.txt && python build_model.py`, następnie sprawdź `python verify_model.py`, nadaj wygenerowanemu GLB nową nazwę hash i zaktualizuj URL w skrypcie.
