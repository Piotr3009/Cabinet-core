/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── TURN 85 · F4 · THE DOORS OPEN TO 90, THE SILVER FINISH THE DEFAULT ─────
//
// CLAUDE.md T85 law 4, A SWING IS A PICTURE. The owner, 30.10.2026 20:48:
// *"default zawiasy prosze zrob 90 stopni, teraz mamy 150 to nie jest dobre,
// i silver prosze."*  This supersedes 15.10's *"standardowo zawiasy 155
// degree"* for the PICTURE only: what hinge is BOUGHT (the catalogue's 155 /
// 110 / 95 by front thickness), what is drilled, and Check #8 are untouched.
//
// The test asks it the way the client clicks: a wardrobe added through the
// store, its door opened through the ui store's own road (`toggleFront`), and
// the angle derived as the view derives it (`3d/UnitView.jsx swingFor` and
// `doorSwing`: the leaf's hand, the open fraction, `doorOpenAngle` with the
// leaf's width, the half gap and the wall on its hinge side).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { doorOpenAngle } from '../src/engine/doors.js';
import { resolveHingeFinish } from '../src/engine/hinges.js';
import { companyDefaults } from '../src/engine/companyDefaults.js';
import { migrateDesign } from '../src/engine/design.js';
import { loadHardwareCatalogues } from '../src/lib/hardwareCatalogue.js';
import { hardwareFinishSpec } from '../src/3d/hardwareFinish.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

loadHardwareCatalogues();

const ROOT = new URL('../', import.meta.url);
const read = (rel) => readFileSync(new URL(rel, ROOT), 'utf8');
const store = () => useProjectStore.getState();
const ui = () => useUiStore.getState();
const toDeg = (rad) => Math.round((rad * 180) / Math.PI * 1000) / 1000;

// The view's own derivation, line for line (3d/UnitView.jsx swingFor + doorSwing).
function viewSwingDeg(panel, open, wallGaps) {
  if (panel?.meta?.opening === 'drop') return open * (Number(panel.meta.openAngleDeg) || 45);
  if (panel?.meta?.lift) return open * (Number(panel.meta.lift.angleDeg) || 90);
  const gap = panel.meta?.hinge === 'R' ? wallGaps?.right : wallGaps?.left;
  const swing = doorOpenAngle({
    doorWidth: panel.w, hingeOffset: P.doors.gap / 2, gapToWall: gap ?? null,
  }, P);
  return Math.abs(toDeg(open * swing));
}

function project() {
  store().loadProject({
    id: null,
    name: 't85-f04',
    room: migrateRoom({ height: 2500, corners: rectCorners(6000, 4000) }),
    design: {},
  }, []);
}

test('F4.1 · the profile\'s swing is 90 in the room and 90 at a wall, with the owner\'s two sentences beside it', () => {
  assert.equal(P.doors.openAngle, 90);
  assert.equal(P.doors.openAngleAtWall, 90);
  const src = read('src/engine/profile.js');
  assert.match(src, /standardowo zawiasy 155 degree/);
  assert.match(src, /default zawiasy prosze zrob 90\s*\/\/\s*stopni, teraz mamy 150 to nie jest dobre/);
  assert.match(src, /openAngle: 90, {2,}\/\/ T85 F4/);
});

test('F4.1 · a wardrobe\'s door opened through the store\'s own road reads 90 in the view\'s derivation', () => {
  project();
  const { id, error } = store().addUnit('WARDROBE');
  assert.equal(error ?? null, null);
  // The owner's 1200 wardrobe, its pair of doors asked for as the panel asks.
  store().updateUnitParams(id, { width: 1200, height: 2150, doors: { count: 2 } });
  const result = store().unitResult(id);
  const leaves = result.panels.filter((p) => p.part === 'FRONT' && p.meta?.hinge && p.box);
  assert.ok(leaves.length > 0, 'the wardrobe has hinged leaves');
  // The hinge still carries its catalogue angle (the 155 to a 24 mm front, or the
  // 110 / 95 for a thicker one) on the panel, for the BOM and Check #8.
  for (const leaf of leaves) assert.ok(Number(leaf.meta.openAngleDeg) >= 95, `${leaf.id} keeps its hinge angle`);
  ui().closeAllFronts(id);
  for (const leaf of leaves) ui().toggleFront(id, leaf.id);
  const open = ui().openFronts[id];
  // Pulled off every wall: the door is free, in the middle of the room.
  for (const leaf of leaves) {
    assert.equal(open[leaf.id], 1, `${leaf.id} is open`);
    assert.equal(viewSwingDeg(leaf, open[leaf.id], { left: null, right: null }), 90, `${leaf.id} swings to 90`);
  }
  // And as the store places it, against what is really beside it.
  const gaps = store().wallGapsFor(id);
  for (const leaf of leaves) assert.equal(viewSwingDeg(leaf, open[leaf.id], gaps), 90, `${leaf.id} in the room: 90`);
  ui().closeAllFronts(id);
});

