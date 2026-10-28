# Roadwork — kontekst minigier (pompki, podciąganie, karaluchy, korba)

Stan kodu aktualny. Minigry: `pushups.js` (pompki, boczny widok na szkielecie z `boxing.js`, joints liczy `solvePushup`; tło celi z `rooms.js`), `pullups.js` + `pullup-scene.js` (podciąganie zza pleców, ciało jako mapa wysokości, tło rysowane kodem), `roaches.js` + `roach-scene.js` + `roach-rules.js` + `ward-wall.js` (karaluchy na ścianie z oczu bohatera, ściana jako mapa wysokości oświetlana kagankiem), `crank.js` + `crank-rules.js` + `crank-scene.js` (korba w szopie 288×192, tło budowane kodem). Tła tych scen są w dużej mierze proceduralne (kod w plikach `*-scene.js`, `ward.js`, `rooms.js`, światło w `cell-light.js`, `weather.js`, szum w `noise.js`), więc można je przerysować kodem. Wspólne: renderer pikselowy (`renderer.js`), paleta i wymiary (`appearance.js`), szkielet i `drawBoxer` (`boxing.js`), postacie dodatkowe (`cast.js`). `scripts/render-room.mjs` renderuje pokój do PNG (przydatne do podglądu zmian tła).

Pomijam wielkie wypalone obrazy (`*-plate.js`): to dane, nie kod.

Pliki: ARCHITECTURE.md, AGENTS.md, src/pushups.js, src/pullups.js, src/pullup-scene.js, src/roaches.js, src/roach-scene.js, src/roach-rules.js, src/crank.js, src/crank-rules.js, src/crank-scene.js, src/cast.js, src/boxing.js, src/animation.js, src/appearance.js, src/renderer.js, src/noise.js, src/ward-wall.js, src/ward.js, src/rooms.js, src/cell-light.js, src/weather.js, src/fighter-context.js, scripts/render-room.mjs, tests/crank.mjs, tests/roach-rules.test.js, tests/crank.test.js

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

## `src/pushups.js`

````js
import { state as appearanceState, rgb, setRamp, applyGear } from './appearance.js';
import { state as rendererState, pset } from './renderer.js';
import { state as sparringState, sparExit } from './sparring.js';
import { state as npcsState } from './npcs.js';
import { state as progressionState, applyStats, resetSessXP, statShort } from './progression.js';
import { initAudio, sfxBreath, sfxWhoosh, sfxLand, sfxClap, sfxSlap, sfxChime, sfxMiss } from './audio.js';
import { state as boxingState, setFlow, spawnSweat, spawn, ik, drawText } from './boxing.js';
import { state as animationState } from './animation.js';
import { state as inputState, setInfo } from './input.js';
import { setPanelMode } from './navigation.js';
import { newspaperColor, NEWSPAPER_COLORS } from './rooms.js';
import { wardWallBg } from './ward-wall.js';
import { beginSession, sessionMetric, sessionAddTime, sessionOpen, sessionRunning, sessionParams } from './training-session.js';

const C_PERFECT=rgb('#a8f28c'), C_LOCK=rgb('#4a1812'), C_PAPER=rgb('#8a8070'), C_BURN=['#e8c050','#e07a30','#d83a2a'].map(rgb);

// Runtime values owned by pushups; initialized explicitly by main.js.
export const state = {}; function buildPuCell(){                    // side view of the cell wall + newspapers under the hands / feet
  const save0=rendererState.fb; rendererState.fb=state.bgPU; wardWallBg();   /* the Ward's wall behind, old broadsheets on the flags */
  // The same three editions as the room asset, foreshortened on the floor below feet and hands.
  const sheets=[[35,82,1.08,1.45,-0.3],[59,85,2.16,1.45,0.16],[35,88,1.08,1.45,-0.48]];
  for(const [k,[cx,cy,w,h,rot]] of sheets.entries()){
    const ca=Math.cos(rot),sa=Math.sin(rot),rx=(Math.abs(ca)*w+Math.abs(sa)*h)*9,ry=(Math.abs(sa)*w+Math.abs(ca)*h)*2;
    for(let pass=0;pass<2;pass++) for(let y=Math.floor(cy-ry);y<=Math.ceil(cy+ry+1);y++) for(let x=Math.floor(cx-rx);x<=Math.ceil(cx+rx+1);x++){
      const dx=(x-cx-(pass?0:1))/18,dy=(y-cy-(pass?0:1))/4;
      const c=newspaperColor((dx*ca+dy*sa)/w+0.5,(-dx*sa+dy*ca)/h+0.5,k);
      if(c) pset(x,y,pass?c:NEWSPAPER_COLORS.shadow);
    }
  }
  rendererState.fb=save0;
}
export function setPrisonOutfit(on){
  if(on){ setRamp(appearanceState.R_SHIRT,npcsState.CN_TOP,false); setRamp(appearanceState.R_SHIRTF,npcsState.CN_TOP,true); setRamp(appearanceState.R_PANT,npcsState.CN_PANT,false); setRamp(appearanceState.R_PANTF,npcsState.CN_PANT,true);
    setRamp(appearanceState.R_BOOT,sparringState.PRIS_SHOE,false); setRamp(appearanceState.R_BOOTF,sparringState.PRIS_SHOE,true); setRamp(appearanceState.R_BTR,sparringState.PRIS_SOLE,false); setRamp(appearanceState.R_BTRF,sparringState.PRIS_SOLE,true); appearanceState.btStyle='low'; }
  else { if(sparringState.WORK_RAMPS) appearanceState.PAL.set(sparringState.WORK_RAMPS,appearanceState.R_SHIRT*3); applyGear(progressionState.save.eq); }
}

/** Outside a session (debug start) the stage I parameters apply. */
const FREE={goal:16,zone:10,min:5,burn:0.06};
/** A miss locks the bar three seconds; lying on the paper this long is a miss; the burn drains per tick resting at the top. */
const LOCK_TICKS=180, LIE_TICKS=10, RECOVER=0.003;
/** The depth meter: arms locked at MY0, chest on the newspaper at MY1. */
const MX=12, MY0=46, MY1=82, MH=MY1-MY0;

/** @returns {{goal:number,zone:number,min:number,burn:number}} */
function params(){ return sessionOpen()?sessionParams('pushup'):FREE; }
/** Shake of the burning arms on the way down, in meter rows: the meter shows what is judged. */
function tremor(){ const b=state.puBurn, t=boxingState.tick; return b*b*1.6*Math.sin(t*0.9)*Math.sin(t*0.37+1); }
/** Meter row of the chest. */
function meterY(){ return Math.round(MY1-MH*state.puH+(state.puPhase==='lower'?tremor():0)); }
/** Rows of the depth target just above the paper: the OK zone and, at its bottom, the perfect core (nose over the paper). */
export function pushupZone(){ const end=MY1, n=Math.max(2,Math.round(state.puZone/3)); return {top:end-state.puZone,end,coreTop:end-n,coreEnd:end}; }
/** @param {string} text @param {number} color */
function flash(text,color){ state.puFlash=text; state.puFlashC=color; state.puFlashT=50; }

/** One minute on the newspapers: lower under control, release just over the paper, manage the burn. */
export function startPushup(){
  initAudio(); if(boxingState.gstate==='spar')sparExit(); applyGear(progressionState.save.eq);
  boxingState.mode=boxingState.M_FREE; boxingState.gstate='pushup'; applyStats(); resetSessXP(); setFlow(false); boxingState.buffered=-1; animationState.walkHeld=-1; animationState.posX=0; boxingState.state=animationState.IDLE;
  const venue=state.puVenue, p=beginSession('pushup',{end:()=>{ state.puHeld=false; },again:()=>{ state.puVenue=venue; startPushup(); }});
  Object.assign(state,{puPhase:'top',puH:1,puHeld:false,puArmed:true,puTm:0,puTop:60,puBottom:0,puLock:0,puBurn:0,puZone:p.zone,puLift:0,puClap:0,puCollapse:0,puClapDone:false,
    puReps:0,puPerfects:0,puStreak:0,puBest:0,puExplosive:0,puFlashT:0,
    puFeedback:'Minuta na gazetach. Przytrzymaj Spację, by zejść; puść tuż nad gazetą — zielone to ideał. Postój w podporze zbija zakwas.'});
  document.body.classList.add('pushup');
  if(state.puVenue==='cell'){ buildPuCell(); setPrisonOutfit(true); }
  inputState.overEl.hidden=true; setPanelMode(); setInfo();
}

export function puReset(){ state.puHeld=false; document.body.classList.remove('pushup'); boxingState.state=animationState.IDLE; animationState.lastPose.set(animationState.cur); boxingState.idleT=0; if(state.puVenue==='cell') setPrisonOutfit(false); }

/** Keyboard and touch share a held input; simulation alone changes the exercise. @param {boolean} down */
export function holdPushup(down){ if(boxingState.gstate==='pushup'&&(!inputState.paused||!down)&&!(down&&sessionOpen()&&!sessionRunning())) state.puHeld=down; }

/** A good release: the burn grows (more when rushed or sloppy, and with every rep done), the target narrows; the fifth perfect in a row comes up
 * explosive (counts twice, eases the burn), the tenth with a clap (counts twice, +2 s). Arms past their limit give out.
 * @param {boolean} perfect */
function puScore(perfect){
  const P=params(), cost=P.burn*(perfect?1:1.3)*(1+state.puReps*0.015)+0.04*Math.max(0,1-state.puTop/30);
  if(state.puBurn+cost>=1){ puMiss('Ręce puszczają — zakwas.',0.8); return; }
  state.puBurn+=cost; state.puStreak=perfect?state.puStreak+1:0; state.puBest=Math.max(state.puBest,state.puStreak);
  const clap=perfect&&state.puStreak%10===0, plyo=perfect&&!clap&&state.puStreak%5===0, n=clap||plyo?2:1;
  state.puReps+=n; sessionMetric('reps',n); sessionMetric('points',(perfect?1:0.7)*n);
  if(perfect){ state.puPerfects++; sessionMetric('perfect'); }
  if(plyo) state.puBurn=Math.max(0,state.puBurn-0.1);
  if(clap) sessionAddTime(2);
  state.puZone=Math.max(P.min,state.puZone-1); state.puExplosive=clap?2:plyo?1:0; state.puPhase='press';
  flash(clap?'KLASK +2 S':plyo?'WYRZUT X2':perfect?'IDEALNIE':'DOBRZE',perfect?C_PERFECT:appearanceState.C_SPARK);
  state.puFeedback=clap?'Dziesięć idealnych — pompka z klaśnięciem, +2 s!':plyo?'Pięć idealnych — wyrzut, liczy się podwójnie.':perfect?'Idealnie! Passa idealnych: '+state.puStreak+'.':'Zaliczone. Zejdź niżej, nosem nad gazetę.';
  sfxChime(perfect?1000+Math.min(10,state.puStreak)*40:760);
  if(state.puReps%8<n) spawnSweat(3);
  setInfo();
}
/** Released above the zone: a half rep, not counted, the streak broken. */
function puShallow(){
  state.puStreak=0; state.puBurn=Math.min(0.99,state.puBurn+params().burn*0.5); state.puExplosive=0; state.puPhase='press';
  flash('ZA PLYTKO',appearanceState.C_WHITE); state.puFeedback='Półpompka — nie liczy się. Zejdź niżej.'; sfxMiss(); setInfo();
}
/** A miss: he goes down on the paper, the bar is locked three seconds, the target widens.
 * @param {string} why @param {number} [burn] burn left after it */
function puMiss(why,burn){
  state.puPhase='fail'; state.puTm=0; state.puLock=LOCK_TICKS; state.puStreak=0; state.puExplosive=0;
  if(burn!==undefined) state.puBurn=burn;
  state.puZone=Math.min(params().zone,state.puZone+2); sessionMetric('misses');
  flash('SKUCHA',appearanceState.C_RED); state.puFeedback=why+' Blokada 3 s.'; sfxLand(1);
  if(!boxingState.shakeT){ boxingState.shakeAmp=1; boxingState.shakeAxis=1; boxingState.shakeT=boxingState.shakeDur=5; }
  setInfo();
}

export function pushupTick(){
  if(state.puFlashT>0) state.puFlashT--;
  if(state.puLock>0){ state.puLock--; if(state.puLock%60===0) setInfo(); }
  switch(state.puPhase){
    case 'top':
      if(!state.puHeld){ state.puArmed=true; state.puTop++; state.puBurn=Math.max(0,state.puBurn-RECOVER); if(state.puTop%30===0) setInfo(); break; }
      if(state.puArmed){ state.puPhase='lower'; state.puBottom=0; sfxBreath(); setInfo(); }
      break;
    case 'lower': {
      if(state.puHeld){ state.puH=Math.max(0,state.puH-0.02*(1+0.35*state.puBurn)); if(state.puH===0&&++state.puBottom>LIE_TICKS) puMiss('Za długo — leżysz na gazecie.'); break; }
      const y=meterY(), z=pushupZone();
      if(y>=z.top&&y<z.end) puScore(y>=z.coreTop); else if(y<z.top) puShallow(); else puMiss('Za nisko — klatka na gazecie.');
      break;
    }
    case 'press':
      state.puH=Math.min(1,state.puH+(state.puExplosive?0.07:0.032*(1-0.55*state.puBurn)));
      if(state.puH<1) break;
      if(state.puExplosive){ state.puPhase='launch'; state.puLaunchT=0; state.puLaunchPeak=state.puExplosive===2?5.5:3.8; state.puClapDone=false; sfxWhoosh(1); }
      else { state.puPhase='top'; state.puTop=0; state.puArmed=!state.puHeld; setInfo(); }
      break;
    case 'launch': {
      state.puLaunchT++; const T=22, x=state.puLaunchT/T;
      state.puLift=state.puLaunchPeak*4*x*(1-x); state.puH=1;
      state.puClap=state.puExplosive===2?Math.max(0,1-Math.abs(x-0.5)*4):0;
      if(state.puExplosive===2&&!state.puClapDone&&x>=0.5){ state.puClapDone=true; sfxClap(); spawn(boxingState.P_STAR,boxingState.rgx+1,boxingState.rgy-1,0,0,6,0); }
      if(state.puLaunchT>=T){ state.puLift=0; state.puClap=0; state.puExplosive=0; state.puPhase='top'; state.puTop=0; state.puArmed=!state.puHeld; sfxSlap(1.1); sfxLand(0.8);
        for(let j=0;j<4;j++) spawn(boxingState.P_DUST,state.PU_HANDX-2+j*1.5,appearanceState.FLOOR_Y-1,(Math.random()-0.5)*1,-0.2-Math.random()*0.3,14,appearanceState.C_DUST);
        if(!boxingState.shakeT){boxingState.shakeAmp=1;boxingState.shakeAxis=1;boxingState.shakeT=boxingState.shakeDur=6;} setInfo(); }
      break;
    }
    case 'fail':
      state.puTm++; state.puBurn=Math.max(0,state.puBurn-0.0015);
      state.puCollapse=state.puLock>30?Math.min(1,state.puTm/10):state.puLock/30;
      if(state.puLock===0){ state.puCollapse=0; state.puH=0; state.puPhase='press'; state.puFeedback='Z powrotem do podporu.'; setInfo(); }
      break;
  }
}

export function solvePushup(){
  const h=state.puH;
  let yS=state.PU_BOT+(state.PU_TOP-state.PU_BOT)*h-state.puLift;
  if(state.puPhase!=='fail') yS+=Math.sin(boxingState.tick*1.7)*state.puBurn*state.puBurn*0.7;   /* burning arms shake */
  if(state.puCollapse>0) yS+=(83-yS)*state.puCollapse;
  const Ax=state.PU_ANKX, Ay=appearanceState.FLOOR_Y-3, dy=Ay-yS, dx=Math.sqrt(Math.max(1,state.PU_LB*state.PU_LB-dy*dy));
  const Sx=Ax+dx, Sy=yS, ux=dx/state.PU_LB, uy=-dy/state.PU_LB;          // body axis (feet -> shoulders)
  const hipXf=Ax+ux*20, hipYf=Ay+uy*20, knXf=Ax+ux*10, knYf=Ay+uy*10+0.4;
  state.puHipX=hipXf; state.puHipY=hipYf;
  // hands: planted under the shoulders; leave the floor at the top of an explosive rep; meet for the clap
  const hl=Math.max(0,state.puLift-1.2)*0.9;
  let hnx=state.PU_HANDX, hny=appearanceState.FLOOR_Y-2-hl, hfx=state.PU_HANDX+1, hfy=appearanceState.FLOOR_Y-2-hl;
  if(state.puClap>0){ const cx=Sx+1, cy=Sy+7; hnx+=(cx-hnx)*state.puClap; hny+=(cy-hny)*state.puClap; hfx+=(cx-hfx)*state.puClap; hfy+=(cy-hfy)*state.puClap; }
  if(state.puCollapse>0){ hnx-=2*state.puCollapse; hfx-=2*state.puCollapse; }
  // torso / head joints (globals read by drawBoxer)
  boxingState.torsoX=Math.round(hipXf); boxingState.hipX=Math.round(hipXf); boxingState.hipY=Math.round(hipYf)-1;
  boxingState.sx=Math.round(Sx); boxingState.sy=Math.round(Sy)-2;
  boxingState.rsx=Math.round(Sx); boxingState.rsy=Math.round(Sy); boxingState.lsx=Math.round(Sx+1); boxingState.lsy=Math.round(Sy-1);
  boxingState.headX=Math.round(Sx+ux*6+uy*0.8); boxingState.headY=Math.round(Sy+uy*6-ux*0.8)-1;
  // arms: elbows point back towards the feet
  ik(boxingState.rsx,boxingState.rsy,hnx,hny,appearanceState.UPPER,appearanceState.FORE,1); boxingState.rex=Math.round(boxingState.IKx); boxingState.rey=Math.round(boxingState.IKy); boxingState.rgx=Math.round(boxingState.IKtx); boxingState.rgy=Math.round(boxingState.IKty);
  ik(boxingState.lsx,boxingState.lsy,hfx,hfy,appearanceState.UPPER,appearanceState.FORE,1); boxingState.lex=Math.round(boxingState.IKx); boxingState.ley=Math.round(boxingState.IKy); boxingState.lgx=Math.round(boxingState.IKtx); boxingState.lgy=Math.round(boxingState.IKty);
  // legs: straight line from the hips to the ankles, up on the toes
  const px=0.37, py=0.93;                                    // foot direction (roughly perpendicular to the shin)
  boxingState.rhx=boxingState.hipX; boxingState.rhy=Math.round(hipYf); boxingState.rkx=Math.round(knXf); boxingState.rky=Math.round(knYf); boxingState.rax=Ax; boxingState.ray=Ay;
  boxingState.rtx=Math.round(Ax+px*3); boxingState.rty=appearanceState.FLOOR_Y-1; boxingState.rhex=Math.round(Ax-px*1.5); boxingState.rhey=Math.round(Ay-py*1.5);
  boxingState.lhx=boxingState.hipX+1; boxingState.lhy=Math.round(hipYf)-1; boxingState.lkx=Math.round(knXf)+1; boxingState.lky=Math.round(knYf)-1; boxingState.lax=Ax+1; boxingState.lay=Ay-1;
  boxingState.ltx=Math.round(Ax+1+px*3); boxingState.lty=appearanceState.FLOOR_Y-1; boxingState.lhex=Math.round(Ax+1-px*1.5); boxingState.lhey=Math.round(Ay-1-py*1.5);
  boxingState.shDirX=-ux; boxingState.shDirY=-uy;
}

/** The depth meter (the OK zone, its perfect core, the paper at the bottom), the burn beside it, the count and the call. */
export function drawPushupMeter(){
  const z=pushupZone(), locked=state.puLock>0, A=appearanceState;
  for(let y=MY0-1;y<=MY1+1;y++) for(let x=MX-1;x<=MX+3;x++) pset(x,y,(x===MX-1||x===MX+3||y===MY0-1||y===MY1+1)?A.C_OUT:A.C_LANE);
  for(let y=MY0;y<=MY1;y++) for(let x=MX;x<=MX+2;x++) pset(x,y,y>=z.coreTop&&y<z.coreEnd?C_PERFECT:y>=z.top&&y<z.end?A.C_SPARK:y===MY1?C_PAPER:locked?C_LOCK:A.C_LANE);
  const ym=meterY(); for(let x=MX-2;x<=MX+4;x++) pset(x,ym,A.C_WHITE);
  const bx=MX+6, top=Math.round(MY1-(MH+1)*state.puBurn), hot=state.puBurn>0.8, col=state.puBurn<0.5?C_BURN[0]:state.puBurn<0.8?C_BURN[1]:C_BURN[2];
  for(let y=MY0-1;y<=MY1+1;y++) for(let x=bx-1;x<=bx+2;x++) pset(x,y,(x===bx-1||x===bx+2||y===MY0-1||y===MY1+1)?A.C_OUT:(y>=top&&!(hot&&(boxingState.tick&8))?col:A.C_LANE));
  drawText(String(state.puReps),MX+4,MY0-8,A.C_SPARK,1);
  if(locked) drawText(String(Math.ceil(state.puLock/60)),MX+1,MY1+4,A.C_RED,1);
  if(state.puFlashT>0&&(state.puFlashT>12||state.puFlashT&2)) drawText(state.puFlash,72,3,state.puFlashC,1);
}

/** Keep the DOM instructions and the touch control in sync with the exercise. */
export function pushupInfo(){
  inputState.infoEl.textContent='POMPKI NA GAZETACH · '+state.puReps+' powt. ('+state.puPerfects+' idealnych) · passa '+state.puStreak+(state.puStreak%10>=5?' → klask przy 10':' → wyrzut przy 5')+' · zakwas '+Math.round(state.puBurn*100)+'%';
  inputState.livesEl.textContent=''; inputState.nextEl.textContent=state.puFeedback+(state.puLock>0?' Jeszcze '+Math.ceil(state.puLock/60)+' s.':'')+' · '+statShort()+' · Esc — wróć do celi';
  const button=document.getElementById('pushupAction');
  if(button) button.textContent=state.puLock>0?'Skucha · blokada '+Math.ceil(state.puLock/60)+' s':state.puPhase==='top'||state.puPhase==='lower'?'Przytrzymaj · w dół / puść nad gazetą':'Wyciskanie…';
}

export function initialize(){

/* =====================================================================
   PUSH-UPS — one minute on the newspapers. Hold to lower under control, let go just over
   the paper (green core = perfect, yellow = good, higher = a half rep, on the paper = a miss).
   Height h: 0 = chest on the floor, 1 = arms locked out. Every rep adds burn, more when rushed;
   resting at the top drains it; burn speeds and shakes the descent and slows the press, and
   full burn drops him. Five perfects in a row come up explosive, ten with a clap.
   The pose is solved directly in plank orientation and drawn by the same renderer.
   ===================================================================== */
state.PU_HANDX = 63;
state.PU_ANKX = 33;
state.PU_TOP = 69.5;
state.PU_BOT = 80;
state.PU_LB = 32;

state.puPhase = 'top';
state.puH = 1;
state.puHeld = false;
state.puArmed = true;
state.puTm = 0;
state.puTop = 0;
state.puBottom = 0;
state.puLock = 0;
state.puBurn = 0;
state.puZone = 10;
state.puLift = 0;
state.puClap = 0;
state.puCollapse = 0;
state.puLaunchPeak = 0;
state.puLaunchT = 0;
state.puClapDone = false;
state.puExplosive = 0;
state.puReps = 0;
state.puPerfects = 0;
state.puStreak = 0;
state.puBest = 0;
state.puFlash = '';
state.puFlashC = 0;
state.puFlashT = 0;
state.puFeedback = '';
state.puHipX = 0;
state.puHipY = 0;

state.puVenue = '';
                            // 'cell' = push-ups on the newspapers in the cell (cell wall behind, drelich)
state.bgPU = new Uint32Array(appearanceState.W*appearanceState.H);
const button=document.getElementById('pushupAction');
button.addEventListener('pointerdown',e=>{ e.preventDefault(); button.setPointerCapture(e.pointerId); holdPushup(true); });
button.addEventListener('pointerup',()=>holdPushup(false)); button.addEventListener('pointercancel',()=>holdPushup(false));
button.addEventListener('lostpointercapture',()=>holdPushup(false));
addEventListener('blur',()=>holdPushup(false));
}

````

---

## `src/pullups.js`

````js
import { state as boxing, drawText } from './boxing.js';
import { state as appearance, rgb } from './appearance.js';
import { state as renderer, pset, setFramebuffer } from './renderer.js';
import { state as input, setInfo } from './input.js';
import { leaveMode, setPanelMode } from './navigation.js';
import { applyStats, resetSessXP, statShort } from './progression.js';
import { setPrisonOutfit } from './pushups.js';
import { buildPullupBackground, pullupSceneTick, renderPullupScene } from './pullup-scene.js';
import { initAudio, sfxBreath, sfxChime, sfxMiss } from './audio.js';
import { beginSession, sessionMetric, sessionAddTime, sessionOpen, sessionRunning, sessionParams } from './training-session.js';

/** Perfect core of the target; a miss locks the bar for three seconds. */
const C_PERFECT=rgb('#a8f28c'), C_LOCK=rgb('#4a1812'), LOCK_TICKS=180, REST_TICKS=20;
/** Outside a session (debug start) the stage I parameters apply. */
const FREE={goal:20,zone:13,min:7};
export const state={phase:'hang',held:false,armed:true,height:0,velocity:0,reps:0,perfects:0,combo:0,best:0,streak:0,target:40,zoneSize:13,hit:false,topTicks:0,rest:0,lock:0,feedback:'',flash:'',flashC:0,flashT:0,background:null};

/** Use the same pixel position for drawing and judging the release. @param {number} height */
function meterY(height){ return Math.round(74-49*height); }

/** Rows of the target: the whole OK zone and the perfect core in its middle; drawing and judging share them. */
export function pullupZone(){
  const top=Math.round(state.target)-Math.floor((state.zoneSize-1)/2), n=Math.max(2,Math.round(state.zoneSize/3)), core=top+Math.floor((state.zoneSize-n)/2);
  return {top,end:top+state.zoneSize,coreTop:core,coreEnd:core+n};
}
/** Stage parameters: goal reps for the minute, starting zone, the smallest zone. */
function params(){ return sessionOpen()?sessionParams('pullup'):FREE; }
/** Move the target somewhere new, at least 6 rows from where it was. */
function moveTarget(){ let t; do t=32+Math.random()*20; while(Math.abs(t-state.target)<6); state.target=t; }
/** @param {string} text @param {number} color */
function flash(text,color){ state.flash=text; state.flashC=color; state.flashT=50; }

/** Begin the exercise: one minute at the window, as many pull-ups as he can. */
export function startPullups(){
  leaveMode(); initAudio(); boxing.gstate='pullup'; applyStats(); resetSessXP();
  const p=beginSession('pullup',{end:()=>{ state.held=false; },again:()=>startPullups()});
  Object.assign(state,{phase:'hang',held:false,armed:true,height:0,velocity:0,reps:0,perfects:0,combo:0,best:0,streak:0,target:40,zoneSize:p.zone,hit:false,topTicks:0,rest:0,lock:0,flashT:0,
    feedback:'Minuta na kracie. Przytrzymaj Spację i puść ją w strefie — zielony środek to ideał. Skucha blokuje na 3 s.'});
  moveTarget(); setPrisonOutfit(true); state.background=buildPullupBackground();
  document.body.classList.add('pullup'); setPanelMode(); solvePullup(); setInfo();
}

/** Release input on exit and restore the player's equipment palette. */
export function resetPullups(){ state.held=false; state.phase='hang'; setPrisonOutfit(false); document.body.classList.remove('pullup'); }

/** Keyboard and touch share a held input; simulation alone changes exercise progress. @param {boolean} down */
export function holdPullup(down){ if(boxing.gstate==='pullup'&&(!input.paused||!down)&&!(down&&sessionOpen()&&!sessionRunning())) state.held=down; }

/** A good release: count it, shrink the target towards the stage's minimum and move it; every fifth perfect in a row
 * buys two seconds. @param {boolean} perfect */
function scoreRep(perfect){
  state.hit=true; state.reps++; state.combo++; state.best=Math.max(state.best,state.combo); state.streak=perfect?state.streak+1:0;
  sessionMetric('reps'); sessionMetric('points',perfect?1:0.7);
  if(perfect){ state.perfects++; sessionMetric('perfect'); }
  const bonus=perfect&&state.streak%5===0; if(bonus) sessionAddTime(2);
  state.zoneSize=Math.max(params().min,state.zoneSize-1); moveTarget();
  flash(perfect?(bonus?'IDEALNIE +2 S':'IDEALNIE'):'DOBRZE',perfect?C_PERFECT:appearance.C_SPARK);
  state.feedback=perfect?(bonus?'Pięć idealnych z rzędu — +2 s!':'Idealnie! Passa idealnych: '+state.streak+'.'):'Zaliczone. Celuj w zielony środek.';
  sfxChime(perfect?1000+Math.min(10,state.streak)*40:760);
}
/** A miss: the bar is locked for three seconds, the target widens a little and moves. @param {string} why */
function missRep(why){
  state.phase='down'; state.velocity=0; state.hit=false; state.combo=0; state.streak=0; state.lock=LOCK_TICKS;
  state.zoneSize=Math.min(params().zone,state.zoneSize+2); moveTarget(); sessionMetric('misses');
  flash('SKUCHA',appearance.C_RED); state.feedback=why+' Blokada 3 s.'; sfxMiss(); setInfo();
}

/** Judge the release against the visible target, then lower automatically; a miss locks the bar. */
export function pullupTick(){
  if(state.flashT>0) state.flashT--;
  if(state.lock>0){ state.lock--; if(state.lock%60===0) setInfo(); if(state.lock===0&&state.phase==='lock'){ state.phase='hang'; state.armed=!state.held; state.feedback='Znowu na kracie — przytrzymaj Spację.'; setInfo(); } }
  if(state.phase==='lock') return;
  if(state.phase==='rest'){
    if(--state.rest<=0){ state.phase='hang'; state.armed=!state.held; setInfo(); }
    return;
  }
  if(state.phase==='hang'){
    if(!state.held) state.armed=true;
    if(!state.held||!state.armed) return;
    state.phase='up'; state.hit=false; state.topTicks=0; state.feedback='Puść Spację w strefie — zielony środek to ideał.'; sfxBreath(); setInfo();
  }
  if(state.phase==='up'){
    if(state.held){
      state.height=Math.min(1,state.height+0.012*(1-Math.min(0.3,state.reps*0.012)));
      if(state.height===1&&++state.topTicks>45) missRep('Za długo na górze.');
    } else {
      const y=meterY(state.height), z=pullupZone();
      if(y>=z.top&&y<z.end){ state.phase='down'; state.velocity=0; scoreRep(y>=z.coreTop&&y<z.coreEnd); setInfo(); }
      else missRep(y<z.top?'Za wysoko — minąłeś strefę.':'Za nisko — puściłeś przed strefą.');
    }
    return;
  }
  if(state.phase==='down'){
    state.velocity+=(0.045-state.velocity)*0.25;
    state.height=Math.max(0,state.height-state.velocity);
    if(state.height>0) return;
    state.armed=false;
    if(state.lock>0) state.phase='lock'; else { state.phase='rest'; state.rest=REST_TICKS; }
    setInfo();
  }
}

/** Step the scene seen from behind: progress towards the current target is the pose; holding past it strains. */
export function solvePullup(){
  const top=(74-state.target)/49;
  pullupSceneTick({p:Math.min(1,state.height/top),phase:state.phase,held:state.held,reps:state.reps,strain:state.phase==='up'&&state.height>=top?Math.min(1,state.topTicks/45+0.3):0});
}

/** Render the window scene, then the meter (the OK zone, its perfect core, the lock), the count and the call. */
export function renderPullup(){
  setFramebuffer(renderer.FB_MAIN); renderPullupScene();
  const x=133,y0=25,y1=74,y=meterY(state.height),z=pullupZone(),locked=state.lock>0;
  for(let py=y0;py<=y1;py++) for(let px=x;px<=x+3;px++){
    const c=py>=z.coreTop&&py<z.coreEnd?C_PERFECT:py>=z.top&&py<z.end?appearance.C_SPARK:locked?C_LOCK:appearance.C_FLOOR_EDGE;
    pset(px,py,c); }
  for(let px=x-1;px<=x+4;px++) pset(px,y,appearance.C_WHITE);
  drawText(String(state.reps),134,12,appearance.C_SPARK,1);
  if(locked) drawText(String(Math.ceil(state.lock/60)),135,78,state.flashC,1);
  if(state.flashT>0&&(state.flashT>12||state.flashT&2)) drawText(state.flash,72,3,state.flashC,1);
}

/** Keep the DOM instructions and touch control in sync with the current phase. */
export function pullupInfo(){
  input.infoEl.textContent='PODCIĄGANIE NA KRACIE OKNA · '+state.reps+' powt. ('+state.perfects+' idealnych) · passa '+state.combo+' · najlepsza '+state.best;
  input.livesEl.textContent=''; input.nextEl.textContent=state.feedback+(state.lock>0?' Jeszcze '+Math.ceil(state.lock/60)+' s.':'')+' · '+statShort()+' · Esc — wróć do celi';
  const button=document.getElementById('pullupAction');
  if(button) button.textContent=state.lock>0?'Skucha · blokada '+Math.ceil(state.lock/60)+' s':state.phase==='down'||state.phase==='rest'?'Opuszczanie · kolejne podciągnięcie za chwilę':'Przytrzymaj · podciągnij / puść w strefie';
}

export function initialize(){
  const button=document.getElementById('pullupAction');
  button.addEventListener('pointerdown',e=>{ e.preventDefault(); button.setPointerCapture(e.pointerId); holdPullup(true); });
  button.addEventListener('pointerup',()=>holdPullup(false)); button.addEventListener('pointercancel',()=>holdPullup(false));
  button.addEventListener('lostpointercapture',()=>holdPullup(false));
  addEventListener('blur',()=>holdPullup(false));
}

````

---

## `src/pullup-scene.js`

````js
/* Pull-ups at the Ward's window, seen from behind the hero (native 144×96). The deep stone reveal of the window slot, its
   grille — the same square bars and cross bar as in the iso Ward — and London in the smog beyond: roofs, chimney smoke,
   the dome of St Paul's over the gaol wall. The hero hangs from the cross bar. His body is a height field (torso rows,
   capsule limbs, muscles as bumps) shaded by the tallow lamp on the left and rimmed by the window in front of him. The
   more of the opening his head and shoulders cover, the darker the room and the thinner the shafts of light. Cockroaches
   run the walls: they come out while the light is blocked and scatter when it returns. */

import { state as appearanceState, rgb } from './appearance.js';
import { state as rendererState } from './renderer.js';
import { h2 } from './boxing.js';
import { state as roomsState, skyBucket } from './rooms.js';
import { skyColors, weatherNow } from './weather.js';
import { vnoise, fbm } from './noise.js';

const CX = 72;
/** The cross bar's middle row; the hands close on it at CX ± GRIP.x. */
export const BAR_Y = 40;
export const GRIP = {x:32.5,y:BAR_Y};
/** Shoulder joint to elbow, elbow to the middle of the fist. */
export const ARM = {upper:22,fore:21};
/** The grille's opening, the reveal's mouth on the room side, the vanishing point of the reveal. */
export const OPEN = {x0:26,x1:118,y0:9,y1:71};
const INNER = {x0:12,x1:132,y0:-2,y1:79}, VP = {x:72,y:44};
/** Left edges of the five square bars (5 px), spaced like the iso grille: the first and last stand against the jambs. */
const BARS = [0,1,2,3,4].map(k=>OPEN.x0+21.6*k);
const SY_TOP = BAR_Y+5;
const DOME = {x:57,y:34};
/** Surfaces of the background, per pixel. */
const K_WALL=0, K_JAMB_L=1, K_JAMB_R=2, K_SOFFIT=3, K_SILL=4, K_BAR=5, K_SKY=6;
const M_SKIN=1, M_HAIR=2, M_PANT=3, M_EAR=4, M_HAND=5;
const LF = norm3(-0.5,-0.72,0.48), HV = norm3(-0.5,-0.72,1.48);

/** Scene state: the baked background with its per-pixel maps, the hero's smoothed movement and the small life around. */
export const state = {bg:null,pose:{},t:0,ps:0,pv:0,effort:0,cover:0,light:1};

/* ---------- colour helpers (ABGR) ---------- */

