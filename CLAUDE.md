# CLAUDE.md — TURN 28: the owner's list, eleven items long

A BIG turn, deliberately, and overnight. The owner walked turn 27 with his own
eyes and came back with a list; this file is that list, in his order. Read the
whole file first. Full autonomy, zero questions. Clean or not at all; the turn
shrinks from the BOTTOM (F11 first, then F10, and so on — F1 and F2 never
shrink).

Baseline: main after the 12.08 chat fix (`shoulderDepth` 13 and the sink BUR
shelf-column mirror are already on main, with their fingerprints frozen in
`test/cnc-export-identity.test.js` — do not re-derive them).

## 0. IRON RULES

Turns 1–27 stand: R1 real CDP input, R2 live bucket, R3 verbatim manifests,
R4 URLs from the app, R5 console captured, R6 a React exception fails the
step, R7 no DOM attributes on R3F objects, R8 the silent showroom, R9 no
feature without its part, R10 the sheet is the truth, R11 one dimension
component, R12 extend means extend.

## F1 [CRITICAL] — THE DISHWASHER IS A FRONT, A RAIL AND A PLINTH

The owner, verbatim: "nie ma całego korpusu oprócz górnego panela, który ma
600 mm bez żadnych dog bonów — tak jak było, tylko chciałem żeby to było
podciągnięte pod logikę szafki."

Turn 27 F2 read "a normal unit" as "a carcass" and cut BUL, BUR, TOP, BOTTOM
and BACK around a machine. Wrong. The D/W emits exactly:

1. **TOP — 600 × 540 × 18, plain.** Full unit width (not internal), full
   depth, ZERO pockets, ZERO holes, no dog bones, no sockets, no screws. The
   turn-26 engine (`bd7cec4`) emitted exactly this piece — match it.
2. **FRONT — unchanged from turn 27.** 594 × 767 × 25, `opening:'drop'`,
   45° OUTWARD, shaker/handle/material laws inherited, no cups (F2.3 stands).
3. **PLINTH — DEFAULT ON.** `defaultParamsFor('DW_PANEL')` sets the plinth
   flag true; the panel is the turn-27 pass-through with the 20 mm notch from
   the top (`notchedPlinth`, `type.plinthCutFromTop`), joining a run exactly
   as turn 27 F2.4 built it. The owner: "najważniejszego czyli plinth i tak
   nie ma" — after this phase it is there on a bare default D/W.

No BUL, no BUR, no BOTTOM, no BACK, no legs, no hardware. `interiorOccupied`
stays on the type (it is what keeps shelves/rails/drawers out). This CLOSES
BLOCKERS #94: there is no carcass, so there is no bottom to argue about.

Tests: `test/turn27-f2-dishwasher-is-a-cabinet.test.js` asserted the carcass —
rewrite its assertions to THIS law (the inheritance halves stay: shaker,
handle, gaps, dimension chain, drop sign). Check `turn22-f4-dw-legs` and
`turn26-f5-dishwasher` against the new panel set. The D/W fingerprints move
again — ONE named delta, `DW_PANEL` files only, proven in
`verify/t28/cnc-export-identity.md` with the entity evidence.

## F2 [CRITICAL] — CUPS AND HANDLES TAKE THE SHEET'S OWN MIRROR

Two halves of one convention fault. The FRONT's CNC frame is the INSIDE
MIRROR (`engine/joinery.js panelPlacement`: origin bottom-RIGHT, u = [−1,0,0])
— the workshop cuts from the inside and the sheet is drawn that way. The cup
law honours it; two other things do not.

**F2a — the tray un-mirrors the bores.** `src/3d/shakerSolid.js
normaliseBores` reads the CNC x with `b.x − w/2`, assuming a bottom-LEFT
origin. The engine is correct (an L leaf's cup lands 21.5 from the hinge edge
in WORLD); only the 3-D tray flips it, and with it every cup screw and handle
hole on a shaker leaf — the owner's photo: arms on one stile, bored cups on
the other. Fix: `x: w / 2 − Number(b.x)`, comment corrected. The y stays; the
cache key already carries the bores.

