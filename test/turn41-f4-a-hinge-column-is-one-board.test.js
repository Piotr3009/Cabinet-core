// ─── TURN 41, F4: A HINGE COLUMN IS ONE BOARD ───────────────────────────────
//
// T40-F1 gave the owner what he asked for — a split door's two leaves get two
// independent hinge sets, movable per leaf, and the check reads the same
// positions the scene draws. All of that HOLDS; it was measured and it is
// right, and nothing here touches it.
//
// What it also did was make two ladders DIVERGIBLE, and two places downstream
// had been quietly relying on them never diverging. Both faults are at the
// machine, and both were invisible to T40's tests because those tests asserted
// stored values: `store().hingeRowsOf(...)`, `params.split_hinge_rows`, and a
// count of the FRONT's own cups — never once the plate holes in BUL and BUR,
// which is exactly the number that goes wrong.
//
// ─── FAULT 1: FOUR HOLES WITH NO HINGE IN THEM ──────────────────────────────
//
// `platedRowsFor(bearerId)` fell through to `true` for any leaf with no
// `meta.hingeOn` — which is every FACE door. Measured on a 900 × 2150 split
// wardrobe: 20 plate holes before, 24 after moving ONE hinge on ONE leaf, with
// BUL and BUR bored at the IDENTICAL list. Two of the four new holes are in
// the carcass side whose door was never touched.
//
// ─── FAULT 2: THE JOB WOULD NOT EXPORT, OUT OF THE BOX ──────────────────────
//
// `drilledHingeRows()` flattens every door's ladder into ONE list and the
// drill guard runs the 60 mm minimum-spacing rule over it. A minimum spacing is
// a fact about one column of holes in one BOARD. On a wardrobe with a
// partition, per-bay doors and one bay split — no hand editing at all —
//
//     BUL [100, 773.5, 1447, 1650, 2050]      BUR [100, 490, 880, 1270, 1660, 2050]
//
// 1650 is on BUL and 1660 is on BUR; the guard compared them, called them 10 mm
// apart, and `exportGate` held BOTH carcass sides out of the CNC export.
//
// Every assertion below is a HOLE or an EXPORT VERDICT.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { drilledHingeRows, drilledHingeRowsBySide } from '../src/engine/hingeLadder.js';
import { drillFindings } from '../src/engine/cnc/drillGuard.js';
import { exportGate } from '../src/engine/cnc/exportGate.js';

const SPLIT = {
  ...defaultParamsFor('WARDROBE', P), unit_num: 'W01', width: 900, height: 2150, split_top_mm: 600,
};
const rowsOn = (r, side) => [...new Set((r.drills || [])
  .filter((d) => (d.panel === side || d.id === side) && String(d.kind).includes('hinge'))
  .map((d) => Math.round(d.y * 10) / 10))].sort((a, b) => a - b);
const plateHoles = (r) => (r.drills || []).filter((d) => String(d.kind).includes('hinge')).length;

// ═══ 1. ONE LEAF MOVED, ONE SIDE RE-BORED ═══════════════════════════════════

test('F4 — moving a hinge on ONE leaf bores no hole in the other side', () => {
  const before = computeCabinet(SPLIT, P);
  const after = computeCabinet({ ...SPLIT, split_hinge_rows: { 'W01-FL-T': [1700, 2047] } }, P);

  assert.equal(plateHoles(after), plateHoles(before),
    `${plateHoles(after)} plate holes for the same ${(after.drills || []).filter((d) => d.kind === 'cup').length} cups`);
  assert.deepEqual(rowsOn(after, 'BUR'), rowsOn(before, 'BUR'),
    'the RIGHT side\'s door was never touched, so its board is bored where it was');
  assert.notDeepEqual(rowsOn(after, 'BUL'), rowsOn(before, 'BUL'),
    'and the LEFT side really did follow its own leaf');
});

