/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T83 F9 · THE OPEN OF A TWO-COLUMN VANITY
//
// The owner, 25.10.2026 (22:41): *"jak wpieram 2 rows to otwieraja mi sie 2
// szuflady ale jedna sie otwiera carcas tylko a druga front tylko zamiast 2
// carcasy i 2 fronty, sprawdz"*.
//
// PROBE (verify/t83/f09-probe.md): the column stack (the vanity and the chest,
// KIT_VANITY.lsp 5(c2)) already stamps `{ drawer, column }` on every box part
// AND on its front (`colMeta`), and neither carries `zone`: the cut pairs them.
// The fault was the reader: `engine/drawerMotion.js` keyed the open and the
// travel on `meta.drawer` alone, so one front slid the box of that number in
// BOTH columns, and `hardware3d.js` numbers a second column's runners after
// the first's, which no front carries, so the right column's runners never
// rode. The fix reads the drawer AND its column (`column` on the column stack,
// `zone` on a wardrobe's bay): `drawerKey`; the runners state the key of the
// drawer they carry (`ride`), and `runnerSlide` is what `3d/Hardware.jsx`
// asks. No meta line of the cut is added: no golden moves.
//
// CLAUDE.md F9's test: at columns 2 every box part's `meta.zone` equals its
// front's (and, the probe's correction, its `meta.column`, the column stack's
// name for it); the top-left front opened moves exactly that column's box and
// front and nothing of the other column; columns 1 unchanged.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor, getUnitType, UNIT_TYPE_ORDER } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { hardwareInstances } from '../src/engine/hardware3d.js';
import {
  drawerKey, drawerKeyOf, drawerMotion, drawerOf, drawerOpenAmounts, drawerTravel, runnerSlide,
} from '../src/engine/drawerMotion.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const kit = (type, extra = {}) => computeCabinet({ ...defaultParamsFor(type, P), unit_num: '01', ...extra }, P);
const isBox = (p) => p.role === 'drawer_box' && p.box;
const isFront = (p) => p.part === 'DRAWER-FRONT' && p.box;
const fronts = (r) => r.panels.filter(isFront);
const topRow = (r) => Math.max(...fronts(r).map((p) => Number(p.meta?.drawer) || 0));
/** The front whose face covers this box (the one a hand pulls to take it out). */
const faceOf = (r, box) => fronts(r).find((f) => Number(f.meta?.drawer) === Number(box.meta?.drawer)
  && f.box.x <= box.box.x + 1e-6 && f.box.x + f.box.w >= box.box.x + box.box.w - 1e-6);
const topFront = (r, side) => fronts(r).filter((p) => p.meta?.drawer === topRow(r))
  .sort((a, b) => (side === 'left' ? a.box.x - b.box.x : b.box.x - a.box.x))[0];
/** Every part that moves with `frontId` opened, through the room's own arithmetic. */
const moving = (r, frontId) => {
  const m = drawerMotion(r.panels, { [frontId]: 1 });
  return r.panels.filter((p) => p.box && (isFront(p) ? p.id === frontId : (m.forPanel(p)?.open ?? 0) > 0));
};

const TWO = [
  ['VANITY3 columns 2, sinks 1 (F7: the top boxes narrowed to the trap\'s gap)', () => kit('VANITY3', { columns: 2, sinks: 1 })],
  ['VANITY3 columns 2, sinks 2', () => kit('VANITY3', { columns: 2, sinks: 2 })],
  ['WARDROBE_CHEST3 columns 2', () => kit('WARDROBE_CHEST3', { columns: 2, drawer_split: 'equal' })],
];

test('F9 · drawerKey: the drawer alone on one stack, the drawer and its column (or bay) on two', () => {
  assert.equal(drawerKey({ drawer: 3 }), 3, 'one stack: the bare number, as every map has always held it');
  assert.equal(drawerKey({ drawer: 2.5 }), 2.5, 'the inner drawer of a double row keeps its key');
  assert.equal(drawerKey({ drawer: 3, column: 1 }), '3|column 1');
  assert.notEqual(drawerKey({ drawer: 3, column: 1 }), drawerKey({ drawer: 3, column: 2 }));
  assert.equal(drawerKey({ drawer: 1, zone: 0 }), '1|zone 0', 'a wardrobe\'s first bay is zone 0, not "no zone"');
  assert.equal(drawerKey({}), null);
  assert.equal(drawerKey({ drawer: 0 }), null);
  assert.equal(drawerKeyOf({ role: 'shelf', meta: { drawer: 1, column: 1 } }), null, 'a shelf never rides');
  assert.equal(drawerOf({ role: 'drawer_box', meta: { drawer: 3, column: 2 } }), 3, 'drawerOf still names the drawer number');
});

