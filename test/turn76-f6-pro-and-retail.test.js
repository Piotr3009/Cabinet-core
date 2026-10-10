// ─── T76 F6 · PRO AND RETAIL, THROUGH THE COPY SCRIPT ───────────────────────
//
// CLAUDE.md T76 F6: *"Retail FRONTS step: the style tiles show G, GF, A, AH,
// FL, AM thumbnails from `frontStyleArt.js`; a client picks a style and gets
// the owner's recipe with NO numeric fields (lazy client law; the recipe
// controls are PRO's); the 3D shows the recess, grooves, flutes or strips on
// the leaf."*  The copy itself is proved by `scripts/t76-copy.mjs`; this file
// holds what the client meets.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { setPersistence } from '../src/stores/persistence.js';

setPersistence('none');

const { useProjectStore } = await import('../src/stores/projectStore.js');
const A = await import('../src/retail/design/adapter.js');
const { describeDesign } = await import('../src/retail/estimate/document.js');
const { defaultFrontDecoration } = await import('../src/engine/frontDecoration.js');
const { FRONT_STYLE_ART } = await import('../src/engine/frontStyleArt.js');
const { FRONT_STYLE_OPTIONS } = await import('../src/engine/design.js');

const S = () => useProjectStore.getState();
const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const SIX = ['G', 'GF', 'A', 'AH', 'FL', 'AM'];

test('F6 · the FRONTS list offers the six, each drawn from frontStyleArt.js', () => {
  const order = read('src/retail/design/Options.jsx').match(/const order = \[([^\]]*)\]/)[1];
  assert.equal(order, "'F', 'S', 'G', 'GF', 'FL', 'A', 'AH', 'GL', 'AM'");
  const live = A.frontStyles().filter((s) => !s.soon).map((s) => s.id);
  for (const id of SIX) {
    assert.ok(live.includes(id), `${id} is not live in retail`);
    assert.ok(Array.isArray(FRONT_STYLE_ART[id]) && FRONT_STYLE_ART[id].length, `${id} has no drawing`);
  }
  // The thumbnail is the shared art, not a retail redrawing.
  assert.match(read('src/retail/design/FrontThumb.jsx'), /<FrontStyleArt styleId=\{style\}/);
});

test('F6 · retail shows no numeric field of a recipe: the controls are PRO\'s', () => {
  const options = read('src/retail/design/Options.jsx');
  const call = options.slice(options.indexOf('<FrontDecorationControls'), options.indexOf('/>', options.indexOf('<FrontDecorationControls')));
  assert.match(call, /fields=\{false\}/, 'retail renders the recipe fields');
  // The copy renders nothing once the recipe is there; only an old saved
  // front's activation (a button, no number) is left.
  const copy = read('src/retail/design/material/FrontDecorationControls.jsx');
  assert.match(copy, /export default function FrontDecorationControls\(\{ style, value, onChange, fields = true \}\)/);
  assert.match(copy, /if \(config && !fields\) return null;/);
  // PRO passes nothing and keeps its fields.
  for (const rel of ['src/components/RightPanel.jsx', 'src/components/SettingsPanel.jsx', 'src/components/WizardSettings.jsx']) {
    assert.doesNotMatch(read(rel), /<FrontDecorationControls[^>]*fields=\{false\}/, `${rel} lost its fields`);
  }
  // The only typed number left in the step is the shaker's own frame, under S alone.
  const fronts = options.slice(options.indexOf('function FrontsPanel('), options.indexOf('{/* ─── AND THE SENTENCES COLLECT HERE'));
  assert.equal((fronts.match(/<NumberField/g) || []).length, 1);
  assert.match(fronts, /\{style === 'S' \? \(\s*<Field label="FRAME WIDTH">/);
});

test('F6 · a client picks each style and gets the owner\'s recipe, the leaf decorated, the estimate naming it', () => {
  A.startDesign('T76 fronts');
  const unitId = A.addFirstWardrobe();
  assert.ok(unitId, 'no wardrobe');
  for (const style of SIX) {
    A.setFrontStyle(style);
    const fronts = S().project.design.fronts;
    assert.equal(fronts.style, style);
    assert.deepEqual(fronts.decoration, defaultFrontDecoration(style), `${style}: not the owner's recipe`);
    const result = S().unitResult(unitId);
    const leaves = result.panels.filter((p) => p.role === 'front' && p.part === 'FRONT');
    assert.ok(leaves.length, style);
    for (const leaf of leaves) {
      assert.equal(leaf.meta.frontDecoration?.style, style, `${style}: ${leaf.id} is not decorated`);
    }
    const label = FRONT_STYLE_OPTIONS.find((o) => o.id === style).label;
    const said = JSON.stringify(describeDesign({ project: S().project, units: S().units }));
    assert.ok(said.includes(label), `${style}: MY ESTIMATE does not name "${label}"`);
  }
});
