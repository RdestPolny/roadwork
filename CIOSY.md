# Ciosy: balans, synergie i drzewka — przegląd i projekt

Stan (2026-10-18): **§2 wdrożone** w `card-data.js` i `card-rules.js` (testy w `tests/card-rules.test.js`, tryb
`wzory` w `scripts/sim-cards.mjs`). §1 opisuje silnik sprzed zmian. Drzewka z §3 czekają na akceptację autora. Ten plan zastępuje ścieżki
A/B z `TALIA.md` §3 dla ośmiu podstawowych ciosów.

## 1. Co jest dziś: diagnoza

Symulacja: gracz układa co turę stały wzór (powtarza go, dopóki starcza kondycji). Ma osiem podstawowych ciosów.
Walczy z AI każdego stylu na poziomie 5, po 300 walk na styl. „Nowy” to ręka, która reaguje na 60% ciosów i trafia
65% uników. „Bierny” w ogóle się nie broni.

| Wzór | nowy | bierny | Uwagi |
| --- | --- | --- | --- |
| Prosty na splot, potem same jaby | **93%** | **90%** | najlepsza strategia w grze |
| Hak na wątrobę, potem same jaby | **92%** | **90%** | to samo |
| Sam jab | 84% | 75% | jeden klawisz wygrywa 3 z 4 walk |
| Miks AI (jak gra rywal) | 67% | 41% | „rozsądna” gra przegrywa ze spamem |
| Jab–cross | 59% | 40% | klasyczne raz-dwa się nie opłaca |
| Uppercut + jab | 53% | 28% | ciężki cios to pułapka |
| Sam cross | **24%** | **13%** | cross nie ma żadnej roli |

Pięć przyczyn, potwierdzonych wyłączaniem po kolei w prototypie:

1. **Zadyszka jest trwała.** Każdy cios na korpus skraca pasek rywala do końca walki, aż do 3 z 5. Działa także przez
   blok (`D.staMax-=n`). Dwa haki na wątrobę zabierają rywalowi 40% akcji na resztę walki. Żaden inny efekt nie
   kumuluje się w ten sposób.
2. **Obrona zawsze kosztuje 1 kondycji, bez względu na cios.** Jab za 1 zmusza AI do bloku za 1. Spam tanich ciosów
   drenuje pasek obrońcy i wygrywa samym wolumenem. To był główny silnik jab-spamu.
3. **Ustawienie jaba łańcuchuje się w nieskończoność.** Jab daje +1 następnemu ciosowi, także następnemu jabowi. Pięć
   jabów to 2+3+3+3+3 = 14 obrażeń. Jab–cross–jab daje mniej, a jab ląduje najszybciej (tempo 1).
4. **Cross nie ma tożsamości.** Ten sam stosunek obrażeń do kondycji co jab, bez efektu, wolniejszy. Każdy inny cios
   coś robi.
5. **Ciężkie nogi nic nie robią przeciw AI.** Zwężają tylko okno uniku, a AI nigdy nie unika. Jab na korpus to
   przeciw AI 1 obrażenie i nic więcej.

Do tego jedyną karą za powtarzanie jest pamięć nawyków AI (+0–20% szansy bloku). To za mało, żeby zmienić wybór.

## 2. Zmiany bazowe (przed drzewkami)

Każdy podstawowy cios dostaje jedną wyraźną rolę i jeden status, który przekazuje dalej. Synergia polega na tym, że
status jednego ciosu wykorzystuje inny cios.

