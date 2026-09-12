// ─── TURN 69 · F6 — THE BAY LIGHTS UP UNDER THE POINTER ────────────────────
//
// CLAUDE.md, F6, verbatim:
//
//   *"PRO highlights a bay when its chip is hovered; retail lost it. READ PRO's
//   mechanism first (the chip→scene hover path), carry the same mechanism —
//   one law, no second highlighter."*
//
// PRO'S MECHANISM, read end to end before a line was written:
//
//   components/AddItems.jsx   a chip's `onPointerEnter` → `onZoneHover(index)`
//   components/AddItemsModal  hands that hook `uiStore.setZoneHint`
//   stores/uiStore.js         `zoneHint` — one integer, or null
//   3d/Scene.jsx              passes it to the SELECTED unit's `UnitView`
//   3d/UnitView.jsx           draws the box over `bays[zoneHint]`
//
// Four of those five are SHARED. So the whole of F6 is the first link, and the
// whole of this test is that there is still only ONE of everything else.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import * as A from '../src/retail/design/adapter.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const S = () => useProjectStore.getState();
const U = () => useUiStore.getState();

function divided(bays = 3) {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const { id } = S().addUnit('WARDROBE', { params: { width: 1800, height: 2200, depth: 600 } });
  S().updateUnitParams(id, { width: 1800, height: 2200 });
  A.setBayCount(id, bays);
  U().setZoneHint(null);
  return id;
}

// ═══ 1 · THE LINK THAT WAS MISSING ══════════════════════════════════════════

test('F6 · a chip\'s hover writes the SAME integer PRO\'s chip writes', () => {
  const id = divided();
  assert.equal(A.bayZones(id).length, 3, 'this scene is meant to have three bays');

  assert.equal(A.hoverBay(1), 1);
  assert.equal(U().zoneHint, 1, 'the hover did not reach the shared store');
  assert.equal(A.hoverBay(null), null);
  assert.equal(U().zoneHint, null, 'the pointer leaving did not put the hint out');
});

test('F6 · the list is the STORE\'s own bays, in the store\'s own order', () => {
  const id = divided();
  assert.deepEqual(A.bayZones(id).map((z) => z.index), S().zonesOf(id).map((z) => z.index),
    'retail built a bay list of its own');
  // …and it is a real list with real widths, so a chip can say something.
  for (const z of A.bayZones(id)) assert.ok(z.size > 0, 'a bay with no width');
});

test('F6 · the chip selects the cabinet, because the scene draws the hint for THAT one', () => {
  const id = divided();
  A.selectUnitOnStage(id);
  assert.equal(U().selectedUnitId, id, 'the chip cannot light a wardrobe nobody selected');
});

// ═══ 2 · ONE LAW, NO SECOND HIGHLIGHTER ═════════════════════════════════════

test('F6 · there is ONE zone hint in the whole app, and ONE thing that draws it', () => {
  // The state.
  const ui = read('src/stores/uiStore.js');
  // One piece of STATE (`zoneHint:`) and one SETTER (`setZoneHint:`) — the
  // pattern matches both, so the count it must equal is two.
  assert.equal((ui.match(/^ {2}(set)?[zZ]oneHint:/gm) || []).length, 2,
    'there is more than one zone hint');
  assert.match(ui, /setZoneHint: \(index\) => set\(/);

  // The drawing — PRO's, shared, and the only one.
  const view = read('src/3d/UnitView.jsx');
  assert.match(view, /\{zoneHint != null && bays\[zoneHint\] && !contour && \(/,
    'the bay highlight moved or was copied');
  assert.equal((view.match(/bays\[zoneHint\]/g) || []).length >= 1, true);

  // Retail draws NO highlight of its own — not in the panel, not on the stage.
  for (const rel of ['src/retail/design/Options.jsx', 'src/retail/design/Stage.jsx',
    'src/retail/design/DesignRoom.jsx']) {
    assert.ok(!/boxGeometry|meshBasicMaterial/.test(read(rel)),
      `${rel} draws a highlight of its own — that is a second law`);
  }
  // …and exactly one retail door to the hint.
  const adapter = read('src/retail/design/adapter.js');
  assert.equal((adapter.match(/U\(\)\.setZoneHint\(/g) || []).length, 1,
    'retail has more than one door to the hint');
});

test('F6 · the chips stand in INSIDE, and only where one bay is not a choice', () => {
  const panel = read('src/retail/design/Options.jsx');
  assert.match(panel, /data-testid="inside-bay-chips"/, 'the chip row is gone');
  assert.match(panel, /\{zones\.length > 1 \? \(/, 'the row shows for a single bay');
  assert.match(panel, /onPointerEnter=\{\(\) => A\.hoverBay\(z\.index\)\}/, 'the chip does not hover');
  // The chip SHOWS what the scene shows — both read the one shared integer.
  assert.match(panel, /const hinted = useUiStore\(\(st\) => st\.zoneHint\);/,
    'the chip does not read the hint it writes');
  assert.match(panel, /hinted === z\.index \? ' is-on' : ''/, 'the hovered chip does not light');
  assert.match(panel, /onPointerLeave=\{\(\) => A\.hoverBay\(null\)\}/, 'the hint never goes out');
  // Keyboard reaches it too — a highlight only a mouse can fire is half a control.
  assert.match(panel, /onFocus=\{\(\) => A\.hoverBay\(z\.index\)\}/);
  assert.match(panel, /onBlur=\{\(\) => A\.hoverBay\(null\)\}/);
});

test('F6 · PRO\'s own chips are untouched — the mechanism was carried, not moved', () => {
  const pro = read('src/components/AddItems.jsx');
  assert.match(pro, /onPointerEnter=\{\(\) => onZoneHover\?\.\(z\.index\)\}/,
    'PRO\'s bay chip lost its hover');
  assert.match(read('src/components/AddItemsModal.jsx'), /<AddItems unit=\{unit\} onZoneHover=\{setZoneHint\} \/>/,
    'PRO\'s modal stopped wiring the hook to the store');
  // …and retail's COPY of that modal still wires it the same way.
  assert.match(read('src/retail/design/detail/AddItemsModal.jsx'),
    /<AddItems unit=\{unit\} onZoneHover=\{setZoneHint\} \/>/,
    'the copy diverged');
});
