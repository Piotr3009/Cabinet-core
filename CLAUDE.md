# CLAUDE.md — TURN 53 · the gate, the empty DXF, and the slope's infills

Nightly run. Full autonomy, zero questions, zero stops. You never halt: a
feature that cannot land whole is skipped-and-noted in the verdict, never a
reason to stop the run. Sacrifice from **F7 downward**; **F1 and F2 do not
fall.** The PR must be open before morning **regardless** of how much of the
list survived the night.

Branch from `main` (`a002df3`, T52 merged). One commit per feature, in order
F1 → F7, plus the closing acceptance-walk commit.

---

## THE IRON RULES

**1 · ZERO-STOP.** Above. Skip-and-note, never halt. PR open before morning.

**2 · BYTE-IDENTITY.** Write `scripts/t53-classify.mjs` (re-head T52's; derive
the kit count, never type it). Six goldens **IDENTICAL, UNNAMED = 0**, proven
the three-line way: `--dump` on the base with `t52-classify.mjs`, `--dump` on
the branch with `t53-classify.mjs`, compare. Expected buckets: **none** —

- F1 is a run over a room; a golden has neither.
- F3 and F4 cut only under a `slopeCut`; no golden carries one.
- F5 moves riders; no golden carries a top box.
- F6 splits pieces longer than a board; no golden's plinth or infill exists in
  a default config at all (they wait to be asked for — turn 4).
- F7 moves shoe fronts; no golden carries a shoe item.

Add a per-feature `--probe` for each of the above, the way T52's `--tabs`,
`--plan` and `--watch` turned the argument into an exit code. If a golden
moves anyway: iron rule — **write it up as a FINDING. Do not name a bucket
for it.**

**3 · LISP IS LAW, FIRST.** F3's slope-infill geometry, F4's bevel direction
and F6's splitting rule are cut on the machine, so they are **born in
`reference/lisp/`** (SKYLON_COMMON.lsp — infill/plinth sections; the slope
sections F4 touches) before any JS. `scripts/t53-paren-balance.mjs`: every
kit at **0/0** — the shelf is **14 files** since T52 (`KIT_WATCH_DRAWER.lsp`);
derive the count.

**4 · SANCTITY.** Zero functions deleted without a named licence. None is
granted tonight. If a deletion looks necessary, write the case in the verdict
and leave the function standing. Every removal of any line is accounted for.

**5 · THE WALK.** Full suite at every commit, never `--silent`; read results
with `grep -E "^# (tests|pass|fail)"`, never `tail`. `npm install` never
silent. `npm run build` clean. English copy everywhere in the UI — Polish in
UI strings was T44's failure and it is not repeated. Zero new dependencies.
Browser verification with committed screenshots in `verify/t53/`, **every one
looked at** before the verdict claims anything about it. All modals draggable,
opening beside — never covering — the clicked object. Every search/filter
field ships the ✕ clear button (house rule, 23.08).

**THE HOUSE OVERLAP LAW** (owner, 27.08, filed in Petros): *"nie pozwalamy na
nachodzenie się materiałów na siebie, chyba że ja sobie tego zażyczę."* No two
boards may overlap in geometry — anywhere, ever, unless he asked. F4, F5 and
F7 each close a breach of it. Do not open a new one.

---

## F1 [CRITICAL] · the share-out gate, and the ✕

> *"jak dołożę nową szafę lub cupboard, i zostaje mniej niż 400 to muszę
> przesunąć żeby się pojawiła ta informacja … czyli działa w 99 procentach."*
> *"musi też być przycisk dismiss — jak nie chcę tego robić teraz, muszę coś
> nacisnąć. pamiętaj krzyżyk zasada."*

**(a) The gate counts a scribe as leftover — diagnosed, with numbers.**
`engine/shareOut.js`: `plan.gap = left.bodyGap + right.bodyGap` — the SUM of
both ends — and `shareOutOffered` refuses at `gap >= 400`. Fill a 4000 wall
from the left: the last add leaves **360** of bare wall (what the owner sees),
but the left end's bodyGap is **40** — the scribe's own reserve, not free
space — so the gate reads **400 ≥ 400** and stays silent. Nudge the cabinet
1 mm toward the gap: 399, and the bar appears. Reproduced headless on the
live store, to the millimetre.

