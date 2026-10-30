# CLAUDE.md, TURN 86B · THE SECOND SHIFT OF 30.10: THE LIST OF EIGHT ON T85'S SHOULDERS

Run autonomously. Zero questions, zero stops: every decision below is the
owner's own (30.10.2026, 21:45 to 23:02, over his two screenshots, his
project file and his answers in chat; his words are quoted where they
decide), so nothing here is asked again. Where a number is marked PROPOSED
it is the turn's best reading and is used as written: the owner confirms
or changes it after the merge, never during the run. If a point cannot be
done, skip it WHOLE, write why in the PR, and go on to the next. Full
suite, never `--silent`. Frames under `verify/t86b/`. Branch
`claude/t86b-the-list-of-eight`, cut from THIS branch (`chat/t86b-spec`,
which is T85's finished branch `claude/t85-recess-follows` plus this file
and the owner's evidence), one commit per F, PR against main at the end,
opened AFTER T85's PR and saying so in its first line; the owner merges T85
first, then this. Nothing lands in Petros from this session.

THIS TURN STANDS ON T85. T85 (the recess column follows the recess, the
RETURNs on Cabineo, the doors open to 90) is in this branch's history and
is NOT re-audited or re-touched here: its goldens, its tests and its
numbers hold as it left them. Where this turn edits a file T85 edited
(`cabinet.js`, `projectStore.js`, `profile.js`), it edits under T85's
changes, never through them; a T85 test that goes red is a defect of THIS
turn to fix in this turn's own code, never by editing T85's test.

## THE COST OF THE NIGHT (the law of T83 and T85, kept)
FOUR agents and one integrator, never ten. NO review wave: a slice is
reviewed ONCE by INT when its patch lands; the morning audit is the
owner's. Targeted tests while writing; the full suite ONCE per PART when
it lands and ONCE at the end. Every agent reads this file and its PART,
never the whole repo: INT hands each agent the files it OWNS and the ones
it must read. A report is twenty lines, the six stations of DONE. Agents
and parallel mode ON.

## THE AGENTS (4 slices and one integrator)
| Agent | Slice | OWNS (writes) | Hands patches to |
| - | - | - | - |
| INT | the only writer of `src/engine/cabinet.js`, `src/stores/projectStore.js`, `src/engine/profile.js`, `src/engine/runs.js`; applies patches in F order; the goldens of this turn pinned and named; `scripts/t78-classify.d/f51-t86b-f*.mjs`; the freeze test's EXEMPT rows and re-hashes; NEW_FILES; the full suite once per PART and at the end; classifier strict, copy check, walk; the PR | the four central files, the manifest, `test/turn59-f1-the-switch.test.js` | nobody |
| E1 | PART A, the engine: F1 the L's arm is a neighbour (no infill); F2 the Section's numbers for a column stack; F3 the shelf over a column spans the carcass; F4 the chest island's boards (the plinth all round, the back panel, the worktop overhang option) | `src/engine/shelf*.js` if a pure module is needed, `src/lib/chestIsland.js` (NEW, pure: the island's plan from a chest), `test/turn86b-f01-l-neighbour.test.js`, `test/turn86b-f02-column-section.test.js`, `test/turn86b-f03-shelf-over-column.test.js`, `test/turn86b-f04-chest-island-engine.test.js`; patches to INT for `cabinet.js`, `runs.js`, `profile.js` | INT |
| S1 | PART B, the store and the room: F5 the chest as an island (A: back panel, B: back to back), grab and move, rotate by 90; the kasacja of the share-out's second button (F6) | `src/3d/ShareOutBar.jsx`, `src/engine/shareOut.js`, `src/components/AddItems.jsx` or the library entry the chest road hangs on, `src/3d/IslandPlan*.jsx` only if the island's drag needs a line, `test/turn86b-f05-chest-island-store.test.js`, `test/turn86b-f06-share-out-one-button.test.js`; the store patch to INT | INT (projectStore.js) |
| U1 | PART C, the UI: F7 Dimensions on the bar and the ink in Settings; F8 the worktop's finish (sprayed panel) for the chest and the desk | `src/components/studio/SceneViewMenu.jsx`, `src/components/WizardSettings.jsx`, `src/stores/uiStore.js`, the worktop section of `src/components/RightPanel.jsx` (or the worktop modal it opens), `src/engine/design.js` (the worktop record's `finish`), `src/3d/materials.js` (one surface road for a sprayed worktop), `test/turn84-f06-scene.test.js` (REWRITTEN), `test/turn86b-f07-view.test.js`, `test/turn86b-f08-worktop-finish.test.js`; the profile line to INT | INT (profile.js one line, EXEMPT rows) |
| G1 | PART D, the picture and the probes: F9 the left corner L in the scene; F10 the two probes as tests (the TOP mirror across every kit, the hardware silhouettes); F11 the walk | `src/3d/**` EXCEPT `ShareOutBar.jsx` (S1's) and `materials.js` (U1's), `test/turn86b-f09-corner-mirror.test.js`, `test/turn86b-f10-probes.test.js`, `verify/t86b/corner-diagnosis.md`, `scripts/t86b-walk.mjs`, `verify/t86b/walk.txt`, `verify/t86b/f*-*.png` | INT (EXEMPT rows if a frozen 3D file is edited) |

