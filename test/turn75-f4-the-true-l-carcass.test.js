// ─── T75 · F4 · THE TRUE L CARCASS, THE OWNER'S LAW, LISP FIRST ────────────
//
// The owner's recorded rule (Petros, 23.09.2026, list 11):
//
//   *"one L-shaped board cut on the CNC, flat-face door overlap, no 45° cuts."*
//
// and the orders of 9.10.2026, *"daj od razu narożniki przemyślane"*, *"lisp
// najpierw"*. The law is `reference/lisp/KIT_CORNER_L.lsp` (written before any
// of this code); its NUMBERS block (section 9) is asserted here board by board
// against what the engine cuts. Then the doors (the covered one, the
// overlapping one, which opens first), the kasacja of T30 and the two old names
// kept forever, the migration of a T30 save, the placement law (a room corner
// only), the clearance view, the library rows, the 3D board and the goldens.

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import {
  TYPE_ALIASES, UNIT_NUM_PREFIX, UNIT_TYPES, UNIT_TYPE_ORDER, defaultParamsFor, getCategory, getUnitType,
  isCornerLKit, resolveTypeId,
} from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { KITCHEN_LIBRARY } from '../src/engine/library.js';
import { cornerLPlan } from '../src/engine/cornerL.js';
import { cornersOf, lClearanceView } from '../src/engine/corners.js';
import { NEIGHBOUR, clearanceMatrix, frontClearances } from '../src/engine/frontClearance.js';
import { joineryLayers, panelPlacement } from '../src/engine/joinery.js';
import { panelSolids } from '../src/3d/panelSolid.js';
import { migrateRoom, rectCorners, roomWalls } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { goldenOf } from '../scripts/t75-golden.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();
const U = (id) => S().units.find((u) => u.id === id);
const KITS = [
  ['CORNER_L_BASE', 'BUD', 'CL', 'cornerBase'],
  ['CORNER_L_WALL', 'WUD', 'CW', 'cornerWall'],
  ['CORNER_L_WARDROBE', 'WARDROBE', 'CX', 'cornerWardrobe'],
];
// 15.10.2026: a new L opens as a BI-FOLD pair (the owner's proposal, T78 F8's
// law, test/turn78-f08-the-bifold.test.js). This file is T75's law of the PAIR
// of two carcass-hung leaves, which stays a choice (`corner_doors: null`).
const L = (type = 'CORNER_L_BASE', over = {}) => computeCabinet({
  ...defaultParamsFor(type, P), unit_num: 'CL01', doors: true, corner_doors: null, ...over,
}, P);
const panelOf = (r, id) => r.panels.find((p) => p.id === id);
const pocketsOn = (p, layer) => (p.cnc.pockets || []).filter((k) => k.layer === layer);

// ═══ THE PROBE (verify/t75/p02-probe.md, F4 rows), AS ASSERTIONS ═══════════

test('PROBE · the T30 type is gone, both its names read as the true L forever', () => {
  assert.equal(UNIT_TYPES.L_SHAPE, undefined, 'T30 L_SHAPE is deleted (kasacja)');
  assert.deepEqual({ ...TYPE_ALIASES }, { CORNER: 'CORNER_L_BASE', L_SHAPE: 'CORNER_L_BASE' });
  assert.equal(resolveTypeId('CORNER'), 'CORNER_L_BASE');
  assert.equal(getUnitType('L_SHAPE'), UNIT_TYPES.CORNER_L_BASE, 'no silent WARDROBE fallback');
  assert.equal(UNIT_TYPE_ORDER.includes('L_SHAPE'), false);
  assert.equal(UNIT_NUM_PREFIX.L_SHAPE, undefined);
});

test('PROBE · the arm input and the profile block: corner_arm_mm and cornerUnit are gone', () => {
  const cab = read('src/engine/cabinet.js');
  assert.ok(!/corner_arm_mm/.test(cab), 'cabinet.js still reads corner_arm_mm');
  assert.ok(!/P\.cornerUnit|profile\.cornerUnit/.test(cab), 'cabinet.js still reads cornerUnit');
  assert.equal(P.cornerUnit, undefined);
  assert.equal(migrateCabinetProfile({}).cornerUnit, undefined);
  // T30's builder cut BOTTOM-A / TOP-B rectangles; nothing does now.
  assert.ok(!/-BOTTOM-A|-TOP-B|`\$\{unitNum\}-\$\{name\}-A`/.test(cab));
});

test('PROBE · the library rows: T30\'s row and the two held-open L rows are replaced by the true L', () => {
  const ids = KITCHEN_LIBRARY.flatMap((g) => g.items || []).map((e) => e.id);
  for (const gone of ['l-shape-unit', 'l-shape', 'l-shape-wall']) assert.equal(ids.includes(gone), false, gone);
  const base = KITCHEN_LIBRARY.find((g) => g.id === 'base-units').items.find((e) => e.id === 'corner-l');
  const wall = KITCHEN_LIBRARY.find((g) => g.id === 'wall-units').items.find((e) => e.id === 'corner-l-wall');
  assert.equal(base.typeId, 'CORNER_L_BASE');
  assert.equal(base.label, 'Corner L');
  assert.equal(wall.typeId, 'CORNER_L_WALL');
  assert.equal(wall.label, 'Corner L wall');
  assert.ok(getCategory('wardrobe').types.includes('CORNER_L_WARDROBE'));
  assert.equal(UNIT_TYPES.CORNER_L_WARDROBE.label, 'Corner L wardrobe');
});

