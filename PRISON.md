# Roadwork — więzienie: rozkład dnia, pętla rozgrywki i drzewko Spacerniak

Projekt aktu Newgate; stan po porządkach z 2026-10-03. Bójki toczą się w czasie rzeczywistym w izometrycznych pokojach (`iso-fight.js`); silnik kart usunięto 2026-10-25. Szczegółowe liczby w poniższych opisach to założenia projektu; aktualne reguły kart opisuje [KARCIANKA.md](KARCIANKA.md), a stałe znajdują się w `prison-data.js` i `card-data.js`. Akt rozgrywa się w więzieniu **Newgate w Londynie, w 1868 roku** (kierunek i postęp przeniesienia: [NEWGATE.md](NEWGATE.md); słowniczek i nazwiska: §14). Gra zaczyna się we wspólnej celi — Wardzie. Na razie nie ma warunku wyjścia: fabuła powstaje osobno, a ten dokument opisuje tylko pętlę rozgrywki w więzieniu, limit rozwoju i małe drzewko Spacerniak. Liczby są punktem startowym do strojenia (§12). Uzupełnia [PROGRESSION.md](PROGRESSION.md).

---

## 1. Zasady projektu

1. **Struktura daje rytm, nie kajdany.** Obowiązkowe są tylko apel, posiłki i praca; reszta dnia to wybór, na co wydać czas i siły.
2. **Każdy dzień ma krótki cel**: posiłki i praca utrzymują formę, spacerniak buduje respekt, wieczór w celi to trening. **Każdy tydzień ma cel średni**: niedzielne bicie, handel z klucznikiem, kolejne nazwisko z listy Profesora. **Cel długi** to koniec listy Profesora, szczyt spacerniaka i komplet perków Spacerniaka.
3. **Ryzyko zamiast zakazów.** Bójki są nielegalne, ale możliwe: wygrana daje respekt, a wpadka — raport. Gracz sam wybiera, ile ryzykuje.
4. **Więzienie ma sufit.** Drzewka mają zachowany limit 15 (§7). To, co zostaje wyłącznie z więzienia, to Respekt i drzewko Spacerniak (§8).
5. **Bez nowego silnika.** Rozkład to dane i kilka bramek w istniejących menu stacji, drzwi i `simAdvance`. Moduły według `AGENTS.md`: czyste dane z testami plus właściciel stanu.

---

## 2. Fazy gry i start

- Działająca faza gry: `phase: 'prison'`. **Nowa gra = `prison`**, start w celi.
- **Dzień 1 — przyjęcie (samouczek, ok. 15 min gry):**
  1. 14:00 — karta „Przyjęcie”: wyrok z Old Bailey, przejście do Newgate, spis rzeczy, sukienny kaftan z numerem; za murem bije dzwon St Sepulchre.
  2. Klucznik prowadzi do Wardu. W środku: Harry „Stary” Hobbs (gaduła, przedstawia się pierwszy), Reuben „Kruk” Doyle (patrzy spode łba) i stary człowiek w drewnianym fotelu na kółkach przy pryczy, który się nie odzywa — **Profesor** (§6.4). Pierwsza rozmowa z Harrym uczy **E** i stacji.
  3. 17:30 — pierwsza kolacja przez klapę w drzwiach Wardu: chleb i miska polewki. Jack „Młody” Morley zabiera ci miskę. Wybierasz: oddać (−respekt) albo walczyć — pierwsza bójka, łatwy rywal, bez raportu.
  4. Profesor widzi to ze swojego fotela. Wieczorem odzywa się pierwszy raz, jednym zdaniem zależnym od tego, co zrobiłeś: „Opuszczasz prawą.” albo „Oddałeś. Mądrze albo głupio — zobaczymy.”
  5. 20:30 — apel, potem pierwsza noc.
  6. Dzień 2: pierwsza praca, a po powrocie w celi pierwsza prawdziwa rozmowa z Profesorem i pierwsze nazwisko z jego listy.
- **W fazie `prison`:**
  - Drzwi celi prowadzą tylko do miejsc z bieżącego bloku rozkładu (§3).
  - Siłownia, dom i sklep ze sprzętem zostały usunięte; strój jest więzienny (`prisonOut`).
  - Monety nie są używane. Zarobek idzie na konto więzienne (§5.4).
- **Debug (`?debug=1`):** tryb developera w Opcjach, wybór godziny i dowolnego pokoju Newgate przy drzwiach; harmonogram i autozapis stoją.
- **Stare zapisy** zachowują postęp i wchodzą do Newgate (§9). Nowa gra zawsze startuje w więzieniu.

---

## 3. Rozkład dnia: trzy fazy, po dwie akcje (od 2026-10-04)

Minut już nie ma. Dzień to **rano, południe i wieczór**; w każdej fazie gracz ma **2 akcje**. Przejście między celą,
spacerniakiem i łaźnią nie kosztuje akcji; rozmowa z Profesorem, karta postaci, talia, maść Śmierdziela, handel przez
klapę i jedzenie ze skrzyni też nie. Po drugiej akcji (albo przyciskiem „Zakończ” przy drzwiach) wchodzi klucznik
i zaczyna się następna faza. Sen wieczorem kończy dzień nawet z wolnymi akcjami.

