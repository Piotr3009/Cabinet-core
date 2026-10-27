# CLAUDE.md, TURN 84 · STUDIO PRO, STAGE 1: THE SHELL, THE QUICK CARDS, THE PINNED PANEL, THE ERRORS YOU CAN SEE

Run autonomously. Zero questions, zero stops: every decision below is the
owner's own (27.10.2026, 16:01 to 22:25, over the designer's two HTML
handoffs in `verify/t84/astra/`, the before-and-after sheet
`verify/t84/studio-dzis-vs-etap1.png`, the census of main taken at 22:23
and his answers in chat; his words are quoted where they decide), or the
designer's (Astra, the owner's second AI, whose contract the owner adopted
at 16:27), so nothing here is asked again. Where a number is marked
PROPOSED it is the designer's or the turn's best reading and is used as
written: the owner confirms or changes it after the merge, never during
the run. If a point cannot be done, skip it WHOLE, write why in the PR,
and go on to the next. Full suite, never `--silent`. Frames under
`verify/t84/`. Branch `claude/t84-studio-stage1`, one commit per F, PR at
the end; the owner merges. Nothing lands in Petros from this session.

THIS TURN TOUCHES NO ENGINE FILE. It is a shell over the PRO app: new
components, one host adaptation of the right panel, the header and the
scene toolbar re-homed, every function kept. The owner, 22:19: *"wiem ze
silnik jako tako nie ruszamy ale funkcje w menu musza sie zachowac
wszystkie"*; 22:13: *"czy zadna funkcja nam nie zginie? np corners etc"*.
The answer is THE CENSUS at the end of this file and the parity gate of
F7: not one of the 91 controls, 51 library types, 26 windows or the
panel's rows may be missing when the night ends.

## THE COST OF THE NIGHT (the law of T83, kept)
TEN agents and one integrator, never twenty. NO review wave: a slice is
reviewed ONCE by INT when its patch lands; the morning audit is the
owner's. Targeted tests while writing; the full suite ONCE per PART when
it lands and ONCE at the end. Every agent reads this file and its PART,
never the whole repo: INT hands each agent the files it OWNS and the ones
it must read. A report is twenty lines, the six stations of DONE. Agents
and parallel mode ON (Opus 5.5, ultracode).

## THE AGENTS (10 slices and one integrator)
| Agent | Slice | OWNS (writes) | Hands patches to |
| - | - | - | - |
| INT | the only writer of `src/App.jsx`, `components/RightPanel.jsx`, `components/TopBar.jsx`, `components/CanvasToolbar.jsx`, `stores/uiStore.js`, `engine/profile.js` (the `ui.studio` block only); applies patches in F order; the EXEMPT rows and the re-freeze; NEW_FILES; the full suite once per PART and at the end; classifier, copy check, census, walk; the PR | the six central files, `scripts/t78-classify.d/f45-t84-*.mjs`, the freeze test | nobody |
| P1 | the PROBES of the first hour, committed as tables before any Studio line: (a) THE CENSUS of main by script, (b) the Escape map, (c) the right panel's host, (d) the registry diff against the designer's snapshot | `scripts/t84-census.mjs`, `verify/t84/census-main.json`, `verify/t84/p1-census.md`, `p1-escape.md`, `p1-host.md`, `p1-registry.md` | nobody |
| D1 | F1: the skin: the Studio stylesheet and icons from the designer's Stage-1 (tokens, 13 / 30 / 32 / 4, the dark shell), compared with the HTML at the three sizes; reads the setup workspace of 26.10 for the same tokens, writes nothing in it | `components/studio/studio.css`, `components/studio/StudioIcons.jsx`, `verify/t84/f01-skin-*.png` | S1 |
| S1 | F2: the shell: `StudioShell`, `StudioRail`, `SelectionBreadcrumb`, `StatusBar`, the top bar re-homed (the legacy menus mounted whole, Undo / Redo, Save, BOM, Account, the project name), Design / CNC at the rail's foot, the mount in `App.jsx` through INT | `components/studio/StudioShell.jsx`, `StudioRail.jsx`, `SelectionBreadcrumb.jsx`, `StatusBar.jsx`, `test/turn84-f02-shell.test.js` | INT (App.jsx, TopBar.jsx) |
| S2 | F3: the quick cards: `QuickSelectionCard` with the seven typed cards and the generic card for every other type, the capability guards, the summary rows, Open cabinet / Full settings | `components/studio/QuickSelectionCard.jsx`, `components/studio/cards/*.jsx`, `lib/studioCards.js` (the capability table), `test/turn84-f03-cards.test.js` | INT (uiStore: `inspector` state) |
| S3 | F4: the inspector host: the existing RightPanel and MultiUnitPanel embedded, one header, Pin that follows the selection, the pending edit committed to its original id first, the empty, multi and CNC states | `components/studio/InspectorHost.jsx`, `test/turn84-f04-inspector.test.js`; the host adaptation of RightPanel.jsx (`layout="embedded"`, `headerActions`) as ONE patch to INT | INT (RightPanel.jsx, MultiUnitPanel.jsx through the copy rule) |
| S4 | F5: the errors you can see: the marker beside the unit number in the scene, the issue strip in the card with Show, the counters on the status bar opening the filtered Check, the field refused in red with its reason | `components/studio/UnitIssueMarker.jsx`, `components/studio/IssueStrip.jsx`, `components/studio/RefusedField.jsx`, `lib/studioIssues.js`, `test/turn84-f05-issues.test.js` | S1 (status bar), S2 (the card), INT (the scene's one mount point in `3d/UnitView.jsx` or `3d/Scene.jsx`: INT applies it) |
| S5 | F6: the scene's edge: the four toggles, View ▾ with the other ten, the camera bar (Plan, Iso, A, B, C, D, Frame selection) through the room's camera | `components/studio/SceneToggles.jsx`, `components/studio/SceneViewMenu.jsx`, `components/studio/CameraBar.jsx`, `lib/cameraPresets.js`, `test/turn84-f06-scene.test.js` | INT (CanvasToolbar.jsx, the camera handle if a line is needed in `3d/`) |
| S6 | F7: Add, Room, Materials and Check on the rail; Output and Drawings… as a preview; the Escape ownership; the PARITY TEST and the census on the branch | `components/studio/RailMenus.jsx`, `lib/studioEscape.js`, `test/turn84-f07-parity.test.js`, `test/turn84-f07-escape.test.js` | INT (uiStore) |
| S7 | the licences: every PRO file edited named in EXEMPT with the owner's words from this file; the retail copy check; NEW_FILES; the Skylon header on every new file; the classifier fragments naming NO engine file | `test/turn59-f1-the-switch.test.js` (the EXEMPT rows, through INT), `test/turn77-f5-no-copyright-line.test.js` NEW_FILES, `scripts/t78-classify.d/f45-t84-f*.mjs` | INT |
| F1 | F8: the walk, real mouse, at 1280 x 800, 1440 x 900 and 1920 x 1080 | `scripts/t84-walk.mjs`, `verify/t84/walk.txt`, `verify/t84/f08-*.png` | nobody |

## THE ORDER
The owner, 27.10.2026, in his words where they decide:
- 16:15, the whole of it: *"nie chodzilo mi o calkowite zmiany w cabinet
  core, calkowite zmiany od Astry, przeczytaj ... pomysl i daj znac co
  myslisz"*; the designer's transcript (`verify/t84/astra/transcript.txt`)
  carries the owner's own line to her: *"skupiamy sie teraz wylacznie na
  PRO. PRO i Retail maja osobne interfejsy. Dla PRO wybieramy Studio"*,
  and *"w menu jest kilka funkcji ktore sa zupelnie nie potrzebne ... jak
  naprzyklad advance setup ktore moga byc pomijane ok? ale musimy
  przegadac jeden po drugim"* (so NOTHING moves to an Advanced setup this
  turn: it is discussed one function at a time, later).
