// ─── The shelf the start screen reads from (BACKLOG #7) ───
//
// Mock mode has no database, so "Open" and "Recent" need somewhere for projects
// to actually BE. What matters and is tested here: the list survives a
// corrupted shelf, and a save replaces rather than duplicates.
//
// REWRITTEN BY T-CC1a F4 (31.10.2026) to the new law: the list is Joinery
// Core's and Recent is per tenant (lib/jcList.js); the shelf's own Recent, its
// remove and the cloud merge are deleted, and this file asserts they are gone.
// The owner: *"w cc musimy zapisywac na glownej stronie; projekty dzielimy na itemy"*.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  LIBRARY_KEY, listLocalProjects, loadLocalProject, memoryStorage, saveLocalProject,
} from '../src/lib/projectLibrary.js';
import * as library from '../src/lib/projectLibrary.js';

const project = (name, id = null) => ({ id, name, room: { height: 2500 }, design: null });
const unit = (n) => ({ id: `u${n}`, type: 'BUD', position: { wall: 0, x_mm: 0 }, params: { width: 600 } });

test('a saved project comes back with its units and its id', () => {
  const s = memoryStorage();
  const row = saveLocalProject(s, { project: project('Kitchen'), units: [unit(1), unit(2)], at: 1000 });
  assert.match(row.id, /^loc_/);
  assert.equal(row.unit_count, 2);

  const loaded = loadLocalProject(s, row.id);
  assert.equal(loaded.project.name, 'Kitchen');
  assert.equal(loaded.project.id, row.id, 'the id is written back into the project');
  assert.equal(loaded.units.length, 2);
  assert.equal(loadLocalProject(s, 'loc_nope'), null);
});

test('saving twice replaces, it does not duplicate', () => {
  const s = memoryStorage();
  const first = saveLocalProject(s, { project: project('Kitchen'), units: [unit(1)], at: 1000 });
  saveLocalProject(s, { project: project('Kitchen renamed', first.id), units: [unit(1), unit(2)], at: 2000 });
  const list = listLocalProjects(s);
  assert.equal(list.length, 1);
  assert.equal(list[0].name, 'Kitchen renamed');
  assert.equal(list[0].unit_count, 2);
  assert.equal(list[0].updated_at, 2000);
});

test('T-CC1a F4 · the shelf\'s own Recent, remove, number proposal and cloud merge are deleted', () => {
  for (const gone of ['recentProjects', 'touchLocalProject', 'deleteLocalProject', 'mergeProjectLists', 'nextProjectNumber', 'RECENT_LIMIT']) {
    assert.equal(library[gone], undefined, `${gone} is still exported`);
  }
});

test('a corrupted shelf reads as empty rather than taking the app down', () => {
  for (const junk of ['not json', '{}', '[]', '{"projects":"nope"}', '{"projects":[null,{"no":"id"}]}']) {
    const s = memoryStorage({ [LIBRARY_KEY]: junk });
    assert.deepEqual(listLocalProjects(s), [], junk);
    // …and it is still writable afterwards.
    const row = saveLocalProject(s, { project: project('Fresh'), units: [], at: 5 });
    assert.equal(loadLocalProject(s, row.id).project.name, 'Fresh');
  }
});

test('a storage that refuses to write does not throw at the caller', () => {
  const refusing = {
    getItem: () => null,
    setItem: () => { throw new Error('QuotaExceeded'); },
    removeItem: () => {},
  };
  assert.doesNotThrow(() => saveLocalProject(refusing, { project: project('X'), units: [], at: 1 }));
  assert.deepEqual(listLocalProjects(refusing), []);
});
