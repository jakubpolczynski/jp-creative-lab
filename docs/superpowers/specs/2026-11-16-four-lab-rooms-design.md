# JP Creative Lab — cztery nowe pokoje we wspólnym świecie

Status: projekt do zatwierdzenia, nie zgoda na wdrożenie produkcyjne.
Data: 2026-11-16.
Przegląd: niezależny recenzent nie wskazał istotnych pytań blokujących planowanie.

## 1. Intencja i uzgodnienia

Strona ma być osobistym portfolio i creative labem: efekt „wow” wynika
z rzeczywiście działających eksperymentów, a nie wyłącznie animacji dekoracyjnych.

Użytkownik ustalił:

- Każda nowa funkcja to nowy pokój połączony kablem z serwerem.
- Realizujemy wszystkie cztery koncepcje: galerię projektów, cząsteczki,
  studio materiałów i pokój dźwięku.
- Wszystkie pokoje pozostają w jednym interaktywnym świecie 3D.
- Nie ma obecnie dodatkowych projektów do portfolio. Pierwszym i jedynym
  case study będzie istniejący JP Creative Lab; nie tworzymy fikcyjnych realizacji.
- Dotychczasowy pokój ASCII i kontakt na panelu [JP] serwera pozostają.

Makieta porównawcza jest inspiracją do wyglądu i funkcji, nie nową stroną główną.
Nie przenosimy jej nagłówka marketingowego i siatki czterech kart do produkcji.
Docelowym wejściem nadal jest pełnoekranowa scena voxel.

## 2. Cele, granice i warunki powodzenia

### Cele

1. Pięć pokoi i serwer: istniejący ASCII plus cztery nowe, odrębne wyspy.
2. Każdy nowy pokój ma własny wygląd, kolor, wyposażenie, kabel i cel kamery.
3. Użytkownik wchodzi kliknięciem lub klawiaturą, używa eksperymentu
   i wraca do świata bez przeładowania strony.
4. Eksperymenty cząsteczek i materiałów są prawdziwym WebGL2 w scenie 3D;
   miniatury Canvas 2D/CSS z makiety nie zastępują ich implementacji.
5. Dźwięk jest generowany lokalnie i uruchamiany świadomym kliknięciem.
6. Rozbudowa nie psuje konwersji ASCII, kontaktu, obsługi fokusu i ograniczenia ruchu.

### Poza zakresem

- Konta użytkowników, baza, CMS, backend, płatne API i generowanie przez AI.
- Mikrofon, kamera, nagrywanie, import audio i upload plików poza istniejącym ASCII.
- Publikacja na Vercel, push i rzeczywiste testowe maile.
- Dodawanie niepotwierdzonych projektów, klientów, wyników i technologii do portfolio.
- Dowolny obrót świata, FPS/free-roam i edytor rozmieszczania pomieszczeń.
- Pełny silnik fizyczny, ray tracing i fizycznie poprawne odbicia otoczenia.
- Zapisywanie ustawień labów po odświeżeniu strony i eksport nowych eksperymentów.

### Antycele

- Cztery dekoracyjne pokoje otwierające te same atrapowe panele.
- Automatyczny dźwięk, proszenie o uprawnienia do urządzeń lub odtwarzanie po wyjściu.
- Jednoczesne uruchamianie wszystkich symulacji w tle.
- Zastąpienie istniejącego stylu osobnym dashboardem, stronami lub frameworkiem.
- Usuwanie testów lub osłabianie ich tylko po to, żeby ukryć regresje.

## 3. Approaches

### Wybrany: jeden świat, eksperymenty wewnątrz pokoi

Użytkownik wybrał wspólną scenę, fizyczne połączenia z serwerem i wejścia kamerą.
Zachowujemy natywne moduły JavaScript i obecny renderer WebGL2. HTML zapewnia
dostępne elementy sterujące; nie zastępuje obiektów eksperymentu 3D.

Zaleta: najbardziej spójne doświadczenie i najlepsza realizacja efektu „wow”.
Koszt: potrzebne uogólnienie nawigacji, celów kamery, hitboxów i cyklu życia efektów.

### Niewybrany: pokoje jako wejścia do osobnych widoków

Osobne strony lub pełnoekranowe narzędzia uprościłyby izolację funkcji,
ale rozbijałyby wrażenie odkrywania jednego świata. Ten wariant odrzucono.

### Decyzja techniczna autora projektu, nie osobne wymaganie użytkownika

