/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T79 F3 · INTERNAL DRAWERS: 1 OR 2 COLUMNS ──────────────────────────────
//
// The owner, 18.10.2026: *"wstawianie szuflad w szafie działa super z
// diverterem ale muszę wstawić diverter z półką fix, a nie powinno być tak że
// diverter powinien się wstawiać sam jak wybieramy ile kolumn szuflad
// wstawiamy 1 czy 2?"*; 14:17: *"jak ustawiamy sobie teraz 3 szuflady internal
// to niech pyta czy chcesz 1 czy 2 kolumny, coś jak baye."*; the mockup
// (verify/t79/mockup-03-drawer-columns.png), 14:45: *"2 - tak."*
//
// This turn's law: a vertical divider stands ON the board that crowns a drawer
// stack and never passes through the boxes. The probe (verify/t79/f03-probe.md)
// is held here as the NEW law: rows 1 to 6 (the full-width stack) and rows 7
// to 13 (the columns).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { setPersistence } from '../src/stores/persistence.js';
import { DRAWER_COLUMNS_DIVIDED, useProjectStore, validateUnit } from '../src/stores/projectStore.js';
import {
  flushHistory, unwatchProjectHistory, useHistoryStore, watchProjectHistory,
} from '../src/stores/historyStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { buildUnitDxfFiles } from '../src/engine/cnc/dxf.js';
import { exportGate } from '../src/engine/cnc/exportGate.js';
import { exportReadiness } from '../src/lib/cncExport.js';
import { confirmDrawerBox } from './drawer-box-gate.js';

setPersistence('none');
const ROOT = new URL('../', import.meta.url);
const read = (rel) => readFileSync(new URL(rel, ROOT), 'utf8');
const G = P.board.thickness;
const H = 2150;

// ─── THE ENGINE: the probe's four cases, bare (no store key) ───────────────

/** The probe's WARDROBE 1200 with a divider at 591: `perColumn` stacks by zone, `fullWidth` zone-null drawers. */
function wardrobe({ perColumn = [], fullWidth = 0, shoeTopOf = null } = {}) {
  const items = [{ id: 'p1', kind: 'partition', x_mm: 591 }];
  perColumn.forEach((n, zone) => {
    for (let i = 1; i <= n; i += 1) {
      items.push({
        id: `z${zone}d${i}`, kind: 'drawer', index: i, mount: 'internal', zone,
        ...(shoeTopOf === zone && i === n ? { variant: 'shoe' } : {}),
      });
    }
  });
  for (let i = 1; i <= fullWidth; i += 1) items.push({ id: `d${i}`, kind: 'drawer', index: i, mount: 'internal' });
  return computeCabinet({ ...defaultParamsFor('WARDROBE', P), width: 1200, items }, P);
}

const byId = (r, id) => r.panels.find((p) => p.id === id);
const overlaps = (a, b) => a.x < b.x + b.w - 1e-6 && b.x < a.x + a.w - 1e-6
  && a.y < b.y + b.h - 1e-6 && b.y < a.y + a.h - 1e-6
  && a.z < b.z + b.d - 1e-6 && b.z < a.z + a.d - 1e-6;
/** Material never enters material: the boards a divider passes through. */
const throughOf = (r, vp) => r.panels
  .filter((p) => p !== vp && p.box && (p.role === 'drawer_box' || p.part === 'PARTITION') && overlaps(vp.box, p.box))
  .map((p) => p.id);