for (const [name, make] of TWO) {
  test(`F9 · ${name}: every box part carries its front's zone and column, and its front's key`, () => {
    const r = make();
    const boxes = r.panels.filter(isBox);
    assert.ok(boxes.length >= 30, `${boxes.length} box parts`);
    if (/sinks 1/.test(name)) assert.ok(boxes.some((p) => p.meta?.trapGap), 'F7\'s narrowed top boxes are on the stage');
    for (const b of boxes) {
      const f = faceOf(r, b);
      assert.ok(f, `${b.id}: no front covers it`);
      assert.equal(b.meta?.zone, f.meta?.zone, `${b.id}: zone ${b.meta?.zone} against its front ${f.id}'s ${f.meta?.zone}`);
      assert.equal(b.meta?.column, f.meta?.column, `${b.id}: column ${b.meta?.column} against ${f.id}'s ${f.meta?.column}`);
      assert.ok(b.meta?.column === 1 || b.meta?.column === 2, `${b.id}: no column`);
      assert.equal(drawerKeyOf(b), drawerKey(f.meta), `${b.id} and ${f.id} are not paired`);
    }
  });

  test(`F9 · ${name}: the top-left front opened moves that column's box and front, nothing of the other`, () => {
    const r = make();
    for (const side of ['left', 'right']) {
      const f = topFront(r, side);
      const col = f.meta.column;
      const moved = moving(r, f.id);
      const own = r.panels.filter((p) => isBox(p) && p.meta?.drawer === f.meta.drawer && p.meta?.column === col);
      assert.ok(own.length >= 5, `${f.id}: ${own.length} box parts`);
      assert.deepEqual(moved.map((p) => p.id).sort(), [...own.map((p) => p.id), f.id].sort(),
        `${side}: ${moved.map((p) => p.id).join(', ')}`);
      assert.ok(moved.every((p) => (p.meta?.column ?? col) === col), `${side}: a part of the other column moved`);
      // How far: the box's own depth (the runner's nominal length), its column's.
      const m = drawerMotion(r.panels, { [f.id]: 1 });
      const side1 = own.find((p) => p.part === 'DRAWER-SIDE');
      assert.deepEqual(m.forPanel(side1), { open: 1, travel: side1.box.d });
      assert.deepEqual(m.forPanel(f), { open: 1, travel: side1.box.d }, 'the face travels as far as its box');
    }
  });

  test(`F9 · ${name}: the runners of the opened drawer ride, on its own column, and no other pair`, () => {
    const r = make();
    const runs = hardwareInstances(r, P).runners;
    assert.equal(runs.length, 12);
    assert.ok(runs.every((x) => x.ride != null), 'every pair of a column stack names the drawer it carries');
    for (const side of ['left', 'right']) {
      const f = topFront(r, side);
      const col = f.meta.column;
      const m = drawerMotion(r.panels, { [f.id]: 1 });
      const out = runs.filter((x) => runnerSlide(m, runs, x.drawer) > 0);
      assert.equal(out.length, 2, `${side}: ${out.map((x) => `${x.drawer}${x.side}`).join(', ')}`);
      assert.ok(out.every((x) => x.ride === drawerKey(f.meta)), `${side}: the pair carries another drawer`);
      // On its own column's box: x is a face of that drawer's own sides.
      const sides = r.panels.filter((p) => p.part === 'DRAWER-SIDE' && p.meta?.drawer === f.meta.drawer && p.meta?.column === col);
      const lo = Math.min(...sides.map((p) => p.box.x));
      const hi = Math.max(...sides.map((p) => p.box.x + p.box.w));
      assert.deepEqual(out.map((x) => x.x).sort((a, b) => a - b), [lo, hi], `${side}: the pair is not under its box`);
      for (const x of out) assert.equal(runnerSlide(m, runs, x.drawer), sides[0].box.d, 'it rides the box\'s own length');
    }
  });
}

test('F9 · the room asks the engine: 3d/Hardware.jsx slides each runner group by runnerSlide (F09-3d.patch)', () => {
  const hw = readFileSync(new URL('../src/3d/Hardware.jsx', import.meta.url), 'utf8');
  const at = hw.indexOf('function Runners({');
  const block = hw.slice(at, hw.indexOf('\nfunction ', at + 10));
  assert.match(hw, /import \{ runnerSlide \} from '\.\.\/engine\/drawerMotion\.js';/);
  assert.match(block, /const slideOf = \(drawer\) => runnerSlide\(slide, items, drawer\);/);
  assert.match(block, /<SlideOut key=\{`d\$\{drawer\}`\} distance=\{slideOf\(drawer\)\}>/, 'one group per pair, as T20 drew it');
  // And the engine's answer on a fake motion, as Hardware's own props carry it.
  const fake = { open: new Map([['3|column 2', 1], [3, 0.5]]), travel: new Map([['3|column 2', 400], [3, 450]]) };
  assert.equal(runnerSlide(fake, [{ drawer: 6, ride: '3|column 2' }], 6), 400, 'column 2\'s top pair rides its own drawer');
  assert.equal(runnerSlide(fake, [{ drawer: 3 }], 3), 225, 'a pair with no key is its drawer number, as before');
  assert.equal(runnerSlide(null, [], 1), 0);
});

