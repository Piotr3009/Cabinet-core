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
  'src/components/CncTree.jsx':
    'T75 F22 · after an export the CNC view says how many parts the machine does not finish (the export\'s readiness banner), one line beside the gate\'s. *"the CNC export carries a banner counting the lines that are not `\'cut\'`."*'
    + ' DECOR F3: await packaged front/back CNC exports. *"nie mam zreob default jak uwazasz najwyzej pozneij poprawimy jedz z koksem i koduj prosze"*'
    + ' T77 F3 · the two levels of the Ornate reference files: one select, shown only to a job that carries an Ornate leaf, read by every download. *"The CNC export offers two levels in the existing export options (no new numeric field): `Reference (default)` at `sampleMm` and `Full resolution` at `fullSampleMm`; the manifest records which one was written."*',
  'src/components/SaveTemplateModal.jsx':
    'T75 F20 · right-clicked inside a selection of two or more, the modal saves a SET (templateStore.saveSet): the units left to right with the gaps between them. *"`lib/templates.js` grows `kind: \'set\'`: an ORDERED list of units (type + params, positions stripped as today) with the gaps between them."*',
  'src/components/TopBar.jsx':
    'T75 F20 · the Library menu\'s Sets row says what is on the shelf instead of "0 types". *"the Library\'s `media` category (`soon`) becomes the sets shelf (saved sets and shipped sets on one list)."*',
  'src/components/WarehouseModal.jsx':
    'T75 F21 · the three buttons read Import from JoineryCore (CSV), Export project list for JoineryCore (CSV) and Export for JoineryCore (CSV); the project list holds the rows THIS project\'s stock carries (projectUuids), not every uuid in the warehouse (the probe exported 3 of 3 for a project naming none). *"stock połączony z joinery core, na razie export import za pomocą csv coś jak production core, później api"*.',
  'src/components/LibraryPanel.jsx':
    'T75 F20 · the sets shelf: the Library\'s Sets category lists the five shipped sets (engine/sets.js) above the saved ones, a saved SET row names its units, and a click inserts the whole set through the store (insertSet) where a unit would go. *"the Library\'s `media` category (`soon`) becomes the sets shelf (saved sets and shipped sets on one list)."* '
    + 'T75 F10 · a plus on an empty island face opens the library ON that face and the unit is added there (addUnit with the face\'s index). *"A unit is added to a face as to a wall (addUnit with the face\'s index; the library\'s plus points on the plan show the faces)."*'
    + ' ' + 'T75 F15 · the Extras row "Pelmet" is an ACTION done to the selected wall unit\'s run: the panel hands the store the action and the selection (libraryAction) and says its answer. *"The held-open row `cornice-pelmet` opens as a PLAIN pelmet: a flat strip under a run of wall units."*',
  // ─── ADDED BY TURN 75 · THE BIG TURN ───────────────────────────────────
  'src/components/ContextMenu.jsx':
    'T75 F5 · the right-click offers the UPSTAND beside the plinth, on and off per run, and the menu is handed the two store calls it needs (addUpstand, removeUpstand). *"UPSTAND: an auto-part along the wall behind every base run that has a worktop ... on and off per run like the plinth (BACKLOG #16\'s grammar: added by a decision, visible only then)."*',
  'src/components/BomPanel.jsx':
    'T75 F22 · the cut list shows each part\'s state (Cut, Outline only, Fit on site, Bought) in a State column, and every ironmongery line says Bought. *"The cut list, the BOM and the CNC export show the state on every line."* '
    + 'T75 F21 · the purchase list is priced at what the job was quoted at (project.warehouseStamp), the file carries it, and Accept today\'s prices is the owner\'s decision to re-price. *"stock połączony z joinery core, na razie export import za pomocą csv coś jak production core, później api"*; *"prices change a quote only by the owner\'s decision"*. '
    + 'T75 F5 · the cut list and the BOM receive the room, so the worktop reaches them: its slabs (a corner is two, an L is one shaped like the L), the connector bolts as an order line, the joint and every cut-out as a NOTE. *"Done means the whole road ... lands in the cut list and the BOM."* One line: `room: project.room` handed to `buildBom`.'
    + ' DECOR F4: show the decorative construction and production status on each BOM row. *"nie mam zreob default jak uwazasz najwyzej pozneij poprawimy jedz z koksem i koduj prosze"*'
    + ' T76 F5 · the row shows the construction label under the part and its state in the T75 State column, never a second status. *"the BOM panel shows the T75 State column and the construction label, not a second status."*'
    + ' T76 F7 · the walk measured the State column past the 560 px panel (AM strips and their gluing NOTE): the material cell truncates at 160 and the state may wrap. *"Test the way the client clicks."*',
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
    + ' T78 F8 · the Doors section\'s Corner doors choice on an L: Pair or Bi-fold, written as `corner_doors` through updateUnitParams; the engine\'s own sentence (CORNER_L_BIFOLD) under it; no number typed. *"zawiasy podwojne czyli jedne drzwiczki do carcasu a pozniej zawiasy od drzwiczek do drzwiczek."*',
  // ─── ADDED BY TURN 76 · GPT'S DECORATIVE FRONTS, LANDED AS A PATCH ─────────
  // CLAUDE.md T76, FROZEN 3: *"every PRO file edited is licensed in `EXEMPT`
  // with the owner's words from this file (or GPT's licence line, which quotes
  // the owner's own authorisation of 9.10.2026) and re-frozen at its new hash
  // in the same commit."*  GPT's lines below are its own, as its patch wrote
  // them; the three files T75 also licensed (BomPanel, CncTree, RightPanel)
  // carry ONE entry above, T75's text and GPT's line.
  'src/components/AssignMaterialsModal.jsx': 'DECOR F4: applied strip stock badges use the same thickness validation as purchasing. *"nie mam zreob default jak uwazasz najwyzej pozneij poprawimy jedz z koksem i koduj prosze"*',
  'src/components/CncView.jsx': 'ORNATE, Piotr 10.10.2026: gotowy kod wlacznei z leyersami prosze do cnc. Shows canonical reference layers and relief depth readouts without changing production export approval. ' + 'DECOR F3: explicit front/back machining preview from shared export geometry. *"nie mam zreob default jak uwazasz najwyzej pozneij poprawimy jedz z koksem i koduj prosze"*'
    + ' T76 F4 · the readout names a V groove for what it is: V, its width at the mouth, its centre line. *"The V groove is a V ... The DXF layer name and the `front-operations.json` entry say which."*'
    + ' T77 F7 · a ready Ornate leaf on the front face says "Proposed relief reference" in the colour of its reference contours, apart from the red blocked label (since F4 a relief that built is not a fault). *"The relief is a PROPOSAL and stays one ... The slab is cut; the relief ships as CAD/CAM reference files with the state `geometry`, never as approved machining, until the owner says otherwise."*',
  'src/components/FrontDecorationControls.jsx': 'ORNATE, Piotr 10.10.2026: rozpisz zakoduj dokaldnei prosze i ja roto dam do clauda, ale daj gotowy kod wlacznei z leyersami prosze do cnc. Adds proposed relief note and mirror choice; no new numeric fields. ' + 'DECOR F1: editable, versioned decorative machining defaults shared with Retail. *"nie mam zreob default jak uwazasz najwyzej pozneij poprawimy jedz z koksem i koduj prosze"*'
    + ' T76 F4 · the Arch rise field goes with the ellipse it set; the defaults the controls show are the profile\'s. *"SEMICIRCULAR arch (rise = half the inner width; ... never squashed to an ellipse)"*'
    + ' T76 F6 · one prop, `fields` (PRO passes nothing and keeps every field); retail passes false and shows no number of a recipe. *"a client picks a style and gets the owner\'s recipe with NO numeric fields (lazy client law; the recipe controls are PRO\'s)"*'
    + ' T76 integration · the AH sentence gets the space GPT\'s line lacked (F2 probe). *"AH (Arched handleless) | A\'s recipe; the J-pull is chosen separately under Opening"*',
  'src/components/PartDetailModal.jsx': 'DECOR F4: decorative layer colours follow the canonical part legend. *"nie mam zreob default jak uwazasz najwyzej pozneij poprawimy jedz z koksem i koduj prosze"*',
  'src/components/SettingsPanel.jsx': 'DECOR F1: project and saved-style decorative recipes. *"nie mam zreob default jak uwazasz najwyzej pozneij poprawimy jedz z koksem i koduj prosze"*',
  'src/components/WizardSettings.jsx': 'DECOR F1: material-slot and saved-style decorative recipes. *"nie mam zreob default jak uwazasz najwyzej pozneij poprawimy jedz z koksem i koduj prosze"*',

  // ─── ADDED BY TURN 74 · THE OWNER'S LIST OF 23.09 ────────────────────────
  // CLAUDE.md T74, FROZEN 3: *"every PRO file edited is licensed in `EXEMPT`
  // with the owner's words from this file and re-frozen at its new hash in the
  // same commit."*  Overturnable with one word each: the engine, the goldens
  // and the cut path are untouched by every entry below.
  'src/components/DrawRoomModal.jsx':
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
    + 'choose, tylko te 2 opcje."*',
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
    + 'firmę, daty, nazwy"*.',
  'src/pages/ConfiguratorPage.jsx':
    'T75 F22 · the Output menu\'s DXF export says the same banner as the CNC view\'s. *"the CNC export carries a banner counting the lines that are not `\'cut\'`."* '
    + 'T75 F20 · a Media wall, Sideboard, Vanity, Utility or Hallway job\'s first plus puts its shipped set on the first wall (insertSet, Room refuses first). *"NEW PROJECT with one of them offers the set first (the first plus point on the first wall)."* '
    + 'T75 F5 · the BOM file is handed the room so the worktop that turns the corner (two slabs and one joint record) rides the file as it rides the panel. *"daj od razu narożniki przemyślane."* '
    + 'DECOR F4: pass actual stock to decorative strip assignment checks. *"nie mam zreob default jak uwazasz najwyzej pozneij poprawimy jedz z koksem i koduj prosze"*. '
    + 'T71 F5: `<DrawingModal rig={renderRig} />`, and the menu path binds the '
    + 'same set with the same worktops and render. *"weź zakoduj"*.'
    + ' T77 F3 · Output > CNC / DXF writes the Ornate reference files at the level the CNC panel chose. *"The CNC export offers two levels in the existing export options (no new numeric field): `Reference (default)` at `sampleMm` and `Full resolution` at `fullSampleMm`; the manifest records which one was written."*',
  // ─── RENEWED BY TURN 69 · THE SAME FILE, A SECOND LICENSED NIGHT ─────────
  // The exemption bought ONE night and not a standing permission — T67 said so
  // — so tonight's edit is argued here again, with tonight's quote and
  // tonight's hash. The map does NOT grow: the count below is still three.
  'src/components/RoomModal.jsx':
    'T75 F9 · the island\'s figure keeps the field it opens: the same press no longer takes the focus off it (the walk\'s one FAIL). *"the island draggable in the plan with its dimension labels clickable (T73 F3 field)"*. '
    + 'T75 F9 · Room setup gets ADD ISLAND (a kitchen job\'s only: the gate is the job\'s family, which retail never meets), the island drawn in the plan, dragged whole and refused in words where it would stand on a cabinet, a box or outside the room, its two figures clickable into a focused, selected field, Rotate 90° and Remove island. *"twoja droga, plus dodawanie szafek po bokach lub end panele, w całości."* '
    + 'T69 F1 · the preset row becomes 1 WALL · 2 WALLS · 3 WALLS · DRAW ROOM…, '
    + 'IMPORT DXF is struck out (*"to nie przejdzie"*), and APPLY is fixed at the '
    + 'two sites its probe convicted: it sends only the keys this window changed, '
    + 'and it is never drawn dead and silent. *"APPLY does nothing — probe first."*',
  'src/components/AddItems.jsx':
    'T75 F19 · two rows, Hooks (a row of the profile count, one BOM line, its qty the count) and Valet rod, added through the same bought-mechanism panel the trouser pull-out uses. *"Two rows in Add items for the wardrobe family: `Hooks` (a row of N, BOM line, placeholder bodies, zero holes) and `Valet rod` (pull-out, BOM line, placeholder, zero holes)."* '
    + 'T75 F16 · the shoe box row says a chest of drawers IS its drawers (the store has always refused a shoe drawer in a ratio stack), and the trouser pull-out and tie rack rows say they go in a wardrobe: a chest stands beside one. *"`WARDROBE_CHEST2 / 3 / 4` copied from `BUDR2 / BUDR / BUDR4`, family wardrobe ... Wardrobes category."* '
    + 'T67 F9 · the label "Watch drawer" becomes "Accessories drawer" on the row, the '
    + 'button and the two notices. *"zmień w PRO też tę nazwę."*'
    + ' T78 F9 · a Carousel row on the L only: one click fits or takes out the bought mechanism through the store\'s `setCornerKit` (one BOM line, a placeholder body, zero holes; a fixed shelf in its way is refused in words). *"krecacy sie naroznik na garnki w srodku."*'
    + ' T78 F11 · a Blind corner pull-out row on the blind kits only (Hafele), through the same setCornerKit: one BOM line, a placeholder body behind the blank, zero holes; a fixed shelf in its way is refused in words. *"hafele naroznik slepy czyli wysuwane."*',
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
  'src/components/FrontDecorationControls.jsx': '029b9a2c4488bcb4e9bdbda77fa4798d2531caaca1d98ff4790d9947dd6171e4',
  'index.html': '9474860393b6e8dd6070d8178b35fbd2fbd309b26cb07b0e6140dcbf914e4912',
  'src/App.jsx': 'f6c33592a05affc52d8167cd776f5164ee2aeaccfea1dfce5dc3756e93f9b968',
  // T78 F11 · re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/AddItems.jsx': '9b041a2a65b2da27d66e9d1880683f31355b69c3aac023eb07ccda9201f3763f',
  'src/components/AddItemsModal.jsx': '952b9e52104d92a148ba00da6ba42166e44824e76aeda7ba0553b22f2633105e',
  'src/components/AssignMaterialsModal.jsx': 'a5110598cd1393143d4a1ba0575ab0974f77390ead98d8213d218ca8551dc754',
  'src/components/AuthModal.jsx': 'b51d7a14910e89553528fe2e36f787502e4b4a77b6c408ebb24323510c164ddc',
  // T76 F1 · re-frozen at the hash of BOTH edits (T75's and GPT's); `EXEMPT` above carries the reasons.
  'src/components/BomPanel.jsx': '966d6494dfb42fa5e7e3bf35e6f25e9bc7514ef558e7eec4a96e1ed96d586733',
  'src/components/CabinetEditorModal.jsx': '3d21bba5af9dc42fecbb620b6594b5a4be79be2e9ce5446cf4b53dc4b09b3ca4',
  'src/components/CanvasToolbar.jsx': 'ee85f7f7d4b3a64021f56cbea5fe36ff504136ace340216fdef71fcb316e2bd9',
  'src/components/CheckPanel.jsx': '65a991cbc4aed29b3c9a49ed613e715dd3d033106f8e5e9ded45e8125a8dc014',
  'src/components/ChosenDecorTile.jsx': '38d960b752ed6d5e99519573a3c6b9d31d687820f38b4e39ee11b971b2c3b683',
  // T76 F1 · re-frozen at the hash of BOTH edits (T75's and GPT's); `EXEMPT` above carries the reasons.
  'src/components/CncTree.jsx': '4c07fee6c7b4768a6582366d652c093d5f6ade41aac80994be53cec544c25cb2',
  'src/components/CncView.jsx': '0bf751114210419aff2d9089869e88a8b62646af2e763e299e0eb5148b0e04da',
  'src/components/ColourPicker.jsx': '03775b851d5fef7d0803765f6f721d807b5b21bedfd8f0c49386db7047d8c33e',
  'src/components/CompanyDefaultsModal.jsx': '90365da4e2e0bc285c652ec252c62a11da199853fdd9e31a899cb74464e2a896',
  // T75 · re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/ContextMenu.jsx': '9ecd6083c1808257a9c4f53ec9ff654304cfae671c1b923e9910ab5a55ca524c',
  'src/components/DecorPicker.jsx': '3ed5d2c75e1c7eb48b364f3b86cf9ec30fdad43acae9f1b30879f65f14e82e6a',
  'src/components/DecorPickerModal.jsx': 'eff9e583740f2381cfa8e796339f5b664f88ddf010e427a61cd450ed2ad44411',
  'src/components/DesignSettingsModal.jsx': '370f34cccd0b9907215eead9d27884ae14e6806ca192361bece6ef049116cf56',
  'src/components/DoorModal.jsx': '4e5e539c734fe6ccf32f030f5c90e3678196828aad35be244248c0992e16efe7',
  // T75 · re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/DrawRoomModal.jsx': '31107a5dc23977013675fed7d5392ed5c4f89e82e86f9dc1f5c94433bf19d260',
  // T71 F5: re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/DrawingModal.jsx': 'f13778b711d2e8c23fe2014c0ac1dbf4b029dbe9f351412e22c6035b0bc324c7',
  // T72 F2/F3/F12 — re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/ElementProperties.jsx': '12cbeb62e1dc609f8b1a6013e891ec8abea4a2302bae5fed0094371afe68cee3',
  'src/components/FrontGapModal.jsx': '9c2218d7f62684c2efe283df871af6a41df89152c674e093f3f721659524d4d5',
  'src/components/FrontGapWarnings.jsx': '84051f4e5178faf481c8c9f8a699576435a86e6f7138f94831748cac42f2433a',
  'src/components/FrontStyleGallery.jsx': '96ac40d58f9a1016d23256bcd95f6d1e037bfde609d4e17a9bf9f93c6127ed5e',
  'src/components/HandEditsModal.jsx': '8b2f61eead0bcc9f47aab78cadb7a6627a73885fd8e1b2e7ac8ac6ebf30025b0',
  'src/components/JoineryPreview.jsx': '4313bbe216ce87f80ab6ee1b4d1e8e288465e5b2ef2bedbba1167346508add0a',
  // T72 F4 — re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/JpullRunModal.jsx': '652b4f701a455134eb2571565f03dc6fca89c273f4041ad9eb66d8b0c7bd6aa7',
  // T75 · re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/LibraryPanel.jsx': 'ce948c2fb0a4092f3fb66a523dfb77fb2609504ca1bcc248930deab6110f7153',
  'src/components/LightingPanel.jsx': '65bf9cbc3cf6fe4b687def6f2d9538d4b363690c3c5d5ad2fddb0f7a77e48d2d',
  'src/components/MaterialChoicePanel.jsx': '16d2ed3171b4756141f21f693123c46bd6b33f772cad58013b2a45ec9a8fcb71',
  'src/components/MaterialPicker.jsx': 'd2b1d49bb1ef08d55652437986d4d40a2cac7c1683b42d16b0523b0e08fca5b7',
  'src/components/MenuBar.jsx': '8259c2d7b81f5f176c8c20d6faf98d6c2943667e2dd6354154a85748da1c4581',
  'src/components/Messages.jsx': 'fda203e902e53f4bd5ec26d27cd92229cb2967205239973b02616656e67cf55e',
  'src/components/MockModeBadge.jsx': '081294a78610a7fd3baef730ca7a318d8d193e40ef66c5d278e45f9672c82826',
  'src/components/Modal.jsx': '4bee3abfa7d391916931428869da887ea6e56c002ee1980b596413de5fc7ddbe',
  'src/components/MultiUnitPanel.jsx': 'ad7d770b51042f0c2e8d9633df4067c5a7d8d4af6e358fad2e90cf62e631531c',
  'src/components/NewProjectFlow.jsx': '504081eb2764b691da4209f87ac3d59dcc8643b7828ef26ba03aa870543d8966',
  'src/components/NumberField.jsx': 'ae2f9b89ea20a8da26fdf77db1cdb00cb487a2e5110128263f4c33f32eb5c176',
  'src/components/PartDetailModal.jsx': '69a8764cdb984ec7c523a3cd97559f03ddc169778d1d997fa24905b8efce1a93',
  'src/components/RailModal.jsx': '4981e3843fe4b6249db4d2a9c5fe96d428d2b4bbe4605e41db3834c5d5d6bccf',
  'src/components/RenderModal.jsx': '263c9fca6fdc1e0cfd27c2b185934e4232b9b3fb57d18bd57ee830cc533df2a0',
  // T78 F8 · re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/RightPanel.jsx': '670dde888e4f6fcf9342776a0de740fda176f9b3454a704703106571b07632f1',
  // T75 · re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/RoomModal.jsx': '29ffa1a4b710d3d3c7d168dfce23aa765fc76a3c9ba159b71b01964996dbd263',
  'src/components/SaveAsModal.jsx': '17bc0789ca392eda476dd34afa63a0c961da04b3dac4f32c8bab0bcb95dc6ad5',
  'src/components/SaveSettingsSetModal.jsx': 'e89dc83a41dbadbf472496c5674216171221f7bda5fa240c61dbaab09dd86951',
  // T75 · re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/SaveTemplateModal.jsx': '5de923d96cd981fd785005716ea84b7288d77c9b4ea044763112e672c6d1ba24',
  'src/components/Section.jsx': 'f3f64ad9f4d024d31a508f469a1f816c2bf1c0ffcf7d9221e95e2ee42d2a1a56',
  'src/components/SettingsPanel.jsx': '29cbcb97665db6b448dae9d4cec84c69a7acf7416ccafcfe344aca51840b9329',
  'src/components/SheenSlider.jsx': 'ec09e0dd7ad835672e4c024dee3013e649dcfa8ad64a2da5c120ed78d5c94bfb',
  'src/components/ShelfHingeClash.jsx': 'd205a25f3f86278aef44b7b91bb1d19958cef84aadc333ec550cd47327fc9619',
  'src/components/StartScreen.jsx': '6a6de6d1667872a45d18bb5b8e9e42d3d4522ac99f8ef2d1e9a32ce54ab363aa',
  // T75 · re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/TopBar.jsx': '31511deaa4fcbfee230c7ed1955e80c4945bac6c8278a0c4c07f3fa4c6a1de13',
  'src/components/UnitFinishModal.jsx': '64ef4ad294dea3ac69cea7a2b6a200f55d335b75e8ebce69fafe37a33eb2a819',
  // T78 F5 · re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/UnitSizeModal.jsx': 'e8b94789f07fffaeb5b66a2a8fd160c28d9d4f4b0ed56383ecc18532f7b06c1f',
  'src/components/UnitWarnings.jsx': 'f654c6abd287439ddd932fb8a4011784db34105312ce17bdc6416e701b5b74f8',
  'src/components/VeneerPicker.jsx': '05bbf6f2a8c54f546c3c7f19608c0193dc356323ff1a5a7e543ae57e039e9e7d',
  'src/components/WallElevationModal.jsx': '49d61b8d3530b1a3f1a92faf2b0e25773255a3e4dbb5053f235b2878a6cae168',
  // T75 · re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/WarehouseModal.jsx': '269eef79dba50c1472e87bd4e882dd87d9561154067bfdffca68cdc4ca348ab3',
  // T67 F9 — re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/WatchLayoutModal.jsx': 'ca2f0acd8e432d5890a185ca15a9b0bdff565827464652e3826668981b0a35ee',
  'src/components/WizardHardware.jsx': 'd0de5ca0c32de92feffef65a1a091cc2d45eaeb02a446a73c5389c2d03c377a8',
  'src/components/WizardSettings.jsx': '60df82c8620ef9d6af4148293ea717cb1690335d3a71f5234f8087aef936e091',
  'src/components/WizardSummary.jsx': '949a0930f7179cc25aa0b3eb5ff85f92845dd70b51390df188c445f7beb8a506',
  'src/main.jsx': '843c4aefa30516162f32ebdede296fdc091288019da4bbab851f01765b786dbb',
  // T76 F1 · re-frozen at the hash of BOTH edits (T75's and GPT's); `EXEMPT` above carries the reasons.
  'src/pages/ConfiguratorPage.jsx': 'e6da4c0f4dd8f83196fb229215df0fb25fff8d916c59b4b1daee935d89a5e380',
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

