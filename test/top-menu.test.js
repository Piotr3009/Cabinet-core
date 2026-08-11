// ─── Turn 11, CLAUDE.md F7: the top menu order ──────────────────────────────
//
// Piotr's order: File · View · Library · Settings · Database · Spraying ·
// Output — Output at the END, because it is what LEAVES the app. Database gains
// a dropdown of its own and absorbs the top-level Clients entry.
//
// A REORDER, not a cull: every item reachable before is reachable now. That is
// the assertion this file exists for, and it is the one that is easy to break.

import test from 'node:test';
import assert from 'node:assert/strict';

import { MENU_ORDER, buildDatabaseMenu, orderMenus } from '../src/lib/topMenu.js';
import { buildOutputMenu } from '../src/lib/outputMenu.js';

const bar = (labels) => labels.map((label) => ({ label, items: [] }));

test('the bar reads File · View · Library · Settings · Database · Spraying · Output', () => {
  assert.deepEqual(MENU_ORDER, ['File', 'View', 'Library', 'Settings', 'Database', 'Spraying', 'Output']);
});

test('menus handed over in any order come back in the owner’s', () => {
  // The order they are BUILT in is not the order they are shown in — the point
  // of putting this in data.
  const built = bar(['File', 'View', 'Library', 'Settings', 'Database', 'Spraying']);
  built.splice(1, 0, { label: 'Output', items: [] });     // where turn 6 had it
  const shown = orderMenus(built).map((m) => m.label);
  assert.deepEqual(shown, MENU_ORDER);
  assert.equal(shown[shown.length - 1], 'Output', 'Output is last');
});

test('nothing is dropped — a menu nobody has ordered keeps its place at the end', () => {
  const shown = orderMenus(bar(['Output', 'Whatever', 'File'])).map((m) => m.label);
  assert.deepEqual(shown, ['File', 'Output', 'Whatever']);
  assert.equal(orderMenus(bar(['a', 'b', 'c'])).length, 3, 'a bar of unknowns is still a bar of three');
});

test('ordering is stable and does not clone the menus', () => {
  const built = bar(['x', 'y']);
  const shown = orderMenus(built);
  assert.equal(shown[0], built[0], 'the same objects come back');
  assert.equal(shown[1], built[1]);
  assert.notEqual(shown, built, '…in a new array, so the caller’s is untouched');
});

test('Database is a dropdown of four', () => {
  const menu = buildDatabaseMenu({});
  assert.equal(menu.label, 'Database');
  // Turn 22 (CLAUDE.md F2b.2) adds "Company defaults…" — the storey between the
  // code and the project — beside Materials, where a workshop looks for what it
  // buys. It is an ADDITION and not a reorder: the other three keep their
  // places and their behaviour.
  assert.deepEqual(
    menu.items.map((i) => i.label),
    ['Materials…', 'Company defaults…', 'Clients…', 'Projects…'],
  );
});

test('…and Company defaults is wired the same way every other entry is', () => {
  let opened = 0;
  const menu = buildDatabaseMenu({ onCompanyDefaults: () => { opened += 1; } });
  const entry = menu.items.find((i) => i.label === 'Company defaults…');
  assert.equal(entry.disabled, false);
  assert.equal(entry.soon, false);
  entry.run();
  assert.equal(opened, 1);
  // …and with nothing behind it, it says so rather than pretending.
  assert.equal(buildDatabaseMenu({}).items.find((i) => i.label === 'Company defaults…').disabled, true);
});

test('an entry with nothing behind it is disabled and says "soon"', () => {
  const menu = buildDatabaseMenu({});
  for (const item of menu.items) {
    assert.equal(item.disabled, true, `${item.label} should not pretend to work`);
    assert.equal(item.soon, true);
  }
});

test('…and an entry that IS wired runs, and stops saying soon', () => {
  let opened = 0;
  const menu = buildDatabaseMenu({ onMaterials: () => { opened += 1; } });
  const materials = menu.items.find((i) => i.label === 'Materials…');
  assert.equal(materials.disabled, false);
  assert.equal(materials.soon, false);
  materials.run();
  assert.equal(opened, 1);
  // The other two are untouched by that.
  assert.equal(menu.items.find((i) => i.label === 'Clients…').disabled, true);
});

test('every Database entry has a hint, because a disabled control has to say why', () => {
  for (const item of buildDatabaseMenu({}).items) {
    assert.ok(item.hint && item.hint.length > 8, `${item.label} has no hint`);
  }
});

test('Output still carries everything that leaves the app', () => {
  // The reorder must not have cost it anything. Counted rather than listed, so
  // this does not become a second copy of lib/outputMenu.js.
  const out = buildOutputMenu({
    onRender: () => {},
    onDrawing: () => {},
    onExportDxf: () => {},
    onExportCsv: () => {},
    onExportPdf: () => {},
    onOpenBom: () => {},
  });
  assert.equal(out.label, 'Output');
  const leaves = (items) => items.flatMap((i) => (i.items ? leaves(i.items) : [i]));
  assert.ok(leaves(out.items).filter((i) => !i.divider).length >= 6,
    'a render, the drawings, the cut list, the DXF and the PDF are all still there');
});
