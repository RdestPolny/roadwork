# Raport z audytu sceny portowej nad Tamizą i rejonu tartaku (Timber Yard)

**Data audytu**: 2026-10-30  
**Autor**: Explorer 1 (Scene & Asset Explorer)  
**Cel audytu**: Weryfikacja struktury sceny nad Tamizą w grze Roadwork, lokalizacji tartaku (timber yard), kodu renderującego, assetów graficznych, logiki rysowania na canvasie, warstw, elementów wizualnych, estetyki i wierności realiom wiktoriańskiego Londynu (Wapping, 1868), a także identyfikacja usterek i brakujących detali.

---

## 1. Architektura i potok renderowania sceny nad Tamizą

### 1.1. Pliki składowe i podział odpowiedzialności
Scena portowa i rejon tartaku nie wykorzystują zewnętrznych plików bitmapowych (PNG/spritesheet). Wszystkie elementy – budynki, pomosty, bruk, woda, postacie, narzędzia, deski i wozy – są renderowane **czystym kodem proceduralnym** bezpośrednio do bufora ramki (framebuffer pikselowy w natywnej rozdzielczości `432×288`).

| Plik | Zakres i odpowiedzialność w scenie portowej |
|---|---|
| `src/thames-port.js` | Główny kontroler sceny portu: stan gracza, kamera izometryczna (`camera`), potok renderowania `renderThamesPort()` / `renderPortFrame()`, pieczenie tła `cachedBackground()`, woda, mgła rzeczna `atmosphere()`, oświetlenie lamp gazowych `LAMPS`, dźwig węglowy, barki, kolejka głębokości (z-sortowanie). |
| `src/port-district.js` | Czysta geometria dystryktu Wapping (`DISTRICT`), powierzchnie (`portSurface`), siatka kolizji (`districtBlocked`), wysokości (`DECK_Z = 0.25`), punkty orientacyjne i kotwice animacji (`ANCHORS`, `LIFE_BLOCKS`). Brak zależności od renderera. |
| `src/port-extension.js` | Rozszerzenie graficzne portu: pieczenie architektury `portDistrictStatic()` (fasada pubu *The Rope & Anchor*, uliczka Dock Lane, magazyny *Rigging* i *Timber*), drewniane pomosty i tarasy `portDecks()`, daleki plan rzeki `portRiverDistance()`, rekwizyty statyczne i dynamiczne `portDistrictProps()`, efekty świetlne `portDistrictFX()`. |
| `src/port-details.js` | Drobne mikroskopijne detale architektoniczne i osprzęt: wykusze, gzymsy, rynny, latarnia gazowa pubu, hak z wielokrążkiem przy magazynie linowym, kołowrót ręczny na pomoście, liny, łańcuchy, pnącza alg/szlamu na palach. |
| `src/port-scenes.js` | Połączenie logiki życia portu z rendererem: rysowanie postaci (`person` / `docker`), naczyń (`vessel`), desek (`board`), łączenie rekwizytów tartaku (`portLifeProps`) i przekazywanie do kolejki głębokości `thames-port`. |
| `src/port-life.js` | Czysty silnik deterministycznych rutyn mieszkańców portu: rybak na pomoście (`fisher`), bywalcy pubu (`pub`, `loner`, `keeper`) oraz 3 pracowników tartaku (`yardAt`: `woodworker`, `handler`, `foreman`), obsługa stanów desek i cykli czasowych. |

### 1.2. Układ współrzędnych i warstwy sceny
1. **Rzut izometryczny**:
   - Osie świata: `i` biegnie wzdłuż nabrzeża (w dół i w prawo na ekranie), `j` biegnie w stronę rzeki (w dół i w lewo na ekranie), `z` to wysokość pionowa.
   - Współrzędne ekranowe: `isoX = (i - j) * 12 * scale + camX`, `isoY = (i + j) * 6 * scale - z * scale + camY`.
   - Stała skala kafelka: 1 kafelek siatki to $12 \times 6$ pikseli przy bazowym rzucie ($24 \times 12$ w powiększeniu 2×, odpowiednio dopasowany do bufora 432×288 przez współczynnik `gymState.ISO_K / 2 = 1.5`).
