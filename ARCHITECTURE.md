# Architektura

Gra używa natywnego ESM. `index.html` ładuje `src/main.js`; importy nie uruchamiają rozgrywki. Jawne wywołania `initialize()` zachowują kolejność przygotowania palety, animacji, geometrii pokoi, danych zapisu, interfejsu i pętli. Cykliczne importy pozostają. `loop.initialize()` buduje sceny, wczytuje pokój i otwiera menu; `devtools.initialize()` na końcu udostępnia `window.__boxer` wyłącznie pod `?debug=1`.

## Właściciele stanu

Moduły eksportują własne obiekty `state`. Nowy kod zmienia cudzy stan przez publiczną operację właściciela. Nie potrzeba ogólnego systemu zarządzania stanem.

| Moduły | Odpowiedzialność |
| --- | --- |
| `appearance`, `animation`, `boxing` | Paleta, szkielet, IK, pozy, animacje, cząstki i wspólny zegar ruchów. Identyfikatory animacji pozostają stabilne; miejsca usuniętej skakanki są puste. |
| `renderer`, `audio` | Bufory pikseli, składanie, skalowanie i dźwięki. Pokoje Newgate i siłowanie mają 288×192, pozostałe sceny 144×96. |
| `gym` | Wspólna geometria izometryczna, rysowanie postaci, sortowanie głębi, kolizje, ruch i stacje w pokojach. `hubRebake`, `stationOf`, `stationOptions`. Dawna nazwa zachowana; budowanie siłowni usunięte. |
| `rooms`, `ward`, `exercise-yard`, `bath`, `cell-light`, `weather`, `npcs` | Ward, spacerniak, łaźnia, światło, pogoda, współwięźniowie i klucznicy. `roomsLoad`, `setRoomRaw`, `goRoom`, `cellOptions`, `actStop`. |
| `prison`, `prison-data`, `ward-meal`, `profesor`, `healers` | Harmonogram, bramki czynności, raporty, respekt, tytoń, konto, przyjęcie, posiłki, lista Profesora i leczenie. Operacje m.in. `prisonClockSync`, `spendTobacco`, `prisonFightEnd`. |
| `simulation`, `pocket-watch`, `need-icons` | Potrzeby i dwie akcje na porę dnia; HUD eksploracji z zegarkiem, porami posiłków, żetonami akcji, przeciwnikiem i obowiązkiem korby oraz wskaźnikami głodu, zmęczenia i higieny po prawej. `simClockMinutes()` wyprowadza orientacyjny czas z fazy i wydanych akcji, zachowując nominalny zegar harmonogramu. Tarcza i ikony to palety z `art/ui/`, wskazówki rysuje kod. |
| `card-data`, `card-rules` | Zachowany diagnostyczny silnik kart. Czyste dane skilli (tempo, koszt, efekty), reakcji, perków, ran, zestawów stylów i rywali; deterministyczne reguły z RNG w argumentach. `makeFighter`, `newDuel`, `queueSkill`, `startExchange` (obie kolejki na jednym zegarze tempa), `resolveBlow` (cios + reakcja obrońcy), `reactWindow`, `getUp`, `aiPlan`, `aiReaction`. Nazwy plików zostały po kartach. |
| `card-fight` | Właściciel diagnostycznego pojedynku kartowego (`state.duel`), HUD: menu pędzlowych pasków przy zawodniku (styl Expedition 33), oś wymiany z torami obu stron, ring reakcji (Q unik, E parowanie), nokdaun i zapamiętywanie ran/nawyków. `cardStart`, `cardTick`, `cardKey`, `cardStop`. Menu pojawia się dopiero w fazie walki, nigdy nad widokiem pokoju. |
| `sparring`, `newgate-fight`, `cell-fight-scene`, `bath-scene`, `fight-crowd` | Prezentacja walki i wynik. `startSpar` domyślnie uruchamia bójkę w czasie rzeczywistym; `startCardSpar` jawnie wybiera zachowany silnik kart. `cardAct`, `setCardVitals`, `cardCaption`, `cardGetUp`, `cardFinish` odgrywają rozstrzygnięcia silnika. AI rywala i trafienia w czasie rzeczywistym należą do `sparring`; brak sędziego i rund ringowych. W stylu pikselowym (`?styl=piksel`; domyślnie walki maluje styl plakatu) tło walki w celi (`venue 'cell'`) jest malowane: `cell-fight-scene` składa planszę i warstwy skazańców z `cell-plate.js` (wypalane przez `scripts/cell-plate.py` z obrazu i edycji Codexa w `art/cela/`), kod dodaje tylko migotanie łojówki, płomień, dym, pył w snopie i opar; bójka przy posiłku zostaje przy rysowanym Wardzie z `newgate-fight`. |
| `poster-ink`, `poster-fighter`, `poster-fight` | Styl plakatu dla zawodników (PLAKAT.md): we wszystkich walkach i w Cieniu postacie, krew, rany, gwiazdy trafień i napisy malowane na stawach z `F.S` nad pikselowym tłem miejsca, bez zmiany animacji i kamery. `renderSpar(false)` rysuje samo tło; `posterFightOn`, `renderPosterFight`; `?styl=piksel` zostawia pikselowych zawodników.  |
| `shadowboxing`, `shadow-sequence` | Cień: przyjmowanie kombinacji, kolejka poprawnych akcji, tempo i ukończenie animacji. `startShadowboxing` używa `startShadowCombat`, `performShadowAction`, `resetShadowPosition`, `setShadowTempo`. |
| `pushups`, `pullups`, `pullup-scene` | Ćwiczenia w Wardzie, sesje, sterowanie, oddech i prezentacja. Podciąganie widać zza pleców: `pullup-scene` rysuje kratę okna, Londyn, karaluchy i ciało jako mapę wysokości; im wyżej bohater, tym więcej światła zasłania (`posePullup`). |
| `roaches`, `roach-scene`, `roach-rules` | Karaluchy na ścianie z oczu bohatera: tryb (ręka ze sprężyną, cios, ból, cooldown, trasy karaluchów, wskaźnik myszy tylko w tym trybie), ściana jako mapa wysokości oświetlana kagankiem z cieniem pięści i pięścią w kadrze, czyste reguły trafienia i bólu. |
| `treadwheel`, `treadwheel-scene`, `treadwheel-rules` | Kierat: tryb (takty z krawędzi desek, kroki, wspinanie, poręcz, klucznik i latarnia, rywale, wygrana i „sam na kole”), kadr 144×96 rysowany kodem jak podciąganie (tło wypalane z funkcji na piksel, postacie jako mapy wysokości z rampami tonów), czyste reguły kosztów, cyklu klucznika i symulacji rywali. Wynik dnia rozlicza `prison` (`wheelDone`, `supperDenied`). |
| `crank`, `crank-rules`, `crank-scene` | 30 sekund pracy przy żelaznej korbie: rytm trzymania Spacji na łuku 6→12 i puszczania na 12→6, przyspieszanie bez mechanizmu zacięć. Reguły objęte checkJs, HUD, malowana szopa 288×192 i szkielet gracza z `cast` z dłońmi na uchwycie. `prison` rozlicza jedną akcję i nagrody; pauza zachowuje mechanizm i zegar. |
| `armwrestle`, `cast` | Siłowanie na pryczy; wspólny szkielet postaci dla dodatkowych osób. |
| `work` | Rzeźnia przy Smithfield: wyłączona w rozgrywce więziennej; zachowana scena diagnostyczna (`startWork({target,minutes,returnSt,onEnd})`, norma i wypłata w `prison`), bez argumentów — prototyp z debugu. |
| `progression`, `stats`, `training-data`, `training-session` | XP, poziomy, próby Profesora, sesje, oceny, świeżość i wyniki. |
| `perk-rules`, `skill-data`, `skill-tree`, `skill-icons`, `char-sheet` | Punkty atrybutów i Cechy (`TRAITS`: jedna z dwóch na poziomach 5, 10, 15; działanie w bójce w `PERK_CARDS`). `skill-tree` to dialog Profesora z Cechami i Spacerniakiem; karta postaci ma zakładki Cechy (wybór wolnego miejsca) i Ciosy (`PUNCH_TREES`, `buyNode`; węzły kupuje się dopiero, gdy są w `NODE_READY`). `pickTrait` płaci za zmianę przez `prison.spendTobacco`. |
| `input`, `navigation`, `menu`, `options`, `dialog`, `runtime`, `loop`, `time` | Wejście, przejścia, pauza, sloty, aktualizacja i stały krok symulacji. |
| `save-store`, `legacy-save-data`, `data`, `config` | Normalizacja zapisu, minimalny katalog dawnych identyfikatorów, wspólne dane wyglądu i konfiguracja debug. |

