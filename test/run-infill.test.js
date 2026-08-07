// ─── L-shaped infills, and one top piece per RUN (turn 6, CLAUDE.md F4) ───
//
// BACKLOG #20 has been open since turn 4 with "for now a plain strip (Piotr's
// decision)" against it. This is the realisation, and it is two changes:
//
//   the vertical filler is an L — arm B closing the gap in the plane of the
//   doors, arm A screwed to the carcass side and running back;
//
//   the top infill is ONE CONTINUOUS ELEMENT FOR A WHOLE RUN, in section a
//   40 mm face and an 80 mm shelf mitred at 45°, and it finishes in one of four
//   ways depending on what is at the end of the run.
//
// The four end conditions are the reason this file is long. They are not
// variants of one another — a wall, a filler, a panel already at the ceiling
// and NOTHING AT ALL are four different pieces of joinery, and the fourth one
// (turn the corner and run back to the wall, mitred like a picture frame) is
// the one nobody would guess from the other three.

import test from 'node:test';
import assert from 'node:assert/strict';

import { useProjectStore, paramsForEngine } from '../src/stores/projectStore.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { buildRuns, paddedSpan, runEnd, unitTop } from '../src/engine/runs.js';
import { buildBom } from '../src/engine/bom.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();
const WALL = 4000;
const CEILING = 2500;
const T = P.autoParts.topInfill;
const SI = P.autoParts.sideInfill;

function project(infillWidth = 20) {
  store().loadProject({
    id: null,
    name: 'runs',
    room: migrateRoom({ height: CEILING, corners: rectCorners(WALL, 3000) }),
    design: { infill: { sideWidth: infillWidth } },
  }, []);
}

const unitOf = (id) => store().units.find((u) => u.id === id);
const resultOf = (id) => computeCabinet(paramsForEngine(unitOf(id)), P);
const panelOf = (id, panelId) => resultOf(id).panels.find((p) => p.id === panelId);
const infillsOf = (id) => resultOf(id).panels.filter((p) => p.part === 'INFILL');

// TALL units, not base ones (turn 8, CLAUDE.md F2.7): a top infill closes the
// gap between a cabinet and the CEILING, and what sits on top of a base unit is
// a worktop. The piece is identical whichever kit is under it — only the kits
// that can have one at all have changed.
const TYPE = 'BUDTALL';

/** Place `n` tall units butted together, starting at `x`, and give them a top infill. */
function run(n, x = 1000) {
  const ids = [];
  for (let i = 0; i < n; i += 1) {
    const { id, error } = store().addUnit(TYPE);
    assert.equal(error, null, error || '');
    store().moveUnit(id, x + i * 600, 0);
    ids.push(id);
  }
  for (const id of ids) store().addTopInfill(id);
  return ids;
}

// ─── the run itself ───

test('cabinets butted along one wall are ONE run; a gap breaks it', () => {
  project();
  const ids = run(3, 1000);
  let runs = buildRuns(store().units, P);
  assert.equal(runs.length, 1, 'three butted units are one run');
  assert.equal(runs[0].units.length, 3);
  assert.equal(runs[0].left, 1000);
  assert.equal(runs[0].right, 2800);

  // Drive the last one away and the run splits in two.
  store().moveUnit(ids[2], 3200, 0);
  runs = buildRuns(store().units, P);
  assert.equal(runs.length, 2);
  assert.deepEqual(runs.map((r) => r.units.length).sort(), [1, 2]);
});

test('a different HEIGHT is a different run — one board cannot lie on two levels', () => {
  project();
  const ids = run(2, 1000);
  assert.equal(buildRuns(store().units, P).length, 1);
  store().updateUnitParams(ids[1], { height: 900 });
  assert.equal(buildRuns(store().units, P).length, 2, 'the taller one is on its own');
});

test('a turned unit is nobody’s run — it has no "along the wall" to share', () => {
  project();
  const ids = run(2, 1000);
  store().rotateUnit(ids[1], 'side', 90);
  const runs = buildRuns(store().units, P);
  assert.equal(runs.length, 1);
  assert.equal(runs[0].units.length, 1);
});

// ─── ONE element, not one per cabinet ───

