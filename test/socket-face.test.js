// ─── Turn 11, CLAUDE.md F6: the joint, as the machine leaves it ─────────────
//
// Piotr: stop drawing CNC layers on the furniture, show the JOINT. A socket is
// a notch cut through the edge of the board with two round inner corners,
// because a round cutter cannot reach into a square one — and the fillet is the
// whole difference between "a rectangle was subtracted here" and "this was
// machined".
//
// Everything below is arithmetic on the panel's OWN cutting data. Nothing here
// invents a tab, and nothing in the engine changed to make it possible.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { joineryLayers } from '../src/engine/joinery.js';
import {
  cncRect, hasSocketRecesses, notchedOutline, socketNotches,
} from '../src/engine/socketFace.js';

const layers = joineryLayers(P);
const wardrobe = () => computeCabinet({
  type: 'WARDROBE', width: 600, height: 2150, depth: 578, unit_num: '01', shelves: 2,
}, P);
const panelOf = (r, id) => r.panels.find((p) => p.id === id);

// ─── which pockets are sockets, and on which edge ───────────────────────────

test('a side panel carries a socket notch at each end of its top and bottom edges', () => {
  const bul = panelOf(wardrobe(), 'BUL');
  const notches = socketNotches(bul, layers);
  // Two socket centres along the run (engine/puzzle.js socketCentres) × two
  // edges — the side receives the TOP panel's tabs and the BOTTOM panel's.
  assert.equal(notches.length, 4);
  assert.equal(notches.filter((n) => n.edge === 'top').length, 2);
  assert.equal(notches.filter((n) => n.edge === 'bottom').length, 2);
});

test('the notch is the pocket, clipped at the panel edge — the overshoot is not board', () => {
  const bul = panelOf(wardrobe(), 'BUL');
  const G = P.board.thickness;
  const pz = P.puzzle;
  const top = socketNotches(bul, layers).filter((n) => n.edge === 'top')[0];

  // horizontalSocket(): the pocket runs from `edge − G/2` (turn 24, F4)
  // to `edge + socketOvershoot`. Only the part INSIDE the board is a notch.
  assert.equal(top.depth, G / 2, 'depth = 9 mm — the board’s own half, not 15.5');
  // …and it is `socketHalfWidth` either side of the socket centre.
  assert.equal(top.to - top.from, pz.socketHalfWidth * 2);

  const { w } = cncRect(bul);
  const centres = [pz.tabCentresFromEnd, w - pz.tabCentresFromEnd];
  const middles = socketNotches(bul, layers)
    .filter((n) => n.edge === 'top')
    .map((n) => (n.from + n.to) / 2)
    .sort((a, b) => a - b);
  assert.deepEqual(middles, centres);
});

test('the back panel is notched on all four edges', () => {
  const back = panelOf(wardrobe(), 'BACK');
  const notches = socketNotches(back, layers);
  const edges = new Set(notches.map((n) => n.edge));
  assert.deepEqual([...edges].sort(), ['bottom', 'left', 'right', 'top']);
});

test('a plain piece is a plain box and pays for nothing', () => {
  const r = wardrobe();
  for (const id of ['SHELF-1', '01-F']) {
    const panel = panelOf(r, id);
    if (!panel) continue;
    assert.equal(hasSocketRecesses(panel, layers), false, `${id} should stay a box`);
  }
  // …and so is a TOP, which carries TABS rather than sockets: its pockets are
  // dog-bone reliefs OUTSIDE its own rectangle, and a relief that is not in the
  // board cannot be a notch in it.
  assert.equal(hasSocketRecesses(panelOf(r, 'TOP'), layers), false);
});

test('the rectangle is the DRAWN one, because a top is drawn rotated', () => {
  const r = wardrobe();
  const top = panelOf(r, 'TOP');
  // panel.w / panel.h are the CUT dimensions; the CNC frame is the other way
  // round for this part, and reading the wrong pair would put every notch on
  // the wrong edge.
  assert.equal(cncRect(top).w, top.cnc.drawn_w);
  assert.equal(cncRect(top).h, top.cnc.drawn_h);
  assert.notEqual(top.cnc.drawn_w, top.w);
});

// ─── the outline that gets extruded ─────────────────────────────────────────

test('a board with no notches is just its rectangle', () => {
  const poly = notchedOutline({ w: 100, h: 50, notches: [], radius: 4 });
  assert.deepEqual(poly, [[0, 0], [100, 0], [100, 50], [0, 50]]);
});

test('a notch takes a bite out of the edge it is on, and only that edge', () => {
  const poly = notchedOutline({
    w: 100, h: 50, notches: [{ edge: 'bottom', from: 40, to: 60, depth: 10 }], radius: 0,
  });
  // Anticlockwise from the origin: along the bottom, into the notch, out again.
  assert.deepEqual(poly.slice(0, 6), [
    [0, 0], [40, 0], [40, 10], [60, 10], [60, 0], [100, 0],
  ]);
  // Every point is inside the board, which is the property an extruder needs.
  for (const [x, y] of poly) {
    assert.ok(x >= -1e-9 && x <= 100 + 1e-9 && y >= -1e-9 && y <= 50 + 1e-9, `${x},${y}`);
  }
});

