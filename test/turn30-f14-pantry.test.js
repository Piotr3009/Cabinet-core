// ─── TURN 30 F14 — the pantry, with Blum drawers ("koniecznie") ────────────
//
// CLAUDE.md: "Parent: KIT_BUDTALL + the existing drawer machinery (KIT_LOW/
// KIT_SINK rows, MOVENTO catalogue). Internal drawers behind doors: existing
// drawer boxes and runner drilling, front omitted (see F20's mechanism — build
// it once, use it in both)."
//
// ─── THE WHOLE FEATURE, IN TWO EQUALITIES ───────────────────────────────────
//
// A pantry has two parents and it is drilled by both of them, so the test is
// two comparisons and no third answer:
//
//   with NO drawers   it is drilled EXACTLY as a KIT_BUDTALL tall unit its size
//   with THREE        it is drilled EXACTLY as a wardrobe with three frontless
//                     drawers — the internal drawer machinery this engine has
//                     had since turn 3, MOVENTO rows and all
//
// Nothing is added between those two, which is what "no invented hole" means
// when a type is made of two kits.
//
// ─── AND THE MECHANISM IS BUILT ONCE ────────────────────────────────────────
//
// `internalDrawerSet` is F20's mechanism, written here because F14 is its first
// consumer, exactly as CLAUDE.md instructs. It decides ONE thing — whether a
// DRAWER-FRONT board is cut — and it is asserted below that it cannot reach a
// box, a runner row, a hole or a BOM line.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet, internalDrawerSet } from '../src/engine/cabinet.js';
import {
  UNIT_NUM_PREFIX, UNIT_TYPE_ORDER, categoryOf, defaultParamsFor, getUnitType,
} from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { flattenLibrary, resolveEntry } from '../src/engine/library.js';

const SAME = {
  width: 600, height: 2100, depth: 558, doors: true, unit_num: '01',
};
const of = (type, over = {}) => computeCabinet({ ...defaultParamsFor(type, P), ...SAME, ...over }, P);
const holes = (r) => r.drills
  .map((d) => `${String(d.panel).replace(/^[^-]*-/, '')}|${d.layer}|${d.kind}|${d.x}|${d.y}|${d.d}`).sort();
const parts = (r) => r.panels.map((p) => p.part);

// ─── 1. THE TWO EQUALITIES ─────────────────────────────────────────────────

test('F14 empty, a pantry is drilled EXACTLY as the KIT_BUDTALL it is made of', () => {
  const p = of('PANTRY', { drawers: 0 });
  const t = of('BUDTALL', { drawers: 0 });
  assert.equal(p.drills.length, t.drills.length);
  assert.deepEqual(holes(p), holes(t), 'hole for hole');
  assert.deepEqual(parts(p), parts(t));
  assert.deepEqual(p.drillSummary, t.drillSummary);
});

test('F14 with drawers, the drilling is the WARDROBE machinery, hole for hole', () => {
  // The existing internal-drawer machinery, unchanged: the drawer panels the
  // runners screw to, the MOVENTO rows, the boxes. A wardrobe with its fronts
  // off is the same cabinet, and the fingerprints have to be one string.
  const p = of('PANTRY', { drawers: 3 });
  const w = of('WARDROBE', { drawers: 3, drawer_fronts: false });
  assert.equal(p.drills.length, w.drills.length);
  assert.deepEqual(holes(p), holes(w));
  assert.deepEqual(parts(p), parts(w));
});

test('F14 …and the drawers really are drilled: MOVENTO rows on the runner layer', () => {
  const p = of('PANTRY', { drawers: 3 });
  const rows = p.drills.filter((d) => d.layer === 'RUNNERS_3MM');
  assert.ok(rows.length >= 18, `${rows.length} runner holes`);
  // The row height is the catalogue's, not a number invented here.
  const first = Math.min(...rows.map((d) => d.y));
  assert.equal(first, P.wardrobe.runners.firstRowFromBottom, 'the MOVENTO drilling offset');
  // …and nothing was drilled that the wardrobe would not drill.
  const w = of('WARDROBE', { drawers: 3, drawer_fronts: false });
  assert.equal(
    p.drills.filter((d) => d.layer === 'RUNNERS_3MM').length,
    w.drills.filter((d) => d.layer === 'RUNNERS_3MM').length,
  );
});

test('F14 the BOM buys the boxes and the runners, because they are really there', () => {
  const p = of('PANTRY', { drawers: 3 });
  const runners = p.hardware.find((h) => h.role === 'runner_pairs');
  assert.ok(runners, 'runners are ordered');
  assert.equal(runners.qty, 3, 'one pair per drawer');
  assert.equal(p.panels.filter((x) => x.part === 'DRAWER-SIDE').length, 6, 'two sides per box');
  assert.equal(p.panels.filter((x) => x.part === 'DRAWER-BOTTOM').length, 3);
  // …and no mechanism is invented for it: a pantry buys no kit of its own.
  assert.equal(getUnitType('PANTRY').hardwareKit, undefined);
});

// ─── 2. THE FRONTS ARE OMITTED, AND THAT IS ALL THAT IS OMITTED ────────────

test('F14 the drawers are INTERNAL: boxes and runners, no faces', () => {
  const p = of('PANTRY', { drawers: 3 });
  assert.equal(p.panels.filter((x) => x.part === 'DRAWER-FRONT').length, 0, 'no drawer faces');
  // The unit's own face is its DOOR, and it is there.
  assert.equal(p.panels.filter((x) => x.part === 'FRONT').length, 1);
  assert.equal(p.drillSummary.hinge_centers.length, 6, 'on the tall kit’s own ladder');
});

