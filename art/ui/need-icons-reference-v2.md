# Needs icons, revision 2

Generated with Codex's built-in ImageGen tool on 2026-10-18, editing `need-icons-reference.png`. Output: `need-icons-reference-v2.png`.

Prompt:
> Edit this pixel-art HUD sprite sheet. Preserve exact layout: THREE circular brass medallions in one horizontal row, same size, same aged brass rims, same soot-dark insets, same transparent background. Change ONLY the symbols INSIDE the first and second medallions. LEFT: replace bread with one clear simplified anatomical human STOMACH silhouette (curved J-shaped organ with short esophagus opening at top, rounded lower sac and small tapered outlet), warm terracotta/rose with ivory highlights and dark brown outline; no food, no other organs, no gore, no face. MIDDLE: replace bunk with the HEAD of a visibly YAWNING tired adult man in side/three-quarter profile, eyes shut in two clear downward arcs, very widely open dark oval mouth, stubbled jaw, short brown hair, neck; warm ivory skin, deep mouth, iconic readable silhouette, no hands, no bed, no letters. RIGHT: keep the soap and water droplets icon completely unchanged. Deliberate chunky square pixel clusters, designed to stay instantly recognizable at 32x32 pixels per medallion. Keep the two replacement symbols large and simple, with strong value contrast against black insets. No text, no letters, no watermark. Preserve transparency.

The first two medallions were cropped to their alpha bounds and sampled onto 32×32 grids, using a shared 32-color palette in `src/need-icons.js`. The original soap pixel map and palette were retained exactly. No change to gauges, thresholds or gameplay.

HUD refinement: segmented rings now surround the medallions (5 hunger segments, 8 fatigue segments, 10 hygiene segments). Visible numeric counters are omitted; accessible meter values retain whole-percentage hygiene, while the saved and simulated value retains its precision.
