// ─── CHAT FIX 17.10.2026 (14:15) . THE TOP IS DRAWN FROM ITS UNDERSIDE ──────
//
// The owner, of the nesting sheet (12:15): *"zobacz, a w 01 bottom i top nie
// powinno byc odbicie lustrzane?"*; 14:15: *"3 - lustro bottom i top, prosze,
// koduj"*. LISP first: SKYLON_JOINTS_BISCUIT.lsp section J, KIT_NOTCH.lsp D11,
// KIT_RECESS.lsp D19. The engine: src/engine/topFrame.js, one mirror at the
// end of computeCabinet; panelPlacement's TOP case the same frame.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  isBoxTop, mirrorArc, mirrorCornerName, mirrorOutline, mirrorPocket, mirrorRecordMeta, mirrorTopCnc,
  mirrorTopRecords, producerPlacement,
} from '../src/engine/topFrame.js';
import { panelPlacement } from '../src/engine/joinery.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { buildUnitDxfFiles } from '../src/engine/cnc/dxf.js';
import { grooveForStrip } from '../src/lib/ledGroove.js';
import { dump } from '../scripts/t64-classify.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const panelOf = (r, id) => r.panels.find((p) => p.id === id);
const BUD = { ...defaultParamsFor('BUD', P), unit_num: '01' };
const to3 = (pl, x, y) => [0, 1, 2].map((i) => Math.round((pl.origin[i] + x * pl.u[i] + y * pl.v[i]) * 1e4) / 1e4);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// ─── THE MIRROR, PIECE BY PIECE ─────────────────────────────────────────────

test('mirrorOutline: y\' = H - y, the walk read backwards (anticlockwise again), twice is the identity', () => {
  // The notch NUMBERS (KIT_NOTCH.lsp D11): the ROT90 walk of a 540 x 564 TOP less 200 x 200 at the rear-left.
  const rot90 = [[540, 0], [540, 564], [0, 564], [0, 200], [200, 200], [200, 0]];
  const top = mirrorOutline(rot90, 564);
  assert.deepEqual(top, [[200, 564], [200, 364], [0, 364], [0, 0], [540, 0], [540, 564]]);
  // Signed area: both anticlockwise (positive).
  const area = (pts) => pts.reduce((a, [x1, y1], i) => { const [x2, y2] = pts[(i + 1) % pts.length]; return a + x1 * y2 - x2 * y1; }, 0) / 2;
  assert.ok(area(rot90) > 0 && area(top) > 0, 'the walk stays anticlockwise');
  assert.equal(area(top), area(rot90));
  assert.deepEqual(mirrorOutline(top, 564), rot90, 'the mirror is its own inverse');
  // A bulge (DXF tan(angle / 4) on the vertex the segment leaves) is carried: the mirror flips its sign, the
  // reversed walk flips it back. A semicircle bulging outward off the top edge of a 100 x 50 rectangle...
  const arched = [[0, 0], [100, 0], [100, 50, 1], [0, 50]];
  const m = mirrorOutline(arched, 50);
  // ...is a semicircle bulging outward off the bottom edge, on the segment that now leaves (0, 0) for (100, 0).
  assert.deepEqual(m, [[0, 0, 1], [100, 0], [100, 50], [0, 50]]);
  assert.deepEqual(mirrorOutline([], 10), []);
  assert.equal(mirrorOutline(null, 10), null);
});

test('mirrorCornerName: the y half swaps, the x half stays, anything else passes through', () => {
  assert.equal(mirrorCornerName('x0y0'), 'x0y1');
  assert.equal(mirrorCornerName('x0y1'), 'x0y0');
  assert.equal(mirrorCornerName('x1y0'), 'x1y1');
  assert.equal(mirrorCornerName('x1y1'), 'x1y0');
  assert.equal(mirrorCornerName('BL'), 'BL');
  assert.equal(mirrorCornerName(undefined), undefined);
});

