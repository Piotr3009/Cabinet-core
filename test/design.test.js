// ─── Design settings ───
//
// What the project is made of, and how a single unit resolves it. The colour
// lists are NOT tested for content — they are extracted 1:1 from PSW and this
// repo does not get to have an opinion about them — but the shape they arrive
// in, and the fact that nothing is invented, is.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  DEFAULT_DESIGN, DESIGN_SCHEMA, FRONT_STYLE_OPTIONS, migrateDesign, normaliseColour,
  normaliseDoorStyle, resolveUnitDesign, setCarcassTypeCount, colourLabel,
} from '../src/engine/design.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW = JSON.parse(readFileSync(join(HERE, '..', 'reference', 'colors', 'psw-colors.json'), 'utf8'));

const unit = (params = {}) => ({ id: 'u1', type: 'BUD', params: { unit_num: '01', ...params } });

test('a fresh project has one carcass type, a standard front and no colour', () => {
  const d = migrateDesign(null);
  // Turn 9 (CLAUDE.md F5) bumped it to 2 for the sheen rescale; a design is
  // always stamped with the schema the app currently speaks.
  assert.equal(d.schema, DESIGN_SCHEMA);
  assert.equal(d.carcass.types.length, 1);
  assert.equal(d.fronts.style, 'S');
  assert.equal(d.colour.front, null);
  assert.deepEqual(d.doorStyles, []);
  assert.equal(d.infill.sideWidth, DEFAULT_DESIGN.infill.sideWidth);
});

test('carcass types are 1–3, and adding one keeps what is already assigned', () => {
  let d = migrateDesign(null);
  d = setCarcassTypeCount(d, 3);
  assert.equal(d.carcass.types.length, 3);
  d.carcass.types[0].material_id = 'mat_mfc18_white';
  d = setCarcassTypeCount(d, 2);
  assert.equal(d.carcass.types.length, 2);
  assert.equal(d.carcass.types[0].material_id, 'mat_mfc18_white', 'the assignment survived');
  assert.equal(setCarcassTypeCount(d, 9).carcass.types.length, 3, 'never more than three');
  assert.equal(setCarcassTypeCount(d, 0).carcass.types.length, 1, 'never fewer than one');
});

test('a colour is a hex, a name and the system it came from — or it is nothing', () => {
  assert.equal(normaliseColour(null), null);
  assert.equal(normaliseColour({ hex: 'not a colour' }), null);
  assert.equal(normaliseColour({ hex: '#ABC' }), null, 'three-digit hex is not accepted');
  assert.deepEqual(normaliseColour({ hex: '#1F3A5F' }), { hex: '#1f3a5f', name: '#1f3a5f', system: 'custom' });
  assert.deepEqual(normaliseColour({ hex: '#ffffff', name: '9010 Pure White', system: 'RAL' }),
    { hex: '#ffffff', name: '9010 Pure White', system: 'RAL' });
  assert.equal(normaliseColour({ hex: '#ffffff', system: 'Pantone' }).system, 'custom', 'unknown systems fall back');
  assert.equal(colourLabel({ hex: '#ffffff', name: '9010 Pure White', system: 'RAL' }), '9010 Pure White (RAL)');
  assert.equal(colourLabel(null), '—');
});

test('a door style is a name, a front type and a material/colour', () => {
  const style = normaliseDoorStyle({ id: 's1', name: 'Hague Shaker', frontType: 'S', material_id: 'mat_mdf25_shaker', colour: { hex: '#3a4a4a', name: 'Hague Blue', system: 'F&B' } });
  assert.equal(style.name, 'Hague Shaker');
  assert.equal(style.colour.name, 'Hague Blue');
  assert.equal(normaliseDoorStyle({ name: 'no id' }), null, 'a style without an id is not a style');
  assert.equal(normaliseDoorStyle({ id: 's2' }).frontType, 'S', 'front type defaults to the standard');
  assert.equal(normaliseDoorStyle({ id: 's3', frontType: 'Z' }).frontType, 'S', 'an unknown front type is not stored');
});

