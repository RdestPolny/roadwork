# Raport Audytu i Propozycji: Postacie i Rutyny w Rejonie Tartaku (Thames Port Scene)

**Autor**: Explorer 2 (Worker Routines Explorer)  
**Data**: 2026-10-29  
**Lokalizacja robocza**: `.agents/teamwork/explorer_survey_2/report.md`  
**Referencyjne pliki źródłowe**: `src/port-life.js`, `src/port-scenes.js`, `src/port-district.js`, `src/port-extension.js`, `src/port-details.js`, `src/thames-port.js`, `src/port-story.js`

---

## 1. Podsumowanie wykonawcze (Executive Summary)

Obszar tartaku (*timber yard*) w rozszerzonym porcie Wapping posiada wysoce zaawansowaną, deterministyczną choreografię trzech postaci (drwal/stolarz `woodworker`, tragarz `handler`, majster `foreman`), której pętla (1670 ticków ≈ 27,8 s) perfekcyjnie bilansuje zasoby desek. Jednakże z powodu braków w module renderera (`src/port-scenes.js`) oraz specyfiki rzutu izometrycznego w scenie występuje **krytyczny błąd wizualny**: tragarz w stanie `INSIDE` jest renderowany bez maskowania i lewituje w powietrzu na piętrze ceglanej fasady magazynu, rekwizyty majstra (księga, ołówek, miarka) są całkowicie niewidzialne, odcięte końce desek (*offcuts*) znikają w próżni, a same deski i stosy są rysowane jako płaskie 2D kreski przypominające zapałki.

Poniższy raport przedstawia pełną mapę postaci portowych, dekonstrukcję matematyczną maszyn stanów tartaku, udokumentowane błędy (wraz z referencją do zrzutów) oraz konkretne propozycje usprawnień w kodzie.

---

## 2. Katalog postaci i figur animowanych w scenie portowej

W całej scenie portowej nad Tamizą aktywnych jest **17 postaci i figur animowanych**, zorganizowanych w 3 warstwy:

| Postać | Rola i zachowanie | Moduł źródłowy | Współrzędne bazowe `[i, j]` |
|---|---|---|---|
| **Woodworker** | Pobiera surowy bal ze stosu surowego, piłuje go na koźle, bada gładkość, odnosi gotową deskę na stos gotowy | `port-life.js`, `port-scenes.js` | `[49.0, 7.28]` (warsztat), stosy `i≈50-51` |
| **Handler** | Wynosi surowe bale z magazynu na stos surowy, wyrównuje stosy, zabiera gotowe deski do magazynu | `port-life.js`, `port-scenes.js` | `[48.1, 4.85]` (drzwi), stosy `i≈50-51` |
| **Foreman** | Nadzoruje pracę tartaku, mierzy dociętą deskę składaną miarką, zapisuje wymiary w księdze ewidencyjnej | `port-life.js`, `port-scenes.js` | `[46.95, 8.25]` (przy stole stolarskim) |
| **Fisherman** | Wędkarz na molo: zarzuca wędkę, czeka, zacina, zwija kołowrotkiem, odczepia rybę i wrzuca do wiadra | `port-life.js`, `port-scenes.js` | `[49.6, 24.05]` (koniec molo, deck Z=0.25) |
| **Drinker A** | Robotnik w pubie "The Rope & Anchor" przy beczce 1: gestykuluje w rozmowie, sięga po kufel, pije | `port-life.js`, `port-scenes.js` | `[32.65, 8.75]` |
| **Drinker B** | Robotnik przy beczce 1: gestykuluje, pije z butelki, odstawia butelkę na beczkę | `port-life.js`, `port-scenes.js` | `[32.65, 8.75]` |
| **Loner** | Samotnik oparty plecami o ścianę pubu: obserwuje nabrzeże, pije z butelki, przeciera twarz | `port-life.js`, `port-scenes.js` | `[33.95, 6.42]` |
| **Keeper** | Szynkarz przy beczce 2: wyciera kufle ściereczką, ogląda pod światło, przestawia kufle, wyciera blat | `port-life.js`, `port-scenes.js` | `[37.95, 7.8]` |
| **Docker (Sack Carrier)** | Tragarz worków: dźwiga worki ze stosu przy wozie do łuku magazynu B, wraca po pusty stos | `thames-port.js` | `[19.05, 7.15]` do `[13.15, -1.9]` |
| **Coal Heaver** | Węglarz: ładuje węgiel łopatą ze stożka dźwigowego do worka na stojaku, wiąże, nosi na pryzmę | `thames-port.js` | `[28.75, 5.4]` |
| **Crane Hand** | Korbiarz dźwigu: kręci korbą wciągarki na granitowym cokole, kołysząc się synchronicznie | `thames-port.js` | `[28.0, 11.32]` |
| **Bargeman** | Szyprowiec na barce: spaceruje wzdłuż pokładu, sprawdza naciąg want, wraca pod sterówkę | `thames-port.js` | `[o.s0+3, jc+2.05]` na Tamizie |
| **Lighterman** | Wioślarz na rzece: steruje łodzią wiosłową w dół rzeki | `thames-port.js` | `jc=27.5` na Tamizie |
| **Hoist Hauler** | Robotnik wciągarki linowej magazynu A: ciągnie linę hand-over-hand, wciągając skrzynie na piętro | `thames-port.js` | `[3.7, 2.35]` |
| **Warehouseman** | Magazynier na górnym pomoście magazynu A: odbiera wciągane skrzynie przez wrota ładunkowe (z=50.2) | `thames-port.js` | `[5.3, -0.45, z=50.2]` |
| **Player (Hero)** | Postać gracza: rozładunek worków, swobodna eksploracja nabrzeża | `thames-port.js` | sterowana WASD |
| **Story Cast** | Pijany doker (przeciwnik w bójce), konstable z kobietą, zamaskowany nieznajomy, dorożkarz | `port-story.js`, `carriage.js` | rejon wozu policyjnego i zaułka |

