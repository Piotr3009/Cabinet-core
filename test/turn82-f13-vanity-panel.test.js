/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T82 · F13 · F14 · THE VANITY: PLINTH OR FLOATING, THE PANEL, THE LIBRARY ─
//
// CLAUDE.md T82 F13: *"Plinth: the house plinth under the vanity, height typed
// on the unit as every unit's; `floating: true`: no legs, no plinth, the
// carcass hung at `float_height_mm` (PROPOSED default 300), the BOM adds the
// hanging brackets (*"6 - do BOM tez"*): `profile.vanity.hangers` (PROPOSED: 2
// x cabinet hanger 50 kg with wall plate, article empty for the owner) and the
// rails of F8 double as the hanging rail (the top rail is where the hangers
// bite)."*
//
// CLAUDE.md T82 F14: *"Right panel (EXEMPT): Drawers 2 / 3 / 4 (the kit),
// Columns 1 / 2, Sinks 0 / 1 / 2, Floor / Floating with the height field, the
// plinth height as today; the drawer heights editable as the chest's are (T75
// F16) and reset to equal by one button "Equal". Library rows as F9."*
//
// The owner, 25.10.2026 (12:57): *"plinth do zmiany wysokosc, propozycja
// floating lub on the floor"*; (13:03) *"6 - do BOM tez"*.
//
// LISP IS LAW: KIT_VANITY.lsp D19 and part 5(e) (`vanity-mount`,
// `vanity-plinth-p`, `vanity-base-y`, `vanity-hangers`) are run below by
// test/lisp-mini.js and the engine is held to them. The kits themselves (the
// rails, the void, the equal drawers, the U, the two columns) are F8 and F9's;
// this file holds what F13 and F14 add: how the vanity STANDS, what the BOM
// buys when it hangs, the panel that edits it and the rows that place it.
//
// One block needs A3's line in `engine/runs.js unitBase`
// (/home/user/t82/patches/F13-B4-to-A3-runs.diff): the test named "with the
// runs.js line" below; every other test runs on this slice alone.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import {
  UNIT_TYPES, defaultParamsFor, floatHeightOf, hungTypeOf, getUnitType,
} from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import {
  vanityBaseY, vanityHangers, vanityMount, vanityPlinthP,
} from '../src/engine/vanity.js';
import { buildBom } from '../src/engine/bom.js';
import { HARDWARE_TO_PART_ID, PART_REGISTRY } from '../src/engine/partRegistry.js';
import { floorOf } from '../src/engine/roomFit.js';
import { wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { rectCorners } from '../src/engine/room.js';
import { unitBase, unitTop } from '../src/engine/runs.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import { loadLisp } from './lisp-mini.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const L = loadLisp(read('reference/lisp/KIT_VANITY.lsp'));
const S = () => useProjectStore.getState();
const U = (id) => S().units.find((u) => u.id === id);
const VANITIES = ['VANITY2', 'VANITY3', 'VANITY4'];

// The profile's numbers (B1's `profile.vanity`): read, never typed here.
const FLOAT = P.vanity.defaults.floatHeightMm;
const HANGERS = P.vanity.hangers;

/** A kitchen job, 4 x 3 m, 2500 high. */
function vanityJob(kind = 'kitchen') {
  useUiStore.getState().clearSelection?.();
  S().newProject('Vanity', { design: { projectType: kind } });
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
}

const partsOf = (r) => (r.panels || []).map((p) => p.part);
const hwOf = (r, role) => (r.hardware || []).find((h) => h.role === role) || null;
/** The carcass as it is cut: every board but the toe kick, which is how it stands. */
const carcassOf = (r) => (r.panels || []).filter((p) => p.part !== 'PLINTH')
  .map(({ id, w, h, thickness, box, cnc }) => ({ id, w, h, thickness, box, cnc }));

// ═══ 1 · F13 · THE LISP FIRST: PART 5(e), PLINTH OR FLOATING ════════════════

test('F13 · KIT_VANITY.lsp 5(e): the engine\'s four answers are the LISP\'s, routine for routine', () => {
  for (const floating of [true, false]) {
    const lisp = floating ? true : null;
    assert.equal(vanityMount(floating), L.call('vanity-mount', lisp));
    assert.equal(vanityPlinthP(floating), L.call('vanity-plinth-p', lisp) === true);
    assert.equal(vanityBaseY(floating, FLOAT, 100), L.call('vanity-base-y', lisp, FLOAT, 100));
    assert.equal(vanityHangers(floating, P), L.call('vanity-hangers', lisp));
  }
  // The LISP's section 6, FLOATING: *"mount "wall", no plinth, the carcass underside at 300, 2 hangers.
  // On the floor: the plinth 100, no hanger."*
  assert.equal(FLOAT, 300);
  assert.equal(HANGERS.perUnit, 2);
  assert.equal(HANGERS.name, 'Cabinet hanger 50 kg with wall plate');
  assert.equal(HANGERS.article, '', 'the article is the owner\'s to fill');
  assert.match(read('reference/lisp/KIT_VANITY.lsp'), /FLOATING\. mount "wall", no plinth, the carcass underside at 300, 2 hangers\./);
});

test('F13 · floatHeightOf is the one question: null for every unit that stands', () => {
  const v = defaultParamsFor('VANITY3', P);
  assert.equal(v.floating, false, 'a vanity is born on the floor');
  assert.equal(v.float_height_mm, FLOAT, 'its height is written at birth (F9)');
  assert.equal(floatHeightOf('VANITY3', v, P), null);
  assert.equal(floatHeightOf('VANITY3', { ...v, floating: true }, P), FLOAT);
  assert.equal(floatHeightOf('VANITY3', { ...v, floating: true, float_height_mm: 450 }, P), 450);
  assert.equal(floatHeightOf('VANITY3', { floating: true }, P), FLOAT, 'unsaid, the profile\'s');
  assert.equal(floatHeightOf('VANITY3', { floating: true, float_height_mm: 0 }, P), 0, 'a stated 0 is a height');
  // Floating is the vanity's alone: a chest, a drawer base, a desk do not float on the flag.
  for (const id of ['WARDROBE_CHEST3', 'BUDR', 'BUD', 'WARDROBE_DESK', 'FREE_PANEL']) {
    assert.equal(floatHeightOf(id, { ...defaultParamsFor(id, P), floating: true }, P), null, id);
  }
  // The kit as it hangs: no legs, no plinth, on the wall; one object per kit.
  const hung = hungTypeOf(getUnitType('VANITY3'));
  assert.equal(hung.legs, false);
  assert.equal(hung.plinth, false);
  assert.equal(hung.mount, 'wall');
  assert.equal(hung.vanity, true);
  assert.equal(hungTypeOf(getUnitType('VANITY3')), hung);
  assert.equal(UNIT_TYPES.VANITY3.mount, 'floor', 'the kit itself is untouched');
});

// ═══ 2 · F13 · HOW IT STANDS: THE ENGINE ═════════════════════════════════════

test('F13 · on the floor: its legs and the house plinth, as every base unit', () => {
  for (const id of VANITIES) {
    assert.ok(UNIT_TYPES[id], `${id} is not a kit (F9)`);
    const r = computeCabinet({ ...defaultParamsFor(id, P), plinth: true }, P);
    assert.equal(r.assemblies.mount, 'floor');
    assert.ok(partsOf(r).includes('PLINTH'), `${id}: the plinth is not cut`);
    assert.ok(hwOf(r, 'legs')?.qty > 0, `${id}: no legs`);
    // The house's toe kick (a bare kit: the profile's), which is the LISP's `vanityPlinth` 100.
    assert.equal(r.assemblies.carcass.legHeight, P.baseUnit.legHeight);
    assert.equal(P.vanity.defaults.plinth, P.baseUnit.legHeight);
    assert.equal(hwOf(r, 'vanity_hangers'), null, 'a standing vanity buys no hangers');
  }
});

test('F13 · floating: no legs, no plinth, hung at float_height_mm; the carcass is the same box', () => {
  for (const id of VANITIES) {
    const base = { ...defaultParamsFor(id, P), plinth: true };
    const floor = computeCabinet(base, P);
    const hung = computeCabinet({ ...base, floating: true, float_height_mm: 300 }, P);
    assert.equal(hung.assemblies.mount, 'wall', `${id}: a floating vanity hangs`);
    assert.equal(hung.assemblies.mountHeight, 300);
    assert.equal(hung.assemblies.carcass.legHeight, 0, 'no toe kick under a hung carcass');
    assert.equal(hung.assemblies.legs ?? null, null, 'no legs laid out');
    assert.equal(hwOf(hung, 'legs'), null, 'no legs in the hardware');
    assert.ok(!partsOf(hung).includes('PLINTH'), 'no plinth under a floating vanity, even with the flag stale');
    // How it stands is all that changed: every board of the carcass is cut as on the floor.
    assert.deepEqual(carcassOf(hung), carcassOf(floor));
    assert.deepEqual(hung.drills, floor.drills);
    // The height nobody typed is the profile's (PROPOSED 300).
    const unsaid = computeCabinet({ ...base, floating: true, float_height_mm: undefined }, P);
    assert.equal(unsaid.assemblies.mountHeight, FLOAT);
    // The flag is the gate: `floating: false` is the kit as it stands.
    assert.deepEqual(computeCabinet({ ...base, floating: false }, P).panels, floor.panels);
  }
});

test('F13 · the hangers: 2 cabinet hangers 50 kg with wall plate, on the top rail, the article the owner fills', () => {
  const base = { ...defaultParamsFor('VANITY3', P), floating: true, float_height_mm: 300 };
  const r = computeCabinet(base, P);
  const line = hwOf(r, 'vanity_hangers');
  assert.ok(line, 'a floating vanity buys no hangers');
  assert.equal(line.qty, HANGERS.perUnit);
  assert.equal(line.label, HANGERS.name, 'an empty article prints the name alone');
  assert.equal(line.spec.on, 'RAIL-TOP');
  assert.equal(line.spec_label, 'on the top rail', 'the line says where the hangers bite');
  assert.ok(partsOf(r).includes('RAIL-TOP'), 'the rail the hangers bite on is cut');
  // An article the owner filled travels with the line.
  const owned = computeCabinet(base, { ...P, vanity: { ...P.vanity, hangers: { ...HANGERS, article: 'ART-1' } } });
  assert.equal(hwOf(owned, 'vanity_hangers').spec_label, 'ART-1 · on the top rail');
  // The BOM knows the role: a registry row, and one merged hardware line for two vanities.
  assert.ok(PART_REGISTRY[HARDWARE_TO_PART_ID.vanity_hangers], 'the registry does not know the hangers');
  const entries = [1, 2].map((n) => {
    const params = { ...base, unit_num: `VU0${n}` };
    return { unit: { id: `u${n}`, type: 'VANITY3', params }, result: computeCabinet(params, P) };
  });
  const row = buildBom(entries, { profile: P }).hardware.find((h) => h.role === 'vanity_hangers');
  assert.ok(row, 'the hangers did not reach the BOM');
  assert.equal(row.qty, 2 * HANGERS.perUnit);
  assert.deepEqual([...row.units].sort(), ['VU01', 'VU02']);
});

// ═══ 3 · F13 · THE STORE: FLOOR OR FLOATING, AND THE ROOM ════════════════════

test('F13 · Floating in a room: the plinth goes, it hangs at 300, Check #6 is silent; back on the floor the plinth returns', () => {
  vanityJob();
  const id = S().addUnit('VANITY3').id;
  assert.equal(U(id).params.plinth, true, 'a standing vanity is born with its plinth, as every base unit');
  assert.ok(S().unitResult(id).panels.some((p) => p.part === 'PLINTH'));

  const res = S().setVanityFloating(id, true);
  assert.equal(res.ok, true, res.said);
  assert.equal(U(id).params.floating, true);
  assert.equal(U(id).params.float_height_mm, FLOAT);
  assert.equal(U(id).params.plinth, false, 'no plinth under a floating vanity');
  const r = S().unitResult(id);
  assert.equal(r.assemblies.mount, 'wall');
  assert.equal(r.assemblies.mountHeight, 300);
  assert.ok(!partsOf(r).includes('PLINTH'));
  assert.equal(hwOf(r, 'legs'), null);
  assert.equal(hwOf(r, 'vanity_hangers')?.qty, HANGERS.perUnit);
  assert.equal(S().runChecks().filter((f) => f.check === 6 && f.unitId === id).length, 0,
    '"standing on legs with no plinth" said of a vanity on the wall');
  assert.equal(S().addPlinth(id), false, 'a hung carcass takes no plinth');
  // The room reads the height it hangs at: the ceiling is 2500 less 300 over it.
  assert.equal(floorOf(U(id), P), 300);
  const tall = S().roomFitRefusalFor(id, { height: 2300 });
  assert.ok(tall, 'a 2300 carcass hung at 300 passed a 2500 room');
  assert.match(tall.message, /300 mm off the floor/);
  const { notices } = S().updateUnitParams(id, { height: 2300 });
  assert.ok(notices.some((n) => /2200/.test(n)), `the height clamp did not read the float: ${notices}`);
  S().updateUnitParams(id, { height: 600 });

  // The height field: typed, and refused in words where the room has no room.
  assert.equal(S().setVanityFloating(id, true, 450).ok, true);
  assert.equal(S().unitResult(id).assemblies.mountHeight, 450);
  const no = S().setVanityFloating(id, true, 2200);
  assert.equal(no.ok, false);
  assert.match(no.said, /2500 mm/, 'the refusal names the room');
  assert.match(no.said, /1900 mm is the highest it can hang/);
  assert.equal(U(id).params.float_height_mm, 450, 'a refusal moves nothing');
  assert.equal(S().setVanityFloating(id, true, -5).ok, false);

  // Back on the floor: its legs, the plinth as at birth.
  assert.equal(S().setVanityFloating(id, false).ok, true);
  assert.equal(U(id).params.floating, false);
  assert.equal(U(id).params.plinth, true);
  const back = S().unitResult(id);
  assert.equal(back.assemblies.mount, 'floor');
  assert.ok(partsOf(back).includes('PLINTH'));
  assert.ok(hwOf(back, 'legs')?.qty > 0);
  assert.equal(hwOf(back, 'vanity_hangers'), null);
});

test('F13 · Floating is the vanity\'s alone: any other kit is refused in words', () => {
  vanityJob();
  for (const type of ['BUD', 'BUDR']) {
    const id = S().addUnit(type).id;
    const no = S().setVanityFloating(id, true);
    assert.equal(no.ok, false);
    assert.match(no.said, /only a vanity unit floats/);
    assert.equal(U(id).params.floating, undefined);
  }
});

test('F13 · with the runs.js line (A3\'s patch): unitBase and unitTop read the float; the set draws the hung vanity', () => {
  vanityJob();
  const id = S().addUnit('VANITY3').id;
  const standing = unitBase(U(id), P);
  assert.ok(standing > 0);
  S().setVanityFloating(id, true, 300);
  assert.equal(unitBase(U(id), P), 300);
  assert.equal(unitTop(U(id), P), 300 + Number(U(id).params.height));
  const entries = S().units.map((u) => ({ unit: u, result: S().unitResult(u.id) }));
  const sheets = wallDrawingSheets({
    entries, project: S().project, room: S().project.room, profile: P, date: '25.10.2026', design: S().project.design,
  });
  const texts = sheets.flatMap((s) => (s.sheet?.entities || []).filter((e) => e.kind === 'text').map((e) => String(e.text)));
  assert.ok(texts.some((t) => t.includes(U(id).params.unit_num)), 'the vanity is not on the drawings');
  S().setVanityFloating(id, false);
  assert.equal(unitBase(U(id), P), standing);
});

// ═══ 4 · F13 · SAVE AND RELOAD ═══════════════════════════════════════════════

test('F13 · floating, its height, columns and sinks survive a save and a reload, cut for cut', () => {
  vanityJob();
  const id = S().addUnit('VANITY3').id;
  S().updateUnitParams(id, { columns: 2, sinks: 2 });
  S().setVanityFloating(id, true, 320);
  const cut = (r) => JSON.stringify({ panels: r.panels.map(({ id: pid, w, h, thickness, box }) => [pid, w, h, thickness, box]), hardware: r.hardware });
  const before = cut(S().unitResult(id));
  const saved = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
  S().newProject();
  S().loadProject(saved.project, saved.units);
  const back = U(id);
  assert.equal(back.type, 'VANITY3');
  assert.equal(back.params.columns, 2);
  assert.equal(back.params.sinks, 2);
  assert.equal(back.params.floating, true);
  assert.equal(back.params.float_height_mm, 320);
  assert.equal(back.params.plinth, false);
  assert.equal(S().unitResult(id).assemblies.mountHeight, 320);
  assert.equal(cut(S().unitResult(id)), before);
});

test('F13 · an old project (no `floating` key) opens standing, exactly as it was saved', () => {
  vanityJob();
  assert.ok(UNIT_TYPES.VANITY2, 'VANITY2 is not a kit (F9)');
  const id = S().addUnit('VANITY2').id;
  const saved = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
  const u = saved.units.find((x) => x.id === id);
  delete u.params.floating;
  delete u.params.float_height_mm;
  S().newProject();
  S().loadProject(saved.project, saved.units);
  const r = S().unitResult(id);
  assert.equal(r.assemblies.mount, 'floor');
  assert.ok(partsOf(r).includes('PLINTH'));
  assert.equal(hwOf(r, 'vanity_hangers'), null);
});