test('probe A, the new law: the divider over a full-width stack stands ON its PARTITION, which stays full width', () => {
  const r = wardrobe({ fullWidth: 2 });
  const part = byId(r, 'PARTITION');
  const vp = byId(r, 'VPART-1');
  // Row 1: the board, untouched.
  assert.deepEqual([part.box.x, part.box.x + part.box.w, part.box.y], [18, 1182, 426], 'PARTITION x 18..1182 at y 426');
  assert.equal(part.w, 1164);
  // Row 2: the boxes, untouched (full width under the board).
  const boxes = r.panels.filter((p) => p.role === 'drawer_box');
  assert.equal(boxes.length, 10);
  assert.equal(Math.min(...boxes.map((b) => b.box.x)), 71);
  assert.equal(Math.max(...boxes.map((b) => b.box.x + b.box.w)), 1129);
  // Row 3: the divider from the board's top face to the top.
  assert.equal(vp.box.y, part.box.y + G, 'the divider starts on the top face of the PARTITION (444)');
  assert.equal(vp.box.y, 444);
  assert.equal(vp.box.y + vp.box.h, H - G, 'and runs to the underside of the TOP');
  assert.equal(vp.w, 1688, 'the cut length is the run from the board to the top');
  assert.equal(vp.meta.terminatesOn, null);
  // Row 4: nothing crossed.
  assert.deepEqual(throughOf(r, vp), [], 'material never enters material');
  // Row 5: the foot lands on the FIX board, the mark alone (1710d).
  const foot = r.derived.dividerJoints.find((j) => j.divider === 'VPART-1' && j.end === 'foot');
  assert.equal(foot.receiver, 'PARTITION');
  assert.equal(foot.screws, false, 'biscuits only on the FIX board, no screw');
  // Row 6: still no warning (nothing to warn about now).
  assert.deepEqual(r.warnings.map((w) => w.code), []);
});

test('probe B, the new law: two columns of 3 are closed by ONE board x 18..1182, the divider from the base to it', () => {
  const r = wardrobe({ perColumn: [3, 3] });
  const caps = r.panels.filter((p) => p.part === 'PARTITION');
  assert.equal(caps.length, 1, 'one board over both stacks, never two');
  const cap = caps[0];
  assert.equal(cap.id, 'PARTITION');
  assert.deepEqual([cap.box.x, cap.box.x + cap.box.w, cap.box.y], [18, 1182, 629], 'x 18..1182 at y 629');
  assert.equal(cap.meta.variant, 'fixed');
  assert.deepEqual(cap.meta.columns, [0, 1]);
  assert.ok(!byId(r, 'Z1-PART') && !byId(r, 'Z2-PART'), 'no per-column board under the one board');
  const vp = byId(r, 'VPART-1');
  assert.equal(vp.box.y, G, 'the divider stands on the base');
  assert.equal(vp.box.y + vp.box.h, cap.box.y, 'and stops under the board');
  assert.equal(vp.w, 611);
  assert.equal(vp.meta.terminatesOn, 'PARTITION');
  assert.equal(vp.meta.fullHeight, false);
  assert.deepEqual(throughOf(r, vp), []);
  // The boxes stand in their columns, as before (probe row 9).
  const z0 = r.panels.filter((p) => p.role === 'drawer_box' && p.meta?.zone === 0);
  const z1 = r.panels.filter((p) => p.role === 'drawer_box' && p.meta?.zone === 1);
  assert.equal(Math.min(...z0.map((b) => b.box.x)), 71);
  assert.equal(Math.max(...z0.map((b) => b.box.x + b.box.w)), 586);
  assert.equal(Math.min(...z1.map((b) => b.box.x)), 614);
  assert.equal(Math.max(...z1.map((b) => b.box.x + b.box.w)), 1129);
  // The joints: the foot on the BOTTOM (screws and marks), the head under the FIX board (the mark alone).
  const joints = r.derived.dividerJoints.filter((j) => j.divider === 'VPART-1');
  assert.deepEqual(joints.map((j) => [j.end, j.receiver, j.screws]), [['foot', 'BOTTOM', true], ['head', 'PARTITION', false]]);
  // The board's confirmats are the full-width board's: 3 per side, 3 along the BACK, none through the divider.
  const screws = r.drills.filter((d) => d.kind === 'partition_screw');
  const centre = cap.box.y + G / 2;
  assert.equal(screws.filter((d) => d.panel === 'BUL' && d.y === centre).length, 3);
  assert.equal(screws.filter((d) => d.panel === 'BUR' && d.y === centre).length, 3);
  assert.deepEqual(screws.filter((d) => d.panel === 'BACK').map((d) => [d.x, d.y]), [[G + P.puzzle.screwFromEnd, centre], [600, centre], [1200 - G - P.puzzle.screwFromEnd, centre]]);
  assert.equal(screws.filter((d) => d.panel === 'VPART-1').length, 0, 'no screw through the divider');
  assert.equal(screws.length, 9);
  // The runners still drill the divider: both columns, 3 drawers each.
  const perWall = P.wardrobe.runners.holeXPattern.length * 3;
  assert.equal(r.drills.filter((d) => d.kind === 'runner' && d.panel === 'VPART-1').length, 2 * perWall);
  // The store's shelf clamps read the one board as each column's top.
  assert.deepEqual(r.assemblies.columnDrawers.map((c) => [c.zone, c.top]), [[0, 629], [1, 629]]);
  assert.deepEqual(r.warnings.map((w) => w.code), []);
});

