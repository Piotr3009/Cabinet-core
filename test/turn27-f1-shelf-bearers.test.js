// ─── TURN 27 F1 — a shelf drills the two boards that carry it ───────────────
//
// The owner, from the eye test: a shelf running from BUR to a partition gets
// its ⌀7.5 holes bored in **BUL** — a board that shelf never touches. And its
// dimension chain measures the whole cabinet instead of the bay it sits in.
//
// Five facts are proved here, in the order CLAUDE.md states them:
//
//   F1.1  BEARERS, NOT SIDES. The two pieces that actually carry the shelf —
//         side/side, side/partition or partition/partition — take the pins and
//         the joint, and nothing else does.
//   F1.2  EACH BEARER IN ITS OWN FRAME. A partition's CNC origin is its own
//         bottom edge, so its hole heights are the shelf's world height minus
//         whatever it stands above — on every hole.
//   F1.3  DIMENSIONS FOLLOW THE BAY. Bearer face to bearer face, not the full
//         internal width, in the same component and the same look (R11, R12).
//   F1.4  A CABINET WITH NO PARTITION IS BYTE-IDENTICAL — the correction is a
//         correction and not a new class.
//   F1.5  BOTH TWO-PARTITION CASES: the shelf in the middle bay and the shelf
//         in an end bay.

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { pieceHoverRows } from '../src/engine/hoverRows.js';
import {
  bearerList, bearingWalls, heightOnBearer, pinColumns, shelfBay, shelfBearers,
} from '../src/engine/shelfBearers.js';

const SH = P.shelfHoles;

/** A base unit with whatever is put in it. */
const unit = (items, params = {}) => computeCabinet({
  ...defaultParamsFor('BUD', P),
  unit_num: '01',
  ...params,
  ...(items ? { sections: [{ width_mm: params.width ?? 600, items }] } : {}),
}, P);

const shelfHoles = (r, panelId) => r.drills
  .filter((d) => d.panel === panelId && d.layer === SH.layer);

/** Every entity of any SHELF class this engine emits, on one panel. */
const shelfClassEntities = (r, panelId) => {
  const drills = r.drills.filter((d) => d.panel === panelId
    && (d.kind === 'shelf' || d.kind === 'shelf_screw' || d.kind === 'shelf_back_screw'));
  const panel = r.panels.find((p) => p.id === panelId);
  const marks = (panel?.cnc?.marks || []);
  return { drills, marks };
};

// ─── F1.1 — the two boards that carry it ────────────────────────────────────

test('F1.1 a shelf between BUR and a partition drills BUR and the partition — never BUL', () => {
  const r = unit([
    { id: 'p1', kind: 'partition', x_mm: 450 },
    { id: 's1', kind: 'shelf', pos_mm: 400, zone: 1 },
  ], { width: 900 });

  const part = r.panels.find((p) => p.part === 'VPART');
  assert.ok(part, 'the partition is there');

  // THE OWNER'S OWN SYMPTOM: no entity of any shelf class lands on BUL.
  const bul = shelfClassEntities(r, 'BUL');
  assert.equal(bul.drills.length, 0, 'BUL takes nothing — the shelf never touches it');
  assert.equal(bul.marks.length, 0, 'and no set-out either');

  // …and the two boards it DOES touch each carry the full ladder.
  const perRow = SH.clusterOffsets.length * 2;   // three holes, two columns
  assert.equal(shelfHoles(r, 'BUR').length, perRow, 'BUR takes its ladder');
  assert.equal(shelfHoles(r, part.id).length, perRow, '…and so does the partition');
});

test('F1.1 the mirror case — a shelf between BUL and a partition leaves BUR bare', () => {
  const r = unit([
    { id: 'p1', kind: 'partition', x_mm: 450 },
    { id: 's1', kind: 'shelf', pos_mm: 400, zone: 0 },
  ], { width: 900 });
  const part = r.panels.find((p) => p.part === 'VPART');
  assert.equal(shelfClassEntities(r, 'BUR').drills.length, 0, 'BUR takes nothing');
  const perRow = SH.clusterOffsets.length * 2;
  assert.equal(shelfHoles(r, 'BUL').length, perRow);
  assert.equal(shelfHoles(r, part.id).length, perRow);
});

