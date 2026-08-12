// ─── Turn 14, F6: the context menu, redesigned ──────────────────────────────
//
// Four owner verdicts, and the fourth is the one worth writing down: the ORDER
// and the SECTIONS are data. Adding an entry is choosing which group it belongs
// to; the component draws the gold rule between one group and the next and has
// no opinion about what goes where.

import test from 'node:test';
import assert from 'node:assert/strict';

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

test('F6.2 — "Show all dimensions" is LAST', () => {
  for (const type of ['WARDROBE', 'BUD', 'WUD']) {
    const actions = menu(type);
    assert.equal(actions[actions.length - 1].id, 'dimensions', `${type}`);
  }
});

test('F6.3 — the sections are [top infill + plinth] | [all end panels] | [the rest]', () => {
  const groups = groupedActions(menu('WARDROBE'));
  assert.deepEqual(groups.map((g) => g.id), ['edit', 'run-pieces', 'end-panels', 'rest', 'dimensions']);

  const runPieces = groups.find((g) => g.id === 'run-pieces').actions.map((a) => a.id);
  // Turn 25 (CLAUDE.md F12.3): the TOP CORNICE joins them, as three entries
  // rather than a toggle — it is a CHOICE of moulding — and it sits with the
  // infill it is screwed to rather than at the bottom with the per-cabinet
  // actions.
  assert.deepEqual(
    runPieces,
    ['top-infill', 'cornice-0', 'cornice-70', 'cornice-100', 'plinth'],
    'the pieces that finish a run',
  );

  const panels = groups.find((g) => g.id === 'end-panels').actions.map((a) => a.id);
  assert.deepEqual(panels, ['end-panel-L', 'end-panel-R', 'end-panel-B'], 'every masking panel');

  // …and the rule between them is drawn once per boundary, never at the top.
  assert.equal(groups.length - 1, 4, 'four delicate lines for five sections');
});

test('F6.3 — a WALL unit’s run group carries the masking panel with the top infill', () => {
  const groups = groupedActions(menu('WUD'));
  const runPieces = groups.find((g) => g.id === 'run-pieces').actions.map((a) => a.id);
  assert.deepEqual(runPieces, ['top-infill', 'bottom-mask'],
    'what closes the gap above, and what closes the underside — one question at two heights');
  assert.ok(!runPieces.includes('plinth'), 'a hanging cabinet stands on nothing');
});

test('F6.3 — the ORDER of the sections is the list, not the order entries are pushed', () => {
  // An entry that names no group falls into "the rest" and cannot land above
  // the end panels by accident — which is the whole point of the indirection.
  const rogue = [{ id: 'x', group: 'nonsense' }, { id: 'y', group: 'end-panels' }];
  const groups = groupedActions(rogue);
  assert.deepEqual(groups.map((g) => g.id), ['end-panels', 'rest']);
  assert.deepEqual(groups.find((g) => g.id === 'rest').actions.map((a) => a.id), ['x']);
  assert.deepEqual(MENU_GROUPS, ['edit', 'run-pieces', 'end-panels', 'rest', 'dimensions']);
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

test('F6 — nothing that was reachable stopped being reachable', () => {
  // The redesign moves entries; it must not lose any. Every id turn 13's menu
  // offered a wardrobe is still offered, minus the one the owner deleted.
  const ids = menu('WARDROBE').map((a) => a.id);
  const turn13 = [
    'dimensions', 'end-panel-L', 'end-panel-R', 'end-panel-B',
    'top-infill', 'side-infill', 'pin-infill-L', 'pin-infill-R',
    'plinth', 'add-doors', 'unit-colour', 'edit-cabinet', 'save-template',
    'center-shelves', 'rotate-90', 'back-to-wall', 'side-to-wall', 'delete',
  ];
  for (const id of turn13) assert.ok(ids.includes(id), `${id} went missing`);
});
