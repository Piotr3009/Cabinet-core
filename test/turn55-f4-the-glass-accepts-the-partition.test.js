import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import {
  WATCH_LAYERS, isShelfBoard, shelfGlassPlan, watchDrawerFixedHeight,
} from '../src/engine/watchDrawer.js';

// ─── T55 · F4 — THE GLASS ACCEPTS THE FORCED SHELF (PARTITION) ──────────────
//
// The owner: *"z automatycznym dodaniem leda dookoła szyby … na półce która
// jest wymuszona nad szufladami."*
//
// Everything about the pane already exists (T53 F8b/F8c). It refused only
// because two askers asked `part === 'SHELF'` and the auto board over a
// drawer bank is `part: 'PARTITION'` (role `shelf`). ONE predicate now —
// `isShelfBoard` (engine/watchDrawer.js) — consumed by BOTH askers: the
// engine's `shelfAbove` filter (cabinet.js) and the store's `watchShelfAbove`
// (projectStore.js). One law, one definition, two callers.

const H = watchDrawerFixedHeight(P);
const store = () => useProjectStore.getState();

/** A wardrobe stack whose watch drawer sits directly under the forced PARTITION. */
const job = () => computeCabinet({
  ...defaultParamsFor('WARDROBE', P),
  unit_num: 'W01',
  width: 900,
  sections: [{
    width_mm: 900,
    items: [
      { id: 'd1', kind: 'drawer', index: 1, height_mm: 200 },
      {
        id: 'd2', kind: 'drawer', index: 2, height_mm: H, watch_insert: true, watch_shelf_glass: true,
      },
    ],
  }],
}, P);

test('F4 — the pane is cut in the PARTITION, the LED ring is born, and no refusal stands', () => {
  const r = job();
  const pane = (r.assemblies.watchGlass || [])[0];
  assert.ok(pane, 'the pane exists');
  const board = r.panels.find((p) => p.id === pane.shelfId);
  assert.equal(board.part, 'PARTITION', 'cut in the forced board over the bank');
  assert.equal(board.role, 'shelf', '…which is a fixed shelf in everything but name');
  const opening = (board.cnc.pockets || []).find((k) => k.layer === WATCH_LAYERS.opening);
  const rebate = (board.cnc.pockets || []).find((k) => k.layer === WATCH_LAYERS.rebate);
  assert.ok(opening && rebate, 'the opening and its rebate are cut in the partition');
  assert.equal((r.hardware || []).filter((h) => h.role === 'drawer_glass').length, 1, 'the pane is ordered');
  // T58b (F2, licensed): the RING's BOM line is replaced by the strip the
  // glass births at the back of this very board — one length, one law.
  assert.equal((r.hardware || []).filter((h) => h.role === 'led_strip').length, 0);
  assert.ok(pane.strip && pane.strip.kind === 'shelf', 'the LED strip is born');
  assert.equal((r.warnings || []).find((w) => w.code === 'watch_glass_needs_shelf'), undefined,
    'warning ABSENT — the partition IS the shelf here');
});

test('F4 — the T53 pane law holds on the partition to the millimetre: 50 in, LED 15 out, flush', () => {
  const r = job();
  const pane = (r.assemblies.watchGlass || [])[0];
  const board = r.panels.find((p) => p.id === pane.shelfId);
  const opening = (board.cnc.pockets || []).find((k) => k.layer === WATCH_LAYERS.opening);
  const off = P.watchDrawer.openingOffsetMm;
  assert.equal(opening.x1, off);
  assert.equal(opening.y1, off);
  assert.equal(board.box.w - opening.x2, off);
  assert.equal(board.box.d - opening.y2, off);
  const plan = shelfGlassPlan({ w: board.box.w, d: board.box.d }, P);
  assert.equal(plan.opening.x1 - plan.led.x1, P.watchDrawer.ledOffsetMm, 'LED rings 15 outside');
  assert.equal(pane.flush, true, 'flush with the board top');
  assert.equal(pane.led.y, board.box.y, 'the ring is on the board\'s own underside');
});

test('F4 — the STORE asks the same predicate: the checkbox is enabled by the partition', () => {
  store().loadProject({
    id: null,
    name: 'T55 F4',
    number: '55',
    client: 'the owner',
    room: migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) }),
    design: {},
  }, []);
  const unit = store().addUnit('WARDROBE');
  store().addDrawers(unit.id, 2, 'overlay', 200, null, null);
  const made = store().addWatchDrawer(unit.id);
  assert.equal(made.ok, true, made.error || '');
  const above = store().watchShelfAbove(unit.id, made.index);
  assert.ok(above, 'the surface finds a board above — the control is enabled, not greyed');
  assert.equal(above.part, 'PARTITION', '…and it is the forced partition');
});

test('F4 — ONE path: the predicate is defined once and asked by both callers', async () => {
  const { readFileSync } = await import('node:fs');
  const engine = readFileSync(new URL('../src/engine/cabinet.js', import.meta.url), 'utf8');
  const storeSrc = readFileSync(new URL('../src/stores/projectStore.js', import.meta.url), 'utf8');
  const watch = readFileSync(new URL('../src/engine/watchDrawer.js', import.meta.url), 'utf8');
  assert.equal([...watch.matchAll(/export function isShelfBoard/g)].length, 1, 'one definition');
  assert.match(engine, /isShelfBoard\(q\)/, 'the engine filter asks it');
  assert.match(storeSrc, /isShelfBoard\(p\)/, 'the store asks it');
  // Neither caller keeps a private `part === 'SHELF'` twin on the glass road.
  const glassBlock = engine.slice(engine.indexOf('wantsGlass'), engine.indexOf('watchGlassPanes.push'));
  assert.doesNotMatch(glassBlock, /part === 'SHELF'/, 'no second predicate in the engine');
});

// ─── THE FLAT TWIN — a plain SHELF behaves byte-identically ─────────────────

test('F4 — the flat twin: a plain SHELF answers the predicate exactly as before, a VPART never does', () => {
  // The predicate WIDENS the old `part === 'SHELF'` — it never narrows it —
  // so every board a T53 job put the pane in still takes it, byte for byte:
  // same single code path, same plan, same offsets (asserted above).
  assert.equal(isShelfBoard({ part: 'SHELF', role: 'shelf' }), true, 'a shelf is a shelf');
  assert.equal(isShelfBoard({ part: 'SHELF' }), true, 'whatever its role says');
  assert.equal(isShelfBoard({ part: 'PARTITION', role: 'shelf' }), true, 'the forced board serves');
  assert.equal(isShelfBoard({ part: 'VPART', role: 'shelf' }), false, 'a vertical divider never');
  assert.equal(isShelfBoard({ part: 'PARTITION', role: 'divider' }), false, 'nor a partition that is not a shelf');
  assert.equal(isShelfBoard(null), false);
  // …and a stack that asks for NO glass is untouched: no pane, no pocket in
  // the partition, no warning — the byte-identity the goldens hold globally.
  const quiet = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: 'W01',
    width: 900,
    sections: [{
      width_mm: 900,
      items: [
        { id: 'd1', kind: 'drawer', index: 1, height_mm: 200 },
        { id: 'd2', kind: 'drawer', index: 2, height_mm: H, watch_insert: true },
      ],
    }],
  }, P);
  assert.equal((quiet.assemblies.watchGlass || []).length, 0);
  const part = quiet.panels.find((p) => p.part === 'PARTITION');
  assert.equal((part.cnc.pockets || []).length, 0, 'no opening, no rebate — untouched');
});