Nie migrujemy do Three.js ani innego silnika. Nową statyczną geometrię voxel
budujemy raz w JavaScript i przesyłamy do tych samych buforów WebGL2 co resztę
sceny. Unikamy regeneracji istniejącego GLB oraz importowania `build_model.py`,
który przy imporcie zapisuje pliki.

Geometria nowych pomieszczeń ma wspólny moduł budowniczy prostopadłościanów
i wspólny adapter GPU, nie cztery niezależne renderery lub konteksty WebGL.
Implementator może dopasować wewnętrzny format tablic i podział modułów,
zachowując ten kontrakt.

## 4. Wygląd, układ i wejścia

- Serwer jest centralnym węzłem funkcjonalnym z pięcioma połączeniami:
  ASCII oraz cztery nowe pokoje.
- Istniejący model, położenie ASCII, panel [JP] i współrzędne monitora
  pozostają niezmienione. Dobudowujemy nowe obiekty, nie przesuwamy starego modelu.
- Nowe wyspy mają podobną skalę do obecnego pokoju, otwarte ściany umożliwiające
  podgląd wnętrza, voxelowe podstawy i neony.
- Kolory: galeria — cyjan; cząsteczki — róż/fiolet; materiały — bursztyn;
  dźwięk — zieleń. Kolor uzupełnia nazwę, nie jest jedynym sposobem identyfikacji.
- Pozycje nowych wysp i drogi kabli ustala implementator w jednym rejestrze.
  Muszą być rozdzielone w przestrzeni, czytelne w projekcji izometrycznej
  i nie mogą zasłaniać serwera ani zajmować tego samego klikalnego obszaru.
- Kable prowadzą od racka do konkretnego odbiornika w danym pokoju, nie przez ściany.
  Podczas hover porusza się tylko właściwy pokój, a kabel dopasowuje swój koniec.
- Nowy impuls po wejściu w pokój podkreśla właściwe połączenie. W widoku ogólnym
  dopuszczalny jest powolny, deterministyczny cykl z różnymi fazami dla kabli.
  Istniejący harmonogram zielonego i niebieskiego impulsu ASCII pozostaje.
- Hover, wciśnięcie, sprężyste odbicie i obrys fokusu zachowują język interakcji
  istniejącego pokoju. Serwer nie jest przy tym poruszany razem z pokojami.

Pełny kadr obliczamy z granic całego świata, nie z samego dotychczasowego GLB.
Na telefonie nie zakładamy, że miniaturowa wyspa jest jedyną drogą nawigacji:
w widoku ogólnym dostępny jest mały, przewijany pasek nazw wszystkich pokoi
i kontaktu z przyciskami o celu dotykowym co najmniej 44 px.
To propozycja autora projektu służąca dostępności i czytelności małego ekranu.
Pasek nie zasłania aktywnego formularza ani narzędzia; po wejściu zastępuje go
sterowanie wybranego pokoju i dostępny powrót.

## 5. Wspólna nawigacja i stan

Rejestr modułów opisuje id, nazwę, kolor, geometrię, obrys, cel i kierunek kamery,
zakres widoczności, kabel, punkt wejścia UI i cykl życia eksperymentu.
Stałe nie mogą być kopiowane do wielu niezależnych obsług kliknięć.

Jedna maszyna stanu obsługuje:

`overview → entering(target) → active(target) → leaving(target) → overview`.

- Cel jest jawnie identyfikowany, a nie wywnioskowany z samego postępu przybliżenia.
- Przejście ma ten sam charakter co obecne, około 1,25 s.
- Escape odwraca również niedokończone wejście.
- Przyciski pokoi są wyłączone podczas przejścia i wewnątrz aktywnego pokoju.
  W pierwszej wersji przejście do innego pokoju prowadzi przez widok ogólny.
- Po wejściu fokus trafia do przycisku powrotu. Po wyjściu wraca do obiektu
  lub przycisku nawigacji, który wywołał wejście.
- Ukryte panele mają `inert`, właściwe ARIA i nie przechwytują klawiatury.
- Ograniczenie ruchu pomija przejazdy i sprężynę, pozostawia czytelne światło
  i zmianę widoku.
- Ustawienia labów zachowujemy podczas przechodzenia między pokojami w tej samej
  karcie; odświeżenie je resetuje. Dźwięk jest wyjątkiem: zawsze wymaga ponownego Start.
- Cel kontaktu pozostaje na ścianie +Z z napisem [JP], nie na półkach +X.
  Cel ASCII pozostaje dokładnie na ekranie monitora komputera.

## 6. Pokój 1 — Galeria projektów / Project Vault

### Wygląd i wejście

