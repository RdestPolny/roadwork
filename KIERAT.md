# Kierat — ostatni na kole

Projekt minigry (2026-10-16, decyzje z tej samej daty; wdrożony 2026-10-16, §12). Więźniowie wchodzą do drewnianych boksów
na wspólnym kole i depczą stopnie w rytm, który narzuca klucznik. Kto przestanie nadążać, zawiśnie na poręczy i spadnie.
Wygrywa ten, kto zostanie ostatni. Kiedy klucznik się odwraca, można ukradkiem odpocząć na poręczy. To rytmiczny arcade
na 2–3 minuty, a w pętli dnia dobrowolna zmiana zamiast rzeźni i główne źródło Wytrzymałości.

**Na razie bez dźwięku.** Każda informacja (rytm, wydarzenia, wzrok klucznika) musi być widoczna w kadrze.

---

## 1. Historia → gra

Co bierzemy z epoki (szczegóły historyczne naginamy na rzecz nastroju, zgodnie z `NEWGATE.md`):
- **Kierat Cubitta (1818).** Szerokie drewniane koło ze stopniami jak u koła łopatkowego. Więźniowie trzymają poręcz
  i wchodzą bez końca na stopień, który ucieka w dół.
- **Ciężka praca pierwszej klasy.** Według ustawy więziennej z 1865 r. kierat, korba i kamienie kary obowiązywały
  skazanych na ciężkie roboty. Samo Newgate było głównie aresztem, więc kierat stał w Coldbath Fields czy Brixton.
  W grze to „plotka o kieracie” z tekstów, która się sprawdza: w szopie za spacerniakiem stawiają koło.
- **Boksy.** Drewniane przepierzenia z systemu odosobnienia: nie widzisz sąsiada, tylko jego nogi pod deską i plecy.
- **Mielenie wiatru.** Koło często nic nie mieliło, kręciło wiatrak-hamulec na dachu. Ciężar dzielą wszyscy na kole.
  Kiedy ktoś odpada, reszcie robi się ciężej.
- **Dzwon, ławka, wypadki.** Dzwon zmienia zmianę, wyczerpani siedzą na ławce, a ten, kto spadnie, może
  wkręcić nogę w stopnie.

---

## 2. Fantazja i ton

Monotonia jako horror. Deski bez końca zjeżdżają pod nogi, cień wiatraka kręci się coraz szybciej, a sąsiad obok gubi
rytm i wisi na poręczy. Klucznik siedzi bez ruchu, a kiedy przestaje patrzeć na boksy, odwraca głowę i wpatruje się prosto w gracza. Trzy zasady odczucia:
1. **Koło nie kłamie.** Rytm widać w deskach, które dochodzą do linii stopy. Kij klucznika może kłamać, deski nigdy.
2. **Ciało mówi, jak ci idzie.** Wysokość w boksie, zgarbienie i para oddechu są ważniejsze niż paski.
3. **Każdy upadek jest dla ciebie złą wiadomością i ulgą.** Odpada rywal, ale koło od razu staje się cięższe.

---

## 3. Pętle rozgrywki

### Mikro (pół sekundy): krok
Stopień zjeżdża pod stopę, a gracz naciska klawisz tej nogi w chwili, gdy krawędź deski dochodzi do linii stopy. Nogi
są na zmianę: ← lewa, → prawa. Za trafienie w rytm płaci się mało oddechu, za krok obok rytmu dużo. Pominięty krok
oznacza, że stopa się zsuwa, a gracz traci stopień.

### Średnia (kilka sekund): odpoczynek za plecami klucznika
Klucznik co jakiś czas się odwraca. Wtedy można przytrzymać poręcz i odpocząć: oddech wraca, ale chwyt spada, a rytm
trzeba potem złapać na nowo. Jeśli przyłapie, oddech spada zamiast rosnąć (§6.3).

### Sesja (90–180 s): ostatni na kole
- Na starcie 4–8 więźniów w boksach (zależnie od stopnia). Gracz jest w drugim boksie od lewej.
- **Dzwon** co ~20 s: klucznik luzuje hamulec, a tempo rośnie o 4–8 kroków na minutę przez 4 takty.
- Wydarzenia rytmu (§5) od stopnia II mieszają rytm, z wyraźną zapowiedzią w kadrze.
- Rywale mają własny oddech i celność (§7). Każdy upadek oznacza zastój koła na 2 takty (wyciągają go spod stopni),
  a potem cięższe koło.
