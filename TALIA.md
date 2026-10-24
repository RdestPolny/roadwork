# Talia, ruchy i ich rozwój — projekt do akceptacji

> **2026-10-17:** talię zastąpił zestaw do 6 skilli (zapis v9 `loadout`, zakładka Skille). Ruchy obronne (Unik, Odskok, Zwód, Parowanie, Mijanka, Garda, Skorupa, Przeczekanie, Odepchnięcie) przestały być ruchami — obrona to reakcje Q/E, patrz `KARCIANKA.md`. Poniżej historia projektu talii; ścieżki ulepszeń ataków nadal są aktualne jako plan.

Stan (2026-10-03): zaakceptowane. **Etap 1 wdrożony** — zapis v7, karty głowa/korpus (Jab na korpus, Hak na wątrobę, Prosty na splot, Podbródkowy w żołądek, Raz-dwa), talia startowa, kolekcja, nauka ruchów za punkty drzewek, zakładka Talia, drabina rywali w karcie postaci. Ścieżki ulepszeń (etap 2), losowość (3) i rywale z własnymi ruchami (4) — dalej. Zasady walki z dzisiejszymi zmianami są w `KARCIANKA.md`
(jedna garda, jeden unik, Oddech jako akcja, pasek kondycji z zapasem, ukryte zapowiedzi).

## 1. Zasady

- **Kolekcja i talia.** Każdy ruch, którego się nauczysz, trafia do kolekcji. Talia ma **12–20 kart**, maks.
  **3 kopie** jednego ruchu; ruchy *jedyne* (np. Dobicie) i brudne — po 1. Oddech jest zawsze pod ręką i nie
  liczy się do talii.
- **Edycja talii** wszędzie poza walką: nowa zakładka **Talia** w karcie postaci (P). Widać kolekcję, talię,
  liczniki i podgląd każdego ruchu ze ścieżkami.
- **Głowa i korpus to osobne karty.** Strzałka ↓ znika. Ciosy na korpus mają mniej obrażeń i własne zadania
  (Zadyszka, ciężkie nogi, przerwanie zamachu, Skurcz) — patrz `KARCIANKA.md`.
- **Punkty drzewek.** Trening Siły, Szybkości i Wytrzymałości daje punkty tego drzewka (jak dziś: poziom − 1,
  próby, lekcje — ok. 15–17 na drzewko przy limicie Newgate). Za te same punkty:
  - **nauka ruchu** należącego do drzewka: 1 pkt (ruchy ciężkie i jedyne: 2 pkt),
  - **stopnie ścieżki** ruchu: I = 1, II = 1, III = 2 pkt (pełna ścieżka 4 pkt),
  - **perki-reguły** drzewka (pasywne, np. Kontrbokser, Narożnik) — jak dziś.
- **Dwie ścieżki na ruch, wybierasz jedną.** Stopnie kupuje się po kolei. Zmiana ścieżki działa jak dziś
  zmiana buildu u Profesora (zwrot punktów, koszt w prymkach i czasie). Ulepszenie dotyczy ruchu, czyli
  wszystkich jego kopii w talii.
- **Porządek w drzewkach.** Perki, które dziś dają kartę, stają się ruchami do nauki; perki-nacięcia stają się
  stopniami ścieżek; perki-reguły zostają w drzewkach. Stary zapis: wykupione perki zamieniają się na
  odpowiadające im ruchy i stopnie bez utraty punktów (migracja do v7 z testem starego zapisu).

## 2. Talia startowa (12)

2× Jab, 1× Jab na korpus, 2× Cross, 1× Hook, 1× Hak na wątrobę, 2× Garda, 1× Unik, 1× Odskok, 1× Zwód.
Znane od startu, bez stopni. Kolejne kopie startowych ruchów są w kolekcji od razu (do 3).

## 3. Ruchy i ścieżki

Format: koszt kondycji · szybkość · obrażenia · cel. Stopnie I → II → III w każdej ścieżce kupuje się po kolei.

### Szybkość

