// ─── TURN 37 (CLAUDE.md F2): THE RAIL, DONE RIGHT ───────────────────────────
//
// The owner buried T35's design in one breath, 17.08.2026:
//
//   *"masakra, jakieś dziwne wpisywanie... dlaczego drążek nie może być z półką
//   powyżej, i ta półka być traktowana jak półka, tylko że fix? Zrób półkę nad
//   drążkiem — półka, a drążek dołącz do półki i tyle."*
//
// Four things this file holds, and the fourth is the one that costs:
//
//   1. THE ADD PATH makes an ASSEMBLY — one fix shelf and one rail, linked.
//   2. THE RIDE — move the shelf and the rod moves with it, every time, with
//      nothing in the store keeping a copy of the number in step.
//   3. THE DROP comes from the PROFILE (`hardware.hanger.dropMm`), and its
//      default is derived from the bracket geometry the 3D already draws, so
//      the rod lands where the rod has always landed.
//   4. LEGACY IS UNTOUCHED, byte for byte. Every rail saved before tonight is
//      read by T35's own module, resolves to the same Y, and still cuts its
//      partitioner. No migration, no surprise shelf in an old BOM.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { hardwareInstances } from '../src/engine/hardware3d.js';
import { elementFields, elementKind } from '../src/engine/elements.js';
import {
  assemblyShelfPos, hangerDropMm, isLegacyRail, LEGACY_RAIL_NOTE,
  RAIL_MOUNT, railMountOf, railShelfIdOf, resolveShelfMountedRail,
} from '../src/engine/railAssembly.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { watchProjectHistory, unwatchProjectHistory } from '../src/stores/historyStore.js';
import { onBatchEnd } from '../src/stores/historyBatch.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { confirmDrawerBox } from './drawer-box-gate.js';

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
const store = () => useProjectStore.getState();
const G = P.board.thickness;

function project() {
  store().reset?.();
  store().newProject({ name: 'T37 F2', type: 'wardrobe' });
  store().setRoom(migrateRoom({ corners: rectCorners(6000, 4000) }));
  confirmDrawerBox();
}

const unitOf = (id) => store().units.find((u) => u.id === id);
const itemsOf = (id) => unitOf(id).params.sections[0].items;

// ─── 1. the assembly ────────────────────────────────────────────────────────

test('F2 — adding a rail adds ONE fix shelf and ONE rail, linked', () => {
  project();
  const { id } = store().addUnit('WARDROBE');
  const before = itemsOf(id).length;

  const railId = store().addHangerRail(id);
  assert.ok(railId, 'the call still answers with the rail\'s id');

  const items = itemsOf(id);
  assert.equal(items.length - before, 2, 'exactly two items arrived');
  const rail = items.find((i) => i.id === railId);
  const shelves = items.filter((i) => i.kind === 'shelf');
  assert.equal(shelves.length, 1, 'one shelf, not two');

  // The LINK, both halves of it.
  assert.equal(rail.mount, 'shelf');
  assert.equal(rail.shelf_id, shelves[0].id);
  assert.equal(railMountOf(rail), RAIL_MOUNT.SHELF);
  assert.equal(railShelfIdOf(rail), shelves[0].id);
  assert.equal(isLegacyRail(rail), false);

  // …and the shelf is FIX, which is the owner's own word: *"traktowana jak
  // półka, tylko że fix"*. A pin shelf would drop a rod full of coats.
  assert.equal(shelves[0].variant, 'fixed');

  // The store reads the pair back as one thing.
  const pair = store().railAssemblyOf(id, railId);
  assert.ok(pair, 'the assembly is readable');
  assert.equal(pair.shelf.id, shelves[0].id);
  assert.equal(pair.rail.id, railId);
});

test('F2 — the two arrive in ONE undo step', () => {
  // The history watcher is a SUBSCRIBER with a trailing timer
  // (`stores/historyStore.js`), so what a test can hold is the thing the
  // watcher actually reads: was a BATCH running while the two items landed?
  // One batch is one undo step — a joiner who presses Ctrl+Z after "Add hanger
  // rail" gets rid of the rail, not of half of it.
  watchProjectHistory();
  try {
    project();
    const { id } = store().addUnit('WARDROBE');
    let depthDuring = 0;
    const stop = onBatchEnd(() => { depthDuring += 1; });
    const railId = store().addHangerRail(id);
    stop();
    assert.ok(railId);
    assert.equal(itemsOf(id).filter((i) => i.kind === 'shelf' || i.kind === 'hanger').length, 2);
    assert.equal(depthDuring, 1, 'ONE outermost batch closed, not two');
  } finally {
    unwatchProjectHistory();
  }
});

