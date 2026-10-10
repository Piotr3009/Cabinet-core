# T76 F1 PROBE: THE PATCH ON MAIN, BEFORE ANY RESOLUTION

What was probed: `patches/gpt-decorative-fronts.patch` (GPT's branch as one file, base `f60d18f1`) against the base of this turn, `origin/main` at `b810560` ("fronty tura"), which carries T75 merged (`8e61c25`, Merge pull request #74 from `claude/t75-the-big-turn`). T75 IS on main, so the turn branches from `origin/main` and the PR title carries no "(on T75 branch)".

How: `git apply --check --3way` on the base (it writes nothing), then the real `git apply --3way` in a scratch worktree (`git worktree add --detach <scratch> HEAD`) so the conflict markers could be read before anything was resolved. Every line number below is the scratch file's, with the markers in.

Where a quoted line holds an em or en dash (the house law: none in anything written), the dash is shown as the escape `\u2014` or `\u2013`; every other character is verbatim.

## THE SUITE ON THE BASE, BEFORE ANYTHING WAS TOUCHED

`npm ci`, then `npm test` (`node --test "test/**/*.test.js"`, never `--silent`) on `b810560`:

| tests | pass | fail | cancelled | skipped | todo | duration |
| - | - | - | - | - | - | - |
| 6211 | 6211 | 0 | 0 | 0 | 0 | 140.6 s |

## THE FILES THE PATCH TOUCHES (66: 19 new, 47 modified)

| # | file | kind | lines added | lines removed | 3-way result |
| - | - | - | - | - | - |
| 1 | `docs/decorative-fronts.md` | new | 77 | 0 | direct (new file, no 3-way base) |
| 2 | `fixtures/golden-decorative-fronts.json` | new | 114 | 0 | direct (new file, no 3-way base) |
| 3 | `scripts/decorative-fronts-classify.mjs` | new | 83 | 0 | direct (new file, no 3-way base) |
| 4 | `scripts/decorative-fronts-pro-walk.mjs` | new | 182 | 0 | direct (new file, no 3-way base) |
| 5 | `scripts/front-decoration-walk.mjs` | new | 124 | 0 | direct (new file, no 3-way base) |
| 6 | `scripts/t63-copies.mjs` | modified | 5 | 1 | clean |
| 7 | `scripts/t63-copy.mjs` | modified | 2 | 2 | clean |
| 8 | `src/3d/UnitView.jsx` | modified | 24 | 12 | clean |
| 9 | `src/3d/frontDecorationSolid.js` | new | 341 | 0 | direct (new file, no 3-way base) |
| 10 | `src/components/AssignMaterialsModal.jsx` | modified | 4 | 6 | clean |
| 11 | `src/components/BomPanel.jsx` | modified | 8 | 1 | clean |
| 12 | `src/components/CncTree.jsx` | modified | 14 | 8 | clean |
| 13 | `src/components/CncView.jsx` | modified | 182 | 33 | clean |
| 14 | `src/components/FrontDecorationControls.jsx` | new | 91 | 0 | direct (new file, no 3-way base) |
| 15 | `src/components/PartDetailModal.jsx` | modified | 2 | 1 | clean |
| 16 | `src/components/RightPanel.jsx` | modified | 17 | 3 | **CONFLICT** |
| 17 | `src/components/SettingsPanel.jsx` | modified | 19 | 3 | clean |
| 18 | `src/components/WizardSettings.jsx` | modified | 27 | 4 | clean |
| 19 | `src/engine/bom.js` | modified | 73 | 8 | **CONFLICT** |
| 20 | `src/engine/cabinet.js` | modified | 60 | 0 | **CONFLICT** |
| 21 | `src/engine/cnc/dxf.js` | modified | 30 | 9 | clean |
| 22 | `src/engine/cnc/exportGate.js` | modified | 9 | 2 | clean |
| 23 | `src/engine/cnc/frontOperations.js` | new | 272 | 0 | direct (new file, no 3-way base) |
| 24 | `src/engine/design.js` | modified | 36 | 6 | clean |
| 25 | `src/engine/drawings/frontDecorationDrawing.js` | new | 91 | 0 | direct (new file, no 3-way base) |
| 26 | `src/engine/drawings/frontElevation.js` | modified | 6 | 1 | clean |
| 27 | `src/engine/drawings/partDetail.js` | modified | 26 | 11 | clean |
| 28 | `src/engine/frontDecoration.js` | new | 435 | 0 | direct (new file, no 3-way base) |
| 29 | `src/engine/frontDecorationBom.js` | new | 31 | 0 | direct (new file, no 3-way base) |
| 30 | `src/engine/frontStyleArt.js` | modified | 17 | 0 | clean |
| 31 | `src/engine/materials.js` | modified | 19 | 0 | clean |
| 32 | `src/engine/partEdits.js` | modified | 27 | 2 | clean |
| 33 | `src/engine/partRegistry.js` | modified | 6 | 0 | clean |
| 34 | `src/engine/projectSettings.js` | modified | 3 | 0 | clean |
| 35 | `src/lib/cncExport.js` | modified | 64 | 6 | **CONFLICT** |
| 36 | `src/lib/exporters.js` | modified | 15 | 1 | clean |
| 37 | `src/pages/ConfiguratorPage.jsx` | modified | 2 | 1 | clean |
| 38 | `src/retail/design/FrontThumb.jsx` | modified | 4 | 52 | clean |
| 39 | `src/retail/design/Options.jsx` | modified | 23 | 16 | clean |
| 40 | `src/retail/design/adapter.js` | modified | 16 | 11 | clean |
| 41 | `src/retail/design/detail/PartDetailModal.jsx` | modified | 2 | 1 | clean |
| 42 | `src/retail/design/material/FrontDecorationControls.jsx` | new | 91 | 0 | direct (new file, no 3-way base) |
| 43 | `src/stores/projectStore.js` | modified | 7 | 1 | **CONFLICT** |
| 44 | `test/decorative-front-drawings.test.js` | new | 167 | 0 | direct (new file, no 3-way base) |
| 45 | `test/design.test.js` | modified | 1 | 1 | clean |
| 46 | `test/front-decoration-cnc.test.js` | new | 246 | 0 | direct (new file, no 3-way base) |
| 47 | `test/front-decoration-geometry.test.js` | new | 294 | 0 | direct (new file, no 3-way base) |
| 48 | `test/front-decoration-integration.test.js` | new | 130 | 0 | direct (new file, no 3-way base) |
| 49 | `test/front-decoration-purchase.test.js` | new | 189 | 0 | direct (new file, no 3-way base) |
| 50 | `test/front-decoration-solid.test.js` | new | 302 | 0 | direct (new file, no 3-way base) |
| 51 | `test/front-decoration-ui.test.js` | new | 122 | 0 | direct (new file, no 3-way base) |
| 52 | `test/turn21-f3-f4-f5.test.js` | modified | 4 | 2 | clean |
| 53 | `test/turn26-f6-shaker-rebate.test.js` | modified | 3 | 1 | clean |
| 54 | `test/turn30-f10-front-style-cascade.test.js` | modified | 2 | 2 | clean |
| 55 | `test/turn35-f9-project-wide-export.test.js` | modified | 12 | 8 | clean |
| 56 | `test/turn45-f4-duplicates-die-step6-summary.test.js` | modified | 1 | 1 | clean |
| 57 | `test/turn49-f5-the-fronts-ask-for-types-first.test.js` | modified | 2 | 2 | clean |
| 58 | `test/turn59-f1-the-switch.test.js` | modified | 36 | 14 | **CONFLICT** |
| 59 | `test/turn59-f4-the-options.test.js` | modified | 3 | 3 | clean |
| 60 | `test/turn60-f1-the-scale-law.test.js` | modified | 4 | 1 | clean |
| 61 | `test/turn64-f2-f5-steps-posh-layout-estimate.test.js` | modified | 3 | 1 | clean |
| 62 | `test/turn65-f8-the-menu-and-the-cornice.test.js` | modified | 3 | 1 | clean |
| 63 | `test/turn66-f2-f11-the-steps-and-the-column.test.js` | modified | 1 | 1 | clean |
| 64 | `test/turn68-f1-one-write-path.test.js` | modified | 2 | 1 | clean |
| 65 | `test/turn68-f6-f8-hinges-and-one-road.test.js` | modified | 6 | 13 | clean |
| 66 | `test/turn75-the-j-band.test.js` | modified | 2 | 2 | clean |

## `git apply --check --3way patches/gpt-decorative-fronts.patch`

Exit code 0 (the check reports conflicts in words and does not fail on them; the real `git apply --3way` in the scratch worktree exits 1 for the same six files). Its output, verbatim:

```
Falling back to direct application...
Falling back to direct application...
Falling back to direct application...
Falling back to direct application...
Falling back to direct application...
Applied patch to 'scripts/t63-copies.mjs' cleanly.
Applied patch to 'scripts/t63-copy.mjs' cleanly.
Applied patch to 'src/3d/UnitView.jsx' cleanly.
Falling back to direct application...
Applied patch to 'src/components/AssignMaterialsModal.jsx' cleanly.
Applied patch to 'src/components/BomPanel.jsx' cleanly.
Applied patch to 'src/components/CncTree.jsx' cleanly.
Applied patch to 'src/components/CncView.jsx' cleanly.
Falling back to direct application...
Applied patch to 'src/components/PartDetailModal.jsx' cleanly.
Applied patch to 'src/components/RightPanel.jsx' with conflicts.
Applied patch to 'src/components/SettingsPanel.jsx' cleanly.
Applied patch to 'src/components/WizardSettings.jsx' cleanly.
Applied patch to 'src/engine/bom.js' with conflicts.
Applied patch to 'src/engine/cabinet.js' with conflicts.
Applied patch to 'src/engine/cnc/dxf.js' cleanly.
Applied patch to 'src/engine/cnc/exportGate.js' cleanly.
Falling back to direct application...
Applied patch to 'src/engine/design.js' cleanly.
Falling back to direct application...
Applied patch to 'src/engine/drawings/frontElevation.js' cleanly.
Applied patch to 'src/engine/drawings/partDetail.js' cleanly.
Falling back to direct application...
Falling back to direct application...
Applied patch to 'src/engine/frontStyleArt.js' cleanly.
Applied patch to 'src/engine/materials.js' cleanly.
Applied patch to 'src/engine/partEdits.js' cleanly.
Applied patch to 'src/engine/partRegistry.js' cleanly.
Applied patch to 'src/engine/projectSettings.js' cleanly.
Applied patch to 'src/lib/cncExport.js' with conflicts.
Applied patch to 'src/lib/exporters.js' cleanly.
Applied patch to 'src/pages/ConfiguratorPage.jsx' cleanly.
Applied patch to 'src/retail/design/FrontThumb.jsx' cleanly.
Applied patch to 'src/retail/design/Options.jsx' cleanly.
Applied patch to 'src/retail/design/adapter.js' cleanly.
Applied patch to 'src/retail/design/detail/PartDetailModal.jsx' cleanly.
Falling back to direct application...
Applied patch to 'src/stores/projectStore.js' with conflicts.
Falling back to direct application...
Applied patch to 'test/design.test.js' cleanly.
Falling back to direct application...
Falling back to direct application...
Falling back to direct application...
Falling back to direct application...
Falling back to direct application...
Falling back to direct application...
Applied patch to 'test/turn21-f3-f4-f5.test.js' cleanly.
Applied patch to 'test/turn26-f6-shaker-rebate.test.js' cleanly.
Applied patch to 'test/turn30-f10-front-style-cascade.test.js' cleanly.
Applied patch to 'test/turn35-f9-project-wide-export.test.js' cleanly.
Applied patch to 'test/turn45-f4-duplicates-die-step6-summary.test.js' cleanly.
Applied patch to 'test/turn49-f5-the-fronts-ask-for-types-first.test.js' cleanly.
Applied patch to 'test/turn59-f1-the-switch.test.js' with conflicts.
Applied patch to 'test/turn59-f4-the-options.test.js' cleanly.
Applied patch to 'test/turn60-f1-the-scale-law.test.js' cleanly.
Applied patch to 'test/turn64-f2-f5-steps-posh-layout-estimate.test.js' cleanly.
Applied patch to 'test/turn65-f8-the-menu-and-the-cornice.test.js' cleanly.
Applied patch to 'test/turn66-f2-f11-the-steps-and-the-column.test.js' cleanly.
Applied patch to 'test/turn68-f1-one-write-path.test.js' cleanly.
Applied patch to 'test/turn68-f6-f8-hinges-and-one-road.test.js' cleanly.
Applied patch to 'test/turn75-the-j-band.test.js' cleanly.
```

## THE FILES THAT CONFLICTED (6, as the dry run of 10.10.2026 expected: six)

| file | conflict hunks | at line(s) |
| - | - | - |
| `src/components/RightPanel.jsx` | 1 | 20 |
| `src/engine/bom.js` | 3 | 111, 149, 442 |
| `src/engine/cabinet.js` | 1 | 9189 |
| `src/lib/cncExport.js` | 1 | 144 |
| `src/stores/projectStore.js` | 1 | 776 |
| `test/turn59-f1-the-switch.test.js` | 8 | 76, 193, 248, 258, 302, 336, 524, 540 |

## EACH CONFLICT, BOTH SIDES VERBATIM

"ours" is main (T75 and everything before it); "theirs" is GPT's patch. Nothing below is resolved; the resolutions are the F1 table of CLAUDE.md and land in the next commit.

### `src/components/RightPanel.jsx`, conflict 1 of 1 (marker at line 20)

ours (main):

```js
// T75 F7 · CUT CORNER: the small window at the click on a lit corner.
import Modal from './Modal.jsx';
import { notchApplies } from '../engine/notch.js';
// T75 F4/F11 · the worktop row: who takes one alone, and the island's seating.
import { takesWorktop, worktopEligible } from '../engine/worktop.js';
import { CABINEO_REFUSAL, dowelKitRefusal, jointSystemOf } from '../engine/dowels.js';
```

theirs (GPT):

```js
import FrontDecorationControls from './FrontDecorationControls.jsx';
```

### `src/engine/bom.js`, conflict 1 of 3 (marker at line 111)

ours (main):

```js
        // T75 F22 · *"The cut list, the BOM and the CNC export show the state
        // on every line"*: read off the part, never written into it.
        readiness: readinessOf(p, { drills: result.drills }),
```

theirs (GPT):

```js
        ...(manufacturing ? { manufacturing } : {}),
```

### `src/engine/bom.js`, conflict 2 of 3 (marker at line 149)

ours (main):

```js
      // T75 F22 · …and its state: an outline is not merged into a cut part.
      const key = `${r.part}|${r.w}|${r.h}|${r.thickness}|${r.edge}|${r.material_key || r.material_label || ''}|${r.readiness}`;
```

theirs (GPT):

```js
      const key = `${r.part}|${r.w}|${r.h}|${r.thickness}|${r.edge}|${r.material_key || r.material_label || ''}`
        + (r.manufacturing ? `|${r.manufacturing.identity}` : '');
```

### `src/engine/bom.js`, conflict 3 of 3 (marker at line 442)

ours (main):

```js
const FRONT_SHEET_PARTS = new Set(['door', 'drawer_front', 'false_front', 'end_panel', 'mask', 'pelmet']);
```

theirs (GPT):

```js
const FRONT_SHEET_PARTS = new Set(['door', 'drawer_front', 'front_moulding', 'false_front', 'end_panel', 'mask']);
```

### `src/engine/cabinet.js`, conflict 1 of 1 (marker at line 9189)

ours (main):

```js
  // ─── T75 F4 · THE L's DOORS AND ITS PARENTS' DRILLING JOIN HERE ─────────
  //
  // After every front and drilling pass of the box (which cut none of them),
  // so nothing is bored twice: the two leaves the parent kit cut, placed on
  // their arms, with their cups, cup screws and handle holes, and the parent's
  // hinge plates, shelf pins, hangers and rail brackets in SIDE-A and SIDE-B.
  if (lCorner) {
    for (const { door, drills: dd, said } of lCorner.doors) {
      panels.push(door);
      for (const dr of dd) drills.push({ ...dr });
      for (const wn of said) warnings.push({ ...wn });
    }
    for (const dr of lCorner.sideDrills) drills.push(dr);
    const first = lCorner.doors.find((x) => x.door.meta?.opensFirst);
    if (first) {
      // The line the BOM carries (`bom.js buildBom` units[].warnings): an
      // INFO, never a fault. The leaf carries it too (`meta.note`).
      warnings.push({
        code: 'CORNER_L_OPENS_FIRST',
        level: 'info',
        panel: first.door.id,
        message: `${unitNum}: door ${first.arm} opens first (it overlaps door ${first.arm === 'A' ? 'B' : 'A'} at the inner corner).`,
      });
    }
  }

```

theirs (GPT):

```js
  // Piotr, 09.10.2026: decorative fronts with editable defaults and CNC.
  // Check opposing cuts after the existing cup drilling and J edge exist.
  if (params?.front_decoration) {
    const fronts = panels.filter((p) => p.role === 'front');
    for (const front of fronts) {
      const decoration = buildFrontDecoration({
        panel: front, config: params.front_decoration,
        style: front.meta?.frontType || cfg.frontType, drills, profile: P,
      });
      if (!decoration) continue;
      front.meta = { ...front.meta, frontDecoration: decoration };
      for (const finding of decoration.problems) {
        warnings.push({ ...finding, panel: front.id, message: `${front.id}: ${finding.message}` });
      }
      // Applied strips are real cut parts. Their scene geometry belongs to
      // the moving front, while these records feed the BOM, CSV and CNC.
      panels.push(...appliedFrontParts(front, P));
    }
  }
```

### `src/lib/cncExport.js`, conflict 1 of 1 (marker at line 144)

ours (main):

```js
  // T75 F22 · the banner rides the ZIP as a file of its own.
  const ready = exportReadiness(safe.panels, safe.drills);
  const note = readinessNote(result.unitNum, ready);
  if (note) zip.file(`${fileSafeName(result.unitNum, 'unit')}-READINESS.txt`, note);
```

theirs (GPT):

```js
  const manifestName = 'front-operations.json';
  const decorated = hasFrontDecorations([{ result }]);
  if (decorated) zip.file(manifestName, JSON.stringify(frontOperationsManifest([{ result }], {
    files: files.map((f) => ({ name: f.name, setup: f.setup || 'back', panelId: f.panelId })),
    gate, exportAnyway,
  }), null, 2));
```

### `src/stores/projectStore.js`, conflict 1 of 1 (marker at line 776)

ours (main):

```js
    run_mask: _fossilMask, run_cornice: _fossilCornice, run_upstand: _fossilUpstand,
    run_pelmet: _fossilPelmet,
```

theirs (GPT):

```js
    run_mask: _fossilMask, run_cornice: _fossilCornice,
    front_decoration: storedDecoration,
```

### `test/turn59-f1-the-switch.test.js`, conflict 1 of 8 (marker at line 76)

ours (main):

```js
  'src/components/CncTree.jsx':
    'T75 F22 · after an export the CNC view says how many parts the machine does not finish (the export\'s readiness banner), one line beside the gate\'s. *"the CNC export carries a banner counting the lines that are not `\'cut\'`."*',
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
    + 'T75 F5 · the cut list and the BOM receive the room, so the worktop reaches them: its slabs (a corner is two, an L is one shaped like the L), the connector bolts as an order line, the joint and every cut-out as a NOTE. *"Done means the whole road ... lands in the cut list and the BOM."* One line: `room: project.room` handed to `buildBom`.',
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
    + 'T75 F23 · the Construction section\'s Joints row: Puzzle or Dowel per unit, written to the unit\'s joints_system through updateUnitParams; the status line reads the engine\'s own answer (derived.joints: the dowel count, the gate, or the refusal in its words); Cabineo shown disabled with its sentence; no typed number. No retail copy (PART G is PRO only). *"lisp najpierw."* *"a per-unit override through the unit\'s settings section (no typed numbers in the UI)."*',
```

theirs (GPT):

```js
  // Owner-authorised decorative fronts, 09.10.2026. Each path is re-frozen below.
  'src/components/AssignMaterialsModal.jsx': 'DECOR F4: applied strip stock badges use the same thickness validation as purchasing. *"nie mam zreob default jak uwazasz najwyzej pozneij poprawimy jedz z koksem i koduj prosze"*',
  'src/components/BomPanel.jsx': 'DECOR F4: show the decorative construction and production status on each BOM row. *"nie mam zreob default jak uwazasz najwyzej pozneij poprawimy jedz z koksem i koduj prosze"*',
  'src/components/CncTree.jsx': 'DECOR F3: await packaged front/back CNC exports. *"nie mam zreob default jak uwazasz najwyzej pozneij poprawimy jedz z koksem i koduj prosze"*',
  'src/components/CncView.jsx': 'DECOR F3: explicit front/back machining preview from shared export geometry. *"nie mam zreob default jak uwazasz najwyzej pozneij poprawimy jedz z koksem i koduj prosze"*',
  'src/components/FrontDecorationControls.jsx': 'DECOR F1: editable, versioned decorative machining defaults shared with Retail. *"nie mam zreob default jak uwazasz najwyzej pozneij poprawimy jedz z koksem i koduj prosze"*',
  'src/components/PartDetailModal.jsx': 'DECOR F4: decorative layer colours follow the canonical part legend. *"nie mam zreob default jak uwazasz najwyzej pozneij poprawimy jedz z koksem i koduj prosze"*',
  'src/components/RightPanel.jsx': 'DECOR F1: per-unit decorative style selection and recipe editing. *"nie mam zreob default jak uwazasz najwyzej pozneij poprawimy jedz z koksem i koduj prosze"*',
  'src/components/SettingsPanel.jsx': 'DECOR F1: project and saved-style decorative recipes. *"nie mam zreob default jak uwazasz najwyzej pozneij poprawimy jedz z koksem i koduj prosze"*',
  'src/components/WizardSettings.jsx': 'DECOR F1: material-slot and saved-style decorative recipes. *"nie mam zreob default jak uwazasz najwyzej pozneij poprawimy jedz z koksem i koduj prosze"*',

```

### `test/turn59-f1-the-switch.test.js`, conflict 2 of 8 (marker at line 193)

ours (main):

```js
    'T75 F22 · the Output menu\'s DXF export says the same banner as the CNC view\'s. *"the CNC export carries a banner counting the lines that are not `\'cut\'`."* '
    + 'T75 F20 · a Media wall, Sideboard, Vanity, Utility or Hallway job\'s first plus puts its shipped set on the first wall (insertSet, Room refuses first). *"NEW PROJECT with one of them offers the set first (the first plus point on the first wall)."* '
    + 'T75 F5 · the BOM file is handed the room so the worktop that turns the corner (two slabs and one joint record) rides the file as it rides the panel. *"daj od razu narożniki przemyślane."* '
```

theirs (GPT):

```js
    'DECOR F4: pass actual stock to decorative strip assignment checks. *"nie mam zreob default jak uwazasz najwyzej pozneij poprawimy jedz z koksem i koduj prosze"*. '
```

### `test/turn59-f1-the-switch.test.js`, conflict 3 of 8 (marker at line 248)

ours (main):

```js
  // T75 · re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/BomPanel.jsx': '789d546fa314ef51fccfa023d137aceaab863438c490e2b2cff1424a0d4fe490',
```

theirs (GPT):

```js
  'src/components/BomPanel.jsx': '7285e3b63b1c480b0d793cf10e90a470df061b087d909981722009c7d349009b',
```

### `test/turn59-f1-the-switch.test.js`, conflict 4 of 8 (marker at line 258)

ours (main):

```js
  // T75 · re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/CncTree.jsx': '87bd2103612c33d9abcd0d637f38b7b4e71e28c91dc9ef3e8245e96916e30019',
  'src/components/CncView.jsx': 'bbfa3f571120d6bb089f2a885bc48f1f12e1c0431ebb57fb997b9f31ea8a540d',
```

theirs (GPT):

```js
  'src/components/CncTree.jsx': '0928d303e277e5eef29611d5499be4e4d3e9d4dc9de7a1b5cf5e5226c285574e',
  'src/components/CncView.jsx': '1e4642cd6e124cca0003f5305f557bf3172ae5de88af4dbd7c3cc153c62b393b',
```

### `test/turn59-f1-the-switch.test.js`, conflict 5 of 8 (marker at line 302)

ours (main):

```js
  // T75 · re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/RightPanel.jsx': '2891d8258ec102eec6596c35bfd50fc94535a9c65a9c7814f6e1a14794870d25',
  // T75 · re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/RoomModal.jsx': '29ffa1a4b710d3d3c7d168dfce23aa765fc76a3c9ba159b71b01964996dbd263',
```

theirs (GPT):

```js
  'src/components/RightPanel.jsx': 'd0eef73eefa257d66f417dcb491350ff9384db5fc4f7593f05bea33395ce4829',
  // T69 F1 \u2014 re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/components/RoomModal.jsx': '1bd7aebbe8899d428fcbe66ab972c72af43ae98c18b73f15eb7346f8b7f2d210',
```

### `test/turn59-f1-the-switch.test.js`, conflict 6 of 8 (marker at line 336)

ours (main):

```js
  // T75 · re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/pages/ConfiguratorPage.jsx': 'a43851062d522b7838d506ba2547a4a635be77bb3e4809f11edccb89f54e33c6',
```

theirs (GPT):

```js
  // T71 F5: re-frozen at the new hash; `EXEMPT` above carries the reason.
  'src/pages/ConfiguratorPage.jsx': 'db5c03f6aa2ab3d4f38796e111aface2cd7159f747c5463765aa8dba22406c47',
```

### `test/turn59-f1-the-switch.test.js`, conflict 7 of 8 (marker at line 524)

ours (main):

```js
    'src/components/BomPanel.jsx',
    // T75 F22 · *"the CNC export carries a banner counting the lines that are not 'cut'"*.
    'src/components/CncTree.jsx',
    'src/components/ContextMenu.jsx',
```

theirs (GPT):

```js
    'src/components/AssignMaterialsModal.jsx',
    'src/components/BomPanel.jsx',
    'src/components/CncTree.jsx',
    'src/components/CncView.jsx',
```

### `test/turn59-f1-the-switch.test.js`, conflict 8 of 8 (marker at line 540)

ours (main):

```js
    // T75 F15 · *"The held-open row `cornice-pelmet` opens as a PLAIN pelmet"*.
    'src/components/LibraryPanel.jsx',
    'src/components/RightPanel.jsx',
    'src/components/RoomModal.jsx',
    // T75 F20 · *"`lib/templates.js` grows `kind: 'set'`"*: the modal saves a selection as a set.
    'src/components/SaveTemplateModal.jsx',
    // T75 F20 · *"the Library's `media` category (`soon`) becomes the sets shelf"*.
    'src/components/TopBar.jsx',
```

theirs (GPT):

```js
    'src/components/PartDetailModal.jsx',
    'src/components/RightPanel.jsx',
    'src/components/RoomModal.jsx',
    'src/components/SettingsPanel.jsx',
```
