// ─── T75 · F13 · THE BASE UNIT WITH DRAWERS BEHIND ITS DOORS ───────────────
//
// CLAUDE.md T75 F13, verbatim: *"`BUD_INT`: `BUD` with `drawerStyle:
// 'wardrobe'`, `internalDrawers: 'all'`, `supports.drawers: true` (PANTRY's own
// two lines at base height), the T33 F6 door setback for drawers behind doors
// applied as it is in a wardrobe. Test hole for hole against PANTRY's drawer
// rows at the same numbers. Library Base units "Drawers behind doors". Prefix
// `BI`."*
//
// PANTRY asked at 770 is raised to its 1100 minimum (PROBE F13), so "the same
// numbers" is the DRAWER MACHINERY, which is measured from the carcass floor
// and does not move with the height: runner rows, DP and partition screws,
// the boxes, the DP panel, the fillers and the partition over the stack.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import {
  UNIT_TYPES, UNIT_NUM_PREFIX, UNIT_TYPE_ORDER, defaultParamsFor, categoryOf,
} from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { KITCHEN_LIBRARY } from '../src/engine/library.js';
import { buildBom } from '../src/engine/bom.js';
import { wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { goldenOf } from '../scripts/t75-golden.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const S = () => useProjectStore.getState();
const U = (id) => S().units.find((u) => u.id === id);
const MACHINERY_KINDS = ['runner', 'dp_screw', 'partition_screw', 'partition_foot_screw'];
const MACHINERY_PANELS = /^(D\d+-|DP|FILLER|PARTITION)/;
const machinery = (r) => ({
  holes: r.drills.filter((d) => MACHINERY_KINDS.includes(d.kind))
    .map((d) => `${d.panel}|${d.layer}|${d.kind}|${d.x}|${d.y}|${d.d}`).sort(),
  boards: r.panels.filter((p) => MACHINERY_PANELS.test(p.id))
    .map((p) => [p.id, p.part, p.w, p.h, p.thickness, JSON.stringify(p.box)]),
});
const allHoles = (r) => r.drills.map((d) => `${d.panel}|${d.layer}|${d.kind}|${d.x}|${d.y}|${d.d}`).sort();

test('F13 · BUD field by field, plus PANTRY\'s two lines and its drawers', () => {
  const t = UNIT_TYPES.BUD_INT;
  const bud = UNIT_TYPES.BUD;
  for (const key of ['heightGroup', 'family', 'lisp', 'hingeRule', 'cupRule', 'legs', 'legSource', 'hangers',
    'doorExtend', 'mount', 'minHeightKey', 'available']) {
    assert.deepEqual(t[key], bud[key], `BUD_INT.${key} is not BUD's`);
  }
  assert.deepEqual(t.carcass, bud.carcass);
  assert.deepEqual(t.supports, { ...bud.supports, drawers: true });
  // PANTRY's own two lines.
  assert.equal(t.drawerStyle, UNIT_TYPES.PANTRY.drawerStyle);
  assert.equal(t.internalDrawers, UNIT_TYPES.PANTRY.internalDrawers);
  assert.equal(UNIT_NUM_PREFIX.BUD_INT, 'BI');
  assert.ok(UNIT_TYPE_ORDER.includes('BUD_INT'));
  assert.equal(categoryOf('BUD_INT')?.id, 'kitchen');
});

test('F13 · the defaults: two drawers, not the pantry\'s three, and marked proposed', () => {
  assert.deepEqual(P.baseInternalDrawerUnit.defaults, { width: 600, height: 770, depth: 558, drawers: 2 });
  assert.equal(defaultParamsFor('BUD_INT', P).drawers, 2);
  const src = readFileSync(`${ROOT}src/engine/profile.js`, 'utf8');
  const at = src.indexOf('  baseInternalDrawerUnit: {');
  assert.match(src.slice(at, at + 200), /T75 proposed, owner to confirm/);
  // PROBE F13: at 770 three default fronts break the 200 mm zone headroom.
  const three = computeCabinet({ ...defaultParamsFor('BUD_INT', P), unit_num: '01', doors: true, drawers: 3 }, P);
  assert.ok(three.warnings.some((w) => w.code === 'DRAWERS_TOO_TALL'));
  assert.deepEqual(computeCabinet({ ...defaultParamsFor('BUD_INT', P), unit_num: '01', doors: true }, P).warnings, []);
  // Save and reload of a profile merges the block key by key.
  const m = migrateCabinetProfile({ ...P, baseInternalDrawerUnit: { defaults: { drawers: 1 } } });
  assert.deepEqual(m.baseInternalDrawerUnit.defaults, { width: 600, height: 770, depth: 558, drawers: 1 });
});

test('F13 · empty, it is BUD hole for hole', () => {
  const p = { ...defaultParamsFor('BUD_INT', P), unit_num: '01', doors: true, drawers: 0 };
  const q = { ...defaultParamsFor('BUD', P), unit_num: '01', doors: true };
  const a = computeCabinet(p, P);
  const b = computeCabinet(q, P);
  assert.deepEqual(allHoles(a), allHoles(b));
  assert.deepEqual(a.panels.map((x) => [x.id, x.w, x.h]), b.panels.map((x) => [x.id, x.w, x.h]));
});

test('F13 · its drawer rows are PANTRY\'s, hole for hole, at the same numbers', () => {
  for (const drawers of [1, 2]) {
    for (const width of [600, 900]) {
      const a = computeCabinet({
        ...defaultParamsFor('BUD_INT', P), unit_num: '01', doors: true, drawers, width,
      }, P);
      const b = computeCabinet({
        ...defaultParamsFor('PANTRY', P), unit_num: '01', doors: true, drawers, width, depth: 558,
      }, P);
      const ma = machinery(a);
      const mb = machinery(b);
      assert.ok(ma.holes.length > 0, 'no drawer machinery cut');
      assert.deepEqual(ma.holes, mb.holes, `${drawers} drawers at ${width}: the holes are not PANTRY's`);
      assert.deepEqual(ma.boards, mb.boards, `${drawers} drawers at ${width}: the boards are not PANTRY's`);
    }
  }
  // PROBE F13: 27 holes of machinery at two drawers.
  assert.equal(machinery(computeCabinet({ ...defaultParamsFor('BUD_INT', P), unit_num: '01', doors: true }, P)).holes.length, 27);
});

test('F13 · behind its door: no drawer front, the DP panel and fillers on the hinged side, the box set back', () => {
  const p = { ...defaultParamsFor('BUD_INT', P), unit_num: '01', doors: true };
  const r = computeCabinet(p, P);
  assert.equal(r.panels.filter((x) => x.part === 'DRAWER-FRONT').length, 0, 'a drawer behind a door has no face');
  assert.equal(r.panels.filter((x) => x.role === 'front').length, 1, 'the one door, through the existing path');
  const hinge = r.panels.find((x) => x.role === 'front').meta.hinge;
  assert.ok(r.panels.some((x) => x.id === (hinge === 'L' ? 'DP-L' : 'DP-R')), 'no DP panel on the hinged side');
  assert.equal(r.panels.filter((x) => x.id.startsWith('FILLER')).length, 2);
  // The T33 F6 setback: the box front face stands D - setback - front.
  const bf = r.panels.find((x) => x.id === 'D1-BF');
  assert.equal(bf.box.z + bf.box.d, p.depth - P.wardrobe.drawers.setback - p.front_t);
  // Doors off: no DP, no filler, as in a wardrobe.
  const open = computeCabinet({ ...p, doors: false }, P);
  assert.equal(open.panels.some((x) => x.id.startsWith('DP') || x.id.startsWith('FILLER')), false);
  // Ordered: the runners, by the hardware law.
  assert.equal(r.hardware.find((h) => h.role === 'runner_pairs').qty, 2);
});

test('F13 · the library row, and the six stations through the store', () => {
  const base = KITCHEN_LIBRARY.find((g) => g.id === 'base-units').items;
  const row = base.find((e) => e.typeId === 'BUD_INT');
  assert.equal(row.label, 'Drawers behind doors');
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const { id } = S().addUnit('BUD_INT');
  assert.equal(U(id).params.unit_num, 'BI01');
  // In a project the drawers are the section's items (`paramsForEngine`), as a
  // PANTRY's are: the client adds them through the existing Add items path.
  S().addDoors(id);
  S().addDrawers(id, 2, 'internal');
  const r = S().unitResult(id);
  assert.equal(r.panels.filter((x) => /^D\d+-DNO$/.test(x.id)).length, 2, 'the drawers were not cut');
  assert.equal(r.panels.filter((x) => x.part === 'DRAWER-FRONT').length, 0, 'a drawer behind a door got a face');
  assert.ok(r.panels.some((x) => x.id.startsWith('DP')), 'no DP panel behind the door');
  const bom = buildBom(S().allResults(), { design: S().project.design, profile: P });
  assert.ok(bom.hardware.some((h) => h.role === 'runner_pairs'));
  const sheets = wallDrawingSheets({
    entries: S().allResults(), project: { name: 'T75 F13' }, room: S().project.room, profile: P, date: '09.10.2026',
  });
  assert.ok(sheets.length > 0, 'the drawing set refused it');
  const saved = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
  S().newProject();
  S().loadProject(saved.project, saved.units);
  assert.equal(U(id).type, 'BUD_INT');
  assert.deepEqual(allHoles(S().unitResult(id)), allHoles(r));
});

test('F13 · a golden of its own, byte for byte', () => {
  const g = JSON.parse(readFileSync(`${ROOT}fixtures/golden-bud-int.json`, 'utf8'));
  assert.equal(g.params.type, 'BUD_INT');
  assert.deepEqual(goldenOf(g.params, P), g.expected);
});