| Ruch | Bazowo | Ścieżka A | Ścieżka B |
| --- | --- | --- | --- |
| **Jab** (start) | 1 · 3 · 2 · głowa. Trafiony ustawia: następny cios w turze +1 obr. | **Szpica**: I +1 szybk. → II ustawienie daje +2 → III 30% na drugi jab tuż po pierwszym | **Ciężki jab**: I +1 obr. → II +1 zamroczenia → III dwa trafione jaby w turze: rywal −1 szybk. do końca tury (Żądło) |
| **Jab na korpus** (start) | 1 · 3 · 1 · korpus. Ciężkie nogi. | **Kłucie**: I koszt 0 → II +1 obr. → III trzecie trafienie w walce: rywal odrzuca losową kartę | **Zmiana piętra**: I po nim cios w głowę +1 szybk. → II … i +1 obr. → III po nim cios w głowę przebija połowę gardy |
| **Unik** (start) | 1 · obrona. Głowa: Otwarcie = koszt ciosu; korpus i ciężkie nogi: tylko czysto w pełni. | **Lustro**: I po udanym uniku następny cios w turze +1 szybk. → II unik pod prosty oddaje tym samym ciosem → III czysty unik zawsze daje Otwarcie III | **Balans**: I udany unik zwraca koszt → II pod hook: twój uppercut w tej i następnej turze bez zamachu → III ciężkie nogi nie psują ci uniku |
| **Odskok** (start) | 1 · ruch. Unik wszystkiego bez Otwarcia, Daleko. | **Lekkie nogi**: I koszt 0 → II po odskoku jab +1 szybk. → III odskok z jabem w tym samym takcie | **Ściana**: I jeden odskok więcej pod ścianą → II odskok spod ściany daje Otwarcie I → III rywal, który goni (hook z dystansu), traci 1 kondycji z zapasu |
| **Zwód** (start) | 0 · wygląda jak cios. Obrona rywala przepada, Otwarcie I; w cios — +25% obrażeń dla ciebie. | **Blef**: I przy czytaniu rywala zwód pokazuje się jako jego ulubiony cios → II udany zwód daje Otwarcie II → III udany zwód dobiera kartę | **Wabik**: I zwód w cios: tylko +10% obrażeń → II rywal, który się nabrał, traci następny takt w 25% → III dwa zwody z rzędu: drugi zawsze udany |
| **Raz-dwa** (nauka 1) | 2 · 3 · 2+3 · głowa. Jab i cross w jednym takcie; obrona działa na każdy. | **Kombinacja**: I cross +1 obr. → II trafiony jab: cross przebija połowę gardy → III 25% na trzeci cios (hook) | **Tempo**: I koszt 1 → II po Raz-dwa następny takt +1 szybk. → III czysto oba: Otwarcie I |
| **Burza ciosów** (nauka 2) | 5 · 3 · 2/2/2 · głowa. Jab, hook, jab. | **Grad**: I czwarty cios (cross) → II każdy trafiony +1 zamroczenia → III koszt 4 | **Huragan**: I trafienia mieszają głowę i korpus → II każdy na korpus daje ciężkie nogi → III ostatni cios to uppercut |
| **Mijanka** (nauka 1) | 0 · ruch. Wyjście spod ściany, cios rywala w powietrze, Otwarcie I. | **Duch**: I działa też nie pod ścianą (raz na turę) → II Otwarcie II → III pierwszy cios po mijance zawsze czysty | **Torreador**: I rywal, który chybił, traci 1 kondycji z zapasu → II … i odrzuca kartę → III Przelot (traci następną kartę) |
| **Parowanie** (nauka 1) | 0 · obrona. Z czystym momentem Otwarcie II na prosty; inaczej garda. | **Szermierz**: I paruje też hook → II czyste parowanie dobiera kartę → III zwykły moment wystarcza na proste | **Kontra**: I po parowaniu twój cross w tej turze +2 obr. → II … i +1 szybk. → III parowanie oddaje cross od razu |

### Siła

