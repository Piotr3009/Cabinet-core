// ─── Turn 15, F6: the infill corner is a MITRE (BACKLOG #51 activated) ──────
//
// Owner: "the side infill still meets the top infill SQUARE."
//
// Where a vertical filler runs up past the units and the horizontal filler over
// them stops against it, the two are the legs of a FRAME standing in one plane —
// the door plane, the plane the end panels are in too. A frame corner is
// mitred. Turn 8 gave the top infill's own corners their 45° ("mitra w
// geometrii NA PASKACH") and #51 parked the vertical member deliberately; this
// is the activation, and it is an extension of the same maths rather than a
// fork of it.
//
// THE ONE CNC DELTA OF THIS TURN lives here: the side infill's part OUTLINE
// gains its 45° corner. Its cut size does not move — the piece is still
// `width × height`, because the outer edge runs full height and only the inner
// one is cut back — which is exactly what a mitre is. The top infill's face
// runs to its LONG POINT over the same corner, which is the other half of the
// same joint.
//
// What is NOT here, deliberately: the arm. Turn 6 describes arm A as SCREWED to
// the carcass side and #51 says in as many words that a screwed joint is not a
// mitre. It still is not.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { chamferedRectGeometry } from '../src/engine/puzzle.js';
import { infillCornerMitre } from '../src/engine/runs.js';
import { infillMitre, infillSolid } from '../src/engine/mitre.js';
import { useProjectStore, paramsForEngine } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();

// ─── The rule, as arithmetic ────────────────────────────────────────────────

test('a 45° needs a corner, a flush finish and room to cut it', () => {
  const flushEnd = (over) => ({
    kind: 'infill', blockedBy: 'u1', blockerWidth: over, blockerTop: 2400,
  });

  // The plain case: a 100 mm gap over the units, a 120 mm filler beside them,
  // both finishing at 2400. One 45°, 100 mm on each leg.
  assert.equal(infillCornerMitre(flushEnd(120), 100, 2400, 2), 100);
  // Exactly enough is enough: the cut runs corner to corner across the filler.
  assert.equal(infillCornerMitre(flushEnd(100), 100, 2400, 2), 100);
  // …and one millimetre short of enough is a butt. A 45° that runs off the far
  // edge of the piece is not a mitre, it is a mistake.
  assert.equal(infillCornerMitre(flushEnd(99), 100, 2400, 2), 0);

  // NOT FLUSH is not a corner at all. A filler standing 200 mm proud of a 40 mm
  // strip is a T-junction; mitring it would cut a 45° into the filler nowhere
  // near the piece it is supposed to be joining.
  assert.equal(infillCornerMitre({ ...flushEnd(120), blockerTop: 2600 }, 100, 2400, 2), 0);

  // A filler the element merely RUNS OVER on its way to the wall is a lap, not
  // a corner — `runEnd` case 3, which carries no `blockedBy`.
  assert.equal(infillCornerMitre({ kind: 'infill', blockerWidth: 120, blockerTop: 2400 }, 100, 2400, 2), 0);
  // And nothing else makes this corner: a wall, an end panel, an open end.
  for (const kind of ['wall', 'end-panel', 'open']) {
    assert.equal(infillCornerMitre({ ...flushEnd(120), kind }, 100, 2400, 2), 0);
  }
});

// ─── The outline ───────────────────────────────────────────────────────────

test('a chamfered rectangle is a rectangle until a corner is asked for', () => {
  // The un-mitred answer is the SAME four points rectGeometry returns, which is
  // what keeps this turn's CNC delta to the pieces that are genuinely mitred.
  assert.deepEqual(
    chamferedRectGeometry(600, 250).outline,
    [[0, 0], [600, 0], [600, 250], [0, 250]],
  );
  // One corner, 45°, equal legs.
  assert.deepEqual(
    chamferedRectGeometry(100, 2350, { tr: 100 }).outline,
    [[0, 0], [100, 0], [100, 2250], [0, 2350]],
  );
  // …and the mirror of it, for a filler on the other side of the run.
  assert.deepEqual(
    chamferedRectGeometry(100, 2350, { tl: 100 }).outline,
    [[0, 0], [100, 0], [100, 2350], [0, 2250]],
  );
  // A cut as long as the side leaves no zero-length edge behind: a duplicated
  // vertex is a degenerate polyline and some CAM packages refuse the file.
  const square = chamferedRectGeometry(100, 100, { bl: 100 }).outline;
  assert.equal(square.length, 3, 'a square with a full-corner mitre is a triangle');
  for (let i = 0; i < square.length; i += 1) {
    const next = square[(i + 1) % square.length];
    assert.ok(Math.hypot(square[i][0] - next[0], square[i][1] - next[1]) > 1e-6, 'no zero-length edge');
  }
});

