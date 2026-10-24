# Walka na skille (dawniej kartami) — projekt systemu

> **Stan od 2026-10-17: karty zastąpiono skillami** (decyzja autora). Obowiązują zasady z sekcji
> „Skille zamiast kart” niżej. Reszta dokumentu to historia systemu kart: kontuzje, perki, rywale i ich
> intencje nadal obowiązują, ale ręka, talia, takty, karty obronne i Oddech już nie istnieją.

## Skille zamiast kart (2026-10-17)

- **Zestaw.** Przed walką gracz wybiera w karcie postaci (zakładka Skille) do **6 skilli** z ruchów, które zna
  (`LOADOUT_MAX`, zapis v9 `loadout`). W walce wszystkie są zawsze dostępne — nie ma ręki, dobierania ani kart-ran.
- **Tura.** Kondycja to pasek (5, +1 co 4 poziomy Wytrzymałości). Gracz wydaje ją na skille i kolejkuje je
  (klawisze 1–6 albo klik w pasek menu, Backspace cofa); limit to tylko kondycja. Rywal kolejkuje swoje w ukryciu.
  **Enter** — wymiana.
- **Wymiana według szybkości.** Każdy skill ma tempo: jab 1, cross/hook 2, uppercut 3, każdy dodatkowy cios
  kombinacji +1 (`tempoOf`). Ruchy jednej strony idą jeden po drugim; obie kolejki lądują na jednym zegarze, więc
  trzy jaby trafią przed jednym uppercutem. Pierwszy cios z bliska w turze robi krok (+1). Remis tempa rozstrzyga
  inicjatywa (zapas kondycji z poprzedniej tury, inaczej na zmianę). Kombinacje (Raz-dwa, Burza, Nerki) rozpadają się
  na osobne ciosy i każdy broni się osobno.
- **Obrona to reakcja, nie skill.** Na każdy cios rywala zamyka się ring na głowie gracza:
  - **Unik (Q)** — łatwe okno (±10 tyknięć). Udany: zero obrażeń. Spóźniony: cios wchodzi ×1,5, a cios z efektem
    specjalnym (korpus, rozcięcie, nos…) zamiast tego ma podwójną szansę na efekt (Zadyszka +1).
  - **Parowanie (E)** — trudne okno (±4). Udane: zero obrażeń i **Otwarcie** równe kosztowi sparowanego ciosu
    (I–III; III to krytyk i Przelot — następny ruch rywala przepada). Nieudane: blok, przechodzi połowa
    (ciężki cios ¾).
  - Każda obrona, udana czy nie, kosztuje **1 kondycji z następnej tury** (dług). Bez naciśnięcia — cios czysto.
    Od 2026-10-18 obrona przed ciosem za 1 kondycji (jab, łokieć, Dziobanie po jabie) jest darmowa.
  - Okna zwężają: zamroczenie, wstrząs, krew w oku, ciężkie nogi (unik), podbite oko po stronie ciosu.
- **Wrogowie nie unikają.** AI blokuje część ciosów (styl: `block`/`parry` w `STYLE_AI`, rywale własne wartości),
  częściej przy zamroczeniu rzadziej, Szef (czytanie 2) blokuje ciężkie ciosy, a pamięć nawyków gracza podnosi szansę
  bloku na powtarzanym ciosie. Blok AI też kosztuje go kondycję w następnej turze.
- **Własny cios:** Spacja w czas na ringu = XP (jak dotąd), obrażenia bez zmian. **Auto** w Opcjach: unik zawsze
  udany, parowanie zawsze zwykłym blokiem, bez ringu na własne ciosy.
- **Zapas** (niewydana kondycja) zdejmuje zamroczenie i daje inicjatywę jak wcześniej. Zdrowie 42 + Wytrzymałość
  (wymiana gra wszystkie ciosy obu stron, więc 30 kończyło bójki w 5 turach).
- **Perki** przełożone na skille i reakcje (`PERK_CARDS`): karty obronne z perków stały się regułami
  (Szermierz — szersze parowanie, Duch — unik daje Otwarcie I, Skorupa — pierwsza obrona w turze za darmo,
  Przeczekanie — zapas przechodzi, Odepchnięcie — parowanie ciosu z bliska kasuje następny ruch), „dobieranie kart”
  zamieniło się na kondycję w następnej turze. Ruchy obronne z drzewek zniknęły; wydane na nie punkty wróciły.
- **HUD:** menu pędzlowych pasków (nazwa, koszt, tempo, obrażenia) przy zawodniku gracza jak w Expedition 33,
  dolna oś wymiany z torami Ty/rywal (w planowaniu rywal widoczny tylko przy czytaniu), ring z „Q unik · E parowanie”
  i przyciski dotykowe. Menu pokazuje się dopiero w walce, nie nad widokiem pokoju.
- **Statusy ciosów (2026-10-18, `CIOSY.md` §2).** Jab daje Ustawienie (następny cios, nie jab: +1, cross +2, efekt ×1,5),
  cross Przebicie (blok przepuszcza ¾), hook Zachwianie (25%: następny ruch rywala przepada), uppercut Rozbitą gardę
  (trafiony lub w blok: blok rywala trzyma najwyżej 40%, AI blokuje o połowę rzadziej), jab na korpus ciężkie nogi
  (reszta ciosów rywala o tempo później), prosty na splot Odepchnięcie, hak na wątrobę co trzecim trafieniem Skurcz,
  podbródkowy w żołądek Zgięty (następny cios w głowę bez bloku). **Zadyszka** skraca tylko następny pasek, a ciosy na
  korpus jednej tury się nie sumują. **Telegraf:** ten sam skill dwa razy z rzędu — AI blokuje o 40 p.p. częściej,
  graczowi ring rośnie o 2 tyknięcia. Po zmianach AI kontra AI 5,2 tury; model gracza: bierny 28–45%, nowy 62–70%,
  wprawny 82–95%, mistrz 95–100%. Wzory: `node scripts/sim-cards.mjs 300 5 wzory nowy`.
- **Balans przed statusami** (`node scripts/sim-cards.mjs 200 5`): AI kontra AI 6,4 tury, ~1,4 nokdaunu. Model gracza:
  bierny 24–37%, nowy 58–65%, wprawny 84–93%, mistrz 92–100% z rywalem tego samego poziomu — do strojenia, jeśli
  walki będą za łatwe.


