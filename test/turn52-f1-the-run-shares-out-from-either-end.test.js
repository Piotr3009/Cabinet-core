// ─── T52 · F1: THE RUN SHARES OUT FROM EITHER END, AND TAKES EVERY CABINET ──
//
// The owner, 26.08.2026, walking T51:
//
//   *"chodziło o to żeby były zawsze equal, i to działa — ale od lewej, a nie
//   od prawej strony, czyli od jednej strony."*
//
//   *"jak robię po prawej, to proponuje tylko 1 lub 2 szafki i nadal nie może
//   przesunąć reszty."*
//
// Two faults, one feature, both diagnosed in CLAUDE.md before a line was
// written:
//
//   (a) THE RUN BREAKS AT A MILLIMETRE. `buildRuns` starts a new run when the
//       gap between two cabinets exceeds `autoParts.topInfill.runGap`, which is
//       ONE. Six cabinets with a 2 mm shadow between them are TWO runs, so the
//       share-out divides the one the hand touched and refuses to move the
//       rest. The share-out gets its OWN scope — `buildWallRuns`, every cabinet
//       on this wall at this level, wall to wall — and `runGap` is NOT changed.
//
//   (b) IT ONLY LAYS OUT FROM THE LEFT. The cursor started at the run's left
//       edge whichever end the room was at. It anchors on the end the gap is
//       NOT at now, and finishes flush on both walls either way.
//
// THE ARITHMETIC, in the owner's own words, asserted here exactly so:
//
//   (wall clear − infill − infill − fixed-width cabinets) ÷ movable count = each

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateRoom, rectCorners, roomWalls } from '../src/engine/room.js';
import { buildRuns, buildWallRuns } from '../src/engine/runs.js';
import { getUnitType } from '../src/engine/types.js';
import { shareOutPlan, runFor } from '../src/engine/shareOut.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const WALL = 4000;
const ROOM = migrateRoom({ height: 2500, corners: rectCorners(WALL, 3000) });
const WALLS = roomWalls(ROOM);

/** A base unit at a stated x, hand-built — no store, no placement. */
const bud = (id, x, w = 600, params = {}) => ({
  id,
  type: 'BUD',
  params: {
    width: w, height: 770, depth: 570, unit_num: id, ...params,
  },
  position: { wall: 0, x_mm: x, rotation_deg: 0 },
});

const ctx = (units, wallMargin = 40) => ({ wallWidth: WALL, others: units, wallMargin });

// ─── (a) THE SCOPE: A SHADOW IS NOT A BREAK ────────────────────────────────

test('F1a · runGap is ONE millimetre, and it is not changed', () => {
  assert.equal(P.autoParts.topInfill.runGap, 1,
    'the top infill’s own tolerance — CLAUDE.md forbids touching it');
});

test('F1a · six cabinets with a 2 mm shadow are TWO runs to buildRuns…', () => {
  // Five butted, then a 2 mm shadow, then the sixth. Exactly the owner's case.
  const units = [
    bud('u1', 40), bud('u2', 640), bud('u3', 1240),
    bud('u4', 1840), bud('u5', 2440), bud('u6', 3042),
  ];
  const runs = buildRuns(units, P);
  assert.equal(runs.length, 2, 'a 2 mm gap is more than 1 mm, so the board cannot bridge it');
  assert.deepEqual(runs.map((r) => r.units.length), [5, 1],
    'which is why the share-out only ever saw one or two cabinets');
});

test('F1a · …and ONE run to the share-out’s own scope', () => {
  const units = [
    bud('u1', 40), bud('u2', 640), bud('u3', 1240),
    bud('u4', 1840), bud('u5', 2440), bud('u6', 3042),
  ];
  const runs = buildWallRuns(units, P);
  assert.equal(runs.length, 1, 'every cabinet on this wall at this level, wall to wall');
  assert.equal(runs[0].units.length, 6);
  assert.deepEqual(runs[0].units.map((u) => u.id), ['u1', 'u2', 'u3', 'u4', 'u5', 'u6'],
    'in order along the wall');
});

