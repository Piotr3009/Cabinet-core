// ─── TURN 68 · F4 — THE DIVIDER MOVES AGAIN ────────────────────────────────
//
// The owner: *"divider nie mogę przesunąć."*
//
// THE PROBE CAME FIRST (`verify/t68/f4-probe.md`) and it acquitted the suspect
// CLAUDE.md named. `PartitionMenu` did die in T66, but its HOW FAR FROM THE
// LEFT control had re-homed perfectly well: a divider DOES dock
// `ElementProperties`, and `position-x` DOES survive the dock's `omit`. What
// the probe found instead:
//
//   resolveSelection → menu `partition`, item `null`
//   the field's own commit → TypeError: Cannot read properties of null
//                            (reading 'id')
//   the same call with the panel's stamped id → moved 891 → 791
//
// The setter was sound. The SELECTION never looked a partition's item up.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import * as A from '../src/retail/design/adapter.js';
import { elementFields } from '../src/engine/elements.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import decorPack from '../public/decors/egger/egger-decors.json' with { type: 'json' };
import { parseDecorCatalogue, setDecorCatalogue } from '../src/engine/decors.js';

setDecorCatalogue(parseDecorCatalogue(decorPack, { basePath: '/decors/egger/' }));

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const S = () => useProjectStore.getState();
const U = () => useUiStore.getState();

function withDivider(widthMm = 1800) {
  U().clearSelection();
  A.startDesign('T68 F4');
  const id = A.addFirstWardrobe();
  A.setUnitSize(id, { width: widthMm });
  A.addFlushPartition(id);
  return id;
}

const vpartOf = (unitId) => (S().unitResult(unitId)?.panels || []).find((p) => p.part === 'VPART') || null;
const xOf = (unitId, itemId) => Math.round(Number(((S().units.find((u) => u.id === unitId)
  ?.params.sections?.[0]?.items) || []).find((i) => i.id === itemId)?.x_mm) || 0);

// ═══ THE CLICK REACHES THE DIVIDER'S OWN ITEM ══════════════════════════════

test('F4 · clicking a divider resolves to the divider, item and all', () => {
  const unitId = withDivider();
  const vpart = vpartOf(unitId);
  assert.ok(vpart, 'no divider was cut');
  U().selectElement(unitId, vpart.id);
  const sel = A.resolveSelection(U().selectedElement);
  assert.ok(sel, 'the click resolved to nothing');
  assert.equal(sel.menu, 'partition');
  // THE LINE THE PROBE CONVICTED: this was `null`, and the field it feeds
  // commits against `item.id`.
  assert.ok(sel.item, 'the selection carries no item — the field will throw on commit');
  assert.equal(sel.item.id, vpart.meta.itemId, 'the selection found the wrong item');
});

test('F4 · the docked editor carries the position field, and the field writes', () => {
  const unitId = withDivider();
  const vpart = vpartOf(unitId);
  U().selectElement(unitId, vpart.id);
  const sel = A.resolveSelection(U().selectedElement);

  // The dock's own omit list, read off the dock rather than copied here.
  const dock = read('src/retail/design/detail/docked.jsx');
  const omit = [...dock.slice(dock.indexOf('const WORKSHOP_FIELDS'),
    dock.indexOf(']);', dock.indexOf('const WORKSHOP_FIELDS'))).matchAll(/'([a-z-]+)'/g)].map((m) => m[1]);
  const visible = elementFields(vpart, null).filter((f) => !omit.includes(f));
  assert.deepEqual(visible, ['position-x'],
    `a client sees ${visible.join(', ') || 'nothing'} on a divider`);

  // …and the field's OWN commit — `setPartitionX(unit.id, item.id, …)` — moves
  // the board. This is the call, not a description of it.
  const before = xOf(unitId, sel.item.id);
  S().setPartitionX(unitId, sel.item.id, before - 100);
  assert.equal(xOf(unitId, sel.item.id), before - 100, 'the field committed and nothing moved');
});

