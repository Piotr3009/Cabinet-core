/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── CHAT FIX 28.10.2026 · THE JOB AS A FILE (.ccproject) ────────────────────
//
// The owner, 28.10.2026: *"ja mowie o pliku z CC zebym mial ten sam na innym
// kompie"*; *"wiesz ze CC nie jest w chmurze jeszcze"*; *"zrobisz mi pozniej
// cos co zadziala, czyli export i import projektow"*; *"problem polega na tym
// ze nie dzialaja te szuflady ani import ani export plikow"*.
//
// Held here: the file (lib/projectFile.js) round trip, its refusals in words,
// its name, the two questions it can ask and their answers; the two roads
// (lib/projectFileRoad.js) run on the real stores, the window handed in as a
// stand-in; and the three doors in the source (File > Open from file...,
// File > Save to file..., the start screen's Open from file...).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  PROJECT_FILE_EXT, PROJECT_FILE_FORMAT, PROJECT_FILE_VERSION, buildProjectFile, compareProfiles, jobLabel,
  objectDifferences, parseProjectFile, projectFileName, projectFileQuestions, projectFileText, projectForOpen,
  safeFilePart, settingWords, shelfCollision, withAssignments,
} from '../src/lib/projectFile.js';
import { openProjectFromFile, saveProjectToFile } from '../src/lib/projectFileRoad.js';
import {
  companyWithLogoRef, listLocalProjects, loadLocalProject, memoryStorage, saveLocalProject,
} from '../src/lib/projectLibrary.js';
import { MODAL_KINDS } from '../src/lib/modalLayer.js';
import { DEFAULT_CABINET_PROFILE as P, getCabinetProfile } from '../src/engine/profile.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { setPersistence } from '../src/stores/persistence.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import { useCabinetProfileStore } from '../src/stores/cabinetProfileStore.js';
import { useHistoryStore } from '../src/stores/historyStore.js';
import { useMaterialAssignmentStore } from '../src/stores/materialAssignmentStore.js';

setPersistence('none');
const ROOT = new URL('../', import.meta.url);
const read = (rel) => readFileSync(new URL(rel, ROOT), 'utf8');
const S = () => useProjectStore.getState();
const UI = () => useUiStore.getState();
const EM = String.fromCharCode(0x2014);
const EN = String.fromCharCode(0x2013);

const LOGO = { href: 'data:image/png;base64,iVBORw0KGgo=', width: 120, height: 40 };
const ASSIGNED = {
  schema: 2, base: { carcase_side: { material_id: 'MAT-OAK-18', yield: 1, category: 'board', subcategory: '' } },
  overrides: {}, customParts: [], auto: {},
};
const job = (over = {}) => ({
  id: 'loc_kowalski',
  number: '1234',
  name: 'Kowalski szafa',
  client: 'Kowalski',
  room: migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) }),
  design: {},
  titleBlock: { company: { name: 'Skylon', logo: LOGO } },
  ...over,
});
const UNITS = [{ id: 'u_1', type: 'BUD', position: { wall: 0, x_mm: 200 }, params: { width: 600 } }];
const AT = Date.UTC(2026, 9, 28, 21, 10);

/** The job with a unit of its own, built through the store as a person builds it. */
function storeJob() {
  S().loadProject({
    id: 'loc_store_job', number: '0042', name: 'Store job', client: 'O',
    room: migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) }), design: {},
  }, []);
  const u = S().addUnit('BUD');
  assert.ok(u && !u.error, 'a base unit is placed');
  return { project: S().project, units: S().units };
}

// ═══ THE FILE ════════════════════════════════════════════════════════════════

