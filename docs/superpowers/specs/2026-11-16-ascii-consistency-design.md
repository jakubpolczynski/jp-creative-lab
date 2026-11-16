# ASCII zgodny z pozostałymi pokojami

Użytkownik wybrał poprawienie ASCII i jego kabla zamiast zmiany czterech nowych
pokoi. ASCII zachowuje cyjan, napis ASCI / ART, konwerter i dotychczasowe wejścia.
Bryła 6,4 × 5,4, płytki, ściany, biurko, komputer, fotel i oświetlenie pochodzą
z tego samego `buildRoom` i shadera co pozostałe pokoje. Centrum pozostaje
[4.985,0,.04]; nie zmieniamy odstępów innych wysp ani racka.

Rozważono ręczne zmniejszenie starego GLB (pozostawiłoby dwie implementacje
wyglądu) i użycie wspólnego generatora (wybrane: identyczne wyposażenie i światło).
GLB pozostaje bez zmian, ale wspólny świat rysuje z niego tylko rack.
ASCII dostaje nowy kabel z najniższej półki, omijający koniec lewej ściany
i dochodzący do tyłu nowego monitora. Ten sam przekrój, wtyczki, shader,
prędkość 5 jednostek/s i przyczynowy kolor odbioru co pozostałe połączenia.

Kamera, HTML, hitbox, krzesło i ukrycie logo muszą pasować do nowej geometrii,
także na telefonie. Kontakt, konwersja obrazów i pozostałe aplikacje bez zmian.
Bez nowych zależności, commitów, push ani wdrożenia.
