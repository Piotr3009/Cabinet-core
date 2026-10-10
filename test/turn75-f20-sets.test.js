// ─── T75 F20 · MULTI-UNIT SETS, AND FIVE OF THEM SHIPPED AS DATA ────────────
//
// CLAUDE.md T75 F20: *"Today a saved set is ONE unit's params
// (`lib/templates.js`). Media wall, Sideboard, Vanity, Utility and Hallway are
// names in `engine/projectTypes.js` with no furniture behind them. Nothing here
// needs a new kit."*
//
// The PROBE (verify/t75/p06-probe.md) measured main: a set row with no `type`
// dropped silently by the shelf; five plain adds leaving half a Media wall in
// the room; the first unit centred, a hung unit's mount overwritten, a free
// panel's tilt not applied, a 25 mm top stripped, one cabinet refused a top,
// `media` a `soon` category with nothing behind it. Each row is asserted here
// the way it reads after F20.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getTemplate, isSetRow, listTemplates, saveSet, setFrom,
} from '../src/lib/templates.js';
import { memoryStorage } from '../src/lib/projectLibrary.js';
import { useTemplateStore } from '../src/stores/templateStore.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import {
  flushHistory, unwatchProjectHistory, useHistoryStore, watchProjectHistory,
} from '../src/stores/historyStore.js';
import { migrateRoom, rectCorners, roomWalls } from '../src/engine/room.js';
import {
  SHIPPED_SETS, setForProjectType, setIsOneLevel, setLayout, setRecipe, shippedSet,
} from '../src/engine/sets.js';
import { PROJECT_TYPES, getProjectType } from '../src/engine/projectTypes.js';
import { UNIT_CATEGORIES, UNIT_TYPES, getCategory, getUnitType } from '../src/engine/types.js';
import { migrateDesign } from '../src/engine/design.js';
import { worktopEligible, worktopsFor } from '../src/engine/worktop.js';
import { autoEndPanelJunctions } from '../src/engine/endPanelAuto.js';
import { getCabinetProfile } from '../src/engine/profile.js';
import { slotTakes } from '../src/engine/collision.js';
import { menuActions } from '../src/lib/contextActions.js';
import { confirmDrawerBox } from './drawer-box-gate.js';

const store = () => useProjectStore.getState();
const history = () => useHistoryStore.getState();
const unitOf = (id) => store().units.find((u) => u.id === id);
const P = () => getCabinetProfile();

function room(width = 4000, depth = 3000) {
  store().loadProject({
    id: null,
    name: 't75-f20',
    room: migrateRoom({ height: 2500, corners: rectCorners(width, depth) }),
    design: {},
  }, []);
  confirmDrawerBox();
}

const leftOf = (u) => Number(u.position.x_mm) || 0;
const rightOf = (u) => leftOf(u) + (Number(u.params.width) || 0);
const worktops = () => migrateDesign(store().project.design).worktops;

// ─── THE PROBE ROWS, AS F20 LEAVES THEM ────────────────────────────────────

test('PROBE · templates.js:84: a SET row survives the shelf, a typeless non-set row is still dropped', () => {
  const storage = memoryStorage();
  storage.setItem('cc.templates.v1', JSON.stringify({
    templates: [
      { id: 'tpl_a', name: 'No type' },
      {
        id: 'tpl_b', kind: 'set', name: 'Pair', schema: 2, units: [{ type: 'BUD', params: { width: 600 }, at: { gap: 0 } }, { type: 'BUD', params: {}, at: { gap: 0 } }],
      },
      { id: 'tpl_c', kind: 'set', name: 'Empty', units: [] },
    ],
  }));
  assert.deepEqual(listTemplates(storage).map((t) => t.id), ['tpl_b']);
  assert.equal(isSetRow(getTemplate(storage, 'tpl_b')), true);
});