- **Wygrana:** wszyscy inni na ławce. Klucznik pokazuje kijem zejście, a gracz wybiera **Zejdź** albo **Kontynuuj**
  po premię (§6.4).
- **Odpadnięcie:** spadasz albo schodzisz sam (przytrzymanie ↓). Miejsce liczy się według kolejności odpadania,
  a XP i ocenę dostajesz normalnie.
- **Porażka — zrzucony z koła:** trzecie przyłapanie na poręczy kończy sesję od razu (§6.3, §10).

### Makro: miejsce w dniu
- **Wybór zamiast pracy.** Rano od poniedziałku do soboty, przy zbiórce do pracy, karta „Rzeźnia przy Smithfield” ma
  drugą opcję: **„Kierat”**. Kierat zastępuje zmianę. Nie ma raportu za brak pracy, ale nie ma też zapłaty, premii
  majstra ani opinii za normę.
- Przed wejściem są zakłady o tytoń (§10).
- Sesja zamyka się przez `training-session.js`: ocena S–D, stopnie I–V, świeżość dzienna, XP.

---

## 4. Sterowanie

| Wejście | Działanie |
| --- | --- |
| ← / A | lewa stopa |
| → / D | prawa stopa |
| ↑ / Shift (trzymane) | odpoczynek na poręczy (§6.3) |
| ↓ (przytrzymaj 1 s) | zejście z koła: koniec bez ryzyka urazu |
| szybkie ←→ między taktami | wspinanie się z powrotem na stopień (§6.2) |
| ← / → na karcie wygranej | Zejdź / Kontynuuj |
| Esc | pauza (BPM, kolejka tempa i nuty zostają, jak w `time.js`) |
| Dotyk | lewa i prawa połowa ekranu to stopy, dwa palce to poręcz |

Ta sama noga dwa razy pod rząd oznacza potknięcie: krok liczy się jako krok obok rytmu i przerywa trans.

**Plansza przed kołem** (2026-10-17, `#wheelIntro`, tekst w `wheelBrief` w `treadwheel-rules.js`). Wyjaśnia cel, kroki, siły,
poręcz, zejście, rywali i tempo stopnia oraz zapowiedzi tylko tych wydarzeń, które ten stopień ma; na dyżurze Cobba
dochodzi wiersz o nim. Koło stoi do czasu, aż gracz wejdzie: Enter, ← / → albo dotyk; Esc wraca. „Jeszcze raz”
pomija planszę.

---

## 5. Rytm (wyłącznie wzrokowy)

**Wskazówka rytmu to same deski.** Pod stopami gracza widać 3–4 stopnie zjeżdżające w dół. Na przepierzeniu jest
kredowa kreska na wysokości stopy (linia trafienia). Krawędź każdej deski łapie światło lampy, więc przy 144×96 czyta
się jako jasna linijka, która dochodzi do kreski. Nadchodzącą deskę widać już na górze koła, ponad dwa takty wcześniej.
Nie ma osobnego toru nut na interfejsie.

Okna trafienia, bazowo:

| Ocena | Okno | Koszt oddechu (przy ciężarze 1) |
| --- | --- | --- |
| **Czysto** | ±45 ms | 0,5 |
| **Dobrze** | ±100 ms | 0,9 |
| **Obok** (wcześnie lub późno, zła noga) | ±200 ms | 1,8 |
| **Pominięty** | — | 1,0 i strata stopnia |

Po każdym kroku przez chwilę widać informację zwrotną w świecie gry. Czysto: stopa ląduje płasko, z deski unosi się
kurz. Obok: pięta się ześlizguje, kolano ugina. Pominięty: noga zjeżdża i całe ciało opada o stopień.

**Trans:** 8 czystych kroków pod rząd sprawia, że koło „idzie samo”. Krok kosztuje 0, a oddech wraca o 0,3 na krok.
Kadr się zwęża (winieta), a ruch rywali rozmywa się w smugę. Każda zmiana tempa przerywa trans.

**Wydarzenia tempa** (każde ma zapowiedź widoczną przynajmniej takt wcześniej):

