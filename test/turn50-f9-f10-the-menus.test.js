// ─── T50 · F9 + F10: THE MENUS ─────────────────────────────────────────────
//
// F9, the owner, 25.08.2026: *"cargo pull-out i waste bin po wyborze wardrobe
// w ogóle nie ma sensu — tylko w kitchen. to ważne, żeby się menu ustawiało pod
// typ mebla."*
//
// F10, the same evening: *"w prawym przycisku myszy menu nie powinno być Add
// doors oraz Show dimensions — dimension już mamy na górze."*
//
// The two are one sentence about one thing: a menu that offers what cannot be
// done, or offers twice what is already offered elsewhere, is a menu that is
// read more slowly every time.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { getUnitType } from '../src/engine/types.js';
import { menuActions, groupedActions, MENU_GROUPS } from '../src/lib/contextActions.js';

const ADD_ITEMS = readFileSync(new URL('../src/components/AddItems.jsx', import.meta.url), 'utf8');

// ─── F9 · THE MENU ASKS WHAT KIND OF FURNITURE THIS IS ─────────────────────

/**
 * The `kinds` list, read out of the component.
 *
 * A DOM-free reading, on purpose: the list is DATA in that file — one object
 * per row, each with its own `disabled`/`why` — and what F9 changes is the
 * data, not the drawing. Every entry is found by its `id`.
 */
function entry(id) {
  const at = ADD_ITEMS.indexOf(`id: '${id}',`);
  if (at < 0) return null;
  const end = ADD_ITEMS.indexOf('\n    },', at);
  return ADD_ITEMS.slice(at, end < 0 ? at + 400 : end);
}

test('F9 · cargo and the waste bins now name the family they belong to', () => {
  for (const id of ['cargo', 'bins']) {
    const row = entry(id);
    assert.ok(row, `${id} is still in the list`);
    assert.match(row, /families: \['kitchen'\]/, `${id} is a kitchen fitting and says so`);
    assert.match(row, /why: 'a kitchen fitting'/, `${id} carries its reason`);
  }
});

test('F9 · …and the list is filtered by the unit’s own family', () => {
  assert.match(
    ADD_ITEMS,
    /const shown = kinds\.filter\(\(k\) => !k\.families \|\| k\.families\.includes\(type\.family\)\);/,
    'ABSENT on a wardrobe — *"w ogóle nie ma sensu"* is not a greyed row',
  );
});

test('F9 · it is the SAME mechanism every other row already used', () => {
  // CLAUDE.md: *"No new mechanism."*  `type.family` is what decides, exactly as
  // it decides the trouser pull-out and the tie rack three rows down.
  assert.match(entry('trouser'), /type\.family !== 'wardrobe'/);
  assert.match(entry('tie_rack'), /type\.family !== 'wardrobe'/);
  assert.equal(getUnitType('WARDROBE').family, 'wardrobe');
  assert.equal(getUnitType('BUD').family, 'kitchen');
  assert.equal(getUnitType('SINK').family, 'kitchen');
});

test('F9 · every disabled row says WHY, in its own tooltip', () => {
  // A row a joiner cannot use has to say so where his pointer already is. The
  // `soon` rows had a tag and no reason before tonight.
  assert.match(ADD_ITEMS, /title=\{kind\.disabled \? \(kind\.why \|\| 'not for this type'\) : undefined\}/);
  assert.match(ADD_ITEMS, /data-add-family=/, 'and the family is on the row for a walk to read');
});

// ─── F10 · TWO ENTRIES LEAVE THE RIGHT-CLICK MENU ──────────────────────────

const unitOf = (type) => ({
  id: 'u1',
  type,
  params: { width: 600, height: 2150, depth: 570, unit_num: '01' },
  position: { wall: 0, x_mm: 0, rotation_deg: 0 },
});
const menu = (type, over = {}) => menuActions({
  unit: unitOf(type), panelPart: 'BUL', store: {}, profile: P, ...over,
});

