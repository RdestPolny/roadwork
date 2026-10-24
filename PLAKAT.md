# Styl plakatu — przejście gry z pikseli na wiktoriański plakat

Kierunek: rysowany wiktoriański plakat bokserski (staloryt). Kontur tuszem grubszy po stronie cienia, kreskowanie owijające formę, wąski pas światła odbitego, cienie rzucane, czerwień i ochra lekko przesunięte jak przy złym pasowaniu druku, papier z ziarnem, plamami i zagięciami. Wzorzec: `scratch/plakat/index.html`.

## Zasada wdrożenia

- Gra, animacje, czasy, trafienia, kamera i zapis zostają bez zmian. Nowa grafika rysuje się na tych samych stawach, które gra już policzyła (`F.S`: barki, łokcie, pięści, biodra, kolana, kostki, pięty, palce, głowa), i maluje kadr po zwykłym `present()`.
- `?styl=piksel` zostawia starą grafikę — do porównań i jako zapas, dopóki przejście trwa.
- Moduły plakatu nie zmieniają cudzego stanu; czytają go. Importy nie tworzą płócien (testy w Node).

## Moduły

| Moduł | Odpowiedzialność |
| --- | --- |
| `poster-ink.js` | Paleta, kreskowanie, `part()` (kontur, wypełnienie, cieniowanie), kończyny z profili mięśni, cienie rzucane, gwiazda trafienia. `ink.px` to jednostka kreski (vs/10 na ekranie), `ink.S` to skala figury. |
| `poster-fighter.js` | Zawodnik na stawach: anatomia, stroje więzienne (goły tors, koszula z podwiniętymi rękawami, spodnie z paskiem lub sznurkiem, w łaźni ręcznik i klapki), fryzury i zarost z wyglądu gry. `poseJoints()` daje stawy postaciom w tle. |
| `poster-fight.js` | `posterFightOn()`, `renderPosterFight()`, `syncPosterClass()`: mapowanie stawów przez widok zawodnika i kamerę, kolejność rysowania, gwiazdy trafień (z najazdu kamery), krew złapana przez ubranie (`F.blood`) i na deskach (`bgRing`), cząstki gry, rany z walki kartowej, Cień (duch rywala, Profesor na wózku), napisy gry w drewnianej czcionce, Klasa `body.posterfight` ubiera DOM walki: HUD w czasie rzeczywistym, HUD kart, plansza otwarcia, panel Cienia, wynik. |

## Decyzja 2026-10-24: tła walk zostają pikselowe

Postacie walczące (i ich animacje, krew, rany, gwiazdy trafień, napisy, HUD) są w stylu plakatu, ale tła walk wróciły do oryginalnej grafiki pikselowej: `renderSpar(false)` rysuje pikselowe miejsce (z jego przodem: łojówka, deszcz, kaptur, para) bez pikselowych zawodników, cieni, cząstek i napisów, renderer kładzie je na ekran, a `renderPosterFight` maluje na nich zawodników. Bez nakładki papieru. Plakatowe tła (`poster-venues.js`), papier i plansze z Codexa (`art/plakat/`) zostały usunięte.

## Etapy

1. **Walki w rysowanych miejscach — zrobione.** Spacerniak, Ward (bójka przy posiłku), łaźnia. HUD walki (DOM) bez zmian.
2. **Reszta walki — zrobione.** HUD walki, plansza otwarcia i wynik jako afisze; krew na ubraniu i deskach, krople potu i krwi, ślady ciosów, gwiazdki zamroczenia; rany z walki kartowej (rozcięty łuk, podbite oko, nos, kostki); nokdaun i KO; Cień w celi w stylu plakatu. Walka w celi też jest w stylu plakatu (współwięźniowie przy drzwiach, na pryczy i przy kuble); malowana plansza z obrazu-wzoru zostaje tylko pod `?styl=piksel`.
3. **Pokoje hubu** (izometryczne 288×192: cela, spacerniak, łaźnia, Ward): tła wypalane jak w etapie 1, postacie chodzące w hubie na szkielecie `cast`/`gym`, NPC, światło i pogoda.
4. **Minigry**, każda osobno: pompki, podciąganie, karaluchy, kierat, korba, siłowanie, rzeźnia.
5. **Interfejs**: menu, dialogi, karta postaci, drzewka, ikony — typografia i ozdobniki plakatu w CSS.

Po każdym etapie: zrzuty 1280×800, testy przeglądarkowe zmienionych scen, a na końcu usunięcie pikselowego rysowania tam, gdzie nic już go nie używa.

## Znane braki

- Wydajność: `renderSpar(false)` rysuje samo pikselowe tło, cienie rzucane są przycinane do części, na które padają; walka trzyma 60 kl/s przy gęstości 2×.
- Panel sesji treningowej w rogu Cienia, menu kart i oś wymiany walki kartowej mają tylko podstawową skórkę.