- 16:27, his five answers: Petros written; the Stage-1 attached; *"ty"*,
  the spec is this chat's; *"nie, juz jest przy wyborze"* (NO Studio
  switch in the UI: PRO is chosen at the start, Studio is PRO's face);
  *"tak"* to the header's Export renamed BOM; and the two asks that shape
  F5: *"chcialbym jako uzytkownik widziec jakie beda zmiany"* and
  *"napewno naprzyklad wszystkie bledy zolte i czerwone sa totalnie
  niewidoczne, mala czcionka etc"*.
- 17:01, the designer's eight answers to the chat's eight questions,
  adopted whole (`verify/t84/astra/transcript.txt`, the last message):
  the errors in three places with 13 px text on a coloured ground; Undo,
  Redo, Changes and CNC back; the four toggles X-ray, Hide fronts,
  Outlines, Open all / Close all (PROPOSED, her set); the camera bar Plan /
  Iso / A / B / C / D / Frame selection; the door window beside the part,
  sticky, the Escape exception kept (PROPOSED: her recommendation; the
  dock-left variant stays available by the profile); the refusal shown at
  the field with the engine's exact reason; Materials with Stock and the
  Joinery Core hand-over PREVIEW (the preview is NOT this turn: Materials
  opens the four existing windows only); Studio as PRO's interface with no
  switch; the local demo kept.
- 22:11 to 22:25: *"czy juz samo kodujemy?"*, *"ok jak juz bedziesz
  wiedzial dokladnie to tabela porownaj ze mamy wszystko nic nie
  zgubilismy, teraz daj do tury"*, *"zipa"*. THE CENSUS below is that
  table, counted on main 9a441f13 at 22:23, and F7 is the test that
  compares it.

## THE DESIGNER'S CONTRACT (adopted; `verify/t84/astra/`)
`Cabinet-Core-PRO-Studio-Stage-1.html` is the shell (the layout, the
rail, the card, the pinned panel, the status bar, the part window beside
the part, the Prototype fixtures: `?type=base|wall|wardrobe|vanity|mirror|
hawa|panel&inspector=full&pin=1`). `Cabinet-Core-PRO-T84-Cards-and-Menu.
html` is the contract: the seven cards row by row with the TARGET ACTION,
the value read and the guard of each; the capability table per type; the
48 menu leaves, 14 scene controls, 7 header controls and 65 library leaves
of her snapshot with their actual handler and their Studio destination;
the layout evidence (RightPanel at 316 and 360 px without overflow); the
Escape order. Where the contract names a line of code it names the
designer's snapshot of T83's day: P1's registry diff (p1-registry.md)
says what moved since (on main: Measure EXISTS on the toolbar, the mirror
door widths hold the typed one, the setup workspace of 26.10 exists); the
branch follows main, never the snapshot. Her words that are law here:
"Hide inapplicable rows; never invent a capability to fill the card";
"DoorModal is a leaf editor, it does not configure cabinet door count";
"Pin keeps inspector open and FOLLOWING SELECTION; it never locks unit
ID"; "Nothing is removed, renamed Advanced or made optional in this
stage"; "No new dependencies, no engine rewrite, no menu deletions".

