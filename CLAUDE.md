# CLAUDE.md, TURN 80 · IN-FRAME: THE BRITISH FRAME, ONE BOARD PER RUN

Run autonomously. Zero questions, zero stops: every number below is the
owner's own (21.10.2026, dictated at 22:03, settled at 22:14 and 22:40 after
two dimensioned sections and a 3D mockup he approved; his words are quoted
where they decide), so nothing here is asked again. If a point cannot be
done, skip it WHOLE, write why in the PR, and go on to the next. Full suite,
never `--silent`. Frames under `verify/t80/`. Branch `claude/t80-in-frame`,
one commit per F, PR at the end; the owner merges. Nothing lands in Petros
from this session. The owner, 22:47: *"daj zipa o caly zestaw do T80 ...
i ja uruchamiam w Codzie."*

Agents and parallel mode ON, as in T79. The central files have ONE writer
and every other agent hands that writer a patch: `engine/cabinet.js`,
`engine/profile.js`, `engine/design.js`, `engine/hingeLadder.js`,
`engine/doors.js`, `engine/autoparts.js`, `stores/projectStore.js`
(`paramsForEngine` lives there, line 1082 on 21.10), `stores/uiStore.js`,
`3d/UnitView.jsx`, `engine/cnc/dxf.js`. Agents that do not touch those
files run in parallel from the first minute: the LISP draft and parens
(PART A), the UI files (PRO, then retail through the copy script), the
drawings and BOM files, the goldens and fragments, the tests and the walk.
Never two agents in one file. The ORDER of the parts is the order of
value: PART A first (the law), PART G last.

## THE ORDER
The owner, 21.10.2026, in his words where they decide:
- 20:24: *"a co z british style kitchen z ramkami?"* The engine knows only
  lay-on fronts today (S/H/F/G/A are all lay-on, the hinge counted from the
  side's edge, the gap from the profile). In-frame is a different family:
  the fronts sit IN a frame, the frame is a visible piece of furniture.
- 20:31: *"4 - cnc blum in frame, 6 - mockup pls"*: ONE MDF board routed
  on the CNC with the openings cut through (the window mechanism of T25
  F1.2), never a frame glued from strips; Blum hinges for in-frame.
- 21:45, shown the first mockup (stile 45, frame 22): *"rama cos takiego
  dokladnie, ale szafki stoja od siebie 4 mm oddzielone, na wierzchu sa
  ramki, 18+18+4 daje 40 mm, pokaz przekroj."* Then, at 22:03, the numbers
  that replace that scheme:
- *"raczej plyta, malo kiedy bedzie jeden ciag dluzszy jak 2800, a jak
  bedzie to bedziemy laczyc."* ONE frame per run, from one board; a run
  longer than the board is joined.
- *"najlepiej jakbysmy zrobili wszedzie ramke 38 mm, wtedy bedziemy mogli
  szafki do siebie polaczyc i wtedy bedzie super; 1 mm bedzie w srodku
  wystawac, bedzie jeszcze lepiej 1 mm, bo veneer ma 19 mm x 2 bedzie
  idealnie."* 38 everywhere; cabinets BUTTED (0 mm); the stile between two
  cabinets 38 = 1 + 18 + 18 + 1, the 1 mm a LIP into the opening past the
  side's inner face; a veneered 19 side comes out flush.
- *"ramka 25, drzwi 22 i jest idealnie, 3 mm gap pomiedzy carcasem a
  drzwiami."* Frame 25 thick on the carcass face; the door 22, its face
  flush with the frame's face; 3 mm of air between the door's back and the
  carcass front edge.
- *"jak podwojne drzwi to miedzy drzwiami nie ma ramki, tylko miedzy
  szafkami."* No stile inside a pair of doors, no rail inside a drawer
  stack: the frame stands between cabinets and round the edge only.
- *"3 mm zawsze."* The gap of a front in its opening: 3 to the frame, 3
  between fronts.
- *"zawias na boku szafki (specjalne zawiasy z Bluma)."* The hinge plate on
  the carcass side, the cup in the door as today, a Blum in-frame hinge.
- 22:14, shown the vertical section with three rail variants: *"jezeli
  chodzi o dol to zdecydowanie wariant C"* (the bottom rail 38 = lip 1 +
  bottom 18 + 19 HANGING UNDER the carcass bottom, in front of the plinth);
  *"jezeli chodzi o gore to ma isc nad szafke tak samo jak dol, a pozniej
  ktos stolarz wypelni ta dziure i blat pojdzie na wierzch, taka jest
  idea"* (the top rail 38 = lip 1 + top 18 + 19 ABOVE the carcass top; the
  joiner fills those 19 on site; the worktop sits on top); *"zrob
  ostateczne mockupy."*
