// ─── Appearance: which finish a piece ends up wearing (BACKLOG #4–#6) ───
//
// Nothing here reaches the cut list — a decor is not a dimension. What it IS is
// a resolution order with four levels (piece role → material type → project →
// profile default) and a rule that reads oddly until it is written down:
// FRONTS DEFAULT TO THE CARCASS. So it is tested rather than eyeballed.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { finishById, migrateDesign, resolveFinishes } from '../src/engine/design.js';
import { outlineFor } from '../src/3d/materials.js';
import { computeCabinet } from '../src/engine/cabinet.js';

const unit = (params = {}) => ({
  id: 'u1', type: 'BUD', position: { wall: 0, x_mm: 0 },
  params: { width: 600, height: 770, depth: 558, unit_num: '01', ...params },
});

// ─── the finish list ───

test('the profile ships broken white, light grey and two wood decors', () => {
  const ids = P.appearance.finishes.map((f) => f.id);
  assert.deepEqual(ids, ['broken_white', 'light_grey', 'dark_walnut', 'light_oak']);
  assert.equal(finishById(P, 'broken_white').hex, '#F2F0EC');
  assert.equal(finishById(P, 'light_grey').hex, '#E8E8E6');
  assert.equal(finishById(P, 'nope'), null);

  // A decor carries an image and the size that image represents; a colour does
  // not, and the view must not try to load one.
  for (const id of ['dark_walnut', 'light_oak']) {
    const f = finishById(P, id);
    assert.equal(f.kind, 'decor');
    assert.match(f.texture, /^textures\/.+\.png$/);
    assert.ok(f.repeatMm > 0);
  }
  for (const id of ['broken_white', 'light_grey']) {
    assert.equal(finishById(P, id).kind, 'colour');
    assert.equal(finishById(P, id).texture, undefined);
  }
});

// ─── resolution ───

test('a project with nothing set is neutral, and its fronts match its carcass', () => {
  const { carcass, front } = resolveFinishes(unit(), migrateDesign(null), P);
  assert.equal(carcass.id, 'broken_white');
  assert.equal(front.id, 'broken_white', 'fronts default TO THE CARCASS, not to a colour of their own');
});

test('the project default is the carcass, and the fronts follow it', () => {
  const design = migrateDesign({ finish: { carcass: 'dark_walnut', front: null } });
  const { carcass, front } = resolveFinishes(unit(), design, P);
  assert.equal(carcass.id, 'dark_walnut');
  assert.equal(front.id, 'dark_walnut');

  // …unless the fronts are named separately.
  const split = migrateDesign({ finish: { carcass: 'dark_walnut', front: 'light_oak' } });
  const both = resolveFinishes(unit(), split, P);
  assert.equal(both.carcass.id, 'dark_walnut');
  assert.equal(both.front.id, 'light_oak');
});

test('a decor is chosen per MATERIAL, and beats the project default', () => {
  const design = migrateDesign({
    finish: { carcass: 'light_grey', front: null },
    carcass: {
      types: [
        { id: 'c1', label: 'Carcass 1', material_id: null, finish_id: null },
        { id: 'c2', label: 'Carcass 2', material_id: null, finish_id: 'dark_walnut' },
      ],
    },
  });
  assert.equal(resolveFinishes(unit(), design, P).carcass.id, 'light_grey', 'carcass 1 takes the project finish');
  assert.equal(resolveFinishes(unit({ carcass_type_id: 'c2' }), design, P).carcass.id, 'dark_walnut');
});

test('a door style carries its own finish, which beats the project fronts', () => {
  const design = migrateDesign({
    finish: { carcass: 'broken_white', front: 'light_grey' },
    doorStyles: [{ id: 'ds1', name: 'Walnut slab', frontType: 'F', finish_id: 'dark_walnut' }],
  });
  const plain = resolveFinishes(unit(), design, P);
  assert.equal(plain.front.id, 'light_grey');
  const styled = resolveFinishes(unit({ door_style_id: 'ds1' }), design, P);
  assert.equal(styled.front.id, 'dark_walnut');
  assert.equal(styled.carcass.id, 'broken_white', 'a door style says nothing about the carcass');
});

test('a finish id that no longer exists falls back instead of rendering nothing', () => {
  const design = migrateDesign({ finish: { carcass: 'egger_h1234', front: 'gone' } });
  const { carcass, front } = resolveFinishes(unit(), design, P);
  assert.equal(carcass.id, 'broken_white');
  assert.equal(front.id, 'broken_white');
});

