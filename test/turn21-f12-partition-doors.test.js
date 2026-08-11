// ─── TURN 21 F12: DOORS ON THE PARTITION ────────────────────────────────────
//
// Owner's case, verbatim: a full-height partition at setback 0 must be able to
// carry doors — partitions at 600 and 800, three bays, two proper doors and one
// small one in the middle.
//
// The width law, also verbatim: "the leaf HINGED ON the partition reaches the
// partition's far edge minus 3 mm — same rule as at a carcass side. Its
// neighbour keeps the 3 mm gap, therefore starts at the far edge and covers
// none of the partition — coming out slightly narrower, which the owner
// accepts. Gaps between doors: always 3."

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCabinet } from '../src/engine/cabinet.js';
import { bayDoorPlan, bayDoorsAvailable, doorBays } from '../src/engine/doors.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

const G = P.board.thickness;
const GAP = P.doors.gap;
const W = 1400;

/** The owner's cabinet: 1400 wide, partitions at 600 and 800, three bays. */
const threeBay = (bayDoorsSpec, partitionExtra = {}) => computeCabinet({
  type: 'WARDROBE',
  width: W,
  height: 2150,
  depth: 578,
  board_t: 18,
  front_t: 25,
  front_type: 'S',
  hinge: 'L',
  unit_num: 'W1',
  sections: [{
    items: [
      { id: 'p1', kind: 'partition', x_mm: 600, front_mm: 0, ...partitionExtra },
      { id: 'p2', kind: 'partition', x_mm: 800, front_mm: 0, ...partitionExtra },
    ],
  }],
  ...(bayDoorsSpec ? { bay_doors: bayDoorsSpec } : {}),
}, P);

const fronts = (r) => r.panels.filter((p) => p.part === 'FRONT').sort((a, b) => a.box.x - b.box.x);

// ─── F12.1 — the preconditions are physical ────────────────────────────────

test('F12.1 — only a FULL-HEIGHT partition at setback 0 makes a bay', () => {
  const t = G;
  const full = { id: 'VPART-1', x: 600, thickness: t, fullHeight: true, setback: 0 };
  assert.equal(doorBays({ width: W, boardT: t, partitions: [full] }).length, 2);
  // Set back: there is nothing at the door plane to screw a plate to.
  assert.equal(doorBays({ width: W, boardT: t, partitions: [{ ...full, setback: 20 }] }).length, 1);
  // Half height: a door hung on a board that stops half way up twists it.
  assert.equal(doorBays({ width: W, boardT: t, partitions: [{ ...full, fullHeight: false }] }).length, 1);
  // A cabinet with no partition offers nothing at all — which is what keeps
  // every golden default out of this feature by construction.
  assert.equal(bayDoorsAvailable(doorBays({ width: W, boardT: t, partitions: [] })), false);
  assert.equal(bayDoorsAvailable(doorBays({ width: W, boardT: t, partitions: [full] })), true);
});

test('F12.1 — the engine reads both preconditions off the PIECE', () => {
  const r = threeBay(null);
  for (const n of [1, 2]) {
    const vp = r.panels.find((p) => p.id === `VPART-${n}`);
    assert.equal(vp.meta.fullHeight, true);
    assert.equal(vp.meta.setback, 0);
  }
  // …and a partition set back is not offered, without anything else changing.
  const back = threeBay(null, { front_mm: 20 });
  assert.equal(back.panels.find((p) => p.id === 'VPART-1').meta.setback, 20);
});

// ─── F12.3 — the widths, which are the owner's own law ─────────────────────

test('F12.3 — the owner’s 600/800 case: three doors, and the gaps are all 3', () => {
  const r = threeBay([
    { door: 'one', hinge: 'L' },
    { door: 'one', hinge: 'L' },
    { door: 'one', hinge: 'R' },
  ]);
  const [b1, b2, b3] = fronts(r);
  assert.equal(fronts(r).length, 3, 'a door in each bay');

  // The outer leaves keep the carcass rule: half a gap in from the face.
  assert.equal(b1.box.x, GAP / 2);
  assert.equal(b3.box.x + b3.w, W - GAP / 2);

  // B2 is hinged on VPART-1 (its left boundary), so it covers that partition
  // all but the gap: it starts 3 mm past the far edge, at 603.
  assert.equal(b2.box.x, 600 + GAP);
  // …and B1, whose neighbour covers it, starts at the far edge and covers none.
  assert.equal(b1.box.x + b1.w, 600);

  // Nobody is hinged on VPART-2 — B2 is hinged left and B3 right — so the two
  // meet on its centre line with the same 3 between them.
  assert.equal(b2.box.x + b2.w, 800 + G / 2 - GAP / 2);
  assert.equal(b3.box.x, 800 + G / 2 + GAP / 2);

  // GAPS BETWEEN DOORS: ALWAYS 3.
  assert.equal(b2.box.x - (b1.box.x + b1.w), GAP);
  assert.equal(b3.box.x - (b2.box.x + b2.w), GAP);
  // "two proper doors and one small one in the middle" — and it is the middle.
  assert.ok(b2.w < b1.w && b2.w < b3.w, `${b2.w} is the small one`);
  assert.equal(b2.w, 204.5);
});

