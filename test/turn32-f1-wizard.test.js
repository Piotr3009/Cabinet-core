// ─── Turn 32, CLAUDE.md F1: the wizard's settings step, rebuilt ─────────────
//
// The owner walked the old step 4 on a screenshot and dictated the shape. The
// rules that matter are all pure functions, held to their word here:
//
//   · the DEPTH SEED follows the PROJECT TYPE — a wardrobe project seeds 568
//     from `profile.wardrobe.defaults.depth`, fixed at the source
//     (`projectDepth`), so the wizard row and `addUnit` agree by construction;
//   · the wardrobe's `total item = wardrobe + legs` line and its two guards —
//     taller than the room is an ERROR, within the question gap of the
//     ceiling is a QUESTION ("To the ceiling, with no infill?");
//   · three front types now ([1] [2] [3]), each with its own door SHAPE from
//     the gallery — shape first, colour second;
//   · no assignment → no Start. Generic counts; nothing does not.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import {
  migrateDesign, projectHeights, resolveUnitDesign,
} from '../src/engine/design.js';
import {
  ceilingFit, ceilingQuestionMm, materialsAssigned, projectDepth, setFrontTypeCount,
  wardrobeStack, wizardStartBlockers,
} from '../src/engine/projectSettings.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();
const unitOf = (id) => store().units.find((u) => u.id === id);

function project(design = {}, height = 2500) {
  store().loadProject({
    id: null,
    name: 't32-f1',
    room: migrateRoom({ height, corners: rectCorners(6000, 3000) }),
    design,
  }, []);
}

// ─── F1.3: the depth seed follows the project type ──────────────────────────

test('a wardrobe project seeds depth from the wardrobe default, 568', () => {
  assert.equal(P.wardrobe.defaults.depth, 568, 'the owner’s 568 (chat fix 15.08.2026)');
  const wardrobe = migrateDesign({ projectType: 'wardrobe' });
  assert.equal(projectDepth(wardrobe, P), P.wardrobe.defaults.depth);
});

test('every other project keeps the kitchen’s 558, and a typed depth wins everywhere', () => {
  assert.equal(projectDepth(migrateDesign(null), P), P.baseUnit.defaults.depth);
  assert.equal(projectDepth(migrateDesign({ projectType: 'kitchen' }), P), P.baseUnit.defaults.depth);
  assert.equal(projectDepth(migrateDesign({ projectType: 'wardrobe', depth: 600 }), P), 600);
});

test('addUnit in a wardrobe project stamps the 568 — one function, both readers', () => {
  project({ projectType: 'wardrobe' });
  const { id } = store().addUnit('WARDROBE');
  assert.equal(unitOf(id).params.depth, P.wardrobe.defaults.depth);
  // …and a kitchen project still stamps 558, exactly as before this turn.
  project({});
  const { id: bud } = store().addUnit('BUD');
  assert.equal(unitOf(bud).params.depth, P.baseUnit.defaults.depth);
});

// ─── F1.3: total item = wardrobe + legs, and the two guards ─────────────────

test('the live total is wardrobe + plinth, off the resolved heights', () => {
  const design = migrateDesign({ projectType: 'wardrobe', heights: { tall: 2400, toeKick: 100 } });
  const stack = wardrobeStack(projectHeights(design, P));
  assert.deepEqual(stack, { height: 2400, plinth: 100, total: 2500 });
});

test('taller than the room is an ERROR; within the question gap is a QUESTION', () => {
  assert.equal(ceilingQuestionMm(P), 40, 'the owner’s threshold, 15.08.2026');
  assert.equal(ceilingFit({ total: 2600, roomHeight: 2500, profile: P }).state, 'over');
  assert.equal(ceilingFit({ total: 2500, roomHeight: 2500, profile: P }).state, 'question');
  assert.equal(ceilingFit({ total: 2461, roomHeight: 2500, profile: P }).state, 'question');
  assert.equal(ceilingFit({ total: 2460, roomHeight: 2500, profile: P }).state, 'ok');
  assert.equal(ceilingFit({ total: 2000, roomHeight: 0, profile: P }).state, 'ok', 'no room, no guard');
});

