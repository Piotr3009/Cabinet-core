// ─── TURN 59 · F1 — THE SWITCH: TWO DOORS, ONE HOUSE ───────────────────────
//
// CLAUDE.md, F1.4, verbatim:
//
//   *"Tests (`test/turn59-f1-the-switch.test.js`): the three entries build;
//   the PRO frozen-files assertion; the import-boundary walker (parse every
//   `import` / `export … from` under `src/`, resolve, assert the rule); the
//   PRO module graph (static walk from `src/main.jsx`, or Vite's manifest)
//   contains no `src/retail/` file. **This test lands BEFORE any retail file
//   is written.**"*
//
// And it did. The frozen-files assertion, the boundary walker and the module
// graph were committed with an EMPTY `src/retail/` — the walker green over
// zero retail files, the manifest green over the 66 files of PRO. Only then
// was the first retail byte written. A guard installed after the thing it
// guards is not a guard; it is a description.
//
// ─── WHY A HASH MANIFEST AND NOT ONLY A GIT DIFF ───────────────────────────
//
// `git diff origin/main -- <the frozen paths>` is the assertion the owner
// asked for and it is here, second. It is not here FIRST, because it answers
// only where a git checkout with that ref exists — a shallow CI clone, a
// tarball, a vendored copy all make it silently vacuous, and a vacuous freeze
// test is worse than none. The 66 sha256 sums below need nothing but the
// files themselves. The two together say the same thing twice, in two
// languages, and neither can be true by accident.
//
// If a line of PRO ever legitimately changes, this manifest is the place the
// change is ARGUED — one commit that moves a hash and says why.

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname;
const SRC = join(ROOT, 'src');

/**
 * ─── AMENDED BY TURN 67 · THE FIRST NAMED CUTS INTO PRO ────────────────────
 *
 * THE REASON, in the owner's own words. Asked, 11.09.2026, whether PRO may
 * change so the room can be one window and the watch drawer can take the name
 * a client understands, he answered:
 *
 *   *"tak, zdecydowanie potwierdzam."*
 *
 * and, of the drawer:
 *
 *   *"watches szuflad jest bez sensu … tam będzie watches, belts, ties,
 *   cufflinks, biżuteria"* … *"zmień w PRO też tę nazwę."*
 *
 * This manifest is where such a change is ARGUED — T59 said so in as many
 * words: *"If a line of PRO ever legitimately changes, this manifest is the
 * place the change is ARGUED — one commit that moves a hash and says why."*
 * Tonight three hashes move and this is the argument.
 *
 * THE FREEZE IS NOT WEAKENED. It is NARROWED BY PATH:
 *
 *   · `EXEMPT` below names the three files, each with the feature that
 *     licensed it. Every one of them is RE-FROZEN at its new hash in the very
 *     same table — so tomorrow's turn is guarded at byte level exactly as
 *     yesterday's was, and the exemption bought ONE night's edit and not a
 *     standing permission.
 *   · The other sixty-three are untouched, and the git assertion below is
 *     narrowed to the same three paths rather than switched off.
 *   · Nothing was ADDED to the surface and nothing left it: the count is 66,
 *     asserted as before.
 *
 * A fourth file appearing in `EXEMPT` without a quote and a feature beside it
 * is the failure this table is shaped to make obvious.
 */
