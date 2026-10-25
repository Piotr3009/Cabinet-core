/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F10, F11, F12 · THE VANITY'S TOP, ITS BASIN, ITS SERVICE VOID
//
// The owner, 25.10.2026 (12:57): *"dodanie blat grubosc do wyboru"*, *"dodanie
// 1 sink or 2 sink? dodajesz tylko do widoku"*, *"nastepnie to bedzie miejsce
// z tylu na rurki minimum potrzebujemy okolo 80 mm do 100 mm"*; and at 13:03
// over the mockup (verify/t82/mockups/vanity.png): *"3 - 80"*, *"5 - blat
// osobny element jak worktop"*.
//
// CLAUDE.md T82:
//   F10 the vanity's top is the house WORKTOP, its thickness typed, its depth
//       reaching the WALL line over the service void (d = the unit's reach +
//       the void + the front overhang); a vanity born in a room gets its
//       worktop at birth.
//   F11 sinks 1 or 2: a basin solid to the eye (oval 520 x 400 x 150 from
//       profile.vanity.basin), one centred, two at the column centres (or at a
//       third and two thirds of the width for one column); the worktop's
//       cut-out on the plan; nothing in the cut list, nothing on the CNC. The
//       waste centre (the trap's centre of F8(d)) is x at the basin centre, z
//       at vanity.wasteFromBack from the carcass back.
//   F12 the plan draws the void hatched (SERVICE_VOID), the section the two
//       rails and the void; the Check lists the void as a NOTE, never a fault
//       (CLAUDE.md's #40, numbered #45 this turn: BRIEF section 6).

import test from 'node:test';
import assert from 'node:assert/strict';

import { useProjectStore } from '../src/stores/projectStore.js';
import { rectCorners } from '../src/engine/room.js';
import { getCabinetProfile } from '../src/engine/profile.js';
import { migrateDesign } from '../src/engine/design.js';
import { wallGapOf } from '../src/engine/runs.js';
import { serviceVoidOf, worktopGeometry } from '../src/engine/worktop.js';
import { vanitySpec } from '../src/engine/vanity.js';
import { confirmDrawerBox } from './drawer-box-gate.js';

const S = () => useProjectStore.getState();
const P = () => getCabinetProfile();
const V = () => P().vanity || {};
const near = (a, b, eps = 0.01) => Math.abs(Number(a) - Number(b)) <= eps;

/** The numbers, read from the profile (B1 writes them; CLAUDE.md's PROPOSED values as the floor). */
const VOID = () => vanitySpec(P()).serviceVoidMm;
const BASIN = () => {
  const b = V().basin || {};
  return { w: Number(b.widthMm), d: Number(b.depthMm), h: Number(b.heightMm) };
};
const WASTE_FROM_BACK = () => vanitySpec(P()).wasteFromBackMm;
const CLEARANCE = () => Math.max(0, Number(P().room?.wallBackClearance) || 0);

function room() {
  S().newProject('T82 F10 vanity');
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  confirmDrawerBox();
}

/** One vanity on wall A at x 1000, its params applied after birth (as the right panel writes them). */
function vanity(type = 'VANITY3', params = {}) {
  room();
  const res = S().addUnit(type, { wall: 0, x: 1000 });
  assert.ok(res?.id, `the ${type} was refused: ${res?.error}`);
  if (Object.keys(params).length) S().updateUnitParams(res.id, params);
  return res.id;
}

const unitOf = (id) => S().units.find((u) => u.id === id);
const records = () => migrateDesign(S().project.design).worktops;
const slabOver = (id) => S().worktopsOf().find((w) => (w.geometry?.unitIds || []).includes(id));
const basinsOf = (slab) => (slab?.cutouts || []).filter((c) => c.kind === 'basin');
const entryOf = (id) => S().allResults().find((e) => e.unit.id === id);


// ─── F10 · THE TOP IS A WORKTOP ────────────────────────────────────────────

test('F10 · a vanity born in a room gets its worktop at birth: one record over the one unit, the kind a set gives', () => {
  const id = vanity('VANITY3');
  const mine = records().filter((w) => w.unitIds.includes(id));
  assert.equal(mine.length, 1, 'one worktop record over the vanity');
  assert.deepEqual(mine[0].unitIds, [id]);
  assert.equal(mine[0].kind, 'top', 'the one cabinet a top is laid on (T75 F20)');
  // Its thickness is the vanity's own default top (profile.vanity.defaults, PROPOSED 20).
  const top = Number(V().defaults.top);
  assert.equal(slabOver(id).geometry.thickness, top);
});

test('F10 · its depth reaches the WALL over the service void: the unit\'s reach + the void + the front overhang', () => {
  const id = vanity('VANITY3');
  const u = unitOf(id);
  assert.equal(wallGapOf(u, P()), CLEARANCE() + VOID(), 'the carcass stands clearance + 80 off the wall (F8(b))');
  assert.equal(serviceVoidOf(u, P()), VOID());
  const g = slabOver(id).geometry;
  const reach = Number(u.params.depth) + (Number(P().doors?.gap) || 0) + (Number(u.params.front_t) || 0);
  const over = Number(P().autoParts?.worktop?.frontOverhang ?? 20);
  assert.equal(g.z, 0, 'flush at the wall: nothing hangs over a wall');
  assert.ok(near(g.d, reach + VOID() + over), `d ${g.d} = ${reach} + ${VOID()} + ${over}`);
  // The slab's front edge stands as proud of the vanity's front as any slab of
  // the house stands of its run's (T30's law, the clearance included).
  const front = wallGapOf(u, P()) + reach;
  assert.ok(near(g.d - front, over - CLEARANCE()), 'the same overhang past the fronts as a kitchen slab');
});

test('F10 · the void is the vanity\'s alone: a kitchen slab is exactly what it was', () => {
  room();
  const a = S().addUnit('BUD', { wall: 0, x: 1000 }).id;
  const b = S().addUnit('BUD', { wall: 0, x: 1600 }).id;
  const g = worktopGeometry({ units: [unitOf(a), unitOf(b)], profile: P() });
  const u = unitOf(a);
  assert.equal(serviceVoidOf(u, P()), 0, 'no void behind a base unit');
  assert.equal(g.d, Number(u.params.depth) + (Number(P().doors?.gap) || 0) + (Number(u.params.front_t) || 0) + P().autoParts.worktop.frontOverhang);
});

test('F10 · the thickness is typed (*"blat grubosc do wyboru"*): the record\'s own, and a nonsense number refused in words', () => {
  const id = vanity('VANITY3');
  const rec = records().find((w) => w.unitIds.includes(id));
  const ok = S().setWorktopThickness(rec.id, 30);
  assert.equal(ok.ok, true);
  assert.equal(slabOver(id).geometry.thickness, 30);
  assert.equal(slabOver(id).geometry.h, 30);
  const bad = S().setWorktopThickness(rec.id, 0);
  assert.equal(bad.ok, false);
  assert.match(bad.error, /thickness/i, 'said in words');
  assert.equal(slabOver(id).geometry.thickness, 30, 'and nothing changed');
});

