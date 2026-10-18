/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T79 F10 · THE RECESS GIVES WAY TO THE STAND-OFF.
//
// The owner, 18.10.2026: *"jak odsunie od ściany na grubość większą niż
// recess to powinien zlikwidować recess w szafie, lub zmniejszać go
// odsuwaniem od recesu, logika."*  The store reads a recess through ONE
// helper, `effectiveRecessDepth(unit, element)`: the recess's depth less the
// unit's stand-off off the wall (collision.backStandoff, its own recess_mm
// taken as 0). At or under 0 the unit has no recess (no recess_mm, no
// extension record) and stands off the wall in front of it as any unit does;
// over 0, settleRecesses (wholly inside) and recessExtensionFor (partly
// inside) both use that number. The engine hears numbers, not one line of it
// moved.
//
// The 18.10 probe, the unmodified store against this one (BUD 558, recess 300
// at x 1000..2300 on wall 1; "back" is collision.backStandoff, "front" is
// back + depth):
//
//   wholly inside (x 1100)   before                        after
//   wall_gap 100             recess 300, depth 858, back -200   recess 200, depth 758, back -100
//   wall_gap 300             recess 300, depth 858, back 0      none, depth 558, back 300
//   wall_gap 350             recess 300, depth 858, back 50     none, depth 558, back 350
//   partly inside (x 1800)
//   wall_gap 100             extension d 300                    extension d 200
//   wall_gap 300             extension d 300                    no extension record
//   wall_gap 350             extension d 300                    no extension record
//
// The front is gap + 558 in every row, before and after.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { useProjectStore, paramsForEngine } from '../src/stores/projectStore.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { rectCorners } from '../src/engine/room.js';
import { backStandoff } from '../src/engine/collision.js';
import * as A from '../src/retail/design/adapter.js';

const S = () => useProjectStore.getState();
const unitOf = (id) => S().units.find((u) => u.id === id);
const frontOf = (u) => backStandoff(u, P) + Number(u.params.depth);
const STORE = readFileSync(new URL('../src/stores/projectStore.js', import.meta.url), 'utf8');

function kitchenWithRecess() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  // An alcove in the back wall: x 1000 to 2300, 300 deep behind the wall line.
  S().addWallSlope({ kind: 'recess', wall: 0, x_mm: 1000, width: 1300, depth: 300 });
}

/** The retail FROM THE WALL field's own road: setUnitSize asks the room, then updateUnitParams. */
function standOff(id, gap) {
  const said = A.setUnitSize(id, { wall_gap: gap });
  assert.equal(said.ok, true, said.said);
  return unitOf(id);
}

const extensionOf = (id) => S().unitResult(id).derived.extension;

test('wholly inside: depth 300, stand-off 100 gives 200; 300 gives none; 350 gives none and no extension record', () => {
  kitchenWithRecess();
  const a = S().addUnit('BUD', { wall: 0, x: 1100 });
  assert.equal(a.error, null, a.error);

  let u = standOff(a.id, 100);
  assert.equal(u.params.recess_mm, 200, 'the recess less the stand-off');
  assert.equal(u.params.depth, 558 + 200);
  assert.equal(u.params.depth_full, 558);
  assert.equal(backStandoff(u, P), -100);
  assert.equal(frontOf(u), 100 + 558, 'the front stands where a unit 100 off the wall has it');
  assert.equal(extensionOf(a.id), undefined, 'a deeper carcass, never an extension as well');

  u = standOff(a.id, 300);
  assert.equal(u.params.recess_mm, undefined, 'the stand-off reaches the depth: no recess');
  assert.equal(u.params.depth, 558, 'its own depth back');
  assert.equal(u.params.depth_full, undefined);
  assert.equal(backStandoff(u, P), 300, 'off the wall in front of the recess as any unit stands');
  assert.equal(frontOf(u), 300 + 558);
  assert.equal(extensionOf(a.id), undefined, 'and no extension in its place');
  assert.equal(paramsForEngine(u).extension, undefined);

  u = standOff(a.id, 350);
  assert.equal(u.params.recess_mm, undefined);
  assert.equal(u.params.depth, 558);
  assert.equal(backStandoff(u, P), 350);
  assert.equal(extensionOf(a.id), undefined, 'no extension record');
  assert.equal(paramsForEngine(u).extension, undefined, 'none reaches the engine');

  // Back toward the wall: the same action re-settles, the recess comes back.
  u = standOff(a.id, 100);
  assert.equal(u.params.recess_mm, 200, 'it regains its recess as the number crosses the depth');
  assert.equal(u.params.depth, 758);
  u = standOff(a.id, 0);
  assert.equal(u.params.recess_mm, 300, 'on the plaster it takes the whole recess');
  assert.equal(u.params.depth, 858);
  assert.equal(frontOf(u), 558);
  // The standard stand-off is a stand-off too.
  u = standOff(a.id, P.room.wallBackClearance);
  assert.equal(u.params.recess_mm, 300 - P.room.wallBackClearance);
});