test('probe C, the new law: unequal stacks take ONE board at the taller stack; the shorter headroom stays open', () => {
  const r = wardrobe({ perColumn: [3, 2] });
  const caps = r.panels.filter((p) => p.part === 'PARTITION');
  assert.equal(caps.length, 1);
  assert.equal(caps[0].box.y, 629, 'at the 3-drawer stack, not at the 2-drawer one (426)');
  const vp = byId(r, 'VPART-1');
  assert.deepEqual([vp.box.y, vp.box.y + vp.box.h], [18, 629]);
  assert.deepEqual(throughOf(r, vp), []);
  const z1Top = Math.max(...r.panels.filter((p) => p.role === 'drawer_box' && p.meta?.zone === 1).map((b) => b.box.y + b.box.h));
  assert.equal(z1Top, 398.5, 'the shorter column keeps its own stack, open above to the one board');
});

test('probe D: a lone column keeps its own Z1-PART and its divider runs base to top, as before', () => {
  const r = wardrobe({ perColumn: [3] });
  const z1 = byId(r, 'Z1-PART');
  assert.ok(z1);
  assert.deepEqual([z1.box.x, z1.box.x + z1.box.w, z1.box.y], [18, 591, 629]);
  assert.ok(!byId(r, 'PARTITION'));
  const vp = byId(r, 'VPART-1');
  assert.deepEqual([vp.box.y, vp.box.y + vp.box.h], [18, 2132]);
  assert.equal(vp.meta.terminatesOn, null);
});

test('the one board is published only where it is cut: assemblies.columnCap', () => {
  assert.deepEqual(wardrobe({ perColumn: [3, 3] }).assemblies.columnCap, { top: 629, zones: [0, 1] });
  assert.deepEqual(wardrobe({ perColumn: [3, 2] }).assemblies.columnCap, { top: 629, zones: [0, 1] });
  assert.ok(!('columnCap' in wardrobe({ perColumn: [3] }).assemblies), 'a lone column: no key');
  assert.ok(!('columnCap' in wardrobe({ fullWidth: 2 }).assemblies), 'a full-width stack: no key');
});

test('a full-width stack topped by the shoe drawer has no board: the divider over it says it stands on nothing', () => {
  const items = [{ id: 'p1', kind: 'partition', x_mm: 591 },
    { id: 'd1', kind: 'drawer', index: 1, mount: 'internal' },
    { id: 'd2', kind: 'drawer', index: 2, mount: 'internal', variant: 'shoe' }];
  const r = computeCabinet({ ...defaultParamsFor('WARDROBE', P), width: 1200, items }, P);
  assert.ok(!byId(r, 'PARTITION'), 'no board over a shoe drawer (T70 F1)');
  const vp = byId(r, 'VPART-1');
  assert.equal(vp.box.y, 444, 'the divider still never enters a box');
  assert.deepEqual(throughOf(r, vp), []);
  assert.equal(r.derived.dividerJoints.find((j) => j.divider === 'VPART-1' && j.end === 'foot').receiver, null);
  const said = r.warnings.find((w) => w.code === 'DIVIDER_ON_NO_BOARD');
  assert.ok(said, 'room refuses first and never silently');
  assert.equal(said.panel, 'VPART-1');
  assert.equal(said.message, 'VPART-1 stands on nothing: the drawer stack under it is topped by the shoe drawer, which '
    + 'carries no board. Take the shoe drawer off the top of the stack, or take the divider out.');
  assert.ok(!wardrobe({ fullWidth: 2 }).warnings.some((w) => w.code === 'DIVIDER_ON_NO_BOARD'), 'never over a board');
});

