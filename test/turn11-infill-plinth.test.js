// ─── Turn 11, CLAUDE.md F5: infill, plinth and small-furniture truths ───────
//
// Four owner verdicts from live use, and one of them is the kind of thing that
// can only be found by LOOKING at the app:
//
//   F5.1  the sideways insets are gone; a side filler can be PINNED instead —
//         it stops vanishing and it stretches as the unit moves
//   F5.2  the infill starts at 40 mm, not 20
//   F5.3  a cabinet with its fillers switched off may be pushed to the wall
//   F5.4  the plinth is at the FRONT, in the FRONT material
//   F5.5  the sink kit was facing the wall
//
// Every expected number is worked out from the profile and the LISP in the
// comment beside it, never read back out of the implementation.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { DEFAULT_DESIGN, migrateDesign } from '../src/engine/design.js';
import { computeCabinet, wearsFrontMaterial } from '../src/engine/cabinet.js';
import { sideInfill } from '../src/engine/autoparts.js';
import { menuActions } from '../src/lib/contextActions.js';
import { useProjectStore, paramsForEngine } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { wallClearance } from '../src/engine/collision.js';

const store = () => useProjectStore.getState();
const unitOf = (id) => store().units.find((u) => u.id === id);
const resultOf = (id) => computeCabinet(paramsForEngine(unitOf(id)), P);
const panelOf = (id, panelId) => resultOf(id).panels.find((p) => p.id === panelId);

function project(design = {}) {
  store().loadProject({
    id: null,
    name: 't11',
    room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
    design,
  }, []);
}

// ─── F5.2: the width a job starts at ────────────────────────────────────────

test('a new project scribes at 40 mm, and the number lives in the profile', () => {
  assert.equal(P.autoParts.sideInfill.defaultWidth, 40);
  assert.equal(DEFAULT_DESIGN.infill.sideWidth, 40, 'the design default IS the profile number');
  assert.equal(migrateDesign(null).infill.sideWidth, 40);
  // A project that has set its own keeps it — this is a starting point.
  assert.equal(migrateDesign({ infill: { sideWidth: 12 } }).infill.sideWidth, 12);
});

test('the unit parks one infill width out, so the gap IS the filler', () => {
  project();
  const { id } = store().addUnit('BUD');
  store().moveUnit(id, -5000, 0);          // drive it hard into the left wall
  assert.equal(unitOf(id).position.x_mm, 40, 'it stops at the 40 mm stop');
  assert.equal(unitOf(id).params.side_infill_left_mm, 40, 'and the gap it left is a piece');
});

// ─── F5.3: fillers off means push to wall ───────────────────────────────────

test('switching the fillers off lets the cabinet go to the wall', () => {
  project();
  const { id } = store().addUnit('BUD');
  store().moveUnit(id, -5000, 0);
  assert.equal(unitOf(id).position.x_mm, 40);

  store().setSideInfillEnabled(id, false);
  store().moveUnit(id, -5000, 0);
  // Not zero: every unit keeps `room.wallBackClearance` off a wall it is not
  // scribed to, because a wall is not flat (turn 8, F3). But the 40 mm stop —
  // which exists only to leave room for a piece nobody is now cutting — is gone.
  assert.equal(unitOf(id).position.x_mm, wallClearance(P));
  assert.equal(unitOf(id).params.side_infill_left_mm, 0, 'and no filler is cut');

  // …and switching them back on puts the stop back.
  store().setSideInfillEnabled(id, true);
  store().moveUnit(id, -5000, 0);
  assert.equal(unitOf(id).position.x_mm, 40);
});

// ─── F5.1: pinning ──────────────────────────────────────────────────────────

test('an unpinned filler vanishes when the unit drives away from the wall', () => {
  // The behaviour pinning exists to overrule, stated first so the pin test
  // below is a comparison rather than an assertion in the air.
  const auto = sideInfill({
    x: 150, width: 600, wallWidth: 6000, others: [], settingWidth: 40,
  }, P);
  assert.equal(auto.left, 0, '150 mm out in the room is not a scribe gap');
});