test('PROBE · collision.js:816: a set unit stands at EXACTLY the x asked, or nowhere', () => {
  const spec = { width: 600, wallWidth: 4000, others: [{ left: 1000, right: 1600 }] };
  assert.equal(slotTakes({ ...spec, x: 400 }, P()), true);
  assert.equal(slotTakes({ ...spec, x: 1600 }, P()), true);
  assert.equal(slotTakes({ ...spec, x: 1200 }, P()), false, 'on a neighbour');
  assert.equal(slotTakes({ ...spec, x: 3500 }, P()), false, 'through the wall');
});

test('PROBE · library: `media` is the sets shelf now, `soon` deleted; `sets` is unchanged', () => {
  assert.deepEqual(UNIT_CATEGORIES.map((c) => c.id), ['kitchen', 'wardrobe', 'sets', 'media']);
  const media = getCategory('media');
  assert.equal(media.soon, undefined);
  assert.equal(media.sets, true);
  assert.equal(media.label, 'Sets');
  assert.equal(getCategory('sets').saved, true);
});

test('PROBE · projectTypes.js: the five names carry their set, and keep the kitchen category', () => {
  const named = {
    media_wall: 'set-media-wall', sideboard: 'set-sideboard', vanity: 'set-vanity', utility: 'set-utility', hallway: 'set-hallway',
  };
  for (const [id, set] of Object.entries(named)) {
    assert.equal(getProjectType(id).set, set, id);
    assert.equal(getProjectType(id).category, 'kitchen', `${id}: a set job still shows the kitchen kits`);
    assert.equal(setForProjectType(id).id, set);
  }
  for (const t of PROJECT_TYPES.filter((x) => !named[x.id])) assert.equal(t.set, undefined, t.id);
});

// ─── THE FIVE, AS DATA ────────────────────────────────────────────────────

test('the five sets are built ONLY from kits that exist', () => {
  assert.deepEqual(SHIPPED_SETS.map((s) => s.name), ['Media wall', 'Sideboard', 'Vanity', 'Utility', 'Hallway']);
  for (const set of SHIPPED_SETS) {
    for (const u of set.units) {
      assert.ok(UNIT_TYPES[u.type], `${set.name}: ${u.type} is a kit`);
      assert.equal(getUnitType(u.type).id, u.type);
    }
    assert.equal(shippedSet(set.id), set);
  }
});

test('setLayout: next butts, over shares an x, after butts the unit named', () => {
  const media = setRecipe(shippedSet('set-media-wall'));
  const widths = [600, 1200, 1200, 1200, 600];
  const { xs, butts, span } = setLayout(media.units, (i) => widths[i]);
  assert.deepEqual(xs, [0, 600, 600, 600, 1800]);
  assert.deepEqual(butts, [null, 0, null, null, 1]);
  assert.equal(span, 2400);
  const gapped = setLayout([{ at: { gap: 0 } }, { at: { gap: 150 } }, { at: { over: 1, dx: 50 } }], () => 500);
  assert.deepEqual(gapped.xs, [0, 650, 700]);
  assert.deepEqual(gapped.butts, [null, null, null]);
  assert.equal(setIsOneLevel(media.units, (t) => getUnitType(t).mount), false);
  assert.equal(setIsOneLevel(setRecipe(shippedSet('set-sideboard')).units, (t) => getUnitType(t).mount), true);
});

// ─── INSERTED, LEFT TO RIGHT, AS ORDINARY UNITS ───────────────────────────

test('Media wall: two columns, the base hung at 300, two shelves lying flat over it', () => {
  room();
  const { ids, error } = store().insertSet(shippedSet('set-media-wall'));
  assert.equal(error, null, error || '');
  const [c1, base, s1, s2, c2] = ids.map(unitOf);
  assert.deepEqual([c1, base, s1, s2, c2].map((u) => u.type), ['BUDTALL', 'WUD', 'FREE_PANEL', 'FREE_PANEL', 'BUDTALL']);
  assert.equal(base.params.mount_height, 300, 'PROBE alignedMountFor: the recipe height is written back');
  assert.equal(leftOf(base), rightOf(c1), 'the base butts the left column');
  assert.equal(leftOf(c2), rightOf(base), 'the right column butts the base');
  for (const [shelf, mount] of [[s1, 1200], [s2, 1600]]) {
    assert.equal(leftOf(shelf), leftOf(base), 'a shelf stands OVER the base, not beside it');
    assert.equal(shelf.params.width, 1200);
    assert.equal(shelf.params.height, 18, 'PROBE FREE_PANEL tilt: flat, the box is the board lying down');
    assert.equal(shelf.params.depth, 300);
    assert.equal(shelf.params.mount_height, mount);
  }
});

