# Perki atrybutów: Cechy (projekt)

Stan (2026-10-18): **wdrożone** — Cechy, punkty na ciosy, pasywna Szybkość, zapis v10 i zakładki karty postaci (`CIOSY.md` §6 krok 2). Perki atrybutów są **uniwersalne** i nie dotyczą
konkretnych ciosów. Wszystko, co wzmacnia jeden cios, idzie do drzewek ciosów (`CIOSY.md` §3). Spacerniak
(`BARE_PERKS`, brudna walka) zostaje bez zmian.

## 1. Co jest dziś nie tak

- **Dwa opisy jednego perka.** `skill-data.js` opisuje dawną walkę na żywo (sekundy, milisekundy, liny, rundy), a
  `PERK_CARDS` w `card-data.js` opisuje, co perk robi w bójce na skille. Gracz widzi w drzewku nieaktualny tekst.
- **Jedna trzecia perków jest niedostępna.** Poziomy V i VI wymagają poziomu 18 i 25, a Newgate kończy się na 15.
  Ścieżki i mistrzostwa (Skorupa, Strefa, Kruszarka, Ostatni bastion, Forteca…) to 18 z 54 perków.
- **Za dużo mechanizmów naraz.** Punkty, koszty 1–6, wymagania, progi poziomów, wybór ścieżki, sloty aktywnych perków.
  Do tego te same punkty kupują ruchy.
- **Szybkość nie działa w bójce.** `makeFighter` czyta tylko Siłę (moc, zamroczenie) i Wytrzymałość (zdrowie,
  kondycja). Poziom Szybkości nic nie zmienia.
- **Połowa perków to modyfikacje jednego ciosu** (Egzekutor, Rzeźnik, Podwójny jab…). Mają być w drzewkach ciosów.

## 2. Zasady

- **Na poziomach 5, 10 i 15** każdego atrybutu wybierasz **jedną z dwóch Cech**. To trzy wybory na atrybut i
  dziewięć na postać przy limicie Newgate. Cecha 10 otwiera się po osiągnięciu poziomu 10, jeszcze przed próbą Profesora.
- Cechy są **zawsze aktywne**: bez punktów, slotów, ścieżek i wymagań.
- **Punkty atrybutu idą tylko na ciosy tego atrybutu**: naukę ruchów i drzewka ciosów (`CIOSY.md` §3). Trening
  kształtuje styl: pompki i krata rozwijają cross i uppercut, Cień i karaluchy jab i hook, kierat ciosy na korpus.
- **Zmiana wyboru** u Profesora: pierwsza w atrybucie za darmo, potem 5 prymek za jedną Cechę. Wolne miejsce wybiera się za
  darmo także w karcie postaci.
- **Każdy atrybut działa sam z siebie**, bez Cech:
  - **Siła** — moc i zamroczenie (jak dziś).
  - **Wytrzymałość** — zdrowie i kondycja (jak dziś).
  - **Szybkość** — nowe: okno uniku +1 tyknięcie na poziomach 5, 10 i 15; remis tempa po zapasie kondycji (2+ i więcej niż
    rywal) wygrywa zawodnik z wyższą Szybkością, a przy równej — na zmianę.

## 3. Cechy

Na każdym poziomie dwie drogi o innym charakterze. „Nowa” oznacza nową mechanikę; przy reszcie w nawiasie jest dawny
identyfikator perka, zachowany dla zapisów i rywali. Liczby to pierwsze strzały do symulatora.

### Siła

| Poz. | A | B |
| --- | --- | --- |
| 5 | **Kość w kość** (nowa): twój cios, który rywal zablokuje, zabiera mu 1 kondycji z następnej tury. Blok przestaje być darmowy. | **Rozcinacz** (nowa): każdy czysty cios w głowę +5 p.p. na rozcięcie łuku. |
| 10 | **Stłuczone przedramię** (nowa kontuzja): twój cios w blok w 15% stłucze rywalowi rękę — jej ciosy −1 obr. do końca walki. | **Nokauter** (nowa): rywal idzie na deski przy zamroczeniu 6 zamiast 7. |
| 15 | **Wybity bark** (nowa kontuzja): trafienie z Otwarciem III wybija rywalowi bark — do końca walki nie zagra ciosu za 3+. | **Kat** (nowa): raz na walkę czysty cios w głowę rywala z ≤20% zdrowia to nokdaun. |

Charakter: A łamie rywala na raty (kondycja, ręka, bark), B kończy szybko (krew, deski).

### Szybkość

| Poz. | A | B |
| --- | --- | --- |
| 5 | **Szczęśliwy unik** (nowa): 10% ciosów rywala chybia samo, bez reakcji i bez kosztu. | **Kontrbokser** (`counterpuncher`): po udanej obronie najbliższy twój cios +1 obr. i +1 zamroczenia. |
| 10 | **Duch** (`ghost`): udany unik daje Otwarcie I. | **Rozpęd** (`momentum`): od trzeciego ruchu w kolejce każdy o 1 tempo szybszy. |
| 15 | **Przelot** (`overreach`): czysty unik w ostatniej chwili daje Otwarcie III. | **Strefa** (`the-zone`): raz na walkę (klawisz Z) widzisz całą kolejkę rywala przed swoim ruchem. |

