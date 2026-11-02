# CLAUDE.md, TURN CC3a · THE WORKSHOP NIGHT: RECESS DRAWERS, SHELF SUPPORTS, SCREW PACKS, EDGING, DELETE, DOORS, LABELS

Run autonomously. Zero questions, zero stops: every decision below is the
owner's own (01.11.2026, 22:43, and 02.11.2026, 00:45 to 02:01, in chat; his
words are quoted where they decide), so nothing here is asked again. Where a
number or a name is marked PROPOSED it is the turn's best reading and is used as
written; the owner confirms or changes it after the merge, never during the run.
If a point cannot be done, skip it WHOLE, write why in the PR, and go on to the
next. Full suite, never `--silent`. Frames under `verify/t-cc3a/`. Branch
`claude/t-cc3a-workshop-night`, cut from `origin/main` (the merge of THIS brief's
PR); one commit per F; PR against main at the end; the owner merges. Nothing
lands in Petros from this session. Commit author: `Claude <noreply@anthropic.com>`
(an author Vercel does not know blocks the preview). The owner's name for this
turn is "T-CC3a". It stands on main after PR #103 (the AI prompt), merged.

Its Joinery Core half is T-JC3b in the Joinery Core repository (its CLAUDE.md on
main there): ONE nullable column `pack_qty` on `cc_material_links` and
`cc_save_material_links` taught to store it. This turn never calls a live
Joinery Core: the fake of `scripts/t-cc1a-fake-jc.mjs` grows exactly that
contract, and CC works (degraded, in words) when the JC half is not there yet.
Release order, written in the PR: the SQL of T-JC3b in JC's Supabase, the JC
merge, then this merge.

THE OWNER'S FRAME (02.11.2026, 01:42 to 02:01): *"daj cala liste na noc ...
rozdziel to na nasz team i robimy nocna zmiane w codzie"*; *"to wszystko plus rob
tez i C"*. Group C (the pack labels, the J-pull, the edge order on the labels)
has no mockup tonight: the layouts written in PART E below ARE the mockup, and
the owner corrects them in the morning from the frames.

## THE COST OF THE NIGHT
FOUR writing agents, one integrator, two checkers, all in parallel from the
first minute. One writer per file: a file is in exactly one OWNS cell below,
and every other agent that needs a line in it hands a patch to its owner.
NO review wave: a slice is reviewed ONCE by Marek when its patch lands; the
morning audit is the chat's (Kamil and Wiktor's own second look). Targeted
tests while writing; the full suite ONCE per PART when it lands and ONCE at the
end, always in the background (Ola). Every agent reads this file and its PART,
never the whole repo. A report is twenty lines, the six stations of DONE.
Agents and parallel mode ON.

## THE TEAM (the owner's standing team, Petros shelf "programming-team"; the cards in one line)
- **Marek** integrator: the only writer of shared files, the fake, the walk,
  the freeze manifest, the classifier fragments, NEW_FILES, the PR. Never merges.
- **Wiktor** physics and construction: nothing that cannot exist (a drawer
  through a closed door, a pocket through a whole board, a runner screwed into
  the wrong board). LISP IS LAW: the LISP is amended FIRST, then the engine.
- **Bruno** engine: the BOM, the catalogue, the edging codes, the numbers.
  Numbers in the profile, never typed in code or UI; finds the working pattern
  in the repo before writing.
- **Julia** interface: the windows, the menus, the selection, the drawings
  window. Lists always visible plus a search box with a clear cross; images
  enlarge on click; copy in English; "employee", never "worker".
- **Hania** print: the part labels and the new pack labels; nothing under 7 pt
  on a label, nothing cut off, no empty half page.
- **Ewa** UX check (writes nothing but her report): walks the frames of PART C
  and PART E as a joiner who sees them the first time; counts clicks; checks
  the words.
- **Ola** tests and CI (writes nothing but her report): targeted runs, the
  suite per PART and at the end, the goldens, the classifier; reports numbers,
  never fixes.
Shared rules of the team: truth with evidence (file and line, command and
result); "I do not know" when not known; every agent gives at least one
objection to its own slice in its report (rule 13 of the team); no em or en
dash in anything written; the Skylon header on every new file.

