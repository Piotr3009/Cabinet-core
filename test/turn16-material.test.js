// ─── Turn 16, F1 + F2: A BOARD IS ASSIGNED ONCE AND READ EVERYWHERE ─────────
//
// The owner, verbatim: "przypisane materiały jeśli są takie same to łączymy,
// jeśli inne to oddzielamy — dlatego przypisanie materiałów jest takie ważne."
//
// Before this turn only the CARCASS types carried a board. Fronts had none,
// infills/plinths/end panels/masks had none, and four different parts of the
// app answered "what is this piece made of" in four different ways. This file
// holds the one answer to it:
//
//   F1.1  a front TYPE carries stock, like a carcass type
//   F1.2  the run pieces follow front 1 by default, or take their own board
//   F1.3  the element list is one row PER FRONT TYPE, matched by KEY
//   F1.4  an element override reaches the PICTURE
//   F1.5  the BOM, the sheet and the check-out read the same resolution
//   F2    the CNC sheet groups by ASSIGNED MATERIAL — the turn's one CNC delta

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import {
  DEFAULT_DESIGN, elementMaterialChoices, migrateDesign, paletteEntryByKey, projectPalette,
  resolveFinishes, withRunMaterial,
} from '../src/engine/design.js';
import {
  RUN_MATERIAL_GROUPS, materialSlotOf, panelFinish, placeholderAssignments, resolvePanelMaterial,
  runMaterialSetting,
} from '../src/engine/materials.js';
import { buildBom } from '../src/engine/bom.js';
import { groupByMaterial, materialSection } from '../src/engine/cnc/views.js';
import { VIEW_PRESETS, EXPORT_PRESETS } from '../src/engine/cnc/groups.js';
import { useProjectStore, paramsForEngine } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();

/** The workshop's stock, small enough to reason about. */
const MATERIALS = [
  { id: 'm_white', code: 'W980', name: 'MFC White 18', category: 'board', thickness: 18 },
  { id: 'm_oak', code: 'H1180', name: 'MFC Halifax Oak 18', category: 'board', thickness: 18 },
  { id: 'm_mdf', code: 'MDF-18', name: 'MDF 18', category: 'board', thickness: 18 },
  { id: 'm_generic', code: '—', name: 'Generic board 18 mm', category: 'board', thickness: 18, placeholder: true },
];

/** A project with two carcass types and two front types, each on its own board. */
const twoAndTwo = () => migrateDesign({
  carcass: {
    types: [
      { id: 'c1', label: 'Carcass 1', material_id: 'm_white' },
      { id: 'c2', label: 'Carcass 2', material_id: 'm_oak' },
    ],
  },
  fronts: {
    types: [
      { id: 'f1', label: 'Front 1', source: 'laminate', finish_id: 'egger:H1180_37', material_id: 'm_oak' },
      { id: 'f2', label: 'Front 2', source: 'spray', colour: { hex: '#b32428', name: '3005 Wine Red', system: 'RAL' }, material_id: 'm_mdf' },
    ],
  },
});

const unitOn = (typeId, params = {}) => ({
  id: `u_${typeId}`,
  type: typeId,
  params: { ...defaultParamsFor(typeId, P), unit_num: '01', ...params },
});

const resultOf = (unit) => computeCabinet({ ...unit.params, type: unit.type }, P);
const panelOf = (result, id) => result.panels.find((p) => p.id === id);

// ─── F1.1 — a front type carries a BOARD ────────────────────────────────────

test('F1.1 — a front TYPE carries stock, exactly as a carcass type does', () => {
  const design = twoAndTwo();
  assert.equal(design.fronts.types[0].material_id, 'm_oak');
  assert.equal(design.fronts.types[1].material_id, 'm_mdf');

  // …and the palette — the one list both pickers read — carries it too, so a
  // front row can say what board is behind the look.
  const palette = projectPalette(design, P);
  const front1 = palette.find((e) => e.key === 'front:f1');
  const front2 = palette.find((e) => e.key === 'front:f2');
  assert.equal(front1.material_id, 'm_oak');
  assert.equal(front2.material_id, 'm_mdf');
  assert.equal(palette.find((e) => e.key === 'carcass:c1').material_id, 'm_white');
});

