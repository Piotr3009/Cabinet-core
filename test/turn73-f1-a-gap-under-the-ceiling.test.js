// ─── TURN 73 · F1 · END PANEL: A GAP UNDER THE CEILING, IN MM ──────────────
//
// The owner, 23.09.2026, testing T72 point 1:
//
//   *"nie ma możliwości ustawienia na przykład 15 mm, a nie do sufitu; dodaj
//   przy to ceiling następne pole z wpisaniem milimetrów."*
//
// The field presses the same store road the CEILING chip presses
// (`endPanelToCeiling`), told how far short of the ceiling to stop.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import * as A from '../src/retail/design/adapter.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();

function aRoomWithAPanel() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const { id } = S().addUnit('WARDROBE', { params: { width: 1800, height: 2200, depth: 600 } });
  assert.equal(A.addEndPanelByHand(id, 'R').ok, true);
  return id;
}
const epPanel = (unitId) => (S().unitResult(unitId)?.panels || []).find((p) => p.part === 'END-PANEL') || null;

test('T73 F1 · CEILING alone still runs the panel to the ceiling: gap 0', () => {
  const u = aRoomWithAPanel();
  A.setEndPanelTopChip(u, epPanel(u), 'ceiling');
  const menu = A.endPanelMenu(u, epPanel(u));
  assert.equal(menu.top, 'ceiling');
  assert.equal(menu.gap, 0);
  assert.ok(menu.headroom > 0);
  assert.equal(Number(epPanel(u).meta.top_mm), menu.headroom);
});

test('T73 F1 · 15 typed: the panel stops 15 mm under the ceiling', () => {
  const u = aRoomWithAPanel();
  A.setEndPanelTopChip(u, epPanel(u), 'ceiling');
  const headroom = A.endPanelMenu(u, epPanel(u)).headroom;
  const res = A.setEndPanelCeilingGap(u, epPanel(u), 15);
  assert.equal(res.ok, true);
  assert.equal(Number(epPanel(u).meta.top_mm), headroom - 15);
  const menu = A.endPanelMenu(u, epPanel(u));
  assert.equal(menu.gap, 15);
  assert.equal(menu.top, 'ceiling', 'a panel 15 mm short is still a panel to the ceiling');
});

test('T73 F1 · CARCASS after a gap brings the panel back flush, and CEILING again is gap 0', () => {
  const u = aRoomWithAPanel();
  A.setEndPanelTopChip(u, epPanel(u), 'ceiling');
  A.setEndPanelCeilingGap(u, epPanel(u), 15);
  A.setEndPanelTopChip(u, epPanel(u), 'carcass');
  assert.equal(Number(epPanel(u).meta.top_mm) || 0, 0);
  A.setEndPanelTopChip(u, epPanel(u), 'ceiling');
  assert.equal(A.endPanelMenu(u, epPanel(u)).gap, 0);
});

test('T73 F1 · the field is shown only while CEILING is chosen, and nowhere else is a number typed', () => {
  const src = read('src/retail/design/detail/EndPanel.jsx');
  assert.match(src, /menu\.top === 'ceiling' \? \(/);
  assert.equal([...src.matchAll(/<NumberField/g)].length, 1);
  assert.match(src, /label="GAP UNDER CEILING"/);
});
