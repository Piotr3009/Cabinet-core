// ─── TURN 73 · F2 · CLICK THE OUTSIDE OF A SIDE: "ADD END PANEL? YES / NO" ─
//
// The owner, 23.09.2026:
//
//   *"jak klikniesz na bok szafy z zewnątrz, żeby się pokazywało add panel
//   (Yes / No), to będzie bardzo intuicyjne."*

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

test('T73 F2 · a bare outer side asks; the answer is the add-panel menu', () => {
  const a = aClientRoom();
  // The first wardrobe stands at the wall start: its LEFT side is bare.
  assert.deepEqual(sidesWithPanel(a), ['R']);
  const found = A.resolveSelection({ unitId: a, elementRef: panelOf(a, 'BUL').id });
  assert.ok(found, 'the click resolved to nothing');
  assert.equal(found.menu, 'add-panel');
  assert.match(read('src/retail/design/detail/docked.jsx'),
    /if \(menu === 'add-panel'\) \{\n    return panel \? \{ chips: 'add-panel'/);
});

test('T73 F2 · a side that already carries a panel does not ask (it stays the way out)', () => {
  const a = aClientRoom();
  assert.equal(A.sideAskFor(a, panelOf(a, 'BUR')), null);
  assert.equal(A.resolveSelection({ unitId: a, elementRef: panelOf(a, 'BUR').id }), null);
});

test('T73 F2 · a side hidden by a flush neighbour does not ask', () => {
  const a = aClientRoom();
  const r = A.addBesidePlus({ unitId: a, side: 'right' });
  assert.equal(r.ok, true, r.said);
  assert.equal(A.sideAskFor(a, panelOf(a, 'BUR')), null, 'the covered side asked');
  assert.equal(A.sideAskFor(r.id, panelOf(r.id, 'BUL')), null, 'the covered side asked');
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
  U().selectElement(a, panelOf(a, 'BUL').id);
  A.dismissSideAsk();
  assert.equal(U().selectedElement ?? null, null);
  assert.deepEqual(sidesWithPanel(a), ['R']);
});

test('T73 F2 · the dock renders the question in retail\'s own file, with YES and NO', () => {
  const src = read('src/retail/design/detail/AddPanelAsk.jsx');
  assert.match(src, /label="ADD END PANEL\?"/);
  assert.match(src, /data-testid="add-panel-yes"/);
  assert.match(src, /data-testid="add-panel-no"/);
  assert.match(read('src/retail/design/Detail.jsx'), /route\.chips === 'add-panel'/);
});
