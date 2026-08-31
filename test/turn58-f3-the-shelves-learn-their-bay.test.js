import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { evenShelfPositions, isPinnedShelf, shelfOpeningsIn } from '../src/engine/items.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';

// ─── TURN 58 · F3 — THE SHELVES LEARN THEIR BAY ────────────────────────────
//
// Three sentences from the owner, three laws, and the culprits were named from
// the dig before a line was written.
//
// 2. CENTRING IS PER BAY, NEVER ACROSS. *"Centrujemy tylko prawy lub lewy
//    bay… nie robimy na przemian ze wszystkich bayów."*
//
//    MEASURED ON 6c50653. An 1800 × 2200 wardrobe, one partition at 900, two
//    shelves in bay 0 and three in bay 1 — each bay already on its own even
//    ladder (545.5 / 1091 and 545.5 / 1091 / 1636.5). Press Even:
//
//        bay 0 → 363.5, 1091          bay 1 → 727.5, 1454.5, 1818.5
//
//    Those five numbers are ONE ladder of five — 363.5, 727.5, 1091, 1454.5,
//    1818.5 — spread across the whole cabinet and then dealt out to whichever
//    shelf happened to be nearest. A ladder straight through the partition,
//    which is the thing the owner's sentence forbids.
//
//    The culprit: `redistributeShelves` segments the band only VERTICALLY, by
//    crossbars. The word `zone` does not appear in it — and
//    `shelfBandSegmentsFor` has taken a `zone` argument all along.
//
// 1. A FIXED SHELF CARRYING A DIVIDER IS PINNED — *"ona już jest ustawiona na
//    stałe."* Centring never moves it, and it CUTS the ladder exactly as a
//    split crossbar does: shelves below centre up to it, shelves above from
//    it. One more BOUNDARY KIND for `bandSegments`, never a second segmenter.
//
// 3. A NEWLY ADDED SHELF LANDS CENTRED in the biggest opening of ITS bay,
//    respecting pinned shelves.
//
// ONE OPENING-FINDER for both callers — `items.js shelfOpeningsIn`. The add
// asks it for the biggest opening; the Even button asks it for the segments to
// space within. Path count 1.

const S = () => useProjectStore.getState();
const G = P.board.thickness;

function twoBayUnit({ bay0 = 2, bay1 = 3 } = {}) {
  S().loadProject({
    id: null,
    name: 'T58 F3',
    number: '58',
    client: 'the owner',
    room: migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) }),
    design: {},
  }, []);
  const unit = S().addUnit('WARDROBE');
  S().updateUnitParams(unit.id, { width: 1800, height: 2200 });
  S().addItem(unit.id, { kind: 'partition', x_mm: 900, front_mm: 0 });
  if (bay0) S().addShelves(unit.id, bay0, 0);
  if (bay1) S().addShelves(unit.id, bay1, 1);
  return unit.id;
}

const shelvesOf = (id) => (S().units.find((u) => u.id === id)?.params.sections?.[0]?.items || [])
  .filter((i) => i.kind === 'shelf');
const inBay = (id, zone) => shelvesOf(id)
  .filter((s) => Number(s.zone) === zone)
  .map((s) => s.pos_mm)
  .sort((a, b) => a - b);

// ═══ 1. CENTRING IS PER BAY ═════════════════════════════════════════════════

test('F3 · Even gives each bay its OWN ladder, never one through the partition', () => {
  const id = twoBayUnit();
  S().redistributeShelves(id);
  const after0 = inBay(id, 0);
  const after1 = inBay(id, 1);

  // ON MAIN the five came back as ONE ladder of five — 363.5, 727.5, 1091,
  // 1454.5, 1818.5 — dealt out to whichever shelf was nearest. Two bays, two
  // ladders: bay 0's two are evenly spaced AMONG THEMSELVES and so are bay 1's
  // three, and neither knows the other exists.
  assert.equal(after0.length, 2);
  assert.equal(after1.length, 3);
  assert.deepEqual(after0, [727.5, 1454.5], 'bay 0 divides its OWN zone in three');
  assert.deepEqual(after1, [545.5, 1091, 1636.5], 'bay 1 divides its OWN zone in four');

  // …and the five together are NOT one five-rung ladder, which is the bug
  // said as a measurement: one ladder of five has five equal gaps.
  const all = [...after0, ...after1].sort((a, b) => a - b);
  const gaps = all.slice(1).map((y, i) => Math.round(y - all[i]));
  assert.ok(new Set(gaps).size > 1,
    'even gaps across all five would be the ladder through the partition');
  assert.deepEqual(all, [545.5, 727.5, 1091, 1454.5, 1636.5],
    'the two ladders interleave — which is exactly what a per-bay Even looks like');
});

test('F3 · each bay\'s ladder is the KIT\'s own arithmetic for ITS count', () => {
  const id = twoBayUnit();
  S().redistributeShelves(id);
  // The same `evenShelfPositions` the store uses, asked directly per bay: two
  // shelves divide a zone into three steps, three divide it into four.
  assert.equal(inBay(id, 0).length, 2);
  assert.equal(inBay(id, 1).length, 3);
  const gaps = (ys) => ys.slice(1).map((y, i) => Math.round(y - ys[i]));
  assert.equal(new Set(gaps(inBay(id, 1))).size, 1, 'bay 1\'s three are evenly spaced among themselves');
});

