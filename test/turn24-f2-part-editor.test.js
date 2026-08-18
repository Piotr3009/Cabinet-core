import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import {
  ALL_SNAPS_ON, SNAP_KINDS, SNAP_PRIORITY, drawingDimensionRows, footOfPerpendicular,
  numericReference, placeByNumber, resolveSnap, segmentIntersection, snapAt, snapCandidates,
  snapGeometry,
} from '../src/engine/partSnap.js';
import { CNC_LAYERS } from '../src/engine/cnc/layers.js';

// ─── TURN 24 · F2 — THE PENCIL LEARNS TO DRAW ───────────────────────────────
//
// "The mock is the law for F2." The owner vetoed turn 23's interaction outright
// and the replacement was drawn for him and approved before this turn was
// written. Everything below is that mock's ARITHMETIC — the osnap resolution
// and the numeric override as pure maths, which is what CLAUDE.md's TESTS
// section asks for by name.

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

/** A 600 × 400 print with one hole, one pocket and one mark on it. */
const DRAWING = {
  size: { w: 600, h: 400 },
  outline: [[0, 0], [600, 0], [600, 400], [0, 400]],
  machinings: [
    { id: 'h1', kind: 'hole', x: 300, y: 200, d: 20 },
    {
      id: 'p1', kind: 'pocket', x: 100, y: 300, w: 40, h: 20,
    },
    { id: 'm1', kind: 'mark', from: [400, 100], to: [500, 100] },
  ],
};

const GEOM = snapGeometry(DRAWING);

// ─── F2.3 — the eight kinds ────────────────────────────────────────────────

test('F2.3 — the eight kinds CLAUDE.md names, each with its own marker', () => {
  assert.deepEqual(
    SNAP_KINDS.map((k) => k.id),
    ['END', 'MID', 'CEN', 'NODE', 'QUAD', 'INT', 'PER', 'NEA'],
  );
  assert.deepEqual(
    SNAP_KINDS.map((k) => k.marker),
    ['square', 'triangle', 'circle', 'node', 'diamond', 'cross', 'perp', 'hourglass'],
  );
  // Every kind is on for a joiner who has never opened the panel.
  assert.equal(Object.values(ALL_SNAPS_ON).every(Boolean), true);
});

test('F2.3 — the parked kinds really are parked: no Tangent, no Parallel', () => {
  const ids = new Set(SNAP_KINDS.map((k) => k.id));
  for (const parked of ['TAN', 'PAR', 'EXT', 'APP', 'INS', 'GCEN']) {
    assert.equal(ids.has(parked), false, `${parked} is NOT in this turn`);
  }
});

test('F2.3 — the geometry a snap is taken on is read off the DRAWING', () => {
  // Four outline edges + four sides of the pocket + the mark.
  assert.equal(GEOM.segments.length, 4 + 4 + 1);
  assert.equal(GEOM.circles.length, 1);
  assert.equal(GEOM.boxes.length, 1);
});

test('F2.3 — END catches a corner of the part', () => {
  const got = snapAt({ drawing: DRAWING, cursor: { x: 2, y: 2 }, magnetMm: 5 });
  assert.equal(got.kind, 'END');
  assert.deepEqual([got.x, got.y], [0, 0]);
});

test('F2.3 — MID catches the middle of an edge, CEN the middle of a hole', () => {
  const mid = snapAt({ drawing: DRAWING, cursor: { x: 300, y: 2 }, magnetMm: 5 });
  assert.equal(mid.kind, 'MID');
  assert.deepEqual([mid.x, mid.y], [300, 0]);

  const cen = snapAt({ drawing: DRAWING, cursor: { x: 301, y: 201 }, magnetMm: 5 });
  assert.equal(cen.kind, 'CEN', 'a hole’s centre outranks its own Node');
  assert.deepEqual([cen.x, cen.y], [300, 200]);
});

test('F2.3 — QUADRANT catches N/E/S/W of a round feature', () => {
  const got = snapAt({ drawing: DRAWING, cursor: { x: 310, y: 200 }, magnetMm: 5 });
  assert.equal(got.kind, 'QUAD');
  assert.deepEqual([got.x, got.y], [310, 200]);
});

test('F2.3 — PER is the foot of the perpendicular; NEA is anywhere on the line', () => {
  // Straight below the mark's midpoint: the foot is on the mark and is a PER.
  const per = snapAt({
    drawing: DRAWING, cursor: { x: 450, y: 103 }, magnetMm: 5, enabled: { ...ALL_SNAPS_ON, MID: false },
  });
  assert.equal(per.kind, 'PER');
  assert.deepEqual([per.x, per.y], [450, 100]);

  // Off the END of the mark: there is no perpendicular, only a nearest point.
  const nea = snapAt({
    drawing: DRAWING,
    cursor: { x: 503, y: 103 },
    magnetMm: 5,
    enabled: { ...ALL_SNAPS_ON, END: false },
  });
  assert.equal(nea.kind, 'NEA');
  assert.deepEqual([nea.x, nea.y], [500, 100]);
});

