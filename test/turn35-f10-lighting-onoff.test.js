// ─── Turn 35, CLAUDE.md F10: LIGHTING ON/OFF — two big buttons, one state ───
//
// The owner crossed BOTH lighting checkboxes off a screenshot and approved the
// mockup: *"te 2 funkcje usuń i na to miejsce dodaj duże zielony i czerwony
// przycisk ON i OFF — internal lights"*. So "Lighting in this project"
// (`design.lighting.enabled`, persisted) and "Turn on the light"
// (`uiStore.lightDemo`, session-only) are gone, and the two flags they wrote
// are ONE: `design.lighting.on` — persisted, because it is the project's
// answer now and not a way of looking at it.
//
// Four things have to be true together:
//   · the state maps — ON is lit AND shining, OFF is dark, one key says both;
//   · a saved job crosses over, and the mapping's trap does not eat it: NO
//     stored project has ever carried `demo`, so a literal `enabled && demo`
//     would turn OFF every project the owner ever lit;
//   · the 3D reads ONE flag — the project's — and the session lens shadows it
//     rather than holding a second opinion;
//   · the two checkboxes are GONE from the panel and the two buttons stand in
//     their place, green and red, in the house's own status colours.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateDesign } from '../src/engine/design.js';
import {
  demoDimFactor, lightingBomLines, resolveLighting, stripsForUnit,
} from '../src/engine/ledStrips.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();
const src = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

function project(design = {}) {
  store().loadProject({
    id: null,
    name: 't35-f10',
    room: migrateRoom({ height: 2600, corners: rectCorners(6000, 3000) }),
    design,
  }, []);
}

/** A wardrobe with one shelf and one strip under it — the owner's own flow. */
function wardrobeWithStrip() {
  project({ projectType: 'wardrobe' });
  const { id } = store().addUnit('WARDROBE');
  store().updateUnitParams(id, { width: 1000 });
  store().addShelves(id, 1);
  const unit = store().units.find((u) => u.id === id);
  const result = store().unitResult(id);
  const shelf = result.panels.find((p) => p.part === 'SHELF' && p.role === 'shelf');
  return { unit, result, shelf };
}

// ─── the state, mapped ──────────────────────────────────────────────────────

test('ONE key answers both old questions: `on`, and no `enabled` beside it', () => {
  const d = migrateDesign({});
  assert.deepEqual(Object.keys(d.lighting).sort(), ['items', 'on', 'switch', 'temperature']);
  assert.equal(d.lighting.on, false, 'a project that has said nothing is OFF');
  assert.equal('enabled' in d.lighting, false, 'two flags merging into one leaves ONE key');
});

test('ON is lit AND shining; OFF is dark — the same flag says both', () => {
  const { unit, result, shelf } = wardrobeWithStrip();
  const items = [{ id: 'led1', unitId: unit.id, kind: 'shelf', ref: shelf.id }];

  const on = migrateDesign({ projectType: 'wardrobe', lighting: { on: true, items } });
  assert.equal(resolveLighting(on, P).on, true);
  assert.equal(stripsForUnit({
    unit, result, design: on, profile: P,
  }).length, 1, 'ON draws the strip');
  assert.ok(lightingBomLines({ entries: [{ unit, result }], design: on, profile: P }).length,
    'ON prints the yellow LED lines');
  assert.equal(demoDimFactor(resolveLighting(on, P).on, P), P.lighting.demo.dimFactor,
    'ON dims the room to the profile’s demo level — the T33-F2 factor, unchanged');

  const off = migrateDesign({ projectType: 'wardrobe', lighting: { on: false, items } });
  assert.equal(resolveLighting(off, P).on, false);
  assert.equal(stripsForUnit({
    unit, result, design: off, profile: P,
  }).length, 0, 'OFF draws nothing');
  assert.deepEqual(lightingBomLines({ entries: [{ unit, result }], design: off, profile: P }), [],
    'OFF prints nothing — a light the owner switched off is not a line on his quote');
  assert.equal(demoDimFactor(resolveLighting(off, P).on, P), 1, 'OFF leaves the room exactly as it was');
});