const EXEMPT = {
  'src/components/SetupArt.jsx': 'Setup UI 26.10.2026 F1: approved illustrated furniture and setup tools. *"te grafiki zrob troche lkepsze"*; *"zakoduj mi prosze te zmiany"*.',
  'src/components/Modal.jsx': 'Setup UI 26.10.2026 F1: approved large project workspace, clearer graphics and navigation. *"zakoduj mi prosze te zmiany"*; *"na 3/4 monitora"*. ' +
    'Chat fix 28.10.2026: the workspace window taller. *"modal zrob troche wyzszy zeby nie trzeba bylo scrollowac, mam na mysli stage 2"*; *"koduj tutaj"*.',
  'src/components/setup-workspace.css': 'Setup UI 26.10.2026 F1: approved large project workspace, clearer graphics and navigation. *"zakoduj mi prosze te zmiany"*. ' +
    'Chat fix 28.10.2026: type tiles 25 percent smaller, the required field in gold, four types locked coming soon, the scope choice at the top of section 2. *"kafelki za duze, przynajmniej 25 procent mniejsze"*; *"koduj tutaj"*.',
  'src/components/NewProjectFlow.jsx': 'Setup UI 26.10.2026 F1: approved large project workspace, clearer graphics and navigation. *"zakoduj mi prosze te zmiany"*; *"na 3/4 monitora"*. ' +
    'Chat fix 28.10.2026: smaller type tiles, the required field in gold, four types locked coming soon, the scope choice at the top of section 2. *"kafelki za duze, przynajmniej 25 procent mniejsze"*; *"pola ktore musza byc wypelnione powinny sie odznaczac innym kolorem"*; *"media wall utility other i hallway zostaw ale zablokuj i napisz coming soon"*; *"settings up space powinno byc w 2 nie w jedynce"*; *"koduj tutaj"*.'
    + ' T-CC1a F5 · New item: opened from a project row of the start screen (jcProject), its first section shows that Joinery Core project READ-ONLY (number, name, client) and types the item name alone (required); confirming asks cc_create_item through withDb (lib/jcList.js startItem) and builds the record with the server\'s id, the row\'s jc_project_number and the project\'s client; a refusal (403, offline) stays on the flow in words and nothing is made locally; the disabled Import from Joinery Core button is deleted; the rest of the workspace as it was. *"automatyczne polaczenie danego projektu do danego pipelinu lub production projektu"* (the owner, 30.10.2026)'
    + ' T-CC1b F4 · the type tiles\' heading is "Start from" with the help line: only the starting heights, every family is in the library. *"po co blokowac wyspe w pokoju albo mala szafe w kuchni"*, *"wszystkie rodzaje po lewej, czesc coming soon"* (the owner, 01.11.2026)',
  'src/components/WizardSummary.jsx': 'Setup UI 26.10.2026 F1: approved large project workspace, clearer graphics and navigation. *"zakoduj mi prosze te zmiany"*; *"na 3/4 monitora"*.',
  'src/components/CncTree.jsx':
    'T75 F22 · after an export the CNC view says how many parts the machine does not finish (the export\'s readiness banner), one line beside the gate\'s. *"the CNC export carries a banner counting the lines that are not `\'cut\'`."*'
    + ' DECOR F3: await packaged front/back CNC exports. *"nie mam zreob default jak uwazasz najwyzej pozneij poprawimy jedz z koksem i koduj prosze"*'
    + ' T77 F3 · the two levels of the Ornate reference files: one select, shown only to a job that carries an Ornate leaf, read by every download. *"The CNC export offers two levels in the existing export options (no new numeric field): `Reference (default)` at `sampleMm` and `Full resolution` at `fullSampleMm`; the manifest records which one was written."*'
    + ' Chat fix 17.10.2026 \u00b7 the three downloads hand each cabinet its slice of the project\'s part number plan (lib/partLabels.js): the label text on LABEL_<cabinet> in the cabinet\'s colour, numbered. *"naklejki 44 na A4 ... kolorami ... przynajmniej kolory napisow pod kolory szafki ... ponumerujemy wszystkie elementy ... ok koduj"*'
    + ' T82 F12, after the review · the CNC export\'s preflight counts what asks something of a person (engine/checks.js findingsToAct): a note (#45, the vanity\'s service void) is never "to look at". *"nastepnie to bedzie miejsce z tylu na rurki minimum potrzebujemy okolo 80 mm do 100 mm"* (25.10.2026, 12:57)',
  'src/components/SaveTemplateModal.jsx':
    'T75 F20 · right-clicked inside a selection of two or more, the modal saves a SET (templateStore.saveSet): the units left to right with the gaps between them. *"`lib/templates.js` grows `kind: \'set\'`: an ORDERED list of units (type + params, positions stripped as today) with the gaps between them."*',
  'src/components/TopBar.jsx':
    'T75 F20 · the Library menu\'s Sets row says what is on the shelf instead of "0 types". *"the Library\'s `media` category (`soon`) becomes the sets shelf (saved sets and shipped sets on one list)."*'
    + ' T78 F21 · the Output menu\'s Spraying placeholder becomes a live entry (onOpenSpraying): one page on the Production Core pattern, the spray schedule by colour, the cards and the paint order. *"cale sprayowanie jako osobne menu Cabinet Core."*'
    + ' Chat fix 17.10.2026 \u00b7 Output > Part labels (PDF): the sticker sheets (onExportLabels). *"naklejki 44 na A4 bo takie mam, kolorami ... napis co to, i strzalka co oklejamy ... ok koduj"*'
    + ' T82 F20, after the review · File > Save marks the job saved only when the save was stored (persistProject answers stored); a write the browser refused leaves it marked unsaved and says "Not saved: ...". *"do tego dodawanie loga do rysunkow musze miec dzisiaj profesjonalne rysunki dla klientow"* (25.10.2026, 11:40)'
    + ' T84 F2 · variant="studio" for the Studio\'s top bar: each header control written once and drawn by either layout (the same handler, guard and state); the Studio layout is the wordmark with the PRO label, the project name, the same menus array through the same MenuBar with orderMenus whole (every leaf, run, disabled and checked of the census), then Undo and Redo (the history store\'s, the toolbar\'s guards), Save, Brightness, Account and the gold button, Export renamed BOM with the same call setBomOpen(!bomOpen); its MockModeBadge stands on the status bar; the legacy layout is what it was. *"tak"* (the owner, 27.10.2026, 16:27, to the header\'s Export renamed BOM); *"wiem ze silnik jako tako nie ruszamy ale funkcje w menu musza sie zachowac wszystkie"* (the owner, 27.10.2026, 22:19)'
    + ' Chat fix 28.10.2026 F1 · File gains Open from file... (after Open...) and Save to file... (after Save as...): the job as one .ccproject file through lib/projectFileRoad.js, its questions in components/ProjectFileModal.jsx; before the job on the screen is replaced, the same red word about unsaved work File > Open says (warnIfUnsaved). Every other leaf, run and control as it was. *"ja mowie o pliku z CC zebym mial ten sam na innym kompie"*; *"zrobisz mi pozniej cos co zadziala, czyli export i import projektow"* (28.10.2026)'
    + ' T-CC1a F3 · the Account button (drawAccount, onAuth, topbar-account) and the legacy bar\'s mock badge are deleted with CC\'s own login and mock mode; everything else in the bar is as it was. *"oczywiscie do CC laczysz sie tylko przez JC"* (the owner, 30.10.2026)'
    + ' T-CC1a F6 · File > Open from file is the import road: the same openProjectFromFile with the Joinery Core project picker (askJcProject) beside the id-collision question; its hint says import. *"w przyszlosci nie bedzie save to file, po co?"* (the owner, 31.10.2026, 01:06)'
    + ' T-CC1b F1, F3, F4, F5 · the Studio bar reads [wordmark] [PRO] [menus] [spacer] [the job block: the item name, then <number> · <JC project name> · <client>] [Undo/Redo] [Save] [Brightness] [BOM] [Back to Joinery Core, gold, last; saves when dirty, then /dashboard.html]; the Library and Database menus are deleted, Company defaults... is Settings\' third item, Output takes its four entries\' handlers only. *"wprowadza w blad ... po prawej, z numerem projektu JC i nazwa"* (the owner, 01.11.2026); *"duzy przycisk Return to Joinery Core"* (the owner, 01.11.2026)',
  // ─── ADDED 15.10.2026 (the evening) · THE RECESS SEEN FROM THE FRONT ──────
  // The owner: *"na setup room jak widze sciane od frontu nie top tylko front
  // to nie widze kresek, gdzie jest komin i gdzie wneka"* and *"reces pionowy
  // ... na wysokosci 1000 mm ... dowolny"*. Licensed with his words, re-frozen
  // at the new hash below; the engine's half is KIT_RECESS.lsp.
  'src/components/WallElevationModal.jsx': 'Setup UI 26.10.2026 F1: approved large project workspace, clearer graphics and navigation. *"zakoduj mi prosze te zmiany"*; *"na 3/4 monitora"*. ' +
    'T78 F7 chat-fix 15.10.2026 · the FRONT view draws the top view\'s recess and chimney where they stand (a recess as its BAND, '
    + 'lib/wallElements.js recessBand), lists them, drags them sideways only and double-clicks them open; the element window of a '
    + 'recess gains Bottom and Top (mm off the floor; 0 and the wall height are the floor and the ceiling), written as bottom_mm / '
    + 'top_mm through onPlan; the recess sentence says the new law (deeper inside, an extension partly in). *"na setup room jak '
    + 'widze sciane od frontu nie top tylko front to nie widze kresek, gdzie jest komin i gdzie wneka"*; *"reces pionowy ... czy '
    + 'mozemy na niego spojrzec od czola i na przyklad zrobic go na wysokosc ... 1000 mm"*; *"4 - dowolny"*.',
  'src/components/WarehouseModal.jsx':
    'T75 F21 · the three buttons read Import from JoineryCore (CSV), Export project list for JoineryCore (CSV) and Export for JoineryCore (CSV); the project list holds the rows THIS project\'s stock carries (projectUuids), not every uuid in the warehouse (the probe exported 3 of 3 for a project naming none). *"stock połączony z joinery core, na razie export import za pomocą csv coś jak production core, później api"*.'
    + ' T78 F21 · Database > Materials gains the Paints department: the warehouse\'s twelve columns plus the paint fields (topcoat | primer, sheen, coverage m2 per litre per coat, coats, tin sizes) on the card; litres and tins are the engine\'s arithmetic, never typed. *"cale sprayowanie jako osobne menu Cabinet Core."*',
  'src/components/LibraryPanel.jsx':
    'T75 F20 · the sets shelf: the Library\'s Sets category lists the five shipped sets (engine/sets.js) above the saved ones, a saved SET row names its units, and a click inserts the whole set through the store (insertSet) where a unit would go. *"the Library\'s `media` category (`soon`) becomes the sets shelf (saved sets and shipped sets on one list)."* '
    + 'T75 F10 · a plus on an empty island face opens the library ON that face and the unit is added there (addUnit with the face\'s index). *"A unit is added to a face as to a wall (addUnit with the face\'s index; the library\'s plus points on the plan show the faces)."*'
    + ' ' + 'T75 F15 · the Extras row "Pelmet" is an ACTION done to the selected wall unit\'s run: the panel hands the store the action and the selection (libraryAction) and says its answer. *"The held-open row `cornice-pelmet` opens as a PLAIN pelmet: a flat strip under a run of wall units."*'
    + ' T86B F5 · the chest-of-drawers flyout gains Chest in the room (data-chest-in-room), which asks the variant once (ChestIslandPopup, A: back panel, B: back to back) and runs projectStore.addChestIsland: the chest on face A of an island of its own footprint at the room\'s centre, the panel or the second chest on the face behind, one slab, one undo. *"chest powinna byc mozliwosc odsuniecia od sciany ale nie na zasadzie back move tylko powinna byc mozliwosc na srodku pokoju cos jak wyspa ale przez grab i move; i dodanie panela z tylu lub polaczenie szuflad z 2 stron; chest dodany w changing room; mozliwosc dodania worktopu z naszego sprayowanego panelu nie tylko szary worktop"* (the owner, 30.10.2026, 22:52); *"nie koniecznie nawis, nawis jako opcja prosze; 1 - oba; 2 - wchodzi; 3 - dla komody oraz dla biurka, opcja inny blat tez (w przyszlosci) Hi-Macs"* (the owner, 30.10.2026, 22:56)'
    + ' T-CC1b F4, F15 · the project-type gate (projectCategory, showAllTypes, the filterLibraryByProject branch) deleted: every family shows all its entries; a row with params (the AVENTOS rows) hands them to onAdd. *"po co blokowac wyspe w pokoju albo mala szafe w kuchni"*, *"wszystkie rodzaje po lewej, czesc coming soon"* (the owner, 01.11.2026); *"szafki AVENTOS musza byc zrobione"* (the owner, 01.11.2026)',
  // ─── ADDED BY TURN 75 · THE BIG TURN ───────────────────────────────────
  'src/components/ContextMenu.jsx':
    'T75 F5 · the right-click offers the UPSTAND beside the plinth, on and off per run, and the menu is handed the two store calls it needs (addUpstand, removeUpstand). *"UPSTAND: an auto-part along the wall behind every base run that has a worktop ... on and off per run like the plinth (BACKLOG #16\'s grammar: added by a decision, visible only then)."*',
  'src/components/BomPanel.jsx':
    'T75 F22 · the cut list shows each part\'s state (Cut, Outline only, Fit on site, Bought) in a State column, and every ironmongery line says Bought. *"The cut list, the BOM and the CNC export show the state on every line."* '
    + 'T75 F21 · the purchase list is priced at what the job was quoted at (project.warehouseStamp), the file carries it, and Accept today\'s prices is the owner\'s decision to re-price. *"stock połączony z joinery core, na razie export import za pomocą csv coś jak production core, później api"*; *"prices change a quote only by the owner\'s decision"*. '
    + 'T75 F5 · the cut list and the BOM receive the room, so the worktop reaches them: its slabs (a corner is two, an L is one shaped like the L), the connector bolts as an order line, the joint and every cut-out as a NOTE. *"Done means the whole road ... lands in the cut list and the BOM."* One line: `room: project.room` handed to `buildBom`.'
    + ' DECOR F4: show the decorative construction and production status on each BOM row. *"nie mam zreob default jak uwazasz najwyzej pozneij poprawimy jedz z koksem i koduj prosze"*'
    + ' T76 F5 · the row shows the construction label under the part and its state in the T75 State column, never a second status. *"the BOM panel shows the T75 State column and the construction label, not a second status."*'
    + ' T76 F7 · the walk measured the State column past the 560 px panel (AM strips and their gluing NOTE): the material cell truncates at 160 and the state may wrap. *"Test the way the client clicks."*'
    + ' T78 F21 · the BOM\'s materials are the warehouse\'s rows with the Paints department beside them (withPaints), so the paint lines of the spray schedule reach the Purchase list with the material\'s price, or a missing price said. *"cale sprayowanie jako osobne menu Cabinet Core"*; waste *"10 percent."*'
    + ' T-CC1b F11.1 · the live BOM window shows the Assign window\'s count: <n> of <m> lines assigned, and Not assigned materials: <k> lines in red. *"materialy z JC (jego baza), przypisanie w CC, grupy ... modal duzo wiekszy i czytelny, polaczony na stale, kazda funkcja przypisana (10 rodzajow zawiasow, wszystkie przypisane), inaczej eksport BOM pisze not assigned materials"* (the owner, 01.11.2026)',
  // ─── ADDED BY TURN 75 · F7, THE CORNER NOTCH ─────────────────────────────
  // CLAUDE.md T75, FROZEN 3: *"every PRO file edited is licensed in `EXEMPT`
  // with the owner's words from this file and re-frozen at its new hash in the
  // same commit."*  The engine and the goldens are untouched by it.
  'src/components/RightPanel.jsx':
    'T75 F4/F11 · the Construction section\'s Worktop row for ONE cabinet: Add worktop where it may carry one alone (an L, a cabinet on an island), Remove, and on an island\'s slab a Seating overhang button per face with no cabinets (the profile\'s number, nothing typed). *"The L kit\'s worktop is one slab shaped like the L"*; *"a seating overhang of `profile.worktop.seatingMm = 300` offered as one click on a face with no units"*. '
    + 'T75 F9 · the Wall select names an island\'s face for what it is ("Island 1 · face A"), never "Wall 5". *"Nothing about it is a wall."* '
    + 'T75 F7 · CUT CORNER in the selected unit\'s panel: the button lights the four plan corners in the '
    + 'scene (`3d/NotchCorners.jsx`), a click on one opens the small anchored window at the click with '
    + 'WIDTH, DEPTH, HEIGHT (the profile\'s `notch.defaults`), Enter cuts through the store\'s one action '
    + '`setUnitNotch` and a refusal shows in the engine\'s words; REMOVE takes the notch off. No retail copy '
    + '(retail\'s SIZE step carries its own button). *"Klikasz \'wytnij narożnik\', program podświetla '
    + 'narożniki, wybierasz, podajesz wysokość, głębokość, szerokość (np. 200x200)."* '
    + 'T75 F23 · the Construction section\'s Joints row: Puzzle or Dowel per unit, written to the unit\'s joints_system through updateUnitParams; the status line reads the engine\'s own answer (derived.joints: the dowel count, the gate, or the refusal in its words); Cabineo shown disabled with its sentence; no typed number. No retail copy (PART G is PRO only). *"lisp najpierw."* *"a per-unit override through the unit\'s settings section (no typed numbers in the UI)."*'
    + ' DECOR F1: per-unit decorative style selection and recipe editing. *"nie mam zreob default jak uwazasz najwyzej pozneij poprawimy jedz z koksem i koduj prosze"*'
    + ' T78 F5 · the Carcass section\'s three fields read Arm A, Height, Arm B on an L; the fields and the setter are the same, the words are the L\'s. *"powiekszenie L shape szafek prawa lewa strona."*'
    + ' T78 F7 · the Drawers rows on an L are a SPACE CORNER stack: added and removed here, their heights the drawer unit\'s own split per arm, shown and not typed (no Equal heights, no field); the status line names the kit and its nominal length. *"szuflady w narozniku L shape."*'
    + ' T78 F8 · the Doors section\'s Corner doors choice on an L: Pair or Bi-fold, written as `corner_doors` through updateUnitParams; the engine\'s own sentence (CORNER_L_BIFOLD) under it; no number typed. *"zawiasy podwojne czyli jedne drzwiczki do carcasu a pozniej zawiasy od drzwiczek do drzwiczek."*'
    + ' T78 F12 / F13 · the Doors section\'s Per leaf rows: the glass kind of a glazed leaf (clear | smoke | reeded, the BOM line names it) and the hinge FAMILY of every hinged leaf (standard | wide), written per leaf as door_glass and door_hinge_family; the angle inside the family stays derived from the front thickness (T22), no number typed. *"domyslnie smoke ale z wyborem"*; *"otwieranie drzwi wiekszy kat otwarcia 180 stopni, zawiasy."*'
    + ' T78 F16 · the Drawers section\'s Double checkbox per drawer-unit row: a deep box below and an inner cutlery drawer above behind the one front, written as drawer_double[row] through updateUnitParams; the engine refuses a short row in words. *"podwojne szuflady szafki z szuflada na sztucce z bluma."*'
    + ' T78 F19 / F20 · the Construction section\'s Joints row offers the owner\'s four systems, Cabineo in its two variants (Puzzle, Dowel, Biscuit, Cabineo 8, Cabineo 12), each disabled only by its kit refusal, the status read off the engine\'s own derived.joints (biscuit sets and screws, Cabineo pockets from the outside face and the gate); the company row chooses the default, this row is the unit\'s override, the reserved id of T75 stays a refusal in words, not one number typed. *"trzeba zrobic wybor laczenia i mamy 4: puzzle, dowels, Cabineo, ciastka"*; Cabineo *"8 AND 12, chosen in the company\'s default settings."*'
    + ' T78 F17 · the Hob select on a hob unit (T75 F14\'s flag or the oven base): induction (the default, unwritten) or gas, written as hob_kind through updateUnitParams; the hood\'s clearance Check (#34) and the store\'s one-click proposal read it, the numbers stay in profile.hood.clearance. *"zeby bylo 650 do 750 minimum nad blatem, nad hobem"*; *"pozostaw to dla klienta, tylko proponuj."*'
    + ' T78 F18 · the Doors section\'s "Front opens" select on a wall unit that takes a lift (WUD, WUD_GLASS, WARDROBE_WALL): hinged (the default, no key) | HK top (lift up) | HS (up and over) | HL (lift parallel) | HF (bi-fold up), written as front_system through updateUnitParams, and under it the engine\'s own sentence of the set, the arm, the power unit and the zero holes; no number typed. *"szafki poziome otwierane do gory system blum ... podwojne drzwi pojedyncze etc."*'
    + ' CHAT FIX 15.10.2026 · the Doors section\'s Leaves row: 1 or 2 by choice, the same setDoors({ count }) pin retail\'s HOW MANY writes, each chip disabled in the one law\'s words (engine/cabinet.js leafCountRefusal: a pair under doors.minLeafWidth; a chosen single wide leaf stays the 15.08 decision); not on kits whose count is their identity nor on bay doors. *"jak mamy male drzwi, ale wciaz chce zrobic 2, to zebym mial mozliwosc podzielenia ich na 2."*'
    + ' T79 F4 . the CUT CORNER window\'s HEIGHT takes a negative number (a notch from the top, KIT_NOTCH.lsp D21) and shows it as itself, 0 still reads full; the help line reads "WIDTH along the back, DEPTH into the carcass, HEIGHT from the floor; 0 runs top to bottom; a negative HEIGHT cuts from the top (e.g. -500)." (data-testid notch-help); the cut is the store\'s one action as before. *"nie powinno być funkcji -500 na przykład i wtedy ucina od góry? i mała informacja o tym."*'
    + ' T79 F5 . the CUT CORNER row gains a second button, CUT EDGE (data-testid cut-edge): it lights the four horizontal side edges in the scene (`3d/NotchEdges.jsx`, `uiStore.edgeNotchPick`), a click on one opens EdgeNotchWindow at the click with EDGE (TB, BB, TF, BF), DEPTH and HEIGHT (the profile\'s `notch.edgeDefaults`), the help line "A rebate along the whole edge: skirting at the bottom-back, coving at the top-back." (data-testid edge-notch-help); Enter cuts through the store\'s one action `setUnitEdgeNotch` and a refusal shows in the engine\'s words (KIT_NOTCH.lsp D22); REMOVE takes it off. No retail copy (retail\'s SIZE step carries its own button). *"cut the corner działa idealnie, ale możesz zrobić mi też poziome cut? wszystkich 4 rogów?"*'
    + ' T79 F13 . the shelf row\'s face button and the drawer cap\'s Partition front edge name the project\'s numbers (carcass.shelfSetbackMm 10, wardrobe.drawers.capSetbackMm 20), no longer the deleted interiorSetback nor the LISP\'s 20; its two tooltips lose their dashes. *"wszystkie cofnięcia zmień z 20 na 10 mm, 20 to stanowczo za dużo"*; 14:17: *"tylko półki i dividery, szuflady zostaw nie ruszaj."*'
    + ' CHAT-FIX 25.10.2026 · the Attach section of a free panel: an Attach to select (wall, floor, ceiling, a unit\'s left side, right side or top, a chimney or box face) and a Gap field, through the store\'s one action `attachFreePanel`; the panel stays put afterwards (*"nie jedzie"*). *"chce tez oblozyc boxy lub kominy tez prosze z odsunieciem od nich"*; *"ten panel musi byc w miare mozliwe do ustawienia gdzie bede chcial, naprzyklad bede chcial polozyc na szafkach jako daszek albo oblozyc komin w kacie"* (25.10.2026).'
    + ' T82 F2 · the POCKET DOOR section of a HAWA pocket: Doors 1 / 2, Hand L / R (one door), Push / Pull, Class Auto / III/25 / III/35 (setPocket), Door covers (the units its door closes, the next one added beside the last or the last one left out through setPocketCovers, a refusal said in its words), and per door TB, T1, M, E1, the pocket\'s width and depth and the refusals read off the store\'s pocketFiguresFor (the engine\'s result.hawa, nothing worked out here); the Carcass Width and Depth of a pocket shown, not typed, and its Height while its door covers a cabinet. *"wysuwasz pocket door i zakrywasz szafke lub szafki"*; *"3 tak moga"*, *"4 - tak"*, *"5 - tak"* (25.10.2026).'
    + ' T82 F6 · the pocket\'s Door: Closed / Open row (PocketDoorToggle) inside its POCKET DOOR section, the doors the engine\'s, the state the room\'s openFronts. *"A toggle on the pocket (right panel: Door closed / open ...) slides the door into the pocket"*; *"wysuwasz pocket door i zakrywasz szafke lub szafki"* (25.10.2026)'
    + ' T82 F10 · the vanity\'s top is typed: one Top thickness field in the Worktop row, on a vanity\'s slab only, through the store\'s setWorktopThickness (a refusal said in words). *"dodanie blat grubosc do wyboru"*'
    + ' T82 F9 / F13 / F14 · the Vanity section of a vanity unit: Drawers 2 / 3 / 4 (the kit, swapped by the store\'s setVanityDrawers, the unit kept), Sinks 0 / 1 / 2 (CLAUDE.md F14\'s word), Floor / Floating with the height from the floor (setVanityFloating, refused in words where the room has no room), the plinth row as today (a floating vanity says it takes none); on every kit whose type takes drawer columns (the vanity and the chest of drawers) the drawer stack\'s Columns 1 / 2 row (updateUnitParams columns) and the "Equal" button (setDrawersEqual: drawer_split equal, drawer_heights null). *"vanity unit potrzebuje z szufladami nawierzchniowymi, wybor jak zawsze 2 3 i 4 ale pamietaj ze w vanity default to sa rowne, do tego prosze external drawers ale wybor 2 rows, patrz szafa ... plinth do zmiany wysokosc, propozycja floating lub on the floor, dodanie 1 sink or 2 sink?"*; *"7 - tak"* (25.10.2026).'
    + ' T82 F17 · the Back inset field ends where the store\'s clamp does (insetBackMaxFor): a free panel\'s back inset is capped by the room, the far wall less the panel, never by a cabinet\'s 300; a cabinet\'s field is what it was. *"jak mam frontowy komin to nie moge powiekszyc panela bo mi wchodzi w sciane"*'
    + ' T82 F2, after the review · the POCKET DOOR section says in red, in the Check\'s #37 sentences, a pocket the room could not re-cut to its front\'s width and a cabinet another pocket\'s door already closes. *"the room refuses in words, the engine never squashes"* (CLAUDE.md T82 LAWS)'
    + ' T82 F13, after the review: the End panels row asks unitEndPanelDrop (the kit as computeCabinet cuts it), so a floating vanity\'s end panel, cut to end with the hung carcass, reads "ends with the cabinet", never "to floor". *"plinth do zmiany wysokosc, propozycja floating lub on the floor"* (25.10.2026); Turn 13: a label that disagrees with the piece is worse than no label.'
    + ' T83 F3 · the MIRROR ON THE BACK window (MirrorBackModal, mounted beside the CUT EDGE window): the question "Mirror on the back?", No and Yes through the store\'s setMirrorBack, a refusal said in its words, opened at the click on a mirror cabinet\'s back (3d/mirrorCabinetRoom.js askMirrorBack). *"czasami jak ktos chce to bedzie mial na plecach tez, klikasz na plecy i wyskakuje ci opcja chcesz lustro na plecach?"*'
    + ' T83 F5 · the MIRROR CABINET section for the mirror cabinet only: Bays 1 / 2 / 3; Door widths, one field a bay, the sum with the stiles checked against the carcass and refused in the kit\'s words (a refused width stays in its field until the next one makes the sum; Kit\'s widths hands the doors back); Stiles LED / Timber / None and their width; Panels L / R / Top / Bottom on or off and Panel thickness; Mirror doors, Mirror back, LED under, LED inside, Bottom box on or off; Glass shelves per bay; Recess mm. Every answer goes through the store\'s one action setMirrorCabinet, and the figures are read off the engine\'s derived.mirror; the panel types no number. No retail copy. *"daj wszystkie mozliwosci z panelami, z ledami, bez, szerokosc ustawianych drzwiczek etc"*'
    + ' CHAT FIX 26.10.2026 (KIT_MIRROR.lsp D5a) · the Door widths of the MIRROR CABINET section: one door typed is one answer (the store\'s door_width), held at its number and marked with a lock; the doors not typed give way so the sum always makes the carcass, and nothing typed is refused but a width that alone leaves the other doors less than profile.mirror.minDoorMm; the lock clicked lets the door give way again (door_free); Kit\'s widths forgets every hold; no width waits refused in its field any more. *"jesli uzytkownik zmienil to ten numer juz sie nie moze zmieniac, wtedy zmieniamy tylko te ktore nie byly ruszane"*, *"program odmawia ostatniej liczby bez sensu, musi zostawic"*'
    + ' T84 F4 · the host adaptation (verify/t84/p1-host.md C): layout="embedded" fills the inspector column instead of laying the panel over the canvas (no absolute right-0, no width, no z layer), headerActions (Pin, Back to quick settings) stand INSIDE the existing header before the x on every branch (CNC sheet, nothing selected, several cabinets, one cabinet), the title gives way in the embedded header, the duplicate inline ElementSection is suppressed in the embedded layout only, and the cut-corner, cut-edge and mirror-back windows are exported so the host mounts each once while the panel is embedded; overlay, the panel is what it was, and every row, section and the x stay. *"ok jak juz bedziesz wiedzial dokladnie to tabela porownaj ze mamy wszystko nic nie zgubilismy, teraz daj do tury"* (the owner, 27.10.2026, 22:11 to 22:25); *"Suppress only the duplicate inline ElementSection in the Studio inspector; the existing part editor remains independent"* (the designer, CLAUDE.md T84 PART P (c))'
    + ' CHAT FIX 28.10.2026, 23:26 (KIT_RECESS.lsp D27) · the Section\'s drawer row says what each stack is: a column\'s stack its column and depth (result.assemblies.columnDrawers, the box side Z<k>D1-SL), never "dropped" because the full-width zone is empty; a full-width stack the carcass cannot hold says so (data-dropped-drawers) beside a Remove button (data-remove-dropped-drawers) that removes it through the store\'s own addDrawers(unit, 0). *"nie da sie tego zrobic why ?"* (the owner, a wardrobe 1200 x 2150 x 300 before a recess).'
    + ' Chat fix 29.10.2026 F1 · the Section\'s Shelves row (ShelvesHead) carries Center all and Center between, with no shelf selected first: Center all is the row\'s Even under the store\'s one name (centreShelves(unit, null), each bay on its own ladder, the same call); Center between (data-section-centre-between) arms the shared uiStore two-pick mode on this cabinet, the row says which pick is next (data-section-centre-between-step), a second press or Escape cancels, and the project store centres the shelves between the two picks or says why not (T79 F12). *"jest ta funkcja ale tylko w double click ale nie ma w carcas lub w section a powinn byc bo zaznaczyc polki i kliknac center between to za duzo i za duzo szukania"* (the owner, 29.10.2026, 06:01).'
    + ' T86B F2 · the Section shows Stack height and Partition (locked, required above the stack) for a recess column\'s stack from derived.columnStacks[zone], the same rows and words as the full-width stack (T79). *"zrob jak rekomendujesz"* (the owner, 30.10.2026, 23:02, on the Section for a column stack)'
    + ' T86B F5 · ChestIslandRow in the Carcass layout group of a chest: Stand in the room (addChestIsland on the chest itself), and on a chest that stands in the room its variant (Back panel / Back to back) and Turn 90 (rotateChestIsland, the R key with the chest selected), each refused in words where it would not fit. *"chest powinna byc mozliwosc odsuniecia od sciany ale nie na zasadzie back move tylko powinna byc mozliwosc na srodku pokoju cos jak wyspa ale przez grab i move; i dodanie panela z tylu lub polaczenie szuflad z 2 stron; chest dodany w changing room; mozliwosc dodania worktopu z naszego sprayowanego panelu nie tylko szary worktop"* (the owner, 30.10.2026, 22:52); *"nie koniecznie nawis, nawis jako opcja prosze; 1 - oba; 2 - wchodzi; 3 - dla komody oraz dla biurka, opcja inny blat tez (w przyszlosci) Hi-Macs"* (the owner, 30.10.2026, 22:56)'
    + ' T86B F8 · on a chest island\'s slab and a desk\'s slab (and nowhere else tonight) the worktop section gains Finish: Decor / Sprayed panel, Sprayed showing the fronts\' own ColourPicker and SheenSlider (reused), and Overhang (mm) writing the island\'s islandOverhangMm (a desk\'s own overhang). *"chest powinna byc mozliwosc odsuniecia od sciany ale nie na zasadzie back move tylko powinna byc mozliwosc na srodku pokoju cos jak wyspa ale przez grab i move; i dodanie panela z tylu lub polaczenie szuflad z 2 stron; chest dodany w changing room; mozliwosc dodania worktopu z naszego sprayowanego panelu nie tylko szary worktop"* (the owner, 30.10.2026, 22:52); *"nie koniecznie nawis, nawis jako opcja prosze; 1 - oba; 2 - wchodzi; 3 - dla komody oraz dla biurka, opcja inny blat tez (w przyszlosci) Hi-Macs"* (the owner, 30.10.2026, 22:56)'
    + ' T-CC1b F14 · the unit\'s front style choices are the tenant\'s (lib/tenantFlags.js frontStylesFor): the ornate styles for Skylon Joinery only; a style not offered is said in words. *"ornamenty zostaw tylko dla Skylon Joinery"* (the owner, 01.11.2026)',
  // ─── ADDED BY THE CHAT FIX OF 29.10.2026 · CENTER BETWEEN IN THE STUDIO ────
  // The piece's window is a retail copy's original (scripts/t63-copies.mjs), re-copied by the machine
  // (scripts/t78-copy.mjs T78_PRO_EDITS), never by hand; the door window's conduct (T37) is untouched.
  'src/components/DoorModal.jsx':
    'Chat fix 29.10.2026 F2 · while Center between is armed on its cabinet (uiStore.centreBetween) the piece\'s window is sticky, T33\'s prop: the two picks reach the scene instead of closing the window, and the window stays open saying which pick is next; with nothing armed every piece\'s window is what it was, and the door window keeps T37\'s conduct (dock left, sticky, its key off). The Studio walk: the lower pick closed the window, the upper became the lower, nothing centred. *"droban funcje ale jej nei ma czyli center between soprawdz jeszcze raz prosze"* (the owner, 29.10.2026, before 06:01).',
  // ─── ADDED BY TURN 76 · GPT'S DECORATIVE FRONTS, LANDED AS A PATCH ─────────
  // CLAUDE.md T76, FROZEN 3: *"every PRO file edited is licensed in `EXEMPT`
  // with the owner's words from this file (or GPT's licence line, which quotes
  // the owner's own authorisation of 9.10.2026) and re-frozen at its new hash
  // in the same commit."*  GPT's lines below are its own, as its patch wrote
  // them; the three files T75 also licensed (BomPanel, CncTree, RightPanel)
  // carry ONE entry above, T75's text and GPT's line.
  'src/components/AssignMaterialsModal.jsx': 'DECOR F4: applied strip stock badges use the same thickness validation as purchasing. *"nie mam zreob default jak uwazasz najwyzej pozneij poprawimy jedz z koksem i koduj prosze"*'
    + ' T78 F21 · the sprayed set is assigned its PAINT here, in the same modal every other material is assigned in (withPaints: the Paints department rows beside the boards), not on the Spraying page. *"cale sprayowanie jako osobne menu Cabinet Core."*'
    + ' T-CC1b F10, F12 · 1240 wide with the 13 px floor, two columns: the demand in six groups, one line per role AND spec with its JC material or Not assigned, the header count; the stock list embedded on the right. *"materialy z JC (jego baza), przypisanie w CC, grupy ... modal duzo wiekszy i czytelny, polaczony na stale, kazda funkcja przypisana (10 rodzajow zawiasow, wszystkie przypisane), inaczej eksport BOM pisze not assigned materials"* (the owner, 01.11.2026)',
  'src/components/CncView.jsx': 'ORNATE, Piotr 10.10.2026: gotowy kod wlacznei z leyersami prosze do cnc. Shows canonical reference layers and relief depth readouts without changing production export approval. ' + 'DECOR F3: explicit front/back machining preview from shared export geometry. *"nie mam zreob default jak uwazasz najwyzej pozneij poprawimy jedz z koksem i koduj prosze"*'
    + ' T79 F1 (the sheet) . CHAT FIX 19.10.2026 (re-frozen): the caption and the note stand where engine/cnc/labelAnchor.js puts them (the outline\'s own middle, the note\'s block middle), moved onto the board when the rectangle\'s middle is a window or a cut-out; a rectangle\'s sheet is byte for byte what it was. *"czasami cnc rysuje items jak 3 mm drills czy cos takiego czy litery poza elementami"*.'
    + ' T76 F4 · the readout names a V groove for what it is: V, its width at the mouth, its centre line. *"The V groove is a V ... The DXF layer name and the `front-operations.json` entry say which."*'
    + ' T77 F7 · a ready Ornate leaf on the front face says "Proposed relief reference" in the colour of its reference contours, apart from the red blocked label (since F4 a relief that built is not a fault). *"The relief is a PROPOSAL and stays one ... The slab is cut; the relief ships as CAD/CAM reference files with the state `geometry`, never as approved machining, until the owner says otherwise."*'
    + ' Chat fix 17.10.2026 \u00b7 every part\'s caption carries its project number and wears its cabinet\'s colour, from the same plan the downloads use. *"ponumerujemy wszystkie elementy ... kolory napisow pod kolory szafki ... ok koduj"*'
    + ' 14:10 \u00b7 the EDGE arrow and the line along the banded edge on every numbered board, the one geometry the DXF writes (edgeArrowGeometry). *"na projekcie nie ma strzalek ktora strone oklejamy, jak mam przykleic naklejki? ... 1 - tak ... prosze - koduj"*'
    + ' 16:10 \u00b7 a mark is drawn as the open walk it is (markPoints): the corner mark one L through the corner. *"jeden L wektor ... obok linii"*'
    + ' T79 F1 . the layer legend stands on the Changes bar (bottom-11, was bottom-3) so the bar of the one bottom-left message column never covers it. *"wszystkie informacje po zmianach które pokazujesz na ekranie proszę zrób po lewej ... powód: teraz wszystkie informacje pokazują się na środku i zasłaniają nam widok pracy."*'
    + ' T82 F15 · the front readout names a reed valley (title and vector). The owner, 25.10.2026: *"fluted teraz to sa rowki a ja potrzebuje chmurke"*'
    + ' T-CC1b F5 · the CNC workspace gains its own Export CNC / DXF button calling today\'s onExportDxfZip, the door of the deleted Output entry. *"na dole Drawings dobre, ale myli sie z Output; Output zmniejszyc"* (the owner, 01.11.2026)',
  'src/components/FrontDecorationControls.jsx': 'ORNATE, Piotr 10.10.2026: rozpisz zakoduj dokaldnei prosze i ja roto dam do clauda, ale daj gotowy kod wlacznei z leyersami prosze do cnc. Adds proposed relief note and mirror choice; no new numeric fields. ' + 'DECOR F1: editable, versioned decorative machining defaults shared with Retail. *"nie mam zreob default jak uwazasz najwyzej pozneij poprawimy jedz z koksem i koduj prosze"*'
    + ' T76 F4 · the Arch rise field goes with the ellipse it set; the defaults the controls show are the profile\'s. *"SEMICIRCULAR arch (rise = half the inner width; ... never squashed to an ellipse)"*'
    + ' T76 F6 · one prop, `fields` (PRO passes nothing and keeps every field); retail passes false and shows no number of a recipe. *"a client picks a style and gets the owner\'s recipe with NO numeric fields (lazy client law; the recipe controls are PRO\'s)"*'
    + ' T76 integration · the AH sentence gets the space GPT\'s line lacked (F2 probe). *"AH (Arched handleless) | A\'s recipe; the J-pull is chosen separately under Opening"*'
    + ' T82 F15 · a Fluted front shows Flute profile (Reeds / Grooves) and, for reeds, Reed diameter (the profile\'s ladder beside a free number), the side margin and the direction; Activate gives the new choice (FL born reeds). The owner, 25.10.2026: *"fluted teraz to sa rowki a ja potrzebuje chmurke"*, *"daj wariant b czyli na styk narazie"*, *"do tego daj ustawienie srednicy walkow tez"*',
  'src/components/PartDetailModal.jsx': 'DECOR F4: decorative layer colours follow the canonical part legend. *"nie mam zreob default jak uwazasz najwyzej pozneij poprawimy jedz z koksem i koduj prosze"*'
    + ' Chat fix 17.10.2026, 16:10 \u00b7 a mark is drawn and boxed as the open walk it is (its pts): the corner mark one L through the corner. *"jeden L wektor ... obok linii"*',
  'src/components/SettingsPanel.jsx': 'DECOR F1: project and saved-style decorative recipes. *"nie mam zreob default jak uwazasz najwyzej pozneij poprawimy jedz z koksem i koduj prosze"*'
    + ' T80 F2 · the FRONTS row (InframeRow): Lay-on or In-frame (British), one write setDesign({ inframe }), the hint and its tooltip the engine\'s (inframeHint / inframeTooltip off profile.inframe), no number typed. *"3 per projekt."* (21.10.2026, 22:40)'
    + ' T-CC1a F4 · the Project section\'s Number and Client are read-only (Joinery Core\'s, setProjectInfo no longer writes them); the item name is edited in the top bar. *"automatyczne polaczenie danego projektu do danego pipelinu lub production projektu"* (the owner, 30.10.2026)'
    + ' T-CC1b F14 · the gallery and the door styles\' select offer the tenant\'s styles (lib/tenantFlags.js): the ornate styles for Skylon Joinery only; a style not offered is said in words. *"ornamenty zostaw tylko dla Skylon Joinery"* (the owner, 01.11.2026)',
  'src/components/WizardSettings.jsx': 'Setup UI 26.10.2026 F1: approved large project workspace, clearer graphics and navigation. *"zakoduj mi prosze te zmiany"*; *"na 3/4 monitora"*. ' + 'DECOR F1: material-slot and saved-style decorative recipes. *"nie mam zreob default jak uwazasz najwyzej pozneij poprawimy jedz z koksem i koduj prosze"*'
    + ' T80 F2 · the FRONTS row under the Sheen, SettingsPanel\'s own InframeRow imported (one row, two surfaces). *"3 per projekt."* (21.10.2026, 22:40)'
    + ' T86B F7 · ONE row Dimension colour (data-settings-dimension-colour) in the settings.dimensions node: the profile\'s two inks as radio chips at 13 px, reading uiStore.dimensionColour and writing setDimensionColour; Start and Save never touch it (not a project field). *"menu, patrz SS: dimension powinien pojsc do glownego paska, ustawienie koloru wymiarowania powinno byc w settings nie tutaj"* (the owner, 30.10.2026, 21:54)'
    + ' T-CC1a F4 · the edit door\'s Number and Client are read-only (Joinery Core\'s, setProjectInfo no longer writes them); the item name is edited in the top bar. *"automatyczne polaczenie danego projektu do danego pipelinu lub production projektu"* (the owner, 30.10.2026)'
    + ' T-CC1b F14 · the fronts\' style choices offer the tenant\'s styles (lib/tenantFlags.js): the ornate styles for Skylon Joinery only; a style not offered is said in words. *"ornamenty zostaw tylko dla Skylon Joinery"* (the owner, 01.11.2026)',

  // ─── ADDED BY TURN 74 · THE OWNER'S LIST OF 23.09 ────────────────────────
  // CLAUDE.md T74, FROZEN 3: *"every PRO file edited is licensed in `EXEMPT`
  // with the owner's words from this file and re-frozen at its new hash in the
  // same commit."*  Overturnable with one word each: the engine, the goldens
  // and the cut path are untouched by every entry below.
  'src/components/DrawRoomModal.jsx': 'Setup UI 26.10.2026 F1: approved large project workspace, clearer graphics and navigation. *"zakoduj mi prosze te zmiany"*; *"na 3/4 monitora"*. ' +
    'T75 F9 · "the project\'s room has N walls today" counts the room\'s own walls, never an island\'s faces. *"A face is NOT plaster."* '
    + 'T74 F3 · the Wall length field opens with the focus and its whole number '
    + 'selected (T73 F3\'s ref, `focus()` then `select()`), a refused number stays '
    + 'selected, and Escape cancels a typed number before it closes the window. '
    + '*"pole ... od razu ma focus i całą wartość zaznaczoną (np. 3437, piszę 3500 '
    + 'bez myszki) ... Escape anuluje."* T74 F4 · the first save of a drawing is a NEW '
    + 'room: `setRoom(..., { replace: true })` clears the old room\'s openings, boxes and '
    + 'wall elements. *"Przy tworzeniu nowego pokoju po starym jeden nachodzi na drugi '
    + 'zamiast resetu."*',
  'src/components/UnitSizeModal.jsx':
    'T74 F7 · the wardrobe wall unit\'s DEPTH is a figure like its width and height, and '
    + 'the size window it opens carries a Depth field and BACK | FRONT beside it (the store\'s '
    + '`alignUnitDepth`, one writer). No other type gains a field. The clicked figure\'s '
    + 'field is asked for the caret on a short timer until it has it (the walk found one '
    + 'frame was not always enough). *"Zmiana przez klik w wymiar (szer/wys/głęb), głębokość '
    + 'wyrównana do tyłu albo do frontu."*'
    + ' T78 F5 · an L\'s two fields read ARM A (its width) and ARM B (its depth), both in the window, each through the same setter, which clamps each arm alone. *"powiekszenie L shape szafek prawa lewa strona."*',
  'src/components/ElementProperties.jsx':
    'T74 F6 · the SECOND shoe drawer\'s own height is shown, not edited: it is set by its '
    + 'MOUNTING HEIGHT (its drag and its clickable distance, one clamp). *"Regulacja = '
    + 'WYSOKOŚĆ MONTAŻU, nie wysokość szuflady."* T74 F13 · the FREE PANEL\'s two rows, '
    + 'how it stands (along or across the wall; vertical, horizontal or any angle) and its '
    + 'board (length, width, thickness), each through `updateUnitParams`. *"ustawia '
    + 'pion/poziom/każdą orientację, długość, grubość."* Before that, T72 F2 · `shelf-type` becomes '
    + 'two chips and SET BACK FROM THE FRONT gains `20 mm` | `Flush` beside its field; F3 · '
    + 'CENTER ALL at the bottom of the shelf menu; F6 · the board picker carries '
    + '`data-board-thickness` so the room\'s sheet can name what it hides instead of taking '
    + 'every `<select>` in the dock; F12 · the divider reaches the same setback row. *"nie '
    + 'choose, tylko te 2 opcje."*'
    + ' T79 F12 · Center between beside Center all, the same width: one click arms the shared uiStore\'s two-pick mode, the panel says which pick is next, Escape cancels. *"naciskasz wycentruj pomiędzy, wybierasz dolny i górny element i wtedy wszystkie półki pomiędzy tymi elementami się centrują."*'
    + ' T79 F13 . SET BACK\'s standard chip is the project\'s setback, carcass.shelfSetbackMm for a shelf and carcass.dividerSetbackMm for a divider (10), no longer the LISP\'s 20; Flush and the field unchanged. *"wszystkie cofnięcia zmień z 20 na 10 mm, 20 to stanowczo za dużo"*; 14:17: *"tylko półki i dividery, szuflady zostaw nie ruszaj."*'
    + ' T79 F16 · the shelf\'s Type field gains a `Restore sleeve rows` button (data-restore-sleeve-rows), shown only when the shelf carries `sleeves_dropped`, calling the store\'s `restoreSleeveRows`. *"przycisk Restore sleeve rows"*, accepted by the owner 14:55: *"ok daj"*'
    + ' T82 F18 · the free panel\'s Thickness field gains the ladder 18, 22, 25, 30, 36 (profile.freePanel.thicknessLadder, PROPOSED) beside the free number, each chip through updateUnitParams({ board_t }); the number stays the typed road. *"nie moge wizualnie zwiekszyc tez grubosci tego panela"*'
    + ' Chat fix 28.10.2026 (KIT_RECESS.lsp D22) · the divider\'s position gains `Align with recess` (data-partition-align-recess) under its field, shown only while the cabinet has a recess band and the divider does not stand on its nearer edge (recessColDividerX), through the same setPartitionX. *"odsunac diverted po lewej i po prawej rowno z wneka, zeby zamontowac szuflady"*; *"dokladnie, mozesz zakodowac prosze"*, *"szuflady tez prosze"*.'
    + ' The same evening, after the owner\'s walk at home (KIT_RECESS.lsp D26) · with TWO dividers the button reads `Align both with recess` and one press stands both on the edges, at the face, through the store\'s one action `alignDividersWithRecess` (one undo); the button reads the store\'s `recessAlignPlan` and goes once they stand there. *"problem polega na tym ze nie dzialaja te szuflady"*.',
  // ─── ADDED BY TURN 72 · THE FOURTEEN THINGS THE OWNER CLICKED ON ─────────
  // The owner, 22.09.2026, walking the RETAIL configurator and naming what a
  // client cannot reach. Three of his fourteen points are answered in PRO's own
  // files, because 1:1 = COPY and a retail copy may not be edited: the shelf's
  // TYPE and its SETBACK (*"nie ma opcji back 20 mm, czyli regulacji
  // głębokości, ani nie ma wyboru fix / adjustable, nie choose, tylko te 2
  // opcje"*), the SPACING chain's CENTER ALL (*"dodaj na dole tego modalu
  // CENTER ALL"*), the door's HINGES (*"mamy fajny w PRO to menu z zawiasami i
  // ze strzałkami up and down, skopiuj z PRO"*) and the J run as a NUMBER
  // (*"przesuwanie powiększenia J-hand nie może być przesuwakiem, musimy
  // wpisywać liczby"*). Each is re-frozen at its new hash below and re-copied
  // the same night by `scripts/t72-copy.mjs`. Overturnable with one word: the
  // engine, the goldens and the cut path are untouched by every one of them.
  'src/components/JpullRunModal.jsx':
    'T72 F4 · the run length is a NUMBER FIELD with the engine\'s own min and max beside '
    + 'it; the slider is gone and T57\'s *"pasek albo pokrętło"* is set aside for this one '
    + 'field on his word. *"nie może być przesuwakiem, musimy wpisywać liczby, nie będziemy '
    + 'próbowali trafić na ten sam numer co sąsiednie drzwi."*',
  // ─── ADDED BY TURN 71 · THE DRAWING SET REACHES THE WINDOW ───────────────
  // The owner, 21.09.2026, Skylon Joinery's own AutoCAD set on the table:
  // *"nasze w CC teraz się nakładają, a tutaj jest wszystko osobno … mega
  // profesjonalnie … nie zapomnij zostawić w stopce miejsca na firmę, daty,
  // nazwy"*, then *"weź zakoduj i zobaczymy co się dało z tym zrobić"*. The
  // set is the engine's (`engine/drawings/set*.js`); the two files below are
  // where PRO reaches it: the window hands the set the design layer's worktops
  // and the scene's render, carries the title block's words, and walks the
  // numbered sheets; the page hands the window the render rig. Both are
  // re-frozen at their new hashes below. Overturnable with one word: without
  // these two edits the set still binds from the engine, with no render on the
  // visualisation sheet and no way to type the company's name.
  'src/components/DrawingModal.jsx':
    'T71 F5: the window binds the SET: `worktops: worktopsOf()`, the render '
    + 'captured through the Output ▸ Render rig, the title block\'s fields, the '
    + 'numbered sheet buttons. *"nie zapomnij zostawić w stopce miejsca na '
    + 'firmę, daty, nazwy"*.'
    + ' T81 F2 · the window says the set in the owner\'s order (the 3D, every wall\'s fronts, without fronts, X-ray, the plans, the sections, the visualisation, the cut list); its sheet buttons walk the list the engine returns. *"najpierw chce widziec 3d jak zrobiles pierwsza strona, pozniej chce widziec wszystkie fronty ... nastepnie widok wszystkich scian bez frontow ... pozniej przekroj z gory, i pozniej przekroje pionowe, a na koncu wizualizacja"* (22.10.2026, 21:23)'
    + ' T82 F20 · the Title block gets a LOGO row beside Company ("Choose image", a PNG, JPG or SVG read by lib/drawingExport.js readLogoFile, and "Remove"), the logo kept with the company (`setTitleBlock({ company: { logo } })`), so it is remembered on this computer where the company name is. *"do tego dodawanie loga do rysunkow musze miec dzisiaj profesjonalne rysunki dla klientow"* (25.10.2026, 11:40)'
    + ' T82 F20, after the review · the logo is kept once on this computer, and when the browser refuses to keep it the window says so (setTitleBlock answers { remembered }). *"do tego dodawanie loga do rysunkow musze miec dzisiaj profesjonalne rysunki dla klientow"* (25.10.2026, 11:40)'
    + ' T83 F11 · the Drawings window\'s Set tab: a check box per sheet beside its button (all on by default, the window keeping the names left out), All and None, the count of the ticked; Drawing set (PDF) and Wall DXF bind the ticked sheets in the set\'s order (engine/drawings/wallSheets.js pickedSheets), each page\'s SHEET cell counting the pages bound (numberPages); nothing ticked is refused in words; the choice is the window\'s own state, never the project. *"daj mozliwosc exportowania tylko naprzyklad frontow lub cos takiego, nie koniecznie wszystkie strony na raz"* (25.10.2026, 22:41)'
    + ' T-CC1b F6, F7, F8, F13 · one window "Drawings": the walls set alone (the kind row, Card, Front only, All units, Drawing set, Export SVG and the booklet, svg and per-sheet pdf roads deleted), footer Close, Wall DXF, Export PDF; the company logo from Joinery Core by default with Insert other logo and Use company logo; the two angles, the user\'s render and the AI picture as sheets; the AI card mounted. *"usunac przyciski all units i drawing set pdf, tylko export pdf"*; *"logo domyslne z JC albo przycisk wstaw inne logo"*; *"dodac wizualizacje z drugiego kata, render wedlug wyboru"* (the owner, 01.11.2026)',
  'src/pages/ConfiguratorPage.jsx':
    'T75 F22 · the Output menu\'s DXF export says the same banner as the CNC view\'s. *"the CNC export carries a banner counting the lines that are not `\'cut\'`."* '
    + 'T75 F20 · a Media wall, Sideboard, Vanity, Utility or Hallway job\'s first plus puts its shipped set on the first wall (insertSet, Room refuses first). *"NEW PROJECT with one of them offers the set first (the first plus point on the first wall)."* '
    + 'T75 F5 · the BOM file is handed the room so the worktop that turns the corner (two slabs and one joint record) rides the file as it rides the panel. *"daj od razu narożniki przemyślane."* '
    + 'DECOR F4: pass actual stock to decorative strip assignment checks. *"nie mam zreob default jak uwazasz najwyzej pozneij poprawimy jedz z koksem i koduj prosze"*. '
    + 'T71 F5: `<DrawingModal rig={renderRig} />`, and the menu path binds the '
    + 'same set with the same worktops and render. *"weź zakoduj"*.'
    + ' T77 F3 · Output > CNC / DXF writes the Ornate reference files at the level the CNC panel chose. *"The CNC export offers two levels in the existing export options (no new numeric field): `Reference (default)` at `sampleMm` and `Full resolution` at `fullSampleMm`; the manifest records which one was written."*'
    + ' T78 F21 · the Spraying page is mounted beside the other output windows (the modal layer\'s spraying entry). *"cale sprayowanie jako osobne menu Cabinet Core."*'
    + ' Chat fix 17.10.2026 \u00b7 onExportLabels writes the sticker sheets (lib/labelsPdf.js) from the project\'s part number plan; the Output menu\'s DXF ZIP takes the cabinet\'s labels slice. *"naklejki 44 na A4 ... ponumerujemy wszystkie elementy ... ok koduj"*'
    + ' T79 F1 . the messages and the front-gap rows stand in ONE bottom-left column (components/Messages.jsx, the rows as its top slot through a wrapper, FrontGapWarnings.jsx untouched); the lone Messages mount after the context menu is gone. *"wszystkie informacje po zmianach które pokazujesz na ekranie proszę zrób po lewej, niech one tam znikają, można na dole po lewej zrobić jakby listę rozwijaną i tam historia zmian; powód: teraz wszystkie informacje pokazują się na środku i zasłaniają nam widok pracy."*'
    + ' T79 F18 · onExportLabels takes { sheet } from the two Output entries (21 per sheet, Avery L7160; 44 per sheet) and hands that preset of profile.labels.sheets to exportLabelsPdf; the default stays L7160. *"przełącznik 21/44 naklejek w oknie eksportu"* (the handover), the owner 14:55: *"ok daj"*'
    + ' T80 F10 · the in-frame checks #40 to #44 stand in the left column beside the front-gap rows (components/InframeWarnings.jsx, the same findings the Check panel reads, the same fly-to). *"Each in the left messages and in the Check panel."* (CLAUDE.md T80 F10); the owner: *"3 mm zawsze."* (21.10.2026, 22:03)'
    + ' T82 F12, after the review · the page\'s export preflight counts what asks something of a person (engine/checks.js findingsToAct): a note (#45, the vanity\'s service void) is never "to look at". *"nastepnie to bedzie miejsce z tylu na rurki minimum potrzebujemy okolo 80 mm do 100 mm"* (25.10.2026, 12:57)'
    + ' T82 F20, after the review · File > Save as marks the job saved only when the copy was stored; a refused write leaves the job as it was, unsaved, and says so. *"do tego dodawanie loga do rysunkow musze miec dzisiaj profesjonalne rysunki dla klientow"* (25.10.2026, 11:40)'
    + ' T84 F2 · under the Studio face (the flag App.jsx hands it) the page renders StudioShell round the EXISTING scene, the top bar the same TopBar with variant="studio" and the same handlers, the Changes bar on the status bar (the shell provides ChangesBarRehomed; the page\'s Messages is left as it was); the legacy face is what it was. *"nie, juz jest przy wyborze"* (the owner, 27.10.2026, 16:27)'
    + ' T84 F4 · under the Studio face the right panel is not laid over the scene: it stands in the inspector column (InspectorHost), and the BOM no longer replaces it. *"ok jak juz bedziesz wiedzial dokladnie to tabela porownaj ze mamy wszystko nic nie zgubilismy, teraz daj do tury"* (the owner, 27.10.2026, 22:11 to 22:25)'
    + ' T84 F5 · the status bar\'s issue counters, the strip and the refused field handed to the shell, and the unit issue marker registered in the scene\'s one adornment slot while the Studio face is mounted. *"napewno naprzyklad wszystkie bledy zolte i czerwone sa totalnie niewidoczne, mala czcionka etc"* (the owner, 27.10.2026, 16:27)'
    + ' T84 F6 · under the Studio face the scene\'s edge is the four toggles, View and the camera bar (Drawings opens the drawing window, the preview), and the canvas toolbar is not rendered; the legacy face keeps it. *"wiem ze silnik jako tako nie ruszamy ale funkcje w menu musza sie zachowac wszystkie"* (the owner, 27.10.2026, 22:19)'
    + ' T84 F7 · the rail\'s popups (Add, Materials) handed to the shell, and under the Studio face the page\'s own Escape branch is off: the shell\'s one keydown owner keeps one key event, one action. *"czy zadna funkcja nam nie zginie? np corners etc"* (the owner, 27.10.2026, 22:13)'
    + ' Chat fix 30.10.2026 F2 · InspectorHost takes the strip only (RefusedField, the card\'s field, is deleted with the card). *"nie nie nie, zwijanie musi byc oczywiscie tak jak bylo zeby bylo widac ze jest osobne menu, tylko ten jeden przycisk usun, Full settings"* (the owner, 30.10.2026)'
    + ' T-CC1a F3 · the AuthModal import, its onAuth prop and its \'auth\' mount are deleted with CC\'s own login. *"oczywiscie do CC laczysz sie tylko przez JC"* (the owner, 30.10.2026)'
    + ' T-CC1a F8 · the four triggers of the one save (lib/saveTriggers.js): Ctrl+S / Cmd+S beside Ctrl+Z, the autosave every profile.save.autosaveMinutes when dirty, the crash buffer flushed and the keepalive save on pagehide; the six export callbacks run after the save settles when the item is dirty (saveFirst); the exports themselves untouched. *"dopiero caly json powinien sie zapisac do DB przy nacisnieciu Zapisz lub co 5 minut automatycznie"* (the owner, 30.10.2026)'
    + ' T-CC1b F2, F5, F9.3 · the scene corner\'s View dropdown (SceneViewMenu) and its mount deleted, the onDrawing road of the deleted Output entries deleted, the CNC view receives onExportDxfZip for its own Export CNC / DXF door, JcStockModal mounted on \'jc-stock\'. *"dwa menu View, jedno wystarczy, menu wystarczy"* (the owner, 01.11.2026)',
  // ─── RENEWED BY TURN 69 · THE SAME FILE, A SECOND LICENSED NIGHT ─────────
  // The exemption bought ONE night and not a standing permission — T67 said so
  // — so tonight's edit is argued here again, with tonight's quote and
  // tonight's hash. The map does NOT grow: the count below is still three.
  'src/components/RoomModal.jsx': 'Setup UI 26.10.2026 F1: approved large project workspace, clearer graphics and navigation. *"zakoduj mi prosze te zmiany"*; *"na 3/4 monitora"*. ' +
    'T75 F9 · the island\'s figure keeps the field it opens: the same press no longer takes the focus off it (the walk\'s one FAIL). *"the island draggable in the plan with its dimension labels clickable (T73 F3 field)"*. '
    + 'T75 F9 · Room setup gets ADD ISLAND (a kitchen job\'s only: the gate is the job\'s family, which retail never meets), the island drawn in the plan, dragged whole and refused in words where it would stand on a cabinet, a box or outside the room, its two figures clickable into a focused, selected field, Rotate 90° and Remove island. *"twoja droga, plus dodawanie szafek po bokach lub end panele, w całości."* '
    + 'T69 F1 · the preset row becomes 1 WALL · 2 WALLS · 3 WALLS · DRAW ROOM…, '
    + 'IMPORT DXF is struck out (*"to nie przejdzie"*), and APPLY is fixed at the '
    + 'two sites its probe convicted: it sends only the keys this window changed, '
    + 'and it is never drawn dead and silent. *"APPLY does nothing — probe first."*'
    + ' Owner 14.10.2026 (chat-fix, re-frozen): ADD ISLAND applies the room as drawn and opens the island PLAN over the canvas (3d/IslandPlan.jsx) instead of dropping a core into the draft. *"przy dodaniu wyspy chciałbym żeby był widok z góry i proponowana na podłodze plan wyspy ... dopiero jak się wstawi to wtedy pokaże się cała wyspa."*'
    + ' CHAT FIX 17.10.2026 (re-frozen): the window is 1290 px wide, the plan inside it untouched. *"menu setup room (caly modal poszerz prosze o 50 procent)"*; *"modal tylko powieksz"*.',
  'src/components/AddItems.jsx':
    'T75 F19 · two rows, Hooks (a row of the profile count, one BOM line, its qty the count) and Valet rod, added through the same bought-mechanism panel the trouser pull-out uses. *"Two rows in Add items for the wardrobe family: `Hooks` (a row of N, BOM line, placeholder bodies, zero holes) and `Valet rod` (pull-out, BOM line, placeholder, zero holes)."* '
    + 'T75 F16 · the shoe box row says a chest of drawers IS its drawers (the store has always refused a shoe drawer in a ratio stack), and the trouser pull-out and tie rack rows say they go in a wardrobe: a chest stands beside one. *"`WARDROBE_CHEST2 / 3 / 4` copied from `BUDR2 / BUDR / BUDR4`, family wardrobe ... Wardrobes category."* '
    + 'T67 F9 · the label "Watch drawer" becomes "Accessories drawer" on the row, the '
    + 'button and the two notices. *"zmień w PRO też tę nazwę."*'
    + ' T78 F9 · a Carousel row on the L only: one click fits or takes out the bought mechanism through the store\'s `setCornerKit` (one BOM line, a placeholder body, zero holes; a fixed shelf in its way is refused in words). *"krecacy sie naroznik na garnki w srodku."*'
    + ' T78 F11 · a Blind corner pull-out row on the blind kits only (Hafele), through the same setCornerKit: one BOM line, a placeholder body behind the blank, zero holes; a fixed shelf in its way is refused in words. *"hafele naroznik slepy czyli wysuwane."*'
    + ' T79 F2 . the shelves\' WHICH SIDE gains a third button, Above divider, shown only while the divider ends under a FIX shelf below the top; hovering lights the full-width opening over it and Add centres full-width shelves there; an opening that goes away while picked asks for a bay again, never a mute Add. *"jak dodamy fix półkę i divider pod spodem to nie mam możliwości dodania całkowitej półki powyżej bo kod dzieli mi całą szafę na bay 1 i 2, a nie mam czegoś takiego że jest bay nie dzielony powyżej."* Mockup approved 14:45: *"1 - tak."*'
    + ' T79 F3 · the internal drawers block asks COLUMNS 1 or 2 beside the count while the unit is undivided; 2 adds one divider mid-width, a stack in each column and one fixed shelf over both in one undo; a divided unit keeps "Which column". *"jak ustawiamy sobie teraz 3 szuflady internal to niech pyta czy chcesz 1 czy 2 kolumny, coś jak baye."*; mockup approved: *"2 - tak."*'
    + ' T79 F11 . the With a shelf / Rail alone toggle, its state and the assembly hint are deleted (kasacja); Add hanger rail adds the rod alone and says the drag proposes its place under a shelf. *"zlikwiduj propozycję install rail with or without shelf, bez sensu, usuń to; przy przesuwaniu zaproponuj 50 mm poniżej półki."*'
    + ' CHAT FIX 19.10.2026 (re-frozen): Add hanger rail asks the store why not (a third rod, or no room under the first) and says it in words; a second rod in the same bay is born 950 under the first as a proposal (KIT_HANGER_TWO.lsp). *"nie ma mozliwosci dodania drugiego ponizej, dodaj to prosze, i proponuj (jak polki) 950 jedne od drugiego"*; *"tak ale tylko jako propozycja"*.'
    + ' CHAT FIX 29.10.2026, 00:18 (KIT_RECESS.lsp D28) · before a recess with two edges inside the cabinet, the internal drawers\' COLUMNS row gains a third answer, Recess (data-drawer-columns="recess"), with its hint (data-drawer-recess-hint): the two dividers on the recess\'s edges and the drawers between them, as deep as the recess, in one step through the store\'s addRecessDrawers; the drawers that went into the recess say so in the store\'s own notice. *"nadal nie rysuje we wnece nic, nie dodaje tych bocznych paneli, nie wiem co sie dzieje"* (the owner, 29.10.2026).',

  // ─── RENEWED BY TURN 72 · THE SAME FILE, A THIRD LICENSED NIGHT ─────────
  // The exemption bought ONE night and not a standing permission, so tonight's
  // edit is argued again with tonight's quote and tonight's hash. The map does
  // not grow by this entry: the file was already on it.
  'src/components/WatchLayoutModal.jsx':
    'T72 F9 · GLASS ON TOP becomes `Off` | `On`, DRAWER HEIGHT arrives with its '
    + '"Proposed NNN" chip, and FELT BASE brings its four colours. Nothing is taken: '
    + '`Sprayed` stands and `Veneer` never existed here. *"powinien mieć wysokość '
    + 'szuflady zaproponowaną, ten co jest default; usuń Veneer, dodaj materiałowe dno '
    + '… tylko te 4 kolory filcu."*',
  // CLAUDE.md T78, FROZEN 3: *"every PRO file edited is licensed in `EXEMPT`
  // with the owner's words from this file and re-frozen at its final hash in
  // the same commit."*
  'src/components/CompanyDefaultsModal.jsx':
    'T78 F19 · the Joints choice on the company defaults screen: the owner\'s four joint systems, Cabineo in its two variants, as ids (puzzle | dowel | biscuit | cabineo8 | cabineo12) through the same Choice select every other preference uses, written as joints_system; never a number (the validator refuses a typed pitch or diameter as it refuses the hinge angle, T22). *"mamy puzzle i dogbones w systemie i niech tak bedzie ale tez trzeba zrobic wybor laczenia i mamy 4: puzzle, dowels, Cabineo, ciastka"*; *"Cabineo 8 AND 12, chosen in the company\'s default settings."*',
  // CLAUDE.md T78 F21: *"cale sprayowanie jako osobne menu Cabinet Core"*: a
  // NEW PRO surface, licensed the night it is born and frozen at its hash.
  // CLAUDE.md T80 F10: *"Each in the left messages and in the Check panel."*
  // A NEW PRO surface, licensed the night it is born and frozen at its hash.
  'src/components/InframeWarnings.jsx':
    'T80 F10 · the in-frame checks (#40 front not 22, #41 not butted, #42 the frame stops, #43 joined, #44 the cup and the lip) as rows in the bottom-left column, read from useCheckFindings (nothing computed here), a click flies by useGoToSubject. *"Each in the left messages and in the Check panel."* (CLAUDE.md T80 F10); the owner: *"drzwi 22 i jest idealnie"*, *"3 mm zawsze."* (21.10.2026, 22:03)',
  'src/components/SprayingPanel.jsx':
    'T78 F21 · Output > Spraying, one page on the Production Core pattern (mockup v2 of 11.10): the SPRAYING INFORMATION card, PART A ELEMENTS by colour, PART B CARDS open, PART C PAINT, Export PDF; every number the engine\'s (engine/spray.js off profile.spray), a typed note per line printed. *"cale sprayowanie jako osobne menu Cabinet Core"*; *"edges in m2 for the paint and in lm beside it; waste 10 percent."*'
    + ' T-CC1b F12 · .cc-modal-wide, the 13 px floor, the table takes the window\'s width (the fixed column widths go). *"Spraying: okno duze a fonty male i duzo pustego miejsca, jak ty to zawsze robisz"* (the owner, 01.11.2026)',
  // CLAUDE.md T79 F1, FROZEN 3: *"every PRO file edited is licensed in `EXEMPT`
  // with the owner's words from this file and re-frozen at its final hash in
  // the same commit."*
  'src/components/Messages.jsx':
    'T79 F1 . all three levels stand in ONE bottom-left column (the centre and the bottom-centre blocks deleted), the newest nearest the Changes bar under them; the bar opens the list of the last profile.ui.messages.historyMax messages (newest first, HH:MM, the level\'s dot, the text, Clear), collapsed by default, Escape collapses it, never saved; a folded yellow or grey says its count once (its text), a red beside it. *"wszystkie informacje po zmianach które pokazujesz na ekranie proszę zrób po lewej, niech one tam znikają, można na dole po lewej zrobić jakby listę rozwijaną i tam historia zmian; powód: teraz wszystkie informacje pokazują się na środku i zasłaniają nam widok pracy."*'
    + ' CHAT FIX 19.10.2026 (re-frozen): the grey card is translucent (bg-shell-800/70); the timing is the store\'s and engine/messages.js hideMs (every level leaves on its clock: 4 s, reds 8 s; the Changes row stays). *"ma sie chowac po kilku sekundach i byc przezroczysty"*; asked "wszystkie chowaja sie po 4 s, czerwone po 8 s, historia zostaje, tlo przezroczyste 70 procent?": *"tak pls"*.'
    + ' CHAT FIX 19.10.2026, the afternoon (re-frozen again): the open Changes list closes itself after engine/messages.js historyOpenMs (profile.ui.messages.historyOpenMs, 10 s, PROPOSED); the bar and the rows stay. *"changes chat can we keep close, nawet jesli uzytkownik otworzy czy mozemy za jakis czas zamknac? bo za bardzo przeszkadza"*.'
    + ' T84 F2 · the Changes bar re-homed: HistoryBar is exported so the Studio status bar draws the same component (the same list, the same Escape, the same clocks), and the column leaves its own out when told so (history={false}, or the ChangesBarRehomed context the Studio shell provides); the legacy face passes and provides nothing and is what it was. *"czy zadna funkcja nam nie zginie? np corners etc"* (the owner, 27.10.2026, 22:13)',
  // CLAUDE.md T79 F12: the shelf menu's Center between stands in this window
  // too, so a click in its own canvas must be able to be the pick.
  'src/components/CabinetEditorModal.jsx':
    'T79 F12 · Center between armed from the shelf menu in this window: a click on a shelf, the drawer cap, the bottom or the top in its canvas is handed to the uiStore\'s selectElement as a pick (as the room hands it), any other click ends the mode, and Escape ends the picking while the piece stays in hand. *"naciskasz wycentruj pomiędzy, wybierasz dolny i górny element i wtedy wszystkie półki pomiędzy tymi elementami się centrują."*'
    + ' CHAT FIX 19.10.2026 (re-frozen): Delete and Backspace on the piece picked in this window go through the room\'s one action, deleteSelectedElement (lib/deleteKey.js guard, the selection falls where the plan says, a refused piece answers in words); the Remove button untouched. *"zeby cos wykasowac trzeba isc do menu i nacisnac delete item, a nie ma zaznaczenia itemu i nacisniecie delete"*.',
  // CHAT FIX 19.10.2026: the second rod in a bay (KIT_HANGER_TWO.lsp).
  'src/components/RailModal.jsx':
    'T79 F11 (the rod alone), CHAT FIX 19.10.2026 (re-frozen): the window finds its rod BY ITEM ID first (the store\'s railTravelFor reads it so); a second unit-wide rod is published among the column rods with no column, and the zone alone would name the first. *"nie ma mozliwosci dodania drugiego ponizej, dodaj to prosze"*.',
  // CLAUDE.md T82 FROZEN 4: *"every PRO file edited is licensed in `EXEMPT` with the owner's words from this
  // file and re-frozen in the same commit."*  T82 F6: the canvas toolbar's Open all takes the HAWA door.
  'src/components/CanvasToolbar.jsx':
    'T82 F6 · Open all takes the HAWA pocket door with every other door. *"A toggle on the pocket (right panel: Door closed / open; the same in the viewer\'s "Open all" of T69) slides the door into the pocket"*'
    + ' T82 F12, after the review · the Check button\'s count is what asks something of a person (engine/checks.js findingsToAct): a note (#45, the vanity\'s service void) is never "to look at". *"nastepnie to bedzie miejsce z tylu na rurki minimum potrzebujemy okolo 80 mm do 100 mm"* (25.10.2026, 12:57)'
    + ' T84 F6 · the doors Open all / Close all walks (the HAWA door with every other), and whether every one is open, gathered by one exported hook (useDoorEntries, the bar\'s own code moved unchanged) that the Studio\'s Open all toggle reads too; the toolbar is what it was. *"wiem ze silnik jako tako nie ruszamy ale funkcje w menu musza sie zachowac wszystkie"* (the owner, 27.10.2026, 22:19)',
  // T82 F12: the Check panel draws the note level (TONE.note), the service void behind a vanity.
  'src/components/CheckPanel.jsx':
    'T82 F12 · the Check\'s note level drawn grey (TONE.note): #45, the service void behind a vanity, is a note, never a fault. *"nastepnie to bedzie miejsce z tylu na rurki minimum potrzebujemy okolo 80 mm do 100 mm"*'
    + ' T84 F5 · the list reads the uiStore\'s checkFilter: \'red\' or \'yellow\' (a status bar counter\'s click) lists that level only, under a line that says so with Show all; \'all\', which the legacy face never changes, is the panel as it was; the findings and their words are the engine\'s. *"napewno naprzyklad wszystkie bledy zolte i czerwone sa totalnie niewidoczne, mala czcionka etc"* (the owner, 27.10.2026, 16:27)',
  // T82 F20, after the review: a refused save leaves the job marked unsaved (persistProject answers stored).
  'src/components/DesignSettingsModal.jsx':
    'T82 F20, after the review · Update and save marks the job saved only when the save was stored; a write the browser refused leaves it marked unsaved and says "Not saved: ...". *"do tego dodawanie loga do rysunkow musze miec dzisiaj profesjonalne rysunki dla klientow"* (25.10.2026, 11:40)',
  // T82 F20, after the review: the start screen reads whether the shelf took the brand-new job.
  'src/components/StartScreen.jsx': 'Setup UI 26.10.2026 F1: approved large project workspace, clearer graphics and navigation. *"zakoduj mi prosze te zmiany"*; *"na 3/4 monitora"*. ' +
    'T82 F20, after the review · Start designing reads whether the shelf took the brand-new job; when the browser refused it the job opens marked unsaved (markUnsaved) and the start screen says the save\'s own red sentence (notOnShelf). *"do tego dodawanie loga do rysunkow musze miec dzisiaj profesjonalne rysunki dla klientow"* (25.10.2026, 11:40)' +
    ' Chat fix 28.10.2026 F1 · the Open panel gains a third button, Open from file... (data-open-from-file): a .ccproject file goes on this computer\'s shelf and opens through lib/projectFileRoad.js, the File menu\'s own road. *"ja mowie o pliku z CC zebym mial ten sam na innym kompie"*; *"wiesz ze CC nie jest w chmurze jeszcze"* (28.10.2026)'
    + ' T-CC1a F1 · the offline gate is isJcOffline() from lib/jcApi.js (lib/supabase.js deleted); the cloud list and the badge die in F3. *"oczywiscie do CC laczysz sie tylko przez JC"* (the owner, 30.10.2026)'
    + ' T-CC1a F3 · the mock badge and the cc_projects cloud list are deleted (the list becomes Joinery Core\'s in F4); the shelf\'s own rows stand. *"oczywiscie do CC laczysz sie tylko przez JC"* (the owner, 30.10.2026)'
    + ' T-CC1a F4 · the start screen is Joinery Core\'s project list: Production and Pipeline groups from lib/jcList.js (four reads, never the design), each project row with its items (Open, Archive; Show archived and Restore through cc_archive_item), a search over number, name, client and item name, Recent as the last five item ids per tenant, the company and the signed-in name in the header, JC\'s refusal in words with Retry; the shelf list, the number proposal and the remove are deleted; New item is asked of a project row. *"w cc musimy zapisywac na glownej stronie; projekty dzielimy na itemy"* (the owner, 30.10.2026)'
    + ' T-CC1a F5 · New item hands the flow its Joinery Core project (jcProject); no number is proposed. *"automatyczne polaczenie danego projektu do danego pipelinu lub production projektu"* (the owner, 30.10.2026)'
    + ' T-CC1a F6 · Open from file is the import road: openProjectFromFile with the id-collision question (askProjectFile) against Joinery Core\'s items and the project picker (askJcProject) bound to the list the screen holds; the imported item goes to Recent. *"w przyszlosci nie bedzie save to file, po co?"* (the owner, 31.10.2026, 01:06)'
    + ' T-CC1a F9 · the boot question: after the list loads, every dirty crash buffer of the tenant newer than its row is offered in words (Restore opens it unsaved, Discard clears it, a gone item is offered Save as new item); another tenant\'s buffers are cleared. *"moje zdanie to powinno sie wszystko zapisywac na pamiec podreczna, dopiero caly json powinien sie zapisac do DB przy nacisnieciu Zapisz lub co 5 minut automatycznie"* (the owner, 30.10.2026)'
    + ' T-CC1b F1 · Back to Joinery Core at the header\'s right (same words, same target as the Studio bar); the bound project\'s name (jcProjectName) handed to the item on Open, Restore and Save as new item. *"duzy przycisk Return to Joinery Core"* (the owner, 01.11.2026)',
  // Chat fix 28.10.2026 F1 · a NEW PRO file, frozen at its first hash: the two questions of Open from file.
  'src/components/ProjectFileModal.jsx':
    'Chat fix 28.10.2026 F1 · NEW, the window of Open from file\'s two questions, in the shell (name "project-file"): the job is already on this computer (Replace with the file, gold; Keep both, open as a copy; Cancel), and the file was drawn with other workshop settings (Use the file\'s settings, gold; Keep this computer\'s); drawn in a root of its own by askProjectFile, so neither the top bar nor the start screen hosts it. *"zrobisz mi pozniej cos co zadziala, czyli export i import projektow"*; *"problem polega na tym ze nie dzialaja te szuflady ani import ani export plikow"* (28.10.2026)',
  // T86B F5 (31.10.2026, INT) · a NEW PRO file, frozen at its first hash: the chest island's variant popup.
  'src/components/ChestIslandPopup.jsx':
    'T86B F5 · NEW, the small Studio popup that asks a chest in the room its variant ONCE, with two pictures from the chat\'s mockup (A: back panel, B: back to back); the answer is the island\'s chestIsland.variant, changeable later in the chest\'s panel. *"chest powinna byc mozliwosc odsuniecia od sciany ale nie na zasadzie back move tylko powinna byc mozliwosc na srodku pokoju cos jak wyspa ale przez grab i move; i dodanie panela z tylu lub polaczenie szuflad z 2 stron; chest dodany w changing room; mozliwosc dodania worktopu z naszego sprayowanego panelu nie tylko szary worktop"* (the owner, 30.10.2026, 22:52); *"nie koniecznie nawis, nawis jako opcja prosze; 1 - oba; 2 - wchodzi; 3 - dla komody oraz dla biurka, opcja inny blat tez (w przyszlosci) Hi-Macs"* (the owner, 30.10.2026, 22:56)',
  // ADDED BY TURN 84 (27.10.2026) · STUDIO, PRO'S FACE. CLAUDE.md T84 FROZEN 4: *"every PRO file edited is licensed in
  // EXEMPT with the owner's words from this file and re-frozen in the same commit."* Every NEW file under
  // src/components/studio/ stands here too, each with its own reason: the git assertion below excludes EXEMPT paths
  // and nothing else, and the manifest freezes each at its first hash. No engine file is among them (FROZEN 1).
  'src/components/studio/studio.css':
    'T84 F1 · NEW, the Studio skin: the designer\'s Stage-1 classes (studio-*) scoped under .studio-pro, the 13 / 30 / 32 / 4 scale and the bars read as CSS variables the shell sets from profile.ui.studio, the colours Tailwind\'s theme; cc-btn, cc-input, cc-label and cc-frame keep their meaning. *"skupiamy sie teraz wylacznie na PRO. PRO i Retail maja osobne interfejsy. Dla PRO wybieramy Studio"* (the owner\'s line to the designer, CLAUDE.md T84 THE ORDER)'
    + ' T84 F6 · the room\'s island chips (3d/Scene.jsx, frozen) rise above the camera bar while the bar stands at the scene\'s foot, by the measure the messages column already takes, so no chip covers A to D or Frame selection. *"czy zadna funkcja nam nie zginie? np corners etc"* (the owner, 27.10.2026, 22:13)'
    + ' T84 F8 · the skin to the designer\'s Stage-1 where the frames of F1 measured a few px apart (verify/t84/f01-skin.md D4, D8, D9): PRO 2 px further off the words and its rule 18 high with 3 px either side, the gold button at her weight 600, her 10 px side padding on the top bar\'s and the scene edge\'s house buttons that name none of their own; no number of THE NUMBERS moves. *"skupiamy sie teraz wylacznie na PRO. PRO i Retail maja osobne interfejsy. Dla PRO wybieramy Studio"* (the owner\'s line to the designer, CLAUDE.md T84 THE ORDER)'
    + ' Chat fix 30.10.2026 F2 · the card\'s and the refused field\'s rules are gone; the foot under the panel (.studio-inspector-foot, max 45 percent of the column, the findings scrolling inside .studio-inspector-issues) and the strip edge to edge in the column. *"nie nie nie, zwijanie musi byc oczywiscie tak jak bylo zeby bylo widac ze jest osobne menu, tylko ten jeden przycisk usun, Full settings"* (the owner, 30.10.2026); *"open cabinet na samym dole a pod nim wszystkie bledy ktore pokazuje"* (the owner, 30.10.2026)'
    + ' Chat fix 30.10.2026 F3 (the evening) · the strip quiet: the panel\'s dark ground, the level a 3 px hairline at the left edge, the panel\'s small text, Show a ghost; the folded row (.studio-issues-row, a field high, transparent) and the dot (.studio-issue-dot, the house radius); the counters and the marker keep F5\'s 13 px dark on the level\'s ground. *"te zolte alerty moze by jakos skromniej to pokazac i zwiniete, jak bedzie 10 to caly menu mi zabierze, ja uwazam ze powinno byc skromnie gdzies na dole a nie ZOLTE wywalone na wierzch, rozprasza tylko czlowieka"*; *"koduj"* (the owner, 30.10.2026, 19:49 and 19:52)'
    + ' T-CC1b F1 · .studio-job (the 1 px rule on its left), .studio-job-project; .studio-project-name loses its max-width. *"wprowadza w blad ... po prawej, z numerem projektu JC i nazwa"* (the owner, 01.11.2026); *"srodkowe prawo, wyraznie oddzielone od menu"* (the owner, 01.11.2026)',
  'src/components/studio/StudioIcons.jsx':
    'T84 F1 · NEW, the Stage-1 SVG symbols as one hidden sprite, and the Icon that uses it. *"skupiamy sie teraz wylacznie na PRO. PRO i Retail maja osobne interfejsy. Dla PRO wybieramy Studio"* (the owner\'s line to the designer, CLAUDE.md T84 THE ORDER)'
    + ' Chat fix 30.10.2026 F3 (the evening) · one symbol more in her stroke style: up, the chevron of the folded findings row. *"te zolte alerty moze by jakos skromniej to pokazac i zwiniete, jak bedzie 10 to caly menu mi zabierze, ja uwazam ze powinno byc skromnie gdzies na dole a nie ZOLTE wywalone na wierzch, rozprasza tylko czlowieka"*; *"koduj"* (the owner, 30.10.2026, 19:49 and 19:52)',
  'src/components/studio/lib/studioSkin.js':
    'T84 F1 · NEW, pure: studioWidths and studioCssVars, the numbers of profile.ui.studio as the shell\'s widths and CSS variables, typed nowhere else. *"skupiamy sie teraz wylacznie na PRO. PRO i Retail maja osobne interfejsy. Dla PRO wybieramy Studio"* (the owner\'s line to the designer, CLAUDE.md T84 THE ORDER)'
    + ' Chat fix 30.10.2026 F2 · two inspector modes (full, none) and the panel\'s widths only; the card\'s three numbers left the profile with the card. *"nie nie nie, zwijanie musi byc oczywiscie tak jak bylo zeby bylo widac ze jest osobne menu, tylko ten jeden przycisk usun, Full settings"* (the owner, 30.10.2026)',
  'src/App.jsx':
    'T84 F2 · the face: the factory entry with profile.ui.studio.enabled hands ConfiguratorPage studio={isStudioFace(audience, profile)}; the retail entry never mounts the Studio, and no button switches it. *"skupiamy sie teraz wylacznie na PRO. PRO i Retail maja osobne interfejsy. Dla PRO wybieramy Studio"* (the owner\'s line to the designer, CLAUDE.md T84 THE ORDER); *"nie, juz jest przy wyborze"* (the owner, 27.10.2026, 16:27)'
    + ' T-CC1a F2 · App mounts only after ready, so the company defaults are asked here once (the old login hook deleted); the build stamp, the beforeunload question and the two screens stay. *"warunek: tylko przez JC po zalogowaniu, nie dziala skopiowany url wklejony przez byle kogo"* (the owner, 31.10.2026, 09:08)'
    + ' T-CC1a F8 · the beforeunload question is replaced by the save on leaving: the crash buffer is flushed (flushCrashBuffer) and the browser asks only when the flush failed. *"dopiero caly json powinien sie zapisac do DB przy nacisnieciu Zapisz lub co 5 minut automatycznie"* (the owner, 30.10.2026)',
  'src/components/studio/StudioShell.jsx':
    'T84 F2 · NEW, the Studio grid of Stage-1 (top bar, context strip, rail, scene, inspector, status bar) round the EXISTING canvas and its overlays; every later part comes in through a slot. *"skupiamy sie teraz wylacznie na PRO. PRO i Retail maja osobne interfejsy. Dla PRO wybieramy Studio"* (the owner\'s line to the designer, CLAUDE.md T84 THE ORDER); *"nie, juz jest przy wyborze"* (the owner, 27.10.2026, 16:27)'
    + ' T84 F6 · the scene\'s edge is drawn before the scene layer, where the canvas toolbar stands on the legacy face, so the Check, the BOM and the Library drawn after it at the same layer stand over it (the edge had covered the Check\'s head and the BOM\'s export buttons). *"czy zadna funkcja nam nie zginie? np corners etc"* (the owner, 27.10.2026, 22:13)'
    + ' Chat fix 30.10.2026 F2 · the root says full or none (no quick mode). *"nie nie nie, zwijanie musi byc oczywiscie tak jak bylo zeby bylo widac ze jest osobne menu, tylko ten jeden przycisk usun, Full settings"* (the owner, 30.10.2026)',
  'src/components/studio/StudioRail.jsx':
    'T84 F2 · NEW, the rail: Select, Add (the existing Library), Room, Materials, Check with its badge; Design and CNC at its foot, the toolbar\'s own calls and guards. *"wiem ze silnik jako tako nie ruszamy ale funkcje w menu musza sie zachowac wszystkie"* (the owner, 27.10.2026, 22:19)',
  'src/components/studio/SelectionBreadcrumb.jsx':
    'T84 F2 · NEW, the context strip: the room, the wall or island, the unit number, the selection in words, and the button that shows the inspector again. *"skupiamy sie teraz wylacznie na PRO. PRO i Retail maja osobne interfejsy. Dla PRO wybieramy Studio"* (the owner\'s line to the designer, CLAUDE.md T84 THE ORDER)',
  'src/components/studio/StatusBar.jsx':
    'T84 F2 · NEW, the status bar: the selection in words, the MockModeBadge, the dirty marker, the Changes bar (the same component, re-homed) and the viewport size. *"czy zadna funkcja nam nie zginie? np corners etc"* (the owner, 27.10.2026, 22:13)'
    + ' T-CC1a F3 · the mock badge is deleted with mock mode; the bar\'s order is otherwise T84\'s. *"oczywiscie do CC laczysz sie tylko przez JC"* (the owner, 30.10.2026)',
  'src/components/studio/lib/studioFace.js':
    'T84 F2 · NEW, pure: isStudioFace(audience, profile), the factory entry with profile.ui.studio.enabled; no switch in the UI. *"nie, juz jest przy wyborze"* (the owner, 27.10.2026, 16:27)',
  'src/components/MultiUnitPanel.jsx':
    'T84 F4 · the same two host props as RightPanel, passed through by it: layout="embedded" (the aside fills the inspector column; both class strings literal) and headerActions after the "N cabinets" title, before its x; overlay, the panel is what it was, and every control stays. *"Pin keeps inspector open and FOLLOWING SELECTION; it never locks unit ID"* (the designer\'s contract, adopted by the owner, 27.10.2026, 16:27); *"czy zadna funkcja nam nie zginie? np corners etc"* (the owner, 27.10.2026, 22:13)',
  'src/components/studio/InspectorHost.jsx':
    'T84 F4 · NEW, the inspector column: the quick card, the full RightPanel embedded with Pin and Back to quick settings inside its own header, or nothing; Pin follows the selection, and a pending edit is committed to its own cabinet before the selection moves. *"Pin keeps inspector open and FOLLOWING SELECTION; it never locks unit ID"* (the designer\'s contract, adopted by the owner, 27.10.2026, 16:27); *"ok jak juz bedziesz wiedzial dokladnie to tabela porownaj ze mamy wszystko nic nie zgubilismy, teraz daj do tury"* (the owner, 27.10.2026, 22:11 to 22:25)'
    + ' Chat fix 30.10.2026 F2 · the quick card is gone: one cabinet clicked shows the full RightPanel at once; the column\'s FOOT under the panel holds Open cabinet (the editor window beside the press) and under it every finding of the cabinet, scrolling on its own; Pin stays, Back to quick settings goes; the guard blurs the field with the caret and nothing holds the selection (the refused card value is gone). *"nie nie nie, zwijanie musi byc oczywiscie tak jak bylo zeby bylo widac ze jest osobne menu, tylko ten jeden przycisk usun, Full settings"* (the owner, 30.10.2026); *"open cabinet na samym dole a pod nim wszystkie bledy ktore pokazuje"* (the owner, 30.10.2026); *"ok koduj te poprawki zobaczymy co sie dzieje"* (the owner, 30.10.2026, 18:41)'
    + ' Chat fix 30.10.2026 F3 (the evening) · the foot hands IssueStrip the room under Open cabinet and draws no list wrapper of its own. *"te zolte alerty moze by jakos skromniej to pokazac i zwiniete, jak bedzie 10 to caly menu mi zabierze, ja uwazam ze powinno byc skromnie gdzies na dole a nie ZOLTE wywalone na wierzch, rozprasza tylko czlowieka"*; *"koduj"* (the owner, 30.10.2026, 19:49 and 19:52)',
  'src/components/studio/UnitIssueMarker.jsx':
    'T84 F5 · NEW, the marker beside the unit number in the scene: a red or yellow triangle with the count; a click selects the unit and opens its card. *"napewno naprzyklad wszystkie bledy zolte i czerwone sa totalnie niewidoczne, mala czcionka etc"* (the owner, 27.10.2026, 16:27)'
    + ' Chat fix 30.10.2026 F2 · the marker\'s title says panel, not card; its click is what it was (select, show the inspector). *"nie nie nie, zwijanie musi byc oczywiscie tak jak bylo zeby bylo widac ze jest osobne menu, tylko ten jeden przycisk usun, Full settings"* (the owner, 30.10.2026)',
  'src/components/studio/IssueStrip.jsx':
    'T84 F5 · NEW, the strip in the card and over the full panel (the finding\'s own words, its level\'s colour, Show) and the counters on the status bar. *"napewno naprzyklad wszystkie bledy zolte i czerwone sa totalnie niewidoczne, mala czcionka etc"* (the owner, 27.10.2026, 16:27)'
    + ' Chat fix 30.10.2026 F2 · the strip stands in the column\'s foot under Open cabinet (the head comment; no row changed). *"open cabinet na samym dole a pod nim wszystkie bledy ktore pokazuje"* (the owner, 30.10.2026)'
    + ' Chat fix 30.10.2026 F3 (the evening) · quiet and folded: one row at the foot with the counts (a dot per level, a chevron), folded by default; a press unfolds the list over the row (uiStore issuesOpen), a second folds it; the lines keep their words and Show. *"te zolte alerty moze by jakos skromniej to pokazac i zwiniete, jak bedzie 10 to caly menu mi zabierze, ja uwazam ze powinno byc skromnie gdzies na dole a nie ZOLTE wywalone na wierzch, rozprasza tylko czlowieka"*; *"koduj"* (the owner, 30.10.2026, 19:49 and 19:52)',
  'src/components/studio/lib/studioIssues.js':
    'T84 F5 · NEW, pure: the Check\'s findings grouped by unit and level through the engine\'s findingsToAct, notes left out. *"napewno naprzyklad wszystkie bledy zolte i czerwone sa totalnie niewidoczne, mala czcionka etc"* (the owner, 27.10.2026, 16:27)'
    + ' Chat fix 30.10.2026 F2 · the refused field\'s law (refusalOf, shouldCommitField, refusedFieldAfter, refusedFieldShows) left with RefusedField.jsx; the findings\' law is untouched. *"nie nie nie, zwijanie musi byc oczywiscie tak jak bylo zeby bylo widac ze jest osobne menu, tylko ten jeden przycisk usun, Full settings"* (the owner, 30.10.2026)'
    + ' Chat fix 30.10.2026 F3 (the evening) · issueParts exported (the parts of a count, red first), one law for the status bar\'s counters and the row\'s dots. *"te zolte alerty moze by jakos skromniej to pokazac i zwiniete, jak bedzie 10 to caly menu mi zabierze, ja uwazam ze powinno byc skromnie gdzies na dole a nie ZOLTE wywalone na wierzch, rozprasza tylko czlowieka"*; *"koduj"* (the owner, 30.10.2026, 19:49 and 19:52)',
  'src/components/studio/SceneToggles.jsx':
    'T84 F6 · NEW, the four toggles at the scene\'s top edge (profile.ui.studio.sceneToggles) with the canvas toolbar\'s own handlers and guards. *"wiem ze silnik jako tako nie ruszamy ale funkcje w menu musza sie zachowac wszystkie"* (the owner, 27.10.2026, 22:19)',
  'src/components/studio/CameraBar.jsx':
    'T84 F6 · NEW, the camera bar: Plan, Iso, A, B, C, D and Frame selection through the room\'s registered camera, and Drawings as the drawing window\'s preview. *"wiem ze silnik jako tako nie ruszamy ale funkcje w menu musza sie zachowac wszystkie"* (the owner, 27.10.2026, 22:19)',
  'src/components/studio/lib/cameraPresets.js':
    'T84 F6 · NEW, pure: the six directions from the room and Frame selection over the selected boxes (profile.ui.studio.frameMargin). *"wiem ze silnik jako tako nie ruszamy ale funkcje w menu musza sie zachowac wszystkie"* (the owner, 27.10.2026, 22:19)',
  'src/components/studio/RailMenus.jsx':
    'T84 F7 · NEW, the rail\'s popups: Add (the existing Library beside the button) and Materials (the four existing windows). *"Nothing is removed, renamed Advanced or made optional in this stage"* (the designer\'s contract, adopted by the owner, 27.10.2026, 16:27); *"czy zadna funkcja nam nie zginie? np corners etc"* (the owner, 27.10.2026, 22:13)'
    + ' T-CC1b F3, F4, F9.3 · the Materials rows written in place (the Database builder deleted), Stock... opens the Joinery Core stock window (\'jc-stock\'), a soon family is a disabled row with its reason. *"Database niepotrzebne, wszystko jest w JC, Assign materials juz jest po lewej"* (the owner, 01.11.2026)',
  'src/components/studio/lib/studioEscape.js':
    'T84 F7 · NEW, pure: one Escape, one action, in the order of verify/t84/p1-escape.md E; never unpins. *"czy zadna funkcja nam nie zginie? np corners etc"* (the owner, 27.10.2026, 22:13)'
    + ' Chat fix 30.10.2026 F2 · the refused card value (level 1) left with the quick card; the order is otherwise P1\'s. *"nie nie nie, zwijanie musi byc oczywiscie tak jak bylo zeby bylo widac ze jest osobne menu, tylko ten jeden przycisk usun, Full settings"* (the owner, 30.10.2026)'
    + ' T-CC1b F2 · one comment no longer names the deleted SceneViewMenu.jsx; no code moves. *"dwa menu View, jedno wystarczy, menu wystarczy"* (the owner, 01.11.2026)',
  'index.html':
    'T-CC1a F1 · Joinery Core\'s client, <script src="/js/api-client.js?v=9">, before the module script, so apiFetch, rpc and supabaseClient are on the window when main.jsx runs. *"oczywiscie do CC laczysz sie tylko przez JC"* (the owner, 30.10.2026)',
  'src/main.jsx':
    'T-CC1a F2 · the session first: authStore.init() asks Joinery Core\'s /api/auth/me before the app exists; only ready imports App.jsx dynamically, a refused or unanswered session imports components/jc/RefusalScreen.jsx; a storage event that removes authToken flushes and shows the offline card. *"warunek: tylko przez JC po zalogowaniu, nie dziala skopiowany url wklejony przez byle kogo"* (the owner, 31.10.2026, 09:08)',
  'src/components/jc/RefusalScreen.jsx':
    'T-CC1a F2 · NEW, the refusal screen: one centred card, refused role (employee, never worker), refused company (coming soon), offline (Try again), its words from authStore\'s pure refusalCard. *"warunek: tylko przez JC po zalogowaniu, nie dziala skopiowany url wklejony przez byle kogo"* (the owner, 31.10.2026, 09:08)',
  'src/components/jc/JcProjectPicker.jsx':
    'T-CC1a F6 · NEW, the import\'s project picker: the Joinery Core list (lib/jcList.js) embedded with a search above it, in the shell\'s Open from file window (name "project-file"), the read-only words when the file carries workshop settings (they are not imported); drawn in a root of its own by askJcProject for the start screen and the File menu. *"w przyszlosci nie bedzie save to file, po co?"* (the owner, 31.10.2026, 01:06)',
  // T-CC1b (01.11.2026): the frozen files this turn edits for the first time and its NEW PRO files.
  'src/components/RenderModal.jsx':
    'T-CC1b F8 · an onResult prop hands the finished render back beside the download (Add to the drawings); the presets and the resolution untouched. *"usunac przyciski all units i drawing set pdf, tylko export pdf"*; *"logo domyslne z JC albo przycisk wstaw inne logo"*; *"dodac wizualizacje z drugiego kata, render wedlug wyboru"* (the owner, 01.11.2026)',
  'src/components/MaterialPicker.jsx':
    'T-CC1b F10 · the Assign and Stock windows\' embedded list (search, category tree, kind filter), never a dropdown only. *"materialy z JC (jego baza), przypisanie w CC, grupy ... modal duzo wiekszy i czytelny, polaczony na stale, kazda funkcja przypisana (10 rodzajow zawiasow, wszystkie przypisane), inaczej eksport BOM pisze not assigned materials"* (the owner, 01.11.2026)',
  'src/components/JcStockModal.jsx':
    'T-CC1b F9.3 · NEW, the Stock window: the tenant\'s Joinery Core stock read-only (name, item number, category, thickness, unit, price, stock, the JC badge), a search and the categories tree, 1240 wide, the 13 px floor. *"materialy z JC (jego baza), przypisanie w CC, grupy ... modal duzo wiekszy i czytelny, polaczony na stale, kazda funkcja przypisana (10 rodzajow zawiasow, wszystkie przypisane), inaczej eksport BOM pisze not assigned materials"* (the owner, 01.11.2026)',
  'src/components/drawings/AiVisualCard.jsx':
    'T-CC1b F13 · NEW, the AI visualisation card: the source, size, quality, Add to the prompt, Generate (at most three pictures through Joinery Core\'s /api/ai/visualise), Use this one, Remove; nothing kept until one is chosen. *"wizualizacja AI z renderu, max 3 proby, wybierasz jedna i dodajesz do rysunkow, tanie API"* (the owner, 01.11.2026)',
};