## THE AGENTS
| Agent | Slice | OWNS (writes) | Hands patches to |
| - | - | - | - |
| Marek (INT) | integration, F8 links client, F11 Delete, F10 store side, the walk, the PR | `src/stores/projectStore.js`, `src/stores/uiStore.js`, `src/pages/ConfiguratorPage.jsx`, `src/lib/deleteKey.js`, `src/lib/jcLinks.js`, `src/stores/materialLinkStore.js`, `src/components/studio/RailMenus.jsx`, `src/lib/outputMenu.js` and `src/components/TopBar.jsx` (the Output entry only), `scripts/t-cc1a-fake-jc.mjs` (grows, loses nothing), `scripts/t-cc3a-walk.mjs` (NEW), `scripts/t78-classify.d/f61-t-cc3a-*.mjs` (NEW), `test/turn59-f1-the-switch.test.js`, `test/turn77-f5-no-copyright-line.test.js`, `test/turn-cc3a-f08-*.test.js`, `test/turn-cc3a-f11-*.test.js`, `verify/t-cc3a/walk.txt`, `verify/t-cc3a/*.png` | nobody |
| Wiktor (A1) | PART A (recess drawers, runner holes, LED knee, Cabineo face) and the physics of F10 | `reference/lisp/KIT_RECESS.lsp`, `reference/lisp/KIT_WARDROBE_FULL.lsp` (only where F1 needs it), `src/engine/cabinet.js`, `src/engine/extension.js`, `src/engine/ledStrips.js`, `src/3d/panelSolid.js`, `src/engine/covers.js`, `test/turn-cc3a-f01-*.test.js` to `test/turn-cc3a-f04-*.test.js` | Marek (uiStore, projectStore) |
| Bruno (A2) | PART B (shelf supports, metal, screw packs arithmetic) and PART D (edging codes) | `src/engine/bom.js`, `src/engine/bomInvoice.js`, `src/engine/catalogue.js`, `src/engine/catalogueData.js` (append only), `scripts/t-cc2a-catalogue.mjs`, `test/fixtures/catalogue-ids.v1.json` (append only), `src/engine/profile.js` (THE NUMBERS rows only), `src/engine/design.js` (the metal fields only), `src/engine/hardwareFinishOf.js` (NEW, pure), `src/3d/hardwareFinish.js` (the one call to the engine resolver), `test/turn-cc3a-f05-*.test.js` to `test/turn-cc3a-f07-*.test.js`, `test/turn-cc3a-f16-*.test.js` | Wiktor (every `cabinet.js` line of F5 and F16), Marek (store wiring) |
| Julia (A3) | PART C (the scene: selection, Delete's other half, doors, the pull-down, the watches, the red drawer finding) and PART E's windows (X-ray out, Connect button out, J-pull window, the pack labels window) | `src/3d/UnitView.jsx`, `src/3d/Hardware.jsx`, `src/3d/Scene.jsx`, `src/3d/Props.jsx`, `src/3d/coneroModels.js`, `src/3d/glbSource.js`, `src/lib/propsSource.js`, `src/components/BomPanel.jsx`, `src/components/LinkMaterialsModal.jsx`, `src/components/DrawingModal.jsx`, `src/components/JpullRunModal.jsx`, `src/components/PackLabelsModal.jsx` (NEW), `src/engine/drawings/wallSheets.js`, `src/engine/drawings/projector.js`, `src/engine/drawings/setSheet.js`, `src/engine/cnc/layers.js` (the X-ray inks only), `src/engine/checks.js`, `src/engine/handles.js`, `test/turn-cc3a-f09-*.test.js`, `test/turn-cc3a-f10-*.test.js`, `test/turn-cc3a-f12-*.test.js`, `test/turn-cc3a-f13-*.test.js` to `test/turn-cc3a-f15-*.test.js`, `test/turn-cc3a-f17-*.test.js`, `test/turn-cc3a-f18-*.test.js` | Marek (projectStore, uiStore, ConfiguratorPage, the Output entry), Wiktor (cabinet.js) |
| Hania (A4) | PART E's print: the part labels' edge order, the pack labels PDF | `src/lib/labelsPdf.js`, `src/lib/packLabelsPdf.js` (NEW, pure), `src/engine/partNumbers.js` (the edge record only), `test/turn-cc3a-f19-*.test.js`, `test/turn-cc3a-f20-*.test.js` | Julia (the window), Bruno (the edge codes) |
| Ewa | the UX check of PART C and PART E from the walk's frames | `verify/t-cc3a/ewa.txt` | Julia (findings), the PR (her table) |
| Ola | targeted runs, suite per PART and at the end, goldens, classifier, the proof pass | `verify/t-cc3a/ola.txt` | the PR (the numbers) |

## THE ORDER (the owner's words that frame this turn)
- 01.11.2026, 22:43: *"szuflady we wnece ... 30 mm odsuniecia"*; *"do BOM kilka
  materialow ... ilosc jest w paczce srub ... dodac zlote tuleje do BOM oraz
  spoon do tulei"*.
- 02.11.2026, 00:45, his answers to the chat's numbered questions: *"1 - usun,
  niepotrzebny gadget, tylko przeszkadza"* (the X-ray sheet); *"2 - zostaw jak
  jest, to nie wazne"* (render current view: no fold-left mode); *"5 - napraw,
  nie ma pinow jak sa polki stale"*; *"6 - nie przy okuciach tylko przy srubach,
  okucia nie w paczkach tylko pojedynczo"*; *"7 - 0.5 paczki"*; *"8 - tak"*;
  *"9 - chrome domyslnie"*; *"tak przesun"* (the LED to the new knee). His
  problems, the same message: the J-pull lets him change only its height and
  should let him move it and change its length and height; *"pull down
  handrail ma setki trojkatow ... mozna go otworzyc przy zamknietych drzwiach
  ... to samo z szufladami"*; *"czasami nie laduje mi sie srodek z zegarkami"*;
  *"deletem nie mozna usunac handraila, od razu usuwa sie cala szafa"* (check
  every element); *"ciagly czerwony blad z szufladami"*; *"cabineo tylko od
  strony gdzie sie je wycina"*; *"naklejki 46 sztuk na A4"* (for packed
  elements: cabinet number, client, address, colour); edging: *"fronty, jesli
  mamy fronty sprayowane, to nie zaznaczasz zadnego oklejania"*; *"polki
  powinny byc oklejone z kazdej strony"*; *"kolejnosc 1 - 2 na przeciwko, boki
  plyty, i 3 i 4 front i tyl"*; *"gory szuflad nie sa zaznaczone"*; *"dpr i dpl
  boczne panele do szuflad, jak sa drzwi, nie maja okleiny od frontu"*.
- 02.11.2026, 01:59: the chat wrote back the list of his answers and he
  confirmed it whole (*"to wszystko plus rob tez i C"*): the X-ray sheet out;
  drawers half in a recess get the DP at 30 mm and a filler; the runner holes
  go into the DP; no pins at fixed shelves; packs only for screws, fittings
  counted one by one; costed at the fraction (0.5 pack); a sleeve in every
  drilled hole (12 per shelf) and a spoon in the bearing holes (4 per shelf);
  chrome by default; the LED moves to the new knee.
- 02.11.2026, 02:01 (the pack): *"ty liczysz ile srubek, jak bedziemy
  przypisywac to ja podaje ilosc srubek w paczce i wtedy liczy 500 srubek / 1000
  = 0.5 paczki, proste"*.
- 02.11.2026, 02:12 (his answers): the pack labels: *"48 nie, bo to za duzo ... a4
  naklejki nie zmieniaj, chcialem dodac nowe ... okolo 6 naklejek na jednej
  stronie, po zapakowaniu, zeby byl item do oklejenia"*; the pull-down: *"siatka
  3d, jest setki tych, jakby to troche uproscic, to by sie latwiej ladowalo"*;
  a drawer behind a shut door opens the door first: *"3 moze byc"*.

## WHAT JOINERY CORE GIVES (read, do not assume more)
- Everything T-CC1a, T-CC1b and T-CC2a list holds unchanged.
- `cc_material_links` gains ONE nullable column `pack_qty` (integer, 1 to
  100000). `cc_save_material_links({ p_links })` accepts `pack_qty` in a link
  (22023 `pack_qty must be a whole number from 1 to 100000 (<id>)` otherwise);
  a save that does not name it keeps the stored one.
- When the column is not there yet (the SQL not run): a select naming
  `pack_qty` answers 400 (42703), and a save with `pack_qty` is stored WITHOUT it
  (the old function ignores the key). CC must stay whole (F8).

