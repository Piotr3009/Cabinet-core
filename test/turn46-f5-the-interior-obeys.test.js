import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { runChecks, CHECKS } from '../src/engine/checks.js';
import { useProjectStore, paramsForEngine } from '../src/stores/projectStore.js';

// ─── TURN 46 · F5 — THE INTERIOR OBEYS THE LINE, LIVE ───────────────────────
//
// CLAUDE.md F5:
//   *"Shelves exist only where their FULL span sits below the cut line (a shelf
//   may not pierce the diagonal). The rail (ALONE or assembly) shortens exactly
//   as the bay law already cuts it at partitions — here the boundary is the x
//   where the line meets the rail's y; below the meeting point the rod ends.
//   Drawers: forbidden in the zone (F4)."*
//   *"Live: drag end re-runs the engine (the same pos_mm path every drag uses)
//   — the cabinet re-cuts itself as it arrives under the slope."*

const PARAMS = { ...defaultParamsFor('WARDROBE', P), unit_num: '01' };
const CUT = { y0: 2400, y1: 1200, infill: 40 };

// ═══ SHELVES ════════════════════════════════════════════════════════════════

test('a shelf whose FULL SPAN clears the line is cut; one that pierces it is not', () => {
  const r = computeCabinet({ ...PARAMS, shelves: 4, slope_cut: CUT }, P);
  const ids = r.panels.filter((p) => p.part === 'SHELF').map((p) => p.id);
  assert.deepEqual(ids, ['SHELF-1', 'SHELF-2'], 'the two under the line survive');
  const refused = r.warnings.filter((w) => w.code === 'SLOPE_SHELF_CROSSES').map((w) => w.panel);
  assert.deepEqual(refused, ['SHELF-3', 'SHELF-4']);
  // …and every shelf is there when there is no cut.
  const plain = computeCabinet({ ...PARAMS, shelves: 4 }, P);
  assert.equal(plain.panels.filter((p) => p.part === 'SHELF').length, 4);
});

test('the question is asked at the WORST END of the span, never at the middle', () => {
  // The line falls to 1240 at the shelf's right-hand end and is 2382 at its
  // left. A shelf at 1500 clears the MIDDLE of the diagonal (1811) and is still
  // sawn in half by the plaster at its right end — so it does not exist.
  const r = computeCabinet({
    ...PARAMS,
    items: [{ kind: 'shelf', id: 's1', pos_mm: 1500 }],
    slope_cut: CUT,
  }, P);
  assert.equal(r.panels.filter((p) => p.part === 'SHELF').length, 0);
  const said = r.warnings.find((w) => w.code === 'SLOPE_SHELF_CROSSES');
  assert.match(said.message, /would pierce the slope/);
  assert.match(said.message, /at the low end of its span/);
});

test('it is the shelf\'s TOP face that must clear — the board has a thickness', () => {
  // The ceiling over the span is 1240. A 1200 mm shelf 18 thick tops out at
  // 1218 and survives; move it to 1230 and its top is 1248 — 8 mm into the
  // plaster — and it does not.
  const under = computeCabinet({
    ...PARAMS,
    items: [{ kind: 'shelf', id: 's1', pos_mm: 1200 }],
    slope_cut: CUT,
  }, P);
  assert.equal(under.panels.filter((p) => p.part === 'SHELF').length, 1);
  const over = computeCabinet({
    ...PARAMS,
    items: [{ kind: 'shelf', id: 's1', pos_mm: 1230 }],
    slope_cut: CUT,
  }, P);
  assert.equal(over.panels.filter((p) => p.part === 'SHELF').length, 0);
});

test('#21 names the shelves that are missing, in red', () => {
  const row = CHECKS.find((c) => c.n === 21);
  assert.equal(row.level, 'red');
  const unit = { id: 'u1', type: 'WARDROBE', params: { unit_num: '01', width: 600 }, position: { wall: 0, x_mm: 0 } };
  const result = computeCabinet({ ...PARAMS, shelves: 4, slope_cut: CUT }, P);
  const found = runChecks({ entries: [{ unit, result }], units: [unit], profile: P })
    .filter((f) => f.check === 21);
  assert.equal(found.length, 2, 'one per missing board — a joiner is never quietly short');
  assert.equal(found[0].level, 'red');
  // A refused shelf was never cut, so there is no panel to fly to.
  assert.deepEqual(found[0].subject, { unitId: 'u1', editor: 'cabinet' });
});

// ═══ THE RAIL ═══════════════════════════════════════════════════════════════

const railParams = {
  ...PARAMS, rail: true, rail_offset: 1400,
};

test('the rod ends where the line meets its own y — the bay law, one axis over', () => {
  const plain = computeCabinet(railParams, P).assemblies.rail;
  assert.deepEqual([plain.x1, plain.x2], [18, 582]);
  const cutRail = computeCabinet({ ...railParams, slope_cut: CUT }, P).assemblies.rail;
  // line(x) = 2400 − 2x; the rod hangs at 1418, so they meet at x = 491.
  assert.equal(cutRail.y, 1418);
  assert.equal(cutRail.x1, 18, 'the tall end is untouched');
  assert.equal(cutRail.x2, 491, 'and the rod stops exactly where the ceiling reaches it');
  assert.deepEqual(cutRail.slopeCut, { was: [18, 582], now: [18, 491], lost: 91 });
});

