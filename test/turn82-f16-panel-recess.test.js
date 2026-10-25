/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F16, AFTER THE REVIEW . OFF THE WALL, WHERE ASKED, EVERY TIME
//
// The owner, 25.10.2026: *"bardziej chcialem grab and move"*. The review of
// C/D/E (finds.panel[1], verified): a free panel slid along its wall into a
// recess was taken by the recess law of 15.10 (KIT_RECESS.lsp, written for a
// CARCASS: a cabinet wholly in a recess goes deeper by it, its back behind the
// wall line, its front kept): `recess_mm` 290, its depth 308 from a board of
// 18, its back at -280. `moveFreePanelZ` then read the clearance less that
// recess, and the settle re-derived the recess from the new inset straight
// after the write, so the inset counted twice: asked 100 it landed at 390,
// asked again at -100; a Shift drag flipped it between two places.
//
// The rule: a free panel is a BOARD, never a carcass that grows into an
// alcove. The recess law does not take it (settleRecesses, the recess
// extension), so its box is its board and its back is where it is put:
// `moveFreePanelZ(z)` lands its back at z, the same call twice lands it in
// the same place, and what it returns is where the panel is.

import test from 'node:test';
import assert from 'node:assert/strict';

import { rectCorners } from '../src/engine/room.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { backStandoff } from '../src/engine/collision.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const S = () => useProjectStore.getState();
const unit = (id) => S().units.find((u) => u.id === id);
const back = (id) => backStandoff(unit(id), P);
const CLEARANCE = 10;
const BOARD = 18;

/** The review's stage: 5000 x 3000, a recess 300 deep on wall 1 at x 1000, 1300 wide; a panel slid into it at x 1100. */
function stage() {
  S().newProject();
  S().setRoom({ corners: rectCorners(5000, 3000), height: 2500 });
  S().addWallSlope({ kind: 'recess', wall: 0, x_mm: 1000, width: 1300, depth: 300 });
  const id = S().addUnit('FREE_PANEL', { wall: 0, x: 3000 }).id;
  S().moveUnit(id, 1100, 0.5, { magnet: false });
  return id;
}

test('T82 F16 . a free panel slid into a recess stays the board it is: no recess, its own 18, its back on the wall line', () => {
  const id = stage();
  const u = unit(id);
  assert.equal(u.position.x_mm, 1100);
  assert.equal(u.params.recess_mm, undefined, 'the recess law is a carcass\'s');
  assert.equal(u.params.depth, BOARD, 'its box is its board');
  assert.equal(u.params.depth_full, undefined);
  assert.equal(back(id), CLEARANCE);
});

test('T82 F16 . moveFreePanelZ in front of a recess lands the panel\'s back where asked, and says where it is', () => {
  const id = stage();
  for (const z of [100, 400, 250, 10, 2000]) {
    const res = S().moveFreePanelZ(id, z);
    assert.equal(back(id), z, `asked ${z}`);
    assert.equal(res.z, back(id), 'what it returns is where the panel is');
    assert.equal(res.inset, unit(id).params.inset_back_mm);
    assert.equal(res.blocked, false);
    assert.equal(unit(id).params.depth, BOARD);
  }
  // Under the clearance: held there, in words, and still where it says.
  const res = S().moveFreePanelZ(id, -250);
  assert.equal(back(id), CLEARANCE);
  assert.equal(res.z, CLEARANCE);
  assert.deepEqual(res.notices, ['From the wall limited to 10 mm by the wall clearance.']);
});

test('T82 F16 . the same call twice gives the same place; a Shift drag in 10 mm steps lands on every step', () => {
  const id = stage();
  const twice = [S().moveFreePanelZ(id, 100), S().moveFreePanelZ(id, 100)].map(() => back(id));
  assert.deepEqual(twice, [100, 100]);
  const four = [];
  for (let i = 0; i < 4; i += 1) { S().moveFreePanelZ(id, 100); four.push(back(id)); }
  assert.deepEqual(four, [100, 100, 100, 100]);
  for (let z = 20; z <= 300; z += 10) {
    S().moveFreePanelZ(id, z);
    assert.equal(back(id), z, `the drag at ${z}`);
  }
});

test('T82 F16 . the fp-wall figure reads where the panel stands: the back, off the wall line', () => {
  const id = stage();
  S().moveFreePanelZ(id, 250);
  // The chip shows backStandoff (SpacingChain), the same number the store wrote.
  assert.equal(back(id), 250);
  assert.equal(unit(id).params.inset_back_mm, 250 - CLEARANCE);
});

test('T82 F16 . an old project with a panel the recess law had taken: its board comes back on the next settle', () => {
  const id = stage();
  // The state the review found, saved before this fix.
  useProjectStore.setState((s) => ({
    units: s.units.map((u) => (u.id === id
      ? { ...u, params: { ...u.params, recess_mm: 290, depth: 308, depth_full: BOARD } }
      : u)),
  }));
  S().settleRecesses();
  assert.equal(unit(id).params.recess_mm, undefined);
  assert.equal(unit(id).params.depth, BOARD);
  assert.equal(back(id), CLEARANCE);
});

test('T82 F16 . a cabinet in the same recess is the recess law\'s as before: it goes deeper by it', () => {
  S().newProject();
  S().setRoom({ corners: rectCorners(5000, 3000), height: 2500 });
  S().addWallSlope({ kind: 'recess', wall: 0, x_mm: 1000, width: 1300, depth: 300 });
  const bud = S().addUnit('BUD', { wall: 0, x: 3000 }).id;
  S().moveUnit(bud, 1200, 0.5, { magnet: false });
  assert.ok(Number(unit(bud).params.recess_mm) > 0, 'the cabinet takes the recess');
  assert.ok(unit(bud).params.depth > unit(bud).params.depth_full, 'and goes deeper');
});
