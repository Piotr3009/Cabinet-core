// ─── Turn 34, CLAUDE.md F5: one "3" at a touch, the truth apart ────────────
//
// The owner, 16.08.2026: *"czasami pokazuje 2 wymiary 1.5 i 1.5, a mi zależało
// żeby zawsze pokazywało jeden — przy dojechaniu do szafki żeby się sumowały i
// pokazywało 3"*. And, on the apart case, his own ruling in the same breath:
// *"oczywiście, że 1.5, 100 i 1.5 — bo tak jest w rzeczywistości; dopiero jak
// dojeżdżają do siebie, to 3."*
//
// The merge is a fact about the CARCASSES, not a preference, and the numbers
// are the matrix's — read off `frontClearances`, never re-derived here.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { frontDimensionRows } from '../src/engine/frontDimensions.js';
import {
  TOUCH_TOLERANCE_MM, isEdgeDimSuppressed, meetingDimensions, suppressedEdgeDims,
} from '../src/engine/meetingDimensions.js';

const store = () => useProjectStore.getState();

function pairOfUnits(type = 'BUD') {
  store().loadProject({
    id: null,
    name: 't34-f5',
    room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
    design: {},
  }, []);
  const a = store().addUnit(type);
  store().updateUnitParams(a.id, { doors: { count: 1 } });
  const b = store().addUnit(type, { near: a.id, side: 'right' }).id;
  store().updateUnitParams(b, { doors: { count: 1 } });
  return [a.id, b];
}

/**
 * Stand the run APART by `mm`.
 *
 * `moveUnit` clamps a slide into the free slot — rule 13, cabinets in a run
 * touch and the editor cannot draw this by hand — so the layout is written and
 * RELOADED, which is exactly the shape a saved or imported job arrives in: the
 * one layout nothing in this app has ever measured.
 */
function slideApart(unitId, mm) {
  const project = structuredClone(store().project);
  const units = structuredClone(store().units).map((u) => (u.id === unitId
    ? { ...u, position: { ...u.position, x_mm: (Number(u.position.x_mm) || 0) + mm } }
    : u));
  store().loadProject(project, units);
}

// ─── TOUCHING: one figure, and the pair stands down ────────────────────────

test('carcasses TOUCHING give ONE leaf-to-leaf figure — the healthy 3.00', () => {
  pairOfUnits();
  const meetings = meetingDimensions(store().frontClearances());
  assert.equal(meetings.length, 1, 'one meeting line between two cabinets');
  const [m] = meetings;
  assert.equal(m.touching, true);
  assert.equal(m.rows.length, 1, 'one figure, not two');
  assert.equal(m.rows[0].kind, 'leaf-to-leaf');
  assert.equal(m.mm, 3, 'the 1.5 each kit leaves, summed — what the client sees');
  assert.equal(m.leafGapMm, 3);
  assert.ok(Math.abs(m.carcassGapMm) <= TOUCH_TOLERANCE_MM);
});

test('…and the two per-unit edge figures at that line are SUPPRESSED', () => {
  const [a, b] = pairOfUnits();
  const meetings = meetingDimensions(store().frontClearances());
  const [m] = meetings;
  assert.equal(m.suppress.length, 2, 'both halves of the pair stand down');
  assert.deepEqual([...new Set(m.suppress.map((s) => s.unitId))].sort(), [a, b].sort());
  // The LEFT cabinet's RIGHT edge and the RIGHT cabinet's LEFT edge — and no
  // others: the outer edges of the run are still each cabinet's own truth.
  assert.deepEqual(m.suppress.map((s) => s.side).sort(), ['left', 'right']);

  const set = suppressedEdgeDims(meetings);
  assert.equal(set.size, 2);
  for (const s of m.suppress) {
    assert.equal(isEdgeDimSuppressed(set, s.unitId, s.panelId, s.side), true);
    // The OTHER side of the same front is untouched.
    assert.equal(
      isEdgeDimSuppressed(set, s.unitId, s.panelId, s.side === 'left' ? 'right' : 'left'),
      false,
    );
  }
});

test('the suppression reaches the ROWS the scene draws — and only those', () => {
  const [a] = pairOfUnits();
  const result = store().unitResult(a);
  const { suppress, rows } = store().meetingDimensionsFor(a);
  assert.equal(suppress.size, 1, 'this cabinet gives up one edge figure');

  const before = frontDimensionRows(result, P);
  const after = frontDimensionRows(result, P, suppress);
  const sides = (list) => list.filter((r) => r.kind === 'to-side');
  assert.equal(sides(before).length, 2, 'a cabinet has two side figures');
  assert.equal(sides(after).length, 1, 'the one at the meeting line is gone');
  // Everything that is NOT a to-side is byte-for-byte what it was.
  const others = (list) => JSON.stringify(list.filter((r) => r.kind !== 'to-side'));
  assert.equal(others(after), others(before));

  // …and the merged figure is carried by the LEFT cabinet, in its own frame.
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, 'meeting');
  assert.equal(rows[0].mm, 3);
  assert.equal(rows[0].axis, 'h');
  assert.equal(rows[0].to - rows[0].from, 3, 'it spans exactly the gap it names');
});