test('a PINNED filler stays, and stretches past the workshop scribe limit', () => {
  const pinned = sideInfill({
    x: 150, width: 600, wallWidth: 6000, others: [], settingWidth: 40, pinned: { left: true },
  }, P);
  assert.equal(pinned.left, 150, 'the whole gap is the piece');
  assert.ok(150 > P.autoParts.sideInfill.maxWidth,
    'and that is deliberately past maxWidth — CLAUDE.md F5.1 asks for ≥100 mm');
  assert.equal(pinned.right, 0, 'the other side is still automatic');
  assert.deepEqual(pinned.notices, [], 'and it is not an error to be reported');
});

test('a pin cannot invent a gap that is not there', () => {
  // A neighbour hard against that side closes it; a pinned piece there would be
  // cut to nothing and would still appear in the BOM.
  const out = sideInfill({
    x: 600, width: 600, wallWidth: 6000, others: [{ left: 0, right: 600 }], settingWidth: 40, pinned: { left: true },
  }, P);
  assert.equal(out.left, 0);
});

test('pin, move the unit 150 mm, and the filler is 150 mm wider', () => {
  project();
  const { id } = store().addUnit('BUD');
  store().moveUnit(id, -5000, 0);
  assert.equal(unitOf(id).params.side_infill_left_mm, 40);

  store().setSideInfillPinned(id, 'L', true);
  store().moveUnit(id, 40 + 150, 0);
  assert.equal(unitOf(id).position.x_mm, 190);
  assert.equal(unitOf(id).params.side_infill_left_mm, 190,
    'the piece is the whole gap — it stretched with the unit');

  // …and the ENGINE cuts it at that width, through the same INFILL-L path the
  // automatic filler has used since turn 6 (an L in section, not a new part).
  const face = panelOf(id, 'INFILL-L-FACE');
  assert.ok(face, 'the piece is emitted');
  assert.equal(face.w, 190);
  assert.equal(face.role, 'infill');
  assert.ok(panelOf(id, 'INFILL-L-ARM'), 'and past minLWidth it still gets its return arm');

  // Unpinning hands it back to the automatics, and 190 mm out in the room is
  // not a scribe gap, so the piece goes.
  store().setSideInfillPinned(id, 'L', false);
  assert.equal(unitOf(id).params.side_infill_left_mm, 0);
  assert.equal(panelOf(id, 'INFILL-L-FACE'), undefined);
});

test('the menu offers the pins and no longer offers the sideways insets', () => {
  project();
  const { id } = store().addUnit('BUD');
  const ids = menuActions({ unit: unitOf(id), panelPart: 'BUL', store: {} }).map((a) => a.id);
  assert.ok(!ids.includes('insets'), 'the broken concept is gone from the menu');
  assert.ok(ids.includes('pin-infill-L') && ids.includes('pin-infill-R'));
  // …and they are dead entries on a cabinet that takes no fillers at all, which
  // is the one state in which a pin would be a contradiction.
  store().setSideInfillEnabled(id, false);
  const off = menuActions({ unit: unitOf(id), panelPart: 'BUL', store: {} });
  assert.equal(off.find((a) => a.id === 'pin-infill-L').disabled, true);
});

// ─── F5.4: the plinth ───────────────────────────────────────────────────────

test('the plinth is at the FRONT of the cabinet, recessed as a toe kick', () => {
  const r = computeCabinet({
    type: 'BUD', width: 600, height: 770, depth: 558, unit_num: '01', plinth: true,
  }, P);
  const plinth = r.panels.find((p) => p.id === 'PLINTH');
  const t = P.autoParts.plinth.thickness ?? P.board.thickness;
  // z = 0 is the wall, z = D is the carcass front face. A toe kick's own face
  // stands `setback` behind that, which is what a boot clears.
  assert.equal(plinth.box.z + plinth.box.d, 558 - P.autoParts.plinth.setback);
  assert.equal(plinth.box.z, 558 - P.autoParts.plinth.setback - t);
  assert.ok(plinth.box.z > 558 / 2, 'it is in the front half of the cabinet, not against the wall');
});

