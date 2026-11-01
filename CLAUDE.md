# CLAUDE.md, TURN CC1b · THE FRAME, THE DRAWINGS, THE MATERIALS: CABINET CORE WEARS JOINERY CORE

Run autonomously. Zero questions, zero stops: every decision below is the
owner's own (31.10.2026, 23:00 to 01.11.2026, 01:40, in chat, over his
screenshot of `joinerycore.com/cabinet`; his words are quoted where they
decide), so nothing here is asked again. Where a number or a name is marked
PROPOSED it is the turn's best reading and is used as written; the owner
confirms or changes it after the merge, never during the run. If a point
cannot be done, skip it WHOLE, write why in the PR, and go on to the next.
Full suite, never `--silent`. Frames under `verify/t-cc1b/`. Branch
`claude/t-cc1b-the-frame`, cut from `origin/main` (the merge of PR #95), with
THIS file taken from `origin/chat/t-cc1b-spec`; one commit per F; PR against
main at the end; the owner merges. Nothing lands in Petros from this session.
The owner's name for this turn is "T-CC1b". It stands on T-CC1a (the door, the
list, the save: CC runs only behind a Joinery Core session), merged.

THE OWNER'S FRAME FOR THE NIGHT (01.11, 00:5x): *"to nie sa wielkie zmiany,
tylko wyglad menu, nie robimy 3d nie dodajemy mnostwa funkcji"*. This turn
moves doors and changes what the user SEES; it adds one connection (the stock
of Joinery Core), one card (the AI visualisation) and two rows in the library.
THE ENGINE'S GEOMETRY IS NOT TOUCHED: `src/engine/cabinet.js`, every kit,
every `cnc/*`, `machining.js`, `lifts.js`, `liftSystems.js` have no delta; the
six base goldens and every later golden are IDENTICAL by definition and the
checks run anyway. The three engine files this turn edits are DATA and BOOK
files, named in LICENSED: `src/engine/library.js` (rows), `src/engine/types.js`
(the categories list) and `src/engine/bom.js` (the hardware key the Assign
window reads). The list of Cabinet Core features stays CLOSED (30.10, 22:42).

## THE COST OF THE NIGHT
FIVE agents and one integrator, all five in parallel from the first minute,
never ten. One writer per file: a file is in exactly one OWNS cell below, and
every other agent that needs a line in it hands a patch to its owner (INT for
the five shared files). NO review wave: a slice is reviewed ONCE by INT when
its patch lands; the morning audit is the owner's. Targeted tests while
writing; the full suite ONCE per PART when it lands and ONCE at the end. Every
agent reads this file and its PART, never the whole repo: INT hands each agent
the files it OWNS and the ones it must read. A report is twenty lines, the six
stations of DONE. Agents and parallel mode ON.

