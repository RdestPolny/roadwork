# Karaluchy na ścianie — trening pięści o ścianę celi

Nowe ćwiczenie w Wardzie. Widok z oczu bohatera: na wprost ściana celi oświetlona kagankiem łojowym. Na ścianie leży
cień zaciśniętej pięści, który prowadzi mysz. Klik albo Spacja wysyła cios w miejsce cienia. Przez ścianę przebiegają
karaluchy. Celem jest zabić ich jak najwięcej przed końcem sesji. Pudło oznacza gołe kostki na kamieniu: ból, drżenie
ręki i chwilę przerwy.

Styl, rozdzielczość (144×96) i sposób renderowania są takie jak przy podciąganiu na kracie: wypalone tło z mapami
na każdy piksel, oświetlenie liczone w każdej klatce, bez obrysów i bez ikon w świecie gry.

**Światło jest wyłącznie klimatem.** Płomień migocze i ożywia fakturę ściany, ale nie wpływa na rozgrywkę. Cień pięści
to po prostu celownik w formie cienia. Nie ma wabienia cieniem, cykli przygasania ani przeciągu przesuwającego cel.

---

## 1. Fantazja i ton

Noc w Newgate. Więzień trenuje szybkość ręki i odporność na ból, a jedyny przeciwnik to robactwo. Ćwiczenie jest
ciche, napięte i trochę obrzydliwe. Trzy zasady odczucia:
1. **Cień jest celownikiem.** Na ekranie nie ma kursora.
2. **Każde uderzenie trafia w kamień.** Trafienie jest miękkie: chrupnięcie, lepka plama, mały ból. Pudło jest twarde:
   głuchy stuk, pył z wapna, syk przez zęby, krew na kostkach.
3. **Ręka ma wagę i czuje ból.** Cień nie przykleja się do myszy, a z bólem coraz bardziej drży.

---

## 2. Pętle rozgrywki

### Mikro (1–3 s): wypatrz, wyprzedź, uderz
1. Słychać szelest, z krawędzi albo ze szpary wybiega karaluch.
2. Gracz prowadzi cień na jego drogę, z wyprzedzeniem, bo karaluch biegnie.
3. Cios: cień kurczy się i wyostrza w punkcie styku (czysta animacja), pięść wjeżdża od dołu kadru.
4. Trafienie to plama i drgające nogi. Pudło to ból, cooldown, a karaluch biegnie dalej.

### Sesja (60–80 s)
- Karaluchy pojawiają się falami: na początku pojedynczo, potem gęściej, a pod koniec po kilka naraz.
- Czas pokazuje licznik sesji. Kaganek stoi za plecami bohatera, poza kadrem. Na koniec płomień gaśnie, jest
  ciemno i słychać już tylko szelest. To czysta oprawa, bez wpływu na grę.

### Makro: miejsce w grze
- Stacja w Wardzie: **ściana z wyrytymi nazwiskami przy pryczy**. Menu jak przy podciąganiu:
  `Karaluchy na ścianie · stopień II · ogarek · 1 akcja` oraz przełącznik stopnia.
- Sesja zamknięta z oceną S–D, stopniami I–V, świeżością dzienną i XP przez `training-session.js`.
- Drzewka: **65% szybkość, 25% wytrzymałość, 10% siła**.

---

## 3. Sterowanie i odczucie ręki

| Wejście | Działanie |
| --- | --- |
| Ruch myszy | prowadzi cień pięści (w kanwie systemowy kursor jest schowany) |
| LPM / Spacja | cios w miejsce cienia |
| Strzałki / WASD | celowanie z klawiatury, z przyspieszeniem |
| Dotyk | przeciągnij, żeby celować, i puść, żeby uderzyć |
| Esc | pauza (sesja się nie resetuje) |

**Waga ręki:** cień goni punkt docelowy jak sprężyna z tłumieniem: ~70 ms opóźnienia i 1–2 px przestrzelenia przy
szybkim ruchu. Poziom szybkości zmniejsza opóźnienie. Ból dokłada drżenie o amplitudzie 0–3 px. Oddech kołysze cień
o ±0,5 px.

**Cios krok po kroku (60 Hz):**

| Faza | Klatki | Co się dzieje |
| --- | --- | --- |
| Wyjście | 6–8 (zależnie od szybkości) | cień kurczy się ze skali ~1,3 do 1 i wyostrza, pięść wjeżdża od dołu kadru |
| Styk | 1 | rozstrzygnięcie trafienia |
| Hit-stop | 4 (trafienie) / 6 (pudło) | zatrzymanie świata, potrząs 1–2 px, pył |
| Powrót | 10 | pięść cofa się, cień wraca do zwykłego rozmiaru |
| Cooldown po pudle | 70–150 | ręka strzepnięta i drżąca |

Kolejny cios można wcisnąć wcześniej, w ostatnich 4 klatkach powrotu (bufor).

---

## 4. Ból i cooldown

Ból `B` (0–100) nie jest pokazany jako pasek. Czyta się go z ekranu i z dźwięku.