## Przepływ walki

Interakcja w pokoju lub fabuła uruchamia `startSpar(index, venue, station)`. `sparring` ustala miejsce i poziomy zawodników oraz prowadzi bójkę w czasie rzeczywistym. Klawisze 1–4 wybierają jab, cross, hook i uppercut, a trzymane ↓ kieruje cios w korpus. Spacja trzyma gardę i zużywa kondycję; podniesiona w ostatnich około 120 ms odbija cios i dodatkowo męczy napastnika. Q uruchamia slip: ostatnie około 160 ms przed trafieniem daje unik i +50% do następnego ciosu w ciągu sekundy; zły moment zwiększa otrzymane obrażenia o 35%. Koszty 5/9/12/16 rosną niezależnie przy powtarzaniu danego ciosu i wracają do podstawy po 2 sekundach bez niego. Walka korzysta ze statystyk Siły, Szybkości i Wytrzymałości oraz głodu i zmęczenia, na istniejącym kroku 60 Hz.

`startCardSpar(index, venue, station)` jawnie uruchamia dawny silnik, dostępny w debug przez `window.__boxer.startCardSpar`. W tym trybie `cardStart` przygotowuje pojedynek, `card-rules` rozstrzyga wymiany, a `card-fight` odgrywa zdarzenia przez publiczne operacje `sparring`. Kontakt wizualny nie nalicza drugich obrażeń. Silnik kart posiada jego perki i kontuzje; kontekst rysowanego zawodnika posiada pozy i animacje.