test('PROBE · cnc.outline is the real L and area_m2 its real area, not the bounding rectangle', () => {
  const r = L();
  const top = panelOf(r, 'TOP-L');
  assert.equal(top.cnc.outline.length, 86);
  assert.equal(top.area_m2, 0.64152, 'the L, not 864 x 864');
  assert.notEqual(top.area_m2, (864 * 864) / 1e6);
});

// ═══ THE KITS ══════════════════════════════════════════════════════════════

test('F4 · three kits, the parent family to the letter, corner and own depth, LISP KIT_CORNER_L', () => {
  for (const [id, parent, prefix, block] of KITS) {
    const t = UNIT_TYPES[id];
    const p = UNIT_TYPES[parent];
    assert.ok(t, id);
    assert.equal(t.corner, true);
    assert.equal(t.ownDepth, true);
    assert.equal(t.lisp, 'KIT_CORNER_L.lsp');
    assert.equal(t.parentType, parent);
    for (const key of ['heightGroup', 'family', 'hingeRule', 'cupRule', 'legs', 'legSource', 'hangers', 'mount']) {
      assert.deepEqual(t[key], p[key], `${id}.${key} is not ${parent}'s`);
    }
    assert.deepEqual(t.carcass, {
      top: 'none', back: 'none', sides: 'none', bottom: 'none',
    });
    assert.equal(UNIT_NUM_PREFIX[id], prefix);
    assert.equal(t.defaultsKey, `${block}.defaults`);
    assert.ok(isCornerLKit(id));
  }
  assert.equal(isCornerLKit('BUD'), false);
});

test('F4 · the defaults are the profile\'s, every one marked proposed, with migrate lines', () => {
  assert.deepEqual(P.cornerBase.defaults, { width: 900, height: 770, depth: 900 });
  assert.deepEqual(P.cornerWall.defaults, {
    width: 600, height: 720, depth: 600, mountHeight: 1500,
  });
  assert.equal(P.cornerWardrobe.defaults.width, 1000);
  assert.equal(P.cornerWardrobe.defaults.depth, 1000);
  assert.equal(P.cornerWardrobe.defaults.height, 2150);
  const src = read('src/engine/profile.js');
  for (const block of ['cornerBase', 'cornerWall', 'cornerWardrobe']) {
    const at = src.indexOf(`  ${block}: {`);
    assert.ok(at > 0, block);
    assert.match(src.slice(at, at + 160), /T75 proposed, owner to confirm/, `${block} is not marked proposed`);
    assert.deepEqual(migrateCabinetProfile({})[block], P[block], `${block} has no migrate line`);
  }
  // The arm is the family's own depth; the hand arrives 'left'; no other kit carries either key.
  assert.equal(defaultParamsFor('CORNER_L_BASE', P).arm_mm, P.baseUnit.defaults.depth);
  assert.equal(defaultParamsFor('CORNER_L_WALL', P).arm_mm, P.wallUnit.defaults.depth);
  assert.equal(defaultParamsFor('CORNER_L_WARDROBE', P).arm_mm, P.wardrobe.defaults.depth);
  assert.equal(defaultParamsFor('CORNER_L_BASE', P).corner_side, 'left');
  for (const id of ['BUD', 'WUD', 'WARDROBE', 'BUDR', 'BUDR4', 'PANTRY']) {
    const d = defaultParamsFor(id, P);
    assert.equal('arm_mm' in d || 'corner_side' in d, false, `${id} grew an L key`);
  }
});

// ═══ BOARD BY BOARD, AGAINST KIT_CORNER_L.lsp SECTION 9 (900 x 900 x 558 x 770 x 18) ═══

test('LISP · the plan in its own frames is the NUMBERS block, to the hundredth', () => {
  const plan = cornerLPlan({
    W: 900, D: 900, d: 558, H: 770, G: 18,
  }, P);
  assert.equal(plan.valid, true);
  assert.deepEqual(plan.top.nominal, [[0, 0], [864, 0], [864, 540], [540, 540], [540, 864], [0, 864]]);
  assert.equal(plan.top.area, 641520);
  assert.equal(plan.top.frontLen, 648);
  assert.equal(plan.top.outline.length, 86);
  // the tabs per edge (u centres) and the first tab, shoulder 13
  assert.deepEqual(plan.top.joints.map((j) => (j ? j[4] : null)), [[95, 769], [95, 445], null, null, [95, 445], [95, 769]]);
  assert.deepEqual(plan.top.outline.slice(1, 11), [
    [70, 0], [76, 0], [76, -13], [70, -13], [70, -18], [120, -18], [120, -13], [114, -13], [114, 0], [120, 0],
  ]);
  assert.deepEqual(plan.top.bones, [
    [65, -18, 125, 0], [739, -18, 799, 0], [864, 65, 882, 125], [864, 415, 882, 475],
    [415, 864, 475, 882], [65, 864, 125, 882], [-18, 739, 0, 799], [-18, 65, 0, 125],
  ]);
  assert.deepEqual([plan.top.relief.cx, plan.top.relief.cy, plan.top.relief.r].map((v) => Math.round(v * 10000) / 10000),
    [542.8284, 542.8284, 4]);
  // SHELF-L
  assert.deepEqual(plan.shelf.nominal, [[0, 0], [862, 0], [862, 520], [520, 520], [520, 862], [0, 862]]);
  assert.equal(plan.shelf.area, 626080);
  assert.equal(plan.shelf.frontLen, 684);
  assert.equal(Math.round(plan.shelf.relief.cx * 10000) / 10000, 522.8284);
  // BACK-B
  assert.equal(plan.backB.len, 882);
  assert.equal(plan.backB.outline.length, 34);
  assert.deepEqual(plan.backB.outline.slice(4, 14), [
    [0, 700], [0, 694], [-13, 694], [-13, 700], [-18, 700], [-18, 650], [-13, 650], [-13, 656], [0, 656], [0, 650],
  ]);
  assert.deepEqual(plan.backB.bones, [[-18, 645, 0, 705], [-18, 355, 0, 415], [-18, 65, 0, 125]]);
  const sockets = plan.backB.pockets;
  assert.deepEqual(sockets.slice(0, 3).map((k) => [k[1], k[2] + 25.5, k[3]]), [[873, 95, 888], [873, 385, 888], [873, 675, 888]]);
  const tb = sockets.slice(3);
  assert.deepEqual([...new Set(tb.map((k) => k[1] + 25.5))], [95, 769]);
  assert.deepEqual(tb.slice(0, 2).map((k) => [k[2], k[4]]), [[761, 776], [-6, 9]]);
  const holes = plan.backB.holes;
  assert.ok(holes.filter((h) => h[1] === 'puzzle' && h[2] === 874).length === 6, 'far-end holes at X 874');
  assert.deepEqual(holes.filter((h) => h[1] === 'puzzle' && h[2] !== 874).map((h) => h[3]).sort((a, b) => a - b),
    [8, 8, 8, 8, 762, 762, 762, 762]);
  assert.deepEqual(holes.filter((h) => h[1] === 'screw' && h[2] === 873).map((h) => h[3]), [50, 240, 530, 720]);
  assert.deepEqual([...new Set(holes.filter((h) => h[1] === 'screw' && h[2] !== 873).map((h) => h[2]))], [50, 432, 814]);
  // LEGS, min corners in the room
  assert.deepEqual(plan.legs.map((l) => [l.name, l.x, l.y]), [
    ['L1', 50, 50], ['L2', 804, 50], ['L3', 804, 430], ['L4', 430, 430], ['L5', 430, 804], ['L6', 50, 804],
  ]);
});

