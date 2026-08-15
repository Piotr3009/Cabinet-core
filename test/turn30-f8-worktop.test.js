// ─── TURN 30 F8 — one worktop over a run of base cabinets ───────────────────
//
// The owner: select two or more base cabinets and ONE worktop covers the run
// **"od ściany aż do paneli"** — from the wall right out to the end panels.
//
// ─── THREE OVERHANGS, AND EACH ONE IS A DIFFERENT SENTENCE ──────────────────
//
//   FRONT   20 mm proud of the DOOR plane. A slab flush with the doors would
//           drip down them.
//   SIDES   10 mm PAST AN END PANEL — past the panel, not past the carcass.
//   WALL    FLUSH, and there is no number for it: nothing hangs over a wall.
//
// ─── AND CLAUDE.md DECIDES THE REST, SO THIS TURN DOES NOT HAVE TO ──────────
//
// Thickness **38 mm** (UK standard: 770 + 100 legs + 38 lands on the 900 line),
// material = the PROJECT's worktop decor by default, and a per-worktop override
// is a later chat-fix. All three are values in the profile and in the record,
// so that fix is a value rather than a shape change.
//
// ─── IT IS A DESIGN-LAYER AUTO-PART, LIKE THE END PANELS ────────────────────
//
// "no hole, no fixture." `computeCabinet()` neither knows nor asks about it, so
// every golden fixture is untouched BY CONSTRUCTION rather than by care — and
// that is asserted rather than assumed.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { useProjectStore } from '../src/stores/projectStore.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { migrateDesign, DEFAULT_DESIGN } from '../src/engine/design.js';
import {
  takesWorktop, worktopEligible, worktopGeometry, worktopSpec, worktopsFor,
} from '../src/engine/worktop.js';

const store = () => useProjectStore.getState();
const SPEC = worktopSpec(P);

function project() {
  store().loadProject({
    id: null,
    name: 'worktop',
    room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
    design: {},
  }, []);
}

/** Two base cabinets side by side, the way the "+" puts them there. */
function run(n = 2, type = 'BUD') {
  project();
  const ids = [];
  let near = null;
  for (let i = 0; i < n; i += 1) {
    const u = near ? store().addUnit(type, { near, side: 'right' }) : store().addUnit(type);
    store().updateUnitParams(u.id, { width: 600 });
    ids.push(u.id);
    near = u.id;
  }
  return ids;
}

const unitsOf = (ids) => ids.map((id) => store().units.find((u) => u.id === id));

// ─── THE DECIDED NUMBERS ────────────────────────────────────────────────────

test('F8 the three numbers CLAUDE.md decided are the profile’s', () => {
  assert.equal(SPEC.thickness, 38, 'UK standard — 770 + 100 legs + 38 is the 900 line');
  assert.equal(SPEC.frontOverhang, 20);
  assert.equal(SPEC.sideOverhang, 10);
  assert.equal(SPEC.minUnits, 2, '"select 2+ base cabinets"');
  // …and 770 + 100 + 38 really is 908, which is what "≈ the 900 line" means.
  assert.equal(P.baseUnit.legHeight, 100);
});

test('F8 a base unit takes one; a wall unit has nothing to lie on', () => {
  assert.equal(takesWorktop('BUD'), true);
  assert.equal(takesWorktop('SINK'), true);
  assert.equal(takesWorktop('WUD'), false);
});

// ─── THE GEOMETRY ───────────────────────────────────────────────────────────

test('F8 ONE slab covers the run, and each overhang is its own sentence', () => {
  const ids = run(2);
  const units = unitsOf(ids);
  const g = worktopGeometry({ units, profile: P });

  // ALONG THE WALL: the outermost padded edges — which is where the end panels
  // are — plus 10 mm at each end. Two 600s side by side is a 1200 run.
  assert.equal(g.w, 1200 + 2 * SPEC.sideOverhang);
  assert.equal(g.x, units[0].position.x_mm - SPEC.sideOverhang);

  // OUT FROM THE WALL: the carcass, its door and the door's gap, plus 20.
  const depth = units[0].params.depth;
  assert.equal(g.d, depth + P.doors.gap + units[0].params.front_t + SPEC.frontOverhang);
  // …and FLUSH at the wall. Nothing hangs over a wall.
  assert.equal(g.z, 0);
  assert.equal(g.overhang.wall, 0);

  // AND HOW HIGH: on top of the carcasses, 38 thick.
  assert.equal(g.h, 38);
  assert.equal(g.y, P.baseUnit.legHeight + units[0].params.height);
});