**F2b — the handle law thinks in room view.** `src/engine/handles.js` ~146:
`const openingLeft = hinge === 'R'; x = openingLeft ? inset : w − inset;`
That is the ROOM's left, written into the MIRRORED frame — so on the sheet
the knob prints on the CUP edge for BOTH hands. The owner's sheet `03-F`
(597×767): three ⌀35 cups on the right stile and the knob hole beside them.
The law: the opening edge is resolved IN THE SHEET MIRROR — hinge L → hinge
at sheet-right → knob/bar reference at sheet-LEFT (`x = inset`), hinge R the
converse. One condition flips; `y`, centres and anchors stand. The 3-D handle
mounts off `meta.handle` in the same frame, so with F2a it lands on the free
stile in the room too.

Named delta: every DXF carrying a door handle moves that handle's x to the
opposite stile (and nothing else moves). Golden fixtures that pin `handles`
x update under this name; `verify/t28/cnc-export-identity.md` carries the
entity evidence.

Proof: a double-door shaker unit, both hands. Off the MOUNTED geometry (R4):
each cup 21.5 ± 0.1 from its own hinge edge, each handle at its free edge.
Off the SHEET: cups and knob on OPPOSITE stiles for both hands — the owner's
03-F re-rendered as the before/after pair. Screenshots: each leaf open from
behind, cups beside the arms, handle across the door.

## F3 [HIGH] — A SHELF'S DIMENSION STANDS IN ITS OWN BAY

The owner: "znowu pokazuje po prawej stronie szafki półki, które są po lewej
od divertera — to nie jest spójne; jak jest diverter, to półki inaczej będą
rozdzielone, to proste jest."

Turn 27 F1 taught the DRILLING which boards carry a shelf
(`engine/shelfBearers.js`); the dimension ladder never learned it — a shelf in
the LEFT bay draws its gap ladder on the unit's RIGHT flank. The ladder for a
shelf anchors on the flank of ITS OWN BAY, resolved through the SAME
`shelfBearers`/`shelfBay` the drilling uses (one resolution — the turn-27
argument, extended to the picture). A shelf in the left bay dimensions on the
left; right bay on the right; middle bay on its own partition flank. R11
stands: still one dimension component, fed a different anchor.

Proof: the turn-27 eye-test cabinet (partition at 450, shelf in each bay in
turn); read each ladder's anchor x off the scene and assert it is on the
shelf's own bay side. Screenshots per bay.

## F4 [HIGH] — THE BEVEL SHADER STOPS FLATTENING THE WORLD

Found in chat, to the line. `src/3d/bevel.js` line ~124: `normal = ccBent;`
— the fragment normal is REPLACED by one reconstructed from the panel's
bounding box (`ccFaceNormal = ccFace * ccSign`). Every fragment on a front —
frame, recess wall, recess floor — is nearest the ±z pair, so everything
shades +z and a 6 mm shaker rebate is invisible from every angle. The owner
proved it: outlines ON show the frame (the edge pass reads geometry), outlines
OFF is "mega płasko", rotation changes nothing. Not the light.

The law: the MESH normal is the base. The box reconstruction contributes ONLY
the edge roll, blended in near true box edges (the existing `ccRoll` band);
where the geometry normal disagrees with the box face normal — a recess wall,
a floor — the geometry wins. Orange peel perturbs whatever normal survives,
unchanged. No geometry changes, no CNC, no new uniforms unless the blend
needs one.

Proof: the sprayed burgundy shaker from the owner's screenshots, same grazing
camera, outlines OFF — the rebate reads. A rotation sweep (three angles)
shows the recess walls catching light. A decor shaker beside it behaves the
same. Before/after pairs in `verify/t28/`.

## F5 [HIGH] — ONE COLOUR SOURCE FOR THE SHELF-SUPPORT FAMILY

The owner: the gold/silver choice governs the WHOLE family — the sleeves, the
pins, and the drill-ring collars (`3d/DrillRings.jsx` already reads
`design.hardware.shelfSleeve`; the sleeve and pin models must read the SAME
key, one place). One selector, three consumers, zero second sources.

