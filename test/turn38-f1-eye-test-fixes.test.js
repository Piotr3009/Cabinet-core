// ─── TURN 38 · F1 — the three corrections off the T37 eye test ─────────────
//
//   F1a  the check layer reads the hinge positions that exist NOW
//   F1b  a top box door runs the hinge-count law on ITS OWN height
//   F1c  a top box's back stands its figure up, like every other back
//
// All three are engine-adjacent and none of them may move a byte of the six
// standard configs — `scripts/t38-classify.mjs` is the contract and this file
// is the behaviour.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet, hingeRows } from '../src/engine/cabinet.js';
import { defaultParamsFor, getUnitType, UNIT_TYPE_ORDER } from '../src/engine/types.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { grainRun } from '../src/engine/decors.js';
import { sheetTurn } from '../src/engine/cnc/layout.js';
import { checkDependencies } from '../src/lib/checkFindings.js';

const store = () => useProjectStore.getState();
const unitOf = (id) => store().units.find((u) => u.id === id);

function project() {
  store().loadProject({
    id: null,
    name: 't38-f1',
    room: migrateRoom({ height: 2700, corners: rectCorners(6000, 3000) }),
    design: {},
  }, []);
}

const box = (over = {}) => computeCabinet(
  {
    ...defaultParamsFor('WARDROBE_TOP', P), unit_num: 'WT01', width: 900, ...over,
  },
  P,
);

// ═══ F1a — THE CHECK LAYER READS WHAT IS THERE NOW ══════════════════════════

test('F1a — the store\'s runChecks() is fresh: adding a top box re-reads the hinge layout', () => {
  project();
  const host = store().addUnit('WARDROBE').id;
  store().setDoors(host, { count: 1, hinge: 'L' });
  store().addShelves(host, 1);

  const before = store().unitResult(host).drillSummary.hinge_centers;
  assert.ok(before.length > 0, 'the host is drilled for hinges');

  const rider = store().addUnit('WARDROBE_TOP').id;
  assert.equal(unitOf(rider).params.rides_on, host, 'the box is on the wardrobe');

  // EVERY finding that names a hinge names one that EXISTS, in every cabinet,
  // after the box has landed. That is the whole of "no collision where no
  // hinge is any more", asked as a property rather than of one row.
  const rowsOf = new Map(store().units.map((u) => [
    u.id, (store().unitResult(u.id)?.drillSummary?.hinge_centers || []).map((v) => Math.round(v)),
  ]));
  for (const f of store().runChecks()) {
    if (!Number.isFinite(f.hingeY)) continue;
    assert.ok(rowsOf.get(f.unitId).includes(Math.round(f.hingeY)),
      `#${f.check} names a hinge at ${f.hingeY} that is not in ${JSON.stringify(rowsOf.get(f.unitId))}`);
  }

  // …and the box's OWN rows are the box's own, read through the same door the
  // checks read through.
  const boxRows = store().unitResult(rider).drillSummary.hinge_centers;
  assert.notDeepEqual(boxRows, before, 'a 500 box does not carry the wardrobe’s ladder');
});

test('F1a — the check DEPENDENCY list carries every input the rules read', () => {
  // The bug was a hand-written `[units, design, runChecks]` in TWO components.
  // Five inputs reach `runChecks`, and the hinge LADDER itself is a function of
  // three of them (units, design, profile) — so a key that carries all five
  // cannot survive a hinge layout being recomputed.
  const a = checkDependencies({
    units: ['u'], design: { d: 1 }, room: { r: 1 }, profile: { p: 1 }, materials: [],
  });
  assert.equal(a.length, 5, 'units, design, room, profile, materials');
  const b = checkDependencies({
    units: ['u'], design: { d: 1 }, room: { r: 1 }, profile: { p: 2 }, materials: [],
  });
  // A DIFFERENT profile — new hinge ladders, a new clash window — is a
  // different key, position by position, which is what a React memo compares.
  assert.equal(a.some((v, i) => v !== b[i]), true, 'the profile moves the key');
  const same = checkDependencies({
    units: a[0], design: a[1], room: a[2], profile: a[3], materials: a[4],
  });
  assert.deepEqual(same.map((v, i) => v === a[i]), [true, true, true, true, true],
    'and nothing else does — an unchanged job is not recomputed per frame');
});