test('F12.3 — mirrored: the leaf hinged on the partition from the LEFT covers it', () => {
  const r = threeBay([
    { door: 'one', hinge: 'R' },
    { door: 'one', hinge: 'R' },
    { door: 'one', hinge: 'R' },
  ]);
  const [b1, b2, b3] = fronts(r);
  // B1 is hinged on its RIGHT boundary — VPART-1 — so it reaches across it and
  // stops 3 short of its far edge (618 − 3).
  assert.equal(b1.box.x + b1.w, 600 + G - GAP);
  assert.equal(b2.box.x, 600 + G, 'and its neighbour covers none of it');
  assert.equal(b2.box.x - (b1.box.x + b1.w), GAP);
  assert.equal(b3.box.x - (b2.box.x + b2.w), GAP);
});

test('F12.3 — both leaves hinged on one partition meet on its centre line', () => {
  // Real: a partition has two faces and each takes a plate. Neither can cover
  // it, so they share it — and the gap is still 3.
  const bays = doorBays({
    width: W,
    boardT: G,
    partitions: [{ id: 'VPART-1', x: 600, thickness: G, fullHeight: true, setback: 0 }],
  });
  const plan = bayDoorPlan({
    bays, modes: [{ door: 'one', hinge: 'R' }, { door: 'one', hinge: 'L' }], width: W, gap: GAP,
  });
  const [left, right] = plan;
  assert.equal(left.x + left.width, 600 + G / 2 - GAP / 2);
  assert.equal(right.x, 600 + G / 2 + GAP / 2);
  assert.equal(right.x - (left.x + left.width), GAP);
  // Both are hinged on the partition, and on OPPOSITE faces.
  assert.equal(left.hingeOn, 'VPART-1');
  assert.equal(right.hingeOn, 'VPART-1');
  assert.equal(left.hingeFace, 'L');
  assert.equal(right.hingeFace, 'R');
});

test('F12.1 — a bay may take NO door, and the rest are unaffected', () => {
  const r = threeBay([
    { door: 'one', hinge: 'L' },
    { door: 'none', hinge: 'L' },
    { door: 'one', hinge: 'R' },
  ]);
  assert.equal(fronts(r).length, 2);
  const [b1, b3] = fronts(r);
  assert.equal(b1.box.x, GAP / 2);
  assert.equal(b3.box.x + b3.w, W - GAP / 2);
});

// ─── F12.2 — the plate pattern, on a new panel ─────────────────────────────

test('F12.2 — the plate is the EXISTING ⌀5 law, on the partition’s own face', () => {
  const r = threeBay([
    { door: 'one', hinge: 'L' },
    { door: 'one', hinge: 'L' },
    { door: 'one', hinge: 'R' },
  ]);
  const plate = r.drills.filter((d) => d.panel === 'VPART-1' && d.kind === 'hinge');
  const rows = r.drillSummary.hinge_centers;
  assert.equal(plate.length, rows.length * 2, 'a PAIR per hinge row, exactly as a side gets');
  for (const d of plate) {
    assert.equal(d.layer, P.hinges.layer, 'HINGES_5MM — the existing named class');
    assert.equal(d.d, P.hinges.holeDiameter);
  }
  // The two of each pair are ±16 about the row, and the row is the carcass's
  // own — measured in the partition's frame, which starts at its own bottom.
  //
  // ─── TURN 24 (CLAUDE.md F8): THE FRAME TURNED, THE LAW DID NOT ───────────
  // The partition lies along the grain now — `depth × height`, x from the
  // FRONT — so the HEIGHT that used to be the drawn x is the drawn y, and the
  // 37 mm that used to be the y is the x. Every number below is the number it
  // was; only which axis it is on has changed, which is what "re-orient the
  // part" means and is exactly what a joiner sees on the sheet.
  const vp = r.panels.find((p) => p.id === 'VPART-1');
  const wanted = rows.flatMap((c) => [
    c - P.hinges.holePairOffset - vp.box.y, c + P.hinges.holePairOffset - vp.box.y,
  ]).sort((a, b) => a - b);
  assert.deepEqual(plate.map((d) => d.y).sort((a, b) => a - b), wanted);
  // 37 mm from the FRONT edge, which the drawn x now runs from. This door
  // closes on the partition's RIGHT face — the part turned over, exactly as
  // BUR is BUL turned over — so it measures `depth − 37` on the drawn face.
  for (const d of plate) assert.equal(d.x, vp.box.d - P.hinges.xFromFrontEdge);
  // The other partition carries nothing: no door is hung on it.
  assert.equal(r.drills.filter((d) => d.panel === 'VPART-2' && d.kind === 'hinge').length, 0);
});

