// ─── Turn 32, CLAUDE.md F4: ZONES — the wardrobe's columns ──────────────────
//
// A vertical partition divides the interior into COLUMNS, and each column
// lives independently: its own drawers (computed FROM THE COLUMN'S WALLS),
// its own hanging rail, its own shelves standing on its own stack. The
// default zone — bottom, full width, DP + fillers per the LISP — remains the
// answer when no column is named, which is what keeps every golden fixture
// cutting what the AutoLISP cuts.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();

function project() {
  store().loadProject({
    id: null,
    name: 't32-f4',
    room: migrateRoom({ height: 2600, corners: rectCorners(6000, 3000) }),
    design: {},
  }, []);
}

/** A divided wardrobe with the partition brought to FULL DEPTH. */
function dividedWardrobe(width = 1200) {
  project();
  const { id } = store().addUnit('WARDROBE');
  store().updateUnitParams(id, { width, doors: false });
  store().addPartition(id);
  const part = store().units.find((u) => u.id === id)
    .params.sections[0].items.find((i) => i.kind === 'partition');
  return { id, partId: part.id };
}

// ─── the recessed-partition law — a guard that SPEAKS ───────────────────────

test('a recessed partition REFUSES drawers, with the number and the door', () => {
  const { id } = dividedWardrobe();
  // Nobody said anything, so the partition stands at the profile's interior
  // setback — which is exactly the recess the law is about.
  const guard = store().columnDrawerGuard(id, 1);
  assert.equal(guard.blocked, true);
  assert.equal(guard.setbackMm, P.carcass.interiorSetback);
  assert.equal(guard.panelId, 'VPART-1', 'the door to the partition’s own editor');
  assert.match(guard.message, /stands 20 mm back/, 'the number is in the sentence');

  const refused = store().addDrawers(id, 2, 'overlay', 220, 1);
  assert.equal(refused.ok, false);
  assert.ok(refused.guard?.blocked);
  // …and NOTHING was silently fixed: the setback still stands.
  assert.equal(store().columnDrawerGuard(id, 1).blocked, true);
});

test('the setback reset opens the door — full depth takes the drawers', () => {
  const { id, partId } = dividedWardrobe();
  store().updateItem(id, partId, { front_mm: 0 });
  assert.equal(store().columnDrawerGuard(id, 1).blocked, false);
  const res = store().addDrawers(id, 2, 'overlay', 220, 1);
  assert.equal(res.ok, true);
});

// ─── the column's geometry — from ITS walls, not the cabinet's ──────────────

test('column drawers are cut from the COLUMN’S walls', () => {
  const { id, partId } = dividedWardrobe(1200);
  store().updateItem(id, partId, { front_mm: 0 });
  store().addDrawers(id, 2, 'overlay', 220, 1);

  const r = store().unitResult(id);
  const zones = store().zonesOf(id);
  const bay = zones[1];
  const DR = P.wardrobe.drawers;

  // The default zone stayed EMPTY — no DP, no full-width stack.
  assert.equal(r.assemblies.drawerZone, null);
  assert.ok(!r.panels.some((p) => p.part === 'DP'));

  // The boxes: the column's clear light less the same clearance the
  // full-width zone takes off the internal width.
  const side = r.panels.find((p) => p.id === 'Z2D1-SL');
  assert.ok(side, 'the column’s box is cut');
  const bf = r.panels.find((p) => p.id === 'Z2D1-BF');
  assert.equal(bf.w, bay.size - 2 * (P.board.thickness) - DR.boxFrontClearance,
    'box front spans the column, less the box’s own two sides and the clearance');

  // The face: box width + oversize, standing inside the column.
  const front = r.panels.find((p) => p.part === 'DRAWER-FRONT' && p.meta?.zone === 1);
  assert.equal(front.w, (bay.size - DR.boxWidthClearance) + DR.frontOversize);
  assert.ok(front.box.x >= bay.from - DR.frontOversize, 'the face lives in its column');

  // The column's own closing board spans the column, and only the column.
  const closer = r.panels.find((p) => p.id === 'Z2-PART');
  assert.equal(closer.w, bay.size);
  assert.equal(closer.box.x, bay.from);

  // …and it is published for the shelf clamps and the walk.
  const cd = r.assemblies.columnDrawers.find((c) => c.zone === 1);
  assert.equal(cd.count, 2);
  assert.equal(cd.top, closer.box.y);
});