- 22:40, the final mockup approved point by point: *"1 tak"* (the whole
  table), *"2 na styk"* (the end panel butted to the side), *"3 per
  projekt"* (the switch is per project), *"5 tak"* (Blum in-frame on the
  side), *"6 informacja i na pdf na przekroju pokaz kawalek timber"* (the
  19 mm filler is a NOTE for the joiner, not a BOM line, and the PDF
  section shows a piece of timber there), *"7 tak"* (this turn), *"9 tak"*
  (the gloss numbers of 21.10 stay).

The mockup he approved: `verify/t80/mockup-inframe-final-sheet.png` (five
frames from the live scene over real units: a run of BUD 600 with one door,
BUD 800 with a pair, BUDR2 500 with two drawer fronts, an end panel on the
left, a WUD 600 above; worktop on the frame). The sections he read:
`verify/t80/przekroj-poziomy-v2-38.png` (plan, his numbers),
`verify/t80/przekroj-pionowy.png` (the rail variants; C is his),
`verify/t80/przekroj-poziomy-v1-40.png` (the 40 scheme he replaced; history
only). The mockup script that drew it, `scripts/chatfix-2110-mockup-
inframe-final.mjs`, is the geometry in code: read it before PART C.

## LAWS
T75's LAWS, T76's two, T77's one, T78's two and T79's two hold in full: done
means the whole road (UI, construction and collisions, BOM, drawing, save
and reload, export with readiness); LISP IS LAW and "lisp najpierw" for
every new cut geometry, and a T75+ kit is amended only under a licence that
quotes the owner; the six fossil kits are untouchable, so a project-level
decision reaches the engine ONLY through `paramsForEngine()` and a bare
`computeCabinet()` matches its LISP byte for byte; diagnose before you cut
(every BUG starts with a committed PROBE table); test the way the client
clicks (real mouse); one law one path; 1:1 = COPY through
`scripts/t78-copy.mjs`; numbers in the profile, never typed into the UI
without the owner's order; material never enters material; a carcass side
never stays visible; room refuses first and never silently; left adds,
right edits; a new function ships with its visible entry; kasacja is
physical deletion; no em or en dash in anything written, this file
included; every new source file begins with the Skylon Development Ltd
copyright header; nothing invented (a hardware number comes from the owner
or from a reference file that names its source, never from memory). Five
laws are this turn's own:
**The frame is a RUN's board, not a cabinet's** (the owner: *"raczej
plyta"*): one piece from the first cabinet's outer edge to the last one's,
cut from one board, the openings routed through; a run longer than the
board is joined at the centre line of a stile between two cabinets.
**38 everywhere** (*"wszedzie ramke 38"*): every stile and every rail of the
frame is 38 wide, nothing narrower, nothing wider.
**The lip follows from 38** (*"1 mm bedzie w srodku wystawac ... veneer 19 x
2 bedzie idealnie"*): the lip is what 38 leaves after two sides, `lip = (38
- t - t) / 2`: 1 for 18 mm boards, 0 for 19 mm boards, never negative (a
board over 19 is a red Check, not a wider stile). The frame's opening is
the carcass opening less the lip on every side.
**19 outside** (*"wariant C", "gora tak samo"*): the top rail stands `38 -
t - lip` = 19 above the carcass top, the bottom rail hangs 19 below the
carcass bottom;
nothing of the cabinet moves to meet it. The worktop sits on the frame; the
19 above the carcass is the joiner's filler (a note, timber on the section
drawing, never a BOM line).
**3 always** (*"3 mm zawsze"*): an in-frame front keeps 3 to the frame on
every side and 3 to its neighbour; the door is 22 in a frame 25, flush at
the face, 3 of air behind it.
In-frame OFF is today: with the switch off, every number, every board,
every golden, every pixel is byte for byte what main has. The switch
decides, nothing else leaks.

## FROZEN
1. Goldens: the six, T75's, T76's decoration file, T77's ornate records,
   T78's and T79's, byte-identical, proven by `scripts/t78-classify.mjs`
   (strict, no flag) with this turn's fragments `scripts/t78-classify.d/
   f40-t80-f*.mjs`, one per F that touches `src/engine` or `src/lib`. NO
   golden is re-pinned this turn (REPINNED stays empty in every fragment):
   in-frame is a new style, never a change to the lay-on fronts. New cut
   geometries get goldens of their own (PART F).
2. Fossil LISP untouched (the six kits and SKYLON_COMMON). This turn adds
   ONE LISP file, `reference/lisp/KIT_INFRAME.lsp`; T75+ kits are not
   amended (if a kit must change, that is a skip, named in the PR).
3. PRO freeze (`test/turn59-f1-the-switch.test.js`): every PRO file edited
   is licensed in `EXEMPT` with the owner's words from this file and
   re-frozen at its final hash in the same commit.
4. Lighting untouched. `engine/ledStrips.js`, `engine/lighting.js`,
   `engine/lightRig.js`, the light panels: not one line.
5. The gloss ride of 21.10 (`profile.appearance.gloss`, `3d/materials.js`
   surfaceFor, `3d/Scene.jsx` Environment): not one line (the owner: *"9
   tak"*).
6. Drawer boxes untouched: the box, its runner drilling, its Cabineo, its
   setbacks, byte for byte. Only the drawer FRONT changes under in-frame
   (PART D). The owner's reading of 22:40 on the question he did not
   understand: the box is as narrow as its runners make it, the 1 mm lip
   never touches it.
7. The lay-on front road untouched: `engine/doors.js`, `engine/frontBoard.js`,
   `engine/hingeLadder.js`, `engine/hinges.js`, `engine/handles.js` keep
   every lay-on number; in-frame ADDS a branch behind the switch and never
   rewrites a lay-on line.
8. The plinth, the cornice stack and the side infill untouched in geometry;
   the end panel changes only by its height and depth under in-frame
   (PART E).
9. The pull-down rail and its LOD files: parked, not one line.
10. The suite is green at the start (record the count: 7047 on 21.10 after
    the owner's push of the 2110 package; 7042 without it) and at the end.

## PART A · THE LAW: KIT_INFRAME.lsp (F1)

### F1 · THE LISP OF THE FRAME, FIRST
- New file `reference/lisp/KIT_INFRAME.lsp`, the Skylon header, the owner's
  quotes of 21.10 as its D-notes, parens balanced (the parens test grows
  with it). It is the law of three things, in this order:
  (a) THE FRAME OF A RUN. Input: the run's cabinets in order (each: x0, W,
  carcass H, bottom y0, side thickness t, its front cells), the end panels
  at each end (thickness, or none), the board length Lmax (profile
  `inframe.boardMax` 2800) and the numbers (`stile 38`, `rail 38`, `lip 1`,
  `frameT 25`, `outside 19`). Output: the frame board(s): width from the
  outer face of the first end panel (or the first carcass's outer face plus
  1 when there is no panel: the stile is then 19 = 1 + 18 and a neighbour
  would complete it) to the last one's; height `H + 2 x 19`; origin at the
  carcass bottom minus 19; the openings: per cabinet one rectangle `x0 + t
  + lip .. x1 - t - lip` by `y0 + t + lip .. y0 + H - t - lip` (the
  carcass's clear opening less the lip), each a CUTOUT (clockwise, the T25
  F1.2 window mechanism). The lip is derived from 38 (the law): `lip = (38
  - t - t) / 2`, 1 for 18 boards, 0 for 19 boards, so between two butted
  cabinets the stile is `lip + t + t + lip` = 38 whatever the board (the
  owner's *"veneer 19 x 2 bedzie idealnie"*). The outer stile at an end
  panel is 38 too: it covers `lip + t + panel` and overhangs the panel's
  outer face by what 38 leaves (1 for 18 + 18, 0 for 19 + 19); the owner
  22:40: *"na styk"*; the overhang is this turn's PROPOSED reading, named
  in the PR. The top rail: 38, from the carcass top less the lip to the
  frame's top edge, which is `38 - t - lip` = 19 above the carcass top. The
  bottom rail: 38, hanging the same 19 under the carcass bottom.
  (b) THE JOIN. A frame wider than `boardMax` is cut into pieces at the
  centre line of a stile between two cabinets, the fewest pieces with every
  piece within `boardMax`, each piece its own board `FRAME-1`, `FRAME-2`
  with a square butt (no joint hardware this turn: the owner, *"bedziemy
  laczyc"*, decides the joint later; a Check tells him the frame is in two).
  (c) THE FRONTS INSET. Each front's cell = the lay-on layout's cell of
  that front (the board the engine already cuts for it) mapped into the
  opening: the cell's outer edges become the opening's edges, the midline
  between two neighbouring fronts stays the midline; the inset front is the
  cell less 3 on a side that meets the frame and less 1.5 on a side that
  meets another front (3 between fronts). Thickness 22 (`inframe.frontT`).
  A door 600 wide carcass: opening 562, door 556; a pair in 800: opening
  762, doors 376.5 each (the owner saw 376.5 in the mockup and said *"1
  tak"*: half a millimetre is kept, not rounded); BUDR2 500: fronts 456 by
  the cell heights less the gaps.
- The LISP carries the three worked examples (600 one door, 800 pair,
  BUDR2 500) as its own test values; `test/turn80-f01-lisp.test.js` reads
  them back through the LISP census the repo already runs (the T57 "LISP is
  law" tests) and the parens test.
- Nothing in the engine moves in F1. The LISP is committed first and alone.

## PART B · THE SWITCH (F2)

### F2 · IN-FRAME PER PROJECT, ONE ROW IN SETTINGS
- Owner 22:40: *"3 per projekt."* The decision lives in the project's
  design, beside the sheen: `design.inframe` (boolean, default false),
  normalised in `engine/design.js` (`migrateDesign` gives an old project
  `false`), saved and reloaded with the project, in the project's history
  (one undo step).
- UI, PRO: `components/SettingsPanel.jsx` next to the `SheenSlider` row
  (line 1079 on 21.10) and `components/WizardSettings.jsx` next to its
  `SheenSlider` (line 1953): one row `FRONTS` with two buttons `Lay-on`
  and `In-frame (British)`, the chosen one lit, the hint under it: "In-frame:
  one routed frame per run, 38 mm, fronts set in it with 3 mm, hinges on the
  side." Retail `retail/design/Options.jsx` through the copy script, the
  same row. No numbers typed in the UI: 38, 25, 22, 3, 1, 19 live in the
  profile (`profile.inframe`, PART C) and are shown, never edited, in the
  hint's tooltip.
- `paramsForEngine(unit, design)` (`stores/projectStore.js` 1082) is the
  ONLY door to the engine: it hands `inframe: true` with the profile's
  numbers to `computeCabinet` and to the run builder (PART C). A bare
  `computeCabinet()` without the flag is today, byte for byte.
- Switching ON a project whose fronts are not 22 thick: the project stays
  as it is; Check #40 (PART F) goes red for every such front type: "In-frame
  fronts are 22 mm: front type f1 is 18 mm. Change the front material or
  switch back to lay-on." (the owner: *"drzwi 22 i jest idealnie"*; the
  frame is 25 and the 3 mm of air are not negotiable).
- EXEMPT: `SettingsPanel.jsx`, `WizardSettings.jsx`. Tests
  `test/turn80-f02-switch.test.js`: default false, migration, undo, the
  engine sees the flag only through `paramsForEngine`, a bare compute is
  identical with and without the design key.

## PART C · THE FRAME IN THE ENGINE (F3, F4)

### F3 · THE RUN GETS ITS FRAME (construction, BOM, labels)
- A run = the butted cabinets of one wall segment, in order, as the plinth
  run already groups them (`engine/autoparts.js`, the MANUAL plinth; PROBE
  first, committed as `verify/t80/f03-probe.md`: for the mockup's run of
  three plus the WUD, which units the plinth run groups, where its code
  decides a run's ends, and what an end panel reports at each end).
  In-frame uses THE SAME grouping, never a second one (one law one path):
  the frame board is a run part like the plinth board, built after the
  cabinets (it reads their results), owned by the run, listed in the BOM
  under the run with its own number, labelled `FRAME` (one piece) or
  `FRAME-1..n` (joined).
- The frame board: MDF 25 (`inframe.frameT`), material from the FRONT type
  of the project (it is sprayed with the fronts: the owner's green frame in
  the mockup), width and height by the LISP (a), origin by the LISP, the
  openings by the LISP (a) and (c), the join by the LISP (b). Grain: none
  (MDF). Edge: none (the face is sprayed, the edges are inside the paint).
- The gap between butted cabinets is 0: the engine's own run spacing is
  consulted in the PROBE; where today's run places cabinets with any gap,
  the frame reads the REAL x of each cabinet and the stile between two
  cabinets grows by that gap (the law is `lip + t + gap + t + lip`; the
  owner wants 0, so a gap shows in Check #41 as yellow: "In-frame: cabinets
  A and B stand 4 mm apart, the stile between them is 42, not 38").
- Units this turn: BUD, BUD_INT, BUDR, BUDR2, BUDR4, BUDTALL, SINK, WUD,
  WUD_GLASS (its door is a frame already: the inset front is the glass door
  as it is, inset), LOW_CABINET, WARDROBE and WARDROBE_LOW (a wardrobe run
  is a run). NOT this turn (the frame STOPS at them: the run splits into
  frame segments at such a unit, each segment its own frame with 19 outer
  stiles at the split, Check #42 names it): OVEN_BASE, FRIDGE,
  APPLIANCE_TALL2, DW_PANEL, CORNER_L_* (every corner kit), BLIND_*, WUD_HOOD*,
  WARDROBE_TOP, WARDROBE_DESK, FREE_PANEL, islands.
- Save and reload: the frame is derived, never stored (like the plinth);
  the design key is what is stored.
- Classifier fragment `f40-t80-f03.mjs`: gate `inframe` (opens only when
  `params.inframe` is true); proves no golden opens it; the six and T75/T78/
  T79 goldens identical by construction. New goldens `golden-inframe-run.json`
  (the mockup's run: BUD 600 one door, BUD 800 pair, BUDR2 500, end panel L,
  design.inframe true) and `golden-inframe-wud.json` (WUD 600 one door).
- Tests `test/turn80-f03-frame.test.js`: the probe table as assertions; the
  frame's width, height, origin and openings for the three worked examples
  of the LISP, read from the run result; the join at 3000 wide (two boards,
  the cut on a stile centre line); the BOM line; the labels.

### F4 · THE FRAME ON THE CNC (DXF, sheet, guards)
- `engine/cnc/dxf.js`: the frame board is an ordinary board with its
  openings as CUTOUT pockets (clockwise, `cutout: true`, line 182 on
  21.10), the T25 F1.2 window mechanism, on the layers the back window
  uses; the off-board guard (Check #9), the edge guard and the drill guard
  hold as they are (a cutout lies wholly inside the board by definition).
  The label `FRAME` (or `FRAME-1`), the EDGE arrow (the sheet's bottom edge
  = the frame's bottom rail), the run's name, the part number through the
  project as every board (1710j).
- `engine/cnc/layout.js`: the frame sits on the sheet like any board; a
  frame longer than the sheet chosen in the profile is the LISP's join (b),
  never a layout refusal; Check #43 yellow: "In-frame frame is 3 200 wide:
  two boards, joined at the stile between A and B."
- The CNC view (`components/CncView.jsx`, PRO; retail through the copy
  script): the frame appears in the tree under the run (as the plinth
  does), its openings drawn, its label anchored by `labelAnchor.js` (a
  frame's centre is an opening, so the anchor moves to a stile: the 19.10
  law already does this).
- Fragment `f40-t80-f04.mjs`; tests `test/turn80-f04-cnc.test.js`: the
  DXF fingerprint of `golden-inframe-run`'s frame (pinned in the golden),
  the guards green on it, the cutouts clockwise, the label on a stile.

## PART D · THE FRONTS INSET (F5, F6)

### F5 · DOORS AND DRAWER FRONTS, 22, SET IN THE OPENING
- Behind `params.inframe` only: every front of a unit in a frame is the
  inset front of the LISP (c): its cell from today's lay-on layout (the
  engine's own front cells, PROBE first: where `cabinet.js` lays out the
  front boards of a BUD, a BUD pair and a BUDR2, committed as
  `verify/t80/f05-probe.md`), then less 3 to the frame and less 1.5 to a
  neighbour; thickness `inframe.frontT` 22 (the project's front material
  must be 22: Check #40); its face at the frame's face (carcass front + 25),
  its back 3 in front of the carcass. A pair of doors: no stile between
  them, 3 between the leaves (`"miedzy drzwiami nie ma ramki"`). A drawer
  stack: no rail between the fronts, 3 between them.
- Shaker and every front style of today applies to the inset front as it
  applies to a lay-on one (the style is the front's own; its field 6 deep in
  a frame 60 stays the style's numbers). Handles and knobs by today's rules
  on the inset front's rectangle.
- The drawer BOX does not move (FROZEN 6): its front is the inset front,
  fixed as today.
- Tests `test/turn80-f05-fronts.test.js`: the three worked examples; a pair
  is two leaves of 376.5 with 3 between; a BUDR2's two fronts with 3
  between and 3 to the rails; the face plane at carcass front + 25; the
  lay-on numbers of the same units with the switch off, byte for byte.

### F6 · THE HINGE: ON THE SIDE, A BLUM IN-FRAME HINGE, FROM A REFERENCE FILE
- Owner: *"zawias na boku szafki (specjalne zawiasy z Bluma)"*; *"5 tak"*.
  The hinge's numbers enter the engine ONLY through a new reference file
  `reference/hardware/blum-inframe-hinge.json` (the pattern of
  `cliptop-hinges.json`: `system`, `units`, `rules`, `items`, a `source`
  line with the catalogue page or dealer page for every number). The file
  ships with the geometry of the Blum CLIP top BLUMOTION 110° INSET hinge
  (71B3750 screw-on, 71B3790 INSERTA) on a 0 mm cruciform plate (173H7100
  cam, 175H7100 two-piece), cup 35 / 13, the plate set back from the
  carcass front by `frontT + 1.5` (Blum's inset rule, dealer page of
  21.10) LESS the 3 mm the door stands forward of the carcass, so 20.5 for
  a 22 door; opening angle 110; door thickness to 24. Every number in that
  file is marked PROPOSED with its source URL; the owner chooses the
  article in the PR (the candidates the chat found on 21.10, all Blum, all
  sold in the UK "for in-frame": 71B3750 / 71B3790 110° BLUMOTION inset;
  71M2750 CLIP 100° sprung inset; 71B9750 95° thick-door inset; the
  dealer pack "71B3650+P" 110° BLUMOTION with a cruciform in-frame plate).
  The 155 of the lay-on ladder is NOT used in-frame (it is a zero-protrusion
  lay-on hinge).
- The ladder: `engine/hingeLadder.js` counts hinges by the door's height as
  today (the inset door is 40 shorter than the lay-on one, so a BUD 770 door
  of 726 keeps two); the cups on the door as today (35 / 13, the K distance
  from the json); the plate rows on the side at the json's set-back, at the
  cup heights; the drilling on the side (5 mm knock-in by today's
  `plate_default`) moved to the set-back column. The lay-on ladder is not
  touched (FROZEN 7): the inset branch is its own function beside it.
- 3D hardware: the inset hinge is drawn with today's GLB of the 110 (the
  json's `items` point at the files already in the bucket for the 110 and
  its plates; no new GLB this turn), placed by the inset geometry.
- Check #44 red when a cup would land within 3 of the lip (never on a 22
  door with K from the json; the check exists so a changed json cannot cut
  the lip away silently).
- Tests `test/turn80-f06-hinge.test.js`: the json loads and names its
  sources; a 726 door keeps two hinges; the plate column is at 20.5; the
  cup positions; the lay-on ladder of the same door with the switch off,
  byte for byte.

## PART E · THE END PANEL, THE PLINTH, THE WORKTOP AND THE FILLER (F7, F8)

### F7 · THE END PANEL REACHES THE FRAME
- Owner 22:40: *"2 na styk"*: the end panel stays butted to the carcass
  side as today. Under in-frame it is as deep as the carcass plus the frame
  (`+ 25`, to the frame's face) and as tall as the frame (carcass top + 19,
  plus the site trim of 19.10 as today); the frame runs 1 past the panel's
  outer face (PART A, PROPOSED reading). The plinth is untouched (set back;
  the frame hangs 19 in front of it). The wall unit's end panel the same:
  19 above and 19 below.
- `engine/siteTrim.js` and `KIT_SITE_TRIM.lsp` untouched: the trim is
  added after the in-frame height, as it is added after today's height.
- Tests `test/turn80-f07-end-panel.test.js`: depth + 25, height + 19, the
  trim on top of it; the lay-on panel with the switch off, byte for byte.

### F8 · THE WORKTOP SITS ON THE FRAME; THE FILLER IS A NOTE AND A PIECE OF TIMBER ON THE SECTION
- Owner 22:14: *"stolarz wypelni ta dziure i blat pojdzie na wierzch"*;
  22:40: *"6 informacja i na pdf na przekroju pokaz kawalek timber."*
- The worktop: wherever the engine or the 3D places a worktop on a base
  run (`addWorktop`, `stores/projectStore.js` 9847; the 3D worktop), under
  in-frame it sits 19 higher (on the frame's top edge). The wall units do
  not move. The cornice of a wall run stands on the frame's top edge
  (`corniceStackTop`, `engine/cornice.js` 90: `unitTop + 19`), PROPOSED,
  named in the PR.
- The filler: NO board in the BOM, NO DXF. A NOTE on the run in the BOM
  and on the unit card: "Site filler 19 mm x <run width> under the worktop
  (joiner, not supplied)". On the PDF SECTION of a base unit
  (`engine/drawings/section.js`, PROBE first for where the top and the
  worktop are drawn), a hatched piece of timber 19 high over the carcass
  top, behind the frame's top rail, labelled "site filler 19 (timber)", and
  the frame's section (25 x 808) drawn with its lips and its 19 above and
  below, the door 22 flush with its face, the 3 of air behind it. The wall
  unit section the same without the worktop.
- Tests `test/turn80-f08-filler.test.js`: the note text on the run; the
  section SVG contains the timber piece and the frame; no BOM line, no DXF
  for the filler; the worktop 19 higher only under in-frame.

## PART F · 3D, CHECK, GOLDENS (F9, F10, F11)

### F9 · THE FRAME IN 3D
- `3d/UnitView.jsx` (one writer) and a new `3d/InframeRun.jsx`: the frame
  of a run as ONE mesh (ExtrudeGeometry of a Shape with the openings as
  holes, exactly `scripts/chatfix-2110-mockup-inframe-final.mjs` does it),
  the front material of the project (sprayed, the sheen ride applies to it
  as to a front), 25 deep from the carcass face; the inset fronts drawn at
  the frame's face through today's front meshes (their rectangle and plane
  from the engine, nothing computed in 3D); the end panel to the frame's
  face; the worktop on the frame. Outlines, picking, X-ray, Hide fronts
  (hides the fronts, never the frame), Open all (the inset door swings as
  today's door, about the hinge side; the frame does not move), measure and
  dimensions see the frame as a board.
- Retail through the copy script where retail renders (`retail/design`).
- Walk, real mouse (PART G): the five mockup views re-shot from the real
  engine and put beside the mockup frames.

### F10 · THE CHECKS
- New checks, numbered from #40 (PROBE first: the next free numbers in
  `engine/checks.js`; if #40..#44 are taken, take the next free and say so
  in the PR): #40 red, front type not 22 under in-frame; #41 yellow,
  cabinets not butted (the stile grows); #42 yellow, a unit the frame stops
  at (the run split into frame segments); #43 yellow, the frame joined
  (wider than the board); #44 red, a cup within 3 of the lip. Each in the
  left messages and in the Check panel, each with its own test.

### F11 · GOLDENS AND THE CLASSIFIER
- `golden-inframe-run.json` and `golden-inframe-wud.json` (F3), pinned
  through `scripts/t78-goldens.mjs` with the owner's words of 21.10 in
  their meta; the DXF fingerprint of the frame in each; the six base
  goldens IDENTICAL (`scripts/t64-classify.mjs --dump` vs
  `verify/t70/goldens-base.json`); T75 16/16, T78 and T79 goldens held;
  REPINNED empty in every `f40-t80-f*.mjs` fragment. The walk and the
  tests prove in-frame OFF is main, byte for byte, on every golden.

## PART G · THE WALK (F12)

### F12 · scripts/t80-walk.mjs
- PRO, real mouse: new project, Settings, FRONTS: In-frame; a run of BUD
  600 (one door) + BUD 800 (pair) + BUDR2 500, end panel L, plinth, WUD 600
  above; front type sprayed 22 (F&B Card Room Green as the mockup, sheen
  30); frames `verify/t80/f12-01-three-quarter.png`, `f12-02-elevation.png`,
  `f12-03-junction-low.png`, `f12-04-top-filler.png` (the open end: 19 above
  the carcass, the worktop on the frame), `f12-05-wall-unit.png`, each
  from the mockup script's camera so the owner compares like with like;
  `f12-06-cnc-frame.png` (the CNC view, the frame with its openings and
  label), `f12-07-bom.png` (the frame line and the filler note),
  `f12-08-section.png` (the PDF section with the timber), `f12-09-check.png`
  (the project with an 18 mm front type: #40 red), `f12-10-off.png` (the
  switch back to Lay-on: today's picture). Output `verify/t80/walk.txt`.
- The walk asserts, from the engine through `window.__cc`: the frame 1920 x
  808 for the mockup's run (BUD 600 + 800 + 500 + end panel 18 + 1: PROBE
  the exact width the run reports and pin it), the stile between A and B
  38, the openings 562 x 732 / 762 x 732 / 462 x 732, the doors 556 x 726 and
  376.5 x 726, the WUD frame 602 x 758.

## NOT THIS TURN (named so nobody builds it)
- In-frame per cabinet or per run (the owner: per project).
- The hinge plate on the frame's stile (the owner: on the side).
- The joint hardware of a joined frame (the owner decides it later).
- Beaded, cock-beaded or moulded frames; curved frames; glazed in-frame
  doors beyond WUD_GLASS as it is; a frame on appliance housings, corner
  kits, blind kits, hoods, tops, desks, free panels, islands (the run splits
  there, Check #42).
- A second sheen ladder for veneer; any change to the gloss ride of 21.10.
- The two-leaf small door, divider L/R in 3D, the divider sleeves +18, the
  second-bay shelves a/b/c/d, notch b and c (numbers still missing), the
  pull-down rail: all parked, decisions pending.

## LINEAGE (one line a test reads from this file)
T79's horizontal notch stays as built and its owner's words stay here
because `test/turn79-f05-edge-notch.test.js` reads them from CLAUDE.md:
*"cut the corner działa idealnie, ale możesz zrobić mi też poziome cut?
wszystkich 4 rogów?"* (18.10.2026). A later turn's CLAUDE.md keeps this
line too, or moves the test to its own fixture.

## TESTS AND PROOF
Full suite; the goldens above; `scripts/t78-classify.mjs` strict with the
`f40-t80-f*.mjs` fragments (REPINNED empty everywhere); `scripts/t78-copy.mjs
--check` (retail only through the copy script); `scripts/t80-walk.mjs`, REAL
mouse, PRO and retail where retail is named, frames `verify/t80/f12-*.png`,
output `verify/t80/walk.txt`; parens for `KIT_INFRAME.lsp`; the LISP census
tests grow by the new kit; `test/turn80-fNN-*.test.js` per F with the probe
tables as assertions; NEW_FILES in `test/turn77-f5-no-copyright-line.test.js`
lists every new file; every F reports the six stations of DONE; the PR
proves in-frame OFF is main byte for byte (the six base goldens, every T75
to T79 golden, the DXF fingerprints of the lay-on fixtures).

## PR BODY
The probe tables verbatim (F3, F5, F8, F10); files and lines per F; the
LISP with its parens and its three worked examples; the EXEMPT entries;
the retail divergences; the goldens (old proven identical, the two new ones
listed with their fingerprints); the test count before and after; the walk
result with the ten frames; the hinge reference file's sources and the
article the kit shipped with (PROPOSED); what was skipped and why; THE
NUMBERS below, each marked CONFIRMED or PROPOSED.

## THE NUMBERS (all in profile.js under `inframe`; none typed in the UI)
| Number | Value | Source |
| - | - | - |
| Frame member width (stile and rail) | 38 | owner 22:03, CONFIRMED 22:40 |
| Frame thickness | 25 | owner 22:03, CONFIRMED |
| Front thickness under in-frame | 22 | owner 22:03, CONFIRMED |
| Air behind the front | 3 (= 25 less 22) | owner 22:03, CONFIRMED |
| Front gap to the frame and between fronts | 3 | owner 22:03 "3 mm zawsze", CONFIRMED |
| Lip into the opening | (38 - 2t) / 2: 1 for 18 boards, 0 for 19 | owner 22:03, CONFIRMED |
| Rail outside the carcass, top and bottom | 19 | owner 22:14 "wariant C", "gora tak samo", CONFIRMED |
| Cabinets in a run | butted, 0 | owner 22:03, CONFIRMED |
| Stile between cabinets | lip + t + gap + t + lip = 38 when butted | owner 22:03, CONFIRMED; the gap term T80 proposed |
| Stile at an end panel | 38, over lip + t + panel, the rest past the panel | owner 22:40 "na styk"; the overhang T80 PROPOSED |
| Frame board maximum | 2800, then joined at a stile | owner 22:03, CONFIRMED |
| Join hardware | none this turn | owner "bedziemy laczyc" |
| Switch | per project, default off | owner 22:40, CONFIRMED |
| Hinge | Blum in-frame on the side; file blum-inframe-hinge.json | owner 22:40 "5 tak"; the article T80 PROPOSED (71B3750) |
| Plate set-back from the carcass front | frontT + 1.5 less 3 = 20.5 | Blum inset rule, dealer page 21.10; T80 PROPOSED |
| Filler above the carcass | 19, a note and timber on the section, no BOM line | owner 22:40, CONFIRMED |
| Worktop | 19 higher under in-frame | follows the owner's "blat pojdzie na wierzch" |
| Cornice on a wall run | on the frame's top edge | T80 PROPOSED |
| Units with a frame | BUD, BUD_INT, BUDR, BUDR2, BUDR4, BUDTALL, SINK, WUD, WUD_GLASS, LOW_CABINET, WARDROBE, WARDROBE_LOW | T80 PROPOSED scope |
| Frame material | the project's front material (sprayed MDF 25) | the owner's mockup |
| Checks | #40 to #44 as named | T80 PROPOSED numbers |