---

## 3. Szczegółowy audyt mechaniki i rutyn tartaku (*Timber Yard*)

Tartak zajmuje wschodni sektor nabrzeża (`i ≈ 46.5 .. 52.0`, `j ≈ 4.5 .. 10.5`) przed magazynem drewna (*Timber Store*). Cały cykl tartaku jest rządzony wspólną stałą czasową `YARD_T = WOOD.T = 1670 ticków` (~27,8 s przy 60 FPS).

### 3.1. Maszyna stanów drwala (`woodworker`)

Drwal operuje pomiędzy trzema punktami:
- Warsztat z kozłami: `SPOT.bench = [49.0, 7.28]`, kozły na `i = 47.75` i `49.05`, `BENCH.top = 5.4`
- Stos surowca: `SPOT.raw = [50.12, 6.2]`, `RAW_STACK = [50.59..51.13, 5.0..7.4]`
- Stos gotowy: `SPOT.cut = [50.775, 9.08]`, `CUT_STACK = [49.75..51.8, 9.58..10.14]`

```
[1. GO_TO_RAW_STACK] (~155 t)  -->  [2. PICK_UP_PLANK] (120 t)  -->  [3. WALK_TO_BENCH] (~198 t)
        ^                                                                       |
        |                                                                       v
[10. RETURN] (~220 t)                                                [4. PLACE_ON_BENCH] (90 t)
        ^                                                                       |
        |                                                                       v
[9. PLACE_ON_STACK] (100 t) <-- [8. WALK_TO_FINISHED] (~200 t) <-- [7. PICK_UP_FINISHED] (130 t) <-- [6. INSPECT] (190 t) <-- [5. SAW] (500 t)
```

1. **`GO_TO_RAW_STACK` (155 ticków)**: Przemarsz pusty z warsztatu do stosu surowca trasą `P_RAW` (`PACE.empty = 0.0135`).
2. **`PICK_UP_PLANK` (120 ticków)**: Schylenie się do stosu surowego (`stoop`), chwyt oburęczny przy `u = 0.45`, uniesienie bala o długości 2.4 kafelka na wysokość klatki (`FRONT`).
3. **`WALK_TO_BENCH` (198 ticków)**: Marsz obciążony (`PACE.loaded = 0.0105`) z balem niesionym przed sobą w poprzek tułowia.
4. **`PLACE_ON_BENCH` (90 ticków)**: Opuszczenie bala na kozły, przesunięcie w lewo w dłoniach, oparcie na koźle (`u >= 0.62` -> stan `ON_BENCH`).
5. **`SAW` (500 ticków, ~8,33 s)**:
   - `u < 0.09` (45 ticków): sięgnięcie po piłę opartą o prawy kozioł (`SAW_REST`).
   - 12 pociągnięć piły wzdłuż wektora cięcia `STROKE = [.82, 0, -.57]`.
   - Przerwa na złapanie tchu w połowie cięcia (`v ∈ [0.46, 0.54]`), wyprostowanie pleców.
   - Lewa ręka dociska bal do kozła (`press`), prawa tnie. Rzaz (`kerf`) postępuje od 0 do 1.
   - Przy `u = 0.9` cięcie zostaje ukończone. Odcięty kawałek (`offcut`) odpada i powinien wpaść do kosza `BIN`.