test('the question blocks Start until it is answered — either way', () => {
  const base = {
    projectType: 'wardrobe',
    heights: { tall: 2400, toeKick: 100 },
    carcass: { types: [{ id: 'c1', label: 'Carcass 1', material_id: 'generic-18' }] },
    fronts: { types: [{ id: 'f1', label: 'Front 1', material_id: 'generic-18' }] },
  };
  const ask = wizardStartBlockers({
    design: migrateDesign(base), heights: projectHeights(migrateDesign(base), P), roomHeight: 2500, profile: P,
  });
  assert.deepEqual(ask.blockers.map((b) => b.code), ['ceiling-question']);

  for (const answer of ['flush', 'infill']) {
    const answered = migrateDesign({ ...base, ceiling: answer });
    const ok = wizardStartBlockers({
      design: answered, heights: projectHeights(answered, P), roomHeight: 2500, profile: P,
    });
    assert.deepEqual(ok.blockers, [], `"${answer}" answers the question`);
  }
});

test('a wardrobe over the ceiling cannot continue', () => {
  const design = migrateDesign({
    projectType: 'wardrobe',
    heights: { tall: 2600, toeKick: 100 },
    carcass: { types: [{ id: 'c1', label: 'Carcass 1', material_id: 'generic-18' }] },
    fronts: { types: [{ id: 'f1', label: 'Front 1', material_id: 'generic-18' }] },
  });
  const { blockers } = wizardStartBlockers({
    design, heights: projectHeights(design, P), roomHeight: 2500, profile: P,
  });
  assert.deepEqual(blockers.map((b) => b.code), ['over-ceiling']);
});

test('the ceiling answer survives migration; anything else does not', () => {
  assert.equal(migrateDesign({ ceiling: 'flush' }).ceiling, 'flush');
  assert.equal(migrateDesign({ ceiling: 'infill' }).ceiling, 'infill');
  assert.equal(migrateDesign({ ceiling: 'yes' }).ceiling, null);
  assert.equal(migrateDesign(null).ceiling, null);
});

// ─── F1.5: no assignment → no Start; Generic IS an assignment ───────────────

test('choosing generic IS an assignment; choosing nothing is not', () => {
  const empty = migrateDesign({
    carcass: { types: [{ id: 'c1', label: 'Carcass 1' }] },
    fronts: { types: [{ id: 'f1', label: 'Front 1' }] },
  });
  const before = materialsAssigned(empty, P);
  assert.equal(before.all, false);
  assert.deepEqual(before.missing.map((s) => s.label), ['Carcass 1', 'Front 1']);

  const generic = migrateDesign({
    carcass: { types: [{ id: 'c1', label: 'Carcass 1', material_id: 'generic-18' }] },
    fronts: { types: [{ id: 'f1', label: 'Front 1', material_id: 'generic-18' }] },
  });
  assert.equal(materialsAssigned(generic, P).all, true);
});

