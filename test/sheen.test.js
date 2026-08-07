// ─── Sheen, spray and board (turn 8, CLAUDE.md F1) ───
//
// Two decisions are being pinned here and they are both Piotr's, taken from
// Spraying-Calc rather than invented:
//
//   1. GLOSS IS A NUMBER FROM 0 TO 25, in fives. It is the scale he quotes
//      people on, so it is the scale the app asks in. `roughness = 1 − s/25`
//      is the one formula between that number and the renderer, and it lives
//      in the engine so the settings panel and the picture cannot disagree.
//
//   2. A SPRAYED COLOUR IS THE COLOUR. Nothing in the room may tint it — no
//      environment probe on a lacquered piece — because a client matching a
//      RAL chip against the screen has to be matching the paint and not the
//      walnut carcass standing next to it. Melamine and decors KEEP the probe:
//      a foil board really does reflect the room, and that reflection is most
//      of what makes one look like a board rather than like coloured paper.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import {
  clampSheen, migrateDesign, projectSheen, resolveFinishes, roughnessFromSheen, sheenLabel,
  sheenSteps,
} from '../src/engine/design.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { surfaceFor } from '../src/3d/materials.js';

const unit = (params = {}) => ({
  id: 'u1', type: 'BUD', position: { wall: 0, x_mm: 0 },
  params: { width: 600, height: 770, depth: 558, unit_num: '01', ...params },
});

// ─── the scale ──────────────────────────────────────────────────────────────

test('the slider is 0 to 25 in fives, and nothing else', () => {
  assert.deepEqual(sheenSteps(P), [0, 5, 10, 15, 20, 25]);
  const S = P.appearance.sheenScale;
  assert.equal(S.min, 0);
  assert.equal(S.max, 25);
  assert.equal(S.step, 5);
  assert.ok(S.default >= S.min && S.default <= S.max);
});

test('a value off the grid lands on the nearest step, and never off the scale', () => {
  assert.equal(clampSheen(12, P), 10);
  assert.equal(clampSheen(13, P), 15);
  assert.equal(clampSheen(-4, P), 0);
  assert.equal(clampSheen(900, P), 25);
  assert.equal(clampSheen('nonsense', P), P.appearance.sheenScale.default);
});

test('the formula is the Spraying one: roughness = 1 − sheen / 25', () => {
  assert.equal(roughnessFromSheen(0, P), 1, 'dead matt');
  assert.equal(roughnessFromSheen(25, P), 0, 'a mirror');
  assert.equal(roughnessFromSheen(15, P), 0.4);
  // Monotone the whole way down — a slider that goes back on itself is a slider
  // nobody trusts.
  const values = sheenSteps(P).map((s) => roughnessFromSheen(s, P));
  for (let i = 1; i < values.length; i += 1) assert.ok(values[i] < values[i - 1]);
});

test('every step has a name a sprayer would recognise', () => {
  const names = sheenSteps(P).map((s) => sheenLabel(s, P));
  assert.equal(names[0], 'Matt');
  assert.equal(names[names.length - 1], 'Mirror');
  assert.equal(new Set(names).size, names.length, 'six steps, six different words');
});

test('a project with no sheen set takes the profile default, and 0 is a real answer', () => {
  assert.equal(projectSheen(migrateDesign(null), P), P.appearance.sheenScale.default);
  assert.equal(projectSheen(migrateDesign({ sheen: 0 }), P), 0,
    'dead matt is a choice; Number(null) being 0 must not be able to fake it');
  assert.equal(migrateDesign(null).sheen, null, 'and "not set" survives the round trip as null');
  assert.equal(migrateDesign(migrateDesign({ sheen: 20 })).sheen, 20);
});

// ─── which piece is sprayed ─────────────────────────────────────────────────

const surfaces = (result, design, opts = {}) => {
  const finishes = resolveFinishes(unit(), design, P);
  const out = new Map();
  for (const p of result.panels) {
    out.set(p.id, surfaceFor({
      role: p.role,
      materialRole: p.material_role,
      finishExposed: p.finish_exposed,
      finishes,
      profile: P,
      sheen: projectSheen(design, P),
      ...opts,
    }));
  }
  return out;
};

const full = () => computeCabinet({
  type: 'BUD', width: 600, height: 770, depth: 558, unit_num: '01',
  doors: { count: 1, hinge: 'L' }, shelves: 1, plinth: true,
  top_infill_mm: 40, side_infill_left_mm: 20,
  end_panels: [{ id: 'ep1', side: 'R' }],
}, P);

