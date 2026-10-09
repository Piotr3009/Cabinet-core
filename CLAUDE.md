# CLAUDE.md, TURN 75 · THE BIG TURN: CORNERS, THE ISLAND, NEW KITS, SETS, STOCK

Run autonomously. Zero questions, zero stops: every decision below is the
owner's own (9.10.2026, with the list of 23.09.2026 behind it), so nothing
here is asked again. If a point cannot be done, skip it, write why in the PR,
and go on to the next. Full suite, never `--silent`. Frames under
`verify/t75/`. Branch `claude/t75-the-big-turn`, one commit per F, PR at the
end; the owner merges. Nothing lands in Petros from this session.

This is ONE turn by the owner's order, and it is large. The ORDER of the parts
below is the order of value: PART A first, PART G last. A part left undone is
left undone whole, named in the PR, never half-built. Where the harness offers
sub-agents, use them for PROBES, LISP drafts, goldens, tests and the walk; the
central files (`engine/cabinet.js`, `engine/profile.js`, `engine/types.js`,
`stores/projectStore.js`, `3d/UnitView.jsx`, `engine/library.js`) have ONE
writer, and an agent hands that writer a patch. Two sessions never rewrite one
file.

## THE ORDER
The owner, 9.10.2026, answering seven questions, verbatim:
1. *"jak zrobimy na opu 5.5 ultra z agentami to zróbmy jedną dużą turę"*: one
   turn, this file.
2. *"gpt robi fronty, reszta my"*: fronts and opening systems belong to a
   separate branch (the FRONTS BOUNDARY below). Everything else is here.
3. *"stock połączony z joinery core, na razie export import za pomocą csv coś
   jak production core, później api"*: PART F.
4. *"lisp najpierw"*: every new cut geometry gets its LISP before its engine
   code (LAWS below).
5. *"twoja droga, plus dodawanie szafek po bokach lub end panele, w całości"*:
   the island is an inside-out room of four faces, units on any face, end
   units or end panels at the ends, one worktop over the whole (PART B).
6. *"daj od razu narożniki przemyślane"*: the whole corner family in one
   turn, PART A, with the construction decided below.
7. Lighting is out of scope, by the owner's plan of 9.10: *"Oświetlenie
   pozostaje poza zakresem zmian."* No LED file changes; new kits take the
   lighting laws exactly as they are.

Behind these stand the owner's rulings of 23.09.2026 (Petros, "Lista do
następnej tury"): list 4 the corner cut-out, list 11 the L-shaped corner
wardrobe, and the recorded L-wardrobe rule: *one L-shaped board cut on the
CNC, flat-face door overlap, no 45° cuts.*