test('the round trip: build, text, parse gives the same job, cabinets, assignments, logo and settings', () => {
  const file = buildProjectFile({ project: job(), units: UNITS, assignments: ASSIGNED, profile: P, at: AT });
  assert.equal(file.format, PROJECT_FILE_FORMAT);
  assert.equal(file.version, PROJECT_FILE_VERSION);
  assert.equal(file.saved_at, '2026-10-28T21:10:00.000Z');
  assert.equal(file.app.name, 'Cabinet Core');
  const back = parseProjectFile(projectFileText(file));
  assert.equal(back.ok, true, back.error);
  assert.deepEqual(back.file.project, { ...job(), assignments: ASSIGNED });
  assert.deepEqual(back.file.units, UNITS);
  assert.deepEqual(back.file.project.titleBlock.company.logo, LOGO, 'the logo whole');
  assert.deepEqual(back.file.profile, JSON.parse(JSON.stringify(P)), 'the workshop settings it was drawn with');
  assert.equal(back.file.savedAt, AT);
  assert.ok(projectFileText(file).endsWith('}\n'));
});

test('the logo a shelf keeps as a { ref } goes into the file WHOLE', () => {
  const shelf = memoryStorage();
  const company = companyWithLogoRef(shelf, { name: 'Skylon', logo: LOGO });
  assert.ok(company.logo.ref && !company.logo.href, 'the shelf holds the picture once, by ref');
  const file = buildProjectFile({ project: job({ titleBlock: { company } }), units: [], storage: shelf, at: AT });
  assert.equal(file.project.titleBlock.company.logo.href, LOGO.href, 'never a { ref }: the other computer has no shelf to look it up on');
});

test('the assignments fold as lib/persist.js folds them: the live blob, else the job\'s own', () => {
  assert.deepEqual(withAssignments({ id: 'a' }, ASSIGNED), { id: 'a', assignments: ASSIGNED });
  assert.deepEqual(withAssignments({ id: 'a', assignments: { x: 1 } }, null), { id: 'a', assignments: { x: 1 } });
  assert.deepEqual(withAssignments({ id: 'a', assignments: { x: 1 } }, ASSIGNED), { id: 'a', assignments: ASSIGNED });
  assert.deepEqual(withAssignments({ id: 'a' }, null), { id: 'a' }, 'nothing assigned, no key');
  // ...the very lines of persist.js, so the two can never fold differently.
  assert.match(read('src/lib/persist.js'), /assignments = useMaterialAssignmentStore\.getState\(\)\.data \|\| assignments/);
});

test('a file that is not one says so in words, and never throws', () => {
  const good = buildProjectFile({ project: job(), units: UNITS, at: AT });
  const said = (text) => parseProjectFile(text);
  assert.match(said('').error, /empty/);
  assert.match(said(undefined).error, /empty/);
  assert.match(said('{ not json').error, /cannot be read/);
  assert.match(said(JSON.stringify({ hello: 1 })).error, /not a Cabinet Core project file/);
  assert.match(said(JSON.stringify({ ...good, version: 2 })).error, /newer Cabinet Core \(file version 2\)/);
  assert.match(said(JSON.stringify({ ...good, version: 'x' })).error, /no version/);
  assert.match(said(JSON.stringify({ ...good, project: [] })).error, /holds no project/);
  assert.match(said(JSON.stringify({ ...good, units: null })).error, /no list of cabinets/);
  assert.equal(said(`﻿${projectFileText(good)}`).ok, true, 'a byte-order mark from a Windows editor is read');
  assert.equal(said(JSON.stringify({ ...good, profile: 'x' })).file.profile, null, 'settings that are not an object are none');
});

test('the name: number, name, the day, .ccproject; safe for Windows', () => {
  const day = new Date(2026, 9, 28, 21, 10);
  assert.equal(projectFileName(job(), day), '1234 Kowalski szafa 28.10.2026.ccproject');
  assert.equal(projectFileName({ name: 'Szafa: góra/dół?' }, day), 'Szafa góra dół 28.10.2026.ccproject');
  assert.equal(projectFileName({}, day), 'Cabinet Core project 28.10.2026.ccproject');
  assert.equal(projectFileName({ number: 'CON' }, day), 'CON project 28.10.2026.ccproject');
  assert.equal(safeFilePart('a<b>:"c"/d\\e|f?g*h.  '), 'a b c d e f g h');
  assert.ok(safeFilePart('x'.repeat(300)).length <= 120);
  assert.equal(PROJECT_FILE_EXT, '.ccproject');
});

