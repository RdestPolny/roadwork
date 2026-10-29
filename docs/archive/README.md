# Archiwum Roadwork — nie jest źródłem aktualnych reguł

Pliki przeniesione z aktywnego katalogu, zachowane bez modyfikacji zawartości i z pełną historią Git.

- `context/`: historyczne wielkie zrzuty rozmów i implementacji. Nie czytaj ich domyślnie przy zadaniach AI — mogą zawierać nieaktualne mechaniki.
- `design/PRISON-2026-10-03.md`: dawny projekt aktu więziennego, błędnie traktował respekt, raporty i Smithfield jako aktywną rozgrywkę. Aktualnie: [PRISON.md](../../PRISON.md).
- `design/CIOSY.md`, `design/TALIA.md`: historia walki kartami i starszych projektów drzewek; nie wykonuj opisanych tam komend do usuniętych symulatorów.
- `unused-assets/`: niewłączone do aplikacji obrazy `*-plate.js`, nieużywana scena `cell-fight-scene.js` i historyczne generatory. Źródła graficzne w ignorowanym `art/` nie muszą znajdować się w Git — samo uruchomienie skryptów może wymagać niedostępnych plików.

Zanim odzyskasz element z archiwum, sprawdź istniejące API w `src/`, testy i `CODEMAP.md`. Przeniesienie nie usuwa historii Git ani automatycznie nie zmniejsza wielkości pobieranego repo.
