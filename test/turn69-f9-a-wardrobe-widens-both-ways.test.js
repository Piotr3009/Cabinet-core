// ─── TURN 69 · F9 — A WARDROBE WIDENS BOTH WAYS ────────────────────────────
//
// CLAUDE.md, F9, verbatim:
//
//   *"Owner: beside an existing neighbour it grows only right — wrong, "i tu i
//   w PRO". The widening law lives in the STORE (shared core — no new PRO
//   exemption): a width increase takes free space on EITHER side, splitting as
//   the room allows; refusal only when both sides are blocked, with the
//   sentence. Prove in both apps."*
//
// "Prove in both apps" is proved HERE and not twice: both doors write through
// `projectStore.updateUnitParams` — PRO's `UnitSizeModal.jsx` calls it
// directly, retail's `adapter.setUnitSize` calls it through `S()` — and this
// file asserts that too, because a law proved in one app and reached by two
// paths is only one law if both paths are the same call.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import * as A from '../src/retail/design/adapter.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const S = () => useProjectStore.getState();

/** A wardrobe of `w` standing at `x` on wall 1 of a 4 m room. */
function stand(w, x) {
  const { id } = S().addUnit('WARDROBE', { params: { width: w, height: 2200, depth: 600 } });
  S().updateUnitParams(id, { width: w });
  S().moveUnit(id, x, 1);
  return id;
}

function room(build) {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  return build();
}

const at = (id) => Math.round(S().units.find((u) => u.id === id).position.x_mm);
const wide = (id) => Math.round(S().units.find((u) => u.id === id).params.width);

// ═══ 1 · THE SYMPTOM, GONE ══════════════════════════════════════════════════

test('F9 · with a neighbour on the RIGHT, it grows LEFT', () => {
  const id = room(() => { const t = stand(1000, 1500); stand(1000, 2600); return t; });
  const before = at(id);
  const res = S().updateUnitParams(id, { width: 1800 });
  assert.equal(wide(id), 1800, 'the wall had the room and the wardrobe did not take it');
  // BEFORE TONIGHT this was the whole bug: the near edge never moved, so the
  // only width on offer was whatever the far edge alone could reach.
  assert.ok(at(id) < before, 'the near edge did not move — it grew only right');
  // What it took from the left is exactly what the right could not give.
  const gaveRight = 2600 - (before + 1000);
  assert.equal(at(id), before - (800 - gaveRight),
    'the split is not "the far edge first, the near edge for the rest"');
  assert.deepEqual(res.notices, [], 'a width that fitted was announced as a limit');
});

test('F9 · on a free wall it still grows RIGHT, exactly as it always did', () => {
  const id = room(() => stand(1000, 1500));
  const before = at(id);
  S().updateUnitParams(id, { width: 1800 });
  assert.equal(wide(id), 1800);
  assert.equal(at(id), before, 'the near edge moved when it had no reason to');
});

test('F9 · the space is SPLIT when neither side alone is enough', () => {
  // 800 at 200, the target at 1100, 800 at 2200: a little on each side.
  const id = room(() => { stand(800, 200); const t = stand(1000, 1100); stand(800, 2200); return t; });
  const beforeX = at(id);
  const beforeW = wide(id);
  const res = S().updateUnitParams(id, { width: 1800 });
  assert.ok(wide(id) > beforeW, 'it took nothing at all');
  assert.ok(at(id) < beforeX, 'it took nothing from the left');
  assert.ok(wide(id) < 1800, 'this scene is meant to be short of the ask');
  // The sentence names BOTH sides — the other one is not left to be discovered.
  assert.match(res.notices[0], /on the right/);
  assert.match(res.notices[0], /on the left/);
});

test('F9 · refusal ONLY when both sides are blocked, and it says what is on each', () => {
  const id = room(() => { stand(800, 200); const t = stand(1000, 1100); stand(800, 2200); return t; });
  S().updateUnitParams(id, { width: 1800 });     // takes everything both sides have
  const grown = wide(id);
  const heldAt = at(id);

  const res = S().updateUnitParams(id, { width: 1800 });   // asked again
  assert.equal(wide(id), grown, 'it grew past two neighbours');
  assert.equal(at(id), heldAt, 'it moved with nowhere to go');
  assert.match(res.notices[0], /cannot grow either way/);
  assert.match(res.notices[0], /is on the right and/);
  assert.match(res.notices[0], /is on the left/);
});

test('F9 · shrinking is untouched — the near edge stays put', () => {
  const id = room(() => stand(1600, 1200));
  const before = at(id);
  S().updateUnitParams(id, { width: 900 });
  assert.equal(wide(id), 900);
  assert.equal(at(id), before, 'a narrower cabinet drifted');
});

test('F9 · a widening never walks over its neighbour', () => {
  const id = room(() => { const left = stand(900, 100); const t = stand(900, 1500); void left; return t; });
  S().updateUnitParams(id, { width: 3000 });
  const [a, b] = S().units.map((u) => ({ l: u.position.x_mm, r: u.position.x_mm + u.params.width }));
  assert.ok(a.r <= b.l + 1e-6 || b.r <= a.l + 1e-6, 'two wardrobes are inside each other');
});

// ═══ 2 · ONE LAW, AND BOTH APPS REACH IT BY THE SAME CALL ═══════════════════

test('F9 · retail reaches the same law, through the same store call', () => {
  const id = room(() => { const t = stand(1000, 1500); stand(1000, 2600); return t; });
  const before = at(id);
  const said = A.setUnitSize(id, { width: 1800 });
  assert.equal(said.ok, true);
  assert.equal(wide(id), 1800, 'retail did not get the law');
  assert.ok(at(id) < before, 'retail did not get the law — it still grew only right');
});

test('F9 · there is ONE widening law, in the store, and no PRO exemption bought it', () => {
  const store = read('src/stores/projectStore.js');
  assert.match(store, /TURN 69 \(CLAUDE\.md F9\): A WARDROBE WIDENS BOTH WAYS/,
    'the law is not in the shared store');
  assert.equal((store.match(/nearEdgeTo = at - takeLeft;/g) || []).length, 1,
    'the near edge is moved in more than one place — that is two laws');

  // PRO's own door is byte-for-byte what it was: it never needed to change,
  // because it already writes through the store.
  assert.match(read('src/components/UnitSizeModal.jsx'), /updateUnitParams\(unit\.id, \{ \[key\]: value \}\)/,
    'PRO stopped writing widths through the store');
  // …and retail's door is the same call, one layer out.
  assert.match(read('src/retail/design/adapter.js'), /S\(\)\.updateUnitParams\(unitId, patch\)/,
    'retail stopped writing widths through the store');

  // The exemption map did NOT grow for F9.
  const freeze = read('test/turn59-f1-the-switch.test.js');
  const names = [...freeze.matchAll(/^  'src\/[^']+':\n?/gm)];
  void names;
  assert.equal((freeze.match(/'src\/components\/[A-Za-z]+\.jsx':\n\s+'T\d\d F/g) || []).length, 3,
    'a fourth file entered EXEMPT');
});
