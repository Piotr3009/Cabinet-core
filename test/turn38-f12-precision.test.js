// ─── TURN 38 · F12 — the precision quartet ──────────────────────────────────
//
// The owner: *"trim i fillet i offset to podstawa."*
//
// CLAUDE.md: *"ALL of these operate on MANUAL objects only. Every function
// lands with `node:test` coverage of the degenerate cases before any UI wiring
// (parallel lines don't intersect; trim with no intersection = no-op with a
// message; fillet on parallel lines rejected)."*
//
// So this file is the arithmetic, with all three of those named cases and the
// line–circle intersection F12 asks for by name.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  angleOnArc, arrayAlongLine, arrayRect, crossingsWith, filletLines,
  lineCircleIntersection, lineLineIntersection, offsetObject, trimObject,
} from '../src/engine/partPrecision.js';
import {
  arcThroughThreePoints, makeCircle, makeLine, makePolyline, makeRect, objectPoints,
} from '../src/engine/partObjects.js';
import { segmentIntersection } from '../src/engine/partSnap.js';

const L = 'SCREWS_3MM';
const line = (id, a, b) => makeLine({ id, layer: L, from: a, to: b });

// ═══ LINE × CIRCLE — the intersection F12 asks for by name ══════════════════

test('F12 — a segment across a circle gives TWO points, in order along it', () => {
  const hits = lineCircleIntersection([-100, 0], [100, 0], { cx: 0, cy: 0, r: 30 });
  assert.deepEqual(hits, [[-30, 0], [30, 0]]);
});

test('F12 — a TANGENT is ONE point, not two of the same', () => {
  const hits = lineCircleIntersection([-100, 30], [100, 30], { cx: 0, cy: 0, r: 30 });
  assert.equal(hits.length, 1, 'a line that touches touches once');
  assert.deepEqual(hits[0].map(Math.round), [0, 30]);
});

test('F12 — a MISS is no points, and so is a crossing past the segment’s ends', () => {
  assert.deepEqual(lineCircleIntersection([-100, 90], [100, 90], { cx: 0, cy: 0, r: 30 }), []);
  // The line would cross if it were extended — and `segmentIntersection` has
  // always refused that, so this refuses it too.
  assert.deepEqual(lineCircleIntersection([-100, 0], [-60, 0], { cx: 0, cy: 0, r: 30 }), []);
  // Degenerate inputs answer nothing rather than NaN.
  assert.deepEqual(lineCircleIntersection([5, 5], [5, 5], { cx: 0, cy: 0, r: 30 }), []);
  assert.deepEqual(lineCircleIntersection([-9, 0], [9, 0], { cx: 0, cy: 0, r: 0 }), []);
});

test('F12 — a crossing OFF an arc’s own sweep is not a crossing', () => {
  const arc = { ...arcThroughThreePoints([30, 0], [0, 30], [-30, 0]), op: 'arc', layer: L };
  assert.equal(angleOnArc(arc, 90), true, 'the top of the arc is on it');
  assert.equal(angleOnArc(arc, 270), false, 'the bottom of the circle is not');
  // A horizontal line through the centre meets the CIRCLE twice and this
  // half-arc at its two ends.
  const both = crossingsWith([-100, 0], [100, 0], arc);
  assert.equal(both.length, 2);
  // …and a line across the BOTTOM half meets the circle twice and the arc not
  // at all.
  assert.deepEqual(crossingsWith([-100, -20], [100, -20], arc), []);
});

test('F12 — parallel lines DO NOT intersect (CLAUDE.md’s own degenerate case)', () => {
  assert.equal(lineLineIntersection([0, 0], [10, 0], [0, 5], [10, 5]), null);
  assert.equal(segmentIntersection([[0, 0], [10, 0]], [[0, 5], [10, 5]]), null);
  // …and two that do, do.
  assert.deepEqual(lineLineIntersection([0, 0], [10, 0], [5, -5], [5, 5]), [5, 0]);
});

// ═══ OFFSET ═════════════════════════════════════════════════════════════════

