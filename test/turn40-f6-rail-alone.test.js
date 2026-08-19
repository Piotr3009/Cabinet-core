// ─── TURN 40 (CLAUDE.md F6): THE RAIL — WITH A SHELF, OR ON ITS OWN ─────────
//
// The owner, 18.08.2026: *"następnie dodawanie drążka raz i z półką proszę —
// wybór w drążek modal, to ważne."*
//
// T37-F2 made adding a rail ALWAYS an assembly — a FIX shelf with the rod
// beneath it — and that was his own verdict at the time. Nothing here
// overturns it: THE DEFAULT STAYS THE ASSEMBLY, and the modal gains the
// alternative. *"Legacy rails are untouched, as T37 left them"* is satisfied by
// construction, because a rod on its own IS read by the legacy law.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import {
  RAIL_MOUNT, RAIL_ALONE_NOTE, LEGACY_RAIL_NOTE, hangerDropMm, isLegacyRail,
  railChosenAlone, railMountOf,
} from '../src/engine/railAssembly.js';
import { useProjectStore, paramsForEngine } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();
const src = (rel) => readFileSync(new URL(`../src/${rel}`, import.meta.url), 'utf8');

function wardrobe() {
  store().loadProject({
    id: null, name: 't40-f6', room: migrateRoom({ height: 2700, corners: rectCorners(4000, 3000) }), design: {},
  }, []);
  const { id } = store().addUnit('WARDROBE');
  store().updateUnitParams(id, { width: 900, height: 2150, doors: { count: 2 } });
  return id;
}

const itemsOf = (id) => store().units.find((u) => u.id === id).params.sections[0].items;
const resultOf = (id) => computeCabinet(paramsForEngine(store().units.find((u) => u.id === id)), P);

// ═══ THE DEFAULT IS UNCHANGED ══════════════════════════════════════════════

test('F6 — the DEFAULT is still T37’s assembly, to the millimetre', () => {
  const id = wardrobe();
  const railId = store().addHangerRail(id);
  assert.ok(railId);
  const items = itemsOf(id);
  const rail = items.find((i) => i.id === railId);
  const shelf = items.find((i) => i.kind === 'shelf');
  assert.ok(shelf, 'a FIX shelf came with it');
  assert.equal(shelf.variant, 'fixed');
  assert.equal(railMountOf(rail), RAIL_MOUNT.SHELF);
  assert.equal(rail.shelf_id, shelf.id);
  // …and the rod hangs the bracket's own drop under that shelf.
  const r = resultOf(id);
  assert.ok(r.assemblies.rail);
  assert.equal(Math.round(r.assemblies.rail.y),
    Math.round(Number(shelf.pos_mm) - hangerDropMm(P)));
});

// ═══ AND THE ALTERNATIVE IS THE ONE HE ASKED FOR ═══════════════════════════

test('F6 — RAIL ALONE: no shelf, and the rod still hangs', () => {
  const id = wardrobe();
  const railId = store().addHangerRail(id, { withShelf: false });
  assert.ok(railId);
  const items = itemsOf(id);
  assert.deepEqual(items.filter((i) => i.kind === 'shelf'), [], 'not one shelf came with it');
  assert.equal(items.filter((i) => i.kind === 'hanger').length, 1);
  const r = resultOf(id);
  assert.ok(r.assemblies.rail, 'and the rod is really there');
  assert.ok(Number(r.assemblies.rail.y) > 0);
});

test('F6 — a rail alone is read by the LEGACY law, which is why nothing moved', () => {
  const id = wardrobe();
  const railId = store().addHangerRail(id, { withShelf: false });
  const rail = itemsOf(id).find((i) => i.id === railId);
  // It is READ as legacy geometry…
  assert.equal(railMountOf(rail), RAIL_MOUNT.LEGACY);
  assert.equal(isLegacyRail(rail), true);
  // …and it carries the same two fields a pre-T37 rail carried, so the rod
  // lands where a rail on its own has always landed.
  assert.equal(typeof rail.pos_mm, 'number');
  assert.ok(rail.datum);
  // …including its own PARTITIONER, which is what a rail with no shelf above
  // it has always been given.
  const r = resultOf(id);
  assert.ok(r.panels.some((p) => p.part === 'RAIL-PART'), 'the partitioner is cut');
  // The assembly does NOT cut one — the fix shelf is that board.
  const other = wardrobe();
  store().addHangerRail(other);
  assert.equal(resultOf(other).panels.some((p) => p.part === 'RAIL-PART'), false);
});