// ─── KASACJA, CHAT FIX 30.10.2026 · FOUR PRO FILES DELETED, BY NAME ─────────
// The owner: *"nie nie nie, zwijanie musi byc oczywiscie tak jak bylo zeby
// bylo widac ze jest osobne menu, tylko ten jeden przycisk usun, Full
// settings"*; *"ok koduj te poprawki zobaczymy co sie dzieje"* (30.10.2026).
// The quick card never shows again, so the card and everything only it used
// are DELETED, not gated (petros/zasady, the four laws of kasacja): the files
// leave FROZEN and EXEMPT, the git assertion names them so a deletion is not
// mistaken for a moved byte, and this map keeps the reason in the registry.
const DELETED = {
  'src/components/studio/QuickSelectionCard.jsx': 'Chat fix 30.10.2026 F2 · the quick card (T84 F3). *"tylko ten jeden przycisk usun, Full settings"*',
  'src/components/studio/cards/CardRow.jsx': 'Chat fix 30.10.2026 F2 · one row of the quick card (T84 F3). *"tylko ten jeden przycisk usun, Full settings"*',
  'src/components/studio/lib/studioCards.js': 'Chat fix 30.10.2026 F2 · the quick cards as data (T84 F3). *"tylko ten jeden przycisk usun, Full settings"*',
  'src/components/studio/RefusedField.jsx': 'Chat fix 30.10.2026 F2 · the card\'s refused field (T84 F5), the card its only home. *"tylko ten jeden przycisk usun, Full settings"*',
  // T-CC1a F3 (31.10.2026): CC's own login and mock mode, a kasacja (CLAUDE.md T-CC1a F3.1).
  'src/components/AuthModal.jsx': 'T-CC1a F3 · the Account window, CC\'s own login (signIn, signUp, the direct save to cc_projects); the session is Joinery Core\'s. *"oczywiscie do CC laczysz sie tylko przez JC"*',
  'src/components/MockModeBadge.jsx': 'T-CC1a F3 · the Mock data mode badge; there is no mock mode, Joinery Core not answering is said in words (JC_OFFLINE). *"oczywiscie do CC laczysz sie tylko przez JC"*',
  // T-CC1b F2 (01.11.2026): the scene corner's View dropdown, a kasacja (CLAUDE.md T-CC1b DELETION LICENCE).
  'src/components/studio/SceneViewMenu.jsx': 'T-CC1b F2 · the scene corner\'s View dropdown, a second View beside the top bar\'s; its items live on the quick toggles and in View. *"dwa menu View, jedno wystarczy, menu wystarczy"*',
};

