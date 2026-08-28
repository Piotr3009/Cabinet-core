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
//
// T54-F7 AMENDED (28.08.2026): `kind: 'shoe_box'` and its SHOE1-* face died
// under licence 2 — the shoe is a `variant: 'shoe'` DRAWER now, cut by the
// drawer code (replacement world: test/turn54-f7-the-shoe-drawer.test.js).
// The F10 LAW is untouched and still tested in full: the geometric interior
// predicate, "hidden while shut, shown when open", doorless untouched. Where
// the shoe BOX's face played the interior front, the shoe DRAWER's front
// (`01-DF1`, a DRAWER-FRONT behind the leaf at z 518 vs 596) plays it now.

const unit = (type, over = {}) => computeCabinet({
  ...defaultParamsFor(type, P), unit_num: '01', ...over,
}, P);

// T54-F7: the migrated shape `migrateUnitShoe` mints — one standard drawer,
// variant 'shoe', front height = shoeSideMm 80 + frontToSideDelta 36 = 116.
const DR = P.wardrobe.drawers;
const SHOE = {
  id: 'sd1',
  kind: 'drawer',
  index: 1,
  mount: 'overlay',
  height_mm: (Number(DR.shoeSideMm) || 80) + (Number(DR.frontToSideDelta) || 36),
  variant: 'shoe',
  migrated_from: 'shoe_box',
};
const wardrobe = (over = {}) => unit('WARDROBE', { width: 900, ...over });
const withShoe = (over = {}) => wardrobe({ sections: [{ items: [SHOE] }], ...over });

const rowsFor = (r, open) => frontDimensionRows(r, P, null, { drawerFronts: open });
const idsIn = (rows) => new Set(rows.map((x) => x.a).concat(rows.map((x) => x.b)).filter(Boolean));

// ═══ 1. WHAT IS INTERIOR ════════════════════════════════════════════════════

test('F10 — a front BEHIND the carcass face is interior; one in FRONT of it is not', () => {
  // T54-F7 AMENDED (28.08.2026): SHOE1-* died with the shoe box; the shoe's
  // face is the shoe DRAWER's front now (turn54-f7-the-shoe-drawer.test.js).
  const r = withShoe({ doors: { count: 1 } });
  const rects = frontRects(r);
  const shoe = rects.find((f) => f.kind === 'drawer');
  const door = rects.find((f) => f.id === '01-F');
  assert.ok(shoe && door, 'a leaf and a shoe-drawer front');
  assert.equal(door.interior, false, 'the leaf hangs in FRONT of the carcass');
  assert.equal(shoe.interior, true, 'the shoe\'s face stands behind it');
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

// ═══ 2. THE SHOE (a drawer since T54-F7) IS NOT A DOOR ══════════════════════

test('F10 — a DOORLESS wardrobe with a shoe drawer in it has no doors', () => {
  // T54-F7 AMENDED (28.08.2026): the shoe-box face that once COUNTED AS A
  // DOOR is dead; the shoe drawer's front is a DRAWER-FRONT and must not
  // count either — the same latent bug, answered by the same law.
  const r = withShoe({ doors: false });
  assert.equal(unitHasDoors(r), false, 'a shoe drawer\'s face is not something to open');
  // …so nothing is ever hidden on it with no leaf standing in the way.
  assert.equal(drawerFrontDimsVisible(r, null), true);
});

test('F10 — a DOORED wardrobe still knows which of its fronts is the door', () => {
  // T54-F7 AMENDED (28.08.2026): 'SHOE1-FR' died; the shoe's face is the
  // drawer front '01-DF1' (turn54-f7-the-shoe-drawer.test.js).
  const r = withShoe({ doors: { count: 1 } });
  assert.equal(unitHasDoors(r), true);
  assert.equal(doorsAreOpen(r, { '01-DF1': 1 }), false, 'opening the shoe is not opening a door');
  assert.equal(doorsAreOpen(r, { '01-F': 1 }), true);
});

// ═══ 3. CLOSED HIDES, OPEN SHOWS ════════════════════════════════════════════

test('F10 — CLOSED: the shoe drawer\'s own figures are gone', () => {
  // T54-F7 AMENDED (28.08.2026): SHOE1-* → the shoe drawer's front.
  const r = withShoe({ doors: { count: 1 } });
  const shoeId = frontRects(r).find((f) => f.kind === 'drawer').id;
  const shut = idsIn(rowsFor(r, false));
  assert.equal(shut.has(shoeId), false, 'not one figure about the shoe\'s face');
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

test('F10 — the SHOE with its front OFF has nothing to hide', () => {
  // T54-F7 AMENDED (28.08.2026): the shoe box's `front: false` switch (T33-F3)
  // died with the kind. A DRAWER goes frontless the drawer way — T32-F4's
  // `mount: 'internal'` — and the F10 answer must be the same: no face, no
  // interior figure. (Replacement world: turn54-f7-the-shoe-drawer.test.js.)
  const r = wardrobe({
    doors: { count: 1 },
    sections: [{ items: [{ ...SHOE, mount: 'internal' }] }],
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
