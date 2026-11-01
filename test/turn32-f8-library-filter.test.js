// ─── Turn 32, CLAUDE.md F8: the library filtered by project type ────────────
//
// Cargo units, bins, pull-outs are KITCHEN items; a Wardrobe project's
// library shows wardrobe things. The category data exists (the kits' own
// `family`); the filter rides it, and "Show all" is the one-click way past
// it — the same grammar the item filter learned in T11 F4.4. No hard blocks.
//
// ─── REWRITTEN BY T-CC1b F4.3 (law 4, THE LIBRARY IS THE RAIL'S) ────────────
// The owner, 01.11.2026: *"po co blokowac wyspe w pokoju albo mala szafe w
// kuchni"*; *"wszystkie rodzaje po lewej, czesc coming soon"*. The project-type
// gate is DELETED (`projectCategory`, `showAllTypes`, the
// `filterLibraryByProject` branch, and the function itself, which nothing else
// called). What this file asserts now: the rail shows every family for a
// kitchen item AND for a wardrobe item, and a family shows all its entries.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import * as library from '../src/engine/library.js';
import { UNIT_CATEGORIES } from '../src/engine/types.js';
import { getProjectType } from '../src/engine/projectTypes.js';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
/** The source without its comments: a tombstone naming the dead is not the dead. */
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ');

test('the filter is gone: no export, no branch in the panel, no "Show all"', () => {
  assert.equal(library.filterLibraryByProject, undefined, 'the function is deleted');
  const panel = code(read('src/components/LibraryPanel.jsx'));
  for (const gone of ['filterLibraryByProject', 'const projectCategory', 'showAllTypes', 'data-library-show-all', 'Show all (']) {
    assert.ok(!panel.includes(gone), `LibraryPanel still carries ${gone}`);
  }
  // Every category shows all its entries, always.
  assert.match(panel, /return base\.map\(\(entry\) => \(/);
});

test('the rail shows every family for a kitchen item AND for a wardrobe item', () => {
  const rail = code(read('src/components/studio/RailMenus.jsx'));
  // The rail's Add lists UNIT_CATEGORIES whole; nothing it reads depends on the job's type.
  assert.match(rail, /return UNIT_CATEGORIES\.map\(\(c\) => \{/);
  assert.doesNotMatch(rail, /projectType|getProjectType|projectLibraryCategory/);
  for (const job of ['kitchen', 'wardrobe']) {
    assert.equal(getProjectType(job).category, job, `${job} is a type the start screen offers`);
    // What the rail lists for this job: the same eight, in the same order.
    const listed = UNIT_CATEGORIES.map((c) => c.id);
    assert.deepEqual(listed, ['kitchen', 'wardrobe', 'bathroom', 'media', 'sets', 'media_wall', 'hallway', 'office'], `${job} job`);
  }
  // A kitchen item can place a wardrobe, a wardrobe item a cargo: each family holds all its kits.
  const kitchen = library.libraryTypeIds(library.KITCHEN_LIBRARY);
  const wardrobe = library.libraryTypeIds(library.WARDROBE_LIBRARY);
  assert.ok(kitchen.includes('CARGO') && kitchen.includes('BIN') && kitchen.includes('SINK'));
  assert.ok(wardrobe.includes('WARDROBE') && wardrobe.includes('WARDROBE_TOP'));
});
