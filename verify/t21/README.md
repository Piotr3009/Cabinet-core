# verify/t21 — the proofs for turn 21

Tests: **1618 green** (`npm test`). Build: clean (`npm run build`).
Walk: **35 of 38 steps passed, 0 failed, 3 blocked by this environment.**

| file | what it proves |
| --- | --- |
| `hole-alignment.md` / `.json` | **F1's gate.** Per kit family, per drawer: façade pilot Y vs box-front pilot Y, every Δ = 0. Plus the runner-GLB mounting finding. |
| `walk.json` | The acceptance walk. R1 real CDP input throughout, R4 hardware URLs taken from the app's own registry, R5 the console captured and asserted. |
| `console.txt` | R5 — the whole session's browser console. |
| `context-guard-console.txt` | R5 — the console across twelve editor open/close cycles. |
| `context-guard.md` | **F5.** The `INVALID_OPERATION` finding, the fix, and the twelve-cycle evidence. |
| `bucket-live.md` / `.json` | **R2 / R4.** The URLs the app builds, the one shared derivation, and the environment's refusal, quoted. |
| `cnc-export-identity.md` | The turn's ONLY new CNC class, the one changed probe scenario and why, and the ⌀7.5-not-⌀5 finding. |
| `fingerprints-turn20-baseline.txt` | The baseline, byte-for-byte from `verify/t20/`. |
| `fingerprints-turn21.txt` | This turn. |
| `fingerprints-diff.txt` | The full diff — one changed probe scenario, two added ones. |
| `fingerprints-defaults-diff.txt` | **ZERO LINES.** The golden defaults, unchanged. |

## The screenshots

| file | what it shows |
| --- | --- |
| `1a-drawer-box-on-its-runner.png` | F1 — the drawer box, fronts off, on the runner it rides |
| `2a-hinge-in-the-main-scene.png` | F2 — a door open with its hinges in the room view |
| `3a-flag-off-the-turn-19-look.png` | F3 — the carving retired: no cut faces on any board |
| `4a-modal-beside-the-door-at-240.png` | F4 — the panel 240 px clear of the door, level with the click |
| `6a-drawer-editor-exploded-with-runners.png` | F6 — the drawer editor, exploded, hardware riding its parts |
| `11a-magnet-guide-line.png` | F11 — a real drag caught at the neighbour's height, guide line drawn |
| `12a-three-bay-partition-doors.png` | F12 — the owner's 600/800 three-bay case, three leaves |
| `99-the-room-at-the-end.png` | the room the walk finished in |

## The three blocked steps

All three are one cause: **this session's egress policy refuses the storage
host.** `bucket-live.md` carries the proxy's own answer
(`x-deny-reason: host_not_allowed`). Nothing in this turn rests on a byte from
that bucket, and every claim that CAN be made without it is made:

* the URL the app builds is asserted absolute, host-once, bucket-once;
* the walk fetches **that exact string**, taken out of `window.__cc.hardware`;
* the app never asks its own domain for a hardware model — the owner's 404, at
  the root;
* an unreachable bucket degrades to the stand-in and never to a hole.

## What this turn did NOT ship

**F13, the cornice.** The turn shrinks from the bottom (CLAUDE.md: "F13 → F11 →
F7's pull-out half") and F13 is where it stopped. Nothing of it is half-built:
no profile keys, no parts, no BOM lines, no flag. BLOCKERS carries the ask with
the owner's numbers so it is a turn's work and not a re-derivation.

**F7's pull-out half** is the other declared shrink, and it shipped the way
CLAUDE.md asks for a workshop number that does not exist yet: the option is
VISIBLE, DISABLED, with the reason on it, the enum and the engine switch in
place, and BLOCKERS carrying the ask.