test('F4.1 · a door against a wall reads 90; a 155 or 170 leaf no longer swings past it', () => {
  const r = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: 'B1', doors: { count: 2 }, front_t: 18 }, P);
  const leaves = r.panels.filter((p) => p.part === 'FRONT' && p.meta?.hinge);
  assert.deepEqual(leaves.map((p) => p.meta.openAngleDeg), [155, 155], 'the hinge is still the 155');
  for (const leaf of leaves) {
    assert.equal(viewSwingDeg(leaf, 1, { left: 10, right: 10 }), 90, `${leaf.id} at a wall`);
    assert.equal(viewSwingDeg(leaf, 1, { left: null, right: null }), 90, `${leaf.id} free`);
  }
  // The engine's derivation ignores the hinge's angle (T78 F13's fullDeg) for the picture.
  const DEG = Math.PI / 180;
  assert.equal(doorOpenAngle({ doorWidth: 500, fullDeg: 170 }, P), 90 * DEG);
  assert.equal(doorOpenAngle({ doorWidth: 500, fullDeg: 155, hingeOffset: 1.5, gapToWall: 10 }, P), 90 * DEG);
  // The view no longer hands the hinge angle to the swing.
  const view = read('src/3d/UnitView.jsx');
  assert.doesNotMatch(view, /fullDeg: Number\(panel\?\.meta\?\.openAngleDeg\)/);
});

test('F4.1 · the named exceptions keep their own angle: the bi-fold child 60, the drop front 45, a lift its travel', () => {
  assert.equal(P.corner.bifold.angleDeg, 60);
  const r = computeCabinet({ ...defaultParamsFor('CORNER_L_BASE', P), unit_num: 'CL', doors: true, front_t: 19 }, P);
  const child = r.panels.find((p) => p.id === 'CL-B-F');
  const carrier = r.panels.find((p) => p.id === 'CL-A-F');
  assert.equal(carrier.meta.bifold.child, 'CL-B-F');
  // The view folds the child by its own angle (3d/UnitView.jsx bifoldChild swing): the family's, else 60.
  const view = read('src/3d/UnitView.jsx');
  assert.match(view, /\(\(Number\(bifoldChild\.meta\?\.bifold\?\.angleDeg\) \|\| 60\) \* Math\.PI\) \/ 180/);
  assert.equal(Number(child.meta?.bifold?.angleDeg) || 60, 60, 'the bi-fold child reads 60');
  // The carrier leaf is a hinged leaf like any other: 90.
  assert.equal(viewSwingDeg(carrier, 1, null), 90);
  // The drop front and the lift keep their own roads in swingFor.
  assert.equal(viewSwingDeg({ meta: { opening: 'drop', openAngleDeg: 45 } }, 1, null), 45);
  assert.match(view, /if \(panel\?\.meta\?\.opening === 'drop'\) \{\n\s*return \(\(Number\(panel\.meta\.openAngleDeg\) \|\| 45\)/);
  assert.match(view, /if \(panel\?\.meta\?\.lift\) \{\n\s*return \(\(Number\(panel\.meta\.lift\.angleDeg\) \|\| 90\)/);
});

test('F4.1 · the BOM still buys the 155 hinge for a 24 mm front: the article is the hinge\'s, never the swing\'s', () => {
  const bud = (t) => computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: 'B1', doors: { count: 2 }, front_t: t }, P);
  const h24 = bud(24).hardware.find((h) => h.role === 'hinges');
  assert.equal(h24.spec.article, '45588965');
  assert.match(h24.spec_label, /155°/);
  assert.deepEqual(bud(24).panels.filter((p) => p.part === 'FRONT').map((p) => p.meta.openAngleDeg), [155, 155]);
  assert.deepEqual(bud(25).panels.filter((p) => p.part === 'FRONT').map((p) => p.meta.openAngleDeg), [110, 110]);
});

test('F4.2 · every default-finish site reads nickel (silver); a design that names onyx keeps onyx', () => {
  const C = P.hardware.hinge.cliptop;
  assert.equal(C.defaultFinish, 'nickel');
  // The project's resolution: no design word, no company word.
  assert.equal(resolveHingeFinish({ hinges: { finish: null } }, P, null), 'nickel');
  assert.equal(resolveHingeFinish(migrateDesign({}), P, null), 'nickel');
  assert.equal(resolveHingeFinish(migrateDesign({}), P, {}), 'nickel');
  // Company defaults ship no finish word, so the shop's default stands.
  assert.equal(companyDefaults()?.hinge_finish ?? null, null);
  assert.equal(resolveHingeFinish(migrateDesign({}), P, companyDefaults()), 'nickel');
  // A new design carries no finish: the resolution is nickel.
  assert.equal(migrateDesign({}).hinges.finish, null);
  // The owner's choice stands.
  assert.equal(resolveHingeFinish(migrateDesign({ hinges: { finish: 'onyx' } }), P, null), 'onyx');
  assert.equal(resolveHingeFinish(migrateDesign({}), P, { hinge_finish: 'onyx' }), 'onyx');
  // The 3D's finish, asked for nothing, is nickel; asked for onyx, onyx.
  assert.equal(hardwareFinishSpec(P, 'hinge', null).id, 'nickel');
  assert.equal(hardwareFinishSpec(P, 'hinge', 'onyx').id, 'onyx');
  // The store hands the engine nickel for a fresh project.
  project();
  assert.equal(resolveHingeFinish(store().project.design, P), 'nickel');
  // The wizard's hardware step and its summary fall back to nickel (Silver) with no word.
  for (const rel of ['src/components/WizardHardware.jsx', 'src/components/WizardSummary.jsx']) {
    assert.match(read(rel), /design\.hinges\.finish \|\| profile\.hardware\.hinge\?\.defaultFinish \|\| 'nickel'/, rel);
  }
  assert.match(read('src/components/WizardHardware.jsx'), /\['nickel', 'Silver'\]/);
  // Nickel reads as a bright metal, not a dark grey (the onyx is the dark one).
  const nickel = C.finishes.find((f) => f.id === 'nickel').material;
  const lum = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  };
  assert.ok(lum(nickel.colour) > 0.75, `nickel ${nickel.colour} is light`);
  assert.ok(nickel.metalness >= 0.9 && nickel.roughness <= 0.25);
});
