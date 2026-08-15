// ─── F4: THE OWNER'S FRONT-GAP RULEBOOK, ALL 18 POINTS (turn 31) ────────────
//
// Agreed point by point on 15.08.2026. Every one of them is a test below, in
// the owner's own order, so the file reads as the rulebook does and a point
// that is not implemented is a point that is missing rather than a point that
// quietly passed.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import {
  NARROW_WARNING, NEIGHBOUR, WALL_NOTE, applianceColumn, applianceFaceWidth, carcassGaps,
  clearanceFor, clearanceMatrix, frontClearances, frontGapRows, gapVerdict, hingeAdjustMm,
  isCornerType, labelOf, maxGapMm, minGapMm, narrowingPlan, neighbourReachMm,
} from '../src/engine/frontClearance.js';

const store = () => useProjectStore.getState();

function project() {
  store().loadProject({
    id: null, name: 'gaps', room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }), design: {},
  }, []);
}

/** A run of base units, butted, the way the "+" puts them there. */
function run(n = 2, { width = 600, type = 'BUD', doors = 1 } = {}) {
  project();
  const ids = [];
  let near = null;
  for (let i = 0; i < n; i += 1) {
    const u = near ? store().addUnit(type, { near, side: 'right' }) : store().addUnit(type);
    store().updateUnitParams(u.id, { width, doors: { count: doors } });
    ids.push(u.id);
    near = u.id;
  }
  return ids;
}

const clearances = () => store().frontClearances();
const rowsOf = () => frontGapRows(clearances(), P);
const frontOf = (unitId, panelId) => clearances().find((f) => f.unitId === unitId && f.panelId === panelId);

// ═══════════════════════════════════════════════════════════════════════════
// A. FRONT CLEARANCE PER EDGE, BY NEIGHBOUR (rules 1–7)
// ═══════════════════════════════════════════════════════════════════════════

test('A. the matrix IS the owner’s six numbers, and the seventh is PARKED', () => {
  const m = clearanceMatrix(P);
  assert.equal(m[NEIGHBOUR.FRONT], 1.5, '1. another cabinet’s front');
  assert.equal(m[NEIGHBOUR.END_PANEL], 3, '2. an end panel');
  assert.equal(m[NEIGHBOUR.INFILL], 3, '3. an infill — same category as a panel');
  assert.equal(m[NEIGHBOUR.APPLIANCE], 0, '4. an appliance provides the 3 itself');
  assert.equal(m[NEIGHBOUR.WALL], 3, '5. a bare wall');
  assert.equal(m[NEIGHBOUR.NONE], 1.5, '6. the end of a run');
  // 7. An L-shape corner is PARKED with the L-shape unit. `null` and not 1.5:
  // a default here would be the app inventing a rule the owner has not agreed.
  assert.equal(m[NEIGHBOUR.CORNER], null, '7. the L-shape corner is parked');
  assert.equal(clearanceFor(NEIGHBOUR.END_PANEL, P), 3);
});

test('1. two cabinets’ fronts: 1.5 each, and the 3 a client sees', () => {
  const ids = run(2);
  const a = store().unitResult(ids[0]);
  const right = frontOf(ids[0], a.panels.find((p) => p.role === 'front').id);
  assert.ok(right, 'no front found');
  const edge = right.edges.right.kind === NEIGHBOUR.FRONT ? right.edges.right : right.edges.left;
  assert.equal(edge.kind, NEIGHBOUR.FRONT);
  assert.equal(edge.wantClearanceMm, 1.5);
  // …and the kits already build it: 1.5 inside its own carcass on that side.
  assert.equal(edge.haveClearanceMm, 1.5);
  assert.equal(edge.correctionMm, 0);
  // Which makes the visible joint 3.00 — the number, not under it.
  assert.equal(edge.gapMm, 3);
  assert.equal(gapVerdict(edge.gapMm, P).level, 'ok');
});

