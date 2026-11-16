# Lokalny graf projektu — Graphify

## Instalacja

Oficjalny pakiet: `graphifyy` (CLI: `graphify`), wersja użyta przy konfiguracji:
`0.9.111`. Na tym komputerze działa w osobnym środowisku Python:

```text
C:\Users\Kuba\AppData\Local\Programs\Graphify
```

Katalog `Scripts` dodano do ścieżki PATH użytkownika. Nowe terminale mogą używać
samego `graphify`. W istniejącym procesie, który nie odświeżył PATH, użyj:

```powershell
& "$env:LOCALAPPDATA\Programs\Graphify\Scripts\graphify.exe" --version
```

Integrację z OpenCode zainstalowano poleceniem
`graphify install --platform opencode`. Skill i plugin znajdują się w
`~/.config/opencode/skills/graphify/` i `~/.config/opencode/plugins/graphify.js`.
Nie jest to połączenie z Graphify Cloud ani serwer MCP.

## Zakres

Graf powstał przez lokalne parsowanie AST (`--code-only`), bez kluczy API
i bez dodatkowych wywołań modelu. Obejmuje obsługiwane pliki JavaScript,
testy `.mjs`, Python oraz obsługiwaną konfigurację JSON.

Nie obejmuje semantycznej analizy Markdown, HTML ani SVG. GLB jest binarnym
zasobem sceny, nie źródłem kodu. Graf nie dowodzi, że rendering, interfejs,
dynamiczne importy lub wszystkie zależności runtime działają poprawnie.
`EXTRACTED` oznacza relację odczytaną ze źródła; `INFERRED` oznacza wnioskowanie
narzędzia, nie potwierdzenie działania w przeglądarce.

Diagnostyka może wskazywać relacje z brakującymi węzłami w surowej ekstrakcji
oraz scalone warianty relacji między tymi samymi węzłami. Graf jest użyteczny
jako mapa, ale nie jest kompletnym grafem wywołań. Wyniki dla ostatnio
sprawdzonej ekstrakcji są w lokalnym `graphify-out/GRAPH_HEALTH.md`.

## Podgląd i zapytania

Wyniki są lokalne, w ignorowanym przez Git katalogu `graphify-out/`:

- `graph.html` — interaktywny graf.
- `graph.json` — węzły i relacje.
- `GRAPH_REPORT.md` — grupy, najważniejsze węzły i ograniczenia.

Przy serwerze projektu na porcie 8000:
`http://localhost:8000/graphify-out/graph.html`.

Uruchamiaj zapytania z katalogu głównego projektu:

```powershell
graphify query "render monitor chairPose"
graphify explain "remixPixels"
graphify path "launch" "chairPose"
```

Używaj nazw symboli i plików — dopasowywanie pytań nie jest semantycznym
wyszukiwaniem LLM. `.graphifyrc` ustawia budżet odpowiedzi na 2500 tokenów
i głębokość przejścia grafu na 3.

## Odświeżanie

Lokalna analiza bez backendu modelowego:

```powershell
$env:GRAPHIFY_BACKEND = 'none'
graphify extract . --code-only --max-workers 2
graphify cluster-only . --no-label
graphify export html
```

Ponowna ekstrakcja korzysta z pamięci podręcznej. W tej konfiguracji nazwy grup
mogą po ponownym klastrowaniu zostać zastąpione etykietami automatycznymi;
numer grupy nie jest stabilnym identyfikatorem modułu.

Nie instalowano hooków Git ani automatycznego obserwowania plików. Przed
odpowiedzią opartą na grafie uwzględnij zmiany kodu od jego ostatniego zbudowania.
Nie dodawaj wygenerowanych wyników do produkcji ani do repo bez świadomej decyzji.
