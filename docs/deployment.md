# Wdrożenia produkcyjne

- Repozytorium: `jakubpolczynski/jp-creative-lab`.
- Projekt Vercel: `ksiangryys-projects/jakub-polczynski-portfolio`.
- Produkcja: https://jakub-polczynski-portfolio.vercel.app
- Gałąź produkcyjna: `main`.

Projekt Vercel jest połączony bezpośrednio z GitHubem. Każdy nowy push na `main` uruchamia wdrożenie produkcyjne; po udanym buildzie Vercel automatycznie przypisuje domenę produkcyjną. Pozostałe gałęzie służą do podglądów.

To statyczna aplikacja HTML/JS/WebGL: Framework Preset `Other`, katalog główny repozytorium, bez własnego polecenia budowania. Gotowy model GLB znajduje się w repo — nie trzeba uruchamiać generatora Python podczas wdrożenia. Nagłówki i cache definiuje `vercel.json`.

Status i logi: https://vercel.com/ksiangryys-projects/jakub-polczynski-portfolio/deployments

Nie należy zapisywać tokenów Vercela w repo ani dodawać osobnego workflow GitHub Actions do zwykłych wdrożeń. Natywna integracja Git obsługuje push i przypisanie produkcyjnej domeny.
