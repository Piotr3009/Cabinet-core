// ─── TURN 30 F9 — one cornice across a multi-selection ─────────────────────
//
// CLAUDE.md: "Today cornice is per-cabinet; the infill already knows
// multi-select. Reuse that flow: select 2+ → one cornice across. Same design
// layer, no drilling."
//
// ─── WHAT WAS ACTUALLY MISSING ──────────────────────────────────────────────
//
// Not the run. `engine/cornice.js runCorniceParams` has made a cornice ONE
// MOULDING across adjacent cornice-bearing cabinets since turn 22 — the top
// infill's own lesson from turn 6 — and not a line of it is touched here.
//
// What was missing was the ENTRANCE. A joiner who had just selected six tall
// units had to open each one's panel and press its own button six times, and
// six presses is six undo steps. So this is the per-unit control's own three
// buttons, over a selection, through the per-unit ACTION, in one batch.
//
// That is what "reuse that flow" means, and it is why this file is short: the
// piece, its length, its mitres, its returns and its ceiling clamp are all
// turn 22's and are asserted here to be UNCHANGED rather than re-derived.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { useProjectStore } from '../src/stores/projectStore.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { corniceOption, takesCornice } from '../src/engine/cornice.js';

const store = () => useProjectStore.getState();
const HEIGHTS = P.autoParts.cornice.heights;

function project() {
  store().loadProject({
    id: null,
    name: 'cornice run',
    room: migrateRoom({ height: 2500, corners: rectCorners(8000, 3000) }),
    design: {},
  }, []);
}

/** A run of cornice-bearing cabinets, side by side. */
function run(n = 3, type = 'BUDTALL') {
  project();
  const ids = [];
  let near = null;
  for (let i = 0; i < n; i += 1) {
    const u = near ? store().addUnit(type, { near, side: 'right' }) : store().addUnit(type);
    ids.push(u.id);
    near = u.id;
  }
  return ids;
}

const unitOf = (id) => store().units.find((u) => u.id === id);
const corniceOf = (id) => corniceOption(unitOf(id)?.params.cornice, P);

// ─── THE ENTRANCE ───────────────────────────────────────────────────────────

test('F9 one press puts a cornice on every cabinet in the selection', () => {
  const ids = run(3);
  assert.ok(ids.every((id) => takesCornice(unitOf(id).type)), 'the kit takes one');
  const res = store().setCorniceBulk(ids, HEIGHTS[0]);
  assert.equal(res.done, 3);
  assert.equal(res.skipped, 0);
  for (const id of ids) assert.equal(corniceOf(id), HEIGHTS[0]);
});

test('F9 …and one press takes it off again', () => {
  const ids = run(3);
  store().setCorniceBulk(ids, HEIGHTS[1]);
  assert.ok(ids.every((id) => corniceOf(id) === HEIGHTS[1]));
  store().setCorniceBulk(ids, 0);
  for (const id of ids) assert.equal(corniceOf(id), 0);
});

test('F9 a kit that takes NO cornice is SKIPPED, not refused', () => {
  // Somebody who selected a run with a base unit in it has not asked for a
  // moulding on the base unit — the same courtesy the back inset shows a wall
  // unit (turn 28, F9).
  project();
  const tall = store().addUnit('BUDTALL');
  const base = store().addUnit('BUD');
  const res = store().setCorniceBulk([tall.id, base.id], HEIGHTS[0]);
  assert.equal(res.done, 1);
  assert.equal(res.skipped, 1);
  assert.equal(corniceOf(tall.id), HEIGHTS[0]);
  assert.equal(corniceOf(base.id), 0);
});