**The fix:** the gate compares the leftover **less what is already reserved**:
`gap − reserved.total`. On the same numbers: add → 400 − 80 = **320 < 400 →
the bar stands on the add**. After a share-out: 80 − 80 = **0 → the bar does
not stand again** — which also closes the T52 verdict's own note about the
bar returning over two scribes. One cause, two bugs, one line of arithmetic.
The gate moves; `shareOutPlan`'s published `gap` does not change meaning —
the BAR's label still reads the visible leftover (`span`/`bodyGap` of the gap
side), which is the number the owner reads.

**(b) The ✕.** The bar gets a dismiss cross at its right end (the house ✕
rule). Clicking it dismisses the offer **for this gap**: store the offered
plan's signature (wall, mount, rounded `startAt`/`endAt`/`gap`) in the UI
store; `settleLayout` does not re-offer while the current plan's signature
matches the dismissed one; any geometry change that alters the signature
(move, add, remove, width) clears it, and so does loading a project. Without
the signature the very next settle would resurrect the bar it just closed.

Assert both in `test/turn53-f1-…`: the owner's fill-the-wall sequence offers
**on the add**; the shared-out run does not re-offer; dismiss holds across a
settle and lifts on a real geometry change. Screenshots: the bar standing
immediately after an add into a sub-400 gap; the bar with its ✕; the bar gone
after ✕ and still gone after an unrelated settle.

Files: `engine/shareOut.js`, `stores/uiStore.js`, `stores/projectStore.js`,
`3d/ShareOutBar.jsx`. `runGap` is not touched. The 400 itself is not touched.

---

## F2 [CRITICAL] · the DXF export is EMPTY

Fifth day standing (handover, 22–26.08): *"DXF eksport PUSTY — bez tego CNC
nie dostaje nic."* The single most valuable output of this application
produces nothing.

The cause is **not diagnosed** — diagnosing it is the first half of the
feature, and the finding goes in the verdict in full: what was empty (zero
bytes? headers with no entities? wrong panels selected?), where it broke
(`engine/cnc/dxf.js`? the Output wiring? the panel filter?), and since when
(bisect if the history answers cheaply).

Then fix it, and **prove it the workshop's way**: build a seeded test project
(a real one — a run of BUD/BUDR with drawers, one wardrobe with a slope, a
shoe box; never fabricated catalogue rows), export, and assert on the FILES:
per expected part a DXF whose entity count is > 0 and whose extents match the
part's `cnc` geometry within tolerance; drillings present where the engine
says holes are; the slope note text where F3/F4 give a piece an angle. Commit
one sample DXF set under `verify/t53/dxf/` and open at least one in a viewer
for a screenshot. A green suite that never opened the file is exactly how
this stayed broken for five days.

---

## F3 [HIGH] · the slope's infills — one law: 3D DRAWS WHAT CNC CUTS

> *"top infill po skosie w ogóle nie działa … jakoś dziwnie się rysuje gdzieś
> poza ścianami."*
> *"najdziwniejsze jest to, że pionowy infill na CNC się tnie pod skosem, ale
> na wizualizacji pokazuje prosto."*
> *"slope — tylko infill się nie rysuje po skosie, a jest na CNC."*

Same disease three ways, and it is the disease the grain rule already killed
once: **two sources of truth**. The CNC path carries the slope
(`meta.slopeCut.angles`, the DXF, the part label); the 3D solid ignores it.
The law, stated once and asserted: **every piece the machine cuts on the
slope is drawn cut in the room.** LISP first (iron rule 3): state the
infill-on-slope geometry in `SKYLON_COMMON.lsp` beside the slope sections;
`engine` follows it; the 3D consumes the engine's outline and measures
nothing of its own.

**(a) The vertical (side) infill.** `engine/mitre.js infillMitre` cuts the
vertical member's solid for exactly one thing — the 45° `meta.corner` at the
top-infill joint — and nothing for the slope. Give the vertical's solid its
slope plane from the same numbers the CNC already carries; the top end of the
piece in the room matches `slopeHeightAt` at its own x. The T48 mitre where
it meets a sloped top infill (`sideTopMitreDeg`) already knows the angle —
use it, do not restate it.

**(b) The run top infill.** `engine/runs.js runTopInfill` is flat: one
`faceH`, ends from `runEnd(..., roomHeight)`, zero `ceilingPolyline`. Under a
slope the piece stands above the ceiling line — *"poza ścianami"*. It becomes
**segments behind the ceiling polyline**: broken at every knee, each
segment's top edge following its own stretch (straight under a flat stretch,
raked under a raked one), never crossing the polyline, never entering the
triangle where the wall has ended. Segment joints land on cabinet boundaries
where F6's law reaches this piece.

