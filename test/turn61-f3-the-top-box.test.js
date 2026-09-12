// ─── TURN 61 · F3 — ADD TOP BOX ────────────────────────────────────────────
//
// The owner asked where a top box gets added; his answer: *"4 add top"* — a
// button on the selected wardrobe.
//
// ─── NOTHING NEW IN THE ENGINE, AND THAT IS THE POINT ──────────────────────
//
// `engine/topBox.js` has held the whole relationship since T36: `WARDROBE_TOP`,
// `params.rides_on`, `settleRiders`, several riders per host since T53, orphan
// check #14, and the room's refusal since T50. So every assertion below is
// about a BUTTON reaching the store's own add — `addUnit('WARDROBE_TOP',
// { near: host })`, the call PRO's library tile makes with the host named —
// and about the refusal arriving in the shared core's own words.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import * as A from '../src/retail/design/adapter.js';
import { REASONS } from '../src/retail/design/reasons.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const S = () => useProjectStore.getState();

const fresh = () => {
  A.startDesign('Bedroom wardrobe');
  A.addFirstWardrobe();
  A.setSpace({ wallMm: 3000, ceilingMm: 2600 });
  return A.designUnit(S().units).id;
};

test('F3 · the button adds a rider through the store\'s own add', () => {
  const host = fresh();
  assert.equal(A.topBoxRefusal(host), '', 'a 2600 room refuses a top box');

  const added = A.addTopBox(host);
  assert.equal(added.ok, true, added.said);

  const box = S().units.find((u) => u.id === added.id);
  assert.equal(box.type, 'WARDROBE_TOP');
  assert.equal(box.params.rides_on, host, 'the rider is not linked to its host');
  assert.equal(A.isTopBox(box), true);
  assert.equal(A.isTopBox(S().units.find((u) => u.id === host)), false);

  // BORN MATCHED and BORN FITTED — both `addUnit`'s own, neither retail's.
  const hostUnit = S().units.find((u) => u.id === host);
  assert.equal(Math.round(box.params.width), Math.round(hostUnit.params.width),
    'the box did not take its host\'s width');
  assert.equal(box.position.wall, hostUnit.position.wall);
  assert.ok(box.params.height >= P.wardrobe.topBox.minHeight,
    'the box was born under its own minimum');
  // …and it stands ON the host: room height minus the wardrobe's own top.
  assert.ok(box.params.mount_height >= hostUnit.params.height - 1,
    'the box is not standing on its host');

  // The link is read back the way the store writes it, not by a retail guess.
  assert.deepEqual(A.topBoxesOn(host).map((u) => u.id), [added.id]);
});

test('F3 · a low ceiling REFUSES, in the engine\'s own sentence, before the press', () => {
  const host = fresh();
  // A wardrobe of 2150 under a 2200 ceiling leaves 50 mm — under the top box's
  // own 200 mm minimum, which is the one case `riderBornHeight` refuses rather
  // than trimming to fit.
  A.setSpace({ ceilingMm: 2200 });
  const reason = A.topBoxRefusal(host);
  assert.ok(reason, 'a 2200 ceiling over a 2150 wardrobe should refuse');
  assert.match(reason, /there is only .* mm left, and a top box needs/,
    'the greyed button does not carry the engine\'s own words');

  // THE SAME SENTENCE the press would have produced — one reading of the
  // ceiling, not two.
  const pressed = A.addTopBox(host);
  assert.equal(pressed.ok, false);
  assert.equal(pressed.said, reason, 'the button and the press disagree');
  assert.equal(A.topBoxesOn(host).length, 0, 'a refused add left something behind');
});

test('F3 · a box does not stand on a box', () => {
  const host = fresh();
  const box = A.addTopBox(host);
  assert.equal(box.ok, true, box.said);
  assert.equal(A.topBoxRefusal(box.id), REASONS.topBoxOnTopBox);
});

// ─── AMENDED BY T66 F3 ──────────────────────────────────────────────────────
//
// T61's law: *"a box and the cabinet under it are two things in the same
// place"*, so a box is a UNIT of its own and its numbers are never the host's.
// That is unchanged. What changed is where they are asked: a box's boards are
// CARCASS, and *"jak naciśniesz w szafę … znika"* — a carcass click closes the
// panel now, so the box's own width, height and REMOVE stand on the LEFT, in
// EXTRAS, beside the button that added it.
test('F3 · the box is a unit of its own, and it is edited on the left', () => {
  const host = fresh();
  const box = A.addTopBox(host);
  const side = S().unitResult(box.id).panels.find((p) => p.part === 'BUL');
  assert.ok(side, 'the box cuts no boards');

  // A carcass board opens NOTHING — the panel slides out, on a box exactly as
  // on the wardrobe under it.
  assert.equal(A.resolveSelection({ unitId: box.id, elementRef: side.id }), null,
    'a carcass click still opens a menu');
  assert.equal(A.MENU_FOR_KIND.side, undefined);

  // …and the box's own three controls are in EXTRAS, on the BOX's id and not
  // the host's, which is the whole of T61 F3's law.
  const options = read('src/retail/design/Options.jsx');
  assert.match(options, /testid="topbox-width"/);
  assert.match(options, /testid="topbox-height"/);
  assert.match(options, /data-testid="topbox-remove"/);
  assert.match(options, /A\.setUnitSize\(box\.id, \{ width: v \}\)/, 'the box writes the host\'s width');
  assert.match(options, /A\.removeUnit\(box\.id\)/);
  assert.match(options, /const boxes = unit \? A\.topBoxesOn\(unit\.id\) : \[\];/);
  assert.equal(A.unitById(box.id).id, box.id);

  // …and the panel still hands its editor the SELECTION's unit.
  assert.match(read('src/retail/design/Detail.jsx'),
    /A\.unitById\(selection\?\.unitId\) \|\| props\.unit/);
});