test('the first question: the same job already on this computer (by id)', () => {
  const rows = [{ id: 'loc_other', name: 'A' }, { id: 'loc_kowalski', name: 'Kowalski szafa', updated_at: 5 }];
  assert.equal(shelfCollision(rows, job()).id, 'loc_kowalski');
  assert.equal(shelfCollision(rows, job({ id: 'loc_new' })), null);
  assert.equal(shelfCollision(rows, job({ id: null })), null, 'a job with no id lands on no row');
  assert.equal(jobLabel(job()), '1234 · Kowalski szafa');
  assert.equal(jobLabel({ name: 'Only a name' }), 'Only a name');
  // Replace keeps the id (the row is overwritten); Keep both is the shelf's own copy (Save as: `${name} copy`).
  assert.equal(projectForOpen({ project: job() }, 'replace').id, 'loc_kowalski');
  const copy = projectForOpen({ project: job() }, 'copy');
  assert.equal(copy.id, null);
  assert.equal(copy.name, 'Kowalski szafa copy');
  assert.match(read('src/components/SaveAsModal.jsx'), /useState\(`\$\{current\} copy`\)/, 'the copy\'s name is Save as\'s');
});

test('the second question: other workshop settings, compared after migrateCabinetProfile', () => {
  const same = JSON.parse(JSON.stringify(P));
  assert.equal(compareProfiles(same, P), null, 'the same settings ask nothing');
  assert.equal(compareProfiles(null, P), null, 'a file with no settings asks nothing');
  assert.equal(compareProfiles({ carcass: P.carcass, puzzle: P.puzzle, wardrobe: P.wardrobe }, P), null,
    'an older file\'s settings are merged with today\'s keys, never read raw');
  const other = JSON.parse(JSON.stringify(P));
  other.carcass.shelfSetbackMm = 20;
  const diff = compareProfiles(other, P);
  assert.deepEqual(diff, { count: 1, rows: [{ path: 'carcass.shelfSetbackMm', file: 20, here: P.carcass.shelfSetbackMm }] });
  assert.equal(settingWords('carcass.shelfSetbackMm'), 'carcass > shelf setback mm');
  assert.deepEqual(objectDifferences({ a: [1, 2], b: { c: 1 } }, { a: [1, 2], b: { c: 2 } }), [{ path: 'b.c', a: 1, b: 2 }]);
  // Both questions, either, or none.
  const file = { project: job(), profile: other };
  const shelfRows = [{ id: 'loc_kowalski', updated_at: 1 }];
  const both = projectFileQuestions({ file, shelfRows, hereProfile: P });
  assert.ok(both.collision && both.profile);
  const none = projectFileQuestions({ file: { project: job({ id: 'x' }), profile: same }, shelfRows, hereProfile: P });
  assert.deepEqual(none, { collision: null, profile: null });
});

// ═══ THE ROADS, ON THE REAL STORES ═══════════════════════════════════════════

test('Save to file: the job on the screen, its live assignments, its settings, one download', async () => {
  const { project, units } = storeJob();
  useMaterialAssignmentStore.getState().setProject(project.id, { blob: ASSIGNED });
  let got = null;
  const name = saveProjectToFile({ storage: memoryStorage(), at: AT, deliver: (n, blob) => { got = { n, blob }; } });
  assert.equal(name, projectFileName(project, new Date(AT)));
  assert.equal(got.n, name);
  assert.equal(got.blob.type, 'application/json');
  const back = parseProjectFile(await got.blob.text());
  assert.equal(back.ok, true);
  assert.equal(back.file.project.id, 'loc_store_job');
  assert.equal(back.file.units.length, units.length);
  assert.match(JSON.stringify(back.file.project.assignments), /MAT-OAK-18/, 'the live assignments ride with the job');
  assert.deepEqual(back.file.profile, JSON.parse(JSON.stringify(getCabinetProfile())));
  assert.ok(UI().messages.some((m) => String(m.message).startsWith(`Saved to a file: ${name}`)), 'the save says where the file went');
});

