# Giętkie kable z kolizjami i przenoszenie pokoi

Status: zakres zatwierdzony przez użytkownika, wdrożony i zweryfikowany lokalnie.
Bez commitów, push ani publikacji.

## Uzgodniony cel

Wszystkie pięć kabli ma zachowywać się jak giętki sznurek podpięty w dwóch
miejscach. A pozostaje w odpowiedniej półce racka, B w tyle monitora danego
pokoju. Nie definiujemy ręcznie drogi pomiędzy nimi. Kabel sam się układa,
zgina i opiera o obiekty. Użytkownik potwierdził, że długość jest nieograniczona:
przy odsuwaniu pokoju przybywa przewodu, bez ograniczania zasięgu ruchu.

Przytrzymanie pokoju pozwala podnieść i przeciągnąć całą wyspę, puszczenie
stawia ją w nowym miejscu. Krótki klik nadal otwiera monitor. Dotyczy to ASCII,
galerii, cząsteczek, materiałów i dźwięku; rack nie jest przenoszony.

## Podejścia

1. Krzywa pomiędzy końcami, ewentualnie zaokrąglona dawna trasa — tania,
   ale nie daje samodzielnego układania ani rzeczywistych kolizji.
   Użytkownik wyraźnie wymaga symulowanego kabla, więc to nie spełnia celu.
2. Łańcuch punktów z ograniczeniami długości/zgięcia, grawitacją i kolizjami,
   rysowany jako ciągły przewód — proponowane rozwiązanie. Pozwala zachować
   natywny WebGL2 i kontrolować połączenia, geometrię oraz impulsy.
3. Zewnętrzny silnik fizyczny — nie jest potrzebny dla pięciu sznurków
   i nieruchomych brył; zwiększa zależności bez koniecznej korzyści.

Konkretne rozwiązania niżej są propozycją implementacyjną, nie dodatkowymi
wymaganiami przypisywanymi użytkownikowi.

## Zachowanie kabla

- Każdy kabel ma własne A i B; zamiana pokojów miejscami nie zamienia półek.
  A uwzględnia istniejący ruch racka, B translację/uniesienie/skale pokoju.
- Krótkie zakończenia przy wtyczkach zachowują kierunek wyjścia: z racka +X,
  z monitora do tyłu -X. Nie zmieniamy miejsca wtyczek ani ich wyglądu.
- Środek przewodu ma bezwładność, tłumienie, grawitację, ograniczenia długości
  lokalnych segmentów i miękkie ograniczenie zgięcia. Nie ma sztywnych kolanek
  ani złączek na każdym odcinku.
- Materiał jest dodawany przy odsuwaniu, a nadmiar łagodnie zwijany przy
  przybliżaniu. Nie gromadzimy całej historycznie rozwiniętej długości w pętlach.
  Docelowy niewielki luz dostraja wykonawca, tak by kabel nie wyglądał jak pręt
  ani sprężyna. Rozwój długości nie powoduje zmiany położenia wtyczek.
- Początkowy układ wyznacza algorytm na podstawie A, B i przeszkód.
  Nie wolno inicjalizować z ręcznie zapisanych tras dla poszczególnych pokojów.
  Później zachowujemy stan kabla, zamiast co klatkę zastępować go nową krzywą.
- Niewidoczna płaszczyzna podparcia na y=-0.60 pod wyspami zapobiega
  opadaniu przewodów w nieskończoność. Nie dodajemy widocznego terenu
  ani nie zmieniamy czarnego tła. Kabel nadal ma kolizje z podłogą każdej wyspy.
- Wygląd: ciemny, cienki przewód o zaokrąglonym przekroju i promieniu około
  0.085 jednostki, z czytelną smugą na powierzchni. Kolory i bloom zostają.

## Kolizje — rzeczywiste przeszkody, nie całe pudełko pokoju