test('mirrorPocket: the rectangle, its pts, its Cabineo meta and export frame (x reflected, y the drawn y)', () => {
  const pk = {
    layer: 'CABINEO_RECESS', kind: 'cabineo_recess', face: 'outside', depth: 0.5, x1: 41.65, y1: 0, x2: 58.35, y2: 34.35,
    pts: [[41.65, 0], [58.35, 0], [58.35, 34.35], [41.65, 34.35]],
    meta: {
      joint: 'BUL-TOP', end: 'Y0', board: 'TOP', face: 'outside', axis: [50, 0], lobes: [[50, 3.6], [50, 14.8], [50, 26]],
      export: { W: 540, pts: [[498.35, 0], [481.65, 0], [481.65, 34.35], [498.35, 34.35]], box: [481.65, 0, 498.35, 34.35], axis: [490, 0], lobes: [[490, 3.6]], at: [490, 14.8] },
    },
  };
  const m = mirrorPocket(pk, 564);
  assert.deepEqual([m.x1, m.y1, m.x2, m.y2], [41.65, 529.65, 58.35, 564]);
  assert.deepEqual(m.pts, [[41.65, 529.65], [58.35, 529.65], [58.35, 564], [41.65, 564]]);
  assert.equal(m.meta.end, 'YH', 'the pocket opens to the y = H end now');
  assert.equal(m.meta.joint, 'BUL-TOP', 'the joint keeps its name');
  assert.deepEqual(m.meta.axis, [50, 564]);
  assert.deepEqual(m.meta.lobes, [[50, 560.4], [50, 549.2], [50, 538]]);
  assert.deepEqual(m.meta.export.box, [481.65, 529.65, 498.35, 564]);
  assert.deepEqual(m.meta.export.pts, [[498.35, 529.65], [481.65, 529.65], [481.65, 564], [498.35, 564]]);
  assert.deepEqual([m.meta.export.axis, m.meta.export.at, m.meta.export.lobes, m.meta.export.W], [[490, 564], [490, 549.2], [[490, 560.4]], 540]);
  assert.equal(pk.y1, 0, 'the input is not touched');
  // A plain puzzle relief: the rectangle alone.
  assert.deepEqual(mirrorPocket({ layer: 'PUZZLE_DOG_BONES', x1: 65, y1: -18, x2: 125, y2: 0 }, 564), { layer: 'PUZZLE_DOG_BONES', x1: 65, y1: 564, x2: 125, y2: 582 });
  assert.deepEqual(mirrorRecordMeta({ joint: 'x', end: 'X0' }, 10), { joint: 'x', end: 'X0' }, 'an X end is not a y end');
});

test('mirrorArc: the centre\'s y and the sweep (anticlockwise from -end to -start)', () => {
  assert.deepEqual(mirrorArc({ cx: 10, cy: 20, r: 4, start: 0, end: 90 }, 100), { cx: 10, cy: 80, r: 4, start: 270, end: 0 });
  assert.deepEqual(mirrorArc({ cx: 1, cy: 2, r: 3 }, 10), { cx: 1, cy: 8, r: 3 });
});

