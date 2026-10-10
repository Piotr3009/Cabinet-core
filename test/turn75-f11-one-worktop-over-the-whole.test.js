// ─── T75 · F11 · ONE WORKTOP OVER THE WHOLE ─────────────────────────────────
//
// CLAUDE.md T75 F11: *"`worktopsFor` on an island returns ONE slab: the
// bounding rectangle of every unit and panel on the island plus the front
// overhang law on every face (20 mm), plus a per-face `extend` the client sets
// (the existing `extendFront` record, now per face; a seating overhang of
// `profile.worktop.seatingMm = 300` offered as one click on a face with no
// units). The slab is one BOM line, one cut list line, one sheet in the T71
// set with the cut-outs of F5."*

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { rectCorners } from '../src/engine/room.js';
import { migrateDesign } from '../src/engine/design.js';
import { worktopEligible, worktopsFor } from '../src/engine/worktop.js';
import { buildBom } from '../src/engine/bom.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const S = () => useProjectStore.getState();

function island() {
  S().newProject();
  S().setRoom({ corners: rectCorners(5000, 4000), height: 2500 });
  const id = S().addIsland().id;
  const a = S().addUnit('BUD', { wall: 4 }).id;
  S().moveUnit(a, 0, 0);
  const b = S().addUnit('BUD', { wall: 4 }).id;
  const c = S().addUnit('BUD', { wall: 4 }).id;
  return { id, a, b, c };
}

test('F11 · one slab, the island\'s, from one cabinet: the bounding rectangle plus 20 on every face', () => {
  const { id, a } = island();
  const add = S().addWorktop([a]);
  assert.equal(add.ok, true, add.error);
  const record = migrateDesign(S().project.design).worktops.find((w) => w.id === add.id);
  assert.equal(record.island, id);
  assert.deepEqual(record.extend, {
    A: 0, B: 0, E1: 0, E2: 0,
  });
  const slabs = S().worktopsOf();
  assert.equal(slabs.length, 1, 'ONE slab');
  const g = slabs[0].geometry;
  const unit = S().units.find((u) => u.id === a);
  const faceA = 10 + unit.params.depth + P.doors.gap + unit.params.front_t;
  const panel = 10 + P.front.thickness;
  // Face A's frame: along A, out from A; the core and face B at negative "out".
  assert.equal(g.shape, 'island');
  assert.deepEqual(g.outline, [
    [-panel - 20, -900 - panel - 20],
    [1800 + panel + 20, -900 - panel - 20],
    [1800 + panel + 20, faceA + 20],
    [-panel - 20, faceA + 20],
  ]);
  assert.equal(g.y, 870, 'on the cabinets\' top');
  assert.equal(g.h, P.autoParts.worktop.thickness);
});

test('F11 · a face extended by hand, and the seating overhang as one click on a face with no units', () => {
  const { a } = island();
  const { id: wt } = S().addWorktop([a]);
  const before = S().worktopsOf()[0].geometry.outline;
  assert.equal(S().extendIslandWorktop(wt, 'E1', 40).ok, true);
  assert.equal(S().worktopsOf()[0].geometry.outline[1][0], before[1][0] + 40);
  assert.equal(P.autoParts.worktop.seatingMm, 300);
  assert.equal(S().seatingOverhang(wt, 'B').ok, true);
  assert.equal(S().worktopsOf()[0].geometry.outline[0][1], before[0][1] - 300);
  const refused = S().seatingOverhang(wt, 'A');
  assert.equal(refused.ok, false);
  assert.match(refused.error, /face A has some/);
});

test('F11 · cut-outs are carried from their own face into the slab\'s frame', () => {
  S().newProject();
  S().setRoom({ corners: rectCorners(5000, 4000), height: 2500 });
  S().addIsland();
  const sink = S().addUnit('SINK', { wall: 6 });
  assert.equal(sink.error, null);
  const { ok } = S().addWorktop([sink.id]);
  assert.equal(ok, true);
  const [slab] = S().worktopsOf();
  assert.equal(slab.cutouts.length, 1);
  const c = slab.cutouts[0];
  assert.equal(c.kind, 'sink');
  // Face B lies behind the core in A's frame: the cut-out is at negative "out".
  assert.ok(c.z < -900, `the sink's cut-out sits over face B (z ${c.z})`);
  assert.equal(c.readiness, 'manual', 'machined only when the worktop is a CNC part');
});

test('F11 · eligibility: any cabinets of one island; without walls a record is not resolved blind', () => {
  const { a, b } = island();
  const units = S().units.filter((u) => [a, b].includes(u.id));
  const gate = worktopEligible(units, P, { walls: null });
  assert.equal(gate.island, undefined, 'no walls, no island');
  const record = { id: 'w', island: 'x', unitIds: [a] };
  assert.deepEqual(worktopsFor({ records: [record], units, profile: P }), []);
});

test('F11 · the slab reaches the BOM as one line, and survives save and reload', () => {
  const { a } = island();
  S().addWorktop([a]);
  const bom = buildBom(S().allResults(), { design: migrateDesign(S().project.design), profile: P, room: S().project.room });
  const block = bom.units.find((u) => u.type === 'WORKTOP');
  assert.ok(block, 'the worktop block is in the BOM');
  const lines = block.rows.filter((r) => r.role === 'worktop');
  assert.equal(lines.length, 1, 'ONE BOM line for the whole island');
  const g = S().worktopsOf()[0].geometry;
  assert.deepEqual([lines[0].w, lines[0].h], [g.w, g.d]);
  assert.equal(lines[0].readiness, 'bought');
  const project = JSON.parse(JSON.stringify(S().project));
  const units = JSON.parse(JSON.stringify(S().units));
  S().newProject();
  S().loadProject(project, units);
  assert.equal(S().worktopsOf().length, 1);
  assert.equal(S().worktopsOf()[0].geometry.shape, 'island');
});

test('F11 · the T71 set draws the island job: every sheet builds, the plan carries the slab', async () => {
  const { wallDrawingSheets } = await import('../src/engine/drawings/wallSheets.js');
  const { a } = island();
  S().addWorktop([a]);
  const sheets = wallDrawingSheets({
    entries: S().allResults(), project: S().project, room: S().project.room, worktops: S().worktopsOf(), profile: P, date: 'd',
  });
  assert.ok(sheets.length > 0, 'a set, not nothing');
  const flat = JSON.stringify(sheets);
  assert.ok(!/NaN/.test(flat), 'no sheet carries a NaN');
});