test('F2 — the rod lands EXACTLY where the old automatic placement put it', () => {
  // The whole point of deriving the drop from `wardrobe.rail.partitionAbove`:
  // the joiner who presses the button tonight gets the rod he got yesterday.
  project();
  const { id } = store().addUnit('WARDROBE');
  store().addDrawers(id, 2);
  store().addHangerRail(id);

  const r = store().unitResult(id);
  const shelf = itemsOf(id).find((i) => i.kind === 'shelf');
  assert.equal(r.assemblies.rail.y, shelf.pos_mm - hangerDropMm(P),
    'the rod is the shelf underside less the bracket drop');
  // And the shelf stands where the partitioner stood: `axis + drop`.
  assert.equal(assemblyShelfPos({ railAxis: r.assemblies.rail.y, drop: hangerDropMm(P) }),
    shelf.pos_mm);
});

// ─── 2. the ride ────────────────────────────────────────────────────────────

test('F2 — the rod RIDES the shelf: move the board, the rail follows', () => {
  project();
  const { id } = store().addUnit('WARDROBE');
  const railId = store().addHangerRail(id);
  const shelf = itemsOf(id).find((i) => i.kind === 'shelf');
  const drop = hangerDropMm(P);

  const before = store().unitResult(id).assemblies.rail.y;
  assert.equal(before, shelf.pos_mm - drop);

  // Drag it down 300 mm — the same setter the drag calls.
  const moved = store().setShelfPos(id, shelf.id, shelf.pos_mm - 300);
  const now = itemsOf(id).find((i) => i.id === shelf.id).pos_mm;
  assert.ok(now < shelf.pos_mm, `the shelf moved (${shelf.pos_mm} → ${now})`);
  assert.equal(moved.blocked, false, 'and it was not refused');

  assert.equal(store().unitResult(id).assemblies.rail.y, now - drop,
    'the rod is still exactly the drop under its shelf');
  // Nothing in the store kept a copy in step: the rail item never moved.
  assert.equal(itemsOf(id).find((i) => i.id === railId).shelf_id, shelf.id);
});

test('F2 — the assembly leaves together: delete the shelf, the rod goes', () => {
  project();
  const { id } = store().addUnit('WARDROBE');
  const railId = store().addHangerRail(id);
  const shelf = itemsOf(id).find((i) => i.kind === 'shelf');

  store().removeItem(id, shelf.id);
  assert.equal(itemsOf(id).find((i) => i.id === railId), undefined,
    'a rod hanging on nothing is not left in the section');
  assert.equal(store().unitResult(id).assemblies.rail, null, 'and nothing is drawn');
});

test('F2 — a rail whose shelf is gone is NOT re-hung on a guess', () => {
  // The engine's own refusal, asked directly of `computeCabinet`.
  const r = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: '01',
    sections: [{ items: [{ id: 'h1', kind: 'hanger', mount: 'shelf', shelf_id: 'gone' }] }],
  }, P);
  assert.equal(r.assemblies.rail, null, 'no rod');
  assert.ok(!r.panels.some((p) => p.part === 'RAIL-PART'), 'and no partitioner either');
});

// ─── 3. the drop, from the profile ──────────────────────────────────────────

test('F2 — the drop is PROFILE-LISTED, and its default is the bracket\'s own', () => {
  assert.equal(P.hardware.hanger.dropMm, P.wardrobe.rail.partitionAbove,
    'derived from the geometry the 3D already draws, so nothing visibly moves');
  assert.equal(hangerDropMm(P), 40);
  // A profile written before this turn still answers 40 — the fallback is the
  // number it is derived from, never zero (a rod inside its own shelf).
  assert.equal(hangerDropMm({ wardrobe: { rail: { partitionAbove: 40 } } }), 40);
  assert.equal(hangerDropMm({}), 0, 'and a profile with neither says so plainly');
  // A workshop with a deeper bracket changes one line, and the ROD moves —
  // never the shelf.
  const deep = { ...P, hardware: { ...P.hardware, hanger: { dropMm: 65 } } };
  const r = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: '01',
    sections: [{ items: [{ id: 's1', kind: 'shelf', variant: 'fixed', pos_mm: 1400 }, { id: 'h1', kind: 'hanger', mount: 'shelf', shelf_id: 's1' }] }],
  }, deep);
  assert.equal(r.assemblies.rail.y, 1400 - 65);
});

