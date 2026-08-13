// ─── TURN 29 F3 — the D/W's front and plinth join the standard controls ─────
//
// The owner: *"front i plinth powinien być tak samo włączany jak cała reszta
// szafek, tymi samymi przyciskami."*
//
// Turn 28 hard-wired both. The face was emitted whenever the kit was a D/W —
// `if (type.frontOpens === 'drop')`, no question asked — and the plinth toggle
// was hidden because the right panel gated it on `type.legs`, and this kit has
// none (the machine stands where they would be). So the two pieces a joiner is
// most likely to want off were the two he could not switch off.
//
// THE LAW: the SAME controls, with turn 28's composition as the DEFAULTS —
// front on, plinth on. Switching either off takes the piece out of the scene,
// the sheets and the BOM exactly as it does on a BUD. The TOP rail is the one
// fixed piece: a dishwasher between two carcasses needs the board that ties
// them together and carries the worktop, and there is nothing else to take off.
//
// What does NOT move: `interiorOccupied`, the 45° drop, 594 rigid, the notched
// toe kick, and the fact that the face carries no cup — all of which are turn
// 27 and turn 28 laws and are asserted here as the guard on this change.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor, getUnitType } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { takesPlinth } from '../src/engine/autoparts.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const dw = (extra = {}) => computeCabinet(
  { ...defaultParamsFor('DW_PANEL', P), unit_num: '01', ...extra }, P,
);
const bud = (extra = {}) => computeCabinet(
  { ...defaultParamsFor('BUD', P), unit_num: '01', ...extra }, P,
);
const parts = (r) => r.panels.map((p) => p.part).sort();

const store = () => useProjectStore.getState();
function project() {
  store().loadProject({
    id: null, name: 't29-f3', room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }), design: {},
  }, []);
}

// ─── the DEFAULTS are turn 28's composition ─────────────────────────────────

test('F3 a D/W still arrives as a FRONT, a RAIL and a PLINTH', () => {
  assert.deepEqual(parts(dw()), ['FRONT', 'PLINTH', 'TOP']);
  const defaults = defaultParamsFor('DW_PANEL', P);
  assert.equal(defaults.plinth, true, 'the toe kick arrives fitted');
  assert.equal(defaults.doors, true, 'and so does the face');
});

test('F3 …and a unit PLACED IN A ROOM arrives the same way, through the store', () => {
  project();
  const added = store().addUnit('DW_PANEL');
  const unit = store().units.find((u) => u.id === added.id);
  assert.equal(unit.params.doors, true, 'the store agrees with the kit');
  assert.equal(unit.params.plinth, true);
  assert.deepEqual(parts(store().unitResult(added.id)), ['FRONT', 'PLINTH', 'TOP']);
  // …while a BUD still waits to be asked, which is SPEC 4.10 and is what makes
  // the D/W's default a DECISION rather than a change of rule.
  const budAdded = store().addUnit('BUD');
  assert.equal(store().units.find((u) => u.id === budAdded.id).params.doors, false);
});

// ─── the SAME buttons ───────────────────────────────────────────────────────

test('F3 the front comes off with the ordinary door control, and comes back', () => {
  const off = dw({ doors: false });
  assert.deepEqual(parts(off), ['PLINTH', 'TOP'], 'the face is gone from the CUT LIST');
  assert.equal(off.derived.doors, 0);
  // …and it is gone from the SHEET and the BOM with it, because it was never a
  // second path: it is a panel, and a panel that is not cut is not anywhere.
  assert.ok(!off.csvLines.some((l) => l.includes('-F,') || l.includes('-F ')), 'no front line');
  assert.ok(off.totals.front_area_m2 < dw().totals.front_area_m2);

  const back = dw({ doors: true });
  assert.deepEqual(parts(back), ['FRONT', 'PLINTH', 'TOP']);
  assert.equal(back.derived.doors, 1);
});

test('F3 the plinth comes off with the ordinary plinth toggle, and comes back', () => {
  assert.deepEqual(parts(dw({ plinth: false })), ['FRONT', 'TOP']);
  assert.deepEqual(parts(dw({ plinth: true })), ['FRONT', 'PLINTH', 'TOP']);
});

test('F3 both off leaves the RAIL, and the rail is the only fixed piece', () => {
  const bare = dw({ doors: false, plinth: false });
  assert.deepEqual(parts(bare), ['TOP']);
  const rail = bare.panels[0];
  // …and it is turn 28's rail to the hundredth: full UNIT width, full run
  // depth, and nothing machined into it.
  assert.equal(rail.w, 600);
  assert.equal(rail.h, 540);
  assert.deepEqual(rail.cnc.pockets, []);
  assert.deepEqual(rail.cnc.holes, []);
  assert.equal(bare.drills.length, 0, 'nothing to bore');
  assert.deepEqual(bare.hardware, [], 'nothing to buy');
});