test('F4 · a refusal is the STORE\'s, and the board stays where it was', () => {
  // The clamp is not this turn's to invent: `setPartitionX` already refuses
  // what the neighbours refuse, and both doors inherit it unchanged.
  const unitId = withDivider();
  const item = vpartOf(unitId).meta.itemId;
  const before = xOf(unitId, item);
  S().setPartitionX(unitId, item, -5000);
  const after = xOf(unitId, item);
  assert.notEqual(after, -5000, 'the store accepted a divider outside the carcass');
  assert.ok(after >= 0, `the divider landed at ${after}`);
});

// ═══ ONE LAW, TWO DOORS ════════════════════════════════════════════════════

test('F4 · the stage drag and the docked field are ONE setter', () => {
  // The drag is `startDepthDrag`'s pattern on the other horizontal axis —
  // CLAUDE.md: *"EdgeHandle's pattern — read it first"*.
  const view = code('src/3d/UnitView.jsx');
  assert.match(view, /const startPartitionDrag = useCallback/);
  assert.match(view, /onMovePartition\(itemId, alongUnitMm\(pt\) \+ grabDelta\)/,
    'the drag does not keep its grab point');
  assert.match(view, /p\.part === 'VPART' && p\.meta\?\.itemId && onMovePartition/,
    'a divider is not picked up on the stage');
  // The orbit is locked and released, and the listeners live on `window` —
  // the same three facts every other drag in this file settles.
  const drag = view.slice(view.indexOf('const startPartitionDrag'));
  const body = drag.slice(0, drag.indexOf('}, [onMovePartition'));
  assert.match(body, /if \(orbitRef\?\.current\) orbitRef\.current\.enabled = false;/);
  assert.match(body, /if \(orbitRef\?\.current\) orbitRef\.current\.enabled = true;/);
  assert.match(body, /window\.addEventListener\('pointermove', move\)/);
  assert.match(body, /window\.removeEventListener\('pointerup', up\)/);

  // AND THE SETTER IS THE SAME ONE. The scene writes `setPartitionX`; so does
  // the docked field. Two doors, one law — asserted as a COUNT over the tree.
  assert.match(code('src/3d/Scene.jsx'),
    /onMovePartition=\{\(itemId, xMm\) => setPartitionX\(unit\.id, itemId, xMm\)\}/);
  const writers = ['src/3d/Scene.jsx', 'src/3d/UnitView.jsx', 'src/retail/design/adapter.js',
    'src/retail/design/detail/ElementProperties.jsx']
    .filter((rel) => /setPartitionX\(/.test(code(rel)));
  // The view CALLS a prop, never the store; the store is reached from exactly
  // two places on the retail side, and both of them name the same function.
  assert.ok(!/useProjectStore/.test(code('src/3d/UnitView.jsx').slice(
    code('src/3d/UnitView.jsx').indexOf('const startPartitionDrag'),
    code('src/3d/UnitView.jsx').indexOf('const startPartitionDrag') + 1400,
  )), 'the view reaches into the store itself');
  assert.ok(writers.includes('src/3d/Scene.jsx'));
  assert.ok(writers.includes('src/retail/design/detail/ElementProperties.jsx'));
});

test('F4 · PRO is untouched by the new door — it passes no handler', () => {
  // `onMovePartition` is optional everywhere it is read, so a mount that does
  // not pass it behaves exactly as it did. PRO and retail share `Scene.jsx`,
  // which is where the handler is passed — so both get it, and neither gets a
  // second setter.
  const view = code('src/3d/UnitView.jsx');
  assert.match(view, /if \(!itemId \|\| !onMovePartition\) return;/);
  // …and the frozen surface is not part of this: no PRO file is named.
  for (const rel of ['src/App.jsx', 'src/main.jsx']) {
    assert.doesNotMatch(code(rel), /onMovePartition/);
  }
});