test('F14 …and omitting a face changes NOTHING else — same holes, same boxes', () => {
  // The claim stated the only way it can be stated: the same cabinet WITH
  // faces, and the difference is exactly the faces.
  const internal = of('PANTRY', { drawers: 3 });
  const faced = of('PANTRY', { drawers: 3, internal_drawers: [] });
  assert.equal(faced.panels.filter((x) => x.part === 'DRAWER-FRONT').length, 3);
  assert.deepEqual(holes(internal), holes(faced), 'not one hole differs');
  assert.deepEqual(
    parts(internal),
    parts(faced).filter((x) => x !== 'DRAWER-FRONT'),
    'the difference is three boards and nothing else',
  );
  assert.deepEqual(
    internal.hardware.map((h) => `${h.role}:${h.qty}`),
    faced.hardware.map((h) => `${h.role}:${h.qty}`),
    'and the order form is identical',
  );
});

// ─── 3. THE MECHANISM (F20's, built here) ──────────────────────────────────

test('F14 `internalDrawerSet` is three ways of saying one thing', () => {
  const kit = { internalDrawers: 'all' };
  const plain = {};
  // The JOB's own list — F20's hidden drawer.
  assert.deepEqual([...internalDrawerSet({ internal_drawers: [2] }, plain, 3)], [2]);
  // The KIT's — F14's pantry.
  assert.deepEqual([...internalDrawerSet({}, kit, 3)], [1, 2, 3]);
  // Turn 17's "the fronts come off", unchanged.
  assert.deepEqual([...internalDrawerSet({ drawer_fronts: false }, plain, 3)], [1, 2, 3]);
  // Nothing said, nothing internal.
  assert.deepEqual([...internalDrawerSet({}, plain, 3)], []);
  // A job can put the faces BACK on a kit whose drawers are internal by
  // definition, which is what makes it an input and not a law.
  assert.deepEqual([...internalDrawerSet({ internal_drawers: [] }, kit, 3)], []);
});

test('F14 …and a number that is not a drawer is ignored rather than obeyed', () => {
  assert.deepEqual([...internalDrawerSet({ internal_drawers: [0, 4, 'x', 2] }, {}, 3)], [2]);
  assert.deepEqual([...internalDrawerSet({ internal_drawers: 'nonsense' }, {}, 3)], []);
});

test('F14 the mechanism cannot reach a hole, a box or an order line', () => {
  const src = readFileSync(new URL('../src/engine/cabinet.js', import.meta.url), 'utf8');
  const at = src.indexOf('export function internalDrawerSet(');
  assert.ok(at > 0);
  const body = src.slice(at, src.indexOf('\n}', at));
  for (const forbidden of ['drills.push', 'hw(', 'panels.push', 'runner']) {
    assert.ok(!body.includes(forbidden), `${forbidden} must not appear in it`);
  }
  // It is consulted in the two FRONT loops and nowhere else — twice in each:
  // once to skip the hidden drawer's board, and once (turn 30, F20) to let the
  // front above it grow down over its zone. Both are about a façade; neither
  // can reach a box, a runner row or an order line.
  const uses = src.split('cfg.internalDrawers').length - 1;
  assert.equal(uses, 4, `${uses} uses — two per stack, both in its front loop`);
  for (const stack of [
    'an INTERNAL drawer is given no face',            // the wardrobe stack's
    'is the two-drawer front with a hidden drawer behind it.', // the BUDR stack's
  ]) {
    const at = src.indexOf(stack);
    assert.ok(at > 0, stack);
    const body = src.slice(at, at + 2500);
    assert.equal(body.split('cfg.internalDrawers').length - 1, 2, stack);
  }
});

test('F14 no kit written before tonight became internal', () => {
  for (const id of UNIT_TYPE_ORDER) {
    if (id === 'PANTRY') continue;
    assert.notEqual(getUnitType(id).internalDrawers, 'all', id);
  }
  // …and the kits that HAVE drawer faces still cut them.
  assert.equal(of('BUDR', { drawers: 3 }).panels.filter((x) => x.part === 'DRAWER-FRONT').length, 3);
  assert.equal(
    of('WARDROBE', { drawers: 3 }).panels.filter((x) => x.part === 'DRAWER-FRONT').length, 3,
  );
});

// ─── 4. THE KIT ────────────────────────────────────────────────────────────

test('F14 it arrives at 600 × 2100, from the profile', () => {
  assert.deepEqual(P.pantryUnit.defaults, { width: 600, height: 2100, depth: 558 });
  assert.deepEqual(migrateCabinetProfile({}).pantryUnit.defaults, P.pantryUnit.defaults);
  assert.equal(defaultParamsFor('PANTRY', P).width, 600);
});

test('F14 it names BOTH kits it is made of', () => {
  const type = getUnitType('PANTRY');
  assert.equal(type.lisp, 'KIT_BUDTALL_FULL.lsp', 'the carcass');
  assert.equal(type.drawerStyle, 'wardrobe', 'and the drawer machinery');
  assert.equal(type.drawerStyle, getUnitType('WARDROBE').drawerStyle);
  assert.equal(type.internalDrawers, 'all');
  assert.equal(type.supports.drawers, true);
  assert.equal(type.supports.shelves, true);
  assert.equal(type.supports.doors, true);
});

test('F14 it is in the KITCHEN category, among the tall units, and can be placed', () => {
  assert.equal(categoryOf('PANTRY').id, 'kitchen');
  const entry = flattenLibrary().find((e) => e.id === 'pantry');
  assert.equal(entry.kind, 'type', 'the held-open row is a kit now');
  assert.equal(entry.typeId, 'PANTRY');
  assert.equal(resolveEntry(entry, P).enabled, true);
  assert.equal(UNIT_NUM_PREFIX.PANTRY, 'PY');
});
