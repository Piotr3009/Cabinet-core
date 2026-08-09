// ─── Hinges visible by DEFAULT in Solid (turn 13, CLAUDE.md F7) ─────────────
//
// Owner: "still X-ray-only in practice."
//
// ─── THE DIAGNOSIS ───
//
// The rendering is NOT branch-bound to X-ray, and that was worth checking
// before changing anything: `Hardware` takes `hinges` and `xray` as two
// separate props and has since turn 11, `CarcassHinges` draws the same
// procedural arm and plate under either, and the door half (`DoorHinges`) hangs
// off the swinging group whenever `showHinges || xray`. There is no branch to
// remove.
//
// Two OTHER things were making the owner's sentence true, and both are fixed:
//
//   1. THE FLAG IS REMEMBERED. `showHinges` is persisted, exactly like X-ray,
//      so a browser that switched it off once during turn-11 testing kept it
//      off through every reload since — and no change to the default could ever
//      reach it. The storage key is versioned, which gives the new default one
//      chance to be seen.
//
//   2. WITH THE DOORS SHUT THERE IS NOTHING TO SEE, and that is not a bug: a
//      cup hinge is bored INTO the door and its arm and plate are inside the
//      carcass behind it. That is what turn 12's BOSS was for, and it reads the
//      moment a door swings. Drawing a shut cabinet's ironmongery would mean
//      drawing through solid board — which is what X-ray is.
//
// This file pins the parts that are arithmetic. The picture is verify/t13.

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCabinet } from '../src/engine/cabinet.js';
import { hardwareInstances } from '../src/engine/hardware3d.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

const withDoors = (id = 'BUD') => computeCabinet(
  { ...defaultParamsFor(id, P), doors: { count: 1, hinge: 'L' } },
  P,
);

test('THE DEFAULT is a profile number, and it is ON (rule 2)', () => {
  assert.equal(P.appearance.hardware.showInSolid, true,
    'the toggle exists to HIDE now — the owner’s verdict');
});

test('the Solid tone is its own, so a hinge is an object and not a diagram', () => {
  const HW = P.appearance.hardware;
  assert.ok(HW.hinge, 'Solid has a hinge colour of its own');
  assert.notEqual(HW.hinge, HW.bracket, 'X-ray’s bright bracket grey is a smudge on a white door');
});

test('the hinges exist to be drawn at all — the count is the drilling’s', () => {
  const result = withDoors();
  const hw = hardwareInstances(result, P);
  assert.ok(hw.hinges.length >= 2, `a 770 mm door takes at least two hinges, saw ${hw.hinges.length}`);
  // Every one belongs to a real front, which is what makes them swing with it.
  const doors = new Set(result.panels.filter((p) => p.part === 'FRONT').map((p) => p.id));
  for (const h of hw.hinges) assert.ok(doors.has(h.panelId), `${h.panelId} is not a door of this unit`);
});

test('THE MECHANISM: with the door SHUT every part of a hinge is inside board', () => {
  // This is the diagnosis, as a number. It is why "make it default ON" alone
  // could not have been the whole answer, and why the proof capture has to be
  // of an OPEN door.
  const result = withDoors();
  const H = P.hardware.hinge;
  const hinge = hardwareInstances(result, P).hinges[0];
  const door = result.panels.find((p) => p.id === hinge.panelId);
  const carcassFront = Math.max(...result.panels
    .filter((p) => p.part === 'BUL' || p.part === 'BUR')
    .map((p) => p.box.z + p.box.d));

  // The cup is bored from the door's BACK face into the door.
  assert.equal(hinge.z, door.box.z, 'the cup starts at the back face of the door');
  assert.ok(hinge.z + H.cupDepth <= door.box.z + door.box.d, 'and ends inside its thickness');
  // The boss and the arm run the other way, into the carcass opening — behind
  // the shut door, and in front of nothing.
  assert.ok(hinge.z - H.bossHeight < carcassFront, 'the boss stands in the carcass opening');
  assert.ok(hinge.z - H.armLength < carcassFront, 'so does the arm');
});

test('…and OPENING the door is what shows it: the two halves separate', () => {
  // The cup and boss are on the door and swing with it; the arm and plate are
  // screwed to the side and stay. That separation is the whole picture, and it
  // is a property of WHICH panel each piece is attached to.
  const result = withDoors();
  const hw = hardwareInstances(result, P);
  for (const h of hw.hinges) {
    assert.ok(h.panelId, 'the door half must know its door, or it is left behind mid-air');
    assert.ok(h.side === 'L' || h.side === 'R');
  }
});

test('a cabinet with no doors has no hinges to hide — nothing to look for', () => {
  // A drawer stack, which is the kit that genuinely has no front on a hinge.
  // (A bare base unit is NOT one: its kit cuts a door whether or not anything
  // has been written into `params.doors`.)
  const drawers = computeCabinet(defaultParamsFor('BUDR', P), P);
  assert.equal(drawers.panels.some((p) => p.part === 'FRONT'), false);
  assert.equal(hardwareInstances(drawers, P).hinges.length, 0);
});

test('the RUNNERS stay behind X-ray, which is the line that did not move', () => {
  // F7 is about hinges. A drawer's runners live inside a closed box where
  // nothing but an X-ray can see them, and eight per stack in Solid is the wall
  // of ironmongery the component was written to avoid.
  const drawers = computeCabinet(defaultParamsFor('BUDR', P), P);
  assert.ok(hardwareInstances(drawers, P).runners.length > 0,
    'they exist and are on order — they are simply not drawn in Solid');
});