test('F2 — resolveShelfMountedRail is the one law, and it answers null honestly', () => {
  const shelves = [{ id: 's1', pos_mm: 1200 }];
  assert.equal(resolveShelfMountedRail({
    item: { mount: 'shelf', shelf_id: 's1' }, shelfItems: shelves, drop: 40,
  }).axis, 1160);
  assert.equal(resolveShelfMountedRail({
    item: { mount: 'shelf', shelf_id: 'nope' }, shelfItems: shelves, drop: 40,
  }), null, 'a shelf that is not there');
  assert.equal(resolveShelfMountedRail({
    item: { mount: 'shelf' }, shelfItems: shelves, drop: 40,
  }), null, 'a mount with no shelf named is NOT half a new rail');
  assert.equal(resolveShelfMountedRail({
    item: { pos_mm: 900, datum: { kind: 'floor', id: null } }, shelfItems: shelves, drop: 40,
  }), null, 'and a legacy rail is never read by this law');
});

// ─── 4. legacy, untouched ───────────────────────────────────────────────────

// ─── RE-PINNED, TURN 42 (CLAUDE.md F1) ─────────────────────────────────────
// T37 wrote "a LEGACY rail keeps everything" and meant it: the rod, and the
// board 40 mm over it. The owner refused that board for the fourth time on
// 19.08.2026 — *"nie patrzymy na przeszłość w ogóle"* — so there is no legacy
// geometry left to keep. A stored rail that does not say SHELF is ALONE, and
// an alone rod is a rod: no partitioner, no nine screws, no cut list row.
//
// The ROD ITSELF does not move by a millimetre, which is the half of T37's
// sentence that survives and the half worth pinning.
test('F2 — a rail that is not an assembly is ALONE: the rod stands, the board is gone', () => {
  const alone = computeCabinet({
    ...defaultParamsFor('WARDROBE', P), unit_num: '01', rail: true, rail_offset: 1400,
  }, P);
  assert.ok(alone.assemblies.rail, 'the rod is there');
  assert.equal(alone.assemblies.rail.y, G + 1400, 'the T35 law, over the bay floor — unmoved');
  assert.equal(alone.assemblies.rail.mount, RAIL_MOUNT.ALONE, 'and it says which of the two it is');
  assert.ok(!alone.panels.some((p) => p.part === 'RAIL-PART'), 'no partitioner is cut');
  assert.equal(alone.drills.filter((d) => d.kind === 'rail_partition_screw').length, 0,
    'and none of its nine screws is drilled');
  // The SIDE FLANGE stays — CLAUDE.md keeps it by name: an alone rod still has
  // to hang on something, and it hangs on the sides.
  const brackets = alone.drills.filter((d) => d.kind === 'rail_bracket');
  assert.equal(brackets.length, 2);
  for (const b of brackets) assert.equal(b.y, G + 1400);
  // And the key that names a shelf is ABSENT, not null (iron rule 2).
  assert.ok(!('shelfItemId' in alone.assemblies.rail));
});

test('F2 — a shelf-mounted rail cuts NO partitioner and drills no partitioner screws', () => {
  const r = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: '01',
    sections: [{ items: [{ id: 's1', kind: 'shelf', variant: 'fixed', pos_mm: 1500 }, { id: 'h1', kind: 'hanger', mount: 'shelf', shelf_id: 's1' }] }],
  }, P);
  assert.equal(r.assemblies.rail.y, 1500 - 40);
  assert.equal(r.assemblies.rail.shelfItemId, 's1');
  assert.ok(!r.panels.some((p) => p.part === 'RAIL-PART'), 'the fix shelf IS the board above the rod');
  assert.equal(r.drills.filter((d) => d.kind === 'rail_partition_screw').length, 0);
  // …but the BRACKET screw is still drilled, at the rod's axis, into both sides.
  const brackets = r.drills.filter((d) => d.kind === 'rail_bracket');
  assert.equal(brackets.length, 2);
  for (const b of brackets) assert.equal(b.y, 1460);
});

// ─── the rod opens the SHELF's modal ────────────────────────────────────────

