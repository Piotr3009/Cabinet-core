/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T82 · F9 · THE CHEST OF DRAWERS TAKES THE VANITY'S TWO RULES ───────────
//
// CLAUDE.md T82 F9: *"The chest of drawers of the wardrobe family
// (`WARDROBE_CHEST2/3/4`, T75 F16) takes the same two rules (*"7 - tak"*):
// equal overlay drawers by default and `columns: 2`; no basin, no void, no
// rails: its back stays (the chest is a bedroom piece)."* and *"the chest's
// `columns: 2` is a parameter on the existing chest kits, their goldens held
// at columns 1."*  The rule is KIT_VANITY.lsp's own columns section (F8, *"external
// drawers ale wybor 2 rows, patrz szafa"*): a DIVIDER mid-width, a stack of
// 2, 3 or 4 equal overlay drawers in each column, the one board over both
// (for the chest: its own TOP).
//
// THE PROBE THIS FILE STARTS FROM (the T75 F16 engine as it stands on the F0
// commit): WARDROBE_CHEST2 splits [1, 1] (exact), WARDROBE_CHEST4 [1, 1, 1, 1]
// (exact), and WARDROBE_CHEST3 is KIT_BUDR_FULL's own 4:3:2 (284 / 213 / 142
// at 647, 1 mm over: BLOCKERS #64), which is what
// `fixtures/golden-wardrobe-chest.json` pins. So "equal by default" can not
// be an engine default (FROZEN 1: a bare computeCabinet of the golden's params
// is the LISP); it is the answer a chest is BORN with in a project (the T48 F3
// law of the plinth: `projectStore.newUnit`, never `defaultParamsFor`), the
// param `drawer_split: 'equal'`, which the engine reads only when present.

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor, UNIT_TYPES } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { buildBom } from '../src/engine/bom.js';
import { hardwareInstances, hardwareCounts } from '../src/engine/hardware3d.js';
import { buildUnitDxfFiles } from '../src/engine/cnc/dxf.js';
import { wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { partDisplayName } from '../src/engine/partNumbers.js';
import { rectCorners } from '../src/engine/room.js';
import { wallGapOf } from '../src/engine/runs.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import { setWardrobeEndPanelAuto } from '../src/engine/endPanelAuto.js';
import { goldenOf } from '../scripts/t75-golden.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();
const U = (id) => S().units.find((u) => u.id === id);
const CHESTS = [['WARDROBE_CHEST2', 'BUDR2', 2], ['WARDROBE_CHEST3', 'BUDR', 3], ['WARDROBE_CHEST4', 'BUDR4', 4]];
const B = P.baseDrawerUnit;
const G = P.board.thickness;

const kit = (id, extra = {}) => ({ ...defaultParamsFor(id, P), unit_num: '01', ...extra });
const fronts = (r) => r.panels.filter((x) => x.role === 'front');
const parts = (r, part) => r.panels.filter((x) => x.part === part);
const divider = (r) => r.panels.filter((x) => x.id === 'DIVIDER');
const spread = (hs) => Math.max(...hs) - Math.min(...hs);

/** A wardrobe job on a 4 x 3 m room, as T75 F16's test stands it. */
function wardrobeJob() {
  setWardrobeEndPanelAuto(true);
  useUiStore.getState().clearSelection?.();
  S().newProject('Chest', { design: { projectType: 'wardrobe' } });
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
}

test.after(() => setWardrobeEndPanelAuto(false));

// ═══ 1 · THE PROBE, AND WHY THE DEFAULT IS WRITTEN AT BIRTH ═════════════════

test('F9 chest · PROBE: today CHEST2 and CHEST4 are equal, CHEST3 is the kit\'s 4:3:2 the golden pins', () => {
  const at = (id) => computeCabinet(kit(id), P).derived.front_heights;
  assert.deepEqual(at('WARDROBE_CHEST2'), [321, 320]);
  assert.deepEqual(at('WARDROBE_CHEST4'), [159, 159, 159, 158]);
  assert.deepEqual(at('WARDROBE_CHEST3'), [284, 213, 142], 'the T75 golden\'s 4:3:2');
  const g = JSON.parse(read('fixtures/golden-wardrobe-chest.json'));
  assert.equal(g.params.type, 'WARDROBE_CHEST3');
  assert.equal(g.params.drawer_split, undefined, 'the golden names no split: the engine\'s default is its 4:3:2');
  assert.equal(g.params.columns, undefined);
  // defaultParamsFor is the goldens' contract (T48 F3): it carries neither key.
  for (const [id] of CHESTS) {
    const d = defaultParamsFor(id, P);
    assert.equal(Object.hasOwn(d, 'drawer_split'), false, `${id}: defaultParamsFor gained drawer_split`);
    assert.equal(Object.hasOwn(d, 'columns'), false, `${id}: defaultParamsFor gained columns`);
  }
});

// ═══ 2 · FROZEN 1: THE GOLDENS AT COLUMNS 1 HOLD ════════════════════════════

test('F9 chest · golden-wardrobe-chest.json byte for byte; columns 1 and an absent split are the same cut', () => {
  const g = JSON.parse(read('fixtures/golden-wardrobe-chest.json'));
  assert.deepEqual(goldenOf(g.params, P), g.expected);
  assert.deepEqual(goldenOf({ ...g.params, columns: 1 }, P), g.expected, 'columns 1 moved the golden');
  assert.deepEqual(goldenOf({ ...g.params, drawer_split: null }, P), g.expected, 'a null split moved the golden');
  // T75 F16's law stands at columns 1: each chest is its BUDR hole for hole.
  for (const [id, parent] of CHESTS) {
    const r = goldenOf(kit(id, { columns: 1 }), P);
    const q = goldenOf({ ...kit(parent), width: 800, height: 647, depth: 568 }, P);
    assert.deepEqual(r.drills, q.drills, `${id} at columns 1 is not ${parent} hole for hole`);
    assert.deepEqual(r.panels.map((x) => [x.part, x.w, x.h]), q.panels.map((x) => [x.part, x.w, x.h]));
  }
});

test('F9 chest · columns 2 on a kit that is not a chest (or the vanity) changes nothing', () => {
  for (const id of ['BUDR', 'BUDR2', 'BUDR4', 'WARDROBE']) {
    assert.deepEqual(goldenOf(kit(id, { columns: 2 }), P), goldenOf(kit(id), P), `${id} took columns`);
    assert.deepEqual(goldenOf(kit(id, { drawer_split: 'equal' }), P), goldenOf(kit(id), P), `${id} took the split`);
  }
});

// ═══ 3 · EQUAL BY DEFAULT: THE CHEST IS BORN EQUAL ══════════════════════════

test('F9 chest · drawer_split equal: equal fronts that fill the face exactly (CHEST3 at 647: 213 / 213 / 212)', () => {
  for (const [id, , n] of CHESTS) {
    const r = computeCabinet(kit(id, { drawer_split: 'equal' }), P);
    const hs = r.derived.front_heights;
    assert.equal(hs.length, n);
    assert.ok(spread(hs) <= 1, `${id}: ${hs.join(' / ')} is not equal`);
    assert.equal(hs.reduce((s, h) => s + h, 0), 647 - n * B.gap, `${id}: the stack does not fill the face`);
    assert.ok(!r.warnings.some((w) => /DRAWER_FRONTS/.test(w.code)), `${id} does not fill its face`);
  }
  assert.deepEqual(computeCabinet(kit('WARDROBE_CHEST3', { drawer_split: 'equal' }), P).derived.front_heights, [213, 213, 212]);
  // CHEST2 and CHEST4 were equal already: the split is the same cut, byte for byte.
  for (const id of ['WARDROBE_CHEST2', 'WARDROBE_CHEST4']) {
    assert.deepEqual(goldenOf(kit(id, { drawer_split: 'equal' }), P), goldenOf(kit(id), P), `${id} moved under the equal split`);
  }
});

test('F9 chest · born in a project: drawer_split equal and columns 1, from the library, beside a wardrobe and alone', () => {
  wardrobeJob();
  const w = S().addUnit('WARDROBE', { params: { width: 1000 } }).id;
  for (const [id, , n] of CHESTS) {
    const res = S().addUnit(id, { near: w, side: 'right' });
    assert.ok(res.id, res.error);
    const c = U(res.id);
    assert.equal(c.params.drawer_split, 'equal', `${id} was not born equal`);
    assert.equal(c.params.columns, 1, `${id} was not born at one column`);
    const hs = S().unitResult(res.id).derived.front_heights;
    assert.equal(hs.length, n);
    assert.ok(spread(hs) <= 1, `${id} born ${hs.join(' / ')}`);
    S().removeUnit(res.id);
  }
  // A BUDR born in a kitchen keeps the kit's own split: the rule is the chest's.
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const b = S().addUnit('BUDR').id;
  assert.equal(U(b).params.drawer_split, undefined, 'a kitchen BUDR was born with the chest\'s split');
});

test('F9 chest · an old project\'s CHEST3 (no split saved) reloads at the 4:3:2 it was cut to', () => {
  wardrobeJob();
  const c = S().addUnit('WARDROBE_CHEST3').id;
  const saved = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
  for (const u of saved.units) { delete u.params.drawer_split; delete u.params.columns; }
  S().newProject();
  S().loadProject(saved.project, saved.units);
  assert.deepEqual(S().unitResult(c).derived.front_heights, [284, 213, 142], 'a saved chest changed its cut on reload');
});

// ═══ 4 · COLUMNS 2: A DIVIDER AND TWICE THE BOXES ═══════════════════════════

test('F9 chest · columns 2: one DIVIDER mid-width, bottom to top, the sides\' depth (KIT_VANITY.lsp D11)', () => {
  for (const [id, , n] of CHESTS) {
    const r = computeCabinet(kit(id, { columns: 2, drawer_split: 'equal' }), P);
    const div = divider(r);
    assert.equal(div.length, 1, `${id}: ${div.length} dividers`);
    const side = r.panels.find((x) => x.id === 'BUL');
    const d = div[0];
    // The house's vertical partition: the room, the CNC frame, the sticker and the joints are its roads.
    assert.equal(d.part, 'VPART');
    assert.equal(d.thickness, G);
    assert.deepEqual(d.box, { x: (800 - G) / 2, y: G, z: G, w: G, h: 647 - 2 * G, d: 568 - G }, 'the LISP\'s 18 x 611 x 550 at x 391');
    assert.equal(d.box.d, side.box.d, 'the divider is not the runners\' full-depth wall');
    assert.equal(d.meta.locked, true, 'the divider belongs to the columns');
    // Both columns' runner rows, on its two faces: the BUL pattern and the BUR pattern.
    const holes = r.drills.filter((x) => x.panel === d.id && x.kind === 'runner');
    const per = P.wardrobe.runners.holeXPattern.length;
    assert.equal(holes.length, 2 * n * per, `${id}: ${holes.length} runner holes on the divider`);
    const xs = [...new Set(holes.map((x) => x.x))].sort((a, b) => a - b);
    const pat = P.wardrobe.runners.holeXPattern;
    assert.deepEqual(xs, [...pat, ...pat.map((px) => d.box.d - px)].sort((a, b) => a - b));
    const bul = r.drills.filter((x) => x.panel === 'BUL' && x.kind === 'runner').map((x) => x.y);
    assert.deepEqual([...new Set(holes.map((x) => x.y + d.box.y))].sort((a, b) => a - b), [...new Set(bul)].sort((a, b) => a - b),
      'the divider\'s rows are not the sides\' rows');
    // Its head and foot are jointed as the house's divider (CHAT FIX 17.10.2026).
    const joints = r.derived.dividerJoints.filter((j) => j.divider === 'DIVIDER');
    assert.deepEqual(joints.map((j) => [j.end, j.receiver]), [['foot', 'BOTTOM'], ['head', 'TOP']]);
  }
});

test('F9 chest · columns 2 is the LISP\'s worked example: CHEST3 800 x 647 x 568, equal, two columns', () => {
  const r = computeCabinet(kit('WARDROBE_CHEST3', { columns: 2, drawer_split: 'equal' }), P);
  const f = fronts(r).map((x) => [x.id, x.box.x, x.box.y, x.w, x.h]);
  assert.deepEqual(f, [
    ['01-Z1D1-F', 1.5, 0, 397, 213], ['01-Z1D2-F', 1.5, 216, 397, 213], ['01-Z1D3-F', 1.5, 432, 397, 212],
    ['01-Z2D1-F', 401.5, 0, 397, 213], ['01-Z2D2-F', 401.5, 216, 397, 213], ['01-Z2D3-F', 401.5, 432, 397, 212],
  ]);
  assert.deepEqual(r.derived.column_openings.map((o) => o.w), [373, 373], 'the openings 373 each');
  // The boxes: the opening less 10 at the opening + 5, the walls less 2 GB, the bottom 13 longer.
  const z1 = r.panels.find((x) => x.id === 'Z1D1-SL');
  const z2 = r.panels.find((x) => x.id === 'Z2D1-SL');
  assert.equal(z1.box.x, 23);
  assert.equal(z2.box.x, 414);
  assert.equal(r.panels.find((x) => x.id === 'Z1D1-SR').box.x + G, 23 + 363);
  assert.equal(r.panels.find((x) => x.id === 'Z1D1-BF').w, 363 - 2 * G);
  assert.equal(r.panels.find((x) => x.id === 'Z1D1-DNO').w, 363 - 2 * G + B.bottomOversize);
  // The front screws keep their distance from their OWN box side.
  const screws = (pid) => r.panels.find((x) => x.id === pid).cnc.holes.filter((h) => h.kind === 'front_screw').map((h) => h.x);
  assert.deepEqual(screws('01-Z1D2-F'), [89.5, 316.5]);
  assert.deepEqual(screws('01-Z2D2-F'), [80.5, 307.5]);
  assert.ok(!r.warnings.some((w) => /DRAWER_FRONTS|DRAWER_BOX/.test(w.code)), r.warnings.map((w) => w.code).join(' '));
});

test('F9 chest · columns 2: a stack in each column, equal, mirrored, inside its column', () => {
  for (const [id, , n] of CHESTS) {
    const r = computeCabinet(kit(id, { columns: 2, drawer_split: 'equal' }), P);
    const f = fronts(r);
    assert.equal(f.length, 2 * n, `${id}: ${f.length} fronts`);
    assert.equal(parts(r, 'DRAWER-SIDE').length, 4 * n, `${id}: box sides`);
    assert.equal(parts(r, 'DRAWER-BOX-FRONT').length, 2 * n);
    assert.equal(parts(r, 'DRAWER-BOX-BACK').length, 2 * n);
    assert.equal(parts(r, 'DRAWER-BOTTOM').length, 2 * n);
    // Equal heights, two equal widths a row, the gap between them the stack's.
    assert.ok(spread(f.map((x) => x.h)) <= 1, `${id}: unequal fronts`);
    const widths = [...new Set(f.map((x) => x.w))];
    assert.equal(widths.length, 1, `${id}: the columns' fronts differ in width`);
    assert.equal(2 * widths[0] + B.gap, 800 - B.frontWidthDeduction, `${id}: front ${widths[0]} does not share the face`);
    const left = f.filter((x) => x.box.x + x.box.w / 2 < 400);
    const right = f.filter((x) => x.box.x + x.box.w / 2 > 400);
    assert.equal(left.length, n);
    assert.equal(right.length, n);
    assert.deepEqual(left.map((x) => x.box.y).sort((a, b) => a - b), right.map((x) => x.box.y).sort((a, b) => a - b), 'the columns do not line up');
    // Every box stands in its own column: clear of the divider and the sides.
    const div = divider(r)[0];
    for (const s of parts(r, 'DRAWER-SIDE')) {
      const inLeft = s.box.x >= G && s.box.x + s.box.w <= div.box.x;
      const inRight = s.box.x >= div.box.x + G && s.box.x + s.box.w <= 800 - G;
      assert.ok(inLeft || inRight, `${id}: ${s.id} crosses the divider (x ${s.box.x})`);
    }
  }
});

test('F9 chest · columns 2: the back stays, no rails, no void, no basin', () => {
  for (const [id] of CHESTS) {
    const r = computeCabinet(kit(id, { columns: 2, drawer_split: 'equal', sinks: 1 }), P);
    const back = parts(r, 'BACK');
    assert.equal(back.length, 1, `${id}: the back went`);
    assert.equal(back[0].w, 800);
    assert.equal(back[0].h, 647);
    assert.equal(r.panels.filter((x) => /^RAIL-(TOP|BOTTOM)$/.test(x.part) || /^RAIL-(TOP|BOTTOM)$/.test(x.id)).length, 0,
      `${id} took the vanity's rails`);
    // No trap U: every box back is whole (the vanity's U cuts it as {tag}-BB-1 .. k + 1).
    assert.equal(r.panels.filter((x) => /-BB-\d+$/.test(x.id)).length, 0, `${id} took a trap cut`);
    assert.equal(parts(r, 'DRAWER-BOX-BACK').length, 2 * Number(id.slice(-1)));
  }
  // No void: a chest stands at the wall clearance a BUDR stands at.
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const b = S().addUnit('BUDR').id;
  const budrGap = wallGapOf(U(b), P);
  wardrobeJob();
  const c2 = S().addUnit('WARDROBE_CHEST3').id;
  S().updateUnitParams(c2, { columns: 2 });
  assert.equal(wallGapOf(U(c2), P), budrGap, 'the chest took a service void');
});

test('F9 chest · columns 2 in the BOM: a runner pair and a sync rod per box', () => {
  wardrobeJob();
  const c = S().addUnit('WARDROBE_CHEST3').id;
  S().updateUnitParams(c, { columns: 2 });
  const entries = S().units.map((u) => ({ unit: u, result: S().unitResult(u.id) }));
  const bom = buildBom(entries, { design: S().project.design, profile: P, room: S().project.room });
  const qty = (role) => bom.hardware.filter((h) => h.role === role).reduce((s, h) => s + (Number(h.qty) || 0), 0);
  assert.equal(qty('runner_pairs'), 6);
  assert.equal(qty('runner_sync_rods'), 6);
  // The rod is a COLUMN's: Blum's threshold on the 373 opening, the box 363 less the adapters.
  const rod = S().unitResult(c).hardware.find((h) => h.role === 'runner_sync_rods');
  assert.equal(rod.spec.opening_mm, 373);
});

test('F9 chest · columns 2 in the room: a runner pair under every box, on its own column\'s walls', () => {
  const r = computeCabinet(kit('WARDROBE_CHEST3', { columns: 2, drawer_split: 'equal' }), P);
  const hw = hardwareInstances(r, P);
  assert.equal(hw.runners.length, hardwareCounts(r).runners, 'the picture and the order form disagree');
  assert.equal(hw.runners.length, 12);
  const div = divider(r)[0];
  for (const run of hw.runners) {
    const left = run.x <= div.box.x;
    const box = parts(r, 'DRAWER-SIDE').filter((s) => (left ? s.box.x < div.box.x : s.box.x > div.box.x));
    const lo = Math.min(...box.map((s) => s.box.x));
    const hi = Math.max(...box.map((s) => s.box.x + s.box.w));
    assert.ok(run.x === lo || run.x === hi, `a runner at x ${run.x} is not on its column's box (${lo} .. ${hi})`);
  }
  assert.equal(hw.rods.length, 6, 'a rod per box');
  // One column: the instances are what they were (the same box faces, the same count).
  const one = computeCabinet(kit('WARDROBE_CHEST3'), P);
  assert.deepEqual(hardwareInstances(one, P).runners.map((x) => [x.side, x.x]),
    [[ 'L', 23 ], [ 'R', 777 ], [ 'L', 23 ], [ 'R', 777 ], [ 'L', 23 ], [ 'R', 777 ]]);
});

test('F9 chest · columns 2, the whole road: no fault, the cut list, the CNC file of the divider, the drawing set', () => {
  wardrobeJob();
  const w = S().addUnit('WARDROBE', { params: { width: 1000 } }).id;
  const c = S().addUnit('WARDROBE_CHEST3', { near: w, side: 'right' }).id;
  S().updateUnitParams(c, { columns: 2 });
  const r = S().unitResult(c);
  assert.deepEqual(r.warnings.map((x) => x.code), [], 'the engine said something about two columns');
  const faults = S().runChecks().filter((f) => f.level === 'red' || /overlap|collid/i.test(f.message || ''));
  assert.deepEqual(faults.map((f) => f.message), [], 'the Check found a fault');
  const entries = S().units.map((u) => ({ unit: u, result: S().unitResult(u.id) }));
  const bom = buildBom(entries, { design: S().project.design, profile: P, room: S().project.room });
  const rows = bom.units.find((u) => u.unitNum === 'WC01').rows;
  assert.ok(rows.some((x) => x.id === 'DIVIDER'), 'the divider is not on the cut list');
  assert.equal(partDisplayName(divider(r)[0]), 'DIVIDER', 'the sticker');
  assert.equal(rows.filter((x) => x.part === 'DRAWER-FRONT').length, 6);
  const files = buildUnitDxfFiles(r, P);
  const dv = files.find((f) => f.panelId === 'DIVIDER');
  assert.ok(dv, 'no CNC file for the divider');
  assert.equal((dv.dxf.match(/RUNNERS_3MM/g) || []).length - 1, 18, 'the divider\'s 18 runner holes are not in its file');
  const sheets = wallDrawingSheets({ entries, project: S().project, room: S().project.room, profile: P, date: '25.10.2026', design: S().project.design });
  assert.ok(sheets.length > 0, 'the set refused the job');
});

test('F9 chest · the room refuses in words: a chest with no room for two columns of boxes is cut in one', () => {
  const r = computeCabinet(kit('WARDROBE_CHEST2', { width: 140, columns: 2, drawer_split: 'equal' }), P);
  const said = r.warnings.find((x) => x.code === 'DRAWER_COLUMNS_REFUSED');
  assert.ok(said, 'refused without a word');
  assert.match(said.message, /One column is cut/);
  assert.equal(divider(r).length, 0);
  assert.equal(fronts(r).length, 2);
  // A double row is not cut in two columns: said, and one box a column.
  const d = computeCabinet(kit('WARDROBE_CHEST3', { columns: 2, drawer_split: 'equal', drawer_double: { 1: true } }), P);
  assert.ok(d.warnings.some((x) => x.code === 'DOUBLE_DRAWER_REFUSED' && /two drawer columns/.test(x.message)));
  assert.equal(parts(d, 'DRAWER-SIDE').length, 12);
});

test('F9 chest · columns 2 survives a save and a reload, cut for cut', () => {
  wardrobeJob();
  const c = S().addUnit('WARDROBE_CHEST4').id;
  S().updateUnitParams(c, { columns: 2 });
  const before = JSON.stringify(goldenOf({ ...U(c).params, type: U(c).type }, P));
  const saved = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
  S().newProject();
  S().loadProject(saved.project, saved.units);
  assert.equal(U(c).params.columns, 2);
  assert.equal(U(c).params.drawer_split, 'equal');
  assert.equal(JSON.stringify(goldenOf({ ...U(c).params, type: U(c).type }, P)), before);
  assert.equal(divider(S().unitResult(c)).length, 1);
});

// ═══ 5 · LISP IS LAW, AND THE NEW GOLDENS ═══════════════════════════════════

test('F9 chest · the columns rule is KIT_VANITY.lsp\'s own section, and the engine cites it', () => {
  assert.ok(existsSync(`${ROOT}reference/lisp/KIT_VANITY.lsp`), 'KIT_VANITY.lsp is not written yet (B1, F8)');
  const lsp = read('reference/lisp/KIT_VANITY.lsp');
  assert.match(lsp, /columns/i);
  assert.match(lsp, /DIVIDER/);
  assert.match(lsp, /WARDROBE_CHEST|chest/i, 'the columns section does not say the chest takes it');
  const src = read('src/engine/cabinet.js');
  assert.match(src, /KIT_VANITY\.lsp[^\n]*columns|columns[^\n]*KIT_VANITY\.lsp/i, 'the chest\'s columns hunk does not cite its LISP');
  for (const [id] of CHESTS) assert.equal(UNIT_TYPES[id].lisp, 'KIT_BUDR_FULL.lsp', `${id}: the chest is still its BUDR`);
});

test('F9 chest · the new goldens at columns 2 hold byte for byte (verify/t82/goldens)', () => {
  for (const n of [2, 3, 4]) {
    const file = `verify/t82/goldens/golden-wardrobe-chest${n}-columns2.json`;
    assert.ok(existsSync(`${ROOT}${file}`), `${file} is not written`);
    const g = JSON.parse(read(file));
    assert.equal(g.params.type, `WARDROBE_CHEST${n}`);
    assert.equal(g.params.columns, 2);
    assert.equal(g.params.drawer_split, 'equal');
    assert.deepEqual(goldenOf(g.params, P), g.expected, `${file} moved`);
  }
});