test('LISP · the wall and wardrobe defaults of section 9', () => {
  const wall = cornerLPlan({
    W: 600, D: 600, d: 400, H: 720, G: 18, mount: 'W',
  }, P);
  assert.deepEqual(wall.top.nominal, [[0, 0], [564, 0], [564, 382], [382, 382], [382, 564], [0, 564]]);
  assert.equal(wall.top.area, 284972);
  assert.deepEqual(wall.top.joints[0][4], [95, 469]);
  assert.deepEqual(wall.top.joints[1][4], [95, 287]);
  assert.equal(Math.round(wall.top.relief.cx * 10000) / 10000, 384.8284);
  assert.equal(wall.shelf.area, 275844);
  assert.equal(wall.backB.len, 582);
  assert.deepEqual(wall.backB.bones.map((b) => (b[1] + b[3]) / 2).sort((a, b) => a - b), [95, 360, 625]);
  assert.deepEqual(wall.legs, []);
  assert.deepEqual(wall.hangers.backA, [570, 662, 600, 720]);
  assert.deepEqual(wall.hangers.backB, [552, 662, 582, 720]);
  assert.deepEqual(wall.hangers.sideL.map((h) => [h[0], h[1]]), [[361, 667], [329, 667]]);
  assert.deepEqual(wall.hangers.sideR.map((h) => [h[0], h[1]]), [[21, 667], [53, 667]]);
  const ward = cornerLPlan({
    W: 1000, D: 1000, d: 568, H: 2150, G: 18, mount: 'X',
  }, P);
  assert.equal(ward.top.area, 757900);
  assert.deepEqual(ward.top.joints[0][4], [95, 869]);
  assert.deepEqual(ward.top.joints[1][4], [95, 455]);
  assert.equal(Math.round(ward.top.relief.cx * 10000) / 10000, 552.8284);
  assert.deepEqual(ward.backB.bones.map((b) => (b[1] + b[3]) / 2).sort((a, b) => a - b), [95, 1075, 2055]);
  assert.deepEqual(ward.legs.map((l) => [l.x, l.y]), [[50, 50], [904, 50], [904, 440], [440, 440], [440, 904], [50, 904]]);
  // Not an L: refused in words (CL:validP).
  const no = cornerLPlan({
    W: 560, D: 900, d: 558, H: 770, G: 18,
  }, P);
  assert.equal(no.valid, false);
  assert.match(no.refusal, /both arms must reach past the corner square/);
});

