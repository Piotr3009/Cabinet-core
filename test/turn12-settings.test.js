// ─── ONE settings surface, one source of truth (turn 12, CLAUDE.md F1) ──────
//
// The owner's report, minutes into using turn 11: "the scene ignores what the
// new menu sets". CLAUDE.md F1.3 asks for the hard test, and this is it —
//
//   set a front colour through EACH entry point → the same store value changes
//
// Both entry points are now the same component (components/SettingsPanel.jsx),
// so what a node test can check is the layer beneath it: the two CONTROLS in
// that component — the front-type colour picker and the sprayed-finish picker —
// and the store actions they call. Turn 11 had them writing to different
// fields, and the field the scene reads was only one of them.
//
// The scene's own repaint is the browser walk's job (F11.1); what is proved
// here is that there is one value for it to repaint FROM.

import test from 'node:test';
import assert from 'node:assert/strict';

import { useProjectStore } from '../src/stores/projectStore.js';
import {
  migrateDesign, resolveFinishes, resolveUnitDesign, withFrontColour,
} from '../src/engine/design.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();
const design = () => migrateDesign(store().project.design);

const NAVY = { hex: '#1b2a4a', name: 'Hague Blue', system: 'F&B' };
const WINE = { hex: '#5e2129', name: 'Wine Red', system: 'RAL' };

function project(d = {}) {
  store().loadProject({
    id: null,
    name: 't12',
    room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
    design: d,
  }, []);
}

// ─── The two halves are one ─────────────────────────────────────────────────

test('front type 1 and the project front colour are the same fact', () => {
  project();
  store().setFrontTypes(2);

  // Entry point A — the FRONT TYPES control (turn 11's step 5 wrote only here).
  const f1 = design().fronts.types[0].id;
  store().setFrontType(f1, { colour: NAVY });
  assert.equal(design().colour.front.hex, NAVY.hex, 'the field every consumer reads followed');
  assert.equal(design().fronts.types[0].colour.hex, NAVY.hex);

  // Entry point B — the SPRAYED FINISH picker (the old modal wrote only here).
  store().setDesign({ colour: { ...design().colour, front: WINE } });
  assert.equal(design().colour.front.hex, WINE.hex);
  assert.equal(design().fronts.types[0].colour.hex, WINE.hex, 'front type 1 followed too');

  // Entry point C — the one setter both controls now call.
  store().setFrontColour(NAVY);
  assert.equal(design().colour.front.hex, NAVY.hex);
  assert.equal(design().fronts.types[0].colour.hex, NAVY.hex);
});

test('what the SCENE reads is what either control set', () => {
  project();
  store().setFrontColour(WINE);
  const unit = { params: {} };
  // `resolveUnitDesign` is what 3d/UnitView and the BOM and the unit card all
  // ask. Before turn 12 it answered `null` after a step-5 edit.
  assert.equal(resolveUnitDesign(unit, design()).colour.hex, WINE.hex);
  const finishes = resolveFinishes(unit, design(), P);
  assert.equal(finishes.front.kind, 'spray');
  assert.equal(finishes.front.hex, WINE.hex);
});

test('front type 2 is a second material, NOT the project default', () => {
  project();
  store().setFrontTypes(2);
  const [, f2] = design().fronts.types;
  store().setFrontType(f2.id, { colour: NAVY });
  assert.equal(design().fronts.types[1].colour.hex, NAVY.hex);
  assert.equal(design().colour.front, null, 'the project front colour is front 1 and only front 1');
});

test('a front type keeps its source when its colour is set, and vice versa', () => {
  project();
  const f1 = design().fronts.types[0]?.id || 'f1';
  store().setFrontType(f1, { source: 'veneer' });
  store().setFrontColour(WINE);
  assert.equal(design().fronts.types[0].source, 'veneer');
  assert.equal(design().colour.front.hex, WINE.hex);
  store().setFrontType(design().fronts.types[0].id, { source: 'laminate' });
  assert.equal(design().colour.front.hex, WINE.hex, 'a source change does not clear the colour');
});

// ─── The migration for cached projects (CLAUDE.md F1.1) ─────────────────────

test('a project cached before turn 12 comes back with both halves filled in', () => {
  // What turn 11's Design-settings modal stored: a colour, no front types.
  const old = migrateDesign({ colour: { front: WINE }, fronts: { types: [{ id: 'f1', label: 'Front 1' }] } });
  assert.equal(old.fronts.types[0].colour.hex, WINE.hex, 'backfilled onto the type');
  assert.equal(old.colour.front.hex, WINE.hex);

  // …and what turn 11's step 5 stored: a type colour, nothing the scene reads.
  const step5 = migrateDesign({ fronts: { types: [{ id: 'f1', label: 'Front 1', colour: NAVY }] } });
  assert.equal(step5.colour.front.hex, NAVY.hex, 'the scene can see it now');
  assert.equal(step5.fronts.types[0].colour.hex, NAVY.hex);
});

test('a design with no front colour anywhere stays uncoloured', () => {
  const d = migrateDesign({});
  assert.equal(d.colour.front, null);
  assert.deepEqual(d.fronts.types, []);
});

test('withFrontColour is pure and does not mutate what it is given', () => {
  const before = migrateDesign({ fronts: { types: [{ id: 'f1', label: 'Front 1', colour: NAVY }] } });
  const snapshot = JSON.stringify(before);
  const after = withFrontColour(before, WINE);
  assert.equal(JSON.stringify(before), snapshot, 'the input is untouched');
  assert.equal(after.colour.front.hex, WINE.hex);
  assert.equal(after.fronts.types[0].colour.hex, WINE.hex);
});

test('clearing the colour clears BOTH halves', () => {
  project();
  store().setFrontColour(WINE);
  store().setFrontColour(null);
  assert.equal(design().colour.front, null);
  assert.equal(design().fronts.types[0].colour, null);
});

// ─── A settings set still carries the whole design ──────────────────────────

test('applying a saved set through setDesign carries the front colour', () => {
  project();
  store().setFrontColour(WINE);
  const saved = design();
  project();                                    // a fresh project
  assert.equal(design().colour.front, null);
  store().setDesign(saved);                     // …the set applied whole
  assert.equal(design().colour.front.hex, WINE.hex);
  assert.equal(design().fronts.types[0].colour.hex, WINE.hex);
});
