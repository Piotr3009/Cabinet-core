// ─── TURN 41, F2: ONE RAIL CHAIN ────────────────────────────────────────────
//
// An INVESTIGATION first. What the trace found, in one paragraph, because the
// shape of the fault decides the shape of the tests:
//
// FIVE PRODUCERS of a rail (a params flag, a legacy item, T40's "alone", T37's
// assembly, and a COLUMN copy of all of it), and THREE WRITERS of its height —
// of which exactly one works. The rod is drawn and drilled correctly, so the
// fault is invisible from the 3-D: it lives in the numbers a SAVED PROJECT
// reads back, and in a hand-copied drilling block that lost its null guard.
//
// ─── WHAT EVERY TEST HERE ASSERTS ───────────────────────────────────────────
//
// The turn's discipline is "prove the thing, not the field", and the trace put
// it sharply: every T40 rail test asserted `rail.mount`, `rail.shelf_id`,
// `railMountOf(...)` or a regex over the JSX, and not one of them would have
// caught a single defect below. So nothing here asserts a mount, an id or a
// stored `pos_mm`. It asserts the ROD'S Y — read from the engine, from the
// drills, and from what a reload or a copy gets back — and it asserts HOLE
// COUNTS, because a hole is a fact about a board.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { hangerDropMm } from '../src/engine/railAssembly.js';
import { drillFindings } from '../src/engine/cnc/drillGuard.js';
import { exportGate } from '../src/engine/cnc/exportGate.js';
import { migrateUnitShelves, paramsForEngine, useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { templateParams } from '../src/lib/templates.js';

const DROP = hangerDropMm(P);

const withItems = (items, over = {}) => computeCabinet({
  ...defaultParamsFor('WARDROBE', P), unit_num: '01', items, sections: [{ items }], ...over,
}, P);

const assemblyItems = (shelfAt) => ([
  { id: 'sh1', kind: 'shelf', variant: 'fixed', pos_mm: shelfAt, thickness_mm: 18 },
  { id: 'h1', kind: 'hanger', mount: 'shelf', shelf_id: 'sh1', pos_mm: shelfAt - DROP },
]);

const columnItems = (shelfAt) => ([
  { id: 'p1', kind: 'partition', x_mm: 700 },
  { id: 'sh1', kind: 'shelf', variant: 'fixed', pos_mm: shelfAt, thickness_mm: 18, zone: 0 },
  { id: 'h1', kind: 'hanger', mount: 'shelf', shelf_id: 'sh1', pos_mm: shelfAt - DROP, zone: 0 },
]);

// ═══ 1. THE ROD'S Y, FROM EVERY READER THAT CLAIMS TO KNOW IT ═══════════════

test('F2 — the rod\'s Y after a move: every reader says the same millimetre', () => {
  // The brief names this as the observable fact for this feature. Two heights,
  // so the assertion is about the LAW and not about one lucky number.
  for (const shelfAt of [1458, 900, 1800]) {
    const r = withItems(assemblyItems(shelfAt));
    const want = shelfAt - DROP;
    assert.equal(r.assemblies?.rail?.y, want, `engine, shelf at ${shelfAt}`);
    assert.equal(r.derived?.rail_y, want, `derived, shelf at ${shelfAt}`);
    const brackets = (r.drills || []).filter((d) => d.kind === 'rail_bracket');
    assert.equal(brackets.length, 2, 'one bracket per side');
    for (const b of brackets) assert.equal(b.y, want, `${b.panel}: the machine drills where the rod is`);
    // …and the board the rod hangs from is where it was put.
    const shelf = (r.panels || []).find((p) => p.role === 'shelf' && Math.abs((p.box?.y ?? -1) - shelfAt) < 1);
    assert.ok(shelf, `the fix shelf is cut at ${shelfAt}`);
  }
});

// ═══ 2. NO PARTITIONER SCREW WITHOUT A PARTITIONER ══════════════════════════

test('F2 — a shelf-mounted rail cuts NO partitioner screws, unit-wide or per column', () => {
  // THE FAULT: the column drilling block is a hand-copy of the unit-wide one
  // and the copy lost `if (railPartCentreY == null) continue`. For an assembly
  // `railPartY` is null, and in JavaScript `null + G / 2` is 9 — so three
  // screws went into BUL at y = 9, three into BACK at y = 9, and three into
  // VPART-1 at y = −9.
  //
  // Asserted as a COUNT, because the count is exact: the assembly's board IS a
  // fix shelf and takes the fix shelf's own screws, so the partitioner's screws
  // cannot exist.
  for (const [label, r] of [
    ['unit-wide', withItems(assemblyItems(1458))],
    ['column', withItems(columnItems(1458), { width: 1400 })],
  ]) {
    const part = (r.drills || []).filter((d) => d.kind === 'rail_partition_screw');
    assert.equal(part.length, 0, `${label}: ${part.length} partitioner screws on a rail that has no partitioner`);
    assert.equal((r.panels || []).filter((p) => p.part === 'RAIL-PART').length, 0,
      `${label}: and no partitioner board either`);
    // The BRACKET screw is the rail's own and is drilled in every case.
    assert.ok((r.drills || []).filter((d) => d.kind === 'rail_bracket').length >= 2, `${label}: the bracket is drilled`);
  }
});

test('F2 — a rail on its own KEEPS its partitioner and its nine screws', () => {
  // The other half of the same law, so the fix cannot be "drill nothing".
  // T40-F6's "alone" is read by the LEGACY law on purpose and is untouched.
  const alone = withItems([{ id: 'h1', kind: 'hanger', mount: 'alone', pos_mm: 1400 }]);
  assert.equal((alone.panels || []).filter((p) => p.part === 'RAIL-PART').length, 1, 'it cuts its own partitioner');
  assert.equal((alone.drills || []).filter((d) => d.kind === 'rail_partition_screw').length, 9);
  assert.equal((alone.drills || []).filter((d) => d.kind === 'rail_bracket').length, 2);
});

test('F2 — no drill lands at a negative coordinate, in any rail configuration', () => {
  // Frame-independent on purpose: the boards in this app are not all drilled in
  // the frame their cut rectangle is recorded in (a VPART is drilled depth
  // first), so a bounds test would report faults that are not there. A negative
  // coordinate is off the board in every frame anyone could read it in.
  const CONFIGS = [
    ['legacy (params)', computeCabinet({ ...defaultParamsFor('WARDROBE', P), unit_num: '01', rail: true, rail_offset: 1400 }, P)],
    ['alone', withItems([{ id: 'h1', kind: 'hanger', mount: 'alone', pos_mm: 1400 }])],
    ['assembly', withItems(assemblyItems(1458))],
    ['column assembly', withItems(columnItems(1458), { width: 1400 })],
    ['column alone', withItems([
      { id: 'p1', kind: 'partition', x_mm: 700 },
      { id: 'h1', kind: 'hanger', mount: 'alone', pos_mm: 1400, zone: 0 },
    ], { width: 1400 })],
  ];
  for (const [label, r] of CONFIGS) {
    const neg = (r.drills || []).filter((d) => d.x < -0.001 || d.y < -0.001);
    assert.equal(neg.length, 0,
      `${label}: ${neg.map((d) => `${d.panel} ${d.kind} (${d.x}, ${d.y})`).join('; ')}`);
  }
});

test('F2 — and the workshop can actually export every one of them', () => {
  // The three screws at y = 9 landed on the bottom panel's own screw row, so
  // the duplicate-drill guard held two parts out of the export. A rail that
  // cannot be exported is not a rail — which is why this asserts the GATE and
  // not just the coordinates.
  for (const [label, params] of [
    ['assembly', { ...defaultParamsFor('WARDROBE', P), unit_num: '01', items: assemblyItems(1458), sections: [{ items: assemblyItems(1458) }] }],
    ['column assembly', { ...defaultParamsFor('WARDROBE', P), unit_num: '01', width: 1400, items: columnItems(1458), sections: [{ items: columnItems(1458) }] }],
  ]) {
    const r = computeCabinet(params, P);
    const findings = drillFindings(r, { profile: P, unitNum: '01' });
    assert.equal(findings.length, 0, `${label}: ${findings.map((f) => f.message).join(' | ')}`);
    const gate = exportGate([{ unit: { id: 'u1', params }, result: r }], { profile: P });
    assert.notEqual(gate.ok, false, `${label}: ${gate.message}`);
  }
});

// ═══ 3. WHAT A RELOAD GETS BACK ═════════════════════════════════════════════

test('F2 — a reload does not put the rail\'s shelf back on pins', () => {
  // THE FAULT: `migrateUnitShelves` reads every `variant: 'fixed'` as a shelf
  // saved before turn 8 and demotes it. A unit born in THIS version has no
  // `shelf_schema` stamp, so the migration fires on it, and the rail assembly's
  // own shelf — fixed precisely because it carries a rod — came back on pins:
  // 864 mm wide became 860, eleven screw holes became twelve pin holes.
  //
  // Asserted on the CUT PANEL and its HOLES, not on `item.variant`, because the
  // panel is what the workshop gets.
  const items = assemblyItems(1458);
  const unit = { id: 'u1', params: { ...defaultParamsFor('WARDROBE', P), unit_num: '01', sections: [{ items }] } };
  const before = computeCabinet({ ...unit.params, items }, P);
  const migrated = migrateUnitShelves(JSON.parse(JSON.stringify(unit)));
  const after = computeCabinet({
    ...migrated.params, items: migrated.params.sections[0].items,
  }, P);

  const shelfOf = (r) => (r.panels || []).find((p) => p.role === 'shelf' && Math.abs((p.box?.y ?? -1) - 1458) < 1);
  const b = shelfOf(before);
  const a = shelfOf(after);
  assert.ok(b && a, 'the shelf survives the reload');
  assert.equal(a.w, b.w, 'the same board comes back the same width');
  // …and it is still screwed, not pinned: the hole KINDS are the fact.
  const kinds = (r, id) => [...new Set((r.drills || []).filter((d) => d.panel === id || d.id === id).map((d) => d.kind))].sort();
  assert.deepEqual(kinds(after, a.id), kinds(before, b.id), 'drilled the same way it was drilled');
  // And the rod is still where it was.
  assert.equal(after.assemblies?.rail?.y, before.assemblies?.rail?.y, 'the rod did not move on reload');
  assert.equal(after.assemblies?.rail?.y, 1458 - DROP);
});

test('F2 — an ordinary legacy fix shelf is STILL demoted, so turn 8 is intact', () => {
  // The exemption is exactly one shelf: the one a hanger names. A project saved
  // before turn 8 must still be read as adjustable, which is what that
  // migration exists for.
  const items = [{ id: 'sh1', kind: 'shelf', variant: 'fixed', pos_mm: 1000 }];
  const unit = { id: 'u1', params: { ...defaultParamsFor('WARDROBE', P), sections: [{ items }] } };
  const out = migrateUnitShelves(unit);
  assert.equal(out.params.sections[0].items[0].variant, 'adjustable', 'no rod names it, so it is legacy');
});

// ═══ 4. THE STORE: ONE DRAG, ONE TRUTH — AND A COPY THAT KEEPS ITS RAIL ═════

const store = () => useProjectStore.getState();
const freshProject = () => store().loadProject({
  id: null, name: 't41-f2', design: {},
  room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
}, []);

/** A wardrobe with a rail ASSEMBLY on it, and the ids of both its items. */
function wardrobeWithAssembly() {
  freshProject();
  const u = store().addUnit('WARDROBE');
  store().addHangerRail(u.id);
  const items = store().units.find((x) => x.id === u.id).params.sections[0].items;
  return {
    unitId: u.id,
    shelfId: items.find((i) => i.kind === 'shelf').id,
    railId: items.find((i) => i.kind === 'hanger').id,
  };
}

const railYOf = (unitId) => {
  const unit = store().units.find((x) => x.id === unitId);
  return computeCabinet(paramsForEngine(unit), P).assemblies?.rail?.y ?? null;
};

test('F2 — the rod\'s Y after a DRAG, and the SAVED number agrees with it', () => {
  // THE FAULT the brief names by hand: "the rail's y after a drag". The rod
  // followed the shelf everywhere it was drawn or drilled, and the item's own
  // `pos_mm` stayed at its BIRTH height — which is the number `paramsForEngine`
  // harvests into `rail_offset` and the number a saved project reads back. A
  // 540 mm error, invisible in the 3-D.
  const { unitId, shelfId } = wardrobeWithAssembly();
  const bornShelf = store().units.find((x) => x.id === unitId)
    .params.sections[0].items.find((i) => i.kind === 'shelf').pos_mm;
  const bornRod = railYOf(unitId);
  assert.equal(bornRod, bornShelf - DROP, 'the rod is born under its shelf');

  const moved = store().setShelfPos(unitId, shelfId, 900, 0.5);
  assert.equal(moved.blocked, false, 'the rail\'s own shelf is draggable (T37-F2)');

  // 1. what the ENGINE says…
  const nowShelf = store().units.find((x) => x.id === unitId)
    .params.sections[0].items.find((i) => i.kind === 'shelf').pos_mm;
  const nowRod = railYOf(unitId);
  assert.equal(nowRod, nowShelf - DROP, 'the rod followed the shelf');
  assert.notEqual(nowRod, bornRod, 'and it really did move');

  // 2. …and what a SAVED PROJECT reads back. This is the half that was wrong.
  const unit = store().units.find((x) => x.id === unitId);
  const params = paramsForEngine(unit);
  const rebuilt = computeCabinet(params, P).assemblies?.rail?.y;
  assert.equal(rebuilt, nowRod,
    `the params a save writes rebuild the rod at ${rebuilt}, and it is at ${nowRod}`);

  // 3. AND THE STORED MILLIMETRE ITSELF. While the `mount` link survives, the
  // engine reads the SHELF and gets the right answer whatever `pos_mm` says —
  // which is exactly why this went unnoticed. The number only bites a reader
  // that has lost the link: a template, an older importer, anything that takes
  // `rail_offset` at its word. Measured on T40: after this drag the rod is at
  // 860 and such a reader rebuilt it at 1418.
  const items = store().units.find((x) => x.id === unitId).params.sections[0].items;
  const noMount = items.filter((i) => i.kind !== 'shelf')
    .map((i) => ({ ...i, mount: undefined, shelf_id: undefined }));
  const blind = computeCabinet({ ...params, items: noMount, sections: [{ items: noMount }] }, P);
  assert.equal(blind.assemblies?.rail?.y, nowRod,
    `a reader that has only the stored millimetre puts the rod at ${blind.assemblies?.rail?.y}, `
    + `and the rod is at ${nowRod}`);
});

test('F2 — a COPIED wardrobe keeps its rail', () => {
  // THE FAULT: `applyTemplateParams` re-ids every item and did not re-point the
  // hanger's `shelf_id`, so the copy's rod named a shelf in the SOURCE unit.
  // The engine's orphan rule then removed the rail — correctly and silently.
  // Asserted on the ROD and the BOM line, not on the foreign key.
  const { unitId } = wardrobeWithAssembly();
  const source = store().units.find((x) => x.id === unitId);
  const sourceY = railYOf(unitId);
  assert.ok(sourceY != null, 'the source has a rod');

  const copy = store().addUnit('WARDROBE', { params: templateParams(source) });
  const copyY = railYOf(copy.id);
  assert.equal(copyY, sourceY, 'the copy has a rod, at the same height');

  const r = computeCabinet(paramsForEngine(store().units.find((x) => x.id === copy.id)), P);
  assert.equal((r.drills || []).filter((d) => d.kind === 'rail_bracket').length, 2,
    'and the machine drills its brackets');
  // …and the copy's own shelf is the one it hangs from, not the source's.
  const copyItems = store().units.find((x) => x.id === copy.id).params.sections[0].items;
  const copyShelf = copyItems.find((i) => i.kind === 'shelf');
  const copyRail = copyItems.find((i) => i.kind === 'hanger');
  assert.equal(copyRail.shelf_id, copyShelf.id, 'the foreign key points inside the copy');
  assert.notEqual(copyShelf.id, source.params.sections[0].items.find((i) => i.kind === 'shelf').id);
});