2. **Geografia i lokalizacja tartaku (Timber Yard)**:
   - Całe nabrzeże: od `i = 0` do `i = 52`, `j = 0` do `j = 13` (kamienny bulwar).
   - Pomost drewniany (*Timber Pier*): `i = 42.2 .. 51.8`, `j = 13 .. 25`.
   - Budynek magazynu tartaku (*Timber Store*): `i = 46.65 .. 52.0`, `j = 0 .. 4.5`, wysokość `z = 57`.
   - Plac tartaku (część robocza): `i = 46.5 .. 52.0`, `j = 4.5 .. 12.6`.
   - Warsztat / stanowisko obróbki drewna:
     - Kozioł warsztatowy (`timber_workbench` / `BENCH`): `i0 = 47.3`, `j = 7.9`, wysokość blatu `top = 5.4`.
     - Skład surowego drewna (`timber_raw_stack` / `RAW_STACK`): `i = 50.59 .. 51.13`, `j = 5.0 .. 7.4`.
     - Skład desek obrobionych (`timber_finished_stack` / `CUT_STACK`): `i = 49.75 .. 51.8`, `j = 9.58 .. 10.14`.
     - Skrzynia na ścinki (`BIN`): `i = 49.5`, `j = 7.9`, wysokość `h = 2.6`.
     - Brama magazynu (`timber_loading_spot`): `i = 48.1`, `j = 4.85`.
     - Stanowisko majstra (`timber_foreman`): `i = 46.95`, `j = 8.25`.
3. **Warstwy renderowania (potok w `renderPortFrame`)**:
   - **Warstwa tła (pieczona w `cachedBackground`)**: niebo z gradientem i gwiazdami, dachy, kominy, fasady budynków, fasada magazynu *TIMBER*, mur nabrzeża, pale drewniane, rzeka, płyty brukowe quaya (`floor(sett)`), drewniane pokłady pomostów (`portDecks()`).
   - **Warstwa wodna i tło rzeki**: fale na Tamizie (`water(t)`), sylwetki statków i płynący holownik parowy (`portRiverDistance()`), dymy z kominów.
   - **Warstwa obiektów i postaci (Y/Z Depth Sorting)**:
     Kolejka `props` sortowana według klucza izometrycznego głębi `i + j`:
     - Skrzynie, beczki, sterty ładunków.
     - Kozły warsztatowe, skrzynia na ścinki, stosy desek surowych i obrobionych.
     - Postacie: gracz, tragarze węgla, bywalcy pubu, trzej pracownicy tartaku (stolarz, pomocnik, majster).
     - Ręczny wózek, piła, noszone i cięte deski.
   - **Warstwa pierwszoplanowa i osprzęt**:
     Latarnie gazowe, liny cumownicze, kołowrót na pomoście, barierki drewniane.
   - **Warstwa post-processingu atmosferycznego**:
     Światła lamp gazowych (`spot()`), dym i para (`smoke()`), dwuwarstwowa wiktoriańska mgła rzeczna (`atmosphere()` oparta o szum FBM i winietę).

---

## 2. Ocena wizualna i inwentaryzacja assetów tartaku

Wszystkie obiekty tartaku powstają z prymitywów 3D rzutowanych na płaszczyznę: `isoBox` (prostopadłościan z cieniowaniem ścian lewej, prawej i górnej), `quad` (dowolny czworokąt z cieniowaniem), `stroke` / `thin` (linie 1-pikselowe i grubsze) oraz `cyl` (walce).

### 2.1. Fasada magazynu drewna (*Timber Store / Workshop*)
- **Kod**: `src/port-extension.js:171-184`, `src/port-details.js:87-98`.
- **Wygląd**: Ciemna wiktoriańska cegła (`BRICK_PUB`), wysoka fasada do `z = 57`, spadzisty łupek dachowy, komin. Na fasadzie szyld z ręcznie malowanym napisem `TIMBER` w kolorze spłowiałego papieru/ochry (`#aea187`), pojedyncze okno ze szprosami na piętrze (`z = 27`).
- **Brama magazynu**: Otwarta brama warsztatowa `fq(F2, 47.3, 0, 49.1, 19, ...)` o szerokości ~1.8 kafla. Wewnątrz bramy wymalowano ciemne wnętrze z zarysami pionowych desek opartych o ścianę.
- **Ocena**: Fasada ma doskonały klimat wiktoriańskiego portu rzecznego, prawidłowe proporcje cegieł i spatynowany szyld.

### 2.2. Stanowisko warsztatowe: kozły i skrzynia na ścinki
- **Kod**: `src/port-scenes.js:37-38`, `src/port-life.js:513-519`.
- **Elementy**:
  - Dwa kozły stolarskie (`BENCH.trestles = [47.75, 49.05]`) o wysokości `top = 5.4` jednostek, rysowane przez `isoBox` z jasnego i ciemnego drewna (`C.woodLight`, `C.woodDark`).
  - Skrzynia na ścinki (`BIN`) przy prawym koźle: `i = 49.5`, `j = 7.9`, wymiary `w = 0.5, d = 0.56, h = 2.6`.
  - Piła ręczna (`SAW_REST`): w spoczynku oparta o prawy kozioł (`z = 5.0, dir = [0, 0.18, -1]`), stalowy brzeszczot o długości 6.2 jednostek rysowany z linijką `#a79c87`.
