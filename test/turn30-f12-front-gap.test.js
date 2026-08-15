// ─── TURN 30 F12 — front to front, red under 3 mm ──────────────────────────
//
// CLAUDE.md: "Room level: compute the gap between neighbouring fronts in a run;
// when a gap is **< 3 mm**, paint the pair's meeting edges red and show the
// value. It is a WARNING overlay, not a block. Threshold as a profile number."
//
// ─── THE FIRST THING THIS FILE DOES IS PROVE THE APP IS RIGHT ───────────────
//
// Every kit in this engine stands its front 1.5 mm inside its own carcass on
// both edges, so two cabinets standing edge to edge measure exactly 3.00 — the
// number, not under it. That is asserted across the whole type list below,
// because it is the reason a well-built job is SILENT, and a warning that fires
// on a correct kitchen is worse than no warning at all.
//
// ─── SO WHAT IS THE FAULT IT CATCHES? ───────────────────────────────────────
//
// A layout the editor did not draw. `moveUnit` clamps a slide into the free
// slot and `updateUnitParams` refuses a width that would eat a neighbour, so a
// person cannot make this fault with the mouse. `loadProject` — opening a saved
// or imported job, whose positions never passed through `clampUnitX` and may
// have been written by a version of this app with different numbers — can, and
// nothing in this app has ever measured it. Both are asserted.
//
// ─── AND IT IS A WARNING ────────────────────────────────────────────────────
//
// Nothing here moves a cabinet, re-cuts a door or refuses a layout: the same
// grammar turn 25's warnings and F7's prompt use. Asserted by comparing the
// CUT before and after — panel for panel, hole for hole.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { useProjectStore } from '../src/stores/projectStore.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { defaultParamsFor, UNIT_TYPE_ORDER } from '../src/engine/types.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { unitBase } from '../src/engine/runs.js';
import {
  frontGapClashes, frontGapThresholdMm, frontsInRoom,
} from '../src/engine/frontGapClash.js';

const store = () => useProjectStore.getState();

/** A cabinet standing at a given millimetre, the way a SAVED job stores one. */
const at = (id, x, over = {}) => ({
  id,
  type: over.type || 'BUD',
  position: { wall: over.wall ?? 0, x_mm: x, rotation_deg: over.rotation_deg ?? 0 },
  params: {
    ...defaultParamsFor(over.type || 'BUD', P), unit_num: id, doors: true, ...over.params,
  },
});

/** Open a job with the cabinets already laid out — `loadProject`, as the app does. */
function open(...units) {
  store().loadProject({
    id: null,
    name: 'a job somebody saved',
    room: migrateRoom({ height: 2500, corners: rectCorners(8000, 3000) }),
    design: {},
  }, units);
  return store().frontGapWarnings();
}

// ─── 1. A CORRECT KITCHEN IS SILENT ────────────────────────────────────────

test('F12 every kit stands its front 1.5 mm inside its own carcass, both edges', () => {
  // This is WHY butted cabinets measure 3.00 and why the threshold is 3. If a
  // kit ever moves its leaf, this test says so before the warning starts
  // crying wolf on correct work.
  let seen = 0;
  for (const type of UNIT_TYPE_ORDER) {
    const r = computeCabinet({ ...defaultParamsFor(type, P), unit_num: '01' }, P);
    const fronts = r.panels.filter((p) => p.role === 'front');
    if (!fronts.length) continue;
    seen += 1;
    const W = r.params.width;
    const left = Math.min(...fronts.map((p) => p.box.x));
    const right = W - Math.max(...fronts.map((p) => p.box.x + p.box.w));
    assert.ok(left >= P.doors.gap / 2 - 1e-9, `${type}: left inset ${left}`);
    assert.ok(right >= P.doors.gap / 2 - 1e-9, `${type}: right inset ${right}`);
  }
  assert.ok(seen >= 8, `${seen} kits with fronts checked`);
});

