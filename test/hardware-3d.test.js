// ─── The hardware, in 3D (turn 7, CLAUDE.md F3 / BACKLOG #42) ───
//
// One claim carries this whole phase, and it is the one CLAUDE.md states:
// THE NUMBER OF PIECES DRAWN IS THE NUMBER OF PIECES ON ORDER. A picture of a
// cabinet with two hinges on a door the BOM buys three for is worse than no
// picture at all, because it is a picture somebody will believe.
//
// So every case below asks the same question twice — once of
// engine/hardware3d.js and once of result.hardware, which is what the BOM and
// the order form read — and holds them to each other. The cases are the golden
// fixtures' own inputs (BUD-A, W-B, BUDR-A …), so this is checked against the
// same cabinets everything else in the suite is checked against.
//
// The POSITIONS are checked against the drilling: a hinge has to be where the
// machine will bore for it, a runner where the box that runs on it sits.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { hardwareCounts, hardwareInstances } from '../src/engine/hardware3d.js';

const HERE = new URL('.', import.meta.url).pathname;
const fixture = (name) => JSON.parse(readFileSync(join(HERE, '..', 'fixtures', name), 'utf8'));

/** Every golden case, by id, so a test names the cabinet the fixture names. */
const CASES = Object.fromEntries(
  ['golden-bud.json', 'golden-wardrobe.json', 'golden-budr.json']
    .flatMap((file) => fixture(file).cases)
    .map((c) => [c.id, c.inputs]),
);

const run = (id, extra = {}) => computeCabinet({ ...CASES[id], ...extra }, P);

// ─── the contract ───────────────────────────────────────────────────────────

test('what is drawn is what is on order — for every golden cabinet', () => {
  for (const id of Object.keys(CASES)) {
    // Doors are the last step (SPEC 4.10), so the fixtures that carry a hinge
    // side get their doors fitted before the hinges are counted.
    const result = run(id, CASES[id].hinge === undefined ? {} : { doors: true });
    const drawn = hardwareInstances(result, P);
    const ordered = hardwareCounts(result);

    assert.equal(drawn.hinges.length, ordered.hinges, `${id}: hinges drawn = hinges bought`);
    assert.equal(drawn.runners.length, ordered.runners, `${id}: two profiles per pair, and no more`);
    assert.equal(drawn.legs.length, ordered.legs, `${id}: legs`);
    assert.equal(drawn.rails.length, ordered.rails, `${id}: the rail, if it has one`);
  }
});

test('a unit with no doors has no hinges to draw, and says so in both places', () => {
  const bare = computeCabinet({ ...CASES['BUD-A'], doors: false }, P);
  assert.equal(hardwareCounts(bare).hinges, 0);
  assert.deepEqual(hardwareInstances(bare, P).hinges, []);
});

test('a wall unit hangs, so it draws no legs at all', () => {
  const wall = computeCabinet({
    type: 'WUD', width: 600, height: 720, depth: 400, unit_num: 'WU01', doors: { count: 1, hinge: 'R' },
  }, P);
  const drawn = hardwareInstances(wall, P);
  assert.deepEqual(drawn.legs, []);
  assert.equal(drawn.hinges.length, hardwareCounts(wall).hinges);
});

// ─── hinges ─────────────────────────────────────────────────────────────────

test('a hinge is at a row the engine drills, on the side the door is hung from', () => {
  const result = run('BUD-A', { doors: true });
  const { hinges } = hardwareInstances(result, P);
  const rows = result.drillSummary.hinge_centers;

  assert.equal(hinges.length, rows.length, 'one door, one hinge per row');
  for (const h of hinges) {
    assert.ok(rows.includes(h.y), `${h.y} is one of the rows the machine bores — got ${rows}`);
    assert.equal(h.side, 'L', 'BUD-A is hung on the left');
    // The cup is the profile's own distance in from the door's hinge edge.
    assert.equal(h.x, P.doors.gap / 2 + P.hinges.cups.xFromHingeEdge);
    // …and the plate is on the inner face of that side panel, at the distance
    // from the front edge the plate screws are drilled at.
    assert.equal(h.plateX, result.params.board_t);
    assert.equal(h.plateZ, result.params.depth - P.hinges.xFromFrontEdge);
  }
});

test('a pair of doors puts a hinge set on each side, and neither on the other', () => {
  const wide = run('BUD-B', { doors: true });
  const { hinges } = hardwareInstances(wide, P);
  const W = wide.params.width;
  assert.equal(hinges.length, hardwareCounts(wide).hinges);

  const left = hinges.filter((h) => h.side === 'L');
  const right = hinges.filter((h) => h.side === 'R');
  assert.equal(left.length, right.length, 'a pair opens away from each other');
  for (const h of left) assert.ok(h.x < W / 2 && h.plateX === wide.params.board_t);
  for (const h of right) assert.ok(h.x > W / 2 && h.plateX === W - wide.params.board_t);
});