test('the finish survives a save/load round trip through migrateDesign', () => {
  const design = migrateDesign({ finish: { carcass: 'light_oak', front: 'dark_walnut' } });
  const reloaded = migrateDesign(JSON.parse(JSON.stringify(design)));
  assert.deepEqual(reloaded.finish, { carcass: 'light_oak', front: 'dark_walnut' });
  assert.equal(reloaded.carcass.types[0].finish_id, null, 'a type with no decor stays on the project one');
});

// ─── the numbers the view is not allowed to invent ───

test('outline, sheen and contour are profile numbers, and thin/black/subtle', () => {
  const A = P.appearance;
  assert.equal(A.outline.colour, '#1A1A1A', 'black, not brown');
  assert.equal(A.outline.width, 1, 'thin');
  assert.equal(A.sheen.clearcoat, 0.2, '~20 % sheen');
  assert.ok(A.sheen.roughness > 0.4, 'still a matt board underneath, not plastic');
  assert.ok(A.contour.opacity <= 0.1, 'contour view is the outlines, not a ghost of the material');
  // Every role the engine emits must have a shade entry or resolve to none —
  // a missing key would be a bare number appearing in the view instead.
  const roles = new Set(computeCabinet({
    type: 'WARDROBE', width: 1200, height: 2150, depth: 578, unit_num: 'W01',
    drawers: 2, shelves: 1, rail: true, plinth: true, top_infill_mm: 40, side_infill_left_mm: 12,
  }, P).panels.map((p) => p.role));
  for (const role of roles) {
    const shade = A.shade[role] || 0;
    assert.ok(shade >= 0 && shade < 0.35, `${role} shade ${shade} is not a sensible tint`);
  }
});

// ─── selection (turn 6, CLAUDE.md F5) ───

test('the selection is drawing-office navy, dashed and clear of the piece — not gold', () => {
  const S = P.appearance.selection;
  assert.equal(S.colour, P.dimensions.colours.navy,
    'the same ink the measurements are drawn in: both are the TOOL talking');
  assert.notEqual(S.colour.toUpperCase(), '#AA8E68', 'gold is the furniture’s colour, not the selection’s');
  assert.ok(S.offset >= 8 && S.offset <= 12, `CLAUDE.md F5 asks for 8–12 mm clear, not ${S.offset}`);
  assert.ok(S.dash > 0 && S.gap > 0, 'dashed, because no piece of furniture has a dashed edge');
  assert.equal(S.width, 1, 'thin — a selection is a hairline, not a frame');
  assert.ok(S.hoverOpacity > 0 && S.hoverOpacity < 1, 'hover is the same mark, quieter');
});

test('the gold outline is gone from the app, and from every piece', () => {
  // outlineFor no longer takes a `selected` flag at all: a cabinet's edges are
  // black because a cabinet's edges are black, and the mark that says "this
  // one" is a separate box.
  const plain = outlineFor(P, {});
  assert.equal(plain.colour, P.appearance.outline.colour);
  assert.equal(outlineFor(P, { selected: true }).colour, P.appearance.outline.colour,
    'passing the old flag changes nothing — there is no gold path left to reach');
  assert.equal(outlineFor(P, { contour: true }).colour, P.appearance.contour.outline);

  // And the last gold in a FURNITURE colour is gone from the profile.
  const furniture = [
    ...P.appearance.finishes.map((f) => f.hex),
    P.appearance.outline.colour,
    P.appearance.selection.colour,
    ...Object.values(P.appearance.hardware),
  ];
  for (const hex of furniture) {
    assert.notEqual(String(hex).toUpperCase(), '#AA8E68', `${hex} is the brand gold on a piece of furniture`);
  }
});

test('a profile stored before the decors existed still gets them', () => {
  const old = JSON.parse(JSON.stringify(P));
  delete old.appearance;
  const migrated = migrateCabinetProfile(old);
  assert.equal(migrated.appearance.finishes.length, 4);
  assert.equal(migrated.appearance.outline.colour, '#1A1A1A');

  // A workshop that renamed a finish keeps its own label; new finishes arrive
  // alongside it rather than replacing the list.
  const custom = migrateCabinetProfile({
    ...JSON.parse(JSON.stringify(P)),
    appearance: { finishes: [{ id: 'broken_white', label: 'Our white', hex: '#F5F3F0' }] },
  });
  const white = custom.appearance.finishes.find((f) => f.id === 'broken_white');
  assert.equal(white.label, 'Our white');
  assert.equal(white.hex, '#F5F3F0');
  assert.ok(custom.appearance.finishes.some((f) => f.id === 'light_oak'), 'and the shipped decors are still there');
});