// ─── End to end, through the store and the engine ──────────────────────────

const CEILING = 2350;
const WALL = 5000;

/** A run of two talls against the left wall, with a 100 mm scribe filler. */
function mitredRun() {
  store().loadProject({
    id: null,
    name: 't15-f6',
    room: migrateRoom({ height: CEILING, corners: rectCorners(WALL, 3000) }),
    design: { infill: { sideWidth: 100 } },
  }, []);
  const a = store().addUnit('BUDTALL').id;
  store().moveUnit(a, -WALL, 0);
  store().addUnit('BUDTALL');
  store().addTopInfill(a);
  store().fillToCeiling(a);
  store().sideInfillToCeiling(a, 'L');
  return a;
}

const panelsOf = (id) => computeCabinet(paramsForEngine(store().units.find((u) => u.id === id)), P).panels;
const byId = (id, panelId) => panelsOf(id).find((p) => p.id === panelId);

test('THE FIX: the corner is one 45° plane, cut into both pieces', () => {
  const a = mitredRun();
  const unit = store().units.find((u) => u.id === a);
  const run = unit.params.run_top_infill;
  const m = run.mitre.left;
  assert.ok(m > 0, 'the corner is mitred');
  assert.equal(m, run.faceH, 'the mitre is the top infill\'s own height — equal legs, 45°');
  assert.equal(unit.params.run_top_infill.sideMitre.left, m, 'the filler is told about its own corner');

  const face = byId(a, 'INFILL-T-FACE');
  const filler = byId(a, 'INFILL-L-FACE');

  // The two 45° cuts are the SAME line in the unit's own frame, which is what
  // makes this a joint rather than two pieces ending near each other.
  //
  //   the filler's cut runs   (x = 0,  y = H)      → (x = −m, y = H + m)
  //   the face's cut runs     (x = −m, y = H + m)  → (x = 0,  y = H)
  const H = face.box.y;
  const fillerPts = filler.cnc.outline.map(([x, y]) => [filler.box.x + x, filler.box.y + y]);
  const facePts = face.cnc.outline.map(([x, y]) => [face.box.x + x, face.box.y + y]);
  const has = (pts, x, y) => pts.some(([px, py]) => Math.abs(px - x) < 1e-6 && Math.abs(py - y) < 1e-6);

  assert.ok(has(fillerPts, 0, H), 'the filler comes to the inner corner');
  assert.ok(has(fillerPts, -m, H + m), 'and runs 45° out to its outer edge');
  assert.ok(has(facePts, 0, H), 'the face comes to the same inner corner');
  assert.ok(has(facePts, -m, H + m), 'from the same outer point');
});

test('the filler is CUT to the same size — only its outline moves', () => {
  const a = mitredRun();
  const filler = byId(a, 'INFILL-L-FACE');
  const width = store().units.find((u) => u.id === a).params.side_infill_left_mm;

  // T47-F4: the CUT piece is the gap plus the scribe allowance on its WALL
  // edge, and the MITRE keeps its long point — which is the whole of "the
  // mitre is a JOINT, not an allowance". The outline grows away from the
  // corner, so the corner has not moved at all (the test above measures it).
  const OVER = P.autoParts.fillerOversize;
  assert.equal(filler.w, width + OVER, 'the cut piece is the gap plus the scribe');
  assert.equal(filler.box.w, width, 'and the piece that stands in the room is the gap');
  assert.deepEqual(filler.meta.oversize, { mm: OVER, edge: 'left', nominal: width });
  const xs = filler.cnc.outline.map(([x]) => x);
  const ys = filler.cnc.outline.map(([, y]) => y);
  assert.equal(Math.min(...xs), -OVER, 'the allowance hangs off the WALL end');
  assert.equal(Math.max(...xs), width, 'and the inner edge is exactly where it was');
  assert.equal(Math.max(...xs) - Math.min(...xs), filler.w, 'the outline still spans the full width');
  assert.equal(Math.max(...ys) - Math.min(...ys), filler.h, '…and the full height');
  // THE DELTA: it is no longer a rectangle.
  // FIVE points now, not four: the 100 mm chamfer used to eat the whole 100 mm
  // width and left a triangle; with the 20 hanging off the wall end there is a
  // square 20 beyond it. The MITRE ITSELF has not moved — its long point is
  // still (width, h − m) and its short point still (0, h), in the piece's own
  // frame — which is the claim, and the joint test above measures it in the
  // room's frame.
  assert.equal(filler.cnc.outline.length, 5);
  const m = store().units.find((u) => u.id === a).params.run_top_infill.sideMitre.left;
  const has = (x, y) => filler.cnc.outline.some(([px, py]) => Math.abs(px - x) < 1e-6 && Math.abs(py - y) < 1e-6);
  assert.ok(has(width, filler.h - m), 'the mitre\'s long point is where it always was');
  assert.ok(has(width - m, filler.h), 'and so is its short point');
  assert.notDeepEqual(filler.cnc.outline, [[0, 0], [filler.w, 0], [filler.w, filler.h], [0, filler.h]]);
  assert.deepEqual(filler.meta.mitre_45, ['end']);
});