## THE ORDER
The owner, 30.10.2026, in his words where they decide:
- 21:54, over `verify/t86b/owner-view-menu.png`: *"menu, patrz SS: dimension
  powinien pojsc do glownego paska, ustawienie koloru wymiarowania powinno
  byc w settings nie tutaj"*.
- 21:56, over `verify/t86b/owner-two-corners.png`: *"zobacz lewa szafa, bul
  i bur sie nie odwrocily"*; 22:03 on the tall board standing in front of
  the left unit: *"bok, tutaj nie ma drzwi"*; 22:21, after the chat proved
  the engine mirrors: *"moze i zrobil lustro, ale te bul i bur powinny byc
  przekrecone o 90 stopni, czyli wychodzi na to ze dziala CNC ale nie
  dziala 3D, tak?"* (yes).
- 22:26: *"jak mamy szafy dochodzace do L shape szafy to liczy infill a nie
  powinien"*.
- 22:28 (corrected from an earlier sentence about shelves, which are NOT
  touched: *"polki dzialaja dobrze nie ruszaj"*): *"nie dziala equal
  rozlozenie szaf karkasow"*: of the two share-out buttons the second does
  not work, *"usun ta funkcje z paska"*.
- 22:52: *"chest powinna byc mozliwosc odsuniecia od sciany ale nie na
  zasadzie back move tylko powinna byc mozliwosc na srodku pokoju cos jak
  wyspa ale przez grab i move; i dodanie panela z tylu lub polaczenie
  szuflad z 2 stron; chest dodany w changing room; mozliwosc dodania
  worktopu z naszego sprayowanego panelu nie tylko szary worktop"*.
- 22:56, over the chat's mockup (plan A, plan B, section): *"nie koniecznie
  nawis, nawis jako opcja prosze; 1 - oba; 2 - wchodzi; 3 - dla komody oraz
  dla biurka, opcja inny blat tez (w przyszlosci) Hi-Macs"*.
- 23:02, on the two observations of 19:23 (the Section for a column stack,
  the shelf over a column) and the two probes: *"zrob jak rekomendujesz"*
  (all in).
- 22:42 and 22:45, the frame of the night: the list of Cabinet Core is
  CLOSED after this turn until the Joinery Core link ships; nothing new is
  added to this file.

## WHAT THE CHAT ALREADY PROVED (22:10 to 22:40; G1 reads before F9)
The engine mirrors. Three probes under `verify/t86b/probe-mirror-*.mjs`
(run from the repo root: `node verify/t86b/<file>`): a bare
`computeCabinet()` of CORNER_L_WARDROBE and CORNER_L_BASE in both hands,
square and not, with doors, shelves and drawers; the same through the store
in a 4000 x 3000 room; an L born left and moved right against one born
there; both hands resized. In every case LEFT = MIRROR(RIGHT) board for
board. The owner's own file `verify/t86b/owner.ccproject` (one
CORNER_L_WARDROBE, left, 1000 x 1000 x 2150, no doors, no shelves) computed
through `paramsForEngine` gives the eight boards of a correct left L:
BACK-A x 0 w 1000 d 18; BACK-B x 0 z 18 w 18 d 982; SIDE-A x 982 z 18 w 18
d 550 (hand R); SIDE-B x 18 z 982 w 550 d 18 (hand L); TOP-L and BOTTOM-L
964 x 964 at 18,18; PLINTH-A, PLINTH-B. Its mirror against the right twin
is exact. So the CNC is right and the PICTURE is wrong: in the owner's
screenshot the board standing at the front left of the left unit is a
tall NARROW board running along the left wall, where the engine's SIDE-B
is a 550 mm WIDE board across the arm's end. A side drawn along the wrong
axis, for the left hand only.