6. **`INSPECT` (190 ticków, ~3,17 s)**:
   - Odłożenie piły na kozioł (`u < 0.2`).
   - Sprawdzenie kciukiem krawędzi cięcia (`feel`, `u ≈ 0.36`).
   - Spojrzenie wzdłuż płaszczyzny deski pod światło (`sight`, `u ≈ 0.55`).
   - Zdmuchnięcie/strzepnięcie trocin dłonią (`brush`, `u ≈ 0.8`).
7. **`PICK_UP_FINISHED` (130 ticków)**: Uniesienie skróconej deski (`PLANK.cut.len = 2.05`) i przestawienie chwytu z oburęcznego na chwyt boczny pod pachę (`SIDE(1)`), obrót tułowia o 90°.
8. **`WALK_TO_FINISHED_STACK` (200 ticków)**: Marsz z dociętą deską pod pachą przez punkt narożny `CORNER = [50.2, 7.52]` do stosu gotowego `SPOT.cut`.
9. **`PLACE_ON_STACK` (100 ticków)**: Odłożenie gotowej deski na wierzch stosu `CUT_STACK` (`LAY_FREE = 0.62`).
10. **`RETURN` (220 ticków)**: Powrót pusty do warsztatu, obrót twarzą do stołu stolarskiego.

### 3.2. Maszyna stanów tragarza (`handler`)

Tragarz utrzymuje bilans magazynowy tartaku, kursując między drzwiami magazynu `SPOT.door = [48.1, 4.85]` a stosami:

```
[1. EMERGE] (90 t)  -->  [2. CARRY_TO_RAW] (~190 t)  -->  [3. PLACE_ON_RAW] (110 t)  -->  [4. TIDY_RAW] (60 t)
                                                                                                    |
                                                                                                    v
[10. INSIDE] (~450 t) <-- [9. ENTER] (80 t) <-- [8. CARRY_TO_STORE] (~240 t) <-- [7. PICK_FINISHED] (130 t) <-- [6. TIDY_FINISHED] (110 t) <-- [5. WALK_TO_FINISHED] (~200 t)
```

- Synchronizacja: Tragarz jest przesunięty w fazie o `HANDLER_LAG` (ok. 360 ticków), dzięki czemu dostarcza nowy surowy bal dokładnie wtedy, gdy stolarz kończy poprzedni i tnie go na koźle.
- Bilans zasobów w `levels(t)`:
  - Stolarz zabiera 1 surowy (`raw--`), dokłada 1 gotowy (`cut++`).
  - Tragarz dokłada 1 surowy (`raw++`), zabiera 1 gotowy (`cut--`).
  - Bilans po pełnym cyklu `YARD_T`: surowe = `RAW0` (7 desek), gotowe = `CUT0` (8 desek). Zero dryfu magazynowego!

### 3.3. Maszyna stanów majstra (`foreman`)

Majster stoi przy zachodnim krańcu warsztatu `FM = [46.95, 8.25]` i reaguje na fazy stolarza:
1. **`WATCH`**: Domyślna obserwacja. Trzyma księgę w prawej dłoni przy klatce, głowa obraca się w ślad za stolarzem (`yawTo(P, [wood.P.i, wood.P.j]) * 0.9`).
2. **`MEASURE`** (aktywne podczas `wood.s === 'INSPECT' && u > 0.15`): Wyciąga z kieszeni kamizelki składaną miarkę drewnianą (`rule`), pochyla się nad kozłem (`lean += 0.55`, `crouch += 0.18`), przykłada miarkę do dociętej krawędzi deski, po czym chowa ją z powrotem.
3. **`WRITE`** (aktywne podczas `wood.s === 'GO_TO_RAW_STACK'` lub `PICK_UP_PLANK` lub `RETURN`): Wyjmuje ołówek z grzbietu księgi, wykonuje rytmiczne ruchy pisania w księdze (`Math.sin(q)`), pochylając głowę nad zapiskami.

---

## 4. Udokumentowane błędy, braki i niedoskonałości (Flaw Catalog)

Przeprowadzona analiza kodu oraz bezpośrednia weryfikacja zrzutów z bufora 432×288 (`artifacts/port-life/*.png`) ujawniły 10 konkretnych mankamentów:

