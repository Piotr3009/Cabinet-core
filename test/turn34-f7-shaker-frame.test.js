// ─── Turn 34, CLAUDE.md F7: the default becomes 60, old projects keep 70 ───
//
// The owner, 16.08.2026: *"zmienimy default z 70 na 60, ale nie teraz"* —
// "nie teraz" was the chat; the turn is now.
//
// Two halves, and the second is the one that protects a workshop: a NEW
// project's shakers are framed 60, and a job already quoted, cut and possibly
// hung at 70 opens at 70 — pinned explicitly, so nothing about it drifts the
// next time a default moves. The F7-handles precedent, in as many words.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { migrateDesign } from '../src/engine/design.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import {
  hasShakerAnywhere, legacyShakerFrame, shakerFrameMm, shakerSpec,
} from '../src/engine/shaker.js';

const store = () => useProjectStore.getState();

// ─── the default ───────────────────────────────────────────────────────────

test('a NEW project frames its shakers at 60', () => {
  assert.equal(P.front.types.S.frameWidth, 60);
  assert.equal(shakerSpec(P).frameWidth, 60);
  assert.equal(shakerFrameMm(null, P), 60, 'nobody has said: the new default answers');
  // …and it reaches the CUT.
  const r = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01' }, P);
  assert.equal(r.panels.find((p) => p.role === 'front').meta.shaker.frame, 60);
});

test('the RANGE is unchanged — 10 to 200, as it has been since turn 25', () => {
  assert.equal(P.front.types.S.frameMin, 10);
  assert.equal(P.front.types.S.frameMax, 200);
});

test('and an explicit value still wins, at any width in range', () => {
  assert.equal(shakerFrameMm({ fronts: { shakerFrame: 90 } }, P), 90);
  assert.equal(shakerFrameMm({ fronts: { shakerFrame: 70 } }, P), 70);
  assert.equal(shakerFrameMm({ fronts: { shakerFrame: 10 } }, P), 10);
});

// ─── the pin: old projects do not move ─────────────────────────────────────

test('the pin is 70 — what a job cut before 16.08.2026 was built to', () => {
  assert.equal(P.front.types.S.legacyFrameWidth, 70);
  assert.equal(shakerSpec(P).legacyFrameWidth, 70);
});

test('a stored project WITH shaker and no stated width is pinned to 70', () => {
  const design = migrateDesign({ fronts: { style: 'S' } });
  assert.equal(design.fronts.shakerFrame, null, 'it never said');
  const pin = legacyShakerFrame(design, P);
  assert.ok(pin, 'it is owed the pin');
  assert.equal(pin.fronts.shakerFrame, 70);
});

test('…and one that STATES a width is never overwritten, at any value', () => {
  for (const said of [60, 70, 90, 200]) {
    const design = migrateDesign({ fronts: { style: 'S', shakerFrame: said } });
    assert.equal(legacyShakerFrame(design, P), null, `${said} is the project's own answer`);
  }
});

test('…and one with NO shaker anywhere is left entirely alone', () => {
  const flat = migrateDesign({ fronts: { style: 'F' } });
  assert.equal(hasShakerAnywhere(flat), false);
  assert.equal(legacyShakerFrame(flat, P), null,
    'writing a field onto a job with no use for it is how a diff becomes unreadable');
});

test('shaker ANYWHERE counts — the project style, a slot, or one door', () => {
  assert.equal(hasShakerAnywhere(migrateDesign({ fronts: { style: 'S' } })), true);
  assert.equal(hasShakerAnywhere(migrateDesign({
    fronts: { style: 'F', types: [{ id: 'f1', label: 'Front 1', style: 'F' }, { id: 'f2', label: 'Front 2', style: 'S' }] },
  })), true, 'one slot is enough');
  assert.equal(hasShakerAnywhere(migrateDesign({
    fronts: { style: 'F' },
    doorStyles: [{ id: 'ds1', name: 'Pantry doors', frontType: 'S' }],
  })), true, 'one saved door style is enough');
  assert.equal(hasShakerAnywhere(migrateDesign({
    fronts: { style: 'F' },
    doorStyles: [{ id: 'ds1', name: 'Flat doors', frontType: 'F' }],
  })), false, 'and a flat one is not');
  assert.equal(hasShakerAnywhere(null), false);
});

// ─── through loadProject, which is where it actually bites ─────────────────

function openSaved(design, units = [{ id: 'u1' }]) {
  store().loadProject({
    id: 'saved-job-1',
    name: 't34-f7',
    room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
    design,
  }, units.map((u) => ({
    id: u.id,
    type: 'BUD',
    position: { wall: 0, x_mm: 0, rotation_deg: 0 },
    params: { ...defaultParamsFor('BUD', P), unit_num: '01', doors: { count: 1 } },
  })));
}

test('opening a SAVED shaker job writes 70 onto it — the doors do not move', () => {
  openSaved({ fronts: { style: 'S' } });
  const design = migrateDesign(store().project.design);
  assert.equal(design.fronts.shakerFrame, 70, 'pinned on the way in');
  assert.equal(shakerFrameMm(design, P), 70);
  // …and the front the scene draws is the one the job was cut to.
  const unit = store().units[0];
  assert.equal(store().unitResult(unit.id).panels.find((p) => p.role === 'front').meta.shaker.frame, 70);
});

test('opening a saved job that STATED its width leaves the number it stated', () => {
  openSaved({ fronts: { style: 'S', shakerFrame: 90 } });
  assert.equal(migrateDesign(store().project.design).fronts.shakerFrame, 90);
});

test('opening a saved job with no shaker writes nothing', () => {
  openSaved({ fronts: { style: 'F' } });
  assert.equal(migrateDesign(store().project.design).fronts.shakerFrame, null);
});

test('a BLANK scene is not a saved job — a new project gets the new 60', () => {
  // No id and no cabinets: nothing has been cut, so there is nothing a changed
  // default could redraw, and pinning 70 would be the opposite of the ask.
  store().loadProject({
    id: null,
    name: 'blank',
    room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
    design: {},
  }, []);
  const design = migrateDesign(store().project.design);
  assert.equal(design.fronts.shakerFrame, null);
  assert.equal(shakerFrameMm(design, P), 60, 'the new default answers a new job');
});

// ─── the consequence the classifier names ──────────────────────────────────

test('a 190 mm front was refused at 70 and is cut at 60 — the owner\'s own gain', () => {
  // 2 × 70 + 60 = 200; 2 × 60 + 60 = 180. A drawer front between the two was
  // cut plain and now takes its recess. This is the structural half of F7's
  // named delta (scripts/t34-classify.mjs SHAKER_FRAME_60).
  const at70 = computeCabinet({
    ...defaultParamsFor('BUDR4', P), unit_num: '01', shaker_frame_mm: 70,
  }, P);
  const at60 = computeCabinet({
    ...defaultParamsFor('BUDR4', P), unit_num: '01',
  }, P);
  const pocketed = (r) => r.panels
    .filter((p) => p.role === 'front' && (p.cnc?.pockets || [])
      .some((k) => k.layer === 'SHAKER_PANEL_POCKET')).length;
  assert.ok(pocketed(at60) > pocketed(at70), 'a narrow front gains the recess at 60');
  assert.ok(at70.warnings.some((w) => w.code === 'SHAKER_FRAME_TOO_WIDE'));
  assert.ok(!at60.warnings.some((w) => w.code === 'SHAKER_FRAME_TOO_WIDE'),
    'and the refusal it used to earn is gone');
});
