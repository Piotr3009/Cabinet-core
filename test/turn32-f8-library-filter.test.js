// ─── Turn 32, CLAUDE.md F8: the library filtered by project type ────────────
//
// Cargo units, bins, pull-outs are KITCHEN items; a Wardrobe project's
// library shows wardrobe things. The category data exists (the kits' own
// `family`); the filter rides it, and "Show all" is the one-click way past
// it — the same grammar the item filter learned in T11 F4.4. No hard blocks.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { KITCHEN_LIBRARY, filterLibraryByProject, flattenLibrary } from '../src/engine/library.js';
import { getUnitType } from '../src/engine/types.js';

const familyOf = (id) => getUnitType(id)?.family;

test('a wardrobe project hides the kitchen kits — cargo, bins and all', () => {
  const { entries, hidden } = filterLibraryByProject(KITCHEN_LIBRARY, 'wardrobe', familyOf);
  const left = flattenLibrary(entries).filter((e) => e.kind === 'type' && e.typeId).map((e) => e.typeId);
  assert.ok(!left.includes('CARGO'), 'the cargo pull-out is a kitchen thing');
  assert.ok(!left.includes('BIN'), 'so is the bin');
  assert.ok(!left.includes('SINK'));
  assert.ok(hidden > 10, `every kitchen kit counted for the escape hatch (${hidden})`);
  // …and an emptied group folds away with its items.
  assert.ok(!entries.some((e) => e.id === 'base-units'), 'no shell of disabled variants');
});

test('a kitchen project keeps its own library to the piece', () => {
  const { entries, hidden } = filterLibraryByProject(KITCHEN_LIBRARY, 'kitchen', familyOf);
  assert.deepEqual(
    flattenLibrary(entries).map((e) => e.id),
    flattenLibrary(KITCHEN_LIBRARY).map((e) => e.id),
    'nothing a kitchen offers goes anywhere',
  );
  assert.equal(hidden, 0);
});

test('no category, no opinion — the filter refuses to guess', () => {
  const { entries, hidden } = filterLibraryByProject(KITCHEN_LIBRARY, null, familyOf);
  assert.equal(entries, KITCHEN_LIBRARY);
  assert.equal(hidden, 0);
});

test('the panel offers "Show all" — a filter and never a block', () => {
  const src = readFileSync(new URL('../src/components/LibraryPanel.jsx', import.meta.url), 'utf8');
  assert.match(src, /filterLibraryByProject/);
  assert.match(src, /Show all \(\$\{filtered\.hidden\} more\)/);
  assert.match(src, /Show what a \$\{projectCategory\} project usually takes/);
  assert.match(src, /data-library-show-all/);
});