test('F12 — OFFSET puts a parallel copy on the side the click fell', () => {
  const l = line('o1', [0, 0], [100, 0]);
  const above = offsetObject(l, 20, { x: 50, y: 40 }, 'o2');
  assert.equal(above.op, 'line');
  assert.equal(above.id, 'o2');
  assert.deepEqual([above.from[1], above.to[1]], [20, 20], 'the side the hand said');
  const below = offsetObject(l, 20, { x: 50, y: -40 }, 'o3');
  assert.deepEqual([below.from[1], below.to[1]], [-20, -20], '…and the other side');
  // The typed number's SIGN is ignored; the click is what says which side.
  const same = offsetObject(l, -20, { x: 50, y: 40 }, 'o4');
  assert.deepEqual([same.from[1], same.to[1]], [20, 20]);
  // It lands on the SAME layer.
  assert.equal(above.layer, L);
});

test('F12 — a circle offsets outward or inward, and never through itself', () => {
  const c = makeCircle({ id: 'o1', layer: L, at: [0, 0], r: 50 });
  assert.equal(offsetObject(c, 10, { x: 100, y: 0 }, 'o2').r, 60, 'the click is outside');
  assert.equal(offsetObject(c, 10, { x: 5, y: 0 }, 'o3').r, 40, '…and inside');
  assert.equal(offsetObject(c, 60, { x: 5, y: 0 }, 'o4'), null, 'a circle cannot be offset inside itself');
  assert.equal(offsetObject(c, 0, { x: 100, y: 0 }, 'o5'), null, 'and zero is not an offset');
});

test('F12 — a closed run offsets as a closed run, corner by corner', () => {
  const rect = makeRect({ id: 'o1', layer: L, from: [0, 0], to: [100, 60] });
  const out = offsetObject(rect, 10, { x: -30, y: 30 }, 'o2');
  assert.equal(out.op, 'polyline');
  assert.equal(out.closed, true);
  assert.equal(out.pts.length, 4, 'four corners, taken at the moved segments’ crossings');
  const xs = out.pts.map((p) => Math.round(p[0]));
  const ys = out.pts.map((p) => Math.round(p[1]));
  assert.deepEqual([...new Set(xs)].sort((a, b) => a - b), [-10, 110], 'ten proud on both sides');
  assert.deepEqual([...new Set(ys)].sort((a, b) => a - b), [-10, 70]);
});

test('F12 — a click exactly ON the line cannot say a side, and is refused', () => {
  const l = line('o1', [0, 0], [100, 0]);
  assert.equal(offsetObject(l, 20, { x: 50, y: 0 }, 'o2'), null);
});

// ═══ TRIM ═══════════════════════════════════════════════════════════════════

test('F12 — TRIM with NO intersection is a NO-OP (CLAUDE.md’s own case)', () => {
  const victim = line('o1', [0, 0], [100, 0]);
  const edge = line('o2', [0, 50], [100, 50]);
  assert.equal(trimObject(victim, [edge], { x: 50, y: 0 }, ['o3', 'o4']), null,
    'a parallel cutting edge cuts nothing, and says so with null');
  assert.equal(trimObject(victim, [], { x: 50, y: 0 }, []), null, 'and no edge at all is no trim');
});

test('F12 — TRIM takes out the piece the click fell in, line against line', () => {
  const victim = line('o1', [0, 0], [100, 0]);
  const edge = line('o2', [40, -20], [40, 20]);
  // Click LEFT of the cut: the left piece goes, the right survives.
  const right = trimObject(victim, [edge], { x: 10, y: 0 }, ['o3', 'o4']);
  assert.equal(right.length, 1);
  assert.equal(right[0].op, 'line');
  assert.deepEqual([right[0].from, right[0].to], [[40, 0], [100, 0]]);
  // Click RIGHT of it: the other way round.
  const left = trimObject(victim, [edge], { x: 90, y: 0 }, ['o3', 'o4']);
  assert.deepEqual([left[0].from, left[0].to], [[0, 0], [40, 0]]);
});

test('F12 — TRIM through the MIDDLE leaves two pieces', () => {
  const victim = line('o1', [0, 0], [100, 0]);
  const edges = [line('o2', [30, -20], [30, 20]), line('o3', [70, -20], [70, 20])];
  const out = trimObject(victim, edges, { x: 50, y: 0 }, ['o4', 'o5']);
  assert.equal(out.length, 2, 'the two ends survive');
  assert.deepEqual(out[0].to, [30, 0]);
  assert.deepEqual(out[1].from, [70, 0]);
  assert.deepEqual(out.map((o) => o.id), ['o4', 'o5']);
});