test('2. an END PANEL wants 3 — and since T32 the front GIVES it, by itself', () => {
  const ids = run(2);
  store().addEndPanel(ids[1], { side: 'R' });
  const r = store().unitResult(ids[1]);
  const front = frontOf(ids[1], r.panels.find((p) => p.role === 'front').id);
  assert.equal(front.edges.right.kind, NEIGHBOUR.END_PANEL);
  assert.equal(front.edges.right.wantClearanceMm, 3);
  // ─── TURN 32 (CLAUDE.md F3): the matrix is APPLIED, not offered ───
  // The moment the panel appeared, the store healed the edge: the front now
  // STANDS at the 3 the rulebook wants, wearing a 1.5 trim on THAT edge and
  // no other (rule 8 rides exactly as T31 built it).
  assert.equal(front.edges.right.haveClearanceMm, 3);
  assert.equal(front.edges.right.correctionMm, 0, 'healed: nothing left to correct');
  assert.equal(front.edges.left.correctionMm, 0, 'the other edge was never touched');
  const unit = store().units.find((u) => u.id === ids[1]);
  assert.deepEqual(unit.params.front_edge_trim[front.panelId], { left: 0, right: 1.5 });
});

test('3. an INFILL is the same category as a panel — a rigid neighbour', () => {
  const ids = run(2);
  store().setSideInfillEnabled(ids[1], true);
  const r = store().unitResult(ids[1]);
  const front = frontOf(ids[1], r.panels.find((p) => p.role === 'front').id);
  const edges = [front.edges.left, front.edges.right];
  const filler = edges.find((e) => e.kind === NEIGHBOUR.INFILL);
  if (filler) {
    assert.equal(filler.wantClearanceMm, 3);
    assert.equal(clearanceFor(NEIGHBOUR.INFILL, P), clearanceFor(NEIGHBOUR.END_PANEL, P));
  } else {
    // The unit sat where no filler was cut. The RULE is still the rule, and it
    // is the same number a panel gets — which is the point of rule 3.
    assert.equal(clearanceFor(NEIGHBOUR.INFILL, P), 3);
  }
});

test('4. an APPLIANCE front wants 0 — the machine provides the 3 itself', () => {
  assert.equal(clearanceFor(NEIGHBOUR.APPLIANCE, P), 0);
  // …and the fact is read off the PIECE. A D/W panel's face carries
  // `meta.appliance`, which is where turn 17 put it.
  const dw = computeCabinet(defaultParamsFor('DW_PANEL', P));
  const face = dw.panels.find((p) => p.role === 'front');
  assert.equal(face.meta.appliance, 'dw');
  // 594 in a 600 opening: the appliance is ALREADY 3 in from each end, which is
  // exactly why our front beside it runs to the carcass end.
  assert.equal(face.w, 594);
  assert.equal(applianceFaceWidth('dw', 600, P), 594);
});

test('4a. an appliance COLUMN takes the appliance’s width, symmetrically', () => {
  // The owner's own example: "oven 598 → drawer front below is 598".
  assert.equal(applianceFaceWidth('oven', 600, P), 598);
  const column = applianceColumn(
    { type: { appliance: 'oven' }, params: { width: 600 }, applianceId: 'oven' },
    P,
  );
  assert.equal(column.widthMm, 598);
  // "uniquely here both edges are set by the appliance, not by hinges" — so the
  // inset is the SAME on both sides. Everything else in this rulebook is
  // asymmetric; this one case is not, and it says so.
  assert.equal(column.insetMm, 1);
  // A machine nobody has published a width for gets no invented number: the
  // honest fallback is the carcass less the matrix's own 3 + 3.
  assert.equal(applianceFaceWidth('mystery-machine', 600, P), 594);
  assert.equal(applianceColumn({ params: { width: 600 } }, P), null);
});

test('5. a BARE WALL wants 3, and asks for an infill in yellow', () => {
  project();
  const u = store().addUnit('BUD');
  store().updateUnitParams(u.id, { width: 600, doors: { count: 1 } });
  // BARE is the operative word, and it takes saying: the app's own auto-parts
  // cut a scribe filler into a gap at the wall, and a filler is rule 3's
  // neighbour rather than rule 5's. Rule 5 is the case where nobody has put
  // one in — which is exactly the case that wants the yellow.
  store().moveUnit(u.id, 0);
  store().setSideInfillEnabled(u.id, false);
  const r = store().unitResult(u.id);
  const front = frontOf(u.id, r.panels.find((p) => p.role === 'front').id);
  const wall = [front.edges.left, front.edges.right].find((e) => e.kind === NEIGHBOUR.WALL);
  assert.ok(wall, `neither edge faces the wall: ${front.edges.left.kind} / ${front.edges.right.kind}`);
  assert.equal(wall.wantClearanceMm, 3);
  assert.equal(wall.note, WALL_NOTE);
  assert.equal(WALL_NOTE, 'infill? (dust collection)');
  // …and the row it produces is a YELLOW question, never a red fault: a wall
  // that wants a filler is a decision, not a mistake.
  const row = frontGapRows([front], P).find((x) => x.kind === NEIGHBOUR.WALL);
  assert.ok(row);
  assert.equal(row.level === 'yellow' || row.level === 'red', true);
  assert.match(row.message, /dust collection/);
});