## LAWS
Every law of T75 to T83 holds in full: the fossil six untouchable, a bare
`computeCabinet()` byte for byte its LISP; diagnose before you cut (P1's
four tables come first); test the way the client clicks; one law one path;
1:1 = COPY (the retail copies untouched, `t78-copy --check` CLEAN); numbers
in the profile; no em or en dash; the Skylon header on every new file;
nothing invented; the room refuses in words. Four laws are this turn's
own:
1. **ZERO KASOWANIA.** Every control of THE CENSUS stays, by label and by
   the SAME handler (the same function reference or the same store action
   name). Studio adds a second road to a function; it never closes the
   first. The legacy menus stay mounted whole (File / View / Library /
   Settings / Database / Spraying / Lighting / Output) with every leaf and
   every guard they have today.
2. **ONE PANEL, ONE HEADER.** The full panel IS `RightPanel.jsx` embedded,
   every row, every section, the UnitNameField; no second header over it,
   no row hidden by CSS, no DOM query that hides children. Grouping its
   rows is NOT this turn.
3. **THE CARD NEVER LIES.** A quick card shows only what the type supports
   (`type.supports.*`, `takesPlinth`, `liftTakesKit`, the corner's Arm A /
   Arm B); a field the type does not have is absent, never disabled as a
   promise. Every card row commits through the existing setter with the
   existing refusal (`roomFitRefusalFor` first), and surfaces the notice
   it returns.
4. **BESIDE THE OBJECT, STILL.** Part windows (door, drawer, shelf, hinge,
   notch, rail...) keep their own openers, anchors, drag and z-order; the
   shell owns layout and selection display, never a part. The door
   window's conduct is the profile's: `ui.studio.doorWindow` = 'beside'
   (PROPOSED, the designer's recommendation) or 'dock-left' (today's T37
   exception); in BOTH it is sticky, follows the clicked leaf, and never
   stands over the door it is about.

## FROZEN
1. EVERY engine file: `src/engine/**` untouched but for `profile.js`'s new
   `ui.studio` block (INT, one patch, numbers only). The classifier strict
   with `f45-t84-f*.mjs` names NO engine or lib delta; the six base
   goldens IDENTICAL; T75, T78, T80 to T83 goldens IDENTICAL; REPINNED
   empty.
2. The CNC export, the DXF, the drawings module, the cut list, the BOM
   maths: untouched. `lib/outputMenu.js` and `lib/topMenu.js` are READ
   (the Output entries and their enablement come from them), not edited.
3. The room (`3d/*`): ONE mount point for the unit issue marker (S4's
   component, applied by INT) and, only if the camera bar needs it, one
   exported function on the existing camera handle. Lighting untouched,
   the gloss ride untouched, FROZEN 4 of T80 untouched: Brightness,
   Realistic lighting and Turn on the light stay three controls.
4. PRO freeze: every PRO file edited is licensed in EXEMPT with the
   owner's words from this file and re-frozen in the same commit. The
   retail copies (`src/retail/**`, and the PRO files the copy rule names:
   Modal, RoomModal, WallElevationModal, SetupArt, ElementProperties,
   AddItems, PartDetailModal, RailModal, UnitSizeModal,
   FrontDecorationControls) are NOT edited: `scripts/t78-copy.mjs --check`
   stays CLEAN. `NumberField.jsx` is not edited: the refused field (F5) is
   a wrapper round it.
5. The setup workspace of 26.10 (`NewProjectFlow.jsx`, `SetupArt.jsx`,
   `setup-workspace.css`, the owner's CSS of 27.10): untouched. D1 reads
   its tokens.
6. `ContextMenu.jsx`, `lib/contextActions.js` (the 22 right-click
   actions), the 26 modal kinds and their openers: untouched.
7. The suite is green at the start (the count on main at the start of the
   run, written in the PR) and at the end, plus this turn's tests.
8. The designer's files under `verify/t84/astra/` are hers, as received
   (her HTML and her transcript carry her own punctuation); nothing this
   turn WRITES carries an em or en dash, and no gate scans her files.

## PART P · THE PROBES (P1, the first hour, before any Studio line)
- (a) THE CENSUS of main: `scripts/t84-census.mjs` drives the BUILT app
  (the CDP harness of `scripts/cdp.mjs`, as `t83-walk.mjs` does) and
  writes `verify/t84/census-main.json`: the menu leaves of every top menu
  by label and by the handler's name (`run.name` or the store action it
  calls, read from the `menus` array of TopBar.jsx and `buildOutputMenu` /
  `buildDatabaseMenu`); the 14 toolbar buttons by label; the 7 header
  controls; the 22 context actions by id (`lib/contextActions.js`); the
  26 modal kinds (`openModal('x')` in src); the library types per category
  (`UNIT_CATEGORIES`); and, for the thirteen default units below placed
  on wall A at x 1200 and selected, with every panel section opened by
  `setPanelSection(id, true)` for `carcass, add, contents, construction,
  doors, vanity, mirror`, the count of VISIBLE controls (`button, input,
  select, textarea` with `offsetParent !== null`) inside the right panel
  and per section. The numbers of THE CENSUS below were taken this way on
  main 9a441f13 at 22:23; the probe re-takes them on the branch's base
  commit and they must agree, or the probe says why (a count that moved
  on main since 22:23 is written down, not argued with).
