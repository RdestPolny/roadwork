# Praca nad Roadwork

Przeglądarkowa gra (Newgate i port nad Tamizą, 1868): natywny ESM bez bundlera, własny renderer pikselowy, jawna kolejność `initialize()` w `src/main.js`. Cykliczne importy zostają; zachowaj działający start aplikacji.

## Jak zacząć zadanie

1. Przeczytaj `CODEMAP.md`, nazwij podsystem i wybierz 1–3 pliki z jej tabeli.
2. Szukaj symbolu (`rg -n 'symbol' src tests`) i czytaj zakresy linii, nie całe moduły. Linie bywają bardzo długie: dopasowuj edycje do charakterystycznego fragmentu.
3. Zanim zmienisz kod, prześledź rzeczywisty przepływ mechaniki w kodzie. Dokumenty mechanik (`PRISON.md`, `CIOSY.md` …) i `ARCHITECTURE.md` otwieraj tylko, gdy zadanie dotyczy zasad gry albo przekrojowych kontraktów; przy sprzeczności rozstrzyga kod.
4. Nie ładuj bez konkretnej potrzeby: `*-kontekst.md` (zrzuty dla innego AI), `src/*-plate.js` (obrazy zakodowane w JS), `reference/boxer_heavybag-2.html` (oryginał do porównania, nie edytuj go), `PROJECT.md` (historyczna specyfikacja rutyny rybaka i kota, nie opis projektu).
5. Prace nad wyglądem scen prowadź skillem `roadwork-scene-art`, grafikę z obrazu-wzoru skillem `painted-pixel-assets` (oba w `.claude/skills/`; przeczytaj ich `SKILL.md`, a przy `painted-pixel-assets` także `references/roadwork.md`).

