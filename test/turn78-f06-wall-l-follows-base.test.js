// ─── T78 · F6 · THE WALL L FOLLOWS THE BASE L, AND SPLITS ABOVE 700 ─────────
//
// The owner, 11.10.2026: *"automatycznie wyrownanie szafki wiszacej naroznej
// do szerokosci dolnej, chyba ze bardzo duza to wtedy propozycja nastepnej
// szafki jesli drzwiczki beda wieksze niz 700 w szafce wiszacej."*
//
// A CORNER_L_WALL in a corner that holds a CORNER_L_BASE takes the base's two
// arm lengths (its own arm depth stays the wall depth). When either arm's leaf
// would exceed profile.corner.wallLeafMaxMm (700, the owner's) the wall L
// stops at the arm that keeps the leaf at 700 and a plain wall unit for the
// remainder is PROPOSED with one click. Changing the base arms re-runs the law;
// a wall L the client sized by hand is left alone.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { lArmKinds, lLeafTrimMm } from '../src/engine/corners.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';

const S = () => useProjectStore.getState();
const UI = () => useUiStore.getState();
const U = (id) => S().units.find((u) => u.id === id);
const ARM = P.wallUnit.defaults.depth;
const KINDS = lArmKinds(P);
const trimOf = (arm, frontT) => lLeafTrimMm(KINDS[arm], P, frontT);

function room() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  UI().clearMessages?.();
}
const said = () => (UI().messages || []).map((m) => m.message);

test('F6 · the number is the owner\'s: profile.corner.wallLeafMaxMm 700', () => {
  assert.equal(P.corner.wallLeafMaxMm, 700);
});

test('F6 · a wall L placed in the base L\'s corner takes the base\'s arms; its own arm depth stays the wall depth', () => {
  room();
  const base = S().addUnit('CORNER_L_BASE').id;
  S().updateUnitParams(base, { width: 1000, depth: 950 });
  const wall = S().addUnit('CORNER_L_WALL', { near: base }).id;
  const w = U(wall);
  assert.equal(w.position.wall, 0);
  assert.equal(w.params.corner_side, 'left');
  assert.deepEqual([w.params.width, w.params.depth], [1000, 950], 'born matched to the base L');
  assert.equal(w.params.corner_arms_auto.from, base);
  const r = computeCabinet(w.params, P);
  assert.equal(r.derived.corner_l.arm, ARM, 'the arm depth is the wall unit\'s own');
  assert.deepEqual([r.derived.corner_l.width, r.derived.corner_l.depth], [1000, 950]);
});

test('F6 · the base arms change later: the wall L follows on the same pass', () => {
  room();
  const base = S().addUnit('CORNER_L_BASE').id;
  const wall = S().addUnit('CORNER_L_WALL', { near: base }).id;
  assert.deepEqual([U(wall).params.width, U(wall).params.depth], [900, 900]);
  S().updateUnitParams(base, { depth: 1050 });
  assert.deepEqual([U(wall).params.width, U(wall).params.depth], [900, 1050]);
});

test('F6 · above 700: the wall L stops where the leaf is 700 and a wall unit for the remainder is PROPOSED with one click; the click adds it flush', () => {
  room();
  const base = S().addUnit('CORNER_L_BASE').id;
  S().updateUnitParams(base, { width: 1600 });
  const wall = S().addUnit('CORNER_L_WALL', { near: base }).id;
  const kept = Math.floor(ARM + 700 + trimOf('A', U(wall).params.front_t));
  assert.equal(U(wall).params.width, kept, 'arm A held so the leaf is at most 700 (whole millimetres)');
  assert.equal(U(wall).params.depth, 900, 'arm B follows the base');
  assert.deepEqual(U(wall).params.corner_arms_auto.split, ['A']);
  const leafA = computeCabinet({ ...U(wall).params, doors: true }, P).panels.find((p) => /-A-F$/.test(p.id));
  assert.ok(leafA && leafA.w <= 700 && leafA.w > 699, `leaf ${leafA?.w}: the owner's 700, whole millimetres`);
  const remainder = 1600 - kept;
  const msg = (UI().messages || []).find((m) => /proposed beside it/.test(m.message));
  assert.ok(msg, `the proposal is said: ${JSON.stringify(said())}`);
  assert.match(msg.message, /mm wall unit is proposed beside it/);
  assert.equal(msg.level, 'yellow', 'a proposal that waits for the person: the house gives a button to no grey (engine/messages.js)');
  assert.ok(msg.action && /^Add .* mm wall unit$/.test(msg.action.label), JSON.stringify(msg.action?.label));
  // One click adds it.
  const before = S().units.length;
  msg.action.run();
  assert.equal(S().units.length, before + 1);
  const added = S().units[S().units.length - 1];
  assert.equal(added.type, 'WUD');
  assert.equal(added.params.width, remainder);
  assert.equal(added.position.wall, 0);
  assert.equal(added.position.x_mm, U(wall).position.x_mm + kept, 'flush with the wall L\'s arm A end');
  // Said once: another pass does not repeat it, and with the slot taken it is not re-proposed.
  const count = said().filter((m) => /proposed beside it/.test(m)).length;
  S().refreshAutoParts();
  assert.equal(said().filter((m) => /proposed beside it/.test(m)).length, count);
});

test('F6 · arm B too: on the adjacent wall the remainder goes through the F1 road', () => {
  room();
  const base = S().addUnit('CORNER_L_BASE').id;
  S().updateUnitParams(base, { depth: 1500 });
  const wall = S().addUnit('CORNER_L_WALL', { near: base }).id;
  const kept = Math.floor(ARM + 700 + trimOf('B', U(wall).params.front_t));
  assert.equal(U(wall).params.depth, kept);
  const leafB = computeCabinet({ ...U(wall).params, doors: true }, P).panels.find((p) => /-B-F$/.test(p.id));
  assert.ok(leafB && leafB.w <= 700 && leafB.w > 699, `leaf B ${leafB?.w}: 700 by the overlap arm's own trim`);
  const msg = (UI().messages || []).find((m) => /arm B of the base L/.test(m.message));
  assert.ok(msg, JSON.stringify(said()));
  msg.action.run();
  const added = S().units[S().units.length - 1];
  assert.equal(added.type, 'WUD');
  assert.equal(added.position.wall, 3, 'on the adjacent wall');
  assert.equal(added.position.x_mm + added.params.width, 3000 - P.room.wallBackClearance - kept, 'flush with the arm B end');
});

test('F6 · a wall L the client sized by hand is left alone; without a base L nothing is written', () => {
  room();
  const base = S().addUnit('CORNER_L_BASE').id;
  const wall = S().addUnit('CORNER_L_WALL', { near: base }).id;
  S().updateUnitParams(wall, { width: 800 });
  assert.equal(U(wall).params.corner_arms_own, true);
  S().updateUnitParams(base, { width: 1200 });
  assert.equal(U(wall).params.width, 800, 'his number stays');
  S().removeUnit(base);
  S().refreshAutoParts();
  assert.equal(U(wall).params.corner_arms_auto, undefined);
  // A lone wall L is sized by nobody.
  room();
  const lone = S().addUnit('CORNER_L_WALL').id;
  assert.deepEqual([U(lone).params.width, U(lone).params.depth], [600, 600]);
  assert.equal(U(lone).params.corner_arms_auto, undefined);
});