| Ruch | Bazowo | Ścieżka A | Ścieżka B |
| --- | --- | --- | --- |
| **Cross** (start) | 2 · 2 · 4 · głowa. | **Egzekutor**: I +1 obr. → II +3 obr., gdy rywalowi zostały ≤2 kondycji → III kryt +10 p.p. | **Przez gardę**: I garda zatrzymuje tylko połowę → II trafienie w gardę pęka ją do końca następnej tury → III złamanie ręki rywala w gardzie: szansa ×2 |
| **Hook** (start) | 2 · 2 · 4 · głowa, +3 zamroczenia, Blisko (z dystansu krok, −1 szybk.). | **Rzeźnik**: I rozcięcie 15% → II krwawienie podwójne → III rozcięty rywal: twój hook +2 obr. | **Nokauter**: I +1 zamroczenia → II czysty hook przy zamroczeniu 5+: nokdaun → III kryt +10 p.p. |
| **Hak na wątrobę** (start) | 2 · 2 · 3 · korpus. Zadyszka 1, ciężkie nogi. | **Wątroba**: I Zadyszka 2 → II czysty: Skurcz (rywal traci następny takt) → III przez gardę połowa obrażeń | **Żebra**: I koszt 1 → II po nim następny cios na korpus +2 obr. → III trzecie trafienie w walce łamie żebro |
| **Uppercut** (nauka 1) | 3 · 1 · 7 · głowa, +4 zamroczenia, Ciężki (zamach, 2 takty). | **Bomba**: I +2 zamroczenia → II z Otwarciem: kryt ×2,5 → III czysty przy zamroczeniu 4+: nokdaun | **Lawina**: I zamach znika (1 takt) → II +1 szybk. → III po uniku pod hook zawsze czysto |
| **Prosty na splot** (nauka 1) | 2 · 2 · 3 · korpus. Zadyszka 1. | **Splot**: I trafiony: rywal dobiera w następnej turze 1 kartę mniej → II Zadyszka 2 → III czysto: rywal traci 1 kondycji z paska do końca walki ponad Zadyszkę | **Dystans**: I bez kroku z daleka, szybk. 3 → II trafiony: rywal zostaje Daleko → III po nim Hook Blisko bez kroku |
| **Podbródkowy w żołądek** (nauka 2) | 3 · 1 · 5 · korpus. Ciężki. Zadyszka 2, przerywa zamach. | **Żołądek**: I Skurcz przy trafieniu → II przez gardę połowa → III rywal zgięty: następny twój cios w głowę czysto | **Taran**: I zamach znika → II rywal trafiony traci zapas (0) → III nieblokowalny przez Skorupę |
| **Nerki** (nauka 1) | 2 · 2 · 3+3 · korpus, Blisko. Dwa krótkie, każdy Zadyszka 1. | **Nerki**: I trzeci cios → II każdy daje ciężkie nogi → III 20% na Skurcz | **Klincz i nerki**: I działa też Daleko (wciąga do klinczu) → II rywal w tym takcie nie zablokuje → III +1 obr. każdy |
| **Dobicie** (nauka 2, jedyne) | 4 · 1 · 8 · głowa. Raz na walkę: zamroczony (3+) — nokdaun; przytomny widzi zamach. | **Kat**: I próg zamroczenia 2+ → II przytomny nie dostaje Otwarcia III → III zamach tylko 1 takt | — (jedna ścieżka; druga do zaprojektowania później) |

### Wytrzymałość

| Ruch | Bazowo | Ścieżka A | Ścieżka B |
| --- | --- | --- | --- |
| **Garda** (start) | 1 · obrona. −70% w głowę i w korpus; hook i uppercut kosztują 1 kondycji. | **Żelazna**: I −80% → II hook i uppercut nic nie kosztują → III czysty moment zawsze paruje (Otwarcie I) | **Stara szkoła**: I czysty blok oddaje jab na korpus → II oddaje hak na wątrobę → III oddaje po każdym bloku |
| **Oddech** (zawsze) | 0 · stoisz. +2 karty w następnej turze. | **Drugi oddech**: I +3 karty → II przy pustym pasku na koniec tury: +1 karta → III Oddech zdejmuje 1 zamroczenia | **Spokój**: I trafiony podczas oddechu: −1 obrażeń → II oddech na korpus nie daje Zadyszki → III dwa oddechy w turze: następna tura +1 do paska |
| **Skorupa** (nauka 1) | 1 · obrona do końca tury: −60%; blok dobiera kartę (do 2). | **Forteca**: I rywal płaci 1 kondycji za blok → II trzy bloki: Wybuch (rywal traci takt I) → III −70% | **Żółw**: I Skorupa od drugiego taktu też możliwa → II ciosy na korpus nie dają Zadyszki → III koniec Skorupy: Otwarcie I |
| **Przeczekanie** (nauka 1) | 1 · obrona −40%, +2 kondycji do zapasu, dobierasz kartę. | **Klincz**: I rywal w tym takcie −1 szybk. → II przerywa zamach → III +3 do zapasu | **Wiszenie na rywalu**: I rywal traci 1 kondycji z zapasu → II … i odrzuca kartę → III dwa takty z rzędu |
| **Odepchnięcie** (nauka 1) | 1 · trik. Ciosy z bliska rywala przepadają (Otwarcie I); Daleko, krok pod ścianę. | **Mur**: I rywal pod ścianą przyjmuje +25% → II pchnięcie pod ścianę: ciężkie nogi → III dwa razy w turze | **Bark**: I działa też na ciosy z dystansu → II rywal traci 2 kondycji z zapasu → III pchnięty traci następną kartę |