/** @param {number} v */
const cl = (v)=>v<0?0:v>255?255:Math.round(v);
/** @param {number} r @param {number} g @param {number} b */
const pack = (r,g,b)=>(0xff000000|(cl(b)<<16)|(cl(g)<<8)|cl(r))>>>0;
/** Blend colour a towards b by k. @param {number} a @param {number} b @param {number} k */
function mixc(a,b,k){ return pack((a&255)+((b&255)-(a&255))*k,((a>>8)&255)+(((b>>8)&255)-((a>>8)&255))*k,((a>>16)&255)+(((b>>16)&255)-((a>>16)&255))*k); }
/** Scale a colour's brightness. @param {number} a @param {number} k */
function mulc(a,k){ return pack((a&255)*k,((a>>8)&255)*k,((a>>16)&255)*k); }
/** @param {number} x @param {number} y @param {number} z */
function norm3(x,y,z){ const l=Math.hypot(x,y,z); return [x/l,y/l,z/l]; }
/** @param {number} a @param {number} b @param {number} x */
function smooth(a,b,x){ const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); }
/** @param {number} t */
const gauss = (t)=>Math.exp(-t*t);

/* ---------- the background ---------- */

/** Which surface a pixel shows: wall, a face of the reveal (with its depth t: 0 at the room, 1 at the grille, and the
 * coordinate along it), a bar or the open air. @param {number} x @param {number} y @returns {[number,number,number]} */
function surface(x,y){
  const px=x+0.5, py=y+0.5;
  if(px>=OPEN.x0&&px<OPEN.x1&&py>=OPEN.y0&&py<OPEN.y1) return [onBar(px,py)?K_BAR:K_SKY,1,0];
  if(px<INNER.x0||px>=INNER.x1||py<INNER.y0||py>=INNER.y1) return [K_WALL,0,0];
  const dx=px-VP.x, dy=py-VP.y, hx=dx/((dx<0?INNER.x0:INNER.x1)-VP.x), hy=dy/((dy<0?INNER.y0:INNER.y1)-VP.y);
  if(hx>=hy){ const g=((dx<0?OPEN.x0:OPEN.x1)-VP.x)/((dx<0?INNER.x0:INNER.x1)-VP.x); return [dx<0?K_JAMB_L:K_JAMB_R,Math.min(1,(1-hx)/(1-g)),VP.y+dy/hx]; }
  const g=((dy<0?OPEN.y0:OPEN.y1)-VP.y)/((dy<0?INNER.y0:INNER.y1)-VP.y); return [dy<0?K_SOFFIT:K_SILL,Math.min(1,(1-hy)/(1-g)),VP.x+dx/hy];
}
/** @param {number} px @param {number} py */
function onBar(px,py){ return Math.abs(py-BAR_Y-0.5)<2.5||BARS.some(b=>px>=b&&px<b+5); }

/** Old brick under peeling limewash, soot from the vault, the slot's rust and water running down under the sill.
 * @param {number} x @param {number} y */
function wallCol(x,y){
  const yy=y+40, course=(yy/5)|0, off=(course&1)*6.5, bx=Math.floor((x+off)/13), mort=yy%5===0||Math.floor(x+off)%13===0;
  const id=h2(bx+3,course*5+1), brick=[rgb('#5e3a2c'),rgb('#6b4332'),rgb('#553328'),rgb('#714a36')][id&3];
  let c=mort?rgb('#3c3530'):mulc(brick,0.9+((id>>2)&15)/15*0.2);
  const lime=vnoise(x*0.07+2,y*0.09)*0.7+vnoise(x*0.21,y*0.23+4)*0.3;
  if(lime>0.47) c=mixc(rgb('#a29d8c'),rgb('#8c8778'),vnoise(x*0.3,y*0.3)); else if(lime>0.45) c=mixc(c,rgb('#3a332c'),0.5);   // the limewash and the lip where it flaked off
  c=mixc(c,rgb('#14110e'),Math.max(0,Math.min(0.75,0.18+0.4*vnoise(x*0.05+9,y*0.04)+(y<20?(20-y)*0.02:0))));
  if(x>=OPEN.x0-4&&x<OPEN.x1+4&&y>=INNER.y1){ const run=4+16*vnoise(x*0.33,7.1); if(y-INNER.y1<run) c=mixc(c,(x&7)<3?rgb('#4a2a16'):rgb('#1c2418'),0.5*(1-(y-INNER.y1)/run)); }
  if(y>86) c=mixc(c,rgb('#1f241c'),Math.min(0.5,(y-86)*0.06));
  return mulc(c,1.08-x/144*0.3);                                                                // the lamp is on the left
}
/** Dressed stone of the reveal: blocks along it, two stones deep. @param {number} k @param {number} t @param {number} v @param {number} x @param {number} y */
function revealCol(k,t,v,x,y){
  const side=k===K_JAMB_L||k===K_JAMB_R, row=Math.floor((v+3)/(side?11:15)), deep=t>(row&1?0.45:0.6)?1:0;
  const along=side?((v+3)%11):((v+3)%15), joint=along<0.9||Math.abs(t-(row&1?0.45:0.6))<0.05;
  const id=h2(row*3+k,deep+7), base=[rgb('#77736a'),rgb('#6c685f'),rgb('#807b70')][id%3];
  let c=joint?rgb('#3b3732'):mulc(base,0.92+(id>>4&7)*0.02), lit;
  if(k===K_SILL){ lit=0.62+0.5*t;
    const u=v, ub=BARS.map(b=>VP.x+(b+2.5-VP.x)/0.767).find(b=>Math.abs(u-b)<1.6+1.8*(1-t));
    if(ub!==undefined){ lit*=0.72; if(vnoise(u*0.8,t*6)>0.42) c=mixc(c,rgb('#6a3a1c'),0.45*t+0.1); } }   // the bars' shadows and their rust run in towards the room
  else if(k===K_SOFFIT){ lit=0.34+0.3*t; c=mixc(c,rgb('#1a1612'),0.25+0.3*vnoise(x*0.2,t*3)); }
  else lit=(k===K_JAMB_L?0.5:0.42)+0.5*t;
  if(t<0.07) lit*=1.14;                                                                          // the worn arris
  return mulc(c,lit*(0.55+0.45*state.lum));
}
/** Square iron bars against the sky: a lit edge, a dark edge, rust. @param {number} x @param {number} y @param {number} light */
function barCol(x,y,light){
  const iron=rgb('#2c2824'), rimc=mixc(iron,light,0.45);
  let c;
  if(Math.abs(y+0.5-BAR_Y-0.5)<2.5){ const r=y-(BAR_Y-2); c=r===0?rimc:r===1?rgb('#4a4540'):r===4?rgb('#141210'):iron;
    if(BARS.some(b=>x===b+1||x===b+3)&&r===2) c=rgb('#5a544c'); }                                 // bolts where the bars cross
  else { const b=BARS.find(b=>x>=b&&x<b+5)??0, col=x-b; c=col===0?rimc:col===1?rgb('#3e3a35'):col===4?rgb('#141210'):iron; }
  const rust=vnoise(x*0.6+1,y*0.35);
  if(rust>0.66) c=mixc(c,rgb('#6e3b1c'),0.6); else if(rust>0.6) c=mixc(c,rgb('#4c2a16'),0.5);
  return c;
}

/** London through the slot: the smog sky, St Paul's dome, the roofs of Old Bailey, the gaol's spiked wall.
 * @param {number} x @param {number} y @param {number[]} S @returns {[number,number]} colour and depth (3 sky … 0 the wall) */
function outsideCol(x,y,S){
  const L=state, px=x+0.5, py=y+0.5, k=(y-OPEN.y0)/(OPEN.y1-OPEN.y0), smog=L.smog;
  let c=mixc(S[0],S[1],Math.min(1,k*1.4)); c=mixc(c,smog,0.62+0.18*k); c=mixc(c,L.light0,Math.max(0,0.25-Math.abs(py-50)*0.02));
  const roof=L.roof[x]??99, eave=L.eave[x]??99;
  if(py>=57){                                                                                    /* the gaol's outer wall: coping, chevaux-de-frise */
    const block=h2((x+(((y-57)/5|0)&1)*4)>>3,(y-57)/5|0); let w=py<59?rgb('#4a4842'):mulc(rgb('#33302c'),0.85+(block&7)*0.03);
    if(py>=59&&((y-59)%5===0)) w=rgb('#24221f'); return [mixc(w,smog,0.18),0]; }
  if(py>=53.5&&Math.abs(((px*0.5)%2)-1)*2.6<py-53.5) return [mixc(rgb('#1e1c1a'),smog,0.2),0];
  if(py>=roof){                                                                                  /* the terraces: slate roofs, a band of top-floor windows */
    let r;
    if(py<eave) r=mulc(rgb('#3d4046'),((y-roof)|0)%2?0.92:1.02);
    else { const win=(x%6<2)&&(py-eave>1.2)&&(py-eave<3.6), lit=L.night&&h2(x>>2,9)<110; r=win?(lit?rgb('#d89a48'):rgb('#1c1a18')):rgb('#4b3a30'); if(win&&lit) return [r,1]; }
    return [mixc(r,smog,0.38),1]; }
  const dx=px-DOME.x, far0=mixc(rgb('#2e3136'),smog,0.5);
  const body=(py>=DOME.y+6&&Math.abs(dx)<15)||(py>=DOME.y+3&&py<DOME.y+7&&Math.abs(dx)<10)||(py>=DOME.y&&py<DOME.y+3&&Math.abs(dx)<8);
  const far=far0, cup=py<DOME.y&&(dx/10)**2+((py-DOME.y)/9)**2<1, lan=py>=DOME.y-13&&py<DOME.y-8.5&&Math.abs(dx)<1.7;
  const ball=py>=DOME.y-15&&py<DOME.y-13&&Math.abs(dx)<1, cross=(py>=DOME.y-18&&py<DOME.y-15&&Math.abs(dx)<0.6)||(Math.abs(py-DOME.y+16.5)<0.6&&Math.abs(dx)<1.6);
  if(body||cup||lan||ball||cross){
    let d=far; if(cup) d=mulc(far,dx<-4?1.16:dx<1?1.06:0.92); else if(py>=DOME.y+3&&py<DOME.y+6) d=mulc(far,(x&1)?0.9:1.05);
    return [L.night?mulc(d,0.6):d,2]; }
  return [c,3];
}

/** Bake the scene for the current hour and weather, and reset the life in it. The renderer's buffer is untouched. */
export function buildPullupBackground(){
  const w=appearanceState.W, h=appearanceState.H, N=w*h, L=state, b=skyBucket(), wx=weatherNow(), sky=skyColors(b,roomsState.SKY[b]).map(rgb);
  L.lum=[0.3,0.62,1,0.7,0.42][b]*(wx==='rain'?0.8:1); L.night=b===0||b===4; L.rain=wx==='rain';
  L.smog=mixc(rgb('#8a8676'),sky[1],0.25); if(L.night) L.smog=mulc(L.smog,0.32);
  L.light0=mixc(sky[1],rgb('#d8d0b8'),0.5); L.lightC=mulc(mixc(L.smog,rgb('#e6dcc0'),0.55),0.6+0.5*L.lum);
  L.roof=[]; L.eave=[]; L.plumes=[];
  for(let x=OPEN.x0,n=0;x<OPEN.x1;n++){                                                          // terraced houses with chimney stacks
    const wd=9+h2(n,1)%8, ridge=44+h2(n,2)%5, eave=ridge+4+h2(n,3)%2, sx=x+2+h2(n,4)%Math.max(1,wd-5), st=ridge-4-h2(n,5)%3;
    for(let i=x;i<x+wd;i++){ L.roof[i]=i>=sx&&i<sx+3?st:ridge; L.eave[i]=eave; }
    if(h2(n,6)<190) L.plumes.push({x:sx+1.5,y:st,s:0.6+h2(n,7)/255*0.5,ph:h2(n,8)/40});
    x+=wd; }
  L.bg=new Uint32Array(N); L.kind=new Uint8Array(N); L.glow=new Float32Array(N); L.roomK=new Float32Array(N); L.depth=new Uint8Array(N);
  let open=0;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const i=y*w+x, [k,t,v]=surface(x,y); L.kind[i]=k;
    if(k===K_SKY){ const [c,d]=outsideCol(x,y,sky); L.bg[i]=c; L.depth[i]=d; L.glow[i]=L.lum*(d>=2?1:0.7); open+=L.glow[i]; }
    else if(k===K_BAR){ L.bg[i]=barCol(x,y,L.light0); L.glow[i]=0.06; }
    else if(k===K_WALL){ L.bg[i]=mulc(wallCol(x,y),0.5+0.3*L.lum); L.roomK[i]=1; }
    else { L.bg[i]=revealCol(k,t,v,x,y); L.glow[i]=L.lum*0.35*t; L.roomK[i]=0.25+0.35*(1-t); } }
  L.openGlow=open; L.t=0; L.ps=0; L.pv=0; L.effort=0; L.phase=''; L.reps=0; L.asym=0; L.sheen=0;
  L.z=new Float32Array(N); L.mat=new Uint8Array(N); L.rays=new Float32Array(73*49); L.src=new Float32Array(72*48);
  L.roaches=[0,1,2,3,4].map(id=>spawnRoach(id,true)); L.puffs=[]; L.drips=[]; L.birds=[]; L.birdT=120;
  L.motes=Array.from({length:18},(_,k)=>({x:20+h2(k,1)/255*104,y:4+h2(k,2)/255*88,ph:k}));
  return L.bg;
}

/* ---------- the hero ---------- */

/** One sim tick of the scene: the body follows the exercise with a little spring (a jolt at the dead hang), effort,
 * breath, sweat, the roaches, the birds and the dust. @param {{p:number,phase:string,held:boolean,reps:number,strain:number}} g */
export function pullupSceneTick(g){
  const L=state; if(!L.bg) return; L.t++;
  L.pv+=(g.p-L.ps)*0.32; L.pv*=0.6; L.ps+=L.pv; L.ps=Math.max(-0.12,Math.min(1.04,L.ps));
  L.effort+=((g.phase==='up'&&g.held?1:0)-L.effort)*0.08; L.strain=g.strain; L.fatigue=Math.min(1,g.reps/14);
  if(g.phase==='up'&&L.phase!=='up') L.asym=(Math.random()-0.5)*0.12;
  if(g.phase==='down'&&L.phase==='up'){ const P=L.pose; L.puffs.push({x:P.hx+(Math.random()<0.5?-5:5),y:P.hy+2,age:0,life:70,vx:(Math.random()-0.5)*0.1}); }   // he breathes out at the top
  if(g.reps>L.reps&&g.reps>=3&&L.drips.length<6) L.drips.push({x:(Math.random()-0.5)*14,y:-2,v:0,stick:0});
  L.reps=g.reps; L.phase=g.phase; L.sheen=Math.min(0.85,0.22+g.reps*0.06);
  if((g.phase==='rest'||g.phase==='hang'||g.phase==='lock')&&h2(L.t>>5,31)<14&&(L.t&31)===0) L.puffs.push({x:L.pose.hx+(Math.random()-0.5)*8,y:(L.pose.hy||60)+3,age:0,life:50,vx:(Math.random()-0.5)*0.08});
  for(const p of L.puffs) p.age++; L.puffs=L.puffs.filter(p=>p.age<p.life);
  for(const d of L.drips){ if(d.stick>0) d.stick--; else { d.v=Math.min(0.22,d.v+0.006); d.y+=d.v; if(Math.random()<0.02){ d.stick=20+Math.random()*60; d.v=0; } } }
  L.drips=L.drips.filter(d=>d.y<60);
  for(const m of L.motes){ m.x+=Math.sin(L.t*0.011+m.ph*1.7)*0.05+0.012; m.y+=Math.cos(L.t*0.009+m.ph)*0.04-0.006; if(m.x>126) m.x=18; if(m.y<2) m.y=92; }
  for(const r of L.roaches) roachTick(r);
  if(--L.birdT<=0){ const left=Math.random()<0.5; L.birds.push({x:left?OPEN.x0-6:OPEN.x1+6,y:14+Math.random()*22,vx:(left?1:-1)*(0.3+Math.random()*0.25),ph:Math.random()*6}); L.birdT=300+Math.random()*700; }
  for(const b of L.birds){ b.x+=b.vx; b.y+=Math.sin(L.t*0.03+b.ph)*0.04; } L.birds=L.birds.filter(b=>b.x>OPEN.x0-8&&b.x<OPEN.x1+8);
}

/** Two-bone arm with the elbow kept outward and down. @param {number} sx @param {number} sy @param {number} gx @param {number} gy @param {number} side */
function armIK(sx,sy,gx,gy,side){
  const U=ARM.upper, F=ARM.fore, max=(U+F)*0.995; let dx=gx-sx, dy=gy-sy, d=Math.hypot(dx,dy);
  if(d>max){ sx=gx-dx*max/d; sy=gy-dy*max/d; dx=gx-sx; dy=gy-sy; d=max; }
  const a=(U*U-F*F+d*d)/(2*d), hh=Math.sqrt(Math.max(0,U*U-a*a)), bx=sx+dx*a/d, by=sy+dy*a/d, nx=-dy/d, ny=dx/d;
  const e1=[bx+nx*hh,by+ny*hh], e2=[bx-nx*hh,by-ny*hh], e=side*(e1[0]-CX)>side*(e2[0]-CX)?e1:e2;
  return {sx,sy,ex:e[0],ey:e[1],gx,gy};
}

/** The hero's skeleton for the smoothed progress: shoulder blades up by the ears at the dead hang, pulled down and
 * together on the way up, lats flaring, elbows driving down beside the ribs, the head tipping back over the bar. */
function solvePose(){
  const L=state, P=L.pose, p=L.ps, pc=Math.max(0,Math.min(1,p)), t=L.t;
  const shrug=1-smooth(0,0.16,pc)+Math.max(0,-p)*3, ret=smooth(0.08,0.78,pc), act=Math.min(1,smooth(0.04,0.55,pc)+L.effort*0.25), tilt=smooth(0.72,1,pc);
  const e=pc*pc*(3-2*pc)*0.35+pc*0.65, sw=16+1.2*ret-1.4*Math.min(1.4,shrug);
  const shake=(L.strain*0.7+L.effort*L.fatigue*0.35)*(Math.sin(t*1.9)*0.6+Math.sin(t*3.1+1)*0.4);
  const breath=(L.phase==='rest'||L.phase==='hang'||L.phase==='lock')?Math.sin(t*(0.07+L.fatigue*0.05)):0;
  const hang=BAR_Y+Math.sqrt(((ARM.upper+ARM.fore)*0.985)**2-(GRIP.x-sw)**2), sy=hang+(SY_TOP-hang)*e+shake*0.5;
  const lead=L.asym*Math.sin(Math.PI*pc)*6, tx=shake*0.4;
  P.l=armIK(CX+tx-sw,sy-lead,CX-GRIP.x,GRIP.y,-1); P.r=armIK(CX+tx+sw,sy+lead,CX+GRIP.x,GRIP.y,1);
  P.cx=CX+tx; P.ty=(P.l.sy+P.r.sy)/2+3*Math.min(1.3,shrug); P.tilt=(P.r.sy-P.l.sy)/(2*sw);
  P.sw=sw; P.shrug=shrug; P.ret=ret; P.act=act; P.headTilt=tilt; P.breath=breath; P.trapH=6+4*Math.min(1.3,shrug);
  P.hx=P.cx-P.tilt*5; P.hy=P.ty-14.6-1.2*tilt; P.flexL=1-Math.hypot(P.l.gx-P.l.sx,P.l.gy-P.l.sy)/(ARM.upper+ARM.fore); P.flexR=1-Math.hypot(P.r.gx-P.r.sx,P.r.gy-P.r.sy)/(ARM.upper+ARM.fore);
}

/** Half-width of the back at Y px below the top of the ribcage: the traps' slope, the shoulders, the lats' flare, the
 * waist, the hips in the trousers. @param {number} Y */
function backHalf(Y){
  const P=state.pose, top=P.sw-1;
  if(Y<0){ const q=Math.min(1,-Y/P.trapH); return 5.7+(top-5.7)*Math.pow(Math.max(0,1-q),0.7); }
  if(Y>=40) return 12.4+(Y-40)*0.14;
  const lat=(1.2+2.1*P.act)*gauss((Y-(7+3*(1-P.act)))/6.5);
  return 12.2+(top-12.2)*Math.pow(1-Y/40,1.25)+lat+P.breath*0.5*gauss((Y-14)/10);
}
/** Height of the muscles over the round of the back, after a back mid-pull: the spine's groove between thick erectors,
 * the lower traps' diamond to a point at mid-back, the shoulder blades with their spines (wide and tipped up at the
 * dead hang, drawn down and in on the pull), teres and infraspinatus bunching towards the armpit, the lats' long wings.
 * @param {number} X @param {number} Y @param {number} hw */
function backBumps(X,Y,hw){
  const P=state.pose, ax=Math.abs(X);
  let z=-1.5*gauss(X/1.25)*smooth(1,9,Y);                                                         // the spine's groove
  z+=1.4*gauss((ax-4.4)/2.3)*smooth(15,31,Y)*(1+0.3*smooth(31,40,Y));                            // the erectors
  const tip=20+3*(1-P.ret), tw=Y<3?hw-3:(hw-3)*Math.max(0,(tip-Y)/(tip-3))*0.85;                  // lower and middle traps
  if(Y<tip) z+=(0.2+0.25*P.ret)*(1-smooth(tw-4,tw,ax))*smooth(-2,1,Y);
  const cx=10.5+3.5*(1-P.ret)+1.5*P.shrug, cy=9-2.5*P.shrug+1.5*P.ret, an=0.5*P.shrug-0.1*P.ret;  // the shoulder blade
  const a=(ax-cx)*Math.cos(an)-(Y-cy)*Math.sin(an), b=(ax-cx)*Math.sin(an)+(Y-cy)*Math.cos(an), rw=5.4*(1-0.45*Math.max(0,b)/7.8);
  z+=(0.9+0.5*P.act)*(1-smooth(0.35,1.05,(a/rw)**2+(b/7.8)**2));
  z+=(0.6+1.3*P.act)*gauss(Math.hypot(ax-(hw-4.5),Y-(12+2*(1-P.act)))/3.6);                     // teres and infraspinatus
  z+=0.4*P.ret*gauss((ax-3.3)/1.8)*gauss((Y-11)/5);                                              // rhomboids between the blades
  const ax0=hw-1, ay0=6, vx=6.5-ax0, vy=33-ay0, tt=Math.max(0,Math.min(1,((ax-ax0)*vx+(Y-ay0)*vy)/(vx*vx+vy*vy)));
  z+=(0.8+2.2*P.act)*gauss(Math.hypot(ax-ax0-vx*tt,Y-ay0-vy*tt)/4.6)*Math.sin(Math.PI*tt)**0.7;   // the lats
  z+=0.8*gauss((Y+1)/3.2)*gauss((ax-6)/3.2);                                                     // the upper traps over the shoulder line
  return z;
}

/** Rasterise the body into the depth and material maps; returns its bounding box. */
function rasterBody(){
  const L=state, P=L.pose, Z=L.z, M=L.mat, w=appearanceState.W, h=appearanceState.H; Z.fill(-1e9);
  let x0=w, x1=0, y0=h, y1=0;
  const plot=(/** @type {number} */ x,/** @type {number} */ y,/** @type {number} */ z,/** @type {number} */ m)=>{ if(x<0||y<0||x>=w||y>=h) return; const i=y*w+x; if(z>Z[i]){ Z[i]=z; M[i]=m; if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; } };
  const cap=(/** @type {number[]} */ a,/** @type {number[]} */ b,/** @type {number} */ r0,/** @type {number} */ r1,/** @type {number} */ z0,/** @type {number} */ z1,/** @type {number} */ m,/** @type {number} */ bl)=>{
    const rm=Math.max(r0,r1)+bl, dx=b[0]-a[0], dy=b[1]-a[1], l2=dx*dx+dy*dy||1;
    for(let y=Math.floor(Math.min(a[1],b[1])-rm);y<=Math.ceil(Math.max(a[1],b[1])+rm);y++) for(let x=Math.floor(Math.min(a[0],b[0])-rm);x<=Math.ceil(Math.max(a[0],b[0])+rm);x++){
      const px=x+0.5, py=y+0.5, t=Math.max(0,Math.min(1,((px-a[0])*dx+(py-a[1])*dy)/l2)), ex=px-a[0]-dx*t, ey=py-a[1]-dy*t, r=r0+(r1-r0)*t+bl*4*t*(1-t), d2=ex*ex+ey*ey;
      if(d2<r*r) plot(x,y,z0+(z1-z0)*t+Math.sqrt(r*r-d2),m); } };
  const ell=(/** @type {number} */ cx,/** @type {number} */ cy,/** @type {number} */ rx,/** @type {number} */ ry,/** @type {number} */ z0,/** @type {number} */ rz,/** @type {(x:number,y:number)=>number} */ m,e=2)=>{
    for(let y=Math.floor(cy-ry);y<=Math.ceil(cy+ry);y++) for(let x=Math.floor(cx-rx);x<=Math.ceil(cx+rx);x++){ const q=Math.abs((x+0.5-cx)/rx)**e+Math.abs((y+0.5-cy)/ry)**e; if(q<1) plot(x,y,z0+rz*Math.sqrt(1-q),m(x,y)); } };
  /** A muscle riding on a limb: offset across it, lifted just over its round. @param {number[]} a @param {number[]} b @param {number[]} lat @param {number[]} br @param {number[]} bz @param {number} t0 @param {number} t1 @param {number} o0 @param {number} o1 @param {number} r0 @param {number} r1 @param {number} lift */
  const muscle=(a,b,lat,br,bz,t0,t1,o0,o1,r0,r1,lift)=>{ const at=(/** @type {number} */ t,/** @type {number} */ o,/** @type {number} */ r)=>{ const R=br[0]+(br[1]-br[0])*Math.max(0,t);
      return [[a[0]+(b[0]-a[0])*t+lat[0]*o,a[1]+(b[1]-a[1])*t+lat[1]*o],bz[0]+(bz[1]-bz[0])*t+Math.sqrt(Math.max(0,R*R-o*o))-r+lift]; };
    const [p0,z0]=at(t0,o0,r0), [p1,z1]=at(t1,o1,r1); cap(p0,p1,r0,r1,z0,z1,M_SKIN,0); };
  /** The side of a limb facing up and out (the outer heads), from its direction. @param {number} dx @param {number} dy @param {number} s */
  const outer=(dx,dy,s)=>{ const l=Math.hypot(dx,dy)||1, n=[-dy/l,dx/l]; return n[0]*s*0.6-n[1]*0.8>0?n:[-n[0],-n[1]]; };
  for(const [A,s,flex] of /** @type {[any,number,number][]} */ ([[P.l,-1,P.flexL],[P.r,1,P.flexR]])){   // arms: deltoid, triceps, forearm, fist over the bar
    const S=[A.sx,A.sy], E=[A.ex,A.ey], fl=Math.hypot(A.gx-A.ex,A.gy-A.ey)||1, wr=[A.gx+(A.ex-A.gx)/fl*3.2,A.gy+(A.ey-A.gy)/fl*3.2];
    const lu=outer(E[0]-S[0],E[1]-S[1],s), lf=outer(wr[0]-E[0],wr[1]-E[1],s), ur=[4.6,3.4], uz=[2.4,1], fr=[3.8,2.8], fz=[1,-3], fN=Math.min(1,flex/0.6);
    cap(E,wr,fr[0],fr[1],fz[0],fz[1],M_SKIN,0.4);
    muscle(E,wr,lf,fr,fz,0.12,0.58,1.3,0.7,3.5,2.2,0.8+0.4*L.effort);                               /* extensors and brachioradialis, thick just below the elbow */
    muscle(E,wr,lf,fr,fz,0.1,0.48,-1.1,-0.7,3,2.1,0.6+0.3*L.effort);                             /*   and the flexors */
    cap(S,E,ur[0],ur[1],uz[0],uz[1],M_SKIN,0.9+0.3*flex);
    muscle(S,E,lu,ur,uz,0.12,0.72,-2,-1.2,3.7,2.5,1.2+0.4*fN);                                 /* triceps, long head by the armpit */
    muscle(S,E,lu,ur,uz,0.12,0.45,1.6,1.4,3,2.3,0.7+0.2*fN);                                   /*   and lateral head */
    muscle(S,E,lu,ur,uz,0.4-0.12*fN,0.84-0.06*fN,1.6,1.3,3.1+0.9*fN,2.2,0.9+1.5*fN);
    muscle(S,E,lu,ur,uz,-0.02,0.4,0.5,0.3,4.8,2.3,1+0.3*L.effort);                               /* the deltoid's cap to its insertion */                /* the biceps: gathers into a peak as the elbow bends, narrows into it */
    ell(A.gx,A.gy-0.7,3.5,3.9,-3,2.6,()=>M_HAND); }
  cap([P.hx,P.hy+4],[P.cx,P.ty-1],5.1,5.8,0.5,0.5,M_SKIN,0);
  for(const s of [-1,1]) cap([P.hx+s*2.2,P.hy+5],[P.cx+s*2.9,P.ty-3],2.5,2.7,3,2.8,M_SKIN,0);   /* the neck's two columns, a groove between */                                       // the neck
  const hairline=(/** @type {number} */ x)=>P.hy+4.1-0.9*((x+0.5-P.hx)/6.9)**2-1.4*P.headTilt;
  ell(P.hx,P.hy,6.9,7.9,1.5,7,(x,y)=>y+0.5>hairline(x)?M_SKIN:M_HAIR,2.5);                              // the head, cropped close
  for(const s of [-1,1]) ell(P.hx+s*6.4,P.hy+1.5,1.3,2.5,0.8,1.4,()=>M_EAR);
  for(let y=Math.floor(P.ty-P.trapH-1);y<h;y++){                                                   // the back, row by row
    const Y0=y+0.5-P.ty, hw0=backHalf(Y0);
    for(let x=Math.floor(P.cx-hw0-2);x<=Math.ceil(P.cx+hw0+2);x++){ const X=x+0.5-P.cx, Y=Y0-P.tilt*X, hw=backHalf(Y), u=X/hw; if(Y<-P.trapH||Math.abs(u)>=1) continue;
      const round=5.6*Math.sqrt(1-u**4);
      if(Y>=40) plot(x,y,round+0.6*Math.sin(X*0.9+Y*0.3)*smooth(42,48,Y),M_PANT);
      else plot(x,y,round+backBumps(X,Y,hw),M_SKIN); } }
  return [x0,x1,y0,y1];
}

/** Light the body: six skin tones from the lamp, the window's rim on every edge that has the opening behind it, the
 * sweat's shine, dark creases where one part passes over another. @param {number[]} box */
function shadeBody(box){
  const L=state, P=L.pose, Z=L.z, M=L.mat, fb=rendererState.fb, w=appearanceState.W, h=appearanceState.H, PAL=appearanceState.PAL, A=appearanceState;
  const skin=[PAL[A.R_SKX*3],PAL[A.R_SKIN*3],PAL[A.R_SKX*3+1],PAL[A.R_SKIN*3+1],PAL[A.R_SKX*3+2],PAL[A.R_SKIN*3+2]];
  const hair=[mixc(PAL[A.R_HAIR*3],0xff000000,0.45),PAL[A.R_HAIR*3],PAL[A.R_HAIR*3+1],PAL[A.R_HAIR*3+2]];
  const pant=[mixc(PAL[A.R_PANT*3],0xff000000,0.4),PAL[A.R_PANT*3],PAL[A.R_PANT*3+1],PAL[A.R_PANT*3+2]];
  const rimc=mixc(skin[5],L.lightC,0.55), room=(0.5+0.5*L.light)*(0.62+0.38*L.lum);
  for(let y=box[2];y<=box[3];y++) for(let x=box[0];x<=box[1];x++){ const i=y*w+x, z=Z[i]; if(z<-1e8) continue;
    const zl=x>0&&Z[i-1]>-1e8?Z[i-1]:z-3, zr=x<w-1&&Z[i+1]>-1e8?Z[i+1]:z-3, zu=y>0&&Z[i-w]>-1e8?Z[i-w]:z-3, zd=y<h-1&&Z[i+w]>-1e8?Z[i+w]:z-3;
    const dzx=Math.max(-3,Math.min(3,(zr-zl)/2)), dzy=Math.max(-3,Math.min(3,(zd-zu)/2)), nl=1/Math.hypot(dzx,dzy,1), nx=-dzx*nl, ny=-dzy*nl, nz=nl;
    const m=M[i], over=Math.max(zl,zr,zu,zd)-z>2.6;
    let I=(0.1+0.82*Math.max(0,nx*LF[0]+ny*LF[1]+nz*LF[2]))*room; if(over) I*=0.5;
    const sp=(m===M_SKIN||m===M_HAND)?Math.pow(Math.max(0,nx*HV[0]+ny*HV[1]+nz*HV[2]),18)*L.sheen:0;
    let c;
    if(m===M_HAIR) c=hair[Math.max(0,Math.min(3,Math.floor(I*3.6)))];
    else if(m===M_PANT){ c=pant[Math.max(0,Math.min(3,Math.floor(I*3.6)))]; const Y=y+0.5-P.ty-P.tilt*(x+0.5-P.cx); if(Y<42) c=mixc(c,0xff000000,0.3); }
    else { let k=Math.max(over?0:1,Math.floor(I*5)+1-(over?2:0)+(m===M_EAR?-1:0)); if(m===M_HAND&&y+0.5<P.l.gy-2.6) k++; c=skin[Math.min(5,k)]; if(sp>0.45) c=mixc(c,0xffffffff,sp>0.75?0.55:0.3); }
    const sx=Math.round(x+nx*3.4), sy=Math.round(y+ny*3.4), gl=sx>=0&&sy>=0&&sx<w&&sy<h&&Z[sy*w+sx]<-1e8?L.glow[sy*w+sx]:0, rim=(1-nz)*gl*2.2;
    if(rim>0.3) c=mixc(c,m===M_HAIR?mixc(hair[2],L.lightC,0.4):m===M_PANT?mixc(pant[3],L.lightC,0.5):rimc,rim>0.5?0.75:0.4);
    fb[i]=c; }
  for(const d of L.drips){ const x=Math.round(P.cx+d.x), y=Math.round(P.ty+8+d.y);   // sweat running down the back
    for(let k=0;k<2;k++){ const yy=y-k; if(x<0||yy<0||x>=w||yy>=h) continue; const i=yy*w+x; if(M[i]===M_SKIN&&Z[i]>-1e8) fb[i]=mixc(fb[i],0xffffffff,k?0.2:0.45); } }
}

/* ---------- the life around him ---------- */

/** @param {number} id @param {boolean} first */
function spawnRoach(id,first){
  let x=0, y=0;
  if(first) for(let k=0;k<40;k++){ x=4+Math.random()*136; y=2+Math.random()*92; if(walkable(x,y)&&(k>30||state.kind[(y|0)*appearanceState.W+(x|0)]!==K_WALL)) break; }
  else { const edge=h2(id,state.t|0)%3; x=edge===0?1:edge===1?142:20+Math.random()*100; y=edge===2?95:30+Math.random()*60; }
  return {id,x,y,a:Math.random()*6.28,v:0,vt:0.5,mode:first?0:2,timer:first?Math.random()*200:400+Math.random()*900,leg:0};
}
/** Can a roach stand here: wall or reveal, not the open air, not under the meter. @param {number} x @param {number} y */
function walkable(x,y){
  const w=appearanceState.W, h=appearanceState.H; if(x<0||y<0||x>=w||y>=h) return false;
  if(x>=129&&x<140&&y>=8&&y<78) return false;
  const k=state.kind[(y|0)*w+(x|0)]; return k!==K_SKY&&k!==K_BAR;
}
/** Dart, stop, twitch the feelers; head for the window while the hero blocks it, scatter when the light comes back.
 * @param {any} r */