Sala z ekranami i podestem prezentacyjnym, cyjanowe światło.
Kamera pokazuje wybrane stanowisko galerii. Co najmniej jeden fizyczny ekran
jest prawdziwym przyciskiem wyboru dostępnego projektu, nie atrapą zawartości.

### Treść

Na start jeden case study: JP Creative Lab. Tytuł, opis, technologie i odnośniki
pochodzą z lokalnego pliku danych, aby kolejne projekty nie wymagały zmiany renderera.
Case obejmuje obecny świat voxel, konwerter ASCII oraz cztery ukończone eksperymenty,
ale eksperymenty nie są przedstawiane jako cztery osobne realizacje dla klientów.

Podstawowe sekcje: pomysł, co działa, sposób realizacji oraz link do repozytorium.
Link do repo: `https://github.com/jakubpolczynski/jp-creative-lab`.
Nie promujemy starego wdrożenia produkcyjnego jako aktualnej wersji nowej rozbudowy
przed jej publikacją. Podgląd eksperymentów działa przez lokalną nawigację świata.

### Zachowanie

- Wybór projektu podświetla ekran i pokazuje krótkie case study.
- Panel opisu jest semantycznym HTML związanym ze stanowiskiem; mieści się
  na małym ekranie i przewija się bez wyjeżdżania poza aktywny pokój.
- Jednoprojektowa galeria wygląda celowo: nie pokazujemy niedziałających kafli
  „projekt 2”, pustych ekranów udających realizacje ani zmyślonych metryk.
- Odnośniki zewnętrzne są jawnie oznaczone i otwierane bez dostępu do `window.opener`.
- Ewentualne obrazy to własne zrzuty tej aplikacji, nie przypadkowe realizacje z sieci.

## 7. Pokój 2 — Laboratorium cząsteczek / Matter Lab

### Wygląd

Podest i chmura punktów 3D z różowo-fioletowym światłem. Punkty są rysowane
w scenie przez WebGL2 i respektują głębię, nie są CSS-ową dekoracją nad pokojem.

### Funkcje

- Trzy tryby: Orbita, JP i Fala.
- Orbita: trójwymiarowa chmura poruszająca się po proceduralnych torach.
- JP: punkty układają się w czytelny znak JP; zmiana trybu interpoluje pozycje.
- Fala: układ przestrzenny z kontrolowaną sinusoidalną deformacją.
- Ruch kursora lokalnie odpycha punkty; na dotyku działa dotknięcie lub przeciągnięcie
  wewnątrz obszaru eksperymentu, bez blokowania przewijania panelu sterowania.
- Dostępny suwak siły i przycisk Reset; korzystanie z kursora nie jest wymagane
  do zobaczenia i zmiany efektu.

Nie obiecujemy kolizji między wszystkimi punktami ani pełnego silnika fizyki.
Jest to lokalna, proceduralna symulacja ruchu i oddziaływania kursora.
Budżet początkowy: do 2000 punktów desktop, do 750 na wąskim ekranie.
Przy ograniczeniu ruchu pokazujemy statyczny wynik wybranego trybu;
kontrolki nadal działają bez ciągłego falowania i krążenia.

## 8. Pokój 3 — Studio materiałów / Shader Studio

### Wygląd

Rzeźba na podeście i bursztynowe stanowisko sterowania. Obiekt pozostaje
rzeczywistą geometrią 3D w pokoju, a nie obrazem z gradientem CSS.

### Funkcje

- Trzy materiały: Chrom, Hologram i Siatka.
- Chrom: proceduralne odbicie i jasne refleksy; bez obietnicy śledzenia promieni.
- Hologram: kolor zależny od kierunku patrzenia, linie skanowania i kontrolowana emisja.
- Siatka: widoczne krawędzie tej samej rzeźby, nie podmiana jej na ikonę.
- Suwaki koloru światła i deformacji oraz Reset.
- Zmiana materiału działa natychmiast i wpływa na światło akcentowe tego pokoju.
  Nie przebarwia innych wysp ani obudowy serwera.
- Z ograniczeniem ruchu deformacja zmienia kształt statycznie; znika ciągłe
  falowanie, obrót i skanowanie.

Materiały muszą być realizowane w GLSL/warstwie geometrii, bez pobierania
zewnętrznych map HDR i tekstur.

## 9. Pokój 4 — Pokój dźwięku / Signal Room

### Wygląd

Voxelowy panel muzyczny i pionowe elementy przestrzennego wizualizatora.
Zielone światło, podświetlenie aktywnego kroku i impuls w kablu zgodny z rytmem.

### Funkcje

- Lokalny 8-krokowy sekwencer z dwiema ścieżkami: stopa i hi-hat,
  generowanymi przez Web Audio, bez gotowych plików muzycznych.
