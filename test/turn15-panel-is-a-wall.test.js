// ─── Turn 15, F7: a ceiling-height end panel is a WALL for wall units ───────
//
// The owner's bug, off a real job: take a base or tall unit's end panel up to
// the ceiling, and the hanging units drive straight through it — and the run
// dimensions do not see it either.
//
// It is turn 12's F7 bug one layer down. THAT one was "a wall unit ignores a
// TALL unit", and the fix was to stop asking about mounting level and start
// asking about HEIGHTS. This is the same question asked of a piece that is not
// a cabinet: a base unit's band stops at 900 and it is quite right that a wall
// unit may hang above it — but the panel screwed to its side has been taken to
// 2400, and 2400 is squarely in the band the wall units hang in.
//
// The fix is the same SHAPE as turn 14's F7 for talls: the piece joins the
// obstacle set on its own, over its own span of wall and nowhere else. Not the
// cabinet it belongs to — an 18 mm panel blocks 18 mm, and blocking the whole
// 618 would stop a wall unit that has a clear 600 to hang in.
//
// The second half of this file is the owner's other ask: PIN THE 10 mm. Two
// numbers this app has built to since turn 7 and turn 8 have been a custom
// rather than a test, and a custom is a thing that quietly changes.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { unitVerticals, verticalsInBand } from '../src/engine/runs.js';
import { backStandoff } from '../src/engine/collision.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();
const WALL = 5000;
const CEILING = 2500;

function project() {
  store().loadProject({
    id: null,
    name: 't15-f7',
    room: migrateRoom({ height: CEILING, corners: rectCorners(WALL, 3000) }),
    design: {},
  }, []);
}

const unitOf = (id) => store().units.find((u) => u.id === id);

// ─── The pure functions ────────────────────────────────────────────────────

test('a unit\'s attached verticals are its end panels and its fillers', () => {
  const unit = {
    id: 'u1',
    type: 'BUD',
    position: { wall: 0, x_mm: 1000 },
    params: {
      ...defaultParamsFor('BUD', P),
      width: 600,
      end_panels: [{ id: 'ep1', side: 'R', thickness: 25, top_mm: 1500 }],
      side_infill_left_mm: 40,
      side_infill_left_top_mm: 0,
    },
  };
  const verticals = unitVerticals([unit], P);
  assert.deepEqual(verticals.map((v) => v.kind), ['end-panel', 'infill']);

  const panel = verticals[0];
  // Its OWN span of wall, and nothing more: the panel is on the right of a
  // 600 mm cabinet standing at 1000, so it occupies 1600 → 1625.
  assert.deepEqual([panel.from, panel.to], [1600, 1625]);
  assert.equal(panel.above, 1500, 'how far it has been taken past its own carcass');
  assert.ok(panel.top > 1500, 'and where it finishes, above the floor');
});

test('only a piece taken ABOVE its own cabinet is a new obstacle', () => {
  const band = { from: 1500, to: 2220 };            // where a wall unit hangs
  const carcassHigh = {
    from: 0, to: 18, bottom: 100, top: 820, above: 0,
  };
  const toCeiling = {
    from: 0, to: 18, bottom: 100, top: 2400, above: 1580,
  };
  // A panel that finishes with its cabinet is ALREADY in the obstacle set — the
  // cabinet carries it (`footprintPads`) — and counting it again would push a
  // neighbour away by two panels.
  assert.deepEqual(verticalsInBand([carcassHigh], band, P.editor.levelOverlapMm), []);
  assert.deepEqual(verticalsInBand([toCeiling], band, P.editor.levelOverlapMm), [toCeiling]);

  // Touching is not blocking: a wall unit hung exactly on top of a panel is a
  // run finished flush, which is the same concession two cabinets get.
  const justBelow = { ...toCeiling, top: 1500, above: 680 };
  assert.deepEqual(verticalsInBand([justBelow], band, P.editor.levelOverlapMm), []);
});

// ─── THE FIX, through the store ────────────────────────────────────────────

test('THE FIX: a wall unit stops at a ceiling-height end panel', () => {
  const landing = (raiseTo) => {
    project();
    const base = store().addUnit('BUD').id;
    store().moveUnit(base, 1000, 0);
    store().addEndPanel(base, { side: 'L' });
    const ep = unitOf(base).params.end_panels[0];
    if (raiseTo) store().setEndPanelTop(base, ep.id, raiseTo);
    const wall = store().addUnit('WUD').id;
    store().moveUnit(wall, 3000, 0);
    store().moveUnit(wall, -WALL, 0);          // drag it hard to the left
    return unitOf(wall).position.x_mm;
  };

  // Turn 14's answer, unchanged: a panel that finishes with its base unit is
  // nowhere near the wall units and they slide straight past it to the wall.
  assert.ok(landing(0) < 1000, 'a carcass-height panel blocks nothing above it');

  // …and taken to the ceiling it is a wall. The unit stops at the panel's face.
  assert.equal(landing(1500), 1000, 'it stops at the board, not through it');
});