function roachTick(r){
  const L=state;
  if(r.mode===2){ if(--r.timer<=0) Object.assign(r,{mode:1,timer:60,a:Math.atan2(48-r.y,72-r.x)}); return; }
  if(r.mode===0){ r.v*=0.6; if(--r.timer<=0){ r.mode=1; r.timer=25+Math.random()*110; r.a+=(Math.random()-0.5)*2.4; r.vt=0.35+Math.random()*0.5; } return; }
  const dark=L.light<0.75, toWin=Math.atan2(BAR_Y-r.y,CX-r.x), bright=L.glow[(r.y|0)*appearanceState.W+(r.x|0)]>0.15;
  let want=r.a+(vnoise(L.t*0.05,r.id*7.3)-0.5)*0.5;
  if(dark&&!bright) want=r.a+Math.sin(toWin-r.a)*0.12; else if(!dark&&(bright||L.light>0.9)) want=r.a-Math.sin(toWin-r.a)*0.16;
  r.a=want; const vt=(!dark&&bright)?0.95:r.vt; r.v+=(vt-r.v)*0.2;
  const nx=r.x+Math.cos(r.a)*r.v, ny=r.y+Math.sin(r.a)*r.v;
  if(walkable(nx,ny)){ r.x=nx; r.y=ny; } else { r.a+=(Math.random()<0.5?1:-1)*(1.2+Math.random()); r.v*=0.3; }
  if(r.x<0.5||r.x>143.5||r.y>95.5||r.y<0.5){ Object.assign(r,spawnRoach(r.id,false)); return; }
  r.leg+=r.v*1.4;
  if(--r.timer<=0){ r.mode=0; r.timer=20+Math.random()*(dark?60:180); }
}
/** A glossy brown body along its heading, legs rowing while it runs, feelers. @param {any} r */
function drawRoach(r){
  if(r.mode===2) return;
  const fb=rendererState.fb, w=appearanceState.W, Z=state.z, ca=Math.cos(r.a), sa=Math.sin(r.a);
  const put=(/** @type {number} */ x,/** @type {number} */ y,/** @type {number} */ c,/** @type {number} */ k)=>{ x=Math.floor(x); y=Math.floor(y); if(x<0||y<0||x>=w||y>=appearanceState.H||!walkable(x,y)) return; const i=y*w+x; fb[i]=k>=1?c:mixc(fb[i],c,k); };
  for(let y=Math.floor(r.y-3);y<=r.y+3;y++) for(let x=Math.floor(r.x-3);x<=r.x+3;x++){ const dx=x+0.5-r.x, dy=y+0.5-r.y, a=dx*ca+dy*sa, c=-dx*sa+dy*ca, q=(a/2.6)**2+(c/1.3)**2;
    if(q<1) put(x,y,a>1.6?rgb('#1e0f07'):(Math.abs(c+0.3)<0.5&&a>-0.8&&a<0.9?rgb('#b8743e'):a<-1?rgb('#4a240f'):rgb('#6a3818')),1); }
  if(r.v>0.1) for(const [la,s,ph] of [[1,1,0],[0,-1,0],[-1,1,0],[1,-1,1],[0,1,1],[-1,-1,1]]){ const sw=Math.sin(r.leg+ph*Math.PI)*0.9; put(r.x+ca*(la+sw)-sa*s*1.8,r.y+sa*(la+sw)+ca*s*1.8,rgb('#2a160a'),0.8); }
  const tw=Math.sin(state.t*0.4+r.id)*0.25;
  for(const s of [-1,1]) for(let k=1;k<=3;k++){ const an=r.a+s*(0.35+tw*s), d=2.6+k; put(r.x+Math.cos(an)*d,r.y+Math.sin(an)*d,rgb('#6a4428'),0.7-k*0.12); }
}

/** Light shafts from the opening into the hazy room, cut by the hero: a radial gather over a half-size map. */
function lightShafts(){
  const L=state, fb=rendererState.fb, w=appearanceState.W, h=appearanceState.H, S=L.src, R=L.rays, RW=72, RH=48, Z=L.z, G=L.glow;
  for(let v=0;v<RH;v++) for(let u=0;u<RW;u++){ let s=0; for(let k=0;k<4;k++){ const i=(v*2+(k>>1))*w+u*2+(k&1); if(Z[i]<-1e8) s+=L.kind[i]===K_SKY?G[i]:L.kind[i]===K_BAR?L.lum*0.6:0; } S[v*RW+u]=s*0.25; }
  const sx=CX/2, sy=-26;                                                                          /* the sky stands high over the slot: the shafts fall into the room */
  for(let v=0;v<=RH;v++) for(let u=0;u<=RW;u++){ const dl=Math.hypot(sx-u,sy-v), dx=(sx-u)/dl, dy=(sy-v)/dl; let x=u, y=v, sum=0, dec=1;
    for(let k=0;k<24;k++){ x+=dx; y+=dy; const xi=x|0, yi=y|0; if(xi>=0&&yi>=0&&xi<RW&&yi<RH) sum+=S[yi*RW+xi]*dec; dec*=0.94; }
    R[v*(RW+1)+u]=sum/14; }
  const col=L.lightC, k0=0.85*(0.35+0.65*L.lum);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const fx=x/2, fy=y/2, u=fx|0, v=fy|0, ax=fx-u, ay=fy-v, o=v*(RW+1)+u;
    const r=(R[o]*(1-ax)+R[o+1]*ax)*(1-ay)+(R[o+RW+1]*(1-ax)+R[o+RW+2]*ax)*ay, i=y*w+x, a=Math.min(0.5,r*k0*(Z[i]>-1e8?0.35:L.kind[i]===K_SKY?0.15:1));
    if(a>0.01) fb[i]=mixc(fb[i],col,a); }
}

/** Smog drifting outside, chimney smoke, pigeons, rain — only where the opening shows air. */
function outsideLife(){
  const L=state, fb=rendererState.fb, w=appearanceState.W, t=L.t, K=L.kind, D=L.depth, smoke=mulc(rgb('#6e6a62'),L.night?0.4:1);
  for(let y=OPEN.y0;y<OPEN.y1;y++) for(let x=OPEN.x0;x<OPEN.x1;x++){ const i=y*w+x; if(K[i]!==K_SKY) continue;
    const n=fbm(x*0.045-t*0.0011,y*0.09+Math.sin(t*0.0017)*0.3), a=(0.1+0.32*n*n)*(D[i]===0?0.4:1);
    let c=mixc(fb[i],L.smog,a);
    for(const p of L.plumes){ const hh=p.y-y; if(hh<0||D[i]===0||(D[i]===1&&y>=p.y-0.5)) continue;
      const cxp=p.x+hh*0.42+Math.sin(hh*0.16-t*0.021+p.ph)*1.4, wd=0.9+hh*0.2, g=gauss((x+0.5-cxp)/wd);
      if(g<0.03) continue; const s=g*p.s*Math.max(0,1-hh/34)*(0.45+0.55*vnoise(x*0.3-t*0.006,y*0.28+t*0.016+p.ph)); c=mixc(c,smoke,Math.min(0.8,s)); }
    fb[i]=c; }
  for(const b of L.birds){ const f=Math.sin(L.t*0.32+b.ph), up=f>0.3, dn=f<-0.3, x=Math.round(b.x), y=Math.round(b.y);
    for(const [dx,dy] of up?[[-2,-1],[-1,0],[0,0],[1,0],[2,-1]]:dn?[[-2,1],[-1,0],[0,0],[1,0],[2,1]]:[[-2,0],[-1,0],[0,0],[1,0],[2,0]]){ const xx=x+dx, yy=y+dy, i=yy*w+xx; if(xx>=0&&xx<w&&K[i]===K_SKY&&D[i]>=1) fb[i]=mixc(fb[i],rgb('#1a1816'),0.75); } }
  if(L.rain) for(let k=0;k<46;k++){ const x0=OPEN.x0+(h2(k,3)/255)*96, y0=(h2(k,4)/255*62+t*2.3)%62; for(let s=0;s<3;s++){ const x=Math.round(x0-y0*0.25-s*0.25), y=Math.round(OPEN.y0+y0-s), i=y*w+x; if(x>=0&&x<w&&y>=0&&K[i]===K_SKY) fb[i]=mixc(fb[i],rgb('#c8ccd0'),0.28-s*0.06); } }
}

/** Puffs of breath in the cold, and the dust that shows only inside the shafts. */
function airLife(){
  const L=state, fb=rendererState.fb, w=appearanceState.W, h=appearanceState.H, R=L.rays;
  for(const p of L.puffs){ const k=p.age/p.life, r=1.5+k*5, a=0.32*(1-k)*Math.min(1,p.age/6), cx=p.x+p.vx*p.age, cy=p.y-p.age*0.16;
    for(let y=Math.floor(cy-r);y<=cy+r;y++) for(let x=Math.floor(cx-r);x<=cx+r;x++){ if(x<0||y<0||x>=w||y>=h) continue; const d=Math.hypot(x+0.5-cx,y+0.5-cy)/r; if(d>=1) continue;
      const s=a*(1-d)*(1-d)*(0.55+0.6*vnoise(x*0.5+p.age*0.05,y*0.5)); if(s>0.02) fb[y*w+x]=mixc(fb[y*w+x],L.lightC,Math.min(0.6,s)); } }
  for(const m of L.motes){ const x=Math.floor(m.x), y=Math.floor(m.y); if(x<0||y<0||x>=w||y>=h) continue; const r=R[(y>>1)*73+(x>>1)]*(0.35+0.65*L.lum);
    if(r>0.04) fb[y*w+x]=mixc(fb[y*w+x],L.lightC,Math.min(0.7,r*4)); }
}

/** Pose and rasterise the hero for a given progress (0 dead hang … 1 chin over the bar) without stepping the scene;
 * the coverage of the opening and the room's light follow. For tests and for the render. @param {number} [p] */
export function posePullup(p){
  const L=state; if(p!==undefined){ L.ps=p; L.pv=0; }
  solvePose(); const box=rasterBody();
  let cov=0; const Z=L.z, K=L.kind, G=L.glow; for(let i=0;i<Z.length;i++) if(Z[i]>-1e8&&K[i]===K_SKY) cov+=G[i];
  L.cover=L.openGlow>0?cov/L.openGlow:0; L.light=Math.max(0.3,Math.min(1,1.12-1.7*L.cover));
  return box;
}

/** The whole picture into the renderer's buffer. */
export function renderPullupScene(){
  const L=state, fb=rendererState.fb, R=L.roomK; fb.set(L.bg);
  outsideLife(); const box=posePullup();
  for(const r of L.roaches) drawRoach(r);
  const dim=(1-L.light)*1.1; for(let i=0;i<fb.length;i++) if(R[i]>0) fb[i]=mulc(fb[i],1-R[i]*dim);
  shadeBody(box); lightShafts(); airLife();
}

````

---

## `src/roaches.js`

````js
/* Roaches on the Ward's wall (KARALUCHY.md): the hero kneels on the guard-bed facing the scratched wall. The mouse (or
   the arrows) leads the shadow of his fist, a click or Space throws the punch at it. Roaches run across the wall from
   edge or crack to edge or crack; a squashed one stays as a stain. A miss is bare knuckles on stone: pain, a shaking
   hand and a pause. The session lasts one stub of tallow; the scene is roach-scene.js, the rules roach-rules.js. */

import { state as boxing, setGstate, shake, drawText } from './boxing.js';
import { state as appearance } from './appearance.js';
import { state as renderer, setFramebuffer, screenToView } from './renderer.js';
import { state as input, setInfo } from './input.js';
import { leaveMode, setPanelMode } from './navigation.js';
import { applyStats, resetSessXP, statShort } from './progression.js';
import { initAudio, sfxSquash, sfxKnuckle, sfxHiss, sfxSkitter, sfxHeart, sfxCrackle, sfxGaol, sfxWhoosh, sfxBreath } from './audio.js';
import { state as session, beginSession, sessionMetric, sessionAddTime, sessionOpen, sessionRunning, sessionParams } from './training-session.js';
import { DRILLS } from './training-data.js';
import { KINDS, HIT_PAIN, PAIN_FADE, PAIN_REST, SURFACE, roachContact, missCost, killPoints } from './roach-rules.js';
import { buildRoachWall, roachWallTick, renderRoachWall, surfaceAt, chipWall, bloodWall, wallDust, wallGoo, CRACKS, NAME_HOLE, WALL_Y1, FIST_FROM } from './roach-scene.js';
import { vnoise } from './noise.js';

/** Ticks of the punch going out, the stop at the wall (hit / miss), the way back. */
const OUT_T=7, STOP_HIT=4, STOP_MISS=6, BACK_T=10, BUFFER_T=4;
/** Outside a session (debug start) the stage I parameters apply. */
const FREE=DRILLS.roach.stages[0];
const KIND_WEIGHT = /** @type {Record<string,number>} */ ({black:3,prusak:3,nymph:2,big:1});

export const state = {
  on:false,
  /** Where the hand wants to be (mouse / keys) and where it is, with its spring velocity. */
  aim:{x:72,y:44}, hand:{x:72,y:44,vx:0,vy:0}, keys:{l:0,r:0,u:0,d:0}, keyV:0,
  /** 'aim' | 'out' | 'stop' | 'back' | 'cool' */
  phase:'aim', t:0, sx:0, sy:0, missed:false, cool:0, coolMax:0, buffered:false,
  pain:0, rest:0, combo:0, best:0, kills:0, clean:0, moving:0, misses:0, painMax:0,
  /** @type {any[]} */ roaches:[], /** @type {any[]} */ splats:[], /** @type {any[]} */ queue:[],
  nextId:0, spawnT:50, ticks:0, swarmAt:-1, lampK:1, ending:false, endT:0, knock:false,
  tremX:0, tremY:0, beatT:0, pulse:0, gaolT:400, flash:'', flashT:0, feedback:'',
  /** @type {{x:number,y:number,s:number,a:number}|null} */ ghost:null,
};

/** @param {number} a @param {number} b @param {number} x */
function smooth(a,b,x){ const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); }
/** Stage parameters of the running session. */
function params(){ return sessionOpen()?sessionParams('roach'):FREE; }
/** Session length in ticks (for the waves). */
function sessionLen(){ return (sessionOpen()?session.S.def.roundSec[session.S.stage-1]:80)*60; }

/** Kneel at the wall: one stub of tallow, as many roaches as he can. */
export function startRoaches(){
  leaveMode(); initAudio(); setGstate('roach'); applyStats(); resetSessXP();
  beginSession('roach',{end:endLamp,again:()=>startRoaches(),extra:summaryExtra});
  Object.assign(state,{on:true,aim:{x:72,y:44},hand:{x:72,y:44,vx:0,vy:0},keys:{l:0,r:0,u:0,d:0},keyV:0,phase:'aim',t:0,missed:false,cool:0,coolMax:0,buffered:false,
    pain:0,rest:0,combo:0,best:0,kills:0,clean:0,moving:0,misses:0,painMax:0,roaches:[],splats:[],queue:[],nextId:0,spawnT:50,ticks:0,lampK:1,ending:false,endT:0,knock:false,
    tremX:0,tremY:0,beatT:0,pulse:0,gaolT:300+Math.random()*400,flash:'',flashT:0,ghost:null,
    swarmAt:params().max>=4&&Math.random()<0.35?Math.round(sessionLen()*(0.3+Math.random()*0.4)):-1,
    feedback:'Mysz prowadzi cień pięści, klik lub Spacja — cios. Pudło to gołe kostki na kamieniu.'});
  buildRoachWall(); document.body.classList.add('roach'); setPanelMode(); setInfo();
}

/** Leave the wall: release the keys. */
export function resetRoaches(){ state.on=false; roachKeysOff(); document.body.classList.remove('roach'); }

/** Release held aim keys (menus, focus loss). */
export function roachKeysOff(){ state.keys.l=state.keys.r=state.keys.u=state.keys.d=0; }

/** Aim keys. @param {string} code @param {boolean} down @returns {boolean} consumed */
export function roachKey(code,down){
  const k=code==='ArrowLeft'||code==='KeyA'?'l':code==='ArrowRight'||code==='KeyD'?'r':code==='ArrowUp'||code==='KeyW'?'u':code==='ArrowDown'||code==='KeyS'?'d':'';
  if(!k) return false; state.keys[k]=down?1:0; return true;
}

/** Lead the hand to a point of the wall (native pixels). @param {number} x @param {number} y */
export function roachAim(x,y){ state.aim.x=Math.max(3,Math.min(141,x)); state.aim.y=Math.max(3,Math.min(WALL_Y1-3,y)); }

/** Can the hand be thrown now? */
function canAct(){ return state.on&&boxing.gstate==='roach'&&!input.paused&&(!sessionOpen()||sessionRunning()); }

/** Throw the punch at the shadow (a press late in the way back is kept for the next one). */
export function roachStrike(){
  if(!canAct()) return;
  if(state.phase==='back'&&state.t>=BACK_T-BUFFER_T){ state.buffered=true; return; }
  if(state.phase!=='aim') return;
  state.phase='out'; state.t=0; state.buffered=false; state.ghost=null;
  state.sx=state.hand.x+state.tremX; state.sy=state.hand.y+state.tremY; state.rest=0; sfxWhoosh(0.55);
}

/* ---------- roaches ---------- */

/** A point where a roach comes in or leaves: an edge of the wall or a crack. @param {boolean} [crackOk] */
function gatePoint(crackOk=true){
  if(crackOk&&Math.random()<0.45){ const c=CRACKS[Math.floor(Math.random()*CRACKS.length)]; return {x:c.x,y:c.y,crack:true}; }
  const s=Math.floor(Math.random()*4);
  return s===0?{x:-5,y:8+Math.random()*70,crack:false}:s===1?{x:149,y:8+Math.random()*70,crack:false}:s===2?{x:10+Math.random()*124,y:-5,crack:false}:{x:10+Math.random()*124,y:WALL_Y1+3,crack:false};
}
/** The gate furthest from a point among a few. @param {number} x @param {number} y */
function farGate(x,y){ let best=gatePoint(), bd=-1; for(let k=0;k<4;k++){ const g=gatePoint(), d=Math.hypot(g.x-x,g.y-y); if(d>bd){ bd=d; best=g; } } return best; }
/** The nearest way out from a point. @param {number} x @param {number} y */
function nearGate(x,y){
  const opts=[...CRACKS.map(c=>({x:c.x,y:c.y,crack:true})),{x:-5,y,crack:false},{x:149,y,crack:false},{x,y:-5,crack:false},{x,y:WALL_Y1+3,crack:false}];
  return opts.reduce((a,b)=>Math.hypot(a.x-x,a.y-y)<=Math.hypot(b.x-x,b.y-y)?a:b);
}
/** Pick a kind by the stage's list. @param {string[]} list */
function pickKind(list){ let sum=0; for(const k of list) sum+=KIND_WEIGHT[k]; let r=Math.random()*sum; for(const k of list){ r-=KIND_WEIGHT[k]; if(r<=0) return k; } return list[0]; }

/** A roach in from a gate, across a few turns of the wall, out at another gate. @param {string} kindId @param {any} [from] @param {any} [to] */
function spawnRoach(kindId,from,to){
  const kind=KINDS[kindId], a=from||gatePoint(), b=to||(kindId==='big'?{x:a.x<72?149:-5,y:10+Math.random()*66,crack:false}:farGate(a.x,a.y));
  const route=[]; const n=kindId==='big'?0:1+Math.floor(Math.random()*3);
  for(let k=0;k<n;k++) route.push({x:14+Math.random()*116,y:8+Math.random()*70});
  route.push(b);
  const r={id:state.nextId++,kind,x:a.x,y:a.y,a:Math.atan2(route[0].y-a.y,route[0].x-a.x),v:0,leg:Math.random()*6,route,ri:0,
    mode:'run',timer:30+Math.random()*90,fade:a.crack?0:1,leaving:false,flee:false,maim:false,pace:0.85+Math.random()*0.3};
  state.roaches.push(r); return r;
}
/** Scare roaches near a blow: they run for the nearest way out. @param {number} x @param {number} y @param {number} radius */
function scare(x,y,radius){
  for(const r of state.roaches){ if(r.leaving||Math.hypot(r.x-x,r.y-y)>radius) continue; r.flee=true; r.mode='run'; r.route=[nearGate(r.x,r.y)]; r.ri=0; }
}
/** One tick of a roach: run its route in bursts, stop now and then, slip into its crack at the end. @param {any} r @param {number} speed */
function runRoach(r,speed){
  const K=r.kind;
  if(r.leaving){ r.fade-=0.07; r.v*=0.8; r.x+=Math.cos(r.a)*r.v; r.y+=Math.sin(r.a)*r.v; return r.fade>0; }
  if(r.fade<1) r.fade=Math.min(1,r.fade+0.06);
  if(r.mode==='stop'){ r.v*=0.55; if(--r.timer<=0){ r.mode='run'; r.timer=30+Math.random()*100; } return true; }
  const T=r.route[r.ri], want=Math.atan2(T.y-r.y,T.x-r.x);
  let da=want-r.a; while(da>Math.PI) da-=Math.PI*2; while(da<-Math.PI) da+=Math.PI*2;
  const turn=K.id==='big'?0.07:K.id==='nymph'?0.26:0.16;
  r.a+=Math.max(-turn,Math.min(turn,da))+(vnoise(state.ticks*0.08,r.id*3.7)-0.5)*K.wiggle+(K.id==='nymph'?Math.sin(state.ticks*0.31+r.id)*0.12:0);
  const vt=K.speed*speed*r.pace*(r.flee?1.7:1)*(r.maim?0.45:1)*(Math.abs(da)>1.2?0.5:1);
  r.v+=(vt-r.v)*0.15; r.x+=Math.cos(r.a)*r.v; r.y+=Math.sin(r.a)*r.v; r.leg+=r.v*1.35;
  if(r.maim) r.a+=Math.sin(state.ticks*0.5+r.id)*0.08;
  const last=r.ri===r.route.length-1;
  if(!last&&r.y>WALL_Y1-2) r.y=WALL_Y1-2;
  if(Math.hypot(T.x-r.x,T.y-r.y)<(last&&T.crack?1.4:2.6)){ if(!last) r.ri++; else if(T.crack){ r.leaving=true; return true; } }
  if(last&&!T.crack&&(r.x<-6||r.x>150||r.y<-6||r.y>WALL_Y1+4)) return false;
  if(!r.flee&&!r.maim&&--r.timer<=0){ if(Math.random()<K.stop){ r.mode='stop'; r.timer=12+Math.random()*36; } else r.timer=30+Math.random()*90; }
  return true;
}
/** Keep roaches coming: more of them as the tallow burns down, a line out of the carving, sometimes a swarm. @param {any} p */
function spawnTick(p){
  const T=sessionLen(), live=state.roaches.filter(r=>!r.leaving).length;
  for(const q of state.queue) q.t--; const due=state.queue.filter(q=>q.t<=0); state.queue=state.queue.filter(q=>q.t>0);
  for(const q of due) spawnRoach(q.kind,q.from,q.to);
  if(state.ticks===state.swarmAt){ const c=CRACKS[Math.floor(Math.random()*CRACKS.length)], n=10+Math.floor(Math.random()*5);
    for(let k=0;k<n;k++) state.queue.push({t:k*4+Math.random()*3,kind:Math.random()<0.6?'prusak':p.kinds.includes('nymph')?'nymph':'prusak',from:{x:c.x,y:c.y,crack:true},to:gatePoint(false)}); }
  const cap=state.ending?12:Math.max(1,Math.round(p.max*(0.4+0.6*Math.min(1,state.ticks/(T*0.7)))));
  if(live>=cap) return;
  if(--state.spawnT>0&&live>0) return;
  state.spawnT=state.ending?6:35+Math.random()*80;
  const kind=pickKind(p.kinds);
  if(kind==='prusak'&&state.ticks>1200&&Math.random()<0.12){ for(let k=0;k<3;k++) state.queue.push({t:k*14,kind,from:{...NAME_HOLE,crack:true},to:undefined}); return; }   // out of the carved O
  spawnRoach(kind);
}

/* ---------- the punch ---------- */

/** The knuckles meet the wall at the shadow: squash what is under them or hurt the hand. */
function contact(){
  const x=state.sx, y=state.sy;
  let killed=0, hurt=0, best='';
  sessionMetric('strikes');
  for(const r of state.roaches){ if(r.leaving||r.fade<0.5) continue; const c=roachContact(x,y,r); if(!c) continue;
    if(c==='clean'||r.maim){ killRoach(r,c==='clean'&&!r.maim); killed++; if(c==='clean') best='clean'; else if(!best) best='graze'; }
    else { r.maim=true; r.flee=true; r.route=[nearGate(r.x,r.y)]; r.ri=0; if(!best) best='graze'; } }
  state.roaches=state.roaches.filter(r=>!r.dead);
  if(best){
    hurt=HIT_PAIN[best==='clean'?'clean':'graze']; addPain(hurt); state.missed=false; state.t=0; state.phase='stop';
    if(killed){ state.combo++; state.best=Math.max(state.best,state.combo); if(state.combo%5===0){ sessionAddTime(2); flash('+2 S'); state.feedback='Pięć z rzędu bez pudła — łój pali się dłużej (+2 s).'; } else state.feedback=best==='clean'?'Czysto.':'Dobity.'; }
    else state.feedback='Draśnięty — kuleje do szpary. Dobij go.';
    sfxSquash(killed?1:0.6); wallGoo(x,y,killed?5:2); shake(1,4,1); scare(x,y,18);
  } else {
    const surf=surfaceAt(x,y), m=missCost(surf,state.pain); addPain(m.pain-state.pain);
    state.cool=state.coolMax=m.cool; state.missed=true; state.combo=0; state.misses++; state.t=0; state.phase='stop';
    sessionMetric('misses'); sfxKnuckle(surf); sfxHiss(state.pain); chipWall(x,y); wallDust(x,y,surf===SURFACE.iron?4:12);
    if(state.pain>=60) bloodWall(x,y);
    shake(surf===SURFACE.iron?3:2,surf===SURFACE.iron?12:8,surf===SURFACE.iron?0:1); scare(x,y,24);
    state.feedback=(surf===SURFACE.iron?'W żelazne ucho! ':surf===SURFACE.brick?'Gołe kostki na cegle. ':'Kostki na wapnie. ')+'Ręka drży — chwila przerwy.';
  }
  setInfo();
}
/** A roach is squashed where it ran. @param {any} r @param {boolean} clean */
function killRoach(r,clean){
  r.dead=true; const pts=killPoints(r.kind,r.v);
  state.kills++; sessionMetric('kills'); sessionMetric('points',pts);
  if(clean){ state.clean++; sessionMetric('clean'); }
  if(pts>r.kind.pts){ state.moving++; sessionMetric('moving'); }
  state.splats.push({x:r.x,y:r.y,a:r.a,kind:r.kind,age:0,seed:(r.id*13.7)%31});
}
/** @param {number} d */
function addPain(d){
  state.pain=Math.max(0,Math.min(100,state.pain+d));
  if(state.pain>state.painMax){ sessionMetric('painMax',state.pain-state.painMax); state.painMax=state.pain; }
}
/** @param {string} text */
function flash(text){ state.flash=text; state.flashT=70; }

/** The punch's progress for the picture: 0 at the chin … 1 on the wall. */
function reach(){
  if(state.phase==='out') return Math.pow((state.t+1)/OUT_T,1.6);
  if(state.phase==='stop') return 1;
  if(state.phase==='back') return 1-Math.pow(state.t/BACK_T,0.7);
  return 0;
}

/* ---------- the tick ---------- */

/** One simulation step of the wall. */
export function roachTick(){
  if(!state.on) return;
  const p=params(), S=state;
  if(S.flashT>0) S.flashT--;
  if(S.ending){ S.endT++; S.lampK=Math.max(0,1-S.endT/90); if(S.endT===150&&S.knock) sfxGaol(3); }
  if(S.phase==='stop'&&S.t<(S.missed?STOP_MISS:STOP_HIT)){ S.t++; if(S.t>=(S.missed?STOP_MISS:STOP_HIT)){ S.phase='back'; S.t=0; } roachWallTick({pain:S.pain,lampK:S.lampK}); return; }   // the world holds still at the blow
  S.ticks++;
  const kx=S.keys.r-S.keys.l, ky=S.keys.d-S.keys.u;
  if(kx||ky){ S.keyV=Math.min(2.6,(S.keyV||0.8)+0.06); const l=Math.hypot(kx,ky); roachAim(S.aim.x+kx/l*S.keyV,S.aim.y+ky/l*S.keyV); } else S.keyV=0;
  const H=S.hand, follow=S.phase==='aim'||S.phase==='cool';
  if(follow){ const k=0.21*(0.9+0.1*Math.max(0.8,Math.min(1.6,boxing.STATS.speed||1))); H.vx+=(S.aim.x-H.x)*k; H.vy+=(S.aim.y-H.y)*k; H.vx*=0.62; H.vy*=0.62; H.x+=H.vx; H.y+=H.vy; }
  const shakeK=S.phase==='cool'?S.cool/S.coolMax:0, amp=3*smooth(20,100,S.pain)+2.5*shakeK, fast=S.pain>=90?0.55:0.21;
  S.tremX=(vnoise(S.ticks*fast,1.3)-0.5)*2*amp+(vnoise(S.ticks*0.03,8)-0.5)*0.9; S.tremY=(vnoise(S.ticks*fast+40,4.1)-0.5)*2*amp+Math.sin(S.ticks*0.035)*0.5+shakeK*shakeK*6;
  if(S.phase==='out'){ S.t++; if(S.t>=OUT_T) contact(); }
  else if(S.phase==='back'){ S.t++; if(S.t>=BACK_T){ H.x=S.sx; H.y=S.sy; H.vx=H.vy=0;
    if(S.missed){ S.phase='cool'; } else { S.phase='aim'; if(S.buffered){ S.buffered=false; roachStrike(); } } } }
  else if(S.phase==='cool'){ if(--S.cool<=0){ S.phase='aim'; S.feedback='Ręka znowu słucha.'; setInfo(); } }
  S.pain=Math.max(0,S.pain-(++S.rest>60?PAIN_REST:PAIN_FADE));
  for(const s of S.splats) s.age++;
  const speed=p.speed;
  S.roaches=S.roaches.filter(r=>runRoach(r,speed));
  spawnTick(p);
  sounds();
  roachWallTick({pain:S.pain,lampK:S.lampK});
}

/** Legs on lime, the heart, the wick, the gaol beyond the wall. */
function sounds(){
  const S=state, moving=S.roaches.filter(r=>!r.leaving&&r.v>0.15);
  if(moving.length&&Math.random()<0.05+0.03*moving.length){ const r=moving[Math.floor(Math.random()*moving.length)]; sfxSkitter(Math.max(-1,Math.min(1,(r.x-72)/72)),(0.04+0.012*Math.min(10,moving.length))*(r.kind.id==='big'?1.6:1)); }
  if(S.pain>=60){ if(--S.beatT<=0){ S.beatT=Math.round(52-0.2*(S.pain-60)); sfxHeart(0.4+0.6*(S.pain-60)/40); S.pulse=1; } }
  S.pulse*=0.93;
  if(Math.random()<0.004*S.lampK) sfxCrackle();
  if(S.pain>=40&&S.ticks%Math.round(150-S.pain)===0) sfxBreath();
  if(--S.gaolT<=0){ sfxGaol(Math.random()<0.55?0:Math.random()<0.6?1:2); S.gaolT=400+Math.random()*900; }
}

/** The session ran out: the lamp gutters, the dark fills with legs; a grade S gets an answer through the wall. */
function endLamp(){ state.ending=true; state.endT=0; state.phase='aim'; state.knock=session.last?.grade==='S'; roachKeysOff(); }

/** Extra summary rows. @param {any} r */
function summaryExtra(r){
  const S=state, line=S.painMax>=80?'Kostki starte do krwi. Ściana pamięta.':S.misses===0&&S.kills>0?'Ani jednego pudła. Robactwo uczy się ciebie bać.':S.kills>=(params().goal||12)?'Ściana lepi się od tego, co z nich zostało.':'Uciekły w szpary. Wrócą w nocy.';
  void r;
  return '<span>Karaluchy</span><span>zabite '+S.kills+' (czysto '+S.clean+', w biegu '+S.moving+') · pudła '+S.misses+' · najdłuższa seria '+S.best+' · ból maks. '+Math.round(S.painMax)+'</span><span></span><span><i>'+line+'</i></span>';
}

/* ---------- picture and words ---------- */

/** Render the wall with the shadow, the roaches, the stains and the fist in flight. */
export function renderRoaches(){
  setFramebuffer(renderer.FB_MAIN);
  const S=state, e=reach(), fly=S.phase==='out'||S.phase==='stop'||S.phase==='back';
  const ax=fly?S.sx:S.hand.x+S.tremX, ay=fly?S.sy:S.hand.y+S.tremY;
  const F0=FIST_FROM, fist=fly?{x:ax+(F0.x-ax)*(1-e),y:ay+(F0.y-ay)*(1-e),s:1+2.4*(1-e),a:1}:null;
  const ghost=S.phase==='out'&&S.t>0?(()=>{ const e0=Math.pow(S.t/OUT_T,1.6); return {x:ax+(F0.x-ax)*(1-e0),y:ay+(F0.y-ay)*(1-e0),s:1+2.4*(1-e0),a:0.35}; })():null;
  renderRoachWall({shadow:{x:ax,y:ay,ox:1.2*e,oy:-0.8*e,s:1.5-0.5*e,blur:1.1-0.8*e},roaches:S.roaches,splats:S.splats,fist,ghost,pain:S.pain,pulse:S.pulse});
  if(S.flashT>0&&(S.flashT>14||S.flashT&2)) drawText(S.flash,72,4,appearance.C_SPARK,1);
}

/** The DOM lines under the picture. */
export function roachInfo(){
  const S=state;
  input.infoEl.textContent='KARALUCHY NA ŚCIANIE · zabite '+S.kills+' (czysto '+S.clean+') · seria '+S.combo+' · najlepsza '+S.best+(S.pain>=30?' · ból '+(S.pain>=90?'nie do zniesienia':S.pain>=60?'mocny':'pulsuje'):'');
  input.livesEl.textContent='';
  input.nextEl.textContent=S.feedback+' · mysz / strzałki — cień · klik / Spacja — cios · '+statShort()+' · Esc — wróć do celi';
}

/** Map a pointer on the screen canvas to native picture pixels. @param {PointerEvent} e */
function pointerAt(e){
  const cv=/** @type {HTMLCanvasElement} */ (document.getElementById('screen')), r=cv.getBoundingClientRect(), k=cv.width/(cv.clientWidth||1);
  return screenToView((e.clientX-r.left)*k,(e.clientY-r.top)*k);
}

export function initialize(){
  const stage=renderer.stage;
  stage.addEventListener('pointermove',e=>{ if(boxing.gstate!=='roach') return; const [x,y]=pointerAt(e); roachAim(x,y); });
  stage.addEventListener('pointerdown',e=>{ if(boxing.gstate!=='roach') return; const [x,y]=pointerAt(e); roachAim(x,y); if(e.pointerType==='mouse'&&e.button===0) roachStrike(); });
  stage.addEventListener('pointerup',e=>{ if(boxing.gstate!=='roach'||e.pointerType==='mouse') return; roachStrike(); });   // touch: drag to aim, lift to punch
  addEventListener('blur',roachKeysOff);
}

````

---

## `src/roach-scene.js`

````js
/* The roach wall: the Ward's back wall over the guard-bed, seen from the hero's eyes (native 144×96). Soot-black brick
   in English bond under flaking limewash, GOD HELP ME scratched into it with tallies and a cross, cracks where the
   mortar has gone, an iron ring for the chains and its rust, damp rising from the bed; the bed's planks along the
   bottom. A tallow lamp stands on the bed behind him, low on the left: it rakes the wall, flickers a little and lays
   his shoulder and the shadow of his fist on the lime. The light is mood only and never changes what can be seen.
   The wall is a height field relit every frame; roaches, squashed bodies, the fist and the dust take the same light.
   The fist itself comes into the picture only while it is thrown. */

import { state as appearanceState, rgb } from './appearance.js';
import { state as rendererState } from './renderer.js';
import { state as boxingState, h2 } from './boxing.js';
import { vnoise, fbm } from './noise.js';
import { SURFACE } from './roach-rules.js';