test('F4 — every plate hole has a hinge in it, on both sides', () => {
  // The count is the honest form: a plate is two holes, so the bored holes on
  // a side must be twice the hinges hanging on it.
  const r = computeCabinet({ ...SPLIT, split_hinge_rows: { 'W01-FL-T': [1700, 2047] } }, P);
  for (const [side, leafIds] of [['BUL', ['W01-FL-T', 'W01-FL-B']], ['BUR', ['W01-FR-T', 'W01-FR-B']]]) {
    const hinges = leafIds.reduce((n, id) => {
      const panel = r.panels.find((p) => p.id === id);
      return n + (panel?.meta?.plateY?.length || 0);
    }, 0);
    const holes = (r.drills || [])
      .filter((d) => (d.panel === side || d.id === side) && String(d.kind).includes('hinge')).length;
    assert.equal(holes, hinges * 2, `${side}: ${holes} holes for ${hinges} hinges`);
  }
});

// ═══ 2. A COLUMN IS ONE BOARD ═══════════════════════════════════════════════

test('F4 — the rows are grouped by the BOARD they are bored in', () => {
  const r = computeCabinet(SPLIT, P);
  const bySide = drilledHingeRowsBySide(r);
  // A split face door names its side on the leaf, so there are two columns.
  assert.ok(bySide.has('BUL') && bySide.has('BUR'), `two columns: ${[...bySide.keys()]}`);
  // …and the flat union is still available, un-deleted, for the sweeps that
  // genuinely want "every row this cabinet is bored at".
  const flat = drilledHingeRows(r);
  const union = new Set([...bySide.values()].flat());
  for (const y of flat) assert.ok([...union].some((v) => Math.abs(v - y) < 0.51), `${y} is in a column`);
});

test('F4 — a cabinet nobody has edited answers exactly as it always did', () => {
  // The no-split path is preserved VERBATIM — duplicates and all, because
  // turn 31's regression is two rows both at 100 and de-duplicating them would
  // hide the fault the guard exists to catch.
  const r = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01', hinge_rows: [100, 100] }, P);
  const bySide = drilledHingeRowsBySide(r);
  assert.equal(bySide.size, 1, 'one column for the whole cabinet');
  assert.deepEqual([...bySide.values()][0], r.drillSummary.hinge_centers, 'and it IS hinge_centers');
  // …so the guard still catches it.
  const found = drillFindings(r, { profile: P, unitNum: '01' });
  assert.ok(found.some((f) => f.code === 'hinge-rows-too-close'), 'the turn-31 regression is still caught');
});

// ═══ 3. AND THE JOB EXPORTS ═════════════════════════════════════════════════

test('F4 — a partitioned wardrobe with bay doors and one split bay EXPORTS', () => {
  // The out-of-the-box configuration. No hand editing.
  const items = [{ id: 'p1', kind: 'partition', x_mm: 900, front_mm: 0 }];
  const params = {
    ...defaultParamsFor('WARDROBE', P),
    unit_num: 'W01', width: 1800, height: 2150,
    items, sections: [{ items }],
    bay_doors: [{ door: 'one', hinge: 'L', split_top_mm: 600 }, { door: 'one', hinge: 'R' }],
  };
  const r = computeCabinet(params, P);
  // The two sides really are bored differently — otherwise this proves nothing.
  assert.notDeepEqual(rowsOn(r, 'BUL'), rowsOn(r, 'BUR'), 'the two sides carry different ladders');

  const reds = drillFindings(r, { profile: P, unitNum: 'W01' }).filter((f) => f.level === 'red');
  assert.deepEqual(reds.map((f) => f.message), [], 'no red on a cabinet the app itself built');
  const gate = exportGate([{ unit: { id: 'u1', params }, result: r }], { profile: P });
  assert.notEqual(gate.ok, false, gate.message);
});

test('F4 — but a REAL clash, on ONE side, is still caught', () => {
  // The fix must not be "stop looking". Two rows 10 mm apart on the SAME leaf
  // are two hinges that cannot both be fitted, and they are still a red.
  const r = computeCabinet({ ...SPLIT, split_hinge_rows: { 'W01-FL-T': [1650, 1660] } }, P);
  const reds = drillFindings(r, { profile: P, unitNum: 'W01' }).filter((f) => f.level === 'red');
  assert.ok(reds.some((f) => f.code === 'hinge-rows-too-close'),
    `a same-board clash is still a red: ${JSON.stringify(reds.map((f) => f.message))}`);
});
