// ─── TURN 37 (CLAUDE.md F5): TOP BOX — FIVE CORRECTIONS ─────────────────────
//
// The owner walked T36-F7 the same day it landed: *"nadstawka działa super,
// ale…"* — and then five buts, every one of them something he could see:
//
//   (a) WIDTH AUTO — a box placed on a main takes THE MAIN'S WIDTH.
//   (b) HEIGHT DIMENSIONS — *"nie widać wymiarów wysokości w ogóle."*
//   (c) NO OVERLAP, EVER — *"nakładają się jedna na drugą, a to jest
//       niedopuszczalne w naszym programie."*
//   (d) SIDE ORIENTATION — *"orientacja boków jest pozioma, a powinna być
//       pionowa."*
//   (e) THE DOOR BELOW SHORTENS — a top box is an "above neighbour", and the
//       door grows back when the box is removed.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { topNeighbourDemand } from '../src/engine/doors.js';
import { riderOverlapMm, settleRiders } from '../src/engine/topBox.js';
import { grainRun } from '../src/engine/decors.js';
import { CHECKS, runChecks } from '../src/engine/checks.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { unitTop } from '../src/engine/runs.js';

const store = () => useProjectStore.getState();
const unitOf = (id) => store().units.find((u) => u.id === id);

function project() {
  store().newProject({ name: 'T37 F5', type: 'wardrobe' });
  store().setRoom(migrateRoom({ corners: rectCorners(9000, 4000) }));
}

/** A main and the box that rides it, the way the library places them. */
function pair(mainWidth = 900) {
  project();
  const main = store().addUnit('WARDROBE');
  store().updateUnitParams(main.id, { width: mainWidth, height: 2000, doors: { count: 2 } });
  const box = store().addUnit('WARDROBE_TOP', { near: main.id });
  return { main: main.id, box: box.id };
}

// ═══ (a) BORN MATCHED ═══════════════════════════════════════════════════════

test('F5a — a top box is BORN with the main\'s width', () => {
  const { main, box } = pair(900);
  assert.equal(unitOf(box).params.width, 900, 'not the profile\'s 600');
  assert.equal(unitOf(box).params.width, unitOf(main).params.width);
  // …and on a different main, that main's.
  const wide = pair(1200);
  assert.equal(unitOf(wide.box).params.width, 1200);
});

test('F5a — BORN, and only born: the joiner may narrow it afterwards', () => {
  const { main, box } = pair(900);
  store().updateUnitParams(box, { width: 700 });
  assert.equal(unitOf(box).params.width, 700);
  // A settle must not stamp on him. Move the main; the box follows along the
  // wall and keeps the width he chose.
  store().moveUnit(main, 1500, 1);
  assert.equal(unitOf(box).params.width, 700, 'the width he typed survived the settle');
  assert.equal(unitOf(box).position.x_mm, unitOf(main).position.x_mm, 'and it still rides');
});

test('F5a — a box with no main under it keeps the profile\'s own default', () => {
  project();
  const box = store().addUnit('WARDROBE_TOP');
  assert.equal(unitOf(box.id).params.width, P.wardrobe.topBox.defaults.width,
    'nothing to match, so nothing is invented');
});

// ═══ (c) NO OVERLAP, EVER ═══════════════════════════════════════════════════

test('F5c — the box stands ON the main\'s top, and cannot be anywhere else', () => {
  const { main, box } = pair(900);
  // `unitTop` and not `params.height`: the top face is the carcass ON ITS
  // LEGS, which is where a box actually lands.
  assert.equal(unitOf(box).params.mount_height, unitTop(unitOf(main), P));
  // Raise the main: the box goes up with it, still exactly on its top face.
  store().updateUnitParams(main, { height: 1800 });
  assert.equal(unitOf(box).params.mount_height, unitTop(unitOf(main), P));
  assert.equal(riderOverlapMm(unitOf(box), store().units, P).overlap, false);
});

