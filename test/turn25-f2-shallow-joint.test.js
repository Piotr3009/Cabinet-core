// ─── F2 — THE SHALLOW CABINET GETS ONE CENTRED JOINT (turn 25) ──────────────
//
// From the owner's corrected `panel_joints.lsp`: a socket is 51 mm wide, a dog
// bone is 60, and both sit 95 mm in from each end of the run — so two of them
// collide on a panel under 241 mm and their reliefs under 250.
//
// His answer is not "make this panel different". It is "a shallow CABINET has
// one joint, centred", asked ONCE and given to every mating panel — because a
// side whose socket is on the centre line and a top whose tab is at 95 do not
// meet, and two panels that each decided for themselves would eventually
// disagree.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import {
  jointCollisionLengths, resolvedJointInset, sidePanelGeometry, socketCentres, topPanelGeometry,
} from '../src/engine/puzzle.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { panelFindings } from '../src/engine/cnc/edgeGuard.js';

const pz = P.puzzle;
const unit = (extra) => computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01', ...extra }, P);

// ─── the numbers, and where they come from ──────────────────────────────────

test('F2.1 — both numbers are in profile.js, and neither is a bare one', () => {
  assert.equal(pz.singleJointMaxDepth, 300, 'the owner’s threshold');
  assert.equal(pz.tabCentresFromEnd, 95, 'the inset a deep cabinet keeps');
});

test('F2 — the owner’s collision arithmetic, recomputed from the geometry', () => {
  // 2 × 95 + 51 = 241 for the sockets; 2 × 95 + 60 = 250 for the dog bones.
  // Recomputed rather than retyped, so a workshop that widens either gets a
  // limit that moves with it and this test says so if the threshold stops
  // clearing them.
  const limits = jointCollisionLengths(pz);
  assert.equal(limits.socket, 241);
  assert.equal(limits.dogbone, 250);

  // The threshold is a CABINET depth and the collisions are RUN lengths, and
  // the run is the depth less one board. 300 must clear the worse of the two.
  const shallowestPairRun = pz.singleJointMaxDepth - P.board.thickness;
  assert.ok(
    shallowestPairRun > limits.dogbone,
    `a ${pz.singleJointMaxDepth} mm cabinet has a ${shallowestPairRun} mm run, which must clear ${limits.dogbone}`,
  );
});

// ─── the rule ───────────────────────────────────────────────────────────────

test('F2.1 — at or under 300 mm the inset is one centred joint; above it, 95', () => {
  assert.equal(resolvedJointInset(200, pz), null);
  assert.equal(resolvedJointInset(299, pz), null);
  assert.equal(resolvedJointInset(300, pz), null, '300 is INCLUDED — “depth ≤ 300”');
  assert.equal(resolvedJointInset(301, pz), 95);
  assert.equal(resolvedJointInset(558, pz), 95);
});

test('F2.1 — every default cabinet is a deep one, so nothing standard moves', () => {
  // The whole of F2.3's "fingerprint delta ZERO" rests on this one fact, so it
  // is a fact with a test rather than a sentence in a report.
  for (const type of ['WARDROBE', 'BUD', 'BUDR', 'BUDR2', 'BUDR4', 'WUD', 'BUDTALL', 'LOW_CABINET', 'SINK', 'DW_PANEL', 'OVEN_BASE', 'FRIDGE']) {
    const depth = defaultParamsFor(type, P).depth;
    assert.ok(depth > pz.singleJointMaxDepth, `${type} defaults to ${depth} mm — F2 would move its joints`);
  }
});

test('F2.1 — socketCentres takes the resolved inset, and its old law is untouched', () => {
  // No inset given is the turn-7 law, to the number: two at 95, or one in the
  // middle where the RUN itself is too short.
  assert.deepEqual(socketCentres(540, pz), [95, 445]);
  assert.deepEqual(socketCentres(200, pz), [100]);
  // The unit's resolved answer overrides it in one direction only.
  assert.deepEqual(socketCentres(540, pz, null), [270]);
  assert.deepEqual(socketCentres(540, pz, 95), [95, 445]);
});

// ─── the whole cabinet ──────────────────────────────────────────────────────

test('F2.1 — ONE inset per unit, published on the result', () => {
  assert.equal(unit({ depth: 200 }).derived.joint_inset, null);
  assert.equal(unit({ depth: 558 }).derived.joint_inset, 95);
});