Cel: zastąpić walkę w czasie rzeczywistym taktyczną karcianką w bójkach w Newgate (cela, spacerniak, łaźnia,
posiłek, niedzielne bicie). Ring na wolności i dawny system walki na żywo zostały usunięte.
Walka ma zostać wizualnie tym samym pojedynkiem z boku (sceny Newgate, krew na ubraniach, widzowie), tylko decyzje zapadają między wymianami.
Każda wymiana to zgadywanie, blef i ryzyko, a rozstrzygnięcie wygląda jak bójka, nie jak tabelka.

Filary:
1. **Czytanie, nie losowanie.** Wynik zależy od trafnego odczytania rywala, a nie od rzutu kością. Losowość
   dotyczy tylko kontuzji i dobierania kart.
2. **Koszt to ryzyko.** Ciężki cios jest drogi, wolny i widać, że się szykuje. Kto go odczyta, zyskuje dużo.
3. **Rany zostają.** Kontuzje zmieniają zasady walki: zatykają rękę martwymi kartami, odbierają informacje,
   łamią kości. Zostają na kolejne dni, dopóki gracz ich nie wyleczy.
4. **Ręce gracza w rozstrzygnięciu.** Krótkie momenty zręcznościowe (trafienie w czas, unik w ostatniej chwili,
   wstawanie z desek) wzmacniają albo psują to, co zaplanowała karta. Nigdy jej nie zastępują.

---

## 1. Zasoby zawodnika

| Zasób | Start | Opis |
| --- | --- | --- |
| **Zdrowie** | 30 + 1 za poziom Wytrzymałości | 0 = nokaut. |
| **Kondycja** | pasek 5 punktów, +1 co 4 poziomy Wytrzymałości (8 przy 15) | Na początku każdej tury pasek jest pełny; karty go zmniejszają. Niewydane punkty to **zapas** (niżej). *Zadyszka*, pęknięte żebra i złamany nos skracają pasek do końca walki, min. 3. |
| **Zamroczenie** | 0–7 | Rośnie od ciosów w głowę, spada o 2 na turę. Przy 4+ dostajesz kartę *Mroczki* do ręki, przy 6+ *Wiotkie nogi*, przy 7 — nokdaun. |
| **Ręka** | 5 kart na start, +2 na turę | Maks. 8; nadmiar odrzucasz. |
| **Talia** | ~12 kart | Pusta talia: przetasuj odrzucone i dodaj kartę *Zmęczenie* (długie bójki robią się brudne i ciężkie). |

Pasywne statystyki drzewek dalej działają: Siła → obrażenia i zamroczenie, Szybkość → liczba taktów
i inicjatywa, Wytrzymałość → zdrowie, przyrost kondycji, odporność na Zadyszkę.

## 2. Tura

1. **Dobranie** — +2 karty i +2 za każdy Oddech z poprzedniej tury; pełny pasek kondycji.
2. **Rywal układa** swoją kolejkę w ukryciu. Domyślnie nic z niej nie widać — ani kart, ani ich liczby. Podgląd daje
   dopiero czytanie (§5): perk, pamięć rywala albo Strefa. AI tak samo nie widzi twoich kart; uczy się tylko twoich
   nawyków.
3. **Kolejka gracza** — układasz karty na **3 taktach** (4 od 15. poziomu Szybkości). Ciężkie karty zajmują 2 takty
   (pierwszy to zamach). Takt można zostawić pusty. **↓** przy kładzeniu ciosu celuje w korpus, jak dziś.
   **Oddech** jest zawsze dostępny (na końcu ręki, nie jest kartą): kładziesz go na 1, 2 albo 3 takty.
4. **Koniec tury** → **odsłona**: karty obu stron odwracają się takt po takcie, a zawodnicy wykonują je
   istniejącymi animacjami.
5. **Rozstrzygnięcie taktu** (naprzemiennie):
   - Każdy takt ma **inicjatywę**. Jej właściciel rozgrywa swoją kartę pierwszy, potem rywal.
     Inicjatywa przechodzi na drugą stronę co takt, chyba że ktoś ją przejmie (*Otwarcie*, przerwanie ciosu).
   - **Atak przeciw obronie** → tabela §4.
   - **Atak przeciw atakowi** → szybszy cios (Jab 3, Cross/Hook 2, Uppercut 1) ląduje pierwszy. Jeśli trafi czysto
     w głowę, a cios rywala jest wolniejszy o 2 stopnie — rywal zostaje **wyprzedzony** (karta przepada).
     Przy równej szybkości lądują oba: **wymiana** w zwolnionym tempie, krew z obu stron.
   - **Obrona przeciw obronie / pustemu taktowi** → nic. Kondycja przepada, rywal widzi twój nawyk.
6. **Koniec tury** — Zamroczenie −2, statusy tickują (krwawienie, Skurcz), zagrane karty idą na stos odrzuconych.
   **Zapas**: każdy niewydany punkt kondycji zdejmuje 1 zamroczenia, a kto zostawił sobie 2+ punkty (więcej niż
   rywal), ma inicjatywę w pierwszym takcie następnej tury.

**Dystans** ma dwa stany: **Daleko** i **Blisko**, plus znacznik **Pod ścianą**. Jab i Cross działają z obu.
Hook i Uppercut wymagają Blisko — zagrane z daleka same robią krok (−1 szybkości). Brudne karty tylko
Blisko. Odskok ustawia Daleko; pod ścianą (dwa odskoki z rzędu) odskoku nie ma, jest tylko pivot (*Duch*). **Po każdej turze
zawodnicy się rozchodzą (Daleko)**: pierwszy hook w turze musi wejść krokiem, więc jab może go wyprzedzić — tak
walczący z dystansu zatrzymuje napierającego.

**Koniec walki:** zdrowie 0 albo drugi nokdaun (jak dziś w bójkach). Bez rund i punktów; niedzielne bicie zachowuje
limit czasu jako limit tur (np. 12).

## 3. Karty podstawowe