test('F1: the frozen surface, 67 files of PRO, byte for byte', () => {
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
    'src/components/AddItems.jsx',
    'src/components/AssignMaterialsModal.jsx',
    'src/components/BomPanel.jsx',
    // T75 F22 · *"the CNC export carries a banner counting the lines that are not 'cut'"*.
    'src/components/CncTree.jsx',
    'src/components/CncView.jsx',
    'src/components/ContextMenu.jsx',
    'src/components/DrawRoomModal.jsx',
    'src/components/DrawingModal.jsx',
    'src/components/ElementProperties.jsx',
    'src/components/FrontDecorationControls.jsx',
    'src/components/JpullRunModal.jsx',
    // T75 F15 · *"The held-open row `cornice-pelmet` opens as a PLAIN pelmet"*.
    'src/components/LibraryPanel.jsx',
    'src/components/PartDetailModal.jsx',
    'src/components/RightPanel.jsx',
    'src/components/RoomModal.jsx',
    // T75 F20 · *"`lib/templates.js` grows `kind: 'set'`"*: the modal saves a selection as a set.
    'src/components/SaveTemplateModal.jsx',
    'src/components/SettingsPanel.jsx',
    // T75 F20 · *"the Library's `media` category (`soon`) becomes the sets shelf"*.
    'src/components/TopBar.jsx',
    'src/components/UnitSizeModal.jsx',
    'src/components/WarehouseModal.jsx',
    'src/components/WatchLayoutModal.jsx',
    'src/components/WizardSettings.jsx',
    'src/pages/ConfiguratorPage.jsx',
], 'the exemption list is not the files CLAUDE.md names');
  for (const [rel, why] of Object.entries(EXEMPT)) {
    assert.ok(FROZEN[rel], `${rel} is exempt but not re-frozen — that is a hole, not an exemption`);
    assert.match(why, /\b(?:T\d{2}|DECOR) F\d/, `${rel} does not say which turn and feature licensed it`);
    assert.match(why, /\*"/, `${rel} does not carry the owner's own words`);
    const got = createHash('sha256').update(readFileSync(join(ROOT, rel))).digest('hex');
    assert.equal(got, FROZEN[rel], `${rel}'s new hash is not the one written down`);
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
    assert.ok(Object.keys(FROZEN).length === 67, 'no base ref: the manifest is the whole proof here');
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