/**
 * THE FROZEN SURFACE — CLAUDE.md, STANDING LAW:
 *
 *   *"`git diff origin/main..HEAD --stat` on `index.html`, `src/App.jsx`,
 *   `src/main.jsx`, `src/components/**`, `src/pages/**` must be EMPTY."*
 *
 * Sixty-six files, hashed at the base of turn 59 (origin/main @ c4321f7,
 * t58b merged). Not one of them is touched by this turn.
 */
const FROZEN = {
  // Setup UI 26.10.2026 F1, approved illustrated project setup.
  'src/components/SetupArt.jsx': 'c2c70e0ea33beed219c3f32af8c7c8066686e4ba1d69f742c691f75cd58803f5',
  // T82 F15 re-frozen at the new hash; EXEMPT above carries the reason.
  'src/components/FrontDecorationControls.jsx': 'b32660180217d45760e074f4fcd8932f90b9a57f11cb02121c59670225de2546',
  'index.html': 'b2b3b538d436ab616bcde6e3d45d5f99a36e3c4a6c1fd6023ff01b5122cc4975',
  // T84 F2 re-frozen at the new hash; EXEMPT above carries the reason.
  'src/App.jsx': '29d6c71bb2a1371b51ec3df02f219b160deb240fe7294afec842f40cae987cde',
  // T78 F11 · re-frozen at the new hash; `EXEMPT` above carries the reason.
  // T79 F2, F3 re-frozen at the new hash; EXEMPT above carries the reason.
  // T79 F11 re-frozen at the new hash; EXEMPT above carries the reason.
  // CHAT FIX 19.10.2026 re-frozen at the new hash; EXEMPT above carries the reason.
  'src/components/AddItems.jsx': '2c1c206173c3ae7260f056b5945b17453a7fffdca8df253cd47db5d7d9303a87',
  'src/components/AddItemsModal.jsx': '952b9e52104d92a148ba00da6ba42166e44824e76aeda7ba0553b22f2633105e',
  // T78 F21 re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/AssignMaterialsModal.jsx': 'b717462e0852546403c11827ca7139d7fcfb90db31e3eb15f326bee4598701ae',
  // T78 F21 re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/BomPanel.jsx': '999e75754726feb2c5f8c1bd6d2802762c5620fbc9c536bb7eba49bb2ea01649',
  // T79 F12 re-frozen at the new hash; EXEMPT above carries the reason.
  // CHAT FIX 19.10.2026 re-frozen at the new hash; EXEMPT above carries the reason.
  'src/components/CabinetEditorModal.jsx': '3f080e23b09ce5c5018f89649264e77cb85e5f5594dafecd839673d6db9fd066',
  // T82 F6 re-frozen at the new hash; EXEMPT above carries the reason.
  // T82 F12 re-frozen at the new hash; EXEMPT above carries the reason.
  // T84 F6 re-frozen at the new hash; EXEMPT above carries the reason.
  'src/components/CanvasToolbar.jsx': 'd891bcf4f4a6bb87320b7ec2f04490cde2e8c3e3b2041d23573b0c2cd2d1bc2e',
  // T82 F12 re-frozen at the new hash; EXEMPT above carries the reason.
  // T84 F5 re-frozen at the new hash; EXEMPT above carries the reason.
  'src/components/CheckPanel.jsx': '32ddb573d3c24cd6131983a1a19233f6b6d3a1f141bd38fb23890fa904be4144',
  'src/components/ChosenDecorTile.jsx': '38d960b752ed6d5e99519573a3c6b9d31d687820f38b4e39ee11b971b2c3b683',
  // T76 F1 · re-frozen at the hash of BOTH edits (T75's and GPT's); `EXEMPT` above carries the reasons.
  // T82 F12 re-frozen at the new hash; EXEMPT above carries the reason.
  'src/components/CncTree.jsx': 'a814c546318362c1310280917bd05ba962d705715688c7768d4101a5f58a37a3',
  // T79 F1 re-frozen at the new hash; EXEMPT above carries the reason.
  // CHAT FIX 19.10.2026 (the afternoon) re-frozen at the new hash; EXEMPT above carries the reason.
  // T82 F15 re-frozen at the new hash; EXEMPT above carries the reason.
  'src/components/CncView.jsx': 'd3afdbb6fa29e5517b1df14c3dcc3a26cb788aeadc393dcd1d1182c48c11be79',
  'src/components/ColourPicker.jsx': '03775b851d5fef7d0803765f6f721d807b5b21bedfd8f0c49386db7047d8c33e',
  // T78 F19 re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/CompanyDefaultsModal.jsx': 'e365305d290ab32057544e05f83b068f1ef9414642fe00f429cfbedb84dbc917',
  // T75 · re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/ContextMenu.jsx': '9ecd6083c1808257a9c4f53ec9ff654304cfae671c1b923e9910ab5a55ca524c',
  'src/components/DecorPicker.jsx': '3ed5d2c75e1c7eb48b364f3b86cf9ec30fdad43acae9f1b30879f65f14e82e6a',
  'src/components/DecorPickerModal.jsx': 'eff9e583740f2381cfa8e796339f5b664f88ddf010e427a61cd450ed2ad44411',
  // T82 F20 re-frozen at the new hash; EXEMPT above carries the reason.
  'src/components/DesignSettingsModal.jsx': '7f4863ce3d4ec2bb8433a11a659377e809950fb3ab6ec956225ddc409683bc0b',
  'src/components/DoorModal.jsx': 'a6f125f427a619cd8a2aa3b7c0807dc946d0a54d468f34afe80df91e4d69b490',
  // T75 · re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/DrawRoomModal.jsx': 'fc048e2852c52ddeb48dce71f07cc5d3db3f5de0c3e5623e7d2799d23d4b3eb9',
  // T71 F5: re-frozen at the new hash; `EXEMPT` above carries the reason.
  // T82 F20 re-frozen at the new hash; EXEMPT above carries the reason.
  // T82 F20 re-frozen at the new hash; EXEMPT above carries the reason.
  // T83 F11 re-frozen at the new hash; EXEMPT above carries the reason.
  'src/components/DrawingModal.jsx': '346ead873fd7b60b1e01a089e14c661f7f33edf8b1033d4e85cb578415bd3abb',
  // T72 F2/F3/F12 — re-frozen at the new hash; `EXEMPT` above carries the reason.
  // T79 F12 re-frozen at the new hash; EXEMPT above carries the reason.
  // T79 F13 re-frozen at the new hash; EXEMPT above carries the reason.
  // T79 F16 re-frozen at the new hash; EXEMPT above carries the reason.
  // T82 F18 re-frozen at the new hash; EXEMPT above carries the reason.
  // T86B F5 · NEW PRO file (the chest island's variant popup), frozen at its first hash; EXEMPT above carries the reason.
  'src/components/ChestIslandPopup.jsx': 'dd212a492906192eed2fc521c4ecc9ebed0af420ac2b1db9bb07729d709436bd',
  'src/components/ElementProperties.jsx': '17372ffa62c00c834c574d8a30942a2bfb8ff0ec158c5a7e0c8b3232599e049f',
  'src/components/FrontGapModal.jsx': '9c2218d7f62684c2efe283df871af6a41df89152c674e093f3f721659524d4d5',
  'src/components/FrontGapWarnings.jsx': '84051f4e5178faf481c8c9f8a699576435a86e6f7138f94831748cac42f2433a',
  'src/components/FrontStyleGallery.jsx': '96ac40d58f9a1016d23256bcd95f6d1e037bfde609d4e17a9bf9f93c6127ed5e',
  'src/components/HandEditsModal.jsx': '8b2f61eead0bcc9f47aab78cadb7a6627a73885fd8e1b2e7ac8ac6ebf30025b0',
  // T80 F10 · a new PRO file, frozen at its first hash; EXEMPT above carries the reason.
  'src/components/InframeWarnings.jsx': 'f661f733fb63d046163e40639b45637d3a44cd40ffc74169c220a4752eb30581',
  'src/components/JoineryPreview.jsx': '4313bbe216ce87f80ab6ee1b4d1e8e288465e5b2ef2bedbba1167346508add0a',
  // T72 F4 — re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/JpullRunModal.jsx': '652b4f701a455134eb2571565f03dc6fca89c273f4041ad9eb66d8b0c7bd6aa7',
  // T75 · re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/LibraryPanel.jsx': '2504ab9353aff8f51ada6adfe2a9fff5cecd6a64cdac392a72bbdcd78d0f3f51',
  'src/components/LightingPanel.jsx': '65bf9cbc3cf6fe4b687def6f2d9538d4b363690c3c5d5ad2fddb0f7a77e48d2d',
  'src/components/MaterialChoicePanel.jsx': '16d2ed3171b4756141f21f693123c46bd6b33f772cad58013b2a45ec9a8fcb71',
  'src/components/MaterialPicker.jsx': '1f9c6d2dbd43e4436341414829e667c1ebd6ed0844039e6d1db9067d31bb2fbc',
  'src/components/MenuBar.jsx': '8259c2d7b81f5f176c8c20d6faf98d6c2943667e2dd6354154a85748da1c4581',
  // T79 F1 re-frozen at the new hash; EXEMPT above carries the reason.
  // CHAT FIX 19.10.2026 re-frozen at the new hash, twice (the morning, the afternoon); EXEMPT above carries the reasons.
  // T84 F2 re-frozen at the new hash; EXEMPT above carries the reason.
  'src/components/Messages.jsx': '0d2c65d4b1027e8ef07d7f0b6c7e1dd51c1e63744dbf1177c306e848ed42cab9',
  'src/components/Modal.jsx': '0dc9c18a8196212304bf6606ec17146bdc5c9c831a5db2765ee41e857ce8775d',
  // T84 F4 re-frozen at the new hash; EXEMPT above carries the reason.
  'src/components/MultiUnitPanel.jsx': 'df959555b30515a6990093f9a97dcdb5729b0af53959916945edcea7369a7162',
  'src/components/NewProjectFlow.jsx': '1e6148558985483cf0a6d31000bedd7598ff550b7519501689d3e042b411ebba',
  // Chat fix 28.10.2026: the setup workspace's stylesheet, licensed with the owner's words in EXEMPT.
  'src/components/setup-workspace.css': 'e0c92676f1491a10cabec65f27c72e0411b6eaa09bdedeeea7e2cd7e4a6a4f78',
  'src/components/NumberField.jsx': 'ae2f9b89ea20a8da26fdf77db1cdb00cb487a2e5110128263f4c33f32eb5c176',
  'src/components/PartDetailModal.jsx': 'aaa5a376c870dd56a1d80ab4373bd4cc035a1d78570f943b0a3a4b32ffeb1eff',
  // CHAT FIX 19.10.2026 re-frozen at the new hash; EXEMPT above carries the reason.
  'src/components/RailModal.jsx': '99b29df3301ec735ce4da66cd80f1665f9306c95ae0d4cc0bb92c213106ca91f',
  'src/components/RenderModal.jsx': '21516d3ec2dd6437943548a9fb7ebf624bdfc109b5cc0beee2eed8be9b121203',
  // T78 PART E, after the walk re-frozen at the new hash; `EXEMPT` above carries the reason.
  // T79 F4 re-frozen at the new hash; EXEMPT above carries the reason.
  // T79 F5 re-frozen at the new hash; EXEMPT above carries the reason.
  // T79 F13 re-frozen at the new hash; EXEMPT above carries the reason.
  // CHAT-FIX 25.10 re-frozen at the new hash (the free panel's Attach section); EXEMPT above carries the reason.
  // T82 F2 re-frozen at the new hash; EXEMPT above carries the reason.
  // T82 F6 re-frozen at the new hash; EXEMPT above carries the reason.
  // T82 F10 re-frozen at the new hash; EXEMPT above carries the reason.
  // T82 F14 re-frozen at the new hash; EXEMPT above carries the reason.
  // T82 F17 re-frozen at the new hash; EXEMPT above carries the reason.
  // T82 F2 (after the review) re-frozen at the new hash; EXEMPT above carries the reason.
  // T82 F2 (after the review, one cabinet one door) re-frozen at the new hash; EXEMPT above carries the reason.
  // T82 F13 re-frozen at the new hash; EXEMPT above carries the reason.
  // T83 F3 re-frozen at the new hash; EXEMPT above carries the reason.
  // T83 F5 re-frozen at the new hash; EXEMPT above carries the reason.
  // CHAT FIX 26.10.2026 re-frozen at the new hash (the mirror cabinet's door widths held and balanced); EXEMPT above carries the owner's words.
  // T84 F4 re-frozen at the new hash; EXEMPT above carries the reason.
  'src/components/RightPanel.jsx': '3958109988d2e29d89a4b2ec7f9deb62ce58cdf448ed9965b17d4d85701e2c4a',
  // T75 · re-frozen at the new hash; `EXEMPT` above carries the reason.
  // CHAT FIX 17.10.2026 re-frozen at the new hash (the window 1290 wide); `EXEMPT` above carries the owner's words.
  'src/components/RoomModal.jsx': 'cc9a92536ce6fa813da4d6523c4a41bb38375f066f92e6be4e118d662aab3598',
  'src/components/SaveAsModal.jsx': '17bc0789ca392eda476dd34afa63a0c961da04b3dac4f32c8bab0bcb95dc6ad5',
  'src/components/SaveSettingsSetModal.jsx': 'e89dc83a41dbadbf472496c5674216171221f7bda5fa240c61dbaab09dd86951',
  // T75 · re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/SaveTemplateModal.jsx': '5de923d96cd981fd785005716ea84b7288d77c9b4ea044763112e672c6d1ba24',
  'src/components/Section.jsx': 'f3f64ad9f4d024d31a508f469a1f816c2bf1c0ffcf7d9221e95e2ee42d2a1a56',
  // T80 F2 re-frozen at the new hash; EXEMPT above carries the reason.
  'src/components/SettingsPanel.jsx': '5224eabd19541ad51c86c492cdcdee78fbab354eaf261837ec4a2d3b94828a07',
  // T78 F21 · a NEW PRO component, frozen the night it is born: Output > Spraying, the spray schedule's one page. `EXEMPT` carries the owner's words.
  'src/components/SprayingPanel.jsx': 'c7f8b924fc0f46ab4c1e77d3a5be839fdc49095de0061862a20e6df15ab429ed',
  'src/components/SheenSlider.jsx': 'ec09e0dd7ad835672e4c024dee3013e649dcfa8ad64a2da5c120ed78d5c94bfb',
  'src/components/ShelfHingeClash.jsx': 'd205a25f3f86278aef44b7b91bb1d19958cef84aadc333ec550cd47327fc9619',
  // T82 F20 re-frozen at the new hash; EXEMPT above carries the reason.
  // Chat fix 28.10.2026 F1 re-frozen at the new hash; EXEMPT above carries the reason.
  'src/components/StartScreen.jsx': '967ee9a00f510370a06fb14dbf1bd4e42923cb7c5238355f6695bc700d88cd8e',
  // Chat fix 28.10.2026 F1 · a NEW PRO file (the two questions of Open from file), frozen at its first hash; EXEMPT above carries the reason.
  'src/components/ProjectFileModal.jsx': 'c47a5857e6b3b2ec73dc31a042ef2914b2cf4afd4c910d536adbdd1cc6b70e5b',
  // T78 F21 re-frozen at the new hash; `EXEMPT` above carries the reason.
  // T82 F20 re-frozen at the new hash; EXEMPT above carries the reason.
  // T84 F2 re-frozen at the new hash; EXEMPT above carries the reason.
  // Chat fix 28.10.2026 F1 re-frozen at the new hash; EXEMPT above carries the reason.
  'src/components/TopBar.jsx': 'e65a78e5647aa994f898f89265b417279dab4a0767f9ef6f45c1c62ffe97b683',
  'src/components/UnitFinishModal.jsx': '64ef4ad294dea3ac69cea7a2b6a200f55d335b75e8ebce69fafe37a33eb2a819',
  // T78 F5 · re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/UnitSizeModal.jsx': 'e8b94789f07fffaeb5b66a2a8fd160c28d9d4f4b0ed56383ecc18532f7b06c1f',
  'src/components/UnitWarnings.jsx': 'f654c6abd287439ddd932fb8a4011784db34105312ce17bdc6416e701b5b74f8',
  'src/components/VeneerPicker.jsx': '05bbf6f2a8c54f546c3c7f19608c0193dc356323ff1a5a7e543ae57e039e9e7d',
  // 15.10.2026 (the evening) re-frozen at the new hash; `EXEMPT` above carries the owner's words.
  'src/components/WallElevationModal.jsx': '37ea52de98268e2ceb01d100a53660b0c3e2d209e56c28251112ffb885e27bf5',
  // T78 F21 re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/WarehouseModal.jsx': 'ec5b747982b65fd246016f43484247f83d64cac86678f750b63147f84572e5ea',
  // T67 F9 — re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/WatchLayoutModal.jsx': 'ca2f0acd8e432d5890a185ca15a9b0bdff565827464652e3826668981b0a35ee',
  'src/components/WizardHardware.jsx': 'd0de5ca0c32de92feffef65a1a091cc2d45eaeb02a446a73c5389c2d03c377a8',
  // T80 F2 re-frozen at the new hash; EXEMPT above carries the reason.
  'src/components/WizardSettings.jsx': 'a41e33b527aec17f1c02accbecf6992dd97bb8a2ef732dda1b3269fb79b288bf',
  'src/components/WizardSummary.jsx': '989a13f6bff6213a787a2ed78db2533d320c1cd6a99e82e0ca435e4edc60a2e3',
  'src/main.jsx': '7250f492eca41ee07d766942f1f5a663368704e676e89313825c2ebf33fb95d7',
  // T78 F21 re-frozen at the new hash; `EXEMPT` above carries the reason.
  // T79 F1 re-frozen at the new hash; EXEMPT above carries the reason.
  // T79 F18 re-frozen at the new hash; EXEMPT above carries the reason.
  // T82 F12 re-frozen at the new hash; EXEMPT above carries the reason.
  // T82 F20 re-frozen at the new hash; EXEMPT above carries the reason.
  // T84 F2 re-frozen at the new hash; EXEMPT above carries the reason.
  // T84 F4 re-frozen at the new hash; EXEMPT above carries the reason.
  // T84 F5 re-frozen at the new hash; EXEMPT above carries the reason.
  // T84 F6 re-frozen at the new hash; EXEMPT above carries the reason.
  // T84 F7 re-frozen at the new hash; EXEMPT above carries the reason.
  'src/pages/ConfiguratorPage.jsx': '1879ad0d21599870bf7fc4c21ec858cdbeb0de28edd59ecca75a0ac79ec49dc6',
  // T84 F1 · NEW PRO files (the skin), frozen at their first hash; EXEMPT above carries the reason.
  // T84 F6 re-frozen at the new hash; EXEMPT above carries the reason.
  // T84 F8 re-frozen at the new hash; EXEMPT above carries the reason.
  'src/components/studio/studio.css': '010b9b298550f78215a33f90425f2a501c0d6ce51f927fe5171520113a5e980a',
  'src/components/studio/StudioIcons.jsx': 'f84fdead962263ea0eda756addf80ad801fe81b253b0273ca876562e344ca0ff',
  'src/components/studio/lib/studioSkin.js': '72bd15140c022ca10bd39de4f01c959d50df1f3dd56a0e564729390a4c85b31d',
  // T84 F2 · NEW PRO files (the shell), frozen at their first hash; EXEMPT above carries the reason.
  // T84 F6 re-frozen at the new hash; EXEMPT above carries the reason.
  'src/components/studio/StudioShell.jsx': '3f0a946d45fc1d9c2b283536ab42f9be46b5cb43e3d3e8cf22e926cdc6fbfec3',
  'src/components/studio/StudioRail.jsx': '09a32f77522d130b3d76e3ff8a4a3a17688ba98c434733313fa2ae435854e7ff',
  'src/components/studio/SelectionBreadcrumb.jsx': '29dfd5f6748b83a8d6b8ac36c778e40c2d6971b7290cf8ff3a8c9c92a86e7dc0',
  'src/components/studio/StatusBar.jsx': 'cbc25914a5ca5369f84c0a986005cd043c5dd9af6ff1afad99b8894eef329abf',
  'src/components/studio/lib/studioFace.js': '550ae67a86068132c172498c49715dba928da790ca7846b799e15d642d647a6a',
  // T84 F3 · the quick cards: DELETED by the chat fix of 30.10.2026 (DELETED below carries the reason).
  // T84 F4 · NEW PRO files (the inspector host), frozen at their first hash; EXEMPT above carries the reason.
  'src/components/studio/InspectorHost.jsx': '5febfa121dca59dab1939491dba73e1e6986c1093e07c5be8b42da58c648c31d',
  // T84 F5 · NEW PRO files (the errors you can see), frozen at their first hash; EXEMPT above carries the reason.
  'src/components/studio/UnitIssueMarker.jsx': 'db0654d18de67bdc71741d4cf4d456fa5e5e5fac003c3efc51f0e212413a1fc1',
  'src/components/studio/IssueStrip.jsx': '02363c544450a030bcb34f20643a04852d1d8740a5d656d7452f982ce2047797',
  'src/components/studio/lib/studioIssues.js': '49e8c7f94b9f6d28553380be6e33c20c962122fbdf8bede857aa90493bbbce4e',
  // T84 F6 · NEW PRO files (the scene's edge), frozen at their first hash; EXEMPT above carries the reason.
  'src/components/studio/SceneToggles.jsx': '9f32a1ec81a2fe4fc1edbaadd564a0d89b25acdd34e2e03495f5202c72f97204',
  'src/components/studio/CameraBar.jsx': '5fc9ef238bc0b9d724c85bde0c35f1cd304679f84b0b92167536654633995ac2',
  'src/components/studio/lib/cameraPresets.js': 'ebca96709d0a5e5c9803980130a4720357e06f724bf56b8bc5d59f0d63ebd6f6',
  // T84 F7 · NEW PRO files (the rail's menus, Escape and the parity gate), frozen at their first hash; EXEMPT above carries the reason.
  'src/components/studio/RailMenus.jsx': 'ccc008cc15f0ae0150c50a54513f75917689aa217d31d74aab3b61eabd0d912a',
  'src/components/studio/lib/studioEscape.js': '3528ca04e92c37b6091e434fbbd0f9f174dcc36ef21a560e9a27e5b7cf0cfc86',
  'src/components/jc/RefusalScreen.jsx': '33988534189bc6d45b38062445d535c11a0fea2e58d78a7b4adf5e8bcc0a9894',
  // T-CC1a F6 · a NEW PRO file, frozen at its first hash: the import's Joinery Core project picker.
  'src/components/jc/JcProjectPicker.jsx': '59ed52c4fb29574674129728666248cf94e5b8df28aacd03386e33baf4a6af9d',
  // T-CC1b · a NEW PRO file, frozen at its first hash (EXEMPT above carries the reason).
  'src/components/JcStockModal.jsx': 'bf686137b95f5548619e2aaff9bbdfbdfd4d40037607e9efbc2d4d25a83deca4',
  // T-CC1b · a NEW PRO file, frozen at its first hash (EXEMPT above carries the reason).
  'src/components/drawings/AiVisualCard.jsx': '565b087bb27673f594857a9efd1caaaba65be57b89b3ae3ce5330626a129a489',
};

