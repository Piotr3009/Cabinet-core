// ─── TURN 38 · F5 — drawing NEW objects ─────────────────────────────────────
//
// CLAUDE.md: *"Tests first: geometry constructors (arc through 3 points
// especially) in `node:test` with degenerate cases (collinear points → no arc,
// zero radius, zero-size rect → rejected)."*
//
// So this file is the constructors before they were wired to anything, the two
// new channels they land on, and the TAB-cycling entry's own arithmetic.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  OBJECT_OPS, arcPointAt, arcPoints, arcSweep, arcThroughThreePoints, distanceToObject,
  isObjectOp, makeArc, makeCircle, makeLine, makePolyline, makeRect, nextObjectId,
  nextObjectIds, objectBounds, objectInBox, objectPoints, rectCorners,
} from '../src/engine/partObjects.js';
import { applyPartEdits, partOpsOf, withPartEdit, withPartOps } from '../src/engine/partEdits.js';
import { snapGeometry } from '../src/engine/partSnap.js';
import { partDetailDrawing } from '../src/engine/drawings/partDetail.js';
import { liveDimValues, pointFromDims, TOOL_BY_ID, TOOLS } from '../src/lib/partTools.js';
import { panelSizeOf } from '../src/stores/projectStore.js';

const L = 'SCREWS_3MM';

// ═══ THE CONSTRUCTORS, AND EVERY DEGENERATE CASE ════════════════════════════

test('F5 — a LINE of zero length is not a line', () => {
  assert.ok(makeLine({ id: 'o1', layer: L, from: [0, 0], to: [10, 0] }));
  assert.equal(makeLine({ id: 'o1', layer: L, from: [5, 5], to: [5, 5] }), null);
  assert.equal(makeLine({ id: 'o1', layer: L, from: [5, 5], to: null }), null);
  assert.equal(makeLine({ id: 'o1', layer: L, from: [NaN, 0], to: [10, 0] }), null);
});

test('F5 — a POLYLINE drops repeated points and refuses fewer than two', () => {
  const run = makePolyline({ id: 'o1', layer: L, pts: [[0, 0], [0, 0], [10, 0], [10, 10]] });
  assert.deepEqual(run.pts, [[0, 0], [10, 0], [10, 10]], 'the double click is one point');
  assert.equal(makePolyline({ id: 'o1', layer: L, pts: [[3, 3]] }), null);
  assert.equal(makePolyline({ id: 'o1', layer: L, pts: [[3, 3], [3, 3]] }), null);
  // C closes it — but a closed run of two points is a line drawn there and back.
  assert.equal(makePolyline({ id: 'o1', layer: L, pts: [[0, 0], [9, 0]], closed: true }), null);
  assert.equal(makePolyline({
    id: 'o1', layer: L, pts: [[0, 0], [9, 0], [9, 9]], closed: true,
  }).closed, true);
});

test('F5 — a RECT with either side zero is REJECTED', () => {
  assert.ok(makeRect({ id: 'o1', layer: L, from: [0, 0], to: [40, 25] }));
  assert.equal(makeRect({ id: 'o1', layer: L, from: [0, 0], to: [0, 25] }), null);
  assert.equal(makeRect({ id: 'o1', layer: L, from: [0, 0], to: [40, 0] }), null);
  assert.equal(makeRect({ id: 'o1', layer: L, from: [0, 0], to: [0, 0] }), null);
});

test('F5 — a CIRCLE of zero radius is a click that never moved, not a circle', () => {
  assert.equal(makeCircle({ id: 'o1', layer: L, at: [10, 10], r: 0 }), null);
  assert.equal(makeCircle({ id: 'o1', layer: L, at: [10, 10], r: -4 }), null);
  assert.equal(makeCircle({ id: 'o1', layer: L, at: [10, 10], r: 12 }).r, 12);
});

// ─── THE ARC THROUGH THREE POINTS — CLAUDE.md's own "especially" ────────────

test('F5 — three COLLINEAR points make no arc', () => {
  assert.equal(arcThroughThreePoints([0, 0], [10, 0], [20, 0]), null);
  assert.equal(arcThroughThreePoints([0, 0], [10, 10], [20, 20]), null);
  // …including the degenerate collinear cases: two of the three the same.
  assert.equal(arcThroughThreePoints([0, 0], [0, 0], [20, 5]), null);
  assert.equal(arcThroughThreePoints([0, 0], [20, 5], [20, 5]), null);
  assert.equal(makeArc({ id: 'o1', layer: L, a: [0, 0], b: [5, 0], c: [9, 0] }), null);
});

