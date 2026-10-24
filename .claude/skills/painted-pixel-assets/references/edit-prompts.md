# Edit prompts that worked

Examples come from a treadwheel scene (prisoners in four stalls, two men on a bench, a seated warder with a
lantern); swap the nouns for your scene, keep the structure.

`edit.sh` wraps every change in the same frame (below); only the change text varies. Write the change as what
the picture shows, in plain physical terms, and say what stays.

## The frame (in edit.sh)

> Use your image generation / editing tool (not code) to make ONE edit of the attached image (WxH, a painted …).
> Keep the whole picture identical: the same framing, resolution and aspect ratio, the same people in the same places
> and sizes, the same light, colour grading and painterly realism. Change ONLY this: <change>. Do not add anything
> else, do not move the camera, do not crop. Save the result as `<name>.png` in the current working directory.

## Empty backgrounds (make these first)

- **Empty stalls:** "Remove all four prisoners from the four wooden stalls. Show the empty stalls where they stood:
  the dark wooden back panels, the handrail across each stall and the wooden treads, continuing naturally behind where
  the men were. Keep the warder, the two men on the bench and everything else exactly as it is."
- **Empty bench:** "Remove the two prisoners sitting on the bench in the foreground (bottom left). Show the empty
  wooden bench and, behind where they sat, the wet stone floor and the lower treads and posts, continuing naturally."

## A walk (all figures at once, legs only change)

- "The four prisoners in the stalls are all caught at the same moment of climbing: each has his LEFT leg (the leg on
  the left side of the picture) bent with the knee up and that foot planted on a higher tread, and his RIGHT leg
  straight, carrying his weight on a lower tread. Their upper bodies, arms on the rail, heads, caps and clothes stay
  exactly as they are." — and the mirror for RIGHT.
- Feet together: "… both of each man's feet stand side by side on the same tread, both legs nearly straight, weight
  evenly on both, just before the next step …"

## Whole-figure states

- Resting: "… each leans his weight on his forearms on the rail, shoulders hunched up, both feet lifted off the treads
  with the knees drawn up … Same men, same clothes, same places."
- Hanging: "… each hangs from the handrail by his straightened arms, his body sagging lower in the stall, head dropped
  between the shoulders, legs dangling and dragging on the treads below …"
- Fallen: "… each sits slumped on the floor at the very bottom of his own stall, at the foot of the treads, back
  hunched, head hanging … The stalls above them are empty."

## Idle variants of background people

- Whisper: "the left one turns his head toward the right one, leaning in to whisper to him; the right one tilts his
  head slightly toward him to listen. They stay seen from behind, same clothes, same places and sizes."
- Cold: "hunch against the cold: shoulders drawn up high, arms wrapped tightly around themselves, heads sunk low, shivering."

## A turning head (body must not move)

Say it twice: "Change ONLY the head … His body, arms, lantern, stick and stool must not move. The head stays the same
size and in the same place on his neck, lit the same way: <light direction>." Frames: three-quarters toward the
viewer; facing the camera ("staring straight into the lens, unblinking, expressionless; eyes deep in the shadow of the
cap peak with a tiny pinpoint of lantern light in each pupil"); a warning frame ("same, but his eyes have shifted
toward the LEFT EDGE OF THE PICTURE — toward the stalls, which are on the left side of the image (that is HIS right
side). The pupils must be shifted toward picture-left, not picture-right.").

## Props

- Lantern shut: "The warder's bull's-eye lantern in his hand has its shutter closed: there is no beam of light and no
  glow, the lantern is a dark brass box with a closed front. The warder's head stays in profile exactly as it is."
- Turning machinery (sails, wheels) is better drawn in code; paint the static part out with an edit or by row-wise sky
  fill and keep the bars/frame in front.

## What went wrong before

- Direction words: "glance left" came back looking right three times; name the picture edge and whose side it is.
- Chaining an edit onto a previous edit drifts faster; always attach the original.
- Codex sometimes leaves the file in `~/.codex/generated_images/<session>/` — `edit.sh` checks for the output; if it
  is missing, copy the newest file from there after looking at it.
