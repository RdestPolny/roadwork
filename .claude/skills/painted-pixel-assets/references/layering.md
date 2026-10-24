# Layering and animating painted layers

Engine-independent rules for composing and moving layers cut from a reference painting and its edits. A layer is a
picture + soft alpha at a position on the game grid (cut.py's PNG + manifest entry). The one draw operation needed:
paste a layer with an integer offset, an optional clip to a column range, a fade, and `edge` (below).

## Order

1. Static plate: the reference with every moving part's place filled from the empty edits.
2. Things behind the figures that move procedurally (scrolling surfaces sampled from an empty edit, sky, sails).
3. Figures: per figure, either a state layer, or (the moving part from an edit, then the original's static part over it,
   fading out where they meet — e.g. legs from a step edit under the original upper body, faded in below the hips).
4. Occluders the figures move behind, cut as their own layer from the original and drawn after them (a bench's plank
   in front of the two sitting on it). Without one, a bobbing figure opens a gap at the occluder's edge.
5. Foreground figures — whole, including what lies below an occluder, so they move as one — props, characters that
   only turn a head.
6. Dust, light (additive and multiplicative), fog, vignette, breath, HUD.

## Motion

- **Whole-pixel offsets only.** Breathing ±1 px on a slow sine; shivering 1 px sideways a few times a second; a step
  lifts the body 1 px mid-stride; a figure sinking moves its upper part less than its feet (knees bend).
- **`edge`: a layer touching the picture's border stretches its last row/column when moved** — else the border shows a
  1 px gap as it bobs or shivers.
- **Frame choice from the game clock, not a timer.** A climb: feet together for the first ~30 % of a beat after the
  landing, then the foot due next raised. Hard switches; crossfading leg frames ghosts.
- **Crossfade only between whole-figure variants** of background idles (≈8 ticks), fading the original out as the variant
  fades in — a variant drawn over a still-opaque original leaves the original showing as a ghost.
- **Head turns:** original profile, then three-quarters, then the facing frame, switched at fixed points of the turn
  (≈0.3 and ≈0.72); hard switches read as a deliberate, uncanny turn.
- **Falling:** slide the current frame down (accelerating) and fade it out in ≈0.4 s, then show the fallen-state layer.
- **Idle scheduling:** mostly still; now and then one variant for a few seconds (random choice and length), back to still.

## Light on painted layers

The painting already has its light. Add only what moves (a swept lantern beam, a window shaft blinking with turning
sails) and keep it faint where the painting already lights the same spot. Tone curve as a lookup table; the game should
end up at most a little brighter than the painting — measure pixel values against it.

## Checks that caught real bugs

- Layers on magenta (`check.py layers`): background left inside a cut.
- Motion map between consecutive frames (`check.py motion`): a lit rectangle = a layer dragging its background.
- Extreme offsets rendered on purpose (bob −1/+1, shiver) and the picture's border inspected.
- Every state staged in a render and looked at: each pose, each idle variant, each head frame, each prop state.