## LAWS
Every law of T75 to T-CC2a holds in full: LISP IS LAW; the fossil six
untouchable; material never enters material; one law one path; numbers in the
profile, none typed; 1:1 = COPY (`scripts/t78-copy.mjs --check` CLEAN); the
Skylon header on every new file; no em or en dash in anything written; test the
way the client clicks; a new function has a visible entry in the same package;
a green test beside old broken code is a lie; "usun" and "kasacja" are physical
deletions, never gates; the door is Joinery Core's; a change is memory, a save
is one request; ONE CATALOGUE, IDS NEVER CHANGE (T-CC2a law 1). Seven laws are
this turn's own:
1. **NOTHING PASSES THROUGH A CLOSED DOOR.** A drawer, an internal drawer, a
   pull-down rail or any part that moves out of a cabinet never moves through a
   leaf that is shut in front of it, in the scene, in Open all and in every
   export frame.
2. **THE BOARD THAT CARRIES THE RUNNER IS DRILLED.** Runner holes go into the
   board the runner is screwed to: the DP when a DP stands, the side or the
   divider only where none does. One rule for the full width and the columns.
3. **WHAT THE DRILL DOES, THE BOM BUYS.** A fixed shelf is screwed and buys no
   pin, no sleeve, no spoon; every drilled shelf support hole gets a sleeve;
   every bearing hole of an adjustable shelf gets a spoon.
4. **A PACK IS BOUGHT BY THE FRACTION.** Screws are counted by the engine; a
   pack size typed once at linking turns the count into packs (500 / 1000 =
   0.5); the line costs packs x the pack's price. Only screws offer a pack size;
   fittings stay counted one by one.
5. **DELETE REMOVES WHAT IS SELECTED.** With an element selected, Delete removes
   that element or does nothing and says why; it never removes the cabinet. The
   cabinet goes only when the cabinet is what is selected.
6. **A SPRAYED FACE IS NOT TAPED.** A sprayed front carries no edge band on any
   road (labels, CSV, DXF arrows, BOM); a taped part carries exactly its taped
   edges, numbered in the order they are banded.
7. **A POCKET IS SEEN FROM ITS OWN FACE.** A blind machining (Cabineo pocket,
   its 5 mm hole when blind) is drawn from the face it is machined from, at its
   depth; the other face of the board is whole.

## FROZEN
1. Every golden IDENTICAL except the rows a fragment of
   `scripts/t78-classify.d/f61-t-cc3a-*.mjs` names with the owner's words (the
   recess DP of F1, the column runner holes of F2, the edge codes of F16, the
   BOM lines of F5 to F7); any other delta is RED and stops that F. The four
   owner projects of `test/fixtures/owner-projects/`: their cut list dimensions
   and counts IDENTICAL except the parts this file names (the PR lists each).
2. T-CC2a's catalogue ids: none changed, none reused; new ids APPEND to the
   ledger; a retired id stays with `retired: true`.
3. The saved data of every project: nothing deleted, nothing overwritten with
   empty; an old project opens and saves without loss.
4. PRO freeze: every PRO file edited is licensed in EXEMPT with the owner's
   words from this file and re-frozen in the same commit; new files enter the
   manifest at their first hash; the count assertion of
   `test/turn59-f1-the-switch.test.js` is amended by Marek. A PRO file that is a
   named surface of the retail copy machine is re-copied by the machine
   (`scripts/t63-copy.mjs`), never by hand: `t78-copy --check` CLEAN.
5. The suite is green at the start (the count on main, written in the PR) and
   at the end, plus this turn's tests, minus the tests this turn REWRITES or
   DELETES by name (each named in the PR with what it now asserts or why it
   died).
6. The lighting goldens: IDENTICAL for every job without a slope knee (F3 moves
   only strips under a sloped roof with two or more boards).

## PART A · CONSTRUCTION (F1 to F4; Wiktor)

### F1 · Recess drawers get the DP and the filler (the owner, 22:43; the list of 01:59)
Facts: `src/engine/cabinet.js:2751` `dpSideLaw` is the one rule (a DP on the
hinged side of a door); `:5546` to `:5657` builds the recess column and
`:5647` to `:5648` sets `set.dpL = false; set.dpR = false;` for it
unconditionally (the comment at `:5642` parks "the doors-and-dividers question"
for the owner: he answered it). `reference/lisp/KIT_RECESS.lsp:466` to `:476`
(D22, "so no DP stands in the column") and `:625` to `:631` (D29, no filler
beside a SIDE or a RETURN) are the LISP; `KIT_WARDROBE_FULL.lsp:498` to `:500`
(`dpInset 30`, `fillerW 30`, `fillerFrontOffset 40`) and `:577` to `:586` are
the DP law of the wardrobe.
1. LISP FIRST: `KIT_RECESS.lsp` amends D22 and D29 with the owner's words: a
   recess column whose drawers stand behind a hinged leaf gets, on that leaf's
   hinged side, the DP of the wardrobe law (30 mm inset, the 30 mm filler at its
   front offset), exactly as a full width drawer zone does; a column with no
   leaf in front keeps no DP. Balanced parens; the classifier's LISP checks green.
2. `cabinet.js`: the recess column reads `dpSideLaw` like every other column
   (`:5451` to `:5454` is the pattern); its box narrows by `DP.inset + G` on
   that side, and the DP and its two FILLER boards are made by the same code as
   `:6336` to `:6371`. A recess column beside a SIDE or a RETURN wall under a
   hinged leaf gets the DP too (that wall is not the board the runner can use
   behind a door).
3. `test/turn-cc3a-f01-recess-dp.test.js`: a wardrobe with drawers half in a
   recess, no doors: no DP (as today); add hinged doors: a DP on the hinged
   side at 30 mm, its filler, the box 30 + G narrower; both hands; the four
   owner projects that have no recess drawers are IDENTICAL.