test('the column’s runners drill the column’s OWN walls', () => {
  const { id, partId } = dividedWardrobe(1200);
  store().updateItem(id, partId, { front_mm: 0 });
  store().addDrawers(id, 2, 'overlay', 220, 1);
  const r = store().unitResult(id);
  // Zone 1 (the right column) is walled by the partition and BUR.
  const onPartition = r.drills.filter((d) => d.panel === 'VPART-1' && d.kind === 'runner');
  const onSide = r.drills.filter((d) => d.panel === 'BUR' && d.kind === 'runner');
  const perWall = 2 * P.wardrobe.runners.holeXPattern.length;
  assert.equal(onPartition.length, perWall, 'rows on the partition — it does the DP’s job');
  assert.equal(onSide.length, perWall, 'rows on the carcass side');
  assert.ok(!r.drills.some((d) => d.panel === 'BUL' && d.kind === 'runner'),
    'the OTHER column’s wall is untouched');
  // …and the runners are bought: one pair per column drawer.
  const pairs = r.hardware.filter((h) => h.role === 'runner_pairs')
    .reduce((s, h) => s + h.qty, 0);
  assert.equal(pairs, 2);
});

// ─── overlay / internal, per drawer — T30 F20's mechanism, wired ────────────

test('an INTERNAL drawer is given no face — in a column and in the default zone', () => {
  const { id, partId } = dividedWardrobe(1200);
  store().updateItem(id, partId, { front_mm: 0 });
  store().addDrawers(id, 2, 'internal', 220, 1);
  const r = store().unitResult(id);
  assert.ok(r.panels.some((p) => p.id === 'Z2D1-SL'), 'the box exists');
  assert.ok(!r.panels.some((p) => p.part === 'DRAWER-FRONT' && p.meta?.zone === 1),
    'no face — the drawer lives behind the doors');

  // The default zone hears the same answer through the item's own `mount` —
  // the field T30 wrote and nothing ever read.
  project();
  const { id: plain } = store().addUnit('WARDROBE');
  store().addDrawers(plain, 2, 'internal', 220);
  const pr = store().unitResult(plain);
  assert.ok(pr.assemblies.drawerZone, 'the default stack exists');
  assert.ok(!pr.panels.some((p) => p.part === 'DRAWER-FRONT'), 'and has no faces');
});

// ─── one rail per column ────────────────────────────────────────────────────

test('each column may hang its own rail, cut to its own light', () => {
  const { id } = dividedWardrobe(1200);
  const a = store().addHangerRail(id, { zone: 0 });
  assert.ok(a, 'column 1 takes a rail');
  assert.equal(store().addHangerRail(id, { zone: 0 }), null, 'a second in the same column is refused');
  const b = store().addHangerRail(id, { zone: 1 });
  assert.ok(b, 'column 2 takes its own');

  const r = store().unitResult(id);
  const zones = store().zonesOf(id);
  assert.equal(r.assemblies.columnRails.length, 2);
  const left = r.assemblies.columnRails.find((x) => x.zone === 0);
  assert.equal(left.x1, zones[0].from);
  assert.equal(left.x2, zones[0].to);
  // Each rail is its own purchase, at the column's length.
  const railLines = r.hardware.filter((h) => h.role === 'rail' && h.qty > 0);
  assert.equal(railLines.length, 2);
  // …and each has its partitioner board above it.
  assert.ok(r.panels.some((p) => p.id === 'Z1-RAIL-PART'));
  assert.ok(r.panels.some((p) => p.id === 'Z2-RAIL-PART'));
});

// ─── shelves stand on their column's own stack ──────────────────────────────

test('a shelf in a column with drawers starts above THAT column’s stack', () => {
  const { id, partId } = dividedWardrobe(1200);
  store().updateItem(id, partId, { front_mm: 0 });
  store().addDrawers(id, 2, 'overlay', 220, 1);
  const r = store().unitResult(id);
  const top = r.assemblies.columnDrawers.find((c) => c.zone === 1).top;

  store().addShelves(id, 1, 1);
  const shelf1 = store().units.find((u) => u.id === id)
    .params.sections[0].items.find((i) => i.kind === 'shelf' && i.zone === 1);
  assert.ok(shelf1.pos_mm > top, `shelf at ${shelf1.pos_mm} stands above the stack at ${top}`);

  // The empty column's shelf may live where the drawers would be next door.
  store().addShelves(id, 1, 0);
  const shelf0 = store().units.find((u) => u.id === id)
    .params.sections[0].items.find((i) => i.kind === 'shelf' && i.zone === 0);
  assert.ok(shelf0.pos_mm < shelf1.pos_mm, 'the empty column centres lower');
});

// ─── the label, and the fixtures that must not move ─────────────────────────

test('the owner’s rename: "Vertical partition (divider)"', () => {
  const src = readFileSync(new URL('../src/components/AddItems.jsx', import.meta.url), 'utf8');
  assert.ok(src.includes("label: 'Vertical partition (divider)'"));
});

test('a bare wardrobe with drawers still cuts the LISP’s full-width zone', () => {
  project();
  const { id } = store().addUnit('WARDROBE');
  store().addDrawers(id, 2, 'overlay', 200);
  const r = store().unitResult(id);
  assert.ok(r.assemblies.drawerZone, 'the default zone lives');
  assert.equal(r.assemblies.columnDrawers.length, 0);
  assert.ok(r.panels.some((p) => p.id === 'PARTITION'), 'closed by the full-width board');
});