// REWRITTEN BY the right-click menu turn (01.11.2026): Add doors is BACK (the
// owner, on the mockups: *"natomiast center shelves i center between oraz add
// doors bym dodal"*), offered where the cabinet takes doors and has none
// fitted; Show all dimensions stays out (*"dimension juz mamy na gorze"*).
test('F10 · Show all dimensions is not in the menu on any cabinet; Add doors is, where doors are missing', () => {
  for (const type of ['WARDROBE', 'BUD', 'WUD', 'BUDTALL', 'SINK', 'PANTRY']) {
    const ids = menu(type).map((a) => a.id);
    assert.ok(!ids.includes('dimensions'), `${type}: Show all dimensions is gone`);
    const takes = Boolean(getUnitType(type).supports?.doors);
    assert.equal(ids.includes('add-doors'), takes, `${type}: Add doors ${takes ? 'offered' : 'not offered'}`);
  }
  const hung = menuActions({
    unit: { ...unitOf('WARDROBE'), params: { ...unitOf('WARDROBE').params, doors: { count: 2 } } },
    panelPart: 'BUL', store: {}, profile: P,
  }).map((a) => a.id);
  assert.ok(!hung.includes('add-doors'), 'not on a cabinet whose doors are fitted');
});

test('F10 · over a multi-selection Add doors acts on those without doors, in one call', () => {
  const selection = ['u1', 'u2', 'u3'].map((id) => ({ ...unitOf('WARDROBE'), id }));
  selection[1] = { ...selection[1], params: { ...selection[1].params, doors: { count: 2 } } };
  const got = [];
  const entry = menuActions({
    unit: selection[0], selection, panelPart: 'BUL', store: { addDoors: (ids) => got.push(ids) }, profile: P,
  }).find((a) => a.id === 'add-doors');
  assert.equal(entry.label, 'Add doors');
  entry.run();
  assert.deepEqual(got, [['u1', 'u3']], 'u2 already has its doors');
});

test('F10 · the ACTIONS stay, and this is where each one lives now (iron rule 4)', () => {
  const read = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');

  // ── Add doors ──
  assert.match(read('stores/projectStore.js'), /\n {2}addDoors: \(/, 'the store action is untouched');
  assert.match(read('stores/projectStore.js'), /\n {2}addDoorsBulk: \(/, '…and its bulk twin');
  assert.match(read('components/RightPanel.jsx'), /addDoorsToUnit/, 'the right-hand panel');
  assert.match(read('components/AddItemsModal.jsx'), /Add doors/, 'the plus modal');
  assert.match(read('components/MultiUnitPanel.jsx'), /addDoorsBulk\(ids\)/, 'a multi-selection');

  // ── Show all dimensions ──
  // The owner gives the destination himself: *"dimension już mamy na górze."*
  assert.match(read('components/TopBar.jsx'), /label: 'Dimensions'/, 'the top bar');
  assert.match(read('components/CanvasToolbar.jsx'), /Show dimensions/, 'the canvas toolbar');
  // …and the PER-CABINET mechanism is not deleted: the store still holds it and
  // the scene still draws from it. What has gone is this menu's door onto it —
  // written into BACKLOG, because a mechanism with no door is worth knowing.
  assert.match(read('stores/uiStore.js'), /toggleUnitDimensions: \(unitId\) =>/);
  assert.match(read('stores/uiStore.js'), /clearUnitDimensions: \(\) =>/);
  assert.match(read('3d/Scene.jsx'), /wanted: Object\.keys\(unitDimensions\)/);
});

// REWRITTEN BY the right-click menu turn (01.11.2026): the sections are the
// owner's boards (edit, build, inside, copy, danger; part and cabinet under a
// part menu). The table is still the ORDER, and an empty section is not drawn.
test('F10 · the group table is the ORDER, and an empty section is simply not drawn', () => {
  assert.deepEqual(MENU_GROUPS, ['part', 'edit', 'build', 'inside', 'copy', 'danger', 'cabinet']);
  const groups = groupedActions(menu('WARDROBE'));
  assert.deepEqual(groups.map((g) => g.id), ['edit', 'build', 'inside', 'copy', 'danger']);
  // …and a section comes straight back the moment something is in it.
  const withOne = groupedActions([...menu('WARDROBE'), { id: 'x', group: 'cabinet' }]);
  assert.equal(withOne[withOne.length - 1].id, 'cabinet');
});

// REWRITTEN BY the right-click menu turn (01.11.2026): the six the owner took
// out (Rename, Colour, Rotate 90, Back to wall, Side to wall, Drawer fronts)
// are asserted gone, with their homes, in test/turn14-context-menu.test.js.
test('F10 · everything else the menu offered is still offered', () => {
  const ids = menu('WARDROBE').map((a) => a.id);
  for (const id of [
    'edit-cabinet', 'end-panels', 'top-infill', 'cornice', 'side-infill', 'pin-infill-L', 'pin-infill-R', 'plinth',
    'save-template', 'center-shelves', 'delete',
  ]) {
    assert.ok(ids.includes(id), `${id} went missing`);
  }
});