Kamera diagnostycznej bójki kartowej należy do `sparring`: kadr planowania, bliższy kadr wymiany, kadr nokdaunu i krótki najazd na punkt trafienia trzymany przez hitstop. Co klatkę przekazuje go `renderer.setCamera`; renderer liczy z niego prostokąt obrazu dla wyświetlania obrazu (`vx`, `vy`, `vs` służą też pierścieniom QTE). Tło za walczącymi jest przyciemniane przed rysowaniem zawodników. W trybie kart paski zdrowia, zamroczenie i kondycja są w HUD DOM `card-fight`. Menu skilli wisi za plecami zawodnika gracza, przypięte przez kamerę z wygładzeniem (`pinMenu`); na dole oś wymiany. Cień nie używa kamery.

`showSparResult` nalicza XP oraz zapisuje bilans i konsekwencje więzienne. W trybie kart `card-fight` utrwala rany i nawyki; wyjście przechodzi przez `finishPrisonFight` właściciela NPC. Cień nie daje wyniku bójki ani obrażeń i nie uruchamia AI rywala.

## Zegar i pauza

`loop.frame()` używa `time.advanceFixed()` i kroku 60 Hz. `boxing.simNow` ma tę samą podstawę czasu co wejście przez `inputNow()`. `resumeClock()` odnawia czas ścienny i zeruje akumulator, zachowując BPM, kolejkę tempa i oś czasu ruchów. `resetClock()` służy wejściu do trybu, a nie wznowieniu pauzy. `clearHeldInput()` czyści trzymane klawisze i gesty przy menu, utracie fokusu i zmianie trybu.