## THE AGENTS (5 slices and one integrator)
| Agent | Slice | OWNS (writes) | Hands patches to |
| - | - | - | - |
| INT | the only writer of `src/components/TopBar.jsx`, `src/lib/topMenu.js`, `src/lib/outputMenu.js`, `src/pages/ConfiguratorPage.jsx`, `src/stores/projectStore.js`; applies patches in F order; the freeze test's EXEMPT rows, deletions and re-hashes; NEW_FILES; `scripts/t78-classify.d/f55-t-cc1b-f*.mjs`; the full suite once per PART and at the end; classifier strict, copy check, walk; the PR | the five files, the manifest, `test/turn59-f1-the-switch.test.js` | nobody |
| A1 | PART A, the frame: F1 the header; F2 one View; F3 the Database menu dies; F4 the Library on the rail, every family; F5 Output shrinks | `src/components/studio/studio.css`, `src/components/studio/StudioRail.jsx`, `src/components/studio/RailMenus.jsx`, `src/components/LibraryPanel.jsx`, `src/engine/library.js`, `src/engine/types.js` (UNIT_CATEGORIES only), `src/components/NewProjectFlow.jsx`, `src/components/StartScreen.jsx` (the header line of F1 only), deletion `src/components/studio/SceneViewMenu.jsx`, `test/turn-cc1b-f01-header.test.js` to `test/turn-cc1b-f05-output.test.js` | INT (TopBar, topMenu, outputMenu, ConfiguratorPage) |
| A2 | PART B, the drawings window: F6 one window, one export; F7 the logo is the company's; F8 two angles and the render as sheets | `src/components/DrawingModal.jsx`, `src/components/RenderModal.jsx`, `src/engine/drawings/wallSheets.js`, `src/engine/drawings/setSheet.js`, `src/lib/jcLogo.js` (NEW), `test/turn-cc1b-f06-window.test.js` to `test/turn-cc1b-f08-angles.test.js` | INT (projectStore: `project.visuals`), A5 (the fake's `company_settings.logo_url`) |
| A3 | PART C, the materials: F9 the stock is Joinery Core's; F10 Assign materials, every line; F11 "Not assigned materials" in every export; F12 the font floor of the big windows | `src/stores/materialAssignmentStore.js`, `src/lib/jcStock.js` (NEW, pure), `src/components/AssignMaterialsModal.jsx`, `src/components/MaterialPicker.jsx`, `src/engine/bom.js` (the hardware key only), `src/engine/partRegistry.js` (the blob's schema 3), `src/lib/exporters.js`, `src/lib/bomPdf.js` if it exists (grep), `src/components/SprayingPanel.jsx`, `src/index.css` (the floor), `test/turn-cc1b-f09-stock.test.js` to `test/turn-cc1b-f12-floor.test.js` | INT (projectStore: nothing expected; name it if needed), A5 (the fake's `stock_items`, `stock_categories`) |
| A4 | PART D, the AI visualisation: F13 the card and the call to Joinery Core | `src/lib/aiVisualise.js` (NEW, pure: the prompt, the request, the size guard), `src/components/drawings/AiVisualCard.jsx` (NEW), `test/turn-cc1b-f13-ai.test.js` | A2 (one mount line in DrawingModal.jsx and the `ai` slot of F8), A5 (the fake's `/api/ai/visualise`), INT (projectStore: `project.visuals.ai`) |
| A5 | PART E, the fronts and the walk: F14 ornate fronts for Skylon only; F15 AVENTOS rows in the library; F16 the fake Joinery Core grows and the walk | `src/lib/tenantFlags.js` (NEW), `src/components/FrontDecorationControls.jsx`, `src/components/FrontStyleGallery.jsx` (if it lists ORNATE_STYLE_IDS; grep), `scripts/t-cc1a-fake-jc.mjs` (extended, the only fake), `scripts/t-cc1b-walk.mjs` (NEW), `verify/t-cc1b/walk.txt`, `verify/t-cc1b/f*-*.png`, `test/turn-cc1b-f14-skylon.test.js`, `test/turn-cc1b-f15-aventos.test.js` | A1 (the four rows in `engine/library.js`, the `params` pass in LibraryPanel/RailMenus) |

## THE ORDER (the owner's words that frame this turn, 31.10 to 01.11.2026)
- The screenshot, 23:0x: the project name standing before the File menu
  *"wprowadza w blad"*; it belongs *"po prawej, z numerem projektu JC i
  nazwa"*; 01:0x, answer 6: *"srodkowe prawo, wyraznie oddzielone od menu"*.
- *"duzy przycisk Return to Joinery Core"*.
- *"dwa menu View, jedno wystarczy, menu wystarczy"* (the top bar's View stays,
  the scene corner's dropdown goes); answer 3: *"tak te przyciski zostaja sa
  mega przydatne"* (the quick toggles at the scene's edge stay).
- *"Database: Company defaults do Settings, Database niepotrzebne, wszystko
  jest w JC, Assign materials juz jest po lewej"*.
- *"Library powinno byc po lewej, w menu kitchen, rozwijac prawy panel"*; the
  project type at New item questioned: *"po co blokowac wyspe w pokoju albo
  mala szafe w kuchni"*, *"wszystkie rodzaje po lewej, czesc coming soon"*;
  *"Add po lewej dobre, ale uporzadkowac: lazienki w kuchniach itd."*.
- *"Spraying: okno duze a fonty male i duzo pustego miejsca, jak ty to zawsze
  robisz"*.
- *"na dole Drawings dobre, ale myli sie z Output; Output zmniejszyc"*; answer
  2: the Output buttons *"zostaja"*; answer 3: *"BOM pdf to export listy
  materialow w pdf (malo potrzebny ale niech U maja)"*.
- Drawings: *"logo domyslne z JC albo przycisk wstaw inne logo"*; *"usunac
  card 3D view i front only"*; *"usunac przyciski all units i drawing set
  pdf, tylko export pdf"*; *"dodac wizualizacje z drugiego kata, render wedlug
  wyboru, wizualizacja AI z renderu, max 3 proby, wybierasz jedna i dodajesz
  do rysunkow, tanie API"*; answer 5: *"przyjmiemy GPT, open AI, zaprojektuj
  polaczenie a jutro zrobie klucz"*.
- *"Output tylko: cutting list, BOM PDF, labels 21 i 44"*.
- The most important: *"materialy z JC (jego baza), przypisanie w CC, grupy
  (plyty, zawiasy, prowadnice, okucia/inne, materialy eksploatacyjne, wyposazenie
  wewnetrzne), modal duzo wiekszy i czytelny, polaczony na stale, kazda funkcja
  przypisana (10 rodzajow zawiasow, wszystkie przypisane), inaczej eksport BOM
  pisze not assigned materials"*; 01:2x: *"materials w JC ma wlasny UUID, i to
  samo musimy zrobic: przypisac UUID z JC do naszego materialu, za kazdym razem
  bedzie wybierac material do projektu, U wiec bedzie widzial czy jest
  przypisany czy nie"*.
- *"szafki AVENTOS musza byc zrobione"*; fronts: *"bez ornamentow"*, answer
  12 and 7: *"ornamenty zostaw tylko dla Skylon Joinery"*, *"tylko dla innych
  UI, dla Skylon Joinery zostaje"*; *"kolory i rodzaje galek"*; the fabric
  inside the shakers: later.

## WHAT JOINERY CORE GIVES (read, do not assume more)
- Everything T-CC1a's CLAUDE.md lists (the session, `/api/auth/me`, the four
  reads, the seven `cc_*` functions) holds unchanged.
- THREE MORE READS through `/api/db/query` (ALLOWED_TABLES of
  `api/routes/db.js`: `stock_items`, `stock_categories`, `company_settings`),
  owner, admin, manager: `stock_items` (id, name, category, subcategory, unit,
  current_quantity, min_quantity, cost_per_unit, size, thickness, color,
  item_number, image_url, supplier_id, notes); `stock_categories` (id, name,
  type 'category' | 'subcategory', parent_category_id, display_order);
  `company_settings` (company_name, company_address, logo_url). Every row is
  the tenant's (JC scopes the query); CC never writes any of the three.
- `stock_categories` are THE TENANT'S OWN (JC rule 6.5: a category list is
  never hardcoded). CC shows them as they are; CC's six groups below are groups
  of CC's ROLES (what the project needs), never of JC's stock.
- ONE NEW ENDPOINT, built tonight in the JC repository by T-JC2a (its brief is
  on `chat/t-jc2a-spec` there; the fake of this turn implements exactly these
  lines): `POST /api/ai/visualise` with the JC bearer token, body `{ image:
  <data URL, PNG or JPEG, at most 4 MB>, prompt: <string, at most 2000 chars>,
  size: '1536x1024' | '1024x1024' | '1024x1536', quality: 'low' | 'medium' |
  'high' }`, answers `{ image: <data URL, PNG>, model, seconds }` (ONE image per
  call; the client calls up to three times); errors in words: 401 (no
  session), 403 `{ error }` (role or company), 429 `{ error }` (the tenant's
  daily allowance spent), 503 `{ error: 'AI visualisation is not configured
  for this server yet.' }` (no key on the server), 504 `{ error }` (the image
  model did not answer in time). The model is OpenAI's image model behind JC's
  key; CC never holds a key and never calls OpenAI.

## LAWS
Every law of T75 to T-CC1a holds in full: LISP IS LAW (no engine geometry
delta at all); the fossil six untouchable; material never enters material; the
room refuses in words and never clamps in silence; one law one path; numbers
in the profile, none typed; 1:1 = COPY (`scripts/t78-copy.mjs --check` CLEAN);
the Skylon header on every new file; no em or en dash in anything written;
test the way the client clicks; a new function has a visible entry in the same
package; a green test beside old broken code is a lie; "usun" and "kasacja"
are physical deletions, never gates; the door is Joinery Core's; one client,
JC's; a change is memory, a save is one request. Nine laws are this turn's own:
1. **SAME DOORS.** Every window, export and toggle reachable before this turn
   is reachable after it, from a place this file names; a test lists the doors
   by label and finds each one (`test/turn-cc1b-f05-output.test.js`). What is
   DELETED is deleted by name in the Deletion licence and nowhere else.
2. **THE FRAME SAYS WHOSE JOB IT IS.** The header shows the ITEM's name and the
   JOINERY CORE project it belongs to (number and name), apart from the menus
   and to their right; the way back to Joinery Core is one big button, never a
   hunt. The owner: *"wprowadza w blad"*.
3. **ONE VIEW.** The scene's edge keeps its quick toggles; the dropdown
   duplicating the View menu is gone; nothing a toggle or the View menu did is
   lost.
4. **THE LIBRARY IS THE RAIL'S.** Every family (Kitchen, Wardrobes, Bathroom,
   Sets, Saved sets, and the families held open as coming soon) is on the left
   rail, always, for every item: the project type never hides a family again
   (*"po co blokowac wyspe w pokoju"*).
