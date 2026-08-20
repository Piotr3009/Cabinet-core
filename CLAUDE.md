# CLAUDE.md — TURN 43 · THE WALL SET DRAWS WHAT THE WORKSHOP SELLS: CLEAN FRONTS, TRUE SHAKER, DRAWN DRAWERS, BOTH SECTIONS — AND THE RUNNER STAND-IN DIES

The owner, 20.08.2026, on the first real print of the wall set: *"pdf do
dupy — nadal pokazuje fronty z carcasami, nie pokazuje jak ja chciałem,
czyli fronty same bez kresek. Shaker prawdziwy — ile mam mm, tyle
powinno być pokazane. Linie nadal są mega grube. Nóżki to jakieś klocki
zamiast ładnej nóżki, poza tym jak widać fronty, to nie powinno być
widać nóżek. Nie widzę przekroju w pionie ani w poziomie. Szuflady nie
są narysowane."* On the sections, twice now: **BOTH** — a section sheet
per wall AND an A-A through a chosen cabinet. And on the grey overlay
runners, the same day: *"jak kod nadpisuje to go usuń"* — F7.

## Why this turn exists (the trace — measured tonight, do not re-walk it)

T42-F0 proved the wall PDF's BYTES and proved them on a TRIVIAL seeded
project — three bare carcasses, no shelf, no drawer, no shaker, no
design. Every drawing complaint above is about CONTENT, and the content
was never in the proof. The chain itself is ONE chain: the preview SVG
and the PDF write the same laid-out entities through the same
`penWidth()` resolver (T41-F5a) — this is NOT the rail's two-chain
disease. What the one chain draws is wrong in six named places:

1. `/1` DRAWS THE INSIDES. `buildFrontElevation`
   (`frontElevation.js:284–292`) draws every `isDrawn` panel;
   `panelStyle` (`:44–60`) sends every non-edge-touching piece to
   `SHELVES` as a dashed hidden line. On a real kitchen the fronts sheet
   is full of green dashes — his "kreski". His standard (the Anderson
   set): /1 is fronts, outline, handles, dimensions. Nothing else.
2. THE SHAKER LIES ABOUT ITS FRAME. Measured on the real engine:
   project frame 80 mm → drawn 60 mm. `frontDetail` is called with no
   frame (`frontElevation.js:297`, `views.js:205`) and `design` never
   reaches `wallDrawingSheets` at all, so `shakerFrameMm(null, profile)`
   answers with the profile default every time. The function itself
   (`shaker.js:107`) already knows how to read the project's number —
   nobody hands it the project.
3. EVERY LINE IS AN OUTLINE. Each carcass panel is its own rect and the
   `CARCASE` layer maps to `PEN.OUTLINE` 0.50 (`layers.js:25`), so a
   composed wall prints panel-edge on panel-edge on unit-outline, all
   at the heaviest visible weight. At 1:15 on A3 that reads as a
   marker, not a pen.
4. THE LEGS ARE BRICKS, ON BOTH SHEETS. `frontElevation.js:302–308` and
   the same block in `views.js` draw each leg as one bare rect —
   measured: 8 `LEG_BLOCK` rects on /1 AND /2 of a three-unit wall. In
   the built kitchen the plinth hides them; on the fronts sheet they
   have no business existing at all.
5. `/2` HAS NO DRAWERS. `buildCarcassElevation` (`views.js`) filters
   `role !== 'drawer_box'` — measured: a BUDR's 15 drawer-box panels
   produce ZERO entities; six runner lines float in an empty box.
6. THE SECTIONS: horizontal EXISTS (the set's last sheet — check it
   renders on his project; T42's census note names any wall it
   skipped); vertical DOES NOT EXIST — no builder anywhere under
   `src/engine/drawings/`. Never written, not regressed.

And the SEVENTH, the runners (F7): overlay box 490 → ask NL 500 →
ladder rung 500 → the LIVE bucket manifest (fetched 20.08, HTTP 200)
tops out at **450** → `runnerEntry` null → the grey L-profile stand-in.
Nothing overrides anything; the fallback wins by silence. T42-F2's
probe was green because its showroom INVENTED rung 500
(`760H500T_3000500.glb`, article "3000500T" — no such file, no such
article exists in the shop). The missing rungs are the owner's own DATA
task (`runner-bucket-patch.md`, delivered 20.08, NL 500–700); this
turn's F7 makes the app honest whether or not the upload has happened.