| Cios | Rola | Status / efekt bazowy |
| --- | --- | --- |
| **Jab** | otwiera | **Ustawienie**: następny cios w turze, który *nie jest jabem*: +1 obr. i szansa efektu ×1,5. Cross z Ustawienia: +2. Jab po jabie nic nie bierze, ale odnawia Ustawienie. |
| **Cross** | kasuje | **Przebicie**: blok przepuszcza ¾ (jak ciężki cios). Najlepiej wykorzystuje Ustawienie i Otwarcie. |
| **Hook** | burzy rytm | **Zachwianie**: czysty hook w 25% (× mnożnik efektu) — następny ruch rywala w tej turze przepada. |
| **Uppercut** | otwiera obronę | **Rozbita garda**: trafiony *lub zablokowany* — do końca następnej tury blok rywala zatrzymuje najwyżej 40%, a AI blokuje o połowę rzadziej. Dalej ciężki i przerywalny. |
| **Jab na korpus** | steruje tempem | **Ciężkie nogi**: pozostałe ciosy rywala w tej turze lądują o 1 tempo później (raz na turę). Przeciw graczowi nadal zwęża unik. |
| **Prosty na splot** | trzyma dystans | **Odepchnięcie**: następny ruch rywala z bliska znów musi zrobić krok (+1 tempo). Do tego Zadyszka. |
| **Hak na wątrobę** | wyczerpuje | **Wątroba**: co trzecie trafienie w walce to Skurcz (następny ruch rywala przepada). Do tego Zadyszka. |
| **Podbródkowy w żołądek** | zgina | **Zgięty**: do końca tury następnego ciosu w głowę nie da się zablokować (unik działa). Do tego Zadyszka 2, przerywa zamach. |

Zasady ogólne:

- **Zadyszka działa tylko w następnej turze**, a ciosy na korpus jednej tury się nie sumują: liczy się najmocniejszy
  (zwykle −1, podbródkowy w żołądek i Młot −2). Pasek nie spada przez nią poniżej 3. Na stałe skracają go tylko żebra
  i nos, jak dotąd.
- **Tani cios nie kosztuje obrońcy długu.** Unik albo blok ciosu za 1 kondycji (w kombinacji: za 1 na cios) jest
  darmowy. Dotyczy obu stron.
- **Telegraf**: ten sam skill dwa razy z rzędu w kolejce. Drugi łatwiej obronić: AI blokuje o 40 p.p. częściej, a
  graczowi ring tego ciosu rośnie o 2 tyknięcia.

### Wynik po wdrożeniu

`node scripts/sim-cards.mjs 300 5 wzory nowy` (poziom 5) i `200 10 wzory bierny` (poziom 10):

| Wzór | nowy | bierny, poz. 10 | Najlepszy przeciw |
| --- | --- | --- | --- |
| Wątroba–jab–cross | 85% | 52% | wszechstronny |
| Jab–hook | 81% | 52% | napór (89%) |
| Jab–cross–hook | 75% | 48% | napór |
| Jab–cross | 73% | 52% | napór |
| Uppercut–hook | 73% | 51% | kontra (68%) |
| Sama wątroba | 72% | 32% | najlepszy wzór jednego ciosu |
| Sam hook | 70% | 52% | — |
| Miks AI | 64% | 38% | — |
| Sam cross | 52% | — | — |
| Sam jab | 50% | — | — |
| Sam jab na korpus | 28% | — | — |

Pięć najlepszych wzorów to mieszanki. Najlepszy wzór jednego ciosu (sama wątroba, 72%) jest szósty. Kolejność zmienia
się z ręką gracza i stylem rywala: wolumen przeciw naporowi, uppercut przeciw kontrze. Przy ręce „biernej” pięć
najlepszych wzorów mieści się w 51–52%. Przy ręce „wprawnej” prawie każdy wzór wygrywa ponad 90%. Wtedy decyduje
obrona, a nie kolejka, i to jest osobny problem trudności.

Strojenie po prototypie: Wątroba co trzecie trafienie zamiast co drugie (sama wątroba 77% → 72%), Telegraf +40 p.p.
zamiast +25. Próba „zablokowany powtórzony cios na korpus bez Zadyszki” dała tylko −3 p.p. i została odrzucona.

