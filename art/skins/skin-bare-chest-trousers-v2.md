# Skin v2: spodnie, owłosiona klatka i gołe ręce

Wzorzec wizualny: `skin-bare-chest-trousers-v2.png`.
Wygenerowany wbudowanym narzędziem GPT Images jako edycja `skin-bare-chest-trousers.png` zgodnie z painted-pixel-assets.
Obejrzany: lewy zawodnik ma długie ciemne spodnie, odsłonięty tułów z owłosieniem, gołe ramiona i pięści. Generacja zmieniła rozdzielczość całego obrazu, więc nie jest podmianą klatki 1:1.

Wdrożenie: `src/boxing.js` odtwarza wzorzec na istniejącym szkielecie (skóra zamiast koszuli i rękawów, mapa owłosienia przypięta do krawędzi tułowia). `bareTorsoOut()` w `src/sparring.js` wybiera ten wariant dla bohatera w bójkach w celi, na spacerniaku, przy posiłku oraz w Cieniu. Łaźnia używa ręcznika, a widok pokoju, ćwiczenia i praca zachowują swoje stroje. Krew jest zatrzymywana przez spodnie, nie przez odsłonięte ramiona i klatkę. PNG pozostaje wzorcem, nie jest ładowany do gry.

Kolejne poprawki kodu: pięści mają kciuk i kostki obracane względem przedramienia. Przednia noga jest rysowana na wierzchu i jaśniej, tylna używa tego samego materiału przyciemnionego o 14%. Spodnie powstają z ciągłych nogawek bez osobnej nakładki przy biodrach. Zmiany dotyczą skina bohatera w walce i Cieniu.

## Prompt

Use case: identity-preserve. Edit target: the supplied Roadwork pixel-art game screenshot. Create a new main-character skin by editing ONLY the LEFT fighter labeled TY: he wears long dark charcoal Victorian prison trousers and dark shoes, with fully bare torso and arms, bare wrists and bare fists. Clearly readable natural dark chest hair across the upper pectorals and sternum, a little trailing down the midline of the abdomen. Keep the chest hair rendered in tasteful small clusters of dark pixels matching his hair, not a solid black patch. Preserve his exact face, haircut, body proportions, guarded fighting pose, position, skeleton silhouette, and low-resolution pixel-art style with warm skin shading. No shirt, sleeves, gloves, bandages, tattoos or accessories. Preserve the right fighter and ALL background, framing, UI and text exactly. This is a game skin reference in the existing game scene, not a redesigned illustration. Only the left character's skin/clothing details may change.