| Zdarzenie | ΔB | Cooldown |
| --- | --- | --- |
| Trafienie w środek karalucha | +1 | — |
| Trafienie brzegiem (nogi, czułki) | +3 | — |
| Pudło na wapnie / zaprawie | +12 | 70 klatek |
| Pudło na lico cegły | +18 | 100 klatek |
| Pudło w żelazne ucho na kajdany | +30 | 150 klatek, krzyk przez zęby |
| Spadek | −2/s stale, −5/s, gdy ręka odpoczywa ≥1 s | |

Progi:
- **30+**: zaczerwienione kostki widoczne przy styku, lekkie drżenie.
- **60+**: krwawe ślady kostek na ścianie w miejscach pudeł (do końca sesji), winieta pulsuje w rytm serca, słychać
  bicie serca.
- **90+**: cooldown po pudle ×1,5, mocne drżenie, cichy pisk w uszach po każdym pudle. Sesja trwa dalej.

Pudło kosztuje ból i czas, a w tym czasie karaluch ucieka. Dlatego klikanie na ślepo się nie opłaca.

---

## 5. Karaluchy: po prostu przebiegają

Każdy karaluch ma **trasę przez ścianę**: wejście z krawędzi kadru albo ze szpary, kilka punktów pośrednich
i wyjście (inna krawędź albo szpara). Biegnie po niej realistycznie:
- zrywy z lekkim wężykiem, krótkie zatrzymania (0,2–0,8 s, z ruchem czułków) i nagłe zmiany kierunku na punktach
  pośrednich;
- jeśli dobiegnie do wyjścia, znika i nie dostaje się punktu;
- po pudle tuż obok przyspiesza (spłoszony podmuchem) i skręca w stronę najbliższego wyjścia.

Nie ma stanów ukrywania, wabienia ani żerowania. Ruch i rysowanie bazują na `roachTick`/`drawRoach`
z `pullup-scene.js`.

### Rodzaje (różnią się tylko wyglądem, prędkością i punktami)
| Rodzaj | Wygląd | Bieg | Punkty |
| --- | --- | --- | --- |
| **Czarny** (karaczan wschodni) | 8×4 px, ciemny, matowy połysk | wolny, często staje | 1 |
| **Prusak** | 6×3 px, jasnobrązowy, dwa ciemne pasy | szybki, rzadko staje, od stopnia II | 1 |
| **Nimfa** | 4×2 px, prawie przezroczysta | chaotyczne zygzaki, od stopnia III | 1 |
| **Duży rudy** | 10×5 px, jasna tarcza | bardzo szybki, prosto przez ścianę, od stopnia IV | 3 |

### Trafienie
Strefa styku to rząd czterech kostek, ~5×3 px wokół środka cienia.
- **Środek** (pokrycie ciała ≥ 60%): zgnieciony korpus, kremowo-żółta mokra plama, nogi drgają jeszcze 2–3 s.
  Liczy się jako *czysty*.
- **Brzeg**: karaluch kuleje dalej wolniej. Drugi cios go dobija, a jeśli ucieknie, nie dostaje się punktu.
- **W biegu** (prędkość > 0,6 px/klatkę w chwili styku): +50% punktów.

---

## 6. Ściana i klimat (styl jak przy podciąganiu)

**Tło wypalane raz** (`buildRoachBackground`), z mapami na każdy piksel: wysokość/normalna, rodzaj powierzchni
(wapno, cegła, zaprawa, szpara, żelazo, ryt), wilgoć i sadza.
- Cegła w nierównym wątku, miejscami spod zjedzonego wapna. Zacieki wilgoci, sadza.
- Wyryte nazwiska, daty, krzyże i kreski dni (jak w izometrycznym Wardzie, na przykład „J. HOLLIS 1866”).
- 4–6 szpar (wejścia i wyjścia karaluchów), żelazne ucho na kajdany z rdzawym zaciekiem (pułapka bólu), stary gwóźdź.

**Światło co klatkę, tylko dla nastroju:** ciepły płomień łoju nisko z lewej z delikatnym migotaniem (fbm), które
porusza cienie w fakturze cegły i rytach. Spadek światła z odległością i głęboka winieta. Jasność zostaje w wąskim
zakresie, więc czytelność się nie zmienia.

**Cień pięści:** gotowa sylwetka pięści z przedramieniem (rękaw kaftana, kostki, kciuk), miękka krawędź i stała
skala, a przy ciosie animacja kurczenia i wyostrzenia. Lekko przyciemnia karaluchy pod sobą, ale nadal je widać.

**Reszta:** chityna z odblaskiem płomienia, mały cień kontaktowy pod karaluchem; pięść w kadrze tylko w chwili ciosu
(pole wysokości jak ręce przy podciąganiu, czerwone i starte kostki przy bólu); kurz w powietrzu, para oddechu,
pył wapienny po uderzeniu.