test('ENGINE · the base L cuts the seven boards where the LISP puts them (left hand = the LISP\'s frame copied)', () => {
  const r = L('CORNER_L_BASE', { shelves: 1 });
  const ids = r.panels.filter((p) => p.role !== 'front').map((p) => p.id);
  assert.deepEqual(ids, ['BACK-A', 'BACK-B', 'SIDE-A', 'SIDE-B', 'TOP-L', 'BOTTOM-L', 'SHELF-L-1']);
  const box = (id) => panelOf(r, id).box;
  assert.deepEqual(box('BACK-A'), {
    x: 0, y: 0, z: 0, w: 900, h: 770, d: 18,
  });
  assert.deepEqual(box('BACK-B'), {
    x: 0, y: 0, z: 18, w: 18, h: 770, d: 882,
  });
  assert.deepEqual(box('SIDE-A'), {
    x: 882, y: 0, z: 18, w: 18, h: 770, d: 540,
  });
  assert.deepEqual(box('SIDE-B'), {
    x: 18, y: 0, z: 882, w: 540, h: 770, d: 18,
  });
  assert.deepEqual(box('TOP-L'), {
    x: 18, y: 752, z: 18, w: 864, h: 18, d: 864,
  });
  assert.deepEqual(box('BOTTOM-L'), {
    x: 18, y: 0, z: 18, w: 864, h: 18, d: 864,
  });
  // The L boards' CNC is the LISP's, walked and relieved.
  for (const id of ['TOP-L', 'BOTTOM-L']) {
    const p = panelOf(r, id);
    assert.equal(p.cnc.outline.length, 86);
    assert.equal(pocketsOn(p, P.puzzle.layers.dogbone).length, 8);
    // 17.10.2026 (KIT_CORNER_L.lsp section 4), the owner: *"nie, nie dodawaj
    // wiercenia, dodaj jeden layer w samym cornerze okolo 40 mm w kazda strone
    // na linii L shape i nazwij to corner 4 mm"*: the inner corner's relief
    // circle (r 4 at (542.8284, 542.8284) until that morning; cornerL.js still
    // computes it as the record) is not drawn; a CORNER_4MM mark at v3
    // (540, 540) along the two fronts stands in its place. 16:10 (*"jeden L
    // wektor ... obok linii"*): ONE open L walked the outline's way, in along
    // the front from v2, the corner, out along the front toward v4.
    assert.deepEqual(p.cnc.curves, []);
    assert.deepEqual(p.cnc.marks, [
      { layer: 'CORNER_4MM', from: [580, 540], to: [540, 580], pts: [[580, 540], [540, 540], [540, 580]] },
    ]);
    assert.equal(p.cnc.holes.length, 0, 'the L boards carry no hole (KIT_BUD drills no leg plate)');
  }
  const shelf = panelOf(r, 'SHELF-L-1');
  assert.deepEqual(shelf.cnc.outline, [[0, 0], [862, 0], [862, 520], [520, 520], [520, 862], [0, 862]]);
  assert.deepEqual(shelf.cnc.marks, [
    { layer: 'CORNER_4MM', from: [560, 520], to: [520, 560], pts: [[560, 520], [520, 520], [520, 560]] },
  ], 'the shelf\'s inner corner, the same law');
  assert.equal(shelf.area_m2, 0.62608);
  // CARCASS m2 (no shelves): 3.487
  const carcass = r.panels.filter((p) => ['BACK-A', 'BACK-B', 'SIDE-A', 'SIDE-B', 'TOP-L', 'BOTTOM-L'].includes(p.id));
  assert.equal(Math.round(carcass.reduce((s, p) => s + p.area_m2, 0) * 1000) / 1000, 3.487);
  // The cut list: the L's bounding size, its true m2, its two fronts banded.
  assert.ok(r.csvLines.includes('CL01,TOP-L,864,864,>,0.65,0.642'), r.csvLines.join('\n'));
  assert.ok(r.csvLines.includes('CL01,SHELF-L-1,862,862,>,0.68,0.626'));
  assert.ok(r.csvLines.includes('CL01,BACK-B,882,770,,0,0.679'));
});

test('ENGINE · BACK-A is KIT_BUD\'s BACK at width W, and the sides are KIT_BUD\'s, hole for hole', () => {
  const r = L();
  const bud = computeCabinet({
    ...defaultParamsFor('BUD', P), width: 900, unit_num: 'X', doors: { count: 1, hinge: 'R' },
  }, P);
  const backA = panelOf(r, 'BACK-A');
  const back = panelOf(bud, 'BACK');
  assert.deepEqual(backA.cnc.outline, back.cnc.outline);
  assert.deepEqual(backA.cnc.pockets, back.cnc.pockets);
  assert.deepEqual(backA.cnc.holes, back.cnc.holes);
  // SIDE-A (left hand) is the box's right side as seen from arm A's front:
  // drawn as BUR; SIDE-B as BUL. Same depth, same height: the same board.
  assert.equal(panelOf(r, 'SIDE-A').meta.hand, 'R');
  assert.equal(panelOf(r, 'SIDE-B').meta.hand, 'L');
  for (const [lid, bid] of [['SIDE-A', 'BUR'], ['SIDE-B', 'BUL']]) {
    assert.deepEqual(panelOf(r, lid).cnc.outline, panelOf(bud, bid).cnc.outline, lid);
    assert.deepEqual(panelOf(r, lid).cnc.pockets, panelOf(bud, bid).cnc.pockets, lid);
    assert.deepEqual(panelOf(r, lid).cnc.holes, panelOf(bud, bid).cnc.holes, lid);
  }
  // …and the right hand is the LISP's own: SIDE-A drawBUL, SIDE-B drawBUR.
  const right = L('CORNER_L_BASE', { corner_side: 'right' });
  assert.equal(panelOf(right, 'SIDE-A').meta.hand, 'L');
  assert.equal(panelOf(right, 'SIDE-B').meta.hand, 'R');
  assert.deepEqual(panelOf(right, 'SIDE-A').cnc.outline, panelOf(bud, 'BUL').cnc.outline);
  // The board outlines do not move with the hand: the same blank, turned over.
  assert.deepEqual(panelOf(right, 'TOP-L').cnc.outline, panelOf(r, 'TOP-L').cnc.outline);
  assert.deepEqual(panelOf(right, 'BACK-B').cnc.outline, panelOf(r, 'BACK-B').cnc.outline);
  // Only where they stand: mirrored in x.
  assert.deepEqual(panelOf(right, 'SIDE-A').box, {
    x: 0, y: 0, z: 18, w: 18, h: 770, d: 540,
  });
  assert.deepEqual(panelOf(right, 'BACK-B').box, {
    x: 882, y: 0, z: 18, w: 18, h: 770, d: 882,
  });
});