### Błąd 1 (KRYTYCZNY BŁĄD WIZUALNY): Tragarz lewitujący na ścianie magazynu w stanie `INSIDE`
- **Lokalizacja w kodzie**: `src/port-life.js:741-748`, `src/port-scenes.js:45`.
- **Obserwacja bezpośrednia**: Na zrzutach `artifacts/port-life/wood-carry.png` oraz `wood-pick.png` tragarz wisi w powietrzu na ceglanej fasadzie pierwszego piętra magazynu nad drzwiami!
- **Mechanizm błędu**:
  W stanie `INSIDE` tragarz ma współrzędne `SPOT.inside = [48.1, 3.7]`. Fasada magazynu biegnie w linii `j = 4.5`. W rzucie izometrycznym mniejsza wartość `j` oznacza pozycję wyżej na ekranie (`isoY(i, j, z)` zmniejsza się wraz ze spadkiem `j`).
  W `src/port-scenes.js:45` pętla renderująca wywołuje `person(a)` bezwarunkowo dla każdego aktora, ignorując `a.state === 'INSIDE'` oraz flagę `a.dark = 1`. Ponieważ `port-scenes.js` nie implementuje maskowania otworów drzwiowych (w przeciwieństwie do `behindFront(..., archHole)` w `thames-port.js`), postać jest rysowana w pełnej jasności na tle cegieł na wysokości ok. 15-20 pikseli powyżej progu!

### Błąd 2: Niewidzialne rekwizyty majstra (księga, ołówek, miarka)
- **Lokalizacja w kodzie**: `src/port-life.js:800`, `src/port-scenes.js:45`.
- **Obserwacja**: Majster wykonuje gesty pisania i mierzenia deskorolki całkowicie pustymi rękami.
- **Mechanizm błędu**:
  `foreman()` w `port-life.js` precyzyjnie wylicza pozycje stawów i obiektów:
  `book: {at: handWorld(P, pose, 1)}`, `pencil: {state: pencil, at: handWorld(P, pose, -1)}`, `rule: {open: lay, at: handWorld(P, pose, -1)}`.
  W `port-scenes.js:45` znajduje się wyłącznie:
  `for(const a of [L.yard.wood,L.yard.hand,L.yard.fore]) add(a.P.i,a.P.j,()=>{person(a,...); board(a.board); if(a.saw){...}});`
  Kod renderujący `a.book`, `a.pencil` i `a.rule` w ogóle nie istnieje!

### Błąd 3: Znikający odcięty kawałek deski (*offcut*)
- **Lokalizacja w kodzie**: `src/port-life.js:717-721`, `src/port-scenes.js:45`.
- **Obserwacja**: W momencie zakończenia piłowania (12. pociągnięcie, `u >= 0.9`), odcięty klocek po prostu znika z ekranu.
- **Mechanizm błędu**:
  Logika fizyki odpadania klocka do kosza `BIN` jest zaimplementowana w `sawing()` (`offcut: {state: 'FALLING', ang, drop}` i `{state: 'IN_BIN'}`), ale `port-scenes.js` ani żaden inny moduł nigdy nie rysuje `a.offcut`, ani odciętych klocków wewnątrz skrzynki `BIN`.

### Błąd 4: Brak trocin i efektu pyłu drzewnego
- **Lokalizacja w kodzie**: `src/port-scenes.js:45`, `src/port-life.js:705`.
- **Obserwacja**: Piłowanie grubej sosnowej deski przez 8 sekund nie generuje ani jednej drobinki trocin. W fazie `INSPECT` stolarz omiata dłonią niewidzialny pył.
- **Mechanizm błędu**:
  Brak generatora cząsteczek trocin w rzucie izometrycznym pod linią cięcia `kerfPoint`.

### Błąd 5: Deski rysowane jako płaskie kreski 2D ("zapałki")
- **Lokalizacja w kodzie**: `src/port-scenes.js:23-29`.
- **Obserwacja**: Zarówno deski niesione, jak i całe stosy surowca i gotowe wyglądają jak pęki drutów lub zapałek, kontrastując z bryłami beczek i skrzyń.
- **Mechanizm błędu**:
  Funkcja `board(b)` rysuje deskę jako pojedynczy `stroke(...)` (3 px grubości) i pojedynczy `thin(...)` (1 px). Deska o szerokości 0.26 kafelka i grubości 0.6-0.7 jednostki nie posiada ścianek bocznych, czoła ani cieniowania izometrycznego.