test('F5 — the arc really passes through all three points', () => {
  const cases = [
    [[0, 0], [10, 10], [20, 0]],
    [[0, 0], [-10, 10], [-20, 0]],
    [[100, 40], [130, 90], [180, 40]],
    [[0, 0], [10, -10], [20, 0]],
  ];
  for (const [a, b, c] of cases) {
    const arc = arcThroughThreePoints(a, b, c);
    assert.ok(arc, `${JSON.stringify([a, b, c])} makes an arc`);
    for (const p of [a, b, c]) {
      assert.ok(Math.abs(Math.hypot(p[0] - arc.cx, p[1] - arc.cy) - arc.r) < 1e-3,
        `${JSON.stringify(p)} is on the circle`);
    }
    // …and the MIDDLE point is on the SWEEP, not on the other side of it. That
    // is the half a circumcentre alone does not give you.
    const on = arcPoints(arc, 200);
    const near = Math.min(...on.map((q) => Math.hypot(q[0] - b[0], q[1] - b[1])));
    assert.ok(near < 0.5, `the through-point is on the swept arc (nearest ${near})`);
  }
});

test('F5 — an arc sweeps ANTICLOCKWISE from start to end, which is what a DXF says', () => {
  const arc = arcThroughThreePoints([10, 0], [0, 10], [-10, 0]);
  assert.ok(arc);
  const first = arcPointAt(arc, 0);
  const last = arcPointAt(arc, 1);
  // The ends are the two outer points, whichever way round they were given.
  const ends = [first, last].map((p) => `${Math.round(p[0])},${Math.round(p[1])}`).sort();
  assert.deepEqual(ends, ['-10,0', '10,0']);
  assert.ok(arcSweep(arc) > 0 && arcSweep(arc) <= 360);
  // Given the SAME three points the other way round, the arc is the same arc.
  const back = arcThroughThreePoints([-10, 0], [0, 10], [10, 0]);
  assert.deepEqual(back, arc, 'read from either end, it is one arc');
});

test('F5 — a full-turn sweep is 360 and never 0', () => {
  assert.equal(arcSweep({ start: 0, end: 0 }), 360);
  assert.equal(arcSweep({ start: 90, end: 90 }), 360);
  assert.equal(arcSweep({ start: 0, end: 90 }), 90);
  assert.equal(arcSweep({ start: 350, end: 10 }), 20, 'and it wraps past 360');
});

// ═══ READING A SHAPE ════════════════════════════════════════════════════════

test('F5 — every shape has ONE reading: its own run of points', () => {
  const rect = makeRect({ id: 'o1', layer: L, from: [10, 20], to: [50, 60] });
  assert.deepEqual(rectCorners(rect), [[10, 20], [50, 20], [50, 60], [10, 60]]);
  assert.equal(objectPoints(rect).length, 5, 'closed: the first corner comes round again');
  const b = objectBounds(rect);
  assert.deepEqual([b.x, b.y, b.w, b.h], [10, 20, 40, 40]);
  const circle = makeCircle({ id: 'o2', layer: L, at: [100, 100], r: 25 });
  assert.deepEqual(objectBounds(circle), {
    x: 75, y: 75, w: 50, h: 50,
  });
  // …and "how near is the cursor to it" is measured to the INK, not to a box.
  assert.ok(Math.abs(distanceToObject(circle, { x: 100, y: 100 }) - 25) < 1e-6, 'the centre is 25 off the rim');
  assert.ok(distanceToObject(circle, { x: 125, y: 100 }) < 1e-6, 'and the rim is on it');
});

test('F5 — a marquee takes what is WHOLLY inside it', () => {
  const rect = makeRect({ id: 'o1', layer: L, from: [10, 10], to: [30, 30] });
  assert.equal(objectInBox(rect, { x: 0, y: 0, w: 100, h: 100 }), true);
  assert.equal(objectInBox(rect, { x: 0, y: 0, w: 20, h: 100 }), false, 'half in is not in');
  assert.equal(objectInBox(rect, { x: 10, y: 10, w: 20, h: 20 }), true, 'exactly in is in');
});

// ═══ IDS ARE DETERMINISTIC ══════════════════════════════════════════════════

test('F5 — object ids are counted, never stamped with a clock', () => {
  assert.equal(nextObjectId([]), 'o1');
  assert.equal(nextObjectId([{ id: 'o1' }, { id: 'o7' }, { id: 'o3' }]), 'o8');
  assert.deepEqual(nextObjectIds([{ id: 'o2' }], 3), ['o3', 'o4', 'o5']);
  // A list with ids from somewhere else does not confuse the counter.
  assert.equal(nextObjectId([{ id: 'hole|X|1|2|3' }]), 'o1');
});

