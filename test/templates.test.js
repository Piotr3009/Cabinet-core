import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cleanName, deleteTemplate, getTemplate, listTemplates, renameTemplate,
  saveTemplate, templateFrom, templateParams, NAME_MAX,
} from '../src/lib/templates.js';
import { memoryStorage } from '../src/lib/projectLibrary.js';
import { useTemplateStore } from '../src/stores/templateStore.js';
import { useProjectStore, paramsForEngine } from '../src/stores/projectStore.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
// Turn 24 (CLAUDE.md F3.1): no thickness, no drawers — the gate, opened.
import { confirmDrawerBox } from './drawer-box-gate.js';

// ─── Saved sets (BACKLOG #30, turn 5 F4) ───
//
// A joiner builds one 900 mm wardrobe with drawers, a rail, shelves and an end
// panel, and then wants nine more like it. A template is that unit's
// PARAMETERS — not where it stood, not its number — and inserting one is the
// ordinary add path with the saved parameters in place of the factory ones, so
// collisions and free slots behave exactly as they do for a library type.

const store = () => useProjectStore.getState();
const templates = () => useTemplateStore.getState();

function project() {
  store().loadProject({
    id: null,
    name: 'templates',
    room: migrateRoom({ height: 2500, corners: rectCorners(6000, 4000) }),
    design: {},
  }, []);
}

/** A configured wardrobe: not the default one, so "1:1" means something. */
function configured() {
  project();
  const { id } = store().addUnit('WARDROBE');
  store().updateUnitParams(id, { width: 900, depth: 600, height: 2000 });
  store().addShelves(id, 2);
  confirmDrawerBox();
  store().addDrawers(id, 2, 'overlay', 220);
  store().addEndPanel(id, { side: 'R' });
  store().addPlinth(id);
  store().setDoors(id, { count: 2, hinge: 'L' });
  return id;
}

const unitOf = (id) => store().units.find((u) => u.id === id);

// ─── what a template IS ───

test('a template keeps how a unit is built and not where it stood', () => {
  const id = configured();
  const params = templateParams(unitOf(id));

  assert.equal(params.width, 900);
  assert.equal(params.height, 2000);
  assert.ok(params.sections[0].items.length >= 4, 'the interior comes with it');
  assert.equal(params.end_panels.length, 1);
  assert.equal(params.plinth, true);

  // …and NOT these.
  assert.equal('unit_num' in params, false, 'the new unit gets the next number');
  assert.equal('side_infill_left_mm' in params, false, 'a filler belongs to a gap, not to a cabinet');
  assert.equal('side_infill_right_mm' in params, false);
});

test('a template is a deep copy — editing the unit afterwards does not edit it', () => {
  const id = configured();
  const t = templateFrom(unitOf(id), 'Bedroom wardrobe', { at: 1 });
  store().updateUnitParams(id, { width: 600 });
  assert.equal(t.params.width, 900, 'the saved set is a snapshot, not a live view');
});

test('a name is tidied, capped, and never empty by accident', () => {
  assert.equal(cleanName('  Bedroom   wardrobe  '), 'Bedroom wardrobe');
  assert.equal(cleanName(null), '');
  assert.equal(cleanName('x'.repeat(200)).length, NAME_MAX);
  // An unnamed save still gets a usable label rather than an empty row.
  assert.equal(templateFrom({ type: 'BUD', params: {} }, '', { at: 0 }).name, 'Base unit');
  assert.equal(templateFrom(null, 'x'), null, 'nothing to save is not a template');
});

// ─── the shelf ───

test('saving, listing, renaming and deleting', () => {
  const storage = memoryStorage();
  const id = configured();
  const unit = unitOf(id);

  const first = saveTemplate(storage, { unit, name: 'Bedroom wardrobe', at: 10 });
  assert.equal(first.error, null);
  assert.equal(first.template.type, 'WARDROBE');
  assert.equal(listTemplates(storage).length, 1);
  assert.equal(getTemplate(storage, first.template.id).name, 'Bedroom wardrobe');

  // Newest first.
  saveTemplate(storage, { unit, name: 'Hall wardrobe', at: 20 });
  assert.deepEqual(listTemplates(storage).map((t) => t.name), ['Hall wardrobe', 'Bedroom wardrobe']);

  assert.equal(renameTemplate(storage, first.template.id, 'Guest wardrobe').ok, true);
  assert.equal(getTemplate(storage, first.template.id).name, 'Guest wardrobe');

  // A name already in use is refused rather than making a second identical row.
  const clash = renameTemplate(storage, first.template.id, 'Hall wardrobe');
  assert.equal(clash.ok, false);
  assert.ok(clash.error.includes('Hall wardrobe'));
  assert.equal(renameTemplate(storage, first.template.id, '   ').ok, false, 'and an empty name is not a name');

  assert.equal(deleteTemplate(storage, first.template.id), true);
  assert.equal(deleteTemplate(storage, first.template.id), false, 'deleting twice is not an error, just nothing');
  assert.deepEqual(listTemplates(storage).map((t) => t.name), ['Hall wardrobe']);
});