| Wydarzenie | Od stopnia | Zapowiedź w kadrze | Efekt |
| --- | --- | --- | --- |
| Dzwon i luz hamulca | I | sznur dzwonu drga, klucznik sięga do dźwigni, cień wiatraka przyspiesza | +4–8 BPM w 4 taktach |
| Krzywa deska | II | jasna, pęknięta deska widoczna na górze koła, wraca co obrót (24 stopnie) | jeden takt przesunięty o ósemkę (synkopa) |
| Wiatr na wiatraku | II | kurz sypie się z dachu, smog wpada przez szpary | ciężar ×1,3 przez 6 s |
| Szarpnięcie hamulca | III | klucznik wstaje i łapie dźwignię obiema rękami | 2 takty w połowie tempa, potem powrót |
| Zastój | IV | wał drga, iskra w trybach, deski się zatrzymują | koło staje na 1–2 takty, potem szarpie podwójnym tempem na 2 takty |
| Fałszywa kołatka | V | klucznik stuka kijem w poręcz obok rytmu | kij celowo myli, liczą się deski |
| Upadek sąsiada | zawsze | rywal osuwa się w swoim boksie | zastój na 2 takty (oddech), potem ciężar rośnie |

Tempo w stopniach od I do V rośnie od 48 do 88 kroków na minutę. Rywale reagują na te same wydarzenia, a słabsi
potykają się na krzywej desce.

---

## 6. Zasoby gracza

### 6.1 Oddech `O`
- Pula to `staCap` z Wytrzymałości minus 6 za każdy punkt zmęczenia (tak jak skrócony pasek kondycji w bójce).
- Koszt kroku to koszt z §5 × **ciężar koła** × głód (głodny ×1,15, wygłodzony ×1,3).
- **Ciężar koła** = `1 + 0,15 × liczba odpadłych` (do strojenia). Kiedy zostajesz sam, ciężar jest największy.
- Poniżej 30% okna kurczą się o 25%, obraz drży, a winieta pulsuje jak bicie serca. Przy 0 nie da się trafić czysto,
  a każdy takt zabiera stopień.
- Czyta się go z postawy i pary oddechu. Na kanwie jest tylko jedna mała kreska przy krawędzi boksu.

### 6.2 Pozycja na kole `P` (0–3 stopnie)
- Normalnie stoisz na stopniu 3. Pominięty krok obniża pozycję o 1.
- Niżej stopień bije w goleń: każdy takt na pozycji 1–2 kosztuje +0,5 oddechu.
- **Wspinanie:** dodatkowe kroki między taktami (na zmianę) podnoszą o 1/3 stopnia, każdy kosztuje 2,5 oddechu.
  Decyzja: wracać od razu i drogo, czy męczyć się nisko.
- Na pozycji 0 gracz **wisi na poręczy bez sił**: nogi wloką się po stopniach, chwyt spada −10/s, oddech nie wraca.
  Wspinaniem można się wyrwać. Chwyt 0 oznacza upadek.

### 6.3 Odpoczynek na poręczy i wzrok klucznika
**Chwyt `C`:** pula `40 × pow` z Siły. Spada przy odpoczynku i przy wiszeniu bez sił, a odnawia się, kiedy stoisz
prosto i depczesz.

**Odpoczynek (trzymane ↑):** gracz podciąga się na poręczy i przestaje deptać, a koło przesuwa się pod zgiętymi nogami.
- Oddech +4/s (× `regen`), chwyt −6/s, pozycja nie spada.
- Po puszczeniu trzeba złapać rytm od nowa: pierwszy krok ma okna o połowę węższe.
- Trans przepada.

**Klucznik** siedzi na stołku z prawej, z kijem. Działa w cyklu:

| Faza | Czas | Co widać |
| --- | --- | --- |
| Patrzy na boksy | 4–8 s | twarz do koła, kij na kolanach, wzrok przesuwa się po boksach (głowa obraca się na dany boks) |
| Odwraca głowę | 0,8 s | ciało zostaje bez ruchu; głowa obraca się z profilu przez 3/4 prosto w kamerę, przesłona latarni się zamyka |
| Patrzy na nas | 3–6 s | wpatruje się w gracza, w oczach punkt światła; latarnia ciemna (od 2026-10-17 zamiast odwracania do pieca) |
| Zaraz wróci | 0,6–1 s | wciąż patrzy w kamerę, ale oczy uciekają już w stronę boksów, głowa drga |
| Wraca | — | znowu patrzy na boksy |

