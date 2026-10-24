# Roadwork

Przeglądarkowa gra bokserska w Newgate, Londyn 1868. Wspólna cela Ward, spacerniak, łaźnia korzystają z własnego renderera pikselowego. Bójki rozgrywa się w czasie rzeczywistym: ciosy, garda i unik korzystają ze wspólnego szkieletu i animacji treningu z cieniem.

## Uruchomienie

```sh
npm ci
npm run dev
```

Otwórz [http://127.0.0.1:5173](http://127.0.0.1:5173). Port można zmienić przez `PORT`. Projekt używa natywnego ESM i małego serwera Node.js, bez bundlera. Uruchamiaj przez HTTP.

## Gra

Nowa gra zaczyna się przyjęciem do Wardu. Dzień to trzy fazy — rano, południe, wieczór — po dwie akcje: posiłek, trening, praca przy korbie, walka, kąpiel albo drzemka. Przejścia między celą, spacerniakiem i łaźnią są darmowe. Trening, praca i walka męczą (krótszy pasek kondycji w bójce), głód osłabia ciosy, sen wieczorem kończy dzień. Szczegóły: [PRISON.md](PRISON.md) §3.

W rogu eksploracji zegarek kieszonkowy pokazuje orientacyjny czas wynikający z pory dnia i wydanych akcji. Dwa mosiężne żetony obok wskazują pozostałe akcje; po czynności wskazówki przesuwają się, a żeton gaśnie. Samo chodzenie nie przesuwa zegarka. Pod nim widać aktualnego przeciwnika i obowiązek pracy. Mosiężne znaczniki na tarczy oraz podpis wskazują posiłki rano i wieczorem; podpis podaje, czy odebrać miskę, czy zjeść na pryczy.

Po prawej ikony żołądka, ziewającej głowy i mydła pokazują głód, zmęczenie oraz higienę. Segmenty wokół ramek ikon i podpisy aktualizują się po posiłku, treningu, odpoczynku, myciu i zmianie pory dnia; ostrzeżenia podają wpływ potrzeb na walkę.

- Strzałki lub WASD: chodzenie. E: rozmowa albo czynność przy najbliższym obiekcie.
- P: karta postaci z potrzebami, drzewkami, Cechami (wybór na poziomach 5, 10, 15), drzewkami ciosów, zestawem skilli do bójki (do 6 z kolekcji, nauka ruchów za punkty atrybutu), bilansem bójek, wynikami treningów i rywalem do pobicia w następnej kolejności.
- Esc w pomieszczeniu lub F10: pauza, sterowanie, zapis i wczytanie. O: opcje dźwięku i automatycznych momentów walki kartami.
- Bójka: 1 — jab, 2 — cross, 3 — hook, 4 — uppercut; przytrzymaj ↓ przy ciosie, by uderzyć w korpus. Trzymaj Spację, by blokować kosztem kondycji; podniesienie gardy w ostatnich około 120 ms przed trafieniem odbija cios i dodatkowo męczy atakującego. Q — slip: w ostatnich około 160 ms przed trafieniem unika ciosu i wzmacnia następny cios zadany w ciągu sekundy o 50%; źle wybrany moment zwiększa otrzymane obrażenia o 35%. Podstawowe koszty ciosów to 5/9/12/16 kondycji. Powtarzanie każdego rodzaju ciosu osobno zwiększa jego koszt; po 2 sekundach bez tego ciosu koszt wraca do podstawowego. Siła, Szybkość, Wytrzymałość, głód i zmęczenie wpływają na walkę.
- Cień: 1–4 to ciosy, ↓+cios trafia w korpus, Q to slip, podwójne poziome strzałki to doskok, odskok lub pivot. Podpowiedzi uwzględniają ustawienie zawodnika.
- Pompki na gazetach i podciąganie na kracie okna mają własne sterowanie ekranowe i sesje z oceną S–D.
- Karaluchy na ścianie (ściana z wyrytym GOD HELP ME nad pryczą): mysz lub strzałki prowadzą cień pięści, klik lub Spacja — cios; na dotyku przeciągnij i puść. Pudło boli i na chwilę wstrzymuje rękę. Projekt: [KARALUCHY.md](KARALUCHY.md).
- Żelazna korba (rano od drugiego dnia, jedyna dostępna praca): 30 sekund pracy. Trzymaj Spację na prawym łuku w górę (6→12), puść na lewym łuku w dół (12→6). Rytm rozpędza korbę; błędny chwyt tylko zatrzymuje ruch do poprawienia Spacji. Norma: 10 obrotów. Jedna akcja, bez zapłaty, XP siły i wytrzymałości, respekt za normę. F10 — pauza, Esc — zakończenie. Projekt: [CRANK.md](CRANK.md).
- Siłowanie o porcję jedzenia nie kosztuje akcji; siłowanie dla sportu nadal kosztuje jedną.
- Rzeźnia i kierat są na razie wyłączone w rozgrywce więziennej. Profesor prowadzi kombinacje, zadania, próby oraz rozwój drzewek.

Siła, Szybkość i Wytrzymałość rozwijają się przez XP. Limit Newgate wynosi 15, próby na poziomie 10 prowadzi Profesor. Na poziomach 5, 10 i 15 każdego atrybutu wybiera się jedną z dwóch Cech ([PERKI.md](PERKI.md)); zmiana wybranej Cechy u Profesora: pierwsza za darmo, potem 5 prymek tytoniu. Punkty z awansów, prób i lekcji opłacają ruchy i drzewka ciosów swojego atrybutu ([CIOSY.md](CIOSY.md) §3; węzły odblokowują się w bójce etapami). Spacerniak ma osobne punkty z respektu i fabuły; zmiana jego buildu kosztuje 20 prymek.

Waluty więzienne to tytoń i konto w szylingach/pensach. Monety i sklep ze sprzętem zostały wycofane. Zostały lista Profesora, niedzielne bicie, zakłady, raporty, trwałe kontuzje, leczenie i pamięć rywali.

## Zapis i tryb developera

Autozapis oraz trzy sloty używają dotychczasowych kluczy `heavybag.save` i `heavybag.slot.1`–`heavybag.slot.3`, schemat v10 (od v10: Cechy `traits` i drzewka ciosów `moves[id].picks` zamiast perków; punkty za dawne perki wracają, skille Bomby i Burzy ciosów zostają jako ruchy, a ruchy przeniesione do innego atrybutu — jako darmowe; od v9: zestaw skilli `loadout` zamiast talii). Starsze zapisy zachowują postęp; faza `free` oraz pokoje `gym`, `home`, `canteen` i `izolatka` przy wejściu do gry wracają do Wardu. Dane dawnego sprzętu są walidowane dla zgodności zapisów; `gym:[]` pozostaje pustą tablicą. Uszkodzony zapis i przyszła wersja są chronione przed automatycznym nadpisaniem.

Narzędzia dostępne są wyłącznie pod [/?debug=1](http://127.0.0.1:5173/?debug=1). W Opcjach można włączyć tryb developera: autozapis i rozkład dnia zatrzymują się, a drzwi pozwalają wpisać godzinę i przejść do dowolnego pokoju Newgate. Tryb przetrwa przeładowanie z tym parametrem; wyłączenie wraca do ostatniego zapisu. Ręczne sloty nadal działają.

Silnik walki kartami pozostaje do diagnostyki: `window.__boxer.startCardSpar(0, 'cell')` pod `?debug=1`. Zwykłe interakcje w pokojach uruchamiają walkę w czasie rzeczywistym; zestaw skilli i zasady z [CIOSY.md](CIOSY.md) dotyczą zachowanego trybu kart.

Obowiązkowa praca to żelazna korba (rano, pon.–sob., od drugiego dnia). Rzeźnia pozostaje sceną diagnostyczną pod `?debug=1`: `window.__boxer.startWork()`.

## Porządki i dokumentacja

Usunięto karcer i jego sceny, brygadę torową, współczesny dom i siłownię, budowanie, sklep, trening na worku, rytm, skakankę, gruszkę, bieg na spacerniaku, roadwalk, stary kosz. Bójki w czasie rzeczywistym są ponownie domyślnym trybem walki. Zachowane szkielety i animacje służą bójkom, Cieniowi, ćwiczeniom, NPC i pracy. `gym.js` jest nadal wspólnym modułem projekcji i ruchu w pokojach — nazwa pliku nie oznacza dostępnej siłowni.

Kopia sprzed porządków jest w `../Roadwork-backup-przed-porzadkami`. `reference/boxer_heavybag-2.html` pozostaje nietkniętym oryginałem porównawczym. Mapa kodu: [ARCHITECTURE.md](ARCHITECTURE.md). Rozwój: [PROGRESSION.md](PROGRESSION.md). Świat i fabuła: [PRISON.md](PRISON.md), [NEWGATE.md](NEWGATE.md). Zachowany diagnostyczny silnik kart i historia wdrożenia: [KARCIANKA.md](KARCIANKA.md). Talia, ruchy i ich rozwój (projekt): [TALIA.md](TALIA.md).

## Sprawdzenia

```sh
npm test
npm run check
npm run test:browser
```

`checkJs` obejmuje wybrane moduły wymienione w `tsconfig.json`. Testy przeglądarkowe sprawdzają start, stare zapisy, menu, harmonogram, czynności, treningi, bójki w czasie rzeczywistym, diagnostyczne walki kartami i ochronę Storage. Można uruchomić wybrany scenariusz przez `npm run test:browser -- --only=shadowboxing`.

Tło walki w celi jest malowane: obraz i jego edycje (Codex, skill painted-pixel-assets) leżą w `art/cela/`, `python3 -I scripts/cell-plate.py` wypala je do `src/cell-plate.js`.

`node scripts/render-room.mjs --room=yard --times=600,1230 --out=yard` tworzy zrzut do oceny grafiki. `node scripts/sim-cards.mjs` symuluje balans walki na skille (model gracza z unikami i parowaniem kontra AI); `node scripts/sim-cards.mjs 300 5 wzory nowy` porównuje stałe kolejki ośmiu podstawowych ciosów. `node scripts/sim-cards.mjs 300 5 wezly nowy` mierzy, co daje każdy węzeł drzewek ciosów. Symulator dotyczy zachowanego silnika kart, a nie domyślnych bójek w czasie rzeczywistym.
