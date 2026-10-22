# CLAUDE.md, TURN 81 · THE DRAWINGS ARE THE MODEL: THE SET DRAWN 1:1 FROM WHAT THE ROOM SHOWS

Run autonomously. Zero questions, zero stops: every decision below is the
owner's own (22.10.2026, 20:50 to 22:57, over his own AutoCAD drawing of a
real job, verify/t81/dxf-analiza.png; his words are quoted where they
decide), so nothing here is asked again. If a point cannot be done, skip it
WHOLE, write why in the PR, and go on to the next. Full suite, never
`--silent`. Frames under `verify/t81/`. Branch `claude/t81-drawings`, one
commit per F, PR at the end; the owner merges. Nothing lands in Petros from
this session. The owner, 22:57: *"zalezy mi zebys rysowal w pdf 1 do 1 co
mamy na cabinet core ... koduj pls."*

Agents and parallel mode ON, as in T79 and T80. The central files have ONE
writer and every other agent hands that writer a patch: the new
`engine/drawings/projector.js`, `engine/drawings/wallSheets.js`,
`engine/drawings/layers.js`, `engine/drawings/setElevation.js`,
`engine/drawings/setPlan.js`, `engine/drawings/setSection.js`,
`engine/drawings/unitCard.js`, `lib/drawingExport.js`,
`components/DrawingModal.jsx`. Agents that do not touch those files run in
parallel from the first minute: the silhouette script and its reference
file (PART D), the layer table and its tests, the walk, the probes. Never
two agents in one file. The ORDER of the parts is the order of value: PART
A first (the projector, the one law), PART G last.

## THE ORDER
The owner, 22.10.2026, in his words where they decide:
- 20:50: *"maly problem to byl drawings: drawings nie odzwierciedlaja
  dokladnie tego co jest naprawde narysowane ... mowie o pdf."* The audit
  of 22.10 (verify/t81/pdf-audit.png) found it: the set's front view and
  perspective draw the in-frame kitchen without its frame, the unit card
  draws a run's plinth and frame at full run length on a 600 unit's card,
  the plan draws the plinth solid under a cut 400 above the floor.
- 21:19: *"zacznijmy generalnie od wszystkich szafek, nie tylko british
  style."* Every unit type, not in-frame only.
- 21:23, the set he wants, in this order: *"najpierw chce widziec 3d jak
  zrobiles pierwsza strona, pozniej chce widziec wszystkie fronty, bez
  przebijania carcasow, tylko to co widac za frontami, i tyle, fronty
  magenta, nastepnie widok wszystkich scian bez frontow, tak jakbysmy ukryli
  albo sciagneli fronty, pozniej przekroj z gory, i pozniej przekroje
  pionowe, a na koncu wizualizacja."*
- 22:56, over the DXF's conventions: *"1 shaker zostaw jak jest"*; *"2
  zawiasy na elewacji wedlug silnika i podobnie jak na moim dxf"* (black
  bars on the hinge edge, at the ladder's positions); *"3 galki 30 mm,
  wysokosc wedlug silnika (pozycja jak kto ustawi)"*; *"4 potrzebujemy
  drawings z numeracja unitow, reszta kolejnosci super"*; *"5 zostaw nasze,
  tylko dodaj brakujace (kazdy kolor zrob inny layer)"*; *"6 nie export do
  dxf, zrob layery wedlug cabinet core"*; *"7 zrob wedlug glb"* (the
  hardware on the sections as the GLB models are, not symbols); *"8 merge
  zrobiony"* (T80 is on main); *"elementy pod cnc: nie martw sie, zostaw,
  niewazne"* (the cut list and the CNC sheets stay as they are).
- 22:57: *"zalezy mi zebys rysowal w pdf 1 do 1 co mamy na cabinet core, a
  przeciez mamy x-ray, to tez mozna zrobic x-ray prosze."* The sheets show
  exactly what the room shows, and an X-ray sheet joins the set.