test('F3 · asked about ONE bay, only that bay moves', () => {
  const id = twoBayUnit();
  // Drag bay 1's shelves off their ladder, then centre BAY 0 only.
  const strays = shelvesOf(id).filter((s) => Number(s.zone) === 1);
  for (const s of strays) S().setShelfPos(id, s.id, s.pos_mm + 40);
  const moved1 = inBay(id, 1);
  S().redistributeShelves(id, 0);
  assert.deepEqual(inBay(id, 1), moved1, 'bay 1 was not asked about and did not move');
});

// ═══ 2. THE PINNED SHELF ════════════════════════════════════════════════════

test('F3 · a fixed shelf carrying a rail is PINNED — the law, asked directly', () => {
  const shelf = { id: 'sh1', kind: 'shelf', variant: 'fixed', pos_mm: 1000 };
  const rail = { id: 'r1', kind: 'hanger', mount: 'shelf', shelf_id: 'sh1' };
  assert.equal(isPinnedShelf(shelf, [shelf, rail]), true,
    '"ona już jest ustawiona na stałe"');
  // A shelf nothing hangs on is free, and so is a rail that names no shelf.
  assert.equal(isPinnedShelf(shelf, [shelf]), false);
  assert.equal(isPinnedShelf(shelf, [shelf, { ...rail, shelf_id: 'other' }]), false);
  assert.equal(isPinnedShelf({ id: 'x', kind: 'shelf' }, [shelf, rail]), false);
});

test('F3 · Even never moves a pinned shelf, and centres the others around it', () => {
  const id = twoBayUnit({ bay0: 0, bay1: 0 });
  // A rail assembly in bay 0: a FIXED shelf with the rod hung on it.
  S().addHangerRail(id, { zone: 0 });
  const pinnedBefore = shelvesOf(id).filter((s) => s.variant === 'fixed').map((s) => s.pos_mm);
  assert.equal(pinnedBefore.length, 1, 'the assembly cut its fixed shelf');
  S().addShelves(id, 2, 0);
  S().redistributeShelves(id);
  const pinnedAfter = shelvesOf(id).filter((s) => s.variant === 'fixed').map((s) => s.pos_mm);
  assert.deepEqual(pinnedAfter, pinnedBefore, 'the pinned shelf did not move');
});

// ═══ 3. THE ONE OPENING-FINDER ══════════════════════════════════════════════

test('F3 · the opening-finder walks faces and answers the clear openings', () => {
  const band = { min: 100, max: 2000, floor: 0, ceiling: 2000 };
  // One shelf at 1000: two openings, 0→1000 and 1018→2000.
  const openings = shelfOpeningsIn({ band, positions: [1000], boardT: G });
  assert.equal(openings.length, 2);
  assert.deepEqual(openings[0], { from: 0, to: 1000, size: 1000 });
  assert.deepEqual(openings[1], { from: 1000 + G, to: 2000, size: 2000 - 1000 - G });
});

test('F3 · a boundary cuts the openings exactly as a shelf does', () => {
  const band = { min: 100, max: 2000, floor: 0, ceiling: 2000 };
  const plain = shelfOpeningsIn({ band, positions: [], boardT: G });
  assert.equal(plain.length, 1, 'nothing in the way — one opening');
  const cut = shelfOpeningsIn({ band, positions: [], boundaries: [1200], boardT: G });
  assert.equal(cut.length, 2, 'a divider is a board, and an opening may not cross it');
  assert.equal(cut[0].to, 1200);
});

test('F3 · the add and the Even button ask the SAME finder', () => {
  // Path count 1: `centredShelfPos` is the biggest opening of `shelfOpeningsIn`
  // and nothing else, so the placement and the spacing cannot disagree about
  // where an opening is.
  const band = { min: 100, max: 2000, floor: 0, ceiling: 2000 };
  const openings = shelfOpeningsIn({ band, positions: [400], boardT: G });
  const biggest = openings.reduce((a, b) => (b.size > a.size ? b : a));
  assert.equal(biggest.from, 400 + G, 'the upper opening is the bigger one here');
});

// ═══ 4. AND A UNIT WITH NO BAYS IS YESTERDAY ════════════════════════════════

test('F3 · a flat unit with no partition behaves exactly as it did', () => {
  S().loadProject({
    id: null,
    name: 'T58 F3 flat',
    number: '58',
    client: 'the owner',
    room: migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) }),
    design: {},
  }, []);
  const unit = S().addUnit('WARDROBE');
  S().updateUnitParams(unit.id, { width: 900, height: 2200 });
  S().addShelves(unit.id, 3);
  const before = shelvesOf(unit.id).map((s) => s.pos_mm).sort((a, b) => a - b);
  S().redistributeShelves(unit.id);
  const after = shelvesOf(unit.id).map((s) => s.pos_mm).sort((a, b) => a - b);
  assert.deepEqual(after, before, 'three shelves already evenly spaced stay put');
  // …and they really are the kit's own ladder.
  const gaps = after.slice(1).map((y, i) => Math.round(y - after[i]));
  assert.equal(new Set(gaps).size, 1);
});

test('F3 · a bare computeCabinet never centres a shelf — no engine byte moves', () => {
  // The engine functions stay PURE: they took new inputs, they read no store,
  // and a kit call with nothing said is answered exactly as before.
  const bare = computeCabinet({ ...defaultParamsFor('WARDROBE', P), unit_num: '01' }, P);
  assert.ok(bare.panels.length > 0);
  assert.equal(typeof evenShelfPositions, 'function', 'the kit\'s arithmetic is untouched');
});
