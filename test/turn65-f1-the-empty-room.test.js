// ─── TURN 65 · F1 — THE ROOM STARTS EMPTY ───────────────────────────────────
//
// CLAUDE.md F1, the owner's own two sentences: *"usuń szafę default"* and
// *"ściana 4000 mm, ale bez szaf"*. And CLAUDE.md, TESTS AND PROOF, 5: *"an
// empty room mounts and every screen survives it; the first wardrobe is
// `min(wall,1200)`."*
//
// Every assertion runs the store and the adapter — the same code the room
// runs — and reads a screen as TEXT only where the thing asserted IS a screen.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { setPersistence } from '../src/stores/persistence.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import { parseDecorCatalogue, setDecorCatalogue } from '../src/engine/decors.js';
import * as A from '../src/retail/design/adapter.js';
import { REASONS } from '../src/retail/design/reasons.js';

setPersistence('none');
const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const S = () => useProjectStore.getState();
const U = () => useUiStore.getState();

setDecorCatalogue(parseDecorCatalogue(
  JSON.parse(read('public/decors/egger/egger-decors.json')), { basePath: '/decors/egger/' },
));

// ═══ 1 · THE ROOM MOUNTS EMPTY ══════════════════════════════════════════════

test('F1 · startDesign places NOTHING — the room has its wall and its ceiling and no furniture', () => {
  U().clearSelection();
  const id = A.startDesign('Bedroom wardrobe');
  assert.equal(id, null, 'startDesign still answered with a unit id');
  assert.equal(S().units.length, 0, 'a wardrobe was placed by the app');
  // …and it is still a WARDROBE project, on ONE wall, 4000 mm of it.
  assert.equal(A.projectTypeOf(S().project), 'wardrobe');
  assert.equal(S().project.design.scope, 'wall');
  assert.equal(Math.round(A.wallLengthMm(S().project.room, 0)), 4000);
});

test('F1 · the empty room is a STATE, not an error — the readers answer, they do not throw', () => {
  A.startDesign('Bedroom wardrobe');
  assert.equal(A.designUnit(S().units), null);
  // The three the steps call on every render.
  assert.doesNotThrow(() => A.interiorCounts(null));
  assert.doesNotThrow(() => A.lightingOn(S().project));
  assert.doesNotThrow(() => A.insideColourOf(S().project));
  // …and the lazy answers are the PROJECT's, so they are written on an empty
  // floor and the first wardrobe is born wearing them.
  A.applyLazyDefaults(null);
  // T66 F5 · the fronts are SPRAYED now (RAL 3005) rather than faced in a
  // decor, so what is asserted is that the ANSWER was written on an empty
  // floor — which is the law here — not which answer it was.
  assert.ok(A.frontColourOf(S().project), 'the lazy client lost his colour with the wardrobe');
  assert.ok(A.carcassDecorOf(S().project), 'the lazy client lost his carcass board');
  assert.equal(S().project.design.fronts.style, 'S');
});

// ═══ 2 · THE FIRST WARDROBE IS THE CLIENT'S OWN ACT ═════════════════════════

test('F1 · the first wardrobe is min(wall, 1200) — 1200 on a 4000 wall', () => {
  A.startDesign('Bedroom wardrobe');
  const id = A.addFirstWardrobe();
  assert.ok(id, 'ADD A WARDROBE placed nothing');
  assert.equal(S().units.length, 1);
  assert.equal(Math.round(S().units[0].params.width), 1200);
  assert.equal(A.RETAIL_FIRST_WIDTH_MAX, 1200);
});

test('F1 · …and 900 on a 900 wall — the wall wins when the wall is narrower', () => {
  A.startDesign('Bedroom wardrobe');
  A.setSpace({ wallMm: 900 });
  const id = A.addFirstWardrobe();
  assert.ok(id, 'a 900 wall refused a wardrobe');
  assert.equal(Math.round(S().units[0].params.width), 900, 'the wardrobe did not take the wall');
});