test('a column topped by a shoe drawer keeps the per-column law (nothing over a shoe drawer, T70 F1)', () => {
  const r = wardrobe({ perColumn: [3, 3], shoeTopOf: 0 });
  assert.ok(!byId(r, 'PARTITION'), 'no one board over a shoe drawer');
  assert.ok(byId(r, 'Z2-PART'), 'the other column keeps its own board');
  assert.ok(!byId(r, 'Z1-PART'), 'the shoe column has none');
  assert.ok(r.warnings.some((w) => w.code === 'SHOE_STACK_UNCAPPED' && w.zone === 0));
  const vp = byId(r, 'VPART-1');
  assert.deepEqual([vp.box.y, vp.box.y + vp.box.h], [18, 2132]);
});

// ─── THE STORE: one batch, one undo ────────────────────────────────────────

const S = () => useProjectStore.getState();
const history = () => useHistoryStore.getState();
const itemsOf = (id) => S().units.find((u) => u.id === id).params.sections?.[0]?.items || [];

function freshWardrobe(width = 1200) {
  S().loadProject({
    id: null, name: 'T79 F3', number: '79', client: 'the owner',
    room: migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) }),
    design: {},
  }, []);
  confirmDrawerBox();
  const u = S().addUnit('WARDROBE');
  S().updateUnitParams(u.id, { width });
  return u.id;
}

test.before(() => watchProjectHistory());
test.after(() => unwatchProjectHistory());

test('columns 2: one divider at (W - G) / 2, the stack in zone 0 and the same stack in zone 1, in ONE batch', () => {
  const id = freshWardrobe(1200);
  flushHistory();
  const before = JSON.parse(JSON.stringify(S().units));
  const depth = history().past.length;

  const res = S().addDrawers(id, 3, 'internal', 200, null, null, { columns: 2 });
  flushHistory();
  assert.equal(res.ok, true);
  assert.equal(history().past.length, depth + 1, 'one click, one entry on the undo stack');

  const items = itemsOf(id);
  const parts = items.filter((i) => i.kind === 'partition');
  assert.equal(parts.length, 1, 'one divider');
  assert.equal(parts[0].x_mm, (1200 - G) / 2, 'its left face at (W - G) / 2 = 591');
  assert.equal(parts[0].front_mm, 0, 'full depth: the runners\' wall (T32 F4)');
  assert.equal(res.partitionId, parts[0].id);
  for (const zone of [0, 1]) {
    const stack = items.filter((i) => i.kind === 'drawer' && i.zone === zone);
    assert.equal(stack.length, 3, `three drawers in column ${zone + 1}`);
    assert.ok(stack.every((d) => d.mount === 'internal' && d.height_mm === 200));
  }
  assert.ok(!items.some((i) => i.kind === 'drawer' && i.zone == null), 'no full-width drawer');

  // What the engine cuts from it: the mockup.
  const r = S().unitResult(id);
  const caps = r.panels.filter((p) => p.part === 'PARTITION');
  assert.equal(caps.length, 1);
  assert.equal(caps[0].box.x, G);
  assert.equal(caps[0].box.w, 1200 - 2 * G);
  const vp = byId(r, 'VPART-1');
  assert.equal(vp.box.y, G);
  assert.equal(vp.box.y + vp.box.h, caps[0].box.y);
  assert.equal(vp.meta.terminatesOn, 'PARTITION');

  // One Ctrl+Z puts the unit back.
  assert.ok(history().undo());
  assert.deepEqual(JSON.parse(JSON.stringify(S().units)), before, 'one undo removes the divider and both stacks');
});

test('columns 2 replaces a full-width stack; columns 1 is today', () => {
  const id = freshWardrobe(1200);
  assert.equal(S().addDrawers(id, 2, 'internal', 200).ok, true);
  assert.equal(itemsOf(id).filter((i) => i.kind === 'drawer' && i.zone == null).length, 2);
  assert.equal(S().addDrawers(id, 3, 'internal', 200, null, null, { columns: 2 }).ok, true);
  assert.equal(itemsOf(id).filter((i) => i.kind === 'drawer' && i.zone == null).length, 0, 'the full-width stack is replaced');
  assert.equal(itemsOf(id).filter((i) => i.kind === 'drawer').length, 6);

  const one = freshWardrobe(1200);
  assert.equal(S().addDrawers(one, 3, 'internal', 200, null, null, { columns: 1 }).ok, true);
  assert.equal(itemsOf(one).filter((i) => i.kind === 'partition').length, 0, 'one column adds no divider');
  assert.equal(itemsOf(one).filter((i) => i.kind === 'drawer' && i.zone == null).length, 3);
});