test('partly inside, the band: stand-off 100 gives an extension 200 deep; 300 and 350 give no extension record', () => {
  kitchenWithRecess();
  const a = S().addUnit('BUD', { wall: 0, x: 1800 });
  assert.equal(a.error, null, a.error);

  let u = standOff(a.id, 100);
  assert.equal(u.params.recess_mm, undefined, 'half across the recess edge: not wholly in');
  assert.equal(u.params.depth, 558);
  let ext = extensionOf(a.id);
  assert.deepEqual([ext.x0, ext.x1, ext.z0, ext.z1, ext.d], [0, 490, 0, 770, 200], 'the band as before, its depth the recess less the stand-off');
  assert.equal(paramsForEngine(u).extension.d, 200, 'the number the engine hears');

  u = standOff(a.id, 300);
  assert.equal(extensionOf(a.id), undefined, 'stand-off 300 in a 300 recess: no extension record');
  assert.equal(paramsForEngine(u).extension, undefined);
  assert.equal(u.params.depth, 558);

  u = standOff(a.id, 350);
  assert.equal(extensionOf(a.id), undefined, 'stand-off 350: none');
  assert.equal(paramsForEngine(u).extension, undefined);

  u = standOff(a.id, 0);
  ext = extensionOf(a.id);
  assert.equal(ext.d, 300, 'on the plaster the whole recess');
});

test('the stand-off is the whole of backStandoff: the hand\'s gap plus the back inset', () => {
  kitchenWithRecess();
  const a = S().addUnit('BUD', { wall: 0, x: 1100 });
  assert.equal(a.error, null, a.error);
  standOff(a.id, 60);
  S().setUnitInsets(a.id, { back: 40 });
  const u = unitOf(a.id);
  assert.equal(u.params.inset_back_mm, 40);
  assert.equal(u.params.recess_mm, 200, '300 less 60 less 40');
  assert.equal(frontOf(u), 60 + 40 + 558, 'the front where a unit 100 off the wall has it');
});

test('save and reload: a job saved with the whole recess on a unit 100 off the wall opens with 200', () => {
  kitchenWithRecess();
  const a = S().addUnit('BUD', { wall: 0, x: 1100 });
  assert.equal(a.error, null, a.error);
  standOff(a.id, 100);
  const saved = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
  // As a 15.10 build wrote it: the whole recess, whatever the stand-off.
  const old = saved.units.find((u) => u.id === a.id);
  Object.assign(old.params, { recess_mm: 300, depth: 858, depth_full: 558 });
  S().loadProject(saved.project, saved.units);
  const u = unitOf(a.id);
  assert.equal(u.params.wall_gap, 100);
  assert.equal(u.params.recess_mm, 200, 're-derived at the one choke point on load');
  assert.equal(u.params.depth, 758);
  assert.equal(u.params.depth_full, 558);
});

test('the retail FROM THE WALL field: it writes wall_gap through setUnitSize and reads back what was typed, never that less the recess', () => {
  const OPTIONS = readFileSync(new URL('../src/retail/design/Options.jsx', import.meta.url), 'utf8');
  assert.match(OPTIONS, /testid="size-wall-gap"[\s\S]{0,300}value=\{Math\.round\(A\.wallGapOfUnit\(unit\.id\)\)\}[\s\S]{0,120}A\.setUnitSize\(unit\.id, \{ wall_gap: v \}\)/,
    'the field the client types into is the adapter road the probe walks');
  kitchenWithRecess();
  const a = S().addUnit('BUD', { wall: 0, x: 1100 });
  assert.equal(a.error, null, a.error);
  // Before this fix the field read wallGapOf with the derived recess taken off:
  // -280 at the standard, -100 for a typed 100, -300 for a typed 0.
  assert.equal(unitOf(a.id).params.recess_mm, 300 - P.room.wallBackClearance);
  assert.equal(A.wallGapOfUnit(a.id), P.room.wallBackClearance, 'in the recess at the standard: the standard');
  for (const gap of [100, 300, 350, 0]) {
    standOff(a.id, gap);
    assert.equal(A.wallGapOfUnit(a.id), gap, `typed ${gap}, read ${gap}`);
  }
  const b = S().unitSizeBoundsFor(a.id).wallGap;
  assert.ok(A.wallGapOfUnit(a.id) >= b.min && A.wallGapOfUnit(a.id) <= b.max, 'what the field shows is inside its own ends');
});

test('one law, one path: both halves read the recess through effectiveRecessDepth; nominalOf is as it was', () => {
  assert.equal((STORE.match(/function effectiveRecessDepth\(/g) || []).length, 1, 'one helper');
  assert.match(STORE, /backStandoff\(\{ \.\.\.unit, params: \{ \.\.\.unit\.params, recess_mm: 0 \} \}, profile\)/, 'the stand-off with its own recess taken as 0');
  const settle = STORE.slice(STORE.indexOf('  settleRecesses: () => {'), STORE.indexOf('  settleObstacles: () => {'));
  assert.match(settle, /effectiveRecessDepth\(u, whole, profile\)/);
  assert.doesNotMatch(settle, /Number\(whole\.depth\)/, 'the raw recess depth is read nowhere in the settler');
  const ext = STORE.slice(STORE.indexOf('function recessExtensionFor('), STORE.indexOf('function paramsForEngine('));
  assert.match(ext, /const d = effectiveRecessDepth\(unit, e, profile\);/);
  assert.match(ext, /if \(!\(d > 0\) \|\| recessRefusal\(/, 'no recess for this unit: no extension record');
  assert.doesNotMatch(ext, /Number\(e\.depth\)/);
  assert.match(STORE, /function nominalOf\(unit, profile = getCabinetProfile\(\)\) \{\n  const depth = Number\(unit\.params\?\.depth_full \?\? unit\.params\?\.depth\) \|\| 0;\n  const gap = wallGapOf\(\{ \.\.\.unit, params: \{ \.\.\.unit\.params, standoff_mm: 0 \} \}, profile\);\n  return \{ depth, gap \};\n\}/, 'nominalOf unchanged');
});
