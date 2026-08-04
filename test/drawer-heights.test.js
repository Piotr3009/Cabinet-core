// ─── Per-drawer height tests ───
//
// IMPORTANT: these are ENGINE-DERIVED CONSISTENCY tests, not golden values.
// The AutoLISP only ever knows a 200 mm drawer front, so there is no LISP
// number to compare a 250/150 stack against. What is checked instead is that
// the generalised formulas stay INTERNALLY consistent — the zone adds up to
// the partition, runner rows land under the drawers they carry, box parts
// follow their own front, and nothing overlaps. The one place where a real
// golden value exists — every drawer at the default height — is checked here
// too, against the fixtures, because that is the case the LISP does know.
//
// fixtures/*.json are read, never written (CLAUDE.md rule 1).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE, migrateCabinetProfile } from '../src/engine/profile.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const WARDROBE = JSON.parse(readFileSync(join(HERE, '..', 'fixtures', 'golden-wardrobe.json'), 'utf8'));
const P = DEFAULT_CABINET_PROFILE;
const DR = P.wardrobe.drawers;
const G = P.board.thickness;

const BASE = {
  type: 'WARDROBE', width: 600, height: 2150, depth: 578,
  board_t: 18, front_t: 25, front_type: 'S', shelves: 0, rail: false, hinge: 'L', unit_num: 'W01',
};

const withHeights = (heights, extra = {}) => computeCabinet({
  ...BASE, ...extra, drawers: heights.length, drawer_heights: heights,
}, P);

const panelsOf = (r, part) => r.panels.filter((p) => p.part === part);
const drawerPanel = (r, part, i) => panelsOf(r, part).find((p) => p.meta.drawer === i);

// ─── the default stack is still, exactly, the golden one ───

test('all drawers at the default height reproduce the fixture, key for key', () => {
  const WA = WARDROBE.cases.find((c) => c.id === 'W-A');
  const golden = computeCabinet({
    type: WA.inputs.type, width: WA.inputs.width, height: WA.inputs.height, depth: WA.inputs.depth,
    board_t: WA.inputs.board_t, front_t: WA.inputs.front_t, front_type: WA.inputs.front_type,
    shelves: WA.inputs.shelves, drawers: WA.inputs.drawers, rail: WA.inputs.rail,
    rail_offset: WA.inputs.rail_offset, hinge: WA.inputs.hinge, unit_num: WA.inputs.unit_num,
  }, P);

  // Spelling the heights out explicitly must change nothing at all.
  const explicit = computeCabinet({
    type: WA.inputs.type, width: WA.inputs.width, height: WA.inputs.height, depth: WA.inputs.depth,
    board_t: WA.inputs.board_t, front_t: WA.inputs.front_t, front_type: WA.inputs.front_type,
    shelves: WA.inputs.shelves, drawers: WA.inputs.drawers, rail: WA.inputs.rail,
    rail_offset: WA.inputs.rail_offset, hinge: WA.inputs.hinge, unit_num: WA.inputs.unit_num,
    drawer_heights: [DR.frontHeight, DR.frontHeight],
  }, P);

  assert.deepEqual(explicit.panels, golden.panels, 'panels identical');
  assert.deepEqual(explicit.drills, golden.drills, 'drills identical');
  assert.deepEqual(explicit.csvLines, golden.csvLines, 'cutting list identical');
  assert.deepEqual(explicit.derived, golden.derived, 'derived identical');

  // …and both agree with the fixture's own numbers.
  for (const [key, expected] of Object.entries(WA.derived)) {
    if (typeof expected !== 'number') continue;
    assert.ok(Math.abs(golden.derived[key] - expected) < 0.5, `derived.${key}`);
  }
  assert.deepEqual(golden.derived.drawer_heights, [200, 200]);
  assert.deepEqual(golden.derived.drawer_box_side_h, [164, 164], 'the LISP drawerSideH, now derived');
  assert.deepEqual(golden.derived.drawer_box_front_h, [130, 130]);
  assert.deepEqual(golden.drillSummary.runner_rows_dp_y, [38, 241]);
  assert.deepEqual(golden.drillSummary.runner_rows_carcass_y, [56, 259]);
});

test('an item-based stack with no height set is the default stack', () => {
  const items = computeCabinet({
    ...BASE,
    items: [{ id: 'd1', kind: 'drawer', index: 1 }, { id: 'd2', kind: 'drawer', index: 2 }],
  }, P);
  assert.deepEqual(items.derived.drawer_heights, [200, 200]);
  assert.deepEqual(items.derived, withHeights([200, 200]).derived);
});

// ─── a mixed stack: internal consistency ───

