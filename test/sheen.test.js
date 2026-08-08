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
  DESIGN_SCHEMA, clampSheen, migrateDesign, projectSheen, resolveFinishes, roughnessFromSheen,
  sheenLabel, sheenSteps,
} from '../src/engine/design.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { surfaceFor } from '../src/3d/materials.js';

const unit = (params = {}) => ({
  id: 'u1', type: 'BUD', position: { wall: 0, x_mm: 0 },
  params: { width: 600, height: 770, depth: 558, unit_num: '01', ...params },
});

// ─── the scale ──────────────────────────────────────────────────────────────

// A design already on the CURRENT scale: it carries the schema stamp, so the
// one-way migration below leaves its sheen alone. This is what every design in
// a running app looks like — loadProject and newProject both migrate on the
// way in — and it is the only way to express "a new-scale 20" in a test.
const current = (sheen, rest = {}) => migrateDesign({ schema: DESIGN_SCHEMA, sheen, ...rest });

test('the slider is 5 to 100 % in fives, and nothing else', () => {
  // A lacquer is ordered as a percentage of gloss. Turn 8 asked in 0–25, which
  // is the same information in a language a paint supplier does not speak.
  const steps = sheenSteps(P);
  assert.equal(steps[0], 5, 'there is no such thing as a 0 % lacquer');
  assert.equal(steps[steps.length - 1], 100);
  assert.equal(steps.length, 20);
  assert.deepEqual(steps.slice(0, 4), [5, 10, 15, 20]);
  const S = P.appearance.sheenScale;
  assert.equal(S.min, 5);
  assert.equal(S.max, 100);
  assert.equal(S.step, 5);
  assert.ok(S.default >= S.min && S.default <= S.max);
});

test('a value off the grid lands on the nearest step, and never off the scale', () => {
  assert.equal(clampSheen(12, P), 10);
  assert.equal(clampSheen(13, P), 15);
  assert.equal(clampSheen(-4, P), 5, 'the floor is dead matt, not nothing');
  assert.equal(clampSheen(900, P), 100);
  assert.equal(clampSheen('nonsense', P), P.appearance.sheenScale.default);
});

test('the formula is the Spraying one: roughness = 1 − sheen / 100', () => {
  assert.equal(roughnessFromSheen(5, P), 0.95, 'dead matt');
  assert.equal(roughnessFromSheen(50, P), 0.5, 'halfway');
  assert.equal(roughnessFromSheen(100, P), 0, 'full gloss');
  // The default is turn 8's default carried across: 15 × 4 = 60, roughness 0.4,
  // which is the two-pack satin turn 6 chose for `materials.lacquer` by eye.
  assert.equal(roughnessFromSheen(P.appearance.sheenScale.default, P), 0.4);
  // Monotone the whole way down — a slider that goes back on itself is a slider
  // nobody trusts.
  const values = sheenSteps(P).map((s) => roughnessFromSheen(s, P));
  for (let i = 1; i < values.length; i += 1) assert.ok(values[i] < values[i - 1]);
});

test('every band has a name a sprayer would recognise', () => {
  assert.equal(sheenLabel(5, P), 'Dead matt');
  assert.equal(sheenLabel(20, P), 'Matt');
  assert.equal(sheenLabel(40, P), 'Eggshell');
  assert.equal(sheenLabel(60, P), 'Satin');
  assert.equal(sheenLabel(80, P), 'Semi-gloss');
  assert.equal(sheenLabel(100, P), 'Gloss');
  // Every stop is named, and the names only ever go up the scale.
  const names = sheenSteps(P).map((s) => sheenLabel(s, P));
  assert.ok(names.every(Boolean));
  const order = ['Dead matt', 'Matt', 'Eggshell', 'Satin', 'Semi-gloss', 'Gloss'];
  const seen = names.map((n) => order.indexOf(n));
  assert.ok(seen.every((v) => v >= 0), 'no word off the list');
  for (let i = 1; i < seen.length; i += 1) assert.ok(seen[i] >= seen[i - 1], 'and never backwards');
});

test('a project with no sheen set takes the profile default', () => {
  assert.equal(projectSheen(migrateDesign(null), P), P.appearance.sheenScale.default);
  assert.equal(migrateDesign(null).sheen, null, 'and "not set" survives the round trip as null');
});

// ─── the migration (turn 9, CLAUDE.md F5) ───────────────────────────────────

test('a sheen saved on the OLD 0–25 scale is multiplied by four, once', () => {
  // The example CLAUDE.md gives, and the one that matters: 20 was a near-mirror
  // on the old scale and would read as nearly dead matt on the new one.
  assert.equal(migrateDesign({ sheen: 20 }).sheen, 80);
  assert.equal(migrateDesign({ schema: 1, sheen: 15 }).sheen, 60, 'the old default becomes the new one');
  assert.equal(migrateDesign({ schema: 1, sheen: 25 }).sheen, 100, 'a mirror stays a mirror');
  // The old 0 has nowhere to go: ×4 is 0, and the clamp lifts it to the
  // flattest lacquer anybody actually sells.
  assert.equal(migrateDesign({ schema: 1, sheen: 0 }).sheen, 5);
});

test('…and only once, however many times a design is read', () => {
  // `migrateDesign` runs on EVERY read — it is how every consumer normalises a
  // design — so a rule with no version behind it would multiply by four again
  // on every render until the value pinned itself at 100.
  const once = migrateDesign({ sheen: 20 });
  assert.equal(once.schema, DESIGN_SCHEMA);
  assert.equal(migrateDesign(once).sheen, 80);
  assert.equal(migrateDesign(migrateDesign(migrateDesign(once))).sheen, 80);
});

test('a value typed on the NEW scale is never rescaled, even where the two overlap', () => {
  // 20 is a legal value on both scales and means opposite ends of the tin. The
  // schema stamp is the only thing that can tell them apart.
  assert.equal(current(20).sheen, 20);
  assert.equal(current(5).sheen, 5);
  assert.equal(projectSheen(current(20), P), 20);
  assert.equal(roughnessFromSheen(projectSheen(current(20), P), P), 0.8, 'a 20 % lacquer is nearly matt');
});

test('a legacy value ABOVE the old scale is left alone — it cannot be an old one', () => {
  assert.equal(migrateDesign({ schema: 1, sheen: 60 }).sheen, 60);
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
  // 80 % — a semi-gloss — on the current scale (turn 9, CLAUDE.md F5).
  const design = current(80, { colour: { front: { hex: '#1f3a5f', name: 'Hague', system: 'F&B' } } });
  const s = surfaces(full(), design, { frontColour: '#1f3a5f' });

  for (const id of ['01-F', 'END-R', 'INFILL-T-FACE', 'INFILL-L-FACE', 'PLINTH']) {
    const surface = s.get(id);
    assert.ok(surface, `${id} is missing from the unit`);
    assert.equal(surface.sprayed, true, `${id} is sprayed`);
    assert.equal(surface.roughness, roughnessFromSheen(80, P), `${id} follows the sheen`);
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
