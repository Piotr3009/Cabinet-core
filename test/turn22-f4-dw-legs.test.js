// ─── TURN 22 F4 — the D/W stands as tall as its missing legs ────────────────
//
// The owner, from the eye test: the dishwasher panel rightly has no legs — the
// machine lives behind the front — but its HEIGHT must behave exactly as if
// the run's legs were under it. Enter 50, get 50. And the 100 mm leg minimum
// is a bug: a default, never a floor.
//
// Three facts are proved here, in the order CLAUDE.md states them:
//
//   F4.1/2  the implied leg height comes from the RUN's own number — the
//           project's leg-height parameter its legged neighbours resolve —
//           with the profile only as the last fallback. One derivation, no
//           D/W-special constant anywhere.
//   F4.3    50 survives the field. The floor is 0 and the engine's own sanity
//           is the only guard; `profile.projectHeights.toeKick` stays the seed.
//   F4.5    the equivalence probe: at leg 50 the D/W shows ONLY the
//           height-derived differences its legged twin shows.

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCabinet } from '../src/engine/cabinet.js';
import { impliedLegHeight, standsOnLegHeight, unitBase, buildRuns } from '../src/engine/runs.js';
import { getUnitType, defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();
const unitOf = (id) => store().units.find((u) => u.id === id);

function project() {
  store().loadProject({
    id: null,
    name: 't22-f4',
    room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
    design: {},
  }, []);
}

const dw = (params = {}) => computeCabinet(
  { ...defaultParamsFor('DW_PANEL', P), unit_num: '01', plinth: true, ...params }, P,
);
const bud = (params = {}) => computeCabinet(
  { ...defaultParamsFor('BUD', P), unit_num: '02', plinth: true, ...params }, P,
);

// ─── F4.1 / F4.2 — the derivation ───────────────────────────────────────────

test('F4.1 a plinth-bearing LEG-LESS type stands on the run’s leg height', () => {
  const type = getUnitType('DW_PANEL');
  assert.equal(type.legs, false, 'no legs — the machine is where they would be');
  assert.equal(type.plinth, true, '…and the toe kick still runs past it');
  assert.equal(standsOnLegHeight(type), true);
  // A wall unit hangs; it stands on nothing.
  assert.equal(standsOnLegHeight(getUnitType('WUD')), false);
  // A legged kit stands on its own legs, as it always did.
  assert.equal(standsOnLegHeight(getUnitType('BUD')), true);
});

test('F4.1 the run’s value wins, the project’s is the run’s, the PROFILE is last', () => {
  const type = getUnitType('DW_PANEL');
  // What the run/project actually set.
  assert.equal(impliedLegHeight({ leg_height: 50 }, type, P), 50);
  assert.equal(impliedLegHeight({ leg_height: 140 }, type, P), 140);
  // Zero is a real answer — a run with no legs at all — and is honoured
  // rather than treated as "nobody said" (F4.3: never a floor).
  assert.equal(impliedLegHeight({ leg_height: 0 }, type, P), 0);
  // Only silence reaches the profile.
  assert.equal(impliedLegHeight({}, type, P), P.baseUnit.legHeight);
  assert.equal(impliedLegHeight({ leg_height: null }, type, P), P.baseUnit.legHeight);
  // …and a wardrobe's silence reaches the WARDROBE's number, not the base's.
  assert.equal(impliedLegHeight({}, getUnitType('WARDROBE'), P), P.wardrobe.legHeight);
});

test('F4.2 enter 50 and the D/W’s plinth line, front bottom and total height all sit on 50', () => {
  const at = (leg) => {
    const r = dw({ leg_height: leg });
    const plinth = r.panels.find((p) => p.part === 'PLINTH');
    const front = r.panels.find((p) => p.part === 'FRONT');
    return {
      stands: r.assemblies.carcass.legHeight,
      plinthH: plinth ? plinth.h : 0,
      plinthTop: plinth ? r.assemblies.carcass.legHeight + plinth.box.y + plinth.h : null,
      frontBottom: r.assemblies.carcass.legHeight + front.box.y,
      total: r.assemblies.carcass.legHeight + r.params.height,
    };
  };
  const fifty = at(50);
  assert.equal(fifty.stands, 50, 'it stands on 50, not on the profile’s 100');
  assert.equal(fifty.plinthH, 50, 'and the toe kick is 50 tall');
  assert.equal(fifty.plinthTop, 50, 'whose top is the floor of the carcass');
  assert.equal(fifty.total, 50 + defaultParamsFor('DW_PANEL', P).height);
  // …and the front's bottom moves with it, by exactly the difference.
  const hundred = at(100);
  assert.equal(hundred.frontBottom - fifty.frontBottom, 50);
  // The old behaviour — the profile constant, whatever the project said — is
  // gone: 50 was silently drawn at 100.
  assert.notEqual(fifty.stands, P.baseUnit.legHeight);
});

test('F4.2 the D/W shares its neighbours’ plinth line at ANY leg height', () => {
  for (const leg of [0, 50, 100, 140]) {
    const panel = dw({ leg_height: leg });
    const neighbour = bud({ leg_height: leg });
    assert.equal(
      panel.assemblies.carcass.legHeight,
      neighbour.assemblies.carcass.legHeight,
      `at ${leg} mm the two stand at the same height`,
    );
    const a = panel.panels.find((p) => p.part === 'PLINTH');
    const b = neighbour.panels.find((p) => p.part === 'PLINTH');
    if (leg === 0) { assert.equal(a, undefined); assert.equal(b, undefined); continue; }
    assert.equal(a.h, b.h, 'one toe kick height across the run');
    assert.equal(a.box.y, b.box.y, '…on one line');
  }
});

test('F4.2 …and it is therefore IN the run: unitBase agrees with its neighbours', () => {
  const at = (leg) => {
    const mk = (id, type, x) => ({
      id, type, position: { wall: 0, x_mm: x, rotation_deg: 0 },
      params: { width: 600, height: 770, depth: 558, leg_height: leg },
    });
    const units = [mk('a', 'BUD', 0), mk('b', 'DW_PANEL', 600), mk('c', 'BUD', 1200)];
    return { units, bases: units.map((u) => unitBase(u, P)), runs: buildRuns(units, P) };
  };
  for (const leg of [50, 100]) {
    const { bases, runs } = at(leg);
    assert.deepEqual(bases, [leg, leg, leg], 'the three stand at one height');
    assert.equal(runs.length, 1, 'and are therefore ONE run — the toe kick can be one length');
    assert.equal(runs[0].units.length, 3);
  }
});

// ─── F4.3 — the minimum was a bug ───────────────────────────────────────────

test('F4.3 100 is the SEED and 0 is the floor — the field accepts 50', () => {
  assert.equal(P.projectHeights.toeKick, 100, 'the seed a new project starts on');
  assert.equal(P.projectHeights.toeKickMin, 0, 'and the floor is zero, not a hundred');
  assert.equal(P.baseUnit.legHeight, 100, 'the profile’s own leg is untouched');
  project();
  const { applied } = store().setProjectHeights({ toeKick: 50 });
  assert.equal(applied.toeKick, 50, 'fifty commits as fifty');
  // …and it round-trips: what was stored is what comes back.
  assert.equal(store().project.design.heights.toeKick, 50);
  // Every other height keeps the carcass minimum it always had — a 40 mm tall
  // unit is a typing mistake and is still refused.
  const tall = store().setProjectHeights({ tall: 40 });
  assert.equal(tall.applied.tall, P.projectHeights.min);
});

test('F4.3 the unclamped field carries the whole run with it, D/W included', () => {
  project();
  const a = store().addUnit('BUD');
  const b = store().addUnit('DW_PANEL', { near: a.id, side: 'right' });
  store().addPlinth(a.id);
  store().addPlinth(b.id);
  store().setProjectHeights({ toeKick: 50 });

  assert.equal(unitOf(a.id).params.leg_height, 50);
  assert.equal(unitOf(b.id).params.leg_height, 50, 'the D/W is given the run’s number too');
  const ra = store().unitResult(a.id);
  const rb = store().unitResult(b.id);
  assert.equal(ra.assemblies.carcass.legHeight, 50);
  assert.equal(rb.assemblies.carcass.legHeight, 50);
  // One plinth across the two, at 50 — which is only possible because they are
  // now in the same run.
  const plinths = store().allResults()
    .flatMap((e) => e.result.panels).filter((p) => p.part === 'PLINTH');
  assert.equal(plinths.length, 1, 'one length of toe kick for the run');
  assert.equal(plinths[0].h, 50);
});

test('F4.3 zero legs is a legal answer and the geometry survives it', () => {
  project();
  const { applied } = store().setProjectHeights({ toeKick: 0 });
  assert.equal(applied.toeKick, 0);
  const r = dw({ leg_height: 0 });
  assert.equal(r.assemblies.carcass.legHeight, 0);
  assert.equal(r.panels.find((p) => p.part === 'PLINTH'), undefined,
    'no leg height, no toe kick — the engine’s own sanity, and the only guard');
  assert.ok(r.panels.find((p) => p.part === 'FRONT').box.y >= 0, 'the front is not through the floor');
});

// ─── F4.5 — the equivalence probe ───────────────────────────────────────────

test('F4.5 at leg 50 the D/W differs from leg 100 EXACTLY as its legged twin does', () => {
  // The probe CLAUDE.md asks for, as an assertion rather than as a file: the
  // set of things that move between 100 and 50 must be the same set for the
  // D/W panel and for the BUD standing beside it — the height-derived ones,
  // and nothing else.
  const moved = (build) => {
    const hi = build({ leg_height: 100 });
    const lo = build({ leg_height: 50 });
    const key = (r) => r.panels.map((p) => `${p.id}|${p.w}x${p.h}x${p.thickness}`).sort();
    return {
      // What is CUT must be identical: a leg height moves pieces, it does not
      // re-cut them. (The plinth is the one piece whose HEIGHT is the leg
      // height, and it moves for both kits alike.)
      cutsChanged: key(hi).filter((k, i) => k !== key(lo)[i]),
      stands: [hi.assemblies.carcass.legHeight, lo.assemblies.carcass.legHeight],
      plinthH: [
        hi.panels.find((p) => p.part === 'PLINTH')?.h,
        lo.panels.find((p) => p.part === 'PLINTH')?.h,
      ],
    };
  };
  const panel = moved(dw);
  const twin = moved(bud);
  assert.deepEqual(panel.stands, twin.stands, 'both stand 100 then 50');
  assert.deepEqual(panel.plinthH, twin.plinthH, 'both toe kicks are 100 then 50');
  // The pieces that changed size are the same KIND for both: the plinth alone.
  const kinds = (r) => [...new Set(r.cutsChanged.map((k) => k.split('|')[0]))];
  assert.deepEqual(kinds(panel), ['PLINTH']);
  assert.deepEqual(kinds(twin), ['PLINTH']);
});

test('F4.5 the D/W front is 594 wide and its height law is untouched', () => {
  for (const leg of [50, 100]) {
    for (const height of [720, 770, 800]) {
      const front = dw({ leg_height: leg, height }).panels.find((p) => p.part === 'FRONT');
      // Turn 27 (CLAUDE.md F2.5): the number moved to the TYPE with the rest
      // of the D/W's measured facts; it did not change and it did not go.
      assert.equal(front.w, getUnitType('DW_PANEL').frontWidth, 'always 594');
      assert.equal(front.h, height - P.doors.gap, 'and as tall as the base fronts beside it');
    }
  }
});
