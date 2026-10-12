// --- T78 . F22 . THE TOP INFILL IS ALWAYS MITRED AT A CORNER -----------------
//
// The owner, 11.10.2026: *"zawsze z mitra, gorny infill to samo co boczny."*
// CLAUDE.md T78 F22: `infillCornerMitre` returns the 45 degree mitre at every
// internal corner a top infill turns, not only when the filler stands in the
// face plane; the tolerance case stays for the T-joint. `golden-wall-mask.json`
// and the six are proven untouched (no golden has a corner).
//
// THE PROBE (12.10.2026, through the store, before the fix): a BUDTALL run
// standing on the corner stop of another BUDTALL's run (T75 F6's scene):
//
//   | what                                  | before          | after  |
//   | run_top_infill.ends.left              | 'corner'        | same   |
//   | run_top_infill.mitre.left             | 0               | faceH  |
//   | INFILL-T-FACE meta.corner.left        | 0               | faceH  |
//   | INFILL-T-FACE cnc.outline             | 660 x 60 rect   | same   |
//   | INFILL-T-FACE box.x                   | -40 (post edge) | same   |
//   | run_top_infill.sideMitre.left         | 0               | 0      |
//
// The strip stopped SQUARE on the post's outer edge (T75 F6) while the frame
// corner of T15 (a side infill in the same face plane) has been a 45 since
// turn 15: two laws for one joint. Now one. The number is a RECORD on the
// part (T50-F11: both boards leave the machine square, the corner is cut on
// site from the 20 mm allowance), so no outline moves and no golden can.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { infillCornerMitre, runEnd, maskDepthExtra } from '../src/engine/runs.js';
import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { dump } from '../scripts/t64-classify.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();
const U = (id) => S().units.find((u) => u.id === id);
const TOL = P.autoParts.topInfill.runGap;

// --- THE FUNCTION ------------------------------------------------------------

const flushEnd = (over) => ({
  kind: 'infill', blockedBy: 'u1', blockerWidth: over, blockerTop: 2400,
});

test('F22 . a corner end is a 45: the filler (the post, the other run\'s strip) does not stand in the face plane and the mitre comes anyway', () => {
  // THE DELTA: before tonight this was 0 (kind !== 'infill'); now it is the
  // same number the frame corner returns, the strip's own face height.
  assert.equal(infillCornerMitre({ kind: 'corner', x: 596 }, 100, 2400, TOL), 100);
  assert.equal(infillCornerMitre({ kind: 'corner', x: 596 }, 40, 2500, TOL), 40);
  // Both sides of a run; the x of the stop is not part of the question.
  assert.equal(infillCornerMitre({ kind: 'corner', x: 0 }, 60, 2500, TOL), 60);
  // No strip, no mitre: a face height of nothing turns no corner.
  assert.equal(infillCornerMitre({ kind: 'corner', x: 596 }, 0, 2400, TOL), 0);
  // A corner end carries no filler top and no filler width, and asks neither
  // question: the answer does not depend on the tolerance.
  assert.equal(infillCornerMitre({ kind: 'corner', x: 596 }, 100, 2400, 0), 100);
  assert.equal(infillCornerMitre({ kind: 'corner', x: 596 }, 100, 2400), 100);
});

test('F22 . the frame corner of T15 answers what it answered: flush is a 45, a T-joint beyond the tolerance is square', () => {
  // The plain case: a 100 mm gap over the units, a 120 mm filler beside them,
  // both finishing at 2400.
  assert.equal(infillCornerMitre(flushEnd(120), 100, 2400, 2), 100);
  // THE TOLERANCE CASE, unchanged: within the tolerance is flush ...
  assert.equal(infillCornerMitre({ ...flushEnd(120), blockerTop: 2402 }, 100, 2400, 2), 100);
  assert.equal(infillCornerMitre({ ...flushEnd(120), blockerTop: 2398 }, 100, 2400, 2), 100);
  // ... one millimetre past it is a T-joint, square.
  assert.equal(infillCornerMitre({ ...flushEnd(120), blockerTop: 2403 }, 100, 2400, 2), 0);
  assert.equal(infillCornerMitre({ ...flushEnd(120), blockerTop: 2600 }, 100, 2400, 2), 0);
  // The room for the cut is still asked of a side filler.
  assert.equal(infillCornerMitre(flushEnd(100), 100, 2400, 2), 100);
  assert.equal(infillCornerMitre(flushEnd(99), 100, 2400, 2), 0);
  // A lap (no `blockedBy`) is not a corner; a wall, an end panel and an open
  // end make none either.
  assert.equal(infillCornerMitre({ kind: 'infill', blockerWidth: 120, blockerTop: 2400 }, 100, 2400, 2), 0);
  for (const kind of ['wall', 'end-panel', 'open']) {
    assert.equal(infillCornerMitre({ ...flushEnd(120), kind }, 100, 2400, 2), 0);
  }
  assert.equal(infillCornerMitre(null, 100, 2400, 2), 0);
});