Cień zalicza akcję dopiero po ukończeniu animacji. Tempo 1–2× wynika z odstępów poprawnych inputów, jest wygładzane i wraca do 1× po bezczynności. Pauza zachowuje kolejkę i tempo. `poseSampleTime()` próbuje pośrednie pozy ciosów przy 60 Hz, zachowując siatkę zdarzeń i apeksy.

## Postawa zawodnika

`animation.GUARD` definiuje wspólną wyprostowaną gardę wzorowaną na dostarczonym zdjęciu boksu bareknuckle: wysunięta przednia pięść i tylna przy klatce, łokcie nisko. `computeIdle` zachowuje siatkę ośmiu kroków na beat, ale zwykła bezczynność to przenoszenie ciężaru i oddech bez podskoków; zmęczenie oraz urazy nadal wpływają na pozę. Specjalny tryb flow zachowuje swój dotychczasowy krok. Wzorce ruchów i podgląd edytora dziedziczą tę samą gardę; czasy ciosów i ich zdarzenia nie zmieniają się.

## Kontekst zawodnika

`F.S` przechowuje kontekst szkieletu, animacji i prezentacji zawodnika. `CONTEXT_FIELDS` w `fighter-context.js` jest wspólną mapą właścicieli pól. `saveFighterContext()` i `loadFighterContext()` zapisują/odtwarzają kontekst bez wymiany obiektu. Dodając pole, rozszerz mapę oraz test zapisu i odczytu. `F.cur`, `F.from`, `F.last`, krew na ubraniach i pivot pozostają danymi prezentacji poza trwałym zapisem.

## Zapis

`createSaveStore()` posiada stały obiekt `state`; `progression.state.save` wskazuje ten sam obiekt. `merge(data)` normalizuje od wartości domyślnych; `merge({})` resetuje do nowej gry. Klucze to `heavybag.save` i trzy `heavybag.slot.N`. Schemat v10: statystyki, próby, punkty lekcji i zmiany Cech (`skills`), Cechy (`traits`, trzy miejsca A/B), treningi, potrzeby, więzienie, respekt, bilans, trwałe rany, nawyki, znane ruchy z węzłami drzewek (`moves[id].picks`) i zestaw skilli (`loadout`, do 6; v7–v8 miały talię, z której migracja robi zestaw; v4–v9 miały perki, których punkty wracają).

Store nadal czyta wersje 1–6, historyczne `phase:'free'`, sprzęt, dekoracje i układ `gym`. `legacy-save-data.js` zawiera tylko identyfikatory i wymiary wymagane do ich walidacji. Jawne `gym:[]` pozostaje puste. Przy wejściu w grę `syncPhaseClass()` zamienia dawną fazę na `prison`, a `setRoomRaw()` przenosi wycofane pokoje do Wardu. Postęp zachowuje się, nie powstaje nowy format zapisu. Dawny pokój `izolatka` wraca do Wardu, pole zgodności `izolatkaDo` ma zawsze 0, a oczekujące przeniesienie jest usuwane przy odczycie.

Ostatni poprawny autozapis trafia do `heavybag.save.backup`. Uszkodzony zapis jest zachowany i, jeśli Storage pozwala, kopiowany do `heavybag.save.corrupt`. Uszkodzenie lub przyszła wersja blokują autozapis do świadomego nowego startu albo wczytania przez `recover()`. Błędy Storage są raportowane i nie zatrzymują gry. Zmiana originu zmienia magazyn przeglądarki.

## Testy

`npm test` sprawdza reguły, zapis, czas, animacje i konteksty. `npm run check` sprawdza moduły wymienione w `tsconfig.json`. `npm run test:browser` sprawdza rzeczywisty start i przepływy Newgate oraz tworzy zrzuty. Oryginalny kod sprzed porządków jest poza projektem w `../Roadwork-backup-przed-porzadkami`; `reference/boxer_heavybag-2.html` służy porównaniom.