test('mirrorTopCnc: outline, pockets, marks, holes, the notch corner (and its `also`), the bite', () => {
  const cnc = {
    rotated: true, drawn_w: 540, drawn_h: 564,
    outline: [[540, 0], [540, 564], [0, 564], [0, 200], [200, 200], [200, 0]],
    pockets: [{ layer: 'PUZZLE_DOG_BONES', x1: 65, y1: -18, x2: 125, y2: 0 }],
    holes: [{ kind: 'screw', layer: 'SCREWS_3MM', x: 50, y: 100, d: 3 }],
    marks: [
      { layer: 'CORNER_4MM', from: [160, 200], to: [200, 160], pts: [[160, 200], [200, 200], [200, 160]] },
      { layer: 'BISCUIT_4MM', from: [477, 441], to: [407, 441] },
    ],
    notch: { fc: 'x0y0', nw: 200, nh: 200, also: { fc: 'x1y0', nw: 50, nh: 60 } },
    bite: { x0: 100, y0: 0, x1: 300, y1: 150 },
  };
  const m = mirrorTopCnc(cnc);
  assert.deepEqual(m.outline, [[200, 564], [200, 364], [0, 364], [0, 0], [540, 0], [540, 564]]);
  assert.deepEqual(m.pockets, [{ layer: 'PUZZLE_DOG_BONES', x1: 65, y1: 564, x2: 125, y2: 582 }]);
  assert.deepEqual(m.holes, [{ kind: 'screw', layer: 'SCREWS_3MM', x: 50, y: 464, d: 3 }]);
  // A mark is an open walk: mirrored AND reversed, as the outline is, so the
  // corner mark's waste stays on its right (16:10, KIT_NOTCH.lsp D12).
  assert.deepEqual(m.marks, [
    { layer: 'CORNER_4MM', from: [200, 404], to: [160, 364], pts: [[200, 404], [200, 364], [160, 364]] },
    { layer: 'BISCUIT_4MM', from: [407, 123], to: [477, 123] },
  ]);
  assert.deepEqual(m.notch, { fc: 'x0y1', nw: 200, nh: 200, also: { fc: 'x1y1', nw: 50, nh: 60 } });
  assert.deepEqual(m.bite, { x0: 100, y0: 414, x1: 300, y1: 564 });
  assert.deepEqual([m.rotated, m.drawn_w, m.drawn_h], [true, 540, 564], 'the frame\'s own numbers do not move');
  assert.deepEqual(cnc.notch.fc, 'x0y0', 'the input is not touched');
  assert.equal(mirrorTopCnc({ drawn_h: 0, outline: [] }).outline.length, 0, 'no height, no mirror');
});

test('mirrorTopRecords: a box TOP and its drills, in place; the L corner\'s TOP-L and every other board untouched', () => {
  const panels = [
    { id: 'TOP', part: 'TOP', cnc: { drawn_w: 540, drawn_h: 564, outline: [[0, 0], [540, 0], [540, 564], [0, 564]] } },
    { id: 'BOTTOM', part: 'BOTTOM', cnc: { drawn_w: 540, drawn_h: 564, outline: [[0, 0], [540, 0], [540, 564], [0, 564]] } },
    { id: 'TOP-L', part: 'TOP', meta: { lBoard: 'TOP-L' }, cnc: { drawn_w: 900, drawn_h: 900, outline: [[0, 0], [900, 0], [900, 900], [0, 900]] } },
    { id: 'BUL', part: 'BUL' },
  ];
  const drills = [
    { panel: 'TOP', kind: 'divider_screw', layer: 'SCREWS_3MM', x: 51.5, y: 441, d: 3, meta: { end: 'Y0' } },
    { panel: 'BOTTOM', kind: 'divider_screw', layer: 'SCREWS_3MM', x: 51.5, y: 441, d: 3 },
  ];
  assert.deepEqual(mirrorTopRecords({ panels, drills }), ['TOP']);
  assert.deepEqual(panels[0].cnc.outline, [[0, 0], [540, 0], [540, 564], [0, 564]], 'a plain rectangle is its own mirror image, walk and all');
  assert.deepEqual(panels[1].cnc.outline, [[0, 0], [540, 0], [540, 564], [0, 564]], 'the BOTTOM is the BOTTOM');
  assert.deepEqual(panels[2].cnc.outline, [[0, 0], [900, 0], [900, 900], [0, 900]], 'TOP-L keeps its plan frame (KIT_CORNER_L.lsp)');
  assert.deepEqual(drills, [
    { panel: 'TOP', kind: 'divider_screw', layer: 'SCREWS_3MM', x: 51.5, y: 123, d: 3, meta: { end: 'YH' } },
    { panel: 'BOTTOM', kind: 'divider_screw', layer: 'SCREWS_3MM', x: 51.5, y: 441, d: 3 },
  ]);
  assert.equal(isBoxTop(panels[0]), true);
  assert.equal(isBoxTop(panels[2]), false);
  assert.equal(isBoxTop(panels[3]), false);
  assert.deepEqual(mirrorTopRecords({ panels: [], drills: [] }), []);
});