test('Sideboard: three butted, end panels at both ends, ONE 25 mm top over the three', () => {
  room();
  const { ids, error } = store().insertSet(shippedSet('set-sideboard'));
  assert.equal(error, null, error || '');
  const units = ids.map(unitOf);
  assert.equal(leftOf(units[1]), rightOf(units[0]));
  assert.equal(leftOf(units[2]), rightOf(units[1]));
  assert.deepEqual(units[0].params.end_panels.map((e) => e.side), ['L']);
  assert.deepEqual(units[2].params.end_panels.map((e) => e.side), ['R']);
  const tops = worktops();
  assert.equal(tops.length, 1);
  assert.deepEqual(tops[0].unitIds, ids);
  assert.equal(tops[0].thickness, 25, 'PROBE worktop thickness: the record keeps its own');
  const slabs = worktopsFor({ records: tops, units: store().units, profile: P(), walls: roomWalls(store().project.room) });
  assert.equal(slabs[0].geometry.t ?? slabs[0].geometry.thickness, 25);
});

test('Vanity: the sink at the vanity height, a wall unit over it, a top of ONE with the basin cut-out', () => {
  room();
  const { ids, error } = store().insertSet(shippedSet('set-vanity'));
  assert.equal(error, null, error || '');
  const [sink, wall] = ids.map(unitOf);
  assert.equal(sink.params.height, 600, 'PROBE vanity height: read at insertion, in a kitchen job too');
  assert.equal(sink.params.height_custom, true, 'the kitchen job\'s own base height is 770');
  assert.equal(leftOf(wall), leftOf(sink), 'the wall unit hangs OVER the sink');
  const tops = worktops();
  assert.equal(tops.length, 1);
  assert.equal(tops[0].kind, 'top', 'PROBE single-unit top: one cabinet may carry a set\'s top');
  const slabs = worktopsFor({ records: tops, units: store().units, profile: P(), walls: roomWalls(store().project.room) });
  assert.equal(slabs.length, 1);
  assert.equal(slabs[0].cutouts.length, 1);
  assert.equal(slabs[0].cutouts[0].kind, 'sink', 'the basin cut-out is F5\'s record');
});

test('Utility: four butted, and every low-meets-tall junction inside the set is finished', () => {
  room();
  const { ids, error } = store().insertSet(shippedSet('set-utility'));
  assert.equal(error, null, error || '');
  const units = ids.map(unitOf);
  assert.deepEqual(units.map((u) => u.type), ['BUDTALL', 'DW_PANEL', 'APPLIANCE_TALL2', 'BUD']);
  const owed = autoEndPanelJunctions(store().units, P(), { room: store().project.room })
    .filter((j) => ids.includes(j.unitId) && ids.includes(j.otherId));
  assert.deepEqual(owed, [], 'a carcass side never stays visible');
  assert.deepEqual(units[2].params.end_panels.map((e) => e.side).sort(), ['L', 'R'],
    'the tower is panelled on both sides, the low units beside it');
});

test('Hallway: a shoe bench with a 25 mm top, an open wardrobe with its rail, a tall unit', () => {
  room();
  const { ids, error } = store().insertSet(shippedSet('set-hallway'));
  assert.equal(error, null, error || '');
  const [bench, coats, tall] = ids.map(unitOf);
  assert.equal(bench.type, 'LOW_CABINET');
  assert.ok(coats.params.sections[0].items.some((i) => i.kind === 'hanger'), 'the coat run has its rail');
  assert.equal(coats.params.doors, false, 'without doors');
  assert.equal(tall.type, 'BUDTALL');
  const tops = worktops();
  assert.equal(tops.length, 1);
  assert.deepEqual(tops[0].unitIds, [bench.id]);
  assert.equal(tops[0].thickness, 25);
  assert.equal(tops[0].kind, 'top');
});