test('ENGINE · the hinge plates are the parent\'s rows, 37 from the front edge, on each arm\'s end side', () => {
  const r = L();
  const plates = (id) => r.drills.filter((d) => d.panel === id && d.kind === 'hinge');
  // KIT_BUD's 670 / 470 / 100, pairs at +- 16
  const rows = [84, 116, 454, 486, 654, 686];
  assert.deepEqual(plates('SIDE-A').map((d) => d.y).sort((a, b) => a - b), rows);
  assert.deepEqual(plates('SIDE-B').map((d) => d.y).sort((a, b) => a - b), rows);
  // SIDE-A is drawn as BUR (front edge at x = 540), SIDE-B as BUL (front at 0).
  assert.ok(plates('SIDE-A').every((d) => d.x === 540 - 37));
  assert.ok(plates('SIDE-B').every((d) => d.x === 37));
  assert.deepEqual(r.drillSummary.hinge_centers, [100, 470, 670]);
  // Six legs, the LISP's, and no leg hole anywhere.
  assert.equal(r.totals.legs, 6);
  assert.deepEqual(r.assemblies.legs.positions.map((l) => [l.name, l.x, l.z]), [
    ['L1', 50, 50], ['L2', 804, 50], ['L3', 804, 430], ['L4', 430, 430], ['L5', 430, 804], ['L6', 50, 804],
  ]);
  assert.equal(r.drills.some((d) => /leg/i.test(d.kind)), false);
  // Every drill names a board the L cuts.
  const ids = new Set(r.panels.map((p) => p.id));
  assert.deepEqual(r.drills.filter((d) => !ids.has(d.panel)), []);
});

test('ENGINE · the wall L hangs on both far ends (hangers in SIDE-A, SIDE-B and both backs\' far corners)', () => {
  const r = L('CORNER_L_WALL');
  const hangers = (id) => r.drills.filter((d) => d.panel === id && d.kind === 'hanger').map((d) => [d.x, d.y]);
  assert.deepEqual(hangers('SIDE-A'), [[21, 667], [53, 667]], 'SIDE-A is BUR in the left hand');
  assert.deepEqual(hangers('SIDE-B'), [[361, 667], [329, 667]]);
  const cut = (id) => pocketsOn(panelOf(r, id), P.wallUnit.hangers.cutoutLayer).map((k) => [k.x1, k.y1, k.x2, k.y2]);
  assert.deepEqual(cut('BACK-A'), [[570, 662, 600, 720]]);
  assert.deepEqual(cut('BACK-B'), [[552, 662, 582, 720]]);
  assert.equal(r.totals.legs, 0);
  assert.equal(r.hardware.find((h) => h.role === 'hangers').qty, 2);
  // the right hand puts BACK-A's at the other end of its own frame
  const right = L('CORNER_L_WALL', { corner_side: 'right' });
  assert.deepEqual(pocketsOn(panelOf(right, 'BACK-A'), P.wallUnit.hangers.cutoutLayer).map((k) => [k.x1, k.x2]), [[0, 30]]);
});

test('ENGINE · the wardrobe L: its parent\'s tall hinge rows, six legs, one rail per arm', () => {
  const r = L('CORNER_L_WARDROBE', { rail: true });
  assert.deepEqual(r.drillSummary.hinge_centers, [100, 490, 880, 1270, 1660, 2050]);
  assert.equal(r.totals.legs, 6);
  assert.equal(r.totals.rail, 2);
  assert.equal(r.hardware.find((h) => h.role === 'rail').qty, 2);
  assert.equal(r.drills.filter((d) => d.kind === 'rail_bracket').map((d) => d.panel).sort().join(), 'SIDE-A,SIDE-B');
});

test('ENGINE · with a plinth asked, the base L cuts two boards, square butt at the inner corner', () => {
  const r = L('CORNER_L_BASE', { plinth: true });
  const a = panelOf(r, 'PLINTH-A');
  const b = panelOf(r, 'PLINTH-B');
  const s = P.autoParts.plinth.setback;
  const t = P.autoParts.plinth.thickness ?? 18;
  const face = 558 - s;
  // A runs through the corner square (the covered door's arm); B butts its face.
  assert.deepEqual([a.box.x, a.box.z, a.box.w, a.box.d], [face - t, face - t, 900 - (face - t), t]);
  assert.deepEqual([b.box.x, b.box.z, b.box.w, b.box.d], [face - t, face, t, 900 - face]);
  assert.equal(a.meta.lCorner, 'through');
  assert.equal(b.meta.lCorner, 'butt');
  assert.equal(r.panels.filter((p) => p.part === 'PLINTH').length, 2, 'never the box\'s one plinth');
  assert.equal(L('CORNER_L_BASE').panels.some((p) => p.part === 'PLINTH'), false, 'a decision, as everywhere');
});

// ═══ THE DOORS: FLAT-FACE OVERLAP, NO 45° ══════════════════════════════════

