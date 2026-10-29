# CODEMAP — szybka nawigacja dla agentów AI

> Indeks **gdzie szukać**, nie drugi opis architektury. Aktualne zachowanie ustala kod.
> Czytaj ten plik po `AGENTS.md`; `ARCHITECTURE.md` i dokumenty mechanik otwieraj **wybiórczo**.

## Jak oszczędzać kontekst

1. Nazwij podsystem i wybierz 1–3 pliki z tabeli poniżej. Zajrzyj do testu danej mechaniki.
2. Najpierw wyszukaj symbol/eksport i jego wywołania (`rg -n 'symbol' src tests`); czytaj odpowiednie zakresy plików, nie wszystkie moduły.
3. Poszerz zakres dopiero, gdy przepływ przechodzi przez innego właściciela stanu lub kontrakt zapisów/animacji. Importy bywają cykliczne; sam import nie oznacza właściciela.
4. Nie ładuj do kontekstu na start `*-kontekst.md` (duże historyczne zrzuty), `reference/boxer_heavybag-2.html` (oryginał), ani danych `src/*-plate.js` (duże obrazy zakodowane w JS). Szukaj w nich tylko przy konkretnym zadaniu.
5. Przy zmianie ścieżek lub odpowiedzialności modułów popraw właściwy wiersz tej mapy; nie kopiuj tu opisu całego kodu.

## Szkielet aplikacji i odpowiedzialność

```text
index.html -> src/main.js [jawna kolejność initialize()]
             -> src/loop.js [krok 60 Hz / start]
                -> src/runtime.js [tick wg gstate]
                -> src/renderer.js [render wg gstate]
Wejście: src/input.js -> src/navigation.js / tryb
Świat:   src/gym.js + src/rooms.js -> moduły pomieszczeń
Zapis:   src/progression.js -> src/save-store.js -> localStorage
```

- Stan i publiczne operacje należą do poszczególnych modułów (`state`). Nie ustawiaj bezpośrednio obcego `state`; kontrakty i wyjątki opisuje `ARCHITECTURE.md`.
- `src/gym.js` to **obecna geometria, ruch i render izometrycznych pomieszczeń**, nie usunięty kreator siłowni.
- `src/card-data.js` to katalog skilli, ciosów, Cech i ran — mimo historycznej nazwy **nie oznacza aktywnej walki kartami**.
- `src/sparring.js` zawiera m.in. rywali i trening z cieniem; więzienne starcia real-time rozgrywa `src/iso-fight.js`.

## Zadanie -> zacznij od tych plików