Od stopnia IV pojawia się **fałszywe odwrócenie**: głowa zaczyna się obracać do kamery i nagle wraca. Wyższe stopnie mają krótsze
fazy patrzenia na nas i krótsze ostrzeżenie. Na dyżurze ślepego Cobba te fazy są dłuższe, a wzrok wolniej sunie po boksach.

**Przyłapanie** (odpoczywasz, a klucznik patrzy na twój boks):
- 1. raz: krzyk, kij wskazuje boks, oddech −15.
- 2. raz: uderzenie kijem po rękach, oddech −25, pozycja −1, poręcz puszczona na 1 s.
- 3. raz: **zrzucony z koła**. Sesja kończy się porażką (§10).

Odpoczynek widzi też rywal: rywale również się opierają, czasem dają się przyłapać i odpadają wcześniej.

### 6.4 Sam na kole: Zejdź albo Kontynuuj
Po wygranej sesja na chwilę staje i pojawia się karta z dwiema opcjami:
- **Zejdź:** koniec, pełna nagroda za wygraną.
- **Kontynuuj:** ciężar jest największy, tempo rośnie dalej, a klucznik patrzy częściej. Każde 10 s daje premię do
  oceny i XP. Zejście (↓) jest w każdej chwili bezpieczne. Upadek zostawia zdobytą premię, ale grozi urazem (§10).
  Trzecie przyłapanie odbiera premię i całą sesję.

---

## 7. Rywale

- Imiona ze spacerniaka i Wardu (`YARD_OPP`, `CELL_OPP`), uzupełnione bezimiennymi numerami. Ranga daje poziomy
  przez `opponentLevels`, a z Wytrzymałości ich oddech, tymi samymi wzorami co u gracza.
- Każdy ma **profil celności** (rozkład czysto, dobrze, obok, pominięty), który pogarsza się ze spadkiem oddechu,
  oraz **śmiałość**, czyli jak często odpoczywa za plecami klucznika. Koszt kroków, trans, wydarzenia i ciężar są
  te same. Symulacja jest uproszczona, ale uczciwa, bez gumowej liny.
- Charaktery (przykłady):

| Więzień | Styl na kole |
| --- | --- |
| Jack „Młody” Morley | ostry start, często w transie, pali się po trzecim dzwonie; opiera się za późno |
| Joseph „Siwy” Marsh | równy, nigdy czysto, odpoczywa idealnie wtedy, kiedy klucznik patrzy w kamerę |
| Albert „Ciężki” Rudd | ogromny oddech, ciągle potyka się na krzywej desce i szarpnięciach |
| Silas „Cichy” Crane | nigdy się nie opiera, porusza ustami w modlitwie; groźny do samego końca |
| Numer 31 | chory, odpada pierwszy. Czasem wkręca nogę, a wtedy koło staje |

- **Czytelność:** nad boksami tabliczki z numerami. Postawa idzie od prosto, przez zgarbienie i wiszenie na poręczy,
  po zsuwanie się. Nogi pod przepierzeniem gubią rytm. Kto odpadł, siada na ławce z lewej, a jego tabliczka gaśnie.

---

## 8. Stopnie I–V

Zawsze cztery boksy, jak na wzorze graficznym (2026-10-16): bohater w drugim (17) i trzech rywali; wyższy stopień
to mocniejsi ludzie, szybsze tempo i więcej wydarzeń.

| Stopień | Rywale | BPM start → max | Wydarzenia | Klucznik |
| --- | --- | --- | --- | --- |
| I | Numer 31, Harry, Jack | 48 → 64 | dzwon | patrzy na nas 5–6 s, ostrzeżenie 1 s |
| II | Harry, Jack, Walter | 52 → 70 | + krzywa deska, wiatr | patrzy na nas 4–6 s |
| III | Walter, Joseph, Albert | 56 → 76 | + szarpnięcie hamulca | patrzy na nas 4–5 s, ostrzeżenie 0,8 s |
| IV | Joseph, Albert, Silas | 60 → 82 | + zastój | + fałszywe odwrócenie |
| V | Silas, Ned, Dan | 64 → 88 | + fałszywa kołatka | patrzy na nas 3–4 s, ostrzeżenie 0,6 s |