test('DOORS · A covered (0 at the inner corner), B overlapping (front_t + rule 7), B opens first', () => {
  const r = L();
  const a = panelOf(r, 'CL01-A-F');
  const b = panelOf(r, 'CL01-B-F');
  const d = 558;
  const t = P.front.thickness;
  const c = P.doors.clearance.corner;
  // A on arm A's front, its inner edge AT the inner corner line, hinged on SIDE-A.
  assert.equal(a.box.x, d, 'zero clearance on the covered edge');
  assert.equal(a.box.x + a.box.w, 900 - P.doors.gap / 2);
  assert.equal(a.meta.hinge, 'R');
  assert.deepEqual(a.meta.cornerEdge, { side: 'left', kind: 'covered' });
  // B on arm B's front (it faces +x), its inner edge gap + front_t + clearance.corner beyond the
  // corner: its end CLEARS A's face by the clearance (15.10.2026; T75 left it ON the face).
  assert.equal(b.box.z, d + P.doors.gap + t + c);
  assert.equal(b.box.z + b.box.d, 900 - P.doors.gap / 2);
  assert.equal(b.box.x, d + P.doors.gap, 'it stands in front of arm B as any door stands in front of its carcass');
  assert.equal(b.box.w, t);
  assert.equal(b.meta.hinge, 'L', 'hinged on SIDE-B, its far end');
  assert.deepEqual(b.meta.cornerEdge, { side: 'right', kind: 'overlap' });
  assert.equal(b.meta.opensFirst, true);
  assert.equal(b.meta.note, 'door B opens first');
  assert.equal(r.derived.corner_l.opens_first, 'B');
  // The line the BOM carries.
  const line = r.warnings.find((w) => w.code === 'CORNER_L_OPENS_FIRST');
  assert.equal(line.level, 'info');
  assert.match(line.message, /door B opens first/);
  // Its body stands in front of door A's inner strip: no 45, no clash.
  assert.ok(b.box.x >= a.box.x && b.box.x + b.box.w <= a.box.x + a.box.w);
  assert.equal(b.box.z - (a.box.z + a.box.d), c, 'B begins clearance.corner past A\'s face');
  // Two leaves, two hinge sets, the parent's own count.
  assert.equal(r.totals.fronts, 2);
  assert.equal(r.totals.hinges, 6);
  assert.equal(r.hardware.find((h) => h.role === 'hinges').spec_label.startsWith('3 per door × 2'), true);
  assert.equal(r.derived.doors, 2);
  assert.equal(a.area_m2, (a.w * a.h) / 1e6, 'stated at the size it is cut');
  assert.equal(b.area_m2, (b.w * b.h) / 1e6);
});

test('DOORS · through the EXISTING door path: each leaf is its parent\'s leaf, cup for cup', () => {
  const r = L();
  for (const [arm, span, hinge, trim] of [['A', 342, 'R', { left: -1.5, right: 0 }], ['B', 342, 'L', { left: 0, right: 29.5 }]]) {
    const id = `CL01-${arm}-F`;
    const parent = computeCabinet({
      ...defaultParamsFor('BUD', P), unit_num: `CL01-${arm}`, width: span, doors: { count: 1, hinge }, front_edge_trim: { [id]: trim },
    }, P);
    const pd = parent.panels.find((p) => p.id === id);
    const ld = panelOf(r, id);
    assert.equal(ld.w, pd.w);
    assert.deepEqual(ld.cnc.outline, pd.cnc.outline);
    assert.deepEqual(r.drills.filter((d) => d.panel === id), parent.drills.filter((d) => d.panel === id));
  }
});

test('DOORS · the overlap arm is the profile\'s (corner.overlap): \'own\' turns it round', () => {
  const own = computeCabinet({
    ...defaultParamsFor('CORNER_L_BASE', P), unit_num: 'CL01', doors: true, corner_doors: null,
  }, { ...P, corner: { ...P.corner, overlap: 'own' } });
  assert.equal(panelOf(own, 'CL01-A-F').meta.cornerEdge.kind, 'overlap');
  assert.equal(panelOf(own, 'CL01-B-F').meta.cornerEdge.kind, 'covered');
  assert.equal(own.derived.corner_l.opens_first, 'A');
  assert.equal(panelOf(own, 'CL01-B-F').box.z, 558, 'B now runs to the corner');
  assert.equal(P.corner.overlap, 'adjacent', 'T75 proposed: the arm on the adjacent wall overlaps');
});

test('DOORS · the right hand mirrors the leaves: A hinged on SIDE-A at x = 0, B facing -x', () => {
  const r = L('CORNER_L_BASE', { corner_side: 'right' });
  const a = panelOf(r, 'CL01-A-F');
  const b = panelOf(r, 'CL01-B-F');
  assert.equal(a.meta.hinge, 'L');
  assert.equal(a.box.x, P.doors.gap / 2);
  assert.equal(a.box.x + a.box.w, 900 - 558);
  assert.equal(b.meta.hinge, 'R');
  assert.equal(b.box.x, 900 - 558 - P.doors.gap - P.front.thickness);
  assert.equal(b.box.z, 558 + P.doors.gap + P.front.thickness + P.doors.clearance.corner);
  assert.deepEqual(b.meta.swingZ, { dir: 1 });
  assert.deepEqual(panelOf(L(), 'CL01-B-F').meta.swingZ, { dir: -1 });
});

test('DOORS · no doors asked: the carcass alone, still drilled as its parent', () => {
  const r = L('CORNER_L_BASE', { doors: { count: 0 } });
  assert.equal(r.panels.some((p) => p.role === 'front'), false);
  assert.equal(r.totals.hinges, 0);
  assert.equal(r.drills.some((d) => d.kind === 'hinge'), false);
  assert.equal(panelOf(r, 'TOP-L').cnc.outline.length, 86);
});

// ═══ FRONTS BOUNDARY: the two licensed neighbour kinds ═════════════════════

