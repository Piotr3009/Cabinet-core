// ─── Turn 14, F6: the context menu, redesigned ──────────────────────────────
//
// Four owner verdicts, and the fourth is the one worth writing down: the ORDER
// and the SECTIONS are data. Adding an entry is choosing which group it belongs
// to; the component draws the gold rule between one group and the next and has
// no opinion about what goes where.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { menuActions, groupedActions, MENU_GROUPS } from '../src/lib/contextActions.js';

const unitOf = (type, extra = {}) => ({
  id: 'u1',
  type,
  position: { wall: 0, x_mm: 0, rotation_deg: 0 },
  params: { unit_num: '01', width: 600 },
  ...extra,
});

const menu = (type, extra = {}) => menuActions({ unit: unitOf(type, extra), panelPart: 'BUL', store: {} });

test('F6.1 — "Edit cabinet" is FIRST, and it is framed', () => {
  for (const type of ['WARDROBE', 'BUD', 'WUD', 'FRIDGE']) {
    const actions = menu(type);
    assert.equal(actions[0].id, 'edit-cabinet', `${type}: the first entry`);
    assert.equal(actions[0].framed, true, `${type}: and it is a standout entry`);
    assert.equal(actions.filter((a) => a.framed).length, 1, `${type}: exactly one is framed`);
  }
});

test('F6.2/T50-F10 — "Show all dimensions" has LEFT the menu', () => {
  // T14 put it last, in its own group, because it is a way of LOOKING rather
  // than something done to a cabinet. T50-F10 takes the entry out altogether —
  // the owner: *"dimension już mamy na górze"* — and what is last now is the
  // last thing that BUILDS.
  for (const type of ['WARDROBE', 'BUD', 'WUD']) {
    const actions = menu(type);
    assert.ok(!actions.some((a) => a.id === 'dimensions'), `${type}: the entry is gone`);
    assert.equal(actions[actions.length - 1].id, 'delete', `${type}`);
  }
});

// REWRITTEN BY the right-click menu turn (01.11.2026): the sections are the
// owner's boards: edit | build | inside | copy | danger, and under a part menu
// part | cabinet. The order is still DATA (MENU_GROUPS), as T14 made it.
test('F6.3 · the sections are edit | build | inside | copy | danger', () => {
  const groups = groupedActions(menu('WARDROBE'));
  assert.deepEqual(groups.map((g) => g.id), ['edit', 'build', 'inside', 'copy', 'danger']);
  const of = (id) => groups.find((g) => g.id === id).actions.map((a) => a.id);
  // Turn 25's cornice is ONE choice row now, with the infill it is screwed to.
  assert.deepEqual(of('build'), ['plinth', 'top-infill', 'cornice', 'end-panels', 'side-infill', 'pin-infill-L', 'pin-infill-R'],
    'what finishes the cabinet and its run, in the owner\'s order');
  assert.deepEqual(of('inside'), ['center-shelves', 'center-between', 'add-doors']);
  assert.deepEqual(of('copy'), ['save-template', 'duplicate']);
  assert.deepEqual(of('danger'), ['delete'], 'Delete red, alone, last');
  // …and the rule between them is drawn once per boundary, never at the top.
  assert.equal(groups.length - 1, 4, 'four delicate lines for five sections');
  // No group carries a title in the cabinet menu; only a part menu's Cabinet group does.
  assert.ok(groups.every((g) => g.title === undefined));
});

test('F6.3 · a WALL unit’s build group carries the masking panel with the top infill', () => {
  const groups = groupedActions(menu('WUD'));
  const build = groups.find((g) => g.id === 'build').actions.map((a) => a.id);
  // TURN 26 (F9.2): a run of wall units takes the same moulding as the tall unit beside it.
  assert.deepEqual(build, ['top-infill', 'cornice', 'end-panels', 'side-infill', 'pin-infill-L', 'pin-infill-R', 'bottom-mask'],
    'what closes the gap above, what finishes it, and what closes the underside');
  assert.ok(!build.includes('plinth'), 'a hanging cabinet stands on nothing');
});

test('F6.3 · the ORDER of the sections is the list, not the order entries are pushed', () => {
  // An entry that names no group falls into "inside" and cannot land above
  // the build section by accident, which is the whole point of the indirection.
  const rogue = [{ id: 'x', group: 'nonsense' }, { id: 'y', group: 'danger' }, { id: 'z', group: 'build' }];
  const groups = groupedActions(rogue);
  assert.deepEqual(groups.map((g) => g.id), ['build', 'inside', 'danger']);
  assert.deepEqual(groups.find((g) => g.id === 'inside').actions.map((a) => a.id), ['x']);
  assert.deepEqual(MENU_GROUPS, ['part', 'edit', 'build', 'inside', 'copy', 'danger', 'cabinet']);
  // A group's title is the one its entries carry (the Cabinet group of a part menu).
  const titled = groupedActions([{ id: 'a', group: 'cabinet', groupTitle: 'Cabinet W02' }, { id: 'b', group: 'part' }]);
  assert.deepEqual(titled.map((g) => [g.id, g.title]), [['part', undefined], ['cabinet', 'Cabinet W02']]);
});