**Metryki sesji:** `place`, `field`, `time`, `clean`, `good`, `off`, `missed`, `trance`, `rest`, `caught`, `alone`.

```
quality  = 0.5·(1 − (place−1)/(field−1)) + 0.35·clean/steps + 0.15·(1 − caught/3)
complete = min(1, time/targetTime)        // targetTime stopnia: 90–150 s; wygrana = 1
```

Odpoczynek bez przyłapania nie obniża oceny, bo jest częścią gry. Premia „sam na kole” dokłada do `complete`
ponad 1. Ocena, świeżość i odblokowanie stopnia działają przez istniejące `sessionScore`/`sessionXP`.

---

## 9. Statystyki → gra

| Źródło | Wpływ na kole |
| --- | --- |
| **Wytrzymałość** `staCap` | pula oddechu |
| Wytrzymałość `regen` | szybkość odpoczynku na poręczy i zysk w transie |
| Wytrzymałość `energyUse` | mnożnik kosztu kroku |
| **Siła** `pow` | pula chwytu, czyli jak długo można odpoczywać i wisieć; tańsze wspinanie |
| **Szybkość** `punch` | szerokość okien trafienia (do +25% na limicie) |
| Zmęczenie (0–8) | −6 oddechu na punkt |
| Głód | koszt kroku ×1,15 / ×1,3 |
| Dyżur Cobba | dłuższe patrzenie w kamerę, wolniejszy wzrok |

Statystyki pomagają, ale nie wygrywają za gracza. Na stopniu z rywalami równymi rangą o wyniku decyduje rytm
i wyczucie klucznika.

---

## 10. Gra → meta

Przyłapania działają tylko w trakcie gry (§6.3). Po grze nie ma raportu ani opinii za odpoczynek.

| Wynik | Skutek |
| --- | --- |
| **Zwykły koniec** (wygrana, upadek, zejście) | XP z sesji `kierat`: 75% Wytrzymałość, 15% Siła, 10% Szybkość (intensywność jak praca, 0,9); zmęczenie +2, higiena −20 |
| **Zrzucony z koła** (3 przyłapania) | brak XP, zmęczenie +2, higiena −20 i **kara na jeden dzień: wieczorem klapa się nie otwiera, kolacji nie ma**. Głód rośnie i przechodzi na następny ranek. Zakład przepada. |
| Respekt | ostatni na kole: +2 i +1 za każdego wyprzedzonego rywala ★★+; pierwszy na ławce od stopnia III: −2 |
| Tytoń | zakład na siebie przed wejściem: 5 lub 10 prymek, wygrana ×3, drugie miejsce zwrot stawki (przez `spendTobacco`) |
| Uraz | upadek z wiszenia: 30% na „otartą goleń”, czyli zmęczenie +1 |
| Praca | kierat zastępuje zmianę w rzeźni: bez raportu, bez zapłaty, bez opinii za normę |
| Profesor | nowe zadanie dnia „ostatni na kole”; **alternatywna próba Wytrzymałości:** Kierat III wygrany z oceną A/S (obok bójki z rywalem ★★) |

Zapis: `train.stage.kierat` i `train.best.kierat` już przyjmują dowolny identyfikator. Kara „bez kolacji” potrzebuje
znacznika na dzień: albo nowego pola w `save.sim` z migracją i testem starego zapisu, albo kary zastosowanej od razu
w stanie dnia, jeśli istniejące pola na to pozwalają. Do sprawdzenia przy wdrożeniu.

---

## 11. Kadr

**Kadr 144×96 rysowany kodem, w technice podciągania na kracie** (2026-10-17), w układzie z obrazu-wzoru
`reference/kierat-wzor.webp`. Pierwotny opis:
**z tyłu, jak na fotografii z boksami.** Rząd przepierzeń w lekkiej perspektywie, plecy więźniów w kaftanach,
nogi na stopniach. Pod stopami gracza 3–4 deski i kredowa linia trafienia (§5). Z prawej na pierwszym planie klucznik
na stołku z kijem, za nim piec i drzwi. Jego głowa, ramiona i cień muszą być czytelne z daleka, bo to druga wskazówka
gry. Z lewej ławka z odpadłymi. U góry wał i cień wiatraka. Gaz albo latarnia i smog w szparach desek, para oddechu.
Gracza wyróżnia plama światła, a nie obrys.

