# Audyt szkieletu i powierzchni postaci HD — Roadwork (31.10.2026)

## Zakres i źródła

Kod bazowy: `src/iso-fight.js` (stawy, długości kości, IK i reakcja na cios), `src/gym.js` (wspólny renderer `figureHD`), `src/hd-fight-scene.js` (akcenty 432×288), `src/npcs.js` (pozy współwięźniów) i `src/figure-anatomy.js` (nowe proporcje powierzchni).

Zmiany z PR #10 (geometria jab/cross/hook/uppercut) stanowią bazę tej gałęzi. Ta iteracja **nie zmienia danych walki**, pozycji stawów, zasięgów, czasu kontaktu, długości kości IK ani mechanik gry. Przebudowany jest wyłącznie model widzialny w rendererze. Obejmuje gracza, Harry'ego, Edmunda Briggsa i współwięźniów korzystających z `figureHD`.

## Diagnoza — stan przed zmianami

| Obszar | Przyczyna | Efekt wizualny i ryzyko |
| --- | --- | --- |
| Czaszka | Sfera promienia 1.75 jednostki kształtu, niezależne duże fryzury, kości twarzy i nasadki głowy | Postać ma proporcje bardziej „retro figurki” niż dorosłego człowieka; osobne zmniejszenie czaszki rozpięłoby fryzurę i twarz |
| Barki / obojczyki | Jeden poziomy walec pomiędzy barkami | Zbyt płaskie ramiona, brak spadku mięśnia czworobocznego ku szyi, nienaturalny „drążek” przy rotacji |
| Tułów | Domyślnie pojedyncza bryła miednica–klatka; 2 bryły tylko przy `J.abd` | Talia i dolne żebra praktycznie niewidoczne u chodzących NPC; ubranie może przypominać stożek lub sztywny klocek |
| Ramię / łokieć | Biceps i przedramię podobnej grubości, połączenie końca jednego walca z początkiem drugiego | Zbyt równa grubość ramienia, mało czytelny łokieć i nadgarstek |
| Uda / łydki | Szerokie łydki do samej kostki i niewielki spadek między kolanem a stopą | Noga w ruchu przypomina walec, szczególnie w półprzysiadzie |
| Dłoń i stopa | Wąski nadgarstek przechodzący w proste zakończenie; jednolita objętość buta | Brak czytelnego rozdzielenia pięści od przedramienia, stopa mogła wyglądać jak kloc |
| Odmiany ciała | Osobne mnożniki `bulk` w środku renderera | Trudno rozbudować modele Harry'ego, Edmunda i przyszłych rywali bez rozjechania proporcji |
| Budżet geometrii | `IP_N=32`; `ipAdd` nie dodaje bryły po przekroczeniu limitu | Ryzyko pomijania późniejszych akcesoriów, zwłaszcza po rozbudowie sylwetki i ubioru |
| Detale 3× | `drawHDCharacterDetails` bazował na starych wymiarach głowy | Po zmniejszeniu czaszki brwi, szwy włosów i kości policzkowe mogłyby wyglądać na oderwane |

## Wprowadzone poprawki

1. **Centralny profil proporcji** w `src/figure-anatomy.js`. Jeden zestaw radii powierzchni i opcjonalny profil `bodyType:'heavy'`, dalej respektujący indywidualne `bulk`. Pozwala rzeźbić postać bez zmiany IK lub identyfikatorów animacji.
2. **Głowa**: skala geometrii `0.90` względem starego modelu, łącznie z włosami, uszami, szczęką i punktami twarzy. Wzrokowo mniej duża wobec karku i tułowia. Głowa Edmunda pozostaje odpowiednio większa niż standardowa.
3. **Obręcz barkowa**: pojedynczy poziomy „pręt” zastąpiony dwiema skośnymi bryłami od klatki/mięśni czworobocznych do stawów barkowych. Punkty `J(s).sh` nie są przesuwane.
4. **Klatka i talia**: dwa połączone, cieniowane segmenty od miednicy przez brzuch/żebra do mostka również w zwykłych pozach. `J.abd` nadal steruje zgięciem, jeżeli występuje; w innych pozach segment pomocniczy jest wyliczany z miednicy i klatki.
5. **Kończyny**: bardziej czytelne różnice grubości: udo→kolano, łydka→kostka, ramię→łokieć, przedramię→nadgarstek→pięść. Stopy zachowują dotychczasową podstawę i pivot pięty z PR #10.
6. **Pojemność modelu** zwiększona z 32 do 64 kapsuł; aktualna tablica indeksów sortujących mieści 64 wpisy i nie grozi utratą kolejnych segmentów.
7. **Akcenty 432×288** na czole, brwiach, policzkach, włosach i szczęce podążają za tą samą skalą czaszki.