What his DXF taught (verify/t81/dxf-analiza.png, eight crops of
Balck_kicthen.dxf, a real in-frame job): the fronts sheet shows only what a
camera in the room would see (fronts, frame, cornice, plinth, end panels,
appliances), nothing bleeds through a front; the "no fronts" sheet is the
same wall with the fronts lifted off, the frame and the hinge marks staying
on it; hinges are solid black bars 6 x 70 on the hinge edge; knobs are
circles of 30; appliances are blue with their name and model; the worktop is
green, the building red; unit numbers 60 mm in green on every wall sheet;
the plan is cut through the carcasses with the worktop's outline and the
sink and hob on a worktop plan; the sections carry the runner, the legs and
the plinth clip as drawn hardware, not symbols; the frame of an in-frame
wall is its own drawing. We keep our inks and add what is missing (his 5).

## LAWS
T75's LAWS, T76's two, T77's one, T78's two, T79's two and T80's five hold
in full: done means the whole road; LISP IS LAW (no new cut geometry this
turn, so no LISP); the six fossil kits are untouchable and a bare
`computeCabinet()` matches its LISP byte for byte; diagnose before you cut
(every BUG starts with a committed PROBE table); test the way the client
clicks (real mouse); one law one path; 1:1 = COPY through
`scripts/t78-copy.mjs`; numbers in the profile, never typed into the UI
without the owner's order; no em or en dash in anything written, this file
included; every new source file begins with the Skylon Development Ltd
copyright header; nothing invented. Two laws are this turn's own:
**The drawings are the model** (*"1 do 1 co mamy na cabinet core"*): a sheet
is an orthographic projection of the SAME boards and the SAME hardware
instances the room draws, through one projector, with visibility decided by
depth. No sheet draws a board the room does not draw, no sheet leaves out a
board the room draws, and no sheet computes a position of its own. Where
the room and a sheet disagree, the sheet is wrong by definition.
**One ink, one layer** (*"kazdy kolor zrob inny layer"*): every colour on a
sheet is a layer of its own in `engine/drawings/layers.js`, every entity
names its layer, and the SVG and the PDF carry the layers as groups. The
DXF export of the set is not touched (*"nie export do dxf"*).

## FROZEN
1. The engine's cuts: not one line of `computeCabinet`, the kits, the
   fixtures, the goldens. `scripts/t78-classify.mjs` strict with this
   turn's fragments `scripts/t78-classify.d/f41-t81-f*.mjs`, REPINNED empty
   in every one; the six base goldens, T75, T76, T77, T78, T79 and T80
   goldens identical, their DXF fingerprints identical. This turn draws; it
   never cuts.
2. The CNC sheets, the cut list sheet, the labels, `engine/cnc/*`,
   `engine/drawings/dxf.js` and `lib/exporters.js` DXF paths: untouched
   (*"elementy pod cnc: zostaw"*, *"nie export do dxf"*).
3. The room: `3d/*` is READ by the projector's probe, never written. The
   hardware GLB files in the bucket are read by the silhouette script, never
   moved.
4. Lighting untouched (FROZEN 4). The gloss ride of 21.10 untouched.
5. PRO freeze (`test/turn59-f1-the-switch.test.js`): every PRO file edited is
   licensed in `EXEMPT` with the owner's words from this file and re-frozen
   in the same commit. Retail through the copy script.