Uruchomienie: `npm run dev` (http://127.0.0.1:5173, w aplikacji podgląd `roadwork` z `.claude/launch.json`). Narzędzia deweloperskie, cheaty i `window.__boxer` są dostępne wyłącznie po świadomym włączeniu `?debug=1` i tak ma zostać.

## Zakres zmian

- Rób małe, konkretne zmiany. Reużywaj istniejące funkcje i możliwości przeglądarki; bez nowych abstrakcji, zależności i narzędzi „na przyszłość”. Bez nowego silnika i bundlera (Vite itp.) w ramach zwykłej poprawki.
- Refaktor i optymalizacja zachowują grafikę, animacje, sterowanie, tempo, balans i treść gry. Zmiana zachowania wymaga polecenia użytkownika albo osobnego uzasadnienia w raporcie; zamierzoną zmianę wyglądu rób jako osobny krok.
- Cudzy stan zmieniaj publiczną operacją właściciela, nie przypisaniem do importowanego `…State`; brakującą małą operację dodaj u właściciela.
- Duże moduły dziel przy rzeczywistej zmianie, nie dla liczby linii.
- Nowe helpery opisuj JSDoc. Komentarze w kodzie po angielsku, dokumentacja projektu po polsku.

## Kontrakty

- Zapis: nie zmieniaj kluczy `heavybag.save`, `heavybag.slot.1`–`heavybag.slot.3` ani schematu bez migracji i testu starego zapisu. Zachowaj ochronę uszkodzonego zapisu, przyszłych wersji i pustego `gym:[]`. `saveStore.state` ma stałą referencję: reset przez `merge({})`, zapis do Storage przez store.
- Czas: zegar wejścia i symulacji ma wspólną podstawę; pauza nie resetuje osi czasu ani cyklu bezczynności. Gra nie używa BPM ani metronomu.
- Pole kontekstu zawodnika `F.S` dodawaj razem z wpisem we wspólnej mapie `CONTEXT_FIELDS` (`fighter-context.js`) i sprawdź zapis oraz odczyt.
- Port: stały rekwizyt to jeden wpis w `PORT_PROPS` (`src/port-district.js`) plus rysunek pod tym samym `id` w `propDraws({...})`; kolizja i klucz głębi biorą się z obrysu. Tło portu jest wypiekane w kafle, więc tekstury w kodzie tła liczą szum ze współrzędnych świata (`x-camera.x`), nie ekranu. Szczegóły: `.claude/skills/roadwork-scene-art/references/port.md`.
- Postacie rysuje kod, nie sprite'y: w pokojach, bójce izometrycznej i porcie `figureHD()` (`src/gym.js`) na szkielecie `src/fighter-rig.js`; `drawBoxer()` (`src/boxing.js`) tylko w scenach bocznych (Cień, pompki, praca, `cast.js`). Wzorce PNG trzymaj lokalnie w `art/` (poza repozytorium).

## Weryfikacja

Gra ma sztywne okno; pracuj w kadrze 1280×800 i nie sprawdzaj innych rozmiarów ekranu bez polecenia. Uruchamiaj najmniejszy zestaw, który pokrywa zmianę, i podawaj krótki wynik, nie logi.

| Zmiana | Sprawdzenie |
| --- | --- |
| Logika jednej mechaniki | `node --test tests/<mechanika>.test.js`; dla poprawianego błędu dodaj najmniejszy test, który go wykrywa (nie fuzzer ani skrypt w `scratch/`) |
| Inicjalizacja, wejście, czas, menu, zapis, przejścia trybów | `npm run test:browser -- --only=<fragment nazwy scenariusza>` (`--list` pokazuje nazwy) |
| Rysowanie, renderer, wspólne helpery scen | `npm run test:visual` (11 scen piksel w piksel); refaktor i optymalizacja muszą przejść bez zmian |
| Zamierzona zmiana wyglądu | obejrzyj natywną klatkę `node scripts/shot.mjs --scene=… [--diff=…]` (headless, nie panel przeglądarki), potem `npm run test:visual -- --only=… --update` i commituj wzorce razem ze zmianą |
| Wydajność rysowania portu | `node scripts/profile-port.mjs` (budżet 16,7 ms na klatkę) |
| Moduły z `tsconfig.json` lub jego konfiguracja | `npm run check`; nowy moduł dopisuj do `checkJs`, gdy nad nim pracujesz i naprawisz jego błędy |
| Wspólne mechanizmy, ryzyko szerokiej regresji | pełne `npm test` i `npm run test:browser` |
| Tylko Markdown | bez testów; sprawdź ścieżki, polecenia i zgodność z kodem |

- `npm test` jest w całości zielony: czerwony test oznacza regresję, nie stan bazowy. Testy reguł walki liczą oczekiwania z `TUNING`/`PUNCH_COST`/`PUNCH_DAMAGE`, więc strojenie liczb ich nie psuje; zmiana zasady wymaga poprawy testu w tym samym commicie.
- Zrzuty, profile i pliki pomocnicze zapisuj w `artifacts/tmp/` (ignorowane) lub w scratchpadzie, nie w repozytorium.
- W raporcie podaj wykonane sprawdzenia i rzeczywiste ograniczenia. Nie przypisuj wyników testom, których nie uruchomiono.

## Subagenci

- Używaj ich tylko wtedy, gdy oszczędzają kontekst albo poprawiają wynik (szerokie przeszukanie, niezależna recenzja).
- Startuj ich bez kopii bieżącej rozmowy (Codex: `fork_turns="none"`; Claude Code: zwykły nowy agent, nie fork) i daj kompletny opis zadania.
- Każdemu przydziel jednoznaczną własność plików lub odpowiedzialności. Inni pracują równolegle: nie cofaj ich zmian i dostosuj własne do aktualnego kodu.

## Git

- Nie dotykaj nieśledzonych plików, których nie tworzyłeś: commituj przez `git add -u` albo z jawną listą plików.
- Wiadomości commitów: `typ(obszar): opis` po angielsku (`feat`, `fix`, `perf`, `test`, `docs`, `chore`), w treści co i dlaczego oraz wynik sprawdzeń, gdy ma znaczenie.
- Commit i push tylko na polecenie użytkownika. Przed `push` zrób `git fetch`: na zdalnej gałęzi pracują też inne agenty, a lokalna gałąź bywa wiele commitów do tyłu. Gdy „zniknęła” zmiana, `node scripts/branches.mjs --fetch` pokazuje, czego brakuje.