// ─── ROOM REFUSES FIRST ───────────────────────────────────────────────────

test('ROOM REFUSES FIRST: a wall too short for the span refuses the WHOLE set, in words, nothing placed', () => {
  room(1500, 1500);
  const before = JSON.stringify(store().units);
  const { ids, error } = store().insertSet(shippedSet('set-utility'));
  assert.deepEqual(ids, []);
  assert.match(error, /There is no room for the Utility \(\d+ mm\) on any wall/);
  assert.equal(JSON.stringify(store().units), before);
});

test('ROOM REFUSES FIRST: beside a unit with no room on that side, refused naming it', () => {
  room(3000, 3000);
  const a = store().addUnit('BUD').id;
  store().moveUnit(a, 2350, 0, { magnet: false });
  const before = JSON.stringify(store().units);
  const { error } = store().insertSet(shippedSet('set-sideboard'), { near: a, side: 'R' });
  assert.match(error, new RegExp(`There is no room for the Sideboard .* beside ${unitOf(a).params.unit_num}`));
  assert.equal(JSON.stringify(store().units), before);
});

test('a set is ONE undo step', () => {
  watchProjectHistory();
  try {
    room();
    history().clear();
    const depth = history().past.length;
    store().insertSet(shippedSet('set-sideboard'));
    flushHistory();
    assert.equal(history().past.length, depth + 1);
    assert.ok(history().undo());
    assert.equal(store().units.length, 0);
    assert.deepEqual(worktops(), []);
  } finally {
    unwatchProjectHistory();
  }
});

// ─── THE WIDTH ADAPTS TO THE WALL ─────────────────────────────────────────

test('SHARE OUT: a set that is the whole run, under the gap, closes it to the wall', () => {
  room(2200, 2000);
  const { ids, error, shared } = store().insertSet(shippedSet('set-sideboard'));
  assert.equal(error, null, error || '');
  assert.equal(shared, true);
  const units = ids.map(unitOf);
  assert.deepEqual(units.map((u) => u.params.width), [690, 690, 690]);
  assert.equal(leftOf(units[1]), rightOf(units[0]));
});

test('SHARE OUT: widthFixed kits keep their width while the others take the leftover', () => {
  room(2100, 2000);
  const run = { name: 'Run', units: [{ type: 'BUD' }, { type: 'DW_PANEL' }, { type: 'BUD' }] };
  const { ids, shared } = store().insertSet(run);
  assert.equal(shared, true);
  assert.deepEqual(ids.map((id) => unitOf(id).params.width), [710, 600, 710]);
});

test('SHARE OUT: a set the run does not hold whole (a tall unit breaks it) is left to the offer bar', () => {
  room(2000, 2000);
  const { ids, error, shared } = store().insertSet(shippedSet('set-hallway'));
  assert.equal(error, null, error || '');
  assert.equal(shared, false);
  assert.deepEqual(ids.map((id) => unitOf(id).params.width), [600, 600, 600]);
});

test('SHARE OUT: a set on a wall with plenty of room keeps its own widths (no 1306 mm cabinets)', () => {
  room(4000, 3000);
  const { ids, shared } = store().insertSet(shippedSet('set-sideboard'));
  assert.equal(shared, false);
  assert.deepEqual(ids.map((id) => unitOf(id).params.width), [600, 600, 600]);
});

test('SHARE OUT: a mixed-level set is never shared out (the probe measured the gap collapse)', () => {
  room(2500, 2000);
  const { ids, error, shared } = store().insertSet(shippedSet('set-media-wall'));
  assert.equal(error, null, error || '');
  assert.equal(shared, false);
  assert.equal(leftOf(unitOf(ids[4])), rightOf(unitOf(ids[1])), 'the base still hangs between the columns');
});

// ─── SAVED SETS ────────────────────────────────────────────────────────────