### Błąd 6: Stosy desek lewitujące w powietrzu bez legarów
- **Lokalizacja w kodzie**: `src/port-life.js:524`, `src/port-scenes.js:36`.
- **Obserwacja**: Dolna warstwa desek w obu stosach wisi w powietrzu na wysokości `z = 1.3` nad brukiem.
- **Mechanizm błędu**:
  `STACK_BASE = 1.3` zakłada obecność legarów (*bearers*) chroniących drewno przed wilgocią nabrzeża, ale w pętli renderowania stosów rysowane są wyłącznie deski od `n=0..count`, bez podkładów drewnianych pod spodem.

### Błąd 7: Poślizg stóp przy obrocie w miejscu (*foot skating*)
- **Lokalizacja w kodzie**: `src/port-life.js:145-149`, `658-660`.
- **Obserwacja**: Przy dochodzeniu do stosu gotowego oraz przy podnoszeniu gotowej deski z warsztatu postać obraca się o 90°, ale stopy ślizgają się po bruku bez fazy przestawiania kroków.
- **Mechanizm błędu**:
  W ostatnich 40 tickach marszu `v >= 1`, flaga `walk` staje się fałszywa i wywoływany jest `body()` zamiast `walkBody()`. W `body()` domyślne stopy są sztywno przypisane do lokalnej ramki, co przy obrocie kąta `a` skutkuje obrotem stóp w ślizgu.

### Błąd 8: Całkowity brak tożsamości wizualnej i zróżnicowania postaci
- **Lokalizacja w kodzie**: `src/port-scenes.js:45`.
- **Obserwacja**: Wszyscy trzej pracownicy mają identyczną paletę ubrań `['#302b24', '#554737', '#796448']` i standardowy model dokera w kaszkiecie.
- **Problem estetyczny**:
  Majster (*foreman*) powinien nosić kamizelkę/fartuch lub melonik i ciemniejszy garnitur roboczy, stolarz (*woodworker*) skórzany fartuch lub podwinięte rękawy, a tragarz (*handler*) pas tragarza lub opaskę na ramię.

### Błąd 9: Piła jako pojedynczy druciany odcinek i sztywna postawa
- **Lokalizacja w kodzie**: `src/port-scenes.js:45`, `src/port-life.js:700`.
- **Obserwacja**: Piła to pojedyncza cienka stalowa kreska bez rękojeści i rozszerzenia brzeszczotu. Drwal porusza tylko ramieniem; pochylenie tułowia zmienia się zaledwie o 0.05 radiana, przez co ruch przypomina manekina.

### Błąd 10: Nieprawidłowe sortowanie głębokości opartej piły
- **Lokalizacja w kodzie**: `src/port-scenes.js:45`.
- **Obserwacja**: Gdy stolarz odchodzi od stołu stolarskiego do stosu surowca (`i=50.12, j=6.2`), oparta o kozioł piła jest wrzucana do kolejki głębokości z kluczem pozycji stolarza (`50.12 + 6.2 = 56.32`), zamiast ze stałym kluczem kozła (`49.1 + 7.54 = 56.64`).

---

## 5. Propozycje konkretnych usprawnień w kodzie (Concrete Proposals)

Poniższe propozycje zostały przygotowane zgodnie z zasadami projektu (zero nowych zależności, czysty ESM, minimalny diff, spójność z paletą Roadwork):

### Usprawnienie 1: Zamaskowanie tragarza w magazynie i eliminacja błędu lewitacji
W pliku `src/port-scenes.js`:
- Sprawdzać stan aktora przed renderowaniem: jeśli `a.id === 'handler' && a.state === 'INSIDE'`, całkowicie pominąć jego rysowanie (postać jest niewidoczna w głębi magazynu).
- Dla stanów `EMERGE` i `ENTER` zastosować maskowanie drzwiami `F2` (`j = 4.5`, szerokość `i ∈ [47.3, 49.1]`, wysokość `z ∈ [0, 19]`) lub ściemnianie `a.dark`, tak aby postać płynnie wyłaniała się z mroku i nie przenikała przez cegły fasady.

```javascript
// Propozycja w src/port-scenes.js:
if (a.id === 'handler') {
  if (a.state === 'INSIDE') return; // tragarz jest wewnątrz, nie rysować!
  if (a.dark > 0.85) return;
}
```

