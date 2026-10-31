/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T86B F7 (CLAUDE.md T86B PART C): DIMENSIONS ON THE BAR, THE INK IN SETTINGS
//
// *"menu, patrz SS: dimension powinien pojsc do glownego paska, ustawienie
// koloru wymiarowania powinno byc w settings nie tutaj"* (the owner,
// 30.10.2026, 21:54, over verify/t86b/owner-view-menu.png).
//
// CLAUDE.md T86B F7.5: *"five on the bar in order, seven in the popup and
// nothing else, no `dimensionColour` in `SceneViewMenu.jsx`, the Settings row
// under its node reading and writing the store's action, the ink remembered
// across a fresh boot and defaulting on a bad key, the seven's guards and
// sentences byte-identical to T84's strings."*  Node cannot load JSX: the
// components are read as SOURCE; the store is imported, twice, on a stub
// localStorage, so the second import is a fresh boot.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

const ROOT = new URL('../', import.meta.url);
const read = (rel) => readFileSync(new URL(rel, ROOT), 'utf8');
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ');

const VIEW = read('src/components/studio/SceneViewMenu.jsx');
const TOGGLES = read('src/components/studio/SceneToggles.jsx');
const WIZARD = read('src/components/WizardSettings.jsx');

/** One entry of a component's registry: `    id: {` ... `    },` (four spaces in). */
function entry(source, id) {
  const m = source.match(new RegExp(`\\n {4}${id}: \\{([\\s\\S]*?)\\n {4}\\},`));
  assert.ok(m, `no entry '${id}' in the registry`);
  return m[1];
}

test('T86B F7 · five on the bar, Dimensions first, each a toggle the bar already knows', () => {
  assert.deepEqual(P.ui.studio.sceneToggles, ['dimensions', 'xray', 'hideFronts', 'outlines', 'openAll']);
  const dims = entry(TOGGLES, 'dimensions');
  // The guard, label and hook it has (T84 F6), unchanged.
  assert.ok(dims.includes("hook: 'toggle-dimensions',"));
  assert.ok(dims.includes("label: showDimensions ? 'Hide dimensions' : 'Show dimensions',"));
  assert.ok(dims.includes("disabled: viewMode !== '3d',"));
  assert.ok(dims.includes('onClick: toggleDimensions,'));
  for (const id of P.ui.studio.sceneToggles) entry(TOGGLES, id);
});

