// ─── TURN 72 · F10 + F12 — MATERIAL WHERE THERE IS A CHOICE, AND THE ─────
// ─── DIVIDER'S SETBACK ───────────────────────────────────────────────────
//
// F10, the owner's own question and his answer of 22.09.2026 — *"tak"*:
//
//   *"The `material` row of the docked editor shows in retail only when the
//   project carries more than one material of that piece's role (carcass or
//   front, from the design's type lists). One material: no row. PRO
//   unchanged."*
//
// F12, the owner:
//
//   *"w 2klik menu przegrody nie ma możliwości regulacji cofnięcia lub
//   wyrównania głębokości (jak w półkach)"*, and *"która strona ma być
//   drillowana nie ma znaczenia dla klientów, zachowaj dla PRO."*
//
// ONE FILE, because they are one mechanism: what the docked editor leaves out.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { rectCorners } from '../src/engine/room.js';
import { elementFields } from '../src/engine/elements.js';
import { getUnitType } from '../src/engine/types.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import * as A from '../src/retail/design/adapter.js';
import { loadPlainJsx } from '../scripts/t72-load.mjs';

const { dockFor } = await loadPlainJsx('src/retail/design/detail/docked.jsx');

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();

function aWardrobe({ shelves = 1, bays = 1 } = {}) {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const { id } = S().addUnit('WARDROBE', { params: { width: 1800, height: 2200, depth: 600 } });
  if (bays > 1) A.setBayCount(id, bays);
  if (shelves > 0) S().addShelves(id, shelves);
  return id;
}

const panelsOf = (unitId) => S().unitResult(unitId)?.panels || [];
const shelfOf = (unitId) => panelsOf(unitId).find((p) => p.part === 'SHELF' && p.role === 'shelf');
const partOf = (unitId) => panelsOf(unitId).find((p) => p.part === 'VPART');

/** What the DOCK actually hands the copied editor, for a live selection. */
function dockedFields(unitId, panel) {
  const found = A.resolveSelection({ unitId, elementRef: panel.id });
  assert.ok(found, `${panel.id} resolves to no menu`);
  const selection = A.resolveTarget({ menu: found.menu, unitId, ref: found.ref });
  const route = dockFor(selection);
  assert.ok(route?.props, `${panel.id} does not dock the copied editor`);
  const type = getUnitType(S().units.find((u) => u.id === unitId).type);
  return elementFields(route.props.panel, type).filter((f) => !route.props.omit.includes(f));
}

// ═══ F10 · MATERIAL, ONLY WHERE THERE IS A CHOICE ═════════════════════════

test('F10 · ONE material of that role: NO row', () => {
  const unitId = aWardrobe();
  S().setCarcassTypes(1);
  S().setFrontTypes(1);
  const shelf = shelfOf(unitId);
  assert.equal(A.materialChoiceCount(shelf), 1, 'the fixture already runs two carcass boards');
  assert.equal(A.pieceHasMaterialChoice(shelf), false);
  assert.ok(!dockedFields(unitId, shelf).includes('material'),
    'a picker with one row in it is a question with one answer');
});

test('F10 · TWO of that role: the row shows', () => {
  const unitId = aWardrobe();
  S().setCarcassTypes(2);
  const shelf = shelfOf(unitId);
  assert.equal(A.materialChoiceCount(shelf), 2);
  assert.equal(A.pieceHasMaterialChoice(shelf), true);
  assert.ok(dockedFields(unitId, shelf).includes('material'),
    'the client cannot choose between two boards he is paying for');
});

test('F10 · it is the PIECE\'S OWN role that is counted, never the other', () => {
  const unitId = aWardrobe();
  A.addDoors(unitId);
  S().setCarcassTypes(2);
  S().setFrontTypes(1);
  const shelf = shelfOf(unitId);
  const door = panelsOf(unitId).find((p) => p.part === 'FRONT' && p.role === 'front');
  assert.ok(door, 'no door was cut');
  // A carcass piece counts the carcass types…
  assert.equal(A.materialChoiceCount(shelf), 2);
  // …and a FRONT counts the front types, which is one here.
  assert.equal(A.materialChoiceCount(door), 1);

  // …and the other way round.
  S().setCarcassTypes(1);
  S().setFrontTypes(2);
  assert.equal(A.materialChoiceCount(shelfOf(unitId)), 1);
  assert.equal(A.materialChoiceCount(panelsOf(unitId)
    .find((p) => p.part === 'FRONT' && p.role === 'front')), 2);
});

test('F10 · the count is the DESIGN\'S own list — the same one PRO\'s row renders', () => {
  const adapter = read('src/retail/design/adapter.js');
  assert.match(adapter, /elementMaterialChoices\(design, P\(\), stock\)\.filter\(\(c\) => c\.kind === kind\)/);
  assert.match(adapter, /const slot = materialSlotOf\(panel, null, design\);/,
    'the role is not the engine\'s own reading of a panel');
  // …and PRO's `material` row renders that very list.
  assert.match(read('src/components/ElementProperties.jsx'),
    /elementMaterialChoices\(design, profile, materials\)/);
});

test('F10 · PRO IS UNCHANGED — its panel offers the row whatever the count', () => {
  // The gate is retail's `omit`, in retail's own dock table, and PRO passes no
  // `omit` at all. `material` is still in the engine's field list for every
  // kind that has one.
  assert.match(read('src/engine/elements.js'), /shelf: \['shelf-type', 'position-y', 'setback', 'thickness', 'material'\]/);
  const pro = read('src/components/ElementProperties.jsx');
  assert.match(pro, /case 'material':/);
  assert.ok(!/pieceHasMaterialChoice|materialChoiceCount/.test(pro),
    'the gate was written into PRO');
});

