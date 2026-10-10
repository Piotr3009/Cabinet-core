// ─── T76 F3 · KASACJA: THE SLIM SHAKER GOES ─────────────────────────────────
//
// The owner, 10.10.2026, on GPT's slim shaker: *"a po co mi slim shaker jak
// mamy ustawianie shakera po wyborze shaker, bez sensu, reszta chyba ok."*
//
// A slim shaker is `profile.front.types.S` with a narrow frame: the shaker
// already owns that number (`frameMin` 10, `frameMax` 200, T33 F8's wizard
// field) and its recess (6). So `SS` is deleted, physically, from every place
// GPT's patch put it: the style list, the recipe, the drawing, retail's list,
// the golden file, the tests and the walks. No alias: SS never shipped, no
// saved project carries it. The shaker itself is untouched.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { FRONT_STYLE_OPTIONS, frontStyleSelection, migrateDesign } from '../src/engine/design.js';
import { DECORATIVE_FRONT_STYLES, defaultFrontDecoration } from '../src/engine/frontDecoration.js';
import { FRONT_STYLE_ART, drawnFrontStyleIds } from '../src/engine/frontStyleArt.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

test('F3 · SS is not a style: not offered, not drawn, no recipe', () => {
  assert.ok(!FRONT_STYLE_OPTIONS.some((o) => o.id === 'SS'), 'SS is still offered');
  assert.ok(!DECORATIVE_FRONT_STYLES.includes('SS'), 'SS still has a recipe');
  assert.equal(defaultFrontDecoration('SS', P), null);
  assert.equal(Object.hasOwn(FRONT_STYLE_ART, 'SS'), false, 'SS is still drawn');
  assert.ok(!drawnFrontStyleIds().includes('SS'));
});

test('F3 · no alias: a design naming SS falls back as any unknown style does', () => {
  // SS never shipped, so nothing is mapped to it; an unknown id is not a style.
  const d = migrateDesign({ fronts: { style: 'SS' } });
  assert.notEqual(d.fronts.style, 'SS');
  assert.equal(frontStyleSelection('SS').style, 'F');
});

test('F3 · the shaker keeps its own frame and recess: that IS the slim', () => {
  const S = P.front.types.S;
  assert.equal(S.recessDepth, 6, 'the recess is not made a per-front field tonight');
  assert.equal(S.frameMin, 10);
  assert.equal(S.frameMax, 200);
  assert.ok(FRONT_STYLE_OPTIONS.some((o) => o.id === 'S'));
});

test('F3 · retail, the golden file, the walks and the doc carry no SS', () => {
  const retailList = read('src/retail/design/adapter.js').match(/const LIVE_STYLES = \[[^\]]*\]/)[0];
  assert.doesNotMatch(retailList, /'SS'/);
  const order = read('src/retail/design/Options.jsx').match(/const order = \[[^\]]*\]/)[0];
  assert.doesNotMatch(order, /'SS'/);
  assert.doesNotMatch(read('src/retail/design/Options.jsx'), /\bSS: '/);
  const golden = JSON.parse(read('fixtures/golden-decorative-fronts.json'));
  assert.equal(Object.hasOwn(golden, 'SS'), false);
  for (const rel of ['scripts/decorative-fronts-pro-walk.mjs', 'scripts/front-decoration-walk.mjs']) {
    assert.doesNotMatch(read(rel), /'SS'/, `${rel} still walks SS`);
  }
  assert.doesNotMatch(read('docs/decorative-fronts.md'), /\| SS \|/);
});

test('F3 · the tombstone is two lines in design.js, with the owner\'s words', () => {
  const src = read('src/engine/design.js');
  const at = src.indexOf('T76 F3');
  assert.ok(at > 0, 'no tombstone');
  const lines = src.slice(at).split('\n').slice(0, 2);
  assert.match(lines[0], /KASACJA/);
  assert.match(lines.join(' '), /bez sensu/);
  assert.doesNotMatch(src, /\{ id: 'SS'/);
});