test('F3 the PANEL offers the plinth toggle, off the engine’s own gate', () => {
  // The store and the engine have agreed since turn 22 that legs and a toe
  // kick are two questions; the right panel was the third opinion.
  assert.equal(getUnitType('DW_PANEL').legs, false, 'no legs — the machine is there');
  assert.equal(takesPlinth('DW_PANEL', P), true, 'and a toe kick all the same');
  const panel = readFileSync(new URL('../src/components/RightPanel.jsx', import.meta.url), 'utf8');
  assert.match(panel, /\{takesPlinth\(unit\.type, profile\) && type\.mount === 'floor' \? \(/);
  assert.doesNotMatch(panel, /\{type\.legs && type\.mount === 'floor' \? \(/, 'the old gate is gone');
  // …and the door control is offered because the TYPE says it has a front.
  assert.equal(getUnitType('DW_PANEL').supports.doors, true);
});

// ─── and none of it is a hinge ──────────────────────────────────────────────

test('F3 the face still hangs on NOTHING — no cup, no plate, no hinge on the order', () => {
  const r = dw();
  assert.equal(r.drills.filter((d) => d.kind === 'cup').length, 0, 'no ⌀35 cup');
  assert.equal(r.drills.filter((d) => d.kind === 'hinge').length, 0, 'no ⌀5 plate pattern');
  assert.deepEqual(r.drillSummary.hinge_centers, []);
  assert.deepEqual(r.drillSummary.hinged_sides, []);
  assert.equal(r.totals.hinges, 0);
  assert.deepEqual(r.hardware, []);
  // The whole kit bores nothing at all, which is the sentence turn 28 wrote.
  assert.equal(r.drills.length, 0);
  // …and every drilling that IS addressed goes to a board that exists — the
  // fault this turn's `hingedSides` gate stops, six ⌀5 holes into a BUL that
  // this kit does not cut.
  const cut = new Set(r.panels.map((p) => p.id));
  for (const d of r.drills) assert.ok(cut.has(d.panel), `${d.panel} is a board this kit cuts`);
});

test('F3 the face is still 594 × 767, drops 45° about its bottom, and is a FRONT', () => {
  const face = dw().panels.find((p) => p.part === 'FRONT');
  assert.equal(face.w, 594, 'rigid — over 600 and the appliance door fouls its neighbours');
  assert.equal(face.h, 767);
  assert.equal(face.meta.opening, 'drop');
  assert.equal(face.meta.openAngleDeg, 45);
  assert.equal(face.meta.appliance, 'dw');
  assert.equal(face.role, 'front');
  // The shaker and the handle laws still reach it — they are read off the
  // PIECE, and this turn did not touch that.
  const shaker = dw({ front_type: 'S' }).panels.find((p) => p.part === 'FRONT');
  assert.ok(shaker.cnc.pockets.length > 0, 'a shaker face is machined like any other');
});

test('F3 …and nothing about the INTERIOR changed: the machine still occupies it', () => {
  assert.equal(getUnitType('DW_PANEL').interiorOccupied, true);
  const r = dw({ shelves: 2, drawers: 2 });
  assert.deepEqual(parts(r), ['FRONT', 'PLINTH', 'TOP'], 'nothing goes inside a dishwasher');
});

test('F3 the toe kick is still the run’s own, notched 20 mm from the top', () => {
  const kick = dw().panels.find((p) => p.part === 'PLINTH');
  assert.equal(kick.h, 100, 'the project’s toe kick');
  assert.equal(getUnitType('DW_PANEL').plinthCutFromTop, 20);
  // The notch is in the OUTLINE — a relief for the appliance door — and it is
  // what makes this kick a different board from a BUD's. On a D/W standing on
  // its own the relief is the whole width, so what is left is the 20 mm strip
  // along the top: the board is drawn from y 80 to y 100, not from 0.
  assert.deepEqual(kick.cnc.outline, [[0, 80], [600, 80], [600, 100], [0, 100]]);
  const plain = bud({ plinth: true }).panels.find((p) => p.part === 'PLINTH');
  assert.deepEqual(plain.cnc.outline, [[0, 0], [600, 0], [600, 100], [0, 100]],
    'a BUD’s toe kick is the whole board — the relief is the D/W’s alone');
  const at50 = dw({ leg_height: 50 }).panels.find((p) => p.part === 'PLINTH');
  assert.equal(at50.h, 50, 'and it follows the project, not a constant');
});

// ─── every other kit is untouched ───────────────────────────────────────────

test('F3 a BUD is byte-for-byte the cabinet it was', () => {
  const r = bud({ doors: { count: 1, hinge: 'L' } });
  assert.equal(r.derived.doors, 1);
  assert.equal(r.drillSummary.hinge_centers.length, 3);
  assert.deepEqual(r.drillSummary.hinged_sides, ['BUL']);
  assert.equal(r.totals.hinges, 3);
  assert.equal(defaultParamsFor('BUD', P).doors, null, 'still derived from the width');
  assert.equal(defaultParamsFor('BUD', P).plinth, undefined, 'still a decision');
  // A pair of doors, and the two counts still agree on every ordinary kit.
  const two = bud({ width: 900, doors: { count: 2 } });
  assert.equal(two.derived.doors, 2);
  assert.equal(two.totals.hinges, 6);
});

test('F3 the two counts are one number on every kit but this one', () => {
  // `leafCount` (what the face HAS) and `hingedLeafCount` (what hangs on cups)
  // are the same on every type that is not a drop front, which is what makes
  // the split safe: nothing else in the BOM or the export can have moved.
  const src = readFileSync(new URL('../src/engine/cabinet.js', import.meta.url), 'utf8');
  assert.match(src, /const leafCount = dropsForward \? Math\.min\(1, doorCount\) : \(bayDoors\.length \|\| doorCount\);/);
  assert.match(src, /const hingedLeafCount = dropsForward \? 0 : \(bayDoors\.length \|\| doorCount\);/);
  for (const id of ['BUD', 'BUDTALL', 'WUD', 'SINK', 'WARDROBE', 'LOW_CABINET']) {
    const r = computeCabinet({ ...defaultParamsFor(id, P), unit_num: '01', doors: true }, P);
    const leaves = r.panels.filter((p) => p.part === 'FRONT' && p.role === 'front').length;
    assert.equal(r.derived.doors, leaves, `${id}: every front is a leaf`);
    assert.equal(r.totals.hinges, r.drillSummary.hinge_centers.length * leaves, `${id}: and every leaf is hung`);
  }
});