test('F10 · the row is in WORKSHOP_FIELDS still — it is LET OUT, not taken off the list', () => {
  const dock = read('src/retail/design/detail/docked.jsx');
  const list = dock.slice(dock.indexOf('const WORKSHOP_FIELDS'), dock.indexOf(']);'));
  assert.ok(list.includes("'material'"), 'material left the workshop list');
  assert.match(dock, /const MATERIAL_NEEDS_A_CHOICE = 'material';/);
  assert.match(dock, /if \(f === MATERIAL_NEEDS_A_CHOICE\) return !A\.pieceHasMaterialChoice\(panel\);/);
  // …and the flag still turns the whole list back on for a joiner.
  assert.match(dock, /RETAIL_SHOW_WORKSHOP_TOOLS\s*\n?\s*\? \[\]/);
});

// ═══ F12 · THE DIVIDER ════════════════════════════════════════════════════

test('F12 · the divider\'s menu in retail: POSITION and SET BACK, and no bored face', () => {
  const unitId = aWardrobe({ shelves: 0, bays: 2 });
  S().setCarcassTypes(1);
  const part = partOf(unitId);
  assert.ok(part, 'no divider was cut');
  const fields = dockedFields(unitId, part);
  assert.ok(fields.includes('position-x'), 'POSITION left the divider\'s menu');
  assert.ok(fields.includes('setback'), 'SET BACK FROM THE FRONT is still missing');
  assert.ok(!fields.includes('partition-drill-face'),
    '*"która strona ma być drillowana nie ma znaczenia dla klientów"*');
  assert.ok(!fields.includes('partition-slot'), 'which carcass board is the workshop\'s');
  assert.ok(!fields.includes('thickness'), 'the divider\'s own board is the workshop\'s');
});

test('F12 · SET BACK is the SAME row the shelf has — F2\'s chips plus the field', () => {
  const unitId = aWardrobe({ shelves: 1, bays: 2 });
  S().setCarcassTypes(1);
  assert.ok(dockedFields(unitId, shelfOf(unitId)).includes('setback'));
  assert.ok(dockedFields(unitId, partOf(unitId)).includes('setback'));
  // ONE field id, ONE case, ONE setter — never a second row for the divider.
  const ep = read('src/retail/design/detail/ElementProperties.jsx');
  assert.equal((ep.match(/case 'setback': \{/g) || []).length, 1, 'a second setback row was written');
  assert.equal((ep.match(/data-setback-chip=/g) || []).length, 1);
});

test('F12 · the setback really moves the divider\'s board', () => {
  const unitId = aWardrobe({ shelves: 0, bays: 2 });
  const part = partOf(unitId);
  const item = S().units.find((u) => u.id === unitId).params.sections[0].items
    .find((i) => i.id === part.meta.itemId);
  assert.ok(item, 'the divider reached the scene with no item');
  // A divider is born FLUSH (`front_mm: 0`) — which is the deepest it goes —
  // so the chips move it the other way from a shelf's, and the row is the
  // same row saying the same thing about the same face.
  assert.equal(Number(partOf(unitId).meta.front_mm) || 0, 0, 'a divider is not born flush');
  const flush = partOf(unitId).box.d;

  S().setElementDepth(unitId, item.id, 20);
  assert.equal(Number(partOf(unitId).meta.front_mm), 20, 'the 20 did not reach the item');
  assert.ok(partOf(unitId).box.d < flush, '20 mm did not set the board back');

  S().setElementDepth(unitId, item.id, 0);
  assert.equal(Math.round(partOf(unitId).box.d), Math.round(flush), 'FLUSH did not pull it out again');
});

test('F12 · PRO KEEPS THE FACE — *"zachowaj dla PRO"*', () => {
  // The engine still publishes it for a partition…
  assert.match(read('src/engine/elements.js'),
    /partition: \['position-x', 'partition-slot', 'partition-drill-face', 'setback', 'thickness', 'material'\]/);
  // …PRO's panel still renders it, with both faces and the reset…
  const pro = read('src/components/ElementProperties.jsx');
  assert.match(pro, /case 'partition-drill-face':/);
  assert.match(pro, /data-partition-drill-face=\{id\}/);
  assert.match(pro, /data-partition-drill-face-reset="1"/);
  // …and it is HIDDEN in retail through PRO's own `omit`, never cut.
  const dock = read('src/retail/design/detail/docked.jsx');
  assert.ok(dock.slice(dock.indexOf('const WORKSHOP_FIELDS'), dock.indexOf(']);'))
    .includes("'partition-drill-face'"), 'the bored face left the workshop list');
  assert.match(read('src/retail/design/detail/ElementProperties.jsx'), /case 'partition-drill-face':/,
    'the copy lost the row — that is a deletion, not a hide');
});

test('F12 · and the store setter is untouched, so a joiner still bores what he chose', () => {
  const unitId = aWardrobe({ shelves: 0, bays: 2 });
  const part = partOf(unitId);
  const item = S().units.find((u) => u.id === unitId).params.sections[0].items
    .find((i) => i.id === part.meta.itemId);
  S().setPartitionDrillFace(unitId, item.id, 'R');
  assert.equal(partOf(unitId).meta.drillFace, 'R', 'the face did not reach the board');
  S().setPartitionDrillFace(unitId, item.id, null);
  assert.ok(['L', 'R'].includes(partOf(unitId).meta.drillFace), 'the reset left no face at all');
});