test('OFF keeps every placed strip — the switch is a switch, not a delete', () => {
  const { unit, shelf } = wardrobeWithStrip();
  store().setLighting({ on: true });
  store().addLightingItem({ unitId: unit.id, kind: 'shelf', ref: shelf.id });
  store().setLighting({ on: false });
  const d = migrateDesign(store().project.design);
  assert.equal(d.lighting.on, false);
  assert.equal(d.lighting.items.length, 1, 'the placed run survives the OFF press');
  store().setLighting({ on: true });
  assert.equal(migrateDesign(store().project.design).lighting.items.length, 1);
});

test('the two controls write ONE state — the panel’s buttons and the View item', () => {
  project({});
  store().setLighting({ on: true });                     // the panel's ON button
  assert.equal(migrateDesign(store().project.design).lighting.on, true);
  const lightOn = migrateDesign(store().project.design).lighting.on;
  store().setLighting({ on: !lightOn });                 // the View menu's twin
  assert.equal(migrateDesign(store().project.design).lighting.on, false);
});

// ─── the legacy migration, and the trap in it ───────────────────────────────

test('a project the owner LIT before tonight opens lit — the absent `demo` is DON’T-CARE', () => {
  // THE TRAP: CLAUDE.md maps a saved project as "enabled AND demo → ON", and
  // taken literally against stored data that is `true && undefined` — false —
  // which would turn OFF every project he ever enabled, because `lightDemo`
  // was session state and NO payload has ever carried it.
  assert.equal(migrateDesign({ lighting: { enabled: true } }).lighting.on, true);
  assert.equal(
    migrateDesign({ lighting: { enabled: true, items: [] } }).lighting.on,
    true,
    'a lit project with no runs placed is still lit',
  );
});

test('a project he never lit opens dark, and an explicit `demo: false` is honoured', () => {
  assert.equal(migrateDesign({ lighting: { enabled: false } }).lighting.on, false);
  assert.equal(migrateDesign({ lighting: {} }).lighting.on, false);
  assert.equal(migrateDesign({}).lighting.on, false);
  // Where the data DOES carry the demo flag, the spec's mapping applies to the
  // letter: enabled AND demo → ON, anything else → OFF.
  assert.equal(migrateDesign({ lighting: { enabled: true, demo: false } }).lighting.on, false);
  assert.equal(migrateDesign({ lighting: { enabled: true, demo: true } }).lighting.on, true);
  assert.equal(migrateDesign({ lighting: { enabled: false, demo: true } }).lighting.on, false);
});

test('`on` wins outright, and the migration is IDEMPOTENT', () => {
  // A stored boolean answers for itself — otherwise `setLighting({ on: false })`
  // on a legacy project would be overruled by the `enabled` beside it and the
  // light could never be switched off again (the T34-F2 inset lesson).
  assert.equal(migrateDesign({ lighting: { on: false, enabled: true } }).lighting.on, false);
  assert.equal(migrateDesign({ lighting: { on: true, enabled: false } }).lighting.on, true);
  for (const raw of [{}, { lighting: { enabled: true } }, { lighting: { on: true } }]) {
    const once = migrateDesign(raw);
    assert.deepEqual(migrateDesign(once).lighting, once.lighting, 'a second pass moves nothing');
  }
});

test('loadProject carries a pre-T35 job across — every path migrates, not just one', () => {
  // migrateLighting sits in migrateDesign, which loadProject, the localStorage
  // rehydration and newProject all run: one normalisation, every door.
  project({ lighting: { enabled: true, temperature: 3000, switch: 'door' } });
  const d = migrateDesign(store().project.design);
  assert.equal(d.lighting.on, true, 'the light he left on is still on');
  assert.equal(d.lighting.temperature, 3000, 'and nothing else about it moved');
  assert.equal(d.lighting.switch, 'door');
  assert.equal(store().project.design.lighting.on, true, 'loadProject stores the migrated shape');
});

// ─── the 3D reads ONE flag ──────────────────────────────────────────────────

