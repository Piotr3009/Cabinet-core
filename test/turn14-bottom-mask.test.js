// ─── Turn 14, F5: the bottom masking panel (#45, specified) ─────────────────
//
// One continuous panel under a RUN of wall units. It is the PLINTH at the other
// end of the kitchen and CLAUDE.md says so in as many words — "run-based like
// the plinth… reuse the run logic" — so it is the same three functions with two
// differences a joiner would name: it is for HANGING cabinets, and the number
// that is not its length is a DEPTH rather than a height.
//
// The fixture is `fixtures/golden-wall-mask.json`. There is no AutoLISP for this
// part, so the source of truth is the owner's own specification, quoted in the
// fixture and traced into numbers there — which is the same footing the
// variable drawer heights have stood on since turn 2.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { useProjectStore, paramsForEngine } from '../src/stores/projectStore.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { maskDepthExtra, maskSegments, buildRuns } from '../src/engine/runs.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { buildBom } from '../src/engine/bom.js';
import { elementKind, elementLabel, opensOwnModal } from '../src/engine/elements.js';

const GOLDEN = JSON.parse(readFileSync(new URL('../fixtures/golden-wall-mask.json', import.meta.url)));
const caseOf = (id) => GOLDEN.cases.find((c) => c.id === id);

const store = () => useProjectStore.getState();
const WALL = 6000;

function project() {
  store().loadProject({
    id: null,
    name: 'mask',
    room: migrateRoom({ height: 2500, corners: rectCorners(WALL, 3000) }),
    design: {},
  }, []);
}

const unitOf = (id) => store().units.find((u) => u.id === id);
const resultOf = (id) => computeCabinet(paramsForEngine(unitOf(id)), P);
const maskOf = (id) => resultOf(id).panels.find((p) => p.part === 'MASK') || null;

/** `n` wall units butted from `x`, each asking for the board. */
function wallRun(n, x = 500, step = 600) {
  const ids = [];
  for (let i = 0; i < n; i += 1) {
    const { id, error } = store().addUnit('WUD');
    assert.equal(error, null, error || '');
    // The fixture's cases are 600 × 300 wall units; the kit's own default is
    // deeper, and the depth is what the board's width is measured off.
    store().updateUnitParams(id, { depth: 300 });
    store().moveUnit(id, x + i * step, 0);
    ids.push(id);
  }
  for (const id of ids) assert.equal(store().addBottomMask(id), true);
  return ids;
}

// ─── MASK-A: one cabinet, every number off the fixture ──────────────────────

test('F5 — MASK-A: the panel is length × (depth + the wall standoff), in front material', () => {
  const c = caseOf('MASK-A');
  const r = computeCabinet({ ...defaultParamsFor('WUD', P), ...c.inputs }, P);
  const mask = r.panels.find((p) => p.part === 'MASK');
  assert.ok(mask, 'the panel exists once it is asked for');

  for (const key of ['id', 'part', 'role', 'material_role', 'finish_exposed', 'w', 'h', 'thickness', 'qty']) {
    assert.deepEqual(mask[key], c.panel[key], `${key}`);
  }
  assert.equal(mask.edging.code, c.panel.edging.code);
  assert.equal(mask.edging.len_m, c.panel.edging.len_m);
  assert.equal(mask.area_m2, c.panel.area_m2);
  assert.deepEqual(mask.box, c.panel.box);

  // …and the ten millimetres are the ones the spec names.
  assert.equal(mask.h - c.inputs.depth, maskDepthExtra(P));
  assert.equal(maskDepthExtra(P), P.room.wallBackClearance);
});

test('F5 — it exists only when somebody asks: no ghost row in the cut list', () => {
  const bare = computeCabinet({ ...defaultParamsFor('WUD', P), unit_num: 'W01' }, P);
  assert.equal(bare.panels.filter((p) => p.part === 'MASK').length, 0);
});

test('F5 — MASK-F: a base unit is refused — it has a worktop on it and a plinth under it', () => {
  const c = caseOf('MASK-F');
  const r = computeCabinet({ ...defaultParamsFor('BUD', P), ...c.inputs }, P);
  assert.equal(r.panels.filter((p) => p.part === 'MASK').length, c.expected.panels);
  project();
  const { id } = store().addUnit('BUD');
  assert.equal(store().addBottomMask(id), false, 'and the store says so rather than writing the flag');
});

// ─── the RUN: one board, not one per carcass ───────────────────────────────

