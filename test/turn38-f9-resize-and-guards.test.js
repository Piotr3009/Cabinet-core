// ─── TURN 38 · F9 — the resize rule and the two guard checks ────────────────
//
// The owner's word, 17.08.2026, and it is a RULE and not an edit:
//
//     custom geometry DIES with a panel resize.
//
// Same size → the overrides ride along untouched, because recomputes happen
// constantly and must NOT clear anything. Different size → that panel's manual
// objects are dropped and a note names the panel.
//
// Plus the two guards, both WARNINGS and neither a gate:
//
//   A  a manual object extending beyond the panel outline
//   B  a manual object on layer OUTLINE — the cut boundary

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import {
  manualGeometryFaults, resizeDropMessage, resizedPanels, withPartEdit, withoutResizedPartEdits,
} from '../src/engine/partEdits.js';
import { CHECKS, runChecks } from '../src/engine/checks.js';
import { makeCircle, makeLine, makeRect } from '../src/engine/partObjects.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();
const L = 'SCREWS_3MM';

const panel = (w = 600, h = 800) => ({
  id: 'BACK',
  w,
  h,
  thickness: 18,
  cnc: { drawn_w: w, drawn_h: h },
});

const drawn = (over = {}) => ({
  BACK: {
    signature: '600×800×18',
    panelSize: { w: 600, h: 800 },
    ops: [makeRect({ id: 'o1', layer: L, from: [10, 10], to: [100, 100] })],
    ...over,
  },
});

// ═══ THE RULE ═══════════════════════════════════════════════════════════════

test('F9 — the SAME size rides along: a recompute clears nothing', () => {
  const edits = drawn();
  assert.deepEqual(resizedPanels(edits, [panel()]), [], 'nothing was invalidated');
  const { next, dropped } = withoutResizedPartEdits(edits, [panel()]);
  assert.equal(next, edits, 'the SAME object back — a recompute must not rewrite the project');
  assert.deepEqual(dropped, []);
  // …and half a millimetre of float is the same millimetre.
  assert.deepEqual(resizedPanels(edits, [panel(600.005, 800)]), []);
});

test('F9 — a DIFFERENT size drops that panel’s geometry, and says which panel', () => {
  const edits = drawn();
  const rows = resizedPanels(edits, [panel(600, 700)]);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].was, { w: 600, h: 800 });
  assert.deepEqual(rows[0].now, { w: 600, h: 700 });
  assert.equal(rows[0].count, 1);
  const { next, dropped } = withoutResizedPartEdits(edits, [panel(600, 700)]);
  assert.deepEqual(next, {}, 'the geometry is gone');
  assert.equal(dropped.length, 1);
  assert.equal(resizeDropMessage(dropped), 'Custom geometry dropped — BACK was resized.');
});

test('F9 — several panels are named in ONE note', () => {
  const message = resizeDropMessage([{ panelId: 'BACK' }, { panelId: 'BUL' }]);
  assert.equal(message, 'Custom geometry dropped — BACK, BUL were resized.');
  assert.equal(resizeDropMessage([]), '');
});

test('F9 — a set with NO stamp is left exactly alone', () => {
  // Every part edited before tonight. Turn 23's `signature` still guards them —
  // they simply do not apply while the board is a different board — and this
  // rule does not reach back and delete somebody's older work.
  const legacy = { BACK: { signature: '600×800×18', ops: [makeRect({ id: 'o1', layer: L, from: [0, 0], to: [9, 9] })] } };
  assert.deepEqual(resizedPanels(legacy, [panel(400, 400)]), []);
  const { next } = withoutResizedPartEdits(legacy, [panel(400, 400)]);
  assert.equal(next, legacy);
});

test('F9 — a panel the recompute no longer produces is not "resized"', () => {
  assert.deepEqual(resizedPanels(drawn(), []), [], 'a missing panel is a different question');
});

// ═══ THE RULE, ON THE RUNNING STORE ═════════════════════════════════════════

function project() {
  store().loadProject({
    id: null, name: 't38-f9', room: migrateRoom({ height: 2600, corners: rectCorners(6000, 3000) }), design: {},
  }, []);
}