### Spacerniak (osobne punkty, bez ścieżek na start)

Łokieć, Z byka, Garść piachu, Kciuk w oko — jak dziś. Brudne karty mogą dostać ścieżki później.

## 4. Losowość — urozmaicenie, nie loteria

Zasada: los rozstrzyga **drobne** wahania i **rzadkie** zwroty akcji; każdy rzut widać jako napis nad
zawodnikiem (KRYT!, DRUGI JAB!, ZŁAMANA RĘKA). W typowej walce: 1–2 kryty, 0–1 kontuzja, zwroty co kilka walk.

| Element | Szansa i efekt | Dlaczego |
| --- | --- | --- |
| **Rozrzut obrażeń** | ciosy za 3+ obr.: −1 / 0 / +1 (25/50/25%) | żaden takt nie jest w 100% przewidywalny |
| **Kryt — „czysty strzał”** | 5% na czysty cios w głowę (ścieżki do +20%): ×1,5 obr., +2 zamroczenia. Otwarcie III zostaje pewnym krytem ×2 | ekscytacja bez psucia planu |
| **Podwójne uderzenie** | tylko z ruchów i ścieżek (Szpica III 30%, Raz-dwa III 25%) | nagroda za build |
| **Złamana ręka** | cross/hook w gardę: 6%, w czoło z Otwarciem: 10%. **Ten ruch** jest wyłączony do końca walki (jego karty w ręce stają się raną „Złamana ręka”), a do wyleczenia ma −1 obr. | wyłącza konkretny cios — zmienia plan |
| **Podbite oko** | 3 kryty lub Otwarcia II+ w głowę: rywal pudłuje 15% ciosów tą ręką, a ty nie czytasz jego kart z tej strony | trafiaj w oko, żeby chybiał |
| **Złamany nos** | uppercut z Otwarciem III albo Z byka w zamroczonego: **Oddech daje o 1 kartę mniej** (nie oddychasz nosem), krwawienie z nosa przez 2 tury | kara do dociągania, jak chciałeś |
| **Rozcięcie łuku** | hook 6% (Rzeźnik więcej): −1 zdrowia na turę, dwa rozcięcia — rana „Krew w oku” | bić w ranę |
| **Pęknięte żebro** | hak i prosty na korpus z Otwarciem: 25%: pasek −1, hook i uppercut +1 koszt | korpus się opłaca |
| **Wiotkie nogi** | zamroczenie 6+: odskok +1 koszt do końca walki | zamroczony nie ucieknie |
| **Szczęśliwy cios** | przy zdrowiu ≤25%: twój czysty cios w głowę ma 10% na kryt ×2 | szansa na odwrócenie walki |
| **Mokre płyty** | spacerniak w deszczu, łaźnia: unik i odskok 8% — poślizg, pół uniku | miejsce walki ma znaczenie |
| **Tłum w Wardzie** | 10% na turę: współwięźniowie wpychają przegrywającego z powrotem na środek (zeruje ścianę) | życie celi |

## 5. Rywale: tożsamość, ruch tylko jego i jak go ograć

Od najsłabszego. „Ruch tylko jego” to karta lub modyfikacja niedostępna dla gracza: silna, dopóki jej nie znasz.
Profesor (lista) podpowiada wzorzec; reszta to nauka na własnej skórze i dopasowanie talii.