test('a unit resolves the project default, its style, then its own override', () => {
  const design = migrateDesign({
    fronts: { style: 'F' },
    colour: { front: { hex: '#f2f0e8', name: 'Strong White 2001', system: 'F&B' } },
    doorStyles: [{ id: 's1', name: 'Navy shaker', frontType: 'S', material_id: 'mat_mdf25_shaker', colour: { hex: '#222d5a', name: 'Royal Blue', system: 'RAL' } }],
  });

  // Nothing set on the unit → the project default.
  const plain = resolveUnitDesign(unit(), design);
  assert.equal(plain.frontType, 'F');
  assert.equal(plain.colour.name, 'Strong White 2001');
  assert.equal(plain.doorStyle, null);

  // A style assigned → the style's colour and material.
  const styled = resolveUnitDesign(unit({ door_style_id: 's1', front_type: null }), design);
  assert.equal(styled.colour.name, 'Royal Blue');
  assert.equal(styled.frontMaterialId, 'mat_mdf25_shaker');
  assert.equal(styled.doorStyle.id, 's1');

  // The unit's own colour wins over both.
  const overridden = resolveUnitDesign(
    unit({ door_style_id: 's1', front_colour: { hex: '#5e2028', name: 'Burgundy Red', system: 'RAL' } }),
    design,
  );
  assert.equal(overridden.colour.name, 'Burgundy Red');

  // A style that has been deleted resolves to the project default, not to null.
  const orphan = resolveUnitDesign(unit({ door_style_id: 'gone' }), design);
  assert.equal(orphan.colour.name, 'Strong White 2001');
  assert.equal(orphan.doorStyle, null);
});

test('a unit resolves its carcass material from the project types', () => {
  let design = migrateDesign(null);
  design = setCarcassTypeCount(design, 2);
  design.carcass.types[0].material_id = 'mat_mfc18_white';
  design.carcass.types[1].material_id = 'mat_ply18_birch';

  assert.equal(resolveUnitDesign(unit(), design).carcassMaterialId, 'mat_mfc18_white', 'the first type is the default');
  assert.equal(resolveUnitDesign(unit({ carcass_type_id: 'c2' }), design).carcassMaterialId, 'mat_ply18_birch');
  assert.equal(resolveUnitDesign(unit({ carcass_type_id: 'nope' }), design).carcassMaterialId, 'mat_mfc18_white',
    'an unknown type falls back rather than losing the material');
});

test('a stored design survives a round trip, and an older one is filled in', () => {
  const stored = {
    carcass: { types: [{ id: 'c1', label: 'Boxes', material_id: 'mat_mdf18' }] },
    fronts: { style: 'F' },
    doorStyles: [{ id: 's1', name: 'A', frontType: 'F', colour: { hex: '#000000', name: 'Jet Black', system: 'RAL' } }],
    colour: { front: { hex: '#ffffff', name: 'White', system: 'RAL' } },
    infill: { sideWidth: 35 },
  };
  const once = migrateDesign(stored);
  assert.deepEqual(migrateDesign(once), once, 'migration is idempotent');
  assert.equal(once.carcass.types[0].label, 'Boxes');
  assert.equal(once.infill.sideWidth, 35);

  // A design saved before door styles existed still opens.
  const ancient = migrateDesign({ fronts: { style: 'S' } });
  assert.deepEqual(ancient.doorStyles, []);
  assert.equal(ancient.infill.sideWidth, DEFAULT_DESIGN.infill.sideWidth);
});

test('only the front styles the workshop can actually build are offered', () => {
  assert.deepEqual(FRONT_STYLE_OPTIONS.map((o) => o.id), ['S', 'F']);
  // The handleless J-groove exists in the engine but is not offered as a
  // standard until handles land — the shape keeps a slot for it.
  assert.equal(migrateDesign({ fronts: { style: 'H' } }).fronts.style, 'S');
  assert.equal(migrateDesign(null).fronts.handle, null);
});

// ─── the colour source ───

test('the colour lists are the PSW file, not a copy that can drift', async () => {
  // Imported through the same module the UI uses, so if the extraction file
  // moves or its shape changes, this fails instead of the dropdown going empty.
  const { RAL_GROUPS, FB_GROUPS, SWATCHES, ALL_COLOURS, findColour, contrastInk } = await import('../src/lib/pswColors.js');

  assert.equal(RAL_GROUPS.length, RAW.RAL_OPTS.length);
  assert.equal(FB_GROUPS.length, RAW.FB_OPTS.length);
  assert.equal(SWATCHES.length, RAW.SWATCHES.length);
  assert.equal(
    ALL_COLOURS.length,
    [...RAW.RAL_OPTS, ...RAW.FB_OPTS].reduce((s, [, list]) => s + list.length, 0),
    'every colour in the file is offered',
  );

  // Values pass through unchanged (bar case), names untouched.
  const [firstHex, firstName] = RAW.RAL_OPTS[0][1][0];
  const found = findColour(firstHex);
  assert.equal(found.name, firstName);
  assert.equal(found.system, 'RAL');
  assert.equal(found.hex, firstHex.toLowerCase());

  // The group labels are the file's own.
  assert.deepEqual(RAL_GROUPS.map((g) => g.group), RAW.RAL_OPTS.map(([g]) => g));
  assert.deepEqual(FB_GROUPS.map((g) => g.group), RAW.FB_OPTS.map(([g]) => g));

  // Label contrast: readable on both a dark and a light swatch.
  assert.equal(contrastInk('#0a0a0a'), '#ffffff');
  assert.equal(contrastInk('#fafafa'), '#111111');
});