test('F9 · columns 1 unchanged: one stack keeps the bare drawer number, and moves exactly what the old law moved', () => {
  // The law before tonight, written out: everything keyed on meta.drawer alone.
  const oldLaw = (panels, open) => {
    const travel = new Map();
    for (const p of panels) {
      if (p?.part !== 'DRAWER-SIDE' || !p.box) continue;
      const n = Number(p.meta?.drawer);
      if (n > 0) travel.set(n, Math.max(travel.get(n) || 0, Number(p.meta?.travel_mm) || Number(p.box.d) || 0));
    }
    const amounts = new Map();
    for (const p of panels) {
      const n = Number(p.meta?.drawer);
      if (p?.part === 'DRAWER-FRONT' && n > 0 && (Number(open[p.id]) || 0) > 0) amounts.set(n, Number(open[p.id]));
    }
    return (p) => {
      const n = drawerOf(p);
      return n == null ? null : { open: amounts.get(n) || 0, travel: travel.get(n) || 0 };
    };
  };
  let units = 0;
  for (const type of UNIT_TYPE_ORDER) {
    let r;
    try { r = kit(type); } catch { continue; }
    const fs = fronts(r).filter((p) => Number(p.meta?.drawer) > 0);
    if (!fs.length) continue;
    if (r.panels.some((p) => p.meta?.column != null || p.meta?.zone != null)) continue;
    units += 1;
    for (const f of fs) {
      const open = { [f.id]: 1 };
      const now = drawerMotion(r.panels, open);
      const was = oldLaw(r.panels, open);
      for (const p of r.panels) assert.deepEqual(now.forPanel(p), was(p), `${type} ${f.id} opened: ${p.id}`);
      assert.deepEqual([...drawerOpenAmounts(r.panels, open).keys()], [Number(f.meta.drawer)], `${type}: a bare number`);
    }
    for (const k of drawerTravel(r.panels).keys()) assert.equal(typeof k, 'number', `${type}: travel keyed ${k}`);
    for (const x of hardwareInstances(r, P).runners) {
      assert.equal(x.ride, undefined, `${type}: a one-stack pair grew a key`);
      assert.equal(runnerSlide(drawerMotion(r.panels, {}), [x], x.drawer), 0);
    }
  }
  assert.ok(units >= 8, `${units} one-stack drawer kits checked`);
  for (const type of ['VANITY3', 'WARDROBE_CHEST3']) {
    const r = kit(type, { columns: 1 });
    const f = topFront(r, 'left');
    const moved = moving(r, f.id);
    const own = r.panels.filter((p) => isBox(p) && p.meta?.drawer === f.meta.drawer);
    assert.deepEqual(moved.map((p) => p.id).sort(), [...own.map((p) => p.id), f.id].sort(), `${type} columns 1`);
    const runs = hardwareInstances(r, P).runners;
    const m = drawerMotion(r.panels, { [f.id]: 1 });
    assert.deepEqual(runs.filter((x) => runnerSlide(m, runs, x.drawer) > 0).map((x) => `${x.drawer}${x.side}`),
      [`${f.meta.drawer}L`, `${f.meta.drawer}R`], `${type} columns 1: its own pair rides, as before`);
  }
});

test('F9 · no box part of any kit lost its front to the new key (columns 1 and 2)', () => {
  const cases = [];
  for (const type of UNIT_TYPE_ORDER) {
    cases.push([type, {}]);
    if (getUnitType(type)?.drawerColumns) cases.push([type, { columns: 2 }]);
  }
  for (const [type, extra] of cases) {
    let r;
    try { r = kit(type, extra); } catch { continue; }
    const numbers = new Set(fronts(r).map((p) => Number(p.meta?.drawer)).filter((n) => n > 0));
    const keys = new Set(fronts(r).map((p) => drawerKey(p.meta)).filter((k) => k != null));
    for (const p of r.panels) {
      const k = drawerKeyOf(p);
      if (k == null || !numbers.has(Number(p.meta.drawer))) continue;
      assert.ok(keys.has(k), `${type} ${JSON.stringify(extra)}: ${p.id} rides ${k} and no front opens it`);
    }
  }
});

test('F9 · the wardrobe\'s bays (the zoned road, the probe\'s row 10): one bay\'s drawer opens alone', () => {
  const S = () => useProjectStore.getState();
  S().loadProject({
    id: null, name: 'T83 F9', room: migrateRoom({ height: 2600, corners: rectCorners(6000, 3000) }), design: {},
  }, []);
  const { id } = S().addUnit('WARDROBE');
  S().updateUnitParams(id, { width: 1200, doors: false });
  S().addPartition(id);
  const part = S().units.find((u) => u.id === id).params.sections[0].items.find((i) => i.kind === 'partition');
  S().updateItem(id, part.id, { front_mm: 0 });
  S().addDrawers(id, 2, 'overlay', 220, 0);
  S().addDrawers(id, 2, 'overlay', 220, 1);
  const r = S().unitResult(id);
  const first = fronts(r).filter((p) => p.meta?.drawer === 1).sort((a, b) => a.box.x - b.box.x)[0];
  assert.equal(first.meta.zone, 0);
  const moved = moving(r, first.id);
  assert.ok(moved.length >= 6, moved.map((p) => p.id).join(', '));
  assert.ok(moved.every((p) => p.meta?.zone === 0), `the other bay moved: ${moved.map((p) => p.id).join(', ')}`);
});
