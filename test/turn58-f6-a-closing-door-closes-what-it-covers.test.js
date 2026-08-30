import test from 'node:test';
import assert from 'node:assert/strict';

import { coveredByLeaf, isCoveringLeaf, pullOutsOf } from '../src/engine/covers.js';
import { useUiStore } from '../src/stores/uiStore.js';

// ─── TURN 58 · F6 — A CLOSING DOOR CLOSES WHAT IT COVERS ───────────────────
//
// The owner: *"jak zamykasz szafy drzwi, to szuflady muszą się zamykać
// automatycznie."*  The picture respects physics — a real leaf swinging shut
// would hit a drawer standing out of the carcass.
//
// ONE QUESTION, ASKED ONCE: which pull-outs does this leaf cover? GEOMETRY —
// the leaf's span across the face against each pull-out's own — and nothing
// else. No list of kinds, no map of bay to door, nothing to keep in step when
// a new kind of pull-out arrives.
//
// CLOSING ONLY. Opening a leaf opens NOTHING: a joiner who swings a door to
// look inside has not asked for six drawers to come at him.

const U = () => useUiStore.getState();

const leaf = (id, x, w) => ({
  id, part: 'FRONT', role: 'front', box: { x, y: 0, z: 0, w, h: 2000, d: 18 },
});
const front = (id, x, w) => ({
  id, part: 'DRAWER-FRONT', role: 'front', box: { x, y: 0, z: 0, w, h: 200, d: 18 },
});

// ═══ 1. THE GEOMETRY LAW ════════════════════════════════════════════════════

test('F6 · a leaf covers the pull-outs whose span it stands in front of', () => {
  const L = leaf('FL', 0, 500);
  const outs = [front('D1', 10, 480), front('D2', 520, 480)];
  assert.deepEqual(coveredByLeaf(L, pullOutsOf(outs)), ['D1'],
    'the drawer in its own bay, and not the one in the next');
});

test('F6 · a leaf that spans both bays covers both', () => {
  const L = leaf('F', 0, 1000);
  const outs = [front('D1', 10, 480), front('D2', 520, 470)];
  assert.deepEqual(coveredByLeaf(L, pullOutsOf(outs)), ['D1', 'D2']);
});

test('F6 · a hair of overlap is not cover', () => {
  const L = leaf('FL', 0, 500);
  // Touching at the seam — the drawer next door, not this one's.
  assert.deepEqual(coveredByLeaf(L, pullOutsOf([front('D2', 500, 400)])), []);
});

test('F6 · only a LEAF covers anything', () => {
  assert.equal(isCoveringLeaf(leaf('F', 0, 500)), true);
  assert.equal(isCoveringLeaf(front('D1', 0, 500)), false, 'a drawer front is not a door');
  assert.equal(isCoveringLeaf(null), false);
  assert.deepEqual(coveredByLeaf(front('D1', 0, 500), pullOutsOf([front('D2', 10, 100)])), [],
    'a drawer front closes nothing');
});

test('F6 · a drawer with NO front of its own rides on its box', () => {
  // The "bare boxes" mount: nothing would shut it if only fronts counted.
  const bare = {
    id: 'D1-BF', part: 'DRAWER-BOX-FRONT', role: 'drawer_box', box: { x: 10, y: 0, z: 0, w: 400, h: 150, d: 18 },
  };
  assert.deepEqual(coveredByLeaf(leaf('FL', 0, 500), pullOutsOf([bare])), ['D1-BF']);
});

test('F6 · a leaf never closes itself', () => {
  const L = leaf('FL', 0, 500);
  assert.deepEqual(coveredByLeaf(L, [{ id: 'FL', box: L.box }]), []);
});

// ═══ 2. THE STORE OBEYS IT — ON CLOSING, AND ONLY ON CLOSING ════════════════

test('F6 · closing a leaf shuts the pull-outs behind it', () => {
  U().closeAllFronts();
  // Open the leaf and two drawers, one behind it and one not.
  U().toggleFront('u1', 'FL');
  U().openFrontsFor('u1', ['D1', 'D2']);
  assert.equal(U().openFronts.u1.D1, 1);
  assert.equal(U().openFronts.u1.D2, 1);

  U().toggleFront('u1', 'FL', { fronts: ['D1'], kits: [] });
  assert.equal(U().openFronts.u1.FL, 0, 'the leaf shut');
  assert.equal(U().openFronts.u1.D1, 0, 'and took the drawer behind it with it');
  assert.equal(U().openFronts.u1.D2, 1, 'the one it does not cover is untouched');
});

test('F6 · a lowered pull-down parks with the leaf that covers it', () => {
  U().closeAllFronts();
  U().toggleKit('k1');
  U().toggleKit('k2');
  assert.equal(U().openKits.k1, 1);
  U().toggleFront('u1', 'FL');           // open
  U().toggleFront('u1', 'FL', { fronts: [], kits: ['k1'] });  // and shut
  assert.equal(U().openKits.k1, 0, 'lowered, it is in the leaf\'s way too');
  assert.equal(U().openKits.k2, 1, 'the one it does not cover stays down');
});

test('F6 · OPENING a leaf opens nothing', () => {
  U().closeAllFronts();
  U().toggleFront('u1', 'FL', { fronts: ['D1'], kits: ['k1'] });
  assert.equal(U().openFronts.u1.FL, 1, 'the leaf opened');
  assert.equal(U().openFronts.u1?.D1 ?? 0, 0, 'and the drawer did NOT come at him');
  assert.equal(U().openKits?.k1 ?? 0, 0, 'nor did the rail come down');
});

test('F6 · a caller that says nothing about cover behaves exactly as before', () => {
  U().closeAllFronts();
  U().toggleFront('u1', 'FL');
  assert.equal(U().openFronts.u1.FL, 1);
  U().toggleFront('u1', 'FL');
  assert.equal(U().openFronts.u1.FL, 0, 'the two lines it always was');
});

// ═══ 3. OPEN-ALL SWITCHING OFF IS THE SAME ACT ══════════════════════════════

test('F6 · Open-all going OFF takes the drawers and the rails with it', () => {
  U().closeAllFronts();
  const entries = [{ unitId: 'u1', panelIds: ['FL', 'FR'] }];
  U().toggleAllFronts(entries);                    // on
  assert.equal(U().allFrontsOpen(entries), true);
  U().toggleKit('k1');
  assert.equal(U().openKits.k1, 1);

  U().toggleAllFronts(entries);                    // off
  assert.deepEqual(U().openFronts, {}, 'every door shut, and the drawers ride the same map');
  assert.deepEqual(U().openKits, {}, 'and a lowered rail parks with them');
});