- (b) THE ESCAPE MAP: every `keydown` listener that reads Escape in `src`
  (file, line, what it closes or cancels, the order they fire in today),
  the door window's T37 exception (`DoorModal.jsx` lines 158 to 177:
  dock left, sticky, `escapeCloses` false), the Modal's own handling, the
  text edit of the project name, `selectedElement` and `selectedUnitId`.
  Written as the order F7 must keep: focused edit or local operation
  first, then the topmost submenu or popup, then a closable window, then
  a scene operation, then the part selection, then the cabinet selection;
  one key event, one action; never unpin.
- (c) THE HOST: `RightPanel.jsx` renders `<aside className="absolute
  right-0 top-0 bottom-0 w-[310px] ...">` (lines 257 and 268 on main) and
  lays itself over the canvas; the probe lists every place that assumes
  it (the canvas width, `LAYER_CLASS.panel`, the brightness slider, the
  library's placement in `lib/menuPlacement.js`, the modal anchors) and
  writes the smallest licensed change that lets a host give it a width
  and a header (`layout="embedded"`, `headerActions`), with the duplicate
  inline ElementSection of the Studio inspector named (the designer:
  "Suppress only the duplicate inline ElementSection in the Studio
  inspector; the existing part editor remains independent").
- (d) THE REGISTRY DIFF: the designer's inventory (48 / 14 / 7 / 65 and
  the capability table) against main: what is the same, what moved
  (Measure exists; the mirror cabinet's door widths hold the typed one,
  26.10; the Database menu's Clients and Projects are "coming"), what the
  branch follows. One table, no prose.

## PART A · THE SKIN AND THE SHELL (F1, F2)
### F1 · THE SKIN (D1)
- `components/studio/studio.css`: the designer's compiled tokens from
  Stage-1 (`shell-900/800/700/600`, `ink-50/100/200/400`, `gold`,
  `gold-hover`, `gold-dark`, `warn`, `danger`, `ok`), the scale 13 px text,
  30 px fields, 32 px buttons, 4 px radius, the rail, the context strip,
  the inspector, the status bar, the popup, the floating window, the toast
  (every number in `profile.ui.studio` and read from there into CSS
  variables at mount, not typed twice). Scoped under `.studio-pro`; the
  classes `cc-btn`, `cc-input`, `cc-label`, `cc-frame` keep their meaning.
  `StudioIcons.jsx`: the Stage-1 SVG symbols as one sprite component.
- Proof: `verify/t84/f01-skin-1440.png`, `-1920.png`, `-1280.png` beside
  the designer's HTML at the same sizes (`verify/t84/astra/stage1-*.png`
  are the chat's own frames of her file); the report names every
  deviation in px.

### F2 · THE SHELL (S1)
- `App.jsx` (INT): when the entry is `factory` (PRO, `lib/appEntry.js`)
  and `profile.ui.studio.enabled` is true (PROPOSED true: the owner,
  *"nie, juz jest przy wyborze"*, no switch in the UI; the flag exists for
  the walk and the tests to run both faces and for the owner to turn the
  face back by the profile, never by a button), the editor renders inside
  `StudioShell`. The retail entry never mounts it.
- `StudioShell`: the grid of Stage-1 (top bar 48, context strip 34, the
  workspace `rail | scene | inspector`, status bar 30). The scene slot
  receives the EXISTING canvas and its overlays; nothing in `3d/` learns
  the shell exists.
- The top bar: the wordmark (leaveProject, the unsaved warning kept), the
  PRO label, the project name with its rename (Enter / Escape / blur end
  the edit first, the Escape map), the legacy `MenuBar` with
  `orderMenus(menus)` WHOLE (every leaf of THE CENSUS, same `run`, same
  `disabled`, same `checked`), then Undo and Redo (useHistoryStore, the
  same depth guards as the toolbar's), Save with its three states,
  Brightness (the same slider, the same state), Account, and **BOM** (the
  gold button that today says Export and calls `setBomOpen(!bomOpen)`:
  the owner, *"tak"*, renamed, same call). The MockModeBadge moves to the
  status bar.
- `StudioRail`: Select (closes the library, keeps the selection, clears
  the insertion through the existing API), Add (opens the EXISTING
  LibraryPanel beside the button, 8 px off its right edge, clamped to the
  screen; the categories from `UNIT_CATEGORIES` including Saved sets and
  Sets; the insertion context of the scene's "+" kept), Room
  (`openModal('room', { anchor })`), Materials (a popup of the four
  existing windows: Selected finishes `unit-finish` for the selected ids,
  Project finishes `design`, Assign materials `assign-materials`, Stock
  `warehouse`), a separator, Check (`toggleCheck`, the badge
  `findingsToAct(checkFindings).length`, red when a red finding is in
  it). The foot: Design (`setViewMode('3d')`) and CNC (`setViewMode
  ('cnc')`), the same guards as the toolbar's two buttons. The rail is 112
  wide with labels at 1440 and up, 56 icon-only below (PROPOSED).
- `SelectionBreadcrumb`: room name, wall or island, the unit number in
  bold; "1 cabinet selected" / "2 cabinets selected" / "Nothing
  selected"; the panel-show button when the inspector is hidden.
- `StatusBar`: the selection in words, MockModeBadge, the dirty marker,
  the Changes drawer (today's bottom-left `Changes · N` control, the same
  component, re-homed), the issue counters of F5, the viewport size.
- Tests `test/turn84-f02-shell.test.js`: the shell mounts only on the
  factory entry; the legacy `menus` array is rendered through the same
  `MenuBar` with the same length as TopBar's (read from source: the test
  imports nothing from React); the BOM button calls `setBomOpen`; Undo and
  Redo are the history store's; the MockModeBadge is in the status bar
  and nowhere else.

## PART B · THE INSPECTOR (F3, F4)
### F3 · THE QUICK CARDS (S2)
- `lib/studioCards.js`: the capability table of the contract, read from
  `engine/types.js` at run time, never typed: `supports.doors`,
  `supports.drawers`, `mount`, `corner`, `takesPlinth(type, profile)`,
  `liftTakesKit(type)`, the special builders (VANITY*: `setVanityDrawers`,
  `updateUnitParams({ sinks })`, `setVanityFloating`; MIRROR_CABINET:
  `setMirrorCabinet`, the bays warning "Changing bays resets door widths
  to the kit defaults" kept, the typed widths of 26.10 held; HAWA_POCKET:
  `setPocket`, `setPocketCovers`, the size derived; FREE_PANEL:
  `freePanelOf` / `freePanelPatch`, the board's own length, width and
  thickness, never its rotated box).
- The seven cards, six rows at most, in the contract's order:
  Base: Width · Height · Depth · Doors (summary `2 doors · L / R ›` to
  `openRightPanel(); setPanelSection('doors', true)`) · Drawers (summary
  to `setPanelSection('contents', true)`) · Plinth (Add / Remove, the
  height derived). BUD hides Drawers, BUDR hides Doors, BUD_INT shows
  both. Wall: Width · Height · Depth · Mount height · Doors · Front
  opening (only `liftTakesKit && derived.doors > 0`). Wardrobe: Width ·
  Height · Depth · Front type · Finish · Bays (`bayWidthsOf`, read-only,
  to the contents section). Vanity: Width · Height · Depth · Drawers
  (2 / 3 / 4) · Sinks (0 / 1 / 2) · Mounting. Mirror cabinet: Width ·
  Height · Depth · Mount height · Bays (1 / 2 / 3) · Recess. HAWA pocket:
  Doors (1 / 2) · Hand · Opening · Covered cabinets · Hardware class ·
  Calculated size (read-only). Free panel: Length · Width · Thickness ·
  Facing · Tilt · Height above floor.
- THE GENERIC CARD for every other type (corners L, blind, carousel, hoods,
  appliances, sink, pantry, tall, low, desk, chests, wine, bin, cargo,
  twin...): Width · Height · Depth (Arm A · Height · Arm B for a corner
  type) · Front type (where `supports.doors` or `supports.drawers`) ·
  Finish · Plinth (where `takesPlinth` and `mount === 'floor'`); a row
  without a setter is absent. The card's title is the type's library row
  name and the unit number; the thumb its library icon.
- Every dimension row: the wrapper of F5 round `NumberField`, committing
  `roomFitRefusalFor(unit.id, { key: v })` then `updateUnitParams`, the
  notice surfaced; Height keeps the project default / custom status and
  `resetUnitHeight`. Finish: `openModal('unit-finish', { unitIds, anchor
  })`. Front type: `frontStyleSelection` + `updateUnitParams({ front_type,
  front_decoration })`, never `front_type` alone.
- Under the rows: "Height follows project default" when it does; the
  type's note; the issue strip of F5; then **Open cabinet** (gold,
  `openModal('cabinet', { unitId, anchor })`) and **Full settings** (the
  inspector to `full`).
- Tests `test/turn84-f03-cards.test.js`: every type in `UNIT_TYPES` yields
  a card of at most six rows; a BUD card has no Drawers row and a BUDR no
  Doors row; a corner's first and third rows read Arm A and Arm B; every
  row's action is one of the store's own names (a list in the test, no
  new setter); a type with no plinth has no Plinth row; the seven typed
  cards match the contract row for row.

### F4 · THE INSPECTOR HOST (S3)
- `InspectorHost`: `quick` (the card, 344 px, 316 below 1440), `full`
  (RightPanel embedded, 400 px, 360 below 1500), `none` (hidden, the
  breadcrumb's button brings it back). The widths PROPOSED, in
  `profile.ui.studio.inspector`.
- RightPanel.jsx (INT, P1's host table): `layout="embedded"` makes the
  panel fill its host instead of positioning itself; `headerActions`
  renders Pin and "back to quick settings" INSIDE its existing header
  beside UnitNameField; every branch (unit, empty, CNC, MultiUnitPanel)
  honours both. No second header. The duplicate inline ElementSection is
  suppressed in the embedded layout ONLY (the part editors stay).
- Pin: the inspector stays `full` and FOLLOWS the selection: another
  cabinet, its rows, the open sections kept per type and the scroll kept;
  several cabinets, MultiUnitPanel; none, "Select a cabinet or part";
  a part clicked, the part's own window opens as today and the panel
  shows the part's parent; a part of another cabinet, the panel switches
  to that parent. Pin never freezes an id. Before the selection changes,
  a pending valid edit is committed to its ORIGINAL unit id; an invalid
  one blocks the switch with its refusal visible; Escape cancels it.
- Tests `test/turn84-f04-inspector.test.js`: RightPanel's source has the
  `layout` and `headerActions` props on every branch; the embedded
  layout has no `absolute right-0`; the pin's reducer follows the
  selection and never stores an id; the commit-before-switch in the
  store.

## PART C · THE ERRORS YOU CAN SEE (F5, S4)
The owner: *"wszystkie bledy zolte i czerwone sa totalnie niewidoczne,
mala czcionka"*. Today a finding lives only in the Check panel: 11 px
uppercase titles, gold on dark, no mark on the cabinet, the count hidden
at the toolbar's end. From tonight a finding is in three places at once,
13 px, dark text on the warn or danger ground:
- THE MARKER: `UnitIssueMarker`, one per unit with findings, beside the
  unit number in the scene (the same anchor the number uses), a red
  triangle for a red finding, a yellow one for yellow only, with the
  count; click = select the unit and open its card with the strip. One
  mount point in `3d/` (INT applies). `lib/studioIssues.js` groups
  `checkFindings` by `unitId` and `level` (`red`, `yellow`; `note`
  ignored), by the engine's own `findingsToAct`.
- THE STRIP: `IssueStrip` in the quick card and over the full panel's
  rows: "#48 · the bowl enters a board" in the finding's own words
  (`message`), its level colour, and **Show**: the camera frames the unit
  (the camera bar's Frame selection) and, for a panel finding, selects
  the part (`subject`). Several findings stack, the red first.
- THE COUNTERS: on the status bar, `1 red · 3 yellow` in their colours;
  click opens Check filtered to that level (a `checkFilter` in uiStore,
  'all' | 'red' | 'yellow'; the Check panel reads it and shows "Show all").
- THE REFUSED FIELD: `RefusedField` wraps `NumberField` in the cards (and
  nowhere else this turn): when the setter returns a refusal
  (`roomFitRefusalFor`'s notice, the leaf count's, the pocket's `said`),
  the field turns red with the reason under it in 13 px, the typed value
  stays unapplied, Escape restores the last applied one; a refused change
  never enters the history. The reason is the engine's exact sentence,
  never a Studio paraphrase.
- Tests `test/turn84-f05-issues.test.js`: the grouping by unit and level
  from a fixture of findings (red, yellow, note), the note dropped; the
  marker's colour law; the counters' text; the refused field keeps the
  old value and shows the reason; the Check filter reducer.

## PART D · THE SCENE'S EDGE (F6, S5)
- `SceneToggles`: four at the scene's top edge: X-ray, Hide fronts,
  Outlines, Open all / Close all (PROPOSED, the designer's set; the owner
  may swap one by the profile list `profile.ui.studio.sceneToggles`), each
  with its title and its pressed state, the SAME handlers and the SAME
  guards as CanvasToolbar's (`viewMode !== '3d' || contourView` where it
  is so today; the TopBar / CanvasToolbar guard differences P1 names are
  kept as they are, never silently widened).
- `SceneViewMenu`: View ▾ at the scene's top right with the other scene
  controls: Dimensions, Front dimensions, Dimension colour (from
  `profile.dimensions.colours`), Props (with its disabled reason from
  `propsReason`), Measure, Contour view, Brightness, Realistic lighting,
  Turn on the light. Of today's 14 toolbar controls the rest live
  elsewhere by F2: Undo / Redo in the top bar, BOM on the top bar and in
  Output, Check on the rail, 3D / CNC at the rail's foot. CanvasToolbar.
  jsx stays in the tree for the retail entry and for `profile.ui.studio.
  enabled === false`; under Studio it is not rendered (INT, one guard).
- `CameraBar` at the scene's foot: Plan, Iso, A, B, C, D, Frame selection,
  beside 3D | Drawings…. Through the room's camera and controls (the
  registered handle of `3d/viewHandle.js`, the one the walk reads as
  `window.__cc.views.room`; the component uses the same registration
  through a small exported `lib/cameraPresets.js`: the wall's facing
  direction from `project.room` and the wall index, the plan from above
  at the room's centre, the iso from the first run's corner, Frame
  selection fits the selected units' boxes with 10 % margin, PROPOSED).
  Drawings… is `openModal('drawing', { kind: 'walls', anchor })`, the
  PREVIEW, never the direct export.
- Tests `test/turn84-f06-scene.test.js`: the four toggles call the four
  toolbar handlers by name; the View menu lists exactly the nine; the
  camera presets compute the six directions from a fixture room and
  Frame selection from two boxes.

## PART E · THE RAIL'S MENUS, ESCAPE, THE PARITY GATE (F7, S6, S7)
- `RailMenus`: the Materials popup and the Output popup (built from
  `buildOutputMenu` with the existing handlers: the 14 leaves, same
  enablement), the Library placement beside Add.
- `lib/studioEscape.js`: one keydown owner for the shell: P1's order,
  one event one action, the door window's conduct by the profile, never
  unpin; the existing listeners keep their own windows (the shell does
  not re-implement the Modal's Escape, it yields to it: a handled event
  does not also clear the selection under it).
- THE PARITY TEST `test/turn84-f07-parity.test.js` (S6 with S7): reads
  `verify/t84/census-main.json` and the SOURCE of the Studio components
  and asserts: every menu leaf of the census is rendered by the shell's
  MenuBar with the same label and handler name (the `menus` array is one
  module, `lib/studioMenus.js` or TopBar's own, imported by both faces);
  every toolbar control of the census has a Studio home (a table in the
  test: label, today's handler, the Studio component); every header
  control; the 22 context actions untouched (the file's hash); the 26
  modal kinds still opened by name somewhere in `src`; the library
  categories and type counts equal. THE LIVE CENSUS `scripts/t84-census.
  mjs --studio` re-takes the thirteen panel counts on the branch with the
  embedded panel and `--legacy` with the profile flag off; both must
  equal `census-main.json` (the embedded panel shows every control it
  showed on main, counted the same way, with the same sections open). A
  difference is RED, named in the PR with the row that moved.
- S7: every PRO file edited is in EXEMPT with the owner's words from THE
  ORDER and re-frozen in the same commit; NEW_FILES lists every new file;
  every new file carries the Skylon header; no em or en dash; the
  fragments `f45-t84-f*.mjs` name NO engine or lib file (the classifier's
  table shows the engine/lib deltas at zero).

## PART F · THE WALK (F8, F1)
- `scripts/t84-walk.mjs`, real mouse, the built app, ledger
  `verify/t84/walk.txt`, frames `verify/t84/f08-*.png`, at 1280 x 800,
  1440 x 900 and 1920 x 1080: (1) the T81 kitchen loaded (`scripts/t81-
  kitchen.mjs`), the shell up, every legacy menu opened and its leaves
  counted against the census; (2) a BUD clicked: the quick card, Width
  typed 920 refused in red with the engine's words, 760 applied, Undo,
  Redo; Doors › to the panel's doors section; Full settings, Pin, another
  cabinet clicked and the panel following, a part double-clicked and the
  part window beside it (and the door window by the profile's conduct);
  (3) a finding made (a basin that enters a board, as T83's walk did):
  the marker on the unit, the strip in the card, Show framing the unit,
  the counter on the status bar opening the filtered Check; (4) the four
  toggles and View ▾, the camera bar A to D, Plan, Iso, Frame selection;
  (5) Add beside the rail and a corner L added from the library, its
  generic card with Arm A / Arm B; a mirror cabinet's card with its bays
  warning; (6) Materials, Output, Drawings… preview; BOM in the top bar;
  (7) Escape, one level at a time, from a field edit to the cabinet
  selection; (8) the 1280 layout without horizontal scroll in the panel.
  Every frame compared with the designer's HTML at the same size in the
  ledger (what differs, in px, and why).

## NOT THIS TURN
- Groups, tabs or search in the full panel (T85, after a week of use).
- The part windows in the Studio skin (the door first; the inventory is
  in `verify/t84/DoorModal-inventory.md` for the designer).
- Advanced setup, any move of a function out of a menu (one at a time,
  with the owner, later).
- New keyboard shortcuts (S / A / R / M / C), a live 2D plan or elevation
  view, a right-click menu redesign, tooltips on hover.
- Materials: the Stock as Joinery Core's warehouse and "Send to Joinery
  Core" (the JC turn; Materials opens the four existing windows only).
- The setup workspace's alignment with the skin (the designer gets the
  frames `verify/t84/kreator-2610-arkusz.png`; T85).
- The corner L's TOP-L drawing frame (the probe of 27.10, a chat fix).

## LINEAGE (one line a test reads from this file)
T79's horizontal notch stays as built and its owner's words stay here
because `test/turn79-f05-edge-notch.test.js` reads them from CLAUDE.md:
*"cut the corner działa idealnie, ale możesz zrobić mi też poziome cut?
wszystkich 4 rogów?"* (18.10.2026). T83 (merged as PR #82 on 26.10.2026)
and the chat fixes of 26.10 (the mirror door widths, the setup workspace)
and 27.10 (the setup CSS) are the base of this turn; their numbers hold
untouched.

## TESTS AND PROOF
Full suite once per PART and at the end; the classifier strict with
`f45-t84-f*.mjs` showing zero engine and lib deltas and REPINNED empty;
the six base goldens IDENTICAL (`scripts/t64-classify.mjs --dump` vs
`verify/t70/goldens-base.json`); `t75-goldens --check`, `t78-goldens
--check`; `t78-copy --check` CLEAN; `t84-census.mjs --studio` and
`--legacy` equal to `census-main.json`; `t84-walk.mjs` at three sizes;
NEW_FILES; the Skylon header; no em or en dash; every F the six stations
of DONE in twenty lines.

## PR BODY
P1's four tables; files and lines per F; the EXEMPT entries; the census
before (main) and after (branch) side by side, every row equal or the
difference named; the test count before and after; the walk result at
three sizes; DECISIONS TAKEN; SKIPPED AND WHY; RED AT THE END; THE
NUMBERS below.

## THE NUMBERS (all in `profile.ui.studio`; none typed in the UI without the owner)
| Number | Value | Source |
| - | - | - |
| Studio on for PRO | `enabled: true`, no UI switch | owner 16:27 "nie, juz jest przy wyborze"; CONFIRMED |
| Scale | text 13, field 30, button 32, radius 4 | owner 27.10 (the setup CSS); CONFIRMED |
| Bars | top 48, context 34, status 30 | the designer's Stage-1; PROPOSED |
| Rail | 112 with labels at 1440 and up, 56 icons below | Stage-1 and her 1280 note; PROPOSED |
| Quick card | 344, 316 below 1440 | the designer; PROPOSED |
| Full panel | 400, 360 below 1500 | the designer, measured without overflow; PROPOSED |
| Minimum screen | 1280 x 800, no horizontal panel scroll | the designer; PROPOSED |
| Scene toggles | X-ray, Hide fronts, Outlines, Open all / Close all | the designer 17:01; PROPOSED |
| Door window | 'beside' (sticky, follows the leaf, Escape as today); 'dock-left' kept | the designer's recommendation; PROPOSED |
| Issue colours | warn #d9a441, danger #c9524b, text 13 px dark on the ground | the designer's palette; PROPOSED |
| Marker | a triangle beside the unit number, 16 px, with the count | this turn; PROPOSED |
| Frame selection margin | 10 % | this turn; PROPOSED |
| Library beside Add | 8 px off the button, clamped to the screen | the designer; PROPOSED |
| Export button | renamed BOM, same call | owner 16:27 "tak"; CONFIRMED |
| Agents | 10 and INT, no review wave | T82's bill; CONFIRMED |

## THE CENSUS (main 9a441f13, 27.10.2026 22:23; the parity gate of F7)
The owner: *"przelicz ile teraz mamy funkcji w menu i ile bedzie pozniej
... nie pisz mi okolo tylko dokladnie"*. Counted from the source and from
the built app, not from memory. After this turn every number is the same
or larger; a smaller one is RED.
| Where | Count | The list |
| - | - | - |
| Top menu leaves | 48 | File 5 (New project…, Open…, Save, Save as…, Close project); View 13 (Outlines, Dimensions, Show front dimensions, Dimension colour › Navy, Red, 3D, CNC sheet, Brightness, Realistic lighting, Turn on the light, X-ray, Hide fronts, Contour view); Library 4 (Kitchen, Wardrobes, Saved sets, Sets); Settings 5 (Settings…, Room setup…, Snap › 0.5 mm, 1 mm, 32 mm system); Database 5 (Materials…, Assign materials…, Company defaults…, Clients… coming, Projects… coming); Spraying 1; Lighting 1; Output 14 (Render…, Drawings › Preview…, Unit card (PDF), Unit card (SVG), All units (PDF), Drawing set (PDF), Drawing set (DXF), CNC / DXF, Cutting list CSV, BOM PDF, Part labels · 21, Part labels · 44, Bill of materials…, Spraying…) |
| Scene toolbar | 14 | Undo, Redo, Show dimensions, Front dimensions, Outlines, X-ray, Props, Hide fronts, Measure, Open all / Close all, BOM, Check · N, 3D, CNC |
| Header | 7 | CABINET CORE (start), project name (rename), Save, MOCK DATA MODE, Bright, Account, Export (= BOM) |
| Right-click on a unit | 22 | Edit cabinet…, Edit drawer…, Rename, End panel L, End panel R, Top infill, Top cornice (the height ladder), Side infill, Pin infill L, Pin infill R, Bottom mask, Plinth, Upstand, Drawer fronts, Unit colour, Save as template, Center shelves, Rotate 90°, Back to wall, Side to wall, Close all fronts, Delete |
| Library types | 51 + sets | Kitchen 36, Wardrobes 15 (`UNIT_CATEGORIES`), Saved sets, Sets (the five shipped and the workshop's own) |
| Windows (modal kinds) | 26 | add-items, assign-materials, auth, cabinet, company-defaults, design, draw-room, drawing, edge-notch, element, front-gap, jpull-run, lighting, mirror-back, notch, part-detail, rail, render, room, save-as, save-template, spraying, unit-finish, unit-size, warehouse, watch-layout |
| Right panel, visible controls, every section open, the default unit | BUD 53 · BUDR 39 · WUD 58 · WARDROBE 53 · VANITY2 50 · MIRROR_CABINET 62 · CORNER_L_BASE 52 · HAWA_POCKET 45 · BLIND_BASE 53 · PANTRY 57 · BUD_INT 53 · WUD_HOOD 39 · FREE_PANEL 35 (649 in all) | by section on BUD: Carcass 18, Add items 17, Section 1 (contents) 1, Construction 12, Doors 2, plus the name field and the five section heads; MIRROR_CABINET's own section 29; VANITY2's 9; HAWA's Pocket door 9; FREE_PANEL's Attach 2 |
| Panel sources, control tags | 173 | RightPanel.jsx 108 (21 NumberField, 15 select, 66 button, 6 input), ElementProperties.jsx 49 (20, 7, 21, 1), MultiUnitPanel.jsx 16 (3, 1, 11, 1) |
In all: 91 controls outside the panels (48 + 14 + 7 + 22), 51 library
types and the sets, 26 windows, 649 visible panel controls over the
thirteen default units, 173 control tags in the panel sources. After T84:
the same 91 by label and handler, the same 51, the same 26, the same 649
in the embedded panel, the same 173 tags plus the host's two props; and
NEW: the rail (5 + 2), the breadcrumb, the status bar (counters, Changes,
badge), seven typed cards and the generic card, Pin, the marker, the
strip, the refused field, four toggles, View ▾, the camera bar (7), the
Materials popup (4), Drawings… preview.