test('F1a · the LEVEL still breaks it — a wall unit is not in a base run', () => {
  const units = [
    bud('u1', 0), bud('u2', 600),
    {
      id: 'w1',
      type: 'WUD',
      params: { width: 600, height: 720, depth: 400, mount_height: 1400 },
      position: { wall: 0, x_mm: 1200, rotation_deg: 0 },
    },
  ];
  const runs = buildWallRuns(units, P);
  assert.equal(runs.length, 2, 'two mounting levels, two runs — the gap rule is the only one dropped');
});

test('F1a · a different WALL is still a different run', () => {
  const units = [bud('u1', 0), { ...bud('u2', 0), position: { wall: 1, x_mm: 0, rotation_deg: 0 } }];
  assert.equal(buildWallRuns(units, P).length, 2);
});

test('F1a · a TURNED cabinet is in no run at all — it has no "along the wall"', () => {
  const units = [bud('u1', 0), { ...bud('u2', 700), position: { wall: 0, x_mm: 700, rotation_deg: 90 } }];
  const runs = buildWallRuns(units, P);
  assert.equal(runs.length, 1);
  assert.deepEqual(runs[0].units.map((u) => u.id), ['u1']);
});

test('F1a · `runFor` — the share-out’s entry point — takes the whole wall', () => {
  const units = [
    bud('u1', 40), bud('u2', 640), bud('u3', 1240),
    bud('u4', 1840), bud('u5', 2440), bud('u6', 3042),
  ];
  // Reached from the LAST cabinet — the one on the far side of the shadow,
  // which is where the owner was clicking.
  const found = runFor(units, 'u6', { walls: WALLS, wallMargin: 40 }, P);
  assert.ok(found);
  assert.equal(found.run.units.length, 6, 'all six, not one');
});

// ─── THE ARITHMETIC, IN THE OWNER'S OWN WORDS ──────────────────────────────

test('F1 · (wall clear − infill − infill − fixed) ÷ movable = each', () => {
  // CLAUDE.md's own worked example: a 4000 wall, 40 on the left, a 260 gap on
  // the right, six cabinets. T51 offered 660 each — 6 × 660 = 3960, leaving 40:
  // ONE filler, not two. Correct is (4000 − 40 − 40) ÷ 6 = 653.
  const units = [
    bud('u1', 40, 600, { side_infill_left_mm: 40 }), bud('u2', 640),
    bud('u3', 1240), bud('u4', 1840), bud('u5', 2440), bud('u6', 3040),
  ];
  const run = buildWallRuns(units, P)[0];
  const plan = shareOutPlan(run, ctx(units), P, {});

  const wallClear = plan.clear;
  const infillLeft = plan.reserved.left;
  const infillRight = plan.reserved.right;
  const fixed = plan.fixed;
  const movable = plan.n;

  // The sentence, literally.
  assert.equal(
    Math.floor((wallClear - infillLeft - infillRight - fixed) / movable),
    plan.each,
  );

  assert.equal(wallClear, 4000, 'wall to wall');
  assert.equal(infillLeft, 40, 'the filler that EXISTS');
  assert.equal(infillRight, 40, '…and the one that WILL exist — both, always');
  assert.equal(fixed, 0);
  assert.equal(movable, 6);
  assert.equal(plan.each, 653, 'CLAUDE.md’s own figure');
  assert.notEqual(plan.each, 660, 'which is what T51 offered, one filler short');
});

test('F1 · …and with an appliance in it, the machine’s width comes out first', () => {
  const units = [
    bud('u1', 40, 600, { side_infill_left_mm: 40 }),
    { ...bud('u2', 640), type: 'DW_PANEL' },
    bud('u3', 1240), bud('u4', 1840), bud('u5', 2440), bud('u6', 3040),
  ];
  assert.equal(getUnitType('DW_PANEL').widthFixed, true);
  const run = buildWallRuns(units, P)[0];
  const plan = shareOutPlan(run, ctx(units), P, {});
  assert.equal(plan.fixed, 600, 'the dishwasher is what the dishwasher is');
  assert.equal(plan.n, 5);
  assert.equal(
    Math.floor((plan.clear - plan.reserved.left - plan.reserved.right - plan.fixed) / plan.n),
    plan.each,
  );
  assert.equal(plan.each, Math.floor((4000 - 40 - 40 - 600) / 5));
});

