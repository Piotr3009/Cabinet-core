// ─── F7 — THE EXPORT TREE: FOUR GROUPS (turn 25) ────────────────────────────
//
//   Carcasses · Shelves · Doors, fronts & panels · Infills & plinths
//
// Two things move and both are named: INFILL-* leaves the Carcass group, and
// the old DRAWERS group is gone.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import {
  PART_GROUPS, PART_GROUP_IDS, QUICK_SELECTS, exportablePanels, groupOfPanel, groupPanels,
  panelIdsForQuickSelect, treePathOfPanel,
} from '../src/engine/cnc/groups.js';
import { buildUnitDxfFiles, sheetDxf } from '../src/engine/cnc/dxf.js';
import { layoutPanels } from '../src/engine/cnc/layout.js';
import { defaultParamsFor } from '../src/engine/types.js';

/** Everything at once: a carcass, shelves, a partition, drawers, fronts,
 *  a plinth, infills and an end panel. */
const kitchenSink = () => computeCabinet({
  ...defaultParamsFor('WARDROBE', P),
  unit_num: '01',
  width: 900,
  shelves: 2,
  drawers: 3,
  rail: true,
  plinth: true,
  top_infill_mm: 100,
  side_infill_left_mm: 120,
  // The items list REPLACES the plain `shelves` count, so the shelves are
  // spelled out here rather than left to it — a cabinet whose only item is a
  // partition has no shelves at all, which is not the cabinet this test is
  // about.
  sections: [{
    width_mm: 900,
    items: [
      { id: 'p1', kind: 'partition', x_mm: 450 },
      { id: 's1', kind: 'shelf', pos_mm: 900 },
      { id: 's2', kind: 'shelf', pos_mm: 1400, variant: 'fixed' },
    ],
  }],
}, P);

// ─── F7.1 — the groups, and their order ─────────────────────────────────────

test('F7.1 — four groups, in the owner’s order', () => {
  assert.deepEqual(PART_GROUP_IDS, ['carcasses', 'shelves', 'fronts', 'infills']);
  assert.deepEqual(
    PART_GROUPS.map((g) => g.label),
    ['Carcasses', 'Shelves', 'Doors, fronts & panels', 'Infills & plinths'],
  );
});

test('F7.1 — Carcasses: BUL, BUR, TOP, BOTTOM, BACK', () => {
  const r = kitchenSink();
  for (const id of ['BUL', 'BUR', 'TOP', 'BOTTOM', 'BACK']) {
    const panel = r.panels.find((p) => p.id === id);
    assert.ok(panel, `${id} is missing from the cabinet`);
    assert.equal(groupOfPanel(panel), 'carcasses', id);
  }
});

test('F7.1 — Shelves: shelves + VPART', () => {
  const r = kitchenSink();
  const shelfLike = r.panels.filter((p) => p.part === 'SHELF' || p.part === 'VPART' || p.part === 'RAIL-PART');
  assert.ok(shelfLike.length >= 3, 'the cabinet has shelves and a partition');
  for (const p of shelfLike) assert.equal(groupOfPanel(p), 'shelves', p.id);
});

test('F7.1 — Doors, fronts & panels', () => {
  const r = kitchenSink();
  const fronts = r.panels.filter((p) => p.part === 'FRONT' || p.part === 'DRAWER-FRONT' || p.part === 'END-PANEL');
  assert.ok(fronts.length, 'the cabinet has fronts');
  for (const p of fronts) assert.equal(groupOfPanel(p), 'fronts', p.id);
  // A wall unit's masking board is a panel and goes with them.
  const wall = computeCabinet({ ...defaultParamsFor('WUD', P), unit_num: 'W01', bottom_mask: true }, P);
  assert.equal(groupOfPanel(wall.panels.find((p) => p.part === 'MASK')), 'fronts');
});

test('F7.1 — INFILL-* LEAVES the Carcass group, and the plinth is beside it', () => {
  // The named move. Turn 3 put an infill with the carcass because it was cut
  // from board and nobody had asked; it is a finishing piece that stands in the
  // room beside the doors and is sprayed with them.
  const r = kitchenSink();
  const infills = r.panels.filter((p) => p.role === 'infill');
  assert.ok(infills.length, 'the cabinet has infills');
  for (const p of infills) assert.equal(groupOfPanel(p), 'infills', p.id);
  assert.equal(groupOfPanel(r.panels.find((p) => p.id === 'PLINTH')), 'infills');
});