/** The wall's rows end here; below lies the guard-bed. */
export const WALL_Y1 = 84;
/** Cracks in the wall where roaches come out and go in. */
export const CRACKS = [{x:15,y:38,r:2.4},{x:57,y:9,r:2},{x:79,y:71,r:2.6},{x:129,y:41,r:2.3},{x:101,y:25,r:1.9}];
/** The iron ring for the chains (its plate; the ring hangs below it). */
export const RING = {x:116,y:56};
/** GOD HELP ME, scratched at twice the font size; prusaks sometimes crawl out of the hollow of its O. */
const CARVE = {x:23,y:12,text:'GOD HELP ME'};
export const NAME_HOLE = {x:CARVE.x+8+2,y:CARVE.y+4};
const NAIL = {x:34,y:47};
/** The lamp behind him on the bed, in wall pixels (z towards the viewer). */
const LAMP = {x:-58,y:74,z:112};
const GAIN = 2.25, FALL2 = 1/(150*150), AMB = [0.085,0.098,0.105], WARM = [1,0.72,0.44];
/** Where the shadow of his right shoulder lies, and where the thrown fist comes from (off the picture). */
const SHOULDER = {dx:20,dy:4,rx:34,ry:24};
/** Where the thrown fist comes from: his right shoulder, below the picture. */
export const FIST_FROM = {x:124,y:142};
/** The shoulder's shadow below the picture, the upper arm and the forearm (wall pixels): the arm comes up from below,
 * straightens as the fist goes higher and folds at the elbow as it comes down. */
const ARM = {x:100,y:124,upper:50,fore:46};
const K_LIME=0, K_BRICK=1, K_MORTAR=2, K_IRON=3, K_CRACK=4, K_GROOVE=5, K_BED=6;

/** Baked maps of the wall, the light of this frame and the small life on it. */
export const state = {
  /** @type {Float32Array} */ alb:new Float32Array(0), /** @type {Float32Array} */ hgt:new Float32Array(0),
  /** @type {Float32Array} */ nrm:new Float32Array(0), /** @type {Uint8Array} */ kind:new Uint8Array(0),
  /** @type {Float32Array} */ wet:new Float32Array(0), /** @type {Float32Array} */ lam:new Float32Array(0),
  /** @type {Float32Array} */ shade:new Float32Array(0), /** @type {Float32Array} */ col:new Float32Array(0),
  /** @type {Float32Array} */ vign:new Float32Array(0),
  t:0, lx:LAMP.x, ly:LAMP.y, I:1, lampK:1, breathT:90,
  /** @type {{x:number,y:number,vx:number,vy:number,age:number,life:number,c:number[],goo:boolean}[]} */ parts:[],
  /** @type {{x:number,y:number,age:number,life:number,vx:number}[]} */ puffs:[],
  /** @type {{x:number,y:number,ph:number}[]} */ motes:[],
};

/* ---------- small helpers ---------- */

/** @param {string} hex @returns {number[]} linear-ish 0..1 colour */
const C3 = (hex)=>{ const c=rgb(hex); return [(c&255)/255,((c>>8)&255)/255,((c>>16)&255)/255]; };
/** @param {number[]} a @param {number[]} b @param {number} k */
const mix3 = (a,b,k)=>[a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k,a[2]+(b[2]-a[2])*k];
/** @param {number[]} a @param {number} k */
const mul3 = (a,k)=>[a[0]*k,a[1]*k,a[2]*k];
/** @param {number} a @param {number} b @param {number} x */
function smooth(a,b,x){ const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); }
const clamp01 = (/** @type {number} */ v)=>v<0?0:v>1?1:v;
/** @param {number} v 0..1 → 0..255 */
const to8 = (v)=>v<=0?0:v>=1?255:Math.round(v*255);

const P = {
  brick:['#5e3c2e','#6a4433','#54382c','#714a37','#4a3328'].map(C3), mortar:C3('#5d564a'), lime:C3('#a59f8b'), limeOld:C3('#948a72'),
  grime:C3('#1b1611'), damp:C3('#28301f'), salt:C3('#c9c5b4'), crack:C3('#0a0806'), iron:C3('#2c2925'), rust:C3('#6c3818'), rustD:C3('#46220f'),
  groove:C3('#3a2a22'), grooveL:C3('#7d6a58'), wood:C3('#4b3a28'), woodL:C3('#64503a'), woodD:C3('#2a2016'), straw:C3('#9c8752'),
  chip:C3('#d9d3c2'), blood:C3('#5c1410'), bloodW:C3('#7a1c14'), goo:C3('#cdbb8a'), gooD:C3('#7c6c48'), gut:C3('#3a2414'),
  skin:C3('#a07458'), knuck:C3('#a3422f'), cloth:C3('#4a3c2c'), clothD:C3('#33291d'),
};

/** Which surface the fist meets at a point of the wall. @param {number} x @param {number} y @returns {number} */
export function surfaceAt(x,y){
  const w=appearanceState.W, xi=Math.max(0,Math.min(w-1,Math.round(x))), yi=Math.max(0,Math.min(WALL_Y1-1,Math.round(y)));
  const k=state.kind[yi*w+xi];
  return k===K_BRICK?SURFACE.brick:k===K_IRON?SURFACE.iron:k===K_MORTAR||k===K_CRACK?SURFACE.mortar:SURFACE.lime;
}

/* ---------- the wall, baked ---------- */

/** Brick, mortar and limewash at a pixel: colour, height, surface, wetness. @param {number} x @param {number} y
 * @returns {[number[],number,number,number]} */
function wallPx(x,y){
  const course=Math.floor(y/8), ry=y-course*8, stretch=(course&1)===0, L=stretch?24:12, off=stretch?((course>>1)&1)*12+3:9;
  const u=x+off, bx=Math.floor(u/L), fx=u-bx*L, joint=ry===7||fx===0, id=h2(bx*3+course*7+11,course*5+3);
  const ex=Math.min(fx,L-fx)-0.5, ey=Math.min(ry+1,7-ry)-0.5, e=Math.min(ex,ey);
  let c, h, k, wet=0;
  if(joint){ c=mul3(P.mortar,0.85+0.3*vnoise(x*0.9,y*0.9)); h=0.3+0.2*vnoise(x*0.7+3,y*0.7); k=K_MORTAR; }
  else {
    c=mul3(P.brick[id%5],0.88+((id>>3)&15)/15*0.22); k=K_BRICK;
    h=1-0.38*(1-smooth(0,1.1,e))-0.12*vnoise(x*0.6+id,y*0.7)-(vnoise(x*0.7+id,y*0.8)>0.78?0.22:0);
    const cx=fx<L/2?fx:L-fx, cy=ry<4?ry+1:7-ry;
    if(h2(id,bx+1)<34&&fx<L/2===(h2(id,5)&1)>0&&ry<4===(h2(id,6)&1)>0&&cx<3.2&&cy<2.6&&cx+cy<4.4){ h-=0.45; c=mix3(c,C3('#7a5a46'),0.35); }   // a broken arris
    c=mix3(c,P.grime,0.25*vnoise(x*0.3+id,y*0.5));
  }
  const limeN=vnoise(x*0.05+2,y*0.068)*0.7+vnoise(x*0.18,y*0.21+4)*0.3;
  if(limeN>0.41){
    const lip=limeN<0.445;
    c=mix3(P.lime,P.limeOld,vnoise(x*0.12+7,y*0.15)); c=mix3(c,P.grime,0.16*vnoise(x*0.5,y*0.5+9)+(lip?0.3:0)+(joint?0.22:0));   // the coat follows the bricks; dirt sits in the joints
    h=0.55*h+0.62+0.06*vnoise(x*0.45,y*0.45)+(lip?0.18:0); k=K_LIME;   // the coat fills the joints half-way
  } else if(limeN>0.37&&vnoise(x*0.8+2,y*0.8)>0.55) c=mix3(c,P.lime,0.55);                   // specks of lime left in the pits
  if(y<28) c=mix3(c,P.grime,0.55*(1-y/28)**1.5);                                                    // soot under the vault
  const run=vnoise(x*0.16+5,y*0.02+1.7); if(run>0.66) c=mix3(c,P.damp,Math.min(0.45,(run-0.66)*2.4));   // damp running down
  const tide=64+5*vnoise(x*0.07,1.3);
  if(y>tide){ c=mix3(mul3(c,0.8),P.damp,0.22); wet=0.18+0.14*vnoise(x*0.3,y*0.3); }                // rising damp from the bed
  if(Math.abs(y-tide)<1.3) c=mix3(c,P.salt,0.4*(1-Math.abs(y-tide)/1.3));                           // its salt line
  c=mul3(c,0.86+0.2*fbm(x*0.08+3,y*0.08));
  return [c,h,k,wet];
}

/** The guard-bed's planks at the bottom, edge-on from where he kneels. @param {number} x @param {number} y @returns {number[]} */
function bedPx(x,y){
  if(y===WALL_Y1) return mul3(P.woodD,0.35);                                                        // the black gap at the wall
  const b=y<87?0:y<91?1:2, top=[85,87,91][b], g=vnoise(x*0.05+b*9,(y-top)*1.4+b*3);
  let c=mix3(P.wood,P.woodL,g*0.8); if(y===top) c=mul3(P.woodD,0.8);
  if(h2(Math.floor(x/3)+b*50,b)<26&&((x+y*2)%5)<2) c=mix3(c,P.straw,0.7);                          // straw off the pallets
  return mul3(c,0.8+0.25*fbm(x*0.1,y*0.6+b));
}

/** Scratch a 1-px groove from (x0,y0) to (x1,y1) through the lime. @param {number} x0 @param {number} y0 @param {number} x1 @param {number} y1 @param {number} depth */
function groove(x0,y0,x1,y1,depth){
  const n=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)*1.5)), w=appearanceState.W;
  for(let s=0;s<=n;s++){ const x=Math.round(x0+(x1-x0)*s/n), y=Math.round(y0+(y1-y0)*s/n); if(x<0||y<0||x>=w||y>=WALL_Y1) continue;
    const i=y*w+x; if(state.kind[i]===K_GROOVE) continue;
    const lime=state.kind[i]===K_LIME; state.hgt[i]-=depth; state.kind[i]=K_GROOVE;
    setAlb(i,lime?mix3(P.groove,P.brick[h2(x,y)%5],0.4):P.grooveL); }
}
/** @param {number} i @param {number[]} c */
function setAlb(i,c){ state.alb[i*3]=c[0]; state.alb[i*3+1]=c[1]; state.alb[i*3+2]=c[2]; }
/** @param {number} i @returns {number[]} */
const getAlb = (i)=>[state.alb[i*3],state.alb[i*3+1],state.alb[i*3+2]];

/** GOD HELP ME at twice the font size, its strokes joined, and the dates, tallies and a cross by other hands. */
function carvings(){
  const FONT=boxingState.FONT;
  /** @param {string} s @param {number} x0 @param {number} y0 @param {number} sc */
  const write=(s,x0,y0,sc)=>{ for(let k=0;k<s.length;k++){ const g=FONT[s.charCodeAt(k)]; if(!g) continue; const on=(/** @type {number} */ q,/** @type {number} */ r)=>q>=0&&q<3&&r>=0&&r<5&&!!(g&(1<<(14-(r*3+q))));
    const px=(/** @type {number} */ q)=>x0+k*4*sc+q*sc+(h2(k,q)&1)*0.4, py=(/** @type {number} */ r)=>y0+r*sc+(h2(k+9,r)&1)*0.4;
    for(let r=0;r<5;r++) for(let q=0;q<3;q++){ if(!on(q,r)) continue; groove(px(q),py(r),px(q),py(r),0.55);
      if(on(q+1,r)) groove(px(q),py(r),px(q+1),py(r),0.55); if(on(q,r+1)) groove(px(q),py(r),px(q),py(r+1),0.55);
      if(!on(q+1,r)&&!on(q,r+1)&&on(q+1,r+1)) groove(px(q),py(r),px(q+1),py(r+1),0.55); if(!on(q-1,r)&&!on(q,r+1)&&on(q-1,r+1)) groove(px(q),py(r),px(q-1),py(r+1),0.55); } } };
  write(CARVE.text,CARVE.x,CARVE.y,2); write('W.H. 1867',10,66,1);
  for(let m=0;m<13;m++){ const g=Math.floor(m/5), q=m%5, x=84+g*12+q*2; if(q<4) groove(x,33,x+0.4,42,0.5); else groove(x-9,40,x+1,34,0.5); }   // tallies in fives
  groove(121,15,121,27,0.6); groove(117,19,125,19,0.6);                                                       // a cross
}

/** Holes where the mortar has gone: deep, black, a crumbling rim, a hairline running off. */
function cracks(){
  const w=appearanceState.W;
  for(const [n,c] of [...CRACKS,{...NAME_HOLE,r:1.1}].entries()){
    for(let y=Math.floor(c.y-c.r-3);y<=c.y+c.r+3;y++) for(let x=Math.floor(c.x-c.r-4);x<=c.x+c.r+4;x++){ if(x<0||y<0||x>=w||y>=WALL_Y1) continue;
      const dx=x+0.5-c.x, dy=(y+0.5-c.y)*1.3, d=Math.hypot(dx,dy), r=c.r*(0.75+0.5*vnoise(Math.atan2(dy,dx)*1.6+n*5,n*3.1)), i=y*w+x;
      if(d<r){ state.kind[i]=K_CRACK; state.hgt[i]=-1.8+d/r; setAlb(i,mix3(P.crack,P.mortar,0.15*d/r)); }
      else if(d<r+1.3&&state.kind[i]!==K_GROOVE){ state.kind[i]=K_MORTAR; state.hgt[i]=Math.min(state.hgt[i],0.25); setAlb(i,mul3(P.mortar,0.75)); } }
    if(c.r<1.5) continue;
    let x=c.x, y=c.y, a=h2(n,7)/255*6.28;
    for(let s=0;s<14+h2(n,8)%10;s++){ a+=(h2(n*31+s,9)/255-0.5)*0.9; const nx=x+Math.cos(a)*1.4, ny=y+Math.sin(a)*1.4; groove(x,y,nx,ny,0.4); x=nx; y=ny; }
  }
}

/** The iron ring on its plate, the old nail, and the rust that ran down from both. */
function ironwork(){
  const w=appearanceState.W, R=RING, cy=R.y+8;
  for(let y=R.y-6;y<WALL_Y1;y++) for(let x=R.x-8;x<=R.x+8;x++){ const i=y*w+x;
    const ax=Math.abs(x+0.5-R.x), ay=Math.abs(y+0.5-R.y), dr=Math.hypot(x+0.5-R.x,(y+0.5-cy)/0.86), tube=Math.abs(dr-5.2);
    if(ax<4.2&&ay<3.8){ const bev=Math.min(4.2-ax,3.8-ay); state.kind[i]=K_IRON; state.hgt[i]=1.6+Math.min(0.5,bev*0.4); let c=mul3(P.iron,0.9+0.2*vnoise(x*0.7,y*0.7)); if(vnoise(x*0.5+3,y*0.6)>0.6) c=mix3(c,P.rust,0.6); if((ax>2.4&&ax<3.2)&&(ay>1.6&&ay<2.4)) c=mul3(c,0.5); setAlb(i,c); state.wet[i]=0.25; }
    else if(tube<1.35&&y>R.y+2){ state.kind[i]=K_IRON; state.hgt[i]=2.2+Math.sqrt(1.35*1.35-tube*tube)*1.3; let c=mul3(P.iron,0.95); if(vnoise(x*0.6,y*0.4+2)>0.58) c=mix3(c,P.rust,0.55); setAlb(i,c); state.wet[i]=0.3; }
    else if(y>cy+5&&Math.abs(x+0.5-R.x-0.6*vnoise(y*0.1,3))<1.6+1.4*vnoise(x*0.4,y*0.05)){ const k=0.55*(1-(y-cy-5)/(WALL_Y1-cy-5)); setAlb(i,mix3(getAlb(i),P.rustD,k)); }
  }
  for(let y=NAIL.y-2;y<NAIL.y+12;y++) for(let x=NAIL.x-2;x<=NAIL.x+2;x++){ const i=y*w+x, d=Math.hypot(x+0.5-NAIL.x,y+0.5-NAIL.y);
    if(d<1.3){ state.kind[i]=K_IRON; state.hgt[i]=2.1-d*0.5; setAlb(i,mix3(P.iron,P.rust,0.3)); }
    else if(y>NAIL.y+1&&Math.abs(x+0.5-NAIL.x)<0.9) setAlb(i,mix3(getAlb(i),P.rustD,0.5*(1-(y-NAIL.y)/12))); }
}

/** Normals from the height field (the bed keeps its own). @param {number} x0 @param {number} y0 @param {number} x1 @param {number} y1 */
function normals(x0,y0,x1,y1){
  const w=appearanceState.W, H=state.hgt, N=state.nrm;
  for(let y=Math.max(0,y0);y<=Math.min(WALL_Y1-1,y1);y++) for(let x=Math.max(0,x0);x<=Math.min(w-1,x1);x++){ const i=y*w+x;
    const dx=H[y*w+Math.min(w-1,x+1)]-H[y*w+Math.max(0,x-1)], dy=H[Math.min(WALL_Y1-1,y+1)*w+x]-H[Math.max(0,y-1)*w+x];
    const nx=-dx*0.95, ny=-dy*0.95, l=Math.hypot(nx,ny,1); N[i*3]=nx/l; N[i*3+1]=ny/l; N[i*3+2]=1/l; }
}

/** Bake the wall for a new session: fresh lime, no stains. The renderer's buffer is untouched. */
export function buildRoachWall(){
  const w=appearanceState.W, h=appearanceState.H, N=w*h, S=state;
  S.alb=new Float32Array(N*3); S.hgt=new Float32Array(N); S.nrm=new Float32Array(N*3); S.kind=new Uint8Array(N); S.wet=new Float32Array(N);
  S.lam=new Float32Array(N); S.shade=new Float32Array(N); S.col=new Float32Array(N*3); S.vign=new Float32Array(N);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const i=y*w+x;
    if(y<WALL_Y1){ const [c,hh,k,wet]=wallPx(x,y); setAlb(i,c); S.hgt[i]=hh; S.kind[i]=k; S.wet[i]=wet; }
    else { setAlb(i,bedPx(x,y)); S.kind[i]=K_BED; }
    const vx=(x+0.5-70)/86, vy=(y+0.5-46)/62; S.vign[i]=1-0.62*smooth(0.35,1.25,Math.hypot(vx,vy)); }
  carvings(); cracks(); ironwork(); normals(0,0,w-1,WALL_Y1-1);
  S.t=0; S.lampK=1; S.parts=[]; S.puffs=[]; S.breathT=90;
  S.motes=Array.from({length:14},(_,k)=>({x:h2(k,1)/255*144,y:10+h2(k,2)/255*70,ph:k*1.7}));
}

/* ---------- marks the session leaves ---------- */

/** Lime knocked off by a missed punch: a pale fresh edge round a pit. @param {number} x @param {number} y */
export function chipWall(x,y){
  const w=appearanceState.W;
  for(let yy=Math.floor(y-3);yy<=y+3;yy++) for(let xx=Math.floor(x-4);xx<=x+4;xx++){ if(xx<0||yy<0||xx>=w||yy>=WALL_Y1) continue;
    const i=yy*w+xx, d=Math.hypot((xx+0.5-x)/1.3,yy+0.5-y), r=1.6+1.2*vnoise(xx*0.9+x,yy*0.9+y);
    if(d<r){ const lime=state.kind[i]===K_LIME; state.hgt[i]-=lime?0.35:0.15; setAlb(i,lime?mix3(P.brick[h2(xx,yy)%5],P.chip,0.25):mix3(getAlb(i),P.chip,0.18)); }
    else if(d<r+0.9&&state.kind[i]===K_LIME) setAlb(i,mix3(getAlb(i),P.chip,0.55)); }
  normals(Math.floor(x-6),Math.floor(y-5),Math.ceil(x+6),Math.ceil(y+5));
}
/** The knuckles' print in blood, four marks in a row, still wet. @param {number} x @param {number} y */
export function bloodWall(x,y){
  const w=appearanceState.W;
  for(const kx of [-4,-1.4,1.4,4]){ const cx=x+kx+(Math.random()-0.5)*0.6, cy=y-1+Math.abs(kx)*0.12;
    for(let yy=Math.floor(cy-1);yy<=cy+2;yy++) for(let xx=Math.floor(cx-1);xx<=cx+1;xx++){ if(xx<0||yy<0||xx>=w||yy>=WALL_Y1) continue;
      const i=yy*w+xx, d=Math.hypot(xx+0.5-cx,(yy+0.5-cy)*0.8+(yy>cy?-0.3:0)); if(d>1.25) continue;
      setAlb(i,mix3(getAlb(i),d<0.7?P.bloodW:P.blood,d<0.7?0.9:0.6)); state.wet[i]=Math.max(state.wet[i],0.7); } }
}
/** Lime dust and grit bursting from a missed punch. @param {number} x @param {number} y @param {number} n */
export function wallDust(x,y,n){
  for(let k=0;k<n;k++){ const a=Math.random()*6.28, v=0.3+Math.random()*0.9;
    state.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v*0.6-0.3,age:0,life:25+Math.random()*40,c:Math.random()<0.7?P.chip:P.mortar,goo:false}); }
}
/** Drops squirting from under the knuckles. @param {number} x @param {number} y @param {number} n */
export function wallGoo(x,y,n){
  for(let k=0;k<n;k++){ const a=Math.random()*6.28, v=0.6+Math.random()*1.1;
    state.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v*0.7,age:0,life:6+Math.random()*7,c:P.goo,goo:true}); }
}

/* ---------- the life in the scene ---------- */

/** One sim tick: lamp flicker, dust settling, drops sticking, breath in the cold. @param {{pain:number,lampK:number}} g */
export function roachWallTick(g){
  const S=state; if(!S.alb.length) return; S.t++;
  const t=S.t; S.lampK=g.lampK;
  S.I=1+0.11*(fbm(t*0.045,3.1)-0.5)+0.02*Math.sin(t*0.37)+(h2(t>>2,77)<6?-0.05:0);
  S.lx=LAMP.x+(fbm(t*0.03,7)-0.5)*2.6; S.ly=LAMP.y+(fbm(t*0.035,9)-0.5)*1.8;
  for(const p of S.parts){ p.age++; p.x+=p.vx; p.y+=p.vy;
    if(p.goo){ p.vx*=0.7; p.vy*=0.7; if(p.age>=p.life-1) gooDot(p.x,p.y); }
    else { p.vy+=0.045; p.vx*=0.96; if(p.y>=WALL_Y1+1+((p.x*7)%4)){ p.vy=0; p.vx=0; } } }
  S.parts=S.parts.filter(p=>p.age<p.life);
  if(--S.breathT<=0){ S.puffs.push({x:66+Math.random()*12,y:99,age:0,life:80,vx:(Math.random()-0.5)*0.12}); S.breathT=200-Math.min(120,g.pain*1.3)+Math.random()*40; }
  for(const p of S.puffs) p.age++; S.puffs=S.puffs.filter(p=>p.age<p.life);
  for(const m of S.motes){ m.x+=Math.sin(t*0.011+m.ph)*0.05+0.015; m.y+=Math.cos(t*0.009+m.ph)*0.04-0.008; if(m.x>146) m.x=-2; if(m.y<2) m.y=WALL_Y1-2; }
}
/** A drop that hit the wall stays as a wet speck. @param {number} x @param {number} y */
function gooDot(x,y){ const w=appearanceState.W, xi=Math.round(x), yi=Math.round(y); if(xi<0||yi<0||xi>=w||yi>=WALL_Y1) return; const i=yi*w+xi; setAlb(i,mix3(getAlb(i),P.goo,0.7)); state.wet[i]=Math.max(state.wet[i],0.6); }

/* ---------- shadows ---------- */

/** @param {number} px @param {number} py @param {number} hw @param {number} hh @param {number} r */
function sdBox(px,py,hw,hh,r){ const qx=Math.abs(px)-hw+r, qy=Math.abs(py)-hh+r; return Math.hypot(Math.max(qx,0),Math.max(qy,0))+Math.min(Math.max(qx,qy),0)-r; }
/** Tapered capsule a→b, radius ra→rb. @returns {[number,number]} distance and position t along it */
function sdCone(/** @type {number} */ px,/** @type {number} */ py,/** @type {number} */ ax,/** @type {number} */ ay,/** @type {number} */ bx,/** @type {number} */ by,/** @type {number} */ ra,/** @type {number} */ rb){
  const dx=bx-ax, dy=by-ay, t=clamp01(((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy||1));
  return [Math.hypot(px-ax-dx*t,py-ay-dy*t)-(ra+(rb-ra)*t),t]; }
/** Smooth union. @param {number} a @param {number} b @param {number} k */
function smin(a,b,k){ const h=clamp01(0.5+0.5*(b-a)/k); return b+(a-b)*h-k*h*(1-h); }
const KN = [[-4.1,-1.3],[-1.35,-1.7],[1.4,-1.7],[4.1,-1.25]];
/** The clenched fist seen from behind, around the knuckles' middle (local units). @param {number} px @param {number} py @returns {number} */
function sdFist(px,py){
  let d=sdBox(px,py-2.8,6.2,4.8,2.8);
  for(const [kx,ky] of KN) d=smin(d,Math.hypot(px-kx,py-ky)-1.75,0.9);
  d=smin(d,sdCone(px,py,-6.3,2,-4,6.4,2.1,2)[0],1.1);
  return d;
}

/** Where the arm's shadow runs to the fist: shoulder, elbow (kept outward and down), wrist. Out of reach the shoulder
 * comes after the fist, as he leans in. @param {number} wx @param {number} wy @param {number} t */
function armShadow(wx,wy,t){
  let sx=ARM.x+Math.sin(t*0.035)*1.2, sy=ARM.y+Math.sin(t*0.035)*1.6, dx=wx-sx, dy=wy-sy, d=Math.hypot(dx,dy)||1;
  const max=(ARM.upper+ARM.fore)*0.985;
  if(d>max){ sx=wx-dx/d*max; sy=wy-dy/d*max; dx=wx-sx; dy=wy-sy; d=max; }
  const a=(ARM.upper**2-ARM.fore**2+d*d)/(2*d), h=Math.sqrt(Math.max(0,ARM.upper**2-a*a)), bx=sx+dx*a/d, by=sy+dy*a/d, nx=-dy/d, ny=dx/d;
  const e1=[bx+nx*h,by+ny*h], e2=[bx-nx*h,by-ny*h], out=(/** @type {number[]} */ e)=>e[0]*0.8+e[1]*0.6, e=out(e1)>out(e2)?e1:e2;
  return {sx,sy,ex:e[0],ey:e[1]};
}

/** The shadows on the wall this frame: his shoulder low on the right (breathing), the arm bent at the elbow and the fist
 * at the aim. @param {any} V */
function shadows(V){
  const S=state, w=appearanceState.W, Sh=S.shade, sh=V.shadow, s=sh.s, blur=sh.blur, ax=sh.x+sh.ox, ay=sh.y+sh.oy;
  const wx=ax+0.8*s, wy=ay+6.5*s, A=armShadow(wx,wy,S.t), bx=A.sx+SHOULDER.dx, by=A.sy+SHOULDER.dy;
  const x0=Math.min(A.sx,A.ex,wx)-12, x1=Math.max(A.sx,A.ex,wx)+12, y0=Math.min(A.ey,wy)-12;
  for(let y=0;y<appearanceState.H;y++) for(let x=0;x<w;x++){ const i=y*w+x, px=x+0.5, py=y+0.5;   // the bed's planks take the arm too
    const e=Math.hypot((px-bx)/SHOULDER.rx,(py-by)/SHOULDER.ry); let v=0.55*(1-smooth(0.7,1.3,e));
    if(px>x0&&px<x1&&py>y0){
      const [du]=sdCone(px,py,A.sx,A.sy,A.ex,A.ey,8.5,6.2), [df]=sdCone(px,py,A.ex,A.ey,wx,wy,6,3.6*s), da=smin(du,df,2.5);
      if(da<blur*2+1) v=Math.max(v,0.8*smooth(blur+0.6,-blur-0.6,da)); }
    if(Math.abs(px-ax)<14*s&&Math.abs(py-ay)<12*s){ const df=sdFist((px-ax)/s,(py-ay)/s)*s; v=Math.max(v,0.95*smooth(blur+0.5,-blur-0.5,df)); }
    Sh[i]=v; }
}

/* ---------- light ---------- */

/** Relight the wall and the bed into the colour buffer; keep the lamp's reach per pixel for what is drawn on top. */
function lightWall(){
  const S=state, w=appearanceState.W, h=appearanceState.H, A=S.alb, N=S.nrm, H=S.hgt, col=S.col, I=S.I*S.lampK, amb=0.35+0.65*S.lampK;
  const a0=AMB[0]*amb, a1=AMB[1]*amb, a2=AMB[2]*amb;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const i=y*w+x, bed=y>=WALL_Y1;
    const pz=bed?(y-WALL_Y1)*7:H[i]*1.4, py=bed?WALL_Y1:y;
    const dx=S.lx-x, dy=S.ly-py, dz=LAMP.z-pz, d2=dx*dx+dy*dy+dz*dz, inv=1/Math.sqrt(d2);
    const nx=bed?0:N[i*3], ny=bed?-0.75:N[i*3+1], nz=bed?0.66:N[i*3+2];
    const ndl=Math.max(0,(nx*dx+ny*dy+nz*dz)*inv), lam=I/(1+d2*FALL2)*(1-S.shade[i]*0.92);
    S.lam[i]=lam; const l=lam*ndl*GAIN;
    let sp=0; const wt=S.wet[i];
    if(wt>0){ const hx=dx*inv, hy=dy*inv, hz=dz*inv+1, hl=Math.hypot(hx,hy,hz), nh=Math.max(0,(nx*hx+ny*hy+nz*hz)/hl); sp=wt*lam*1.5*nh**22; }
    col[i*3]=A[i*3]*(a0+l*WARM[0])+sp; col[i*3+1]=A[i*3+1]*(a1+l*WARM[1])+sp*0.82; col[i*3+2]=A[i*3+2]*(a2+l*WARM[2])+sp*0.6; }
}

/** Shade a small glossy dome (a roach's shell, a squashed body) at pixel i and blend it in.
 * @param {number} i @param {number} x @param {number} y @param {number[]} c @param {number} nx @param {number} ny @param {number} nz @param {number} gloss @param {number} a */
function shadeDot(i,x,y,c,nx,ny,nz,gloss,a){
  const S=state, dx=S.lx-x, dy=S.ly-y, dz=LAMP.z-2, inv=1/Math.hypot(dx,dy,dz), lam=S.lam[i]/(1-S.shade[i]*0.92)*(1-S.shade[i]*0.8);
  const ndl=Math.max(0,(nx*dx+ny*dy+nz*dz)*inv), l=lam*ndl*GAIN, amb=0.35+0.65*S.lampK;
  const hx=dx*inv, hy=dy*inv, hz=dz*inv+1, hl=Math.hypot(hx,hy,hz), nh=Math.max(0,(nx*hx+ny*hy+nz*hz)/hl), sp=gloss*lam*(0.9*nh**7+0.8*nh**40);
  const col=S.col;
  for(let k=0;k<3;k++){ const v=c[k]*(AMB[k]*amb+l*WARM[k])+sp*[1,0.84,0.62][k]; col[i*3+k]+=(v-col[i*3+k])*a; }
}
/** Darken the wall at pixel i (a contact shadow). @param {number} i @param {number} k */
function darken(i,k){ const c=state.col; c[i*3]*=1-k; c[i*3+1]*=1-k; c[i*3+2]*=1-k; }

/* ---------- roaches and what is left of them ---------- */

const RC = {black:{body:C3('#4a2c1c'),pron:C3('#2e1a10'),gloss:0.85}, prusak:{body:C3('#9a6a38'),pron:C3('#b48650'),gloss:0.55},
  nymph:{body:C3('#b08c62'),pron:C3('#9a7650'),gloss:0.4}, big:{body:C3('#7a3818'),pron:C3('#c09060'),gloss:0.7}};
/** Legs per side: root along the body (fraction of length), angle off the heading, length (× width) — front, middle, hind. */
const LEGS = [[0.2,1.0,0.55],[0.02,1.75,0.6],[-0.14,2.45,0.85]];

/** A roach: contact shadow, an oval shell with its shield and wing seam lit by the lamp, a soft gleam that slides as it
 * turns, legs rowing in two tripods, long feelers twitching. @param {any} r {x,y,a,v,leg,kind,fade,maim,id} */
function drawRoach(r){
  const S=state, w=appearanceState.W, K=r.kind, L=K.len, Wd=K.wid, ca=Math.cos(r.a), sa=Math.sin(r.a), col=RC[K.id], fade=r.fade??1;
  if(fade<=0.02) return;
  const dark=mul3(col.body,0.55);
  /** One sub-pixel dot of a leg or feeler. @param {number} x @param {number} y @param {number} a */
  const put=(x,y,a)=>{ const xi=Math.floor(x), yi=Math.floor(y); if(xi<0||yi<0||xi>=w||yi>=WALL_Y1) return; shadeDot(yi*w+xi,x,y,dark,0,0,1,0,a*fade); };
  /** A thin line of dots. @param {number} x0 @param {number} y0 @param {number} x1 @param {number} y1 @param {number} a */
  const line=(x0,y0,x1,y1,a)=>{ const n=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)*1.4)); for(let k=1;k<=n;k++) put(x0+(x1-x0)*k/n,y0+(y1-y0)*k/n,a); };
  const R=Math.ceil(L*0.5+2);
  for(let y=Math.floor(r.y-R);y<=r.y+R;y++) for(let x=Math.floor(r.x-R);x<=r.x+R;x++){ if(x<0||y<0||x>=w||y>=WALL_Y1) continue;
    const dx=x+0.5-r.x-0.8, dy=y+0.5-r.y+0.6, a=dx*ca+dy*sa, c=-dx*sa+dy*ca, q=(a/(L*0.52))**2+(c/(Wd*0.58))**2;
    if(q<1) darken(y*w+x,0.42*(1-q)*fade); }                                                      // the lamp is low on the left: shadow up-right
  const run=r.v>0.05, legs=r.maim?[0,2,4]:[0,1,2,3,4,5];
  for(const n of legs){ const [la,an,ln]=LEGS[n%3], s=n<3?1:-1, tri=(n%3===1)===(s>0);   // tripods: front+hind of one side with the middle of the other
    const sw=run?Math.sin(r.leg+(tri?0:Math.PI))*0.35:0, ang=r.a+s*(an+sw*(n%3===2?-1:1)), rx=r.x+ca*la*L+(-sa*s)*Wd*0.35, ry=r.y+sa*la*L+(ca*s)*Wd*0.35;
    const lg=ln*Wd+1.2, kx=rx+Math.cos(ang)*lg*0.55, ky=ry+Math.sin(ang)*lg*0.55, a2=ang-s*0.5*(n%3===0?-1:1), fx=kx+Math.cos(a2)*lg*0.6, fy=ky+Math.sin(a2)*lg*0.6;
    line(rx,ry,kx,ky,0.55); line(kx,ky,fx,fy,0.4); }
  for(let y=Math.floor(r.y-R);y<=r.y+R;y++) for(let x=Math.floor(r.x-R);x<=r.x+R;x++){ if(x<0||y<0||x>=w||y>=WALL_Y1) continue;
    const dx=x+0.5-r.x, dy=y+0.5-r.y, a=(dx*ca+dy*sa)/(L*0.5), c=(-dx*sa+dy*ca)/(Wd*0.5)*(a>0.3?1+(a-0.3)*0.6:1), q=a*a+c*c;
    if(q>=1.15) continue; const cov=clamp01((1.15-q)*Math.min(L,Wd*2)*0.55);
    const pron=a>0.36;
    let base=pron?col.pron:col.body;
    if(K.id==='prusak'&&pron&&Math.abs(Math.abs(c)-0.3)<0.15) base=mul3(col.body,0.5);           // two dark bars on the shield
    if(K.id==='big'&&pron&&Math.hypot(a-0.62,c)<0.22) base=mul3(col.body,0.7);                   // the dark heart of its pale shield
    if(!pron&&Math.abs(c)<0.1&&a<0.3) base=mul3(base,0.72);                                       // where the wings meet
    if(Math.abs(a-0.36)<0.07) base=mul3(base,0.8);                                                // the shield's rim
    const nz=Math.sqrt(Math.max(0.05,1-Math.min(1,q))), lx=a*0.75, ly=c*0.75, nx=lx*ca-ly*sa, ny=lx*sa+ly*ca, nl=Math.hypot(nx,ny,nz)||1;
    shadeDot(y*w+x,x+0.5,y+0.5,base,nx/nl,ny/nl,nz/nl,col.gloss,cov*(K.id==='nymph'?0.75:1)*fade); }
  const tw=Math.sin(S.t*0.35+r.id)*0.18+(run?0:Math.sin(S.t*0.9+r.id*2)*0.22), tip=L*0.5;
  for(const s of [-1,1]){ let x=r.x+ca*tip, y=r.y+sa*tip, an=r.a+s*(0.22+tw*s); const n=Math.round(L*1.0+3);
    for(let k=0;k<n;k++){ an+=s*0.045; const nx=x+Math.cos(an)*0.8, ny=y+Math.sin(an)*0.8; put(nx,ny,0.5*(1-k/n)+0.1); x=nx; y=ny; } }
  if(K.id!=='nymph') for(const s of [-1,1]) put(r.x-ca*(tip+1)-sa*s*0.8,r.y-sa*(tip+1)+ca*s*0.8,0.35);   // the cerci
}