test('F12 two cabinets standing edge to edge measure exactly 3, and are NOT a fault', () => {
  const clashes = open(at('01', 0), at('02', 600));
  assert.deepEqual(clashes, [], 'a correct run says nothing');
  // …and the 3.00 is really there to be measured — the silence is not the
  // reader failing to find the pair.
  const fronts = frontsInRoom(store().allResults(), () => 0);
  assert.equal(fronts.length, 2);
  assert.equal(fronts[1].x - (fronts[0].x + fronts[0].w), 3);
});

test('F12 the doors INSIDE one cabinet are 3 apart too, and are not a fault', () => {
  // A double door and per-bay doors both leave the profile's own 3.00 between
  // leaves. Turn 25 measures those gaps; this reader must not double-report
  // them as faults.
  assert.deepEqual(open(at('01', 0, {
    params: { width: 900, door_count: 2 },
  })), []);
  assert.deepEqual(open(at('01', 0, {
    params: { width: 1200, bay_doors: true, items: [{ id: 'p1', kind: 'partition', x_mm: 600 }] },
  })), []);
});

// ─── 2. THE FAULT ──────────────────────────────────────────────────────────

test('F12 a SAVED job laid out 1 mm tight is caught, and the value is the gap', () => {
  const clashes = open(at('01', 0), at('02', 599));
  assert.equal(clashes.length, 1);
  const [c] = clashes;
  assert.equal(c.mm, 2, '599 instead of 600 leaves 2 mm between the leaves');
  assert.equal(c.thresholdMm, 3);
  assert.equal(c.a.panelId, '01-F');
  assert.equal(c.b.panelId, '02-F');
  assert.equal(c.overlap, false);
  assert.match(c.message, /2 mm between 01's 01-F and 02's 02-F/);
  assert.match(c.message, /under the 3 mm minimum/);
});

test('F12 …and the MARK knows where to stand: the meeting line, the shared band', () => {
  const [c] = open(at('01', 0), at('02', 599));
  // The meeting line is between the two leaf edges — 598.5 and 600.5.
  assert.equal(c.atX, 599.5);
  // The band is the height the two actually SHARE, which for two equal doors
  // is the whole leaf — off the FLOOR, so the mark stands where the doors do
  // rather than 100 mm below them in the toe kick.
  assert.equal(c.fromY, c.a.y);
  assert.equal(c.toY, c.a.y + c.a.h);
  assert.equal(c.a.y, unitBase(store().units[0], P), 'a base unit’s leaf starts on its legs');
  assert.ok(c.a.y > 0, `and that is off the floor — ${c.a.y} mm`);
  assert.equal(c.wall, 0);
});

test('F12 an OVERLAP is the same fault worse, and it says so in millimetres', () => {
  const [c] = open(at('01', 0), at('02', 594));
  assert.equal(c.mm, -3, 'the leaves pass through each other');
  assert.equal(c.overlap, true);
  assert.match(c.message, /OVERLAP by 3 mm/);
});

test('F12 the band is only what the two SHARE — a tall door beside a short one', () => {
  // A 2000 tall door beside a 700 one: the fault is along the short one's own
  // edge and nowhere else, which is what the mark has to be told.
  const [c] = open(
    at('01', 0, { type: 'BUDTALL' }),
    at('02', 599, { params: { height: 700 } }),
  );
  assert.equal(c.fromY, Math.max(c.a.y, c.b.y));
  assert.equal(c.toY, c.b.y + c.b.h, 'the SHORT leaf’s top, not the tall one’s');
  assert.ok(c.a.h > 2 * c.b.h, `the tall one really is tall — ${c.a.h} vs ${c.b.h}`);
  assert.ok(c.toY < c.a.y + c.a.h - 1000, 'and the mark stops a long way below it');
});

// ─── 3. WHAT IS *NOT* A PAIR ───────────────────────────────────────────────

test('F12 a wall unit over a base unit is not a pair — the heights do not meet', () => {
  // They share a wall and share nothing else. Placed one above the other with
  // the wall unit's x deliberately tight against the base unit's.
  assert.deepEqual(open(
    at('01', 0),
    at('02', 599, { type: 'WUD' }),
  ), [], 'different height bands');
});

