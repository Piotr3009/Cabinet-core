/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── 15.10.2026 · THE L CORNER'S DOORS AND THE 155 HINGE ────────────────────
//
// The owner: *"klamki i orientacja drzwi na L shape w ogole nie ma sensu,
// sprawdz dokladnie; po powiekszeniu grubosci drzwi na L szafkach corner
// drzwiczki musza sie skrocic; l corner moja propozycja to otwieranie
// drzwiczek razem, czyli drzwiczki polaczone ze soba zawiasami; standardowo
// zawiasy 155 degree, teraz otwieraja sie na 90 i wyglada zle."*
//
// What this holds:
//   1. a new L opens as a BI-FOLD pair: leaf B hung on leaf A, ONE handle, on
//      leaf B's free end; leaf A carried, no handle, no handle hole;
//   2. the carcass-hung pair stays a choice, and its leaf B now CLEARS leaf
//      A's face by clearance.corner (T75 left its end on the face); a thicker
//      front shortens leaf B by the same millimetres and leaves A alone;
//   3. the handle in the scene stands on the face a leaf shows the room, a
//      leaf facing along x (the L's door B) included (3d/Hardware.jsx);
//   4. the standard hinge is the 155 (to 24 mm fronts), every hinged leaf
//      carries its hinge's angle and opens to it in the picture.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { lArmKinds, lDoorsModeOf, lLeafTrimMm } from '../src/engine/corners.js';
import { NEIGHBOUR, clearanceMatrix } from '../src/engine/frontClearance.js';
import { doorOpenAngle } from '../src/engine/doors.js';
import { hingeAngleFor, hingeCatalogue, setHingeCatalogue } from '../src/engine/hinges.js';
import { CLIPTOP_HINGE_CATALOGUE, loadHardwareCatalogues } from '../src/lib/hardwareCatalogue.js';
import { resolveHardwareCatalogue } from '../src/lib/hardwareSource.js';

loadHardwareCatalogues();

const ROOT = new URL('../', import.meta.url);
const read = (rel) => readFileSync(new URL(rel, ROOT), 'utf8');
const BAR = { type: 'bar', centres: 128 };
const L = (over = {}) => computeCabinet({
  ...defaultParamsFor('CORNER_L_BASE', P), unit_num: 'CL', doors: true, ...over,
}, P);
const leaf = (r, arm) => r.panels.find((p) => p.id === `CL-${arm}-F`);
const handleDrills = (r, arm) => r.drills.filter((d) => d.panel === `CL-${arm}-F` && d.kind === 'handle');

test('1 · a new L is a bi-fold pair with ONE handle, on leaf B\'s free end; leaf A is carried and bores no handle hole', () => {
  const r = L({ project_handle: BAR, front_t: 19 });
  assert.equal(r.derived.corner_l.doors_mode, 'bifold');
  const a = leaf(r, 'A'); const b = leaf(r, 'B');
  assert.deepEqual(a.meta.bifold, { child: 'CL-B-F', companion: '155 or 170' });
  assert.equal(a.meta.handle, undefined, 'the carrier leaf takes no handle');
  assert.equal(a.meta.handleless, 'bi-fold carrier: the pair is pulled by leaf B');
  assert.deepEqual(handleDrills(r, 'A'), []);
  assert.ok(b.meta.handle, 'leaf B carries the pair\'s handle');
  assert.equal(handleDrills(r, 'B').length, 2, 'a bar: two holes on B');
  // B hangs on A (its hinge edge is its inner edge, toward A: the room's right when the leaf faces +x,
  // 'R'), so its handle is at its FAR end: the room's left, x near w in the cut frame (x runs from the right edge).
  assert.equal(b.meta.hinge, 'R');
  assert.ok(b.w - b.meta.handle.x < 60, `the handle near B's free end (x ${b.meta.handle.x} of ${b.w})`);
  // The pair hinges: A's own carcass hinges (the standard 155 on a 19 mm front) and the bi-fold hinges for B.
  const hinges = r.hardware.find((h) => h.role === 'hinges');
  assert.equal(hinges.spec.angle, 155);
  assert.ok(r.hardware.some((h) => h.role === 'bifold_hinges'));
  assert.equal(a.meta.openAngleDeg, 155, 'leaf A keeps the door\'s own hinge');
  assert.match(r.warnings.find((w) => w.code === 'CORNER_L_BIFOLD').message, /one handle, on leaf B/);
  // The pair of two carcass-hung leaves keeps both handles.
  const pair = L({ project_handle: BAR, front_t: 19, corner_doors: null });
  assert.ok(leaf(pair, 'A').meta.handle && leaf(pair, 'B').meta.handle);
  assert.equal(handleDrills(pair, 'A').length + handleDrills(pair, 'B').length, 4);
});