test('F5 — the five drawn ops are the five, and the older four are not among them', () => {
  assert.deepEqual([...OBJECT_OPS], ['line', 'polyline', 'rect', 'circle', 'arc']);
  assert.equal(isObjectOp({ op: 'rect' }), true);
  assert.equal(isObjectOp({ op: 'drill' }), false);
  assert.equal(isObjectOp({ op: 'hide' }), false);
  assert.equal(isObjectOp(null), false);
});

// ═══ THE TWO NEW CHANNELS ═══════════════════════════════════════════════════

const panel = () => ({
  id: 'BACK',
  w: 600,
  h: 800,
  thickness: 18,
  cnc: {
    drawn_w: 600, drawn_h: 800, outline: [[0, 0], [600, 0], [600, 800], [0, 800]], layer: 'OUTLINE',
  },
});

const result = () => ({ panels: [panel()], drills: [] });

test('F5 — polylines and rects land on cnc.paths; circles and arcs on cnc.curves', () => {
  const edits = {
    BACK: {
      signature: '600×800×18',
      panelSize: { w: 600, h: 800 },
      ops: [
        makePolyline({ id: 'o1', layer: L, pts: [[10, 10], [80, 10], [80, 90]] }),
        makeRect({ id: 'o2', layer: L, from: [200, 200], to: [300, 260] }),
        makeCircle({ id: 'o3', layer: L, at: [400, 400], r: 30 }),
        makeArc({ id: 'o4', layer: L, a: [100, 500], b: [140, 540], c: [180, 500] }),
      ],
    },
  };
  const out = applyPartEdits(result(), edits);
  const p = out.panels[0];
  assert.equal(p.cnc.paths.length, 2, 'the run and the rectangle');
  assert.equal(p.cnc.paths[1].closed, true, 'a rect is a CLOSED run of its four corners');
  assert.equal(p.cnc.paths[1].pts.length, 4);
  assert.equal(p.cnc.curves.length, 2);
  assert.deepEqual(p.cnc.curves.map((c) => c.kind), ['circle', 'arc']);
  // Every record says WHICH op drew it, which is what the editor's verbs walk
  // back along.
  assert.deepEqual(p.cnc.paths.map((x) => x.opId), ['o1', 'o2']);
  assert.deepEqual(p.cnc.curves.map((x) => x.opId), ['o3', 'o4']);
});

test('F5 — a part with nothing drawn on it carries NEITHER key', () => {
  const out = applyPartEdits(result(), {
    BACK: { signature: '600×800×18', ops: [{ op: 'drill', layer: L, x: 10, y: 10, d: 3 }] },
  });
  assert.equal('paths' in out.panels[0].cnc, false);
  assert.equal('curves' in out.panels[0].cnc, false);
  // …and a project with no edits at all gets the SAME OBJECT back.
  const bare = result();
  assert.equal(applyPartEdits(bare, null), bare);
});

test('F5 — the drawing reads both channels, and the snap engine snaps to them', () => {
  const edits = {
    BACK: {
      signature: '600×800×18',
      ops: [
        makeRect({ id: 'o1', layer: L, from: [100, 100], to: [200, 200] }),
        makeCircle({ id: 'o2', layer: L, at: [400, 400], r: 30 }),
        makeArc({ id: 'o3', layer: L, a: [100, 500], b: [140, 540], c: [180, 500] }),
      ],
    },
  };
  const out = applyPartEdits(result(), edits);
  const drawing = partDetailDrawing(out.panels[0], { drills: out.drills });
  const kinds = drawing.machinings.map((m) => m.kind).sort();
  assert.deepEqual(kinds, ['arc', 'circle', 'path']);
  for (const m of drawing.machinings) assert.ok(m.note, `${m.kind} says what it is`);

  const geom = snapGeometry(drawing);
  // The rect brought four segments (so ENDs, MIDs, INTs); the circle a circle
  // (so CEN and QUADs); the arc both.
  assert.ok(geom.segments.length >= 4 + 24, `the rect and the arc chord run: ${geom.segments.length}`);
  assert.equal(geom.circles.length, 2, 'the circle and the arc');
  assert.ok(geom.circles.some((c) => c.x === 400 && c.y === 400 && c.r === 30));
});

// ═══ THE OP LIST IS THE DOOR EVERY VERB GOES THROUGH ════════════════════════