// ─── THE WALKER ────────────────────────────────────────────────────────────
//
// Zero dependencies (CLAUDE.md), so the import graph is read the way
// test/imports.test.js reads it: with a regex over source text that has had
// its comments taken out first. A comment that says `import Foo from
// '../components/Foo'` is prose, not an edge, and a boundary test that
// believed prose would fail on this very file's header.

const CODE_FILE = /\.(js|jsx|mjs)$/;

function filesUnder(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir).sort()) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...filesUnder(path));
    else if (CODE_FILE.test(path)) out.push(path);
  }
  return out;
}

/** Comments out; string literals stay, because the specifier IS a string. */
const uncomment = (text) => text
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^[ \t]*\/\/.*$/gm, ' ');

/**
 * Every specifier this file names: `import … from 'x'`, a bare `import 'x'`,
 * `export … from 'x'`, `export * from 'x'`, and `import('x')`. The negated
 * class in the first pattern spans newlines on purpose — a brace list broken
 * over eight lines is one import, and half the app writes them that way.
 */
function specifiersOf(text) {
  const code = uncomment(text);
  const found = [];
  const patterns = [
    /(?:^|[\s;}])import\s+(?:[^'"();]*?\s+from\s*)?['"]([^'"]+)['"]/g,
    /(?:^|[\s;}])export\s+(?:\*|\{[^}]*\})\s*(?:as\s+[A-Za-z_$][\w$]*\s*)?from\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const re of patterns) {
    for (const m of code.matchAll(re)) found.push(m[1]);
  }
  return found;
}

