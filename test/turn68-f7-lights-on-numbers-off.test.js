// ─── TURN 68 · F7 — LIGHTS ON, NUMBERS OFF ─────────────────────────────────
//
// The owner: *"jak włączasz światła, to niech znikają wymiary; wyłączysz
// lights, to wracają."*
//
// Both halves, and the second is the one that is easy to get wrong: OFF
// RESTORES THE FLAGS EXACTLY AS THEY WERE. Remember, do not reset.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import * as A from '../src/retail/design/adapter.js';
import {
  applyLightsDimLaw, rememberedDimFlags, unwatchLightsAndDimensions, watchLightsAndDimensions,
} from '../src/retail/design/dimmer.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import decorPack from '../public/decors/egger/egger-decors.json' with { type: 'json' };
import { parseDecorCatalogue, setDecorCatalogue } from '../src/engine/decors.js';

setDecorCatalogue(parseDecorCatalogue(decorPack, { basePath: '/decors/egger/' }));

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const U = () => useUiStore.getState();

const flags = () => ({
  showDimensions: Boolean(U().showDimensions),
  showFrontDimensions: Boolean(U().showFrontDimensions),
});

function room() {
  U().clearSelection();
  A.startDesign('T68 F7');
  const id = A.addFirstWardrobe();
  A.setLighting(false);
  unwatchLightsAndDimensions();
  return id;
}

test('F7 · the light going on takes the figures off; going off puts them back', () => {
  room();
  U().setShowDimensions(true);
  U().setShowFrontDimensions(true);
  watchLightsAndDimensions();
  try {
    assert.deepEqual(flags(), { showDimensions: true, showFrontDimensions: true });

    A.setLighting(true);
    assert.deepEqual(flags(), { showDimensions: false, showFrontDimensions: false },
      'a lit scene still has numbers written across it');

    A.setLighting(false);
    assert.deepEqual(flags(), { showDimensions: true, showFrontDimensions: true },
      'the numbers did not come back');
  } finally {
    unwatchLightsAndDimensions();
  }
});

test('F7 · it REMEMBERS rather than resets — a flag that was off stays off', () => {
  room();
  // The client had the FRONT dimensions hidden and the project ones showing.
  U().setShowDimensions(true);
  U().setShowFrontDimensions(false);
  watchLightsAndDimensions();
  try {
    A.setLighting(true);
    assert.deepEqual(flags(), { showDimensions: false, showFrontDimensions: false });
    A.setLighting(false);
    assert.deepEqual(flags(), { showDimensions: true, showFrontDimensions: false },
      'turning the light off switched on a figure the client had hidden');
  } finally {
    unwatchLightsAndDimensions();
  }
});

test('F7 · the light going on TWICE does not remember the darkness', () => {
  room();
  U().setShowDimensions(true);
  U().setShowFrontDimensions(true);
  watchLightsAndDimensions();
  try {
    assert.equal(applyLightsDimLaw(true), 'darkened');
    // A second ON is not a transition. If it remembered again it would
    // remember `false` for both, and the figures would never come back.
    assert.equal(applyLightsDimLaw(true), 'nothing');
    assert.deepEqual(rememberedDimFlags(), { showDimensions: true, showFrontDimensions: true });
    assert.equal(applyLightsDimLaw(false), 'restored');
    assert.deepEqual(flags(), { showDimensions: true, showFrontDimensions: true });
    // …and an OFF with nothing owed does nothing at all.
    assert.equal(applyLightsDimLaw(false), 'nothing');
  } finally {
    unwatchLightsAndDimensions();
  }
});

test('F7 · a page that mounts already lit comes up with no numbers', () => {
  room();
  U().setShowDimensions(true);
  A.setLighting(true);              // …before the watcher is started
  watchLightsAndDimensions();
  try {
    assert.equal(flags().showDimensions, false, 'a saved lit design opened with figures on it');
    A.setLighting(false);
    assert.equal(flags().showDimensions, true);
  } finally {
    unwatchLightsAndDimensions();
  }
});

test('F7 · every door to the light goes through the law, because it watches the FLAG', () => {
  // The copied `LightingPanel` writes `useProjectStore.setLighting({ on })` —
  // PRO's own call, in a file that may not be edited — so a line in the button
  // would have been a law with a hole in it.
  const panel = code('src/retail/design/lighting/LightingPanel.jsx');
  assert.match(panel, /setLighting\(\{ on: true \}\)/, 'the copied panel stopped writing the flag');
  assert.match(panel, /setLighting\(\{ on: false \}\)/);

  room();
  U().setShowDimensions(true);
  watchLightsAndDimensions();
  try {
    // The PANEL's own door, pressed exactly as the panel presses it.
    useProjectStore.getState().setLighting({ on: true });
    assert.equal(flags().showDimensions, false, 'the panel\'s own ON missed the law');
    useProjectStore.getState().setLighting({ on: false });
    assert.equal(flags().showDimensions, true, 'the panel\'s own OFF missed the law');
  } finally {
    unwatchLightsAndDimensions();
  }
});

test('F7 · the VIEW BAR button stays honest — it draws the flag itself', () => {
  // *"The view-bar dimension buttons reflect it and stay honest."* The bar
  // reads the very flag the law writes, so it cannot disagree with the glass.
  assert.match(code('src/retail/design/ViewBar.jsx'), /const showDimensions = useUiStore\(\(s\) => s\.showDimensions\)/);
  assert.match(code('src/retail/design/viewTools.js'), /flag: 'showDimensions'/);
  room();
  U().setShowDimensions(true);
  watchLightsAndDimensions();
  try {
    A.setLighting(true);
    // The bar's own `stateOf` reads `flags[tool.flag]`, which is this:
    assert.equal(Boolean(U().showDimensions), false,
      'the bar would have shown HIDE DIMENSIONS over a scene with none');
  } finally {
    unwatchLightsAndDimensions();
  }
});

test('F7 · the hover set is a dimension too, and PRO\'s own tooltip says so', () => {
  // The partition-hover arrows were gated by the CHANNEL alone, which
  // `3d/chrome.js` states is a boot-time constant — so nothing could put them
  // out at run time. They read `showLabels` now, which is
  // `showDimensions && !contourView`.
  const view = code('src/3d/UnitView.jsx');
  assert.match(view, /\{hoverPartition && !contour && showLabels && \(/,
    'the hover set is not gated by the dimensions flag');
  // …and the button has promised exactly this since T60.
  assert.match(read('src/components/CanvasToolbar.jsx'), /Show dimensions and distance arrows/);
  assert.match(read('src/retail/design/viewTools.js'), /Show dimensions and distance arrows/);
});

test('F7 · PRO never starts the law — only the retail entry does', () => {
  assert.match(code('src/retail/main-retail.jsx'), /watchLightsAndDimensions\(\)/);
  assert.doesNotMatch(code('src/main.jsx'), /watchLightsAndDimensions|dimmer/,
    'PRO started the retail law');
  assert.doesNotMatch(code('src/App.jsx'), /dimmer/);
  // …and the law reaches nothing but the two shared stores.
  const dim = code('src/retail/design/dimmer.js');
  const imports = [...dim.matchAll(/from '([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(imports.sort(), ['../../stores/projectStore.js', '../../stores/uiStore.js']);
});
