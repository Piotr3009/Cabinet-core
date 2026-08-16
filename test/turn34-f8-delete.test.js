// ─── Turn 34, CLAUDE.md F8: DELETE — the key, the button, one per press ────
//
// The owner, 16.08.2026: *"szuflady i wszystkie inne elementy: po naciśnięciu
// i podświetleniu — usunięcie przez naciśnięcie Delete; w modalu pokaż też
// Delete. Jak mamy 3 szuflady, niech usuwają się po jednej, tak jak
// naciskasz."*
//
// Four things have to be true together, and each has cost somebody a cabinet
// somewhere: the key acts on the selection, it is INERT while anything types,
// a stack of three clears in three presses with the selection falling
// downward, and every removal runs the T33-F5 heal sweep.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import {
  DELETE_KEYS, isDeleteKey, isTypingTarget,
} from '../src/lib/deleteKey.js';
import {
  deletePlan, drawerIndexOf, drawerItemsOf,
} from '../src/engine/deleteElement.js';

const store = () => useProjectStore.getState();
const ui = () => useUiStore.getState();

function project() {
  store().loadProject({
    id: null,
    name: 't34-f8',
    room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
    design: {},
  }, []);
}

// ─── the guard: when Delete is the delete key ──────────────────────────────

const el = (tag, extra = {}) => ({
  tagName: tag, parentElement: null, isContentEditable: false, getAttribute: () => null, ...extra,
});

test('the key is Delete — and Backspace, because a Mac ⌫ IS the delete key', () => {
  assert.deepEqual([...DELETE_KEYS].sort(), ['Backspace', 'Delete']);
  const body = el('BODY');
  for (const key of ['Delete', 'Backspace']) {
    assert.equal(isDeleteKey({ key, target: body }, null), true);
  }
  assert.equal(isDeleteKey({ key: 'x', target: body }, null), false);
  assert.equal(isDeleteKey(null, null), false);
});

test('it is INERT while anything types — input, textarea, select, contenteditable', () => {
  for (const tag of ['INPUT', 'TEXTAREA', 'SELECT']) {
    assert.equal(isTypingTarget(el(tag)), true, tag);
    assert.equal(isDeleteKey({ key: 'Delete', target: el(tag) }, null), false);
  }
  // A MODAL NUMBER FIELD is an <input type="number"> — caught by the tag.
  assert.equal(isTypingTarget(el('INPUT', { type: 'number' })), true);
  // contenteditable, both spellings.
  assert.equal(isTypingTarget(el('DIV', { isContentEditable: true })), true);
  assert.equal(isTypingTarget(el('DIV', { getAttribute: (k) => (k === 'contenteditable' ? 'true' : null) })), true);
  // …and a node NESTED inside one: the walk goes up.
  const inner = el('SPAN', { parentElement: el('DIV', { isContentEditable: true }) });
  assert.equal(isTypingTarget(inner), true);
  // A plain div is not typing.
  assert.equal(isTypingTarget(el('DIV')), false);
});

test('it is inert while the FOCUS is in a field, even if the event came elsewhere', () => {
  const doc = { activeElement: el('INPUT') };
  assert.equal(isDeleteKey({ key: 'Delete', target: el('BODY') }, doc), false);
});

test('a modifier is somebody else\'s gesture — ⌘⌫ is not our delete', () => {
  const body = el('BODY');
  for (const mod of ['metaKey', 'ctrlKey', 'altKey']) {
    assert.equal(isDeleteKey({ key: 'Backspace', target: body, [mod]: true }, null), false, mod);
  }
});

// ─── the plan: what goes, and what is selected next ────────────────────────

test('nothing selected deletes nothing, and says so', () => {
  const plan = deletePlan({ unit: null, panel: null });
  assert.equal(plan.allowed, false);
  assert.equal(plan.reason, 'Nothing is selected.');
});

test('a carcass board is refused with the kit\'s own sentence', () => {
  project();
  const u = store().addUnit('WARDROBE');
  const side = store().unitResult(u.id).panels.find((p) => p.id === 'BUL');
  const unit = store().units.find((x) => x.id === u.id);
  const plan = deletePlan({ unit, panel: side });
  assert.equal(plan.allowed, false);
  assert.match(plan.reason, /held together by this board/);
});

