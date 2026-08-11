// ─── One socket on a shallow carcass (turn 7, CLAUDE.md F4 / BACKLOG #28) ───
//
// THE AUTOLISP DID NOT KNOW THIS CASE. Every kit in reference/lisp/ is 558 or
// 578 deep, so two sockets 95 in from each end of the side panel have 350 mm
// between them and nobody ever had to think about it. Build a 250 mm deep
// cabinet and the same rule puts two pockets — and, before the pockets, their
// ⌀7.5 holes at ±24.5 — through each other. That is not a weak joint; it is a
// hole through the middle of the panel.
//
// So this is an ENGINE-DERIVED decision, on exactly the footing the variable
// drawer heights stand on (turn 2, task 4): where the kits are silent, the
// engine decides, the threshold comes out of the geometry rather than out of
// the air, and the reasoning is written down where the number is.
//
// What this file checks is the reasoning, not just the answer: the threshold is
// RECOMPUTED here from the socket dimensions, so a workshop that widens a
// socket or moves its holes and forgets to move the constant gets a red test
// rather than a collision.

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { backPanelGeometry, singleSocketThreshold, socketCentres, topPanelGeometry } from '../src/engine/puzzle.js';

const pz = P.puzzle;
const G = P.board.thickness;

const unit = (extra) => computeCabinet({
  type: 'BUD', width: 600, height: 770, depth: 558, unit_num: '01',
  doors: { count: 1, hinge: 'L' }, ...extra,
}, P);

const pocketsOn = (panel, match) => panel.cnc.pockets.filter((p) => match.test(p.layer)).length;
const puzzleHoles = (panel) => panel.cnc.holes.filter((h) => h.kind === 'puzzle').length;

// ─── the threshold ──────────────────────────────────────────────────────────

test('the threshold is derived from the socket, not chosen', () => {
  // Two socket centres 95 in from each end, each socket's own footprint, and a
  // bridge of one board thickness between them.
  const half = Math.max(pz.socketHalfWidth, pz.socketHoleOffset + pz.socketHoleDiameter / 2);
  const expected = pz.tabCentresFromEnd * 2 + half * 2 + G;

  assert.equal(singleSocketThreshold(pz, G), expected);
  assert.equal(pz.singleSocketBelow, expected,
    `profile.puzzle.singleSocketBelow must be ${expected} — the derivation is in the comment beside it`);
});

test('the footprint that matters is the HOLES, not the pocket', () => {
  // The pocket is ±25.5. The two holes reach ±(24.5 + 3.75) = ±28.25, which is
  // wider — and a threshold computed off the pocket alone would leave the holes
  // overlapping while the pockets just cleared.
  assert.ok(pz.socketHoleOffset + pz.socketHoleDiameter / 2 > pz.socketHalfWidth,
    'if this ever stops being true the derivation still holds, because it takes the max');
});

test('at the threshold there are two sockets; a hair below it, one', () => {
  const at = socketCentres(pz.singleSocketBelow, pz);
  assert.equal(at.length, 2, 'the threshold itself still fits — it is "below", not "at or below"');

  const under = socketCentres(pz.singleSocketBelow - 0.1, pz);
  assert.equal(under.length, 1);
  assert.equal(under[0], (pz.singleSocketBelow - 0.1) / 2, 'and it is in the MIDDLE of the run');
});

test('the two sockets really would have collided below it', () => {
  const half = Math.max(pz.socketHalfWidth, pz.socketHoleOffset + pz.socketHoleDiameter / 2);
  // Just under the threshold, the old rule leaves less than a board thickness
  // of material between the two sockets.
  const length = pz.singleSocketBelow - 1;
  const bridge = (length - pz.tabCentresFromEnd) - pz.tabCentresFromEnd - half * 2;
  assert.ok(bridge < G, `${bridge} mm of board between two pockets is thinner than the board itself`);

  // And well below it, they overlap outright.
  const tiny = 200;
  const overlap = (tiny - pz.tabCentresFromEnd) - pz.tabCentresFromEnd - half * 2;
  assert.ok(overlap < 0, 'at 200 mm the two sockets are cut through each other');
});

// ─── what it does to a cabinet ──────────────────────────────────────────────