test('it stops at the BOARD, not at the cabinet behind it', () => {
  project();
  const base = store().addUnit('BUD').id;
  store().moveUnit(base, 1000, 0);
  store().addEndPanel(base, { side: 'R' });
  const ep = unitOf(base).params.end_panels[0];
  store().setEndPanelTop(base, ep.id, 1500);
  const t = ep.thickness;

  const wall = store().addUnit('WUD').id;
  store().moveUnit(wall, 3000, 0);
  store().moveUnit(wall, -WALL, 0);
  // The panel is on the RIGHT of a 600 mm cabinet at 1000, so its outer face is
  // at 1625. A wall unit dragged left lands there — NOT at 1600 + 600, which is
  // where it would land if the whole cabinet were the obstacle.
  assert.equal(unitOf(wall).position.x_mm, 1000 + 600 + t);
});

test('…and the dimension chain has the same list to measure to', () => {
  // The two halves of the owner's bug are one engine answer: the same
  // `verticalsInBand` the clamp uses is what the arrows are handed
  // (3d/Scene.jsx), so the picture and the rule cannot disagree.
  project();
  const base = store().addUnit('BUD').id;
  store().moveUnit(base, 1000, 0);
  store().addEndPanel(base, { side: 'R' });
  store().setEndPanelTop(base, unitOf(base).params.end_panels[0].id, 1500);

  const band = {
    from: P.wallUnit.defaults.mountHeight,
    to: P.wallUnit.defaults.mountHeight + P.wallUnit.defaults.height,
  };
  const measured = verticalsInBand(unitVerticals(store().units, P), band, P.editor.levelOverlapMm);
  assert.equal(measured.length, 1, 'the panel is one thing to measure to');
  assert.equal(measured[0].kind, 'end-panel');
  assert.equal(measured[0].to - measured[0].from, unitOf(base).params.end_panels[0].thickness);
});

// ─── PIN THE 10 mm (owner's ask, turn 15 F7) ───────────────────────────────

test('THE 10 mm: every unit stands off the wall behind it', () => {
  // Turn 8's construction rule, which has been a custom rather than a test:
  // walls are never straight and a wall unit hangs on brackets that stand it
  // off anyway, so EVERY cabinet in this app is 10 mm off the plaster.
  assert.equal(P.room.wallBackClearance, 10);

  project();
  const id = store().addUnit('BUD').id;
  // Pushed as hard against the back wall as the app will allow…
  store().moveUnit(id, 0, 0);
  const unit = unitOf(id);
  // …and it is still 10 mm off it. The standoff is not a per-unit DECISION —
  // `inset_back_mm` is the decision, and it is the one a joiner takes when
  // there is a soil pipe behind that cabinet. This is how the workshop builds,
  // so it applies to every unit whether anybody asked or not.
  assert.equal(unit.params.inset_back_mm ?? 0, 0, 'nobody asked for an inset');
  assert.equal(backStandoff(unit, P), 10);
  assert.equal(backStandoff({ params: { inset_back_mm: 40 } }, P), 50,
    'a deliberate inset is measured from where the unit would otherwise stand');
});

test('THE 10 mm: an end panel is automatically that much deeper than its unit', () => {
  // The other half of the turn-7/turn-8 construction rule. A masking panel only
  // as deep as "carcass + door standoff" stops 10 mm short of the wall, and the
  // slot is at eye level down the whole side of the run — the one place a
  // masking panel exists to not have.
  const depth = 578;
  const result = computeCabinet({
    ...defaultParamsFor('BUD', P),
    depth,
    unit_num: '01',
    end_panels: [{ id: 'ep1', side: 'R' }],
  }, P);
  const panel = result.panels.find((p) => p.part === 'END-PANEL');
  const frontT = result.panels.find((p) => p.role === 'front').thickness;

  assert.equal(
    panel.w,
    P.room.wallBackClearance + depth + P.doors.gap + frontT,
    'wall gap + carcass + door standoff + door thickness',
  );
  assert.equal(panel.w - (depth + P.doors.gap + frontT), 10,
    'exactly 10 mm deeper than the unit it masks — automatically, never typed');
  // …and it therefore STARTS at the wall.
  assert.equal(panel.box.z, -P.room.wallBackClearance);
});