### Usprawnienie 2: Wizualizacja rekwizytów majstra (księga, ołówek, miarka)
W pliku `src/port-scenes.js`:
Dodać rysowanie obiektów majstra przy użyciu natywnych prymitywów (`isoBox`, `stroke`, `thin`):
- **Księga ewidencyjna** (`a.book`): mały prostokąt w prawej dłoni w kolorze oprawy skórzanej (`#2e1f18`) z jasnymi kartkami papieru (`#d8cfb4`).
- **Ołówek** (`a.pencil`): cienki grafitowy odcinek (`#1c1a17`) w lewej dłoni podczas stanu `WRITE`.
- **Składana miarka** (`a.rule`): segmentowy żółto-mosiężny pręt (`#c29b38`) wysuwany z kieszeni na bal podczas stanu `MEASURE`.

### Usprawnienie 3: Rysowanie odciętych klocków (*offcuts*) i wypełnienia kosza
W pliku `src/port-scenes.js`:
- Jeśli `wood.offcut && wood.offcut.state === 'FALLING'`, narysować obracający się klocek drewna spadający z wysokości `BENCH.top` do kosza `BIN`.
- Wewnątrz kosza `BIN` narysować kilka stałych i przybywających odciętych klocków drewnianych (`isoBox`), nadając koszowi realną funkcję gospodarczą.

### Usprawnienie 4: Cząsteczki trocin pod piłą i na stole
W plikach `src/port-life.js` i `src/port-scenes.js`:
- Podczas stanu `SAW`, w fazie pchnięcia piły (`push > 0.3`), emitować 2-4 piksele trocin (`#d6be90`, `#e8d5aa`) opadające parabolicznie z punktu `kerfPoint` w kierunku kosza i ziemi.
- Na podłożu pod punktem cięcia dodać małą warstwę osypanych trocin (`spot` lub mały wielokąt `#bda170`).

### Usprawnienie 5: Wolumetryczne deski i drewniane legary pod stosami
W pliku `src/port-scenes.js`:
- Rozbudować `board(b)`: zamiast pojedynczej linii 3px, rysować deskę jako płaski graniastosłup izometryczny z widocznym jasnym licem górnym (`#c7a276`), ciemniejszą krawędzią boczną (`#866648`) i czołem poprzecznym z widocznym słojem (`#5a432f`).
- Pod `RAW_STACK` i `CUT_STACK` dorysować po 2 poprzeczne legary dębowe (`isoBox` na `z = 0 .. STACK_BASE`), na których opierają się stosy.

### Usprawnienie 6: Zróżnicowanie ubioru pracowników tartaku
W pliku `src/port-scenes.js`:
- **Foreman**: kamizelka i ciemniejsze spodnie (`top: ['#1c2024', '#2d333b', '#444d57']`), ewentualnie inny odcień nakrycia głowy.
- **Woodworker**: cieplejsza, robocza koszula z podwiniętymi rękawami lub fartuch (`top: ['#3d2e1e', '#61482f', '#876949']`).
- **Handler**: surowy, znoszony drelich portowy z ochraniaczem barku (`top: ['#282c26', '#3e453c', '#5a6358']`).

### Usprawnienie 7: Urealnienie dynamiki piłowania (masywniejsze pchnięcie)
W pliku `src/port-life.js`:
- Zwiększyć amplitudę ugięcia tułowia stolarza podczas piłowania (`lean: .42 + .16 * push`, `sway: -.15 - .08 * push`), oddając dynamiczny nacisk całego ciała na brzeszczot w fazie cięcia i odciążenie przy cofaniu.

---

## 6. Wytyczne dla implementacji i weryfikacji GIF (Dla Agenta Implementującego)

1. **Bezpieczeństwo testów**:
   - Sprawdzać determinizm: `node --test tests/port-district.test.js`.
   - Żadna zmiana nie może zaburzyć `portSurface()` ani kolizji `districtBlocked()`.
2. **Kamera do nagrania GIF**:
   - Punkt widokowy tartaku: `i = 46.7, j = 8.3` (zgodnie z `tests/port-life-browser.mjs`).
   - Kadr obejmuje jednocześnie warsztat stolarza, oba stosy desek, drzwi magazynu oraz stojącego majstra.
3. **Długość cyklu na GIF**:
   - Pełny cykl tartaku trwa 1670 ticków (~27,8 s).
   - Aby GIF był reprezentatywny i zwięzły, warto nagrać kluczowy wycinek: pobranie surowego bala -> przyniesienie na stół -> 4-5 cykli piłowania z trocinami i odpadnięciem klocka -> inspekcja z pomiarem majstra -> wyniesienie deski przez tragarza (ok. 600-800 klatek lub wyselekcjonowane 12-15 sekund).