## LAWS
**Done means the whole road.** A feature is DONE when it works through the
real interface, builds a correct carcass with correct collisions, lands in the
cut list and the BOM, shows on the T71 drawing set, survives save and reload
(old projects included), and exports with its readiness state (F22). A thing
shown only in 3D is not done, and the PR says which of the six it reached.
**LISP IS LAW, and "lisp najpierw".** Every new cut geometry in this turn (the
L carcass, the blind blank, the corner notch, the dowel pattern) is written as
`reference/lisp/*.lsp` FIRST, paren-balanced in `test/turn35-lisp-parens.test.js`
(14 become 14 + the new files), and the engine then mirrors it line for line,
with a golden of its own and a classifier bucket. No cut geometry is invented
in JS and backfilled into LISP afterwards. Existing LISP files are untouched.
**Diagnose before you cut.** Every part begins with a committed PROBE table of
what exists on main for that part (the function, the file, the line, the
behaviour), before any edit.
**Test the way the client clicks.** `scripts/t75-walk.mjs` (T74's pattern)
uses a REAL mouse and the REAL buttons; the store is only read.
**One law, one path.** A corner, an island face, a notch or a second joint
system joins the existing path (collision, runs, plinth, cornice, worktop,
end panels, clearance); none of them gets a second path of its own.
**1:1 = COPY.** A PRO surface edited is re-copied to its retail copy by
`scripts/t75-copy.mjs` (`t74-copy.mjs` pattern), never by hand. Retail is the
WARDROBE configurator: wardrobe-family kits below reach retail; kitchen kits,
the kitchen island and the materials CSV stay in PRO this turn.
**Numbers do not enter the UI without the owner's order.** Every number in this
file is either the owner's or a PROFILE number marked `// T75 proposed, owner
to confirm`; the PR lists them in one table (THE NUMBERS PROPOSED, at the end).
A proposed number never appears as a typed field in the UI.
**Material never enters material. A carcass side never stays visible. Room
refuses first: nothing is clipped silently. Left adds, right edits. No em or
en dash in anything written: code, comments, commits, the PR.**
**Kasacja.** Where this file says delete, it is physical deletion: no gate, no
disabled flag, tombstone of at most two lines.

## THE FRONTS BOUNDARY (GPT's branch)
The owner: *"gpt robi fronty, reszta my."* This session does not edit:
`engine/doors.js`, `engine/shaker.js`, `engine/handles.js`,
`engine/splitDoors.js`, `engine/frontStyleArt.js`, `engine/hinges.js`,
`engine/hingeLadder.js`, `engine/frontDimensions.js`, `engine/frontGapClash.js`,
`FRONT_STYLE_OPTIONS` in `engine/design.js`, `components/DoorModal.jsx` and
its retail copy. Sliding, bifold, lift, pocket and tambour doors are NOT this
turn. Three licensed exceptions, each one line, each named in the PR:
- `engine/frontClearance.js`: rule 7 (`NEIGHBOUR.CORNER`) receives its number
  from `profile.doors.clearance.corner` (F2), and two neighbour kinds are added
  for the L kit's door pair (F4). Nothing else in the file moves.
- Every kit below hangs its doors through the EXISTING door path (the kit's
  `doorCount`, `hingeRule`, `cupRule`, the per-bay door the engine already
  cuts). No new door construction, no new opening system.
- The blind blank (F3) and the dummy hob front (F14) are FIXED front pieces
  emitted beside the doors, through the role machinery the end panel uses:
  they are not doors and carry no hinge.
The fronts branch starts from the same main, follows this file's LAWS and
FROZEN rules, and edits only the files named above; its goldens are the six
plus whatever it adds. Integration is the owner's merge, in the order the
owner chooses; a conflict in a central file is resolved by this session's
integrator, never by the fronts branch rewriting it.

## FROZEN
1. Goldens x6 byte-identical (`scripts/t64-classify.mjs dump()` against
   `verify/t70/goldens-base.json`). `scripts/t75-classify.mjs` (T74's pattern)
   names every engine delta of this turn and proves no golden can reach it.
   Every new kit and every new cut geometry gets a golden of its own under
   `fixtures/` (named in each F) and a line in the classifier.
2. Existing LISP untouched. `engine/drawings/**` read-only unless a point
   below needs the drawing to show what the engine now cuts (then licensed in
   the classifier). Lighting files (`engine/ledStrips.js`, `engine/lighting.js`,
   `engine/lightRig.js`, `3d/*Light*`, `components/LightingPanel.jsx` and the
   retail `lighting/`) untouched.
3. PRO freeze (`test/turn59-f1-the-switch.test.js`): every PRO file edited is
   licensed in `EXEMPT` with the owner's words from this file and re-frozen at
   its new hash in the same commit. The owner's words for this turn are the
   seven answers in THE ORDER and the quotes in each F.
4. The suite is green at the start and green at the end.
5. The FRONTS BOUNDARY above.

## PART A · CORNERS, THE WHOLE FAMILY (F1 to F8)
The owner: *"daj od razu narożniki przemyślane."* A real kitchen and a real
fitted wardrobe close an internal corner in one of three ways, and this turn
ships all three plus the pieces that turn the corner with them: the CORNER
POST with a BLIND unit (most English kitchens), the TRUE L CARCASS (the
owner's L law), and the CORNER NOTCH that lets a carcass live beside a pipe or
a wall return. Today main has none of them: `L_SHAPE` is eight undrilled
rectangles with no legs, doors, plinth or worktop (T30, parked by BLOCKERS
#63); rule 7 in `frontClearance.js` is PARKED (`null`); `worktop.js` refuses a
second wall ("one slab cannot turn a corner yet"); the plinth has no corner
return; `corniceCorner` mitres only equal depths (BLOCKERS #92).

### F1 · THE CORNER RULEBOOK, ONE MODULE
- New `engine/corners.js`, pure: `cornersOf({ units, walls, profile })`
  returns every INTERNAL corner where a run on one wall meets a run on the
  adjacent wall whose depth bands overlap (the same test `collision.js
  wallObstacles` makes when it flags `corner: true`), as
  `{ corner, wallA, wallB, runA, runB, solution }`, where `solution` is one of
  `'blind'` (F3 kit stands at the corner), `'L'` (F4 kit stands there),
  `'post'` (a post and nothing blind: the corner is dead space), or `'none'`
  (two plain units: the door at the corner cannot open). EXTERNAL corners
  (island faces, F9) are returned by the same function with `kind:
  'external'`.
- `'none'` is a CHECK, in words, naming both units: the engine never guesses a
  post for a job that has not asked for one.
- Every consumer below (runs, plinth, cornice, worktop, clearance, the corner
  stop) reads THIS module. No second corner detection anywhere.

### F2 · THE CORNER POST
- A corner post is an AUTO-PART, the sibling of the side infill
  (`engine/autoparts.js sideInfill`): a board of the FRONT material and front
  thickness, `profile.corner.postMm` wide (`50 // T75 proposed, owner to
  confirm`), standing in the front plane of run B at the corner, from the
  plinth line to the top of run B's unit (the end panel's `carcass` height
  law), BOM role `corner_post`, cut list line, CNC a plain rectangle.
- The CORNER STOP: a unit on wall B that approaches a corner where wall A's
  run ends in a BLIND kit or a plain unit stops at `d_A_face + postMm`
  (`d_A_face` = run A's depth + front thickness + the door gap): the same
  clamp `clampUnitX({ wallMargin })` uses for the wall, landing on the stop
  with the magnet (BACKLOG #15's grammar), and the post appears when the unit
  lands. Pulling away removes the post (T74 F11's reversibility, extended
  through the same function).
- Rule 7 gets its number: `profile.doors.clearance.corner = 3 // T75
  proposed` (a post is a rigid neighbour, like an infill). The Check that said
  "parked" now measures.
- The HINGE LAW at a corner, kitchen and wardrobe alike: the door nearest an
  internal corner hinges on the corner side so its handle swings away. This is
  the wardrobe's own corner law (T72, T73 F5, T74 F11) called for every
  family through the same function; nothing new is written for it.
- Families: kitchen base, kitchen wall (the post runs the wall unit's
  height), wardrobe (post from the plinth line to the wardrobe top). Walk: a
  base run into a corner and a second run on the adjacent wall, the post
  stands, the clearance is 3, the hinge is on the corner side; pulled away,
  all of it goes.

### F3 · THE BLIND KITS, THREE OF THEM
A blind unit stands at the corner with its door at the reachable end and a
BLANK where the adjacent run hides its front. It is the parent kit at its own
width, hole for hole; only the face differs.
- Three types in `engine/types.js`, copied field by field from their parents:
  `BLIND_BASE` from `BUD` (prefix `BB`), `BLIND_WALL` from `WUD` (prefix
  `BW`), `BLIND_WARDROBE` from `WARDROBE` (prefix `BX`, family wardrobe).
  Each carries `blind: true`, `doorCount: 1`, and a defaults block
  (`profile.blindBase.defaults` etc.: base 1000 wide, wall 900, wardrobe
  1200, `// T75 proposed, owner to confirm`).
- The BLANK: `blindMm` is COMPUTED from the corner: the adjacent run's depth +
  front thickness + `corner.postMm` + `clearance.corner`, measured from the
  corner along the unit; it is a fixed front piece (front material, front
  thickness, role `blind_blank`, emitted the way the end panel is) with NO
  holes: its fixing is the joiner's (BLOCKERS entry, readiness `manual`, F22).
  Clicking its dimension (T73 F3 field) overrides `blindMm` by hand; the
  override is the client's and the automat never takes it back.
- The DOOR: one leaf, width = W minus blank minus the gaps, hinged on the far
  side, through the parent's door path. The carcass is drilled as the parent
  kit at width W: the test asserts it hole for hole against a BUD / WUD /
  WARDROBE of the same W (the T30 pattern: TWIN, BIN).
- Inside: shelves run the full width (the blind part is reachable through the
  door); the wardrobe's rail runs full width into the blind part and no
  divider may be placed inside the blind part (refused in words).
- Library: Base units "Blind corner", Wall units "Blind corner wall", the
  Wardrobes category "Blind corner wardrobe"; retail EXTRAS a button `ADD
  CORNER WARDROBE` beside `ADD ANOTHER WARDROBE` (places a `BLIND_WARDROBE`
  into the nearest free corner of the room, or refuses in words when no corner
  is free).
- No new LISP: the carcass is the parent kit's own cut; the blank is a
  rectangle. Said in the PR. Goldens: `golden-blind-base.json`,
  `golden-blind-wall.json`, `golden-blind-wardrobe.json`.

### F4 · THE TRUE L CARCASS, THE OWNER'S LAW, LISP FIRST
The owner's recorded rule (Petros): *one L-shaped board cut on the CNC,
flat-face door overlap, no 45° cuts.* T30's two-rectangle placeholder
contradicts it and goes.
- LISP FIRST: `reference/lisp/KIT_CORNER_L.lsp`, derived from
  `KIT_BUD_FULL.lsp` + `SKYLON_COMMON.lsp`, with the boards: `BOTTOM-L` and
  `TOP-L` (ONE L outline each: outer W along the unit's own wall, outer D
  along the adjacent wall, arm depth d, the bite at the inner corner (d, d),
  dog-bone relief at the inner corner, radius = the puzzle cutter radius),
  `BACK-A` (W x H, on the unit's wall), `BACK-B` (D minus G x H, on the
  adjacent wall, butting BACK-A at the room corner, screwed on the back screw
  row of SKYLON_COMMON), `SIDE-A` (at x = W, d deep), `SIDE-B` (at y = D, d
  deep), `SHELF-L` (one L outline, the shelf clearances of the profile). The
  puzzle joints are KIT_BUD's own: sides into top and bottom with the same
  tenons and sockets; the L's inner edges carry no joint; the backs join as
  KIT_BUD's back joins. Six legs for the base version, one near each vertex
  of the L (the four outer corners, the two front ends of the arms); the leg
  plate drilling is KIT_BUD's. Paren-balanced before any JS.
- Then the kits: `CORNER_L_BASE` (family kitchen, heightGroup base, legs,
  plinth, prefix `CL`, defaults 900 x 900, arm depth = base depth),
  `CORNER_L_WALL` (from WUD: hangers in both backs, no legs, prefix `CW`,
  defaults 600 x 600, arm depth = wall depth), `CORNER_L_WARDROBE` (family
  wardrobe, tall, wardrobe legs, one rail per arm, prefix `CX`, defaults 1000
  x 1000, arm depth = wardrobe depth). All three `corner: true`, `ownDepth:
  true`; the engine's L builder (`cabinet.js`, replacing T30's block) mirrors
  the LISP. `// T75 proposed, owner to confirm` on every default.
- THE DOORS, flat-face overlap, no 45°: door A hangs on SIDE-A and runs to
  the inner corner with ZERO clearance on its inner edge (it is covered);
  door B hangs on SIDE-B and its inner edge stops `front_t +
  clearance.corner` beyond the inner corner, so its body stands in front of
  door A's inner strip: door B overlaps door A, door B opens first, the
  drawing and the BOM carry the line "door B opens first". Which arm is B is
  `profile.corner.overlap = 'adjacent' // T75 proposed`: the arm on the
  adjacent wall overlaps. The two neighbour kinds this needs
  (`CORNER_COVERED` = 0, `CORNER_OVERLAP` = front_t + clearance.corner) are
  the one licensed addition to `frontClearance.js`. Both doors go through the
  existing door path, one per arm; the hinge ladder is the family's own.
- Plinth: two boards meeting at the inner corner, square butt (F6). Cornice
  and top infill (the wardrobe) follow the L front with an INTERNAL mitre at
  the inner corner (`infillCornerMitre`, `corniceCorner`).
- Placement: the L stands in a room corner only (Room refuses first: any
  other spot is refused in words); it occupies the corner square in both
  walls' depth bands, so `cornersOf` reports `'L'` and the corner stop for
  both runs is the L's own arm end; neighbours on both walls get rule 1
  clearances against the L's doors.
- KASACJA of T30: delete the `L_SHAPE` type, its builder block in `cabinet.js`
  (line ~3400), its library row and its tests; `TYPE_ALIASES` keeps BOTH old
  names forever: `CORNER: 'CORNER_L_BASE'`, `L_SHAPE: 'CORNER_L_BASE'`, and
  `loadProject` migrates `cornerArm` to the new params. Tombstone two lines.
- Goldens: `golden-corner-l-base.json`, `golden-corner-l-wall.json`,
  `golden-corner-l-wardrobe.json`. Test: the engine's L against the LISP's
  numbers, board by board.

### F5 · THE WORKTOP TURNS THE CORNER, THE CUT-OUTS, THE UPSTAND
- `worktop.js worktopsFor` accepts two runs on adjacent walls: two slabs and
  ONE JOINT RECORD at the corner, `{ kind: 'butt', at, boltCount: 3 }` (`//
  T75 proposed`: a square butt joint, the slab on wall A runs through to the
  wall, the slab on wall B butts it; three worktop connector bolts as a
  hardware BOM line; the bolt pockets are a NOTE on the worktop drawing and
  readiness `manual`, never CNC). The L kit's worktop is one slab shaped like
  the L.
- CUT-OUTS as records on the worktop: a SINK unit under the slab proposes a
  sink cut-out (rectangle = the carcass opening inset `profile.worktop.cutout.
  insetMm = 20` each way, corner radius `10`, `// T75 proposed`); a drawer unit
  flagged `hob: true` (F14) proposes a hob cut-out the same way. A record is
  drawn on the worktop sheet of the T71 set and listed as a BOM note; it is
  machined only when the worktop is a CNC part (profile flag `worktop.cnc`,
  default false).
- UPSTAND: an auto-part along the wall behind every base run that has a
  worktop, `profile.worktop.upstand = { heightMm: 100, thicknessMm: 20 } //
  T75 proposed`, worktop material, on and off per run like the plinth
  (BACKLOG #16's grammar: added by a decision, visible only then), BOM role
  `upstand`, cut list line.

### F6 · PLINTH AND CORNICE AT THE CORNER
- PLINTH, internal corner: the plinth of the run that STARTS at the corner is
  lengthened to butt the face of the other run's plinth under the post
  (square butt, no mitre: the owner's "no 45° cuts"). The L kit's two plinths
  butt at the inner corner. EXTERNAL corner (the island, F9): 45° mitre, the
  cornice's own mitre arithmetic reused.
- CORNICE, BLOCKERS #92, decided for the owner as `profile.cornice.cornerMode
  = 'step' // T75 proposed`: where a deeper run meets a shallower one at a
  corner, the cornice takes an external mitre at the deeper unit's front
  corner, returns along its side for the depth difference, and meets the
  shallower run's cornice in an internal mitre. `corniceCorner` stops refusing
  unequal depths and emits the return piece; the refusal sentence stays for
  the case the profile does not name.

### F7 · THE CORNER NOTCH, LISP FIRST (list 4)
The owner, 23.09.2026: *"WYCIĘCIE NAROŻNIKA w karkasie (mega ważne, np. L-ka
przy ścianie, rurze). Klikasz 'wytnij narożnik', program podświetla
narożniki, wybierasz, podajesz wysokość, głębokość, szerokość (np. 200x200).
Program dorysowuje elementy wg logiki karkasu, cięcie realne przez wszystkie
panele tworzące róg (w tym dno, automatycznie), z dogbone'ami i
nawierceniami."*
- LISP FIRST: `reference/lisp/KIT_NOTCH.lsp`, a MODIFIER on the KIT_BUD and
  KIT_WARDROBE boards: inputs the plan corner (`BL`, `BR`, `FL`, `FR`), width
  `w` along the back, depth `d` into the carcass, height `h` (0 = full
  height). Outputs, board by board: TOP and BOTTOM take the w x d notch with
  dog-bone relief (radius = the puzzle cutter radius); the SIDE at that corner
  takes a rectangular notch d x h in its rear corner (full height: its depth
  becomes D minus d and the puzzle sockets on that edge are RE-PLANNED by
  `puzzle.sidePanelGeometry` for the shorter edge); the BACK takes a notch w x
  h at that corner (full height: it becomes W minus w); when w is greater
  than the side thickness the notch is BOXED: a `RETURN` board (d x h, or d x
  H) and, for a partial notch, a `LID` (w x d), screwed on the back screw row
  of SKYLON_COMMON, readiness `manual` for their fixing; every SHELF whose
  plan crosses the notch takes the same outline; the plinth is notched at a
  front corner. The paren test holds before the JS exists.
- Engine: `engine/notch.js` applies the modifier after the carcass and before
  the drilling pass, so the drilling that falls inside the notch is dropped
  and the sockets are re-planned (the PROBE names which sockets of a BUD
  200 x 200 BL notch move, as a table). The Check refuses a notch that eats a
  joint it cannot re-plan, naming the board.
- UI: `CUT CORNER` in the selected unit's menu (PRO right panel; retail SIZE
  step for a wardrobe): the four plan corners light on the 3D in the side
  ask's highlight grammar (T73 F2, T74 F1); a click opens a SMALL ANCHORED
  MODAL at the click (the T74 F1 kind) with three fields `WIDTH`, `DEPTH`,
  `HEIGHT` prefilled `200`, `200`, `full` (`profile.notch.defaults // T75
  proposed`); Enter applies, a click elsewhere closes and cuts nothing. Every
  family, PRO and retail (by the copy script).
- Golden: `golden-notch.json` (a BUD 600 with a 200 x 200 full-height BL
  notch). The six goldens cannot reach it: no project carries `notch` until
  it is clicked.

### F8 · REVERSIBILITY AND THE WALK OF THE CORNER
- Everything the corner automat adds (post, hinge flip, blank size, worktop
  joint, plinth butt, cornice return) is undone when the cause goes (T74
  F11's law, one function). What the client chose by hand stays.
- Walk, real mouse: (a) base run into a corner + second run: post, clearance,
  hinge; (b) BLIND_BASE at the corner, second run lands on the stop, blank
  width equals the arithmetic; (c) CORNER_L_BASE in a corner with a run on
  each side, doors A and B, worktop L; (d) two wardrobes into a corner in
  retail, `ADD CORNER WARDROBE`; (e) CUT CORNER on a wardrobe 200 x 200 BL,
  the side's sockets re-planned (table), the cut list shows the RETURN board;
  (f) pull each one away, all gone.

## PART B · THE ISLAND (F9 to F11)
The owner: *"twoja droga, plus dodawanie szafek po bokach lub end panele, w
całości."* An island is an INSIDE-OUT ROOM: a rectangle whose four faces are
places to stand a unit against, with "inward" pointing OUT. Nothing about it
is a wall.

### F9 · THE ISLAND ENTITY
- `room.islands = [{ id, cx, cy, w, d, rotation }]` (`engine/room.js`
  migration: absent = none). `roomWalls` returns, after the real walls, four
  FACES per island with `island: id`, `face: 'A' | 'B' | 'E1' | 'E2'`, their
  frames (`start`, `along`, `inward` pointing away from the island centre),
  so `collision.js`, `runs.js`, `autoparts.js`, the plinth, the end panels,
  the worktop and the lighting rig read them as places to stand units.
- A face is NOT plaster: the PR lists every consumer of `roomWalls` and which
  side it took. Faces are: not drawn in `3d/Room.jsx`, not in `wallsInScope` /
  `wallIndicesInScope` (the "3 walls" family), not dimensioned as walls, not
  given openings, slopes, recesses or boxes, not given side infills or scribes
  (`sideInfill` returns none against a face), not elevated by
  `WallElevationModal` this turn. They ARE: obstacles in every other wall's
  frame (the existing `wallObstacles` arithmetic), run hosts, plinth hosts,
  end-panel hosts, worktop hosts.
- Room refuses first: an island must lie inside the room polygon with its
  footprint clear of every unit and box; a move that would collide is refused
  naming the obstacle. PRO only this turn (kitchen jobs); the retail copy of
  the room modal is byte-copied with the island button gated by the job's
  family, which retail never meets.
- UI: Room setup gets `ADD ISLAND` (default `profile.island.defaults` = 1800 x
  900, `// T75 proposed`), the island draggable in the plan with its
  dimension labels clickable (T73 F3 field), `rotation` in 90° steps through
  the existing `rotateUnit` grammar applied to the island.

### F10 · UNITS ON THE FACES, THE ENDS, THE PANELS
- A unit is added to a face as to a wall (`addUnit` with the face's index;
  the library's plus points on the plan show the faces). The two long faces
  take runs back to back; an END face takes an END UNIT turned to face out
  (a drawer unit or an open unit at the island's end, the owner's "szafek po
  bokach").
- The panel law extended to backs: *"bok karkasu nigdy nie zostaje
  widoczny"* holds for a BACK on an island. An empty long face gets an auto
  BACK PANEL (front material, the end panel's height law, role `back_panel`);
  an empty end face gets the auto END PANEL the free end of a run already
  gets (`endPanelAuto`), sized to the whole island depth. A unit added to a
  face takes the automat's panel off (the vanishing law); a panel the client
  added by hand stays.
- Plinth: one per face, 45° mitres at the island's four external corners
  (F6). Legs, end panels, cornice (none: base height), lighting: the existing
  laws, unchanged.

### F11 · ONE WORKTOP OVER THE WHOLE
- `worktopsFor` on an island returns ONE slab: the bounding rectangle of
  every unit and panel on the island plus the front overhang law on every
  face (20 mm), plus a per-face `extend` the client sets (the existing
  `extendFront` record, now per face; a seating overhang of
  `profile.worktop.seatingMm = 300 // T75 proposed` offered as one click on a
  face with no units). The slab is one BOM line, one cut list line, one sheet
  in the T71 set with the cut-outs of F5.

## PART C · KITCHEN KITS (F12 to F15)

### F12 · THE APPLIANCE TOWER, ONE KIT, PARENT KIT_FRIDGE
- `APPLIANCE_TALL` in `engine/types.js`, copied field by field from `FRIDGE`
  (`lisp: 'KIT_FRIDGE.lsp'`, `widthFixed`, tall, legs, `carcass.back:
  'rails'`), with `apertures: [...]` read from its defaults block: each
  aperture `{ role, h }` cuts KIT_FRIDGE's own aperture pattern (the back
  rails, the fixed panel, the spurs panel on its blocks) at that height, and
  the test asserts a one-aperture tower hole for hole against FRIDGE at the
  same numbers. Cupboard space above or below an aperture takes a door
  through the existing path; the appliance itself shows no front (the machine
  is the face), BOM line + GLB slot (the Blum pattern).
- Four library rows, Tall units, each a defaults block: `Oven tall` (oven +
  cupboard), `Oven + microwave`, `Fridge freezer`, `Washer + dryer`. Aperture
  heights `// T75 proposed, owner to confirm`: oven 595, microwave 450,
  washer 850, dryer 850, fridge and freezer from `fridgeH`. The held-open rows
  `oven-tall` and `small-fridge` close (the small fridge is `DW_PANEL`'s
  fridge front, said in the row). Prefix `AT`. Golden
  `golden-appliance-tall.json`.

### F13 · THE BASE UNIT WITH DRAWERS BEHIND ITS DOORS
- `BUD_INT`: `BUD` with `drawerStyle: 'wardrobe'`, `internalDrawers: 'all'`,
  `supports.drawers: true` (PANTRY's own two lines at base height), the T33
  F6 door setback for drawers behind doors applied as it is in a wardrobe.
  Test hole for hole against PANTRY's drawer rows at the same numbers. Library
  Base units "Drawers behind doors". Prefix `BI`.

### F14 · THE HOB UNIT
- `BUDR` variants take `hob: true` (a library row "Hob drawer unit" for x2
  and x3): the TOP front is a FIXED DUMMY (front material, no box, no runner,
  emitted as the blind blank is), the box under it keeps
  `profile.hob.clearanceMm = 60 // T75 proposed` below the worktop for the
  hob body; the worktop proposes the hob cut-out (F5). Prefix stays `DR`; the
  golden `golden-budr.json` is untouched because `hob` is absent on it.

### F15 · THE PELMET, PLAIN
- The held-open row `cornice-pelmet` opens as a PLAIN pelmet: a flat strip
  under a run of wall units, `profile.pelmet = { heightMm: 50, thicknessMm:
  front_t } // T75 proposed`, front material, the cornice's run, segment and
  mitre arithmetic reused (`corniceSegments`, `corniceCorner`) on the bottom
  edge instead of the top, BOM role `pelmet`, cut list line. It hides the LED
  strip and changes nothing about the light (FROZEN 2).

## PART D · WARDROBE KITS (F16 to F19)

### F16 · THE CHEST OF DRAWERS BETWEEN WARDROBES
- `WARDROBE_CHEST2 / 3 / 4` copied from `BUDR2 / BUDR / BUDR4`, family
  wardrobe, wardrobe depth and the wardrobe's leg source, prefix `WC`,
  defaults block `wardrobeChest.defaults` (width 800, height = the wardrobe's
  base-of-drawers law, `// T75 proposed`). Hole for hole against the BUDR of
  the same numbers. Wardrobes category and retail EXTRAS `ADD CHEST OF
  DRAWERS` (x3 default; the count by the existing variants control).

### F17 · THE FLOATING DESK
- `WARDROBE_DESK`: a wall-hung carcass (WUD's hangers and back cut-outs,
  `mount: 'wall'`), height `wardrobeDesk.defaults.height = 160 // T75
  proposed`, depth = wardrobe depth, ONE drawer row through the BUDR x1
  variant (`profile.baseDrawerUnit.variants.x1` exists), prefix `WD`. It
  takes a WORKTOP: `takesWorktop` admits a wall-mounted kit that declares
  `desk: true`, the slab over it with the front overhang; the worktop record
  gets the per-worktop `thickness` the T30 comment deferred (a desk or a
  sideboard top is 25, a kitchen slab 38; the project default stays 38).
  Placed beside a wardrobe at `mount_height = 720 // T75 proposed`, aligned
  to the FRONT of the wardrobe by default (T74 F7's two choices). Retail
  EXTRAS `ADD DESK`.

### F18 · THE LOW UNITS OF A WARDROBE JOB
- `WARDROBE_LOW` copied from `LOW_CABINET`, family wardrobe, prefix `WL`,
  wardrobe depth, its own low height (`wardrobeLow.defaults`, 500, `// T75
  proposed`). Hole for hole against LOW_CABINET. Retail EXTRAS `ADD LOW
  UNIT`.

### F19 · HOOKS AND THE VALET ROD (small, last of the part)
- Two rows in Add items for the wardrobe family: `Hooks` (a row of N, BOM
  line, placeholder bodies, zero holes) and `Valet rod` (pull-out, BOM line,
  placeholder, zero holes), the `hardwareKit` grammar. Skipped and said if
  time runs short.

## PART E · SETS AND THE OTHER PROJECT TYPES (F20)

### F20 · MULTI-UNIT SETS, AND FIVE OF THEM SHIPPED AS DATA
Today a saved set is ONE unit's params (`lib/templates.js`). Media wall,
Sideboard, Vanity, Utility and Hallway are names in `engine/projectTypes.js`
with no furniture behind them. Nothing here needs a new kit.
- `lib/templates.js` grows `kind: 'set'`: an ORDERED list of units (type +
  params, positions stripped as today) with the gaps between them; inserting a
  set on a wall adds them left to right through `addUnit` (collisions and
  refusals as for any unit); the set's total width adapts to the wall through
  `shareOut` (`widthFixed` kits keep their width). A set is a RECIPE, not a
  group: after insertion the units are ordinary units.
- `engine/sets.js`, pure data, five sets built ONLY from kits that exist:
  `Media wall` (two `BUDTALL` without doors as columns, a `WUD` at
  `mount_height 300` as the floating base, two `FREE_PANEL` shelves, LED as
  the existing law; the cable hole is the existing `circle` part edit, noted
  in the set's hint), `Sideboard` (`BUD` + `BUDR` + `BUD`, end panels both
  ends, a 25 mm top through F17's per-worktop thickness), `Vanity` (`SINK` at
  the vanity height the profile already has, a `WUD` hung above, the basin
  cut-out as an F5 record), `Utility` (`BUDTALL`, `DW_PANEL` for the washer,
  `APPLIANCE_TALL` washer + dryer from F12, `BUD`), `Hallway` (`LOW_CABINET`
  with a 25 mm top as the shoe bench, `WARDROBE` without doors with a rail as
  the coat run, `BUDTALL`).
- `projectTypes.js`: each of the five names carries `set:` its id; NEW
  PROJECT with one of them offers the set first (the first plus point on the
  first wall); the Library's `media` category (`soon`) becomes the sets shelf
  (saved sets and shipped sets on one list). Kasacja of the `soon` flag,
  tombstone two lines.

## PART F · STOCK FOR JOINERYCORE, AND READINESS (F21, F22)

### F21 · THE CSV CONTRACT WITH JOINERYCORE
The owner: *"stock połączony z joinery core, na razie export import za pomocą
csv coś jak production core, później api."* The warehouse (T51,
`engine/warehouse.js`) already speaks Production Core's twelve columns and
matches rows on `jc_uuid`; this turn makes that THE contract.
- PROBE: the round trip `toCsv` to `fromCsv` to `mergeImport` on the real
  catalogue shape, every column, as a test; what does not survive is fixed.
- The purchase BOM export (`bom.js purchaseBom`) carries `jc_uuid` and the
  material code on every line that has them, so JoineryCore can import the
  shopping list by identity.
- The project stores the `warehouseStamp` it was priced against and the
  `price_source` per assigned material; opening a project whose catalogue has
  moved since raises a CHECK, in words, never a silent recompute (prices change
  a quote only by the owner's decision).
- Menu, `Database ▸ Materials`: the two existing export buttons read `Export
  for JoineryCore (CSV)` (the catalogue) and `Export project list for
  JoineryCore (CSV)`; the import reads `Import from JoineryCore (CSV)`;
  `JC_NOTICE` stays. The API is NOT this turn (the owner's "później").

### F22 · PRODUCTION READINESS, ON EVERY LINE
- `engine/readiness.js`, pure: `readinessOf(part | hardwareLine)` returns
  `'cut'` (fully machined from a LISP or an agreed pattern), `'geometry'`
  (outline only, no holes: the blind blank, a box-out board, the T30 lattice),
  `'bought'` (an order line), or `'manual'` (the joiner fits it on site: the
  worktop joint, the blank's fixing). It reads the meta the parts ALREADY
  carry (`meta.corner`, `hardwareKit`, the yellow notes of BLOCKERS) and a
  side map keyed by part id; it writes nothing into the panel records, so
  every golden dump is byte-identical by construction.
- The cut list, the BOM and the CNC export show the state on every line; the
  CNC export carries a banner counting the lines that are not `'cut'`; the
  Check lists them by unit. The T71 drawing set prints the state in the parts
  card.

## PART G · THE SECOND JOINT SYSTEM, THE TAIL (F23)
The owner: *"lisp najpierw."* Dowels first, Cabineo's data slot only.
- LISP FIRST: `reference/lisp/SKYLON_JOINTS_DOWEL.lsp`: the dowel pattern as
  a function of profile numbers (`joints.dowel = { diaMm: 8, edgeDepthMm: 20,
  faceDepthMm: 12, pitchMm: 32, endOffsetMm: 50, confirmed: false } // T75
  proposed, owner to confirm`), paired holes in both boards of every joint
  the puzzle makes today (side to top, side to bottom, back to side, fixed
  shelf to side).
- `profile.joints.system = 'puzzle' | 'dowel'`, default `'puzzle'` (the six
  goldens by construction), a per-unit override through the unit's settings
  section (no typed numbers in the UI). Switching a unit REPLACES all of its
  puzzle sockets and tenons with dowel pairs on both boards (never both
  systems on one joint); dowels count in the BOM by the hardware law.
- THE GATE: the CNC export REFUSES a dowel job while `joints.dowel.confirmed`
  is false, in words ("the dowel pattern is proposed, not confirmed by the
  owner"); the Check says the same; the 3D and the cut list show it.
- Cabineo: `reference/hardware/cabineo/README.md` naming what the owner drops
  in (Lamello's CAD and PDF for the articles the workshop uses: Cabineo 8,
  Cabineo 12, 8 M6) and nothing else: no numbers, no geometry, no holes. The
  system id `'cabineo'` is reserved in the profile and refused with that
  sentence until the data is there.
- Golden `golden-dowel-bud.json` (a BUD with `joints.system: 'dowel'`). If
  time runs short, this whole part is the one left for the next turn, and the
  PR says so.

## NOT THIS TURN (named so nobody builds it)
- Fronts and opening systems: GPT's branch. Sliding, bifold, lift, pocket,
  tambour, slim shaker, applied moulding, fluted.
- Lighting and LED, in any form.
- Rounded corners and bent fronts (list 13); the www patterns.
- Cabineo geometry (data first), nesting, a pricing engine, the JoineryCore
  API.
- A dressing-room island in retail; wall elevations of island faces.
- Still waiting on the owner's answer (asked 23.09): what the shelf menu
  HEIGHT field measures, and what "does not stop at FIX shelves" means for a
  divider. Neither is touched.

## TESTS AND PROOF
Full suite; goldens x6 plus the new goldens named above; `scripts/t75-
classify.mjs`; parens 14 + 3 new files; the T59 freeze with tonight's
licences; the T71 drawing set green on the Herbal Hill fixture and on one new
fixture per part (`fixtures/t75-corner-kitchen.json`, `fixtures/t75-
island.json`, `fixtures/t75-wardrobe-corner.json`). New `test/turn75-*.test.js`
per F with the PROBE tables as assertions. `scripts/t75-walk.mjs`, REAL mouse,
for F2 to F5, F7 to F14, F16 to F18, F20, F21; frames `verify/t75/fNN-*.png`;
output `verify/t75/walk.txt`. Every F reports the six stations of DONE.

## PR BODY
The PROBE tables verbatim; per F the files and lines; the new LISP files and
their paren counts; the EXEMPT entries added; the retail divergences by file
and line; every `roomWalls` consumer and its side; the goldens (six old, every
new); the count of tests; the walk result; what was skipped and why; and THE
NUMBERS PROPOSED as one table.

## THE NUMBERS PROPOSED (owner to confirm, all in profile.js, none in the UI)
| Number | Value | Where |
| - | - | - |
| Corner post width | 50 | `corner.postMm` |
| Front to post clearance | 3 | `doors.clearance.corner` |
| L overlap arm | adjacent | `corner.overlap` |
| Cornice at unequal depths | step | `cornice.cornerMode` |
| Worktop corner joint | butt, 3 bolts | `worktop.joint` |
| Cut-out inset and radius | 20, 10 | `worktop.cutout` |
| Upstand | 100 x 20 | `worktop.upstand` |
| Seating overhang | 300 | `worktop.seatingMm` |
| Notch defaults | 200 x 200 x full | `notch.defaults` |
| Island default | 1800 x 900 | `island.defaults` |
| Blind defaults | base 1000, wall 900, wardrobe 1200 | `blind*.defaults` |
| L defaults | base 900 x 900, wall 600 x 600, wardrobe 1000 x 1000 | `corner*.defaults` |
| Apertures | oven 595, micro 450, washer 850, dryer 850 | `applianceTall.*` |
| Hob clearance | 60 | `hob.clearanceMm` |
| Pelmet | 50 x front_t | `pelmet` |
| Desk | 160 high, hung at 720, top 25 | `wardrobeDesk.defaults` |
| Chest, low unit | 800 wide; 500 high | `wardrobeChest`, `wardrobeLow` |
| Dowel (gated) | dia 8, edge 20, face 12, pitch 32, end 50 | `joints.dowel` |