test('F12 a SHALLOW cabinet beside a deep one is not a pair — the planes do not meet', () => {
  // Two leaves 250 mm apart in the air do not "meet", whatever their x says.
  const clashes = open(at('01', 0), at('02', 599, { params: { depth: 330 } }));
  assert.deepEqual(clashes, [], 'the fronts are in different planes');
  // …and the same two cabinets at the same depth ARE a pair, so the skip is
  // the DEPTH and not something else about the second one.
  assert.equal(open(at('01', 0), at('02', 599)).length, 1);
});

test('F12 cabinets on DIFFERENT WALLS are not a pair', () => {
  assert.deepEqual(open(at('01', 0), at('02', 0, { wall: 1 })), []);
});

test('F12 a TURNED cabinet is out of the "along the wall" world altogether', () => {
  assert.deepEqual(open(at('01', 0), at('02', 599, { rotation_deg: 90 })), []);
});

test('F12 a run of three reports its two REAL joints, not three pairs', () => {
  const clashes = open(at('01', 0), at('02', 599), at('03', 1198));
  assert.equal(clashes.length, 2, 'two joints, and NOT the outer pair as well');
  assert.deepEqual(clashes.map((c) => [c.a.panelId, c.b.panelId]),
    [['01-F', '02-F'], ['02-F', '03-F']]);
  // …and they come out along the wall, so a reader walks the run in order.
  assert.ok(clashes[0].atX < clashes[1].atX);
});

test('F12 cabinets that are simply APART say nothing', () => {
  assert.deepEqual(open(at('01', 0), at('02', 1200)), []);
});

// ─── 4. THE THRESHOLD IS A PROFILE NUMBER ──────────────────────────────────

test('F12 the threshold is the profile’s, and it is 3', () => {
  assert.equal(P.doors.minNeighbourGapMm, 3);
  assert.equal(frontGapThresholdMm(P), 3);
  // A profile saved before tonight gains it on migration rather than falling
  // back to a literal somewhere.
  assert.equal(migrateCabinetProfile({}).doors.minNeighbourGapMm, 3);
});

test('F12 a workshop that wants 5 gets 5 — the number is not hard-coded', () => {
  const strict = { ...P, doors: { ...P.doors, minNeighbourGapMm: 5 } };
  const entries = () => store().allResults();
  open(at('01', 0), at('02', 600));                       // the correct 3.00 run
  assert.deepEqual(frontGapClashes({ entries: entries(), baseOf: () => 0, profile: P }), []);
  const strictly = frontGapClashes({ entries: entries(), baseOf: () => 0, profile: strict });
  assert.equal(strictly.length, 1, 'at 5 mm, a 3 mm joint is a fault');
  assert.equal(strictly[0].mm, 3);
  assert.equal(strictly[0].thresholdMm, 5);
});

test('F12 the boundary is STRICT: exactly the threshold is not under it', () => {
  const gapAt = (x) => open(at('01', 0), at('02', x))[0]?.mm ?? null;
  assert.equal(gapAt(600), null, '3.00 is the number, not under it');
  assert.equal(gapAt(599.5), 2.5);
});

// ─── 5. IT IS A WARNING, NOT A BLOCK ───────────────────────────────────────

test('F12 the CUT is untouched: same panels, same holes, warning or no warning', () => {
  const cutOf = (id) => {
    const r = store().unitResult(id);
    return JSON.stringify({
      panels: r.panels.map((p) => [p.id, p.w, p.h, p.box.x, p.box.y]),
      drills: r.drills.length,
      summary: r.drillSummary,
    });
  };
  open(at('01', 0), at('02', 600));
  const clean = [cutOf('01'), cutOf('02')];
  const clashes = open(at('01', 0), at('02', 599));
  assert.equal(clashes.length, 1, 'the fault is there…');
  assert.deepEqual([cutOf('01'), cutOf('02')], clean, '…and both cabinets are cut exactly as before');
});