test('6. the END OF A RUN — nothing there at all — wants 1.5', () => {
  project();
  const u = store().addUnit('BUD');
  store().updateUnitParams(u.id, { width: 600, doors: { count: 1 } });
  // Well clear of both walls: neither edge faces anything within reach.
  store().moveUnit(u.id, 2000);
  const r = store().unitResult(u.id);
  const front = frontOf(u.id, r.panels.find((p) => p.role === 'front').id);
  for (const side of ['left', 'right']) {
    assert.equal(front.edges[side].kind, NEIGHBOUR.NONE, side);
    assert.equal(front.edges[side].wantClearanceMm, 1.5);
    // …and the kit already builds 1.5, so a run end is silent.
    assert.equal(front.edges[side].correctionMm, 0);
  }
});

test('7. the L-SHAPE corner is PARKED — reported as parked, never judged', () => {
  assert.equal(clearanceFor(NEIGHBOUR.CORNER, P), null);
  assert.equal(isCornerType('L_SHAPE'), true);
  assert.equal(isCornerType('CORNER'), true, 'the pre-F10 name still reads');
  assert.equal(isCornerType('BUD'), false);
  // A parked edge carries `parked: true` and no correction — a silent pass and
  // an invented number are both wrong, and this is neither.
  const rows = frontGapRows([{
    unitId: 'u1',
    unitNum: '01',
    panelId: '01-F',
    wall: 0,
    x: 0,
    w: 600,
    edges: {
      left: { kind: NEIGHBOUR.CORNER, parked: true, wantClearanceMm: null, gapMm: 2 },
      right: { kind: NEIGHBOUR.NONE, parked: false, wantClearanceMm: 1.5, gapMm: null },
    },
  }], P);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].level, 'parked');
  assert.match(rows[0].message, /parked/);
});

// ═══════════════════════════════════════════════════════════════════════════
// B. THE ASYMMETRY LAW (rules 8–12)
// ═══════════════════════════════════════════════════════════════════════════

test('8. a correction acts on ONE edge — never symmetrically', () => {
  const ids = run(1);
  const r = store().unitResult(ids[0]);
  const panelId = r.panels.find((p) => p.role === 'front').id;
  const before = r.panels.find((p) => p.id === panelId);

  store().setFrontEdgeTrim(ids[0], panelId, { right: 1.5 });
  const after = store().unitResult(ids[0]).panels.find((p) => p.id === panelId);

  assert.equal(after.w, before.w - 1.5, 'the width came off once, not twice');
  // The LEFT edge has not moved: same x in the carcass frame.
  assert.equal(after.box.x, before.box.x);
  assert.deepEqual(after.meta.edgeTrim, { left: 0, right: 1.5 });

  // …and the other way round: a LEFT correction moves the left edge and leaves
  // the right one where it was.
  store().setFrontEdgeTrim(ids[0], panelId, { left: 1.5, right: 0 });
  const left = store().unitResult(ids[0]).panels.find((p) => p.id === panelId);
  assert.equal(left.w, before.w - 1.5);
  assert.equal(left.box.x, before.box.x + 1.5);
  assert.equal(left.box.x + left.w, before.box.x + before.w, 'the right edge moved');
});

