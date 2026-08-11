// ─── TURN 20 F6: THE RULER LEARNS THE OBJECT'S OWN POINTS ───────────────────
//
// Owner: "the tape grabs wherever the ray lands. It must catch the points a
// joiner means — corner, end, middle, the meeting of two parts — show that it
// caught one, and only then measure." AutoCAD's osnap, which is his home
// ground.
//
// F6.1 asks for the generation to be "pure arithmetic in a lib module …
// unit-tested on a two-panel fixture", and F6.2 for a nearest-magnet pick in
// SCREEN space. Both are here, and the two-panel fixture is the first block:
// two boards butted the way a carcass side meets a bottom.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SNAP_KINDS, boxCorners, boxEdgeMidpoints, contactPoints, nearestSnap, snapTargets,
} from '../src/lib/rulerSnaps.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';

/** A box from its origin and its size, which is how the engine states one. */
const box = (id, [x, y, z], [w, h, d]) => ({
  id, min: [x, y, z], max: [x + w, y + h, z + d],
});

// ─── THE TWO-PANEL FIXTURE (F6.1) ───────────────────────────────────────────
//
// A carcass side standing on a bottom, exactly as the engine cuts them: the
// side is 18 wide and 720 tall, the bottom 18 thick and 564 wide, and they meet
// along the line where the side's inner face crosses the bottom's top face.
const SIDE = box('BUL', [0, 0, 0], [18, 720, 540]);
const BOTTOM = box('BOTTOM', [18, 0, 0], [564, 18, 540]);

const kindsOf = (targets) => targets.reduce((acc, t) => {
  acc[t.kind] = (acc[t.kind] || 0) + 1;
  return acc;
}, {});

const has = (targets, p) => targets.some((t) => t.p.every((v, i) => Math.abs(v - p[i]) < 1e-9));
const kindAt = (targets, p) => targets.find((t) => t.p.every((v, i) => Math.abs(v - p[i]) < 1e-9))?.kind;

test('F6.1 — one panel offers 8 ENDs and 12 MIDs, and no more', () => {
  const targets = snapTargets([SIDE], { contactMm: P.editor.ruler.contactMm });
  assert.deepEqual(kindsOf(targets), { END: 8, MID: 12 });
  assert.equal(boxCorners(SIDE).length, 8);
  assert.equal(boxEdgeMidpoints(SIDE).length, 12);
  // The corners are the corners.
  assert.ok(has(targets, [0, 0, 0]));
  assert.ok(has(targets, [18, 720, 540]));
  // …and a midpoint is halfway along one axis and pinned on the other two.
  assert.equal(kindAt(targets, [9, 0, 0]), 'MID');
  assert.equal(kindAt(targets, [0, 360, 0]), 'MID');
  assert.equal(kindAt(targets, [0, 0, 270]), 'MID');
});

test('F6.1 — two panels that MEET add the shared edge’s midpoint and its ends', () => {
  const alone = snapTargets([SIDE], { contactMm: 0.5 }).length
    + snapTargets([BOTTOM], { contactMm: 0.5 }).length;
  const together = snapTargets([SIDE, BOTTOM], { contactMm: 0.5 });

  // The two boards share four corners along the line x = 18 — those are ENDs on
  // both and are counted once (F6: a tape that offered the same pixel three
  // times would be a tape that hesitated).
  const contact = contactPoints(SIDE, BOTTOM, 0.5);
  assert.equal(contact.length, 3, 'the midpoint of the shared edge and its two ends');
  // The shared edge runs in Z — the two boards butt across the side's inner
  // face — through the middle of the 18 mm they overlap on Y. That line is
  // where a joiner puts a pencil, and its centre is the inside corner of the
  // carcass, the point an opening is measured from.
  assert.deepEqual(contact[0], [18, 9, 270], 'the midpoint of the shared edge');
  assert.deepEqual(contact[1], [18, 9, 0], '…and its two ends');
  assert.deepEqual(contact[2], [18, 9, 540]);

  for (const p of contact) assert.ok(has(together, p), `${p} is offered`);
  assert.equal(kindAt(together, [18, 9, 270]), 'INT', 'the middle of the shared edge is an INT');
  // The two ENDS of that edge are also the midpoints of the side's own front
  // and back edges, and MID beats INT — AutoCAD's own priority, and the reason
  // a coincident point is offered once rather than three times.
  assert.equal(kindAt(together, [18, 9, 0]), 'MID');
  assert.ok(together.length < alone + 3, 'coincident points are one point');
});

test('F6.1 — two panels that do NOT meet offer no INT at all', () => {
  const apart = box('SHELF', [18, 400, 0], [564, 18, 540]);
  const far = box('OTHER', [900, 0, 0], [18, 720, 540]);
  assert.deepEqual(contactPoints(SIDE, far, 0.5), []);
  // …and one that is only NEAR does, because a joint drawn a quarter of a
  // millimetre open is still a joint.
  const hair = box('HAIR', [18.4, 400, 0], [564, 18, 540]);
  assert.equal(contactPoints(SIDE, hair, 0.5).length, 3);
  assert.equal(contactPoints(SIDE, hair, 0.2).length, 0, 'and a millimetre apart is apart');
  // The three contact points are all OFFERED; two of them land exactly on the
  // shelf's own edge midpoints, and MID wins those — which is the dedupe doing
  // its job rather than the contact being missed.
  const together = snapTargets([SIDE, apart], { contactMm: 0.5 });
  for (const p of contactPoints(SIDE, apart, 0.5)) assert.ok(has(together, p), `${p} is offered`);
  assert.equal(together.filter((t) => t.kind === 'INT').length, 1);
});

