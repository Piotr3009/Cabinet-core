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
//
// ─── UPDATED BY T52 (CLAUDE.md F3) ─────────────────────────────────────────
//
// The owner, 26.08.2026: *"jak niska szafka poniżej 600 mm to już zrób 2 dog
// bonesy, a jak poniżej 300 to jeden dog bones — na plecach i BUL i BUR."*
//
// So the SWITCH is his 600 now, and turn 8's 346 keeps its job as the FLOOR the
// switch may never go below — which is the sentence this file already made, on
// a number that has changed hands. What has NOT changed is why the derivation
// exists: under 346 the three dog bones really do collide, and the test that
// proves it is still here, asked of the floor instead of the switch.
//
// The low-cabinet cases move with the rule: at `lowCabinet.minHeight` (300,
// exactly) the panel now cuts ONE tab, not two, because he asked for one and
// because `< 300` could never have fired.

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

test('the derived number is still derived — and it is the FLOOR now', () => {
  // Two outer centres 95 in from each end; each outer tab's relief and the
  // middle tab's, on both sides; and a bridge of one board thickness in each of
  // the TWO gaps a middle tab creates.
  const half = Math.max(pz.tabHalfWidth, pz.dogboneHalfHeight);
  const expected = pz.tabCentresFromEnd * 2 + half * 4 + G * 2;

  assert.equal(middleTabThreshold(pz, G), expected, 'turn 8’s derivation, recomputed');
  assert.equal(expected, 346, '190 + 120 + 36');
  // T52: the SWITCH is the owner's 600. The derivation is what it may never go
  // under, and the profile says so beside the number.
  assert.equal(pz.middleTabBelow, 600, 'the owner’s own number, 26.08.2026');
  assert.ok(pz.middleTabBelow >= expected,
    `profile.puzzle.middleTabBelow (${pz.middleTabBelow}) must never go below ${expected} — three dog bones collide there`);
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

test('the three tabs really would have collided below the FLOOR', () => {
  const half = Math.max(pz.tabHalfWidth, pz.dogboneHalfHeight);
  // Just under the derived floor, three tabs leave less than a board thickness
  // of material between the middle relief and the outer one. That is what the
  // 346 means and it is why the switch may not be set under it.
  const floor = middleTabThreshold(pz, G);
  const length = floor - 1;
  const bridge = (length / 2 - pz.tabCentresFromEnd) - half * 2;
  assert.ok(bridge < G, `${bridge} mm of board between two dog bones is thinner than the board itself`);

  // And at the type's own minimum height they overlap outright.
  const min = P.lowCabinet.minHeight;
  const overlap = (min / 2 - pz.tabCentresFromEnd) - half * 2;
  assert.ok(overlap < 0, `at the ${min} mm minimum the middle tab is cut through the outer ones`);
});

// ─── what the panels come out as ────────────────────────────────────────────

test('a low cabinet at its minimum height cuts ONE tab (T52: was two)', () => {
  // *"a jak poniżej 300 to jeden dog bones."*  `lowCabinet.minHeight` is 300
  // exactly, which is why the rule is AT-or-under and not under.
  const r = low(P.lowCabinet.minHeight);
  const bul = r.panels.find((p) => p.id === 'BUL');
  const bur = r.panels.find((p) => p.id === 'BUR');
  assert.equal(dogbones(bul), 1, 'BUL: one relief, on the panel’s own middle');
  assert.equal(dogbones(bur), 1, 'BUR: and the mirror of it');
});

test('…and one a hair above 300 cuts two', () => {
  const r = low(P.lowCabinet.minHeight + 1);
  assert.equal(dogbones(r.panels.find((p) => p.id === 'BUL')), 2);
  assert.equal(dogbones(r.panels.find((p) => p.id === 'BUR')), 2);
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
  assert.equal(sideTabs, 1, 'T52: at 300 there is one');
  assert.ok(acrossCentres >= 0, 'the back is not short of sockets');
  assert.equal(
    back.cnc.pockets.filter((p) => p.layer === pz.layers.socket).length,
    sockets(geom),
  );
});

test('the screw rows follow the tabs instead of assuming three of them', () => {
  const S = G / 2;   // turn 24 (CLAUDE.md F4): the board's own half, exactly
  const edge = (h) => backPanelGeometry({ w: 600, h, G, puzzle: pz })
    .holes.filter((x) => x.kind === 'screw' && Math.abs(x.x - S) < 1e-9)
    .map((x) => x.y).sort((a, b) => a - b);

  // TWO tabs → one gap between them → three rows: one in from each end and one
  // in the middle. Never a NaN, which is what destructuring a third centre that
  // is not there used to produce.
  const two = P.lowCabinet.minHeight + 1;
  const [t1, t2] = tabCentres(two, pz);
  assert.deepEqual(edge(two), [pz.screwFromEnd, (t1 + t2) / 2, two - pz.screwFromEnd]);
  for (const y of edge(two)) assert.ok(Number.isFinite(y), 'a screw row is a number');

  // ONE tab → NO gap between tabs → two rows, one in from each end. The rule is
  // "between the tabs", so it answers a single tab without being told (T52 F3).
  const one = P.lowCabinet.minHeight;
  assert.equal(tabCentres(one, pz).length, 1);
  assert.deepEqual(edge(one), [pz.screwFromEnd, one - pz.screwFromEnd]);
  for (const y of edge(one)) assert.ok(Number.isFinite(y), 'a screw row is a number');
});

test('a normal carcass is untouched — three tabs and four screw rows', () => {
  const r = low(600);
  assert.equal(dogbones(r.panels.find((p) => p.id === 'BUL')), 3);
  const geom = backPanelGeometry({ w: 600, h: 600, G, puzzle: pz });
  const S = G / 2;   // turn 24 (CLAUDE.md F4)
  assert.equal(geom.holes.filter((h) => h.kind === 'screw' && Math.abs(h.x - S) < 1e-9).length, 4);
});