Skutki uboczne: walki są krótsze (AI kontra AI 6,4 → 5,2 tury), bo obrona kosztuje mniej, a Zadyszka nie dusi do
końca walki. Model gracza „nowy” wygrywa 62–70% zamiast 58–65%. Jeśli to za łatwo, stroić zdrowie albo AI, nie statusy.
Jab na korpus jest za słaby (rola bez obrażeń), a podbródkowy w żołądek słaby. Drzewka mają podnieść słabsze role.

## 3. Drzewka ciosów: 5 poziomów × 2 wybory

Na każdym poziomie wybierasz **jedną z dwóch** opcji, po kolei od I do V. Ścieżka to pięć liter, np. `A-B-B-A-B`;
każdy cios ma więc 32 możliwe buildy.

- **Koszt:** poziomy I–III po 1 punkcie, IV–V po 2 (7 punktów na cały cios). Każdy cios płaci się punktami **swojego
  atrybutu** (w nagłówkach niżej): Szybkość — jab, jab na korpus, hook; Siła — cross, uppercut, podbródkowy w
  żołądek; Wytrzymałość — prosty na splot, hak na wątrobę. Perki atrybutów nie biorą punktów (`PERKI.md`). Przy
  limicie Newgate (ok. 15 punktów na atrybut) domykasz dwa z trzech ciosów Siły i Szybkości oraz oba ciosy
  Wytrzymałości.
- **Drzewka są swobodne** (decyzja autora z 2026-10-18): każdy cios ma własną logikę poziomów, bez wspólnego szablonu.
- **Ciosy słabe wzmacniać mocniej:** jab na korpus i podbródkowy w żołądek dostają mocniejsze poziomy I–II niż hook
  i hak na wątrobę, które już dziś są najsilniejsze w pojedynkę (§2).
- **Zmiana wyboru:** jak dziś build u Profesora (zwrot punktów, prymki).
- **Zasady projektu:** brak bezwarunkowego „+X obrażeń” powyżej +1. Poziomy III–V odwołują się do statusu innego
  ciosu albo do reakcji. Opcja A zwykle wzmacnia rolę ciosu, B przerzuca most do innego ciosu.
- **„Nieblokowalny”** znaczy zawsze: blok i parowanie nie działają, unik działa.

Numeracja: poziom I · II · III · IV · V. Liczby to pierwsze strzały do symulatora.

### Jab (Szybkość) — Ustawienie

| Poz. | A | B |
| --- | --- | --- |
| I | **Mocne ustawienie**: Ustawienie +2 (cross +3). | **Długie ustawienie**: Ustawienie działa na dwa kolejne ciosy. |
| II | **Podwójny jab** (dawny `double-jab`): trafiony jab w 30% dokłada od razu darmowy drugi. | **Celownik**: szansa efektu z Ustawienia ×2 zamiast ×1,5, a cios w głowę z Ustawienia +1 zamroczenia. |
| III | **Miarka** (dawny `vanishing-target`): czysty jab — następny cios w tej turze jest nieblokowalny. | **Żądło**: dwa trafione jaby w turze — najbliższy ruch rywala przepada. Spóźnienie (dawny `sting`) nic nie dawało przeciw AI. |
| IV | **Przerywnik**: trafiony jab przerywa zamach ciężkiego ciosu rywala (raz na turę). | **Kontrjab**: udany unik lub parowanie jaba albo crossa oddaje od razu darmowy jab z Ustawieniem. |
| V | **Raz-dwa-trzy** (zastępuje `one-two-three`): trafione jab i cross, potem hook w tej samej turze — hook +3 obr. i pewne Zachwianie. | **Dyktator**: po trafionym jabie dwa różne trafione ciosy (nie jaby) w tej turze — rywal ma w następnej −2 kondycji i traci inicjatywę. Trzy ciosy wymagały 7 kondycji, więcej niż pasek na poziomie 5. |

### Cross (Siła) — Przebicie

