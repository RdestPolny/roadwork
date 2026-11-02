# Praca nad Roadwork

Zacznij od krótkiej mapy `CODEMAP.md`: ustal podsystem, potem czytaj tylko właściwe moduły i ich bezpośrednie zależności. `README.md` i `ARCHITECTURE.md` czytaj selektywnie, gdy zadanie dotyczy zasad gry albo przekrojowych kontraktów. Zanim zmienisz kod, sprawdź rzeczywisty przepływ danej mechaniki; nie ładuj całego `src/`, dużych plików `*-kontekst.md` ani zakodowanych obrazów `src/*-plate.js` bez powodu. Projekt używa natywnego ESM, własnego renderera i jawnej kolejności `initialize()` w `src/main.js`. Cykliczne importy pozostają; zachowaj działający start aplikacji.

## Zakres zmian

- Rób małe, konkretne zmiany. Reużywaj istniejące funkcje i możliwości przeglądarki; nie dodawaj abstrakcji, zależności ani narzędzi na przyszłość.
- Podczas refaktoru zachowuj grafikę, animacje, sterowanie, tempo, balans i treść gry. Zmiana zachowania wymaga osobnego uzasadnienia lub polecenia użytkownika.
- Nie przenoś gry do nowego silnika ani bundlera bez konkretnej potrzeby. Nie dodawaj Vite ani innego bundlera w ramach zwykłej poprawki.
- Nie edytuj `reference/boxer_heavybag-2.html`. To oryginał do porównania.
- Nowy kod zmienia cudzy stan przez publiczną operację jego właściciela, a nie przez bezpośrednie przypisanie do importowanego `…State`. Dodaj małą operację u właściciela, jeśli jej brakuje.
- Duże moduły dziel przy rzeczywistej zmianie, nie wyłącznie dla zmniejszenia liczby linii.

## Kontrakty

- Nie zmieniaj kluczy `heavybag.save`, `heavybag.slot.1`–`heavybag.slot.3` ani schematu zapisu bez migracji i testu starego zapisu. Zachowaj ochronę uszkodzonego zapisu, przyszłych wersji i pustego `gym:[]`.
- Zachowaj stałą referencję `saveStore.state`. Resetuj zapis przez `merge({})`, a zapis do Storage obsługuj przez store.
- Zegar wejścia i symulacji ma wspólną podstawę. Pauza nie resetuje osi czasu symulacji ani cyklu bezczynności. Gra nie używa BPM ani metronomu; nie wprowadzaj ich.
- Dodając pole kontekstu zawodnika `F.S`, aktualizuj wspólną mapę `CONTEXT_FIELDS` w `fighter-context.js` i sprawdź zapis oraz odczyt.
- Cheaty i `window.__boxer` są dostępne wyłącznie po świadomym włączeniu `?debug=1`.

## Weryfikacja

- Gra ma docelowo sztywne okno. Pracuj w jednym stałym kadrze (obecny kadr testowy: 1280×800); nie projektuj responsywności ani nie sprawdzaj telefonów i różnych rozmiarów ekranu bez wyraźnego polecenia.
- Przy małych zmianach uruchamiaj tylko testy zmienionej mechaniki, np. `node --test tests/crank.test.js` lub `npm run test:browser -- --only=crank` (`--list` pokazuje nazwy scenariuszy). Pełny zestaw (`npm test`, `npm run test:browser`) uruchamiaj przy zmianach wspólnych mechanizmów albo konkretnym ryzyku regresji, nie automatycznie po każdej poprawce. Zwracaj krótki wynik zamiast pełnych logów.
- Dla poprawianego błędu logiki dodaj najmniejszy test, który go wykrywa. Nie pisz fuzzerów ani jednorazowych skryptów `scratch/*stress*` zamiast testu.
- Uruchom `npm run check` po zmianach w modułach objętych kontrolą typów lub w jej konfiguracji. Aktualna lista ścisłego `checkJs` znajduje się w `tsconfig.json` (obejmuje więcej niż trzy moduły); nie utrwalaj jej liczby w tej instrukcji.
- Uruchom odpowiedni scenariusz `npm run test:browser -- --only=…` po zmianach inicjalizacji, wejścia, czasu, menu, zapisu, przejść między trybami albo renderowania. Dla zmian wizualnych obejrzyj natywną klatkę: `node scripts/shot.mjs --scene=…` (headless; nie panel przeglądarki), tyle klatek, ile potrzeba do oceny ruchu.
- Nowe helpery opisuj JSDoc. Rozszerzaj `checkJs` moduł po module przy pracy nad nimi; nie deklaruj całego `src/` jako sprawdzonego bez naprawy błędów.
- Raportuj wykonane sprawdzenia i rzeczywiste ograniczenia. Nie przypisuj wyników testom, których nie uruchomiono.

