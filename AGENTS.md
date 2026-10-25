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