test('F5c — an impossible drop is REPORTED, in red, and named', () => {
  const { main, box } = pair(900);
  // Force it through the main, the way only a hand-edited file could.
  const forced = store().units.map((u) => (u.id === box
    ? { ...u, params: { ...u.params, mount_height: 900 } } : u));
  const over = riderOverlapMm(forced.find((u) => u.id === box), forced, P);
  assert.equal(over.overlap, true);
  assert.equal(Math.round(over.mm), Math.round(unitTop(unitOf(main), P) - 900),
    `${over.mm} mm through`);

  const found = runChecks({ units: forced, design: store().project.design, profile: P })
    .filter((f) => f.check === 15);
  assert.equal(found.length, 1, 'check #15 says so');
  assert.equal(found[0].level, 'red', 'in the house\'s own red');
  assert.match(found[0].message, /THROUGH/);
  assert.equal(found[0].subject.unitId, box, 'and the row flies to the box');
  // Report, never fix: the finding does not move anything.
  assert.equal(forced.find((u) => u.id === box).params.mount_height, 900);
  assert.equal(main && true, true);
});

test('F5c — and the next settle puts it back, with no red left standing', () => {
  const { box } = pair(900);
  const forced = store().units.map((u) => (u.id === box
    ? { ...u, params: { ...u.params, mount_height: 900 } } : u));
  const settled = settleRiders(forced, P);
  assert.equal(settled.find((u) => u.id === box).params.mount_height,
    unitTop(settled.find((u) => u.params.ridden_by), P));
  assert.equal(runChecks({ units: settled, design: store().project.design, profile: P })
    .filter((f) => f.check === 15).length, 0);
});

test('F5c — the rule is in the list, in red, and it is the fifteenth', () => {
  const row = CHECKS.find((c) => c.n === 15);
  assert.ok(row, 'rule 15 exists');
  assert.equal(row.level, 'red');
  assert.match(row.label, /overlapping/i);
  // RE-PINNED 17.08.2026 (T38-F9): two guards on hand-drawn geometry joined
  // the list. Rule 15 is still the fifteenth and still says what it said.
  // RE-PINNED 20.08.2026 (T43-F7): and #18, the runner rung with no article.
  // RE-PINNED 24.08.2026 (T46-F2): and #19, the 400 mm floor under a cut
  // cabinet. Rule 15 is still the fifteenth and still says what it said.
  assert.equal(CHECKS.length, 19);
  assert.equal(CHECKS[14].n, 15);
});

// ═══ (d) THE SIDES STAND VERTICAL ═══════════════════════════════════════════

test('F5d — the box\'s sides run their grain UP the panel, like the main\'s', () => {
  const main = computeCabinet({ ...defaultParamsFor('WARDROBE', P), unit_num: '01', width: 900, height: 2000 }, P);
  const box = computeCabinet({ ...defaultParamsFor('WARDROBE_TOP', P), unit_num: 'WT01', width: 900, height: 500 }, P);
  for (const id of ['BUL', 'BUR']) {
    const m = main.panels.find((p) => p.id === id);
    const b = box.panels.find((p) => p.id === id);
    assert.equal(grainRun(m).axis, 'h', `the main's ${id} stands up`);
    assert.equal(grainRun(b).axis, 'h', `and so does the box's ${id}`);
    // The proof that it is the ROLE and not the proportions: the box's side is
    // WIDER than it is tall (568 deep against 500 high), so the saw's own rule
    // — the longer of the two — would have laid the figure front-to-back.
    assert.ok(b.w > b.h, `${id}: ${b.w} × ${b.h} — wider than it is tall`);
    assert.equal(grainRun(b).lengthMm, b.h, 'and the figure runs the height anyway');
  }
});

test('F5d — a board that is NOT a side keeps the saw\'s own rule', () => {
  // Nothing was made general that should not be: the rule is asked of the role.
  const box = computeCabinet({ ...defaultParamsFor('WARDROBE_TOP', P), unit_num: 'WT01', width: 900, height: 500 }, P);
  const top = box.panels.find((p) => p.id === 'TOP');
  assert.equal(top.role !== 'side', true);
  assert.equal(grainRun(top).axis, top.w >= top.h ? 'w' : 'h', 'the longer side still wins');
});