test('F1.1 — a project that predates the turn keeps every piece where it was', () => {
  // The migration must be free: four switches ON is exactly what the app did
  // before there were switches — a plinth, a filler, an end panel and a mask
  // were all cut from the front sheet.
  const old = migrateDesign({ fronts: { types: [{ id: 'f1', material_id: 'm_oak' }] } });
  for (const g of RUN_MATERIAL_GROUPS) {
    assert.deepEqual(runMaterialSetting(old, g.id), { sameAsFronts: true, material_id: null },
      `${g.id} follows the fronts, as it always has`);
  }
  assert.deepEqual(Object.keys(DEFAULT_DESIGN.runMaterials).sort(),
    RUN_MATERIAL_GROUPS.map((g) => g.id).sort(), 'and the four switches are the four run roles');
});

// ─── F1.2 — "Same as fronts" ────────────────────────────────────────────────

test('F1.2 — the four run pieces follow front 1 by default, and can be given their own', () => {
  const design = twoAndTwo();
  const plinth = { id: 'PLINTH', part: 'PLINTH', role: 'plinth', material_role: 'front', thickness: 18 };
  const unit = unitOn('BUD');

  // ON: the plinth IS front type 1's board. The checkbox is an assignment.
  const following = resolvePanelMaterial(plinth, unit, design, P, MATERIALS);
  assert.equal(materialSlotOf(plinth, unit, design).kind, 'front');
  assert.equal(following.material_id, 'm_oak');

  // OFF: its own board, and the label is that board's name.
  const own = withRunMaterial(design, 'plinth', { sameAsFronts: false, material_id: 'm_mdf' });
  const alone = resolvePanelMaterial(plinth, unit, own, P, MATERIALS);
  assert.equal(materialSlotOf(plinth, unit, own).kind, 'run');
  assert.equal(alone.material_id, 'm_mdf');
  assert.equal(alone.label, 'MDF 18');

  // …and unticking the box again does not throw the board away.
  const back = withRunMaterial(own, 'plinth', { sameAsFronts: true });
  assert.equal(runMaterialSetting(back, 'plinth').material_id, 'm_mdf', 'the choice is remembered');
  assert.equal(resolvePanelMaterial(plinth, unit, back, P, MATERIALS).material_id, 'm_oak');

  // One shape for all four: the same call answers for every group.
  for (const g of RUN_MATERIAL_GROUPS) {
    const set = withRunMaterial(design, g.id, { sameAsFronts: false, material_id: 'm_white' });
    assert.equal(runMaterialSetting(set, g.id).material_id, 'm_white');
    assert.equal(runMaterialSetting(set, g.id).sameAsFronts, false);
  }
});

test('F1.2 — backs and drawer boxes stay on the CARCASS (the owner\'s decision)', () => {
  const design = twoAndTwo();
  const unit = unitOn('BUD');
  const back = { id: 'BACK', part: 'BACK', role: 'back', material_role: 'board', thickness: 18 };
  const box = { id: 'D1-SL', part: 'DP', role: 'drawer_box', material_role: 'board', thickness: 12 };
  for (const p of [back, box]) {
    assert.equal(materialSlotOf(p, unit, design).kind, 'carcass', `${p.id} has no slot of its own`);
    assert.equal(resolvePanelMaterial(p, unit, design, P, MATERIALS).material_id, 'm_white');
  }
});

// ─── F1.3 — the element list tells the types apart ──────────────────────────