- Uwzględniamy podstawy/podłogi wysp, obie ściany z obramowaniem,
  blaty, szafki, nogi biurek, obudowy monitorów/komputerów, fotele,
  lampki i rośliny, oraz bryłę racka z podstawą i górnymi elementami.
- Bryły kolizyjne wynikają z geometrii: dla pokoi z budowanych pudełek,
  dla racka z istniejącej geometrii GLB. Wnętrza pokoi i przerwy pomiędzy
  elementami racka pozostają przejezdne; nie otaczamy całej sceny jednym AABB.
  Drobne litery i ornamenty mogą korzystać z odpowiadającej im powierzchni.
- Kolizja dotyczy całej grubości i odcinków kabla, nie tylko jego węzłów.
  Powierzchnia renderowanego przewodu nie może przecinać przeszkody między
  dwoma poprawnie położonymi punktami. Wygładzanie także nie może ścinać rogów.
- Przewód ślizga się po powierzchniach i omija krawędzie. Rozwiązywanie
  kolizji i ograniczeń działa wspólnie, również po dodaniu materiału.
- Wtyczka może wchodzić w swoje gniazdo, lecz wyjątek dotyczy tylko krótkiego
  zakończenia i własnej powierzchni portu, nie całego racka/monitora/pokoju.
- Przesuwanie dowolnej wyspy oddziałuje na wszystkie kable, nie tylko na jej
  własny. Ruch przeszkody i szybki ruch kursora są podkrokowane/testowane
  wzdłuż przemieszczenia, żeby nie przenosić kabla przez ściany.
- Zakres nie obejmuje kolizji kabel–kabel, supłów ani fizyki samych mebli.
  Meble poruszają się razem z pokojem; fotel nadal ma swoją animację wejścia.

## Przenoszenie pokoi

- Proponowany próg przytrzymania: 350 ms, z tolerancją niewielkiego drżenia.
  Przed aktywacją nie przesuwamy pokoju; po aktywacji nie otwieramy monitora.
- Drag działa myszą i dotykiem, używa pointer capture i nie gubi pokoju,
  gdy kursor opuści jego obrys. Dodatkowy palec nie przejmuje gestu.
- Przesunięcie jest w płaszczyźnie XZ. Podczas podnoszenia jest niewielki,
  wyłącznie wizualny lift; końcowa wysokość podstaw pozostaje wspólna.
- Projekcja kursora używa kamery zamrożonej na czas gestu, więc wyspa
  podąża za miejscem chwytu bez skoków spowodowanych automatycznym kadrowaniem.
  Po postawieniu kamera obejmuje nowy układ wraz z kablami. Brak sztywnych
  granic mapy; kolejnymi przeciągnięciami można odsuwać pokój dalej.
- Propozycja ochrony przed niemożliwymi pozycjami: nie pozwalamy stawiać
  całych wysp w innych wyspach ani w racku; zachowujemy ostatnią poprawną
  pozycję. Dotknięcie krawędzi nie teleportuje pokoju w nieoczekiwane miejsce.
- Obrys kliknięcia, etykieta, kamera monitora, B i kolizje korzystają
  z jednego bieżącego położenia. Nie zmieniamy stylu ani zawartości pokoi.
- Escape i pointercancel anulują gest i przywracają pozycję sprzed chwytu.
  Wejście w aplikację, ukrycie karty lub utrata WebGL kończy/anuluje drag.
  Puszczenie po przeciągnięciu nie generuje dodatkowego kliknięcia.
- Zapewniamy też tryb przesuwania klawiaturą z zatwierdzeniem/anulowaniem
  i komunikat dostępności. Zwykłe Enter/spacja nadal otwierają aplikację.
  Dobór dodatkowego skrótu i krótkiej podpowiedzi pozostaje wykonawcy.
- W tym zakresie pozycje żyją w bieżącej sesji strony. Nie dodajemy
  zapamiętywania po odświeżeniu, którego użytkownik jeszcze nie potwierdził.

## Impulsy i renderowanie