Proof: flip the selector both ways in the walk; read the mounted materials of
a sleeve, a pin and a ring and assert all three follow.

## F6 [HIGH] — A COLLAR ONLY WHERE A SLEEVE GOES

The chat fix of 12.08 gave EVERY round drilling a metal collar. The owner:
- ⌀7.5 on the SHELF layer (`SHELVES_7_5MM`) → collar + dark core (a sleeve
  lines that hole);
- ⌀7.5 puzzle holes, ⌀3, ⌀5 and everything else → a plain dark disc, NO
  collar (nothing lines them).

`3d/DrillRings.jsx` branches on the LAYER, not the diameter. Collar colour
still follows F5's one source.

Proof: one cabinet with shelf rows, puzzle sockets and screws; read the
mounted ring materials per layer off the scene and assert the split.

## F7 [MEDIUM] — SHELF GRAIN IN 3-D FOLLOWS THE SHEET

Turn 26 F8 turned the shelf's CNC frame along the grain; the 3-D texture
still runs across. The scene reads the same frame the sheet prints —
`decorPlacement` for a SHELF orients `scanAlongGrainMm` front-to-back, edge
banding on the long front edge. CNC untouched (it is already right).

Proof: a decor shelf photographed beside its own sheet; the grain direction
matches.

## F8 [MEDIUM] — THE DIMENSION LANGUAGE, FOUR CORRECTIONS

All in the ONE component (R11), all owner's words, all visual only:

1. **Height is never "from the floor".** A base unit's vertical chain is TWO
   segments on one line: `100` (plinth, stop arrows) below, `770` (carcass,
   stop arrows) above. Confirmed geometry: 100 at the bottom, 770 stacked
   over it, one shared vertical line.
2. **A run of identical cabinets dimensions ONCE**, on the outermost unit
   (right or left end of the run), not per cabinet. An end panel does NOT
   break the run; a different cabinet does.
3. **"Show front dimensions": the horizontal (width) label sits at 1/4 of the
   front's height from its BOTTOM** — off the centre where the labels crossed
   and overlapped.
4. **The vertical (height) label moves ~50 px right of centre** — the centre
   is where the plus buttons live and they cover everything.

Proof: before/after screenshot pairs for each of the four, on the owner's
eye-test kitchen; a run of three identical units for (2).

## F9 [MEDIUM] — BACK INSET ON THE QUICK MENU, AND END PANELS REACH THE WALL

Multi-select of floor-standing units (more than one selected) shows a **Back
inset** field in the quick menu, UNDER the dimension numbers. It moves the
whole selected run off the wall; every END PANEL in that run deepens
automatically so it always reaches the wall (panel depth = unit depth +
inset). Single-selection and wall units: no field. Engine: the inset reaches
`paramsForEngine` like every project decision; the end panel's cut size grows
with it (it IS a cut-list change — named where it shows).

Proof: select a run, set an inset, read the end panel's depth off the BOM and
the scene; both = depth + inset. Deselect → field gone.

## F10 [LOW] — A SECOND BRIGHTNESS SLIDER ON THE TOP BAR

The existing View-menu brightness gets a twin on the top toolbar (same state,
two controls, R11-style: one source). Nothing else about lighting changes.

## F11 [LOW] — THE LAYER LIST LEAVES THE EDITOR TOOLBAR

Turn 26 F12 was asked to remove it and did not. The part editor's toolbar
drops the layer list; the ONE question about a layer is asked ONCE, at save.
Nothing else on the toolbar moves (R12).

## OUT OF SCOPE — gathered for turn 29

The hinge fold rig (assistant's own job,
outside turns), the CAD tools for the part editor, per-tenant layers, LIFT
kits, tray side height, 173L plate pattern.

## THE WALK AND THE PROOFS

`verify/t28/`: the acceptance walk (`scripts/e2e-turn28.mjs`) under R1–R8,
`walk.json`, `console.txt`, `measurements.json`, before/after screenshots per
phase as named above, `cnc-export-identity.md` for F1's single named delta,
and fresh fingerprint + probe pairs (baseline = this file's baseline commit).
Full suite green, from `rm -rf node_modules && npm install`, never `--silent`.