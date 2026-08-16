// ─── Turn 33, CLAUDE.md F5: the sweep the self-healing missed ───────────────
//
// Owner, 15.08: "nadal pokazuje 1.5 mm między szafami" where a panel
// neighbour demands 3.0. T32-F3 made the matrix self-apply, but not on every
// path. This file is the CONSUMER SWEEP as a test matrix: unit type ×
// neighbour × path — after every path that creates or re-shapes a front, no
// healable correction may be left standing. The paths that already healed
// (addUnit, resize, move, walls, doors) keep their T31/T32 tests; the rows
// here are the ones the sweep found MISSING: loadProject, the BUDR face
// toggles and height edits, the partition edits under bay doors, and the
// element overrides.

import test from 'node:test';
import assert from 'node:assert/strict';

import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();

function project() {
  store().loadProject({
    id: null,
    name: 't33-f5',
    room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
    design: {},
  }, []);
}

/** A run of two, butted — then the 3.0-demanding panel on the outer edge. */
function runWithPanel(type, params = null) {
  project();
  const faces = params
    || (type === 'BUDR' ? {} : { doors: type === 'WARDROBE' ? true : { count: 1 } });
  const a = store().addUnit(type);
  if (Object.keys(faces).length) store().updateUnitParams(a.id, faces);
  const b = store().addUnit(type, { near: a.id, side: 'right' });
  if (Object.keys(faces).length) store().updateUnitParams(b.id, faces);
  store().addEndPanel(b.id, { side: 'R' });
  return [a.id, b.id];
}

/**
 * No healable correction standing: every positive correction is parked/stuck.
 *
 * ─── TURN 34 (CLAUDE.md F6): THE APPLIANCE COLUMN ──────────────────────────
 * A correction was "healable" only when POSITIVE, because a trim only ever
 * narrowed. At an appliance neighbour it may now EXTEND, so a NEGATIVE
 * correction standing at that one kind is a correction the sweep missed too.
 */
function assertHealed(where) {
  const rows = store().frontClearances();
  const healable = (edge) => {
    if (!edge || edge.parked) return false;
    const c = Number(edge.correctionMm) || 0;
    if (c > 0.01) return true;
    return edge.kind === 'appliance' && c < -0.01;
  };
  const standing = rows.flatMap((r) => ['left', 'right']
    .filter((side) => healable(r.edges?.[side]) && !r.appliance)
    .map((side) => `${r.panelId}:${side}:${r.edges[side].correctionMm}`));
  assert.deepEqual(standing, [], `${where}: the matrix left healable corrections standing`);
}

// ─── the matrix rows ────────────────────────────────────────────────────────

for (const type of ['BUD', 'WARDROBE']) {
  test(`${type} × end panel × loadProject — a loaded scene is healed like a touched one`, () => {
    const [, b] = runWithPanel(type);
    assertHealed(`${type} after addEndPanel`);
    const healedTrim = store().units.find((u) => u.id === b).params.front_edge_trim;
    assert.ok(healedTrim && Object.keys(healedTrim).length, 'the panel demanded a trim');

    // Strip the healed trims off and SAVE that scene — yesterday's project.
    const stale = structuredClone({ project: store().project, units: store().units });
    for (const u of stale.units) delete u.params.front_edge_trim;
    store().loadProject(stale.project, stale.units);
    assertHealed(`${type} after loadProject of a stale scene`);
    const back = store().units.find((u) => u.id === b);
    assert.ok(back.params.front_edge_trim, 'the trims were written back on open');
  });
}

test('BUDR × end panel × face toggles — drawer faces heal like doors', () => {
  const [, b] = runWithPanel('BUDR');
  assertHealed('BUDR after addEndPanel');
  store().removeDrawerFronts(b);
  assertHealed('BUDR after removeDrawerFronts');
  store().addDrawerFronts(b);
  assertHealed('BUDR after addDrawerFronts');
});

test('BUDR × end panel × height edits — a resized face is re-measured', () => {
  const [, b] = runWithPanel('BUDR');
  store().setBudrDrawerHeight(b, 0, 320);
  assertHealed('BUDR after setBudrDrawerHeight');
  store().resetDrawerHeights(b);
  assertHealed('BUDR after resetDrawerHeights');
});

test('WARDROBE × end panel × partition edits — the paths run the matrix', () => {
  const [, b] = runWithPanel('WARDROBE', { width: 1200, doors: true });
  const partId = store().addPartition(b);
  assert.ok(partId, 'the divider stands');
  assertHealed('after addPartition');
  store().setPartitionX(b, partId, 500);
  assertHealed('after setPartitionX');
  store().centrePartitions(b);
  assertHealed('after centrePartitions');
  store().removeItem(b, partId);
  assertHealed('after removeItem(partition)');
});