test('a shelf goes as its ITEM, and a shelf is not a drawer', () => {
  project();
  const u = store().addUnit('WARDROBE');
  store().addShelves(u.id, 1, null);
  const unit = store().units.find((x) => x.id === u.id);
  const shelf = store().unitResult(u.id).panels.find((p) => p.part === 'SHELF');
  const plan = deletePlan({ unit, panel: shelf });
  assert.equal(plan.allowed, true);
  assert.equal(plan.target, 'item');
  assert.equal(plan.itemId, shelf.meta.itemId);
  assert.equal(plan.nextDrawer, null, 'only a stack moves the selection');
  assert.equal(drawerIndexOf(shelf), null);
});

// ─── the drawer stack: 3 → 2 → 1 → empty, one per press ────────────────────

function wardrobeWithDrawers(n = 3) {
  project();
  const u = store().addUnit('WARDROBE');
  store().addDrawers(u.id, n, 'overlay', 200, null, null);
  return u.id;
}

const drawerFronts = (unitId) => store().unitResult(unitId).panels
  .filter((p) => p.part === 'DRAWER-FRONT')
  .sort((a, b) => a.meta.drawer - b.meta.drawer);

test('the plan names the drawer ITEM behind a front, and the drawer below it', () => {
  const id = wardrobeWithDrawers(3);
  const unit = store().units.find((x) => x.id === id);
  assert.equal(drawerItemsOf(unit).length, 3);
  const fronts = drawerFronts(id);
  assert.equal(fronts.length, 3);

  const top = deletePlan({ unit, panel: fronts[2] });
  assert.equal(top.allowed, true, 'a drawer FRONT is deletable — T12 could not');
  assert.equal(top.target, 'item');
  assert.equal(top.itemId, drawerItemsOf(unit)[2].id);
  assert.equal(top.label, 'Drawer 3');
  assert.equal(top.nextDrawer, 2, 'the selection falls DOWNWARD');

  // …and from the BOTTOM one it lands on whatever is now the bottom.
  const bottom = deletePlan({ unit, panel: fronts[0] });
  assert.equal(bottom.nextDrawer, 1);
});

test('three presses clear a stack of three, and the selection follows', () => {
  const id = wardrobeWithDrawers(3);
  const top = drawerFronts(id)[2];
  ui().selectElement(id, top.id);

  // press 1
  let res = store().deleteSelectedElement();
  assert.equal(res.ok, true);
  assert.equal(drawerFronts(id).length, 2, '3 → 2');
  assert.ok(res.next, 'the selection landed on the next drawer down');
  assert.equal(useUiStore.getState().selectedElement.elementRef, res.next);
  assert.equal(store().unitResult(id).panels.find((p) => p.id === res.next).meta.drawer, 2);

  // press 2 — no pointer moved, and it takes the next one
  res = store().deleteSelectedElement();
  assert.equal(res.ok, true);
  assert.equal(drawerFronts(id).length, 1, '2 → 1');
  assert.equal(store().unitResult(id).panels.find((p) => p.id === res.next).meta.drawer, 1);

  // press 3 — the stack is empty and the selection is cleared
  res = store().deleteSelectedElement();
  assert.equal(res.ok, true);
  assert.equal(drawerFronts(id).length, 0, '1 → empty');
  assert.equal(res.next, null);
  assert.equal(useUiStore.getState().selectedElement, null);

  // press 4 — nothing is selected, so nothing happens
  const none = store().deleteSelectedElement();
  assert.equal(none.ok, false);
  assert.equal(none.error, 'Nothing is selected.');
});

test('the drawer items renumber bottom-up as the stack shrinks', () => {
  const id = wardrobeWithDrawers(3);
  ui().selectElement(id, drawerFronts(id)[1].id);       // the MIDDLE one
  store().deleteSelectedElement();
  const unit = store().units.find((x) => x.id === id);
  assert.deepEqual(drawerItemsOf(unit).map((i) => i.index), [1, 2],
    'drawer i still means "i-th from the floor"');
});

// ─── the sweep runs after every delete (F8 → T33-F5) ───────────────────────

