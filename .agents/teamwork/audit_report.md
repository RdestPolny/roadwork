# Raport Audytu i Oceny: Rejon Tartaku nad Tamizą (Roadwork)

## 1. Wprowadzenie i Kontekst
Niniejszy raport stanowi realizację wymagania **R1** projektu weryfikacji i udoskonalenia sceny portowej w grze *Roadwork* (Londyn, 1868). Audyt objął wszystkie obiekty, architekturę, proceduralne assety graficzne oraz zachowania i cykle animacji postaci pracujących w obszarze tartaku (*timber yard*) na wschodnim nabrzeżu Wapping.

---

## 2. Ocena Assetów i Obiektów Sceny Tartaku

| Obiekt / Asset | Plik źródłowy | Ocena obecna | Zidentyfikowane mankamenty | Planowane usprawnienie |
|---|---|---|---|---|
| **Magazyn drewna i wrota** (*Timber warehouse & gate*) | `src/port-extension.js:157, 171` | Dostateczna (3/5) | Wrota magazynu są rysowane w rzucie izometrycznym na linii `j = 4.5`. W logice postać wchodzi w głąb (`j = 3.7`), ale brak maskowania wnętrza otworu drzwiowego. | Dodać maskowanie otworu drzwiowego lub ukrywanie postaci za fasadą magazynu, gdy postać znajduje się w stanie `INSIDE`. |
| **Stół stolarski / kozły** (*Carpenter workbench*) | `src/port-district.js:49`, `src/port-scenes.js:31-34` | Dostateczna minus (2.5/5) | Kozły (`trestles`) i blat są rysowane jako uproszczone ciemne słupki bez faktury drewna, zastrzałów stabilizujących i bez wycięć pod cięcie. | Wzbogacić geometrię kozłów o poprzeczki i zastrzały, nadać blatowi widoczną grubość i fakturę drewna iglastego/dębowego. |
| **Stos desek surowych** (*Raw deals stack*) | `src/port-district.js:50`, `src/port-scenes.js:36-39` | Niedostateczna (2/5) | Stos zaczyna się na wysokości `STACK_BASE = 1.3`. Z powodu braku legarów podkładowych deski lewitują w powietrzu nad mokrym brukiem nabrzeża. | Dodać poprzeczne drewniane legary podkładowe (*dunnage bearers*) leżące bezpośrednio na nabrzeżu pod stosem. |
| **Stos desek przyciętych** (*Finished deals stack*) | `src/port-district.js:51`, `src/port-scenes.js:36-39` | Niedostateczna (2/5) | Podobnie jak stos surowy – lewituje bez podkładów; deski układane są jako cienkie linie 2D bez krawędzi i cieniowania. | Dodać legary podkładowe oraz zintegrować cieniowanie krawędzi i czół desek. |
| **Deski drewniane** (*Planks / deals*) | `src/port-scenes.js:23-29` | Niedostateczna (2/5) | Rysowane pojedynczymi liniami `stroke()` i `thin()` ("zapałki") o grubości 1 piksela, bez wolumetrii, widocznych słojów czy zróżnicowania płaszczyzn oświetlonych/zacienionych. | Wdrożyć cieniowane, wolumetryczne deski izometryczne z płaszczyzną górną i boczną oraz zaakcentowanym czołem. |
| **Kosz na ścinki** (*Offcut bin*) | `src/port-district.js:55`, `src/port-scenes.js:35` | Dostateczna (3/5) | Skrzynia na ścinki stoi obok kozła, lecz pozostaje permanentnie pusta; odpadające klocki nie trafiają do wnętrza. | Wyrenderować ścinki drewna gromadzące się wewnątrz kosza w miarę postępu prac. |
| **Piła stolarska** (*Hand saw*) | `src/port-scenes.js:45` | Dostateczna (3/5) | Rysowana jako cienka pojedyncza linia; brak brzeszczotu o zmiennej szerokości, uchwytu pistoletowego i realistycznego nachylenia zębów. | Uczytelnić brzeszczot piły z zaznaczeniem rękojeści i metalicznego połysku stali. |
| **Pomost i nabrzeże** (*Timber pier & deck*) | `src/port-extension.js:38, 75` | Dobra (4/5) | Solidna konstrukcja belkowa nad Tamizą, ładne odbicia wody. Brakuje drobnych detali: trocin wokół stanowiska, wiórów i klinów. | Dodać plamy trocin (*sawdust scatter*) wokół stołu i kosza na ścinki. |