// ─── THE FRAME: producers draw in ROT90, the placement publishes the underside ─

test('panelPlacement(TOP) is the BOTTOM\'s frame mirrored across the width, right-handed like every other board', () => {
  const box = { x: 18, y: 752, z: 18, w: 564, h: 18, d: 540 };
  const top = { id: 'TOP', part: 'TOP', box };
  const pl = panelPlacement(top);
  assert.deepEqual(pl, { origin: [582, 770, 18], u: [0, 0, 1], v: [-1, 0, 0], n: [0, 1, 0] });
  assert.deepEqual(cross(pl.u, pl.v), [0, -1, 0], 'u x v = -n: the drawing is seen from the underside');
  const bottom = panelPlacement({ id: 'BOTTOM', part: 'BOTTOM', box: { ...box, y: 0 } });
  assert.deepEqual(bottom, { origin: [18, 0, 18], u: [0, 0, 1], v: [1, 0, 0], n: [0, -1, 0] }, 'the BOTTOM as it always was');
  // The producers' frame: the view from above; the same cabinet point at y' = W_int - y.
  const pp = producerPlacement(top);
  assert.deepEqual(pp, { origin: [18, 770, 18], u: [0, 0, 1], v: [1, 0, 0], n: [0, 1, 0] });
  assert.deepEqual(to3(pp, 488.5, 441), to3(pl, 488.5, 564 - 441), 'one cabinet point, two frames');
  assert.deepEqual(to3(pl, 488.5, 123), [459, 770, 506.5]);
  assert.deepEqual(producerPlacement({ id: 'BOTTOM', part: 'BOTTOM', box: { ...box, y: 0 } }), bottom, 'every other board: panelPlacement itself');
  assert.equal(producerPlacement({ id: 'X', part: 'TOP' }), null, 'no box, no frame');
});

// ─── THE ENGINE: the TOP is the BOTTOM's drawing mirrored, the cabinet unchanged ─

test('a BUD: the TOP\'s record is the BOTTOM\'s mirrored across the width; the cut list, the boxes and the holes stand', () => {
  const r = computeCabinet(BUD, P);
  const top = panelOf(r, 'TOP');
  const bottom = panelOf(r, 'BOTTOM');
  assert.equal(top.cnc.drawn_h, 564);
  assert.deepEqual(top.cnc.outline, mirrorOutline(bottom.cnc.outline, 564), 'the same board in plan, seen from the other face');
  const boxes = (p) => p.cnc.pockets.map((k) => [k.layer, k.x1, k.y1, k.x2, k.y2].join('|')).sort();
  assert.deepEqual(boxes(top), boxes({ cnc: { pockets: bottom.cnc.pockets.map((k) => mirrorPocket(k, 564)) } }));
  assert.deepEqual([top.w, top.h, top.box], [564, 540, { x: 18, y: 752, z: 18, w: 564, h: 18, d: 540 }]);
  assert.deepEqual(r.csvLines.filter((l) => /,TOP,|,BOTTOM,/.test(l)), ['01,TOP,564,540,>,0.56,0.305', '01,BOTTOM,564,540,>,0.56,0.305']);
  // Every board but the TOP is byte for byte what the frozen record holds: the BOTTOM's outline is the LISP's.
  assert.deepEqual(bottom.cnc.outline.slice(0, 4), [[0, 0], [70, 0], [76, 0], [76, -13]]);
});

