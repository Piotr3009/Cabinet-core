// ─── TURN 74 · F10 · HINGES ON A SLOPE: 150 MM FROM THE APEX ───────────────
//
// The owner, 23.09.2026 (list point 9):
//
//   *"ZAWIASY NA SKOSIE: minimum 150 mm od wierzchołka trójkąta skosu
//   (inaczej nie da się wkręcić śrubokrętem). Przeliczanie zawiasów na
//   skosach inaczej."*
//
// The probe (`verify/t74/f10-probe.md`, committed before the fix): where the
// slope cut the hinge edge the top cup sat 100 mm (the ordinary endOffset)
// under the apex, and a low sloped door kept its five cups squeezed to 44 mm
// with nothing said. The 150 is the owner's number and lives in the profile
// beside the hinge numbers.

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { runChecks, CHECKS } from '../src/engine/checks.js';

const WARDROBE = { ...defaultParamsFor('WARDROBE', P), unit_num: '01' };
const leafOf = (params) => computeCabinet({ ...WARDROBE, ...params }, P).panels.find((p) => p.part === 'FRONT');
const checksOf = (params) => {
  const all = { ...WARDROBE, ...params };
  const result = computeCabinet(all, P);
  const unit = { id: 'u1', type: 'WARDROBE', params: all, position: { wall: 0, x_mm: 0 } };
  return runChecks({ entries: [{ unit, result }], profile: P });
};
const APEX = { slope_cut: { y0: 1500, y1: 900, infill: 40 } };
const LOW = { slope_cut: { y0: 420, y1: 300, infill: 40 } };

test('T74 F10 · the owner\'s number lives in the profile, beside the hinge numbers', () => {
  assert.equal(P.hinges.slopeApexMinMm, 150);
  assert.equal(P.hinges.endOffset, 100, 'the ordinary end offset is untouched');
});

test('T74 F10 · where the slope cuts the hinge edge, the top hinge stands 150 mm under the apex', () => {
  const leaf = leafOf(APEX);
  const apex = leaf.meta.hinge === 'R' ? leaf.meta.slopeCut.roomR : leaf.meta.slopeCut.roomL;
  const top = Math.max(...leaf.meta.cupY);
  assert.ok(apex - top >= 150 - 1e-6, `the top hinge is ${apex - top} mm from the apex`);
  assert.equal(Math.round(apex - top), 150, 'the ladder was not re-run under the apex: it stands lower than it has to');
  // Re-spaced by the same rule, the bottom where it always is.
  assert.equal(Math.min(...leaf.meta.cupY), P.hinges.endOffset);
  const gaps = leaf.meta.cupY.slice(1).map((y, i) => y - leaf.meta.cupY[i]);
  assert.ok(gaps.every((g) => Math.abs(g - gaps[0]) < 1e-3), 'the rows are not evenly re-spaced');
  // The record the Check reads, and it is not refused.
  assert.equal(leaf.meta.slopeCut.hingeApex.min, 150);
  assert.equal(leaf.meta.slopeCut.hingeApex.refused, false);
});

test('T74 F10 · a low door is never squashed: its rows keep the house spacing, and it is refused in words', () => {
  const leaf = leafOf(LOW);
  const rows = leaf.meta.cupY;
  const gaps = rows.slice(1).map((y, i) => y - rows[i]);
  assert.ok(gaps.every((g) => g >= P.hinges.minSpacingMm - 1e-6), `squashed: ${gaps.join(', ')}`);
  const apex = leaf.meta.hinge === 'R' ? leaf.meta.slopeCut.roomR : leaf.meta.slopeCut.roomL;
  assert.ok(apex - Math.max(...rows) >= 150 - 1e-6);
  const a = leaf.meta.slopeCut.hingeApex;
  assert.equal(a.refused, true);
  assert.ok(a.now < a.asked, 'the refusal does not say what was asked');
  const red = checksOf(LOW).filter((f) => f.check === 26);
  assert.equal(red.length, 1, 'no Check refuses it');
  assert.equal(red[0].level, 'red');
  assert.match(red[0].message, /within 150 mm of the slope's apex/);
  assert.match(red[0].message, /holds \d+ of the \d+ hinges/);
  assert.ok(!/[–—]/.test(red[0].message), 'a dash the owner forbade');
  assert.ok(CHECKS.find((c) => c.n === 26 && c.level === 'red'));
});

test('T74 F10 · a door the slope does NOT cut on its hinge edge keeps its ladder, and nothing is refused', () => {
  const flat = leafOf({});
  assert.equal(flat.meta.cupY, undefined, 'a full door carries the cabinet\'s own ladder');
  const over = leafOf({ slope_cut: { y0: 2400, y1: 1200, infill: 40 } });
  assert.equal(over.meta.slopeCut.hingeApex, undefined, 'the apex rule reached an edge the slope does not cut');
  assert.deepEqual(checksOf({}).filter((f) => f.check === 26), []);
});

test('T74 F10 · a list drilled BY HAND still wins, and the Check says where it stands', () => {
  const near = leafOf({ ...APEX, hinge_rows: [120, 1330] });
  assert.deepEqual(near.meta.cupY, [120, 1330], 'the hand list was moved');
  const rows = checksOf({ ...APEX, hinge_rows: [120, 1330] }).filter((f) => f.check === 26);
  assert.equal(rows.length, 1);
  assert.match(rows[0].message, /drilled by hand stands \d+ mm from the slope's apex/);
  // …and a hand list clear of the apex raises nothing.
  assert.deepEqual(checksOf({ ...APEX, hinge_rows: [120, 900] }).filter((f) => f.check === 26), []);
});

test('T74 F10 · the goldens\' cabinets never meet it: no slope, no apex record', () => {
  for (const id of ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY']) {
    const r = computeCabinet(defaultParamsFor(id, P), P);
    assert.ok(!r.panels.some((p) => p.meta?.slopeCut?.hingeApex), `${id} carries an apex record`);
  }
});
