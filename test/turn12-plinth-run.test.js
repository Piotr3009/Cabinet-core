// ─── One plinth across a run (turn 12, CLAUDE.md F8) ────────────────────────
//
// The owner's rule, in his words:
//
//   • no plinth = no plinth (unchanged);
//   • turning plinths on for adjacent units WITHOUT an end panel between them
//     produces ONE continuous plinth across 2, 3, N units — not pieces;
//   • a unit pushed against a plinthed run joins it AUTOMATICALLY;
//   • an end panel or a gap is a boundary — a new segment starts.
//
// This is a DELIBERATE change to what the machine cuts, and it is the only one
// in turn 12 (rule 7). What is checked below is both halves of that: the new
// behaviour, and the fact that a SINGLE unit's plinth has not moved a
// millimetre — which is what keeps the delta to the thing the owner asked for.

import test from 'node:test';
import assert from 'node:assert/strict';

import { plinthSegments, runPlinthParams, segmentPlinth } from '../src/engine/runs.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();
const unitOf = (id) => store().units.find((u) => u.id === id);
const plinthOf = (id) => store().unitResult(id).panels.find((p) => p.part === 'PLINTH') || null;

function project() {
  store().loadProject({
    id: null,
    name: 't12-f8',
    room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
    design: {},
  }, []);
}

/** N base units in a row, all plinthed, butted against each other. */
function run(count, { width = 600 } = {}) {
  project();
  const ids = [];
  for (let i = 0; i < count; i += 1) {
    const { id } = store().addUnit('BUD');
    store().updateUnitParams(id, { width });
    ids.push(id);
  }
  // Butt them up, left to right.
  ids.forEach((id, i) => store().moveUnit(id, i * width, 0));
  for (const id of ids) store().addPlinth(id);
  return ids;
}

// ─── The segments ───────────────────────────────────────────────────────────

const fakeUnit = (id, x, width, over = {}) => ({
  id,
  type: 'BUD',
  position: { wall: 0, x_mm: x, rotation_deg: 0 },
  params: {
    width, height: 720, depth: 558, plinth: true, front_t: 25, ...over,
  },
});

test('adjacent plinthed units are ONE segment', () => {
  const units = [fakeUnit('a', 0, 600), fakeUnit('b', 600, 600), fakeUnit('c', 1200, 600)];
  const segments = plinthSegments({ units });
  assert.equal(segments.length, 1);
  assert.deepEqual(segments[0].map((u) => u.id), ['a', 'b', 'c']);
  const element = segmentPlinth(segments[0]);
  assert.equal(element.length, 1800, 'one board across all three');
  assert.equal(element.offset, 0);
  assert.deepEqual(element.unitIds, ['a', 'b', 'c']);
});

test('a unit with NO plinth is a hole, and the run breaks at it', () => {
  const units = [
    fakeUnit('a', 0, 600),
    fakeUnit('b', 600, 600, { plinth: false }),
    fakeUnit('c', 1200, 600),
  ];
  const segments = plinthSegments({ units });
  assert.equal(segments.length, 2);
  assert.deepEqual(segments.map((sg) => sg.map((u) => u.id)), [['a'], ['c']]);
});

test('an END PANEL between two units is a boundary', () => {
  const units = [
    fakeUnit('a', 0, 600, { end_panels: [{ side: 'R', thickness: 25 }] }),
    fakeUnit('b', 625, 600),
  ];
  const segments = plinthSegments({ units });
  assert.equal(segments.length, 2, 'the kick meets the panel and stops');
  // …and it works from either side of the joint.
  const other = plinthSegments({
    units: [fakeUnit('a', 0, 600), fakeUnit('b', 625, 600, { end_panels: [{ side: 'L', thickness: 25 }] })],
  });
  assert.equal(other.length, 2);
});

test('an end panel at the END of a run does not lengthen the kick', () => {
  // It is the visible end of the run; the plinth meets its inner face. This is
  // also what keeps a single unit's plinth exactly as wide as it always was.
  const withPanel = segmentPlinth([fakeUnit('a', 0, 600, { end_panels: [{ side: 'L', thickness: 25 }] })]);
  const without = segmentPlinth([fakeUnit('a', 0, 600)]);
  assert.equal(withPanel.length, 600);
  assert.equal(without.length, 600);
});

test('nothing plinthed is no segments at all', () => {
  assert.deepEqual(plinthSegments({ units: [fakeUnit('a', 0, 600, { plinth: false })] }), []);
  assert.equal(segmentPlinth([]), null);
});

// ─── The owner / member split ───────────────────────────────────────────────

