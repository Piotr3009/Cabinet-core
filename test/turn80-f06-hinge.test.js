/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T80 F6 · THE HINGE: ON THE SIDE, A BLUM IN-FRAME HINGE, FROM A REFERENCE FILE
//
// CLAUDE.md T80 F6: *"The hinge's numbers enter the engine ONLY through a new
// reference file reference/hardware/blum-inframe-hinge.json (the pattern of
// cliptop-hinges.json: system, units, rules, items, a source line with the
// catalogue page or dealer page for every number) ... Every number in that
// file is marked PROPOSED with its source URL ... The ladder: hingeLadder.js
// counts hinges by the door's height as today ... the cups on the door as
// today ... the plate rows on the side at the json's set-back, at the cup
// heights ... The lay-on ladder is not touched (FROZEN 7): the inset branch is
// its own function beside it ... Check #44 red when a cup would land within 3
// of the lip."*  Tests: the json loads and names its sources; the ladder's
// count is today's (the probe: three on a BUD 770 at the house standard, two
// at the project standard 2: DECISIONS 24); the plate column at 20.5; the cup
// positions; the order line; the 3-D plate; the lay-on ladder of the same door
// with the switch off, byte for byte.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

import { useProjectStore } from '../src/stores/projectStore.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { runFrameParams } from '../src/engine/inframe.js';
import {
  inframeHinge, insetCupClear, insetCupFromEdge, insetHingeSpec, insetLadder, insetPlateSetback,
  drilledHingeRows,
} from '../src/engine/hingeLadder.js';
import { doorHingeInstances } from '../src/engine/hardware3d.js';
import { rectCorners } from '../src/engine/room.js';
import { loadLisp } from './lisp-mini.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const L = loadLisp(read('reference/lisp/KIT_INFRAME.lsp'));
const S = () => useProjectStore.getState();

/** A BUD in a frame of its own, through the run element the store writes. */
function inframeBud(extra = {}) {
  const one = { id: 'u', type: 'BUD', position: { wall: 0, x_mm: 0, rotation_deg: 0 }, params: { ...defaultParamsFor('BUD', P), unit_num: '01', front_t: 22, ...extra } };
  return computeCabinet({ ...one.params, type: 'BUD', inframe: true, run_frame: runFrameParams([one], P).get('u') }, P);
}
const plates = (r, side) => r.drills.filter((d) => d.panel === side && d.kind === 'hinge').map((d) => [d.x, d.y]);

// ═══ THE REFERENCE FILE ═══════════════════════════════════════════════════