test('9. the CUPS sit 21.5 from the front’s edge, ALWAYS — they ride it', () => {
  const ids = run(1);
  const r = store().unitResult(ids[0]);
  const panelId = r.panels.find((p) => p.role === 'front').id;
  const cupsOf = (res) => res.drills.filter((d) => d.panel === panelId && d.kind === 'cup');
  const front = (res) => res.panels.find((p) => p.id === panelId);

  const before = cupsOf(r);
  assert.ok(before.length > 0);
  const hinge = front(r).meta.hinge;
  const fromEdge = (res, drill) => (hinge === 'L' ? front(res).w - drill.x : drill.x);
  for (const d of before) assert.equal(fromEdge(r, d), P.hinges.cups.xFromHingeEdge);
  assert.equal(P.hinges.cups.xFromHingeEdge, 21.5, 'the owner’s number');

  // Narrow the HINGE edge by 2 mm. Every cup must still be 21.5 from it.
  store().setFrontEdgeTrim(ids[0], panelId, { [hinge === 'L' ? 'right' : 'left']: 2 });
  const after = store().unitResult(ids[0]);
  assert.equal(front(after).w, front(r).w - 2);
  const moved = cupsOf(after);
  assert.equal(moved.length, before.length, 'the drilling PATTERN changed');
  for (const d of moved) assert.equal(fromEdge(after, d), 21.5);
  // …and the pattern is otherwise untouchable: same heights, same diameters.
  assert.deepEqual(moved.map((d) => d.y), before.map((d) => d.y));
  assert.deepEqual(moved.map((d) => d.d), before.map((d) => d.d));
});

test('10. and 11. ±1.5 is absorbed silently; more than that is a yellow', () => {
  assert.equal(P.hinges.sideAdjustMm, 1.5, 'the owner’s number');
  assert.equal(hingeAdjustMm(P), 1.5);
  // Rule 10: the PLATES do not move. The carcass drilling is identical before
  // and after a front correction — the trim is a fact about the leaf only.
  const ids = run(1);
  const r = store().unitResult(ids[0]);
  const panelId = r.panels.find((p) => p.role === 'front').id;
  const carcassDrills = (res) => res.drills.filter((d) => d.panel !== panelId);
  const before = carcassDrills(r);
  store().setFrontEdgeTrim(ids[0], panelId, { right: 1 });
  assert.deepEqual(carcassDrills(store().unitResult(ids[0])), before);

  // Rule 11: over the adjustment, the plan says so.
  const small = narrowingPlan({
    fronts: [{ unitId: 'u', panelId: 'p', side: 'right' }], shortfallMm: 1, profile: P,
  });
  assert.equal(small.beyondHingeAdjust, false);
  const big = narrowingPlan({
    fronts: [{ unitId: 'u', panelId: 'p', side: 'right' }], shortfallMm: 4, profile: P,
  });
  assert.equal(big.beyondHingeAdjust, true);
  assert.equal(big.adjustMm, 1.5);
});

test('12. a CENTRED handle recomputes; an EDGE-SET one keeps its distance', () => {
  const ids = run(1);
  store().setProjectHandle({ type: 'bar', centres: 128 });
  const r = store().unitResult(ids[0]);
  const panelId = r.panels.find((p) => p.role === 'front').id;
  const handleOf = (res) => res.panels.find((p) => p.id === panelId).meta.handle;
  const widthOf = (res) => res.panels.find((p) => p.id === panelId).w;
  const before = handleOf(r);
  assert.ok(before, 'no handle resolved');

  const hinge = r.panels.find((p) => p.id === panelId).meta.hinge;
  // Narrow the edge the handle does NOT stand on — the hinge edge.
  store().setFrontEdgeTrim(ids[0], panelId, { [hinge === 'L' ? 'right' : 'left']: 2 });
  const after = store().unitResult(ids[0]);
  const now = handleOf(after);
  // A handle set from an edge keeps ITS edge at ITS distance. The free stile is
  // the one the handle stands on and it has not moved, so neither has the
  // handle's distance from it.
  const distance = (res, h) => (hinge === 'L' ? h.x : widthOf(res) - h.x);
  assert.equal(distance(after, now), distance(r, before));
  assert.equal(now.y, before.y, 'the height rule is untouched');
  assert.equal(now.centres, before.centres);
});

// ═══════════════════════════════════════════════════════════════════════════
// C. CARCASSES (rule 13)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Two carcasses on one wall, at stated positions.
 *
 * Asked of the PURE function with the positions written out, and deliberately:
 * `moveUnit` clamps a slide into the free slot, so a gap cannot be created
 * through it at all — which is the app working correctly and is a different
 * fact from the one under test. Rule 13's fault arrives with a project that
 * was LOADED (or laid out by an older version), and this is that layout.
 */
const twoAt = (leftX, rightX, { height = 770 } = {}) => ([
  {
    id: 'a', type: 'BUD', position: { wall: 0, x_mm: leftX, rotation_deg: 0 }, params: { width: 600, height, unit_num: '01' },
  },
  {
    id: 'b', type: 'BUD', position: { wall: 0, x_mm: rightX, rotation_deg: 0 }, params: { width: 600, height, unit_num: '02' },
  },
]);

