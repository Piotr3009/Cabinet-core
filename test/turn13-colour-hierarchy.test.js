// ─── Colour: project → unit → element (turn 13, CLAUDE.md F3) ───────────────
//
// The owner set the project colours in step 5, then edited ONE cabinet — and
// the whole job changed colour. It did, and this file is the fix stated as
// properties rather than as a screenshot.
//
// THE DIAGNOSIS. There was no unit level on the FRONT side at all. A unit could
// point at one of the project's CARCASS types (`carcass_type_id`, resolved
// since turn 11) and could carry a free colour nothing in the UI ever wrote
// (`front_colour`), but there was no pointer at the project's FRONT types — so
// the only control a unit's panel could offer was "Design settings…", which
// opens the PROJECT surface. A joiner reaching for "this cabinet's colour" got
// the project's, with nothing to tell him.
//
// THE FIX, in three properties:
//   1. `front_type_id` — a unit-level POINTER INTO THE PALETTE, resolved above
//      the project and below an element override;
//   2. `projectPalette` — the list a unit picker may offer, which is exactly
//      what step 5 defined and nothing else (F3.2);
//   3. the store writes UNITS. `setUnitFinish` cannot reach the design, and a
//      change to one cabinet leaves its neighbours alone (F3.4).

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_DESIGN, migrateDesign, projectPalette, resolveFinishes, resolveUnitDesign,
  unitFinishOverride, withFrontColour,
} from '../src/engine/design.js';
import { buildBom } from '../src/engine/bom.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const NAVY = { hex: '#1f3a5f', name: 'Navy', system: 'RAL' };
const WINE = { hex: '#5e2028', name: 'Wine Red', system: 'RAL' };

const store = () => useProjectStore.getState();
const unitOf = (id) => store().units.find((u) => u.id === id);

/** A project whose palette step 5 has filled in: two carcasses, two fronts. */
function palettedDesign() {
  let d = migrateDesign({
    ...DEFAULT_DESIGN,
    carcass: {
      types: [
        { id: 'c1', label: 'Carcass 1', material_id: null, finish_id: null },
        { id: 'c2', label: 'Carcass 2', material_id: null, finish_id: null },
      ],
    },
    fronts: {
      style: 'S',
      handle: null,
      types: [
        { id: 'f1', label: 'Front 1', source: 'RAL', colour: NAVY, material_id: null },
        { id: 'f2', label: 'Front 2', source: 'RAL', colour: WINE, material_id: null },
      ],
    },
  });
  d = withFrontColour(d, NAVY, 'f1');
  return d;
}

const unit = (params = {}) => ({ id: 'u1', type: 'BUD', params: { unit_num: '01', ...params } });

// ─── F3.2 — the picker offers the PALETTE and nothing else ──────────────────

test('THE PALETTE is exactly what step 5 defined — Carcass 1..n, Front 1..n', () => {
  const palette = projectPalette(palettedDesign(), P);
  assert.deepEqual(palette.map((p) => p.label), ['Carcass 1', 'Carcass 2', 'Front 1', 'Front 2']);
  assert.deepEqual(palette.map((p) => p.kind), ['carcass', 'carcass', 'front', 'front']);
  // The keys are unique ACROSS the kinds: a carcass and a front may both be
  // called `f1` in principle, and a picker keyed on the bare id would tick two.
  assert.equal(new Set(palette.map((p) => p.key)).size, palette.length);
});

test('…and it carries the colours, so the picker is swatches and not a word list', () => {
  const palette = projectPalette(palettedDesign(), P);
  const fronts = palette.filter((p) => p.kind === 'front');
  assert.equal(fronts[0].hex, NAVY.hex);
  assert.equal(fronts[1].hex, WINE.hex);
});

test('a project that never opened step 5 still has a front to offer', () => {
  const palette = projectPalette(DEFAULT_DESIGN, P);
  assert.deepEqual(palette.map((p) => p.label), ['Carcass 1', 'Front 1']);
  // No full colour lists anywhere in it — the count IS the guarantee. A picker
  // built from this cannot show a RAL fan deck, because there is none in it.
  assert.ok(palette.length <= 5, `a palette of ${palette.length} is not a palette`);
});

test('the palette never exceeds the project settings’ own maxima', () => {
  const many = migrateDesign({
    carcass: { types: Array.from({ length: 6 }, (_, i) => ({ id: `c${i}`, label: `C${i}` })) },
    fronts: { types: Array.from({ length: 6 }, (_, i) => ({ id: `f${i}`, label: `F${i}` })) },
  });
  const palette = projectPalette(many, P);
  assert.equal(palette.filter((p) => p.kind === 'carcass').length, 3, 'three carcass types is the ceiling');
  assert.equal(palette.filter((p) => p.kind === 'front').length, 2, '…and two front types');
});

// ─── F3.1 / F3.3 — the resolution order ─────────────────────────────────────

test('THE ORDER: a unit’s own front type beats the project’s', () => {
  const d = palettedDesign();
  assert.equal(resolveUnitDesign(unit(), d).colour.hex, NAVY.hex, 'no override: the project');
  assert.equal(resolveUnitDesign(unit({ front_type_id: 'f2' }), d).colour.hex, WINE.hex,
    'the unit points at Front 2, so it wears Front 2');
});

test('…and the project is untouched by it — that IS the bug that was reported', () => {
  const d = palettedDesign();
  const before = JSON.parse(JSON.stringify(d));
  resolveUnitDesign(unit({ front_type_id: 'f2' }), d);
  assert.deepEqual(migrateDesign(d), before, 'resolving a unit may not write the design');
  assert.equal(d.colour.front.hex, NAVY.hex, 'the project front colour is still Front 1’s');
});

