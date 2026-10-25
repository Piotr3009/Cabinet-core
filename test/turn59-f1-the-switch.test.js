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
    + ' T77 F3 · the two levels of the Ornate reference files: one select, shown only to a job that carries an Ornate leaf, read by every download. *"The CNC export offers two levels in the existing export options (no new numeric field): `Reference (default)` at `sampleMm` and `Full resolution` at `fullSampleMm`; the manifest records which one was written."*'
    + ' Chat fix 17.10.2026 \u00b7 the three downloads hand each cabinet its slice of the project\'s part number plan (lib/partLabels.js): the label text on LABEL_<cabinet> in the cabinet\'s colour, numbered. *"naklejki 44 na A4 ... kolorami ... przynajmniej kolory napisow pod kolory szafki ... ponumerujemy wszystkie elementy ... ok koduj"*',
  'src/components/SaveTemplateModal.jsx':
    'T75 F20 · right-clicked inside a selection of two or more, the modal saves a SET (templateStore.saveSet): the units left to right with the gaps between them. *"`lib/templates.js` grows `kind: \'set\'`: an ORDERED list of units (type + params, positions stripped as today) with the gaps between them."*',
  'src/components/TopBar.jsx':
    'T75 F20 · the Library menu\'s Sets row says what is on the shelf instead of "0 types". *"the Library\'s `media` category (`soon`) becomes the sets shelf (saved sets and shipped sets on one list)."*'
    + ' T78 F21 · the Output menu\'s Spraying placeholder becomes a live entry (onOpenSpraying): one page on the Production Core pattern, the spray schedule by colour, the cards and the paint order. *"cale sprayowanie jako osobne menu Cabinet Core."*'
    + ' Chat fix 17.10.2026 \u00b7 Output > Part labels (PDF): the sticker sheets (onExportLabels). *"naklejki 44 na A4 bo takie mam, kolorami ... napis co to, i strzalka co oklejamy ... ok koduj"*',
  // ─── ADDED 15.10.2026 (the evening) · THE RECESS SEEN FROM THE FRONT ──────
  // The owner: *"na setup room jak widze sciane od frontu nie top tylko front
  // to nie widze kresek, gdzie jest komin i gdzie wneka"* and *"reces pionowy
  // ... na wysokosci 1000 mm ... dowolny"*. Licensed with his words, re-frozen
  // at the new hash below; the engine's half is KIT_RECESS.lsp.
  'src/components/WallElevationModal.jsx':
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
    + ' T76 F7 · the walk measured the State column past the 560 px panel (AM strips and their gluing NOTE): the material cell truncates at 160 and the state may wrap. *"Test the way the client clicks."*'
    + ' T78 F21 · the BOM\'s materials are the warehouse\'s rows with the Paints department beside them (withPaints), so the paint lines of the spray schedule reach the Purchase list with the material\'s price, or a missing price said. *"cale sprayowanie jako osobne menu Cabinet Core"*; waste *"10 percent."*',
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
    + ' T82 F9 / F13 / F14 · the Vanity section of a vanity unit: Drawers 2 / 3 / 4 (the kit, swapped by the store\'s setVanityDrawers, the unit kept), Sinks 0 / 1 / 2 (CLAUDE.md F14\'s word), Floor / Floating with the height from the floor (setVanityFloating, refused in words where the room has no room), the plinth row as today (a floating vanity says it takes none); on every kit whose type takes drawer columns (the vanity and the chest of drawers) the drawer stack\'s Columns 1 / 2 row (updateUnitParams columns) and the "Equal" button (setDrawersEqual: drawer_split equal, drawer_heights null). *"vanity unit potrzebuje z szufladami nawierzchniowymi, wybor jak zawsze 2 3 i 4 ale pamietaj ze w vanity default to sa rowne, do tego prosze external drawers ale wybor 2 rows, patrz szafa ... plinth do zmiany wysokosc, propozycja floating lub on the floor, dodanie 1 sink or 2 sink?"*; *"7 - tak"* (25.10.2026).',
  // ─── ADDED BY TURN 76 · GPT'S DECORATIVE FRONTS, LANDED AS A PATCH ─────────
  // CLAUDE.md T76, FROZEN 3: *"every PRO file edited is licensed in `EXEMPT`
  // with the owner's words from this file (or GPT's licence line, which quotes
  // the owner's own authorisation of 9.10.2026) and re-frozen at its new hash
  // in the same commit."*  GPT's lines below are its own, as its patch wrote
  // them; the three files T75 also licensed (BomPanel, CncTree, RightPanel)
  // carry ONE entry above, T75's text and GPT's line.
  'src/components/AssignMaterialsModal.jsx': 'DECOR F4: applied strip stock badges use the same thickness validation as purchasing. *"nie mam zreob default jak uwazasz najwyzej pozneij poprawimy jedz z koksem i koduj prosze"*'
    + ' T78 F21 · the sprayed set is assigned its PAINT here, in the same modal every other material is assigned in (withPaints: the Paints department rows beside the boards), not on the Spraying page. *"cale sprayowanie jako osobne menu Cabinet Core."*',
  'src/components/CncView.jsx': 'ORNATE, Piotr 10.10.2026: gotowy kod wlacznei z leyersami prosze do cnc. Shows canonical reference layers and relief depth readouts without changing production export approval. ' + 'DECOR F3: explicit front/back machining preview from shared export geometry. *"nie mam zreob default jak uwazasz najwyzej pozneij poprawimy jedz z koksem i koduj prosze"*'
    + ' T79 F1 (the sheet) . CHAT FIX 19.10.2026 (re-frozen): the caption and the note stand where engine/cnc/labelAnchor.js puts them (the outline\'s own middle, the note\'s block middle), moved onto the board when the rectangle\'s middle is a window or a cut-out; a rectangle\'s sheet is byte for byte what it was. *"czasami cnc rysuje items jak 3 mm drills czy cos takiego czy litery poza elementami"*.'
    + ' T76 F4 · the readout names a V groove for what it is: V, its width at the mouth, its centre line. *"The V groove is a V ... The DXF layer name and the `front-operations.json` entry say which."*'
    + ' T77 F7 · a ready Ornate leaf on the front face says "Proposed relief reference" in the colour of its reference contours, apart from the red blocked label (since F4 a relief that built is not a fault). *"The relief is a PROPOSAL and stays one ... The slab is cut; the relief ships as CAD/CAM reference files with the state `geometry`, never as approved machining, until the owner says otherwise."*'
    + ' Chat fix 17.10.2026 \u00b7 every part\'s caption carries its project number and wears its cabinet\'s colour, from the same plan the downloads use. *"ponumerujemy wszystkie elementy ... kolory napisow pod kolory szafki ... ok koduj"*'
    + ' 14:10 \u00b7 the EDGE arrow and the line along the banded edge on every numbered board, the one geometry the DXF writes (edgeArrowGeometry). *"na projekcie nie ma strzalek ktora strone oklejamy, jak mam przykleic naklejki? ... 1 - tak ... prosze - koduj"*'
    + ' 16:10 \u00b7 a mark is drawn as the open walk it is (markPoints): the corner mark one L through the corner. *"jeden L wektor ... obok linii"*'
    + ' T79 F1 . the layer legend stands on the Changes bar (bottom-11, was bottom-3) so the bar of the one bottom-left message column never covers it. *"wszystkie informacje po zmianach które pokazujesz na ekranie proszę zrób po lewej ... powód: teraz wszystkie informacje pokazują się na środku i zasłaniają nam widok pracy."*'
    + ' T82 F15 · the front readout names a reed valley (title and vector). The owner, 25.10.2026: *"fluted teraz to sa rowki a ja potrzebuje chmurke"*',
  'src/components/FrontDecorationControls.jsx': 'ORNATE, Piotr 10.10.2026: rozpisz zakoduj dokaldnei prosze i ja roto dam do clauda, ale daj gotowy kod wlacznei z leyersami prosze do cnc. Adds proposed relief note and mirror choice; no new numeric fields. ' + 'DECOR F1: editable, versioned decorative machining defaults shared with Retail. *"nie mam zreob default jak uwazasz najwyzej pozneij poprawimy jedz z koksem i koduj prosze"*'
    + ' T76 F4 · the Arch rise field goes with the ellipse it set; the defaults the controls show are the profile\'s. *"SEMICIRCULAR arch (rise = half the inner width; ... never squashed to an ellipse)"*'
    + ' T76 F6 · one prop, `fields` (PRO passes nothing and keeps every field); retail passes false and shows no number of a recipe. *"a client picks a style and gets the owner\'s recipe with NO numeric fields (lazy client law; the recipe controls are PRO\'s)"*'
    + ' T76 integration · the AH sentence gets the space GPT\'s line lacked (F2 probe). *"AH (Arched handleless) | A\'s recipe; the J-pull is chosen separately under Opening"*'
    + ' T82 F15 · a Fluted front shows Flute profile (Reeds / Grooves) and, for reeds, Reed diameter (the profile\'s ladder beside a free number), the side margin and the direction; Activate gives the new choice (FL born reeds). The owner, 25.10.2026: *"fluted teraz to sa rowki a ja potrzebuje chmurke"*, *"daj wariant b czyli na styk narazie"*, *"do tego daj ustawienie srednicy walkow tez"*',
  'src/components/PartDetailModal.jsx': 'DECOR F4: decorative layer colours follow the canonical part legend. *"nie mam zreob default jak uwazasz najwyzej pozneij poprawimy jedz z koksem i koduj prosze"*'
    + ' Chat fix 17.10.2026, 16:10 \u00b7 a mark is drawn and boxed as the open walk it is (its pts): the corner mark one L through the corner. *"jeden L wektor ... obok linii"*',
  'src/components/SettingsPanel.jsx': 'DECOR F1: project and saved-style decorative recipes. *"nie mam zreob default jak uwazasz najwyzej pozneij poprawimy jedz z koksem i koduj prosze"*'
    + ' T80 F2 · the FRONTS row (InframeRow): Lay-on or In-frame (British), one write setDesign({ inframe }), the hint and its tooltip the engine\'s (inframeHint / inframeTooltip off profile.inframe), no number typed. *"3 per projekt."* (21.10.2026, 22:40)',
  'src/components/WizardSettings.jsx': 'DECOR F1: material-slot and saved-style decorative recipes. *"nie mam zreob default jak uwazasz najwyzej pozneij poprawimy jedz z koksem i koduj prosze"*'
    + ' T80 F2 · the FRONTS row under the Sheen, SettingsPanel\'s own InframeRow imported (one row, two surfaces). *"3 per projekt."* (21.10.2026, 22:40)',

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
    + 'choose, tylko te 2 opcje."*'
    + ' T79 F12 · Center between beside Center all, the same width: one click arms the shared uiStore\'s two-pick mode, the panel says which pick is next, Escape cancels. *"naciskasz wycentruj pomiędzy, wybierasz dolny i górny element i wtedy wszystkie półki pomiędzy tymi elementami się centrują."*'
    + ' T79 F13 . SET BACK\'s standard chip is the project\'s setback, carcass.shelfSetbackMm for a shelf and carcass.dividerSetbackMm for a divider (10), no longer the LISP\'s 20; Flush and the field unchanged. *"wszystkie cofnięcia zmień z 20 na 10 mm, 20 to stanowczo za dużo"*; 14:17: *"tylko półki i dividery, szuflady zostaw nie ruszaj."*'
    + ' T79 F16 · the shelf\'s Type field gains a `Restore sleeve rows` button (data-restore-sleeve-rows), shown only when the shelf carries `sleeves_dropped`, calling the store\'s `restoreSleeveRows`. *"przycisk Restore sleeve rows"*, accepted by the owner 14:55: *"ok daj"*',
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
    + ' T81 F2 · the window says the set in the owner\'s order (the 3D, every wall\'s fronts, without fronts, X-ray, the plans, the sections, the visualisation, the cut list); its sheet buttons walk the list the engine returns. *"najpierw chce widziec 3d jak zrobiles pierwsza strona, pozniej chce widziec wszystkie fronty ... nastepnie widok wszystkich scian bez frontow ... pozniej przekroj z gory, i pozniej przekroje pionowe, a na koncu wizualizacja"* (22.10.2026, 21:23)',
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
    + ' T80 F10 · the in-frame checks #40 to #44 stand in the left column beside the front-gap rows (components/InframeWarnings.jsx, the same findings the Check panel reads, the same fly-to). *"Each in the left messages and in the Check panel."* (CLAUDE.md T80 F10); the owner: *"3 mm zawsze."* (21.10.2026, 22:03)',
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
    + ' CHAT FIX 19.10.2026 (re-frozen): Add hanger rail asks the store why not (a third rod, or no room under the first) and says it in words; a second rod in the same bay is born 950 under the first as a proposal (KIT_HANGER_TWO.lsp). *"nie ma mozliwosci dodania drugiego ponizej, dodaj to prosze, i proponuj (jak polki) 950 jedne od drugiego"*; *"tak ale tylko jako propozycja"*.',

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
    'T78 F21 · Output > Spraying, one page on the Production Core pattern (mockup v2 of 11.10): the SPRAYING INFORMATION card, PART A ELEMENTS by colour, PART B CARDS open, PART C PAINT, Export PDF; every number the engine\'s (engine/spray.js off profile.spray), a typed note per line printed. *"cale sprayowanie jako osobne menu Cabinet Core"*; *"edges in m2 for the paint and in lm beside it; waste 10 percent."*',
  // CLAUDE.md T79 F1, FROZEN 3: *"every PRO file edited is licensed in `EXEMPT`
  // with the owner's words from this file and re-frozen at its final hash in
  // the same commit."*
  'src/components/Messages.jsx':
    'T79 F1 . all three levels stand in ONE bottom-left column (the centre and the bottom-centre blocks deleted), the newest nearest the Changes bar under them; the bar opens the list of the last profile.ui.messages.historyMax messages (newest first, HH:MM, the level\'s dot, the text, Clear), collapsed by default, Escape collapses it, never saved; a folded yellow or grey says its count once (its text), a red beside it. *"wszystkie informacje po zmianach które pokazujesz na ekranie proszę zrób po lewej, niech one tam znikają, można na dole po lewej zrobić jakby listę rozwijaną i tam historia zmian; powód: teraz wszystkie informacje pokazują się na środku i zasłaniają nam widok pracy."*'
    + ' CHAT FIX 19.10.2026 (re-frozen): the grey card is translucent (bg-shell-800/70); the timing is the store\'s and engine/messages.js hideMs (every level leaves on its clock: 4 s, reds 8 s; the Changes row stays). *"ma sie chowac po kilku sekundach i byc przezroczysty"*; asked "wszystkie chowaja sie po 4 s, czerwone po 8 s, historia zostaje, tlo przezroczyste 70 procent?": *"tak pls"*.'
    + ' CHAT FIX 19.10.2026, the afternoon (re-frozen again): the open Changes list closes itself after engine/messages.js historyOpenMs (profile.ui.messages.historyOpenMs, 10 s, PROPOSED); the bar and the rows stay. *"changes chat can we keep close, nawet jesli uzytkownik otworzy czy mozemy za jakis czas zamknac? bo za bardzo przeszkadza"*.',
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
    'T82 F6 · Open all takes the HAWA pocket door with every other door. *"A toggle on the pocket (right panel: Door closed / open; the same in the viewer\'s "Open all" of T69) slides the door into the pocket"*',
  // T82 F12: the Check panel draws the note level (TONE.note), the service void behind a vanity.
  'src/components/CheckPanel.jsx':
    'T82 F12 · the Check\'s note level drawn grey (TONE.note): #45, the service void behind a vanity, is a note, never a fault. *"nastepnie to bedzie miejsce z tylu na rurki minimum potrzebujemy okolo 80 mm do 100 mm"*',
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
  // T82 F15 re-frozen at the new hash; EXEMPT above carries the reason.
  'src/components/FrontDecorationControls.jsx': 'b32660180217d45760e074f4fcd8932f90b9a57f11cb02121c59670225de2546',
  'index.html': '9474860393b6e8dd6070d8178b35fbd2fbd309b26cb07b0e6140dcbf914e4912',
  'src/App.jsx': 'f6c33592a05affc52d8167cd776f5164ee2aeaccfea1dfce5dc3756e93f9b968',
  // T78 F11 · re-frozen at the new hash; `EXEMPT` above carries the reason.
  // T79 F2, F3 re-frozen at the new hash; EXEMPT above carries the reason.
  // T79 F11 re-frozen at the new hash; EXEMPT above carries the reason.
  // CHAT FIX 19.10.2026 re-frozen at the new hash; EXEMPT above carries the reason.
  'src/components/AddItems.jsx': '49184c38bab4b6e75920c86c18b48edf09c8bea816ec9acbdfe0e43a2d6acf44',
  'src/components/AddItemsModal.jsx': '952b9e52104d92a148ba00da6ba42166e44824e76aeda7ba0553b22f2633105e',
  // T78 F21 re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/AssignMaterialsModal.jsx': '1f9d71d9af9b57ba7e8f77b38c99fda7368a657a3289b69be87ac166337cc82e',
  'src/components/AuthModal.jsx': 'b51d7a14910e89553528fe2e36f787502e4b4a77b6c408ebb24323510c164ddc',
  // T78 F21 re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/BomPanel.jsx': 'ee8cf839b68c547c36a3f76de1edb89a5d44becddc4e04744c9f3242ca0af074',
  // T79 F12 re-frozen at the new hash; EXEMPT above carries the reason.
  // CHAT FIX 19.10.2026 re-frozen at the new hash; EXEMPT above carries the reason.
  'src/components/CabinetEditorModal.jsx': '3f080e23b09ce5c5018f89649264e77cb85e5f5594dafecd839673d6db9fd066',
  // T82 F6 re-frozen at the new hash; EXEMPT above carries the reason.
  'src/components/CanvasToolbar.jsx': 'd7686d45b88c7a4121b2838e3bdbc5e128b38afd1608f2000ace8733677d4cbc',
  // T82 F12 re-frozen at the new hash; EXEMPT above carries the reason.
  'src/components/CheckPanel.jsx': '8f1dfc8c0670aebddd6d23ea11465168cc7d61ca95a6c5b9e173ec9992c8f168',
  'src/components/ChosenDecorTile.jsx': '38d960b752ed6d5e99519573a3c6b9d31d687820f38b4e39ee11b971b2c3b683',
  // T76 F1 · re-frozen at the hash of BOTH edits (T75's and GPT's); `EXEMPT` above carries the reasons.
  'src/components/CncTree.jsx': '68aa1ffd5f8c07525c34b7b242c3adc387bc70157a38ae5bd07d0f257691d8e0',
  // T79 F1 re-frozen at the new hash; EXEMPT above carries the reason.
  // CHAT FIX 19.10.2026 (the afternoon) re-frozen at the new hash; EXEMPT above carries the reason.
  // T82 F15 re-frozen at the new hash; EXEMPT above carries the reason.
  'src/components/CncView.jsx': '044eba8a094749d2bf9c0da1b622a3e7e7129516886940b6acd09381fa97d635',
  'src/components/ColourPicker.jsx': '03775b851d5fef7d0803765f6f721d807b5b21bedfd8f0c49386db7047d8c33e',
  // T78 F19 re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/CompanyDefaultsModal.jsx': 'e365305d290ab32057544e05f83b068f1ef9414642fe00f429cfbedb84dbc917',
  // T75 · re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/ContextMenu.jsx': '9ecd6083c1808257a9c4f53ec9ff654304cfae671c1b923e9910ab5a55ca524c',
  'src/components/DecorPicker.jsx': '3ed5d2c75e1c7eb48b364f3b86cf9ec30fdad43acae9f1b30879f65f14e82e6a',
  'src/components/DecorPickerModal.jsx': 'eff9e583740f2381cfa8e796339f5b664f88ddf010e427a61cd450ed2ad44411',
  'src/components/DesignSettingsModal.jsx': '370f34cccd0b9907215eead9d27884ae14e6806ca192361bece6ef049116cf56',
  'src/components/DoorModal.jsx': '4e5e539c734fe6ccf32f030f5c90e3678196828aad35be244248c0992e16efe7',
  // T75 · re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/DrawRoomModal.jsx': '31107a5dc23977013675fed7d5392ed5c4f89e82e86f9dc1f5c94433bf19d260',
  // T71 F5: re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/DrawingModal.jsx': '4542171e083dcf05c375a763c6454bb6f4a7114d0ef99b627c560c240374344b',
  // T72 F2/F3/F12 — re-frozen at the new hash; `EXEMPT` above carries the reason.
  // T79 F12 re-frozen at the new hash; EXEMPT above carries the reason.
  // T79 F13 re-frozen at the new hash; EXEMPT above carries the reason.
  // T79 F16 re-frozen at the new hash; EXEMPT above carries the reason.
  'src/components/ElementProperties.jsx': '8e4639fd5eacf027cd8fe76dcc577720d5853a8970c21e9d3106aaa909a0d9f5',
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
  'src/components/LibraryPanel.jsx': 'ce948c2fb0a4092f3fb66a523dfb77fb2609504ca1bcc248930deab6110f7153',
  'src/components/LightingPanel.jsx': '65bf9cbc3cf6fe4b687def6f2d9538d4b363690c3c5d5ad2fddb0f7a77e48d2d',
  'src/components/MaterialChoicePanel.jsx': '16d2ed3171b4756141f21f693123c46bd6b33f772cad58013b2a45ec9a8fcb71',
  'src/components/MaterialPicker.jsx': 'd2b1d49bb1ef08d55652437986d4d40a2cac7c1683b42d16b0523b0e08fca5b7',
  'src/components/MenuBar.jsx': '8259c2d7b81f5f176c8c20d6faf98d6c2943667e2dd6354154a85748da1c4581',
  // T79 F1 re-frozen at the new hash; EXEMPT above carries the reason.
  // CHAT FIX 19.10.2026 re-frozen at the new hash, twice (the morning, the afternoon); EXEMPT above carries the reasons.
  'src/components/Messages.jsx': '319794dc58eec269c60e180e3565b463a7f9668de1af04156d549596a58476c0',
  'src/components/MockModeBadge.jsx': '081294a78610a7fd3baef730ca7a318d8d193e40ef66c5d278e45f9672c82826',
  'src/components/Modal.jsx': '4bee3abfa7d391916931428869da887ea6e56c002ee1980b596413de5fc7ddbe',
  'src/components/MultiUnitPanel.jsx': 'ad7d770b51042f0c2e8d9633df4067c5a7d8d4af6e358fad2e90cf62e631531c',
  'src/components/NewProjectFlow.jsx': '504081eb2764b691da4209f87ac3d59dcc8643b7828ef26ba03aa870543d8966',
  'src/components/NumberField.jsx': 'ae2f9b89ea20a8da26fdf77db1cdb00cb487a2e5110128263f4c33f32eb5c176',
  'src/components/PartDetailModal.jsx': 'aaa5a376c870dd56a1d80ab4373bd4cc035a1d78570f943b0a3a4b32ffeb1eff',
  // CHAT FIX 19.10.2026 re-frozen at the new hash; EXEMPT above carries the reason.
  'src/components/RailModal.jsx': '99b29df3301ec735ce4da66cd80f1665f9306c95ae0d4cc0bb92c213106ca91f',
  'src/components/RenderModal.jsx': '263c9fca6fdc1e0cfd27c2b185934e4232b9b3fb57d18bd57ee830cc533df2a0',
  // T78 PART E, after the walk re-frozen at the new hash; `EXEMPT` above carries the reason.
  // T79 F4 re-frozen at the new hash; EXEMPT above carries the reason.
  // T79 F5 re-frozen at the new hash; EXEMPT above carries the reason.
  // T79 F13 re-frozen at the new hash; EXEMPT above carries the reason.
  // CHAT-FIX 25.10 re-frozen at the new hash (the free panel's Attach section); EXEMPT above carries the reason.
  // T82 F2 re-frozen at the new hash; EXEMPT above carries the reason.
  // T82 F6 re-frozen at the new hash; EXEMPT above carries the reason.
  // T82 F10 re-frozen at the new hash; EXEMPT above carries the reason.
  // T82 F14 re-frozen at the new hash; EXEMPT above carries the reason.
  'src/components/RightPanel.jsx': '87f300da3fd49ae263f15b57a46731b7720fa045fe22a4dca42ca06ec43a957d',
  // T75 · re-frozen at the new hash; `EXEMPT` above carries the reason.
  // CHAT FIX 17.10.2026 re-frozen at the new hash (the window 1290 wide); `EXEMPT` above carries the owner's words.
  'src/components/RoomModal.jsx': '04bc0d7b944cac119f44aa1c562ef0a635f6e86ecee9b6ea26784e075b69d2a1',
  'src/components/SaveAsModal.jsx': '17bc0789ca392eda476dd34afa63a0c961da04b3dac4f32c8bab0bcb95dc6ad5',
  'src/components/SaveSettingsSetModal.jsx': 'e89dc83a41dbadbf472496c5674216171221f7bda5fa240c61dbaab09dd86951',
  // T75 · re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/SaveTemplateModal.jsx': '5de923d96cd981fd785005716ea84b7288d77c9b4ea044763112e672c6d1ba24',
  'src/components/Section.jsx': 'f3f64ad9f4d024d31a508f469a1f816c2bf1c0ffcf7d9221e95e2ee42d2a1a56',
  // T80 F2 re-frozen at the new hash; EXEMPT above carries the reason.
  'src/components/SettingsPanel.jsx': 'd0087f5ed3b6dc9d431ce14bf8d1bf93a5eb18eb92b9fa3a4252848c689f3b0d',
  // T78 F21 · a NEW PRO component, frozen the night it is born: Output > Spraying, the spray schedule's one page. `EXEMPT` carries the owner's words.
  'src/components/SprayingPanel.jsx': '7d8f7adb67d26f0402c123e78d4c785981a2a15113968c43ed3132e5ada9bb9f',
  'src/components/SheenSlider.jsx': 'ec09e0dd7ad835672e4c024dee3013e649dcfa8ad64a2da5c120ed78d5c94bfb',
  'src/components/ShelfHingeClash.jsx': 'd205a25f3f86278aef44b7b91bb1d19958cef84aadc333ec550cd47327fc9619',
  'src/components/StartScreen.jsx': '6a6de6d1667872a45d18bb5b8e9e42d3d4522ac99f8ef2d1e9a32ce54ab363aa',
  // T78 F21 re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/TopBar.jsx': '9560495aac02f9f03a4138ea6f74b46116f7e2e94362935301458f1a9bc3fbc3',
  'src/components/UnitFinishModal.jsx': '64ef4ad294dea3ac69cea7a2b6a200f55d335b75e8ebce69fafe37a33eb2a819',
  // T78 F5 · re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/UnitSizeModal.jsx': 'e8b94789f07fffaeb5b66a2a8fd160c28d9d4f4b0ed56383ecc18532f7b06c1f',
  'src/components/UnitWarnings.jsx': 'f654c6abd287439ddd932fb8a4011784db34105312ce17bdc6416e701b5b74f8',
  'src/components/VeneerPicker.jsx': '05bbf6f2a8c54f546c3c7f19608c0193dc356323ff1a5a7e543ae57e039e9e7d',
  // 15.10.2026 (the evening) re-frozen at the new hash; `EXEMPT` above carries the owner's words.
  'src/components/WallElevationModal.jsx': '3d7ddd431bf11e925962317d943feb247c394fe709799a260ec96c88b4bdb6fc',
  // T78 F21 re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/WarehouseModal.jsx': 'ec5b747982b65fd246016f43484247f83d64cac86678f750b63147f84572e5ea',
  // T67 F9 — re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/WatchLayoutModal.jsx': 'ca2f0acd8e432d5890a185ca15a9b0bdff565827464652e3826668981b0a35ee',
  'src/components/WizardHardware.jsx': 'd0de5ca0c32de92feffef65a1a091cc2d45eaeb02a446a73c5389c2d03c377a8',
  // T80 F2 re-frozen at the new hash; EXEMPT above carries the reason.
  'src/components/WizardSettings.jsx': 'f900b32cc42b0822a9b002b9f62aa98206db02053f195391829b8ea24c18694d',
  'src/components/WizardSummary.jsx': '949a0930f7179cc25aa0b3eb5ff85f92845dd70b51390df188c445f7beb8a506',
  'src/main.jsx': '843c4aefa30516162f32ebdede296fdc091288019da4bbab851f01765b786dbb',
  // T78 F21 re-frozen at the new hash; `EXEMPT` above carries the reason.
  // T79 F1 re-frozen at the new hash; EXEMPT above carries the reason.
  // T79 F18 re-frozen at the new hash; EXEMPT above carries the reason.
  'src/pages/ConfiguratorPage.jsx': '654f82638286e4d6cd1fa4d1069d7057cc35e39b2ece198a4b07f3415da72f58',
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

test('F1: the frozen surface, 69 files of PRO, byte for byte (T78 F21: the Spraying page joined; T80 F10: the in-frame rows)', () => {
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
    'src/components/TopBar.jsx',
    'src/components/UnitSizeModal.jsx',
    // 15.10.2026 (the evening) · *"nie widze kresek, gdzie jest komin i gdzie wneka"*: the recess and the chimney seen from the front, the recess's band.
    'src/components/WallElevationModal.jsx',
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
    assert.ok(Object.keys(FROZEN).length === 69, 'no base ref: the manifest is the whole proof here');
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