- Nadal jeden canvas, kontekst WebGL2 i wspólna pętla, maksymalnie 30 FPS.
  Symulacja ma stały krok i ograniczoną liczbę podkroków; długi powrót
  z ukrytej karty nie powoduje eksplozji fizyki ani wielosekundowego nadrabiania.
- Krok symulacji następuje raz, przed renderowaniem. Kolor i bloom korzystają
  z tej samej geometrii; drugi przebieg nie wykonuje drugiego kroku fizyki.
- Długości, odległości wzdłuż kabla i smugi wynikają z jego aktualnego kształtu.
  Impulsy propagują się z prędkością 5 jednostek długości kabla/s,
  nie w stałym czasie ani jako procent połączenia. Ruch samego przewodu
  nie jest dodatkową zmianą zadanej prędkości propagacji.
- Zielony od serwera, odpowiedź w kolorze pokoju. Zmiana długości/remeshing
  nie zeruje innych transmisji, nie przestawia fazy sieci i nie wywołuje
  odbioru z wyprzedzeniem. Odbiór jest jednorazowym zdarzeniem dopiero
  po dojściu czoła do aktualnego końca; potem odpowiedź z opóźnieniem 1 s.
  Najpóźniej odebrana odpowiedź nadal wyznacza kolor świateł racka.
- Reduced motion zachowuje możliwość przeciągania i statyczny poprawny
  kształt kabla, ale bez kołysania po puszczeniu i bez animowanych impulsów.
- Bufory są używane ponownie; przestrzenny broad phase zawęża przeszkody.
  Liczba próbek dostosowuje się do długości i pobliskich kolizji. Nie ma
  sztucznego limitu długości/ruchu, ale nie obiecujemy nieskończonej precyzji
  i stałej wydajności przy dowolnie dużych współrzędnych.

## Integracja i granice

Oddzielne, testowalne moduły obsłużą pozycje/gesty, bryły kolizyjne,
symulację kabla i budowę siatki. `rooms.js` zachowa definicje startowe;
stan bieżącego układu będzie osobny. Konieczne zmiany obejmą renderer,
`lab-ui.js`, `room-world.js`, `cables.js` i harmonogram w `signals.js`.
Nie zmieniamy bajtów oryginalnego GLB, publicznej konfiguracji kontaktu,
ASCII, aplikacji na monitorach ani unikalnych kolorów.
Nie instalujemy zależności, nie wykonujemy commitów, push ani wdrożenia.

## Dowody akceptacji

- Testy logiki: przypięte A/B przy ruchu racka i każdego pokoju; długość
  rośnie przy odsuwaniu bez blokowania; stabilność i brak NaN.
- Testy segmentów: ściana między dwoma węzłami, narożnik, blat, noga,
  podłoga, rack, port i przesuwanie obcej wyspy przez kabel. Brak penetracji
  promienia kabla z określoną małą tolerancją numeryczną, nie sam test punktów.
- Testy gestów: krótki klik, przytrzymanie, ruch, puszczenie, anulowanie,
  dotyk, drugi palec, brak przypadkowego otwarcia i fokus klawiatury.
- Przeglądarka: prawdziwe przesunięcie pięciu pokoi i B, poprawna kamera
  i HTML po przeniesieniu, widoczna deformacja/wygaszenie ruchu kabla,
  occlusion/bloom i odbiory impulsów po zmianie długości w trakcie podróży.
- Zachować działanie wszystkich istniejących aplikacji i kontaktu. Testy
  oparte na starych sztywnych trasach zastąpić testami nowych właściwości,
  bez usuwania kontroli kolorów, prędkości, odbioru i geometrii portów.
- Sprawdzenie desktop, telefon pionowo/poziomo, reduced motion, lifecycle,
  jeden WebGL2 i brak rzeczywistych żądań do dostawcy poczty.
- Zapisać aktualne zrzuty/wyniki i ograniczenia; sprawdzić hash renderera,
  niezmieniony GLB i whitespace. Nie deklarować jeszcze niewykonanych testów.