test('the divider\'s head set on the TOP: y 423 on the underside drawing (NUMBERS I.1), x 459 in the cabinet, as the foot', () => {
  const r = computeCabinet({ ...BUD, width: 900, items: [{ kind: 'partition', x_mm: 450 }] }, P);
  const top = panelOf(r, 'TOP');
  const bottom = panelOf(r, 'BOTTOM');
  const topScrews = r.drills.filter((d) => d.panel === 'TOP' && d.kind === 'divider_screw');
  const bottomScrews = r.drills.filter((d) => d.panel === 'BOTTOM' && d.kind === 'divider_screw');
  assert.deepEqual(topScrews.map((d) => [d.x, d.y]), [[488.5, 423], [395.5, 423], [144.5, 423], [51.5, 423]]);
  assert.deepEqual(bottomScrews.map((d) => [d.x, d.y]), [[488.5, 441], [395.5, 441], [144.5, 441], [51.5, 441]]);
  // The TOP's marks are mirrored and reversed walks (the BOTTOM reads 477 -> 407).
  assert.deepEqual(top.cnc.marks.map((m) => [m.from, m.to]), [[[407, 423], [477, 423]], [[63, 423], [133, 423]]]);
  assert.deepEqual(bottom.cnc.marks.map((m) => [m.from, m.to]), [[[477, 441], [407, 441]], [[133, 441], [63, 441]]]);
  const pt = panelPlacement(top);
  const pb = panelPlacement(bottom);
  for (let i = 0; i < 4; i += 1) {
    const a = to3(pt, topScrews[i].x, topScrews[i].y);
    const b = to3(pb, bottomScrews[i].x, bottomScrews[i].y);
    assert.deepEqual([a[0], a[2]], [b[0], b[2]], `screw ${i}: one centre line, head and foot`);
    assert.deepEqual([a[1], b[1]], [770, 0]);
  }
  assert.equal(to3(pt, topScrews[0].x, topScrews[0].y)[0], 459, 'the divider\'s centre line, 450 + 9');
});

test('the notch: the TOP\'s corner "x0y1" at (200, 364), the BOTTOM\'s "x0y0" at (200, 200); both at the same cabinet corner', () => {
  const r = computeCabinet({ ...BUD, notch: { corner: 'BL', w: 200, d: 200, h: 0 } }, P);
  const top = panelOf(r, 'TOP');
  const bottom = panelOf(r, 'BOTTOM');
  assert.deepEqual(top.cnc.notch, { fc: 'x0y1', nw: 200, nh: 200 });
  assert.deepEqual(bottom.cnc.notch, { fc: 'x0y0', nw: 200, nh: 200 });
  // 16:10 (D12): the corner mark is one L through the corner, walked the outline's way.
  assert.deepEqual(top.cnc.marks[0].pts, [[200, 404], [200, 364], [160, 364]]);
  assert.deepEqual(bottom.cnc.marks[0].pts, [[160, 200], [200, 200], [200, 160]]);
  const a = to3(panelPlacement(top), 200, 364);
  const b = to3(panelPlacement(bottom), 200, 200);
  assert.deepEqual([a[0], a[2]], [b[0], b[2]], 'the re-entrant corner stands over the same plan point');
  assert.deepEqual([a[0], a[2]], [218, 218], 'x 200 + BUL, z 200 + the back: the rear-left in plan');
  // The DXF of the TOP carries the mark where the underside frame puts it.
  const file = buildUnitDxfFiles(r, P).find((f) => f.panelId === 'TOP');
  const legs = file.entities.filter((e) => e.layer === 'CORNER_4MM');
  assert.deepEqual(legs.map((e) => e.pts), [[[200, 404], [200, 364], [160, 364]]], 'one open L in the TOP\'s file');
});

test('the Cabineo TOP: OUTSIDE FACE UP as before, the y = 0 end is the BUR joint now, the export frame follows', () => {
  const r = computeCabinet({ ...BUD, shelves: 0, joints_system: 'cabineo12' }, P);
  const top = panelOf(r, 'TOP');
  assert.equal(top.meta.machinedFace, 'outside');
  const y0 = top.cnc.pockets.filter((k) => k.meta.end === 'Y0');
  const yh = top.cnc.pockets.filter((k) => k.meta.end === 'YH');
  assert.deepEqual([...new Set(y0.map((k) => k.meta.joint))], ['BUR-TOP']);
  assert.deepEqual([...new Set(yh.map((k) => k.meta.joint))], ['BUL-TOP']);
  assert.ok(y0.every((k) => k.y1 === 0) && yh.every((k) => k.y2 === 564));
  for (const k of [...y0, ...yh]) {
    assert.deepEqual(k.meta.export.box[1], k.y1, 'the export reflects x alone: its y is the drawn y');
    assert.deepEqual(k.meta.export.box[3], k.y2);
  }
  const lobes = r.drills.filter((d) => d.panel === 'TOP' && d.kind === 'cabineo_pocket');
  assert.equal(lobes.length, 27);
  assert.ok(lobes.every((d) => d.meta.export.at[1] === d.y), 'a lobe\'s export point carries the drawn y');
});