test('the first unit of a segment carries the piece; the rest carry a note', () => {
  const units = [fakeUnit('a', 0, 600), fakeUnit('b', 600, 600), fakeUnit('c', 1200, 600)];
  const params = runPlinthParams(units, P);
  assert.equal(params.get('a').role, 'owner');
  assert.equal(params.get('a').length, 1800);
  assert.deepEqual(params.get('b'), { role: 'member', ownerId: 'a' });
  assert.deepEqual(params.get('c'), { role: 'member', ownerId: 'a' });
});

test('a member cuts nothing — no second plinth inside the long one', () => {
  const base = defaultParamsFor('BUD', P);
  const owner = computeCabinet({
    ...base, plinth: true, run_plinth: { role: 'owner', offset: 0, length: 1800, unitIds: ['a', 'b', 'c'] },
  }, P).panels.filter((p) => p.part === 'PLINTH');
  const member = computeCabinet({
    ...base, plinth: true, run_plinth: { role: 'member', ownerId: 'a' },
  }, P).panels.filter((p) => p.part === 'PLINTH');
  assert.equal(owner.length, 1);
  assert.equal(owner[0].w, 1800);
  assert.equal(member.length, 0);
});

test('a bare computeCabinet cuts the single-unit plinth it always did', () => {
  // Rule 7's floor: every golden fixture and every test that builds one cabinet
  // goes through this path, and it must not have moved.
  const base = defaultParamsFor('BUD', P);
  const plain = computeCabinet({ ...base, plinth: true }, P).panels.find((p) => p.part === 'PLINTH');
  assert.equal(plain.w, base.width);
  assert.equal(plain.box.x, 0);
  assert.equal(plain.meta, undefined, 'no run metadata on a piece that is not a run');
});

// ─── …and the same thing, in the store ──────────────────────────────────────

test('THREE units, ONE plinth', () => {
  const [a, b, c] = run(3);
  const first = plinthOf(a);
  assert.ok(first, 'the first unit carries it');
  assert.equal(first.w, 1800);
  assert.equal(plinthOf(b), null, 'and nobody else cuts one');
  assert.equal(plinthOf(c), null);
  // One part per segment in the BOM, summed length — CLAUDE.md F8.
  const all = store().allResults().flatMap((e) => e.result.panels).filter((p) => p.part === 'PLINTH');
  assert.equal(all.length, 1);
  assert.equal(all[0].w, 1800);
});

test('a fourth unit pushed against the run JOINS it — the plinth extends', () => {
  const ids = run(3);
  assert.equal(plinthOf(ids[0]).w, 1800);
  const { id } = store().addUnit('BUD');
  store().updateUnitParams(id, { width: 600 });
  store().moveUnit(id, 1800, 0);
  store().addPlinth(id);
  assert.equal(plinthOf(ids[0]).w, 2400, 'the toe kick grew to take it in');
  assert.equal(plinthOf(id), null, 'and the new unit cuts nothing of its own');
});

test('…and pulling one away shortens it again', () => {
  const ids = run(3);
  store().moveUnit(ids[2], 4000, 0);
  assert.equal(plinthOf(ids[0]).w, 1200, 'the two that are left');
  assert.equal(plinthOf(ids[2]).w, 600, 'and the one that walked away has its own');
});

test('turning one unit\'s plinth off splits the kick in two', () => {
  const [a, b, c] = run(3);
  store().removePlinth(b);
  assert.equal(plinthOf(a).w, 600);
  assert.equal(plinthOf(b), null);
  assert.equal(plinthOf(c).w, 600);
});

test('no plinth = no plinth', () => {
  project();
  const { id } = store().addUnit('BUD');
  assert.equal(plinthOf(id), null);
  // …and a whole run of them stays empty.
  const { id: other } = store().addUnit('BUD');
  assert.equal(plinthOf(other), null);
});

test('a wall unit is never in a plinth run — it hangs', () => {
  project();
  const { id: base } = store().addUnit('BUD');
  store().addPlinth(base);
  const { id: wall } = store().addUnit('WUD');
  assert.equal(store().addPlinth(wall), false, 'a hanging unit stands on no legs');
  assert.equal(plinthOf(base).w, unitOf(base).params.width);
});

test('one PART per segment, and its length is the segment', () => {
  // The BOM/CNC contract of F8: "one part per segment, summed length".
  const ids = run(2);
  const [a] = ids;
  const plinth = plinthOf(a);
  assert.equal(plinth.w, 1200);
  assert.equal(plinth.h, store().unitResult(a).assemblies.carcass.legHeight);
  // It is a front-material piece, exactly as turn 11 established.
  assert.equal(plinth.finish_exposed, true);
  // …and it is drawn as one rectangle of that length on the CNC sheet.
  assert.equal(plinth.cnc.outline[1][0], 1200);
});
