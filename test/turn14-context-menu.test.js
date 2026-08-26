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

test('F6.3 — the sections are [top infill + plinth] | [all end panels] | [the rest]', () => {
  const groups = groupedActions(menu('WARDROBE'));
  // T50-F10: the `dimensions` group is EMPTY now that its one entry has gone,
  // so it is not drawn. `MENU_GROUPS` still names it (below) — the ORDER is a
  // table, and a group with nothing in it is a group nothing is in, not a group
  // that has been deleted.
  assert.deepEqual(groups.map((g) => g.id), ['edit', 'run-pieces', 'end-panels', 'rest']);

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
  // T50-F10: FOUR sections now, because the `dimensions` group's one entry has
  // left the menu and `groupedActions` does not draw a group with nothing in it.
  assert.equal(groups.length, 4, 'four sections since the dimensions entry left');
  assert.equal(groups.length - 1, 3, 'three delicate lines for four sections');
});

test('F6.3 — a WALL unit’s run group carries the masking panel with the top infill', () => {
  const groups = groupedActions(menu('WUD'));
  const runPieces = groups.find((g) => g.id === 'run-pieces').actions.map((a) => a.id);
  // ─── TURN 26 (CLAUDE.md F9.2): …AND THE CORNICE JOINS THEM ──────────────
  // "A cornice run continues across ANY adjacent cornice-bearing unit whose
  // top edges meet — tall and wall alike." A run of wall units finishes at the
  // same height as the tall unit beside it and takes the same moulding, so the
  // three entries are offered here exactly as they are on a tall unit.
  assert.deepEqual(runPieces, ['top-infill', 'cornice-0', 'cornice-70', 'cornice-100', 'bottom-mask'],
    'what closes the gap above, what finishes it, and what closes the underside');
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
    'end-panel-L', 'end-panel-R', 'end-panel-B',
    'top-infill', 'side-infill', 'pin-infill-L', 'pin-infill-R',
    'plinth', 'unit-colour', 'edit-cabinet', 'save-template',
    'center-shelves', 'rotate-90', 'back-to-wall', 'side-to-wall', 'delete',
  ];
  for (const id of turn13) assert.ok(ids.includes(id), `${id} went missing`);

  // ─── T50-F10: THE TWO THE OWNER ASKED FOR, AND WHERE THEY LIVE NOW ───────
  // Iron rule 4: the ENTRIES go, the ACTIONS stay reachable, and this is where
  // that is asserted rather than promised.
  assert.ok(!ids.includes('add-doors'));
  assert.ok(!ids.includes('dimensions'));
  const panel = readFileSync(new URL('../src/components/RightPanel.jsx', import.meta.url), 'utf8');
  const plus = readFileSync(new URL('../src/components/AddItemsModal.jsx', import.meta.url), 'utf8');
  const multi = readFileSync(new URL('../src/components/MultiUnitPanel.jsx', import.meta.url), 'utf8');
  assert.match(panel, /addDoorsToUnit/, 'Add doors: the right-hand panel');
  assert.match(plus, /addDoors\(unit\.id\)/, '…the plus modal');
  assert.match(multi, /addDoorsBulk\(ids\)/, '…and a multi-selection');

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