test('a run of three carries ONE top infill, on the first unit, spanning all three', () => {
  project();
  const ids = run(3, 1000);

  const owner = infillsOf(ids[0]).filter((p) => p.meta.segment === 'main');
  assert.equal(owner.length, 2, 'a face and a shelf — the two strips of the L');
  const face = panelOf(ids[0], 'INFILL-T-FACE');
  const shelf = panelOf(ids[0], 'INFILL-T-SHELF');

  // Both ends are open in the middle of a 4 m wall, so the element finishes
  // flush with the outside of the run: 3 × 600.
  assert.equal(face.w, 1800, 'ONE piece for the whole run, not three of 600');
  assert.equal(shelf.w, 1800);

  // …and the other two cabinets carry nothing at all.
  for (const id of ids.slice(1)) {
    assert.equal(infillsOf(id).filter((p) => p.meta.side === 'top').length, 0,
      'a unit under the run’s own piece must not emit a second one');
  }

  // Which is also what the cut list says: one row, not three.
  const bom = buildBom(store().units.map((u) => ({ unit: u, result: computeCabinet(paramsForEngine(u), P) })));
  const faces = bom.units.flatMap((u) => u.rows).filter((r) => r.id === 'INFILL-T-FACE');
  assert.equal(faces.length, 1);
  assert.equal(faces[0].w, 1800);
});

test('the section is an L: a 40 face and an 80 shelf, mitred at 45°', () => {
  project();
  const ids = run(2, 1000);
  const face = panelOf(ids[0], 'INFILL-T-FACE');
  const shelf = panelOf(ids[0], 'INFILL-T-SHELF');
  const unit = unitOf(ids[0]);

  assert.equal(face.h, T.defaultHeight, 'the face is the height a workshop calls "40"');
  assert.equal(shelf.h, T.shelfDepth, 'and the shelf is the horizontal leg');

  // The face stands ON the units and finishes in the plane of the DOORS — the
  // same plane the end panel and the vertical filler finish in (F3/F4).
  const doorFace = unit.params.depth + P.doors.gap + unit.params.front_t;
  assert.equal(face.box.y, unit.params.height);
  assert.equal(face.box.z + face.box.d, doorFace);

  // The shelf hangs off the TOP of the face and runs back into the room.
  assert.equal(shelf.box.y + shelf.box.h, face.box.y + face.h, 'the two meet at the top corner');
  assert.equal(shelf.box.z + shelf.box.d, face.box.z, 'and behind the face, not in front of it');
  assert.equal(shelf.box.d, T.shelfDepth);

  // The mitre is a FLAG on the piece, which is what the workshop needs on the
  // sheet (CLAUDE.md F4: "paski z flagą mitre_45 na właściwych krawędziach").
  assert.ok(face.meta.mitre_45.includes('long'));
  assert.ok(shelf.meta.mitre_45.includes('long'));
});

// ─── the four end conditions ───

const endsOf = (id) => panelOf(id, 'INFILL-T-FACE').meta.ends;

test('END 1 — the run reaches the WALL, and finishes on it', () => {
  project(0);                       // no scribe gap: the unit parks flush
  const ids = run(2, 0);
  store().moveUnit(ids[0], -5000, 0);
  store().moveUnit(ids[1], 600, 0);

  assert.equal(endsOf(ids[0]).left, 'wall');
  assert.equal(panelOf(ids[0], 'INFILL-T-FACE').box.x, 0, 'it starts at the wall');
  assert.equal(infillsOf(ids[0]).filter((p) => p.meta.segment === 'return-left').length, 0,
    'a wall needs no corner turned');
});

test('END 2 — the run reaches a vertical L-INFILL, and finishes on it', () => {
  project(40);
  const ids = run(2, 1000);
  store().moveUnit(ids[0], -5000, 0);          // parks at the stop, 40 from the wall
  store().moveUnit(ids[1], 40 + 600, 0);

  assert.equal(unitOf(ids[0]).params.side_infill_left_mm, 40, 'the filler is there');
  assert.equal(endsOf(ids[0]).left, 'infill');
  // It runs OVER the filler and out to the wall: the filler closes the gap, so
  // the line the eye follows is unbroken to the corner of the room.
  assert.equal(panelOf(ids[0], 'INFILL-T-FACE').box.x, -40);
  assert.equal(infillsOf(ids[0]).filter((p) => p.meta.segment === 'return-left').length, 0);
});

