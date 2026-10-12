// ─── T78 · F5 · THE L GROWS LEFT AND RIGHT ON ITS OWN ───────────────────────
//
// The owner, 11.10.2026: *"powiekszenie L shape szafek prawa lewa strona."*
//
// Arm A (along the unit's wall) is the L's `width`, arm B (along the adjacent
// wall) its `depth` (KIT_CORNER_L.lsp section 1). Each has its own figure and
// its own field (ARM A, ARM B), each is clamped alone: minimum = the arm depth
// plus the smallest leaf the profile hangs (`profile.corner.leafMinMm`),
// maximum = the room (room refuses first), then the neighbours. The doors,
// shelves, plinth, worktop and mask follow each arm because the engine cuts
// the L from W and D (T75 F4). All three kits.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { cornerSpec, lArmMinMm } from '../src/engine/corners.js';
import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();
const U = (id) => S().units.find((u) => u.id === id);

function room() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
}

test('F5 · the numbers live in profile.corner (T75 F4 deleted cornerUnit, its test holds): leafMinMm 200 proposed, wallLeafMaxMm 700 the owner\'s', () => {
  assert.equal(P.cornerUnit, undefined, 'T75 F4 kasacja stands');
  assert.equal(P.corner.leafMinMm, 200);
  assert.equal(P.corner.wallLeafMaxMm, 700);
  assert.deepEqual([cornerSpec(P).leafMinMm, cornerSpec(P).wallLeafMaxMm], [200, 700]);
  assert.match(read('src/engine/profile.js'), /wallLeafMaxMm: 700,\s*\/\/ owner 11\.10\.2026/);
  assert.match(read('src/engine/profile.js'), /leafMinMm: 200,\s*\/\/ T78 proposed, owner to confirm/);
});

test('F5 · the least an arm can be: its depth plus the smallest leaf, for each kit', () => {
  for (const [type, depthKey] of [['CORNER_L_BASE', 'baseUnit'], ['CORNER_L_WALL', 'wallUnit'], ['CORNER_L_WARDROBE', 'wardrobe']]) {
    const unit = { type, params: defaultParamsFor(type, P) };
    assert.equal(lArmMinMm(unit, P), P[depthKey].defaults.depth + 200, type);
  }
  assert.equal(lArmMinMm({ type: 'CORNER_L_BASE', params: { arm_mm: 500 } }, P), 700, 'the unit\'s own arm wins');
});

test('F5 · arm A and arm B move ALONE through updateUnitParams; the engine follows each', () => {
  room();
  const l = S().addUnit('CORNER_L_BASE').id;
  S().addDoors(l);
  assert.deepEqual([U(l).params.width, U(l).params.depth], [900, 900]);
  S().updateUnitParams(l, { width: 1200 });
  assert.deepEqual([U(l).params.width, U(l).params.depth], [1200, 900], 'arm A grew, arm B stayed');
  S().updateUnitParams(l, { depth: 1100 });
  assert.deepEqual([U(l).params.width, U(l).params.depth], [1200, 1100], 'arm B grew, arm A stayed');
  const r = computeCabinet(U(l).params, P);
  const cl = r.derived.corner_l;
  assert.deepEqual([cl.width, cl.depth], [1200, 1100]);
  const doorA = r.panels.find((p) => p.id === 'CL01-A-F');
  const doorB = r.panels.find((p) => p.id === 'CL01-B-F');
  assert.ok(doorA.w > doorB.w, 'the longer arm hangs the wider leaf');
  assert.equal(r.panels.find((p) => p.id === 'TOP-L').w, 1200 - 2 * P.board.thickness);
  assert.equal(r.panels.find((p) => p.id === 'TOP-L').h, 1100 - 2 * P.board.thickness);
  const plinthA = r.panels.find((p) => p.id === 'PLINTH-A');
  const plinthB = r.panels.find((p) => p.id === 'PLINTH-B');
  assert.ok(plinthA && plinthB && plinthA.w !== plinthB.w, 'two plinths, each its own arm');
});

test('F5 · the minimum: an arm shorter than its depth plus the smallest leaf is held there and said in words', () => {
  room();
  const l = S().addUnit('CORNER_L_BASE').id;
  const least = P.baseUnit.defaults.depth + P.corner.leafMinMm;
  const a = S().updateUnitParams(l, { width: 600 });
  assert.equal(U(l).params.width, least);
  assert.match(a.notices.join(' '), /Arm A limited to 758 mm/);
  const b = S().updateUnitParams(l, { depth: 100 });
  assert.equal(U(l).params.depth, least);
  assert.match(b.notices.join(' '), /Arm B limited to 758 mm: the arm's own depth plus the smallest leaf \(200 mm\)/);
  assert.equal(computeCabinet(U(l).params, P).warnings.some((w) => w.code === 'CORNER_L_REFUSED'), false, 'the L is still an L at its least');
});

test('F5 · the maximum: the room refuses first (roomFitRefusalFor), then the neighbour on that wall limits the arm', () => {
  room();
  const l = S().addUnit('CORNER_L_BASE').id;
  const no = S().roomFitRefusalFor(l, { width: 4100 });
  assert.ok(no, 'the room refuses a 4100 arm on a 4000 wall');
  assert.match(no.message, /4000|room|wall/i);
  // Arm B: the room's 3000 deep wall.
  const noB = S().roomFitRefusalFor(l, { depth: 3100 });
  assert.ok(noB);
  // A neighbour on wall A stops arm A: the clamp names it.
  const a = S().addUnit('BUD', { near: l, side: 'R' }).id;
  const res = S().updateUnitParams(l, { width: 1500 });
  assert.equal(U(l).params.width, 900, 'held by the Standard standing at its arm A end');
  assert.match(res.notices.join(' '), /limited|cannot grow/);
  assert.ok(U(a));
});

test('F5 · the wall L and the wardrobe L take the same two fields', () => {
  room();
  const w = S().addUnit('CORNER_L_WALL').id;
  S().updateUnitParams(w, { width: 800, depth: 700 });
  assert.deepEqual([U(w).params.width, U(w).params.depth], [800, 700]);
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const x = S().addUnit('CORNER_L_WARDROBE').id;
  S().updateUnitParams(x, { depth: 1200 });
  assert.deepEqual([U(x).params.width, U(x).params.depth], [1000, 1200]);
});

test('F5 · the surfaces: the size window and the panel say ARM A / ARM B for an L, the scene draws the arm B figure', () => {
  const modal = read('src/components/UnitSizeModal.jsx');
  assert.match(modal, /isCornerLKit/);
  assert.match(modal, /corner \? 'Arm A' : 'Width'/);
  assert.match(modal, /corner \? 'Arm B' : 'Depth'/);
  assert.match(modal, /\{third && \(/, 'the depth field opens for the L as for the wardrobe wall unit');
  const panel = read('src/components/RightPanel.jsx');
  assert.match(panel, /\['width', 'Arm A'\], \['height', 'Height'\], \['depth', 'Arm B'\]/);
  const view = read('src/3d/UnitView.jsx');
  assert.match(view, /isCornerLKit\(unit\.type\) && result\.derived\?\.corner_l/);
  assert.match(view, /field: 'depth', at: \{ x: e\.clientX, y: e\.clientY \}, row: row\.key,\s*\}\) : null\}\s*\/>\s*\);\s*\}\)\(\)\}/);
});
