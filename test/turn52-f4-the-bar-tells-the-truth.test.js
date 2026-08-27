// ─── T52 · F4 — THE LEFTOVER, ONCE MORE, AND THE BAR TELLS THE TRUTH ───────
//
// CLAUDE.md:
//
//   *"Whatever F1 computes, the BAR must show the same number the cabinets will
//   end up at. Where the two disagree today the owner reads the bar, builds to
//   it and finds forty millimetres missing at the wall. One number, computed
//   once, displayed and applied."*
//
// AND THEY DID DISAGREE, for one reason. `3d/ShareOutBar.jsx` worked the run,
// the gap and the plan out for itself and called `shareOutPlan(run, { wallWidth,
// others }, profile)` — with NO `wallMargin`. So the end of the run that had no
// filler standing on it yet reserved NOTHING, and the bar offered 660 each on a
// 4000 wall where the store was about to build 653. Forty millimetres, in a
// missing argument.
//
// One number now means ONE DERIVATION and not two that agree:
// `projectStore.shareOutSubject` resolves the walls, the wall margin, the run
// and the plan together; `settleLayout` decides whether to offer with it, the
// bar reads it through `shareOutView`, and `shareOutRun` applies it.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const WALL = 4000;
const ROOM = migrateRoom({ height: 2500, corners: rectCorners(WALL, 3000) });

const store = () => useProjectStore.getState();
const unit = (id) => store().units.find((u) => u.id === id);

function project() {
  store().loadProject({
    id: null, name: 'T52 F4', number: '52', client: 'the owner', room: ROOM, design: {},
  }, []);
}

/** `n` base units butted against the LEFT wall, in order. */
function run(n) {
  project();
  const margin = P.autoParts.sideInfill.defaultWidth;
  const ids = [];
  let last = null;
  for (let i = 0; i < n; i += 1) {
    const res = last ? store().addUnit('BUD', { near: last, side: 'R' }) : store().addUnit('BUD');
    assert.ok(res.id, res.error || '');
    if (!last) store().moveUnit(res.id, margin, 0, { magnet: false });
    ids.push(res.id);
    last = res.id;
  }
  return ids;
}

// ─── THE NUMBER ON THE BAR IS THE NUMBER THAT GETS BUILT ───────────────────

test('F4 — the bar’s figure equals the width every cabinet ends up at', () => {
  // Six from the left wall. Six 600s leave exactly 400 — the owner's threshold
  // itself, and the offer is UNDER it — so the last one is 650 and the leftover
  // is 350, which is his case: *"zostanie mniej niż 400 mm."*
  const ids = run(6);
  store().updateUnitParams(ids[5], { width: 650 });
  const view = store().shareOutView(ids[5]);
  assert.ok(view?.plan?.ok, 'the bar stands');
  const said = view.plan.each;
  assert.equal(said, 653, 'CLAUDE.md’s own figure — both fillers reserved');
  assert.notEqual(said, 660, 'which is what a plan with no wall margin offers');

  const res = store().shareOutRun(ids[5], {});
  assert.equal(res.ok, true, res.message || '');
  const widths = ids.map((id) => Number(unit(id).params.width));
  // *"The bar's own figure must equal what the cabinets end up at."*
  assert.equal(Math.min(...widths), said, 'every cabinet is the width the bar promised');
  assert.ok(Math.max(...widths) - said < widths.length,
    'to the odd millimetre, which goes to the last one');
  assert.equal(res.each, said, '…and the action reports the same number back');
});

test('F4 — …and the run really does finish on the wall, both fillers standing', () => {
  const ids = run(6);
  store().updateUnitParams(ids[5], { width: 650 });
  const margin = P.autoParts.sideInfill.defaultWidth;
  const said = store().shareOutView(ids[0]).plan.each;
  store().shareOutRun(ids[0], {});
  const widths = ids.map((id) => Number(unit(id).params.width));
  const xs = ids.map((id) => Number(unit(id).position.x_mm));
  assert.equal(xs[0], margin, 'a filler at the left wall');
  assert.equal(xs[5] + widths[5], WALL - margin, '…and one at the right, which did not exist before');
  assert.equal(widths.reduce((s, w) => s + w, 0), WALL - 2 * margin);
  assert.equal(said * 6 <= WALL - 2 * margin, true);
});