test('F6.3 — every entry belongs to a section, and no section is invented', () => {
  for (const type of ['WARDROBE', 'BUD', 'WUD', 'FRIDGE', 'SINK']) {
    for (const a of menu(type)) {
      assert.ok(MENU_GROUPS.includes(a.group), `${type} ${a.id}: group "${a.group}"`);
    }
  }
});

test('F6.4 — the hinges toggle is GONE from the menu, and only from the menu', () => {
  for (const type of ['WARDROBE', 'BUD', 'WUD', 'FRIDGE']) {
    assert.ok(!menu(type).some((a) => a.id === 'hinges'), `${type} still offers it`);
  }
  // The entry is what goes. Passing the flag in changes nothing, so a caller
  // that has not been updated cannot bring it back.
  const withFlag = menuActions({
    unit: unitOf('WARDROBE'), panelPart: 'BUL', hinges: true, store: {},
  });
  assert.ok(!withFlag.some((a) => a.id === 'hinges'));
});

// REWRITTEN BY the right-click menu turn (01.11.2026): the owner took six
// entries out (*"drawers front usun ... colour i turn tez usunac ... rename ...
// na pole name, juz jest, mniej zmian"*) and brought Add doors back. The ENTRIES
// go; every ACT stays reachable, and this is where that is asserted.
test('F6 · nothing that was reachable stopped being reachable', () => {
  const ids = menu('WARDROBE').map((a) => a.id);
  const kept = [
    'edit-cabinet', 'plinth', 'top-infill', 'cornice', 'end-panels', 'side-infill', 'pin-infill-L', 'pin-infill-R',
    'center-shelves', 'save-template', 'delete',
  ];
  for (const id of kept) assert.ok(ids.includes(id), `${id} went missing`);
  for (const id of ['rename', 'unit-colour', 'rotate-90', 'back-to-wall', 'side-to-wall', 'drawer-fronts', 'dimensions']) {
    assert.ok(!ids.includes(id), `${id} is still in the menu`);
  }
  // Add doors is BACK (it left on 25.08.2026 at T50 F10), and it is still the
  // store's one answer in the other three places.
  assert.ok(ids.includes('add-doors'));
  const panel = readFileSync(new URL('../src/components/RightPanel.jsx', import.meta.url), 'utf8');
  const plus = readFileSync(new URL('../src/components/AddItemsModal.jsx', import.meta.url), 'utf8');
  const multi = readFileSync(new URL('../src/components/MultiUnitPanel.jsx', import.meta.url), 'utf8');
  assert.match(panel, /addDoorsToUnit/, 'Add doors: the right-hand panel');
  assert.match(plus, /addDoors\(unit\.id\)/, '…the plus modal');
  assert.match(multi, /addDoorsBulk\(ids\)/, '…and a multi-selection');
  // Where the six that left live: the right panel's NAME field, its Colour,
  // its rotation row; the drawer fronts' store acts and the Hide fronts lens.
  assert.match(panel, /data-unit-name=\{unit\.id\}/, 'Rename: the NAME field');
  assert.match(panel, /openModal\('unit-finish', \{ unitIds: \[unit\.id\]/, 'Colour: the right panel');
  assert.match(panel, /rotateUnit\(unit\.id, 'step', 90\)/, 'Rotate 90: the right panel');
  assert.match(panel, /rotateUnit\(unit\.id, 'back'\)/, 'Back to wall: the right panel');
  assert.match(panel, /rotateUnit\(unit\.id, 'side'\)/, 'Side to wall: the right panel');
  const projectStore = readFileSync(new URL('../src/stores/projectStore.js', import.meta.url), 'utf8');
  assert.match(projectStore, /removeDrawerFronts: \(unitId\) =>/, 'Drawer fronts: the store act stays');
  assert.match(projectStore, /addDrawerFronts: \(unitId\) =>/);
  const toolbar = readFileSync(new URL('../src/components/CanvasToolbar.jsx', import.meta.url), 'utf8');
  assert.match(toolbar, /onClick=\{toggleHideFronts\}/, '*"mam przycisk hide all fronts"*');
  const top = readFileSync(new URL('../src/components/TopBar.jsx', import.meta.url), 'utf8');
  const bar = readFileSync(new URL('../src/components/CanvasToolbar.jsx', import.meta.url), 'utf8');
  assert.match(top, /label: 'Dimensions'/, 'Dimensions: the top bar — *"już mamy na górze"*');
  assert.match(bar, /Hide dimensions' : 'Show dimensions/, '…and the canvas toolbar');
  // …and the per-cabinet MECHANISM is not deleted, which is the other half of
  // rule 4: the store still holds it and the scene still draws from it.
  const ui = readFileSync(new URL('../src/stores/uiStore.js', import.meta.url), 'utf8');
  assert.match(ui, /toggleUnitDimensions: \(unitId\) =>/);
  const scene = readFileSync(new URL('../src/3d/Scene.jsx', import.meta.url), 'utf8');
  assert.match(scene, /wanted: Object\.keys\(unitDimensions\)/);
});