test('F12.2 — the LEFT face is the drawn face, and measures from the front', () => {
  const r = threeBay([
    { door: 'one', hinge: 'R' },
    { door: 'none', hinge: 'L' },
    { door: 'none', hinge: 'R' },
  ]);
  const vp = r.panels.find((p) => p.id === 'VPART-1');
  const plate = r.drills.filter((d) => d.panel === 'VPART-1' && d.kind === 'hinge');
  assert.ok(plate.length > 0);
  // Turn 24 (CLAUDE.md F8): the drawn x runs from the FRONT edge now, so the
  // face that measures 37 FROM the front measures exactly 37.
  for (const d of plate) assert.equal(d.x, P.hinges.xFromFrontEdge);
  assert.ok(vp.box.d > 0);
});

test('F12.2 — NOTHING is drilled where no door is hung on a partition', () => {
  // The turn's one new class exists only in the scenario that asks for it.
  const bare = threeBay(null);
  assert.equal(bare.drills.filter((d) => d.panel.startsWith('VPART') && d.kind === 'hinge').length, 0);
  assert.equal(
    bare.drills.filter((d) => d.panel.startsWith('VPART') && d.layer === P.hinges.layer).length, 0,
  );
});

test('F12 — the carcass sides are drilled only for the doors they carry', () => {
  const r = threeBay([
    { door: 'one', hinge: 'L' },
    { door: 'one', hinge: 'L' },
    { door: 'one', hinge: 'R' },
  ]);
  // B1 hangs on BUL, B2 on VPART-1 and B3 on BUR — three hinged pieces, and
  // the summary says so.
  assert.deepEqual(r.drillSummary.hinged_sides, ['BUL', 'VPART-1', 'BUR']);
  const rows = r.drillSummary.hinge_centers.length * 2;
  for (const id of ['BUL', 'BUR', 'VPART-1']) {
    assert.equal(r.drills.filter((d) => d.panel === id && d.kind === 'hinge').length, rows,
      `${id} carries the plate pattern for the leaf hung on it`);
  }
  // …and VPART-2, which carries nothing, is drilled for nothing.
  assert.equal(r.drills.filter((d) => d.panel === 'VPART-2' && d.kind === 'hinge').length, 0);

  // A middle bay hung on both its partitions leaves the CARCASS alone: no door
  // is hinged on a side, so no side is bored for one.
  const middleOnly = threeBay([
    { door: 'none', hinge: 'L' },
    { door: 'one', hinge: 'L' },
    { door: 'none', hinge: 'R' },
  ]);
  for (const id of ['BUL', 'BUR']) {
    assert.equal(middleOnly.drills.filter((d) => d.panel === id && d.kind === 'hinge').length, 0);
  }
  assert.equal(middleOnly.drills.filter((d) => d.panel === 'VPART-1' && d.kind === 'hinge').length, rows);
});

// ─── F12.4 — the hinge rows are the unit's existing law ────────────────────

test('F12.4 — the count and the positions follow the existing height law', () => {
  const r = threeBay([
    { door: 'one', hinge: 'L' },
    { door: 'one', hinge: 'L' },
    { door: 'one', hinge: 'R' },
  ]);
  const plain = computeCabinet({
    type: 'WARDROBE',
    width: W,
    height: 2150,
    depth: 578,
    board_t: 18,
    front_t: 25,
    front_type: 'S',
    hinge: 'L',
    unit_num: 'W1',
    doors: true,
  }, P);
  assert.deepEqual(r.drillSummary.hinge_centers, plain.drillSummary.hinge_centers,
    'a bay door is hung on the same rows a face door is');
  // …and every leaf is cupped on those rows, in its own board.
  for (const f of fronts(r)) {
    const cups = r.drills.filter((d) => d.panel === f.id && d.kind === 'cup');
    assert.equal(cups.length, r.drillSummary.hinge_centers.length);
  }
});

test('F12 — the heights follow the existing door law for the unit', () => {
  const r = threeBay([
    { door: 'one', hinge: 'L' },
    { door: 'one', hinge: 'L' },
    { door: 'one', hinge: 'R' },
  ]);
  for (const f of fronts(r)) {
    assert.equal(f.h, 2150 - GAP, 'H − gap, exactly as a face door');
    assert.equal(Math.abs(f.box.y), 0, 'and it starts at the carcass floor');
    assert.equal(f.thickness, 25);
  }
});