---

## 3. Ocena Rutyn i Zachowań Pracowników Tartaku

| Postać | Rola i Cykl | Stan obecny | Zidentyfikowane błędy i mankamenty | Planowane usprawnienia |
|---|---|---|---|---|
| **Drwal / Stolarz** (`woodworker`) | Pobranie surowej deski ze stosu surowego -> zaniesienie na stół -> ułożenie -> piłowanie (12 suwów) -> inspekcja -> odniesienie przyciętej deski na stos gotowy -> powrót. Cykl: 2072 ticki. | Dobry pod względem kinematyki IK i płynności ruchu, ale cierpi na braki wizualne. | 1. Podczas piłowania nie powstają żadne trociny.<br>2. Przy 12 suwie odcinany klocek (`offcut`) znika zamiast spaść do kosza.<br>3. Paleta ubrań jest identyczna jak u dokerów węglowych. | 1. Dodać cząsteczki trocin wyrzucane przy suwach piły w przód.<br>2. Zaimplementować renderowanie odpadającego klocka (`FALLING` -> `IN_BIN`).<br>3. Zmienić paletę stroju stolarza (fartuch rzemieślniczy / jaśniejsza koszula robocza). |
| **Tragarz** (`handler`) | Wyjście z magazynu -> zaniesienie nowej deski na stos surowy -> wyrównanie stosu -> przejście do stosu gotowego -> pobranie gotowej deski -> wniesienie do magazynu. | Poważny błąd renderowania. | **Krytyczny błąd wizualny (lewitacja)**: W stanie `INSIDE` (`SPOT.inside = [48.1, 3.7]`) postać jest renderowana bezwarunkowo na `j = 3.7`, przez co z powodu rzutu izometrycznego pojawia się na wysokości pierwszego piętra fasady budynku nad drzwiami! | Bezwzględnie wygasić renderowanie tragarza, gdy `a.state === 'INSIDE'` lub gdy znajduje się wewnątrz magazynu (`dark > 0.85`). Dodać ciemniejszy strój roboczy tragarza. |
| **Majster** (`foreman`) | Nadzorowanie prac, sprawdzanie jakości, mierzenie desek składaną miarką, notowanie w księdze ewidencyjnej. | Niewykorzystany potencjał kodu. | W `port-life.js:800` silnik wylicza precyzyjne współrzędne księgi (`a.book`), ołówka (`a.pencil`) oraz miarki (`a.rule`), ale `port-scenes.js` ich w ogóle nie rysuje! Majster wykonuje gesty pisania i mierzenia pustymi rękami. | Dodać renderowanie księgi (skórzana oprawa), grafitowego ołówka w dłoni oraz drewnianej składanej miarki z mosiężnym okuciem. |

---

## 4. Wnioski i Plan Działań (Milestone 2 & 3)
1. Wszystkie zidentyfikowane problemy mają charakter lokalny w obrębie 4 plików: `src/port-scenes.js`, `src/port-life.js`, `src/port-extension.js` i `src/port-details.js`.
2. Architektura symulacji `portLife(t)` jest ściśle deterministyczna i stabilna (testy `tests/port-district.test.js` przechodzą w 100%).
3. Istnieje gotowy, sprawdzony prototyp narzędzia do generowania GIF-a w rozdzielczości 432×288 z wykorzystaniem Playwright i FFmpeg (`scratch/record_test_gif.mjs`), który po wdrożeniu poprawek zostanie zintegrowany jako dedykowany skrypt `scripts/record-timber-gif.mjs`.