test('F1.3 — one row per FRONT TYPE, labelled, and matched by KEY', () => {
  const design = twoAndTwo();
  const choices = elementMaterialChoices(design, P, MATERIALS);
  const fronts = choices.filter((c) => c.kind === 'front');
  assert.equal(fronts.length, 2, 'never a single collapsed "front" row');
  assert.deepEqual(fronts.map((c) => c.key), ['front:f1', 'front:f2']);
  assert.match(fronts[0].label, /^Front 1 · /);
  assert.match(fronts[1].label, /^Front 2 · RAL 3005 Wine Red spray$/);
  // Hex per type, as the carcass rows already do.
  assert.equal(fronts[1].hex, '#b32428');
  for (const c of choices) assert.ok(Object.hasOwn(c, 'hex'), `${c.key} has a swatch`);

  // TWO IDENTICAL LABELS MUST STILL BE TWO DISTINCT CHOICES. This is the case
  // that makes matching on the label wrong, and it is not hypothetical: a
  // workshop running two fronts of the same board with different door styles
  // has exactly this.
  const twins = migrateDesign({
    fronts: {
      types: [
        { id: 'f1', label: 'Front 1', material_id: 'm_oak' },
        { id: 'f2', label: 'Front 2', material_id: 'm_oak' },
      ],
    },
  });
  const rows = elementMaterialChoices(twins, P, MATERIALS).filter((c) => c.kind === 'front');
  assert.equal(rows[0].material_label, rows[1].material_label, 'the same board is the same name');
  assert.notEqual(rows[0].key, rows[1].key, '…and still two choices');
  assert.equal(paletteEntryByKey(twins, P, 'front:f2').id, 'f2');
});

// ─── F1.4 — an override reaches the PICTURE ─────────────────────────────────

test('F1.4 — a shelf switched to Front 2 is Front 2\'s colour on screen', () => {
  const design = twoAndTwo();
  const unit = unitOn('BUD', {
    sections: [{ width_mm: 600, items: [{ id: 's1', kind: 'shelf', pos_mm: 400 }] }],
    element_overrides: null,
  });
  const before = resultOf(unit);
  const shelf = before.panels.find((p) => p.part === 'SHELF');
  assert.ok(shelf, 'the shelf is there');

  // No override: the shelf is the carcass, and the view paints the carcass.
  const plain = panelFinish(shelf, unit, design, P);
  assert.equal(plain.overridden, false);
  assert.equal(plain.finish?.hex, resolveFinishes(unit, design, P).carcass.hex);

  // Overridden to front type 2 — a wine-red spray — and the PICTURE follows.
  const painted = unitOn('BUD', {
    ...unit.params,
    element_overrides: { [shelf.id]: { material_key: 'front:f2', material_id: 'm_mdf', material_label: 'RAL 3005 Wine Red spray' } },
  });
  const after = resultOf(painted);
  const shelf2 = panelOf(after, shelf.id);
  assert.equal(shelf2.meta.material_key, 'front:f2', 'the key reaches the engine');

  const own = panelFinish(shelf2, painted, design, P);
  assert.equal(own.overridden, true);
  assert.equal(own.finish.kind, 'spray');
  assert.equal(own.finish.hex, '#b32428');
  assert.equal(own.colour.hex, '#b32428', 'and it is PAINT, so the view sprays it');
  assert.notEqual(own.finish.hex, plain.finish?.hex, 'the piece really did change colour');
});

test('F1.4 — the resolution is a pure function of (panel, unit, design, profile)', () => {
  // CLAUDE.md F1.4: "Engine stays pure … UnitView only consumes it."
  const design = twoAndTwo();
  const unit = unitOn('BUD');
  const door = { id: 'FRONT-1', part: 'FRONT', role: 'front', material_role: 'front', thickness: 18 };
  const a = panelFinish(door, unit, design, P);
  const b = panelFinish(door, unit, design, P);
  assert.deepEqual(a, b, 'same inputs, same answer, every time');
  assert.equal(typeof a.finish?.hex, 'string');
});