test('saving under a name that exists REPLACES it, rather than making a twin', () => {
  const storage = memoryStorage();
  const id = configured();
  saveTemplate(storage, { unit: unitOf(id), name: 'Standard', at: 10 });

  store().updateUnitParams(id, { width: 600 });
  const again = saveTemplate(storage, { unit: unitOf(id), name: 'standard', at: 20 });

  assert.equal(again.replaced, true);
  assert.equal(listTemplates(storage).length, 1, 'a library of "Standard (2)" is a library nobody uses');
  assert.equal(listTemplates(storage)[0].params.width, 600, 'and it is the NEW one');
  assert.equal(listTemplates(storage)[0].created_at, 10, 'while remembering when it was first made');
});

test('an unnamed save is refused, and says so', () => {
  const storage = memoryStorage();
  const { template, error } = saveTemplate(storage, { unit: { type: 'BUD', params: {} }, name: '  ' });
  assert.equal(template, null);
  assert.ok(error);
  assert.equal(listTemplates(storage).length, 0);
});

test('a corrupted or half-written shelf is an empty library, not a crash', () => {
  assert.deepEqual(listTemplates(memoryStorage({ 'cc.templates.v1': '{oh dear' })), []);
  assert.deepEqual(listTemplates(memoryStorage({ 'cc.templates.v1': '{"templates":"nope"}' })), []);
  // A row with no type could never be inserted, so it is not a template.
  assert.deepEqual(
    listTemplates(memoryStorage({ 'cc.templates.v1': '{"templates":[{"id":"tpl_1"},{"id":"tpl_2","type":"BUD"}]}' }))
      .map((t) => t.id),
    ['tpl_2'],
  );
});

// ─── the store, and inserting ───

test('the store is a shell over those rules', () => {
  templates().useStorage(memoryStorage());
  const id = configured();

  const { template } = templates().save(unitOf(id), 'Bedroom wardrobe', 10);
  assert.equal(templates().templates.length, 1);
  assert.equal(templates().templates[0].id, template.id);

  templates().rename(template.id, 'Guest wardrobe');
  assert.equal(templates().templates[0].name, 'Guest wardrobe');

  templates().remove(template.id);
  assert.deepEqual(templates().templates, []);
});

test('inserting a saved set produces the same unit, through the normal add path', () => {
  templates().useStorage(memoryStorage());
  const source = configured();
  const { template } = templates().save(unitOf(source), 'Bedroom wardrobe', 10);
  const before = computeCabinet(paramsForEngine(unitOf(source)), P);

  const { id, error } = store().addUnit(template.type, { params: template.params });
  assert.equal(error, null, error || '');
  const made = unitOf(id);

  // 1:1 on everything that describes the cabinet…
  assert.equal(made.params.width, 900);
  assert.equal(made.params.height, 2000);
  assert.equal(made.params.depth, 600);
  assert.equal(made.params.plinth, true);
  assert.equal(made.params.end_panels.length, 1);
  assert.deepEqual(made.params.doors, unitOf(source).params.doors);

  // …and the cut list agrees, which is the only 1:1 that matters at the saw.
  const after = computeCabinet(paramsForEngine(made), P);
  assert.deepEqual(
    after.panels.map((p) => [p.part, p.w, p.h]),
    before.panels.map((p) => [p.part, p.w, p.h]),
  );

  // Its own number, its own place, its own item ids.
  assert.notEqual(made.params.unit_num, unitOf(source).params.unit_num);
  const sourceIds = unitOf(source).params.sections[0].items.map((i) => i.id);
  for (const item of made.params.sections[0].items) {
    assert.equal(sourceIds.includes(item.id), false, 'a shared item id would drag two shelves at once');
  }
  assert.equal(unitOf(source).params.end_panels[0].id === made.params.end_panels[0].id, false);
});

test('an inserted set obeys the collision rules like anything else', () => {
  templates().useStorage(memoryStorage());

  // A wide set, saved from a room that had space for it.
  project();
  const { id } = store().addUnit('BUD');
  store().updateUnitParams(id, { width: 1200 });
  assert.equal(unitOf(id).params.width, 1200);
  const { template } = templates().save(unitOf(id), 'Wide base', 10);

  // …and then carried into a room where it does not fit on any wall. Refused,
  // with the number, rather than dropped on top of something.
  store().loadProject({
    id: null, name: 'tight', room: migrateRoom({ height: 2500, corners: rectCorners(1000, 1000) }), design: {},
  }, []);
  const attempt = store().addUnit(template.type, { params: template.params });
  assert.equal(attempt.id, null);
  assert.ok(attempt.error.includes('1200'), attempt.error);
  assert.equal(store().units.length, 0);
});

test('two units from one set stand beside each other, not on top', () => {
  templates().useStorage(memoryStorage());
  const source = configured();
  const { template } = templates().save(unitOf(source), 'Bedroom wardrobe', 10);

  const a = store().addUnit(template.type, { params: template.params });
  const b = store().addUnit(template.type, { params: template.params });
  assert.equal(a.error, null);
  assert.equal(b.error, null);

  const spans = store().units
    .filter((u) => (u.position.wall ?? 0) === 0)
    .map((u) => [u.position.x_mm, u.position.x_mm + u.params.width])
    .sort((x, y) => x[0] - y[0]);
  for (let i = 1; i < spans.length; i += 1) {
    assert.ok(spans[i][0] >= spans[i - 1][1], `${spans[i - 1]} overlaps ${spans[i]}`);
  }
});