**Dźwięk:** na razie żadnego. Gra musi być w pełni czytelna bez niego.

---

## 12. Wdrożenie (2026-10-16)

- `src/treadwheel-rules.js`: czyste reguły (okna, koszty, ciężar, trans, odpoczynek, cykl klucznika i snop latarni,
  tempo, rywale `RIVALS` z celnością, śmiałością i charakterem, ocena sesji); test `tests/treadwheel-rules.test.js`.
- `src/treadwheel.js`: tryb `gstate==='kierat'`. Takt to chwila, gdy krawędź deski mija kredową linię
  (`crossAt`, krzywa deska o 1/3 później); wciśnięcie przed taktem czeka na niego (`early`), po nim jest oceniane od
  razu, poza oknem wspina albo potyka. Czas wejścia z `inputNow()`, takty z `simNow`. Esc schodzi z koła.
- `src/treadwheel-scene.js`: kadr 144×96 rysowany kodem jak podciąganie (`pullup-scene.js`). Tło wypalane raz z funkcji
  koloru na piksel: cegła pod wapnem i sadzą, dębowe słupki z grotami i kreskami kredy, pas desek z tabliczkami, okno z
  kratą, belka z wałem, piec, mokre płyty, stołek, nogi ławki. Ciało klucznika (płaszcz, nogi, ręka z latarnią, ręka z
  kijem) też jest wypalane jako mapa wysokości. Co klatkę: wnętrza boksów (deski, poręcz, stopnie przewijane po
  krawędziach `TREAD_EDGES`), więźniowie od tyłu (głowa, kark, plecy z łopatkami i rowkiem kręgosłupa, ręce zgięte do
  poręczy, siedzenie spodni, nogi z chodem; odpoczynek, wiszenie, upadek), dwaj na ławce (oddech, szept, kulenie się
  z zimna; deska przed nimi), głowa klucznika obracana z profilu w kamerę, latarnia z przesłoną, kij, wiatrak, zębatka,
  dzwon, drąg hamulca, kurz, światło (snop i plama latarni, smuga z okna, ruszt pieca, mgła pod dachem, winieta), para.
  Postacie: mapa wysokości z kapsuł, elipsoid i rzędów pleców, cieniowana z normalnych po pięciu tonach rampy, fałdy
  materiału w samej wysokości, obwódka światła tylko na krawędzi sylwetki (zimna od okna, ciepła od latarni i pieca).
- Eksperyment z grafiką z edycji wzoru przez Codexa (wypalane tło, warstwy z Apple Vision) przeniesiony poza projekt do
  `../Roadwork-kierat-codex/` (2026-10-17); dla Roadwork nie jest używany. Metoda jako ogólny skill: `painted-pixel-assets`.
- Podgląd: `node scripts/render-room.mjs --room=cell --mini=kierat --fight=4:30 --out=kw`; klatkę ustawia się przez
  `--eval` z `globalThis.__frame`.
- `src/training-data.js`: drill `kierat` (stopnie z §8); `PRISON_TRIALS['end:10'].alt` — próba na kole, przyjmowana
  w `beginSession`. `prison-data.js`: zadanie `kierat-ostatni` (w nieparzyste dni pracy, gdy Wytrzymałość jest najniżej).
- `src/prison.js`: opcja „Kierat zamiast rzeźni” przy drzwiach Wardu, karta „Szopa kieratu” z zakładem, `wheelDone`
  (praca rozliczona, akcja `kierat`: zmęczenie +2, higiena −20; respekt, zakład, goleń, premia „sam na kole”),
  `supperDenied` — flaga `bez-kolacji-<dzień tygodnia>` w istniejących `flagi`, bez zmiany schematu.
  `ward-meal.js` zamyka wtedy klapę wieczorem.
- Podgląd: `node scripts/render-room.mjs --room=cell --mini=kierat --fight=6:7 --out=kw`; scena w devtools „Kierat”.
- Testy przeglądarkowe: `npm run test:browser -- --only=kierat` (mechanika koła oraz dzień w więzieniu).
- Strojenie: średni czas rywali na kole policzony symulacją reguł (ostatni odpada po ok. 105–125 s na każdym stopniu).
  Liczby w §5–§8 są punktem wyjścia; po graniu do poprawy.