| Obszar / objaw | Pierwsze pliki | Jeśli trzeba zajrzyj dalej |
| --- | --- | --- |
| Start, brak uruchomienia, zależności inicjalizacji | `src/main.js`, `src/loop.js` | `src/runtime.js`, `src/renderer.js`, `index.html` |
| Przełączanie trybów, Esc/pauza, przejścia | `src/navigation.js`, `src/input.js` | `src/runtime.js`, `src/menu.js`, `src/time.js` |
| Klawiatura, mysz, gesty, wciśnięte klawisze | `src/input.js` | `src/iso-fight.js`, `src/gym.js`, `src/navigation.js` |
| Wspólna izometria, kolizje, kamera, kolejność głębi | `src/gym.js`, `src/renderer.js` | `src/rooms.js`, `src/cast.js` |
| Wejścia do pokoi, interakcja E, stacje | `src/rooms.js`, `src/gym.js` | `src/navigation.js`, `src/prison.js` |
| Cela Ward, prycze, światło, mieszkańcy | `src/ward.js`, `src/rooms.js`, `src/npcs.js` | `src/cell-light.js`, `src/ward-wall.js` |
| Spacerniak, tłum, NPC, rozmowy | `src/exercise-yard.js`, `src/npcs.js` | `src/gym.js`, `src/prison.js` |
| Łaźnia | `src/bath.js`, `src/rooms.js` | `src/gym.js`, `src/prison.js` |
| Dzień więzienny, posiłki, dyżury, waluty | `src/prison.js`, `src/simulation.js` | `src/ward-meal.js`, `src/prison-data.js`; `PRISON.md` |
| Bójka izometryczna, sterowanie, AI, wynik | `src/iso-fight.js`, `src/realtime-rules.js` | `src/sparring.js`, `src/prison.js`, `src/npcs.js`; `CIOSY.md` |
| Pozy walki, szkielet, wygląd, efekty ciosów | `src/animation.js`, `src/boxing.js` | `src/appearance.js`, `src/fighter-context.js`, `src/cast.js` |
| Cień / trening kombinacji | `src/shadowboxing.js`, `src/shadow-sequence.js` | `src/sparring.js`, `src/cell-fight-scene.js`, `src/ward-wall.js` |
| Pompki i podciąganie | `src/pushups.js`, `src/pullups.js` | `src/pullup-scene.js`, `src/training-session.js` |
| Karaluchy | `src/roaches.js`, `src/roach-rules.js` | `src/roach-scene.js`; `KARALUCHY.md` |
| Korba | `src/crank.js`, `src/crank-rules.js` | `src/crank-scene.js`, `src/prison.js`; `CRANK.md` |
| Siłowanie, praca w rzeźni | `src/armwrestle.js` lub `src/work.js` (tylko debug; most `src/diagnostic-work.js`) | `src/prison.js`, `src/cast.js` |
| Port / prolog / dorożka | `src/thames-port.js`, `src/port-story.js` | `src/carriage.js`, `src/iso-fight.js` |
| XP, statystyki, Profesor, drzewka, Cechy | `src/progression.js`, `src/stats.js`, `src/profesor.js` | `src/skill-tree.js`, `src/card-data.js`, `src/perk-rules.js`, `src/char-sheet.js`; `PROGRESSION.md`, `PERKI.md` |
| Zapis, sloty, migracje, odporność na błędy | `src/save-store.js`, `src/progression.js` | `src/legacy-save-data.js`, `tests/save-store.test.js`; `ARCHITECTURE.md` § Zapis |
| HUD, dialogi, opcje, style | `src/menu.js`, `src/dialog.js`, `src/styles.css` | `src/options.js`, `src/pocket-watch.js`, `src/need-icons.js` |
| Renderowane tła / malowane sceny | `src/ward.js`, `src/exercise-yard.js`, `src/bath.js` | `src/*-plate.js` (nie czytaj payloadów bez potrzeby), `scripts/render-room.mjs`, skille w `.claude/skills/` |

## Testowanie: najmniejszy sensowny zakres

- Jednostkowe: `node --test tests/<mechanika>.test.js` (np. `crank.test.js`, `realtime-rules.test.js`, `save-store.test.js`, `input.test.js`, `roach-rules.test.js`). Wszystkie: `npm test`.
- Integracyjne/obrazowe: `npm run test:browser -- --only=crank`, `--only=isometric`, `--only=prison`, `--only=Thames`. Filtrowanie dopasowuje **fragment nazwy scenariusza** z `tests/browser.mjs`, nie nazwy plików.
- Typy: `npm run check`. **Źródło prawdy o plikach objętych `checkJs`: `tsconfig.json`** (lista zmienia się w czasie).
- Zmiany wyłącznie w Markdown: bez testów runtime; sprawdź ścieżki, odnośniki i zgodność z kodem.
- Render scen: `scripts/render-room.mjs`, `scripts/render-port.mjs`, `scripts/iso-fight-shot.mjs`. Nie sprawdzaj całej gry przy każdej małej korekcie graficznej.

## Dokumentacja głęboka — otwieraj na żądanie

- `README.md` — uruchomienie, zasady i sterowanie z perspektywy gracza.
- `ARCHITECTURE.md` — właściciele stanu, przepływy, invariants zapisu/animacji.
- `PRISON.md`, `NEWGATE.md`, `CIOSY.md`, `CRANK.md`, `KARALUCHY.md`, `TALIA.md`, `PERKI.md`, `PROGRESSION.md` — specyfikacje poszczególnych systemów. Nie czytaj wszystkich naraz.
- `.claude/skills/painted-pixel-assets/` i `.claude/skills/roadwork-scene-art/` — procedury assetów/scen, wyłącznie dla odpowiednich zadań. Gdy instrukcja skilla i drzewo repo są sprzeczne, sprawdź **aktualny kod**.