- **Ocena**:
  - Kozły stolarskie są czytelne, stabilne i solidnie zakotwiczone w przestrzeni.
  - Skrzynia na ścinki stoi w prawidłowym miejscu pod punktem cięcia.

### 2.3. Stosy drewna (surowe i obrobione)
- **Kod**: `src/port-scenes.js:22-29, 36`, `src/port-life.js:511-532`.
- **Elementy**:
  - Stos surowy (`RAW_STACK`): deski o długości `len = 2.4`, szerokości `w = 0.26`, grubości `th = 0.7`. Ułożone wzdłuż osi `j` (równolegle do linii rzeki).
  - Stos obrobiony (`CUT_STACK`): krótsze deski `len = 2.05`, ułożone wzdłuż osi `i` (prostopadle do rzeki).
  - Rysowanie deski (`board()` w `port-scenes.js`): rysowana za pomocą pojedynczego `stroke` dla osi deski oraz `thin` dla krawędzi górnej/bocznej.
- **Ocena i zidentyfikowane mankamenty**:
  - **Efekt "słomek / zapałek"**: Pojedynczy `stroke` i `thin` nie dają desce wrażenia masywnego wiktoriańskiego kantu/bali (deal timber). Deski wyglądają jak cienkie patyki lub paski słomy leżące na ziemi.
  - **Brak belek podkładowych (bearers / dunnage)**: W kodzie zdefiniowano `STACK_BASE = 1.3`, co unosi deski nad grunt. Jednak w `port-scenes.js` i `port-extension.js` **brakuje rysowania samych belek podkładowych** pod stosem! W efekcie najniższa deska unosi się w powietrzu 1.3 jednostki nad kamiennym brukiem, co wygląda nienaturalnie.
  - **Brak przekładek (stickers / battens)**: Pomiędzy warstwami schnącego drewna w historycznym tartaku zawsze stosowano cienkie poprzeczne listewki. Ich brak sprawia, że stos wygląda jak jednolity blok kresek.

---

## 3. Szczegółowy audyt mankamentów wizualnych i błędów w scenie

Na podstawie bezpośredniej inspekcji kodu źródłowego (`src/port-life.js`, `src/port-scenes.js`, `src/port-extension.js`) oraz analizy wyrenderowanych zrzutów (`artifacts/thames-district/07-trade-yard.png`, `10-ambient-routines.png`, `artifacts/port-life/*.png`, `artifacts/tmp/test_timber.gif`) zidentyfikowano następujące istotne wady:

### Błąd 1 (KRYTYCZNY): Pomocnik (handler) unosi się w powietrzu na ścianie bramy
- **Lokalizacja**: `src/port-life.js:741-748`, `artifacts/port-life/wood-pick.png`, `wood-carry.png`, `artifacts/tmp/test_timber.gif`.
- **Obserwacja wizualna**:
  Podczas fazy `ENTER`, `INSIDE` i `EMERGE` postać pomocnika noszącego deski wchodzi do magazynu. Na klatkach widać pomocnika **zawieszonego wysoko na ścianie budynku** (na wysokości kilku metrów), wspinającego się po ościeżnicy bramy jak pająk!
- **Przyczyna w kodzie**:
  W `src/port-life.js`:
  ```javascript
  const inward=S.s!=='EMERGE', v=S.s==='INSIDE'?1:clamp01(S.local/(S.d-15)),
        a=[...SPOT.inside,0], b=[...SPOT.door,0],
        p=inward?lerp3(b,a,v):lerp3(a,b,v);
  ```
  Gdzie:
  ```javascript
  SPOT.door = ANCHORS.timber_loading_spot = [48.1, 4.85];
  SPOT.inside = [ANCHORS.timber_loading_spot[0], ANCHORS.timber_loading_spot[1] - 1.15] = [48.1, 3.7];
  ```
  Zauważmy: ściana magazynu `F2` w `port-extension.js` stoi na współrzędnej `j = 4.5`!
  Gdy pomocnik idzie w stronę `SPOT.inside` (`j = 3.7`), wchodzi w głąb budynku (`j < 4.5`).
  Jednak w rzucie izometrycznym `isoY = (i + j)*6 - z`: punkt o mniejszym `j` bez zmiany `z` ma **mniejsze Y ekranowe** (jest wyżej na ekranie). Jednocześnie ściana frontowa `F2` jest rysowana w buforze tła. Pomocnik nie ma ustawionego przycięcia/zasłaniania przez nadproże bramy ani ościeżnicę, przez co jego sylwetka renderuje się **na wierzchu cegieł powyżej bramy**, sprawiając wrażenie lewitowania na ścianie na wysokości 1. piętra!