test('250 / 150 — the zone adds up and closes under the partition', () => {
  const r = withHeights([250, 150]);
  const d = r.derived;

  // totalH = Σ hᵢ + (n−1)·gap
  assert.equal(d.drawerTotalH, 250 + 150 + DR.gap);
  // partition = G + totalH + clearance
  assert.equal(d.partition_bottom_y, G + d.drawerTotalH + DR.partitionClearance);
  // …and the partition really is that high above the top drawer front.
  const topFrontY = d.drawer_front_y[1];
  const topFrontH = d.drawer_front_h[1];
  assert.equal(d.partition_bottom_y - (topFrontY + topFrontH), DR.partitionClearance);

  // The drawer panel fills the zone below the partition.
  assert.equal(d.drawerPanelH, d.partition_bottom_y - G);
});

test('250 / 150 — fronts sit bottom-up with exactly one gap between them', () => {
  const r = withHeights([250, 150]);
  const d = r.derived;

  // Bottom front is shortened to clear the base, and starts that much higher.
  assert.deepEqual(d.drawer_front_h, [250 - DR.firstFrontAdjust, 150]);
  assert.deepEqual(d.drawer_front_y, [G + DR.firstFrontAdjust, G + 250 + DR.gap]);

  const f1 = drawerPanel(r, 'DRAWER-FRONT', 1);
  const f2 = drawerPanel(r, 'DRAWER-FRONT', 2);
  assert.equal(f1.h, 247);
  assert.equal(f2.h, 150);
  assert.equal(f2.box.y - (f1.box.y + f1.h), DR.gap, 'exactly one gap, no overlap');
  assert.equal(f1.w, f2.w, 'both fronts are the same width');
});

test('250 / 150 — each box follows its OWN front, not the default', () => {
  const r = withHeights([250, 150]);
  // side = front − frontToSideDelta
  assert.deepEqual(r.derived.drawer_box_side_h, [250 - DR.frontToSideDelta, 150 - DR.frontToSideDelta]);
  // box front/back = side − 15 − G − 1, computed off the side exactly as before
  const off = (side) => side - DR.boxFrontHeightDeduction - G - DR.boxFrontHeightExtra;
  assert.deepEqual(r.derived.drawer_box_front_h, [off(214), off(114)]);

  for (const i of [1, 2]) {
    const side = r.derived.drawer_box_side_h[i - 1];
    const bf = r.derived.drawer_box_front_h[i - 1];
    assert.equal(drawerPanel(r, 'DRAWER-SIDE', i).h, side);
    assert.equal(drawerPanel(r, 'DRAWER-BOX-FRONT', i).h, bf);
    assert.equal(drawerPanel(r, 'DRAWER-BOX-BACK', i).h, bf);
    // The box is shorter than the front that hides it.
    assert.ok(side < r.derived.drawer_front_h[i - 1] + DR.firstFrontAdjust);
  }
  // Widths are set by the carcass, not the height, so they stay equal.
  assert.equal(drawerPanel(r, 'DRAWER-SIDE', 1).w, drawerPanel(r, 'DRAWER-SIDE', 2).w);
  assert.equal(drawerPanel(r, 'DRAWER-BOTTOM', 1).h, drawerPanel(r, 'DRAWER-BOTTOM', 2).h);
});

test('250 / 150 — runner rows sit under the drawer they carry', () => {
  const r = withHeights([250, 150]);
  // yᵢ = firstRowFromBottom + Σ_{j<i}(hⱼ + gap), measured off the drawer panel
  assert.deepEqual(r.drillSummary.runner_rows_dp_y, [38, 38 + 250 + DR.gap]);
  // …and off the carcass side, one board higher
  assert.deepEqual(r.drillSummary.runner_rows_carcass_y, [G + 38, G + 38 + 250 + DR.gap]);

  // Every runner row falls inside the front it belongs to.
  r.drillSummary.runner_rows_carcass_y.forEach((y, i) => {
    const top = r.derived.drawer_front_y[i] + r.derived.drawer_front_h[i];
    assert.ok(y >= r.derived.drawer_front_y[i] - DR.firstFrontAdjust && y <= top,
      `runner row ${i} at ${y} is outside drawer ${i + 1} (${r.derived.drawer_front_y[i]}..${top})`);
  });

  // The box hangs the fixed drop below its runner row.
  for (const i of [1, 2]) {
    const box = drawerPanel(r, 'DRAWER-SIDE', i);
    assert.equal(box.box.y, r.drillSummary.runner_rows_carcass_y[i - 1] - DR.boxDropFromRunner);
  }
});