| Poz. | A | B |
| --- | --- | --- |
| I | **Ciężka ręka**: +1 obr. | **Raz-dwa**: cross zaraz po jabie ląduje o 1 tempo szybciej. Taniej o 1 dawało +19 p.p. |
| II | **Pęknięta garda**: zablokowany cross rozbija gardę jak uppercut (do końca następnej tury). | **Kosa**: pierwszy cross w turze ma tempo 1. |
| III | **Egzekutor** (dawny `executioner`): +2 obr., gdy rywal ma ≤2 kondycji. | **Kontra prosta**: cross w turze, w której udanie się obroniłeś: ×1,5 obr. |
| IV | **Ciężka odpowiedź** (dawny `heavy-answer`): czysty cross z Otwarciem albo z Ustawienia dokłada hak na wątrobę. | **Przez środek**: cross, który wyląduje przed zamachem rywala, przerywa go (raz na turę). |
| V | **Nokautujący prosty**: cross z Ustawienia: +2 obr. i +2 zamroczenia, w rywala z Rozbitą gardą +4 zamroczenia. | **Ładowany** (dawny `charged-punch`): cross z Ustawienia albo z Otwarciem przechodzi przez blok i parowanie w całości. |

### Hook (Szybkość) — Zachwianie

| Poz. | A | B |
| --- | --- | --- |
| I | **Krótki hak**: nie robi kroku z dystansu. Do sprawdzenia: hook i tak jest mocny. | **Ciężki hak**: +1 zamroczenia. |
| II | **Rzeźnik** (dawny `butcher`): rozcięcie 20% zamiast 6%. | **Wahadło**: Zachwianie 30% zamiast 25% (było 35%: hook już prowadzi). |
| III | **Hak z obrotu**: hook zaraz po crossie: Zachwianie pewne. | **Podwójny hak**: hook w głowę po haku na wątrobę w tej turze: +2 obr., Zachwianie ×2. |
| IV | **Pod gardę**: zablokowany hook przechodzi w 85% (z pełnym zamroczeniem) i ma 15% na Zachwianie. | **Kontrhak**: po każdym udanym uniku twój hook w tej i następnej turze ma pewne Zachwianie i +2 obr., a w następnej także tempo 1. |
| V | **Na deski**: Zachwianie hooka co najmniej 45%; każde Zachwianie od razu +3 zamroczenia, a kolejne ciosy w głowę w tej turze +2. | **Na krew**: czysty hook rozcina o 55 p.p. częściej; w rozciętego +4 obr. i Zachwianie 60%. |

### Uppercut (Siła) — Rozbita garda

| Poz. | A | B |
| --- | --- | --- |
| I | **Bomba**: +1 zamroczenia. | **Krótki zamach**: tempo 2 zamiast 3 (jak Lawina Głazu). |
| II | **Rozbijacz**: Rozbita garda zatrzymuje najwyżej 25% zamiast 40%, a rywal prawie nie blokuje. | **Spod gardy**: uppercut zaraz po hooku, który przeszedł, przechodzi przez blok (czyste parowanie go zatrzyma). |
| III | **Szok** (dawny `shock`): uppercut z Otwarciem — rywal ma −2 kondycji w następnej turze. | **Wynurzenie** (dawny `duck-launch`): po uniku pod hook rywala uppercut w tej i następnej turze −1 tempo i +2 obr. |
| IV | **Nieprzerywalny**: ciosy na korpus nie przerywają zamachu, a uppercut +3 obr. i +1 zamroczenia. | **Zamach-zwód**: przerwany uppercut zwraca kondycję i daje Otwarcie I; zablokowany albo sparowany też zwraca 3 kondycji w następnej turze. |
| V | **Złamany nos**: czysty uppercut w rywala z zamroczeniem 2+: +2 zamroczenia i złamany nos. | **Rozbita twierdza**: przy Rozbitej gardzie każdy twój cios +2 obr. i +2 zamroczenia. |

### Jab na korpus (Szybkość) — Ciężkie nogi