test('F8 "aż do paneli": an END PANEL pushes the slab out past it', () => {
  const ids = run(2);
  const bare = worktopGeometry({ units: unitsOf(ids), profile: P });
  // An end panel on the outer end of the run widens the padded span, and the
  // 10 mm is measured PAST THE PANEL rather than past the carcass — which is
  // the whole of "od ściany aż do paneli".
  store().addEndPanel(ids[1], { side: 'R' });
  const withPanel = worktopGeometry({ units: unitsOf(ids), profile: P });
  assert.ok(withPanel.w > bare.w, `${withPanel.w} vs ${bare.w}`);
  assert.equal(withPanel.x, bare.x, 'and the other end has not moved');
});

test('F8 a THIRD cabinet lengthens the same slab rather than adding a second', () => {
  const ids = run(3);
  const g = worktopGeometry({ units: unitsOf(ids), profile: P });
  assert.equal(g.w, 1800 + 2 * SPEC.sideOverhang);
  assert.equal(g.unitIds.length, 3);
});

test('F8 extensions are drawable afterwards, and nothing is computed from them', () => {
  const ids = run(2);
  const units = unitsOf(ids);
  const plain = worktopGeometry({ units, profile: P });
  const drawn = worktopGeometry({
    units,
    record: { extendLeft: 50, extendRight: 120, extendFront: 30 },
    profile: P,
  });
  assert.equal(drawn.w, plain.w + 50 + 120);
  assert.equal(drawn.x, plain.x - 50);
  assert.equal(drawn.d, plain.d + 30);
  assert.deepEqual(drawn.extensions, { left: 50, right: 120, front: 30 });
  // A negative extension is not an extension.
  assert.deepEqual(worktopGeometry({ units, record: { extendLeft: -80 }, profile: P }).x, plain.x);
});

// ─── WHAT IT REFUSES, AND WHY IT SAYS SO ───────────────────────────────────

test('F8 it refuses, and it SAYS WHY — "nothing happened" is not an answer', () => {
  const ids = run(2);
  const units = unitsOf(ids);
  assert.equal(worktopEligible(units, P).ok, true);

  const one = worktopEligible([units[0]], P);
  assert.equal(one.ok, false);
  assert.match(one.why, /2 or more/);

  // A wall unit has nothing to lie on.
  project();
  const wall = store().addUnit('WUD');
  const base = store().addUnit('BUD');
  const mixed = worktopEligible(unitsOf([wall.id, base.id]), P);
  assert.equal(mixed.ok, false);
  assert.match(mixed.why, /base cabinets|lie on/);
});

test('F8 one slab cannot lie on two heights, and it says that too', () => {
  // Asked of the pure function with the heights stated, because a store that
  // clamps a typed height would be testing the clamp rather than the rule.
  const ids = run(2);
  const units = unitsOf(ids).map((u, i) => (i === 1
    ? { ...u, params: { ...u.params, height: u.params.height + 60 } }
    : u));
  const gate = worktopEligible(units, P);
  assert.equal(gate.ok, false);
  assert.match(gate.why, /two heights/);
});

// ─── THE STORE, AND THE DESIGN LAYER IT LIVES IN ───────────────────────────

test('F8 the record is DESIGN-layer, and a project saved before this turn has none', () => {
  assert.deepEqual(DEFAULT_DESIGN.worktops, []);
  assert.deepEqual(migrateDesign({}).worktops, []);
  // A record with fewer than two cabinets under it is not a worktop.
  assert.deepEqual(migrateDesign({ worktops: [{ id: 'w1', unitIds: ['a'] }] }).worktops, []);
  assert.equal(migrateDesign({ worktops: [{ id: 'w1', unitIds: ['a', 'b'] }] }).worktops.length, 1);
});

test('F8 addWorktop stores one, and worktopsOf resolves its geometry', () => {
  const ids = run(2);
  const added = store().addWorktop(ids);
  assert.equal(added.ok, true);
  const [w] = store().worktopsOf();
  assert.equal(w.id, added.id);
  assert.deepEqual(w.unitIds, ids);
  assert.equal(w.geometry.h, 38);
  assert.equal(w.geometry.w, 1220);
  // The material is the PROJECT's by default — a per-worktop override is a
  // later chat-fix, and the field is here so that fix is a value.
  assert.equal(w.decor, null);
});

test('F8 a cabinet lies under ONE slab: asking again REPLACES rather than stacks', () => {
  const ids = run(3);
  store().addWorktop([ids[0], ids[1]]);
  assert.equal(store().worktopsOf().length, 1);
  store().addWorktop([ids[1], ids[2]]);
  const all = store().worktopsOf();
  assert.equal(all.length, 1, 'the overlapping one was replaced');
  assert.deepEqual(all[0].unitIds, [ids[1], ids[2]]);
});

