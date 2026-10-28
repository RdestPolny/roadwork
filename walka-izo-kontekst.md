# Roadwork — kontekst walki izometrycznej

Stan kodu po zmianach: ragdoll Verleta w 3D przy nokdaunach/KO, sprężyny tułowia i głowy, przeciwskręt barków, światło kierunkowe z rim lightem (bufor roboczy w `figureHD`), nowe cząstki (mgiełka, krople, ściekanie, rozprysk), bez błysków.

Walka, którą gra gracz, to **`src/iso-fight.js`** (izometryczna bójka w Ward/spacerniak/łaźnia); reguły ciosów, kondycji, bloku, parowania i uniku (slip) to **`src/realtime-rules.js`** (`TUNING`, `beginSlip`, `resolvePunch`). Postacie rysuje `figureHD` w `gym.js`. `boxing.js`, `animation.js`, `sparring.js` to boczny szkielet używany tylko przez trening Cień, pompki itd. — **nie jest to walka**.

Pliki: ARCHITECTURE.md, AGENTS.md, src/iso-fight.js, src/realtime-rules.js, src/gym.js, src/renderer.js, src/appearance.js, src/boxing.js, src/animation.js, src/fighter-context.js, src/cell-light.js, src/weather.js, src/npcs.js, src/ward.js, src/exercise-yard.js, src/bath.js, src/stats.js, src/sparring.js, src/input.js, src/audio.js, tests/isofight.mjs, tests/realtime-rules.test.js

---

## `ARCHITECTURE.md`

````md
# Architektura

Gra używa natywnego ESM. `index.html` ładuje `src/main.js`; importy nie uruchamiają rozgrywki. Jawne wywołania `initialize()` zachowują kolejność przygotowania palety, animacji, geometrii pokoi, danych zapisu, interfejsu i pętli. Cykliczne importy pozostają. `loop.initialize()` buduje sceny, wczytuje pokój i otwiera menu; `devtools.initialize()` na końcu udostępnia `window.__boxer` wyłącznie pod `?debug=1`.

## Właściciele stanu

Moduły eksportują własne obiekty `state`. Nowy kod zmienia cudzy stan przez publiczną operację właściciela. Nie potrzeba ogólnego systemu zarządzania stanem.

| Moduły | Odpowiedzialność |
| --- | --- |
| `appearance`, `animation`, `boxing` | Paleta, szkielet, IK, pozy, animacje, cząstki i wspólny zegar ruchów. Identyfikatory animacji pozostają stabilne; miejsca usuniętej skakanki są puste. |
| `renderer`, `audio` | Bufory pikseli, składanie, skalowanie i dźwięki. Pokoje Newgate (także bójka) i siłowanie mają 288×192, pozostałe sceny 144×96. |
| `gym` | Wspólna geometria izometryczna, rysowanie postaci, sortowanie głębi, kolizje, ruch i stacje w pokojach. `hubRebake`, `stationOf`, `stationOptions`. Dawna nazwa zachowana; budowanie siłowni usunięte. |
| `rooms`, `ward`, `exercise-yard`, `bath`, `cell-light`, `weather`, `npcs` | Ward, spacerniak, łaźnia, światło, pogoda, współwięźniowie i klucznicy. `roomsLoad`, `setRoomRaw`, `goRoom`, `cellOptions`, `actStop`. |
| `prison`, `prison-data`, `ward-meal`, `profesor`, `healers` | Harmonogram, bramki czynności, raporty, respekt, tytoń, konto, przyjęcie, posiłki, lista Profesora i leczenie. Operacje m.in. `prisonClockSync`, `spendTobacco`, `prisonFightEnd`. |
| `simulation`, `pocket-watch`, `need-icons` | Potrzeby i dwie akcje na porę dnia; HUD eksploracji z zegarkiem, porami posiłków, żetonami akcji, przeciwnikiem i obowiązkiem korby oraz wskaźnikami głodu, zmęczenia i higieny po prawej. `simClockMinutes()` wyprowadza orientacyjny czas z fazy i wydanych akcji, zachowując nominalny zegar harmonogramu. Tarcza i ikony to palety z `art/ui/`, wskazówki rysuje kod. |
| `card-data` | Czyste dane rozwoju gracza: katalog skilli (`CARDS`), ruchy i drzewka ciosów (`MOVES`, `PUNCH_TREES`), zestaw, karty Cech (`PERK_CARDS`), trwałe rany (`LASTING`, `lastingSpec`), uzdrowiciele i pamięć rywala o nawykach. Nazwa pliku została po silniku kart, którego już nie ma. Objęte checkJs. |
| `iso-fight` | Bójka więzienna w izometrycznych pokojach (Ward, spacerniak, łaźnia; przy posiłku Ward): gracz i rywal to figury `figureHD` w pozach walki, ruch w ośmiu kierunkach, praca nóg z przyklejonymi stopami (pierwsza idzie noga po stronie ruchu), kamera na parze (zoom 2×), pot i krew na boki i na podłogę. Reguły ciosów, kondycji, bloku, parowania i uniku z `realtime-rules`; AI rywala wg stylów (`ARCH`), nokdauny i liczenie, rany, limit czasu, kastet, karta wyniku. `startIsoFight`, `isoFightKey`, `isoFightTick`, `renderIsoFight`, `isoFightOutcome`, `isoFightFinish` (diagnostyka). Postacie wchodzą do sortowania głębi pokoju przez `gym.state.actors`, ślady na podłodze przez `gym.state.preScene`. |
| `sparring`, `cell-fight-scene`, `noise`, `ward-wall` | Wyłącznie Cień (`startShadowCombat`): boczny widok dwóch zawodników na szkielecie, malowane tło celi z `cell-plate.js` (wypalane przez `scripts/cell-plate.py` z obrazu i edycji Codexa w `art/cela/`) i migotanie łojówki. Moduł trzyma też tabele rywali (`oppDef`, `oppStars`, `setRigged`, `setFightLimit`) i `startSpar`, który dla bójki (nie Cienia) przekazuje do `iso-fight`. `noise` to wspólny szum wartości malowanych scen, `ward-wall` — malowana boczna ściana Wardu pod pompkami. |
| `shadowboxing`, `shadow-sequence` | Cień: przyjmowanie kombinacji, kolejka poprawnych akcji, tempo i ukończenie animacji. `startShadowboxing` używa `startShadowCombat`, `performShadowAction`, `resetShadowPosition`, `setShadowTempo`. |
| `pushups`, `pullups`, `pullup-scene` | Ćwiczenia w Wardzie, sesje, sterowanie, oddech i prezentacja. Podciąganie widać zza pleców: `pullup-scene` rysuje kratę okna, Londyn, karaluchy i ciało jako mapę wysokości; im wyżej bohater, tym więcej światła zasłania (`posePullup`). |
| `roaches`, `roach-scene`, `roach-rules` | Karaluchy na ścianie z oczu bohatera: tryb (ręka ze sprężyną, cios, ból, cooldown, trasy karaluchów, wskaźnik myszy tylko w tym trybie), ściana jako mapa wysokości oświetlana kagankiem z cieniem pięści i pięścią w kadrze, czyste reguły trafienia i bólu. |
| `crank`, `crank-rules`, `crank-scene` | 30 sekund pracy przy żelaznej korbie: rytm trzymania Spacji na łuku 6→12 i puszczania na 12→6, przyspieszanie bez mechanizmu zacięć. Reguły objęte checkJs, HUD, malowana szopa 288×192 i szkielet gracza z `cast` z dłońmi na uchwycie. `prison` rozlicza jedną akcję i nagrody; pauza zachowuje mechanizm i zegar. |
| `armwrestle`, `cast` | Siłowanie na pryczy; wspólny szkielet postaci dla dodatkowych osób. |
| `work` | Rzeźnia przy Smithfield: wyłączona w rozgrywce więziennej; zachowana scena diagnostyczna (`startWork({target,minutes,returnSt,onEnd})`, norma i wypłata w `prison`), bez argumentów — prototyp z debugu. |
| `progression`, `stats`, `training-data`, `training-session` | XP, poziomy, próby Profesora, sesje, oceny, świeżość i wyniki. |
| `perk-rules`, `skill-data`, `skill-tree`, `skill-icons`, `char-sheet` | Punkty atrybutów i Cechy (`TRAITS`: jedna z dwóch na poziomach 5, 10, 15; karty `PERK_CARDS` opisywały działanie w bójce kartami; po jej usunięciu Cechy, drzewka ciosów i zestaw skilli nie wpływają jeszcze na bójkę w czasie rzeczywistym). `skill-tree` to dialog Profesora z Cechami i Spacerniakiem; karta postaci ma zakładki Cechy (wybór wolnego miejsca) i Ciosy (`PUNCH_TREES`, `buyNode`; węzły kupuje się dopiero, gdy są w `NODE_READY`). `pickTrait` płaci za zmianę przez `prison.spendTobacco`. |
| `input`, `navigation`, `menu`, `options`, `dialog`, `runtime`, `loop`, `time` | Wejście, przejścia, pauza, sloty, aktualizacja i stały krok symulacji. |
| `save-store`, `legacy-save-data`, `data`, `config` | Normalizacja zapisu, minimalny katalog dawnych identyfikatorów, wspólne dane wyglądu i konfiguracja debug. |

## Przepływ walki

Interakcja w pokoju lub fabuła uruchamia `startSpar(index, venue, station)`, który przekazuje bójkę do `startIsoFight`. Ten ustala pokój (`cell` i `canteen` to Ward, `yard`, `laznia`), rywala z tabel `sparring`, poziomy i statystyki zawodników oraz prowadzi bójkę w czasie rzeczywistym na kroku 60 Hz: najpierw tablica z imieniem rywala i krótkie otwarcie, potem walka do KO, na koniec karta wyniku. Strzałki lub WASD poruszają zawodnikiem w ośmiu kierunkach względem ekranu, klawisze 1–4 wybierają jab, cross, hook i uppercut, trzymany Shift kieruje cios w korpus. Spacja trzyma gardę i zużywa kondycję; podniesiona tuż przed trafieniem odbija cios i dodatkowo męczy napastnika. Q uruchamia slip: idealny moment daje unik i wzmacnia następny cios, zły zwiększa otrzymane obrażenia. Koszty rosną niezależnie przy powtarzaniu danego ciosu i wracają do podstawy po 2 sekundach bez niego. Cios ląduje w szczycie animacji, o ile rywal jest w zasięgu (zasięg zależy od ciosu, najlepsza siła z optymalnego dystansu). Walka korzysta ze statystyk Siły, Szybkości i Wytrzymałości, głodu, zmęczenia i trwałych ran.

Pierwszy i drugi nokdaun kończą się liczeniem na deskach (gracz wstaje, wciskając klawisze, rywal sam), trzeci albo brutalna kontra to TKO i KO. `sparring.state.timeLimit` (niedzielne bicie) kończy walkę wynikiem na punkty, `sparring.state.rigged` uruchamia kastet rywala. `showResult` (w `iso-fight`) nalicza XP, zapisuje bilans i konsekwencje więzienne przez `prisonFightEnd`; wyjście (`exitToHub`) czyta wynik z `isoFightOutcome` i przechodzi przez `finishPrisonFight` właściciela NPC. Cień jest osobnym, bocznym widokiem w `sparring` (bez AI rywala, wyniku i obrażeń).

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

````

---

## `AGENTS.md`

````md
# Praca nad Roadwork

Przeczytaj `README.md`, `ARCHITECTURE.md` i rzeczywisty przepływ zmienianej mechaniki, zanim edytujesz kod. Projekt używa natywnego ESM, własnego renderera i jawnej kolejności `initialize()` w `src/main.js`. Cykliczne importy pozostają; zachowaj działający start aplikacji.

## Zakres zmian

- Rób małe, konkretne zmiany. Reużywaj istniejące funkcje i możliwości przeglądarki; nie dodawaj abstrakcji, zależności ani narzędzi na przyszłość.
- Podczas refaktoru zachowuj grafikę, animacje, sterowanie, tempo, balans i treść gry. Zmiana zachowania wymaga osobnego uzasadnienia lub polecenia użytkownika.
- Nie przenoś gry do nowego silnika ani bundlera bez konkretnej potrzeby. Nie inicjalizuj Git ani Vite w ramach zwykłej poprawki.
- Nie edytuj `reference/boxer_heavybag-2.html`. To oryginał do porównania.
- Nowy kod zmienia cudzy stan przez publiczną operację jego właściciela, a nie przez bezpośrednie przypisanie do importowanego `…State`. Dodaj małą operację u właściciela, jeśli jej brakuje.
- Duże moduły dziel przy rzeczywistej zmianie, nie wyłącznie dla zmniejszenia liczby linii.

## Kontrakty

- Nie zmieniaj kluczy `heavybag.save`, `heavybag.slot.1`–`heavybag.slot.3` ani schematu zapisu bez migracji i testu starego zapisu. Zachowaj ochronę uszkodzonego zapisu, przyszłych wersji i pustego `gym:[]`.
- Zachowaj stałą referencję `saveStore.state`. Resetuj zapis przez `merge({})`, a zapis do Storage obsługuj przez store.
- Zegar wejścia i symulacji ma wspólną podstawę. Pauza nie resetuje BPM, kolejki tempa ani nut.
- Dodając pole kontekstu zawodnika `F.S`, aktualizuj wspólną mapę `CONTEXT_FIELDS` w `fighter-context.js` i sprawdź zapis oraz odczyt.
- Cheaty i `window.__boxer` są dostępne wyłącznie po świadomym włączeniu `?debug=1`.

## Weryfikacja

- Gra ma docelowo sztywne okno. Pracuj w jednym stałym kadrze (obecny kadr testowy: 1280×800); nie projektuj responsywności ani nie sprawdzaj telefonów i różnych rozmiarów ekranu bez wyraźnego polecenia.
- Przy małych zmianach uruchamiaj tylko testy zmienionej mechaniki, np. `node --test tests/crank.test.js` lub `npm run test:browser -- --only=crank`. Pełny zestaw uruchamiaj przy zmianach wspólnych mechanizmów albo konkretnym ryzyku regresji, nie automatycznie po każdej poprawce. Zwracaj krótki wynik zamiast pełnych logów.

- Uruchom odpowiednie testy jednostkowe dla zmian logiki; `npm test` uruchamia cały zestaw. Dodaj najmniejszy test, który wykrywa naprawiany błąd.
- Uruchom `npm run check` po zmianach `src/save-store.js`, `src/time.js`, `src/fighter-context.js` lub konfiguracji typów. Obecnie tylko te trzy moduły są objęte ścisłym `checkJs`.
- Uruchom odpowiedni scenariusz `npm run test:browser -- --only=…` po zmianach inicjalizacji, wejścia, czasu, menu, zapisu, przejść między trybami albo renderowania. Dla zmian wizualnych obejrzyj też zrzuty i grę.
- Nowe helpery opisuj JSDoc. Rozszerzaj `checkJs` moduł po module przy pracy nad nimi; nie deklaruj całego `src/` jako sprawdzonego bez naprawy błędów.
- Raportuj wykonane sprawdzenia i rzeczywiste ograniczenia. Nie przypisuj wyników testom, których nie uruchomiono.

## Subagents

- Używaj subagentów tylko wtedy, gdy oszczędzają tokeny lub poprawiają jakość wyniku.
- Przy uruchamianiu subagenta zawsze ustaw `fork_turns="none"`.
- Każdemu przydziel jednoznaczną własność plików lub odpowiedzialności. Inni pracują równolegle: nie cofaj ich zmian i dostosuj własne do aktualnego kodu.

## Grafika z obrazu-wzoru

- Skill `painted-pixel-assets` leży w `.claude/skills/painted-pixel-assets/` (kopia projektowa). Przed użyciem przeczytaj `SKILL.md` i `references/roadwork.md`.
- Postaci walczące rysuje kod (`drawBoxer()` na szkielecie), więc skin zawodnika to nowa funkcja rysująca według PNG-wzorca (wzorce PNG trzymaj lokalnie w `art/`, poza repozytorium), a nie nałożony sprite.

````

---

## `src/iso-fight.js`

````js
/* Isometric fight: the prison's brawl, played in the isometric hub rooms (the Ward, the yard, the bath) with free movement in
   eight directions. The punches, guard, slip, stamina and damage are the rules of realtime-rules.js; the opponents, their
   styles, the knockdowns, the wounds and the result card are the fight's old ones. The people are the 3D-skeleton figures of
   the hub rooms (figureHD) posed for a stance, a punch and a slip. */

import { state as boxingState, popup, drawText } from './boxing.js';
import { state as appearanceState, rgb } from './appearance.js';
import { state as gymState, figureHD, hubBlocked, hubBounds, hubRebake, hubTransReset, heroFigureLook, isoX, isoY, renderHub } from './gym.js';
import { state as rendererState, zoomBlit } from './renderer.js';
import { mix } from './cast.js';
import { state as npcsState, cnLookHD } from './npcs.js';
import { state as sparringState, oppDef, oppLevels, oppStars, setSparFight } from './sparring.js';
import { setRoomRaw } from './rooms.js';
import { state as inputState, setInfo } from './input.js';
import { exitToHub } from './navigation.js';
import { initAudio, sfxPunch, sfxWhoosh, sfxBlock, sfxKO, sfxBell, sfxCrack, sfxLand } from './audio.js';
import { createCombatant, tickCombatant, beginPunch, whiffPunch, setGuard, beginSlip, resolvePunch, TUNING } from './realtime-rules.js';
import { state as progressionState, resetSessXP, addXP, persist, sessXPText, statShort, passTrial, recordFight } from './progression.js';
import { fighterStats } from './stats.js';
import { fightXP } from './training-data.js';
import { doneToday, takeFightTrial } from './training-session.js';
import { prisonFightEnd, countFight, showFightPlate, hideFightPlate } from './prison.js';
import { hungerLevel, tiredness } from './simulation.js';
import { lastingSpec } from './card-data.js';

// Runtime values owned by iso-fight; the fight is reset by startIsoFight().
export const state = {on:false,t:0,P:null,O:null,keys:{},low:false,guardHeld:false,phase:'off',pt:0,elapsed:0,winner:null,how:'',idx:0,venue:'cell',opp:null,rigKO:false,
  notice:'',noticeUntil:0,freeze:0,slipFlip:1,parts:[],decals:[],cam:{z:2,x:144,y:96,init:true},xpToday:0,trial:null,banner:null};

/** Seconds from the start of a punch to contact and to the end of the recovery. */
const PT=[{hit:.10,end:.30},{hit:.15,end:.40},{hit:.19,end:.48},{hit:.19,end:.48}];
/** Farthest hip-to-hip distance (room units) at which each punch lands: the old side-on ranges 33/31/27/26 px scaled to the rooms. */
const RANGE=[1.45,1.40,1.20,1.10];
const LUNGE=[1.2,1.6,1.8,1.4];
/** Jab and hook with the lead hand, cross and uppercut with the rear one. */
const HAND=[1,-1,1,-1];
const MIN_SEP=0.8;
const WALK=0.034;

/** The opponents' styles (the old tuning): preferred distance in px of the side-on picture, punch weights, slip habit, combos, body shots, pace. */
const ARCH=/** @type {Record<string,{idealGap:number,minGap:number,weights:number[],slipBias:number,comboChance:number,bodyBias:number,cadence:number[]}>} */ ({
  out:     { idealGap: 28, minGap: 21, weights: [0.55, 0.85, 0.95, 1.0], slipBias: 0.60, comboChance: 0.42, bodyBias: 0.20, cadence: [0.42, 0.45] },
  press:   { idealGap: 19, minGap: 16, weights: [0.15, 0.40, 0.75, 1.0], slipBias: 0.20, comboChance: 0.65, bodyBias: 0.45, cadence: [0.34, 0.38] },
  counter: { idealGap: 24, minGap: 19, weights: [0.30, 0.65, 0.85, 1.0], slipBias: 0.72, comboChance: 0.50, bodyBias: 0.25, cadence: [0.50, 0.55] },
  bal:     { idealGap: 22, minGap: 18, weights: [0.22, 0.52, 0.85, 1.0], slipBias: 0.32, comboChance: 0.42, bodyBias: 0.30, cadence: [0.44, 0.48] },
  tank:    { idealGap: 20, minGap: 16, weights: [0.10, 0.45, 0.75, 1.0], slipBias: 0.10, comboChance: 0.48, bodyBias: 0.38, cadence: [0.48, 0.52] }});

/** Per-punch hand targets in body coordinates [forward, side, height] (elbow, fist) for hand side s. */
const REACH=[
  (s)=>[[3.6,s*1.4,13.0],[7.6,s*0.5,13.7]],
  (s)=>[[3.6,s*1.4,13.0],[8.0,s*0.4,13.6]],
  (s)=>[[3.2,s*3.4,13.3],[5.4,-s*0.6,13.6]],
  (s)=>[[2.4,s*2.0,9.6],[4.4,s*0.8,16.0]]];

const lerp3=(/** @type {number[]} */ a,/** @type {number[]} */ b,/** @type {number} */ k)=>[a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k,a[2]+(b[2]-a[2])*k];
const smooth=(/** @type {number} */ k)=>k*k*(3-2*k);

const emptyCounts=()=>({thrown:0,landed:0,power:0,body:0,counters:0,evades:0,blocks:0,perfects:0,minSta:1});

/** One fighter: the rules' combatant, the pose state, the footwork and the counters of the result card.
 * @param {number} i @param {number} j @param {number} fi @param {number} fj @param {any} look @param {(fn:()=>void)=>void} wrap
 * @param {{hpMax:number,staCap:number,pow:number,regen:number,hunger?:number}} rules @param {{stunDealt:number,stunTaken:number}} S */
function makeFighter(i,j,fi,fj,look,wrap,rules,S){
  const F={i,j,fi,fj,moving:false,mf:0,ms:0,rt:createCombatant(rules),pk:null,buf:null,slipSince:-9,slipDir:1,hurtT:0,hurtDir:0,stagger:0,stun:0,dmg:0,
    ko:false,down:false,downAt:0,kdN:0,kdMash:0,kdLast:0,gUp:0,look,lagF:0,lagVF:0,lagS:0,lagVS:0,hLagF:0,hLagS:0,pvf:0,pvs:0,rd:/** @type {any} */ (null),rise:/** @type {any} */ (null),seed:Math.random()*6,aiAt:1,combo:[],comboAt:0,seen:0,strafe:1,strafeUntil:0,guardUntil:0,lowAim:false,
    stunDealt:S.stunDealt,stunTaken:S.stunTaken,c:emptyCounts(),wounds:/** @type {any} */ ({cuts:0,ribs:0}),bleed:false,hist:/** @type {any[]} */ ([]),draw:()=>{}};
  F.ft={1:{},'-1':{}}; F.li=i; F.lj=j; for(const s of [1,-1]) Object.assign(F.ft[s],stance(F,s),{sw:0,from:null,to:null});
  F.draw=()=>wrap(()=>drawFighter(F));
  return F;
}

/** Where the two stand: on the floor of the room, facing each other along the screen's horizontal, as in the side view.
 * @param {string} room @returns {[number[],number[]]} */
function startSpots(room){
  const [w,h]=hubBounds(), pref=room==='cell'?[5.55,5.15]:[w/2,h/2], d=[0.7071,-0.7071], half=0.78;
  for(let r=0;r<6;r+=0.4) for(let a=0;a<(r?16:1);a++){
    const ang=a/16*6.283, cx=pref[0]+Math.cos(ang)*r, cy=pref[1]+Math.sin(ang)*r, p=[cx-d[0]*half,cy-d[1]*half], o=[cx+d[0]*half,cy+d[1]*half];
    if(!hubBlocked(p[0],p[1])&&!hubBlocked(o[0],o[1])&&!hubBlocked(cx,cy)) return [p,o];
  }
  return [[pref[0]-d[0]*half,pref[1]-d[1]*half],[pref[0]+d[0]*half,pref[1]+d[1]*half]];
}

/** The hub person who plays the rival: the yard and the bath inmates, the Ward's cellmates, the man from the meal by name. @param {string} venue @param {number} idx @param {any} O */
function foeFigure(venue,idx,O){
  const byName=[...npcsState.CN,...npcsState.YN].find(c=>c&&String(c.name).toUpperCase()===O.name);
  const C=(venue==='yard'||venue==='laznia'?npcsState.YN[idx]:venue==='cell'?npcsState.CN[idx]:byName)||byName||npcsState.CN[1];
  return {...cnLookHD({...C,tub:false,act:undefined}),irons:false};   /* out of the tub, towel on */
}

/** Begin a brawl against rival `idx` of `venue` in that venue's isometric room; `station` is where the hero returns to.
 * @param {number} idx @param {string} [venue] @param {any} [station] */
export function startIsoFight(idx,venue,station){
  const S=state, save=progressionState.save, V=venue??sparringState.sparVenue, room=V==='yard'||V==='laznia'?V:'cell';
  initAudio(); inputState.overEl.hidden=true;
  setSparFight(idx,V,station);
  if(gymState.hubRoom!==room){ setRoomRaw(room); hubRebake(); }
  const O=oppDef(idx), st=save.stats, PS=fighterStats({str:st.str.lvl,spd:st.spd.lvl,end:st.end.lvl}), OS=fighterStats(oppLevels(O));
  const wounds=lastingSpec(save.injuries), cap=PS.staCap-(tiredness()*4+(wounds.nose?5:0)+wounds.ribs*5), hero=heroFigureLook(), [pa,oa]=startSpots(room);
  S.P=makeFighter(pa[0],pa[1],0.7071,-0.7071,hero.look,hero.wrap,{hpMax:100+PS.hpBonus,staCap:Math.max(25,cap),pow:PS.pow,regen:PS.regen,hunger:hungerLevel()},PS);
  S.O=makeFighter(oa[0],oa[1],-0.7071,0.7071,foeFigure(V,idx,O),fn=>fn(),{hpMax:O.hp,staCap:Math.max(25,OS.staCap),pow:OS.pow,regen:OS.regen},OS);
  Object.assign(S.P.wounds,wounds); S.O.aiAt=0.6;
  Object.assign(S,{on:true,t:0,keys:{},low:false,guardHeld:false,phase:'intro',pt:0,elapsed:0,winner:null,how:'',idx,venue:V,opp:O,rigKO:false,banner:null,parts:[],decals:[],cam:{z:2,x:144,y:96,init:true},freeze:0,
    notice:'1-4 ciosy · Spacja blok · Q slip',noticeUntil:3,slipFlip:1,xpToday:0,trial:null});
  gymState.actors=[S.P,S.O]; gymState.preScene=drawDecals; gymState.hubNear=null; hubTransReset();
  boxingState.gstate='isofight';
  document.body.classList.remove('hub','pushup'); document.body.classList.add('spar');
  showFightPlate(V,O.title);
  setInfo();
}

/** End the brawl now in favour of side 0 (the hero) or 1 (diagnostics and tests). @param {0|1} side @param {string} [how] */
export function isoFightFinish(side,how='KO'){
  const S=state; if(!S.on) return;
  if(S.phase==='intro'){ hideFightPlate(); S.phase='fight'; }
  if(how==='CZAS'){ timeUp(); return; }
  const W=side===1?S.O:S.P, L=side===1?S.P:S.O; L.rt.hp=0; L.ko=true; L.down=false; L.pk=null; if(!L.rd) startIsoRagdoll(L,W,3,true); endBout(W,how);
}

/** Leave the fight state (the hub entry restores the rest). */
export function stopIsoFight(){ state.on=false; state.phase='off'; gymState.actors=null; gymState.preScene=null; state.keys={}; state.guardHeld=false; hideFightPlate(); }

/** Where the fight left things for the hub: rival, venue, whether the hero won, and the station to return to. */
export function isoFightOutcome(){ const S=state; return {idx:S.idx,venue:S.venue,won:S.phase==='end'&&S.winner===S.P,station:sparringState.cellFightSt}; }

/** Drop held keys on blur, pause or mode change. */
export function isoFightRelease(){ state.keys={}; state.guardHeld=false; if(state.on&&state.P?.rt.guarding) setGuard(state.P.rt,false,state.t); }

/** A big caption over the middle of the picture (not in the room: it does not zoom with the camera). @param {string} text @param {number} color @param {number} ticks */
function banner(text,color,ticks){ state.banner={text,color,t:ticks}; }

function say(/** @type {string} */ text){ state.notice=text; state.noticeUntil=state.t+1.4; }

const FIGHT_KEYS=new Set(['Digit1','Digit2','Digit3','Digit4','KeyJ','KeyK','KeyL','KeyI','KeyQ','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyA','KeyD','KeyW','KeyS']);

/** Keyboard for the isometric fight. @param {KeyboardEvent} e @param {boolean} down @returns {boolean} */
export function isoFightKey(e,down){
  const c=e.code, S=state;
  if(c==='Escape'){ if(down){ e.preventDefault(); exitToHub(); } return true; }
  if(S.phase==='end'){ if(down&&(c==='Enter'||c==='Space')){ e.preventDefault(); inputState.againFn(); } return true; }
  const move={ArrowUp:'u',KeyW:'u',ArrowDown:'d',KeyS:'d',ArrowLeft:'l',KeyA:'l',ArrowRight:'r',KeyD:'r'}[c];
  if(move){ e.preventDefault(); S.keys[move]=down?1:0; }
  if(down&&S.on&&S.phase==='fight'&&S.P.down&&!S.P.ko&&FIGHT_KEYS.has(c)){ e.preventDefault(); mash(S.P); return true; }   /* on the boards every key is a breath towards the feet */
  if(move) return true;
  if(c==='ShiftLeft'||c==='ShiftRight'){ S.low=down; return true; }
  if(c==='Space'){ e.preventDefault(); S.guardHeld=down; return true; }
  if(!down||!S.on||S.phase!=='fight') return !!{Digit1:1,Digit2:1,Digit3:1,Digit4:1,KeyQ:1}[c];
  const pid={Digit1:0,Digit2:1,Digit3:2,Digit4:3,Numpad1:0,Numpad2:1,Numpad3:2,Numpad4:3,KeyJ:0,KeyK:1,KeyL:2,KeyI:3}[c];
  if(pid!==undefined){ e.preventDefault(); press(S.P,pid,S.low); return true; }
  if(c==='KeyQ'){ e.preventDefault(); slip(S.P); return true; }
  return false;
}

/** One tap towards getting up from the boards. @param {any} F */
function mash(F){
  if(state.t-F.kdLast<0.09) return;
  F.kdLast=state.t; F.kdMash++;
  if(F.kdMash&1) popup(sparringState.T_RISE,hx(F),hy(F)-12,appearanceState.C_SPARK,1,18);
}

/** @param {any} F */
function busy(F){ return F.ko||F.down||F.stagger>0||F.pk||(state.t-F.slipSince<TUNING.slipActive); }

/** Start a costed punch; a press during a busy moment is kept for a quarter of a second. @param {any} F @param {number} pid @param {boolean} low @param {string} [special] */
function press(F,pid,low,special){
  const now=state.t;
  if(F.ko||F.down||F.stagger>0||state.phase!=='fight') return false;
  if(F.pk||now-F.slipSince<TUNING.slipActive){ if(!special) F.buf={pid,low,until:now+.25}; return false; }
  if(F.rt.guarding) setGuard(F.rt,false,now);
  if(!beginPunch(F.rt,pid,now)){ if(F===state.P) say('Brak tchu - odetchnij'); return false; }
  F.pk={pid,low,t:0,hit:false,special}; F.lowAim=low; F.buf=null; F.c.thrown++;
  if(F===state.P){ F.hist.push({pid,low,at:now}); if(F.hist.length>4) F.hist.shift(); }
  sfxWhoosh(0.25+0.1*pid);
  return true;
}

/** @param {any} F @param {number} [dir] */
function slip(F,dir){
  const now=state.t;
  if(busy(F)||state.phase!=='fight') return false;
  if(!beginSlip(F.rt,now)){ if(F===state.P) say('Slip: odetchnij'); return false; }
  F.slipSince=now; state.slipFlip=-state.slipFlip; F.slipDir=dir||state.slipFlip; sfxWhoosh(0.4);
  return true;
}

/** Unit vector of the opponent from F and the distance. @param {any} F @param {any} G */
function toward(F,G){ const di=G.i-F.i, dj=G.j-F.j, d=Math.hypot(di,dj)||1; return [di/d,dj/d,d]; }

/** Move F by (di,dj)*sp in the room, never into furniture, walls or the other fighter. @param {any} F @param {any} G @param {number} di @param {number} dj @param {number} sp */
function walk(F,G,di,dj,sp){
  const d0=Math.hypot(F.i-G.i,F.j-G.j);
  const ok=(/** @type {number} */ a,/** @type {number} */ b)=>{ if(hubBlocked(a,b)) return false; const d=Math.hypot(a-G.i,b-G.j); return d>=MIN_SEP||d>=d0; };
  const ni=F.i+di*sp, nj=F.j+dj*sp;
  if(ok(ni,F.j)) F.i=ni; if(ok(F.i,nj)) F.j=nj;
}

/** The end of the brawl: a knockout or a stoppage, the time, the knuckle-duster. @param {any} W winner @param {string} how */
function endBout(W,how){
  const S=state; if(S.phase!=='fight'||S.rigKO&&how!=='KASTET') return;
  S.phase='ko'; S.pt=0; S.winner=W; S.how=how;
  banner(how==='TKO'?'TKO!':how==='KASTET'?'KASTET!':'KO!',appearanceState.C_RED,150); sfxKO();
  setInfo();
}

/** Time is up (the Sunday brawl): the fresher fighter wins, a close one is a draw. */
function timeUp(){
  const S=state, A=S.P, B=S.O, d=A.rt.hp/A.rt.hpMax-B.rt.hp/B.rt.hpMax;
  S.phase='ko'; S.pt=0; S.how='CZAS'; S.winner=Math.abs(d)<0.05?null:(d>0?A:B);
  banner('CZAS!',appearanceState.C_WHITE,120); sfxBell(2); setInfo();
}

/** A special move of the dirty fighters at its apex: the shove, the headbutt, the elbow. @param {any} A @param {any} D */
function special(A,D){
  const S=state, kind=A.pk.special, gap=toward(A,D)[2];
  if(D.ko||D.down||gap>1.1) return;
  const [ui,uj]=toward(A,D), px=hx(D), py=hy(D);
  if(kind==='shove'){ walk(D,A,ui,uj,.5); D.rt.sta=Math.max(0,D.rt.sta-6); D.stagger=.35; popup(sparringState.T_SHOVE,px,py-12,appearanceState.C_WHITE,1,28); sfxPunch(0.7,0.8,true); S.freeze=2; return; }
  const dmg=kind==='headbutt'?9:7;
  D.rt.hp=Math.max(1,D.rt.hp-dmg); D.stun+=22; D.dmg=Math.min(1,D.dmg+0.12); D.hurtT=.3; D.stagger=.3;
  if(Math.random()<0.45) D.wounds.cuts=Math.min(3,(D.wounds.cuts||0)+1);
  popup(kind==='headbutt'?sparringState.T_HEADBUTT:sparringState.T_CUT,px,py-14,sparringState.C_BLOOD2,1,34);
  sfxPunch(1,0.8,true); spray(A,D,2,false,false,{damage:dmg,counter:true}); S.freeze=3;
}

/** Contact of a punch at its apex, with the rules of realtime-rules.js. @param {any} A @param {any} D */
function impact(A,D){
  const S=state, now=S.t, pid=A.pk.pid, low=A.pk.low, gap=toward(A,D)[2], R=RANGE[pid];
  if(A.pk.special){ special(A,D); return; }
  if(D.ko||D.down) return;
  if(gap>R){
    whiffPunch(A.rt,now);
    if(pid>=1&&A.rt.sta<22){ A.stagger=.55; A.pk=null; popup(sparringState.T_OVER,hx(A),hy(A)-8,appearanceState.C_SPARK,1,28); }
    else if(A===S.P) say('Poza zasięgiem');
    return;
  }
  const k=gap/R;
  let rangeMod=1;
  if(pid<=1){ if(k>=0.76&&k<=0.97) rangeMod=1.15; else if(k<0.64) rangeMod=0.75; }
  else if(k>=0.70&&k<=0.90) rangeMod=1.20;
  const o=resolvePunch(A.rt,D.rt,{pid,low,now});
  if(o.damage>0){ const extra=o.damage*(rangeMod-1); D.rt.hp=Math.max(0,D.rt.hp-extra); o.damage=Math.max(0,o.damage+extra); }
  const px=hx(D), py=hy(D)+(low?10:0);
  if(o.kind==='parry'){
    D.c.blocks++; D.c.perfects++; A.stagger=.45; A.pk=null; A.stun+=16; popup(sparringState.T_PARRY,px,py-12,appearanceState.C_SPARK,1,30); sfxBlock(0.95,true);
    S.freeze=4; say(D===S.P?'Idealny blok - kontruj!':'Rywal zbił cios'); return;
  }
  if(o.kind==='slip'){ D.c.evades++; D.c.perfects++; popup(sparringState.T_UNIK,px,py-12,appearanceState.C_SPARK,1,30); sfxWhoosh(0.55); S.freeze=3;
    if(D===S.P) say('Idealny slip! Następny cios +55%'); return; }
  const blocked=o.kind==='block';
  if(blocked) D.c.blocks++;
  if(!blocked&&o.damage>0){ A.c.landed++; if(pid>0) A.c.power++; if(low) A.c.body++; if(o.counter) A.c.counters++; D.dmg=Math.min(1,D.dmg+o.damage/D.rt.hpMax*1.6); }
  let stagger=false;
  if(!blocked){
    if(low){
      if(pid>=2&&(D.rt.sta<22||o.counter)){ D.wounds.ribs=(D.wounds.ribs||0)+1; D.rt.hp=Math.max(0,D.rt.hp-4); D.stagger=.5; D.pk=null; stagger=true; sfxCrack(0.85); popup(sparringState.T_RIB,px,py-10,sparringState.C_BLOOD2,1,36); }
    } else {
      D.stun+=[11,20,28,32][pid]*(o.counter?1.45:1)*((A.stunDealt||1)/(D.stunTaken||1));
      if(D.stun>=82&&D.rt.hp>0){ D.stun=30; D.stagger=.7; D.pk=null; stagger=true; popup(sparringState.T_CARD+19,px,py-16,appearanceState.C_SPARK,1,38); }
      if(pid===2&&D.dmg>0.42&&(D.wounds.cuts||0)<3&&Math.random()<0.28){ D.wounds.cuts=(D.wounds.cuts||0)+1; popup(sparringState.T_CUT,px,py-18,sparringState.C_BLOOD2,1,38); }
      if((pid===1||pid===3)&&o.counter&&D.dmg>0.48&&!D.wounds.nose){ D.wounds.nose=true; D.rt.regen*=0.82; sfxCrack(0.8); popup(sparringState.T_CARD+15,px,py-18,sparringState.C_BLOOD2,1,38); }
    }
  }
  D.hurtT=blocked?.12:.3; D.hurtDir=pid===2?1:0;
  if(!stagger&&!blocked&&!low&&D.pk&&D.pk.t<PT[D.pk.pid].hit) D.pk=null;   /* a clean hit interrupts the windup */
  const [ui,uj]=toward(A,D); walk(D,A,ui,uj,blocked?.05:.12);
  if(o.damage>=1) popup(sparringState.T_DMG+Math.min(30,Math.max(1,Math.round(o.damage)))-1,px,py-14,blocked?appearanceState.C_GRAY:appearanceState.C_WHITE,1,32);
  spray(A,D,pid,low,blocked,o);   // the hit shows as drops, not a comic flash
  if(blocked) sfxBlock(0.6); else sfxPunch(Math.min(1.4,0.55+0.25*pid+(o.counter?0.2:0)),low?1:0.35+pid*0.15,true);
  S.freeze=blocked?1:(pid===3||o.counter?4:2); boxingState.shakeT=blocked?3:6; boxingState.shakeAmp=blocked?1:2; boxingState.shakeDur=blocked?3:6; boxingState.shakeAxis=0;
  if(o.failedSlip&&D===S.P) say('Zły slip: cios rywala +35%'); else if(o.counter&&A===S.P) say('Kontra!');
  if(D.rt.hp<=0){
    const brutal=D.kdN>=2||(D.kdN===1&&o.counter&&pid===3);
    if(!D.down&&!brutal){
      D.down=true; D.downAt=now; D.kdN++; D.kdMash=0; D.pk=null; D.buf=null;
      D.rt.hp=Math.round(D.rt.hpMax*(D.kdN===1?0.32:0.20)); D.rt.sta=Math.max(D.rt.sta,D.rt.staCap*0.5); D.stun=0;
      startIsoRagdoll(D,A,pid,false); banner('NOKDAUN!',appearanceState.C_RED,80); sfxKO();
      say(D===S.P?'NOKDAUN! Wciskaj klawisze, żeby wstać!':'Rywal na deskach ('+D.kdN+'/3)');
    } else { D.ko=true; D.pk=null; startIsoRagdoll(D,A,pid,true); spray(A,D,3,low,false,o,true); endBout(A,D.kdN>=2?'TKO':'KO'); }
  }
}

/** Screen position (native px) of a fighter's head. @param {any} F */
function hx(F){ return isoX(F.i,F.j)/gymState.ISO_K; }
/** @param {any} F */
function hy(F){ return isoY(F.i,F.j,15.6)/gymState.ISO_K; }

/** The opponent: keeps his distance, circles, reads the player's punches and answers in short combinations (the old styles). @param {any} F @param {any} P */
function ai(F,P){
  const S=state, now=S.t, O=S.opp, [ui,uj,gap]=toward(F,P), si=-uj, sj=ui;
  const archKey=O.name==='DAN'?'tank':(ARCH[O.style]?O.style:'bal'), arch=ARCH[archKey], perks=O.perks||[];
  F.moving=false;
  if(F.ko||F.down||P.ko||P.down){ if(F.rt.guarding) setGuard(F.rt,false,now); return; }
  if(F.rt.guarding&&now>=F.guardUntil) setGuard(F.rt,false,now);
  if(F.stagger>0||F.pk) return;
  if(F.combo.length&&now>=F.comboAt){ const n=F.combo.shift(); if(gap<=RANGE[n.pid]*0.9&&F.rt.sta>=10&&press(F,n.pid,n.low)){ F.comboAt=now+(n.pid===0?.15:.22); } else F.combo.length=0; return; }
  if(now-F.slipSince<TUNING.slipActive||F.rt.guarding) return;
  const hist=P.hist.filter((/** @type {any} */ h)=>now-h.at<5), recentStraights=hist.filter((/** @type {any} */ h)=>h.pid<=1).length, recentLow=hist.filter((/** @type {any} */ h)=>h.low).length, adaptSlip=recentStraights>=3?0.25:0;
  const pp=P.pk;
  if(pp&&!pp.special&&pp.t>0.05&&pp.t<PT[pp.pid].hit&&F.seen!==P.rt.lastActionAt){
    F.seen=P.rt.lastActionAt;
    if(gap<RANGE[pp.pid]*1.1&&Math.random()<Math.min(0.68,0.22+O.rank*0.018+adaptSlip*0.5)){
      if(pp.pid<=2&&F.rt.sta>=12&&Math.random()<Math.min(0.85,arch.slipBias+adaptSlip)&&slip(F)){
        const cPid=recentLow>=2?3:(Math.random()<0.55?2:1);
        F.combo=[{pid:cPid,low:false}];
        if(archKey==='counter'||archKey==='press') F.combo.push({pid:cPid===1?2:1,low:Math.random()<0.3});
        F.comboAt=now+.17; F.aiAt=now+.45; return;
      }
      setGuard(F.rt,true,now); F.guardUntil=now+.26+Math.random()*.14; return;
    }
  }
  if(now<F.aiAt) return;
  const playerHurt=P.rt.sta<25||P.stun>45, k=(arch.idealGap-19)/9, ideal=RANGE[1]*(0.62+0.3*k), minGap=Math.max(MIN_SEP+0.04,ideal-0.14), targetGap=playerHurt?Math.min(ideal,0.9):ideal;
  if(now>=F.strafeUntil){ F.strafe=Math.random()<.5?-1:1; F.strafeUntil=now+.7+Math.random()*1.1; }
  if(gap>targetGap+0.1){ walk(F,P,ui,uj,WALK*0.8); F.moving=true; F.mf=1; F.ms=0; return; }
  if(gap<minGap&&!playerHurt){
    if(perks.includes('shove')&&gap<1.0&&F.rt.sta>=12&&Math.random()<0.45){ F.rt.sta-=8; if(press(F,2,false,'shove')){ F.aiAt=now+.45; return; } }
    if(archKey==='out'||archKey==='counter'){ walk(F,P,-ui,-uj,WALK*0.8); F.moving=true; F.mf=-1; F.ms=0; F.aiAt=now+.18; return; }
  }
  if(Math.abs(gap-targetGap)<0.5){ walk(F,P,si*F.strafe,sj*F.strafe,WALK*0.5); F.moving=true; F.mf=0; F.ms=F.strafe; }
  if(perks.includes('dirty-work')&&gap<1.0&&F.rt.sta>=16&&Math.random()<0.16){ F.rt.sta-=10; if(press(F,2,false,Math.random()<0.5?'headbutt':'elbow')){ F.aiAt=now+.55; return; } }
  if(F.rt.sta<16&&!playerHurt){ F.aiAt=now+.38; return; }
  const r=Math.random(), w=arch.weights;
  let pid=r<w[0]?0:(r<w[1]?1:(r<w[2]?2:3));
  if(gap>RANGE[pid]) pid=gap>RANGE[1]?0:1;
  if(gap>RANGE[0]){ F.aiAt=now+.12; return; }
  const aimBody=(P.rt.guarding&&Math.random()<0.70)||Math.random()<arch.bodyBias;
  if(press(F,pid,aimBody)){
    if(F.rt.sta>=20&&Math.random()<arch.comboChance*(playerHurt?1.35:1)){
      const second=pid===0?1:(pid===1?2:(pid===2?3:2));
      F.combo=[{pid:second,low:aimBody?false:(Math.random()<arch.bodyBias)}];
      if((archKey==='press'||playerHurt)&&F.rt.sta>=34&&Math.random()<0.45) F.combo.push({pid:second===2?3:2,low:false});
      F.comboAt=now+(pid===0?.16:.24);
    }
    if(archKey==='out'&&!F.combo.length&&Math.random()<0.4){ F.aiAt=now+.25; return; }
  }
  F.aiAt=now+(arch.cadence[0]+Math.random()*arch.cadence[1])*(playerHurt?0.68:1);
}

/** One 60 Hz step of the fight. */
export function isoFightTick(){
  const S=state; if(!S.on) return;
  if(S.freeze>0){ S.freeze--; return; }
  const dt=1/60, P=S.P, O=S.O;
  if(S.banner&&--S.banner.t<=0) S.banner=null;
  tickFeet(P); tickFeet(O); tickParts();
  for(const F of [P,O]){ if((F.ko||F.down)&&!F.rd) startIsoRagdoll(F,null,1,F.ko); if(F.rd) stepIsoRagdoll(F); if(F.rise&&(F.rise.t+=1/27)>=1) F.rise=null; }
  for(const F of [P,O]){ F.gUp+=((F.rt.guarding?1:0)-F.gUp)*0.35; F.hurtT=Math.max(0,F.hurtT-dt); F.stagger=Math.max(0,F.stagger-dt*(S.phase==='fight'?1:0)); }
  const [pi,pj]=toward(P,O), [oi,oj]=toward(O,P);
  for(const [F,ti,tj] of [[P,pi,pj],[O,oi,oj]]){ if(F.ko||F.down) continue; F.fi+=(ti-F.fi)*0.22; F.fj+=(tj-F.fj)*0.22; const m=Math.hypot(F.fi,F.fj)||1; F.fi/=m; F.fj/=m; }
  P.moving=false; O.moving=false;
  if(S.phase==='intro'){
    S.pt++; if(S.pt===2) banner('WALCZ!',appearanceState.C_WHITE,80);
    if(S.pt>=45){ hideFightPlate(); S.phase='fight'; S.pt=0; banner('WALCZ!',appearanceState.C_SPARK,40); setInfo(); }
    return;
  }
  if(S.phase==='ko'){
    if(P.rt.guarding) setGuard(P.rt,false,S.t); if(O.rt.guarding) setGuard(O.rt,false,S.t);
    if(++S.pt>=100){ showResult(); S.phase='end'; }
    return;
  }
  if(S.phase!=='fight') return;
  S.t+=dt; S.elapsed++; const now=S.t;
  if(sparringState.timeLimit&&S.elapsed>=sparringState.timeLimit){ timeUp(); return; }
  for(const F of [P,O]){
    tickCombatant(F.rt,dt,now);
    F.stagger=Math.max(0,F.stagger);
    F.stun=Math.max(0,F.stun-dt*4);
    F.c.minSta=Math.min(F.c.minSta,F.rt.sta/F.rt.staCap);
    if(F.wounds.cuts&&!F.down&&!F.ko) F.rt.hp=Math.max(1,F.rt.hp-(0.25*F.wounds.cuts)/60);
    if(F.pk){ F.pk.t+=dt; if(!F.pk.hit&&F.pk.t>=PT[F.pk.pid].hit){ F.pk.hit=true; impact(F,F===P?O:P); if(S.phase!=='fight') return; } if(F.pk&&F.pk.t>=PT[F.pk.pid].end) F.pk=null; }
    if(F.buf&&!F.pk&&F.stagger<=0&&!F.down&&now-F.slipSince>=TUNING.slipActive){ const b=F.buf; F.buf=null; if(now<=b.until) press(F,b.pid,b.low); }
    if(F.buf&&now>F.buf.until) F.buf=null;
    if(F.down&&!F.ko){   /* the count: the player gets up with enough taps, the rival on his own */
      const down=now-F.downAt;
      if(F===P){
        if(F.kdMash>=4+F.kdN*3&&down>=1.2){ F.down=false; F.stagger=.6; stopIsoRagdoll(F); say('Wstałeś z desek! Trzymaj gardę'); }
        else if(down>=3.4){ if(F.kdN===1&&F.kdMash>=2){ F.down=false; F.stagger=.6; stopIsoRagdoll(F); } else { F.down=false; F.ko=true; F.rt.hp=0; endBout(O,'KO'); return; } }
      } else if(down>=2.3+F.kdN*0.45){ F.down=false; F.stagger=.6; stopIsoRagdoll(F); }
    }
  }
  const K=S.keys; let dx=(K.r||0)-(K.l||0), dy=(K.d||0)-(K.u||0);
  const free=!P.pk&&P.stagger<=0&&!P.down&&!P.ko;
  if(S.guardHeld&&free&&!P.rt.guarding&&now-P.slipSince>=TUNING.slipActive) setGuard(P.rt,true,now);
  if(!S.guardHeld&&P.rt.guarding) setGuard(P.rt,false,now);
  if((dx||dy)&&free){
    let di=dx+dy, dj=dy-dx; const l=Math.hypot(di,dj); di/=l; dj/=l;
    const sp=WALK*(0.9+0.1*boxingState.STATS.speed)*(P.rt.guarding?0.5:1)*(now-P.slipSince<TUNING.slipActive?0.3:1);
    walk(P,O,di,dj,sp); P.moving=true; P.mf=di*P.fi+dj*P.fj; P.ms=di*(-P.fj)+dj*P.fi;
  }
  ai(O,P);
  for(const F of [P,O]) if(!F.ko&&!F.down){ if(F.bleed||F.wounds.cuts){ if(Math.random()<0.02) drip(F,'blood'); } else if(F.rt.sta<35&&Math.random()<0.012) drip(F,'sweat'); }
  if(sparringState.rigged&&!S.rigKO&&(P.rt.hp/P.rt.hpMax-O.rt.hp/O.rt.hpMax>.15||now>35)){
    S.rigKO=true; P.rt.hp=0; P.ko=true; P.pk=null; if(!P.rd) startIsoRagdoll(P,O,2,true); S.phase='ko'; S.pt=0; S.winner=O; S.how='KASTET';
    banner('KASTET!',appearanceState.C_RED,150); sfxKO(); setInfo();
  }
}

/** The result card of a brawl: XP, the fight record, the prison's verdict (respect, the turnkey, the list), the wounds. */
function showResult(){
  hideFightPlate();
  const S=state, win=S.winner===S.P, draw=!S.winner, ko=S.how!=='CZAS', O=S.opp, FA=S.P.c, FB=S.O.c, save=progressionState.save, endSta=S.P.rt.sta/S.P.rt.staCap;
  resetSessXP();
  { const st=save.stats, key='fight:'+S.venue+':'+S.idx, today=doneToday(key);
    const xp=fightXP({bare:true,stars:oppStars(O),outcome:win?(ko?'ko':'win'):(draw?'draw':'loss'),simulated:false,today,
      levelGap:(st.str.lvl+st.spd.lvl+st.end.lvl)/3-O.rank,landed:FA.landed,power:FA.power,knockdowns:S.O.kdN,
      evades:FA.evades,counters:FA.counters,minutes:S.elapsed/3600,blocks:FA.blocks,endSta,perfects:FA.perfects||0});
    for(const k of /** @type {('str'|'spd'|'end')[]} */ (['str','spd','end'])) if(xp[k]>0) addXP(k,xp[k]);
    save.train.count[key]=today+1; S.xpToday=today;
    const trial=takeFightTrial(S.idx,S.venue,oppStars(O));   // Profesor's trial on the yard
    S.trial=trial?{name:trial.def.name,task:trial.def.task,passed:trial.def.ok({win,ko,evades:FA.evades,minSta:FA.minSta})}:null;
    if(S.trial?.passed){ const [k,l]=trial.id.split(':'); passTrial(k,+l); } }
  countFight(S.venue+':'+S.idx); recordFight({win,draw,ko,bare:true,opp:O.title,venue:S.venue,how:S.how||''});
  const prisonRows=prisonFightEnd({win,draw,ko,rival:String(O.name).toLowerCase(),stars:oppStars(O),sec:Math.floor(S.elapsed/60),venue:S.venue,opp:S.idx,rigged:S.how==='KASTET',
    stats:{thrown:FA.thrown,landed:FA.landed,taken:FB.landed,minSta:FA.minSta,body:FA.body||0,evades:FA.evades,counters:FA.counters,blocks:FA.blocks,cuts:S.P.wounds.cuts||0,kdTaken:S.P.kdN,cards:false}});
  persist();
  inputState.overTitle.textContent=(win?'WYGRANA':(draw?'REMIS':'PRZEGRANA'))+' — '+S.how+' · bareknuckle';
  const acc=(/** @type {any} */ c)=>c.thrown?Math.round(100*c.landed/c.thrown)+'%':'—';
  inputState.overStats.innerHTML='<span>Rywal</span><span>'+O.title+'</span>'+
    (S.how==='KASTET'?'<span>Oszustwo</span><span><b style="color:#ff6a5a">kastet z łyżki w rękawie — wszyscy widzieli</b></span>':'')+
    '<span>Czas bójki</span><span>'+Math.floor(S.elapsed/60)+' s</span>'+
    '<span>Trafione / rzucone</span><span>'+FA.landed+'/'+FA.thrown+' ('+acc(FA)+') · rywal '+FB.landed+'/'+FB.thrown+' ('+acc(FB)+')</span>'+
    '<span>Mocne ciosy</span><span>'+FA.power+' · rywal '+FB.power+'</span>'+
    '<span>Nokdauny</span><span>'+S.O.kdN+' · rywal '+S.P.kdN+'</span>'+
    '<span>Uniki / bloki</span><span>'+FA.evades+' / '+FA.blocks+' · rywal '+FB.evades+' / '+FB.blocks+'</span>'+
    prisonRows+
    (S.trial?'<span>Próba Profesora</span><span><b class="grade grade-'+(S.trial.passed?'A':'D')+'">'+(S.trial.passed?'ZDANA':'NIEZDANA')+'</b> · '+S.trial.task+'</span>':'')+
    '<span>Czyste momenty</span><span>'+(FA.perfects||0)+' · +'+Math.min(30,3*(FA.perfects||0))+'% XP</span>'+
    '<span>Doświadczenie</span><span>'+sessXPText()+' → '+statShort()+(S.xpToday?' · '+(S.xpToday+1)+'. walka z tym rywalem dziś':'')+'</span>';
  inputState.againFn=()=>startIsoFight(S.idx,S.venue);
  inputState.overEl.hidden=false; inputState.againBtn.focus();
  setInfo();
}

/** Blend two joint sets (functions of the side with .pel, .chest, .head) by k. @param {any} A @param {any} B @param {number} k */
function blendJoints(A,B,k){
  const m=(/** @type {number[]} */ a,/** @type {number[]} */ b)=>lerp3(a,b,k), side=(/** @type {number} */ s)=>{ const a=A(s), b=B(s); return {hip:m(a.hip,b.hip),knee:m(a.knee,b.knee),foot:m(a.foot,b.foot),sh:m(a.sh,b.sh),el:m(a.el,b.el),hd:m(a.hd,b.hd)}; };
  const J={1:side(1),'-1':side(-1)}, f=(/** @type {number} */ s)=>J[s];
  f.pel=m(A.pel,B.pel); f.chest=m(A.chest,B.chest); f.head=m(A.head,B.head);
  return f;
}

/** The joints of a fighter on his feet: stance, steps, punch, slip, guard, flinch, and the body's own secondary motion
 * (the chest and head lag a sudden move, the shoulders turn against the hips with every step, the arms swing). @param {any} F */
function fighterJoints(F){
  const t=state.t, mv=F.moving;
  const sw1=F.ft[1].sw?Math.sin(Math.PI*Math.min(1,F.ft[1].sw)):0, sw2=F.ft[-1].sw?Math.sin(Math.PI*Math.min(1,F.ft[-1].sw)):0;
  const air=Math.max(sw1,sw2), stride=sw1-sw2, hop=Math.max(0,Math.sin(t*9+F.seed))*(air>0?0.4:1);   // stride > 0: the lead foot is in the air, < 0: the rear one
  let bob=-1.1+0.55*hop+0.5*air-(F.rt.sta<25?0.5:0), lean=0.35+F.lagF*0.55+(mv?F.mf*0.3:0), sl=F.lagS*0.65+(mv?F.ms*0.25:0)+stride*0.35, lung=0, e=0, pk=F.pk;
  if(pk){ const T=PT[pk.pid], k=pk.t<T.hit?pk.t/T.hit:Math.max(0,1-(pk.t-T.hit)/(T.end-T.hit)); e=smooth(Math.min(1,k)); lean=0.6*e+F.lagF*0.3; lung=LUNGE[pk.pid]*e; if(pk.pid===3) bob-=0.6*e; if(pk.low) bob-=1.4*e; }
  const su=(t-F.slipSince)/TUNING.slipActive; if(su>=0&&su<=1){ const w=Math.sin(Math.PI*su); sl+=1.6*F.slipDir*w; bob-=1.1*w; }
  const h=Math.min(1,F.hurtT/0.3); lean-=1.5*h*(F.hurtDir?0.6:1); bob-=0.5*h; if(F.stagger>0){ lean-=0.8; bob-=0.6; }
  const J={}, ps=pk?HAND[pk.pid]:0, walkRot=-stride*0.58-F.lagS*0.25, hipRot=stride*0.42, mill=pk?0:(1-F.gUp)*0.2;   // the shoulders turn against the hips
  for(let s=-1;s<=1;s+=2){
    const lead=s===1, fj=footJoint(F,s), ws=-s*0.45*(lead?sw1:sw2);
    const hip=[lung*0.5+0.3+s*hipRot*0.45,s*1.25+sl*0.5+ws,6.9+bob], foot=[fj.fwd+(lead?lung*0.8:0),fj.side,0.9+fj.lift+0.5*hop*(fj.u?0:1)];
    const knee=[(hip[0]+foot[0])/2+1.5,(hip[1]+foot[1])/2+s*0.35,(hip[2]+foot[2])/2+0.2];
    const twist=pk?(s===ps?1.0:-0.6)*e:0, sh=[0.1+lean+lung+twist+s*walkRot,s*2.7+sl,12.4+bob+s*walkRot*0.3];
    const armSw=-s*stride*0.45+F.lagF*0.35, ma=t*5.5+F.seed+(s>0?0:Math.PI);
    let el=[1.0+lean+lung+armSw*0.5+s*walkRot*0.4,s*2.6+sl+F.lagS*0.2,10.9+bob-0.2*Math.abs(armSw)];
    let hd=[2.3+lean+lung+armSw*0.85+s*walkRot*0.5+Math.cos(ma)*mill,s*1.25+sl+F.lagS*0.25,14.0+bob+0.35*armSw+Math.sin(ma)*mill];
    if(F.gUp>0.02){ el=lerp3(el,[1.5+lean,s*2.0+sl,10.4+bob],F.gUp); hd=lerp3(hd,[3.1+lean,s*0.9+sl,14.6+bob],F.gUp); }
    if(pk&&s===ps){ const Rr=REACH[pk.pid](s), dz=pk.low?-4.4:0;
      el=lerp3(el,[Rr[0][0]+lean+lung,Rr[0][1]+sl,Rr[0][2]+bob+dz*0.6],e); hd=lerp3(hd,[Rr[1][0]+lean+lung,Rr[1][1]+sl,Rr[1][2]+bob+dz],e); }
    J[s]={hip,knee,foot,sh,el,hd};
  }
  const jf=(/** @type {number} */ s)=>J[s];
  jf.pel=[lung*0.5-F.lagF*0.2,sl*0.5-F.lagS*0.2,6.6+bob]; jf.chest=[0.4+lean+lung*0.9,sl,12.2+bob];
  jf.head=[0.35+lean*1.2+lung+F.hLagF*0.55,sl*1.25+F.hLagS*0.65,15.6+bob-(F.stagger>0?0.6:0)-Math.abs(F.hLagF)*0.18];
  return jf;
}

/** Draw one fighter as the hub figure: on his feet, getting up (from the ragdoll's last pose to his stance) or as a ragdoll on the boards. @param {any} F */
function drawFighter(F){
  if((F.ko||F.down)&&F.rd){ figureHD(F,ragdollJoints(F),F.look,{pose:0,base:0,noShadow:true,light:true,tilt:true}); return; }
  let jf=fighterJoints(F);
  if(F.rise){ jf=blendJoints(F.rise.joints,jf,smooth(Math.min(1,F.rise.t))); }
  figureHD(F,jf,F.look,{pose:0,base:0,noShadow:!!F.rise,light:true,tilt:!!F.rise});
}

/** The picture font has capitals, digits and a few marks only. @param {string} s */
function plain(s){ return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l').replace(/[·—–]/g,'-').toUpperCase(); }

/** Native-pixel rectangle in the 2× frame. @param {number} x @param {number} y @param {number} w @param {number} h @param {number} c */
function rect(x,y,w,h,c){ const K=gymState.ISO_K, W=appearanceState.W, fb=rendererState.fb; for(let yy=y*K;yy<(y+h)*K;yy++) for(let xx=x*K;xx<(x+w)*K;xx++){ if(xx<0||yy<0||xx>=W||yy>=appearanceState.H) continue; fb[yy*W+xx]=c; } }

/** A health and breath bar with a dark frame. @param {number} x @param {number} y @param {number} w @param {any} F @param {boolean} right */
function bars(x,y,w,F,right){
  const A=appearanceState, hp=F.rt.hp/F.rt.hpMax, sta=F.rt.sta/F.rt.staCapInitial, cap=F.rt.staCap/F.rt.staCapInitial;
  rect(x-1,y-1,w+2,9,A.C_OUT);
  const fill=(/** @type {number} */ yy,/** @type {number} */ hh,/** @type {number} */ k,/** @type {number} */ c)=>{ const n=Math.round(w*Math.max(0,Math.min(1,k))); rect(right?x+w-n:x,yy,n,hh,c); };
  fill(y,4,hp,A.C_RED);
  rect(x,y+5,w,3,0xff2a2418); fill(y+5,3,cap,0xff4a4230); fill(y+5,3,sta,A.C_SPARK);
}

/** Boxing stance, body units [forward, side]: the lead foot (side +1) in front, the rear one behind, wide apart. */
const STANCE={1:[1.5,1.7],'-1':[-1.3,-1.7]};
const SWING=7, STEP_AT=0.17, STEP_LEAD=0.28;

/** World position of a body-local point of fighter F. @param {any} F @param {number} fwd @param {number} side */
function world(F,fwd,side){ return {i:F.i+(fwd*F.fi-side*F.fj)/7.5,j:F.j+(fwd*F.fj+side*F.fi)/7.5}; }
/** Where foot s belongs under the body now. @param {any} F @param {number} s */
function stance(F,s){ const [f,sd]=STANCE[s]; return world(F,f,sd); }

/** Footwork: the feet stay planted; the foot on the side we are going to steps first, the other one drags into the stance
 * (forward: lead foot, back: rear foot, left or right: the foot on that side). Only one foot is in the air at a time. @param {any} F */
function tickFeet(F){
  const vi=F.i-F.li, vj=F.j-F.lj; F.li=F.i; F.lj=F.j;
  { // the chest and head lag a change of speed (start, stop, a shove, a slip): springs driven by the acceleration, so steady walking leaves no lean behind
    const vf=(vi*F.fi+vj*F.fj)*7.5, vs=(vi*-F.fj+vj*F.fi)*7.5, af=vf-F.pvf, as=vs-F.pvs; F.pvf=vf; F.pvs=vs;
    const su=(state.t-F.slipSince)/TUNING.slipActive, kick=su>=0&&su<0.2?-F.slipDir*0.1:0;
    F.lagVF+=(-af*2.6-F.lagF*0.28)-F.lagVF*0.34; F.lagVS+=(-as*2.6+kick-F.lagS*0.28)-F.lagVS*0.34;
    F.lagF=Math.max(-1.4,Math.min(1.4,F.lagF+F.lagVF)); F.lagS=Math.max(-1.4,Math.min(1.4,F.lagS+F.lagVS));
    F.hLagF+=(F.lagF*1.25-vf*0.4-F.hLagF)*0.22; F.hLagS+=(F.lagS*1.25-vs*0.4-F.hLagS)*0.22;
  }
  const sp=Math.hypot(vi,vj), mi=sp>1e-4?vi/sp:0, mj=sp>1e-4?vj/sp:0;
  const A=F.ft[1], B=F.ft[-1];
  for(const s of [1,-1]){ const f=F.ft[s];
    if(f.sw>0){ f.sw+=1/SWING; const T=stance(F,s); f.to={i:T.i+mi*STEP_LEAD*(sp>0.01?1:0),j:T.j+mj*STEP_LEAD*(sp>0.01?1:0)};
      if(f.sw>=1){ f.sw=0; f.i=f.to.i; f.j=f.to.j; } } }
  if(A.sw>0||B.sw>0||F.ko) return;
  const cand=[];
  for(const s of [1,-1]){ const f=F.ft[s], T=stance(F,s), di=f.i-T.i, dj=f.j-T.j, along=di*mi+dj*mj, perp=Math.hypot(di-along*mi,dj-along*mj), d=along<0?Math.hypot(along,perp):perp;   /* a foot already ahead of its place is not late */
    if(Math.hypot(di,dj)>1.4){ f.i=T.i; f.j=T.j; continue; }
    cand.push({s,d,score:(STANCE[s][0]*(mi*F.fi+mj*F.fj)+STANCE[s][1]*(mi*-F.fj+mj*F.fi))+d});
  }
  if(!cand.some(c=>c.d>STEP_AT)) return;   /* one foot is late: of the two that are at all behind, the one on the side of the move goes first */
  cand.splice(0,cand.length,...cand.filter(c=>c.d>STEP_AT*0.45));
  cand.sort((a,b)=>b.score-a.score);
  const f=F.ft[cand[0].s]; f.sw=1/SWING; f.from={i:f.i,j:f.j}; const T=stance(F,cand[0].s); f.to={i:T.i+mi*STEP_LEAD,j:T.j+mj*STEP_LEAD};
}

/** Foot s of F as a body-local joint [forward, side, height] and its air progress 0..1. @param {any} F @param {number} s */
function footJoint(F,s){
  const f=F.ft[s]; let i=f.i, j=f.j, lift=0, u=0;
  if(f.sw>0&&f.from){ u=Math.min(1,f.sw); const e=u*u*(3-2*u); i=f.from.i+(f.to.i-f.from.i)*e; j=f.from.j+(f.to.j-f.from.j)*e; lift=2.3*Math.sin(Math.PI*u); }
  const di=(i-F.i)*7.5, dj=(j-F.j)*7.5;
  return {fwd:di*F.fi+dj*F.fj,side:di*-F.fj+dj*F.fi,lift,u};
}

/* RAGDOLL. A knocked-down fighter is a Verlet skeleton in room space (i, j in tiles, z in body units): 11 nodes joined by the bones he
   was standing with, falling under gravity onto the boards and sliding against the walls and furniture (hubBlocked). The pelvis
   carries the fighter's position, so the camera, the speech bubbles and the depth sorter keep working.
   Nodes: 0 pelvis, 1 chest, 2 head, 3 knee, 4 foot, 5 knee, 6 foot, 7 elbow, 8 hand, 9 elbow, 10 hand (3-4 and 7-8 are side +1). */
const RD_PAIRS=[[0,1],[1,2],[0,3],[3,4],[0,5],[5,6],[1,7],[7,8],[1,9],[9,10],[0,2],[3,5]];   // the last two only push apart (spine-head, knees)
const RD_RAD=[1.4,1.6,1.5,0.9,0.8,0.9,0.8,0.8,0.7,0.8,0.7];
const RD_GRAV=0.07;

/** Put a fighter into the ragdoll from the pose he stands in, with the blow's push (away from attacker A). @param {any} F @param {any} A @param {number} pid @param {boolean} ko */
function startIsoRagdoll(F,A,pid,ko){
  const J=fighterJoints(F), a=J(1), b=J(-1), loc=[J.pel,J.chest,J.head,a.knee,a.foot,b.knee,b.foot,a.el,a.hd,b.el,b.hd];
  let af=-1, as=0; if(A){ const [ui,uj]=toward(A,F); af=ui*F.fi+uj*F.fj; as=ui*-F.fj+uj*F.fi; }
  const sp=ko?0.55:0.38, kick=pid===3?0.3:0.1;
  const nodes=loc.map(([f,s,z],k)=>{
    const w=world(F,f,s), m=k===2?1.35:k===1?0.95:k===0?0.45:k>=7?1.1:0.15;
    const vf=af*sp*m+rnd(-0.03,0.03), vs=as*sp*m+rnd(-0.03,0.03), vi=(vf*F.fi-vs*F.fj)/7.5, vj=(vf*F.fj+vs*F.fi)/7.5, vz=k<=2?kick*m:0;
    return {i:w.i,j:w.j,z,pi:w.i-vi,pj:w.j-vj,pz:z-vz};
  });
  const len=RD_PAIRS.map(([p,q],k)=>{ const d=Math.hypot(loc[q][0]-loc[p][0],loc[q][1]-loc[p][1],loc[q][2]-loc[p][2]); return k>=10?d*0.85:d; });
  F.rd={nodes,len,thud:false}; F.rise=null;
}

/** One 60 Hz step of the ragdoll. @param {any} F */
function stepIsoRagdoll(F){
  const N=F.rd.nodes, L=F.rd.len;
  for(const n of N){ const vi=(n.i-n.pi)*0.97, vj=(n.j-n.pj)*0.97, vz=(n.z-n.pz)*0.97-RD_GRAV; n.pi=n.i; n.pj=n.j; n.pz=n.z; n.i+=vi; n.j+=vj; n.z+=vz; }
  for(let it=0;it<4;it++){
    for(let b=0;b<RD_PAIRS.length;b++){
      const A=N[RD_PAIRS[b][0]], B=N[RD_PAIRS[b][1]], dx=(B.i-A.i)*7.5, dy=(B.j-A.j)*7.5, dz=B.z-A.z, d=Math.hypot(dx,dy,dz)||1e-4;
      if(b>=10&&d>=L[b]) continue;
      const k=(L[b]-d)/d*0.5;
      A.i-=dx*k/7.5; A.j-=dy*k/7.5; A.z-=dz*k; B.i+=dx*k/7.5; B.j+=dy*k/7.5; B.z+=dz*k;
    }
    for(const [h,kn,ft] of [[0,3,4],[0,5,6]]){ const zm=Math.max(N[h].z,N[ft].z)+1.4; if(N[kn].z>zm) N[kn].z=zm; }   // a knee never folds high above the hip and foot
    for(let k=0;k<N.length;k++){
      const n=N[k];
      if(n.z<RD_RAD[k]){
        const vz=n.z-n.pz, vi=n.i-n.pi, vj=n.j-n.pj;
        n.z=RD_RAD[k]; n.pz=n.z+vz*0.2; n.pi=n.i-vi*0.76; n.pj=n.j-vj*0.76;
        if(!F.rd.thud&&k===1&&vz<-0.45){ F.rd.thud=true; sfxLand(Math.min(1.5,-vz*1.3)); boxingState.shakeT=boxingState.shakeDur=5; boxingState.shakeAmp=1; boxingState.shakeAxis=1; }   // the first heavy landing of the chest
      }
      if(hubBlocked(n.i,n.j)){ if(!hubBlocked(n.pi,n.pj)){ n.i=n.pi; n.j=n.pj; } else { n.pi=n.i; n.pj=n.j; } }
    }
  }
  const pel=N[0]; if(!hubBlocked(pel.i,pel.j)){ F.i=pel.i; F.j=pel.j; F.li=F.i; F.lj=F.j; }
}

/** The ragdoll as joints in the body coordinates figureHD draws; the hip and shoulder lines follow the spine. @param {any} F */
function ragdollJoints(F){
  const N=F.rd.nodes, loc=(/** @type {any} */ n)=>{ const di=(n.i-F.i)*7.5, dj=(n.j-F.j)*7.5; return [di*F.fi+dj*F.fj,di*-F.fj+dj*F.fi,n.z]; };
  const pel=loc(N[0]), chest=loc(N[1]), head=loc(N[2]);
  let ux=chest[0]-pel[0], uy=chest[1]-pel[1], uz=chest[2]-pel[2]; const ul=Math.hypot(ux,uy,uz)||1; ux/=ul; uy/=ul; uz/=ul;
  let sx=-uy*ux, sy=1-uy*uy, sz=-uy*uz, sl=Math.hypot(sx,sy,sz); if(sl<0.2){ sx=1-ux*ux; sy=-ux*uy; sz=-ux*uz; sl=Math.hypot(sx,sy,sz)||1; } sx/=sl; sy/=sl; sz/=sl;   // the body's side made square to the spine
  const at=(/** @type {number[]} */ o,/** @type {number} */ k)=>[o[0]+sx*k,o[1]+sy*k,o[2]+sz*k];
  const side=(/** @type {number} */ s,/** @type {number} */ kn,/** @type {number} */ ft,/** @type {number} */ el,/** @type {number} */ hd)=>({hip:at(pel,s*1.25),knee:loc(N[kn]),foot:loc(N[ft]),sh:at(chest,s*2.7),el:loc(N[el]),hd:loc(N[hd])});
  const J={1:side(1,3,4,7,8),'-1':side(-1,5,6,9,10)}, f=(/** @type {number} */ s)=>J[s];
  f.pel=pel; f.chest=chest; f.head=head;
  return f;
}

/** Back on his feet where he lay: the pose he got up from fades into his stance. @param {any} F */
function stopIsoRagdoll(F){
  if(!F.rd) return;
  F.rise={joints:ragdollJoints(F),t:0}; F.rd=null; F.li=F.i; F.lj=F.j;
  for(const s of [1,-1]) Object.assign(F.ft[s],stance(F,s),{sw:0,from:null,to:null});
}

const BLOOD=rgb('#7a121a'), BLOOD_DRY=rgb('#38090e'), BLOOD_HI=rgb('#98222b');
const SWEAT_MIST=rgb('#586a74'), SWEAT_DROP=rgb('#7c909a'), SWEAT_FLOOR=rgb('#181a1e');
const rnd=(/** @type {number} */ a,/** @type {number} */ b)=>a+Math.random()*(b-a);

/** Throw mist, heavy sweat and blood away from the attacker: a fine mist on every clean hit, drops from the harder punches, blood once the face is wrecked, a spatter on a knockout.
 * @param {any} A @param {any} D @param {number} pid @param {boolean} low @param {boolean} blocked @param {{damage:number,counter:boolean}} o @param {boolean} [ko] */
function spray(A,D,pid,low,blocked,o,ko){
  const [ui,uj]=toward(A,D), si=-uj, sj=ui, z0=low?9.5:14.6, hpF=D.rt.hp/D.rt.hpMax, swing=pid===2?1:0, heavy=pid>=1||o.counter||!!ko;
  const fire=(/** @type {'mist'|'sweat'|'blood'} */ kind,/** @type {number} */ n,/** @type {number} */ power)=>{
    const mist=kind==='mist';
    for(let k=0;k<n;k++){
      const along=rnd(mist?0.25:0.45,mist?0.85:1.25)*power, across=rnd(-0.85,0.85)*(0.8+swing*0.5)*power+swing*0.55*power, sp=mist?0.016:0.021;
      state.parts.push({kind,i:D.i+ui*0.08+rnd(-0.04,0.04),j:D.j+uj*0.08+rnd(-0.04,0.04),z:z0+rnd(-0.8,0.8),vi:(ui*along+si*across)*sp,vj:(uj*along+sj*across)*sp,
        vz:pid===3&&!low?rnd(0.45,0.95)*power:rnd(0.15,0.65)*(0.5+power*0.45),size:kind==='blood'&&heavy&&Math.random()<0.28?2:1,
        age:0,maxAge:mist?10+(Math.random()*8|0):999,creep:0,host:null,df:0,ds:0,pi:D.i,pj:D.j,pz:z0}); } };
  if(blocked){ fire('mist',2,0.55); return; }
  fire('mist',3+pid*2+(o.counter?2:0),0.85+pid*0.15);
  if(heavy) fire('sweat',2+pid+(o.counter?2:0),0.95+pid*0.18);
  if(!low&&!ko&&((pid>=1&&(hpF<0.78||o.counter))||hpF<0.48||o.damage>=9)){ D.bleed=true; fire('blood',3+pid*3+(o.counter?4:0),1+0.18*pid); }
  if(ko){ D.bleed=true; fire('mist',8,1.3); fire('sweat',6,1.25); fire('blood',16,1.45); }
}

/** A drop that creeps down the face first (a cut that keeps bleeding, a tired sweat) and only then lets go. @param {any} F @param {'sweat'|'blood'} kind */
function drip(F,kind){
  const df=rnd(0.14,0.21), ds=rnd(-0.08,0.08), z=kind==='blood'?rnd(13.2,14.4):rnd(13.8,15), i=F.i+F.fi*df-F.fj*ds, j=F.j+F.fj*df+F.fi*ds;
  state.parts.push({kind,i,j,z,vi:F.fi*0.002,vj:F.fj*0.002,vz:0,size:1,age:0,maxAge:999,creep:14+(Math.random()*8|0),host:F,df,ds,pi:i,pj:j,pz:z});
}

/** Fly the mist and the drops; a fast drop splashes small on the boards; blood that lands stays as a stain, sweat leaves a faint wet spot. */
function tickParts(){
  const S=state, live=[], [bw,bh]=hubBounds();
  for(const p of S.parts){
    p.age++; p.pi=p.i; p.pj=p.j; p.pz=p.z;
    if(p.creep>0&&p.host&&!p.host.ko&&!p.host.down){   // the viscous phase: it slides down the cheek and chin with the head
      p.creep--; p.i=p.host.i+p.host.fi*p.df-p.host.fj*p.ds; p.j=p.host.j+p.host.fj*p.df+p.host.fi*p.ds; p.z-=0.07; live.push(p); continue; }
    if(p.kind==='mist'){ p.vi*=0.85; p.vj*=0.85; p.vz=p.vz*0.9-0.016; p.i+=p.vi; p.j+=p.vj; p.z+=p.vz; if(p.age<p.maxAge&&p.z>0) live.push(p); continue; }
    p.vi*=0.96; p.vj*=0.96; p.vz-=0.044; p.i+=p.vi; p.j+=p.vj; p.z+=p.vz;
    if(p.z<=0){
      if(p.i>0.35&&p.j>0.35&&p.i<bw-0.35&&p.j<bh-0.35){
        if(p.kind==='blood'||Math.random()<0.45) stain(p);
        if(p.vz<-0.26&&p.age<60) for(let q=p.kind==='blood'?(p.size>1?3:2):1;q>0;q--){ const a=rnd(0,6.283), sp=rnd(0.004,0.011);
          live.push({kind:p.kind==='blood'?'blood':'mist',i:p.i,j:p.j,z:0.15,vi:Math.cos(a)*sp,vj:Math.sin(a)*sp,vz:rnd(0.1,0.22),size:1,age:0,maxAge:7+(Math.random()*5|0),creep:0,host:null,df:0,ds:0,pi:p.i,pj:p.j,pz:0.15}); }
      }
      continue;
    }
    if(p.age<p.maxAge) live.push(p);
  }
  S.parts=live;
}

/** A floor mark: a compact core with a few droplets along the way the drop was flying. @param {any} p */
function stain(p){
  const S=state, blood=p.kind==='blood', sp=Math.hypot(p.vi,p.vj), l=sp||1, di=p.vi/l, dj=p.vj/l, big=blood?rnd(0.038,0.072)*(p.size*0.45+0.55):rnd(0.025,0.042);
  const blobs=[{di:0,dj:0,r:big}], n=blood?(sp>0.012?2+(Math.random()*2|0):(Math.random()*2|0)):0;
  for(let k=1;k<=n;k++){ const d=k*rnd(0.045,0.1); blobs.push({di:di*d+rnd(-0.02,0.02),dj:dj*d+rnd(-0.02,0.02),r:big*rnd(0.28,0.52)}); }
  S.decals.push({i:p.i,j:p.j,t0:S.t,blood,blobs});
  if(S.decals.length>260) S.decals.shift();
}

/** Floor marks under the people, drawn into the room before the furniture and lighting; the edges are dithered, not outlined. */
function drawDecals(){
  const S=state, K=gymState.ISO_K, W=appearanceState.W, H=appearanceState.H, fb=rendererState.fb, bay=gymState.BAYER;
  for(const d of S.decals){
    const age=S.t-d.t0;
    for(const b of d.blobs){
      const cx=isoX(d.i+b.di,d.j+b.dj), cy=isoY(d.i+b.di,d.j+b.dj,0), rx=Math.max(1,b.r*7.5*K), ry=Math.max(0.6,rx*0.5);
      for(let y=Math.floor(cy-ry);y<=Math.ceil(cy+ry);y++) for(let x=Math.floor(cx-rx);x<=Math.ceil(cx+rx);x++){
        if(x<0||y<0||x>=W||y>=H) continue; const u=(x-cx)/rx, v=(y-cy)/ry, q=u*u+v*v; if(q>1||(q>0.62&&bay[(y&3)*4+(x&3)]>10)) continue; const k=y*W+x;
        if(d.blood){ const dry=Math.min(1,age/28), base=mix(BLOOD,BLOOD_DRY,dry), c=(age<4&&q<0.35)?mix(base,BLOOD_HI,0.35*(1-age/4)):base; fb[k]=mix(fb[k],c,0.82); }
        else fb[k]=mix(fb[k],SWEAT_FLOOR,0.28*Math.max(0,1-age/5));
      }
    }
  }
  S.decals=S.decals.filter(d=>d.blood||S.t-d.t0<5);
}

/** The mist and drops in the air, over the fighters: single muted pixels, no white fringe. */
function drawParts(){
  const W=appearanceState.W, H=appearanceState.H, fb=rendererState.fb, tick=boxingState.tick;
  const px=(/** @type {number} */ x,/** @type {number} */ y,/** @type {number} */ c)=>{ if(x>=0&&y>=0&&x<W&&y<H) fb[y*W+x]=c; };
  for(const p of state.parts){
    const x=Math.round(isoX(p.i,p.j)), y=Math.round(isoY(p.i,p.j,p.z)), fast=p.creep===0&&Math.hypot(p.vi,p.vj)>0.014, tail=()=>[Math.round(isoX(p.pi,p.pj)),Math.round(isoY(p.pi,p.pj,p.pz))];
    if(p.kind==='mist'){ if(p.maxAge-p.age>4||((x+y+tick)&1)) px(x,y,SWEAT_MIST); }
    else if(p.kind==='sweat'){ px(x,y,SWEAT_DROP); if(fast&&p.pz>0){ const [tx,ty]=tail(); px(tx,ty,SWEAT_MIST); } }
    else { if(fast&&p.pz>0){ const [tx,ty]=tail(); px(tx,ty,BLOOD_DRY); } px(x,y,BLOOD); if(p.size>1){ px(x+1,y,BLOOD_DRY); px(x,y+1,BLOOD); } }
  }
}

/** Zoom on the fighters: close in on the pair, wider only when they part; the centre follows with a lag. */
function camera(){
  const S=state, C=S.cam, K=gymState.ISO_K, W=appearanceState.W, H=appearanceState.H, P=S.P, O=S.O;
  const px=isoX(P.i,P.j), py=isoY(P.i,P.j,9), ox=isoX(O.i,O.j), oy=isoY(O.i,O.j,9);
  const need=Math.max(Math.abs(px-ox)+70*K,(Math.abs(py-oy)+60*K)*1.5), zt=need>W/2?Math.max(1.3,W/need):2;
  if(C.init){ C.init=false; C.z=zt; C.x=(px+ox)/2; C.y=(py+oy)/2+4*K; }
  C.z+=(zt-C.z)*0.08; const z=Math.abs(C.z-2)<0.03?2:C.z;
  const tx=(px+ox)/2, ty=(py+oy)/2+4*K;
  C.x+=(tx-C.x)*0.1; C.y+=(ty-C.y)*0.1;
  const cx=Math.round(Math.max(W/(2*z),Math.min(W-W/(2*z),C.x))), cy=Math.round(Math.max(H/(2*z),Math.min(H-H/(2*z),C.y)));
  zoomBlit(z,cx,cy);
}

/** Frame: the room with both fighters, bars, sparks and the notice. Called inside the 2× frame. */
export function renderIsoFight(){
  const S=state; if(!S.on) return;
  renderHub();   /* the fighters are actors of the room's own depth sorter */
  const K=gymState.ISO_K, W=appearanceState.W/K;
  drawParts();
  if(S.phase==='intro'||S.phase==='fight') marker(S.P);
  camera();
  bars(6,6,60,S.P,false); bars(W-66,6,60,S.O,true);
  drawText('TY',6*K+8*K,17*K,appearanceState.C_WHITE,1); drawText(plain(String(S.opp.name)),(W-6)*K-(String(S.opp.name).length*2)*K,17*K,appearanceState.C_WHITE,1);
  if(S.notice) drawText(plain(S.notice),(W/2)*K,(192/K-12)*K,appearanceState.C_WHITE,1);
  if(S.banner){ const b=S.banner; if(b.t>8||(b.t&2)) drawText(b.text,W/2*K,56*K,b.color,2); }
}

/** A small arrow over the player's head, so the two can be told apart. @param {any} F */
function marker(F){
  const K=gymState.ISO_K, x=Math.round(isoX(F.i,F.j)), y=Math.round(isoY(F.i,F.j,22))-((boxingState.tick>>3)&1)*K;
  for(let r=0;r<3;r++) for(let dx=-r;dx<=r;dx++) rect(x/K+dx|0,y/K+(2-r),1,1,appearanceState.C_SPARK);
}

/** Text for the info line below the picture. */
export function isoFightInfo(){
  const S=state, V=S.venue, where=V==='yard'?'BÓJKA NA SPACERNIAKU':V==='canteen'?'BÓJKA PRZY POSIŁKU':V==='laznia'?'BÓJKA W ŁAŹNI':'BÓJKA W WARDZIE';
  return where+' · '+(S.opp?S.opp.title:'')+' · '+(S.phase==='end'||S.phase==='ko'?'KONIEC':'DO KO');
}
export const CONTROLS='strzałki / WASD ruch · 1 jab · 2 cross · 3 hook · 4 uppercut · Shift korpus · Spacja blok · Q slip · F10 pauza · Esc wyjście';

````

---

## `src/realtime-rules.js`

````js
// @ts-check

/** Seconds and stamina costs shared by the realtime controller and its rules. */
export const TUNING=Object.freeze({
  repeatReset:2.4, repeatStep:.45,
  comboWindow:1.1, comboStep:.15,
  regen:10.5, regenDelayJab:.45, regenDelayPower:.65, whiffDelay:.3, whiffCost:3,
  guardDrain:7, guardAbsorbCost:1.15, blockChip:.15,
  guardPerfect:.14, guardRearm:.3, parryCost:12, parryCounterDuration:.6, parryCounterPower:1.35,
  slipCost:8, slipCooldown:.65, slipActive:.35, slipPerfect:.18, slipVulnerable:.65,
  counterDuration:.9, counterPower:1.55, failedSlipPower:1.35,
  lowStaThreshold:25, lowStaCostMult:1.3, staCapWear:.04, staCapFloor:.4,
  bodyHpMult:.75, bodyStaDrain:1.4, bodyCapDrain:.25
});

/** Stamina required by jab, cross, hook and uppercut before repeat and combo penalties. */
export const PUNCH_COST=Object.freeze([6,10,14,18]);
/** Health damage before strength, hunger and defensive reactions. */
export const PUNCH_DAMAGE=Object.freeze([4.5,8,10.5,13.5]);

/**
 * Create independent, transient combat state; all timestamps use simulation seconds.
 * @param {{hpMax?:number,staCap?:number,pow?:number,regen?:number,hunger?:number}} [spec]
 */
export function createCombatant({hpMax=125,staCap=100,pow=1,regen=1,hunger=0}={}){
  hpMax=Math.max(1,hpMax);staCap=Math.max(0,staCap);
  return {hp:hpMax,hpMax,sta:staCap,staCap,staCapInitial:staCap,pow:Math.max(0,pow),regen:Math.max(0,regen),hunger:Math.max(0,hunger),
    guarding:false,guardSince:-Infinity,guardReadyAt:-Infinity,
    slipSince:-Infinity,slipReadyAt:-Infinity,counterUntil:-Infinity,counterMult:/** @type {number} */(TUNING.counterPower),punchCounter:false,
    regenReadyAt:-Infinity,lastActionAt:-Infinity,comboCount:0,
    punchLast:[-Infinity,-Infinity,-Infinity,-Infinity],punchRepeats:[0,0,0,0]};
}
/** @typedef {ReturnType<typeof createCombatant>} Combatant */

/**
 * Advance resource recovery or held guard drain, pausing recovery right after throwing a punch.
 * @param {Combatant} f @param {number} dt @param {number} now
 */
export function tickCombatant(f,dt,now){
  if(!Number.isFinite(dt)||dt<=0||!Number.isFinite(now))return;
  if(f.guarding){
    f.sta=Math.max(0,f.sta-dt*TUNING.guardDrain);
    return;
  }
  if(now<f.regenReadyAt)return;
  f.sta=Math.max(0,Math.min(f.staCap,f.sta+dt*TUNING.regen*f.regen));
}

/**
 * Quote the next punch cost without changing repeat history; includes same-punch repeat, combo chain and low-stamina penalty.
 * @param {Combatant} f @param {number} pid @param {number} now
 */
export function punchCost(f,pid,now){
  if(!Number.isInteger(pid)||pid<0||pid>=PUNCH_COST.length)return Infinity;
  const repeats=now>=f.punchLast[pid]+TUNING.repeatReset?0:f.punchRepeats[pid];
  const chain=now>=f.lastActionAt+TUNING.comboWindow?0:f.comboCount;
  const tired=f.sta<TUNING.lowStaThreshold?TUNING.lowStaCostMult:1;
  return PUNCH_COST[pid]*(1+TUNING.repeatStep*repeats+TUNING.comboStep*chain)*tired;
}

/**
 * Spend stamina, wear down staCap slightly, pause breath recovery and commit repeat/combo history.
 * @param {Combatant} f @param {number} pid @param {number} now
 */
export function beginPunch(f,pid,now){
  const cost=punchCost(f,pid,now);
  if(f.hp<=0||!Number.isFinite(now)||!Number.isFinite(cost)||f.sta<cost)return false;
  f.sta=Math.max(0,f.sta-cost);
  const floor=(f.staCapInitial||100)*TUNING.staCapFloor;
  f.staCap=Math.max(floor,f.staCap-cost*TUNING.staCapWear);
  if(f.sta>f.staCap)f.sta=f.staCap;
  f.punchCounter=now<f.counterUntil;f.counterUntil=-Infinity;
  f.punchRepeats[pid]=now>=f.punchLast[pid]+TUNING.repeatReset?1:f.punchRepeats[pid]+1;
  f.punchLast[pid]=now;
  f.comboCount=now>=f.lastActionAt+TUNING.comboWindow?1:f.comboCount+1;
  f.lastActionAt=now;
  const delay=pid===0?TUNING.regenDelayJab:TUNING.regenDelayPower;
  f.regenReadyAt=Math.max(f.regenReadyAt,now+delay);
  return true;
}

/**
 * Extra breath penalty when a thrown punch misses out of range (whiff).
 * @param {Combatant} f @param {number} now
 */
export function whiffPunch(f,now){
  f.punchCounter=false;
  f.sta=Math.max(0,f.sta-TUNING.whiffCost);
  f.regenReadyAt=Math.max(f.regenReadyAt,now+TUNING.whiffDelay);
}

/**
 * Begin the ideal guard window on a fresh press, with a short rearm cooldown.
 * @param {Combatant} f @param {boolean} held @param {number} now
 */
export function setGuard(f,held,now){
  if(f.guarding===held)return;
  f.guarding=held;
  if(!held)return;
  f.guardSince=now>=f.guardReadyAt?now:-Infinity;
  if(Number.isFinite(f.guardSince))f.guardReadyAt=now+TUNING.guardRearm;
}

/**
 * Start a slip when its stamina cost and cooldown permit it.
 * @param {Combatant} f @param {number} now
 */
export function beginSlip(f,now){
  if(f.hp<=0||!Number.isFinite(now)||now<f.slipReadyAt||f.sta<TUNING.slipCost)return false;
  f.sta=Math.max(0,f.sta-TUNING.slipCost);
  f.slipSince=now;f.slipReadyAt=now+TUNING.slipCooldown;
  f.regenReadyAt=Math.max(f.regenReadyAt,now+.25);
  setGuard(f,false,now);
  return true;
}

/**
 * Resolve contact once. Body shots sap stamina and ceiling; held blocks take minor chip damage; parries open a short counter window.
 * @param {Combatant} attacker @param {Combatant} defender
 * @param {{pid:number,low?:boolean,now:number}} blow
 * @returns {{kind:'hit'|'block'|'parry'|'slip',damage:number,counter:boolean,failedSlip:boolean}}
 */
export function resolvePunch(attacker,defender,{pid,low=false,now}){
  const counter=attacker.punchCounter;
  const cMult=counter?(attacker.counterMult||TUNING.counterPower):1;
  attacker.punchCounter=false;
  attacker.counterMult=TUNING.counterPower;
  if(!Number.isInteger(pid)||pid<0||pid>=PUNCH_DAMAGE.length)return {kind:'hit',damage:0,counter,failedSlip:false};

  const slipAge=now-defender.slipSince;
  if(slipAge>=0&&slipAge<=TUNING.slipPerfect){
    defender.counterUntil=now+TUNING.counterDuration;
    defender.counterMult=TUNING.counterPower;
    return {kind:'slip',damage:0,counter,failedSlip:false};
  }
  const failedSlip=slipAge>TUNING.slipPerfect&&slipAge<TUNING.slipVulnerable;
  let rawDamage=Math.max(1,PUNCH_DAMAGE[pid]*attacker.pow-attacker.hunger)*cMult*(failedSlip?TUNING.failedSlipPower:1);
  let damage=rawDamage*(low?TUNING.bodyHpMult:1);

  /** @type {'hit'|'block'|'parry'|'slip'} */
  let kind='hit';
  if(defender.guarding&&defender.sta>0){
    const guardAge=now-defender.guardSince;
    if(guardAge>=0&&guardAge<=TUNING.guardPerfect){
      attacker.sta=Math.max(0,attacker.sta-TUNING.parryCost);
      attacker.regenReadyAt=Math.max(attacker.regenReadyAt,now+.5);
      defender.guardSince=-Infinity;
      defender.counterUntil=now+TUNING.parryCounterDuration;
      defender.counterMult=TUNING.parryCounterPower;
      return {kind:'parry',damage:0,counter,failedSlip};
    }
    kind='block';
    const chip=damage*TUNING.blockChip;
    const blockable=damage-chip;
    const staNeeded=blockable*TUNING.guardAbsorbCost;
    const staSpent=Math.min(defender.sta,staNeeded);
    defender.sta=Math.max(0,defender.sta-staSpent);
    const unblocked=blockable*(1-staSpent/(staNeeded||1));
    damage=chip+unblocked;
  } else if(low){
    // Czysty cios na korpus pali kondycję i obniża pułap tlenowy obrońcy
    const floor=(defender.staCapInitial||100)*TUNING.staCapFloor;
    defender.sta=Math.max(0,defender.sta-rawDamage*TUNING.bodyStaDrain);
    defender.staCap=Math.max(floor,defender.staCap-rawDamage*TUNING.bodyCapDrain);
    if(defender.sta>defender.staCap)defender.sta=defender.staCap;
    defender.regenReadyAt=Math.max(defender.regenReadyAt,now+.55);
  }

  damage=Math.min(defender.hp,damage);
  defender.hp=Math.max(0,defender.hp-damage);
  return {kind,damage,counter,failedSlip};
}

````

---

## `src/gym.js`

````js
import { state as appearanceState, rgb, setRamp } from './appearance.js';
import { carryingTray, drawHeldTray, mealDoorOptions, mealBedOptions, mealMateOptions } from './ward-meal.js';
import { buildBath, drawBathItem, bathTick, bathOptions, bathFX, BATH_W, BATH_H, LAMPS as BATH_LAMPS, state as bathState } from './bath.js';
import { gateOptions, listTag, prisonFightStart, prisonFightExtras } from './prison.js';
import { state as rendererState, line, taper, pset, shadowEll, withHD, hdRoom, zoomBlit, setLightVec, setFramebuffer } from './renderer.js';
import { state as progressionState } from './progression.js';
import { buildYard, state as npcsState, cnTick, ynTick, cnBlocks, ynBlocks, cnNight, cnRect, cnDraw } from './npcs.js';
import { lightCell, drawCellLights, cellLights } from './cell-light.js';
import { wardBlanket, wardLife, wardBreath, wardSmog, wardVignette, LAMP, WARD_WIN } from './ward.js';
import { yardFog } from './exercise-yard.js';
import { weatherNow, weatherLight, drawRain } from './weather.js';
import { drawCellItem, state as roomsState, buildCell, skyBucket, cellOptions, actTick, dimFB, drawActivityOverlay } from './rooms.js';
import { state as boxingState, updatePopups, drawPopups } from './boxing.js';
import { state as navigationState, setPanelMode } from './navigation.js';
import { state as sparringState, startSpar, oppStars } from './sparring.js';
import { tone } from './audio.js';
import { setInfo } from './input.js';
import { devDoorOptions } from './devtools.js';

/** Rooms where the player wears the prison drelich. */
const PRISON_LOOK=['cell','yard'];   // in the bath: a towel (drawIsoBoxer)

// Runtime values owned by gym; initialized explicitly by main.js.
export const state = {};

/** Release hub controls when an overlay takes focus. */
export function clearHubInput(){ for(const key in state.hubKeys) state.hubKeys[key]=0; }

/** Select a temporary prop camera; return the previous projection for restoration. */
export function setPropCamera(camera){ const previous=state.propCamera; state.propCamera=camera; return previous; }

export function isoX(i,j){ const c=state.propCamera; return c?c.x+i*c.ix+j*c.jx:(state.HUB_OX+(i-j)*6)*state.ISO_K; }

export function isoY(i,j,z){ const c=state.propCamera; return c?c.y+i*c.iy+j*c.jy-z*c.z:(state.HUB_OY+(i+j)*3-z)*state.ISO_K; } function fillPoly(n,fn){
  let y0=1e9,y1=-1e9; for(let k=0;k<n;k++){ if(state.PY[k]<y0)y0=state.PY[k]; if(state.PY[k]>y1)y1=state.PY[k]; }
  y0=Math.max(0,Math.ceil(y0)); y1=Math.min(appearanceState.H-1,Math.floor(y1));
  const K=state.propCamera?1:state.ISO_K;
  for(let y=y0;y<=y1;y++){
    let xa=1e9,xb=-1e9;
    for(let k=0;k<n;k++){ const k2=(k+1)%n, ay=state.PY[k], by=state.PY[k2]; if((ay<=y&&by>=y)||(by<=y&&ay>=y)){ const x=ay===by?Math.min(state.PX[k],state.PX[k2]):state.PX[k]+(y-ay)*(state.PX[k2]-state.PX[k])/(by-ay); const x2=ay===by?Math.max(state.PX[k],state.PX[k2]):x; if(x<xa)xa=x; if(x2>xb)xb=x2; } }
    const s=Math.max(0,Math.round(xa)), e=Math.min(appearanceState.W-1,Math.round(xb));
    for(let x=s;x<=e;x++){ const c=fn(x/K,y/K); if(c) rendererState.fb[y*appearanceState.W+x]=c; }   // callbacks get 1× picture coordinates
  }
}

export function quad(i0,j0,z0,i1,j1,z1,i2,j2,z2,i3,j3,z3,fn){
  state.PX[0]=isoX(i0,j0);state.PY[0]=isoY(i0,j0,z0);state.PX[1]=isoX(i1,j1);state.PY[1]=isoY(i1,j1,z1);state.PX[2]=isoX(i2,j2);state.PY[2]=isoY(i2,j2,z2);state.PX[3]=isoX(i3,j3);state.PY[3]=isoY(i3,j3,z3);
  // Orthographic top and edge-on faces have no area and no inverse surface coordinates.
  if(state.propCamera&&((state.PX[1]-state.PX[0])*(state.PY[3]-state.PY[0])-(state.PY[1]-state.PY[0])*(state.PX[3]-state.PX[0]))===0) return;
  fillPoly(4,fn);
}

export function isoLine(i0,j0,z0,i1,j1,z1,c1,c2){
  const x0=Math.round(isoX(i0,j0)), y0=Math.round(isoY(i0,j0,z0)), x1=Math.round(isoX(i1,j1)), y1=Math.round(isoY(i1,j1,z1)), K=state.propCamera?1:state.ISO_K;
  line(x0,y0,x1,y1,c1,c2||c1);
  if(K>1){ const flat=Math.abs(x1-x0)>=Math.abs(y1-y0); for(let k=1;k<K;k++) line(x0+(flat?0:k),y0+(flat?k:0),x1+(flat?0:k),y1+(flat?k:0),c1,c2||c1); }   // rods keep their thickness in the 2× room
}

/** A one-pixel line even in the 2× room: for the fine details the larger picture allows. */
export function isoLineThin(i0,j0,z0,i1,j1,z1,c1,c2){ line(Math.round(isoX(i0,j0)),Math.round(isoY(i0,j0,z0)),Math.round(isoX(i1,j1)),Math.round(isoY(i1,j1,z1)),c1,c2||c1); }

/** A picture pixel as a K×K block (one native pixel in the 2× room). @param {number} x @param {number} y @param {number} c */
export function psetK(x,y,c){ const K=state.propCamera?1:state.ISO_K; for(let dy=0;dy<K;dy++) for(let dx=0;dx<K;dx++) pset(x+dx,y+dy,c); }

export // box with the three faces the camera sees (top, +j "front-left", +i "front-right") + dark edges
function isoBox(i0,j0,i1,j1,z0,z1,cT,cF,cS,fnF,fnS){
  quad(i0,j1,z0,i1,j1,z0,i1,j1,z1,i0,j1,z1,fnF||(()=>cF));
  quad(i1,j0,z0,i1,j1,z0,i1,j1,z1,i1,j0,z1,fnS||(()=>cS));
  quad(i0,j0,z1,i1,j0,z1,i1,j1,z1,i0,j1,z1,()=>cT);
  isoLine(i0,j0,z1,i1,j0,z1,appearanceState.C_OUT); isoLine(i0,j0,z1,i0,j1,z1,appearanceState.C_OUT); isoLine(i0,j1,z1,i1,j1,z1,appearanceState.C_OUT); isoLine(i1,j0,z1,i1,j1,z1,appearanceState.C_OUT);
  isoLine(i0,j1,z0,i1,j1,z0,appearanceState.C_OUT); isoLine(i1,j0,z0,i1,j1,z0,appearanceState.C_OUT);
  isoLine(i0,j1,z0,i0,j1,z1,appearanceState.C_OUT); isoLine(i1,j1,z0,i1,j1,z1,appearanceState.C_OUT); isoLine(i1,j0,z0,i1,j0,z1,appearanceState.C_OUT);
}

export // gymItems = the items of the room we are in
function mkItem(o){ const f=state.GYM_TYPES[o.t]&&state.GYM_TYPES[o.t].fixed; return {t:o.t,i:f?o.i:o.i|0,j:f?o.j:o.j|0,r:o.r?1:0,w:o.w,h:o.h,v:o.v|0,spr:null,bx0:0,by0:0,bx1:-1,by1:-1,held:false,isNew:false}; }

export function itemW(it){ if(it.w!==undefined) return it.r?it.h:it.w; const T=state.GYM_TYPES[it.t]; return it.r?T.h:T.w; }

export // fixed items carry their own (fractional) size
function itemH(it){ if(it.h!==undefined) return it.r?it.w:it.h; const T=state.GYM_TYPES[it.t]; return it.r?T.w:T.h; }

/** Draw one room item into the current buffer: the Ward and the yard (rooms.js), the bath (bath.js). @param {any} it */
function drawItem(it){ if(!drawCellItem(it)) drawBathItem(it); }

function sprBake(it,key){
  if(!it[key]||it[key].length!==appearanceState.W*appearanceState.H) it[key]=new Uint32Array(appearanceState.W*appearanceState.H); else it[key].fill(0);
  const save0=rendererState.fb; rendererState.fb=it[key]; drawItem(it); rendererState.fb=save0;
  let x0=appearanceState.W,y0=appearanceState.H,x1=-1,y1=-1; const s=it[key];
  for(let y=0;y<appearanceState.H;y++){ const r=y*appearanceState.W; for(let x=0;x<appearanceState.W;x++) if(s[r+x]){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; } }
  return [x0,y0,x1,y1];
} function renderItemSprite(it){
  [it.bx0,it.by0,it.bx1,it.by1]=sprBake(it,'spr');
  if(it.t==='bunk'||it.t==='bunk2'||it.t==='cwheel'||it.t==='lshower'||it.t==='lpod'){ state.bunkFront=true; it.bb2=sprBake(it,'spr2'); state.bunkFront=false; }   // front rails + ladder, drawn again over a sleeper
} function blitSprite(it,tint,layer){
  const s=it.spr; if(!s) return;
  if(layer!==2) for(let y=it.by0;y<=it.by1;y++){ const r=y*appearanceState.W; for(let x=it.bx0;x<=it.bx1;x++){ const c=s[r+x]; if(c) rendererState.FB_MAIN[r+x]=tint?(((x+y)&1)?c:tint):c; } }
  const s2=it.spr2, b=it.bb2; if(!s2||!b||layer===1) return;
  for(let y=b[1];y<=b[3];y++){ const r=y*appearanceState.W; for(let x=b[0];x<=b[2];x++){ const c=s2[r+x]; if(c) rendererState.FB_MAIN[r+x]=tint?(((x+y)&1)?c:tint):c; } }
}

export // plane j=c (runs along i) / plane i=c (runs along j): a = position along the wall (tiles), z = height
function wallJ(c,a0,a1,Hh,fn){ quad(a0,c,0,a1,c,0,a1,c,Hh,a0,c,Hh,(x,y)=>{ const a=(x-state.HUB_OX)/6+c, z=state.HUB_OY+(a+c)*3-y; return fn(a,z,x,y); }); } function wallI(c,a0,a1,Hh,fn){ quad(c,a0,0,c,a1,0,c,a1,Hh,c,a0,Hh,(x,y)=>{ const a=c-(x-state.HUB_OX)/6, z=state.HUB_OY+(c+a)*3-y; return fn(a,z,x,y); }); }

export function shadeC(c,k){ return (0xff000000|(Math.min(255,((c>>16)&255)*k)<<16)|(Math.min(255,((c>>8)&255)*k)<<8)|Math.min(255,(c&255)*k))>>>0; } function buildHub(){                       // room shell (walls, floor) + everything flat, baked into bgHub
  if(hdRoom()&&!rendererState.inHD){ withHD(buildHub); return; }   // the rooms bake into the 2× background
  if(state.hubRoom==='yard') buildYard(); else if(state.hubRoom==='laznia') buildBath(); else buildCell();   // the Ward
}


export function hubRebake(){ roomsState.homeWx=weatherNow(); const bake=()=>{ buildHub(); for(const it of state.gymItems) if(!state.GYM_TYPES[it.t].flat) renderItemSprite(it); }; if(hdRoom()) withHD(bake); else bake(); }   /* the cell bakes at 2× */


export /* ---------- geometry helpers (footprint rectangles in tile space) ---------- */
function itemRect(it){ return [it.i,it.j,it.i+itemW(it),it.j+itemH(it)]; } function rectDist(it,pi,pj){ const r=itemRect(it); const dx=Math.max(r[0]-pi,0,pi-r[2]), dy=Math.max(r[1]-pj,0,pj-r[3]); return Math.hypot(dx,dy); }

/** Floor size [width, depth] of the current hub room in room units. */
export function hubBounds(){ return state.hubRoom==='yard'?[npcsState.YARD_W,npcsState.YARD_H]:state.hubRoom==='laznia'?[BATH_W,BATH_H]:[roomsState.CELL_W,roomsState.CELL_H]; }
export function hubBlocked(i,j){
  { const [w,h]=hubBounds(); if(i<0.45||j<0.45||i>w-0.4||j>h-0.4) return true; }
  for(const it of state.gymItems){
    if(it.held) continue; const T=state.GYM_TYPES[it.t];
    if(T.block==='circle'){ if(Math.hypot(i-(it.i+0.5),j-(it.j+0.5))<0.55) return true; }
    else if(T.block){ const r=itemRect(it); if(i>r[0]-0.25&&i<r[2]+0.25&&j>r[1]-0.25&&j<r[3]+0.25) return true; }
  }
  return false;
}

export function stationOf(it){
  const T=state.GYM_TYPES[it.t], inf=state.ST_INFO[T.st], r=itemRect(it);
  let li=(r[0]+r[2])/2, lj=(r[1]+r[3])/2;
  if(it.t==='cfloor'){ li=it.i+1.3; lj=it.j+1.4; }
  if(it.t==='cpull'){ li=0.9; lj=3.2; }
  if(it.t==='croach'){ li=it.i+0.5; lj=0.1; }
  if(it.t==='cdoor'||it.t==='ydoor'){ li=0.05; lj=it.j+0.75; }
  // where the boxer stands when he comes back: the first free spot in front of the item
  let si=li, sj=lj;
  if(!T.flat){
    const cand=[[r[2]+0.6,(r[1]+r[3])/2],[(r[0]+r[2])/2,r[3]+0.6],[r[2]+0.55,r[3]+0.55],[r[0]-0.6,(r[1]+r[3])/2],[(r[0]+r[2])/2,r[1]-0.6]];
    for(const c of cand) if(!hubBlocked(c[0],c[1])){ si=c[0]; sj=c[1]; break; }
  }
  if(it.t==='cfloor'){ si=it.i+1.5; sj=it.j+1.5; }   // back on the middle of the free floor
  if(it.t==='cpull'){ si=it.i+itemW(it)+0.2; sj=it.j+0.2; }
  if(it.t==='croach'){ si=it.i+0.45; sj=it.j+0.5; }
  if(it.t==='cdoor'||it.t==='ydoor'){ si=1.0; sj=it.j+0.75; }
  return {id:T.st,name:inf[0],title:inf[1],look:[li,lj,T.z],spot:[si,sj],item:it};
}


/** Options of a station; in prison they are gated by the daily schedule. @param {any} st */
export function stationOptions(st){ const o=stationOptions1(st), d=devDoorOptions(st); return d.length?[...(o||[]),...d]:o; }   /* developer mode adds travel to the doors */
function stationOptions1(st){ const c=bathOptions(st); if(c) return c; const o=stationOptions0(st);
  const meal=st.id==='cdoor'?mealDoorOptions():st.id==='bunk'?mealBedOptions(st):st.id==='cellfight'?mealMateOptions(st.cn):[];   /* the meal in the Ward: the flap, the guard-bed, the cellmates */
  return [...meal,...gateOptions(st,o)]; }
function stationOptions0(st){
  switch(st.id){
    case 'cellfight': case 'yardfight': { const yard=st.id==='yardfight', idx=yard?st.yn:st.cn, O=(yard?sparringState.YARD_OPP:sparringState.CELL_OPP)[idx];
      const go=()=>{ const C=(yard?npcsState.YN:npcsState.CN)[idx]; prisonFightStart(yard?'yard':'cell',idx); startSpar(idx,yard?'yard':'cell',{...st,look:[C.i,C.j,15],spot:[state.hubP.i,state.hubP.j]}); };
      const extra=prisonFightExtras(yard,idx,go,()=>{ const C=(yard?npcsState.YN:npcsState.CN)[idx]; return {...st,look:[C.i,C.j,15],spot:[state.hubP.i,state.hubP.j]}; });
      return [['Walka na gołe pięści: '+O.title+' '+'★'.repeat(oppStars(O))+' · do KO'+listTag(yard?'yard':'cell',idx),go],...extra]; }
  }
  return cellOptions(st);
}


export function hubUnstuck(){   // after a layout change the boxer may stand inside something: step him out
  if(!hubBlocked(state.hubP.i,state.hubP.j)) return;
  for(let rad=0.5;rad<8;rad+=0.5) for(let a=0;a<6.28;a+=0.4){ const i=state.hubP.i+Math.cos(a)*rad, j=state.hubP.j+Math.sin(a)*rad; if(!hubBlocked(i,j)){ state.hubP.i=i; state.hubP.j=j; return; } }
}

/** Cancel a running room transition (the zoom of a door or a station), for a scene that takes the room over. */
export function hubTransReset(){ state.hubTrans.kind=0; state.hubFade=0; }

export function hubTick(){
  state.hubFade=0;
  if(state.hubTrans.kind){
    state.hubTrans.t++; const x=state.hubTrans.t/state.hubTrans.dur;
    if(state.hubTrans.kind===1){ state.hubFade=x>0.62?(x-0.62)/0.38:0; if(state.hubTrans.t>=state.hubTrans.dur){ const f=state.hubTrans.fn; state.hubTrans.kind=0; state.hubFade=0; state.fadeInT=14; f(); setPanelMode(); return; } }
    else { state.hubFade=x<0.3?1-x/0.3:0; if(state.hubTrans.t>=state.hubTrans.dur){ state.hubTrans.kind=0; } }
  }
  if(roomsState.hubAct) actTick();
  if(state.hubRoom==='cell') cnTick(); else if(state.hubRoom==='yard') ynTick(); else if(state.hubRoom==='laznia') bathTick();
  const menuOpen=!navigationState.stMenuEl.hidden||boxingState.gstate==='menu';
  let dx=state.hubKeys.r-state.hubKeys.l, dy=state.hubKeys.d-state.hubKeys.u;
  if(menuOpen||state.hubTrans.kind||roomsState.hubAct) { dx=0; dy=0; }
  state.hubP.moving=false;
  if(dx||dy){
    let di=dx+dy, dj=dy-dx; const l=Math.hypot(di,dj); di/=l; dj/=l;
    const sp=0.052*(0.9+0.1*boxingState.STATS.speed);
    const ni=state.hubP.i+di*sp, nj=state.hubP.j+dj*sp;
    const trB=(a,b)=>(state.hubRoom==='cell'&&cnBlocks(a,b))||(state.hubRoom==='yard'&&ynBlocks(a,b));   // the inmates are solid
    if(!hubBlocked(ni,state.hubP.j)&&!trB(ni,state.hubP.j)) state.hubP.i=ni; if(!hubBlocked(state.hubP.i,nj)&&!trB(state.hubP.i,nj)) state.hubP.j=nj;
    state.hubP.fi=di; state.hubP.fj=dj; state.hubP.moving=true; state.hubP.ph+=0.28;
    if(((state.hubP.ph/Math.PI)|0)!==(((state.hubP.ph-0.28)/Math.PI)|0)) tone('sine',90,70,0.03,0.05);
  }
  // nearest item in reach -> station
  let best=null, bd=0.95;
  if(!roomsState.hubAct) for(const it of state.gymItems){ if(!state.GYM_TYPES[it.t].st) continue; const d=rectDist(it,state.hubP.i,state.hubP.j); if(d<bd){ bd=d; best=it; } }
  let cnB=null; if(state.hubRoom==='cell'&&!roomsState.hubAct) for(let k=0;k<npcsState.CN.length;k++){ const C=npcsState.CN[k]; if(!C.step||C.away||C.act==='lie') continue; const d=Math.hypot(C.i-state.hubP.i,C.j-state.hubP.j)-0.35; if(d<bd){ bd=d; cnB=k; } }
  let mnB=null; if(state.hubRoom==='laznia'&&!roomsState.hubAct) for(let k=0;k<npcsState.YN.length;k++){ const C=npcsState.YN[k]; const d=Math.hypot(C.i-state.hubP.i,C.j-state.hubP.j)-0.55; if(d<bd){ bd=d; mnB=k; } }
  let ynB=null; if(state.hubRoom==='yard'&&!cnNight()&&!roomsState.hubAct) for(let k=0;k<npcsState.YN.length;k++){ const C=npcsState.YN[k]; const d=Math.hypot(C.i-state.hubP.i,C.j-state.hubP.j)-0.35; if(d<bd){ bd=d; ynB=k; } }
  /* the healers: Śmierdziel by the Ward's tub, a turnkey on the yard (healers.js) */
  let heal=null; if(!roomsState.hubAct){
    const cand=state.hubRoom==='cell'?[[npcsState.STINK,'smierdziel']]:state.hubRoom==='yard'&&!cnNight()?[[npcsState.GUARD,'klucznik'],[npcsState.GUARD2,'klucznik']]:[];
    for(const [C,id] of cand){ if(!C||C.away) continue; const d=Math.hypot(C.i-state.hubP.i,C.j-state.hubP.j)-0.35; if(d<bd){ bd=d; heal={C,id}; cnB=null; ynB=null; } } }
  if(heal){ const C=heal.C; if(!state.hubNear||state.hubNear.id!==heal.id){ state.hubNear={id:heal.id,npc:true,name:heal.id==='smierdziel'?'ŚMIERDZIEL':'KLUCZNIK',title:heal.id==='smierdziel'?'Śmierdziel — maść na rany, za tytoń':'Klucznik — za szylingi do felczera',look:[C.i,C.j,heal.id==='smierdziel'?10:15],spot:[state.hubP.i,state.hubP.j],item:null}; setInfo(); } state.hubNear.look[0]=C.i; state.hubNear.look[1]=C.j; }
  else if(cnB!==null){ const C=npcsState.CN[cnB]; if(!state.hubNear||state.hubNear.cn!==cnB){ state.hubNear={id:'cellfight',cn:cnB,name:C.name.toUpperCase(),title:C.name+' — współwięzień',look:[C.i,C.j,15],spot:[state.hubP.i,state.hubP.j],item:null}; setInfo(); } state.hubNear.look[0]=C.i; state.hubNear.look[1]=C.j; }
  else if(mnB!==null){ const C=npcsState.YN[mnB], name=sparringState.YARD_OPP[mnB].title; if(!state.hubNear||state.hubNear.yn!==mnB){ state.hubNear={id:'bathfight',yn:mnB,name:name.toUpperCase(),title:name+' — w łaźni',look:[C.i,C.j,13],spot:[state.hubP.i,state.hubP.j],item:null}; setInfo(); } }
  else if(ynB!==null){ const C=npcsState.YN[ynB], name=sparringState.YARD_OPP[ynB].title; if(!state.hubNear||state.hubNear.yn!==ynB){ state.hubNear={id:'yardfight',yn:ynB,name:name.toUpperCase(),title:name+' — współwięzień',look:[C.i,C.j,15],spot:[state.hubP.i,state.hubP.j],item:null}; setInfo(); } state.hubNear.look[0]=C.i; state.hubNear.look[1]=C.j; }
  else if((best&&best)!==(state.hubNear&&state.hubNear.item)||(state.hubNear&&(state.hubNear.cn!==undefined||state.hubNear.yn!==undefined||state.hubNear.npc))){ state.hubNear=best?stationOf(best):null; setInfo(); }
  if(!state.hubTrans.kind&&(skyBucket()!==roomsState.homeSkyB||weatherNow()!==roomsState.homeWx)) hubRebake();   // the light follows the clock and the weather
  updatePopups();
}

export // ipC = the character being drawn (hubP or the trainer)
function bodyPt(fwd,side,z){ if(state.ipPose===1){ const f=z-9; z=state.ipBase+fwd*0.45+2; fwd=f; } else if(state.ipPose===2) z+=state.ipBase;   // lying: height becomes length, chest up
  const C=state.ipC||state.hubP, S=1/7.5, i=C.i+(fwd*C.fi-side*C.fj)*S, j=C.j+(fwd*C.fj+side*C.fi)*S; state.bpX=isoX(i,j); state.bpY=isoY(i,j,z+(C.z0||0)); state.bpD=i+j; }

/** The light on a figure standing at C: the strongest source of the room [i, j, height, strength 0..1] (the Ward's barred window by day or
 * the tallow lamp, the bath's nearest gas jet, the yard's overcast sky) and the screen direction towards it. @param {any} C */
function figureLight(C){
  const r=state.hubRoom, wx=weatherNow(); let L=[C.i,C.j,20,0];
  if(r==='cell'){
    const lt=cellLights(progressionState.save.sim.min), day=lt.day*(wx==='sun'?0.55:wx==='cloud'?0.42:0.32), wi=(WARD_WIN.u0+WARD_WIN.u1)/12, wz=(WARD_WIN.z0+WARD_WIN.z1)/2;
    if(lt.bulb) L=day>0.25&&Math.hypot(C.i-wi,C.j)<Math.hypot(C.i-LAMP.i,C.j-LAMP.j)*1.1?[wi,0,wz,day]:[LAMP.i,LAMP.j,LAMP.z,0.62];
    else L=day>0.05?[wi,0,wz,day]:[wi,0.4,WARD_WIN.z0+2,0.28];
  } else if(r==='laznia'){
    let best=BATH_LAMPS[0], bd=1e9; for(const l of BATH_LAMPS){ const d=Math.hypot(C.i-l[0],C.j-l[1]); if(d<bd){ bd=d; best=l; } }
    L=[best[0],best[1],best[2],0.52/Math.max(1,bd*0.32)];
  } else if(r==='yard'){
    const b=skyBucket(); L=[C.i-2.2,C.j-3.2,28,b===0?0.2:(wx==='sun'?0.52:wx==='cloud'?0.32:0.24)];
  }
  const sx=isoX(L[0],L[1])-isoX(C.i,C.j), sy=isoY(L[0],L[1],L[2])-isoY(C.i,C.j,10), sl=Math.hypot(sx,sy)||1;
  return L[3]>0.05?{str:L[3],lx:sx/sl,ly:sy/sl,face:((L[0]-C.i)*C.fi+(L[1]-C.j)*C.fj)/(Math.hypot(L[0]-C.i,L[1]-C.j)||1)}:null;
}

/** A figure drawn into its own buffer, so the light pass touches the figure only and never the room behind it. */
let litBuf=/** @type {Uint32Array|null} */ (null);
/** Start a lit figure: aim the shading and switch to the clean buffer. @param {{str:number,lx:number,ly:number,face:number}} lit */
function litBegin(lit){
  const N=appearanceState.W*appearanceState.H; if(litBuf?.length!==N) litBuf=new Uint32Array(N);
  return {real:setFramebuffer(litBuf),prev:setLightVec(lit.lx,lit.ly)};
}
/** Rim light on the edge facing the source, the lit half brighter, the far half darker; then the figure goes onto the room.
 * @param {{str:number,lx:number,ly:number,face:number}} lit @param {{real:Uint32Array,prev:[number,number]}} st @param {number} cx @param {number} cy */
function litEnd(lit,st,cx,cy){
  const W=appearanceState.W, H=appearanceState.H, buf=/** @type {Uint32Array} */ (litBuf), real=st.real, K=state.ISO_K;
  let x0=W, y0=H, x1=0, y1=0;
  for(let k=0;k<state.ipN;k++){ const r=Math.max(state.ipR0[k],state.ipR1[k])+3*K;
    x0=Math.min(x0,state.ipX0[k]-r,state.ipX1[k]-r); x1=Math.max(x1,state.ipX0[k]+r,state.ipX1[k]+r); y0=Math.min(y0,state.ipY0[k]-r,state.ipY1[k]-r); y1=Math.max(y1,state.ipY0[k]+r,state.ipY1[k]+r); }
  x0=Math.max(1,Math.floor(x0)); y0=Math.max(1,Math.floor(y0)); x1=Math.min(W-2,Math.ceil(x1)); y1=Math.min(H-2,Math.ceil(y1));
  const {str,lx,ly}=lit, C_OUT=appearanceState.C_OUT, C_SH=appearanceState.C_SHADOW, dirX=lx>=0?1:-1, dirY=ly>=0?1:-1, span=Math.max(6*K,(x1-x0)*0.45), face=lit.face*0.12*str;
  for(let y=y0;y<=y1;y++){ const row=y*W;
    for(let x=x0;x<=x1;x++){
      const c=buf[row+x]; if(!c) continue;
      if(c!==C_OUT&&c!==C_SH){
        const u=((x-cx)*lx+(y-cy)*ly*0.55)/span, nx=buf[row+x+dirX], ny=buf[(y+dirY)*W+x];
        const edge=(nx===0||nx===C_OUT)||(Math.abs(ly)>0.55&&(ny===0||ny===C_OUT));
        if(u>0.06&&edge) buf[row+x]=shadeC(c,1+str*0.52+Math.max(0,face));
        else if(u>0.16) buf[row+x]=shadeC(c,1+(u-0.16)*str*0.32+face);
        else if(u<-0.06) buf[row+x]=shadeC(c,Math.max(0.5,1+(u+0.06)*str*0.72+face));
      }
      real[row+x]=buf[row+x]; buf[row+x]=0;
    }
  }
  setFramebuffer(real); setLightVec(st.prev[0],st.prev[1]);
}

/**
 * A person in the 2× room, modelled for the larger picture: realistic proportions (a smaller head with a jaw, ears and hair,
 * a neck, square shoulders, a pelvis, hands and shoes), a face (eyes, brows, nose, mouth, stubble or a beard) and the drelich
 * (collar, button placket, waist seam, breast pocket). J(s) gives the limb joints {hip,knee,foot,sh,el,hd} of side s;
 * J.pel, J.chest and J.head are the body joints, all in body coordinates [forward, side, height] like ipAdd.
 * @param {any} C @param {any} J
 * In the bath L.bare strips the drelich (top and trousers take the skin), L.waist wraps a towel round the hips
 * and L.censor puts a pixel mosaic over the groin.
 * @param {{sk:number[],top:number[],pt:number[],shoe:number,hair:number,style?:string,beard?:boolean,stubble?:boolean,mustache?:boolean,cut?:boolean,bare?:boolean,waist?:number,censor?:boolean,belt?:boolean,baton?:boolean,cap?:number,chops?:boolean,scarf?:number,irons?:boolean}} L
 * Newgate: style 'flatcap' (L.cap ramp), L.chops mutton-chop whiskers, L.scarf a neckerchief colour, L.irons leg irons.
 * @param {{pose?:number,base?:number,noShadow?:boolean,light?:boolean,tilt?:boolean}} [o]   light: shade him by the room's light (the brawl); tilt: head and chest fixtures follow a ragdoll's neck and spine
 */
export function figureHD(C,J,L,o={}){
  state.ipC=C; state.ipN=0; state.ipPose=o.pose||0; state.ipBase=o.base||0;
  const lit=o.light?figureLight(C):null, nearS=((C.fi||0)-(C.fj||0))>=0?1:-1, mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
  for(let s=-1;s<=1;s+=2){
    const k=s===nearS?0:1, A=J(s), SK=L.sk[k], PT=L.pt[k], TP=L.top[k], wr=mix(A.el,A.hd,0.8), toe=[A.foot[0]+0.85,A.foot[1],A.foot[2]-0.25];
    if(L.waist) ipAdd(...A.hip,1.3, ...A.knee,1.08, PT,L.waist,0.5,0.5,L.waist); else ipAdd(...A.hip,1.3, ...A.knee,1.08, PT);   /* thigh (the towel over its top half) */
    ipAdd(...A.knee,1.02, ...A.foot,0.84, PT);                                                                   // shin
    ipAdd(A.foot[0]-0.2,A.foot[1],A.foot[2]-0.15,0.92, ...toe,0.74, L.shoe);                                   // prison shoe
    ipAdd(...A.sh,1.1, ...A.el,0.9, TP); ipAdd(...A.el,0.88, ...wr,0.76, TP);                                   // long drelich sleeve
    ipAdd(...wr,0.62, ...A.hd,0.7, SK);                                                                          // hand
    ipAdd(A.hip[0],A.hip[1],A.hip[2]+0.3,1.35, A.hip[0],A.hip[1]*0.4,A.hip[2]+0.4,1.4, L.waist||PT);            // seat of the trousers
  }
  const P=J.pel, Q=J.chest, SL=J(-1).sh, SR=J(1).sh, T0=L.top[0], S0=L.sk[0];
  // The head and chest fixtures (face, collar, pocket...) sit in a frame that follows the neck and the spine, so a ragdoll that lies or
  // tumbles carries its face with it; standing figures use the plain body axes and draw exactly as before.
  const frame=(/** @type {number[]} */ from,/** @type {number[]} */ to)=>{ let ux=to[0]-from[0], uy=to[1]-from[1], uz=to[2]-from[2]; const ul=Math.hypot(ux,uy,uz)||1; ux/=ul; uy/=ul; uz/=ul;
    let sx=-uy*ux, sy=1-uy*uy, sz=-uy*uz, sl=Math.hypot(sx,sy,sz); if(sl<0.2){ sx=1-ux*ux; sy=-ux*uy; sz=-ux*uz; sl=Math.hypot(sx,sy,sz)||1; } sx/=sl; sy/=sl; sz/=sl;
    return [sy*uz-sz*uy,sz*ux-sx*uz,sx*uy-sy*ux,sx,sy,sz,ux,uy,uz]; };   // forward = side × up, side = body side made square to the axis
  const at=(/** @type {number[]} */ o,/** @type {number[]|null} */ fr)=>(/** @type {number} */ a,/** @type {number} */ b,/** @type {number} */ c)=>fr?[o[0]+a*fr[0]+b*fr[3]+c*fr[6],o[1]+a*fr[1]+b*fr[4]+c*fr[7],o[2]+a*fr[2]+b*fr[5]+c*fr[8]]:[o[0]+a,o[1]+b,o[2]+c];
  const hp=at([J.head[0]+0.1,J.head[1],J.head[2]-0.6],o.tilt?frame(Q,J.head):null), tp=at(Q,o.tilt?frame(P,Q):null), pp=at(P,o.tilt?frame(P,Q):null), H=hp(0,0,0);
  if(L.waist) ipAdd(P[0],P[1],P[2]+0.5,1.85, Q[0],Q[1],Q[2]-0.3,2.2, T0,L.waist,0.24,0.24,L.waist);              /* bare torso, the towel tucked in at the waist */
  else ipAdd(P[0],P[1],P[2]+0.5,1.85, Q[0],Q[1],Q[2]-0.3,2.2, T0);                                              // the drelich jacket
  ipAdd(SL[0],SL[1]*0.82,SL[2]-0.15,1.15, SR[0],SR[1]*0.82,SR[2]-0.15,1.15, T0);                               // shoulders
  const HS=L.style==='hood'?(L.cap??L.hair):S0;   /* under a hood the head is all canvas */
  ipAdd(Q[0],Q[1],Q[2]+0.3,0.72, ...hp(-0.15,0,-1.3),0.68, HS);                                            // neck
  ipAdd(...H,1.75, ...H,1.75, L.style==='fringe'?L.hair:HS);                                                       // skull beneath the hair
  if(L.style==='fringe') ipAdd(...hp(0.9,0,-0.2),1.15, ...hp(1.0,0,-0.65),1.0, S0);                     // face in front of the hair
  ipAdd(...hp(0.45,0,-0.7),1.2, ...hp(0.85,0,-1.15),0.95, HS);                                       // jaw and chin
  if(L.style!=='hood') for(let s=-1;s<=1;s+=2) ipAdd(...hp(-0.15,s*1.68,-0.15),0.42, ...hp(-0.1,s*1.68,-0.25),0.4, L.sk[s===nearS?0:1]);   // ears
  const st=L.style||'short';
  if(st==='long'){ ipAdd(...hp(-0.35,0,0.6),1.8, ...hp(-0.35,0,0.6),1.8, L.hair); ipAdd(...hp(-0.85,0,-0.3),1.45, ...hp(-1.0,0,-1.9),1.2, L.hair); }   // long, down the neck
  else if(st==='bald') ipAdd(...hp(-0.95,-1.25,0.15),0.85, ...hp(-0.95,1.25,0.15),0.85, L.hair);   // a horseshoe of hair round the back
  else if(st==='cap'){ ipAdd(...hp(-0.25,0,1.25),1.55, ...hp(-0.25,0,1.45),1.5, L.cap??L.hair); ipAdd(...hp(1.2,-0.8,1.2),0.3, ...hp(1.35,0.8,1.2),0.3, L.shoe); }   /* peaked uniform cap */
  else if(st==='hood'){ const cr=L.cap??L.hair; ipAdd(...H,1.98, ...H,1.98, cr); ipAdd(...hp(0.45,0,-0.8),1.5, ...hp(0.65,0,-1.45),1.3, cr);   /* a canvas hood over head and face, */
    ipAdd(...hp(-0.15,0,-1.2),1.65, ...tp(-0.1,0,0.2),2.25, cr); }                                                       /* its skirt over the shoulders */
  else if(st==='flatcap'){ const cr=L.cap??L.hair; ipAdd(...hp(-0.25,0,0.75),1.86, ...hp(0.35,0,0.95),1.8, cr); ipAdd(...hp(1.15,-0.95,0.85),0.42, ...hp(1.35,0.95,0.85),0.42, cr); }   /* a cloth cap pulled low, a short peak */
  else if(st==='toque') ipAdd(...hp(-0.25,0,0.9),1.55, ...hp(-0.4,0,2.5),1.7, L.hair);                              /* cook's tall white cap */
  else if(st==='shaved') ipAdd(...hp(-0.25,0,0.35),1.76, ...hp(-0.25,0,0.35),1.76, L.hair);   // a hair cap a little larger than the skull:
  else { ipAdd(...hp(-0.3,0,0.6),1.8, ...hp(-0.3,0,0.6),1.8, L.hair);                       // it shows on top and at the back, the face covers its front
    if(st==='fringe') ipAdd(...hp(0.85,-0.95,1.15),0.52, ...hp(1.0,0.85,1.0),0.5, L.hair); }   // straight fringe
  if(L.beard) ipAdd(...hp(0.75,0,-0.75),1.18, ...hp(0.95,0,-1.6),0.92, L.hair);
  if(L.chops) for(let s=-1;s<=1;s+=2) ipAdd(...hp(0.35,s*1.45,-0.1),0.52, ...hp(0.8,s*1.2,-1.25),0.5, L.hair);   /* mutton chops down to the jaw */
  for(let k=0;k<state.ipN;k++) state.ipOrd[k]=k;
  for(let a=1;a<state.ipN;a++){ const v=state.ipOrd[a]; let b=a-1; while(b>=0&&state.ipD[state.ipOrd[b]]>state.ipD[v]){ state.ipOrd[b+1]=state.ipOrd[b]; b--; } state.ipOrd[b+1]=v; }
  if(!state.ipPose&&!o.noShadow){ bodyPt(0,0,0); shadowEll(Math.round(state.bpX),Math.round(state.bpY),4,1); }
  const lst=lit?litBegin(lit):null;   // everything below goes to the clean buffer until litFinish
  const litFinish=()=>{ if(lit&&lst){ bodyPt(Q[0],Q[1],Q[2]); litEnd(lit,lst,state.bpX,state.bpY); } };
  for(let p=0;p<2;p++) for(let a=0;a<state.ipN;a++){ const k=state.ipOrd[a];
    taper(Math.round(state.ipX0[k]),Math.round(state.ipY0[k]),state.ipR0[k],Math.round(state.ipX1[k]),Math.round(state.ipY1[k]),state.ipR1[k],p,state.ipRp[k],state.ipRp2[k],state.ipZ1[k],state.ipZ2[k],state.ipRp3[k]); }
  // ---- details on the side facing the camera (one 2× pixel each)
  const PAL=appearanceState.PAL, sh=(/** @type {number} */ r,/** @type {number} */ k)=>PAL[r*3+k];
  bodyPt(...H); const hd0=state.bpD;
  const dot=(/** @type {number} */ f,/** @type {number} */ sd,/** @type {number} */ z,/** @type {number} */ c,/** @type {number} */ d0)=>{ bodyPt(f,sd,z); if(state.bpD>d0+0.02) pset(Math.round(state.bpX),Math.round(state.bpY),c); };
  const EYE=rgb('#3a2a20'), LIP=sh(S0,0);
  if(st==='hood'){ for(let s=-1;s<=1;s+=2){ dot(...hp(1.85,s*0.55,0.15),rgb('#0a0908'),hd0); dot(...hp(1.82,s*0.85,0.2),rgb('#0a0908'),hd0); }   /* two slits, nothing else of a face */
    dot(...hp(1.6,0,-0.9),sh(L.cap??L.hair,0),hd0); }
  else {
  for(let s=-1;s<=1;s+=2){ dot(...hp(1.5,s*0.66,0.2),EYE,hd0); dot(...hp(1.42,s*0.72,0.8),sh(L.hair,st==='bald'?1:0),hd0); }   // eyes, brows
  dot(...hp(1.82,0.12,-0.3),sh(S0,1),hd0);                                                               // nose: a half-tone, not a hole
  if(L.mustache||L.beard){ dot(...hp(1.6,-0.35,-0.62),sh(L.hair,L.beard?1:0),hd0); dot(...hp(1.6,0.35,-0.62),sh(L.hair,L.beard?1:0),hd0); }
  if(!L.beard) dot(...hp(1.5,-0.1,-1.0),LIP,hd0);                                                       // mouth (a beard hides it)
  if(L.stubble) for(const [f,sd,z] of [[1.2,-0.62,-1.05],[1.3,0.6,-1.1],[1.4,0,-1.4],[1.05,-0.95,-0.7],[1.05,0.95,-0.75]]) dot(...hp(f,sd,z),sh(S0,0),hd0);
  if(L.cut) dot(...hp(1.78,-0.18,0.22),rgb('#b8402c'),hd0);                                            // the fresh cut on the bridge of the nose
  }
  bodyPt(...Q); const cd0=state.bpD, TD=sh(T0,0), TL=sh(T0,2);
  if(L.censor){ bodyPt(...pp(1.0,0,-0.5)); censor(Math.round(state.bpX),Math.round(state.bpY)); }
  if(L.bare){ litFinish(); state.ipPose=0; state.ipBase=0; state.ipC=state.hubP; return; }
  dot(...tp(1.7,-0.55,0.15),TL,cd0); dot(...tp(1.7,0.55,0.15),TL,cd0);                     // collar points
  if(L.scarf!==undefined){ dot(...tp(1.75,0,0.25),L.scarf,cd0); dot(...tp(1.85,0.25,-0.3),L.scarf,cd0); dot(...tp(1.85,-0.2,-0.55),L.scarf,cd0); }   /* a knotted neckerchief */
  bodyPt(...tp(2.0,0,-0.9)); const ax=Math.round(state.bpX), ay=Math.round(state.bpY), ad=state.bpD;
  bodyPt(...pp(1.7,0,0.8)); const bx=Math.round(state.bpX), by=Math.round(state.bpY);
  if(ad>cd0+0.02&&state.bpD>cd0-0.2){ line(ax,ay,bx,by,TD,TD); for(const t of [0.15,0.5,0.85]) pset(Math.round(ax+(bx-ax)*t)+1,Math.round(ay+(by-ay)*t),TL); }   // button placket
  dot(...tp(1.85,nearS*1.05,-0.45),TD,cd0); dot(...tp(1.85,nearS*1.35,-0.45),TD,cd0);         // breast pocket edge
  if(L.belt){ bodyPt(...pp(1.55,-1.3,0.9)); const x0=Math.round(state.bpX), y0=Math.round(state.bpY), d0=state.bpD; bodyPt(...pp(1.55,1.3,0.9)); if(Math.max(d0,state.bpD)>cd0-0.3) line(x0,y0,Math.round(state.bpX),Math.round(state.bpY),sh(L.shoe,0),sh(L.shoe,1)); }   /* belt */
  if(L.irons){ const a=J(-1).foot, b=J(1).foot; bodyPt(a[0],a[1],a[2]+0.5); const x0=state.bpX, y0=state.bpY; bodyPt(b[0],b[1],b[2]+0.5); const x1=state.bpX, y1=state.bpY;   /* leg irons: two cuffs, the chain sagging between */
    const IR=rgb('#3a3632'), IH=rgb('#7a7068'); for(let k=0;k<=12;k++){ const u=k/12, x=x0+(x1-x0)*u, y=y0+(y1-y0)*u+Math.sin(Math.PI*u)*3*state.ISO_K; pset(Math.round(x),Math.round(y),k&1?IH:IR); }
    for(const [x,y] of [[x0,y0],[x1,y1]]) for(let d=-1;d<=1;d++){ pset(Math.round(x)+d,Math.round(y)-1,IR); pset(Math.round(x)+d,Math.round(y),IH); } }
  if(L.baton){ bodyPt(...pp(0.3,nearS*2.05,1.0)); const x0=Math.round(state.bpX), y0=Math.round(state.bpY); bodyPt(...pp(0.7,nearS*2.2,-3.0)); line(x0,y0,Math.round(state.bpX),Math.round(state.bpY),sh(L.shoe,0),sh(L.shoe,0)); }   /* rubber baton on the hip */
  litFinish(); state.ipPose=0; state.ipBase=0; state.ipC=state.hubP;
}

/** A pixel mosaic over the groin: 4×3 blocks of 2×2 picture pixels, each the average of what is under it, lighter or darker by turns. @param {number} cx @param {number} cy */
function censor(cx,cy){
  const fb=rendererState.fb, W=appearanceState.W, H=appearanceState.H, B=2, T=[0.62,1.3,0.86,1.14,0.72,1.4];
  for(let by=0;by<3;by++) for(let bx=0;bx<4;bx++){ const x0=cx-4+bx*B, y0=cy-3+by*B; let r=0, g=0, b=0, n=0;
    for(let y=y0;y<y0+B;y++) for(let x=x0;x<x0+B;x++){ if(x<0||y<0||x>=W||y>=H) continue; const c=fb[y*W+x]; r+=c&255; g+=(c>>8)&255; b+=(c>>16)&255; n++; }
    if(!n) continue; const m=T[(bx*5+by*3)%6]/n, v=(0xff000000|(Math.min(255,b*m|0)<<16)|(Math.min(255,g*m|0)<<8)|Math.min(255,r*m|0))>>>0;
    for(let y=y0;y<y0+B;y++) for(let x=x0;x<x0+B;x++) if(x>=0&&y>=0&&x<W&&y<H) fb[y*W+x]=v; }
}

/** One tapered limb of a hub figure; radii are native pixels, doubled in the 2× room. */
export function ipAdd(f0,s0,z0,r0,f1,s1,z1,r1,rp,rp2,zz1,zz2,rp3){
  if(state.ipN>=state.IP_N) return; const k=state.ipN++;
  bodyPt(f0,s0,z0); state.ipX0[k]=state.bpX; state.ipY0[k]=state.bpY; let d=state.bpD;
  bodyPt(f1,s1,z1); state.ipX1[k]=state.bpX; state.ipY1[k]=state.bpY; state.ipD[k]=(d+state.bpD)*0.5;
  const K=state.ISO_K; state.ipR0[k]=r0*K; state.ipR1[k]=r1*K; state.ipRp[k]=rp; state.ipRp2[k]=rp2||0; state.ipZ1[k]=zz1===undefined?-9:zz1; state.ipZ2[k]=zz2===undefined?-9:zz2; state.ipRp3[k]=rp3||0;
} function drawIsoBoxer(){                                   // in the cell he wears the same drelich as the inmates (long sleeves, no belt, black shoes)
  if(state.hubRoom==='laznia'){ drawIsoTowel(); return; }
  if(!PRISON_LOOK.includes(state.hubRoom)){ drawIsoBoxer0(); return; }
  if(state.hubRoom==='yard'){ const A=appearanceState, k=A.PAL.slice(A.R_HAIR*3,A.R_HAIR*3+3); setRamp(A.R_HAIR,npcsState.HOOD,false); state.heroHood=true;   /* on the yard he wears the hood too */
    try{ drawIsoBoxerCell(); } finally { state.heroHood=false; A.PAL.set(k,A.R_HAIR*3); } return; }
  drawIsoBoxerCell();
} function drawIsoBoxerCell(){ withCellOutfit(drawIsoBoxer0);
} /** Run fn with the hero's ramps set to the prison drelich (long sleeves, no belt, black shoes). @param {()=>void} fn */
export function withCellOutfit(fn){
  const keep=state.CELL_OUTFIT.map(o=>[appearanceState.PAL[o[0]*3],appearanceState.PAL[o[0]*3+1],appearanceState.PAL[o[0]*3+2]]);
  for(const o of state.CELL_OUTFIT) setRamp(o[0],o[1],o[2]);
  try{ fn(); } finally { state.CELL_OUTFIT.forEach((o,k)=>{ appearanceState.PAL[o[0]*3]=keep[k][0]; appearanceState.PAL[o[0]*3+1]=keep[k][1]; appearanceState.PAL[o[0]*3+2]=keep[k][2]; }); }
} function drawIsoTowel(){                                   // in the bath: a towel round the hips and rubber slippers
  withBathTowel(()=>{ state.isoTowel=true; try{ drawIsoBoxer0(); } finally { state.isoTowel=false; } });
} /** Run fn with the hero's ramps set to the bath towel and rubber slippers. @param {()=>void} fn */
export function withBathTowel(fn){
  const A=appearanceState, slots=[A.R_TRUNK,A.R_TRUNKF,A.R_TT,A.R_TTF,A.R_BOOT,A.R_BOOTF], keep=slots.map(r=>A.PAL.slice(r*3,r*3+3));
  setRamp(A.R_TRUNK,state.ISO_TOWEL,false); setRamp(A.R_TRUNKF,state.ISO_TOWEL,true); setRamp(A.R_TT,state.ISO_TOWEL,false); setRamp(A.R_TTF,state.ISO_TOWEL,true);
  setRamp(A.R_BOOT,state.ISO_SLIP,false); setRamp(A.R_BOOTF,state.ISO_SLIP,true);
  try{ fn(); } finally { slots.forEach((r,k)=>A.PAL.set(keep[k],r*3)); }
} /** The hero's modelled-figure look in the current hub room and the palette wrapper to draw it in: the cell drelich, the yard hood, the bath towel.
 * @returns {{look:any,wrap:(fn:()=>void)=>void}} */
export function heroFigureLook(){
  const A=appearanceState, look=/** @type {any} */ ({sk:[A.R_SKIN,A.R_SKINF],top:[A.R_HSH,A.R_HSHF],pt:[A.R_HPT,A.R_HPTF],shoe:A.R_HSLIP,hair:A.R_HAIR,style:'fringe',stubble:true,cut:true});
  if(state.hubRoom==='laznia'){ Object.assign(look,{top:look.sk,pt:look.sk,shoe:A.R_BOOT,bare:true,censor:false,waist:A.R_TRUNK}); return {look,wrap:withBathTowel}; }
  if(state.hubRoom==='yard'){ Object.assign(look,{style:'hood',stubble:false,cut:false});
    return {look,wrap:fn=>{ const k=A.PAL.slice(A.R_HAIR*3,A.R_HAIR*3+3); setRamp(A.R_HAIR,npcsState.HOOD,false); try{ withCellOutfit(fn); } finally { A.PAL.set(k,A.R_HAIR*3); } }}; }
  return {look,wrap:withCellOutfit};
} function drawIsoBoxer0(){
  state.ipC=state.hubP; state.ipN=0; state.ipPose=state.hubP.pose|0; state.ipBase=state.hubP.poseZ||0;
  const HD=state.ISO_K>1&&(PRISON_LOOK.includes(state.hubRoom)||state.hubRoom==='laznia'), jt={};   // the 2× cell: the modelled figure
  const still=state.ipPose===1||state.ipPose===2, mv=state.hubP.moving&&!state.ipPose, ph=state.hubP.ph, swayI=mv?0.35*Math.cos(ph):0, swayJ=mv?0.45*Math.sin(ph):0, bob=still?0:(mv?Math.abs(Math.sin(ph))*0.7:0.35*Math.sin(boxingState.tick*0.09));
  const sideD=(-state.hubP.fj+state.hubP.fi), nearS=sideD>=0?1:-1;
  const dressed=!state.isoTowel&&!(roomsState.hubAct&&roomsState.hubAct.kind==='shower'&&roomsState.hubAct.t>roomsState.ACT_FADE);   // prison clothes (the bath has its own figure)
  for(let s=-1;s<=1;s+=2){
    const near=s===nearS, sw=mv?Math.sin(ph+(s<0?0:Math.PI)):0, lift=mv?Math.max(0,Math.cos(ph+(s<0?0:Math.PI)))*1.3:0, fF=2.3*sw;
    const SK=near?appearanceState.R_SKIN:appearanceState.R_SKINF, TR=near?appearanceState.R_TRUNK:appearanceState.R_TRUNKF, TT=near?appearanceState.R_TT:appearanceState.R_TTF, PT=near?appearanceState.R_HPT:appearanceState.R_HPTF, SH=near?appearanceState.R_HSH:appearanceState.R_HSHF;
    if(HD) jt[s]=state.ipPose===2&&state.hubRoom==='cell'?{hip:[0.3,s*1.2,7.2],knee:[2.6,s*1.3,7.4],foot:[2.8,s*1.45,2.2]}:state.ipPose===2&&state.hubRoom==='laznia'?   /* on the edge of the guard-bed: knees forward, feet down */
      {hip:[0.3,s*1.2,5.9],knee:[2.6,s*1.3,6.6],foot:[4.4,s*1.35,5.9]}:{hip:[0,s*1.2,7.2+bob],knee:[fF*0.5+0.7,s*1.3,3.8+lift*0.6],foot:[fF,s*1.4,0.9+lift]};   /* in a tub: legs out in the water */
    if(state.ipPose!==2&&!HD){                              // sitting: the legs are hidden by the sofa
      if(dressed){
        ipAdd(0,s*1.2,7.2+bob,1.45, fF*0.5+0.7,s*1.3,3.8+lift*0.6,1.2, PT);
        ipAdd(fF*0.5+0.7,s*1.3,3.8+lift*0.6,1.2, fF,s*1.4,0.9+lift,1.1, PT);
        ipAdd(fF-0.2,s*1.4,0.7+lift,1.15, fF+0.9,s*1.4,0.5+lift,1.0, appearanceState.R_HSLIP);
      } else {
        ipAdd(0,s*1.2,7.2+bob,1.4, fF*0.5+0.7,s*1.3,3.8+lift*0.6,1.1, SK,TR,0.45,0.58,TT);
        ipAdd(fF*0.5+0.7,s*1.3,3.8+lift*0.6,1.1, fF,s*1.4,0.9+lift,1.0, SK);
        ipAdd(fF-0.2,s*1.4,0.8+lift,1.25, fF+0.9,s*1.4,0.6+lift,1.1, near?appearanceState.R_BOOT:appearanceState.R_BOOTF);
      }
    }
    // arms hang a little away from the body (wide lats, soft elbows, hands slightly in front of the hips)
    // and swing gently - bigger bend on the forward swing
    const aw=mv?-sw:(state.ipPose?0:0.1*Math.sin(boxingState.tick*0.045+(s<0?0:1.3)));
    let ex=-0.2+0.55*aw, ez=9.9+bob+0.15*Math.abs(aw), hx=0.6+1.1*aw+(aw>0?0.5*aw:0), hz=8.0+bob+0.5*(aw>0?aw:0), es=3.5, hs=3.7;
    if(state.ipPose===3&&s===1&&(boxingState.tick%80)<36){ ex=1.3; ez=10.6; es=3.0; hx=2.3; hz=14.2; hs=1.5; }   // eating: hand to the mouth
    if(state.ipPose===2){ ex=0.9; ez=9.8; hx=2.2; hz=8.6; }                                           // sitting: hands on the thighs
    const longS=dressed&&PRISON_LOOK.includes(state.hubRoom);
    if(HD){ Object.assign(jt[s],{sh:[0.1,s*2.7,12.4+bob],el:[ex,s*es,ez],hd:[hx,s*hs,hz]}); if(carryingTray()) Object.assign(jt[s],{el:[1.2,s*2.9,9.6+bob],hd:[2.4,s*2.5,10.3+bob]}); continue; }   /* both hands on the tray */
    if(dressed) ipAdd(0.1,s*2.7,12.4+bob,1.25, ex,s*es,ez,1.05, longS?SH:SK,SH,0.62);    // short sleeve (long in the cell)
    else ipAdd(0.1,s*2.7,12.4+bob,1.15, ex,s*es,ez,1.0, SK);
    ipAdd(ex,s*es,ez,1.0, hx,s*hs,hz,0.9, longS?SH:SK);
    ipAdd(hx,s*hs,hz-0.2,1.0, hx+0.1,s*hs,hz-0.2,1.0, SK);                            // bare fists
  }
  if(HD){ const A=appearanceState, J=(/** @type {number} */ s)=>jt[s]; J.pel=[0,0,6.6+bob]; J.chest=[0.4+swayI,swayJ,12.2+bob]; J.head=[0.35,0,15.6+bob];
    const look={sk:[A.R_SKIN,A.R_SKINF],top:[A.R_HSH,A.R_HSHF],pt:[A.R_HPT,A.R_HPTF],shoe:A.R_HSLIP,hair:A.R_HAIR,style:'fringe',stubble:true,cut:true};
    if(state.heroHood) Object.assign(look,{style:'hood',stubble:false,cut:false});
    if(state.isoTowel){ const wet=!!(roomsState.hubAct&&roomsState.hubAct.kind==='shower'&&roomsState.hubAct.t>roomsState.ACT_FADE);   /* the bath: a towel and slippers, under the shower naked */
      Object.assign(look,{top:look.sk,pt:look.sk,shoe:A.R_BOOT,bare:true,censor:false,waist:wet?undefined:A.R_TRUNK}); }   /* in the tub the water hides him */
    const tray=carryingTray(), front=state.hubP.fi+state.hubP.fj>0;   /* the tray is in front of him: drawn over him when he faces the camera */
    if(tray&&!front) drawHeldTray(state.hubP,10.6+bob);
    figureHD(state.hubP,J,look,{pose:state.ipPose,base:state.ipBase,noShadow:still});
    if(tray&&front) drawHeldTray(state.hubP,10.6+bob);
    return; }
  if(dressed) ipAdd(0,0,6.6+bob,2.2, 0.4+swayI,swayJ,12.2+bob,2.85, appearanceState.R_HSH,appearanceState.R_HPT,0.27,0.34,appearanceState.R_HBELT);   // shirt tucked into the trousers, belt
  else ipAdd(0,0,6.6+bob,2.1, 0.4+swayI,swayJ,12.2+bob,2.8, appearanceState.R_SKIN,appearanceState.R_TRUNK,0.34,0.44,appearanceState.R_TT);
  ipAdd(0.35,0,15.6+bob,2.45, 0.35,0,15.6+bob,2.45, appearanceState.R_SKIN);
  if(appearanceState.lk.style!=='bald') ipAdd(-0.5,0,16.5+bob,appearanceState.lk.style==='afro'?2.9:2.25, -0.5,0,16.5+bob,appearanceState.lk.style==='afro'?2.9:2.25, appearanceState.R_HAIR);
  for(let k=0;k<state.ipN;k++) state.ipOrd[k]=k;
  for(let a=1;a<state.ipN;a++){ const v=state.ipOrd[a]; let b=a-1; while(b>=0&&state.ipD[state.ipOrd[b]]>state.ipD[v]){ state.ipOrd[b+1]=state.ipOrd[b]; b--; } state.ipOrd[b+1]=v; }
  if(!still){ bodyPt(0,0,0); shadowEll(Math.round(state.bpX),Math.round(state.bpY),4,1); }
  for(let p=0;p<2;p++) for(let a=0;a<state.ipN;a++){ const k=state.ipOrd[a];
    taper(Math.round(state.ipX0[k]),Math.round(state.ipY0[k]),state.ipR0[k],Math.round(state.ipX1[k]),Math.round(state.ipY1[k]),state.ipR1[k],p,state.ipRp[k],state.ipRp2[k],state.ipZ1[k],state.ipZ2[k],state.ipRp3[k]); }
  if(state.ipPose!==1){ bodyPt(0.35,0,15.6); const hd=state.bpD;                                          // eyes (closed when lying)
    for(let s=-1;s<=1;s+=2){ bodyPt(2.2,s*0.9,15.9+bob); if(state.bpD>hd+0.02) pset(Math.round(state.bpX),Math.round(state.bpY),appearanceState.C_OUT); } }
  state.ipPose=0;
}
function behind(a,b){ return state.drA1[a]<=state.drA0[b]+1e-4||state.drB1[a]<=state.drB0[b]+1e-4; } // a is behind b if it ends before b starts on either axis
function drawScene(){
  let n=0;
  for(const it of state.gymItems){ if(state.GYM_TYPES[it.t].flat||it.held||n>=state.DR_N-1) continue; const r=itemRect(it); state.drA0[n]=r[0]; state.drB0[n]=r[1]; state.drA1[n]=r[2]; state.drB1[n]=r[3];
    state.drRef[n]=it; state.drDone[n]=0; n++; }
  const actOrd=roomsState.hubAct&&roomsState.hubAct.t>=roomsState.ACT_FADE&&roomsState.hubAct.order?roomsState.hubAct:null;   // using furniture: the boxer is drawn right before / after that item
  let pIdx=-1; if(!actOrd&&!state.actors){ state.drA0[n]=state.hubP.i-0.2; state.drB0[n]=state.hubP.j-0.2; state.drA1[n]=state.hubP.i+0.2; state.drB1[n]=state.hubP.j+0.2; state.drRef[n]=null; state.drDone[n]=0; pIdx=n; n++; }
  const NPCL=state.actors?null:state.hubRoom==='cell'?npcsState.CNL:state.hubRoom==='yard'?(cnNight()?null:npcsState.YND):(state.hubRoom==='laznia'?bathState.crowd:null);   // hooded inmates and the turnkeys
  const cnIdx=[]; if(NPCL) for(const C of NPCL){ if(C.after||!C.step) continue; const r=cnRect(C); state.drA0[n]=r[0]; state.drB0[n]=r[1]; state.drA1[n]=r[2]; state.drB1[n]=r[3]; state.drRef[n]=null; state.drDone[n]=0; cnIdx.push([n,C]); n++; }
  const actIdx=[]; if(state.actors) for(const a of state.actors){ state.drA0[n]=a.i-0.25; state.drB0[n]=a.j-0.25; state.drA1[n]=a.i+0.25; state.drB1[n]=a.j+0.25; state.drRef[n]=null; state.drDone[n]=0; actIdx.push([n,a]); n++; }   // fight actors: {i,j,draw}
  for(let left=n;left>0;left--){
    // pick an undrawn element with nothing undrawn behind it (fallback: the one with the smallest centre depth)
    let pick=-1, pd=1e9;
    for(let a=0;a<n;a++){ if(state.drDone[a]) continue; let ok=true; for(let b=0;b<n&&ok;b++){ if(b===a||state.drDone[b]) continue; if(behind(b,a)&&!behind(a,b)) ok=false; }
      const d=state.drA0[a]+state.drA1[a]+state.drB0[a]+state.drB1[a]; if(ok&&(pick<0||d<pd)){ pick=a; pd=d; } }
    if(pick<0){ for(let a=0;a<n;a++) if(!state.drDone[a]){ const d=state.drA0[a]+state.drA1[a]+state.drB0[a]+state.drB1[a]; if(d<pd){ pd=d; pick=a; } } }
    state.drDone[pick]=1;
    const cnE=cnIdx.length?cnIdx.find(e=>e[0]===pick):null;
    const acE=actIdx.length?actIdx.find(e=>e[0]===pick):null;
    if(acE) acE[1].draw(); else if(cnE) cnDraw(cnE[1]); else if(pick===pIdx) drawIsoBoxer(); else { const it=state.drRef[pick], mine=actOrd&&it===actOrd.item;
      if(mine&&actOrd.order==='before') drawIsoBoxer();
      const onIt=NPCL?NPCL.filter(C=>C.after===it):null;
      if(onIt&&onIt.length){ blitSprite(it,0,1); for(const C of onIt) cnDraw(C); blitSprite(it,0,2); }   // inmate on a stool / in a bunk (+ the bunk's front layer over him)
      else blitSprite(it,0);
      if(mine&&actOrd.order==='after'){ drawIsoBoxer(); if(actOrd.kind==='shower'&&it.t==='lshower') blitSprite(it,0,2);   /* in the tub: its near sides over him */
        if(actOrd.kind==='sleep'){ wardBlanket(actOrd); } } }
  }
} function drawHubMarker(){
  if(state.hubTrans.kind||!navigationState.stMenuEl.hidden) return;
  if(!state.hubNear) return; const L=state.hubNear.look;
  const K=state.ISO_K, x=Math.round(isoX(L[0],L[1])), y=Math.round(isoY(L[0],L[1],L[2]))-(9+((boxingState.tick>>3)&1))*K;
  for(let r=0;r<3;r++) for(let dx=-r;dx<=r;dx++) psetK(x+dx*K,y+(4-r)*K,r===2&&Math.abs(dx)===2?appearanceState.C_OUT:appearanceState.C_SPARK);
  psetK(x,y+5*K,appearanceState.C_SPARK);   // the name and the key are in the DOM prompt below the picture
}

export function renderHub(){
  if(hdRoom()&&!rendererState.inHD){ withHD(renderHub); return; }   // Newgate rooms are drawn into the 2× frame
  rendererState.fb=rendererState.FB_MAIN; rendererState.fb.set(state.bgHub);
  if(state.preScene) state.preScene();   // marks on the floor under the people (iso-fight.js)
  if(state.hubRoom==='cell') wardLife();   /* rats, flies and drips under the people */
  drawScene();
  if(state.hubRoom==='cell'){ wardBreath(state.actors||[state.hubP,...npcsState.CNL]); lightCell(); drawCellLights(); wardSmog(); wardVignette(); }   /* the Ward: cold breath, tallow and smog, dark edges */
  else if(state.hubRoom==='laznia') bathFX();   /* gaslight, steam, fog, carbolic */
  if(state.hubRoom==='yard'){ weatherLight(); const b=skyBucket(); if(b===0) dimFB(0.45); else if(b===4) dimFB(0.25); drawRain(); yardFog(); wardBreath(state.actors||npcsState.YND); wardVignette(); }   /* Newgate: smog in the well, breath through the hoods */
  drawActivityOverlay();
  drawHubMarker();
  if(state.hubTrans.kind){
    const x=state.hubTrans.t/state.hubTrans.dur, zz=state.hubTrans.kind===1?1+2.4*x*x:1+2.4*(1-x)*(1-x);
    const K=state.ISO_K; zoomBlit(zz,(72+(state.hubTrans.zx-72)*((zz-1)/2.4))*K,(48+(state.hubTrans.zy-48)*((zz-1)/2.4))*K);   // the centre is in native coordinates
  }
  drawPopups();
}













export function initialize(){

/* Prison rooms share the isometric projection and depth-sorted item renderer. */
state.HUB_GW = 12;
state.HUB_GH = 10;
state.HUB_OX = 66;
state.HUB_WH = 24;
state.ISO_K = 1;
state.HUB_OY = 29;

state.bgHub = new Uint32Array(appearanceState.W*appearanceState.H);

// scanline fill of a convex polygon (points in PX/PY), colour from fn(x,y)
state.PX = new Float32Array(8);
state.PY = new Float32Array(8);

state.BAYER = new Uint8Array([0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5]);

// Room modules register their fixed furniture and stations during initialize().
state.GYM_TYPES = {};
state.ST_INFO = {};
state.gymItems = [];
state.cellList = [];
state.yardList = [];
state.hubRoom = 'cell';
state.bunkFront = false;

/* ---------- player ---------- */
state.hubP = {i:6.2,j:5.6,fi:-0.7071,fj:-0.7071,ph:0,moving:false,pose:0,poseZ:0};
   // pose: 0 stand, 1 lie, 2 sit, 3 eat
state.hubKeys = {u:0,d:0,l:0,r:0};
state.preScene = null;
state.actors = null;   // fight actors drawn by the depth sorter instead of the hero and the inmates (iso-fight.js)

state.hubNear = null;
state.hubLastItem = null;
state.hubTrans = {kind:0,t:0,dur:1,zx:72,zy:48,fn:null};
state.hubFade = 0;
state.fadeInT = 0;

/* ---------- tiny iso boxer (3D skeleton -> iso) ---------- */
state.IP_N = 32;   // the modelled 2× figure has about 25 parts
state.ipX0 = new Float32Array(state.IP_N);
state.ipY0 = new Float32Array(state.IP_N);
state.ipR0 = new Float32Array(state.IP_N);
state.ipX1 = new Float32Array(state.IP_N);
state.ipY1 = new Float32Array(state.IP_N);
state.ipR1 = new Float32Array(state.IP_N);
state.ipD = new Float32Array(state.IP_N);
state.ipRp = new Int16Array(state.IP_N);
state.ipRp2 = new Int16Array(state.IP_N);
state.ipZ1 = new Float32Array(state.IP_N);
state.ipZ2 = new Float32Array(state.IP_N);
state.ipRp3 = new Int16Array(state.IP_N);
state.ipOrd = new Int8Array(state.IP_N);

state.ipN = 0;
state.bpX = 0;
state.bpY = 0;
state.bpD = 0;
state.ipPose = 0;
state.ipBase = 0;
state.ipC = null;

state.ISO_TOWEL = ['#8e969c','#c8ced0','#eef0ee'];
state.ISO_SLIP = ['#1a1c22','#2e3240','#4a5068'];
state.isoTowel = false;
state.CELL_OUTFIT = [[appearanceState.R_HSH,state.CN_TOP_R=['#36302a','#504638','#6a5e4a'],false],[appearanceState.R_HSHF,state.CN_TOP_R,true],[appearanceState.R_HPT,state.CN_PANT_R=['#262420','#38342e','#4e4940'],false],[appearanceState.R_HPTF,state.CN_PANT_R,true],
  [appearanceState.R_HBELT,['#1c2430','#2c3848','#3c4a5e'],false],[appearanceState.R_HSLIP,['#141416','#26262a','#3e3e44'],false]];

state.CN_TOP_R = undefined;
state.CN_PANT_R = undefined;

/* ---------- depth-sorted draw of items + boxer ---------- */
state.DR_N = 64;
state.drA0 = new Float32Array(state.DR_N);
state.drB0 = new Float32Array(state.DR_N);
state.drA1 = new Float32Array(state.DR_N);
state.drB1 = new Float32Array(state.DR_N);
state.drDone = new Uint8Array(state.DR_N);
 state.drRef = new Array(state.DR_N).fill(null);


}

````

---

## `src/renderer.js`

````js
import { state as appearanceState } from './appearance.js';
import { renderArm, renderArmHD } from './armwrestle.js';
import { drawProfShadow } from './profesor.js';
import { state as gymState, renderHub } from './gym.js';
import { state as progressionState } from './progression.js';
import { state as boxingState, drawParticles, drawBoxer, drawPopups } from './boxing.js';
import { renderSpar } from './sparring.js';
import { renderWork } from './work.js';
import { state as pushupsState, drawPushupMeter } from './pushups.js';
import { renderPullup } from './pullups.js';
import { renderRoaches } from './roaches.js';
import { crankFrame, renderCrank } from './crank.js';
import { renderIsoFight } from './iso-fight.js';

// Runtime values owned by renderer; initialized explicitly by main.js.
export const state = {};

/** Newgate rooms are drawn at twice the native resolution (288×192); every other scene stays 144×96. */
export const HD_K = 2;
// Close framing keeps the crank, hands and upper body between the labour HUD panels.
const CRANK_VIEW={x:94,y:76,w:116,h:78};
/** Is the 2× room on screen now? */
export function hubHD(){ return (boxingState.gstate==='hub'||boxingState.gstate==='menu')&&hdRoom(); }
/** Is the current hub room one of the 2× rooms (for baking its background and sprites)? */
export function hdRoom(){ return gymState.hubRoom==='cell'||gymState.hubRoom==='yard'||gymState.hubRoom==='laznia'; }

/** Run fn with the 2× frame as the drawing target: picture size, frame buffers, room background, projection and text scale.
 * Everything is restored afterwards, so the rest of the game never sees the large frame. @template T @param {()=>T} fn @returns {T} */
export function withHD(fn){
  if(state.inHD) return fn();
  const A=appearanceState, H=state.hd, keep={W:A.W,H:A.H,FB:state.FB_MAIN,fb:state.fb,img:state.img,off:state.off,octx:state.octx,scale:state.scale,ox:state.ox,oy:state.oy,bg:gymState.bgHub};
  A.W=H.W; A.H=H.H; state.FB_MAIN=H.fb; if(keep.fb===keep.FB) state.fb=H.fb; state.img=H.img; state.off=H.off; state.octx=H.octx;
  state.scale=H.scale; state.ox=H.ox; state.oy=H.oy; gymState.bgHub=H.bg; gymState.ISO_K=HD_K; state.uiK=HD_K; state.inHD=true;
  try{ return fn(); }
  finally{ A.W=keep.W; A.H=keep.H; state.FB_MAIN=keep.FB; state.fb=keep.fb; state.img=keep.img; state.off=keep.off; state.octx=keep.octx;
    state.scale=keep.scale; state.ox=keep.ox; state.oy=keep.oy; gymState.bgHub=keep.bg; gymState.ISO_K=1; state.uiK=1; state.inHD=false; }
}

/** A native-resolution point of the picture on the screen, in device pixels (the 2× room is mapped through its own scale).
 * @param {number} x @param {number} y @returns {[number,number]} */
export function viewToScreen(x,y){ return [state.vx+x*state.vs,state.vy+y*state.vs]; }
/** A screen point (device pixels) back to native picture coordinates. @param {number} px @param {number} py @returns {[number,number]} */
export function screenToView(px,py){ return [(px-state.vx)/state.vs,(py-state.vy)/state.vs]; }

/** Select a drawing buffer and return the previous one for scoped offscreen rendering. */
export function setFramebuffer(buffer){ const previous=state.fb; state.fb=buffer; return previous; }

/** Aim the cel shading of tapered shapes at a light (a screen-space direction towards it); returns the previous direction.
 * @param {number} lx @param {number} ly @returns {[number,number]} */
export function setLightVec(lx,ly){ const prev=/** @type {[number,number]} */ ([state.LX,state.LY]); state.LX=lx; state.LY=ly; return prev; }

export function pset(x,y,c){ if(x<0||y<0||x>=appearanceState.W||y>=appearanceState.H) return; state.fb[y*appearanceState.W+x]=c; }

export function line(x0,y0,x1,y1,c1,c2){
  x0|=0;y0|=0;x1|=0;y1|=0;
  const dx=Math.abs(x1-x0), sx=x0<x1?1:-1, dy=-Math.abs(y1-y0), sy=y0<y1?1:-1;
  let err=dx+dy, n=0;
  for(;;){ pset(x0,y0,(n++&1)?c2:c1); if(x0===x1&&y0===y1)break; const e2=2*err; if(e2>=dy){err+=dy;x0+=sx;} if(e2<=dx){err+=dx;y0+=sy;} }
}

export // true while drawing parts that overlap the body (near arm, head): inner contours become skin-shadow, not black
function isSkinPx(c){ return c===appearanceState.PAL[appearanceState.R_SKX*3]||c===appearanceState.PAL[appearanceState.R_SKX*3+1]||c===appearanceState.PAL[appearanceState.R_SKX*3+2]||c===appearanceState.PAL[appearanceState.R_SKIN*3]||c===appearanceState.PAL[appearanceState.R_SKIN*3+1]||c===appearanceState.PAL[appearanceState.R_SKIN*3+2]||c===appearanceState.PAL[appearanceState.R_SKINF*3]||c===appearanceState.PAL[appearanceState.R_SKINF*3+1]||c===appearanceState.PAL[appearanceState.R_SKINF*3+2]; }

export function taper(x0,y0,r0,x1,y1,r1,pass,rp,rp2,z1,z2,rp3,bl){
  bl=bl||0;   // muscle belly: radius swells by bl at the middle of the segment
  if(pass===0){r0+=1;r1+=1;}
  const rm=(r0>r1?r0:r1)+bl;
  let minx=Math.floor((x0<x1?x0:x1)-rm), maxx=Math.ceil((x0>x1?x0:x1)+rm);
  let miny=Math.floor((y0<y1?y0:y1)-rm), maxy=Math.ceil((y0>y1?y0:y1)+rm);
  if(minx<0)minx=0; if(miny<0)miny=0; if(maxx>appearanceState.W-1)maxx=appearanceState.W-1; if(maxy>appearanceState.H-1)maxy=appearanceState.H-1;
  const dx=x1-x0, dy=y1-y0, l2=dx*dx+dy*dy, inv=l2>0?1/l2:0;
  for(let y=miny;y<=maxy;y++){
    let i=y*appearanceState.W+minx;
    for(let x=minx;x<=maxx;x++,i++){
      const tr=((x-x0)*dx+(y-y0)*dy)*inv;
      const t=tr<0?0:(tr>1?1:tr);
      const ex=x-(x0+dx*t), ey=y-(y0+dy*t);
      const r=r0+(r1-r0)*t+bl*4*t*(1-t);
      if(ex*ex+ey*ey>r*r) continue;
      if(pass===0){state.fb[i]=(state.softOutline&&isSkinPx(state.fb[i]))?appearanceState.PAL[appearanceState.R_SKIN*3]:appearanceState.C_OUT;continue;}
      const ramp=tr<z1?rp2:(tr<z2?rp3:rp);
      const k=(ex*state.LX+ey*state.LY)/(r>0.5?r:0.5);
      const side=(Math.abs(state.LX)-0.42)*0.10, hi=0.34-side, sh=-0.4+side;   // light from further aside narrows the cel bands; unchanged at the default light
      state.fb[i]=appearanceState.PAL[ramp*3+(k>hi?2:(k<sh?0:1))];
    }
  }
}

export function disc(x,y,r,pass,rp){ taper(x,y,r,x,y,r,pass,rp,0,-9,-9,0); }

/** Zoom the finished frame around (cx,cy) by z: the hub's walk-in / walk-out transition. @param {number} z @param {number} cx @param {number} cy */
export function zoomBlit(z,cx,cy){
  const W=appearanceState.W, H=appearanceState.H, N=W*H;   // the 2× rooms zoom too: scratch buffers follow the picture size
  if(state.zbBuf?.length!==N){ state.zbBuf=new Uint32Array(N); state.zbCol=new Int16Array(W); state.zbRow=new Int16Array(H); }
  const ALT=state.zbBuf; ALT.set(state.FB_MAIN);
  const x0=cx-W/(2*z), y0=cy-H/(2*z);
  for(let x=0;x<W;x++){ const v=Math.floor(x0+x/z); state.zbCol[x]=v<0?0:(v>W-1?W-1:v); }
  for(let y=0;y<H;y++){ const v=Math.floor(y0+y/z); state.zbRow[y]=v<0?0:(v>H-1?H-1:v); }
  for(let y=0;y<H;y++){ const r=state.zbRow[y]*W, o=y*W; for(let x=0;x<W;x++) state.FB_MAIN[o+x]=ALT[r+state.zbCol[x]]; }
}

export function shadowEll(cx,cy,rx,ry){
  rx*=state.uiK; ry*=state.uiK;   // the 2× room: the same shadow, twice the pixels
  const rx2=rx*rx, ry2=(ry+0.5)*(ry+0.5);
  for(let y=-ry;y<=ry;y++)for(let x=-rx;x<=rx;x++){
    const q=(x*x)/rx2+(y*y)/ry2; if(q>1)continue;
    if(!(y===0&&q<=0.8)&&!(state.uiK>1&&q<0.55)&&((x+y+cx)&1))continue;   // 2×: a solid core, dithered rim
    pset(cx+x,cy+y,appearanceState.C_SHADOW);
  }
}

/** Where the picture lands on the screen: left, top and the size of a native pixel, in device pixels. @returns {number[]} */
function viewRect(){
  if(boxingState.gstate==='crank'){
    const d=window.devicePixelRatio||1, w=state.screen.width,h=state.screen.height,short=h/d<500;
    const top=(short?72:110)*d,bottom=(short?110:180)*d;
    const v=CRANK_VIEW,scale=Math.max(.25,Math.min(w/v.w,(h-top-bottom)/v.h));
    return [Math.round((w-v.w*scale)/2-v.x*scale),Math.round(top+(h-top-bottom-v.h*scale)/2-v.y*scale),scale];
  }
  return [state.ox,state.oy,state.scale];
}

/** @param {boolean} face @param {boolean} [blit] false: only place the picture (another renderer paints it) */
function present(face,blit=true){
  const [rx,ry,rs]=viewRect();
  state.vx=rx; state.vy=ry; state.vs=rs*state.uiK;   // where a native pixel lands on the screen (mouse, bubbles, the card fight's rings)
  if(!blit) return;
  const hub=boxingState.gstate==='hub'||boxingState.gstate==='menu', f=hub?Math.max(gymState.hubFade,gymState.fadeInT/14):0;   // the room fade belongs to the hub only (a minigame can start mid-fade)
  if(f>0){ const k=Math.max(0,Math.min(256,(256*(1-f))|0)); for(let i=0;i<appearanceState.W*appearanceState.H;i++){ const c=state.FB_MAIN[i]; state.FB_MAIN[i]=(0xff000000|((((c>>16)&255)*k>>8)<<16)|((((c>>8)&255)*k>>8)<<8)|((c&255)*k>>8))>>>0; } }
  state.octx.putImageData(state.img,0,0);
  state.sctx.fillStyle='#000'; state.sctx.fillRect(0,0,state.screen.width,state.screen.height);
  if(boxingState.gstate==='crank'){
    const v=CRANK_VIEW;
    state.sctx.drawImage(state.off,v.x,v.y,v.w,v.h,rx+(v.x+boxingState.shX)*rs,ry+(v.y+boxingState.shY)*rs,v.w*rs,v.h*rs);
  }else state.sctx.drawImage(state.off,rx+boxingState.shX*rs,ry+boxingState.shY*rs,appearanceState.W*rs,appearanceState.H*rs);
}

export function render(){
  if(boxingState.gstate==='crank'){ crankFrame(); withHD(()=>{ renderCrank(); present(false); }); return; }
  if(boxingState.gstate==='hub'||boxingState.gstate==='menu'){ if(hubHD()) withHD(()=>{ renderHub(); present(false); }); else { renderHub(); present(false); } return; }
  if(boxingState.gstate==='isofight'){ withHD(()=>{ renderIsoFight(); present(false); }); return; }
  if(boxingState.gstate==='spar'){ renderSpar(); drawProfShadow(); present(false); return; }
  if(boxingState.gstate==='pullup'){ renderPullup(); present(false); return; }
  if(boxingState.gstate==='roach'){ renderRoaches(); present(false); return; }
  if(boxingState.gstate==='work'){ renderWork(); present(false); return; }
  if(boxingState.gstate==='arm'){ renderArm(); withHD(()=>{ renderArmHD(); present(false); }); return; }   // arm wrestling: a close-up in the 2× frame
  if(boxingState.gstate!=='pushup') return;   // push-ups on the cell floor: the last side-view mode
  state.fb.set(pushupsState.bgPU);
  drawParticles(true);
  drawBoxer();
  drawParticles(false);
  drawPushupMeter();
  drawPopups();
  present(true);
}

export function resize(){
  const dpr=window.devicePixelRatio||1, r=state.stage.getBoundingClientRect();
  state.screen.width=Math.max(1,Math.floor(r.width*dpr)); state.screen.height=Math.max(1,Math.floor(r.height*dpr));
  state.scale=Math.max(1,Math.floor(Math.min(state.screen.width/appearanceState.W,state.screen.height/appearanceState.H)));
  state.ox=(state.screen.width-appearanceState.W*state.scale)>>1; state.oy=(state.screen.height-appearanceState.H*state.scale)>>1;
  const H=state.hd; H.scale=Math.max(1,Math.floor(Math.min(state.screen.width/H.W,state.screen.height/H.H)));   // the 2× room: its own whole-pixel scale
  H.ox=(state.screen.width-H.W*H.scale)>>1; H.oy=(state.screen.height-H.H*H.scale)>>1;
  state.sctx.imageSmoothingEnabled=false;
}

export function initialize(){


/* =====================================================================
   FRAMEBUFFER (software raster, zero-alloc per frame)
   ===================================================================== */
state.off = document.createElement('canvas');
 state.off.width=appearanceState.W;
 state.off.height=appearanceState.H;

state.octx = state.off.getContext('2d');

state.img = state.octx.createImageData(appearanceState.W,appearanceState.H);

state.FB_MAIN = new Uint32Array(state.img.data.buffer);

state.fb = state.FB_MAIN;   // render target (sparring draws each fighter into a spare buffer first)

state.stage = document.getElementById('stage');

state.screen = document.getElementById('screen');

state.sctx = state.screen.getContext('2d');

state.scale = 1;
state.ox = 0;
state.oy = 0;
state.vx = 0; state.vy = 0; state.vs = 1;
new ResizeObserver(()=>resize()).observe(state.stage);   // the card fight folds the top line away: the stage grows without a window resize
state.uiK = 1;
state.inHD = false;
{ // the 2× frame for the cell: its own canvas, image, frame buffer and room background
  const W=appearanceState.W*HD_K, H=appearanceState.H*HD_K, off=document.createElement('canvas'); off.width=W; off.height=H;
  const octx=/** @type {CanvasRenderingContext2D} */ (off.getContext('2d')), img=octx.createImageData(W,H);
  state.hd={W,H,off,octx,img,fb:new Uint32Array(img.data.buffer),bg:new Uint32Array(W*H),scale:1,ox:0,oy:0};
}

// light comes from above, slightly from the front
state.LX = 0.42;
state.LY = -0.91;

/* Tapered capsule. pass 0 = outline (radius+1, outline color), pass 1 = cel-shaded fill.
   Zones along the axis (t<z1 -> ramp2, t<z2 -> ramp3, else ramp) give trunks/waistband/trim. */
state.softOutline = false;
}

````

---

## `src/appearance.js`

````js
import { LOOK_DEFAULT, LOOK, GEAR_BY_ID, GEAR } from './data.js';

// Runtime values owned by appearance; initialized explicitly by main.js.
export const state = {};

export /* =====================================================================
   PALETTE (3-tone ramps: shadow, mid, highlight) + singles
   ===================================================================== */
function rgb(h){const n=parseInt(h.slice(1),16);return (0xff000000|((n&255)<<16)|(n&0xff00)|(n>>>16))>>>0;}

export function applyLook(look){
  for(const k in LOOK_DEFAULT) state.lk[k]=(LOOK[k].some(o=>o.id===look[k]))?look[k]:LOOK_DEFAULT[k];
  const sk=LOOK.skin.find(o=>o.id===state.lk.skin), hr=LOOK.hair.find(o=>o.id===state.lk.hair);
  setRamp(state.R_SKIN,sk.ramp,false); setRamp(state.R_SKINF,sk.ramp,true); setRamp(state.R_HAIR,hr.ramp,false);
  const sx6=skinExtra(sk.ramp); setRamp(state.R_SKX,sx6,false); setRamp(state.R_SKXF,sx6,true);
} // extra skin tones for the sculpted body: [deep shadow, shadow-mid, mid-light] derived from the 3-tone skin ramp,
// so every skin option keeps working. Deep shadow is cooler/redder (hue-shifted), mid-light a plain blend.
function skinExtra(r){
  const c=r.map(h=>{const n=parseInt(h.slice(1),16);return [n>>16,(n>>8)&255,n&255];}), hx=a=>'#'+a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
  const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
  return [hx([c[0][0]*0.66,c[0][1]*0.52,c[0][2]*0.58+4]), hx(mix(c[0],c[1],0.5)), hx(mix(c[1],c[2],0.5))];
}

export function setRamp(slot,hex,far){
  for(let j=0;j<3;j++){ let c=rgb(hex[j]); if(far){ const r=c&255,g=(c>>8)&255,b=(c>>16)&255; c=(0xff000000|((b*0.72+6)<<16)|((g*0.66)<<8)|(r*0.64))>>>0; } state.PAL[slot*3+j]=c; }
}

export function applyGear(eq){   // eq = {trunks:id, gloves:id, boots:id}
  const t=GEAR_BY_ID[eq.trunks]||GEAR.trunks[0], g=GEAR_BY_ID[eq.gloves]||GEAR.gloves[0], b=GEAR_BY_ID[eq.boots]||GEAR.boots[0];
  setRamp(state.R_TRUNK,t.base,false); setRamp(state.R_TRUNKF,t.base,true); setRamp(state.R_TT,t.trim,false); setRamp(state.R_TTF,t.trim,true); setRamp(state.R_TA,t.acc,false); setRamp(state.R_TAF,t.acc,true);
  setRamp(state.R_GLOVE,g.base,false); setRamp(state.R_GLOVEF,g.base,true); setRamp(state.R_CUFF,g.cuff,false); setRamp(state.R_CUFFF,g.cuff,true); setRamp(state.R_GA,g.acc,false); setRamp(state.R_GAF,g.acc,true);
  setRamp(state.R_BOOT,b.base,false); setRamp(state.R_BOOTF,b.base,true); setRamp(state.R_BTR,b.trim,false); setRamp(state.R_BTRF,b.trim,true);
  state.trStyle=t.style; state.glStyle=g.style; state.btStyle=b.style;

}

export // recolor pixels of ramp `from` (any shade) inside a box to the same shade of ramp `to`, where test(x,y) is true
function rampIndex(c,rp){ return c===state.PAL[rp*3]?0:(c===state.PAL[rp*3+1]?1:(c===state.PAL[rp*3+2]?2:-1)); }

export function initialize(){

/* =====================================================================
   CONSTANTS
   ===================================================================== */
state.W = 144;
state.H = 96;
state.STEP_MS = 1000/60;

state.FLOOR_Y = 86;
state.BASE_X = 56;
state.HIP_Y0 = 66;

state.UPPER = 8.5;
state.FORE = 9.0;
state.THIGH = 11.0;
state.SHIN = 10.5;
state.TORSO = 12.5;
   // body proportions: long legs (wide crouch), longer torso, compact head
state.PIVX = 86;
state.PIVY = -2;

state.RAMPS = [
 ['#7a3f2b','#b86b45','#e59c6b'], // 0 skin (near)
 ['#4f271b','#83482f','#aa6a45'], // 1 skin (far)
 ['#162a7a','#2b4fd6','#6a8cff'], // 2 trunks
 ['#0f1c52','#1f3a9c','#3c5ccc'], // 3 trunks far
 ['#8a93b0','#e2e6f0','#ffffff'], // 4 trim / boots
 ['#5c6480','#a3abc4','#c9cfe0'], // 5 trim / boots far
 ['#6e0f1e','#c8182f','#ff4d5e'], // 6 glove
 ['#470a14','#8e1226','#c22f3e'], // 7 glove far
 ['#2b1810','#5c361e','#8c5830'], // 8 bag leather
 ['#110b0b','#1e1414','#3b2b2b'], // 9 hair
 ['#ffd23f','#ffffff','#ffffff'], // 10 hit flash
];

state.R_SKIN = 0;
state.R_SKINF = 1;
state.R_TRUNK = 2;
state.R_TRUNKF = 3;
state.R_TRIM = 4;
state.R_TRIMF = 5;
state.R_GLOVE = 6;
state.R_GLOVEF = 7;
state.R_BAG = 8;
state.R_HAIR = 9;
state.R_FLASH = 10;

// Gear ramp slots (written at runtime from the equipped items; *F = far/depth variant, auto-darkened)
state.R_TT = 11;
state.R_TTF = 12;
state.R_TA = 13;
state.R_TAF = 14;
state.R_BOOT = 15;
state.R_BOOTF = 16;
state.R_BTR = 17;
state.R_BTRF = 18;
state.R_CUFF = 19;
state.R_CUFFF = 20;
state.R_GA = 21;
state.R_GAF = 22;
state.R_SB = 23;
state.R_SBF = 24;
state.R_SHIRT = 25;
state.R_SHIRTF = 26;
state.R_APRON = 27;
state.R_PANT = 28;
state.R_PANTF = 29;
state.R_NPCS = 30;
state.R_NPCSF = 31;
state.R_NPCC = 32;
state.R_NPCCF = 33;
state.R_NPCK = 34;
state.R_NPCB = 35;
state.R_NPCP = 36;
state.R_NPCPF = 37;
state.R_HSH = 58;
state.R_HSHF = 59;
state.R_HPT = 60;
state.R_HPTF = 61;
state.R_HBELT = 62;
state.R_HSLIP = 63;
state.R_SKX = 64;
state.R_SKXF = 65;
state.N_RAMPS = 226;   // Keep shared palette offsets; 66–95: Ward inmates, 176–195: hooded walkers, 216: Śmierdziel.
state.PAL = new Uint32Array(state.N_RAMPS*3);

for(let i=0;i<state.RAMPS.length;i++)for(let j=0;j<3;j++)state.PAL[i*3+j]=rgb(state.RAMPS[i][j]);

state.lk = Object.assign({},LOOK_DEFAULT);

state.trStyle = 'stripe';
state.glStyle = 'classic';
state.btStyle = 'mid';

state.C_RED = rgb('#ff4d5e');
state.C_OUT = rgb('#0a0a12');
state.C_WALL = rgb('#151a2c');
state.C_WALL_LIT = rgb('#1f2640');
state.C_MORTAR = rgb('#0e1222');
state.C_MORTAR_LIT = rgb('#161c33');
state.C_FLOOR = rgb('#232842');
state.C_FLOOR2 = rgb('#1a1e34');
state.C_FLOOR_EDGE = rgb('#3a4163');
state.C_SHADOW = rgb('#0c0e1c');
state.C_CHAIN = rgb('#9aa0bb');
state.C_CHAIN2 = rgb('#4d536d');
state.C_STRAP = rgb('#1c100a');
state.C_PATCH = rgb('#d8c79e');
state.C_PATCH2 = rgb('#8a7a58');
state.C_BAGSPEC = rgb('#b27442');
state.C_WHITE = rgb('#ffffff');
state.C_SPARK = rgb('#ffd23f');
state.C_SWEAT = rgb('#7fe3ff');
state.C_DUST = rgb('#5a607f');
// shared props: steel (bars, rails, hooks), wood (bars, stools) and the dark meter lanes
state.C_STEEL = rgb('#8a90a8');
state.C_STEEL2 = rgb('#4d536d');
state.C_WOOD0 = rgb('#4a2c16');
state.C_WOOD1 = rgb('#7a4c28');
state.C_WOOD2 = rgb('#a8703e');
state.C_LANE = rgb('#0a0c17');
state.C_LANE2 = rgb('#141830');
state.C_GRAY = rgb('#8a93b0');
state.C_LAMP = rgb('#2b3150');
state.C_BULB = rgb('#fff3b0');
state.C_WIN = rgb('#15234a');
state.C_WIN2 = rgb('#2b4380');
state.C_DEBUG = rgb('#39ff7a');
}

````

---

## `src/boxing.js`

````js
import { state as appearanceState, rampIndex, rgb } from './appearance.js';
import { oppSurface, sparClamp, prisonOut, bareTorsoOut, state as sparringState, stain, sparRaiseGuard, sparDashCost, sparEvadeCost, sparOnAttack, staF } from './sparring.js';
import { wkSurf, drawCap, drawApron, redrawLeadLeg, wkStain, wkImpact } from './work.js';
import { state as animationState, samplePose, isDash } from './animation.js';
import { pset, taper, disc, state as rendererState, line, isSkinPx, shadowEll, setLightVec } from './renderer.js';
import { state as pushupsState } from './pushups.js';
import { sfxFlow, sfxWhoosh, sfxLand } from './audio.js';
import { setInfo } from './input.js';
import { shadeC } from './gym.js';

// Runtime values owned by boxing; initialized explicitly by main.js.
export const state = {};

export function ik(sx,sy,tx,ty,l1,l2,sign){
  let dx=tx-sx, dy=ty-sy, d=Math.sqrt(dx*dx+dy*dy);
  if(d<1e-3){dx=1;dy=0;d=1;tx=sx+1;ty=sy;}
  const maxd=l1+l2-0.01, mind=Math.max(Math.abs(l1-l2),1);
  if(d>maxd){tx=sx+dx/d*maxd;ty=sy+dy/d*maxd;dx=tx-sx;dy=ty-sy;d=maxd;}
  else if(d<mind){tx=sx+dx/d*mind;ty=sy+dy/d*mind;dx=tx-sx;dy=ty-sy;d=mind;}
  const a=(l1*l1-l2*l2+d*d)/(2*d), h=Math.sqrt(Math.max(0,l1*l1-a*a)), ux=dx/d, uy=dy/d;
  state.IKx=sx+ux*a-sign*uy*h; state.IKy=sy+uy*a+sign*ux*h; state.IKtx=tx; state.IKty=ty;
}

/* =====================================================================
   SOLVE POSE -> JOINTS
   ===================================================================== */
function solveArm(shx,shy,relx,rely,r,fl,isLead){
  // Obliczamy IK na wartościach zmiennoprzecinkowych, aby uniknąć schodkowego skakania łokcia
  let gx=shx+relx, gy=shy+rely;
  ik(shx,shy,gx,gy,appearanceState.UPPER,appearanceState.FORE,1);
  gx=state.IKtx; gy=state.IKty;
  const tip=gx+r, surf=state.gstate==='spar'?oppSurface(Math.round(gy)):(state.gstate==='work'?wkSurf(Math.round(gy)):999);
  if(gx+r>surf+state.PENMAX){
    gx=surf+state.PENMAX-r;
    ik(shx,shy,gx,gy,appearanceState.UPPER,appearanceState.FORE,1);
  }
  let ex=state.IKx, ey=state.IKy;
  gx=state.IKtx; gy=state.IKty;

  // Poprawione unoszenie łokcia (fl): zachowuje długość kości (brak zapadania się stawu przy sierpowym)
  if(fl!==0){
    const dx=gx-shx, dy=gy-shy, L=Math.hypot(dx,dy)||1, ux=dx/L, uy=dy/L;
    const vx=ex-shx, vy=ey-shy, pr=vx*ux+vy*uy;
    const px=shx+pr*ux, py=shy+pr*uy; // rzut łokcia na oś bark-pięść
    const h=Math.hypot(ex-px,ey-py);
    // Zamiast liniowego przejścia przez 0, skalujemy odchylenie cosinusem i lekko unosimy łokieć w górę (-Y)
    const angle=Math.max(-1,Math.min(1,fl))*Math.PI;
    const nx=-uy, ny=ux;
    const dir=Math.cos(angle);
    const lift=Math.abs(Math.sin(angle))*0.45;
    ex=px+nx*h*dir;
    ey=py+ny*h*dir-h*lift;
  }

  if(isLead){state.lTipRaw=tip;state.lSurf=surf;state.lex=Math.round(ex);state.ley=Math.round(ey);state.lgx=Math.round(gx);state.lgy=Math.round(gy);}
  else {state.rTipRaw=tip;state.rSurf=surf;state.rex=Math.round(ex);state.rey=Math.round(ey);state.rgx=Math.round(gx);state.rgy=Math.round(gy);}
}

export function solve(){
  if(state.rdOn&&(state.state===animationState.S_KD||state.state===animationState.S_KO)){ if(state.rd.stamp!==state.tick){ state.rd.stamp=state.tick; stepRagdoll(state.rd); } writeRagdoll(state.rd); return; }   // a knocked-down boxer is a Verlet ragdoll, not keyframes
  state.rdOn=0; state.rdLying=false;
  const P=animationState.cur;
  const bx=appearanceState.BASE_X+(state.gstate==='spar'?sparClamp(animationState.posX+P[animationState.GX]):animationState.posX+P[animationState.GX]);
  const fy=appearanceState.FLOOR_Y+Math.round(P[animationState.GY]);

  // Zachowujemy dokładne (float) pozycje kręgosłupa na potrzeby płynnego widoku plakatowego
  const hipXf=bx+P[animationState.BX], hipYf=appearanceState.HIP_Y0+P[animationState.BY]+P[animationState.GY];
  const lean=P[animationState.LEAN], sq=P[animationState.SQ];
  const downBlend=Math.max(0,Math.min(1,(P[animationState.BY]-5)/6)); // 0 w stójce, 1 na deskach (KD/KO)
  const spineLen=Math.max(6,appearanceState.TORSO+sq*(1-downBlend*0.5));
  const leanAng=Math.max(-1.05,Math.min(1.05,lean/13));
  const sxfStand=hipXf+Math.sin(leanAng)*spineLen, syfStand=hipYf-Math.cos(leanAng)*spineLen;
  const sxfDown=hipXf+lean, syfDown=hipYf-appearanceState.TORSO-sq;
  const lag=state.torsoLagX*(1-downBlend);   // the chest lags behind a sudden hip move (updateShorts runs the spring)
  const sxf=sxfStand*(1-downBlend)+sxfDown*downBlend+lag;
  const syf=syfStand*(1-downBlend)+syfDown*downBlend+Math.abs(lag)*0.22;

  state.hipX=Math.round(hipXf); state.hipY=Math.round(hipYf);
  state.sx=Math.round(sxf); state.sy=Math.round(syf);

  const rot=P[animationState.ROT], hrot=P[animationState.HROT];
  // Szersza obręcz barkowa + naturalna asymetria wysokości barków przy rotacji (bark bijący chroni szczękę)
  const shSpan=1.6;
  const shTilt=Math.max(-1.5,Math.min(1.5,rot*0.75-lean*0.08));
  state.lsx=Math.round(sxf+shSpan-2.6*rot);
  state.lsy=Math.round(syf+1+shTilt*0.5);
  state.rsx=Math.round(sxf-shSpan+2.6*rot);
  state.rsy=Math.round(syf+1-shTilt*0.5);

  state.lgr=3.5+P[animationState.LGS]; state.rgr=4+P[animationState.RGS];
  solveArm(state.lsx,state.lsy,P[animationState.LGX],P[animationState.LGY],state.lgr,P[animationState.LFL],true);
  solveArm(state.rsx,state.rsy,P[animationState.RGX],P[animationState.RGY],state.rgr,P[animationState.RFL],false);

  state.headX=Math.round(sxf+2+P[animationState.HX]);
  state.headY=Math.round(syf-6+P[animationState.HY]);

  const st=P[animationState.ST], h=P[animationState.HEEL];
  const la0=Math.round(bx+P[animationState.STEP]+st*0.44), lh=Math.round(P[animationState.LHEEL]);
  const ll=Math.round(P[animationState.LLIFT]), rl=Math.round(P[animationState.RLIFT]);
  const lhU=Math.max(lh,0), lhT=Math.max(-lh,0);
  state.lax=la0+Math.round(lhU*0.6); state.lay=fy-3-lhU-ll;
  const r0=Math.round(bx-st*0.56+P[animationState.RSTEP]), hr=Math.round(h), hrU=Math.max(hr,0), hrT=Math.max(-hr,0);
  state.rax=r0+Math.round(hrU*0.7); state.ray=fy-3-hrU-rl;

  state.lhx=Math.round(hipXf+1.2-hrot*1.1); state.lhy=state.hipY;
  state.rhx=Math.round(hipXf-1.2+hrot*2.8); state.rhy=state.hipY+(hrot>0.5?1:0);
  state.torsoX=Math.round(hipXf+hrot);

  // Kolana: zapobiegamy przeprostowi (wygięciu kolana w tył przy ujemnym LKN)
  const lkn=Math.max(-0.15,P[animationState.LKN]);
  ik(state.lhx,state.lhy,state.lax,state.lay,appearanceState.THIGH,appearanceState.SHIN,-1);
  state.lkx=Math.round(state.IKx+lkn*0.85); state.lky=Math.round(state.IKy+Math.abs(lkn)*0.55);

  ik(state.rhx,state.rhy,state.rax,state.ray,appearanceState.THIGH,appearanceState.SHIN,-1);
  state.rkx=Math.round(state.IKx); state.rky=Math.round(state.IKy);

  state.ltx=la0+4-Math.round(0.6*lhU)-Math.round(0.4*lhT); state.lty=fy-1-ll-lhT;
  state.lhex=la0-1+Math.round(lhU*0.9); state.lhey=fy-1-lhU-ll;
  state.rtx=r0+4-Math.round(1.5*Math.max(0,hrot))-Math.round(0.4*hrT); state.rty=fy-1-rl-hrT;
  state.rhex=r0-1+Math.round(hrU*0.9); state.rhey=fy-1-hrU-rl;

  state.shDirX=0; state.shDirY=1;
  if(state.gstate==='spar'&&P[animationState.BY]>6){
    const dx=(state.lkx+state.rkx)*0.5-state.hipX, dy=(state.lky+state.rky)*0.5-state.hipY, d=Math.sqrt(dx*dx+dy*dy)||1;
    state.shDirX=dx/d; state.shDirY=dy/d;
  }
}
/* =====================================================================
   RAGDOLL (S_KD / S_KO): Verlet points take over the joints the renderer reads.
   Nodes: 0 hips, 1 shoulders, 2 head, 3/4 lead knee/ankle, 5/6 rear knee/ankle, 7/8 lead elbow/glove, 9/10 rear elbow/glove
   ===================================================================== */
const RD_N=11, RD_GRAV=0.22, RD_FRIC=0.80, RD_BOUNCE=0.22;
function rdBones(){ const A=appearanceState; return [[0,1,A.TORSO],[1,2,6.2],[0,3,A.THIGH],[3,4,A.SHIN],[0,5,A.THIGH],[5,6,A.SHIN],[1,7,A.UPPER],[7,8,A.FORE],[1,9,A.UPPER],[9,10,A.FORE],[0,2,A.TORSO+5],[3,5,5.5]]; }   // the last two (spine-head, knee gap) only push apart

/** Hand the joints to the ragdoll with a punch's impulse (+x = knocked back). @param {number} impX @param {number} impY @param {boolean} hitHigh */
export function triggerRagdoll(impX,impY,hitHigh=true){
  const rd=state.rd, pts=[[state.hipX,state.hipY],[state.sx,state.sy],[state.headX,state.headY],[state.lkx,state.lky],[state.lax,state.lay],[state.rkx,state.rky],[state.rax,state.ray],[state.lex,state.ley],[state.lgx,state.lgy],[state.rex,state.rey],[state.rgx,state.rgy]];
  state.rdOn=1; rd.stamp=-1;
  for(let i=0;i<RD_N;i++){ rd.x[i]=rd.px[i]=pts[i][0]; rd.y[i]=rd.py[i]=pts[i][1]; }
  const hm=hitHigh?1.45:0.75;
  rd.px[2]+=impX*hm; rd.py[2]-=impY*hm;
  rd.px[1]+=impX*0.95; rd.py[1]-=impY*0.8;
  rd.px[0]+=impX*0.45; rd.py[0]-=(impY*0.3-0.7);   // the hips are taken out from under him
  rd.px[8]+=impX*1.15; rd.py[8]+=1.4;
  rd.px[10]+=impX*0.75; rd.py[10]+=1.1;
}

/** Return control to the keyframes: he gets up where the hips came to rest. */
export function stopRagdoll(){
  if(!state.rdOn) return;
  state.rdOn=0; state.rdLying=false;
  const pos=state.rd.x[0]-appearanceState.BASE_X-animationState.cur[animationState.BX];
  animationState.posX=state.gstate==='spar'?sparClamp(pos):Math.max(animationState.POS_MIN,Math.min(animationState.POS_MAX,pos));
  animationState.cur[animationState.GX]=0;
}

function stepRagdoll(rd){
  const A=appearanceState, W=A.W, bones=rdBones();
  for(let i=0;i<RD_N;i++){
    const vx=(rd.x[i]-rd.px[i])*0.985, vy=(rd.y[i]-rd.py[i])*0.985+RD_GRAV;
    rd.px[i]=rd.x[i]; rd.py[i]=rd.y[i]; rd.x[i]+=vx; rd.y[i]+=vy;
  }
  for(let it=0;it<4;it++){
    for(let b=0;b<bones.length;b++){
      const [i,j,len]=bones[b], dx=rd.x[j]-rd.x[i], dy=rd.y[j]-rd.y[i], d=Math.hypot(dx,dy)||0.001;
      if(b>=10&&d>=len) continue;
      const diff=(len-d)/d*0.5;
      rd.x[i]-=dx*diff; rd.y[i]-=dy*diff; rd.x[j]+=dx*diff; rd.y[j]+=dy*diff;
    }
    for(const [h,k,a] of [[0,3,4],[0,5,6]]) if(rd.y[k]>Math.max(rd.y[h],rd.y[a])+1.2) rd.y[k]-=0.65;   // knees don't fold the wrong way
    for(let i=0;i<RD_N;i++){
      const fy=A.FLOOR_Y-(i===2?3:1.5);
      if(rd.y[i]>fy){
        const vx=rd.x[i]-rd.px[i], vy=rd.y[i]-rd.py[i];
        rd.y[i]=fy; rd.py[i]=fy+vy*RD_BOUNCE; rd.px[i]=rd.x[i]-vx*RD_FRIC;
        if(i<3&&vy>1.35&&it===0){ sfxLand(Math.min(1.6,vy*0.55)); for(let q=0;q<3;q++) spawn(state.P_DUST,rd.x[i]+(Math.random()-0.5)*6,A.FLOOR_Y-1,(Math.random()-0.5)*1.1,-0.2-Math.random()*0.25,14,A.C_DUST); }
      }
      if(rd.x[i]<12){ rd.x[i]=12; rd.px[i]=12; } else if(rd.x[i]>W-12){ rd.x[i]=W-12; rd.px[i]=W-12; }
    }
  }
}

/** Copy the ragdoll nodes into the joints drawBoxer reads. */
function writeRagdoll(rd){
  const R=Math.round;
  state.hipX=R(rd.x[0]); state.hipY=R(rd.y[0]); state.torsoX=state.hipX;
  state.sx=R(rd.x[1]); state.sy=R(rd.y[1]); state.lsx=state.sx+1; state.lsy=state.sy; state.rsx=state.sx-1; state.rsy=state.sy;
  state.headX=R(rd.x[2]); state.headY=R(rd.y[2]);
  state.lhx=state.hipX+1; state.lhy=state.hipY; state.rhx=state.hipX-1; state.rhy=state.hipY;
  state.lkx=R(rd.x[3]); state.lky=R(rd.y[3]); state.lax=R(rd.x[4]); state.lay=R(rd.y[4]);
  state.rkx=R(rd.x[5]); state.rky=R(rd.y[5]); state.rax=R(rd.x[6]); state.ray=R(rd.y[6]);
  state.lex=R(rd.x[7]); state.ley=R(rd.y[7]); state.lgx=R(rd.x[8]); state.lgy=R(rd.y[8]);
  state.rex=R(rd.x[9]); state.rey=R(rd.y[9]); state.rgx=R(rd.x[10]); state.rgy=R(rd.y[10]);
  state.lhex=state.lax-2; state.lhey=state.lay+1; state.ltx=state.lax+2; state.lty=state.lay+1;
  state.rhex=state.rax-2; state.rhey=state.ray+1; state.rtx=state.rax+2; state.rty=state.ray+1;
  const dx=(state.lkx+state.rkx)*0.5-state.hipX, dy=(state.lky+state.rky)*0.5-state.hipY, d=Math.hypot(dx,dy)||1;
  state.shDirX=dx/d; state.shDirY=dy/d;
  state.rdLying=Math.abs(state.sy-state.hipY)<6.5;
}
function trailRecord(){
  const m=state.state>=0?animationState.MOVES[state.state]:null, punching=m&&m.glove>=0&&m.apex>=0&&state.stateT<=m.times[m.apex]+3;
  for(let h=0;h<2;h++){
    const L=state.trl.h[h];
    for(const p of L) p.a++;
    while(L.length&&L[0].a>8) L.shift();
    if(punching&&m.glove===h){ const gx=h?state.rgx:state.lgx, gy=h?state.rgy:state.lgy, last=L[L.length-1];
      if(!last||Math.abs(last.x-gx)+Math.abs(last.y-gy)>=1){ L.push({x:gx,y:gy,a:0}); if(L.length>6) L.shift(); } }
  }
} function fillDisc(x,y,r,c,dither){ const r2=r*r; for(let yy=Math.floor(y-r);yy<=Math.ceil(y+r);yy++) for(let xx=Math.floor(x-r);xx<=Math.ceil(x+r);xx++){ const dx=xx-x, dy=yy-y; if(dx*dx+dy*dy<=r2&&(!dither||((xx+yy)&1))) pset(xx,yy,c); } } function drawTrails(){
  let rear=false;
  for(let h=0;h<2;h++){
    const L=state.trl.h[h]; if(L.length<2) continue;
    const fade=L[L.length-1].a; if(fade>5) continue;
    let len=0; for(let k=1;k<L.length;k++) len+=Math.hypot(L[k].x-L[k-1].x,L[k].y-L[k-1].y);
    if(len<6) continue;
    const gx=h?state.rgx:state.lgx, gy=h?state.rgy:state.lgy, gr=h?state.rgr:state.lgr, n=L.length; state.TS.length=0;
    for(let k=0;k<n-1;k++){ const p0=L[Math.max(0,k-1)], p1=L[k], p2=L[k+1], p3=L[Math.min(n-1,k+2)], m=Math.max(2,Math.ceil(Math.hypot(p2.x-p1.x,p2.y-p1.y)/0.7));   // Catmull-Rom
      for(let q=0;q<m;q++){ const t=q/m, t2=t*t, t3=t2*t;
        state.TS.push(0.5*(2*p1.x+(p2.x-p0.x)*t+(2*p0.x-5*p1.x+4*p2.x-p3.x)*t2+(3*p1.x-p0.x-3*p2.x+p3.x)*t3), 0.5*(2*p1.y+(p2.y-p0.y)*t+(2*p0.y-5*p1.y+4*p2.y-p3.y)*t2+(3*p1.y-p0.y-3*p2.y+p3.y)*t3)); } }
    state.TS.push(L[n-1].x,L[n-1].y);
    while(state.TS.length>=2&&Math.hypot(state.TS[state.TS.length-2]-gx,state.TS[state.TS.length-1]-gy)<gr-0.3) state.TS.length-=2;   // stop at the glove's edge
    const N=state.TS.length>>1; if(N<3) continue;
    const rMax=gr*0.92*(1-fade/6);
    for(let pass=0;pass<3;pass++) for(let k=0;k<N;k++){ const u=k/(N-1), r=rMax*Math.pow(u,0.9), x=state.TS[2*k], y=state.TS[2*k+1];
      if(r<0.6) continue;
      if(pass===0) fillDisc(x,y,r+0.7,state.C_TRL2,u<0.4); else if(pass===1) fillDisc(x,y,r,state.C_TRL,u<0.3); else if(u>0.5) fillDisc(x,y,r*0.38,state.C_TRLB,false); }
    if(h===1) rear=true;
  }
  // recoil chevrons in front of a straight that snaps back
  const m=state.state>=0?animationState.MOVES[state.state]:null;
  if(m&&(state.state===0||state.state===1)&&m.apex>=0){ const t0=m.times[m.apex]+2, tt=state.stateT-t0;
    if(tt>=0&&tt<9){ const h=m.glove, gx=(h?state.rgx:state.lgx)+(h?state.rgr:state.lgr)+2+(tt>>1), gy=h?state.rgy:state.lgy, c=appearanceState.PAL[(h?appearanceState.R_GLOVE:appearanceState.R_GLOVEF)*3+1];
      for(let k=0;k<2;k++){ const x=gx+k*3; pset(x,gy-1,c); pset(x+1,gy,c); pset(x,gy+1,c); } } }
  return rear;
} // work (butcher): apron / cap / shirt / trousers; mid hook = the carried carcass, drawn between body and head/near arm
function drawGlove(gx,gy,r,ex,ey,far,flash){
  let dx=ex-gx, dy=ey-gy; const d=Math.sqrt(dx*dx+dy*dy)||1; dx/=d; dy/=d;
  const c0x=Math.round(gx+dx*(r-1)), c0y=Math.round(gy+dy*(r-1)), c1x=Math.round(gx+dx*(r+1.5)), c1y=Math.round(gy+dy*(r+1.5));
  const gr=flash?appearanceState.R_FLASH:(far?appearanceState.R_GLOVEF:appearanceState.R_GLOVE), cr=far?appearanceState.R_CUFFF:appearanceState.R_CUFF;
  for(let p=0;p<2;p++){ taper(c0x,c0y,2.2,c1x,c1y,2.0,p,cr,0,-9,-9,0); disc(gx,gy,r,p,gr); }
  if(flash) return;
  if(appearanceState.glStyle==='twotone'){   // top half in the accent colour (knuckle panel)
    const ga=far?appearanceState.R_GAF:appearanceState.R_GA, ri=Math.ceil(r);
    for(let yy=-ri;yy<0;yy++)for(let xx=-ri;xx<=ri;xx++){ const x=gx+xx,y=gy+yy; if(x<0||y<0||x>=appearanceState.W||y>=appearanceState.H)continue; const k=rampIndex(rendererState.fb[y*appearanceState.W+x],gr); if(k>=0) rendererState.fb[y*appearanceState.W+x]=appearanceState.PAL[ga*3+k]; }
  } else if(appearanceState.glStyle==='laced'){   // laces criss-cross the cuff
    const mx=Math.round((c0x+c1x)*0.5), my=Math.round((c0y+c1y)*0.5);
    pset(mx,my,appearanceState.C_OUT); pset(mx-1,my-1,appearanceState.C_OUT); pset(mx+1,my+1,appearanceState.C_OUT);
  }
  pset(gx+1,gy-2,far?appearanceState.PAL[gr*3+2]:appearanceState.C_WHITE); pset(gx+2,gy-2,appearanceState.PAL[gr*3+2]); pset(gx,gy-2,appearanceState.PAL[gr*3+2]);
} function drawHand(gx,gy,ex,ey,far){
  if(bareTorsoOut()){ drawBareFist(gx,gy,ex,ey,far); return; }
  let dx=ex-gx, dy=ey-gy; const d=Math.sqrt(dx*dx+dy*dy)||1; dx/=d; dy/=d;
  const wx=Math.round(gx+dx*2), wy=Math.round(gy+dy*2);
  if(prisonOut()){ for(let p=0;p<2;p++){ taper(wx,wy,1.5,gx,gy,1.5,p,far?appearanceState.R_SKINF:appearanceState.R_SKIN,0,-9,-9,0); disc(gx,gy,1.9,p,far?appearanceState.R_SKINF:appearanceState.R_SKIN); }   // bare knuckles
    pset(gx+(far?0:1),gy-1,appearanceState.PAL[(far?appearanceState.R_SKINF:appearanceState.R_SKIN)*3+2]); return; }
  for(let p=0;p<2;p++){ taper(wx,wy,1.5,gx,gy,1.4,p,far?appearanceState.R_TRIMF:appearanceState.R_TRIM,0,-9,-9,0); disc(gx,gy,1.7,p,far?appearanceState.R_SKINF:appearanceState.R_SKIN); }
  pset(gx,gy+1,appearanceState.PAL[(far?appearanceState.R_TRIMF:appearanceState.R_TRIM)*3+1]);            // wrap across the knuckles
}

/** A clenched hand follows the forearm: wrist, knuckle plane, folded fingers and tucked thumb.
 * @param {number} gx @param {number} gy @param {number} ex @param {number} ey @param {boolean} far */
function drawBareFist(gx,gy,ex,ey,far){
  const len=Math.hypot(gx-ex,gy-ey)||1,ux=(gx-ex)/len,uy=(gy-ey)/len,nx=-uy,ny=ux;
  const ramp=far?appearanceState.R_SKINF:appearanceState.R_SKIN;
  const wx=Math.round(gx-ux*2.5),wy=Math.round(gy-uy*2.5),kx=Math.round(gx+ux*0.7),ky=Math.round(gy+uy*0.7);
  const tx=Math.round(gx-ux*0.8+nx*1.3),ty=Math.round(gy-uy*0.8+ny*1.3);
  for(let p=0;p<2;p++){
    taper(wx,wy,1.25,gx,gy,1.8,p,ramp,0,-9,-9,0);
    taper(gx,gy,1.8,kx,ky,1.65,p,ramp,0,-9,-9,0);
    disc(tx,ty,0.9,p,ramp);
  }
  const marks=[[0.7,-0.7,5],[0.7,0.6,4],[-0.5,0.6,1],[-1.2,1.2,3]];
  for(const [u,v,tone] of marks){
    const x=Math.round(gx+ux*u+nx*v),y=Math.round(gy+uy*u+ny*v);
    if(x>=0&&x<appearanceState.W&&y>=0&&y<appearanceState.H&&isSkinPx(rendererState.fb[y*appearanceState.W+x]))pset(x,y,skinTone(tone,far));
  }
}

export function drawLeg(hx,hy,kx,ky,ax,ay,hex,hey,tx,ty,far){
  const WO=state.workOutfit||prisonOut(), sk=WO?(far?appearanceState.R_PANTF:appearanceState.R_PANT):(far?appearanceState.R_SKINF:appearanceState.R_SKIN), tr=WO?sk:(far?appearanceState.R_TRUNKF:appearanceState.R_TRUNK), tm=WO?sk:(far?appearanceState.R_TTF:appearanceState.R_TT), bt=far?appearanceState.R_BOOTF:appearanceState.R_BOOT, bs=far?appearanceState.R_BTRF:appearanceState.R_BTR;
  const bh=appearanceState.btStyle==='high'?0.55:(appearanceState.btStyle==='low'?0.22:0.4);           // boot shaft height along the shin
  const bx=Math.round(ax+(kx-ax)*bh), by=Math.round(ay+(ky-ay)*bh);
  const sdx=ax-kx, sdy=ay-ky, sl=Math.sqrt(sdx*sdx+sdy*sdy)||1, ux=sdx/sl, uy=sdy/sl;
  const cfx=Math.round(kx+ux*sl*0.32-uy*0.9), cfy=Math.round(ky+uy*sl*0.32+ux*0.9);   // calf sits behind the shin
  for(let p=0;p<2;p++){
    taper(kx,ky,2.1,ax,ay,1.4,p,sk,0,-9,-9,0);
    disc(cfx,cfy,1.9,p,sk);
    taper(hx,hy,3.5,kx,ky,2.2,p,sk,tr,0.7,0.8,tm,0.6);   // long, baggy trunk legs down the thighs
    taper(bx,by,2.0,ax,ay,1.9,p,bt,0,-9,-9,0);
    taper(hex,hey,1.5,tx,ty,1.4,p,bt,0,-9,-9,0);
  }
  // sole: bottom row of the foot in the boot trim colour
  const sy0=Math.max(hey,ty)+1;
  for(let x=Math.min(hex,tx)-1;x<=Math.max(hex,tx)+1;x++){ const i=sy0*appearanceState.W+x; if(sy0<appearanceState.H&&x>=0&&x<appearanceState.W&&rampIndex(rendererState.fb[i],bt)>=0) rendererState.fb[i]=appearanceState.PAL[bs*3+1]; }
  if(appearanceState.btStyle==='stripe'||appearanceState.btStyle==='high') line(bx,by+1,ax,ay-1,appearanceState.PAL[bs*3+(far?1:2)],appearanceState.PAL[bs*3+(far?1:2)]);   // side stripe / high-top trim
  pset(bx+1,by+1,appearanceState.PAL[bt*3]); // lace
} function hLayer(L,skinOnly){
  if(!L) return;
  const rows=L.r;
  for(let j=0;j<rows.length;j++){
    const row=rows[j], y=L.oy+j+state.HO; if(y<0||y>=state.HG) continue;
    for(let i=0;i<row.length;i++){
      const ch=row.charCodeAt(i); if(ch===46) continue;
      const x=L.ox+i+state.HO; if(x<0||x>=state.HG) continue;
      const k=y*state.HG+x;
      if(skinOnly&&!(state.hgrid[k]>=48&&state.hgrid[k]<=53)) continue;   // e.g. the ear only shows where the skull is bare
      state.hgrid[k]=ch===95?0:ch;
    }
  }
} function drawHead(neck=true){
  const hx=Math.round(state.headX), hy=Math.round(state.headY), st=appearanceState.lk.style;
  const HS=i=>appearanceState.PAL[appearanceState.R_HAIR*3+i];
  if(neck) for(let p=0;p<2;p++) taper(state.sx+1,state.sy+1,2.6,hx-1,hy+2,2.2,p,appearanceState.R_SKIN,0,-9,-9,0);   // neck
  state.hgrid.fill(0);
  const S=state.HEAD_STYLE[st]||state.HEAD_STYLE.short;
  hLayer(S.b); hLayer(state.HEAD_BASE); hLayer(S.f);
  hLayer(state.HEAD_FEAT.ear,true);
  if(appearanceState.lk.facial!=='none') hLayer(state.HEAD_FEAT['facial_'+appearanceState.lk.facial]);
  hLayer(state.HEAD_FEAT['eyes_'+appearanceState.lk.eyes]||state.HEAD_FEAT.eyes_normal);
  hLayer(state.HEAD_FEAT['brows_'+appearanceState.lk.brows]||state.HEAD_FEAT.brows_normal);
  if(appearanceState.lk.nose!=='straight') hLayer(state.HEAD_FEAT['nose_'+appearanceState.lk.nose]);
  if(appearanceState.lk.extra!=='none') hLayer(state.HEAD_FEAT['extra_'+appearanceState.lk.extra]);
  for(let y=0;y<state.HG;y++) for(let x=0;x<state.HG;x++){
    const ch=state.hgrid[y*state.HG+x]; if(!ch) continue;
    const X=hx+(x-state.HO), Y=hy+y-state.HO; if(X<0||Y<0||X>=appearanceState.W||Y>=appearanceState.H) continue;
    const i=Y*appearanceState.W+X; let c;
    if(ch>=48&&ch<=53) c=skinTone(ch-48,false);
    else switch(ch){
      case 79: c=isSkinPx(rendererState.fb[i])?skinTone(1,false):appearanceState.C_OUT; break;   // O: over the neck / body it's a soft skin shadow
      case 75: case 69: c=appearanceState.C_OUT; break;                               // K, E
      case 97: c=HS(0); break; case 98: c=HS(1); break; case 99: c=HS(2); break;   // a b c
      case 87: c=appearanceState.PAL[4*3+1]; break; case 119: c=appearanceState.PAL[4*3+2]; break;  // W w
      case 114: c=appearanceState.C_RED; break;                                       // r
      case 113: c=0xff2a2e9a; break;                                                     // q: a fresh cut, dark blood red (#9a2e2a)
      case 84: c=appearanceState.PAL[appearanceState.R_TT*3+1]; break;                                // T
      default: continue;
    }
    rendererState.fb[i]=c;
  }
  if(sparringState.faceDmg>0.2) drawBruises(hx,hy);
  if(state.workOutfit) drawCap(hx,hy);
} // sparring damage builds up on the face: mouse under the eye -> swollen eye -> cut brow -> nosebleed -> split lip
function drawBruises(hx,hy){
  const d=sparringState.faceDmg;
  pset(hx+2,hy,sparringState.C_BRUISE);
  if(d>0.4){ pset(hx+3,hy,sparringState.C_BRUISE); pset(hx+2,hy-1,sparringState.C_BRUISE2); pset(hx+1,hy,sparringState.C_BRUISE2); }
  if(d>0.55){ pset(hx+3,hy-2,sparringState.C_BLOOD2); pset(hx+3,hy-3,sparringState.C_BLOOD); pset(hx+2,hy-3,sparringState.C_BLOOD2); }
  if(d>0.7){ pset(hx+5,hy+1,sparringState.C_BLOOD2); pset(hx+4,hy+2,sparringState.C_BLOOD); }
  if(d>0.85){ pset(hx+1,hy+1,sparringState.C_BRUISE); pset(hx+2,hy+2,sparringState.C_BRUISE2); pset(hx+3,hy+3,sparringState.C_BLOOD); }
}

export function updateShorts(){
  const hxf=state.gstate==='pushup'?pushupsState.puHipX:appearanceState.BASE_X+animationState.posX+animationState.cur[animationState.GX]+animationState.cur[animationState.BX], hyf=state.gstate==='pushup'?pushupsState.puHipY:appearanceState.HIP_Y0+animationState.cur[animationState.BY]+animationState.cur[animationState.GY];
  let vx=hxf-state.prevHX, vy=hyf-state.prevHY; state.prevHX=hxf; state.prevHY=hyf;
  if(vx>3||vx<-3)vx=0; if(vy>3||vy<-3)vy=0;
  state.torsoLagVX+=(-vx*1.55-state.torsoLagX*0.28)-state.torsoLagVX*0.34; state.torsoLagX=Math.max(-2.2,Math.min(2.2,state.torsoLagX+state.torsoLagVX));
  state.trVX+=(-vx*2.4-state.trX)*0.3-state.trVX*0.26; state.trX+=state.trVX;
  state.trVY+=(-vy*1.8-state.trY)*0.3-state.trVY*0.26; state.trY+=state.trVY;
  if(state.trX>2.5)state.trX=2.5; else if(state.trX<-2.5)state.trX=-2.5; if(state.trY>2)state.trY=2; else if(state.trY<-2)state.trY=-2;
} function trunkPattern(hmx,hmy){
  if(appearanceState.trStyle!=='dots'&&appearanceState.trStyle!=='check'&&appearanceState.trStyle!=='flames') return;
  const y0=Math.max(0,state.hipY-4), y1=Math.min(appearanceState.H-1,hmy+5), x0=Math.max(0,state.hipX-9), x1=Math.min(appearanceState.W-1,state.hipX+10);
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
    const i=y*appearanceState.W+x, c=rendererState.fb[i];
    let far=false, k=rampIndex(c,appearanceState.R_TRUNK); if(k<0){ k=rampIndex(c,appearanceState.R_TRUNKF); far=true; } if(k<0) continue;
    const rx=x-hmx+16, ry=y-state.hipY+16;
    let on=false;
    if(appearanceState.trStyle==='dots') on=((rx&3)===0&&(ry&3)===0)||((rx&3)===2&&(ry&3)===2);
    else if(appearanceState.trStyle==='check') on=(((rx>>1)+(ry>>1))&1)===1;
    else { const fh=state.FLAME[rx&7]; on=(hmy+4-y)<fh; if(on&&(hmy+4-y)===fh-1) k=2; }
    if(on) rendererState.fb[i]=appearanceState.PAL[(far?appearanceState.R_TAF:appearanceState.R_TA)*3+k];
  }
}

export function torsoEdge(y,front){   // torso silhouette x at row y (front or back edge)
  const y0=state.hipY+1, y1=state.sy+2; let t=(y-y0)/(y1-y0); if(t<0)t=0; else if(t>1)t=1;
  const ax=state.torsoX+(state.sx-state.torsoX)*t, r=3.9+2.2*t+0.35*4*t*(1-t);
  return Math.round(front?ax+r:ax-r);
}

function skinTone(k,far){
  const a=(far?appearanceState.R_SKINF:appearanceState.R_SKIN)*3, x=(far?appearanceState.R_SKXF:appearanceState.R_SKX)*3;
  return k<=0?appearanceState.PAL[x]:(k===1?appearanceState.PAL[a]:(k===2?appearanceState.PAL[x+1]:(k===3?appearanceState.PAL[a+1]:(k===4?appearanceState.PAL[x+2]:appearanceState.PAL[a+2]))));
}

/** Shade the biceps and forearm in joint-local coordinates, keeping the existing skin silhouette.
 * @param {number} sx @param {number} sy @param {number} ex @param {number} ey
 * @param {number} gx @param {number} gy @param {boolean} far */
function drawArmMuscles(sx,sy,ex,ey,gx,gy,far){
  const cap=far?3.2:3.9;
  for(let y=Math.max(0,Math.ceil(sy-cap));y<=Math.min(appearanceState.H-1,Math.floor(sy+cap));y++)for(let x=Math.max(0,Math.ceil(sx-cap));x<=Math.min(appearanceState.W-1,Math.floor(sx+cap));x++){
    const nx=(x-sx)/cap,ny=(y-sy)/cap,z2=1-nx*nx-ny*ny,i=y*appearanceState.W+x;
    if(z2<=0.1||!isSkinPx(rendererState.fb[i]))continue;
    const light=nx*rendererState.LX+ny*rendererState.LY+0.6*Math.sqrt(z2);
    rendererState.fb[i]=skinTone(Math.max(0,Math.min(5,Math.round(2.7+2.2*light))),far);
  }
  const bend=Math.max(0,1-Math.hypot(gx-sx,gy-sy)/(appearanceState.UPPER+appearanceState.FORE));
  const segments=[[sx,sy,ex,ey,3.1,2.2,0.95+0.45*bend],[ex,ey,gx,gy,2.5,1.65,0.5]];
  for(let part=0;part<segments.length;part++){
    const [ax,ay,bx,by,r0,r1,bulge]=segments[part],dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy);
    if(len<1)continue;
    const ux=dx/len,uy=dy/len,nx=-uy,ny=ux,light=nx*rendererState.LX+ny*rendererState.LY;
    const x0=Math.max(0,Math.floor(Math.min(ax,bx)-5)),x1=Math.min(appearanceState.W-1,Math.ceil(Math.max(ax,bx)+5));
    const y0=Math.max(0,Math.floor(Math.min(ay,by)-5)),y1=Math.min(appearanceState.H-1,Math.ceil(Math.max(ay,by)+5));
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const t=((x-ax)*ux+(y-ay)*uy)/len;
      if(t<0.06||t>0.96)continue;
      const r=r0+(r1-r0)*t+bulge*4*t*(1-t),across=((x-ax)*nx+(y-ay)*ny)/r;
      const i=y*appearanceState.W+x;
      if(Math.abs(across)>0.94||!isSkinPx(rendererState.fb[i]))continue;
      let value=2.7+across*light*2.1+0.85*Math.sqrt(1-across*across);
      if(part===0){
        value+=0.75*Math.sin(Math.PI*t);
        if(Math.abs(across)<0.16&&t>0.25&&t<0.8) value-=0.9; // bruzda między bicepsem a tricepsem
        if(t>0.78) value-=1.1;
      } else {
        if(t<0.18) value-=0.7;
        if(t>0.2&&t<0.75&&Math.abs(across-0.22)<0.2) value+=0.75; // mięsień ramienno-promieniowy
      }
      rendererState.fb[i]=skinTone(Math.max(0,Math.min(5,Math.round(value))),far);
    }
  }
  const dx=ex-sx,dy=ey-sy,len=Math.hypot(dx,dy)||1;
  const x=Math.round(sx+dx*0.28+dy/len*1.5),y=Math.round(sy+dy*0.28-dx/len*1.5);
  if(x>=0&&x<appearanceState.W&&y>=0&&y<appearanceState.H&&isSkinPx(rendererState.fb[y*appearanceState.W+x]))pset(x,y,skinTone(1,far));
}

/** Sparse hair clusters follow the chest's changing edges; skin clipping preserves its silhouette. */
function drawChestHair(){
  const rows=['h..h.h','.hh.h.','h.hhh.','.hh.h.','..h.h.','...h..'], color=appearanceState.PAL[appearanceState.R_HAIR*3+1];
  for(let j=0;j<rows.length;j++){
    const y=state.sy+4+j; if(y>=state.hipY-3)break;
    const left=torsoEdge(y,false)+2, right=torsoEdge(y,true)-2;
    for(let k=0;k<rows[j].length;k++)if(rows[j][k]==='h'){
      const x=Math.round(left+(right-left)*k/5);
      if(x>=0&&x<appearanceState.W&&y>=0&&y<appearanceState.H&&isSkinPx(rendererState.fb[y*appearanceState.W+x]))pset(x,y,color);
    }
  }
}

export function drawBoxer(){
  const PU=state.gstate==='pushup', PO=prisonOut(), BARE=bareTorsoOut(), SHIRT=PO&&!BARE, WO=state.workOutfit||PO, GLV=!(PU||WO);
  if(GLV) trailRecord();
  if(PU) shadowEll(Math.round((state.lax+pushupsState.PU_HANDX)*0.5),appearanceState.FLOOR_Y,15,1);
  else if(state.gstate!=='spar') shadowEll(state.hipX,appearanceState.FLOOR_Y,Math.round(animationState.cur[animationState.ST]*0.5+6+animationState.cur[animationState.GY]*0.8),1);   // (spar: shadows go on the floor buffer)
  const SS=appearanceState.PAL[appearanceState.R_SKIN*3], SH=appearanceState.PAL[appearanceState.R_SKIN*3+2];
  // In the crank side view the far arm is occluded by the torso and the near arm.
  if(state.gstate!=='crank'){
  // far (lead) arm
  for(let p=0;p<2;p++){ taper(state.lsx,state.lsy,2.8,state.lex,state.ley,1.9,p,appearanceState.R_SKINF,0,-9,-9,0,0.6); taper(state.lex,state.ley,2.1,state.lgx,state.lgy,1.5,p,appearanceState.R_SKINF,0,-9,-9,0,0.3); }
  if(BARE) drawArmMuscles(state.lsx,state.lsy,state.lex,state.ley,state.lgx,state.lgy,true);
  if(state.workOutfit) for(let p=0;p<2;p++) taper(state.lsx,state.lsy,2.7,Math.round(state.lsx+(state.lex-state.lsx)*0.45),Math.round(state.lsy+(state.ley-state.lsy)*0.45),2.2,p,appearanceState.R_SHIRTF,0,-9,-9,0);   // short sleeve
  if(SHIRT){ const cx=Math.round(state.lex+(state.lgx-state.lex)*0.72), cy=Math.round(state.ley+(state.lgy-state.ley)*0.72);   // drelich: long sleeve down to the wrist
    for(let p=0;p<2;p++){ taper(state.lsx,state.lsy,3.0,state.lex,state.ley,2.3,p,appearanceState.R_SHIRTF,0,-9,-9,0); taper(state.lex,state.ley,2.3,cx,cy,1.9,p,appearanceState.R_SHIRTF,0,-9,-9,0); } }
  if(PU||WO) drawHand(state.lgx,state.lgy,state.lex,state.ley,true); else drawGlove(state.lgx,state.lgy,state.lgr,state.lex,state.ley,true,state.flashL>0);
  }
  if(!BARE){
    drawLeg(state.lhx,state.lhy,state.lkx,state.lky,state.lax,state.lay,state.lhex,state.lhey,state.ltx,state.lty,true);
    drawLeg(state.rhx,state.rhy,state.rkx,state.rky,state.rax,state.ray,state.rhex,state.rhey,state.rtx,state.rty,false);
  }
  // V-shaped torso: narrow waist, lat flare, broad chest
  // plank: a flatter chest (seen from the side the ribcage is shallower than the standing V-taper suggests)
  const TSK=(state.workOutfit||SHIRT)?appearanceState.R_SHIRT:appearanceState.R_SKIN, TTR=WO?appearanceState.R_PANT:appearanceState.R_TRUNK, TTT=WO?appearanceState.R_PANT:appearanceState.R_TT;
  for(let p=0;p<2;p++){
    if(BARE) taper(state.torsoX,state.hipY-3,3.5,state.sx,state.sy+2,6.1,p,TSK,0,-9,-9,0,0.35);
    else taper(state.torsoX,state.hipY+1,PU?3.3:3.9,state.sx,state.sy+2,(PU||state.gstate==='crank')?4.6:6.1,p,TSK,TTR,0.28,0.38,TTT,PU?0:0.35);
  }
  if(BARE){
    // Lead arm and lead leg share the far side; the rear leg overlaps at the hip.
    drawLeg(state.lhx,state.lhy,state.lkx,state.lky,state.lax,state.lay,state.lhex,state.lhey,state.ltx,state.lty,true);
    drawLeg(state.rhx,state.rhy,state.rkx,state.rky,state.rax,state.ray,state.rhex,state.rhey,state.rtx,state.rty,false);
  }
  // muscle definition (front of the torso faces the opponent)
  if(!PU&&!sparringState.lyingDraw&&(!WO||BARE)){
  const fp=torsoEdge(state.sy+5,true);
  pset(fp-1,state.sy+3,SH); pset(fp-2,state.sy+3,SH);                                   // pec highlight
  pset(fp-1,state.sy+5,SS); pset(fp-2,state.sy+5,SS); pset(fp-3,state.sy+6,SS);               // under-pec line
  for(let ya=state.sy+7;ya<state.hipY-3;ya+=2){ const fa=torsoEdge(ya,true); pset(fa-1,ya,SS); pset(fa-3,ya,SS); pset(fa-2,ya+1,SH); }   // abs
  { const fs=torsoEdge(state.sy+7,true); pset(fs-5,state.sy+7,SS); pset(fs-4,state.sy+8,SS); }   // serratus
  { const bk=torsoEdge(state.sy+4,false); pset(bk+1,state.sy+3,SH); pset(bk+1,state.sy+4,SH); }  // lat rim light
  }
  if(BARE) drawChestHair();
  // loose trunks over the hips (hem swings with momentum), side seam stripe, waistband
  // shDirX/Y = direction from the hips towards the knees ((0,1) standing, along the body in a plank)
  if(state.workOutfit){ drawApron(); redrawLeadLeg(); }
  else if(PO){ if(PU){} else { if(!BARE&&!sparringState.lyingDraw){ const x0=torsoEdge(state.hipY-2,false)+1, x1=torsoEdge(state.hipY-2,true)-1; for(let x=x0;x<=x1;x++) pset(x,state.hipY-2,appearanceState.PAL[appearanceState.R_PANT*3+2]); }   // drelich: shirt over the trousers, waistband seam
    if(SHIRT){ const bx=torsoEdge(state.sy+8,true)-2; for(let y=state.sy+4;y<state.hipY-3;y+=3) pset(bx,y,appearanceState.PAL[appearanceState.R_SHIRT*3]); } } }                              // button placket
  else {
  const hmx=state.hipX+Math.round(state.shDirX*3.5+state.trX), hmy=state.hipY+Math.round(state.shDirY*3.5+state.trY);
  const sr0=PU?3.4:4.0, sr1=PU?3.9:4.3;
  for(let p=0;p<2;p++) taper(state.torsoX,state.hipY,sr0,hmx,hmy,sr1,p,appearanceState.R_TRUNK,0,-9,-9,0);
  for(let dy=-5;dy<=5;dy++)for(let dx=-5;dx<=5;dx++){ const d=Math.sqrt(dx*dx+dy*dy); if(d>sr1-1.1&&d<=sr1&&dx*state.shDirX+dy*state.shDirY>=1.8) pset(hmx+dx,hmy+dy,appearanceState.PAL[appearanceState.R_TT*3+(dx>0?2:1)]); }   // hem
  trunkPattern(hmx,hmy);
  if(appearanceState.trStyle==='stripe'||appearanceState.trStyle==='panel'){   // side seam stripe (panel = 3 px wide)
    const sx1=hmx+Math.round(state.trX*0.5), sc=appearanceState.PAL[appearanceState.R_TA*3+1];
    const ex1=sx1+Math.round(state.shDirX*3)-Math.round(state.trX*0.5*Math.abs(state.shDirX)), ey1=hmy+Math.round(state.shDirY*3);
    line(state.torsoX,state.hipY-1,ex1,ey1,sc,sc);
    if(appearanceState.trStyle==='panel'){ line(state.torsoX-1,state.hipY-1,ex1-1,ey1,appearanceState.PAL[appearanceState.R_TA*3],appearanceState.PAL[appearanceState.R_TA*3]); line(state.torsoX+1,state.hipY-1,ex1+1,ey1,appearanceState.PAL[appearanceState.R_TA*3+2],appearanceState.PAL[appearanceState.R_TA*3+2]); }
  }
  if(!PU&&!sparringState.lyingDraw&&(state.trX>0.8||state.trX<-0.8)){ const fx=state.trX>0?-1:1; pset(hmx+fx*2,hmy,appearanceState.PAL[appearanceState.R_TRUNK*3]); pset(hmx+fx*3,hmy-1,appearanceState.PAL[appearanceState.R_TRUNK*3]); }   // fabric fold
  if(!PU&&!sparringState.lyingDraw) for(let yb=state.hipY-3;yb<=state.hipY-2;yb++){ const x0=torsoEdge(yb,false)+1, x1=torsoEdge(yb,true)-1; for(let x=x0;x<=x1;x++) pset(x,yb,appearanceState.PAL[appearanceState.R_TT*3+(yb===state.hipY-3?2:1)]); }
  }
  if(state.workMidHook) state.workMidHook();
  rendererState.softOutline=true; drawHead(); rendererState.softOutline=false;
  // near (rear) arm: deltoid cap, biceps belly, forearm thicker at the elbow
  rendererState.softOutline=true;
  for(let p=0;p<2;p++){ disc(state.rsx,state.rsy,PU?2.7:3.4,p,appearanceState.R_SKIN); taper(state.rsx,state.rsy,2.8,state.rex,state.rey,2.0,p,appearanceState.R_SKIN,0,-9,-9,0,0.8); taper(state.rex,state.rey,2.2,state.rgx,state.rgy,1.6,p,appearanceState.R_SKIN,0,-9,-9,0,0.35); }
  rendererState.softOutline=false;
  if(BARE) drawArmMuscles(state.rsx,state.rsy,state.rex,state.rey,state.rgx,state.rgy,false);
  if(state.workOutfit) for(let p=0;p<2;p++) taper(state.rsx,state.rsy,3.0,Math.round(state.rsx+(state.rex-state.rsx)*0.45),Math.round(state.rsy+(state.rey-state.rsy)*0.45),2.5,p,appearanceState.R_SHIRT,0,-9,-9,0);   // short sleeve
  if(SHIRT){ const cx=Math.round(state.rex+(state.rgx-state.rex)*0.72), cy=Math.round(state.rey+(state.rgy-state.rey)*0.72);   // long drelich sleeve
    for(let p=0;p<2;p++){ disc(state.rsx,state.rsy,3.5,p,appearanceState.R_SHIRT); taper(state.rsx,state.rsy,3.1,state.rex,state.rey,2.5,p,appearanceState.R_SHIRT,0,-9,-9,0); taper(state.rex,state.rey,2.5,cx,cy,2.0,p,appearanceState.R_SHIRT,0,-9,-9,0); } }
  if(!SHIRT){ let dx=state.rex-state.rsx, dy=state.rey-state.rsy; const d=Math.sqrt(dx*dx+dy*dy)||1; dx/=d; dy/=d;
    pset(Math.round(state.rsx+dx*3.2+dy*1.5),Math.round(state.rsy+dy*3.2-dx*1.5),SS);   // deltoid/biceps split
    pset(state.rsx,state.rsy-2,SH); }
  if(PU||WO) drawHand(state.rgx,state.rgy,state.rex,state.rey,false); else drawGlove(state.rgx,state.rgy,state.rgr,state.rex,state.rey,false,state.flashR>0);
  const SHOW_TRAIL = !PU && (GLV || state.gstate === 'spar' || prisonOut());
  if(SHOW_TRAIL && drawTrails()){ if(GLV) drawGlove(state.rgx,state.rgy,state.rgr,state.rex,state.rey,false,state.flashR>0); else drawHand(state.rgx,state.rgy,state.rex,state.rey,false); }   // smear over the body, glove crisp on top
  if(state.lightStrength>0.01) applyDirectionalBodyLight();
}

/* =====================================================================
   SCENE LIGHT: one source (a window, a lamp) in picture coordinates; each fighter is shaded in his own frame,
   so a mirrored fighter gets the x of the light flipped. Off (strength 0) outside the scenes that set it.
   ===================================================================== */
/** Place the scene's light. @param {number} wx @param {number} wy @param {number} strength */
export function setVenueLight(wx,wy,strength){ state.lightWX=wx; state.lightWY=wy; state.lightStrength=strength; }

/** Back to the default top-front light of every other mode. */
export function clearVenueLight(){ state.lightStrength=0; state.lightDir=1; setLightVec(0.42,-0.91); }

/** Aim taper() shading and the body pass at the light for the fighter about to be drawn. @param {number} worldX where he stands in the picture @param {boolean} mirrored whether his buffer is flipped when composited */
export function setupFighterLight(worldX,mirrored){
  let dx=state.lightWX-worldX, dy=state.lightWY-(appearanceState.HIP_Y0-appearanceState.TORSO*0.5);
  const d=Math.hypot(dx,dy)||1; dx/=d; dy/=d;
  state.lightDir=mirrored?-dx:dx; setLightVec(state.lightDir,dy);
}

/** After the body is drawn: a rim light on the edge facing the light, the lit half brighter and the far half darker. */
function applyDirectionalBodyLight(){
  const str=state.lightStrength, dir=state.lightDir>=0?1:-1, W=appearanceState.W, H=appearanceState.H, fb=rendererState.fb, C_OUT=appearanceState.C_OUT, C_SHADOW=appearanceState.C_SHADOW;
  const cx=Math.round((state.hipX+state.sx)*0.5), x0=Math.max(1,cx-20), x1=Math.min(W-2,cx+20), y0=Math.max(1,Math.min(state.headY,state.sy)-10), y1=Math.min(H-2,appearanceState.FLOOR_Y+1);
  for(let y=y0;y<=y1;y++){
    const row=y*W;
    for(let x=x0;x<=x1;x++){
      const c=fb[row+x]; if(!c||c===C_OUT||c===C_SHADOW) continue;
      const u=Math.max(-1,Math.min(1,((x-cx)/9.5)*dir));   // > 0: the side facing the light
      const nbr=fb[row+x+dir];
      if(u>0.1&&(nbr===0||nbr===C_OUT)&&y<state.hipY+3) fb[row+x]=shadeC(c,1+str*0.55);
      else if(u>0.2) fb[row+x]=shadeC(c,1+(u-0.2)*str*0.35);
      else if(u<-0.05) fb[row+x]=shadeC(c,Math.max(0.5,1+(u+0.05)*str*0.85));
    }
  }
}

// Cheap integer hash for procedural textures and deterministic scene details.
export function h2(a,b){ let h=Math.imul(a,374761393)+Math.imul(b,668265263)|0; h=Math.imul(h^(h>>>13),1274126177); return (h>>>24)&255; }

export function spawn(type,x,y,vx,vy,life,col){
  if(sparringState.mirrorCtx){ x=appearanceState.W-1-x; vx=type===state.P_SMEAR?appearanceState.W-1-vx:-vx; }   // sparring: the opponent is simulated in a mirrored frame
  for(let n=0;n<state.MAXP;n++){
    const i=(state.pCur+n)%state.MAXP;
    if(state.pL[i]<=0){state.pT[i]=type;state.pX[i]=x;state.pY[i]=y;state.pVX[i]=vx;state.pVY[i]=vy;state.pL[i]=life;state.pM[i]=life;state.pC[i]=col;state.pCur=(i+1)%state.MAXP;return;}
  }
}

/** Clear particles when starting a fresh fight so old drops cannot stain new clothes. */
export function clearParticles(){ state.pL.fill(0); }

function isBloodC(c){ return c===sparringState.C_BLOOD||c===sparringState.C_BLOOD2||c===state.C_BLOOD_DARK||c===state.C_BLOOD_MID||c===state.C_BLOOD_BRIGHT; }

export function updateParticles(){
  for(let i=0;i<state.MAXP;i++){
    if(state.pL[i]<=0)continue;
    state.pL[i]--;
    const t=state.pT[i];
    if(t===state.P_SWEAT||t===state.P_BIT||t===state.P_DRIP){
      const age=state.pM[i]-state.pL[i], heavy=t!==state.P_SWEAT;
      if(t===state.P_DRIP&&age<13){ state.pY[i]+=0.16; state.pX[i]+=state.pVX[i]*0.12; }   // viscous phase: the drop slides before it lets go
      else{ state.pVX[i]*=heavy?0.96:0.88; state.pVY[i]=state.pVY[i]*0.98+(heavy?0.13:0.055); state.pX[i]+=state.pVX[i]; state.pY[i]+=state.pVY[i]; }   // mist loses its push quickly, heavy drops fall steeply
      const floorY=appearanceState.FLOOR_Y-(t===state.P_BIT&&state.gstate==='work'?(i%5):0);
      if(state.pY[i]>=floorY){
        if(isBloodC(state.pC[i])){
          if(state.gstate==='spar')stain(state.pX[i]);else if(state.gstate==='work')wkStain(state.pX[i],state.pY[i]);
          if(state.pVY[i]>1.35&&Math.random()<0.55) spawn(state.P_SWEAT,state.pX[i],floorY-1,(Math.random()-0.5)*1.0,-0.35-Math.random()*0.35,7,state.C_BLOOD_DARK);   // a small splash off the boards
        }
        state.pL[i]=0;
      }
    }
    else if(t===state.P_SPARK){state.pVX[i]*=0.86;state.pVY[i]=state.pVY[i]*0.86+0.04;state.pX[i]+=state.pVX[i];state.pY[i]+=state.pVY[i];}
    else if(t===state.P_DUST){state.pX[i]+=state.pVX[i];state.pY[i]+=state.pVY[i];state.pVX[i]*=0.92;state.pVY[i]*=0.95;}
  }
} function drawBurst(x,y,s,v){
  const A=v?[[1,-1],[1,1],[-1,1],[-1,-1]]:[[1,0],[0,1],[-1,0],[0,-1]], B=v?[[1,0],[0,1],[-1,0],[0,-1]]:[[1,1],[-1,1],[1,-1],[-1,-1]], d=v?0.78:1;
  for(let n=0;n<4;n++){ const dx=A[n][0], dy=A[n][1], L=Math.round(s*d*state.BURST_LEN[n]);
    for(let k=0;k<=L;k++){ pset(x+dx*k,y+dy*k,appearanceState.C_WHITE); if(k<L*0.45){ pset(x+dx*k+dy,y+dy*k-dx,appearanceState.C_WHITE); pset(x+dx*k-dy,y+dy*k+dx,appearanceState.C_WHITE); } } }
  for(let n=0;n<4;n++){ const dx=B[n][0], dy=B[n][1], L=Math.round(s*0.45*state.BURST_LEN[(n+2)&3]); for(let k=1;k<=L;k++) pset(x+dx*k,y+dy*k,state.C_TRL); }
  for(let yy=-2;yy<=2;yy++) for(let xx=-2;xx<=2;xx++) if(xx*xx+yy*yy<=(s>4?5:2)) pset(x+xx,y+yy,appearanceState.C_WHITE);
}

export function drawParticles(smearPass){
  for(let i=0;i<state.MAXP;i++){
    if(state.pL[i]<=0)continue;
    const t=state.pT[i]; if((t===state.P_SMEAR)!==smearPass)continue;
    const x=Math.round(state.pX[i]), y=Math.round(state.pY[i]), age=state.pM[i]-state.pL[i];
    if(t===state.P_BIT||t===state.P_DRIP){
      pset(x,y,state.pC[i]);
      if(isBloodC(state.pC[i])&&Math.hypot(state.pVX[i],state.pVY[i])>1.75) pset(Math.round(state.pX[i]-state.pVX[i]*0.55),Math.round(state.pY[i]-state.pVY[i]*0.55),state.C_BLOOD_DARK);   // only a fast blood drop drags a dark 1px tail
    }
    else if(t===state.P_SWEAT){ if(state.pL[i]>6||((x+y+state.tick)&1)) pset(x,y,state.pC[i]); }   // one pixel, dithered out at the end of its life: no white fringe
    else if(t===state.P_SPARK){line(x,y,Math.round(state.pX[i]-state.pVX[i]*2),Math.round(state.pY[i]-state.pVY[i]*2),age<3?appearanceState.C_WHITE:state.pC[i],age<3?appearanceState.C_WHITE:state.pC[i]);}
    else if(t===state.P_DUST){ if(state.pL[i]>4||((x+y)&1)) pset(x,y,state.pC[i]); }
    else if(t===state.P_STAR){
      const r=age<2?4:(age<4?3:2), core=age<2;
      for(let k=1;k<=r;k++){pset(x-k,y,appearanceState.C_SPARK);pset(x+k,y,appearanceState.C_SPARK);pset(x,y-k,appearanceState.C_SPARK);pset(x,y+k,appearanceState.C_SPARK);}
      for(let k=1;k<r-1;k++){pset(x-k,y-k,appearanceState.C_WHITE);pset(x+k,y-k,appearanceState.C_WHITE);pset(x-k,y+k,appearanceState.C_WHITE);pset(x+k,y+k,appearanceState.C_WHITE);}
      pset(x,y,appearanceState.C_WHITE); if(core){pset(x+1,y,appearanceState.C_WHITE);pset(x-1,y,appearanceState.C_WHITE);pset(x,y+1,appearanceState.C_WHITE);pset(x,y-1,appearanceState.C_WHITE);}
    }
    else if(t===state.P_BURST){ const L=state.pM[i], k=age/L, sz=age<2?8:Math.max(2,8-(age-1)*7/(L-1)); drawBurst(x,y,sz,state.pC[i]&1); }
    else if(t===state.P_RING){ const r=1.8+age*0.85, c=age<3?appearanceState.C_WHITE:state.C_TRL; for(let a=0;a<6.2832;a+=0.9/r){ const px=Math.round(x+Math.cos(a)*r), py=Math.round(y+Math.sin(a)*r); if(age<5||((px+py)&1)) pset(px,py,c); } }
    else if(t===state.P_SMEAR){
      const x1=Math.round(state.pVX[i]), y1=Math.round(state.pVY[i]), c=age<2?appearanceState.C_WHITE:appearanceState.C_GRAY;
      line(x,y,x1,y1,c,c);
      const mx=Math.round((x+x1)*0.5), my=Math.round((y+y1)*0.5);
      if(Math.abs(y1-y)>Math.abs(x1-x)){ line(x-2,my,x1-2,y1,c,c); line(x+2,my,x1+2,y1,c,c); }   // vertical arc (uppercut): offset sideways
      else { line(mx,y-2,x1,y1-2,c,c); line(mx,y+2,x1,y1+2,c,c); }
    }
  }
}

export function pushTempo(at,ms){ if(state.tqLen>=state.TQ_N)return; const k=(state.tqHead+state.tqLen)%state.TQ_N; state.tqAt[k]=at; state.tqMs[k]=ms; state.tqLen++; }

/** Switch the running game mode (hub, spar, an exercise…). @param {string} g */
export function setGstate(g){ state.gstate=g; }

/** Shake the whole picture: amplitude in native pixels, duration in ticks, axis 0 horizontal / 1 vertical.
 * A weaker shake never cuts a stronger one short. @param {number} amp @param {number} dur @param {number} axis */
export function shake(amp,dur,axis){ if(state.shakeT>0&&state.shakeAmp>amp) return; state.shakeAmp=amp; state.shakeAxis=axis; state.shakeT=state.shakeDur=dur; }

export function resetClock(ms,now){ state.beatMs=ms; state.lastBeatMs=now; state.nextBeatMs=now+ms; state.tqLen=0; state.tqHead=0; }

export function setFlow(on){
  if(on===state.flow)return;
  state.flow=on; if(on)state.lastHitTick=state.tick;
  if(state.state===animationState.IDLE){animationState.lastPose.set(animationState.cur);state.idleT=0;}   // blend into / out of the footwork
  if(on){spawnSweat(5);for(let j=0;j<6;j++)spawn(state.P_DUST,state.hipX-6+j*2.5,appearanceState.FLOOR_Y-1,(Math.random()-0.5)*1.2,-0.2-Math.random()*0.3,16,appearanceState.C_DUST);sfxFlow();}
  document.body.classList.toggle('flow',on);
  setInfo();
}

export function predictApex(m){
  const save=state.moveStep; state.moveStep=0; samplePose(m,m.times[m.apex],state.tmpPose); state.moveStep=save;
  const P=state.tmpPose, bx=appearanceState.BASE_X+animationState.posX+P[animationState.GX], L=m.glove===0, rot=P[animationState.ROT];
  const sxA=Math.round(bx+P[animationState.BX]+P[animationState.LEAN]), syA=Math.round(appearanceState.HIP_Y0+P[animationState.BY]+P[animationState.GY]-appearanceState.TORSO-P[animationState.SQ]);
  const sh=L?sxA+Math.round(1-2.5*rot):sxA+Math.round(-1+2.5*rot);
  let rx=Math.round(L?P[animationState.LGX]:P[animationState.RGX]), ry=Math.round(L?P[animationState.LGY]:P[animationState.RGY]);
  const d=Math.sqrt(rx*rx+ry*ry), mx=appearanceState.UPPER+appearanceState.FORE-0.01; if(d>mx){rx*=mx/d;ry*=mx/d;}
  state.predTip=sh+rx+(L?3.5+P[animationState.LGS]:4+P[animationState.RGS]); state.predY=syA+1+ry;
}

export function commitWalk(){   // bake the travelled distance into posX so poses stay relative
  const d=animationState.cur[animationState.GX]; animationState.posX+=d; animationState.cur[animationState.GX]-=d;   // feet are body-relative, so only the origin moves
  if(state.gstate==='spar'){ animationState.posX=sparClamp(animationState.posX); return; }
  if(state.gstate==='work') return;
  if(animationState.posX<animationState.POS_MIN)animationState.posX=animationState.POS_MIN; else if(animationState.posX>animationState.POS_MAX)animationState.posX=animationState.POS_MAX;
}

export function startMove(id,t0){
  t0=t0||0;
  if(state.rdOn&&id!==animationState.S_KD&&id!==animationState.S_KO) stopRagdoll();   // before commitWalk: the ragdoll already decided where he lies
  if(state.state>=0&&animationState.MOVES[state.state].walk) commitWalk();
  animationState.fromPose.set(animationState.cur); state.state=id; state.stateT=t0||0; state.frameIdx=-1; state.fired=0; state.curGrade=state.bufferedGrade; state.buffered=-1;
  const m=animationState.MOVES[id];
  for(let k=1;k<m.n;k++) if(m.times[k]<=state.stateT) state.fired|=1<<k;   // skipped wind-up keys don't fire events
  if(state.gstate==='spar'){ if(m.glove>=0){ sparringState.aimLow=sparringState.nextLow; sparringState.nextLow=0; } else sparringState.aimLow=0; }
  // Punches are thrown from the spot; walking controls the distance.
  state.moveStep=(m.glove<0&&state.flow)?m.fstep:0;
  if(m.glove===0){state.pgx=state.lgx;state.pgy=state.lgy;} else if(m.glove===1){state.pgx=state.rgx;state.pgy=state.rgy;}
  state.phx=state.headX; state.phy=state.headY;
  if(state.gstate==='spar'&&isDash(id)){ sparDashCost(sparringState.ctxF,id); sfxWhoosh(0.35); }
  if(state.gstate==='spar'&&(id===animationState.M_SLIPL||id===animationState.M_SLIPR||id===animationState.M_DODGE)) sparEvadeCost(sparringState.ctxF,id);
  if(state.gstate==='spar'&&id===animationState.S_BLOCK&&t0===0) sparRaiseGuard(sparringState.ctxF);   // raising the guard isn't free either
  if(id===animationState.S_KD||id===animationState.S_KO){ const ko=id===animationState.S_KO; triggerRagdoll(ko?2.6+Math.random()*0.8:1.7+Math.random()*0.5,ko?-1.4:-0.8,true); }
  if(m.walk) return;
  if(state.gstate==='spar'&&m.glove>=0) sparOnAttack(id);
  if(m.glove>=0) sfxWhoosh((0.5+m.weight*0.5)*(state.flow?1.4:1)); else sfxWhoosh(0.3);
}

export function handleEvents(m,ev){
  for(let k=1;k<m.n;k++){
    if(!(ev&(1<<k)))continue;
    if(m.landMask&(1<<k)){ sfxLand(0.6); if(state.gstate==='spar'&&m.id>=animationState.S_KD&&m.id<=animationState.S_KO){ sfxLand(1.6); state.shakeAmp=2; state.shakeAxis=1; state.shakeT=state.shakeDur=10; } }
    if(m.headSmear&(1<<k)) spawn(state.P_SMEAR,state.phx,state.phy,state.headX,state.headY,5,0);
    if(m.dustMask&(1<<k)) for(let j=0;j<3;j++) spawn(state.P_DUST,(m.walk&&k===2?(m.walk>0?state.ltx:state.rhex):state.rtx)-2+j*2,appearanceState.FLOOR_Y-1,(Math.random()-0.5)*0.8,-0.15-Math.random()*0.25,14,appearanceState.C_DUST);
    if(m.sweatMask&(1<<k)) spawnSweat(4);
    if(k===m.apex) impact(m);
  }
}

export function spawnSweat(n){
  if(state.gstate==='spar'&&sparringState.ctxF) n=Math.round(n*(0.2+1.3*(1-staF(sparringState.ctxF))));   // sparring: sweat follows fatigue
  for(let j=0;j<n;j++){
    const drop=Math.random()<0.35;   // a third of the sweat is heavy drops that run down and fall, the rest is a fine mist
    spawn(drop?state.P_DRIP:state.P_SWEAT,state.headX-2+Math.random()*4,state.headY-2+Math.random()*4,(-0.3-Math.random()*0.6)*(drop?0.4:1),drop?0.05:-0.4-Math.random()*0.6,drop?48:16+(Math.random()*8|0),drop?state.C_SWEAT_DROP:state.C_SWEAT_MIST);
  }
} function impact(m){
  if(state.gstate==='work'){ wkImpact(m); return; }
}

export function drawChar(code,x,y,c,sc){
  const g=state.FONT[code]; if(!g)return;
  for(let r=0;r<5;r++)for(let q=0;q<3;q++) if(g&(1<<(14-(r*3+q))))
    for(let a=0;a<sc;a++)for(let b=0;b<sc;b++) pset(x+q*sc+b,y+r*sc+a,c);
}

export function drawText(s,cx,y,c,sc){
  sc*=rendererState.uiK;   // the 2× room: letters keep their size on screen
  const n=s.length, w=(n*4-1)*sc, x0=cx-(w>>1);
  for(let k=0;k<n;k++){ const code=s.charCodeAt(k), x=x0+k*4*sc;
    drawChar(code,x-sc,y,appearanceState.C_OUT,sc); drawChar(code,x+sc,y,appearanceState.C_OUT,sc); drawChar(code,x,y-sc,appearanceState.C_OUT,sc); drawChar(code,x,y+sc,appearanceState.C_OUT,sc); }
  for(let k=0;k<n;k++) drawChar(s.charCodeAt(k),x0+k*4*sc,y,c,sc);
}

export function popup(t,x,y,c,sc,life){ const i=state.puCur; state.puCur=(state.puCur+1)%state.MAXPU; state.puT[i]=t; state.puX[i]=x; state.puY[i]=y; state.puL[i]=life; state.puM[i]=life; state.puC[i]=c; state.puS[i]=sc; }

export function updatePopups(){ for(let i=0;i<state.MAXPU;i++) if(state.puL[i]>0){ state.puL[i]--; if(state.puM[i]-state.puL[i]<8) state.puY[i]-=0.5; } }

export function drawPopups(){
  for(let i=0;i<state.MAXPU;i++){
    if(state.puL[i]<=0)continue;
    if(state.puL[i]<8&&(state.puL[i]&1))continue;           // blink out
    const K=rendererState.uiK, hw=((state.TXT[state.puT[i]].length*4-1)*state.puS[i]>>1)+state.puS[i]+1, px=Math.max(hw,Math.min(appearanceState.W/K-1-hw,Math.round(state.puX[i])));   // keep the whole word on screen
    drawText(state.TXT[state.puT[i]],px*K,Math.round(state.puY[i])*K,state.puC[i],state.puS[i]);   // popups live in native coordinates
  }
}

export function initialize(){


/* =====================================================================
   SKELETON / IK
   ===================================================================== */
state.IKx = 0;
state.IKy = 0;
state.IKtx = 0;
state.IKty = 0;

// joints (integers after solve)
state.hipX = 0;
state.hipY = 0;
state.sx = 0;
state.sy = 0;
state.lsx = 0;
state.lsy = 0;
state.rsx = 0;
state.rsy = 0;
state.lex = 0;
state.ley = 0;
state.rex = 0;
state.rey = 0;
state.lgx = 0;
state.lgy = 0;
state.rgx = 0;
state.rgy = 0;
state.lgr = 3.5;
state.rgr = 4;
state.headX = 0;
state.headY = 0;
state.lhx = 0;
state.lhy = 0;
state.rhx = 0;
state.rhy = 0;
state.lkx = 0;
state.lky = 0;
state.rkx = 0;
state.rky = 0;
state.lax = 0;
state.lay = 0;
state.rax = 0;
state.ray = 0;
state.lhex = 0;
state.lhey = 0;
state.ltx = 0;
state.lty = 0;
state.rhex = 0;
state.rhey = 0;
state.rtx = 0;
state.rty = 0;

state.lTipRaw = 0;
state.rTipRaw = 0;
state.lSurf = 999;
state.rSurf = 999;
state.torsoX = 0;
state.lightWX = 0;
state.lightWY = 0;
state.lightStrength = 0;
state.lightDir = 1;
state.torsoLagX = 0;
state.torsoLagVX = 0;
state.rdOn = 0;
state.rdLying = false;
state.rd = {stamp:-1,x:new Float32Array(11),y:new Float32Array(11),px:new Float32Array(11),py:new Float32Array(11)};
state.shDirX = 0;
state.shDirY = 1;


state.PENMAX = 4.5;

/* =====================================================================
   BOXER RENDER (groups: outline pass then fill pass -> clean inner seams)
   ===================================================================== */
state.flashL = 0;
state.flashR = 0;

/* PUNCH TRAILS (reference: cream crescent smears for hooks / uppercuts, comet streaks with a cold core
   for straights, a double chevron of recoil when a straight snaps back). The punching glove's recent
   positions are recorded while the move is fast (start -> just past the apex) and drawn as a spline
   with a thickness that grows towards the glove; it stops at the glove's edge so the glove stays crisp.
   One trail set per context (sparring swaps it per fighter). */
state.trailMain = {h:[[],[]]};
 state.trl = state.trailMain;

state.TS = [];

state.workOutfit = false;
state.workMidHook = null;

/*HEADART-BEGIN*/
// ASCII head art (profile, faces right; ox/oy = offset of the top-left char from the head joint). Edit the strings directly. chars: . skip · _ clear · O outline (deep skin over skin, else black) · K black
// 0-5 skin tones · a/b/c hair shadow/mid/light · E eye · W/w eye white / tape · r cut · T hair tie (trunk trim)
state.HEAD_BASE = {ox:-6,oy:-5,r:['....OOOO.....','...O3455O....','..O334555O...','.O23334555O..','.O23333234O..','.O123333345O.','..O1233331O..','...O123334O..','.....O122O...','......OOO....']};

state.HEAD_STYLE = {short:{b:null,f:{ox:-6,oy:-7,r:['..OOOOOOO.','.OObccccOO','OObbcccccO','ObbbbccccO','Obbbbbc..O','Oaaaba....','Oaaaa.....','OOaa......','.OO.......']}},buzz:{b:null,f:{ox:-4,oy:-4,r:['..aba5','.aaa5.','aaa3a.','aa3...','a2....']}},bald:{b:null,f:{ox:-1,oy:-4,r:['55','5.']}},afro:{b:null,f:{ox:-8,oy:-10,r:['...OOOOOOO...','..OOcccccOOO.','.OObcbcccccOO','OObbccccbcccO','ObabbccccccbO','ObbbbacbccccO','OaabbbbcccbcO','Oaaaaaabb..OO','Oaaaaaaaa....','Oaaaaa.......','OOaaaa.......','.Oaaaa.......','.OOOOO.......']}},hightop:{b:null,f:{ox:-6,oy:-10,r:['..OOOOOOO.','.OOcccccOO','.OaabbbbcO','.OaabbbbcO','.OabbbbbcO','OOabbbbbcO','OaabbbbbbO','Oaaaaaa..O','Oaaaa.....','OOaa......','.O........']}},mohawk:{b:null,f:{ox:-7,oy:-9,r:['..OOOOOOO..','.OOcOcOcOO.','OObbbccccOO','ObbbbbccccO','OaaaaabcccO','OaaaO2.4.OO','OaaO2.3....','Oaa1.2.3...','OOa........','.OO........']}},ponytail:{b:null,f:{ox:-8,oy:-7,r:['....OOOOOOO.','...OObccccOO','..OObbcccccO','.OObbbbccccO','OObbbbbbc..O','Oaaaaaba....','OaaOaaa.....','OaaOaa......','OaaOO.......','OaaO........','OaOO........','OOO.........']}},cornrows:{b:null,f:{ox:-5,oy:-6,r:['.OOOOOOO.','OOaaaaaOO','OcccccccO','Oaaaaa..O','Obbba....','Oaaa.....','Oba......','OO.......']}},
  fringe:{b:null,f:{ox:-6,oy:-7,r:['..OOOOOOOO.','.OObcccccOO','OObbccccccO','Obbbbbcccbc','Obbbbbbcbbb','Oaabaab.ab.','Oaaba......','Oaaba......','OOaa.......','.Oaa.......','.OO........']}},   // the hero: straight hair, a fringe to the brows, the back over the ears
  long:{b:null,f:{ox:-8,oy:-7,r:['....OOOOOOO.','...OObccccOO','..OObbcccccO','..ObbbbccccO','.OObbbbbc..O','.Obaabba....','Oabaaba.....','Oaabaa......','Obaab.......','Oaaba.......','Obaab.......','Oaaba.......','Oabaa.......','.Obab.......','.OObaO......','..OOO.......']}}};   // long hair falling to the shoulders (no menu entry: Profesor)

state.HEAD_FEAT = {ear:{ox:-1,oy:-1,r:['1','2']},eyes_normal:{ox:2,oy:-1,r:['E']},eyes_narrow:{ox:1,oy:-1,r:['EE']},eyes_wide:{ox:1,oy:-1,r:['WE']},brows_normal:{ox:1,oy:-2,r:['00']},brows_thick:{ox:0,oy:-3,r:['.aa','0aa']},brows_angry:{ox:0,oy:-3,r:['0a.','.0a']},nose_broken:{ox:4,oy:-1,r:['4K']},nose_small:{ox:3,oy:0,r:['4K_']},facial_mustache:{ox:1,oy:1,r:['abb']},facial_goatee:{ox:1,oy:1,r:['abb','.ba','.aO']},facial_beard:{ox:-1,oy:0,r:['a.....','aab...','abbbb.','Oaab..','.OaaO.','..OO..']},extra_scar:{ox:1,oy:-3,r:['r','5','.','r']},extra_tape:{ox:3,oy:-1,r:['ww','Ww']},facial_stubble:{ox:-1,oy:1,r:['2.2.0','.2.2.','..1..']},extra_cut:{ox:3,oy:-2,r:['.q','q.']},facial_fullbeard:{ox:-1,oy:0,r:['a....bb','aab.bbc','abbbbbO','Oabbbc.','.Oabbb.','.Oaabb.','..Oab..','...OO..']}};

/*HEADART-END*/
/* HEAD — hand-pixelled profile (faces right). Composed every frame on a small char grid around the head joint
   from the ASCII layers above (base skull + face -> hairstyle -> ear -> facial hair -> eyes/brows/nose -> extras),
   then resolved to colours: skin/hair come from the look ramps, so every skin / hair colour keeps working. */
state.HG = 28;
state.HO = 14;
state.hgrid = new Uint8Array(state.HG*state.HG);

// loose trunks: the hem hangs on a spring and trails the hips (walks, hops, punches)
state.trX = 0;
state.trY = 0;
state.trVX = 0;
state.trVY = 0;
state.prevHX = 0;
state.prevHY = 0;

// surface patterns on the trunk fabric (thigh tops included); coordinates are body-relative so prints move with the cloth
state.FLAME = new Uint8Array([1,3,2,4,2,3,1,2]);

/* =====================================================================
   PARTICLES (preallocated pool)
   ===================================================================== */
state.MAXP = 192;
state.P_SWEAT = 1;
state.P_SPARK = 2;
state.P_STAR = 3;
state.P_SMEAR = 4;
state.P_DUST = 5;
state.P_BIT = 6;
state.P_BURST = 7;
state.P_RING = 8;
state.P_DRIP = 9;   // a drop that first creeps down the skin, then falls
state.C_SWEAT_DROP = rgb('#9ab4c2'); state.C_SWEAT_MIST = rgb('#647a88');
state.C_BLOOD_DARK = rgb('#4a0810'); state.C_BLOOD_MID = rgb('#7a101c'); state.C_BLOOD_BRIGHT = rgb('#a81c28');
   // BURST = big white impact star, RING = shine on a parried punch
state.C_TRL = rgb('#f6ecdf');
state.C_TRL2 = rgb('#cdbba8');
state.C_TRLB = rgb('#a8d4ea');
   // punch smears: cream body, soft edge, cold core
state.pX = new Float32Array(state.MAXP);
state.pY = new Float32Array(state.MAXP);
state.pVX = new Float32Array(state.MAXP);
state.pVY = new Float32Array(state.MAXP);
state.pL = new Int16Array(state.MAXP);
state.pM = new Int16Array(state.MAXP);
state.pT = new Uint8Array(state.MAXP);
state.pC = new Uint32Array(state.MAXP);

state.pCur = 0;

// impact burst (reference: a white, uneven 4-point star with short diagonal rays and a bright core)
state.BURST_LEN = [1,0.72,0.9,0.62];


/* =====================================================================
   GAME STATE, BEAT CLOCK, STATS
   ===================================================================== */
state.STATS = {power:1,speed:1};

// Shared beat clock with scheduled tempo changes.
state.beatMs = 600;
state.gridDiv = 1;
state.simNow = 0;
state.lastBeatMs = 0;
state.nextBeatMs = 600;
state.beatIdx = 0;
state.beatFlash = 0;

state.TQ_N = 16;
state.tqAt = new Float64Array(state.TQ_N);
state.tqMs = new Float64Array(state.TQ_N);
 state.tqHead = 0;
state.tqLen = 0;


state.tick = 0;
state.state = animationState.IDLE;
state.stateT = 0;
state.frameIdx = -1;
state.fired = 0;
state.idleT = 99;
state.curGrade = 1;

state.buffered = -1;
state.bufferTick = 0;
state.bufferedGrade = 1;

state.hitstop = 0;
state.shakeT = 0;
state.shakeDur = 1;
state.shakeAmp = 0;
state.shakeAxis = 0;
state.shX = 0;
state.shY = 0;
state.riseT = 0;

state.moveStep = 0;
state.phx = 0;
state.phy = 0;
state.pgx = 0;
state.pgy = 0;
state.combo = 0;
state.lastHitTick = -999;
state.debug = false;


state.M_FREE = 0;
state.M_SPAR = 2;

state.mode = state.M_FREE;
state.gstate = 'menu';
            // menu, hub, exercises, work, card fights and shadowboxing

// Shared pose flag retained while exercise and fight entry reset the stance.
 state.flow = false;



state.tmpPose = new Float32Array(animationState.NP);
 state.predTip = 0;
state.predY = 0;


/* =====================================================================
   PIXEL FONT (3x5) + POPUPS
   ===================================================================== */
state.FONT = new Uint16Array(128);

(function(){
  const G={'0':'111101101101111','1':'010110010010111','2':'111001111100111','3':'111001111001111','4':'101101111001001',
   '5':'111100111001111','6':'111100111101111','7':'111001010010010','8':'111101111101111','9':'111101111001111',
   'A':'010101111101101','B':'110101110101110','C':'011100100100011','D':'110101101101110','E':'111100110100111',
   'F':'111100110100100','G':'011100101101011','H':'101101111101101','I':'111010010010111','J':'001001001101010',
   'K':'101101110101101','L':'100100100100111','M':'101111111101101','N':'110101101101101','O':'010101101101010',
   'P':'110101110100100','Q':'010101101110011','R':'110101110101101','S':'011100010001110','T':'111010010010010',
   'U':'101101101101111','V':'101101101101010','W':'101101111111101','X':'101101010101101','Y':'101101010010010',
   'Z':'111001010100111','!':'010010010000010','+':'000010111010000','-':'000000111000000','x':'000101010101000',':':'000010000010000','/':'001001010100100','%':'101001010100101'};
  for(const ch in G) state.FONT[ch.charCodeAt(0)]=parseInt(G[ch],2);
})();

// Preserve popup indices used by exercises and the brawl captions.
state.TXT = ['PERFECT','GOOD','OK','MISS','','','','','','','','','','','','','','','','','','MASH','WYRZUT!','KLASK!','FAIL','ZA MOCNO',
 'RUNDA 1','RUNDA 2','RUNDA 3','WALCZ!','NOKDAUN','CZAS!','BLOK','UNIK','KONTRA!','KO!','TKO','WYGRANA','PRZEGRANA','REMIS','IDEALNY UNIK!','SILA UP!','SZYBKOSC UP!','WYTRZYMALOSC UP!'];

state.T_MISS = 3;
state.MAXPU = 8;
state.puT = new Uint16Array(state.MAXPU);
state.puX = new Float32Array(state.MAXPU);
state.puY = new Float32Array(state.MAXPU);
state.puL = new Int16Array(state.MAXPU);
state.puM = new Int16Array(state.MAXPU);
state.puC = new Uint32Array(state.MAXPU);
state.puS = new Uint8Array(state.MAXPU);

state.puCur = 0;
}

````

---

## `src/animation.js`

````js
import { state as boxingState } from './boxing.js';
import { state as sparringState, guardLowOf } from './sparring.js';

// Runtime values owned by animation; initialized explicitly by main.js.
export const state = {};
/** Release a held walking direction when an overlay takes focus. */
export function releaseWalk(){ state.walkHeld=-1; }

function ease(id,a){
  switch(id){
    case state.E_OUT: {const b=1-a; return 1-b*b*b;}
    case state.E_IN: return a*a;
    case state.E_IO: return 0.5-0.5*Math.cos(Math.PI*a);
    case state.E_SNAP: {const b=1-a; return 1-b*b*b*b;} // eksplozywny wystrzał bokserski
    default: return a;
  }
} function K(t,e,o){const p=new Float32Array(state.NP);p.set(state.GUARD);for(const k in o)p[state.IDX[k]]=o[k];return {t,e,p};} function MOVE(name,keys,opt){
  const n=keys.length;
  const m=Object.assign({name,n,times:new Float32Array(n),eases:new Uint8Array(n),keys:[],dur:keys[n-1].t,
    apex:-1,glove:-1,fstep:0,twist:0,walk:0,headSmear:0,cancel:keys[n-1].t,imp:0,dent:0,stop:0,shake:0,axis:0,lift:0,rise:0,weight:0,sweatHit:0,
    smearMask:0,dustMask:0,sweatMask:0},opt);
  for(let i=0;i<n;i++){m.times[i]=keys[i].t;m.eases[i]=keys[i].e;m.keys.push(keys[i].p);}
  (opt.smear||[]).forEach(i=>m.smearMask|=1<<i);
  (opt.dust||[]).forEach(i=>m.dustMask|=1<<i);
  (opt.sweat||[]).forEach(i=>m.sweatMask|=1<<i);
  let lm=0; (opt.land||[]).forEach(i=>lm|=1<<i); m.landMask=lm;
  let hm=0; (opt.headSmear||[]).forEach(i=>hm|=1<<i); m.headSmear=hm;
  return m;
}

export function isDash(id){ return id===state.M_DASHF||id===state.M_DASHB; }

export function isFwd(id){ return id===state.M_WALKF||id===state.M_DASHF; }

/** Sample punches each simulation step; retain the original pose on event frames.
 * @param {{id:number,dur:number,fr?:number}} m @param {number} t @param {number} events
 * @returns {number} Pose time in 60 Hz ticks, independent of event/cancel timing.
 */
export function poseSampleTime(m,t,events){
  return Math.max(0,Math.min(m.dur,t));
}

export function samplePose(m,t,out){
  const ts=m.times; let i=1; while(i<m.n-1&&t>ts[i]) i++;
  const t0=ts[i-1], t1=ts[i]; let a=t1>t0?(t-t0)/(t1-t0):1; if(a<0)a=0; else if(a>1)a=1;
  a=ease(m.eases[i],a);
  const A=i===1?state.fromPose:m.keys[i-1], B=m.keys[i];
  for(let k=0;k<state.NP;k++) out[k]=A[k]+(B[k]-A[k])*a;
  if(boxingState.gstate==='spar') sparPoseExtras(m,t,out);
  // footwork: pendulum position/hop from the start pose decays, flow adds a step-in toward the apex
  const tp=m.apex>0?m.times[m.apex]:m.times[2];
  const back=t<tp?1-t/tp:0;
  if(m.hop) return; // dash offsets come directly from the keys
  if(m.walk){   // walks: GX comes from the keys (body travels with the feet)
    out[state.GY]=state.fromPose[state.GY]*back;
    if(m.id===state.M_WALKF||m.id===state.M_WALKB){   // procedural trunk work for real steps only (hit reactions are walk-type moves too)
      const u=Math.max(0,Math.min(1,t/m.dur)), s1=Math.sin(u*Math.PI*2), s2=Math.sin(u*Math.PI), dir=m.walk>0?1:-1;
      out[state.ROT]+=-0.40*s1*dir; out[state.HROT]+=0.30*s1*dir;   // shoulders counter-rotate against the hips: no more crab
      out[state.LEAN]+=0.65*s2*dir; out[state.BX]+=0.50*s1*dir; out[state.SQ]+=-0.45*s2;
      const lag=Math.sin(Math.max(0,u-0.12)*Math.PI*2);   // the head trails the body by 12% of the step
      out[state.HX]+=-0.45*lag*dir; out[state.HY]+=0.55*s2; out[state.LGY]+=0.70*s1; out[state.RGY]+=-0.60*s1;
    }
    return;
  }
  out[state.GX]=state.fromPose[state.GX]*back; out[state.GY]=state.fromPose[state.GY]*back;
  // footwork: step toward the apex position
  const bump=t<=tp?ease(state.E_OUT,t/tp):Math.max(0,1-(t-tp)/(m.dur-tp));
  out[state.GX]+=boxingState.moveStep*bump;
  // sparring body shot: dip the knees and drop the punching glove to rib height
  if(sparringState.aimLow&&m.glove>=0&&m.id<=3){
    const L=state.LOWP[m.id], gy=m.glove===0?state.LGY:state.RGY, gx=m.glove===0?state.LGX:state.RGX;
    out[state.BY]+=L[0]*bump; out[state.LEAN]+=L[3]*bump; out[state.HEEL]+=L[4]*bump; out[state.HY]+=0.5*bump;
    out[gy]+=L[1]*bump; out[gx]+=L[2]*bump; if(out[gy]>L[5]) out[gy]=L[5];
  }
  if(boxingState.gstate==='spar'&&sparringState.bareknuckle&&m.id>=state.S_HITJ&&m.id<=state.S_UPPED){
    out[state.HX]*=1.15; out[state.HROT]*=1.15;
  }
  if(boxingState.flow){
    for(let j=0;j<state.AMP_N;j++){const k=state.AMP_IDX[j]; out[k]=state.GUARD[k]+(out[k]-state.GUARD[k])*state.FLOW_AMP;}
    if(out[state.ROT]>1.3)out[state.ROT]=1.3; else if(out[state.ROT]<-1.3)out[state.ROT]=-1.3; if(out[state.HROT]>1.1)out[state.HROT]=1.1;
  }
}
/** Sparring additions to a sampled pose: hurt fighters' heads snap further on hits; a guard held low drops the gloves to the ribs.
 * @param {any} m @param {number} t @param {Float32Array} out */
function sparPoseExtras(m,t,out){
  const F=sparringState.ctxF; if(!F) return;
  if(m.id>=state.S_HITJ&&m.id<=state.S_UPPED){
    // Zamiast wyrywać głowę z szyi (k do 1.8), dzielimy impet między głowę (k<=1.35) a ugięcie tułowia (kb)
    const rawK=(sparringState.bareknuckle?1.12:1)*(1+0.6*Math.max(0,1-F.hp/F.hpMax));
    const k=Math.min(1.35,rawK), kb=Math.min(1.45,1+(rawK-1)*0.55);
    out[state.HX]=Math.max(-3.6,Math.min(3.0,state.GUARD[state.HX]+(out[state.HX]-state.GUARD[state.HX])*k));
    out[state.HY]=Math.max(-3.4,Math.min(3.0,state.GUARD[state.HY]+(out[state.HY]-state.GUARD[state.HY])*k));
    for(const c of [state.LEAN,state.ROT,state.HROT]) out[c]=state.GUARD[c]+(out[c]-state.GUARD[c])*kb;
  }
  if(m.id===state.S_BLOCK||m.id===state.S_BLOCKHIT||m.id===state.S_SHELL){
    const tg=guardLowOf(F)?1:0, g=F.glw??tg; F.glw=g+(tg-g)*0.35;
    const w=F.glw*(m.id===state.S_BLOCK?Math.min(1,t/5)*(t>30?Math.max(0,1-(t-30)/8):1):1);
    if(w>0.01) for(let j=0;j<state.LOWG_CH.length;j++) out[state.LOWG_CH[j]]+=state.LOWG_D[j]*w;
  }
}

/** Sample the planted guard on the shared beat clock, retaining fatigue and injury cues. @param {Float32Array} out */
export function computeIdle(out){
  let ph=(boxingState.simNow-boxingState.lastBeatMs)/boxingState.beatMs; if(ph<0)ph=0; else if(ph>0.999)ph=0.999;
  let bi=boxingState.beatIdx;
  if(sparringState.idleOff){ ph+=sparringState.idleOff; if(ph>=1){ ph-=1; bi++; } }   // sparring: the two fighters shift their weight off-phase
  const step=Math.floor(ph*8)/8, TAU=6.283185307;
  out.set(state.GUARD);
  if(boxingState.flow){
    // PENDULUM STEP: land on every beat, hop in on even beats, out on odd beats
    const air=step<0.125||step>0.875?0:Math.sin(Math.PI*(step-0.125)/0.75);
    out[state.GY]=-3*air;
    out[state.BY]=state.GUARD[state.BY]+(step<0.125?2.2:(step>0.875?0.8:0.2));   // knees absorb the landing
    const dir=(bi&1)?-1:1, p=step<0.125?0:(step>0.875?1:(step-0.125)/0.75);
    out[state.GX]=dir*(-2.5+5*(0.5-0.5*Math.cos(Math.PI*p)));
    out[state.BX]=state.GUARD[state.BX]; out[state.LEAN]=state.GUARD[state.LEAN]+0.5+0.5*dir*air;
    out[state.HEEL]=1+air; out[state.ST]=state.GUARD[state.ST]-1;
    return;
  }
  const tired=state.idleTired, hurt=state.idleHurt, close=state.idleClose, fresh=1-tired;
  // Planted bareknuckle guard: slow weight transfer and breathing, without hopping or raising the hands to the face.
  const w=Math.sin(Math.PI*((bi&3)+step)/2), amp=(0.4+0.4*fresh)*(1-0.4*hurt);
  out[state.BX]+=0.65*w*amp; out[state.LEAN]-=0.25*w*amp;
  out[state.ROT]+=0.07*w; out[state.HROT]+=0.05*w; out[state.HX]-=0.2*w;
  out[state.BY]+=0.45*tired+0.6*hurt+0.3*close;
  const breath=0.5-0.5*Math.cos(TAU*((bi%(tired>0.5?2:4))+step)/(tired>0.5?2:4));
  out[state.SQ]+=(0.65+0.65*tired)*breath; out[state.HY]+=0.2*breath+0.4*close;
  out[state.LGY]+=1.2*tired+0.8*hurt-0.5*close; out[state.RGY]+=tired+0.8*hurt-0.5*close;
  out[state.LGX]+=0.4*w*amp-0.5*tired;
  // Victorian forearm circling (milling): subtle elliptical roll of the fists and forearms
  const millAngle=TAU*(((bi&1)+step)/2), mill=(0.5+0.5*fresh)*(1-0.5*hurt)*(1-0.6*tired);
  out[state.LGX]+=0.75*Math.cos(millAngle)*mill;
  out[state.LGY]+=0.55*Math.sin(millAngle)*mill;
  out[state.RGX]+=0.45*Math.cos(millAngle+Math.PI)*mill;
  out[state.RGY]+=0.4*Math.sin(millAngle+Math.PI)*mill;
  // 5. hurt: slow irregular wobble (sampled at 12 fps)
  if(hurt>0){
    const tq=Math.floor(boxingState.simNow/83.3)*0.0833;
    out[state.BX]+=1.3*hurt*Math.sin(tq*2.1); out[state.LEAN]+=1.1*hurt*Math.sin(tq*1.3+1); out[state.HX]+=0.8*hurt*Math.sin(tq*2.9+2); out[state.HY]+=0.9*hurt;
  }
}

export function initialize(){


/* =====================================================================
   POSE PARAMETERS
   ===================================================================== */
// GX/GY = whole-body offset incl. feet (footwork / hop). GY<0 = airborne.
state.BX = 0;
state.BY = 1;
state.LEAN = 2;
state.ROT = 3;
state.HX = 4;
state.HY = 5;
state.LGX = 6;
state.LGY = 7;
state.RGX = 8;
state.RGY = 9;
state.LFL = 10;
state.RFL = 11;
state.ST = 12;
state.HEEL = 13;
state.LGS = 14;
state.RGS = 15;
state.STEP = 16;
state.SQ = 17;
state.GX = 18;
state.GY = 19;
state.HROT = 20;
state.LHEEL = 21;
state.LKN = 22;
state.RSTEP = 23;
state.LLIFT = 24;
state.RLIFT = 25;
state.NP = 26;
   // HROT = hip rotation (rear hip drives forward)
state.IDX = {BX:state.BX,BY:state.BY,LEAN:state.LEAN,ROT:state.ROT,HX:state.HX,HY:state.HY,LGX:state.LGX,LGY:state.LGY,RGX:state.RGX,RGY:state.RGY,LFL:state.LFL,RFL:state.RFL,ST:state.ST,HEEL:state.HEEL,LGS:state.LGS,RGS:state.RGS,STEP:state.STEP,SQ:state.SQ,GX:state.GX,GY:state.GY,HROT:state.HROT,LHEEL:state.LHEEL,LKN:state.LKN,RSTEP:state.RSTEP,LLIFT:state.LLIFT,RLIFT:state.RLIFT};
   // LHEEL/LKN = lead heel pivot / lead knee turn-in (hooks)
state.GUARD = new Float32Array(state.NP);

// Upright Victorian guard: extended lead fist, rear fist at the chest, elbows down.
state.GUARD[state.BX]=-1;
 state.GUARD[state.BY]=0;
 state.GUARD[state.LEAN]=-0.5;
 state.GUARD[state.LGX]=14;
 state.GUARD[state.LGY]=2;
 state.GUARD[state.RGX]=5;
 state.GUARD[state.RGY]=4;
 state.GUARD[state.ST]=22;

state.cur = new Float32Array(state.NP);
state.fromPose = new Float32Array(state.NP);
state.lastPose = new Float32Array(state.NP);
state.idleP = new Float32Array(state.NP);

state.cur.set(state.GUARD);


state.E_LIN = 0;
state.E_OUT = 1;
state.E_IN = 2;
state.E_IO = 3;
state.E_SNAP = 4;

/* Keyframe times are 60 Hz ticks. Punch poses update every tick; events retain the 5-tick grid. */
state.MOVES = [
 // JAB (Lewy prosty): krótki impuls z przedniej nogi, biodro i lewy bark wkręcają się do przodu,
 // prawa ręka asekuruje szczękę (RGY:-3.2), broda schowana za lewym barkiem, błyskawiczny powrót po linii ciosu.
 MOVE('JAB',[
   K(0,state.E_LIN,{}),
   K(2,state.E_IN,{LGX:12.8,LGY:0.5,ROT:-0.15,HROT:-0.1,LEAN:0.4,BX:0.2,BY:0.6,HX:-0.2,HY:0.6,RGX:4.8,RGY:-2.8,STEP:0.4,HEEL:0.5}),
   K(5,state.E_SNAP,{LGX:19.2,LGY:-4.2,ROT:-0.75,HROT:-0.35,LEAN:1.8,BX:0.9,BY:0.9,HX:-0.6,HY:1.1,RGX:4.2,RGY:-3.8,STEP:1.2,HEEL:1.2,LGS:0.3}),
   K(6,state.E_OUT,{LGX:19.6,LGY:-4.4,ROT:-0.82,HROT:-0.4,LEAN:2.0,BX:1.0,BY:1.0,HX:-0.7,HY:1.2,RGX:4.0,RGY:-4.0,STEP:1.3,HEEL:1.3,LGS:0.4}),
   K(9,state.E_OUT,{LGX:13.5,LGY:-1.0,ROT:-0.25,HROT:-0.1,LEAN:0.6,BX:0.2,BY:0.5,HX:-0.2,HY:0.5,RGX:4.6,RGY:-1.5,STEP:0.5}),
   K(13,state.E_IO,{})
 ],{apex:3,glove:0,fstep:1.5,twist:0.008,cancel:9,imp:0.0028,dent:1.8,stop:2,shake:0,weight:0.5,fr:2,smear:[2,3]}),

 // CROSS (Prawy prosty): załadowanie ciężaru na tylną nogę, mocny skręt tylnej stopy (HEEL:3.6) i biodra (HROT:1.1),
 // prawy bark wybija przed brodę (ROT:1.25), lewa ręka wraca wysoko pod policzek (LGX:5.5, LGY:-4.5).
 MOVE('CROSS',[
   K(0,state.E_LIN,{}),
   K(4,state.E_IN,{ROT:-0.45,HROT:-0.35,LEAN:-0.8,BY:1.4,BX:-0.8,RGX:3.0,RGY:2.0,LGX:12.5,LGY:0.5,HX:-0.3,HY:0.8,HEEL:0.4}),
   K(7,state.E_IN,{ROT:0.45,HROT:0.65,LEAN:2.4,BX:0.8,BY:1.6,RGX:11.5,RGY:-2.2,HEEL:2.4,LGX:6.5,LGY:-3.5,HX:0.2,HY:1.2,STEP:0.6}),
   K(10,state.E_SNAP,{ROT:1.25,HROT:1.1,LEAN:4.6,BX:1.8,BY:1.8,RGX:19.6,RGY:-4.2,HEEL:3.6,LGX:5.2,LGY:-4.8,HX:0.4,HY:1.4,STEP:1.0,RGS:0.6}),
   K(12,state.E_OUT,{ROT:1.3,HROT:1.15,LEAN:4.8,BX:1.9,BY:1.8,RGX:19.8,RGY:-4.2,HEEL:3.8,LGX:5.0,LGY:-4.8,HX:0.4,HY:1.4,STEP:1.0,RGS:0.6}),
   K(17,state.E_OUT,{ROT:0.5,HROT:0.45,LEAN:2.0,BX:0.7,BY:1.2,RGX:10.5,RGY:-1.5,HEEL:1.8,LGX:8.5,LGY:-2.0,HY:0.8}),
   K(24,state.E_IO,{ROT:0.1,HROT:0.1,LEAN:0.4,BY:0.4,RGX:6.0,RGY:2.0,HEEL:0.4,LGX:12.5,LGY:1.0}),
   K(30,state.E_IO,{})
 ],{apex:3,glove:1,fstep:2,twist:0.016,cancel:19,imp:0.0048,dent:2.7,stop:5,shake:1,axis:0,weight:0.85,fr:3,sweatHit:3,smear:[2,3,4],dust:[2,3]}),

 // HOOK (Lewy sierpowy): zejście na nogach i przeniesienie ciężaru na przednią stopę, a następnie gwałtowny obrót
 // przedniej pięty (LHEEL:2.4) i kolana do środka (LKN:1.5); łokieć idzie wysoko w poziomie (LFL:-0.65), prawa ręka przy szczęce.
 MOVE('HOOK',[
   K(0,state.E_LIN,{}),
   K(4,state.E_IN,{BY:2.0,BX:-0.4,LEAN:0.8,ROT:0.55,HROT:0.35,HX:0.6,HY:1.4,LGX:6.5,LGY:-1.5,LFL:-0.25,RGX:4.8,RGY:-4.2,LKN:0.2,HEEL:0.5}),
   K(7,state.E_IN,{BY:2.4,BX:0.2,LEAN:1.4,ROT:0.75,HROT:0.1,HX:0.8,HY:1.8,LGX:5.2,LGY:-3.2,LFL:-0.55,LGS:0.2,RGX:4.5,RGY:-4.8,LHEEL:0.8,LKN:0.5,HEEL:0.6}),
   K(10,state.E_SNAP,{BY:1.4,BX:0.9,LEAN:2.4,ROT:-1.45,HROT:-0.95,HX:0.4,HY:1.6,LGX:13.2,LGY:-4.6,LFL:-0.7,LGS:1.4,RGX:4.5,RGY:-4.8,LHEEL:2.2,LKN:1.4}),
   K(13,state.E_OUT,{BY:1.5,BX:0.8,LEAN:2.3,ROT:-1.7,HROT:-1.1,HX:0.2,HY:1.6,LGX:10.5,LGY:-4.0,LFL:-0.65,LGS:1.6,RGX:4.5,RGY:-4.5,LHEEL:2.4,LKN:1.6}),
   K(19,state.E_OUT,{BY:1.0,BX:0.3,LEAN:1.0,ROT:-0.6,HROT:-0.4,HY:0.8,LGX:9.5,LGY:-1.5,LFL:-0.25,LGS:0.5,RGX:4.8,RGY:-1.5,LHEEL:0.8,LKN:0.5}),
   K(27,state.E_IO,{})
 ],{apex:3,glove:0,fstep:1,twist:-0.075,cancel:19,imp:0.0052,dent:3.1,stop:7,shake:2,axis:0,weight:1,fr:3,sweatHit:3,smear:[2,3,4],dust:[3]}),

 // UPPERCUT (Prawy podbródkowy): ugięcie kolan i obniżenie prawego barku, po czym wybicie z nóg (BY: 2.8 -> 0.3, SQ: 1.2)
 // i wbicie pięści pionowo przez gardę rywala przy pełnej asekuracji lewą ręką (LGY:-5.5).
 MOVE('UPPERCUT',[
   K(0,state.E_LIN,{}),
   K(4,state.E_IN,{ROT:-0.65,HROT:-0.45,BY:2.6,SQ:-0.6,LEAN:1.2,BX:-0.4,RGX:4.8,RGY:3.2,HY:1.6,HX:0.5,LGX:5.5,LGY:-5.0}),
   K(7,state.E_IN,{ROT:-0.8,HROT:-0.55,BY:3.0,SQ:-0.8,LEAN:1.4,BX:-0.2,RGX:5.8,RGY:4.2,HY:1.8,HX:0.6,LGX:5.2,LGY:-5.5,HEEL:0.8}),
   K(10,state.E_SNAP,{ROT:0.75,HROT:0.65,BY:1.4,SQ:0.4,LEAN:2.8,BX:1.6,RGX:10.8,RGY:-2.5,HEEL:2.4,HY:0.6,LGX:5.0,LGY:-5.5,RGS:0.5}),
   K(12,state.E_SNAP,{ROT:1.45,HROT:1.1,BY:0.3,SQ:1.2,LEAN:3.4,BX:2.6,RGX:11.8,RGY:-10.2,HEEL:3.8,HX:0.8,HY:-0.5,LGX:4.8,LGY:-5.2,RGS:0.8}),
   K(15,state.E_OUT,{ROT:1.55,HROT:1.15,BY:0.2,SQ:1.3,LEAN:3.5,BX:2.8,RGX:11.2,RGY:-11.0,HEEL:3.8,HX:0.8,HY:-0.7,LGX:4.8,LGY:-5.0,RGS:0.7}),
   K(21,state.E_IO,{ROT:0.45,HROT:0.3,BY:1.0,LEAN:1.6,BX:0.8,RGX:7.5,RGY:-3.5,HEEL:1.2,LGX:9.0,LGY:-1.5}),
   K(28,state.E_IO,{})
 ],{apex:4,glove:1,fstep:1,twist:0.014,cancel:19,imp:0.004,dent:2.6,stop:6,shake:2,axis:1,lift:2,rise:1,weight:1,sweatHit:4,smear:[3,4,5],dust:[4]}),
 // DODGE (Rotacja / Weave pod sierpowym): zejście po łuku litery U – najpierw odchylenie i ugięcie kolan
 // na tylną nogę, przejście dołem ze zwartą gardą i wyjście w górę na przednią nogę z wkręceniem biodra.
 MOVE('DODGE',[
   K(0,state.E_LIN,{}),
   K(4,state.E_OUT,{BY:3.4,BX:-0.8,LEAN:-1.2,ROT:-0.45,HROT:-0.25,HX:-0.6,HY:1.2,LGX:6.8,LGY:-4.2,RGX:4.5,RGY:-3.8,LKN:0.4}),
   K(9,state.E_IO,{BY:5.4,BX:0.2,LEAN:0.8,ROT:0.15,HROT:0.1,HX:0.4,HY:1.8,LGX:6.2,LGY:-5.0,RGX:4.5,RGY:-4.5,LKN:1.0,HEEL:0.5}),
   K(14,state.E_OUT,{BY:3.0,BX:1.0,LEAN:2.2,ROT:0.55,HROT:0.35,HX:0.8,HY:1.2,LGX:6.8,LGY:-4.5,RGX:4.5,RGY:-4.0,LKN:0.6,HEEL:1.0}),
   K(19,state.E_IO,{BY:1.2,BX:0.2,LEAN:0.8,ROT:0.15,HROT:0.1,LGX:10.5,LGY:-1.0}),
   K(24,state.E_IO,{})
 ],{fstep:-3,cancel:18,sweat:[1],dust:[1,2],headSmear:[1,2]}),

 // SLIP L (Unik na zewnątrz / Outside Slip): zejście z linii ciosu nad przednie kolano, prawy bark i biodro
 // wkręcają się do przodu (ładowanie prawej ręki lub lewego sierpa), broda schowana, garda wysoko przy szczęce.
 MOVE('SLIP L',[
   K(0,state.E_LIN,{}),
   K(3,state.E_SNAP,{BY:3.4,BX:1.6,LEAN:3.2,ROT:0.9,HROT:0.5,HX:1.4,HY:1.8,LGX:6.5,LGY:-5.2,RGX:4.5,RGY:-4.5,LKN:0.9,HEEL:1.0}),
   K(8,state.E_OUT,{BY:3.8,BX:1.9,LEAN:3.6,ROT:1.0,HROT:0.55,HX:1.6,HY:2.0,LGX:6.2,LGY:-5.5,RGX:4.5,RGY:-4.8,LKN:1.1,HEEL:1.2}),
   K(14,state.E_OUT,{BY:0.8,BX:-0.2,LEAN:0.2,ROT:-0.15,HROT:-0.1,HX:-0.2,HY:0.4,LGX:11.0,LGY:-0.5,RGX:4.8,RGY:1.5}),
   K(20,state.E_IO,{})
 ],{cancel:13,sweat:[1],dust:[1],headSmear:[1,2]}),

 // SLIP R (Unik do wewnątrz / Inside Slip): przeniesienie ciężaru na ugiętą tylną nogę, lewy bark i biodro
 // zawijają się do środka (ładowanie prawego prostego / podbródkowego), bez nienaturalnego łamania pleców w tył.
 MOVE('SLIP R',[
   K(0,state.E_LIN,{}),
   K(3,state.E_SNAP,{BY:3.4,BX:-1.4,LEAN:-1.6,ROT:-0.9,HROT:-0.5,HX:-1.3,HY:1.5,LGX:7.0,LGY:-4.8,RGX:4.2,RGY:-4.2,LHEEL:0.8,LKN:0.5}),
   K(8,state.E_OUT,{BY:3.8,BX:-1.8,LEAN:-2.0,ROT:-1.05,HROT:-0.6,HX:-1.6,HY:1.7,LGX:6.8,LGY:-5.2,RGX:4.0,RGY:-4.5,LHEEL:1.0,LKN:0.6}),
   K(14,state.E_OUT,{BY:0.8,BX:0.4,LEAN:1.0,ROT:0.2,HROT:0.15,HX:0.3,HY:0.4,LGX:11.5,LGY:0,RGX:4.8,RGY:2.0}),
   K(20,state.E_IO,{})
 ],{cancel:13,sweat:[1],dust:[1],headSmear:[1,2]}),
 // Feet offsets (STEP/RSTEP) are relative to the body origin, which itself travels with GX,
 // so the values below are (absolute foot position - GX).
 // WALK FORWARD: step-drag — lead foot lifts (knee bent) and reaches, hips sink and follow, rear foot drags up (+7 px)
 MOVE('WALK >',[
   K(0,state.E_LIN,{}),
   K(6,state.E_OUT,{GX:2,STEP:1.5,RSTEP:-2,LLIFT:2.2,LKN:1.3,BY:2.4,LEAN:1.5,HEEL:0.5}),
   K(12,state.E_IO,{GX:4.8,STEP:2.2,RSTEP:-4.8,BY:3,LEAN:1.5,LKN:1.2}),
   K(18,state.E_IO,{GX:6,STEP:1,RSTEP:-1.5,RLIFT:1.2,BY:2.2,HEEL:1,LKN:0.6}),
   K(24,state.E_IO,{GX:7,BY:1.4})
 ],{walk:7,cancel:24,dust:[2,4]}),
 // WALK BACK: rear foot reaches back first, lead foot follows (-7 px)
 MOVE('WALK <',[
   K(0,state.E_LIN,{}),
   K(6,state.E_OUT,{GX:-2,STEP:2,RSTEP:-1.5,RLIFT:2,BY:2.2,LEAN:0.5}),
   K(12,state.E_IO,{GX:-4.8,STEP:4.8,RSTEP:-2.2,BY:2.6,LEAN:0.5}),
   K(18,state.E_IO,{GX:-6,STEP:1.5,RSTEP:-1,LLIFT:1.2,LKN:0.5,BY:2}),
   K(24,state.E_IO,{GX:-7,BY:1.4})
 ],{walk:-7,cancel:24,dust:[2,4]})
];

state.M_DODGE = 4;
state.M_SLIPL = 5;
state.M_SLIPR = 6;
state.M_WALKF = 7;
state.M_WALKB = 8;
state.POS_MIN = -21;
state.POS_MAX = 7;


// Keep retired move slots 9–16 empty so the remaining animation IDs stay stable.
state.MOVES.length=17;

/* ---------- SPARRING: hit reactions, high guard, knockdown ----------
   Reactions are "walk"-type moves: GX is keyed, so the knock-back travels with the feet and
   is baked into posX when the move ends (GX < 0 = away from the opponent — every fighter is
   simulated in its own right-facing frame). hold = tick where time stops while the hold
   condition is true (block held, fighter down). */
state.S_FIRST = state.MOVES.length;

state.MOVES.push(
  // S_HITJ (trafiony prostym): ostry odskok głowy w tył, lekka praca kolan i szybkie zebranie gardy
  MOVE('TRAFIONY',[
    K(0,state.E_LIN,{}),
    K(2,state.E_SNAP,{HX:-2.5,HY:-0.9,LEAN:-0.8,BX:-0.8,BY:1.4,ROT:-0.45,HROT:-0.2,GX:-0.6,LGX:7.2,LGY:-4.8,RGX:4.2,RGY:-3.5}),
    K(6,state.E_OUT,{HX:-1.4,HY:-0.3,LEAN:-0.2,BX:-0.5,BY:1.8,ROT:-0.25,GX:-1.2,RSTEP:-0.5,LGX:8.0,LGY:-3.5,RGX:4.5,RGY:-2.0}),
    K(11,state.E_IO,{HX:-0.4,LEAN:0.4,BY:1.2,GX:-1.5,LGX:11.0,LGY:-0.5,RGX:4.8,RGY:1.5}),
    K(16,state.E_IO,{GX:-1.5})
  ],{walk:-1,cancel:11,sweat:[1],fr:2,headSmear:[1]}),

  // S_HIT (mocny prosty): głowa i barki odrzucone, wyraźny krok wstecz tylną nogą dla złapania równowagi
  MOVE('TRAFIONY!',[
    K(0,state.E_LIN,{}),
    K(2,state.E_SNAP,{HX:-2.9,HY:-1.3,LEAN:-1.8,BX:-1.4,BY:1.5,ROT:-0.7,HROT:-0.35,GX:-1.0,LGX:6.0,LGY:-5.5,RGX:3.5,RGY:-4.2,LHEEL:0.6}),
    K(8,state.E_OUT,{HX:-1.8,HY:-0.5,LEAN:-1.0,BX:-1.0,BY:2.4,ROT:-0.4,HROT:-0.2,GX:-2.5,STEP:1.2,RSTEP:-1.8,RLIFT:1.0,LGX:6.8,LGY:-4.5,RGX:4.0,RGY:-3.2}),
    K(15,state.E_IO,{HX:-0.4,HY:0.4,LEAN:0.4,BY:1.8,GX:-3.5,STEP:0.4,LLIFT:0.6,LKN:0.5,LGX:9.5,LGY:-1.5,RGX:4.6,RGY:0.5}),
    K(22,state.E_IO,{GX:-3.5})
  ],{walk:-1,cancel:16,sweat:[1],dust:[2],fr:2,headSmear:[1]}),

  // S_HOOKED (trafiony sierpowym): głowa i obręcz barkowa przekręcone z impetem ciosu, ugięcie kolan
  MOVE('HAK NA GŁOWĘ',[
    K(0,state.E_LIN,{}),
    K(2,state.E_SNAP,{HX:-1.8,HY:2.1,LEAN:-1.2,BX:-1.1,BY:2.2,ROT:1.25,HROT:0.65,GX:-0.8,LGX:5.0,LGY:-1.5,RGX:4.5,RGY:-4.8,LKN:0.8,HEEL:0.8}),
    K(9,state.E_OUT,{HX:-1.2,HY:1.2,LEAN:-0.5,BX:-0.6,BY:2.8,ROT:0.65,HROT:0.35,GX:-2.0,RSTEP:-1.2,LGX:6.2,LGY:-2.8,RGX:4.5,RGY:-4.0,LKN:0.5}),
    K(16,state.E_IO,{HX:-0.3,HY:0.4,LEAN:0.4,BY:1.6,ROT:0.15,GX:-2.5,LGX:10.0,LGY:-0.5,RGX:4.8,RGY:1.0}),
    K(22,state.E_IO,{GX:-2.5})
  ],{walk:-1,cancel:16,sweat:[1],fr:2,headSmear:[1]}),

  // S_UPPED (trafiony podbródkowym): podbicie brody i klatki piersiowej w górę na palcach, po czym ciężkie osadzenie na nogach
  MOVE('PODBRÓDEK',[
    K(0,state.E_LIN,{}),
    K(2,state.E_SNAP,{HX:-2.2,HY:-2.6,LEAN:-2.4,BX:-1.0,BY:-0.6,SQ:0.8,ROT:-0.35,HEEL:1.8,LHEEL:1.2,GX:-0.6,LGX:6.2,LGY:-6.2,RGX:3.8,RGY:-5.0}),
    K(9,state.E_OUT,{HX:-1.5,HY:-1.1,LEAN:-1.4,BX:-0.8,BY:1.8,SQ:0.2,GX:-2.4,RSTEP:-1.5,RLIFT:1.0,LGX:6.5,LGY:-5.0,RGX:4.0,RGY:-3.5}),
    K(16,state.E_IO,{HX:-0.4,HY:0.3,LEAN:0.3,BY:2.0,GX:-3.0,LGX:9.5,LGY:-1.5,RGX:4.6,RGY:0.5}),
    K(22,state.E_IO,{GX:-3.0})
  ],{walk:-1,cancel:16,sweat:[1],fr:2,headSmear:[1]}),

  // S_BODY (cios na korpus / wątrobę): nagłe złamanie w pasie, łokcie schodzą na żebra, głowa opada za gardę
  MOVE('NA KORPUS',[
    K(0,state.E_LIN,{}),
    K(2,state.E_SNAP,{BY:3.6,LEAN:2.8,BX:-1.6,HX:1.1,HY:2.2,SQ:-1.2,ROT:0.35,HROT:0.2,GX:-0.6,LGX:5.8,LGY:0.5,RGX:4.2,RGY:2.2,LFL:0.4,RFL:0.3,LKN:0.9}),
    K(10,state.E_IO,{BY:3.8,LEAN:2.4,BX:-1.2,HX:0.9,HY:1.8,SQ:-1.0,ROT:0.25,GX:-2.0,RSTEP:-1.0,LGX:6.0,LGY:-0.5,RGX:4.2,RGY:1.5,LFL:0.3,LKN:0.6}),
    K(18,state.E_IO,{BY:1.8,LEAN:1.0,HY:0.8,GX:-2.5,LGX:9.0,LGY:-2.0,RGX:4.5,RGY:0.5}),
    K(24,state.E_IO,{GX:-2.5})
  ],{walk:-1,cancel:18}),

  // S_BLOCK (wysoka, zwarta garda): przednia ręka chroni łuk brwiowy, tylna asekuruje szczękę, łokcie wąsko
  MOVE('BLOK',[
    K(0,state.E_LIN,{}),
    K(4,state.E_OUT,{LGX:7.4,LGY:-6.4,RGX:4.8,RGY:-5.4,LFL:0.35,RFL:0.3,HX:-0.4,HY:1.4,BY:1.8,LEAN:0.9,ROT:0.25,HROT:0.15,LGS:0.25,RGS:0.2}),
    K(30,state.E_LIN,{LGX:7.4,LGY:-6.4,RGX:4.8,RGY:-5.4,LFL:0.35,RFL:0.3,HX:-0.4,HY:1.4,BY:1.8,LEAN:0.9,ROT:0.25,HROT:0.15,LGS:0.25,RGS:0.2}),
    K(38,state.E_IO,{})
  ],{cancel:5,hold:5}),

  // S_BLOCKHIT (cios przyjęty na gardę): twarde wbicie przedramion i sprężyste zamortyzowanie na kolanach
  MOVE('BLOK!',[
    K(0,state.E_LIN,{}),
    K(2,state.E_SNAP,{LGX:5.6,LGY:-6.2,RGX:3.8,RGY:-5.2,LFL:0.45,RFL:0.4,HX:-1.1,HY:1.6,BY:2.6,LEAN:-0.3,BX:-1.0,ROT:0.3,GX:-1.0,LGS:0.3,RGS:0.25,LKN:0.5}),
    K(8,state.E_OUT,{LGX:6.8,LGY:-6.4,RGX:4.5,RGY:-5.4,LFL:0.35,RFL:0.3,HX:-0.6,HY:1.5,BY:2.1,LEAN:0.5,GX:-1.5,LGS:0.25,RGS:0.2}),
    K(13,state.E_IO,{LGX:7.4,LGY:-6.4,RGX:4.8,RGY:-5.4,LFL:0.35,RFL:0.3,HX:-0.4,HY:1.4,BY:1.8,LEAN:0.9,ROT:0.25,GX:-1.5,LGS:0.25,RGS:0.2})
  ],{walk:-1,cancel:7}),

  // S_STAGGER (zamroczony / "na miękkich nogach")
  MOVE('ZAMROCZONY',[
    K(0,state.E_LIN,{}),
    K(4,state.E_OUT,{HX:-2.2,HY:-0.8,LEAN:-1.8,BX:-1.4,BY:2.2,ROT:-0.45,GX:-1.2,LGX:5.5,LGY:-1.5,RGX:3.5,RGY:1.5}),
    K(14,state.E_IO,{HX:0.8,HY:1.8,LEAN:1.4,BX:0.4,BY:3.8,ROT:0.35,GX:-3.2,STEP:1.8,RSTEP:-2.0,LKN:1.2,LGX:5.0,LGY:0.5,RGX:3.5,RGY:2.5}),
    K(26,state.E_IO,{HX:-1.2,HY:0.6,LEAN:-0.8,BX:-0.8,BY:3.0,ROT:-0.25,GX:-5.0,STEP:-0.8,RLIFT:1.0,LGX:5.8,LGY:-1.0,RGX:3.8,RGY:1.5}),
    K(38,state.E_IO,{HX:0.4,HY:1.2,LEAN:0.8,BY:2.6,GX:-6.0,LKN:0.6,LGX:7.5,LGY:-2.5,RGX:4.2,RGY:0}),
    K(50,state.E_IO,{GX:-6.0})
  ],{walk:-1,cancel:44,sweat:[1,3],dust:[2,3]}),

  // S_KD (nokdaun): ugięcie nóg i opadnięcie na jedno kolano / przysiad podparcia
  MOVE('NOKDAUN',[
    K(0,state.E_LIN,{}),
    K(3,state.E_SNAP,{HX:-2.6,HY:-1.6,LEAN:-2.6,BX:-1.5,BY:1.6,ROT:-0.5,GX:-1.0,LGX:4.5,LGY:-3.0,RGX:2.8,RGY:-0.5}),
    K(11,state.E_IN,{HX:-0.8,HY:0.4,LEAN:-2.8,BX:-2.8,BY:8.0,GX:-3.0,STEP:3.0,RSTEP:3.0,LKN:1.2,LGX:4.0,LGY:2.5,RGX:2.0,RGY:4.5}),
    K(18,state.E_OUT,{HX:0.4,HY:1.4,LEAN:-3.2,BX:-3.8,BY:13.5,GX:-4.0,STEP:5.0,RSTEP:7.5,ST:10,LGX:4.5,LGY:5.5,RGX:2.5,RGY:7.5,SQ:-0.6}),
    K(24,state.E_IO,{HX:0.6,HY:1.6,LEAN:-3.0,BX:-3.8,BY:13.2,GX:-4.0,STEP:5.0,RSTEP:7.5,ST:10,LGX:5.0,LGY:5.0,RGX:3.0,RGY:7.0,SQ:-0.5})
  ],{walk:-1,cancel:999,hold:23,sweat:[1],dust:[3],land:[3]}),

  // S_GETUP (wstawanie z desek)
  MOVE('WSTAJE',[
    K(0,state.E_LIN,{}),
    K(10,state.E_IO,{HX:0.8,HY:1.8,LEAN:2.0,BX:-1.8,BY:9.5,STEP:3.8,RSTEP:1.0,LKN:1.4,ST:12,LGX:7.0,LGY:2.5,RGX:4.2,RGY:3.5}),
    K(22,state.E_IO,{HX:0.4,HY:1.2,LEAN:1.8,BX:-0.4,BY:4.5,STEP:1.5,RSTEP:-0.5,LKN:0.8,ST:16,LGX:7.5,LGY:-2.0,RGX:4.5,RGY:0.5}),
    K(32,state.E_IO,{BY:1.8,LEAN:0.8,LGX:10.5,LGY:-1.0,RGX:4.8,RGY:1.5}),
    K(40,state.E_IO,{})
  ],{walk:-1,cancel:40}),

  // S_KO (ciężki nokaut – upadek na plecy)
  MOVE('KO',[
    K(0,state.E_LIN,{}),
    K(3,state.E_SNAP,{HX:-2.8,HY:-2.0,LEAN:-3.2,BX:-1.5,BY:1.2,ROT:-0.6,GX:-1.0,LGX:3.5,LGY:-5.0,RGX:2.0,RGY:-2.5}),
    K(13,state.E_IN,{HX:-1.8,HY:0.2,LEAN:-5.0,BX:-3.0,BY:9.0,GX:-4.0,STEP:4.0,RSTEP:4.0,LGX:2.0,LGY:-1.5,RGX:1.0,RGY:0.5}),
    K(21,state.E_OUT,{HX:-5.5,HY:7.5,LEAN:-9.0,BX:-4.0,BY:15.0,SQ:-7.0,GX:-5.0,STEP:9.0,RSTEP:9.0,ST:8,LGX:-5.5,LGY:-2.5,RGX:2.5,RGY:1.5}),
    K(28,state.E_OUT,{HX:-6.5,HY:8.5,LEAN:-10.0,BX:-4.0,BY:15.5,SQ:-8.5,GX:-5.0,STEP:10.0,RSTEP:10.0,ST:8,LGX:-8.5,LGY:0.5,RGX:5.0,RGY:3.0}),
    K(36,state.E_IO,{HX:-6.5,HY:8.5,LEAN:-10.0,BX:-4.0,BY:15.5,SQ:-8.5,GX:-5.0,STEP:10.0,RSTEP:10.0,ST:8,LGX:-8.5,LGY:0.5,RGX:5.0,RGY:3.0})
  ],{walk:-1,cancel:9999,hold:35,sweat:[1],dust:[3],land:[3]})
);

state.S_WIN = state.MOVES.length;

state.MOVES.push(
 // victory (reference): a small crouch with the fists at the chest, then up on the toes, both arms thrown up (held)
 MOVE('WYGRANA',[
   K(0,state.E_LIN,{}),
   K(8,state.E_OUT,{BY:3,LEAN:0.6,LGX:5,LGY:-2,RGX:3,RGY:0,HY:1.5,SQ:0.5,ST:18}),
   K(18,state.E_OUT,{BY:-0.5,LEAN:-0.8,HEEL:1.5,LHEEL:1,LGX:3,LGY:-19,RGX:0,RGY:-19,HX:-0.5,HY:-1.5,ST:14,SQ:-0.5}),
   K(26,state.E_IO,{BY:0,LEAN:-0.6,HEEL:1,LHEEL:0.5,LGX:3.5,LGY:-18,RGX:0.5,RGY:-18,HX:-0.5,HY:-1.2,ST:14})
 ],{cancel:9999,hold:25})
);

state.S_HITJ = state.S_FIRST;
state.S_HIT = state.S_FIRST+1;
state.S_HOOKED = state.S_FIRST+2;
state.S_UPPED = state.S_FIRST+3;
state.S_BODY = state.S_FIRST+4;
state.S_BLOCK = state.S_FIRST+5;
state.S_BLOCKHIT = state.S_FIRST+6;
state.S_STAGGER = state.S_FIRST+7;
state.S_KD = state.S_FIRST+8;
state.S_GETUP = state.S_FIRST+9;
state.S_KO = state.S_FIRST+10;

/* DASHES (double-tap a direction): a low springy hop off the back foot (doskok) / front foot (odskok),
   ~13-14 px in 18 ticks. Cancelable on landing, so a doskok flows straight into a punch. */
state.M_DASHF = state.MOVES.length;
state.M_DASHB = state.MOVES.length+1;

state.MOVES.push(
 MOVE('DOSKOK',[
   K(0,state.E_LIN,{}),
   K(3,state.E_OUT,{GX:1.5,BY:2.6,LEAN:3,HEEL:1.8,RSTEP:-1.5,RLIFT:0.5,HY:1.2}),
   K(8,state.E_OUT,{GX:9,GY:-1.5,BY:1.2,LEAN:3.8,STEP:1.5,RSTEP:-4.5,LLIFT:1.2,RLIFT:1.5,HEEL:2,HY:1.5}),
   K(12,state.E_IN,{GX:12,BY:2.6,LEAN:1.6,STEP:0.5,RSTEP:-1,HY:1}),
   K(18,state.E_IO,{GX:13,BY:1.3})
 ],{walk:13,hop:1,cancel:12,dust:[1,3],land:[3]}),
 MOVE('ODSKOK',[
   K(0,state.E_LIN,{}),
   K(3,state.E_OUT,{GX:-1.5,BY:2.4,LEAN:0,HX:-1,LHEEL:1,LLIFT:0.5,HY:1}),
   K(8,state.E_OUT,{GX:-10,GY:-1.5,BY:1.5,LEAN:-1.8,HX:-1.5,STEP:3.5,RSTEP:-0.5,LLIFT:1.5,RLIFT:1.2,HY:0.5}),
   K(12,state.E_IN,{GX:-13,BY:2.6,LEAN:0.4,STEP:1,HY:1}),
   K(18,state.E_IO,{GX:-14,BY:1.3})
 ],{walk:-14,hop:1,cancel:12,dust:[1,3],land:[3]})
);

// Duck under the guard, drive past on bent knees, then turn and rise into stance.
state.M_PIVOT=state.MOVES.length;
state.MOVES.push(MOVE('PIVOT',[
  K(0,state.E_LIN,{}),
  K(4,state.E_OUT,{BY:7,LEAN:5,HX:2,HY:2.5,ROT:0.7,HROT:0.3,LGX:5,LGY:-6,RGX:3,RGY:-4,LKN:1.5}),
  K(8,state.E_OUT,{BY:7,LEAN:6,HX:2,HY:2.5,ROT:0.8,HROT:0.3,LGX:5,LGY:-6,RGX:3,RGY:-4,STEP:5,RSTEP:-5,LLIFT:1,RLIFT:2,HEEL:1.5,LKN:1.5}),
  K(14,state.E_IO,{BY:6.5,LEAN:4,HX:1,HY:2,ROT:0.6,HROT:0.3,LGX:5,LGY:-6,RGX:3,RGY:-4,STEP:2,RSTEP:-3,LLIFT:2,LHEEL:1}),
  K(18,state.E_IO,{BY:5,LEAN:2,HY:1.5,ROT:-0.8,HROT:-0.6,LGX:5,LGY:-6,RGX:4,RGY:-5,STEP:-3,RSTEP:2,LLIFT:1,HEEL:0.8}),
  K(23,state.E_OUT,{BY:1.5,LEAN:1,ROT:-0.2,HROT:-0.1,STEP:1,LHEEL:0.5}),
  K(30,state.E_IO,{})
],{cancel:30}));

// The opponent steps into the vacated slot, then follows the passing boxer with a late turn.
state.M_PIVOT_TURN=state.MOVES.length;
state.MOVES.push(MOVE('OBRÓT',[
  K(0,state.E_LIN,{}),
  K(7,state.E_LIN,{}),
  K(13,state.E_IO,{BY:2,LEAN:1.5,STEP:2,RSTEP:-4,RLIFT:2,HROT:-0.3}),
  K(20,state.E_IO,{BY:2,STEP:1,RSTEP:-1,ROT:-0.7,HROT:-0.6}),
  K(24,state.E_IO,{BY:1.5,ST:8,HEEL:1,LHEEL:1,ROT:-1,HROT:-0.9,LGX:5,LGY:-6,RGX:4,RGY:-5}),
  K(27,state.E_OUT,{BY:1,ST:10,ROT:0.3,HROT:0.2,STEP:-1,RSTEP:1}),
  K(30,state.E_IO,{})
],{cancel:30}));

/* ---------- PERK MOVES AND REACTIONS (tiers IV–VI) ----------
   Appended after every existing move, so earlier ids and the reaction ranges S_HITJ…S_BLOCKHIT keep their values. */
state.M_SHOVE=state.MOVES.length;
state.MOVES.push(MOVE('ODEPCHNIĘCIE',[
  K(0,state.E_LIN,{}),
  K(5,state.E_OUT,{BY:2,LEAN:2.5,GX:2,STEP:2,RSTEP:-1,LGX:12,LGY:-6,RGX:12,RGY:-4,LGS:0.3,RGS:0.3,HROT:0.3}),
  K(10,state.E_OUT,{BY:1.5,LEAN:3.5,GX:3,STEP:2.5,RSTEP:-2,HEEL:1.5,LGX:17,LGY:-6,RGX:17,RGY:-4,LGS:0.4,RGS:0.4,HROT:0.5}),
  K(16,state.E_IO,{GX:2,LEAN:2,LGX:9,LGY:-6,RGX:7,RGY:-3}),
  K(22,state.E_IO,{})
],{apex:2,special:'shove',cancel:16,dust:[2]}));
state.S_PUSHED=state.MOVES.length;
state.MOVES.push(MOVE('ODEPCHNIĘTY',[
  K(0,state.E_LIN,{}),
  K(4,state.E_OUT,{HX:-1.5,LEAN:-1.8,BX:-1.5,BY:2,GX:-3,STEP:1,LGX:4,LGY:-3,RGX:3,RGY:0,ROT:-0.3}),
  K(12,state.E_IO,{HX:-0.8,LEAN:-0.6,BY:2.4,GX:-8,STEP:-1,RLIFT:1.2,LGX:5,LGY:-4,RGX:3,RGY:-1}),
  K(20,state.E_IO,{GX:-12,BY:1.4})
],{walk:-12,cancel:20,dust:[1,2]}));
state.S_DAZED=state.MOVES.length;
state.MOVES.push(MOVE('OGŁUSZONY',[
  K(0,state.E_LIN,{}),
  K(6,state.E_OUT,{HX:-1,HY:1,LEAN:-1,BY:3,ROT:-0.2,LGX:4,LGY:1,RGX:3,RGY:3,LKN:1}),
  K(18,state.E_IO,{HX:1,HY:2,LEAN:1,BY:4,ROT:0.3,LGX:4,LGY:2,RGX:3,RGY:4,LKN:1.5}),
  K(30,state.E_IO,{HX:-1,HY:1,LEAN:-0.5,BY:3,ROT:-0.3,LGX:4,LGY:1,RGX:3,RGY:3,LKN:0.8}),
  K(42,state.E_IO,{BY:1.5})
],{cancel:42,sweat:[1]}));
state.S_DOUBLED=state.MOVES.length;
state.MOVES.push(MOVE('ZGIĘTY',[
  K(0,state.E_LIN,{}),
  K(3,state.E_OUT,{BY:5,LEAN:4,BX:-1,HX:1.5,HY:3.5,SQ:-1.5,ROT:0.3,GX:-0.5,LGX:4,LGY:3,RGX:3,RGY:4,LKN:1}),
  K(24,state.E_LIN,{BY:5,LEAN:4,BX:-1,HX:1.5,HY:3.5,SQ:-1.5,ROT:0.3,GX:-1.5,LGX:4,LGY:3,RGX:3,RGY:4,LKN:1}),
  K(36,state.E_IO,{BY:2,LEAN:1.5,GX:-1.5,LGX:6,LGY:-2,RGX:4,RGY:0})
],{walk:-1,cancel:36,sweat:[1]}));
state.M_PARRY=state.MOVES.length;
state.MOVES.push(MOVE('PAROWANIE',[
  K(0,state.E_LIN,{}),
  K(2,state.E_SNAP,{LGX:10.5,LGY:-4.2,LFL:0.2,LGS:0.5,ROT:0.35,HROT:0.15,LEAN:0.4,HX:-0.4,HY:0.8,BY:1.2,RGX:4.8,RGY:-4.5}),
  K(6,state.E_OUT,{LGX:8.8,LGY:-2.2,LFL:0.3,LGS:0.6,ROT:0.45,HROT:0.2,LEAN:0.6,HX:-0.4,HY:1.0,BY:1.4,RGX:4.8,RGY:-4.5}),
  K(12,state.E_IO,{})
],{cancel:8}));
state.S_PARRIED=state.MOVES.length;
state.MOVES.push(MOVE('ODBITY',[
  K(0,state.E_LIN,{}),
  K(3,state.E_SNAP,{ROT:-0.75,HROT:-0.35,LEAN:-0.6,HX:-0.8,HY:0.6,BY:1.4,LGX:8.5,LGY:-6.5,LGS:-0.4,RGX:3.8,RGY:-1.5}),
  K(16,state.E_OUT,{ROT:-0.55,HROT:-0.25,LEAN:-0.3,HX:-0.6,HY:0.4,BY:1.2,LGX:8.0,LGY:-5.5,LGS:-0.3,RGX:4.2,RGY:-0.5}),
  K(28,state.E_IO,{})
],{cancel:24}));
state.S_OVERREACH=state.MOVES.length;
state.MOVES.push(MOVE('PRZELOT',[
  K(0,state.E_LIN,{}),
  K(6,state.E_OUT,{LEAN:5,BX:3,GX:3,STEP:3,RSTEP:-1,LLIFT:1,LGX:16,LGY:-1,RGX:5,RGY:2,HX:2,HY:2,LKN:1,ROT:-0.4}),
  K(24,state.E_LIN,{LEAN:4.5,BX:2.5,GX:4,STEP:2,RSTEP:-1.5,LGX:13,LGY:0,RGX:5,RGY:2,HX:2,HY:2,LKN:1,ROT:-0.3}),
  K(36,state.E_IO,{GX:4})
],{walk:4,cancel:36,dust:[1]}));
state.M_ELBOW=state.MOVES.length;
state.MOVES.push(MOVE('ŁOKIEĆ',[
  K(0,state.E_LIN,{}),
  K(4,state.E_IN,{ROT:0.5,HROT:0.2,LGX:4,LGY:-9,LGS:-0.8,BY:1.5}),
  K(8,state.E_OUT,{ROT:-0.9,HROT:-0.5,LEAN:2.5,LGX:9,LGY:-8,LGS:-1,BY:1.5,LHEEL:0.8}),
  K(14,state.E_LIN,{ROT:-0.9,HROT:-0.5,LEAN:2.5,LGX:9,LGY:-8,LGS:-1,BY:1.5,LHEEL:0.8}),
  K(22,state.E_IO,{})
],{apex:2,glove:0,pid:2,special:'elbow',fstep:0,cancel:14,stop:4,shake:1,weight:0.7,sweatHit:2}));
state.M_HEADBUTT=state.MOVES.length;
state.MOVES.push(MOVE('Z BYKA',[
  K(0,state.E_LIN,{}),
  K(5,state.E_IN,{LEAN:-1.2,HX:-1.5,HY:-0.5,BY:2,LGX:6,LGY:-6,RGX:5,RGY:-4}),
  K(10,state.E_OUT,{LEAN:5.5,HX:3,HY:1.5,BX:2,GX:1.5,BY:2,LGX:8,LGY:-4,RGX:6,RGY:-3}),
  K(16,state.E_LIN,{LEAN:5,HX:2.5,HY:1.5,BX:2,GX:1.5,BY:2}),
  K(24,state.E_IO,{})
],{apex:2,special:'headbutt',cancel:16,sweat:[2]}));
state.M_CLINCH=state.MOVES.length;
state.MOVES.push(MOVE('KLINCZ',[
  K(0,state.E_LIN,{}),
  K(6,state.E_OUT,{GX:5,STEP:3,RSTEP:-1,LEAN:4,HX:2,HY:2,BY:2.5,LGX:14,LGY:-9,RGX:12,RGY:-6,LGS:0.6,RGS:0.5}),
  K(40,state.E_LIN,{GX:5,STEP:3,RSTEP:-1,LEAN:4,HX:2,HY:2,BY:2.5,LGX:14,LGY:-9,RGX:12,RGY:-6,LGS:0.6,RGS:0.5}),
  K(48,state.E_IO,{GX:1})
],{walk:1,hold:6,cancel:48}));
state.S_CLINCHED=state.MOVES.length;
state.MOVES.push(MOVE('W KLINCZU',[
  K(0,state.E_LIN,{}),
  K(6,state.E_OUT,{LEAN:3,HX:2,HY:2,BY:2.5,GX:1,LGX:10,LGY:-3,RGX:8,RGY:-1}),
  K(40,state.E_LIN,{LEAN:3,HX:2,HY:2,BY:2.5,GX:1,LGX:10,LGY:-3,RGX:8,RGY:-1}),
  K(48,state.E_IO,{GX:-1})
],{walk:-1,hold:6,cancel:48}));
state.S_SHELL=state.MOVES.length;
state.MOVES.push(MOVE('SKORUPA',[
  K(0,state.E_LIN,{LGX:7.4,LGY:-6.4,RGX:4.8,RGY:-5.4,LFL:0.35,RFL:0.3,HX:-0.4,HY:1.4,BY:1.8,LEAN:0.9,ROT:0.25,LGS:0.25,RGS:0.2}),
  K(5,state.E_OUT,{LGX:5.8,LGY:-6.8,RGX:4.0,RGY:-5.8,LFL:0.5,RFL:0.45,HX:-0.8,HY:2.4,BY:3.2,LEAN:1.8,ROT:0.15,LGS:0.4,RGS:0.35,SQ:-0.6}),
  K(30,state.E_LIN,{LGX:5.8,LGY:-6.8,RGX:4.0,RGY:-5.8,LFL:0.5,RFL:0.45,HX:-0.8,HY:2.4,BY:3.2,LEAN:1.8,ROT:0.15,LGS:0.4,RGS:0.35,SQ:-0.6}),
  K(38,state.E_IO,{})
],{cancel:6,hold:6}));
// charging a power punch: the first (loading) key of the punch, held until release
state.M_WINDUP=state.MOVES.length;
for(const pid of [1,2,3]){ const src=state.MOVES[pid], load=src.keys[1], o={}; for(const k in state.IDX) o[k]=load[state.IDX[k]];
  o.BY+=1; o.LEAN-=0.6; if(pid===1) o.RGX-=1.5; else if(pid===2) o.LGX-=1.5; else o.RGY+=1.5;
  state.MOVES.push(MOVE('ZAMACH '+src.name,[K(0,state.E_LIN,{}),K(8,state.E_IN,o),K(90,state.E_LIN,o)],{hold:8,cancel:0,charge:pid})); }

state.MOVES.forEach((move,id)=>{ move.id=id; });

state.moveRate = 1;

state.posX = 0;
state.walkHeld = -1;

state.IDLE = -1;

// body-shot profile per punch: [knee dip, glove drop, glove x, lean in, heel, glove-y cap]
// the uppercut becomes a short shovel into the belly: the glove waits at the hip, then drives up-and-in to the solar plexus
/* low guard: gloves drop from the face to the ribs and belly, elbows tucked, knees a bit deeper, the chin comes up (exposed) */
state.LOWG_CH = [state.LGX,state.LGY,state.RGX,state.RGY,state.BY,state.LEAN,state.HY,state.HX];
state.LOWG_D = [-1,10,-1.2,9,1,0.6,-1.6,0.6];
state.LOWP = [[2.5,6.5,0,0.8,0,99],[3,6,0,0.8,0,99],[3,7,-0.5,0.5,0,99],[3.5,12,-1,1.2,-1.5,6.5]];

state.FLOW_AMP = 1.3;
state.AMP_IDX = new Uint8Array([state.LEAN,state.ROT,state.BY,state.HEEL,state.HX,state.HY,state.HROT]);
state.AMP_N = 7;

/* Idle retains the eight-step sprite cadence on the existing shared beat clock. */
/* IDLE: planted Victorian guard, a four-beat weight shift and a slower breath.
   Fatigue drops the fists and deepens breathing; injuries retain their irregular wobble.
   The explicitly activated flow footwork above keeps its existing movement. */
state.idleTired = 0;
state.idleHurt = 0;
state.idleClose = 0;
state.idleSeed = 7;

}

````

---

## `src/fighter-context.js`

````js
// @ts-check

/** @typedef {Record<string, number>} FighterContext */
/** @typedef {{boxing:Record<string,number>,animation:Record<string,number>,sparring:Record<string,number>}} FighterSources */

// One named-field map is shared by capture and restore. Pose arrays remain preallocated on each fighter.
export const CONTEXT_FIELDS = {
  "boxing": [
    "state",
    "stateT",
    "frameIdx",
    "fired",
    "idleT",
    "curGrade",
    "buffered",
    "bufferTick",
    "bufferedGrade",
    "moveStep",
    "pgx",
    "pgy",
    "phx",
    "phy",
    "flashL",
    "flashR",
    "hipX",
    "hipY",
    "sx",
    "sy",
    "lsx",
    "lsy",
    "rsx",
    "rsy",
    "lex",
    "ley",
    "rex",
    "rey",
    "lgx",
    "lgy",
    "rgx",
    "rgy",
    "lgr",
    "rgr",
    "headX",
    "headY",
    "lhx",
    "lhy",
    "rhx",
    "rhy",
    "lkx",
    "lky",
    "rkx",
    "rky",
    "lax",
    "lay",
    "rax",
    "ray",
    "lhex",
    "lhey",
    "ltx",
    "lty",
    "rhex",
    "rhey",
    "rtx",
    "rty",
    "lTipRaw",
    "rTipRaw",
    "lSurf",
    "rSurf",
    "torsoX",
    "shDirX",
    "shDirY",
    "trX",
    "trY",
    "trVX",
    "trVY",
    "prevHX",
    "prevHY",
    "torsoLagX",
    "torsoLagVX",
    "rdOn"
  ],
  "animation": [
    "moveRate",
    "posX"
  ],
  "sparring": [
    "aimLow",
    "nextLow",
    "idleOff"
  ]
};
const GROUPS = /** @type {const} */ (['boxing', 'animation', 'sparring']);

/** @param {FighterContext} context @param {FighterSources} sources */
export function saveFighterContext(context, sources) {
  for (const group of GROUPS) for (const key of CONTEXT_FIELDS[group]) context[key] = sources[group][key];
}

/** @param {FighterContext} context @param {FighterSources} sources */
export function loadFighterContext(context, sources) {
  for (const group of GROUPS) for (const key of CONTEXT_FIELDS[group]) sources[group][key] = context[key];
}

````

---

## `src/cell-light.js`

````js
/* Cell light: a lighting pass over the finished frame of the isometric cell (the shared Ward).
   The background build records where each pixel sits in the room; every frame the tallow lamp (evening and the dark
   morning), the sun through the barred window (day) and the cold window light (after lights-out) relight it.
   Walls and floor get proper distance and angle; furniture and people take the light of the surface behind them. */

import { state as gymState, isoX, isoY, isoLine } from './gym.js';
import { state as appearanceState, rgb } from './appearance.js';
import { state as rendererState, pset } from './renderer.js';
import { state as progressionState } from './progression.js';
import { state as boxingState, h2 } from './boxing.js';
import { weatherNow } from './weather.js';
import { wardWinOpen, wardPainted, LAMP, WARD_WIN as WIN } from './ward.js';

// Runtime values owned by cell-light; initialized explicitly by main.js.
export const state = {};

/** The barred window in the j = 0 wall, in wall units u = 6·i and height z. */
/** One height unit (a screen pixel) in tiles. */
const ZS = 0.15;
/** Is (u,z) open between the Ward window bars? @param {number} u @param {number} z */
export function winOpen(u,z){ return wardWinOpen(u,z); }

/** @param {number} a @param {number} b @param {number} x */
const smooth=(a,b,x)=>{ const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); };

/** Light sources at a minute of the day: daylight 0..1, the lamp (on 6:00–7:30 and 17:30–22:00), window light after 22:00.
 * @param {number} min */
export function cellLights(min){
  const h=(((min/60)%24)+24)%24;
  return {h,day:smooth(5.8,8,h)*(1-smooth(17,20,h)),bulb:(h>=6&&h<7.5)||(h>=17.5&&h<22),night:h>=22||h<6};
}

/** Sun through the window: horizontal drift per tile of depth and drop per tile (low in the morning, high at noon). @param {number} h */
function sunRay(h){ const u=Math.max(0,Math.min(1,(h-6)/13.5)), s=Math.sin(Math.PI*u); return {lx:0.45-0.9*u,lz:2.3+0.7*s,k:Math.pow(s,0.35)}; }   // a low sun: the long barred patch crosses the free floor, right of the table in the morning, by the door in the evening

/** Record the room position of every background pixel. Called after the cell background is built. @param {number} cw @param {number} ch */
export function buildCellLight(cw,ch){
  const W=appearanceState.W, H=appearanceState.H, OX=gymState.HUB_OX, OY=gymState.HUB_OY, WH=gymState.HUB_WH;
  if(state.kind.length!==W*H){ state.kind=new Uint8Array(W*H); state.pos=new Float32Array(W*H*3); }   // the 2× room has its own size
  const K=state.kind, P=state.pos;
  state.cw=cw; state.ch=ch;
  const Kp=gymState.ISO_K;
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    const p=y*W+x, ux=x/Kp, uy=y/Kp, a=(ux-OX)/6, b=(uy-OY)/3, fi=(a+b)/2, fj=(b-a)/2;
    let k=0, i=0, j=0, z=0;
    if(fi>=0&&fj>=0&&fi<=cw&&fj<=ch){ k=1; i=fi; j=fj; }                                      // floor
    else if(ux<OX){ const lj=(OX-ux)/6, lz=OY+lj*3-uy; if(lj<=ch&&lz>=0&&lz<=WH){ k=2; j=lj; z=lz; } }   // left wall, i = 0
    else { const ri=(ux-OX)/6, rz=OY+ri*3-uy; if(ri<=cw&&rz>=0&&rz<=WH){ k=winOpen(ri*6,rz)?4:3; i=ri; z=rz; } }   // window wall, j = 0
    K[p]=k; P[p*3]=i; P[p*3+1]=j; P[p*3+2]=z;
  }
}

/** Tallow intensity this frame: an uneven, guttering flame. */
function bulbPower(on){
  const t=boxingState.tick;
  if(!on) return 0;
  return 0.78+0.22*(h2(t>>1,5)/255)*(h2(t>>3,9)/255)-(h2(t>>4,17)<12?0.25:0);
}

/** Position of the tallow flame on its bracket. */
function bulbAt(){ const t=boxingState.tick; return {i:LAMP.i+0.25+Math.sin(t*0.37)*0.03,j:LAMP.j+Math.cos(t*0.29)*0.03}; }

/** Relight the finished frame. */
export function lightCell(){
  const fb=rendererState.FB_MAIN, bg=gymState.bgHub, K=state.kind, P=state.pos, N=appearanceState.W*appearanceState.H;
  const L=cellLights(progressionState.save.sim.min), S=sunRay(L.h), B=bulbAt();
  const wx=weatherNow(), dk=wx==='sun'?1:wx==='cloud'?0.82:0.66, bulb=1.75*bulbPower(L.bulb), sun=wx==='sun'?0.32*L.day*S.k:0, amb=0.15+0.42*L.day*dk, night=L.night?0.32:0;   /* clouds and rain: no patch of sun, a dimmer day; the Ward: smog, a dark vault */
  const AR=amb*(0.92+0.06*L.day), AG=amb*0.96, AB=amb*(1.08-0.05*L.day)*0.96, bz=LAMP.z*ZS, fall=0.11, gR=0.62, gB=0.3, wi=(WIN.u0+WIN.u1)/12, NL={i:wi,j:0.4,z:WIN.z0+2};
  state.bulb=bulb; state.sun=sun; state.ray=S;
  const PT=wardPainted(), pAmb=0.28+0.66*L.day*(wx==='sun'?1:wx==='cloud'?0.88:0.76), pCool=1-L.day;   /* the painting keeps its own light: by day close to it, at night a dark vault */
  for(let p=0;p<N;p++){
    const k=K[p], c=fb[p], front=c!==bg[p];
    if(PT&&!front){ fb[p]=paintedLight(c,k,P[p*3],P[p*3+1],P[p*3+2],pAmb,pCool,bulb,B,bz,sun,S,night,NL); continue; }
    if(k===4&&!front) continue;                                                             // the sky behind the bars stays as it is
    let r=AR, g=AG, b=AB;
    const i=P[p*3], j=P[p*3+1], z=P[p*3+2]*ZS;
    if(bulb>0){
      let e;
      if(k){ const dx=B.i-i, dy=B.j-j, dz=bz-z, d2=dx*dx+dy*dy+dz*dz, d=Math.sqrt(d2);
        const lam=front?0.85:Math.max(0.12,k===1?dz/d:k===2?dx/d:dy/d); e=bulb*lam/(1+fall*d2); }
      else e=front?bulb*0.3:0;
      r+=e; g+=e*gR; b+=e*gB;
    }
    if(k&&L.day>0){ const dw=Math.hypot(i-wi,j)+0.1; const e=L.day*0.3/(1+0.12*dw*dw); r+=e*0.95; g+=e; b+=e*1.04; }   // daylight fill, strongest by the window
    if(sun>0&&!front&&(k===1||k===2)&&winOpen((i-S.lx*j)*6,P[p*3+2]+S.lz*j)){ r+=sun; g+=sun*0.9; b+=sun*0.7; }   // the barred patch of sun
    if(night>0&&k){ const dx=NL.i-i, dy=NL.j-j, dz=(NL.z-P[p*3+2])*ZS, e=night/(1+0.22*(dx*dx+dy*dy+dz*dz)); r+=e*0.45; g+=e*0.6; b+=e*0.62; }   /* the Ward at night: only the cold of the slot */
    const R=Math.min(255,(c&255)*r)|0, G=Math.min(255,((c>>8)&255)*g)|0, Bl=Math.min(255,((c>>16)&255)*b)|0;
    fb[p]=(0xff000000|(Bl<<16)|(G<<8)|R)>>>0;
  }
}

/** Light on a pixel of the painted Ward: dimmed by the hour (cooler in the dark), warmed near the tallow flame (the
 * painted glow round it fades while it is out), the barred patch of sun, the cold of the slot at night.
 * @param {number} c @param {number} k @param {number} i @param {number} j @param {number} z @param {number} amb
 * @param {number} cool @param {number} bulb @param {{i:number,j:number}} B @param {number} bz @param {number} sun
 * @param {{lx:number,lz:number}} S @param {number} night @param {{i:number,j:number,z:number}} NL */
function paintedLight(c,k,i,j,z,amb,cool,bulb,B,bz,sun,S,night,NL){
  let r=amb*(1-0.1*cool), g=amb, b=amb*(1+0.14*cool);
  if(k){
    const dx=B.i-i, dy=B.j-j, dz=bz-z*ZS, d2=dx*dx+dy*dy+dz*dz;
    if(bulb>0){ const e=bulb*0.42/(1+0.11*d2); r+=e; g+=e*0.72; b+=e*0.42; }
    else { const e=1-0.5*Math.exp(-d2/5); r*=e; g*=e; b*=e; }
    if(k>=3&&i*6>WIN.u0&&i*6<WIN.u1&&z>WIN.z0&&z<WIN.z1){ const e=0.6*(1-amb)*(1-cool); r+=e*0.9; g+=e; b+=e*1.05; }   // the slot itself: daylight behind the bars
    if(sun>0&&(k===1||k===2)&&winOpen((i-S.lx*j)*6,z+S.lz*j)){ r+=sun*0.6; g+=sun*0.54; b+=sun*0.42; }
    if(night>0){ const ex=NL.i-i, ey=NL.j-j, ez=(NL.z-z)*ZS, e=night*0.7/(1+0.22*(ex*ex+ey*ey+ez*ez)); r+=e*0.45; g+=e*0.6; b+=e*0.62; }
  }
  const R=Math.min(255,(c&255)*r)|0, G=Math.min(255,((c>>8)&255)*g)|0, Bl=Math.min(255,((c>>16)&255)*b)|0;
  return (0xff000000|(Bl<<16)|(G<<8)|R)>>>0;
}

/** Add light around a pixel: brighten towards white with a soft falloff.
 * @param {number} cx @param {number} cy @param {number} rad @param {number} k @param {number[]} tint */
function glow(cx,cy,rad,k,tint){
  const fb=rendererState.FB_MAIN, W=appearanceState.W, H=appearanceState.H;
  for(let y=Math.max(0,Math.floor(cy-rad));y<=Math.min(H-1,Math.ceil(cy+rad));y++) for(let x=Math.max(0,Math.floor(cx-rad));x<=Math.min(W-1,Math.ceil(cx+rad));x++){
    const d=Math.hypot(x-cx,(y-cy)*1.3)/rad; if(d>=1) continue;
    const a=k*(1-d)*(1-d), p=y*W+x, c=fb[p];
    const R=(c&255)+(255-(c&255))*a*tint[0], G=((c>>8)&255)+(255-((c>>8)&255))*a*tint[1], B=((c>>16)&255)+(255-((c>>16)&255))*a*tint[2];
    fb[p]=(0xff000000|((B|0)<<16)|((G|0)<<8)|(R|0))>>>0;
  }
}

/** Draw the Ward's tallow lamp after the lighting pass. */
export function drawCellLights(){ drawLamp(); }

/** The tallow lamp on its iron bracket by the door: a squat iron cup, the flame (lit or a smouldering wick), its halo and smoke. */
function drawLamp(){
  const t=boxingState.tick, K=gymState.ISO_K, lit=state.bulb>0.3, bi=LAMP.i, bj=LAMP.j, bz=LAMP.z;
  if(wardPainted()){ paintedFlame(t,lit,Math.round(isoX(bi,bj)),Math.round(isoY(bi,bj,bz))); return; }
  isoLine(0.02,bj,bz-1.6,bi,bj,bz-0.4,state.C_SOCKET); isoLine(0.02,bj,bz-0.6,bi,bj,bz-0.4,state.C_SOCKET);   // the bracket
  const x=Math.round(isoX(bi,bj)), y=Math.round(isoY(bi,bj,bz));
  for(let dx=-2*K;dx<=2*K;dx++){ pset(x+dx,y,state.C_CUP); pset(x+dx,y+1,state.C_SOCKET); } for(let dx=-K;dx<=K;dx++) pset(x+dx,y+2,state.C_SOCKET);
  if(lit){ const fl=(h2(t>>2,3)%3)-1, hgt=2*K+((h2(t>>2,7)&1)?1:0);
    for(let k=0;k<hgt;k++){ const sx=Math.round(fl*k/hgt); pset(x+sx,y-1-k,k<1?state.C_FLAME3:state.C_FLAME2); if(k<hgt-1) pset(x+sx+(k&1?1:-1),y-1-k,state.C_FLAME1); }
    glow(x,y-2*K,16*K,0.4*state.bulb,[1,0.62,0.28]);
    for(let k=0;k<6;k++){ const f=((t*0.012+k/6)%1), sx=x+Math.sin(t*0.05+k*1.3)*f*5*K, sy=y-hgt-f*18*K; if(f<0.9) pset(Math.round(sx),Math.round(sy),state.C_SMOKE); } }   // the greasy smoke
  else pset(x,y-1,(t>>4)&1?state.C_FLAME1:state.C_SOCKET);                                 // a smouldering wick
}

/** The painted lamp: a live flame over the painted one, a faint halo and greasy smoke; out, a dark wick.
 * @param {number} t @param {boolean} lit @param {number} x @param {number} y the cup under the flame */
function paintedFlame(t,lit,x,y){
  if(!lit){ for(let dy=-5;dy<=0;dy++) for(let dx=-1;dx<=1;dx++) pset(x+dx,y+dy,dx||dy<-3?state.C_SMOKE:state.C_CUP); if((t>>4)&1) pset(x,y-1,state.C_FLAME1); return; }
  const fl=(h2(t>>2,3)%3)-1, hgt=3+((h2(t>>2,7)&1)?1:0);
  for(let k=0;k<hgt;k++){ const sx=Math.round(fl*k/hgt); pset(x+sx,y-1-k,k<2?state.C_FLAME3:state.C_FLAME2); if(k>0&&k<hgt-1) pset(x+sx+(k&1?1:-1),y-1-k,state.C_FLAME1); }
  glow(x,y-3,14,0.16*state.bulb,[1,0.62,0.28]);
  for(let k=0;k<6;k++){ const f=((t*0.012+k/6)%1), sx=x+Math.sin(t*0.05+k*1.3)*f*8, sy=y-hgt-f*30; if(f<0.9) pset(Math.round(sx),Math.round(sy),state.C_SMOKE); }
}

export function initialize(){
  state.C_FLAME1=rgb('#c8501e'); state.C_FLAME2=rgb('#ffb04a'); state.C_FLAME3=rgb('#fff0b0'); state.C_CUP=rgb('#4a4640'); state.C_SMOKE=rgb('#3a3632');
  state.kind=new Uint8Array(appearanceState.W*appearanceState.H);
  state.pos=new Float32Array(appearanceState.W*appearanceState.H*3);
  state.cw=10; state.ch=9; state.bulb=0; state.sun=0; state.ray={lx:0,lz:5,k:0};
  state.C_SOCKET=rgb('#3a3630');
}

````

---

## `src/weather.js`

````js
/* Weather: a sky for every day — sun, clouds or rain, the same for the same day, sometimes turning after midday —
   the light it leaves on the yard, the rain falling over it, and the colours of the sky the windows show. */

import { state as progressionState } from './progression.js';
import { state as appearanceState, rgb } from './appearance.js';
import { state as rendererState } from './renderer.js';
import { state as boxingState, h2 } from './boxing.js';

// Runtime values owned by weather; initialized explicitly by main.js.
export const state = {};

/** Polish words for the HUD. */
export const WEATHER_PL = {sun:'słonecznie',cloud:'pochmurno',rain:'deszcz'};

/** The weather on a day at a minute: about 45% sun, 33% clouds, 22% rain; on a third of the days it turns at 13:00.
 * @param {number} day @param {number} min @returns {'sun'|'cloud'|'rain'} */
export function weatherAt(day,min){
  const pick=(/** @type {number} */ n)=>n<115?'sun':n<200?'cloud':'rain';
  return min>=13*60&&h2(day,17)<85?pick(h2(day*7+5,13)):pick(h2(day*7+3,11));
}

/** The weather right now. */
export function weatherNow(){ const s=progressionState.save.sim; return weatherAt(s.day|0,s.min); }

/** Sky colours [top, horizon] for a sky bucket under this weather (clear skies come from the caller). @param {number} bucket @param {string[]} clear */
export function skyColors(bucket,clear){
  const w=weatherNow(); if(w==='sun') return clear;
  if(bucket===0) return w==='rain'?['#0a0c12','#12161e']:['#0e1018','#1a1e2a'];          // night under cloud: no stars, a little glow
  if(bucket===2) return w==='rain'?['#6c747c','#868e96']:['#a4aeb8','#c2cad2'];
  return w==='rain'?['#4e5058','#6a6c74']:['#8a8a98','#a8a4ac'];                          // dawn and dusk greyed out
}

/** Light of the open yard over the finished frame: the sun warms it, clouds flatten and cool it, rain darkens it. */
export function weatherLight(){
  const w=weatherNow(), fb=rendererState.FB_MAIN, N=appearanceState.W*appearanceState.H;
  const [kr,kg,kb,ds]=w==='sun'?[1.05,1.02,0.95,0]:w==='cloud'?[0.9,0.92,0.97,0.28]:[0.74,0.78,0.86,0.4];
  for(let p=0;p<N;p++){ const c=fb[p]; let r=c&255, g=(c>>8)&255, b=(c>>16)&255; const l=r*0.3+g*0.59+b*0.11;
    r=Math.min(255,(r+(l-r)*ds)*kr); g=Math.min(255,(g+(l-g)*ds)*kg); b=Math.min(255,(b+(l-b)*ds)*kb);
    fb[p]=(0xff000000|((b|0)<<16)|((g|0)<<8)|(r|0))>>>0; }
}

/** Blend a picture pixel towards a colour. @param {number} x @param {number} y @param {number} c @param {number} a */
function mix(x,y,c,a){
  const W=appearanceState.W; if(x<0||y<0||x>=W||y>=appearanceState.H) return; const p=y*W+x, o=rendererState.FB_MAIN[p];
  const r=(o&255)+((c&255)-(o&255))*a, g=((o>>8)&255)+(((c>>8)&255)-((o>>8)&255))*a, b=((o>>16)&255)+(((c>>16)&255)-((o>>16)&255))*a;
  rendererState.FB_MAIN[p]=(0xff000000|((b|0)<<16)|((g|0)<<8)|(r|0))>>>0;
}

/** Rain over the yard: slanting streaks falling through the picture and small splashes on the ground. */
export function drawRain(){
  if(weatherNow()!=='rain') return;
  const t=boxingState.tick, K=rendererState.uiK, W=appearanceState.W, H=appearanceState.H, len=3*K;
  for(let k=0;k<150;k++){ const sp=(2.2+h2(k,7)/255*1.2)*K, y=Math.floor((h2(k,5)/255*H+t*sp)%(H+len))-len, x=Math.floor(((h2(k,3)/255*W*1.3-y*0.28)%W+W)%W);
    for(let d=0;d<len;d++) mix(x-Math.round(d*0.28),y+d,state.DROP,0.38+0.12*(d/len)); }
  for(let k=0;k<26;k++){ const ph=(t+k*17)%28; if(ph>5) continue; const x=Math.floor(h2(k,t/28|0)/255*W), y=Math.floor(H*0.35+h2(k+40,t/28|0)/255*H*0.6);   // splashes
    mix(x,y,state.DROP,0.5); if(ph<3){ mix(x-K,y,state.DROP,0.35); mix(x+K,y,state.DROP,0.35); } }
}

/** Raindrops on window glass (the cell's barred window): streaks and beads, lighter than the sky behind. @param {number} u @param {number} z */
export function glassDrop(u,z){ return weatherNow()==='rain'&&(h2(Math.floor(u*2.5),Math.floor(z*0.9+h2(Math.floor(u*2.5),3)/40))<46); }

export function initialize(){
  state.DROP=rgb('#c6d0dc');
}

````

---

## `src/npcs.js`

````js
import { wardBed, wardBlanket, wardFlies, WARD_SEATS, WARD_EX, WARD_WASH } from './ward.js';
import { exerciseLayout, buildExerciseYard, ringPos, RING_C, WALK_R, WALK_SP } from './exercise-yard.js';
import { figureHD, state as gymState, itemW, itemH, isoLine, quad, ipAdd, bodyPt, itemRect } from './gym.js';
import { rgb, state as appearanceState, setRamp } from './appearance.js';
import { state as roomsState, floorAt, drawCellItem } from './rooms.js';
import { pset, taper, shadowEll, state as rendererState } from './renderer.js';
import { state as progressionState } from './progression.js';
import { h2 } from './boxing.js';
import { LOOK } from './data.js';

// Runtime values owned by npcs; initialized explicitly by main.js.
export const state = {};

function crewRamps(rb,c){ setRamp(rb,c.sk,false); setRamp(rb+1,c.sk,true); setRamp(rb+2,c.tr,false); setRamp(rb+3,c.tr,true); setRamp(rb+4,c.tt,false); setRamp(rb+5,c.tt,true);
  setRamp(rb+6,c.top,false); setRamp(rb+7,c.top,true); setRamp(rb+8,c.gl,false); setRamp(rb+9,c.hair,false); } function npcFace(C,di,dj,k){ const l=Math.hypot(di,dj); if(l<1e-4) return; di/=l; dj/=l; C.fi+=(di-C.fi)*k; C.fj+=(dj-C.fj)*k; const m=Math.hypot(C.fi,C.fj)||1; C.fi/=m; C.fj/=m; }

function crewArm(C,s,near,sh,el,hd,glove){
  const rb=C.rb, SK=near?rb:rb+1, TP=near?rb+6:rb+7;
  ipAdd(sh[0],sh[1],sh[2],1.15, el[0],el[1],el[2],1.0, TP);
  ipAdd(el[0],el[1],el[2],1.0, hd[0],hd[1],hd[2],0.9, C.sleeves?TP:SK);
  if(glove) ipAdd(hd[0],hd[1],hd[2],1.4, hd[0]+0.1,hd[1],hd[2],1.4, rb+8);
  else if(C.wraps) ipAdd(hd[0],hd[1],hd[2],1.05, hd[0]+0.05,hd[1],hd[2],1.05, rb+8);
  else ipAdd(hd[0],hd[1],hd[2],0.95, hd[0]+0.05,hd[1],hd[2],0.95, SK);
} function crewGuardArm(C,s,bob,lean,sl){
  let el=[1.0+lean,s*2.6+sl,10.9+bob], hd=[2.3+lean,s*1.25+sl,14.0+bob];
  if(C.pk&&C.pk!=='slip'&&C.pside===s){ const e=Math.sin(Math.PI*Math.min(1,C.pt/state.PUNCH_T[C.pk])), P={jab:[[3.4,s*1.4,13.0],[6.3,s*0.5,13.6]],cross:[[3.4,s*1.4,13.0],[6.3,s*0.4,13.6]],hook:[[2.6,s*3.1,13.3],[4.4,-s*0.2,13.6]],upper:[[2.2,s*2.0,10.4],[3.8,s*0.8,15.2]]}[C.pk];
    el=state.lerp3(el,[P[0][0]+lean,P[0][1]+sl,P[0][2]+bob],e); hd=state.lerp3(hd,[P[1][0]+lean,P[1][1]+sl,P[1][2]+bob],e); }
  return [el,hd];
}

export function drawIsoNPC(C){
  if(C.act==='pushup'){ drawCrewPushup(C); return; }
  gymState.ipC=C; gymState.ipN=0; gymState.ipPose=0; gymState.ipBase=0;
  const rb=C.rb, act=C.act, mv=C.moving, ph=C.ph, t=C.t;
  const sideD=(-C.fj+C.fi), nearS=sideD>=0?1:-1;
  const stance=act==='guard'||act==='bag';
  let bob=0, lean=0, sl=0, jump=0;
  if(stance){ bob=-0.4+0.35*Math.sin(t*0.11); if(C.pk&&C.pk!=='slip'){ const e=Math.sin(Math.PI*Math.min(1,C.pt/state.PUNCH_T[C.pk])); lean=0.5*e; if(C.pk==='upper') bob-=0.6*e; }
    if(C.pk==='slip'){ const e=Math.sin(Math.PI*Math.min(1,C.pt/state.PUNCH_T.slip)); sl=1.3*C.slip*e; bob-=1.1*e; } }
  else if(act==='rest') bob=0.3*Math.sin(t*0.13);
  else if(act==='scrub') bob=0.15*Math.sin(t*0.3);
  else if(mv) bob=Math.abs(Math.sin(ph))*0.6;
  const dr=C.hood&&gymState.hubRoom==='yard'&&mv;   /* the yard: the damned drag their feet, stooped, arms hanging */
  if(dr){ lean=0.9; bob*=0.4; }
  const HD=gymState.ISO_K>1&&(C.pants||C.bath), jt={};   // cell inmates in the 2× room: the modelled figure
  for(let s=-1;s<=1;s+=2){
    const near=s===nearS, SK=near?rb:rb+1, TRk=near?rb+2:rb+3, TT=near?rb+4:rb+5;
    let hip=[0,s*1.2,7.2+bob+jump], knee, foot;
    if(stance){ const lead=s===1, sh=mv?0.45*Math.sin(ph+(lead?0:Math.PI)):0, ff=(lead?1.5:-1.3)+sh;
      hip=[0,s*1.25,6.9+bob]; knee=[ff*0.55+0.5,s*1.55,3.6]; foot=[ff,s*1.7,0.9+(mv?Math.max(0,Math.cos(ph+(lead?0:Math.PI)))*0.5:0)]; }
    else { const sw=mv?Math.sin(ph+(s<0?0:Math.PI)):0, lift=mv?Math.max(0,Math.cos(ph+(s<0?0:Math.PI)))*(dr?0.35:1.3):0, fF=(dr?0.95:2.2)*sw;
      knee=[fF*0.5+0.7,s*1.3,3.8+lift*0.6]; foot=[fF,s*1.4,0.9+lift]; }
    if(HD) jt[s]={hip,knee,foot};
    else if(C.pants){ ipAdd(hip[0],hip[1],hip[2],1.45, knee[0],knee[1],knee[2],1.2, TRk); ipAdd(knee[0],knee[1],knee[2],1.15, foot[0],foot[1],foot[2],1.05, TRk); }   // long trousers (cell inmates)
    else { ipAdd(hip[0],hip[1],hip[2],1.4, knee[0],knee[1],knee[2],1.1, SK,TRk,0.45,0.58,TT);
    ipAdd(knee[0],knee[1],knee[2],1.1, foot[0],foot[1],foot[2],1.0, SK); }
    if(!HD) ipAdd(foot[0]-0.2,foot[1],foot[2]-0.1,1.25, foot[0]+0.9,foot[1],foot[2]-0.3,1.1, appearanceState.R_NPCB);
    // arms
    const sh=[0.1+lean,s*2.7+sl,12.4+bob+jump]; let el, hd;
    if(stance){ [el,hd]=crewGuardArm(C,s,bob,lean,sl); }
    else if(act==='behind'){ el=[-0.8,s*2.7,10.1]; hd=[-1.4,s*0.9,8.7]; }                                                   /* hands clasped behind the back */                                                      // arms folded
    else if(act==='rest'){ el=[-0.5,s*4.3,10.2+bob]; hd=[0.3,s*2.9,8.0+bob]; }
    else if(act==='scrub'){ const w=Math.sin(t*0.3+(s>0?0:1.7)); el=[0.9,s*3.1,14.3+bob]; hd=[0.7+0.25*w,s*1.5,17.0+0.35*w+bob]; }   // under the shower: scrubbing the head
    else if(act==='loose'){ const j=Math.sin(t*0.5+(s>0?0:2))*0.35; el=[0.1,s*3.4,9.9]; hd=[0.8+j,s*3.6,8.0+Math.abs(j)]; }
    else if(dr){ const aw=-Math.sin(ph+(s<0?0:Math.PI)); el=[0.7,s*3.0,9.5+bob]; hd=[1.0+0.15*aw,s*3.0,7.0+bob]; }   /* arms hanging, a faint sway */
    else { const aw=mv?-Math.sin(ph+(s<0?0:Math.PI)):0; el=[-0.2+0.55*aw,s*3.5,9.9+bob]; hd=[0.6+1.1*aw+(aw>0?0.5*aw:0),s*3.7,8.0+bob+0.5*Math.max(0,aw)]; }
    if(HD){ Object.assign(jt[s],{sh,el,hd}); continue; }
    crewArm(C,s,near,sh,el,hd,C.gloves);
  }
  if(HD){ const J=(/** @type {number} */ s)=>jt[s]; J.pel=[0,sl,6.6+bob+jump]; J.chest=[0.4+lean,sl,12.2+bob+jump]; J.head=[0.35+lean*1.2+(dr?0.5:0),sl*1.25,15.6+bob+jump-(dr?1.1:0)];   /* stooped: the head hangs forward */
    figureHD(C,J,cnLookHD(C)); return; }
  ipAdd(0,0,6.6+bob+jump,2.1, 0.4+lean,sl,12.2+bob+jump,2.8, rb+6,rb+2,0.34,0.44,rb+4);
  const hz=15.6+bob+jump, hf=0.35+lean*1.2, hs=sl*1.25;
  ipAdd(hf,hs,hz,2.45, hf,hs,hz,2.45, rb);
  ipAdd(hf-0.5,hs,hz+0.9,2.2, hf-0.5,hs,hz+0.9,2.2, rb+9);
  for(let k=0;k<gymState.ipN;k++) gymState.ipOrd[k]=k;
  for(let a=1;a<gymState.ipN;a++){ const v=gymState.ipOrd[a]; let b=a-1; while(b>=0&&gymState.ipD[gymState.ipOrd[b]]>gymState.ipD[v]){ gymState.ipOrd[b+1]=gymState.ipOrd[b]; b--; } gymState.ipOrd[b+1]=v; }
  bodyPt(0,0,0); shadowEll(Math.round(gymState.bpX),Math.round(gymState.bpY),4,1);
  for(let p=0;p<2;p++) for(let a=0;a<gymState.ipN;a++){ const k=gymState.ipOrd[a];
    taper(Math.round(gymState.ipX0[k]),Math.round(gymState.ipY0[k]),gymState.ipR0[k],Math.round(gymState.ipX1[k]),Math.round(gymState.ipY1[k]),gymState.ipR1[k],p,gymState.ipRp[k],gymState.ipRp2[k],gymState.ipZ1[k],gymState.ipZ2[k],gymState.ipRp3[k]); }
  bodyPt(hf,hs,hz); const hd0=gymState.bpD;
  for(let s=-1;s<=1;s+=2){ bodyPt(hf+1.85,hs+s*0.9,hz+0.3); if(gymState.bpD>hd0+0.02) pset(Math.round(gymState.bpX),Math.round(gymState.bpY),appearanceState.C_OUT); }
  gymState.ipC=gymState.hubP;
} function drawCrewPushup(C){
  gymState.ipC=C; gymState.ipN=0; gymState.ipPose=0; gymState.ipBase=0;
  const rb=C.rb, up=C.up, Zs=2.4+3.3*up, zf=f=>0.8+(f+6.4)/8.8*(Zs-0.8);
  const sideD=(-C.fj+C.fi), nearS=sideD>=0?1:-1;
  for(let s=-1;s<=1;s+=2){
    const near=s===nearS, SK=near?rb:rb+1, TRk=near?rb+2:rb+3, TT=near?rb+4:rb+5;
    if(C.pants){ ipAdd(-2.0,s*1.1,zf(-2.0),1.4, -4.2,s*0.95,zf(-4.2),1.15, TRk); ipAdd(-4.2,s*0.95,zf(-4.2),1.1, -6.3,s*0.85,0.95,1.0, TRk); }
    else { ipAdd(-2.0,s*1.1,zf(-2.0),1.35, -4.2,s*0.95,zf(-4.2),1.1, SK,TRk,0.45,0.58,TT);
    ipAdd(-4.2,s*0.95,zf(-4.2),1.05, -6.3,s*0.85,0.95,0.95, SK); }
    ipAdd(-6.6,s*0.85,0.55,1.1, -6.2,s*0.85,1.5,1.05, appearanceState.R_NPCB);
    const sh=[2.3,s*2.6,Zs], el=[2.0,s*(3.3+0.9*(1-up)),0.6+(Zs-0.6)*0.5+0.4], hd=[2.7,s*3.0,0.7];
    crewArm(C,s,near,sh,el,hd,false);
  }
  ipAdd(-2.0,0,zf(-2.0),2.0, 2.0,0,zf(2.0),2.5, rb+6,rb+2,0.3,0.38,rb+4);
  ipAdd(4.0,0,Zs+0.5,2.3, 4.0,0,Zs+0.5,2.3, rb);
  ipAdd(3.5,0,Zs+1.3,2.1, 3.5,0,Zs+1.3,2.1, rb+9);
  for(let k=0;k<gymState.ipN;k++) gymState.ipOrd[k]=k;
  for(let a=1;a<gymState.ipN;a++){ const v=gymState.ipOrd[a]; let b=a-1; while(b>=0&&gymState.ipD[gymState.ipOrd[b]]>gymState.ipD[v]){ gymState.ipOrd[b+1]=gymState.ipOrd[b]; b--; } gymState.ipOrd[b+1]=v; }
  bodyPt(-1.2,0,0); shadowEll(Math.round(gymState.bpX),Math.round(gymState.bpY),6,1);
  for(let p=0;p<2;p++) for(let a=0;a<gymState.ipN;a++){ const k=gymState.ipOrd[a];
    taper(Math.round(gymState.ipX0[k]),Math.round(gymState.ipY0[k]),gymState.ipR0[k],Math.round(gymState.ipX1[k]),Math.round(gymState.ipY1[k]),gymState.ipR1[k],p,gymState.ipRp[k],gymState.ipRp2[k],gymState.ipZ1[k],gymState.ipZ2[k],gymState.ipRp3[k]); }
  gymState.ipC=gymState.hubP;
}

export function crewRect(C){      // footprint used by the depth sort
  if(C.act==='pushup'){ const a0=-0.9, a1=0.6;
    if(Math.abs(C.fi)>0.5){ const x0=C.i+Math.min(a0*C.fi,a1*C.fi), x1=C.i+Math.max(a0*C.fi,a1*C.fi); return [x0,C.j-0.3,x1,C.j+0.3]; }
    const y0=C.j+Math.min(a0*C.fj,a1*C.fj), y1=C.j+Math.max(a0*C.fj,a1*C.fj); return [C.i-0.3,y0,C.i+0.3,y1]; }
  return [C.i-0.2,C.j-0.2,C.i+0.2,C.j+0.2];
}

export function yardLayout(){ return exerciseLayout(); }   /* Newgate: the exercise yard */
export function buildYard(){ rendererState.fb=gymState.bgHub; buildExerciseYard(drawCellItem); rendererState.fb=rendererState.FB_MAIN; }

function cnBedOf(C){                   // where he lies (centre, facing = head), the mattress height and the spot next to the bunk
  if(gymState.hubRoom==='cell') return wardBed(C.bed);   /* the Ward: a place on the guard-bed */
  const it=gymState.cellList.find(x=>x.t===C.bed.t); if(!it) return null;
  const up=C.bed.lv===1, base=up?15.5:6.5;
  const fr=up?0:0.3;                   // lower bunk: lie nearer the front edge, else the upper frame hides him completely
  if(C.bed.t==='bunk') return {it,at:[it.i+itemW(it)/2+fr,it.j+1.55],face:[0,-1],base,app:[2.1,1.9]};
  return {it,at:[it.i+1.55,it.j+itemH(it)/2+fr],face:[-1,0],base,app:up?[6.1,2.15]:[7.2,2.15]};
}

export function cnNight(){ const h=progressionState.save.sim.min/60; return h<6||h>=22; } function cnBlk(i,j){
  if(i<0.35||j<0.35||i>roomsState.CELL_W-0.35||j>roomsState.CELL_H-0.35) return true;
  for(const it of gymState.cellList){ if(!gymState.GYM_TYPES[it.t].block) continue; const r=itemRect(it); if(i>r[0]-0.2&&i<r[2]+0.2&&j>r[1]-0.2&&j<r[3]+0.2) return true; }
  return false; } function cnGridBuild(){ state.cnGW=Math.ceil(roomsState.CELL_W/state.CN_G); state.cnGH=Math.ceil(roomsState.CELL_H/state.CN_G); state.cnGrid=new Uint8Array(state.cnGW*state.cnGH); state.cnPrev=new Int32Array(state.cnGW*state.cnGH);
  for(let b=0;b<state.cnGH;b++) for(let a=0;a<state.cnGW;a++) state.cnGrid[b*state.cnGW+a]=cnBlk((a+0.5)*state.CN_G,(b+0.5)*state.CN_G)?1:0; } function cnLOS(i0,j0,i1,j1){ const d=Math.hypot(i1-i0,j1-j0), n=Math.max(1,Math.ceil(d/0.1)); for(let k=1;k<n;k++){ const t=k/n; if(cnBlk(i0+(i1-i0)*t,j0+(j1-j0)*t)) return false; } return true; } function cnNode(i,j){ let best=-1, bd=1e9; for(let b=0;b<state.cnGH;b++) for(let a=0;a<state.cnGW;a++) if(!state.cnGrid[b*state.cnGW+a]){ const d=Math.hypot((a+0.5)*state.CN_G-i,(b+0.5)*state.CN_G-j); if(d<bd){ bd=d; best=b*state.cnGW+a; } } return best; } function cnPath(C,gi,gj){
  if(!state.cnGrid) cnGridBuild();
  if(cnLOS(C.i,C.j,gi,gj)) return [[gi,gj]];
  const s=cnNode(C.i,C.j), g=cnNode(gi,gj); if(s<0||g<0) return [[gi,gj]];
  state.cnPrev.fill(-1); state.cnPrev[s]=s; const q=[s]; let h=0;
  while(h<q.length){ const c=q[h++]; if(c===g) break; const a=c%state.cnGW, b=(c/state.cnGW)|0;
    for(const d of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){ const na=a+d[0], nb=b+d[1]; if(na<0||nb<0||na>=state.cnGW||nb>=state.cnGH) continue; const n=nb*state.cnGW+na;
      if(state.cnGrid[n]||state.cnPrev[n]>=0) continue; if(d[0]&&d[1]&&(state.cnGrid[b*state.cnGW+na]||state.cnGrid[nb*state.cnGW+a])) continue; state.cnPrev[n]=c; q.push(n); } }
  if(state.cnPrev[g]<0) return [[gi,gj]];
  const pts=[]; for(let c=g;c!==s;c=state.cnPrev[c]) pts.push([(c%state.cnGW+0.5)*state.CN_G,((c/state.cnGW|0)+0.5)*state.CN_G]); pts.reverse(); pts.push([gi,gj]);
  const out=[]; let ci=C.i, cj=C.j, k=0;
  while(k<pts.length){ let far=k; while(far+1<pts.length&&cnLOS(ci,cj,pts[far+1][0],pts[far+1][1])) far++; out.push(pts[far]); ci=pts[far][0]; cj=pts[far][1]; k=far+1; }
  return out;
} function cnWalk(C,gi,gj,sp){          // one step; true = arrived. Waits for the player standing in the way, then squeezes past.
  if(!C.path){ C.path=cnPath(C,gi,gj); C.pk=0; }
  const p=C.path[C.pk]; let di=p[0]-C.i, dj=p[1]-C.j; const d=Math.hypot(di,dj);
  if(d<=sp){ C.i=p[0]; C.j=p[1]; if(++C.pk>=C.path.length){ C.path=null; return true; } return false; }
  di/=d; dj/=d;
  const ni=C.i+di*sp, nj=C.j+dj*sp, pd=Math.hypot(ni-gymState.hubP.i,nj-gymState.hubP.j);
  if(C.pass>0) C.pass--;
  else if(pd<0.5&&pd<Math.hypot(C.i-gymState.hubP.i,C.j-gymState.hubP.j)){ if(++C.wait<100){ npcFace(C,di,dj,0.2); return false; } C.pass=80; }
  C.wait=0; C.i=ni; C.j=nj; npcFace(C,di,dj,0.22); C.moving=true; C.ph+=0.2;
  return false;
} // ---- routine ----
function cnFree(C,key){ return !state.CN.some(o=>o!==C&&o.res===key); } function cnPlan(C){
  const P=C.plan, R=Math.random;
  if(cnNight()){ const B=cnBedOf(C); if(B){ C.res='bed'; P.push({k:'go',i:B.app[0],j:B.app[1]},{k:'sleep',night:true,d:999999}); return; } }
  for(let n=0;n<8;n++){
    const r=R();
    if(r<0.3){ const S=WARD_SEATS.map((s,k)=>[s,k]).filter(e=>cnFree(C,'stool'+e[1])); if(!S.length) continue; const e=S[R()*S.length|0];
      C.res='stool'+e[1]; P.push({k:'go',i:e[0].a[0],j:e[0].a[1]},{k:'sit',s:e[0],d:900+(R()*1100|0)}); return; }
    if(r<0.62){ const E=WARD_EX.map((s,k)=>[s,k]).filter(e=>cnFree(C,'ex'+e[1])); if(!E.length) continue; const e=E[R()*E.length|0], kind=R()<0.4?'squat':(R()<0.6?'pushup':'idle');
      C.res='ex'+e[1]; P.push({k:'go',i:e[0].p[0],j:e[0].p[1]},{k:kind,f:e[0].f,d:kind==='idle'?300+(R()*400|0):650+(R()*400|0)}); return; }
    if(r<0.76){ if(!cnFree(C,'sink')) continue; C.res='sink'; P.push({k:'go',i:WARD_WASH.p[0],j:WARD_WASH.p[1]},{k:'wash',f:WARD_WASH.f,d:320+(R()*300|0)}); return; }
    if(r<0.9){ const B=cnBedOf(C); if(!B) continue; C.res='bed'; P.push({k:'go',i:B.app[0],j:B.app[1]},{k:'sleep',d:900+(R()*900|0)}); return; }
  }
  const e=WARD_EX[R()*WARD_EX.length|0]; C.res=''; P.push({k:'go',i:e.p[0]+R()*0.4-0.2,j:e.p[1]+R()*0.4-0.2},{k:'idle',f:[R()-0.5,R()-0.5],d:300});
} function cnLeave(C){                   // got up from a stool / bunk: stand next to it
  const S=C.step; C.after=null;
  if(S&&S.k==='sit'){ C.i=S.s.a[0]; C.j=S.s.a[1]; }
  if(S&&S.k==='sleep'){ const B=cnBedOf(C); if(B){ C.i=B.app[0]; C.j=B.app[1]; } }
} function cnStepTick(C){
  const S=C.step;
  if(S.k==='go'){ C.act='walk'; if(cnWalk(C,S.i,S.j,0.022)){ C.step=null; } return; }
  if(S.f) npcFace(C,S.f[0],S.f[1],0.2);
  switch(S.k){
    case 'sit': C.act='sit'; C.i=S.s.c[0]; C.j=S.s.c[1]; C.fi=S.s.f[0]; C.fj=S.s.f[1];
      C.after=gymState.cellList.find(x=>(x.t==='bunk'||x.t==='bunk2')&&S.s.c[0]>=x.i&&S.s.c[0]<x.i+itemW(x)&&S.s.c[1]<x.j+itemH(x))||null; break;   /* sitting on the edge of the guard-bed */
    case 'sleep': { const B=cnBedOf(C); if(!B){ C.step=null; return; } C.act='lie'; C.i=B.at[0]; C.j=B.at[1]; C.fi=B.face[0]; C.fj=B.face[1]; C.after=B.it;
      if(S.night&&!cnNight()&&C.t>200) S.d=0; break; }
    case 'squat': C.act='squat'; break;
    case 'pushup': C.act='pushup'; { const T=70, k=C.t%T; C.up=0.5+0.5*Math.cos(2*Math.PI*k/T); } break;
    case 'wash': C.act='wash'; break;
    default: C.act=(S.rest=S.rest===undefined?Math.random()<0.5:S.rest)?'rest':'idle';
  }
  if(C.t>=S.d){ cnLeave(C); C.up=1; C.step=null; C.res=''; }
  else if(!S.night&&S.k!=='sleep'&&cnNight()&&C.t>60){ cnLeave(C); C.step=null; C.plan=[]; C.res=''; }   // lights out: go to bed
}

export function cnTick(){
  profTick(); stinkTick();
  for(const C of state.CN){
    if(C.away) continue;
    C.t++; C.moving=false;
    if(!C.step){ if(!C.plan.length) cnPlan(C); C.step=C.plan.shift(); C.t=0; C.path=null; C.pk=0; C.wait=0; }
    cnStepTick(C);
  }
}

export function cnEnter(){                    // entering the cell: everybody is already somewhere doing something (no parade from the door)
  if(!state.cnGrid) cnGridBuild();
  profTick(); stinkTick();
  const used=[];
  for(const C of state.CN){
    C.step=null; C.plan=[]; C.after=null; C.path=null; C.res=''; C.act='idle'; C.up=1;
    C.away=progressionState.save.phase==='prison'&&C.name==='Zeke';   // in prison his bunk is Profesor's; he sits in another cell
    if(C.away) continue;
    cnPlan(C);
    while(C.plan.length&&C.plan[0].k==='go'){ const g=C.plan.shift(); C.i=g.i; C.j=g.j; }
    C.step=C.plan.shift()||null; C.t=C.step?Math.floor(Math.random()*Math.min(C.step.d*0.6,600)):0;
    if(C.step) cnStepTick(C);
  }
}

export function cnBlocks(a,b){ for(const C of state.CN){ if(C.after||C.away) continue; const d=Math.hypot(a-C.i,b-C.j); if(d<0.42&&d<Math.hypot(gymState.hubP.i-C.i,gymState.hubP.j-C.j)) return true; } return false; }

/** Resume the inmate's routine after a fight, resting on the yard or sleeping after a cell defeat.
 * @param {number} index Inmate index in the matching room.
 * @param {boolean} won Whether the player won.
 * @param {boolean} yard Whether the fight took place on the yard.
 */
export function finishPrisonFight(index,won,yard){
  const C=(yard?state.YN:state.CN)[index]; if(!C) return;
  C.moving=false;
  if(yard){ C.fightRest=won?420:180; C.wait=0; C.pass=0; if(C.kind!=='sit') C.act='rest'; return; }
  C.plan=[]; C.after=null; C.res=won?'bed':''; C.path=null; C.t=0;
  C.step=won?{k:'sleep',d:1600}:{k:'idle',rest:true,d:420};
}

/** Profesor's pose: in the wheelchair by day, in the lower bunk at night. */
/** Śmierdziel keeps to the wet corner by the tub (and is not there outside prison). */
function stinkTick(){
  const S=state.STINK, tub=gymState.cellList.find(x=>x.t==='cwc'); S.t++;
  S.away=progressionState.save.phase!=='prison'||!tub;
  S.step=S.away?null:{k:'stink'};
  if(tub){ S.i=tub.i+itemW(tub)+0.45; S.j=tub.j+itemH(tub)*0.55; }
}

function profTick(){
  const P=state.PROF; P.t++;
  const chair=gymState.cellList.find(x=>x.t==='cwheel'), bunk=gymState.cellList.find(x=>x.t==='bunk2');
  const B=cnNight()&&bunk&&progressionState.save.phase==='prison'?cnBedOf(P):null;
  if(B){ P.act='lie'; P.after=B.it; P.i=B.at[0]; P.j=B.at[1]; P.fi=B.face[0]; P.fj=B.face[1]; }
  else if(chair){ P.act='sit'; P.after=chair; P.i=chair.i+itemW(chair)/2; P.j=chair.j+itemH(chair)/2-0.05; P.fi=-0.6; P.fj=0.8; }
}

export function cnRect(C){ return C.act==='pushup'?crewRect(C):[C.i-0.2,C.j-0.2,C.i+0.2,C.j+0.2]; } // ---- drawing ----
/** How a cell person looks in the 2× room: ramps of his colour block plus hair, beard and stubble. @param {any} C */
/** The modelled-figure look of a hub person (also the fighters of the isometric fight). @param {any} C */
export function cnLookHD(C){ const rb=C.rb, L={sk:[rb,rb+1],top:[rb+6,rb+7],pt:[rb+2,rb+3],shoe:appearanceState.R_NPCB,hair:rb+9,...(C.hd||{})};
  if(C.hood&&gymState.hubRoom==='yard') Object.assign(L,{style:'hood',cap:rb+8,beard:false,mustache:false,chops:false,stubble:false});   /* the yard: everyone under the same grey hood */
  if(C.bath){ const wet=C.act==='scrub'||C.tub; Object.assign(L,{top:L.sk,pt:L.sk,shoe:rb+8,bare:true,censor:C.act==='scrub',waist:wet?undefined:rb+4}); }   /* the bath: slippers and a towel, naked under the shower */
  return L; }

function cnSkel(C,J,lie,base){        // J(s) -> {hip,knee,foot,sh,el,hd}; J.pel / J.chest / J.head: body joints [fwd,side,z]
  if(gymState.ISO_K>1){ figureHD(C,J,cnLookHD(C),{pose:lie?1:0,base,noShadow:lie||J.noShadow}); return; }   // the 2× cell
  gymState.ipC=C; gymState.ipN=0; gymState.ipPose=lie?1:0; gymState.ipBase=base||0;
  const rb=C.rb, nearS=(-C.fj+C.fi)>=0?1:-1;
  for(let s=-1;s<=1;s+=2){
    const near=s===nearS, SK=near?rb:rb+1, PT=near?rb+2:rb+3, TP=near?rb+6:rb+7, L=J(s);
    ipAdd(L.hip[0],L.hip[1],L.hip[2],1.45, L.knee[0],L.knee[1],L.knee[2],1.2, PT);
    ipAdd(L.knee[0],L.knee[1],L.knee[2],1.15, L.foot[0],L.foot[1],L.foot[2],1.05, PT);
    ipAdd(L.foot[0]-0.2,L.foot[1],L.foot[2]-0.1,1.2, L.foot[0]+0.9,L.foot[1],L.foot[2]-0.3,1.05, appearanceState.R_NPCB);
    ipAdd(L.sh[0],L.sh[1],L.sh[2],1.2, L.el[0],L.el[1],L.el[2],1.05, TP);
    ipAdd(L.el[0],L.el[1],L.el[2],1.05, L.hd[0],L.hd[1],L.hd[2],0.95, TP);
    ipAdd(L.hd[0],L.hd[1],L.hd[2],0.95, L.hd[0]+0.05,L.hd[1],L.hd[2],0.95, SK);
  }
  const P=J.pel, Q=J.chest, H=J.head;
  ipAdd(P[0],P[1],P[2],2.2, Q[0],Q[1],Q[2],2.85, rb+6,rb+2,0.3,0.36,rb+2);
  ipAdd(H[0],H[1],H[2],2.45, H[0],H[1],H[2],2.45, rb);
  ipAdd(H[0]-0.5,H[1],H[2]+0.9,2.2, H[0]-0.5,H[1],H[2]+0.9,2.2, rb+9);
  for(let k=0;k<gymState.ipN;k++) gymState.ipOrd[k]=k;
  for(let a=1;a<gymState.ipN;a++){ const v=gymState.ipOrd[a]; let b=a-1; while(b>=0&&gymState.ipD[gymState.ipOrd[b]]>gymState.ipD[v]){ gymState.ipOrd[b+1]=gymState.ipOrd[b]; b--; } gymState.ipOrd[b+1]=v; }
  if(!lie&&!J.noShadow){ bodyPt(0,0,0); shadowEll(Math.round(gymState.bpX),Math.round(gymState.bpY),4,1); }
  for(let p=0;p<2;p++) for(let a=0;a<gymState.ipN;a++){ const k=gymState.ipOrd[a];
    taper(Math.round(gymState.ipX0[k]),Math.round(gymState.ipY0[k]),gymState.ipR0[k],Math.round(gymState.ipX1[k]),Math.round(gymState.ipY1[k]),gymState.ipR1[k],p,gymState.ipRp[k],gymState.ipRp2[k],gymState.ipZ1[k],gymState.ipZ2[k],gymState.ipRp3[k]); }
  if(!lie){ bodyPt(H[0],H[1],H[2]); const hd0=gymState.bpD;
    for(let s=-1;s<=1;s+=2){ bodyPt(H[0]+1.85,H[1]+s*0.9,H[2]+0.3); if(gymState.bpD>hd0+0.02) pset(Math.round(gymState.bpX),Math.round(gymState.bpY),appearanceState.C_OUT); } }
  gymState.ipPose=0; gymState.ipBase=0; gymState.ipC=gymState.hubP;
} function cnBlanket(C){                 // grey prison blanket over the legs of a sleeping inmate
  const B=cnBedOf(C); if(!B) return; if(gymState.hubRoom==='cell'){ wardBlanket({at:B.at}); return; }
  const it=B.it, w=itemW(it), h=itemH(it), z0=B.base-0.3, z1=B.base+2.9;
  const T=roomsState.CLC.bT, F=roomsState.CLC.bF, S=roomsState.CLC.bS;
  let i0,j0,i1,j1; if(it.t==='bunk'){ i0=it.i+0.14; i1=it.i+w-0.14; j0=B.at[1]-0.05; j1=it.j+h-0.18; } else { j0=it.j+0.14; j1=it.j+h-0.14; i0=B.at[0]-0.05; i1=it.i+w-0.18; }
  quad(i0,j1,z0,i1,j1,z0,i1,j1,z1,i0,j1,z1,()=>F); quad(i1,j0,z0,i1,j1,z0,i1,j1,z1,i1,j0,z1,()=>S);
  quad(i0,j0,z1,i1,j0,z1,i1,j1,z1,i0,j1,z1,(x,y)=>{ floorAt(x,y,z1); return (h2(Math.floor(roomsState.fa*9),Math.floor(roomsState.fz*9))<50)?F:T; });
  isoLine(i0,j0,z1,i1,j0,z1,roomsState.CLC.mS); isoLine(i0,j0,z1,i0,j1,z1,roomsState.CLC.mS);
}

export function cnDraw(C){
  const t=C.t;
  switch(C.act){
    case 'pushup': drawCrewPushup(C); return;
    case 'walk': case 'idle': case 'rest': case 'loose': case 'behind': drawIsoNPC(C); return;
    case 'sit': {
      const eat=(!C.yard||C.smoke)&&(t%260)<60, bob=0.15*Math.sin(t*0.05);
      const J=s=>{ const R=s===1&&eat;
        if(C.tub) return {hip:[0.3,s*1.2,5.9],knee:[2.6,s*1.3,6.6],foot:[4.4,s*1.35,5.9],sh:[0.3,s*2.7,11.2+bob],el:[1.0,s*3.1,9.2+bob],hd:[1.6,s*3.2,9.1]};   /* in the tub: legs out in the water, hands on the rim */
        return {hip:[0.3,s*1.2,5.9],knee:[2.7,s*1.35,6.1],foot:[2.8,s*1.45,0.9],sh:[0.3,s*2.7,11.2+bob],
          el:R?[1.5,s*3.0,10.4]:(C.yard?[1.3,s*3.1,8.6]:[1.4,s*3.2,8.7]), hd:R?[1.7,s*0.9,13.4]:(C.yard?[2.5,s*2.0,6.9]:[2.9,s*2.3,8.2])}; };
      J.pel=[0,0,5.4]; J.chest=[0.3,0,10.9+bob]; J.head=[0.6,0,14.3+bob]; J.noShadow=true;
      cnSkel(C,J,false);
      if(C.smoke){ gymState.ipC=C; bodyPt(eat?1.9:2.6,eat?0.9:2.0,eat?13.6:7.1); const x=Math.round(gymState.bpX), y=Math.round(gymState.bpY); pset(x,y,rgb('#ff7a2a'));   // cigarette + smoke
        for(let k=0;k<3;k++){ const ph=(t*0.4+k*9)%24; if(ph<18) pset(x+Math.round(Math.sin(t*0.05+k)*1.2),y-2-Math.round(ph*0.35),(k&1)?rgb('#c8ccd2'):rgb('#9aa0a8')); } gymState.ipC=gymState.hubP; }
      return; }
    case 'floor': {   /* on the wet flags by the tub: knees up, arms over them, head hanging; now and then he scratches */
      const bob=0.12*Math.sin(t*0.04), itch=(t%420)<70, nod=0.5*Math.max(0,Math.sin(t*0.011));
      const J=s=>({hip:[0,s*1.2,1.4],knee:[1.9,s*1.4,5.2],foot:[3.0,s*1.5,0.9],sh:[-0.3,s*2.6,8.4+bob],
        el:s===1&&itch?[0.7,s*3.0,10.4]:[1.5,s*2.9,6.2],hd:s===1&&itch?[0.6,s*1.5,12.3+Math.sin(t*0.9)*0.3]:[2.4,s*1.6,5.0]});
      J.pel=[0,0,1.0]; J.chest=[-0.2,0,8.1+bob]; J.head=[0.3+nod*0.3,0,11.9+bob-nod*0.5]; J.noShadow=true;
      cnSkel(C,J,false);
      if(gymState.ISO_K>1) wardFlies(C.i,C.j,10,4);
      return; }
    case 'lie': {
      const br=0.2*Math.sin(t*0.03);
      const J=s=>({hip:[0,s*1.2,7.2],knee:[0.3,s*1.25,3.8],foot:[0,s*1.3,0.9],sh:[0.1,s*2.7,12.4+br],el:[-0.1,s*3.4,9.9],hd:[0.3,s*3.3,7.7]});
      J.pel=[0,0,6.6]; J.chest=[0.3,0,12.2+br]; J.head=[0.35,0,15.6];
      cnSkel(C,J,true,cnBedOf(C).base); cnBlanket(C); return; }
    case 'squat': {
      const T=96, d=0.5-0.5*Math.cos(2*Math.PI*(t%T)/T);
      const J=s=>({hip:[-1.5*d,s*1.25,7.2-3.1*d],knee:[0.7+0.9*d,s*(1.3+0.5*d),3.8+0.5*d],foot:[0.25,s*1.5,0.9],
        sh:[0.1+0.9*d,s*2.7,12.4-3.0*d],el:[0.3+0.9*d,s*4.1,14.8-3.0*d],hd:[-0.6+0.9*d,s*1.3,15.9-3.0*d]});   // hands behind the head
      J.pel=[-1.5*d,0,6.6-3.1*d]; J.chest=[0.4+0.9*d,0,12.2-3.0*d]; J.head=[0.45+1.1*d,0,15.6-3.0*d];
      cnSkel(C,J,false); return; }
    case 'wash': {
      const sp=(t%190)<46, w=0.35*Math.sin(t*0.32);
      const J=s=>({hip:[0,s*1.2,7.2],knee:[0.8,s*1.3,3.8],foot:[0.3,s*1.4,0.9],sh:[0.9,s*2.6,12.0],
        el:sp?[2.0,s*2.9,11.4]:[2.1,s*3.0,10.3], hd:sp?[2.2,s*0.9,14.2]:[2.9+w*s,s*1.4,9.9+Math.abs(w)]});
      J.pel=[0,0,6.6]; J.chest=[0.9,0,12.0]; J.head=sp?[1.4,0,14.8]:[1.6,0,14.6];
      cnSkel(C,J,false);
      if(!sp&&(t%9)<3){ bodyPt(3.0,(t%2?1:-1)*0.8,10.8); pset(Math.round(gymState.bpX),Math.round(gymState.bpY),rgb('#bcd4e8')); gymState.ipC=gymState.hubP; }   // splashes
      return; }
  }
  drawIsoNPC(C);
}

/** The walkers on the ring: the yard people and the two extra men, all in hoods. */
const walkers=()=>[...state.YN,...state.YARD_EXTRA];
export function ynEnter(){
  const W=walkers(), L=Math.PI*2*WALK_R;
  W.forEach((C,k)=>{ C.t=(Math.random()*400)|0; C.wait=0; C.pass=0; C.fightRest=0; C.after=null; C.kind='walk';
    C.s=L*k/W.length; const p=ringPos(C.s); C.i=p[0]; C.j=p[1]; C.fi=p[2]; C.fj=p[3]; C.act='walk'; C.hood=true; });
  Object.assign(state.GUARD,{i:RING_C[0]+0.15,j:RING_C[1]+0.15,fi:0.7071,fj:0.7071,act:'behind',moving:false});     // one turnkey in the middle,
  Object.assign(state.GUARD2,{i:1.25,j:3.2,fi:1,fj:0.25,act:'behind',moving:false});                                 // one by the gate
  state.YND=[...W,state.GUARD,state.GUARD2];
}

export function ynTick(){
  if(cnNight()) return;
  const W=walkers(), P=gymState.hubP;
  let halt=false;                                                                    // the column stops as one when the hero stands in the way
  for(const C of W){ if(C.fightRest>0) continue; const p=ringPos(C.s+0.4), pd=Math.hypot(p[0]-P.i,p[1]-P.j); if(pd<0.55&&pd<Math.hypot(C.i-P.i,C.j-P.j)) halt=true; }
  state.yardStep=(state.yardStep||0)+(halt?0:0.1);   /* a slow, dragging step */
  for(const C of W){
    C.t++; C.moving=false;
    if(C.fightRest>0){ C.fightRest--; continue; }
    if(halt){ C.act='idle'; continue; }
    C.s+=WALK_SP; const p=ringPos(C.s); C.i=p[0]; C.j=p[1]; C.fi=p[2]; C.fj=p[3]; C.moving=true; C.act='walk'; C.ph=state.yardStep;   /* in step */
  }
}

export function ynBlocks(a,b){ if(cnNight()) return false; for(const C of walkers()){ if(C.after) continue; const d=Math.hypot(a-C.i,b-C.j); if(d<0.42&&d<Math.hypot(gymState.hubP.i-C.i,gymState.hubP.j-C.j)) return true; } return false; }

export function initialize(){

// Shared boots and skeletal pose colors used by prison inmates.
setRamp(appearanceState.R_NPCB,['#121014','#241e24','#3a3238'],false);
state.PUNCH_T = {jab:12,cross:14,hook:16,upper:16,slip:18};
state.lerp3 = (a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];

// Newgate exercise yard.
state.YARD_W = 12;   // as large as the picture allows without scrolling
state.YARD_H = 10;

Object.assign(gymState.GYM_TYPES,{ ydoor:{fixed:true,flat:true,z:9,st:'ydoor'}, ydrain:{fixed:true,flat:true},  });

Object.assign(gymState.ST_INFO,{ydoor:['DRZWI','Drzwi — powrót do celi']});


/* =====================================================================
   CELL INMATES — 3 NPCs in prison frieze jackets (the old drelich) living their own day in the cell:
   eating / chatting at the table, naps and night sleep on their own bunk, squats, push-ups,
   washing at the sink, standing around. Shared prison skeleton renderer and color ramps
   (rb+0 skin, +1 skin far, +2/+3 trousers, +4/+5 trousers (no belt), +6/+7 drelich top, +9 hair).
   Paths: a small BFS grid of the cell (0.25 tile). Sitting / lying inmates are drawn right after
   their stool / bunk (bunks are baked in two layers so the front rail and ladder stay in front).
   ===================================================================== */
state.CN_READY = undefined;
                          // set once the inmates exist (setRoomRaw can run before this point)
state.CN_TOP = ['#36302a','#504638','#6a5e4a'];   /* Newgate: coarse brown-grey frieze */
state.CN_PANT = ['#262420','#38342e','#4e4940'];

state.CN = [
  {name:'Harry',rb:66,bed:{t:'bunk',lv:0},sk:['#8a5a3a','#c68a5e','#eab48a'],hair:['#6a6e7a','#a8acb8','#e0e4ec'],hd:{style:'bald',stubble:true,chops:true,irons:true,scarf:0xff2a3a6a}},   // hd: the 2× look
  {name:'Zeke',rb:76,bed:{t:'bunk2',lv:0},sk:['#b87a5e','#e8b08a','#ffd8b8'],hair:['#2a160c','#4a2a16','#704424'],hd:{style:'flatcap',cap:84,irons:true}},
  {name:'Reuben',rb:86,bed:{t:'bunk2',lv:1},sk:['#7a3f2b','#b86b45','#e59c6b'],hair:['#110b0b','#1e1414','#3b2b2b'],hd:{style:'shaved',mustache:true,chops:true,irons:true,scarf:0xff22306e}},
];

for(const C of state.CN){
  crewRamps(C.rb,{sk:C.sk,tr:state.CN_PANT,tt:state.CN_PANT,top:state.CN_TOP,gl:C.hd&&C.hd.cap?['#2e2a22','#463e30','#5e5442']:C.sk,hair:C.hair});   /* a cloth cap takes the glove ramp */
  Object.assign(C,{sleeves:true,wraps:false,gloves:false,pants:true,i:5,j:6,fi:0.7071,fj:0.7071,z0:0,ph:0,moving:false,act:'idle',t:0,
    plan:[],step:null,path:null,pk:0,wait:0,pass:0,res:'',after:null,up:1,reps:0,pq:[],pside:1,pt:0,cool:0});
}

/* Profesor: the old ring veteran in a wheelchair by the lower bunk. He sits all day and lies in that bunk at night. */
state.PROF = {name:'Profesor',rb:166,hd:{style:'long',beard:true},bed:{t:'bunk2',lv:0},yard:true,sleeves:true,wraps:false,gloves:false,pants:true,i:8.15,j:2.5,fi:-0.6,fj:0.8,z0:0,ph:0,moving:false,act:'sit',t:0,
  step:{k:'prof'},after:null,up:1,pq:[],pt:0,smoke:false};
crewRamps(166,{sk:['#8a5e46','#b98a6c','#dcae8e'],tr:state.CN_PANT,tt:state.CN_PANT,top:state.CN_TOP,gl:['#8a5e46','#b98a6c','#dcae8e'],hair:['#9a9aa2','#cfcfd6','#f0f0f4']});
/* Śmierdziel: a filthy man squatting shirtless on the wet flags by the night tub, flies over his head; he sells an
   ointment of his own making (healers.js). In prison only, always in the same spot, he sleeps sitting. */
state.STINK = {name:'Śmierdziel',rb:216,hd:{style:'shaved',beard:true,stubble:true,top:[216,217],bare:true},yard:true,sleeves:false,wraps:false,gloves:false,pants:true,i:1.6,j:6.3,fi:0.9,fj:0.45,z0:0,ph:0,moving:false,act:'floor',t:0,
  step:{k:'stink'},after:null,up:1,pq:[],pt:0,smoke:false};
crewRamps(216,{sk:['#6a5644','#8f765e','#ad927a'],tr:['#241e18','#382f25','#4c4132'],tt:['#241e18','#382f25','#4c4132'],top:['#241e18','#382f25','#4c4132'],gl:['#6a5644','#8f765e','#ad927a'],hair:['#1a1610','#2a241a','#3a3224']});
/** Cell people for drawing: the inmates, Profesor and Śmierdziel. */
state.CNL = [...state.CN, state.PROF, state.STINK];

state.CN_READY=true;

// ---- walk grid ----
state.CN_G = 0.25;
 state.cnGrid = null;
state.cnGW = 0;
state.cnGH = 0;
state.cnPrev = null;


/* Hooded Newgate inmates walk in a single column, watched by two turnkeys. */
state.YN_READY = undefined;

state.YN_SK = ['s1','s2','s3','s4','s2','s1','s5'];
state.YN_HR = ['h2','h1','h6','h3','h1','h4','h1'];

/** The yard hood: dirty grey canvas. */
state.HOOD = ['#4e4e4a','#6e6d66','#8e8c84'];
state.YN = [];
 for(let k=0;k<7;k++){
  const sk=LOOK.skin.find(o=>o.id===state.YN_SK[k]).ramp, hr=LOOK.hair.find(o=>o.id===state.YN_HR[k]).ramp, rb=96+k*10;
  crewRamps(rb,{sk,tr:state.CN_PANT,tt:state.CN_PANT,top:state.CN_TOP,gl:state.HOOD,hair:hr});   /* the glove ramp: the yard hood */
  state.YN.push({rb,yard:true,sleeves:true,wraps:false,gloves:false,pants:true,i:5,j:5,fi:1,fj:0,z0:0,ph:0,moving:false,act:'idle',t:0,step:{k:'yard'},after:null,
    kind:'walk',s:0,wait:0,pass:0,fightRest:0,smoke:k===5,pq:[],pk:null,pt:0,up:1});
}

/** Two more hooded walkers on the ring (not yard opponents, so nobody picks a fight with them). */
state.YARD_EXTRA = [176,186].map((rb,k)=>{ crewRamps(rb,{sk:k?['#7a4a32','#ad7452','#d69c78']:['#a07258','#d6a684','#f4c8a6'],tr:state.CN_PANT,tt:state.CN_PANT,top:state.CN_TOP,gl:state.HOOD,hair:k?['#1a1210','#2e221c','#4a382c']:['#5a4028','#8a6440','#b08a5c']});
  return {rb,yard:true,sleeves:true,wraps:false,gloves:false,pants:true,i:6,j:4,fi:0,fj:-1,z0:0,ph:0,moving:false,act:'idle',t:0,step:{k:'yard'},after:null,pk:null,pt:0,up:1,hd:{style:k?'shaved':'short',stubble:!!k}}; });
crewRamps(206,{sk:['#9a6a50','#c8967a','#e8b898'],tr:['#16181e','#22252e','#30343e'],tt:['#16181e','#22252e','#30343e'],top:['#181c28','#262c3c','#384054'],gl:['#101218','#1c1f28','#2c303a'],hair:['#3a3026','#5a4a3a','#7a6a56']});   /* a turnkey: dark blue coat, peaked cap */
state.GUARD = {rb:206,yard:false,sleeves:true,wraps:false,gloves:false,pants:true,i:0.8,j:1.0,fi:0.7071,fj:0.7071,z0:0,ph:0,moving:false,act:'behind',t:0,step:{k:'guard'},after:null,pk:null,pt:0,up:1,hd:{style:'cap',cap:214,belt:true,baton:true,mustache:true}};
/** The second turnkey on the yard, by the gate (same uniform as the first). */
state.GUARD2 = {...state.GUARD,step:{k:'guard'},hd:{style:'cap',cap:214,belt:true,baton:true,chops:true}};
/** Everyone drawn on the yard (ynEnter rebuilds it with the turnkeys). */
state.YND = [...state.YN, ...state.YARD_EXTRA];

state.YN_READY=true;
}

````

---

## `src/ward.js`

````js
/* The Ward — Newgate, 1868: the shared cell as a low, long vault of sandstone ashlar and soot-black brick under old
   limewash. A wide plank guard-bed runs along the back wall with flattened straw pallets and iron rings with chains;
   the only window is a barred slot under the vault with a plank shutter, letting in cold smog; a night tub stands in
   the corner by the door in its own puddle; names, dates and crosses are scratched into the lime. The room is drawn at
   2× (the cell is a 2× room); the light (a tallow lamp by the door, smog through the slot) is cell-light's.
   Mechanics keep the old item types: bunk / bunk2 = the guard-bed (sleep, sitting on its edge), cwc = the tub,
   csink = the water butt (washing), cwheel = Profesor's bath chair, ccom = the chest (goods), cdoor = the oak door. */

import { state as gymState, quad, isoLine, isoLineThin, isoX, isoY, itemW, itemH, shadeC, psetK } from './gym.js';
import { state as appearanceState, rgb } from './appearance.js';
import { state as rendererState, pset } from './renderer.js';
import { state as boxingState, h2 } from './boxing.js';
import { state as roomsState, faceI, faceJ, floorAt, solidDraw, skyBucket } from './rooms.js';
import { skyColors } from './weather.js';

// Runtime values owned by ward; initialized explicitly by main.js.
export const state = {};

export const WARD_W = 12, WARD_H = 7;
/** Top of the guard-bed planks and of a straw pallet on it. */
export const BED_Z = 5.2, PALLET_Z = 5.75;
/** The guard-bed: along the back wall (j = 0), this deep. */
const BED_J1 = 2.46;
/** The window slot in the back wall (wall units u = 6·i, height z): no glass, a grille, a plank shutter to its right. */
export const WARD_WIN = {u0:32,u1:40,z0:15.6,z1:21.4,grille:true};
/** The tallow lamp on its bracket on the left wall, by the door. */
export const LAMP = {i:0.32,j:1.7,z:12.6};
/** Sleeping places on the guard-bed, by item and level: centre i of the pallet. */
const SLOTS = {bunk:[3.55,0.95],bunk2:[5.75,7.75]};
/** The hero's own place on the guard-bed (the middle of 'bunk', where he sleeps) and where one sits on its edge. */
export const SLOTS_HERO = 2.25, BED_SEAT_J = 2.15;
/** Pallets lying on the guard-bed (i centres), the used ones and two spare. */
const PALLETS = [0.95,2.15,3.55,5.75,7.75,9.55,10.95];

export function wardLayout(){ return [
  {t:'cdoor',i:0,j:3.0,w:0.3,h:1.5},
  {t:'bunk',i:0.15,j:0.06,w:4.2,h:BED_J1-0.06},{t:'bunk2',i:4.35,j:0.06,w:7.5,h:BED_J1-0.06},
  {t:'cpull',i:5.6,j:2.55,w:0.8,h:0.4},   /* under the window slot: up on the guard-bed, hands on the grille */
  {t:'croach',i:7.25,j:2.55,w:0.9,h:0.4},   /* kneeling on the guard-bed at the scratched GOD HELP ME: roaches on the wall */
  {t:'cwc',i:0.18,j:5.75,w:1.0,h:1.0},
  {t:'csink',i:0.12,j:4.6,w:0.75,h:0.75},
  {t:'cwheel',i:8.5,j:3.05,w:0.95,h:0.95},   /* Profesor's chair, clear of the window slot */
  {t:'ccom',i:10.55,j:5.55,w:1.3,h:0.9},
  {t:'cfloor',i:2.2,j:4.2,w:3.0,h:2.6},
  {t:'cshadow',i:7.2,j:4.1,w:1.6,h:1.6}
]; }

/** Where a cell person lies: centre, facing (head to the wall), the pallet height, the spot in front of his place. @param {{t:string,lv:number}} bed */
export function wardBed(bed){
  const it=gymState.cellList.find(x=>x.t===bed.t); if(!it) return null;
  const i=(SLOTS[bed.t]||[it.i+1])[bed.lv?1:0];
  return {it,at:[i,1.2],face:[0,-1],base:PALLET_Z-0.25,app:[i,BED_J1+0.45]};
}
/** Places on the edge of the guard-bed to sit (centre, the spot in front, facing the room). */
export const WARD_SEATS = [{c:[1.2,2.15],a:[1.2,2.95],f:[0,1]},{c:[4.6,2.15],a:[4.6,2.95],f:[0,1]},{c:[8.8,2.15],a:[8.8,2.95],f:[0,1]},{c:[10.4,2.15],a:[10.4,2.95],f:[0,1]}];
/** Open floor for squats, push-ups and standing about; the water butt. */
export const WARD_EX = [{p:[3.0,4.6],f:[1,0]},{p:[6.6,5.6],f:[0,1]},{p:[9.0,4.3],f:[-1,0]},{p:[4.4,6.2],f:[1,0]}];
export const WARD_WASH = {p:[1.25,4.95],f:[-1,0]};

/* ---------- walls ---------- */

const C = {};
const bay=(/** @type {number} */ x,/** @type {number} */ y)=>gymState.BAYER[(y&3)*4+(x&3)];
/** @param {number} c @param {number} t @param {number} k */
function mixC(c,t,k){ const ch=(/** @type {number} */ s)=>Math.round(((c>>s)&255)*(1-k)+((t>>s)&255)*k); return (0xff000000|(ch(16)<<16)|(ch(8)<<8)|ch(0))>>>0; }

/** Is (u, z) open air in the window slot (not frame, not grille)? @param {number} u @param {number} z */
export function wardWinOpen(u,z){
  const W=WARD_WIN; if(u<W.u0+0.7||u>W.u1-0.7||z<W.z0+0.7||z>W.z1-0.6) return false;
  if(Math.abs(z-(W.z0+W.z1)/2)<0.45) return false;                                        // the cross bar
  return ((u-W.u0-0.7)%1.55)>0.55;                                                        // square iron bars
}
/** The window slot: a deep stone reveal, square bars, smog behind. @param {number} u @param {number} z @param {number} x @param {number} y */
function windowCol(u,z,x,y){
  const W=WARD_WIN;
  if(u<W.u0-1.4||u>W.u1+6.2||z<W.z0-1.6||z>W.z1+1.1) return 0;
  if(u>W.u1+0.9&&u<W.u1+5.9&&z>W.z0-0.4&&z<W.z1+0.4){                                        // the plank shutter, swung open against the wall
    const pu=(u-W.u1-0.9)/5, pl=Math.floor(pu*4), e=pu*4-pl;
    if(Math.abs(z-W.z0-1.3)<0.45||Math.abs(z-W.z1+1.3)<0.45) return (Math.abs(e-0.5)<0.12&&(Math.floor(u*2)&1))?C.rivet:C.iron;   // hinge straps
    return e<0.08?C.woodK:(h2(pl,Math.floor(z*1.4))<60?C.woodD:C.wood); }
  if(u>=W.u0&&u<=W.u1&&z>=W.z0&&z<=W.z1){
    if(wardWinOpen(u,z)){ const k=(z-W.z0)/(W.z1-W.z0), b=skyBucket(), S=skyColors(b,roomsState.SKY[b]);   /* the sky, drowned in smog */
      const sky=mixC(rgb(k>0.5?S[0]:S[1]),C.smog,0.74); return bay(x,y)<3?mixC(sky,C.smogL,0.3):sky; }
    if(u<W.u0+0.7||u>W.u1-0.7||z<W.z0+0.7||z>W.z1-0.6) return z<W.z0+0.7?C.stoneT:(u<W.u0+0.7?C.stoneD:C.stone);   // the reveal: lit sill, shaded jamb
    return (u-W.u0)%1.55<0.75||Math.abs(z-(W.z0+W.z1)/2)<0.25?C.ironH:C.iron; }
  if(z<W.z0&&z>W.z0-1.6&&u>W.u0-1.4&&u<W.u1+1.4) return z>W.z0-0.5?C.stoneT:C.stone;        // the stone sill
  if(z>W.z1&&u>W.u0-1.4&&u<W.u1+1.4) return C.stoneD;                                       // lintel
  if(u<W.u0&&u>W.u0-1.4) return C.stoneD;
  if(u>W.u1&&u<W.u1+1.4) return C.stone;
  // smog stains spreading on the wall round the slot
  return 0;
}

/** A wall of the Ward. a: tiles along the wall, z: height, right: the back wall (j = 0, the window wall). */
export function wardWallCol(a,z,x,y,right){
  const WH=gymState.HUB_WH, lim=right?WARD_W:WARD_H, u=a*6;
  if(z>WH-0.9||a>lim-0.08) return appearanceState.C_OUT;
  if(right){ const w=windowCol(u,z,x,y); if(w) return w; }
  // the vault springing: a row of low arches, the ceiling between them black with soot
  const sp=4, t=((a%sp)/sp-0.5)*2, arch=WH-4.6+3.6*t*t;
  if(z>arch){ const d=z-arch; if(d<0.5) return C.stoneD; return d>1.2||bay(x,y)<10?C.vault:C.sootD; }
  if(Math.abs((a+sp/2)%sp-sp/2)<0.18&&z>arch-6) return z>arch-0.4?C.stoneT:C.stoneD;         // the pier under each springing
  let c;
  if(z<9.6){                                                                                 // sandstone ashlar
    const row=Math.floor(z/3.2), fz=z/3.2-row, bu=(u+row*4.6+(right?0:7))/9.2, col=Math.floor(bu), fu=bu-col, n=h2(col*7+(right?3:1),row*13+5);
    if(fz<0.07||fu<0.035) return C.joint;
    c=n<70?C.ash[1]:n>215?C.ash[2]:C.ash[0];
    if(fz>0.88) c=C.ash[2];                                                                  // the worn top arris
    if(h2(Math.floor(u*3),Math.floor(z*3))<22) c=C.ash[3];                                    // tooling marks
    if(z<3.4&&(3.4-z)*4>bay(x,y)) c=h2(Math.floor(u*2),Math.floor(z*2))<60?C.mold:C.damp;     // rising damp, mould at the foot
    if(n>244&&fu>0.3&&fu<0.36) c=C.joint;                                                    // a crack through the block
  } else if(z<10.3) c=z>10?C.stoneT:C.stone;                                                 // string course
  else {                                                                                     // brick under old limewash
    const br=Math.floor((z-10.3)/1.15), bu=(u+(br&1)*1.2)/2.4, bc=Math.floor(bu), fb=bu-bc, fz=(z-10.3)/1.15-br;
    const peel=h2(Math.floor(u/5)+(right?20:40),Math.floor(z/3.5)+3)>178&&h2(Math.floor(u*1.5),Math.floor(z*1.5))>40;
    if(peel){ c=(fz<0.12||fb<0.06)?C.mortar:C.brick[h2(bc,br)%3]; }
    else { const n=h2(Math.floor(u*1.3)+(right?9:2),Math.floor(z*1.1)); c=n<60?C.lime[1]:n>230?C.lime[2]:C.lime[0];
      if(fz<0.1&&bay(x,y)<3) c=C.lime[1]; }                                                  // brick courses ghosting through
    const run=h2(Math.floor(u*1.4)+(right?5:11),7);
    if(run<46&&z>10.3+(h2(Math.floor(u*1.4),8)&7)) c=mixC(c,C.damp,0.45);                    // water runs from the vault
    const soot=Math.max(0,(z-14)/(WH-14)); c=mixC(c,C.soot,Math.min(0.75,soot*0.8+(h2(Math.floor(u*1.5),Math.floor(z*0.7))&31)/255));   // soot under the vault, smooth
  }
  if(!right){ const lu=LAMP.j*6, dz=z-LAMP.z; if(dz>0.5&&Math.abs(u-lu)<1.2+dz*0.18&&(1-Math.abs(u-lu)/(1.2+dz*0.18))*14>bay(x,y)) c=mixC(c,C.soot,0.7); }   // the lamp's soot plume
  // iron rings over the guard-bed, the chains hanging down the wall onto the planks
  if(right){ for(let k=0;k<5;k++){ const ru=12+k*12; if(ru>WARD_WIN.u0-3&&ru<WARD_WIN.u1+7) continue;
    const d=Math.hypot((u-ru)*0.9,z-8.4); if(d<0.75&&d>0.35) return d<0.5?C.ironH:C.iron;
    if(z>BED_Z&&z<8.1){ const cu=ru+0.25*Math.sin((z-BED_Z)*2.2); if(Math.abs(u-cu)<0.32) return ((z*2.6)|0)&1?C.iron:C.ironH; } } }
  // corner shade and grime low on the walls
  const corner=Math.max(0,1-a/1.3)*(1-z/WH); if(corner*12>bay(x,y)) c=shadeC(c,0.7);
  return c;
}

/** Scratches in the lime: names, dates, crosses and tallies (on the brick zone), sheared onto the iso wall. */
function scratches(){
  const fb=rendererState.fb, K=gymState.ISO_K, FONT=boxingState.FONT;
  const put=(/** @type {number} */ x,/** @type {number} */ y,/** @type {number} */ c)=>{ x=Math.round(x); y=Math.round(y); if(x>=0&&y>=0&&x<appearanceState.W&&y<appearanceState.H) fb[y*appearanceState.W+x]=c; };
  /** text on the back wall (right) or the left wall, at (a, z) with the top-left corner; one font pixel = one 2× pixel */
  const write=(/** @type {string} */ s,/** @type {boolean} */ right,/** @type {number} */ a,/** @type {number} */ z)=>{
    const x0=(right?isoX(a,0):isoX(0,a)), y0=(right?isoY(a,0,z):isoY(0,a,z)), sl=right?0.5:-0.5;
    for(let k=0;k<s.length;k++){ const g=FONT[s.charCodeAt(k)]; if(!g) continue;
      for(let r=0;r<5;r++) for(let q=0;q<3;q++) if(g&(1<<(14-(r*3+q)))){ const dx=k*4+q; put(x0+dx,y0+r+dx*sl,C.scratch); put(x0+dx+1,y0+r+dx*sl+1,C.scratchD); } } };
  write('J.MORLEY 1866',true,1.1,15.4); write('GOD HELP ME',true,7.6,14.2); write('W.H.',true,10.4,16.8); write('NO HOPE',false,5.4,16.2); write('1867',false,4.2,13.4);
  // crosses and tally marks
  const mark=(/** @type {boolean} */ right,/** @type {number} */ a,/** @type {number} */ z,/** @type {number} */ kind,/** @type {number} */ n)=>{
    const x0=right?isoX(a,0):isoX(0,a), y0=right?isoY(a,0,z):isoY(0,a,z), sl=right?0.5:-0.5;
    if(kind===0){ for(let r=0;r<9;r++) put(x0+3,y0+r+3*sl,C.scratch); for(let q=0;q<7;q++) put(x0+q,y0+2+q*sl,C.scratch); }   // a cross
    else for(let m=0;m<n;m++){ const q=m*2+(m>=5?2:0); for(let r=0;r<6;r++) put(x0+q,y0+r+q*sl,C.scratch); if(m===4) for(let qq=-1;qq<10;qq++) put(x0+qq,y0+4-qq*0.45+qq*sl,C.scratch); }   // tallies in fives
  };
  mark(true,3.2,13.6,0,0); mark(true,9.3,15.6,0,0); mark(false,2.5,15.6,0,0); mark(true,4.5,12.6,1,9); mark(false,6.0,13.6,1,13); mark(true,10.8,13.2,1,6);
  void K;
}

/** The floor: worn stone flags, wet patches, straw by the guard-bed, the stain round the tub, dirt along the walls.
 * @param {number} x @param {number} y */
function floorCol(x,y){
  const a=(x-gymState.HUB_OX)/6, b=(y-gymState.HUB_OY)/3, i=(a+b)/2, j=(b-a)/2;
  if(i<0||j<0||i>WARD_W||j>WARD_H) return 0;
  const row=Math.floor(j/1.16), fj=j/1.16-row, off=h2(row,3)/255*1.7, si=(i+off)/1.85, col=Math.floor(si), fi=si-col, n=h2(col*5+row*17,row*7+2);
  let c;
  if(fj<0.05||fi<0.035) c=C.fjoint;
  else { c=C.flag[n%3]; if(Math.hypot(fi-0.5,fj-0.5)<0.28&&bay(x,y)<6) c=C.flag[3];                // worn smooth in the middle
    if(n>238&&Math.abs(fi-fj)<0.04) c=C.fjoint; }                                           // cracked flag
  const wet=h2(Math.floor(i*0.9)+30,Math.floor(j*0.9)+11)/255, wd=Math.hypot((i*0.9%1)-0.5,(j*0.9%1)-0.5);
  if(wet>0.68&&wd<0.38){ c=mixC(c,C.wet,0.6); if(wd>0.33&&bay(x,y)<5) c=C.wetH; }           // puddles with a cold gleam
  const ti=0.7, tj=6.25, pd=Math.hypot((i-ti)*0.8,(j-tj)*1.1);
  if(pd<1.6){ const k=1-pd/1.6; if(k*15>bay(x,y)) c=mixC(c,C.piss,0.35+0.4*k); if(pd>1.42&&pd<1.5&&bay(x,y)<8) c=C.pissH; }   // round the tub
  if(j>BED_J1-0.05&&j<BED_J1+1.0&&h2(Math.floor(i*14),Math.floor(j*9))<14) c=h2(Math.floor(i*30),Math.floor(j*30))<128?C.straw:C.strawD;   // straw dragged off the pallets
  if(h2(Math.floor(i*22),Math.floor(j*22))<5) c=C.dirt;                                       // droppings, dirt
  const wall=Math.min(i,j); if(wall<0.9&&(1-wall/0.9)*13>bay(x,y)) c=shadeC(c,0.62);          // black along the walls
  return c;
}

/** Build the Ward into the background buffer: walls, floor, scratches, the flat items. */
export function buildWard(){
  const fb=rendererState.fb, W=appearanceState.W, H=appearanceState.H, OX=gymState.HUB_OX, OY=gymState.HUB_OY, WH=gymState.HUB_WH;
  for(let k=0;k<W*H;k++) fb[k]=C.ceil;
  quad(0,0,0,0,WARD_H,0,0,WARD_H,WH,0,0,WH,(x,y)=>{ const j=(OX-x)/6, z=OY+j*3-y; return wardWallCol(j,z,x,y,false); });
  quad(0,0,0,WARD_W,0,0,WARD_W,0,WH,0,0,WH,(x,y)=>{ const i=(x-OX)/6, z=OY+i*3-y; return wardWallCol(i,z,x,y,true); });
  quad(0,0,0,WARD_W,0,0,WARD_W,WARD_H,0,0,WARD_H,0,floorCol);
  scratches();
  isoLine(0,WARD_H,0,WARD_W,WARD_H,0,appearanceState.C_FLOOR_EDGE); isoLine(WARD_W,0,0,WARD_W,WARD_H,0,appearanceState.C_FLOOR_EDGE);
}

/* ---------- items ---------- */

/** A straw pallet on the guard-bed: lumpy ticking, stains, straw poking out, a rag rolled at the head. @param {number} ci */
function pallet(ci){
  const i0=ci-0.46, i1=ci+0.46, j0=0.3, j1=2.2, z0=BED_Z, z1=PALLET_Z, sd=Math.floor(ci*7);
  const top=(/** @type {number} */ x,/** @type {number} */ y)=>{ floorAt(x,y,z1); const fi=roomsState.fa, fj=roomsState.fz, n=h2(Math.floor(fi*7)+sd,Math.floor(fj*5));
    if(h2(Math.floor(fi*13)+sd,Math.floor(fj*11))<34) return C.tickD;                        // stains
    if((fi-i0<0.06||i1-fi<0.06)&&h2(Math.floor(fj*30),sd)<70) return C.straw;              // straw at the seams
    return n<90?C.tickS:n>200?C.tickH:C.tick; };
  quad(i0,j1,z0,i1,j1,z0,i1,j1,z1,i0,j1,z1,(x,y)=>{ faceJ(j1,x,y); return h2(Math.floor(roomsState.fa*20),sd)<50?C.straw:C.tickS; });
  quad(i1,j0,z0,i1,j1,z0,i1,j1,z1,i1,j0,z1,()=>C.tickD);
  quad(i0,j0,z1,i1,j0,z1,i1,j1,z1,i0,j1,z1,top);
  quad(i0+0.05,j0,z1,i1-0.05,j0,z1,i1-0.05,j0+0.38,z1+0.45,i0+0.05,j0+0.38,z1+0.45,(x,y)=>{ const n=h2(x|0,y|0); return n<80?C.ragD:C.rag; });   // the rolled rag
}
/** The guard-bed: a plank platform on trestles, black underneath; pallets, chains and odds and ends on top. @param {any} it */
function guardBed(it){
  if(gymState.bunkFront) return;                                                             // nothing stands in front of a sleeper
  const i0=it.i, j0=it.j, i1=it.i+itemW(it), j1=it.j+itemH(it), Z=BED_Z, B2=it.t==='bunk2';
  quad(i0,j1,0,i1,j1,0,i1,j1,Z-1.7,i0,j1,Z-1.7,(x,y)=>{ faceJ(j1,x,y); const fi=roomsState.fa;   // the dark under the planks, the trestle legs
    if(((fi+0.3)%2.1)<0.22) return (roomsState.fz>Z-2.2)?C.woodD:C.woodK; return bay(x|0,y|0)<2?C.woodK:C.under; });
  quad(i0,j1,Z-1.7,i1,j1,Z-1.7,i1,j1,Z,i0,j1,Z,(x,y)=>{ faceJ(j1,x,y); const fz=roomsState.fz, fi=roomsState.fa;   // the front board
    if(fz>Z-0.25) return C.woodH; if(fz<Z-1.55) return C.woodK;
    if(((fi*1.7)%1)<0.05&&fz>Z-1.2&&fz<Z-0.6) return C.rivet;                                 // nail heads
    return h2(Math.floor(fi*3),Math.floor(fz*2))<50?C.woodD:C.wood; });
  if(B2) quad(i1,j0,0,i1,j1,0,i1,j1,Z,i1,j0,Z,(x,y)=>{ faceI(i1,x,y); return roomsState.fz>Z-1.7?(roomsState.fz>Z-0.25?C.woodH:C.woodD):C.woodK; });
  quad(i0,j0,Z,i1,j0,Z,i1,j1,Z,i0,j1,Z,(x,y)=>{ floorAt(x,y,Z); const fj=roomsState.fz, fi=roomsState.fa, pl=Math.floor(fj/0.42), e=fj/0.42-pl;   // planks along the bed
    if(e<0.09) return C.woodK; const n=h2(Math.floor(fi*2.5)+pl*7,pl);
    if(h2(Math.floor(fi*9),Math.floor(fj*9))<16) return C.woodK;                              // knots, black stains
    return n<70?C.woodD:n>215?C.woodH:C.wood; });
  isoLine(i0,j1,Z,i1,j1,Z,C.woodK);
  for(const ci of PALLETS) if(ci>i0+0.3&&ci<i1-0.3) pallet(ci);
  if(!B2){ cup(3.05,1.6); bread(1.55,2.05); bible(3.55,1.75); } else { cup(6.35,1.9); bread(7.2,0.75); }
}
/** A dented tin cup. @param {number} ci @param {number} cj */
function cup(ci,cj){ const r=0.1; solidDraw(ci-r,cj-r,ci+r,cj+r,PALLET_Z,PALLET_Z+1.4,(a,b,z)=>{ const d=Math.hypot(a-ci,b-cj); if(d>r) return 0; if(z>PALLET_Z+1.25) return d<r*0.6?C.ironK:C.tinH; return (a-ci)-(b-cj)>0?C.tinD:C.tin; }); }
/** A crust of black bread. @param {number} ci @param {number} cj */
function bread(ci,cj){ solidDraw(ci-0.18,cj-0.1,ci+0.18,cj+0.1,PALLET_Z,PALLET_Z+0.7,(a,b,z)=>{ const u=(a-ci)/0.18, v=(b-cj)/0.1; if(u*u+v*v>1||z>PALLET_Z+0.7*(1-u*u*0.6)) return 0; return z>PALLET_Z+0.45?C.crust:C.crumb; }); }
/** The prison bible, black, the gilt gone. @param {number} ci @param {number} cj */
function bible(ci,cj){ quad(ci-0.16,cj-0.22,PALLET_Z+0.35,ci+0.16,cj-0.22,PALLET_Z+0.35,ci+0.16,cj+0.22,PALLET_Z+0.35,ci-0.16,cj+0.22,PALLET_Z+0.35,(x,y)=>{ floorAt(x,y,PALLET_Z+0.35); return Math.abs(roomsState.fa-ci)<0.03?C.gilt:C.book; });
  quad(ci-0.16,cj+0.22,PALLET_Z,ci+0.16,cj+0.22,PALLET_Z,ci+0.16,cj+0.22,PALLET_Z+0.35,ci-0.16,cj+0.22,PALLET_Z+0.35,()=>C.page); }

/** A coopered vessel: staves, iron hoops, a dark rim. @param {any} it @param {number} hgt @param {number} inner colour inside @param {boolean} lid */
function barrel(it,hgt,inner,lid){
  const ci=it.i+itemW(it)/2, cj=it.j+itemH(it)/2, r=Math.min(itemW(it),itemH(it))/2-0.04;
  solidDraw(ci-r,cj-r,ci+r,cj+r,0,hgt+0.1,(a,b,z)=>{ const d=Math.hypot(a-ci,b-cj), rr=r*(0.9+0.1*Math.sin(Math.PI*Math.min(1,z/hgt)));   /* the belly */
    if(d>rr) return 0;
    if(z>hgt-0.12){ if(d>rr*0.8) return C.woodH; if(lid&&(a-ci)<0.06) return h2(Math.floor((b-cj)*30),3)<60?C.woodD:C.wood; return 0; }
    if(d<rr*0.8) return z<hgt-0.7?(h2(Math.floor(a*60),Math.floor(b*60))<40?C.liqH:inner):0;
    const ang=Math.atan2(b-cj,a-ci), st=Math.floor((ang+Math.PI)/(Math.PI*2)*18), lit=(a-ci)-(b-cj)<0;
    if(Math.abs(z-hgt*0.22)<0.32||Math.abs(z-hgt*0.78)<0.32) return lit?C.ironH:C.iron;      // hoops
    if(z<0.5) return C.woodK;
    return st%2?(lit?C.wood:C.woodD):(lit?C.woodH:C.wood); });
}
/** Profesor's bath chair: a wicker back, two big spoked wheels, a small one in front. @param {any} it */
function bathChair(it){
  if(gymState.bunkFront) return;
  const i0=it.i+0.08, i1=it.i+itemW(it)-0.08, j0=it.j+0.1, j1=it.j+itemH(it)-0.1, cj=(j0+j1)/2, zs=4.2;
  const wheel=(/** @type {number} */ wi,/** @type {number} */ wj,/** @type {number} */ wz,/** @type {number} */ R)=>{ let px=0, py=0;
    for(let k=0;k<6;k++){ const t=k/6*Math.PI; isoLineThin(wi,wj+Math.cos(t)*R/7.5,wz+Math.sin(t)*R,wi,wj-Math.cos(t)*R/7.5,wz-Math.sin(t)*R,C.woodH); }   // spokes
    for(let k=0;k<=40;k++){ const t=k/40*Math.PI*2, x=Math.round(isoX(wi,wj+Math.cos(t)*R/7.5)), y=Math.round(isoY(wi,wj+Math.cos(t)*R/7.5,wz+Math.sin(t)*R)); pset(x,y,C.woodK); pset(x,y+1,t<Math.PI?C.woodH:C.wood); px=x; py=y; }   // the iron-shod rim
    pset(Math.round(isoX(wi,wj)),Math.round(isoY(wi,wj,wz)),C.ironH);
    void px; void py; };
  wheel(i0,cj,3.2,3.2);
  quad(i0,j0,zs,i1,j0,zs,i1,j1,zs,i0,j1,zs,(x,y)=>{ floorAt(x,y,zs); return h2(Math.floor(roomsState.fa*12),Math.floor(roomsState.fz*12))<90?C.rag:C.ragD; });   // the seat, a folded blanket on it
  quad(i0,j1,zs-1,i1,j1,zs-1,i1,j1,zs,i0,j1,zs,()=>C.woodD);
  quad(i0,j0,zs,i1,j0,zs,i1,j0,zs+5.4,i0,j0,zs+5.4,(x,y)=>{ faceJ(j0,x,y); const fa=roomsState.fa*14, fz=roomsState.fz*1.6;   // the wicker back
    if(roomsState.fz>zs+5.0) return C.woodD; return ((Math.floor(fa)+Math.floor(fz))&1)?C.wicker:C.wickerD; });
  for(const ai of [i0,i1]) isoLine(ai,j0,zs+2.4,ai,j1-0.05,zs+2.4,C.woodD);                   // arm rests
  isoLine(i0+0.1,j1+0.15,0.6,i1-0.1,j1+0.15,0.6,C.iron); isoLine((i0+i1)/2,j1,zs-1,(i0+i1)/2,j1+0.15,0.6,C.iron);   // the front wheel's fork
  wheel(i1,cj,3.2,3.2);
}
/** The chest for what he owns: planks, two iron bands, a padlock. @param {any} it */
function chest(it){
  const i0=it.i, j0=it.j, i1=it.i+itemW(it), j1=it.j+itemH(it), z1=4.0;
  const band=(/** @type {number} */ f)=>Math.abs(f-0.22)<0.05||Math.abs(f-0.78)<0.05;
  quad(i0,j1,0,i1,j1,0,i1,j1,z1,i0,j1,z1,(x,y)=>{ faceJ(j1,x,y); const f=(roomsState.fa-i0)/(i1-i0), fz=roomsState.fz;
    if(band(f)) return C.iron; if(Math.abs(f-0.5)<0.07&&fz>z1-1.6&&fz<z1-0.5) return fz<z1-1.2?C.ironK:C.tinD;   // the padlock
    return ((fz*1.25)%1)<0.1?C.woodK:(h2(Math.floor(f*4),Math.floor(fz))<60?C.woodD:C.wood); });
  quad(i1,j0,0,i1,j1,0,i1,j1,z1,i1,j0,z1,(x,y)=>{ faceI(i1,x,y); return band((roomsState.fa-j0)/(j1-j0))?C.iron:C.woodD; });
  quad(i0,j0,z1,i1,j0,z1,i1,j1,z1,i0,j1,z1,(x,y)=>{ floorAt(x,y,z1); const f=(roomsState.fa-i0)/(i1-i0); return band(f)?C.ironH:C.woodH; });
  isoLine(i0,j1,0,i1,j1,0,C.woodK); isoLine(i1,j0,0,i1,j1,0,C.woodK);
}
/** The oak door in a stone frame: planks, three iron straps with rivets, the grated judas, the lock box, the food flap.
 * @param {any} it */
function oakDoor(it){
  const a0=it.j, a1=it.j+itemH(it), Hd=15.2;
  quad(0.01,a0-0.32,0,0.01,a1+0.32,0,0.01,a1+0.32,Hd+1.4,0.01,a0-0.32,Hd+1.4,(x,y)=>{ faceI(0.01,x,y); const fa=roomsState.fa, fz=roomsState.fz;   // the stone frame
    if(fa>a0&&fa<a1&&fz<Hd) return 0; const n=h2(Math.floor(fz/2.6),Math.floor(fa*3)); return fz>Hd+0.9?C.stoneT:(n<90?C.stoneD:C.stone); });
  quad(0.02,a0,0,0.02,a1,0,0.02,a1,Hd,0.02,a0,Hd,(x,y)=>{ faceI(0.02,x,y); const u=(roomsState.fa-a0)/(a1-a0), z=roomsState.fz;
    if(u<0.04||u>0.96||z>Hd-0.35) return C.woodK;
    if(u>0.36&&u<0.64&&z>10.4&&z<13){ if(u<0.39||u>0.61||z<10.7||z>12.7) return C.iron; return ((u-0.39)%0.07<0.025)?C.ironH:C.ironK; }   // the judas grille
    if(u>0.3&&u<0.7&&z>6.6&&z<7.9) return z>7.7||z<6.8||u<0.32||u>0.68?C.ironH:C.iron;      // the food flap
    if(u>0.76&&u<0.92&&z>8.4&&z<10.6) return Math.abs(z-9.3)<0.25&&Math.abs(u-0.84)<0.02?C.ironK:C.iron;   // the lock box
    for(const sz of [2.4,8.0,13.6]) if(Math.abs(z-sz)<0.42){ return ((u*24)%1)<0.2&&Math.abs(z-sz)<0.18?C.rivet:C.iron; }   // straps
    const pl=Math.floor(u*5), e=u*5-pl; if(e<0.06) return C.woodK;
    const n=h2(pl*3,Math.floor(z*1.3)); return n<50?C.oakD:n>220?C.oakH:C.oak; });
  quad(0.05,a0,0.15,0.6,a0,0.15,0.6,a1,0.15,0.05,a1,0.15,(x,y)=>((x^y)&3)?C.stoneD:C.joint);   // the worn threshold
}

/** Draw a Ward item; false when it is not one. @param {any} it */
export function drawWardItem(it){
  switch(it.t){
    case 'cdoor': oakDoor(it); return true;
    case 'bunk': case 'bunk2': guardBed(it); return true;
    case 'cwc': barrel(it,4.2,C.filth,false); return true;
    case 'csink': if(!gymState.bunkFront){ barrel(it,3.3,C.water,true); const ci=it.i+itemW(it)/2, cj=it.j+itemH(it)/2; isoLine(ci+0.05,cj-0.05,3.4,ci+0.35,cj+0.2,1.8,C.tinD); } return true;   // and the ladle hooked on its rim
    case 'cwheel': bathChair(it); return true;
    case 'ccom': chest(it); return true;
    case 'cpull': case 'cfloor': case 'croach': return true;
    case 'cshadow': { const ci=it.i+itemW(it)/2, cj=it.j+itemH(it)/2;                      // the flags worn pale where he trains
      for(let k=0;k<40;k++){ const t=h2(k,3)/255*Math.PI*2, r=0.25+0.5*h2(k,5)/255; psetK(Math.round(isoX(ci+Math.cos(t)*r,cj+Math.sin(t)*r)),Math.round(isoY(ci+Math.cos(t)*r,cj+Math.sin(t)*r,0)),C.flag[3]); } return true; }
  }
  return false;
}

/** A blanket over the hero asleep on his pallet: the grey rag pulled up. @param {any} A the sleep activity */
export function wardBlanket(A){
  const ci=A.at[0], z=PALLET_Z+0.9;
  quad(ci-0.45,0.95,z,ci+0.45,0.95,z,ci+0.45,2.15,z-0.2,ci-0.45,2.15,z-0.2,(x,y)=>{ floorAt(x,y,z); return h2(Math.floor(roomsState.fa*9),Math.floor(roomsState.fz*7))<80?C.ragD:C.rag; });
  quad(ci-0.45,2.15,PALLET_Z,ci+0.45,2.15,PALLET_Z,ci+0.45,2.15,z-0.2,ci-0.45,2.15,z-0.2,()=>C.ragD);
}

/* ---------- life: rats, flies over the tub, drips, breath ---------- */

/** Before the lighting pass (they are lit with the room): rats along the walls, flies over the tub, drops from the vault. */
/** Flies circling a spot of the Ward (the tub, a man who stinks like it). @param {number} ci @param {number} cj @param {number} z @param {number} n */
export function wardFlies(ci,cj,z,n){
  const t=boxingState.tick;
  for(let k=0;k<n;k++){ const a=t*0.09*(1+k*0.13)+k*2, x=Math.round(isoX(ci,cj)+Math.cos(a)*(5+k*2)+Math.sin(t*0.31+k)*2), y=Math.round(isoY(ci,cj,z+k*0.8)+Math.sin(a*1.7)*3);
    pset(x,y,C.fly); if((t+k)&1) pset(x+1,y,C.fly); }
}

/** Draw one rat in the cell at isometric coordinates (R.i, R.j). @param {any} R @param {number} t */
function drawRat(R, t){
  const x = Math.round(isoX(R.i, R.j)), y = Math.round(isoY(R.i, R.j, 0));
  const dir = (R.fi - R.fj) >= 0 ? 1 : -1;
  const isMoving = R.wait === 0, sn = (R.wait > 0 && ((t >> 2) & 1)) ? 1 : 0, run = (t >> 1) & 1;
  const dot = (dx, dy, col) => pset(x + dx * dir, y + dy, col);

  // 1. Soft contact shadow on the flagstones
  dot(-1, 0, C.ratShadow);
  dot(0, 0, C.ratShadow);
  dot(1, 0, C.ratShadow);

  // 2. Scampering paws
  if(isMoving){
    dot((run ? 1 : 2), 0, C.ratPaws);
    dot((run ? -1 : -2), 0, C.ratPaws);
  } else {
    dot(1, 0, C.ratPaws);
    dot(-1, 0, C.ratPaws);
  }

  // 3. Body (lower belly and back)
  dot(-2, -1, C.ratDark);
  dot(-1, -1, C.rat);
  dot(0, -1, C.rat);
  dot(1, -1, C.rat);
  dot(-1, -2, C.ratH);  // dorsal highlight
  dot(0, -2, C.rat);

  // 4. Head, ear & glowing ruby eye
  dot(2, -1, C.ratSnout);
  dot(1, -2, C.ratEar);
  dot(2, -2, C.ratEye);

  // 5. Snout / twitching nose
  dot(3, -1 - sn, C.ratNose);

  // 6. Sinuous tail swaying behind the body
  const tw = t * 0.35 + (R.seed || 0);
  for(let k = 1; k <= 4; k++){
    const ty = -1 + Math.round(Math.sin(tw + k * 0.9) * (k * 0.32));
    dot(-2 - k, ty, k > 2 ? C.ratTT : C.ratT);
  }
}

export function wardLife(){
  const t = boxingState.tick, P = gymState.hubP;
  for(const R of state.rats){                                                                // a rat runs, stops, sniffs, runs on; bolts from the hero
    const near = Math.hypot(R.i - P.i, R.j - P.j) < 1.6;
    if(near && R.wait > 0) R.wait = 0;
    if(R.wait > 0){
      R.wait--;
    } else {
      const dx = R.ti - R.i, dj = R.tj - R.j, d = Math.hypot(dx, dj), sp = near ? 0.08 : 0.042;
      if(d < sp){
        R.i = R.ti; R.j = R.tj; R.k = (R.k + 1) % R.path.length; [R.ti, R.tj] = R.path[R.k];
        R.wait = near ? 0 : (16 + ((h2(R.k, t >> 4) & 31)));
      } else {
        R.i += (dx / d) * sp; R.j += (dj / d) * sp; R.fi = dx / d; R.fj = dj / d;
      }
    }
    drawRat(R, t);
  }
  const tub=gymState.cellList.find(x=>x.t==='cwc');
  if(tub) wardFlies(tub.i+itemW(tub)/2,tub.j+itemH(tub)/2,6,5);                              // flies over the tub
  for(const D of state.drips){ D.z-=D.v; D.v+=0.03; if(D.z<=0){ D.z=gymState.HUB_WH-3; D.v=0; D.i=1+h2(t,D.k)/255*10; D.j=0.6+h2(D.k,t)/255*5.6; }
    pset(Math.round(isoX(D.i,D.j)),Math.round(isoY(D.i,D.j,D.z)),C.drop); }
}
/** Breath in the cold: a little cloud now and then at the mouth of everyone awake. @param {any[]} people */
export function wardBreath(people){
  const t=boxingState.tick, M=rendererState.FB_MAIN, W=appearanceState.W, H=appearanceState.H;
  people.forEach((C0,k)=>{ if(!C0||C0.act==='lie') return; const ph=(t+k*41)%120; if(ph>40) return;
    const f=ph/40, hz=(C0.act==='sit'?14.6:16.8), x=isoX(C0.i+(C0.fi||0)*0.35,C0.j+(C0.fj||0)*0.35)+f*6, y=isoY(C0.i,C0.j,hz)-f*8;
    for(let dy=-3;dy<=3;dy++) for(let dx=-3;dx<=3;dx++){ const d=(dx*dx+dy*dy)/9; if(d>1) continue; const X=Math.round(x+dx*(1+f)), Y=Math.round(y+dy*(1+f)); if(X<0||Y<0||X>=W||Y>=H) continue;
      if(bay(X,Y)<(1-f)*(1-d)*7) M[Y*W+X]=mixC(M[Y*W+X],C.breath,0.5); } });
}
/** After the lighting pass: smog wisps creeping in through the slot. */
export function wardSmog(){
  const t=boxingState.tick, M=rendererState.FB_MAIN, W=appearanceState.W, H=appearanceState.H, Wn=WARD_WIN;
  for(let k=0;k<7;k++){ const f=((t*0.0016+k/7)%1), wi=(Wn.u0+Wn.u1)/12+Math.sin(k*2.3)*0.4, z=(Wn.z0+Wn.z1)/2-f*7, j=f*2.4;
    const x=isoX(wi,j)+Math.sin(t*0.01+k)*4, y=isoY(wi,j,z), R=6+f*14, a=0.22*Math.sin(Math.PI*f);
    for(let dy=-R;dy<=R;dy+=1) for(let dx=-R*1.6;dx<=R*1.6;dx+=1){ const d=(dx*dx/2.56+dy*dy)/(R*R); if(d>1) continue; const X=Math.round(x+dx), Y=Math.round(y+dy); if(X<0||Y<0||X>=W||Y>=H) continue;
      M[Y*W+X]=mixC(M[Y*W+X],C.smog,a*(1-d)*0.6); } }   /* soft, no dither */
}
/** The frame darkens towards its edges: the eye is pulled to the lamp and the people. */
export function wardVignette(){
  const M=rendererState.FB_MAIN, W=appearanceState.W, H=appearanceState.H;
  for(let y=0;y<H;y++){ const v=(y/H-0.48)*2; for(let x=0;x<W;x++){ const u=(x/W-0.5)*2, d=u*u*0.7+v*v; if(d<0.45) continue;
    const k=Math.max(0.5,1-(d-0.45)*0.6), p=y*W+x, c=M[p]; M[p]=(0xff000000|((((c>>16)&255)*k)<<16)|((((c>>8)&255)*k)<<8)|((c&255)*k))>>>0; } }
}

export function initialize(){
  Object.assign(C,{ceil:rgb('#050506'),vault:rgb('#0c0b0a'),sootD:rgb('#191612'),soot:rgb('#15120e'),
    ash:[rgb('#6a5d48'),rgb('#5a4f3d'),rgb('#7a6c54'),rgb('#4a4133')],joint:rgb('#28241d'),stone:rgb('#6e6350'),stoneD:rgb('#4e4538'),stoneT:rgb('#8a7c62'),
    lime:[rgb('#7e7864'),rgb('#6a6452'),rgb('#8e8872')],brick:[rgb('#5a3428'),rgb('#4a2a20'),rgb('#64402e')],mortar:rgb('#38322a'),
    damp:rgb('#2e342a'),mold:rgb('#1e2a22'),
    smog:rgb('#5e6450'),smogL:rgb('#7e826a'),iron:rgb('#2a2a2c'),ironH:rgb('#4a4a4e'),ironK:rgb('#121214'),rivet:rgb('#5e5e62'),
    wood:rgb('#4e3c28'),woodD:rgb('#3a2c1c'),woodH:rgb('#62503a'),woodK:rgb('#1c150e'),under:rgb('#100c08'),
    oak:rgb('#3e2e1e'),oakD:rgb('#2e2216'),oakH:rgb('#4e3c28'),
    flag:[rgb('#4a4640'),rgb('#423e38'),rgb('#3a3731'),rgb('#575249')],fjoint:rgb('#1e1c19'),wet:rgb('#2c3232'),wetH:rgb('#6a7474'),
    piss:rgb('#5a5626'),pissH:rgb('#8a844a'),straw:rgb('#8a7a44'),strawD:rgb('#6a5c30'),dirt:rgb('#24201a'),
    tick:rgb('#5e5844'),tickS:rgb('#4e4936'),tickH:rgb('#6e6850'),tickD:rgb('#3a3526'),rag:rgb('#4a4842'),ragD:rgb('#38362f'),
    tin:rgb('#7a7e80'),tinH:rgb('#a4a8aa'),tinD:rgb('#565a5c'),crust:rgb('#4a3018'),crumb:rgb('#6a4a28'),book:rgb('#1a1612'),gilt:rgb('#6a5a2a'),page:rgb('#8a8268'),
    filth:rgb('#2e2612'),liqH:rgb('#5a5228'),water:rgb('#2e3a3c'),wicker:rgb('#6e5a36'),wickerD:rgb('#4e3e22'),
    scratch:rgb('#857e69'),scratchD:rgb('#3a352a'),
    ratShadow:rgb('#14100c'),ratDark:rgb('#241e18'),rat:rgb('#3d3228'),ratH:rgb('#5a4c3e'),
    ratSnout:rgb('#70564a'),ratNose:rgb('#9c6e66'),ratEye:rgb('#d82818'),ratEar:rgb('#78564c'),
    ratPaws:rgb('#58443c'),ratT:rgb('#5e4840'),ratTT:rgb('#7c6258'),
    fly:rgb('#0e0e0e'),drop:rgb('#8a9a9a'),breath:rgb('#c8ccc4')});
  state.rats=[
    {path:[[1.4,2.7],[3.6,2.8],[5.4,3.3],[7.8,3.5],[9.8,3.8],[10.2,5.0],[8.0,5.2],[5.0,4.6],[2.2,5.2],[1.4,6.2],[0.8,4.2]],k:0,seed:0}
  ];
  for(const R of state.rats){
    [R.i,R.j]=R.path[R.k];
    const next=(R.k+1)%R.path.length;
    [R.ti,R.tj]=R.path[next];
    R.wait=20; R.fi=1; R.fj=0;
  }
  state.drips=[0,1,2].map(k=>({k,i:2+k*3,j:1+k,z:10+k*4,v:0}));
}

/** The Ward is still drawn in code; the painted plate (ward-plate.js) is not wired in yet. */
export function wardPainted(){ return false; }

````

---

## `src/exercise-yard.js`

````js
/* The Exercise Yard — Newgate, 1868: a well of soot-black brick. The walls rise out of the picture, crowned with iron
   spikes and arched grilles against a sky drowned in smog; the setts are wet; three rings of stone flags are let into
   them. The prisoners walk the outer ring in single file and in step, every one of them in the same grey canvas hood
   with two slits for the eyes — identical mannequins; their breath comes through the cloth. Two turnkeys watch from
   the middle and the gate. Drawn in the 2× frame; the walkers keep the old yard people (YN, so the fights still work). */

import { state as gymState, quad, isoLine, isoLineThin, isoX, isoY, shadeC, psetK } from './gym.js';
import { state as appearanceState, rgb } from './appearance.js';
import { state as rendererState, pset } from './renderer.js';
import { state as boxingState, h2 } from './boxing.js';
import { state as roomsState, skyBucket, faceI } from './rooms.js';
import { skyColors, weatherNow } from './weather.js';

// Runtime values owned by exercise-yard; initialized explicitly by main.js.
export const state = {};

/** The yard: 12 × 10 tiles (npcs.YARD_W / YARD_H), walls this high (they leave the top of the picture). */
const YW = 12, YH = 10;
export const EY_WH = 40;
/** The rings of flags (centre, band radii) and the walking ring. */
export const RING_C = [6, 5];
const RINGS = [[1.15,1.6],[2.55,3.0],[3.95,4.5]];
export const WALK_R = 4.22;
/** Walking speed along the ring (tiles per tick): a slow, dragging step. */
export const WALK_SP = 0.0055;

export function exerciseLayout(){ return [{t:'ydoor',i:0,j:1.1,w:0.3,h:1.5},{t:'ydrain',i:RING_C[0]-0.3,j:RING_C[1]-0.3,w:0.6,h:0.6}]; }

/** A point on the walking ring at arc length s: [i, j, facing i, facing j] (anticlockwise as seen from above). @param {number} s */
export function ringPos(s){ const a=s/WALK_R; return [RING_C[0]+Math.cos(a)*WALK_R,RING_C[1]+Math.sin(a)*WALK_R,-Math.sin(a),Math.cos(a)]; }

const C = {};
const bay=(/** @type {number} */ x,/** @type {number} */ y)=>gymState.BAYER[(y&3)*4+(x&3)];
/** @param {number} c @param {number} t @param {number} k */
function mixC(c,t,k){ const ch=(/** @type {number} */ s)=>Math.round(((c>>s)&255)*(1-k)+((t>>s)&255)*k); return (0xff000000|(ch(16)<<16)|(ch(8)<<8)|ch(0))>>>0; }

/** Cell windows high in the walls, looking down on the yard: [right wall?, u, z]. */
const SLITS = [[true,14,19],[true,34,19],[true,54,19],[false,22,19],[false,44,19],[true,24,25.5],[true,44,25.5],[false,32,25.5]];

/** A yard wall. a: tiles along the wall, z: height (above EY_WH: the spikes and the grille, else sky = 0). @param {number} a @param {number} z @param {number} x @param {number} y @param {boolean} right */
function wallCol(a,z,x,y,right){
  const lim=right?YW:YH, u=a*6; if(a>lim-0.02) return 0;
  if(z>EY_WH){                                                                                // iron against the sky
    const h=z-EY_WH, pu=u%1.5;
    if(h<0.6) return C.ironH;                                                                 // the rail on the coping
    if(h<3.6&&pu<0.32) return h>3.0?(pu<0.16?C.ironH:C.iron):C.iron;                          // spikes
    if(h>=3.6&&h<3.9&&pu<0.5) return C.iron;
    const span=12, t=((u%span)/span-0.5)*2, ah=3.2+2.6*Math.sqrt(Math.max(0,1-t*t));             // arched grilles between the posts
    if(Math.abs(h-ah)<0.35) return C.iron;
    if(h<ah&&h>3.2&&(u%span)%2<0.28) return C.iron;
    if(Math.abs(u%span)<0.4&&h<6.2) return C.ironH;                                           // the posts
    return 0; }
  if(z>EY_WH-1.0) return z>EY_WH-0.35?C.copeT:C.cope;                                          // stone coping
  for(const [r,su,sz] of SLITS) if(r===right&&Math.abs(u-su)<0.9&&z>sz&&z<sz+3.4){              // a barred cell window
    if(Math.abs(u-su)>0.7||z<sz+0.3) return C.stoneD; return Math.abs(u-su)<0.15?C.iron:(h2(su,sz|0)<60&&bay(x,y)<2?C.lamp:C.dark); }
  const pil=((u+1.5)%18)<2.4;                                                                  // brick piers every three tiles
  if(right&&Math.abs(u-63)<0.35&&z<EY_WH-1){ return ((z*1.2)|0)%5===0?C.ironH:(u<63?C.rustD:C.rust); }   // a rusted downpipe
  if(z<3.6){ const n=h2(Math.floor((u+(right?0:5))/4),Math.floor(z/1.8)); let c=(((u+(Math.floor(z/1.8)&1)*2)/4)%1<0.06||(z/1.8)%1<0.08)?C.joint:(n<80?C.stoneD:C.stone);   // the plinth
    if(z<1.6&&(1.6-z)*9>bay(x,y)) c=h2(Math.floor(u*2),Math.floor(z*3))<90?C.slime:mixC(c,C.slime,0.5); return c; }
  const br=Math.floor((z-3.6)/1.1), bu=(u+(br&1)*1.1)/2.2, fb=bu-Math.floor(bu), fz=(z-3.6)/1.1-br, n=h2(Math.floor(bu)+(right?40:7),br);
  let c=(fz<0.13||fb<0.07)?C.mortar:C.brick[n%3];
  if(pil) c=shadeC(c,((u+1.5)%18)<0.6?0.7:1.08);
  const streak=h2(Math.floor(u*0.9)+(right?3:9),5); if(streak<70) c=mixC(c,C.soot,0.35+0.4*(z/EY_WH));          // soot run down from the top
  if(h2(Math.floor(u*1.6)+21,Math.floor(z*0.5))<18) c=mixC(c,C.salt,0.5);                     // white salts weeping out
  c=mixC(c,C.soot,Math.min(0.78,0.28+z/EY_WH*0.55));                                             // blacker as it rises
  if(a<0.3) c=shadeC(c,0.72);
  return c;
}

/** Smooth value noise 0..1 (bilinear between hashed corners). @param {number} x @param {number} y */
function vnoise(x,y){ const X=Math.floor(x), Y=Math.floor(y), fx=x-X, fy=y-Y, sx=fx*fx*(3-2*fx), sy=fy*fy*(3-2*fy), n=(/** @type {number} */ a,/** @type {number} */ b)=>h2(a,b)/255;
  return (n(X,Y)*(1-sx)+n(X+1,Y)*sx)*(1-sy)+(n(X,Y+1)*(1-sx)+n(X+1,Y+1)*sx)*sy; }

/** The setts, the three rings of flags, the drain; wet and dark at the walls. @param {number} x @param {number} y */
function floorCol(x,y){
  const a=(x-gymState.HUB_OX)/6, b=(y-gymState.HUB_OY)/3, i=(a+b)/2, j=(b-a)/2;
  if(i<0||j<0||i>YW||j>YH) return 0;
  const r=Math.hypot(i-RING_C[0],j-RING_C[1]), ang=Math.atan2(j-RING_C[1],i-RING_C[0]);
  let c=0;
  for(const [r0,r1] of RINGS) if(r>=r0&&r<=r1){                                               // a ring of flags
    const seg=Math.max(8,Math.round(r*7)), sa=(ang/(Math.PI*2)+0.5)*seg, fa=sa-Math.floor(sa), n=h2(Math.floor(sa)+Math.round(r0*10),3);
    if(fa<0.05||r-r0<0.05||r1-r<0.05) c=C.joint; else { c=C.flag[n%3]; if(Math.abs(r-WALK_R)<0.18&&r0>3) c=bay(x,y)<9?C.flagW:c; }   // worn pale where the feet go
    break; }
  if(!c){ const row=Math.floor(j/0.34), si=(i+(row&1)*0.2)/0.4, fi=si-Math.floor(si), fj=j/0.34-row, n=h2(Math.floor(si)*3+row,row*7);   // setts
    const d=Math.hypot((fi-0.5)*1.1,fj-0.5); c=d>0.46?C.mud:(n<70?C.sett[1]:n>220?C.sett[2]:C.sett[0]);
    if(d<0.2&&fi<0.45&&bay(x,y)<4) c=C.settH; }                                                // the wet top of each stone
  const pn=vnoise(i*0.9+3,j*0.9+7)*0.7+vnoise(i*2.3,j*2.3)*0.3;                             // irregular puddles holding the grey sky
  if(pn>0.66) c=pn<0.68?C.wetH:mixC(c,C.wet,0.7);
  const e=Math.min(i,j); if(e<1.1&&(1-e/1.1)*13>bay(x,y)) c=shadeC(c,0.6);                     // black at the foot of the walls
  return c;
}

/** Build the yard into the background: smog sky, the two walls with their iron, the floor, the flat items. @param {(it:any)=>void} drawFlat */
export function buildExerciseYard(drawFlat){
  const fb=rendererState.fb, W=appearanceState.W, H=appearanceState.H, OX=gymState.HUB_OX, OY=gymState.HUB_OY, K=gymState.ISO_K, b=skyBucket();
  roomsState.homeSkyB=b; const S=skyColors(b,roomsState.SKY[b]), s0=mixC(rgb(S[0]),C.smog,0.7), s1=mixC(rgb(S[1]),C.smogL,0.6);
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const t=y/(H*0.4); fb[y*W+x]=t<1&&bay(x,y)<t*16?s1:t<1?s0:s1; }
  const WT=EY_WH+7;
  quad(0,0,0,0,YH,0,0,YH,WT,0,0,WT,(x,y)=>{ const j=(OX-x)/6, z=OY+j*3-y; return wallCol(j,z,x,y,false); });
  quad(0,0,0,YW,0,0,YW,0,WT,0,0,WT,(x,y)=>{ const i=(x-OX)/6, z=OY+i*3-y; return wallCol(i,z,x,y,true); });
  isoLine(0,0,0,0,0,EY_WH,C.joint);
  quad(0,0,0,YW,0,0,YW,YH,0,0,YH,0,floorCol);
  isoLine(0,YH,0,YW,YH,0,appearanceState.C_FLOOR_EDGE); isoLine(YW,0,0,YW,YH,0,appearanceState.C_FLOOR_EDGE);
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const p=y*W+x; if(fb[p]!==s0&&fb[p]!==s1) continue;   /* below the wall tops nothing is sky: the dark around the room */
    const nx=x/K, top=(nx<=OX?OY+(OX-nx)/6*3:OY+(nx-OX)/6*3)-WT; if(y/K>top) fb[p]=C.void; }
  for(const it of gymState.yardList) if(gymState.GYM_TYPES[it.t].flat) drawFlat(it);
}

/** The yard's own items; false for anything else. @param {any} it */
export function drawExerciseItem(it){
  if(it.t==='ydrain'){ const ci=it.i+0.3, cj=it.j+0.3;                                         // a round iron drain in the middle
    quad(ci-0.28,cj-0.28,0,ci+0.28,cj-0.28,0,ci+0.28,cj+0.28,0,ci-0.28,cj+0.28,0,(x,y)=>{ const a=(x-gymState.HUB_OX)/6, b=(y-gymState.HUB_OY)/3, i=(a+b)/2, j=(b-a)/2, d=Math.hypot(i-ci,j-cj);
      if(d>0.28) return 0; if(d>0.22) return C.ironH; return ((i-ci)*14|0)&1?C.iron:C.dark; }); return true; }
  if(it.t==='ydoor'){ const a0=it.j, a1=it.j+1.5, Hd=17;                                        // the gate: oak, iron straps, an arched head
    quad(0.01,a0-0.4,0,0.01,a1+0.4,0,0.01,a1+0.4,Hd+2.4,0.01,a0-0.4,Hd+2.4,(x,y)=>{ faceI(0.01,x,y); const fa=roomsState.fa, fz=roomsState.fz, u=(fa-a0)/(a1-a0);
      const top=Hd+Math.sqrt(Math.max(0,1-(u*2-1)**2))*1.8;
      if(u>0&&u<1&&fz<top){ if(fz>top-0.3) return C.ironK;
        for(const sz of [3,9,15]) if(Math.abs(fz-sz)<0.45) return ((u*20)%1)<0.22?C.ironH:C.iron;
        if(u>0.4&&u<0.6&&fz>11.5&&fz<13) return ((u*40)|0)&1?C.dark:C.iron;                   // the grated judas
        const pl=Math.floor(u*6), e=u*6-pl; return e<0.07?C.ironK:(h2(pl,Math.floor(fz*1.2))<50?C.oakD:C.oak); }
      return fz>top+1.6?C.copeT:(h2(Math.floor(fz/2.2),Math.floor(fa*3))<90?C.stoneD:C.stone); });   // the stone surround
    return true; }
  return false;
}

/** After the light: the smog lies thicker further back (higher in the picture) and drifts. */
export function yardFog(){
  const M=rendererState.FB_MAIN, W=appearanceState.W, H=appearanceState.H, t=boxingState.tick, wx=weatherNow(), base=wx==='sun'?0.16:wx==='cloud'?0.28:0.24;
  const G=36, gw=Math.ceil(W/G)+2, gh=Math.ceil(H/G)+2, ox=t*0.08, cx=Math.floor(ox/G), N=state.noise;
  for(let gy=0;gy<gh;gy++) for(let gx=0;gx<gw;gx++) N[gy*gw+gx]=h2(gx+cx,gy+3)/255;
  const fr=C.fog&255, fg=(C.fog>>8)&255, fbl=(C.fog>>16)&255;
  for(let y=0;y<H;y++){ const depth=Math.max(0,1.15-y/H), v=y/G, vy=Math.floor(v), fy=v-vy;
    for(let x=0,p=y*W;x<W;x++,p++){ const u=(x+ox)/G-cx, ux=Math.floor(u), fx=u-ux, q=vy*gw+ux;
      const n=(N[q]*(1-fx)+N[q+1]*fx)*(1-fy)+(N[q+gw]*(1-fx)+N[q+gw+1]*fx)*fy, a=Math.min(0.7,base*depth*(0.55+0.9*n)), o=M[p];
      M[p]=(0xff000000|((((o>>16)&255)+(fbl-((o>>16)&255))*a)<<16)|((((o>>8)&255)+(fg-((o>>8)&255))*a)<<8)|((o&255)+(fr-(o&255))*a))>>>0; } }
}

export function initialize(){
  Object.assign(C,{smog:rgb('#5c5e4c'),smogL:rgb('#7a7a62'),fog:rgb('#6e705e'),
    iron:rgb('#1c1c1e'),ironH:rgb('#3a3a3e'),ironK:rgb('#0e0e10'),rust:rgb('#5a3420'),rustD:rgb('#3e2416'),
    cope:rgb('#4a463e'),copeT:rgb('#625e54'),stone:rgb('#4e4a42'),stoneD:rgb('#3a3731'),joint:rgb('#1e1c19'),slime:rgb('#26301e'),
    brick:[rgb('#4a2e24'),rgb('#3e261e'),rgb('#54362a')],mortar:rgb('#2a2622'),soot:rgb('#141210'),salt:rgb('#8a8678'),
    dark:rgb('#0a0a0c'),void:rgb('#050506'),lamp:rgb('#a07a3a'),
    flag:[rgb('#5a564c'),rgb('#524e45'),rgb('#4a463e')],flagW:rgb('#6e695c'),sett:[rgb('#3e3c38'),rgb('#36342f'),rgb('#46433d')],settH:rgb('#5c5a54'),mud:rgb('#221f1a'),
    wet:rgb('#2a2e2e'),wetH:rgb('#6a706c'),oak:rgb('#3a2c1e'),oakD:rgb('#2a2016')});
  state.noise=new Float32Array(256);
}

````

---

## `src/bath.js`

````js
/* The Bathhouse — Newgate, 1868: the evening wash, 19:00–19:40, in a low barrel-vaulted cellar. Rough stone walls under
   a black, sweating brick vault (the end wall is the vault's arch); a row of zinc tubs like troughs, each in a stall of
   bare planks without a door so that the turnkey on his podium sees every man; a gutter cut into the flags carries the
   grey water to an iron drain. The water is never changed: murky, with a skin of tallow and carbolic soap. Gas sconces
   barely get through the steam — each one a smudge of light in the fog; everything smells of carbolic (a yellow-green
   cast over the frame). The yard men soak in the tubs (bare to the waist above the water), wait in towels or sit on the
   benches; a fight with any of them (venue 'laznia': steam and noise, fewer eyes). */

import { state as gymState, isoLine, isoX, isoY, quad, shadeC, itemW, itemH, mkItem } from './gym.js';
import { rgb, state as appearanceState } from './appearance.js';
import { state as roomsState, floorAt, faceI, faceJ, solidDraw, startActivity, goRoom, skyBucket } from './rooms.js';
import { state as rendererState, pset } from './renderer.js';
import { state as boxingState, h2 } from './boxing.js';
import { state as npcsState } from './npcs.js';
import { state as sparringState, startSpar, oppStars } from './sparring.js';
import { spendAction } from './simulation.js';
import { prisonGate, useSoap, prisonFightStart, prisonFightExtras, listTag } from './prison.js';

// Runtime values owned by bath; initialized explicitly by main.js.
export const state = {};

export const BATH_W = 10, BATH_H = 7;
/** The stalls along the back wall (j = 0): left edge of the first, width of each; the tub centres (one man to a tub). */
const STALL_I0 = 1.85, STALL_W = 1.6, STALL_J = 2.3;
export const SHOWERS = [0,1,2,3,4].map(k=>STALL_I0+STALL_W*(k+0.5));
/** A tub: half width (i), its length along j, the rim and the grey water; the depth a man sinks to (z0). */
const TUB_R = 0.5, TUB_J0 = 0.28, TUB_J1 = 2.02, RIM_Z = 4.2, WATER_Z = 3.5, SOAK_Z = -4.2, SOAK_J = 1.3, PART_Z = 8.6;
/** Who soaks in which tub (yard inmate → tub); tub 1 is left for the hero; who sits on the benches; the last one waits. */
const AT_TUB = [[0,0],[1,2],[2,3],[3,4]], ON_BENCH = [5,6];
/** The gutter along the stalls and the drain it runs to. */
const GUT_J0 = 2.5, GUT_J1 = 2.78, DRAIN = [9.72,2.64];
/** The vault: the walls rise to the springing, above it the brick barrel; on the end wall (i = 0) the arch itself. */
const SPRING_Z = 13.2;
/** Gas sconces: [i, j, z]. */
/** The three gas lamps [i, j, height]; the fighters are lit from the nearest. */
export const LAMPS = [[0.12,4.55,11.8],[SHOWERS[0]+STALL_W/2,0.12,12.2],[SHOWERS[3]+STALL_W/2,0.12,12.2]];
/** The turnkey's podium. */
const POD = {i:0.15,j:2.7,w:1.35,h:1.6,z:3.0};

export function bathLayout(){
  const out=[{t:'ldoor',i:0,j:5.0,w:0.3,h:1.5},{t:'lpod',i:POD.i,j:POD.j,w:POD.w,h:POD.h}];
  for(let k=0;k<5;k++) out.push({t:'lshower',i:STALL_I0+STALL_W*k,j:0.06,w:STALL_W,h:STALL_J,v:k});
  out.push({t:'lbench',i:3.0,j:5.65,w:2.2,h:0.5},{t:'lbench',i:6.4,j:5.65,w:2.2,h:0.5});
  return out;
}

/* ---------- the room shell ---------- */

const C={};
const bay=(/** @type {number} */ x,/** @type {number} */ y)=>gymState.BAYER[(y&3)*4+(x&3)];
/** @param {number} c @param {number} t @param {number} k */
function mixC(c,t,k){ const ch=(/** @type {number} */ s)=>Math.round(((c>>s)&255)*(1-k)+((t>>s)&255)*k); return (0xff000000|(ch(16)<<16)|(ch(8)<<8)|ch(0))>>>0; }
/** Height of the vault's arch on the end wall at j. @param {number} j */
const archZ=(j)=>SPRING_Z+(gymState.HUB_WH-1.5-SPRING_Z)*Math.sqrt(Math.max(0,1-((j-BATH_H/2)/(BATH_H/2))**2));

/** @param {number} a along the wall @param {number} z height @param {number} x @param {number} y @param {boolean} right the long back wall (j = 0) */
function wallCol(a,z,x,y,right){
  const lim=right?BATH_W:BATH_H, u=a*6; if(a>lim-0.06) return C.ceil;
  const top=right?gymState.HUB_WH-0.8:archZ(a);
  if(z>top) return C.ceil;
  if(!right&&z>top-0.7) return z>top-0.3?C.brickK:C.stoneT;                                   // the arch's ring of voussoirs
  if(z>SPRING_Z){                                                                            // wet black brick of the vault
    const br=Math.floor((z-SPRING_Z)/0.9), bu=(u+(br&1)*1.0)/2.0, fb=bu-Math.floor(bu), fz=(z-SPRING_Z)/0.9-br;
    let c=(fz<0.14||fb<0.08)?C.mortar:C.brick[h2(Math.floor(bu),br)%3];
    if(right) c=mixC(c,C.ceil,Math.min(0.85,(z-SPRING_Z)/(gymState.HUB_WH-SPRING_Z)*0.95));   // the barrel curving away overhead
    if(h2(Math.floor(u*2),Math.floor(z*1.5))<4) c=C.wetV;                                     // sweat on the brick
    return c; }
  if(z>SPRING_Z-0.6) return z>SPRING_Z-0.2?C.stoneT:C.stoneD;                                  // the springing course
  // rough coursed rubble, limewash gone grey and peeling, green and black at the foot
  const row=Math.floor(z/1.9), fz=z/1.9-row, bu=(u+(row*2.3)%3)/(2.2+(h2(row,7)&3)*0.4), col=Math.floor(bu), fu=bu-col, n=h2(col*5+(right?2:9),row*11);
  let c=(fz<0.1||fu<0.05)?C.joint:(n<80?C.rub[1]:n>210?C.rub[2]:C.rub[0]);
  if(h2(Math.floor(u/3)+(right?4:8),Math.floor(z/3))>150&&!(fz<0.1||fu<0.05)) c=mixC(c,C.lime,0.55);   // what is left of the limewash
  if(z<3.2&&(3.2-z)*5>bay(x,y)) c=h2(Math.floor(u*2),Math.floor(z*2))<110?C.slime:mixC(c,C.slime,0.55);
  if(h2(Math.floor(u*1.3)+(right?1:5),3)<40&&z<SPRING_Z-1) c=mixC(c,C.damp,0.4);              // runs from the vault
  for(const L of LAMPS){ const lr=right?L[1]<0.5:L[0]<0.5; if(!lr) continue; const lu=(right?L[0]:L[1])*6, dz=z-L[2];
    if(dz>0.6&&Math.abs(u-lu)<0.8+dz*0.2&&(1-Math.abs(u-lu)/(0.8+dz*0.2))*12>bay(x,y)) c=mixC(c,C.soot,0.6); }   // soot over each gas jet
  if(!right){                                                                                // hooks with the men's clothes, left of the podium
    if(a>0.4&&a<2.45&&z>12.0&&z<12.7) return z>12.5?C.woodL:C.wood;
    for(let k=0;k<4;k++){ const hx=0.7+k*0.5; if(Math.abs(a-hx)<0.035&&z>11.3&&z<12.2) return C.iron;
      if(Math.abs(a-hx)<0.2&&z>(k&1?6.2:7.4)&&z<11.4){ const e=Math.abs(a-hx)>0.16||z<(k&1?6.5:7.7); return e?C.joint:(k===2?(Math.abs(z-8.6)<0.25?C.stripe:C.towel):(Math.abs(a-hx)<0.04?C.coatD:C.coat)); } } }
  if(a<0.25) c=shadeC(c,0.7);
  return c;
}

/** The floor: worn wet flags, soap scum, the gutter and its drain, black along the walls. @param {number} x @param {number} y */
function floorCol(x,y){
  const a=(x-gymState.HUB_OX)/6, b=(y-gymState.HUB_OY)/3, i=(a+b)/2, j=(b-a)/2;
  if(i<0||j<0||i>BATH_W||j>BATH_H) return 0;
  const row=Math.floor(j/1.2), off=h2(row,9)/255*1.4, si=(i+off)/1.7, fi=si-Math.floor(si), fj=j/1.2-row, n=h2(Math.floor(si)*3+row*13,row);
  let c=(fj<0.05||fi<0.035)?C.fjoint:C.flag[n%3];
  c=mixC(c,C.wet,0.35);
  if(j>GUT_J0&&j<GUT_J1&&i>STALL_I0-0.25){ const e=Math.min(j-GUT_J0,GUT_J1-j); c=e<0.04?C.stoneD:(bay(x,y)<3?C.greyH:C.grey); }   // the gutter, grey water in it
  const d=Math.hypot(i-DRAIN[0],(j-DRAIN[1])*1.2);
  if(d<0.3){ c=d>0.24?C.iron:(((i-DRAIN[0])*16|0)&1?C.ironK:C.iron); }
  if(j<GUT_J0&&j>2.0&&h2(Math.floor(i*20),Math.floor(j*20))<18) c=C.scum;                    // soap scum slopped over the rims
  const X=i*1.1+3, Y=j*1.1+9, xi=Math.floor(X), yi=Math.floor(Y), fx=X-xi, fy=Y-yi, sx=fx*fx*(3-2*fx), sy=fy*fy*(3-2*fy), nn=(/** @type {number} */ a,/** @type {number} */ b)=>h2(a,b)/255;
  const pn=(nn(xi,yi)*(1-sx)+nn(xi+1,yi)*sx)*(1-sy)+(nn(xi,yi+1)*(1-sx)+nn(xi+1,yi+1)*sx)*sy;   // standing water in the hollows
  if(pn>0.62&&!(j>GUT_J0&&j<GUT_J1)) c=mixC(c,C.grey,pn>0.66?0.6:0.3);
  const e=Math.min(i,j); if(e<0.9&&(1-e/0.9)*12>bay(x,y)) c=shadeC(c,0.6);
  return c;
}

export function buildBath(){
  rendererState.fb=gymState.bgHub; roomsState.homeSkyB=skyBucket();
  const fb=rendererState.fb, W=appearanceState.W, H=appearanceState.H, OX=gymState.HUB_OX, OY=gymState.HUB_OY, WH=gymState.HUB_WH;
  for(let k=0;k<W*H;k++) fb[k]=C.ceil;
  quad(0,0,0,0,BATH_H,0,0,BATH_H,WH,0,0,WH,(x,y)=>{ const j=(OX-x)/6, z=OY+j*3-y; return wallCol(j,z,x,y,false); });
  quad(0,0,0,BATH_W,0,0,BATH_W,0,WH,0,0,WH,(x,y)=>{ const i=(x-OX)/6, z=OY+i*3-y; return wallCol(i,z,x,y,true); });
  quad(0,0,0,BATH_W,0,0,BATH_W,BATH_H,0,0,BATH_H,0,floorCol);
  for(const L of LAMPS) sconce(L);
  for(const it of gymState.gymItems) if(gymState.GYM_TYPES[it.t].flat) drawBathItem(it);
  isoLine(0,BATH_H,0,BATH_W,BATH_H,0,appearanceState.C_FLOOR_EDGE); isoLine(BATH_W,0,0,BATH_W,BATH_H,0,appearanceState.C_FLOOR_EDGE);
  rendererState.fb=rendererState.FB_MAIN;
}
/** A gas sconce: a brass arm out from the wall (the flame in its glass is drawn live). @param {number[]} L */
function sconce(L){
  const [i,j,z]=L, back=j<0.5, ai=back?i:0.02, aj=back?0.02:j, ei=i+(back?0:0.35), ej=j+(back?0.35:0);
  isoLine(ai,aj,z-1.4,ei,ej,z-0.4,C.brass); isoLine(ei,ej,z-0.4,ei,ej,z,C.brassH);
}

/* ---------- items ---------- */

/** A stall: the plank partition on its right (and the first one's left), the zinc tub with its grey water.
 * In the front layer (over a man in the tub): the tub's near sides and rim, the right partition. @param {any} it */
function stall(it){
  const i0=it.i, i1=it.i+itemW(it), ci=(i0+i1)/2, FO=gymState.bunkFront, k=it.v;
  const part=(/** @type {number} */ pi)=>quad(pi,0.05,0,pi,STALL_J,0,pi,STALL_J,PART_Z,pi,0.05,PART_Z,(x,y)=>{ faceI(pi,x,y); const j=roomsState.fa, z=roomsState.fz;   // bare planks, uneven tops
    if(z>PART_Z-0.5-((h2(Math.floor(j*3),k)&3)*0.15)) return 0; const pl=Math.floor(j/0.38), e=j/0.38-pl; if(e<0.08) return C.woodK;
    if(z<1.2) return C.woodK; return h2(pl,Math.floor(z*1.4)+k)<60?C.woodD:(h2(pl+3,Math.floor(z*0.5))<30?C.slimeW:C.wood); });
  const post=(/** @type {number} */ pi)=>isoLine(pi,STALL_J,0,pi,STALL_J,PART_Z-0.3,C.woodK);
  const i0t=ci-TUB_R, i1t=ci+TUB_R;
  const side=(/** @type {number} */ z,/** @type {number} */ u)=>{ if(z>RIM_Z-0.35) return C.zincH; if(Math.abs(z-1.2)<0.25) return C.zincD;   // rolled rim, a seam
    return h2(Math.floor(u*16),Math.floor(z*2))<26?C.rust:(h2(Math.floor(u*5)+3,Math.floor(z))<40?C.zincD:C.zinc); };
  if(!FO){
    if(k===0){ part(i0); post(i0); }
    quad(i0t,TUB_J0,RIM_Z,i1t,TUB_J0,RIM_Z,i1t,TUB_J1,RIM_Z,i0t,TUB_J1,RIM_Z,(x,y)=>{ floorAt(x,y,RIM_Z); const fi=roomsState.fa, fj=roomsState.fz;   // the inside: the far rims
      if(fi<i0t+0.08||fj<TUB_J0+0.08) return C.zincD; return 0; });
    quad(i0t+0.07,TUB_J0+0.07,WATER_Z,i1t-0.07,TUB_J0+0.07,WATER_Z,i1t-0.07,TUB_J1-0.07,WATER_Z,i0t+0.07,TUB_J1-0.07,WATER_Z,(x,y)=>{ floorAt(x,y,WATER_Z); const fi=roomsState.fa, fj=roomsState.fz;
      const n=h2(Math.floor(fi*18)+k*7,Math.floor(fj*18)); return n<40?C.scum:n<70?C.greyH:(h2(Math.floor(fi*5),Math.floor(fj*5))<60?C.greyD:C.grey); });   // grey water, a skin of tallow
  }
  quad(i0t,TUB_J1,0,i1t,TUB_J1,0,i1t,TUB_J1,RIM_Z,i0t,TUB_J1,RIM_Z,(x,y)=>{ faceJ(TUB_J1,x,y); return side(roomsState.fz,roomsState.fa); });   // the near end
  quad(i1t,TUB_J0,0,i1t,TUB_J1,0,i1t,TUB_J1,RIM_Z,i1t,TUB_J0,RIM_Z,(x,y)=>{ faceI(i1t,x,y); return shadeC(side(roomsState.fz,roomsState.fa),0.82); });
  isoLine(i0t,TUB_J1,RIM_Z,i1t,TUB_J1,RIM_Z,C.zincH); isoLine(i1t,TUB_J0,RIM_Z,i1t,TUB_J1,RIM_Z,C.zincH);
  isoLine(ci-0.1,TUB_J1,0.6,ci-0.1,TUB_J1+0.12,0.4,C.iron);                                   // the plug's spout into the gutter
  part(i1); post(i1);
}
/** The turnkey's podium: planks on posts, a rail round it, two steps. @param {any} it */
function podium(it){
  const i0=it.i, j0=it.j, i1=it.i+itemW(it), j1=it.j+itemH(it), z=POD.z, FO=gymState.bunkFront;
  if(!FO){
    quad(i0,j1,0,i1,j1,0,i1,j1,z,i0,j1,z,(x,y)=>{ faceJ(j1,x,y); return ((roomsState.fz*2)%1)<0.12?C.woodK:C.woodD; });
    quad(i1,j0,0,i1,j1,0,i1,j1,z,i1,j0,z,(x,y)=>{ faceI(i1,x,y); return ((roomsState.fz*2)%1)<0.12?C.woodK:shadeC(C.woodD,0.85); });
    quad(i0,j0,z,i1,j0,z,i1,j1,z,i0,j1,z,(x,y)=>{ floorAt(x,y,z); return ((roomsState.fa*3)%1)<0.08?C.woodK:C.wood; });
    for(let s=0;s<2;s++){ const si=i1+0.25*(2-s), sz=z*(s+1)/3; quad(i1,j0+0.3,sz,si,j0+0.3,sz,si,j0+1.0,sz,i1,j0+1.0,sz,()=>C.woodL); quad(si,j0+0.3,0,si,j0+1.0,0,si,j0+1.0,sz,si,j0+0.3,sz,()=>C.woodD); } }
  for(const [pi,pj] of [[i0+0.08,j1-0.08],[i1-0.08,j1-0.08],[i1-0.08,j0+0.08]]) isoLine(pi,pj,z,pi,pj,z+5.2,C.woodK);   // the rail
  isoLine(i0+0.08,j1-0.08,z+5.0,i1-0.08,j1-0.08,z+5.0,C.wood); isoLine(i1-0.08,j1-0.08,z+5.0,i1-0.08,j0+0.08,z+5.0,C.wood);
}
/** A bench of rough planks, black with wet. @param {any} it */
function bench(it){
  if(gymState.bunkFront) return;
  const i=it.i, j=it.j, i1=i+itemW(it), j1=j+itemH(it), zs=4.0;
  for(const a of [i+0.25,i1-0.25]) for(const b of [j+0.1,j1-0.1]) isoLine(a,b,0,a,b,zs-0.4,C.woodK);
  quad(i,j1,zs-0.6,i1,j1,zs-0.6,i1,j1,zs,i,j1,zs,()=>C.woodD); quad(i1,j,zs-0.6,i1,j1,zs-0.6,i1,j1,zs,i1,j,zs,()=>C.woodK);
  quad(i,j,zs,i1,j,zs,i1,j1,zs,i,j1,zs,(x,y)=>{ floorAt(x,y,zs); return h2(Math.floor(roomsState.fa*8),Math.floor(roomsState.fz*6))<50?C.woodL:C.wood; });
  const ti=i+0.5, tj=j+0.12; quad(ti,tj,zs,ti+0.6,tj,zs,ti+0.6,tj+0.28,zs,ti,tj+0.28,zs,()=>C.towel);   // a folded towel, a lump of carbolic soap
  solidDraw(i1-0.55,j+0.15,i1-0.35,j+0.32,zs,zs+0.5,(a,b,z)=>z<zs+0.45?C.soap:0);
}

/** Draw one bath item; false for anything else. @param {any} it */
export function drawBathItem(it){
  switch(it.t){
    case 'ldoor': { const a0=it.j, a1=it.j+itemH(it), Hd=14.5;                               // an iron-strapped door under a low arch
      quad(0.01,a0-0.3,0,0.01,a1+0.3,0,0.01,a1+0.3,Hd+1.6,0.01,a0-0.3,Hd+1.6,(x,y)=>{ faceI(0.01,x,y); const fa=roomsState.fa, fz=roomsState.fz, u=(fa-a0)/(a1-a0), top=Hd+Math.sqrt(Math.max(0,1-(u*2-1)**2))*1.2;
        if(u>0&&u<1&&fz<top){ for(const sz of [3,8,13]) if(Math.abs(fz-sz)<0.4) return C.iron; const pl=Math.floor(u*5); return u*5-pl<0.07?C.woodK:(h2(pl,Math.floor(fz))<50?C.woodD:C.wood); }
        return h2(Math.floor(fz/2),Math.floor(fa*3))<90?C.stoneD:C.stoneT; });
      return true; }
    case 'lshower': stall(it); return true;
    case 'lpod': podium(it); return true;
    case 'lbench': bench(it); return true;
  }
  return false;
}

/* ---------- inmates ---------- */

const TOWEL=['#6e6c64','#8e8c84','#acaaa0'], SLIP=['#1a1814','#2a2620','#3e382e'];
/** @param {number} rb @param {string[]} hex */
function ramp(rb,hex){ const P=appearanceState.PAL; for(let k=0;k<3;k++) P[rb*3+k]=rgb(hex[k]); }

/** Entering the bath: four men soak in the tubs, two sit on the benches in towels, one waits; the turnkey on his podium. */
export function bathEnter(){
  const P=appearanceState.PAL, B=state.list.filter(x=>x.t==='lbench'), tubs=state.list.filter(x=>x.t==='lshower'), pod=state.list.find(x=>x.t==='lpod');
  state.saved=npcsState.YN.map(Cn=>({pal:P.slice(Cn.rb*3,(Cn.rb+10)*3),C:{...Cn}}));
  state.use=[-1,-1,-1,-1,-1];
  npcsState.YN.forEach((Cn,k)=>{
    ramp(Cn.rb+4,TOWEL); for(let q=0;q<3;q++) P[(Cn.rb+5)*3+q]=shadeC(P[(Cn.rb+4)*3+q],0.75);      // the towel (cnLookHD: bath)
    ramp(Cn.rb+8,SLIP);                                                                          // clogs
    Object.assign(Cn,{sleeves:false,pants:false,bath:true,yard:true,moving:false,after:null,t:(k*97)%400,smokeY:Cn.smokeY??Cn.smoke,smoke:false,tub:false,z0:0});
    const tb=AT_TUB.find(a=>a[0]===k);
    if(tb){ state.use[tb[1]]=k; Object.assign(Cn,{act:'sit',tub:true,i:SHOWERS[tb[1]],j:SOAK_J,fi:0,fj:1,z0:SOAK_Z,after:tubs[tb[1]]}); return; }   // in the water to the chest
    const bi=ON_BENCH.indexOf(k);
    if(bi>=0&&B[bi]){ const b=B[bi]; Object.assign(Cn,{act:'sit',i:b.i+itemW(b)/2,j:b.j+itemH(b)/2,fi:0,fj:-1,after:b}); return; }   // facing the tubs
    Object.assign(Cn,{act:'rest',i:2.4,j:4.6,fi:0.3,fj:-1});                                     // waiting for a tub
  });
  Object.assign(npcsState.GUARD,{i:POD.i+POD.w/2,j:POD.j+POD.h/2,fi:0.92,fj:-0.4,z0:POD.z,act:'behind',moving:false,after:pod});   // watching the stalls
  state.crowd=[...npcsState.YN,npcsState.GUARD];
}
/** Leaving the bath: clothes and places as they were. */
export function bathLeave(){
  if(!state.saved) return;
  const P=appearanceState.PAL;
  npcsState.YN.forEach((Cn,k)=>{ const S=state.saved[k]; P.set(S.pal,Cn.rb*3); Object.assign(Cn,{sleeves:S.C.sleeves,pants:S.C.pants,bath:false,tub:false,z0:0,yard:true,act:'idle',after:null,smoke:S.C.smoke}); });
  Object.assign(npcsState.GUARD,{z0:0,after:null});
  state.saved=null;
}

export function bathTick(){ for(const Cn of npcsState.YN) Cn.t++; }

/* ---------- light, steam, water ---------- */

/** Is a tub in use (a man in it, or the hero)? @param {number} k */
function inUse(k){
  const A=roomsState.hubAct; if(A&&A.kind==='shower'&&A.item&&A.item.t==='lshower'&&A.item.v===k) return true;
  return state.use[k]>=0;
}
/** Blend a picture pixel towards a colour. @param {number} x @param {number} y @param {number} c @param {number} a */
function mix(x,y,c,a){
  const W=appearanceState.W, M=rendererState.FB_MAIN; x=Math.round(x); y=Math.round(y); if(x<0||y<0||x>=W||y>=appearanceState.H) return; const p=y*W+x;
  M[p]=mixC(M[p],c,a);
}

/** Drawn over the room every frame: the gaslight (three smudges in a dark cellar), ripples round the men in the
 * tubs, the grey water crawling along the gutter, drips from the vault, steam off the water, the fog with a halo round
 * each jet, and the carbolic cast over everything. */
export function bathFX(){
  const M=rendererState.FB_MAIN, W=appearanceState.W, H=appearanceState.H, t=boxingState.tick, K=gymState.ISO_K, BG=gymState.bgHub;
  const lamps=LAMPS.map((L,k)=>{ const back=L[1]<0.5, i=L[0]+(back?0:0.35), j=L[1]+(back?0.35:0);
    return {x:isoX(i,j),y:isoY(i,j,L[2]+0.6),p:0.95+0.05*Math.sin(t*0.13+k*2)-(h2(t>>3,k)<4?0.15:0)}; });   // gas: steady, a rare gutter
  // the light: dark everywhere, warm round the jets
  const R2=(44*K)**2, amb=0.15;
  for(let y=0;y<H;y++) for(let x=0,p=y*W;x<W;x++,p++){ let f=amb; for(const L of lamps){ const dx=x-L.x, dy=(y-L.y)*1.3; f+=L.p*0.52/(1+(dx*dx+dy*dy)/R2); }
    const o=M[p], r=Math.min(255,(o&255)*f*1.04), g=Math.min(255,((o>>8)&255)*f*0.97), b=Math.min(255,((o>>16)&255)*f*0.8);
    M[p]=(0xff000000|((b|0)<<16)|((g|0)<<8)|(r|0))>>>0; }
  let on=0;
  SHOWERS.forEach((ci,k)=>{ if(!inUse(k)) return; on++;
    for(let w=0;w<2;w++){ const r=((t*0.05+k*1.7+w*2.5)%5)*0.06+0.12; for(let a=0;a<6.28;a+=0.35/K) mix(isoX(ci+Math.cos(a)*r,SOAK_J+0.2+Math.sin(a)*r*0.7),isoY(ci+Math.cos(a)*r,SOAK_J+0.2+Math.sin(a)*r*0.7,WATER_Z),C.greyH,0.35*(1-r/0.42)); }   // ripples round him
    if(t%26===(k*5)%26){ const x=isoX(ci,1.1), y=isoY(ci,1.1,WATER_Z+2); state.steam.push({x:x+(Math.random()-0.5)*6*K,y,vx:(Math.random()-0.4)*0.06*K,vy:(-0.08-Math.random()*0.06)*K,r:4*K,l:220,m:220}); } });
  for(let m=0;m<9;m++){ const f=(t*0.006+m/9)%1, i=STALL_I0-0.1+f*(DRAIN[0]-STALL_I0+0.1), j=(GUT_J0+GUT_J1)/2; mix(isoX(i,j),isoY(i,j,0),C.greyH,0.8); }   // the water going to the drain
  if(Math.random()<0.06) state.drips.push({i:1+Math.random()*8.5,j:0.4+Math.random()*5.5,z:gymState.HUB_WH-2,v:0});
  for(const d of state.drips){ d.v+=0.05; d.z-=d.v; mix(isoX(d.i,d.j),isoY(d.i,d.j,Math.max(0,d.z)),C.drop,0.85); if(d.z<=0){ d.done=1; mix(isoX(d.i,d.j)-K,isoY(d.i,d.j,0),C.drop,0.5); mix(isoX(d.i,d.j)+K,isoY(d.i,d.j,0),C.drop,0.5); } }
  state.drips=state.drips.filter(d=>!d.done);
  if(state.steam.length<8+on*2&&t%30===0) state.steam.push({x:(30+Math.random()*90)*K,y:(30+Math.random()*30)*K,vx:0.04*K,vy:-0.015*K,r:8*K,l:320,m:320});
  for(const s of state.steam){ s.l--; s.x+=s.vx; s.y+=s.vy; s.r=Math.min(16*K,s.r+0.05*K);
    const k=Math.min(1,s.l/s.m*1.6)*Math.min(1,(s.m-s.l)/30), R=Math.ceil(s.r);
    for(let y=-R;y<=R;y+=1) for(let x=-R;x<=R;x+=1){ const d=(x*x+y*y)/(s.r*s.r); if(d>1) continue; const X=Math.round(s.x+x), Y=Math.round(s.y+y); if(X<0||X>=W||Y<0||Y>=H||BG[Y*W+X]===C.ceil) continue;
      M[Y*W+X]=mixC(M[Y*W+X],C.steam,k*(1-d)*0.32); } }
  state.steam=state.steam.filter(s=>s.l>0).slice(-40);
  // the fog: thick and slow, lit from within near every jet
  const S=0.26+0.03*on, G=40*K, gw=Math.ceil(W/G)+2, gh=Math.ceil(H/G)+2, ox=t*0.1, oy=-t*0.03, cx=Math.floor(ox/G), cy=Math.floor(oy/G), N=state.mist;
  for(let y=0;y<gh;y++) for(let x=0;x<gw;x++) N[y*gw+x]=h2(x+cx,y+cy)/255;
  for(let y=0;y<H;y++){ const v=(y+oy)/G-cy, vy=Math.floor(v), fy=v-vy, hf=0.6+0.4*(1-y/H);
    for(let x=0,p=y*W;x<W;x++,p++){ if(BG[p]===C.ceil) continue; const u=(x+ox)/G-cx, ux=Math.floor(u), fx=u-ux, q=vy*gw+ux;
      const n=(N[q]*(1-fx)+N[q+1]*fx)*(1-fy)+(N[q+gw]*(1-fx)+N[q+gw+1]*fx)*fy;
      let lit=0.1; for(const L of lamps){ const dx=x-L.x, dy=(y-L.y)*1.2; lit+=1.0/(1+(dx*dx+dy*dy)/(26*K)**2); }
      const a=Math.min(0.5,S*hf*(0.35+0.65*n)), fc=mixC(C.fogD,C.fog,Math.min(1,lit));
      M[p]=mixC(M[p],fc,a); } }
  for(const L of lamps){ const x0=Math.round(L.x), y0=Math.round(L.y);                       // the glass globe, the jet inside it
    for(let dy=-2*K;dy<=2*K;dy++) for(let dx=-2*K;dx<=2*K;dx++){ const d=Math.hypot(dx,dy*1.1)/(2*K); if(d>1) continue; mix(x0+dx,y0+dy,d>0.8?C.glass:C.flame,d>0.8?0.6:0.35*(1-d)); }
    for(let k=0;k<2*K;k++){ pset(x0,y0+K-k,k<K?C.flame:C.flameW); if(k<K) pset(x0+1,y0+K-k,C.flame); } }
  for(let p=0;p<W*H;p++) M[p]=mixC(M[p],C.carbolic,0.07);                                     // the carbolic air
}

/* ---------- stations ---------- */

/** Station options in the bath (null when the station is not a bath one). @param {any} st */
export function bathOptions(st){
  switch(st.id){
    case 'ldoor': return [['Wróć do celi',()=>goRoom('cell',0)]];
    case 'lshower': {
      const k=st.item.v, who=state.use[k];
      if(who>=0) return [['Zajęte — '+sparringState.YARD_OPP[who].title,()=>{},true]];
      const soap=useSoap(false), why=prisonGate();
      return [['Kąpiel w wannie · 1 akcja · higiena do pełna'+(soap?' (mydło karbolowe)':' (szara woda)')+(why?' — '+why:''),()=>{ if(soap) useSoap(true);
        startActivity(st,{kind:'shower',label:'kąpiel w łaźni',min:0,pose:2,pz:SOAK_Z,at:[SHOWERS[k],SOAK_J],face:[0,1],order:'after',pop:-1,after:()=>spendAction('mycie',100)}); },!!why,'act']]; }
    case 'lbench': return [['Ławka — ręcznik i mydło karbolowe',()=>{},true]];
    case 'bathfight': {
      const k=st.yn, O=sparringState.YARD_OPP[k], Cn=npcsState.YN[k];
      const here=()=>({...st,look:[Cn.i,Cn.j,15],spot:[gymState.hubP.i,gymState.hubP.j]});
      const go=()=>{ prisonFightStart('laznia',k); startSpar(k,'laznia',here()); };
      const why=prisonGate();
      return [['Bójka w łaźni: '+O.title+' '+'★'.repeat(oppStars(O))+' · do KO · 1 akcja · para kryje (klucznik 20%)'+listTag('laznia',k)+(why?' — '+why:''),go,!!why],...prisonFightExtras(true,k,go,here)]; }
  }
  return null;
}

export function initialize(){
  Object.assign(C,{ceil:rgb('#050505'),
    rub:[rgb('#5e584a'),rgb('#4e4a3e'),rgb('#6a6454')],joint:rgb('#24221c'),lime:rgb('#8a8676'),stone:rgb('#5a5446'),stoneD:rgb('#3e3a30'),stoneT:rgb('#726a58'),
    brick:[rgb('#3a2620'),rgb('#2e1e1a'),rgb('#44302a')],brickK:rgb('#1a1210'),mortar:rgb('#221c18'),slime:rgb('#24301e'),slimeW:rgb('#3a3e26'),damp:rgb('#2a3026'),soot:rgb('#141210'),
    wetH:rgb('#8a9088'),flag:[rgb('#4e4a42'),rgb('#46423b'),rgb('#3e3b35')],fjoint:rgb('#1c1a17'),wet:rgb('#2a2e2c'),
    grey:rgb('#4e5048'),greyD:rgb('#3e403a'),greyH:rgb('#7a7c70'),scum:rgb('#8a8670'),
    zinc:rgb('#6e7270'),zincD:rgb('#4e5250'),zincH:rgb('#9a9e98'),rust:rgb('#6a4a2e'),iron:rgb('#26262a'),ironK:rgb('#101012'),
    wood:rgb('#4a3a28'),woodL:rgb('#5e4c36'),woodD:rgb('#36291c'),woodK:rgb('#1a140e'),coat:rgb('#3e3628'),coatD:rgb('#2a241a'),towel:rgb('#8e8c84'),stripe:rgb('#5a2a20'),
    soap:rgb('#a89a5a'),brass:rgb('#6a5428'),brassH:rgb('#9a7e3e'),glass:rgb('#c8c8b0'),flame:rgb('#ffd890'),flameW:rgb('#fff8e0'),
    drop:rgb('#5e625a'),steam:rgb('#c8c8bc'),fog:rgb('#b0a684'),fogD:rgb('#2e302a'),wetV:rgb('#4a4a42'),carbolic:rgb('#b0b47a')});
  Object.assign(gymState.GYM_TYPES,{ldoor:{fixed:true,flat:true,z:9,st:'ldoor'},lshower:{fixed:true,block:true,z:8,st:'lshower'},lbench:{fixed:true,block:true,z:7,st:'lbench'},lpod:{fixed:true,block:true}});
  state.list=bathLayout().map(mkItem); state.use=[-1,-1,-1,-1,-1]; state.saved=null; state.steam=[]; state.drips=[]; state.mist=new Float32Array(256); state.crowd=[];
  Object.assign(gymState.ST_INFO,{ldoor:['DRZWI','Drzwi łaźni — powrót do celi'],lshower:['WANNA','Cynkowa wanna — kąpiel w szarej wodzie'],lbench:['LAWKA','Ławka']});
}

````

---

## `src/stats.js`

````js
/* Pure progression math shared by the save store, progression, sparring and tests.
   Three trees (Siła / Szybkość / Wytrzymałość) level 1–30. Every passive grows 60% smoothly with each
   level and 40% in six steps at levels 5, 10, 15, 20, 25 and 30, so milestones are felt in play. */

export const LEVEL_MAX = 30;
export const MILESTONE_EVERY = 5;
export const TRIAL_LEVELS = /** @type {const} */ ([10, 20]);

/** XP needed to go from level l to l+1. @param {number} l */
export function xpNeed(l){ return 10*Math.round(4+Math.pow(l,1.65)); }

/** Cumulative XP needed to reach level l from level 1. @param {number} l */
export function xpTotal(l){ let s=0; for(let k=1;k<l;k++) s+=xpNeed(k); return s; }

/** Level and remainder for a cumulative XP amount, capped at LEVEL_MAX. @param {number} total */
export function levelFromTotal(total){
  let lvl=1, xp=Math.max(0,total);
  while(lvl<LEVEL_MAX&&xp>=xpNeed(lvl)){ xp-=xpNeed(lvl); lvl++; }
  return {lvl, xp:lvl>=LEVEL_MAX?0:xp};
}

/** XP curve used by saves before version 4 (levels 1–10). @param {number} l */
export function legacyXpNeed(l){ return Math.round(50*Math.pow(l,1.4)); }

/** Convert a pre-v4 stat (levels 1–10) by its cumulative XP. @param {number} lvl @param {number} xp */
export function migrateLegacyStat(lvl,xp){
  let total=Math.max(0,xp);
  for(let k=1;k<Math.min(10,lvl);k++) total+=legacyXpNeed(k);
  return levelFromTotal(total);
}

/** Share of the 1→30 growth reached at a level: 60% linear, 40% in milestone steps. @param {number} l */
export function passiveFraction(l){
  const L=Math.max(1,Math.min(LEVEL_MAX,Math.floor(l)));
  return 0.6*(L-1)/(LEVEL_MAX-1)+0.4*Math.floor(L/MILESTONE_EVERY)/(LEVEL_MAX/MILESTONE_EVERY);
}

/** @param {number} l @param {number} from @param {number} to */
function grow(l,from,to){ return from+(to-from)*passiveFraction(l); }

/** Passive bonuses of one tree at a level. Values at 30 equal the old level-10 maximum where they existed.
 * @param {'str'|'spd'|'end'} key @param {number} l @returns {Record<string,number>} */
export function treePassives(key,l){
  if(key==='str') return {pow:grow(l,0.95,1.49), stunDealt:grow(l,1,1.25), guardDrain:grow(l,1,1.2)};
  if(key==='spd') return {punch:grow(l,0.95,1.22), foot:grow(l,0.95,1.15), back:grow(l,0.95,1.2)};
  return {staCap:grow(l,90,126), regen:grow(l,0.9,1.44), fat:grow(l,0.13,0.058), recov:grow(l,0.4,0.85),
    hpMax:Math.round(grow(l,100,120)), stunTaken:grow(l,1,0.85), energyUse:grow(l,1,0.8)};
}

/** Fighter-ready stats for three tree levels (player or opponent). @param {{str:number,spd:number,end:number}} lv */
export function fighterStats(lv){
  const s=treePassives('str',lv.str), q=treePassives('spd',lv.spd), e=treePassives('end',lv.end);
  return {pow:s.pow, stunDealt:s.stunDealt, guardDrain:s.guardDrain, spd:q.punch, spdFoot:q.foot, spdBack:q.back,
    staCap:Math.round(e.staCap), regen:e.regen, fat:e.fat, recov:e.recov, hpBonus:e.hpMax-100, stunTaken:e.stunTaken, endLvl:lv.end};
}

/** Player-facing description of a milestone reached at level l, or '' between milestones.
 * @param {'str'|'spd'|'end'} key @param {number} l */
export function milestoneText(key,l){
  if(l%MILESTONE_EVERY) return '';
  const a=treePassives(key,l), pct=(/** @type {number} */ v)=>Math.round(v*100);
  if(key==='str') return 'moc ×'+a.pow.toFixed(2).replace('.',',')+' · ogłuszenie +'+(pct(a.stunDealt)-100)+'% · nacisk na gardę +'+(pct(a.guardDrain)-100)+'%';
  if(key==='spd') return 'ciosy ×'+a.punch.toFixed(2).replace('.',',')+' · nogi ×'+a.foot.toFixed(2).replace('.',',')+' · powrót ×'+a.back.toFixed(2).replace('.',',');
  return 'kondycja '+Math.round(a.staCap)+' · zdrowie '+a.hpMax+' · szczęka −'+(100-pct(a.stunTaken))+'%';
}

/** Short summary of current passives for the trainer screen. @param {'str'|'spd'|'end'} key @param {number} l */
export function passiveSummary(key,l){
  const a=treePassives(key,l), f=(/** @type {number} */ v)=>v.toFixed(2).replace('.',','), pct=(/** @type {number} */ v)=>Math.round(v*100);
  if(key==='str') return 'Moc ×'+f(a.pow)+' · Ogłuszenie +'+(pct(a.stunDealt)-100)+'% · Nacisk na gardę +'+(pct(a.guardDrain)-100)+'%';
  if(key==='spd') return 'Ciosy ×'+f(a.punch)+' · Nogi ×'+f(a.foot)+' · Powrót do gardy ×'+f(a.back);
  return 'Kondycja '+Math.round(a.staCap)+' · Regeneracja ×'+f(a.regen)+' · Zdrowie '+a.hpMax+' · Szczęka −'+(100-pct(a.stunTaken))+'% · Energia na treningu −'+(100-pct(a.energyUse))+'%';
}

/** Tree levels of an opponent from its rank and boxing style: specialists trade one tree for another.
 * @param {number} rank @param {string} style @returns {{str:number,spd:number,end:number}} */
export function opponentLevels(rank,style){
  const off={out:[-4,4,0],press:[4,-4,0],counter:[-2,3,-1],bal:[0,0,0]}[style]||[0,0,0];
  const c=(/** @type {number} */ v)=>Math.max(1,Math.min(LEVEL_MAX,Math.round(v)));
  return {str:c(rank+off[0]), spd:c(rank+off[1]), end:c(rank+off[2])};
}

/** Stars shown for an opponent rank: ★ up to 9, ★★ up to 19, ★★★ above, ★★★★ from 28. @param {number} rank */
export function opponentStars(rank){ return rank>=28?4:rank>=20?3:rank>=10?2:1; }

````

---

## `src/sparring.js`

````js
import { cellFightBg, cellFightBack, cellFightFront } from './cell-fight-scene.js';
import { saveFighterContext, loadFighterContext } from './fighter-context.js';
import { state as appearanceState, setRamp, applyGear, applyLook, rgb } from './appearance.js';
import { state as boxingState, setVenueLight, clearVenueLight, setupFighterLight, torsoEdge, solve, setFlow, resetClock, commitWalk, startMove, handleEvents, updateShorts, spawn, clearParticles, popup, updateParticles, h2, drawText, drawBoxer, drawParticles, drawPopups } from './boxing.js';
import { state as animationState, isFwd, samplePose, poseSampleTime, computeIdle, isDash } from './animation.js';
import { state as pushupsState, puReset } from './pushups.js';
import { state as npcsState } from './npcs.js';
import { initAudio, sfxWhoosh } from './audio.js';
import { state as progressionState, applyStats } from './progression.js';
import { state as inputState, setInfo, clearHeldInput } from './input.js';
import { setPanelMode } from './navigation.js';
import { state as rendererState, shadowEll } from './renderer.js';
import { state as gymState, shadeC } from './gym.js';
import { fighterStats, opponentLevels, opponentStars } from './stats.js';
import { shadowTick, stopShadowboxing } from './shadowboxing.js';
import { startIsoFight } from './iso-fight.js';

// Runtime values owned by sparring; initialized explicitly by main.js.
export const PIVOT_RANGE = 25;
export const state = {}; function saveCtx(F){
  saveFighterContext(F.S,state.contextSources);
  F.cur.set(animationState.cur); F.from.set(animationState.fromPose); F.last.set(animationState.lastPose);
} function loadCtx(F){
  loadFighterContext(F.S,state.contextSources);
  animationState.cur.set(F.cur); animationState.fromPose.set(F.from); animationState.lastPose.set(F.last);
} function mkFighter(){
  return {S:{}, cur:new Float32Array(animationState.NP), from:new Float32Array(animationState.NP), last:new Float32Array(animationState.NP), pal:new Uint32Array(appearanceState.N_RAMPS*3),
    tr:'stripe', gl:'classic', bt:'mid', look:null, name:'', title:'', manual:false, mirror:false, opp:null, idleOff:0,
    hpMax:100, hp:100, hpShow:100, sta:100, staMax:100, staCap:100, regen:1, fat:0.1, recov:0.5, endLvl:1, stun:0, dmg:0, blood:[], spd:1, pow:1,
    down:false, ko:false, kdN:0, hurt:0, thrown:0, landed:0, power:0, evades:0, blocks:0, counters:0,
    evChain:0, evLast:-999, evActive:false, evHit:false, staShow:100, pendHit:-1, blockT:0,
    st:animationState.IDLE, stT:0, faceL:0, headXL:0, headY:0, chestL:0, hipY:0, hipL:0, effPos:state.START_POS, stW:12};
}

export /* Stamina has two layers: sta (what you can spend now) regenerates only up to staMax, and staMax itself wears
   down — a slice of every effort (fat), body shots, and slowly the clock. Between rounds part of the lost
   ceiling comes back (recov). Endurance sets the capacity, the regeneration, the wear and the recovery. */
function staF(F){ return F.sta/F.staCap; }

/** Whether the current fight uses the prison's bareknuckle rules. */
export function isBareknuckle(){ return state.bareknuckle===true; }

/** Whether this scene is the prison's non-contact technique exercise. */
export function isShadowboxing(){ return state.shadow===true; }

/** Choose the next fight venue through its owner. @param {string} venue */
export function setSparVenue(venue){ state.sparVenue=venue; }

/** Record which brawl is being fought and where to return to afterwards (the isometric fight reads them back). @param {number} idx @param {string} venue @param {any} [station] */
export function setSparFight(idx,venue,station){ state.sparOpp=idx; state.sparVenue=venue; state.bareknuckle=true; state.shadow=false; if(station) state.cellFightSt=station; }

/** Copy tree-derived passives onto a fighter (player or opponent). @param {any} F @param {{str:number,spd:number,end:number}} lv @returns {number} extra health */
export function applyFighterStats(F,lv){ const S=fighterStats(lv); Object.assign(F,{pow:S.pow,spd:S.spd,spdFoot:S.spdFoot,spdBack:S.spdBack,staCap:S.staCap,regen:S.regen,fat:S.fat,recov:S.recov,endLvl:S.endLvl,stunDealt:S.stunDealt,stunTaken:S.stunTaken,guardDrain:S.guardDrain}); return S.hpBonus; } function switchTo(F){ if(state.ctxF===F) return; if(state.ctxF) saveCtx(state.ctxF); loadCtx(F); state.ctxF=F; state.oppF=F.opp; state.mirrorCtx=F.mirror; boxingState.trl=F.trl||(F.trl={h:[[],[]]}); } function wX(x){ return state.mirrorCtx?appearanceState.W-1-x:x; }

/** Guard height of a card fight's block (the engine picks it). @param {any} F */
export function guardLowOf(F){ return !!F.guardLow; }

/** Distance between the boxers' hips in their facing-relative coordinates. @param {any} F */
export function hipDist(F){ return 31-F.effPos-F.opp.effPos; }

export // 31 = W-1-2*BASE_X
function sparClamp(p){ const lim=31-state.MIN_DIST-state.oppF.effPos; if(p>lim)p=lim; return p<state.RING_MIN?state.RING_MIN:p; } function sparCanWalk(id){ return isFwd(id)?31-state.ctxF.effPos-state.oppF.effPos>state.MIN_DIST+3:animationState.posX>state.RING_MIN+2; } // can defender D slip / roll this punch right now?  (slips beat straights, the weave beats straights and hooks)

export // opponent silhouette (front edge, in the CURRENT fighter's frame) at height gy: gloves stop on it
function oppSurface(gy){
  if(isShadowboxing())return 999;
  const D=state.oppF; if(D.down||D.ko||(state.aimLow===0&&evades(D,boxingState.state))) return 999;
  if(gy<D.headY-6||gy>D.hipY+3) return 999;
  return appearanceState.W-1-(gy<=D.headY+6?D.faceL:(gy<=D.chestY+2?D.chestL:D.bellyL));
} function derive(F){
  F.st=boxingState.state; F.stT=boxingState.stateT; F.headXL=boxingState.headX; F.faceL=boxingState.headX+5; F.headY=boxingState.headY; F.chestL=torsoEdge(boxingState.sy+5,true);
  F.chestY=boxingState.sy+5; F.bellyL=torsoEdge(boxingState.hipY-4,true);
  F.hipY=boxingState.hipY; F.hipL=boxingState.hipX; F.effPos=sparClamp(animationState.posX+animationState.cur[animationState.GX]); F.stW=animationState.cur[animationState.ST];
}

/** Tree levels of an opponent definition. @param {any} O */
export function oppLevels(O){ return O.lv||opponentLevels(O.rank,O.style); }

/** Stars of an opponent definition (★–★★★★). @param {any} O */
export function oppStars(O){ return opponentStars(O.rank); }


/** A time limit for the next bareknuckle fight (the Sunday brawl: 90 s), 0 = none. @param {number} ticks */
export function setFightLimit(ticks){ state.timeLimit=ticks; }

/** Arm the rigged fight (Profesor's list #6): the rival pulls a knuckle-duster once the player leads. @param {boolean} on */
export function setRigged(on){ state.rigged=on; state.rigKO=false; }

/** The player's trousers-only fight skin, including Cień; bath outfits keep their towel. @param {any} [F] */
export function bareTorsoOut(F=state.ctxF){ return (boxingState.gstate==='spar'&&isBareknuckle()&&state.sparVenue!=='laznia'&&!!F&&F===state.FA); }
export function prisonOut(){ return boxingState.gstate==='crank'||boxingState.gstate==='pullup'||boxingState.gstate==='work'||boxingState.gstate==='arm'||(boxingState.gstate==='spar'&&isBareknuckle()&&state.sparVenue!=='laznia')||(boxingState.gstate==='pushup'&&pushupsState.puVenue==='cell'); } function prisonPal(F){                 // this fighter wears the cell drelich: blue shirt + trousers, black shoes
  const keep=appearanceState.PAL.slice(); appearanceState.PAL.set(F.pal);
  setRamp(appearanceState.R_SHIRT,npcsState.CN_TOP,false); setRamp(appearanceState.R_SHIRTF,npcsState.CN_TOP,true); setRamp(appearanceState.R_PANT,npcsState.CN_PANT,false); setRamp(appearanceState.R_PANTF,npcsState.CN_PANT,true);
  setRamp(appearanceState.R_BOOT,state.PRIS_SHOE,false); setRamp(appearanceState.R_BOOTF,state.PRIS_SHOE,true); setRamp(appearanceState.R_BTR,state.PRIS_SOLE,false); setRamp(appearanceState.R_BTRF,state.PRIS_SOLE,true);
  F.pal.set(appearanceState.PAL); appearanceState.PAL.set(keep); F.bt='low';
  if(F===state.FA)for(let j=0;j<3;j++)F.pal[appearanceState.R_PANTF*3+j]=shadeC(F.pal[appearanceState.R_PANT*3+j],0.86);
} /* ---------- setup / teardown ---------- */
function snapFighterLook(F,eq,look){ applyGear(eq); applyLook(look); F.pal.set(appearanceState.PAL); F.tr=appearanceState.trStyle; F.gl=appearanceState.glStyle; F.bt=appearanceState.btStyle; F.look=Object.assign({},appearanceState.lk); } function resetFighter(F){
  state.ctxF=F; state.oppF=F.opp; state.mirrorCtx=F.mirror;                          // fresh context (previous one is being reset too)
  boxingState.state=animationState.IDLE; boxingState.stateT=0; boxingState.frameIdx=-1; boxingState.fired=0; boxingState.idleT=99; boxingState.curGrade=1; boxingState.buffered=-1; boxingState.bufferTick=0; boxingState.bufferedGrade=1; boxingState.moveStep=0; animationState.moveRate=1;
  animationState.posX=state.START_POS; boxingState.flashL=0; boxingState.flashR=0; animationState.cur.set(animationState.GUARD); animationState.fromPose.set(animationState.GUARD); animationState.lastPose.set(animationState.GUARD);
  boxingState.trX=0; boxingState.trY=0; boxingState.trVX=0; boxingState.trVY=0; boxingState.torsoLagX=0; boxingState.torsoLagVX=0; boxingState.rdOn=0; boxingState.rdLying=false; state.aimLow=0; state.nextLow=0; state.idleOff=F.idleOff;
  F.effPos=state.START_POS; F.pendHit=-1; F.blockT=0; F.down=false; F.hurt=0; F.stun=0; F.kx=F.kv=F.ky=F.shk=F.hitT0=0;
  boxingState.STATS.speed=F.spd; solve(); boxingState.prevHX=appearanceState.BASE_X+animationState.posX+animationState.cur[animationState.BX]; boxingState.prevHY=appearanceState.HIP_Y0+animationState.cur[animationState.BY]; derive(F); saveCtx(F);
}

export function sparExit(){
  if(isShadowboxing())stopShadowboxing();
  state.shadow=false;state.shadowRate=1;
  if(state.ctxF){ switchTo(state.FA); state.ctxF=null; } boxingState.trl=boxingState.trailMain;
  clearVenueLight(); state.oppF=null; state.mirrorCtx=false; state.aimLow=0; state.nextLow=0; state.idleOff=0; animationState.idleTired=0; animationState.idleHurt=0; animationState.idleClose=0; animationState.idleSeed=7; state.faceDmg=0; state.lyingDraw=false;
  rendererState.fb=rendererState.FB_MAIN; if(state.sparLkSave) appearanceState.lk=state.sparLkSave; if(state.WORK_RAMPS) appearanceState.PAL.set(state.WORK_RAMPS,appearanceState.R_SHIRT*3); applyGear(progressionState.save.eq); applyLook(progressionState.save.look);
  applyStats();
  animationState.posX=0; boxingState.state=animationState.IDLE; boxingState.buffered=-1; animationState.cur.set(animationState.GUARD); animationState.lastPose.set(animationState.cur); boxingState.idleT=0; boxingState.hitstop=0; boxingState.shakeT=0;
  state.SP.phase='off'; state.SP.pivot=null;
  document.body.classList.remove('spar'); inputState.overEl.hidden=true; { const fp=document.getElementById('fightPlate'); if(fp) fp.hidden=true; }
} /* ---------- per-fighter simulation step (mirrors update() for one boxer) ---------- */
function stepAnim(F,adv){
  let ev=0, frameChanged=false, m=null;
  if(boxingState.state!==animationState.IDLE){
    m=animationState.MOVES[boxingState.state];
    if(boxingState.stateT>=m.dur){
      if(m.walk)commitWalk(); animationState.lastPose.set(animationState.cur); const was=boxingState.state; boxingState.state=animationState.IDLE; boxingState.idleT=0; m=null;
      if(was===animationState.S_BLOCKHIT&&F.blockT>0){ startMove(animationState.S_BLOCK,6); m=animationState.MOVES[boxingState.state]; }   // straight back into the held guard
    }
    if(m){
      const fr=m.fr||5, f=Math.floor(boxingState.stateT/fr);
      if(f!==boxingState.frameIdx){
        boxingState.frameIdx=f; frameChanged=true;
        let sT=(f+1)*fr; if(sT>m.dur)sT=m.dur;
        for(let k=1;k<m.n;k++) if(!(boxingState.fired&(1<<k))&&sT>=m.times[k]){boxingState.fired|=1<<k;ev|=1<<k;}
      }
      samplePose(m,poseSampleTime(m,boxingState.stateT,ev),animationState.cur);
      if(adv&&!(m.hold&&boxingState.stateT>=m.hold&&holdFor(F))){
        // Dynamiczna prędkość ciosu: szybki wystrzał do apexu, lekki docisk w celu i zrywny powrót do gardy
        const isPunch=m.id>=0&&m.id<=3&&m.apex>0;
        const tApex=isPunch?m.times[m.apex]:0;
        const punchMod=isPunch?(boxingState.stateT<tApex?1.18:(boxingState.stateT<tApex+2?0.85:1.25)):1;
        boxingState.stateT+=sparMoveSpeed(F,boxingState.state)*punchMod;
        if(m.hold&&boxingState.stateT>m.hold&&holdFor(F)) boxingState.stateT=m.hold;
      }
    }
  }
  if(boxingState.state===animationState.IDLE){
    computeIdle(animationState.idleP); if(adv) boxingState.idleT++;
    if(boxingState.idleT<=5){for(let k=0;k<animationState.NP;k++)animationState.cur[k]=animationState.lastPose[k]+(animationState.idleP[k]-animationState.lastPose[k])*0.5;} else animationState.cur.set(animationState.idleP);
  }
  solve();
  if(m&&ev) handleEvents(m,ev);
  if(m&&frameChanged){ if(m.glove===0){boxingState.pgx=boxingState.lgx;boxingState.pgy=boxingState.lgy;} else if(m.glove===1){boxingState.pgx=boxingState.rgx;boxingState.pgy=boxingState.rgy;} boxingState.phx=boxingState.headX; boxingState.phy=boxingState.headY; }
  if(adv) updateShorts();
  derive(F);
}

/** Rebase a fighter in its owned context, retaining health, effort, perks and clothing marks.
 * @param {any} F @param {number} position @param {number} move */
function placePivotFighter(F,position,move){
  Object.assign(F.S,{posX:position,state:move,stateT:0,frameIdx:-1,fired:0,idleT:99,buffered:-1,moveStep:0,aimLow:0,nextLow:0});
  F.cur.set(animationState.GUARD); F.from.set(animationState.GUARD); F.last.set(animationState.GUARD);
  F.blockT=0; F.pendHit=-1;
  if(F.trl)for(const trail of F.trl.h)trail.length=0;
  state.ctxF=F; state.oppF=F.opp; state.mirrorCtx=F.mirror;
  loadCtx(F); solve(); derive(F); saveCtx(F);
  Object.assign(F.S,{prevHX:F.hipL,prevHY:F.hipY,pgx:F.S.lgx,pgy:F.S.lgy,phx:F.headXL,phy:F.headY});
}

/** A close forward pair trades adjacent slots, including when either boxer is against a wall.
 * @returns {boolean} Whether the pivot started. */
export function sparPivot(){
  const A=state.FA,B=state.FB,cost=6;
  const ready=A.st===animationState.IDLE||A.st===animationState.M_WALKF||A.st===animationState.M_WALKB||A.st===animationState.S_BLOCK;
  if(state.SP.phase!=='fight'||state.SP.pivot||!A.manual||A.down||A.ko||B.down||B.ko||!ready||B.st===animationState.S_GETUP||boxingState.tick<state.SP.pivotCD||hipDist(A)>PIVOT_RANGE||A.sta<cost)return false;
  const positions=[B.effPos,A.effPos],from=state.FIG.map(F=>F.mirror?appearanceState.W-1-F.hipL:F.hipL);
  clearHeldInput(); spendSta(A,cost);
  if(state.ctxF)saveCtx(state.ctxF);
  A.mirror=!A.mirror; B.mirror=!B.mirror;
  A.effPos=positions[0]; B.effPos=positions[1];
  for(let pass=0;pass<2;pass++)for(let i=0;i<2;i++)placePivotFighter(state.FIG[i],positions[i],i===0?animationState.M_PIVOT:animationState.M_PIVOT_TURN);
  state.SP.pivot={t:0,dur:animationState.MOVES[animationState.M_PIVOT].dur,from,to:state.FIG.map(F=>F.mirror?appearanceState.W-1-F.hipL:F.hipL)};
  state.SP.pivotCD=boxingState.tick+60;
  switchTo(A); sfxWhoosh(0.45); return true;
}

/** Start the cell training with a harmless reference silhouette. @param {any} station */
export function startShadowCombat(station){ startSpar(0,'cell',station,true); }

/** End training effort without declaring a winner or awarding fight rewards. */
export function finishShadowCombat(){ if(isShadowboxing())state.SP.phase='end'; }

/** Set the animation multiplier without changing ordinary fight or rhythm clocks. @param {number} rate */
export function setShadowTempo(rate){ if(isShadowboxing())state.shadowRate=Math.max(1,Math.min(2,rate)); }

/** Whether a queued training action can start or the previous animation has completed. */
export function shadowReady(){ return !state.SP.pivot&&(state.FA.st===animationState.IDLE||state.FA.st===animationState.S_BLOCK); }

/** Recenter a new attempt while preserving effort and the side reached by the last pivot. @param {boolean} far */
export function resetShadowPosition(far=false){
  if(!isShadowboxing())return;
  state.SP.pivot=null;clearHeldInput();
  const positions=[far?-7:6,6];
  state.FA.effPos=positions[0];state.FB.effPos=positions[1];
  for(let pass=0;pass<2;pass++)for(let i=0;i<2;i++)placePivotFighter(state.FIG[i],positions[i],animationState.IDLE);
  state.FA.evChain=0;state.FA.evActive=false;state.FA.evLast=-999;
  state.SP.pivotCD=0;switchTo(state.FA);
}

/** Start one real animation, retaining its stamina cost and full completion requirement.
 * @param {number} id @param {boolean} low @returns {boolean} */
export function performShadowAction(id,low=false){
  if(!isShadowboxing()||!shadowReady())return false;
  const cost=id<=3?state.STA_COST[id]*0.6:isDash(id)?2.5:id===animationState.M_PIVOT?6:state.EV_BASE[id===animationState.M_DODGE?2:id-animationState.M_SLIPL];
  if(state.FA.sta<cost)return false;
  if(id===animationState.M_PIVOT)return sparPivot();
  switchTo(state.FA);
  if(isDash(id)&&!sparCanWalk(id))return false;
  state.nextLow=low?1:0;startMove(id,0);derive(state.FA);saveCtx(state.FA);return true;
}

/** Advance the duck/dash and the opponent's delayed turn on the same simulation clock. */
function pivotTick(){
  const P=state.SP.pivot,A=state.FA,m=animationState.MOVES[animationState.M_PIVOT];
  P.t=Math.min(P.dur,P.t+sparMoveSpeed(A,m.id));
  if(state.SP.phase!=='fight'||P.t>=P.dur){
    state.SP.pivot=null;
    for(const F of state.FIG)placePivotFighter(F,F.effPos,animationState.IDLE);
    return;
  }
  for(const F of state.FIG){
    F.S.stateT=P.t; state.ctxF=F; state.oppF=F.opp; state.mirrorCtx=F.mirror;
    loadCtx(F); samplePose(animationState.MOVES[F.S.state],P.t,F.cur); loadCtx(F); solve(); derive(F); saveCtx(F);
  }
}

/** Render the low dash before the player turns; the opponent reacts after the crossing.
 * @param {any} F */
export function fighterView(F){
  const P=state.SP.pivot;
  if(!P)return {mirror:F.mirror,x:F.mirror?appearanceState.W-1-F.hipL:F.hipL,dx:Math.round(F.kx||0)+(F.shk&&boxingState.hitstop>0?((boxingState.tick&1)?F.shk:-F.shk):0),dy:Math.round(F.ky||0),scaleX:1};
  const i=F===state.FA?0:1,p=P.t/P.dur;
  const dash=Math.max(0,Math.min(1,(p-(i===0?0.12:0.24))/(i===0?0.38:0.44)));
  const blend=(1-Math.cos(Math.PI*dash))*0.5;
  const turn=Math.max(0,Math.min(1,(p-(i===0?0.53:0.74))/0.2)),mirror=turn<0.5?!F.mirror:F.mirror;
  const x=Math.round(P.from[i]+(P.to[i]-P.from[i])*blend);
  return {mirror,x,dx:Math.round(x-(mirror?appearanceState.W-1-F.hipL:F.hipL)),dy:Math.round(Math.sin(Math.PI*dash)*(i===0?2:-1)),scaleX:1-0.45*Math.sin(Math.PI*turn)};
}



export function stain(x){ const xi=Math.round(x); if(xi<1||xi>=appearanceState.W-1) return; const y=appearanceState.FLOOR_Y-1+(h2(xi,boxingState.tick)&3), c=(boxingState.tick&1)?state.C_STAIN:state.C_STAIN2; state.bgRing[y*appearanceState.W+xi]=c; } /* ---------- render ---------- */

function composite(mirror,hurt,dx=0,dy=0,scaleX=1,ghost=false){
  const s1=appearanceState.PAL[appearanceState.R_SKIN*3+1], s2=appearanceState.PAL[appearanceState.R_SKIN*3+2], f1=appearanceState.PAL[appearanceState.R_SKINF*3+1], f2=appearanceState.PAL[appearanceState.R_SKINF*3+2];
  const anchor=mirror?appearanceState.W-1-boxingState.hipX:boxingState.hipX;
  for(let y=0;y<appearanceState.H;y++){
    const r=y*appearanceState.W;
    for(let x=0;x<appearanceState.W;x++){
      let c=state.FB_ALT[r+x]; if(!c) continue;
      if(ghost){if((x+y)&1)continue;c=appearanceState.C_GHOST2;}
      if(hurt&&(c===s1||c===s2||c===f1||c===f2)) c=appearanceState.C_WHITE;             // hit flash on the skin
      const tx=Math.round(anchor+((mirror?appearanceState.W-1-x:x)-anchor)*scaleX)+dx,ty=y+dy;
      if(tx>=0&&tx<appearanceState.W&&ty>=0&&ty<appearanceState.H)rendererState.FB_MAIN[ty*appearanceState.W+tx]=c;
    }
  }
} function drawFighter(F){
  switchTo(F);
  appearanceState.PAL.set(F.pal); appearanceState.trStyle=F.tr; appearanceState.glStyle=F.gl; appearanceState.btStyle=F.bt; appearanceState.lk=F.look; state.faceDmg=F.dmg; state.lyingDraw=boxingState.rdOn?boxingState.rdLying:boxingState.state===animationState.S_KO&&boxingState.stateT>14;
  const view=fighterView(F);
  setupFighterLight(view.x,view.mirror);
  rendererState.fb=state.FB_ALT; state.FB_ALT.fill(0); drawBoxer(); rendererState.fb=rendererState.FB_MAIN;
  composite(view.mirror,false,view.dx,view.dy,view.scaleX,isShadowboxing()&&F===state.FB);
}

/** Present Cień: the painted cell, the shadow and the boxer. */
export function renderSpar(){
  rendererState.fb=rendererState.FB_MAIN; rendererState.fb.set(state.bgRing);
  const hot=boxingState.shakeT>0||state.SP.phase==='end';
  cellFightBack(hot);
  for(let i=0;i<2;i++){ const F=state.FIG[i],view=fighterView(F); shadowEll(view.x,appearanceState.FLOOR_Y+view.dy-Math.round(F.ky||0),F.st===animationState.S_KO?13:Math.round((F.stW*0.5+6)*view.scaleX),1); }
  drawParticles(true);
  const aAtt=state.FA.st>=0&&state.FA.st<=3;
  const front=state.SP.pivot||aAtt?state.FA:state.FB;
  drawFighter(front===state.FA?state.FB:state.FA); drawFighter(front);
  cellFightFront();
  drawParticles(false);
  if(state.SP.pivot)drawText('PIVOT',72,30,appearanceState.C_SWEAT,1);
  drawPopups();
  switchTo(state.FA);
}

/* ---------- Cień: the training tempo and effort ---------- */

/** How fast a fighter's move plays: tree speed, bare fists, tiredness and stun (Cień: the training tempo). @param {any} F @param {number} id */
export function sparMoveSpeed(F,id){
  const punch=id>=0&&id<=3, reaction=(id>=animationState.S_HITJ&&id<=animationState.S_BLOCKHIT)||id===animationState.S_STAGGER||id===animationState.S_GETUP;
  const base=punch?F.spd:reaction?(F.spdBack??F.spd):(F.spdFoot??F.spd), quick=isBareknuckle()&&(punch||reaction)?1.15:1, stamina=Math.max(0,Math.min(1,staF(F)));   /* never below 0: a stalled move would hang the reveal */
  return base*quick*(punch?0.45+0.55*stamina:0.8+0.2*stamina)*(F.stun>55?0.85:1)*(isShadowboxing()?state.shadowRate:1);
}

/** Effort in Cień: a slice of every effort wears the ceiling down (the card fight keeps its own stamina). @param {any} F @param {number} x */
export function spendSta(F,x){ F.sta=Math.max(0,F.sta-x); F.staMax=Math.max(F.staCap*0.3,F.staMax-x*F.fat); if(F.sta>F.staMax) F.sta=F.staMax; }
/** @param {any} F @param {number} x */
function gainSta(F,x){ F.sta=Math.min(F.staMax,F.sta+x); }

/** A dash costs effort (Cień). @param {any} F */
export function sparDashCost(F){ if(isShadowboxing()) spendSta(F,2.5); }

/** Raising the guard is not free (Cień). @param {any} F */
export function sparRaiseGuard(F){ if(isShadowboxing()) spendSta(F,1); }

/** Slips and the weave cost effort, and a streak of evades that dodged nothing costs more each time (Cień). @param {any} F @param {number} id */
export function sparEvadeCost(F,id){
  if(!isShadowboxing()) return;
  if(boxingState.tick-F.evLast>state.EV_RESET) F.evChain=0; else if(F.evActive&&!F.evHit) F.evChain++;
  const k=F.evChain, cost=Math.min(22,state.EV_BASE[id===animationState.M_DODGE?2:id-animationState.M_SLIPL]*(1+0.6*k+0.3*k*k));
  spendSta(F,cost); F.evLast=boxingState.tick; F.evActive=true; F.evHit=false;
  if(k>=1) popup(state.T_MINUS+Math.min(19,Math.round(cost)-1),wX(boxingState.headX),boxingState.headY-9,k>=3?appearanceState.C_RED:state.C_HPM,1,26);
}

/** A punch starts (boxing.startMove): it is counted; in Cień it costs effort. @param {number} id */
export function sparOnAttack(id){
  const A=state.ctxF, m=animationState.MOVES[id];
  if(m.special) return;
  if(isShadowboxing()) spendSta(A,state.STA_COST[id]*0.6);
  A.thrown++;
}

/** A slip or the weave avoids a punch while it is in its window (draw order, glove contact). @param {any} D @param {number} pid */
function evades(D,pid){
  const s=D.st, t=D.stT; if(pid<0||pid>3) return false;
  if((s===animationState.M_SLIPL||s===animationState.M_SLIPR)&&t>=2&&t<=15) return pid<=1;
  if(s===animationState.M_DODGE&&t>=3&&t<=18) return pid<=2;
  return false;
}

/** Whether a move that holds keeps holding: a raised guard, the boards, the winner's pose, the KO. @param {any} F */
function holdFor(F){
  const s=boxingState.state;
  if(s===animationState.S_BLOCK||s===animationState.S_SHELL) return F.blockT>0;
  if(s===animationState.S_KD) return F.down;
  return s===animationState.S_WIN||s===animationState.S_KO;
}

/** A reaction ordered by the impact starts now. @param {any} F */
function applyHit(F){
  const id=F.pendHit; F.pendHit=-1; boxingState.buffered=-1; if(id!==animationState.S_BLOCKHIT) F.blockT=0;
  const t0=F.hitT0||0; F.hitT0=0; startMove(id,t0);   // a hit reaction starts on its first key: the head is already thrown on the freeze frame
}

/** One fighter's simulation step in its own frame: idle mood, a pending reaction, the animation, sweat and blood. @param {any} F */
function fighterStep(F){
  switchTo(F);
  if(boxingState.flashL>0)boxingState.flashL--; if(boxingState.flashR>0)boxingState.flashR--;
  boxingState.STATS.speed=sparMoveSpeed(F,boxingState.state);
  animationState.idleTired=Math.max(0,Math.min(1,(0.7-staF(F))/0.7)); animationState.idleHurt=Math.max(0,Math.min(1,Math.max(F.stun/80,(0.35-F.hp/F.hpMax)/0.35*0.7)));
  animationState.idleClose=hipDist(F)<25?1:0; animationState.idleSeed=F.mirror?91:7;
  if(F.pendHit>=0) applyHit(F);
  boxingState.buffered=-1;
  stepAnim(F,true);
  if(staF(F)<0.6&&Math.random()<(0.6-staF(F))*0.12) spawn(boxingState.P_SWEAT,boxingState.headX-1+Math.random()*3,boxingState.headY-3+Math.random()*3,(Math.random()-0.6)*0.5,-0.3-Math.random()*0.4,40,appearanceState.C_SWEAT);   // dripping when tired
}

/** One tick of Cień: the pair of animated fighters (the silhouette idles), effort and breath. */
export function sparUpdate(){
  if(isShadowboxing())shadowTick();
  if(state.SP.phase==='fight')state.SP.elapsed++;
  if(boxingState.hitstop>0){ boxingState.hitstop--; return; }
  state.SP.pt++;
  if(state.SP.pivot){ pivotTick(); switchTo(state.FA); return; }
  if(boxingState.tick&1){ fighterStep(state.FA); fighterStep(state.FB); } else { fighterStep(state.FB); fighterStep(state.FA); }
  for(let i=0;i<2;i++){ const F=state.FIG[i]; if(F.pendHit>=0){ switchTo(F); applyHit(F); stepAnim(F,false); } }
  for(const F of state.FIG){
    const s=F.st;
    F.stun=Math.max(0,F.stun-0.16); if(F.hurt>0)F.hurt--; if(F.blockT>0)F.blockT--;
    if(isShadowboxing()){ if(s===animationState.IDLE||s===animationState.M_WALKF||s===animationState.M_WALKB) gainSta(F,0.055*F.regen); else if(s===animationState.S_BLOCK) gainSta(F,0.025*F.regen); }   // Cień breathes
    if(F.hpShow>F.hp) F.hpShow=Math.max(F.hp,F.hpShow-0.25);
    if(F.staShow>F.sta) F.staShow=Math.max(F.sta,F.staShow-0.4); else F.staShow=F.sta;
  }
  updateParticles();
  switchTo(state.FA);
}

/** The rival of the current fight (cell, yard and bath, the meal). @param {number} [i] */
export function oppDef(i){ return (state.sparVenue==='cell'?state.CELL_OPP:state.sparVenue==='canteen'?state.CANTEEN_OPP:state.YARD_OPP)[i===undefined?state.sparOpp:i]; }

/** Start a brawl (the isometric fight scene, iso-fight.js) or Cień (this module's side-on training scene); a rematch keeps the venue and the return station.
 * @param {number} idx @param {string} [venue] @param {any} [station] @param {boolean} [shadow] */
export function startSpar(idx,venue,station,shadow=false){
  if(!shadow){ startIsoFight(idx,venue,station); return; }
  const selected='cell', save=progressionState.save;
  initAudio(); inputState.overEl.hidden=true;
  if(boxingState.gstate==='pushup') puReset(); if(boxingState.gstate==='spar') sparExit();
  clearParticles();
  clearHeldInput(); state.FA.mirror=false; state.FB.mirror=true;
  state.shadow=true; state.shadowRate=1;
  state.sparVenue=selected; state.bareknuckle=true;
  if(station) state.cellFightSt=station;
  state.sparOpp=idx; const O=oppDef(idx);
  boxingState.mode=boxingState.M_SPAR; boxingState.gstate='spar'; setFlow(false); boxingState.combo=0; animationState.walkHeld=-1; boxingState.hitstop=0; boxingState.shakeT=0;
  resetClock(60000/100,boxingState.simNow);
  if(!state.sparLkSave) state.sparLkSave=appearanceState.lk;
  snapFighterLook(state.FA,save.eq,save.look);
  snapFighterLook(state.FB,Object.assign({},save.eq,O.eq),O.look);
  prisonPal(state.FA); prisonPal(state.FB);
  applyGear(save.eq); applyLook(save.look);
  const st=save.stats, bonus=applyFighterStats(state.FA,{str:st.str.lvl,spd:st.spd.lvl,end:st.end.lvl});
  Object.assign(state.FA,{name:'TY',title:'Ty',manual:true,hpMax:100+bonus});
  applyFighterStats(state.FB,oppLevels(O));
  Object.assign(state.FB,{name:O.name,title:O.title,manual:true,hpMax:O.hp});
  state.FA.regen=4; state.FB.name='CIEŃ';
  for(const F of state.FIG){ Object.assign(F,{evChain:0,evLast:-999,evActive:false,evHit:false,staShow:F.staCap,hp:F.hpMax,hpShow:F.hpMax,sta:F.staCap,staMax:F.staCap,stun:0,dmg:0,blood:[],down:false,ko:false,kdN:0,hurt:0,thrown:0,landed:0,power:0,evades:0,blocks:0,counters:0,body:0,minSta:1,perfects:0,wounds:null,faceL:-999,headY:-99,hipY:-99}); }
  resetFighter(state.FA); resetFighter(state.FB); state.ctxF=state.FB; switchTo(state.FA);
  Object.assign(state.SP,{phase:'fight',t:0,elapsed:0,pt:0,winner:null,how:'',pivot:null,pivotCD:0}); buildRing(selected);
  document.body.classList.remove('pushup'); document.body.classList.add('spar');
  setPanelMode(); setInfo();
}

/** The backdrop of Cień: the painted Ward cell. @param {string} _venue */
export function buildRing(_venue){
  rendererState.fb=state.bgRing; cellFightBg(); rendererState.fb=rendererState.FB_MAIN;
  setVenueLight(102,16,0.4);   // the cell's barred window (x 95-109, y 10-21 on the painting)
}

export function initialize(){
state.contextSources = {boxing:boxingState,animation:animationState,sparring:state};

/* =====================================================================
   CIEŃ — two fighters on one skeleton / renderer
   ---------------------------------------------------------------------
   Every fighter is simulated in its OWN right-facing local frame by exactly the same
   animation code as the bag work: the module-level animation globals (state, cur, joints,
   shorts spring…) are swapped per fighter (switchTo). The opponent is drawn into a spare
   buffer and composited mirrored (x -> W-1-x), so seen from either fighter the other one
   sits at W-1-x: converting a position between the two frames is always x' = W-1-x.
   Only Cień (shadowboxing) is fought here, against the reference silhouette; the brawls of the prison are played
   in the isometric rooms (iso-fight.js), which share the opponents' tables and the fight record below.
   ===================================================================== */
state.RING_MIN = -36;
state.MIN_DIST = 18;
state.START_POS = -10;

state.FB_ALT = new Uint32Array(appearanceState.W*appearanceState.H);
state.FB_PRE = new Uint32Array(appearanceState.W*appearanceState.H);   // the bath: the frame before the fighters (their reflection)
state.bgRing = new Uint32Array(appearanceState.W*appearanceState.H);

state.ctxF = null;
state.oppF = null;
state.mirrorCtx = false;
state.aimLow = 0;
state.nextLow = 0;
state.idleOff = 0;

state.sparVenue = 'cell';   // 'cell' / 'canteen' = the Ward, 'yard', 'laznia' = the bath
state.bareknuckle = false;
state.shadow = false;
state.shadowRate = 1;
state.sparOpp = 0;
state.lyingDraw = false;
state.faceDmg = 0;
state.sparLkSave = null;

state.SP = {phase:'off', elapsed:0, pt:0, winner:null, how:''};

state.FA = mkFighter();
state.FB = mkFighter();
state.FIG = [state.FA,state.FB];

state.FA.opp=state.FB;
 state.FB.opp=state.FA;
 state.FB.mirror=true;
 state.FB.idleOff=0.37;

// fist fights in the Ward: the three cellmates (bare knuckles, the frieze jacket)
state.CELL_OPP = [
  {name:'HARRY',title:'Harry „Stary” Hobbs',style:'counter',hp:95, rank:2,perks:['clinch','shell'],eq:{},
   look:{skin:'s2',hair:'h6',style:'buzz',eyes:'narrow',brows:'thick',nose:'broken',facial:'stubble',extra:'none'}},
  {name:'ZEKE',title:'Zeke „Kosa” Price',style:'out',    hp:100,rank:8,perks:['shove','dirty-work'],eq:{},
   look:{skin:'s1',hair:'h2',style:'short',eyes:'normal',brows:'normal',nose:'straight',facial:'stubble',extra:'scar'}},
  {name:'REUBEN',title:'Reuben „Kruk” Doyle', style:'press',  hp:120,rank:12,perks:['heavy-hands','charged-punch'],eq:{},
   look:{skin:'s3',hair:'h1',style:'buzz',eyes:'narrow',brows:'angry',nose:'broken',facial:'mustache',extra:'none'}},
];

// The seven existing yard inmates keep their visible skin and hair in the fight.
state.YARD_OPP = [
  {name:'JACK',title:'Jack „Młody” Morley',style:'bal',hp:90,rank:3,eq:{},look:{skin:'s1',hair:'h2',style:'short',facial:'none'}},
  {name:'WALTER',title:'Walter „Chudy” Pratt',style:'out',hp:95,rank:6,eq:{},look:{skin:'s2',hair:'h1',style:'buzz',facial:'stubble'}},
  {name:'JOSEPH',title:'Joseph „Siwy” Marsh',style:'counter',hp:100,rank:8,eq:{},look:{skin:'s3',hair:'h6',style:'buzz',facial:'stubble'}},
  {name:'ALBERT',title:'Albert „Ciężki” Rudd',style:'press',hp:115,rank:10,eq:{},look:{skin:'s4',hair:'h3',style:'bald',facial:'beard'}},
  {name:'SILAS',title:'Silas „Cichy” Crane',style:'counter',hp:100,rank:12,eq:{},look:{skin:'s2',hair:'h1',style:'buzz',facial:'none'}},
  {name:'NED',title:'Ned „Dym” Coker',style:'bal',hp:105,rank:14,eq:{},look:{skin:'s1',hair:'h4',style:'short',facial:'stubble'}},
  {name:'DAN',title:'Dan „Głaz” Mullins',style:'press',hp:120,rank:17,eq:{},look:{skin:'s5',hair:'h1',style:'bald',facial:'beard'}},
  // the end of Profesor's list: the yard boss, the only ★★★ in prison (no yard figure; he is called from the yard door)
  {name:'SZEF',title:'Szef spacerniaka',style:'counter',hp:130,rank:20,perks:['dirty-work','shove','counterpuncher','read-tells'],eq:{},look:{skin:'s3',hair:'h1',style:'short',eyes:'narrow',brows:'angry',nose:'broken',facial:'mustache',extra:'scar'}},
];

// Fights at the meal from Profesor's list (#3 Zeke, #9 Dan): in the Ward over the bowls, everybody watching.
state.CANTEEN_OPP = [
  {name:'ZEKE',title:'Zeke „Kosa” Price',style:'out',hp:100,rank:8,perks:['shove','dirty-work'],eq:{},
   look:{skin:'s1',hair:'h2',style:'short',eyes:'normal',brows:'normal',nose:'straight',facial:'stubble',extra:'scar'}},
  {name:'DAN',title:'Dan „Głaz” Mullins',style:'press',hp:120,rank:17,perks:['heavy-hands'],eq:{},look:{skin:'s5',hair:'h1',style:'bald',facial:'beard'}},
  // the one who takes bowls (daily event)
  {name:'BILL',title:'Bill „Gruby” Bellamy',style:'press',hp:110,rank:7,perks:['shove'],eq:{},look:{skin:'s2',hair:'h3',style:'buzz',facial:'stubble'}},
];

state.PRIS_SHOE = ['#141416','#26262a','#3e3e44'];
state.PRIS_SOLE = ['#0c0c0e','#1e1e22','#303036'];

state.cellFightSt = null;
state.WORK_RAMPS = undefined;   // filled in by work.js
//            jab  cross hook upper — the effort of a punch in Cień
state.STA_COST = [1.8,3.5,4.2,4.5];

state.T_IDEAL = 40;
state.T_LVL = 41;
state.T_RUNDA = 26;
state.T_WALCZ = 29;
state.T_NOKDAUN = 30;
state.T_CZAS = 31;
state.T_BLOK = 32;
state.T_UNIK = 33;
state.T_KONTRA = 34;
state.T_KOX = 35;
state.T_TKO = 36;
state.T_WIN = 37;
state.T_LOSE = 38;
state.T_DRAW = 39;

/* Evading costs stamina, and a streak of evades that dodged NOTHING costs more each time
   (punishes spamming slips and hoping). A successful evade or ~1.8 s without evading resets the streak. */
state.EV_BASE = [2,2,2.6];
state.EV_RESET = 110;

state.T_CUT = boxingState.TXT.length;
 boxingState.TXT.push('ROZCIECIE','OSTRZEZENIE','BURZA!','BOMBA!','KLINCZ','ODEPCHNIETY','NA LINY!','Z BYKA!','PAROWANIE','PRZELOT','STREFA','SZAL!','WSTAN!','ZEBRO','ZLAMANY!','SERIA!','WYBUCH!','ODSLONIETY');
 ['T_WARN','T_STORM','T_BOMB','T_CLINCH','T_SHOVE','T_ROPES','T_HEADBUTT','T_PARRY','T_OVER','T_ZONE','T_RAGE','T_RISE','T_RIB','T_BROKEN','T_FLURRY','T_BURST','T_OPEN'].forEach((k,i)=>{ state[k]=state.T_CUT+1+i; });

state.T_KASTET = boxingState.TXT.length; boxingState.TXT.push('KASTET!','PIACH!','KCIUK!','BETON!','CZAS!');
state.T_HOLE = boxingState.TXT.length; boxingState.TXT.push('DZIURA!');
state.T_DMG = boxingState.TXT.length; for(let n=1;n<=30;n++) boxingState.TXT.push('-'+n);   // damage numbers over a struck head
state.T_CARD = boxingState.TXT.length; boxingState.TXT.push('OTWARCIE I','OTWARCIE II','OTWARCIE III','ZWOD!','ODDECH','WYPRZEDZONY','ZAMACH','NADZIANY!','SKURCZ','ZADYSZKA','PRZEBICIE','MROCZKI','POL UNIKU','PUSTO','PODBITE OKO','NOS!','KOSTKA!','WSTRZAS!','NOGI!','OGLUSZONY','KONDYCJA +1','MIJANKA','STREFA','SZAL!');
state.T_TIME = state.T_KASTET+4; state.T_SAND = state.T_KASTET+1; state.T_THUMB = state.T_KASTET+2; state.T_JAW = state.T_KASTET+3;
state.rigged = false;
state.rigKO = false;
state.timeLimit = 0;

state.T_MINUS = boxingState.TXT.length;
 for(let i=1;i<=20;i++) boxingState.TXT.push('-'+i);

state.C_STAIN = rgb('#5a1420');
state.C_STAIN2 = rgb('#74182a');

// Cień: the reference silhouette
state.C_GHOST2 = rgb('#2a6f8a');

state.C_HPM = rgb('#ffd23f');
state.C_BLOOD = rgb('#a50e1c');
state.C_BLOOD2 = rgb('#e02a3a');
state.C_BRUISE = rgb('#6a3a6a');
state.C_BRUISE2 = rgb('#4a2448');
}

````

---

## `src/input.js`

````js
import { state as boxingState } from './boxing.js';
import { state as armState, armKey, armButton } from './armwrestle.js';
import { prisonKey } from './prison.js';
import { state as loopState, resumeClock } from './loop.js';
import { initAudio, state as audioState } from './audio.js';
import { state as sparringState, isShadowboxing } from './sparring.js';
import { shadowInputMirror, shadowDoubleTap, shadowPress, startShadowboxing, state as shadowState } from './shadowboxing.js';
import { releaseWalk, state as animationState } from './animation.js';
import { holdPushup, pushupInfo } from './pushups.js';
import { holdPullup, pullupInfo } from './pullups.js';
import { roachKey, roachKeysOff, roachStrike, roachInfo } from './roaches.js';
import { crankKey, crankKeysOff, crankInfo } from './crank.js';
import { simUI } from './simulation.js';
import { state as gymState, clearHubInput } from './gym.js';
import { statShort, setDevMode } from './progression.js';
import { state as roomsState, actStop } from './rooms.js';
import { state as workState, workHint, workKey, workTap, workStepKey, workEnd, workGo } from './work.js';
import { sysKey } from './menu.js';
import { dlgKey } from './dialog.js';
import { state as optionsState, optsToggle } from './options.js';
import { hubKey, exitToHub, state as navigationState, stMenuPick, stMenuOpen } from './navigation.js';
import { state as rendererState, resize, render } from './renderer.js';
import { inputTime } from './time.js';
import { skillTreeOpen, skillTreeKey } from './skill-tree.js';
import { charSheetKey, charSheetOpen } from './char-sheet.js';
import { sessionKey, sessionOpen, sessionRunning } from './training-session.js';
import { DEBUG } from './config.js';
import { state as appearanceState } from './appearance.js';
import { state as menuState } from './menu.js';
import { state as dialogState } from './dialog.js';
import { update } from './runtime.js';
import { isoFightKey, isoFightRelease, isoFightInfo, CONTROLS as ISO_CONTROLS } from './iso-fight.js';

export const state = {};

/** Release held gameplay controls before opening or closing a modal. */
export function clearHeldInput(){
  crankKeysOff();isoFightRelease();
  clearHubInput(); releaseWalk(); state.bodyHeld=false; holdPullup(false); holdPushup(false); roachKeysOff(); resetDirectionTap();
}

/** Change pause without resetting time; diagnostics can freeze held input for fixed-step checks.
 * @param {boolean} paused @param {boolean} [releaseHeld] */
export function setPaused(paused,releaseHeld=true){
  if(paused&&releaseHeld) clearHeldInput();
  if(state.paused===paused) return;
  state.paused=paused;
  if(!paused) resumeClock();
}

/** Frame-freeze (F8, only under ?debug=1) with a debug readout so a stuck frame can be located; "." steps one tick while frozen. P stays the character sheet. */
function freezeInfo(){
  const t=Math.round(boxingState.simNow/appearanceState.STEP_MS), SP=sparringState.SP;
  return ['FREEZE  gstate='+boxingState.gstate+(boxingState.gstate==='hub'||boxingState.gstate==='menu'?'  room='+gymState.hubRoom:''),
    'tick='+t+'  simNow='+boxingState.simNow.toFixed(1)+'ms  url='+location.search,
    boxingState.gstate==='spar'?'spar: opp='+sparringState.sparOpp+' phase='+SP.phase+' elapsed='+SP.elapsed+(isShadowboxing()?' shadow':''):'',
    'F8 wznów · . krok 1 tick'].filter(Boolean).join('\n');
}
function freezeShow(){
  if(!state.freezeEl){ const el=state.freezeEl=document.createElement('pre'); el.style.cssText='position:fixed;left:8px;top:8px;z-index:99;margin:0;padding:6px 8px;background:#000c;color:#39ff7a;font:11px/1.3 monospace;pointer-events:none;user-select:text'; document.body.appendChild(el); }
  state.freezeEl.hidden=false; state.freezeEl.textContent=freezeInfo();
}
function freezeKey(e){
  const modal=!menuState.sysEl.hidden||!dialogState.dlgEl.hidden||!optionsState.optsEl.hidden||e.target.tagName==='INPUT'||e.target.tagName==='SELECT';
  if(!DEBUG||modal||e.ctrlKey||e.metaKey||e.altKey) return false;
  if(e.code==='F8'){
    e.preventDefault(); if(e.repeat) return true;
    state.frozen=!state.frozen; setPaused(state.frozen);
    if(state.frozen){ freezeShow(); console.log(freezeInfo()); } else if(state.freezeEl) state.freezeEl.hidden=true;
    return true;
  }
  if(!state.frozen) return false;
  if(e.code==='Period'){ e.preventDefault(); boxingState.simNow+=appearanceState.STEP_MS; update(); render(); freezeShow(); }
  return true;   // frozen: nothing else reaches the game
}

/** Shared simulation time for keyboard and touch controls. */
export function inputNow(){ return inputTime(boxingState.simNow,loopState.acc,loopState.last,performance.now(),state.paused); }

/** Route fighter controls only to the shadow training. */
export function press(mv){
  if(state.paused||skillTreeOpen()||(sessionOpen()&&!sessionRunning())) return;
  initAudio();
  if(boxingState.gstate==='spar'&&isShadowboxing()){ if(mv<=3)resetDirectionTap(); shadowPress(mv); }
}

/** One hint by the object instead of a bar of controls. @param {string} [title] @param {string} [sub] @param {string} [key] */
function setPrompt(title,sub,key='E'){
  if(!state.promptEl) return;
  state.promptEl.hidden=!title; if(!title) return;
  state.promptKeyEl.textContent=key; state.promptTitleEl.textContent=title; state.promptSubEl.textContent=sub||'';
}

/** Upper case without diacritics, to match "PODCIAGANIE" with "podciąganie". @param {string} t */
const plain=t=>t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();

/** The nearby station, person or running activity as the hub prompt. */
function hubPrompt(){
  if(boxingState.gstate!=='hub') return setPrompt();
  if(roomsState.hubAct) return setPrompt('PRZERWIJ',roomsState.hubAct.label);
  const n=gymState.hubNear;
  if(n){   // "Gazety na podłodze — pompki", "Harry — współwięzień": the part naming the thing is the title, the other one the note
    const t=String(n.title||''), N=plain(String(n.name||t)), [a,b]=t.split(' — ');
    if(b!==undefined&&plain(b)===N) return setPrompt(b.toUpperCase(),a);
    if(b!==undefined&&plain(a)===N) return setPrompt(a.toUpperCase(),b);
    return setPrompt(String(n.name||t).toUpperCase(),plain(t)===N?'':t); }
  setPrompt();
}

export function setInfo(){
  simUI(); hubPrompt(); state.controlsText=''; state.livesEl.textContent='';
  if(boxingState.gstate==='hub'||boxingState.gstate==='menu'){
    const room={cell:'WARD',yard:'SPACERNIAK',laznia:'ŁAŹNIA'}[gymState.hubRoom]||'WARD';
    state.infoEl.textContent=room+(roomsState.hubAct?' · '+roomsState.hubAct.label:gymState.hubNear?' · '+gymState.hubNear.title+' — E':' · rozejrzyj się');
    state.nextEl.textContent=roomsState.hubAct?'Esc / E — przerwij':'strzałki / WASD — chodzenie · E — użyj · Esc — pauza · P — karta · '+statShort();
    return;
  }
  if(boxingState.gstate==='work'){ state.infoEl.textContent='RZEŹNIA · półtusza '+Math.min(workState.WK.n+(workState.WK.phase==='end'?0:1),workState.WK_N)+'/'+workState.WK_N+(workState.WK.drops?' · upuszczone: '+workState.WK.drops:''); state.nextEl.textContent=workHint()+(workState.WK.phase==='end'?'':' · Esc — koniec zmiany'); return; }
  if(boxingState.gstate==='arm'){ const A=armState.A; state.infoEl.textContent='SIŁOWANIE NA RĘKĘ'+(A?' · '+A.name+(A.stake==='porcja'?' · o porcję':A.stake==='miejsce'?' · o miejsce':' · dla sportu'):''); state.nextEl.textContent=A&&A.result?'Enter — wróć do Wardu':'Spacja / E — pchnij w rytm kółka · przytrzymaj S / ↓ — zaprzyj się, gdy rywal czerwienieje · Esc — poddaj się'; return; }
  if(boxingState.gstate==='spar'){
    state.nextEl.textContent='';
    state.infoEl.textContent='WALKA Z CIENIEM · WARD';
    state.controlsText='1–4 ciosy · ↓+cios korpus · Q slip · 2×przód doskok / pivot · 2×tył odskok · Esc — koniec';
    return;
  }
  if(boxingState.gstate==='isofight'){ state.infoEl.textContent=isoFightInfo(); state.nextEl.textContent=''; state.controlsText=ISO_CONTROLS; return; }
  if(boxingState.gstate==='pullup'){ pullupInfo(); return; }
  if(boxingState.gstate==='roach'){ roachInfo(); return; }
  if(boxingState.gstate==='crank'){ crankInfo(); return; }
  if(boxingState.gstate==='pushup'){ pushupInfo(); return; }

}

/** Clear incomplete direction gestures when gameplay loses focus or changes mode. */
export function resetDirectionTap(){ state.tapMv=-1; state.tapMode=''; }

/** Consume two presses of the same direction within the existing 280 ms dash window.
 * @param {number} mv @param {number} [now] Shared input time, in milliseconds.
 * @returns {boolean} Whether this press completes a pair.
 */
export function directionDoubleTap(mv,now=inputNow()){
  const mode=boxingState.gstate==='spar'?'spar:'+sparringState.SP.phase+':'+(isShadowboxing()?shadowInputMirror():!!sparringState.FA?.mirror):boxingState.gstate;
  if(state.tapMv===mv&&state.tapMode===mode&&now-state.tapT>=0&&now-state.tapT<280){ resetDirectionTap(); return true; }
  state.tapMv=mv; state.tapT=now; state.tapMode=mode; return false;
}

/** Translate screen-left/right into movement relative to the player's current facing. @param {number} mv */
/** The one slip button (Q): the head goes outside the punch coming in (a jab: right, a cross: left),
 * with nothing coming in it goes to either side by turns. */
export function slipMove(){
  const L=animationState.M_SLIPL, R=animationState.M_SLIPR, O=boxingState.gstate==='spar'&&!isShadowboxing()?sparringState.FB:null;
  if(O&&(O.st===0||O.st===1)) return O.st===0?R:L;
  state.slipSide=!state.slipSide; return state.slipSide?L:R;
}

export function screenMove(mv){
  if(mv===animationState.M_SLIPL) return slipMove();
  return boxingState.gstate==='spar'&&(isShadowboxing()?shadowInputMirror():sparringState.FA.mirror)&&(mv===animationState.M_WALKF||mv===animationState.M_WALKB)?(mv===animationState.M_WALKF?animationState.M_WALKB:animationState.M_WALKF):mv;
}

/** Keep walking/dashes, using a close forward pair to pivot around the opponent. @param {number} mv */
function walkTap(mv){
  if(directionDoubleTap(mv)){
    releaseWalk();
    if(boxingState.gstate==='spar'&&isShadowboxing())shadowDoubleTap(mv===animationState.M_WALKF);
    else press(mv===animationState.M_WALKF?animationState.M_DASHF:animationState.M_DASHB);
    return true;
  }
  animationState.walkHeld=mv; return false;
}

export function initialize(){


/* =====================================================================
   INPUT + HUD
   ===================================================================== */
state.gradeEl = document.getElementById('grade');
state.infoEl = document.getElementById('info');
state.livesEl = document.getElementById('lives');
state.nextEl = document.getElementById('next');
state.promptEl = document.getElementById('prompt');
state.promptKeyEl = document.getElementById('promptKey');
state.promptTitleEl = document.getElementById('promptTitle');
state.promptSubEl = document.getElementById('promptSub');
state.controlsText = '';
// Screen buttons are for touch screens; the keyboard player gets a clean picture.
document.body.classList.toggle('debug',DEBUG);
if(navigator.maxTouchPoints>0||matchMedia('(any-pointer: coarse)').matches) document.body.classList.add('touch');
addEventListener('touchstart',()=>document.body.classList.add('touch'),{once:true,passive:true});

state.overEl = document.getElementById('over');
state.overTitle = document.getElementById('overTitle');
state.overStats = document.getElementById('overStats');
state.againBtn = document.getElementById('again');

state.gradeTimer = 0;
state.paused = false;
state.bodyHeld = false;

// Close forward pairs pivot. Down also aims punches at the body (and holds the low guard in a fight).
state.tapMv = -1;
state.tapT = 0;
state.tapMode = '';
state.slipSide = false;

state.KEYMAP = {KeyQ:5,ArrowRight:7,KeyD:7,ArrowLeft:8,KeyA:8,Digit1:0,KeyJ:0,Numpad1:0,Digit2:1,KeyK:1,Numpad2:1,Digit3:2,KeyL:2,Numpad3:2,Digit4:3,KeyI:3,Numpad4:3,Digit5:4,Space:4,Numpad5:4};


addEventListener('keydown',e=>{
  if(freezeKey(e)) return;
  if(charSheetKey(e)||prisonKey(e)||skillTreeKey(e)||sysKey(e)||dlgKey(e)) return;
  if(!optionsState.optsEl.hidden){ if(e.code==='Escape'||e.code==='KeyO'){ e.preventDefault(); optsToggle(false); } e.stopImmediatePropagation(); return; }
  if(e.code==='KeyO'&&!e.repeat&&!e.ctrlKey&&!e.metaKey&&e.target.tagName!=='INPUT'&&e.target.tagName!=='SELECT'){ e.preventDefault(); optsToggle(true); return; }
  if(e.repeat)return;
  if(sessionKey(e)) return;
  if(boxingState.gstate==='work'){ workKey(e); return; }
  if(boxingState.gstate==='crank'){ crankKey(e,true); return; }
  if(boxingState.gstate==='arm'){ armKey(e,true); return; }
  if(boxingState.gstate==='isofight'){ isoFightKey(e,true); return; }
  if(boxingState.gstate==='hub'){ hubKey(e,true); return; }
  if(boxingState.gstate==='spar'){
    if(isShadowboxing()&&shadowState.sequence.finished){
      if(e.code==='Enter'){e.preventDefault();startShadowboxing();}
      else if(e.code==='Escape')exitToHub();
      return;
    }
    if(e.code==='Escape'){exitToHub();return;}
    if(e.code==='ArrowUp'||e.code==='ArrowDown'){
      e.preventDefault();
      if(e.code==='ArrowDown') state.bodyHeld=true;   // Cień: ↓ + punch goes to the body
      return;
    }
    const mv=screenMove(state.KEYMAP[e.code]);
    if(mv!==undefined){e.preventDefault(); if(mv===animationState.M_WALKF||mv===animationState.M_WALKB)walkTap(mv); else press(mv); return;}
    if(DEBUG&&e.code==='KeyG'){boxingState.debug=!boxingState.debug;state.dbgEl.checked=boxingState.debug;}
    if(e.code==='KeyM'){audioState.soundOn=!audioState.soundOn;state.sndEl.checked=audioState.soundOn;}
    return;
  }
  if(boxingState.gstate==='over'){ if(e.code==='Enter'||e.code==='Space'){e.preventDefault();state.againFn();} else if(e.code==='Escape')exitToHub(); return; }
  if(e.code==='Escape'){exitToHub();return;}
  if(boxingState.gstate==='pullup'){ if(e.code==='Space'||e.code==='KeyE'){e.preventDefault();holdPullup(true);} return; }
  if(boxingState.gstate==='roach'){ if(e.code==='Space'||e.code==='Enter'){e.preventDefault();roachStrike();} else if(roachKey(e.code,true)) e.preventDefault(); return; }
  if(boxingState.gstate==='pushup'){ if(e.code==='Space'||e.code==='KeyE'){e.preventDefault();holdPushup(true);} return; }
  const mv=screenMove(state.KEYMAP[e.code]);
  if(mv!==undefined){e.preventDefault(); if(mv===animationState.M_WALKF||mv===animationState.M_WALKB){ if(!walkTap(mv)) press(mv); return; } press(mv);return;}
  if(DEBUG&&e.code==='KeyG'){boxingState.debug=!boxingState.debug;state.dbgEl.checked=boxingState.debug;}
  if(e.code==='KeyM'){audioState.soundOn=!audioState.soundOn;state.sndEl.checked=audioState.soundOn;}
});

addEventListener('keyup',e=>{ if(charSheetOpen()||skillTreeKey(e)) return; if(boxingState.gstate==='arm'){ armKey(e,false); return; } if(boxingState.gstate==='isofight'){ isoFightKey(e,false); return; } if(e.code==='Space'||e.code==='KeyE'){ holdPullup(false); holdPushup(false); } if(boxingState.gstate==='roach') roachKey(e.code,false); if(boxingState.gstate==='crank') crankKey(e,false); if(boxingState.gstate==='hub'||boxingState.gstate==='menu') hubKey(e,false); const k=state.KEYMAP[e.code], mv=k===animationState.M_SLIPL?k:screenMove(k); /* releasing Q must not pick the next slip side */ if(mv===animationState.walkHeld)releaseWalk(); if(e.code==='ArrowDown')state.bodyHeld=false; });

addEventListener('blur',clearHeldInput);

document.querySelectorAll('#panel button[data-m]').forEach(b=>{ const mv=+b.dataset.m; if(mv===animationState.M_WALKF||mv===animationState.M_WALKB){
  b.addEventListener('pointerdown',()=>{walkTap(screenMove(mv));}); b.addEventListener('pointerup',releaseWalk); b.addEventListener('pointerleave',releaseWalk); }});

document.querySelectorAll('#panel button[data-m]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();press(screenMove(+b.dataset.m));}));


state.againFn=()=>{};

state.againBtn.addEventListener('click',()=>state.againFn());

state.bodyEl = document.getElementById('bodyMode');
navigationState.stMenuEl=document.getElementById('stMenu');

document.querySelectorAll('#panel button[data-hk]').forEach(b=>{ const k=b.dataset.hk; b.addEventListener('pointerdown',e=>{e.preventDefault();gymState.hubKeys[k]=1;}); b.addEventListener('pointerup',()=>{gymState.hubKeys[k]=0;}); b.addEventListener('pointerleave',()=>{gymState.hubKeys[k]=0;}); });

document.getElementById('hubUse').addEventListener('click',()=>{ if(boxingState.gstate!=='hub') return; if(roomsState.hubAct){ actStop(); return; } if(!navigationState.stMenuEl.hidden) stMenuPick(); else if(gymState.hubNear) stMenuOpen(gymState.hubNear); });

document.querySelectorAll('#panel button[data-wk]').forEach(b=>b.addEventListener('pointerdown',e=>{ e.preventDefault(); if(boxingState.gstate!=='work') return; const k=b.dataset.wk; if(k==='m') workTap(); else if(k==='l') workStepKey(-1); else if(k==='r') workStepKey(1); else workEnd(); }));

document.getElementById('wkReturn').addEventListener('click',()=>workGo());

document.getElementById('toMenu').addEventListener('click',exitToHub);

document.getElementById('menuBtn').addEventListener('click',exitToHub);
document.querySelectorAll('#panel [data-arm]').forEach(b=>{ const a=b.dataset.arm; if(a==='brace'){ b.addEventListener('pointerdown',()=>armButton('brace')); b.addEventListener('pointerup',()=>armButton('braceOff')); b.addEventListener('pointerleave',()=>armButton('braceOff')); } else b.addEventListener('click',()=>armButton(/** @type {any} */ (a))); });

rendererState.stage.addEventListener('pointerdown',()=>{initAudio();window.focus();});

state.sndEl=document.getElementById('snd');
state.dbgEl=document.getElementById('dbg');

state.sndEl.onchange=()=>{audioState.soundOn=state.sndEl.checked;};

state.dbgEl.onchange=()=>{boxingState.debug=state.dbgEl.checked;};

document.getElementById('optDev').onchange=e=>{ const on=e.target.checked; if(!on&&!confirm('Wyłączyć tryb developera? Gra wczyta ostatni zapis.')){ e.target.checked=true; return; } setDevMode(on); };


addEventListener('resize',resize);
}

````

---

## `src/audio.js`

````js

// Runtime values owned by audio; initialized explicitly by main.js.
export const state = {};

export function initAudio(){
  if(state.actx){ if(state.actx.state==='suspended')state.actx.resume(); return; }
  try{
    state.actx=new (window.AudioContext||window.webkitAudioContext)();
    state.master=state.actx.createGain(); state.master.gain.value=0.6; state.master.connect(state.actx.destination);
    const len=(state.actx.sampleRate*0.3)|0; state.noiseBuf=state.actx.createBuffer(1,len,state.actx.sampleRate);
    const d=state.noiseBuf.getChannelData(0); for(let i=0;i<len;i++){const f=1-i/len; d[i]=(Math.random()*2-1)*f*f;}
  }catch(e){state.actx=null;}
}

export function tone(type,f0,f1,dur,vol){
  if(!state.actx||!state.soundOn)return; const t=state.actx.currentTime;
  const o=state.actx.createOscillator(); o.type=type; o.frequency.setValueAtTime(f0,t); if(f1!==f0)o.frequency.exponentialRampToValueAtTime(f1,t+dur*0.8);
  const g=state.actx.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g).connect(state.master); o.start(t); o.stop(t+dur+0.02);
}

/** A short dry fist impact in prison, the existing padded thud elsewhere. */
export function sfxPunch(vol,weight,bare=false){
  if(!state.actx||!state.soundOn)return; const t=state.actx.currentTime;
  const src=state.actx.createBufferSource(); src.buffer=state.noiseBuf;
  const f=state.actx.createBiquadFilter(); f.type=bare?'bandpass':'lowpass'; f.frequency.value=bare?1900:(500+900*(1-weight*0.5));
  const g=state.actx.createGain(); g.gain.setValueAtTime(0.7*vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+(bare?0.075:0.16));
  src.connect(f).connect(g).connect(state.master); src.start(t); src.stop(t+(bare?0.1:0.2));
  tone('sine',bare?170:140-weight*40,bare?80:40,bare?0.07:0.18,(bare?0.7:0.9)*vol);
}

export function sfxWhoosh(vol){
  if(!state.actx||!state.soundOn)return; const t=state.actx.currentTime;
  const src=state.actx.createBufferSource(); src.buffer=state.noiseBuf;
  const f=state.actx.createBiquadFilter(); f.type='bandpass'; f.Q.value=1.2; f.frequency.setValueAtTime(900,t); f.frequency.exponentialRampToValueAtTime(2600,t+0.08);
  const g=state.actx.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.12*vol,t+0.03); g.gain.exponentialRampToValueAtTime(0.001,t+0.1);
  src.connect(f).connect(g).connect(state.master); src.start(t); src.stop(t+0.12);
}

export function sfxFlow(){ tone('triangle',330,990,0.25,0.12); }

export function sfxChime(f){ tone('triangle',f,f*1.5,0.18,0.08); }

/** Bone giving way (a rib, the nose, a knuckle): a dry crack over a dull thud. @param {number} v */
export function sfxCrack(v){ tone('square',2400,420,0.045,0.09*v); tone('sawtooth',900,120,0.07,0.06*v); tone('sine',150,55,0.16,0.32*v); }

export function sfxMiss(){ tone('square',160,90,0.14,0.05); }

export function sfxKO(){ tone('sine',120,35,0.7,0.5); tone('square',220,55,0.5,0.04); }

export function sfxSlap(v){   // hands strike the floor: short bright tick
  if(!state.actx||!state.soundOn)return; const t=state.actx.currentTime;
  const src=state.actx.createBufferSource(); src.buffer=state.noiseBuf;
  const f=state.actx.createBiquadFilter(); f.type='highpass'; f.frequency.value=2200;
  const g=state.actx.createGain(); g.gain.setValueAtTime(0.35*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.035);
  src.connect(f).connect(g).connect(state.master); src.start(t); src.stop(t+0.05);
}

export function sfxBreath(){ if(!state.actx||!state.soundOn)return; const t=state.actx.currentTime; const src=state.actx.createBufferSource(); src.buffer=state.noiseBuf; const f=state.actx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=500; f.Q.value=0.8; const g=state.actx.createGain(); g.gain.setValueAtTime(0.06,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.06); src.connect(f).connect(g).connect(state.master); src.start(t); src.stop(t+0.08); }

export function sfxClap(){ if(!state.actx||!state.soundOn)return; const t=state.actx.currentTime; const src=state.actx.createBufferSource(); src.buffer=state.noiseBuf; const f=state.actx.createBiquadFilter(); f.type='highpass'; f.frequency.value=1400; const g=state.actx.createGain(); g.gain.setValueAtTime(0.5,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.07); src.connect(f).connect(g).connect(state.master); src.start(t); src.stop(t+0.09); }

export function sfxLand(v){ tone('sine',120,55,0.09,0.22*v); }

export function sfxBlock(v,bare=false){   // leather on leather: muffled thump + a dry slap
  if(!state.actx||!state.soundOn)return; const t=state.actx.currentTime;
  const src=state.actx.createBufferSource(); src.buffer=state.noiseBuf;
  const f=state.actx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=bare?2100:1400; f.Q.value=0.9;
  const g=state.actx.createGain(); g.gain.setValueAtTime(0.4*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.06);
  src.connect(f).connect(g).connect(state.master); src.start(t); src.stop(t+0.08);
  tone('sine',110,60,0.08,0.35*v);
}

export function sfxSlowmo(){   // time stretching: a deep falling whoom + a muffled heartbeat
  if(!state.actx||!state.soundOn)return; tone('sine',240,55,0.9,0.35); tone('triangle',90,60,0.25,0.25);
  const t=state.actx.currentTime, src=state.actx.createBufferSource(); src.buffer=state.noiseBuf;
  const f=state.actx.createBiquadFilter(); f.type='lowpass'; f.frequency.setValueAtTime(1800,t); f.frequency.exponentialRampToValueAtTime(200,t+0.6);
  const g=state.actx.createGain(); g.gain.setValueAtTime(0.25,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.7);
  src.connect(f).connect(g).connect(state.master); src.start(t); src.stop(t+0.3);
}

export function sfxBell(n){   // ring bell: inharmonic partials, n strikes
  if(!state.actx||!state.soundOn)return;
  for(let i=0;i<n;i++){ const t=state.actx.currentTime+i*0.3;
    for(let k=0;k<3;k++){ const o=state.actx.createOscillator(); o.type='sine'; o.frequency.value=[1180,2360,3070][k];
      const g=state.actx.createGain(); g.gain.setValueAtTime(k?0.05:0.16,t); g.gain.exponentialRampToValueAtTime(0.0001,t+(k?0.6:1.3));
      o.connect(g).connect(state.master); o.start(t); o.stop(t+1.4); } }
}

/* ---------- the roach wall: filtered noise ---------- */

/** A burst of the shared noise through one filter, delayed by dt seconds; rate stretches it (lower = longer, darker).
 * @param {number} dt @param {BiquadFilterType} type @param {number} f0 @param {number} f1 @param {number} vol @param {number} dur
 * @param {number} [rate] @param {number} [pan] */
function noise(dt,type,f0,f1,vol,dur,rate=1,pan=0){
  const A=state.actx, t=A.currentTime+dt, src=A.createBufferSource(); src.buffer=state.noiseBuf; src.playbackRate.value=rate;
  const f=A.createBiquadFilter(); f.type=type; f.frequency.setValueAtTime(f0,t); if(f1!==f0) f.frequency.exponentialRampToValueAtTime(f1,t+dur*0.9);
  const g=A.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  let out=src.connect(f).connect(g); if(pan&&A.createStereoPanner){ const p=A.createStereoPanner(); p.pan.value=pan; out=out.connect(p); }
  out.connect(state.master); src.start(t); src.stop(t+dur+0.02);
}
/** A tone delayed by dt seconds. @param {number} dt @param {OscillatorType} type @param {number} f0 @param {number} f1 @param {number} dur @param {number} vol */
function toneAt(dt,type,f0,f1,dur,vol){
  const A=state.actx, t=A.currentTime+dt, o=A.createOscillator(); o.type=type; o.frequency.setValueAtTime(f0,t); if(f1!==f0) o.frequency.exponentialRampToValueAtTime(f1,t+dur*0.8);
  const g=A.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g).connect(state.master); o.start(t); o.stop(t+dur+0.02);
}
/** A roach under the knuckles: the shell cracks, a wet tail, the soft knock of the fist behind it. @param {number} v */
export function sfxSquash(v){
  if(!state.actx||!state.soundOn)return;
  toneAt(0,'square',3200,1100,0.014,0.07*v); noise(0,'highpass',4200,4200,0.32*v,0.03);
  noise(0.012,'lowpass',900,300,0.28*v,0.07,0.7); toneAt(0,'sine',120,55,0.09,0.32*v);
}
/** Bare knuckles on the wall: a dead knock and crumbling lime; iron rings. @param {number} surface 0 lime, 1 brick, 2 mortar, 3 iron */
export function sfxKnuckle(surface){
  if(!state.actx||!state.soundOn)return;
  toneAt(0,'sine',surface===1?95:80,40,0.15,0.75); noise(0,'lowpass',surface===1?700:450,200,0.5,0.06,0.8);
  if(surface!==3) noise(0.02,'bandpass',1500,900,0.18,0.11,0.6);   // lime and grit trickling
  else { toneAt(0,'triangle',1830,1790,0.32,0.09); toneAt(0,'sine',2710,2690,0.22,0.05); }
}
/** Breath sucked in through the teeth, longer and sharper the worse it hurts. @param {number} pain 0–100 */
export function sfxHiss(pain){
  if(!state.actx||!state.soundOn)return;
  noise(0.06,'highpass',3600,2200,0.05+0.08*pain/100,0.25+0.25*pain/100,0.55+0.15*pain/100);
  if(pain>=90) toneAt(0.05,'sine',6200,6150,1.1,0.012);   // the ringing in the ears
}
/** Tiny legs on lime: a few quick ticks, placed left or right. @param {number} pan -1..1 @param {number} vol */
export function sfxSkitter(pan,vol){
  if(!state.actx||!state.soundOn)return;
  for(let k=0,dt=0;k<3+(Math.random()*3|0);k++){ noise(dt,'highpass',5200+Math.random()*1800,5000,vol*(0.6+Math.random()*0.4),0.012,1.2,pan); dt+=0.014+Math.random()*0.022; }
}
/** One heartbeat, lub-dub. @param {number} v */
export function sfxHeart(v){ if(!state.actx||!state.soundOn)return; toneAt(0,'sine',62,38,0.11,0.42*v); toneAt(0.16,'sine',56,36,0.1,0.3*v); }
/** The tallow wick spitting. */
export function sfxCrackle(){ if(!state.actx||!state.soundOn)return; noise(0,'bandpass',1300+Math.random()*900,900,0.035,0.025); }
/** Newgate beyond the wall: a drip, a cough or keys far off. @param {number} kind 0 drip, 1 cough, 2 keys, 3 knocks */
export function sfxGaol(kind){
  if(!state.actx||!state.soundOn)return;
  if(kind===0) toneAt(0,'sine',1500,880,0.06,0.04);
  else if(kind===1){ noise(0,'bandpass',420,300,0.08,0.12,0.5); noise(0.22,'bandpass',380,280,0.06,0.1,0.5); }
  else if(kind===2) for(let k=0;k<4;k++) toneAt(k*0.07+Math.random()*0.03,'triangle',2400+Math.random()*700,2300,0.05,0.012);
  else for(let k=0;k<3;k++){ toneAt(k*0.42,'sine',90,50,0.14,0.5); noise(k*0.42,'lowpass',380,200,0.25,0.06,0.7); }
}

export function initialize(){


/* =====================================================================
   AUDIO (synth; nodes created only on events, never per frame)
   ===================================================================== */
state.actx = null;
state.master = null;
state.noiseBuf = null;
state.soundOn = true;
}

````

---

## `tests/isofight.mjs`

````js
import assert from 'node:assert/strict';

/** The isometric fight in the Ward: real keys, costs and damage from the rules, footwork, the opponent, the count on the boards, the result. */
export async function checkIsoFight(page){
  const r=await page.evaluate(async()=>{
    const b=window.__boxer, I=await import('/src/iso-fight.js'), R=await import('/src/realtime-rules.js'), P=await import('/src/progression.js'), In=await import('/src/input.js'), S=I.state, out={};
    const rng=Math.random;
    const key=(code,down=true)=>dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code,bubbles:true,cancelable:true}));
    const near=gap=>{ S.P.i=S.O.i-0.7071*gap; S.P.j=S.O.j+0.7071*gap; S.P.li=S.P.i; S.P.lj=S.P.j; for(const s of [1,-1]){ S.P.ft[s].i=S.P.i; S.P.ft[s].j=S.P.j; } };
    const fresh=(opp=0)=>{ Math.random=()=>.99; b.goRoom('cell'); b.pause(); b.startSpar(opp,'cell'); b.step(60); S.O.aiAt=Infinity; };
    try{
      b.goRoom('cell'); b.pause(); Math.random=()=>.99; b.startSpar(0,'cell');
      out.start=[b.gstate,S.phase,document.body.classList.contains('spar'),S.opp.name,document.getElementById('fightPlate')?.hidden===false];
      b.step(60); out.fight=[S.phase,document.getElementById('fightPlate')?.hidden!==false]; S.O.aiAt=Infinity;
      // a jab pays its quoted cost and lands with the damage animation's timing
      near(1.1); const hp0=S.O.rt.hp, quote=R.punchCost(S.P.rt,0,S.t), s0=S.P.rt.sta; key('Digit1'); out.jabCost=s0-S.P.rt.sta-quote; b.step(30);
      out.jab=[S.O.rt.hp<hp0,S.P.c.thrown,S.P.c.landed];
      // the repeat is dearer
      b.step(60); near(1.1); const q2=R.punchCost(S.P.rt,0,S.t), s1=S.P.rt.sta; key('Digit1'); out.repeat=[Math.abs(s1-S.P.rt.sta-q2)<.001,q2>quote];
      // the body target latches with Shift and survives its release
      fresh(); near(1.1); key('ShiftLeft'); key('Digit2'); key('ShiftLeft',false); b.step(40); out.body=S.P.c.body;
      // holding the block drains breath; a pause lets it go
      fresh(); const g0=S.P.rt.sta; key('Space'); b.step(60); out.guard=[S.P.rt.guarding,g0-S.P.rt.sta>4];
      In.setPaused(false); In.setPaused(true); out.pauseRelease=[S.P.rt.guarding,S.guardHeld]; key('Space',false);
      // a slip costs its price
      fresh(); const q0=S.P.rt.sta; key('KeyQ'); out.slip=[Math.abs(q0-S.P.rt.sta-R.TUNING.slipCost)<.001,S.P.rt.slipSince===S.t];
      // eight directions: every arrow moves him, and the foot on the side of the move steps first
      out.moves={}; out.first={};
      for(const [k,code] of [['r','ArrowRight'],['l','ArrowLeft'],['u','ArrowUp'],['d','ArrowDown']]){
        fresh();
        const x0=S.P.i, y0=S.P.j; key(code); let first='';
        for(let n=0;n<40;n++){ b.step(1); if(!first) first=S.P.ft[1].sw>0?'lead':S.P.ft[-1].sw>0?'rear':''; }
        key(code,false); out.moves[k]=Math.hypot(S.P.i-x0,S.P.j-y0)>0.3; out.first[k]=first;
      }
      // the opponent fights on his own
      Math.random=rng; b.goRoom('cell'); b.pause(); b.startSpar(0,'cell'); b.step(360); out.aiThrown=S.O.c.thrown;
      // the count: the rival rises on his own, the player with taps
      fresh(); near(1.0); S.O.rt.hp=1; key('Digit1'); b.step(30); out.kd=[S.O.down,S.O.kdN,S.O.rt.hp>1,!!S.O.rd]; b.step(200); out.rose=!S.O.down&&!S.O.rd;
      fresh(); S.P.down=true; S.P.downAt=S.t; S.P.kdN=1; S.P.pk=null; for(let k=0;k<8;k++){ key('Digit1'); b.step(10); } out.mash=[S.P.down,S.P.kdMash>=7];
      // a knockout closes the fight into the ordinary result card and the record
      fresh(); near(1.0); S.O.kdN=2; S.O.rt.hp=1; const before=P.state.save.record.bare.w; key('Digit1'); b.step(30); out.ko=[S.phase,S.how,S.winner===S.P]; b.step(110);
      out.result=[S.phase,document.getElementById('over').hidden,P.state.save.record.bare.w-before];
      key('Escape'); out.back=[b.gstate,b.room];
    } finally { Math.random=rng; In.setPaused(true); }
    return out;
  });
  assert.deepEqual(r.start,['isofight','intro',true,'HARRY',true],'the fight opens on the plate in the isometric scene');
  assert.deepEqual(r.fight,['fight',true],'the plate goes after the intro');
  assert.equal(r.jabCost,0,'a punch pays the cost the rules quote');
  assert.deepEqual(r.jab,[true,1,1],'a jab in range lands once at its apex');
  assert.deepEqual(r.repeat,[true,true],'the second punch pays the dearer repeat cost');
  assert.equal(r.body,1,'Shift targets the body and the target survives its release');
  assert.deepEqual(r.guard,[true,true]); assert.deepEqual(r.pauseRelease,[false,false],'a pause releases the held block');
  assert.deepEqual(r.slip,[true,true]);
  assert.deepEqual(r.moves,{r:true,l:true,u:true,d:true},'every arrow walks');
  assert.equal(r.first.r,'lead','forward: the lead foot first'); assert.equal(r.first.l,'rear','back: the rear foot first');
  assert.equal(r.first.u,'rear','one way sideways: the foot on that side'); assert.equal(r.first.d,'lead','the other way: the other foot');
  assert.ok(r.aiThrown>=2,'the rival fights without commands: '+r.aiThrown);
  assert.deepEqual(r.kd,[true,1,true,true],'the first knockdown sends the rival to the boards (as a ragdoll) with a fraction of his health'); assert.equal(r.rose,true,'he gets up after the count and the ragdoll is released');
  assert.deepEqual(r.mash,[false,true],'taps get the player up');
  assert.deepEqual(r.ko,['ko','TKO',true],'the third knockdown stops the fight');
  assert.deepEqual(r.result,['end',false,1],'the result card is up and the win is in the record');
  assert.deepEqual(r.back,['hub','cell'],'Esc returns to the Ward');
}

/** The brawl in the yard, in the bath and at the meal happens in that room. */
export async function checkIsoFightRooms(page){
  const r=await page.evaluate(async()=>{
    const b=window.__boxer, I=await import('/src/iso-fight.js'), S=I.state, out={};
    const rng=Math.random;
    try{
      for(const [venue,idx,room] of [['yard',0,'yard'],['laznia',1,'laznia'],['canteen',0,'cell']]){
        Math.random=rng; b.goRoom(room); b.pause(); b.startSpar(idx,venue); b.step(200);
        out[venue]=[b.gstate,S.venue,b.room,S.phase,Number.isFinite(S.P.i)&&Number.isFinite(S.O.i)];
        b.exitToHub(); out[venue+'Back']=[b.gstate,b.room];
      }
    } finally { Math.random=rng; }
    return out;
  });
  assert.deepEqual(r.yard,['isofight','yard','yard','fight',true]); assert.deepEqual(r.yardBack,['hub','yard']);
  assert.deepEqual(r.laznia,['isofight','laznia','laznia','fight',true]); assert.deepEqual(r.lazniaBack,['hub','laznia']);
  assert.deepEqual(r.canteen,['isofight','canteen','cell','fight',true]); assert.deepEqual(r.canteenBack,['hub','cell']);
}

````

---

## `tests/realtime-rules.test.js`

````js
import test from 'node:test';
import assert from 'node:assert/strict';
import {TUNING,PUNCH_COST,createCombatant,tickCombatant,punchCost,beginPunch,setGuard,beginSlip,resolvePunch} from '../src/realtime-rules.js';

const hit=(a,b,now,pid=0,low=false)=>resolvePunch(a,b,{pid,now,low});

test('repeat costs are independent by punch and reset exactly at two seconds',()=>{
  const f=createCombatant();
  for(let pid=0;pid<4;pid++)assert.equal(punchCost(f,pid,0),PUNCH_COST[pid]);
  assert.equal(beginPunch(f,0,0),true);
  assert.equal(punchCost(f,0,1.999),5*1.35);
  assert.equal(punchCost(f,1,1.999),9);
  assert.equal(punchCost(f,0,2),5);
  beginPunch(f,0,2);beginPunch(f,0,2.1);
  assert.equal(punchCost(f,0,2.2),5*1.7);
  assert.equal(punchCost(f,0,4.1),5);
});

test('unaffordable punches do not spend stamina or alter repeat history',()=>{
  const f=createCombatant({staCap:4}),before=structuredClone(f);
  assert.equal(beginPunch(f,0,0),false);assert.deepEqual(f,before);
  assert.equal(beginPunch(f,8,0),false);assert.equal(beginPunch(f,0,NaN),false);
  const exact=createCombatant({staCap:16});assert.equal(beginPunch(exact,3,0),true);assert.equal(exact.sta,0);
});

test('holding guard drains continuously, prevents regeneration and fails at zero',()=>{
  const a=createCombatant(),b=createCombatant({staCap:9});
  setGuard(b,true,0);tickCombatant(b,1,1);assert.equal(b.sta,0);
  assert.equal(hit(a,b,1).kind,'hit');assert.equal(b.hp,94);
  tickCombatant(b,2,3);assert.equal(b.sta,0);
  setGuard(b,false,3);tickCombatant(b,.5,3.5);assert.equal(b.sta,7);
  tickCombatant(b,2,5.5);assert.equal(b.sta,9);
});

test('normal guard absorbs damage with stamina and passes through the unpaid share',()=>{
  const a=createCombatant(),b=createCombatant({staCap:8});setGuard(b,true,0);
  assert.deepEqual(hit(a,b,.5),{kind:'block',damage:0,counter:false,failedSlip:false});assert.equal(b.sta,2);
  assert.equal(hit(a,b,.6).damage,4);assert.equal(b.hp,96);assert.equal(b.sta,0);
});

test('ideal guard includes the boundary and drains extra attacker stamina only once',()=>{
  const a=createCombatant(),b=createCombatant();beginPunch(a,1,0);setGuard(b,true,0);
  assert.equal(hit(a,b,.12,1,true).kind,'parry');assert.equal(b.hp,100);assert.equal(a.sta,100-9-TUNING.parryCost);
  assert.equal(hit(a,b,.12).kind,'block');
  setGuard(b,false,.13);setGuard(b,true,.14);assert.equal(hit(a,b,.15).kind,'block');
  setGuard(b,false,.3);setGuard(b,true,.3);assert.equal(hit(a,b,.31).kind,'parry');
});

test('holding guard does not refresh ideal timing',()=>{
  const a=createCombatant(),b=createCombatant();setGuard(b,true,0);setGuard(b,true,.5);
  assert.equal(hit(a,b,.51).kind,'block');
});

test('ideal slip avoids every basic head/body punch and grants one counter',()=>{
  for(let pid=0;pid<4;pid++)for(const low of [false,true]){
    const a=createCombatant(),b=createCombatant();assert.equal(beginSlip(b,0),true);
    assert.equal(hit(a,b,.16,pid,low).kind,'slip');assert.equal(b.hp,100);
    beginPunch(b,0,.2);assert.equal(hit(b,a,.3).damage,9);
    beginPunch(b,0,.31);assert.equal(hit(b,a,.4).counter,false);
  }
});

test('counter expires at one second and is consumed by a defended punch',()=>{
  const a=createCombatant(),b=createCombatant();beginSlip(b,0);hit(a,b,.1);
  beginPunch(b,0,1.1);assert.equal(hit(b,a,1.2).counter,false);
  const c=createCombatant(),d=createCombatant();beginSlip(d,0);hit(c,d,.1);setGuard(c,true,.2);
  beginPunch(d,0,.2);const blocked=hit(d,c,.21);assert.equal(blocked.kind,'parry');assert.equal(blocked.counter,true);
  beginPunch(d,0,.22);assert.equal(hit(d,c,.23).counter,false);
});

test('bad slip timing amplifies damage only during its vulnerability window',()=>{
  for(const [at,failed] of [[.16001,true],[.35,true],[.649,true],[.65,false]]){
    const a=createCombatant(),b=createCombatant();beginSlip(b,0);const r=hit(a,b,at);
    assert.equal(r.failedSlip,failed);assert.equal(r.damage,6*(failed?1.35:1));
  }
});

test('slip requires stamina and respects the exact cooldown boundary',()=>{
  const f=createCombatant();assert.equal(beginSlip(f,0),true);assert.equal(f.sta,90);
  assert.equal(beginSlip(f,.649),false);assert.equal(beginSlip(f,.65),true);
  assert.equal(beginSlip(createCombatant({staCap:9}),0),false);
});

test('damage respects strength and hunger, clamps hp and keeps stamina nonnegative',()=>{
  const a=createCombatant({pow:2,hunger:2}),b=createCombatant({hpMax:8});
  assert.equal(hit(a,b,0).damage,8);assert.equal(b.hp,0);assert.equal(beginPunch(b,0,0),false);
  const c=createCombatant({staCap:1});setGuard(b,true,0);b.hp=1;b.sta=1;hit(c,b,.1);assert.equal(c.sta,0);
});

test('pause is deterministic: no calls or zero elapsed time change the state',()=>{
  const f=createCombatant();beginSlip(f,0);beginPunch(f,0,.1);const before=structuredClone(f);
  tickCombatant(f,0,1000);tickCombatant(f,-1,1);tickCombatant(f,NaN,1);assert.deepEqual(f,before);
  const other=structuredClone(f);tickCombatant(f,.1,.2);tickCombatant(other,.1,.2);assert.deepEqual(f,other);
});


test('counter latches at launch, survives expiry in flight and is spent on a missed punch',()=>{
  const a=createCombatant(),b=createCombatant();beginSlip(b,0);hit(a,b,.1);
  beginPunch(b,0,1);assert.equal(b.counterUntil,-Infinity);
  assert.equal(hit(b,a,1.2).damage,9);assert.equal(b.punchCounter,false);
  beginSlip(b,2);hit(a,b,2.1);beginPunch(b,0,2.2);
  beginPunch(b,0,2.3);assert.equal(hit(b,a,2.4).counter,false);
});

test('an unaffordable punch preserves the waiting counter and any launched punch',()=>{
  const a=createCombatant(),b=createCombatant();beginSlip(b,0);hit(a,b,.1);
  b.sta=0;const until=b.counterUntil;assert.equal(beginPunch(b,0,.2),false);
  assert.equal(b.counterUntil,until);assert.equal(b.punchCounter,false);
  b.sta=5;assert.equal(beginPunch(b,0,.3),true);
  assert.equal(beginPunch(b,0,.4),false);assert.equal(b.punchCounter,true);
  assert.equal(hit(b,a,.5).counter,true);
});

````