test('F5 — the size of the board is stamped ONCE, the first time (F9 needs it)', () => {
  const size = panelSizeOf(panel());
  assert.deepEqual(size, { w: 600, h: 800 });
  let map = withPartEdit({}, 'BACK', { op: 'drill', layer: L, x: 1, y: 1, d: 3 }, 'sig', size);
  assert.deepEqual(map.BACK.panelSize, { w: 600, h: 800 });
  // A second op does NOT re-stamp it — a stamp that refreshed itself would
  // answer "the same size" forever, which is the whole thing F9 asks.
  map = withPartEdit(map, 'BACK', { op: 'drill', layer: L, x: 2, y: 2, d: 3 }, 'sig', { w: 999, h: 999 });
  assert.deepEqual(map.BACK.panelSize, { w: 600, h: 800 });
  assert.equal(map.BACK.ops.length, 2);
});

test('F5 — withPartOps REPLACES the list, and an empty list is back-to-computed', () => {
  const ops = [makeRect({ id: 'o1', layer: L, from: [0, 0], to: [10, 10] })];
  const map = withPartOps({}, 'BACK', ops, 'sig', { w: 600, h: 800 });
  assert.deepEqual(partOpsOf(map, 'BACK'), ops);
  assert.deepEqual(withPartOps(map, 'BACK', [], 'sig'), {}, 'nothing left is nothing stored');
  // An op the list does not recognise is not smuggled in.
  assert.deepEqual(partOpsOf(withPartOps({}, 'BACK', [{ op: 'nonsense' }], 'sig'), 'BACK'), []);
});

// ═══ THE TAB-CYCLING ENTRY (F5's own grammar) ═══════════════════════════════

test('F5 — every drawing tool declares how many points it takes', () => {
  const ids = TOOLS.flatMap((g) => g.items.map((t) => t.id));
  for (const four of ['select', 'drill', 'line', 'dowels']) assert.ok(ids.includes(four), four);
  for (const added of ['polyline', 'circle', 'rect', 'arc', 'measure']) assert.ok(ids.includes(added), added);
  assert.equal(TOOL_BY_ID.get('arc').pts, 3, 'an arc takes three points');
  assert.equal(TOOL_BY_ID.get('polyline').pts, 0, 'a polyline runs until the hand says stop');
  assert.deepEqual(TOOL_BY_ID.get('rect').dims, ['width', 'height'], 'TAB order: width → height');
});

test('F5 — a typed dimension FIXES that dimension; an empty one follows the cursor', () => {
  const start = { x: 100, y: 100 };
  const cursor = { x: 160, y: 130 };
  // Nothing typed: the point IS the cursor.
  assert.deepEqual(pointFromDims({ tool: 'rect', start, cursor, values: {} }), { x: 160, y: 130 });
  // Width typed: the width is fixed, the height still follows the hand.
  assert.deepEqual(pointFromDims({
    tool: 'rect', start, cursor, values: { width: '38' },
  }), { x: 138, y: 130 });
  // Both typed: the shape is exactly what was asked for.
  assert.deepEqual(pointFromDims({
    tool: 'rect', start, cursor, values: { width: '38', height: '12' },
  }), { x: 138, y: 112 });
  // …and the SIGN comes from where the hand is, so a rect dragged down-left
  // takes the typed numbers down and left.
  assert.deepEqual(pointFromDims({
    tool: 'rect', start, cursor: { x: 40, y: 40 }, values: { width: '38', height: '12' },
  }), { x: 62, y: 88 });
});

test('F5 — a circle takes a radius, a line a length and an angle', () => {
  const start = { x: 0, y: 0 };
  const at = pointFromDims({
    tool: 'circle', start, cursor: { x: 3, y: 4 }, values: { radius: '50' },
  });
  assert.ok(Math.abs(Math.hypot(at.x, at.y) - 50) < 1e-9, 'the rim is 50 from the centre');
  const line = pointFromDims({
    tool: 'line', start, cursor: { x: 1, y: 1 }, values: { length: '100', angle: '0' },
  });
  assert.deepEqual([Math.round(line.x), Math.round(line.y)], [100, 0]);
});

test('F5 — the live read-out is the same arithmetic, run the other way', () => {
  const live = liveDimValues({ tool: 'rect', start: { x: 10, y: 10 }, cursor: { x: 60, y: 40 } });
  assert.deepEqual(live, { width: 50, height: 30 });
  const c = liveDimValues({ tool: 'circle', start: { x: 0, y: 0 }, cursor: { x: 3, y: 4 } });
  assert.equal(c.radius, 5);
  assert.deepEqual(liveDimValues({ tool: 'rect', start: null, cursor: null }), {});
});