test('F9 — resizing the cabinet drops the drawn geometry, and an ordinary edit does not', () => {
  project();
  const id = store().addUnit('WARDROBE').id;
  const back = store().unitResult(id).panels.find((p) => p.part === 'BACK');
  store().addPartEdit(id, back.id, {
    op: 'circle', layer: L, at: [100, 100], r: 20, id: 'o1',
  });
  assert.equal(store().partOpsOf(id, back.id).length, 1, 'it is drawn');
  const stamp = store().units.find((u) => u.id === id).params.part_edits[back.id].panelSize;
  assert.ok(stamp.w > 0 && stamp.h > 0, 'and the board’s size is stamped on the set');

  // AN ORDINARY RECOMPUTE — a shelf appears, the cabinet is re-cut, the back is
  // the same board. Nothing is cleared, which is the half of the rule that
  // matters every day.
  store().addShelves(id, 1);
  assert.equal(store().partOpsOf(id, back.id).length, 1, 'a shelf does not rub out a circle');

  // A RESIZE — and it dies.
  useUiStore.setState({ messages: [] });
  store().updateUnitParams(id, { height: 1900 });
  assert.equal(store().partOpsOf(id, back.id).length, 0, 'custom geometry DIES with a panel resize');
  const said = useUiStore.getState().messages.map((m) => m.text || m.message || '').join(' | ');
  assert.match(said, /Custom geometry dropped/, 'and the app says so');
  assert.match(said, new RegExp(back.id), '…naming the panel');
});

// ═══ THE TWO GUARDS ═════════════════════════════════════════════════════════

test('F9 — GUARD A: a shape that runs off the board is a warning, naming the object', () => {
  const off = {
    BACK: {
      signature: '',
      ops: [
        makeRect({ id: 'o1', layer: L, from: [10, 10], to: [100, 100] }),     // inside
        makeCircle({ id: 'o2', layer: L, at: [590, 400], r: 40 }),            // over the edge
        makeLine({ id: 'o3', layer: L, from: [-20, 50], to: [40, 50] }),      // off the left
      ],
    },
  };
  const faults = manualGeometryFaults(off, [panel()]).filter((f) => f.check === 16);
  assert.deepEqual(faults.map((f) => f.objectId), ['o2', 'o3']);
  assert.match(faults[0].message, /runs off the panel/);
  assert.match(faults[0].message, /circle o2/, 'the object is NAMED');
  assert.match(faults[0].message, /600 × 800 board/, '…and so is the board');
});

test('F9 — GUARD B: OUTLINE is the cut boundary, and a shape there is a warning', () => {
  const onOutline = {
    BACK: {
      signature: '',
      ops: [makeLine({ id: 'o1', layer: 'OUTLINE', from: [10, 10], to: [100, 100] })],
    },
  };
  const faults = manualGeometryFaults(onOutline, [panel()]);
  assert.equal(faults.length, 1);
  assert.equal(faults[0].check, 17);
  assert.match(faults[0].message, /OUTLINE is the cut boundary/);
  assert.match(faults[0].message, /cut as the part’s edge/);
  // A hide op is not geometry and is not guarded.
  assert.deepEqual(manualGeometryFaults({ BACK: { signature: '', ops: [{ op: 'hide', feature: 'x' }] } }, [panel()]), []);
});

test('F9 — both are YELLOW, and neither blocks anything', () => {
  for (const n of [16, 17]) {
    const row = CHECKS.find((c) => c.n === n);
    assert.ok(row, `rule ${n} is in the list`);
    assert.equal(row.level, 'yellow', 'a warning, not a gate');
  }
});

test('F9 — the Check panel reports both, against the part they are on', () => {
  project();
  const id = store().addUnit('WARDROBE').id;
  const back = store().unitResult(id).panels.find((p) => p.part === 'BACK');
  const unit = store().units.find((u) => u.id === id);
  const ops = [
    makeCircle({ id: 'o1', layer: L, at: [back.w + 50, 100], r: 20 }),
    makeLine({ id: 'o2', layer: 'OUTLINE', from: [10, 10], to: [80, 10] }),
  ];
  let edits = {};
  for (const op of ops) edits = withPartEdit(edits, back.id, op, '', { w: back.w, h: back.h });
  const found = runChecks({
    entries: [{ unit: { ...unit, params: { ...unit.params, part_edits: edits } }, result: store().unitResult(id) }],
    units: [unit],
    profile: P,
  });
  const sixteen = found.find((f) => f.check === 16);
  const seventeen = found.find((f) => f.check === 17);
  assert.ok(sixteen, 'guard A fired');
  assert.ok(seventeen, 'guard B fired');
  for (const f of [sixteen, seventeen]) {
    assert.equal(f.level, 'yellow');
    assert.equal(f.panelId, back.id, 'the finding names the panel');
    assert.equal(f.subject.editor, 'part-detail', '…and a click opens the editor it is in');
  }
  assert.equal(sixteen.objectId, 'o1');
  assert.equal(seventeen.objectId, 'o2');
});