test('F6.1 — two boards sharing only a CORNER offer no INT: it is already an END', () => {
  const a = box('A', [0, 0, 0], [18, 100, 18]);
  const b = box('B', [18, 100, 18], [18, 100, 18]);
  assert.deepEqual(contactPoints(a, b, 0.5), []);
});

// ─── F6.2 — the magnet ──────────────────────────────────────────────────────

/** A flat projection, so the pick can be tested without a camera. */
const flat = (p) => ({ x: p[0], y: p[1], behind: false });

test('F6.2 — the nearest target within snapPx is caught, and nothing beyond it', () => {
  const targets = snapTargets([SIDE], { contactMm: 0.5 });
  const near = nearestSnap(targets, flat, { x: 2, y: 3 }, P.editor.ruler.snapPx);
  assert.ok(near, 'a corner four pixels away is caught');
  assert.deepEqual(near.p.slice(0, 2), [0, 0]);
  assert.ok(near.distancePx < P.editor.ruler.snapPx);

  // Halfway across the board is not near anything.
  assert.equal(nearestSnap(targets, flat, { x: 300, y: 300 }, P.editor.ruler.snapPx), null);
  // …and neither is a point one pixel outside the aperture.
  assert.equal(nearestSnap(targets, flat, { x: 0, y: -13 }, 12), null);
});

test('F6.2 — the magnet is in PIXELS, so it does not change with the model', () => {
  assert.equal(P.editor.ruler.snapPx, 12);
  const targets = snapTargets([SIDE], { contactMm: 0.5 });
  // The same cursor, the same answer, whatever the projection's scale — which
  // is the property a millimetre-based magnet does not have.
  const zoomed = (p) => ({ x: p[0] * 10, y: p[1] * 10, behind: false });
  assert.ok(nearestSnap(targets, zoomed, { x: 3, y: 4 }, 12), 'the corner at 0,0 is still 5 px away');
  // What the scale changes is what else is in REACH. The midpoint 9 mm along
  // is 9 px from the corner unzoomed and 90 px from it here, so a cursor
  // halfway between them catches one of them in the first case and neither in
  // the second — which is a magnet measured in pixels behaving like an
  // aperture rather than like a distance in the model.
  assert.equal(nearestSnap(targets, zoomed, { x: 45, y: 0 }, 12), null,
    'halfway between the two, and neither is within twelve pixels');
  assert.ok(nearestSnap(targets, flat, { x: 4.5, y: 0 }, 12), '…where unzoomed, both were');
});

test('F6.2 — a tie goes to the higher-priority kind: END beats MID beats INT', () => {
  assert.deepEqual(SNAP_KINDS, ['END', 'MID', 'INT']);
  const targets = [
    { kind: 'INT', p: [0, 0, 0], of: ['a'] },
    { kind: 'MID', p: [0, 0, 1], of: ['a'] },
    { kind: 'END', p: [0, 0, 2], of: ['a'] },
  ];
  assert.equal(nearestSnap(targets, flat, { x: 0, y: 0 }, 12).kind, 'END');
});

test('F6.2 — a point behind the camera is never caught', () => {
  const behind = () => ({ x: 0, y: 0, behind: true });
  assert.equal(nearestSnap(snapTargets([SIDE]), behind, { x: 0, y: 0 }, 12), null);
});

// ─── the whole thing, on a real cabinet ─────────────────────────────────────

test('F6 — a real carcass offers its corners, its midpoints and its inside corners', () => {
  const r = computeCabinet({
    type: 'BUD', width: 600, height: 720, depth: 560, board_t: 18, front_t: 25, unit_num: '01',
  }, P);
  const boxes = r.panels.filter((p) => p.box).map((p) => ({
    id: p.id,
    min: [p.box.x, p.box.y, p.box.z],
    max: [p.box.x + p.box.w, p.box.y + p.box.h, p.box.z + p.box.d],
  }));
  const targets = snapTargets(boxes, { contactMm: P.editor.ruler.contactMm });
  const counts = kindsOf(targets);
  assert.ok(counts.END > 0 && counts.MID > 0 && counts.INT > 0, JSON.stringify(counts));
  // Every target is inside the cabinet's own bounding box — a snap outside the
  // furniture is a snap on nothing.
  const lo = [Math.min(...boxes.map((b) => b.min[0])), Math.min(...boxes.map((b) => b.min[1])), Math.min(...boxes.map((b) => b.min[2]))];
  const hi = [Math.max(...boxes.map((b) => b.max[0])), Math.max(...boxes.map((b) => b.max[1])), Math.max(...boxes.map((b) => b.max[2]))];
  for (const t of targets) {
    for (let i = 0; i < 3; i += 1) {
      assert.ok(t.p[i] >= lo[i] - 1e-6 && t.p[i] <= hi[i] + 1e-6, `${t.kind} at ${t.p} is outside the cabinet`);
    }
  }
  // And no two targets are the same point.
  const keys = new Set(targets.map((t) => t.p.map((v) => Math.round(v * 20)).join(',')));
  assert.equal(keys.size, targets.length, 'every offered point is offered once');
});

test('F6 — nothing here measures: the generator returns points and only points', () => {
  const targets = snapTargets([SIDE, BOTTOM], { contactMm: 0.5 });
  for (const t of targets) {
    assert.ok(SNAP_KINDS.includes(t.kind));
    assert.equal(t.p.length, 3);
    assert.ok(t.of.length >= 1, 'and says which panel(s) it belongs to');
  }
});
