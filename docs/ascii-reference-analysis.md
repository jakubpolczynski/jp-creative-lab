# Analiza referencyjnego konwertera

Źródło: https://asciigenerators.com/image-to-ascii/

## Obserwacje DOM (rzeczywista strona w Edge/CDP)

Panel udostępnia szerokość 16–300 znaków, jasność −100…100, kontrast 0.30…2.50, rozciągnięcie X/Y, siłę konturów, zestaw znaków, inwersję i kolor. Style obejmują Classic, Matrix, Retro amber, Braille HC i Detailed color. Są również narzędzia Braille, progu/ditheringu oraz eksportów PNG/SVG/ANSI/TXT. Odczytano kontrolki i publiczny skrypt; nie przeprowadzano pełnego testu konwersji na referencji.

## REA — analiza statyczna publicznego artefaktu

MCP nie udostępniał narzędzi REA. Użyto oficjalnej ścieżki CLI `rea-agents@6.7.0` z izolowanej pamięci npm; domyślny cache miał brakującą zależność `sourcemap-codec.mjs`.

Analizowany skrypt: `https://asciigenerators.com/_astro/Generator.astro_astro_type_script_index_0_lang.DiSOofvv.js`.
REA Evidence: `ev_48db166871eb54959cfaba91c2e9c2a1cc97f05aa4e962dd06644a84313798d2`.
SHA-256 katalogu wejściowego: `17394e4c7a3c5e82e5be1502e05ae23de89790c69c8062694679c1b76c0960e8`.
Lokalny zapis: `C:/Users/jakub/AppData/Local/hermes/cache/scratch/ascii-reference-evidence.json`.

REA sparsował JS jako nieaktywny tekst i zbudował graf aplikacji (19 węzłów). Pokrycie relacji jest niepełne; trzy skrypty inline w HTML nie były analizowane. Analiza statyczna nie dowodzi wykonania ani kompletności funkcji. Niezależny odczyt odzyskanego publicznego JS potwierdził deklaracje presetów, parametry jasności/kontrastu i próbkowanie Canvas/getImageData; to odczyt źródła, nie ślad runtime REA.

## Zakres własnej implementacji

Nie kopiujemy kodu, brandingu ani całego interfejsu. Do istniejącego monitora dodajemy przycisk „Remixuj” otwierający opcjonalną edycję: szczegółowość, jasność, kontrast, nasycenie, kontury, pionowe proporcje, paleta, znaki, inwersja, tło i presety. Reset wraca do niezmienionego obrazu. Oryginalne źródło jest zachowane do ponownego próbkowania; zmiany nie kumulują strat. Istniejący przycisk pobierania pozostaje niewidoczny zgodnie z poprzednim komentarzem użytkownika. Braille, linki URL i nowe formaty eksportu nie są częścią tej zmiany.