5. **OUTPUT IS WHAT LEAVES FOR THE WORKSHOP.** Output holds the cutting list,
   the BOM PDF and the two label sheets; the drawings, the renders and the
   pictures live in the Drawings window; the CNC files leave from the CNC
   workspace.
6. **THE STOCK IS JOINERY CORE'S.** A material in Cabinet Core IS a row of the
   tenant's `stock_items`, keyed by JC's uuid; an assignment stores that uuid
   and nothing else; CC keeps no material list of its own but the three
   honest placeholders (Generic board 18, 22, 25).
7. **EVERY LINE ASSIGNED, OR THE EXPORT SAYS SO.** The BOM's demand is lines by
   role AND specification (ten hinge kinds are ten lines); each line carries
   one assigned JC material or the words "Not assigned materials", in the
   window, in the BOM PDF, in the cutting list CSV; a job with any line
   unassigned prints no total as a price.
8. **A PICTURE FOR THE CLIENT IS A SHEET OF THE SET.** The two angles, the
   render of the user's choice and the chosen AI picture are sheets in the
   drawing set, ticked like any other, exported by the one Export PDF; an AI
   picture is made at most three times per click of "Generate", the user
   picks ONE, and nothing is kept until he does.
9. **SKYLON'S OWN STAYS SKYLON'S.** The ornate fronts (ORNATE_STYLE_IDS) are
   offered to the Skylon Joinery tenant only; every other tenant's gallery
   shows the plain and the machined styles; a saved item of another tenant
   that carries an ornate style is not touched by this turn (it draws as
   today; the gallery just does not offer the style).

## FROZEN
1. The six base goldens and every T75 to T-CC1a golden IDENTICAL (no engine
   geometry delta; the checks run anyway and the PR pastes them).
2. T-CC1a's code, tests and the fake's contract: as they left them; the fake
   GROWS (F16) and loses nothing.
3. The editor: every panel, the Section, the scene, the exports' CONTENT
   (CNC, DXF, labels, PDF pages, CSV columns), the title block's fields, the
   Studio shell: untouched except the lines this file names.
4. The profile store, the company defaults store, the hardware register,
   settings sets, templates, the warehouse rows: LOCAL as T-CC1a left them;
   the company defaults window moves house (F3) and does not change inside.
5. PRO freeze: every PRO file edited is licensed in EXEMPT with the owner's
   words from this file and re-frozen in the same commit; the deleted PRO file
   leaves the manifest with the owner's words beside the deletion; the new
   files enter it at their first hash; the count assertion at
   `test/turn59-f1-the-switch.test.js:1001` is amended by INT. Retail copies
   NOT edited: `t78-copy --check` CLEAN.
6. The suite is green at the start (the count on main at the start of the run,
   written in the PR) and at the end, plus this turn's tests, minus the tests
   this turn REWRITES by name (each named in the PR with what it now asserts).

## PART A · THE FRAME (F1 to F5; A1 and INT)

### F1 · The header (law 2)
1. `TopBar.jsx` (INT; frozen, EXEMPT with *"wprowadza w blad ... po prawej, z
   numerem projektu JC i nazwa"*), the Studio bar (`drawStudio`, about :505 to
   :521): the order becomes [wordmark] [PRO] [menus] [spacer] [the job block]
   [Save] [Brightness] [BOM] [Back to Joinery Core]. The JOB BLOCK
   (`drawJobBlock`, NEW in TopBar, PROPOSED layout) is `<div
   class="studio-job" data-studio="topbar-job">` with a 1 px vertical rule on
   its left (`.studio-job::before`, `theme('colors.shell.600')`, 24 px tall,
   12 px margins), then two lines: line one the ITEM NAME (today's
   `drawProjectName`, editable on click as today, the dirty dot as today,
   `studio-project-name`); line two, smaller and muted (`studio-job-project`,
   11 px, `colors.ink.400`), `<number> · <JC project name> · <client>` from
   `project.number`, `project.jcProjectName` (F1.3) and `project.client`,
   `title="Joinery Core project: read-only here"`. No line of the legacy bar
   (`variant` absent) changes.
2. "Back to Joinery Core": a gold button (`cc-btn-gold`, `data-studio=
   "topbar-back-jc"`, the house `Icon name="arrow-left"` if the set has one,
   else the text alone), label "Back to Joinery Core", the LAST control on the
   right; click: `await persistProject()` when `dirty` (today's save road; the
   pagehide flush of T-CC1a F8 covers a refused save), then
   `location.assign('/dashboard.html')`. The wordmark keeps today's click (the
   start screen) and its title. The start screen's header (A1,
   `StartScreen.jsx`) gets the same button at its right, same words, same
   target, so a user who never opens an item can also leave.
3. `projectStore.js` (INT): `openItem` and `newProject` accept and keep
   `jcProjectName` (the bound project's `name` from the list row the start
   screen already holds; `NewProjectFlow` passes `jcProject.name`); it rides
   `project.jcProjectName` in the store ONLY: `projectForSave` does not write
   it (the binding lives in the row's columns, T-CC1a F4.3), and a buffer
   restore (T-CC1a F9) fills it from the loaded list by `jc_project_id` or
   `jc_pipeline_id`; when the name is unknown the block shows the number alone.
4. `studio.css` (A1; frozen, EXEMPT): `.studio-job`, `.studio-job-project`,
   `.studio-job::before`; `.studio-project-name` keeps its rules (:271 to :288)
   and loses the width that made it give way to the menus (the menus have
   their own room now: Library and Database are gone, F3 and F4).
5. `test/turn-cc1b-f01-header.test.js`: the rendered Studio bar holds, in DOM
   order, the menu bar, then `[data-studio="topbar-job"]` with the item name
   and a line containing the number and the JC project name, then Save, then
   `[data-studio="topbar-back-jc"]` last; the legacy bar is byte-identical to
   main's render for the same store (a snapshot of its `outerHTML`); the Back
   button on a dirty item calls the save before `location.assign`; the start
   screen shows the same button.

### F2 · One View (law 3)
1. DELETED, physically: `src/components/studio/SceneViewMenu.jsx` (266 lines)
   and its two lines in `ConfiguratorPage.jsx` (:50 the import, :717 the
   mount); the manifest row leaves with the owner's words *"dwa menu View,
   jedno wystarczy"*. `SceneToggles` (the quick toggles) and `CameraBar` (with
   Drawings...) stay exactly as they are (*"te przyciski zostaja"*).
