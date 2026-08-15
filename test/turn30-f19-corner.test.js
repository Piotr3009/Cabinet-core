// ─── TURN 30 F19 — the corner unit ─────────────────────────────────────────
//
// CLAUDE.md: "The riskiest of the batch. Start from what the LISP family
// actually supports (KIT_BUDR is in the repo — READ it first and say in the PR
// what it is); ship the L-carcass geometry + BOM; any hinge/drilling beyond the
// parent kit's own lines waits for a LISP. Do not improvise corner-post
// drilling overnight."
//
// ─── WHAT KIT_BUDR IS ───────────────────────────────────────────────────────
//
// `reference/lisp/KIT_BUDR_FULL.lsp`, first line of its own header:
//
//     ;;; Base Unit Drawer - 3 drawers (4:3:2 ratio)
//
// …and its body is the MOVENTO runner outline drawn line by line
// (`DRAW-RUNNER-LEFT`). It is the THREE-DRAWER BASE UNIT this app has shipped
// since turn 3 — `BUDR` is already built from it — and there is not one corner
// in it. The first test reads the file and says so, so the finding is checked
// rather than claimed.
//
// ─── WHICH SETTLES THE WHOLE FEATURE ────────────────────────────────────────
//
// No parent kit means no parent lines, and the batch rule then says what
// ships: GEOMETRY and a BOM, and NOT ONE HOLE. No cup, no shelf sleeve, no leg
// plate, no corner post. That is what every assertion below is about.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import {
  UNIT_NUM_PREFIX, UNIT_TYPE_ORDER, categoryOf, defaultParamsFor, getUnitType,
} from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { flattenLibrary, resolveEntry } from '../src/engine/library.js';
import { hardwareInstances } from '../src/engine/hardware3d.js';

const of = (over = {}) => computeCabinet({ ...defaultParamsFor('L_SHAPE', P), unit_num: '01', ...over }, P);
const G = P.board.thickness;
const CN = P.cornerUnit;

// ─── 1. WHAT KIT_BUDR IS, READ OFF THE FILE ────────────────────────────────

test('F19 KIT_BUDR_FULL.lsp is the THREE-DRAWER BASE UNIT, not a corner kit', () => {
  const src = readFileSync(new URL('../reference/lisp/KIT_BUDR_FULL.lsp', import.meta.url), 'utf8');
  assert.match(src, /Base Unit Drawer - 3 drawers \(4:3:2 ratio\)/);
  assert.match(src, /DRAW-RUNNER-LEFT/, 'its body is the MOVENTO runner outline');
  // …and there is no corner in it, under any of the words one would be under.
  for (const word of ['corner', 'CORNER', 'L-shape', 'diagonal', 'mitre']) {
    assert.ok(!src.includes(word), `KIT_BUDR mentions "${word}"`);
  }
  // It is the kit BUDR is already built from — the same file, said once.
  assert.equal(getUnitType('BUDR').lisp, 'KIT_BUDR_FULL.lsp');
});

test('F19 …so the corner unit claims NO kit, because there is none to claim', () => {
  assert.equal(getUnitType('L_SHAPE').lisp, null);
  // Nothing in the app pretends a corner kit exists.
  for (const id of UNIT_TYPE_ORDER) {
    const l = getUnitType(id).lisp;
    if (l) assert.ok(!/CORNER|L_SHAPE/i.test(l), `${id} → ${l}`);
  }
});

// ─── 2. NOT ONE HOLE ───────────────────────────────────────────────────────

test('F19 a corner unit is drilled NOWHERE — no hole of any kind', () => {
  const c = of();
  assert.equal(c.drills.length, 0, `${c.drills.length} holes`);
  for (const p of c.panels) {
    assert.deepEqual(p.cnc.holes || [], [], `${p.id} holes`);
    assert.deepEqual(p.cnc.pockets || [], [], `${p.id} pockets`);
    assert.deepEqual(p.cnc.sockets || [], [], `${p.id} sockets`);
    assert.deepEqual(p.cnc.tabs || [], [], `${p.id} tabs`);
  }
  // …and no board is drilled ON: no hinged side, no cup row, no shelf row.
  assert.deepEqual(c.drillSummary.hinged_sides, [], 'nothing is hung on');
  assert.deepEqual(c.drillSummary.side_hinge_holes_y, []);
  assert.deepEqual(c.drillSummary.shelf_row_y, []);
  assert.deepEqual(c.drillSummary.runner_rows_carcass_y, []);
  // (`hinge_centers` and `front_cup_y` still report the base ladder's own
  // arithmetic, as they do on any doorless kit — they are lists of heights,
  // and with no leaf, no hinged side and no drill they reach nothing. What
  // matters is that not one hole was emitted, asserted at the top.)
  assert.equal(c.drills.filter((d) => /cup|hinge|shelf|leg/i.test(d.kind || '')).length, 0);
});

test('F19 …and nothing is bought for it either, because nothing is specified', () => {
  const c = of();
  assert.deepEqual(c.hardware, [], 'no hinge, no leg, no mechanism');
  const inst = hardwareInstances(c, P);
  for (const [key, list] of Object.entries(inst)) {
    assert.deepEqual(list, [], `${key} must be empty`);
  }
  // A corner cabinet's LEGS are the clearest thing not to improvise: one of
  // the four would stand in the L's missing corner.
  assert.equal(getUnitType('L_SHAPE').legs, false);
});