**Stan ściany w trakcie sesji:** plamy po karaluchach (świeże błyszczą, potem matowieją), krwawe ślady kostek,
odpryski wapna.

---

## 7. Dźwięk

Silnik ma dziś tylko syntezę tonów. Potrzebny jest bufor szumu z filtrem w `audio.js`.

| Zdarzenie | Brzmienie |
| --- | --- |
| Szelest | szybkie ciche tyknięcia szumu, panoramowane według x karalucha, głośniejsze przy większej liczbie |
| Trafienie | trzask chityny (klik i wysoki szum) z mokrym ogonem, pod spodem miękki stuk |
| Pudło | głuchy stuk (~80 Hz), chrupnięcie wapna, syk przez zęby. Na żelazie metaliczne „dzyń” |
| Płomień | stałe ciche skwierczenie |
| Ciało | oddech (przyspiesza z bólem), bicie serca od 60, pisk w uszach od 90 |
| Tło Newgate | kapanie, kaszel zza ściany, daleki brzęk kluczy |

---

## 8. Stopnie I–V

| Stopień | Czas | Cel (punkty) | Maks. naraz | Rodzaje | Prędkość |
| --- | --- | --- | --- | --- | --- |
| I | 80 s | 12 | 3 | czarne | ×1,0 |
| II | 75 s | 16 | 4 | + prusaki | ×1,1 |
| III | 70 s | 20 | 5 | + nimfy | ×1,2 |
| IV | 65 s | 25 | 6 | + duży rudy | ×1,3 |
| V | 60 s | 30 | 7 | wszystkie | ×1,45 |

**Metryki sesji:** `kills`, `points`, `strikes`, `misses`, `clean`, `moving`, `painMax`.

```
quality  = 0.6·(kills/strikes) + 0.25·(clean/kills) + 0.15·(1 − painMax/100)
complete = min(1, points/goal)
```

Ocena, XP, świeżość i odblokowywanie stopni przez `sessionScore`/`sessionXP` bez zmian. Bonus: każde 5 trafień
pod rząd bez pudła daje +2 s (`sessionAddTime`).

---

## 9. Chwile horroru (rzadkie)

- **Z nazwiska.** Kilka prusaków wybiega jeden za drugim z wyrytego rowka litery.
- **Stado.** Raz na kilka sesji przez ścianę przebiega naraz kilkanaście karaluchów. To duża szansa i duży stres.
- **Po zgaśnięciu.** W ostatniej sekundzie ciemności, przy najlepszym wyniku dnia, zza ściany słychać trzy
  stuknięcia.

---

## 10. Podsumowanie sesji

Karta w stylu afiszu: zabite (czyste, w biegu), pudła, najdłuższa seria, ból maksymalny, ocena i XP. Do tego jedno
zdanie zależne od wyniku, na przykład „Kostki starte do krwi. Ściana pamięta.”

---

## 11. Wdrożenie (2026-10-14)

- `src/roach-rules.js`: czyste reguły (rodzaje, styk kostek, koszt pudła, punkty), test `tests/roach-rules.test.js`.
- `src/training-data.js`: drill `roach` (stopnie z §8). `train.stage` przyjmuje dowolny identyfikator, więc schemat
  zapisu się nie zmienił.
- `src/roaches.js`: tryb (ręka ze sprężyną, cios, ból, cooldown, trasy i fale karaluchów, dźwięki, wskaźnik nad
  kanwą tylko w `gstate==='roach'`).
- `src/roach-scene.js`: ściana jako mapa wysokości oświetlana co klatkę kagankiem z tyłu po lewej, cień ręki
  z łokciem (bark pod kadrem; wysoko ramię się prostuje, nisko zgina; poza zasięgiem bark idzie za pięścią) i pięści
  (SDF z półcieniem), karaluchy, plamy, pył, krew, pięść w kadrze podczas ciosu. Karaluchy mają
  tu własne rysowanie (większe, z tarczą i połyskiem); scena podciągania zachowuje swoje bez zmian.
- `src/audio.js`: szum z filtrami (`sfxSquash`, `sfxKnuckle`, `sfxHiss`, `sfxSkitter`, `sfxHeart`, `sfxCrackle`, `sfxGaol`).
- `src/boxing.js`: operacje `setGstate` i `shake`.
- Ward: stacja `croach` przy wyrytym GOD HELP ME nad pryczą (`ward.js`, `rooms.js`, `gym.js`, `prison.js`).
- Podgląd: `node scripts/render-room.mjs --room=cell --mini=roach --fight=3:60 --out=rw`; scena w devtools „Trening: Karaluchy”.
- Test przeglądarkowy: `npm run test:browser -- --only=roach`.

## 12. Pytania otwarte
- Czy sesja zakończona z bólem 80+ ma dawać „zdarte kostki” na następną bójkę? To zmiana balansu, domyślnie wyłączona.
- Czy plamy i krew mają zostawać na ścianie w izometrycznym Wardzie do końca dnia? Wymaga to pola w zapisie
  z migracją albo wyliczenia z `train.count`.