test('F12 — TRIM works line-vs-CIRCLE, which is what F12 asks for by name', () => {
  const victim = line('o1', [-100, 0], [100, 0]);
  const circle = makeCircle({ id: 'o2', layer: L, at: [0, 0], r: 30 });
  const out = trimObject(victim, [circle], { x: 0, y: 0 }, ['o3', 'o4']);
  assert.equal(out.length, 2, 'the piece inside the circle goes');
  assert.deepEqual(out[0].to, [-30, 0]);
  assert.deepEqual(out[1].from, [30, 0]);
});

test('F12 — trimming a POLYLINE keeps it a run of points', () => {
  const victim = makePolyline({ id: 'o1', layer: L, pts: [[0, 0], [50, 0], [50, 50]] });
  const edge = line('o2', [25, -20], [25, 20]);
  const out = trimObject(victim, [edge], { x: 5, y: 0 }, ['o3', 'o4']);
  assert.equal(out.length, 1);
  assert.equal(out[0].op, 'polyline');
  assert.deepEqual(out[0].pts[0], [25, 0]);
  assert.deepEqual(out[0].pts[out[0].pts.length - 1], [50, 50]);
});

// ═══ FILLET ═════════════════════════════════════════════════════════════════

test('F12 — FILLET on PARALLEL lines is REJECTED (CLAUDE.md’s own case)', () => {
  assert.equal(filletLines(line('o1', [0, 0], [100, 0]), line('o2', [0, 20], [100, 20]), 8, 'o3'), null);
  // …and so is a fillet of a line with itself, or with something that is not a
  // line at all.
  const l = line('o1', [0, 0], [100, 0]);
  assert.equal(filletLines(l, l, 8, 'o3'), null);
  assert.equal(filletLines(l, makeCircle({ id: 'o2', layer: L, at: [0, 0], r: 5 }), 8, 'o3'), null);
});

test('F12 — FILLET rounds the corner and shortens both lines to the tangent points', () => {
  const a = line('o1', [0, 0], [100, 0]);
  const b = line('o2', [0, 0], [0, 100]);
  const out = filletLines(a, b, 20, 'o3');
  assert.ok(out, 'a right angle takes a 20 radius');
  assert.ok(out.arc, 'and it is an arc');
  assert.equal(Math.round(out.arc.r), 20);
  assert.deepEqual([Math.round(out.arc.cx), Math.round(out.arc.cy)], [20, 20]);
  // The two lines now END at the tangent points, 20 from the corner.
  const shortA = out.replaced.get('o1');
  const shortB = out.replaced.get('o2');
  assert.deepEqual(shortA.from, [100, 0], 'the far end is untouched');
  assert.deepEqual(shortA.to, [20, 0], '…and the corner end is pulled back');
  assert.deepEqual(shortB.from, [0, 20]);
  assert.deepEqual(shortB.to, [0, 100]);
  // The arc really starts and ends at those two points.
  const ends = objectPoints(out.arc, 2);
  const got = [ends[0], ends[2]].map((p) => `${Math.round(p[0])},${Math.round(p[1])}`).sort();
  assert.deepEqual(got, ['0,20', '20,0']);
});

test('F12 — RADIUS 0 is a corner JOIN, with no arc at all', () => {
  const out = filletLines(line('o1', [0, 0], [100, 0]), line('o2', [0, 0], [0, 100]), 0, 'o3');
  assert.ok(out);
  assert.equal(out.arc, null, 'radius 0 = corner join');
  assert.deepEqual(out.replaced.get('o1').to, [0, 0], 'both run to the corner itself');
  assert.deepEqual(out.replaced.get('o2').from, [0, 0]);
});