/**
 * A specifier that starts with `.` or `/` is OURS and must land on a file; a
 * bare one is an npm package and none of this test's business. `?url` and
 * `?raw` are Vite's, and the file is what is on the left of the question mark.
 */
function resolveSpec(fromFile, spec) {
  const clean = spec.split('?')[0].split('#')[0];
  if (!clean.startsWith('.') && !clean.startsWith('/')) return { external: true };
  const base = clean.startsWith('/')
    ? join(ROOT, clean.replace(/^\/+/, ''))
    : resolve(dirname(fromFile), clean);
  const tries = [
    base, `${base}.js`, `${base}.jsx`, `${base}.mjs`,
    join(base, 'index.js'), join(base, 'index.jsx'),
  ];
  for (const candidate of tries) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return { path: candidate };
  }
  return { unresolved: spec };
}

/**
 * THE FOUR ZONES — AND THE ONE THAT STAYED BEHIND.
 *
 * T59 wrote three: *"The SHARED CORE both apps may import is exactly:
 * `src/engine/**`, `src/3d/**`, `src/stores/**`"* — and `src/lib` was ruled
 * PRO's, so a retail file reaching for it was a violation.
 *
 * ─── WHY THAT LINE IS GONE (turn 62, F1) ───────────────────────────────────
 *
 * The owner, 01.09.2026, verbatim — and this is the law the whole of T62 is
 * audited against:
 *
 *   *"ale cała idea była że niektóre zmiany są wspólne, po to mamy cały
 *   silnik w jednym miejscu. jak piszę 1 do 1 to KOPIUJ. ale kopiuj — nie
 *   kasuj, nie zmieniaj PRO, tylko zrób identycznie w retail."*
 *
 * One engine in one place. `src/lib/wallElements.js`, `slopeLine.js` and
 * `slopeFlat.js` ARE that engine for a wall: they hold the slope, the recess,
 * the chimney, the clamps and the defaults, in pure functions with no React
 * and no styling. T59's line locked retail out of them, retail was told to
 * write its own, and what it wrote was a `SLOPED CEILING NO | YES` chip where
 * PRO has an editor. The owner's verdict on that chip: *"miało być prawie
 * 1 do 1 a jest 1 do 20"*. The line is the cause; the line moves.
 *
 * ─── WHAT DID *NOT* MOVE, AND WHY IT MUST NOT ──────────────────────────────
 *
 * `src/components/**` and `src/pages/**` stay PRO. Retail importing a PRO
 * component is still a violation and the test below still says so. The
 * owner's law is COPY, not import: PRO keeps its file, retail gets its own,
 * and the freeze test above proves PRO's bytes never moved to make that
 * happen. A shared component would move them.
 *
 * So: FOUR core directories a retail file may import, PLUS retail's own —
 * `src/engine/**`, `src/3d/**`, `src/stores/**`, `src/lib/**`, `src/retail/**`.
 * The zone is decided by the path and by nothing else.
 */