## LAWS
Every law of T75 to T85 holds in full: LISP IS LAW (no cut law changes in
this turn: F3 and F4 change what the ENGINE emits for a shelf's span and a
plinth's sides under the existing kits' laws, named in the LISP by one
dated comment line each where a routine's reading changes, no new D
numbers); the fossil six untouchable (`scripts/t64-classify.mjs --dump`
vs `verify/t70/goldens-base.json` IDENTICAL); a bare `computeCabinet()`
byte for byte its LISP; material never enters material; the room refuses
in words and never clamps in silence; one law one path; numbers in the
profile, none typed; 1:1 = COPY (`scripts/t78-copy.mjs --check` CLEAN);
the Skylon header on every new file; no em or en dash in anything written;
test the way the client clicks; a new function has a visible entry in the
same package; a green test beside old broken code is a lie; "usun" is a
physical deletion, never a gate. Eight laws are this turn's own:
1. **THE L'S ARM IS A NEIGHBOUR.** The arm of a Corner L on the adjacent
   wall is, to the run that ends against it, a cabinet side: the run meets
   it as cabinet meets cabinet, with no side infill and no wall gap. The
   owner: *"liczy infill a nie powinien"*.
2. **A STACK IN A COLUMN HAS THE SAME NUMBERS AS A STACK ACROSS.** The
   Section's "Stack height" and "Partition (locked, required above the
   stack)" rows read for a column stack exactly as they read for a
   full-width stack (T79).
3. **A SHELF SPANS BETWEEN ITS WALLS AT ITS OWN HEIGHT.** Above a recess
   column's cap there are no dividers (T85 law 3), so a shelf added there
   runs side to side of the carcass, never the column's width; a divider
   the joiner adds himself above the cap narrows it as any divider does.
4. **A CHEST CAN STAND IN THE ROOM.** A chest of drawers (and nothing else
   tonight) can be made an island: an island of its own footprint, the
   chest on face A, moved by grab in plan and in 3D, turned by 90. Variant
   A: a sprayed back panel on face C. Variant B: a second chest on face C,
   back to back. One worktop over the whole island (the island's law of
   9.10). The owner: *"cos jak wyspa ale przez grab i move"*, *"dodanie
   panela z tylu lub polaczenie szuflad z 2 stron"*, *"oba"*.
5. **A FREE-STANDING PLINTH IS SET BACK ALL ROUND.** A unit standing on an
   island face whose carcass sides and back are in the room has its plinth
   set back on every exposed side by the profile's plinth setback, not only
   at the front; the back of variant A is the panel's, so its plinth is set
   back behind the panel's face.
6. **THE WORKTOP'S OVERHANG IS A NUMBER, DEFAULT NONE.** On a chest island
   and on a desk the slab's overhang is `profile.worktop.islandOverhangMm`,
   0 by default (the owner: *"nie koniecznie nawis, nawis jako opcja"*),
   a single field in the worktop section; a kitchen island's existing
   overhang law is untouched.
7. **A WORKTOP HAS A FINISH.** A worktop record carries `finish: 'decor' |
   'spray'`: 'decor' is today's road (the project's worktop decor, the grey
   slab), 'spray' is the house's sprayed panel in a RAL from the project's
   spray palette, rendered by the SAME surface road the sprayed fronts use
   (sheen-driven, T80 gloss) and priced as a sprayed panel in the BOM.
   Offered on the chest island and the desk tonight (the owner: *"dla
   komody oraz dla biurka"*); other slabs keep 'decor' until he says so;
   HI-MACS and other materials are a later enum value, not tonight.
8. **ONE SHARE-OUT BUTTON.** The run is shared out equally by one button;
   the second ("one more cabinet") and its whole road are deleted. The
   owner: *"drugi nie dziala, wiec usun ta funkcje z paska"*.
And law 9, **THE LEFT CORNER IS THE MIRROR OF THE RIGHT**, in the engine
(proved) AND in the scene: the picture shows exactly the engine's boxes,
nothing in it stands where the engine put no board.

## FROZEN
1. The six base goldens IDENTICAL; T75 to T85 goldens IDENTICAL except
   those this turn RE-PINS by name with the owner's words: the 28.10 and
   T85 recess-column fixtures whose shelves above the cap change span (F3,
   *"zrob jak rekomendujesz"* on law 3), nothing else. F1, F2, F4 to F10
   re-pin nothing: F4's plinth and F7's finish are NEW fixtures.
2. T85's code, tests and goldens: as it left them (the paragraph at the
   top).