2. SAME DOORS check, written in the test: every VIEW_ITEM the deleted menu had
   (Dimensions, Front dimensions, Dimension colour, Props, Measure, Contour
   view, Brightness, Realistic lighting, Turn on the light) is reachable after
   the deletion: Dimensions, Front dimensions, Props and Measure on
   `SceneToggles`; Dimension colour, Contour view, Brightness, Realistic
   lighting and Turn on the light in TopBar's View menu (:179 to :287). Nothing
   is added to either.
3. `test/turn-cc1b-f02-one-view.test.js`: the file does not exist; `src/`
   contains no `SceneViewMenu`; the nine labels above are found on the two
   surviving surfaces; the Studio frame renders ONE element whose text is
   "View" with `aria-haspopup`.

### F3 · The Database menu dies
1. `topMenu.js` (INT): `MENU_ORDER` becomes `['File', 'View', 'Settings',
   'Spraying', 'Lighting', 'Output']`; `buildDatabaseMenu` is DELETED
   (tombstone two lines: *"Database niepotrzebne, wszystko jest w JC"*); its
   five entries find their homes: "Company defaults..." becomes the third item
   of the Settings menu (after Settings... and Room setup..., before Snap;
   `TopBar.jsx` :306 to :325, same `openModal` call as today); "Materials..."
   and "Assign materials..." are the rail's already (RailMenus.jsx 'materials':
   Selected finishes..., Project finishes..., Assign materials..., Stock...;
   the "Stock..." entry opens the stock window of F9); "Clients..." and
   "Projects..." are DELETED: they were "soon" badges for what Joinery Core is.
2. `RailMenus.jsx` (A1): `databaseEntry` (:181) no longer imports from the
   deleted builder; the four items are written in place with the same labels,
   hints and `openModal` calls.
3. `test/turn-cc1b-f03-database.test.js`: `MENU_ORDER` has no 'Database' and
   no 'Library'; the Settings menu has "Company defaults..."; the rail's
   materials popup has "Assign materials..." and "Stock..."; `src/` has no
   `buildDatabaseMenu`; no element with text "Clients..." or "Projects..."
   renders anywhere in the Studio frame.

### F4 · The Library is the rail's, every family (law 4)
1. `TopBar.jsx` (INT): the Library menu (:289 to :305) is DELETED from the bar
   (the rail's Add is the one door; `MENU_ORDER` already lost it in F3).
2. `engine/library.js` (A1; LICENSED, data rows only): `BATHROOM_GROUP` leaves
   `KITCHEN_LIBRARY` (:297) and `WARDROBE_LIBRARY` (:375) and becomes the
   entries of its OWN category; `engine/types.js` `UNIT_CATEGORIES` (:1863 to
   :1898) becomes, in this order: `kitchen` "Kitchen", `wardrobe` "Wardrobes",
   `bathroom` "Bathroom" (entries `BATHROOM_LIBRARY`, types derived), `media`
   "Sets", `sets` "Saved sets", then the families held open: `{ id:
   'media_wall', label: 'Media wall', soon: true, reason: 'Coming soon' }`,
   `hallway` "Hallway", `office` "Office" (PROPOSED three; a `soon` category
   renders as a greyed rail row with its reason and opens nothing;
   `test/library-categories.test.js` learns that a `soon` category has no
   types by design). `categoryOf` keeps answering for every kit (the Bathroom
   kits answer 'bathroom' now; the test says so).
3. The project-type GATE dies: `LibraryPanel.jsx` (A1) loses `projectCategory`
   (:53), `showAllTypes` (:54) and the `filterLibraryByProject` branch (:254 to
   :278): every category shows all its entries, always. `filterLibraryByProject`
   itself, if nothing else calls it (grep), is deleted with its test rewritten
   to assert the rail shows every family for a kitchen item AND for a wardrobe
   item.
4. `NewProjectFlow.jsx` (A1): the type tiles (:346 to :378) STAY as what they
   truly do, a heights preset (`heightsForProjectType`, :209): the section's
   heading becomes "Start from" with the help line "Only the starting heights.
   Every family of units is in the library whatever you pick." (PROPOSED
   words); nothing else of the flow changes.
5. `RailMenus.jsx` 'add' (A1): the categories come from the new
   `UNIT_CATEGORIES`; a `soon` category is a disabled row with its reason; the
   library flyout opens the right panel as today (*"rozwijac prawy panel"*).
6. `test/turn-cc1b-f04-library.test.js`: the Studio bar has no "Library" menu;
   the rail's Add lists Kitchen, Wardrobes, Bathroom, Sets, Saved sets and the
   three `soon` rows in order; Bathroom holds the four bathroom kits and
   Kitchen and Wardrobes hold none of them; a kitchen item and a wardrobe item
   both see every family; `NewProjectFlow` shows "Start from".

### F5 · Output shrinks (law 5; SAME DOORS proven here)
1. `outputMenu.js` (INT): `buildOutputMenu` returns Output with exactly:
   "Cutting list CSV", "BOM PDF" (hint "The materials list of the job as a
   PDF: parts, materials, hardware"), "Part labels · 21 per sheet (Avery
   L7160)", "Part labels · 44 per sheet". DELETED from the menu: Preview...,
   Unit card (PDF), Unit card (SVG), All units (PDF), Drawing set (PDF),
   Drawing set (DXF), Render..., CNC / DXF, Bill of materials..., Spraying....
2. Their doors after this turn (the test finds each): the drawings and the
   renders: the CameraBar's "Drawings..." button (the window of PART B holds
   the set, the two angles, the render and the AI card); "Bill of
   materials...": TopBar's `drawBom` button (stays); "Spraying...": the
   Spraying menu (stays); "CNC / DXF": the CNC workspace's own export control
   (grep `CncView.jsx` and the CNC rail for the button that calls
   `onExportDxfZip`; if none exists, ADD one `cc-btn` "Export CNC / DXF" to the
   CNC view's toolbar calling today's `onExportDxfZip`, so the door exists
   before the menu entry dies; name it in the PR). Unit card (PDF/SVG), All
   units (PDF) and Preview... are the owner's deletions (*"usunac card 3D view
   i front only ... all units"*): they leave with F6.
3. `test/turn-cc1b-f05-output.test.js`: the Output menu has the four labels and
   no other; the doors list (Drawings..., Bill of materials, Spraying, Export
   CNC / DXF) is found in the rendered Studio frame; `buildOutputMenu` is
   called with the four handlers only.

## PART B · THE DRAWINGS WINDOW (F6 to F8; A2 and INT)