## Interpretacja proporcji

Zachowujemy **pixel art z ludzką sylwetką**, nie anatomie jak z symulatora sportowego. Realistyczna proporcja 7–8 wysokości głowy na całkowitą wysokość ciała nie musi się dobrze czytać w tej skali; przed zmianami głowa była bardzo duża względem korpusu. Redukcja o 10% to bezpieczna pierwsza iteracja, która lepiej rozdziela szyję i szczękę, nie niszczy czytelności twarzy. Zmiana geometrii „powierzchniowej” nie rozciąga kości, nie przesuwa dłoni i nie zmienia trafienia w rywala.

**Nie mylić szerokości barków z szerokością klatki piersiowej** — pierwsza wynika z odległości stawów i mięśni, druga z promieni kapsuł. Środek głowy jest sterowany animacją, a fryzura musi pozostawać jej częścią.

## Weryfikacja

Testy jednostkowe w `tests/figure-anatomy.test.js` sprawdzają ograniczenia kształtów, bezpieczną pojemność, mniejszą głowę, zwężenia kończyn oraz profil `heavy` i zakotwiczenie akcentów.

Kontrola w grze (konieczna, jeszcze **niepotwierdzona**):
- `/?debug=1` → HD Fight Test 432×288 — obejrzeć bohatera i Harry'ego przy bezruchu, ruchu przodem, bokiem i po skosie oraz podczas ciosów wysokich/niskich.
- Ustawić F8 (pauza), wykonać pojedyncze kroki kropką, zapisać F9 (PNG). Porównać przód, 3/4, bok, tył; start, 50% i kontakt każdego uderzenia; wejście i wyjście z dasha.
- `window.__boxer.startSpar(5,'cell')` — sprawdzić Edmunda: brzuch, szyja, barki, siedzenie, ciężki hook i zmęczenie.
- Zwykła eksploracja Wardu, spacerniaka i łaźni (także postacie siedzące/leżące, czapki, kaptury, płaszcze, skóry bez koszuli). Porównać cienie, warstwowanie kończyn i dorysowywane akcenty.
- Uruchomić `node --test tests/figure-anatomy.test.js`, `npm test`, `npm run check` i `npm run test:browser`.

## Znane ograniczenia i propozycja następnej iteracji

- **Pełna długość kości i proporcje segmentów** (wysokość miednicy względem całości, odległość bark–łokieć, udo/łydka) pozostają starymi punktami świata. Przeskalowanie ich wymaga równoczesnej migracji `fighterJoints`, `ragdollJoints`, `npcs`, `gym`, kamery i pozycji wizualnego trafienia; tego nie należy robić przypadkowo w pracy nad samym wyglądem.
- `drawHDCharacterDetails` celowo nie dorysowuje niektórych szczegółów przy `o.tilt`, aby nie układać twarzy/szwów w nieprawidłowej osi; pełne szczegóły w skręcie wymagają zakotwiczenia w ramie lokalnej głowy i klatki piersiowej.
- Można dodać profile `slim`, `athletic`, `stocky` i `older`, ale dopiero po ocenie czytelności obecnego neutralnego modelu i Edmunda.
- Ocenę ostatecznego wyglądu trzeba oprzeć na rzeczywistych PNG z gry; sama analiza kodu nie jest zastępstwem wizualnego review.
