# CLAUDE.md, TURN 78 · THE OWNER'S LIST OF 11.10: CORNERS MADE REAL, DOORS, KITS, JOINTS, SPRAY

Run autonomously. Zero questions, zero stops: every decision below is the
owner's own (11.10.2026, in a conversation of 20 points answered one by one),
so nothing here is asked again. If a point cannot be done, skip it, write why
in the PR, and go on to the next. Full suite, never `--silent`. Frames under
`verify/t78/`. Branch `claude/t78-the-list-of-11-10`, one commit per F, PR at
the end; the owner merges. Nothing lands in Petros from this session.

The owner, asked whether to split this: *"nie, całość na nocną zmianę."* One
turn. The ORDER of the parts is the order of value: PART A first, PART G last.
A part left undone is left undone whole and named in the PR. Where the
harness offers sub-agents, they do the PROBES, the LISP drafts, the hardware
JSON from the catalogue, the goldens, the tests and the walk; the central
files (`engine/cabinet.js`, `engine/profile.js`, `engine/types.js`,
`engine/library.js`, `engine/design.js`, `stores/projectStore.js`,
`3d/UnitView.jsx`, `engine/worktop.js`, `engine/corners.js`,
`engine/doors.js`, `engine/hinges.js`) have ONE writer and an agent hands
that writer a patch.

## THE ORDER
The owner's eye-test of T75 to T77 (11.10.2026) and his answers, verbatim
where they decide something:
- L corner: *"powiększenie L shape szafek prawa lewa strona"*; *"dodawanie
  szafek po lewej stronie l shape szafki proszę, teraz nie można dodać
  żadnych szafek"*; *"na L półkach odwróć na CNC i na wizualizacji słoje o 90
  stopni"*; *"dolna maskująca płyta nie wycina się w kształcie L oraz worktop
  nie wycina się w kształcie L"*; *"drzwiczki na L shape są i jak są ozdobne
  to mają grubość około 40 mm"*; *"szuflady w narożniku L shape"*; *"zawiasy
  podwójne czyli jedne drzwiczki do carcasu a później zawiasy od drzwiczek do
  drzwiczek"*; *"kręcący się narożnik na garnki w środku"*; *"automatycznie
  wyrównanie szafki wiszącej narożnej do szerokości dolnej, chyba że bardzo
  duża to wtedy propozycja następnej szafki jeśli drzwiczki będą większe niż
  700 w szafce wiszącej"*.
- Blind corner: *"ślepy narożnik powinien mieć panel i listwę 40 mm
  narożnikową żeby odsunąć jedną szafkę od drugiej, pusta szafka nic nie
  daje"*; *"listwa narożnikowa musi mieć 40 mm bo jak będą rączki to się nie
  otworzą"*; the strip is of the FRONT material, flat, 40 x front thickness
  (mockup agreed 11.10); *"hafele narożnik ślepy czyli wysuwane"*.
- Doors and fronts: *"otwieranie drzwi większy kąt otwarcia 180 stopni,
  zawiasy"*; *"szyba powinna być smoke, i powinna być na drzwiczkach a nie
  gdzieś na ścianie"* and *"domyślnie smoke ale z wyborem"*; *"jak mamy arche
  to powinny być na małych drzwiczkach też zaaplikowane a jak mamy szuflady to
  przez wszystkie szuflady przechodzi arch"*; *"szuflady wewnętrzne powinny
  mieć fronty"*; *"podwójne szuflady szafki z szufladą na sztućce z bluma"*.
- Kitchen kits: *"szafka na hood tradycyjna czyli wysunięta pod skosem albo
  normalna szafka tylko mniejsza żeby było 650 do 750 minimum nad blatem, nad
  hobem"* and, on 650 or 750: *"tak jak mówisz ale pozostaw to dla klienta,
  tylko proponuj"*; *"szafki poziome otwierane do góry system blum ... podwójne
  drzwi pojedyncze etc."*
- Joints: *"minimum 2 a kołki co mniej więcej co 250 mm"*, dowels 6 mm;
  *"mamy puzzle i dogbones w systemie i niech tak będzie ale też trzeba
  zrobić wybór łączenia i mamy 4: puzzle, dowels, Cabineo, ciastka"*; Cabineo
  8 AND 12, chosen in the company's default settings; biscuits: *"zostaw jak
  było, ciastka były ustawione ok, nie grzeb w tym, półka stała to samo"*.
- Spray: the twenty-element law below, agreed element by element; *"całe
  sprayowanie jako osobne menu Cabinet Core"*; the one-page layout of
  Production Core's Spraying tab (mockup v2 agreed); edges in m² for the
  paint and in lm beside it; waste 10 percent.
