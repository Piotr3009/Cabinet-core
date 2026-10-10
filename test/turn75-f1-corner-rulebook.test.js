// ─── T75 · F1 · THE CORNER RULEBOOK, ONE MODULE ────────────────────────────
//
// CLAUDE.md T75 F1: *"New `engine/corners.js`, pure: `cornersOf({ units,
// walls, profile })` returns every INTERNAL corner where a run on one wall
// meets a run on the adjacent wall whose depth bands overlap ... as `{ corner,
// wallA, wallB, runA, runB, solution }` ... `'none'` is a CHECK, in words,
// naming both units: the engine never guesses a post for a job that has not
// asked for one ... Every consumer below ... reads THIS module. No second
// corner detection anywhere."*
//
// The owner, 9.10.2026: *"daj od razu narożniki przemyślane."*

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  cornersOf, cornerChecks, cornerFaceMm, cornerStopMm, cornerSpec, isInternalCorner, carcassReachMm,
} from '../src/engine/corners.js';
import { roomWalls, rectCorners, lCorners } from '../src/engine/room.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

const ROOT = new URL('../', import.meta.url).pathname;
const walls = roomWalls({ corners: rectCorners(4000, 3000) });
const bud = (id, wall, x, extra = {}) => ({
  id,
  type: 'BUD',
  params: { width: 600, height: 770, depth: 558, front_t: P.front.thickness, unit_num: id, ...extra },
  position: { wall, x_mm: x },
});
const face = 10 + 558 + P.doors.gap + P.front.thickness;

test('F1 · the face and the stop are one sum: wall gap + depth + door gap + front, then the post', () => {
  const u = bud('a', 0, 0);
  assert.equal(cornerFaceMm(u, P), face);
  assert.equal(carcassReachMm(u, P), 10 + 558);
  assert.equal(cornerStopMm(u, P), face + cornerSpec(P).postMm);
});

test('F1 · a rectangle has four internal corners and no outside one', () => {
  for (let i = 0; i < 4; i += 1) assert.ok(isInternalCorner(walls[i], walls[(i + 1) % 4]), `corner ${i}`);
  const L = roomWalls({ corners: lCorners(5000, 4000, 2000, 1500) });
  const internal = L.map((w, i) => isInternalCorner(w, L[(i + 1) % L.length]));
  assert.equal(internal.filter(Boolean).length, 5, 'an L room has five internal corners');
  assert.equal(internal.filter((v) => !v).length, 1, '...and one that turns away');
});

test('F1 · the occupant is wall A, whichever wall it is on', () => {
  // A on wall 0 runs into its end; B on wall 1 stands beyond A's face.
  const one = cornersOf({ units: [bud('a', 0, 4000 - 600 - 10), bud('b', 1, face + 50)], walls, profile: P });
  assert.equal(one.length, 1);
  assert.equal(one[0].wallA, 0);
  assert.equal(one[0].wallB, 1);
  assert.equal(one[0].runA.unitId, 'a');
  assert.equal(one[0].runA.side, 'right');
  assert.equal(one[0].runB.unitId, 'b');
  assert.equal(one[0].runB.side, 'left');
  assert.equal(one[0].stopMm, face + 50);
  // Turned round: the unit on wall 1 runs into the corner, the one on wall 0 stops.
  const two = cornersOf({ units: [bud('a', 0, 4000 - 600 - face - 50), bud('b', 1, 10)], walls, profile: P });
  assert.equal(two.length, 1);
  assert.equal(two[0].wallA, 1);
  assert.equal(two[0].runA.unitId, 'b');
  assert.equal(two[0].runA.side, 'left');
  assert.equal(two[0].runB.unitId, 'a');
  assert.equal(two[0].runB.side, 'right');
});

test('F1 · two plain units and no post is NONE, a Check in words naming both', () => {
  const corners = cornersOf({ units: [bud('A01', 0, 4000 - 610), bud('B01', 1, face + 50)], walls, profile: P });
  assert.equal(corners[0].solution, 'none');
  const checks = cornerChecks(corners);
  assert.equal(checks.length, 1);
  assert.match(checks[0].message, /A01 and B01/);
  assert.match(checks[0].message, /cannot open/);
});

test('F1 · the post the job asked for makes it POST; the engine never guesses one', () => {
  const posted = cornersOf({
    units: [bud('a', 0, 4000 - 610), bud('b', 1, face + 50, { corner_post_left_mm: 50 })], walls, profile: P,
  });
  assert.equal(posted[0].solution, 'post');
  assert.equal(cornerChecks(posted).length, 0);
});

test('F1 · units far from a corner, or at another height, do not meet', () => {
  assert.equal(cornersOf({ units: [bud('a', 0, 1000), bud('b', 1, 1500)], walls, profile: P }).length, 0);
  const wall = { ...bud('w', 1, face + 50), type: 'WUD', params: { width: 600, height: 720, depth: 350, mount_height: 1500 } };
  assert.equal(cornersOf({ units: [bud('a', 0, 4000 - 610), wall], walls, profile: P }).length, 0,
    'a wall unit over a base unit is not the base run turning the corner');
});

test('F1 · ONE corner detection: no other engine file re-derives a corner from two walls', () => {
  // The rulebook is the only file that asks `isInternalCorner`; consumers import it.
  const engine = join(ROOT, 'src/engine');
  const files = readdirSync(engine).filter((f) => f.endsWith('.js') && f !== 'corners.js');
  for (const f of files) {
    const text = readFileSync(join(engine, f), 'utf8');
    assert.ok(!/function\s+isInternalCorner|function\s+cornersOf\s*\(\s*\{/.test(text), `${f} re-derives the corner`);
  }
});

test('F1 · the Check reads the rulebook: #27, red, both units named', async () => {
  const { runChecks, CHECKS } = await import('../src/engine/checks.js');
  const row = CHECKS.find((c) => c.n === 27);
  assert.equal(row.level, 'red');
  const findings = runChecks({
    entries: [],
    units: [bud('A01', 0, 4000 - 610), bud('B01', 1, face + 50)],
    room: { corners: rectCorners(4000, 3000), height: 2500 },
    profile: P,
  }).filter((f) => f.check === 27);
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /A01 and B01 meet in the corner/);
  assert.deepEqual(findings[0].cornerUnitIds, ['A01', 'B01']);
  // No room, no corners: a bare engine call has nothing to report.
  assert.equal(runChecks({ entries: [], units: [bud('A01', 0, 3390)], profile: P }).filter((f) => f.check === 27).length, 0);
});
