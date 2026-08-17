import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import {
  doorsAreOpen, drawerFrontDimsVisible, frontDimensionRows, frontRects,
  interiorFrontIds, isInteriorFront, unitHasDoors, withoutDrawerFrontRows,
} from '../src/engine/frontDimensions.js';

// ─── TURN 36 (CLAUDE.md F10): EVERY INTERIOR FRONT, NOT ONLY DRAWERS ────────
//
// The owner: *"front shoe boxa nadal widoczne wymiary przy zamkniętych
// drzwiach."* T35-F11 hid a DRAWER front behind a shut door by NAMING drawer
// fronts; a shoe box's face is `role: 'front'` too, is not a `DRAWER-FRONT`,
// and walked straight past the rule — and worse, COUNTED AS A DOOR, so a
// doorless wardrobe with a shoe box in it read as doored.
//
// "in a unit with doors, the front dimensions of ANY interior element —
// drawer fronts, the shoe box's front, anything future — render only while
// the doors are open. Door dims and doorless units untouched."

const unit = (type, over = {}) => computeCabinet({
  ...defaultParamsFor(type, P), unit_num: '01', ...over,
}, P);

const SHOE = { id: 'sb1', kind: 'shoe_box', variant: 'F', dividers: 1 };
const wardrobe = (over = {}) => unit('WARDROBE', { width: 900, ...over });
const withShoe = (over = {}) => wardrobe({ sections: [{ items: [SHOE] }], ...over });

const rowsFor = (r, open) => frontDimensionRows(r, P, null, { drawerFronts: open });
const idsIn = (rows) => new Set(rows.map((x) => x.a).concat(rows.map((x) => x.b)).filter(Boolean));

// ═══ 1. WHAT IS INTERIOR ════════════════════════════════════════════════════

test('F10 — a front BEHIND the carcass face is interior; one in FRONT of it is not', () => {
  const r = withShoe({ doors: { count: 1 } });
  const rects = frontRects(r);
  const shoe = rects.find((f) => f.id.startsWith('SHOE1-'));
  const door = rects.find((f) => f.id === '01-F');
  assert.ok(shoe && door, 'a leaf and a shoe-box face');
  assert.equal(door.interior, false, 'the leaf hangs in FRONT of the carcass');
  assert.equal(shoe.interior, true, 'the box\'s face stands behind it');
  assert.ok(shoe.z < door.z, 'and the geometry says so');
});

test('F10 — a DRAWER front behind a leaf is interior; a drawer BANK\'s is not', () => {
  const doored = wardrobe({ drawers: 2, doors: { count: 1 } });
  for (const f of frontRects(doored).filter((x) => x.kind === 'drawer')) {
    assert.equal(f.interior, true, `${f.id} stands behind the leaf`);
  }
  // A BUDR has no leaf: every front is on one plane, so nothing is interior
  // and nothing is ever hidden — exactly as T35-F11 ruled.
  const bank = unit('BUDR');
  assert.deepEqual(interiorFrontIds(bank), []);
});

test('F10 — the predicate answers nothing where there is nothing to answer', () => {
  assert.equal(isInteriorFront(null, 100), false);
  assert.equal(isInteriorFront({ box: { z: 0, d: 10 } }, null), false);
  assert.equal(isInteriorFront({ box: { z: 0, d: 10 }, meta: { appliance: 'extractor' } }, 600), false);
  // A millimetre is not "behind": the tolerance keeps a coplanar pair coplanar.
  assert.equal(isInteriorFront({ box: { z: 0, d: 599.5 } }, 600), false);
  assert.equal(isInteriorFront({ box: { z: 0, d: 640 } }, 600), false, 'a leaf stands proud');
  assert.equal(isInteriorFront({ box: { z: 0, d: 560 } }, 600), true);
});

// ═══ 2. THE SHOE BOX IS NOT A DOOR ══════════════════════════════════════════

test('F10 — a DOORLESS wardrobe with a shoe box in it has no doors', () => {
  const r = withShoe({ doors: false });
  assert.equal(unitHasDoors(r), false, 'a shoe-box face is not something to open');
  // …which is the latent bug the generalisation closes: before it, this unit
  // counted as doored and would have hidden its own drawer fronts with
  // nothing standing in the way.
  assert.equal(drawerFrontDimsVisible(r, null), true);
});