- `npm test` jest w całości zielony; czerwony test to sygnał regresji, nie stan bazowy. Testy reguł walki odwołują się do `TUNING`/`PUNCH_COST`/`PUNCH_DAMAGE`, więc strojenie liczb ich nie psuje; zmiana zasady (nie liczby) wymaga poprawy testu w tym samym commicie.
- Zmiany renderera, wspólnych helperów rysujących i scen sprawdzaj `npm run test:visual` (klatki referencyjne kluczowych scen w `tests/visual/`, porównanie piksel w piksel). Różnicę obejrzyj w `artifacts/tmp/visual/<scena>-diff.png`; wzorce odświeżaj `npm run test:visual -- --update` tylko po zamierzonej zmianie wyglądu i commituj je razem z nią.

## Subagents

- Używaj subagentów tylko wtedy, gdy oszczędzają tokeny lub poprawiają jakość wyniku.
- Przy uruchamianiu subagenta zawsze ustaw `fork_turns="none"`.
- Każdemu przydziel jednoznaczną własność plików lub odpowiedzialności. Inni pracują równolegle: nie cofaj ich zmian i dostosuj własne do aktualnego kodu.

## Grafika z obrazu-wzoru

- Skill `painted-pixel-assets` leży w `.claude/skills/painted-pixel-assets/` (kopia projektowa). Przed użyciem przeczytaj `SKILL.md` i `references/roadwork.md`.
- Postaci rysuje kod, nie sprite'y: w bójce izometrycznej, pokojach i porcie `figureHD()` w `src/gym.js` na szkielecie `src/fighter-rig.js`; `drawBoxer()` w `src/boxing.js` tylko w bocznych scenach (Cień, pompki, praca, `cast.js`). Skin zawodnika to zmiana funkcji rysującej według PNG-wzorca (wzorce PNG trzymaj lokalnie w `art/`, poza repozytorium).

## Sceny portu (grafika kodem)

- Podgląd: `node scripts/shot.mjs --scene=port --at=i:j --out=nazwa` zapisuje PNG w `artifacts/tmp/`; przytnij i powiększ go (PIL, NEAREST). Pozycje obiektów są w `ANCHORS` w `src/port-district.js` (np. grajek ok. 40,6.7, wóz policyjny ok. 11,5). Przy zleceniu „usuń to coś obok” najpierw rozpoznaj na zrzucie, co to jest (np. siatka z `yardCraftProps`), dopiero potem tnij kod.
- Stałe rekwizyty portu (beczki, skrzynie, wóz, dźwig, pachołki, meble tła) mają jeden wpis w `PORT_PROPS` (`src/port-district.js`): obrys `box`/`circle`, z którego liczy się kolizja (`pad`, `block:false`) i klucz głębi (`key`, domyślnie środek obrysu), a rysunek jest rejestrowany pod tym samym `id` w `propDraws({...})` w `thames-port.js` albo `port-extension.js`. Nowy rekwizyt = wpis + funkcja rysująca; nie dopisuj osobnych prostokątów kolizji ani ręcznych pozycji w liście sortowania. Podgląd obrysów, kluczy i rzeczywistej kolizji: F8 pod `?debug=1` albo `node scripts/shot.mjs --scene=port --at=i:j --eval="(await import('/src/thames-port.js')).setPropMap(true)"`.
- Izometria: jednostka `z` to ok. 1 px, ekranowa pozioma to `(di, −dj)`. Kształt z jednej linii `thin()` wygląda na „otwarty”; pełny kształt składaj z kilku gęstych rządków. Bardzo ciemne kolory giną na ceglanej ścianie.
- `horse()` w `src/carriage.js` rysuje konie i w porcie, i przy dorożce; zmiana proporcji dotyczy obu scen.
- Renderer nie ma alfy: zanikanie rób mieszaniem koloru z tłem (`mix`).

## Git

- Nie dotykaj nieśledzonych plików, których nie tworzyłeś: commituj przez `git add -u` albo z jawną listą plików.
- Przed `push` zrób `git fetch`; na zdalnej gałęzi pracują też inne agenty, więc lokalna gałąź bywa wiele commitów do tyłu.
- Push tylko na wyraźne polecenie.