test('F2.2 — sockets, ⌀7.5 holes and dog bones all follow it: same features, fewer', () => {
  const deep = unit({ depth: 558 });
  const shallow = unit({ depth: 200 });

  const socketsOf = (r, id) => r.panels.find((p) => p.id === id).cnc.pockets
    .filter((p) => p.layer === pz.layers.socket);
  const dogbonesOf = (r, id) => r.panels.find((p) => p.id === id).cnc.pockets
    .filter((p) => p.layer === pz.layers.dogbone);
  const puzzleHolesOf = (r, id) => r.drills
    .filter((d) => d.panel === id && d.layer === pz.layers.socketHole);

  for (const side of ['BUL', 'BUR']) {
    assert.equal(socketsOf(deep, side).length, 4, 'a deep side: two sockets top, two bottom');
    assert.equal(socketsOf(shallow, side).length, 2, 'a shallow side: one top, one bottom');
    assert.equal(puzzleHolesOf(deep, side).length, 8, 'two holes per socket');
    assert.equal(puzzleHolesOf(shallow, side).length, 4);
  }

  // The TOP's long edges lose one tab each and with them one dog bone each;
  // the BACK edge's two are set out across the WIDTH and do not move.
  assert.equal(dogbonesOf(deep, 'TOP').length, 6, '2 long-edge tabs × 2 edges + 2 back');
  assert.equal(dogbonesOf(shallow, 'TOP').length, 4, '1 long-edge tab × 2 edges + 2 back');

  // No new class of anything: the layers a shallow cabinet uses are a SUBSET of
  // a deep one's, never a superset.
  const layersOf = (r) => new Set([
    ...r.panels.flatMap((p) => (p.cnc?.pockets || []).map((k) => k.layer)),
    ...r.drills.map((d) => d.layer),
  ]);
  for (const layer of layersOf(shallow)) {
    assert.ok(layersOf(deep).has(layer), `${layer} is new on a shallow cabinet — F2 introduces no entity class`);
  }
});

test('F2.1 — the joints still LINE UP: the side’s socket meets the top’s tab', () => {
  // The point of resolving once. The side's socket runs along the cabinet's
  // depth and the top's mating tab runs along the same axis in the top's own
  // frame, so the two centres must be the same number.
  for (const depth of [200, 300, 301, 558]) {
    const r = unit({ depth });
    const G = P.board.thickness;
    const side = r.panels.find((p) => p.id === 'BUL');
    const top = r.panels.find((p) => p.id === 'TOP');

    const socketX = side.cnc.pockets
      .filter((p) => p.layer === pz.layers.socket && p.y2 > side.cnc.drawn_h - G)
      .map((p) => (p.x1 + p.x2) / 2)
      .sort((a, b) => a - b);
    // A dog bone on the top's long edge is centred on the tab it relieves.
    const tabX = [...new Set(top.cnc.pockets
      .filter((p) => p.layer === pz.layers.dogbone && p.y1 < 0)
      .map((p) => (p.x1 + p.x2) / 2))].sort((a, b) => a - b);

    assert.deepEqual(socketX, tabX, `at ${depth} mm deep the side and the top disagree about where the joint is`);
  }
});

test('F2 — the shallow carcass still passes the F1 edge guard', () => {
  // Fewer features is a different outline, and a different outline is a thing
  // that has to be checked rather than assumed.
  for (const panel of unit({ depth: 200 }).panels) {
    assert.deepEqual(panelFindings(panel), [], panel.id);
  }
});

test('F2 — the geometry builders default to the old law when asked nothing', () => {
  // The reason every existing fixture is untouched: `jointInset` left out is
  // not "centred" and not "95" — it is the question never being asked.
  const withNothing = sidePanelGeometry({
    w: 540, h: 720, G: 18, side: 'L', puzzle: pz,
  });
  const withNinetyFive = sidePanelGeometry({
    w: 540, h: 720, G: 18, side: 'L', puzzle: pz, jointInset: 95,
  });
  assert.deepEqual(withNothing, withNinetyFive);

  const topNothing = topPanelGeometry({ drawnW: 540, drawnH: 564, G: 18, puzzle: pz });
  const topNinetyFive = topPanelGeometry({
    drawnW: 540, drawnH: 564, G: 18, puzzle: pz, jointInset: 95,
  });
  assert.deepEqual(topNothing, topNinetyFive);
});
