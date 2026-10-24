# Skin: goła klatka + same spodnie (wzorzec wizualny)

Pliki:
- `skin-bare-chest-trousers.png` — pełna klatka walki (1280×800); lewy bokser („TY”) ma zdjętą kurtkę drelichową.
- `skin-bare-chest-trousers-przed-po.png` — powiększony wycinek: lewo = obecny drelich, prawo = nowy skin.

Co ma być narysowane funkcją (w `drawBoxer()` w `src/boxing.js`, na stawach szkieletu — nie jako sprite):
- Tułów i ręce w kolorze skóry (`R_SKIN`/`R_SKINF`), bez rękawów i koszuli; widoczne piersi, brzuch (jest już mięśniowa definicja dla toru bez ubrania).
- Spodnie jak w gałęzi `PO` (drelich: ciemnoszare nogawki, pasek), ale bez górnej części; spodenki `R_TRUNK` nie są rysowane.
- Owłosienie klatki: kilka ciemnych pikseli w kolorze włosów postaci (`R_HAIR`) na górze klatki, przy mostku, względem `torsoEdge()`; bez zasłaniania linii mięśni.
- Zachować: rękawice/pięści, pozy, IK, rozmiar piksela, kontur.
Wzorzec jest podglądem stylu i proporcji, nie siatką pikseli do skopiowania — małe grid-owe detale (włosy) trzeba dopasować do 144×96.