test('F1 · the widths add up to exactly the stretch between the two fillers', () => {
  const units = [bud('u1', 40), bud('u2', 640), bud('u3', 1240)];
  const run = buildWallRuns(units, P)[0];
  const plan = shareOutPlan(run, ctx(units), P, {});
  const total = plan.widths.reduce((s, w) => s + w.to, 0);
  assert.equal(total + plan.fixed, plan.endAt - plan.startAt,
    'startAt → endAt is what the cabinets fill, whichever end they were laid from');
  assert.equal(plan.startAt, 40);
  assert.equal(plan.endAt, 3960);
});

// ─── (b) THE ANCHOR: THE END THE GAP IS NOT AT ─────────────────────────────

test('F1b · a gap on the RIGHT anchors the run on the LEFT wall', () => {
  const units = [bud('u1', 40), bud('u2', 640), bud('u3', 1240)];  // 1840 → 4000 free
  const plan = shareOutPlan(buildWallRuns(units, P)[0], ctx(units), P, {});
  assert.equal(plan.anchor, 'left');
  assert.equal(plan.gapSide, 'right');
});

test('F1b · a gap on the LEFT anchors the run on the RIGHT wall', () => {
  // Pushed hard against the right-hand wall: 40 free there, 2120 on the left.
  const units = [bud('u1', 2160), bud('u2', 2760), bud('u3', 3360)];
  const plan = shareOutPlan(buildWallRuns(units, P)[0], ctx(units), P, {});
  assert.equal(plan.anchor, 'right');
  assert.equal(plan.gapSide, 'left');
});

test('F1b · two equally free ends anchor LEFT — every run before tonight', () => {
  const units = [bud('u1', 1400), bud('u2', 2000)];   // 1400 each side
  const plan = shareOutPlan(buildWallRuns(units, P)[0], ctx(units), P, {});
  assert.equal(plan.anchor, 'left');
});

test('F1b · the store lays the run out from whichever end the plan names', () => {
  const store = readFileSync(new URL('../src/stores/projectStore.js', import.meta.url), 'utf8');
  const action = store.slice(store.indexOf('  shareOutRun:'), store.indexOf('  removeUnit:'));
  assert.ok(action.includes("const fromRight = plan.anchor === 'right';"),
    'the anchor is the PLAN’s — one derivation, not a second opinion');
  assert.ok(action.includes('Number(plan.endAt)'), 'anchored right, the cursor walks back from endAt');
  assert.ok(action.includes('Number(plan.startAt)'), 'anchored left, forwards from startAt');
  assert.ok(action.includes('const outward = fromRight ? units : [...units].reverse();'),
    '…and the growing order turns over with it');
  // CABINET-ON-CABINET OVERLAP IS UNTOUCHED — *"nachodzenie na siebie to
  // sztywna zasada"*. Only the run's own auto-parts stand down.
  assert.ok(action.includes('withRunStoodDown(units.map((u) => u.id)'),
    'the run’s own fillers step out, and nothing else does');
});

// ─── THE STORE, END TO END ─────────────────────────────────────────────────

const store = () => useProjectStore.getState();
const unit = (id) => store().units.find((u) => u.id === id);

function project() {
  store().loadProject({
    id: null, name: 'T52 F1', number: '52', client: 'the owner', room: ROOM, design: {},
  }, []);
}

/**
 * `n` base units butted against the LEFT wall, in order.
 *
 * The first one is placed by the library and then moved to the wall — a bare
 * `addUnit` centres it, which is turn 9's own behaviour and not this feature.
 * Every one after it goes in beside its neighbour, exactly as the "+" does.
 */