test('F12 — an IMPOSSIBLE radius is refused, never crashed', () => {
  // A 500 radius will not fit inside two 100 mm legs.
  assert.equal(filletLines(line('o1', [0, 0], [100, 0]), line('o2', [0, 0], [0, 100]), 500, 'o3'), null);
  // …and neither will one that fits one leg but not the other.
  assert.equal(filletLines(line('o1', [0, 0], [100, 0]), line('o2', [0, 0], [0, 15]), 20, 'o3'), null);
  // A shallow corner takes a much smaller radius than a right angle does.
  assert.ok(filletLines(line('o1', [0, 0], [100, 0]), line('o2', [0, 0], [0, 100]), 5, 'o3'));
});

// ═══ ARRAY ══════════════════════════════════════════════════════════════════

test('F12 — a RECTANGULAR array is rows × cols, minus the original', () => {
  const c = makeCircle({ id: 'o1', layer: L, at: [10, 10], r: 5 });
  const ids = ['o2', 'o3', 'o4', 'o5', 'o6', 'o7', 'o8', 'o9', 'o10', 'o11', 'o12'];
  const made = arrayRect({
    objects: [c], rows: 4, cols: 3, spacing: 32, ids,
  });
  assert.equal(made.length, 11, '4 × 3 places twelve, and one of them was already there');
  const at = made.map((o) => `${o.at[0]},${o.at[1]}`);
  assert.ok(at.includes('42,10'), 'one across');
  assert.ok(at.includes('10,42'), 'one up');
  assert.ok(at.includes('74,106'), 'and the far corner');
  assert.deepEqual(made.map((o) => o.id), ids.slice(0, 11), 'ids come from the caller, in order');
  // A member of a group comes out of an array as its own object.
  const grouped = arrayRect({
    objects: [{ ...c, group: 'g1' }], rows: 1, cols: 2, spacing: 10, ids: ['o2'],
  });
  assert.equal('group' in grouped[0], false);
});

test('F12 — an array with no spacing, no count or nothing selected places nothing', () => {
  const c = makeCircle({ id: 'o1', layer: L, at: [10, 10], r: 5 });
  assert.deepEqual(arrayRect({ objects: [c], rows: 3, cols: 3, spacing: 0, ids: [] }), []);
  assert.deepEqual(arrayRect({ objects: [c], rows: 1, cols: 1, spacing: 32, ids: [] }), []);
  assert.deepEqual(arrayRect({ objects: [], rows: 3, cols: 3, spacing: 32, ids: [] }), []);
});

test('F12 — an ALONG-A-LINE array is the dowel line’s own pattern, on whole objects', () => {
  const c = makeCircle({ id: 'o1', layer: L, at: [0, 0], r: 5 });
  const made = arrayAlongLine({
    objects: [c], from: { x: 0, y: 0 }, to: { x: 300, y: 0 }, count: 4, ids: ['o2', 'o3', 'o4'],
  });
  assert.equal(made.length, 3, 'four places, one of them the original');
  assert.deepEqual(made.map((o) => o.at[0]), [100, 200, 300], 'spread evenly, ends included');
  assert.deepEqual(arrayAlongLine({
    objects: [c], from: { x: 0, y: 0 }, to: { x: 0, y: 0 }, count: 4,
  }), [], 'a zero-length run places nothing');
});

// ═══ AND THEY TOUCH MANUAL OBJECTS ONLY ═════════════════════════════════════

test('F12 — the quartet is reached only from the editor’s own object list', () => {
  const src = readFileSync(new URL('../src/components/PartDetailModal.jsx', import.meta.url), 'utf8');
  // Every one of the four acts on `chosen` (the selected MANUAL objects) or on
  // `objects` (the whole manual list) — never on `drawing.machinings`, which is
  // what the engine cut.
  for (const verb of ['offsetObject(chosen[0]', 'trimObject(victim, chosen', 'filletLines(held[0], hit', 'arrayRect({']) {
    assert.ok(src.includes(verb), `${verb} is wired to the manual list`);
  }
  assert.match(src, /nearestObject\(objects\.filter\(\(o\) => !selected\.includes\(o\.id\)\), base/,
    'trim looks for its victim among the manual objects');
  // A refusal is a SENTENCE in the status bar, never a crash.
  for (const said of [
    'That shape cannot be offset by that distance.',
    'No intersection — nothing was trimmed.',
    'Those two lines cannot take that radius.',
  ]) {
    assert.ok(src.includes(said), `"${said}" is said out loud`);
  }
});