6. The suite is green at the start (record the count: 7132 on 22.10 after
   PR #79) and at the end.

## PART A · THE PROJECTOR (F1)

### F1 · ONE PROJECTOR, FED BY WHAT THE ROOM DRAWS
- PROBE first, committed as `verify/t81/f01-probe.md`: for the T80 walk's
  kitchen (BUD 600 one door, BUD 800 a pair, BUDR2 500, WUD 600, END-L,
  plinth, worktop, in-frame on and off), the census of what the room draws:
  every board by role with its placement (`engine/joinery.js
  panelPlacement`, the seat `3d/panelSolid.js panelSolids` extrudes, with
  the cut-outs that make an in-frame frame's openings), every hardware
  instance by family (`engine/hardware3d.js hardwareInstances`: hinges,
  runners, rods, legs, rails, shelfSupports, kits; `doorHingeInstances` for
  the cups and plates; `result.drillSummary.handles` for the handles), the
  run parts (the T80 frame as the run element's FRAME board, the plinth
  run, the end panels, the worktops from `worktopsFor`, the cornice stack).
  The probe table is the contract the projector is tested against.
- New `engine/drawings/projector.js` (pure data, no React, no three.js):
  `projectRun(group, { view, cut, profile, worktops, room })` takes the
  wall group the sheets already build from (`wallGroups` in
  `wallElevation.js`) and returns the sheet entities of today's grammar
  (`rect`, `line`, `text`, `poly`, layer names), built as follows:
  (a) SOLIDS: every board of every member as a box or an extruded outline
  in the run's frame of reference (the member's x and base as today's
  `translate`), plus the run parts, plus every hardware instance as its
  silhouette (PART D) at its placement, plus the appliances' placeholder
  bodies.
  (b) VIEW: `front` (looking at the wall from the room), `plan` (a
  horizontal cut at the profile's cut height, looking down), `section` (a
  vertical cut at a station, looking along the wall, as `setSection.js`
  stations are chosen today), `top-of-card` (the unit card's top view).
  (c) VISIBILITY: painter's order by depth toward the viewer, every solid
  drawn as a filled polygon in the paper's white with its outline on its
  layer, so what stands behind is hidden by what stands in front (*"bez
  przebijania carcasow, tylko to co widac za frontami"*). A cut view draws
  the cut faces first (CUT pen, hatched where the profile hatches today),
  then what lies beyond the cut, in the same painter's order. The painter's
  fill is `#ffffff` and carries `data-fill="mask"` so the SVG and the PDF
  keep it (today's `svg.js` must not drop filled rects).
  (d) MODES: `fronts` (every solid), `no-fronts` (fronts off: the boards
  whose role is a front or a drawer front, their handles and their cups
  are left out; the frame, the hinge plates on the carcass, the drawer
  boxes, the runners, the shelves and their supports, the legs, the
  appliances stay), `xray` (every solid, but a front and a carcass board
  are drawn with no painter's fill and on the X-RAY inks of PART E, so the
  internals show through, as the room's X-ray does: PROBE what
  `3d/UnitView.jsx` fades under `xray` (line 1098 on 22.10: fronts to
  `appearance.xray.front` 0.42, carcass to `appearance.xray.carcass` 0.2)
  and mirror it: fronts the lighter grey, carcass the darker).
- The sheets of PART B call the projector and nothing else for their
  geometry; today's per-unit composers (`buildFrontElevation`,
  `buildCarcassElevation`, `drawerBoxRects`, `handleMarks`,
  `hingePlateMarks`, `legHardware`, `applianceMarks`, the plan's own boxes,
  the section's own cut rectangles) are retired from the SET's sheets:
  kasacja, physical deletion of what the set no longer calls, tombstones at
  most two lines. The unit card (PART F) moves to the projector too. The
  single `front-elevation` view and the CNC sheets keep their composers
  (FROZEN 2).
- Tests `test/turn81-f01-projector.test.js`: the probe census as
  assertions: for the walk's kitchen, in-frame on and off, the set of
  boards the projector was fed equals the set the room draws (by part id);
  every hardware instance has a silhouette or the named fallback; the
  fronts view of the BUD 600 shows exactly one door rectangle 556 x 726
  and no carcass line inside it; the no-fronts view shows the hinge plates
  and no door; the X-ray view shows both.

## PART B · THE SET, IN THE OWNER'S ORDER (F2)

### F2 · THE SHEET LIST
- `engine/drawings/wallSheets.js wallDrawingSheets`: the order becomes
  (*"najpierw 3d ... pozniej wszystkie fronty ... bez frontow ... przekroj z
  gory ... przekroje pionowe ... na koncu wizualizacja"*):
  01 `3D` (today's perspective view, first; the title block, the index and
  the revisions of today's cover move into its right column: the cover
  sheet as a page of its own is retired, T81 PROPOSED, named in the PR),
  02.. `Wall A · Fronts`, `Wall B · Fronts` ... (one per wall, every wall),
  then `Wall A · Without fronts` ... (every wall),
  then `Wall A · X-ray` ... (every wall),
  then `Plan · base units`, `Plan · wall units`,
  then `Wall A · Sections` ... (every wall, the stations as today, the
  owner's "One more section through" picker kept),
  then `Visualisation` (the render, as today),
  then `Cut list and materials` (as today, untouched).
  The island faces keep today's rule (plans and cut list, no wall sheet).
- Unit numbers on EVERY sheet that shows a unit (*"potrzebujemy drawings z
  numeracja unitow"*): fronts, without fronts, X-ray, plans, sections, the
  3D, in the UNIT_NUMBER ink at the profile's size, placed by today's
  `numberSlot` rule where a front covers the number's place.
- The window (`components/DrawingModal.jsx`): the sheet buttons follow the
  new order; the kind tabs stay. EXEMPT with the owner's words. Retail
  through the copy script where retail shows the set.
- Tests `test/turn81-f02-order.test.js`: the names and the order for the
  walk's kitchen (one wall: 01 3D, 02 Fronts, 03 Without fronts, 04 X-ray,
  05 Plan base, 06 Plan wall, 07 Sections, 08 Visualisation, 09 Cut list);
  two walls: every wall's three sheets before the plans.

## PART C · WHAT EACH SHEET SHOWS (F3, F4, F5, F6)

### F3 · THE FRONTS SHEET
- The projector in `fronts` mode: fronts, frame, cornice, plinth, end
  panels, worktop, appliances, the building (floor, ceiling, wall ends), the
  chains as today's `runChains` (the dimensions are not geometry and keep
  their home). Nothing behind a front shows.
- Shaker and every front style as today (*"1 shaker zostaw jak jest"*):
  the field's rectangle on the DOORS layer from `frontDecorationDrawing.js`
  as the single front elevation draws it, placed by the projector on the
  front's visible face.
- HINGES on the fronts sheet (*"zawiasy na elewacji wedlug silnika i
  podobnie jak na moim dxf"*): on every hinged front, a solid black bar
  `profile.drawings.hingeBar` { width 6, height 70 } on the hinge edge,
  centred on each cup's y from the engine's ladder
  (`result.drillSummary` cups or `doorHingeInstances`), inside the front's
  outline, on a new layer HINGE_MARK (PART E). A pair of doors: bars on the
  outer edges; a lift-up front: no bar (its fitting is a kit body).
- KNOBS AND HANDLES (*"galki 30 mm, wysokosc wedlug silnika, pozycja jak
  kto ustawi"*): from `result.drillSummary.handles` as today's
  `handleMarks`, drawn as the handle the project chose: a knob as a circle
  `profile.drawings.knobDiameter` 30, a bar as its two fixings joined by a
  line of the bar's length, on HANDLES. Nothing re-derived.
- APPLIANCES: the placeholder body as the room draws it (kit bodies from
  `hardwareInstances.kits`), on APPLIANCE, its name and model text from
  today's `applianceLabel`.
- Tests `test/turn81-f03-fronts.test.js`: the BUD 600's door carries two or
  three bars exactly at the ladder's cup heights (the count the engine
  gives, never typed); the pair's bars on the outer edges; the knob circle
  of 30 at the drill summary's point; an in-frame run shows its frame board
  and the 19 above and below; a lay-on run shows no frame; no CARCASE line
  lies inside a front's rectangle.

### F4 · THE SHEET WITHOUT FRONTS
- The projector in `no-fronts` mode (*"tak jakbysmy ukryli albo sciagneli
  fronty"*): the carcass with its shelves, dividers, drawer boxes, runners,
  rails, shelf supports, legs, the frame of an in-frame run (it is carcass:
  the owner's DXF keeps it), the hinge plates on the sides (today's
  `hingePlateMarks` positions, drawn from the silhouette), the appliances,
  the worktop, the building; the right-hand shelf chain as today.
- Tests `test/turn81-f04-no-fronts.test.js`: no DOORS entity; the drawer
  boxes of the BUDR2 as rectangles at the engine's box positions; the hinge
  plates at the ladder's heights on the side; the frame present under
  in-frame.

### F5 · THE X-RAY SHEET
- The projector in `xray` mode (*"mamy x-ray, to tez mozna zrobic
  x-ray"*): everything the fronts sheet draws, the fronts and the carcass
  boards unfilled and on the X-RAY inks (PART E), the internals in their own
  inks over them, so the sheet reads as the room's X-ray does. Unit numbers
  as on the fronts sheet.
- Tests `test/turn81-f05-xray.test.js`: the door rectangle present on
  XRAY_FRONT, the carcass on XRAY_CARCASE, the drawer boxes and runners in
  full ink; nothing filled.

### F6 · THE PLANS AND THE SECTIONS FROM THE SAME PROJECTOR
- The plans (`setPlan.js`): the projector in `plan` mode at the profile's
  cut heights (`drawings.set.planCut.base` and `.wall` as today): the cut
  faces of the boards the plane meets (sides, backs, the frame's stiles,
  the fronts), the boards below the plane in painter's order, the worktop's
  outline as today's hidden line on the base plan, the hinges on the plan
  as today. The plinth lies below the base cut: it is drawn as a hidden
  line (SHELVES pen, dashed) or not at all, never solid (the audit's
  finding 3; T81 PROPOSED: hidden line).
- The sections (`setSection.js`): the projector in `section` mode at each
  station: the cut boards with the CUT pen and today's hatch, the frame cut
  as T80 F8 draws it, the timber filler note as T80 F8, and beyond the
  cut what the painter's order leaves visible: the drawer boxes with their
  runners, the legs and the plinth clip, the shelves and their supports,
  the hinge plates, the knob in section, from the silhouettes (PART D).
- Tests `test/turn81-f06-plan-section.test.js`: the plan's cut rectangles
  equal the boards the plane meets (by part id); the plinth not solid on
  the base plan; the section through the BUDR2 shows two runner silhouettes
  at the engine's runner heights and the leg silhouettes at the leg
  positions; the T80 frame and the timber still there.

## PART D · THE HARDWARE AS THE GLB IS (F7)

### F7 · SILHOUETTES FROM THE MODELS
- Owner: *"7 zrob wedlug glb."* New script `scripts/t81-silhouettes.mjs`:
  for every hardware family the room draws (`3d/hardwareRegistry.js`
  slots: the CLIP top hinges and plates, MOVENTO runners by length, the
  legs, the plinth clip, the shelf supports, the rods, the handles and
  knobs that have a model, the lift and kit bodies that have one), load the
  GLB the registry names (from the bucket, read only; the same files the
  room loads), project its triangles onto the three planes (front, side,
  top) in the model's own millimetres, rasterise at 0.5 mm and trace the
  outer contour (and the inner holes larger than 2 mm) into polylines, and
  write `reference/hardware/silhouettes.json`: `{ family, article, file,
  sha256, views: { front: [[x,y]...], side: [...], top: [...] }, bounds }`,
  with a `source` line naming the GLB. The file is committed; the script is
  re-runnable and idempotent; a family without a GLB gets `fallback:
  "symbol"` and the sheet draws today's symbol for it, named in the PR.
- `engine/drawings/silhouettes.js` reads the file and hands the projector a
  polyline per instance in the instance's placement (position, rotation,
  mirror, the runner's length).
- Tests `test/turn81-f07-silhouettes.test.js`: the file exists, names its
  sources, every family the registry draws has an entry or a fallback; the
  MOVENTO 500 side silhouette is about 500 long; the leg's front silhouette
  is as tall as the leg; the polylines are closed and in millimetres.

## PART E · ONE INK, ONE LAYER (F8)

### F8 · THE LAYER TABLE
- `engine/drawings/layers.js` (*"zostaw nasze, tylko dodaj brakujace, kazdy
  kolor zrob inny layer"*): every existing layer keeps its colour and pen.
  New layers, each its own colour: HINGE_MARK (the black bars, `#111111`,
  filled), WORKTOP (the worktop's outline and fill, green `#2E8B57`,
  distinct from HANDLES' green: one ink one layer), XRAY_FRONT (fronts in
  X-ray, the grey that `appearance.xray.front` 0.42 gives over white:
  `#9A9A9A`, T81 PROPOSED), XRAY_CARCASE (`#C9C9C9` from 0.2, PROPOSED),
  MASK (the painter's white fill, no stroke), FRAME_BOARD (the in-frame
  frame on the sheets: it is front material and the owner's DXF draws it
  with the carcass ink; here `#5A2D5A`, a darker front ink, PROPOSED so the
  frame and the fronts set in it can be told apart in a legend). Every
  entity on every sheet names one of the table's layers; a test walks
  every sheet of the walk's kitchen and finds no entity off the table.
- SVG: `svg.js sheetToSvg` groups the entities by layer (`<g
  data-layer=...>`, one group per layer, in the pen order the table gives)
  instead of a flat list; the painter's masks keep their fill.
- PDF: `lib/drawingExport.js`: where jsPDF allows optional content groups,
  each layer becomes one named OCG the reader can switch; where it does
  not, the groups are preserved in order and the PR says so (a skip, not a
  stop). The legend on the set's column (`setSheet.js SET_LEGEND`) lists
  the new inks.
- Tests `test/turn81-f08-layers.test.js`: the table's colours are unique
  per layer; every sheet's entities are on the table; the SVG has one group
  per layer present; the PDF of the walk's set is bytes with the expected
  page count (today's `assertPdfBytes`).

## PART F · THE UNIT CARD AND THE AUDIT'S GAPS (F9)

### F9 · THE CARD DRAWS ITS OWN UNIT
- The unit card (`unitCard.js`, the three views): the projector in
  `fronts`, `no-fronts` (the CARCASS view) and `top-of-card` modes for ONE
  member, with the run parts (plinth, frame, worktop, cornice) CLIPPED to
  the unit's own width plus the profile's margin (`drawings.card.runMargin`
  50, PROPOSED): the audit's finding 2 (a 600 card drew a 1920 frame). The
  card's note lines and title block as today; the T80 filler note stays.
- The "Fronts" line of the card's title block prints the colour's name and
  its system once (the audit's finding 4: "F&B F&B Card Room Green").
- Tests `test/turn81-f09-card.test.js`: the card's widest entity is the unit
  plus the margin; the frame appears clipped under in-frame; the colour line
  once.

## PART G · THE WALK (F10)

### F10 · scripts/t81-walk.mjs
- PRO, real mouse: the T80 walk's kitchen, in-frame ON; Output > Drawings >
  Preview; every sheet pressed in order and shot full-sheet at 4 px per
  paper mm (`verify/t81/f10-01-3d.png`, `f10-02-fronts.png`,
  `f10-03-no-fronts.png`, `f10-04-xray.png`, `f10-05-plan-base.png`,
  `f10-06-plan-wall.png`, `f10-07-sections.png`, `f10-08-visualisation.png`,
  `f10-09-cut-list.png`), then the same kitchen in-frame OFF
  (`f10-10-fronts-layon.png`, `f10-11-sections-layon.png`), then the unit
  card of 01 (`f10-12-card.png`); the PDF exported and its page count read
  (`f10-13-pdf.txt`). Output `verify/t81/walk.txt`.
- The walk asserts, off the SVG on the glass: the fronts sheet has one door
  rectangle per door and no carcass line inside any; the hinge bars count
  equals the engine's hinge count for the wall; the knob circles equal the
  drill summary's handles; the frame rectangle under in-frame and none
  under lay-on; the no-fronts sheet has no DOORS entity and has the drawer
  boxes; the X-ray sheet has XRAY_FRONT and XRAY_CARCASE entities and no
  MASK; the plan's plinth is not a solid rectangle; the section shows runner
  silhouettes; every sheet carries the unit numbers; the sheet order is the
  owner's.

## NOT THIS TURN (named so nobody builds it)
- A DXF export of the set, or any change to `engine/drawings/dxf.js` and
  the CNC DXF (*"nie export do dxf"*).
- The cut list and the CNC sheets (*"elementy pod cnc: zostaw"*).
- A frame drawing per wall as the owner's DXF has (Frame 1, Frame 5 to 8):
  the FRAME board is already on the CNC sheet; a sheet of its own is a
  later decision.
- The worktop plan with the sink and hob cut-outs (the owner's DXF has it;
  the engine has no sink or hob cut-out geometry yet).
- Beading as four lines (*"shaker zostaw jak jest"*).
- Any change to the room, the engine's cuts, the hinge article of T80 (the
  trial door is still the owner's), the gloss ride, lighting.
- Island face elevations (T75 F9 stands).

## LINEAGE (one line a test reads from this file)
T79's horizontal notch stays as built and its owner's words stay here
because `test/turn79-f05-edge-notch.test.js` reads them from CLAUDE.md:
*"cut the corner działa idealnie, ale możesz zrobić mi też poziome cut?
wszystkich 4 rogów?"* (18.10.2026). T80's in-frame (merged as PR #79 on
22.10.2026) is the base of this turn; its numbers hold.

## TESTS AND PROOF
Full suite; the goldens untouched and proven (`scripts/t78-classify.mjs`
strict with `f41-t81-f*.mjs` fragments, REPINNED empty everywhere; the six
base goldens IDENTICAL; T75 to T80 goldens held; the DXF fingerprints of
every fixture unchanged); `scripts/t78-copy.mjs --check`;
`scripts/t81-walk.mjs` with real mouse and the frames above; the existing
drawing tests (turn40, turn42, turn53, turn71, turn72, turn75 and others
that read sheets) AMENDED with the owner's words where the projector changes
what a sheet carries, never deleted without a named reason; NEW_FILES in
`test/turn77-f5-no-copyright-line.test.js` lists every new file; every F
reports the six stations of DONE; the PR proves the cuts are untouched.

## PR BODY
The probe table verbatim (F1); files and lines per F; the retired composers
(kasacja balance: deleted / added); the EXEMPT entries; the retail
divergences; the goldens proven identical; the test count before and after;
the walk result with its frames; the silhouette file's sources and the
families that fell back to a symbol; DECISIONS TAKEN; SKIPPED AND WHY; RED
AT THE END; THE NUMBERS below, each marked CONFIRMED or PROPOSED.

## THE NUMBERS (all in profile.js under `drawings`; none typed in the UI)
| Number | Value | Source |
| - | - | - |
| Hinge bar on the fronts sheet | 6 x 70, solid black, on the hinge edge at the cup's y | owner's DXF (338 bars), 22:56 "podobnie jak na moim dxf", CONFIRMED |
| Hinge positions | the engine's ladder | owner 22:56 "wedlug silnika", CONFIRMED |
| Knob on the sheet | circle 30 | owner 22:56, CONFIRMED |
| Knob and handle positions | the project's own (drill summary) | owner 22:56 "pozycja jak kto ustawi", CONFIRMED |
| Shaker field | as today | owner 22:56, CONFIRMED |
| Sheet order | 3D, fronts, without fronts, X-ray, plans, sections, visualisation, cut list | owner 21:23 and 22:57, CONFIRMED |
| Unit numbers | on every sheet with a unit | owner 22:56, CONFIRMED |
| Inks | ours kept; added HINGE_MARK, WORKTOP, XRAY_FRONT, XRAY_CARCASE, MASK, FRAME_BOARD | owner 22:56 "zostaw nasze, dodaj brakujace"; the colours T81 PROPOSED |
| X-ray greys | #9A9A9A fronts, #C9C9C9 carcass (from appearance.xray 0.42 / 0.2) | T81 PROPOSED |
| Hardware on sections | silhouettes traced from the GLB at 0.5 mm | owner 22:56 "wedlug glb", CONFIRMED; the raster step PROPOSED |
| Plinth on the base plan | hidden line, never solid | audit 22.10; T81 PROPOSED |
| Card run margin | 50 | T81 PROPOSED |
| Cover | folded into the 3D page's column | T81 PROPOSED |
| Plan cut heights, section stations, chains, paper, scales | as today | profile |