- Top infill: *"zawsze z mitrą, górny infill to samo co boczny."*
- Source of hardware numbers: the Blum catalogue 2024/25 online,
  https://publications.blum.com/2024/catalogue/en/ (Lift systems from p. 10,
  Hinge systems from p. 70, Box systems from p. 194). Numbers enter the engine
  ONLY through `reference/hardware/*.json` with the catalogue page beside
  each, marked `owner to confirm`.
- BASE: `origin/main` at `dbef3f1` (PR #76, T77 merged) or later.

## LAWS
T75's LAWS, T76's two and T77's one hold in full: done means the whole road
(UI, construction and collisions, BOM, drawing, save and reload, export with
readiness); LISP IS LAW and "lisp najpierw" for every new cut geometry;
diagnose before you cut (every BUG starts with a committed PROBE table);
test the way the client clicks (real mouse); one law one path; 1:1 = COPY
through the copy script; numbers in the profile, never typed into the UI
without the owner's order; material never enters material; a carcass side
never stays visible; room refuses first; left adds, right edits; no em or
en dash in anything written; kasacja is physical deletion; a reference file
is a file somebody has to download. Two laws are this turn's own:
**A bought mechanism is a line and a body, never a hole**, until its
manufacturer's drilling is in `reference/hardware/` with a page number.
**The hinge angle stays derived (T22 law).** A wide-angle hinge is a FAMILY
the door chooses (`standard` | `wide`); inside the family the angle is still
`hingeAngleFor` from the front thickness and the catalogue. Company defaults
never carry an angle.

## FROZEN
1. Goldens: the six, T75's nine, T76's decoration file, T77's ornate
   records, byte-identical. `scripts/t78-classify.mjs` names every engine
   delta and proves no golden can reach it. New kits and new cut geometries
   get goldens of their own (named per F).
2. Existing LISP untouched; new LISP files only (named per F); parens test
   grows with them.
3. PRO freeze (`test/turn59-f1-the-switch.test.js`): every PRO file edited
   is licensed in `EXEMPT` with the owner's words from this file and
   re-frozen at its final hash in the same commit.
4. Lighting untouched. `engine/ledStrips.js`, `engine/lighting.js`,
   `engine/lightRig.js`, the light panels: not one line.
5. Biscuit numbers untouched: `profile.biscuits` stays `gap 10`,
   `wideThreshold 700`, `edgeMin 50`, `markLength 70`; the fixed-shelf joint
   and `golden-partition-biscuits.json` do not move.
6. The suite is green at the start (record the count) and at the end.

## PART A · THE L CORNER MADE REAL (F1 to F9)

### F1 · BUG: NOTHING CAN BE ADDED LEFT OF AN L (the owner's blocker)
- PROBE, real mouse: an L in a corner; try the plus on wall B beside the L's
  arm B end, the library insert on wall B, and `addUnit` on wall B. Record
  what refuses and in whose words (`clampUnitX`, `wallObstacles`, the corner
  stop of `engine/corners.js`, the L's own footprint in both walls' frames).
- Fix: the L occupies the corner square in BOTH walls' depth bands and
  nothing else; on wall B the first free slot begins at the end of arm B, on
  wall A at the end of arm A; the plus points (`addPlusPoints`) show there;
  `addUnit` lands there; the corner stop for both runs is the L's own arm
  end (T75 F4 said so; the probe shows where it was not so). Walk: a base
  unit added by the real plus on each side of the L, both land flush.

### F2 · BUG: THE L WORKTOP AND THE L MASK ARE NOT L-SHAPED
- PROBE: `worktopsFor` on a lone `CORNER_L_BASE` (the T75 walk recorded
  `shape: null, points: 0`); `runMaskParams` under a `CORNER_L_WALL`.
- Fix, worktop: the slab over an L is ONE part with an L OUTLINE: outer edges
  along both walls (flush to the wall), the two arm fronts with the 20 mm
  overhang, the inner corner at the arms' meeting with the same overhang;
  `worktopGeometry` returns `shape: 'L'` and `points` (eight), the cut list
  line carries the outline, the T71 sheet draws it, the BOM counts its true
  area; a run that continues along either wall joins the L slab with the
  butt joint record of T75 F5 at the arm end.
- Fix, mask: the bottom masking panel under a `CORNER_L_WALL` is one L
  board (front material, the mask's depth law on both arms), outline in the
  cut list, mitred nowhere (one board).
- Goldens: `golden-corner-l-worktop.json`, `golden-corner-l-mask.json`.

### F3 · BUG: AN L DOOR WITH A DECORATIVE FRONT READS 40 MM THICK
- PROBE: an L with Shaker, then Ornate, then Arched fronts; record the
  door solids' depth in `UnitView` and the panel thickness in the cut list.
  The owner saw *"około 40 mm"*; find which path doubles it (the T76
  decoration solid on the L's virtual parents, F4's per-arm door, or the
  overlap offset of door B added to the thickness).
- Fix: an L door is `front_t` thick everywhere (solid, cut list, BOM), its
  decoration cut INTO that thickness like any other door. If the probe shows
  the 40 was a correct reading of something else, the PR says what, and the
  owner decides.

### F4 · BUG: GRAIN ON THE L SHELVES
- Owner: *"na L półkach odwróć na CNC i na wizualizacji słoje o 90 stopni."*
  Grain has one source of truth (cut orientation decides, 3D renders what
  was cut): rotate the CUT orientation of `SHELF-L` (and the L bottom and
  top if the probe shows they are the same way) by 90 degrees in
  `KIT_CORNER_L.lsp` first, then in the engine's L builder; the DXF, the
  cut list grain arrow and the 3D follow from the one change. Golden
  `golden-corner-l-base.json` is re-pinned by this fix, knowingly, with the
  reason in the classifier.

### F5 · THE L GROWS LEFT AND RIGHT ON ITS OWN
- Owner: *"powiększenie L shape szafek prawa lewa strona."* Arm A (along the
  unit's wall) is the L's `width`, arm B (along the adjacent wall) its
  `depth`; today they move together. Each gets its own clickable dimension
  (T73 F3 field): `ARM A` and `ARM B`, independent, minimum = arm depth +
  the smallest door the profile allows, maximum = the room (room refuses
  first). The doors, shelves, plinth, worktop and mask follow each arm. Both
  kits (`CORNER_L_BASE`, `CORNER_L_WALL`, `CORNER_L_WARDROBE`).

### F6 · THE WALL L FOLLOWS THE BASE L, AND SPLITS ABOVE 700
- Owner: *"automatycznie wyrównanie szafki wiszącej narożnej do szerokości
  dolnej, chyba że bardzo duża to wtedy propozycja następnej szafki jeśli
  drzwiczki będą większe niż 700 w szafce wiszącej."*
- A `CORNER_L_WALL` placed in a corner that holds a `CORNER_L_BASE` takes the
  base's two arm lengths (its own depth stays the wall depth). When either
  arm's door leaf would exceed `profile.cornerUnit.wallLeafMaxMm = 700 //
  T78 proposed`, the app does NOT build one wide leaf: it sets the wall L to
  the arm length that keeps the leaf at 700 and PROPOSES (the grey hint
  grammar of T33's pull-down) a plain wall unit for the remainder beside it,
  one click adds it. Changing the base arms later re-runs the same law;
  a wall L the client sized by hand is left alone.

### F7 · DRAWERS IN THE L (Blum SPACE CORNER)
- Owner: *"szuflady w narożniku L shape."* Blum's SPACE CORNER (Box systems,
  catalogue p. 194 onward; find the SPACE CORNER pages and cite them) is a
  pair of drawers meeting at the inner corner with L-shaped fronts on
  MOVENTO/LEGRABOX runners. The L kit's `supports.drawers` opens: a drawer
  row on an L is TWO boxes (one per arm) on the existing drawer machinery,
  with ONE L-shaped front per row (the two door outlines joined at the
  inner corner, front material, the overlap law of door B retired for a
  drawer row); runners by the existing MOVENTO ladder per arm depth; the
  corner joint of the two boxes is a bought SPACE CORNER kit: BOM line,
  body, zero holes, `reference/hardware/blum-space-corner.json` with the
  page. Golden `golden-corner-l-drawers.json`.

### F8 · THE BI-FOLD CORNER DOOR
- Owner: *"zawiasy podwójne czyli jedne drzwiczki do carcasu a później
  zawiasy od drzwiczek do drzwiczek."* A per-unit choice on the L
  (`corner_doors: 'pair' | 'bifold'`, default `pair` = today's A and B): in
  `bifold`, leaf A hangs on SIDE-A with the family's hinges, leaf B hangs on
  leaf A's free edge with Blum's bi-fold corner hinge (CLIP top 60 degree
  bi-fold, Hinge systems p. 70 onward; cite the page); leaf B carries no
  carcass hinge and its cups are bored on its hinge edge toward leaf A by the
  catalogue's cup pattern, leaf A carries the plate holes on its inner face.
  Cups and plates by `reference/hardware/blum-hinges.json` (F13), marked
  `owner to confirm`. Animation: A swings, B folds with it (the drawerMotion
  grammar for a child part). Collision checks run on the folded pair.
  Golden `golden-corner-l-bifold.json`.

### F9 · THE CAROUSEL
- Owner: *"kręcący się narożnik na garnki w środku."* `hardwareKit` on the L
  kits (`role: 'carousel'`, `by: 'opening'`, `body: 'carousel'`): a BOM
  line and a placeholder body (two round trays on a post, the inner-corner
  footprint), zero holes, readiness `bought`; the shelves of the L step
  aside when it is fitted (refused in words if a fixed shelf is in the way).
  Add items ▸ `Carousel` on the L only.

## PART B · THE BLIND CORNER, NOT AN EMPTY BOX (F10, F11)

### F10 · THE 40 MM CORNER STRIP AND THE BLANK ARE THE KIT'S OWN PARTS
- Owner: *"pusta szafka nic nie daje"*, *"listwa narożnikowa musi mieć 40
  mm."* Today the post is an auto-part that appears when the second run
  lands and is 50 wide. Change: `profile.corner.postMm = 40` (the owner's
  number, no longer proposed); the post and the blind blank are PARTS OF
  THE BLIND KIT (`BLIND_BASE`, `BLIND_WALL`, `BLIND_WARDROBE`): the moment a
  blind unit is placed, its cut list and BOM carry `BLANK` (front material,
  the computed width, T75 F3) and `CORNER-POST` (front material, 40 x
  front_t, plinth line to the unit top), and the 3D shows both; the post
  stands in the front plane of the ADJACENT run at the corner, flat (no
  return), as the mockup of 11.10 shows. A second run landing on the stop
  changes nothing about them; pulling it away does not remove them (they
  are the kit's, not the automat's). The corner stop stays
  `d_A_face + 40`. Clearance `doors.clearance.corner` stays 3.
- Walk: place a blind base alone: blank and post in the cut list at once;
  bring the second run: it stops at the post, the door clears the handle.

### F11 · THE HAFELE BLIND-CORNER PULL-OUT
- Owner: *"hafele narożnik ślepy czyli wysuwane."* `hardwareKit` on the three
  blind kits (`role: 'blind_pullout'`, `by: 'opening'`, `body:
  'blind_pullout'`, label "Hafele blind corner pull-out"): BOM line, a
  placeholder body (two wire trays that swing out of the blind part), zero
  holes, GLB slot in `3d/hardwareRegistry` for the day the owner drops a
  model in. Shelves in the blind part are refused while it is fitted.

## PART C · DOORS AND FRONTS (F12 to F16)

### F12 · BUG: THE GLASS IS NOT IN THE DOOR; SMOKE BY DEFAULT, WITH A CHOICE
- PROBE: a `WUD_GLASS` and a wardrobe door set to GL; record where the pane
  mesh sits (`UnitView.jsx`, `GLASS_PANE_MM`, line ~1049) against the door
  solid's box in the unit frame and the room frame; the owner saw it
  *"gdzieś na ścianie"*: find the frame it was placed in.
- Fix: the pane sits in the door's aperture, in the door's own frame, moves
  with the door (open and shut), in PRO and retail.
- Glass kind: `profile.front.glass.kinds = ['clear', 'smoke', 'reeded']`,
  default `smoke` (`profile.front.glass.default = 'smoke'`), chosen per
  door in the Doors section (a choice, not a number), the BOM line names it
  ("Smoked glass 4 mm"), the 3D tints it (smoke: the existing alpha glass
  darkened; reeded: a vertical ridge normal map on the pane, no new
  dependency). Retail: the choice in the FRONTS step for a GL style.

### F13 · WIDE-ANGLE HINGES (155 / 170)
- Owner: *"otwieranie drzwi większy kąt otwarcia 180 stopni, zawiasy."*
  Blum CLIP top BLUMOTION wide-angle hinges (Hinge systems, p. 70 onward:
  155 degree and 170 degree families) go into
  `reference/hardware/blum-hinges.json` beside the existing hinge data: per
  family the angle, the cup (35), the cup drilling distance, the plate and
  the overlay rule, each with its catalogue page, `owner to confirm`.
- The door chooses a FAMILY: `hinge_family: 'standard' | 'wide'` per door
  (Doors section; retail: not this turn), default `standard`; within the
  family `hingeAngleFor` derives the article from the front thickness as
  today (T22 law). The cup pattern is unchanged in position (same 35 cup,
  same ladder); only the article, the BOM line and the OPENING ANGLE change.
- The opening angle drives the animation (`doors.js` open state) and the
  collision Check: a 170 door that would hit the neighbour, the wall or the
  corner post at its full swing is said in words (the existing door
  clearance family), never clipped. Walk: a 170 door opens past 90 in the
  scene; a neighbour in the way is named.

### F14 · THE ARCH ON SMALL DOORS, AND ONE ARCH ACROSS A DRAWER STACK
- Owner: *"jak mamy arche to powinny być na małych drzwiczkach też
  zaaplikowane a jak mamy szuflady to przez wszystkie szuflady przechodzi
  arch."*
- Small doors (a top box, a wall unit, a drawer-unit's door): the A/AH
  recipe applies at any leaf size; the refusal of T76 F4 (rise impossible)
  stays only where the semicircle truly cannot fit; below that the arch
  scales to the inner width as the recipe says.
- A drawer STACK (BUDR x2/x3/x4, the wardrobe chests, the hob units): ONE
  arch over the whole stack: the recipe is computed on the stack's combined
  front height (fronts plus the gaps between them) and each front receives
  its SLICE of the contour (the gaps leave the arch broken where the fronts
  part, as the eye expects). `frontDecoration.js` gets a `stack` context
  (the fronts of one stack and their y-offsets), the slice is cut per
  front, the cut list and DXF carry each slice, the drawing shows the stack
  as one arch. Golden `golden-arch-stack.json`.

### F15 · INTERNAL DRAWERS GET FRONTS
- Owner: *"szuflady wewnętrzne powinny mieć fronty."* Every internal drawer
  (behind doors: the wardrobe's, PANTRY's, BUD_INT's) gets an INNER FRONT: a
  board of the front material, width = the box width plus the profile's
  inner-front overhang (`profile.drawers.innerFront = { overhangMm: 0,
  heightMm: 'box side height' } // T78 proposed, owner to confirm`, and
  Blum's inner-front dimensions from the LEGRABOX pages p. 196 onward,
  cited), screwed to the box front through the box's own front fixing (the
  T34 shoe-box pattern), role `drawer_front` with `meta.inner: true`, in the
  cut list, the BOM, the drawings and the spray schedule (all around). The
  T33 F6 door setback for drawers behind doors is re-measured against the
  inner front's thickness.

### F16 · THE DOUBLE DRAWER (DEEP DRAWER WITH A CUTLERY INNER DRAWER)
- Owner: *"podwójne szuflady szafki z szufladą na sztućce z bluma."* A drawer
  row may be `double: true` (the Drawers section, per row): behind ONE front
  a deep box and, above it, a shallow inner drawer on its own runners, the
  Blum "inner drawer behind a front" arrangement (LEGRABOX / TANDEMBOX inner
  drawer, Box systems p. 194 onward, cited): the inner drawer's box height,
  runner length and the clearance between the two boxes in
  `reference/hardware/blum-inner-drawer.json`, `owner to confirm`. Cut list:
  two boxes; BOM: two runner pairs; the inner drawer carries an inner front
  (F15); the cutlery insert is the existing catalogue (T33 F11).

## PART D · KITCHEN KITS (F17, F18)

### F17 · THE HOOD: CANOPY OR SHORT, WITH THE CLEARANCE PROPOSED
- Owner: *"szafka na hood tradycyjna czyli wysunięta pod skosem albo normalna
  szafka tylko mniejsza żeby było 650 do 750 minimum nad blatem, nad hobem"*,
  and the clearance is a proposal: *"pozostaw to dla klienta, tylko
  proponuj."*
- Two kits beside `WUD_HOOD`: `WUD_HOOD_CANOPY` (the traditional chimney
  canopy: a wall-unit carcass whose front slopes out from the top to a
  deeper bottom; the slope angle and the bottom projection in
  `profile.hoodCanopy.defaults // T78 proposed`; no door; the extractor as
  today's hardware line) and `WUD_HOOD_SHORT` (a plain `WUD_HOOD` at the
  height that leaves the clearance). Both `appliance: 'extractor'`,
  `widthFixed`.
- THE CLEARANCE LAW, a Check and a proposal, never a block: over a hob unit
  (F14's `hob` flag or an `OVEN_BASE`), the gap from the worktop to the
  hood's underside is measured; below `profile.hood.clearance = { induction:
  650, gas: 750 } // T78 proposed` for the hob kind the client set (a choice
  on the hob unit: `hob_kind: 'induction' | 'gas'`, default induction) the
  Check says the number and offers one click: raise the hood to the
  clearance (its `mount_height`). The client may leave it.