| Poz. | A | B |
| --- | --- | --- |
| I | **Kłucie**: pierwszy w turze kosztuje 0. | **Twardy brzuch**: +1 obr. |
| II | **Zmiana piętra** (dawny `level-change`): następny cios w głowę o 1 tempo szybciej. | **Opuszczona garda**: następny cios w głowę — AI blokuje o połowę rzadziej, graczowi zwęża się parowanie. |
| III | **Kotwica**: ciężkie nogi w następnej turze — pierwszy ruch rywala ląduje o 1 tempo później (zamach zaczyna się normalnie, więc cios na korpus dalej go przerwie). | **Dławik**: trafiony daje Zadyszkę jak inne ciosy na korpus. |
| IV | **Przerywacz**: trafiony, raz na turę, przerywa zamach każdego ciosu za 2+, nie tylko ciężkiego (bez ograniczeń dawał +21 p.p.). | **Ustawienie z dołu**: daje Ustawienie jak jab (łączy się z drzewkiem Jaba). |
| V | **Kotwiczenie**: dwa trafione w turze — rywal traci ostatni ruch kolejki. | **Mrówka**: czwarte trafienie w walce łamie żebro (raz na walkę). |

### Prosty na splot (Wytrzymałość) — Odepchnięcie

| Poz. | A | B |
| --- | --- | --- |
| I | **Głęboki**: +1 obr. | **Z dystansu**: jako pierwszy ruch tury, z Daleko: +1 obr. i tempo 1. |
| II | **Splot**: Zadyszka 2. | **Stop**: trafiony splot — najbliższy ruch rywala z bliska przepada zamiast się spóźnić. |
| III | **Bez tchu**: trafiony splot — następny twój cios w tej turze jest nieblokowalny. Zakaz ciosów za 3 pomagał rywalowi (−12 p.p.): jego wolne ciosy to darmowa kondycja dla ciebie. | **Na wejściu**: splot, który wyląduje przed ciosem rywala robiącym krok: ×2 obr. |
| IV | **Żebro**: czysty z Ustawieniem lub Otwarciem: 30% na pęknięte żebro. | **Mur**: rywal, który zrobi krok po Odepchnięciu, traci Otwarcie i Ustawienie. |
| V | **Duszenie**: Zadyszka trwa dwie tury. | **Matador**: każdy ruch rywala opóźniony Odepchnięciem daje ci Otwarcie I. |

### Hak na wątrobę (Wytrzymałość) — Wątroba

| Poz. | A | B |
| --- | --- | --- |
| I | **Młot** (dawny `body-hammer`): Zadyszka 2. | **Bez kroku**: o 1 tempo szybszy i wchodzi bez kroku, więc następny cios z bliska też nie traci tempa. |
| II | **Łowca wątroby** (dawny `liver-hunter`, warunkowo): czysty z Ustawieniem lub Otwarciem — Skurcz od razu. | **Przez gardę**: zablokowany też liczy się do Skurczu. |
| III | **Pęknięte żebra** (dawny `cracked-ribs`, słabszy): czysty: 20% na żebro. | **Wątroba–głowa** (zastępuje `finisher`): po nim hook w głowę w tej turze: +2 obr. (most do drzewka Hooka). |
| IV | **Długi skurcz**: +1 obr.; Skurcz zabiera dwa ruchy i daje ci Otwarcie I. | **Piekło**: +1 obr.; po Skurczu rywal ma −2 kondycji w następnej turze. |
| V | **Na kolana**: +1 obr. i Skurcz co drugie trafienie zamiast co trzecie. | **Bez powietrza**: rywal z Zadyszką: twoje hooki i uppercuty w głowę +1 zamroczenia, a zapas nie zdejmuje mu zamroczenia. |

### Podbródkowy w żołądek (Siła) — Zgięty