test('F1 · ONE store path adds it — the plus on the floor and the step\'s button call the same name', () => {
  // The plus (`DesignRoom` → `Stage` → `Scene onAddFirst`) and ADD A WARDROBE
  // in WHERE (`Options`) both name `addFirstWardrobe`, and nothing else in
  // retail adds a WARDROBE of its own.
  const room = code('src/retail/design/DesignRoom.jsx');
  const options = code('src/retail/design/Options.jsx');
  assert.ok(/onAddFirst=\{\(\) => .*addFirstWardrobe\(\)/.test(room), 'the floor plus does not call the one path');
  assert.ok(/addFirstWardrobe\(\)/.test(options), 'the WHERE button does not call the one path');
  const others = [...room.matchAll(/addUnit\(\s*'WARDROBE'/g)].length
    + [...options.matchAll(/addUnit\(\s*'WARDROBE'/g)].length;
  assert.equal(others, 0, 'a second way into the store adds a wardrobe');
});

// ═══ 3 · THE LICENSED REMOVAL ══════════════════════════════════════════════

test('F1 · `fitWardrobeToWall` is gone — the 3920 carcass with two 1960 leaves cannot come back', () => {
  assert.equal(A.fitWardrobeToWall, undefined, 'the adapter still exports it');
  for (const f of ['src/retail/design/adapter.js', 'src/retail/design/Options.jsx', 'src/retail/design/DesignRoom.jsx']) {
    assert.ok(!/\bA?\.?fitWardrobeToWall\s*\(/.test(code(f)), `${f} still calls it`);
  }
});

test('F1 · the WARDROBE golden cannot move — the 1200 is retail\'s, the profile keeps its 600', async () => {
  // The reason `RETAIL_FIRST_WIDTH_MAX` is not `profile.wardrobe.defaults.width`:
  // `defaultParamsFor` reads that key, and the WARDROBE golden is built from it.
  const { DEFAULT_CABINET_PROFILE: P } = await import('../src/engine/profile.js');
  assert.equal(P.wardrobe.defaults.width, 600, 'the profile default moved — the WARDROBE golden moved with it');
  assert.notEqual(P.wardrobe.defaults.width, A.RETAIL_FIRST_WIDTH_MAX);
});

// ═══ 4 · EVERY SCREEN SURVIVES IT ══════════════════════════════════════════

test('F1 · the steps after WHERE stay reachable and say plainly that they need a wardrobe', () => {
  const options = read('src/retail/design/Options.jsx');
  assert.ok(/function NeedsAWardrobe\(/.test(options), 'no empty state for the steps');
  // INSIDE and EXTRAS are the two that read the unit; both choose the empty
  // state rather than dereferencing it.
  assert.ok(/if \(!unit\) \{\s*return <NeedsAWardrobe title="INSIDE"/.test(options), 'INSIDE has no empty state');
  assert.ok(/if \(!unit\) \{\s*return <NeedsAWardrobe title="EXTRAS"/.test(options), 'EXTRAS has no empty state');
  // …and the empty state offers the same one store path, so it is not a dead end.
  assert.ok(/NeedsAWardrobe[\s\S]{0,900}addFirstWardrobe\(\)/.test(options), 'the empty state cannot add a wardrobe');
});

test('F1 · the last wardrobe may go — the refusal died with its reason', () => {
  A.startDesign('Bedroom wardrobe');
  const id = A.addFirstWardrobe();
  assert.equal(A.removeUnitRefusal(id), '', 'the last wardrobe is still refused');
  assert.equal(REASONS.lastWardrobe, undefined, 'the sentence outlived the refusal');
  S().removeUnit(id);
  assert.equal(S().units.length, 0, 'the client cannot get back to the room he started in');
});

// ═══ 5 · THE PLUS ON THE EMPTY FLOOR, AND PRO'S SILENCE ════════════════════

test('F1 · the empty floor\'s plus is ADDITIVE — PRO passes none and draws none', () => {
  const scene = read('src/3d/Scene.jsx');
  assert.ok(/function FirstPlus\(/.test(scene), 'no plus for the empty floor');
  // The default is PRO's behaviour, as `onAddPlus` and `onAddInside` are.
  assert.ok(/onAddFirst = null/.test(scene), 'the prop is not additive');
  assert.ok(/onAddFirst && units\.length === 0/.test(scene), 'the plus is not gated on an EMPTY room');
  // PRO never passes it: no file under PRO's frozen tree names it.
  for (const f of ['src/App.jsx', 'src/main.jsx']) {
    assert.ok(!/onAddFirst/.test(read(f)), `${f} passes onAddFirst`);
  }
});