### F6 · One window, one export
1. `DrawingModal.jsx` (A2; frozen, EXEMPT with *"usunac przyciski all units i
   drawing set pdf, tylko export pdf"*): `KINDS` keeps `walls` only; the state
   `kind` is the constant 'walls'; the selector row (:443, "Card (3 views)",
   "Front only", "Set") is DELETED; the footer (:370 to :410) becomes [Close]
   [Wall DXF, secondary, PROPOSED kept: the AutoCAD road has no other door]
   [Export PDF, gold]: "Export PDF" writes today's `save('walls-pdf')` (the
   ticked sheets, in the set's order); `save('booklet')`, `save('svg')` and
   the per-sheet `save('pdf')` are DELETED with the buttons; the sheet list
   with its ticks stays; the window's width stays 880 (PROPOSED).
2. The window's title becomes "Drawings" and its one paragraph of help says
   what the set is (today's :682 to :695 text, trimmed to the sheets that
   exist after F8).
3. `test/turn-cc1b-f06-window.test.js`: the window renders no "Card (3
   views)", "Front only", "All units (PDF)", "Drawing set (PDF)" or "Export
   SVG"; "Export PDF" is disabled with no ticked sheet and calls the set's PDF
   road with the ticked sheets; `src/components/DrawingModal.jsx` contains no
   `booklet`.

### F7 · The logo is the company's
1. `src/lib/jcLogo.js` (NEW, Skylon header): `loadCompanyLogo() -> { href:
   <string> | null, error }` from ONE read through `withDb`:
   `company_settings` select `logo_url` (`.maybeSingle()`); the href is used
   as given (JC's storage URL) for the screen; for the PDF (the title block
   draws an image) the file is fetched once into a data URL with
   `readLogoFile`'s own sizing and cached per session (`cc.<tenant>.logo.v1`
   in sessionStorage, PROPOSED); a fetch the browser refuses (CORS, 404) leaves
   the title block without a logo and the window says so in one line, never a
   broken image.
