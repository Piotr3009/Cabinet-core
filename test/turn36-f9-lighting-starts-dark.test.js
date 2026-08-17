import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { useProjectStore } from '../src/stores/projectStore.js';
import { DEFAULT_DESIGN, migrateDesign } from '../src/engine/design.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { resolveLighting } from '../src/engine/ledStrips.js';

// ─── TURN 36 (CLAUDE.md F9): A NEW PROJECT STARTS DARK ──────────────────────
//
// The owner: *"default teraz jest lights on — powinno być odwrotnie: OFF
// default, a ON na życzenie klienta."* "New projects start with the F10 switch
// OFF; the legacy load mapping from T35-F10 stands unchanged (an old project
// that was shining stays ON)."
//
// ─── WHAT THE AUDIT FOUND, AND WHY THIS FILE IS MOSTLY ASSERTIONS ──────────
//
// The F10 switch is `design.lighting.on`, and it was ALREADY false — T33
// shipped it off ("Off until somebody turns it on") and T35-F10 kept it off
// when the two flags became one. `newProject` passes `design: null`, so a new
// job reads `DEFAULT_DESIGN`, and `prefillDesignFromCompany` — the one thing
// that edits a new design on the way in — never touches lighting. Nothing in
// `src/` writes `{ on: true }` except the ON button and the View-menu toggle,
// which are the client's own hand.
//
// So this turn's work on F9 is to PIN it, at the level the owner asked about
// (a new project, through the store, not through a migrator) — because the
// gap that let the question be asked at all is that NO TEST exercised
// `newProject()` → `lighting.on`. The one lighting flag in the app that IS on
// by default is `uiStore.realisticLighting`, and it is a VIEW setting about
// how the room is rendered, not the project's internal LEDs; it is named here
// so the next reader does not have to find that out twice.

const lightingOfStore = () => migrateDesign(useProjectStore.getState().project.design).lighting;

test('F9 — a NEW PROJECT starts dark, through the store the flow actually calls', () => {
  useProjectStore.getState().newProject('T36 job', { number: '36', client: 'the owner' });
  const lighting = lightingOfStore();
  assert.equal(lighting.on, false, 'the F10 switch is OFF on a new job');
  assert.deepEqual(lighting.items, [], '…and there is nothing placed to shine');
  // …and the app's own reader agrees, which is what gates the strips and the
  // BOM lines (`engine/ledStrips.js`: `if (!lighting.on) return []`).
  assert.equal(resolveLighting(useProjectStore.getState().project.design, P).on, false);
});

test('F9 — it is dark whatever the job is called or who it is for', () => {
  for (const args of [
    ['Untitled project', {}],
    ['Hampstead', { number: '99', client: 'somebody' }],
    ['A room', { room: { height: 2600, corners: [{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 3000 }, { x: 0, y: 3000 }] } }],
  ]) {
    useProjectStore.getState().newProject(args[0], args[1]);
    assert.equal(lightingOfStore().on, false, args[0]);
  }
});

test('F9 — the DEFAULT itself is off, and carries no second flag beside it', () => {
  assert.equal(DEFAULT_DESIGN.lighting.on, false);
  assert.equal('enabled' in DEFAULT_DESIGN.lighting, false, 'two flags merging into one leaves ONE key');
  assert.equal(migrateDesign({}).lighting.on, false);
  assert.equal(migrateDesign(null).lighting.on, false);
});

test('F9 — the T35-F10 LEGACY MAPPING is untouched: a job that was shining stays ON', () => {
  // The whole point of the spec's second sentence. These are T35's own cases,
  // re-asserted here so a change to the default cannot quietly take an old
  // project's light away.
  assert.equal(migrateDesign({ lighting: { enabled: true } }).lighting.on, true);
  assert.equal(migrateDesign({ lighting: { enabled: true, demo: true } }).lighting.on, true);
  assert.equal(migrateDesign({ lighting: { enabled: true, demo: false } }).lighting.on, false);
  assert.equal(migrateDesign({ lighting: { enabled: false } }).lighting.on, false);
  // A stored `on` wins outright, either way — the migration is idempotent.
  assert.equal(migrateDesign({ lighting: { on: true, enabled: false } }).lighting.on, true);
  assert.equal(migrateDesign({ lighting: { on: false, enabled: true } }).lighting.on, false);
  const once = migrateDesign({ lighting: { enabled: true } });
  assert.deepEqual(migrateDesign(once).lighting, once.lighting);
});

test('F9 — nothing in the app turns a project ON except a hand on a switch', () => {
  const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
  // The two doors, and they are both somebody pressing something.
  assert.match(src('components/LightingPanel.jsx'), /onClick=\{\(\) => setLighting\(\{ on: true \}\)\}/);
  assert.match(src('components/TopBar.jsx'), /setLighting\(\{ on: !lightOn \}\)/);
  // The creation path does not.
  assert.doesNotMatch(src('engine/companyDefaults.js'), /lighting/);
  const store = src('stores/projectStore.js');
  const at = store.indexOf('newProject: (name');
  const body = store.slice(at, store.indexOf('\n  loadProject', at) > at ? store.indexOf('\n  loadProject', at) : at + 2000);
  assert.doesNotMatch(body, /lighting/, 'newProject says nothing about the light');
});

test('F9 — the flag that IS on by default is the VIEW\'s, not the project\'s', () => {
  // Named so the next reader does not have to find it out twice: "Realistic
  // lighting" is how the ROOM is rendered — a remembered view preference —
  // and it is not the F10 switch the owner was talking about. The project's
  // own LEDs are what `design.lighting.on` gates, and they start dark.
  const ui = readFileSync(new URL('../src/stores/uiStore.js', import.meta.url), 'utf8');
  assert.match(ui, /realisticLighting: true,/);
  assert.match(ui, /lightDemo: false,/, 'the scene shadow of the project switch starts dark too');
});