## Iron rules (binding)

1. **Zero-stop overnight run.** Skip-and-note, PR before morning
   regardless. Sacrifice order if the night is short, first to fall
   first: F5b (A-A), then F5a (wall sections), then F4 (pen map).
   **F1, F2, F3, F6 and F7 never fall.**
2. **Engine contract: BYTE-IDENTITY.** Every feature this turn lives in
   `src/engine/drawings/**`, the two drawing callers
   (`DrawingModal.jsx`, `ConfiguratorPage.jsx`), `lib/drawingExport.js`,
   and for F7 in `3d/Hardware.jsx` and `engine/checks.js` — every one a
   READER of `computeCabinet()`'s answer, never its author.
   `computeCabinet` is not in any feature's blast radius; **no additive
   fields either** — three of the six configs carry drawers, so even an
   "innocent" published extra would move their bytes. Where the A-A
   section needs a depth the engine does not publish, it asks the
   modules that already own the answer (the runner ladder, the profile,
   the params) — it never teaches the engine new words.
   `scripts/t43-classify.mjs` (T42's, re-headed), six configs
   IDENTICAL, UNNAMED=0, empty buckets.
3. **Sanctity — THIS TURN'S NAMED LICENCE.** The owner's instructions
   are the quotes at the top. The licence covers, BY NAME:
   - `frontElevation.js:302–308` — the leg-rect block: DELETED from the
     fronts elevation (F1); its twin in `views.js` REPLACED by the leg
     symbol (F3).
   - `frontElevation.js` — `buildFrontElevation` gains a `frontsOnly`
     option and a `shakerFrame` option; `frontDetail` gains the
     threaded frame. Signature EXTENSIONS, defaulted so every existing
     caller compiles and behaves identically unless it asks.
   - `views.js buildCarcassElevation` — the `drawer_box` exclusion:
     REPLACED by the drawn drawer boxes (F3).
   - `layers.js` — no layer deleted; the PEN mapping of panel rects
     moves to the entity (`pen:'VISIBLE'`), the layer table untouched.
   - `3d/Hardware.jsx`, the `Runners` component — the stand-in
     rendering: the `plain` list, `placeFace`, `placeFlange` and BOTH
     `<Pieces>` blocks: DELETED (F7; the owner's sentence *"jak kod
     nadpisuje to go usuń"* is the licence). `reportHardware` stays.
   - `RightPanel.jsx:768` — the dead `|| p.part === 'RAIL-PART'`
     condition: DELETED (T42 leftover, harmless, licensed now).
   - `checks.js:407` — the dead `p.part !== 'RAIL-PART'` exclusion:
     DELETED (same leftover).
   Anything beyond this list: not deleted, not changed. Every removal
   named in the PR body.
4. **THE UNIT CARD DOES NOT MOVE.** The card is a workshop sheet and
   its hidden lines are its value. Pin it: a test renders the card SVG
   for a fixture unit BEFORE and AFTER and asserts byte-identity — with
   exactly TWO licensed deltas, named in the test: (a) when the project
   carries a shaker frame, the card's shaker inset moves to it (F2
   fixes the card's lie too); (b) stroke-widths follow the F4 pen map.
   Geometry otherwise byte-identical.
5. **LISP untouched.** Every drawing this turn is app-side paper; the
   kits' own FRONT views are CNC artefacts and are not the subject.
   State it in the PR.
6. **No new dependencies.** PDF assertions stay byte-level; content
   assertions run on the SVG string and the entity lists, which are
   numbers and need no rasteriser. Suite never `--silent`. One commit
   per feature.
7. **PROVE THE THING, NOT THE FIELD** — a content claim is asserted on
   the ENTITY LIST or the SVG numerics, and every sheet is screenshot
   from the real preview with real pointer input. Probes under
   `verify/t43/`.
8. **THE SHOWROOM IS THE SHOP.** Banned, permanently: a probe or test
   showroom may serve ONLY rows the committed snapshot
   `reference/hardware/movento.json` names (today byte-equal to the
   live bucket: NL 250–450, 40 files, articles 8-digit). It may
   fabricate GLB BYTES for those rows; it may not invent a row, a rung,
   a variant or an article the snapshot does not carry. Wherever the
   showroom catalogue is composed today (`lib/hardwareSource.js` and
   the probe scripts), pin it to the snapshot, and add a suite guard:
   showroom NLs ⊆ snapshot NLs, showroom articles ⊆ snapshot articles.
   When the owner uploads new rungs, refreshing the snapshot is one
   curl — the command is in `runner-bucket-patch.md`; a stale snapshot
   makes probes CONSERVATIVE, never optimistic, which is the correct
   direction of error.

---

## F1 [CRITICAL] — /1 is FRONTS, and nothing that hides behind them

The fronts sheet of a wall shows what the client sees: **fronts, end
panels, infills, the plinth line, the unit silhouette, handles, door
swings, unit numbers, the building fabric, the chains. Nothing else.**

- `buildFrontElevation` gains `frontsOnly: true` (default `false`):
  - drawn panels: `isFront(p)`, `role === 'end_panel'`,
    `role === 'infill'`, `role === 'plinth'` — and no other panel;
  - NO hidden lines of any kind — the option removes the entities, it
    does not restyle them: `/1` must contain ZERO dashed geometry;
  - NO legs (iron rule 3's deletion);
  - the unit silhouette rect stays — it is what the eye reads first —
    at `pen:'OUTLINE'`;
  - front detail, swings, handles, unit number, chains: exactly as now.
- `buildWallElevation` passes `frontsOnly: withFronts` — the /1 sheet
  gets the clean view, and NOTHING ELSE in the app changes behaviour,
  because the option defaults off (iron rule 4 pins the card).

Tests (the thing): on the F6 project, the /1 entity list contains zero
entities with `hidden`, zero on `SHELVES`, zero on `LEG_BLOCK`; the /1
SVG contains no `stroke-dasharray` on geometry layers (title-block
rules excluded by layer name); every DRAWER-FRONT and FRONT rect IS
present.

Proof: `f1-wall-1-fronts-clean.png` — the /1 sheet of the F6 project,
preview, next to the same wall's /2.

---

## F2 [CRITICAL] — the shaker is drawn at THE PROJECT'S millimetres

The design already stores the number (`design.fronts.shakerFrame`,
pinned per saved job by `projectStore.js:520`); the drawings never ask.

- `wallDrawingSheets` gains `design` in its args; both callers pass
  `project.design` (`ConfiguratorPage.jsx:377` call site,
  `DrawingModal.jsx` wallSet memo).
- `buildWallElevation` → `buildFrontElevation` → `frontDetail` thread
  ONE resolved number: `shakerFrameMm(design, profile)` — resolved once
  at the sheet level, passed down as `shakerFrame`, never re-resolved
  per panel.
- The unit card path (`card.js` → `buildFrontElevation`, and the top
  view's `frontDetail` at `views.js:205`) threads the same number — the
  card told the same lie.
- `shakerFits` keeps deciding whether the frame fits each front, at the
  THREADED frame — a 100 mm drawer front that cannot carry an 85 mm
  frame stays plain, exactly as the saw would leave it.

Tests: F6 project carries `shakerFrame: 85`. The drawn inner rect's
inset on /1 equals 85.0 for every front that fits it (SVG numeric
assert); with no design the inset equals the profile default; a front
too small for the frame draws no inner rect. The card test of iron
rule 4 names its delta here.

Proof: `f2-shaker-85-not-60.png` — one front close-up with the measured
inset printed in the caption.

---

## F3 [HIGH] — /2 shows the drawers it is FOR, and the legs become legs

**Drawers.** `buildCarcassElevation` draws every drawer BOX as its
front-plane opening: one solid rect per box — the stack's x-extent by
each box's side height at its y — on the `SHELVES` layer with
`solid: true` (the door is off; you are looking straight at it),
`pen:'VISIBLE'`. Read the geometry from the engine's published
`drawer_box` panels — group them per box the way `hardware3d.js`
already reads the sides — never re-derive a height. Runner lines stay,
now crossing real boxes instead of air.

**Legs.** The bare rect is replaced (licensed) by a leg SYMBOL on /2
only: top plate line under the carcass bottom, a thin stem, a foot
line — three `THIN` lines per leg at the engine's own
`legs.positions` / `legs.width`. On /1 legs do not exist (F1).

Tests: F6's BUDR contributes exactly its box count of solid drawer
rects to /2 and zero to /1; `LEG_BLOCK` entity count on /2 equals
`legs.positions × 3` per legged unit and 0 on /1.

Proof: `f3-wall-2-drawers-and-legs.png`.

---

## F4 [HIGH] — the pen map: a silhouette is heavy, a panel edge is not

- Panel rects (all views) carry `pen:'VISIBLE'` (0.35) on the entity;
  the composed unit silhouette rect carries `pen:'OUTLINE'` (0.50);
  hidden stays `HIDDEN` (0.25); legs/hardware `THIN`; dimensions stay
  ANNOTATION — the ladder itself (`layers.js PEN`) does not change,
  only who asks for which rung.
- Section CUT lines (F5) are the one user of `PEN.CUT` 0.70 — the
  heaviest ink on any sheet, exactly as the table already says.

Test: an SVG stroke-width census of the F6 /1 and /2: the set of widths
is a subset of the PEN ladder; the count of 0.50-weight geometry rects
per sheet equals the number of drawn units (their silhouettes); no
geometry entity resolves above 0.50 outside a section sheet.

Proof: `f4-pen-census.txt` (the census, printed) +
`f4-line-weights.png`.

---

## F5 [HIGH] — the vertical sections. BOTH. The owner has said it twice.

### F5a — `Wall X /3`: the wall's own section

One section sheet per wall, bound after /2. The cut station is the
CENTRELINE OF THE LEFTMOST FLOOR-BAND MEMBER; every member of every
band whose x-range contains the station is drawn cut; members that do
not reach the station are omitted (a section is not a collage).

Drawn, per cut member, from params + profile + published answers ONLY
(iron rule 2): the carcass profile depth × height at its base — sides,
top and bottom boards as CUT bars of `board_t`; the back at its
thickness; the plinth recess; shelves as CUT bars at their y and their
depth setback; drawer boxes as side profiles — front setback to the
runner ladder's nominal for that row (`runnerAskFor`, the module that
owns the number since T42-F2), side height at its y; the front leaf at
the front plane. Building fabric: floor and ceiling in red. Chains:
heights up the right (bands), ONE depth chain along the bottom of the
deepest cut member. Title `Wall A /3`, and under it the station:
`section at unit 01`.

### F5b — `Section A-A`: through the cabinet the owner points at

- `DrawingModal`, walls list: a `Section A-A through:` dropdown listing
  every drawable unit (the census already knows them), default
  `— none —`. Choosing one appends a sheet `Section A-A — unit 02` to
  the SET (in `wallDrawingSheets`, so PDF, DXF and preview all carry
  it — one source, as ever). The choice is passed as an arg; it is NOT
  stored in the project this turn (a drawing option, not a design
  decision — if the owner wants it remembered, that is a sentence in a
  future turn).
- Content: the same section grammar as F5a applied to ONE unit at ITS
  centreline, plus that unit's own height/depth dimension pair.

Tests: F6 project → the sheet list is exactly `Wall A /1, /2, /3,
Wall B /1, /2, /3, Horizontal section` (+ `Section A-A — unit …` when
picked); the /3 cut-member set matches the station's x-test done in
the test itself; every CUT entity resolves to `PEN.CUT`; the A-A sheet
appears in the PDF page count and the DXF zip when picked and nowhere
when not.

Proofs: `f5a-wall-3-section.png`, `f5b-section-aa-through-budr.png`.

---

## F6 [CRITICAL] — the proof project is a KITCHEN, and every sheet is looked at

The T42 lesson, made law: a wall-drawing probe on a project with no
shelf, no drawer and no shaker proves paper exists, not that it says
anything.

- The seeded project, in the probe AND mirrored as a node fixture:
  - Wall A: BUD 600 with 2 shelves + BUDR 500 (its default drawer
    stack) touching it, WUD 600 hung over the BUD with 1 shelf;
  - Wall B: one BUD, plus one unit TURNED AWAY (the census sentence
    must appear under the sheet list);
  - design: `frontType 'S'`, `shakerFrame: 85`; handles on; room 2400;
  - the probe builds it through the STORE's own actions, driving the
    real app with real pointer input.
- The probe walks EVERY sheet in the preview, screenshots each, then
  exports the PDF and asserts bytes + page count = sheet count, and
  exports the DXF zip and asserts one file per sheet.
- Every F1–F5 test above runs against THIS project. A green turn is a
  turn where this kitchen's paper is right.

Proof: `f6-all-sheets-walked/` (one PNG per sheet, named as the sheet
is), `f6-wall-pdf-probe.txt`.

---

## F7 [HIGH] — the runner stand-in dies, and a missing article SPEAKS

Owner, 20.08, after the fourth grey overlay: *"jak kod nadpisuje to go
usuń."* The trace is in the header. Nothing overrides anything — the
grey L-profile is a fallback that wins by silence, and the owner has
ordered it shot. The missing rungs themselves are his own DATA upload
(`runner-bucket-patch.md`); this feature makes the app honest whether
or not that upload has happened yet.

- `3d/Hardware.jsx`, `Runners`: DELETE the stand-in rendering — the
  `plain` list, `placeFace`, `placeFlange` and both `<Pieces>` blocks
  (iron rule 3). A row with no model draws NOTHING. `reportHardware`
  stays byte-for-byte — the walk still tells a model from a hole, and
  its `reason` strings are unchanged.
- This is GLOBAL, by his order: offline, mock and showroom modes lose
  the grey runner too. An empty groove and a spoken warning, never a
  fake.
- `engine/checks.js`: extend the T32 runner rule's own plumbing with
  one more verdict. Catalogue LOADED and the drawer's resolved rung has
  no article → RED, per drawer: `Runner NL500 (T): no article in
  catalogue — upload the model or adjust the ladder.` Catalogue not
  loaded at all → ONE amber project-level note: `hardware catalogue
  unreachable — runners not verified`. Never a red wall per drawer for
  a dead network.
- Tests (node, the registry not the pixel), seeded with the COMMITTED
  SNAPSHOT (iron rule 8):
  - overlay wardrobe (box 490) → zero runner models mounted,
    `reason:'no-url'`, and the red check names NL 500 and the variant;
  - inject ONE test-local catalogue row for 500/T
    (`setRunnerCatalogue`, test scope only — the snapshot file is not
    edited) → the same drawer mounts a model and the red check clears;
  - no catalogue at all → the single amber note, zero reds;
  - a BUDR whose rung the snapshot DOES carry (450) mounts exactly as
    before — the deletion removed a fallback, not the channel.

Proofs: `f7-empty-rung-speaks.png` (the 3-D with no grey runner and the
red check beside it), `f7-with-article-mounts.txt` (the test-local
injection run, printed).

---

## Execution order

F1 → F2 → F3 → F7 → F4 → F5a → F5b; F6 is woven through the drawing
features (the project is built first, the assertions accrue per
feature). Sacrifice order if the night is short: F5b, then F5a, then
F4. **F1, F2, F3, F6, F7 never fall.**

## What this turn does NOT touch

`computeCabinet()` and every engine module outside `drawings/`,
`checks.js` and the named leftovers (`RightPanel.jsx`). The unit card's
behaviour beyond the two named deltas (shaker inset, pen widths). The
CNC/DXF machine path. The kits. The BOM — F7's check SPEAKS about the
missing article; the BOM already prints the yellow named spec for it
and keeps doing exactly that. The rail — T42 finished it; do not
reopen. Golden fixtures. The six configs' bytes. The live Supabase
bucket and `reference/hardware/movento.json` — the snapshot is refreshed
by the OWNER's curl, never edited by a turn.

## Morning audit will run

Fresh clone → clean-room install → full suite → build → t43-classify
vs main → BYTE-IDENTITY ×6, UNNAMED=0 → deletion audit against iron
rule 3's list, anything outside fails the turn → the unit-card pin test
read by hand → the showroom-⊆-snapshot guard read by hand → the F6
probe re-run by the auditor, every sheet's PNG opened and LOOKED AT →
the F7 registry probe re-run against the snapshot → verify/t43 complete
→ verdict → the owner's numbered eye-test list.