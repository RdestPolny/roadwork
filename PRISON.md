# Newgate 1868 — aktualna pętla więzienna

Stan implementacji: 2026-10-29. Jest to krótka mapa **tego, co działa**; nie zastępuje źródeł kodu. Pełny historyczny projekt (liczby, fabuła, zamysły) znajduje się w [archiwum](docs/archive/design/PRISON-2026-10-03.md). Archiwalny projekt nie jest specyfikacją bieżącego zachowania.

## Lokacje i harmonogram

- Gra zaczyna się w Wardzie (`cell`); dostępne pomieszczenia więzienne to `cell`, `yard` i `laznia`. Posiłki wydaje się przez klapę w Wardzie; nie ma osobnej stołówki.
- Dzień ma trzy fazy: rano, południe, wieczór, po dwie akcje. Przejścia między pokojami nie zużywają akcji. Zegar, bramki czynności i rozliczenie faz: `src/simulation.js`, `src/prison.js`, `src/rooms.js`.
- **Aktualną pracą** jest żelazna korba: 30 sekund, rano w dni pracy, 1 akcja, bez zapłaty, XP Siły i Wytrzymałości. Obsługa: `src/crank.js`, `src/crank-rules.js`, `src/prison.js`, [CRANK.md](CRANK.md).
- Scena rzeźni Smithfield nie jest częścią normalnej pętli. Pozostała jako prototyp diagnostyczny pod `?debug=1` (`src/work.js`); nie jest przydziałem pracy więźnia.

## Bójki i rozwój

- Bójki odbywają się w czasie rzeczywistym w pokojach izometrycznych, a nie przez karty i ręcznie wybierane tury. Wejście: `src/sparring.js`, rozgrywka: `src/iso-fight.js`, reguły: `src/realtime-rules.js`.
- Obecna rozgrywka **nie przyznaje respektu ani raportów** za bójki. Historyczne pola `respekt`, `raporty`, `izolatkaDo` pozostają w schemacie zapisu tylko tam, gdzie potrzebne są do odczytu/migracji. Nie traktuj ich jako aktualnych nagród ani kar.
- Rozwój Spacerniaka jest związany z listą Profesora i przewidzianymi przez kod nagrodami, a nie z rangami respektu. Logika: `src/prison.js`, `src/prison-data.js`.
- Postać zdobywa XP z treningów i bójek; Newgate ogranicza rozwój atrybutów do poziomu 15. Próbami i nauką zajmuje się Profesor: `src/progression.js`, `src/profesor.js`, `src/training-data.js`, [PROGRESSION.md](PROGRESSION.md).
- `src/card-data.js` mimo nazwy wciąż zawiera dane skilli, Cech, węzłów ciosów i ran. Silnika karcianej walki **nie ma**. Historia tamtego rozwiązania: [CIOSY.md](docs/archive/design/CIOSY.md), [TALIA.md](docs/archive/design/TALIA.md).

## Inne systemy

Prymek tytoniu i konto więzienne, posiłki, potrzeby, odpoczynek, łaźnia, wyzwania Profesora, niedzielne bójki, zakłady i leczenie obsługują aktualne moduły `prison`, `prison-data`, `ward-meal`, `simulation`, `profesor`, `healers`. Dla szczegółów zachowania stosuj kod i testy, nie historyczne liczby z archiwum.

## Zapis i testowanie

- Zachowaj klucze `heavybag.save` oraz `heavybag.slot.1`–`heavybag.slot.3` i migracje starych zapisów (`src/save-store.js`, `src/legacy-save-data.js`).
- `npm test`, `npm run check`, `npm run test:browser -- --only=crank`; scenariusze nadzoru/rozwoju więzienia: `tests/prison.mjs`.
- Do wyszukiwania właściciela mechaniki używaj [CODEMAP.md](CODEMAP.md), potem [ARCHITECTURE.md](ARCHITECTURE.md).