test('the RIGHT cabinet of the pair draws no merged figure — one line, one number', () => {
  const [, b] = pairOfUnits();
  const { rows, suppress } = store().meetingDimensionsFor(b);
  assert.equal(suppress.size, 1, 'it still gives up its own edge figure…');
  assert.deepEqual(rows, [], '…but the figure is drawn once, by the left cabinet');
});

// ─── APART: three figures, and all three are true ──────────────────────────

test('carcasses APART give the owner\'s triplet — 1.5 · the distance · 1.5', () => {
  const [, b] = pairOfUnits();
  slideApart(b, 100);

  const meetings = meetingDimensions(store().frontClearances());
  assert.equal(meetings.length, 1);
  const [m] = meetings;
  assert.equal(m.touching, false);
  assert.equal(m.rows.length, 3, '"oczywiście, że 1.5, 100 i 1.5"');
  assert.deepEqual(m.rows.map((r) => r.kind),
    ['own-clearance', 'carcass-gap', 'own-clearance']);
  assert.equal(m.rows[0].mm, 1.5, 'the left cabinet\'s own');
  assert.equal(m.rows[2].mm, 1.5, 'the right cabinet\'s own');
  assert.equal(m.rows[1].mm, 100, 'and the real distance between the boxes');
  // Nothing is suppressed: apart, every figure is the truth.
  assert.deepEqual(m.suppress, []);
  assert.equal(suppressedEdgeDims(meetings).size, 0);
});

test('apart, the per-unit figures are exactly what turn 25 always drew', () => {
  const [a, b] = pairOfUnits();
  const wasA = JSON.stringify(frontDimensionRows(store().unitResult(a), P, new Set()));
  slideApart(b, 100);
  const { suppress, rows } = store().meetingDimensionsFor(a);
  assert.equal(suppress.size, 0);
  assert.deepEqual(rows, []);
  assert.equal(JSON.stringify(frontDimensionRows(store().unitResult(a), P, suppress)), wasA);
});

// ─── only the meeting line, and only front-to-front ────────────────────────

test('a panel, an infill or a wall is ONE figure already and does not merge', () => {
  const [, b] = pairOfUnits();
  store().addEndPanel(b, { side: 'R' });
  const meetings = meetingDimensions(store().frontClearances());
  // Still exactly the one front-to-front line; the end panel's own edge is not
  // a meeting and never was.
  assert.equal(meetings.length, 1);
  assert.equal(meetings[0].rows[0].kind, 'leaf-to-leaf');
});

test('a lone cabinet has no meeting line at all', () => {
  store().loadProject({
    id: null,
    name: 't34-f5-lone',
    room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
    design: {},
  }, []);
  const a = store().addUnit('BUD');
  store().updateUnitParams(a.id, { doors: { count: 1 } });
  assert.deepEqual(meetingDimensions(store().frontClearances()), []);
  const { rows, suppress } = store().meetingDimensionsFor(a.id);
  assert.deepEqual(rows, []);
  assert.equal(suppress.size, 0);
});

test('the numbers come from frontClearances and are never re-derived', () => {
  pairOfUnits();
  const clearances = store().frontClearances();
  const [m] = meetingDimensions(clearances);
  // The merged figure IS the matrix's own gap for that edge.
  const row = clearances.find((r) => r.edges?.right?.kind === 'front'
    && r.edges.right.of?.panelId);
  assert.ok(row, 'the matrix paired them');
  assert.equal(m.leafGapMm, Math.round(row.edges.right.gapMm * 100) / 100);
  // …and the carcass distance is the arithmetic on the matrix's own three
  // numbers, not a second measurement of the room.
  const mine = row.edges.right.haveClearanceMm;
  const theirRow = clearances.find((r) => r.panelId === row.edges.right.of.panelId
    && r.unitId === row.edges.right.of.unitId);
  const theirs = theirRow.edges.left.haveClearanceMm;
  assert.equal(m.carcassGapMm, Math.round((m.leafGapMm - mine - theirs) * 100) / 100);
});

test('the bare engine is untouched — F5 is a SCENE dimension', () => {
  const r = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01' }, P);
  assert.ok(r.panels.length > 0);
  // `frontDimensionRows` with no suppression is turn 25's answer, to the byte.
  assert.equal(
    JSON.stringify(frontDimensionRows(r, P, null)),
    JSON.stringify(frontDimensionRows(r, P)),
  );
  assert.equal(
    JSON.stringify(frontDimensionRows(r, P, new Set())),
    JSON.stringify(frontDimensionRows(r, P)),
  );
});