### Błąd 2 (BRAK PRZESŁANIANIA): Brak maskowania wnętrza bramy magazynu
- **Lokalizacja**: `src/port-scenes.js:45`, `src/thames-port.js:1226-1231`.
- **Obserwacja w kodzie**:
  Gracz wchodzący do głównego magazynu portowego (`portJob.entry`) korzysta z funkcji `behindFront(draw, archHole, ...)` (linia 1231 w `thames-port.js`), która precyzyjnie przycina postać pod łukiem bramy.
  Dla pomocnika tartaku w `port-scenes.js:45` rysowana jest funkcja `person(a)` bez żadnego maskowania. Wprowadzono jedynie parametr `dark = clamp01((SPOT.door[1]-.15-p[1])/.8)`, który jednak nie jest przekazywany do funkcji `person` ani `docker`! `docker` w `port-scenes.js` nie korzysta z parametru `dark` (funkcja `person(a, top)` przyjmuje tylko kolory ubrania i nie przyciemnia sylwetki). W efekcie postać w pełnej jasności rysuje się na tle ściany frontowej.

### Błąd 3 (BRAKI W REKWIZYTACH): Majster (foreman) nie ma w rękach notesu ani ołówka
- **Lokalizacja**: `src/port-life.js:784-802`, `src/port-scenes.js:45`.
- **Obserwacja w kodzie**:
  W `src/port-life.js` zaimplementowano zaawansowaną logikę majstra:
  - `book: {at: handWorld(P, pose, 1)}` (notes pod pachą / w dłoni),
  - `pencil: {state: pencil, at: handWorld(P, pose, -1)}` (ołówek wyciągany do pisania),
  - `rule: {open: lay, at: handWorld(P, pose, -1)}` (składana miarka stolarska mierzona na desce).
  Tymczasem w `src/port-scenes.js:45`:
  ```javascript
  for(const a of [L.yard.wood,L.yard.hand,L.yard.fore]) add(a.P.i,a.P.j,()=>{
    person(a,['#302b24','#554737','#796448']);
    board(a.board);
    if(a.saw){ const q=a.saw.handle...; stroke(...); }
  });
  ```
  **Majster tartaku jest renderowany jak zwykły doker z pustymi rękami!**
  Notes (`book`), ołówek (`pencil`) oraz miarka (`rule`) są całkowicie ignorowane w pętli renderowania! Majster wykonuje gesty pisania i mierzenia "w powietrzu" pustymi dłońmi.

### Błąd 4 (BRAK ANIMACJI ŚCINKA): Odcięty kawałek deski (offcut) nie jest rysowany
- **Lokalizacja**: `src/port-life.js:717-721`, `src/port-scenes.js:23-29, 45`.
- **Obserwacja w kodzie**:
  W `src/port-life.js` autor stworzył staranną fizykę odpadającego klocka drewna:
  ```javascript
  let offcut={state:'ON_BENCH',ang:0,drop:0};
  if(!inSaw||u>=SAW_END){ ... offcut=BENCH.top+PLANK.raw.th-drop>BIN.h-.3?{state:'FALLING',ang,drop}:{state:'IN_BIN',ang:0,drop:0}; }
  ```
  Jednak w `src/port-scenes.js` obiekt `a.offcut` **nie jest nigdzie rysowany**. Kiedy stolarz kończy 12. pociągnięcie piłą, odcięty koniec deski po prostu dematerializuje się / znika w powietrzu, zamiast spaść z kozła do kosza.

### Błąd 5: Brak trocin i wiórów na stanowisku cięcia (Sawdust & Wood Shavings)
- **Lokalizacja**: `src/port-extension.js:156-184`, `src/port-details.js:196-220`.
- **Obserwacja**:
  Pod kozłem stolarskim i wokół skrzyni bruk jest nieskazitelnie czysty (jednolite szare płyty). W realistycznym wiktoriańskim tartaku na nabrzeżu pod kozłem zawsze zalegała gruba warstwa jasnych trocin, pyłu drzewnego i wiórów zheblowanego drewna (podobnie jak zrobiono w `src/work.js:73` dla rzeźni: `sawdust on wet flagstones`). Taki detal natychmiast ożywia scenę i nadaje jej zapach warsztatu stolarskiego.