- Każdy krok jest dostępnym przyciskiem z odczytywalnym stanem.
- Start/Stop, tempo 60–160 BPM, regulacja głośności i wyciszenie.
- Początkowy wzór rytmu jest wczytany, ale zawsze zatrzymany.
- Początkowy gain główny maksymalnie 0,08; zakres suwaka 0–0,3,
  łagodne narastanie i wygaszanie eliminujące ostre kliknięcia.
- `AudioContext` tworzony lub wznawiany wyłącznie w reakcji na świadomy Start.
- Rytm i wizualizacja korzystają z zegara audio, nie z liczby klatek renderera.
- Wyjście z pokoju, ukrycie karty lub utrata kontekstu grafiki zatrzymuje rytm,
  usuwa scheduler i wygasza aktywne źródła. Powrót nie uruchamia ich automatycznie.
- Brak obsługi Web Audio daje jasny komunikat; nie unieruchamia świata.
- Przy ograniczeniu ruchu rytm nadal może działać po Start, ale bez ruchu brył
  i agresywnego migania. Stan kroków pozostaje czytelny.

Nie ma mikrofonu, nagrywania, gotowych utworów, linków streamingowych ani autoplay.

## 10. Architektura i cykl życia

### Pozostaje bez zmian funkcjonalnych

- Natywne ES modules, statyczny hosting, brak bundlera i zależności runtime.
- Istniejący GLB i znaczenie `_SIGNAL`, `_RACK`, `_ROOM`, `_BUTTON`, `_CHAIR`.
- Konwersja i przechowywanie obrazów ASCII lokalnie.
- Publiczny klucz i obsługa Web3Forms w `contact-config.js` / `contact.js`.
- Ukryty przycisk pobierania ASCII, który pozostaje ukryty.

### Rozszerzenia

- Jeden rejestr sceny i modułów, wspólna nawigacja, wspólna projekcja obrysów
  i paneli. Testy nie utrzymują niezależnych, rozchodzących się kopii celów kamery.
- Jeden canvas i kontekst WebGL2 dla świata oraz eksperymentów.
- Nowe pokoje i kable generują geometrię raz; nie przebudowują buforów
  prostopadłościanów w każdej klatce.
- Tożsamość modułu przekazywana per partia geometrii/uniform. Nie wolno uznać
  wszystkich nowych pomieszczeń za dotychczasowy `_BUTTON` i poruszać ich razem.
- Podczas zaznaczenia nowego pokoju porusza się on, a nie serwer, inne pokoje
  ani ich kable. Koniec kabla przy serwerze pozostaje właściwie zakotwiczony.
- Eksperymenty udostępniają aktywację, aktualizację, zmianę rozmiaru,
  dezaktywację i sprzątanie zasobów. Inaktywne moduły nie utrzymują własnych pętli.
- Stan galerii i sterowanie labów nie są umieszczane w jednym rozrastającym się
  pliku renderera. Nazwy i dokładny podział modułów wybiera implementator.

## 11. Wydajność i dostępność

- Docelowo jedna zaplanowana klatka i limit renderowania 30 FPS.
- Zero aktywnych pętli GPU/audio w niewidocznej karcie.
- Widok ogólny: tylko lekka animacja sygnałów, bez czterech pełnych efektów.
- Aktywny pokój: obliczenia jego eksperymentu, reszta bez aktualizacji symulacji.
- DPR najwyżej 2 desktop / 1,5 na wąskim ekranie, z możliwością obniżenia jakości.
- Budżet nowych statycznych pomieszczeń i kabli: do 16 tys. trójkątów łącznie,
  poza istniejącym modelem i aktywną rzeźbą eksperymentu.
- Punktów i buforów nie alokujemy ponownie bez potrzeby; wszystkie zasoby
  WebGL i audio mają jawną ścieżkę zwalniania.
- Ustawienia niskiej jakości zmniejszają liczbę punktów, rozdzielczość poświaty
  i gęstość rzeźby, a nie usuwają całych funkcji.
- Nie gwarantujemy 30 FPS na każdym urządzeniu; mierzymy klatki i dokumentujemy
  użyte środowisko, w szczególności programowy WebGL kontra fizyczny telefon.
- Obsługa Tab, Enter, spacji, Escape, nazw kontrolek, widocznego fokusu,
  `prefers-reduced-motion`, czytelnych kontrastów i stanów błędu.
- Nie wymagamy słuchu, rozpoznawania samego koloru ani precyzyjnego celowania myszą.

## 12. Błędy, bezpieczeństwo i prywatność