// ─── REWRITTEN BY T-CC1a F6 (31.10.2026) TO THE NEW LAW ─────────────────────
// The owner, 31.10.2026, 01:06 (answer 10): *"w przyszlosci nie bedzie save to file, po co?"*: Open from file is the
// one-time IMPORT of an old job. It no longer puts the job on this computer's shelf: it is bound to the Joinery Core
// project the picker returns, born with cc_create_item (its id the server's) and saved once with cc_save_item; the
// id-collision question is asked against Joinery Core's items; the file's settings are never asked and never applied.
// The four cases below assert that road on a fake Joinery Core, case for case where the shelf road stood.
const KOWALSKI_PROJECT = { key: 'p:p9', kind: 'production', id: 'p9', number: '1234', name: 'Kowalski', client: 'Kowalski' };
function fakeJc(items = []) {
  const rpc = [];
  let n = 0;
  const from = (table) => {
    const chain = {
      select: () => chain, eq: () => chain, order: () => chain, limit: () => chain, single: () => chain,
      then: (res, rej) => Promise.resolve({ data: table === 'cc_items' ? items : [], error: null }).then(res, rej),
    };
    return chain;
  };
  return {
    rpc,
    client: {
      from,
      rpc: (name, params) => {
        rpc.push({ name, params });
        if (name === 'cc_create_item') { n += 1; return Promise.resolve({ data: { id: `srv-new-${n}`, name: params.p_name, jc_project_number: '1234' }, error: null }); }
        return Promise.resolve({ data: { id: params.p_item_id, updated_at: '2026-10-31T12:00:00Z', revision: null }, error: null });
      },
    },
  };
}
async function onJc(jc, fn) {
  const before = globalThis.supabaseClient;
  globalThis.supabaseClient = jc.client;
  try { return await fn(); } finally { if (before === undefined) delete globalThis.supabaseClient; else globalThis.supabaseClient = before; }
}

test('Open from file: a new job is imported into the picked JC project and opens, with its own assignments', async () => {
  const shelf = memoryStorage();
  const file = buildProjectFile({ project: job(), units: [], assignments: ASSIGNED, profile: getCabinetProfile(), at: AT });
  storeJob();
  useHistoryStore.getState().clear();
  S().setProjectName?.('changed');
  let asked = 0;
  let before = 0;
  const jc = fakeJc();
  const said = await onJc(jc, () => openProjectFromFile({
    picked: { name: 'k.ccproject', text: projectFileText(file) },
    storage: shelf,
    at: AT + 1,
    ask: async () => { asked += 1; return null; },
    pickProject: async () => KOWALSKI_PROJECT,
    beforeOpen: () => { before += 1; },
  }));
  assert.equal(said, 'opened');
  assert.equal(asked, 0, 'no collision: nothing to ask');
  assert.equal(before, 1, 'the word about unsaved work is spoken before the job is replaced');
  assert.deepEqual(jc.rpc.map((c) => c.name), ['cc_create_item', 'cc_save_item']);
  assert.equal(S().project.id, 'srv-new-1', 'the server\'s id');
  assert.equal(S().project.name, 'Kowalski szafa');
  assert.equal(S().project.titleBlock.company.logo.href, LOGO.href);
  assert.deepEqual(listLocalProjects(shelf), [], 'nothing on this computer\'s shelf');
  assert.equal(useMaterialAssignmentStore.getState().projectId, 'srv-new-1');
  assert.match(JSON.stringify(useMaterialAssignmentStore.getState().data), /MAT-OAK-18/, 'its own assignments opened with it');
  assert.equal(useHistoryStore.getState().past.length, 0, 'the undo stack of the last job does not reach into it');
  assert.equal(UI().screen, 'editor');
});