3. Shelves in the Section: the rows, Center all, Center between, the
   ladder: untouched (the owner, 22:28: *"polki dzialaja dobrze nie
   ruszaj"*).
4. The View popup's other seven entries keep their guards, labels,
   sentences and store actions exactly (T84 F6; FROZEN 3 of T80). The
   scene toggles bar's existing four keep their order and hooks.
5. PRO freeze: every PRO file edited is licensed in EXEMPT with the
   owner's words from this file and re-frozen in the same commit. Retail
   copies NOT edited: `t78-copy --check` CLEAN. `TopBar.jsx` (the legacy
   View menu) is NOT touched: PROPOSED, it dies with the legacy shell.
6. The kitchen island (9.10), its plan modal and its worktop: untouched
   except where F5 adds the chest road BESIDE them; a kitchen island
   behaves tonight exactly as yesterday.
7. The suite is green at the start (the count on this branch at the start
   of the run, written in the PR) and at the end, plus this turn's tests.

## PART A · THE ENGINE (F1 to F4; E1 and INT)

### F1 · The L's arm is a neighbour (law 1)
1. Today `runs.js` already knows the arm (`cornerLAdjacentSpan`, T78 F1)
   and stands a stand-in unit of its span in `others` for the plus. The run
   layout that writes `side_infill_left_mm` / `side_infill_right_mm`
   (`projectStore.js` around 2960, `refreshAutoParts`, and the run-end
   classification that decides 'wall' against 'unit') does NOT see it: the
   run ends against the arm as against a wall and an infill is born.
2. The fix is ONE arithmetic in one place: wherever a run's end is
   classified, the stand-in unit of the arm's span (the same
   `cornerLAdjacentSpan`) counts as a unit on that wall at that level. The
   end reads 'unit'; the infill there is 0; the corner stop is the arm's
   end. No second road: the plus and the infill read the same stand-in.
3. `test/turn86b-f01-l-neighbour.test.js`: 4000 x 3000 room, a
   CORNER_L_BASE on wall 0 (left, arm B on wall 3), a BUD added on wall 3
   at the arm's end: its `side_infill_*` toward the arm is 0, the run's end
   is 'unit', the infill part list has no infill at that end; the same with
   a CORNER_L_WARDROBE and a WARDROBE; the mirror case (an L in the right
   corner, a unit on wall 1); a unit on wall 3 that does NOT reach the arm
   keeps its gap and plus as today.

### F2 · The Section's numbers for a column stack (law 2)
1. `cabinet.js` `derived`: `drawerTotalH` and `partition_bottom_y` (T79)
   are written for the full-width stack only. For a column stack
   (`assemblies.columnDrawers[zone]`) the same two numbers are written per
   zone: `derived.columnStacks[zone] = { drawerTotalH, partition_bottom_y
   }` (PROPOSED shape), computed from the column's boxes and its cap as the
   full-width ones are from theirs.
2. `RightPanel.jsx` (U1 reads, E1 writes the reading through INT if it
   touches the store; the panel's own line is U1's by patch): the Section
   for a column stack shows "Stack height <n>" and "Partition (locked,
   required above the stack) <y>" from the zone's numbers, in the same
   rows and words as the full-width stack.
3. `test/turn86b-f02-column-section.test.js`: the owner's 1200 x 2150 x
   300 wardrobe before the 800 recess with three drawers (T85's fixture a):
   `derived.columnStacks[zone].drawerTotalH` equals the sum of the three
   fronts and gaps, `partition_bottom_y` equals the cap's underside; the
   full-width stack's numbers unchanged on the six base goldens (IDENTICAL
   by definition: `derived` is not a cut).

### F3 · The shelf over a column spans the carcass (law 3)
1. `cabinet.js`: a shelf item in a zone whose dividers END below the
   shelf's height (the recess column's dividers end at the cap, T85 D29;
   D28's `meta.recessColumn` items) is placed between the nearest walls AT
   ITS HEIGHT: the carcass sides when no divider reaches that height, a
   joiner's own divider when one does. The shelf's cut (the LISP's shelf
   routine) is unchanged: only which walls it is measured between.
2. The 28.10 / T85 recess-column fixtures with a shelf above the cap are
   RE-PINNED by name in `f51-t86b-f03.mjs` with *"zrob jak
   rekomendujesz"* (23:02) beside each; the six base goldens IDENTICAL.