test('F10 — a DOORED wardrobe still knows which of its fronts is the door', () => {
  const r = withShoe({ doors: { count: 1 } });
  assert.equal(unitHasDoors(r), true);
  assert.equal(doorsAreOpen(r, { 'SHOE1-FR': 1 }), false, 'opening the box is not opening a door');
  assert.equal(doorsAreOpen(r, { '01-F': 1 }), true);
});

// ═══ 3. CLOSED HIDES, OPEN SHOWS ════════════════════════════════════════════

test('F10 — CLOSED: the shoe box\'s own figures are gone', () => {
  const r = withShoe({ doors: { count: 1 } });
  const shoeId = frontRects(r).find((f) => f.id.startsWith('SHOE1-')).id;
  const shut = idsIn(rowsFor(r, false));
  assert.equal(shut.has(shoeId), false, 'not one figure about the box\'s face');
  const open = idsIn(rowsFor(r, true));
  assert.equal(open.has(shoeId), true, 'and it is back when the leaf swings');
});

test('F10 — CLOSED: the drawers are still covered, exactly as T35-F11 left them', () => {
  const r = wardrobe({ drawers: 2, doors: { count: 1 } });
  const drawerIds = frontRects(r).filter((f) => f.kind === 'drawer').map((f) => f.id);
  const shut = idsIn(rowsFor(r, false));
  for (const id of drawerIds) assert.equal(shut.has(id), false, id);
  const open = idsIn(rowsFor(r, true));
  for (const id of drawerIds) assert.equal(open.has(id), true, id);
});

test('F10 — the DOOR\'s own figures never move, shut or open', () => {
  const r = withShoe({ doors: { count: 2 } });
  const doorIds = frontRects(r).filter((f) => !f.interior).map((f) => f.id);
  const shut = rowsFor(r, false);
  const open = rowsFor(r, true);
  for (const id of doorIds) {
    const a = shut.filter((x) => x.a === id || x.b === id).length;
    const b = open.filter((x) => x.a === id || x.b === id).length;
    assert.ok(a > 0, `${id} is measured with the doors shut`);
    assert.equal(a, b, `${id}: the same figures either way`);
  }
});

test('F10 — a DOORLESS unit is untouched: the filter takes nothing off it', () => {
  for (const r of [unit('BUDR'), withShoe({ doors: false })]) {
    const all = frontDimensionRows(r, P);
    // The LAW is asked the way `UnitView` asks it: is anything in the way?
    // With no door there is nothing to wait for, so the filter is never
    // reached and every figure stands — which is what "doorless units
    // untouched" means. (Calling the filter by hand on a doorless unit would
    // be testing a call the app cannot make.)
    assert.equal(drawerFrontDimsVisible(r, null), true);
    const shown = drawerFrontDimsVisible(r, null)
      ? frontDimensionRows(r, P)
      : frontDimensionRows(r, P, null, { drawerFronts: false });
    assert.deepEqual(shown, all);
  }
  // A drawer BANK has no interior front at all, so even the filter is a no-op.
  const bank = unit('BUDR');
  const bankRows = frontDimensionRows(bank, P);
  assert.deepEqual(withoutDrawerFrontRows(bankRows, bank), bankRows);
});

test('F10 — the SHOE BOX with its front switched OFF (F3) has nothing to hide', () => {
  const r = wardrobe({
    doors: { count: 1 },
    sections: [{ items: [{ ...SHOE, front: false }] }],
  });
  assert.deepEqual(interiorFrontIds(r), [], 'no face, no interior figure');
  assert.equal(unitHasDoors(r), true, '…and the leaf is still a leaf');
});

// ═══ 4. THE VIEW STILL ASKS THE LAW ═════════════════════════════════════════

test('F10 — UnitView hands the OPEN STATE to the law, unchanged', () => {
  const view = readFileSync(new URL('../src/3d/UnitView.jsx', import.meta.url), 'utf8');
  assert.match(view, /drawerFrontDimsVisible\(result, openFronts\)/);
  assert.match(view, /frontDimensionRows\(result, profile, suppressEdgeDims, \{ drawerFronts: false \}\)/);
});