test('the plinth is cut and sprayed with the doors, not out of the carcass sheet', () => {
  assert.equal(wearsFrontMaterial('plinth'), true);
  const r = computeCabinet({
    type: 'BUD', width: 600, height: 770, depth: 558, unit_num: '01', plinth: true, doors: true,
  }, P);
  const plinth = r.panels.find((p) => p.id === 'PLINTH');
  assert.equal(plinth.material_role, 'front');
  assert.equal(plinth.finish_exposed, true);
});

// ─── F5.5: the sink was facing the wall ─────────────────────────────────────

test('the sink back panel sits 50 mm in from the REAR, where the LISP puts it', () => {
  const r = computeCabinet({
    type: 'SINK', width: 600, height: 770, depth: 558, unit_num: 'S01', shelves: 1,
  }, P);
  const back = r.panels.find((p) => p.id === 'BACK');
  const G = P.board.thickness;
  // KIT_SINK L261: `backSetback 50.0 ;; back panel moved forward by 50mm`, from
  // the rear. The carcass box starts at z = G (the sides do), so 18 + 50 = 68.
  assert.equal(back.box.z, G + P.sinkUnit.backSetback);
  assert.ok(back.box.z < 558 / 2, 'in the back half of the cabinet, not behind the doors');
});

test('…and the shelves stop exactly at the face of that back panel', () => {
  // The arithmetic that PROVES the position rather than asserting it: the shelf
  // loses `backSetback + G` of depth (KIT_SINK L425-426), so its back edge and
  // the back panel's front face are the same plane. With the panel at the front
  // of the cabinet the shelves ran straight through it.
  const r = computeCabinet({
    type: 'SINK', width: 600, height: 770, depth: 558, unit_num: 'S01', shelves: 1,
  }, P);
  const back = r.panels.find((p) => p.id === 'BACK');
  const shelf = r.panels.find((p) => p.part === 'SHELF');
  assert.equal(shelf.box.z, back.box.z + back.box.d);
});

test('the sink FRONT holder is at the front and the BACK holder at the back', () => {
  const r = computeCabinet({
    type: 'SINK', width: 600, height: 770, depth: 558, unit_num: 'S01',
  }, P);
  const G = P.board.thickness;
  const front = r.panels.find((p) => p.id === 'HOLDER-F');
  const back = r.panels.find((p) => p.id === 'HOLDER-B');
  // "G/2 from each edge" (KIT_SINK L47) — the holders are ON the two edges of
  // the carcass, which runs z = G … D.
  assert.equal(front.box.z, 558 - G, 'the front holder is on the front edge');
  assert.equal(front.box.z + front.box.d, 558);
  assert.equal(back.box.z, G, 'the back holder is on the back edge');
  assert.ok(front.box.z > back.box.z, 'and F really is in front of B');
});

test('flipping the sink changed no CUT dimension — the fixture is untouched', () => {
  // fixtures/golden-sink.json records w / h / qty / edging, and F5.5 is a change
  // of POSITION only. This is the check that says so on every run, so the
  // fixture rule cannot be broken by a future tidy-up of the same code.
  const r = computeCabinet({
    type: 'SINK', width: 600, height: 770, depth: 558, board_t: 18, front_t: 25, front_type: 'S', shelves: 1, hinge: 'L', unit_num: 'S01',
  }, P);
  const cut = Object.fromEntries(r.panels.map((p) => [p.id, [p.w, p.h, p.qty, p.edging?.code]]));
  assert.deepEqual(cut['HOLDER-F'], [100, 564, 1, '']);
  assert.deepEqual(cut['HOLDER-B'], [100, 564, 1, '']);
  assert.deepEqual(cut.BACK, [560, 632, 1, '']);
  assert.equal(r.derived.back_w, 560);
  assert.equal(r.derived.back_h, 632);
});