// ─── SUPERSEDED 16.08.2026 (turn 34, CLAUDE.md F1) ─────────────────────────
// This row read "a facing or a colour answers a slot exactly as a board does".
// The owner walked the fronts container that day and ruled the opposite:
// "przywracamy przypisanie materiałów bez różnicy jaki to wybór — czy laminat
// czy mdf czy spray etc" … "bez przypisania materiałów nie powinno puścić
// dalej". A colour is what a front LOOKS like; the board is what it is CUT
// FROM, and only the board answers. Rewritten to the new law, and the full
// sweep lives in test/turn34-f1-wizard-stock-gate.test.js.
test('a facing or a colour does NOT answer a slot — only the board does (T34 F1)', () => {
  const faced = migrateDesign({
    carcass: { types: [{ id: 'c1', label: 'Carcass 1', finish_id: 'decor:W1000' }] },
    fronts: { types: [{ id: 'f1', label: 'Front 1', colour: { hex: '#334455', name: 'Hague Blue' } }] },
  });
  assert.equal(materialsAssigned(faced, P).all, false);
  assert.deepEqual(materialsAssigned(faced, P).missing.map((s) => s.label), ['Carcass 1', 'Front 1']);
  // The carcass's project-wide sprayed colour does not answer for the slot
  // either — it never said what board the box is cut from.
  const sprayed = migrateDesign({
    colour: { carcass: { hex: '#ffffff', name: 'White' } },
    carcass: { types: [{ id: 'c1', label: 'Carcass 1' }] },
    fronts: { types: [{ id: 'f1', label: 'Front 1', material_id: 'generic-18' }] },
  });
  assert.equal(materialsAssigned(sprayed, P).all, false);
  assert.deepEqual(materialsAssigned(sprayed, P).missing.map((s) => s.label), ['Carcass 1']);
  // …and with the board on it, it does.
  const boarded = migrateDesign({
    colour: { carcass: { hex: '#ffffff', name: 'White' } },
    carcass: { types: [{ id: 'c1', label: 'Carcass 1', material_id: 'generic-18' }] },
    fronts: { types: [{ id: 'f1', label: 'Front 1', material_id: 'generic-18' }] },
  });
  assert.equal(materialsAssigned(boarded, P).all, true);
});

test('the blockers only ever speak for the settings step’s own rules', () => {
  // A kitchen with everything assigned: nothing blocks, whatever the room.
  const design = migrateDesign({
    carcass: { types: [{ id: 'c1', label: 'Carcass 1', material_id: 'generic-18' }] },
    fronts: { types: [{ id: 'f1', label: 'Front 1', material_id: 'generic-18' }] },
  });
  const { blockers } = wizardStartBlockers({
    design, heights: projectHeights(design, P), roomHeight: 2100, profile: P,
  });
  assert.deepEqual(blockers, []);
});

// ─── F1.4: three front types, each with its own shape ───────────────────────

test('the owner’s [1] [2] [3] — three front slots now, and they keep their style', () => {
  assert.equal(P.projectSettings.maxFrontTypes, 3);
  assert.equal(setFrontTypeCount([], 3, P).length, 3);
  const kept = migrateDesign({
    fronts: {
      types: [
        { id: 'f1', label: 'Front 1', style: 'S' },
        { id: 'f2', label: 'Front 2', style: 'F' },
        { id: 'f3', label: 'Front 3', style: 'GL' },
      ],
    },
  });
  assert.deepEqual(kept.fronts.types.map((t) => t.style), ['S', 'F', 'GL']);
  // An unknown style is "never said", not an invention.
  assert.equal(migrateDesign({ fronts: { types: [{ id: 'f1', style: 'ZZ' }] } }).fronts.types[0].style, null);
});

test('a unit wearing a front slot wears that slot’s SHAPE', () => {
  const design = migrateDesign({
    fronts: {
      style: 'S',
      types: [
        { id: 'f1', label: 'Front 1' },
        { id: 'f2', label: 'Front 2', style: 'F' },
      ],
    },
  });
  // The slot's own shape…
  assert.equal(resolveUnitDesign({ params: { front_type_id: 'f2' } }, design).frontType, 'F');
  // …a slot with none falls to the project's…
  assert.equal(resolveUnitDesign({ params: { front_type_id: 'f1' } }, design).frontType, 'S');
  assert.equal(resolveUnitDesign({ params: {} }, design).frontType, 'S');
  // …and the unit's own answer still beats everything.
  assert.equal(resolveUnitDesign({ params: { front_type_id: 'f2', front_type: 'GL' } }, design).frontType, 'GL');
});

test('a door style still outranks the slot — it is the more specific decision', () => {
  const design = migrateDesign({
    fronts: { style: 'S', types: [{ id: 'f2', label: 'Front 2', style: 'F' }] },
    doorStyles: [{ id: 'ds1', name: 'Glass look', frontType: 'GL' }],
  });
  const unit = { params: { door_style_id: 'ds1', front_type_id: 'f2' } };
  assert.equal(resolveUnitDesign(unit, design).frontType, 'GL');
});