### F18 · LIFT-UP WALL UNITS, BLUM AVENTOS
- Owner: *"szafki poziome otwierane do góry system blum ... podwójne drzwi
  pojedyncze etc."* The maths exists (`engine/lifts.js`, T19: board weight,
  power factor, `selectLiftUnit` against `reference/hardware/aventos.json`);
  the kits do not. Four FRONT MOTIONS on a wall unit (`WUD`, `WUD_GLASS`, the
  wardrobe's `WARDROBE_WALL`), chosen in the Doors section as the opening
  (`front_system: 'hinged' (default) | 'hk' | 'hs' | 'hl' | 'hf'`):
  - `hk` AVENTOS HK top: one leaf, swings up about its top edge, the stay
    lift arms on both sides (Lift systems p. 10 onward, cite the HK top
    pages);
  - `hs` AVENTOS HS: one leaf, swings up and over the carcass (the parallel
    arms);
  - `hl` AVENTOS HL: one leaf, lifts parallel and forward;
  - `hf` AVENTOS HF: a bi-fold leaf in two halves (the owner's *"podwójne
    drzwi"*), the upper half hinged to the carcass top, the lower to the
    upper.
  Each: the leaf has NO hinge cups; the lift arms are the hardware, drilled
  NOTHING until the catalogue's fixing pattern is in
  `reference/hardware/aventos.json` with its page (extend the file; the
  power-unit selection it already holds decides the article; a front whose
  power factor no unit covers is refused in words, T19's own rule); the
  animation per system (HK: rotate about the top edge to the catalogue's
  opening angle; HS/HL: translate and rotate per the catalogue's path, in
  two keyframes; HF: the fold); collision with the ceiling, a cornice and
  the unit above is a Check. BOM: the lift article, the cover caps, no cups.
  Goldens: one per system on a 600 x 720 WUD.

## PART E · JOINTS: FOUR SYSTEMS, THE COMPANY CHOOSES (F19, F20)

### F19 · DOWELS 6 MM, EVERY 250, MINIMUM TWO; COMPANY DEFAULTS CHOOSE THE SYSTEM
- Owner: *"minimum 2 a kołki co mniej więcej co 250 mm"*, 6 mm. LISP FIRST:
  `reference/lisp/SKYLON_JOINTS_DOWEL.lsp` (T75's file) is amended to the
  owner's numbers: `profile.joints.dowel = { diaMm: 6, edgeDepthMm: 20,
  faceDepthMm: 12, pitchMm: 250, minPerJoint: 2, endOffsetMm: 50, confirmed:
  false }`; the dowels are set out at `endOffset` from each end and then
  every `pitch`, never fewer than two, the pitch stretched evenly so the
  last one lands at `endOffset` from the far end. Engine mirrors it; golden
  `golden-dowel-bud.json` re-pinned, knowingly. The `confirmed: false` gate on
  the CNC export stays until the owner says the dowel is confirmed.
- THE CHOICE: `engine/companyDefaults.js` (T22, the missing storey) gets
  `joints.system: 'puzzle' | 'dowel' | 'biscuit' | 'cabineo8' | 'cabineo12'`,
  default `puzzle`; the project inherits, a unit may override (the T75 F23
  Joints row). Puzzle with its dog bones stays exactly what it is. Biscuit
  as a carcass system (F20). Cabineo variants (F20). The validator refuses
  an angle or a number here (T22 law); it accepts a system id.

### F20 · BISCUITS ON THE CARCASS, AND CABINEO 8 / 12
- Biscuits: *"zostaw jak było."* The numbers in `profile.biscuits` do NOT
  move. New: LISP FIRST `reference/lisp/SKYLON_JOINTS_BISCUIT.lsp` applies
  THE SAME SET (screw 3, gap 10, mark 70, gap 10, screw 3; edge 50; two sets,
  three above 700) to the carcass joints side to top, side to bottom and
  fixed shelf to side, NEVER to the back (*"bez ciastek na plecach"*); the
  engine mirrors it when `joints.system === 'biscuit'`; the fixed-shelf
  joint of T24/T26 is untouched (it is the same set already). Golden
  `golden-biscuit-bud.json`.
- Cabineo: the owner: both 8 and 12, chosen in company defaults. THE DATA
  IS IN THE REPO: `reference/hardware/cabineo/Operating_instructions_Cabineo.pdf`
  (Lamello's own sheet, 2 pages; page 2 is the machining drawing). No
  fetching. Read it with a PDF reader and write
  `reference/hardware/cabineo/cabineo.json`: per variant (`8`, `12`, `8M6`)
  the screw reach X (8 / 12 / 8 mm), the counterpart hole (diameter 5, its
  depth as the sheet gives it relative to the panel thickness D), the
  minimum panel thicknesses of page 1 (centre wall: Cabineo 8 from 16,
  Cabineo 12 from 24; corner joints from 12 / 14; the 20 mm minimum from an
  edge and the 300 mm maximum spacing); per MOUNTING (`surface`, `flush`,
  `flushCap`, `hpl`) the pocket depth (11 / 11.5 / 13 / 11), the collar and
  cap recesses (0.7 and 0.8; 2.1 and 0.95); per MACHINING OPTION (`drill15`:
  three holes of 15 at 11.2 centres, 3.6 from the panel end; `cutter10`:
  the 26 x 6.6 outline, 20.4 and 9.2; `cutter12`: 26 x 6, 19.3 and 8.1 with
  the 2.2 reliefs) every number as the sheet prints it, each with the page
  and the drawing it comes from, `owner to confirm`. The profile chooses
  `cabineo.mounting = 'flushCap'` and `cabineo.machining = 'cutter12'`
  (`// T78 proposed`, the owner's Biesse mills; he decides).
- THE INVERTED SIDE, the owner's own point (11.10.2026): Cabineo drills NO
  panel edge. The connector sits in a POCKET milled into the FACE of the
  horizontal board (top, bottom, fixed shelf) at its end, with the channel
  open to the end; its screw passes through the board's end into a 5 mm
  hole drilled into the FACE of the side (from the inside, the face every
  hinge plate and shelf pin already lives on). And the pocket is cut from
  the OUTSIDE face of the carcass board (*"cięcie nie od środka korpusu
  tylko do zewnątrz"*): the top from above (under the worktop), the bottom
  from below (in the plinth void), a fixed shelf from its underside (with
  the cap). So one joint is machined from two opposite faces, and the
  export must say so:
  - the top, the bottom and a fixed shelf with Cabineo pockets carry
    `machinedFace: 'outside'`; their DXF is drawn as seen from that face,
    coordinates reflected about the vertical axis (`x' = W - x`), through
    the SAME reflection T76 built for the decorative fronts' FRONT files
    (`cnc/frontOperations.js`, `frontX = partWidth - backX`), never a second
    one; the operations JSON and the part label print `OUTSIDE FACE UP`;
  - the side keeps its inside-face machining and gains the 5 mm hole at
    the joint line, set out at the pocket positions (`endOffset` 50 from
    each end, then every `profile.joints.cabineo.pitchMm = 250 // T78
    proposed`, never fewer than two, never over the sheet's 300);
  - the skin check of T76 (`MIN_SKIN` 3 mm between opposing blind cuts)
    runs between every outside-face pocket and every inside-face drilling
    of the same board (the back's screw row, a runner row, an LED groove):
    a clash is refused in words, naming the board and the two cuts.
- LISP FIRST: `reference/lisp/SKYLON_JOINTS_CABINEO.lsp` reads
  `cabineo.json`'s numbers and draws the pocket (by the chosen machining
  option), the counterpart hole and the cap recess, board by board; the
  engine mirrors it for `cabineo8` / `cabineo12`; the cap and the
  connector are BOM lines (article 186310 for Cabineo 8 as the sheet's
  page 1 names it; the others from the sheet). The same `confirmed: false`
  gate as the dowels blocks the CNC export in words until the owner
  confirms the numbers. Goldens: `golden-cabineo8-bud.json`,
  `golden-cabineo12-bud.json`, both proving the outside-face reflection
  (a pocket 3.6 from the end lands 3.6 from the end in the reflected DXF).

## PART F · SPRAY (F21)

### F21 · THE SPRAY SCHEDULE, ITS LAW, ITS PAGE AND THE PAINT ORDER
The owner's law, element by element (11.10.2026), in `profile.spray.rules`
(faces, edges, frames and strips per element role; numbers only here):
| # | Element (role / part) | Paint |
| - | - | - |
| 1 | Door (`door`, every style) | both faces + 4 edges; grooves and recesses inside the face |
| 2 | Drawer front (`drawer_front`) | both faces + 4 edges |
| 3 | False / dummy front (`false_front`, D/W front, hob dummy) | both faces + 4 edges |
| 4 | Blind blank (`blind_blank`) | a 100 mm strip of the face at the door side, the door-side edge, top and bottom edges for 100 mm |
| 5 | Applied moulding strips (`front_moulding`) | painted after gluing, inside the door's face; plus both 8 mm sides of each strip |
| 6 | Inner drawer front (F15) | both faces + 4 edges |
| 7 | End panel (`end_panel`) | visible face + 4 edges + a 100 mm frame on the back |
| 8 | Island end panel | as 7 |
| 9 | Island back panel (`back_panel`) | as 7 |
| 10 | Mask (`mask`) | underside + front edge |
| 11 | Corner post 40 (`corner_post`) | face + both long edges + top edge |
| 12 | Free panel (`free_panel`) | both faces + 4 edges |
| 13 | Plinth (`plinth`) | face + top edge |
| 14 | Side infill / filler (`infill`) | face + the edge toward the unit |
| 15 | Top infill (`infill`, top) | as 14 |
| 16 | Cornice (`cornice`) | all around (profile perimeter x length) |
| 17 | Pelmet (`pelmet`) | all around |
| 18 | Upstand | NOT sprayed (worktop material) |
| 19 | Carcass, SET 2 only (veneer or sprayed carcass) | every face visible from inside (sides, top, bottom, back's inside face); shelves all around |
| 20 | Open shelves, desk and sideboard tops 25 | all around |
Not on the list: worktop 38, drawer boxes, backs of closed units, legs,
runners, hinges, LED, glass.

- THE PAGE: `Output ▸ Spraying`, one page on the Production Core pattern
  (mockup v2 of 11.10, agreed): a SPRAYING INFORMATION card (project, type,
  deadline, date, colour chips, which sets are on); PART A ELEMENTS grouped
  by colour (section rows with a swatch), one line per part group: #, Unit
  no., Element, Paint code (`2S + 4E`, `1S + F100 + 4E`, `1S100 + 1E +
  2E100`, `1S + TE`, `ALL`), Size, m² each, Qty, m², Edges lm, Additional
  info (a typed note, printed); PART B CARDS, OPEN, under the list, one per
  rule present in the job that is not "all around" (end panel, blind blank,
  corner post, plinth, infill, mask, AM strips): the board unfolded (face,
  back, edges drawn thicker than true and said so), painted areas filled,
  the rule's numbers (100, 8), the area per part broken down, the parts of
  this job under the card; PART C PAINT: per colour the m², coats,
  coverage, waste, litres, tins, which paint material; lines go to
  `BOM ▸ Purchase list`. `Export PDF`: the same page, landscape, in the T71
  report frame.
- WHERE THE COLOUR COMES FROM: the unit's own finish (This wardrobe's
  colour, the fronts' `finish_id`, the design's defaults), as a window's
  colour in Production Core; the page only groups. Set 2 appears when the
  job's carcass material is veneer or sprayed.
- THE PAINT AS A MATERIAL: `Database ▸ Materials` gets a department
  `Paints` (the warehouse's twelve columns plus: type topcoat | primer,
  sheen, coverage m² per litre per coat, coats, tin sizes); assigned in the
  existing Assign Materials modal to the sprayed set (not on the Spraying
  page); litres = m² x coats / coverage + `profile.spray.wastePct = 10`,
  tins rounded UP to the material's sizes; a missing price is said (BOM
  law). `profile.spray.edgesInM2 = true` (edges count in the m² for the
  paint; the lm column beside is the work).
- THE LABEL: the CNC part label (`cnc/partLabel.js`) carries the paint code
  beside the part number.
- m² = faces + edges (perimeter x thickness) + frames and strips by the
  rule; identical parts collapse into one line with Qty.
- Walk: the Herbal Hill fixture: the page lists every door, end panel and
  plinth of the job, the sum matches a hand sum of three parts (asserted),
  the end-panel card is open, the PDF downloads; a job with a veneer carcass
  shows Set 2.

## PART G · THE SMALL ONES (F22)

### F22 · THE TOP INFILL IS ALWAYS MITRED AT A CORNER
- Owner: *"zawsze z mitrą, górny infill to samo co boczny."*
  `infillCornerMitre` returns the 45 degree mitre at every internal corner a
  top infill turns, not only when the filler stands in the face plane; the
  tolerance case stays for the T-joint. `golden-wall-mask.json` and the six
  are proven untouched (no golden has a corner).

## NOT THIS TURN (named so nobody builds it)
- Sliding, pocket and tambour doors; a dressing-room island in retail.
- The ornament model loader (T77 F6's slot stays a slot).
- A 3D "Spray view" (the schedule and the cards first; the view is one file
  on the same law, next turn).
- Retail copies of: the hinge family, the lift systems, the double drawer
  (PRO this turn; retail by the copy script next).
- Cabineo geometry beyond Lamello's published data; nothing invented.
- Lighting, in any form.

## TESTS AND PROOF
Full suite; the goldens above; `scripts/t78-classify.mjs`;
`scripts/t78-copy.mjs` (retail only through the copy script);
`scripts/t78-walk.mjs`, REAL mouse, PRO and retail where retail is named,
frames `verify/t78/fNN-*.png`, output `verify/t78/walk.txt`; parens for the
three new LISP files; `test/turn78-*.test.js` per F with the probe tables
as assertions; every F reports the six stations of DONE.

## PR BODY
The probe tables verbatim (F1, F2, F3, F12); files and lines per F; the new
LISP files and parens; the hardware JSON files with their catalogue pages;
the EXEMPT entries; the retail divergences; the goldens (old proven, new
listed, re-pinned ones with the reason); the test count before and after;
the walk result; what was skipped and why; THE NUMBERS PROPOSED.

## THE NUMBERS PROPOSED (owner to confirm; all in profile.js or reference/hardware; none typed in the UI)
| Number | Value | Source |
| - | - | - |
| Corner post | 40 x front_t, front material | owner 11.10 (decided) |
| Dowels | 6 mm, every 250, min 2, end offset 50 | owner 11.10 (pitch "mniej więcej") |
| Biscuits | unchanged: 70 / 10 / 3 / 50 / 700 | owner: "nie grzeb" |
| Cabineo 8 / 12 | from Lamello's sheets, URLs cited | owner to confirm |
| Wall L leaf max | 700 | owner 11.10 |
| Hood clearance | induction 650, gas 750, proposal only | owner 11.10 |
| Glass default | smoke; kinds clear / smoke / reeded | owner 11.10 |
| Wide hinge families | 155, 170; cup 35; pages cited | Blum catalogue, owner to confirm |
| Inner front | box width, box side height, overhang 0 | T78 proposed |
| Inner drawer (double) | from LEGRABOX pages, cited | owner to confirm |
| AVENTOS fixing patterns | from Lift systems pages, cited | owner to confirm |
| Canopy hood | slope and projection | T78 proposed |
| Spray waste | 10 percent | owner 11.10 |
| Spray rules | the twenty rows above | owner 11.10 (decided) |