test('F1.4 — a cabinet wearing Front 2 wears its FACING too, not front 1\'s', () => {
  const design = migrateDesign({
    fronts: {
      types: [
        { id: 'f1', label: 'Front 1', source: 'spray', colour: { hex: '#ffffff', name: 'White', system: 'RAL' } },
        { id: 'f2', label: 'Front 2', source: 'laminate', finish_id: 'broken_white' },
      ],
    },
  });
  const onTwo = unitOn('BUD', { front_type_id: 'f2' });
  const onOne = unitOn('BUD', { front_type_id: 'f1' });
  assert.equal(resolveFinishes(onTwo, design, P).front.label, 'Broken white');
  assert.equal(resolveFinishes(onOne, design, P).front.kind, 'spray');
});

// ─── F1.5 — one source downstream ───────────────────────────────────────────

test('F1.5 — two fronts on different boards are TWO BOM material groups', () => {
  const design = twoAndTwo();
  const a = unitOn('BUD', { front_type_id: 'f1', unit_num: '01' });
  const b = { ...unitOn('BUD', { front_type_id: 'f2', unit_num: '02' }), id: 'u_b' };
  const bom = buildBom(
    [{ unit: a, result: resultOf(a) }, { unit: b, result: resultOf(b) }],
    { design, profile: P, materials: MATERIALS },
  );
  const fronts = bom.units.flatMap((u) => u.rows).filter((r) => r.material_role === 'front');
  const groups = new Set(fronts.map((r) => r.material_key));
  assert.equal(groups.size, 2, 'oak-laminate doors and wine-red sprayed doors are two boards');
  assert.ok(groups.has('mat:m_oak') && groups.has('mat:m_mdf'));

  // …and two fronts on the SAME board are one group, which is the other half of
  // the owner's sentence.
  const same = migrateDesign({
    fronts: {
      types: [
        { id: 'f1', label: 'Front 1', material_id: 'm_oak' },
        { id: 'f2', label: 'Front 2', material_id: 'm_oak' },
      ],
    },
  });
  const joined = buildBom(
    [{ unit: a, result: resultOf(a) }, { unit: b, result: resultOf(b) }],
    { design: same, profile: P, materials: MATERIALS },
  );
  const keys = new Set(joined.units.flatMap((u) => u.rows)
    .filter((r) => r.material_role === 'front').map((r) => r.material_key));
  assert.equal(keys.size, 1, 'one board, one group');
});

test('F1.5 — an override MOVES a part between groups', () => {
  const design = twoAndTwo();
  const base = unitOn('BUD', {
    sections: [{ width_mm: 600, items: [{ id: 's1', kind: 'shelf', pos_mm: 400 }] }],
  });
  const shelfId = resultOf(base).panels.find((p) => p.part === 'SHELF').id;
  const before = buildBom([{ unit: base, result: resultOf(base) }], { design, profile: P, materials: MATERIALS });
  const rowBefore = before.units[0].rows.find((r) => r.id === shelfId);
  assert.equal(rowBefore.material_key, 'mat:m_white', 'a shelf is carcass board');

  const moved = unitOn('BUD', {
    ...base.params,
    element_overrides: { [shelfId]: { material_key: 'front:f2', material_id: 'm_mdf', material_label: 'RAL 3005 Wine Red spray' } },
  });
  const after = buildBom([{ unit: moved, result: resultOf(moved) }], { design, profile: P, materials: MATERIALS });
  const rowAfter = after.units[0].rows.find((r) => r.id === shelfId);
  assert.equal(rowAfter.material_key, 'mat:m_mdf', 'and now it is on the fronts\' MDF');
  assert.equal(rowAfter.material_label, 'RAL 3005 Wine Red spray');
});

