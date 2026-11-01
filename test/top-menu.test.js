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
import { readFileSync } from 'node:fs';

import * as topMenu from '../src/lib/topMenu.js';
import { MENU_ORDER, orderMenus } from '../src/lib/topMenu.js';
import { buildOutputMenu } from '../src/lib/outputMenu.js';

const bar = (labels) => labels.map((label) => ({ label, items: [] }));

// Turn 33 (CLAUDE.md F1): the owner's order gains LIGHTING, "placed BEFORE
// Output" in as many words — Output still last, because it is what LEAVES.
// AMENDED BY T-CC1b F3 and F4: Library and Database leave the bar (*"Database niepotrzebne, wszystko
// jest w JC"*; *"Library powinno byc po lewej"*, the owner, 01.11.2026).
test('the bar reads File · View · Settings · Spraying · Lighting · Output', () => {
  assert.deepEqual(MENU_ORDER, ['File', 'View', 'Settings', 'Spraying', 'Lighting', 'Output']);
});

test('menus handed over in any order come back in the owner’s', () => {
  // The order they are BUILT in is not the order they are shown in — the point
  // of putting this in data.
  const built = bar(['File', 'View', 'Settings', 'Spraying', 'Lighting']);
  built.splice(1, 0, { label: 'Output', items: [] });     // where turn 6 had it
  const shown = orderMenus(built).map((m) => m.label);
  assert.deepEqual(shown, MENU_ORDER);
  assert.equal(shown[shown.length - 1], 'Output', 'Output is last');
  assert.equal(shown[shown.length - 2], 'Lighting', 'Lighting stands before it');
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

// REWRITTEN BY T-CC1b F3: the Database menu is DELETED (*"Database niepotrzebne, wszystko jest w JC,
// Assign materials juz jest po lewej"*, the owner, 01.11.2026). Its five entries find their homes:
// Company defaults in Settings, Assign materials and Stock on the rail's Materials; Clients and
// Projects die for good (they were "soon" badges for what Joinery Core is).
test('the Database menu is gone, and its entries live where T-CC1b F3 put them', () => {
  assert.equal(topMenu.buildDatabaseMenu, undefined, 'the builder is deleted');
  assert.equal(MENU_ORDER.includes('Database'), false);
  const top = readFileSync(new URL('../src/components/TopBar.jsx', import.meta.url), 'utf8');
  const settings = top.slice(top.indexOf("label: 'Settings',"), top.indexOf("label: 'Snap',"));
  assert.ok(settings.includes("label: 'Company defaults…'"), 'Company defaults is a Settings entry');
  assert.match(settings, /openModal\('company-defaults', \{ anchor: anchorOfEvent\(e\) \}\)/);
  const rail = readFileSync(new URL('../src/components/studio/RailMenus.jsx', import.meta.url), 'utf8');
  assert.ok(rail.includes("label: 'Assign materials…'") && rail.includes("label: 'Stock…'"));
  for (const gone of ['Clients…', 'Projects…']) {
    assert.ok(!top.includes(gone) && !rail.includes(gone), `${gone} is deleted`);
  }
});

// AMENDED BY T-CC1b F5: *"Output tylko: cutting list, BOM PDF, labels 21 i 44"* (the owner, 01.11.2026).
test('Output still carries everything that leaves for the workshop', () => {
  const out = buildOutputMenu({ onExportCsv: () => {}, onExportPdf: () => {}, onExportLabels: () => {} });
  assert.equal(out.label, 'Output');
  const leaves = (items) => items.flatMap((i) => (i.items ? leaves(i.items) : [i]));
  assert.equal(leaves(out.items).filter((i) => !i.divider).length, 4,
    'the cutting list, the BOM PDF and the two label sheets');
});
