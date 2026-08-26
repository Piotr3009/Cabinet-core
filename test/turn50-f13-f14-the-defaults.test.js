// ─── T50 · F13 + F14: THE DEFAULTS ─────────────────────────────────────────
//
// F13, the owner, 25.08.2026: *"default wysokości szaf 2150."*  CLAUDE.md:
// *"this feature is to make sure it is the ONLY one … If they already agree,
// say so in the PR and change nothing — a confirmed single source is a
// result."*
//
// F14, the same evening: *"default oświetlenia jasności … teraz 100 to niech
// będzie jakby teraz było 75."*  And, on the showroom pillars: *"za jasno
// świecą, ściemnij o połowę."*

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { DEFAULT_CABINET_PROFILE as P, getCabinetProfile } from '../src/engine/profile.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { heightsForProjectType, heightOverridesFor } from '../src/engine/projectTypes.js';
import { projectHeights, migrateDesign } from '../src/engine/design.js';
import { wardrobeSeed, WARDROBE_DEPTH_MM } from '../src/lib/wizardTabs.js';

const SRC = new URL('../src/', import.meta.url);

// ─── F13 · 2150 LIVES IN ONE PLACE ─────────────────────────────────────────

test('F13 · the profile’s two 2150s are one number about one cabinet', () => {
  // `wardrobe.defaults.height` is what the AutoLISP kit ships with;
  // `projectHeights.tall` is what a JOB is built to. They are two questions and
  // they agree, which is the answer CLAUDE.md calls a result.
  assert.equal(P.wardrobe.defaults.height, 2150, 'the kit’s factory setting');
  assert.equal(P.projectHeights.tall, 2150, 'and the job’s');
  assert.equal(defaultParamsFor('WARDROBE', P).height, 2150, 'which is what a bare kit call cuts');
});

test('F13 · the WIZARD’s seed reads the profile — it does not repeat the figure', () => {
  // T44-F3 wrote `{ height: 2100, plinth: 100, depth: 568 }` as a literal, with
  // its reason: iron rule 2 froze `src/engine/**` that night. The consequence
  // is what F13 ends — a wardrobe STARTED in the wizard opened at 2100 while
  // the profile said 2150.
  assert.deepEqual(wardrobeSeed(P), {
    height: P.projectHeights.tall,
    plinth: P.projectHeights.toeKick,
    depth: P.wardrobe.defaults.depth,
  });
  assert.equal(wardrobeSeed(P).height, 2150);
  assert.equal(wardrobeSeed(P).depth, WARDROBE_DEPTH_MM, 'the depth was never the disagreement');
  // A workshop that moves its own tall height moves the seed with it, which is
  // the whole of "one place".
  const shop = { ...P, projectHeights: { ...P.projectHeights, tall: 2400 } };
  assert.equal(wardrobeSeed(shop).height, 2400);
});

test('F13 · the PROJECT TYPE overrides nothing any more', () => {
  // It said `{ tall: 2400 }`, which made a THIRD default height for one
  // cabinet. A wardrobe is built to the project's own tall height.
  assert.deepEqual(heightOverridesFor('wardrobe', P), {});
  assert.equal(heightsForProjectType('wardrobe', P).tall, 2150);
  assert.equal(
    heightsForProjectType('wardrobe', P).tall,
    projectHeights(migrateDesign({}), P).tall,
    'the same number the standard job is built to',
  );
  // The MECHANISM is untouched: the vanity still uses it, and a shop that
  // really does build 2400 wardrobes puts one number back.
  assert.ok(heightOverridesFor('vanity', P).base > 0);
});

test('F13 · NOT ONE stray 2150 anywhere in src/', () => {
  // The census CLAUDE.md asks for, run rather than remembered: every literal
  // 2150 in the source, with its file. Only the profile may carry one, and only
  // twice — the kit's own default and the job's.
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const at = join(dir, name.name);
      if (name.isDirectory()) walk(at);
      else if (/\.(js|jsx)$/.test(name.name)) files.push(at);
    }
  };
  walk(new URL('.', SRC).pathname);

  const stray = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
      // Prose is where the number is EXPLAINED — "a 2150 wardrobe" — and that
      // is a sentence, not a second source.
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/\/\/.*$/gm, '');
    if (!/\b2150\b/.test(text)) continue;
    stray.push(file.slice(file.indexOf('/src/') + 1));
  }
  assert.deepEqual(stray, ['src/engine/profile.js'],
    `2150 is stated outside the profile: ${stray.join(', ')}`);
});

test('F13 · a WARDROBE arrives at 2150 whichever door it came in by', () => {
  // The bare kit, the project's own height, and the wizard's seed. Three doors,
  // one number — which is the whole feature.
  assert.equal(defaultParamsFor('WARDROBE', getCabinetProfile()).height, 2150);
  assert.equal(projectHeights(migrateDesign({ projectType: 'wardrobe' }), P).tall, 2150);
  assert.equal(wardrobeSeed(P).height, 2150);
});

// ─── F14 · THE STUDIO SHIPS A QUARTER DARKER ───────────────────────────────