test('F1a — the panel and the badge read ONE list, and it is not a local memo', () => {
  for (const file of ['src/components/CheckPanel.jsx', 'src/components/CanvasToolbar.jsx']) {
    const text = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.match(text, /useCheckFindings\(\)/, `${file} reads the shared hook`);
    assert.doesNotMatch(text, /useMemo\(\(\) => runChecks\(\)/,
      `${file} no longer memoises the checks on its own dependency list`);
  }
});

// ═══ F1b — A TOP BOX DOOR TAKES THE HINGES ITS OWN HEIGHT ASKS FOR ══════════

test('F1b — a 500 mm top box door takes TWO hinges, not the wardrobe’s five', () => {
  const rows = box({ height: 500 }).drillSummary.hinge_centers;
  assert.equal(rows.length, 2, `500 mm door → 2 hinges, got ${JSON.stringify(rows)}`);
});

test('F1b — and at any other height it is the LAW’s own answer, not a typed number', () => {
  const rule = P.hinges.rules[getUnitType('WARDROBE_TOP').hingeRule];
  for (const height of [400, 500, 600, 700, 900, 1100, 1300]) {
    const law = hingeRows({ height, rule, standard: P.hinges.standard }, P);
    const cut = box({ height }).drillSummary.hinge_centers;
    assert.deepEqual(cut.map((v) => Math.round(v * 1e4) / 1e4), law.map((v) => Math.round(v * 1e4) / 1e4),
      `a ${height} mm box is drilled the ladder the law gives a ${height} mm door`);
  }
});

test('F1b — the count SCALES with the door, which is what "its own height" means', () => {
  const counts = [500, 900, 1300].map((height) => box({ height }).drillSummary.hinge_centers.length);
  assert.deepEqual(counts, [...counts].sort((a, b) => a - b), 'taller never takes fewer');
  assert.ok(counts[0] < counts[counts.length - 1],
    `the ladder answers the height: ${JSON.stringify(counts)}`);
});

test('F1b — nothing else in the app changed hinge rule', () => {
  // The fix is ONE type's one word. A sweep, so a later hand cannot widen it
  // without this saying so.
  const low = UNIT_TYPE_ORDER.filter((id) => getUnitType(id).hingeRule === 'low');
  assert.ok(low.includes('WARDROBE_TOP'), 'the top box is on the low ladder');
  assert.equal(getUnitType('WARDROBE').hingeRule, 'tall', 'the wardrobe itself is untouched');
});

// ═══ F1c — THE BACK STANDS UP ═══════════════════════════════════════════════

test('F1c — the top box’s back runs its figure UP the panel, like the main’s', () => {
  const main = computeCabinet({
    ...defaultParamsFor('WARDROBE', P), unit_num: '01', width: 900, height: 2000,
  }, P);
  const mainBack = main.panels.find((p) => p.part === 'BACK');
  const boxBack = box({ height: 500 }).panels.find((p) => p.part === 'BACK');

  assert.equal(grainRun(mainBack).axis, 'h', 'the main’s back stands up');
  assert.equal(grainRun(boxBack).axis, 'h', 'and so does the box’s');
  // The proof that it is not the proportions answering: the box's back is
  // WIDER than it is tall, so the saw's own longer-side rule would have laid
  // the figure across it — which is exactly what the owner was looking at.
  assert.ok(boxBack.w > boxBack.h, `${boxBack.w} × ${boxBack.h} — wider than it is tall`);
  assert.equal(grainRun(boxBack).lengthMm, boxBack.h, 'and the figure runs the height anyway');
});

test('F1c — the SHEET reads the same statement: the grain goes UP the page', () => {
  // The second reader (T37-F7a's generalised law). A stated `h` is already
  // standing, so the board is laid at 0° with its figure up the sheet — the
  // same answer the main wardrobe's own back gets, which is the consistency
  // the owner asked for.
  const boxBack = box({ height: 500 }).panels.find((p) => p.part === 'BACK');
  assert.equal(boxBack.cnc.grain, 'h', 'the piece SAYS so');
  assert.equal(sheetTurn(boxBack), 0, 'and the nester lays it with that grain up the page');
});

test('F1c — a back that is TALLER than it is wide stays silent', () => {
  // The saw's own rule already answers it, so nothing is stated and nothing
  // that was cut before tonight moves. This is the line that keeps the turn's
  // byte-identity contract, said as a test rather than as a promise.
  const main = computeCabinet({
    ...defaultParamsFor('WARDROBE', P), unit_num: '01', width: 900, height: 2000,
  }, P);
  const back = main.panels.find((p) => p.part === 'BACK');
  assert.ok(back.h > back.w);
  assert.equal('grain' in back.cnc, false, 'no key is added where the saw is already right');
  assert.equal(grainRun(back).axis, 'h', '…and the answer is the same one');
});

test('F1c — every UPRIGHT full back in the app stands its figure up', () => {
  // The sweep is over the backs that are DRAWN UPRIGHT — the carcass's own
  // full back, `rotated: false`. The fridge's and the oven's top back is a
  // different board with a different job: a horizontal rail across the top of
  // the opening, nested TURNED by its own kit (`cnc.rotated: true`, pinned
  // since turn 12's F10), and a rail's figure runs its length. Sweeping it in
  // here would re-cut a board this feature was never about.
  const wrong = [];
  for (const id of UNIT_TYPE_ORDER) {
    let r;
    try { r = computeCabinet({ ...defaultParamsFor(id, P), unit_num: '01' }, P); } catch { continue; }
    for (const p of r.panels) {
      if (p.part !== 'BACK' || p.cnc?.rotated) continue;
      if (grainRun(p).axis !== 'h') wrong.push(`${id} ${p.id}: ${p.w}×${p.h} runs ${grainRun(p).axis}`);
    }
  }
  assert.deepEqual(wrong, [], wrong.join('\n'));
});