| # | Rywal | Talia / styl | Ruch tylko jego | Wzorzec | Kontra w talii |
| --- | --- | --- | --- | --- | --- |
| 1 | **Harry „Stary”** (★, ranga 2) | żółw: garda, Skorupa, Przeczekanie | **Stara szkoła** ×2: garda, z której wychodzi hak na żebra | Skorupa w takcie I | Zwód ×2–3, unikać ciosów w gardę, Hak na wątrobę na koniec Skorupy |
| 2 | **Jack „Młody”** (★, 3) | sama głowa: jab, cross, prawie bez obrony | **Szarża**: cross i cross w jednym takcie; w następnym takcie stoi odsłonięty | szarżuje w takcie I | Garda i Unik, cios w takcie po szarży |
| 3 | **Walter „Chudy”** (★, 6) | ucieka: odskoki, jaby | **Odskok z jabem** | odskok co drugi takt | Jab na korpus i Hak na wątrobę (ciężkie nogi), Odepchnięcie pod ścianę |
| 4 | **Bill „Gruby”** (★, 7) | korpus i napór | **Przygniecenie**: pod ścianą ×1,5 obr. i zabiera kartę | pcha dwa razy, potem przygniata | Mijanka, nie odskakiwać, Przeczekanie |
| 5 | **Zeke „Kosa”** (★, 8) | dystans, brudne z bliska | **Kosa** ×2: długi prawy szybki jak jab (3) | Kosa w takcie I | Unik (Otwarcie II) i wejście, Hook z bliska |
| 6 | **Joseph „Siwy”** (★, 8) | kontra, parowanie | **Zawsze drugi**: w takcie II paruje za darmo i bierze Otwarcie III na prosty | zawsze takt II | Zwód albo cios na korpus w takcie II |
| 7 | **Albert „Ciężki”** (★★, 10) | **specjalista od korpusu** | **Młot na wątrobę** ×2: Zadyszka 2, Skurcz, przez gardę połowa; uppercut od progu | uppercut w takcie I, młoty w II–III | Unik czysto pod uppercut (Otwarcie III), własny cios na korpus przerywający zamach, Garda Żelazna |
| 8 | **Reuben „Kruk”** (★★, 12) | napór, jaby | **Dziobanie** ×2 (trzy jaby), a po nim **Ciężka ręka** (cross +3) | dziobanie, potem cross | Garda na dziobanie, Unik na cross |
| 9 | **Silas „Cichy”** (★★, 12) | kontra, czyta karty | **Cicha kontra**: po twoim pustym takcie albo oddechu cross nieblokowalny; łyżka w ustawionej walce | czyta i karze schematy | Zwody, mniej oddechów, nieregularne układy |
| 10 | **Ned „Dym”** (★★, 14) | **prawie sama głowa** + jeden zabójczy cios na korpus | **Dym w wątrobę** (raz na walkę): ×2 obr., Zadyszka 2, garda nie pomaga | zawsze po dwóch ciosach w głowę w jednej turze | Unik czysto albo Odskok w takcie III po dwóch jego ciosach w głowę |
| 11 | **Dan „Głaz”** (★★, 17) | napór, ciężkie ręce | **Lawina** ×2: uppercut bez zamachu | Lawina w takcie I lub II | Unik (Otwarcie III), karty na korpus, żeby opadł z sił |
| 12 | **Szef spacerniaka** (★★★, 20) | wszystko, brudne | **Wyrok** (raz na walkę): przy twoim zdrowiu ≤30% trafienie w głowę to nokdaun; czyta i podmienia kartę | brudne karty na otwarcie, Wyrok na koniec | Zwody, trzymać zdrowie powyżej 30% (Garda, Skorupa), Strefa |

## 6. Kolejność wdrożenia

1. Zapis v7 (kolekcja, talia, ruchy, ścieżki) z migracją v6 i testem; karty głowa/korpus; talia startowa;
   zakładka Talia w karcie postaci.
2. Ścieżki i stopnie ruchów; zamiana perków-kart i nacięć na ruchy i stopnie.
3. Losowość z §4.
4. Rywale z §5 (talie, ruchy tylko ich, wzorce), balans w `scripts/sim-cards.mjs` po każdym etapie.

## 7. Otwarte: obrona przy ukrytych kartach

Symulacja AI kontra AI po etapie 1: talia z samych ciosów wygrywa z zbalansowaną w ok. 70–74% walk, a obronna przegrywa
(ok. 40%). Połowa kart obrony trafia w takt bez ciosu rywala, a udana obrona oszczędza mniej, niż zadałby cios zagrany
zamiast niej. Próby bez efektu: zwrot kondycji za niewykorzystaną obronę, Otwarcie I po bloku, garda na dwa takty.
Do decyzji autora przed etapem 2 (opcje w odpowiedzi w rozmowie z 2026-10-03).