const CORE_DIRS = ['engine/', '3d/', 'stores/', 'lib/'];

/** Named in one place so the violation message and the docs cannot drift. */
const ALLOWED_ZONES = 'src/retail, src/engine, src/3d, src/stores, src/lib';

function zoneOf(absPath) {
  const rel = relative(SRC, absPath);
  if (rel.startsWith('..')) return 'outside-src';
  if (rel === 'retail' || rel.startsWith('retail/')) return 'retail';
  if (CORE_DIRS.some((d) => rel.startsWith(d))) return 'core';
  return 'pro';
}

const show = (abs) => relative(ROOT, abs);

// ─── 1. THE PRO FROZEN-FILES ASSERTION ─────────────────────────────────────

test('F1: the frozen surface, 89 files of PRO, byte for byte (approved setup illustrations, the Studio and the project file window included; the quick card\'s four deleted 30.10.2026)', () => {
  const moved = [];
  for (const [rel, want] of Object.entries(FROZEN)) {
    const path = join(ROOT, rel);
    if (!existsSync(path)) { moved.push(`${rel} — GONE (no deletions this turn)`); continue; }
    const got = createHash('sha256').update(readFileSync(path)).digest('hex');
    if (got !== want) moved.push(`${rel}\n    want ${want}\n    got  ${got}`);
  }
  assert.deepEqual(moved, [], `PRO IS FROZEN. These files moved:\n  ${moved.join('\n  ')}`);
});

test('F1 · the frozen surface — nothing was ADDED to it either', () => {
  const onDisk = [
    'index.html', 'src/App.jsx', 'src/main.jsx',
    ...filesUnder(join(SRC, 'components')).map(show),
    ...filesUnder(join(SRC, 'pages')).map(show),
    // T84 F1 · the Studio's stylesheet is PRO's surface like the components it skins: listed here beside them and
    // hashed in FROZEN (verify/t84/DECISIONS.md); the walker and the module graph still read code files only.
    ...(existsSync(join(SRC, 'components/studio'))
      ? readdirSync(join(SRC, 'components/studio')).filter((n) => n.endsWith('.css')).map((n) => `src/components/studio/${n}`)
      : []),
    // Chat fix 28.10.2026 · the setup workspace's stylesheet, PRO's surface like the Studio's.
    'src/components/setup-workspace.css',
  ].filter((p) => existsSync(join(ROOT, p))).sort();
  // A new component is not a byte moved, but it is PRO changing, and the
  // manifest alone would never see it.
  assert.deepEqual(onDisk, Object.keys(FROZEN).sort(),
    'the PRO surface gained or lost a file — PRO IS FROZEN');
});