test('F12 the reader never writes: no store action, no position, no param', () => {
  // The CODE, not its commentary — which names `moveUnit` and
  // `updateUnitParams` precisely because it does not call them.
  const src = readFileSync(new URL('../src/engine/frontGapClash.js', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  assert.doesNotMatch(src, /useProjectStore|updateUnitParams|moveUnit|set\(/);
  // Pure, and importable by the engine's own rules: no React and no three.js.
  assert.doesNotMatch(src, /from 'react'|three/);
});

// ─── 6. THE EDITOR CANNOT DRAW THIS FAULT ──────────────────────────────────

test('F12 sliding a cabinet cannot make one — the clamp gets there first', () => {
  store().loadProject({
    id: null,
    name: 'by hand',
    room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
    design: {},
  }, []);
  const a = store().addUnit('BUD');
  const b = store().addUnit('BUD', { near: a.id, side: 'right' });
  store().updateUnitParams(a.id, { doors: true });
  store().updateUnitParams(b.id, { doors: true });
  assert.deepEqual(store().frontGapWarnings(), []);
  const x = store().units.find((u) => u.id === b.id).position.x_mm;
  store().moveUnit(b.id, x - 2, 1);                 // shove it into its neighbour
  assert.equal(store().units.find((u) => u.id === b.id).position.x_mm, x, 'clamped');
  assert.deepEqual(store().frontGapWarnings(), [], 'so there is nothing to warn about');
});

test('F12 …nor can widening one: the width is refused before the doors touch', () => {
  const a = store().units[0];
  const res = store().updateUnitParams(a.id, { width: 610 });
  assert.match(res.notices.join(' '), /limited/i);
  assert.deepEqual(store().frontGapWarnings(), []);
});

// ─── 7. ONE LIST, TWO SURFACES ─────────────────────────────────────────────

test('F12 the room paints it and the readout says it — from the SAME list', () => {
  const scene = readFileSync(new URL('../src/3d/Scene.jsx', import.meta.url), 'utf8');
  const read = readFileSync(new URL('../src/components/FrontGapWarnings.jsx', import.meta.url), 'utf8');
  // The mark carries the millimetres, so a proof can read the number off the
  // scene rather than off a label beside it.
  assert.match(scene, /ccFrontGapMm: c\.mm/);
  assert.match(scene, /ccFrontGapPair: \[c\.a\.panelId, c\.b\.panelId\]/);
  assert.match(scene, /profile\.appearance\.frontGapWarning\.colour/);
  // …and it is drawn in the SOLID view only — a contour drawing is the
  // machine's picture and a warning is not cut.
  assert.match(scene, /!contourView && frontGapClashList\.length > 0/);
  // The readout says the value and names the pair.
  assert.match(read, /data-front-gap-warnings=\{rows\.length\}/);
  assert.match(read, /data-front-gap-mm=\{r\.mm\}/);
  assert.match(read, /\{r\.message\}/);
  // ─── SUPERSEDED BY TURN 31 (CLAUDE.md F4.15) ─────────────────────────────
  //
  // Turn 30 asserted that this overlay had NO BUTTONS and changed nothing, and
  // that was right for turn 30: it warned about a layout nothing in the app
  // could repair. The owner's rulebook gives it a repair — "the modal offers
  // TWO options, each with its number" — so a row is now a button that opens
  // that modal beside the click. The property this test protects is unchanged
  // and is asserted below: ONE list feeds the paint and the readout.
  assert.match(read, /openModal\('front-gap'/);
});

test('F12 the colour is the profile’s red, not a literal in a component', () => {
  assert.equal(P.appearance.frontGapWarning.colour, '#e2483c');
  assert.equal(migrateCabinetProfile({}).appearance.frontGapWarning.colour, '#e2483c');
  const read = readFileSync(new URL('../src/components/FrontGapWarnings.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(read, /#[0-9a-fA-F]{6}/, 'no colour spelled out here');
});
