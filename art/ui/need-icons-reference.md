# Needs HUD icons

Generated with Codex's built-in ImageGen tool on 2026-10-18. Source sheet: `need-icons-reference.png` (transparent background).

Prompt:
> Use case stylized-concept. Asset type: ONE cohesive pixel-art HUD sprite sheet for Victorian prison boxing game Roadwork, London 1868. Exactly THREE equally sized isolated circular brass medallion icons arranged in a single horizontal row, equal spacing, full silhouettes entirely inside each third of the sheet, generous transparent margins, no text. Left medallion: coarse brown bread loaf with one cut slice, hunger. Middle medallion: simple Victorian wooden prison bunk bed, straw mattress and folded beige wool blanket, fatigue/rest. Right medallion: ivory soap bar and two clear pale blue water droplets, hygiene. Each has same worn brass circular stepped rim, soot-black inset, carved ivory and ochre pixel-art objects, convincing tiny material highlights, warm gold upper-left lighting, dark bronze shadows. Chunky crisp square pixel clusters, intended native size 32x32 per medallion, readable small symbols, restrained historical palette matches an aged brass pocket watch. Front view, flat sprite sheet, consistent scale, no perspective scene, no other objects, no lettering, no numbers, no watermark. Genuine transparent background.

Each third of the image was cropped to its alpha bounds, padded to square, sampled onto a 32×32 grid and reduced to one shared 32-color palette. `src/need-icons.js` contains the resulting pixel maps; there is no runtime image request.

`simulation.simUI()` owns the right-side needs HUD, using existing saved needs and gameplay thresholds. Hunger fills 0–5, fatigue fills 0–8, hygiene fills 0–100. Captions show existing combat penalties. Red/amber states also have text, independent of color. Needs are grouped at the right of the clock. On narrow screens the three gauges form a row beneath the clock. HUD needs hide outside exploration and during dialogue.