test('F3 · REMOVE takes the box and leaves the wardrobe', () => {
  const host = fresh();
  const box = A.addTopBox(host);
  assert.equal(A.topBoxesOn(host).length, 1);
  A.removeUnit(box.id);
  assert.equal(A.topBoxesOn(host).length, 0);
  assert.ok(S().units.find((u) => u.id === host), 'removing the box took the wardrobe');
});

test('F3 · the top box has ONE entry now, and it does not invent a number', () => {
  const layout = read('src/retail/design/Options.jsx');
  // T66 F3 · the thin wardrobe menu is deleted, so "not in the right-hand
  // menu" is now "not in the DOCK's table" — which is the same law, stated
  // where the table is.
  const menu = read('src/retail/design/detail/docked.jsx');
  // ─── AMENDED BY T65 F9 ─────────────────────────────────────────────────
  // T61 gave the top box two entries and asserted both pressed one action.
  // The owner moved it: *"add top box powinno być przeniesione do EXTRAS po
  // lewej"* — adding furniture is a STEP, editing an element is the right
  // panel. So EXTRAS keeps the button and the wardrobe's menu has none.
  // ─── AMENDED BY TURN 69 · F8 (LICENSED REMOVAL) ────────────────────────
  //
  // *"ADD TOP BOX leaves EXTRAS — split door covers it (owner: "po cholerę ten
  // box"). Engine `WARDROBE_TOP` and PRO stay; only the client entry dies."*
  //
  // T65 F9 moved the button INTO EXTRAS; tonight the button itself goes. What
  // this test has always guarded is *"ONE entry"* — and zero is one law, not
  // two: there is no second road for the client to press, and the assertion
  // below is inverted so a later turn cannot put one back unnoticed.
  //
  // The CAPABILITY is untouched and asserted in
  // `test/turn69-f8-the-joiners-order.test.js` — `adapter.addTopBox`, the
  // `WARDROBE_TOP` type, the library category a joiner adds one from, and the
  // part registry that machines it. A saved project's box is still edited in
  // EXTRAS, which the next line proves.
  assert.ok(!/data-testid="layout-add-top-box"/.test(layout), 'the ADD button came back');
  assert.ok(!/A\.addTopBox\(unit\.id\)/.test(layout), 'the client can add a top box again');
  assert.match(layout, /testid="topbox-width"/, 'a saved project can no longer edit its box');
  assert.match(read('src/retail/design/adapter.js'), /export function addTopBox\(hostId\)/,
    'the capability died with the button');
  assert.ok(!/data-testid="wardrobe-add-top-box"/.test(menu),
    'ADD TOP BOX is still in the wardrobe\'s right-hand menu');
  assert.ok(!/A\.addTopBox\(/.test(menu), 'the right menu still adds a top box');
  // The refusal is still read from the store's own predicate where the button is.
  assert.match(layout, /A\.topBoxRefusal\(unit\.id\)/);

  // …and the TWO-ENTRIES law moved with the owner's other sentence: ADD DOORS
  // is offered in both places and both press the one store path (T65 F9).
  assert.match(layout, /data-testid="extras-add-doors"/);
  assert.match(layout, /A\.addDoors\(unit\.id\)/);
  // T66 F3 · the second door to ADD DOORS was in the thin wardrobe menu. That
  // menu is gone, so *"i tu i tu"* is now EXTRAS and the STAGE's own gesture:
  // a leaf clicked docks PRO's `DoorModal`, which is where a door is edited.
  assert.match(menu, /menu === 'door'/);

  // NO `params` ARGUMENT: `defaultParamsFor` already applies
  // `profile.wardrobe.topBox.defaults`, and `addUnit` then overwrites the width
  // from the host and the height from the room. A retail literal here would be
  // a third opinion about a number the engine has two of.
  const adapter = read('src/retail/design/adapter.js');
  assert.match(adapter, /S\(\)\.addUnit\('WARDROBE_TOP', \{ near: host\.id \}\)/);
});
