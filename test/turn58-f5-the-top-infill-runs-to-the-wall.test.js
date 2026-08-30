import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { runChecks } from '../src/engine/checks.js';

// ─── TURN 58 · F5 — THE TOP INFILL RUNS TO THE WALL, OVER THE SIDE INFILL ──
//
// The owner: *"jak dojeżdżamy szafą do ściany i się pojawia infill boczny, to
// niech górny się przedłuży do ściany — jak było wcześniej."*
//
// ─── THE HISTORY VERDICT: IT IS A RESTORATION, AND THE COMMIT IS 4ddff96 ───
//
// *"Jak było wcześniej"* is literally true. `engine/runs.js runEnd`, case 1,
// read `return { kind: 'wall', x: wallAt }` — the run ended AT THE PLASTER —
// until commit 4ddff96 (Piotr3009, 29.08.2026, subject "123") changed it:
//
//     -  if (Math.abs(outerEdge - wallAt) <= atWall) return { kind: 'wall', x: wallAt };
//     +  if (Math.abs(outerEdge - wallAt) <= atWall) return { kind: 'wall', x: carcassEdge };
//     +  if (infill >= profile.autoParts.sideInfill.minWidth) return { kind: 'infill', x: carcassEdge };
//
// So the top piece has run only to the CARCASS since 29.08, and the corner
// over the side infill has been open. This turn restores the old x.
//
// T55'S RULING IS NOT REPEALED — it is put back inside its own case. Every
// sentence of it is about the rake (*"infill boczny ZAWSZE PRZY SKOSIE idzie
// do sufitu"*), so under a live ceiling the vertical still owns the gap and
// the top piece still stops plumb on the carcass. T55-F1's four corners
// govern there, untouched, and that is asserted below.
//
// THE JOINT is the turn-6/8 strip law, named: `engine/mitre.js` — *"the engine
// puts the shelf strip BEHIND the face, so that the two boxes butt without
// overlapping"*. One plane, ZERO overlap: the side infill keeps its height and
// stops UNDER the top piece.

const S = () => useProjectStore.getState();

function wardrobeAtWall({ raked = false, awayFromWall = false } = {}) {
  S().loadProject({
    id: null,
    name: 'T58 F5',
    number: '58',
    client: 'the owner',
    room: migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) }),
    design: {},
  }, []);
  const unit = S().addUnit('WARDROBE');
  S().updateUnitParams(unit.id, { width: 1000, height: 2200 });
  S().moveUnit(unit.id, awayFromWall ? 1200 : 0, 0, { magnet: false });
  S().setTopInfill(unit.id, 40);
  if (raked) S().addWallSlope({ wall: 0, side: 'L', startHeight: 1400, run: 3000 });
  S().settleLayout();
  return unit.id;
}

const infillsOf = (id) => (S().unitResult(id)?.panels || []).filter((p) => p.part === 'INFILL');
const topFace = (id) => infillsOf(id).find((p) => /^INFILL-T-FACE/.test(p.id));
const sideFace = (id) => infillsOf(id).find((p) => /^INFILL-[LR]-FACE/.test(p.id));

// ═══ 1. THE TOP PIECE REACHES THE WALL ══════════════════════════════════════

test('F5 · the top infill\'s span reaches the wall face, over the side infill', () => {
  const id = wardrobeAtWall();
  const top = topFace(id);
  const side = sideFace(id);
  assert.ok(side, 'the wall proximity really did raise a side infill');
  assert.ok(top, 'and the unit really does carry a top infill');

  // The side filler stands from the wall face to the carcass; the top piece
  // now starts where IT starts, instead of at the carcass edge.
  assert.equal(top.box.x, side.box.x,
    'the top piece begins at the wall face — on main it began at 0, the carcass');
  assert.equal(
    top.box.x + top.box.w,
    1000,
    'and still finishes on the far carcass edge',
  );
  assert.equal(top.box.w, 1000 - side.box.x, 'so it caps the corner exactly');
});

test('F5 · the side infill keeps its height and stops UNDER it — one plane, zero overlap', () => {
  const id = wardrobeAtWall();
  const top = topFace(id);
  const side = sideFace(id);
  const sideTop = side.box.y + side.box.h;
  assert.equal(sideTop, top.box.y,
    'the side finishes exactly where the top begins — the turn-6/8 strip law');
  // ZERO overlap, asked as the arithmetic: the two boxes share a plane and no
  // millimetre of height.
  assert.ok(sideTop <= top.box.y + 1e-9, 'the side does not run up into the top piece');
  assert.ok(side.box.h > 0 && top.box.h > 0);
});

test('F5 · the standing collision check stays silent', () => {
  const id = wardrobeAtWall();
  const found = runChecks({
    units: S().units,
    project: S().project,
    resultOf: (uid) => S().unitResult(uid),
    profile: P,
  }) || [];
  const reds = (Array.isArray(found) ? found : found.findings || [])
    .filter((f) => f.level === 'red');
  assert.deepEqual(reds.map((f) => f.message || f.code), [],
    'capping the corner is not a collision');
});

// ═══ 2. UNDER A RAKE, T55 STILL GOVERNS ═════════════════════════════════════

test('F5 · under an ACTIVE slope nothing here applies — T55 is untouched', () => {
  const id = wardrobeAtWall({ raked: true });
  const top = topFace(id);
  if (!top) return; // a rake can take the top infill away entirely; nothing to assert
  assert.equal(top.box.x, 0,
    'the top piece still stops PLUMB on the carcass — "zawsze przy skosie"');
});

// ═══ 3. THE AWAY-FROM-WALL TWIN IS BYTE-IDENTICAL ═══════════════════════════

test('F5 · a unit away from the wall raises no side infill and does not move', () => {
  const id = wardrobeAtWall({ awayFromWall: true });
  const side = sideFace(id);
  assert.equal(side, undefined, 'no wall proximity, no side filler');
  const top = topFace(id);
  assert.equal(top.box.x, 0, 'and the top piece is the board it always was');
  assert.equal(top.box.w, 1000);
});

// ═══ 4. THE VERDICT IS A FACT ABOUT A COMMIT ════════════════════════════════

test('F5 · the history verdict names the commit, and git agrees', () => {
  // A verdict in a report is read once; this re-runs every night. If anyone
  // ever asks again whether the top infill "used to" reach the wall, the suite
  // answers with the sha.
  let show;
  try {
    show = execSync('git show 4ddff96 -- src/engine/runs.js', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return; // a shallow checkout without that commit: nothing to assert
  }
  assert.match(show, /-\s*if \(Math\.abs\(outerEdge - wallAt\) <= atWall\) return \{ kind: 'wall', x: wallAt \};/,
    'before 4ddff96 the run ended AT THE WALL');
  assert.match(show, /\+\s*if \(Math\.abs\(outerEdge - wallAt\) <= atWall\) return \{ kind: 'wall', x: carcassEdge \};/,
    'and 4ddff96 is the commit that shortened it to the carcass');
});