test('END 3 — an END PANEL already at the ceiling, and the run butts into it', () => {
  project();
  const ids = run(2, 1000);
  const { id: epId } = store().addEndPanel(ids[0], { side: 'L' });
  const before = panelOf(ids[0], 'INFILL-T-FACE');
  assert.equal(endsOf(ids[0]).left, 'open', 'a panel that stops at the unit changes nothing');
  assert.ok(before.box.x < 0, 'and the element covers the panel');

  store().endPanelToCeiling(ids[0], epId);
  assert.equal(endsOf(ids[0]).left, 'end-panel');
  // Butts into the panel's INNER face — the panel is the finished surface at
  // that end, and running the infill across its top would put a joint where
  // the eye is.
  assert.equal(panelOf(ids[0], 'INFILL-T-FACE').box.x, 0);
  assert.equal(infillsOf(ids[0]).filter((p) => p.meta.segment === 'return-left').length, 0);
});

test('END 4 — nothing at all: the corner is mitred and the piece turns it', () => {
  project();
  const ids = run(2, 1200);        // out in the middle of the wall, both ends open
  assert.deepEqual(endsOf(ids[0]), { left: 'open', right: 'open' });

  const unit = unitOf(ids[0]);
  const depth = unit.params.depth + P.doors.gap + unit.params.front_t;
  const main = panelOf(ids[0], 'INFILL-T-FACE');

  for (const [tag, side] of [['L', 'left'], ['R', 'right']]) {
    const face = panelOf(ids[0], `INFILL-T${tag}-FACE`);
    const shelf = panelOf(ids[0], `INFILL-T${tag}-SHELF`);
    assert.ok(face, `${side} return face`);
    assert.ok(shelf, `${side} return shelf`);

    // It runs along the SIDE of the end cabinet, back to the wall.
    assert.equal(face.w, depth, 'from the door face to the back wall');
    assert.equal(face.box.z, 0, 'and it reaches the wall');
    assert.equal(face.box.z + face.box.d, depth);
    assert.equal(face.h, T.defaultHeight, 'same section as the piece it turns off');
    assert.equal(shelf.w, depth);
    assert.equal(shelf.h, T.shelfDepth);

    // A picture-frame corner: 45° on the long edge (the L) AND on the end
    // where the two strips meet.
    assert.ok(face.meta.mitre_45.includes('end'), 'the return is mitred at the corner');
    assert.ok(main.meta.mitre_45.includes('end'), 'and so is the piece it meets');

    // The return's outer face is flush with the outside of the run — the two
    // strips meet on ONE corner, which is what makes the mitre close.
    const corner = side === 'left' ? main.box.x : main.box.x + main.box.w;
    const outer = side === 'left' ? face.box.x : face.box.x + face.box.w;
    assert.equal(outer, corner, `${side} return meets the main element on the corner`);
  }
});

test('one end open and one end walled gives one return, not two', () => {
  project(0);
  const ids = run(2, 0);
  store().moveUnit(ids[0], -5000, 0);
  store().moveUnit(ids[1], 600, 0);

  assert.deepEqual(endsOf(ids[0]), { left: 'wall', right: 'open' });
  const returns = infillsOf(ids[0]).filter((p) => p.meta.segment?.startsWith('return'));
  assert.equal(returns.length, 2, 'a face and a shelf, on the open end only');
  assert.ok(returns.every((p) => p.meta.segment === 'return-right'));
});

// ─── the vertical L ───

test('a gap wide enough takes an L: a face in the door plane, an arm on the carcass', () => {
  project(60);
  const { id } = store().addUnit(TYPE);
  store().moveUnit(id, -5000, 0);

  const unit = unitOf(id);
  assert.equal(unit.params.side_infill_left_mm, 60);

  const face = panelOf(id, 'INFILL-L-FACE');
  const arm = panelOf(id, 'INFILL-L-ARM');
  const t = P.board.thickness;
  const doorFace = unit.params.depth + P.doors.gap + unit.params.front_t;

  // Arm B: closes the gap, flush with the doors.
  assert.equal(face.w, 60, 'the width of the gap it closes');
  assert.equal(face.box.x, -60);
  assert.equal(face.box.x + face.box.w, 0, 'up to the carcass side');
  assert.equal(face.box.z + face.box.d, doorFace, 'and in the plane of the doors');

  // Arm A: against the carcass side, behind the face, running back.
  assert.equal(arm.w, SI.returnDepth);
  assert.equal(arm.box.x, -t, 'hard against the carcass side');
  assert.equal(arm.box.x + arm.box.w, 0);
  assert.equal(arm.box.z + arm.box.d, face.box.z, 'immediately behind arm B');
  assert.equal(arm.box.d, SI.returnDepth);

  // Both run floor to top of carcass.
  for (const p of [face, arm]) {
    assert.equal(p.box.y, -P.baseUnit.legHeight, 'to the floor, past the legs');
    assert.equal(p.h, unit.params.height + P.baseUnit.legHeight);
  }
  assert.equal(face.meta.shape, 'L');
});