test('F1.1 the resolver names the PAIR, and the pair is the shelf’s own run', () => {
  const r = unit([
    { id: 'p1', kind: 'partition', x_mm: 450 },
    { id: 's1', kind: 'shelf', pos_mm: 400, zone: 1 },
  ], { width: 900 });
  const shelf = r.panels.find((p) => p.part === 'SHELF');
  const walls = bearingWalls(r.panels);
  assert.deepEqual(walls.map((w) => w.kind), ['side', 'partition', 'side']);
  const pair = shelfBearers({
    walls, run: shelf.meta.run, level: shelf.box.y, tolerance: P.carcass.shelfWidthClearance,
  });
  assert.equal(pair.left.kind, 'partition');
  assert.equal(pair.right.id, 'BUR');
  assert.equal(bearerList(pair).length, 2, 'two bearers, always');
});

// ─── F1.2 — each bearer in its own frame ────────────────────────────────────

test('F1.2 the partition’s hole heights are the shelf’s height minus its own base', () => {
  const r = unit([
    { id: 'p1', kind: 'partition', x_mm: 450 },
    { id: 's1', kind: 'shelf', pos_mm: 400, zone: 1 },
  ], { width: 900 });
  const part = r.panels.find((p) => p.part === 'VPART');
  const G = r.params.board_t;
  assert.equal(part.box.y, G, 'a full-height partition stands one board up');

  const world = SH.clusterOffsets.map((dy) => 400 + dy).sort((a, b) => a - b);
  const onSide = [...new Set(shelfHoles(r, 'BUR').map((d) => d.y))].sort((a, b) => a - b);
  const onPart = [...new Set(shelfHoles(r, part.id).map((d) => d.y))].sort((a, b) => a - b);

  assert.deepEqual(onSide, world, 'a SIDE’s origin is the cabinet floor');
  assert.deepEqual(onPart, world.map((y) => y - part.box.y),
    'a PARTITION’s origin is its own bottom edge — out by one board otherwise');
  // …and the fault this describes, said as a number: every hole is wrong by
  // exactly the thickness of the bottom board when it is not converted.
  for (let i = 0; i < onPart.length; i += 1) assert.equal(onSide[i] - onPart[i], G);
});

test('F1.2 a partition that stops below the shelf is not carrying it, and is not bored', () => {
  // Turn 21's F9 law, read the other way round: a partition terminating on a
  // FIXED shelf runs floor-to-that-shelf and nothing above it. A shelf higher
  // up is not standing on it, so it does not drill it — the SPAN decides, not
  // the fact that the two boards share an x.
  const r = unit([
    { id: 's0', kind: 'shelf', pos_mm: 300, variant: 'fixed' },
    { id: 'p1', kind: 'partition', x_mm: 450 },
    { id: 's1', kind: 'shelf', pos_mm: 500, zone: 1 },
  ], { width: 900 });
  const part = r.panels.find((p) => p.part === 'VPART');
  assert.ok(part.box.y + part.box.h < 500, 'the partition really does stop short');
  assert.equal(shelfHoles(r, part.id).length, 0, 'so it takes no pin ladder');
  // …and every hole this cabinet does bore lands ON the board it is bored in.
  for (const d of r.drills.filter((x) => x.layer === SH.layer)) {
    const panel = r.panels.find((p) => p.id === d.panel);
    assert.ok(d.y >= 0 && d.y <= panel.h, `${d.panel} hole at ${d.y} is on the board`);
  }
});