- Błąd jednego eksperymentu ma wyświetlić komunikat w jego pokoju
  i umożliwiać powrót, nie unieruchomić całej sceny.
- Brak WebGL2 zachowuje istniejący czytelny komunikat. Nie obiecujemy w tym
  zakresie alternatywnego renderera 2D.
- Utrata kontekstu grafiki zatrzymuje również audio; komunikat pozwala odświeżyć stronę.
- Dane galerii są lokalnym, zaufanym modułem; tekst nie trafia do `innerHTML`
  z niezweryfikowanych zewnętrznych źródeł.
- Nowe pokoje nie wykonują zewnętrznych wywołań API i nie wysyłają plików.
- Nie zmieniamy publicznego klucza formularza i nie testujemy go prawdziwymi mailami.
- Makiety `.superpowers/` pozostają ignorowane i nie wchodzą do produktu.

## 13. Weryfikacja i kryteria odbioru

### Geometria i model

- Widoczne są cztery nowe, różniące się wyspy oraz istniejący ASCII i rack.
- Każdy nowy kabel kończy się na swoim odbiorniku, ma ciągłą trasę
  i nie przecina ścian; hover zmienia tylko swój koniec.
- Oryginalny GLB ma niezmieniony digest i przechodzi testy geometrii.
- Globalny kadr i hitboxy uwzględniają wszystkie obiekty; dokładne kliknięcie
  w panel [JP] serwera nadal otwiera kontakt.

### Logika

- Testy stanów wejścia/wyjścia, odwrócenia przejścia i powrotu fokusu dla każdego celu.
- Deterministyczne testy układów cząsteczek, parametrów shaderów i resetu.
- Testy sekwencera z kontrolowanym zegarem: kroki, tempo, scheduler,
  pojedyncze uruchomienie oraz zatrzymanie i sprzątanie.
- Testy danych portfolio: brak fikcyjnych projektów i bezpieczne odnośniki.

### Prawdziwa przeglądarka

- Wejście i użycie każdego pokoju myszą, dotykiem oraz klawiaturą.
- Poprawne cele kamery sprawdzane projekcją/macierzą, nie tylko nazwą `data-view`.
- Renderowanie cząsteczek i materiałów potwierdzone zmianami pikseli i brakiem
  błędów WebGL, nie wyłącznie zmianą kontrolek.
- Audio sprawdzane z Web Audio: brak kontekstu przed Start, zaplanowane źródła,
  synchronizacja rytmu i zatrzymanie po wyjściu/ukryciu.
  Test programowy nie jest dowodem odsłuchu fizycznych głośników.
- Widoki co najmniej 1440×1000, 390×844 i 844×390; kontrolki mieszczą się,
  nie ma niezamierzonego przewijania w poziomie.
- Powtórzenie wejść i wyjść nie mnoży nasłuchiwaczy, timerów, pętli i kontekstów audio.
- Kontrole w trybie ograniczenia ruchu i po ukryciu karty.
- Wszystkie istniejące testy ASCII, kontaktu, krzesła, logo, animacji i światła.

Testy pikselowe wyliczające kadr wyłącznie ze starego GLB należy przystosować
do granic nowego świata lub kontrolowanej sceny testowej, zachowując sprawdzanie
prawdziwego renderera i tych samych zachowań. Nie wyłączać sprawdzeń starej sceny.
Test oświetlenia na własnych GLB-fixture musi nadal działać bez wymagania
metadanych specyficznych dla nowych pokoi.

## 14. Sposób realizacji i decyzje pozostawione wykonawcy

To rozbudowa projektu, nie drobna poprawka. Realizacja obejmie kolejno:

1. Rejestr modułów, geometria nowych wysp, kable i nawigacja.
2. Galeria z prawdziwym case study.
3. Cząsteczki, materiały oraz sekwencer jako osobne moduły.
4. Integracja, dostępność, wydajność i regresje.

Wszystkie cztery pokoje należą do uzgodnionego zakresu. Kolejność prac
nie oznacza ograniczenia produktu do jednego pokoju.

Wykonawca dobiera konkretne współrzędne wysp, obiekty dekoracyjne,
wewnętrzne nazwy modułów, rozdzielczość rzeźby i algorytm degradacji jakości.
Nie dobiera za użytkownika dodatkowych projektów portfolio, nowych usług,
zewnętrznych zgód ani automatycznie odtwarzanego audio.

Po zatwierdzeniu tego dokumentu powstaje szczegółowy plan implementacji.
Do tego czasu dopuszczone są dokumentacja, sprawdzenie projektu i makiety,
nie implementacja produkcyjna.