test('the pieces that go to the spray booth take the project sheen; board does not', () => {
  const design = migrateDesign({ sheen: 20, colour: { front: { hex: '#1f3a5f', name: 'Hague', system: 'F&B' } } });
  const s = surfaces(full(), design, { frontColour: '#1f3a5f' });

  for (const id of ['01-F', 'END-R', 'INFILL-T-FACE', 'INFILL-L-FACE', 'PLINTH']) {
    const surface = s.get(id);
    assert.ok(surface, `${id} is missing from the unit`);
    assert.equal(surface.sprayed, true, `${id} is sprayed`);
    assert.equal(surface.roughness, roughnessFromSheen(20, P), `${id} follows the sheen`);
  }
  for (const id of ['BUL', 'BUR', 'TOP', 'BOTTOM', 'BACK', 'SHELF-1']) {
    assert.equal(s.get(id).sprayed, false, `${id} is board, not lacquer`);
    assert.equal(s.get(id).roughness, P.appearance.materials.melamine.roughness);
  }
});

test('a sprayed piece refuses the environment probe; board keeps it', () => {
  const design = migrateDesign({ colour: { front: { hex: '#f4f4f0', name: 'White', system: 'RAL' } } });
  const s = surfaces(full(), design, { frontColour: '#f4f4f0' });
  assert.equal(s.get('01-F').envMapIntensity, 0, 'a white door must not pick up the room');
  assert.equal(s.get('01-F').metalness, 0);
  assert.ok(s.get('01-F').normalScale > 0, 'and it carries the gun s own texture');
  assert.equal(s.get('BUL').envMapIntensity, 1, 'a melamine side reflects the room, and should');
});

test('a DECOR front is a foil, not a spray — it keeps the probe whatever the role says', () => {
  // A decor is a printed foil pressed onto board. It is not sprayed, so the
  // spray rules must not reach it just because the piece is an exposed one.
  const design = migrateDesign({ finish: { carcass: 'broken_white', front: 'light_oak' } });
  const s = surfaces(full(), design);
  assert.equal(s.get('01-F').sprayed, false);
  assert.equal(s.get('01-F').envMapIntensity, 1);
  assert.ok(s.get('01-F').texture, 'and it wears its image');
});

// ─── the routing bug (CLAUDE.md F2.3) ───────────────────────────────────────

test('an end panel and an infill wear the FRONT finish, like the doors beside them', () => {
  // Piotr's report: end panels and infills did not take the front material. The
  // engine has said `material_role: 'front'` for both since turn 6 — the view
  // was asking `role === 'front'`, which is true for a door and false for an
  // end panel (`end_panel`) and a filler (`infill`).
  const design = migrateDesign({ finish: { carcass: 'broken_white', front: 'dark_walnut' } });
  const finishes = resolveFinishes(unit(), design, P);
  const r = full();

  for (const p of r.panels) {
    const surface = surfaceFor({
      role: p.role, materialRole: p.material_role, finishExposed: p.finish_exposed, finishes, profile: P,
    });
    const expected = p.material_role === 'front' ? finishes.front : finishes.carcass;
    // The colour a piece ends up with is the finish's, shaded by its role — so
    // the test compares against the SAME shade rather than re-deriving one.
    const control = surfaceFor({
      role: p.role,
      materialRole: expected === finishes.front ? 'front' : 'board',
      finishExposed: p.finish_exposed,
      finishes,
      profile: P,
    });
    assert.deepEqual(surface.colour.toArray(), control.colour.toArray(), `${p.id} wears the wrong finish`);
  }

  const endPanel = r.panels.find((p) => p.part === 'END-PANEL');
  const infill = r.panels.find((p) => p.part === 'INFILL');
  for (const p of [endPanel, infill]) {
    const s = surfaceFor({
      role: p.role, materialRole: p.material_role, finishExposed: p.finish_exposed, finishes, profile: P,
    });
    // dark_walnut is a decor: the give-away is that it carries an image at all.
    assert.ok(s.texture, `${p.id} is on the carcass finish, not the fronts'`);
  }
});

test('a front COLOUR covers an end panel and a filler too — they are sprayed with the doors', () => {
  const design = migrateDesign({ colour: { front: { hex: '#1f3a5f', name: 'Hague', system: 'F&B' } } });
  const finishes = resolveFinishes(unit(), design, P);
  const r = full();
  const paint = '#1f3a5f';
  for (const p of r.panels.filter((x) => x.material_role === 'front')) {
    const s = surfaceFor({
      role: p.role, materialRole: p.material_role, finishExposed: p.finish_exposed,
      finishes, profile: P, frontColour: paint,
    });
    assert.deepEqual(s.colour.getHexString(), '1f3a5f', `${p.id} was not painted`);
  }
  for (const p of r.panels.filter((x) => x.material_role !== 'front')) {
    const s = surfaceFor({
      role: p.role, materialRole: p.material_role, finishExposed: p.finish_exposed,
      finishes, profile: P, frontColour: paint,
    });
    assert.notEqual(s.colour.getHexString(), '1f3a5f', `${p.id} is carcass board and must not be painted`);
  }
});
