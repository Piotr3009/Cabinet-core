// ─── Two tabs on a LOW carcass (turn 8, CLAUDE.md F0 / BLOCKERS #37) ───
//
// Turn 7 solved the shallow carcass: two sockets 95 in from each end of a
// 232 mm run cut into each other, so below a derived threshold there is one, in
// the middle (test/single-socket.test.js). BLOCKERS #37 wrote down the twin of
// that problem on the other axis and said, in as many words, that turn 7 had
// NOT done it: `tabCentres()` puts three tabs down the back edge of a side
// panel, and on a low carcass the middle one walks into the outer ones.
//
// The number that matters is not the tab. A tab is ±25; the DOG BONE around it
// is ±30 and reaches further, and a cutter that has to leave a web of board
// standing between two pockets has to leave it between the two POCKETS.
//
// `LOW_CABINET.minHeight` is 300, so this is reachable from the UI — which is
// what made it a debt rather than a curiosity.
//
// As in turn 7, the threshold is RECOMPUTED here rather than copied: a workshop
// that widens the tab or the relief and forgets the constant gets a red test
// instead of a collision.

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { backPanelGeometry, middleTabThreshold, sidePanelGeometry, tabCentres } from '../src/engine/puzzle.js';

const pz = P.puzzle;
const G = P.board.thickness;

const dogbones = (panel) => panel.cnc.pockets.filter((p) => p.layer === pz.layers.dogbone).length;
const sockets = (geom) => geom.pockets.filter((p) => p.layer === pz.layers.socket).length;

const low = (height) => computeCabinet({
  type: 'LOW_CABINET', width: 600, height, depth: 578, unit_num: 'LC01',
  doors: { count: 1, hinge: 'L' },
}, P);

// ─── the threshold ──────────────────────────────────────────────────────────

test('the threshold is derived from the dog bone, not chosen', () => {
  // Two outer centres 95 in from each end; each outer tab's relief and the
  // middle tab's, on both sides; and a bridge of one board thickness in each of
  // the TWO gaps a middle tab creates.
  const half = Math.max(pz.tabHalfWidth, pz.dogboneHalfHeight);
  const expected = pz.tabCentresFromEnd * 2 + half * 4 + G * 2;

  assert.equal(middleTabThreshold(pz, G), expected);
  assert.equal(pz.middleTabBelow, expected,
    `profile.puzzle.middleTabBelow must be ${expected} — the derivation is in the comment beside it`);
});

test('the footprint that matters is the RELIEF, not the tab', () => {
  assert.ok(pz.dogboneHalfHeight > pz.tabHalfWidth,
    'if this ever stops being true the derivation still holds, because it takes the max');
});

test('at the threshold there are three tabs; a hair below it, two', () => {
  const at = tabCentres(pz.middleTabBelow, pz);
  assert.deepEqual(at, [pz.tabCentresFromEnd, pz.middleTabBelow / 2, pz.middleTabBelow - pz.tabCentresFromEnd],
    'the threshold itself still fits — it is "below", not "at or below"');

  const under = tabCentres(pz.middleTabBelow - 0.1, pz);
  assert.equal(under.length, 2);
  assert.deepEqual(under, [pz.tabCentresFromEnd, pz.middleTabBelow - 0.1 - pz.tabCentresFromEnd]);
});

test('the three tabs really would have collided below it', () => {
  const half = Math.max(pz.tabHalfWidth, pz.dogboneHalfHeight);
  // Just under the threshold the old rule leaves less than a board thickness of
  // material between the middle relief and the outer one.
  const length = pz.middleTabBelow - 1;
  const bridge = (length / 2 - pz.tabCentresFromEnd) - half * 2;
  assert.ok(bridge < G, `${bridge} mm of board between two dog bones is thinner than the board itself`);

  // And at the type's own minimum height they overlap outright.
  const min = P.lowCabinet.minHeight;
  const overlap = (min / 2 - pz.tabCentresFromEnd) - half * 2;
  assert.ok(overlap < 0, `at the ${min} mm minimum the middle tab is cut through the outer ones`);
});

// ─── what the panels come out as ────────────────────────────────────────────

test('a low cabinet at its minimum height cuts two tabs, not three', () => {
  const r = low(P.lowCabinet.minHeight);
  const bul = r.panels.find((p) => p.id === 'BUL');
  const bur = r.panels.find((p) => p.id === 'BUR');
  assert.equal(dogbones(bul), 2, 'BUL: one relief per tab');
  assert.equal(dogbones(bur), 2, 'BUR: and the mirror of it');
});

test('the back panel receives exactly the tabs the sides cut', () => {
  const height = P.lowCabinet.minHeight;
  const r = low(height);
  const back = r.panels.find((p) => p.id === 'BACK');
  const side = sidePanelGeometry({ w: 578 - G, h: height, G, side: 'L', puzzle: pz });

  // Two sockets down each side edge for the two tabs, plus whatever the top and
  // bottom panels need across the width — the count that matters is that no tab
  // is left with nothing to go into and no socket with nothing to receive.
  const sideTabs = side.pockets.filter((p) => p.layer === pz.layers.dogbone).length;
  const geom = backPanelGeometry({ w: 600, h: height, G, puzzle: pz });
  const acrossCentres = 2 * sockets(geom) - 2 * (2 * sideTabs);
  assert.equal(sideTabs, 2);
  assert.ok(acrossCentres >= 0, 'the back is not short of sockets');
  assert.equal(
    back.cnc.pockets.filter((p) => p.layer === pz.layers.socket).length,
    sockets(geom),
  );
});

test('the screw rows follow the tabs instead of assuming three of them', () => {
  const height = P.lowCabinet.minHeight;
  const geom = backPanelGeometry({ w: 600, h: height, G, puzzle: pz });
  const S = G / 2 + pz.centrelineExtra;
  const leftEdge = geom.holes.filter((h) => h.kind === 'screw' && Math.abs(h.x - S) < 1e-9);
  // Two tabs → one gap between them → three rows: one in from each end and one
  // in the middle. Never a NaN, which is what destructuring a third centre that
  // is not there used to produce.
  assert.equal(leftEdge.length, 3);
  for (const h of leftEdge) assert.ok(Number.isFinite(h.y), 'a screw row is a number');
  const [t1, t2] = tabCentres(height, pz);
  assert.deepEqual(
    leftEdge.map((h) => h.y).sort((a, b) => a - b),
    [pz.screwFromEnd, (t1 + t2) / 2, height - pz.screwFromEnd],
  );
});

test('a normal carcass is untouched — three tabs and four screw rows', () => {
  const r = low(600);
  assert.equal(dogbones(r.panels.find((p) => p.id === 'BUL')), 3);
  const geom = backPanelGeometry({ w: 600, h: 600, G, puzzle: pz });
  const S = G / 2 + pz.centrelineExtra;
  assert.equal(geom.holes.filter((h) => h.kind === 'screw' && Math.abs(h.x - S) < 1e-9).length, 4);
});
