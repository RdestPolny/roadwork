## 2026-10-30T08:54:34Z
You are explorer_fisherman_2, a read-only exploration agent.
Working directory: /Users/marcinek/Documents/Roadwork/.agents/teamwork/explorer_fisherman_2/
You MUST read the original approved request at:
/Users/marcinek/Documents/Roadwork/.agents/teamwork/ORIGINAL_REQUEST.md

Your mission:
Investigate animation mechanics, kinematics, and state machine designs for the fisherman, cat, and bucket routines:
1. Examine how characters and NPC routines are currently implemented in Roadwork (e.g. sawmill workers in `src/port-scenes.js`, their kinematic rigs, procedural canvas drawing, state tracking, and deterministic life loops).
2. Design the detailed state machine and visual mechanics for the Fisherman:
   - States: CASTING, WAITING/FISHING (breathing, subtle rod tip sway, line in water), BITE/REELING (rod bends, fish caught), STASHING_IN_BUCKET (placing fish into bucket, fish count + 1), PREPARING_BREAK (setting rod down leaning against pier railing/post), WALKING_TO_PEE (walking animation along pier to distant spot), PEEING (subtle body posture, procedural arc/stream into water, splash on water surface), WALKING_BACK, RETRIEVING_ROD, RESUMING.
   - Timing, tick lengths, transition conditions, and loop cycle duration.
3. Design the detailed state machine and visual mechanics for the Fish Bucket:
   - State: fish count (incremented when fisherman catches, decremented when cat steals).
   - Visual splash effect: purely canvas-based without audio (water ripple rings inside bucket, water drops/splashes, bubbles emerging when fish are in bucket).
   - Visual changes based on fish count (empty bucket vs fish tails/bodies visible inside).
4. Design the detailed state machine and visual mechanics for the Cat and Crate:
   - States: SITTING_OBSERVING (watching fisherman, tail twitching, ear movement), OPPORTUNITY_DETECTED (triggers once fisherman begins walking away to pee), STEALTH_APPROACH (sneaking towards bucket), STEALING_FISH (paw inside bucket, pulling out fish, bucket fish count - 1), SPRINTING_TO_CRATE (running with fish in mouth to crate), EATING_ON_CRATE (chewing/eating animation on top of crate), RETURNING_TO_POST (walking back to original observation post).
   - Timing, coordinates, speed, and animation frames/primitives.

Output requirements:
- Maintain progress in `/Users/marcinek/Documents/Roadwork/.agents/teamwork/explorer_fisherman_2/progress.md`.
- Produce a comprehensive, self-contained handoff report at `/Users/marcinek/Documents/Roadwork/.agents/teamwork/explorer_fisherman_2/handoff.md`.
- When finished, use `send_message` to report completion and summarize key findings back to the orchestrator.
Do NOT modify or create any source code files. You are strictly read-only.