test('F4 — the bar is a FIXED POINT: press it twice, nothing moves', () => {
  // T51's F4 measures the leftover from the CARCASS, so a run that finishes on
  // both walls still reads 80 mm of leftover — the two scribe fillers, which a
  // share-out really does re-cut. So the bar may well still stand afterwards,
  // and the promise F4 makes is the stronger one: the number it shows is the
  // number that is already built, and pressing it again changes nothing.
  const ids = run(6);
  store().updateUnitParams(ids[5], { width: 650 });
  assert.ok(store().shareOutView(ids[0])?.plan, 'it stands before');

  const first = store().shareOutRun(ids[0], {});
  assert.equal(first.ok, true, first.message || '');
  const once = ids.map((id) => Number(unit(id).params.width));
  const oncePos = ids.map((id) => Number(unit(id).position.x_mm));

  const view = store().shareOutView(ids[0]);
  if (view?.plan?.ok) {
    assert.equal(view.plan.each, first.each,
      'whatever the bar says the second time, it is the same number');
    const second = store().shareOutRun(ids[0], {});
    assert.equal(second.ok, true, second.message || '');
    assert.deepEqual(ids.map((id) => Number(unit(id).params.width)), once,
      'and applying it again moves no width');
    assert.deepEqual(ids.map((id) => Number(unit(id).position.x_mm)), oncePos,
      '…and no cabinet');
  }
});

// ─── ONE DERIVATION, NOT TWO THAT AGREE ────────────────────────────────────

test('F4 — the bar does no arithmetic of its own', () => {
  const src = readFileSync(new URL('../src/3d/ShareOutBar.jsx', import.meta.url), 'utf8');
  assert.ok(!src.includes('shareOutPlan('), 'it does not compute a plan');
  assert.ok(!src.includes('shareOutFor('), '…nor resolve a run');
  assert.ok(!src.includes('shareOutGapSpan('), '…nor measure the gap');
  assert.ok(!src.includes("from '../engine/shareOut.js'"),
    'it does not reach the share-out engine at all');
  assert.ok(src.includes('const found = view && view.plan ? view : null;'),
    'it is handed the store’s own resolution');
  // The three data attributes the walk reads are unchanged.
  for (const attr of ['data-share-out-bar=', 'data-share-out-go=', 'data-share-out-extra=', 'data-share-out-blocked=']) {
    assert.ok(src.includes(attr), attr);
  }
});

test('F4 — the store resolves it ONCE, and all three callers take that one', () => {
  const src = readFileSync(new URL('../src/stores/projectStore.js', import.meta.url), 'utf8');
  assert.ok(src.includes('function shareOutSubject(state, unitId, profile, { gated = false } = {})'),
    'one resolver');
  assert.ok(src.includes('const wallMargin = wallMarginOf(state, unit);'),
    '…and the wall margin is inside it, so no caller can forget it');
  // The offer, the view and the action.
  assert.ok(src.includes("shareOutSubject(s, unit.id, getCabinetProfile(), { gated: true })"),
    'settleLayout raises the offer with it');
  assert.ok(src.includes("shareOutView: (unitId) => shareOutSubject(get(), unitId, getCabinetProfile(), { gated: true })"),
    'the bar reads it');
  assert.ok(src.includes('const offer = shareOutSubject(state, unitId, profile);'),
    'and shareOutRun applies it — ungated, because a button must never do nothing');
  // Nothing else in the store may compute a share-out.
  // Only the resolver, and the two branches of the EXTRA cabinet — which has to
  // re-ask of the run that now exists, because it added one.
  const plans = src.split('shareOutPlan(').length - 1;
  assert.equal(plans, 3, 'the resolver, and the extra cabinet’s two re-asks');
  const action = src.slice(src.indexOf('  shareOutRun:'), src.indexOf('  removeUnit:'));
  assert.ok(action.split('shareOutPlan(').length - 1 === 2,
    'both of them are inside the extra-cabinet branch');
  assert.ok(action.includes('let plan = extra ? shareOutPlan('),
    '…and an ordinary share-out takes the resolver’s plan unchanged');
});

test('F4 — the scene hands the bar the store’s resolution and nothing else', () => {
  const src = readFileSync(new URL('../src/3d/Scene.jsx', import.meta.url), 'utf8');
  assert.ok(src.includes('const shareOutView = useProjectStore((s) => s.shareOutView);'));
  assert.ok(src.includes('const shareOutNow = useMemo('), 're-derived when the units move');
  assert.ok(src.includes('view={shareOutNow}'));
  assert.ok(!/<ShareOutBar[\s\S]{0,400}units=\{units\}/.test(src),
    'the bar is no longer handed the whole project to work it out again');
});