test('heal-after-delete: an end panel leaving heals the front beside it', () => {
  project();
  const a = store().addUnit('BUD');
  store().updateUnitParams(a.id, { doors: { count: 1 } });
  const b = store().addUnit('BUD', { near: a.id, side: 'right' }).id;
  store().updateUnitParams(b, { doors: { count: 1 } });
  store().addEndPanel(b, { side: 'R' });
  const trimmed = store().units.find((u) => u.id === b).params.front_edge_trim;
  assert.ok(trimmed && Object.keys(trimmed).length, 'the panel demanded a trim');

  const panel = store().unitResult(b).panels.find((p) => /END/.test(p.id));
  ui().selectElement(b, panel.id);
  const res = store().deleteSelectedElement();
  assert.equal(res.ok, true);

  // The matrix must have re-measured: no healable correction may stand.
  const standing = store().frontClearances().flatMap((r) => ['left', 'right']
    .filter((s) => r.edges?.[s] && !r.edges[s].parked && Number(r.edges[s].correctionMm) > 0.01)
    .map((s) => `${r.panelId}:${s}`));
  assert.deepEqual(standing, [], 'the heal sweep ran on the delete path');
});

test('heal-after-delete: a drawer leaving under a bay door re-measures too', () => {
  project();
  const a = store().addUnit('WARDROBE');
  store().updateUnitParams(a.id, { doors: true });
  store().addDrawers(a.id, 2, 'overlay', 200, null, null);
  const b = store().addUnit('WARDROBE', { near: a.id, side: 'right' }).id;
  store().updateUnitParams(b, { doors: true });
  store().addEndPanel(b, { side: 'R' });

  ui().selectElement(a.id, drawerFronts(a.id)[1].id);
  assert.equal(store().deleteSelectedElement().ok, true);
  const standing = store().frontClearances().flatMap((r) => ['left', 'right']
    .filter((s) => r.edges?.[s] && !r.edges[s].parked && Number(r.edges[s].correctionMm) > 0.01)
    .map((s) => `${r.panelId}:${s}`));
  assert.deepEqual(standing, []);
});

// ─── the modal button is the SAME action ───────────────────────────────────

test('the modal shows Delete, and it calls the one store action', () => {
  const src = readFileSync(new URL('../src/components/DoorModal.jsx', import.meta.url), 'utf8');
  assert.match(src, /function DeleteElement\(/);
  assert.match(src, /data-element-delete=\{panel\.id\}/);
  assert.match(src, /deleteSelectedElement\(\{ unitId: unit\.id, elementRef: panel\.id \}\)/);
  // No undo exists, and the button says so.
  assert.match(src, /no undo/);
  // Where the piece may not go, it says WHY rather than offering a dead button.
  assert.match(src, /data-element-delete-why="1"/);
  // …and it is rendered in the modal's own section A.
  assert.match(src, /<DeleteElement unit=\{unit\} panel=\{panel\} onDone=\{closeModal\} \/>/);
});

test('the key path routes through the SAME action, behind the same guard', () => {
  const src = readFileSync(new URL('../src/pages/ConfiguratorPage.jsx', import.meta.url), 'utf8');
  assert.match(src, /if \(!isDeleteKey\(e\)\) return;/);
  assert.match(src, /deleteSelectedElement\(\{ unitId: unit\.id, elementRef: panel\.id \}\)/);
  // T12's `meta.itemId` short-circuit — the reason a drawer could never be
  // deleted — is gone from the key path.
  const block = src.slice(src.indexOf('if (!isDeleteKey(e)) return;'));
  assert.ok(!/const itemId = panel\?\.meta\?\.itemId;/.test(block.slice(0, 2000)),
    'the itemId short-circuit is gone');
});

test('a selected element that cannot go leaves the scene exactly as it was', () => {
  project();
  const u = store().addUnit('WARDROBE');
  const before = JSON.stringify(store().units);
  ui().selectElement(u.id, 'BUL');
  const res = store().deleteSelectedElement();
  assert.equal(res.ok, false);
  assert.match(res.error, /held together/);
  assert.equal(JSON.stringify(store().units), before, 'nothing moved');
});

test('the bare engine is untouched by any of this', () => {
  // F8 is a store/UI feature: no engine geometry rides it.
  const r = computeCabinet({ ...defaultParamsFor('WARDROBE', P), unit_num: '01' }, P);
  assert.ok(r.panels.length > 0);
});
