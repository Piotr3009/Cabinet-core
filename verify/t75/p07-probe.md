# T75 PROBE, PARTS F and G: stock CSV, readiness, dowels

What was probed: everything on main that PART F (F21 the CSV contract with
JoineryCore, F22 production readiness) and PART G (F23 the dowel system,
Cabineo's slot) would hook into. Method: the code was read at HEAD `f60d18f`
(every `file:line` below is HEAD, not the working tree; the integrator's live
edits to `checks.js`, `partRegistry.js` and `cabinet.js` shift some lines by a
few, and check number 27 is already taken by F1 in the working tree), and
every behavioural claim was MEASURED with node scratch scripts run against the
real engine (`scratchpad/p07/roundtrip.mjs`, `rt2.mjs`, `mock.mjs`,
`pbom.mjs`, `joints.mjs`, `meta.mjs`, `golden.mjs`). Baseline: the warehouse,
BOM engine and BOM tests are green (53/53). No existing file was edited.

## THE PROBE TABLE

| F | thing asked | file:line | function | behaviour on main today |
| - | - | - | - | - |
| F21 | the twelve columns | `src/engine/warehouse.js:72-75` | `CSV_COLUMNS` | `item_number, name, category, subcategory, size, thickness, color, unit, cost_per_unit, image_url, jc_uuid, notes`, PC's order; `id` and `price_source` deliberately NOT in the CSV (`:66-70`) |
| F21 | export | `src/engine/warehouse.js:193-199` | `toCsv` | header + one line per row, quotes cells holding `" , \n \r`, CRLF line ends, NO UTF-8 BOM (measured) |
| F21 | import | `src/engine/warehouse.js:229-248` | `fromCsv` | splits the WHOLE TEXT on `\r?\n` at `:230` BEFORE quotes are honoured (`splitCsvLine` `:202-220` works per line), so a quoted newline breaks the row; header decides columns; refuses a file with no `name` column; every row is stamped `price_source: 'import'` |
| F21 | normalise a row | `src/engine/warehouse.js:118-147` | `migrateMaterial` | `id` = given or a fresh `m_xxxxxxxx`; `item_number` = given or next free; `category` forced into the owner's nine or `others` (`categoryOf` `:89-92`); `unit` empty becomes `each`; `cost_per_unit`/`thickness` through `numOrNull` (`:82-86`) which strips every non `[0-9.-]` character |
| F21 | merge | `src/engine/warehouse.js:274-316` | `mergeImport` | matches on `jc_uuid` ONLY (exact, case-sensitive string); match overwrites but keeps the warehouse's `id` and `item_number`; no uuid = new row; reports hand-typed prices that moved in `repriced` |
| F21 | any catalogue stamp or version | `src/engine/naming.js:111-115`; `src/engine/warehouse.js:32,402` | `warehouseStamp` | the NAME already exists: it is the FILENAME minute stamp `YYYY-MM-DD HH-mm`, not a catalogue version. No catalogue fingerprint, no row `updated_at` in the app (the table has one, `supabase/migrations/t51_warehouse.sql:57`, but `warehouseDb.js:30` never selects it) |
| F21 | `price_source` | `src/engine/warehouse.js:78-79,145`; `src/stores/warehouseStore.js:102-106`; `src/lib/warehouseDb.js:41` | `PRICE_TYPED`/`PRICE_IMPORT` | lives ONLY on warehouse rows. Nothing on a project, an assignment or a BOM line carries it (grep) |
| F21 | who reads the warehouse | `src/components/WarehouseModal.jsx:196-204` | `useWarehouseStore` | the modal and nothing else (grep). No pricing, no BOM, no assignment reads `cc_warehouse` |
| F21 | where a project's prices come from | `src/stores/materialAssignmentStore.js:58-83,177,200-210` | `MOCK_MATERIALS`, `loadMaterials` | the STOCK LIST (`cc_materials` / the 20 mock rows), a different table and shape: `id, name, category (board/front/edging/hardware), thickness, unit, price, jc_uuid` (`sql/001_init.sql:49-59`); `code` exists on some mock rows only and is not a DB column |
| F21 | how a project stores its materials | `src/engine/partRegistry.js:670-679,690-737`; `src/stores/projectStore.js:1173-1182,9001-9008` | `cleanValue`, `normalizeAssignments`, `openAssignmentsFor`, `projectForSave` | `project.assignments` = `{ schema, base, overrides, customParts, auto }`, each value `{ material_id, yield, category, subcategory, auto? }`; `cleanValue` DROPS any other key, so a `price_source` written there today would vanish on the next normalise. No price and no stamp on the project |
| F21 | where a project lives | `src/stores/projectStore.js:1209-1220`; `src/lib/cloudSync.js:44-49` | `saveCache`, `saveProject` | the whole `project` object rides the local shelf; the cloud row carries `name, room, jc_tenant_id, jc_project_id` only, so any new project field (a stamp) is local-shelf only |
| F21 | purchase BOM line shape (MEASURED, BUD + 3 assignments) | `src/engine/bom.js:451-600,609-625` | `mergeUnitMaterials`, `purchaseBom` | row keys: `key, qty, name, unit, costPerUnit, source, material, group, _assigned, parts, sheets, lineCost`. No `jc_uuid`, no code field on the row; reachable only as `row.material.jc_uuid` (present only when the stock row has one: measured `6f1c2a7e-...` on a DB-shaped row, `null` on every mock row) and `row.material.code` (`W980 SM` on a mock board, `null` on hardware) |
| F21 | purchase CSV | `src/lib/exporters.js:134-164,166-180` | `buildPurchaseBomCsvText`, `exportPurchaseBomCsv` | header `GROUP,MATERIAL,ASSIGNED,QTY,UNIT,SHEETS,UNIT_COST,LINE_COST,PARTS` (`:141`): neither `jc_uuid` nor a code. Button `Purchase CSV` at `src/components/BomPanel.jsx:588-607` |
| F21 | Database > Materials menu | `src/lib/topMenu.js:60-71`; `src/components/TopBar.jsx:296`; `src/components/MenuBar.jsx:11-13` | `buildDatabaseMenu` | entry `Materials...` opens modal `warehouse`; MenuBar is a generic data renderer and holds no label |
| F21 | the three buttons and the notice | `src/components/WarehouseModal.jsx:294-303,474-476` | `onImport`, `exportProject`, `exportCatalogue` | labels today: `Import CSV...` (calls `fromCsv` then `importRows` -> `mergeImport`), `Export this project (N)` (`usedInProject` -> `toCsv`), `Export catalogue (N)` (`toCsv(rows)`); `JC_NOTICE` (`warehouse.js:330-331`) printed at `:475`. No test pins the labels (grep) |
| F21 | the project export's row filter | `src/components/WarehouseModal.jsx:255-258`; `src/engine/warehouse.js:352-362` | `usedInProject` | BUG, MEASURED: the modal passes `uuids: rows.map(r => r.jc_uuid)`, i.e. EVERY uuid in the warehouse, so every row with a `jc_uuid` counts as "used". A project naming none of 3 JC rows exported 3 of 3 |
| F21 | table identity | `supabase/migrations/t51_warehouse.sql:36,69-76` | `cc_warehouse` | `id uuid` primary key while `migrateMaterial` mints `m_xxxxxxxx` ids (not uuids: upsert would fail and the store silently drops to `local`); unique `(owner, jc_uuid)` and unique `(owner, item_number)`; `jc_uuid text` here but `uuid` in `cc_materials` (`sql/001_init.sql:57`) |
| F21 | the JC button in the BOM | `src/components/BomPanel.jsx:610-615` | inline | a greyed button that only notifies "Connect JoineryCore lands in a later phase" |
| F22 | a readiness concept | (none) | (none) | grep `readiness`, `'manual'` in `src/`: nothing. No state exists anywhere |
| F22 | `meta.corner` | `src/engine/cabinet.js:3408-3435` (L_SHAPE) and `:5745-5750` (run infill), `src/engine/mitre.js:275-281` | `L_SHAPE` builder, mitre | TWO MEANINGS on one key: a STRING on the T30 L boards (`wallA`, `armA`, `endA`... measured) and a NUMBER (the 45 deg leg) on a mitred side infill face, which IS a cut piece. F4 deletes the string kind. Readiness must not branch on `meta.corner` truthiness |
| F22 | `hardwareKit` | `src/engine/types.js:657,704`; `src/engine/cabinet.js:8858-8873` | `hw(kit.role...)` | BIN and CARGO: carcass drilled as parent, the mechanism is ONE hardware line ordered to the opening, zero holes. The line is `bought`; the panels are `cut` |
| F22 | lattice | `src/engine/cabinet.js:3456-3490` | WINE lattice | `meta.lattice` on every board, plain `rectGeometry`, zero holes: the `geometry` case the spec names |
| F22 | "yellow notes" | `src/engine/bomInvoice.js:89-91,370`; `BLOCKERS.md` | `line()`, `buildBomCsvText` | the app's yellow is `yellow: true` on IRONMONGERY lines with no registry article (`SPEC, no article in the registry`), i.e. a purchasing gap, not a cut state. `BLOCKERS.md` is Polish prose by number (#60 to #96, `:1135-2051`) with no machine-readable marker |
| F22 | holes absent = geometry? (MEASURED over all 24 types) | `scratchpad/p07/meta.mjs` | (survey) | boards with no hole, no pocket and a plain outline include legitimately CUT pieces whose holes are in the neighbour: drawer box backs (BUDR, BUDR2, BUDR4), `SINK BACK`, `FRIDGE FIXED`, `PANTRY PARTITION`/`FILLER-*`, `OVEN_BASE RAIL-*`, `DW_PANEL TOP`. So absence of holes is NOT a classifier: readiness needs explicit flags or the side map |
| F22 | bought drawer boxes | `src/lib/exporters.js:84-86`; `src/engine/bom.js:54-76` | `buildBom({ excludeDrawerBoxes })`, `readyBoxLines` | `design.drawerBoxes.mode === 'ready'` drops the box parts and adds purchase lines: a `bought` case that needs the DESIGN, so `readinessOf(part)` alone cannot see it |
| F22 | cut list on screen | `src/components/BomPanel.jsx:157-180,624-660`; `src/engine/bom.js:78-99` | Parts tab, `FragmentRows`, `buildBom` | columns Unit, Panel, Material, W, H, Qty, Edge, m2; the rows are built in `buildBom` from `p` but carry NO `meta` and no `cnc`, so a state must be computed inside `buildBom` (it is not in the golden dump) |
| F22 | cut list CSV | `src/lib/exporters.js:56-62`; `src/engine/profile.js:4329-4335` | `buildCuttingListCsv` | the LISP `SKYLON_labels.csv` format `UNIT,PANEL,SZER,WYS,EDGE,EDG_L,SQM`, pinned byte for byte by `test/bom.test.js:85-87` and 7 cells per row by `test/hardware.test.js:201` |
| F22 | BOM CSV | `src/engine/bomInvoice.js:356-374` | `buildBomCsvText` | `MATERIALS` block per decor (no per part line) and `IRONMONGERY` block `LINE,QTY,UNIT,ARTICLE,STATUS,SPEC`; no test pins either header |
| F22 | CNC export, where a banner could go | `src/lib/cncExport.js:85-129,141-166,185-219,176-179`; `src/components/CncTree.jsx:140-206,293` | `exportUnitDxfZip`, `exportSheetDxf`, `exportMaterialDxf` | each returns `{ filename, ..., held, gateMessage }`; the caller notifies. The owner's F2.2 law (`:176-179`, *"zadnych innych liter"*) forbids text in the DXF, so the banner belongs on the CncTree panel (above `data-material-export`) and in the notify, never in the file |
| F22 | Check: definition, numbering, wording | HEAD `src/engine/checks.js:72-197,335-354,442-1100` | `CHECKS`, `finding`, `runChecks` | `finding(n, level, { unitId, unitNum, panelId, message, subject })`; numbers 1 to 26 used; 22, 23, 24 are emitted (`:861,903,918,945`) but MISSING from `CHECKS`, so `CheckPanel.jsx:98` prints an empty label for them; dedupe key `check|unitId|panelId|message` (`:1086`); sorted reds first then number then unitNum; panel is a flat list, not grouped by unit. Working tree: 27 is F1's corner check, next free is 28 |
| F22 | Check inputs | `src/stores/projectStore.js:8049-8058`; `src/lib/checkFindings.js:64-68` | `runChecks` (store), `checkDependencies` | inputs: entries, units, room, design, stock materials, wallWidthOf, slopeShortfallOf. `checkDependencies` length 5 is pinned by `test/turn38-f1-eye-test-fixes.test.js:83` |
| F22 | T71 parts card | `src/engine/drawings/setPaper.js:112-119,171-224`; `src/engine/drawings/wallSheets.js:214-219` | `cutRows`, `buildCutList` (`put` at `:187-193`) | the "Cut list and materials" sheet: per unit block, row = `id, qty x, w x h, t`; reads `id, part, qty, w, h, thickness, edging, area` only. NO slot and no meta read: a state cannot be printed WITHOUT editing `setPaper.js`, which `scripts/t75-classify.mjs:79` (`READ_ONLY_PREFIX src/engine/drawings/`) refuses unless licensed. `test/turn71-the-set.test.js:400-425` pins ids and texts, not columns |
| F23 | a joint system switch | `src/engine/profile.js:1188-1198`; `src/engine/design.js:346-348,492,832-836`; `src/engine/joinery.js:35-41` | `profile.joinery`, `design.joinery`, `resolveJoinery`, `joineryLayers` | ALREADY a slot: `joinery.types = [{ id: 'dogbone', geometryKey: 'puzzle' }]`, `defaultType: 'dogbone'`, a PROJECT level `design.joinery`. Read only by the VISUAL layer pickers (`SettingsPanel.jsx:279`, `WizardSettings.jsx:232`, `CabinetEditorModal.jsx:623`, `PartDetailModal.jsx:2039`, `UnitView.jsx:146`). `computeCabinet` never reads it (every `joinery` hit in `cabinet.js` is a comment). No `profile.joints` key exists |
| F23 | side to top / side to bottom | `src/engine/puzzle.js:277-366,234-248,396-435` | `sidePanelGeometry` + `horizontalSocket`; `topPanelGeometry` | SIDE: socket pocket `PUZZLE_SOCKET` on the top and bottom edges, 2 x `PUZZLE_HOLES_7_5MM` per socket, 3 `SCREWS_3MM` per edge. TOP/BOTTOM: the tabs are IN THE OUTLINE (both long edges, protruding G beyond the nominal edge) plus `PUZZLE_DOG_BONES` pockets. Emitted at `cabinet.js:2752` (sides), `:2844-2847` (top/bottom) |
| F23 | back to side | `src/engine/puzzle.js:301-316,454-485,251-264` | `sidePanelGeometry` (back tabs), `backPanelGeometry` + `verticalSocket` | SIDE: tabs on the back edge in the outline + dog bones; BACK: left/right sockets + 2 holes each + side screw rows. Emitted at `cabinet.js:3058` |
| F23 | back to top / bottom (NOT in the spec's list) | `src/engine/puzzle.js:414-424,461,480-483` | `topPanelGeometry({ backTabs })`, `backPanelGeometry` | TOP/BOTTOM back-edge tabs into BACK top/bottom sockets (`acrossCentres`) + top/bottom screw rows. A fifth puzzle joint the F23 list omits; "never both systems on one joint" means it must be dowelled too |
| F23 | fixed shelf to side (MEASURED, BUD + FIX shelf at 300) | `src/engine/cabinet.js:7330-7372`; `src/engine/shelfTypes.js:136-137` | shelf joint loop, `biscuitSets`, `shelfBuild` | NOT a puzzle joint: `BISCUIT_4MM` marks (2 per side), `shelf_screw` x4 on BUL and x4 on BUR, `shelf_back_screw` x3 on BACK |
| F23 | other socket users | `src/engine/cabinet.js:3188,3304,3353`; `src/engine/puzzle.js:437-452` | `socketPanelGeometry` | fridge back rails and back-top panel (KIT_FRIDGE), the same joint elsewhere; KIT_SINK switches edges off via `edges` (`puzzle.js:281-283`) |
| F23 | default BUD 600 x 770 x 558, all ops (MEASURED) | `scratchpad/p07/joints.mjs` | `computeCabinet` | drills: `puzzle@BUL 8, screw@BUL 6, puzzle@BUR 8, screw@BUR 6, puzzle@BACK 20, screw@BACK 14, hinge@BUL 6, cup@01-F 3, cup_screw@01-F 6`; BUL/BUR 34 outline points, 4 sockets, 3 dog bones; TOP/BOTTOM 64 outline points, 6 dog bones, 0 holes; BACK 4 points, 10 sockets |
| F23 | where geometry becomes machining | `src/engine/cabinet.js:6984-6992,7012-7014` | `addDrill`, the drilling pass | every `panel.cnc.holes` entry is copied to `result.drills` (`{ panel, kind, layer, x, y, d, depth? }`) |
| F23 | edge holes | (none) | (none) | every hole is a FACE hole in the panel's 2D frame; there is no `face`/edge attribute in the drill record, the DXF writer or `machining.js`. A dowel's `edgeDepthMm 20` hole in the edge of a TOP/BOTTOM/BACK has nowhere to live, and a 3-axis flat bed cannot bore it |
| F23 | dowel things that exist | `src/engine/partEdits.js:140-160,230-243`; `src/engine/profile.js:4975`; HEAD `src/engine/partRegistry.js:369-372` | `dowelPositions`, op `dowels`, `editor.drillDefaults.dowelPitchMm`, registry `dowel` | a HAND dowel line (drills of kind `hand`), the pitch 32 already in the profile, and a registry row `dowel` ("Counted from the biscuit / dowel joints the engine drilled") with NO producer (`bom.js:382-387`) |
| F23 | BOM counting | `src/engine/bom.js:313-389,369,373,375`; `src/engine/cabinet.js:8474-8477`; HEAD `src/engine/partRegistry.js:512` | `buildCabinetPartQtys`, `hw`, `HARDWARE_TO_PART_ID` | consumables are counted off drills: `/screw/` kinds -> `screw_confirmat` (so `shelf_screw`, `cup_screw` count too), `puzzle` -> `puzzle_screw`, `rail_bracket` -> `rail_support`; bought hardware through `hw()` -> `result.hardware` -> role map |
| F23 | per-unit settings in PRO | `src/components/RightPanel.jsx:947-` ; `src/stores/projectStore.js:5131` | `Section title="Construction"`, `updateUnitParams` | the per-unit Construction section (plinth, top infill, end panels); writes go through `updateUnitParams` |
| F23 | where an export can be REFUSED | `src/lib/cncExport.js:101-105,144,147,200-204`; `src/engine/cnc/exportGate.js:100-152` | the three exports, `exportGate` | the gate HOLDS OUT parts and offers "Export anyway" (not a refusal). A refusal is a `throw new Error(sentence)` before the gate; `CncTree.jsx:174-176,195,203-205` and `ConfiguratorPage.jsx:403-405` already show a thrown sentence as a warn notify |
| F23 | layer policy guard | `src/engine/cnc/layers.js:19-`; `src/engine/machining.js:75-120`; `test/turn26-f3-sheet-vs-scene.test.js:278-286` | `CNC_LAYERS`, policy table | every CNC layer and every emitted layer must have a machining policy row, or that test fails |
| F23 | LISP to mirror | `reference/lisp/SKYLON_COMMON.lsp:670,696,791,886,938,942` | `createCNCLayers`, `drawBUL`, `drawBUR`, `drawTOP_ROT90`, `drawBOTTOM_ROT90`, `drawBACK` | the puzzle source; `test/turn35-lisp-parens.test.js:65` globs `reference/lisp/*.lsp`, so a new file is checked automatically (assertion is `>= 12`) |
| F23 | golden safety (MEASURED) | `scratchpad/p07/golden.mjs` | `computeCabinet` | adding `profile.joints` or `params.joints` leaves BUD `44d091b8...` and WARDROBE `f49a8c10...` (= `verify/t70/goldens-base.json`) unchanged: `result.params` is a 14-key echo that does not carry `joints` |
| F23 | Cabineo | (none) | (none) | no `cabineo` anywhere except a comment at `src/engine/joinery.js:23`; `reference/hardware/` holds aventos, cliptop, movento only |

## THE ROUND TRIP TABLE (F21)

There is no shipped warehouse catalogue in the repo (no fixture, no seed; the
warehouse starts empty). The probe therefore used (a) three JoineryCore-shaped
rows with all twelve columns filled and the hard cases in them, and (b) the
twenty `MOCK_MATERIALS` stock rows the rest of the app prices against. Road:
`migrateMaterial` (the row entering the warehouse) -> `toCsv` -> `fromCsv` ->
`mergeImport` back onto the warehouse (a re-import of our own export).
Script: `scratchpad/p07/roundtrip.mjs`, `rt2.mjs`, `mock.mjs`.

| column | value in | value out (toCsv -> fromCsv -> mergeImport) | verdict |
| - | - | - | - |
| `item_number` | `0042` | `0042` (on a match the warehouse's own is kept) | SURVIVES. But a NEW incoming row keeps its own number even when the warehouse already wears it: `0042` imported as a new JC row gave `["0042","0043","0044","0042"]`, a duplicate the DB's unique `(owner, item_number)` would refuse |
| `name` | `MFC White W980, 18mm "SM"` | identical | SURVIVES (comma and quotes) |
| `category` | `Sheets` / `Other Hardware` / `edging` | `sheets` / `other_hardware` / `others` | SURVIVES for the owner's nine (normalised); a JC category outside the nine is REPLACED by `others` and exported as `others`: LOST |
| `subcategory` | `Egger` | `Egger` | SURVIVES |
| `size` | `2800 x 2070`, `2800 × 2070` | identical | SURVIVES (UTF-8; the file carries no BOM, so Excel may misread non-ASCII) |
| `thickness` | `18`, empty, `18mm` | `18`, `null`, `18` | SURVIVES; but `18,5` -> `185` and any non-number -> `0`: FAILS on a comma decimal |
| `color` | `Biały / White` | identical | SURVIVES |
| `unit` | `sheet`, empty | `sheet`, `each` | SURVIVES; empty is REPLACED by `each` |
| `cost_per_unit` | `42.5`, `£42.50`, `1,234.56` | `42.5`, `42.5`, `1234.56` | SURVIVES for dot decimals. FAILS: `42,50` -> `4250`, `1 234,56` -> `123456`, `1e3` -> `13`, `n/a` -> `0` (should be null). A Polish-locale JC file would multiply every price by 100 |
| `image_url` | `https://cdn.example.com/w980.jpg?w=200,h=200` | identical | SURVIVES |
| `jc_uuid` | `A1B2C3D4-0000-4000-8000-00000000BEEF` | identical | SURVIVES as text; but MATCHING is case-sensitive: the same uuid in lower case was ADDED as a second row (`added 1, updated 0`). `cc_materials.jc_uuid` is a Postgres `uuid` (prints lower case), `cc_warehouse.jc_uuid` is `text` |
| `notes` | `line one` + newline + `line two` | `line one` | FAILS: `fromCsv` splits on newlines before quotes (`warehouse.js:230`); the tail line has no name and is SILENTLY dropped |
| `id` (ours, not in CSV) | `m_9sn0h597` | a new `m_6s5z98dh` from `fromCsv`; the warehouse's id kept on a `jc_uuid` match | identity survives ONLY through `jc_uuid`. A stock id like `mat_mfc18_white` never survives |
| `price_source` (ours, not in CSV) | `typed` | `import` | by design (a file cannot say who typed it); re-importing our OWN export flips every typed price to `import` |

Whole-file behaviours measured:

| case | in | out | verdict |
| - | - | - | - |
| re-import of our own export, rows without `jc_uuid` | 2 rows | 4, then 6 rows, item numbers `0001, 0002` worn three times | FAILS: no uuid means "new row" every time |
| the 20 stock rows through the warehouse | 20 rows | 40 after one re-import | FAILS the same way |
| a stock row (`MOCK_MATERIALS mat_mfc18_white`) | `code: W980 SM, kg_m2: 12, board_kind: mfc, price: 11.4, category: board` | `cost_per_unit 11.4, category others`, `code`, `kg_m2`, `board_kind` gone, id replaced | the stock list and the warehouse do not interchange |
| semicolon CSV (Excel PL default) | `item_number;name;cost_per_unit` | refused: "No `name` column" | refused in words, not guessed |
| UTF-8 BOM before the header | BOM + our CSV | 3 rows, `0042` | SURVIVES (`trim` removes U+FEFF) |
| project export filter as the modal calls it | project names none of 3 JC rows | 3 of 3 exported | FAILS (`WarehouseModal.jsx:255-258`) |

## FROZEN AND COPIED UI FILES THESE PARTS WOULD TOUCH

PRO FROZEN (`test/turn59-f1-the-switch.test.js:180-260`, re-frozen with an
`EXEMPT` licence at `:75` if edited): `WarehouseModal.jsx`, `BomPanel.jsx`,
`CncTree.jsx`, `CncView.jsx`, `CheckPanel.jsx`, `TopBar.jsx`, `MenuBar.jsx`,
`RightPanel.jsx`, `AssignMaterialsModal.jsx`, `CabinetEditorModal.jsx`,
`SettingsPanel.jsx`, `ElementProperties.jsx`, `src/pages/ConfiguratorPage.jsx`.
A NEW file under `src/components` or `src/pages` must also be added to
`FROZEN` (`:389-398`, "nothing was ADDED"). NOT frozen (lib and stores):
`lib/topMenu.js`, `lib/exporters.js`, `lib/cncExport.js`, `lib/checkFindings.js`,
`lib/warehouseDb.js`, `stores/warehouseStore.js`,
`stores/materialAssignmentStore.js` (`stores/projectStore.js` has one writer).

Retail copies (`scripts/t63-copies.mjs:90 ALL_COPIES`): of the files above only
`ElementProperties.jsx` has a copy (`src/retail/design/detail/ElementProperties.jsx`).
Retail has no BOM, CNC, Check or warehouse surface (grep of `src/retail`:
only a comment in `design/reasons.js:18`), so F21, F22 and F23 are PRO-only
by construction provided the per-unit joint setting is NOT put in
`ElementProperties.jsx`.

## INTEGRATOR NOTES

### F21 (stock CSV with JoineryCore)
- Fix before calling it a contract, each a pure change in `engine/warehouse.js`:
  `fromCsv` must split records quote-aware (a newline inside quotes),
  `numOrNull` must read a comma decimal (`42,50`) and return `null`, not `0`, for
  a non-number, `mergeImport` must compare `jc_uuid` case-insensitively (trim +
  lower case), and a NEW row whose `item_number` is already worn must get
  `nextItemNumber` (or be reported). Optional: `toCsv` writes a UTF-8 BOM for
  Excel (check that the existing round-trip test `turn51-f7:102-113` still
  passes; the BOM is already stripped on read).
- Re-import without uuid duplicates by design (`turn51-f7:73-81` pins "no
  uuid = new row"). Leave the law; say it in the PR and in `JC_NOTICE`.
- The project export bug: `WarehouseModal.jsx:255-258` passes every warehouse
  uuid. Hook: pass the uuids the PROJECT's assigned stock rows carry
  (`materials.filter(m => assigned ids).map(m => m.jc_uuid)`), or move the
  whole filter into a pure `warehouse.js projectRows(rows, { assignments,
  materials, design })` so a test can hold it. FROZEN file: EXEMPT needed.
- Purchase BOM identity: `purchaseBom` rows already carry `material`; add
  `jc_uuid: mat?.jc_uuid || null` and `code` in the two `bump('mat:'...)` calls
  (`bom.js:506-515,544-552`), then append `,JC_UUID,CODE` AFTER `PARTS` in
  `exporters.js:141` (the regex in `test/t39-bom-view.test.js:41` stays green
  only if the new columns come after `PARTS`). Decide what "the material code"
  is: warehouse `item_number`, stock `code` (mock only, no DB column,
  `loadMaterials` selects no `code` at `materialAssignmentStore.js:203`), or
  both. The stock list and the warehouse are TWO lists linked by nothing but
  `jc_uuid` or a forgiving name key; a project is priced off the stock list.
- `warehouseStamp` NAME COLLISION: `naming.js:111` already exports a function
  of that name (a filename minute stamp). Use another identifier for the
  project field (for example `project.priceStamp`) or the PR must say why the
  same word means two things. A real stamp needs a catalogue fingerprint (pure
  `warehouse.js catalogueStamp(rows)`, e.g. a hash of `jc_uuid|item_number|
  cost_per_unit` sorted) because no row `updated_at` reaches the app.
- `price_source` per assigned material: `cleanValue` (`partRegistry.js:670`)
  drops unknown keys, so either extend it (test impact: assignment tests that
  deepEqual normalised blobs) or store it beside `assignments` on the project.
- The moved-catalogue CHECK: a new `finding(28, 'yellow', ...)` (27 is F1's
  in the working tree) fed by a new `runChecks` input; the store call
  (`projectStore.js:8053-8058`) and `checkDependencies` (`checkFindings.js:64`)
  both grow, which breaks `test/turn38-f1-eye-test-fixes.test.js:83` (length 5).
  Also add the label row to `CHECKS` (and consider adding the missing 22, 23,
  24 labels there while the table is open).
- Labels: `WarehouseModal.jsx:295` -> `Import from JoineryCore (CSV)`, `:299` ->
  `Export project list for JoineryCore (CSV)`, `:302` -> `Export for
  JoineryCore (CSV)`; keep the `data-warehouse-*` attributes (the T51 e2e uses
  them). `JC_NOTICE` stays. `lib/topMenu.js:66` is not frozen if the menu hint
  is to change.
- Side finding for the PR (not this turn's to fix unless chosen): `cc_warehouse.id`
  is `uuid` but the app mints `m_xxxxxxxx`, so a DB write of a new row fails
  and the store degrades to `local` silently.

### F22 (production readiness)
- New pure `engine/readiness.js`. Inputs that exist: `meta.lattice` ->
  `geometry`; T30 L boards (`meta.corner` STRING) -> `geometry` until F4 deletes
  them; every `result.hardware` line and every `hardwareKit` line -> `bought`;
  drawer boxes in `design.drawerBoxes.mode === 'ready'` -> `bought` (needs the
  design in a ctx argument); everything else `cut`. Never key on
  `meta.corner` truthiness (a NUMBER there is a mitred, cut infill). Never key
  on "no holes" (measured list above). F3's blank and F7's RETURN/LID must
  carry an explicit flag or a side-map entry by part id.
- Golden-safe placement: compute in `buildBom` (`bom.js:78-99`, has `p`),
  `mergeUnitMaterials` rows, `ironmongerySummary` lines; nothing in
  `computeCabinet` output changes.
- Cut list CSV (`exporters.js:56`) is the LISP labels format pinned by
  `test/bom.test.js:85-87` and `test/hardware.test.js:201`: a state column
  there changes both tests and the LISP contract. Recommend: state on the
  screen Parts tab (`BomPanel.jsx:161-173` header + `FragmentRows`), the BOM CSV
  `IRONMONGERY` STATUS column and a new MATERIALS-side column, and the purchase
  CSV (append after `PARTS`); name the cut list CSV as unchanged in the PR.
- CNC: add `notCut` (count + names) to the three export results in
  `cncExport.js`; the banner is a line in `CncTree.jsx` above
  `data-material-export` and a notify after each export; never text in the DXF
  (`cncExport.js:176-179`).
- Check: one `yellow` finding per unit listing its non-`cut` lines (next free
  number after the moved-catalogue check), `subject: { unitId, editor:
  'cabinet' }`.
- T71: `setPaper.js cutRows`/`put` must change to print the state (e.g. a short
  `CUT/GEO/BUY/MAN` tag after `t18`); license `src/engine/drawings/setPaper.js`
  in `scripts/t75-classify.mjs` (currently `READ_ONLY_PREFIX`, `:79`).
  `turn71-the-set.test.js:400-425` stays green if ids and existing texts stay.
- FROZEN files touched: `BomPanel.jsx`, `CncTree.jsx`, maybe `CncView.jsx`,
  `CheckPanel.jsx` (only if the label lookup changes).

### F23 (dowels, Cabineo slot)
- ONE LAW, ONE PATH: a joint-system slot already exists (`profile.joinery.types`
  with `geometryKey`, `design.joinery`). Adding `profile.joints.system` beside
  it is a second path; the integrator should either add `{ id: 'dowel',
  geometryKey: 'dowel' }` (and later `'cabineo'`) to `joinery.types` and read
  the per-unit override from `params`, or state in the PR why `joints` is
  separate. Pitch 32 already lives at `profile.editor.drillDefaults.dowelPitchMm`
  (`profile.js:4975`).
- Joints to replace (five, not four): side/top, side/bottom, side/back,
  top+bottom/back, and the fixed shelf, which is biscuit + `shelf_screw`, not
  puzzle (decide: dowel replaces the biscuit marks and the screws, or only the
  biscuits). Hook points: `cabinet.js:2752` (side `edges` + a `system` arg),
  `:2844-2847` (top/bottom: `rectGeometry` + dowel holes instead of tabs),
  `:3058` (back), `:3188/3304/3353` (fridge socket panels), `:7330-7372`
  (fixed shelf). New geometry functions belong next to `puzzle.js` (or a new
  `engine/dowels.js`) mirroring `SKYLON_JOINTS_DOWEL.lsp` line for line.
- EDGE HOLES are a new concept: the drill record (`cabinet.js:6984`), the DXF
  writer and `machining.js` know only face holes. Either add an explicit
  `face: 'edge'` + `edge: 'top'|...` to the record with its own layer (and a
  `machining.js` policy row, else `test/turn26-f3-sheet-vs-scene.test.js:279,283`
  fails) or mark the edge half `manual` (F22) and say the 3-axis bed cannot
  bore it. This is a real-world gate the owner should see in the PR.
- New layer (e.g. `DOWEL_8MM`): add to `cnc/layers.js CNC_LAYERS` with an unused
  ACI (`test/turn35-f8-hinge-pilot.test.js:99` checks ACI uniqueness for one
  layer) and to the `machining.js` policy table.
- BOM: the drill kind must NOT contain `screw` (`bom.js:373` regex) and must
  not be `puzzle`; add `const dowels = drills.filter(d => d.kind ===
  'dowel').length` -> `addQty('dowel', pairs)` in `buildCabinetPartQtys`
  (registry row `dowel` exists with no producer). If "the hardware law" means
  `hw()`, add `dowels: 'dowel'` to `HARDWARE_TO_PART_ID` too, and count once.
- THE GATE: throw `"the dowel pattern is proposed, not confirmed by the owner"`
  at the top of each of the three exports in `cncExport.js` (before
  `exportGate`, so "Export anyway" cannot bypass it); the same sentence as a
  red Check per dowel unit; `cabineo` refused with its sentence.
- Per-unit override: `RightPanel.jsx` Construction section (`:947`) writing
  `params.joints` (or `params.joinery`) through `updateUnitParams`; no typed
  numbers. Golden-safe by measurement as long as `defaultParamsFor` gets no new
  key and the puzzle path is untouched when the key is absent.
- Golden `fixtures/golden-dowel-bud.json`; LISP file auto-included by the paren
  test; `reference/hardware/cabineo/README.md` is data only.

Scratch scripts (not committed): `/tmp/claude-0/-home-user-Cabinet-core/5ecde42f-181d-53f0-97f7-86c831a826a3/scratchpad/p07/`.