3. `test/turn86b-f03-shelf-over-column.test.js`: the owner's wardrobe,
   dividers 210 / 972 ending at 629, a shelf added to Column 2 at 1200:
   its x runs 18 to 1182 (side to side, less the setback law), its
   supports are the sides (pins on BUL and BUR at that height, read from
   the sides' drillings), the engine says nothing red; a shelf BELOW the
   cap in the column keeps the column's width; a joiner's divider added
   above the cap narrows the shelf to it.

### F4 · The chest island's boards (laws 4, 5, 6)
1. `src/lib/chestIsland.js` (NEW, pure, the Skylon header):
   `chestIslandPlan({ chest: { width, depth, height }, variant: 'panel' |
   'double', panelT, profile }) -> { island: { w, d }, faces: { A: unit,
   C: unit | panel }, worktop: { w, d, overhang } }`: the island's
   footprint is the chest's width by its depth (variant A: plus the
   panel's thickness behind; variant B: twice the depth), the worktop the
   footprint plus `islandOverhangMm` all round. Tested as written.
2. `cabinet.js` (INT, E1's patch): a unit whose `position.wall` is an
   island face and whose back faces the room (variant B's two chests do
   not: their backs meet) gets `plinth` set back by
   `profile.plinth.setbackMm` (the existing front setback number) on the
   back too; a unit on an island face whose side is a free end gets the
   side set back as well (the PLINTH-L / PLINTH-R returns the kitchen
   island already knows, read from the same law). The chest's back panel
   of variant A is the FREE PANEL kit (25.10's attach law, gap 0) attached
   to face C, standing the chest's full width and height, its thickness
   the project's board, finish sprayed (law 7's 'spray' on a panel is the
   panel's existing sprayed finish).
3. `profile.js` (INT): `worktop.islandOverhangMm: 0` (CONFIRMED default),
   `worktop.finishes: ['decor', 'spray']` (the enum, PROPOSED name).
4. `test/turn86b-f04-chest-island-engine.test.js`: the plan's numbers for
   a 1200 x 600 x 900 WARDROBE_CHEST3 in both variants; the plinth set back
   on three sides (variant A) and two sides (variant B) by the profile's
   number, read from the plinth panels' boxes; the back panel's box 1200 x
   900 x 18 on face C; a kitchen BUD on a wall: plinth as yesterday (byte
   identity of the six).

## PART B · THE STORE AND THE ROOM (F5, F6; S1 and INT)

### F5 · The chest as an island (law 4)
1. THE ENTRY (a new function has a visible entry): in Add, beside the
   chest kits, "Chest in the room" (PROPOSED label), and on a chest already
   standing on a wall, in its full panel's layout group, "Stand in the
   room" (PROPOSED label). Both run `projectStore.addChestIsland(chestId |
   type, { variant })`: an island record of `chestIslandPlan`'s footprint
   at the room's centre (or where the dragged chest was dropped), the chest
   on face A (moved from its wall, its params kept), variant A's panel on
   face C or variant B's second chest (a copy of the first's params) on
   face C; one batch, one undo. The variant is asked ONCE in a small
   Studio popup with two pictures from the chat's mockup (A: back panel, B:
   back to back), remembered as the island's `variant`, changeable in the
   island's panel.
2. GRAB AND MOVE: the island already moves (`moveIsland`); the chest
   island moves by dragging the CHEST (its carcass) in plan and in 3D as a
   wall unit drags along its wall, the whole island following, the room
   refusing in words when a face would enter a wall or another unit
   (`islandInsideRoom`, `polygonsOverlap`), never clamping in silence. ROTATE
   by 90: a button in the island's panel and the R key with the chest
   held (PROPOSED), turning the island about its centre, refused in words
   when it would not fit.
3. The worktop over the chest island: `worktopsFor` on the island returns
   the one slab (the island's law) with `islandOverhangMm`; the slab's
   finish is law 7's, offered in the worktop section (F8).
4. `test/turn86b-f05-chest-island-store.test.js`: a chest added to the
   room through the entry lands as an island at the centre with the chest
   on face A (variant A: the panel on C, 1200 x 900 x 18; variant B: the
   second chest on C with the first's params); `moveIsland` by +300 moves
   chest, panel and worktop together in one undo step; a move into a wall
   is refused in words and nothing moves; rotate by 90 turns the footprint
   and keeps the faces; "Stand in the room" on a wall chest leaves the wall
   run without it (its neighbours' infills recomputed) and puts it on the
   island; the worktop is one slab of the footprint plus 2 x overhang.

### F6 · One share-out button (law 8)
1. KASACJA, physical: in `src/3d/ShareOutBar.jsx` the second button
   (`data-share-out-extra`) and the `plan.tooWide && plan.alternative`
   branch; in `src/engine/shareOut.js` the `extra` option, `alternative`,
   `newWidth` and the `lastOne` arithmetic that only the extra road used
   (`tooWide` stays only if another reader uses it; if none, it goes too,
   and the PR names the readers checked); in `projectStore.js`
   `shareOutRun(unitId, { extra })` loses `extra` (INT); the T50 / T52 /
   T53 tests that asserted the second button, the alternative or the extra
   are REWRITTEN to the new law, never kept green beside the deleted road.
   Tombstones two lines at most; deletions outnumber additions in this F's
   commit (the kasacja law), and the PR prints the two counts.
2. `test/turn86b-f06-share-out-one-button.test.js`: the bar renders one
   button and no `data-share-out-extra`; `shareOutPlan` has no `extra` and
   no `alternative` key; `shareOutRun` ignores a stray `{ extra: 1 }`
   (shares out over the cabinets that exist, adds none); a run whose equal
   share is wider than `maxWidthMm` is still shared out (the Check says the
   fronts are wide, as it says today); the source files contain neither
   `alternative` nor `data-share-out-extra`.

## PART C · THE UI (F7, F8; U1 and INT)

### F7 · Dimensions on the bar, the ink in Settings
1. `SceneToggles.jsx` already carries a `dimensions` toggle in
   `SCENE_TOGGLE_IDS`. INT adds `'dimensions'` FIRST to
   `profile.ui.studio.sceneToggles`: `['dimensions', 'xray', 'hideFronts',
   'outlines', 'openAll']` (PROPOSED order). The toggle's guard, label and
   hook are the ones it has. The View popup's `dimensions` entry is REMOVED
   from `VIEW_ITEMS`; `Front dimensions` STAYS in the popup (PROPOSED: the
   owner circled Dimensions alone).
2. `SceneViewMenu.jsx`: `dimensionColour` leaves `VIEW_ITEMS` and its block
   is deleted (the entry, the `colours` map, `colourDisabled`).
   `VIEW_ITEMS` becomes seven: `'frontDimensions', 'props', 'measure',
   'contourView', 'brightness', 'realisticLighting', 'light'`.
3. `WizardSettings.jsx`: ONE row "Dimension colour" with the profile's two
   inks (`profile.dimensions.colours`: Navy, Red, labelled as TopBar labels
   them), radio chips at the house scale (13 px), in the `settings.
   dimensions` node (PROPOSED place; if the node has a drawings or view
   group, there, and the PR says which). It reads `useUiStore.
   dimensionColour` and writes `setDimensionColour`; the wizard's Start /
   Save do not touch it (not a project field).
4. `uiStore.js`: the ink REMEMBERED per browser as Brightness is
   (`BRIGHTNESS_KEY`'s pattern), key `cc.dimensionColour` (PROPOSED), the
   profile's default when unset or unknown.
5. `test/turn84-f06-scene.test.js` lines 265 and 312 REWRITTEN to the new
   law with the owner's words; `test/turn86b-f07-view.test.js`: five on the
   bar in order, seven in the popup and nothing else, no `dimensionColour`
   in `SceneViewMenu.jsx`, the Settings row under its node reading and
   writing the store's action, the ink remembered across a fresh boot and
   defaulting on a bad key, the seven's guards and sentences byte-identical
   to T84's strings.

### F8 · The worktop's finish (law 7)
1. `design.js`: the worktop record gains `finish: 'decor' | 'spray'`
   (default 'decor', migration writes it on old records) and, for 'spray',
   `ral` from the project's spray palette (the fronts' own field name,
   reused, PROPOSED) and `sheen` as the fronts carry it.
2. The worktop section (`RightPanel.jsx`'s worktop block, or the worktop
   modal it opens): on a chest island's slab and a desk's slab, a row
   "Finish: Decor / Sprayed panel"; Sprayed shows the RAL chip the fronts
   use and the sheen slider the fronts use (one road, the fronts'
   components reused, never copied). On every other slab the row is absent
   tonight. The overhang field (law 6) stands in the same section for the
   chest island and the desk: "Overhang 0 mm".
3. `3d/materials.js` (U1's one road): a slab with `finish: 'spray'` takes
   the sprayed-front surface (`surfaceFor`'s sheen-driven branch) with its
   RAL; 'decor' takes today's road. `lib/` BOM: a sprayed slab is a sprayed
   panel line (the panel's own BOM road, its spray area), not a worktop
   decor line.
4. `test/turn86b-f08-worktop-finish.test.js`: migration writes 'decor' on
   an old record; a chest island's slab set to 'spray' RAL 3005 renders
   through the sprayed surface (the material's colour and sheen read from
   `surfaceFor`'s result) and lists as a sprayed panel in the BOM with its
   area; a kitchen run's slab has no finish row and renders as yesterday;
   the overhang field writes `islandOverhangMm` on the island and the slab
   grows by 2 x the number.

## PART D · THE PICTURE AND THE PROBES (F9 to F11; G1)

### F9 · The left corner L in the scene (law 9)
1. FIRST, `test/turn86b-f09-corner-mirror.test.js`: the chat's three probes
   as tests for CORNER_L_BASE, CORNER_L_WALL and CORNER_L_WARDROBE, each
   hand, square and 1200 x 1000, with doors, 3 shelves, 2 drawers: LEFT =
   MIRROR(RIGHT) board for board and mark for mark (the TOP-L and BOTTOM-L
   cuts mirrored too). Green at the start; it stays as law 9's engine half.
2. THE SCENE: build (`vite build`, preview 4173), the harness
   `scripts/t74-harness.mjs`; open `verify/t86b/owner.ccproject` through
   the app's Open from file; read every mesh under the unit's group
   (`scene.traverse`), its world-space bounding box, and compare to the
   eight engine boxes above placed by the unit's position and wall: the
   mesh that stands where the engine put no board IS the finding (the
   chat's reading: SIDE-B, 550 x 2150 x 18 across the arm's end, drawn as
   18 x 2150 x 550 along the wall; and the TOP-L showing joint marks on its
   upper face). Then the same with `corner_side: 'right'` in the file: the
   right unit must pass; if it does, the difference between the two code
   paths is the cause. Frame both (`f09-before-left.png`, `f09-before-
   right.png`) from the owner's camera.
3. THE FIX, at the source in `3d/` (`panelSolid.js`'s placement of a drawn
   outline into the box, `UnitView.jsx`'s side road, or wherever the
   finding points): one law one path, the owner's words beside it, the F9
   test grows a SCENE case that reads the meshes' boxes against the
   engine's (red before, green after, both runs in the PR). If the cause is
   in `cabinet.js` (a `cnc` placement field written wrong for the left
   hand), the patch goes to INT as any engine patch does: this turn owns
   that file. `verify/t86b/corner-diagnosis.md` holds every number read.
4. The owner's two screenshots stay under `verify/t86b/` as the record.

### F10 · The two probes as tests
1. THE TOP MIRROR ACROSS EVERY KIT: for every kit in `UNIT_TYPE_ORDER` that
   emits a TOP, a bare `computeCabinet()` of its default: the TOP's cuts
   are all on its underside face and the TOP's record is the BOTTOM's
   mirror as `topFrame.js mirrorTopRecords` (17.10) writes it (the
   positions mirrored, the faces swapped); any kit that fails is listed in
   the PR by name with the cut that is on the wrong face, and the test is
   written so that each kit is its own case (one red row per failing kit,
   never one red test for all). No kit's cut is changed by this F: it is a
   probe; a failing kit is a finding for the owner, not a fix tonight,
   UNLESS it is the Corner L and F9's cause (then F9 fixes it).
2. THE HARDWARE SILHOUETTES: `verify/t82/silhouettes-live.json` against
   `reference/hardware/silhouettes.json`, every hardware item by id: the
   silhouette's bounding box within the profile's tolerance (PROPOSED 1 mm)
   of the reference's; each item its own case; a failing item is listed
   by name, nothing changed.
3. `test/turn86b-f10-probes.test.js` holds both, and `verify/t86b/probes.
   md` the two tables as printed.

### F11 · The walk (G1)
`scripts/t86b-walk.mjs` on the built app, real mouse through the harness:
(a) the owner's 4000 x 3000 room, a CORNER_L_BASE in the left corner, a BUD
added at the arm's end on wall 3: no infill drawn between them, the plus
beyond the BUD; (b) the owner's recess wardrobe, three drawers in the
column, the Section shows Stack height and Partition rows with numbers; a
shelf added above the cap spans side to side (frame); (c) a chest added
"in the room": variant A, dragged by its carcass +300, rotated 90, its
panel and slab following (three frames), variant B built beside (frame),
the slab's Finish set to Sprayed RAL 3005 (frame), Overhang 20 typed and
the slab grown; (d) a run of five with a leftover: the share-out bar shows
ONE button, pressed, the run shared; (e) the bar shows five toggles and
Dimensions flips the chains; the View popup lists seven; Settings holds the
Dimension colour row, Red pressed, reload, still Red, Navy restored; (f)
the two corners of F9 after the fix, from the owner's camera
(`f11-corners-after.png`). Every line PASS or FAIL with the number
expected and the number read; never patched in the walk.

## NOT THIS TURN
- Shelves' Center all / Center between / ladder: FROZEN 3.
- `Front dimensions` to the bar: one id, waits for the owner's word.
- `TopBar.jsx` legacy menu: FROZEN 5.
- HI-MACS and other worktop materials: a later enum value.
- The chest island for any kit but the chests; a chest island with doors
  or with a desk attached; two islands joined.
- A fix to any kit the TOP probe flags, other than the Corner L (F9).
- Studio stage 2, the bathroom family, the Joinery Core link: parked; the
  list of Cabinet Core is CLOSED after this turn (the owner, 22:42).

## LINEAGE (one line a test reads from this file)
T79's horizontal notch stays as built and its owner's words stay here
because `test/turn79-f05-edge-notch.test.js` reads them from CLAUDE.md:
*"cut the corner działa idealnie, ale możesz zrobić mi też poziome cut?
wszystkich 4 rogów?"* (18.10.2026). T84 (PR #83), the chat fixes of 28.10
to 30.10 (PR #84 to #86), T85 (this branch's base) are the base of this
turn; their numbers hold untouched.

## TESTS AND PROOF
Full suite once per PART and at the end; the classifier strict with
`f51-t86b-f*.mjs` naming every engine and lib delta and the RE-PINNED
shelf-over-column fixtures by name; the six base goldens IDENTICAL
(`scripts/t64-classify.mjs --dump` vs `verify/t70/goldens-base.json`);
`t75-goldens --check`, `t78-goldens --check`, every later golden check as
T85's list names them, T85's own checks green; the paren balance of every
LISP file touched by a comment line 0/0; `t78-copy --check` CLEAN;
`t86b-walk.mjs`; NEW_FILES; the Skylon header; no em or en dash; the
kasacja counts of F6; every F the six stations of DONE in twenty lines.

## PR BODY
First line: "Stands on T85 (claude/t85-recess-follows, <sha>); merge T85
first." Then files and lines per F; the one arithmetic of F1 quoted; the
Section's two rows; the shelf's new span with the RE-PINNED list and the
owner's words; the chest island's numbers and the two variants framed; the
kasacja counts of F6; the five of the bar and the seven of the popup; the
Settings row's node; the finish and overhang fields; the diagnosis of F9
in full (every number read, the finding, the fix or the honest "not
found"); the two probe tables; the EXEMPT entries; the test count before
and after; the walk result; DECISIONS TAKEN; SKIPPED AND WHY; RED AT THE
END; THE NUMBERS below.

## THE NUMBERS (in the profile; none typed in the UI)
| Number | Where | Value | Status |
| - | - | - | - |
| the scene toggles bar | `profile.ui.studio.sceneToggles` | `['dimensions', 'xray', 'hideFronts', 'outlines', 'openAll']` | CONFIRMED (Dimensions on the bar, 21:54); the ORDER is PROPOSED |
| the View popup | `SceneViewMenu.jsx VIEW_ITEMS` | seven | CONFIRMED (Dimension colour out, 21:54); Front dimensions staying is PROPOSED |
| the ink's home | `WizardSettings.jsx`, node `settings.dimensions` | one row, Navy / Red | CONFIRMED (Settings, 21:54); the node is PROPOSED |
| the remembered ink | `uiStore.js`, localStorage `cc.dimensionColour` | the profile's default when unset | PROPOSED |
| the island worktop's overhang | `profile.worktop.islandOverhangMm` | 0 | CONFIRMED ("nawis jako opcja", 22:56): the default none, the field offered |
| the worktop's finishes | `profile.worktop.finishes` | `['decor', 'spray']` | CONFIRMED (sprayed panel for the chest and the desk, 22:56); the enum name is PROPOSED |
| the free-standing plinth setback | `profile.plinth.setbackMm` (the existing front number) on every exposed side | the existing number | PROPOSED (the owner spoke of a chest in the room, not of its plinth) |
| the chest island's default | `chestIslandPlan` | the chest's own width and depth; variant asked once | CONFIRMED ("oba") |
| the silhouette tolerance | `profile.hardware.silhouetteToleranceMm` | 1 | PROPOSED |
| the mirror law | `test/turn86b-f09-corner-mirror.test.js` | LEFT = MIRROR(RIGHT), engine and scene | CONFIRMED (21:56, 22:21) |