function runAgainstTheLeftWall(n) {
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

/** Six cabinets, butted, with a 2 mm shadow before the last one. */
function sixWithAShadow() {
  const ids = runAgainstTheLeftWall(6);
  // Open a 2 mm shadow in front of the last cabinet — the millimetre that broke
  // the run. The magnet is off, exactly as a hand that stopped 2 mm short.
  const u5 = unit(ids[4]);
  const at = Number(u5.position.x_mm) + Number(u5.params.width) + 2;
  store().moveUnit(ids[5], at, 0, { magnet: false });
  return ids;
}

test('F1 · a six-cabinet run with a shadow in it shares out as ONE run', () => {
  const ids = sixWithAShadow();
  // Reached from the LAST cabinet — the far side of the shadow.
  const res = store().shareOutRun(ids[5], {});
  assert.equal(res.ok, true, res.message || '');
  assert.equal(res.widths.length, 6, 'all six moved, not one or two');

  const margin = P.autoParts.sideInfill.defaultWidth;
  const widths = ids.map((id) => Number(unit(id).params.width));
  assert.equal(widths.reduce((s, w) => s + w, 0) + 2 * margin, WALL,
    'wall to wall, less the two scribes');
  assert.ok(Math.max(...widths) - Math.min(...widths) < widths.length,
    'and all one width, to the odd millimetre');

  // …and they stand end to end, the shadow closed.
  const xs = ids.map((id) => Number(unit(id).position.x_mm));
  assert.equal(xs[0], margin);
  for (let i = 1; i < ids.length; i += 1) {
    assert.equal(xs[i], xs[i - 1] + widths[i - 1], `${ids[i]} butts onto ${ids[i - 1]}`);
  }
  assert.deepEqual((res.notices || []).filter((n) => /limited/i.test(n)), [],
    'nothing was refused on the way');
});

test('F1 · a run reached from the RIGHT END shares out and finishes on BOTH walls', () => {
  // Six cabinets parked against the RIGHT-hand wall, so the leftover — 360 mm,
  // under the owner's 400 — is on the LEFT. This is the case that laid out the
  // wrong way and stopped: *"jak robię po prawej … nadal nie może przesunąć
  // reszty."*
  const ids = runAgainstTheLeftWall(6);
  const margin = P.autoParts.sideInfill.defaultWidth;
  // Six 600s on a 4000 wall leave exactly 400 — the owner's threshold itself,
  // and the offer is UNDER it. One cabinet 50 mm wider puts the leftover at
  // 350, which is his case: *"zostanie mniej niż 400 mm."*
  store().updateUnitParams(ids[5], { width: 650 });
  // Slide the whole run right, last first, so nothing is asked to move through
  // a neighbour. It finishes against the right wall with its scribe.
  let right = WALL - margin;
  for (const id of [...ids].reverse()) {
    const w = Number(unit(id).params.width);
    store().moveUnit(id, right - w, 0, { magnet: false });
    right -= w;
  }
  const before = ids.map((id) => Number(unit(id).position.x_mm));
  assert.equal(
    before[5] + Number(unit(ids[5]).params.width), WALL - margin,
    'the run really is parked against the RIGHT wall',
  );
  assert.ok(before[0] > margin + 100, `…and bare wall is left on the LEFT (${before[0]})`);

  const view = store().shareOutView(ids[0]);
  assert.ok(view?.plan, 'the bar stands in the 310 mm left over');
  assert.equal(view.plan.anchor, 'right', 'the gap is on the LEFT, so the anchor is the RIGHT wall');
  assert.equal(view.span.side, 'left', '…and the bar stands in that same end');
  assert.equal(view.run.units.length, 6, 'and it is holding the whole run');

  const res = store().shareOutRun(ids[0], {});
  assert.equal(res.ok, true, res.message || '');

  const widths = ids.map((id) => Number(unit(id).params.width));
  const xs = ids.map((id) => Number(unit(id).position.x_mm));
  assert.equal(xs[0], margin, 'it reaches the LEFT wall — this is the whole of (b)');
  assert.equal(xs[5] + widths[5], WALL - margin, '…and still finishes on the right one');
  assert.equal(widths.reduce((s, w) => s + w, 0) + 2 * margin, WALL);
  assert.ok(Math.max(...widths) - Math.min(...widths) < widths.length, 'all one width');
  assert.deepEqual((res.notices || []).filter((n) => /limited/i.test(n)), [],
    'and nothing was refused: the cabinets DID move');
});

test('F1 · cabinet-on-cabinet overlap stays absolutely forbidden', () => {
  // *"nachodzenie na siebie to sztywna zasada."*  After a share-out no two
  // carcasses may share a millimetre.
  const ids = sixWithAShadow();
  store().shareOutRun(ids[0], {});
  const spans = ids
    .map((id) => unit(id))
    .map((u) => [Number(u.position.x_mm), Number(u.position.x_mm) + Number(u.params.width)])
    .sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < spans.length; i += 1) {
    assert.ok(spans[i][0] >= spans[i - 1][1] - 1e-6,
      `${spans[i - 1]} and ${spans[i]} overlap`);
  }
});