test('CLEARANCE · CORNER_COVERED = 0 and CORNER_OVERLAP = gap + front_t + clearance.corner (licence 1; the gap since 15.10.2026)', () => {
  assert.equal(NEIGHBOUR.CORNER_COVERED, 'cornerCovered');
  assert.equal(NEIGHBOUR.CORNER_OVERLAP, 'cornerOverlap');
  assert.equal(NEIGHBOUR.CORNER_BIFOLD, 'cornerBifold');
  const m = clearanceMatrix(P);
  assert.equal(m[NEIGHBOUR.CORNER_COVERED], 0);
  assert.equal(m[NEIGHBOUR.CORNER_OVERLAP], P.doors.gap + P.front.thickness + P.doors.clearance.corner);
  assert.equal(m[NEIGHBOUR.CORNER_BIFOLD], P.front.thickness + 2 * P.doors.gap, 'the bi-fold leaf B: one gap off leaf A\'s face');
  assert.equal(clearanceMatrix({ ...P, doors: { ...P.doors, clearance: {} } })[NEIGHBOUR.CORNER_OVERLAP], null,
    'a profile that names no corner clearance keeps it parked');
});

test('CLEARANCE · the view hands each arm on its own wall; the corner edges are the L\'s law', () => {
  const room = migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) });
  const walls = roomWalls(room);
  const params = { ...defaultParamsFor('CORNER_L_BASE', P), unit_num: 'CL01', doors: true, corner_doors: null };
  const unit = {
    id: 'L', type: 'CORNER_L_BASE', params, position: { wall: 0, x_mm: 10, rotation_deg: 0 },
  };
  const view = lClearanceView({ entries: [{ unit, result: computeCabinet(params, P) }] }, walls, P);
  assert.equal(view.entries.length, 2);
  const [armA, armB] = view.entries;
  assert.deepEqual([armA.unit.position.wall, armA.unit.position.x_mm, armA.unit.params.width], [0, 10 + 558, 342]);
  // the corner of wall 0's start is wall 3's end: arm B stands there, 900 deep along it
  assert.deepEqual([armB.unit.position.wall, armB.unit.params.width], [3, 342]);
  assert.equal(armB.unit.position.x_mm, 3000 - 10 - 900);
  const rows = frontClearances({ entries: view.entries, units: view.units, profile: P });
  const a = rows.find((x) => x.panelId === 'CL01-A-F');
  const b = rows.find((x) => x.panelId === 'CL01-B-F');
  assert.deepEqual([a.edges.left.kind, a.edges.left.wantClearanceMm, a.edges.left.haveClearanceMm], ['cornerCovered', 0, 0]);
  assert.deepEqual([b.edges.right.kind, b.edges.right.wantClearanceMm, b.edges.right.haveClearanceMm], ['cornerOverlap', 31, 31]);
  assert.equal(a.edges.left.correctionMm, 0);
  assert.equal(b.edges.right.correctionMm, 0);
});

// ═══ THE STORE: a room corner only, the hand, neighbours on both walls ══════

function room() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
}

test('PLACEMENT · an L is placed into a free room corner, with its hand; four corners, then refused in words', () => {
  room();
  const placed = [];
  for (let i = 0; i < 4; i += 1) {
    const r = S().addUnit('CORNER_L_BASE');
    assert.ok(r.id, r.error);
    placed.push(U(r.id));
  }
  const at = placed.map((u) => [u.position.wall, u.position.x_mm, u.params.corner_side]);
  // each one stands with an end at a corner, 10 mm (the wall clearance) off the adjacent wall
  for (const [, x, side] of at) assert.ok(side === 'left' ? x === 10 : x > 10, JSON.stringify(at));
  const fifth = S().addUnit('CORNER_L_BASE');
  assert.equal(fifth.id, null);
  assert.match(fifth.error, /stands in a room corner only/);
});

test('PLACEMENT · it moves corner to corner, never along a wall, never turned', () => {
  room();
  const id = S().addUnit('CORNER_L_BASE').id;
  assert.deepEqual([U(id).position.x_mm, U(id).params.corner_side], [10, 'left']);
  S().moveUnit(id, 1500, 0);
  assert.equal(U(id).position.x_mm, 10, 'dragged to the middle it stays in its nearest corner');
  S().moveUnit(id, 3500, 0);
  assert.deepEqual([U(id).position.x_mm, U(id).params.corner_side], [4000 - 900 - 10, 'right']);
  assert.equal(S().rotateUnit(id), 0);
  assert.equal(U(id).position.rotation_deg || 0, 0);
  const moved = S().moveUnitToWall(id, 1, 0);
  assert.equal(moved.blocked, false);
  assert.deepEqual([U(id).position.wall, U(id).params.corner_side], [1, 'left']);
});

test('PLACEMENT · the hand is the NEARER corner, even on a wall short enough to reach both', () => {
  S().newProject();
  S().setRoom({ corners: rectCorners(1100, 3000), height: 2500 });
  const id = S().addUnit('CORNER_L_BASE').id;
  assert.equal(U(id).position.x_mm, 10);
  S().refreshAutoParts();
  assert.equal(U(id).params.corner_side, 'left', 'its right end is 190 from the other corner, its left 10');
});