test('F9 it is ONE undo step, because it is the single-unit action in one batch', () => {
  const store300 = readFileSync(new URL('../src/stores/projectStore.js', import.meta.url), 'utf8');
  const at = store300.indexOf('setCorniceBulk: (unitIds, value) =>');
  assert.ok(at > 0, 'the bulk action is there');
  const body = store300.slice(at, at + 900);
  // runBatch is what every other bulk action in this store uses, and it is
  // what makes "one undo step" true without anybody remembering to make it so.
  assert.match(store300.slice(at - 40, at + 60), /runBatch\(/);
  assert.match(body, /get\(\)\.setCornice\(id, value\)/, 'the SINGLE-unit action, repeated');
  // …and NOT a second implementation of the piece.
  assert.doesNotMatch(body, /runCorniceParams|corniceProjection|corniceSection/);
});

// ─── THE PIECE ITSELF IS TURN 22'S, AND IS UNTOUCHED ───────────────────────

test('F9 the RUN is not re-derived: one moulding across adjacent cabinets, as before', () => {
  const ids = run(3);
  store().setCorniceBulk(ids, HEIGHTS[0]);
  // `refreshAutoParts` (called by `setCornice`) writes the run onto each unit
  // in turn 22's own shape: ONE OWNER carrying the whole moulding, and the
  // rest MEMBERS pointing at it. That shape is what "one moulding across the
  // run" is, and it is exactly what a bulk press must produce.
  const runs = ids.map((id) => store().runElements[id]?.cornice ?? null);
  assert.ok(runs.every(Boolean), 'every cabinet carries the run');
  const owners = runs.filter((r) => r.role === 'owner');
  assert.equal(owners.length, 1, 'ONE moulding, not three');
  assert.deepEqual(owners[0].unitIds, ids, 'and it spans all of them');
  assert.equal(owners[0].length, 1800, 'one length across three 600s');
  for (const r of runs.filter((x) => x.role !== 'owner')) {
    assert.equal(r.role, 'member');
    assert.equal(r.ownerId, ids[0], 'pointing at the one that carries it');
  }
});

test('F9 the moulding needs something to be fixed to, and asking still asks for it', () => {
  // Turn 22's own consequence, unchanged: a cornice asks for at least the
  // profile's 40 mm of top infill, through the same `setTopInfill` the drag
  // uses. A bulk press must not lose that.
  const ids = run(2);
  assert.ok(ids.every((id) => !(Number(unitOf(id).params.top_infill_mm) > 0)));
  store().setCorniceBulk(ids, HEIGHTS[0]);
  for (const id of ids) {
    assert.ok(Number(unitOf(id).params.top_infill_mm) >= P.autoParts.cornice.infillHeight,
      `${id}: ${unitOf(id).params.top_infill_mm} mm of infill under it`);
  }
});

test('F9 a stored height this workshop does not buy is still ignored, in bulk too', () => {
  const ids = run(2);
  store().setCorniceBulk(ids, 85);
  for (const id of ids) assert.equal(corniceOf(id), 0, '85 is not a moulding this shop stocks');
});

// ─── NO DRILLING, SAME DESIGN LAYER ────────────────────────────────────────

test('F9 no drilling: a cornice reaches no hole, in bulk or singly', () => {
  const ids = run(2);
  const before = store().unitResult(ids[0]);
  const holes = before.drills.length;
  store().setCorniceBulk(ids, HEIGHTS[1]);
  const after = store().unitResult(ids[0]);
  // The top infill the cornice asks for is a PANEL and appears; not one hole
  // is added by the moulding itself.
  assert.equal(after.drills.length, holes, 'the drilling is what it was');
  assert.equal(after.drills.filter((d) => /cornice/i.test(d.kind || '')).length, 0);
});

// ─── THE CONTROL ────────────────────────────────────────────────────────────

test('F9 the control is the per-unit one’s own three buttons, over a selection', () => {
  const panel = readFileSync(new URL('../src/components/MultiUnitPanel.jsx', import.meta.url), 'utf8');
  assert.match(panel, /data-bulk-cornice="1"/);
  assert.match(panel, /data-bulk-cornice-height=\{h\}/);
  // The SAME list the per-unit control offers — the profile's, not a copy.
  assert.match(panel, /\[0, \.\.\.profile\.autoParts\.cornice\.heights\]/);
  assert.match(panel, /setCorniceBulk\(ids, h\)/);
  // It says how many of the selection take one, and it says what it skipped.
  assert.match(panel, /\{corniceable\} of \{ids\.length\} take one/);
  assert.match(panel, /take no cornice/);
  // …and a selection that disagrees says nothing rather than picking one
  // cabinet's answer — `commonValue` is the tested helper every other shared
  // field in this panel uses.
  assert.match(panel, /const corniceCommon = commonValue\(/);
});

test('F9 the per-unit control is untouched — this is an ENTRANCE, not a move', () => {
  const right = readFileSync(new URL('../src/components/RightPanel.jsx', import.meta.url), 'utf8');
  assert.match(right, /data-cornice-options="1"/, 'the per-cabinet control is still there');
  assert.match(right, /setCornice\(unit\.id, h\)/);
});
