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
import {
  BATHROOM_LIBRARY, KITCHEN_LIBRARY, WARDROBE_LIBRARY, flattenLibrary, resolveEntry,
} from '../src/engine/library.js';
import { categoryOf, getCategory } from '../src/engine/types.js';
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

// ═══ 5 · F14 · THE LIBRARY ROWS (F9's group): BATHROOM, IN BOTH LISTS ═══════

const familyOf = (id) => getUnitType(id)?.family;

// REWRITTEN BY T-CC1b F4.2: *"Add po lewej dobre, ale uporzadkowac: lazienki w kuchniach itd."*; *"po co blokowac wyspe w pokoju albo mala szafe w kuchni"* (the owner, 01.11.2026).
// The Bathroom rows are the entries of their OWN category now, and neither the Kitchen nor the
// Wardrobes list carries them; the rail shows every family to every job, so no filter is asked.
test('F14 · the Bathroom family: "Vanity unit, N drawers", its own category, in no other list', () => {
  {
    const group = { items: BATHROOM_LIBRARY };
    assert.equal(getCategory('bathroom').label, 'Bathroom');
    assert.equal(getCategory('bathroom').entries, BATHROOM_LIBRARY);
    // AMENDED BY T83 F5: the mirror cabinet joins the group beside the vanity, *"`MIRROR_CABINET`, family bathroom, library group Bathroom (beside the vanity), row "Mirror cabinet""* (CLAUDE.md T83 F2); *"Library rows in PRO's Kitchen and Wardrobe libraries under Bathroom"* (CLAUDE.md T83 F5).
    assert.deepEqual(group.items.map((i) => i.typeId), [...VANITIES, 'MIRROR_CABINET']);
    VANITIES.forEach((id, k) => {
      const row = group.items.find((i) => i.typeId === id);
      assert.equal(resolveEntry(row, P).enabled, true, `${id} is not placeable`);
      // One name for a kit (library.js: `label` left out is the type's own).
      assert.equal(row.label, undefined);
      assert.equal(getUnitType(id).label, `Vanity unit, ${k + 2} drawers`);
      assert.doesNotMatch(getUnitType(id).label, /[\u2013\u2014]/);
    });
  }
  // One family, one home: the Kitchen and the Wardrobes lists hold none of it.
  assert.deepEqual(KITCHEN_LIBRARY.map((e) => e.id), ['base-units', 'tall-units', 'wall-units', 'extras']);
  assert.equal(WARDROBE_LIBRARY.some((e) => e.id === 'bathroom'), false);
  for (const id of VANITIES) {
    assert.ok(getCategory('bathroom').types.includes(id), `${id} is not in bathroom`);
    for (const cat of ['kitchen', 'wardrobe']) assert.equal(getCategory(cat).types.includes(id), false, `${id} is still in ${cat}`);
  }
});

// REWRITTEN BY T-CC1b F4.3: the project filter is deleted (law 4); the Bathroom family is on the rail
// for every job, and its kits answer `categoryOf` 'bathroom'.
test('F14 · the bathroom is every job\'s: its own family on the rail, whatever the job', () => {
  for (const id of VANITIES) assert.equal(familyOf(id), 'bathroom');
  for (const id of VANITIES) assert.equal(categoryOf(id).id, 'bathroom');
  const ids = flattenLibrary(BATHROOM_LIBRARY).filter((e) => e.kind === 'type').map((e) => e.typeId);
  for (const id of VANITIES) assert.ok(ids.includes(id));
  // The library places one: the store's own road (addUnit), born on the floor, VU01.
  vanityJob('wardrobe');
  const id = S().addUnit('VANITY2').id;
  assert.equal(U(id).type, 'VANITY2');
  assert.equal(U(id).params.unit_num, 'VU01');
});

// ═══ 6 · F14 · THE RIGHT PANEL ═══════════════════════════════════════════════