test('…mirrored, and dropped entirely when the ceiling is under it all the way', () => {
  const mirror = computeCabinet({
    ...railParams, slope_cut: { y0: 1200, y1: 2400, infill: 40 },
  }, P).assemblies.rail;
  assert.equal(mirror.x2, 582, 'the tall end is on the right now');
  assert.equal(mirror.x1, 109);
  const drowned = computeCabinet({
    ...railParams, slope_cut: { y0: 1000, y1: 600, infill: 40 },
  }, P).assemblies.rail;
  assert.equal(drowned, null, 'a rod with no span is not a rod');
});

test('a rod entirely under the line keeps the SAME object it always had', () => {
  const high = computeCabinet({
    ...railParams, slope_cut: { y0: 2400, y1: 2000, infill: 40 },
  }, P).assemblies.rail;
  assert.equal(high.slopeCut, undefined, 'nothing to say, so nothing said');
  assert.deepEqual([high.x1, high.x2], [18, 582]);
});

// ═══ LIVE ═══════════════════════════════════════════════════════════════════

test('LIVE: the same pos_mm path every drag uses re-cuts the cabinet', () => {
  const store = useProjectStore.getState();
  store.newProject({ name: 'T46 F5' });
  useProjectStore.setState((st) => ({
    project: {
      ...st.project,
      room: {
        ...st.project.room,
        corners: [
          { x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 3000 }, { x: 0, y: 3000 },
        ],
        height: 2500,
      },
      design: { ...st.project.design, infill: { ...st.project.design.infill, sideWidth: 40 } },
      wallSlopes: [{
        id: 's1', kind: 'slope', wall: 0, side: 'R', startHeight: 300, run: 900,
      }],
    },
  }));
  const added = useProjectStore.getState().addUnit('WARDROBE', { wall: 0, x_mm: 100 });
  const id = added.id ?? added;
  useProjectStore.getState().updateUnitParams(id, { width: 600 });

  // OUT of the zone: no key at all, and the cabinet is the one the kit cuts.
  useProjectStore.getState().moveUnit(id, 100, 1);
  const outside = useProjectStore.getState().units.find((u) => u.id === id);
  assert.equal('slope_cut' in paramsForEngine(outside), false,
    'no slope over this stretch of wall, so nothing is handed down');
  const before = useProjectStore.getState().unitResult(id);
  assert.equal(before.panels.find((p) => p.id === 'BUR').h, before.params.height);

  // DRAG IT UNDER — the same setter the pointer drives.
  useProjectStore.getState().moveUnit(id, 3900, 1);
  const inside = useProjectStore.getState().units.find((u) => u.id === id);
  const params = paramsForEngine(inside);
  assert.ok(params.slope_cut, 'the cut is resolved on the way into the engine');
  // T47 (licence 1): the two heights are the line's two ENDS now.
  const pts = params.slope_cut.pts;
  assert.ok(pts[0].y > pts[pts.length - 1].y, 'the ceiling falls to the right');
  const after = useProjectStore.getState().unitResult(id);
  const bur = after.panels.find((p) => p.id === 'BUR');
  assert.ok(bur.h < after.params.height, `the far side is cut: ${bur.h} of ${after.params.height}`);
  assert.ok(bur.meta.slopeCut, 'and its fingerprint carries the cut');
  // A wardrobe added through the store starts with no doors on it (the door
  // control is opt-in), so the FRONT is asked for by name here rather than
  // assumed — F4's own tests drive the leaf itself.
  useProjectStore.getState().updateUnitParams(id, { doors: 1 });
  const withDoor = useProjectStore.getState().unitResult(id);
  const front = withDoor.panels.find((p) => p.part === 'FRONT');
  assert.ok(front, 'the leaf is there once it is asked for');
  assert.equal(front.meta.hingeForced, true, 'and its hand is forced by the slope');
  assert.ok(front.cnc.outline.length >= 4);
  assert.ok(front.meta.slopeCut, 'the door is cut with the carcass');

  // DRAG IT BACK OUT — and the key is gone again. Nothing stored, nothing to
  // invalidate: the cut is re-derived on every compute.
  useProjectStore.getState().moveUnit(id, 0, 1);
  const back = useProjectStore.getState().units.find((u) => u.id === id);
  assert.equal('slope_cut' in paramsForEngine(back), false);
  const restored = useProjectStore.getState().unitResult(id);
  assert.equal(restored.panels.find((p) => p.id === 'BUR').h, restored.params.height);
  assert.equal(restored.panels.find((p) => p.id === 'BUR').meta?.slopeCut, undefined);
});

test('a unit on a wall with NO slope never carries the key', () => {
  const units = useProjectStore.getState().units;
  for (const u of units) {
    const moved = { ...u, position: { ...u.position, wall: 1 } };
    assert.equal('slope_cut' in paramsForEngine(moved), false);
  }
});