test('F2.3 — INT catches where two lines of the drawing cross', () => {
  const crossing = {
    size: { w: 200, h: 200 },
    outline: [[0, 0], [200, 0], [200, 200], [0, 200]],
    machinings: [
      { id: 'a', kind: 'mark', from: [50, 100], to: [150, 100] },
      { id: 'b', kind: 'mark', from: [100, 50], to: [100, 150] },
    ],
  };
  const got = snapAt({
    drawing: crossing,
    cursor: { x: 101, y: 101 },
    magnetMm: 5,
    // MID would win the same pixel — both marks have their midpoint there —
    // so it is switched off to ask about INT alone.
    enabled: { ...ALL_SNAPS_ON, MID: false },
  });
  assert.equal(got.kind, 'INT');
  assert.deepEqual([got.x, got.y], [100, 100]);
});

// ─── F2.3 — THE PRIORITY ON CONFLICT ───────────────────────────────────────

test('F2.3 — the chain is CEN/END > MID > INT > PER > NEA', () => {
  const rank = (k) => SNAP_PRIORITY.indexOf(k);
  assert.ok(rank('CEN') < rank('MID'), 'CEN beats MID');
  assert.ok(rank('END') < rank('MID'), 'END beats MID');
  assert.ok(rank('MID') < rank('INT'), 'MID beats INT');
  assert.ok(rank('INT') < rank('PER'), 'INT beats PER');
  assert.ok(rank('PER') < rank('NEA'), 'PER beats NEA');
  // …and the two the chain does not name sit where AutoCAD puts them.
  assert.ok(rank('NODE') < rank('MID'), 'a Node is as definite as an endpoint');
  assert.ok(rank('QUAD') > rank('MID') && rank('QUAD') < rank('INT'), 'a Quadrant reads with MID');
});

test('F2.3 — a HIGHER kind wins the pixel even when a lower one is nearer', () => {
  const candidates = [
    { kind: 'NEA', x: 100, y: 100 },       // right under the cursor
    { kind: 'END', x: 102, y: 100 },       // 2 mm away
  ];
  const got = resolveSnap({ candidates, cursor: { x: 100, y: 100 }, magnetMm: 5 });
  assert.equal(got.kind, 'END', 'a corner under the aperture is a corner, every time');
});

test('F2.3 — two of the SAME kind: the nearer one wins', () => {
  const candidates = [
    { kind: 'END', x: 103, y: 100 },
    { kind: 'END', x: 101, y: 100 },
  ];
  const got = resolveSnap({ candidates, cursor: { x: 100, y: 100 }, magnetMm: 5 });
  assert.deepEqual([got.x, got.y], [101, 100]);
});

test('F2.3 — the MAGNET is one number, and outside it there is no snap', () => {
  assert.equal(P.editor.partSnap.magnetMm, 5, 'the sheet-space equivalent of ~5 mm');
  assert.equal(snapAt({ drawing: DRAWING, cursor: { x: 300, y: 200 }, magnetMm: 5 }).kind, 'CEN');
  assert.equal(snapAt({ drawing: DRAWING, cursor: { x: 340, y: 240 }, magnetMm: 5 }), null);
});

test('F2.3 — a kind switched OFF is never offered', () => {
  const off = { ...ALL_SNAPS_ON, END: false, NODE: false };
  const got = snapAt({
    drawing: DRAWING, cursor: { x: 1, y: 1 }, magnetMm: 5, enabled: off,
  });
  // The corner is off; what is left within 5 mm of (1, 1) is the two edges
  // that meet there, and the nearest point on one of them is a NEA.
  assert.notEqual(got?.kind, 'END');
  const none = snapCandidates({ geometry: GEOM, cursor: { x: 1, y: 1 }, enabled: off });
  assert.equal(none.every((c) => c.kind !== 'END'), true);
  // A key the stored panel has never heard of reads as ON, which is what lets
  // a NEW kind appear for somebody who set his preferences last year.
  const partial = snapCandidates({ geometry: GEOM, cursor: { x: 1, y: 1 }, enabled: { MID: false } });
  assert.equal(partial.some((c) => c.kind === 'END'), true);
});

// ─── F2.5 — THE NUMBER IS AN IN-FLIGHT OVERRIDE ────────────────────────────

const SIZE = { w: 600, h: 400 };