| Faza | Akcje do wyboru | Bez akcji |
| --- | --- | --- |
| **Rano** | śniadanie (miska przez klapę, jedzenie na pryczy) · trening · drzemka · bójka lub siłowanie w celi · **praca w rzeźni** (pon.–sob., trzeba ją zacząć rano; poranek bez pracy to raport) | apel i wydarzenie dnia, Profesor |
| **Południe** | na spacerniaku: walka, zakład, Szef z listy; w celi: trening, drzemka, bójka · w niedzielę niedzielne bicie (całe = 1 akcja) | wyjście na spacerniak, felczer |
| **Wieczór** | kolacja · trening · kąpiel w łaźni (higiena do pełna) · bójka w łaźni lub w celi (Reuben z listy #7) · drzemka | handel przez klapę (pon., czw.), wspomnienia Profesora, sen |

Kosztorys akcji (`simulation.js`):

| Akcja | Skutek |
| --- | --- |
| trening, praca, walka, siłowanie | zmęczenie +1 (pasek kondycji w walce o tyle krótszy, min. 1), higiena −10 (praca −20) |
| drzemka | zmęczenie −2 |
| posiłek | głód 0 (cudzy chleb: dodatkowo zmęczenie −1) |
| kąpiel | higiena 100 |
| przejście fazy | głód +1, higiena −5; noc: zmęczenie −4 |

Głód: od 2 „głodny” (każdy cios −1 obrażeń), od 3 „wygłodzony” (−2), cios zawsze zadaje co najmniej 1. Przykłady:
śniadanie i praca — po południu syty, zmęczenie −1; trening i praca bez śniadania — po południu głodny i zmęczony −2.

Izba chorych:
przeskok dni z §6.7, powrót w południe. Faza zapisuje się w `save.sim` (v8: `faza`, `akcje`, `zm`, `glod`, `h`);
godzina zostaje tylko jako pora fazy (8:00, 14:00, 19:00) dla światła w celi i pogody.

## 4. Miejsca

| Miejsce | Stan | Co dodać |
| --- | --- | --- |
| Ward (cela, `cell`) | jest | Niskie sklepienie z piaskowca i ciemnej cegły, długa drewniana prycza (guard-bed) z siennikami i kółkami na łańcuchy, krata okna z okiennicą, nocna kadź w kałuży, kaganek łojowy, wyryte nazwiska i kreski dni (`ward.js`). Drzwi z klapą i bramką rozkładu; opcja „Czekaj do…”. **Skład:** gracz, Profesor (fotel na kółkach przy pryczy), Harry „Stary” Hobbs (pomocnik Profesora, pcha jego fotel) i Reuben „Kruk” Doyle (przyszły rywal z listy, #7). Zeke „Kosa” Price siedzi w innym wardzie i przychodzi pod klapę przy posiłku. |
| Posiłki | **bez stołówki** | Chleb i miska polewki przez klapę w drzwiach Wardu; jedzenie na pryczy; siłowanie na rękę ze współwięźniem; handel z klucznikiem przez klapę (`ward-meal.js`, §6.5). Stary zapis z `canteen` wraca do Wardu. |
| Rzeźnia przy Smithfield (praca) | jest | Scena boczna `work.js`: tył wozu konnego, ceglane sklepienia, latarnia, haki z półtuszami, zakrwawiona posadzka. Codzienna zmiana 07:00–12:00 (§6.6). |
| Spacerniak | jest | Dziedziniec spacerowy: zakapturzeni więźniowie chodzą w kole po płytach, klucznicy z kołatkami pilnują (`exercise-yard.js`); Profesor pod murem jako widz; punkt zakładów |
| Łaźnia | jest | Sklepiona łaźnia z cynkowymi wannami w boksach, podest dozorcy, gaz, mgła i karbol (`bath.js`) |
| Izba chorych | sekwencja kart | Więzienny chirurg przy świecy; scena zdarzenia z §6.7. Nie jest pokojem. |

---

## 5. Systemy

### 5.1 Opinia (klucznicy i kapelan), 0–100, start 50

| Zmiana | Wartość |
| --- | --- |
| Pełna zmiana w pracy | +2 (ocena A/S: +3) |
| Tydzień bez raportu | +5 |
| Raport | −15 |
| Odmowa pracy | −10 (to też raport) |

| Próg | Efekt |
| --- | --- |
| ≥ 70 | Dłuższy spacerniak (+30 min) i dodatkowy dzień handlu przez klapę (sobota) |
| ≤ 30 | Klucznik nic ci nie sprzedaje |

Opinia to też gotowy uchwyt dla przyszłej fabuły (np. warunkowe zwolnienie). Na razie nic nie odblokowuje wyjścia.

### 5.2 Respekt (współwięźniowie), 0–100, pięć rang

| Ranga | Od | Daje |
| --- | --- | --- |
| Świeży | 0 | Słabsi z celi i spacerniaka sami cię zaczepiają |
| Znany | 15 | 1 pkt Spacerniaka; rywale ★★ (ranga 10+) przyjmują wyzwanie |
| Szanowany | 35 | 1 pkt; zakłady o tytoń; przestają zabierać miskę |
| Twardziel | 60 | 1 pkt; najsilniejsi ze spacerniaka (ranga 14+); niedzielne bicie w głównej drabince |
| Legenda spacerniaka | 85 | 1 pkt; walka z Szefem spacerniaka |

**Źródła:**

- wygrana: +4 × gwiazdki (KO +50%);
- wygrana w niedzielnym biciu: +10;
- przyjęte wyzwanie (nawet przegrane): +1.

**Straty:**

- przegrana: −2 × (4 − gwiazdki rywala), więc porażka ze słabszym boli bardziej;
- odmowa wyzwania: −5;
- oddana miska: −3.

Respekt to jedyny zasób, który rośnie po osiągnięciu limitu poziomów (§7), więc daje sens dalszemu graniu.

### 5.3 Nadzór i raporty

Każda bójka ma szansę wpadki, liczoną przy jej końcu:

| Miejsce | Szansa | Uwagi |
| --- | --- | --- |
| Cela w dzień | 10% | |
| Cela w nocy | 5% | i hałas budzi współwięźniów |
| Spacerniak | 25% | za ławką 10% |
| Przy posiłku (miejsce `canteen`) | 60% | dyżur „ślepego” klucznika Cobba: 15% (§6.5) |
| Łaźnia | 20% | para i szum wody |

Szansa rośnie o 1 pkt proc. za każde 10 s walki, a niedzielne bicie ma ją na 0%, bo klucznicy „nie widzą”.

| Wpadka | Skutek |
| --- | --- |
| Raport | −15 opinii; przepada najbliższy spacerniak |

Bójki dalej dają XP i respekt także przy wpadce — ryzyko dotyczy przywilejów, nie postępu.

### 5.4 Pieniądze: konto, handel przez klapę, depozyt, tytoń

Gra liczy konto w szylingach (liczba dziesiętna w zapisie, bez zmian), a pokazuje je w szylingach i pensach: `fmtMoney(x)` w `prison-data.js` (12 p. = 1 szyl.; np. 1,5 → „1 szyl. 6 p.”).

- **Praca płaci na konto więzienne** według wyrobionej normy (§6.6):
  - **50% na handel** (`wypiska`) — do wydania u klucznika przy klapie;
  - **50% do depozytu** — zachowany depozyt; obecny akt nie ma wypłaty ani wyjścia na wolność.
- **Handel przez klapę** (pon i czw przy kolacji; przy opinii ≥ 70 także w sobotę). Klucze zapasów zostają stare:

  | Towar | Cena | Działanie |
  | --- | --- | --- |
  | Garść herbaty (`kawa`) | 3 szyl. | +15 energii |
  | Kawałek sera (`baton`) | 1 szyl. 6 p. | +20 jedzenia, poza posiłkami |
  | Mydło karbolowe (`mydlo`) | 1 szyl. | mycie i kąpiel dają więcej (5 myć na kostkę) |
  | Peklowana wołowina (`konserwa`) | 4 szyl. | +35 jedzenia |
  | Laska tytoniu (`fajki`) | 5 szyl. | +10 prymek |

- **Tytoń** (prymki tytoniu do żucia — kontrabanda, w zapisie `fajki`) to waluta między więźniami:
  - zakłady przed walką (stawka 5 lub 10, wypłata ×2 przy wygranej);
  - przysługi: Reuben sparuje z tobą za 3 prymki bez ryzyka wpadki, współwięzień odsprzeda ci chleb za 2 prymki, Tully z sąsiedniego wardu pożycza i (zwykle) oddaje.
- **Walki w więzieniu nie dają monet** — tylko XP, respekt i tytoń z zakładów.

### 5.5 Potrzeby

Trzy, wszystkie w `save.sim`: **zmęczenie** (0–8, skraca pasek kondycji w bójce), **głód** (stopnie po fazach, osłabia
ciosy) i **higiena** (0–100, łaźnia i beczka z wodą: +20, z mydłem +40, raz na fazę, bez akcji). Energia i regeneracja
zostały usunięte; ze skrzyni: herbata zmęczenie −1, ser głód −1, peklowana wołowina głód −3.

---

## 6. Pętla dnia i tygodnia

### 6.1 Przykładowy dzień

Apel (zdarzenie) → śniadanie przez klapę → praca w rzeźni (norma, XP siły i wytrzymałości, −energia) → Ward: Profesor omawia wczorajszą walkę i podaje zadanie dnia, potem Cień z Profesorem → obiad → spacerniak (walka z listy pod okiem Profesora, zakład o 5 prymek) → Ward (podciąganie, pompki) → kolacja i handel przez klapę → łaźnia → wieczór w celi (zadanie dnia, drzewka) → apel → sen. Z nocną rozmową z Profesorem albo bez.

### 6.2 Wydarzenia dnia

Krótkie karty z 2–3 wyborami. Losowane przy apelu lub posiłku, najwyżej jedna dziennie, co pozwala ożywić pętlę bez gotowej fabuły:

| Wydarzenie | Wybory i skutki |
| --- | --- |
| Rewizja (przeszukanie Wardu) | Masz nadmiar tytoniu: oddać część albo zaryzykować raport |
| Miska | Bill „Gruby” Bellamy bierze twoją miskę: oddać (−respekt, −jedzenie) lub walczyć (bójka przy posiłku, wysokie ryzyko) |
| Wyzwanie | Rywal z wyższą rangą wyzywa cię na spacerniak; odmowa −5 respektu |
| Przysługa | Tully z sąsiedniego wardu prosi przez kratę o 5 prymek; zwrot w dniu handlu z nawiązką (8) albo wcale — „przenieśli go do Pentonville” |
| Kontuzja w pracy | −10 zdrowia na następną walkę albo zmiana na pół etatu |
| List z domu | Kapelan przynosi przeczytany list: +forma na dzień (zaczepka fabularna na przyszłość) |
| Donos | Kapelan proponuje, żebyś wskazał bijących: +opinia, −−respekt |
| Uwaga Profesora | Darmowa korekta techniki: +50% XP najbliższej sesji cienia |

### 6.3 Niedzielne bicie

Raz w tygodniu, na spacerniaku, z ryzykiem 0%:

- turniej trzech walk z rosnącymi gwiazdkami, do KO lub 90 s;
- pula tytoniu z zakładów;
- wygrana daje +10 respektu, a pierwsza wygrana w ogóle — dodatkowy punkt Spacerniaka.

To główny cel tygodnia.

### 6.4 Profesor — nauczyciel i oś aktu

Stary weteran gołych pięści w drewnianym fotelu na kółkach, **współwięzień gracza z Wardu**. Bił się w latach czterdziestych na łąkach pod Moulsey Hurst i Hampton, kiedy prize ring był nielegalny, a zakłady szły w gwineach. Jedyny trener w więzieniu: to u niego jest cały rozwój, a jego lista przeciwników to **wendetta** — oś aktu. Imię i szczegóły przeszłości zostają do fabuły; mechanika potrzebuje tylko tego, że każde nazwisko z listy ma z nim rachunek do wyrównania.

**Gdzie i kiedy:**

| Miejsce | Pora | Co można |
| --- | --- | --- |
| **Ward** | czas wolny po pracy i wieczorem | wszystko: rozmowa, drzewka, lista, Cień z Profesorem, próby |
| Ward nocą | po 22:00 (gdy gracz czuwa) | tylko rozmowa: wspomnienia i kolejne kawałki wendetty |
| Spacerniak, pod murem | spacer | ogląda walki; omówienie dopiero w celi |
| Ward przy posiłku | posiłki | rozmowa jak zwykle |

Rozwój dzieje się w celi, więc spacerniak zostaje na walki, zakłady i bieg, a nie ma już tłoku w jednej godzinie. Harry pcha fotel Profesora na spacer i przynosi wieści („Profesor chce z tobą pogadać”).

**Co robi Profesor:**

1. **Rozwój.** Otwiera drzewka Siła, Szybkość i Wytrzymałość (zakup, sloty, zmiana buildu) i prowadzi próby na poziom 10 (§7). Spacerniak też kupuje się u niego, choć z komentarzem: „Tego cię nie nauczę. Tego uczy spacerniak”.
2. **Lista Profesora** — kolejni przeciwnicy w ustalonej kolejności. To główna oś aktu (tabela niżej).
3. **Omówienie walki.** Po każdej walce, także spoza listy, przy następnym spotkaniu rzuca jedną uwagę wyliczoną ze statystyk, np.:
   - celność poniżej 35% — „Machasz. Mniej, a celniej”;
   - dużo trafień w głowę — „Opuszczasz prawą”;
   - kondycja poniżej 15% — „Zgasłeś w połowie”;
   - zero ciosów na korpus — „Korpus nie ucieknie”;
   - dużo uników — „Nogi dobre. Teraz kontruj”.
   
   Uwaga daje +10% XP następnej sesji, która ćwiczy ten element. To dobry sposób na uczenie mechanik bez samouczka.
4. **Zadanie dnia.** Przy pierwszej rozmowie w danym dniu daje jedno zadanie dobrane do najsłabszego drzewka i bieżącego rozdziału, np. „3 serie podciągania na B” albo „na torach wyrób normę”. Zaliczone daje +20% XP tej sesji albo +3 respektu. To krótki cel dnia z §1.
5. **Cień z Profesorem** — jedyny trening z trenerem w więzieniu, opisany niżej.

**Cień z Profesorem (wariant walki z cieniem).** Ta sama minigra co walka z cieniem w celi, z Profesorem w fotelu na kółkach z boku sceny. Zamiast podpowiedzi w HUD **Profesor wykrzykuje kombinacje w dymku** („Raz-dwa, na dół!”, „Schyl się!”, „Pivot!”). Grafika ogranicza się do jego pełnej sylwetki w fotelu (rekwizyt plus istniejąca poza siedząca, lekki ruch ręki przy okrzyku) i dymka z tekstem. Nowych animacji rąk nie trzeba.

| | Cień w celi | Cień z Profesorem |
| --- | --- | --- |
| Gdzie i kiedy | cela, kiedy chcesz (także po cichu w nocy) | cela, w czasie wolnym, gdy Profesor jest w celi (nie w nocy) |
| Kombinacje | stała lista 10 | dobiera je Profesor: częściej to, co wypadło słabo w ostatniej walce (z omówienia) |
| Tempo | gracz sam przyspiesza | Profesor narzuca tempo: następna kombinacja pada w rytmie, a spóźnienie obniża ocenę |
| Stopnie | I–V jak dziś | I–III w więzieniu; III odblokowuje próbę Szybkości (§7) |
| XP | bazowo 120, Szybkość 65% / Wytrzymałość 35% | bazowo 150, Szybkość 55% / Siła 25% / Wytrzymałość 20% |
| Świeżość | osobna | osobna (dwa różne treningi tego samego dnia nie odbierają sobie XP) |

To główne źródło **Szybkości** w więzieniu. Technicznie to `startShadowboxing()` w tej samej scenie celi, z innym źródłem kombinacji i rysowaniem Profesora z dymkiem. `shadow-sequence.js` i ocena zostają bez zmian.

**Lista Profesora:**

| # | Rywal | Ranga | Gdzie | Wymaga | Lekcja (warunek dodatkowy) | Za lekcję |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Jack „Młody” Morley (ten od miski) | 3 | spacerniak | — | ≥ 8 zablokowanych ciosów | +5 respektu |
| 2 | Walter „Chudy” Pratt | 6 | spacerniak | — | wygraj, pracując głównie na korpus (≥ 40% trafień) | +1 pkt drzewa z najniższym poziomem* |
| 3 | Zeke „Kosa” Price | 8 | **Ward, przy posiłku** | Znany | nie daj się rozciąć | +5 respektu |
| 4 | Joseph „Siwy” Marsh | 8 | spacerniak | Znany | ≥ 3 kontry | Cień z Profesorem, stopień II |
| 5 | Albert „Ciężki” Rudd | 10 | spacerniak | Znany | nie schodź na liny dłużej niż 5 s naraz | +1 pkt* |
| 6 | Silas „Cichy” Crane | 12 | spacerniak | Szanowany | **ustawiona przegrana** (§6.7); rewanż po izbie chorych: ≥ 12 uników | Cień z Profesorem, stopień III |
| 7 | Reuben „Kruk” Doyle | 12 | Ward, w nocy | Szanowany | ucieknij przed 3 ładowanymi ciosami | +1 pkt* |
| 8 | Ned „Dym” Coker | 14 | spacerniak (niedzielne bicie) | Twardziel | wygraj w niedzielnym biciu | +10 respektu |
| 9 | Dan „Głaz” Mullins | 17 | **Ward, przy posiłku**, przy wszystkich | Twardziel | KO | +1 pkt Spacerniaka |
| 10 | **Szef spacerniaka** (nowy) | 20 | spacerniak | Legenda | — | finał wendetty i aktu (zakończenie do dopisania) |

\* Punkt perka zwykłego drzewka ponad limit z poziomów — tylko 3 w całym akcie, więc warto je zdobywać.

- Wygrana z rywalem z listy przesuwa listę dalej, nawet bez lekcji. Lekcja to dodatek, który zawsze można poprawić w rewanżu.
- Przegrana: Profesor omawia walkę i każe wrócić następnego dnia.
- Walki z listy mają normalne ryzyko raportu dla swojego miejsca. Wyjątki: #8 to część niedzielnego bicia (bez ryzyka), a walki przy posiłku Profesor ustawia na dyżur klucznika Cobba, który „nie widzi” (§6.5).
- Rywale spoza listy dalej zaczepiają gracza na spacerniaku i dają respekt oraz tytoń. Lista nadaje kierunek, a reszta jest swobodna.
- Szef spacerniaka: ranga 20, jedyny ★★★ w więzieniu, ścieżka Uliczny i perki Spacerniaka — gracz widzi je u niego pierwszy.

**Wendetta.** Lista to rachunki Profesora: każde nazwisko na niej ma udział w tym, co go spotkało, a Szef spacerniaka stoi na końcu. Gracz poznaje to stopniowo:

- **Na początku Profesor mówi tylko o boksie:** „Ten jest następny. Jest wolny w nogach.” Prawdziwy powód zostaje niewypowiedziany.
- **Po każdej wygranej z listy** w nocnej rozmowie odkrywa się **wspomnienie** — krótka karta (rycina z ringu z „Bell’s Life”, kwit bukmachera, list bez znaczka, dagerotyp), która pokazuje, co ten rywal miał wspólnego z Profesorem. Treść kart to miejsce na fabułę i nie wymaga dziś ustalenia całości.
- **Ustawiona przegrana (§6.7)** to moment, w którym gracz rozumie, że lista nie jest tylko treningiem: ludzie Szefa wiedzą, kogo Profesor szkoli.
- **Do dopisania później:** czy Profesor jest uczciwy wobec gracza, czy go używa, i co się stanie po ostatnim nazwisku. Mechanika działa przy każdej z tych wersji.

### 6.5 Posiłki przez klapę (w Newgate nie ma stołówki)

Trzy posiłki dziennie przychodzą przez klapę w dębowych drzwiach Wardu: kawał czarnego chleba i blaszana miska polewki (skilly). Klucznik woła, klapa opada, a miskę odbiera się przy drzwiach (`ward-meal.js`).

**Przebieg posiłku.** Odbierz miskę przy drzwiach, nosisz ją po Wardzie, a jedzenie to czynność 15 min na skraju pryczy. Nie zdążysz przed końcem posiłku — klucznik zabiera miski.

- **Profesor** siedzi w fotelu jak zawsze: rozmowa i drzewka, bez treningu.
- **Handel z klucznikiem** w poniedziałki i czwartki przy kolacji: towary z §5.4 trafiają do skrzyni w Wardzie.

**Siłowanie na rękę o chleb.** Minigra przy misce, na pryczy, w świetle kaganka — respekt działa jak przewaga.

| | |
| --- | --- |
| Kto | Współwięzień z Wardu (Harry, Reuben). |
| Stawka | O porcję (z miską w ręku): wygrana — jego chleb (+20 jedzenia ponad posiłek) i +1 respektu (+2, jeśli rywal ma wyższą rangę); przegrana — oddajesz miskę i −2 respektu. Dla sportu: ±1 respektu, bez jedzenia. |
| Inne | Odkupienie jego chleba za 2 prymki; przy przewadze 2 rang można po prostu zażądać chleba (raz na posiłek). |
| Sterowanie | Zbliżenie: dwa przedramiona, pasek równowagi. Naciskasz w rytmie pulsującego kółka (moc) i trzymasz, gdy rywal szarpie — zapowiada to czerwieniejąca twarz. |
| Siła | Twoja moc rośnie z poziomem Siły, a wytrwałość — z Wytrzymałością. Moc rywala wynika z jego rangi; każda ranga przewagi przesuwa start paska o 10%. |
| Czas | Maks. 20 s; remis = nikt nic nie traci. |
| XP | Mała sesja (głównie Siła), z normalną świeżością. |

**Walki przy posiłku** (miejsce `canteen`, bareknuckle; na razie z tłem Wardu):

- walki z listy #3 (Zeke „Kosa” Price) i #9 (Dan „Głaz” Mullins) zaczynają się przy klapie w porze posiłku;
- zwykle ryzyko wpadki 60%, bo klapa jest otwarta i klucznik patrzy;
- walki z listy Profesor ustawia na dyżur klucznika Cobba („nie widzi” za tytoń) — wtedy 15%;
- wygrana przy posiłku daje respekt ×1,5, bo widzą wszyscy;
- wydarzenie „Miska” (Bill „Gruby” Bellamy) też kończy się taką bójką.

### 6.6 Praca: rzeźnia przy Smithfield

Gang więźniów pod okiem klucznika chodzi skuty po dwóch kilkaset metrów od bramy Newgate na tyły targu mięsnego
Smithfield. Kontraktor płaci gaolowi od głowy, a więźniom od półtuszy. Scena i sterowanie to dotychczasowy prototyp
rzeźni (`work.js`): tył wozu konnego, ceglane sklepienia, latarnia, zakrwawiona posadzka. Brygada torowa została usunięta
(2026-10-03).

**Przebieg zmiany:**

- **07:00 zbiórka:** karta „Rzeźnia przy Smithfield”; odmowa to raport.
- **Konwój:** karta „Na Smithfield” — majster pokazuje wóz i liczbę półtusz na haki do południa.
- **Praca:** zdjęcie półtuszy z wozu (mashowanie Spacji), niesienie krokami ←/→ w rytm przechyłu, wyrzut na hak
  z przysiadu w strefie; upuszczona półtusza wraca na posadzkę. Na koniec boksowanie mięsa (ciosy 1–4).
- **12:00 powrót do celi**; potrzeby: −30 energii, −14 najedzenia, −10 regeneracji, −30 higieny.

**Norma i wypłata:** norma = półtusze na hakach względem celu, −8 punktów za każdą upuszczoną, do +20 za boksowanie
mięsa (1 punkt za 4 ciosy), w granicach 0–150% (`workNorma`).

| Norma | Skutek |
| --- | --- |
| 100% | pełna stawka na konto: 12 szyl. (połowa na handel, połowa do depozytu, §5.4) |
| ponad 110% | premia |
| ≥ 120% | „najlepszy w rzeźni”: +3 opinii, majster rzuca kawałek łoju |
| poniżej 80% | skarga majstra: −2 opinii |

Pozostałe zasady:

- XP: sesja `work` — bazowo 100, Siła 55%, Wytrzymałość 45%, intensywność 0,9; ukończenie liczy się z normy.
- Przydział rośnie z liczbą zmian i opinią (stopnie I–III, `workStage`): 6, 8 albo 10 półtusz.
- Zadanie dnia Profesora „norma-100” sprawdza normę zmiany w rzeźni.

### 6.7 Ustawiona walka i izba chorych

Oskryptowana przegrana w połowie aktu, przez oszustwo. Jest punktem zwrotnym wendetty i skraca pobyt: kilka dni mija w jednym przeskoku.

**Kiedy.** Walka #6 z listy (Silas „Cichy” Crane), po 10–20 dniach gry. Zdarzenie dzieje się tylko raz.

**Przebieg:**

1. Walka zaczyna się normalnie i gracz może prowadzić.
2. Gdy przewaga gracza rośnie (albo po ok. 40 s), Silas sięga do rękawa: zwolnienie czasu, błysk — kastet z cynowej łyżki.
3. Jeden cios, nokaut. Gracz nie może tego zablokować ani uniknąć.
4. Oszustwo musi być wyraźnie widoczne, żeby przegrana nie wyglądała na błąd sterowania.
5. Opcjonalnie: klucznik z ludzi Szefa przytrzymuje gracza przy linach w ostatniej sekundzie.

**Skutki:**

- **To nie jest zwykła przegrana:**
  - bez utraty respektu, a nawet +5, bo „wszyscy widzieli, że to był kastet”;
  - bez raportu;
  - nie liczy się do statystyk porażek.
- **Izba chorych na `AMBU_DAYS` dni (domyślnie 6).** Karta czarnego ekranu, potem 2–3 krótkie sceny:
  - więzienny chirurg zszywa łuk brwiowy przy świecy („Upadłeś na schodach, prawda?”);
  - Harry przywozi Profesora w fotelu na kółkach;
  - nocna rozmowa, w której Profesor po raz pierwszy mówi wprost o Szefie i o tym, czym jest lista.
- **Przeskok dni:**
  - kalendarz przesuwa się o `AMBU_DAYS`, a kreski na ścianie przybywają hurtem;
  - rozkład, praca i wydarzenia dnia w tym czasie się nie odbywają;
  - potrzeby wracają do stanu „po leczeniu”: jedzenie i energia pełne, higiena niska;
  - depozyt rośnie o drobną rentę (1 szyl. 6 p. dziennie), bez handlu.
- **Głód rewanżu:** przez 3 dni po powrocie +25% XP ze wszystkich sesji. Nadrabia czas w łóżku i skraca drogę do limitu 15.
- **Lista wraca z rewanżem:** #6 Silas, tym razem uczciwie, z lekcją „≥ 12 uników”. Od tej pory walki z ludźmi Szefa (#9, #10) mają w omówieniu Profesora ostrzeżenie przed brudnymi sztuczkami.

**Skrócenie aktu:** ok. 20 dni gry do limitu i końca listy daje ok. 26 dni kalendarza, z czego 6 mija w jednym przeskoku. Razem z Głodem rewanżu realny czas gry spada o mniej więcej jedną piątą.

**Debug:** pominięcie zdarzenia i przełącznik `AMBU_DAYS`.

---

## 7. Limit rozwoju w więzieniu

- **Każde drzewko zatrzymuje się na poziomie 15.**
  - To daje progi perków I–IV (IV od 12) i 4 sloty.
  - Wybór ścieżki (próg V, poziom 18) i mistrzostwa są poza limitem obecnego aktu.
  - Sufit uzasadnia fabuła: „Z pryczy i gazet więcej nie wyciśniesz”.
- **Tempo** (symulacja na obecnych wzorach, ocena B, praca + 2× pompki, podciąganie i cień + 1 wygrana dziennie): dzień 5 ≈ S10/Sz7/W9, dzień 10 ≈ 14/10/12, dzień 20 — wszystkie trzy 15.
  - Akt potrwa więc ok. 20–30 dni gry, a dłużej, jeśli gracz celuje w Legendę.
  - Szybkość rośnie najwolniej (w więzieniu ma tylko cień i uniki w walce) — to celowa różnica charakteru więzienia.
- **XP ponad limit** odkłada się w banku, maksymalnie do wysokości 1 poziomu (jak przy próbach), i pozostaje w zapisie; obecny akt nie ma wypłaty. Reszta przepada, a ekran pokazuje „limit więzienny”. Dalszy postęp to respekt i Spacerniak.
- **Próby na poziom 10 prowadzi Profesor** w celi (warunki w miejsce siłowniowych, których w więzieniu nie da się zdać):

  | Drzewko | Próba w więzieniu |
  | --- | --- |
  | Siła | Pompki stopień III z oceną ≥ A |
  | Szybkość | Cień z Profesorem, stopień III z oceną ≥ A |
  | Wytrzymałość | Bójka na spacerniaku z rywalem ★★, wygrana bez spadku poniżej 15% kondycji |

  Próby na 20 są poza limitem obecnego aktu i nie mają dostępnego zadania.
- **Drzewka Siła, Szybkość i Wytrzymałość** otwiera rozmowa z Profesorem w Wardzie.
- **Dodatkowe punkty perków:** 3 lekcje z listy Profesora dają po punkcie ponad punkty z poziomów (§6.4).

---

## 8. Drzewko Spacerniak

Czwarta zakładka u Profesora. Punkty pochodzą z rang respektu, pierwszej wygranej w niedzielnym biciu oraz lekcji z Danem „Głazem” Mullinsem. Koszty progów pozostają 1/2/3 punkty; próg III wybiera jeden z trzech perków. Wykupione perki są zawsze aktywne, bez slotów. Zmiana buildu u Profesora kosztuje 20 prymek tytoniu.

Garść piachu i Kciuk w oko dodają karty do talii. Twarda szczęka, Żelazny żołądek, Pamięć spacerniaka i pozostałe perki używają reguł `PERK_CARDS` w `card-data.js`. Nie mają dawnych klawiszy T/R ani odnowień walki na żywo. Bójki rozstrzyga `card-rules.js`; opis w drzewku i karcie postaci pokazuje działanie kartowe.

## 9. Zapis — `version: 6`

Klucze pozostają `heavybag.save` oraz `heavybag.slot.1`–`heavybag.slot.3`. Blok `prison` zachowuje opinię, respekt, raporty, konto, depozyt, tytoń, zapasy, niedzielne bicie, pamięć rywali, wydarzenia, bank XP, listę Profesora, ambulatorium, zadania, normę pracy, przyjęcie i zegar. `bare` zachowuje zakupy i respecs; `injuries` trwałe kontuzje, `habits` nawyki w kartach.

`PRISON_ROOMS` to `cell`, `yard` i `laznia`. Dawne pokoje `home`, `gym`, `canteen` i `izolatka` przy wejściu wracają do Wardu, a dawna faza `free` do `prison`. Historyczne pola sprzętu i monet są tolerowane dla zgodności; nie otwierają starego świata. Izba chorych jest sekwencją kart z przeskokiem dni. Szczegóły ochrony zapisów: [ARCHITECTURE.md](ARCHITECTURE.md).

## 12. Stałe do strojenia

| Stała | Wartość | Efekt |
| --- | --- | --- |
| `PRISON_CAP` | 15 | Długość aktu i limit rozwoju |
| `CAP_BANK` | 1 poziom | Nagroda za granie ponad limit |
| Rozkład | jak w §3 | Rytm dnia i ilość wolnego czasu |
| `WORK_SPLIT` | 50% handel przez klapę / 50% depozyt | Ile z pracy jest „teraz”, a ile „potem” |
| `GUARD_RISK` | Ward 10% (noc 5%) · spacer 25% (ławka 10%) · przy posiłku 60% (dyżur Cobba 15%) · łaźnia 20% · +1 pkt/10 s | Opłacalność bójek |
| `NORMA` | 100% stawka · 110% premia · 120% najlepszy w rzeźni · <80% skarga | Opłacalność pracy |
| `ARM_RESPEKT` | 10% startu paska za rangę przewagi | Siła respektu przy stole |
| `RAPORT` | −15 opinii i zakaz najbliższego spaceru | Ciężar wpadki |
| `NIGHT_CHECK` | co 30 min, 20% | Ryzyko nocnego treningu |
| `RESPEKT_RANKS` | 15 / 35 / 60 / 85 | Tempo odblokowań |
| `RESPEKT_WIN` | +4 × gwiazdki (KO ×1,5) | Opłacalność walk |
| `BARE_POINTS` / `BARE_COST` | 6 / 1·2·3 | Jak szeroki build Spacerniaka |
| `AMBU_DAYS` / `REVENGE_XP` | 6 dni / +25% przez 3 dni | Ile aktu „przeskakuje” i jak szybko gracz nadrabia |


---

## 13. Stan wdrożenia (październik 2026)

Wszystkie etapy z §10 są wdrożone i objęte testami (jednostkowe `tests/prison-data.test.js`, przeglądarkowe `tests/prison.mjs`). Różnice względem planu:

- **Opinia za pracę:** norma ≥ 100% daje +2, ≥ 120% daje +3 (najlepszy w rzeźni), poniżej 80% −2. Premia za normę: +3 szyl. od 110% i +5 szyl. od 120%, przy stawce 12 szyl. za 100%.
- **Lekcje #5 i #7** mają warunki, które da się zmierzyć: #5 to „wygraj bez nokdaunu”, #7 to „co najmniej 8 uników” (zamiast lin i ładowanych ciosów).
- **Reuben (#7)** — Profesor budzi go w nocy z menu rozmowy („Obudź Reubena.”), bo śpiący więzień nie ma stacji. **Szef (#10)** czeka przy drzwiach spacerniaka. Walki przy posiłku (#3, #9) uruchamiają drzwi Wardu, gdy klapa jest otwarta.
- **Cień z Profesorem** to sesja `shadowp` (stopnie I–III odblokowują lekcje #4 i #6, a nie oceny). Próba Szybkości na 10 wymaga stopnia III.
- **Triki Spacerniaka** nie mają nowych póz. Piach to cząstki i krótkie zamroczenie rywala, kciuk — zamroczenie i trwałe „podbite oko” w statystykach. Nerki to krótkie ciosy na korpus pod 1–4 w klinczu; bez blokady wyrwania się rywala.
- **Niedzielne bicie** startuje o 10:00 według zegara, gdy gracz jest na długim spacerniaku: trzy walki z limitem 90 s (`CZAS!` — wygrywa świeższy). Na rozdziale 8 ostatnim rywalem jest Ned. Klucznicy znikają w stróżówce „na łyk ginu”. Wygrana całości: +10 respektu i 2× stawka + 5 prymek.
- **Wydarzenia dnia:** rewizja, list z domu, uwaga Profesora, rozmowa z kapelanem (apel), miska, przysługa (posiłek), wyzwanie (otwarcie spaceru). „Kontuzja w pracy” czeka, aż gra będzie śledzić zdrowie między walkami.
- **Przysługi:** sparing z Reubenem za 3 prymki (bez respektu i ryzyka) oraz odkupienie chleba współwięźnia za 2 prymki. Zakłady o 5 lub 10 prymek przy walkach na spacerniaku od rangi Szanowany.
- **Kreska na ścianie** — karta podsumowania dnia na apelu wieczornym (respekt, opinia, XP, walki, konto w szylingach i pensach, tytoń).
- **Wspomnienia (karty #1–#9)** to szkic fabularny: każde łączy rywala z przeszłością Profesora, ale nie przesądza, kim on jest. Do przepisania razem z resztą fabuły.
- **Dłuższy spacer przy opinii ≥ 70** to dogrywka 30 min po sygnale końca. Bramka czynności na spacerniaku liczy jednak do planowego końca.
- Współczesne lokacje, sklep, monety i walka na żywo zostały usunięte. Rzeźnia jest codzienną pracą (§6.6), brygada torowa usunięta; Cień, animacje i wszystkie systemy Newgate zostały zachowane.
- **Grafika nowych widoków 2D** używa tego samego szkieletu co walki i treningi (`cast.js` na `drawBoxer`). Siłowanie na rękę ma tło Wardu przy świecy; walki przy posiłku (`canteen`) mają na razie tło Wardu (dawne `canteen-scene.js` usunięte). Profesor w Cieniu siedzi w fotelu na kółkach jako postać ze szkieletu: w okularach, z kocem w kratę na kolanach, wskazuje ręką, gdy wywołuje kombinację.
- **Łaźnia (wieczorne mycie)** jest codziennie 19:00–19:40 (blok `bath`, pokój `laznia`, `bath.js`). Klucznik otwiera drzwi Wardu, wejście jest dobrowolne, o 19:40 wszyscy wracają do cel. Sklepiona łaźnia z cynkowymi wannami w boksach, podest dozorcy, kinkiety gazowe, mgła i zapach karbolu; cztery wanny zajmują więźniowie ze spacerniaka, jedna jest wolna (kąpiel, higiena 100, z mydłem karbolowym więcej regeneracji). Z każdym można się bić: walka `laznia` na gołe pięści w ręcznikach (rywale ze spacerniaka), klucznik widzi ją w 20% (+1 pkt co 10 s), bo zasłania ją para i szum wody; scena walki w `bath-scene.js`. Szczegóły grafiki: NEWGATE.md, faza 3 i 5.
- **Profesor w Cieniu** ma długie siwe włosy, pełną siwą brodę, pikowaną kurtkę i szal, bez okularów (warstwy głowy `long` i `fullbeard` bez pozycji w menu wyglądu).

---

## 14. Newgate 1868 — teksty, nazwiska, pieniądze (październik 2026)

Akt więzienny przeniesiono z polskiego więzienia lat 90. do Newgate (Londyn, 1868). Klimat: lekki horror, groźnie, brudno; historia służy nastrojowi. Teksty zostają po polsku, ludzie mają wiktoriańskie angielskie nazwiska, ksywki zostają polskie w „”. Klucze zapisu, identyfikatory pokoi (`cell`, `yard`, `laznia`, venue `canteen`) i towarów (`kawa`, `baton`, `konserwa`, `fajki`) się nie zmieniły.

**Słowniczek:** klawisz → klucznik (dozorca); wychowawca → kapelan (Ordinary of Newgate, chce donosów); fajki → tytoń, prymki; wypiska / kantyna → handel z klucznikiem przez klapę; stołówka / taca → posiłek przez klapę, miska, jedzenie na pryczy; drelich → sukienny kaftan; kipisz → rewizja; ambulatorium / felczer → izba chorych / więzienny chirurg; dyrektor → naczelnik; zł → szylingi i pensy (`fmtMoney`); kawa → herbata, baton → ser, konserwa → peklowana wołowina. Nastrój dopowiadają: dzwon St Sepulchre przed egzekucją, kołatki i klucze dozorców, plotka o kieracie, przeniesienie „do Pentonville”.

| Było | Jest | Gdzie |
| --- | --- | --- |
| Heniek „Stary” | Harry „Stary” Hobbs (Harry) | współwięzień, `CELL_OPP[0]`, `CN` |
| Zbychu „Kosa” | Zeke „Kosa” Price (Zeke) | `CELL_OPP[1]`, `CANTEEN_OPP[0]`, lista #3 |
| Rysiek „Byk” | Reuben „Kruk” Doyle (Reuben) | `CELL_OPP[2]`, lista #7 |
| Marek „Młody” | Jack „Młody” Morley | `YARD_OPP[0]`, lista #1 |
| Witek „Chudy” | Walter „Chudy” Pratt | `YARD_OPP[1]`, lista #2 |
| Janusz „Siwy” | Joseph „Siwy” Marsh | `YARD_OPP[2]`, lista #4 |
| Artur „Ciężki” | Albert „Ciężki” Rudd | `YARD_OPP[3]`, lista #5 |
| Kazik „Cichy” | Silas „Cichy” Crane | `YARD_OPP[4]`, lista #6 |
| Paweł „Dym” | Ned „Dym” Coker | `YARD_OPP[5]`, lista #8 |
| Darek „Głaz” | Dan „Głaz” Mullins | `YARD_OPP[6]`, `CANTEEN_OPP[1]`, lista #9 |
| Gruby „Taca” | Bill „Gruby” Bellamy | `CANTEEN_OPP[2]`, wydarzenie „Miska” |
| Chudy (dłużnik) | Tully | wydarzenie „Przysługa” |
| klawisz Wiesiek | klucznik Cobb | dyżur przy walkach z listy przy posiłku |
| Szef spacerniaka | bez zmian | `YARD_OPP[7]`, lista #10 |
| Profesor | bez zmian; fotel na kółkach zamiast wózka | |

