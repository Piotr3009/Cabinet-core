// ─── TURN 30 F10 — the project's front style propagates ────────────────────
//
// CLAUDE.md: "Choosing 'flat' in the main menu sets the PROJECT default front
// style; every front without its own override follows. Per-front overrides
// survive, exactly like the hinge finish cascade (profile → company → project →
// element)."
//
// ─── WHAT WAS ACTUALLY WRONG, AND IT WAS NOT THE CASCADE ────────────────────
//
// `engine/design.js resolveUnitDesign` has had the ladder right since turn 13:
//
//     this unit's own `front_type`  →  its door STYLE's  →  the PROJECT's
//
// The fault was that NO CABINET COULD SAY "I have no override".
// `defaultParamsFor` stamps `front_type: profile.front.defaultType` on every
// unit at birth — the fixture contract for a bare `computeCabinet()`, which
// must not move — so inside a project every cabinet looked like it had chosen
// Shaker on purpose. The project's own answer could never reach one, and a job
// set to Flat was still CUT as Shaker.
//
// Two changes, and neither is a formula:
//
//   1. a cabinet placed in a PROJECT is born with `front_type: null` —
//      "nobody has said", the same null every other layer here uses;
//   2. the answer travels the OVERRIDE CHANNEL, in `paramsForEngine`, through
//      the cascade that already existed — never as a change to the engine.
//
// ─── AND THE STORED PROJECTS ────────────────────────────────────────────────
//
// A project saved before tonight has the stamp on every unit. A stored value
// EQUAL TO THE PROFILE'S DEFAULT is read as a stamp rather than as a choice —
// until tonight there was no way to express the difference — and a value that
// DIFFERS is a genuine override and is left exactly alone. A migration with a
// stamp, the shape `SHELF_SCHEMA` already has.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { useProjectStore, paramsForEngine, migrateUnitFrontStyle } from '../src/stores/projectStore.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { FRONT_STYLE_OPTIONS, resolveUnitDesign } from '../src/engine/design.js';

const store = () => useProjectStore.getState();

function project() {
  store().loadProject({
    id: null,
    name: 'front style',
    room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
    design: {},
  }, []);
}

const unitOf = (id) => store().units.find((u) => u.id === id);
const cutAs = (id) => computeCabinet(paramsForEngine(unitOf(id), store().project.design), P).params.front_type;
const setStyle = (id) => store().setDesign({ fronts: { ...store().project.design.fronts, style: id } });

// ─── THE PROPAGATION ────────────────────────────────────────────────────────

test('F10 choosing FLAT in the project cuts every front that has no override as flat', () => {
  project();
  const a = store().addUnit('BUD');
  const b = store().addUnit('BUD');
  store().updateUnitParams(a.id, { doors: true });
  store().updateUnitParams(b.id, { doors: true });
  assert.equal(cutAs(a.id), 'S', 'the project starts on the workshop’s own default');

  setStyle('F');
  assert.equal(cutAs(a.id), 'F');
  assert.equal(cutAs(b.id), 'F', 'both of them — this is a PROJECT answer');
});

test('F10 …and a front with its OWN override survives it', () => {
  project();
  const follows = store().addUnit('BUD');
  const own = store().addUnit('BUD');
  store().updateUnitParams(own.id, { front_type: 'G' });
  setStyle('F');
  assert.equal(cutAs(follows.id), 'F');
  assert.equal(cutAs(own.id), 'G', 'grooved is what somebody asked for');
  // …and handing it back is one write of null, which is the answer that did
  // not exist before tonight.
  store().updateUnitParams(own.id, { front_type: null });
  assert.equal(cutAs(own.id), 'F');
});

test('F10 every style the project offers propagates, not just the one', () => {
  project();
  const u = store().addUnit('BUD');
  store().updateUnitParams(u.id, { doors: true });
  for (const style of FRONT_STYLE_OPTIONS) {
    setStyle(style.id);
    assert.equal(cutAs(u.id), style.id, `${style.label} reaches the cut`);
  }
});

test('F10 a DOOR STYLE sits between the two, exactly where turn 13 put it', () => {
  // The ladder is `unit → its door style → the project`, and the middle rung
  // is not new. A cabinet wearing a workshop door style follows THAT.
  project();
  const u = store().addUnit('BUD');
  const design = {
    ...store().project.design,
    fronts: { ...store().project.design.fronts, style: 'F' },
    doorStyles: [{
      id: 'ds1', name: 'House arched', frontType: 'A', material_id: null,
    }],
  };
  store().setDesign(design);
  store().updateUnitParams(u.id, { door_style_id: 'ds1' });
  assert.equal(resolveUnitDesign(unitOf(u.id), store().project.design).frontType, 'A');
  assert.equal(cutAs(u.id), 'A', 'the door style wins over the project');
  // …and the unit's own still wins over the door style.
  store().updateUnitParams(u.id, { front_type: 'HJ' });
  assert.equal(cutAs(u.id), 'HJ');
});