### F2 · Runner holes go into the DP (law 2)
Facts: `cabinet.js:10565` says the rule ("on each drawer panel, and on a
carcass side only where no drawer panel sits"); the full width zone keeps it
(`:10581` to `:10600`); the columns break it: `:10626` to `:10646` drill
`set.bounds` (`BUL`/`BUR`, set at `:5480` to `:5484`) even when `set.dpL` or
`set.dpR` stands, so a column DP gets no holes and the side behind it is
drilled while the box rides the DP (`:6207`). LISP: `KIT_WARDROBE_FULL.lsp:260`
to `:300` `drawWDR_DRAWER_PANEL` drills the DP.
1. `cabinet.js`: a column with a DP drills the runner rows (`runnerRowsDp`) on
   its `Z{n}-DP-{L|R}` panel, in the DP's frame, and NOT on the side behind it;
   the recess column of F1 the same.
2. `test/turn-cc3a-f02-runner-holes.test.js`: for every column job of the
   fixtures with a DP: the DP carries the runner rows, the side behind it
   carries none at that height; the full width zone IDENTICAL; the RUNNERS_3MM
   layer of the DXF follows.

### F3 · LED strips start at the knee (the owner, 00:45: *"tak przesun"*)
Facts: `src/engine/ledStrips.js:235` to `:253` (`roofAt`, `levelRuns` on
`roofLinePts`), the side strip top `:324`, the top strip `:360` to `:376`, the
top-under strip `:383` to `:399`; no knee is read. The knee is
`src/engine/puzzle.js:891` `roofBoards` and `:981` `roofKneeX` (PR #102, the
undersides meet), `SKYLON_COMMON.lsp:1688` and `:1705`.
1. `ledStrips.js`: under a roof of two or more boards the strips end where the
   boards' undersides meet (the knee of `roofKneeX`), never at the raw roof
   line vertex; one board or no slope: IDENTICAL (FROZEN 6).
2. `test/turn-cc3a-f03-led-knee.test.js`: the WARDROBE 1000 x 2150 under
   (0,1700) to (1000,2539) of PR #102: each strip's end equals the knee; a job
   without a slope reaches no changed value.

### F4 · Cabineo seen from its own face (law 7)
Facts: `src/engine/cabineo.js:360` `cabineoMachinedFace`, `:873` every pocket
record carries its face, `:1473` to `:1491` pushes the pockets with
`meta.machinedFace`; `src/engine/recesses.js:92` to `:123` passes the face to
the scene; `src/3d/panelSolid.js:761` punches every recess as a HOLE through
the whole board and `buildCuts` (`:948` to `:1040`) draws walls only from
`zOpen` to `zFloor`, so the hole shows on the other face. The J-pull slab road
(`:795` to `:806`) already honours the face.
1. `panelSolid.js`: a blind recess (a depth under the board's thickness) is cut
   from its machined face to its depth, with its walls and its floor, and the
   other face stays whole, the J-pull slab road being the pattern. A through
   hole stays through. The CNC output does not change (3D only).
2. `test/turn-cc3a-f04-cabineo-face.test.js`: a TOP with Cabineo pockets: the
   solid of the outside face has the pocket, the inside face has no opening; a
   through hole still goes through; the DXF IDENTICAL.

## PART B · SHELF SUPPORTS, METAL, SCREW PACKS (F5 to F8; Bruno, Marek F8)

### F5 · Fixed shelves buy no pin; sleeves and spoons (law 3)
Facts: `cabinet.js:3529` `numShelves = cfg.shelves` counts EVERY shelf item
(`:1014` to `:1016`); `:12261` to `:12262` is the only `shelf_pins` line
(`numShelves * SH.pinsPerShelf`, `profile.js:844` 4); the drilling already knows
better: `:10173` to `:10192` `isShelfLocked` (`:1794`, variant `fixed` or
`updown_locked`) sends a fixed shelf to screws. `bomInvoice.js:368` to `:380`
"Shelf supports" reads the same qty; `bom.js:203` to `:208` the mirror cabinet's
own line. `profile.js:5087` to `:5090` says a support is a SLEEVE and a PIN;
`profile.js:5096` to `:5118` `hardware.shelfPin` holds the sleeve's drawing
sizes. No sleeve or spoon entry exists in the catalogue.
1. `cabinet.js` (Bruno's patch, Wiktor applies): the shelf supports are counted
   from the DRILLING, never from the shelf list: `spoons` = 4 per adjustable
   shelf (the bearing holes, `profile.shelfHoles.pinsPerShelf`), `sleeves` = every
   drilled shelf support hole (every hole of the `shelfPinRows`; the confirmed
   list says 12 per shelf: the PR prints the drilling's count per shelf for the
   owner's wardrobe, and when it is not 12 it says so in words, never forces 12), a fixed or locked shelf: none of either.
   Two hardware lines replace the one `shelf_pins` line: role `shelf_sleeves`
   "Shelf sleeves" and role `shelf_spoons` "Shelf spoons", each with the metal
   of F6 in its spec. The mirror cabinet's glass shelves keep their own count
   (4 spoons per glass shelf, no sleeves unless drilled).
2. `catalogueData.js` (append only, through the script): `shelf-sleeve.gold`,
   `shelf-sleeve.chrome`, `shelf-sleeve.onyx`, `shelf-spoon.gold`,
   `shelf-spoon.chrome`, `shelf-spoon.onyx` (department `internal`, unit `pcs`,
   PROPOSED names "Shelf sleeve, <metal>" and "Shelf spoon, <metal>");
   `shelf-pin.7.5` gets `retired: true` and stays (law 1 of T-CC2a); its link,
   if a company made one, is offered as a suggestion for `shelf-spoon.<metal>`
   (law 8 of T-CC2a), never moved by itself. The ledger appends.
3. `bomInvoice.js`: "Shelf supports" reads the two new lines.
4. `test/turn-cc3a-f05-supports.test.js`: a wardrobe with 2 adjustable and 1
   fixed shelf: 8 spoons, the sleeves equal to the drilled support holes, the
   fixed shelf adds none; the drilled hole count and the sleeve count are the
   same number (law 3, one source); the old `shelf-pin.7.5` is retired and still
   in the ledger.

### F6 · The metal, chrome by default (the owner: *"9 - chrome domyslnie"*)
Facts: `profile.js:4223` `metalDefault: 'gold'`; `src/3d/hardwareFinish.js:174`
`shelfSupportMetal(design, profile)` is the one resolver of the support's
colour; `design.js:293` `hardware.shelfSleeve` and `:462` to `:464` accept
gold, silver, chrome, onyx; `profile.js:4229` `metalHingeFinish`; the hinge
finish road `hinges.js:544` `resolveHingeFinish`.
1. `profile.js`: `metalDefault: 'chrome'` (CONFIRMED).
2. `src/engine/hardwareFinishOf.js` (NEW, pure): `supportMetalOf(design,
   profile)` returns `gold | chrome | onyx` (silver read as chrome, an old
   value kept as saved); `src/3d/hardwareFinish.js:174` calls it (one law, one
   path), and the BOM of F5 reads the same function.
3. `test/turn-cc3a-f06-metal.test.js`: a new design with no metal is chrome in
   the 3D and in the BOM; gold chosen gives gold sleeves and spoons; onyx gives
   onyx; an old design that saved `silver` opens as chrome and keeps `silver` in
   its saved data until it is saved again by the user's own choice.

### F7 · Screws by the pack (law 4)
Facts: `bom.js:1068` to `:1122` the one screw line (`screwPilotCount`, the 3 mm
pilots except hinge and runner screws); `catalogueData.js:600` `screw.pilot-3`;
`bom.js:1280` to `:1287` `priceOf`; `:1377` to `:1378` a hardware row's
`lineCost = qty * price`.
1. `bom.js`: a row whose link has `pack_qty` shows `packs = qty / pack_qty`
   rounded UP to 2 decimals and the words "<packs> pack (<qty> of <pack_qty>)";
   `lineCost = packs x price` (the stock price is the pack's price). A screw row
   whose link has no `pack_qty` and whose stock unit is a pack word (pack, box,
   bx, packet, PROPOSED list, case and plural folded) has no price and says
   "Pack size missing, add it in Link materials" (it counts in the incomplete
   total, law 7 of T-CC2a); a unit of pcs or each prices `qty x price` as today.
   Only `department: 'consumables'` entries of role `screws` read `pack_qty`;
   every other line ignores it (fittings one by one).
2. `test/turn-cc3a-f07-packs.test.js`: 500 screws, pack 1000, pack price 12.00:
   "0.5 pack (500 of 1000)", 6.00; 1001 of 1000: 1.01 packs; a box unit without a
   pack size: no price, the words, incomplete; a hinge link with a `pack_qty`
   stored is still priced one by one.

### F8 · The pack size at linking, fail-open (law 4; Marek, Julia the field)
Facts: `src/lib/jcLinks.js:24` the select string, `:90` the read, `:72` to
`:80` `toLink`, `:105` to `:112` `forJc`, `:126` the save; the link form of
`LinkMaterialsModal.jsx:141` (the pending state), `:850` to `:862` (the sheet
and coverage fields), `src/lib/linkSuggest.js:35` to `:39` `LINK_RULES`;
`scripts/t-cc1a-fake-jc.mjs:445` to `:479` the fake's validation and upsert.
1. `jcLinks.js` (Marek): the select names `pack_qty`; on a 400 that names the
   column (42703, or the words "pack_qty"), the read is made ONCE more without
   it and the store remembers `packSizeReady: false` for the session; the links
   load whole either way. `forJc` sends `pack_qty` when the form gave one.
2. `LinkMaterialsModal.jsx` (Julia): linking a screws entry shows "Screws per
   pack" (a whole number, 1 to 100000, `LINK_RULES.packQty` in
   `linkSuggest.js`, Bruno's row), optional; a linked screws row shows "Pack of
   <n>"; with `packSizeReady: false` the field is shown disabled with the words
   "Pack size needs the Joinery Core update. Ask your administrator." Other
   entries never show the field.
3. `scripts/t-cc1a-fake-jc.mjs` (Marek): the table grows `pack_qty`; the save
   validates it with the same words and code as T-JC3b; a switch
   `CC_FAKE_NO_PACK=1` answers 400 (42703) to a select naming `pack_qty` and
   drops the key on save (the SQL not run). The fake loses nothing.
4. `test/turn-cc3a-f08-pack-link.test.js`: the select names `pack_qty`; with
   `CC_FAKE_NO_PACK` the links still load and the field says the words; a
   pack of 0 is refused 22023 and the words reach the row; a saved pack of 1000
   reads back and prices F7's line.

## PART C · THE SCENE (F9 to F15; Julia, Marek F11 and F10's store, Wiktor checks)

### F9 · The red drawer finding (the owner: *"ciagly czerwony blad z szufladami"*)
Facts: `src/components/studio/lib/studioIssues.js:76` gives a red triangle for
any red finding; `src/engine/checks.js:1024` to `:1048` (#18 red: a runner row
with no article in the catalogue) is the likeliest; also `:770` and `:839` to
`:847` (#20 SLOPE_DRAWER_CROSSES), `:1134` to `:1146` (#2, front gaps).
1. Reproduce FIRST on the four owner projects and on a fresh wardrobe with
   drawers: list every red finding on a drawer with its check id, its numbers
   and the engine's numbers. Fix the CAUSE (a runner length the catalogue does
   not map, a wrong reading of the system), never by silencing the check; a
   finding that is TRUE stays and the PR says why it is true, in words the
   owner can act on.
2. `test/turn-cc3a-f09-drawer-red.test.js`: the reproduced case red before,
   green after, for the stated reason; a truly wrong drawer still red.

### F10 · Nothing opens through a closed door (law 1; Julia, Marek the store)
Facts: `src/stores/uiStore.js:1133` to `:1151` `toggleFront` (opening checks
nothing; only closing a leaf closes what it covers, `:1122`); `:1180` to `:1184`
`toggleKit` (the pull-down) checks nothing; `src/3d/UnitView.jsx:3380` to `:3405`
and `src/engine/covers.js:30`, `:48`, `:64` (`coveredByLeaf`, `pullOutsOf`);
`src/3d/Hardware.jsx:1381` the pull-down's click; Open all `uiStore.js:1194`.
1. Opening a drawer front, an internal drawer or a pull-down that a SHUT leaf
   covers opens that leaf first, then the drawer (one click, CONFIRMED: *"3 moze
   byc"*). Open all opens leaves before what they cover. Closing a leaf closes
   what it covers first (as today).
2. `test/turn-cc3a-f10-doors.test.js`: every covered drawer and pull-down of the
   fixtures: a click with the leaf shut ends with the leaf open; the drawer is
   never open while its leaf is shut, through every road (click, Open all,
   export frames).

### F11 · Delete removes what is selected (law 5; Marek, Julia the clicks)
Facts: `src/pages/ConfiguratorPage.jsx:253` the keydown, `:303` to `:306` the
element looked up only among the engine panels, `:337` `if (!panel) return;`,
`:345` to `:348` no element: `removeUnit(selectedUnitId)`; `uiStore.js:950`,
`:990`, `:1040`, `:911` (`selectUnit` keeps a stale element on the same unit);
the hanging rail is not a panel (`elements.js:145` to `:151`): its pointer
down `UnitView.jsx:2918` `startRailDrag` calls `selectUnit`; the watch insert's
click `UnitView.jsx:3235` to `:3238` and `Scene.jsx:2228` select the unit; the
drawer box `UnitView.jsx:3427`; the rail's own remove `RailModal.jsx:143`; the
pull-down is a kit (`uiStore.js:1180`).
1. A click on a hanging rail, a pull-down, a watch insert, an internal drawer or
   any other interior element that has a remove action selects THAT element
   (`selectElement` with a kind: `rail`, `pulldown`, `watch-insert`, ...;
   PROPOSED kinds), outlined as selected elements are today. Delete then calls
   that element's own remove action (the one its window uses). An element with
   no remove action: Delete does nothing and says "Remove this part in its own
   window." A stale element of another click never survives a new click.
   `selectUnit` clears the element (`uiStore.js:911`).
2. Every element kind of `elements.js` is listed in the test with what Delete
   does to it; the cabinet goes ONLY with the cabinet selected.
3. `test/turn-cc3a-f11-delete.test.js`: click the rail, Delete: the rail is
   gone, the cabinet stands; the same for the pull-down and the watch insert;
   click the carcass, Delete: the cabinet goes; the list of every kind.

### F12 · The pull-down's mesh, lighter (the owner, 02:12: *"siatka 3d ... jakby to troche uproscic, to by sie latwiej ladowalo"*)
Facts: the pull-down is a GLB from the bucket (`profile.js:1595` to `:1598`,
`lifts/conero/conero-pantograf-730.glb`, not in the repo); `src/3d/coneroModels.js:62`
to `:153` `coneroClone` clones it with no decimation; `src/3d/glbSource.js:50`
loads it.
1. Count its triangles and its bytes at load and write both in the PR. When it is
   over the PROPOSED ceiling `profile.visuals.pulldownMaxTriangles` 8000,
   simplify it ONCE at load with three's own `SimplifyModifier`
   (`three/examples/jsm/modifiers/SimplifyModifier.js`, inside the `three`
   package already installed: NO new dependency) to the ceiling, the silhouette
   checked on a frame beside the original.
2. Honest about loading: a simplification at load makes the scene draw faster,
   not the file download faster. When the session can read the GLB, it writes a
   lighter copy of the same file to `verify/t-cc3a/conero-pantograf-730.light.glb`
   with its size, for the owner to upload to the bucket in place of the old one;
   when it cannot reach the bucket, the PR says so and only point 1 is done.
3. `test/turn-cc3a-f12-pulldown.test.js`: a fixture mesh over the ceiling comes
   out under it; one under the ceiling is untouched; the clone keeps its pose.

### F13 · The watches load every time (the owner: *"czasami nie laduje mi sie srodek z zegarkami"*)
Facts: the insert is engine boxes (`cabinet.js:10999` to `:11293`,
`watchDrawer.js:662`), built unless a warning says why (`:11027` to `:11079`);
the watches are GLB props (`src/3d/Props.jsx`, mounted at `UnitView.jsx:4080`);
the props toggle defaults to off (`uiStore.js:645`); a failed GLB stays failed
for the session (`glbSource.js:53`, `:57`, `:81`) and a failed manifest stays
absent (`propsSource.js:71`, `:103`); the props get no drawer motion
(`UnitView.jsx:4080` passes only `result`, the panels follow `motion.forPanel`
at `:2298`, `:3066`).
1. A failed GLB or manifest is retried: once after 3 s, then on the next toggle
   (PROPOSED numbers in `profile.visuals`), never left failed for the session.
2. The watches move with their drawer (the drawer's motion offset reaches the
   props of its slots).
3. When the insert is not built, the cabinet says why in the panel's warnings
   (the engine's own words).
4. `test/turn-cc3a-f13-watches.test.js`: a GLB that fails once then loads is
   shown; a manifest that fails once then loads is used; an open drawer carries
   its watches; each not-built reason reaches the panel.

### F14 · Connect JoineryCore out of the BOM (the owner, 18:21: removed in the next turn)
`BomPanel.jsx:521` to `:528`: the "Connect JoineryCore" button and its toast
handler are DELETED (Deletion licence); `jcConnected` in the store stays (other
readers); `test/turn-cc3a-f14-bom-button.test.js`: no such words in the BOM.

### F15 · The X-ray sheet out of the set (the owner: *"usun, niepotrzebny gadget, tylko przeszkadza"*)
Facts: `src/engine/drawings/wallSheets.js:209` to `:211` pushes it per wall;
`projector.js:1784` `projectRun` with the `xray` branches (`:1438` to `:1752`,
`inkOf` `:1340` to `:1345`); `layers.js:101` to `:102` (XRAY_FRONT,
XRAY_CARCASE); `setSheet.js:542` to `:543` (the legend rows);
`DrawingModal.jsx:573` ("every wall in <b>X-ray</b>"). The 3D X-ray toggle of
the scene is a DIFFERENT thing and stays.
1. DELETED (Deletion licence): the X-ray sheet in the set, its words in the
   window, and every line only it reads (the `xray` mode of the projector, its
   inks, its legend rows) when grep shows no other reader; a line another
   reader needs stays and the PR names that reader. The sheets renumber.
2. The tests that name the X-ray sheet or count the set are REWRITTEN or
   DELETED by name, each listed in the PR (the census:
   `test/turn81-f05-xray.test.js` whole, `turn81-f02-order`, `turn71-the-set`,
   `turn75-fixtures-the-set`, `turn40-f5-wall-drawings`,
   `turn42-f0-wall-pdf-speaks`, `turn43-f5-the-sections`, `turn43-f4-pen-map`,
   `turn82-f22-f24-sheets`, `turn82-f21-chains`, `turn81-f07-silhouettes`,
   `turn81-f01-projector`, `turn81-f08-layers`, `turn83-f11-export-pick`,
   `turn-cc1b-f06-window`; grep again, miss none).
3. `test/turn-cc3a-f15-no-xray.test.js`: no sheet of any fixture is X-ray; the
   set of one wall is the old set less one; grep `src/` for the deleted mode: 0.

## PART D · EDGING (F16; Bruno writes the codes, Wiktor applies them in cabinet.js, Hania the labels in F19)

### F16 · Every part taped as built (law 6)
Facts: `cabinet.js:1845` to `:1856` the panel factory's `edging: {code,
len_m}`, the codes `profile.js:5489` (`<` `>` `^v` `<>^v` none); fronts are
always all four (`:8856`, `:8881`, `:8982`, `:9272`, `:9030`, `:6179`, `:6280`,
`:6856`, `:6151`, `:6763`, `:6794`) and only the purchase list drops the tape
for MDF (`bom.js:1207`); shelves are `codes.right`, one front edge, for every
variant (`:5211` to `:5212`, also `:4227`, `:4278`, `:4337`, `:4358`, `:5100`,
`:5115`, `:6935`); the drawer box is `codes.none` (`:6081`, `:6210`, `:6550`);
the DP panels and fillers `codes.none` (`:5961` to `:5971`, `:6350` to `:6351`,
`:5986`).
1. A sprayed or raw MDF front (`isMdfSource`, `catalogue.js:123`): no code, at
   the source, so the labels, the CSV, the DXF arrows and every BOM read none.
2. An adjustable shelf: all four edges. A fixed shelf: its front edge (as
   today, PROPOSED: the owner named the adjustable ones).
3. The drawer box: the top edge of each side, of the back and of the box front
   (*"gory szuflad nie sa zaznaczone"*); the edge each part's own frame calls
   its top (the engine's frame, written in the test).
4. A DP standing behind a hinged leaf: its front edge (*"jak sa drzwi, nie
   maja okleiny od frontu"*); a DP with no leaf in front: as today.
5. An audit in `verify/t-cc3a/edging.txt`: every part of the four owner
   projects and the fixtures, its edges before and after, and every case where
   the label said something else than the part (the owner: *"naklejki nie
   zawsze pokazuja okleine poprawnie"*).
6. `test/turn-cc3a-f16-edging.test.js`: the five rules on fixtures; the edge
   metres of the BOM equal the sum of the taped edges.

## PART E · GROUP C WITHOUT A MOCKUP (F17 to F20; Julia windows, Hania print; Ewa checks the frames)
The layouts below are this turn's mockup; Ewa checks the built frames against
them; the owner corrects them in the morning.

### F17 · J-pull: move it, its length, its height (the owner's problem of 00:45)
Facts: `src/components/JpullRunModal.jsx:57` `MIN_RUN_MM = 300` typed in the
UI (a number in the UI: it moves to the profile), `:83`, `:84`, `:100`,
`:138`; `projectStore.js:12404` `setFrontJpullRun` writes
`params.front_jpull[panelId].jpull_run_mm`; the profile `profile.js:340` to
`:360` (`runMm` 500, `fromBottomMm` 700); `src/engine/handles.js:420` to
`:588` (`jpullSpec`, `jpullRunOf`, `jpullEdgeHeight`, `resolveJpull`, the leaf
override `:584` to `:588`); 3D `src/3d/jpullProfile.js`, `UnitView.jsx:413`.
```
 J-pull of this door                         [x]
 Length (mm)        [  500 ]   300 to <leaf>
 Height (mm)        [  700 ]   from the bottom of the door to the pull's centre
 Position           (o) Centred  ( ) From the hinge side [ 0 ] mm
 [ Apply to this door ]  [ Apply to every J-pull door of this cabinet ]
```
1. `handles.js` (Julia) reads the leaf's `jpull_run_mm`, `jpull_from_bottom_mm`
   and `jpull_offset_mm` (PROPOSED names; offset 0 = centred, measured from the
   hinge side when given), each clamped to the leaf, the profile's numbers as
   the defaults; `JpullRunModal.jsx` is the window above (the standard modal,
   drags by its header); `MIN_RUN_MM` moves to `profile.handles.jpull.minRunMm`
   (Bruno's row). The 3D and the CNC notch follow the same resolver (one law,
   one path).
2. `test/turn-cc3a-f17-jpull.test.js`: a 1990 door: length 800, height 900,
   offset 50 from the hinge side: the notch in the CNC and the band in the 3D at
   the same place; out of range values clamp and say so.

### F18 · Pack labels, the window (the owner, 02:12: *"okolo 6 naklejek na jednej stronie, po zapakowaniu"*)
```
 Pack labels                                  [x]
 Labels per cabinet  [ 1 ]        Sheet  2 x 3 (6 on A4)  <- profile numbers
 [x] 01 Wardrobe 1000      [x] 02 Wardrobe 600     ...   (all ticked, a search box)
 Preview: the first page            [ Export PDF ]
```
1. Output menu: "Pack labels..." (Marek, the entry in `src/lib/outputMenu.js` and its wiring in `TopBar.jsx:342`) opens
   `PackLabelsModal.jsx` (Julia, NEW, the standard modal): labels per cabinet
   (1 default), the cabinets listed and ticked with a search box (lists always
   visible), a preview of page 1, Export PDF.
2. `test/turn-cc3a-f18-pack-window.test.js`: the entry; the list; the count of
   labels equals the ticked cabinets x labels per cabinet.

### F19 · Pack labels, the print (Hania)
```
 +---------------------------------+
 | 03  Wardrobe 1000               |  cabinet number big, bold
 | Client name                     |  client
 | 12 Site Road, Oxford OX4 1AA    |  site address, one line, shrinks to fit
 | Fronts RAL 3005 Wine red        |  colour: fronts, then carcass decor
 | Carcass H3325 Tobacco Gladstone |
 +---------------------------------+
```
1. `src/lib/packLabelsPdf.js` (NEW, pure, jsPDF as the part labels use it):
   A4, a grid from `profile.labels.pack` (columns, rows, label width and
   height, top and left margin, gaps: PROPOSED 2 x 3 = 6 of 99.1 x 93.1 mm, the
   standard 6 on A4 sheet, big enough to read on a packed item across the
   workshop); the cabinet number at 36 pt, the rest at 14 pt (PROPOSED); the
   cabinet number as the
   drawings name it, the client and the site address from the title block's
   source (the project as JC gives it; a missing one prints nothing, never
   "undefined"), the colours as the BOM names them. Nothing under 7 pt; a line
   too long shrinks to 7 pt, then cuts with an ellipsis.
2. `test/turn-cc3a-f19-pack-print.test.js`: 6 labels on page 1 at the grid's
   places; 7 labels make two pages; a long address never leaves its label; no
   "undefined" or "null" in the text.

### F20 · The edge order on the part labels (the owner: *"kolejnosc 1 - 2 na przeciwko, boki plyty, i 3 i 4 front i tyl"*)
Facts: `src/engine/partNumbers.js:239` to `:257` `edgeArrowOf` keeps ONE arrow
(right > left > up > down) and loses the rest; `:396` the record; `:276` the DXF
arrow; `src/lib/labelsPdf.js:42` to `:106` `drawEdgeIcon` prints only NO EDGE,
ALL EDGES or EDGE.
```
      3 (front)
   +-----------+
 1 |  SHELF-2  | 2        the board drawn to its proportions,
   +-----------+          each taped edge a thick line with its number
      4 (back)
```
1. `partNumbers.js` (Hania): the record gains `edges`: every taped edge with its
   number in the banding order: 1 and 2 the two opposite side edges, then 3 the
   front, 4 the back (a part with no front: 1 and 2 the short edges, 3 and 4 the
   long, PROPOSED); only taped edges are numbered (a front-only shelf shows "1"
   on its front). `edgeArrowOf` and the DXF arrow stay as they are (FROZEN 1).
2. `labelsPdf.js`: `drawEdgeIcon` draws the board with the numbered edges;
   "NO EDGE" stays for none. The part labels' sheet, their size, their grid and
   everything else on them do NOT change (the owner, 02:12: *"a4 naklejki nie
   zmieniaj"*): only the edge drawing inside each label.
3. `test/turn-cc3a-f20-edge-order.test.js`: an adjustable shelf 1-2 sides, 3
   front, 4 back; a front-only shelf "1"; a door with four edges 1-2 short, 3-4
   long; the label agrees with the part for every part of the fixtures.

## NOT THIS TURN
- The mitre joints meeting inside the carcass (mockup first).
- Render current view folding the Drawings window (*"2 - zostaw jak jest"*).
- T-CC2b (the old Assign window's deletion and the export to JC Production);
  T-CC1c (the profile in JC's `cc_company_profile`).
- Any new kit; retail (`src/retail/**`) except what the copy machine makes.

## IF THE NIGHT RUNS SHORT (the order things fall, whole)
F12.2 (the lighter GLB copy) falls first, then F13.2 (the watches moving with
the drawer), then F17's Position (length and height stay), then F18's preview,
then F20's numbering for parts other than shelves. F1 to F11, F14 to F16, F18
and F19 never fall.

## DELETION LICENCE (BY NAME, nothing else)
In `BomPanel.jsx`: the "Connect JoineryCore" button and its handler (`:521` to
`:528`). In the drawings: the X-ray sheet of the set (`wallSheets.js:209` to
`:211`), its words in `DrawingModal.jsx`, and the lines only it reads (F15.1),
with the tests named in F15.2. In `cabinet.js`: the one `shelf_pins` line
(`:12261` to `:12262`) for the two lines of F5, and `set.dpL = false; set.dpR =
false;` of the recess column (`:5647` to `:5648`). In `JpullRunModal.jsx`: the
typed `MIN_RUN_MM` for the profile's number. Nothing else.

## LINEAGE (lines tests read from this file)
T79's horizontal notch stays as built and its owner's words stay here because
`test/turn79-f05-edge-notch.test.js` reads them from CLAUDE.md: *"cut the corner
działa idealnie, ale możesz zrobić mi też poziome cut? wszystkich 4 rogów?"*
(18.10.2026). T-CC1b's deletion licence stands as merged and
`test/turn-cc1b-f05-output.test.js` reads it from here: the Database menu's five
entries (two of them, Clients... and Projects..., die for good) and the six Output entries named in F5.1 of T-CC1b's file stay deleted. T-CC2a (PR #97)
and main at the merge of this brief are the base of this turn; their numbers hold
untouched but those this file names.

## TESTS AND PROOF
Full suite once per PART and at the end (never `--silent`, Ola, in the
background; the count on main first); the classifier strict with
`f61-t-cc3a-*.mjs` naming every engine delta with the owner's words (`cabinet.js`
F1, F2, F5, F16; `ledStrips.js` F3; `bom.js`, `bomInvoice.js`, `catalogue.js`,
`catalogueData.js` F5 to F7; `profile.js` numbers; `design.js` metal;
`extension.js`; `handles.js` F17; `checks.js` F9) and every re-pinned golden
named; every other golden IDENTICAL (`scripts/t64-classify.mjs --dump` vs
`verify/t70/goldens-base.json`, `t75-goldens --check`, `t78-goldens --check`);
`t78-copy --check` CLEAN; LISP balanced; `vite build` green with `base:
'/cabinet/'`; `scripts/t-cc3a-walk.mjs` against the fake (a recess drawer
wardrobe with doors and its DP, a fixed shelf and its BOM, screws linked with a
pack of 1000, the `CC_FAKE_NO_PACK` switch, click a rail and Delete, open a
drawer behind a shut door, the watches, the J-pull window, the pack labels
window and its PDF page 1, a part label with numbered edges, the drawings set
without X-ray) with frames under `verify/t-cc3a/`; Ewa's check of those frames
in `verify/t-cc3a/ewa.txt` (the task, the clicks, PASS or FAIL per rule, her
objections); Hania's check of the two PDFs; NEW_FILES; the Skylon header; no em
or en dash; grep "worker" in added lines: 0; every F the six stations of DONE in
twenty lines.

## PR BODY
First line: "Stands on main at the merge of the T-CC3a brief; meets T-JC3b of the
Joinery Core repository (the column pack_qty); no live JC was called. RELEASE
ORDER: run sql/2026-11-02-cabinet-core-pack-qty.sql in JC's Supabase, merge
T-JC3b, then merge this." Then files and lines per F; F9's and F12's findings
in words (what was true, what was fixed); the edging audit's counts; the
re-pinned goldens with their rows; the EXEMPT rows and the manifest count before
and after; the tests rewritten and deleted by name; the test count before and
after; the walk; Ewa's table; Hania's check; Ola's numbers; DECISIONS TAKEN; the
PROPOSED points for the owner (the pack words, the element kinds, the pull-down ceiling, the retry numbers, the J-pull field names,
the label sheet numbers, the edge order of parts without a front); SKIPPED AND
WHY; RED AT THE END; THE NUMBERS below.

## THE NUMBERS (in the profile; none typed in the UI)
| Number | Where | Value | Status |
| - | - | - | - |
| the DP inset and the filler | the wardrobe law (`KIT_WARDROBE_FULL.lsp:498`) | 30 mm, 30 mm | CONFIRMED (*"30 mm odsuniecia"*; the list of 01:59) |
| spoons per adjustable shelf | `profile.shelfHoles.pinsPerShelf` | 4 | CONFIRMED (the confirmed list of 01:59) |
| sleeves | every drilled support hole | the drilling's count (12 per shelf in the list) | CONFIRMED (the confirmed list of 01:59) |
| the default metal | `profile.appearance.metalDefault` | chrome | CONFIRMED (*"chrome domyslnie"*) |
| the metals offered | design | gold, chrome, onyx | CONFIRMED |
| a pack size typed at linking | the link | 1 to 100000 | bounds PROPOSED |
| packs on a line | `bom.js` | qty / pack, up to 2 decimals | CONFIRMED (*"500 / 1000 = 0.5 paczki"*) |
| the pull-down triangle ceiling | `profile.visuals.pulldownMaxTriangles` | 8000 | PROPOSED |
| a failed picture's retry | `profile.visuals` | once after 3 s, then on the next toggle | PROPOSED |
| the J-pull shortest run | `profile.handles.jpull.minRunMm` | 300 | as today, moved out of the UI |
| the pack label sheet | `profile.labels.pack` | 2 x 3 of 99.1 x 93.1 mm, 36 pt and 14 pt | PROPOSED (*"okolo 6 naklejek na jednej stronie"*) |
| the smallest print on a label | `profile.labels.minPt` | 7 | PROPOSED |
