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
import { existsSync, readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

const ROOT = new URL('../', import.meta.url);
const read = (rel) => readFileSync(new URL(rel, ROOT), 'utf8');
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ');

// AMENDED BY T-CC1b F2: SceneViewMenu.jsx is DELETED (*"dwa menu View, jedno wystarczy"*, the owner, 01.11.2026).
const TOPBAR = read('src/components/TopBar.jsx');
const TOGGLES = read('src/components/studio/SceneToggles.jsx');
const WIZARD = read('src/components/WizardSettings.jsx');

/** One entry of a component's registry: `    id: {` ... `    },` (four spaces in). */
function entry(source, id) {
  const m = source.match(new RegExp(`\\n {4}${id}: \\{([\\s\\S]*?)\\n {4}\\},`));
  assert.ok(m, `no entry '${id}' in the registry`);
  return m[1];
}

// AMENDED BY T-CC1b F2 (law 3, SAME DOORS): the View dropdown is deleted; the three switches it alone
// carried in the Studio (Front dimensions, Props, Measure) stand on the bar after the five, so nothing a
// toggle or the View menu did is lost (*"tak te przyciski zostaja sa mega przydatne"*, the owner, 01.11.2026).
test('T86B F7 · five on the bar, Dimensions first, each a toggle the bar already knows; T-CC1b F2 adds the dropdown\'s three after them', () => {
  assert.deepEqual(P.ui.studio.sceneToggles, ['dimensions', 'xray', 'hideFronts', 'outlines', 'openAll', 'frontDimensions', 'props', 'measure']);
  const dims = entry(TOGGLES, 'dimensions');
  // The guard, label and hook it has (T84 F6), unchanged.
  assert.ok(dims.includes("hook: 'toggle-dimensions',"));
  assert.ok(dims.includes("label: showDimensions ? 'Hide dimensions' : 'Show dimensions',"));
  assert.ok(dims.includes("disabled: viewMode !== '3d',"));
  assert.ok(dims.includes('onClick: toggleDimensions,'));
  for (const id of P.ui.studio.sceneToggles) entry(TOGGLES, id);
});

// REWRITTEN BY T-CC1b F2: the popup is gone; its seven keep T84's guards, labels and sentences where
// they live now: three on the quick toggles, four in the top bar's View menu.
test('T86B F7 · the View popup is gone, no ink and no Dimensions anywhere but where T86B put them', () => {
  assert.equal(existsSync(new URL('src/components/studio/SceneViewMenu.jsx', ROOT)), false);
});

test('T86B F7 · the seven keep T84\'s guards and sentences at their homes after T-CC1b F2', () => {
  const ON_TOGGLES = {
    frontDimensions: [
      'pressed: showFrontDimensions,',
      "disabled: viewMode !== '3d',",
      'onClick: toggleFrontDimensions,',
      "? 'Hide front dimensions: sizes, gaps and the merged run figure'",
      ": 'Show front dimensions: sizes, gaps and the merged run figure',",
    ],
    props: [
      "label: 'Props',",
      'pressed: props && propsReady,',
      "disabled: viewMode !== '3d' || contourView || !propsReady,",
      'onClick: toggleProps,',
      ': propsReason(propsPack),',
    ],
    measure: [
      "label: 'Measure',",
      'pressed: rulerOn,',
      "disabled: viewMode !== '3d',",
      'onClick: toggleRuler,',
      "? 'Measuring: click two points to read the distance. Escape clears, then closes.'",
    ],
  };
  for (const [id, lines] of Object.entries(ON_TOGGLES)) {
    const mine = entry(TOGGLES, id);
    for (const line of lines) assert.ok(mine.includes(line), `${id}: "${line}" changed`);
  }
  // The four of the top bar's View menu, with the guard each had there.
  for (const [label, guard, run] of [
    ['Contour view', "viewMode !== '3d'", 'toggleContourView'],
    ['Realistic lighting', "viewMode !== '3d'", 'toggleRealisticLighting'],
    ['Turn on the light', "viewMode !== '3d'", '() => setLighting({ on: !lightOn })'],
    ['Brightness', "viewMode !== '3d'", 'setBrightness'],
  ]) {
    const at = TOPBAR.indexOf(`label: '${label}'`);
    assert.ok(at > 0, `TopBar has no ${label}`);
    const body = TOPBAR.slice(at, at + 900);
    assert.ok(body.includes(`disabled: ${guard},`), `${label}: its guard`);
    assert.ok(body.includes(`run: ${run},`), `${label}: its run`);
  }
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