### Błąd 6: Sztywne i monotonne ułożenie desek na stosach
- **Lokalizacja**: `src/port-life.js:527-532`, `src/port-scenes.js:23-29`.
- **Obserwacja**:
  Wszystkie deski w stosie surowym i obrobionym leżą idealnie pod kątem prostym, co do piksela w tych samych współrzędnych. W rzeczywistym składzie drewna deski mają drobne przesunięcia wzdłużne (1–3 piksele), lekkie wyszczerbienia końców oraz zróżnicowane odcienie (świeże jasne sosnowe drewno vs ściemniałe od wilgoci i deszczu).

---

## 4. Ocena wierności historycznej (Victorian London, Wapping 1868)

### Elementy zgodne z realiami epoki:
1. **Ręczna obróbka na nabrzeżu**: W 1868 roku wzdłuż Tamizy (szczególnie w rejonie Wapping, Rotherhithe i Surrey Commercial Docks) drewno spławiane w tratwach lub wyładowywane z barek było wstępnie docinane na nabrzeżach przez cieśli okrętowych i tragarzy drewna (*deal porters*).
2. **Kozły i piły ramowe/jednoręczne (ripsaw / handsaw)**: Narzędzia i układ stanowiska odpowiadają rycinom z epoki (np. ilustracjom Gustave'a Doré *London: A Pilgrimage* z 1872 r.).
3. **Pojemniki i beczki ze smołą**: Wykorzystanie beczek, skrzyń z okuciami i żelaznych haków doskonale oddaje charakter doków.

### Elementy wymagające poprawy wiarygodności:
1. **Tragarze drewna (Deal Porters)**: W wiktoriańskim Londynie tragarze drewna z Surrey Docks nosili charakterystyczne skórzane nakrycia głowy z długim karkownikiem (*leather backing*) chroniącym przed drzazgami i żywicą. W grze pomocnik i stolarz mają standardowe ubrania dokerów w kolorach brązu i szarości. Wzbogacenie ich sylwetki lub dodanie fartucha stolarskiego u stolarza wzmocniłoby immersję.
2. **Podkłady pod drewno**: Drewno w wiktoriańskim porcie nigdy nie leżało bezpośrednio na mokrym nabrzeżu z uwagi na zgniliznę i szczury – obecność solidnych bali podkładowych jest wymogiem historycznym.

---

## 5. Podsumowanie i rekomendacje dla fazy implementacji

| Priorytet | Zadanie | Proponowane rozwiązanie w kodzie |
|---|---|---|
| **P0 (Krytyczny)** | Naprawa wchodzenia pomocnika do magazynu drewna | 1. Ograniczenie punktu `SPOT.inside` do linii tuż za ościeżem bramy (`j = 4.45`).<br>2. Wprowadzenie maskowania/obcinania postaci w bramie `F2` w `port-scenes.js` (analogicznie do `behindFront` w `thames-port.js`). |
| **P0 (Wizualny)** | Renderowanie rekwizytów majstra (notes, ołówek, miarka) | W `port-scenes.js` dodać rysowanie notesu majstra (`a.book`), ołówka (`a.pencil`) oraz rozkładanej miarki (`a.rule`) przy użyciu prostych linii `stroke`/`thin` w kolorach kości słoniowej/ochry i mosiądzu. |
| **P1 (Wizualny)** | Renderowanie odciętego klocka deski (`offcut`) | W `port-scenes.js` dodać rysowanie klocka spadającego do kosza w oparciu o stan `wood.offcut` (`FALLING` / `ON_BENCH`). |
| **P1 (Estetyka)** | Bale podkładowe pod stosami drewna | W `port-scenes.js` przed narysowaniem desek stosu wymalować 2 poprzeczne ciemne belki podkładowe `isoBox` unoszące stos na `STACK_BASE = 1.3`. |
| **P2 (Klimat)** | Plama trocin pod kozłem stolarskim | W `port-extension.js` lub `port-details.js` dodać procedurę plamy trocin (`sawdust`) na bruku pod punktem cięcia (`BENCH.cut`). |
| **P2 (Plastyka)** | Pogrubienie i zróżnicowanie desek | Zastąpienie pojedynczego `stroke` deski bryłą z widocznym czołem i krawędzią (np. podwójny obrys lub mikro-prostopadłościan). |
