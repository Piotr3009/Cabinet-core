import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { backPanelGeometry, sidePanelGeometry } from '../src/engine/puzzle.js';
import {
  AXIS_LAYERS, AXIS_SHIFT_MM, classify, classifyPair, layerOf,
} from '../scripts/cnc-axis-classifier.mjs';

// ─── TURN 24 · F4 — EVERY SCREW AXIS RETURNS TO G/2 ─────────────────────────
//
// `profile.js:223 centrelineExtra: 0.5` put every screw axis at G/2 + 0.5. The
// owner: he does not remember it, it is wrong, it skews the whole calculation.
// It is gone.
//
// This is a GLOBAL NAMED DELTA — every DXF containing a screw axis shifts that
// axis by −0.5 — so the interesting test is not "did it move". It is the
// CLASSIFIER: the instrument that proves the move is exactly what it is named
// and nothing else came with it.

const G = P.board.thickness;
const pz = P.puzzle;

test('F4.1 — the number is gone from the profile, not merely unused', () => {
  assert.equal(pz.centrelineExtra, undefined, 'a number nobody reads is a number that comes back');
  assert.equal(Object.hasOwn(pz, 'centrelineExtra'), false);
});

test('F4.1 — the socket runs exactly half a board into the panel', () => {
  const geom = sidePanelGeometry({
    w: 540, h: 720, G, side: 'L', puzzle: pz, edges: {},
  });
  const socket = geom.pockets.find((p) => p.layer === pz.layers.socket);
  assert.ok(socket, 'a side panel really does carry sockets');
  // The pocket runs from `edge − G/2` to `edge + socketOvershoot`.
  const depth = Math.abs(socket.y2 - socket.y1) - pz.socketOvershoot;
  assert.equal(depth, G / 2, `the socket is ${depth} deep, and half of 18 is 9`);
});

test('F4.1 — 18 gives 9.00 and a measured 18.5 gives 9.25', () => {
  const axisOf = (t) => {
    const geom = backPanelGeometry({ w: 600, h: 720, G: t, puzzle: pz });
    return Math.min(...geom.holes.filter((h) => h.kind === 'screw').map((h) => h.x));
  };
  assert.equal(axisOf(18), 9);
  assert.equal(axisOf(18.5), 9.25);
  assert.equal(axisOf(22), 11);
  // …and nothing rounds it. 18.3 is 9.15, to the micrometre.
  assert.equal(axisOf(18.3), 9.15);
});

test('F4.1 — the whole engine agrees: every screw column moved by the same 0.5', () => {
  // The engine's own drilling, on the plainest cabinet in the app.
  const r = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01' }, P);
  const ys = new Set(r.drills.filter((d) => d.kind === 'screw' && d.panel === 'BUL').map((d) => d.y));
  assert.ok(ys.has(9), `the bottom screw column is on 9: ${[...ys]}`);
  const H = r.params.height;
  assert.ok(ys.has(H - 9), 'and the top one is on H − 9');
  // 9.5 and H − 9.5 are what the app drilled before this turn, and they are
  // exactly what must no longer be there.
  assert.equal(ys.has(9.5), false);
  assert.equal(ys.has(H - 9.5), false);
});

// ─── F4.2 — THE CLASSIFIER ITSELF ──────────────────────────────────────────
//
// The instrument that proves the delta innocent has to be right, or the proof
// is a picture of one. Everything below is the classifier being shown a pair it
// must accept and a series of pairs it must refuse.

test('F4.2 — the classifier names the three classes an axis may live on', () => {
  assert.deepEqual(
    [...AXIS_LAYERS].sort(),
    ['PUZZLE_HOLES_7_5MM', 'PUZZLE_SOCKET', 'SCREWS_3MM'],
  );
  assert.equal(AXIS_SHIFT_MM, 0.5);
});

test('F4.2 — it ACCEPTS a screw that moved by exactly half a millimetre', () => {
  const before = 'circle SCREWS_3MM 50,9.5 r1.5';
  const after = 'circle SCREWS_3MM 50,9 r1.5';
  assert.deepEqual(classifyPair(before, after).bucket, 'AXIS');
  // …in either direction, because a panel's frame decides the sign.
  assert.equal(classifyPair('circle SCREWS_3MM 9.5,50 r1.5', 'circle SCREWS_3MM 9,50 r1.5').bucket, 'AXIS');
  assert.equal(classifyPair('circle SCREWS_3MM 50,710.5 r1.5', 'circle SCREWS_3MM 50,711 r1.5').bucket, 'AXIS');
});

test('F4.2 — and a socket pocket whose inner edge slid, two corners at once', () => {
  const before = 'poly PUZZLE_SOCKET closed 100,-6 100,9.5 130,9.5 130,-6';
  const after = 'poly PUZZLE_SOCKET closed 100,-6 100,9 130,9 130,-6';
  assert.equal(classifyPair(before, after).bucket, 'AXIS');
});

test('F4.2 — an unchanged entity is SAME and is never counted as a move', () => {
  const line = 'circle SCREWS_3MM 50,9 r1.5';
  assert.equal(classifyPair(line, line).bucket, 'SAME');
});

