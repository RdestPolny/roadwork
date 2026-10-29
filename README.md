# Roadwork

Przeglądarkowa gra bokserska w Newgate, Londyn 1868. Wspólna cela Ward, spacerniak, łaźnia korzystają z własnego renderera pikselowego. Bójki rozgrywa się w czasie rzeczywistym: ciosy, garda i unik korzystają ze wspólnego szkieletu i animacji treningu z cieniem.

## Uruchomienie

```sh
npm ci
npm run dev
```

Otwórz [http://127.0.0.1:5173](http://127.0.0.1:5173). Port można zmienić przez `PORT`. Projekt używa natywnego ESM i małego serwera Node.js, bez bundlera. Uruchamiaj przez HTTP.

## Grafika i rozdzielczość

Ward (cela), jego wyposażenie, wszystkie postacie oraz odbywające się w nim bójki, także przy posiłku, są renderowane w buforze **432×288**. W 3× dopracowano drobne piksele na cegle, kamiennych płytach, drewnianej pryczy, rysach ścian i przy zwierzętach oraz na twarzach i ubraniach współwięźniów. Zegar, AI, hitboxy, głębia, interakcje i format zapisu nie zmieniają się. Komiks nokdaunu dopasowuje panele do 3×. Spacerniak, łaźnia i port (eksploracja oraz bójki) używają tego samego natywnego bufora **432×288**; piaskowa arena nadal pozostaje w debug. Wspólne detale `figureHD` uwzględniają kaptury i stroje kąpielowe. Boczne minigry zachowują własne rozdzielczości.

## Gra

Nowa gra zaczyna się przyjęciem do Wardu. Dzień to trzy fazy — rano, południe, wieczór — po dwie akcje: posiłek, trening, praca przy korbie, walka, kąpiel albo drzemka. Przejścia między celą, spacerniakiem i łaźnią są darmowe. Trening, praca i walka męczą (krótszy pasek kondycji w bójce), głód osłabia ciosy, sen wieczorem kończy dzień. Szczegóły: [PRISON.md](PRISON.md) §3.

W rogu eksploracji zegarek kieszonkowy pokazuje orientacyjny czas wynikający z pory dnia i wydanych akcji. Dwa mosiężne żetony obok wskazują pozostałe akcje; po czynności wskazówki przesuwają się, a żeton gaśnie. Samo chodzenie nie przesuwa zegarka. Pod nim widać aktualnego przeciwnika i obowiązek pracy. Mosiężne znaczniki na tarczy oraz podpis wskazują posiłki rano i wieczorem; podpis podaje, czy odebrać miskę, czy zjeść na pryczy.

Po prawej ikony żołądka, ziewającej głowy i mydła pokazują głód, zmęczenie oraz higienę. Segmenty wokół ramek ikon i podpisy aktualizują się po posiłku, treningu, odpoczynku, myciu i zmianie pory dnia; ostrzeżenia podają wpływ potrzeb na walkę.

- Strzałki lub WASD: chodzenie. E: rozmowa albo czynność przy najbliższym obiekcie.
- P: karta postaci z potrzebami, drzewkami, Cechami (wybór na poziomach 5, 10, 15), drzewkami ciosów, zestawem skilli do bójki (do 6 z kolekcji, nauka ruchów za punkty atrybutu), bilansem bójek, wynikami treningów i rywalem do pobicia w następnej kolejności.
- Esc w pomieszczeniu lub F10: pauza, zapis i wczytanie. O: opcje dźwięku.
- Bójka (izometryczna, w pokoju, w którym się zaczęła: Ward, spacerniak albo łaźnia): mysz — ruch w stronę kursora, E — unik w jego kierunku, dwukrotne E — odskok od rywala (strzałki lub WASD też działają), 1 — jab, 2 — cross, 3 — hook, 4 — uppercut; przytrzymaj Shift przy ciosie, by uderzyć w korpus. Trzymaj Spację, by blokować kosztem kondycji; podniesienie gardy tuż przed trafieniem odbija cios i dodatkowo męczy atakującego. Q — slip: dobrze wyczuty unika ciosu i wzmacnia następny cios; źle wybrany moment zwiększa otrzymane obrażenia. Koszty ciosów rosną przy powtarzaniu, Siła, Szybkość, Wytrzymałość, głód, zmęczenie i rany wpływają na walkę. Pierwszy i drugi nokdaun to liczenie na deskach (wstajesz, wciskając klawisze), kamera zbliża się do pary, a pot i krew rozbryzgują się na boki i na podłogę. W Wardzie widzowie chwytają zawodnika, który podejdzie zbyt blisko: przez 2 sekundy nie może się ruszać, atakować ani bronić. Dotyczy to także rywala. Esc kończy walkę.
- Cień: 1–4 to ciosy, ↓+cios trafia w korpus, Q to slip, podwójne poziome strzałki to doskok, odskok lub pivot. Podpowiedzi uwzględniają ustawienie zawodnika.
- Pompki i podciąganie na kracie okna mają własne sterowanie ekranowe i sesje z oceną S–D.
- Karaluchy na ścianie (ściana z wyrytym GOD HELP ME nad pryczą): mysz lub strzałki prowadzą cień pięści, klik lub Spacja — cios; na dotyku przeciągnij i puść. Pudło boli i na chwilę wstrzymuje rękę. Projekt: [KARALUCHY.md](KARALUCHY.md).
- Żelazna korba (rano od drugiego dnia, jedyna dostępna praca): 30 sekund pracy. Trzymaj Spację na prawym łuku w górę (6→12), puść na lewym łuku w dół (12→6). Rytm rozpędza korbę; błędny chwyt tylko zatrzymuje ruch do poprawienia Spacji. Norma: 10 obrotów. Jedna akcja, bez zapłaty, XP siły i wytrzymałości. F10 — pauza, Esc — zakończenie. Projekt: [CRANK.md](CRANK.md).
- Siłowanie o porcję jedzenia nie kosztuje akcji; siłowanie dla sportu nadal kosztuje jedną.
- Rzeźnia jest na razie wyłączona w rozgrywce więziennej (scena diagnostyczna). Profesor prowadzi kombinacje, zadania, próby oraz rozwój drzewek.

Siła, Szybkość i Wytrzymałość rozwijają się przez XP. Limit Newgate wynosi 15, próby na poziomie 10 prowadzi Profesor. Na poziomach 5, 10 i 15 każdego atrybutu wybiera się jedną z dwóch Cech ([PERKI.md](PERKI.md)); zmiana wybranej Cechy u Profesora: pierwsza za darmo, potem 5 prymek tytoniu. Punkty z awansów, prób i lekcji opłacają ruchy i drzewka ciosów swojego atrybutu ([CIOSY.md](CIOSY.md) §3; węzły odblokowują się w bójce etapami). Spacerniak ma osobne punkty zdobywane na liście Profesora i w niedzielnym biciu; zmiana jego buildu kosztuje 20 prymek.

Waluty więzienne to tytoń i konto w szylingach/pensach. Monety i sklep ze sprzętem zostały wycofane. Zostały lista Profesora, niedzielne bicie, zakłady, trwałe kontuzje, leczenie i pamięć rywali.

## Zapis i tryb developera

Autozapis oraz trzy sloty używają dotychczasowych kluczy `heavybag.save` i `heavybag.slot.1`–`heavybag.slot.3`, schemat v10 (od v10: Cechy `traits` i drzewka ciosów `moves[id].picks` zamiast perków; punkty za dawne perki wracają, skille Bomby i Burzy ciosów zostają jako ruchy, a ruchy przeniesione do innego atrybutu — jako darmowe; od v9: zestaw skilli `loadout` zamiast talii). Starsze zapisy zachowują postęp; faza `free` oraz pokoje `gym`, `home`, `canteen` i `izolatka` przy wejściu do gry wracają do Wardu. Dane dawnego sprzętu są walidowane dla zgodności zapisów; `gym:[]` pozostaje pustą tablicą. Uszkodzony zapis i przyszła wersja są chronione przed automatycznym nadpisaniem.

Narzędzia dostępne są wyłącznie pod [/?debug=1](http://127.0.0.1:5173/?debug=1). W Opcjach można włączyć tryb developera: autozapis i rozkład dnia zatrzymują się, a drzwi pozwalają wpisać godzinę i przejść do dowolnego pokoju Newgate. Tryb przetrwa przeładowanie z tym parametrem; wyłączenie wraca do ostatniego zapisu. Ręczne sloty nadal działają.

Pod `?debug=1` w Opcjach → „Tryb developerski (przełącz scenę)” dostępny jest także animowany podgląd portu nad Tamizą. Strzałki lub WASD poruszają postacią, kamera podąża za nią, a Esc wraca do poprzedniego pokoju; scena nie wpływa na zapis. Po drugim worku zaczyna się scena z pijakiem, po wygranej bójce scena z wozem policyjnym i morderstwem, na końcu przeniesienie do Wardu; kamera najeżdża na mówiącego, a kwestie pojawiają się w dymkach nad głowami. Do oglądania scen: `(await import('/src/thames-port.js')).startPortScene('before')` albo `'after'`.

Pod `?debug=1` w **Opcjach → Tryb developerski (przełącz scenę) → HD Fight Test — Bohater vs Harry (432×288)** dostępny jest osobny test wyższej rozdzielczości: piaskowa arena, ten sam izometryczny szkielet, ciosy i AI Harry’ego, ale bogatsze detale twarzy, włosów i więziennego ubrania. **R** zaczyna test od nowa, **F9** zapisuje PNG 432×288, **F8** zamraża klatkę (kropka — pojedynczy krok), **Esc** wraca do poprzedniego pokoju. Test nie przyznaje XP, nie dodaje kontuzji ani wpisów do bilansu bójek. Wszystkie standardowe bójki izometryczne — w Wardzie, podczas posiłku, na spacerniaku, w łaźni i porcie — korzystają z 432×288.

Diagnostyka pod `?debug=1`: `window.__boxer.startSpar(0, 'cell')` uruchamia bójkę izometryczną (`isoFightFinish(0, 'KO')` kończy ją na korzyść gracza). Zestaw skilli, Cechy i drzewka ciosów z [CIOSY.md](CIOSY.md) są rozwojem postaci, który nie wpływa jeszcze na bójkę w czasie rzeczywistym.

Obowiązkowa praca to żelazna korba (rano, pon.–sob., od drugiego dnia). Rzeźnia pozostaje sceną diagnostyczną pod `?debug=1`: `window.__boxer.startWork()`.

## Porządki i dokumentacja

Usunięto karcer i jego sceny, brygadę torową, współczesny dom i siłownię, budowanie, sklep, trening na worku, rytm, skakankę, gruszkę, bieg na spacerniaku, roadwalk, stary kosz. Bójki w czasie rzeczywistym są ponownie domyślnym trybem walki. Zachowane szkielety i animacje służą bójkom, Cieniowi, ćwiczeniom, NPC i pracy. `gym.js` jest nadal wspólnym modułem projekcji i ruchu w pokojach — nazwa pliku nie oznacza dostępnej siłowni. Przy porządkach z 2026-10-25 usunięto też kierat, silnik walki kartami, styl plakatu i boczne bójki 2D; bójki toczą się w izometrycznych pokojach (`src/iso-fight.js`), a boczny widok został tylko dla Cienia. Kopia sprzed tych porządków: `../Roadwork-backup-przed-czyszczeniem`.

Kopia sprzed porządków jest w `../Roadwork-backup-przed-porzadkami`. `reference/boxer_heavybag-2.html` pozostaje nietkniętym oryginałem porównawczym. Mapa kodu: [ARCHITECTURE.md](ARCHITECTURE.md). Rozwój: [PROGRESSION.md](PROGRESSION.md). Świat i fabuła: [PRISON.md](PRISON.md), [NEWGATE.md](NEWGATE.md). Zachowany diagnostyczny silnik kart i historia wdrożenia: [KARCIANKA.md](KARCIANKA.md). Talia, ruchy i ich rozwój (projekt): [TALIA.md](TALIA.md).

## Sprawdzenia

Scenariusz `npm run test:browser -- --only=432x288` wytwarza w `artifacts/` sześć natywnych PNG eksploracji i bójek ze spacerniaka, łaźni i portu. Wymaga uruchomienia Playwright i ręcznego porównania wyników z Wardem HD.

```sh
npm test
npm run check
npm run test:browser
```

`checkJs` obejmuje wybrane moduły wymienione w `tsconfig.json`. Testy przeglądarkowe sprawdzają start, stare zapisy, menu, harmonogram, czynności, treningi, bójki izometryczne i ochronę Storage. Można uruchomić wybrany scenariusz przez `npm run test:browser -- --only=shadowboxing`.

Cień korzysta z bocznej ściany Wardu wspólnej z pompkami, rysowanej w `src/ward-wall.js`.

`node scripts/render-room.mjs --room=yard --times=600,1230 --out=yard` tworzy zrzut do oceny grafiki. `node scripts/iso-fight-shot.mjs --venue=yard --script='b.step(80); snap();'` tworzy zrzut bójki izometrycznej.