/** A squashed roach: the shell burst flat, guts and pale goo smeared out, legs still kicking for a while.
 * @param {any} p {x,y,a,kind,age,seed} */
function drawSplat(p){
  const w=appearanceState.W, K=p.kind, L=K.len, ca=Math.cos(p.a), sa=Math.sin(p.a), R=Math.ceil(L*1.0+3), dry=smooth(400,1400,p.age);
  for(let y=Math.floor(p.y-R);y<=p.y+R;y++) for(let x=Math.floor(p.x-R);x<=p.x+R;x++){ if(x<0||y<0||x>=w||y>=WALL_Y1) continue;
    const dx=x+0.5-p.x, dy=y+0.5-p.y, a=(dx*ca+dy*sa)/(L*0.7), c=(-dx*sa+dy*ca)/(K.wid*1.25), d=Math.hypot(a,c), edge=0.7+0.6*vnoise(Math.atan2(c,a)*2.4+p.seed,d*2+p.seed);
    if(d>edge) continue;
    const body=Math.hypot(a*1.15,c*1.6)<0.5+0.15*vnoise(x*0.9+p.seed,y*0.9);
    const base=body?mix3(RC[K.id].body,P.gut,0.4):mix3(mix3(P.goo,P.gooD,dry),P.gut,0.25*vnoise(x*0.7,y*0.7+p.seed));
    const nz=0.85+0.15*vnoise(x*1.3+p.seed,y*1.3), nx=(vnoise(x*0.9,y*0.9+p.seed)-0.5)*0.6, ny=(vnoise(x*0.9+5,y*0.9)-0.5)*0.6;
    shadeDot(y*w+x,x+0.5,y+0.5,base,nx,ny,nz,body?0.6:1.3*(1-dry*0.85),clamp01((edge-d)*2.5)*(body?1:0.92)); }
  const kick=1-smooth(0,170,p.age);
  for(let k=0;k<5;k++){ const s=k%2?1:-1, la=(k-2)*0.18, base=p.a+s*(1.2+0.5*h2(p.seed|0,k)/255)+Math.sin(p.age*0.9+k*2)*0.5*kick;
    const rx=p.x+ca*la*L, ry=p.y+sa*la*L;
    for(let q=1;q<=4;q++){ const xx=rx+Math.cos(base)*q*0.9, yy=ry+Math.sin(base)*q*0.9, xi=Math.floor(xx), yi=Math.floor(yy); if(xi<0||yi<0||xi>=w||yi>=WALL_Y1) continue; shadeDot(yi*w+xi,xx,yy,mul3(RC[K.id].body,0.45),0,0,1,0.1,0.7); } }
}

/* ---------- the fist ---------- */

/** The thrown fist from behind, lit by the lamp at his back: the back of the hand, the knuckles (red and raw as the pain
 * grows), the thumb, the forearm running back towards him and the rolled sleeve; out of focus while it is near the eye.
 * @param {{x:number,y:number,s:number,pain:number,a:number}} F */
function drawFist(F){
  const S=state, w=appearanceState.W, h=appearanceState.H, col=S.col, s=F.s, dxA=FIST_FROM.x-F.x, dyA=FIST_FROM.y-F.y, lA=Math.hypot(dxA,dyA)||1, ux=dxA/lA, uy=dyA/lA;
  const soft=0.7+1.7*(s-1), Ld=[-0.52,0.3,0.8], I=S.I*(0.35+0.65*S.lampK), raw=smooth(25,70,F.pain), blood=smooth(55,90,F.pain);
  /** Distance, material and height of the hand at a local point. @param {number} px @param {number} py */
  const field=(px,py)=>{
    const df=sdFist(px,py), [da,ta]=sdCone(px,py,0.8,7.2,0.8+ux*70,7.2+uy*70,4.2,8.5), d=smin(df,da,1.6);
    let kn=0; for(const [kx,ky] of KN){ const q=Math.hypot(px-kx,py-ky); if(q<1.9) kn=Math.max(kn,1-q/1.9); }
    const mat=da<df-0.5?(ta*70>19?(ta*70<23.5?3:2):0):(kn>0.25?1:0), sleeve=mat>=2?(mat===3?1.4:0.9):0;
    return {d:d-sleeve,mat,h:2.8*Math.sqrt(clamp01(-(d-sleeve)/2.8))+kn*0.9+sleeve*0.6,kn}; };
  const R=Math.ceil(16*s), reach=(10+soft)/s;
  for(let y=Math.max(0,Math.floor(F.y-R));y<h;y++) for(let x=Math.max(0,Math.floor(F.x-R));x<w;x++){
    const px=(x+0.5-F.x)/s, py=(y+0.5-F.y)/s;
    if(Math.hypot(px,py-2.8)>12+reach&&sdCone(px,py,0.8,7.2,0.8+ux*70,7.2+uy*70,4.2,8.5)[0]>2+reach) continue;   // far from the hand and the arm
    const f=field(px,py); const a=clamp01(0.5-f.d*s/soft)*F.a; if(a<=0.01) continue;
    const e=0.6, hx=field(px+e,py).h-field(px-e,py).h, hy=field(px,py+e).h-field(px,py-e).h, nl=Math.hypot(hx*0.5,hy*0.5,1), nx=-hx*0.5/nl, ny=-hy*0.5/nl, nz=1/nl;
    const ndl=Math.max(0,nx*Ld[0]+ny*Ld[1]+nz*Ld[2]);
    let c=f.mat===2?mul3(P.cloth,0.8+0.35*vnoise((x-F.x)*0.9,(y-F.y)*0.9)):f.mat===3?P.clothD:P.skin, gloss=0.18;
    if(f.mat<2&&f.kn>0){ c=mix3(c,P.knuck,raw*f.kn*0.9); if(blood>0&&f.kn>0.45){ c=mix3(c,P.bloodW,blood*0.85); gloss=0.6*blood; } }
    if(f.mat>=2) gloss=0;
    const l=I*(0.14+1.02*ndl), sp=gloss*I*Math.max(0,nx*-0.25+ny*0.15+nz*0.95)**14*0.5, i=y*w+x;
    for(let k=0;k<3;k++){ const v=c[k]*l*[1,0.86,0.7][k]+sp; col[i*3+k]+=(v-col[i*3+k])*a; } }
}

/* ---------- the whole picture ---------- */

/**
 * Draw the scene into the renderer's buffer.
 * @param {{shadow:{x:number,y:number,ox:number,oy:number,s:number,blur:number},roaches:any[],splats:any[],
 *   fist:{x:number,y:number,s:number,a:number}|null,ghost:{x:number,y:number,s:number,a:number}|null,pain:number,pulse:number}} V
 */
export function renderRoachWall(V){
  const S=state, fb=rendererState.fb, w=appearanceState.W, h=appearanceState.H, col=S.col; if(!S.alb.length) return;
  shadows(V); lightWall();
  for(const p of V.splats) drawSplat(p);
  for(const r of V.roaches) drawRoach(r);
  for(const p of S.parts){ const x=Math.floor(p.x), y=Math.floor(p.y); if(x<0||y<0||x>=w||y>=h) continue; shadeDot(y*w+x,p.x,p.y,p.c,0,0,1,p.goo?0.8:0,p.goo?0.9:0.8*(1-p.age/p.life)); }
  const lc=[WARM[0]*0.9,WARM[1]*0.9,WARM[2]*0.9];
  for(const m of S.motes){ const x=Math.floor(m.x), y=Math.floor(m.y); if(x<0||y<0||x>=w||y>=WALL_Y1) continue; const i=y*w+x, k=Math.min(0.35,S.lam[i]*0.5)*(0.5+0.5*Math.sin(S.t*0.05+m.ph)); for(let q=0;q<3;q++) col[i*3+q]+=lc[q]*k; }
  for(const p of S.puffs){ const k=p.age/p.life, r=3+k*9, a=0.16*(1-k)*Math.min(1,p.age/10)*S.lampK, cx=p.x+p.vx*p.age, cy=p.y-p.age*0.38;
    for(let y=Math.max(0,Math.floor(cy-r));y<=Math.min(h-1,cy+r);y++) for(let x=Math.max(0,Math.floor(cx-r));x<=Math.min(w-1,cx+r);x++){ const d=Math.hypot(x+0.5-cx,y+0.5-cy)/r; if(d>=1) continue;
      const s=a*(1-d)*(1-d)*(0.5+0.7*vnoise(x*0.4+p.age*0.04,y*0.4)), i=y*w+x; for(let q=0;q<3;q++) col[i*3+q]+=(lc[q]*0.55-col[i*3+q]*0.3)*s; } }
  if(V.ghost) drawFist({...V.ghost,pain:V.pain});
  if(V.fist) drawFist({...V.fist,pain:V.pain});
  const desat=0.38*smooth(35,100,V.pain), red=smooth(55,100,V.pain)*V.pulse;
  for(let i=0;i<w*h;i++){ let r=col[i*3], g=col[i*3+1], b=col[i*3+2];
    const lum=r*0.3+g*0.55+b*0.15; r+=(lum-r)*desat; g+=(lum-g)*desat; b+=(lum-b)*desat;
    const v=S.vign[i]; r*=v; g*=v; b*=v;
    if(red>0){ const e=(1-v)*red*0.9; r=r*(1-e)+0.32*e; g*=1-e; b*=1-e*0.9; }
    fb[i]=(0xff000000|(to8(b)<<16)|(to8(g)<<8)|to8(r))>>>0; }
}

````

---

## `src/roach-rules.js`

````js
/* Roaches on the Ward's wall: pure rules of the drill (unit-tested). The kinds that run across the wall, where the
   knuckles land, and what a miss on each surface costs the hand. Drawing and state live in roaches.js / roach-scene.js. */

/**
 * @typedef {object} RoachKind
 * @property {string} id
 * @property {number} len     Body length in native pixels.
 * @property {number} wid     Body width.
 * @property {number} speed   Running speed, px per tick at stage speed ×1.
 * @property {number} stop    Chance to stop for a moment at each turn of its run.
 * @property {number} wiggle  How much the heading wanders while it runs.
 * @property {number} pts     Points for a kill.
 */
/** @type {Record<string,RoachKind>} */
export const KINDS = {
  black:{id:'black',len:7.8,wid:3.7,speed:0.42,stop:0.55,wiggle:0.1,pts:1},    // the black beetle: slow, stops often
  prusak:{id:'prusak',len:5.6,wid:2.6,speed:0.78,stop:0.14,wiggle:0.16,pts:1}, // small, pale, quick
  nymph:{id:'nymph',len:4.2,wid:2.3,speed:0.58,stop:0.25,wiggle:0.55,pts:1},   // half-transparent, zigzags
  big:{id:'big',len:9.8,wid:4.5,speed:1.02,stop:0.04,wiggle:0.05,pts:3},       // the big red one, straight across
};

/** Half-size of the knuckles' footprint on the wall (an ellipse round the aim point). */
export const KNUCKLES = {rx:5,ry:3.2};
/** A roach faster than this at the moment of contact is a kill on the run (+50% points). */
export const MOVING_V = 0.6;

/** Surfaces a fist can meet on the wall. */
export const SURFACE = /** @type {const} */ ({lime:0,brick:1,mortar:2,iron:3});
/** Pain and cooldown ticks (60 Hz) of a miss per surface. */
const MISS = [{pain:12,cool:70},{pain:18,cool:100},{pain:12,cool:70},{pain:30,cool:150}];
/** Pain of a hit: the roach's body takes the stone off the knuckles. */
export const HIT_PAIN = {clean:1,graze:3};
/** Pain falls this much per tick, faster once the hand has rested a second. */
export const PAIN_FADE = 2/60, PAIN_REST = 5/60;

/**
 * Where the knuckles meet a roach: 'clean' when most of the body lies under them, 'graze' when only an edge, a leg
 * or a feeler does, '' for a miss.
 * @param {number} ax @param {number} ay  Aim point.
 * @param {{x:number,y:number,a:number,kind:RoachKind}} r
 * @returns {''|'graze'|'clean'}
 */
export function roachContact(ax,ay,r){
  const K=r.kind, ca=Math.cos(r.a), sa=Math.sin(r.a);
  const inside=(/** @type {number} */ x,/** @type {number} */ y)=>((x-ax)/KNUCKLES.rx)**2+((y-ay)/KNUCKLES.ry)**2<=1;
  let cover=0;
  for(const f of [-0.45,-0.2,0,0.2,0.45]) if(inside(r.x+ca*f*K.len,r.y+sa*f*K.len)) cover++;
  if(cover>=3) return 'clean';
  if(cover>0) return 'graze';
  const side=K.wid*0.95, tip=K.len*0.5+1.8;
  for(const [u,v] of [[0,side],[0,-side],[tip,0.8],[tip,-0.8]]) if(inside(r.x+ca*u-sa*v,r.y+sa*u+ca*v)) return 'graze';
  return '';
}

/**
 * Pain and cooldown of a miss on a surface; a hand already at 90 recovers half as slowly again.
 * @param {number} surface One of SURFACE. @param {number} pain Pain before the blow (0–100).
 * @returns {{pain:number,cool:number}} The new pain and the cooldown in ticks.
 */
export function missCost(surface,pain){
  const m=MISS[surface]??MISS[0];
  return {pain:Math.min(100,pain+m.pain),cool:Math.round(m.cool*(pain>=90?1.5:1))};
}

/** Points of a kill. @param {RoachKind} kind @param {number} v Speed at contact. */
export function killPoints(kind,v){ return kind.pts*(v>MOVING_V?1.5:1); }

````

---

## `src/crank.js`

````js
import { setGstate } from './boxing.js';
import { state as input, setInfo } from './input.js';
import { leaveMode, setPanelMode, enterHub } from './navigation.js';
import { initAudio, tone } from './audio.js';
import { createCrank, tickCrank, holdCrank, releaseCrank, isRising, DURATION, TARGET } from './crank-rules.js';
import { loadCrankScene, prepareCrankScene, prepareCrankFrame, renderCrankScene } from './crank-scene.js';

export const state={on:false,phase:'intro',crank:null,o:{},settled:false,loadId:0};
let hud,board,title,lead,rows,go,back,clock,score,norm,hint,feedback,meter,fill,pace,button;
const heldSources=new Set();
/** Enter the replacement labour activity; loading and briefing never spend time or an action. @param {any} [o] */
export function startCrank(o={}){
  leaveMode();setGstate('crank');initAudio();
  Object.assign(state,{on:true,phase:'loading',crank:createCrank(),o,settled:false});
  const id=++state.loadId;prepareCrankScene();document.body.classList.add('crank');setPanelMode();hud.hidden=false;
  title.textContent='Żelazna korba';lead.textContent='Ładowanie szopy…';rows.innerHTML='';go.hidden=true;back.textContent='Wróć do Wardu';board.hidden=false;
  loadCrankScene().then(()=>{
    if(!state.on||id!==state.loadId)return;
    state.phase='intro';lead.textContent='Ta maszyna niczego nie napędza. Klucznik żąda tylko kolejnych obrotów.';
    rows.innerHTML='<p>Pracujesz przez <b>30 sekund</b>. Norma: <b>'+TARGET+' pełnych obrotów</b>.</p><p><kbd>Spacja</kbd> — trzymaj, gdy uchwyt idzie prawym łukiem w górę, od godziny <b>6 przez 3 do 12</b>. Puść na lewym łuku w dół, od <b>12 przez 9 do 6</b>. Równy rytm rozpędza korbę. Przy niewłaściwym chwycie korba czeka — popraw Spację, aby kontynuować. Na 12 i 6 korba czeka na zmianę chwytu.</p><p>Możesz też trzymać i puszczać przycisk pod sceną. <kbd>F10</kbd> — pauza; <kbd>Esc</kbd> — przerwij pracę.</p>';
    go.hidden=false;go.textContent='Chwyć korbę';go.focus();setInfo();syncHUD();
  }).catch(()=>{if(state.on&&id===state.loadId){state.phase='error';lead.textContent='Nie udało się wczytać tła. Wróć i spróbuj ponownie.';}});
  setInfo();syncHUD();
}
/** Begin only after explicit confirmation. */
export function crankGo(){if(state.phase!=='intro')return;state.phase='run';board.hidden=true;crankKeysOff();syncHUD();}
/** Clear held controls without resetting the simulation. */
export function crankKeysOff(){heldSources.clear();releaseCrank(state.crank);}
/** Cancel asynchronous loading and hide the activity when another mode takes ownership. */
export function resetCrank(){state.on=false;++state.loadId;crankKeysOff();if(hud)hud.hidden=true;if(board)board.hidden=true;document.body.classList.remove('crank');}
/** End an active shift once, otherwise return to its originating station. */
export function crankReturn(){if(state.phase==='run'){finish(true);return;}enterHub(state.o.returnSt||null);}
/** Combine held keyboard and pointer controls.
 * @param {string} source @param {boolean} down */
function control(source,down){
  if(!down){heldSources.delete(source);releaseIfActive();return;}
  if(!state.on||state.phase!=='run'||input.paused)return;
  heldSources.add(source);holdCrank(state.crank,true);syncHUD();
}
/** Release the crank only when every held input has ended. */
function releaseIfActive(){if(state.on&&state.phase==='run'&&!input.paused&&!heldSources.size){holdCrank(state.crank,false);syncHUD();}}
/** Route Space and navigation; ignore key repeat. @param {KeyboardEvent} e @param {boolean} down */
export function crankKey(e,down){
  if(e.code==='Space'){
    e.preventDefault();if(e.repeat)return;
    if(down&&state.phase==='intro'&&!input.paused){crankGo();return;}
    control('keyboard',down);return;
  }
  if(!down||e.repeat||input.paused)return;
  if(e.code==='Escape'){e.preventDefault();crankReturn();}
  else if(e.code==='Enter'){e.preventDefault();if(state.phase==='intro')crankGo();else if(state.phase==='result')crankReturn();}
}
/** Settle only once; prison owns all changes to rewards, action costs and the daily work flag. @param {boolean} [aborted] */
function finish(aborted=false){
  if(state.settled)return;state.settled=true;state.phase='result';crankKeysOff();
  const c=state.crank,won=!aborted&&c.turns>=TARGET,accuracy=c.workTime?Math.round(100*c.goodTime/c.workTime):0;
  const result={turns:c.turns,best:c.best,accuracy,won,aborted};
  const rewards=state.o.onEnd?.(result)||[];
  title.textContent=aborted?'Puściłeś korbę przed dzwonkiem':won?'Norma wykręcona':'Żelazo nie ustąpiło';
  lead.textContent=aborted?'Klucznik zapisuje przerwaną pracę.':won?'Klucznik stawia kreskę. Maszyna nadal niczego nie napędza.':'Klucznik zapisuje wynik poniżej normy. Jutro znów ta sama korba.';
  rows.innerHTML='<div class="cr-summary">'+[['Pełne obroty',c.turns+' / '+TARGET],['Rytm',accuracy+'%'],['Najlepsza seria',c.best],...rewards].map(([k,v])=>'<span>'+k+'</span><b>'+v+'</b>').join('')+'</div>';
  go.hidden=true;back.textContent='Wróć do Wardu';board.hidden=false;back.focus();tone('sine',300,won?720:180,.2,.08);syncHUD();
}
/** Advance on the existing fixed 60 Hz clock; pauses never call this operation. */
export function crankTick(){
  if(!state.on||state.phase!=='run')return;
  const c=state.crank,turns=c.turns;
  tickCrank(c);
  if(c.turns>turns)tone('sine',180,260,.045,.025);
  if(c.done)finish();syncHUD();
}
/** Prepare the original-resolution boxer before the HD pass. */
export function crankFrame(){if(!['loading','error'].includes(state.phase)&&state.crank)prepareCrankFrame(state.crank);}
/** Draw the shed, machine, worker and physical cues. */
export function renderCrank(){if(!['loading','error'].includes(state.phase)&&state.crank)renderCrankScene(state.crank);}
/** Keep the current half-turn explicit without relying on colour or sound. */
function syncHUD(){
  if(!hud||!state.crank)return;
  const c=state.crank,rising=isRising(c);
  clock.textContent=String(Math.max(0,Math.ceil(DURATION-c.elapsed)));clock.classList.toggle('cr-last',c.elapsed>=25);
  score.textContent=c.turns;norm.textContent=TARGET;pace.textContent=Math.round(c.speed*60/(Math.PI*2));
  hint.textContent=rising?'6 → 12 · TRZYMAJ SPACJĘ':'12 → 6 · PUŚĆ SPACJĘ';
  feedback.textContent=c.streak>=2?'Równy rytm. Korba nabiera tempa.':rising?'Ciągnij uchwyt prawym łukiem w górę.':'Daj uchwytowi opaść lewym łukiem.';
  const value=Math.min(1,c.speed/4.55);
  fill.style.width=(value*100)+'%';meter.setAttribute('aria-label','Tempo korby');meter.setAttribute('aria-valuenow',String(Math.round(value*100)));
  button.textContent=rising?'Spacja · trzymaj':'Spacja · puść';button.setAttribute('aria-pressed',String(c.held));
}
/** Shared pause-menu controls. */
export function crankInfo(){input.infoEl.textContent='ŻELAZNA KORBA · 30 sekund pracy';input.nextEl.textContent='Spacja: trzymaj 6→12, puść 12→6 · Esc — zakończ · F10 — pauza';input.livesEl.textContent='';}
/** Bind controls in main's explicit initialization order. */
export function initialize(){
  hud=document.getElementById('crankHud');board=document.getElementById('crankBoard');title=document.getElementById('crTitle');lead=document.getElementById('crLead');rows=document.getElementById('crRows');go=document.getElementById('crGo');back=document.getElementById('crBack');clock=document.getElementById('crClock');score=document.getElementById('crScore');norm=document.getElementById('crNorm');hint=document.getElementById('crHint');feedback=document.getElementById('crFeedback');meter=document.getElementById('crMeter');fill=document.getElementById('crFill');pace=document.getElementById('crPace');button=document.getElementById('crHold');
  go.onclick=crankGo;back.onclick=crankReturn;
  button.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();button.setPointerCapture(e.pointerId);control('pointer'+e.pointerId,true);});
  const up=e=>control('pointer'+e.pointerId,false);
  button.addEventListener('pointerup',up);button.addEventListener('pointercancel',up);button.addEventListener('lostpointercapture',up);
}

````

---

## `src/crank-rules.js`

````js
/** Thirty seconds of pointless prison labour, driven only by simulation time. */
export const DURATION=30;
export const TARGET=10;
export const TAU=Math.PI*2;

/** Start at six o'clock, ready for the first upward pull. */
export function createCrank(){
  return {elapsed:0,angle:0,speed:0,turns:0,held:false,done:false,streak:0,best:0,goodTime:0,workTime:0};
}

/** The right half of a counterclockwise revolution goes from six through three to twelve.
 * @param {ReturnType<typeof createCrank>} c */
export function isRising(c){return c.angle%TAU<Math.PI;}

/** Counterclockwise motion from six o'clock pushes the upper grip away from the worker on the right.
 * @param {number} angle @param {number} radius */
export function crankOffset(angle,radius){return {x:Math.sin(angle)*radius,y:Math.cos(angle)*radius};}

/** Set the current grip without penalties for changing it early.
 * @param {ReturnType<typeof createCrank>} c @param {boolean} down */
export function holdCrank(c,down){if(!c.done)c.held=down;}

/** Release input on pause without changing the mechanism's angle or speed.
 * @param {ReturnType<typeof createCrank>|null} c */
export function releaseCrank(c){if(c)c.held=false;}

/** Advance with small steps so rhythm and the final bell use one clock.
 * @param {ReturnType<typeof createCrank>} c @param {number} [dt] */
export function tickCrank(c,dt=1/60){
  if(c.done||!Number.isFinite(dt)||dt<=0)return;
  let left=Math.min(dt,DURATION-c.elapsed);
  while(left>1e-10){
    const step=Math.min(left,1/120);left-=step;c.elapsed+=step;
    c.workTime+=step;
    const rising=isRising(c),good=c.held===rising;
    if(!good){c.speed=0;continue;}
    const target=Math.min(4.2,2.1+c.streak*.24)+(rising?0:.35);
    c.speed+=(target-c.speed)*Math.min(1,step*3);
    c.angle=Math.min(rising?Math.PI:TAU,c.angle+c.speed*step);
    c.goodTime+=step;
    if(c.angle===TAU){
      if(c.elapsed<DURATION-1e-9){c.turns++;c.streak++;c.best=Math.max(c.best,c.streak);}
      c.angle=0;
    }
  }
  if(c.elapsed>=DURATION-1e-9){c.elapsed=DURATION;c.done=true;}
}

````

---

## `src/crank-scene.js`

````js
/* The shed baked from code, a wooden resistance box on an iron pedestal, and the original boxer skeleton. */
import { state as A, rgb } from './appearance.js';
import { state as B, h2 } from './boxing.js';
import { state as R, setFramebuffer, pset, line } from './renderer.js';
import { makeFig, pose, drawFig, saveJoints, restoreJoints } from './cast.js';
import { state as progression } from './progression.js';
import { isRising, crankOffset } from './crank-rules.js';
import { vnoise, fbm } from './noise.js';

const cl = (/** @type {number} */ v)=>v<0?0:v>255?255:Math.round(v);
const pack = (/** @type {number} */ r,/** @type {number} */ g,/** @type {number} */ b)=>(0xff000000|(cl(b)<<16)|(cl(g)<<8)|cl(r))>>>0;
/** @param {number} a @param {number} b @param {number} k */
export function mixc(a,b,k){ return pack((a&255)+((b&255)-(a&255))*k,((a>>8)&255)+(((b>>8)&255)-((a>>8)&255))*k,((a>>16)&255)+(((b>>16)&255)-((a>>16)&255))*k); }
/** @param {number} a @param {number} k */
export function mulc(a,k){ return pack((a&255)*k,((a>>8)&255)*k,((a>>16)&255)*k); }
/** @param {number} a @param {number} b @param {number} x */
export function smooth(a,b,x){ const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); }

let plate=null,figure,sprite,head=[180,78],personX=158;
const W=288,H=192,FLOOR=178,PERSON=158,HUB={x:122,y:110},RADIUS=18;
const C={iron:0xff333332,dark:0xff161718,light:0xff77766d,shine:0xffa8a292,wood:0xff35475a,grain:0xff2a3847,edge:0xff252c34,chalk:0xff8d968f,gold:0xff6d9db9,sweat:0xffbec3a7,rust:0xff35415e};
const POSTS=[[57,68],[245,256]],WIN={x0:155,x1:190,y0:12,y1:42},WALL_Y1=107,LAMP={x:20,y:38};
/** Dark oak with its grain, lit by `light`. @param {number} x @param {number} y @param {number} light @param {boolean} vertical */
function oak(x,y,light,vertical){ return mulc(mixc(rgb('#24190f'),rgb('#4e3a26'),fbm(vertical?x*0.9:x*0.08,vertical?y*0.08:y*0.9)),light); }
/** Sooty rubble stone in uneven courses, blotched with damp. @param {number} x @param {number} y */
function stone(x,y){
  const course=(y/6)|0, off=h2(course,7)%9, bx=Math.floor((x+off)/(9+(h2(course,3)&3))), id=h2(bx+11,course*5+1);
  const mort=y%6===0||(x+off)%(9+(h2(course,3)&3))===0;
  let c=mort?rgb('#15130f'):mulc([rgb('#3b342c'),rgb('#443b31'),rgb('#332d27'),rgb('#4a4036')][id&3],0.8+((id>>2)&15)/15*0.3);
  const damp=fbm(x*0.06+5,y*0.07); if(damp>0.6) c=mixc(c,rgb('#5e5446'),0.5); else if(damp<0.3) c=mixc(c,rgb('#14110e'),0.45);
  return c;
}
/** Flagstones in rows that widen toward the camera, cracked and worn. @param {number} x @param {number} y */
function flag(x,y){
  const rows=[WALL_Y1,113,122,133,148,165,185,H], r=rows.findIndex(v=>y<v)-1, h=rows[r+1]-rows[r], w=26+r*9, off=h2(r,9)%w;
  const id=h2(Math.floor((x+off)/w),r+4), joint=y===rows[r]||(x+off)%w===0;
  let c=joint?rgb('#16130f'):mulc(rgb('#4a4236'),0.7+(id&15)/40+0.12*(y-rows[r])/h);
  const wear=fbm(x*0.07,y*0.15); if(!joint&&wear>0.6) c=mixc(c,rgb('#6a604e'),(wear-0.6)*1.4);
  if(!joint&&(id&7)===0&&Math.abs((x+off)%w-w/2-(y-rows[r])*0.8)<0.6) c=rgb('#1c1813');   // a crack
  return c;
}
/** The shed's colour at a pixel, before light. @param {number} x @param {number} y */
function shedAt(x,y){
  const px=x+0.5, py=y+0.5;
  if(py<WIN.y1+3&&px>=WIN.x0-3&&px<WIN.x1+3&&py>=WIN.y0-3){   // the barred window in its dressed stone frame, sky beyond
    const inner=px>=WIN.x0&&px<WIN.x1&&py>=WIN.y0&&py<WIN.y1, ax=(px-(WIN.x0+WIN.x1)/2)/((WIN.x1-WIN.x0)/2+3), arch=py<WIN.y0+5&&ax*ax+((WIN.y0+5-py)/8)**2>1;
    if(arch) return py<18?oak(x,y,0.6,false):stone(x,y);
    if(!inner) return mulc(rgb('#7a7060'),0.8+0.2*vnoise(x*0.5,y*0.5));
    if((x-WIN.x0)%6===3||(x-WIN.x0)%6===4||y===WIN.y0+15) return rgb('#16130f');
    return mixc(rgb('#c9c8b8'),rgb('#8e9286'),(py-WIN.y0)/(WIN.y1-WIN.y0));
  }
  if(py<WALL_Y1) for(const [a,b] of POSTS) if(px>=a&&px<b&&py>=16){ const u=(px-a)/(b-a); return oak(x,y,u<0.3?1.1:u>0.75?0.55:0.85,true); }
  if(py>=16&&py<22) return oak(x,y,y===16?1.1:y===21?0.5:0.85,false);   // the wall plate under the rafters
  if(py<16){ const joist=[27,115,203,253].some(j=>Math.abs(px-j)<4+py*0.15); return joist?oak(x,y,0.75,true):mulc(oak(x,y,0.45,false),0.6); }
  for(const [a,b] of POSTS) for(const s of [-1,1]){   // knee braces from the posts up to the plate
    const root=s<0?a:b, d=s*(px-root); if(d>0&&d<18&&Math.abs(22+d-py)<2.2&&py<40) return oak(x,y,0.7,false); }
  if(py<WALL_Y1){
    for(const [a,b] of [[3,23],[265,285]]) if(px>=a&&px<b&&py>=95){   // two low benches against the wall
      if(py<98) return oak(x,y,py<96?1:0.7,false);
      if((px-a<3||b-px<3)) return oak(x,y,0.6,true);
      return mulc(stone(x,y),0.6); }
    if(Math.abs(px-LAMP.x)<3&&py>=LAMP.y-8&&py<LAMP.y+6){   // the lantern on its bracket
      if(py<LAMP.y-5) return rgb('#1a1714');
      if(Math.abs(px-LAMP.x)<2&&py<LAMP.y+4) return mixc(rgb('#ffe0a0'),rgb('#c47a2c'),Math.abs(px-LAMP.x)/2+(py-LAMP.y+5)/12);
      return rgb('#24201a'); }
    if(py>=LAMP.y-9&&py<LAMP.y-7&&px>=LAMP.x-3&&px<LAMP.x+8) return rgb('#1a1714');
    return mixc(stone(x,y),rgb('#0c0a08'),Math.min(1,(WALL_Y1-py)/120+(py>WALL_Y1-4?0.3:0)));
  }
  return flag(x,y);
}
/** Bake the shed once: stone, oak and flags, lit by the lantern, the window and its shaft of daylight. */
export async function loadCrankScene(){
  if(plate)return;
  const out=new Uint32Array(W*H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    let c=shedAt(x,y);
    const lamp=Math.exp(-((x-LAMP.x)**2+(y-LAMP.y)**2)/900), shaft=Math.exp(-((x-172+(y-WIN.y1)*0.08)**2)/180)*smooth(WIN.y1,WIN.y1+12,y)*(1-smooth(110,170,y));
    const dark=0.55+0.35*Math.exp(-((x-150)**2/12000+(y-120)**2/6000));
    c=mulc(c,dark+0.6*lamp); c=mixc(c,rgb('#e8b060'),0.18*lamp); c=mixc(c,rgb('#b8b8a8'),0.16*shaft);
    out[y*W+x]=c;
  }
  plate=out;
}
/** Snapshot the player's appearance with the existing prison outfit. */
export function prepareCrankScene(){figure=makeFig(progression.save.look);sprite=new Uint32Array(A.W*A.H);}
/** One physical grip target drives the iron handle and both hands, around the bearing. @param {any} c */
function grip(c){
  const offset=crankOffset(c.angle,RADIUS);
  return {x:HUB.x+offset.x,y:HUB.y+offset.y};
}
/** Pose hands through the shared IK and keep the main fighter's joints intact. @param {any} c */
export function prepareCrankFrame(c){
  const keep=saveJoints(),g=grip(c),strain=Math.sin(c.angle)*.13;
  try{
    personX=Math.round(PERSON-Math.max(0,HUB.x-g.x)*.5);
    const hx=50+(personX-g.x)/2,hy=86+(g.y-FLOOR)/2;
    // Lean into the far half of the circle so the hands remain within arm reach.
    pose({x:50,lean:4+Math.max(0,(140-g.x)*.16)+strain,squat:.15+(c.held?.12:0),bob:Math.sin(c.angle)*.35,
      near:[hx,hy],far:[hx,hy],feet:[58,44],headDx:-5});
    head=[personX+(50-B.headX)*2,FLOOR+(B.headY-86)*2];
    sprite.fill(0);drawFig(figure,{into:sprite});
  }finally{restoreJoints(keep);}
}
/** Fill a small solid rectangle in the current pixel buffer. @param {number} x @param {number} y @param {number} w @param {number} h @param {number} colour */
function rect(x,y,w,h,colour){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)pset(xx,yy,colour);}
/** Shaded rivet or shaft cap. @param {number} x @param {number} y */
function rivet(x,y){rect(x-1,y-1,3,3,C.dark);pset(x,y,C.light);pset(x-1,y-1,C.shine);}
/** Reference-shaped wooden box with straps, access panel, resistance screw and a heavy bolted pedestal. */
function machine(){
  // Static wood and metal stay at whole pixels; the crank is the only moving machine part.
  rect(85,171,63,7,C.dark);line(85,171,143,171,C.light,C.iron);line(88,178,148,178,C.iron,C.dark);
  rect(106,117,21,54,C.dark);rect(110,119,12,51,C.iron);line(110,122,110,168,C.light,C.iron);
  for(let y=128;y<169;y+=8)line(111,y,121,y,C.iron,C.dark);
  rivet(91,174);rivet(139,174);
  // Broad side wall faces the camera; the axle starts in its centre, as in the sketch.
  rect(103,90,38,38,C.dark);rect(105,92,34,34,C.wood);
  for(let y=94;y<125;y+=4){
    line(106,y,138,y,C.grain,C.wood);
    line(108,y+1,119,y+2,C.wood,C.edge);
  }
  line(103,90,140,90,C.light,C.wood);
  rect(105,96,34,2,C.iron);rect(105,120,34,3,C.iron);
  for(const x of [108,136])for(const y of [97,121])rivet(x,y);
  rect(116,85,14,4,C.dark);rect(121,82,4,4,C.iron);line(116,82,130,82,C.light,C.iron);
  // Circular bearing seen from the side, with the long crank projecting toward the hands.
  for(let y=-8;y<=8;y++)for(let x=-8;x<=8;x++){
    const d=x*x+y*y;if(d>64)continue;
    pset(HUB.x+x,HUB.y+y,d>42?C.dark:d>30?(x+y<0?C.shine:C.iron):C.iron);
  }
  rivet(HUB.x,HUB.y);
}
/** Blit the original figure at 2× so hands and the iron grip remain readable. */
function person(){
  for(let sy=20;sy<96;sy++)for(let sx=15;sx<100;sx++){
    const c=sprite[sy*144+sx];if(!c)continue;
    const x=personX+(50-sx)*2,y=FLOOR+(sy-86)*2;
    rect(x,y,2,2,c);
  }
}
/** Animate sweat from the head, as the worker keeps turning the crank. @param {any} c */
function sweat(c){
  if(c.elapsed<1)return;
  for(let i=0;i<3;i++){
    const t=(c.elapsed*.9+i*.41)%1;
    if(t>.8)continue;
    const x=Math.round(head[0]-5+(i%3)*5+(i%2?-1:1)*t*8),y=Math.round(head[1]+3+t*25);
    pset(x,y,C.sweat);pset(x,y+1,C.light);
  }
}
/** Draw the machine and worker with a full revolution around the box bearing. @param {any} c */
export function renderCrankScene(c){
  const previous=setFramebuffer(R.FB_MAIN),g=grip(c);
  try{
    R.FB_MAIN.set(plate);
    for(let x=81;x<211;x++)for(let y=176;y<181;y++)if(((x-146)/66)**2+((y-178)/3)**2<1)pset(x,y,C.dark);
    machine();
    person();
    // A rigid crank turns a full circle around the bearing in the box wall.
    line(HUB.x,HUB.y,Math.round(g.x),Math.round(g.y),C.dark,C.dark);
    line(HUB.x,HUB.y-1,Math.round(g.x),Math.round(g.y)-1,C.shine,C.iron);
    rivet(HUB.x,HUB.y);
    line(Math.round(g.x)-1,Math.round(g.y)-1,Math.round(g.x)+4,Math.round(g.y)+1,C.dark,C.iron);
    pset(Math.round(g.x)+3,Math.round(g.y),C.shine);
    sweat(c);
    if(c.held!==isRising(c)&&c.elapsed>0){pset(HUB.x,HUB.y,C.rust);}
  }finally{setFramebuffer(previous);}
}

