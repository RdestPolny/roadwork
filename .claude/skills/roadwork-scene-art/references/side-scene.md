# Cień: boczny widok treningowy (144×96)

**Aktualizacja 2026-10-29.** Ten tryb służy Cieniowi / treningowi. Bójki z więźniami są izometryczne (288×192); ich rendering należy do `src/iso-fight.js` i `src/gym.js`.

## Zanim zmienisz grafikę

1. Wejście w Cień, faza i walka treningowa: `src/shadowboxing.js`, `src/sparring.js`.
2. Malowane proceduralnie tło Wardu / żywe efekty: `src/ward-wall.js`; dodatkowa scena: `src/cell-fight-scene.js` **została zarchiwizowana, nie jest importowana w grze**.
3. Wspólny model i animacje: `src/boxing.js`, `src/animation.js`, `src/cast.js`.
4. Główne pomieszczenia w izometrii: `src/ward.js`, `src/exercise-yard.js`, `src/bath.js` — nie mieszaj kodu ich renderowania z bocznym widokiem Cienia.

## Sprawdzanie

- Dla zwykłych pokoi: `node scripts/render-room.mjs --room=yard --times=600,1230 --out=yard`.
- Dla współczesnych bójek izometrycznych: `node scripts/iso-fight-shot.mjs --venue=yard --script='b.step(80); snap();'`.
- `render-room.mjs --fight` jest historycznym interfejsem z czasów walk 2D i nie powinien być podstawową metodą oceny nowej bójki. Nie opieraj nowych zmian na usuniętych `src/newgate-fight.js`, `src/bath-scene.js`, `src/fight-crowd.js` ani HUD kart.
- Przed zakończeniem uruchom odpowiadające testy i przejrzyj zrzut sceny. Wymagania palety ABGR i porządek buforów opisuje `../SKILL.md`.
