// ─── TURN 20 F11: THE DRAWER GETS ITS OWN EDITOR ────────────────────────────
//
// Owner: "click a drawer and edit THE DRAWER the way a cabinet is edited — its
// own window, the drawer selected, rotate it, EXPLODE it, look at every part."
//
// The window IS the cabinet editor's, scoped (F11.2), so there is no second
// editor to test — what there is to test is the SCOPE and the ROUTES: which
// parts belong to one drawer, that the explode takes them apart along their own
// assembly axes, that the two ways in offer the right drawer, and that the
// properties F11.4 names are already the ones a selected box part carries.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { hardwareInstances } from '../src/engine/hardware3d.js';
import { cabinetBounds, explodeOffsets, explodeSettings } from '../src/engine/explode.js';
import { elementFields, isSelectableElement } from '../src/engine/elements.js';
import { menuActions } from '../src/lib/contextActions.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(join(HERE, '..', rel), 'utf8');

const budr = () => computeCabinet({
  type: 'BUDR', width: 600, height: 770, depth: 558, board_t: 18, front_t: 25, unit_num: 'DR1',
}, P);

/** The scope the modal applies, stated once here and once in the component. */
const drawerPanels = (panels, drawer) => panels
  .filter((p) => p.box && Number(p.meta?.drawer) === drawer
    && (p.role === 'drawer_box' || p.part === 'DRAWER-FRONT'));

test('F11.2 — the window holds ONE drawer: sides, back, bottom, front', () => {
  const r = budr();
  const mine = drawerPanels(r.panels, 2);
  assert.deepEqual(
    mine.map((p) => p.id).sort(),
    ['DR1-F2', 'D2-BB', 'D2-BF', 'D2-DNO', 'D2-SL', 'D2-SR'].sort(),
  );
  // …and nothing else of the cabinet. Not the carcass, not the other drawers.
  for (const p of mine) assert.equal(Number(p.meta.drawer), 2);
  assert.equal(mine.some((p) => ['BUL', 'BUR', 'TOP', 'BOTTOM', 'BACK'].includes(p.id)), false);
});

test('F11.2 — …and the runners it rides on, and only its own pair', () => {
  const r = budr();
  const { runners } = hardwareInstances(r, P);
  const mine = runners.filter((row) => row.drawer === 2);
  assert.equal(mine.length, 2, 'a pair');
  assert.deepEqual(mine.map((row) => row.side).sort(), ['L', 'R']);
  // Turn 21 (CLAUDE.md F1.3): on the runner's own underside, with the row the
  // engine drills carried beside it.
  assert.equal(mine[0].y, r.drillSummary.runner_bottoms_carcass_y[1], 'on the runner it rides');
  assert.equal(mine[0].rowY, r.drillSummary.runner_rows_carcass_y[1], 'and the drilled row is still there');
});

test('F11.3 — EXPLODE takes the box apart along its own assembly axes', () => {
  const r = budr();
  const mine = drawerPanels(r.panels, 2);
  const offsets = explodeOffsets(mine, explodeSettings(P));
  const centre = cabinetBounds(mine).centre;
  const at = (id) => offsets.get(id);

  // front +Z, back −Z, sides ±X, bottom −Y — F11.3's own list, and it falls out
  // of engine/explode.js's "a board travels along its thinnest axis, outwards"
  // rather than out of a table written for drawers.
  assert.ok(at('DR1-F2').z > 0, 'the face comes forward');
  assert.ok(at('D2-BB').z < 0, 'the back goes back');
  assert.ok(at('D2-DNO').y < 0, 'the bottom drops');
  const left = r.panels.find((p) => p.id === 'D2-SL');
  const right = r.panels.find((p) => p.id === 'D2-SR');
  assert.ok(left.box.x < centre.x && at('D2-SL').x < 0, 'the left side goes left');
  assert.ok(right.box.x > centre.x && at('D2-SR').x > 0, '…and the right one right');
  // Assembled, nothing has moved: the explode is an OFFSET, and 0 is a state.
  for (const p of mine) assert.ok(Number.isFinite(at(p.id).x + at(p.id).y + at(p.id).z));
});

test('F11.4 — a box part already carries the three things F11.4 names', () => {
  const r = budr();
  const side = r.panels.find((p) => p.id === 'D2-SL');
  assert.ok(isSelectableElement(side), 'a drawer box is a piece you can point at (turn 17)');
  const fields = elementFields(side);
  assert.ok(fields.includes('drawer-height'), 'turn 18’s field');
  assert.ok(fields.includes('runner-variant'), 'turn 18’s runner');
  assert.ok(fields.includes('material'), 'and the per-part override');
  // No new editable property is invented here — the window and the explode are
  // the feature (F11.4).
  const front = r.panels.find((p) => p.id === 'DR1-F2');
  for (const f of elementFields(front)) {
    assert.ok(['drawer-height', 'runner-variant', 'front-board', 'material'].includes(f), f);
  }
});

test('F11.1 — the context menu offers THIS drawer, and only over a drawer', () => {
  const r = budr();
  const unit = { id: 'u1', type: 'BUDR', params: r.params };
  const opened = [];
  const store = { editDrawer: (id, n) => opened.push([id, n]) };

  const onSide = menuActions({
    unit, panelPart: 'DRAWER-SIDE', panelDrawer: 3, store,
  }).find((a) => a.id === 'edit-drawer');
  assert.ok(onSide, 'right-clicking a drawer part offers it');
  assert.match(onSide.label, /Edit drawer 3/);
  onSide.run();
  assert.deepEqual(opened, [['u1', 3]]);

  // A click on a carcass side is not a click on a drawer, and the menu does not
  // guess at one.
  assert.equal(
    menuActions({ unit, panelPart: 'BUL', panelDrawer: null, store })
      .find((a) => a.id === 'edit-drawer'),
    undefined,
  );
  // "Edit cabinet" is still there and still first.
  const all = menuActions({ unit, panelPart: 'DRAWER-SIDE', panelDrawer: 3, store });
  assert.equal(all[0].id, 'edit-cabinet');
});

test('F11.1 — a double-click on a BOX panel opens the drawer; the FRONT still slides', () => {
  const view = read('src/3d/UnitView.jsx');
  // The gesture, and the guard that keeps the face's own gesture: `!front`.
  assert.ok(view.includes("if (!front && p.role === 'drawer_box' && p.meta?.drawer && onEditDrawer)"));
  // …and the front's slide is still the first thing the handler does.
  const handler = view.slice(view.indexOf('onDoubleClick={(e) => {'));
  assert.ok(handler.indexOf('onToggleFront(p.id)') < handler.indexOf('onEditDrawer'),
    'opening a drawer by its face is older than the editor and comes first');
  // The room routes it to the SAME modal the cabinet editor uses, scoped.
  const scene = read('src/3d/Scene.jsx');
  assert.ok(scene.includes("openModal('cabinet', { unitId: unit.id, drawer, at })"));
});

test('F11.2 — it is the cabinet editor’s shell, not a second editor', () => {
  const modal = read('src/components/CabinetEditorModal.jsx');
  // One file, one shell, one explode, one properties block — the scope is an
  // argument and not a fork.
  assert.ok(modal.includes('const drawer = Number(args?.drawer) > 0'));
  assert.ok(modal.includes('maximised'), 'the maximised workspace');
  assert.ok(modal.includes('data-explode="1"'), 'the same explode control');
  assert.ok(modal.includes('<ElementProperties'), 'and the same properties');
  assert.equal(read('src/pages/ConfiguratorPage.jsx').includes('DrawerEditorModal'), false,
    'there is no second editor file to drift');
});
