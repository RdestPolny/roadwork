# Newgate 1868 — przeniesienie gry do epoki wiktoriańskiej

Kierunek: więzienie Newgate w Londynie, rok 1868. Klimat przed historią: lekki horror, groźnie, brudno. Historyczne
smaczki (kaptury z Pentonville, kierat) zostają, jeśli budują nastrój. Kopia sprzed zmian: `../Roadwork-backup-przed-newgate`.

## Zasady pracy
- Najpierw styl (paleta, materiały, światło, postacie), potem pokoje; każdy pokój: zrzut wyjściowy → 2–3 rundy
  `scripts/render-room.mjs` → logika → test pokoju (`--only`); pełny zestaw i dokumentacja na końcu fazy.
- Klucze zapisu bez zmian (`fajki` w zapisie, „tytoń” w grze). Jedyna zmiana schematu: `canteen` wypada z
  `PRISON_ROOMS` (normalizacja przenosi taki zapis do celi) — z testem starego zapisu.
- Teksty przepisywane według słowniczka (subagent, osobne pliki); grafika pokoi w jednym ręku.

## Styl
- Materiały: piaskowiec w ciosach, ciemna cegła, wapno zjedzone sadzą i wilgocią, mokre płyty i bruk, kute żelazo.
- Światło: ciepły, migoczący łój i gaz kontra zielonoszary smog; dużo ciemności, winieta, para oddechu.
- Postacie: więzień — szorstki kaftan, kamizelka, kaszkiet, bokobrody, kajdany; kaptur z płótna z dwiema szparami;
  dozorca — granatowy surdut, czapka z daszkiem, klucze, kołatka/kij. Walki: bryczesy, szelki, nagi tors.

## Fazy
0. Biblia stylu (paleta, postacie) — razem z fazą 1.
1. Cela → The Ward: guard-bed z siennikami, kadź z kałużą, okno z kratą i okiennicą, wyryte nazwiska i kreski dni,
   kaganek łojowy, smog, szczury, kajdany, kaszel.
2. Spacerniak → The Exercise Yard: studnia z kamienia, kolce i kraty, kręgi z płyt, zakapturzeni w kole, dozorcy
   z kołatkami, mgła; bójka zrywa kaptur.
3. Łaźnia → The Bathhouse: sklepienie, rynny, cynkowe wanny-koryta z przepierzeniami, podest dozorcy, gęsta mgła,
   kinkiety gazowe, mętna woda z kożuchem łoju, odcień karbolu.
4. Bez stołówki: posiłki (chleb, polewka) przez klapę w drzwiach Wardu, miska zamiast tacy, siłowanie na guard-bedzie,
   handel z dozorcą zamiast wypiski.
5. Sceny walk 2D i stroje.
6. Interfejs (afisz, papier, druk) i teksty (słowniczek, nazwiska, karty fabuły: kapelan, dzwon St Sepulchre).
7. Dźwięk: kroki, wiatr w kratach, kołatka, kaszel, łańcuchy, dzwon.
8. Praca więźnia: rzeźnia przy Smithfield (od 2026-10-03 zamiast brygady torowej, która została usunięta). Wolność, sala, dom i bieg zostały usunięte.

## Postęp
- Faza 0+1 (2026-10-02): `src/ward.js` — Ward, kaganek łojowy i smog w `cell-light.js`, stroje (sukienny kaftan, kaszkiet `flatcap`, bokobrody `chops`, chustka `scarf`, kajdany `irons` w `figureHD`). Do akceptacji stylu przed spacerniakiem. Karcer i jego sceny zostały później usunięte.
- Faza 2 (2026-10-02): `src/exercise-yard.js` — spacerniak w kole, kaptury (także bohater w akcie więziennym), dozorcy, mgła. Martwy kod starego podwórka (kosz, drążek, ławki i drut) usunięty w porządkach z 2026-10-03.
- Faza 3 (2026-10-02): łaźnia przebudowana w `src/bath.js` — wanny w boksach, podest dozorcy, gaz, mgła, karbol; bohater kąpie się w wolnej wannie. Scena walki 2D w łaźni jeszcze z prysznicami (faza 5).
- Faza 4 (2026-10-02): stołówka usunięta (`canteen.js`, `canteen-scene.js` skasowane; `canteen` poza `PRISON_ROOMS`, stary zapis wraca do celi). `src/ward-meal.js`: posiłek przez klapę, miska, jedzenie na pryczy, siłowanie ze współwięźniem, handel przez klapę. Bójki przy posiłku (venue `canteen`) mają na razie tło celi. Siłowanie: tło Wardu przy świecy.
- Faza 5 (2026-10-02): sceny walk 2D — `src/newgate-fight.js` (Ward, spacerniak z zerwanym kapturem), `src/fight-crowd.js` (widzowie przodem), łaźnia w `bath-scene.js`; podciąganie na kracie okna, pompki na starych gazetach w Wardzie. Usunięte stare tła walk w celi i na spacerniaku (`cellRingBack`, `yardRingBack`). Światło i mgła tylko za walczącymi (czytelność, plamy krwi).
- Faza 6 (2026-10-02): interfejs „Afisz i sadza” (`styles.css`: IM Fell English SC, Old Standard TT; karta fabuły jako afisz z podwójną ramką, inicjałem i czerwoną pieczęcią) i teksty aktu więziennego (słowniczek, angielskie nazwiska, karty Newgate, `fmtMoney` w szylingach i pensach; tabela nazwisk w `PRISON.md` §14). Spacerniak: więźniowie wloką się zgarbieni (`npcs.js`, `WALK_SP`).

- Porządki (2026-10-03): dom, siłownia, budowanie, sklep, monety, dawne treningi sprzętowe, bieganie i roadwalk usunięte. Karty są domyślne; stary system walki na żywo jest w kopii poza Roadwork. Pozostają Newgate, ćwiczenia więzienne, wspólny szkielet i rzeźnia jako prototyp. Zmiana głównego buildu korzysta z tytoniu; stare zapisy wracają do Wardu z zachowaniem postępu.
- Malowany Ward (2026-10-17): `scripts/ward-plate.py` → `src/ward-plate.js` — obraz z meblami bez ludzi (edycje Codexa z `art/ward/paint.png`, wózek Profesora, kadź i beczka), dopasowany skalą do siatki izo gry; kadź, beczka, wózek i skrzynia mają maski Vision i zasłaniają stojących za nimi. Światło obrazu w `cell-light.js` (`paintedLight`), lampa nad drzwiami jak na obrazie.
