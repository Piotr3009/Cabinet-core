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
const { boardRefusal, defaultFrontDecoration } = await import('../src/engine/frontDecoration.js');
const { FRONT_STYLE_ART } = await import('../src/engine/frontStyleArt.js');
const { FRONT_STYLE_OPTIONS } = await import('../src/engine/design.js');

const S = () => useProjectStore.getState();
const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const SIX = ['G', 'GF', 'A', 'AH', 'FL', 'AM'];

test('F6 · the FRONTS list offers the six, each drawn from frontStyleArt.js', () => {
  const order = read('src/retail/design/Options.jsx').match(/const order = \[([^\]]*)\]/)[1];
  assert.equal(order, "'F', 'S', 'G', 'GF', 'FL', 'A', 'AH', 'GL', 'AM', 'ORNATE_A_1', 'ORNATE_A_2', 'ORNATE_A_3', 'ORNATE_A_4'");
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

test('F6 · a client picks each style the doors can take and gets the owner\'s recipe, cut, and named', () => {
  A.startDesign('T76 fronts');
  const unitId = A.addFirstWardrobe();
  assert.ok(unitId, 'no wardrobe');
  // The client's road: a collection on the doors (sprayed, 18 mm).
  A.applyCollection('mayfair-green');
  const offered = Object.fromEntries(A.frontStyles().map((s) => [s.id, s]));
  for (const style of ['G', 'GF', 'FL', 'AM']) {
    assert.equal(offered[style].refused, false, `${style} is refused on these doors`);
    A.setFrontStyle(style);
    const fronts = S().project.design.fronts;
    assert.equal(fronts.style, style);
    assert.deepEqual(fronts.decoration, defaultFrontDecoration(style), `${style}: not the owner's recipe`);
    const result = S().unitResult(unitId);
    const leaves = result.panels.filter((p) => p.role === 'front' && p.part === 'FRONT');
    assert.ok(leaves.length, style);
    for (const leaf of leaves) {
      assert.equal(leaf.meta.frontDecoration?.style, style, `${style}: ${leaf.id} is not decorated`);
      // T76 F7 · the walk's lesson: decorated is not enough, it must be CUT.
      assert.equal(leaf.meta.frontDecoration.status, 'ready', `${style}: ${JSON.stringify(leaf.meta.frontDecoration.problems)}`);
    }
    const label = FRONT_STYLE_OPTIONS.find((o) => o.id === style).label;
    const said = JSON.stringify(describeDesign({ project: S().project, units: S().units }));
    assert.ok(said.includes(label), `${style}: MY ESTIMATE does not name "${label}"`);
  }
});

// ─── T76 F7 · THE WALK'S FINDING: ARCHED ON RETAIL'S 18 MM DOORS ──────────
//
// The walk clicked ARCHED and ARCHED HANDLELESS on a retail wardrobe and got a
// plain slab with no sentence: the owner's arch is an 18 mm recess (drawn for
// a 30 board) and retail's doors are 18 to 20 mm, which leaves no skin. Not
// shrunk, not swapped: the two rows are greyed with the engine's answer.
test('F7 · a style these doors cannot take is greyed and says why, in words', () => {
  A.startDesign('T76 arched');
  const unitId = A.addFirstWardrobe();
  A.applyCollection('mayfair-green');
  const doors = S().unitResult(unitId).panels.filter((p) => p.part === 'FRONT').map((p) => p.thickness);
  assert.ok(doors.length && doors.every((t) => t === 18), `the doors are ${doors.join(', ')} mm`);
  const offered = Object.fromEntries(A.frontStyles().map((s) => [s.id, s]));
  for (const style of ['A', 'AH']) {
    assert.equal(offered[style].refused, true, `${style} is offered on 18 mm doors`);
    assert.match(offered[style].reason, /is routed into a door at least 21 mm thick; these doors are 18 mm, so it cannot be cut in them\./);
  }
  // The row is a disabled button and the sentence stands under the list.
  const options = read('src/retail/design/Options.jsx');
  assert.match(options, /disabled=\{s\.soon \|\| s\.refused\}/);
  assert.match(options, /data-testid=\{`fronts-style-refused-\$\{s\.id\}`\}>\{s\.reason\}</);
  // The engine's answer, one rule: the arch fits a 21 mm door and up.
  assert.equal(boardRefusal('A', 21), null);
  assert.equal(boardRefusal('A', 25), null);
  assert.equal(boardRefusal('A', 20).needMm, 21);
});