test('F6 · the json loads, cliptop-hinges.json\'s shape, and every number names its source and says PROPOSED', () => {
  const raw = JSON.parse(read('reference/hardware/blum-inframe-hinge.json'));
  assert.deepEqual(raw, inframeHinge(), 'the engine reads THIS file');
  for (const key of ['system', 'units', 'rules', 'items', 'source']) assert.ok(key in raw, key);
  assert.equal(raw.units, 'mm');
  assert.match(raw.status, /PROPOSED/);
  for (const [name, rule] of Object.entries(raw.rules)) {
    assert.match(String(rule.status || ''), /PROPOSED/, `${name} is PROPOSED`);
    assert.match(String(rule.source || ''), /^https:\/\//, `${name} names its source`);
    assert.ok(rule.quote, `${name} quotes it`);
  }
  // The geometry CLAUDE.md names: the 110 inset (71B3750 screw-on, 71B3790 INSERTA) on a 0 mm cruciform plate, cup 35 / 13.
  assert.equal(raw.rules.hinge.article, '71B3750');
  assert.equal(raw.rules.hinge.sibling.article, '71B3790');
  assert.equal(raw.rules.angle.value, 110);
  assert.equal(raw.rules.door_thickness_max.value, 24);
  assert.deepEqual([raw.rules.cup.diameter, raw.rules.cup.depth_catalogue], [35, 13]);
  assert.equal(raw.rules.plate.article, '173H7100');
  assert.equal(raw.rules.plate.two_piece, '175H7100');
  assert.equal(raw.rules.plate.spacing, 0);
  assert.equal(raw.rules.plate_setback.inset_mm, 1.5);
  assert.equal(raw.rules.plate_setback.for_a_22_door, 20.5);
  assert.ok(raw.rules.plate_setback.caution.includes('35.5'), 'the sources\' other reading is named for the owner');
  // The candidates the chat found on 21.10, all Blum; the one shipped.
  assert.deepEqual(raw.candidates.map((c) => c.article), ['71B3750', '71B3790', '71M2750', '71B9750', '71B3650+P']);
  assert.deepEqual(raw.candidates.filter((c) => c.shipped).map((c) => c.article), ['71B3750']);
  // No new GLB: the items are files the CLIP top catalogue already names.
  const cliptop = JSON.parse(read('reference/hardware/cliptop-hinges.json'));
  for (const item of raw.items) assert.ok(cliptop.items.some((c) => c.file === item.file), `${item.file} is already in the bucket's list`);
  assert.doesNotMatch(read('reference/hardware/blum-inframe-hinge.json'), /[\u2013\u2014]/, 'no em or en dash');
  assert.ok(existsSync(`${ROOT}reference/hardware/cliptop-hinges.json`));
});

test('F6 · the inset branch beside the ladder: 20.5 for a 22 door (the LISP\'s inframe-plate-setback), the cup 21.5 in', () => {
  assert.equal(insetPlateSetback(22, 25), 20.5);
  assert.equal(insetPlateSetback(22, 25), L.call('inframe-plate-setback', 22, 1.5, 25));
  assert.equal(insetCupFromEdge(), 21.5, 'K 4 + 17.5: today\'s cup line');
  const spec = insetHingeSpec();
  assert.deepEqual([spec.article, spec.angle, spec.systemLabel, spec.plateDrill], ['71B3750', 110, 'CLIP top BLUMOTION 110 INSET', 'plate_knockin5']);
  // Check #44's law (F10): the cup's edge stands K + 3 off the lip, never under 3.
  assert.equal(insetCupClear(3), true);
  assert.equal(insetCupClear(3, { rules: { boring_distance_k: { used: -1 } } }), false, 'a changed json cannot cut the lip away silently');
  assert.equal(L.call('inframe-cup-clear-p', 4, 3), true);
});

// ═══ THE ENGINE ═══════════════════════════════════════════════════════════

test('F6 · the plate column on the side at 20.5, at the hinge rows, today\'s pair and pilot', () => {
  const r = inframeBud();
  const [door] = r.panels.filter((p) => p.role === 'front');
  assert.equal(door.meta.insetHinge.plateSetback, 20.5);
  assert.deepEqual(plates(r, 'BUL'), [[20.5, 84], [20.5, 116], [20.5, 454], [20.5, 486], [20.5, 654], [20.5, 686]]);
  assert.equal(r.drillSummary.side_hinge_holes_x, 20.5);
  assert.ok(r.drills.filter((d) => d.panel === 'BUL' && d.kind === 'hinge').every((d) => d.d === 5), 'the 5 mm knock-in, today\'s plate_default');
  // A right-hand door: BUR, drawn from the back, the column at its depth less 20.5.
  const rr = inframeBud({ hinge: 'R' });
  assert.deepEqual(plates(rr, 'BUR').map(([x]) => x), Array(6).fill(540 - 20.5));
});

test('F6 · the count is today\'s ladder over the door: three at the house standard, two at the project\'s standard 2', () => {
  const three = inframeBud();
  const [door3] = three.panels.filter((p) => p.role === 'front');
  assert.equal(door3.h, 726);
  assert.deepEqual(door3.meta.cupY, [78, 448, 648], 'the rows 100 / 470 / 670 down the door');
  assert.deepEqual(drilledHingeRows(three), [100, 470, 670]);
  const layon = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01', front_t: 22 }, P);
  assert.equal(three.drillSummary.hinge_centers.length, layon.drillSummary.hinge_centers.length, 'the same count as the lay-on door');
  const two = inframeBud({ hinge_standard: 2 });
  const [door2] = two.panels.filter((p) => p.role === 'front');
  assert.equal(door2.meta.cupY.length, 2, 'a 726 door keeps two hinges where the project works to two');
  assert.equal(plates(two, 'BUL').length, 4);
  // The ladder as the inset branch reads it back.
  assert.deepEqual(insetLadder(three), [{ panelId: door3.id, side: 'BUL', cups: [78, 448, 648], rows: [100, 470, 670], plateSetback: 20.5 }]);
});

test('F6 · the cups: today\'s 35 at 21.5 from the hinge edge, at the rows less the door\'s 22, every one on the door', () => {
  const r = inframeBud();
  const [door] = r.panels.filter((p) => p.role === 'front');
  const cups = r.drills.filter((d) => d.panel === door.id && d.kind === 'cup');
  assert.deepEqual(cups.map((d) => [d.x, d.y, d.d]), [[534.5, 78, 35], [534.5, 448, 35], [534.5, 648, 35]]);
  assert.equal(door.w - cups[0].x, 21.5);
});

test('F6 · the order line buys the inset hinge (71B3750, 110 INSET); the 3-D hangs its plate at the inset column', () => {
  const r = inframeBud();
  const line = r.hardware.find((h) => h.role === 'hinges');
  assert.equal(line.qty, 3);
  assert.equal(line.spec.article, '71B3750');
  assert.equal(line.spec.angle, 110);
  assert.match(line.spec_label, /^3 per door × 1 · 110° · CLIP top BLUMOTION 110 INSET · (\w+ · )?71B3750$/);
  const [door] = r.panels.filter((p) => p.role === 'front');
  assert.equal(door.meta.openAngleDeg, 110);
  const inst = doorHingeInstances(door, { result: r, profile: P, panels: r.panels, width: 600, depth: 558, boardT: 18, centres: [100, 470, 670] });
  assert.equal(inst.length, 3);
  assert.ok(inst.every((h) => h.plateZ === 558 - 20.5), `the plate at depth - 20.5 (${inst.map((h) => h.plateZ)})`);
});

test('F6 · the lay-on ladder of the same door with the switch off is main\'s, byte for byte (FROZEN 7)', () => {
  S().newProject('T80 F6');
  S().setRoom({ corners: rectCorners(6000, 3000), height: 2500 });
  S().setFrontType('f1', { source: 'spray', material_id: 'generic-22' });
  const id = S().addUnit('BUD', { wall: 0, x: 1000 }).id;
  S().updateUnitParams(id, { width: 600 });
  S().setDoors(id, { count: 1, hinge: 'L' });
  const before = S().unitResult(id);
  const hingeOf = (r) => JSON.stringify({
    drills: r.drills.filter((d) => ['hinge', 'cup', 'cup_screw'].includes(d.kind)),
    sum: [r.drillSummary.hinge_centers, r.drillSummary.side_hinge_holes_x, r.drillSummary.front_cup_y, r.drillSummary.hinged_sides],
    hw: r.hardware.filter((h) => h.role === 'hinges'),
  });
  const layon = hingeOf(before);
  assert.deepEqual(before.drills.filter((d) => d.panel === 'BUL' && d.kind === 'hinge').map((d) => d.x)[0], 37, 'the lay-on 37');
  S().setDesign({ inframe: true });
  assert.notEqual(hingeOf(S().unitResult(id)), layon);
  S().setDesign({ inframe: false });
  assert.equal(hingeOf(S().unitResult(id)), layon);
});