// ─── A NEW CABINET HAS NO STYLE OF ITS OWN ─────────────────────────────────

test('F10 a cabinet placed in a project is born with NO override', () => {
  project();
  const u = store().addUnit('BUD');
  assert.equal(unitOf(u.id).params.front_type, null, 'nobody has said');
});

test('F10 …while a BARE kit call keeps the stamp, because that is the fixture', () => {
  // `defaultParamsFor` is the fixture contract and must not move: a bare
  // `computeCabinet()` is handed no design at all and cuts what the AutoLISP
  // cuts, whatever any project says.
  assert.equal(defaultParamsFor('BUD', P).front_type, P.front.defaultType);
  const bare = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01' }, P);
  assert.equal(bare.params.front_type, P.front.defaultType);
  // …and it stays that way with a project loaded and set to something else.
  project();
  store().addUnit('BUD');
  setStyle('F');
  assert.equal(computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01' }, P).params.front_type, 'S');
});

// ─── THE STORED PROJECTS ───────────────────────────────────────────────────

test('F10 a saved project’s STAMP is read as "nobody said"; a real choice is kept', () => {
  const stamped = migrateUnitFrontStyle({ params: { front_type: P.front.defaultType } }, P);
  assert.equal(stamped.params.front_type, null);
  const chosen = migrateUnitFrontStyle({ params: { front_type: 'G' } }, P);
  assert.equal(chosen.params.front_type, 'G');
  // It runs ONCE and says so, exactly as the shelf schema does.
  assert.equal(stamped.params.front_style_schema, 1);
  const again = migrateUnitFrontStyle({ params: { front_type: 'G', front_style_schema: 1 } }, P);
  assert.equal(again.params.front_type, 'G');
});

test('F10 loading a project from before this turn makes its fronts follow', () => {
  store().loadProject({
    id: null,
    name: 'old job',
    room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
    design: { fronts: { style: 'F' } },
  }, [
    {
      id: 'u1',
      type: 'BUD',
      position: { wall: 0, x_mm: 0 },
      params: { ...defaultParamsFor('BUD', P), unit_num: '01', doors: true },
    },
    {
      id: 'u2',
      type: 'BUD',
      position: { wall: 0, x_mm: 700 },
      params: {
        ...defaultParamsFor('BUD', P), unit_num: '02', doors: true, front_type: 'A',
      },
    },
  ]);
  assert.equal(cutAs('u1'), 'F', 'the stamped one follows the job');
  assert.equal(cutAs('u2'), 'A', 'and the arched one somebody chose is untouched');
});

// ─── THE CHANNEL, AND NOT A FORMULA ────────────────────────────────────────

test('F10 it travels the OVERRIDE CHANNEL, and the engine gained no rule', () => {
  const store300 = readFileSync(new URL('../src/stores/projectStore.js', import.meta.url), 'utf8');
  assert.match(store300, /front_type: design \? resolveUnitDesign\(unit, design\)\.frontType : p\.front_type,/);
  // The engine's own fallback is untouched — it is the profile's, which is the
  // AutoLISP's.
  const engine = readFileSync(new URL('../src/engine/cabinet.js', import.meta.url), 'utf8');
  assert.match(engine, /frontType: p\.front_type \|\| profile\.front\.defaultType,/);
  assert.doesNotMatch(engine, /design\?\.fronts\?\.style/);
});

test('F10 the unit’s own select can now say "Project default", and names it', () => {
  const panel = readFileSync(new URL('../src/components/RightPanel.jsx', import.meta.url), 'utf8');
  assert.match(panel, /data-unit-front-type="1"/);
  assert.match(panel, /value=\{unit\.params\.front_type \|\| ''\}/);
  assert.match(panel, /front_type: e\.target\.value \|\| null/);
  assert.match(panel, /Project default \(\{profile\.front\.types\[projectFrontStyle\]\?\.label/);
});

// ─── AND IT REALLY IS THE CUT, NOT A LABEL ─────────────────────────────────

test('F10 the front is CUT differently: a shaker has a frame, a flat one does not', () => {
  project();
  const u = store().addUnit('BUD');
  store().updateUnitParams(u.id, { doors: true });
  const frontOf = (id) => computeCabinet(paramsForEngine(unitOf(id), store().project.design), P)
    .panels.find((p) => p.part === 'FRONT');

  setStyle('S');
  const shaker = frontOf(u.id);
  setStyle('F');
  const flat = frontOf(u.id);
  assert.equal(shaker.meta.frontType, 'S');
  assert.equal(flat.meta.frontType, 'F');
  // The shaker's face is machined and the flat one's is not — the pocket is
  // the difference a joiner can see, and it followed the project.
  const pockets = (p) => (p.cnc?.pockets || []).filter((k) => /SHAKER/.test(k.layer)).length;
  assert.ok(pockets(shaker) > 0, 'a shaker carries its panel pocket');
  assert.equal(pockets(flat), 0, 'a flat front carries none');
});