test('Open from file: a job that is already a JC item asks first; Cancel (or no window) replaces nothing', async () => {
  const file = buildProjectFile({ project: job({ id: 'srv-kowalski' }), units: UNITS, profile: getCabinetProfile(), at: AT });
  storeJob();
  const picked = { name: 'k.ccproject', text: projectFileText(file) };
  const jc = fakeJc([{ id: 'srv-kowalski', name: 'Kowalski in Joinery Core', updated_at: '2026-10-30T10:00:00Z', jc_project_id: 'p9', jc_project_number: '1234' }]);
  let seen = null;
  assert.equal(await onJc(jc, () => openProjectFromFile({ picked, ask: async (q) => { seen = q; return null; } })), 'cancelled');
  assert.equal(seen.questions.collision.id, 'srv-kowalski', 'the window is told which item');
  assert.equal(seen.questions.profile, null, 'the settings are never asked');
  assert.equal(await onJc(jc, () => openProjectFromFile({ picked })), 'cancelled', 'no window to ask in is a Cancel');
  assert.deepEqual(jc.rpc, [], 'nothing written to Joinery Core');
  assert.equal(S().project.id, 'loc_store_job', 'the job on the screen is as it was');
});

test('Open from file: Replace saves the file into that item; Keep both makes a new item beside it', async () => {
  const file = buildProjectFile({ project: job({ id: 'srv-kowalski' }), units: UNITS, profile: getCabinetProfile(), at: AT });
  const picked = { name: 'k.ccproject', text: projectFileText(file) };
  const items = [{ id: 'srv-kowalski', name: 'Kowalski szafa', updated_at: '2026-10-30T10:00:00Z', jc_project_id: 'p9', jc_project_number: '1234' }];
  const replace = fakeJc(items);
  assert.equal(await onJc(replace, () => openProjectFromFile({ picked, ask: async () => ({ mode: 'replace', takeProfile: false }) })), 'opened');
  assert.deepEqual(replace.rpc.map((c) => [c.name, c.params.p_item_id]), [['cc_save_item', 'srv-kowalski']], 'one save, into the item');
  assert.equal(S().units.length, 1);
  const copy = fakeJc(items);
  assert.equal(await onJc(copy, () => openProjectFromFile({
    picked, at: AT + 5, ask: async () => ({ mode: 'copy', takeProfile: false }), pickProject: async () => KOWALSKI_PROJECT,
  })), 'opened');
  assert.deepEqual(copy.rpc.map((c) => c.name), ['cc_create_item', 'cc_save_item'], 'a new item, saved once');
  assert.equal(S().project.id, 'srv-new-1', 'the copy is the job on the screen');
});

test('Open from file: other workshop settings are never asked and never applied (the read-only words)', async () => {
  const theirs = JSON.parse(JSON.stringify(getCabinetProfile()));
  theirs.carcass.shelfSetbackMm = 20;
  const file = buildProjectFile({ project: job({ id: 'loc_settings' }), units: [], profile: theirs, at: AT });
  const picked = { name: 's.ccproject', text: projectFileText(file) };
  let told = null;
  try {
    assert.equal(await onJc(fakeJc(), () => openProjectFromFile({
      picked, ask: async () => { throw new Error('nothing to ask'); }, pickProject: async (o) => { told = o; return KOWALSKI_PROJECT; },
    })), 'opened');
    assert.equal(told.profileNote, true, 'the picker is told, to say it in words');
    assert.notEqual(getCabinetProfile().carcass.shelfSetbackMm, 20, 'this computer\'s stand');
    assert.notEqual(useCabinetProfileStore.getState().profile.carcass.shelfSetbackMm, 20);
  } finally {
    useCabinetProfileStore.getState().resetProfile();
  }
});

test('Open from file: a file that is not one is refused in words; nothing opens', async () => {
  const shelf = memoryStorage();
  storeJob();
  const said = await openProjectFromFile({ picked: { name: 'notes.txt', text: 'hello' }, storage: shelf, ask: async () => null });
  assert.equal(said, 'refused');
  assert.equal(S().project.id, 'loc_store_job');
  assert.equal(listLocalProjects(shelf).length, 0);
  const last = UI().messages[UI().messages.length - 1];
  assert.match(JSON.stringify(last), /notes\.txt: That file is not a Cabinet Core project/);
  assert.equal(await openProjectFromFile({ picked: null, storage: shelf }), 'cancelled', 'a picker closed with nothing chosen');
});

