// ─── The shelf the start screen reads from (BACKLOG #7) ───
//
// Mock mode has no database, so "Open" and "Recent" need somewhere for projects
// to actually BE. What matters and is tested here: Recent means recently
// OPENED (not recently saved), the list survives a corrupted shelf, and a
// project that exists both locally and in the cloud appears once.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  LIBRARY_KEY, RECENT_LIMIT, deleteLocalProject, listLocalProjects, loadLocalProject,
  memoryStorage, mergeProjectLists, recentProjects, saveLocalProject, touchLocalProject,
} from '../src/lib/projectLibrary.js';

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

test('the list is newest first; Recent is recently OPENED, not recently saved', () => {
  const s = memoryStorage();
  const a = saveLocalProject(s, { project: project('A'), units: [], at: 100 });
  const b = saveLocalProject(s, { project: project('B'), units: [], at: 300 });
  const c = saveLocalProject(s, { project: project('C'), units: [], at: 200 });
  assert.deepEqual(listLocalProjects(s).map((p) => p.name), ['B', 'C', 'A']);

  // Opening A now puts it at the top of Recent while the SAVE order is untouched.
  touchLocalProject(s, a.id, 999);
  assert.deepEqual(recentProjects(s).map((p) => p.name), ['A', 'B', 'C']);
  assert.deepEqual(listLocalProjects(s).map((p) => p.name), ['B', 'C', 'A'], 'saving order does not move');

  assert.equal(touchLocalProject(s, 'loc_nope', 1), false);
  assert.equal(b.opened_at, 300, 'a save counts as an open too — you were just in it');
  assert.equal(c.id !== b.id, true);
});

test('Recent shows at most five', () => {
  const s = memoryStorage();
  for (let i = 1; i <= 8; i += 1) saveLocalProject(s, { project: project(`P${i}`), units: [], at: i * 10 });
  const recent = recentProjects(s);
  assert.equal(recent.length, RECENT_LIMIT);
  assert.deepEqual(recent.map((p) => p.name), ['P8', 'P7', 'P6', 'P5', 'P4']);
  assert.equal(recentProjects(s, 2).length, 2);
});

test('a project can be removed, and the rest are untouched', () => {
  const s = memoryStorage();
  const a = saveLocalProject(s, { project: project('A'), units: [], at: 1 });
  saveLocalProject(s, { project: project('B'), units: [], at: 2 });
  assert.equal(deleteLocalProject(s, a.id), true);
  assert.equal(deleteLocalProject(s, a.id), false, 'deleting twice is not an error, just nothing');
  assert.deepEqual(listLocalProjects(s).map((p) => p.name), ['B']);
});

test('a corrupted shelf reads as empty rather than taking the app down', () => {
  for (const junk of ['not json', '{}', '[]', '{"projects":"nope"}', '{"projects":[null,{"no":"id"}]}']) {
    const s = memoryStorage({ [LIBRARY_KEY]: junk });
    assert.deepEqual(listLocalProjects(s), [], junk);
    assert.deepEqual(recentProjects(s), [], junk);
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

test('the Open list merges the shelf with the database, once per project', () => {
  const local = [
    { id: 'loc_1', name: 'Local only', unit_count: 2, updated_at: 500, source: 'local' },
    { id: 'db_1', name: 'Stale local copy', unit_count: 1, updated_at: 100, source: 'local' },
  ];
  const cloud = [
    { id: 'db_1', name: 'Kitchen', updated_at: '2026-08-06T10:00:00Z' },
    { id: 'db_2', name: 'Wardrobe run', updated_at: '2026-08-05T10:00:00Z' },
  ];
  const merged = mergeProjectLists(local, cloud);
  assert.equal(merged.length, 3, 'db_1 appears once');
  const db1 = merged.filter((p) => p.id === 'db_1');
  assert.equal(db1.length, 1);
  assert.equal(db1[0].source, 'cloud', 'the cloud row wins — it is the one that outlives this browser');
  assert.equal(db1[0].name, 'Kitchen');
  // Newest first, whichever shelf it came from.
  assert.ok(merged[0].updated_at >= merged[1].updated_at);
  assert.deepEqual(mergeProjectLists([], []), []);
  assert.deepEqual(mergeProjectLists(local, []).map((p) => p.id), ['loc_1', 'db_1']);
});