test('PLACEMENT · neighbours on both walls stop on the L\'s arm ends and meet its doors by rule 1', () => {
  room();
  const l = S().addUnit('CORNER_L_BASE').id;
  S().addDoors(l);
  const a = S().addUnit('BUD', { near: l, side: 'R' }).id;
  S().addDoors(a);
  const b = S().addUnit('BUD').id;
  S().setUnitWall(b, 3);
  S().addDoors(b);
  S().moveUnit(b, 4000, 0);
  assert.equal(U(a).position.x_mm, 10 + 900, 'wall A: on SIDE-A\'s face');
  assert.equal(3000 - (U(b).position.x_mm + U(b).params.width), 10 + 900, 'wall B: on the arm B end');
  const c = cornersOf({ units: S().units, walls: roomWalls(S().project.room), profile: P });
  assert.equal(c.length, 1);
  assert.equal(c[0].solution, 'L');
  const rows = S().frontClearances();
  const doorA = rows.find((x) => x.panelId === 'CL01-A-F');
  const doorB = rows.find((x) => x.panelId === 'CL01-B-F');
  assert.equal(doorA.edges.right.kind, 'front', 'rule 1 against wall A\'s neighbour');
  assert.equal(doorB.wall, 3, 'door B is measured on wall B');
  assert.equal(doorB.edges.left.kind, 'front', 'rule 1 against wall B\'s neighbour');
  assert.equal(S().runChecks().filter((f) => f.check === 2 && f.level === 'red').length, 0);
  // No scribe filler at the L's corner end: its corner end is BACK-B.
  assert.equal(U(l).params.side_infill_left_mm, 0);
  assert.equal(S().unitResult(l).panels.some((p) => p.part === 'INFILL'), false);
});

test('MIGRATION · a T30 L_SHAPE save with its typed arm keeps the arm, as the true L', () => {
  S().loadProject({
    id: null, name: 'drawer', room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }), design: {},
  }, [{
    id: 'u_old',
    type: 'L_SHAPE',
    position: { wall: 0, x_mm: 0, rotation_deg: 0 },
    params: {
      type: 'L_SHAPE', unit_num: 'CR01', width: 1000, height: 770, depth: 1000, corner_arm_mm: 700, board_t: 18, front_t: 25,
    },
  }]);
  const u = S().units[0];
  assert.equal(u.type, 'CORNER_L_BASE');
  assert.equal(u.params.arm_mm, 700);
  assert.equal('corner_arm_mm' in u.params, false);
  assert.equal(u.params.corner_side, 'left');
  const r = S().unitResult(u.id);
  assert.equal(panelOf(r, 'SIDE-A').w, 700 - 18, 'the arm the save typed');
});

// ═══ THE 3D: ONE L-SHAPED BOARD, AS IT IS CUT ══════════════════════════════

test('3D · TOP-L, BOTTOM-L and SHELF-L extrude their real L; SIDE-B and BACK-B have their own frames', () => {
  const r = L('CORNER_L_BASE', { shelves: 1 });
  const layers = joineryLayers(P);
  for (const id of ['TOP-L', 'BOTTOM-L', 'SHELF-L-1']) {
    const p = panelOf(r, id);
    const { solid } = panelSolids(p, layers, P);
    assert.ok(solid, `${id} renders as a box`);
    solid.computeBoundingBox();
    const bb = solid.boundingBox;
    // the L's bite is empty: no vertex in the open quadrant beyond the relief
    const pos = solid.attributes.position;
    const cx = p.box.w / 2;
    const cz = p.box.d / 2;
    const arm = id === 'SHELF-L-1' ? 520 : 540;
    let inBite = 0;
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i) * 1000 + cx;
      const z = pos.getZ(i) * 1000 + cz;
      if (x > arm + 10 && z > arm + 10) inBite += 1;
    }
    assert.equal(inBite, 0, `${id}: the bite is filled`);
    assert.ok(bb.max.y - bb.min.y > 0.017 && bb.max.y - bb.min.y < 0.019, `${id} is not a board thick`);
  }
  for (const id of ['SIDE-A', 'SIDE-B', 'BACK-B', 'TOP-L', 'SHELF-L-1']) {
    const pl = panelPlacement(panelOf(r, id));
    assert.ok(pl, `${id} has no placement`);
    const cross = [
      pl.u[1] * pl.v[2] - pl.u[2] * pl.v[1],
      pl.u[2] * pl.v[0] - pl.u[0] * pl.v[2],
      pl.u[0] * pl.v[1] - pl.u[1] * pl.v[0],
    ].map((v) => v + 0);
    assert.deepEqual(cross, pl.n.map((v) => -v + 0), `${id}: u x v must be -n`);
  }
  // door B lies along z and swings about its far end
  assert.ok(read('src/3d/UnitView.jsx').includes('p.meta?.swingZ'));
});

// ═══ GOLDENS ════════════════════════════════════════════════════════════════

test('GOLDENS · the three L goldens hold, byte for byte', () => {
  for (const name of ['golden-corner-l-base.json', 'golden-corner-l-wall.json', 'golden-corner-l-wardrobe.json']) {
    const path = `${ROOT}fixtures/${name}`;
    assert.ok(existsSync(path), name);
    const file = JSON.parse(readFileSync(path, 'utf8'));
    assert.equal(file.meta.F, 'F4');
    assert.deepEqual(goldenOf(file.params, P), file.expected, `${name} moved`);
  }
});

test('LISP · KIT_CORNER_L.lsp is the law the engine names', () => {
  const lsp = read('reference/lisp/KIT_CORNER_L.lsp');
  for (const defun of ['CL:lOutline', 'CL:lTopJoints', 'CL:tabWalk', 'CL:backBPockets', 'CL:backBHoles', 'CL:legPositions']) {
    assert.ok(lsp.includes(`(defun ${defun}`), defun);
  }
  const mirror = read('src/engine/cornerL.js');
  for (const fn of ['clLOutline', 'clLTopJoints', 'clTabWalk', 'clBackBPockets', 'clBackBHoles', 'clLegPositions']) {
    assert.ok(mirror.includes(`function ${fn}(`), fn);
  }
});
