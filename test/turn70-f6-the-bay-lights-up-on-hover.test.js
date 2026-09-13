// ─── TURN 70 · F6 — THE BAY STILL DOES NOT LIGHT UP ────────────────────────
//
// CLAUDE.md F6, verbatim:
//
//   *"T69 F6 claims this fixed and its walk agreed; the owner says it does not
//   happen. **Probe first**: which element carries the hover handler, what the
//   chip emits, what the scene listens for — commit the table. Then fix what
//   the probe convicts."*
//
// THE PROBE CONVICTED LINK 6 — `scripts/t70-f6-probe.mjs`, table committed at
// `verify/t70/f6-probe.md`:
//
//     zoneHint={selectedUnitId === unit.id ? zoneHint : null}   Scene.jsx:1739
//
// Every link of T69's chain was present and the chip DID write the integer.
// But the scene draws the hint for the SELECTED unit, and `DesignRoom` calls
// `ui.clearSelection()` at boot — so a client who walks WHAT → WHERE → SIZE →
// INSIDE has selected nothing, while the left column is still showing a
// wardrobe's chips because `adapter.designUnit` FALLS BACK to the first one.
// The chips were about a cabinet the scene did not think was selected.
//
// T69's walk agreed because its test PRESSES a chip, and the click has always
// called `selectUnitOnStage`. Pressing one made every later hover work.
//
// THE FIX IS THE CLICK'S OWN LINE, ON THE HOVER. Not a second highlighter, and
// not one byte of `Scene.jsx` or `UnitView.jsx` — both shared with PRO, both
// correct.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { rectCorners } from '../src/engine/room.js';
import { widthZones } from '../src/engine/zones.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
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
  return id;
}

/** `Scene.jsx:1739` and `UnitView.jsx:2719`, run rather than asserted. */
function sceneDraws(unitId) {
  const passed = U().selectedUnitId === unitId ? U().zoneHint : null;
  const unit = S().units.find((u) => u.id === unitId);
  const bays = widthZones({
    width: unit.params.width,
    boardT: unit.params.board_t ?? P.board.thickness,
    partitions: (unit.params.sections?.[0]?.items || []).filter((i) => i.kind === 'partition'),
  });
  return passed != null && bays[passed] ? bays[passed] : null;
}

/** What the chip's own `onPointerEnter` contains, in its own order. */
const pointAtChip = (unitId, index) => { A.selectUnitOnStage(unitId); A.hoverBay(index); };

// ═══ 1 · THE PROBE IS COMMITTED, AND IT IS A PROBE ════════════════════════

test('F6 · the probe and its table are on disk, and the probe changes nothing', () => {
  const probe = read('scripts/t70-f6-probe.mjs');
  assert.match(probe, /DIAGNOSE BEFORE YOU CUT/);
  assert.match(read('verify/t70/f6-probe.md'), /\*\*CONVICTED\.\*\*/,
    'the committed table does not carry the verdict it was written for');
  assert.match(read('verify/t70/f6-probe.md'), /zoneHint=\{selectedUnitId === unit\.id \? zoneHint : null\}/,
    'the table does not name the line it convicted');
  // A PROBE MAY BUILD A SCENE — it has to, or it is reading its own opinion —
  // but it must not change the app. So the line is drawn where it belongs:
  // nothing on disk is written, and no source file is edited. The scene it
  // builds is a fresh project in a store that lives and dies with the process.
  assert.ok(!/writeFileSync|appendFileSync|rmSync|renameSync/.test(probe),
    'the probe writes to disk — its table is piped, never written by itself');
  assert.match(probe, /const md = process\.argv\.includes\('--md'\);/,
    'the table is not piped out; something else is producing it');
  // …and it reads the seven links from the files that own them rather than
  // asserting them, which is the difference between a probe and a claim.
  const chain = probe.slice(probe.indexOf('const chain = ['), probe.indexOf('].map(('));
  assert.equal((chain.match(/'src\/[a-zA-Z0-9/.]+'/g) || []).length, 7,
    'the chain is not the seven links the table prints');
  assert.match(probe, /lineWith\(rel, re\)/, 'the links are asserted rather than read off the files');
});

// ═══ 2 · WHAT THE PROBE CONVICTED IS STILL TRUE OF THE ADAPTER CALL ═══════

test('F6 · the chain is whole — the hint IS written, exactly as T69 built it', () => {
  const id = divided();
  U().clearSelection();
  assert.equal(A.hoverBay(1), 1);
  assert.equal(U().zoneHint, 1, 'the chip\'s integer never reached the shared store');
  assert.equal(A.hoverBay(null), null);
  assert.equal(U().zoneHint, null);
});

test('F6 · …and LINK 6 is why that was not enough — the scene draws for the SELECTED unit', () => {
  const id = divided();
  U().clearSelection();
  A.hoverBay(1);
  assert.equal(U().zoneHint, 1, 'the hint is set');
  assert.equal(U().selectedUnitId, null, 'the room boots with nothing selected — DesignRoom clears it');
  assert.equal(sceneDraws(id), null, 'THIS is the fault: a hint nobody is drawing');
  // The line itself is unchanged, and must be: it is PRO's and it is right.
  assert.match(read('src/3d/Scene.jsx'), /zoneHint=\{selectedUnitId === unit\.id \? zoneHint : null\}/);
});