| Poz. | A | B |
| --- | --- | --- |
| I | **Taran**: tempo 2 zamiast 3. | **Głębiej**: +3 obr. |
| II | **Zgięty wpół**: Zgięty trwa do końca tury, a każdy cios w głowę zgiętego +1 zamroczenia. | **Wyrwany oddech**: jego Zadyszka sumuje się z innymi ciosami na korpus w tej turze. |
| III | **Pod brodę**: uppercut w głowę na zgiętego: +3 zamroczenia. | **Skurcz**: trafiony — Skurcz. |
| IV | **Nieprzerywalny**: ciosy na korpus nie przerywają zamachu. | **Pod żebra**: po udanej obronie (unik albo parowanie) w poprzedniej turze — koszt 2 i tempo −1. Kolejka tej tury jest już opłacona, więc „w tej turze” nie mogło działać. |
| V | **Złamany**: trafienie w rywala z Zadyszką — pewne żebro. | **Przewrót**: zgięty rywal, potem hook w głowę przy zamroczeniu 5+ — nokdaun. |

## 4. Mapa synergii (co z czym gra)

| Otwieracz | Status | Kto go kasuje | Przykładowa tura (5 kondycji) |
| --- | --- | --- | --- |
| Jab | Ustawienie | Cross (+2), Hook (Zachwianie ×1,5), Uppercut | jab → cross → hook (Raz-dwa-trzy) |
| Jab na korpus | Ciężkie nogi, Zmiana piętra | Uppercut (ląduje przed rywalem), cios w głowę | jab dół → uppercut (zamach nie zostanie przerwany) |
| Hook | Zachwianie | Uppercut (rywal nie zdąży przerwać), Spod gardy | hook → uppercut |
| Uppercut | Rozbita garda | Cross, Hook w następnej turze | uppercut → tura 2: jab → cross → hook przez rozbitą gardę |
| Podbródkowy w żołądek | Zgięty | Uppercut i Hook w głowę | podbródkowy → hook (nieblokowalny) |
| Hak na wątrobę | Wątroba, Zadyszka | Hook w głowę (Wątroba–głowa) | wątroba → hook → jab |
| Prosty na splot | Odepchnięcie | przeciw naporowi: twoje ciosy lądują pierwsze | splot → jab → cross |
| Parowanie (reakcja) | Otwarcie I–III | Cross (Ciężka odpowiedź), Uppercut (Szok) | parowanie → cross z Otwarciem |

Kontry stylów, które drzewka mają wzmocnić. Prototyp już je pokazuje:

- **Kontra** (dużo bloku i parowania): Uppercut, Zgięty, Przebicie crossa. Nie powtarzaj (Telegraf).
- **Napór** (mało bloku, ciężkie ciosy): Hook (Zachwianie), jab na korpus (Ciężkie nogi), ciosy na korpus przerywające
  zamach.
- **Dystans**: Prosty na splot, Kosa, Jab.
- **Zrównoważony**: mieszanka; żaden pojedynczy wzór.

## 5. Skutki dla reszty gry

- **Zapis:** `MoveState {path, lvl 0–3}` nie wystarczy. Potrzebne `picks` (do 5 liter A/B). To schemat v10 z migracją i
  testem starego zapisu. Ścieżek nie da się dziś kupić (silnik ani karta postaci nie czytają `path`/`lvl`), więc
  migracja nie traci postępu.
- **Punkty i perki:** perki atrybutów są oddzielone od ciosów (`PERKI.md`). Na poziomach 5, 10 i 15 awans daje Cechę
  (jedna z dwóch), a punkty atrybutu idą tylko na ciosy tego atrybutu. Trening kształtuje styl. W `MOVES` hook
  przechodzi do Szybkości, a prosty na splot, hak na wątrobę i Nerki do Wytrzymałości. W starych zapisach te ruchy
  dostają `gift`. Perki-nacięcia przechodzą do węzłów oznaczonych w §3 jako „dawny …”; punkty za nie wracają w
  migracji v10.
