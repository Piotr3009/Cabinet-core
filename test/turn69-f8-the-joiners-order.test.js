// ─── TURN 69 · F8 — EXTRAS, IN THE JOINER'S ORDER ──────────────────────────
//
// CLAUDE.md, F8, verbatim:
//
//   *"**ADD TOP BOX leaves EXTRAS** — split door covers it (owner: "po cholerę
//   ten box"). Engine `WARDROBE_TOP` and PRO stay; only the client entry dies."*
//   *"**HANDLES row lands in EXTRAS — bezapelacyjnie** — same store path as
//   FRONTS' opening controls. One law, two doors."*
//   *"**Door swing L/R returns to the door's dock** — it left with the hinge
//   block in T68 F6; the swing is the CLIENT's choice, the hinge model stays
//   hidden."*
//   *"**TOP INFILL asks "to the ceiling?"**: yes → first the VERTICAL members
//   reach the ceiling (end panel if present, vertical infills), THEN the
//   horizontal top infill closes — automatically, in that order. A side must
//   never show (the visibility law)."*

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import * as A from '../src/retail/design/adapter.js';
import { HANDLE_TYPES } from '../src/engine/handles.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const S = () => useProjectStore.getState();

function wardrobe({ height = 2000, panels = [] } = {}) {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const { id } = S().addUnit('WARDROBE', { params: { width: 1000, height, depth: 600 } });
  S().updateUnitParams(id, { width: 1000, height });
  for (const side of panels) S().addEndPanel(id, side);
  return id;
}

// ═══ 1 · THE JOINER'S ORDER ═════════════════════════════════════════════════

test('F8 · vertical members first, horizontal after — asserted as an ORDER', () => {
  const id = wardrobe({ panels: ['L', 'R'] });
  const { order } = S().closeToCeiling(id);

  const lastVertical = Math.max(
    ...order.map((step, i) => (step.startsWith('end-panel') || step.startsWith('side-infill') ? i : -1)),
  );
  const horizontal = order.indexOf('top-infill');
  assert.ok(horizontal > lastVertical,
    `the top closed before the uprights were up: ${order.join(' → ')}`);
  // And the uprights themselves are in the joiner's own order: the piece that
  // SHOWS goes first.
  assert.ok(order.indexOf('end-panel:L') < order.indexOf('side-infill:L'),
    'the scribe filler went up before the end panel beside it');
});

test('F8 · every member actually reaches the ceiling — the law is not a label', () => {
  const id = wardrobe({ panels: ['L'] });
  const before = S().units.find((u) => u.id === id);
  const gap = 2500 - (before.params.height + (before.params.leg_height || 0));
  assert.ok(gap > 0, 'this scene is meant to have a gap');

  S().closeToCeiling(id);
  const u = S().units.find((x) => x.id === id);
  assert.equal(Math.round(u.params.top_infill_mm), gap, 'the horizontal did not close the gap');
  assert.equal(Math.round(u.params.side_infill_left_top_mm), gap, 'the left upright stopped short');
  assert.equal(Math.round(u.params.side_infill_right_top_mm), gap, 'the right upright stopped short');
  for (const ep of u.params.end_panels || []) {
    assert.equal(Math.round(ep.top_mm), gap, `the ${ep.side} end panel stopped short`);
  }
  // …and the uprights are PINNED, so the next settle cannot quietly shorten
  // them and put a side edge back on show.
  assert.equal(u.params.side_infill_left_pinned, true);
  assert.equal(u.params.side_infill_right_pinned, true);
});

test('F8 · a wardrobe already at the ceiling is not asked the question', () => {
  const id = wardrobe({ height: 2500 });
  assert.equal(A.closedToCeiling(id), true, 'the button would be live with nothing to do');
});