test('a standard cabinet is untouched — every kit in reference/lisp/ still cuts the same', () => {
  const normal = unit();
  const side = normal.panels.find((p) => p.id === 'BUL');
  assert.equal(side.w, normal.params.depth - G, 'the side panel is depth − G wide, as it always was');
  assert.ok(side.w >= pz.singleSocketBelow);
  assert.equal(pocketsOn(side, /SOCKET/), 4, 'two on the top edge, two on the bottom');
  assert.equal(puzzleHoles(side), 8, 'and two holes per socket');

  assert.deepEqual(socketCentres(side.w, pz), [pz.tabCentresFromEnd, side.w - pz.tabCentresFromEnd]);
});

test('a shallow cabinet gets ONE socket per edge, in the middle, with its two holes', () => {
  const shallow = unit({ depth: 250 });
  const side = shallow.panels.find((p) => p.id === 'BUL');
  assert.ok(side.w < pz.singleSocketBelow, `${side.w} mm is under the threshold`);

  assert.equal(pocketsOn(side, /SOCKET/), 2, 'one on the top edge, one on the bottom');
  assert.equal(puzzleHoles(side), 4, 'two holes each, still');

  const sockets = side.cnc.pockets.filter((p) => /SOCKET/.test(p.layer));
  for (const s of sockets) {
    assert.equal((s.x1 + s.x2) / 2, side.w / 2, 'in the middle of the panel width');
  }
});

test('the TAB on the other side of the joint moves with it — one socket, one tab', () => {
  const shallow = unit({ depth: 250 });
  const top = shallow.panels.find((p) => p.id === 'TOP');
  const normal = unit().panels.find((p) => p.id === 'TOP');

  // The top panel's dog bones are one per tab. Along the depth it now has one
  // instead of two, on each of its two long edges; the back edge is unchanged.
  assert.equal(pocketsOn(normal, /DOG/), 6, '2 tabs × 2 long edges, plus 2 on the back');
  assert.equal(pocketsOn(top, /DOG/), 4, '1 tab × 2 long edges, plus the same 2 on the back');

  // …and the outline really carries fewer tab points, so the cutter path is the
  // one the sockets expect.
  const wide = topPanelGeometry({ drawnW: 540, drawnH: 564, G, puzzle: pz });
  const narrow = topPanelGeometry({ drawnW: 232, drawnH: 564, G, puzzle: pz });
  assert.ok(narrow.outline.length < wide.outline.length);
});

test('a NARROW cabinet gets the same treatment on the back panel, from the same function', () => {
  // Not the depth this time — the internal WIDTH, which is what the top panel's
  // back-edge tabs are cut along and what the back panel receives.
  const narrow = unit({ width: 280 });
  assert.ok(narrow.derived.internal_width < pz.singleSocketBelow);

  const back = narrow.panels.find((p) => p.id === 'BACK');
  // 3 sockets down each side (the side-panel tabs) + 1 top + 1 bottom.
  assert.equal(back.cnc.pockets.length, 8);

  const wideBack = unit().panels.find((p) => p.id === 'BACK');
  assert.equal(wideBack.cnc.pockets.length, 10, 'a normal cabinet keeps 3 + 3 + 2 + 2');

  // The two ends of the joint agree because they come from ONE function: the
  // back's sockets are socketCentres over the internal width, offset by a side.
  const geometry = backPanelGeometry({ w: 280, h: 770, G, puzzle: pz });
  const across = geometry.pockets
    // Turn 24 (CLAUDE.md F4): `G / 2`, with no `centrelineExtra` on top.
    .filter((p) => Math.abs(p.y2 - p.y1) === pz.socketOvershoot + G / 2)
    .map((p) => (p.x1 + p.x2) / 2);
  assert.deepEqual([...new Set(across)], [G + (280 - 2 * G) / 2]);
});

test('the machine files follow from the data, with nothing told twice', () => {
  // Nothing in the DXF or the CNC preview knows about this rule: they draw the
  // pockets and holes the panel carries, and the panel carries what
  // socketCentres() decided.
  const shallow = unit({ depth: 250 });
  const side = shallow.panels.find((p) => p.id === 'BUL');
  const holes = side.cnc.holes.filter((h) => h.kind === 'puzzle');
  const xs = [...new Set(holes.map((h) => h.x))].sort((a, b) => a - b);
  assert.deepEqual(xs, [side.w / 2 - pz.socketHoleOffset, side.w / 2 + pz.socketHoleOffset],
    'the drilling is symmetric about the one socket, not about two that are not there');
});
