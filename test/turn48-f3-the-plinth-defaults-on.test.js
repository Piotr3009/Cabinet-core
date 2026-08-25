// ─── TURN 48, CLAUDE.md F3: THE PLINTH DEFAULTS ON ──────────────────────────
//
// The owner, 25.08.2026: the plinth is ON by default — standing carcasses only,
// never a hung WUD.
//
// Turn 4 made the plinth a DECISION rather than an automatic (BACKLOG #16: "no
// ghost rows in the cut list") and that was right about the cut list and wrong
// about the default. A base unit without a toe kick is not a thing this
// workshop builds, so every single one was being ticked by hand.
//
// WHERE the switch lives is the load-bearing half, and it is what this file
// mostly holds:
//
//   the store's create path   `newUnit` — where a cabinet is BORN in a project
//   NOT the engine defaults   `defaultParamsFor()` is the golden fixtures' own
//                             contract; a plinth there is a whole extra PART in
//                             all six and iron rule 2 breaks by a panel
//   NOT an automatic          it is one untick away, the control has not moved,
//                             and the check that speaks when a standing unit
//                             has none is unmoved too
//   NOT a migration           a loaded project opens exactly as it was saved

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor, UNIT_TYPES } from '../src/engine/types.js';
import { takesPlinth } from '../src/engine/autoparts.js';
import { useProjectStore, paramsForEngine } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();

function project() {
  store().loadProject({
    id: null,
    name: 't48-f3',
    room: migrateRoom({ height: 2600, corners: rectCorners(12000, 3000) }),
    design: { projectType: 'kitchen' },
  }, []);
}

const unitOf = (id) => store().units.find((u) => u.id === id);
const plinthOf = (id) => computeCabinet(paramsForEngine(unitOf(id)), P)
  .panels.find((p) => p.part === 'PLINTH') || null;

// The owner's own list, in his own words: BUD, BUDR, SINK, LOW, BUDTALL,
// FRIDGE, WARDROBE.
const STANDING = ['BUD', 'BUDR', 'SINK', 'LOW_CABINET', 'BUDTALL', 'FRIDGE', 'WARDROBE'];

test('every STANDING carcass the owner named arrives with its plinth ON', () => {
  // One project per type: the toe kick is a RUN element (T12-F8), so a second
  // cabinet standing beside the first is a MEMBER and cuts nothing of its own —
  // which is right, and would hide the question this test is asking.
  for (const type of STANDING) {
    project();
    const { id, error } = store().addUnit(type);
    assert.equal(error, null, error || type);
    assert.equal(unitOf(id).params.plinth, true, `${type} arrives with a plinth`);
    assert.ok(plinthOf(id), `${type} cuts one`);
  }
});

test('a HUNG unit never grows one', () => {
  for (const type of ['WUD', 'WUD_GLASS', 'WARDROBE_TOP']) {
    project();
    const { id, error } = store().addUnit(type);
    assert.equal(error, null, error || type);
    assert.equal(unitOf(id).params.plinth ?? false, false, `${type} hangs`);
    assert.equal(plinthOf(id), null);
  }
});

test('WHICH types is asked, not listed — the engine\'s own gate answers it', () => {
  // `takesPlinth` is `(type.plinth ?? type.legs) && mount === 'floor'`, the same
  // function the right panel shows the control from and `checks.js` warns off.
  // Naming seven types in the store would have been an eighth answer to a
  // question that already had one.
  for (const type of STANDING) assert.equal(takesPlinth(type, P), true, type);
  for (const type of ['WUD', 'WUD_GLASS', 'WUD_HOOD', 'WARDROBE_TOP']) {
    assert.equal(takesPlinth(type, P), false, type);
  }
  // …and the store's answer IS that function, for every type in the app.
  project();
  for (const type of Object.keys(UNIT_TYPES)) {
    if (!UNIT_TYPES[type].available) continue;
    const { id, error } = store().addUnit(type);
    if (error) continue;                       // a gated kit is a different test
    assert.equal(unitOf(id).params.plinth === true, takesPlinth(type, P),
      `${type}: the store and the engine agree about whether it stands`);
  }
});

test('the ENGINE DEFAULTS do not move — the goldens read them', () => {
  // This is the whole reason the switch is in the store. A `plinth: true` in
  // `defaultParamsFor()` would put a PLINTH panel into all six standard configs
  // and break iron rule 2 by a whole part, not by a field.
  for (const cfg of ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY']) {
    const params = { ...defaultParamsFor(cfg, P), unit_num: '01' };
    assert.equal(params.plinth, undefined, `${cfg}: the kit says nothing about a plinth`);
    const r = computeCabinet(params, P);
    assert.equal(r.panels.some((p) => p.part === 'PLINTH'), false, `${cfg} cuts none`);
  }
  // …and the ONE type that has always said so still says so: a D/W panel's toe
  // kick IS the kit (T28-F1), and that is a property of the type, not of tonight.
  assert.equal(defaultParamsFor('DW_PANEL', P).plinth, true);
});

test('it is a DEFAULT, not an automatic — one untick and it is gone, and stays gone', () => {
  project();
  const { id } = store().addUnit('BUD');
  assert.ok(plinthOf(id));
  store().removePlinth(id);
  assert.equal(unitOf(id).params.plinth, false);
  assert.equal(plinthOf(id), null);
  // Nothing puts it back behind the joiner: a width change, a door, a move.
  store().updateUnitParams(id, { width: 800, doors: { count: 1 } });
  store().refreshAutoParts();
  assert.equal(plinthOf(id), null, 'the default is answered once, at birth');
});

test('an existing project opens exactly as it was saved', () => {
  project();
  const { id } = store().addUnit('BUD');
  store().removePlinth(id);
  const saved = JSON.parse(JSON.stringify(store().units));
  assert.equal(saved[0].params.plinth, false);

  store().loadProject({
    id: null, name: 't48-f3-reopen', room: migrateRoom({ height: 2600, corners: rectCorners(12000, 3000) }), design: {},
  }, saved);
  assert.equal(store().units[0].params.plinth, false,
    'a saved false is a decision somebody made, and loading is not a birth');
  assert.equal(plinthOf(store().units[0].id), null);
});