| Karta | Koszt | Takty | Szybk. | Efekt |
| --- | --- | --- | --- | --- |
| **Jab** | 1 | 1 | 3 | 2 obr. Ustawia: po trafieniu następny cios w tej turze +1 obr. |
| **Cross** | 2 | 1 | 2 | 4 obr. |
| **Hook** | 2 | 1 | 2 | 4 obr., +3 zamroczenia, Blisko. Na korpus: Zadyszka 1. |
| **Uppercut** | 3 | 2 | 1 | 7 obr., Blisko, **Ciężki**: przebija połowę gardy, +4 zamroczenia. |
| Cios na korpus (↓) | jak cios | | | 60% obrażeń, bez zamroczenia. Ma własne zadania, także przez gardę: Zadyszka 1 (Hook/Cross/Uppercut, pasek −1), **ciężkie nogi** (do końca następnej tury unik rywala działa w pełni tylko czysto), **przerwanie zamachu** (trafienie w takcie zamachu kasuje ciężką kartę) i Skurcz przy trafieniu z Otwarciem. |
| **Garda** | 1 | 1 | — | −70% w głowę i w korpus. Hook i uppercut w gardę kosztują 1 kondycji. |
| **Unik** | 1 | 1 | — | Unik ciosu w głowę z Otwarciem. Na korpus i na ciężkich nogach w pełni tylko czysty moment; zwykły — pół obrażeń, spóźniony — całe. |
| **Odskok** | 1 | 1 | — | Unik wszystkiego bez Otwarcia; ustawia Daleko, oddaje inicjatywę. Niemożliwy pod ścianą. |
| **Zwód** | 0 | 1 | — | W zapowiedziach wygląda jak cios. Rywal broni się w tym takcie → jego obrona przepada, ty dostajesz Otwarcie I. Rywal atakuje → dostajesz czysto, +25%. |
| **Oddech** | 0 | 1 | — | Zawsze pod ręką, na dowolną liczbę taktów. Stoisz: nie bijesz, nie bronisz się. Każdy: +2 karty w następnej turze. |

## 4. Tabela rozstrzygnięć (serce systemu)

**Otwarcie** = nagroda za udaną obronę. Jego stopień równa się **kosztowi unikniętej karty** (maks. III). Dlatego
unik pod uppercut (koszt 3) jest wart dużo więcej niż unik pod jab (koszt 1), a unik na unik nie daje nic.

| Otwarcie | Efekt na twoją następną kartę ataku (w tej lub następnej turze) |
| --- | --- |
| I | +1 obrażeń, przejmujesz inicjatywę. |
| II | +50% obrażeń, garda rywala go nie zatrzymuje. |
| III | **Krytyk ×2**, nieblokowalny, +4 zamroczenia; następna karta rywala w tej turze przepada (*Przelot* — rywal leci za własnym ciosem). Dobierasz 1 kartę. |

| Obrona ↓ / Atak → | Jab | Cross | Hook | Uppercut |
| --- | --- | --- | --- | --- |
| **Unik** (w głowę) | unik, Otw. I | unik, Otw. II | unik, Otw. II | unik, **Otw. III** |
| **Unik** (na korpus) | czysto: jak w głowę; zwykły: pół; spóźniony: całe | | | |
| **Garda** (głowa i korpus) | blok | blok | blok, −1 kondycji | połowa przechodzi, −1 kondycji |
| **Odskok** | unik | unik | unik | unik (rywal zostaje Daleko) |
| **Parowanie** | Otw. II | Otw. II | nie działa | nie działa |

Ciosy na korpus: garda blokuje je jak ciosy w głowę, ale Zadyszka i ciężkie nogi przechodzą; unik na korpus wymaga czystego momentu.

## 5. Informacja i blef

Poziom czytania rywala (bazowo **0**: nic nie widać — ani kart, ani ich liczby, ani wydanej kondycji):

| Poziom | Co widzisz w zapowiedziach |
| --- | --- |
| 1 | Liczbę kart w kolejce, wydaną kondycję, które takty zajmuje karta *Ciężka* (zamach). |
| 2 | Kategorię w każdym takcie: cios / obrona / ruch. Zwód pokazuje się jako cios. |
| 3 | Dokładną kartę w jednym, losowym takcie. |

Źródła: perk *Czytanie ciosów* (+2), *Pamięć spacerniaka* (+1 z rywalem, z którym już walczyłeś), uwagi Profesora
przed walką z listy (jedna podpowiedź o nawyku rywala), *Strefa* (cała kolejka raz na walkę).
Utrata: **Zamroczenie 4+** (−1), **podbite oko** — nie widzisz kart z ręki po stronie tego oka (lewe oko →
ciosy prawej ręki rywala są czarną kartą). Rywal ma ten sam system wobec ciebie: *Garść piachu* i *Kciuk w oko*
oślepiają AI.

AI też blefuje: zapamiętuje twoje nawyki (np. „zawsze unik w pierwszym takcie”) i po dwóch powtórzeniach kładzie
tam hook albo zwód. Gracz, który gra przewidywalnie, dostaje lanie.

## 6. Elementy zręcznościowe w rozstrzygnięciu

Wszystkie krótkie (0,3–0,6 s), w zwolnionym czasie, z istniejącym hitstopem. Domyślnie włączone; w opcjach
**Auto** (zawsze „dobrze”) dla tych, którzy chcą czystej taktyki. Klinczu i ładowanych ciosów nie ma.

| Moment | Sterowanie | Efekt |
| --- | --- | --- |
| **Trafienie w czas** — twój cios dochodzi | Spacja, gdy pierścień zamyka się na celu | PERFECT: **więcej XP za walkę**, obrażenia bez zmian. Spóźnione: bez premii. |
| **Obrona w ostatniej chwili** — cios rywala nadlatuje na twoją kartę obrony | Q (unik) albo S (garda) w oknie | Czysto: Otwarcie +1 stopień, garda → **parowanie**; też XP. Za wcześnie/późno: obrona spada o stopień (unik → pół obrażeń). |
| **Wstawanie z desek** | Spacja w takt liczenia | Każdy nokdaun i każda kontuzja głowy zawęża strefę. *Wstań i walcz* ją poszerza. |

## 7. Kontuzje (brutalność z konsekwencjami)

Powstają z trafień z Otwarciem (II–III), czystych hooków, określonych kart i modyfikacji. Pokazane na sprite'cie
(opuchlizna, strużka krwi, zwisająca ręka) i jako **karty-rany** wtasowane do talii poszkodowanego.

