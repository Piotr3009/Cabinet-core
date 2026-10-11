// ─── T78 · F2 · THE L WORKTOP AND THE L MASK ARE L-SHAPED ───────────────────
//
// The owner, 11.10.2026: *"dolna maskujaca plyta nie wycina sie w ksztalcie L
// oraz worktop nie wycina sie w ksztalcie L."*
//
// THE PROBE (verify/t78/f02-probe.md), as assertions: the lone L's slab stood
// 10 mm off wall B (row 5); a record over the L and the cabinets along its arms
// fell through to ONE rectangle as deep as the L (rows 8 to 12: 1520 x 948 over
// a 558 deep Standard); the mask under an L wall unit was the run's rectangle,
// W x (D + 10), over the whole corner square (rows 17 to 21). Now: the L slab
// is flush at both walls, the straight slabs along its arms butt it at the arm
// ends with the joint record of T75 F5, and the mask under an L is ONE L board
// with the mask's depth law on both arms.

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { worktopSpec } from '../src/engine/worktop.js';
import { runMaskParams } from '../src/engine/runs.js';
import { buildBom } from '../src/engine/bom.js';
import { roomWalls, rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { goldenOf } from '../scripts/t75-golden.mjs';
import { T78_GOLDENS } from '../scripts/t78-goldens.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const S = () => useProjectStore.getState();
const U = (id) => S().units.find((u) => u.id === id);
const GAP = P.room.wallBackClearance;
const SPEC = worktopSpec(P);
const OVER = SPEC.frontOverhang;
const SIDE = SPEC.sideOverhang;

function room() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
}
const slabs = () => S().worktopsOf();
const area = (pts) => {
  let a = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2 / 1e6;
};

test('F2 · the lone L slab: shape L, six vertices, flush at BOTH walls, the overhang on both fronts and the inner corner', () => {
  room();
  const l = S().addUnit('CORNER_L_BASE').id;
  assert.ok(S().addWorktop([l]).ok);
  const [w] = slabs();
  const g = w.geometry;
  assert.equal(g.shape, 'L');
  assert.equal(g.outline.length, 6, 'an L has six vertices');
  const reach = P.baseUnit.defaults.depth + P.doors.gap + U(l).params.front_t + OVER;
  // Along wall A the L's BACK-B stands its wall gap off wall B, so the inner
  // corner is the gap plus the reach from wall B, and the reach alone from
  // wall A; the slab itself runs to BOTH walls.
  assert.deepEqual(g.outline, [
    [0, 0], [GAP + 900 + SIDE, 0], [GAP + 900 + SIDE, reach], [GAP + reach, reach], [GAP + reach, 900 + SIDE], [0, 900 + SIDE],
  ], 'the probe measured x from 10: the wall gap was left bare');
  assert.equal(g.x, 0, 'flush at wall B');
  assert.equal(g.z, 0, 'flush at wall A');
  assert.equal(g.d, 900 + SIDE);
});

test('F2 · the right-hand L is the mirror: flush at wall B at the wall\'s own end', () => {
  room();
  S().addUnit('CORNER_L_BASE');
  const l2 = S().addUnit('CORNER_L_BASE').id;
  assert.equal(U(l2).params.corner_side, 'right');
  assert.ok(S().addWorktop([l2]).ok);
  const w = slabs().find((s) => s.unitIds.includes(l2));
  const xs = w.geometry.outline.map((p) => p[0]);
  assert.equal(Math.max(...xs), 4000, 'the slab runs to wall B (wall 0\'s end)');
  assert.equal(Math.min(...xs), 4000 - GAP - 900 - SIDE);
});

test('F2 · the L and a run along arm A: the L slab and ONE straight slab, 606 deep, butting the arm A end with a joint record', () => {
  room();
  const l = S().addUnit('CORNER_L_BASE').id;
  const a = S().addUnit('BUD', { near: l, side: 'R' }).id;
  assert.ok(S().addWorktop([l, a]).ok);
  const list = slabs();
  assert.equal(list.length, 2, JSON.stringify(list.map((s) => s.slabId)));
  const lSlab = list.find((s) => s.geometry.shape === 'L');
  const straight = list.find((s) => s.geometry.shape !== 'L');
  assert.ok(lSlab && straight);
  assert.equal(straight.geometry.d, 558 + P.doors.gap + U(a).params.front_t + OVER, 'the run\'s own depth, not the L\'s 948');
  assert.equal(straight.geometry.x, GAP + 900, 'it starts AT the arm A end: no overhang into the L slab');
  assert.equal(straight.geometry.overhang.left, 0);
  assert.equal(straight.geometry.butts, 'L');
  assert.deepEqual(straight.joint.at, { wall: 0, x: GAP + 900, depth: straight.geometry.d });
  assert.equal(straight.joint.arm, 'A');
  assert.equal(straight.joint.kind, SPEC.joint.kind);
  assert.equal(straight.joint.readiness, 'manual');
  assert.equal(lSlab.geometry.overhang.armA, 0, 'the L slab\'s arm A end butts the run too');
  assert.equal(lSlab.geometry.outline[1][0], GAP + 900);
});