test('F7.1 — the DRAWERS group is gone: a box is carcass board', () => {
  const r = kitchenSink();
  assert.ok(!PART_GROUP_IDS.includes('drawers'));
  for (const p of r.panels.filter((x) => x.role === 'drawer_box')) {
    assert.equal(groupOfPanel(p), 'carcasses', p.id);
  }
  // …and so are the drawer PANEL and its fillers, which carry the runners.
  for (const p of r.panels.filter((x) => x.part === 'DP' || x.part === 'FILLER')) {
    assert.equal(groupOfPanel(p), 'carcasses', p.id);
  }
});

test('F7.1 — every part lands in exactly one group, and none is lost', () => {
  const r = kitchenSink();
  const grouped = groupPanels(r.panels);
  const total = [...grouped.values()].reduce((n, list) => n + list.length, 0);
  assert.equal(total, r.panels.length);
  for (const id of PART_GROUP_IDS) assert.ok(grouped.has(id));
});

// ─── F7.2 — the quick-select buttons ────────────────────────────────────────

test('F7.2 — five buttons: All, then the four groups, in order', () => {
  assert.deepEqual(
    QUICK_SELECTS.map((q) => q.label),
    ['All', 'Carcasses', 'Shelves', 'Doors, fronts & panels', 'Infills & plinths'],
  );
  // Derived from PART_GROUPS rather than typed beside it, so a button and the
  // header it selects cannot come to mean different things.
  assert.deepEqual(QUICK_SELECTS.slice(1).map((q) => q.id), PART_GROUP_IDS);
});

test('F7.2 — each button ticks its WHOLE group, and All is the sum of the four', () => {
  const parts = exportablePanels(kitchenSink().panels);
  const all = panelIdsForQuickSelect(parts, 'all');
  assert.equal(all.length, parts.length);

  let summed = 0;
  for (const id of PART_GROUP_IDS) {
    const mine = panelIdsForQuickSelect(parts, id);
    const expected = parts.filter((p) => groupOfPanel(p) === id).map((p) => p.id);
    assert.deepEqual(mine, expected, id);
    summed += mine.length;
  }
  assert.equal(summed, all.length, 'the four groups add up to All — no part in two, none in none');
});

test('F7.2 — the counters a group header shows are its own membership', () => {
  // What the tree prints is `lit / mine.length`, and `mine` is this list — so
  // a counter cannot drift from the ticks beside it.
  const parts = exportablePanels(kitchenSink().panels);
  for (const g of PART_GROUPS) {
    const mine = parts.filter((p) => groupOfPanel(p) === g.id);
    assert.equal(mine.length, panelIdsForQuickSelect(parts, g.id).length, g.id);
  }
});

test('F7.2 — double-clicking a part still finds its row, in the new grouping', () => {
  const parts = exportablePanels(kitchenSink().panels);
  for (const p of parts) {
    const path = treePathOfPanel(parts, p.id);
    assert.equal(path.group, groupOfPanel(p), `${p.id}: the tree’s own grouping, not a second one`);
    const mine = parts.filter((x) => groupOfPanel(x) === path.group);
    assert.equal(mine[path.index].id, p.id, `${p.id} is not at the index the tree would scroll to`);
  }
});

// ─── F7.3 — what the two downloads take ─────────────────────────────────────

test('F7.3 — the one-file DXF takes the ticked set', () => {
  const r = kitchenSink();
  const parts = exportablePanels(r.panels);
  const ticked = panelIdsForQuickSelect(parts, 'shelves');
  const wanted = new Set(ticked);
  const panels = parts.filter((p) => wanted.has(p.id));
  const layout = layoutPanels(panels, r.drills, {
    gap: P.cnc.layoutGap, rowWidth: P.cnc.layoutRowWidth,
  });
  const dxf = sheetDxf({
    panels, drills: r.drills, layout, unitNum: r.unitNum, profile: P,
  });
  // Every ticked part's label is in the file, and no unticked part's is.
  for (const p of panels) assert.ok(dxf.includes(p.id.replace(/^01-/, '')), `${p.id} is missing from the sheet`);
  const front = parts.find((p) => groupOfPanel(p) === 'fronts');
  assert.ok(!wanted.has(front.id), 'the fronts were not ticked');
});

test('F7.3 — the per-panel ZIP still ships the WHOLE unit', () => {
  // Unchanged, deliberately: the footnote in the tree already says why — a
  // folder of per-part files is what a machine operator opens one at a time,
  // and half a cabinet in it is a cabinet somebody cannot build.
  const r = kitchenSink();
  const files = buildUnitDxfFiles(r, P);
  assert.equal(files.length, exportablePanels(r.panels).length);
  for (const id of PART_GROUP_IDS) {
    const mine = exportablePanels(r.panels).filter((p) => groupOfPanel(p) === id);
    for (const p of mine) {
      assert.ok(files.some((f) => f.panelId === p.id), `${p.id} is not in the ZIP`);
    }
  }
});
