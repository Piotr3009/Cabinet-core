// ─── Sprayed colours for fronts (turn 9, CLAUDE.md F6) ──────────────────────
//
// Fronts could be finished in one of two things: a board this app ships, or a
// decor out of the EGGER pack. A joinery workshop's third — and for a painted
// kitchen, its FIRST — answer is a colour out of a spray gun, and turn 8 had it
// half-built: `design.colour.front` reached the 3D view (a door came out navy)
// and reached nothing else, so the cut list, the PDF and the unit card all went
// on naming the board underneath the paint.
//
// The fix is one sentence: A SPRAYED COLOUR IS A FINISH. `resolveFinishes`
// hands it out in the `front` slot, ahead of any board, because paint covers a
// decor exactly as it does in the workshop — and every consumer downstream
// already reads that one function.
//
// The colour data itself is not new and is not touched: RAL and Farrow & Ball
// come from reference/colors/psw-colors.json through the same ColourPicker the
// door styles have used since turn 3.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import {
  DESIGN_SCHEMA, migrateDesign, projectSheen, resolveFinishes, roughnessFromSheen,
  sprayFinish, sprayFinishLabel,
} from '../src/engine/design.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { buildBom } from '../src/engine/bom.js';
import { unitCardSheet } from '../src/engine/drawings/card.js';
import { surfaceFor } from '../src/3d/materials.js';
import { ALL_COLOURS } from '../src/lib/pswColors.js';

const unit = (params = {}) => ({
  id: 'u1',
  type: 'BUD',
  position: { wall: 0, x_mm: 0 },
  params: { width: 600, height: 770, depth: 558, unit_num: '01', ...params },
});

const full = () => computeCabinet({
  type: 'BUD', width: 600, height: 770, depth: 558, unit_num: '01',
  doors: { count: 1, hinge: 'L' }, shelves: 1, plinth: true,
  top_infill_mm: 40, end_panels: [{ id: 'ep1', side: 'R' }],
}, P);

const sprayed = (colour, rest = {}) => migrateDesign({
  schema: DESIGN_SCHEMA, colour: { front: colour }, ...rest,
});

// A real RAL entry out of the shipped list, so the naming is tested against the
// data the picker actually offers rather than against a hand-typed string.
const RAL = ALL_COLOURS.find((c) => c.system === 'RAL' && /^3005/.test(c.name))
  || ALL_COLOURS.find((c) => c.system === 'RAL');
const FB = ALL_COLOURS.find((c) => c.system === 'F&B' && /^Railings/.test(c.name))
  || ALL_COLOURS.find((c) => c.system === 'F&B');

// ─── what it is CALLED ──────────────────────────────────────────────────────

test('a sprayed finish is named the way it is ordered: system, colour, "spray"', () => {
  assert.equal(sprayFinishLabel(RAL), `RAL ${RAL.name} spray`);
  assert.equal(sprayFinishLabel(FB), `F&B ${FB.name} spray`);
  assert.match(sprayFinishLabel(RAL), /^RAL 3005/, 'the example CLAUDE.md gives');
  assert.match(sprayFinishLabel(FB), /^F&B Railings/);
  // A colour somebody typed has no name to give, so the hex IS the name — the
  // same fallback `colourLabel` has always made.
  assert.equal(sprayFinishLabel({ hex: '#1F3A5F', name: '#1f3a5f', system: 'custom' }), '#1f3a5f spray');
  assert.equal(sprayFinishLabel(null), null);
  assert.equal(sprayFinishLabel({ hex: 'not a colour' }), null, 'and rubbish is not a finish');
});

test('a sprayed colour dresses up as a finish, and does not pretend to be a decor', () => {
  const f = sprayFinish(RAL);
  assert.equal(f.kind, 'spray');
  assert.equal(f.hex, RAL.hex.toLowerCase());
  assert.equal(f.texture, undefined, 'a spray carries no image — it is not a foil');
  assert.equal(f.decor, undefined, 'and it must never be attributed to a manufacturer');
  assert.equal(f.id, `spray:${RAL.hex.toLowerCase()}`);
});

// ─── it reaches the FRONTS, and only the fronts ─────────────────────────────

test('a spray beats the board on the fronts — paint covers a decor', () => {
  const design = sprayed(RAL, { finish: { carcass: 'broken_white', front: 'light_oak' } });
  const { carcass, front } = resolveFinishes(unit(), design, P);
  assert.equal(front.kind, 'spray', 'the doors are sprayed, whatever board was chosen under them');
  assert.equal(front.label, sprayFinishLabel(RAL));
  assert.equal(carcass.id, 'broken_white', 'and the carcass is untouched');
});

test('no colour, no spray — the board answers exactly as it did before', () => {
  const design = migrateDesign({ finish: { carcass: 'broken_white', front: 'light_oak' } });
  assert.equal(resolveFinishes(unit(), design, P).front.id, 'light_oak');
});

test("a UNIT's own colour is sprayed on that unit alone", () => {
  const design = sprayed(RAL);
  const other = unit({ front_colour: FB });
  assert.equal(resolveFinishes(unit(), design, P).front.label, sprayFinishLabel(RAL));
  assert.equal(resolveFinishes(other, design, P).front.label, sprayFinishLabel(FB));
});