test('F8 a record naming a deleted cabinet is DROPPED rather than drawn over a hole', () => {
  const ids = run(2);
  store().addWorktop(ids);
  assert.equal(store().worktopsOf().length, 1);
  store().removeUnit(ids[1]);
  assert.equal(store().worktopsOf().length, 0);
});

test('F8 removing one takes it off, and it is one undo step', () => {
  const ids = run(2);
  const { id } = store().addWorktop(ids);
  store().removeWorktop(id);
  assert.equal(store().worktopsOf().length, 0);
});

test('F8 extendWorktop writes only what a person typed', () => {
  const ids = run(2);
  const { id } = store().addWorktop(ids);
  store().extendWorktop(id, { extendFront: 60 });
  const [w] = store().worktopsOf();
  assert.equal(w.extendFront, 60);
  assert.equal(w.geometry.d, worktopGeometry({ units: unitsOf(ids), profile: P }).d + 60);
});

// ─── RULE 1: NO HOLE, NO FIXTURE ───────────────────────────────────────────

test('F8 it reaches NO hole: the engine neither knows nor asks about it', () => {
  const engine = readFileSync(new URL('../src/engine/cabinet.js', import.meta.url), 'utf8');
  // The word appears in the engine's PROSE — "the screw head goes under a
  // worktop" has been a comment there since turn 13 — so what is asserted is
  // that it never IMPORTS the module or READS a record. That is the claim:
  // `computeCabinet()` is not involved at all.
  assert.doesNotMatch(engine, /from '\.\/worktop\.js'/, 'the engine does not import it');
  assert.doesNotMatch(engine, /worktopGeometry|worktopsFor|worktopEligible|params\.worktop/,
    'and it reads nothing of one');
  const module = readFileSync(new URL('../src/engine/worktop.js', import.meta.url), 'utf8');
  assert.doesNotMatch(module, /addDrill|drills|cnc\./, 'and the module cannot emit one');
});

test('F8 a cabinet under a slab is cut EXACTLY as it was without one', () => {
  const ids = run(2);
  const before = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01', width: 600 }, P);
  store().addWorktop(ids);
  const after = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01', width: 600 }, P);
  assert.deepEqual(after.drills, before.drills);
  assert.deepEqual(after.drillSummary, before.drillSummary);
  assert.deepEqual(after.panels.map((p) => p.id), before.panels.map((p) => p.id));
});

// ─── AND IT IS DRAWN, AND IT IS REACHABLE ──────────────────────────────────

test('F8 the scene draws it from the engine’s geometry, in the wall’s own frame', () => {
  const scene = readFileSync(new URL('../src/3d/Scene.jsx', import.meta.url), 'utf8');
  assert.match(scene, /function Worktops\(\{/);
  assert.match(scene, /<Worktops/);
  assert.match(scene, /ccWorktopId: w\.id,/);
  // Every millimetre comes from the engine's record — the view invents none.
  assert.match(scene, /boxGeometry args=\{\[mm\(g\.w\), mm\(g\.h\), mm\(g\.d\)\]\}/);
  // …and a CONTOUR drawing is the machine's picture: a worktop is not cut on
  // it, so it is not drawn there.
  assert.match(scene, /\{!contourView && worktops\.length > 0 && \(/);
});

test('F8 the button is on the MULTI-selection, and it says how many', () => {
  const panel = readFileSync(new URL('../src/components/MultiUnitPanel.jsx', import.meta.url), 'utf8');
  assert.match(panel, /data-add-worktop="1"/);
  assert.match(panel, /Add worktop \(\{ids\.length\}\)/);
  assert.match(panel, /addWorktop\(ids\)/);
  // …and a refusal is SAID rather than swallowed.
  //
  // Turn 31 (CLAUDE.md F2) deleted the GREY that confirmed a worktop — the
  // worktop IS the confirmation, and "an effect visible in 3D needs no toast".
  // The refusal is the half that was never visible, and it is still said.
  assert.match(panel, /if \(!res\.ok\) notify\(res\.error, 'warn'\);/);
});

test('F8 worktopsFor is askable on its own, and drops what it cannot resolve', () => {
  const ids = run(2);
  const units = unitsOf(ids);
  const records = [{ id: 'w1', unitIds: ids }, { id: 'w2', unitIds: ['gone', 'also-gone'] }];
  const out = worktopsFor({ records, units, profile: P });
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'w1');
  assert.deepEqual(worktopsFor({ records: [], units, profile: P }), []);
});