test('BUD × end panel × element overrides — every override path re-measures', () => {
  const [, b] = runWithPanel('BUD');
  const endPanel = store().unitResult(b).panels.find((p) => /END/.test(p.id));
  assert.ok(endPanel, 'the end panel exists to touch');
  store().moveElement(b, endPanel.id, { x: 5 });
  assertHealed('after moveElement');
  store().removeElement(b, endPanel.id);
  assertHealed('after removeElement');
  store().restoreElement(b, endPanel.id);
  assertHealed('after restoreElement');
});

// ─── TURN 34 (CLAUDE.md F6): the APPLIANCE column of the same matrix ───────
//
// "raczej tylko przy appliance'ach — silnik powinien pilnować, żeby zawsze
// było 3" (owner, 16.08.2026). The heal paths that closed a panel edge must
// close an appliance edge too — the other way, by EXTENDING — and the sum the
// client sees must be the 3 the machine already provides.

test('BUD × appliance × addUnit — the front beside a dishwasher extends to touch', () => {
  project();
  const dw = store().addUnit('DW_PANEL');
  const b = store().addUnit('BUD', { near: dw.id, side: 'right' }).id;
  store().updateUnitParams(b, { doors: { count: 1 } });
  assertHealed('BUD beside a DW_PANEL');

  const rows = store().frontClearances().filter((r) => r.unitId === b && !r.appliance);
  const atAppliance = rows.flatMap((r) => ['left', 'right']
    .filter((s) => r.edges?.[s]?.kind === 'appliance')
    .map((s) => ({ panelId: r.panelId, side: s, edge: r.edges[s] })));
  assert.ok(atAppliance.length >= 1, 'the appliance was recognised as the neighbour');
  for (const hit of atAppliance) {
    assert.ok(Math.abs(Number(hit.edge.haveClearanceMm)) < 0.01,
      `${hit.panelId}:${hit.side}: the front runs to its own carcass end (clearance 0)`);
    assert.ok(Math.abs(Number(hit.edge.correctionMm)) < 0.01, 'and nothing is left owed');
  }
  // The trim that did it is NEGATIVE — an extension, on that edge only.
  const trims = store().units.find((u) => u.id === b).params.front_edge_trim || {};
  const negatives = Object.values(trims)
    .flatMap((t) => [Number(t.left) || 0, Number(t.right) || 0])
    .filter((v) => v < 0);
  assert.ok(negatives.length >= 1, 'a negative trim was written — the extension');
});

test('the appliance heal CONVERGES — a second pass asks for nothing', () => {
  project();
  const dw = store().addUnit('DW_PANEL');
  const b = store().addUnit('BUD', { near: dw.id, side: 'right' }).id;
  store().updateUnitParams(b, { doors: { count: 1 } });
  const first = store().units.find((u) => u.id === b).params.front_edge_trim;
  const plan = store().healFrontGaps();
  assert.deepEqual(plan.patches, [], 'a settled edge plans nothing');
  assert.deepEqual(store().units.find((u) => u.id === b).params.front_edge_trim, first);
});

// ─── the grey note speaks, once per correction ──────────────────────────────

test('every self-correction announces itself as a GREY note, never a question', () => {
  project();
  useUiStore.setState({ messages: [] });
  const a = store().addUnit('BUD');
  store().updateUnitParams(a.id, { doors: { count: 1 } });
  const b = store().addUnit('BUD', { near: a.id, side: 'right' });
  store().updateUnitParams(b.id, { doors: { count: 1 } });
  useUiStore.setState({ messages: [] });
  store().addEndPanel(b.id, { side: 'R' });
  const notes = useUiStore.getState().messages
    .filter((m) => /front .*mm/.test(m.message));
  assert.ok(notes.length >= 1, 'the healing said what it did');
  assert.ok(notes.every((m) => m.level === 'grey'), 'grey — an announcement, not a question');
});

// ─── and the trims the heal writes obey the asymmetry law ───────────────────

test('the healed trim narrows the front on the panel edge only (asymmetry law)', () => {
  const [, b] = runWithPanel('BUD');
  const trims = store().units.find((u) => u.id === b).params.front_edge_trim || {};
  const trimmed = Object.values(trims);
  assert.ok(trimmed.length >= 1, 'a trim was written');
  for (const t of trimmed) {
    const left = Number(t.left) || 0;
    const right = Number(t.right) || 0;
    assert.ok(left > 0 || right > 0, 'the correction landed');
    assert.ok(!(left > 0 && right > 0), 'one edge — the neighbour that demanded it');
  }
});