test('F14 · the Vanity section: Drawers 2/3/4, Basins 0/1/2, Floor / Floating with its height; Columns and Equal on every drawer-column kit', () => {
  const src = read('src/components/RightPanel.jsx');
  assert.match(src, /title="Vanity"/);
  assert.match(src, /\{type\.vanity && \(/, 'the section is the vanity\'s alone');
  for (const hook of ['data-vanity-drawers', 'data-vanity-sinks', 'data-vanity-mount', 'data-vanity-float-height',
    'data-drawer-columns', 'data-drawer-heights-equal', 'data-vanity-plinth-floating']) {
    assert.match(src, new RegExp(hook), `${hook} is not in the panel`);
  }
  assert.match(src, /\[2, 3, 4\]\.map/);
  assert.match(src, /\[0, 1, 2\]\.map/);
  assert.match(src, /\[1, 2\]\.map/);
  assert.match(src, /setVanityDrawers\(unit\.id, n\)/);
  assert.match(src, /setVanityFloating\(unit\.id, key === 'floating'\)/);
  assert.match(src, /setVanityFloating\(unit\.id, true, v\)/);
  assert.match(src, /updateUnitParams\(unit\.id, \{ sinks: n \}\)/);
  assert.match(src, /updateUnitParams\(unit\.id, \{ columns: n \}\)/);
  assert.match(src, /setDrawersEqual\(unit\.id\)/);
  assert.match(src, />\s*Equal\s*</, 'no "Equal" button');
  // The Columns row and Equal are asked of the TYPE's key, so the chest has them too.
  assert.match(src, /const drawerColumnsKit = Boolean\(type\?\.drawerColumns\)/);
  // The numbers are the profile's and the kit's: the panel types none.
  assert.doesNotMatch(src, /float_height_mm:\s*\d/);
  assert.doesNotMatch(src, /setVanityFloating\(unit\.id, true, \d/);
});

test('F14 · Drawers 2 / 3 / 4 swaps the kit and keeps the unit: its place, its size, its choices', () => {
  vanityJob();
  const id = S().addUnit('VANITY3').id;
  S().updateUnitParams(id, { columns: 2, sinks: 1 });
  S().setVanityFloating(id, true, 350);
  const top = U(id).params.sections[0].items.find((i) => i.kind === 'drawer');
  S().setDrawerHeight(id, top.id, 230);
  const before = U(id);
  const res = S().setVanityDrawers(id, 4);
  assert.equal(res.ok, true, res.said);
  const after = U(id);
  assert.equal(after.id, before.id);
  assert.equal(after.type, 'VANITY4');
  assert.equal(after.params.type, 'VANITY4');
  assert.deepEqual(after.position, before.position);
  for (const k of ['width', 'height', 'depth', 'columns', 'sinks', 'floating', 'float_height_mm', 'unit_num', 'wall_gap']) {
    assert.deepEqual(after.params[k], before.params[k], `${k} was lost on the swap`);
  }
  assert.equal(after.params.drawer_heights, null, 'the new count starts equal');
  assert.equal(after.params.sections[0].items.filter((i) => i.kind === 'drawer').length, 4);
  const fronts = S().unitResult(id).derived.front_heights;
  assert.equal(fronts.length, 4);
  assert.ok(Math.max(...fronts) - Math.min(...fronts) <= 1, `VANITY4 is not equal: ${fronts}`);
  assert.equal(S().unitResult(id).assemblies.mountHeight, 350, 'it stopped hanging on the swap');
  assert.equal(S().setVanityDrawers(id, 5).ok, false, '5 is not a vanity kit');
  assert.equal(U(id).type, 'VANITY4');
  const bud = S().addUnit('BUD').id;
  const no = S().setVanityDrawers(bud, 3);
  assert.equal(no.ok, false);
  assert.match(no.said, /only a vanity unit/);
  assert.equal(U(bud).type, 'BUD');
});

test('F14 · Equal: the heights typed by hand go, the equal split comes back; an old chest cut 4:3:2 is made equal', () => {
  vanityJob();
  const id = S().addUnit('VANITY3').id;
  const equal = S().unitResult(id).derived.front_heights;
  assert.equal(equal.length, 3);
  assert.ok(Math.max(...equal) - Math.min(...equal) <= 1, `the vanity is not born equal: ${equal}`);
  const top = U(id).params.sections[0].items.find((i) => i.kind === 'drawer');
  S().setDrawerHeight(id, top.id, equal[0] + 40);
  const typed = S().unitResult(id).derived.front_heights;
  assert.notDeepEqual(typed, equal, 'the typed height did nothing');
  assert.equal(S().setDrawersEqual(id), true);
  assert.equal(U(id).params.drawer_heights, null);
  assert.equal(U(id).params.drawer_split, 'equal');
  assert.deepEqual(S().unitResult(id).derived.front_heights, equal);

  // The chest: an old project's CHEST3 (no `drawer_split`) is the kit's 4:3:2; Equal makes it equal.
  vanityJob('wardrobe');
  const c = S().addUnit('WARDROBE_CHEST3').id;
  const saved = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
  delete saved.units.find((u) => u.id === c).params.drawer_split;
  S().newProject();
  S().loadProject(saved.project, saved.units);
  const old = S().unitResult(c).derived.front_heights;
  assert.ok(Math.max(...old) - Math.min(...old) > 1, `the old chest was already equal: ${old}`);
  assert.equal(S().setDrawersEqual(c), true);
  const now = S().unitResult(c).derived.front_heights;
  assert.ok(Math.max(...now) - Math.min(...now) <= 1, `Equal did not make the chest equal: ${now}`);
  // Any other kit keeps its own split: Equal is refused.
  const budr = S().addUnit('BUDR').id;
  assert.equal(S().setDrawersEqual(budr), false);
  assert.equal(U(budr).params.drawer_split, undefined);
});

// ═══ 7 · F13, AFTER THE REVIEW: THE END PANEL SAYS WHERE IT ENDS ═════════════
//
// The review of PART B (verify:panelfloat:1): a floating vanity's end panel is
// cut by the engine to END WITH THE CABINET (the kit hung, `hungTypeOf`: a
// wall unit's panel overrules a stored 'floor'), and the right panel's End
// panels row read 'to floor', because it asked `endPanelDrop` with the kit as
// it stands. The row's own rule (Turn 13): a label that disagrees with the
// piece is worse than no label. One law, one path: the row asks
// `autoparts.unitEndPanelDrop`, which resolves the kit and its height as
// `computeCabinet` does, and the label and the cut agree.

test('F13 · after the review: the End panels row and the engine agree, standing and floating', async () => {
  const { unitEndPanelDrop } = await import('../src/engine/autoparts.js');
  vanityJob();
  const id = S().addUnit('VANITY3').id;
  const added = S().addEndPanel(id, { side: 'L' });
  assert.ok(!added?.error, added?.error);
  const end = () => S().unitResult(id).panels.find((p) => p.part === 'END-PANEL');
  const ep = () => U(id).params.end_panels[0];
  // Standing: the panel runs to the floor, and the row says so.
  assert.ok(end().box.y < 0, 'a standing vanity\'s end panel does not reach the floor');
  assert.ok(unitEndPanelDrop(U(id), ep(), P) > 0);
  // Floating at 300: the engine cuts it to end with the carcass; the row's drop is 0 too.
  S().setVanityFloating(id, true, 300);
  assert.equal(end().box.y, 0, 'the engine no longer cuts it to end with the carcass');
  assert.equal(unitEndPanelDrop(U(id), ep(), P), 0, 'the row would still say "to floor"');
  // The same answer the engine builds from, on every unit: a wall unit, a base unit.
  for (const kit of ['WUD', 'BUD']) {
    vanityJob();
    const other = S().addUnit(kit).id;
    assert.ok(!S().addEndPanel(other, { side: 'L' })?.error);
    const otherEnd = S().unitResult(other).panels.find((p) => p.part === 'END-PANEL');
    assert.equal(unitEndPanelDrop(U(other), U(other).params.end_panels[0], P) > 0, otherEnd.box.y < 0, kit);
  }
  // The panel's row reads the one function, never `endPanelDrop` with the standing kit.
  const src = read('src/components/RightPanel.jsx');
  const rows = src.slice(src.indexOf('function EndPanels('), src.indexOf('function contentsBadge('));
  assert.match(rows, /unitEndPanelDrop\(unit, ep, profile\) > 0 \? 'to floor' : 'ends with the cabinet'/);
  assert.doesNotMatch(rows, /endPanelDrop\(\{/, 'the row still asks the standing kit');
});