// ═══ THE DOORS, IN THE SOURCE ════════════════════════════════════════════════

test('File carries Open from file... after Open... and Save to file... after Save as..., wired to the roads', () => {
  const top = read('src/components/TopBar.jsx');
  const file = top.slice(top.indexOf("label: 'File'"), top.indexOf("label: 'View'"));
  const labels = [...file.matchAll(/label: '([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(labels, ['File', 'New project…', 'Open…', 'Open from file…', 'Save', 'Save as…', 'Save to file…', 'Close project']);
  assert.match(file, /label: 'Open from file…', hint: '[^']+', run: \(e\) => openFromFile\(anchorOfEvent\(e\)\)/);
  assert.match(file, /label: 'Save to file…', hint: '[^']+', run: saveToFile/);
  assert.match(top, /const saveToFile = \(\) => \{ saveProjectToFile\(\); \};/);
  assert.match(top, /ask: askProjectFile,/);
  // AMENDED BY T-CC1a F6: and the picker of the Joinery Core project the import binds to.
  assert.match(top, /pickProject: askJcProject,/);
  assert.match(top, /warnIfUnsaved\(\{ dirty: now\.dirty, units: now\.units \}\)/, 'the word about unsaved work, as File > Open says it');
  assert.match(top, /import \{ openProjectFromFile, saveProjectToFile \} from '\.\.\/lib\/projectFileRoad\.js';/);
});

test('the start screen\'s Open panel carries Open from file..., the same road', () => {
  const start = read('src/components/StartScreen.jsx');
  // AMENDED BY T-CC1a F4 (31.10.2026): the shelf's Open panel (All projects, Recent) is gone with the shelf list; Open
  // from file stands alone in the Import panel, the one road in for an old job. *"w przyszlosci nie bedzie save to
  // file, po co?"* (the owner, 31.10.2026, 01:06).
  const panel = start.slice(start.indexOf('>Import</h2>'), start.indexOf('</section>', start.indexOf('>Import</h2>')));
  assert.match(panel, /data-open-from-file="1"/);
  assert.match(panel, /onClick=\{onOpenFile\}/);
  assert.match(panel, /Open from file…/);
  // AMENDED BY T-CC1a F6: the import road, the picker bound to the list the screen already holds.
  assert.match(start, /await openProjectFromFile\(\{\s*picked, anchor, storage, ask: askProjectFile, pickProject, list: known,\s*\}\);/);
});

test('the questions are a shell window, named in the registry, its buttons as the mockup drew them', () => {
  const win = read('src/components/ProjectFileModal.jsx');
  assert.match(win, /import Modal from '\.\/Modal\.jsx';/);
  assert.equal((win.match(/<Modal\b[\s\S]{0,80}?name="project-file"/g) || []).length, 2, 'both questions in the shell');
  assert.deepEqual(MODAL_KINDS['project-file'], { about: 'project', label: 'Open from file' });
  for (const [choice, words] of [
    ['replace', 'Replace with the file'], ['copy', 'Keep both (open as a copy)'], ['cancel', 'Cancel'],
    ['file-settings', 'Use the file&apos;s settings'], ['keep-settings', 'Keep this computer&apos;s'],
  ]) {
    const at = win.indexOf(`data-project-file-choice="${choice}"`);
    assert.ok(at > 0, choice);
    assert.ok(win.slice(at, at + 260).includes(words), `${choice}: ${words}`);
  }
  assert.match(win, /className="cc-btn-gold" data-project-file-choice="replace"/, 'Replace is the gold one');
  assert.match(win, /className="cc-btn-gold"\s+data-project-file-choice="file-settings"/, 'Use the file\'s settings is the gold one');
});

test('nothing new carries an em or en dash', () => {
  for (const rel of ['src/lib/projectFile.js', 'src/lib/projectFileRoad.js', 'src/components/ProjectFileModal.jsx',
    'test/chatfix-2810-project-file.test.js', 'scripts/t78-classify.d/f48-owner-2810-project-file.mjs']) {
    const text = read(rel);
    assert.ok(!text.includes(EM) && !text.includes(EN), rel);
  }
});
