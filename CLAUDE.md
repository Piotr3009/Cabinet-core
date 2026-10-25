# CLAUDE.md, TURN 82 · HAWA, THE VANITY, THE CLOUD, THE PANEL IN HAND, THE DRAWINGS FOR THE CLIENT

Run autonomously. Zero questions, zero stops: every decision below is the
owner's own (24.10.2026, 19:14 to 20:17, and 25.10.2026, 11:35 to 13:40,
over his own HAWA planning PDFs in `verify/t82/hawa/`, his mockups in
`verify/t82/mockups/` and his eye-test of the free panel; his words are
quoted where they decide), so nothing here is asked again. Where a number
is marked PROPOSED it is the turn's best reading of the documents and is
used as written: the owner confirms or changes it after the merge, never
during the run. If a point cannot be done, skip it WHOLE, write why in the
PR, and go on to the next. Full suite, never `--silent`. Frames under
`verify/t82/`. Branch `claude/t82-hawa-vanity`, one commit per F, PR at the
end; the owner merges. Nothing lands in Petros from this session. The
owner, 25.10.2026, 13:40: *"plus cala reszta daj zipa i kodujemy za pomoca
agentow w codzie"*.

Agents and parallel mode ON, as in T79 to T81 (the owner, 25.10: *"uruchom
agentow zeby szybciej zakodowac"*). The central files have ONE writer each
and every other agent hands that writer a patch: `engine/types.js`,
`engine/cabinet.js`, `engine/profile.js`, `stores/projectStore.js`,
`3d/UnitView.jsx`, `engine/drawings/projector.js`,
`engine/drawings/wallElevation.js`, `engine/drawings/setSheet.js`,
`components/RightPanel.jsx`, `components/DrawingModal.jsx`. The five PARTS
touch disjoint files and run in parallel from the first minute: PART A
(HAWA: a new kit, its LISP, its BOM and CNC), PART B (the vanity and the
chest: a new kit family), PART C (the cloud: `engine/frontDecoration.js`),
PART D (the free panel in hand: `3d/*`, the store's panel actions), PART E
(the drawings for the client: `engine/drawings/*`, `lib/drawingExport.js`).
Never two agents in one file. Where two parts need `types.js`, `profile.js`
or `projectStore.js`, the writer of that file takes the patches in the
order the parts are numbered. The ORDER of value is the owner's: PART A
first (*"zaczniemy od hawa dodanie"*), then PART B (*"pozniej dodajemy
vanity unit"*), then PART C (*"oraz fluted"*); PART E is the client's
urgency (*"musze miec dzisiaj profesjonalne rysunki dla klientow"*) and
runs beside them; PART D last.

## THE AGENTS (20: nineteen slices and one integrator)
The owner, 13:46: *"daj sporo ale to sporo agentow niech kazdy sie zajmie
jednym malym wycinkiem i jedziemy z koksem"*. Model and mode: Opus 5.5,
ultracode (agents and parallel mode ON). One agent, one slice, one branch
commit per F through the integrator. Every agent: reads this file whole
and its PART; writes ONLY the files it OWNS; hands a PATCH (a unified diff
named with its F) to the writer of any central file; runs its own tests
and the targeted test files, never the full suite (the integrator runs
it); writes its DONE report (the six stations) into
`verify/t82/agents/<name>.md`. Names, slices and files:

| Agent | Slice | OWNS (writes) | Hands patches to |
| - | - | - | - |
| INT | the integrator: the only writer of `engine/types.js`, `engine/profile.js`, `engine/cabinet.js`, `stores/projectStore.js`, `components/RightPanel.jsx`; applies every patch in F order, runs the full suite, the classifier, the copy check, the walk; writes the PR | the five central files, `scripts/t78-classify.d/f43-*`, `test/turn59-f1-the-switch.test.js`, `test/turn77-f5-no-copyright-line.test.js` | nobody |
| A1 | F0 (the regex) then F1: `KIT_HAWA.lsp`, its paren test row, `profile.hawa` numbers with page citations, the weight tables | `reference/lisp/KIT_HAWA.lsp`, `reference/hawa/weight-25.json`, `weight-35.json`, `test/turn82-f01-hawa-lisp.test.js` | INT (profile.hawa, the regex line) |
| A2 | F2, F3: the HAWA_POCKET kit and its engine mirror (the panels, the top, the bottom, the door, the formulas, Checks #37 #38 #42), the class by height and weight | `test/turn82-f03-hawa-door.test.js` | INT (types.js, cabinet.js, the Check texts) |
| A3 | F2: placement in the run, `covers`, the hand, the pocket in `runs.js levelGroups`, the worktop over it; the right panel POCKET DOOR section | `engine/runs.js` (the pocket rows only), `test/turn82-f02-hawa-run.test.js` | INT (projectStore.js, RightPanel.jsx) |
| A4 | F4, F5: the BOM lines and articles, the CNC drill patterns of the panels and the door's cups, the part names on the cut list | `engine/bom.js` (or the file the hardware lines live in), `engine/cnc/hawa.js` (new), `test/turn82-f04-hawa-bom-cnc.test.js` | INT (profile.hawa.articles) |
| A5 | F6, F7: the pocket and the door in the room with the closed / open toggle; the sheets (fronts, no-fronts, the plan with the open door dashed, the section) | `3d/PocketDoor.jsx` (new), `test/turn82-f06-hawa-room.test.js` | D1 (UnitView.jsx, the mount point), E3 (projector.js, the pocket's solids), INT (the toggle action) |
| B1 | F8: `KIT_VANITY.lsp`, its paren test row, `profile.vanity` | `reference/lisp/KIT_VANITY.lsp`, `test/turn82-f08-vanity-lisp.test.js` | INT (profile.vanity) |
| B2 | F9: the VANITY2/3/4 kits and the engine mirror: the rails, the open back, the void gap, equal overlay drawers, the U cut, Check #39, columns 2 | `test/turn82-f09-vanity-kit.test.js` | INT (types.js, cabinet.js) |
| B3 | F10, F11, F12: the worktop over the void, the basin solid and its plan cut-out, the void hatch ink, Check #40 | `engine/worktop.js` (the vanity rows), `3d/Basin.jsx` (new), `test/turn82-f10-vanity-top-basin.test.js` | E3 (projector.js and layers.js: the basin, the hatch, the SERVICE_VOID row), INT (profile.vanity.basin) |
| B4 | F13, F14: plinth / floating, the hangers in the BOM, the right panel VANITY section, the library rows, the retail copy | `engine/library.js`, `test/turn82-f13-vanity-panel.test.js` | INT (RightPanel.jsx, projectStore.js, the copy script run) |
| B5 | F9 (the chest): `columns: 2` and equal overlay drawers on WARDROBE_CHEST2/3/4, their goldens held | `test/turn82-f09-chest-columns.test.js` | INT (types.js, cabinet.js) |
| C1 | F15: the reed profile, the Settings fields (profile and diameter), the CNC operation, the room's strips, Check #41 | `engine/frontDecoration.js`, `components/SettingsModal.jsx` FL rows (the EXEMPT row through INT), `test/turn82-f15-reed.test.js` | INT (profile.frontDecoration.FL, the EXEMPT row), E3 (projector.js: the reeds on the sheet) |
| D1 | F16: the three-axis drag, the drag plane through the panel's own back line, the `fp-wall` chip | `3d/UnitView.jsx` (the ONLY writer of it this turn), `3d/SpacingChain.jsx`, `3d/Scene.jsx`, `test/turn82-f16-panel-drag.test.js` | INT (`moveFreePanelY`, `moveFreePanelZ`) |
| D2 | F17, F18, F19: the three unfiltered call sites, the inset cap, the refusal sentence, `fpT = params.board_t ?? G`, `standsInFrontOf`, Attach "Unit NN, front", the thickness ladder | `engine/attachPanel.js`, `engine/collision.js` (`standsInFrontOf`), `components/ElementProperties.jsx` (the ladder; the EXEMPT row and the retail copy through INT), `test/chatfix-2510-attach-panel.test.js`, `test/turn74-f13-the-free-panel.test.js` | INT (projectStore.js, cabinet.js) |
| E1 | F20: the logo row in the Drawings window, the image entity on the title block, the PDF embed, the storage beside the company | `components/DrawingModal.jsx` (the EXEMPT row through INT), `engine/drawings/setSheet.js`, `lib/drawingExport.js`, `test/turn82-f20-logo.test.js` | INT (the EXEMPT row) |
| E2 | F21: the FRONT GAP FRONT and LEAF GAP LEAF chains, the leader for a figure that does not fit | `engine/drawings/wallElevation.js`, `test/turn41-f5-the-drawings-learn-to-draw.test.js` (amended), `test/turn82-f21-chains.test.js` | nobody |
| E3 | F22, F24 and the projector patches of A5, B3, C1: the default knob of 30, PLINTH_HIDDEN as one dashed line, the pocket's solids, the basin, the hatch, the reeds | `engine/drawings/projector.js` (the ONLY writer), `engine/drawings/setPlan.js`, `engine/drawings/layers.js`, `test/turn82-f22-f24-sheets.test.js` | nobody |
| E4 | F23: the tracer against the live bucket, the committed `silhouettes.json`, the probe of the match, the fix of the one link, the runner on the section | `scripts/t81-silhouettes.mjs` (a flag if needed), `reference/hardware/silhouettes.json`, `engine/drawings/silhouettes.js`, `verify/t82/f23-probe.md`, `test/turn81-f07-silhouettes.test.js` (amended) | E3 (projector.js, if the `sil` link is there) |
| P1 | the PROBES of F16, F17, F18, F21, F22, F23 as committed tables (the rows of 25.10 are in this file; P1 re-runs them on the branch and commits `verify/t82/f16-probe.md` to `f22-probe.md`) in the first hour, before D1, D2, E2 and E3 cut | `verify/t82/*-probe.md`, `scripts/t82-probe-*.mjs` | nobody |
| F1 | F25: the walk, its ledger and frames, run by INT at the end on the built app | `scripts/t82-walk.mjs`, `verify/t82/walk.txt`, `verify/t82/f25-*.png` | nobody |

The order of the night: INT applies A1's regex first (F0), then starts
every agent at once. P1 commits the probes in the first hour. A1 and B1
(the LISP) finish before A2 and B2 mirror them. INT takes patches in F
order; an agent whose patch waits keeps writing its tests. INT runs the
full suite after every PART lands and once at the end; green at the end
is INT's DONE.

## THE ORDER
The owner, in his words where they decide:
- 24.10, 19:19: *"linie ktore rysujesz w pdf sa okropnie grube"*: done in
  chat (PEN ladder halved, commit e37850a2). 24.10, 19:34: *"nie jest to
  bardzo dokladnie narysowany plan, nie ma szczegolow, naprzyklad jak mamy
  szuflady to nie pokazuje dokladnie wymiarow frontow i przerw pomiedzy
  nimi czy pomiedzy drzwiami tylko jeb 207 i 200 co nie ma sensu, nie
  widac wogole zeby bylo jakiekolwiek handles nic, przerywana linia tez
  nie, bedzie jedna linia typu przerywana a nie podwojna bo to mylace
  bardzo jest, narysowane zawiasy to jakas karykatura, dalem ci przeciez
  dxf z dokladnymi rysunkami"* (PART E).
- 25.10, 11:40: *"musimy zrobic nowy projekt i zakodowac w kuchni nowy
  system to sie nazywa hawa III sa to drzwi ktore sa pocket doors ...
  potrzebujemy zaprojektowac to jako wstawienie pomiedzy 2 panele 110 mm
  przestrzen pomiedzy, wysuwasz pocket door i zakrywasz szafke lub
  szafki"* (PART A). His five HAWA PDFs are the law of the numbers.
- 25.10, 11:40: *"do tego dodawanie loga do rysunkow musze miec dzisiaj
  profesjonalne rysunki dla klientow, wlacznie z wizualizacja, jak nie
  bede musial sam tego robic, a to bedzie koszmar dla mnie w autocadzie to
  zrobic samemu"* (PART E).
- 25.10, 12:57: *"daj obydwa prosze"* then 13:03: *"daj wariant b czyli na
  styk narazie"* and *"do tego daj ustawienie srednicy walkow tez"*: the
  cloud fluting (PART C).
- 25.10, 12:57: *"vanity unit (podobna zasada bedzie do chest drawers)
  vanity unit potrzebuje z szufladami nawierzchniowymi, wybor jak zawsze 2
  3 i 4 ale pamietaj ze w vanity default to sa rowne, do tego prosze
  external drawers ale wybor 2 rows, patrz szafa, dodanie blat grubosc do
  wyboru, plinth do zmiany wysokosc, propozycja floating lub on the floor,
  dodanie 1 sink or 2 sink? dodajesz tylko do widoku, musimy miec tez
  wyciecie na trap, w razie czego jak nie bedzie miejsca to zostawimy
  informacje prosze uzyc shallow trap, i tyl, to musimy wymyslec,
  nastepnie to bedzie miejsce z tylu na rurki minimum potrzebujemy okolo
  80 mm do 100 mm i pamietaj ze nie ma plecow na vanity unit tylko sa
  poziome poprzeczki na dole i na gorze, plecy sa jakby wyciete"*; his
  answers 13:03 over the mockup: *"2 wyciecie u dookola zeby sie szuflada
  otwierala, 3 - 80, 4 - 100 na material carcasa grubosc, 5 - blat osobny
  element jak worktop, 6 - do BOM tez, 7 - tak"* (PART B).
- 25.10, 13:36, the free panel eye-test after the chat-fix of 12:39:
  *"teraz mam to w menu a bardziej chcialem grab and move, jak mam
  frontowy komin to nie moge powiekszyc panela bo mi wchodzi w sciane etc
  etc, jest wkurzajace takie ustawienie, nie moge wizualnie zwiekszyc tez
  grubosci tego panela"* (PART D).

## LAWS
T75's LAWS, T76's two, T77's one, T78's two, T79's two, T80's five and
T81's two hold in full: done means the whole road; LISP IS LAW (every new
cut goes to `reference/lisp/` FIRST, then the engine mirrors it byte for
byte: this turn cuts, PART A and PART B each begin with a LISP kit); the
six fossil kits are untouchable and a bare `computeCabinet()` matches its
LISP byte for byte; diagnose before you cut (every BUG starts with a
committed PROBE table); test the way the client clicks (real mouse); one
law one path; 1:1 = COPY through `scripts/t78-copy.mjs`; numbers in the
profile, never typed into the UI without the owner's order; no em or en
dash in anything written, this file included; every new source file begins
with the Skylon Development Ltd copyright header; nothing invented; the
drawings are the model; one ink, one layer. Three laws are this turn's own:
**The manufacturer's sheet is the law of the hardware** (PART A): every
HAWA number comes from the five PDFs in `verify/t82/hawa/` with its page
named in the LISP and in the profile; where the documents are silent
(section 9 of `hawa-numbers.md`) the number is PROPOSED and said so.
**The room refuses in words, the engine never squashes** (PART A, PART B):
a door too wide for the cabinet's depth, a trap with no room over the
second drawer, a panel that would pass the wall: a sentence in the Check,
never a silent clamp of the thing he asked for.
**The panel is in the hand, not in a menu** (PART D, *"grab and move"*):
every place the chat-fix of 25.10 put behind a select is also a drag; the
select stays as the typed road.

## FROZEN
1. The engine's cuts of every kit that exists today: not one line of
   `computeCabinet` for the fossil six, the fixtures, the goldens. New kits
   (HAWA_POCKET, VANITY, VANITY2, VANITY3, VANITY4, the chest variants)
   add; they never edit a fossil. `scripts/t78-classify.mjs` strict with
   this turn's fragments `scripts/t78-classify.d/f43-t82-f*.mjs`; the six
   base goldens, T75 to T81 goldens identical, their DXF fingerprints
   identical; the new kits get goldens of their own (`verify/t82/goldens`)
   REPINNED empty.
2. The CNC export path (`engine/cnc/*`, `lib/exporters.js` DXF) is extended
   for the new parts (the pocket panels' hole patterns, the door's cups,
   the vanity's rails and U cut) and untouched for every existing part.
3. The room (`3d/*`) is edited ONLY by PART D's writer (the drag) and PART
   A's door toggle (`3d/Hardware.jsx` or a new `3d/PocketDoor.jsx`); every
   other part reads it. Lighting untouched (FROZEN 4 of T75), the gloss ride
   of 21.10 untouched, the CONERO files untouched.
4. PRO freeze (`test/turn59-f1-the-switch.test.js`): every PRO file edited
   is licensed in `EXEMPT` with the owner's words from this file and
   re-frozen in the same commit. Retail through the copy script; retail
   gets the new kits in the library only where the PRO library does (1:1).
5. The chat-fix of 25.10 (`engine/attachPanel.js`, the store's
   `attachFreePanel`, the right panel's Attach section, commit after
   e37850a2) is the base of PART D; it is extended, never reverted.
6. The suite is green at the start (record the count: 7220 of 7221 on
   25.10 after the chat-fix, the one red being the known `{7}` regex of
   `test/turn78-classify.test.js`, which this turn fixes as F0) and at the
   end.

## F0 · THE RED THAT IS ALWAYS RED
`test/turn78-classify.test.js` line 75 on 24.10: *"F1's commit, named with
its F"* fails on every clone since the repo's short sha grew to 8
characters (`e16480a8`). The owner, 24.10: *"nie"* to changing it blind; on
25.10 it is red on his own main (`e37850a2`, audited). Fix: the regex `{7}`
becomes `{7,}` (a short sha of 7 or more), nothing else; the test is green
on a fresh clone. One commit, first.

## PART A · HAWA CONCEPTA III 25/35, THE POCKET DOOR (F1 to F7)

What the PDFs say (`verify/t82/hawa/hawa-numbers.md`, every number with
its page; the drawings `verify/t82/hawa/pages/*.png`): the owner's 110 is
the pocket of drawing 169313 and Connector 110: TWO cabinets side by side
share ONE pocket 110 clear that holds TWO doors, one per cabinet, each
hardware set on its own pocket panel. ONE door takes a pocket 55 clear
(drawing 160704, Connector 55), at the end of a run. The pocket panels are
part of the furniture: panel B carries the tracks (min 19), panel A the
connector (min 18). The door pivots 90 degrees and slides in beside the
cabinet; closed, it hangs 3 in front of the pocket's and the cabinet's
front edges and covers the pocket and the cabinet.

### F1 · THE LISP, FIRST: `reference/lisp/KIT_HAWA.lsp`
- A new kit in the house grammar (SKYLON_COMMON), named sections D1 to Dn,
  every number with its HAWA page in a comment. The kit cuts:
  (a) the two POCKET PANELS (`POCKET-A`, `POCKET-B`; in the two-door pocket
  both are B), height EH, depth KT (the pocket's depth, F2), in the FRONT
  material of the run, never the carcass (the owner, 25.10, 13:46: *"panele
  po bokach to jest nie carcas tylko front zawsze, wiec jesli jest 18 mm to
  daj zawsze 22 mm automatycznie, i napisz informacje minimum 19 mm"*):
  their thickness is the front's when the front is 19 or more, and 22 when
  the front is 18 (the profile's `hawa.panelMinMm` 19 and
  `hawa.panelThinFrontMm` 22), with the Check's note #42 "HAWA pocket
  panels 22: the hardware panel needs 19 mm minimum" whenever the swap
  happens; they are their own cut parts, never the neighbours' sides;
  (b) the pocket's TOP and BOTTOM boards closing the pocket (bottom min 18,
  top min 10: PROPOSED 18 both), the bottom with the adjustable foot hole
  (fi 35 at S + 21 from the front, centred in the pocket, 169313);
  (c) the DOOR (`POCKET-DOOR`): width TB, height TH, thickness S = the
  project's front thickness (18 to 26, refused in words outside), with its
  drilling: cups fi 35 x 13 at 200 from the top and from the bottom,
  intermediates equal (3 hinges for III/25, 4 for III/35), cup axis TA from
  the hinge edge by the Z table (overlay: TA1 29/28/27/26 for Z3 2/3/4/5;
  inlaid: TA2 29.5/29/28.5/28 for Z5 3/4/5/6), two fi 5 x 13 at +26 and
  -26 of each cup centre and 9 further in than the cup axis, the fi 8 x 13
  sleeve holes 22 from the top and bottom edges on the cup axis line; for
  III/35 the steel stiffening grooves (12 wide, lower edge 100 - Z1 below
  the top, 24 - Z2 above the bottom, holes at M + 8 then 352 then 352,
  profile length TB - M + 3) drawn as the PDF draws them;
  (d) the hole patterns of the panels (CNC, F5): panel B top track axis 22
  below the top edge, first hole 32 from the front then 160 pitch; bottom
  track axis 41 above the bottom edge, 60 from the front then 160; the
  catch bracket at T1 - 55 from the front and 70 below the half height;
  panel A (one-door pocket only): connector profile axis 10 below the top,
  S + 48 from the front then 160; bottom brackets axis 22 above the bottom
  at S + 23, then 64, then (E1 - 80) / 2, then 64; the pad at S + 43 from
  the front and 60 below the top.
- The formulas are the kit's own words: T1 = TB + 92 + Z3 - M (hardware
  depth), E1 = TB - M (slide-in depth), M >= S + 3 and M <= TB - 320 (door
  projection), T1 >= 414, T1 <= 567 (the bottom track is supplied at 560 =
  T1 - 7), KT1 >= T1 (the cabinet's depth); Z1 = Z2 = Z3 = Z5 = 3 nominal.
  Paren balance test; `test/turn35-lisp-parens.test.js` lists the file.

### F2 · THE POCKET IS A UNIT IN THE RUN
- `engine/types.js`: `HAWA_POCKET` (kitchen and wardrobe families, library
  row "HAWA pocket (Concepta III)", hint "A pocket between two panels; the
  door of the cabinet beside it swings and slides in"). Its width is the
  pocket's: `doors: 1` gives A + 55 + B, `doors: 2` gives B + 110 + B, the
  panels in the front material of F1(a) (22 + 55 + 22 = 99 and 22 + 110 +
  22 = 154 on an 18 front; 25 + 55 + 25 = 105 on a 25 front). Its height is the run's
  (unit height, legs as the neighbours: the pocket stands on the plinth
  line as a cabinet does); its depth KT = the pocket's depth, which the
  engine derives (F3) and never lets the hand type below T1.
- Placement: through `addUnit` as any unit, with `hand: 'L' | 'R'` for the
  one-door pocket (which side the door covers: the pocket at the LEFT end
  of a run has its door on the right of it) and none for the two-door
  pocket (one door each side). `params.pocket = { doors, hand, push: true,
  cls: 25 | 35 }` (Push by default, *"5 - tak"*; the class by F3 with a
  manual override, *"4 - tak"*). The pocket is a unit: it is moved, numbered, listed and
  drawn by the roads every cabinet takes; `obstructs` treats it as a
  cabinet; a run's top infill, plinth, cornice and worktop span it as they
  span a cabinet (`runs.js levelGroups` includes it; the worktop goes over
  the pocket as over any unit).
- Right panel (EXEMPT with the owner's words): section POCKET DOOR with
  Doors 1 / 2, Hand L / R (one door), Push / Pull, Class III/25 / III/35
  (auto by door height, F3, with a manual override), Door covers: the
  units the door covers (F3), and the derived figures read-only: door
  width TB, pocket depth T1, projection M, slide-in E1.

### F3 · THE DOOR, ITS WIDTH, ITS DEPTH, THE REFUSALS
- The door covers the pocket and the cabinet(s) beside it on its hand:
  `params.pocket.covers = [unitId, ...]`, by default the ONE unit next to
  the pocket on that side; the owner may add the next (*"zakrywasz szafke
  lub szafki"*) while TB stays within 440 to 750. TB = the covered units'
  span + the pocket's share (the whole pocket width for one door; half of
  it for each of two doors) + the overlay the project's fronts carry at a
  run end (as `doors.js` overlays a door at a run end today), rounded to
  0.5; the inlaid case (two doors, 169313) subtracts Z5 each side.
- Height TH = the run's front height (the fronts' top line less Z1 and Z2
  from the pocket's EH); class III/25 when TH <= 2200 and the weight table
  of 160704 (committed as `reference/hawa/weight-25.json` and
  `weight-35.json`, read by the engine) allows the door's weight at S and
  the front material's density (`profile.hawa.doorDensityKgPerM3`,
  PROPOSED 700 for MDF), else III/35; TH over 2700 or TB outside 440 to
  750 is refused in words (Check #37 "HAWA door out of range").
- Depth: the door PROTRUDES as a rule (the owner, 13:46: *"raczej zawsze
  wystaja troche wiec nie ma problemu"*): the engine sets T1 = the covered
  cabinet's depth KT1 (the pocket as deep as the cabinet, never deeper) and
  reads M = TB + 92 + Z3 - T1, the door standing M proud of the fronts;
  when that M is under S + 3 (a shallow door on a deep cabinet) M = S + 3
  and T1 = TB + 92 + Z3 - M, the pocket shallower than the cabinet, which
  is allowed (KT1 >= T1); the pocket depth KT = T1 + `hawa.rearAllowanceMm`
  (PROPOSED 20: HAWA's RE is not in the legend) capped at KT1. Refused in
  words only where HAWA refuses: M > TB - 320, T1 < 414, T1 > 567 (the 560
  track): Check #38 "HAWA: the door TB needs a pocket T1 deep on a KT1
  cabinet; make the cabinet deeper or the door narrower". The right panel
  shows M so the owner sees how proud the door stands. Never a silent
  change of the door the owner asked for.
- Gaps: the closed door hangs 3 in front of the fronts' plane (the pocket's
  and the cabinets' front edges in one plane); Z1 = Z2 = 3 top and bottom
  inside EH; Z3 (overlay) or Z5 (inlaid) = 3 at the hinge edge. All from
  `profile.hawa.gaps`.
- Tests `test/turn82-f03-hawa-door.test.js`: a BUD 500 beside a one-door
  pocket on a 580 run gives TB = 599 (500 + 99), T1 = 567 at most, M by the
  formula; a 750 door on a 580 run stands M = 265 proud (T1 580 = 750 + 92
  + 3 - M); a 750 door whose M would pass TB - 320 is refused with Check
  #38; the class flips to 35 above 2200; one door over two narrow units
  (*"3 tak moga"*) gives TB = their span + the pocket.

### F4 · BOM AND THE PART LIST
- The BOM (`engine/bom.js` or where the hardware lines live) adds, per
  pocket: "Hawa Concepta III 25 Push, left" (or 35, Pull, right), one set
  per door; "Hawa Connector 55" or "Connector 110", one per pocket; the
  hinges (3 or 4 per door) as the set's own; the top track and bottom track
  cut to T1 - 7 (one line, the length named); for III/35 the steel
  stiffening profile, length TB - M + 3; the adjustable foot (HAWA
  recommends one under the pocket). Article numbers from
  `profile.hawa.articles` (PROPOSED, the Häfele UK codes in the NBS sheet:
  408.30.711 III/25-35 Push left; the rest left empty strings for the
  owner to fill; an empty article prints the name alone).
- The pocket panels, top, bottom and door are ordinary cut parts on the cut
  list and the CNC sheets, named `POCKET-A`, `POCKET-B`, `POCKET-TOP`,
  `POCKET-BOTTOM`, `POCKET-DOOR` with the unit's number.

### F5 · CNC: THE PANELS' HOLES AND THE DOOR'S CUPS
- `engine/cnc/*`: the hole patterns of F1(d) as drill operations on the
  pocket panels (fi 4.5 pilot PROPOSED 3 mm diameter 10 deep, since HAWA
  screws 4.5 x 16 / 4.5 x 20 into the panel face), on the layer grammar the
  CNC already has for hinge plates; the door's cups and holes as the hinge
  drilling is done today (fi 35 x 13, fi 5 x 13, fi 8 x 13). The CNC export
  fingerprint of every EXISTING fixture is unchanged (FROZEN 2).

### F6 · THE ROOM: THE DOOR CLOSED AND OPEN
- The pocket draws as two panels, a top and a bottom in the carcass finish,
  the door in the front finish of the run (spray, decoration, in-frame as
  the neighbours), hung on the hand's side. A toggle on the pocket (right
  panel: Door closed / open; the same in the viewer's "Open all" of T69)
  slides the door into the pocket: open = the door rotated 90 degrees about
  its hinge edge and translated E1 into the pocket, its leading edge M
  proud. The hardware: today's symbols (a vertical profile 17 x 60 PROPOSED
  in the hardware zone of panel B, the ejector block for Push), no GLB (none
  in the bucket). The hinge cups on the door's back as the engine drills
  them.

### F7 · THE DRAWINGS
- The fronts sheet (T81) draws the closed door over the pocket and the
  covered units, 3 proud, with the hinge bars on its hinge edge (T81 F3's
  bar at the cup's y); the no-fronts sheet lifts it and shows the pocket's
  two panels; the plan cuts the pocket and draws the open door dashed
  (HIDDEN) inside it; the section through the pocket shows T1 and the
  tracks' zones (22 and 41 lines). Dimensions: TB and M on the plan.

## PART B · THE VANITY AND THE CHEST OF DRAWERS (F8 to F14)

### F8 · THE LISP, FIRST: `reference/lisp/KIT_VANITY.lsp`
- Parent KIT_BUDR (the drawer base) with these differences, each a named
  section: (a) NO BACK: two horizontal RAILS instead, `RAIL-TOP` and
  `RAIL-BOTTOM`, 100 high (*"4 - 100"*) in the carcass board thickness
  (*"na material carcasa grubosc"*), spanning between the sides at the
  back, flush with the sides' back edges, fixed as the back-to-side joint
  of the house (dog bones or Cabineo as the project chooses, as KIT_SINK's
  rails are); between them the back is open (*"plecy sa jakby wyciete"*);
  (b) the carcass stands `vanity.serviceVoidMm` = 80 (*"3 - 80"*) off the
  wall: the unit's `wall_gap` is the project's clearance + 80, written by
  the kit's defaults (not typed), so every reader of `wallGapOf` (the
  scene, the drag, the worktop, the plan, the section) sees the void; the
  TOP (F10) reaches the wall over it; (c) overlay drawers 2, 3 or 4, EQUAL
  heights by default (*"w vanity default to sa rowne"*), the front gap of
  the project between them, each a box on the project's runners with the
  drawer law of 17.10 (10 shorter than the runner); (d) the TRAP: the top
  drawer's box takes a U cut-out all round the trap (*"wyciecie u dookola
  zeby sie szuflada otwierala"*): the box's back wall and bottom are cut by
  a U of width `vanity.trapWidthMm` 160 and depth `vanity.trapDepthMm`
  120 into the box from the back wall, centred under the basin's waste
  (F11), its corners R 20 (the owner, 13:46: *"6 - tak"*); the box's side
  walls stay; when the basin's waste falls over the SECOND drawer too
  (its box top under the trap's bottom by less than `vanity.trapClearMm`,
  PROPOSED 60) the engine cuts no second U and the Check says "#39 Use a
  shallow trap" (*"w razie czego jak nie bedzie miejsca to zostawimy
  informacje prosze uzyc shallow trap"*); (e) the plinth as the house
  plinth, height typed (*"plinth do zmiany wysokosc"*), or FLOATING: no
  legs, no plinth, `mount: 'wall'` at a typed height from the floor, with
  the hanging brackets in the BOM (F13).
- The two-column variant (*"external drawers ale wybor 2 rows, patrz
  szafa"*): the wardrobe's own rule (`AddItems.jsx` 2 columns: a divider
  mid-width, a stack in each column, one fixed shelf over both) copied into
  the kit as `columns: 2`: the carcass takes a vertical DIVIDER mid-width
  from the bottom to the top rail, each column a stack of 2, 3 or 4 equal
  overlay drawers, the rails spanning the whole width behind both.

### F9 · THE KITS: VANITY2, VANITY3, VANITY4 AND THE CHEST
- `engine/types.js`: `VANITY2`, `VANITY3`, `VANITY4` (bathroom family, new
  library group "Bathroom" in the Kitchen library and in the wardrobe
  library, row "Vanity unit, N drawers"), defaults from
  `profile.vanity.defaults` (PROPOSED width 900, height 600 carcass on a
  100 plinth, depth 500 carcass; the service void 80; top 20); `params.
  columns: 1 | 2`, `params.sinks: 0 | 1 | 2`, `params.floating: boolean`,
  `params.float_height_mm`. The chest of drawers of the wardrobe family
  (`WARDROBE_CHEST2/3/4`, T75 F16) takes the same two rules (*"7 - tak"*):
  equal overlay drawers by default and `columns: 2`; no basin, no void, no
  rails: its back stays (the chest is a bedroom piece).
- `engine/cabinet.js` mirrors KIT_VANITY.lsp byte for byte; a bare
  `computeCabinet('VANITY3')` is the LISP; the chest's `columns: 2` is a
  parameter on the existing chest kits, their goldens held at columns 1.

### F10 · THE TOP IS A WORKTOP
- The vanity's top is the house WORKTOP (*"5 - blat osobny element jak
  worktop"*): `addWorktop` over the vanity as over a run, its thickness the
  worktop's (typed, *"blat grubosc do wyboru"*), its depth reaching the
  wall over the service void (the void is behind the carcass, the top
  covers it: `worktopGeometry` reads the unit's back line from `wallGapOf`
  today and must read the WALL line for a vanity: `d` = the unit's depth +
  the void + the front overhang), its decor the worktop's. A vanity born in
  a room gets its worktop at birth (as the sets of T75 give a run its top).

### F11 · THE BASIN, ONLY TO THE EYE
- `params.sinks` 1 or 2 (*"dodajesz tylko do widoku"*): a basin solid in
  the room (an oval 520 x 400 x 150 PROPOSED, from `profile.vanity.basin`)
  set into the worktop, one centred, two at the column centres (or at a
  third and two thirds of the width for one column); the worktop's
  cut-out drawn on the plan (T81's plan, the sink cut-out as the owner's
  DXF has it); nothing in the cut list, nothing on the CNC (the basin is
  supplied by others, as appliances are). The basin's waste centre is the
  trap's centre of F8(d): x at the basin centre, z at `vanity.wasteFromBack`
  (PROPOSED 200 from the carcass back).

### F12 · THE SERVICE VOID AND THE RAILS, IN THE ROOM AND ON THE SHEETS
- The room draws the vanity 80 off the wall with the open back between the
  rails; the plan draws the void hatched (a new ink `SERVICE_VOID`, grey
  hatch, T81's one-ink-one-layer law), the section shows the two rails and
  the void. The Check lists the void as a note (#40 "Service void 80 behind
  the vanity for the pipes"), never as a fault.

### F13 · PLINTH OR FLOATING, AND THE BOM
- Plinth: the house plinth under the vanity, height typed on the unit as
  every unit's; `floating: true`: no legs, no plinth, the carcass hung at
  `float_height_mm` (PROPOSED default 300), the BOM adds the hanging
  brackets (*"6 - do BOM tez"*): `profile.vanity.hangers` (PROPOSED: 2 x
  cabinet hanger 50 kg with wall plate, article empty for the owner) and
  the rails of F8 double as the hanging rail (the top rail is where the
  hangers bite).

### F14 · THE RIGHT PANEL AND THE LIBRARY
- Right panel (EXEMPT): Drawers 2 / 3 / 4 (the kit), Columns 1 / 2, Sinks
  0 / 1 / 2, Floor / Floating with the height field, the plinth height as
  today; the drawer heights editable as the chest's are (T75 F16) and reset
  to equal by one button "Equal". Library rows as F9. Retail: the same rows
  in the EXTRAS step through the copy script where PRO's library is copied.
- Tests `test/turn82-f08-vanity.test.js`: VANITY3 at 900 x 600 x 500 on the
  default profile: three equal fronts, two rails 100 high in the board
  thickness, no BACK part, `wall_gap` = clearance + 80; the U in the top
  drawer's box when sinks = 1; Check #39 when the second drawer is within
  60 of the trap; columns 2 gives a divider and six boxes; the chest at
  columns 2 gives a divider and its goldens at columns 1 hold.

## PART C · THE CLOUD: FLUTED AS CONVEX REEDS (F15)

### F15 · `engine/frontDecoration.js` FL gets a profile
- Today FL is grooves (ballnose 12, 3 deep, every 20, inset 50: T76,
  "owner to confirm"). The owner, 25.10 (*"fluted teraz to sa rowki a ja
  potrzebuje chmurke"*, over the mockup `verify/t82/mockups/chmurka.png`):
  *"daj wariant b czyli na styk narazie"*, *"do tego daj ustawienie
  srednicy walkow tez"*. So FL carries `fluteProfile: 'groove' | 'reed'`
  (Settings, PRO and retail through the copy), default `reed`; `reed` is a
  row of CONVEX half-rounds TOUCHING (no flat between), diameter
  `reedDiameterMm` typed in Settings (PROPOSED default 20, the ladder 16,
  20, 25), the crests ON the front's face, the valleys `reedDiameterMm / 2`
  into the board, sharp; the margins as today's `grooveInsetMm` at the
  sides; top and bottom the reeds run to the edges (PROPOSED). The CNC
  operation: a profile cutter path per valley (kind `reed`, tool
  `{ kind: 'reedProfile', diameter }`) on the FLUTE layer grammar; the
  board left under the valley is said in the Check when under 10
  (#41 "Reeds leave N mm under the valley", a front 22 with reeds 20 leaves
  12). The room draws the reeds (the front's face as a displaced strip row,
  as T76 draws the grooves) and the fronts sheet draws them as T81 draws
  the grooves. The second cloud (a flat between the reeds) is NOT this turn
  (*"narazie"*).
- Tests `test/turn82-f15-reed.test.js`: a 596 x 726 front at reed 20 and
  inset 50 carries (596 - 100) / 20 = 24 reeds exactly when the field
  divides, else the engine centres the row and says the remainder in the
  Check; the goldens of FL grooves held at `fluteProfile: 'groove'`.

## PART D · THE FREE PANEL IN HAND (F16 to F19)

The base is the chat-fix of 25.10 (FROZEN 5): the Attach section
(`attachFreePanel`: wall, floor, ceiling, a unit's left side, right side
and top, a chimney's or box's front, left and right, with a gap; the panel
does not follow, *"3 nie jedzie"*). The eye-test of 13:36 found three
faults; every one starts with a PROBE table in `verify/t82/f16-probe.md`.

### F16 · GRAB AND MOVE, THREE AXES
- *"bardziej chcialem grab and move"*. Today (probed 25.10, the table in
  `verify/t82/f16-probe.md`): a press on the panel's mesh reaches
  `UnitView.jsx onPointerDown` (2981 to 3118) and falls through to
  `startDrag` (3117), whose `dragPlane` (1818 to 1821) is parallel to the
  wall through the unit's mid depth, ignores `inset_back_mm`, and reports
  only `alongMm(p) - offset` through `onMove(x)` (1905); `hit.y` is thrown
  away; no 2-axis unit drag exists in `3d/` (the shelf drag 2651 uses
  `hit.y` on the same plane, the depth drag 2520 uses a horizontal plane
  with Alt). `mount_height` is written by `updateUnitParams` with NO clamp
  (3000 in a 2500 room passes). `setUnitInsets` caps the back inset at
  `editor.maxInset` 300.
- For a FREE_PANEL the drag gets three axes: along the wall (x, as today,
  the snap proposal of T74 F13 kept); UP and DOWN from the same plane's
  `hit.y` through a new store action `moveFreePanelY(id, y)` that clamps
  `mount_height` to 0 and to the room height less the box height; OFF THE
  WALL with Shift held (the horizontal plane at the panel's height, the
  `startDepthDrag` pattern) through `moveFreePanelZ(id, z)` writing
  `inset_back_mm` clamped to the wall clearance and to the room's far
  wall less the panel (NOT `maxInset` 300, F17). The drag plane of a panel
  passes through its OWN back line (`backStandoff`), so a panel stood off
  the wall drags where the eye sees it. The typed road gains the same
  three: the SpacingChain chips `fp-left`, `fp-floor` and a new `fp-wall`
  (distance from the wall). Attach stays as the typed road to a surface.
- The drag of a panel is never stopped by what it already stands in front
  of: `obstaclesBeyond` of the chat-fix, on all three axes; the snap
  proposal of T74 (edges of units on the wall) stays on x only.
- Tests: a store test of the three moves and their clamps; the walk (PART
  F) drags a panel up by a real mouse and reads `mount_height`.

### F17 · THE PANEL IN FRONT OF A CHIMNEY CAN GROW
- *"jak mam frontowy komin to nie moge powiekszyc panela bo mi wchodzi w
  sciane"*. PROBED on 25.10 (commit the table as `verify/t82/f17-probe.md`
  from these rows, then fix): `updateUnitParams` (projectStore.js
  6823 to 6827 on 25.10) builds the width spans with `boxes:
  planObstaclesOf(...)` unfiltered; `boxSpansOnWall` (collision.js 470)
  keeps any box whose `span.near < depth`, and `depth` is the panel's 18
  from the WALL line, not from the panel's back line (`backStandoff` 350
  after an attach to the chimney's front). So the chimney counts as a
  neighbour, `clampUnitWidth` (collision.js 626 to 628) finds `free = 0`
  and: `panel_length 600` on the front-attached panel gives "Width limited
  to 0 mm by a chimney on this wall" and the panel becomes 1 wide; `900`
  gives no notice but the F9 near-edge branch (6858 to 6864) takes the
  whole 900 from the left and the panel leaves the chimney's face (x 2500
  to 1600); a chimney in the corner gives "This wardrobe cannot grow either
  way: a chimney on this wall is on the right and the infill at the wall is
  on the left. 0 mm is what it can be." (the owner's "wchodzi w sciane",
  and the sentence calls a panel a wardrobe); `board_t 36` on that panel
  goes through the same clamp and shrinks it to 1. The same unfiltered call
  sits in `unitSizeBoundsFor` (6440 to 6446: width max 0) and in
  `validateUnit` (12154 to 12156: UNIT_OVERLAP "overlaps a chimney by
  600"), which the right panel shows.
- Fix: the three call sites take, for a free panel,
  `obstaclesBeyond(planObstaclesOf(...), wall, backStandoff(panel,
  profile))` as `boxes`, exactly as `moveUnit` does since the chat-fix
  (7193 to 7195); the near-edge loop reads the same spans and follows.
  The refusal sentence names the unit by its type's label, never
  "wardrobe" for a panel. A panel ACROSS the wall beside the chimney
  already grows in length to the room's far wall (probed: 900, 1200, 2000
  pass; 3500 says "Depth limited to 2990 mm by the room"); keep it.
- The inset cap: `attachPlan` writes `inset_back_mm 340` for a chimney 350
  deep, above `editor.maxInset` 300, and any later `setUnitInsets` pulls
  the panel 40 into the chimney. Rule: a free panel's back inset is capped
  by the ROOM (the far wall less the panel), not by `maxInset`, in
  `setUnitInsets` and in F16's drag; `maxInset` stays a cabinet's number.
- Tests: the chimney stage of `test/chatfix-2510-attach-panel.test.js`
  extended: a panel on the chimney's front grows from 800 to 1200 with no
  notice and keeps x 2500; `board_t 36` keeps its width; `unitSizeBoundsFor`
  gives the room's bounds; `validateUnit` has no UNIT_OVERLAP; beside it,
  across, it grows in length to the room's depth less the clearance.

### F18 · THE THICKNESS SHOWS
- *"nie moge wizualnie zwiekszyc tez grubosci tego panela"*. PROBED on
  25.10 (`verify/t82/f18-probe.md`): `updateUnitParams(id, { board_t: 36 })`
  writes `board_t 36` and a box `depth 36`, but the engine's FP board stays
  `t 18, box.d 18`: `engine/cabinet.js` 3581 `const fpT = G`, and `G` is
  `cfg.G = carcassG` (1062, 792) = `thicknesses.carcass1 = slotT('carcass1',
  G)` (781), which `paramsForEngine` always fills from the project's
  thickness slots (projectStore.js 1317 to 1319), so the project's carcass
  18 overrides the panel's own `board_t`. A bare `computeCabinet` with no
  slots gives t 36, with `{ carcass1: 18 }` gives 18. The room
  (`UnitView.jsx` 1317, `boxGeometry` from `p.box`) and the cut list follow
  the engine, so an across panel at `board_t 36` shows a 36 box with an 18
  board inside it and an 18 gap against what it was attached to.
- Fix, one link: the free panel's board thickness is its own `board_t`
  (the kit's field since T74), read in `cabinet.js` for the FP part
  BEFORE the carcass slot (`fpT = params.board_t ?? G`), so the engine,
  the room, the cut list, the plan and the Thickness field agree. The
  carcass slot keeps ruling every cabinet (the goldens hold: no fossil has
  a `board_t`). A thickness ladder in the field (18, 22, 25, 30, 36,
  PROPOSED) beside the free number.
- Tests: `test/turn74-f13-the-free-panel.test.js` extended: `board_t 36`
  gives an FP of t 36 and box.d 36 (upright, along), the cut list line 36,
  and the goldens identical.

### F19 · THE FRONT OF A UNIT
- The chat-fix left out "unit, front" (a panel covering a cabinet's front:
  the owner's cladding of 24.10's list). `obstructs` holds a free panel off
  a cabinet on its x span and height band and never reads depth; a panel in
  FRONT of a cabinet is not in the cabinet's way. Rule: a free panel whose
  back line stands at or beyond a unit's front line (its `backStandoff` >=
  the unit's `backStandoff` + depth + front) does not obstruct that unit
  and is not obstructed by it (collision.js, one predicate, named
  `standsInFrontOf`); Attach gains "Unit NN, front" (facing along, upright,
  the back at the unit's front plane plus the gap).

## PART E · THE DRAWINGS FOR THE CLIENT (F20 to F24)

### F20 · THE LOGO AND THE COMPANY ON THE SHEET
- *"dodawanie loga do rysunkow"*. The title block has a 24 x 24 LOGO box
  since T40 (`setSheet.js`, "LOGO (Settings)") and no way to fill it. The
  Drawings window (DrawingModal, EXEMPT) gets, beside Company, a LOGO row:
  "Choose image" (PNG, JPG or SVG, read as a data URL, scaled to fit the
  24 x 24 box keeping its ratio, stored with the title block's company in
  the same place the company name is remembered on this computer,
  `recallTitleBlockCompany`) and "Remove". The sheet draws it as an `image`
  entity (the grammar exists: `svg.js` and `drawingExport.js` already draw
  `kind: 'image'`) on the SHEET_MUTED layer; the PDF embeds it. Company
  name, tagline, three lines, client and address as today.

### F21 · THE FRONTS' OWN DIMENSIONS
- *"jak mamy szuflady to nie pokazuje dokladnie wymiarow frontow i przerw
  pomiedzy nimi czy pomiedzy drzwiami tylko 207 i 200 co nie ma sensu"*.
  PROBE (committed): the T81 fronts sheet of the walk's kitchen writes 366
  and 360 for drawer fronts of 363 and 360 because `heightChains` (T41
  F5c, wallElevation.js) drops the 3 mm gap edge and lets the gap fall into
  the next front. The law changes: the height chain is FRONT, GAP, FRONT
  (363 · 3 · 360 on the BUDR2), the gaps dimensioned as the owner's DXF
  dimensions them (19 gap dimensions of 2 and 3 on `Balck_kicthen.dxf`),
  the gap figure in the ANNOTATION pen at the chain's text height; the
  width chain gains the same for doors: LEAF, GAP, LEAF (376.5 · 3 · 376.5
  on the BUD 800) under the run's unit chain. Where a figure would not fit
  its segment (a 3 at 1:20 is 0.15 mm) it is written beside the chain with
  a leader, never dropped.
- Tests: `test/turn41-f5-the-drawings-learn-to-draw.test.js` amended with
  the owner's words (the 2026 law replaces T41 F5c's "a 3 mm gap is not a
  dimension"); the walk reads 363 and 3 off the glass.

### F22 · HANDLES ON THE SHEETS
- *"nie widac wogole zeby bylo jakiekolwiek handles"*. PROBE: the T81
  projector draws a handle only when the project has chosen one (knob or
  bar; none chosen = none drawn, 0 on every sheet). The owner's DXF draws
  knobs as circles of 30 and bars as rectangles. Rule: when the project
  has no handle chosen, the fronts sheet draws the project's DEFAULT handle
  (the profile's `handles.default`, a knob of 30) at the engine's position,
  on the HANDLES layer, so a sheet never shows a front with nothing to pull
  (push-to-open projects say so in Settings: `handles: 'none'` is a choice,
  not an absence, and draws nothing). The drill summary is untouched.

### F23 · THE HINGES AND THE RUNNERS FROM THE MODELS
- *"narysowane zawiasy to jakas karykatura, dalem ci przeciez dxf z
  dokladnymi rysunkami"*. T81 F7 traced nothing (the bucket was out of
  reach that night; `reference/hardware/silhouettes.json` is 45 fallbacks).
  On 25.10 from this session the bucket answered: 6 hinges, 2 plates and 15
  runners traced (`verify/t82/silhouettes-live.json`, the tracer's own
  output, 19 hinge rows and 40 runner rows in the manifests). F23: (a) run
  `scripts/t81-silhouettes.mjs` against the live bucket and COMMIT the
  file (the tracer is idempotent); (b) PROBE why the sheets did not change
  with the traced file (on 25.10 all nine pages were pixel-identical with
  the traced file in place): the match of `hingeMark` (`silhouettes.js`,
  `modelBasename(h.spec?.file || resolveDoorHinge(...)?.file)` against
  the entry's `file`) or the projector's `sil` not reaching the entity;
  name it in `verify/t82/f23-probe.md`; (c) fix the one link so the
  section through the BUDR2 draws the MOVENTO runner's side silhouette and
  the fronts sheet's hinge bars become the cup's traced front silhouette
  where T81's bar stands (the owner's DXF: solid black bars 6 x 70 stay as
  the elevation's convention, *"2 zawiasy na elewacji wedlug silnika i
  podobnie jak na moim dxf"*; the SECTION and the PLAN draw the traced
  shapes); (d) the owner's own hinge and runner DXFs, when he sends them,
  are the reference of the next audit, not of this turn.

### F24 · ONE DASHED LINE FOR THE PLINTH
- *"przerywana linia tez nie, bedzie jedna linia typu przerywana a nie
  podwojna bo to mylace bardzo jest"* (the base plan: the plinth under the
  cut is drawn as two dashed lines, its front and back faces, on the green
  SHELVES layer). Rule: on a plan, a board hidden under the cut that is
  SEEN EDGE-ON (the plinth, a rail) is one dashed line at its face toward
  the room, on a layer of its own, `PLINTH_HIDDEN` (one ink one layer),
  grey, FINE pen, dash as the HIDDEN role; the shelves keep their layer.
  The legend row follows.

## PART F · THE WALK (F25)

### F25 · `scripts/t82-walk.mjs`
- Real mouse, built app (`npx vite build` and preview), ledger
  `verify/t82/walk.txt`, frames `verify/t82/f25-*.png`: (1) Library, HAWA
  pocket beside a BUD 500 on a 580 run: the pocket stands, the door covers
  the BUD, the right panel reads TB 592, T1 by the formula, M; the toggle
  opens the door into the pocket (two frames); a 750 door asked: the Check
  says #38; (2) Library, Vanity 3 drawers: the room shows the void and the
  rails, the worktop over it, one basin; Columns 2 and Sinks 2; Floating
  at 300; the top drawer's U on the CNC sheet; (3) Settings, Fronts FL,
  profile reed 20: the front's reeds in the room and on the fronts sheet;
  (4) a free panel dragged up by 200 with a real mouse (`mount_height`
  read back), a panel on the chimney's front widened to 1200 (no notice),
  Thickness 36 visible in the room; (5) Output, Drawings: the logo chosen
  and on the sheet, the fronts sheet's chain 363 · 3 · 360 and the knob of
  30 on every door, the base plan's plinth as one dashed line, the section
  with the traced runner; the exported PDF read back and its pages counted.

## NOT THIS TURN (named so nobody builds it)
- The second cloud profile (a flat between the reeds): *"narazie"* one.
- A HAWA GLB in the room: none in the bucket; symbols until the owner adds
  a model.
- Folding Concepta (the bifold variant), the Pull handle's own geometry
  (a handle as today's bar on the door, no collision study).
- The vanity's plumbing (taps, waste, pipes): the void and the trap's U
  only; the basin is a solid to the eye.
- A click in the 3D on a surface to attach the panel (the drag of F16 is
  the hand; Attach is the typed road).
- A DXF export of the set (*"nie export do dxf"*, T81) and the model-space
  1:1 DXF the owner's AutoCAD file is: a later decision.
- Retail's own vanity flow beyond the library copy.

## LINEAGE (one line a test reads from this file)
T79's horizontal notch stays as built and its owner's words stay here
because `test/turn79-f05-edge-notch.test.js` reads them from CLAUDE.md:
*"cut the corner działa idealnie, ale możesz zrobić mi też poziome cut?
wszystkich 4 rogów?"* (18.10.2026). T81's set (merged as PR #80 on
23.10.2026) and the chat-fixes of 24.10 (thin lines, e37850a2) and 25.10
(the attach section) are the base of this turn; their numbers hold.

## TESTS AND PROOF
Full suite; the goldens untouched and proven (`scripts/t78-classify.mjs`
strict with `f43-t82-f*.mjs` fragments, REPINNED empty everywhere but the
new kits' own goldens, which are NEW not re-pinned; the six base goldens
IDENTICAL; T75 to T81 goldens held; the DXF fingerprints of every existing
fixture unchanged); `scripts/t78-copy.mjs --check`; `scripts/t82-walk.mjs`
with real mouse and the frames above; the LISP paren balance of the two new
kits; NEW_FILES in `test/turn77-f5-no-copyright-line.test.js` lists every
new file; every F reports the six stations of DONE; the PR proves the
existing cuts are untouched.

## PR BODY
The probe tables verbatim (F16, F17, F18, F21, F22, F23); files and lines
per F; the LISP sections of KIT_HAWA and KIT_VANITY with their page
citations; the EXEMPT entries; the retail copies; the goldens proven
identical and the new goldens named; the test count before and after; the
walk result with its frames; DECISIONS TAKEN; SKIPPED AND WHY; RED AT THE
END; THE NUMBERS below, each marked CONFIRMED or PROPOSED.

## THE NUMBERS (all in profile.js; none typed in the UI without the owner)
| Number | Value | Source |
| - | - | - |
| HAWA pocket clear width | 55 one door, 110 two doors | 160704, 169313, Connector 31418; CONFIRMED by the PDFs |
| HAWA door depth rule | the pocket as deep as the cabinet, the door M proud; refused only outside HAWA's limits | owner 13:46 "raczej zawsze wystaja troche"; CONFIRMED |
| HAWA one door over two units | allowed, TB within 440 to 750 | owner 13:46 "3 tak moga"; CONFIRMED |
| HAWA class and Push | class by height and weight with override; Push default | owner 13:46 "4 - tak, 5 - tak"; CONFIRMED |
| HAWA pocket panels | the front material; 22 when the front is 18; note "minimum 19 mm" | owner 13:46; CONFIRMED |
| HAWA pocket top and bottom | 18 (top min 10, bottom min 18) | PROPOSED |
| Door S | the project's front thickness, 18 to 26 | 160704 table; CONFIRMED |
| Door TB, TH | 440 to 750; III/25 1200 to 2200, III/35 1900 to 2700 | 160704 table; CONFIRMED |
| T1, E1, M, KT1 | T1 = TB + 92 + Z3 - M, E1 = TB - M, M >= S + 3 and <= TB - 320, T1 >= 414, T1 <= 567, KT1 >= T1 | 160704 and 169313 tables; CONFIRMED; the 567 derived from the 560 track |
| Rear allowance RE | 20 | not in the legend; PROPOSED |
| Gaps Z1 Z2 Z3 Z5, door proud | 3, 3, 3, 3; 3 in front of the fronts | PDFs nominal; CONFIRMED |
| Hinges | cups fi 35 x 13 at 200 top and bottom, 3 (III/25) or 4 (III/35), TA by the Z table, fi 5 x 13 at +/- 26 and TA + 9, fi 8 x 13 at 22 | 160704, 52676, 52679; CONFIRMED |
| Panel hole patterns | B: 22 / 32 then 160, 41 / 60 then 160, bracket T1 - 55 and 70; A: 10 / S + 48 then 160, 22 / S + 23, 64, (E1 - 80) / 2, 64, pad S + 43 and 60 | 160704 panel drawings; CONFIRMED |
| Tracks | cut to T1 - 7, start 5 behind the front edge | 160704, 52676; CONFIRMED |
| Door density for the class | 700 kg per m3 | PROPOSED |
| HAWA articles | 408.30.711 III/25-35 Push left; others empty | NBS sheet; PROPOSED, the owner fills |
| Vanity service void | 80 | owner 13:03 "3 - 80"; CONFIRMED |
| Vanity rails | 100 high, carcass board thickness, top and bottom | owner 13:03 "4 - 100 na material carcasa grubosc"; CONFIRMED |
| Vanity drawers | 2 / 3 / 4, equal by default; columns 1 / 2 | owner 12:57; CONFIRMED |
| Vanity top | the worktop, thickness typed | owner 13:03 "5"; CONFIRMED |
| Trap U | width 160, 120 into the box, R 20, all round | owner 13:03 "2 wyciecie u dookola", 13:46 "6 - tak"; CONFIRMED |
| Trap clearance to the second drawer | 60, else Check #39 "Use a shallow trap" | owner 12:57; the 60 PROPOSED |
| Basin | oval 520 x 400 x 150, waste 200 from the back | PROPOSED, to the eye only |
| Vanity defaults | 900 x 600 x 500, plinth 100, top 20, floating 300 | PROPOSED |
| Hangers | 2 per floating vanity, in the BOM | owner 13:03 "6 - do BOM tez"; the article PROPOSED empty |
| Chest of drawers | the same two rules, no void, no rails | owner 13:03 "7 - tak"; CONFIRMED |
| Reed profile | convex half-rounds touching, crests on the face | owner 13:03 "wariant b czyli na styk"; CONFIRMED |
| Reed diameter | typed in Settings, default 20, ladder 16 / 20 / 25 | owner 13:03 "ustawienie srednicy walkow"; the default PROPOSED |
| Reed margins | sides 50 as today's inset; top and bottom to the edge | PROPOSED |
| Free panel drag | x as today, y by the drag, z with Shift; clamps floor, ceiling, far wall | owner 13:36 "grab and move"; the Shift PROPOSED |
| Free panel thickness ladder | 18, 22, 25, 30, 36 | PROPOSED |
| Logo box | 24 x 24 on the title block, image kept with the company on this computer | T40 box; the storage PROPOSED |
| Front chains | FRONT, GAP, FRONT; LEAF, GAP, LEAF | owner 24.10 19:34; CONFIRMED |
| Default handle on the sheet | a knob of 30 when none chosen; 'none' draws nothing | owner 24.10 "nie widac handles"; the knob PROPOSED |
| Plinth on the plan | one dashed line on PLINTH_HIDDEN, grey, FINE | owner 24.10 "jedna linia przerywana"; CONFIRMED |
| Regex {7} | {7,} | audit 24.10 and 25.10; CONFIRMED by the red on main |