test('the 3D reads the PROJECT’s flag — no second opinion in the scene', () => {
  const strips = src('../src/3d/LedStrips.jsx');
  assert.match(strips, /resolveLighting\(design, profile\)\.on/,
    'the strips take the switch off the design they are handed');
  assert.equal(/s\.lightDemo/.test(strips), false,
    'and no longer off a session flag that could disagree with it');

  const scene = src('../src/3d/Scene.jsx');
  assert.match(scene, /demoDimFactor\(lightOn, profile\)/,
    'the room dims on the same one flag');
  assert.match(scene, /resolveLighting\(design, profile\)\.on/);
  assert.match(scene, /setLightDemo\(lightOn\)/,
    'and the session lens is written FROM it — a shadow, never a source');
});

test('the session lens is not deleted — it toggles, and it shadows the project', () => {
  const ui = useUiStore.getState();
  assert.equal(typeof ui.setLightDemo, 'function');
  assert.equal(typeof ui.toggleLightDemo, 'function');
  ui.setLightDemo(true);
  assert.equal(useUiStore.getState().lightDemo, true);
  ui.setLightDemo(false);
  assert.equal(useUiStore.getState().lightDemo, false);
  assert.match(src('../src/stores/uiStore.js'), /THE LENS BECOMES A SHADOW/,
    'and the store says in its own words what it is now');
});

// ─── the panel: two checkboxes out, two buttons in ──────────────────────────

test('BOTH checkboxes are gone from the Lighting panel', () => {
  const panel = src('../src/components/LightingPanel.jsx');
  assert.equal(/type="checkbox"[\s\S]{0,120}data-lighting-enabled/.test(panel), false,
    '"Lighting in this project" is not a checkbox any more');
  assert.equal(/data-lighting-demo/.test(panel), false,
    '"Turn on the light" left the panel with its flag');
  // The label is gone from the SCREEN; the comment that records what stood
  // here is history and stays (nothing is deleted quietly in this house).
  assert.equal(/>Lighting in this project</.test(panel), false);
  assert.equal(/lighting\.enabled/.test(panel.replace(/^\s*(\/\/|\*|\/\*).*$/gm, '')), false,
    'and no CODE reads the old flag');
});

test('the two big buttons stand there instead — green ON, red OFF', () => {
  const panel = src('../src/components/LightingPanel.jsx');
  assert.match(panel, /data-lighting-on/);
  assert.match(panel, /data-lighting-off/);
  assert.match(panel, />\s*ON\s*</);
  assert.match(panel, />\s*OFF\s*</);
  // The colours are the house's status pair (tailwind.config.js: ok #5f9e6e,
  // danger #c9524b) — the green and the red he drew, never a raw hex here.
  assert.match(panel, /bg-status-ok/);
  assert.match(panel, /bg-status-danger/);
  // Large: they replace two 13 px checkbox rows, so they carry a real height
  // and the panel's biggest type.
  assert.match(panel, /h-11 rounded border text-base font-semibold/);
  // Both write the ONE state, and the body below still stands behind it.
  assert.match(panel, /onClick=\{\(\) => setLighting\(\{ on: true \}\)\}/);
  assert.match(panel, /onClick=\{\(\) => setLighting\(\{ on: false \}\)\}/);
  assert.match(panel, /\{lighting\.on && \(/);
});

test('everything BELOW the buttons is untouched — his one sentence about it', () => {
  const panel = src('../src/components/LightingPanel.jsx');
  for (const kept of [
    'Colour temperature', 'Switching', 'Place a light',
    'data-lighting-temp', 'data-lighting-switch', 'data-lighting-add-shelf',
    'data-lighting-inset-all',            // the T34 master slider stays (rule 4)
    'data-lighting-inset={it.id}',
  ]) {
    assert.ok(panel.includes(kept), `${kept} still stands`);
  }
});

test('the View menu’s twin control writes the project’s state, not a lens', () => {
  const top = src('../src/components/TopBar.jsx');
  assert.match(top, /label: 'Turn on the light'/, 'the owner’s words stay on the item');
  assert.match(top, /checked: lightOn/);
  assert.match(top, /run: \(\) => setLighting\(\{ on: !lightOn \}\)/);
  assert.match(top, /migrateDesign\(storedDesign\)\.lighting\.on/,
    'and it reads a pre-T35 project the same way everything else does');
});