test('F14 · one named number, and it is 0.75', () => {
  assert.equal(P.appearance.studio.baseGain, 0.75, '*"teraz 100 to niech będzie jakby teraz było 75"*');
});

test('F14 · it is multiplied into the SLIDER’s gain, not into the lamps', () => {
  const scene = readFileSync(new URL('3d/Scene.jsx', SRC), 'utf8');
  assert.match(scene, /const baseGain = Number\(studio\.baseGain\) > 0 \? Number\(studio\.baseGain\) : 1;/);
  assert.match(scene, /const gain = \(Number\(brightness\) > 0 \? Number\(brightness\) : 1\) \* baseGain;/);
  // Every lamp still multiplies by that ONE `gain`, so every ratio turn 10
  // measured is exactly the ratio it measured.
  for (const lamp of [
    'studio.ambient * gain',
    'studio.key * gain',
    'studio.fill * gain',
    'studio.rim * gain',
    'studio.hemisphere.intensity * gain',
  ]) {
    assert.ok(scene.includes(lamp), `${lamp} still rides the one gain`);
  }
  assert.match(scene, /\(studio\.band\?\.intensity \?\? 2\.2\) \* gain/);
  assert.match(scene, /\(studio\.pillars\?\.intensity \?\? 22\) \* gain/);
});

test('F14 · the individual lamps keep their own numbers, so each can still be tuned alone', () => {
  // CLAUDE.md: *"It is NOT to be mixed into the individual lamps' intensities:
  // the bands, the pillars, the key, the fill and the rim keep their own
  // numbers so each can still be tuned on its own."*
  assert.equal(P.appearance.studio.key, 1.0);
  assert.equal(P.appearance.studio.fill, 0.55);
  assert.equal(P.appearance.studio.rim, 0.3);
  assert.equal(P.appearance.studio.ambient, 0.2);
  assert.equal(P.appearance.studio.band.intensity, 2.2);
});

test('F14 · the PILLARS are halved separately, and the reductions compound', () => {
  // *"za jasno świecą, ściemnij o połowę."*  22 → 11, its own number.
  assert.equal(P.appearance.studio.pillars.intensity, 11);
  // A pillar ends the night at 11 × 0.75 = 8.25 of the gain it had at 22 —
  // 37.5 % of what it was. Stated so the owner can see what he is looking at,
  // which is what CLAUDE.md asks the PR to say.
  const now = P.appearance.studio.pillars.intensity * P.appearance.studio.baseGain;
  assert.equal(now, 8.25);
  assert.equal(Math.round((now / 22) * 1000) / 10, 37.5, 'per cent of what a pillar was');

  // ─── …AND A THIRD REDUCTION ARRIVED FROM THE OTHER SIDE ─────────────────
  // While this turn was being written the owner pushed his own chat-fix to
  // main: the mirrored PAIR became ONE pillar, which by itself halves the
  // light. Merged, the three compose — one lamp instead of two, at 11 instead
  // of 22, times 0.75 — which is a good deal darker than F14 was reasoning
  // about. Kept at 11 because CLAUDE.md names the number; recorded here and in
  // BACKLOG 130 so the owner can raise THIS one alone, which is the whole
  // reason `baseGain` is kept out of the lamps.
  assert.equal(P.appearance.studio.pillars.count, 1, 'his own chat-fix, merged');
  const before = 22 * 2;                       // two pillars, 25.08 morning
  const after = P.appearance.studio.pillars.intensity
    * P.appearance.studio.pillars.count * P.appearance.studio.baseGain;
  assert.equal(after, 8.25);
  assert.equal(Math.round((after / before) * 1000) / 10, 18.8,
    'per cent of the light the pillars threw before either change');
});

test('F14 · nothing else about the slider changes', () => {
  const brightness = P.ui?.brightness || P.appearance?.brightness || null;
  // The slider's own numbers live where they always did; F14 touches none of
  // them. Whatever block holds them, it is not `studio.baseGain`.
  const profileSrc = readFileSync(new URL('engine/profile.js', SRC), 'utf8');
  assert.ok(profileSrc.includes('baseGain: 0.75'), 'the one number');
  // Stated ONCE as a value. Every other mention is prose explaining it — the
  // paragraph above it, and the pillars' own note about the two compounding.
  const stated = (profileSrc.match(/^\s*baseGain: /gm) || []).length;
  assert.equal(stated, 1, 'one number, in one place');
  assert.ok(brightness === null || typeof brightness === 'object');
});

test('F14 · a profile saved before tonight comes back with the base gain', () => {
  // `resolveProfile` merges `appearance.studio` key by key, so an old profile
  // that has never heard of `baseGain` gets the default rather than an
  // `undefined` that would darken the whole rig to nothing.
  const profileSrc = readFileSync(new URL('engine/profile.js', SRC), 'utf8');
  assert.match(profileSrc, /studio: \{\n\s+\.\.\.D\.appearance\.studio, \.\.\.profile\.appearance\?\.studio/);
  const scene = readFileSync(new URL('3d/Scene.jsx', SRC), 'utf8');
  assert.match(scene, /Number\(studio\.baseGain\) > 0 \? Number\(studio\.baseGain\) : 1/,
    'and the surface falls back to 1 rather than to 0 either way');
});