test('F5 — MASK-B: three butted wall units carry ONE board of 1800', () => {
  project();
  const c = caseOf('MASK-B');
  const ids = wallRun(3);
  const owner = maskOf(ids[0]);
  assert.ok(owner, 'the first unit carries the geometry');
  assert.equal(owner.w, c.expected.w, 'ONE piece for the whole run, not three of 600');
  assert.equal(owner.h, c.expected.h);
  assert.equal(owner.area_m2, c.expected.area_m2);
  assert.equal(owner.edging.len_m, c.expected.edging_len_m);
  assert.equal(owner.meta.run, true);
  assert.deepEqual(owner.meta.unitIds, ids);
  for (const id of ids.slice(1)) {
    assert.equal(maskOf(id), null, 'and the members cut nothing of their own');
  }
});

test('F5 — MASK-C: docking a fourth unit EXTENDS the board', () => {
  project();
  const c = caseOf('MASK-C');
  const ids = wallRun(3);
  assert.equal(maskOf(ids[0]).w, 1800);
  const fourth = wallRun(1, 500 + 3 * 600)[0];
  assert.equal(maskOf(ids[0]).w, c.expected.w, 'the same board, longer');
  assert.equal(maskOf(fourth), null, 'the newcomer joined the run rather than starting one');
  assert.equal(maskOf(ids[0]).h, c.expected.h);
});

test('F5 — MASK-D: an END PANEL between two units is a boundary', () => {
  project();
  const c = caseOf('MASK-D');
  const first = wallRun(1, 500)[0];
  // The panel goes on BEFORE its neighbour arrives — a cabinet butted hard
  // against another has no room for one, which the store says so about.
  const { error } = store().addEndPanel(first, { side: 'R' });
  assert.equal(error, null, error || '');
  const second = wallRun(1, 500 + 600 + unitOf(first).params.front_t)[0];

  // They are still ONE run: `paddedSpan` counts the panel, so the two cabinets
  // are edge to edge with it between them.
  assert.equal(buildRuns(store().units, P).length, 1);
  const widths = [first, second].map((id) => maskOf(id)).filter(Boolean).map((p) => p.w);
  assert.equal(widths.length, c.expected.segments, 'two boards');
  assert.deepEqual(widths, c.expected.widths, 'and each is its own cabinet’s width');
});

test('F5 — MASK-E: a GAP is a boundary — the run itself breaks, so the board does', () => {
  project();
  const c = caseOf('MASK-E');
  const ids = wallRun(2);
  assert.equal(maskOf(ids[0]).w, 1200);
  store().moveUnit(ids[1], 500 + 600 + 400, 0);
  const widths = ids.map((id) => maskOf(id)).filter(Boolean).map((p) => p.w);
  assert.equal(widths.length, c.expected.segments);
  assert.deepEqual(widths, c.expected.widths);
});

test('F5 — the segments are the plinth’s rule, asked directly', () => {
  project();
  const ids = wallRun(3);
  const runs = buildRuns(store().units, P);
  assert.equal(runs.length, 1);
  assert.deepEqual(maskSegments(runs[0]).map((seg) => seg.length), [3]);
  // A unit that has not asked for one is a hole in the board, exactly as a
  // cabinet with no plinth is a hole in the toe kick.
  store().removeBottomMask(ids[1]);
  assert.equal(unitOf(ids[1]).params.bottom_mask, false);
});

test('F5 — removal takes the whole RUN’s board off (F1.2’s rule, applied)', () => {
  project();
  const ids = wallRun(3);
  assert.equal(store().removeBottomMask(ids[2]), 3, 'the run, not the carcass');
  for (const id of ids) assert.equal(maskOf(id), null);
});

// ─── it reaches the BOM and the sheet like every other part ────────────────

test('F5 — it is a cut piece: BOM row, front material, and a DXF of its own', () => {
  project();
  const ids = wallRun(2);
  const entries = store().units.map((u) => ({ unit: u, result: computeCabinet(paramsForEngine(u), P) }));
  const bom = buildBom(entries, P);
  const rows = bom.units.flatMap((u) => u.rows).filter((r) => r.part === 'MASK');
  assert.equal(rows.length, 1, 'ONE row for one board');
  assert.equal(rows[0].material_role, 'front', 'cut from the front sheet (F5.2)');
  assert.equal(rows[0].w, 1200);
  assert.ok(rows[0].area_m2 > 0);

  const result = resultOf(ids[0]);
  const mask = result.panels.find((p) => p.part === 'MASK');
  assert.ok(mask.cnc?.outline?.length, 'and it has an outline for the sheet');
  assert.ok(result.csvLines.some((l) => /,MASK,/.test(l)), 'and a line in the cut list');
});

// ─── F5.4 — its own modal ─────────────────────────────────────────────────

test('F5.4 — the board is an ATTACHED piece: it opens its own modal', () => {
  project();
  const ids = wallRun(1);
  const mask = maskOf(ids[0]);
  assert.equal(elementKind(mask), 'masking-panel');
  assert.equal(elementLabel(mask), 'Bottom masking panel');
  assert.equal(opensOwnModal(mask), true);
});