// ─── T67 · THE EXEMPTION IS ITSELF GUARDED ─────────────────────────────────
//
// An exemption list with no test is a hole. This one is held to three things:
// every path on it is in the manifest (so it is RE-FROZEN and not merely
// excused), every path carries the owner's own sentence as its reason, and the
// list is exactly the three CLAUDE.md names — a fourth file cannot be slipped
// in without this failing and saying which.
//
// ─── AMENDED BY TURN 69 · A REASON NAMES ITS OWN TURN ──────────────────────
//
// The reason was matched against `/T67 F\d/`, which is the right assertion
// written one turn too narrowly: T67's own paragraph above says the exemption
// *"bought ONE night's edit and not a standing permission"*, so a file edited
// again is a file whose reason must be RE-ARGUED — with the NEW turn's feature
// and the NEW quote, not last turn's. CLAUDE.md F1 asks for exactly that
// tonight: *"its `EXEMPT` entry is RENEWED with tonight's quote and its NEW
// hash; the map does not grow."*
//
// So the pattern asks for A TURN AND A FEATURE (`T69 F1`), which is what the
// assertion always meant, and NOTHING ELSE here is loosened: the list is still
// held to exactly the three names, every one is still re-frozen at a hash read
// off disk, and every one still carries the owner's own words.
// ─── AMENDED BY TURN 71 · TWO MORE NAMES, ARGUED THE SAME WAY ──────────────
//
// The set had to reach the window (the render, the worktops, the title block's
// words), so two PRO files are licensed tonight, each with the owner's words
// and its feature beside it, each re-frozen at its new hash. The list is held
// to exactly these five; a sixth cannot be slipped in without this failing.
test('T67 · the exemption names its files, each re-frozen, each with its reason', () => {
  // AMENDED BY T75: *"every PRO file edited is licensed in EXEMPT with the
  // owner's words from this file and re-frozen at its new hash in the same
  // commit."*  Each one T75 adds is named here by the commit that edits it.
  // AMENDED BY T75 F23: `RightPanel`'s licence is RENEWED (the Joints row,
  // *"lisp najpierw."*) and re-frozen at its new hash; the list did not grow.
  assert.deepEqual(Object.keys(EXEMPT).sort(), [
    'src/components/SetupArt.jsx',
    'src/components/WizardSummary.jsx',
    'src/components/NewProjectFlow.jsx',
    'src/components/Modal.jsx',
    'src/components/AddItems.jsx',
    'src/components/AssignMaterialsModal.jsx',
    'src/components/BomPanel.jsx',
    // T79 F12 · *"naciskasz wycentruj pomiędzy, wybierasz dolny i górny element"*: a click in the editor's canvas is the pick.
    'src/components/CabinetEditorModal.jsx',
    // T82 F6 · *"the same in the viewer's "Open all" of T69"*: Open all takes the HAWA door.
    'src/components/CanvasToolbar.jsx',
    // T82 F12 · *"miejsce z tylu na rurki"*: the Check panel's note level, the service void.
    'src/components/CheckPanel.jsx',
    // T75 F22 · *"the CNC export carries a banner counting the lines that are not 'cut'"*.
    'src/components/CncTree.jsx',
    'src/components/CncView.jsx',
    // T78 F19 · *"Cabineo 8 AND 12, chosen in the company's default settings"*: the Joints choice on the company defaults screen.
    'src/components/CompanyDefaultsModal.jsx',
    'src/components/ContextMenu.jsx',
    // T82 F20, after the review · *"musze miec dzisiaj profesjonalne rysunki dla klientow"*: Update and save marks the job saved only when it was stored.
    'src/components/DesignSettingsModal.jsx',
    // Chat fix 29.10.2026 F2 · *"droban funcje ale jej nei ma czyli center between soprawdz jeszcze raz prosze"*:
    // the piece's window lets Center between's two picks through to the scene while the mode is armed.
    'src/components/DoorModal.jsx',
    // T86B F5 · the chest island's variant popup, a NEW PRO file (the owner: "cos jak wyspa ale przez grab i move").
    'src/components/ChestIslandPopup.jsx',
    'src/components/DrawRoomModal.jsx',
    'src/components/DrawingModal.jsx',
    'src/components/ElementProperties.jsx',
    'src/components/FrontDecorationControls.jsx',
    // T80 F10 · *"Each in the left messages and in the Check panel"*: the in-frame rows, a new PRO surface.
    'src/components/InframeWarnings.jsx',
    'src/components/JpullRunModal.jsx',
    // T75 F15 · *"The held-open row `cornice-pelmet` opens as a PLAIN pelmet"*.
    'src/components/LibraryPanel.jsx',
    // T79 F1 · *"wszystkie informacje po zmianach które pokazujesz na ekranie proszę zrób po lewej"*: one bottom-left column and the Changes list.
    'src/components/Messages.jsx',
    'src/components/PartDetailModal.jsx',
    // CHAT FIX 19.10.2026 · *"nie ma mozliwosci dodania drugiego ponizej, dodaj to prosze"*: the rod's window finds its rod by item id.
    'src/components/RailModal.jsx',
    'src/components/RightPanel.jsx',
    'src/components/RoomModal.jsx',
    // T75 F20 · *"`lib/templates.js` grows `kind: 'set'`"*: the modal saves a selection as a set.
    'src/components/SaveTemplateModal.jsx',
    'src/components/SettingsPanel.jsx',
    // T78 F21 · *"cale sprayowanie jako osobne menu Cabinet Core"*: the Spraying page, a new PRO surface.
    'src/components/SprayingPanel.jsx',
    // T75 F20 · *"the Library's `media` category (`soon`) becomes the sets shelf"*.
    // T82 F20, after the review · *"musze miec dzisiaj profesjonalne rysunki dla klientow"*: Start designing reads whether the shelf took the job.
    'src/components/StartScreen.jsx',
    'src/components/TopBar.jsx',
    'src/components/UnitSizeModal.jsx',
    // 15.10.2026 (the evening) · *"nie widze kresek, gdzie jest komin i gdzie wneka"*: the recess and the chimney seen from the front, the recess's band.
    'src/components/WallElevationModal.jsx',
    'src/components/WarehouseModal.jsx',
    'src/components/WatchLayoutModal.jsx',
    'src/components/WizardSettings.jsx',
    'src/pages/ConfiguratorPage.jsx',
    // T84 F1 · the skin: licensed in EXEMPT above with the owner's words (CLAUDE.md T84 FROZEN 4).
    'src/components/studio/studio.css',
    'src/components/studio/StudioIcons.jsx',
    'src/components/studio/lib/studioSkin.js',
    // T84 F2 · the shell: licensed in EXEMPT above with the owner's words (CLAUDE.md T84 FROZEN 4).
    'src/App.jsx',
    'src/components/studio/StudioShell.jsx',
    'src/components/studio/StudioRail.jsx',
    'src/components/studio/SelectionBreadcrumb.jsx',
    'src/components/studio/StatusBar.jsx',
    'src/components/studio/lib/studioFace.js',
    // T84 F4 · the inspector host: licensed in EXEMPT above with the owner's words (CLAUDE.md T84 FROZEN 4).
    'src/components/MultiUnitPanel.jsx',
    'src/components/studio/InspectorHost.jsx',
    // T84 F5 · the errors you can see: licensed in EXEMPT above with the owner's words (CLAUDE.md T84 FROZEN 4).
    'src/components/studio/UnitIssueMarker.jsx',
    'src/components/studio/IssueStrip.jsx',
    'src/components/studio/lib/studioIssues.js',
    // T84 F6 · the scene's edge: licensed in EXEMPT above with the owner's words (CLAUDE.md T84 FROZEN 4).
    'src/components/studio/SceneToggles.jsx',
    'src/components/studio/CameraBar.jsx',
    'src/components/studio/lib/cameraPresets.js',
    // T84 F7 · the rail's menus, Escape and the parity gate: licensed in EXEMPT above with the owner's words (CLAUDE.md T84 FROZEN 4).
    'src/components/studio/RailMenus.jsx',
    'src/components/studio/lib/studioEscape.js',
    // Chat fix 28.10.2026 · the setup workspace's stylesheet (the owner: "kafelki za duze", "koduj tutaj").
    'src/components/setup-workspace.css',
    // Chat fix 28.10.2026 F1 · the job as a file: the window of Open from file's two questions, a NEW PRO file
    // (the owner: "zrobisz mi pozniej cos co zadziala, czyli export i import projektow").
    'src/components/ProjectFileModal.jsx',
    // T-CC1a F1 · *"oczywiscie do CC laczysz sie tylko przez JC"*: JC's client tag in index.html (the badge and the
    // login window, re-pointed for F1, left the list with their deletion in F3: DELETED below).
    'index.html',
    // T-CC1a F2 · *"tylko przez JC po zalogowaniu"*: the session first in main.jsx; the refusal card, a NEW PRO file.
    'src/main.jsx',
    'src/components/jc/RefusalScreen.jsx',
    // T-CC1a F6 · *"w przyszlosci nie bedzie save to file, po co?"*: the import's project picker, a NEW PRO file.
    'src/components/jc/JcProjectPicker.jsx',
    // T-CC1b · *"wprowadza w blad"*, *"Database niepotrzebne"*, *"materialy z JC"*, *"max 3 proby"*, *"ornamenty zostaw
    // tylko dla Skylon Joinery"* (the owner, 01.11.2026): the frozen files this turn licenses and its NEW PRO files.
    'src/components/RenderModal.jsx',
    'src/components/MaterialPicker.jsx',
    'src/components/JcStockModal.jsx',
    'src/components/drawings/AiVisualCard.jsx',
].sort(), 'the exemption list is not the approved UI and CLAUDE.md paths');
  // AMENDED BY THE CHAT FIX OF 28.10.2026 (the job as a file): a NEW PRO file born of a chat fix has no turn to
  // name, so its reason names the fix by its date and its feature, `Chat fix 28.10.2026 F1`, the way the approved
  // setup names `Setup UI 26.10.2026 F1`; the owner's own words beside it are asked exactly as before. The owner:
  // *"zrobisz mi pozniej cos co zadziala, czyli export i import projektow"* (28.10.2026).
  for (const [rel, why] of Object.entries(EXEMPT)) {
    assert.ok(FROZEN[rel], `${rel} is exempt but not re-frozen — that is a hole, not an exemption`);
    // AMENDED BY T86B F5 (31.10.2026, INT): a turn may carry a letter (T86B, the second shift of 30.10), so the turn
    // reads T\d{2}[A-Z]?; nothing else in the pattern moves.
    // AMENDED BY T-CC1a F1 (31.10.2026): the merger's turns are named T-CC<n><letter> (the owner's name for this turn,
    // "T-CC1a"), so that name reads beside T\d{2}[A-Z]?; nothing else in the pattern moves.
    assert.match(why, /\b(?:(?:T\d{2}[A-Z]?|DECOR) F\d|Setup UI 26\.10\.2026 F1|Chat fix \d{2}\.\d{2}\.\d{4} F\d)|T-CC\d[a-z]? F\d/, `${rel} does not say which turn and feature licensed it`);
    assert.match(why, /\*"/, `${rel} does not carry the owner's own words`);
    const got = createHash('sha256').update(readFileSync(join(ROOT, rel))).digest('hex');
    assert.equal(got, FROZEN[rel], `${rel}'s new hash is not the one written down`);
  }
});

test('Kasacja 30.10.2026 · the four deleted files are gone whole: not on disk, not frozen, not exempt, imported by nothing', () => {
  for (const [rel, why] of Object.entries(DELETED)) {
    assert.ok(!existsSync(join(ROOT, rel)), `${rel} is still on disk: a deletion, not a gate`);
    assert.equal(FROZEN[rel], undefined, `${rel} is still frozen`);
    assert.equal(EXEMPT[rel], undefined, `${rel} is still exempt`);
    // AMENDED BY T-CC1a F3: a deletion names its fix or its turn and feature.
    // AMENDED BY T-CC1b F2: the scene corner's View dropdown, by name.
    assert.match(why, /Chat fix 30\.10\.2026 F2|T-CC1a F3|T-CC1b F2/);
    assert.match(why, /\*"/, `${rel} does not carry the owner's own words`);
  }
  // AMENDED BY T-CC1a F3: the two files of CC's own login and mock mode, by name.
  // AMENDED BY T-CC1b F2: SceneViewMenu, by name.
  const names = /QuickSelectionCard|studioCards|CardRow|RefusedField|AuthModal|MockModeBadge|SceneViewMenu/;
  for (const abs of [...filesUnder(join(SRC, 'components')), ...filesUnder(join(SRC, 'pages')), ...filesUnder(join(SRC, 'stores'))]) {
    const code = readFileSync(abs, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    assert.doesNotMatch(code, names, `${show(abs)} still names a deleted file`);
  }
});

test('F1 · the frozen surface — and git agrees, where git can answer', () => {
  const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  let base = null;
  for (const ref of ['origin/main', 'main']) {
    try { git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]); base = ref; break; } catch { /* next */ }
  }
  if (!base) {
    // A tarball or a clone with no such ref. The manifest above already
    // answered; this assertion has nothing to add and says so out loud
    // rather than passing in silence.
    // AMENDED BY THE CHAT FIX OF 28.10.2026: 93, components/ProjectFileModal.jsx frozen at its first hash.
    // AMENDED BY THE CHAT FIX OF 30.10.2026: 89, the quick card's four files deleted (DELETED above).
    // AMENDED BY T85 (30.10.2026, INT): 90. The manifest above holds 90 since that fix (94 less the four), so a
    // checkout with no base ref (every pull request's CI: actions/checkout fetches only the merge ref) read 89 and
    // went red on PR #87, #88 and #89 while a push to main, which has origin/main, never reached this line. The
    // count is the manifest's own; no file was frozen or thawed by this line.

    // AMENDED BY T86B F5 (31.10.2026, INT): 91, components/ChestIslandPopup.jsx frozen at its first hash.
    // AMENDED BY T-CC1a F2 (31.10.2026, INT): 92, components/jc/RefusalScreen.jsx frozen at its first hash
    // (*"tylko przez JC po zalogowaniu"*, the owner, 31.10.2026, 09:08).
    // AMENDED BY T-CC1a F3 (31.10.2026, INT): 90, components/AuthModal.jsx and components/MockModeBadge.jsx deleted
    // (DELETED above; *"oczywiscie do CC laczysz sie tylko przez JC"*, the owner, 30.10.2026).
    // AMENDED BY T-CC1a F6 (31.10.2026): 91, components/jc/JcProjectPicker.jsx frozen at its first hash
    // (*"w przyszlosci nie bedzie save to file, po co?"*, the owner, 31.10.2026, 01:06).
    // AMENDED BY T-CC1b (01.11.2026, INT): 92, components/studio/SceneViewMenu.jsx deleted (*"dwa menu View, jedno
    // wystarczy"*), components/JcStockModal.jsx and components/drawings/AiVisualCard.jsx frozen at their first hash
    // (*"materialy z JC"*, *"max 3 proby"*, the owner, 01.11.2026).
    assert.ok(Object.keys(FROZEN).length === 92, 'no base ref: the manifest is the whole proof here');

 

    return;
  }
  // T67: the three exempted paths are excluded BY NAME — `:(exclude)` is git's
  // own pathspec magic, so the question asked is still "did any other PRO file
  // move", and the three that did are answered by the hash manifest above,
  // which is where they are re-frozen.
  const diff = git([
    'diff', '--stat', base, '--',
    'index.html', 'src/App.jsx', 'src/main.jsx', 'src/components', 'src/pages',
    ...Object.keys(EXEMPT).map((rel) => `:(exclude)${rel}`),
    // Chat fix 30.10.2026: a deletion named in DELETED is answered below, not here.
    ...Object.keys(DELETED).map((rel) => `:(exclude)${rel}`),
  ]).trim();
  assert.equal(diff, '', `git diff ${base} -- <the frozen paths> must be EMPTY:\n${diff}`);
});

// ─── 2. THE IMPORT-BOUNDARY WALKER ─────────────────────────────────────────

test('F1 · the walker can see — a self-test before it is trusted', () => {
  // A boundary test that parses nothing passes everything. Before it is
  // allowed to say "no violations", it proves on known ground that it finds
  // edges at all. The ground is counted, not guessed: App.jsx names fifteen
  // specifiers and ConfiguratorPage.jsx is the file that actually holds PRO's
  // component imports — thirty-four of them.
  const app = specifiersOf(readFileSync(join(SRC, 'App.jsx'), 'utf8'));
  assert.ok(app.length >= 15, `the walker found only ${app.length} specifiers in App.jsx — it is blind`);

  const page = specifiersOf(readFileSync(join(SRC, 'pages/ConfiguratorPage.jsx'), 'utf8'));
  const intoComponents = page.filter((s) => s.includes('components/'));
  assert.ok(intoComponents.length > 20,
    `the walker found only ${intoComponents.length} component imports in ConfiguratorPage.jsx`);

  const main = specifiersOf(readFileSync(join(SRC, 'main.jsx'), 'utf8'));
  assert.ok(main.some((s) => /\.\/App(\.jsx)?$/.test(s)), 'the walker cannot see main.jsx → App');

  const resolved = resolveSpec(join(SRC, 'main.jsx'), './App.jsx');
  assert.equal(zoneOf(resolved.path), 'pro', 'the walker cannot tell PRO from anything else');
  assert.equal(zoneOf(join(SRC, 'retail/x.js')), 'retail');
  assert.equal(zoneOf(join(SRC, '3d/Scene.jsx')), 'core');
  assert.equal(zoneOf(join(SRC, 'engine/doors.js')), 'core');
  assert.equal(zoneOf(join(SRC, 'stores/uiStore.js')), 'core');
  // T62 F1: `src/lib` is core now — the shared engine for a wall lives there.
  assert.equal(zoneOf(join(SRC, 'lib/wallElements.js')), 'core',
    'src/lib/wallElements.js IS the shared core — one engine in one place');
  assert.equal(zoneOf(join(SRC, 'lib/slopeFlat.js')), 'core', 'src/lib is the shared core');
  assert.equal(zoneOf(join(SRC, 'lib/slopeLine.js')), 'core', 'src/lib is the shared core');
  // The COMPONENT half of the boundary did not move, and this is the assertion
  // that stops a later turn from "tidying" it away. Copy, not import.
  assert.equal(zoneOf(join(SRC, 'components/RoomModal.jsx')), 'pro',
    'src/components is NOT the shared core — retail COPIES a PRO screen, it never imports one');
  assert.equal(zoneOf(join(SRC, 'pages/ConfiguratorPage.jsx')), 'pro', 'src/pages is NOT the shared core');
});

test('F1 · the iron boundary — src/retail imports ONLY retail and the shared core', () => {
  const violations = [];
  for (const file of filesUnder(join(SRC, 'retail'))) {
    for (const spec of specifiersOf(readFileSync(file, 'utf8'))) {
      const hit = resolveSpec(file, spec);
      if (hit.external) continue;
      if (hit.unresolved) {
        violations.push(`${show(file)} imports '${spec}' — which resolves to nothing`);
        continue;
      }
      const zone = zoneOf(hit.path);
      if (zone !== 'retail' && zone !== 'core') {
        violations.push(`${show(file)} imports ${show(hit.path)} (${zone}) — the boundary allows only `
          + ALLOWED_ZONES);
      }
    }
  }
  assert.deepEqual(violations, [], `THE IRON BOUNDARY:\n  ${violations.join('\n  ')}`);
});

test('F1 · the iron boundary — nothing outside src/retail imports from it', () => {
  const violations = [];
  for (const file of filesUnder(SRC)) {
    if (zoneOf(file) === 'retail') continue;
    for (const spec of specifiersOf(readFileSync(file, 'utf8'))) {
      const hit = resolveSpec(file, spec);
      if (hit.external || hit.unresolved) continue;
      if (zoneOf(hit.path) === 'retail') {
        violations.push(`${show(file)} imports ${show(hit.path)} — the shared core and PRO know `
          + 'nothing of retail');
      }
    }
  }
  assert.deepEqual(violations, [], `THE IRON BOUNDARY:\n  ${violations.join('\n  ')}`);
});

// ─── 3. THE PRO MODULE GRAPH ───────────────────────────────────────────────

/** Every file reachable from an entry by a static or dynamic relative import. */
function moduleGraph(entry) {
  const seen = new Set();
  const queue = [entry];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file) || !CODE_FILE.test(file)) continue;
    seen.add(file);
    for (const spec of specifiersOf(readFileSync(file, 'utf8'))) {
      const hit = resolveSpec(file, spec);
      if (hit.path && !seen.has(hit.path)) queue.push(hit.path);
    }
  }
  return seen;
}

test('F1 · the PRO bundle contains not one file from src/retail', () => {
  const graph = moduleGraph(join(SRC, 'main.jsx'));
  // Vacuously green is the failure mode of every graph test ever written.
  assert.ok(graph.size > 100, `the PRO graph walked only ${graph.size} files — the walk is broken`);
  const retail = [...graph].filter((f) => zoneOf(f) === 'retail').map(show);
  assert.deepEqual(retail, [], `PRO's module graph reached retail:\n  ${retail.join('\n  ')}`);
});