````

---

## `src/cast.js`

````js
/* Cast: extra people drawn with the boxer skeleton (drawBoxer) outside the fights — the crowd in
   the canteen, the arm wrestlers. Each figure keeps its own palette snapshot (look + clothes); a pose sets the joints
   in the right-facing local frame with the feet on FLOOR_Y; drawFig draws it into a scratch buffer and blits it
   (mirrored, shifted, dimmed or tinted) onto a target buffer. */

import { state as boxingState, drawBoxer, ik } from './boxing.js';
import { state as appearanceState, setRamp, applyLook } from './appearance.js';
import { state as rendererState } from './renderer.js';
import { state as npcsState } from './npcs.js';
import { state as sparringState } from './sparring.js';

// Runtime values owned by cast; initialized explicitly by main.js.
export const state = {};

/**
 * Snapshot of a figure's palette: look (skin, hair, face) and clothes (three-tone ramps).
 * `trunk` colours the towel / trunks (drawn when the outfit shows them, e.g. in the bath).
 * @param {Record<string,string>} look @param {string[]} [top] @param {string[]} [pant] @param {string[]} [shoe] @param {string[]} [trunk]
 */
export function makeFig(look,top,pant,shoe,trunk){
  const A=appearanceState, keep=A.PAL.slice(), keepLk={...A.lk};
  top=top||npcsState.CN_TOP; pant=pant||npcsState.CN_PANT; shoe=shoe||sparringState.PRIS_SHOE;
  applyLook(look);
  setRamp(A.R_SHIRT,top,false); setRamp(A.R_SHIRTF,top,true); setRamp(A.R_PANT,pant,false); setRamp(A.R_PANTF,pant,true);
  setRamp(A.R_BOOT,shoe,false); setRamp(A.R_BOOTF,shoe,true); setRamp(A.R_BTR,sparringState.PRIS_SOLE,false); setRamp(A.R_BTRF,sparringState.PRIS_SOLE,true);
  if(trunk){ setRamp(A.R_TRUNK,trunk,false); setRamp(A.R_TRUNKF,trunk,true); setRamp(A.R_TT,trunk,false); setRamp(A.R_TTF,trunk,true); }
  const fig={pal:A.PAL.slice(),lk:{...A.lk}};
  A.PAL.set(keep); Object.assign(A.lk,keepLk);
  return fig;
}

/** A redder copy of a figure (strain, anger): the skin ramps pushed towards blood red. @param {any} fig @param {number} k 0..1 */
export function flushed(fig,k){
  const A=appearanceState, pal=fig.pal.slice();
  for(const slot of [A.R_SKIN,A.R_SKINF,A.R_SKX,A.R_SKXF]) for(let j=0;j<3;j++){ const i=slot*3+j, c=pal[i]; pal[i]=mix(c,(0xff000000|(0x28<<16)|(0x30<<8)|0xd8)>>>0,k*(j===0?0.5:0.38)); }
  return {pal,lk:fig.lk};
}

/** A prison look from a seed (skins, greying hair, short cuts, stubble). @param {number} seed */
export function inmateLook(seed){
  const r=(/** @type {number} */ k)=>((Math.imul(seed*2654435761+k*40503,0x9e3779b1)>>>16)&0xffff)/65536;
  const pick=(/** @type {string[]} */ a,/** @type {number} */ k)=>a[Math.floor(r(k)*a.length)];
  return {skin:pick(['s1','s1','s2','s2','s3','s4','s5'],1),hair:pick(['h1','h1','h2','h2','h3','h4','h6','h6'],2),style:pick(['short','buzz','buzz','bald','short'],3),
    eyes:pick(['normal','narrow','narrow','wide'],4),brows:pick(['normal','thick','angry'],5),nose:pick(['straight','broken','small','broken'],6),
    facial:pick(['none','stubble','stubble','mustache','beard','goatee'],7),extra:pick(['none','none','none','scar','tape'],8)};
}

/**
 * Pose the skeleton (right-facing local frame; the feet on FLOOR_Y).
 * near/far = hand targets (IK through the elbows) unless nearE/farE fix the elbows; feet = [near x, far x].
 * @param {{x:number,squat?:number,lean?:number,rise?:number,bob?:number,near:number[],far:number[],nearE?:number[],farE?:number[],feet:number[],lift?:number[],headDx?:number,headDy?:number}} o
 */
export function pose(o){
  const B=boxingState, A=appearanceState, fy=A.FLOOR_Y, squat=o.squat??0.12, lean=o.lean??0;
  B.hipX=Math.round(o.x); B.hipY=Math.round(A.HIP_Y0+1+squat*9-(o.rise||0)-4-(o.bob||0));
  B.sx=Math.round(o.x+lean); B.sy=B.hipY-A.TORSO; B.torsoX=B.hipX;
  B.lsx=B.sx+1; B.lsy=B.sy+1; B.rsx=B.sx-1; B.rsy=B.sy+1;
  B.headX=B.sx+2+Math.round(lean*0.3)+(o.headDx||0); B.headY=B.sy-6+(o.headDy||0);
  if(o.nearE){ B.rex=Math.round(o.nearE[0]); B.rey=Math.round(o.nearE[1]); B.rgx=Math.round(o.near[0]); B.rgy=Math.round(o.near[1]); }
  else { ik(B.rsx,B.rsy,o.near[0],o.near[1],A.UPPER,A.FORE,1); B.rex=Math.round(B.IKx); B.rey=Math.round(B.IKy); B.rgx=Math.round(B.IKtx); B.rgy=Math.round(B.IKty); }
  if(o.farE){ B.lex=Math.round(o.farE[0]); B.ley=Math.round(o.farE[1]); B.lgx=Math.round(o.far[0]); B.lgy=Math.round(o.far[1]); }
  else { ik(B.lsx,B.lsy,o.far[0],o.far[1],A.UPPER,A.FORE,1); B.lex=Math.round(B.IKx); B.ley=Math.round(B.IKy); B.lgx=Math.round(B.IKtx); B.lgy=Math.round(B.IKty); }
  const lN=(o.lift&&o.lift[0])||0, lF=(o.lift&&o.lift[1])||0, tipN=lN>1.5?1:0, tipF=lF>1.5?1:0;
  B.lax=Math.round(o.feet[1]); B.lay=Math.round(fy-3-lF); B.rax=Math.round(o.feet[0]); B.ray=Math.round(fy-3-lN);
  B.lhx=B.hipX+1; B.lhy=B.hipY; B.rhx=B.hipX-1; B.rhy=B.hipY;
  ik(B.lhx,B.lhy,B.lax,B.lay,A.THIGH,A.SHIN,-1); B.lkx=Math.round(B.IKx); B.lky=Math.round(B.IKy);
  ik(B.rhx,B.rhy,B.rax,B.ray,A.THIGH,A.SHIN,-1); B.rkx=Math.round(B.IKx); B.rky=Math.round(B.IKy);
  B.ltx=B.lax+4; B.lty=Math.round(fy-1-lF+tipF); B.lhex=B.lax-1; B.lhey=Math.round(fy-1-lF-tipF);
  B.rtx=B.rax+4; B.rty=Math.round(fy-1-lN+tipN); B.rhex=B.rax-1; B.rhey=Math.round(fy-1-lN-tipN);
  B.shDirX=0; B.shDirY=1;
}

/**
 * Draw a posed figure. `mid` draws between the body and the near arm (a held tool), `top` after the whole body
 * (caps, things in front). Coordinates inside the hooks are local (right-facing, unshifted).
 * @param {any} fig
 * `scale` < 1 shrinks the figure around its feet (people further away).
 * @param {{into?:Uint32Array,mirror?:boolean,dx?:number,dy?:number,mid?:()=>void,top?:()=>void,dim?:number,tint?:number,tintK?:number,clipY?:number,scale?:number}} o
 */
export function drawFig(fig,o){
  const A=appearanceState, keep=A.PAL.slice(), keepLk={...A.lk}, keepBt=A.btStyle, keepTr=A.trStyle, keepFb=rendererState.fb;
  A.PAL.set(fig.pal); Object.assign(A.lk,fig.lk); A.btStyle='low'; A.trStyle='plain';
  const F=state.FB; F.fill(0); rendererState.fb=F;
  boxingState.workMidHook=o.mid||null;
  drawBoxer();
  boxingState.workMidHook=null;
  if(o.top) o.top();
  rendererState.fb=keepFb;
  A.PAL.set(keep); Object.assign(A.lk,keepLk); A.btStyle=keepBt; A.trStyle=keepTr;
  const w=A.W, h=A.H, dx=Math.round(o.dx||0), dy=Math.round(o.dy||0), M=o.into||rendererState.FB_MAIN, dim=o.dim||0, tk=o.tintK||0, clip=o.clipY??h;
  const sc=o.scale||1;
  if(sc!==1){ const ax=boxingState.hipX, ay=A.FLOOR_Y, wax=(o.mirror?w-1-ax:ax)+dx, way=ay+dy;
    for(let ty=0;ty<Math.min(h,clip);ty++){ const sy=Math.round(ay+(ty-way)/sc); if(sy<0||sy>=h) continue;
      for(let tx=0;tx<w;tx++){ const lx=Math.round(ax+(tx-wax)/sc*(o.mirror?-1:1)); if(lx<0||lx>=w) continue; let c=F[sy*w+lx]; if(!c) continue;
        if(tk) c=mix(c,/** @type {number} */ (o.tint),tk); if(dim) c=darken(c,dim); M[ty*w+tx]=c; } }
    return; }
  for(let y=0;y<h;y++){ const ty=y+dy; if(ty<0||ty>=h||ty>=clip) continue; const r=y*w, tr=ty*w;
    for(let x=0;x<w;x++){ let c=F[r+x]; if(!c) continue; const tx=(o.mirror?w-1-x:x)+dx; if(tx<0||tx>=w) continue;
      if(tk) c=mix(c,/** @type {number} */ (o.tint),tk); if(dim) c=darken(c,dim); M[tr+tx]=c; } }
}

/** @param {number} c @param {number} k 0..1 */
function darken(c,k){ const m=1-k; return (0xff000000|((((c>>16)&255)*m)<<16)|((((c>>8)&255)*m)<<8)|((c&255)*m))>>>0; }
/** @param {number} c @param {number} t @param {number} k 0..1 */
export function mix(c,t,k){ const ch=(/** @type {number} */ s)=>Math.round(((c>>s)&255)*(1-k)+((t>>s)&255)*k); return (0xff000000|(ch(16)<<16)|(ch(8)<<8)|ch(0))>>>0; }

const JOINTS=['hipX','hipY','sx','sy','torsoX','lsx','lsy','rsx','rsy','headX','headY','rex','rey','rgx','rgy','lex','ley','lgx','lgy','lax','lay','rax','ray','lhx','lhy','rhx','rhy','lkx','lky','rkx','rky','ltx','lty','lhex','lhey','rtx','rty','rhex','rhey','shDirX','shDirY','IKx','IKy','IKtx','IKty'];
/** The fight owns the skeleton fields: keep them around extra figures drawn during a fight. */
export function saveJoints(){ const B=/** @type {any} */ (boxingState); return JOINTS.map(k=>B[k]); }
/** @param {any[]} v */
export function restoreJoints(v){ const B=/** @type {any} */ (boxingState); JOINTS.forEach((k,i)=>{ B[k]=v[i]; }); }


export function initialize(){
  state.FB=new Uint32Array(appearanceState.W*appearanceState.H);
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

## `src/noise.js`

````js
/* Value noise shared by the painted scenes (the cell, the pull-up window, the roach wall, the crank shed, the push-up sheets). */

import { h2 } from './boxing.js';

// Runtime values owned by noise; initialized explicitly by main.js.
export const state = {};

const NG = 32;
/** Smooth value noise, 0..1, wrapping every 32 units (the grid is filled in initialize). @param {number} u @param {number} v */
export function vnoise(u,v){
  const G=state.noise, i=Math.floor(u), j=Math.floor(v), fu=u-i, fv=v-j, su=fu*fu*(3-2*fu), sv=fv*fv*(3-2*fv);
  const i0=i&31, i1=(i+1)&31, j0=(j&31)*NG, j1=((j+1)&31)*NG, a=G[j0+i0], b=G[j0+i1], c=G[j1+i0], d=G[j1+i1];
  return a+(b-a)*su+(c-a+(a-b-c+d)*su)*sv;
}
/** Two octaves of value noise, 0..1. @param {number} u @param {number} v */
export const fbm=(u,v)=>vnoise(u,v)*0.65+vnoise(u*2.03+11.3,v*2.03+5.7)*0.35;

export function initialize(){
  state.noise=new Float32Array(NG*NG).map((_,i)=>h2(i&31,(i>>5)+77)/255);
}

````

---

## `src/ward-wall.js`

````js
/* The Ward's back wall seen from the side (native 144×96): the vault black with soot, the peeled limewash, the barred window,
   the guard-bed on its trestles and the flags. Baked once behind the push-ups; unlit (the scene lights it itself). */

import { state as appearanceState, rgb } from './appearance.js';
import { state as rendererState } from './renderer.js';
import { h2, drawChar } from './boxing.js';
import { mix } from './cast.js';
import { vnoise, fbm } from './noise.js';

const C = /** @type {Record<string,any>} */ ({});
const WALL_FLOOR = 75;
/** @param {number} c @param {number} k */
const shade=(c,k)=>(0xff000000|(Math.min(255,((c>>16)&255)*k)<<16)|(Math.min(255,((c>>8)&255)*k)<<8)|Math.min(255,(c&255)*k))>>>0;
/** The tallow lamp on the Ward's wall, on the left. */
const LAMP = [16,31];

/** Stone flags in perspective from the wall line to the bottom of the picture. @param {number} x @param {number} y @param {number[]} P @param {number} J */
function flags(x,y,P,J){
  const dz=y-38, u=(x-72)/dz*7.5, rows=[75,77,80,84,89,95]; let row=0; while(row<rows.length-1&&y>=rows[row+1]) row++;
  const fu=u-Math.floor(u+(row&1)*0.5), gw=0.8/dz*7.5;
  let c=(rows.includes(y)||fu<gw)?J:P[h2(Math.floor(u+(row&1)*0.5)*5+1,row*11+2)%3];
  if(y<78) c=shade(c,0.7);
  return c;
}

/* ---------- the Ward ---------- */

/** The barred window high on the right: its embrasure, the opening and the bars. */
const WIN = {x0:95,x1:109,y0:11,y1:20};
/** Is (x, y) open sky between the bars of the window? @param {number} x @param {number} y */
const winSky=(x,y)=>x>=WIN.x0&&x<=WIN.x1&&y>=WIN.y0&&y<=WIN.y1&&(x-WIN.x0)%5!==2&&(x-WIN.x0)%5!==3&&y!==15;
/** The crack running down from the vault: its x at height y. @param {number} y */
const crackX=(y)=>58+(y-6)*0.18+5*(vnoise(y*0.16,5.3)-0.5)+1.5*(vnoise(y*0.6,8.1)-0.5);

/** Old limewash on the brick: how much of it is still on at (x, y) (peeled where < 0.47). @param {number} x @param {number} y */
const limeOn=(x,y)=>fbm(x*0.05+3.1,y*0.085+1.7)+0.16*vnoise(x*0.31,y*0.45+4)+0.06*vnoise(x*0.9,y*1.1+2)+0.07-Math.max(0,(y-30)*0.004);
/** One pixel of the Ward's back wall (unlit; the light falls on it per frame). @param {number} x @param {number} y */
function wardWall(x,y){
  const t=((x%48)/48-0.5)*2, arch=4+7*t*t; let c;
  if(y<arch-2) return mix(C.vault,C.soot,0.5+0.5*vnoise(x*0.2,y*0.4));                         // the vault, black with soot
  if(y<arch){ const r=Math.floor((x+(y&1)*2)/4); return ((x+(y&1)*2)%4===0)?C.joint:shade(C.stoneD,0.75+0.1*(h2(r,3)&3)); }   // the voussoirs of the arch
  if(y<42){
    const br=Math.floor((y-2)/3), bu=x+(br&1)*3, mort=((y-2)%3)===0||(bu%6)===0, L=limeOn(x,y);
    if(L>0.47){ c=mix(C.lime[0],C.lime[1],vnoise(x*0.14,y*0.21+9)); if(limeOn(x,y+1)<=0.47) c=mix(c,C.limeL,0.2); else if(limeOn(x,y-1)<=0.47) c=shade(c,0.8); }   // a lip where it flakes
    else { c=mort?C.mortar:C.brick[h2(Math.floor(bu/6),br)%3]; if(!mort&&((y-2)%3)===1) c=shade(c,1.08);
      if(limeOn(x,y-1)>0.47) c=shade(c,0.7); else if(mort) c=mix(c,C.limeD,0.25); }               // the lime overhang shades the brick under it
    const s=Math.max(0,0.8-(y-arch)/26)+0.75*vnoise(x*0.31+7,2.3)**3*Math.max(0,1-(y-arch)/36);    // soot from the vault and run down in streaks
    const plume=y<34?0.85*Math.exp(-(((x-17.5)/(1.6+(34-y)*0.3))**2))*Math.min(1,(34-y)/5):0;      // and black above the lamp
    c=mix(c,C.soot,Math.min(0.9,s+plume));
    if(x>=WIN.x0-3&&x<=WIN.x1+3&&y>21){ const r=vnoise(x*0.7,3.3); if(r>0.55) c=mix(c,C.rust,Math.min(0.55,(r-0.55)*2.4)*Math.max(0,1-(y-21)/16)); }   // rust bled from the bars
    const tide=31+5*fbm(x*0.07,9.3);                                                                 // rising damp, salt at its edge
    if(y>tide) c=mix(c,C.damp,0.3+0.3*vnoise(x*0.2,y*0.3)); else if(y>tide-1.2) c=mix(c,C.salt,0.35);
    if(y>arch+1&&y<40){ const cx=crackX(y); if(Math.abs(x-cx)<0.55) c=C.crack; else if(Math.abs(x-cx-1)<0.55) c=mix(c,C.limeL,0.25); }
    return c; }
  if(y<44) return y===42?mix(C.stoneT,C.soot,0.3*vnoise(x*0.2,1)):shade(C.stone,0.8);             // the string course
  if(y<58){ const row=Math.floor((y-44)/7), bx=Math.floor((x+row*11)/22), lx=(x+row*11)%22, ly=(y-44)%7;   // ashlar, chiselled
    if(ly===0||lx===0) return C.joint;
    c=C.ash[h2(bx,row)%3]; if(ly===1||lx===1) c=shade(c,1.12); else if(ly===6||lx===21) c=shade(c,0.78);
    c=mix(c,C.damp,0.25+0.35*vnoise(x*0.12,y*0.2+row));
    const wet=vnoise(x*0.45,7.7); if(wet>0.58) c=mix(c,C.wet,(wet-0.58)*2*Math.min(1,(y-44)/6));     // water run down from the tide
    if(y>51) c=mix(c,C.slime,Math.min(0.6,(y-51)*0.09*(0.6+0.8*vnoise(x*0.18,4.4))));
    return c; }
  if(y===58) return mix(C.bedH,C.bed,vnoise(x*0.3,2));                                               // the guard-bed: its worn edge,
  if(y===59) return C.bedK;
  if(y<67){ const j=(x+3)%23; if(j===0) return C.bedK; if(y===66) return shade(C.bedF,0.6);         //   the front board, grain and nails,
    c=mix(C.bedF,C.bed,0.35*vnoise(x*0.06,y*0.9+2)+0.15); if((j===2||j===21)&&(y===61||y===64)) c=C.nail;
    return c; }
  if(y<WALL_FLOOR) return ((x%22)<2)?shade(C.bedF,0.55):C.under;                                    //   black underneath, the trestles
  return flags(x,y,C.flag,C.fjoint);
}

/** The Ward's back wall into rendererState.fb: the wall behind the push-ups. */
export function wardWallBg(){
  const fb=rendererState.fb, w=appearanceState.W, h=appearanceState.H;
  const px=(/** @type {number} */ x,/** @type {number} */ y,/** @type {number} */ c)=>{ if(x>=0&&x<w&&y>=0&&y<h) fb[y*w+x]=c; };
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) fb[y*w+x]=wardWall(x,y);
  for(let y=WIN.y0-3;y<=WIN.y1+3;y++) for(let x=WIN.x0-4;x<=WIN.x1+4;x++){                        // the window: a splayed reveal,
    const ex=Math.max(WIN.x0-x,x-WIN.x1,0), ey=Math.max(WIN.y0-y,y-WIN.y1,0); if(!ex&&!ey) continue;
    if(y>WIN.y1&&y<=WIN.y1+2) px(x,y,y===WIN.y1+1?C.stoneT:C.stone); else px(x,y,x<WIN.x0?shade(C.stone,0.95-ex*0.08):y<WIN.y0?shade(C.stoneD,0.9):shade(C.stoneD,0.7)); }
  for(let y=WIN.y0;y<=WIN.y1;y++) for(let x=WIN.x0;x<=WIN.x1;x++) px(x,y,winSky(x,y)?C.sky:((x-WIN.x0)%5===2||y===15)?C.ironH:C.iron);   //   bars over the smog
  for(let y=WIN.y0-1;y<=WIN.y1+1;y++) for(let x=WIN.x1+5;x<WIN.x1+11;x++){ const top=WIN.y0-1+Math.round((x-WIN.x1-5)*0.35);   //   the plank shutter swung open
    if(y<top||y>WIN.y1+1-Math.round((x-WIN.x1-5)*0.35)) continue; px(x,y,(x-WIN.x1)%3===0?C.bedK:(y===WIN.y0+2||y===WIN.y1-1)?C.iron:mix(C.bedF,C.bed,vnoise(x*0.5,y*0.3))); }
  for(const cx of [30,82]){ for(let a=0;a<6.28;a+=0.35) px(Math.round(cx+Math.cos(a)*2),Math.round(48+Math.sin(a)*2),a>3.5?C.ironH:C.iron);   // rings, chains down to the planks
    for(let y=50;y<58;y++){ px(cx+((y>>1)&1),y,(y&1)?C.ironH:C.iron); if(y&1) px(cx+((y>>1)&1)+1,y+1,shade(fb[(y+1)*w+cx+2]||C.iron,0.7)); } }
  for(const [x0,x1] of [[2,28],[50,74],[96,122]]) for(let x=x0;x<x1;x++){ const hump=1.6*Math.sin(Math.PI*(x-x0)/(x1-x0))+0.6*vnoise(x*0.4,3);   // straw pallets, sacking split
    for(let y=Math.round(57.4-hump);y<58;y++) px(x,y,mix(C.tickD,C.tick,vnoise(x*0.5,y*0.8))); }
  for(let s=0;s<26;s++){ const x=4+h2(s,41)%118, y=56+(h2(s,42)&1), dx=(h2(s,43)&1)?1:-1; if((x>27&&x<50)||(x>73&&x<96)) continue; px(x,y,C.straw); px(x+dx,y+1,shade(C.straw,0.75)); }   // straws poking out
  const scr=(/** @type {number} */ x0,/** @type {number} */ y0,/** @type {number} */ x1,/** @type {number} */ y1)=>{ const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0));   // a line cut into the lime
    for(let i=0;i<=n;i++){ const x=Math.round(x0+(x1-x0)*i/n), y=Math.round(y0+(y1-y0)*i/n); px(x,y,mix(fb[y*w+x],C.scratch,0.55)); px(x,y+1,shade(fb[(y+1)*w+x],0.7)); } };
  scr(64,36,70,36); scr(66,36,66,25); scr(66,25,71,25); scr(66,28,68,26); scr(70,25,70,27);           // a gallows, the noose,
  for(let a=0;a<6.28;a+=0.6) px(Math.round(70+Math.cos(a)),Math.round(28.5+Math.sin(a)),mix(fb[Math.round(28.5+Math.sin(a))*w+Math.round(70+Math.cos(a))],C.scratch,0.5));
  scr(70,30,70,33); scr(70,31,69,32); scr(70,31,71,32);                                              //   a man hanging in it
  for(let g=0;g<4;g++){ const x0=24+g*7; for(let m=0;m<4;m++) scr(x0+m,34-(g&1),x0+m,37-(g&1)); scr(x0-1,37-(g&1),x0+4,34-(g&1)); }   // the days, five by five
  for(const [s,x,y] of [['1867',118,26],['J.M.',36,25]]) for(let k=0;k<s.length;k++) drawChar(s.charCodeAt(k),x+k*4,y,mix(C.scratch,C.limeD,0.6),1);
  for(let y=24;y<34;y++) px(LAMP[0],y+4,C.iron); for(let x=LAMP[0]-1;x<=LAMP[0]+3;x++) px(x,LAMP[1]+3,C.iron);   // the lamp's bracket
  for(let y=62;y<WALL_FLOOR+1;y++) for(let x=128;x<140;x++){ const e=x===128||x===139; px(x,y,e?C.bedK:((y===65||y===71)?C.iron:(x<132?C.bedF:C.bed))); }   // the night tub in the corner
  for(let x=118;x<144;x++){ const k=vnoise(x*0.3,6.6); if(k>0.4) px(x,WALL_FLOOR+1+(k>0.6?1:0),mix(C.flag[1],C.piss,Math.min(1,(k-0.4)*3))); }
}