test('F2 — double-clicking the rod opens the SHELF, and the T36 clickability stays', () => {
  const r = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: '01',
    sections: [{ items: [{ id: 's1', kind: 'shelf', variant: 'fixed', pos_mm: 1500 }, { id: 'h1', kind: 'hanger', mount: 'shelf', shelf_id: 's1' }] }],
  }, P);
  const { rails } = hardwareInstances(r, P);
  assert.equal(rails.length, 1);
  assert.ok(rails[0].panelId, 'the tube still names a panel — T36-F8 stands');
  const board = r.panels.find((p) => p.id === rails[0].panelId);
  assert.equal(board.part, 'SHELF', 'and the panel it names is the SHELF');
  assert.equal(board.meta.itemId, 's1');
  assert.equal(elementKind(board), 'shelf');
  // …which is the modal that has the height in it, and it says what it carries.
  const fields = elementFields(board);
  assert.equal(fields[0], 'rail-rider', 'the fact comes first');
  assert.ok(fields.includes('position-y'), 'and the shelf\'s own height is the rail\'s height');
});

test('F2 — an ALONE rod names ITSELF, because there is no board to name', () => {
  // T42-F1. A rail on a bare kit call carries no item at all, so there is no
  // item id either — and a rod nobody can address is a rod nobody can edit,
  // which is exactly the gate `Hardware.jsx` closes on a null `panelId`.
  const bare = computeCabinet({
    ...defaultParamsFor('WARDROBE', P), unit_num: '01', rail: true,
  }, P);
  assert.equal(hardwareInstances(bare, P).rails[0].mount, RAIL_MOUNT.ALONE);
  assert.ok(!bare.panels.some((p) => p.part === 'RAIL-PART'));

  // With an ITEM — which is every rail a joiner adds in the app — the rod is
  // addressed by it.
  const withItem = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: '01',
    sections: [{ items: [{ id: 'h1', kind: 'hanger', mount: 'alone', pos_mm: 1400 }] }],
  }, P);
  const rod = hardwareInstances(withItem, P).rails[0];
  assert.equal(rod.mount, RAIL_MOUNT.ALONE);
  assert.equal(rod.panelId, 'h1');
  assert.equal(rod.itemId, 'h1');
  assert.equal(elementKind({ part: 'RAIL-PART', role: 'shelf' }), null, 'the board is not a kind any more');
});

// ─── the column's rail rides its own bay's shelf ────────────────────────────

test('F2 — a COLUMN rail rides a shelf in ITS bay, and only there', () => {
  project();
  const { id } = store().addUnit('WARDROBE');
  store().updateUnitParams(id, { width: 1600 });
  store().addPartition(id);
  const zones = store().zonesOf(id);
  assert.ok(zones.length >= 2, 'two bays');

  const railId = store().addHangerRail(id, { zone: 0 });
  assert.ok(railId);
  const rail = itemsOf(id).find((i) => i.id === railId);
  const shelf = itemsOf(id).find((i) => i.id === rail.shelf_id);
  assert.equal(shelf.zone, 0, 'the shelf stands in the rail\'s own bay');

  const r = store().unitResult(id);
  const col = r.assemblies.columnRails.find((c) => c.zone === 0);
  assert.ok(col, 'the column has a rod');
  assert.equal(col.y, shelf.pos_mm - hangerDropMm(P));
  assert.equal(col.shelfItemId, shelf.id);
  assert.ok(!r.panels.some((p) => p.part === 'RAIL-PART'), 'and no partitioner in either bay');
});

// ─── the UI: the field is retired, the note is there ────────────────────────

test('F2 — the modal retires "Height above support" for a new rail', () => {
  const ui = src('components/ElementProperties.jsx');
  // The legacy branch keeps the field AND owes the joiner the grey note.
  assert.match(ui, /data-legacy-rail-note="1"/);
  assert.match(ui, /LEGACY_RAIL_NOTE/);
  assert.match(ui, /isLegacyRail\(railItem\)/, 'the branch turns on the item, not on a guess');
  // …and a shelf that carries a rod says so.
  assert.match(ui, /data-rail-rider="1"/);
  assert.equal(LEGACY_RAIL_NOTE, 'old-style rail — re-add to get the shelf-mounted one');
});

test('F2 — nothing was deleted to make room for this', () => {
  // Iron rule 4. T35's module is the LEGACY law and it stays, whole.
  const datum = src('engine/railDatum.js');
  for (const fn of ['railSupportTops', 'resolveRailAxis', 'railDatumFor', 'railObstruction']) {
    assert.match(datum, new RegExp(`export function ${fn}`), `${fn} is still there`);
  }
  assert.match(src('stores/projectStore.js'), /setRailHeight: \(unitId, itemId, mmRaw\)/,
    'and so is the setter the old field commits through');
});
