# CLAUDE.md, TURN 83 · THE MIRROR CABINET, THE VANITY MADE RIGHT, THE PLAN THAT IS NOT A MIRROR

Run autonomously. Zero questions, zero stops: every decision below is the
owner's own (25.10.2026, 14:09 to 22:41, over the architect's drawings of
36 Holland Park in `verify/t83/holland-park/`, the client's own render
`verify/t83/mockups/client-render.png`, the mockups agreed in chat and his
eye-test of T82 after the merge of PR #81; his words are quoted where they
decide), so nothing here is asked again. Where a number is marked PROPOSED
it is the turn's best reading and is used as written: the owner confirms
or changes it after the merge, never during the run. If a point cannot be
done, skip it WHOLE, write why in the PR, and go on to the next. Full
suite, never `--silent`. Frames under `verify/t83/`. Branch
`claude/t83-mirror-vanity`, one commit per F, PR at the end; the owner
merges. Nothing lands in Petros from this session.

## THE COST OF THE NIGHT (a law of this turn, from T82's bill)
T82 (PR #81) took the owner's whole weekly allowance: 79 commits, 220
files, 41 767 lines; 40 of the 79 commits were a second "after the review"
wave, each with its own run of 1 500 to 2 500 tests. This turn is run to
cost: (1) TEN agents and one integrator, never twenty; (2) NO review wave:
an agent's slice is reviewed ONCE by INT when its patch lands, and the
morning audit is the owner's; (3) targeted tests while writing, the full
suite ONCE per PART when it lands and ONCE at the end, never after every
patch; (4) every agent reads this file and its PART, never the whole repo
on its own: INT hands each agent the files it OWNS and the three or four
it must read; (5) a report is twenty lines, the six stations of DONE, not
an essay. Agents and parallel mode ON (Opus 5.5, ultracode).

## THE AGENTS (10 slices and one integrator)
| Agent | Slice | OWNS (writes) | Hands patches to |
| - | - | - | - |
| INT | the only writer of `engine/types.js`, `engine/profile.js`, `engine/cabinet.js`, `stores/projectStore.js`, `components/RightPanel.jsx`; applies patches in F order; the full suite once per PART and at the end; classifier, copy check, walk; the PR | the five central files, `scripts/t78-classify.d/f44-t83-*`, the freeze test, NEW_FILES | nobody |
| M1 | F1: `KIT_MIRROR.lsp` and `profile.mirror`; F2: the kit MIRROR_CABINET and its engine mirror (bays, dividers in the fronts' plane, LED stiles, the panels round, the door 18 + 4, the glass shelves, the back and its mirror) | `reference/lisp/KIT_MIRROR.lsp`, `engine/mirrorCabinet.js` (new, the arithmetic), `test/turn83-f01-mirror-lisp.test.js`, `test/turn83-f02-mirror-kit.test.js` | INT (types.js, cabinet.js, profile.mirror) |
| M2 | F3: the mirror cabinet in the room (the mirror finish, the LED stiles lit, the glass shelves, the LED under and inside), the recess into the wall; F4: the BOM lines | `3d/MirrorCabinet.jsx` (new) and the one mount point in `3d/UnitView.jsx` (M2 is the only writer of UnitView this turn), `engine/bom.js` (the mirror rows), `test/turn83-f03-mirror-room.test.js`, `test/turn83-f04-mirror-bom.test.js` | INT (the store's back-mirror question) |
| M3 | F5: the right panel MIRROR CABINET section, the library rows (PRO and the retail copy), the sheets (elevation with the stiles, the section with the recess) | `engine/library.js`, `engine/drawings/projector.js` (the mirror rows only; E1 reads it), `test/turn83-f05-mirror-panel.test.js` | INT (RightPanel.jsx, the EXEMPT row, the copy script) |
| V1 | F6: the vanity's carcass to the wall, the void INSIDE the carcass | `reference/lisp/KIT_VANITY.lsp` (the D rows of the void), `engine/vanity.js`, `test/turn82-f08-vanity.test.js` (amended), `test/turn83-f06-vanity-depth.test.js` | INT (cabinet.js, profile.vanity) |
| V2 | F7: the trap's U at columns 2 with one basin (the narrowed top boxes, the short divider); F8: the basin 50 forward and the clash with the rails said | `engine/vanity.js` (after V1's patch lands: V2 starts on F8 and takes F7 when V1 is in), `test/turn83-f07-vanity-trap.test.js`, `test/turn83-f08-vanity-basin.test.js` | INT (cabinet.js) |
| V3 | F9: the 3D open of a two-column vanity (box and front of the same drawer in the same column) | `engine/cabinet.js` (ONE patch: `zone` on every drawer-box part's meta, lines 5697 to 5728 on 25.10), `3d/*` only through M2 if a line is needed there, `test/turn83-f09-open-columns.test.js` | INT (cabinet.js), M2 (UnitView.jsx) |
| E1 | F10: the plan is not a mirror (probe, then fix); F11: the sheet picker on the PDF export | `engine/drawings/setPlan.js`, `engine/drawings/wallSheets.js`, `components/DrawingModal.jsx` (the EXEMPT row through INT), `lib/drawingExport.js`, `verify/t83/f10-probe.md`, `test/turn83-f10-plan.test.js`, `test/turn83-f11-export-pick.test.js` | INT (the EXEMPT row) |
| P1 | the PROBES of F7, F9, F10 in the first hour, committed as tables | `verify/t83/f07-probe.md`, `f09-probe.md`, `f10-probe.md`, `scripts/t83-probe-*.mjs` | nobody |
| F1 | F12: the walk | `scripts/t83-walk.mjs`, `verify/t83/walk.txt`, `verify/t83/f12-*.png` | nobody |

## THE ORDER
The owner, 25.10.2026, in his words where they decide:
- 14:09 to 14:40, the mirror cabinet over the architect's drawing
  (`holland-park/page-2.png`, elevation 34 and section 33): *"zobacz
  szafki z mirrorami na wierzchu i szybkami w srodku czyli szklane polki,
  czasami lustro z tylu, podswietlenie pod spodem etc, teraz zaprojektujmy
  dokladnie to co masz na rysunku szafka wiszaca"*; *"w tym przypadku to
  reces ale tez w standardzie normalnie wiszaca i dodajemy oczywiscie
  panele dookola i ustawiamy jakie grube"*; *"polki szklane, rysujemy
  szklane 6 mm"*; *"lustro opcjonalnie, wtedy pamietaj ze drzwiczki 18
  plus 4 mm lustro, przedluzamy panele do grubosci drzwiczek i lustra"*;
  *"w tym przypadku mamy mleczne led panele, ale tez beda nakladane na
  scianki boczne, ktore musza w tym przypadku byc, zeby przykryc te
  panele"*; *"czasami jak ktos chce to bedzie mial na plecach tez,
  klikasz na plecy i wyskakuje ci opcja chcesz lustro na plecach?"*; *"5
  na kolumne domyslnie ale oczywiscie z mozliwoscia dodawania,
  przesuwania"*; 14:14: *"panele led trzeba bedzie zamontowac na rowno z
  drzwiami, nie wcisniete, mamy carcas w srodku i panele dookola tego"*;
  14:29: *"nie wlasny box, ktos nam to zrobi na zamowienie"*, *"4k"* (the
  LED panel made to measure, 4000 K); 22:41: *"daj wszystkie mozliwosci z
  panelami, z ledami, bez, szerokosc ustawianych drzwiczek etc"*.
- 22:41, the vanity after the eye-test of T82: *"jak mamy miejsce na
  rurki z tylu to super ze szuflady sa mniejsze ale carcas powinien byc do
  sciany, czyli wszystko w srodku carcasa mniejsze ale carcas do sciany"*;
  *"nie ma wyciecia na U na sinki nawet jak je wlacze ... jest wyciecie
  jak jest 1 szuflada ale nie jak sa 2 szuflady a mamy jeden sink, albo
  mam pomysl: zmniejszmy szuflady na szerokosc, tylko fronty zostawmy
  szerokie i pomiedzy szufladami zrobi sie miejsce na syfon (tylko gorna
  row)"*; *"jak wpieram 2 rows to otwieraja mi sie 2 szuflady ale jedna
  sie otwiera carcas tylko a druga front tylko zamiast 2 carcasy i 2
  fronty, sprawdz"*; *"umywalki przesun bardziej do przodu o jakies 50 mm,
  powod: wchodza w tylna scianke, zlamana regula material nigdy nie
  wchodzi w drugi material"*.
- 22:41, the drawings: *"przekroj z gory pokazuje jakby logike z dolu
  czyli lustrzane odbicie, sprawdz dokladnie"*; *"daj mozliwosc
  exportowania tylko naprzyklad frontow lub cos takiego, nie koniecznie
  wszystkie strony na raz"*.
- 22:41, the client's render (`mockups/client-render.png`): *"zobacz jaki
  sobie wymarzyla klientka zestaw, zobacz na gorna szafke i pamietaj ze to
  tylko wizualizacja"*: the reeded vanity with two columns of drawers, a
  marble top with its upstand, the mirror cabinet over it with its two lit
  stiles flush in the mirror doors, a timber frame round, the LED under.

## LAWS
Every law of T75 to T82 holds in full: LISP IS LAW (this turn cuts: PART A
and PART B begin with the LISP); the fossil six untouchable, a bare
`computeCabinet()` byte for byte its LISP; diagnose before you cut (every
BUG starts with a committed PROBE table); test the way the client clicks;
one law one path; 1:1 = COPY; numbers in the profile; no em or en dash;
the Skylon header on every new file; nothing invented; the drawings are
the model; one ink one layer; the room refuses in words, the engine never
squashes; material never enters material (*"material nigdy nie wchodzi w
drugi material"*, the law since 08.09.2026, broken by T82's basin and
mended here). One law is this turn's own: **the carcass is to the wall**
(PART B): a service void is room taken INSIDE the carcass, never air
between the carcass and the wall; what hangs on the wall or stands at it
has its back at the wall line like every unit, and what is inside it
gives way.

## FROZEN
1. The existing kits' cuts, the fixtures, the six goldens, the T75 to T82
   goldens (the HAWA pocket, the vanity at columns 1 with one basin and the
   U, the reeds): identical, proven by `scripts/t78-classify.mjs` strict
   with this turn's fragments `scripts/t78-classify.d/f44-t83-f*.mjs`.
   PART B changes the vanity's cut on the owner's order: its T82 goldens
   are RE-PINNED with his words of 22:41 quoted in the fragment, every
   other golden untouched.
2. The CNC export of every existing part, `engine/cnc/*`, the DXF path:
   untouched but for the new mirror parts and the vanity's re-cut boxes.
3. The room (`3d/*`): M2 is the only writer of `UnitView.jsx`; V3's line,
   if any, goes through M2. Lighting untouched, the gloss ride untouched.
4. PRO freeze: every PRO file edited is licensed in EXEMPT with the owner's
   words from this file and re-frozen in the same commit; retail through
   the copy script.
5. The suite is green at the start (7590 on 25.10 after PR #81) and at the
   end.

## PART A · THE MIRROR CABINET (F1 to F5)

What it is (`verify/t83/mockups/mirror2.png`, the agreed mockup; the
architect's elevation 34 and section 33): a wall-hung cabinet, here 1350 x
1100 x 215 at 1250 off the floor, 400 over the worktop; a CARCASS of the
house board (sides, top, bottom, two DIVIDERS in the fronts' plane, a
back) with PANELS round it (left, right, top, bottom, each on or off,
their thickness typed, 30 here) that reach forward to the face of the
mirror; three MIRROR DOORS (a board 18 with a mirror 4 glued on) 330, 480
and 330 wide, overlaid on the carcass, hung on the sides and the dividers;
two LED STILES 75 wide standing on the dividers, FLUSH with the mirror
face (*"na rowno z drzwiami, nie wcisniete"*), each a made-to-measure LED
light panel 4000 K; five adjustable GLASS SHELVES 6 mm per bay on pins; a
LED strip under the bottom in a 100 mm bottom box; a LED strip inside
along a side; optionally a mirror on the back (asked when the back is
clicked); optionally recessed into the wall (155 here, 60 proud).

### F1 · THE LISP, FIRST: `reference/lisp/KIT_MIRROR.lsp`
- Parent KIT_WUD_FULL, with these differences, each a named section D1 to
  Dn with its source: (a) BAYS 1, 2 or 3 with the door widths typed
  (*"szerokosc ustawianych drzwiczek"*): the dividers stand where the door
  widths and the stile widths put them, in the fronts' plane (setback 0, a
  divider carries doors, T21 F12's law), full height; (b) the LED STILE: a
  board 75 x (door height) x 22 (the door 18 + mirror 4, so the stile's
  face is the mirror's face) standing on the divider's front edge, its
  width `mirror.stileWidthMm` typed (75), on or off per divider
  (*"z ledami, bez"*); it is a bought LED light panel in the BOM and a cut
  board in the carcass finish only where the owner says "timber stile"
  (`stile: 'led' | 'timber' | 'none'`); (c) the DOOR: the board 18 in the
  front finish plus, when `mirror_doors` is on, a mirror 4 (a bought part,
  m2) glued to its face: the door's thickness in the room and on the
  sheets is 22, the hinge ladder reads the door's weight with the mirror
  (board 700 kg/m3 PROPOSED plus mirror 10 kg/m2); the cups as WUD's;
  (d) the PANELS ROUND: `panels: { L, R, top, bottom }` each on or off,
  thickness `panel_t` typed (30), in the front finish, standing on the
  carcass's outside and reaching forward to the mirror face (depth = the
  carcass depth + 22 when the doors carry a mirror, + 18 otherwise), the
  top and bottom panels between the side panels when both are on, over
  the carcass when they are off; (e) GLASS SHELVES: the shelf item with
  `material: 'glass'` (6 mm toughened, a bought part, no CNC), 5 per bay
  by default on the pin ladder, movable and addable as every shelf
  (*"z mozliwoscia dodawania, przesuwania"*), the pins the house's; (f)
  the BACK: the house back, with `mirror_back` on it a mirror 4 (a bought
  part, m2) on its inside face; (g) the BOTTOM BOX: 100 mm (PROPOSED
  `mirror.bottomBoxMm`) under the bottom board, closed by a front strip in
  the front finish, the LED under on its underside and the driver in it;
  (h) the RECESS: `recess_mm` typed (0 is on the wall): the cabinet stands
  that far into the wall, read by the room as T79's recess is (the wall
  element), the panels and the mirror face proud by depth - recess.
- Paren balance test; `test/turn35-lisp-parens.test.js` lists the file.

### F2 · THE KIT: MIRROR_CABINET
- `engine/types.js`: `MIRROR_CABINET`, family bathroom, library group
  Bathroom (beside the vanity), row "Mirror cabinet", `mount: 'wall'`,
  defaults `profile.mirror.defaults` (width 1350, height 1100, depth 215,
  mount 1250, bays 3, door widths [330, 480, 330], stile 75 led, panels
  all on at 30, mirror doors on, mirror back off, glass shelves 5 a bay,
  LED under on, LED inside on, bottom box 100, recess 0; PROPOSED where
  not the owner's). `engine/cabinet.js` mirrors KIT_MIRROR.lsp byte for
  byte; `engine/mirrorCabinet.js` holds the arithmetic the kit shares
  (the bay layout from door widths and stiles, the panel depths, the
  weight). A new golden `verify/t83/goldens/golden-mirror.json`.
- Tests `test/turn83-f02-mirror-kit.test.js`: the default cabinet gives
  three doors 330 / 480 / 330 x 1100 less the gaps, two dividers at the
  stile centres, two stiles 75 x 22, four panels 30 reaching 237 deep,
  fifteen glass shelves, the bottom box, the back; `stile: 'none'` gives
  no stiles and the doors meeting over the dividers as WUD's; `panels`
  off gives the bare carcass; `mirror_doors` off gives 18 doors and the
  panels 233 deep; the weight class and hinge count for a 480 mirror
  door.

### F3 · THE ROOM
- `3d/MirrorCabinet.jsx` (new, M2) through the one mount point in
  `UnitView.jsx`: the mirror doors with a mirror material (a reflective
  grey with an environment reflection, PROPOSED, as the owner's render
  shows), the LED stiles lit (an emissive warm white 4000 K panel, flush),
  the glass shelves translucent (as T30's glass doors are), the LED under
  and inside as `ledStrips.js` draws them, the bottom box, the panels
  round, the recess into the wall (the wall element the kit writes). The
  back's click: `openModal('mirror-back', ...)` asks "Mirror on the back?"
  (Yes / No, the store's `setMirrorBack`).
- Tests `test/turn83-f03-mirror-room.test.js`: the solids the room draws
  equal the kit's parts by id; the mirror door 22 thick in the room; the
  stile's face at the mirror's face (z equal to 0.01); the recess moves
  the whole cabinet into the wall by `recess_mm`.

### F4 · THE BOM
- Lines per cabinet: "LED light panel, made to measure, 4000 K, 75 x H"
  (one per LED stile), "Mirror 4 mm" (m2, the doors and the back when
  on), "Glass shelf 6 mm toughened, W x D" (one per shelf), "LED strip
  under" and "LED strip inside" (lm), "LED driver 24 V" (one), "Fused
  spur by electrician" (a note), the hinges by weight, the shelf pins,
  the hanging brackets as the vanity's. Articles empty strings
  (`profile.mirror.articles`) for the owner to fill.

### F5 · THE RIGHT PANEL, THE LIBRARY, THE SHEETS
- Right panel (EXEMPT with the owner's words): section MIRROR CABINET:
  Bays 1 / 2 / 3; Door widths (one field a bay, the sum checked against
  the width with the stiles, refused in words when it does not add up);
  Stiles LED / timber / none and their width; Panels L / R / top / bottom
  on or off and Panel thickness; Mirror doors on / off; Mirror back on /
  off; Glass shelves per bay; LED under on / off; LED inside on / off;
  Bottom box on / off; Recess mm. Library rows in PRO's Kitchen and
  Wardrobe libraries under Bathroom; retail through the copy script.
- Sheets: the fronts sheet draws the three mirror doors and the two
  stiles (a new ink `LED_STILE`, warm yellow, one ink one layer), the
  panels round, the unit number; the section shows the recess, the
  bottom box and the LED; the plan the stiles flush with the doors.

## PART B · THE VANITY MADE RIGHT (F6 to F9)

### F6 · THE CARCASS TO THE WALL, THE VOID INSIDE
- *"carcas powinien byc do sciany, czyli wszystko w srodku carcasa
  mniejsze"*. T82 stood the carcass 80 off the wall (`wall_gap` = 10 +
  80). Now: the vanity's `wall_gap` is the house clearance like every
  unit (10), its carcass depth the typed depth (500) TO THE WALL; the
  service void `vanity.serviceVoidMm` (80) is taken INSIDE: the two rails
  stand at the carcass back as today (flush with the sides' back edges),
  the DRAWER BOXES are shortened by the void (their runner chosen for
  depth - void on the ladder, the box 10 shorter than the runner, the
  17.10 law), the fronts unchanged, the worktop reaches the wall over the
  carcass as any run's; the pipes run behind the boxes between the rails
  (the back is open between them as T82 cut it). KIT_VANITY.lsp's D rows
  of the void are re-written by V1 with the owner's words; the T82 vanity
  goldens RE-PINNED. The Check's note #45 says "Service void 80 inside the
  vanity behind the drawers".
- Tests: a VANITY3 900 x 600 x 500: `wall_gap` 10, sides 500 deep, boxes
  on the runner for 420 (the ladder's rung at or under 500 - 80), rails at
  the back; the chest (T82's columns rule) untouched.

### F7 · THE TRAP'S U AT TWO COLUMNS WITH ONE BASIN
- PROBE (P1, `verify/t83/f07-probe.md`): `engine/vanity.js vanityWastes`
  puts one basin's waste at W / 2; at `columns: 2` the divider stands
  there, `vanityTopBoxUnder` finds no box under the waste and the plan's
  row is `status: 'DIVIDER'`: no U is cut, no sentence is said (the owner:
  *"nie ma wyciecia na U na sinki nawet jak je wlacze ... jest wyciecie jak
  jest 1 szuflada ale nie jak sa 2 szuflady a mamy jeden sink"*).
- The owner's road (*"zmniejszmy szuflady na szerokosc, tylko fronty
  zostawmy szerokie i pomiedzy szufladami zrobi sie miejsce na syfon,
  tylko gorna row"*): at columns 2 with one basin, the TOP ROW only: the
  divider stops under the top row (a short divider from the bottom to the
  underside of the top row's runner line, the top row's bearer a rail or
  the fixed shelf the columns rule already fixes over both stacks), the
  two top boxes are each NARROWED toward the centre by `vanity.trapWidthMm
  / 2 + vanity.trapClearMm` (160 / 2 + 20 PROPOSED), their runners moved
  with them, their fronts unchanged (wide, as the columns rule has them),
  and the trap stands in the gap between the two boxes, which also takes
  the U of F8 out of neither (no U needed where there is air). Check #39
  stays for the second row as before. At columns 2 with TWO basins the
  T82 road holds (one U in each column's top box).
- Tests `test/turn83-f07-vanity-trap.test.js`: VANITY3 at columns 2,
  sinks 1: the divider's height, the two top boxes' widths, the gap 200
  between them centred on W / 2, the fronts' widths unchanged, the
  runners' positions; sinks 2: two U cuts as T82; columns 1: the U as
  T82.

### F8 · THE BASIN 50 FORWARD, AND IT NEVER ENTERS A BOARD
- *"umywalki przesun bardziej do przodu o jakies 50 mm, powod wchodza w
  tylna scianke, zlamana regula material nigdy nie wchodzi w drugi
  material"*. `profile.vanity.basin.wasteFromBack` 200 becomes 250
  (PROPOSED reading of "about 50"), the oval's centre with it; and the
  engine CHECKS the bowl's solid against every board of the carcass (the
  rails, the sides, the back pieces, the top drawer's box after F7) with
  the house's clash test: a bowl that would enter a board is refused in
  words (#48 grows the sentence: "the bowl enters RAIL-TOP by N mm: move
  the basin forward or take a shallower bowl"), never drawn through it.
  The U of the top box (columns 1) follows the waste.
- Tests `test/turn83-f08-vanity-basin.test.js`: the default VANITY3 with
  one basin: no board enters the bowl's oval or its depth; the waste 250
  from the back; a bowl pushed to 50 from the back says #48 in words.

### F9 · THE OPEN OF A TWO-COLUMN VANITY
- PROBE (P1, `verify/t83/f09-probe.md`): the drawer-box parts of a column
  stack carry `meta: { drawer: i }` with NO `zone` (cabinet.js 5697 to
  5728 on 25.10: sides, back, front, bottom), while the drawer front
  carries `meta: { drawer: i, zone }` (5896); the room's open gesture
  pairs a front and its box by `meta.drawer`, so with two columns drawer
  3's front of column 1 opens with the box of column 2 (the owner: *"jedna
  sie otwiera carcas tylko a druga front tylko"*). Fix: every box part of
  a column stack carries `zone` as its front does (one line a part), and
  the room's pairing reads `drawer` AND `zone`. The chest of T82 (columns
  2) is fixed by the same line.
- Tests `test/turn83-f09-open-columns.test.js`: at columns 2 every box
  part's `meta.zone` equals its front's; the walk opens the top left
  drawer and reads the box and the front of the same column moving.

## PART C · THE DRAWINGS (F10, F11)

### F10 · THE PLAN IS NOT A MIRROR
- *"przekroj z gory pokazuje jakby logike z dolu czyli lustrzane odbicie,
  sprawdz dokladnie"*. PROBE (P1, `verify/t83/f10-probe.md`): the base
  plan of the T81 kitchen (BUD 600, BUD 800, BUDR2 500 from the left on
  wall A, the room's wall A at the bottom of the key plan): where does
  each unit's number land on the plan sheet, and is the order left to
  right the same as the fronts sheet's (a viewer standing in the room
  facing wall A sees 01, 02, DR01 left to right; the plan seen from above
  with wall A at the bottom shows them in the SAME order)? Read the
  projector's plan view (`projector.js` 1804 on 25.10, `at = [ox + W / 2,
  oz + D / 2]`) and `setPlan.js`'s frame: the sign of the plan's y axis
  (into the room) and of x along the wall for walls B, C, D. The probe
  names the mirrored axis per wall; the fix flips the one sign so the plan
  reads as a plan (looking DOWN, north up: wall C at the top, wall A at
  the bottom, wall D on the left, wall B on the right, every unit where
  the key plan's arrow says). The key plan and the section markers follow.
- Tests `test/turn83-f10-plan.test.js`: the unit numbers' x on the plan
  increase left to right as on the fronts sheet for wall A; for wall C
  (the opposite wall) they decrease, as a real plan has them; the section
  marker A-A stands where the section is cut.

### F11 · EXPORT THE SHEETS YOU CHOOSE
- *"daj mozliwosc exportowania tylko naprzyklad frontow lub cos takiego,
  nie koniecznie wszystkie strony na raz"*. The Drawings window's Set tab
  gets a check box per sheet (all on by default, "All" and "None"
  buttons); "Drawing set (PDF)" exports the checked sheets in the set's
  order, the page numbers "n / N" counting the exported ones; the Wall
  DXF the same. The choice lives in the window (ui state), not in the
  project.
- Tests `test/turn83-f11-export-pick.test.js`: `exportWallDrawingsPdf`
  given three of nine sheets writes three pages numbered 1 / 3 to 3 / 3;
  the walk unticks all but Fronts and reads a one-page PDF.

## PART D · THE WALK (F12)
- `scripts/t83-walk.mjs`, real mouse, the built app, ledger
  `verify/t83/walk.txt`, frames `verify/t83/f12-*.png`: (1) Library >
  Bathroom > Mirror cabinet: the cabinet in the room over a vanity, the
  stiles lit, the doors opened (the viewer's Open all), the back clicked
  and "Mirror on the back?" answered Yes, Recess 155 typed, Panels bottom
  off; the BOM read (LED panels 2, mirror m2, glass 15); the fronts sheet
  with the stiles; (2) Vanity 3 drawers: sides 500 deep at the wall, the
  boxes on the shorter runner, the worktop to the wall; Columns 2 and
  Sinks 1: the gap between the top boxes read, the top left drawer opened
  (box and front together); the basin 250 from the back, no #48 clash;
  (3) the base plan of the T81 kitchen: 01, 02, DR01 left to right under
  wall A, the section marker; the Set tab with only Fronts ticked, the
  PDF read back with one page.

## NOT THIS TURN
- The WC unit, the tallboy, the vanity with doors: the next Bathroom turn.
- The mirror's own hinge article (the ladder by weight stands); a mirror
  on the shelves; a shaver socket; a demister pad (a BOM note at most).
- The 1:1 model-space DXF.

## LINEAGE (one line a test reads from this file)
T79's horizontal notch stays as built and its owner's words stay here
because `test/turn79-f05-edge-notch.test.js` reads them from CLAUDE.md:
*"cut the corner działa idealnie, ale możesz zrobić mi też poziome cut?
wszystkich 4 rogów?"* (18.10.2026). T82 (merged as PR #81 on 25.10.2026)
is the base of this turn; its numbers hold but for the vanity's void and
the basin's place, changed here on the owner's order.

## TESTS AND PROOF
Full suite once per PART and at the end; the goldens proven (`t78-classify`
strict with `f44-t83-f*.mjs`, REPINNED only the vanity's T82 goldens with
the owner's words, the new mirror golden NEW); the six base goldens
IDENTICAL; `t78-copy --check`; `t83-walk.mjs`; the LISP paren balance of
KIT_MIRROR and the amended KIT_VANITY; NEW_FILES lists every new file;
every F the six stations of DONE in twenty lines.

## PR BODY
The probe tables (F7, F9, F10); files and lines per F; the LISP sections;
the EXEMPT entries; the goldens proven and the re-pinned ones named with
the owner's words; the test count before and after; the walk result;
DECISIONS TAKEN; SKIPPED AND WHY; RED AT THE END; THE NUMBERS below.

## THE NUMBERS (all in profile.js; none typed in the UI without the owner)
| Number | Value | Source |
| - | - | - |
| Mirror cabinet defaults | 1350 x 1100 x 215, at 1250, 400 over the top | Holland Park elevation 34 and section 33; CONFIRMED by the drawing |
| Doors | 330 / 480 / 330, widths typed per bay | the drawing; owner 22:41 "szerokosc ustawianych drzwiczek"; CONFIRMED |
| LED stile | 75 wide, 22 thick, flush with the mirror face, made to measure, 4000 K | owner 14:14, 14:29; CONFIRMED |
| Mirror | 4 mm on an 18 door; optional; on the back when asked | owner 14:09; CONFIRMED |
| Panels round | L, R, top, bottom each on or off, thickness typed (30), to the mirror face | owner 14:09, 14:14; CONFIRMED |
| Glass shelves | 6 mm toughened, 5 a bay, movable | owner 14:09; CONFIRMED |
| Bottom box | 100 | the drawing's 100; PROPOSED as a box |
| Recess | typed, 155 here | the drawing; CONFIRMED |
| Mirror weight | 10 kg per m2 added to the door | PROPOSED |
| Vanity void | 80, INSIDE the carcass, the carcass to the wall | owner 22:41; CONFIRMED |
| Trap gap at columns 2 | the top boxes narrowed by 80 + 20 each, a 200 gap centred | owner 22:41 "zmniejszmy szuflady na szerokosc"; the 20 PROPOSED |
| Basin waste from the back | 250 (was 200) | owner 22:41 "o jakies 50 mm"; CONFIRMED |
| Bowl vs boards | refused in words, never drawn through | the law of 08.09.2026; CONFIRMED |
| Plan orientation | looking down, wall A at the bottom, units as the fronts sheet | owner 22:41; CONFIRMED |
| PDF sheet picker | check boxes, all on by default | owner 22:41; CONFIRMED |
| Agents | 10 and INT, no review wave | T82's bill; CONFIRMED |