// ─── THE LIB: the groove under a top strip lands in the underside frame ───────

test('ledGroove: a strip under the TOP at unit x 100..300 is cut at y 282..482 on the TOP (from the BUR end), 82..282 on the BOTTOM', () => {
  const box = { x: 18, y: 752, z: 18, w: 564, h: 18, d: 540 };
  const strip = { kind: 'top_under', box: { x: 100, y: 740, z: 98, w: 200, h: 12, d: 10 } };
  const onTop = grooveForStrip(strip, { id: 'TOP', part: 'TOP', thickness: 18, box }, 4);
  const onBottom = grooveForStrip({ ...strip, kind: 'bottom' }, { id: 'BOTTOM', part: 'BOTTOM', thickness: 18, box: { ...box, y: 0 } }, 4);
  const ys = (g) => [Math.min(...g.pts.map((p) => p[1])), Math.max(...g.pts.map((p) => p[1]))];
  const xs = (g) => [Math.min(...g.pts.map((p) => p[0])), Math.max(...g.pts.map((p) => p[0]))];
  assert.deepEqual(ys(onBottom), [72, 292], 'the BOTTOM: 100 - 18 = 82 .. 282, plus the 10 overrun each end');
  assert.deepEqual(ys(onTop), [272, 492], 'the TOP: 582 - 300 = 282 .. 482, plus the overrun');
  assert.deepEqual(xs(onTop), xs(onBottom), 'the depth is the same axis on both');
  // And the cabinet point is the one point: the TOP's groove, placed, spans unit x 100..300.
  const pl = panelPlacement({ id: 'TOP', part: 'TOP', box });
  const unitX = onTop.pts.map((p) => to3(pl, p[0], p[1])[0]);
  assert.deepEqual([Math.min(...unitX), Math.max(...unitX)], [90, 310]);
});

// ─── LISP FIRST, AND THE GOLDENS NAMED ───────────────────────────────────────

test('LISP first: section J, D11 and D19 state the law; the six are re-pinned by name in f32', () => {
  const biscuit = read('reference/lisp/SKYLON_JOINTS_BISCUIT.lsp');
  assert.match(biscuit, /J\. THE TOP IS DRAWN FROM ITS UNDERSIDE/);
  assert.match(biscuit, /\(defun biscuit-top-mirror-pts \(pts h\)/);
  assert.match(biscuit, /\(defun biscuit-top-mirror-y \(y h\)/);
  assert.match(biscuit, /TOP:\s+the same four screws and two marks at y 864 - 441 = 423/);
  assert.match(read('reference/lisp/KIT_NOTCH.lsp'), /\(defun notch-top-pts \(pts drawnW drawnH\)/);
  assert.match(read('reference/lisp/KIT_NOTCH.lsp'), /\(defun notch-top-fc \(fc\)/);
  assert.match(read('reference/lisp/KIT_RECESS.lsp'), /D19 THE TOP IS DRAWN FROM ITS UNDERSIDE/);
  assert.match(read('reference/lisp/SKYLON_JOINTS_CABINEO.lsp'), /its UNDERSIDE\): the same x; y the/);
  const frag = read('scripts/t78-classify.d/f32-owner-1710d.mjs');
  for (const id of ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY']) {
    assert.match(frag, new RegExp(`verify/t70/goldens-base.json \\(${id}\\)`), `${id} is named as re-pinned`);
  }
  // ...and the working tree's base file carries the head's hashes (the re-pin was written).
  const base = JSON.parse(read('verify/t70/goldens-base.json'));
  const head = dump();
  for (const id of ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY']) assert.equal(head[id].sha256, base[id].sha256, id);
});