test('F1.2 the pin COLUMNS are each board’s own depth, not the side’s', () => {
  // A partition set back from the face is shallower than the sides, so its back
  // column moves forward with it. One formula, asked of whichever board is
  // actually there.
  const r = unit([
    { id: 'p1', kind: 'partition', x_mm: 450, front_mm: 80 },
    { id: 's1', kind: 'shelf', pos_mm: 400, zone: 1 },
  ], { width: 900 });
  const part = r.panels.find((p) => p.part === 'VPART');
  const walls = bearingWalls(r.panels);
  const spec = { columnFromEdge: SH.columnFromEdge, backColumn: SH.columnFromEdge };
  const side = walls.find((w) => w.id === 'BUR');
  assert.ok(part.box.d < side.panel.box.d, 'the partition really is shallower');
  assert.deepEqual(
    [...new Set(shelfHoles(r, part.id).map((d) => d.x))].sort((a, b) => a - b),
    pinColumns(walls.find((w) => w.id === part.id), spec).sort((a, b) => a - b),
  );
  assert.deepEqual(
    [...new Set(shelfHoles(r, 'BUR').map((d) => d.x))].sort((a, b) => a - b),
    pinColumns(side, spec).sort((a, b) => a - b),
  );
});

test('F1.2 heightOnBearer is the one conversion, and it is per bearer', () => {
  const r = unit([
    { id: 'p1', kind: 'partition', x_mm: 450 },
    { id: 's1', kind: 'shelf', pos_mm: 400, zone: 1 },
  ], { width: 900 });
  const walls = bearingWalls(r.panels);
  const part = walls.find((w) => w.kind === 'partition');
  const side = walls.find((w) => w.id === 'BUR');
  assert.equal(heightOnBearer(side, 400), 400);
  assert.equal(heightOnBearer(part, 400), 400 - part.panel.box.y);
});

// ─── F1.3 — dimensions follow the bay ───────────────────────────────────────

test('F1.3 the shelf’s chain measures its own bay, bearer face to bearer face', () => {
  const r = unit([
    { id: 'p1', kind: 'partition', x_mm: 450 },
    { id: 's1', kind: 'shelf', pos_mm: 400, zone: 1 },
  ], { width: 900 });
  const shelf = r.panels.find((p) => p.part === 'SHELF');
  const part = r.panels.find((p) => p.part === 'VPART');
  const set = pieceHoverRows(r, shelf.id, P);
  const bay = set.rows.find((x) => x.kind === 'bay');
  assert.ok(bay, 'a shelf carries its bay');
  assert.equal(bay.from[0], part.box.x + part.box.w, 'the partition’s right face');
  assert.equal(bay.to[0], r.params.width - r.params.board_t, '…and BUR’s inner face');
  // …and NOT the whole internal width, which is what the owner was looking at.
  assert.notEqual(bay.to[0] - bay.from[0], r.derived.internal_width);
});

test('F1.3 an undivided cabinet still measures its full internal width', () => {
  const r = unit([{ id: 's1', kind: 'shelf', pos_mm: 400 }]);
  const shelf = r.panels.find((p) => p.part === 'SHELF');
  const bay = pieceHoverRows(r, shelf.id, P).rows.find((x) => x.kind === 'bay');
  assert.equal(bay.to[0] - bay.from[0], r.derived.internal_width);
});

test('F1.3 the dimension and the drilling come out of ONE resolution', () => {
  const r = unit([
    { id: 'p1', kind: 'partition', x_mm: 400 },
    { id: 'p2', kind: 'partition', x_mm: 800 },
    { id: 's1', kind: 'shelf', pos_mm: 400, zone: 1 },
  ], { width: 1200 });
  const shelf = r.panels.find((p) => p.part === 'SHELF');
  const bay = shelfBay({
    walls: bearingWalls(r.panels),
    run: shelf.meta.run,
    level: shelf.box.y,
    tolerance: P.carcass.shelfWidthClearance,
  });
  // The two boards the chain measures between are the two the machine bores.
  const bored = new Set(r.drills.filter((d) => d.layer === SH.layer).map((d) => d.panel));
  assert.deepEqual([...bored].sort(), [...bay.of].sort());
});

// ─── F1.4 — a plain cabinet is byte-identical ───────────────────────────────

