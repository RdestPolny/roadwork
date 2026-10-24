# Pocket watch HUD

Generated with Codex's built-in ImageGen tool on 2026-10-18. Reference: `pocket-watch-reference.png`.

Prompt:
> Use case: stylized-concept. A reference design sheet for a pixel art Victorian pocket watch HUD asset for Roadwork, grim historical prison boxing game London 1868. Single front-facing old brass pocket watch with small winding crown and loop, aged ivory dial, twelve simple dark hour indices, no hands (added in game), worn bronze stepped bevel with warm gold highlights, deep brown outline. Beside watch a small narrow blackened brass plaque with two amber brass circular action tokens inset. Cohesive restrained pixel art, chunky deliberate square pixel clusters equivalent to a 64x80 pixel sprite, hard edges no antialiasing, readable small UI silhouette. Centered isolated on flat dark charcoal background. No words, no numerals, no watermark. Design reference not game screenshot.

The watch silhouette was sampled onto a 48×62 grid in 24 colors and baked into `src/pocket-watch.js`. No runtime image loading: the live hands are drawn on the same pixel grid. Actions are two brass tokens beside the watch, filled for available actions and dark for spent ones.

`simulation.simUI()` derives the displayed time from phase and spent actions: morning 08:00 → 11:00, noon 14:00 → 16:30, evening 19:00 → 21:30. Spending the second action retains the existing phase transition. This is an orientational clock for the action schedule; it does not change lighting, needs, deadlines, action costs or saved time. In developer mode the watch shows the chosen scene time instead.