test('a unit that already has a divider is not asked: columns 2 is refused in words, nothing moves', () => {
  const id = freshWardrobe(1200);
  S().addPartition(id);
  const before = JSON.parse(JSON.stringify(itemsOf(id)));
  const res = S().addDrawers(id, 3, 'internal', 200, null, null, { columns: 2 });
  assert.equal(res.ok, false);
  assert.equal(res.error, DRAWER_COLUMNS_DIVIDED);
  assert.deepEqual(JSON.parse(JSON.stringify(itemsOf(id))), before);
});

test('the divider added by columns 2 is an ordinary partition afterwards: deleting it leaves two column stacks', () => {
  const id = freshWardrobe(1200);
  const { partitionId } = S().addDrawers(id, 3, 'internal', 200, null, null, { columns: 2 });
  S().setPartitionX(id, partitionId, 500);
  assert.equal(itemsOf(id).find((i) => i.id === partitionId).x_mm, 500, 'draggable');
  S().removeItem(id, partitionId);
  assert.equal(itemsOf(id).filter((i) => i.kind === 'partition').length, 0, 'deletable');
  assert.equal(itemsOf(id).filter((i) => i.kind === 'drawer' && i.zone != null).length, 6, 'the two stacks stay');
  assert.ok(S().unitResult(id), 'the engine still answers');
});

test('save and reload: the two columns are plain items and come back as the same cut', () => {
  const id = freshWardrobe(1200);
  S().addDrawers(id, 3, 'internal', 200, null, null, { columns: 2 });
  const cutOf = (r) => r.panels.filter((p) => ['PARTITION', 'VPART'].includes(p.part)).map((p) => [p.id, p.box]);
  const before = cutOf(S().unitResult(id));
  const saved = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
  S().loadProject(saved.project, saved.units);
  assert.deepEqual(cutOf(S().unitResult(id)), before, 'the reloaded unit cuts the same board and divider');
});

test('a full-width shelf under the one board is raised onto it: material never enters material', () => {
  const id = freshWardrobe(1200);
  S().addDrawers(id, 2, 'internal', 200);
  S().addShelves(id, 1, null);
  const shelfId = itemsOf(id).find((i) => i.kind === 'shelf').id;
  S().setShelfPos(id, shelfId, 460);
  assert.ok(itemsOf(id).find((i) => i.id === shelfId).pos_mm < 629, 'over the full-width stack, below where the columns close');
  assert.equal(S().addDrawers(id, 3, 'internal', 200, null, null, { columns: 2 }).ok, true);
  const r = S().unitResult(id);
  const cap = byId(r, 'PARTITION');
  const shelf = itemsOf(id).find((i) => i.id === shelfId);
  assert.equal(shelf.zone ?? null, null, 'still a full-width shelf');
  assert.ok(shelf.pos_mm >= cap.box.y + G, `the shelf (${shelf.pos_mm}) stands above the one board (${cap.box.y + G})`);
  const sh = r.panels.find((p) => p.part === 'SHELF');
  const vp = byId(r, 'VPART-1');
  assert.ok(!overlaps(sh.box, vp.box), 'the shelf does not cross the divider');
  assert.ok(!r.panels.some((p) => p.role === 'drawer_box' && overlaps(sh.box, p.box)), 'nor a box');
  // And the right panel's checks read the one board: no false "drawers dropped".
  const unit = S().units.find((u) => u.id === id);
  assert.deepEqual(validateUnit(unit, r).filter((i) => i.level === 'error'), [],
    'two column stacks are not "drawers that do not fit"');
  const sunk = { ...unit, params: { ...unit.params, sections: [{ ...unit.params.sections[0],
    items: unit.params.sections[0].items.map((i) => (i.id === shelfId ? { ...i, pos_mm: 500 } : i)) }] } };
  assert.ok(validateUnit(sunk, r).some((i) => i.level === 'warn' && i.message.startsWith('A shelf sits inside the drawer zone (500')),
    'a full-width shelf under the one board is named');
});

