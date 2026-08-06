import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

import {
  DECOR_CATEGORIES, DECOR_DISCLAIMER, DECOR_GRAIN_TEXTURE, decorById, decorFinish,
  decorIdFromFinishId, decorLabel, filterDecors, finishFromDecor, finishIdForDecor,
  normaliseDecor, parseDecorCatalogue, setDecorCatalogue,
} from '../src/engine/decors.js';
import { finishById, resolveFinishes, migrateDesign } from '../src/engine/design.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { loadDecorCatalogue } from '../src/lib/decorCatalogue.js';

// ─── The EGGER decor pack (BACKLOG #19, picker v1 — turn 5 F5) ───
//
// Two things are being tested here, and the second one is the important one.
//
//   1. The pack loads: 85 decors, two categories, filter and search.
//   2. THE LICENCE HOLDS. EGGER images may be shown whole and attributed, and
//      may NOT be used as 3D textures until there is written consent. Both of
//      those are code paths, so both are tests — a licence that lives only in a
//      comment is a licence one refactor away from being broken.

const CATALOGUE_PATH = new URL('../public/decors/egger-decors.json', import.meta.url);
const raw = JSON.parse(readFileSync(CATALOGUE_PATH, 'utf8'));
const { decors } = parseDecorCatalogue(raw, { basePath: '/decors/' });

