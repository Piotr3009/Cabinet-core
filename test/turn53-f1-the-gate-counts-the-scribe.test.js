// ─── T53 · F1 — THE SHARE-OUT GATE, AND THE ✕ ──────────────────────────────
//
// The owner, 27.08.2026:
//
//   *"jak dołożę nową szafę lub cupboard, i zostaje mniej niż 400 to muszę
//   przesunąć żeby się pojawiła ta informacja … czyli działa w 99 procentach."*
//   *"musi też być przycisk dismiss — jak nie chcę tego robić teraz, muszę coś
//   nacisnąć. pamiętaj krzyżyk zasada."*
//
// ─── (a) THE MISSING ONE PER CENT, TO THE MILLIMETRE ───────────────────────
//
// `plan.gap` is the SUM of both ends' carcass-to-boundary gaps, and the gate
// refused at `gap >= 400`. Fill a 4000 wall from the left with six 600s:
//
//     360  bare wall on the right — the leftover the owner is looking at
//      40  the LEFT end's bodyGap — the scribe's own reserve, not free space
//     ───
//     400  and 400 >= 400, so the bar stayed silent
//
// Nudge that cabinet one millimetre toward the gap: 399, and the bar appears.
// That is his "muszę przesunąć", exactly, and it is arithmetic.
//
// The gate now reads the leftover LESS WHAT IS RESERVED — `gap −
// reserved.total`, the same `reserved` the plan lays the run out with:
//
//     on the add          400 − 80 = 320 < 400  → the bar stands
//     after a share-out    80 − 80 =   0        → it does not stand again
//
// The second line closes the T52 verdict's own note about the bar returning
// forever over two scribe fillers. One cause, two bugs, one subtraction.
//
// ─── (b) THE ✕ ────────────────────────────────────────────────────────────
//
// The cross closes the offer for THIS GAP: the plan's signature (wall, mount,
// startAt, endAt, gap) is remembered, `settleLayout` will not raise the bar
// again while it matches, and any geometry change that moves one of those
// numbers is a NEW offer that the old cross never saw.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateRoom, rectCorners, roomWalls } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import {
  runFor, shareOutOffered, shareOutPlan, shareOutSignature,
} from '../src/engine/shareOut.js';

const WALL = 4000;
const ROOM = migrateRoom({ height: 2500, corners: rectCorners(WALL, 3000) });
const MARGIN = P.autoParts.sideInfill.defaultWidth;

const store = () => useProjectStore.getState();
const ui = () => useUiStore.getState();
const unit = (id) => store().units.find((u) => u.id === id);

function project() {
  ui().clearShareOutDismissed();
  ui().clearShareOut();
  store().loadProject({
    id: null, name: 'T53 F1', number: '53', client: 'the owner', room: ROOM, design: {},
  }, []);
}

/** The owner's own sequence: fill the wall from the left, one cabinet at a time. */
function fillFromTheLeft(n) {
  project();
  const ids = [];
  let last = null;
  for (let i = 0; i < n; i += 1) {
    const res = last ? store().addUnit('BUD', { near: last, side: 'R' }) : store().addUnit('BUD');
    assert.ok(res.id, res.error || `add #${i + 1} refused`);
    if (!last) store().moveUnit(res.id, MARGIN, 0, { magnet: false });
    ids.push(res.id);
    last = res.id;
  }
  return ids;
}

function planNow(id) {
  const s = store();
  const found = runFor(s.units, id, { walls: roomWalls(s.project.room), wallMargin: MARGIN }, P);
  return found ? shareOutPlan(found.run, found.context, P, {}) : null;
}

// ─── (a) THE DIAGNOSIS, HELD AS NUMBERS ───────────────────────────────────

test('F1a — the owner’s wall: 360 visible, 40 reserved, and the sum used to read 400', () => {
  const ids = fillFromTheLeft(6);
  const plan = planNow(ids[0]);
  assert.equal(plan.gap, 400, 'the SUM of both ends — his 360 plus a 40 scribe reserve');
  assert.deepEqual(plan.reserved, { left: 40, right: 40, total: 80 },
    'a filler at each end, because the run meets a wall at each end');
  assert.equal(plan.gap - plan.reserved.total, 320, 'what is actually free');
  // And the visible leftover the BAR prints is his own number, untouched.
  assert.equal(store().shareOutView(ids[0]).span.gap, 360, 'the bar reads the bare wall');
});

test('F1a — the bar stands ON THE ADD, with nothing moved', () => {
  const ids = fillFromTheLeft(6);
  assert.deepEqual(ui().shareOutOffer, { unitId: ids[5] },
    'the offer is standing the moment the sixth cabinet lands');
  const view = store().shareOutView(ids[5]);
  assert.ok(view?.plan?.ok, 'and it is a real plan');
  assert.equal(view.plan.each, 653, 'the width every cabinet would become');
});

test('F1a — the millimetre nudge is no longer needed, and still agrees', () => {
  // His workaround: move something so the sum drops under 400. It still offers
  // — the point is that it offered BEFORE the move as well.
  const ids = fillFromTheLeft(6);
  store().moveUnit(ids[5], Number(unit(ids[5]).position.x_mm) + 1, 0, { magnet: false });
  const plan = planNow(ids[0]);
  assert.equal(plan.gap, 399, 'the sum the old gate needed');
  assert.ok(store().shareOutView(ids[0])?.plan?.ok, 'and the bar stands here too');
});

