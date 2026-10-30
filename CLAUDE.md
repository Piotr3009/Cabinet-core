# CLAUDE.md, TURN 85 · THE RECESS COLUMN FOLLOWS THE RECESS, THE RETURNS ON CABINEO, THE DOORS OPEN TO 90

Run autonomously. Zero questions, zero stops: every decision below is the
owner's own (30.10.2026, 20:17 to 20:48, over the plan-view mockup
`verify/t85/recess-move-mockup.png` and his answers in chat; his words
are quoted where they decide), so nothing here is asked again. Where a
number is marked PROPOSED it is the turn's best reading and is used as
written: the owner confirms or changes it after the merge, never during
the run. If a point cannot be done, skip it WHOLE, write why in the PR,
and go on to the next. Full suite, never `--silent`. Frames under
`verify/t85/`. Branch `claude/t85-recess-follows`, one commit per F, PR
at the end; the owner merges. Nothing lands in Petros from this session.

THIS TURN TOUCHES THE ENGINE, LISP FIRST. Three things, in the owner's
order: (1) the RETURN boards of the recess box join the carcass on
Cabineo instead of standing as outlines; (2) the column of drawers in a
recess belongs to the RECESS, not to the cabinet: when the cabinet moves
(or the recess in Room changes) the dividers stand on the recess's edges
wherever the carcass now stands, and when an edge leaves the carcass the
carcass side takes the divider's place; (3) every door in the picture
opens to 90 degrees, and the default hinge finish is the silver one.

## THE COST OF THE NIGHT (the law of T83, kept)
FOUR agents and one integrator, never ten. NO review wave: a slice is
reviewed ONCE by INT when its patch lands; the morning audit is the
owner's. Targeted tests while writing; the full suite ONCE per PART when
it lands and ONCE at the end. Every agent reads this file and its PART,
never the whole repo: INT hands each agent the files it OWNS and the ones
it must read. A report is twenty lines, the six stations of DONE. Agents
and parallel mode ON (Opus 5.5, ultracode).

## THE AGENTS (4 slices and one integrator)
| Agent | Slice | OWNS (writes) | Hands patches to |
| - | - | - | - |
| INT | the only writer of `src/engine/cabinet.js`, `src/stores/projectStore.js`, `src/engine/profile.js`; applies patches in F order; the goldens of this turn pinned and named; the classifier manifest; NEW_FILES; the full suite once per PART and at the end; classifier strict, copy check, walk; the PR | the three central files, `scripts/t78-classify.d/f50-t85-f*.mjs`, the freeze test (EXEMPT rows if any PRO file moves) | nobody |
| L1 | F1: the LISP first: KIT_RECESS.lsp D29, D30, D31 and the routines they name; the paren balance; then F2's engine half in `src/engine/extension.js` (new routines, the amended refusal, the RETURN's Cabineo) as ONE patch to INT for `cabinet.js` | `reference/lisp/KIT_RECESS.lsp`, `src/engine/extension.js`, `test/turn85-f01-lisp.test.js`, `test/turn85-f02-engine.test.js` | INT (cabinet.js) |
| S1 | F3: the store: the column that follows the recess on `moveUnit` and on a room change, the one-divider case, the column that leaves with its drawers, the notice in words; `recessAlignPlan` and `alignDividersWithRecess` kept | `src/lib/recessColumn.js` (NEW, pure: the plan of the move), `test/turn85-f03-follow.test.js`; the store patch to INT | INT (projectStore.js) |
| H1 | F4: the doors open to 90 in the picture, the silver finish the default wherever a default is read; the hinge catalogue's angle still decides what is bought | `test/turn85-f04-doors.test.js`; the profile patch to INT; `3d/` only if a line is needed (named in the PR) | INT (profile.js, cabinet.js) |
| W1 | F5: the walk, real mouse: the recess wardrobe dragged along its wall through the five cases of the mockup, the frames, the Cabineo pockets on the sheet, a door opened | `scripts/t85-walk.mjs`, `verify/t85/walk.txt`, `verify/t85/f05-*.png` | nobody |