test('the inner corners come out round, at the cutter radius', () => {
  const r = 4;
  const poly = notchedOutline({
    w: 100, h: 50, notches: [{ edge: 'bottom', from: 40, to: 60, depth: 10 }], radius: r, arcSteps: 8,
  });
  // The two sharp corners at (40,10) and (60,10) are gone…
  assert.ok(!poly.some(([x, y]) => Math.abs(x - 40) < 1e-9 && Math.abs(y - 10) < 1e-9));
  // …and every point of the fillet is exactly `r` from the cutter's centre,
  // which is `r` inside both walls of the notch.
  const centre = [40 + r, 10 - r];
  const onArc = poly.filter(([x, y]) => Math.abs(Math.hypot(x - centre[0], y - centre[1]) - r) < 1e-9);
  assert.ok(onArc.length >= 8, `expected a fillet, found ${onArc.length} points on it`);
  // The deepest the notch gets is still its full depth — the fillet eats the
  // corner, not the pocket.
  assert.ok(poly.some(([, y]) => Math.abs(y - 10) < 1e-9));
});

test('a fillet never eats more than the notch it is in', () => {
  // Asking for a 4 mm fillet in a 3 mm notch would fold the outline back
  // through itself and hand the triangulator a self-intersecting loop. The
  // radius is clamped to what fits: half the width, and the full depth.
  const poly = notchedOutline({
    w: 100, h: 50, notches: [{ edge: 'bottom', from: 48, to: 51, depth: 10 }], radius: 4, arcSteps: 6,
  });
  for (const [x, y] of poly) {
    assert.ok(x >= 0 - 1e-9 && x <= 100 + 1e-9, `${x} escaped the board`);
    assert.ok(y >= 0 - 1e-9 && y <= 50 + 1e-9, `${y} escaped the board`);
  }
  // Never outside the notch's own span, which is what "folded back" would mean.
  const inside = poly.filter(([, y]) => y > 1e-9 && y < 10 - 1e-9);
  for (const [x] of inside) assert.ok(x >= 48 - 1e-9 && x <= 51 + 1e-9, `${x} is outside the notch`);
  assert.ok(signedArea(poly) > 0, 'and the loop is still simple');

  // A shallow notch is clamped by its DEPTH instead.
  const shallow = notchedOutline({
    w: 100, h: 50, notches: [{ edge: 'bottom', from: 20, to: 80, depth: 2 }], radius: 4, arcSteps: 6,
  });
  for (const [, y] of shallow) assert.ok(y >= -1e-9, 'no point is cut out of the back of the board');
  assert.ok(shallow.some(([, y]) => Math.abs(y - 2) < 1e-9), 'and it is still 2 mm deep');
});

test('no vertex is repeated — a zero-length edge is a triangulator trap', () => {
  const poly = notchedOutline({
    w: 200,
    h: 120,
    radius: 4,
    arcSteps: 5,
    notches: [
      { edge: 'bottom', from: 20, to: 60, depth: 9.5 },
      { edge: 'top', from: 140, to: 180, depth: 9.5 },
    ],
  });
  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) > 1e-9, `points ${i} and ${i + 1} are the same point`);
  }
});

test('notches on every edge, all of them inside the board and in walk order', () => {
  const poly = notchedOutline({
    w: 200,
    h: 120,
    radius: 4,
    notches: [
      { edge: 'bottom', from: 20, to: 60, depth: 9.5 },
      { edge: 'right', from: 30, to: 70, depth: 9.5 },
      { edge: 'top', from: 140, to: 180, depth: 9.5 },
      { edge: 'left', from: 30, to: 70, depth: 9.5 },
    ],
  });
  for (const [x, y] of poly) {
    assert.ok(x >= -1e-9 && x <= 200 + 1e-9 && y >= -1e-9 && y <= 120 + 1e-9, `${x},${y} escaped the board`);
  }
  // Anticlockwise: the signed area of a simple polygon walked this way is
  // positive, and a polygon whose edges crossed would not be.
  assert.ok(signedArea(poly) > 0, 'the outline is a simple anticlockwise loop');
  // …and it is genuinely smaller than the rectangle, by four notches.
  assert.ok(signedArea(poly) < 200 * 120);
});

test('a real side panel extrudes to a board with four bites out of it', () => {
  const bul = panelOf(wardrobe(), 'BUL');
  const { w, h } = cncRect(bul);
  const poly = notchedOutline({
    w, h, notches: socketNotches(bul, layers), radius: P.cnc.toolDiameter / 2,
  });
  const area = signedArea(poly);
  assert.ok(area > 0);
  const pz = P.puzzle;
  const G = P.board.thickness;
  // Four sockets, each `2 × socketHalfWidth` wide and `G/2` (turn 24, F4)
  // deep, less the four fillets they keep in their corners.
  const bites = 4 * (2 * pz.socketHalfWidth) * (G / 2);
  assert.ok(w * h - area < bites + 1e-6, 'no more board is removed than the sockets account for');
  assert.ok(w * h - area > bites * 0.8, '…and not much less: the fillets are small');
});

/** Shoelace. Positive for an anticlockwise loop. */
function signedArea(points) {
  let a = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

// ─── the cutter is a profile number, and the picture follows it ─────────────

test('the cutter diameter lives in the profile and changes the fillet', () => {
  assert.ok(P.cnc.toolDiameter > 0);
  const notches = [{ edge: 'bottom', from: 40, to: 60, depth: 10 }];
  const small = notchedOutline({
    w: 100, h: 50, notches, radius: 2, arcSteps: 8,
  });
  const large = notchedOutline({
    w: 100, h: 50, notches, radius: 5, arcSteps: 8,
  });
  assert.ok(signedArea(large) > signedArea(small),
    'a fatter cutter leaves MORE board in the corner, so the notch removes less');
});