test('2 · the carcass-hung pair: leaf B clears leaf A\'s face by clearance.corner, and a thicker front shortens B alone', () => {
  const c = P.doors.clearance.corner;
  const gap = P.doors.gap;
  const widths = {};
  for (const t of [18, 25, 40]) {
    const r = L({ corner_doors: null, front_t: t });
    const a = leaf(r, 'A'); const b = leaf(r, 'B');
    assert.equal(a.w, 900 - 558 - gap / 2, `A does not move with the front (${t})`);
    assert.equal(b.box.z - (a.box.z + a.box.d), c, `B's end stands clearance.corner past A's face (${t})`);
    assert.equal(b.box.z, 558 + gap + t + c);
    widths[t] = b.w;
    // The bi-fold pair: B one gap off A's face, whatever the front.
    const bf = L({ front_t: t });
    assert.equal(leaf(bf, 'B').box.z - (leaf(bf, 'A').box.z + leaf(bf, 'A').box.d), gap);
  }
  assert.equal(widths[18] - widths[25], 7);
  assert.equal(widths[25] - widths[40], 15);
  // corners.js says the same trims the engine cuts.
  assert.deepEqual(lArmKinds(P), { A: 'covered', B: 'overlap' });
  assert.deepEqual(lArmKinds(P, 'bifold'), { A: 'covered', B: 'bifold' });
  assert.equal(lDoorsModeOf(defaultParamsFor('CORNER_L_BASE', P)), 'bifold');
  assert.equal(lDoorsModeOf({ corner_doors: null }), 'pair');
  assert.equal(lLeafTrimMm('overlap', P, 25), gap + 25 + c + gap / 2);
  assert.equal(lLeafTrimMm('bifold', P, 25), gap + 25 + 1.5 * gap);
  assert.equal(lLeafTrimMm('covered', P, 25), gap / 2);
  // …and the clearance matrix wants what the engine cuts, so the Check corrects nothing on a fresh L.
  const m = clearanceMatrix(P);
  assert.equal(m[NEIGHBOUR.CORNER_OVERLAP], gap + P.front.thickness + c);
  assert.equal(m[NEIGHBOUR.CORNER_BIFOLD], P.front.thickness + 2 * gap);
  // LISP first: KIT_CORNER_L.lsp section 8 carries the law.
  const lisp = read('reference/lisp/KIT_CORNER_L.lsp');
  assert.match(lisp, /THE BI-FOLD PAIR \(the default since 15\.10\.2026/);
  assert.match(lisp, /gap \+ front_t \+ clearance\.corner beyond the inner corner line/);
  assert.match(lisp, /ONE HANDLE, on door B's free end/);
  assert.match(lisp, /A THICKER FRONT SHORTENS DOOR B in both pairs/);
});

test('3 · the scene\'s handle stands on the face a leaf shows the room, a leaf facing along x included', () => {
  const hw = read('src/3d/Hardware.jsx');
  const at = hw.indexOf('export function FrontHandle');
  const block = hw.slice(at, hw.indexOf('export function Extractor'));
  assert.match(block, /const nx = panel\.meta\?\.swingZ\n\s+\? -\(Number\(panel\.meta\.swingZ\.dir\) \|\| -1\)\n\s+: \(panel\.meta\?\.faceX \? \(Number\(panel\.meta\.faceX\.dir\) \|\| 1\) : 0\);/);
  assert.match(block, /if \(nx > 0\) return \[box\.x \+ box\.w \+ off, box\.y \+ Number\(y\), box\.z \+ Number\(x\)\];/);
  assert.match(block, /if \(nx < 0\) return \[box\.x - off, box\.y \+ Number\(y\), box\.z \+ box\.d - Number\(x\)\];/);
  assert.match(block, /return \[sheetX\(x\), box\.y \+ Number\(y\), faceZ \+ off\];/, 'a front facing z reads as it did');
  // Every placed thing goes through it: the knob's stem and dome, the bar's posts and rod, the aura.
  assert.equal((block.match(/atSheet\(/g) || []).length >= 6, true);
  assert.match(block, /const offFace = nx \? \[0, 0, Math\.PI \/ 2\] : \[Math\.PI \/ 2, 0, 0\];/);
  assert.match(block, /const domeTo = nx \? \[0, 0, -nx \* \(Math\.PI \/ 2\)\] : \[Math\.PI \/ 2, 0, 0\];/);
  // Turn 28's mirror stands (the test of that turn reads the same names).
  assert.match(block, /const sheetX = \(x\) => box\.x \+ box\.w - Number\(x\);/);
  // The L's door B says which way it faces, for the handle and the swing alike.
  const r = L({ project_handle: BAR });
  assert.deepEqual(leaf(r, 'B').meta.swingZ, { dir: -1 });
  assert.deepEqual(leaf(L({ project_handle: BAR, corner_side: 'right' }), 'B').meta.swingZ, { dir: 1 });
});

test('4 · the standard hinge is the 155 and every hinged leaf opens in the picture as far as its hinge opens', () => {
  const bud = (over) => computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: 'B1', doors: { count: 2 }, ...over }, P);
  assert.deepEqual(bud({ front_t: 18 }).panels.filter((p) => p.part === 'FRONT').map((p) => p.meta.openAngleDeg), [155, 155]);
  assert.deepEqual(bud({ front_t: 24 }).panels.filter((p) => p.part === 'FRONT').map((p) => p.meta.openAngleDeg), [155, 155]);
  assert.deepEqual(bud({ front_t: 25 }).panels.filter((p) => p.part === 'FRONT').map((p) => p.meta.openAngleDeg), [110, 110], 'the 25 mm shaker: Blum\'s 155 stops at 24');
  assert.deepEqual(bud({ front_t: 32 }).panels.filter((p) => p.part === 'FRONT').map((p) => p.meta.openAngleDeg), [95, 95]);
  // The BOM buys the same hinge the picture swings.
  assert.equal(bud({ front_t: 18 }).hardware.find((h) => h.role === 'hinges').spec.article, '45588965');
  assert.match(bud({ front_t: 18 }).hardware.find((h) => h.role === 'hinges').spec_label, /155°/);
  // The swing: a 155 door opens to 155 in the middle of a run, and still stops square at a wall on its hinge side.
  const DEG = Math.PI / 180;
  assert.equal(doorOpenAngle({ doorWidth: 400, fullDeg: 155 }, P), 155 * DEG);
  assert.equal(doorOpenAngle({ doorWidth: 400, fullDeg: 155, hingeOffset: 1.5, gapToWall: 10 }, P), 90 * DEG);
  // The catalogue of record carries the rung and says why.
  const cat = JSON.parse(read('reference/hardware/cliptop-hinges.json'));
  assert.deepEqual(cat.rules.hinge_by_front_thickness, [{ max: 24, angle: 155 }, { max: 25, angle: 110 }, { max: 32, angle: 95 }]);
  assert.match(cat.rules.hinge_by_front_thickness_note, /standardowo zawiasy 155/);
  // An appliance's drop front keeps its own 45.
  const dw = computeCabinet({ ...defaultParamsFor('DW_PANEL', P), unit_num: 'D1' }, P);
  const drop = dw.panels.find((p) => p.meta?.opening === 'drop');
  assert.ok(drop);
  assert.equal(drop.meta.openAngleDeg, 45);
});

test('5 · a manifest from the bucket or the database names the models; the angle ladder stays the repository\'s', async () => {
  // The owner's T19 manifest carries the 110 ladder (test/fixtures/hardware-local is its synthetic twin):
  // read from the bucket, the db row or an override base, its ITEMS are adopted and the RULE is the record's.
  const old = JSON.parse(JSON.stringify(CLIPTOP_HINGE_CATALOGUE));
  old.rules.hinge_by_front_thickness = [{ max: 25, angle: 110 }, { max: 32, angle: 95 }];
  old.items = old.items.map((it) => ({ ...it, article: `9${it.article}` }));
  try {
    const fromDb = await resolveHardwareCatalogue({
      family: 'hinges', profile: P, readRow: async () => ({ manifest: old }), fetchImpl: null, storageBase: '',
    });
    assert.equal(fromDb.source, 'db');
    assert.deepEqual(hingeCatalogue().rules.byThickness.map((r) => [r.max, r.angle]), [[24, 155], [25, 110], [32, 95]], 'the ladder is the record\'s');
    assert.equal(hingeAngleFor({ frontThickness: 18 }), 155);
    assert.ok(hingeCatalogue().items.every((it) => it.article.startsWith('9')), 'the models are the manifest\'s');
    const url = 'http://x/hardware/hinges/blum/manifest.json';
    const fromBucket = await resolveHardwareCatalogue({
      family: 'hinges', profile: P, readRow: async () => null, storageBase: 'http://x', overrideBase: '',
      fetchImpl: async (u) => ({ ok: u === url, status: 200, statusText: '', json: async () => old }),
    });
    assert.equal(fromBucket.source, 'bucket');
    assert.equal(hingeAngleFor({ frontThickness: 19 }), 155);
    assert.equal(hingeAngleFor({ frontThickness: 25 }), 110);
    // A manifest with no rules block at all takes the record's whole block.
    const bare = { system: old.system, items: old.items };
    const fromBare = await resolveHardwareCatalogue({
      family: 'hinges', profile: P, readRow: async () => ({ manifest: bare }), fetchImpl: null, storageBase: '',
    });
    assert.equal(fromBare.source, 'db');
    assert.equal(hingeAngleFor({ frontThickness: 18 }), 155);
    assert.equal(hingeCatalogue().rules.layers.cup, 'FRONT_HINGES_35MM');
  } finally {
    setHingeCatalogue(CLIPTOP_HINGE_CATALOGUE);
  }
});