test('F1.5 — the BOM keeps naming an ordinary job exactly as it did', () => {
  // The whole material model landed under this: a project that has assigned
  // nothing still prints the profile's own finish names, which is what every
  // cut list before this turn said.
  const unit = unitOn('BUD');
  const bom = buildBom([{ unit, result: resultOf(unit) }], { design: {}, profile: P });
  for (const row of bom.units[0].rows) {
    assert.ok(row.material_label, `${row.id} is named`);
  }
  assert.equal(bom.units[0].rows.find((r) => r.part === 'BUL').material_label, 'Broken white');
});

test('F1.1 — CHECK-OUT refuses placeholders, on every slot the project assigns', () => {
  const design = migrateDesign({
    carcass: { types: [{ id: 'c1', label: 'Carcass 1', material_id: 'm_white' }] },
    fronts: { types: [{ id: 'f1', label: 'Front 1', material_id: 'm_generic' }] },
  });
  const offenders = placeholderAssignments(design, P, MATERIALS);
  assert.equal(offenders.length, 1);
  assert.equal(offenders[0].slot, 'front:f1');

  // …and a run piece on its own placeholder is caught too.
  const withRun = withRunMaterial(design, 'plinth', { sameAsFronts: false, material_id: 'm_generic' });
  assert.equal(placeholderAssignments(withRun, P, MATERIALS).length, 2);
  // A run piece FOLLOWING the fronts is not a second offence: it is the front's.
  const following = withRunMaterial(withRun, 'plinth', { sameAsFronts: true });
  assert.equal(placeholderAssignments(following, P, MATERIALS).length, 1);
});

// ─── F2 — the CNC sheet groups by ASSIGNED MATERIAL ─────────────────────────

test('F2.1 — three materials in the project are three groups', () => {
  const design = twoAndTwo();
  const unit = unitOn('BUD', { plinth: true, front_type_id: 'f1' });
  const result = resultOf(unit);
  const entries = [{ unit, result, panels: result.panels.filter((p) => p.cnc) }];
  const sections = groupByMaterial(entries, { design, profile: P, materials: MATERIALS });

  const keys = sections.map((s) => s.key).sort();
  assert.deepEqual(keys, ['mat:m_oak', 'mat:m_white'],
    'the carcass board and the fronts\' board — the plinth follows the fronts');

  // Give the plinth its own board and there are three.
  const three = withRunMaterial(design, 'plinth', { sameAsFronts: false, material_id: 'm_mdf' });
  const split = groupByMaterial(entries, { design: three, profile: P, materials: MATERIALS });
  assert.equal(split.length, 3, 'three materials in the project = three groups');
  const plinthSection = split.find((s) => s.material_id === 'm_mdf');
  assert.ok(plinthSection.units[0].panels.every((p) => p.role === 'plinth'));
});

test('F2.1 — identity is the material_id: never the colour, never the finish kind', () => {
  // Two front types on ONE board, sprayed two different colours. One section:
  // it is one board on the bed of the machine.
  const design = migrateDesign({
    carcass: { types: [{ id: 'c1', label: 'Carcass 1', material_id: 'm_white' }] },
    fronts: {
      types: [
        { id: 'f1', label: 'Front 1', source: 'spray', colour: { hex: '#111111', name: 'Black', system: 'RAL' }, material_id: 'm_mdf' },
        { id: 'f2', label: 'Front 2', source: 'spray', colour: { hex: '#eeeeee', name: 'White', system: 'RAL' }, material_id: 'm_mdf' },
      ],
    },
  });
  const a = unitOn('BUD', { front_type_id: 'f1', unit_num: '01' });
  const b = { ...unitOn('BUD', { front_type_id: 'f2', unit_num: '02' }), id: 'u_b' };
  const entries = [a, b].map((u) => {
    const result = resultOf(u);
    return { unit: u, result, panels: result.panels.filter((p) => p.material_role === 'front' && p.cnc) };
  });
  const sections = groupByMaterial(entries, { design, profile: P, materials: MATERIALS });
  assert.equal(sections.length, 1, 'two colours, one board, one section');
  assert.equal(sections[0].label, 'MDF-18 · MDF 18', 'headed as the BOM names the board');
});