## THE ORDER
The owner, 30.10.2026, in his words where they decide:
- 20:17, the two questions: *"dlaczego niektore elementy z recess nie sa
  machined?"* and *"jak przesuwam i mam recess lub komin to mi sie ladnie
  zmienia ksztalt elementow, to dziala super, ale jak mamy szuflady w
  recess to juz sie tak nie przesuwa, tylko przy przesunieciu calej szafy
  szuflady znikaja a zostaja dividery ktore sie robia do samej gory, nie
  powinno tak byc"*.
- 20:38, the answers, over the mockup: *"1 - cabineo, 2 - jesli wneka
  wychodzi poza szafe to zostaje jeden divider ... minimum ... i tyle,
  szuflady sa mniej glebokie do plytszej szafy a polka zostaje w ksztalcie
  litery L, proste prawda?"*
- 20:45: *"1 - zostaw ten temat, wrocimy"* (the doors-and-both-dividers
  question is PARKED, not this turn); *"2 - nie, tutaj musi byc minimum 30
  mm"* (the smallest bay beside a side); *"3 - znikaja z szufladami, bo to
  sa dividery do szuflad; tylko jak bedzie uzytkownik chcial to dolozy
  pozniej sam osobno dividery"*; *"4 - chat zrob, koduj"*, then *"chyba ze
  wolisz Code, daj Code, bedzie lepiej, damy to do Opusa plus agenty"*.
- 20:48: *"dodaj jeszcze jedno: default zawiasy prosze zrob 90 stopni,
  teraz mamy 150 to nie jest dobre, i silver prosze"*.

## LAWS
Every law of T75 to T84 holds in full: LISP IS LAW (the geometry is
written in `reference/lisp/KIT_RECESS.lsp` first, the engine mirrors it
routine for routine, the paren test runs); the fossil six untouchable
(`scripts/t64-classify.mjs --dump` vs `verify/t70/goldens-base.json`
IDENTICAL); a bare `computeCabinet()` byte for byte its LISP; material
never enters material; the room refuses in words and never clamps in
silence; one law one path; numbers in the profile, none typed; 1:1 = COPY
(`scripts/t78-copy.mjs --check` CLEAN); the Skylon header on every new
file; no em or en dash in anything written; test the way the client
clicks. Four laws are this turn's own:
1. **THE COLUMN BELONGS TO THE RECESS.** A recess column's two dividers
   stand where the recess's edges are, in the carcass's own frame, however
   the carcass stands against the wall. Moving the cabinet, or changing
   the recess in Room, moves the dividers, never the drawers out of the
   recess. The store does this on every move; the engine still decides
   (D22) whether what stands there IS a recess column.
2. **WHERE THE DEPTH CHANGES, A WALL STANDS.** A drawer box has one depth
   across its whole width, so a column's wall is always where the depth
   changes: a divider on the recess's edge, or the carcass side (grown into
   the recess) where the edge is outside the carcass, or the RETURN at the
   edge where the bay beside a side would be under the minimum. The box
   runs wall to wall and takes the depth of where it stands (the recess:
   D22's usable + ed on the ladder; the plain carcass: the carcass's depth
   on the ladder, or D27's refusal when the ladder has nothing).
3. **THE DIVIDERS OF THE DRAWERS GO WITH THE DRAWERS.** A column's
   dividers were born for its drawers (D28). When the band leaves the
   carcass and the carcass alone cannot hold the drawers (D27), the
   drawers AND the two dividers are removed from the cabinet in the same
   step as the move (one undo), and the app says so in words. When the
   carcass can hold them (deep enough), the drawers take the carcass's
   depth and the dividers stay as the column's walls, full height, as any
   two-divider column stack. The owner: *"znikaja z szufladami, bo to sa
   dividery do szuflad"*.
4. **A SWING IS A PICTURE.** The angle a door opens to in the view is the
   profile's one number, 90 (the owner, 30.10: *"default zawiasy prosze
   zrob 90 stopni, teraz mamy 150 to nie jest dobre"*; this supersedes
   15.10's *"standardowo zawiasy 155 degree"* for the PICTURE only). What
   hinge is BOUGHT (the catalogue's 155 / 110 / 95 by front thickness,
   `reference/hardware/cliptop-hinges.json`), what is DRILLED, and Check
   #8 (a 110 hinge over a wide door) are untouched.

## FROZEN
1. The six base goldens IDENTICAL; T75, T78, T80 to T84 goldens IDENTICAL
   except those this turn RE-PINS by name with the owner's words (the
   recess-column fixtures of 28.10, whose RETURNs gain Cabineo pockets and
   holes: F2 names each). The classifier strict with `f50-t85-f*.mjs`
   names every engine and lib delta.
