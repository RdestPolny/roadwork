# Painted pixel assets w kontekście Roadwork

Skill wymaga: Codex (`edit.sh`), macOS 14+ dla `vmask.swift`, `python3 -I` z numpy i PIL. Ścieżki skryptów: `.claude/skills/painted-pixel-assets/scripts/` (od katalogu projektu).

## Dla czego tak, dla czego nie

- **Sceny i postacie tła (kierat, cela, ward, spacerniak):** zwykły przepływ ze `SKILL.md` — wzorzec, edycje, cięcie, warstwy. Siatka scen to 288×192 (pokoje hubu) i 144×96 (tła walk).
- **Bokser w walce (i `cast.js`: stołówka, siłowanie, łaźnia):** NIE sprite'y. Postać liczy `drawBoxer()` w `src/boxing.js` ze szkieletu stawów + IK (`taper`, `drawLeg`, `drawGlove`) w kolorach z `src/appearance.js` (rampy 3-tonowe, np. `R_SKIN`, `R_HAIR`, `R_PANT`). Wzorzec PNG jest tylko podglądem stylu — agent odtwarza go funkcją rysującą względem stawów, jako nowy wariant obok `PO` (drelich), `workOutfit` (fartuch), `TW` (ręcznik).
- Małe sztywne detale (włosy na klatce, blizny, tatuaże) można zapisać jako mapę znaków przypiętą do stawu, jak głowa w `boxing.js` (ASCII art przy `headX/headY`). Ręce i nogi zmieniają kształt w każdej pozie: z obrazu bierz tylko kolory, grubości i proporcje.

## Zasady projektu (z AGENTS.md)

- Rysowanie bez zmiany sterowania, tempa i balansu; nie edytuj `reference/boxer_heavybag-2.html`.
- Nowy kod zmienia cudzy stan przez operacje właściciela; kontekst zawodnika `F.S` rozszerzaj przez `CONTEXT_FIELDS` w `fighter-context.js`.
- Po zmianach renderowania: `npm test`, `npm run test:browser`, obejrzyj zrzuty. Wyniki wypisuj zgodnie ze stanem faktycznym.
- Nowe warstwy PNG tylko po zgodzie użytkownika: gra jest rysowana kodem (wyjątek: malowane tło walki w celi).

## Praca ze zrzutów gry

Zrzut z `artifacts/` (np. `bareknuckle-cell.png`, 1280×800) jest dobrą bazą do edycji Codexa: ta sama ramka, HUD i przeciwnik. Edytuj `edit.sh` z jedną zmianą, wyniki trzymaj w `art/skins/`. Przykład: `art/skins/skin-bare-chest-trousers.*` (goła klatka + same spodnie, bez wprowadzenia do gry).