test('F19 no door: a corner leaf hangs on cups nobody has written down', () => {
  const c = of();
  assert.equal(c.panels.filter((p) => p.role === 'front').length, 0);
  assert.equal(getUnitType('L_SHAPE').supports.doors, false);
  // …and asking for one anyway changes nothing, because the kit has no face.
  assert.equal(of({ doors: true }).panels.filter((p) => p.role === 'front').length, 0);
  assert.equal(of({ doors: true }).drills.length, 0);
});

// ─── 3. THE L IS REAL, AND IT IS MADE OF RECTANGLES ────────────────────────

test('F19 it is an L: two arms, eight plain boards', () => {
  const c = of();
  assert.equal(c.panels.length, 8);
  assert.deepEqual(c.panels.map((p) => p.part),
    ['BACK', 'BACK', 'SIDE', 'SIDE', 'BOTTOM', 'BOTTOM', 'TOP', 'TOP']);
  // Every one of them is a rectangle — no L-shaped board, because an L outline
  // is a shape nobody's LISP has drawn.
  for (const p of c.panels) {
    assert.ok(p.w > 0 && p.h > 0, `${p.id} ${p.w} × ${p.h}`);
    assert.equal((p.cnc.outline || []).length <= 5, true, `${p.id} outline`);
  }
});

test('F19 …and the arms really meet in the corner they are cut for', () => {
  const c = of();
  const W = c.params.width;
  const D = c.params.depth;
  const arm = CN.armMm;
  const box = (id) => c.panels.find((p) => p.id.endsWith(id)).box;
  // The two walls: one across the full width at z 0, one up the full depth at
  // x 0, butted rather than overlapped.
  assert.equal(box('BACK-A').w, W);
  assert.equal(box('BACK-A').z, 0);
  assert.equal(box('BACK-B').x, 0);
  assert.equal(box('BACK-B').z, G, 'butted to the other back, not through it');
  assert.equal(box('BACK-B').d, D - G);
  // The far end of each arm.
  assert.equal(box('SIDE-A').x, W - G);
  assert.equal(box('SIDE-A').d, arm, 'arm A is `arm` deep');
  assert.equal(box('SIDE-B').z, D - G);
  assert.equal(box('SIDE-B').w, arm - G, 'arm B is `arm` wide');
  // The floor is the two rectangles the L is made of, and they do not overlap:
  // A runs to z = arm, B starts there.
  assert.equal(box('BOTTOM-A').z + box('BOTTOM-A').d, arm);
  assert.equal(box('BOTTOM-B').z, arm);
  assert.equal(box('TOP-A').y, c.params.height - G);
});

test('F19 the two OPENINGS are what is left over, and the shape is a profile input', () => {
  const c = of();
  // width − arm and depth − arm: 400 apiece at the default 1000 / 600.
  assert.deepEqual(CN.defaults, { width: 1000, height: 770, depth: 1000 });
  assert.equal(CN.armMm, 600);
  assert.equal(c.params.width - CN.armMm, 400);
  assert.deepEqual(migrateCabinetProfile({}).cornerUnit, CN);
  // …and the arm is an INPUT: a workshop that turns its corner differently
  // types a number, exactly as it does for every other kit.
  const deep = of({ corner_arm_mm: 700 });
  assert.equal(deep.panels.find((p) => p.id.endsWith('SIDE-A')).box.d, 700);
  // A nonsense arm cannot cut a board out of existence.
  for (const p of of({ corner_arm_mm: 5000 }).panels) assert.ok(p.w > 0 && p.h > 0, p.id);
});

test('F19 every board reaches the BOM and the cut list', () => {
  const c = of();
  assert.equal(c.totals.pieces_total, 8);
  assert.ok(c.totals.board_area_m2 > 0);
  for (const p of c.panels) {
    assert.ok(c.csvLines.some((l) => l.includes(p.id)), `${p.id} is on the cut list`);
  }
});

// ─── 4. IT IS REACHABLE, AND IT SAYS WHAT IT IS ────────────────────────────

test('F19 the held-open row became a kit, and it names the gap where a joiner reads it', () => {
  // ─── TURN 31 (CLAUDE.md F10): AND IT IS CALLED WHAT IT IS ────────────────
  // The kit is unchanged to the millimetre; its NAME was a promise it could
  // not keep. Everything this test protected still holds under the new one.
  assert.equal(categoryOf('L_SHAPE').id, 'kitchen');
  const entry = flattenLibrary().find((e) => e.id === 'l-shape-unit');
  assert.equal(entry.kind, 'type');
  assert.equal(entry.typeId, 'L_SHAPE');
  assert.equal(entry.label, 'L-shape unit');
  const state = resolveEntry(entry, P);
  assert.equal(state.enabled, true);
  assert.match(state.hint, /no LISP defines its drilling/);
  assert.equal(UNIT_NUM_PREFIX.L_SHAPE, 'CR');
  // The held-open row is a DIFFERENT promise — the JOINTS, which stay parked
  // by the owner's word — and it stays held open.
  assert.equal(flattenLibrary().find((e) => e.id === 'l-shape').kind, 'soon');
});

test('F19 no other kit grew a corner', () => {
  for (const id of UNIT_TYPE_ORDER) {
    if (id === 'L_SHAPE') continue;
    assert.notEqual(getUnitType(id).corner, true, id);
  }
  // …and a base unit is exactly what it was.
  const bud = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01', doors: true }, P);
  assert.equal(bud.panels.filter((p) => /corner/i.test(p.meta?.corner || '')).length, 0);
  assert.equal(bud.drills.length, 77);
});