- **AI:** `aiValue` dodaje premię za parę „status → kasujący” (`AI_SYNERGY`: jab → cross, hook → uppercut, podbródkowy
  → głowa, wątroba → hook…) i karę za ten sam skill dwa razy z rzędu (`AI_REPEAT`). Udział par w kolejkach AI wzrósł
  z 28% do 36%, powtórzenia spadły z 19% do 9%, a siła AI w symulacji prawie się nie zmieniła. Rywale mają wybory
  w drzewkach (`RIVALS[...].nodes`): Walter, Albert i Ned zamienili perki na węzły, pozostali dostali 1–5 węzłów
  ciosów swojego stylu. Zmiana wygranej gracza z rywalem tej samej rangi: od +2 do −7 p.p. (Dan po korekcie −2).
- **Interfejs:** statusy (Ustawienie, Zachwianie, Rozbita garda, Zgięty, Ciężkie nogi) jako napisy nad zawodnikiem i
  ikony na osi wymiany, żeby było widać, co który cios przygotował.
- **Symulator:** `scripts/sim-cards.mjs` porównuje style AI i perki, ale nie wzory gracza. Potrzebny tryb „wzory”
  (tabela z §1) i tryb „węzły”: przyrost wygranych z każdą opcją, jak dziś `perks`. Prototyp wzorów leży w scratchpadzie
  sesji.

## 6. Kolejność wdrożenia

1. ~~Zmiany bazowe z §2, testy statusów, tryb wzorów w symulatorze.~~ Wdrożone 2026-10-18. Wzory jednego ciosu
   (sama wątroba 72%, sam hook 70%) nadal przewyższają miks AI (64%), ale żaden nie jest w czołowej piątce.
2. ~~Wdrożone 2026-10-18.~~ Zapis v10 jednym krokiem: `picks` ciosów i `traits` Cech (`PERKI.md` §6), migracja perków ze zwrotem punktów,
   ruchy w nowych atrybutach, pasywna Szybkość. Zakładki drzewek ciosów i Cech w karcie postaci, nowe opisy zamiast
   tekstów z walki na żywo. Przy okazji wdrożone wszystkie 18 Cech (żeby zwrot perków nie zostawił gracza bez niczego);
   węzły ciosów widać w zakładce Ciosy, ale kupuje się je dopiero, gdy działają (`NODE_READY` w `card-data.js`).
3. ~~Wdrożone 2026-10-18.~~ Węzły I–III wszystkich ośmiu ciosów (`nd(f,'jab:1a')` w `card-rules.js`, `NODE_READY`,
   testy w `tests/punch-nodes.test.js` — każdy test pada bez swojego węzła) i `node scripts/sim-cards.mjs 300 5 wezly nowy`.
   Po strojeniu wszystkie poziomy mieszczą się w 5 p.p. od siostrzanej opcji, z wyjątkiem jabu na korpus III
   (Kotwica +5, Dławik +10; w granicy szumu symulacji). Słabe ciosy dostają mocniejsze węzły (podbródkowy w żołądek
   +10–15 p.p.), mocny hook słabsze (+4–6). Szok i Wynurzenie wymagają czystej obrony, więc w modelu „nowy” dają ~0.
4. ~~Wdrożone 2026-10-18.~~ Węzły IV–V wszystkich ośmiu ciosów (80 węzłów razem, każdy z testem, który pada bez niego),
   premie synergii w AI i wybory drzewek rywali. Po strojeniu poziomy IV–V mieszczą się w 5 p.p. od siostrzanej opcji,
   z wyjątkiem jabu na korpus IV (Przerywacz +13, Ustawienie z dołu +6) i crossa V (Ładowany +9, Nokautujący prosty +3) —
   oba na granicy szumu. Węzły przerywające zamach są przeciw AI najmocniejsze, bo AI często kolejkuje ciężkie ciosy.
   Poziomy IV–V hooka, uppercuta i haka na wątrobę (początkowo +0–4 p.p.) wzmocnione: każdy daje +5–8 p.p., rodzeństwo
   w 3 p.p. (`node scripts/sim-cards.mjs 400 5 wezly nowy hook,upper,watroba`). Pod gardę jest czułe na próg: od 85%
   zablokowany hook zaokrągla się do pełnego zamroczenia, i to ono daje większość efektu.
