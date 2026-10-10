# CLAUDE.md, TURN 77 · ORNATE A LANDS: FOUR CLASSICAL FRONTS FROM THE OWNER'S BOARD

Run autonomously. Zero questions, zero stops: every decision below is the
owner's own (10.10.2026), so nothing here is asked again. If a point cannot
be done, skip it, write why in the PR, and go on to the next. Full suite,
never `--silent`. Frames under `verify/t77/`. Branch `claude/t77-ornate-a`,
one commit per F, PR at the end; the owner merges. Nothing lands in Petros
from this session.

## THE ORDER
1. The owner's board of 10.10.2026 (600 x 800 x 18, outer frame 60, inner
   band 60, R150, four steps 12 / 8 / 6 / 4 wide at 3 / 6 / 9 / 12 deep, four
   variants: Classic, Symmetric, Soft, Plain) was coded by GPT at the owner's
   request: *"rozpisz zakoduj dokładnie proszę i ja to dam do Clauda, ale daj
   gotowy kod włącznie z leyersami proszę do CNC."* That code sits in this
   repo as ONE patch, `patches/gpt-ornate-a.patch` (36 files, base
   `2766045116637e0b0cc37894d4333290abe0e894`, which IS the current main after
   PR #75). This turn lands it and corrects three things it got wrong.
2. The relief is a PROPOSAL and stays one: the owner's board says *"Do
   produkcji wymagane pomiary i akceptacja fizycznego wzoru."* The slab is
   cut; the relief ships as CAD/CAM reference files with the state
   `geometry`, never as approved machining, until the owner says otherwise.
3. BASE: `origin/main` at `2766045` or later. The patch applies clean there
   (checked 10.10.2026, 22:50). If main has moved past it, `git apply --3way`
   and keep both sides of every conflict.

## LAWS
T75's LAWS and T76's two laws hold in full and are not repeated: done means
the whole road, LISP IS LAW, diagnose before you cut, test the way the client
clicks, one law one path, 1:1 = COPY, numbers in the profile and never typed
into the UI without the owner's order, room refuses first, no em or en dash
in anything written, kasacja is physical deletion, GPT's code is a patch not
a paste, one state one column. One law is this turn's own:
**A reference file is a file somebody has to download.** Everything the ZIP
carries for a relief must fit a browser export of a whole kitchen: sizes are
measured in the walk and written in the PR.

## FROZEN
1. Goldens: the six, T75's nine, T76's decoration file, byte-identical
   (`scripts/t64-classify.mjs dump()` against `verify/t70/goldens-base.json`
   and the later bases). `scripts/t77-classify.mjs` (T76's pattern) names
   every engine delta and proves no golden can reach it: no old project
   carries an `ORNATE_A_*` style, so none moves.
2. LISP untouched: the relief is surface machining on a slab the kits
   already cut, like T76's recipes; no LISP is asked for and the PR says so.
   `engine/drawings/**` only through GPT's own hunks. Lighting untouched.
   `doors.js`, `hinges.js`, `hingeLadder.js`, `handles.js`, `splitDoors.js`,
   `shaker.js`, `frontDimensions.js`, `frontGapClash.js` untouched
   (`test/turn68-f6-f8-hinges-and-one-road.test.js` changes only its style
   ORDER list; that is the whole of the hinge file's involvement).
3. PRO freeze (`test/turn59-f1-the-switch.test.js`): every PRO file edited is
   licensed in `EXEMPT` with the owner's words (GPT's two entries quote the
   owner's authorisation of 10.10.2026 and stay) and re-frozen at its final
   hash in the same commit.
4. The suite is green at the start (record the count; GPT recorded 6325 on
   this base) and green at the end.

## F1 · THE PATCH LANDS
- Commit `verify/t77/f01-probe.md` first: the base SHA, the result of
  `git apply --check`, the 36 files, and the suite count on the base.
- `git apply patches/gpt-ornate-a.patch` (3-way only if main moved). Suite.
  What is red is fixed in GPT's code, never by loosening an older test.
- Delete `patches/gpt-ornate-a.patch` in this turn's LAST commit (packaging,
  not code: the T71 and T76 precedent).

## F2 · THE PROBE OF WHAT GPT BUILT
Committed table `verify/t77/f02-probe.md`: the four style ids and their
profile entries (`engine/ornateFrontProfile.js` imported into
`profile.front.decoration`); where the recipe is written and read (the T76
roads: project, front-material slot, saved style, unit); how
`buildOrnateFront` hands ONE surface to the 3D solid, the drawings, the DXF
and the STL; the readiness of the slab (`cut`) and of the reference files
(`geometry`) and the BOM sentence; the export layers
(`FRONT_REFERENCE_NO_CUT`, `FRONT_REF_PROFILE_D3 / D6 / D9 / D12`,
`FRONT_REF_ORNAMENT`); the size in bytes of each reference file for a
600 x 800 leaf of each variant as the patch produces them today.

## F3 · THE REFERENCE FILES SHRINK TO WHAT A BROWSER CAN SHIP
GPT's STL for one 600 x 800 leaf is 12 to 36 MB (ASCII STL at a 1 mm relief
sample). A kitchen of eight ornate leaves would hand the browser a quarter of
a gigabyte. Fix, with no change to the geometry the 3D shows:
- `RELIEF_SAMPLE_MM`, `SURFACE_CHORD_MM` and `CHORD_ERROR_MM` move from
  constants in `engine/ornateFront.js` into
  `profile.front.decoration.ornateReference = { sampleMm: 2.0, chordMm: 2.0,
  chordErrorMm: 0.06, fullSampleMm: 1.0 } // T77 proposed, owner to
  confirm`. The 3D solid keeps the finer sampling it has (its own number),
  the EXPORT reads the profile.
- `ornateSurfaceStl` writes BINARY STL (80-byte header, uint32 count, 50
  bytes per triangle), units in the operations JSON as today. ASCII goes.
- The CNC export offers two levels in the existing export options (no new
  numeric field): `Reference (default)` at `sampleMm` and `Full resolution`
  at `fullSampleMm`; the manifest records which one was written.
- The walk (F7) records the bytes per file before and after; the PR carries
  the table. Target, said here so the walk can fail it: one leaf's three
  reference files under 4 MB at the default level.

## F4 · THE BOARD: 18 ON THE BOARD, 25 IN THE WORKSHOP
The owner's board is drawn for 18 mm; the workshop's default front is 25
(`profile.front.thickness`). GPT keeps the ASSIGNED material's thickness
(right: a 12 mm relief in a 25 board leaves 13 and passes the 3 mm skin).
- `boardMm: 18` in the ornate profile is the BOARD OF THE DRAWING, not a
  demand: the Check speaks only when the assigned front is THINNER than the
  deepest step plus the 3 mm skin (15 mm for the default recipe), in words,
  naming the leaf and the number; a thicker board is silently fine. This is
  T76 F4's rule for A/AH applied the same way; one function serves both.
- The JSON and the drawing print the ACTUAL board of the leaf, never the
  board of the drawing.

## F5 · KASACJA: THE COPYRIGHT HEADERS
Eight new files open with `// Copyright Skylon Development Ltd. All rights
reserved.` No file in this repo carries a copyright header, and that company
name is not one of the owner's. Delete the line from every file the patch
adds (`src/engine/ornateFront.js`, `ornateFrontProfile.js`,
`ornateFrontArt.js`, `engine/cnc/ornateExport.js`, the four `ornate-*`
scripts and tests that carry it) and from `docs/ornate-a-handoff-PL.md`. The
owner decides any notice for the whole repo separately; nothing is invented
in its place.

## F6 · THE ORNAMENT IS A PLACEHOLDER UNTIL THE OWNER'S MODEL ARRIVES
GPT's flower and leaves are procedural: *"odtworzenie proceduralne ... Do
wiernej kopii fizycznego wzoru potrzebny będzie jego pomiar lub model
źródłowy."*
- The ornament enters the engine through ONE function
  (`ornamentSurface(variant, config, profile)` in `engine/ornateFront.js`,
  as GPT has it or refactored to it in one step). Beside it a slot the owner
  fills: `reference/hardware/ornate/README.md` naming what to drop in (an STL
  or OBJ of the carved ornament in mm, lying face up, origin at its bounding
  corner) and the profile key `front.decoration.ornateReference.ornamentModel
  = null`. While it is null, the procedural ornament stands, labelled in the
  BOM sentence and the JSON as `ornament: 'procedural placeholder'`. When a
  model is named, the SAME function returns the model's surface and the
  label changes. Loading the model is NOT this turn; only the slot, the
  label and the README are.
- `docs/ornate-a-handoff-PL.md` says so in one paragraph.

## F7 · THE WALK, REAL MOUSE, PRO AND RETAIL
`scripts/t77-walk.mjs` (GPT's `ornate-walk.mjs` folded into T76's harness;
GPT's script is deleted after, one walk per turn), frames
`verify/t77/fNN-*.png`, output `verify/t77/walk.txt`:
- PRO: a wardrobe and a base unit; Fronts set to ORNATE_A_1 .. 4 in turn by
  the real select; each leaf's solid shows the relief; `Mirror ornate
  pattern` flips the composition; the cut list names the leaf with
  `construction` reading "relief proposed, not production approved" and
  State `Cut`; the CNC export ZIP holds the back DXF, the `ornate-reference/`
  folder (DXF, binary STL, JSON per leaf), READINESS.txt and
  `front-operations.json`; bytes per file recorded (F3's target); the T71
  drawing set draws the profile contours on the elevation.
- PRO, the L of T75 with ORNATE_A_2: both leaves carry the relief, door B
  still "opens first".
- PRO, refusals: a 250 x 400 leaf with ORNATE_A_1 is refused in words (the
  radii do not fit; nothing is squeezed); a 12 mm board with the default
  recipe is refused by F4's Check.
- PRO, old project: the Herbal Hill fixture opened, no relief appears, the
  cut list byte-identical before and after.
- Retail: FRONTS step shows the four tiles from `ornateFrontArt.js`, a click
  changes the leaf, no numeric field on the page, MY ESTIMATE names the
  style; save, reload, the same result.

## F8 · FREEZE AND PROOF
EXEMPT entries re-frozen at final hashes; `scripts/t77-classify.mjs`;
`scripts/t77-copy.mjs` (retail only through the copy script; GPT's T63 copy
of `FrontDecorationControls` re-run after F3 to F6); parens 17 of 17; the
patch file deleted.

## NOT THIS TURN (named so nobody builds it)
- Loading the owner's ornament model (the slot only).
- Approving the relief for production; toolpaths or G-code (CAM's job).
- Ornate on sloped or non-rectangular leaves (refused in words today).
- Any new typed number in the UI; lighting; sliding or any opening system.

## TESTS AND PROOF
Full suite; GPT's four `ornate-front-*.test.js` kept, amended for F3 (binary
STL, profile-driven sampling), F4 (the thinner-board Check) and F6 (the
placeholder label); `test/turn77-*.test.js` for F3's size target on the four
variants, for F4's one-function rule shared with A/AH, and for F5 (no file
under `src/` or `scripts/` starts with a copyright line). The walk above with
frames.

## PR BODY
The two probe tables verbatim; files and lines per F; the EXEMPT entries;
the retail divergences by file and line; the goldens; the test count before
and after; the reference-file size table before and after F3; the walk
result; what was skipped and why; THE NUMBERS PROPOSED.

## THE NUMBERS PROPOSED (owner to confirm, all in profile.js, none typed in the UI)
| Number | Value | Source |
| - | - | - |
| Outer frame, inner band | 60, 60 | owner's board 10.10.2026 |
| Inner radius (variants 1, 4) | 150 | owner's board |
| Step widths | 12 / 8 / 6 / 4 | owner's board |
| Step depths from the face | 3 / 6 / 9 / 12 | owner's board |
| Variant 3 radii | R110, R18 | GPT, proposed |
| Variant 2 | semicircle on the inner width | GPT's reading of the board |
| Ornament background, relief | 3 down, 2.5 up (under the face) | GPT, proposed |
| Small corners | R3 | GPT, proposed |
| Skin under the deepest step | 3 | house rule |
| Reference sampling | 2.0 default, 1.0 full | T77, proposed |
| Reference size target | under 4 MB per leaf at default | T77, proposed |