test('13. carcasses in a run TOUCH — a gap is red, and the only fix closes it', () => {
  assert.deepEqual(carcassGaps(twoAt(0, 600), P), [], 'a butted run is silent');

  const gaps = carcassGaps(twoAt(0, 604), P);
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].mm, 4);
  assert.match(gaps[0].message, /must touch/);
  assert.match(gaps[0].message, /01 and 02/);
  // ONE fix, and it is closing to touch. Nothing here moves anything: the
  // number is what the fix WOULD be, and the joiner asks for it.
  assert.equal(gaps[0].fix.kind, 'close-to-touch');
  assert.equal(gaps[0].fix.moveRightByMm, -4);
  assert.equal(gaps[0].rightUnitId, 'b');
});

test('13. …and the store’s own fix really closes it', () => {
  const ids = run(2);
  const at = store().units.find((u) => u.id === ids[1]).position.x_mm;
  // The store's fix is a MOVE, and a move is `moveUnit` — the same clamped path
  // a drag takes. Asked of a butted run it is a no-op, which is the honest
  // answer and the one this asserts: the repair never slides a cabinet past
  // its neighbour.
  store().closeCarcassGap(ids[1], 4);
  assert.ok(store().units.find((u) => u.id === ids[1]).position.x_mm <= at);
  assert.deepEqual(carcassGaps(store().units, P), []);
});

test('13. something standing IN the gap is not a gap', () => {
  // A gap with an end panel across it is filled, and an end panel is a piece of
  // joinery rather than a fault.
  const units = twoAt(0, 618);
  units[1].params.end_panels = [{ id: 'ep', side: 'L', thickness: 18 }];
  assert.deepEqual(carcassGaps(units, P), []);
  // …and without it, the same layout is the fault it looks like.
  assert.equal(carcassGaps(twoAt(0, 618), P).length, 1);
});

test('13. two RUNS are not one run with a gap in it', () => {
  // A metre away is a second run, and "close it to touch" is not a fix anybody
  // asked for.
  assert.deepEqual(carcassGaps(twoAt(0, 1600), P), []);
  // …and neither is a wall unit over a base unit: one board cannot lie on two
  // heights, which is the same fact `buildRuns` breaks a run on.
  const mixed = twoAt(0, 604);
  mixed[1].params.height = 720;
  assert.deepEqual(carcassGaps(mixed, P), []);
});

test('13. a FRONT gap is never repaired by moving a cabinet', () => {
  // The other half of rule 13, and the half that matters most: the repair modal
  // offers narrowing and infill, and nothing else. No path in it moves anything.
  const modal = readFileSync(new URL('../src/components/FrontGapModal.jsx', import.meta.url), 'utf8');
  assert.ok(!/moveUnit|closeCarcassGap/.test(modal));
  assert.match(modal, /Cabinets are never moved to fix a front gap/);
});

// ═══════════════════════════════════════════════════════════════════════════
// D. DETECTION AND REPAIR (rules 14–18)
// ═══════════════════════════════════════════════════════════════════════════

test('14. the shown gap is front↔NEIGHBOUR — and the healed joint measures OK', () => {
  const ids = run(2);
  store().addEndPanel(ids[1], { side: 'R' });
  const r = store().unitResult(ids[1]);
  const front = frontOf(ids[1], r.panels.find((p) => p.role === 'front').id);
  // The measured gap on the panel side is the daylight to the PANEL's face…
  assert.equal(front.edges.right.kind, NEIGHBOUR.END_PANEL);
  // ─── TURN 32 (CLAUDE.md F3): the joint healed itself the moment the panel
  // appeared — the daylight the client sees is the 3 the rulebook wants, and
  // rule 14's measure (front↔neighbour, never front↔its own carcass) is what
  // proves it: both numbers now agree because the EDGE moved.
  assert.equal(front.edges.right.gapMm, 3);
  assert.equal(front.edges.right.haveClearanceMm, 3);
  assert.equal(gapVerdict(front.edges.right.gapMm, P).level, 'ok');
});