test('F2.1 — a board cut at two thicknesses is still ONE board', () => {
  // Turn 15 split on thickness; a stock item has one thickness, so that could
  // only ever split a board away from itself. CLAUDE.md F2.1: three materials
  // in the project = three groups.
  const design = twoAndTwo();
  const unit = unitOn('BUD');
  const thin = { id: 'A', role: 'side', material_role: 'board', thickness: 18 };
  const thick = { id: 'B', role: 'side', material_role: 'board', thickness: 25 };
  assert.equal(
    materialSection(thin, { unit, design, profile: P, materials: MATERIALS }).key,
    materialSection(thick, { unit, design, profile: P, materials: MATERIALS }).key,
  );
});

test('F2.2 — a run piece following the fronts lands in front type 1\'s group', () => {
  const design = twoAndTwo();
  const unit = unitOn('BUD', { plinth: true, side_infill_left_mm: 60 });
  const result = resultOf(unit);
  const entries = [{ unit, result, panels: result.panels.filter((p) => p.cnc) }];
  const sections = groupByMaterial(entries, { design, profile: P, materials: MATERIALS });
  const fronts = sections.find((s) => s.material_id === 'm_oak');
  const roles = new Set(fronts.units[0].panels.map((p) => p.role));
  assert.ok(roles.has('plinth'), 'the plinth is on the fronts\' sheet');
  assert.ok(roles.has('infill'), '…and so is the filler');
});

test('F2.1 — an UNASSIGNED slot is honest rather than invented', () => {
  const bare = migrateDesign({});
  const unit = unitOn('BUD');
  const section = materialSection({ role: 'side', material_role: 'board', thickness: 18 }, {
    unit, design: bare, profile: P, materials: MATERIALS,
  });
  assert.equal(section.assigned, false);
  assert.match(section.label, /18 mm/);
});

test('F2.1 — the sprayed/non-sprayed toggle is gone from the VIEW and kept in the EXPORT', () => {
  // Removed from the sheet (F2.1) — and NOT from engine/cnc/groups.js, because
  // the export names its files after these presets and rule 0 pins that to the
  // byte (test/cnc-export-identity.test.js).
  assert.deepEqual(VIEW_PRESETS.map((p) => p.id), ['all', 'fronts']);
  assert.ok(EXPORT_PRESETS.some((p) => p.id === 'sprayed'));
  assert.ok(EXPORT_PRESETS.some((p) => p.id === 'non-sprayed'));
});

// ─── the store, end to end ─────────────────────────────────────────────────

test('F1 — the STORE writes a front board and a run board, and the sheet follows', () => {
  store().loadProject({
    id: null, name: 't16-material', room: migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) }), design: {},
  }, []);
  store().setFrontTypes(2);
  store().setFrontMaterial('f1', 'm_oak');
  store().setFrontMaterial('f2', 'm_mdf');
  store().setCarcassMaterial('c1', 'm_white');
  const design = store().project.design;
  assert.equal(migrateDesign(design).fronts.types[0].material_id, 'm_oak');
  assert.equal(migrateDesign(design).fronts.types[1].material_id, 'm_mdf');

  store().setRunMaterial('plinth', { sameAsFronts: false, material_id: 'm_white' });
  assert.deepEqual(runMaterialSetting(store().project.design, 'plinth'),
    { sameAsFronts: false, material_id: 'm_white' });

  const { id } = store().addUnit('BUD');
  store().addPlinth(id);
  const unit = store().units.find((u) => u.id === id);
  const result = computeCabinet(paramsForEngine(unit), P);
  const plinth = result.panels.find((p) => p.role === 'plinth');
  assert.ok(plinth, 'the plinth is cut');
  assert.equal(
    resolvePanelMaterial(plinth, unit, store().project.design, P, MATERIALS).material_id,
    'm_white',
    'and it comes off the board the project assigned it',
  );
});