test('export with readiness: the board and the divider go to the machine; the divider\'s two faces drill as BUL and BUR, and the gate holds nothing', () => {
  const id = freshWardrobe(1200);
  S().addDrawers(id, 3, 'internal', 200, null, null, { columns: 2 });
  const r = S().unitResult(id);
  const files = buildUnitDxfFiles(r, P);
  for (const panel of ['PARTITION', 'VPART-1']) {
    assert.ok(files.some((f) => f.panelId === panel), `${panel} has its DXF`);
  }
  assert.ok(!files.some((f) => /Z[12]-PART/.test(f.panelId)), 'no per-column board is exported');
  const ready = exportReadiness(r.panels, r.drills);
  assert.ok(ready.lines.every((l) => l.state === 'cut'), 'every part is a cut line');
  // FOUND BY THIS TEST (T79 F3): the two columns drilled their runner rows
  // into the divider at the same points of its one program, and the drill
  // guard named each hole drilled twice; the gate held the divider out by
  // name. The one board over the columns ADDS no fault: the three confirmats
  // each Z<k>-PART drove into the divider at one point (drilled twice before
  // T79) are gone with the boards.
  // CHAT FIX 28.10.2026 AMENDED: the cause, found the same evening by the
  // owner's recess drawers (*"odsunac diverted po lewej i po prawej rowno z
  // wneka, zeby zamontowac szuflady"*): both faces' rows were drawn at
  // `partitionDepth - (px + setback)`, a v from the BACK applied to a v from
  // the FRONT, mirrored front to back about the board's middle. Now T82 F9's
  // law (KIT_VANITY.lsp D11, the vanity's divider): the LEFT face, column 1's
  // right wall, is drilled as BUL is; the RIGHT face, column 2's left wall, is
  // the same part turned over and drilled as BUR is. The two rows are no
  // longer one point of the program and the divider goes to the machine.
  const RN = P.wardrobe.runners;
  const rowsOf = (panel, foot) => r.drills.filter((d) => d.panel === panel && d.layer === RN.layer)
    .map((d) => `${d.x} ${d.y - foot}`).sort();
  const dv = byId(r, 'VPART-1');
  assert.equal(dv.box.z + dv.box.d, byId(r, 'BUL').box.z + byId(r, 'BUL').box.d, 'the divider\'s front is the sides\' front');
  assert.deepEqual(rowsOf('VPART-1', 0), [...rowsOf('BUL', G), ...rowsOf('BUR', G)].sort(),
    'its two faces carry BUL\'s rows and BUR\'s, each measured from its own foot');
  assert.equal(rowsOf('VPART-1', 0).length, 2 * 3 * RN.holeXPattern.length, 'three drawers a column, one row a face');
  const gate = exportGate([{ result: r }], { profile: P });
  assert.deepEqual(gate.held, [], 'nothing is held out');
  assert.deepEqual(gate.findings, [], 'and nothing is found on the unit');
});

// ─── THE UI: the question, asked like the bays ─────────────────────────────

test('AddItems asks COLUMNS 1 or 2 beside the count, only while the unit is undivided', () => {
  for (const rel of ['src/components/AddItems.jsx', 'src/retail/design/detail/AddItems.jsx']) {
    const src = read(rel);
    assert.match(src, /const askColumns = zones\.length <= 1 && type\.supports\.partition && type\.drawerStyle === 'wardrobe';/,
      `${rel}: the choice is shown only on an undivided unit that takes a divider`);
    assert.match(src, /\{askColumns && \(\s*<div>\s*<span className="[^"]+">Columns<\/span>/, `${rel}: the COLUMNS label`);
    assert.match(src, /data-drawer-columns=\{n\}/, `${rel}: the walk's hook`);
    assert.match(src, /\[1, 2\]\.map\(\(n\) =>/, `${rel}: 1 and 2`);
    assert.ok(src.includes('2 columns: a divider mid-width, a stack in each column, one fixed shelf over both.'),
      `${rel}: the hint, in the owner's mockup's words`);
    assert.match(src, /addDrawers\(unit\.id, count, drawerMount, height, zone, drawerVariant, \{ columns \}\)/, `${rel}: the choice reaches the store`);
    // A divided unit keeps "Which column" (the same `zones.length > 1` it always read).
    assert.match(src, /\{zones\.length > 1 && \(\s*<div className="[^"]+">\s*<span className="[^"]+">Which column<\/span>/,
      `${rel}: "Which column" stands for a divided unit`);
  }
});