Charakter: A żyje z uników i kontr, B z własnego tempa i czytania.

### Wytrzymałość

| Poz. | A | B |
| --- | --- | --- |
| 5 | **Byczy kark** (nowa): +6 zdrowia. | **Ekonomista** (`economist`): pierwsze czyste trafienie w turze daje +1 kondycji w następnej. |
| 10 | **Kolczasta garda** (nowa): blok odbija w atakującego 25% obrażeń, które zatrzymał. | **Skorupa** (`shell`): pierwsza obrona w turze nic nie kosztuje. |
| 15 | **Ostatni bastion** (`last-stand`): raz na walkę zdrowie 0 to Szał — dwie tury, ciosy +40% i tańsze. | **Tempo młyna** (`grinder`): koniec tury z 3+ kondycji zapasu więcej niż rywal — rywal ma 1 kondycji mniej w następnej. |

Charakter: A wytrzymuje i oddaje, B wygrywa na kondycji.

## 4. Nowe kontuzje

Obie działają tylko do końca walki i nie trafiają do zapisu (decyzja autora).

| Kontuzja | Skąd | Skutek |
| --- | --- | --- |
| **Stłuczone przedramię** (lewe / prawe) | Siła 10 A | ciosy tą ręką −1 obr. |
| **Wybity bark** | Siła 15 A | nie zagra ciosu za 3+ (uppercut, podbródkowy w żołądek, Dobicie, Burza) |

## 5. Co dzieje się z dzisiejszymi perkami

- **Zostają Cechami:** `counterpuncher`, `ghost`, `momentum`, `overreach`, `the-zone`, `economist`, `shell`,
  `last-stand`, `grinder`.
- **Do drzewek ciosów** (`CIOSY.md` §3, węzły „dawny …”): `body-hammer`, `executioner`, `shock`, `liver-hunter`,
  `butcher`, `heavy-answer`, `cracked-ribs`, `charged-punch`, `double-jab`, `vanishing-target`, `one-two-three`,
  `sting`, `duck-launch`, `level-change`, `finisher`.
- **Do ruchów za punkty** (już są w `MOVES`): `bomb` → Dobicie, `storm` → Burza ciosów. `dirty-work` (Łokieć, Z byka)
  przechodzi do Spacerniaka.
- **Tylko dla rywali:** `read-tells` (Silas, Szef czyta i bez niego), `mirror-counter` (Joseph), `flurry` (Ned),
  `staraszkola` (Harry). Silnik dalej je zna, gracz ich nie wybiera. Tak budujemy rywalom tożsamość.
- **Wycofane:** pozostałe 24 perki: `guard-breaker`, `demolition`, `heavy-hands`, `rope-pressure`, `crusher`,
  `bloodbath`, `parry`, `light-feet`, `rolling`, `efficient-evade`, `iron-guard`, `thick-skin`,
  `tough-body`, `breather`, `clinch`, `second-wind`, `rise`, `fortress`, `warrior-heart`, `cornerman`, `perpetuum`,
  `elastic-guard`, `adrenaline`, `shove`. Dobre pomysły z tej listy mogą wrócić jako węzły drzewek ciosów albo cechy
  rywali.

## 6. Zapis i rywale

- **Zapis v10.** `skills[str|spd|end] = {unlocked, active, path, …}` zamienia się w `traits[str|spd|end]` — trzy
  miejsca (5, 10, 15) na literę A/B albo puste. Migracja zwraca punkty wydane na perki do ich atrybutów. Cechy
  wybiera się od zera, za darmo, przy pierwszej wizycie u Profesora po wczytaniu. Test starego zapisu jak zwykle.
- **Ruchy zmieniające atrybut** (hook do Szybkości; splot, wątroba i Nerki do Wytrzymałości): w starym zapisie
  oznaczone `gift`, żeby nie przekroczyć punktów nowego atrybutu.
- **Rywale.** Walter (`double-jab` → Mocne ustawienie, Podwójny jab), Albert (`body-hammer`, `liver-hunter` → Młot,
  Łowca wątroby, Na kolana, Bomba) i Ned (`level-change` → Zmiana piętra, Bez kroku, Podwójny hak; Seria zostaje) mają
  węzły zamiast perków. Pozostałe perki rywali działają jak dotąd (§5); każdy rywal dostał też węzły swojego stylu
  (`RIVALS` w `card-data.js`).
- **Ekonomia** przy limicie 15: ok. 15 punktów na atrybut. Szybkość i Siła mają po trzy ciosy (21 punktów na pełne
  drzewka plus nauka), więc domykasz dwa z trzech. Wytrzymałość ma dwa ciosy (14) i może domknąć oba: wytrzymały
  zawodnik to zawodnik od korpusu.