export function initialize(){
  Object.assign(C,{vault:rgb('#0a0908'),stone:rgb('#5e5646'),stoneD:rgb('#3e382e'),stoneT:rgb('#766c58'),joint:rgb('#1e1b16'),
    brick:[rgb('#4a2e24'),rgb('#3e261e'),rgb('#54362a')],mortar:rgb('#2a2420'),lime:[rgb('#7e7864'),rgb('#6a6452')],soot:rgb('#121010'),damp:rgb('#2e342a'),slime:rgb('#26301e'),
    ash:[rgb('#6a5d48'),rgb('#5a4f3d'),rgb('#7a6c54')],bed:rgb('#4e3c28'),bedH:rgb('#62503a'),bedF:rgb('#3a2c1c'),bedK:rgb('#1c150e'),under:rgb('#0e0a06'),
    tick:rgb('#5e5844'),tickD:rgb('#4a4434'),iron:rgb('#1c1c1e'),ironH:rgb('#3a3a3e'),scratch:rgb('#857e69'),piss:rgb('#5a5626'),
    flag:[rgb('#4a4640'),rgb('#423e38'),rgb('#3a3731')],fjoint:rgb('#1e1c19'),salt:rgb('#7a766a'),rust:rgb('#5a3420'),wet:rgb('#1c1e1c'),
    limeL:rgb('#a29c86'),limeD:rgb('#4e4a3e'),crack:rgb('#0c0a08'),nail:rgb('#14100c'),straw:rgb('#7a6e48'),sky:rgb('#a8ae9e')});
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

## `src/rooms.js`

````js
import { psetK, isoLineThin, state as gymState, mkItem, quad, itemW, itemH, isoBox, isoLine, isoX, isoY, stationOf } from './gym.js';
import { state as bathState, bathEnter, bathLeave } from './bath.js';
import { isPrison, roomOpen, cellDoorOptions, yardDoorOptions, bunkOptions, lockerOptions, useSoap } from './prison.js';
import { yardLayout, state as npcsState, cnEnter, ynEnter } from './npcs.js';
import { state as progressionState, persist } from './progression.js';
import { rgb, state as appearanceState } from './appearance.js';
import { state as rendererState } from './renderer.js';
import { h2, state as boxingState, popup, drawText } from './boxing.js';
import { state as pushupsState, startPushup } from './pushups.js';
import { simTime, simUI, simNudge } from './simulation.js';
import { initAudio, sfxWhoosh, sfxChime, tone } from './audio.js';
import { stMenuClose, enterHub } from './navigation.js';
import { setInfo } from './input.js';
import { startPullups } from './pullups.js';
import { startRoaches } from './roaches.js';
import { startShadowboxing } from './shadowboxing.js';
import { stageOption, stageFor } from './training-session.js';
import { ROMAN } from './training-data.js';
import { buildCellLight } from './cell-light.js';
import { WARD_W, WARD_H, wardLayout, buildWard, drawWardItem, PALLET_Z } from './ward.js';
import { drawExerciseItem } from './exercise-yard.js';

// Runtime values owned by rooms; initialized explicitly by main.js.
export const state = {};
export const NEWSPAPER_COLORS={paper:[rgb('#d8d0b9'),rgb('#ede5d0'),rgb('#dfd8c5')],edge:rgb('#b4aa92'),ink:rgb('#a4a193'),head:rgb('#62665d'),photo:rgb('#93978a'),fold:rgb('#c3baa3'),shadow:rgb('#535349')};

/** Shared newspaper print in normalized sheet coordinates; edition 1 is the open spread. */
export function newspaperColor(u,v,k){
  if(u<0||u>1||v<0||v>1) return 0;
  const C=NEWSPAPER_COLORS,open=k===1,page=open?(u<0.5?0:1):0,pu=open?(u*2)%1:u;
  if(v>0.93||u>0.975) return C.edge;
  if(open&&Math.abs(u-0.5)<0.025) return C.fold;
  if(pu>0.88&&v<0.12&&pu-v>0.86) return C.fold;
  const tx=Math.floor(pu*14),ty=Math.floor(v*20);
  if(pu<0.1||pu>0.9||v<0.09||v>0.9) return C.paper[k];
  if(v<0.2) return tx%6===0?C.paper[k]:C.head;
  if(v<0.3) return C.paper[k];
  if(pu>0.52&&pu<0.88&&v>0.34&&v<0.59) return v>0.44&&pu>0.64&&pu<0.79?C.head:C.photo;
  if(ty%3===0&&tx%6!==0&&tx%6<4+((ty+k+page)%2)) return C.ink;
  if(Math.abs(v-0.7)<0.025) return C.fold;
  return C.paper[k];
}

/** Build the Ward and Newgate exercise yard. */
export function roomsLoad(){
  gymState.cellList=wardLayout().map(mkItem);
  gymState.yardList=yardLayout().map(mkItem);
  gymState.gymItems=gymState.hubRoom==='yard'?gymState.yardList:
    gymState.hubRoom==='laznia'?bathState.list:gymState.cellList;
}

/** Restore a prison room; retired or unknown room identifiers return to the Ward. @param {string} room */
export function setRoomRaw(room){
  const next=['cell','yard','laznia'].includes(room)?room:'cell';
  if(gymState.hubRoom==='laznia'&&next!=='laznia') bathLeave();
  gymState.hubRoom=next;
  gymState.HUB_OY=next==='yard'?26:29;
  gymState.gymItems=next==='yard'?gymState.yardList:
    next==='laznia'?bathState.list:gymState.cellList;
  if(next==='laznia') bathEnter();
  progressionState.save.room=next;
  if(next==='cell'&&npcsState.CN_READY) cnEnter();
  if(next==='yard'&&npcsState.YN_READY) ynEnter();
}

/** Recover j and height on the face at i = i1. */
export function faceI(i1,x,y){
  const c=gymState.propCamera;
  if(c){ state.fa=c.jx?(x-c.x-i1*c.ix)/c.jx:0; state.fz=(c.y+i1*c.iy+state.fa*c.jy-y)/c.z; }
  else { state.fa=i1-(x-gymState.HUB_OX)/6; state.fz=gymState.HUB_OY+(i1+state.fa)*3-y; }
}

export // face at j = j1 (runs along i)
function faceJ(j1,x,y){
  const c=gymState.propCamera;
  if(c){ state.fa=c.ix?(x-c.x-j1*c.jx)/c.ix:0; state.fz=(c.y+state.fa*c.iy+j1*c.jy-y)/c.z; }
  else { state.fa=j1+(x-gymState.HUB_OX)/6; state.fz=gymState.HUB_OY+(state.fa+j1)*3-y; }
}

export // horizontal plane at height z (fa = i, fz = j)
function floorAt(x,y,z){
  const c=gymState.propCamera;
  if(c){ const dx=x-c.x, dy=y-c.y+z*c.z, det=c.ix*c.jy-c.jx*c.iy; state.fa=det?(dx*c.jy-dy*c.jx)/det:0; state.fz=det?(c.ix*dy-c.iy*dx)/det:0; }
  else { const a=(x-gymState.HUB_OX)/6, b=(y-gymState.HUB_OY+z)/3; state.fa=(a+b)/2; state.fz=(b-a)/2; }
} // fa=i, fz=j on a horizontal plane
/** Build the shared Ward background and its lighting map. */
export function buildCell(){
  rendererState.fb=gymState.bgHub; state.homeSkyB=skyBucket();
  buildWard();
  for(const it of gymState.gymItems) if(gymState.GYM_TYPES[it.t].flat) drawCellItem(it);
  rendererState.fb=rendererState.FB_MAIN;
  buildCellLight(state.CELL_W,state.CELL_H);
}
// small ray-marched solid for round props (pail, toilet bowl, basin): for every pixel of the bbox, march down in z from the
// top; the first world point (i,j,z) for which fn returns a colour is the surface facing the camera. fn -> colour or 0.
export function solidDraw(i0,j0,i1,j1,z0,z1,fn){
  const xs=[isoX(i0,j0),isoX(i1,j0),isoX(i0,j1),isoX(i1,j1)], ys=[isoY(i0,j0,z1),isoY(i1,j1,z0),isoY(i1,j0,z0),isoY(i0,j1,z0)];
  const xa=Math.max(0,Math.floor(Math.min(...xs))), xb=Math.min(appearanceState.W-1,Math.ceil(Math.max(...xs))), ya=Math.max(0,Math.floor(Math.min(...ys))), yb=Math.min(appearanceState.H-1,Math.ceil(Math.max(...ys)));
  const K=gymState.ISO_K;
  for(let y=ya;y<=yb;y++) for(let x=xa;x<=xb;x++){
    for(let z=z1;z>=z0;z-=0.2/K){ const a=(x/K-gymState.HUB_OX)/6, b=(y/K-gymState.HUB_OY+z)/3, pi=(a+b)/2, pj=(b-a)/2;
      if(pi<i0||pi>i1||pj<j0||pj>j1) continue; const c=fn(pi,pj,z); if(c){ rendererState.fb[y*appearanceState.W+x]=c; break; } } }
}

/** A box without the black outline of isoBox: small wall things read better with edges in their own darker paint.
 * @param {number} i0 @param {number} j0 @param {number} i1 @param {number} j1 @param {number} z0 @param {number} z1 @param {number} cT
 * @param {(x:number,y:number)=>number} fnF face at j1 @param {(x:number,y:number)=>number} fnS face at i1 @param {number} edge */
function plainBox(i0,j0,i1,j1,z0,z1,cT,fnF,fnS,edge){
  quad(i0,j1,z0,i1,j1,z0,i1,j1,z1,i0,j1,z1,fnF); quad(i1,j0,z0,i1,j1,z0,i1,j1,z1,i1,j0,z1,fnS); quad(i0,j0,z1,i1,j0,z1,i1,j1,z1,i0,j1,z1,()=>cT);
  isoLine(i0,j1,z0,i1,j1,z0,edge); isoLine(i1,j0,z0,i1,j1,z0,edge);
}

/** Curtain cloth: faded green-grey with folds, a dirty hem, stains low down. @param {number} u @param {number} fz */
function curtainCol(u,fz){
  const KT=rgb('#6f877c'), KF=rgb('#586d63'), KL=rgb('#8aa092'), KH=rgb('#454c42');
  if(fz<1.4) return (h2(Math.floor(u*20),7)<120)?KH:KF;
  const f=((u*7)%1+1)%1; if(f<0.25) return KF; if(f>0.78) return KL;
  if(fz<4.5&&h2(Math.floor(u*14),Math.floor(fz))<60) return KH; return KT;
}

/** Shared enamel for the corner toilet and basin. */
const ENAMEL = {e0:'#ece8de',e1:'#d6d1c6',e2:'#b4afa4',e3:'#8a857a',in:'#9a958a',water:'#6f6a5f',grime:'#3e392f'};

/** The shared cell's toilet in the 9 o'clock corner (after the reference photo): back to the left wall, facing into the cell.
 * A round bowl with a wide bare rim and no seat, a hump at the back, a narrow pedestal on a flat foot plate, grime at the base.
 * @param {any} it */
function drawDoorToilet(it){
  const tc=it.j+itemH(it)/2, tw=0.04, E=ENAMEL, E0=rgb(E.e0), E1=rgb(E.e1), E2=rgb(E.e2), E3=rgb(E.e3), GR=rgb(E.grime);
  const shade=(/** @type {number} */ ny,/** @type {number} */ z)=>z<0.15?GR:ny>0.3?E0:(ny<-0.4?E2:E1);         // lit towards +j, the room side
  isoLine(tw+0.3,tc,4.0,0.01,tc,4.0,appearanceState.C_STEEL2);                                                      // outlet into the wall
  solidDraw(tw,tc-0.5,tw+1.05,tc+0.5,0,7,(pi,pj,pz)=>{
    if(pz>5.25){ const dj=(pj-tc)/0.26, top=5.25+2.1*Math.sqrt(Math.max(0,1-dj*dj));                             // the hump at the back
      if(Math.abs(dj)<=1&&pi<tw+0.38&&pz<=top) return pz>top-0.25?E0:(dj>0.3?E0:(dj<-0.4?E2:E1)); return 0; }
    if(pz>3.0){ const u=(pz-3)/2.25, ci=tw+0.55, ri=0.5*(0.8+0.2*u), rj=0.45*(0.8+0.2*u), nx=(pi-ci)/ri, ny=(pj-tc)/rj, q=nx*nx+ny*ny;   // the bowl
      if(q>1||pi<tw+0.05) return 0;
      if(pz>5.0){ const w=((pi-ci-0.03)/(ri*0.7))**2+(ny/0.72)**2; if(w<0.3) return rgb(E.water); if(w<1) return (h2(Math.floor(pi*30),Math.floor(pj*30))<50)?E3:rgb(E.in); return E0; }   // rim, the dirty inside
      return pz<3.3?E2:shade(ny,pz); }
    if(pz>0.55){ const t=pz/3, ri=0.2+0.08*(1-t), rj=0.17+0.07*(1-t), nx=(pi-(tw+0.6))/ri, ny=(pj-tc)/rj;        // pedestal
      if(nx*nx+ny*ny>1) return 0; return shade(ny,pz); }
    if(pi>tw+0.2&&pi<tw+0.98&&Math.abs(pj-tc)<0.3) return pz>0.4?E1:(pz<0.15?GR:E2);                               // foot plate
    return 0; });
  for(const [di,dj] of [[1.02,-0.2],[1.0,0.22],[0.3,0.33]]) psetK(Math.round(isoX(tw+di,tc+dj)),Math.round(isoY(tw+di,tc+dj,0)),GR);   // grime round the foot
  if(gymState.ISO_K>1){ const rc=0.3, rj=it.j-0.02, rr=0.13;                                                     // a roll of grey paper on the floor by the basin
    solidDraw(rc-rr,rj-rr,rc+rr,rj+rr,0,1.3,(a,b,z)=>{ const d=Math.hypot(a-rc,b-rj); if(d>rr) return 0; if(z>1.1) return d<rr*0.35?rgb('#6e6a60'):rgb('#d8d2c2'); return ((a-rc)-(b-rj))>0?rgb('#a8a294'):rgb('#c8c2b2'); }); }
  return true;
}

/** The washbasin next to the corner toilet (after the reference photo): an enamel backsplash with a badge, a D-shaped basin with
 * a rolled rim, two old taps on the wall, a trap pipe, rust running down from it and a rusty vent grate low on the wall. @param {any} it */
function drawWallSink(it){
  const jc=it.j+itemH(it)/2, hw=0.36, zb=7.6, zr=9.6, i0=0.1, dep=0.46, E=ENAMEL, E0=rgb(E.e0), E1=rgb(E.e1), E2=rgb(E.e2), ST=appearanceState.C_STEEL, S2=appearanceState.C_STEEL2, RUST=rgb('#7a4a2a');
  quad(0.02,jc-0.3,2.8,0.02,jc+0.2,2.8,0.02,jc+0.2,4.6,0.02,jc-0.3,4.6,(x,y)=>{ faceI(0.02,x,y); const u=(state.fa-(jc-0.3))/0.5, v=(state.fz-2.8)/1.8;   // vent grate under the basin
    if(u<0.07||u>0.93||v<0.12||v>0.88) return rgb('#4a3426'); return ((Math.floor(state.fa*24+state.fz*1.8)+Math.floor(state.fa*24-state.fz*1.8))&1)?rgb('#2a2420'):RUST; });
  isoLineThin(0.03,jc+0.02,zb-0.4,0.03,jc+0.02,5.2,RUST); isoLineThin(0.03,jc+0.24,zb-0.2,0.03,jc+0.24,5.6,rgb('#8f5c34'));   // rust running down the wall
  isoLine(0.28,jc,zb,0.28,jc,zb-1.5,S2); isoLine(0.28,jc,zb-1.5,0.02,jc,zb-1.9,S2);                                 // trap into the wall
  plainBox(0.02,jc-hw,0.12,jc+hw,zr-0.2,zr+2.0,E0,()=>E2,(x,y)=>{ faceI(0.12,x,y); const u=(state.fa-jc)/hw, v=state.fz-(zr+0.9);   // backsplash
    if(Math.abs(u)+Math.abs(v)*0.5<0.16) return E2; if(Math.abs(v+0.75)<0.2&&Math.abs(Math.abs(u)-0.12)<0.07) return rgb('#5e5a52'); return E0; },E2);   // the badge, two little overflow holes
  solidDraw(i0,jc-hw,i0+dep,jc+hw,zb,zr,(pi,pj,pz)=>{                                                             // basin
    const t=(pz-zb)/(zr-zb), h=hw*(0.75+0.25*t), dp=dep*(0.7+0.3*t), u=(pj-jc)/h, d=(pi-i0)/dp;
    if(d<0||d>1||Math.abs(u)>1||Math.abs(u)**3+d**3>1) return 0;
    if(pz>zr-0.3){ const uu=(pj-jc)/(h*0.75), vv=(pi-i0-0.04)/(dp*0.75), q=uu*uu+vv*vv; if(vv<0) return E0; if(q<0.05) return rgb('#4d4a44'); if(q<1) return rgb(E.in); return E0; }
    if(t<0.15) return E2; return u>0.25?E0:(u<-0.4?E2:E1); });
  for(const s of [-1,1]){ const tj=jc+s*0.2;                                                                     // taps
    psetK(Math.round(isoX(0.03,tj)),Math.round(isoY(0.03,tj,12.9)),rgb('#c9ccd0'));
    isoLine(0.03,tj,12.6,0.24,tj,12.6,ST); isoLine(0.24,tj,12.6,0.24,tj,11.9,ST); psetK(Math.round(isoX(0.06,tj)),Math.round(isoY(0.06,tj,13.7)),S2); }
  return true;
}

/** The curtain closing the toilet corner off from the door: shut between the door and the basin, pulled back on the room side.
 * Its own item, so somebody washing at the basin is drawn in front of it. @param {any} it */
function drawCornerCurtain(it){
  const j0=it.j+itemH(it)/2, jw=state.CELL_H, i1=it.i+itemW(it), zc=15;
  isoLine(0.02,j0,zc+0.3,i1,j0,zc+0.3,appearanceState.C_STEEL); isoLine(i1,j0,zc+0.3,i1,jw,zc+0.3,appearanceState.C_STEEL);   // L-rail: out of the wall, then along the open side
  quad(0.02,j0,0.8,i1,j0,0.8,i1,j0,zc,0.02,j0,zc,(x,y)=>{ faceJ(j0,x,y); return curtainCol(state.fa,state.fz); });         // shut on the door side
  quad(i1,j0,0.8,i1,j0+0.42,0.8,i1,j0+0.42,zc,i1,j0,zc,(x,y)=>{ faceI(i1,x,y); return curtainCol((state.fa-j0)*1.7,state.fz); });   // pulled back, bunched
  for(let k=0;k<4;k++){ const a=j0+0.06+k*0.12; isoLine(i1,a,zc,i1,a,zc+0.3,appearanceState.C_OUT); }                  // rings
  isoLine(i1,jw,zc+0.3,i1,jw,zc-0.7,appearanceState.C_STEEL2);                                                             // bracket on the cut-away wall
  return true;
}

export function drawCellItem(it){
  if(gymState.hubRoom==='yard'&&drawExerciseItem(it)) return true;   /* the exercise yard's gate and drain */
  if(gymState.hubRoom==='cell'&&!gymState.propCamera&&drawWardItem(it)) return true;   /* the Ward's own furniture */
  const i=it.i, j=it.j, w=itemW(it), h=itemH(it);
  switch(it.t){
    case 'cshadow': case 'cfloor': return true;   // bare floor: inmates keep the cell spotless, nothing marks where you train
    case 'cradio': {   // the prison radio's wall speaker (kołchoźnik): brown bakelite box, cloth grille, its wire up to the conduit
      const j0=j+0.08, j1=j+h-0.08, i1=0.26, z0=16.6, z1=19.4;
      const BT=rgb('#8a6440'), BF=rgb('#6b4a2c'), BS=rgb('#563a22'), GR=rgb('#b4a282'), GD=rgb('#a08c6c');
      isoLine(0.15,(j0+j1)/2,z1,0.02,(j0+j1)/2,20.4,state.CLC.conduit);
      plainBox(0.02,j0,i1,j1,z0,z1,BT,()=>BF,(x,y)=>{ faceI(i1,x,y); const u=(state.fa-j0)/(j1-j0), v=(state.fz-z0)/(z1-z0);
        if(u<0.14||u>0.86||v<0.16||v>0.84) return BS;
        return ((x+y)&1)?GD:GR; },BS);                                                           // cloth grille
      return true; }
    case 'ccross': {   // a small dark wooden cross on the wall
      const jc=j+h/2, W=rgb('#4a3020'), Hl=rgb('#7a5a3a');
      isoLine(0.03,jc,16.2,0.03,jc,19.6,W); isoLine(0.03,jc-0.25,18.5,0.03,jc+0.25,18.5,W);
      psetK(Math.round(isoX(0.03,jc)),Math.round(isoY(0.03,jc,19.4)),Hl);
      return true; }
    case 'ccal': {     // a wall calendar from the canteen kiosk: a beach picture over the month grid, a red band between
      const j0=j, j1=j+h, z0=16.4, z1=19.9;   // on the left wall, next to the cross, above the curtain rail
      quad(0.02,j0,z0,0.02,j1,z0,0.02,j1,z1,0.02,j0,z1,(x,y)=>{ faceI(0.02,x,y); const u=(j1-state.fa)/(j1-j0), v=(state.fz-z0)/(z1-z0);
        if(v>0.56){ if(Math.hypot((u-0.55)*1.6,v-0.78)<0.16) return rgb('#c98a64');                // the girl on the beach
          return v>0.8?rgb('#6f9fc0'):rgb('#d8c08a'); }
        if(v>0.49) return rgb('#a8352b');
        return ((x+y*2)%3===0&&v>0.06)?rgb('#6a6250'):rgb('#e4dcc6'); });                       // month grid
      return true; }
    case 'cdoor': case 'ydoor': {
      const a0=j+0.05, a1=j+h-0.05, Hd=19.5;
      const fn=(x,y)=>{ const a=(gymState.HUB_OX-x)/6, z=gymState.HUB_OY+a*3-y, u=(a-a0)/(a1-a0);
        if(u<0.04||u>0.96||z>Hd) return appearanceState.C_OUT; if(z>Hd-0.9) return appearanceState.C_OUT;
        if(u<0.13||u>0.87||z>Hd-3) return state.CLC.dFr;
        if(u>0.44&&u<0.56&&z>14.4&&z<16.8){ const d=Math.hypot((u-0.5)*(a1-a0)*6,z-15.6); return d<0.9?rgb('#0d0f0c'):(d<1.8?state.CLC.dLens:state.CLC.dFr); }      // spy-hole
        if(u>0.28&&u<0.72&&z>7.2&&z<10.8){                                                                                         // food hatch
          if(u<0.3||u>0.7||z<7.5||z>10.5) return appearanceState.C_OUT;
          if(z>10||Math.abs(u-0.5)<0.03&&z<8.2) return state.CLC.dHi; if(z<8) return state.CLC.dR;
          if(u>0.6&&u<0.66&&z>8.7&&z<9.4) return state.CLC.dLock; return state.CLC.dHatch; }
        if(u>0.77&&u<0.83&&z>6.6&&z<10.6) return (z>8.6&&z<9.4&&Math.abs(u-0.8)<0.015)?appearanceState.C_OUT:state.CLC.dLock;                            // lock plate
        if(z>11.6&&z<12.5&&u>0.16&&u<0.84) return state.CLC.dBolt;                                                                        // bolt bar
        if((z>5.2&&z<6.6)||(z>13.2&&z<14.2)){ return (((x+y)&3)===0&&z>5.9&&z<6.3)||(Math.abs(u-0.2)<0.02||Math.abs(u-0.8)<0.02)?state.CLC.dHi:state.CLC.dR; }
        return (((x*3+y*5)%17)===0)?state.CLC.dR:state.CLC.dP; };
      quad(0,a0,0,0,a1,0,0,a1,Hd,0,a0,Hd,fn);
      quad(0.05,a0,0.2,0.55,a0,0.2,0.55,a1,0.2,0.05,a1,0.2,(x,y)=>((x^y)&3)?rgb('#4a4234'):rgb('#3a3226'));   // worn threshold
      return true; }
    case 'bunk': case 'bunk2': {
      // cream steel bunk after the reference photo: 4 tall square cream posts, wide flat cream side rails, end panels with
      // two horizontal bars, bare white quilted mattresses; a maroon ladder at the wall end of the long side that ends in a
      // maroon guard rail running along the UPPER bunk only; two red-brown drawers under the lower bed.
      const B2=it.t==='bunk2', L=B2?w:h, Wd=B2?h:w, pw=0.08, FO=gymState.bunkFront;   // FO: only the parts in front of a sleeper
      const mp=(a,b)=>B2?[i+a,j+b]:[i+b,j+a];
      const GT=rgb('#f7eec0'), GF=rgb('#eedc94'), GS=rgb('#d2ba6a'), GE=rgb('#6b5a2c'), GH=rgb('#fff8d8'), GD=rgb('#9c8446');   // cream enamel (brighter + yellower than the tan wall)
      const RT=rgb('#b4473c'), RF=rgb('#91332b'), RS=rgb('#6e2620'), RH=rgb('#cc6353'), RD=rgb('#521b16');                    // maroon ladder / rail
      const gbox=(i0,j0,i1,j1,z0,z1,cT,cF,cS,fnT,E0)=>{
        const thin=(i1-i0<0.3||j1-j0<0.3), E=E0||(thin?cS:GE);
        quad(i0,j1,z0,i1,j1,z0,i1,j1,z1,i0,j1,z1,()=>cF);
        quad(i1,j0,z0,i1,j1,z0,i1,j1,z1,i1,j0,z1,()=>cS);
        quad(i0,j0,z1,i1,j0,z1,i1,j1,z1,i0,j1,z1,fnT||(()=>cT));
        isoLine(i0,j0,z1,i1,j0,z1,E); isoLine(i0,j0,z1,i0,j1,z1,E); isoLine(i0,j1,z1,i1,j1,z1,E); isoLine(i1,j0,z1,i1,j1,z1,E);
        if(!thin){ isoLine(i0,j1,z0,i1,j1,z0,E); isoLine(i1,j0,z0,i1,j1,z0,E);
        isoLine(i0,j1,z0,i0,j1,z1,E); isoLine(i1,j1,z0,i1,j1,z1,E); isoLine(i1,j0,z0,i1,j0,z1,E); } };
      const gb=(a0,b0,a1,b1,z0,z1,cT,cF,cS,fnT,E)=>{ const p=mp(a0,b0), q=mp(a1,b1);
        gbox(Math.min(p[0],q[0]),Math.min(p[1],q[1]),Math.max(p[0],q[0]),Math.max(p[1],q[1]),z0,z1,cT||GT,cF||GF,cS||GS,fnT,E); };
      const ln=(a0,b0,z0,a1,b1,z1,c)=>{ const p=mp(a0,b0), q=mp(a1,b1); isoLine(p[0],p[1],z0,q[0],q[1],z1,c); };
      const GO=rgb('#2c2615');                                                                   // dark outline, like the other cell props
      const post=(a,b)=>{ const c=a+pw/2, d=b+pw/2;                                              // thin square tube: lit + shaded 1px
        ln(c,d,0,c,d,21.6,GF); ln(c+(B2?0.09:0),d+(B2?0:0.09),0,c+(B2?0.09:0),d+(B2?0:0.09),21.6,GS); ln(c,d,21.6,c,d,21.6,GH); };
      const panel=(a)=>{                                                                         // end panel: top bar + 3 vertical slats per level
        for(const [z0,z1] of [[15.2,20.3],[6.2,9.0]]){
          for(let k=1;k<=3;k++){ const b=0.1+(Wd-0.2)*k/4; ln(a,b,z0,a,b,z1,GF); }
          gb(a-0.05,0.1,a+0.05,Wd-0.1,z1,z1+0.6); } };
      const quilt=(zt)=>(x,y)=>{ floorAt(x,y,zt); const u=B2?state.fa-i:state.fz-j, v=B2?state.fz-j:state.fa-i;                      // quilted top, diamond stitching
        const s=Math.floor((u+v)*3.2)+Math.floor((u-v)*3.2); const d=((u+v)*3.2%1+1)%1;
        if(d<0.12||((((u-v)*3.2)%1+1)%1)<0.12) return rgb('#cfd3d5'); return (s&1)?rgb('#f1f1ec'):rgb('#e7e8e3'); };
      const bedding=(zm,lv)=>{                                                                   // thin white quilted mattress + folded sheet at the head
        gb(0.12,0.12,L-0.12,Wd-0.12,zm,zm+1.3,rgb('#eeeeea'),rgb('#d7d8d4'),rgb('#babcb9'),quilt(zm+1.3),rgb('#a2a6a8'));
        gb(0.18,0.22,0.8,Wd-0.2,zm+1.3,zm+2.0,rgb('#f6f4ee'),rgb('#dcd9d0'),rgb('#c0bdb3'),null,rgb('#aaa79d'));   // pillow
        if(lv) gb(0.85,0.2,1.35,Wd-0.18,zm+1.3,zm+1.85,rgb('#f2f0e8'),rgb('#d5d2c8'),rgb('#b8b5ab'),null,rgb('#a4a197')); };  // folded sheet
      // --- back things first
      if(!FO){ post(0,0);
      panel(0.07);
      gb(0.15,0.02,L-0.15,0.14,2.9,4.9); gb(0.15,0.02,L-0.15,0.14,11.9,13.9);                    // back rails (mostly hidden)
      post(0,Wd-pw); post(L-pw,0); }
      // --- two wooden drawers under the lower bed (walnut, flush with the front, cut-out grip at the top)
      const DT=rgb('#a06a3e'), DF=rgb('#8c5832'), DS=rgb('#704526'), DE=rgb('#3a2213'), DG=rgb('#9a643a'), DN=rgb('#1e120a');
      const dA0=pw+0.03, dA1=L-pw-0.03, dM=L/2;
      if(!FO){
      gb(dA0,0.2,dM-0.03,Wd-0.02,0.3,2.85,DT,DF,DS,null,DE); gb(dM+0.03,0.2,dA1,Wd-0.02,0.3,2.85,DT,DF,DS,null,DE);
      ln(dA0,Wd,1.3,dM-0.1,Wd,1.3,DG); ln(dM+0.1,Wd,1.8,dA1,Wd,1.8,DG);                           // grain
      ln(dM,Wd,0.3,dM,Wd,2.85,DE);                                                               // seam between the drawers
      for(const c of [(dA0+dM)/2,(dM+dA1)/2]) ln(c-0.2,Wd,2.5,c+0.2,Wd,2.5,DN);                    // grip cut-outs
      ln(dA0,Wd,0.2,dA1,Wd,0.2,DE);                                                              // bottom edge
      }
      // --- lower bed then upper bed
      for(const lv of [0,1]){
        const zf=lv?11.9:2.9, zm=zf+2.0;
        if(!FO){ gb(0,0,0.14,Wd,zf,zm);                                                        // head-end rail
        bedding(zm,lv); }
        gb(0,Wd-0.14,L,Wd,zf,zm);                                                              // wide flat side rail, front
        ln(0,Wd+0.02,zf-0.3,L,Wd+0.02,zf-0.3,GO);                                              // its dark underside
        ln(0.15,Wd,zm-0.4,L-0.15,Wd,zm-0.4,GH);                                                // enamel highlight on the flat bar
        gb(L-0.14,0,L,Wd,zf,zm);                                                               // foot-end rail
        ln(pw,Wd+0.02,zm+2.6,0.75,Wd+0.02,zm,GD); ln(L-pw,Wd+0.02,zm+2.6,L-0.75,Wd+0.02,zm,GD);   // diagonal braces post -> side rail
        if(lv){ ln(pw,Wd,zf-2.2,0.5,Wd,zf,GD); ln(L-pw,Wd,zf-2.2,L-0.5,Wd,zf,GD); }             // brackets under the upper frame
      }
      post(L-pw,Wd-pw);
      panel(L-0.07);
      if(!B2&&!it.hideShirt){                                                                    // prison work shirt drying over the upper foot bar
        const sj=j+L+0.03, s0=i+0.16, s1=i+Wd-0.12, zt0=20.9, zb=13.6, sw=s1-s0;
        const BT=rgb('#5d7189'), BF=rgb('#4b5c71'), BL=rgb('#7388a1'), BD=rgb('#3c4a5a'), BG=rgb('#566057');
        quad(s0,sj,zb,s1,sj,zb,s1,sj,zt0,s0,sj,zt0,(x,y)=>{ faceJ(sj,x,y); const u=(state.fa-s0)/sw, v=(zt0-state.fz)/(zt0-zb);
          const body=u>0.2&&u<0.8, sleeve=(u<=0.2||u>=0.8)&&v<0.62-(u<0.2?(0.2-u):(u-0.8))*0.9;
          if(!body&&!sleeve) return 0;
          if(v<0.09) return BD;                                                                    // fold over the bar
          if(body&&v<0.2&&Math.abs(u-0.5)<0.12) return BL;                                         // collar
          if(body&&Math.abs(u-0.5)<0.03&&v>0.2) return ((Math.floor(v*9))&1)?rgb('#c9ccc4'):BF;     // button placket
          if(body&&v>0.9) return BF;                                                               // hem
          if(h2(Math.floor(u*11),Math.floor(v*9))<34) return BG;                                   // grime
          if(sleeve) return u<0.2?BL:BF;
          const f=(u*5)%1; return f<0.18?BF:(f>0.85?BL:BT); });
        ln(0.2,Wd,zt0+0.2,0.2,Wd-0.01,zt0+0.2,BD);
      }
      // --- maroon ladder in the left third of the long side as seen by the camera (like the reference; on the left bunk
      //     that is the end away from the wall, so the cabinet no longer hides it). Its stiles rise above
      //     the upper bunk, bend outwards and run on as the guard rail to the posts - two rail sections, gap = the way in.
      //     1px lines: at 144x96 boxes would merge into a red block.
      const bx=Wd+0.06, lad0=B2?L*0.3:L*0.7-0.62, lad1=lad0+0.62, zR=18.6, bend=0.16;
      ln(lad0,bx,3.0,lad0,bx,zR-0.9,RF); ln(lad1,bx,3.0,lad1,bx,zR-0.9,RF);                                   // stiles
      for(const z of [4.4,7.4,10.4,13.4]) ln(lad0,bx,z,lad1,bx,z,RT);                                          // rungs
      ln(lad0,bx,zR-0.9,lad0-bend,bx,zR,RH); ln(lad1,bx,zR-0.9,lad1+bend,bx,zR,RH);                           // the bends
      ln(pw+0.02,bx,zR,lad0-bend,bx,zR,RT); ln(lad1+bend,bx,zR,L-pw-0.02,bx,zR,RT);                           // guard rail -> posts
      ln(pw+0.02,bx,zR,pw+0.02,bx,zR,RD); ln(L-pw-0.02,bx,zR,L-pw-0.02,bx,zR,RD);                             // bolts on the posts
      return true; }
    case 'crad': {
      const j1=j+h;
      isoBox(i,j,i+w,j1,2.2,9.5,state.CLC.rdT,state.CLC.rdF,state.CLC.rdS,(x,y)=>{ faceJ(j1,x,y); const u=(state.fa-i)*7, f=u-Math.floor(u); if(state.fz<3||state.fz>8.6) return state.CLC.rdG; return f<0.28?state.CLC.rdG:state.CLC.rdF; });
      isoLine(i+0.1,j+0.05,2.2,i+0.1,j+0.05,0.5,state.CLC.rdG); isoLine(i+w-0.1,j+0.05,2.2,i+w-0.1,j+0.05,0.5,state.CLC.rdG);
      return true; }
    case 'ccom': {    // hanging cabinet after the photo: a long box in brown wood-grain veneer, two sliding doors covered in
                      // flowered paper with round green knobs at the ends, open cubbies with a shelf in the middle (a mug, a jar, a box)
      const i0=i+0.05, i1=i+w-0.02, j0=0.02, j1=j+h-0.12, z0=12.4, z1=18.4;
      const VT=rgb('#9a6a3a'), VF=rgb('#7a4c26'), VS=rgb('#5e3a1c'), VE=rgb('#3e2612'), IN=rgb('#3b2614');
      const P0=rgb('#d6c8a2'), PP=rgb('#b4868a'), PG=rgb('#7d8c5c'), GK=rgb('#2e7d3c');
      const paper=(/** @type {number} */ a,/** @type {number} */ b)=>{ const n=h2(Math.floor(a*30),Math.floor(b*2.2)); return n<18?PP:n<32?PG:P0; };
      quad(i0+0.05,0.03,z0-0.8,i1-0.05,0.03,z0-0.8,i1-0.05,0.03,z0,i0+0.05,0.03,z0,(x,y)=>((x+y)&1)?state.CLC.wU[2]:0);   // its shadow on the wall
      plainBox(i0,j0,i1,j1,z0,z1,VT,(x,y)=>{ faceJ(j1,x,y); const u=(state.fa-i0)/(i1-i0), v=(state.fz-z0)/(z1-z0);
        if(v<0.12||v>0.9||u<0.03||u>0.97) return VF;                                           // veneer frame
        if(u<0.44||u>0.72){ if(Math.abs(u-0.44)<0.02||Math.abs(u-0.72)<0.02) return VE;       // door edges
          if(Math.abs(v-0.55)<0.1&&(Math.abs(u-0.37)<0.035||Math.abs(u-0.79)<0.035)) return GK;   // green knobs
          return paper(state.fa,state.fz); }
        if(Math.abs(u-0.58)<0.025||Math.abs(v-0.5)<0.06) return VF;                            // divider and shelf
        if(u>0.47&&u<0.53&&v>0.14&&v<0.4) return rgb('#e8e2d0');                               // a white box
        if(u>0.48&&u<0.53&&v>0.57&&v<0.74) return rgb('#b3bac0');                              // tin mug
        if(u>0.62&&u<0.67&&v>0.57&&v<0.8) return rgb('#9a5e26');                               // jar of tea
        return IN; },(x,y)=>{ faceI(i1,x,y); return ((Math.floor(state.fz*1.6)+Math.floor(state.fa*8))%4===0)?VE:VS; },VE);
      return true; }
    case 'cwc': return drawDoorToilet(it);
    case 'ccurt': return drawCornerCurtain(it);
    case 'csink': return drawWallSink(it);
    case 'ctable': {   // plain wooden table (no black outline): plank top with a darker edge band, 4 wooden legs,
                       // an aluminium plate and a tin mug on top
      const i1=i+w, j1=j+h, zt=6.6, zT=zt+0.9;
      const TT=rgb('#b6773c'), TF=rgb('#8f5a2a'), TS=rgb('#6c4220'), TE=rgb('#5a3719'), TG=rgb('#a56a34'), LG=rgb('#7a4a22'), LD=rgb('#5c3818');
      isoLine(i+0.1,j+0.1,0,i+0.1,j+0.1,zt,LD); isoLine(i1-0.1,j+0.1,0,i1-0.1,j+0.1,zt,LD);            // back legs
      isoLine(i+0.1,j1-0.1,0,i+0.1,j1-0.1,zt,LG);
      quad(i,j1,zt,i1,j1,zt,i1,j1,zT,i,j1,zT,()=>TF); quad(i1,j,zt,i1,j1,zt,i1,j1,zT,i1,j,zT,()=>TS);
      quad(i,j,zT,i1,j,zT,i1,j1,zT,i,j1,zT,(x,y)=>{ floorAt(x,y,zT); const f=((state.fz-j)*4.6)%1;              // planks + grain
        return f<0.1?TE:((h2(Math.floor(state.fa*7),Math.floor(state.fz*4.6))<40)?TG:TT); });
      isoLine(i,j1,zt,i1,j1,zt,TE); isoLine(i1,j,zt,i1,j1,zt,TE);                                       // underside edge (brown, not black)
      isoLine(i1-0.1,j1-0.1,0,i1-0.1,j1-0.1,zt,LG);                                                       // front leg
      // aluminium plate: shallow disc with a raised rim
      const pc=i+0.75, pj=j+0.62, pr=0.3;
      solidDraw(pc-pr,pj-pr,pc+pr,pj+pr,zT,zT+0.45,(a,b,z)=>{ const d=Math.hypot(a-pc,b-pj); if(d>pr) return 0;
        if(z>zT+0.3) return d>pr*0.72?rgb('#d7dbe0'):((h2(Math.floor(a*30),Math.floor(b*30))<40)?rgb('#8d949b'):rgb('#a9b0b7'));
        return ((a-pc)-(b-pj))>0?rgb('#7b8289'):rgb('#9aa1a8'); });
      // tin mug with a handle
      const mc=i+1.45, mj=j+0.5, mr=0.11;
      solidDraw(mc-mr,mj-mr,mc+mr,mj+mr,zT,zT+1.9,(a,b,z)=>{ const d=Math.hypot(a-mc,b-mj); if(d>mr) return 0;
        if(z>zT+1.7) return d>mr*0.6?rgb('#dfe3e6'):rgb('#3a3f44');
        return ((a-mc)-(b-mj))>0.02?rgb('#7d848b'):rgb('#b3bac0'); });
      psetK(Math.round(isoX(mc+mr+0.06,mj-0.06)),Math.round(isoY(mc+mr+0.06,mj-0.06,zT+1.0)),rgb('#7d848b'));
      if(gymState.ISO_K>1){   // the 2× room has room for the small things: a tin ashtray with butts, a pack of Popularne
        const ac=i+1.25, aj=j+0.98, ar=0.16;
        solidDraw(ac-ar,aj-ar,ac+ar,aj+ar,zT,zT+0.35,(a,b,z)=>{ const d=Math.hypot(a-ac,b-aj); if(d>ar) return 0;
          if(z>zT+0.25){ if(d<ar*0.7) return (h2(Math.floor(a*60),Math.floor(b*60))<70)?rgb('#e8e2d4'):rgb('#5e5a52'); return rgb('#b8bcc0'); } return rgb('#80868c'); });
        plainBox(i+0.35,j+0.9,i+0.62,j+1.08,zT,zT+0.9,rgb('#e4dccb'),(x,y)=>{ faceJ(j+1.08,x,y); return state.fz>zT+0.55?rgb('#b3332a'):rgb('#e4dccb'); },(x,y)=>{ faceI(i+0.62,x,y); return state.fz>zT+0.55?rgb('#8a2620'):rgb('#c4bcaa'); },rgb('#8a2620'));
      }
      return true; }
    case 'cstool': {   // steel-legged stool with a green seat
      const i1=i+w, j1=j+h, zs=4.2, zS=5.1;
      const ST=rgb('#5e8a55'), SF=rgb('#48703f'), SS=rgb('#375631'), SE=rgb('#27401f'), SH=rgb('#79a36c'), LG=rgb('#9aa0a6'), LD=rgb('#6d737a');
      isoLine(i+0.08,j+0.08,0,i+0.08,j+0.08,zs,LD); isoLine(i1-0.08,j+0.08,0,i1-0.08,j+0.08,zs,LD); isoLine(i+0.08,j1-0.08,0,i+0.08,j1-0.08,zs,LG);
      quad(i,j1,zs,i1,j1,zs,i1,j1,zS,i,j1,zS,()=>SF); quad(i1,j,zs,i1,j1,zs,i1,j1,zS,i1,j,zS,()=>SS);
      quad(i,j,zS,i1,j,zS,i1,j1,zS,i,j1,zS,(x,y)=>{ floorAt(x,y,zS); return ((state.fa-i)<0.14||(state.fz-j)<0.14)?SH:ST; });
      isoLine(i,j1,zs,i1,j1,zs,SE); isoLine(i1,j,zs,i1,j1,zs,SE);
      isoLine(i1-0.08,j1-0.08,0,i1-0.08,j1-0.08,zs,LG);
      return true; }
    case 'cwheel': {   // old steel wheelchair facing +j: two big wheels with hand rims, leather seat and back, casters, footrest
      const i0=i+0.08, i1=i+w-0.08, j0=j+0.12, j1=j+h-0.1, FO=gymState.bunkFront;
      const FR=rgb('#a4aab0'), FD=rgb('#6c737a'), TY=rgb('#18181a'), TYL=rgb('#3a3a3e'), LE=rgb('#3e302a'), LL=rgb('#5a4638'), LD=rgb('#2a201c');
      const wheel=(/** @type {number} */ wi)=>{ const jc=j0+0.38, R=0.42, zc=3.7, ZR=3.6; let pj=jc+R, pz=zc;
        for(let a=1;a<=24;a++){ const t=a/24*Math.PI*2, nj=jc+R*Math.cos(t), nz=zc+ZR*Math.sin(t); isoLine(wi,pj,pz,wi,nj,nz,TY); isoLine(wi,pj,pz-0.5,wi,nj,nz-0.5,TYL); pj=nj; pz=nz; }
        for(let a=0;a<4;a++){ const t=a/4*Math.PI*2+0.4; isoLine(wi,jc,zc,wi,jc+R*0.85*Math.cos(t),zc+ZR*0.85*Math.sin(t),FD); }
        isoLine(wi,jc,zc,wi,jc,zc+0.01,FR); };
      if(!FO){
        wheel(i0);
        quad(i0+0.1,j0+0.02,5.4,i1-0.1,j0+0.02,5.4,i1-0.1,j0+0.02,11.4,i0+0.1,j0+0.02,11.4,(x,y)=>((x+y)%5===0?LD:LE));          // backrest
        isoLine(i0+0.08,j0,5,i0+0.08,j0,12.4,FD); isoLine(i1-0.08,j0,5,i1-0.08,j0,12.4,FR);                                   // back posts
        isoLine(i0+0.08,j0,12.4,i0+0.08,j0-0.22,12.6,TY); isoLine(i1-0.08,j0,12.4,i1-0.08,j0-0.22,12.6,TY);                   // push handles
        quad(i0+0.1,j0+0.05,5.1,i1-0.1,j0+0.05,5.1,i1-0.1,j1-0.12,5.1,i0+0.1,j1-0.12,5.1,(x,y)=>{ floorAt(x,y,5.1); return (state.fz-j0)<0.12?LD:((x+y)&3)===0?LL:LE; });   // seat
        isoLine(i0+0.1,j0+0.05,8.2,i0+0.1,j0+0.7,8.2,FD); isoLine(i0+0.1,j0+0.7,8.2,i0+0.1,j0+0.7,5.1,FD);                   // far armrest
        isoLine(i0+0.12,j1-0.12,5,i0+0.12,j1,1.4,FD); isoLine(i0+0.14,j1,0.6,i0+0.14,j1,0.61,TY);                             // far front leg + caster
      }
      wheel(i1);
      isoLine(i1-0.1,j0+0.05,8.2,i1-0.1,j0+0.7,8.2,FR); isoLine(i1-0.1,j0+0.7,8.2,i1-0.1,j0+0.7,5.1,FR);                       // near armrest
      isoLine(i1-0.12,j1-0.12,5,i1-0.12,j1,1.4,FR); isoLine(i1-0.14,j1,0.6,i1-0.14,j1,0.61,TY);                                // near front leg + caster
      quad(i0+0.15,j1-0.05,1.3,i1-0.15,j1-0.05,1.3,i1-0.15,j1+0.12,1.3,i0+0.15,j1+0.12,1.3,()=>FD);                          // footrest
      return true;
    }
    case 'cbucket': {   // galvanised slop pail (redrawn): round, tapered, two pressed ribs, rolled rim, wire handle with a wooden grip
      const ci=i+w/2, cj=j+h/2, zt=5.0, rb=0.3, rt=0.4;
      const G0=rgb('#c3c9cc'), G1=rgb('#a0a7ab'), G2=rgb('#7f868b'), G3=rgb('#5f656a'), GR=rgb('#d3d8da'), GI=rgb('#2c2f2d'), GU=rgb('#7a5a36');
      solidDraw(ci-rt,cj-rt,ci+rt,cj+rt,0,zt+0.35,(pi,pj,pz)=>{
        const r=rb+(rt-rb)*Math.min(1,pz/zt)+(pz>zt-0.1?0.03:0), di=pi-ci, dj=pj-cj, d2=di*di+dj*dj;
        if(d2>r*r) return 0;
        if(pz>zt-0.05){ return d2<(r*0.8)*(r*0.8)?((h2(Math.floor(pi*30),Math.floor(pj*30))<30)?rgb('#3e3a2c'):GI):GR; }   // rim + dark inside
        const sx=(di-dj)/r;                                                                              // -1.4 (lit, left) .. 1.4 (shade, right)
        if(Math.abs(pz-1.5)<0.28||Math.abs(pz-3.4)<0.28) return sx>0.7?G2:G0;                          // pressed ribs
        if(pz<0.35) return G3;
        if(h2(Math.floor((pi+pj)*22),Math.floor(pz*1.5))<14) return GU;                                  // rust spots
        return sx<-0.55?G0:(sx<0.35?G1:(sx<0.95?G2:G3)); });
      for(let k=0;k<=24;k++){ const t=Math.PI*k/24, c=Math.cos(t)*0.7071*rt, hz=zt-0.3+2.4*Math.sin(t);   // wire handle, arcs over the top
        psetK(Math.round(isoX(ci+c,cj-c)),Math.round(isoY(ci+c,cj-c,hz)),(k>9&&k<15)?rgb('#6a4a2a'):G3); }
      return true; }
  }
  return false;
}

/** Daylight bucket shared by prison and work scene backgrounds. */
export function skyBucket(){ const h=progressionState.save.sim.min/60; return h<5?0:h<7?1:h<17.5?2:h<19.5?3:h<21.5?4:0; }

export function cellOptions(st){
  const s=progressionState.save.sim, it=st.item;
  switch(st.id){
    case 'cdoor': return cellDoorOptions(goRoom);
    case 'ydoor': return yardDoorOptions(goRoom);
    case 'cpull': return [[()=>'Podciąganie na kracie okna · stopień '+ROMAN[stageFor('pullup')-1]+' · minuta · 1 akcja',startPullups,false,'go'],stageOption('pullup')];
    case 'croach': return [[()=>'Karaluchy na ścianie · stopień '+ROMAN[stageFor('roach')-1]+' · ogarek łoju · 1 akcja',startRoaches,false,'go'],stageOption('roach')];
    case 'cshadow': return [[()=>'Walka z cieniem · stopień '+ROMAN[stageFor('shadow')-1]+' · 10 kombinacji · 1 akcja',()=>startShadowboxing(st),false,'go'],stageOption('shadow')];
    case 'cpush': return [[()=>'Pompki na gazetach · stopień '+ROMAN[stageFor('pushup')-1]+' · minuta · 1 akcja',()=>{ pushupsState.puVenue='cell'; startPushup(); },false,'go'],stageOption('pushup')];
    case 'ccom': return isPrison()?lockerOptions(st,startActivity):[];
    case 'cwash': { const soap=isPrison()&&useSoap(false), H=soap?40:20, done=isPrison()&&state.washKey===s.day*3+s.faza;   /* a quick wash at the butt: no action, once a phase */
      return [['Umyj się przy beczce z wodą · +'+H+' higieny · bez akcji'+(soap?' (mydło)':' (woda na przydział)')+(done?' — już się myłeś':''),()=>{ if(soap) useSoap(true); if(isPrison()) state.washKey=s.day*3+s.faza; startActivity(st,{kind:'wash',label:'mycie w misce',min:0,pose:0,at:[it.i+itemW(it)+0.5,it.j+0.3],face:[-1,0],order:'before',pop:state.T_WYSPANY+4,after:()=>simNudge('h',H)}); },s.h>=90||done,'act']]; }
    case 'bunk': return bunkOptions(st,startActivity,PALLET_Z-0.25);
  }
  return [];
}
/** Run a timed activity in the room (sleep, eating, washing, waiting…). @param {any} st @param {any} spec */
export function startActivity(st,spec){
  stMenuClose(); initAudio(); sfxWhoosh(0.3);
  state.hubAct=Object.assign({t:0,done:0,dur:spec.kind==='sleep'?120:70,st,item:st.item},spec);
  for(const k in gymState.hubKeys) gymState.hubKeys[k]=0; gymState.hubNear=null; persist(); setInfo();
}

export function actTick(){
  const A=state.hubAct; A.t++;
  if(A.t<=state.ACT_FADE){ gymState.hubFade=A.t/state.ACT_FADE;
    if(A.t===state.ACT_FADE){ gymState.hubP.i=A.at[0]; gymState.hubP.j=A.at[1]; gymState.hubP.fi=A.face[0]; gymState.hubP.fj=A.face[1]; gymState.hubP.pose=A.pose; gymState.hubP.poseZ=A.pz||0; gymState.hubP.moving=false; if(A.kind==='sleep') sfxChime(420); }
    return; }
  const k=A.t-state.ACT_FADE;
  if(k<=A.dur){ gymState.hubFade=k<state.ACT_FADE?1-k/state.ACT_FADE:0; A.done=k;
    if((k&7)===0) simUI();
    if(A.kind==='eat'&&k%40===20) tone('square',220,180,0.02,0.05);
    return; }
  const u=k-A.dur; gymState.hubFade=Math.min(1,u/state.ACT_FADE);
  if(u>=state.ACT_FADE){
    const st=A.st; gymState.hubP.pose=0; gymState.hubP.poseZ=0; gymState.hubP.i=st.spot[0]; gymState.hubP.j=st.spot[1];
    let fi=st.look[0]-st.spot[0], fj=st.look[1]-st.spot[1]; const l=Math.hypot(fi,fj)||1; gymState.hubP.fi=-fi/l; gymState.hubP.fj=-fj/l;   // step away, facing the room
    state.hubAct=null; gymState.fadeInT=14; gymState.hubFade=1;
    if(!A.stopped) A.after?.();   // what the activity does (an action spent, a need changed) lands once it is done
    if(!A.stopped&&A.pop>=0) popup(A.pop,72,20,appearanceState.C_SPARK,1,70);
    sfxChime(760); persist(); simUI(); setInfo();
  }
}

export function actStop(){ const A=state.hubAct; if(!A) return; A.stopped=true; if(A.t<=state.ACT_FADE){ A.t=state.ACT_FADE; } const k=A.t-state.ACT_FADE; if(k<=A.dur){ A.dur=Math.max(1,A.done); A.t=state.ACT_FADE+A.dur; } }

export function actRun(){ return state.hubAct&&state.hubAct.t>state.ACT_FADE&&state.hubAct.t<=state.ACT_FADE+state.hubAct.dur; }

export function goRoom(room,mins){
  if(!roomOpen(room)) return;
  void mins; setRoomRaw(room);   /* walking between rooms costs no action */
  const door=gymState.gymItems.find(x=>x.t===({cell:'cdoor',yard:'ydoor',laznia:'ldoor'}[gymState.hubRoom]));
  enterHub(door?stationOf(door):null);
  gymState.hubP.fi=-gymState.hubP.fi; gymState.hubP.fj=-gymState.hubP.fj;                     // came in through the door: face the room
  simUI();
}

export function dimFB(f){ const k=Math.max(0,Math.min(256,(256*(1-f))|0)); for(let i=0;i<appearanceState.W*appearanceState.H;i++){ const c=rendererState.FB_MAIN[i]; rendererState.FB_MAIN[i]=(0xff000000|((((c>>16)&255)*k>>8)<<16)|((((c>>8)&255)*k>>8)<<8)|((c&255)*k>>8))>>>0; } }

export function drawActivityOverlay(){
  const A=state.hubAct;
  if(!A) return;
  const K=gymState.ISO_K;
  if(A.kind==='sleep'&&actRun()){ dimFB(0.5); const x=Math.round(isoX(A.at[0],A.at[1]-1))+3*K, y=Math.round(isoY(A.at[0],A.at[1]-1,(A.pz||6.5)+5.5));
    for(let k=0;k<3;k++){ const ph=((boxingState.tick+k*26)%78)/78; if(ph<0.08) continue; drawText('Z',x+(k*3+Math.round(ph*4))*K,y-Math.round(ph*14)*K,ph>0.8?appearanceState.C_GRAY:appearanceState.C_WHITE,1); } }
  if(actRun()) drawText(simTime().toUpperCase(),72*K,3*K,appearanceState.C_SPARK,2);
}

export function initialize(){

// points on a vertical face: x,y -> coordinate along the face + height
state.fa = 0;
state.fz = 0;

// Newgate Ward geometry.
state.CELL_W = WARD_W;
state.CELL_H = WARD_H;

Object.assign(gymState.GYM_TYPES,{
  cdoor:{fixed:true,flat:true,z:9,st:'cdoor'}, bunk:{fixed:true,block:true,z:14,st:'bunk'}, bunk2:{fixed:true,block:true}, cpull:{fixed:true,flat:true,z:20.9,st:'cpull'}, croach:{fixed:true,flat:true,z:13,st:'croach'},
  crad:{fixed:true,block:true}, ccom:{fixed:true,block:true,z:17,st:'ccom'}, cshadow:{fixed:true,flat:true,z:0,st:'cshadow'}, cfloor:{fixed:true,flat:true,z:1,st:'cpush'}, cwc:{fixed:true,block:true}, csink:{fixed:true,block:true,z:10,st:'cwash'}, ctable:{fixed:true,block:true}, cstool:{fixed:true,block:true},
  ccurt:{fixed:true,block:true}, cradio:{fixed:true,flat:true}, ccross:{fixed:true,flat:true}, ccal:{fixed:true,flat:true}, cbucket:{fixed:true,block:true}, cwheel:{fixed:true,block:true,z:15,st:'profesor'}
});

Object.assign(gymState.ST_INFO,{cpull:['PODCIAGANIE','Krata okna nad pryczą — podciąganie'],croach:['ŚCIANA','Ściana z wyrytym GOD HELP ME — karaluchy'],cpush:['POMPKI','Wolny kawałek podłogi — pompki'],cdoor:['DRZWI','Dębowe drzwi Wardu z klapą'],bunk:['PRYCZA','Prycza — sen'],cwash:['BECZKA','Beczka z wodą — zimna woda na przydział'],ccom:['SKRZYNIA','Skrzynia — zapasy kupione przez klapę']});
gymState.ST_INFO.cshadow=['WALKA Z CIENIEM','Wolne miejsce na środku — shadowboxing'];
gymState.ST_INFO.profesor=['PROFESOR','Profesor — stary pięściarz w fotelu na kółkach'];

state.CLC = {
  wU:[rgb('#b3a67c'),rgb('#a4976e'),rgb('#8a7e5a')], wL:[rgb('#5d6b58'),rgb('#505d4c'),rgb('#3c473a')],
  plaster:rgb('#8e8570'), plaster2:rgb('#776f5d'), damp:rgb('#3d4a3c'), mold:rgb('#2f3a2e'), line:rgb('#2f382d'), conduit:rgb('#2d2c26'), switchW:rgb('#d4d0be'),
  frT:rgb('#c2b174'),frF:rgb('#a09054'),frS:rgb('#7a6d3e'), mT:rgb('#dcd8c6'),mF:rgb('#b8b4a1'),mS:rgb('#97937f'), bT:rgb('#737a6c'),bF:rgb('#5d6356'),bS:rgb('#494e43'),
  red:rgb('#8a5234'),red2:rgb('#5f3822'),
  tbT:rgb('#b6773c'),tbF:rgb('#8f5a2a'),tbS:rgb('#6c4220'),
  stT:rgb('#cfc8ae'),stF:rgb('#a8a188'),stS:rgb('#877f6a'),
  rdT:rgb('#e2e3df'),rdF:rgb('#c5c7c3'),rdS:rgb('#a3a5a2'),rdG:rgb('#8f918d'),
  zT:rgb('#aeb2b3'),zF:rgb('#82878b'),zS:rgb('#62676c'),zL:rgb('#93989b'),
  bwT:rgb('#e8e6dc'),bwF:rgb('#c9c7bb'),bwS:rgb('#a8a698'),bwIn:rgb('#8f9aa8'),rim:rgb('#3f5fa8'),
  jgT:rgb('#4b6fb8'),jgF:rgb('#38549a'),jgS:rgb('#2a3f78'),
  cbT:rgb('#8d928a'),cbF:rgb('#737870'),cbS:rgb('#5a5e56'),
  dFr:rgb('#262c34'),dP:rgb('#46515e'),dR:rgb('#343d48'),dHi:rgb('#7a8797'),dHatch:rgb('#323b46'),dLens:rgb('#9aa596'),dBolt:rgb('#2a2d28'),dLock:rgb('#c2b174'),
  tile:[rgb('#8a8472'),rgb('#7f7969'),rgb('#928c79')], grout:rgb('#66624f'), stain:rgb('#6f6a5a')
};

state.cellSkyB = -1;

state.SKY = [['#0b1030','#16204a'],['#f09060','#5a3a78'],['#9cc8ee','#5a94d0'],['#f0a050','#a0507a'],['#3a2a60','#1a1a44']];

state.homeSkyB = -1;
state.homeWx = '';   // the weather the background was built for


/* ---------- activities: sleep, nap, rest, meals, shower (the clock runs while they last) ---------- */
state.hubAct = null;

state.T_WYSPANY = boxingState.TXT.length;
 boxingState.TXT.push('WYSPANY!','DZIEN DOBRY','ODPOCZETY','MNIAM!','SWIEZY!','KRZEPA!');

state.ACT_FADE = 10;
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

## `scripts/render-room.mjs`

````js
// Render a hub room for art review: one contact sheet with the room at several hours and an optional close-up.
//   node scripts/render-room.mjs --room=yard --times=600,1230 --crop=40:60:120:80 --people=none --out=yard
// --room     cell | yard | laznia (default cell)
// --times    minutes of the day, comma separated (default 600,1230 = 10:00 and 20:30)
// --crop     x:y:w:h in picture pixels (the 2× rooms are 288×192) for a close-up of the first hour
// --people   live (as the game has them) | none (empty room, for the furniture) (default live)
// --eval     JavaScript run in the page after entering the room, to set a scene up (await import('/src/…') works);
//            with --fight it may set globalThis.__after = async b => {…} to run once the scene has started and
//            globalThis.__frame = async (b, k) => {…} to run before frame k is drawn
// --anim     n:gap — instead of the hours, n close-ups (needs --crop) of the first hour, the game stepped gap ticks between them
// --fight    n:gap — the fight scene of the room's venue (cell, yard, canteen, laznia) against opponent 0, the card planning pose:
//            n frames of the whole 144×96 picture, the fight stepped gap ticks between them (ignores --times/--crop/--anim)
// --mini     pullup|pushup|roach — with --fight=n:gap: the cell's pull-up, push-up or roach-wall scene instead of a fight
// --arm      n:gap — the arm wrestling close-up (the canteen), like --fight; the rival pulls, nobody presses
// Writes artifacts/tmp/<out>.png (ignored by git). Math.random is seeded, so the same call gives the same picture.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';

const arg = (k, d) => process.argv.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const setup = arg('eval', ''), mini = arg('mini', ''), arm = arg('arm', ''), fight = arg('fight', '') || arm, anim = arg('anim', ''), room = arg('room', 'cell'), times = arg('times', '600,1230').split(',').map(Number), crop = arg('crop', ''), people = arg('people', 'live'), out = arg('out', room);
const port = 5194, root = new URL('..', import.meta.url).pathname;
const server = spawn(process.execPath, ['scripts/serve.mjs'], { cwd: root, env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'inherit'] });
await once(server.stdout, 'data');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { let seed = 123456789; Math.random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; }; });
  await page.goto(`http://127.0.0.1:${port}/?debug=1`); await page.waitForFunction(() => !!window.__boxer, null, { timeout: 15000 });
  const png = await page.evaluate(async ({ room, times, crop, people, anim, setup, fight, arm, mini }) => {
    const b = window.__boxer; b.newGame('prison'); b.pause();
    const X = await import('/src/prison.js'); for (let k = 0; k < 6 && X.cardOpen(); k++) document.querySelector('#storyChoices button')?.click();
    const {setDevMode}=await import('/src/progression.js'); setDevMode(true);
    b.goRoom(room); b.step(120);
    const P = await import('/src/progression.js'), G = await import('/src/gym.js'), R = await import('/src/renderer.js'), B = await import('/src/boxing.js'), N = await import('/src/npcs.js'), L = await import('/src/cell-light.js'), A = await import('/src/appearance.js');
    if (setup) await (new Function('b', `return (async()=>{ ${setup} })()`))(b);
    if (people === 'none') { for (const C of [...N.state.CNL, ...N.state.YN]) { C.step = null; C.after = null; } G.state.hubP.i = -40; G.state.hubP.j = -40; }
    const frames = [], toCanvas = () => { const hd = R.hdRoom(), W = hd ? R.state.hd.W : A.state.W, H = hd ? R.state.hd.H : A.state.H, src = hd ? R.state.hd.fb : R.state.FB_MAIN;
      const c = document.createElement('canvas'); c.width = W; c.height = H; const id = new ImageData(W, H); new Uint32Array(id.data.buffer).set(src); c.getContext('2d').putImageData(id, 0, 0); return c; };
    if (fight) {   // the side-on fight scene of the venue
      const hd = !!arm || !mini, [n, gap] = fight.split(':').map(Number), SP = await import('/src/sparring.js'), cols = hd ? 2 : 3, FW = hd ? R.state.hd.W : A.state.W, FH = hd ? R.state.hd.H : A.state.H, zs = hd ? 2 : 3, fw = FW * zs, fh = FH * zs;
      P.state.save.sim.min = times[0];
      if (arm) (await import('/src/armwrestle.js')).startArm({ name: 'Wielki Wacek', fight: 3, oppRank: 1, stake: 'porcja', onEnd() {} });
      else if (mini === 'pullup') (await import('/src/pullups.js')).startPullups();
      else if (mini === 'pushup') { const PU = await import('/src/pushups.js'); PU.state.puVenue = 'cell'; PU.startPushup(); }
      else if (mini === 'roach') (await import('/src/roaches.js')).startRoaches();
      else { SP.startSpar(0, room, null); } if (globalThis.__after) await globalThis.__after(b); b.sparStep(60);
      const sheet = document.createElement('canvas'); sheet.width = cols * fw; sheet.height = Math.ceil(n / cols) * (fh + 20); const g = sheet.getContext('2d');
      g.fillStyle = '#0a0a08'; g.fillRect(0, 0, sheet.width, sheet.height); g.imageSmoothingEnabled = false; g.font = '13px Courier New'; g.fillStyle = '#d9cfb2';
      for (let k = 0; k < n; k++) { if (k) b.sparStep(gap); if (globalThis.__frame) await globalThis.__frame(b, k); R.render(); const W = FW, H = FH, c = document.createElement('canvas'); c.width = W; c.height = H;
        const id = new ImageData(W, H); new Uint32Array(id.data.buffer).set((hd ? R.state.hd.fb : R.state.FB_MAIN).subarray(0, W * H)); c.getContext('2d').putImageData(id, 0, 0);
        const x = (k % cols) * fw, y = Math.floor(k / cols) * (fh + 20); g.drawImage(c, x, y, fw, fh); g.fillText(`${room} ${arm ? 'ręka' : 'walka'} +${k * gap}`, x + 6, y + fh + 14); }
      return sheet.toDataURL('image/png');
    }
    if (anim && crop) {   // a strip of close-ups over time
      const [n, gap] = anim.split(':').map(Number), [cx, cy, cw, ch] = crop.split(':').map(Number), zs = Math.max(2, Math.floor(1152 / (cw * 4))), cols = 4, rows = Math.ceil(n / cols);
      P.state.save.sim.min = times[0]; G.hubRebake();
      const sheet = document.createElement('canvas'); sheet.width = cols * cw * zs; sheet.height = rows * (ch * zs + 20); const g = sheet.getContext('2d');
      g.fillStyle = '#0a0a08'; g.fillRect(0, 0, sheet.width, sheet.height); g.imageSmoothingEnabled = false; g.font = '13px Courier New'; g.fillStyle = '#d9cfb2';
      for (let k = 0; k < n; k++) { if (k) b.step(gap); P.state.save.sim.min = times[0]; R.render(); const c = toCanvas(), x = (k % cols) * cw * zs, y = Math.floor(k / cols) * (ch * zs + 20);
        g.drawImage(c, cx, cy, cw, ch, x, y, cw * zs, ch * zs); g.fillText(`+${k * gap} klatek`, x + 6, y + ch * zs + 14); }
      return sheet.toDataURL('image/png');
    }
    for (const m of times) {
      P.state.save.sim.min = m; G.hubRebake(); B.state.tick += 60; L.state.onAt = B.state.tick - 100; R.render();
      const hd = R.hdRoom(), W = hd ? R.state.hd.W : A.state.W, H = hd ? R.state.hd.H : A.state.H, src = hd ? R.state.hd.fb : R.state.FB_MAIN;
      const c = document.createElement('canvas'); c.width = W; c.height = H; const id = new ImageData(W, H); new Uint32Array(id.data.buffer).set(src); c.getContext('2d').putImageData(id, 0, 0);
      frames.push({ c, W, H, label: String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0') });
    }
    const S = 576 / frames[0].W, fw = 576, fh = Math.round(frames[0].H * S), lab = 26;
    const [cx, cy, cw, ch] = crop ? crop.split(':').map(Number) : [0, 0, 0, 0], zs = crop ? Math.min(8, Math.floor(1152 / cw)) : 0;
    const sheet = document.createElement('canvas'); sheet.width = Math.max(fw * frames.length, crop ? cw * zs : 0); sheet.height = fh + lab + (crop ? ch * zs + lab : 0);
    const g = sheet.getContext('2d'); g.fillStyle = '#0a0a08'; g.fillRect(0, 0, sheet.width, sheet.height); g.imageSmoothingEnabled = false; g.font = '15px Courier New'; g.fillStyle = '#d9cfb2';
    frames.forEach((f, k) => { g.drawImage(f.c, k * fw, 0, fw, fh); g.fillText(`${room} · ${f.label} · ${f.W}×${f.H}`, k * fw + 10, fh + 18); });
    if (crop) { g.drawImage(frames[0].c, cx, cy, cw, ch, 0, fh + lab, cw * zs, ch * zs); g.fillText(`zbliżenie ${crop} · ${frames[0].label}`, 10, fh + lab + ch * zs + 18); }
    return sheet.toDataURL('image/png');
  }, { room, times, crop, people, anim, setup, fight, arm, mini });
  await mkdir(`${root}artifacts/tmp`, { recursive: true });
  await writeFile(`${root}artifacts/tmp/${out}.png`, Buffer.from(png.split(',')[1], 'base64'));
  console.log(`artifacts/tmp/${out}.png${errors.length ? '  ERRORS: ' + errors.slice(0, 3).join(' | ') : ''}`);
} finally { await browser.close(); server.kill(); }

````

---

## `tests/crank.mjs`

````js
import assert from 'node:assert/strict';

/** The real work door, keyboard rhythm, pause and once-only prison settlement. */
export async function checkCrank(page){
  await page.evaluate(async()=>{
    const b=window.__boxer;b.simSet({day:2,faza:0,min:480,akcje:0,glod:0,zm:0});
    (await import('/src/prison.js')).prisonClockSync();
    const G=await import('/src/gym.js'),N=await import('/src/navigation.js');
    N.stMenuOpen(G.stationOf(G.state.gymItems.find(it=>it.t==='cdoor')));
  });
  assert.equal(await page.locator('#stMenu button').filter({hasText:'Kule armatnie'}).count(),0);
  assert.equal(await page.locator('.watch-quest strong').count(),1);
  await page.locator('#stMenu button').filter({hasText:'Żelazna korba'}).click();
  await page.waitForFunction(async()=>(await import('/src/crank.js')).state.phase==='intro');
  await page.evaluate(()=>window.__boxer.step(120));
  assert.equal(await page.locator('#crClock').textContent(),'30');
  assert.equal(await page.locator('#simCard').isVisible(),false);
  await page.screenshot({path:'artifacts/crank-brief.png'});
  await page.locator('#crGo').click();await page.evaluate(()=>window.__boxer.resume());
  await page.keyboard.down('Space');
  await page.evaluate(()=>window.__boxer.step(30));
  assert.equal(await page.evaluate(async()=>(await import('/src/crank.js')).state.crank.held),true);
  await page.keyboard.press('F10');
  const paused=await page.evaluate(async()=>(await import('/src/crank.js')).state.crank);
  assert.equal(paused.held,false);
  await page.keyboard.up('Space');await page.waitForTimeout(80);
  assert.deepEqual(await page.evaluate(async()=>(await import('/src/crank.js')).state.crank),paused);
  await page.locator('[data-a="resume"]').evaluate(el=>{el.click();window.__boxer.pause();});
  await page.evaluate(()=>window.__boxer.step(0));
  await page.screenshot({path:'artifacts/crank-working.png'});
  // Inspect all four quadrants through the public input and normal simulation clock.
  for(const [name,angle] of [['bottom',0],['right',Math.PI/2],['top',Math.PI],['left',Math.PI*1.5]]){
    await page.evaluate(async target=>{
      const C=await import('/src/crank.js'),b=window.__boxer;
      b.resume();C.crankKey(new KeyboardEvent(target>Math.PI?'keyup':'keydown',{code:'Space'}),target<=Math.PI);
      for(let i=0;i<600&&C.state.crank.angle<target;i++)b.step(1);
      b.pause();b.step(0);
    },angle);
    await page.screenshot({path:`artifacts/crank-${name}.png`});
  }
  const result=await page.evaluate(async()=>{
    const b=window.__boxer,C=await import('/src/crank.js'),R=await import('/src/crank-rules.js'),P=await import('/src/progression.js');
    const before={actions:P.state.save.sim.akcje,respect:P.state.save.prison.respekt};
    b.pause();
    while(C.state.phase==='run'){
      const c=C.state.crank,down=R.isRising(c);
      // Public mode input is exercised with the same deterministic clock as the normal game.
      b.resume();C.crankKey(new KeyboardEvent(down?'keydown':'keyup',{code:'Space'}),down);b.step(1);b.pause();
    }
    b.step(0);return {before,c:C.state.crank,actions:P.state.save.sim.akcje,respect:P.state.save.prison.respekt,flag:P.state.save.prison.flagi['praca-2']};
  });
  assert.equal(result.c.elapsed,30);assert.ok(result.c.turns>=10,JSON.stringify(result));
  assert.equal(result.actions,result.before.actions+1);assert.equal(result.respect,result.before.respect+2);assert.equal(result.flag,true);
  await page.screenshot({path:'artifacts/crank-result.png'});
  await page.evaluate(()=>window.__boxer.step(120));assert.equal(await page.evaluate(()=>window.__boxer.sim.akcje),result.actions);
  await page.locator('#crBack').click();assert.equal(await page.evaluate(()=>window.__boxer.gstate),'hub');assert.equal(await page.locator('#simCard').isVisible(),true);
  assert.equal(await page.locator('.watch-quest strong').count(),0,'work reminder clears after settlement');
  await page.evaluate(async()=>{const G=await import('/src/gym.js'),N=await import('/src/navigation.js');N.stMenuOpen(G.stationOf(G.state.gymItems.find(it=>it.t==='cdoor')));});
  assert.equal(await page.locator('#stMenu button').filter({hasText:'Żelazna korba'}).count(),0);
  // Starting over never transfers a previous run's result to the new save.
  await page.evaluate(async()=>{const C=await import('/src/crank.js');C.startCrank();});
  await page.waitForFunction(async()=>(await import('/src/crank.js')).state.phase==='intro');await page.locator('#crGo').click();
  await page.evaluate(()=>{window.__boxer.step(40);window.__boxer.newGame();window.__boxer.pause();});
  assert.equal(await page.locator('#crankHud').isVisible(),false);assert.equal(await page.evaluate(()=>window.__boxer.sim.akcje),0);
}

````

---

## `tests/roach-rules.test.js`

````js
import test from 'node:test';
import assert from 'node:assert/strict';
import {KINDS, SURFACE, roachContact, missCost, killPoints} from '../src/roach-rules.js';
import {DRILLS, sessionScore} from '../src/training-data.js';

test('the knuckles squash a roach under them, graze one at their edge and miss one beside them', () => {
  const r={x:50,y:40,a:0,kind:KINDS.black};
  assert.equal(roachContact(50,40,r),'clean');
  assert.equal(roachContact(50+KINDS.black.len*0.45+4.5,40,r),'graze','only the tail end under the edge');
  assert.equal(roachContact(50,40+KINDS.black.wid*0.95+3,r),'graze','a leg under the knuckles');
  assert.equal(roachContact(50,52,r),'');
  assert.equal(roachContact(70,40,r),'');
  const up={...r,a:Math.PI/2};
  assert.equal(roachContact(50,44,up),'graze','heading turns the body: running up the wall it pokes out of the short side');
});

test('a miss hurts by surface, iron most; a hand at 90 cools down half as long again', () => {
  assert.deepEqual(missCost(SURFACE.lime,0),{pain:12,cool:70});
  assert.deepEqual(missCost(SURFACE.brick,20),{pain:38,cool:100});
  assert.deepEqual(missCost(SURFACE.iron,0),{pain:30,cool:150});
  assert.deepEqual(missCost(SURFACE.brick,92),{pain:100,cool:150});
});

test('kills on the run pay half again; the roach session scores hits, clean kills and pain', () => {
  assert.equal(killPoints(KINDS.prusak,0.9),1.5);
  assert.equal(killPoints(KINDS.big,0.2),3);
  const d=DRILLS.roach;
  const best=sessionScore(d,{strikes:12,kills:12,clean:12,points:12,painMax:0},1);
  assert.equal(best.grade,'S');
  const sloppy=sessionScore(d,{strikes:30,kills:12,clean:6,points:12,painMax:80},1);
  assert.ok(sloppy.score<best.score*0.6,`blind punching pays badly: ${sloppy.score}`);
  assert.equal(sessionScore(d,{},1).score,0,'no strikes, no score');
});

````

---

## `tests/crank.test.js`

````js
import test from 'node:test';
import assert from 'node:assert/strict';
import {DURATION,TARGET,TAU,crankOffset,createCrank,isRising,holdCrank,releaseCrank,tickCrank} from '../src/crank-rules.js';

/** Follow half-turns with the selected input pattern. */
function play(mode='rhythm'){
  const c=createCrank();let frame=0;
  while(!c.done){
    holdCrank(c,mode==='rhythm'?isRising(c):mode==='held'?true:mode==='spam'?frame%2===0:false);
    tickCrank(c);frame++;
  }
  return c;
}

test('six to twelve is the upward half; twelve to six is the release half',()=>{
  const c=createCrank();
  for(const angle of [0,Math.PI*.5,TAU+.2]){c.angle=angle;assert.equal(isRising(c),true);}
  for(const angle of [Math.PI,Math.PI*1.5,TAU*2-.001]){c.angle=angle;assert.equal(isRising(c),false);}
});

test('the grip turns away from the worker: right side up, left side down',()=>{
  const bottom=crankOffset(0,11),right=crankOffset(Math.PI/2,11),top=crankOffset(Math.PI,11),left=crankOffset(Math.PI*1.5,11);
  assert.equal(bottom.y,11);assert.equal(right.x,11);assert.equal(top.y,-11);assert.equal(left.x,-11);
  assert.ok(crankOffset(Math.PI-.1,11).x>crankOffset(Math.PI+.1,11).x,'the grip travels left, away from the worker, across the top');
});

test('good hold/release rhythm builds speed and beats idle, held and indiscriminate spam',()=>{
  const c=play();assert.ok(c.turns>=TARGET);assert.ok(c.best>=8);
  for(const mode of ['idle','held','spam'])assert.ok(play(mode).turns<c.turns/2);
  assert.ok(c.goodTime/c.workTime>.98);
});

test('early input changes only stop motion; correcting the grip resumes the same turn',()=>{
  const c=createCrank();holdCrank(c,true);tickCrank(c,.5);
  const rising=c.angle;holdCrank(c,false);tickCrank(c,.5);assert.equal(c.angle,rising);
  holdCrank(c,true);tickCrank(c,.5);assert.ok(c.angle>rising);
  tickCrank(c,3);assert.equal(c.angle,Math.PI);
  holdCrank(c,false);tickCrank(c,.3);const falling=c.angle;
  holdCrank(c,true);tickCrank(c,.5);assert.equal(c.angle,falling);
  holdCrank(c,false);tickCrank(c,3);assert.equal(c.turns,1);assert.equal(c.angle,0);
});

test('clearing held input preserves the mechanism for pause',()=>{
  const c=createCrank();holdCrank(c,true);tickCrank(c,.5);
  const expected={...c,held:false};releaseCrank(c);assert.deepEqual(c,expected);
});

test('only full revolutions score, and a revolution landing on the bell does not',()=>{
  const c=createCrank();c.angle=TAU-.02;c.speed=2;tickCrank(c,1/60);
  assert.equal(c.turns,1);
  const end=createCrank();end.elapsed=DURATION-.01;end.angle=TAU-.019;end.speed=2;tickCrank(end,.01);
  assert.equal(end.turns,0);assert.equal(end.elapsed,DURATION);assert.equal(end.done,true);
});

test('the final bell freezes both work and input; invalid time cannot advance it',()=>{
  const c=play(),frozen=structuredClone(c);tickCrank(c,3);holdCrank(c,true);assert.deepEqual(c,frozen);
  const fresh=createCrank(),initial=structuredClone(fresh);for(const dt of [NaN,0,-1])tickCrank(fresh,dt);assert.deepEqual(fresh,initial);
  assert.deepEqual(play(),play());
});


test('the top and bottom wait for the next grip change',()=>{
  const c=createCrank();holdCrank(c,true);tickCrank(c,4);
  assert.equal(c.angle,Math.PI);assert.equal(c.turns,0);
  holdCrank(c,false);tickCrank(c,4);
  assert.equal(c.angle,0);assert.equal(c.turns,1);
  tickCrank(c,4);assert.equal(c.turns,1);assert.equal(c.angle,0);
});

````
