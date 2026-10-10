// ─── T75 · F12 · THE APPLIANCE TOWER, ONE KIT, PARENT KIT_FRIDGE ───────────
//
// CLAUDE.md T75 F12: *"`APPLIANCE_TALL` in `engine/types.js`, copied field by
// field from `FRIDGE` (`lisp: 'KIT_FRIDGE.lsp'`, `widthFixed`, tall, legs,
// `carcass.back: 'rails'`), with `apertures: [...]` read from its defaults
// block: each aperture `{ role, h }` cuts KIT_FRIDGE's own aperture pattern
// (the back rails, the fixed panel, the spurs panel on its blocks) at that
// height, and the test asserts a one-aperture tower hole for hole against
// FRIDGE at the same numbers. Cupboard space above or below an aperture takes
// a door through the existing path; the appliance itself shows no front (the
// machine is the face), BOM line + GLB slot (the Blum pattern)."*
//
// The PROBE (verify/t75/p04-probe.md) rows that matter are asserted here: the
// FRIDGE fields, its 97 holes and Table A boards, the rail rule of Table C,
// and the six goldens out of reach.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import {
  UNIT_TYPES, UNIT_NUM_PREFIX, UNIT_TYPE_ORDER, defaultParamsFor, categoryOf,
} from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { KITCHEN_LIBRARY, libraryTypeIds, resolveEntry } from '../src/engine/library.js';
import { HARDWARE_TO_PART_ID, PART_REGISTRY } from '../src/engine/partRegistry.js';
import { apertureStack, resolveApertures } from '../src/engine/applianceTower.js';
import { buildBom } from '../src/engine/bom.js';
import { wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { goldenOf } from '../scripts/t75-golden.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const S = () => useProjectStore.getState();
const U = (id) => S().units.find((u) => u.id === id);
const G = P.board.thickness;
const holes = (r) => r.drills.map((d) => `${d.panel}|${d.layer}|${d.kind}|${d.x}|${d.y}|${d.d}`).sort();
const boards = (r) => r.panels.map((x) => [x.id, x.part, x.role, x.w, x.h, JSON.stringify(x.box)]);
const TOWERS = ['APPLIANCE_TALL', 'APPLIANCE_TALL2'];

test('F12 · PROBE: each tower is FRIDGE field by field, plus `applianceTower`, never `appliance`', () => {
  const f = UNIT_TYPES.FRIDGE;
  for (const id of TOWERS) {
    const t = UNIT_TYPES[id];
    for (const key of ['widthFixed', 'heightGroup', 'family', 'lisp', 'hingeRule', 'cupRule', 'legs', 'legSource',
      'hangers', 'doorExtend', 'mount', 'drawerStyle', 'minHeightKey', 'available']) {
      assert.deepEqual(t[key], f[key], `${id}.${key} is not FRIDGE's`);
    }
    assert.deepEqual(t.carcass, { top: 'panel', back: 'rails' });
    assert.deepEqual(t.supports, f.supports);
    assert.equal(t.applianceTower, true);
    // `appliance: 'oven'` cuts OVEN_BASE's shelf and shortens a BUDR stack: a
    // geometry switch, not a label (PROBE, cabinet.js ovenShelfY).
    assert.equal(t.appliance, undefined);
    assert.equal(UNIT_NUM_PREFIX[id], 'AT');
    assert.ok(UNIT_TYPE_ORDER.includes(id));
    assert.equal(categoryOf(id)?.id, 'kitchen');
  }
});

test('F12 · the numbers: the oven and the fridge read where they live; microwave, washer, dryer proposed', () => {
  const roles = P.applianceTall.roles;
  assert.equal(roles.oven.hKey, 'ovenUnit.ovenHeight');
  assert.equal(P.ovenUnit.ovenHeight, 595, 'the owner\'s own oven, T17');
  assert.equal(roles.fridge.hKey, 'fridgeUnit.defaults.fridgeH');
  assert.deepEqual([roles.microwave.h, roles.washer.h, roles.dryer.h], [450, 850, 850]);
  assert.deepEqual(resolveApertures([{ role: 'oven' }, { role: 'microwave' }, { role: 'fridge' }], P),
    [{ role: 'oven', h: 595 }, { role: 'microwave', h: 450 }, { role: 'fridge', h: 1786 }]);
  const src = readFileSync(`${ROOT}src/engine/profile.js`, 'utf8');
  const at = src.indexOf('  applianceTall: {');
  const block = src.slice(at, src.indexOf('\n  },\n', at));
  for (const role of ['microwave', 'washer', 'dryer']) {
    assert.match(block, new RegExp(`${role}: \\{[^\\n]*// T75 proposed, owner to confirm`), `${role} is not marked proposed`);
  }
  for (const row of ['fridgeFreezer', 'washerDryer']) {
    assert.match(block, new RegExp(`${row}: \\{\\n[^\\n]*// T75 proposed, owner to confirm`), `${row} is not marked proposed`);
    // A proposed number never becomes a typed field: no defaults block carries
    // `fridgeH`, which the right panel offers as "Fridge height".
    assert.equal(P.applianceTall[row].defaults.fridgeH, undefined);
  }
  // Save and reload of a profile: the block is merged key by key.
  const m = migrateCabinetProfile({ ...P, applianceTall: { roles: { washer: { h: 820 } } } });
  assert.equal(m.applianceTall.roles.washer.h, 820);
  assert.equal(m.applianceTall.roles.washer.face, 'machine');
  assert.equal(m.applianceTall.roles.dryer.h, 850);
  assert.deepEqual(m.applianceTall.washerDryer.defaults, P.applianceTall.washerDryer.defaults);
});

test('F12 · ONE APERTURE IS FRIDGE, hole for hole: 97 holes, Table A board for board, the drill summary', () => {
  const f = { ...defaultParamsFor('FRIDGE', P), unit_num: '01', doors: true };
  const t = {
    ...defaultParamsFor('APPLIANCE_TALL', P), unit_num: '01', doors: true, width: f.width, height: f.height, depth: f.depth,
  };
  assert.deepEqual(t.apertures, [{ role: 'fridge', h: f.fridge_h }]);
  const a = computeCabinet(f, P);
  const b = computeCabinet(t, P);
  assert.equal(a.drills.length, 97, 'PROBE Table B: FRIDGE drills 97');
  assert.deepEqual(holes(b), holes(a), 'the tower is not drilled as FRIDGE');
  assert.deepEqual(boards(b), boards(a), 'the tower\'s boards are not FRIDGE\'s');
  assert.deepEqual(b.drillSummary, a.drillSummary);
  // PROBE Table A, the boards FRIDGE cuts at its defaults.
  assert.deepEqual(b.panels.map((x) => x.id), ['BUL', 'BUR', 'TOP', 'BOTTOM', 'FIXED', 'RAIL1', 'RAIL2', 'BACK', 'SPURS', '01-F']);
  assert.equal(b.panels.find((x) => x.id === 'FIXED').box.y, 1804);
  assert.equal(b.panels.find((x) => x.id === 'RAIL2').box.y, 955);
  assert.deepEqual(b.warnings, []);
  // The fridge freezer hides behind KIT_FRIDGE's own door: no machine face.
  assert.equal(b.derived.door_base_y, 0);
  // …and the machine is bought: one order line, which FRIDGE never had.
  assert.equal(a.hardware.some((h) => h.role === 'appliance'), false);
  const line = b.hardware.filter((h) => h.role === 'appliance');
  assert.equal(line.length, 1);
  assert.equal(line[0].label, 'Fridge freezer');
  assert.equal(line[0].spec.aperture_height_mm, 1786);
});

test('F12 · two apertures: the washer on the bottom panel, the dryer on its FIXED, KIT_FRIDGE\'s back over the top', () => {
  const p = { ...defaultParamsFor('APPLIANCE_TALL2', P), unit_num: '01', doors: true };
  assert.deepEqual(p.apertures, [{ role: 'washer', h: 850 }, { role: 'dryer', h: 850 }]);
  const r = computeCabinet(p, P);
  const byId = (id) => r.panels.find((x) => x.id === id);
  // PROBE Table C, "Washer + dryer": the top FIXED at 1736, the lower at 868, clean.
  assert.equal(byId('FIXED1').box.y, G + 850);
  assert.equal(byId('FIXED').box.y, G + 850 + G + 850);
  assert.deepEqual([byId('FIXED1').w, byId('FIXED1').h], [byId('FIXED').w, byId('FIXED').h], 'the same board');
  assert.equal(byId('FIXED1').part, 'FIXED');
  assert.deepEqual(r.warnings, []);
  // The rest is KIT_FRIDGE at `fridgeH` = the stack: rails on their tenons,
  // the back and the spurs over the top fixed panel.
  const f = computeCabinet({
    ...defaultParamsFor('FRIDGE', P), unit_num: '01', doors: true, height: p.height, fridge_h: 850 + G + 850,
  }, P);
  for (const id of ['BUL', 'BUR', 'TOP', 'BOTTOM', 'FIXED', 'RAIL1', 'RAIL2', 'BACK', 'SPURS']) {
    const mine = byId(id);
    const its = f.panels.find((x) => x.id === id);
    assert.deepEqual([mine.w, mine.h, mine.box], [its.w, its.h, its.box], `${id} is not KIT_FRIDGE's at the stack's height`);
  }
  // The lower FIXED is screwed as the top one is: two screws a side, on its centreline.
  for (const side of ['BUL', 'BUR']) {
    const fixed = r.drills.filter((d) => d.panel === side && d.kind === 'fixed_screw');
    assert.deepEqual(fixed.map((d) => d.y).sort((x, y) => x - y), [868 + G / 2, 868 + G / 2, 1736 + G / 2, 1736 + G / 2]);
    // Every other hole on the side is FRIDGE's at that height, hinges apart.
    const others = (res) => res.drills.filter((d) => d.panel === side && !['fixed_screw', 'hinge'].includes(d.kind))
      .map((d) => `${d.kind}|${d.x}|${d.y}`).sort();
    assert.deepEqual(others(r), others(f), `${side} is not KIT_FRIDGE's`);
  }
  // No machine is drilled for: the panels the tower adds carry no hole.
  assert.equal(r.drills.filter((d) => d.panel === 'FIXED1').length, 0);
});

test('F12 · the machine is the face: the one door starts on the dryer, on the low ladder over its own height', () => {
  const p = { ...defaultParamsFor('APPLIANCE_TALL2', P), unit_num: '01', doors: true };
  const r = computeCabinet(p, P);
  const doors = r.panels.filter((x) => x.role === 'front');
  assert.equal(doors.length, 1, 'one door, through the existing path');
  const door = doors[0];
  assert.equal(door.box.y, 1736, 'the door starts where the dryer stops');
  assert.equal(door.h, p.height - P.doors.gap - 1736);
  assert.equal(r.derived.door_base_y, 1736);
  // Two hinges on a 411 door, lifted onto the machine; the cups on the door
  // measured from its own bottom edge (the overlay door's grammar).
  assert.deepEqual(r.drillSummary.hinge_centers, [1736 + 100, 1736 + door.h - 100]);
  assert.deepEqual(r.drills.filter((d) => d.kind === 'cup').map((d) => d.y), [100, door.h - 100]);
  // No front over either machine.
  assert.ok(doors.every((d) => d.box.y >= 1736));
  // The BOM: two order lines, each to its aperture, and no hole for either.
  const lines = r.hardware.filter((h) => h.role === 'appliance');
  assert.deepEqual(lines.map((h) => [h.label, h.spec.role, h.spec.aperture_height_mm, h.spec.floor_y_mm]),
    [['Washing machine', 'washer', 850, G], ['Tumble dryer', 'dryer', 850, 868 + G]]);
  assert.equal(HARDWARE_TO_PART_ID.appliance, 'appliance');
  assert.equal(PART_REGISTRY.appliance.materialType, 'hardware');
});

test('F12 · the oven rows are held because KIT_FRIDGE refuses them: an oven on the bottom panel meets the middle rail', () => {
  // PROBE Table C: oven 595 stacked on the bottom panel puts the top FIXED at
  // 613, under RAIL2 (980..1180 at 2150), and the back over it would cross
  // the rail. The kit says so in words, and the library does not offer it.
  const r = computeCabinet({
    ...defaultParamsFor('APPLIANCE_TALL2', P), unit_num: '01', doors: true, apertures: [{ role: 'oven' }],
  }, P);
  const w = r.warnings.find((x) => x.code === 'FRIDGE_RAIL_MEETS_FIXED_PANEL');
  assert.ok(w, 'the rail rule did not fire');
  assert.match(w.message, /stack's top fixed panel at 613 mm/);
  assert.ok(!/[\u2013\u2014]/.test(w.message), 'a dash in the sentence');
  const tall = KITCHEN_LIBRARY.find((g) => g.id === 'tall-units').items;
  for (const id of ['oven-tall', 'oven-microwave']) {
    const row = tall.find((e) => e.id === id);
    assert.equal(row.kind, 'soon');
    assert.match(resolveEntry(row, P).reason, /two door zones on one face/);
  }
});

test('F12 · the library: four rows in Tall units, two of them a kit; the small fridge is the D/W panel', () => {
  const tall = KITCHEN_LIBRARY.find((g) => g.id === 'tall-units').items;
  const labels = tall.map((e) => e.label);
  for (const l of ['Oven tall', 'Oven + microwave', 'Fridge freezer', 'Washer + dryer']) assert.ok(labels.includes(l), l);
  assert.equal(tall.find((e) => e.label === 'Fridge freezer').typeId, 'APPLIANCE_TALL');
  assert.equal(tall.find((e) => e.label === 'Washer + dryer').typeId, 'APPLIANCE_TALL2');
  const base = KITCHEN_LIBRARY.find((g) => g.id === 'base-units').items;
  const small = base.find((e) => e.id === 'small-fridge');
  assert.equal(small.kind, 'type');
  assert.equal(small.typeId, 'DW_PANEL');
  assert.match(small.hint, /D\/W panel's fridge front/);
  assert.equal(resolveEntry(small, P).enabled, true);
  assert.equal(libraryTypeIds().filter((id) => id === 'DW_PANEL').length, 1, 'one kit, named once');
});

function towerJob() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const r = S().addUnit('APPLIANCE_TALL2');
  return r.id;
}

test('F12 · the six stations: placed by the store, cut, ordered, drawn, saved and reloaded', () => {
  const id = towerJob();
  const u = U(id);
  assert.ok(u, 'addUnit did not place it');
  assert.equal(u.params.unit_num, 'AT01');
  assert.deepEqual(u.params.apertures, [{ role: 'washer', h: 850 }, { role: 'dryer', h: 850 }]);
  // Construction: the store's own result, the project's tall height.
  const r = S().unitResult(id);
  assert.ok(r.panels.some((x) => x.id === 'FIXED1'));
  assert.deepEqual(r.warnings.filter((w) => /FRIDGE/.test(w.code)), []);
  // BOM: the machines are order lines.
  const bom = buildBom(S().allResults(), { design: S().project.design, profile: P });
  assert.deepEqual(bom.hardware.filter((h) => h.role === 'appliance').map((h) => h.label).sort(),
    ['Tumble dryer', 'Washing machine']);
  // Drawing: the T71 set builds a sheet for the run and does not refuse it.
  const sheets = wallDrawingSheets({
    entries: S().allResults(), project: { name: 'T75 F12' }, room: S().project.room, profile: P, date: '09.10.2026',
  });
  assert.ok(sheets.length > 0, 'the drawing set refused the tower');
  // Save and reload: the stack rides the unit and cuts the same.
  const saved = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
  S().newProject();
  S().loadProject(saved.project, saved.units);
  assert.deepEqual(U(id).params.apertures, u.params.apertures);
  assert.deepEqual(holes(S().unitResult(id)), holes(r));
});

test('F12 · the GLB slot: one per aperture, declared with its reason, nothing drawn', () => {
  const hw = readFileSync(`${ROOT}src/3d/Hardware.jsx`, 'utf8');
  const at = hw.indexOf('export function ApplianceSlots');
  assert.ok(at > 0);
  const body = hw.slice(at, hw.indexOf('\n}\n', at));
  assert.match(body, /reportHardware\(surface, 'appliance'/);
  assert.match(body, /model: false/);
  assert.match(body, /reason: 'no model uploaded yet'/);
  assert.match(body, /return null;/);
  assert.ok(!/<mesh|Geometry/.test(body), 'a stand-in machine got drawn');
  const view = readFileSync(`${ROOT}src/3d/UnitView.jsx`, 'utf8');
  assert.match(view, /<ApplianceSlots/);
});

test('F12 · the stack arithmetic, and nothing for a kit that is not a tower', () => {
  const s = apertureStack([{ role: 'washer', h: 850 }, { role: 'dryer', h: 850 }], G, P);
  assert.deepEqual(s.rows.map((x) => [x.floorY, x.fixedY, x.face]), [[18, 868, 'machine'], [886, 1736, 'machine']]);
  assert.equal(s.fridgeH, 1718);
  assert.equal(s.doorBase, 1736);
  assert.equal(apertureStack([], G, P), null);
  // An aperture whose role nobody knows and which names no height is dropped.
  assert.deepEqual(resolveApertures([{ role: 'jacuzzi' }, { role: 'washer' }], P), [{ role: 'washer', h: 850 }]);
  // FRIDGE given a list cuts nothing new: the gate is the KIT.
  const f = { ...defaultParamsFor('FRIDGE', P), unit_num: '01', doors: true };
  assert.deepEqual(holes(computeCabinet({ ...f, apertures: [{ role: 'washer' }, { role: 'dryer' }] }, P)), holes(computeCabinet(f, P)));
});

test('F12 · two goldens of their own, byte for byte', () => {
  for (const [file, type] of [['golden-appliance-tall.json', 'APPLIANCE_TALL'], ['golden-appliance-tall2.json', 'APPLIANCE_TALL2']]) {
    const g = JSON.parse(readFileSync(`${ROOT}fixtures/${file}`, 'utf8'));
    assert.equal(g.params.type, type);
    assert.deepEqual(goldenOf(g.params, P), g.expected, `${file} moved`);
  }
});