// ═══ (e) THE DOOR BELOW SHORTENS ════════════════════════════════════════════

test('F5e — a top box is an ABOVE NEIGHBOUR, beside the infill and the cornice', () => {
  assert.equal(topNeighbourDemand({}, P), 0, 'nothing above');
  assert.equal(topNeighbourDemand({ ridden_by: 'u_box' }, P), P.doors.gap, 'a box above');
  assert.equal(topNeighbourDemand({ top_infill_mm: 40 }, P), P.doors.gap, 'the infill still');
  assert.equal(topNeighbourDemand({ cornice: 60 }, P), P.doors.gap, 'the cornice still');
  // …and the three do not add up: it is ONE gap, whatever is standing there.
  assert.equal(topNeighbourDemand({ ridden_by: 'u_box', top_infill_mm: 40, cornice: 60 }, P),
    P.doors.gap);
});

test('F5e — settleRiders STAMPS the host, and un-stamps it when the box goes', () => {
  const { main, box } = pair(900);
  assert.equal(unitOf(main).params.ridden_by, box, 'the main knows what is on it');
  store().removeUnit(box);
  assert.equal('ridden_by' in unitOf(main).params, false,
    'and the stamp is ABSENT, not null, when the box leaves');
});

test('F5e — the main\'s door takes the gap, and GROWS BACK', () => {
  const { main, box } = pair(900);
  const withBox = store().unitResult(main);
  assert.equal(withBox.params.front_top_gap_mm, P.doors.gap);
  const shortened = withBox.panels.filter((p) => p.part === 'FRONT').map((p) => p.h);
  assert.ok(shortened.length, 'the main has doors');

  store().removeUnit(box);
  const without = store().unitResult(main);
  assert.equal(without.params.front_top_gap_mm, 0, 'nothing above it any more');
  const grown = without.panels.filter((p) => p.part === 'FRONT').map((p) => p.h);
  assert.deepEqual(grown.map((h, i) => Math.round(h - shortened[i])), grown.map(() => P.doors.gap),
    'every leaf grew back by exactly the gap');
});

test('F5e — self-healing on EVERY path, not just the one the walk takes', () => {
  // The stamp is written by `settleRiders`, which the store runs on every
  // mutation that could move a main. So the door follows the box whichever
  // door the joiner came in by.
  const { main, box } = pair(900);
  assert.equal(store().unitResult(main).params.front_top_gap_mm, P.doors.gap);
  // …moving the main
  store().moveUnit(main, 2200, 1);
  assert.equal(store().unitResult(main).params.front_top_gap_mm, P.doors.gap);
  // …resizing the main
  store().updateUnitParams(main, { height: 1800 });
  assert.equal(store().unitResult(main).params.front_top_gap_mm, P.doors.gap);
  // …and taking the box away by any route
  store().removeUnit(box);
  assert.equal(store().unitResult(main).params.front_top_gap_mm, 0);
});

test('F5 — a cabinet nothing rides is the cabinet it was yesterday', () => {
  // Iron rule 2, said as a test: every one of these five reaches a unit that
  // has a rider, and the six standard configs have none. A BARE kit call still
  // reads the kit's own 3 — that is T35-F12's law and F5 does not touch it;
  // what F5 decides is what the DESIGN layer hands in, which is 0 with nothing
  // above and 3 with a box.
  const bare = computeCabinet({ ...defaultParamsFor('WARDROBE', P), unit_num: '01' }, P);
  assert.equal(bare.params.front_top_gap_mm, P.doors.gap);
  assert.equal(topNeighbourDemand(bare.params, P), 0);
  assert.equal(riderOverlapMm({ type: 'WARDROBE', params: {} }, [], P).overlap, false);
});