test('SAVE AS A SET: a selection becomes a recipe, positions stripped, the gaps and the hangs kept', () => {
  room();
  const { ids } = store().insertSet(shippedSet('set-vanity'));
  const extra = store().addUnit('BUD', { near: ids[0], side: 'R' }).id;
  store().moveUnit(extra, rightOf(unitOf(ids[0])) + 150, 0, { magnet: false });
  const row = setFrom([...ids, extra].map(unitOf), 'Bathroom');
  assert.equal(row.kind, 'set');
  assert.equal(row.schema, 2);
  assert.deepEqual(row.units.map((u) => u.type), ['SINK', 'WUD', 'BUD']);
  assert.deepEqual(row.units.map((u) => u.at), [{ gap: 0 }, { over: 0, dx: 0 }, { gap: 150 }]);
  for (const u of row.units) {
    assert.equal(u.params.unit_num, undefined);
    assert.equal(u.params.rides_on, undefined);
    assert.equal(u.position, undefined);
  }
  assert.equal(setFrom([unitOf(ids[0])], 'one'), null, 'a set is two or more');
});

test('SAVE AS A SET, then insert it in a new job: the same kits at the same offsets', () => {
  useTemplateStore.getState().useStorage(memoryStorage());
  room();
  const shipped = store().insertSet(shippedSet('set-media-wall'));
  const source = shipped.ids.map(unitOf);
  const saved = useTemplateStore.getState().saveSet(source, 'My media wall', 5);
  assert.equal(saved.error, null);
  assert.equal(useTemplateStore.getState().templates[0].kind, 'set');
  assert.equal(saveSet(memoryStorage(), { units: source, name: '' }).error, 'Give the set a name.');

  room();
  const again = store().insertSet(useTemplateStore.getState().templates[0]);
  assert.equal(again.error, null, again.error || '');
  const made = again.ids.map(unitOf);
  const order = (list) => [...list].sort((a, b) => leftOf(a) - leftOf(b) || (a.params.mount_height || 0) - (b.params.mount_height || 0));
  const x0 = (list) => Math.min(...list.map(leftOf));
  const shape = (list) => order(list).map((u) => [u.type, leftOf(u) - x0(list), u.params.width, u.params.mount_height ?? null]);
  assert.deepEqual(shape(made), shape(source));
});

test('the context menu says "Save as a set" over a selection, "Save as template" over one', () => {
  room();
  const { ids } = store().insertSet(shippedSet('set-sideboard'));
  const units = ids.map(unitOf);
  const one = menuActions({ unit: units[0], selection: [units[0]] }).find((a) => a.id === 'save-template');
  const many = menuActions({ unit: units[0], selection: units }).find((a) => a.id === 'save-template');
  assert.equal(one.label, 'Save as template');
  assert.equal(many.label, 'Save as a set (3)');
});

// ─── SAVE AND RELOAD ──────────────────────────────────────────────────────

test('SAVE AND RELOAD: a set is ordinary units and a top of one survives the design migration', () => {
  const design = migrateDesign({
    worktops: [
      {
        id: 'w1', unitIds: ['u1'], kind: 'top', thickness: 25,
      },
      { id: 'w2', unitIds: ['u2'] },
    ],
  });
  assert.deepEqual(design.worktops.map((w) => w.id), ['w1'], 'a one-cabinet record without `top` is still not a worktop');
  assert.equal(design.worktops[0].kind, 'top');
  room();
  const { ids } = store().insertSet(shippedSet('set-hallway'));
  const units = JSON.parse(JSON.stringify(store().units));
  const project = JSON.parse(JSON.stringify(store().project));
  store().loadProject(project, units);
  assert.deepEqual(store().units.map((u) => u.id).filter((id) => ids.includes(id)), ids);
  assert.equal(worktops()[0].kind, 'top');
  assert.equal(worktopEligible([unitOf(ids[0])], P()).ok, false, 'one cabinet asked for by hand is still refused');
  assert.equal(worktopEligible([unitOf(ids[0])], P(), { single: true }).ok, true);
});