test('a unit’s carcass type resolves the same way, as it has since turn 11', () => {
  const d = palettedDesign();
  assert.equal(resolveUnitDesign(unit(), d).carcassType.id, 'c1');
  assert.equal(resolveUnitDesign(unit({ carcass_type_id: 'c2' }), d).carcassType.id, 'c2');
});

test('a pointer at a type that no longer exists falls back to the project', () => {
  const d = palettedDesign();
  const gone = resolveUnitDesign(unit({ front_type_id: 'f9' }), d);
  assert.equal(gone.colour.hex, NAVY.hex);
  assert.equal(gone.frontTypeEntry, null);
});

test('the whole hierarchy: element → unit → project', () => {
  const d = palettedDesign();
  // PROJECT: Navy. UNIT: Front 2, Wine. ELEMENT: its own material label, which
  // is turn 9/11's override and sits above both.
  const params = {
    ...defaultParamsFor('BUD', P),
    front_type_id: 'f2',
    element_overrides: { BUL: { material_label: 'Birch ply' } },
  };
  const result = computeCabinet(params, P);
  const u = { id: 'u1', type: 'BUD', params };

  const finishes = resolveFinishes(u, d, P);
  assert.equal(finishes.front.hex, WINE.hex, 'the UNIT level reaches the finishes');

  const bom = buildBom([{ unit: u, result }], { design: d, profile: P });
  const rows = bom.units[0].rows;
  const side = rows.find((r) => r.id === 'BUL');
  const door = rows.find((r) => r.material_role === 'front');
  assert.equal(side.material_label, 'Birch ply', 'the ELEMENT override wins on its own piece');
  assert.ok(door.material_label.includes('Wine Red'), `a front is labelled ${door.material_label}`);
});

test('unitFinishOverride says whether there is anything to reset', () => {
  assert.equal(unitFinishOverride(unit()), null);
  assert.deepEqual(unitFinishOverride(unit({ front_type_id: 'f2' })),
    { carcass_type_id: null, front_type_id: 'f2' });
  assert.deepEqual(unitFinishOverride(unit({ carcass_type_id: 'c2', front_type_id: 'f2' })),
    { carcass_type_id: 'c2', front_type_id: 'f2' });
});

// ─── F3.4 — the store writes UNITS, and only the ones it was given ──────────

function project() {
  store().loadProject({
    id: null,
    name: 't13-f3',
    room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
    design: palettedDesign(),
  }, []);
  const ids = ['BUD', 'BUD', 'BUD'].map((t) => store().addUnit(t)?.id);
  return ids;
}

test('THE FIX: recolouring one cabinet leaves its siblings and the project alone', () => {
  const [a, b, c] = project();
  const designBefore = JSON.parse(JSON.stringify(store().project.design));

  store().setUnitFinish(b, { front_type_id: 'f2' });

  assert.equal(unitOf(b).params.front_type_id, 'f2');
  assert.equal(unitOf(a).params.front_type_id ?? null, null, 'the neighbour is untouched');
  assert.equal(unitOf(c).params.front_type_id ?? null, null);
  assert.deepEqual(store().project.design, designBefore, 'the PROJECT design is untouched');

  const d = store().project.design;
  assert.equal(resolveUnitDesign(unitOf(b), d).colour.hex, WINE.hex);
  assert.equal(resolveUnitDesign(unitOf(a), d).colour.hex, NAVY.hex);
});

test('the two pointers are written independently — one does not wipe the other', () => {
  const [a] = project();
  store().setUnitFinish(a, { carcass_type_id: 'c2' });
  store().setUnitFinish(a, { front_type_id: 'f2' });
  assert.equal(unitOf(a).params.carcass_type_id, 'c2', 'setting the front left the carcass alone');
  assert.equal(unitOf(a).params.front_type_id, 'f2');
});

test('an absent key is left alone; a null key clears it', () => {
  const [a] = project();
  store().setUnitFinish(a, { carcass_type_id: 'c2', front_type_id: 'f2' });
  store().setUnitFinish(a, { front_type_id: null });
  assert.equal(unitOf(a).params.carcass_type_id, 'c2');
  assert.equal(unitOf(a).params.front_type_id, null);
});

test('"Reset to project" clears both, on however many units', () => {
  const [a, b, c] = project();
  store().setUnitFinish([a, b, c], { carcass_type_id: 'c2', front_type_id: 'f2' });
  assert.ok([a, b, c].every((id) => unitFinishOverride(unitOf(id))));

  store().resetUnitFinish([a, c]);
  assert.equal(unitFinishOverride(unitOf(a)), null);
  assert.equal(unitFinishOverride(unitOf(c)), null);
  assert.ok(unitFinishOverride(unitOf(b)), 'the one that was not reset is still overridden');

  const d = store().project.design;
  assert.equal(resolveUnitDesign(unitOf(a), d).colour.hex, NAVY.hex, 'back on the project colour');
});

test('a bulk recolour writes every unit it was given and nothing else', () => {
  const [a, b, c] = project();
  store().setUnitFinish([a, c], { front_type_id: 'f2' });
  assert.equal(unitOf(a).params.front_type_id, 'f2');
  assert.equal(unitOf(c).params.front_type_id, 'f2');
  assert.equal(unitOf(b).params.front_type_id ?? null, null);
});