test('the pack Piotr supplied is the pack the app reads', () => {
  assert.equal(decors.length, 85);
  const counts = {};
  for (const d of decors) counts[d.category] = (counts[d.category] || 0) + 1;
  assert.deepEqual(Object.keys(counts).sort(), ['uni_colour', 'woodgrain']);
  assert.deepEqual(DECOR_CATEGORIES.map((c) => c.id), ['uni_colour', 'woodgrain']);

  for (const d of decors) {
    assert.ok(d.id && d.code, 'every decor has an id and a code');
    assert.match(d.hex, /^#[0-9A-F]{6}$/, `${d.id} has no usable colour: ${d.hex}`);
    assert.ok(d.name, `${d.id} has no name`);
  }
});

test('every thumbnail the app asks for is actually in the repo', () => {
  // A grid of broken images is a worse answer than a grid of colours.
  for (const d of decors) {
    if (!d.thumb) continue;
    const file = new URL(`../public${d.thumb}`, import.meta.url);
    assert.ok(existsSync(file), `${d.id} points at a thumbnail that is not there: ${d.thumb}`);
  }
});

// ─── attribution ───

test('a decor is never named without EGGER, its code and its name', () => {
  const oak = decors.find((d) => d.id === 'H1180_37');
  assert.ok(oak, 'the pack has changed — H1180_37 was the reference decor');
  assert.equal(decorLabel(oak), 'EGGER H1180 ST37 Natural Halifax Oak');

  for (const d of decors) {
    const label = decorLabel(d);
    assert.ok(label.startsWith('EGGER '), `${d.id}: no brand`);
    assert.ok(label.includes(d.code), `${d.id}: no code`);
    assert.ok(label.includes(d.name.replace(`${d.code} `, '')), `${d.id}: no name`);
    // …and the code is not said twice: the shipped name already begins with it.
    assert.equal(label.split(d.code).length - 1, 1, `${d.id}: "${label}" repeats the code`);
  }
  assert.equal(decorLabel(null), '');
});

test('the reproduction note is carried verbatim', () => {
  assert.equal(
    DECOR_DISCLAIMER,
    'All decors are reproductions — colour matching only on the original sample (EGGER).',
  );
});

// ─── THE LICENCE LINE: no EGGER image ever reaches 3D geometry ───

test('no finish derived from a decor carries an EGGER image as its texture', () => {
  for (const d of decors) {
    const finish = finishFromDecor(d);
    if (!finish.texture) continue;
    assert.equal(finish.texture, DECOR_GRAIN_TEXTURE,
      `${d.id} would put a manufacturer image on a panel`);
    assert.equal(finish.texture.includes('decor'), false, 'and it is not from the decor pack at all');
    assert.equal(finish.texture.startsWith('textures/'), true, 'it is ours, from scripts/gen-textures.mjs');
  }
});

test('a uni colour is a flat colour in 3D, a woodgrain is our grain tinted', () => {
  const uni = decors.find((d) => d.category === 'uni_colour');
  const wood = decors.find((d) => d.category === 'woodgrain');

  const uniFinish = finishFromDecor(uni);
  assert.equal(uniFinish.kind, 'colour');
  assert.equal(uniFinish.texture, undefined, 'a plain colour needs no image at all');
  assert.equal(uniFinish.hex, uni.hex);

  const woodFinish = finishFromDecor(wood);
  assert.equal(woodFinish.kind, 'decor');
  assert.equal(woodFinish.texture, DECOR_GRAIN_TEXTURE);
  assert.equal(woodFinish.tint, true, 'the grain is multiplied by the decor colour, not shown grey');
  assert.equal(woodFinish.hex, wood.hex);
});

test('the tint base is a real file, and it is ours', () => {
  const file = new URL(`../public/${DECOR_GRAIN_TEXTURE}`, import.meta.url);
  assert.ok(existsSync(file), 'scripts/gen-textures.mjs has not been run');
  // Generated, not downloaded: the script that makes it is in the repo.
  const script = readFileSync(new URL('../scripts/gen-textures.mjs', import.meta.url), 'utf8');
  assert.ok(script.includes('grain-neutral.png'));
});

// ─── choosing one ───

test('a chosen decor is stored as an id, and reads back as a finish', () => {
  setDecorCatalogue({ decors });
  const oak = decorById('H1180_37');
  const id = finishIdForDecor(oak);
  assert.equal(id, 'egger:H1180_37');
  assert.equal(decorIdFromFinishId(id), 'H1180_37');
  assert.equal(decorIdFromFinishId('broken_white'), null, 'a profile finish is not a decor');
  assert.equal(decorIdFromFinishId(null), null);

  const finish = decorFinish(id);
  assert.equal(finish.label, 'EGGER H1180 ST37 Natural Halifax Oak');
  assert.equal(finish.id, id);
});

test('a decor id resolves through the same finishById the profile finishes use', () => {
  setDecorCatalogue({ decors });
  assert.equal(finishById(P, 'egger:H1180_37').label, 'EGGER H1180 ST37 Natural Halifax Oak');
  assert.equal(finishById(P, 'broken_white').label, 'Broken white', 'the shipped finishes still work');
  assert.equal(finishById(P, null), null);
});

test('a project finished in a decor resolves it for the carcass and the fronts', () => {
  setDecorCatalogue({ decors });
  const design = migrateDesign({ finish: { carcass: 'egger:W1000_9', front: 'egger:H1180_37' } });
  const { carcass, front } = resolveFinishes({ params: {} }, design, P);
  assert.equal(carcass.label, 'EGGER W1000 ST9 Premium White');
  assert.equal(front.label, 'EGGER H1180 ST37 Natural Halifax Oak');
  // …and the fronts still default to the carcass when only the carcass is set.
  const carcassOnly = migrateDesign({ finish: { carcass: 'egger:H1180_37', front: null } });
  assert.equal(resolveFinishes({ params: {} }, carcassOnly, P).front.label,
    'EGGER H1180 ST37 Natural Halifax Oak');
});

test('a decor this install does not have falls back instead of rendering nothing', () => {
  setDecorCatalogue({ decors: [] });
  assert.equal(finishById(P, 'egger:H1180_37'), null);
  const design = migrateDesign({ finish: { carcass: 'egger:H1180_37' } });
  const { carcass } = resolveFinishes({ params: {} }, design, P);
  assert.equal(carcass.id, 'broken_white', 'the project opens, in the default finish');
  setDecorCatalogue({ decors });   // put the catalogue back for the tests below
});

// ─── the grid ───

test('the filter is the two categories and a search over code and name', () => {
  assert.equal(filterDecors(decors, {}).length, decors.length);
  assert.ok(filterDecors(decors, { category: 'uni_colour' }).every((d) => d.category === 'uni_colour'));

  const byCode = filterDecors(decors, { query: 'H1180' });
  assert.ok(byCode.some((d) => d.id === 'H1180_37'));
  const byName = filterDecors(decors, { query: 'halifax' });
  assert.ok(byName.some((d) => d.id === 'H1180_37'), 'and the search is case-insensitive');
  assert.deepEqual(filterDecors(decors, { query: 'zzzz' }), []);

  // Both at once: a woodgrain search does not surface a uni colour.
  const both = filterDecors(decors, { category: 'woodgrain', query: 'white' });
  assert.ok(both.every((d) => d.category === 'woodgrain'));
});

test('a broken row is dropped rather than rendered as an empty tile', () => {
  const parsed = parseDecorCatalogue({ decors: [{ id: 'x' }, { code: 'y' }, raw.decors[0]] });
  assert.equal(parsed.decors.length, 1);
  // A missing or malformed colour gets a visible placeholder, not `undefined`.
  assert.equal(normaliseDecor({ id: 'a', code: 'A', hex: 'nope' }).hex, '#CCCCCC');
  assert.equal(normaliseDecor({ id: 'a', code: 'A' }).category, 'woodgrain');
  assert.equal(normaliseDecor({ id: 'a', code: 'A' }).thumb, null, 'no file, no request');
});

test('thumbnail urls are built from the base the app is served under', () => {
  const at = parseDecorCatalogue(raw, { basePath: '/sub/decors/' }).decors[0];
  assert.ok(at.thumb.startsWith('/sub/decors/thumbs/'));
});

// ─── loading ───

test('the loader hands the parsed pack to the engine, and survives a failure', async () => {
  const ok = await loadDecorCatalogue({
    fetchImpl: async () => ({ ok: true, status: 200, statusText: 'OK', json: async () => raw }),
  });
  assert.equal(ok.error, null);
  assert.equal(ok.decors.length, 85);
  assert.equal(decorById('H1180_37')?.code, 'H1180');

  // A second call shares the first — one request, not one per picker.
  const again = await loadDecorCatalogue({ fetchImpl: () => { throw new Error('should not be called'); } });
  assert.equal(again.decors.length, 85);
});
