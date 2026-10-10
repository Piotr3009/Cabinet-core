// ─── T75 · F14 · THE HOB UNIT ──────────────────────────────────────────────
//
// CLAUDE.md T75 F14, verbatim: *"`BUDR` variants take `hob: true` (a library
// row "Hob drawer unit" for x2 and x3): the TOP front is a FIXED DUMMY (front
// material, no box, no runner, emitted as the blind blank is), the box under
// it keeps `profile.hob.clearanceMm = 60 // T75 proposed` below the worktop for
// the hob body; the worktop proposes the hob cut-out (F5). Prefix stays `DR`;
// the golden `golden-budr.json` is untouched because `hob` is absent on it."*
//
// THE FRONTS BOUNDARY: *"The blind blank (F3) and the dummy hob front (F14)
// are FIXED front pieces emitted beside the doors, through the role machinery
// the end panel uses: they are not doors and carry no hinge."*
//
// PROBE (verify/t75/p04-probe.md, F14): the top drawer of a BUDR owns 14
// holes (2 box-front screws, 4 bottom screws, 2 front screws, 3 + 3 runner
// holes) and 6 panels (its box of five and its front). With `hob` the five
// box boards and the 14 holes go and the front becomes a fixed piece.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import {
  UNIT_TYPES, UNIT_NUM_PREFIX, UNIT_TYPE_ORDER, defaultParamsFor,
} from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { KITCHEN_LIBRARY, resolveEntry } from '../src/engine/library.js';
import { ELEMENT_TO_PART_ID, PART_REGISTRY } from '../src/engine/partRegistry.js';
import { elementKind } from '../src/engine/elements.js';
import { groupOfPanel } from '../src/engine/cnc/groups.js';
import { buildBom } from '../src/engine/bom.js';
import { wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { goldenOf } from '../scripts/t75-golden.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const S = () => useProjectStore.getState();
const U = (id) => S().units.find((u) => u.id === id);
const PAIRS = [['BUDR_HOB', 'BUDR', 3], ['BUDR2_HOB', 'BUDR2', 2]];
const kit = (type, extra = {}) => ({ ...defaultParamsFor(type, P), unit_num: '01', ...extra });
const holeKey = (d) => `${d.panel}|${d.layer}|${d.kind}|${d.x}|${d.y}|${d.d}`;

test('F14 · BUDR and BUDR2 field by field, with `hob`, prefix DR; the flag rides the unit as `params.hob`', () => {
  for (const [id, parent] of PAIRS) {
    const t = UNIT_TYPES[id];
    for (const key of Object.keys(UNIT_TYPES[parent])) {
      if (['id', 'label'].includes(key)) continue;
      assert.deepEqual(t[key], UNIT_TYPES[parent][key], `${id}.${key} is not ${parent}'s`);
    }
    assert.equal(t.hob, true);
    assert.equal(UNIT_NUM_PREFIX[id], 'DR');
    assert.ok(UNIT_TYPE_ORDER.includes(id));
    assert.equal(defaultParamsFor(id, P).hob, true);
    assert.equal('hob' in defaultParamsFor(parent, P), false, `${parent} must not carry the key`);
  }
});

test('F14 · the number: 60 below the worktop, proposed, merged key by key', () => {
  assert.equal(P.hob.clearanceMm, 60);
  const src = readFileSync(`${ROOT}src/engine/profile.js`, 'utf8');
  const at = src.indexOf('  hob: {');
  assert.match(src.slice(at, at + 120), /clearanceMm: 60, +\/\/ T75 proposed, owner to confirm/);
  assert.equal(migrateCabinetProfile({ ...P, hob: { clearanceMm: 75 } }).hob.clearanceMm, 75);
  assert.equal(migrateCabinetProfile({ ...P, hob: undefined }).hob.clearanceMm, 60);
});

test('F14 · PROBE: the dummy takes exactly the top drawer\'s box, runner row and screws, 14 holes; the rest is the parent\'s', () => {
  for (const [id, parent, n] of PAIRS) {
    const a = computeCabinet(kit(id), P);
    const b = computeCabinet(kit(parent), P);
    // The parent's holes less the top drawer's own, hole for hole.
    const top = new Set(b.drills.filter((d) => d.panel.startsWith(`D${n}-`)
      || d.panel === `01-F${n}`
      || (d.kind === 'runner' && d.y === b.drillSummary.runner_rows_carcass_y[n - 1])).map(holeKey));
    assert.equal(top.size, 14, `${parent}'s top drawer owns ${top.size} holes`);
    assert.deepEqual(a.drills.map(holeKey).sort(), b.drills.map(holeKey).filter((k) => !top.has(k)).sort(),
      `${id} is not ${parent} less its top drawer`);
    // The boards: the five of the top box are gone and nothing else moved.
    const gone = b.panels.filter((x) => !a.panels.some((y) => y.id === x.id)).map((x) => x.id);
    assert.deepEqual(gone, ['SL', 'SR', 'BF', 'BB', 'DNO'].map((s) => `D${n}-${s}`));
    for (const x of a.panels) {
      if (x.role === 'false_front') continue;
      const y = b.panels.find((q) => q.id === x.id);
      assert.deepEqual([x.part, x.w, x.h, x.box], [y.part, y.w, y.h, y.box], `${id} ${x.id} moved`);
    }
    // The split is the kit's own: every other front stands where it stood.
    assert.deepEqual(a.derived.front_heights, b.derived.front_heights);
    assert.deepEqual(a.derived.drawer_front_y, b.derived.drawer_front_y);
    // Ordered: one runner pair and one rod fewer.
    const q = (r, role) => r.hardware.find((h) => h.role === role)?.qty;
    assert.equal(q(a, 'runner_pairs'), n - 1);
    assert.equal(q(a, 'runner_sync_rods'), n - 1);
    assert.equal(a.derived.drawers, n - 1);
    assert.deepEqual(a.warnings, []);
  }
});

test('F14 · the dummy is a FIXED front piece: front material, the drawer front\'s size and plane, no hole, no hinge', () => {
  const p = kit('BUDR_HOB');
  const a = computeCabinet(p, P);
  const b = computeCabinet(kit('BUDR'), P);
  const dummy = a.panels.find((x) => x.role === 'false_front');
  const front = b.panels.find((x) => x.id === '01-F3');
  assert.equal(dummy.id, '01-F3');
  assert.equal(dummy.part, 'FALSE-FRONT');
  assert.deepEqual([dummy.w, dummy.h, dummy.thickness, dummy.box], [front.w, front.h, front.thickness, front.box]);
  assert.equal(dummy.material_role, 'front');
  assert.equal(dummy.finish_exposed, true);
  assert.deepEqual(dummy.cnc.holes || [], []);
  assert.equal(dummy.cnc.outline.length, 4);
  assert.equal(a.drills.filter((d) => d.panel === dummy.id).length, 0);
  assert.equal(dummy.meta.readiness, 'geometry');
  assert.equal(dummy.meta.fixing, 'manual');
  assert.equal(dummy.meta.drawer, undefined, 'a dummy is not a drawer: it does not open');
  assert.equal(a.panels.filter((x) => x.part === 'DRAWER-FRONT').length, 2);
  assert.equal(a.drillSummary.hinge_centers.length, 0);
  // The blank's road: the FIX fronts row, its own element kind, the fronts sheet.
  assert.equal(ELEMENT_TO_PART_ID['FALSE-FRONT'], 'false_front');
  assert.equal(PART_REGISTRY.false_front.materialType, 'front');
  assert.equal(elementKind(dummy), 'false-front');
  assert.equal(groupOfPanel(dummy), 'fronts');
  // The face split, marked: the dimension rows still read the whole face.
  assert.equal(a.assemblies.drawerFronts.find((f) => f.index === 3).fixed, true);
});

test('F14 · the box under the dummy keeps the hob\'s clearance under the worktop', () => {
  // At the defaults it does not bind (PROBE: the box under it tops at 532.5
  // and 298.5 against 710), so it is proved by a clearance that does.
  for (const [id, , n] of PAIRS) {
    const r = computeCabinet(kit(id), P);
    const under = r.panels.find((x) => x.id === `D${n - 1}-SL`);
    assert.ok(under.box.y + under.box.h <= r.params.height - P.hob.clearanceMm);
  }
  const deep = { ...P, hob: { clearanceMm: 500 } };
  const r = computeCabinet(kit('BUDR2_HOB'), deep);
  const side = r.panels.find((x) => x.id === 'D1-SL');
  assert.ok(side.box.y + side.box.h <= r.params.height - 500, 'the box rose into the hob body');
  assert.ok(r.warnings.some((w) => w.code === 'DRAWER_BOX_CAPPED'), 'capped without a word');
  // …and a plain BUDR2 under the same profile is not touched by it.
  assert.deepEqual(computeCabinet(kit('BUDR2'), deep).drills.map(holeKey), computeCabinet(kit('BUDR2'), P).drills.map(holeKey));
});

test('F14 · the gate: `hob` absent or false cuts the parent, byte for byte', () => {
  for (const [, parent] of PAIRS) {
    const plain = computeCabinet(kit(parent), P);
    assert.deepEqual(computeCabinet(kit(parent, { hob: false }), P), plain);
  }
  // An oven base is a budr stack with one drawer: a hob flag on it cuts no dummy.
  const oven = computeCabinet(kit('OVEN_BASE', { hob: true }), P);
  assert.equal(oven.panels.some((x) => x.role === 'false_front'), false);
});

test('F14 · the library row "Hob drawer unit", 2x and 3x', () => {
  const base = KITCHEN_LIBRARY.find((g) => g.id === 'base-units').items;
  const group = base.find((e) => e.id === 'hob-drawer-unit');
  assert.equal(group.kind, 'group');
  assert.equal(group.label, 'Hob drawer unit');
  assert.deepEqual(group.items.map((i) => [i.typeId, i.label]), [['BUDR2_HOB', '2×'], ['BUDR_HOB', '3×']]);
  for (const item of group.items) assert.equal(resolveEntry(item, P).enabled, true);
});

test('F14 · the six stations: placed, cut, ordered, the worktop proposes the hob cut-out, drawn, saved and reloaded', () => {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const { id: a } = S().addUnit('BUD');
  const { id: hob } = S().addUnit('BUDR_HOB');
  assert.equal(U(hob).params.unit_num.startsWith('DR'), true);
  assert.equal(U(hob).params.hob, true);
  const r = S().unitResult(hob);
  assert.ok(r.panels.some((x) => x.role === 'false_front'));
  assert.equal(r.panels.filter((x) => /^D\d+-DNO$/.test(x.id)).length, 2);
  // The worktop over it proposes the hob cut-out (F5's record).
  S().addWorktop([a, hob]);
  const slab = S().worktopsOf()[0];
  assert.deepEqual(slab.cutouts.map((c) => c.kind), ['hob']);
  // The BOM: the dummy on the FIX fronts row, two runner pairs.
  const bom = buildBom(S().allResults(), { design: S().project.design, profile: P });
  const unit = bom.units.find((x) => x.unitId === hob) || bom.units.find((x) => (x.rows || []).some((row) => row.role === 'false_front'));
  assert.ok(unit, 'the hob unit is not in the BOM');
  assert.ok(unit.rows.some((row) => row.role === 'false_front' || row.part === 'FALSE-FRONT'), 'the dummy is not in the cut list');
  const sheets = wallDrawingSheets({
    entries: S().allResults(), project: { name: 'T75 F14' }, room: S().project.room, profile: P, date: '09.10.2026',
  });
  assert.ok(sheets.length > 0, 'the drawing set refused it');
  const saved = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
  S().newProject();
  S().loadProject(saved.project, saved.units);
  assert.equal(U(hob).params.hob, true);
  assert.deepEqual(S().unitResult(hob).drills.map(holeKey).sort(), r.drills.map(holeKey).sort());
});

test('F14 · a golden of its own; golden-budr.json untouched', () => {
  const g = JSON.parse(readFileSync(`${ROOT}fixtures/golden-budr-hob.json`, 'utf8'));
  assert.equal(g.params.type, 'BUDR_HOB');
  assert.equal(g.params.hob, true);
  assert.deepEqual(goldenOf(g.params, P), g.expected);
  const budr = JSON.parse(readFileSync(`${ROOT}fixtures/golden-budr.json`, 'utf8'));
  assert.equal(JSON.stringify(budr).includes('"hob"'), false);
});
