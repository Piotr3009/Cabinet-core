// ─── TURN 74 · F2 · FELT: WINE RED, NOT A LOUD RED ─────────────────────────
//
// The owner, 23.09.2026, retesting T73 F6:
//
//   *"red raczej zrób kolor wine red, nie krzykliwa czerwień."*
//
// The entry keeps its id `red` (saved jobs open unchanged), its label becomes
// `Wine red`, its hex a wine. The BOM line reads "Wine red felt base", and
// both windows read the list, so the chip follows without an edit of its own.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { rectCorners } from '../src/engine/room.js';
import { WATCH_FELT_COLOURS, watchFeltEntry, watchFeltOf } from '../src/engine/watchDrawer.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();

/** Red, green and blue of a `#rrggbb`, 0..255. */
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

test('T74 F2 · the id stays `red`, the label is the wine the owner named', () => {
  const red = WATCH_FELT_COLOURS.find((c) => c.id === 'red');
  assert.ok(red, 'the `red` id is gone: every saved job with a red felt would lose it');
  assert.equal(red.label, 'Wine red');
  assert.deepEqual(WATCH_FELT_COLOURS.map((c) => c.id), ['dark-green', 'red', 'brown', 'black'],
    'the closed list of four moved');
  // A saved job that says `red` still resolves to the same entry.
  assert.equal(watchFeltOf({ watch_finish: 'felt', watch_felt: 'red' }), 'red');
  assert.equal(watchFeltEntry({ watch_finish: 'felt', watch_felt: 'red' }).label, 'Wine red');
});

test('T74 F2 · the hex is a wine: dark, blue-leaning, never the loud red', () => {
  const red = WATCH_FELT_COLOURS.find((c) => c.id === 'red');
  assert.match(red.hex, /^#[0-9a-f]{6}$/i);
  const [r, g, b] = rgb(red.hex);
  // A wine is a dark red with blue in it: red leads, but not at full shout,
  // and blue stands above green (a loud red is `#ff0000`, a brick is g > b).
  assert.ok(r <= 130, `red channel ${r} is loud`);
  assert.ok(r > g && r > b, 'it is not a red at all');
  assert.ok(b >= g, 'no blue in it: a brick, not a wine');
  assert.notEqual(red.hex.toLowerCase(), '#7d1f22', 'the loud red of T72 is still here');
});

test('T74 F2 · the BOM line reads "Wine red felt base"', () => {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const { id } = S().addUnit('WARDROBE', { params: { width: 1200, height: 2200, depth: 600 } });
  S().addDrawers(id, 3);
  assert.equal(S().addWatchDrawer(id).ok, true);
  const tray = S().units.find((u) => u.id === id).params.sections[0].items
    .find((i) => i.watch_insert === true);
  S().setWatchFinish(id, tray.id, 'felt');
  assert.equal(S().setWatchFelt(id, tray.id, 'red'), 'red');
  const line = (S().unitResult(id)?.hardware || []).find((h) => h.role === 'watch_insert');
  assert.ok(line, 'the insert has no BOM line');
  assert.equal(line.spec.felt, 'red', 'the saved id changed');
  assert.match(line.spec_label, /Wine red felt base/);
  // …and the tray's base wears the wine in the scene (T73 F6's own road).
  const base = S().unitResult(id).panels.find((p) => p.part === 'WATCH-BASE');
  assert.equal(base.meta.watch_felt, 'red');
});

test('T74 F2 · both windows read the list: the chip follows with no edit of its own', () => {
  for (const rel of ['src/components/WatchLayoutModal.jsx', 'src/retail/design/detail/WatchLayoutModal.jsx']) {
    const w = read(rel);
    assert.match(w, /\{WATCH_FELT_COLOURS\.map\(\(c\) => \(/, `${rel} does not read the list`);
    assert.match(w, /\{c\.label\}/, `${rel} does not print the label`);
    assert.ok(!/Wine red/.test(w), `${rel} spells the colour itself instead of reading the list`);
  }
});
