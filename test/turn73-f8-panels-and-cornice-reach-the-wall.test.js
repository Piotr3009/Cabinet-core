// ─── TURN 73 · F8 · FROM THE WALL: THE END PANELS AND THE CORNICE REACH IT ─
//
// The owner, 23.09.2026, testing T72 point 14 (FROM THE WALL, per wardrobe):
//
//   *"działa, ale panele i cornice się nie przedłużają, a to źle."*
//
// A wardrobe stood off its wall by its own `wall_gap` keeps its end panels and
// its cornice returns running back to the wall. Gap unset: the project's
// number, so every saved job and every golden cuts the same board as before.

import test from 'node:test';
import assert from 'node:assert/strict';

import { rectCorners } from '../src/engine/room.js';
import { getCabinetProfile } from '../src/engine/profile.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import * as A from '../src/retail/design/adapter.js';

const S = () => useProjectStore.getState();

function aWardrobeWithPanelAndCornice() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const { id } = S().addUnit('WARDROBE', { params: { width: 1200, height: 2200, depth: 600 } });
  assert.equal(A.addEndPanelByHand(id, 'R').ok, true);
  A.applyAutoCornice(id);
  return id;
}

const result = (id) => S().unitResult(id);
const endPanel = (id) => result(id).panels.find((p) => p.part === 'END-PANEL');
const setGap = (id, gap) => S().updateUnitParams(id, { wall_gap: gap });

test('T73 F8 · gap unset: the panel is exactly as deep as before (the project number, 10)', () => {
  const id = aWardrobeWithPanelAndCornice();
  const P = getCabinetProfile();
  const ep = endPanel(id);
  const unit = S().units.find((u) => u.id === id);
  const frontT = Number(unit.params.front_t) || P.front.thickness;
  assert.equal(ep.w, P.room.wallBackClearance + 600 + P.doors.gap + frontT);
});

test('T73 F8 · gap 100: the end panel is 90 deeper than at gap 10, and its back edge is on the wall', () => {
  const id = aWardrobeWithPanelAndCornice();
  setGap(id, 10);
  const at10 = endPanel(id);
  setGap(id, 100);
  const at100 = endPanel(id);
  assert.equal(Number(S().units.find((u) => u.id === id).params.wall_gap), 100, 'the room refused the gap');
  assert.equal(at100.w - at10.w, 90);
  // In the unit's own frame the carcass back is z 0 and the wall is z -gap.
  assert.equal(at100.box.z, -100);
  assert.equal(at100.box.d, at100.w);
});

test('T73 F8 · gap 100: the cornice return runs back to the wall behind THIS unit', () => {
  const id = aWardrobeWithPanelAndCornice();
  const cornice = () => result(id).assemblies.cornice;
  assert.ok(cornice(), 'the wardrobe has no cornice');
  setGap(id, 100);
  assert.equal(cornice().backZ, -100);
  setGap(id, 10);
  assert.equal(cornice().backZ, -10);
});

test('T73 F8 · the cut list carries the longer panel', () => {
  const id = aWardrobeWithPanelAndCornice();
  setGap(id, 100);
  const ep = endPanel(id);
  const cut = result(id).panels.filter((p) => p.part === 'END-PANEL');
  assert.equal(cut.length, 1);
  assert.equal(cut[0].w, ep.w);
});