| Kontuzja | Skąd | Skutek w walce | Poza walką |
| --- | --- | --- | --- |
| **Rozcięty łuk brwiowy** | czysty hook, łokieć, *Twarde kostki* | Krwawienie 1/turę; przy 2 rozcięciach karta *Krew w oku* (martwa, kosztuje 1 by ją odrzucić). | Łuk pęka łatwiej w następnej bójce. |
| **Podbite oko** | *Kciuk w oko*, 3 trafienia w głowę z Otwarciem II–III | −1 poziom czytania po stronie oka; ciosy tej strony −15% celności (część chybia). | Bójka zaczyna się z czytaniem −1. |
| **Złamany nos** | Uppercut Otw. III, z byka | Przyrost kondycji −1. | Treningi wytrzymałości dają mniej XP. |
| **Pęknięte żebro** (maks. 3) | *Pęknięte żebra*, hook/cross na korpus z Otwarciem (25%) | Każde: pasek kondycji −1, Hook i Uppercut kosztują +1. Przy 3: każdy cios na korpus to Skurcz. | Bójka zaczyna się z tymi żebrami. |
| **Skurcz wątroby** | *Łowca wątroby* | Następny takt rywala przepada (zgięty wpół). | — (tylko w walce) |
| **Złamana kostka dłoni** (*boxer's fracture*) | twój Cross/Hook w gardę lub czoło na gołe pięści, 8% (*Twarde kostki* −) | Karty tej ręki: −50% obr., trafienie zadaje ci 1 obr. Możesz grać nimi dalej — przez ból. | Treningi z ciosami tej ręki zablokowane (worek, cień). |
| **Wstrząs** | nokdaun z krytyka | Karta *Mroczki* na stałe w talii do końca walki; wstawanie trudniejsze. | *Mroczki* w talii każdej bójki. |
| **Wiotkie nogi** | zamroczenie 8+ | Odskok i doskok +1 kosztu. | — (tylko w walce) |

Karty-rany: *Mroczki* (martwa, wraca na wierzch talii przy zamroczeniu), *Krew w oku*, *Zmęczenie*
(z przetasowań), *Ból żeber* (zagrana nic nie robi, odrzucona boli: −1 zdrowia). Leczą je karty *Oddech* i *Skorupa*
oraz perki Wytrzymałości.

**Kontuzje trwałe** (wszystkie poza oznaczonymi „tylko w walce”) **nie goją się same** — zostają, dopóki gracz ich nie
wyleczy. Sposoby leczenia dojdą później (np. izba chorych, szwy, Profesor, maść z handlu przez klapę). Do tego czasu
bójka z kontuzją zaczyna się z jej skutkiem i kartą-raną w talii, rywal widzi twoją złamaną rękę, Profesor odradza
walkę, a klucznik pyta, skąd siniak (+ryzyko raportu). Ta sama kontuzja drugi raz się nie kumuluje, z wyjątkiem żeber
(maks. 3) i rozcięć. Rywale z listy też pamiętają swoje rany: rewanż z Danem, któremu złamałeś nos, zaczyna się
z jego przyrostem kondycji −1.

## 8. Drzewka: karty i modyfikacje

Drzewka, progi, ścieżki, ceny i identyfikatory perków **zostają** (`skill-data.js`, `perk-rules.js`, `BARE_PERKS`).
Zmienia się tylko to, co perk daje: **nową kartę**, **modyfikację karty** albo **regułę**. Dzięki temu stary zapis
nie traci punktów, a migracja perków nie jest potrzebna.

Modyfikacja to „nacięcie” na karcie: karta w ręce pokazuje ją pieczątką. Jedna karta przyjmuje do 2 modyfikacji;
sloty perków (1 + 1 na 5 poziomów) stają się limitem nacięć zabieranych do walki.

### Siła — ciężar i łamanie
| Perk (obecny) | W karciance |
| --- | --- |
| Młot na korpus | Mod Hook/Cross: na korpus Zadyszka 2. |
| Łamacz gardy | Mod: trafienie w gardę zostawia *Pękniętą gardę* — następna garda rywala −30%. |
| Egzekutor | Mod Cross: +3 obr., gdy rywal ma ≤2 kondycji. |
| Finiszer | Reguła: korpus, potem głowa w tej samej turze → +50%. |
| Szok | Mod Uppercut: z Otwarcia ogłusza — cała następna tura rywala ma 1 takt mniej. |
| Łowca wątroby | Mod Hook (korpus): Skurcz wątroby. |
| Rzeźnik | Mod Hook: krytyk rozcina łuk. |
| Ciężkie ręce | Reguła: ciosy z Otwarciem +2 zamroczenia. |
| Pęknięte żebra | Mod Hook/Cross (korpus): czyste trafienie zawsze łamie żebro. |
| Ładowany cios | (bez ładowania) Mod Cross: **Przez gardę** — Cross jest *Ciężki*: przebija połowę wysokiej gardy, ale szybkość 1. |
| Brudna robota | Karty **Łokieć** (Blisko, omija niską gardę, rozcina) i **Z byka** (na zamroczonego: złamany nos). |
| Bomba | Karta **Dobicie** (4, 2 takty): raz na walkę, tylko na rywala z zamroczeniem 4+; trafienie w głowę = nokdaun, w gardę = rywal bez obrony przez turę. Pudło: ty jesteś odsłonięty (rywal ma Otwarcie III). |
| Krwawa łaźnia | Reguła: rozcięcia kumulują się do 5; przy 3 rywal dostaje *Krew w oku* co turę. |

### Szybkość — tempo i odczyt
| Perk | W karciance |
| --- | --- |
| Kontrbokser | Reguła: po udanym uniku następna karta ataku −1 kosztu. |
| Podwójny jab | Mod Jab: **Podwójny** — dwa trafienia po 2. |
| Zmiana piętra | Reguła: głowa → korpus (i odwrotnie) w kolejnych taktach: +1 szybkości. |
| **Miarka** (nowy, tier II zamiast *Znikającego celu* albo obok niego) | Mod Jab: trafiony jab sprawia, że **następny Uppercut w tej turze jest nieblokowalny** — przechodzi przez gardę, Slip daje rywalowi tylko pół uniku. |
| Raz, dwa, trzy | Reguła: dwa trafione jaby w turze → darmowy Cross wstawiony w następny wolny takt. |
| Lustrzana kontra | Reguła: Unik pod prosty → darmowa kontra tą samą ręką w tym samym takcie. |
| Zejście i wystrzał | Reguła: Unik pod hook z Otwarciem → Uppercut w następnym takcie zajmuje 1 takt. |
| Czytanie ciosów | Czytanie +1 poziom. |
| Lekka stopa | Odskok i doskok za 0. |
| Parowanie | Karta **Parowanie** (0): Otwarcie II na proste, ale tylko z czystym momentem obrony. |
| Seria | Reguła: 3 trafienia z rzędu → pozostałe ciosy w turze −1 kosztu. |
| Przelot | Reguła: czysta obrona w ostatniej chwili daje zawsze Otwarcie III. |
| Strefa | Raz na walkę odsłania całą kolejkę rywala przed twoim ruchem. |
| Burza ciosów | Karta **Burza** (Seria ≥4): wszystkie karty ataku z ręki trafiają w kolejne takty, podwójnie szybko. |
| Duch | Karta **Pivot**: wyjście spod ściany, rywal traci turę na obrót; pierwszy cios z boku ma Otwarcie I. |

### Wytrzymałość — przetrwać i zmielić
| Perk | W karciance |
| --- | --- |
| Ekonomista | Reguła: trafienie zwraca 1 kondycji (raz na turę). |
| Żelazna garda | Mod Garda: Ciężkie ciosy nie kosztują dodatkowej kondycji. |
| Twardy korpus | Zadyszka −1 (min. 0). |
| Drugi oddech | Raz na walkę przy kondycji 0: +4 i dobierasz 2. |
| Sprężysta garda | Mod Garda: czysty moment obrony zwraca 1 kondycji. |
| Adrenalina | Reguła: po Otwarciu III twoje ataki w tej turze kosztują 0. |
| Oszczędny unik | Mod Unik: udany zwraca koszt. |
| Serce wojownika | Przy zdrowiu <30% zamroczenie −25%. |
| Gruba skóra | Garda −80% zamiast −70%. |
| Narożnik | Nokdaun rywala: usuwasz jedną kartę-ranę z ręki i +2 kondycji. |
| Klincz | (bez klinczu) Karta **Przeczekanie** (1): garda −40% w tym takcie, +2 kondycji do zapasu. |
| Skorupa | Karta **Skorupa** (2): garda na całą turę, bez ataku. Każdy blok daje Napięcie. |
| Tempo młyna | Reguła: tura z zapasem większym o 3 → rywal odrzuca losową kartę. |
| Wstań i walcz | Wstawanie łatwiejsze; raz na walkę po nokdaunie +25% zdrowia. |
| Forteca | Skorupa: rywal płaci za twoje bloki; 3 Napięcia → **Wybuch** (rywal traci następną turę). |
| Perpetuum | Zadyszka nie działa; rywal z kondycją ≤2 nie może grać uników. |
| Ostatni bastion | Raz na walkę zdrowie 0 → Szał na 2 tury: karty za 0, +40% obr., nie da się cię powalić. |

### Spacerniak — brudna walka (respekt)
| Perk | W karciance |
| --- | --- |
| Garść piachu | Karta **Piach** (0, raz na walkę): rywal na tę i następną turę czytanie 0, połowa jego ciosów chybia. Klucznik: +ryzyko raportu. |
| Betonowa szczęka | Zamroczenie −15%; raz na walkę nokdaun → tylko *Wiotkie nogi*. |
| Więzienny żołądek | Bez zmian (forma). |
| Kciuk w oko | Karta **Kciuk** (Blisko): podbite oko rywala. |
| Z zaskoczenia | Pierwszy takt walki: rywal nie widzi twojej kolejki, twój pierwszy cios ma Otwarcie I. |
| Twarde kostki | +1 obr. na gołe pięści, połowa ryzyka złamania kostki, Cross rozcina przy krytyku. |
| Nerki | Karta **Nerki** (2, Blisko): dwa krótkie ciosy na korpus, Zadyszka 2. |
| Pamięć spacerniaka | Czytanie +1 z rywalem znanym; widzisz jego ulubioną kartę. |
| Bez zasad | Brudne karty raz na turę zamiast raz na walkę. |

## 9. Rywale

Każdy rywal ma **talię**, **styl ułożenia** i **kartę-sygnaturę**. Style z obecnego `STY`:
- `out` (Zeke, Walter): dużo jabów, odskoków i zwodów; trzyma Daleko.
- `press` (Reuben, Albert, Dan, Bill): drogie ciosy, Blisko; dobija przy ścianie.
- `counter` (Harry, Joseph, Silas, Szef): obrony i parowania; karze przewidywalność.
- `bal`: wszystko po trochu, uczy podstaw.

Przykłady sygnatur: Harry „Stary” — *Stara szkoła* (Skorupa, z której wychodzi hook); Reuben „Kruk” — *Dziobanie*
(trzy jaby w jednym takcie); Dan „Głaz” — *Lawina* (uppercut, który nie zwalnia przy zamachu); Silas „Cichy” —
*Cyna* (kastet z łyżki: brudna, rozcina zawsze — scenariusz ustawionej walki #6); Szef — *Piach* i *Kciuk*,
czytanie 2 od startu.

Lekcje z listy Profesora stają się zagadkami taktycznymi: „Joseph zawsze paruje drugi prosty — zagraj zwód”,
„Albert zamach widać z daleka — unik pod uppercut”. Profesor przed walką daje jedną podpowiedź o nawyku.

## 10. Przykładowa tura

*Przykład sprzed zmian z 2026-10-03 (dwie gardy, slip i unik dołem, kondycja przenoszona między turami, zapowiedzi widoczne od startu) — aktualne zasady w §1–§5 i w „Zmianach zasad” na końcu.*

Ty: 6 kondycji, Daleko. Rywal (Dan „Głaz”, `press`) kładzie 2 karty za 5 kondycji; zamach widać na taktach 2–3.
Czytasz: coś ciężkiego na końcu, w takcie 1 karta za 2.

Kładziesz: **T1 Garda wysoka** (1), **T2 Jab z Miarką** (1), **T3 Slip** (1). Zostają 3 kondycji na następną turę.

Odsłona:
- **T1** — Dan: Doskok + Hook. Garda wysoka blokuje (−1 kondycji). Jesteście Blisko.
- **T2** — Dan zaczyna zamach uppercutu. Twój jab (szybkość 3) trafia w zamach — Spacja w czas: PERFECT (XP). Miarka
  aktywna.
- **T3** — Uppercut Dana nadlatuje na twój Slip. Q w ostatniej chwili: czysto. Unik pod kartę za 3 = **Otwarcie III**,
  Dan przelatuje i traci resztę tury. Dobierasz kartę.

Następna tura zaczyna się od twojego krytyka: Uppercut nieblokowalny ×2, kość pęka, nos Dana leje, a cała
sala ryczy.

## 11. Wdrożenie w kodzie

Nowe moduły (czyste części w `checkJs`, z JSDoc):
- `src/card-data.js` — katalog kart, modyfikacji, kontuzji, tabela §4, mapowanie perk → karta/mod/reguła.
- `src/card-rules.js` — czysty silnik: `newDuel()`, `drawTurn()`, `planAI(duel, side, rng)`, `resolveTurn(duel, rng)`
  zwraca listę zdarzeń (`{beat, who, card, outcome, dmg, injury, qte}`). Deterministyczny z ziarnem — testowalny w Node.
- `src/card-fight.js` — właściciel trybu: ręka, kolejka, odsłona, okna zręcznościowe, odtwarzanie zdarzeń.
- Ręka i kolejka jako warstwa DOM nad obrazem w stylu „Afisz i sadza” (wiktoriańskie karty papierosowe z pięściarzami:
  IM Fell English SC, druk, czerwona pieczęć). Zawodnicy zostają na płótnie.

Integracja z obecną walką według wzoru Cienia: `startSpar(idx, venue, station, mode)` dostaje tryb `cards`;
jak `state.shadow` wyłącza AI, kontakt i obrażenia z fizyki. Zdarzenia z `resolveTurn` odtwarzane są publiczną
operacją sparingu w stylu `performShadowAction()` (`performCardAction(who, move, low)`), więc animacje, hitstop,
krew na ubraniu, nokdauny i sceny Newgate są te same. Obrażenia, kontuzje i wynik liczy silnik kart, nie kolizja.
Koniec walki idzie dawną drogą: `showSparResult()`, `recordFight()`, `prisonFightEnd()`, XP walk, respekt, klucznik
(brudne karty podnoszą `guardRisk`).

Zapis:
- Talia bez zmiany schematu: karty z kupionych perków + karty podstawowe, mody z aktywnych slotów.
- Kontuzje trwałe (faza 3) wymagają zapisu: `save.injuries = [{id, day}]` i `version:6`, migracja
  z v5 (brak kontuzji) i test starego zapisu. Kontuzje rywali z listy w `save.prison`. Klucze bez zmian.

Sterowanie ciosami pozostaje w Cieniu. Worek, rytm, ring na wolności, rundy i sędzia zostały usunięte. Bójki używają wyłącznie kart.

## 12. Fazy

0. **Silnik na papierze** ✓: `card-data.js`, `card-rules.js`, testy tabeli §4 i Otwarć, skrypt
   `scripts/sim-cards.mjs` (1000 walk AI–AI na styl: odsetek zwycięstw, długość walki w turach, średnie kontuzje).
   Cel: bójka 6–10 tur, żaden styl nie wygrywa >60% ze stylem lustrzanym.
1. **Pierwsza grywalna bójka** ✓: Harry w Wardzie, karty podstawowe, ręka, kolejka, odsłona animacjami, bez
   zręcznościówek. Przełącznik `?cards=1`.
2. **Ręce w rozstrzygnięciu** ✓: trafienie w czas, obrona w ostatniej chwili, wstawanie; opcja Auto.
3. **Kontuzje** ✓: karty-rany, wygląd na sprite'cie (opuchlizna, krew, ręka), dźwięk pękania; trwałe w zapisie v6,
   widoczne w karcie postaci i w portrecie bohatera.
4. **Drzewka → karty** ✓: nowe opisy perków, nacięcia, karta *Miarka*, podgląd talii w drzewku i karcie postaci.
5. **Rywale** ✓: talie, sygnatury, AI z pamięcią nawyków, podpowiedzi Profesora, ustawiona walka #6.
6. **Leczenie** ✓ (skrócone): maść Śmierdziela, felczer przez klucznika. Odłożone: reakcje na rany, raporty za brudne karty, edytor talii.
7. **Karcianka domyślna** ✓ (2026-10-03): parametr `?cards=1` nie jest potrzebny; dawny system wycięty.

## 13. Ryzyka

- **Kamień–papier–nożyce.** Bez informacji to zgadywanka. Dlatego zapowiedzi (§5) są od startu, a kondycja rywala jest
  zawsze widoczna. Sprawdzać w symulacji i na sobie.
- **Tempo.** Tura z odsłoną ma trwać ≤15 s. Odsłona przyspiesza na Spację, a wymiany bez znaczenia (obrona na pustkę)
  przechodzą w 0,3 s.
- **AI-oszust.** AI nie podgląda kolejki gracza; czyta go tym samym systemem poziomów co gracz.
- **Liczba perków.** 54 + 9 do przepisania. Robić ścieżkami, zaczynając od tieru I–III.

## Postęp
- Faza 0 (2026-10-03): `src/card-data.js` (karty, tabela §4, Otwarcia, kontuzje, talie i wagi AI stylów),
  `src/card-rules.js` (silnik: kolejka, odsłona takt po takcie, inicjatywa, wyprzedzenie, Otwarcia i Przelot,
  zamroczenie i nokdaun, kontuzje i karty-rany, zapowiedzi, AI z pamięcią nawyków; oba w `checkJs`),
  `tests/card-rules.test.js`, `scripts/sim-cards.mjs`. Na razie jedyny mod to *Miarka*.
  Wynik symulacji (400 bójek na parę, poziom 5): na ślepo style 41–59%; bójka trwa 9 tur, ~0,5 nokdaunu;
  trwałe kontuzje ~0,17 na zawodnika na bójkę. Gracz z czytaniem 1 wygrywa z AI 59–74%, z czytaniem 2 — 77–89%.
  Zmiany balansu względem pierwszego szkicu: hook 4 obr. i +3 zamroczenia, uppercut +4, nokdaun przy 7,
  rozejście na Daleko po każdej turze, lżejsza talia `press`; PERFECT daje XP zamiast obrażeń.
  AI planuje pierwsze, na ślepo (nawyki gracza); czytanie AI ≥2 (np. Szef) to reakcja na zapowiedzi — do fazy 5.

- Faza 1 (2026-10-03): pierwsza grywalna bójka pod `?cards=1` — wszystkie bójki w Newgate (cela, spacerniak, łaźnia,
  posiłek, niedzielne bicie z limitem 12 tur) idą kartami. To historyczny przełącznik wdrożenia; po porządkach karty działają domyślnie.
  `src/card-fight.js` prowadzi turę: rywal układa karty pierwszy, gracz widzi zapowiedzi, układa rękę (←/→ wybór,
  1–3 takt, ↓ lub „na korpus” — cios na korpus, Backspace cofa, X odrzuca ranę, Enter/Spacja kończy turę; myszą: klik
  karty, klik taktu), a odsłona gra takt po takcie zwykłymi animacjami: zamach, obrona zgrana z ciosem, reakcje, krew,
  nokdaun i wstawanie, KO i dawna karta wyniku (respekt, klucznik, XP). `sparring.js` ma tryb kart na wzór Cienia
  (`isCardFight`, `cardAct`, `setCardVitals`, `cardCaption`, `cardGetUp`, `cardFinish`, wspólne `hitFx`). Test:
  `tests/card-fight.mjs`. Ograniczenia fazy 1: momenty zręcznościowe zawsze „dobrze” (faza 2), wstawanie zawsze udane,
  dystans tylko jako dwa miejsca, do których zawodnicy podchodzą, perki z czasu rzeczywistego nie działają w kartach
  (faza 4), ustawiona walka #6 bez kastetu (faza 5), układ na telefonie ciasny.

- Faza 2 (2026-10-03): momenty zręcznościowe. Takt, w którym bronisz się przed ciosem, gra się na żywo: cios rywala
  rusza, pierścień zamyka się na twojej głowie, a **Spacja/Q/S** (albo dotknięcie) w chwili zamknięcia ocenia obronę —
  ±4 ticki CZYSTO (Otwarcie +1, garda paruje), ±10 dobrze, inaczej za późno/za wcześnie (pół uniku, pół bloku); kto nie
  naciśnie, ocenia go uderzenie. Silnik rozstrzyga takt dopiero wtedy. Własny cios ma pierścień na głowie rywala:
  CZYSTO = XP (`notePerfect`), obrażenia bez zmian. Po nokdaunie odlicza się do 10, a gracz wstaje trzema naciśnięciami,
  gdy wskaźnik kołysze się w strefie; strefa zwęża się z kolejnymi nokdaunami i ranami głowy. Rywal broni się z losową
  oceną (20/60/20%) i wstaje z szansą 70% (45% ze wstrząsem). Każdy czysty moment to +3% XP za walkę (maks. +30%,
  `fightXP.perfects`, wiersz „Czyste momenty” w wyniku). **Auto** w HUD walki i w Opcjach (`heavybag.cardauto`):
  momenty zawsze „dobrze”, wstawanie pewne. Test: `checkCardMoments` w `tests/card-fight.mjs`.

- Faza 3 (2026-10-03): kontuzje trwałe i rany na postaci. Zapis `version:6` z polem `injuries` — lista `{id, day}`
  (`scar` ×2, `eyeL`, `eyeR`, `nose`, `rib` ×3, `handL`, `handR`, `concussion`), naprawiana przez `sanitizeLasting`;
  zapis v5 wczytuje się z fazą i więzieniem, bez ran (test). Po bójce `recordInjuries` (progression) dopisuje to, co
  pękło (`addLasting`; krwawiące rozcięcie zostawia strup), a następna bójka startuje z nimi (`lastingSpec` →
  `makeFighter`): strup pęka łatwiej (20%/40% przy czystym ciosie w głowę), oko, nos, żebra, kostka i wstrząs działają
  od pierwszej tury. Karta wyniku: „Nowe rany” i „Nosisz rany”. W walce rany są na sprite'ach obu zawodników
  (`drawWounds`: łuk z krwią spływającą do oka, strup, opuchnięte oko, złamany nos, spuchnięta kostka; krew kapie z łuku
  i nosa), z napisem i trzaskiem kości (`sfxCrack`). Karta postaci ma sekcję „Rany” (nazwa, skutek, od którego dnia),
  a portret — podbite oko, plaster na krzywym nosie, strup i opatrunek po wstrząsie. Ran nic jeszcze nie leczy (faza 7).
  Przy okazji: identyfikatory napisów w `boxing.state.puT` są `Uint16Array` (było `Int8Array`, a napisów jest już >127).

- Faza 4 (2026-10-03): drzewka w walce kartami. Każdy z 54 perków drzewek i 9 Spacerniaka ma znaczenie kartowe —
  kartę, nacięcie albo regułę — w `PERK_CARDS` (`card-data.js`; to źródło prawdy, tabele §8 były szkicem). Identyfikatory
  perków bez zmian: zapis nie migruje, sloty (aktywne perki + ścieżka i mistrzostwo, Spacerniak zawsze) decydują, co
  wchodzi do bójki. *Miarka* zajęła miejsce *Znikającego celu*. Nowe karty: Łokieć, Z byka, Nerki, Burza ciosów,
  Dobicie, Odepchnięcie, Mijanka, Garść piachu, Kciuk w oko, Skorupa (do końca tury), Przeczekanie. Silnik
  (`card-rules.js`): `has(f,id)`, triki rozstrzygane przed ciosami, ciosy dodatkowe (Podwójny jab, Ciężka odpowiedź,
  Lustrzana kontra, Raz-dwa-trzy), ciosy wielokrotne (Burza, Nerki), karty raz na walkę, ogłuszenie pierwszego taktu
  (Szok, Kruszarka, Forteca), Strefa (`useZone`, klawisz Z), Szał, Wstań i walcz, Betonowa szczęka i reszta. Rywale
  z listy dostają swoje perki jako karty (Harry: Przeczekanie i Skorupa). Drzewko pokazuje kartowe
  znaczenie (Karta / Nacięcie / Reguła), karta postaci — talię do bójki i reguły. Testy: `tests/card-perks.test.js`
  (każdy perk ma znaczenie, większość ma własny scenariusz).
  Balans: `node scripts/sim-cards.mjs 400 10 perks` mierzy, ile punktów procentowych daje każdy perk (na ślepo i
  z zapowiedziami). Ręka okazała się rzadszym zasobem niż kondycja (dociąg 2 karty ≈ 3 kondycji, odnowa 4), więc perki
  „kondycyjne” (Ekonomista, Seria, Kontrbokser, Żelazna garda, Oddech, Sprężysta garda, Oszczędny unik) dodatkowo
  dobierają karty, a Tempo młyna każe rywalowi odrzucić kartę. Po strojeniu na ślepo najmocniejsze: Burza +15,
  W rytmie +14, Ekonomista +14, Podwójny jab +11; karty obronne i do czytania są na ślepo ujemne (AI nie umie nimi
  grać), ale z zapowiedziami neutralne lub dodatnie (Kciuk, Mijanka, Przeczekanie +6, Odepchnięcie +4, Czytanie
  ciosów +16). Do dalszego strojenia: Skorupa i Lekka stopa (~0 / −2 z zapowiedziami), siła W rytmie na progu II.
  Ograniczenie: brudne karty nie podnoszą jeszcze ryzyka raportu u klucznika (faza 6).

- Faza 5 (2026-10-03): rywale. `RIVALS` w `card-data.js` (po nazwie z `sparring.js`): perki tylko do walki kartami
  (bójka w czasie rzeczywistym ma swoje listy bez zmian), karta-sygnatura dwa razy w talii (`rivalDeck`), nawyki AI
  (`bias`: karta, czasem takt) i podpowiedź Profesora — w dzienniku na starcie bójki, gdy Profesor już mówi.
  Sygnatury: Harry — Stara szkoła (garda, z której wychodzi hak na żebra), Zeke — Kosa (długi prawy szybki jak jab),
  Kruk — Dziobanie (trzy jaby), Głaz — Lawina (uppercut bez zamachu), Silas — Cynowa łyżka (kastet, którego nic nie
  zatrzyma). Nawyki: Joseph paruje drugi prosty, Albert bierze zamach w pierwszym takcie, Chudy odskakuje, Dym zmienia
  piętra, Gruby pcha. Szef czyta na poziomie 2: po ułożeniu kart przez gracza podmienia jedną swoją (`aiReact`), a
  dziennik to mówi. Rywale pamiętają nawyki gracza między walkami: `save.habits` (klucz miejsce:indeks, liczby kart na
  takt, po każdej walce stare ×0,6 + nowe; `sanitizeHabits`, test zapisu v6 bez tego pola). Lekcje z listy w walce
  kartami mają mniejsze progi (`lessonText`, `lessonOk` z `cards`; np. 4 uniki zamiast 12). Ustawiona walka #6: gdy
  gracz prowadzi o 15% zdrowia albo od 5. tury, Silas kładzie w pierwszym takcie łyżkę — KASTET, izba chorych jak dotąd.
  Symulacja gracza z zapowiedziami na poziomie równym randze rywala: Harry 75%, Jack 74%, Chudy 56%, Zeke 46%,
  Joseph 62%, Albert 55%, Kruk 54%, Silas 47%, Dym 67%, Głaz 37%, Szef 38%. Testy: rywale w `card-perks.test.js`,
  lekcje w `prison-data.test.js`, `checkCardRigged` w przeglądarce.
- Metronom usunięty z gry (dźwięk w rytmie i skakance, opcja w Opcjach).

- Faza 6 skrócona (2026-10-03): zamiast pełnego „życia z ranami” — samo leczenie. **Śmierdziel** (`npcs.STINK`,
  blok palety 216, `N_RAMPS` 226): brudny więzień bez koszuli, kuca na mokrych płytach przy kadzi Wardu, nad głową
  krążą mu muchy (`ward.wardFlies`), czasem się drapie, śpi na siedząco. Za 2 prymki tytoniu sprzedaje maść na twarz
  (strup, podbite oko, złamany nos); w 30% to maź z kadzi — nie leczy, higiena −25. **Klucznik na spacerniaku** za
  3 szylingi z konta prowadzi do felczera: dowolna rana, zawsze skutecznie. Rozmowy to karty w stylu afisza
  (`healers.js`), jedna rana na zakup (najstarsza tego rodzaju, `card-data.healOne`); operacje właścicieli:
  `progression.healInjury`, `prison.spendTobacco`/`spendMoney`, `simulation.simNudge`. Test: `checkHealers`.
  Reakcje klucznika, Profesora i rywali na rany oraz ryzyko raportu za brudne karty — odłożone.

## Decyzje (2026-10-03)
1. Tylko bójki w Newgate. Ring na wolności wypada.
2. Elementy zręcznościowe są, z opcją Auto. Bez klinczu i ładowanych ciosów.
3. Kontuzje zostają na kolejne dni, dopóki gracz ich nie wyleczy; sposoby leczenia dojdą później.
4. PERFECT podnosi XP, nie obrażenia (łatwiejszy balans).

- Porządki (2026-10-03): wszystkie bójki domyślnie kartami, bez `CARD_FIGHTS` i parametru `cards`; zachowane sceny, animacje, Cień, wyniki i zapis v6. Opis faz 0–6 wyżej jest historią wdrożenia.

## Zmiany zasad (2026-10-03, po rozmowie z autorem)
- **Jedna garda** (`garda`): −70% w głowę i w korpus. Garda niska znika.
- **Jeden unik** (`unik`, dawny slip i unik dołem): unika każdego ciosu w głowę z Otwarciem równym kosztowi karty. Na
  korpus i na *ciężkich nogach* w pełni tylko czysty moment; zwykły — pół obrażeń bez Otwarcia, spóźniony — całe.
  Odskok zostaje osobno. Animacja: pod hook schylenie, pod resztę zejście w bok.
- **Ciosy na korpus** mają własne zadania, także przez gardę: Zadyszka (pasek −1), ciężkie nogi rywala do końca
  następnej tury, przerwanie zamachu ciężkiej karty, Skurcz z Otwarciem.
- **Oddech** to stała akcja na końcu ręki (`queueBreath`), na 1–3 takty naraz; każdy daje +2 karty w następnej turze.
  Kosztem jest stanie bez obrony. Nie ma go już w taliach.
- **Kondycja** to pasek: 5 punktów (+1 co 4 poziomy Wytrzymałości), pełny co turę. Niewydane punkty — **zapas**:
  −1 zamroczenia za punkt, a 2+ punkty (więcej niż rywal) dają inicjatywę w takcie I następnej tury. Nos i żebra
  skracają pasek. Perki „zwrotu kondycji” dodają do zapasu tej tury; Drugi oddech dobiera 3 karty, Tempo młyna każe
  rywalowi odrzucić kartę, Perpetuum blokuje uniki rywalowi z zapasem ≤2.
- **Zapowiedzi ukryte domyślnie** (czytanie 0) po obu stronach. Podgląd: *Czytanie ciosów* (+2), *Pamięć spacerniaka*
  (+1), *Strefa*, a z rywali Silas (Czytanie) i Szef (czytanie 2, `aiReact`). AI uczy się nawyków jak dotąd.
- Stare zapisy: nawyki rywali pod `garda-nisko` i `slip` łączą się w `garda` i `unik` (`sanitizeHabits`), schemat v6.
- Przy okazji: pasek kondycji pod zdrowiem pokazywał karty w skali walki w czasie rzeczywistym (126) i był prawie pusty;
  teraz ma podziałki na punkty. Animacje walki nie zwalniają już do zera przy ujemnej kondycji (zawieszenie odsłony),
  a moment obrony trafia w klatkę uderzenia (`apexT`).
- **Ciosy na korpus jako osobne karty** (etap 1 `TALIA.md`): strzałka ↓ zniknęła. Karty korpusu mają własne obrażenia
  (bez mnożnika 60%), ciężkie nogi dają wszystkie, Zadyszkę wszystkie poza Jabem na korpus (Podbródkowy w żołądek: 2).
  Gracz walczy talią z zapisu (`playerDeck`), rywale taliami stylów z kartami korpusu.

