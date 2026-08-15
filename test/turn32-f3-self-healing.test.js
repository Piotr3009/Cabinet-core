// ─── Turn 32, CLAUDE.md F3: front gaps become SELF-HEALING ──────────────────
//
// Owner's verdict on T31's modal: "why bother the client — gaps should fix
// themselves." The T31 matrix stays law — the numbers, the asymmetry law and
// the 21.5 cups ride exactly as built — only the MODE changes: APPLIED on
// unit creation / neighbour change / resize, announced as a GREY note, with
// the RED modal surviving only where auto has no move.
//
// The store-level end-to-end (an end panel appears → the front narrows itself
// → the panel leaves → the width comes back) is pinned in the updated
// turn31-f4 and turn31-f6 files; this file holds the plan itself and the
// dimension-label collision pass to their words.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { NEIGHBOUR, healingPlan } from '../src/engine/frontClearance.js';
import { LABEL_STEP_MM, frontGaps, spreadOverlappingRows } from '../src/engine/frontDimensions.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();

const edge = (kind, correctionMm, extra = {}) => ({
  kind, parked: false, correctionMm, ...extra,
});
const frontRow = (edges, extra = {}) => ({
  unitId: 'u1', unitNum: '01', panelId: 'F', w: 597, appliance: null, edges, ...extra,
});

// ─── the plan ───────────────────────────────────────────────────────────────

test('a correction lands on ITS edge, as an absolute trim, with a grey note', () => {
  const plan = healingPlan([frontRow({
    left: edge(NEIGHBOUR.FRONT, 0),
    right: edge(NEIGHBOUR.END_PANEL, 1.5),
  })], { trimOf: () => null });
  assert.equal(plan.patches.length, 1);
  assert.deepEqual(plan.patches[0], {
    unitId: 'u1', panelId: 'F', side: 'right', trim: 1.5, deltaMm: 1.5, kind: NEIGHBOUR.END_PANEL,
  });
  assert.deepEqual(plan.notices, ['front 01 F −1.5 mm at an end panel']);
  assert.deepEqual(plan.stuck, []);
});

test('a correction is CUMULATIVE against the trim already worn', () => {
  const plan = healingPlan([frontRow({
    right: edge(NEIGHBOUR.END_PANEL, 1.5),
  })], { trimOf: () => ({ left: 0, right: 1 }) });
  assert.equal(plan.patches[0].trim, 2.5, 'the old 1 plus the asked 1.5');
});

test('a vanished neighbour gives the edge BACK — and never below the kit width', () => {
  // The panel left: the edge wants 1.5 where it stands at 3 → correction −1.5.
  const back = healingPlan([frontRow({
    right: edge(NEIGHBOUR.NONE, -1.5),
  })], { trimOf: () => ({ left: 0, right: 1.5 }) });
  assert.equal(back.patches[0].trim, 0, 'the trim is handed back');
  assert.match(back.notices[0], /\+1\.5 mm at the end of the run/);

  // An appliance wants 0 where the kit already cut 1.5: a trim cannot WIDEN a
  // front past the kit's own width, so there is no patch — and no silence
  // pretending there was.
  const wall = healingPlan([frontRow({
    right: edge(NEIGHBOUR.APPLIANCE, -1.5),
  })], { trimOf: () => null });
  assert.deepEqual(wall.patches, []);
});

test('the plan refuses what the modal must keep: parked, appliance faces, no board left', () => {
  // Rule 7: parked means parked.
  const parked = healingPlan([frontRow({
    right: { kind: NEIGHBOUR.CORNER, parked: true, correctionMm: 0 },
  })], { trimOf: () => null });
  assert.deepEqual(parked.patches, []);

  // A fridge door is the factory's width — never cut.
  const appliance = healingPlan([frontRow({
    right: edge(NEIGHBOUR.END_PANEL, 1.5),
  }, { appliance: 'dishwasher' })], { trimOf: () => null });
  assert.deepEqual(appliance.patches, []);

  // A correction that would leave no board is STUCK, out loud — Check's job.
  const stuck = healingPlan([frontRow({
    right: edge(NEIGHBOUR.END_PANEL, 60),
  }, { w: 50 })], { trimOf: () => null });
  assert.deepEqual(stuck.patches, []);
  assert.equal(stuck.stuck.length, 1);
  assert.match(stuck.stuck[0].reason, /leave nothing/);
});

// ─── the grey note reaches the screen ───────────────────────────────────────

test('the self-correction ANNOUNCES itself — a grey note, never a question', () => {
  useUiStore.getState().clearMessages();
  store().loadProject({
    id: null,
    name: 't32-f3',
    room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
    design: {},
  }, []);
  const a = store().addUnit('BUD');
  store().updateUnitParams(a.id, { doors: { count: 1 } });
  store().addEndPanel(a.id, { side: 'R' });
  const texts = useUiStore.getState().messages.map((m) => m.message);
  assert.ok(texts.some((t) => /front .* −1\.5 mm at an end panel/.test(t)),
    `no grey note in: ${JSON.stringify(texts)}`);
  const note = useUiStore.getState().messages.find((m) => /−1\.5 mm/.test(m.message));
  assert.equal(note.level, 'grey', 'GREY — never a warning, never a question');
});

// ─── the dimension labels stand clear of each other ─────────────────────────

test('two gap figures that sit close are offset apart; far ones stand still', () => {
  const rows = [
    { kind: 'between-doors', axis: 'h', from: 597, to: 600, at: 350 },   // a 3 mm joint
    { kind: 'to-side', axis: 'h', from: 580, to: 600, at: 360 },         // its neighbour figure
    { kind: 'between-doors', axis: 'h', from: 1200, to: 1203, at: 350 }, // far away
  ];
  const spread = spreadOverlappingRows(rows);
  assert.equal(spread[0].offsetMm, undefined, 'the first figure holds its ground');
  assert.ok(spread[1].offsetMm > 0, 'the close one steps out to its own rung');
  assert.equal(spread[2].offsetMm, undefined, 'distance needs no rung');
});

test('two neighbours’ facing to-side figures never share a line', () => {
  // The classic overlap the owner saw: two adjacent cabinets, each printing
  // its to-side figure at mid-height, three millimetres apart in the room.
  // The RIGHT figure steps down one label height, deterministically.
  const result = {
    params: { width: 600, height: 770 },
    panels: [{
      id: 'F', role: 'front', part: 'FRONT', box: { x: 1.5, y: 0, w: 597, h: 767, z: 560, d: 18 },
    }],
  };
  const sides = frontGaps(result).filter((r) => r.kind === 'to-side');
  assert.equal(sides.length, 2);
  assert.equal(sides[0].at - sides[1].at, LABEL_STEP_MM,
    'left at mid-height, right one rung below — neighbours read as two numbers');
});

test('three figures on one spot climb three distinct rungs', () => {
  const rows = Array.from({ length: 3 }, (_, i) => ({
    kind: 'between-drawers', axis: 'v', from: 100 + i, to: 130 + i, at: 300,
  }));
  const offsets = spreadOverlappingRows(rows).map((r) => r.offsetMm || 0);
  assert.equal(new Set(offsets).size, 3, `distinct rungs, got ${offsets}`);
});
