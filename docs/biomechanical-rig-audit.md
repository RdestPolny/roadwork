# Roadwork — audyt biomechaniki szkieletu (etap III, 31.10.2026)

## Cel i zakres

Sprawdzono sposób generowania pełnej pozycji 3D z `fighterJoints`, IK ręki/nogi, środek ciężkości, osie miednicy i barków, kręgosłup, szyję, odskoki, uniki, kontakt ciosów, nokdaun i ponowne wstawanie. Punktem odniesienia są gałęzie `fix/combat-animation-anatomy` (#10), `refactor/hd-figure-anatomy` (#11), a niniejsza `refactor/biomechanical-combat-rig` (#12). Priorytet: czytelne ludzkie proporcje w **432×288**, spójny ruch, niewydłużające się kości i zachowanie zasad gameplayu.

To **audyt z implementacją i zestawem testów**, nie potwierdzenie oględzin każdej klatki po uruchomieniu gry. Weryfikację na natywnych PNG trzeba przeprowadzić oddzielnie.

## Wyniki audytu: problemy starego rigu

| Układ | Stary kod | Mechanizm deformacji | Rozwiązanie |
| --- | --- | --- | --- |
| Oś tułowia | `jf.pel`, `jf.chest`, `jf.head` obliczane trzema niezależnymi wzorami | Przy silnym `lean`, `lung` i `fold` odległość pelvis–chest mogła się zmieniać, a szyja nienaturalnie rozciągać | Kręgosłup: 2.68 + 2.94, szyja–środek głowy: 3.40, niezależne od pozycji |
| Staw brzucha | Istniał `J.abd`, ale powstawał przez interpolację i dodatkowy offset | Wyraźne zgięcie, lecz bez stałych długości obu połówek kręgosłupa | `buildSpine`: osobne dolne i górne ogniwo; brzuch cofa się, żebra składają się nad nim |
| Barki | Każdy bark oparty o ogólny `lean`, `lung`, `sl`, osobną rotację i `rise` | Bark nie zawsze był właściwą częścią klatki, szczególnie podczas hooka/crossa | `shoulderSocket(chest,side,yaw,shrug)`, obrót wokół rzeczywistego `chest` |
| Biodra | Podobny wzór na stronę, ale bez sztywnego połączenia z `pelvis` | Przy przenoszeniu ciężaru biodra mogły rozjechać się względem środka miednicy | `hipSocket(pelvis,side,yaw)` — stała szerokość i przeciwrotacja |
| Proporcja bark/biodro | Rozstawy stawów 5.40 / 2.50 = **2.16** | Mocno przerysowana sylwetka „V” względem ludzkiego stawu biodrowego | Rozstawy 4.80 / 2.76 = **1.74**; także w standardowych pozach HD bohatera i wybranych NPC |
| Stopy | Fizyczne pozycje butów były zasadniczo nieruchome, ale 2-kościowy IK mógł przycinać punkt stopy, gdy był poza zasięgiem | But nad podłogą w długim kroku, przy doskoku i dashu | Miednica respektuje nogę podporową; w ekstremalnym dashu rzutowana jest wyłącznie **widzialna** stopa (kontrolowany poślizg) |
| Kolana | Biegun IK tworzony na podstawie średniej pozycji uda i stopy | Przy dużych wychyleniach mogło dochodzić do zginania na bok lub od tyłu | Kierunek zgięcia jest określony w przód i lekko na zewnątrz |
| Garda | Pozycje pięści i łokci niezależne od obrotu barków | Ręce mogły optycznie odłączyć się od poruszającej się klatki | Neutralna garda i jej pole łokcia lokalne względem `sh` |
| Ragdoll | Współrzędna miękkiego brzucha `N[11]` nie służyła jako `J.abd` | Przy nokdaunie wyraźne zgięcie mogło zniknąć mimo fizycznego węzła | `J.abd=loc(N[11])`, stan przed nokdaunem startuje z prawdziwego `J.abd` |
| Wstawanie | Liniowa interpolacja wszystkich wierzchołków | Skracanie kości i zapadanie stawów w połowie przejścia | Wtórna projekcja długości obu części kręgosłupa, szyi, barków, bioder, ramion i nóg |
| Krew i pot | Emisja ze stałych wysokości 9.5/14.6, krople z pozycji 13–15 | Po zmianie proporcji efekty mogły emitować się ponad głową lub poniżej brzucha | Emisja z `fighterJoints(D).abd/head` i projekcji aktualnej głowy |

## Model stawów — współrzędne i ograniczenia

Wszystkie liczby w **starych jednostkach przestrzeni ciała**, przed ×3 projekcją 432×288. Są to proporcje artystyczne / rig constraints, nie fizjologiczne wartości w centymetrach.

| Segment | Długość lub rozstaw | Konsekwencje |
| --- | ---: | --- |
| Środek miednicy → przegub brzucha | 2.68 | Obrót lędźwiowy / skurcz przy uderzeniu |
| Przegub brzucha → klatka | 2.94 | Ruch żeber względem miednicy |
| Klatka → centrum głowy | 3.40 | Bez rozciągania szyi |
| Panewki bioder, rozstaw | 2.76 | Obracają się względem miednicy |
| Stawy barkowe, rozstaw | 4.80 | Zawieszone na obracającej się klatce |
| Ramię / przedramię z pięścią | 3.00 / 3.75 | Nie zmieniono poprzednio naprawionego IK i geometrii ciosów |
| Udo / podudzie | 3.20 / 3.20 | Stałe długości; stopa na ziemi ma priorytet nad iluzją dalekiego doskoku |

Nie implementowano pełnego anatomicznego modelu łopatki, stawu skokowego, stawu biodrowego 3 DOF ani metody motion capture. Obecny rig jest **uproszczonym układem kinematycznym**, realistyczniejszym od starego zestawu niezależnych punktów i wystarczająco oszczędnym dla pixel-artowego renderera.

## Fazy ruchów — kryteria kontrolne

| Ruch | Gdy rozpoczyna | W środku | Przy kontakcie / odzyskiwaniu |
| --- | --- | --- | --- |
| Garda | Głowa pozostaje na szyi; miednica nad rozstawem stóp | Przejście do ciosu bez nagłej zmiany długości rąk | Po odzyskaniu pierwotna szerokość barków / bioder |
| Jab | Przedni bark wychodzi naprzód przez obrót klatki | Przednia ręka wyprostowuje się po osi barku, nie po osi świata | Łokieć zgięty (bez przeprostu), pięść cofa się do gardy |
| Cross | Wcześniejszy skręt biodra, tylna stopa pivotuje | Barki kontrrotują względem bioder bez rozerwania kręgosłupa | Pięść celuje od bieżącego barku, stopa pozostaje przy podłożu |
| Hook | Łokieć narasta do wysokości barku | Górne ramię odwodzi się w bok, bark i tułów obracają się razem | Ramię i przedramię w poziomie, ~90° w łokciu; bez nienaturalnego przedłużenia barku |
| Uppercut | Obniżenie środka ciężkości i osadzenie pięści przy tułowiu | Wybicie z nóg i krótki łuk w górę | Brak wyrzucenia dłoni daleko ponad głowę / szarpnięcia karku |
| Niski cios | Ugięcie nóg, nie gwałtowne złożenie pleców | Cel przesuwa się na korpus, a przedramię nie zapada w bark | Zatrzymanie w splot/żebra, powrót przez gardę |
| Slip/dash | Stopa podporowa ogranicza maksymalną wysokość miednicy | Kręgosłup przechyla się w dwóch sekcjach; szyja reaguje z opóźnieniem | Stopniowy powrót bez „gumowego” wydłużenia szyi |
| Cios w brzuch | Najpierw kurczy się brzuch | Miednica/kolana absorbują w drugim takcie | Węzeł brzucha zachowany także po upadku |
| Nokdaun/wstawanie | Ragdoll powstaje z rzeczywistego zgięcia brzucha | Segmenty wracają do długości zdefiniowanych dla stojącego riga | Kontrola łączności stawów, szczególnie ramion i szyi |

## Diagnostyka do akceptacji

1. `?debug=1` → Opcje → **HD Fight Test — Bohater vs Harry**.
2. Zatrzymaj **F8**, poruszaj pojedynczą klatką **kropką**, zapisuj F9 (PNG). W konsoli: `window.__boxer.rig('player')` i `window.__boxer.rig('opponent')`. Metryki zawierają pełne punkty stawów, długości obu kości rąk/nóg, długości obu części tułowia i szyi, rozstaw barków/bioder, kąty łokci/kolan, wysokości stóp.
3. Przejdź cztery fazy każdego ciosu: 0%, 40%, 100% i połowę powrotu. Obie ręce, wysokie i niskie cele, patrzenie z ośmiu kierunków, ruch w przód, bok, w tył, dash → cios.
4. W Wardzie: ciężki Edmund Briggs, jego zmęczenie, szeroki hook, postać siedząca; następnie walka i nokdaun + wstawanie. Sprawdź zwykłe NPC oraz animowanego bohatera w eksploracji.
5. Sprawdzaj nie tylko wygląd, ale i **kontakty z otoczeniem**: pięta–podłoga, pięść–twarz, stopa–ściana, ramiona–ubranie oraz czy krew rzeczywiście wydobywa się z trafionego miejsca.

Testy: `node --test tests/fighter-rig.test.js`, `npm test`, `npm run check`. Dodano kontrolę parsera i regresji do GitHub Actions (`.github/workflows/combat-rig.yml`). Bez stwierdzenia, że workflow zakończył się powodzeniem lub że renderery przeszły przegląd wizualny.

## Granice tej iteracji

- Ruchy cywilnych NPC w zwykłej eksploracji nadal mają osobne, ręcznie przygotowane pozycje; **szerokości bioder i barków w standardowych pozach HD zostały wyrównane**, ale nie wykonywano pełnej migracji ich animacji do nowego solvera.
- Przy ekstremalnym dashu, gdy nieruchoma stopa jest dalej niż długość nogi, wybieramy **kontrolowany poślizg wyświetlanej stopy**. Nie da się jednocześnie utrzymać statycznej stopy, niezmiennej długości kości i dowolnego przemieszczenia miednicy; jest to świadomy kompromis prezentacyjny, nie naprawa logiki chodzenia.
- Powroty z ragdolla mają wtórną projekcję długości kości, ale mogą potrzebować ręcznego dopracowania przebiegu w czasie i przecięć kończyn.
- Skalowanie czaszki, detale ubioru, przebarwienia oraz geometria heavy z #11 pozostają osobną warstwą. Nie zmieniano projektowanych wariantów sylwetki ani sposobu ich zasilania danymi.
- Ocena fotograficznych proporcji dorosłego człowieka (7–8 wysokości głowy) **nie jest wymogiem** w tej izometrycznej miniaturze. Nie należy podbijać długości kości i wysokości postaci bez wspólnego audytu eksploracji, kamery, hit feedbacku i nocnych scen.

## Status

Kod i testy dodano do PR #12, stanowiącego kolejny zależny etap po #10 i #11. **Weryfikacja jednostkowa i przeglądarkowa do potwierdzenia w CI i ręcznym przeglądzie ujęć**; brak materiału uzasadniającego kategoryczne zatwierdzenie wizualne.