test('a gap too narrow for the board stays a plain strip, and says so', () => {
  project(12);
  const { id } = store().addUnit(TYPE);
  store().moveUnit(id, -5000, 0);

  const face = panelOf(id, 'INFILL-L-FACE');
  assert.equal(face.w, 12);
  assert.equal(face.meta.shape, 'strip');
  assert.equal(panelOf(id, 'INFILL-L-ARM'), undefined,
    'an 18 mm return does not go into a 12 mm gap, and pretending otherwise is a part that cannot be made');
});

test('a vertical filler can be pulled to the ceiling like an end panel', () => {
  project(60);
  const { id } = store().addUnit(TYPE);
  store().moveUnit(id, -5000, 0);
  const unit = unitOf(id);
  const headroom = CEILING - (unit.params.height + P.baseUnit.legHeight);
  // Somewhere short of the ceiling — read off the room rather than written down,
  // because the unit is a TALL one now (turn 8, F2.7) and there is less air
  // above it than there was above a base unit.
  const partWay = headroom - 50;

  assert.equal(store().setSideInfillTop(id, 'L', partWay), partWay);
  assert.equal(panelOf(id, 'INFILL-L-FACE').h, unit.params.height + P.baseUnit.legHeight + partWay);
  assert.equal(panelOf(id, 'INFILL-L-ARM').h, unit.params.height + P.baseUnit.legHeight + partWay,
    'both arms of one L are one height');

  assert.equal(store().sideInfillToCeiling(id, 'L'), headroom);
  assert.equal(panelOf(id, 'INFILL-L-FACE').h, CEILING, 'floor to ceiling in one piece');
  assert.equal(store().setSideInfillTop(id, 'L', 99999), headroom, 'and no further');
});

// ─── everything reaches the cut list ───

test('every strip of both Ls is in the BOM as front material, with its mitres', () => {
  project(60);
  const ids = run(2, 1200);
  store().moveUnit(ids[0], -5000, 0);
  store().moveUnit(ids[1], 60 + 600, 0);

  const entries = store().units.map((u) => ({ unit: u, result: computeCabinet(paramsForEngine(u), P) }));
  const bom = buildBom(entries);
  const rows = bom.units.flatMap((u) => u.rows).filter((r) => r.role === 'infill');

  // Left end walled by its own filler; right end open, so it turns the corner.
  const ids2 = rows.map((r) => r.id).sort();
  assert.deepEqual(ids2, [
    'INFILL-L-ARM', 'INFILL-L-FACE',
    'INFILL-T-FACE', 'INFILL-T-SHELF',
    'INFILL-TR-FACE', 'INFILL-TR-SHELF',
  ]);

  for (const r of rows) {
    assert.equal(r.material_role, 'front', `${r.id} is cut from the front sheet (CLAUDE.md F4)`);
    assert.ok(r.w > 0 && r.h > 0, `${r.id} has a real size`);
  }

  const csv = entries.flatMap((e) => e.result.csvLines);
  assert.equal(csv.filter((l) => /,INFILL-T-FACE,/.test(l)).length, 1, 'one long piece, one cut-list row');
});

// ─── the pieces of engine/runs.js a test can hold on its own ───

test('runEnd reads the four conditions off the room, in the order CLAUDE.md lists them', () => {
  project();
  const ids = run(1, 1000);
  const only = { units: [unitOf(ids[0])], top: unitTop(unitOf(ids[0]), P), left: 1000, right: 1600 };
  const at = (side, roomHeight = CEILING) => runEnd(only, side, { wallWidth: WALL, roomHeight }, P).kind;

  assert.equal(at('left'), 'open');
  assert.equal(at('right'), 'open');

  // A ceiling BELOW the unit leaves no headroom, so no end panel can reach it —
  // and the check must not divide by that or report a phantom 'end-panel'.
  only.units[0].params.end_panels = [{ id: 'e', side: 'L', height: 'floor', top_mm: 0 }];
  assert.equal(at('left', 100), 'open');
});

test('paddedSpan counts the end panels a run has to reach past', () => {
  project();
  const ids = run(1, 1000);
  assert.deepEqual(paddedSpan(unitOf(ids[0])), { left: 1000, right: 1600, pad: { left: 0, right: 0 } });
  store().addEndPanel(ids[0], { side: 'R' });
  const span = paddedSpan(unitOf(ids[0]));
  assert.equal(span.right, 1600 + P.front.thickness);
});