test('F1.4 a cabinet with no partition drills BUL and BUR, exactly as it always did', () => {
  const r = unit([
    { id: 's1', kind: 'shelf', pos_mm: 300 },
    { id: 's2', kind: 'shelf', pos_mm: 600 },
  ]);
  const rows = r.drillSummary.shelf_pin_row_y;
  assert.deepEqual(rows, [300, 600]);
  const perSide = rows.length * SH.clusterOffsets.length * r.drillSummary.shelf_hole_x.length;
  for (const side of ['BUL', 'BUR']) {
    assert.equal(shelfHoles(r, side).length, perSide, `${side} takes the whole ladder`);
  }
  // Emitted BUL first and BUR second, which is the order turn 26 wrote them in
  // — and therefore why the fingerprint on the golden defaults does not move.
  const order = r.drills.filter((d) => d.layer === SH.layer).map((d) => d.panel);
  assert.deepEqual([...new Set(order)], ['BUL', 'BUR']);
  assert.equal(order.slice(0, perSide).every((p) => p === 'BUL'), true);
});

// ─── F1.5 — both two-partition cases ────────────────────────────────────────

test('F1.5 a shelf in the MIDDLE bay drills the two partitions and neither side', () => {
  const r = unit([
    { id: 'p1', kind: 'partition', x_mm: 400 },
    { id: 'p2', kind: 'partition', x_mm: 800 },
    { id: 's1', kind: 'shelf', pos_mm: 400, zone: 1 },
  ], { width: 1200 });
  const parts = r.panels.filter((p) => p.part === 'VPART');
  assert.equal(parts.length, 2);
  for (const side of ['BUL', 'BUR']) {
    assert.equal(shelfClassEntities(r, side).drills.length, 0, `${side} takes nothing`);
  }
  const perRow = SH.clusterOffsets.length * 2;
  for (const part of parts) assert.equal(shelfHoles(r, part.id).length, perRow, `${part.id} bored`);
  // Each in its OWN frame, and both partitions stand at the same base here, so
  // the two ladders agree — which is the check that catches a shared frame.
  for (const part of parts) {
    assert.deepEqual(
      [...new Set(shelfHoles(r, part.id).map((d) => d.y))].sort((a, b) => a - b),
      SH.clusterOffsets.map((dy) => 400 + dy - part.box.y).sort((a, b) => a - b),
    );
  }
});

test('F1.5 a shelf in an END bay drills one partition and one side', () => {
  const r = unit([
    { id: 'p1', kind: 'partition', x_mm: 400 },
    { id: 'p2', kind: 'partition', x_mm: 800 },
    { id: 's1', kind: 'shelf', pos_mm: 400, zone: 2 },
  ], { width: 1200 });
  const [p1, p2] = r.panels.filter((p) => p.part === 'VPART');
  const perRow = SH.clusterOffsets.length * 2;
  assert.equal(shelfHoles(r, 'BUR').length, perRow, 'the right side carries it');
  assert.equal(shelfHoles(r, p2.id).length, perRow, '…with the nearer partition');
  assert.equal(shelfClassEntities(r, 'BUL').drills.length, 0, 'BUL takes nothing');
  assert.equal(shelfClassEntities(r, p1.id).drills.length, 0, 'and neither does the far partition');
});

test('F1.5 a FIX shelf in a bay screws the side and marks the partition — and only those', () => {
  const r = unit([
    { id: 'p1', kind: 'partition', x_mm: 450 },
    {
      id: 's1', kind: 'shelf', pos_mm: 400, zone: 1, variant: 'fixed',
    },
  ], { width: 900 });
  const part = r.panels.find((p) => p.part === 'VPART');
  // No pin ladder anywhere: a shelf that cannot move is not drilled for pins.
  assert.equal(r.drills.filter((d) => d.layer === SH.layer).length, 0);
  // The through screws are in the SIDE it lands on…
  assert.ok(r.drills.some((d) => d.panel === 'BUR' && d.kind === 'shelf_screw'));
  assert.equal(r.drills.filter((d) => d.panel === 'BUL' && d.kind === 'shelf_screw').length, 0);
  // …and the partition takes the biscuit set alone (a through screw would
  // surface in the neighbouring bay — turn 24, F7.1).
  assert.equal(r.drills.filter((d) => d.panel === part.id && d.kind === 'shelf_screw').length, 0);
  const marks = r.panels.find((p) => p.id === part.id).cnc.marks || [];
  assert.ok(marks.length > 0, 'the partition is set out');
  assert.equal((r.panels.find((p) => p.id === 'BUL').cnc.marks || []).length, 0, 'BUL is not');
});
