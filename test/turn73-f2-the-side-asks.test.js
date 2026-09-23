// ─── TURN 73 · F2 · CLICK THE OUTSIDE OF A SIDE: "ADD END PANEL? YES / NO" ─
//
// The owner, 23.09.2026:
//
//   *"jak klikniesz na bok szafy z zewnątrz, żeby się pokazywało add panel
//   (Yes / No), to będzie bardzo intuicyjne."*
//
// ─── AMENDED BY T74 F1 ──────────────────────────────────────────────────────
//
// The owner, retesting it on 23.09.2026: *"po naciśnięciu na bok szafy jak nie
// ma panelu powinno się pokazać to pytanie, a nie pierwsza czy druga szafa,
// po prostu po naciśnięciu boku szafy, a jak nic nie naciśniesz i klikniesz na
// coś innego to znika mały modal jak wymiary lub j pull hands."*
//
// So: ANY side with no panel asks (the flush-neighbour exclusion is gone), and
// the question is a small MODAL at the click (`askSide`, `Editors`), not a
// docked menu. The blocks below say which of T73's assertions moved and why;
// `test/turn74-f1-the-side-asks-any-wardrobe.test.js` carries the new law.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { rectCorners } from '../src/engine/room.js';
import { setWardrobeEndPanelAuto } from '../src/engine/endPanelAuto.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import * as A from '../src/retail/design/adapter.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();
const U = () => useUiStore.getState();

function aClientRoom() {
  setWardrobeEndPanelAuto(true);
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  return A.addFirstWardrobe();
}
const panelOf = (id, part) => S().unitResult(id).panels.find((p) => p.part === part);
const sidesWithPanel = (id) => (S().units.find((u) => u.id === id).params.end_panels || [])
  .map((ep) => (ep.side === 'R' ? 'R' : 'L')).sort();

test('T73 F2 · a bare outer side asks (amended by T74 F1: the answer is the modal, not a menu)', () => {
  const a = aClientRoom();
  // The first wardrobe stands at the wall start: its LEFT side is bare.
  assert.deepEqual(sidesWithPanel(a), ['R']);
  assert.deepEqual(A.sideAskFor(a, panelOf(a, 'BUL')), { side: 'L' });
  // AMENDED BY T74 F1: the side resolves to NO menu (it is the way out again,
  // T65 F10), and the click opens the small question beside the pointer.
  assert.equal(A.resolveSelection({ unitId: a, elementRef: panelOf(a, 'BUL').id }), null);
  assert.equal(A.askSide(a, panelOf(a, 'BUL').id, { x: 300, y: 200 }), true);
  assert.equal(U().modal, 'add-panel');
  A.closeEditor();
  assert.ok(!/menu === 'add-panel'/.test(read('src/retail/design/detail/docked.jsx')),
    'the dock still carries the question');
});

test('T73 F2 · a side that already carries a panel does not ask (it stays the way out)', () => {
  const a = aClientRoom();
  assert.equal(A.sideAskFor(a, panelOf(a, 'BUR')), null);
  assert.equal(A.resolveSelection({ unitId: a, elementRef: panelOf(a, 'BUR').id }), null);
});

// AMENDED BY T74 F1 · INVERTED. The owner: *"a nie pierwsza czy druga szafa,
// po prostu po naciśnięciu boku szafy"*. A side a flush neighbour covers asks
// too; the STORE refuses in its own words where there is no room.
test('T73 F2 · a side next to a flush neighbour asks too (T74 F1), and the store refuses in words', () => {
  const a = aClientRoom();
  const r = A.addBesidePlus({ unitId: a, side: 'right' });
  assert.equal(r.ok, true, r.said);
  assert.deepEqual(A.sideAskFor(a, panelOf(a, 'BUR')), { side: 'R' }, 'the side between two wardrobes did not ask');
  assert.deepEqual(A.sideAskFor(r.id, panelOf(r.id, 'BUL')), { side: 'L' }, 'the side between two wardrobes did not ask');
  const res = A.addEndPanelFromAsk(a, 'R');
  assert.equal(res.ok, false, 'a panel went into no room');
  assert.match(res.said, /No room for a .* end panel on the right/);
});

test('T73 F2 · YES puts the panel on by hand (permanent) and opens its own menu', () => {
  const a = aClientRoom();
  const res = A.addEndPanelFromAsk(a, 'L');
  assert.equal(res.ok, true, res.said);
  assert.deepEqual(sidesWithPanel(a), ['L', 'R']);
  const unit = S().units.find((u) => u.id === a);
  assert.ok((unit.params.end_panel_asked || []).includes('L') || JSON.stringify(unit.params).includes('asked'),
    'the panel is not the client\'s own');
  assert.deepEqual(U().selectedElement, { unitId: a, elementRef: 'END-L' });
  const found = A.resolveSelection(U().selectedElement);
  assert.equal(found?.menu, 'panel', 'the panel\'s own menu did not open');
});

test('T73 F2 · NO closes the question and changes nothing', () => {
  const a = aClientRoom();
  // AMENDED BY T74 F1: the question is the MODAL now, so NO closes the modal.
  A.askSide(a, panelOf(a, 'BUL').id, { x: 300, y: 200 });
  assert.equal(U().modal, 'add-panel');
  A.dismissSideAsk();
  assert.equal(U().modal ?? null, null);
  assert.deepEqual(sidesWithPanel(a), ['R']);
});

// AMENDED BY T74 F1: the question is a small modal in retail's own file, drawn
// by `Editors` at the room's level; the dock no longer renders it.
test('T73 F2 · the question is retail\'s own file, with YES and NO (a modal since T74 F1)', () => {
  const src = read('src/retail/design/detail/AddPanelAsk.jsx');
  assert.match(src, /title="ADD END PANEL\?"/);
  assert.match(src, /data-testid="add-panel-yes"/);
  assert.match(src, /data-testid="add-panel-no"/);
  assert.ok(!/route\.chips === 'add-panel'/.test(read('src/retail/design/Detail.jsx')),
    'the dock still renders the question');
});