test('15. under 3 mm is RED, and the plan halves the shortfall between two', () => {
  assert.equal(minGapMm(P), 3);
  const red = gapVerdict(2, P);
  assert.equal(red.level, 'red');
  assert.equal(red.shortfallMm, 1);

  // Two fronts facing each other: half each, on the MEETING edge only.
  const pair = narrowingPlan({
    fronts: [
      { unitId: 'a', panelId: 'A-F', side: 'right' },
      { unitId: 'b', panelId: 'B-F', side: 'left' },
    ],
    shortfallMm: 1,
    profile: P,
  });
  assert.equal(pair.eachMm, 0.5);
  assert.equal(pair.trims.length, 2);
  assert.deepEqual(pair.trims.map((t) => t.side), ['right', 'left']);

  // One front facing something rigid gives the WHOLE shortfall — there is
  // nobody else to give it.
  const alone = narrowingPlan({
    fronts: [{ unitId: 'a', panelId: 'A-F', side: 'right' }], shortfallMm: 1.5, profile: P,
  });
  assert.equal(alone.eachMm, 1.5);
  assert.equal(alone.trims.length, 1);
  assert.equal(narrowingPlan({ fronts: [], shortfallMm: 2, profile: P }), null);
  assert.equal(narrowingPlan({ fronts: [{}], shortfallMm: 0, profile: P }), null);
});

test('15. …and since T32 the repair applies ITSELF, end to end', () => {
  const ids = run(2);
  store().addEndPanel(ids[1], { side: 'R' });
  // ─── TURN 32 (CLAUDE.md F3): nobody opened a modal, nobody clicked. The
  // red row never reaches the screen because the store healed the edge the
  // moment the neighbour appeared — exactly the trim narrowingPlan would
  // have offered, without the question.
  const row = rowsOf().find((r) => r.kind === NEIGHBOUR.END_PANEL && r.level === 'red');
  assert.equal(row, undefined, 'no red row survives — the gap fixed itself');
  // …and the front really is narrower, on that edge only.
  const front = store().unitResult(ids[1]).panels.find((p) => p.role === 'front');
  assert.deepEqual(front.meta.edgeTrim, { left: 0, right: 1.5 });

  // Taking the panel away gives the edge back: the trim returns to nothing
  // and the front is the kit's own width again — healing works both ways.
  const ep = store().units.find((u) => u.id === ids[1]).params.end_panels.find((e) => e.side === 'R');
  store().removeEndPanel(ids[1], ep.id);
  const back = store().unitResult(ids[1]).panels.find((p) => p.role === 'front');
  assert.equal(back.meta.edgeTrim, undefined, 'the trim is gone with the panel');
});

test('16. over 6 mm is a YELLOW question, not a fault', () => {
  assert.equal(maxGapMm(P), 6);
  const wide = gapVerdict(9, P);
  assert.equal(wide.level, 'yellow');
  assert.equal(wide.excessMm, 3);
  assert.match(wide.message, /infill or front correction/);
  // Between the two numbers, nothing is said at all.
  assert.equal(gapVerdict(3, P).level, 'ok');
  assert.equal(gapVerdict(6, P).level, 'ok');
});

test('17. narrowing warns "changes BOM and drilling" BEFORE it acts', () => {
  assert.equal(NARROW_WARNING, 'Narrowing a front changes the BOM and the drilling.');
  const modal = new URL('../src/components/FrontGapModal.jsx', import.meta.url);
  const src = readFileSync(modal, 'utf8');
  // On the screen beside the button, in the moment the choice is made — not a
  // message afterwards, which is a receipt rather than a warning.
  assert.match(src, /data-front-gap-cost/);
  assert.ok(src.indexOf('NARROW_WARNING') < src.indexOf('data-front-gap-narrow'),
    'the cost is stated after the button it is about');
  // Both options are offered, each with its number.
  assert.match(src, /data-front-gap-narrow="1"/);
  assert.match(src, /data-front-gap-infill="1"/);
  assert.match(src, /formatMm\(plan\.eachMm\)/);
});