test('F22 . through runEnd: the post of a plain corner and the strip of a blind kit are both a corner end, both a 45, on either side', () => {
  const unitAt = (x, extra) => ({
    id: 'b', type: 'BUDTALL', position: { wall: 1, x_mm: x }, params: { ...defaultParamsFor('BUDTALL', P), ...extra },
  });
  const runOf = (unit) => ({
    wall: 1, units: [unit], left: unit.position.x_mm, right: unit.position.x_mm + unit.params.width, top: unit.params.height,
  });
  const room = { wallWidth: 3000, roomHeight: 2500 };
  for (const key of ['corner_post_left_mm', 'corner_butt_left_mm']) {
    const unit = unitAt(636, { [key]: P.corner.postMm });
    const end = runEnd(runOf(unit), 'left', room, P);
    assert.equal(end.kind, 'corner', key);
    assert.equal(end.x, 636 - P.corner.postMm);
    assert.equal(infillCornerMitre(end, 40, unit.params.height + 40, TOL), 40, `${key}: the left end is a 45`);
  }
  for (const key of ['corner_post_right_mm', 'corner_butt_right_mm']) {
    const unit = unitAt(1764, { [key]: P.corner.postMm });
    const end = runEnd(runOf(unit), 'right', room, P);
    assert.equal(end.kind, 'corner', key);
    assert.equal(end.x, 1764 + 600 + P.corner.postMm);
    assert.equal(infillCornerMitre(end, 40, unit.params.height + 40, TOL), 40, `${key}: the right end is a 45`);
  }
  // Nothing on the stop: the same unit's end is what it always was, no corner.
  const plain = unitAt(636, {});
  const end = runEnd(runOf(plain), 'left', room, P);
  assert.notEqual(end.kind, 'corner');
  assert.equal(infillCornerMitre(end, 40, plain.params.height + 40, TOL), 0);
});

// --- THE WHOLE ROAD, THROUGH THE STORE ----------------------------------------

/** T75 F6's corner: run A into the corner of wall 0, run B on the stop of wall 1. */
function corner(type = 'BUDTALL') {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  S().addUnit(type);
  const a = S().units[0].id;
  S().moveUnit(a, 4000, 0);
  S().addUnit(type);
  const b = S().units[1].id;
  S().setUnitWall(b, 1);
  S().moveUnit(b, 0, 0);
  return { a, b };
}

test('F22 . the probe table, after: the run on the stop carries the 45 at its corner end, as a record, and nothing else moves', () => {
  const { a, b } = corner();
  assert.equal(U(b).params.corner_post_left_mm, P.corner.postMm, 'B stands on the stop');
  const faceH = S().addTopInfill(b);
  assert.ok(faceH > 0, 'the strip exists');
  S().addTopInfill(a);

  const run = S().runElements[b].top_infill;
  assert.equal(run.role, 'owner');
  assert.equal(run.ends.left, 'corner', 'T75 F6: the run ends on the post');
  assert.equal(run.mitre.left, faceH, 'THE DELTA: the corner end is a 45, the strip\'s own height');
  assert.equal(run.mitre.right, 0, 'the open end\'s picture-frame 45 is `mitre_45`, not this record');
  assert.deepEqual(run.sideMitre, { left: 0, right: 0 }, 'no side filler carries the other half of a plan corner');
  assert.equal(run.offset, -P.corner.postMm, 'the strip still stops on the post\'s outer edge');

  const face = S().unitResult(b).panels.find((p) => p.id === 'INFILL-T-FACE');
  assert.ok(face);
  assert.deepEqual(face.meta.corner, { left: faceH, right: 0 }, 'the part says which end turns, and by how much');
  assert.deepEqual(face.meta.mitre_45, ['end'], 'the open end\'s own 45 is as it was');
  // T50-F11: a RECORD, not a cut. The board is the plain rectangle it was.
  const OVER = P.autoParts.fillerOversize;
  assert.deepEqual(face.cnc.outline, [[0, 0], [run.length + OVER, 0], [run.length + OVER, faceH + OVER], [0, faceH + OVER]]);
  assert.equal(face.box.x, -P.corner.postMm);
  assert.equal(face.box.w, run.length);
  // No side filler was conjured on the corner side.
  assert.equal(S().unitResult(b).panels.filter((p) => /^INFILL-[LR]-/.test(p.id)).length, 0);

  // Run A runs into the corner on wall 0 and meets the wall: no corner end of its own.
  const runA = S().runElements[a].top_infill;
  assert.notEqual(runA.ends.right, 'corner');
  assert.equal(runA.mitre.right, 0);
});

test('F22 . the same on a wall run (WUD on the stop)', () => {
  const { b } = corner('WUD');
  const faceH = S().addTopInfill(b);
  assert.ok(faceH > 0);
  const run = S().runElements[b].top_infill;
  assert.equal(run.ends.left, 'corner');
  assert.equal(run.mitre.left, faceH);
  assert.equal(S().unitResult(b).panels.find((p) => p.id === 'INFILL-T-FACE').meta.corner.left, faceH);
});