test('F2.5 — the number is measured from the NEAREST edge on that axis', () => {
  // Cursor near the left edge, low down: the x is the nearer axis, measured
  // from the left.
  const ref = numericReference({ from: { x: 40, y: 200 }, size: SIZE });
  assert.deepEqual(ref, {
    axis: 'x', origin: 0, direction: 1, edge: 'left',
  });
  // …and near the RIGHT edge it counts back from the right, which is where a
  // joiner would hook his tape.
  assert.deepEqual(numericReference({ from: { x: 560, y: 200 }, size: SIZE }), {
    axis: 'x', origin: 600, direction: -1, edge: 'right',
  });
  // Near the bottom, and centred across: the y is the nearer axis.
  assert.deepEqual(numericReference({ from: { x: 300, y: 30 }, size: SIZE }), {
    axis: 'y', origin: 0, direction: 1, edge: 'bottom',
  });
  assert.deepEqual(numericReference({ from: { x: 300, y: 380 }, size: SIZE }), {
    axis: 'y', origin: 400, direction: -1, edge: 'top',
  });
});

test('F2.5 — Enter places the point AT that distance, keeping the other axis', () => {
  // The mock's own number: 37.
  const got = placeByNumber({ at: { x: 90, y: 210 }, value: 37, size: SIZE });
  assert.equal(got.x, 37, 'the typed number wins the axis it is about');
  assert.equal(got.y, 210, '…and the cursor keeps the other one');
  assert.equal(got.edge, 'left');
});

test('F2.5 — from the far edge it counts BACK, so 37 is 37 from that edge', () => {
  const got = placeByNumber({ at: { x: 570, y: 210 }, value: 37, size: SIZE });
  assert.equal(got.x, 600 - 37);
});

test('F2.5 — Tab (a second number) refines the other axis', () => {
  // At (90, 210) the LEFT edge is the nearest, so the first number is the x
  // and the second is a y measured from the top — which is nearer than the
  // bottom at 210 of 400.
  const got = placeByNumber({
    at: { x: 90, y: 210 }, value: 37, second: 22, size: SIZE,
  });
  assert.deepEqual([got.x, got.y], [37, 400 - 22]);
  // At (90, 40) the BOTTOM edge is nearer than the left, so the first number
  // is the y. The hand decides which axis it is about by where it is, exactly
  // as SketchUp does — and the second number is then the x.
  const low = placeByNumber({
    at: { x: 90, y: 40 }, value: 37, second: 22, size: SIZE,
  });
  assert.deepEqual([low.x, low.y], [22, 37]);
  assert.equal(low.axis, 'y');
});

test('F2.5 — an axis may be forced, and rubbish is refused rather than guessed', () => {
  assert.equal(placeByNumber({
    at: { x: 90, y: 210 }, value: 37, size: SIZE, axis: 'y',
  }).y, 400 - 37);
  assert.equal(placeByNumber({ at: { x: 0, y: 0 }, value: 'x', size: SIZE }), null);
  // `Number(null)` and `Number('')` are both 0, and neither is a number
  // anybody typed — placing a hole on the edge because a field was empty is
  // exactly the class of bug rule 13 is about.
  assert.equal(placeByNumber({ at: { x: 0, y: 0 }, value: null, size: SIZE }), null);
  assert.equal(placeByNumber({ at: { x: 0, y: 0 }, value: '', size: SIZE }), null);
});

// ─── F2.4 — the live dimensions ────────────────────────────────────────────

test('F2.4 — the live dimensions are HORIZONTAL and VERTICAL, never diagonal', () => {
  const rows = drawingDimensionRows({
    at: { x: 150, y: 120 },
    size: SIZE,
    features: [
      { id: 'a', x: 400, y: 120 },     // same line across  → drawn
      { id: 'b', x: 150, y: 350 },     // same line up      → drawn
      { id: 'c', x: 420, y: 380 },     // diagonal          → never
    ],
  });
  for (const row of rows) {
    const horizontal = row.from[1] === row.to[1];
    const vertical = row.from[0] === row.to[0];
    assert.ok(horizontal || vertical, `${row.key} is axis-aligned`);
  }
  const keys = rows.map((r) => r.key);
  assert.deepEqual(keys, ['x', 'y', 'nx:a', 'ny:b']);
  assert.equal(keys.some((k) => k.includes('c')), false, 'the diagonal neighbour is not drawn');
});

test('F2.4 — the edge measured to is the NEAR one, on each axis', () => {
  const rows = drawingDimensionRows({ at: { x: 500, y: 40 }, size: SIZE });
  const x = rows.find((r) => r.key === 'x');
  const y = rows.find((r) => r.key === 'y');
  assert.deepEqual(x.from, [600, 40], 'the right edge is nearer');
  assert.deepEqual(y.from, [500, 0], 'the bottom edge is nearer');
});