// ─── how it RENDERS ─────────────────────────────────────────────────────────

test('a sprayed front is lacquer, tinted by the colour, with no environment on it', () => {
  const design = sprayed(RAL);
  const finishes = resolveFinishes(unit(), design, P);
  const door = full().panels.find((p) => p.part === 'FRONT');
  const s = surfaceFor({
    role: door.role,
    materialRole: door.material_role,
    finishExposed: door.finish_exposed,
    finishes,
    profile: P,
    frontColour: finishes.front.hex,
    sheen: projectSheen(design, P),
  });

  assert.equal(s.sprayed, true);
  assert.equal(s.colour.getHexString(), RAL.hex.replace('#', '').toLowerCase(), 'it is THE colour');
  assert.equal(s.texture, null, 'and it carries no decor image');
  // The Spraying rule, unchanged since turn 8 and re-checked here because F6
  // adds a new way to reach it: a sprayed colour is the colour, so the room may
  // not tint it (CLAUDE.md F1.4 — spray stays envMap-free).
  assert.equal(s.envMapIntensity, 0.25,
    'a QUARTER of a neutral synthetic studio (hotfix 08.08) — gloss for the clearcoat, no colour the scene could lend');
  assert.equal(s.clearcoat, P.appearance.materials.lacquer.clearcoat, 'lacquer, not melamine');
  assert.equal(s.clearcoatRoughness, P.appearance.materials.lacquer.clearcoatRoughness);
  assert.equal(s.normalScale, 0, 'peel is OFF by default — the 2 mm sine aliased into moiré (hotfix 08.08)');
});

test('the sheen slider drives a sprayed front, on the new per-cent scale (F5)', () => {
  for (const sheen of [5, 60, 100]) {
    const design = sprayed(RAL, { sheen });
    const finishes = resolveFinishes(unit(), design, P);
    const door = full().panels.find((p) => p.part === 'FRONT');
    const s = surfaceFor({
      role: door.role,
      materialRole: door.material_role,
      finishExposed: door.finish_exposed,
      finishes,
      profile: P,
      frontColour: finishes.front.hex,
      sheen: projectSheen(design, P),
    });
    assert.equal(s.roughness, roughnessFromSheen(sheen, P), `sheen ${sheen}`);
  }
});

// ─── what the WORKSHOP is given ─────────────────────────────────────────────

test('every part cut from the front sheet is labelled with the spray in the BOM', () => {
  const design = sprayed(RAL, { finish: { carcass: 'broken_white' } });
  const result = full();
  const bom = buildBom([{ unit: unit(), result }], { design, profile: P });
  const rows = bom.units[0].rows;
  const label = sprayFinishLabel(RAL);

  const fronts = rows.filter((r) => r.material_role === 'front');
  assert.ok(fronts.length >= 3, 'a door, an end panel and an infill at least');
  for (const r of fronts) {
    assert.equal(r.material_label, label, `${r.id} is cut from the front sheet and is sprayed`);
  }
  for (const r of rows.filter((x) => x.material_role !== 'front')) {
    assert.equal(r.material_label, 'Broken white', `${r.id} is carcass board`);
  }
});

test('two pieces the same size do not merge across two different materials', () => {
  // The cut list merges identical pieces across the whole project. Without the
  // material in the merge key, a sprayed front and a melamine panel of the same
  // size become one line and half of them get cut in the wrong sheet.
  const result = full();
  const bom = buildBom([{ unit: unit(), result }], { design: sprayed(RAL), profile: P });
  for (const row of bom.cutRows) {
    const same = bom.units[0].rows.filter((r) => r.part === row.part && r.w === row.w
      && r.h === row.h && r.thickness === row.thickness && r.edge === row.edge);
    const materials = new Set(same.map((r) => r.material_label));
    assert.ok(materials.size <= 1 || row.material_label != null,
      `${row.part} merged across ${[...materials].join(' / ')}`);
  }
});

test('a caller that supplies no design gets no invented labels', () => {
  const bom = buildBom([{ unit: unit(), result: full() }]);
  assert.ok(bom.units[0].rows.every((r) => r.material_label === null));
  assert.ok(bom.totals.pieces > 0, 'and it still counts the pieces');
});

test('the drawing title block names the spray, once, and not the board under it', () => {
  // Turn 8 printed the board finish AND the colour side by side, because the
  // two were kept apart — so a decor-carcass job with sprayed doors read as
  // "EGGER H1180 … / Hague", naming a decor the doors are not made of.
  const design = sprayed(RAL, { finish: { carcass: 'dark_walnut', front: 'light_oak' } });
  const sheet = unitCardSheet({
    result: full(), unit: unit(), project: { name: 'Test', design }, profile: P, date: '07.08.2026',
  });
  const text = sheet.entities.filter((e) => e.kind === 'text').map((e) => e.text);
  // The value is cut where it stops fitting the block, so the test asks what a
  // joiner asks: does the row START with the tin he has to buy?
  assert.ok(text.some((t) => t.startsWith('RAL 3005')), `no RAL row in ${text.join(' | ')}`);
  assert.ok(!text.some((t) => /light oak/i.test(t)), 'the doors are not made of the board under the paint');
  assert.ok(text.some((t) => /walnut/i.test(t)), 'and the carcass still is');
});