test('F1a — a shared-out run does NOT offer again (the T52 verdict’s own note)', () => {
  const ids = fillFromTheLeft(6);
  const res = store().shareOutRun(ids[5], {});
  assert.equal(res.ok, true, res.message || '');
  const plan = planNow(ids[0]);
  assert.equal(plan.gap, 80, 'two scribe fillers, carcass to wall');
  assert.equal(plan.gap - plan.reserved.total, 0, '…and every millimetre of it is reserved');
  const s = store();
  const found = runFor(s.units, ids[0], { walls: roomWalls(s.project.room), wallMargin: MARGIN }, P);
  assert.equal(shareOutOffered(found.run, found.context, P), null,
    'so there is nothing left to offer');
  assert.equal(ui().shareOutOffer, null, 'and the bar is down');
});

test('F1a — a gap of 400 or more still does not offer: the threshold is untouched', () => {
  // Five 600s from the left wall leave 960 of bare wall — far over the owner's
  // 400 — and the bar has no business there.
  const ids = fillFromTheLeft(5);
  const plan = planNow(ids[0]);
  assert.equal(plan.gap - plan.reserved.total, 960 - 40,
    'a wall this empty is not a leftover');
  assert.ok(plan.gap - plan.reserved.total >= 400);
  assert.equal(ui().shareOutOffer, null, 'no bar');
  assert.equal(P.ui.shareOut.gapMm, 400, 'and the 400 itself was not touched');
});

// ─── (b) THE ✕ ────────────────────────────────────────────────────────────

test('F1b — the signature is the OFFER, not the fact of a dismissal', () => {
  const ids = fillFromTheLeft(6);
  const view = store().shareOutView(ids[5]);
  assert.equal(typeof view.signature, 'string');
  assert.equal(view.signature, shareOutSignature(view.run, view.plan));
  assert.match(view.signature, /^w\d+\|m/, 'wall and mount lead it');
  // Two reads of the same unmoved geometry are the same offer.
  assert.equal(store().shareOutView(ids[0]).signature, view.signature,
    'and any unit in the run resolves the same run, so the same signature');
});

test('F1b — the ✕ holds across a settle', () => {
  const ids = fillFromTheLeft(6);
  const view = store().shareOutView(ids[5]);
  ui().dismissShareOut(view.signature);
  assert.equal(ui().shareOutOffer, null, 'the bar is down at once');

  // A settle that changes no geometry — exactly what would resurrect it.
  const settled = store().settleLayout(ids[5]);
  assert.equal(settled.offered, false, 'the settle does not re-offer');
  assert.equal(settled.dismissed, true, '…and says why');
  assert.equal(ui().shareOutOffer, null, 'the bar stays down');
  assert.equal(ui().shareOutDismissed, view.signature, 'the cross is still remembered');
});

test('F1b — …and lifts on a real geometry change', () => {
  const ids = fillFromTheLeft(6);
  ui().dismissShareOut(store().shareOutView(ids[5]).signature);
  assert.equal(ui().shareOutOffer, null);

  // Move a cabinet: the run's startAt/endAt/gap move with it, so this is a
  // different offer and the joiner has not answered it.
  store().moveUnit(ids[5], Number(unit(ids[5]).position.x_mm) + 50, 0, { magnet: false });
  assert.deepEqual(ui().shareOutOffer, { unitId: ids[5] }, 'the bar is back');
  assert.equal(ui().shareOutDismissed, null, 'and the stale cross is forgotten');
});

test('F1b — a typed width is a geometry change too', () => {
  const ids = fillFromTheLeft(6);
  ui().dismissShareOut(store().shareOutView(ids[5]).signature);
  assert.equal(ui().shareOutOffer, null);
  store().updateUnitParams(ids[5], { width: 560 });
  assert.ok(ui().shareOutOffer, 'a narrower cabinet is a different leftover');
});

test('F1b — loading a project forgets the cross', () => {
  const ids = fillFromTheLeft(6);
  ui().dismissShareOut(store().shareOutView(ids[5]).signature);
  assert.ok(ui().shareOutDismissed);
  project();
  assert.equal(ui().shareOutDismissed, null, 'it belonged to the other drawing');
  assert.equal(ui().shareOutOffer, null);
});

// ─── THE HOUSE ✕ RULE, IN THE MARKUP ──────────────────────────────────────

test('F1b — the bar carries the cross, and the English copy', () => {
  const src = readFileSync(new URL('../src/3d/ShareOutBar.jsx', import.meta.url), 'utf8');
  assert.match(src, /data-share-out-dismiss="1"/, 'the ✕ is there to be clicked');
  assert.match(src, /aria-label="Dismiss"/);
  assert.match(src, /onDismiss\?\.\(/, 'and it hands the signature back');
  assert.match(src, /mm left over/, 'English copy — T44’s failure is not repeated');
});

// ─── WHAT WAS NOT TOUCHED ─────────────────────────────────────────────────

test('F1 — `runGap` and the 400 are out of scope, and stayed out', () => {
  const src = readFileSync(new URL('../src/engine/shareOut.js', import.meta.url), 'utf8');
  // The header DISCUSSES `runGap` — T52's scope fix is why the share-out asks
  // `buildWallRuns` — but no line of code may read it.
  const code = src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.doesNotMatch(code, /runGap/, 'the top infill’s own gap rule is untouched');
  assert.equal(P.ui.shareOut.gapMm, 400);
  assert.equal(P.autoParts.topInfill.runGap, 1, 'still one millimetre, still not ours');
});