test('a right-hung door puts its cup in from the RIGHT edge', () => {
  const result = computeCabinet({ ...CASES['BUD-A'], hinge: 'R', doors: true }, P);
  const { hinges } = hardwareInstances(result, P);
  const W = result.params.width;
  for (const h of hinges) {
    assert.equal(h.side, 'R');
    assert.equal(h.x, W - P.doors.gap / 2 - P.hinges.cups.xFromHingeEdge);
  }
});

// ─── runners ────────────────────────────────────────────────────────────────

test('a runner is under the box that runs on it, at the row the engine drills', () => {
  for (const id of ['W-A', 'BUDR-A']) {
    const result = run(id, { doors: true });
    const { runners } = hardwareInstances(result, P);
    const rows = result.drillSummary.runner_rows_carcass_y;
    assert.equal(runners.length, rows.length * 2, `${id}: a pair per row`);

    const sides = result.panels.filter((p) => p.part === 'DRAWER-SIDE' && p.box);
    const length = sides[0].box.d;
    const ordered = result.hardware.find((h) => h.role === 'runner_pairs');
    assert.equal(length, ordered.spec.length_mm,
      `${id}: the profile drawn is the profile ordered (${ordered.spec.length_mm} mm)`);

    for (const r of runners) {
      assert.ok(rows.includes(r.y), `${id}: ${r.y} is a runner row`);
      assert.equal(r.length, length);
      assert.equal(r.z, sides[0].box.z, `${id}: it starts where the box starts`);
    }
    // The two profiles are on the two OUTSIDE faces of the box, which on a
    // wardrobe with one drawer panel is not symmetric about the carcass.
    const left = runners.filter((r) => r.side === 'L')[0];
    const right = runners.filter((r) => r.side === 'R')[0];
    assert.ok(left.x < right.x);
    assert.equal(left.x, Math.min(...sides.map((p) => p.box.x)));
    assert.equal(right.x, Math.max(...sides.map((p) => p.box.x + p.box.w)));
  }
});

test('a unit with no drawers draws no runners', () => {
  assert.deepEqual(hardwareInstances(run('BUD-A', { doors: true }), P).runners, []);
});

// ─── legs and the rail ──────────────────────────────────────────────────────

test('the legs are the engine’s own layout — four, or five over the width rule', () => {
  const narrow = hardwareInstances(run('BUD-A'), P).legs;
  assert.equal(narrow.length, P.legs.cornerCount);

  const wide = computeCabinet({ ...CASES['BUD-A'], width: P.legs.extraLegOverWidth + 200 }, P);
  const legs = hardwareInstances(wide, P).legs;
  assert.equal(legs.length, P.legs.cornerCount + 1, 'a fifth in the middle of the footprint');
  assert.equal(legs.length, hardwareCounts(wide).legs, '…and the BOM buys five');

  for (const leg of legs) {
    assert.equal(leg.height, wide.assemblies.carcass.legHeight);
    assert.ok(leg.y < 0, 'a leg is under the carcass');
  }
});

test('the rail is a tube at the profile’s diameter, spanning the internal width', () => {
  const result = run('W-A', { doors: true });
  const { rails } = hardwareInstances(result, P);
  assert.equal(rails.length, 1);
  assert.equal(rails[0].diameter, P.hardware.rail.diameter,
    'the ⌀ comes from profile.hardware — the 3D view used to carry it as a literal');
  assert.equal(rails[0].length, result.assemblies.rail.x2 - result.assemblies.rail.x1);
  assert.equal(rails[0].y, result.assemblies.rail.y);
});

// ─── the catalogue ──────────────────────────────────────────────────────────

test('every hardware size is in the profile, and none of them is zero', () => {
  const HW = P.hardware;
  assert.equal(HW.hinge.cupDiameter, P.hinges.cups.diameter,
    'the cup drawn is the cup drilled — one diameter, in two places that must agree');
  for (const [group, values] of Object.entries(HW)) {
    for (const [key, value] of Object.entries(values)) {
      // Turn 18 (CLAUDE.md F6): `runner.movento` is the CATALOGUE — a bucket
      // path, a variant list, an article system — and not a size. The sizes
      // beside it are still held to the rule.
      if (value && typeof value === 'object') continue;
      assert.ok(Number(value) > 0, `hardware.${group}.${key} is a real millimetre`);
    }
  }
  // …and the runner catalogue's own MILLIMETRES are held to it separately.
  const rod = HW.runner.movento.rod;
  for (const key of ['unitAloneBelow', 'endAllowance', 'diameter']) {
    assert.ok(Number(rod[key]) > 0, `hardware.runner.movento.rod.${key} is a real millimetre`);
  }
  for (const range of [rod.narrow, rod.withAdapters]) {
    assert.equal(range.length, 2);
    assert.ok(range[0] > 0 && range[1] > range[0], 'a range runs upwards');
  }
});

test('a leg is a plate, a stem and a foot, and they add up to the leg height', () => {
  const L = P.hardware.leg;
  const height = P.baseUnit.legHeight;
  assert.ok(L.plateThickness + L.footHeight < height,
    'there is room for a stem between the plate and the foot at the standard toe kick');
  assert.ok(L.footDiameter > L.stemDiameter, 'the foot is wider than the stem it is on');
});