test('F6 · and the left column really is showing THAT wardrobe while nothing is selected', () => {
  const id = divided();
  U().clearSelection();
  assert.equal(A.designUnit(S().units)?.id, id,
    'the fallback the probe named is gone — the diagnosis would need re-reading');
  assert.equal(A.bayZones(id).length, 3, 'the chips are about a wardrobe with three bays');
});

// ═══ 3 · THE FIX — THE CLICK'S OWN LINE, ON THE HOVER ════════════════════

test('F6 · POINTING at a bay chip lights the bay, with nothing clicked first', () => {
  const id = divided();
  U().clearSelection();
  pointAtChip(id, 1);
  assert.equal(U().selectedUnitId, id, 'the hover did not reach the cabinet the chip is about');
  const lit = sceneDraws(id);
  assert.ok(lit, 'the bay still does not light up — which is the owner\'s whole sentence');
  assert.equal(Math.round(lit.size), Math.round(A.bayZones(id)[1].size),
    'a different bay lit than the one under the pointer');
});

test('F6 · the chip is wired that way, on the pointer AND on the keyboard', () => {
  const panel = read('src/retail/design/Options.jsx');
  assert.match(panel, /onPointerEnter=\{\(\) => \{ A\.selectUnitOnStage\(unit\.id\); A\.hoverBay\(z\.index\); \}\}/,
    'the pointer still hovers a cabinet the scene is not drawing hints for');
  assert.match(panel, /onFocus=\{\(\) => \{ A\.selectUnitOnStage\(unit\.id\); A\.hoverBay\(z\.index\); \}\}/,
    'a highlight only a mouse can fire is half a control');
  assert.match(panel, /onBlur=\{\(\) => A\.hoverBay\(null\)\}/);
  assert.match(panel, /onPointerLeave=\{\(\) => A\.hoverBay\(null\)\}/);
});

test('F6 · leaving puts the HINT out and leaves the SELECTION standing', () => {
  const id = divided();
  U().clearSelection();
  pointAtChip(id, 2);
  assert.ok(sceneDraws(id), 'the bay did not light');
  A.hoverBay(null);                                   // onPointerLeave
  assert.equal(U().zoneHint, null, 'the hint stayed on after the pointer left');
  assert.equal(sceneDraws(id), null, 'the slab is still drawn');
  assert.equal(U().selectedUnitId, id,
    'leaving a chip un-selected the wardrobe the client had just pointed at');
});

test('F6 · EVERY bay lights its own, in the store\'s own order', () => {
  const id = divided(3);
  const zones = A.bayZones(id);
  for (const z of zones) {
    U().clearSelection();
    pointAtChip(id, z.index);
    const lit = sceneDraws(id);
    assert.ok(lit, `bay ${z.index} does not light`);
    assert.equal(Math.round(lit.centre), Math.round(z.centre), `bay ${z.index} lit somewhere else`);
  }
});

// ═══ 4 · ONE LAW STILL — NO SECOND HIGHLIGHTER, PRO UNTOUCHED ════════════

test('F6 · not one byte of the shared scene moved — the fix is at the chip', () => {
  const view = read('src/3d/UnitView.jsx');
  assert.match(view, /\{zoneHint != null && bays\[zoneHint\] && !contour && \(/,
    'the bay highlight moved or was copied');
  const ui = read('src/stores/uiStore.js');
  assert.equal((ui.match(/^ {2}(set)?[zZ]oneHint:/gm) || []).length, 2, 'there is more than one zone hint');
  // Retail still draws no highlight of its own.
  for (const rel of ['src/retail/design/Options.jsx', 'src/retail/design/Stage.jsx',
    'src/retail/design/DesignRoom.jsx']) {
    assert.ok(!/boxGeometry|meshBasicMaterial/.test(read(rel)), `${rel} draws a second highlight`);
  }
  assert.equal((read('src/retail/design/adapter.js').match(/U\(\)\.setZoneHint\(/g) || []).length, 1,
    'retail has more than one door to the hint');
});

test('F6 · PRO\'s own chips are untouched — T69\'s mechanism is carried, not moved', () => {
  assert.match(read('src/components/AddItems.jsx'), /onPointerEnter=\{\(\) => onZoneHover\?\.\(z\.index\)\}/,
    'PRO\'s bay chip lost its hover');
  assert.match(read('src/components/AddItemsModal.jsx'),
    /<AddItems unit=\{unit\} onZoneHover=\{setZoneHint\} \/>/, 'PRO\'s modal stopped wiring the hook');
  assert.match(read('src/retail/design/detail/AddItemsModal.jsx'),
    /<AddItems unit=\{unit\} onZoneHover=\{setZoneHint\} \/>/, 'the copy diverged');
});