test('the top infill face runs to its LONG POINT over the corner', () => {
  const a = mitredRun();
  const unit = store().units.find((u) => u.id === a);
  const run = unit.params.run_top_infill;
  const face = byId(a, 'INFILL-T-FACE');

  assert.equal(face.w, run.length + run.mitre.left + run.mitre.right,
    'the long edge carries on over the corner; the short one stops at the filler');
  assert.equal(face.box.x, run.offset - run.mitre.left);
  // The SHELF is not extended. It runs back at the ceiling and lands on top of
  // the filler's own return arm; extending it would put two pieces of board in
  // the same 18 mm.
  assert.equal(byId(a, 'INFILL-T-SHELF').w, run.length);
});

test('the ARM is still screwed on, and still refuses the cut (#51)', () => {
  const a = mitredRun();
  const arm = byId(a, 'INFILL-L-ARM');
  assert.ok(arm, 'the L still has its return arm');
  assert.equal(infillMitre(arm), null, 'a screwed joint is not a mitre');
  assert.deepEqual(arm.cnc.outline.length, 4, 'and its outline is untouched');
});

test('a run with no such corner cuts exactly what it cut before', () => {
  // The guard on the CNC delta: nothing but the mitred corner moves. A solo
  // cabinet has no run information at all and closes itself, which is the case
  // every existing fixture and every fingerprint row is built from.
  const solo = computeCabinet({
    type: 'BUDTALL', width: 600, unit_num: '01', top_infill_mm: 100, side_infill_left_mm: 120,
  }, P);
  const face = solo.panels.find((p) => p.id === 'INFILL-T-FACE');
  const filler = solo.panels.find((p) => p.id === 'INFILL-L-FACE');
  // T47-F4: every infill leaves the machine 20 over on the edge it is scribed
  // to — the CEILING for the top face, the WALL for the side filler — and the
  // rest of the outline is exactly what it was. That is this turn's one named
  // infill delta and it is the same 20 on every piece.
  const OVER = P.autoParts.fillerOversize;
  assert.deepEqual(face.cnc.outline, [[0, 0], [600, 0], [600, 100 + OVER], [0, 100 + OVER]]);
  assert.equal(filler.cnc.outline.length, 4);
  assert.deepEqual(filler.cnc.outline,
    [[-OVER, 0], [120, 0], [120, filler.h], [-OVER, filler.h]]);
  assert.equal(filler.meta.mitre_45, undefined);
});

// ─── …and the solid the eye sees ───────────────────────────────────────────

test('the mitred filler is a closed solid, not an open box', () => {
  const a = mitredRun();
  const solid = infillSolid(byId(a, 'INFILL-L-FACE'));
  assert.ok(solid, 'the vertical member takes a mitre now');
  // Every edge of a closed polyhedron is shared by exactly two faces. An open
  // solid renders as a hole you can see the wall through, which is worse than
  // the butt joint this replaces.
  const edges = new Map();
  for (const face of solid.faces) {
    for (let i = 0; i < face.length; i += 1) {
      const key = [face[i], face[(i + 1) % face.length]].sort((x, y) => x - y).join('-');
      edges.set(key, (edges.get(key) || 0) + 1);
    }
  }
  for (const [key, count] of edges) assert.equal(count, 2, `edge ${key} is used ${count} times`);
});