test('F6 — the rod lands at the SAME height either way', () => {
  // The two constructions differ by a board, not by a position: T37's own
  // bargain was that the shelf stands where the partitioner stood.
  const withShelf = wardrobe();
  store().addHangerRail(withShelf);
  const a = resultOf(withShelf).assemblies.rail.y;

  const alone = wardrobe();
  store().addHangerRail(alone, { withShelf: false });
  const b = resultOf(alone).assemblies.rail.y;

  assert.equal(Math.round(a), Math.round(b),
    `with a shelf ${a}, alone ${b} — one rod, one height`);
});

// ═══ THE CHOICE IS RECORDED, BECAUSE THE TWO REASONS DIFFER ════════════════

test('F6 — "alone by choice" and "old" are told apart', () => {
  const id = wardrobe();
  const railId = store().addHangerRail(id, { withShelf: false });
  const chosen = itemsOf(id).find((i) => i.id === railId);
  assert.equal(chosen.mount, RAIL_MOUNT.ALONE);
  assert.equal(railChosenAlone(chosen), true);
  // A rail from an old job says nothing at all, and is NOT a choice.
  assert.equal(railChosenAlone({ kind: 'hanger', pos_mm: 900 }), false);
  assert.equal(railChosenAlone(null), false);
  // Both are legacy GEOMETRY, which is the point: same law, two sentences.
  assert.equal(isLegacyRail(chosen), true);
  assert.equal(isLegacyRail({ kind: 'hanger', pos_mm: 900 }), true);
  // The assembly is neither.
  assert.equal(railChosenAlone({ mount: 'shelf', shelf_id: 's1' }), false);
  assert.equal(isLegacyRail({ mount: 'shelf', shelf_id: 's1' }), false);
});

test('F6 — and the modal says the right sentence to each', () => {
  assert.notEqual(RAIL_ALONE_NOTE, LEGACY_RAIL_NOTE);
  assert.match(LEGACY_RAIL_NOTE, /re-add/, 'an OLD rod is offered the shelf');
  assert.doesNotMatch(RAIL_ALONE_NOTE, /re-add/, '…and a deliberate one is not nagged');
  const props = src('components/ElementProperties.jsx');
  assert.match(props, /railChosenAlone\(railItem\)/);
  assert.match(props, /data-rail-alone-note="1"/);
  assert.match(props, /data-legacy-rail-note="1"/);
});

// ═══ THE CHOICE IS IN THE MODAL, WHICH IS WHAT HE ASKED FOR ════════════════

test('F6 — the choice is IN THE RAIL MODAL, with the assembly pre-selected', () => {
  const add = src('components/AddItems.jsx');
  assert.match(add, /const \[railWithShelf, setRailWithShelf\] = useState\(true\)/,
    'the DEFAULT stays the assembly — T37’s verdict, unoverturned');
  assert.match(add, /data-rail-with-shelf="1"/);
  assert.match(add, /data-rail-alone="1"/);
  assert.match(add, /withShelf: railWithShelf/, 'and the button’s answer reaches the store');
  // The copy changes with the choice, because the difference is a board.
  assert.match(add, /Adds the ROD ON ITS OWN/);
  assert.match(add, /Adds a FIX SHELF with the rail hung under it/);
});

test('F6 — LEGACY RAILS ARE UNTOUCHED, as T37 left them', () => {
  // A rod saved before T37 — no `mount`, no `shelf_id`, just a number and a
  // datum — resolves through exactly the code that resolved it yesterday.
  const bare = computeCabinet({
    type: 'WARDROBE', width: 900, height: 2150, depth: 578, unit_num: '01',
    items: [{ id: 'h1', kind: 'hanger', pos_mm: 900 }],
  }, P);
  assert.ok(bare.assemblies.rail);
  assert.ok(bare.panels.some((p) => p.part === 'RAIL-PART'));
  // And the legacy module itself is where it was: this feature added a value
  // to an enum and a predicate beside it, and moved no law.
  const legacy = src('engine/railDatum.js');
  assert.doesNotMatch(legacy, /RAIL_MOUNT|withShelf|alone/, 'railDatum.js knows nothing about F6');
});