**(c) The vertical run to the ceiling.** `projectStore.sideInfillToCeiling`
and `endPanelToCeiling` read `room.height` flat. Under a slope the target is
`slopeHeightAt` at the piece's own x on that wall.

**(d) The slope infill (the board over a cabinet, T51's infill-as-board).**
On the CNC, not drawn on the slope in the room. Same law, same source: the
solid takes the cut outline the CNC file takes.

Tests hold engine outline ⇄ CNC geometry equal per piece (the T48 pattern:
parse what the machine gets, compare with what the room draws). Screenshots:
a sloped wall with a run under it — vertical infill cut, top infill in
segments behind the polyline, slope infill lying on the rake; before/after
of the piece that used to float outside the wall.

---

## F4 [HIGH] · BUL/BUR on the slope: the bevel runs the WRONG WAY

> *"zamiast BUL obciąć pod kątem pasującym do wieńca, to się nachodzą
> materiały na siebie."*
> *"wygląda na to, że cięcia istniejące na BUL i BUR są odwrotnie — zobacz SS."*
> And the correction: *"nie cięcie wieńca — on już jest dobrze cięty. BUL i
> BUR."*

**The roof board is CORRECT. Do not touch it.** The sides are the fault: the
existing T47 bevel on the side's top edge is **mirrored** — on the owner's
screenshot the blank's HIGH edge faces the ROOM, leaving a wedge of side
standing proud past the roof line at the corner, overlapping the board that
should lie flat on it. The short face of the bevel must be on the fall side;
the high point of the blank always toward the peak, never toward the room.

Same error family as the lighting rig's backwards rotations: a sign, per
side. **LISP first:** check `SKY:slopeCutPts` and the T47 side sections in
the LISP — if the LISP is right, the JS diverged (suspect seam:
`cabinet.js` T47 block, `sideUnder`'s blank/short-face pick per `isLeft` and
the bevel emit on the side panels); if the LISP itself is mirrored, fix the
LISP first and the JS follows. Then the overlap is gone **by cutting, not by
adding**: no patch piece, ever — the house overlap law above.

Assert per side, both slopes (left slope and right slope): blank high point
on the peak side; the side's top face coplanar with the roof's underside
along the shared stretch; the stated angle on the piece equal in the room,
on the part drawing and on the CNC sheet. Screenshots: the T52-style corner
close-up, left and right, where the wedge used to stand.

---

## F5 [HIGH] · top boxes: side by side on one main, never one inside another

> *"top box łamią zasadę — nakłada się jeden na drugi, a nie może. poza tym
> jak dodaję plusik po lewej, to on się nie pojawia po lewej, tylko jeden w
> drugim."*

Diagnosed: the model is **1 main = 1 rider at the main's own x**.
`engine/topBox.js settleRiders` writes the rider `x = host.x_mm` — hard;
`riddenBy` is a Map host→ONE rider (a second silently shadows the first);
`hostForRider` hands every box on the span the same host — so two boxes get
one x and stand **exactly inside each other**, and the left add-plus places a
box beside, only for the very next settle to snap it back onto the host's x.

The model turns over:

- a rider keeps **its own x**, clamped inside the host's span (a box may not
  hang past its main's edges);
- a host carries a **list** of riders (`ridden_by` becomes the list; every
  reader — `doors.js topNeighbourDemand`, checks #14's orphan question, the
  clamp — goes list-aware; a saved project with the old scalar migrates on
  load);
- **rider–rider overlap is forbidden** — same clamp discipline cabinets have,
  the house overlap law again;
- add-plus L/R on a top box places the new box **beside the clicked box**,
  clamped to the host span; no room on that side → the add refuses with a
  message, exactly as a cabinet add against a wall does;
- `settleRiders` still snaps **y** to the host's top and rides the host's
  moves; it stops confiscating x.

Assert: two boxes on one 1200 main sit side by side and survive a settle;
plus-L lands left; the third box that does not fit refuses; the old
single-scalar project loads and keeps its one box where it was. Screenshots:
two boxes side by side on one main; the refusal message.

---

## F6 [MEDIUM] · plinths and infills: VERTICAL on the sheet, split at a cabinet edge

> *"infille i plinthy układaj na CNC w pionie zawsze i dziel tak, żeby się
> równo z szafką którąś — żeby nie przekroczyło wysokości materiału. przy
> okazji rozwiążemy problem oversizu."*
> The worked example, his: *"płyta ma 2400 a plinth wychodzi 3200 — zobacz
> jakie mamy szafki: 3 × 650 = 1950, reszta drugi pasek. łączenie zawsze
> równo z szafką, a nie na środku szafki."*

The law, LISP-first (SKYLON_COMMON, beside the plinth/infill sections), then
engine, then nesting:

- these pieces nest **vertically** on the sheet — the piece's length runs
  along the board's height. Verify plinths already do (*"plinthy już chyba
  mamy pionowo"* — check, and if any path lays them flat it comes under the
  law tonight);