2. Every kit's cut outside the recess column: untouched. KIT_RECESS.lsp
   D1 to D28 stand; D29 to D31 are added under them, dated.
3. The drawer box (T79 F14, Cabineo 12), the carcass joint systems (T75
   F23, T78 F19 and F20), `engine/cabineo.js` as a library (new callers
   read it; its functions are not changed), `engine/dividerJoints.js`
   (the divider's biscuit set stands; the RETURN takes Cabineo, not the
   divider's set).
4. PRO freeze: every PRO file edited is licensed in EXEMPT with the
   owner's words from this file and re-frozen in the same commit. The
   retail copies are NOT edited: `t78-copy --check` CLEAN. No Studio file
   (`components/studio/**`) is touched.
5. `recessAlignPlan`, `alignDividersWithRecess` (D26) and
   `addRecessDrawers` (D28) stay as they are: the button is still the
   joiner's way to stand dividers he placed himself; this turn adds the
   automatic road beside it, never replaces it.
6. The suite is green at the start (the count on main at the start of the
   run, written in the PR) and at the end, plus this turn's tests.

## PART A · LISP FIRST, THEN THE ENGINE (F1, F2; L1 and INT)

### F1 · KIT_RECESS.lsp D29, D30, D31 (L1)
Under D28, dated 30.10.2026, with the owner's words above as the law
citations:

D29 THE RECESS COLUMN FOLLOWS THE RECESS. The column's walls are the
    band's edges in the carcass's frame (ex0, ex1), wherever the carcass
    stands. Three cases, each with a routine the engine mirrors:
    (a) BOTH EDGES INSIDE, each at least `recess.minColumnSideMm` (30,
        the owner's number) from its side: two dividers on the edges,
        D22 as it stands (recess-col-pair-x).
    (b) AN EDGE OUTSIDE THE CARCASS, OR INSIDE BY LESS THAN 30: no divider
        on that edge. Outside (or at the side's face): the carcass SIDE
        is the column's wall; it is grown into the recess as the recess
        without drawers grows it today (section 1), and the column runs
        from that side's inner face. Inside by less than 30 (the owner:
        *"minimum 30 mm"*): the RETURN stands at that edge from the floor
        to the band's top (recess-return's full height, D11, not the
        column's cap-up RETURN) and is the column's wall; the strip
        between the side and the RETURN is closed by the L-shaped BOTTOM
        and board over the drawers (a dead pocket), and the Check says so
        in a NOTE (level note, never red). `recess-col-walls (cw g ex0 ex1
        minside) -> ((kind x) (kind x))`, kind one of DIVIDER, SIDE,
        RETURN, x the wall's inner face.
    (c) THE BAND LEAVES THE CARCASS (no part of it over the carcass, or
        the band's floor or sides fail recess-col-refusal's other
        tests): there is no recess column. The drawers take the carcass's
        depth (D27): held by the ladder, they stay as a plain two-divider
        column stack; not held, the APP removes the drawers and the two
        dividers it made for them (D28's dividers), and says so.
    THE BOARD OVER THE DRAWERS and the BOTTOM are one board each, L where
    the band covers part of the carcass (recess-col-cap-outline,
    recess-col-bottom-outline), the bump from max(ex0, 0) to min(ex1, cw);
    the DRAWERS take recess-col-drawer-depth where the column is in the
    band. A column with one divider: the box runs wall to wall; its
    runners mount on the side (grown) or on the RETURN as they mount on a
    divider.
D30 THE RETURNS ARE ON CABINEO. The owner: *"1 - cabineo"*. RETURN-L and
    RETURN-R (and the full-height RETURN of D29 b) join the BOTTOM and
    the board over the drawers (or the TOP, in a recess without drawers)
    as a side joins the TOP and the BOTTOM in SKYLON_JOINTS_CABINEO.lsp:
    the pockets in the RETURN's ends (its outside face, the face towards
    the band's wall), the 5 mm holes in the horizontal board, the count
    and the offsets the Cabineo law's (cabineo-positions), the size the
    unit's own when its joint system is Cabineo 8 or 12, else Cabineo 12
    as the drawer box's (D.2c). D11 is AMENDED: RETURN-L, RETURN-R are cut
    parts, no longer outlines; the FLOOR and the LID stay outlines (the
    owner spoke of the RETURNs). Check #30 no longer counts a RETURN.
D31 THE SWING. Not a cut law; recorded here because the owner gave it in
    the same breath: every door opens to 90 in the picture (profile
    doors.openAngle 90, openAngleAtWall 90), the hinge's catalogue angle
    decides what is bought, never the swing.
Routines: `recess-col-walls`, `recess-col-return-full`, `recess-col-box-
span` (the box's x0 x1 from the two walls), `recess-return-cabineo`
(positions along the RETURN's two ends). Paren balance 0/0;
`test/turn85-f01-lisp.test.js` reads each routine's name and the owner's
words from the file, as `turn80-f01-lisp.test.js` does.

### F2 · THE ENGINE (L1 in `extension.js`, INT in `cabinet.js`)
1. `extension.js`: `recessColWalls`, `recessColReturnFull`,
   `recessColBoxSpan`, `recessReturnCabineo`, each the LISP's mirror with
   its routine named beside it; `recessColRefusal` AMENDED: the "reaches a
   side" test no longer refuses (D29 b takes it); the floor test and the
   minInterior test stay; the "dividers do not stand on the edges" test
   asks only the edges that have a DIVIDER wall. `recessColPairX` and
   `recessColDividerX` unchanged (D26's button).
2. `cabinet.js` `recessColumn` (today 5468 to 5560): the walls from
   `recessColWalls`; `verticalItems.length` must equal the number of
   DIVIDER walls (2, 1 or 0) and each divider stand on its edge; the
   column's zone is the bay between the walls; the SIDE wall grows the
   side into the band as `extensionOf`'s section 1 does (the grown side's
   own law, untouched); the RETURN wall is emitted as `RETURN-L` or
   `RETURN-R` of D29 b's full height. The box span from
   `recessColBoxSpan`; `set.dl` from `recessColDrawerDepth` as today. The
   cap and the BOTTOM bumps clipped to the carcass. The warnings keep
   their codes (`RECESS_DRAWERS_SHALLOW`, `DRAWERS_TOO_SHALLOW`), the
   sentences amended where D29 changes what is wrong.
3. The RETURN's Cabineo (D30): the pockets onto the RETURN and the holes
   into BOTTOM / cap / TOP through `engine/cabineo.js`'s existing pocket
   and hole writers (`cabineoPocketsOnto`'s pattern, a plan built for the
   RETURN pairs; read `cabineoVerdict` for the skin check between pockets
   and the board's inside cuts and run the same check on the RETURN). The
   RETURN's `meta.readiness` becomes `cut`, `fixing` the Cabineo's; the
   BOM's hardware lines gain the RETURN's connectors through
   `cabineoHardwareLines`' pattern. Check #30 drops the RETURN.
4. Goldens: new fixtures under `verify/t85/`: (a) the owner's 1200 x 2150
   x 300 before the 800 recess with three drawers (D28, both edges in);
   (b) the same cabinet moved so the left edge is 100 outside; (c) moved
   so the left edge is 15 inside (the RETURN wall); (d) moved out of the
   band entirely (the drawers removed by the store: the fixture is the
   cabinet as the store leaves it, two bare bays or none); (e) a 1200 x
   558 cabinet with a recess column moved out of the band (the drawers at
   the carcass's depth, the dividers full height). The six base goldens
   IDENTICAL. The 28.10 recess-column fixtures RE-PINNED by name (their
   RETURNs now carry pockets and holes), each with *"1 - cabineo"* beside
   it in `f50-t85-f02.mjs` REPINNED; nothing else re-pinned.
5. `test/turn85-f02-engine.test.js`: every number of the five fixtures
   read off the engine's panels (the walls' x, the box span and depth,
   the cap's L, the RETURN's pockets and the board's holes by count and
   position, #30 silent on the RETURN), the refusal sentences, and the
   byte identity of the six.

## PART B · THE STORE: THE COLUMN FOLLOWS (F3; S1 and INT)
1. `src/lib/recessColumn.js` (NEW, pure, the Skylon header): `followPlan
   (unit, band, profile) -> { walls, moves: [{ id, x }], remove: [itemId],
   drawersRemoved: boolean, notice: string | null }`: from the unit's
   items (its two D28 dividers, named by `meta.recessColumn = true` on the
   items `addRecessDrawers` makes; items without the mark are the
   joiner's own and are never moved or removed by this road) and the new
   band in the carcass frame, the dividers' new x (D29 a), which divider
   leaves (D29 b: the one whose edge is outside or within minColumnSideMm
   of a side), and whether the column leaves whole (D29 c: no band over
   the carcass, or the engine's refusal that is not "dividers do not
   stand"); the depth test of D27 asked of the engine's own ladder
   (`DR.depthSteps[0]` against the carcass's usable depth) decides
   whether the drawers go with the dividers or stay at the carcass's
   depth. Tested as written in `test/turn85-f03-follow.test.js`.
2. `projectStore.js` (INT): `addRecessDrawers` marks the two dividers and
   the drawers it adds with `meta.recessColumn = true` (an item field,
   saved with the project, read by the plan; `migrateProject` leaves old
   items unmarked). `moveUnit` (today 7879): after the units are set and
   before the batch ends, for the moved unit, `followRecessColumn(unitId)`:
   the plan from `recessExtensionFor`'s band, its moves written through
   `updateItem` (x_mm, front_mm 0), its removals through `removeItem`, its
   notice through `notify(..., 'info')` when something left (one notice,
   the owner's words: "W01: the recess left the cabinet; its 3 drawers and
   the two dividers that held them are gone. Add drawers again where the
   cabinet stands."); all inside the move's own batch (one undo).
   `setRoom`, `addWallSlope`, `updateWallSlope`, `removeWallSlope` (the
   room's recess edits): the same `followRecessColumn` for every unit on
   that wall with a marked column, in the same batch.
3. The D26 button and D28's road are untouched (FROZEN 5). A divider the
   joiner drags himself off the edge is his: the engine's sentence and
   the button say what to do, as today.
4. `test/turn85-f03-follow.test.js`: the owner's wardrobe through the
   store: `moveUnit` by +80 (both edges still in: the dividers moved, the
   drawers 440 deep, one undo step), by +600 (the left edge out: one
   divider left, the side grown, the box wall to wall), to a place 15
   inside (the RETURN wall, the note), out of the band (300 deep: the
   drawers and the two dividers gone, the notice said, one undo restores
   all); the 558 cabinet out of the band (drawers at the carcass's depth,
   dividers full height, no notice); a room edit of the recess (width
   +200) moving the dividers; a joiner's own divider (unmarked) never
   moved by the road; `recessAlignPlan` and `alignDividersWithRecess`
   answering as before.

## PART C · THE DOORS (F4; H1 and INT)
1. `profile.js` `doors.openAngle: 90` (was 99), `openAngleAtWall: 90`
   (as it is), with the owner's two sentences (15.10 and 30.10) beside the
   number so the history reads; the hinge's own `meta.openAngleDeg` no
   longer drives the swing in the view: `3d/UnitView.jsx` (or wherever
   the leaf's swing reads `meta.openAngleDeg`, `cabinet.js` 11794 to
   11832 writes it) opens every leaf to `profile.doors.openAngle`, the
   wall rule kept. `meta.openAngleDeg` stays on the panel for the BOM
   and Check #8. Named exceptions keep their own angle: the bifold's 60
   (`corner.bifold.angleDeg`), the lift systems (T82 HAWA, CONERO: a
   lift's travel is not a swing), the pocket door. If a kit's door is
   drawn through another road, name it in the PR and leave it.
2. The silver finish: `hardware.cliptop.defaultFinish` is `nickel`
   already (the bright plated one). H1 finds every place a default hinge
   finish is READ or SET (the project setup wizard's hardware step, Company
   defaults, `design.hardware`, `lib/hardwareCatalogue.js`, the
   3D's `hardwareFinish.js`) and makes `nickel` the default in each; a
   project whose design names `onyx` keeps onyx (the owner's choice
   stands). If nickel's `material` renders dark grey in the room (the
   owner sees it as not silver), brighten `colour` / `metalness` /
   `roughness` of the nickel finish in the profile (PROPOSED numbers,
   named in the PR with a frame before and after); nothing in the drilling
   or the BOM article changes.
3. `test/turn85-f04-doors.test.js`: the profile's 90; a wardrobe's door
   opened through the store's own road (`setOpenFront` or the swing's
   state) reads 90 in the view's own derivation; a door against a wall
   reads 90; the bifold reads 60; the hinge article in the BOM unchanged
   (the 155 hinge still bought for a 24 mm front); every default-finish
   site reads nickel.

## PART D · THE WALK (F5; W1)
`scripts/t85-walk.mjs` on the built app (vite preview 4173), real mouse
through `scripts/t74-harness.mjs` (pro, roomView, FIND; the raycast
fallback for objects without `raycast`, as `verify/t84/walk.txt` notes):
the owner's room with the 800 x 300 recess, the 1200 x 300 wardrobe,
drawers through the Section's RECESS answer; then DRAG the cabinet along
the wall by its carcass through the five cases (A both in, B left edge
out, C right edge out, the 15 mm case, D out of the band), a frame at each
with the store's numbers in `walk.txt` (dividers' x, box span and depth,
panels present, the notice's text); the CNC sheet of case A with the
RETURN's pockets and the board's holes framed; the 558 cabinet out of the
band; a door double-clicked open at 90; the hinge in the view silver.
Every line PASS or FAIL with the number expected and the number read;
never patched in the walk.

## NOT THIS TURN
- The doors-and-both-dividers question (the owner, 20:45: *"zostaw ten
  temat, wrocimy"*): a recess column in a cabinet with doors keeps D29 as
  written; whether a door asks for a second divider is a later ruling.
- The Section rows for a column stack ("Stack height", "Partition 629")
  and the shelves added over a recess column that hang in the air above
  the cap (noted 30.10, 19:23): separate chat fixes, not here.
- Studio stage 2 (the RightPanel's groups), the bathroom family, the
  Joinery Core link: parked as the HANDOVER of 30.10 lists them.

## LINEAGE (one line a test reads from this file)
T79's horizontal notch stays as built and its owner's words stay here
because `test/turn79-f05-edge-notch.test.js` reads them from CLAUDE.md:
*"cut the corner działa idealnie, ale możesz zrobić mi też poziome cut?
wszystkich 4 rogów?"* (18.10.2026). T84 (merged as PR #83 on 28.10.2026),
the chat fixes of 28.10 to 30.10 (the recess column D22 to D28, the
project file, Center between in the Section and on two held pieces, the
ladder on the column's cap, the panel without the quick card, the quiet
findings row: PR #85 and #86) are the base of this turn; their numbers
hold untouched.

## TESTS AND PROOF
Full suite once per PART and at the end; the classifier strict with
`f50-t85-f*.mjs` naming every engine and lib delta and the RE-PINNED
28.10 fixtures by name; the six base goldens IDENTICAL (`scripts/t64-
classify.mjs --dump` vs `verify/t70/goldens-base.json`); `t75-goldens
--check`, `t78-goldens --check`; the paren balance of KIT_RECESS.lsp 0/0;
`t78-copy --check` CLEAN; `t85-walk.mjs`; NEW_FILES; the Skylon header;
no em or en dash; every F the six stations of DONE in twenty lines.

## PR BODY
Files and lines per F; the LISP's D29 to D31 quoted; the five fixtures'
numbers; the RE-PINNED list with the owner's words; the EXEMPT entries if
any; the test count before and after; the walk result; DECISIONS TAKEN;
SKIPPED AND WHY; RED AT THE END; THE NUMBERS below.

## THE NUMBERS (in the profile; none typed in the UI)
| Number | Where | Value | Status |
| - | - | - | - |
| the smallest bay beside a side in a recess column | `profile.recess.minColumnSideMm` | 30 | CONFIRMED, the owner 30.10 20:45 |
| the RETURN's Cabineo size | the unit's joint system when Cabineo 8 or 12, else 12 | 8 / 12 | PROPOSED (the owner said "cabineo", no size) |
| the swing in the picture | `profile.doors.openAngle`, `openAngleAtWall` | 90, 90 | CONFIRMED, the owner 30.10 20:48 |
| the default hinge finish | `hardware.cliptop.defaultFinish` and every site that reads a default | nickel | CONFIRMED ("silver"), the owner 30.10 20:48 |
| nickel's look in the room | `hardware.cliptop.finishes[nickel].material` | brighter only if it reads dark grey | PROPOSED, frame before and after |