// ─── the small geometry, on its own ────────────────────────────────────────

test('segments cross only where they actually cross, never where they would', () => {
  assert.deepEqual(segmentIntersection([[0, 0], [10, 0]], [[5, -5], [5, 5]]), [5, 0]);
  // Parallel.
  assert.equal(segmentIntersection([[0, 0], [10, 0]], [[0, 1], [10, 1]]), null);
  // They would meet if extended — an APPARENT intersection, which is a kind
  // this turn deliberately does NOT have.
  assert.equal(segmentIntersection([[0, 0], [4, 0]], [[5, -5], [5, 5]]), null);
});

test('the foot of a perpendicular says whether it landed on the segment', () => {
  const inside = footOfPerpendicular({ x: 5, y: 3 }, [0, 0], [10, 0]);
  assert.equal(inside.within, true);
  assert.deepEqual([inside.x, inside.y], [5, 0]);
  const past = footOfPerpendicular({ x: 15, y: 3 }, [0, 0], [10, 0]);
  assert.equal(past.within, false);
  assert.deepEqual([past.clampedX, past.clampedY], [10, 0], 'clamped to the end — which is NEAREST');
});

// ─── F2.1 / F2.6 / F2.7 — the surface, and what it must not have ───────────

test('F2.1 — the toolbar is Select · Drill · Line · Dowel line, plus a layer', () => {
  const detail = src('components/PartDetailModal.jsx');
  // ─── RE-PINNED 17.08.2026 (TURN 38, CLAUDE.md F2/F3) ────────────────────
  // The four are still there and still named the same; the toolbar around them
  // is a TOOLS table now, in AutoCAD's three groups, because F2 put seventeen
  // tools on it. And custom layers are no longer parked — the owner asked for
  // them on 17.08 and F3 is them.
  const tools = src('lib/partTools.js');
  for (const [id, label] of [['select', 'Select'], ['drill', 'Drill'], ['line', 'Line'], ['dowels', 'Dowel line']]) {
    assert.match(tools, new RegExp(`id: '${id}', label: '${label}'`), `${label} is in the toolbar`);
  }
  assert.match(detail, /layerList\.map/, 'the layer picker offers one list');
  assert.match(detail, /USER_LAYER_COLOURS/, '…and a project may add to it (F3)');
});

test('F2.1 — Esc returns to Select, and it does not unwind the Back stack', () => {
  const detail = src('components/PartDetailModal.jsx');
  assert.match(detail, /if \(e\.key === 'Escape'\)/);
  assert.match(detail, /disarm\(\)/);
  // The turn-23 Back stack is the SHELL's; nothing here keeps a history.
  assert.doesNotMatch(detail, /modalStack\s*=/, 'the detail never writes the stack');
});

test('F2.2 — Select picks a real feature and Delete takes it off this print', () => {
  const detail = src('components/PartDetailModal.jsx');
  assert.match(detail, /onPickFeature/);
  assert.match(detail, /data-delete-feature="1"/);
  assert.match(detail, /op: 'hide', feature: feature\.fid/);
  // A click SELECTS; nothing is removed by touching it.
  assert.match(detail, /data-picked/);
});

test('F2.6 — the drill asks ⌀ and depth ONCE, and the layer seeds the answer', () => {
  const detail = src('components/PartDetailModal.jsx');
  assert.match(detail, /data-drill-popover="1"/);
  assert.match(detail, /drillSpec/);
  assert.match(detail, /profile\.editor\.drillDefaults/);
  // Every default names an EXISTING layer — a convention for a layer the app
  // does not have would be a custom layer by the back door.
  const names = new Set(CNC_LAYERS.map((l) => l.name));
  for (const key of Object.keys(P.editor.drillDefaults)) {
    if (key === 'fallback') continue;
    assert.equal(names.has(key), true, `${key} is a real layer`);
  }
});

test('F2.6 — a dowel line steps at the profile’s pitch when nobody types one', () => {
  assert.equal(P.editor.dowelPitchMm, 32, 'the system-32 line');
});

test('F2.7 — the orientation law stands: the sheet lays it, no rotation to edit', () => {
  const detail = src('components/PartDetailModal.jsx');
  assert.match(detail, /drawn as the sheet lays it/);
  assert.doesNotMatch(detail, /rotateForEditing|editRotation/i);
});

test('F2.3 — the snap panel is persisted per user, and only the eight kinds', () => {
  const store = src('stores/partSnapStore.js');
  assert.match(store, /localStorage/);
  assert.match(store, /cc\.partSnaps\.v1/);
  // A stored blob cannot invent a snap kind.
  assert.match(store, /SNAP_KINDS\.some/);
});
