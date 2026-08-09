// ─── Turn 14, F8: the editor window comes alive ─────────────────────────────
//
// Two things, and the second is the one with an engine behind it.
//
//   F8.1 — the doors OPEN. The swing has existed since turn 8; the editor
//   passed `front={null}` and `open={0}`, so it could never be asked for. That
//   is a view change and is verified in the browser walk.
//
//   F8.2 — every part is selectable WITH ACTIONS, auto parts included: edit,
//   move, remove where the physics allows, and where it does not, a short
//   explanation. The rule is pure and lives in engine/elements.js; the removal
//   and the move are DESIGN-LAYER OVERRIDES on the unit — never an engine fork
//   — so the BOM, the CSV and the DXF follow with nothing told to any of them.

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { elementActions, elementKind, isSelectableElement } from '../src/engine/elements.js';
import { buildBom } from '../src/engine/bom.js';

const fridge = (over = {}) => computeCabinet({ ...defaultParamsFor('FRIDGE', P), unit_num: 'F01', ...over }, P);
const sink = (over = {}) => computeCabinet({ ...defaultParamsFor('SINK', P), unit_num: 'S01', ...over }, P);

// ─── F8.1 — which parts are fronts ─────────────────────────────────────────

test('F8.1 — a cabinet HAS fronts for the editor to open', () => {
  // The swing itself is the view's (3d/UnitView.jsx `frontKind`, exported this
  // turn so the editor asks the room rather than keeping a second list) and is
  // verified in the browser walk. What node can hold is that the pieces the
  // control is for are there and are named the same way everywhere.
  const r = fridge();
  assert.equal(elementKind(r.panels.find((p) => p.part === 'FRONT')), 'door');
  const drawers = computeCabinet({ ...defaultParamsFor('BUDR', P), unit_num: 'D01' }, P);
  assert.equal(elementKind(drawers.panels.find((p) => p.part === 'DRAWER-FRONT')), 'drawer-front');
});

// ─── F8.2 — the actions, and the reasons ───────────────────────────────────

test('F8.2 — the AUTO PARTS the owner named are selectable, and they have actions', () => {
  const spurs = fridge().panels.find((p) => p.part === 'SPURS');
  assert.ok(spurs, 'the fridge’s spur panel');
  assert.equal(isSelectableElement(spurs), true);
  const a = elementActions(spurs);
  assert.equal(a.remove.allowed, true, 'a spur panel is fitted where a spur happens to be');
  assert.equal(a.move.allowed, true, 'and a workshop wants it 100 mm over');
  assert.equal(a.remove.reason, null);

  const holder = sink().panels.find((p) => p.part === 'HOLDER');
  assert.ok(holder, 'the sink kit’s pieces');
  assert.equal(isSelectableElement(holder), true);
  assert.equal(elementActions(holder).remove.allowed, false);
  assert.match(elementActions(holder).remove.reason, /instead of a top/);
});

test('F8.2 — a carcass board says WHY it cannot go (the #58 pattern)', () => {
  const r = fridge();
  for (const part of ['BUL', 'BUR', 'TOP', 'BOTTOM']) {
    const panel = r.panels.find((p) => p.id === part);
    const a = elementActions(panel);
    assert.equal(a.remove.allowed, false, `${part}`);
    assert.ok(a.remove.reason && a.remove.reason.length > 20, `${part}: a sentence, not a shrug`);
    assert.match(a.remove.reason, /tabs are cut for it/);
  }
  const back = r.panels.find((p) => p.part === 'BACK');
  assert.match(elementActions(back).remove.reason, /squares the carcass/);
});

test('F8.2 — every selectable piece answers BOTH questions, always with a reason on "no"', () => {
  for (const build of [fridge, sink, () => computeCabinet({ ...defaultParamsFor('WARDROBE', P), unit_num: 'A01', shelves: 2 }, P)]) {
    for (const panel of build().panels.filter(isSelectableElement)) {
      const a = elementActions(panel);
      for (const key of ['remove', 'move']) {
        assert.equal(typeof a[key].allowed, 'boolean', `${panel.id} ${key}`);
        if (!a[key].allowed) {
          assert.ok(a[key].reason && a[key].reason.length > 10, `${panel.id} ${key}: no reason given`);
        }
      }
    }
  }
});

// ─── F8.2 — the override, and the BOM following it ─────────────────────────

test('F8.2 — removing an auto part is an OVERRIDE: it leaves the cut list with it', () => {
  const before = fridge();
  assert.ok(before.panels.some((p) => p.id === 'SPURS'));

  const after = fridge({ element_overrides: { SPURS: { removed: true } } });
  assert.ok(!after.panels.some((p) => p.id === 'SPURS'), 'gone from the panels');
  assert.deepEqual(after.derived.removed_parts, ['SPURS'], 'and the result SAYS it is gone');
  assert.ok(!after.csvLines.some((l) => /,SPURS,/.test(l)), 'gone from the cut list');

  const bom = buildBom([{ unit: { id: 'u', params: { unit_num: 'F01' } }, result: after }], P);
  assert.ok(!bom.units.flatMap((u) => u.rows).some((r) => r.id === 'SPURS'), 'and gone from the BOM');
});

test('F8.2 — moving an auto part is an OVERRIDE too, and it is ABSOLUTE', () => {
  const at = fridge().panels.find((p) => p.id === 'SPURS').box;
  const moved = fridge({ element_overrides: { SPURS: { move: { x: 0, y: 0, z: -100 } } } })
    .panels.find((p) => p.id === 'SPURS');
  assert.equal(moved.box.z, at.z - 100, '100 mm further into the cabinet');
  assert.equal(moved.box.x, at.x, 'and nowhere else');
  assert.deepEqual(moved.meta.moved, { x: 0, y: 0, z: -100 }, 'the panel carries what was asked');

  // Zero puts it back — which is what makes the field a position rather than a
  // nudge that accumulates.
  const home = fridge({ element_overrides: { SPURS: { move: { x: 0, y: 0, z: 0 } } } })
    .panels.find((p) => p.id === 'SPURS');
  assert.deepEqual(home.box, at);
});

test('F8.2 — a bare kit is untouched: no overrides, no removals, no `removed_parts`', () => {
  const r = fridge();
  assert.equal(r.derived.removed_parts, undefined);
  for (const p of r.panels) assert.equal(p.meta?.moved, undefined);
  // …and an override that names a panel this kit does not have changes nothing.
  const other = fridge({ element_overrides: { NOSUCH: { removed: true } } });
  assert.equal(other.panels.length, r.panels.length);
});

test('F8.2 — the cut size never moves: a moved piece is the same piece', () => {
  const at = fridge().panels.find((p) => p.id === 'SPURS');
  const moved = fridge({ element_overrides: { SPURS: { move: { x: 40, y: 0, z: 0 } } } })
    .panels.find((p) => p.id === 'SPURS');
  assert.equal(moved.w, at.w);
  assert.equal(moved.h, at.h);
  assert.equal(moved.area_m2, at.area_m2);
  assert.deepEqual(moved.cnc, at.cnc, 'and the machine cuts exactly what it cut before');
});