test('T86B F7 · seven in the View popup and nothing else; no ink, no Dimensions there', () => {
  assert.match(VIEW, /\nconst VIEW_ITEMS = Object\.freeze\(\[\s*'frontDimensions', 'props', 'measure',\s*'contourView', 'brightness', 'realisticLighting', 'light',\s*\]\)/);
  assert.match(VIEW, /\{VIEW_ITEMS\.map\(item\)\}/);
  assert.doesNotMatch(VIEW, /dimensionColour/, 'the ink left the popup whole');
  assert.doesNotMatch(code(VIEW), /colourDisabled|colours|toggleDimensions|showDimensions/);
  assert.doesNotMatch(code(VIEW), /\n {4}dimensions: \{/);
});

test('T86B F7 · the seven keep T84\'s guards, labels and sentences byte for byte', () => {
  const T84 = {
    frontDimensions: [
      "label: 'Front dimensions',",
      'checked: showFrontDimensions,',
      "disabled: viewMode !== '3d',",
      'run: toggleFrontDimensions,',
      "? 'Hide front dimensions: sizes, gaps and the merged run figure'",
      ": 'Show front dimensions: sizes, gaps and the merged run figure',",
    ],
    props: [
      "label: 'Props',",
      'checked: props && propsReady,',
      "disabled: viewMode !== '3d' || contourView || !propsReady,",
      'run: toggleProps,',
      "? (props ? 'Take the props out of the drawers' : 'Dress the drawers: watches, belt rolls, folded ties')",
      ': propsReason(propsPack),',
    ],
    measure: [
      "label: 'Measure',",
      'checked: rulerOn,',
      "disabled: viewMode !== '3d',",
      'run: toggleRuler,',
      "? 'Measuring: click two points to read the distance. Escape clears, then closes.'",
      ": 'Measure between two points on the drawing',",
    ],
    contourView: [
      "label: 'Contour view',",
      'checked: contourView,',
      "disabled: viewMode !== '3d',",
      'run: toggleContourView,',
      "title: 'Presentation mode: outlines only. Changes nothing in the BOM.',",
    ],
    realisticLighting: [
      "label: 'Realistic lighting',",
      'checked: realisticLighting,',
      "disabled: viewMode !== '3d',",
      'run: toggleRealisticLighting,',
      "title: 'Environment reflections and contact shadows. Turn it off if the view feels heavy: a render is unaffected.',",
    ],
    light: [
      "label: 'Turn on the light',",
      'checked: lightOn,',
      "disabled: viewMode !== '3d',",
      'run: () => setLighting({ on: !lightOn }),',
      "title: \"Internal lights ON: the room dims and the placed LEDs shine. The same switch as the Lighting panel's ON / OFF.\",",
    ],
  };
  for (const [id, lines] of Object.entries(T84)) {
    const mine = entry(VIEW, id);
    for (const line of lines) assert.ok(mine.includes(line), `${id}: "${line}" changed`);
  }
  // Brightness: the slider as T84 left it.
  assert.match(VIEW, /title="Scales every light in the room together\. The balance between them does not move\."/);
  assert.match(VIEW, /min=\{range\.min\}\s*max=\{range\.max\}\s*step=\{range\.step\}\s*value=\{brightness\}\s*disabled=\{viewMode !== '3d'\}/);
  assert.match(VIEW, /onChange=\{\(e\) => setBrightness\(Number\(e\.target\.value\)\)\}/);
});

test('T86B F7 · Settings holds ONE Dimension colour row under settings.dimensions, through the store\'s action', () => {
  const at = WIZARD.indexOf('data-wizard-node="settings.dimensions"');
  assert.ok(at > 0, 'no settings.dimensions node');
  // The node's block runs to the next node of the Settings tab or the carcass tab.
  const end = WIZARD.indexOf("{tab === 'carcases' && (", at);
  const node = WIZARD.slice(at, end);
  assert.equal((WIZARD.match(/data-settings-dimension-colour="1"/g) || []).length, 1, 'one row');
  assert.ok(node.includes('data-settings-dimension-colour="1"'), 'the row stands in settings.dimensions');
  assert.ok(node.includes('>Dimension colour<'));
  assert.match(node, /Object\.keys\(profile\.dimensions\.colours\)\.map\(\(key\) =>/, 'the profile\'s inks');
  assert.match(node, /\{key === 'navy' \? 'Navy' : 'Red'\}/, 'named as TopBar names them');
  assert.match(node, /role="radio"\s*aria-checked=\{dimensionColour === key\}/);
  assert.match(node, /text-\[13px\]/, 'the house scale');
  assert.match(node, /onClick=\{\(\) => setDimensionColour\(key\)\}/);
  assert.match(WIZARD, /const dimensionColour = useUiStore\(\(s\) => s\.dimensionColour\);/);
  assert.match(WIZARD, /const setDimensionColour = useUiStore\(\(s\) => s\.setDimensionColour\);/);
  // Not a project field: nothing in the wizard writes it into the design.
  assert.doesNotMatch(code(WIZARD), /setDesign\([^)]*dimensionColour/);
  assert.equal((code(WIZARD).match(/setDimensionColour\(/g) || []).length, 1);
  // TopBar's legacy menu untouched (FROZEN 5): its submenu is still there.
  assert.match(read('src/components/TopBar.jsx'), /label: 'Dimension colour'/);
});

test('T86B F7 · the ink is remembered across a fresh boot, and a bad key falls back to the profile\'s', async () => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
  };
  try {
    const first = await import('../src/stores/uiStore.js?boot=1');
    assert.equal(first.useUiStore.getState().dimensionColour, P.appearance.dimensions.colour, 'unset: the profile\'s default');
    first.useUiStore.getState().setDimensionColour('navy');
    assert.equal(store.get('cc.dimensionColour'), 'navy', 'written to its key');
    first.useUiStore.getState().setDimensionColour('chartreuse');
    assert.equal(store.get('cc.dimensionColour'), 'navy', 'nonsense is never written');
    const second = await import('../src/stores/uiStore.js?boot=2');
    assert.equal(second.useUiStore.getState().dimensionColour, 'navy', 'a fresh boot reads it back');
    store.set('cc.dimensionColour', 'chartreuse');
    const third = await import('../src/stores/uiStore.js?boot=3');
    assert.equal(third.useUiStore.getState().dimensionColour, P.appearance.dimensions.colour, 'a bad key: the default');
    assert.equal(third.dimensionColourFrom(null), P.appearance.dimensions.colour);
    assert.equal(third.dimensionColourFrom('red'), 'red');
    assert.match(read('src/stores/uiStore.js'), /const DIMENSION_COLOUR_KEY = 'cc\.dimensionColour';/);
  } finally {
    delete globalThis.localStorage;
  }
});

// T86B F2 (the panel's line): law 2, *"zrob jak rekomendujesz"* (the owner,
// 30.10.2026, 23:02). The Section reads a column stack's two numbers from the
// engine's derived.columnStacks[zone], in the full-width stack's own words.
test('T86B F2 · the Section shows Stack height and Partition for a column stack, from derived.columnStacks', () => {
  const PANEL = read('src/components/RightPanel.jsx');
  const at = PANEL.indexOf('{(result?.assemblies?.columnDrawers || []).map((c) => {');
  assert.ok(at > 0, 'no column stack rows');
  const block = PANEL.slice(at, at + 1600);
  assert.match(block, /const stack = result\?\.derived\?\.columnStacks\?\.\[c\.zone\];\s*if \(!stack\) return null;/, 'nothing drawn when the engine writes none');
  assert.match(block, /<span>Stack height<\/span>\s*<span>\{formatMm\(stack\.drawerTotalH, \{ unit: true \}\)\}<\/span>/);
  assert.match(block, /<span>Partition \(locked, required above the stack\)<\/span>\s*<span>\{formatMm\(stack\.partition_bottom_y, \{ unit: true \}\)\}<\/span>/);
  // The full-width rows, as T79 left them, still there.
  assert.match(PANEL, /\{result\.derived\.partition_bottom_y != null && \(/);
  assert.match(PANEL, /\{result\.derived\.drawerTotalH\s*\? formatMm\(result\.derived\.drawerTotalH, \{ unit: true \}\)/);
});
