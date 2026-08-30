import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import { runChecks } from '../src/engine/checks.js';

// ─── T55 · F3 — THE SLOPE FLIPS A DOOR → THE DOOR PARTITION IS FORCED ───────
//
// The owner, verbatim: *"wymuszamy tylko jak się orientacja drzwi zmienia na
// skosach … nie wymuszamy przez wielkość szafy absolutnie nie"* and
// *"usunięcie wszystkiego co mogłoby nam rozwalić układ czyli drążki
// szuflady etc … klient ustawi wszystko sobie od nowa."*
//
// Under a rake both leaves are forced to one hand (T46 law); the flipped
// leaf's hinge edge then lands mid-cabinet where no carcass side exists. The
// store inserts the DOOR-MOUNT PARTITION on that hinge line — the T21/F9
// machinery, reused — clears the interior (the owner's licence), and the
// existing partition drilling law takes the plates.

const S = () => useProjectStore.getState();
const G = P.board.thickness;

function freshRoom() {
  S().loadProject({
    id: null,
    name: 'T55 F3',
    number: '55',
    client: 'the owner',
    room: migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) }),
    design: {},
  }, []);
  useUiStore.getState().clearMessages?.();
}

/** A 1000-wide two-door wardrobe with an interior, then a rake across it. */
function flipScene() {
  freshRoom();
  const unit = S().addUnit('WARDROBE');
  S().updateUnitParams(unit.id, { width: 1000, height: 2200 });
  S().addDoors(unit.id);
  S().addShelves(unit.id, 2);
  S().addHangerRail(unit.id, {});
  S().moveUnit(unit.id, 0, 0, { magnet: false });
  // The rake over the LEFT end: the ceiling falls across the left leaf.
  S().addWallSlope({
    wall: 0, side: 'L', startHeight: 1300, run: 900,
  });
  S().settleLayout();
  S().refreshAutoParts();
  return unit.id;
}

const itemsOf = (id) => (S().units.find((u) => u.id === id)?.params.sections?.[0]?.items || []);

test('F3 — the flip inserts the door partition, clears the interior, keeps the doors', () => {
  const id = flipScene();
  const items = itemsOf(id);
  assert.equal(items.filter((i) => i.kind === 'partition').length, 1,
    'ONE door-mount partition was inserted');
  assert.equal(items.filter((i) => i.kind !== 'partition').length, 0,
    'rods, shelves, drawers — the interior was cleared (the owner\'s licence)');
  const unit = S().units.find((u) => u.id === id);
  assert.ok(Array.isArray(unit.params.bay_doors), 'the doors moved onto the bays — they stay');
  const result = S().unitResult(id);
  const leaves = result.panels.filter((p) => p.part === 'FRONT' && p.role === 'front');
  assert.equal(leaves.length, 2, 'two leaves still stand');
});

test('F3 — the flipped leaf hinges ON the partition, forced hand kept', () => {
  const id = flipScene();
  const result = S().unitResult(id);
  const vpart = result.panels.find((p) => p.part === 'VPART');
  assert.ok(vpart, 'the partition is cut');
  const leaves = result.panels.filter((p) => p.part === 'FRONT' && p.role === 'front');
  const onPart = leaves.find((p) => p.meta.hingeOn === vpart.id);
  assert.ok(onPart, 'one leaf hangs on the partition');
  assert.equal(onPart.meta.hingeForced, true, 'and it is the FORCED one');
  // The cup column — the leaf's hinge edge — lands ON the partition line.
  const edge = onPart.meta.hinge === 'R' ? onPart.box.x + onPart.box.w : onPart.box.x;
  const x0 = Number(vpart.meta.x_mm);
  assert.ok(edge >= x0 - P.doors.gap && edge <= x0 + G + P.doors.gap,
    `cup column at ${edge} lands on the partition line [${x0}, ${x0 + G}]`);
  // …and the plates drill INTO the partition — the existing T21 F12.2 law.
  const plates = (result.drills || []).filter((d) => d.panel === vpart.id && d.kind === 'hinge');
  assert.ok(plates.length >= 4, `the partition carries the plate pattern (${plates.length} holes)`);
  // The other leaf keeps its carcass side.
  const other = leaves.find((p) => p !== onPart);
  assert.ok(other.meta.hingeOn === 'BUL' || other.meta.hingeOn === 'BUR',
    'the un-flipped leaf stays on the carcass');
});

test('F3 — once per transition: a second sweep changes nothing', () => {
  const id = flipScene();
  const before = JSON.stringify(S().units.find((u) => u.id === id).params);
  S().refreshAutoParts();
  S().refreshAutoParts();
  const after = JSON.stringify(S().units.find((u) => u.id === id).params);
  assert.equal(after, before, 'the settled state passes through the sweep untouched');
  assert.equal(itemsOf(id).filter((i) => i.kind === 'partition').length, 1, 'still ONE partition');
});

test('F3 — the notify says what happened', () => {
  flipScene();
  const said = useUiStore.getState().messages
    .some((m) => /Slope flipped the doors — a door partition was added and the interior was cleared\./
      .test(m.baseMessage || m.message));
  assert.ok(said, 'the moment it happens, the user is told');
});

test('F3 — Check #24 names the partition while the forcing stands', () => {
  const id = flipScene();
  const unit = S().units.find((u) => u.id === id);
  const found = runChecks({
    entries: [{ unit, result: S().unitResult(id) }],
    profile: P,
  });
  const line = found.find((f) => f.check === 24);
  assert.ok(line, 'the Check line exists');
  assert.match(line.message, /VPART/, 'and it NAMES the partition');
});

test('F3 — cabinet width is NEVER a trigger: a wide flat wardrobe is untouched', () => {
  freshRoom();
  const unit = S().addUnit('WARDROBE');
  S().updateUnitParams(unit.id, { width: 1200, height: 2200 });
  S().addDoors(unit.id);
  S().addShelves(unit.id, 2);
  S().settleLayout();
  S().refreshAutoParts();
  const items = itemsOf(unit.id);
  assert.equal(items.filter((i) => i.kind === 'partition').length, 0, 'no partition forced');
  assert.ok(items.filter((i) => i.kind === 'shelf').length >= 2, 'the interior stands');
  assert.equal(S().units.find((u) => u.id === unit.id).params.bay_doors, undefined,
    'and the face doors are exactly what they were');
});
