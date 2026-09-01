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

test('F3 · the box is a unit of its own, and its menu is the wardrobe family\'s', () => {
  const host = fresh();
  const box = A.addTopBox(host);
  const side = S().unitResult(box.id).panels.find((p) => p.part === 'BUL');
  assert.ok(side, 'the box cuts no boards');

  const sel = A.resolveSelection({ unitId: box.id, elementRef: side.id });
  assert.equal(sel.menu, 'wardrobe', 'a box\'s carcass does not open the wardrobe family');
  assert.equal(sel.unitId, box.id, 'the selection points at the host, not the box');
  // STAGE HINT names it — a box and the cabinet under it are two things in the
  // same place, so this prefix is not conditional on there being two walls.
  assert.match(A.selectionName(sel), /^Top box — /);

  // …and column 7 hands the menu the SELECTION's unit, which is what stops a
  // box's menu editing the wardrobe underneath it.
  assert.match(read('src/retail/design/Detail.jsx'),
    /unit=\{A\.unitById\(selection\.unitId\) \|\| props\.unit\}/);
  assert.equal(A.unitById(box.id).id, box.id);
});

test('F3 · REMOVE takes the box and leaves the wardrobe', () => {
  const host = fresh();
  const box = A.addTopBox(host);
  assert.equal(A.topBoxesOn(host).length, 1);
  A.removeUnit(box.id);
  assert.equal(A.topBoxesOn(host).length, 0);
  assert.ok(S().units.find((u) => u.id === host), 'removing the box took the wardrobe');
});

test('F3 · both entries press the same action, and neither invents a number', () => {
  const layout = read('src/retail/design/Options.jsx');
  const menu = read('src/retail/design/detail/WardrobeMenu.jsx');
  assert.match(layout, /data-testid="layout-add-top-box"/);
  assert.match(layout, /A\.addTopBox\(unit\.id\)/);
  assert.match(menu, /data-testid="wardrobe-add-top-box"/);
  assert.match(menu, /A\.addTopBox\(unitId\)/);
  // Both grey on the same predicate.
  assert.match(layout, /A\.topBoxRefusal\(unit\.id\)/);
  assert.match(menu, /A\.topBoxRefusal\(unitId\)/);

  // NO `params` ARGUMENT: `defaultParamsFor` already applies
  // `profile.wardrobe.topBox.defaults`, and `addUnit` then overwrites the width
  // from the host and the height from the room. A retail literal here would be
  // a third opinion about a number the engine has two of.
  const adapter = read('src/retail/design/adapter.js');
  assert.match(adapter, /S\(\)\.addUnit\('WARDROBE_TOP', \{ near: host\.id \}\)/);
});