2. `DrawingModal.jsx` (A2): the title block's logo field (:553 to :575): the
   default is the company's logo from F7.1 when `project.titleBlock.company.
   logo` is empty; the row shows the logo, then two buttons: "Insert other
   logo" (today's Choose image road, unchanged inside) and "Use company logo"
   (clears the per-project logo so the company's shows again); "Remove" stays.
3. `setSheet.js` `logoOf` (A2): accepts the company href as the fallback source
   when the project has none; nothing else moves.
4. `test/turn-cc1b-f07-logo.test.js`: with a fake client whose
   `company_settings` row has `logo_url`, the title block shows it and the PDF
   road receives it; with `logo_url: null`, no logo and no error; "Insert other
   logo" replaces it for THIS item only; "Use company logo" restores it.

### F8 · Two angles and the render as sheets (law 8)
1. `DrawingModal.jsx` (A2): the one `renderImage` (:146 to :174, preset
   'iso-left') becomes `visuals = { isoLeft, isoRight, render, ai }`: `isoLeft`
   and `isoRight` are captured as today with presets 'iso-left' and
   'iso-right' (`engine/render.js` :76 and :77, both exist); `render` is the
   user's own: a "Render..." button in the window (the same `RenderModal`,
   its CAMERA_PRESETS and resolution untouched) whose result lands in
   `project.visuals.render` (INT: `project.visuals = { render: { dataUrl,
   preset, at }, ai: { dataUrl, prompt, at } }`, saved with the item as JPEG
   data URLs, each under `profile.visuals.maxKb` 400, PROPOSED; a bigger one is
   re-encoded at a lower quality before it is kept); `ai` is F13's.
2. `wallSheets.js` (A2): `renderImage` becomes `visuals`; the set gains, in
   place of the one visualisation sheet, up to FOUR sheets after the sections
   and before the cut list: "Visualisation, left" (isoLeft), "Visualisation,
   right" (isoRight), "Visualisation, render" (when `visuals.render`),
   "Visualisation, AI" (when `visuals.ai`); each a sheet with its tick like
   any other; the first two ticked by default, the other two ticked when
   present (PROPOSED).
3. `RenderModal.jsx` (A2): gains an `onResult` prop; when given, the finished
   render is handed back instead of (or beside, PROPOSED: beside) the download;
   nothing else changes.
4. `test/turn-cc1b-f08-angles.test.js`: with a fake rig the set lists
   "Visualisation, left" and "Visualisation, right" and no "Visualisation"
   alone; a `project.visuals.render` adds the third; a 2 MB render is kept
   under 400 KB; the sheets export through the one PDF road in the set's order.

## PART C · THE MATERIALS (F9 to F12; A3 and INT)

### F9 · The stock is Joinery Core's (law 6)
1. `src/lib/jcStock.js` (NEW, pure, Skylon header): `loadJcStock(client) ->
   { items, categories, error }` from TWO reads through `withDb`:
   `stock_items` select `id, name, category, subcategory, unit,
   current_quantity, cost_per_unit, size, thickness, color, item_number,
   image_url, supplier_id` ordered by name; `stock_categories` select `id,
   name, type, parent_category_id, display_order` ordered by display_order;
   `toMaterial(row) -> { id: row.id, jc_uuid: row.id, name, category:
   ccKindOf(row), group: row.category, subgroup: row.subcategory, thickness:
   Number(row.thickness) || null, unit, price: Number(row.cost_per_unit) || 0,
   color, size, item_number, image_url, stock: Number(row.current_quantity) }`
   where `ccKindOf` reads the row's thickness and category/subcategory WORDS
   to answer the vocabulary the BOM already knows ('board' | 'front' | 'edging'
   | 'hardware' | 'other'; PROPOSED: a numeric thickness over 3 mm and a word
   among sheet, board, mdf, mfc, ply, plywood, melamine, veneer, worktop gives
   'board'; edging, abs, pvc gives 'edging'; hinge, runner, drawer, handle,
   knob, leg, bracket, screw, cabineo, dowel, lift, aventos, rail, fitting,
   ironmongery gives 'hardware'; the rest 'other'); `categoryTree(categories)
   -> [{ id, name, children: [...] }]` from `parent_category_id`. Tested as
   written with fixture rows (a melamine board 18 mm, an ABS edging, a Blum
   hinge, a tin of paint).
2. `materialAssignmentStore.js` (A3): `loadMaterials` reads JC's stock
   through `loadJcStock` (the `cc_materials` read, a table JC does not have,
   is DELETED); `materials` = the three generic placeholders (`generic-18`,
   `generic-22`, `generic-25`, kept, they pin geometry honestly) followed by
   `items.map(toMaterial)`; `materialsSource` 'jc' | 'offline'; the rest of
   `MOCK_MATERIALS` (:57 to :103, the 19 sample rows) is DELETED (kasacja; the
   tests that read them are rewritten by name to fixture rows of
   `jcStock.js`); `isJcMaterial` and `materialBadge` keep their contract (every
   stock row is JC's; the badge shows "JC" as today). An empty stock is said
   in words in the Assign window: "No materials in your Joinery Core stock yet.
   Add them in Joinery Core, Stock." with a button "Open Stock" to
   `/stock.html` in a new tab (PROPOSED). Offline: the JC_OFFLINE words and
   Retry, never an empty list in silence.
3. The "Stock..." window of the rail (RailMenus 'materials' row 4): the
   read-only list of the tenant's stock as CC sees it (name, item number,
   category, thickness, unit, price, stock, the JC badge), with a search box
   that narrows and the categories tree as a filter (JC rule 6.3), width
   1240, the floor of F12. It replaces whatever the row opened before (grep;
   name it in the PR).
4. `test/turn-cc1b-f09-stock.test.js`: the two reads named with their columns
   (the fake client records every `select`); `toMaterial` maps the fixture
   rows to the four kinds; the store holds the three generics plus the rows;
   `src/` has no `cc_materials` and no row of the deleted samples (grep
   `hw_hinge_clip`, `mat_mfc18_white`); offline shows the words.

### F10 · Assign materials, every line (law 7)
1. `engine/partRegistry.js` (A3; LICENSED, the blob's shape): the assignment
   blob's schema becomes 3: beside the panel roles and the per-part
   exceptions of today, `hardware: { [key]: { material_id } }` where `key` is
   the BOM's own hardware key `${role}|${spec_label}` (bom.js :441); a schema 2
   blob migrates by copying each legacy `assignments[role].material_id` of a
   HARDWARE role to every key of that role the current BOM lists (so nothing a
   joiner assigned is lost), once, at load.
2. `engine/bom.js` (A3; LICENSED, the key only): `hardwareDemand(bom,
   assignments, materials)` (:674) reads `assignments.hardware[key]` FIRST and
   the legacy `assignments[role]` second; a line with neither is `{ material:
   null, assigned: false }` as today. No quantity, no spec label, no geometry
   changes.
3. `AssignMaterialsModal.jsx` (A3; frozen, EXEMPT with the owner's words of
   law 7): width 1240 (as Spraying's), the F12 floor, two columns. LEFT, the
   project's demand in SIX GROUPS of CC's roles (PROPOSED grouping; every
   hardware role the engine emits is in exactly one group, the test asserts
   the cover): "Sheets" (side, top, bottom, back, shelf, front, drawer_box,
   plinth, infill, end_panel and the per-part exceptions as today); "Hinges"
   (hinge | hinges, bifold_hinges, hawa_hinges); "Runners" (runner_pairs,
   runner_sync_rods); "Internal fittings" (drawer_insert, drawer_glass,
   lift_unit, led_strip, mirror, watch_insert, space_corner, rail, shelf_pins,
   rail_supports, shoe_insert, ready_boxes); "Ironmongery and other" (legs,
   hangers, handle, cabineo_connector, cabineo_cap, worktop_bolts, hawa_set,
   hawa_connector, hawa_tracks, hawa_stiffener, hawa_foot, extractor);
   "Consumables" (edging and whatever role the engine emits that no other
   group names, so a new role can never vanish: the test asserts the
   fallback). Each LINE is one BOM key: label, the spec (`spec_label`), the
   quantity and unit from the BOM, then the assigned material (name, item
   number, price) with the JC badge, or a red chip "Not assigned" and the
   line is the one being assigned when clicked. RIGHT, the stock: the F9 list
   embedded and visible at once, a search box that narrows by name, number,
   colour, size, a category filter from the tree, the kind filter preselected
   to the line's kind (board for Sheets, hardware for the rest, switchable);
   click a row assigns it to the selected line and the chip turns to the name;
   "Clear" on a line unassigns. A header line counts: "<n> of <m> lines
   assigned" and, when m > n, "Not assigned materials: <m minus n> lines" in
   red. The yield field of a Sheets line stays where it is today.
4. `MaterialPicker.jsx` (A3): becomes the RIGHT column's list (one component,
   used by the Assign window and the Stock window), never a dropdown-only.
5. `test/turn-cc1b-f10-assign.test.js`: a job with two hinge specs and one
   runner spec shows three lines under Hinges and Runners, each assignable
   separately, the key written as `${role}|${spec_label}`; a schema 2 blob
   with `hinges: { material_id }` migrates to both hinge keys; the group cover
   test: every role in `HARDWARE_ROLES` and every role the engine emits in
   `test/fixtures` jobs lands in one group; the search narrows by colour; the
   header counts; `src/` has no second material list.

### F11 · "Not assigned materials" in every export (law 7)
1. `exporters.js` (A3): the BOM PDF: each unassigned line prints "Not
   assigned materials" in its material column (today's ' · not assigned',
   :354, becomes these words); the cover of the PDF carries, when any line is
   unassigned, a red line "Not assigned materials: <n> lines. Assign them in
   Cabinet Core, Materials, before ordering." and the totals row prints "not
   a price" instead of a sum; the cutting list CSV keeps its WARNING row
   (:165) with the same words; the live BOM window shows the same header
   count as F10.
2. `test/turn-cc1b-f11-words.test.js`: a job with one unassigned hinge line
   exports a PDF whose text contains "Not assigned materials" twice (the line
   and the cover) and no "£" total; the same job fully assigned prints the
   total and not the words; the CSV WARNING row carries the words.

### F12 · The font floor of the big windows
1. `src/index.css` (A3): `.cc-modal-wide` (NEW class, PROPOSED) sets `font-
   size: 13px` on the window's body and `th, td { font-size: 13px; padding:
   6px 8px }`; `.text-xs` inside it is overridden to 13 px (the floor; the
   owner: *"fonty male i duzo pustego miejsca"*). `SprayingPanel.jsx` (A3):
   gets the class, its table `w-full` with `table-layout: auto` so the
   columns take the 1240 (today's :208 fixed widths go), the empty right
   margin disappears; `AssignMaterialsModal.jsx` and the Stock window of F9
   get the class. No other window changes (named in the PR as "later, by
   name").
2. `test/turn-cc1b-f12-floor.test.js`: the three windows carry `cc-modal-
   wide`; the computed font size of a table cell in each is at least 13 px
   (jsdom with the stylesheet, or the rule read from `index.css` and the class
   found on the element, whichever the suite's house pattern is); the Spraying
   table's width equals its window's content width.

## PART D · THE AI VISUALISATION (F13; A4)

### F13 · The card and the call to Joinery Core (law 8)
1. `src/lib/aiVisualise.js` (NEW, pure, Skylon header): `buildPrompt({
   project, design, finishes, room }) -> string` (at most 2000 chars; the
   words: a photorealistic interior photograph of this exact furniture, the
   layout and proportions unchanged, the fronts in the named colours and
   materials, the worktop and handles as named, natural daylight, no people,
   no text; PROPOSED); `visualise({ image, prompt, size, quality }) ->
   { image, model, seconds, error }` through `jcFetch('/api/ai/visualise', {
   method: 'POST', body })` (one call, one picture); a size guard: an `image`
   over `profile.visuals.aiInputMaxMb` 4 is downscaled to the long side
   `profile.visuals.aiInputLongPx` 1536 as JPEG 0.85 before it is sent
   (PROPOSED numbers, in the profile); the 401/403/429/503/504 words shown as
   JC gives them.
2. `src/components/drawings/AiVisualCard.jsx` (NEW, Skylon header; A2 mounts
   it in the Drawings window under the sheet list, one line): "AI
   visualisation" with: the source (a radio: the left angle, the right angle,
   the user's render when present); the size (the three; default
   '1536x1024'); the quality (default 'medium', PROPOSED); a text field "Add
   to the prompt" (optional, appended); the button "Generate" that runs
   `visualise` up to THREE times in sequence for one click (the owner: *"max 3
   proby"*), showing each result as it arrives with "Use this one" under it,
   a spinner and "Picture <k> of 3" meanwhile, and "Stop" between calls; a
   refused call shows its words on the card and the pictures already made
   stay; "Use this one" writes `project.visuals.ai = { dataUrl (JPEG under
   400 KB), prompt, at }` (INT's field of F8.1) and the set shows
   "Visualisation, AI" ticked; "Remove" clears it. Nothing is kept until "Use
   this one" is pressed. Never the word "worker".
3. `test/turn-cc1b-f13-ai.test.js`: with a fake `apiFetch`, one click of
   Generate makes at most three POSTs to `/api/ai/visualise` with the body's
   keys `image, prompt, size, quality` and a prompt under 2000 chars that
   names the fronts' colour from the fixture design; a 503 after the first
   picture leaves one picture shown and the words; "Use this one" writes
   `project.visuals.ai` under 400 KB and the set lists "Visualisation, AI";
   nothing is written before it; a 5 MB input is downscaled before the POST.

## PART E · THE FRONTS AND THE WALK (F14 to F16; A5)

### F14 · Ornate fronts for Skylon only (law 9)
1. `src/lib/tenantFlags.js` (NEW, Skylon header): `SKYLON_TENANT_ID =
   'b663e012-1ae6-45d8-b720-7bcc26baffc2'` (Skylon Joinery LTD, as JC's
   `sql/2026-10-28-site-app-tenants.sql` names it); `isSkylon(tenantId)`;
   `ornateFrontsFor(tenantId) -> string[]` = `ORNATE_STYLE_IDS` for Skylon,
   `[]` for everyone else.
2. `FrontDecorationControls.jsx` (and `FrontStyleGallery.jsx` if it lists the
   styles; grep `ORNATE_STYLE_IDS` in `src/components`): the ornate styles are
   offered only when `isSkylon(useAuthStore.getState().tenant?.id)`; a unit
   that already carries an ornate style keeps drawing it (the engine is not
   touched) and the control shows its current style read-only with the line
   "This style is not offered to your workshop." (PROPOSED). The machined
   styles (`DECORATIVE_FRONT_STYLES`) and the plain fronts stay for everyone.
3. `test/turn-cc1b-f14-skylon.test.js`: with the tenant set to Skylon's id the
   gallery lists the four ornate styles; with another uuid it lists none of
   them and every other style; a unit with `ORNATE_A_1` under another tenant
   still computes (the engine result equals main's).

### F15 · AVENTOS rows in the library
1. `engine/library.js` (A1 applies A5's patch; data rows only): the Wall
   units group gains a sub-group `{ kind: 'group', id: 'aventos', label:
   'AVENTOS lift-up', hint: 'A wall unit with a Blum AVENTOS lift instead of
   hinges: the engine chooses the unit from the front\'s weight', items: [
   { kind: 'type', id: 'wud-hk', typeId: 'WUD', label: 'HK, stay lift',
   params: { front_system: 'hk' } }, { ... 'hs', 'HS, up and over' }, { ...
   'hl', 'HL, lift up' }, { ... 'hf', 'HF, bi-fold' } ] }` (the labels from
   `liftSystems.js` LIFT_LABELS, read, not retyped). The entry grammar gains
   `params?`; `LibraryPanel.jsx` :419 passes `entry.params` to `onAdd(typeId,
   { params })` (`addUnit` takes `params` already, projectStore :6054);
   RailMenus' flyout the same. `liftTakesKit` is not touched: a WUD takes a
   lift today (RightPanel :664 to :676 chooses one per unit); these rows
   choose it at insertion.
2. `test/turn-cc1b-f15-aventos.test.js`: the Wall units group lists the four
   rows with LIFT_LABELS' words; adding "HK, stay lift" creates a WUD whose
   `params.front_system` is 'hk' and whose result carries a lift unit line in
   the BOM hardware (`lift_unit|...`), assignable in F10's Internal fittings.

### F16 · The fake Joinery Core grows and the walk
1. `scripts/t-cc1a-fake-jc.mjs` (A5): the in-memory store gains
   `stock_categories` (Sheets with subcategories Melamine and MDF; Hardware
   with Hinges and Runners; Consumables) and `stock_items` (eight rows: two
   boards 18 mm, one MDF 22, one edging, two hinges 110 and 155, one runner,
   one paint), `company_settings.logo_url` set to a PNG the fake serves at
   `/fake/logo.png`, and `POST /api/ai/visualise`: 401 without a token, 403
   for the employee, 503 when the fake is started with `--no-ai-key`, else a
   fixed PNG (a 64 by 64 tinted square written in the script, no file) after
   `--ai-delay-ms` (default 300), counting calls per token; nothing of
   T-CC1a's contract changes.
2. `scripts/t-cc1b-walk.mjs` (A5, the real mouse through
   `scripts/t74-harness.mjs`, BASE = the fake's origin + `/cabinet/`): (a)
   sign in as admin, open the item "Walk wardrobe" of the fake: the header
   shows the item name and under it the JC number and project name to the
   RIGHT of the menus; the bar lists File, View, Settings, Spraying,
   Lighting, Output and no Library, no Database; ONE "View" (frame); (b) click
   "Back to Joinery Core": the browser lands on `/dashboard.html` (the fake
   answers a page); back; (c) the rail's Add lists Kitchen, Wardrobes,
   Bathroom, Sets, Saved sets, Media wall (soon), Hallway (soon), Office
   (soon); open Bathroom: four kits; open Kitchen, Wall units, AVENTOS
   lift-up: four rows; add "HK, stay lift" (frame); (d) Output shows four
   entries (frame); (e) Drawings: no Card, no Front only, the sheet list with
   "Visualisation, left" and "Visualisation, right", the company logo in the
   title block (frame); press Generate on the AI card: three pictures arrive,
   "Use this one" on the second: "Visualisation, AI" appears ticked; Export
   PDF: one download whose page count equals the ticked sheets (read with the
   suite's PDF reader; frame); (f) rail Materials, Assign materials...: the
   six groups, the hinge lines (two specs after the AVENTOS unit joined),
   every chip "Not assigned"; assign the 110 hinge from the right list: the
   chip turns; the header says "<n> of <m> lines assigned" (frame); Output,
   BOM PDF: the PDF text holds "Not assigned materials" (frame); (g) switch
   the fake's tenant to another uuid, reload, open the item, select a front:
   the gallery has no ornate style (frame). Every line PASS or FAIL with the
   number expected and the number read; never patched in the walk.
   `verify/t-cc1b/walk.txt` and the frames.

## NOT THIS TURN
- The fabric inside the shakers (the owner: later); the fronts' colour and
  handle KINDS beyond what exists (the colours are Spraying's, a handle is a
  stock row assigned in F10); a page of its own for the materials; the
  materials export and the estimate hint: T-CC2.
- The profile in the tenant's row, the company defaults in JC, the title
  block's client and address from JC: the rest of T-CC1b's original list,
  moved to T-CC1c by this turn's size.
- The drawings into the project's folder, the storage road, the AI picture
  in storage instead of the design: T-CC1c.
- The 3D (*"nie robimy 3d"*); any engine geometry; any new kit; the
  Cabineo in 3D from the milled face only (Petros, later).
- A live call to joinerycore.com: the owner's walk after both merges (this
  turn and T-JC2a).
- Retail (`src/retail/**`): not edited.

## IF THE NIGHT RUNS SHORT (the order things fall, whole)
F15 (the AVENTOS rows) falls first, then F12 (the floor), then F8's render
sheet (the two angles stay), then F7 (the logo), then F13 (the AI card; its
JC side still lands in T-JC2a and the card comes the next turn). F1 to F6,
F9, F10, F11 and F14 never fall.

## DELETION LICENCE (BY NAME, nothing else)
`src/components/studio/SceneViewMenu.jsx` (whole file) and its import and
mount in `ConfiguratorPage.jsx`; `buildDatabaseMenu` in `topMenu.js` and the
Database menu's five entries (two of them, Clients... and Projects..., die
for good); the Library menu of `TopBar.jsx`; `projectCategory`,
`showAllTypes` and the `filterLibraryByProject` branch in `LibraryPanel.jsx`
(and the function itself if unused); the six Output entries named in F5.1;
`KINDS.preview`, `KINDS['unit-card']`, `KINDS['front-elevation']`, the kind
selector row, the "All units (PDF)", "Drawing set (PDF)", "Export SVG"
buttons and the `booklet`, `svg` and per-sheet `pdf` roads of
`DrawingModal.jsx`; the `cc_materials` read and the 19 sample rows of
`MOCK_MATERIALS` (the three generics stay). Nothing else.

## LINEAGE (one line a test reads from this file)
T79's horizontal notch stays as built and its owner's words stay here
because `test/turn79-f05-edge-notch.test.js` reads them from CLAUDE.md:
*"cut the corner działa idealnie, ale możesz zrobić mi też poziome cut?
wszystkich 4 rogów?"* (18.10.2026). T85 (PR #89), T86B (PR #91), the chat
fixes of 28.10 to 31.10 (PR #84 to #86, #90, #93 to #95), T-CC1a and main at
the merge of #95 are the base of this turn; their numbers hold untouched.

## TESTS AND PROOF
Full suite once per PART and at the end (never `--silent`); the classifier
strict with `f55-t-cc1b-f*.mjs` naming every lib delta and the three LICENSED
engine files with the owner's words (library.js rows, types.js categories,
bom.js the key; partRegistry.js the blob) and NO geometry delta (the
classifier's engine set names those three and `partRegistry.js` only; the PR
says so); the six base goldens IDENTICAL (`scripts/t64-classify.mjs --dump`
vs `verify/t70/goldens-base.json`); `t75-goldens --check`, `t78-goldens
--check` and every later golden check as T-CC1a's list names them;
`t78-copy --check` CLEAN; `vite build` green with `base: '/cabinet/'`;
`t-cc1b-walk.mjs`; NEW_FILES; the Skylon header; no em or en dash; `grep` of
`src/` for `SceneViewMenu`, `buildDatabaseMenu`, `cc_materials`,
`hw_hinge_clip`, `booklet`: all 0; grep "worker" in added lines: 0; every F
the six stations of DONE in twenty lines.

## PR BODY
First line: "Stands on main at the merge of PR #95 (e7a38ad1); meets T-JC2a of
the Joinery Core repository on Vercel (the AI endpoint); no live JC was
called." Then files and lines per F; the doors table of F2 and F5 (every
deleted entry and where it lives now); the two reads of F9 with their column
lists and the `ccKindOf` word lists; the six groups of F10 with every role
under its group and the fallback; the words of F11 quoted; the request of
F13 quoted (the body's keys, the three calls, the cap); the EXEMPT rows and
the manifest count before and after; the tests rewritten by name; the test
count before and after; the walk result; DECISIONS TAKEN; the PROPOSED points
for the owner (the job block's two-line layout, Wall DXF kept, the three
`soon` families, "Start from", the six groups' membership, the AI card's
defaults 1536x1024 medium, the 400 KB picture cap, the 13 px floor); SKIPPED
AND WHY; RED AT THE END; THE NUMBERS below.

## THE NUMBERS (in the profile; none typed in the UI)
| Number | Where | Value | Status |
| - | - | - | - |
| the kept picture's size | `profile.visuals.maxKb` | 400 | PROPOSED |
| the AI input's size | `profile.visuals.aiInputMaxMb` | 4 | PROPOSED (JC's body wall) |
| the AI input's long side | `profile.visuals.aiInputLongPx` | 1536 | PROPOSED |
| the AI pictures per click | `profile.visuals.aiTries` | 3 | CONFIRMED (*"max 3 proby"*) |
| the AI default size and quality | the card | 1536x1024, medium | PROPOSED |
| the font floor of the wide windows | `index.css .cc-modal-wide` | 13 px | PROPOSED |
| the wide window's width | the three windows | 1240 | as Spraying's today |
| the Skylon tenant | `tenantFlags.js` | b663e012-1ae6-45d8-b720-7bcc26baffc2 | CONFIRMED (JC sql 2026-10-28) |
| the assignment blob | `partRegistry.js` | schema 3, key `role|spec_label` | CONFIRMED (*"10 rodzajow zawiasow, wszystkie przypisane"*) |
| the material's key | `assignments.*.material_id` | JC's `stock_items.id` | CONFIRMED (01.11, 01:2x) |
