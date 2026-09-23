// ─── TURN 73 · F6 · THE FELT IS SEEN ON THE DRAWER BOTTOM ──────────────────
//
// The owner, 23.09.2026, testing T72 points 9 and 10:
//
//   *"nie dodaje koloru felt, czyli spodu szuflady; spód szuflady, only dodaj
//   kolory."*
//
// Found: the felt reached the BOM (T72) and nothing in `src/3d/` drew it. The
// engine now stamps the chosen felt on the tray's BASE, and the scene wears it.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { rectCorners } from '../src/engine/room.js';
import { WATCH_FELT_COLOURS } from '../src/engine/watchDrawer.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();

function aTray() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const { id } = S().addUnit('WARDROBE', { params: { width: 1200, height: 2200, depth: 600 } });
  S().addDrawers(id, 3);
  const made = S().addWatchDrawer(id);
  assert.equal(made.ok, true, made.error);
  const item = S().units.find((u) => u.id === id).params.sections[0].items
    .find((i) => i.watch_insert === true);
  assert.ok(item, 'no accessories drawer');
  return { id, itemId: item.id };
}
const base = (id) => S().unitResult(id).panels.find((p) => p.part === 'WATCH-BASE');

test('T73 F6 · no felt chosen: the base carries no felt', () => {
  const { id } = aTray();
  assert.ok(base(id), 'the tray has no base');
  assert.equal(base(id).meta.watch_felt, undefined);
});

test('T73 F6 · Felt base: the base carries the felt, and each of the four colours reaches it', () => {
  const { id, itemId } = aTray();
  S().setWatchFinish(id, itemId, 'felt');
  assert.equal(base(id).meta.watch_felt, 'dark-green', 'the default felt did not reach the base');
  for (const c of WATCH_FELT_COLOURS) {
    S().setWatchFelt(id, itemId, c.id);
    assert.equal(base(id).meta.watch_felt, c.id);
  }
});

test('T73 F6 · only the base: no other tray piece carries the felt', () => {
  const { id, itemId } = aTray();
  S().setWatchFinish(id, itemId, 'felt');
  const others = S().unitResult(id).panels
    .filter((p) => p.role === 'watch_insert' && p.part !== 'WATCH-BASE' && p.meta?.watch_felt);
  assert.equal(others.length, 0);
});

test('T73 F6 · sprayed after felt: the base carries no felt', () => {
  const { id, itemId } = aTray();
  S().setWatchFinish(id, itemId, 'felt');
  S().setWatchFelt(id, itemId, 'red');
  S().setWatchFinish(id, itemId, 'spray');
  assert.equal(base(id).meta.watch_felt, undefined);
});

test('T73 F6 · the scene wears it: matte, the chosen hex, no board figure, on WATCH-BASE only', () => {
  const src = read('src/3d/UnitView.jsx');
  assert.match(src, /p\.part === 'WATCH-BASE' && p\.meta\?\.watch_felt/);
  assert.match(src, /WATCH_FELT_COLOURS\.find\(\(c\) => c\.id === p\.meta\.watch_felt\)\?\.hex/);
  assert.match(src, /function feltSurface\(surface, hex\)/);
  assert.match(src, /texture: null,\n    fallback: null,\n    roughness: 1,/);
});