test('F4.2 — it REFUSES everything else, one refusal at a time', () => {
  const refuses = [
    // A different distance.
    ['circle SCREWS_3MM 50,9.5 r1.5', 'circle SCREWS_3MM 50,9.4 r1.5', /moved by/],
    ['circle SCREWS_3MM 50,9.5 r1.5', 'circle SCREWS_3MM 50,8.5 r1.5', /moved by/],
    // The right distance on the WRONG class — the outline, a dog bone, a hinge.
    ['poly OUTLINE closed 0,0 100,0 100,9.5 0,9.5', 'poly OUTLINE closed 0,0 100,0 100,9 0,9', /not a screw or socket/],
    ['circle HINGES_5MM 37,84.5 r2.5', 'circle HINGES_5MM 37,84 r2.5', /not a screw or socket/],
    ['circle SHELVES_7_5MM 70,300.5 r3.75', 'circle SHELVES_7_5MM 70,300 r3.75', /not a screw or socket/],
    // Two different deltas inside one entity: a slide AND a resize.
    ['poly PUZZLE_SOCKET closed 100,-6 100,9.5 130,9.5 130,-6',
      'poly PUZZLE_SOCKET closed 100,-6 100,9 130.5,9 130.5,-6', /different deltas/],
    // A hole that changed size rather than place.
    ['circle SCREWS_3MM 50,9 r1.5', 'circle SCREWS_3MM 50,9 r2', /changed diameter/],
    // A different number of points.
    ['poly PUZZLE_SOCKET closed 100,-6 100,9.5 130,9.5 130,-6',
      'poly PUZZLE_SOCKET closed 100,-6 100,9 130,9', /changed shape/],
    // A label. F4 does not touch the lettering, and a classifier that let one
    // through would be a classifier that could hide a renamed part.
    ['text UNIT_NUMBER|01 BUL 540x720|20|270,360', 'text UNIT_NUMBER|01 BUL 540x720|20|270,360.5', /not a screw or socket/],
    // The entity changed kind, or moved layer.
    ['circle SCREWS_3MM 50,9.5 r1.5', 'poly SCREWS_3MM closed 0,0 1,0 1,1 0,1', /changed kind/],
    ['circle SCREWS_3MM 50,9.5 r1.5', 'circle PUZZLE_SOCKET 50,9 r1.5', /changed layer/],
  ];
  for (const [before, after, why] of refuses) {
    const got = classifyPair(before, after);
    assert.equal(got.bucket, 'OTHER', `it must refuse: ${before} → ${after}`);
    assert.match(got.why, why);
  }
});

test('F4.2 — layerOf reads the class off every kind of line', () => {
  assert.equal(layerOf('circle SCREWS_3MM 50,9 r1.5'), 'SCREWS_3MM');
  assert.equal(layerOf('poly PUZZLE_SOCKET closed 0,0 1,0'), 'PUZZLE_SOCKET');
  assert.equal(layerOf('text UNIT_NUMBER|01 BUL|20|270,360'), 'UNIT_NUMBER');
});

test('F4.2 — a COUNT change is its own failure and is never classified away', () => {
  const base = [
    'BUD\t01-BUL.dxf\t0\tcircle SCREWS_3MM 50,9.5 r1.5',
    'BUD\t01-BUL.dxf\t1\tcircle SCREWS_3MM 50,710.5 r1.5',
  ];
  const head = [
    'BUD\t01-BUL.dxf\t0\tcircle SCREWS_3MM 50,9 r1.5',
  ];
  const report = classify(base, head);
  assert.equal(report.axis, 1);
  assert.equal(report.other, 0);
  assert.equal(report.removed.length, 1, 'the missing entity is REPORTED, not ignored');
  assert.deepEqual(report.added, []);
});

test('F4.2 — a clean sweep reads as all-axis, and a dirty one names the offender', () => {
  const clean = classify(
    [
      'BUD\t01-BUL.dxf\t0\tcircle SCREWS_3MM 50,9.5 r1.5',
      'BUD\t01-BUL.dxf\t1\tpoly OUTLINE closed 0,0 540,0 540,720 0,720',
    ],
    [
      'BUD\t01-BUL.dxf\t0\tcircle SCREWS_3MM 50,9 r1.5',
      'BUD\t01-BUL.dxf\t1\tpoly OUTLINE closed 0,0 540,0 540,720 0,720',
    ],
  );
  assert.equal(clean.total, 2);
  assert.equal(clean.same, 1);
  assert.equal(clean.axis, 1);
  assert.equal(clean.other, 0);
  assert.deepEqual(clean.byLayer, { SCREWS_3MM: 1 });

  const dirty = classify(
    ['BUD\t01-BUL.dxf\t0\tpoly OUTLINE closed 0,0 540,0 540,720 0,720'],
    ['BUD\t01-BUL.dxf\t0\tpoly OUTLINE closed 0,0 540,0 540,719.5 0,719.5'],
  );
  assert.equal(dirty.other, 1);
  assert.equal(dirty.offenders.length, 1);
  assert.match(dirty.offenders[0].why, /not a screw or socket/);
});