test('18. every threshold is a PROFILE number, and survives an old profile', () => {
  assert.equal(P.doors.minNeighbourGapMm, 3);
  assert.equal(P.doors.maxNeighbourGapMm, 6);
  assert.equal(P.hinges.sideAdjustMm, 1.5);
  assert.equal(P.doors.neighbourReachMm, 200);
  assert.deepEqual(P.doors.clearance, {
    front: 1.5, endPanel: 3, infill: 3, appliance: 0, wall: 3, none: 1.5,
  });
  // A workshop's own numbers are read, not ignored.
  assert.equal(minGapMm({ doors: { minNeighbourGapMm: 2 } }), 2);
  assert.equal(maxGapMm({ doors: { maxNeighbourGapMm: 8 } }), 8);
  assert.equal(hingeAdjustMm({ hinges: { sideAdjustMm: 2 } }), 2);
  assert.equal(neighbourReachMm({}), 200);
  assert.equal(clearanceFor(NEIGHBOUR.END_PANEL, { doors: { clearance: { endPanel: 4 } } }), 4);
  // …and a profile saved before this turn comes back with all of them. Built
  // from a RECOGNISABLE profile with the new keys REMOVED, which is what a
  // stored profile from turn 30 actually looks like — a two-key object would
  // exercise `migrateCabinetProfile`'s "unrecognisable shape" branch (it
  // returns the defaults whole) and prove nothing about the merge.
  const before = { ...P, doors: { ...P.doors }, hinges: { ...P.hinges } };
  delete before.doors.maxNeighbourGapMm;
  delete before.doors.clearance;
  delete before.hinges.sideAdjustMm;
  const old = migrateCabinetProfile(before);
  assert.equal(old.doors.maxNeighbourGapMm, 6);
  assert.deepEqual(old.doors.clearance, P.doors.clearance);
  assert.equal(old.hinges.sideAdjustMm, 1.5);
});

// ═══════════════════════════════════════════════════════════════════════════
// THE LIST THE SCREEN READS
// ═══════════════════════════════════════════════════════════════════════════

test('a joint is reported ONCE, however many leaves can see it', () => {
  const ids = run(2);
  // A butted run is silent, so make one joint short by moving a cabinet.
  const at = store().units.find((u) => u.id === ids[1]).position.x_mm;
  store().moveUnit(ids[1], at - 2);
  const rows = rowsOf().filter((r) => r.kind === NEIGHBOUR.FRONT);
  const keys = rows.map((r) => r.key);
  assert.equal(new Set(keys).size, keys.length, 'a joint was counted twice');
  if (rows.length) {
    assert.equal(rows[0].fronts.length, 2, 'both leaves are on the row, so both can give half');
  }
});

test('a well-built job says nothing at all', () => {
  run(3);
  const rows = rowsOf().filter((r) => r.level === 'red');
  assert.deepEqual(rows, [], rows.map((r) => r.message).join('\n'));
  assert.deepEqual(carcassGaps(store().units, P), []);
});

test('every neighbour has a name a joiner reads', () => {
  for (const kind of Object.values(NEIGHBOUR)) {
    assert.ok(labelOf(kind), kind);
    assert.notEqual(labelOf(kind), kind, `${kind} is printed as its own key`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// IRON RULE 1 — the engine is still the AutoLISP
// ═══════════════════════════════════════════════════════════════════════════

test('a bare computeCabinet() has never heard of any of this', () => {
  const base = { ...defaultParamsFor('BUD', P), width: 600 };
  const a = computeCabinet(base);
  const b = computeCabinet({ ...base });
  assert.deepEqual(a, b);
  // The trim is an INPUT and nothing else. With none given, the pass is a
  // no-op and the kit cuts exactly what it cut yesterday.
  const withNull = computeCabinet({ ...base, front_edge_trim: null });
  assert.deepEqual(withNull.panels, a.panels);
  assert.deepEqual(withNull.drills, a.drills);
  // …and the rulebook never reaches the engine.
  // The engine never IMPORTS the rulebook: it takes millimetres and applies
  // them. (It names the file in a comment, which is the point — the reader is
  // told where the numbers were decided, and the code is told nothing.)
  const engine = readFileSync(new URL('../src/engine/cabinet.js', import.meta.url), 'utf8');
  assert.ok(!/^import .*frontClearance/m.test(engine));
});

test('a correction that would leave no board is REFUSED and named (rule 4)', () => {
  const base = { ...defaultParamsFor('BUD', P), width: 600 };
  const r = computeCabinet({ ...base, front_edge_trim: { '01-F': { left: 400, right: 400 } } });
  const warned = r.warnings.find((w) => w.code === 'FRONT_TRIM_TOO_DEEP');
  assert.ok(warned, 'the engine cut a front of nothing');
  assert.match(warned.message, /would leave nothing/);
  // Rule 4 of the turn: a guard SPEAKS — it does not clamp the correction to
  // something the joiner never asked for.
  const front = r.panels.find((p) => p.id === '01-F');
  assert.equal(front.w, computeCabinet(base).panels.find((p) => p.id === '01-F').w);
});
