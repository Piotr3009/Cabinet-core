# CLAUDE.md — TURN 29: the eye's two catches, two new laws, and the hinge folds

Turn 28 shipped eleven phases; the owner walked them. Nine passed his eye. Two
did not — their tests were green and the picture was wrong, which is the exact
failure this project keeps relearning: **a passing test that asserts the wrong
surface proves nothing**. This turn fixes what the eye caught, adds two laws he
asked for while walking, and mounts the hinge fold whose axis was measured and
render-verified overnight (report in the repo's chat history; data below).

Read the whole file first. Full autonomy, zero questions. The turn shrinks
from the BOTTOM (F5 first, then F4); F1 and F2 never shrink.

Baseline: main after PR #28 merge. Iron rules R1–R12 stand.

## F1 [CRITICAL] — SHELF GRAIN IN 3-D, THIS TIME ON THE SHELF THE EYE SEES

The owner, on turn 28's F7: *"na wizualizacji nie działa, na CNC było ok"* —
with a screenshot: open carcasses, wood-decor shelves, and the grain running
LEFT–RIGHT across every shelf. The sheet has been right since turn 26 F8
(frame turned, `scanAlongGrainMm` front-to-back); the SCENE still paints the
texture across.

Turn 28's F7 test passed while the picture stayed wrong, so first find what
that test actually asserted, and make the new one assert the SURFACE: the
mounted material/UV of a SHELF's top face in the live scene, not a flag on the
way to it. The law: a decor shelf's grain runs FRONT-TO-BACK (along depth),
matching its own sheet; edge banding stays on the long front edge. Suspects:
`decorPlacement` → `materials.js` texture rotation for `role === 'shelf'`,
and `panelSolid`'s UV frame for horizontal boards — the fix belongs where the
scene reads it, not a second flag beside the first.

Proof: the owner's own arrangement re-built (two open base units, decor
shelves) — screenshot where the grain VISIBLY runs front-to-back on every
shelf, plus the mounted-material read in `measurements.json`. Before/after
pair mandatory.

## F2 [CRITICAL] — THE DIMENSION LANGUAGE, THE TWO HALVES THAT DID NOT LAND

The owner on turn 28's F8: front-label positions are right (*"pozycja frontów
pokazuje się dobrze, odsunięte od plusików — super"*) — DO NOT TOUCH those.
Two halves failed:

1. **The 100 never appeared.** *"nie ma 100, plinthu nie pokazuje"* — the
   base unit's vertical chain still reads a single 770. The law (28-F8.1,
   restated): TWO segments on ONE vertical line — `100` (plinth, stop arrows)
   below, `770` (carcass, stop arrows) above. If turn 28 wrote this into a
   path the "show dimensions" walk never draws, move it to the path the eye
   sees.
2. **Every cabinet still dimensions itself.** *"nadal pokazuje na każdej
   szafce"* — a run of identical units carries its W (and the 100+770 pair)
   ONCE, on the outermost unit of the run. An end panel does NOT break the
   run; a different cabinet does.

Same discipline as F1: find what turn 28's f8 test asserted, then assert the
LIVE chain set — count the labels in the mounted scene for a three-identical
run (expect ONE 600, ONE 100, ONE 770 for the run) and for a mixed run
(expect the break). Screenshots for both, before/after.

## F3 [HIGH] — THE D/W'S FRONT AND PLINTH JOIN THE STANDARD CONTROLS

The owner: *"front i plinth powinien być tak samo włączany jak cała reszta
szafek, tymi samymi przyciskami."* Turn 28's F1 hard-wires both. The law: the
D/W type uses the SAME UI controls every other unit uses — the front
add/remove control and the plinth toggle — with turn 28's composition as the
DEFAULTS (front on, plinth on). Switching them off removes the piece from the
scene, the sheets and the BOM exactly as it does on a BUD; the TOP rail is
the only fixed piece. `interiorOccupied` and the drop-45° behaviour of the
front, when present, stay as they are.

Proof: the walk toggles both off and on again on a D/W; BOM and sheet
census follow each state; screenshots.

## F4 [HIGH] — DIMENSION TYPOGRAPHY: A THIRD BIGGER, HALF THE WEIGHT

The owner, verbatim: *"napisy troszeczkę za małe — jakby były o 30% większe
ale o połowę mniej tłuste na tych wymiarowaniach wszędzie, to by było super."*
One place (R11 — `DimensionChain` owns every label): font size × 1.3, font
weight halved (the flat T25 face is bold-ish mono; drop to a regular/light
cut of the SAME family), everywhere a dimension speaks — chains, ladders,
front labels, the live drag readout. Nothing else about the plate changes:
same dark plate, same ink, same layout laws from turn 28 F8.3/F8.4.

Proof: before/after pair on the owner's eye-test kitchen; a measurement of
the rendered label height confirming ×1.3.

## F5 [HIGH] — THE HINGE FOLDS ABOUT ITS MEASURED AXIS

The fold rig was measured and render-verified overnight (assistant's own lab,
outside turns). The numbers are FINAL — do not re-derive them:

- file: `71B3550_42542984.glb` (bucket `hardware/hinges/blum/`), metres
- member split (turn 24's contract, confirmed byte-for-byte):
  CUP rides the door = `bau0015089612`, `bau0015088783`, `bau0015088853`;
  ARM stays at the plate = `bau0015088251`, `bau0019416036`
- fold axis: the Y-parallel line through **x = −0.01808, z = +0.04286** (m),
  direction **+Y**, **+θ opens**, range 0 → 110°
- mechanics (proven in the lab): pivot group at (PINx, 0, PINz); cup
  reparented with offset (−PINx, 0, −PINz); `pivot.rotation.y = θ`
- hand: the file is `fileHand:'R'`; an L door mirrors the WHOLE assembly and
  the axis mirrors with it (x → −x) — apply the fold BEFORE the hand mirror
- θ comes from the door the hinge sits on: turn 24's `doorSwing`
  (`dir × open × swing`) already crosses the leaf's angle to `Hardware.jsx`;
  the cup member follows the LEAF (as today), the ARM member now folds
  relative to it about this axis — closed door = 0°, "Open all" = the leaf's
  own angle, capped at 110

R8 stands: the Code sandbox cannot reach the bucket, so the walk runs on the
SILENT SHOWROOM's synthetic two-member GLB — build the synthetic hinge WITH
the same node names and a pin at the same model-space point, so the rig math
is asserted for real (mounted world positions of both members at 0/45/110 on
both hands). The true-GLB visual check happens in chat after the merge — say
so in the README rather than pretending.

Proof: scene-graph reads at 0/45/110 for an L and an R door (arm stays at
the plate, cup lands on the leaf, knuckle point coincides within 0.2 mm),
screenshots of a door mid-swing with the hinge visibly folded, console clean.

## OUT OF SCOPE — parked for turn 30

The editor's bottom-right LAYER LEGEND (the owner may want it gone too — his
answer pending), "edycja wszystkich elementów" (owner's parked topic, needs
its own conversation), CAD tools for the part editor, per-tenant layers, LIFT
kits, tray side height, 173L plate pattern.

## THE WALK AND THE PROOFS

`verify/t29/`: the acceptance walk under R1–R8, `walk.json`, `console.txt`,
`measurements.json`, before/after pairs as named per phase, fingerprint +
probe pairs against this baseline (expect ZERO CNC deltas this turn — every
phase is scene/UI; say so and prove it), full suite green from
`rm -rf node_modules && npm install`, never `--silent`. Proof screenshots
must SHOW THE SUBJECT — turn 28's 2a/2b missed theirs; a frame that does not
contain the thing it names fails the phase.