test('a stack of three different heights stays consistent all the way up', () => {
  const heights = [300, 200, 150];
  const r = withHeights(heights, { height: 2150 });
  const d = r.derived;

  assert.equal(d.drawerTotalH, 650 + 2 * DR.gap);
  assert.equal(d.partition_bottom_y, G + d.drawerTotalH + DR.partitionClearance);
  assert.deepEqual(d.drawer_heights, heights);

  // Fronts tile the zone bottom-up with one gap each and never overlap.
  const fronts = [1, 2, 3].map((i) => drawerPanel(r, 'DRAWER-FRONT', i));
  for (let i = 1; i < fronts.length; i += 1) {
    assert.equal(fronts[i].box.y - (fronts[i - 1].box.y + fronts[i - 1].h), DR.gap, `gap below front ${i + 1}`);
  }
  const stackTop = fronts.at(-1).box.y + fronts.at(-1).h;
  assert.equal(d.partition_bottom_y - stackTop, DR.partitionClearance);

  // Runner rows are strictly increasing and one per drawer.
  const rows = r.drillSummary.runner_rows_carcass_y;
  assert.equal(rows.length, heights.length);
  for (let i = 1; i < rows.length; i += 1) assert.ok(rows[i] > rows[i - 1]);

  // Five box parts + one front per drawer, still.
  assert.equal(r.panels.filter((p) => p.role === 'drawer_box').length, heights.length * 5);
  assert.equal(panelsOf(r, 'DRAWER-FRONT').length, heights.length);
  assert.equal(r.totals.runner_pairs, heights.length);
});

test('the cutting list and the CNC geometry follow the per-drawer heights', () => {
  const r = withHeights([250, 150]);
  // Each drawer side appears at its own size, so the CSV really is per drawer.
  const csv = r.csvLines.filter((l) => /,D\d-SL,/.test(l));
  assert.equal(csv.length, 2);
  assert.match(csv[0], /,440,214,/);
  assert.match(csv[1], /,440,114,/);

  // …and the CNC outline of each part matches the part's own dimensions.
  for (const i of [1, 2]) {
    const p = drawerPanel(r, 'DRAWER-SIDE', i);
    const ys = p.cnc.outline.map(([, y]) => y);
    assert.equal(Math.max(...ys), p.h);
  }
});

// ─── validation ───

test('a taller stack still has to fit under its headroom', () => {
  // 6 × 500 = 3015 mm of drawers cannot live in a 2150 mm carcass.
  const r = withHeights([500, 500, 500, 500, 500, 500]);
  assert.ok(r.warnings.some((w) => w.code === 'DRAWERS_TOO_TALL'), 'warning raised');
  assert.equal(r.params.drawers, 0);
  assert.equal(r.panels.filter((p) => p.part === 'PARTITION').length, 0);
});

test('a height outside the workshop limits is pulled back in, loudly', () => {
  const r = withHeights([10, 5000]);
  assert.ok(r.warnings.some((w) => w.code === 'DRAWER_HEIGHT_CLAMPED'), 'warning raised');
  assert.deepEqual(r.derived.drawer_heights, [DR.minFrontHeight, DR.maxFrontHeight]);
  // A clamped stack is still a valid stack: the box parts stay positive.
  for (const h of r.derived.drawer_box_front_h) assert.ok(h > 0, 'box front height must stay positive');
});

test('a nonsense height falls back to the profile default rather than breaking', () => {
  for (const bad of [null, undefined, 'tall', NaN, 0, -50]) {
    const r = withHeights([bad, 200]);
    assert.equal(r.derived.drawer_heights[0], DR.frontHeight, `height ${String(bad)}`);
  }
});

test('drawer items are ordered by index, so height i belongs to drawer i', () => {
  const shuffled = computeCabinet({
    ...BASE,
    items: [
      { id: 'd2', kind: 'drawer', index: 2, height_mm: 150 },
      { id: 'd1', kind: 'drawer', index: 1, height_mm: 250 },
    ],
  }, P);
  assert.deepEqual(shuffled.derived.drawer_heights, [250, 150], 'bottom drawer first, whatever the array order');
  assert.deepEqual(shuffled.derived, withHeights([250, 150]).derived);
});

test('a workshop that runs a different front/box relationship gets it from the profile', () => {
  const custom = migrateCabinetProfile({
    ...DEFAULT_CABINET_PROFILE,
    wardrobe: {
      ...DEFAULT_CABINET_PROFILE.wardrobe,
      drawers: { ...DEFAULT_CABINET_PROFILE.wardrobe.drawers, frontToSideDelta: 50 },
    },
  });
  const r = computeCabinet({ ...BASE, drawers: 2, drawer_heights: [250, 150] }, custom);
  assert.deepEqual(r.derived.drawer_box_side_h, [200, 100]);
});