test('F22 . pulled off the stop, the 45 goes with the post (T75 F8: reversible by construction)', () => {
  const { b } = corner();
  const faceH = S().addTopInfill(b);
  assert.equal(S().runElements[b].top_infill.mitre.left, faceH);
  S().moveUnit(b, 1500, 0);
  assert.equal(U(b).params.corner_post_left_mm ?? 0, 0);
  const run = S().runElements[b].top_infill;
  assert.notEqual(run.ends.left, 'corner');
  assert.equal(run.mitre.left, 0);
  assert.equal(S().unitResult(b).panels.find((p) => p.id === 'INFILL-T-FACE').meta.corner.left, 0);
});

// --- THE GOLDENS: NO GOLDEN HAS A CORNER -------------------------------------

const CORNER_KEYS = ['corner_post_left_mm', 'corner_post_right_mm', 'corner_butt_left_mm', 'corner_butt_right_mm'];

test('F22 . the six hold, byte for byte: a lone cabinet carries no run element and no corner stop', () => {
  const base = JSON.parse(read('verify/t70/goldens-base.json'));
  const head = dump();
  for (const id of ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY']) {
    assert.equal(head[id].sha256, base[id].sha256, id);
    const params = defaultParamsFor(id, P);
    assert.equal(params.run_top_infill, undefined, `${id} carries a run element by default`);
    for (const key of CORNER_KEYS) assert.equal(params[key], undefined, `${id} carries ${key} by default`);
  }
});

test('F22 . golden-wall-mask.json holds: MASK-A recomputes to the fixture, and no case of it stands on a corner', () => {
  const golden = JSON.parse(read('fixtures/golden-wall-mask.json'));
  const c = golden.cases.find((x) => x.id === 'MASK-A');
  const r = computeCabinet({ ...defaultParamsFor('WUD', P), ...c.inputs }, P);
  const mask = r.panels.find((p) => p.part === 'MASK');
  assert.ok(mask);
  for (const key of ['id', 'part', 'role', 'material_role', 'finish_exposed', 'w', 'h', 'thickness', 'qty']) {
    assert.deepEqual(mask[key], c.panel[key], key);
  }
  assert.equal(mask.edging.code, c.panel.edging.code);
  assert.equal(mask.edging.len_m, c.panel.edging.len_m);
  assert.equal(mask.area_m2, c.panel.area_m2);
  assert.deepEqual(mask.box, c.panel.box);
  assert.equal(mask.h - c.inputs.depth, maskDepthExtra(P));
  // The gate is closed for every case: no run element, no corner stop.
  for (const x of golden.cases) {
    assert.equal(x.inputs.run_top_infill, undefined, `${x.id} carries a run element`);
    for (const key of CORNER_KEYS) assert.equal(x.inputs[key], undefined, `${x.id} carries ${key}`);
  }
  // And the mask's own road never passes the function: `infillCornerMitre` is
  // called in `runTopInfill` and nowhere else in the file.
  const src = read('src/engine/runs.js');
  const calls = src.split('infillCornerMitre(').length - 1;
  assert.equal(calls, 3, 'the definition and the two calls (left and right) of runTopInfill');
  const topInfill = src.slice(src.indexOf('function runTopInfill('), src.indexOf('export function runInfillParams('));
  assert.equal(topInfill.split('infillCornerMitre(').length - 1, 2);
});

// --- THE CLASSIFIER NAMES THE DELTA -------------------------------------------

test('F22 . scripts/t78-classify.d/f22.mjs names the gate, licenses runs.js, pins no golden', async () => {
  const frag = await import('../scripts/t78-classify.d/f22.mjs');
  assert.ok(frag.GATES.cornerEnd, 'the gate');
  assert.ok(frag.LICENSED['src/engine/runs.js'], 'the one file');
  assert.deepEqual(frag.LICENSED['src/engine/runs.js'].gates, ['cornerEnd']);
  assert.deepEqual(frag.GOLDENS, []);
  // Closed for every golden's params, open for the run element with a corner end.
  for (const id of ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY']) {
    assert.equal(frag.GATES.cornerEnd.opens(defaultParamsFor(id, P), id), false, id);
  }
  assert.equal(frag.GATES.cornerEnd.opens({ run_top_infill: { ends: { left: 'corner', right: 'open' } } }, 'BUDTALL'), true);
  assert.equal(frag.GATES.cornerEnd.opens({ run_top_infill: { ends: { left: 'wall', right: 'open' } } }, 'BUDTALL'), false);
  const live = frag.LIVENESS.cornerEnd();
  assert.equal(live.live, true, live.said);
  // Plain ASCII, as every T78 file.
  const text = read('scripts/t78-classify.d/f22.mjs');
  assert.ok(!/[\u2013\u2014]/.test(text), 'no em or en dash');
});