test('F8 · the ORDER lives in the store, and the panel only asks', () => {
  const store = read('src/stores/projectStore.js');
  assert.match(store, /closeToCeiling: \(unitId\) => runBatch\(\(\) => \{/,
    'the order is not in the shared store');
  // Nothing in the client computes a millimetre or names a piece.
  const panel = read('src/retail/design/Options.jsx');
  const row = panel.slice(panel.indexOf('data-testid="extras-to-the-ceiling"') - 900,
    panel.indexOf('data-testid="extras-to-the-ceiling"') + 900);
  assert.ok(!/side_infill|top_infill_mm|end_panels/.test(row), 'the panel writes geometry');
  assert.match(row, /A\.closeToCeiling\(unit\.id\)/, 'the panel does not ask the store');
});

// ═══ 2 · ADD TOP BOX LEAVES — THE CLIENT ENTRY ONLY ═════════════════════════

test('F8 · ADD TOP BOX is gone from EXTRAS', () => {
  const panel = read('src/retail/design/Options.jsx');
  assert.ok(!panel.includes('data-testid="layout-add-top-box"'), 'the button is still in EXTRAS');
  assert.ok(!/>\s*ADD TOP BOX\s*</.test(panel), 'the label is still in EXTRAS');
});

test('F8 · …and nothing behind it died: the engine, the store and PRO all stay', () => {
  // The TYPE.
  assert.match(read('src/engine/types.js') + read('src/engine/items.js'), /WARDROBE_TOP/);
  // The adapter call, untouched — a later turn may want it back.
  assert.match(read('src/retail/design/adapter.js'), /export function addTopBox\(hostId\)/);
  assert.match(read('src/retail/design/adapter.js'), /S\(\)\.addUnit\('WARDROBE_TOP', \{ near: host\.id \}\)/);
  // PRO's own road to it: the LIBRARY category a joiner adds one from, and the
  // part registry that machines it. Neither is a client control and neither moved.
  assert.match(read('src/engine/types.js'),
    /\{ id: 'wardrobe', label: 'Wardrobes', types: \['WARDROBE', 'WARDROBE_TOP'\] \}/,
    'the top box left the library a joiner adds it from');
  assert.match(read('src/engine/partRegistry.js'), /typeId === 'WARDROBE_TOP'/,
    'the top box stopped being machined');
  assert.match(read('src/engine/topBox.js'), /WARDROBE_TOP/, 'the top box engine went with the button');
  // …and it still works, which is the only proof that matters.
  const id = wardrobe();
  const placed = A.addTopBox(id);
  assert.equal(placed.ok, true, 'the capability died with the button');
  assert.equal(A.topBoxesOn(id).length, 1);
  // A saved project's box is still EDITABLE in EXTRAS — only the ADD died.
  assert.match(read('src/retail/design/Options.jsx'), /testid="topbox-width"/);
});

// ═══ 3 · HANDLES IN EXTRAS, ONE LAW ═════════════════════════════════════════

test('F8 · the HANDLES row stands in EXTRAS, on the FRONTS store path', () => {
  const panel = read('src/retail/design/Options.jsx');
  assert.match(panel, /data-testid="extras-handles"/, 'no HANDLES row in EXTRAS');
  assert.match(panel, /A\.handleSystems\(\)\.map/, 'the row invented its own list');
  assert.match(panel, /onClick=\{\(\) => A\.setHandle\(h\.id\)\}/, 'the row writes something else');

  // ONE LAW: `setHandle` is the only writer, and it is `setProjectHandle`.
  const adapter = read('src/retail/design/adapter.js');
  assert.equal((adapter.match(/S\(\)\.setProjectHandle\(/g) || []).length, 1,
    'there is more than one handle writer in retail');
  // …and both rows read the SAME answer.
  assert.match(adapter, /export const handleChoice = \(project\) => String\(/);
});

test('F8 · the list is the ENGINE\'s own, NONE included', () => {
  const ids = A.handleSystems().map((h) => h.id);
  assert.deepEqual(ids, [...HANDLE_TYPES.map((h) => h.id), 'none'],
    'retail wrote a handle list of its own');
  // And the round trip is real.
  wardrobe();
  A.setHandle('bar');
  assert.equal(A.handleChoice(S().project), 'bar');
  A.setHandle('none');
  assert.equal(A.handleChoice(S().project), 'none', 'NONE is not the engine\'s null');
});

// ═══ 4 · THE SWING, BACK IN THE DOOR'S DOCK ═════════════════════════════════

test('F8 · the swing row is in the dock, and it presses the store\'s own call', () => {
  const dock = read('src/retail/design/Detail.jsx');
  assert.match(dock, /data-testid="dock-door-swing"/, 'the swing did not come back');
  for (const hand of ['L', 'R']) {
    assert.ok(dock.includes(`data-testid={\`dock-swing-\${hand}\`}`) || dock.includes(`dock-swing-${hand}`),
      `the dock offers no ${hand} swing`);
  }
  assert.match(dock, /A\.setDoorHinge\(selection\.unitId,/, 'the row writes something other than the hand');
  // The engine's forced hand is READ, never re-derived.
  assert.match(dock, /disabled=\{swing\.forced\}/, 'the row offers a choice the engine has taken');
});

test('F8 · the hinge MODEL stays hidden — T68 F6 is not undone', () => {
  const css = read('src/retail/styles/room.css');
  assert.match(css, /\[data-hinge-modal\] > div:has\(> \[data-hinge-assign\]\)/,
    'the hinge picker came back into the client\'s dock');
  assert.match(css, /\[data-hinge-modal-rows\]/, 'the hinge-height rows came back');
  // …and the swing row is NOT inside the copy — the copy is still a copy.
  const copy = read('src/retail/design/detail/DoorModal.jsx');
  assert.ok(!/dock-door-swing|dock-swing-/.test(copy), 'F8 wrote a row into a copied window');
  const pro = read('src/components/DoorModal.jsx');
  assert.equal(copy.split('\n').length, pro.split('\n').length, 'the copy is not PRO\'s length');
});

test('F8 · the hand really changes, through the store', () => {
  // A NARROW wardrobe, so ONE door is the engine's own answer: the owner's
  // LISP law is one leaf while (W − 4) ≤ 700 and two above it. A PAIR hangs
  // both ways by that same law, which is what `doorHinge().reason` says and
  // why the dock row shows the reason rather than pretending there is a choice.
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const { id } = S().addUnit('WARDROBE', { params: { width: 600, height: 2000, depth: 600 } });
  S().updateUnitParams(id, { width: 600, height: 2000 });
  A.addDoors(id);
  const [panel] = A.doorPanels(id);
  assert.equal(A.doorPanels(id).length, 1, 'this scene is meant to have one leaf');
  assert.ok(panel, 'this scene is meant to have a door');
  assert.equal(A.isDoorPanel(panel), true);
  A.setDoorHinge(id, panel, 'R');
  const after = A.doorPanels(id)[0];
  assert.equal(A.doorHinge(id, after).hand, 'R', 'the door did not change hand');
  A.setDoorHinge(id, after, 'L');
  assert.equal(A.doorHinge(id, A.doorPanels(id)[0]).hand, 'L');
});