- a piece longer than the **assigned board's real height** (the project's
  material, never a hardcoded 2400/2070) splits into strips;
- the split point is **always a cabinet boundary**: take whole cabinet widths
  while the sum fits — his example is the assertion, literally:
  board 2400, plinth 3200 over 650s → 3 × 650 = **1950** first strip (a
  fourth would be 2600 > 2400), **1250** the second; a joint never lands
  mid-cabinet;
- grain follows the single-source rule already in force: the cut orientation
  IS the grain, and the room draws what was cut — vertical strips carry
  vertical grain, stated on the piece for the nester, no per-role override;
- this **closes the oversize problem** for these parts: no plinth or infill
  strip may exceed the sheet, and the check that used to flag the oversize
  now flags only a single cabinet wider than the board (which no split can
  save).

Where F3's segmented top infill already breaks at a knee, the two laws
compose: a segment that is still too long splits again, at a cabinet edge.

Assert the worked example number for number; assert no joint mid-cabinet
across a randomized run of widths; assert the limit reads the assigned
board. Screenshot: the cut sheet with a split plinth, joint on the cabinet
line.

---

## F7 [MEDIUM] · the shoe fronts come under the drawer-front law

> *"szuflada lub półka na buty powinny mieć te same zasady co szuflady …
> nie licuje się z frontem, nie licuje się z innymi szufladami, nie wiem
> dlaczego front zachodzi na szufladę na dole."*

Diagnosed — the shoe front is a **parallel world** (`engine/shoeBox.js` +
its own case in `cabinet.js shoeBoxBoxFor`), and every symptom is one
divergence:

- **its own Z plane** (`setbackX = 3` off its own datum) while drawer fronts
  share theirs — the shoe face stands off the common plane. It moves onto
  **the exact plane the DRAWER-FRONT panels emit** (read it from the
  drawer-front box, do not restate the formula);
- **the double −G**: above a stack, `above = partY − G` then
  `posZ = above − G` — the box floor lands a board-thickness INSIDE the
  drawer zone, so the face overlaps the drawer front below. One −G goes;
- **no front gap**: the shoe face butts at zero while every drawer front
  keeps the front gap. It keeps the same gap to the front below and above;
- **the face is VERTICAL, always.** The shoe SHELF's 15° tilt is interior
  design and stays; the face riding the tilt is the crooked front on his
  screenshot and it stops.

**What does NOT change, because it is his own standing law:** the face width
stays the T37 rule — *"rozszerz front szuflady, tak żeby zostało po prawej i
po lewej od BUL i BUR około 10 mm"* — and `frontH = 120` stays the kit's
number. Neither is overturned by tonight; if the owner wants the drawer
width-law instead, that is his one line to say in the morning, not yours to
assume.

Assert: the shoe face coplanar with a drawer front in the same carcass; the
gap between shoe face and the front below equal to the drawer front gap; no
overlap with the front below (the house law); the face vertical over a
tilted shelf; box, slope floor, battens, runners byte-identical to before.
Screenshots: the owner's own scene rebuilt — stack + shoe above — before
and after.

---

## OUT OF SCOPE TONIGHT

The lighting rig (*"lights działają super"*). `runGap`. The 400 threshold
itself. The warehouse and its SQL. `hardware.hinge.cupFloorKeepMm` (T52
finding 2 — the owner's word pending). The watch drawer v2 (16 — mockup
first). The CAD room drawing (11 — mockup first). L-shape. The wieniec's own
slope cut (correct; F4 touches sides only). Kesseböhmer STEP 238384.

---

## THE MORNING

`verify/t53/`: screenshots per feature (named for what they show, before/after
where telling), `dxf/` samples (F2), `audit/` (classify, paren, per-feature
probes), `EYE-TEST.md` (the owner's walk, numbered, with the two-or-three
things to tell us about), `report.json`, `verdict.md` — iron rules answered
in a table, per feature: his words, the diagnosis, what shipped, what was
measured, findings written up rather than waved through.

The suite, the build, `t53-classify` (6 IDENTICAL, UNNAMED 0), paren (14
kits, every one 0/0), the probes — all in the verdict as numbers. One commit
per feature. The PR open before morning, whatever fell.