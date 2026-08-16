// ─── Turn 33, CLAUDE.md F11: ready-made drawer INSERTS, catalogued ──────────
//
// A small profile-listed catalogue — LABEL + NOMINAL WIDTHS, specs and never
// articles — feeding the F3 insert lines: the BOM now names the largest
// nominal that drops into the box (the runner ladder's snap-below grammar).
// Seeded by Claude, marked for the owner to fill; everything stays yellow
// until the register knows products.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { insertCatalogue, insertFor } from '../src/engine/drawerInserts.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();

test('the catalogue is profile-listed: label + nominal widths, no articles anywhere', () => {
  const rows = insertCatalogue(P);
  assert.ok(rows.length >= 2, 'shoe and belt/tie rows are seeded');
  for (const row of rows) {
    assert.ok(row.label && Array.isArray(row.widths) && row.widths.length, 'label + widths');
    assert.ok(!('article' in row), 'a catalogue of SPECS — articles live in the register (rule 3)');
  }
});

test('the fit is snap-below: the largest nominal not above the box interior', () => {
  assert.equal(insertFor('shoe', 627, P).nominal, 600);
  assert.equal(insertFor('belt_tie', 450, P).nominal, 450);
  assert.equal(insertFor('belt_tie_glass', 450, P).nominal, 450, 'the glass variant shares the divider row');
  assert.equal(insertFor('shoe', 250, P), null, 'below every nominal: the plain spec stands');
  assert.equal(insertFor('cutlery', 500, P), null, 'no row, no invention');
});

test('the BOM insert line names the nominal beside the box’s own numbers', () => {
  store().loadProject({
    id: null,
    name: 't33-f11',
    room: migrateRoom({ height: 2600, corners: rectCorners(6000, 3000) }),
    design: { projectType: 'wardrobe' },
  }, []);
  const { id } = store().addUnit('WARDROBE');
  store().updateUnitParams(id, { width: 1000, doors: false });
  assert.equal(store().addDrawers(id, 1, 'overlay', 200, null, 'shoe').ok, true);
  const line = store().unitResult(id).hardware.find((h) => h.role === 'drawer_insert');
  assert.ok(line, 'the insert is ordered');
  assert.match(line.spec_label, /fits nominal \d+/, 'the catalogue speaks in the line');
  assert.ok(line.spec.nominal_mm <= line.spec.width_mm, 'snap-below, never oversize');
});