test('F2 · the L and runs along BOTH arms: three slabs and two joints, the wall B slab set to the arm B end', () => {
  room();
  const l = S().addUnit('CORNER_L_BASE').id;
  const a = S().addUnit('BUD', { near: l, side: 'R' }).id;
  const b = S().addUnit('BUD', { near: l, side: 'L' }).id;
  assert.equal(U(b).position.wall, 3);
  assert.ok(S().addWorktop([l, a, b]).ok);
  const list = slabs();
  assert.equal(list.length, 3);
  const onB = list.find((s) => s.geometry.wall === 3);
  assert.ok(onB);
  assert.equal(onB.geometry.x + onB.geometry.w, 3000 - GAP - 900, 'its right end is the arm B end');
  assert.equal(onB.geometry.overhang.right, 0);
  assert.deepEqual(onB.joint.at, { wall: 3, x: 3000 - GAP - 900, depth: onB.geometry.d });
  assert.equal(onB.joint.arm, 'B');
  const lSlab = list.find((s) => s.geometry.shape === 'L');
  assert.equal(lSlab.geometry.d, 900, 'the arm B end butts the wall B run: no side overhang');
  assert.equal(list.filter((s) => s.joint).length, 2);
});

test('F2 · the BOM counts the L slab\'s TRUE area and names it L-shaped; the straight slabs are their own lines', () => {
  room();
  const l = S().addUnit('CORNER_L_BASE').id;
  const a = S().addUnit('BUD', { near: l, side: 'R' }).id;
  S().addWorktop([l, a]);
  const entries = S().units.map((u) => ({ unit: u, result: computeCabinet(u.params, P) }));
  const bom = buildBom(entries, { design: S().project.design, profile: P, room: S().project.room });
  const rows = JSON.stringify(bom);
  assert.match(rows, /L-shaped/);
  const lSlab = slabs().find((s) => s.geometry.shape === 'L');
  const want = Math.round(area(lSlab.geometry.outline) * 10000) / 10000;
  assert.match(rows, new RegExp(`"area_m2":${want}`), `the true area ${want} m2 is on the line`);
  assert.match(rows, /connector bolts/);
});

test('F2 · the mask under an L wall unit is ONE L board: six vertices, the mask depth law on both arms, front material, true area', () => {
  const r = computeCabinet({
    ...defaultParamsFor('CORNER_L_WALL', P), unit_num: '01', doors: true, bottom_mask: true,
  }, P);
  const masks = r.panels.filter((p) => p.part === 'MASK');
  assert.equal(masks.length, 1);
  const m = masks[0];
  const g = P.autoParts.mask.depthExtra ?? GAP;
  const arm = P.wallUnit.defaults.depth;
  assert.equal(m.id, 'MASK-L');
  assert.equal(m.material_role, 'front');
  assert.equal(m.thickness, P.autoParts.mask.thickness ?? 25);
  assert.deepEqual(m.cnc.outline, [[0, 0], [600 + g, 0], [600 + g, arm + g], [arm + g, arm + g], [arm + g, 600 + g], [0, 600 + g]]);
  assert.equal(m.area_m2, Math.round((((600 + g) ** 2) - ((600 - arm) ** 2)) / 1e6 * 1e6) / 1e6);
  assert.deepEqual(m.box, {
    x: -g, y: -m.thickness, z: -g, w: 600 + g, h: m.thickness, d: 600 + g,
  });
  assert.equal(m.meta.planOutline.length, 6, 'the scene extrudes the L');
  // The right hand is the mirror.
  const r2 = computeCabinet({
    ...defaultParamsFor('CORNER_L_WALL', P), unit_num: '01', doors: true, bottom_mask: true, corner_side: 'right',
  }, P);
  const m2 = r2.panels.find((p) => p.part === 'MASK');
  assert.equal(m2.box.x, 0);
  assert.equal(m2.area_m2, m.area_m2);
});

test('F2 · in a run the L is its own mask segment: the wall unit beside it owns a 410 deep board from the arm end', () => {
  room();
  const l = S().addUnit('CORNER_L_WALL').id;
  const a = S().addUnit('WUD', { near: l, side: 'R' }).id;
  for (const id of [l, a]) S().updateUnitParams(id, { bottom_mask: true });
  const map = runMaskParams(S().units, P);
  assert.equal(map.get(l).role, 'owner');
  assert.deepEqual(map.get(l).unitIds, [l], 'the L alone');
  assert.equal(map.get(a).role, 'owner', 'the probe found it a MEMBER of the L\'s rectangle');
  assert.equal(map.get(a).depth, 400 + (P.autoParts.mask.depthExtra ?? GAP));
  const ra = computeCabinet(U(a).params, P);
  assert.equal(ra.panels.filter((p) => p.part === 'MASK').length, 1, 'its own board');
  const rl = computeCabinet(U(l).params, P);
  assert.equal(rl.panels.find((p) => p.part === 'MASK').id, 'MASK-L');
});

test('F2 · a straight mask under a plain run is untouched (the run\'s rectangle, the six goldens\' law)', () => {
  const r = computeCabinet({ ...defaultParamsFor('WUD', P), unit_num: '01', doors: true, bottom_mask: true }, P);
  const m = r.panels.find((p) => p.part === 'MASK');
  assert.equal(m.id, 'MASK');
  assert.equal(m.cnc.outline.length, 4);
});

// ═══ THE GOLDENS ════════════════════════════════════════════════════════════

test('GOLDEN · golden-corner-l-mask.json and golden-corner-l-worktop.json hold the engine byte for byte', () => {
  for (const name of ['golden-corner-l-mask.json', 'golden-corner-l-worktop.json']) {
    const g = T78_GOLDENS.find((x) => x.file === name);
    assert.ok(g, `${name} is named in scripts/t78-goldens.mjs`);
    const path = `${ROOT}fixtures/${name}`;
    assert.ok(existsSync(path), `${name} exists`);
    const file = JSON.parse(readFileSync(path, 'utf8'));
    const got = g.make ? g.make() : goldenOf(file.params, P);
    assert.deepEqual(got, file.expected, `${name} moved`);
  }
});
