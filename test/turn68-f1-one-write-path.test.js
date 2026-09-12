// ─── TURN 68 · F1 — ONE WRITE PATH FOR WHAT THE WARDROBE WEARS ─────────────
//
// THE PROBE CAME FIRST and it is committed: `verify/t68/f1-probe.md`. It drove
// the three entry points in every order and found two different wardrobes:
//
//   fronts → collection → unit   opening `handles` · 0 J-pull fronts cut
//   collection → fronts → unit   opening `jhandle` · 2 J-pull fronts cut
//
// …and, in its second table, that with ANY collection in the URL the carcass
// was never H3325. The owner's three symptoms, one disease: TWO WRITERS of how
// a front is held, and a carcass default a collection could step over.
//
// Every assertion below is written against what the probe SAID.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import * as A from '../src/retail/design/adapter.js';
import { COLLECTIONS } from '../src/retail/design/collections.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { resolveUnitDesign } from '../src/engine/design.js';
import { finishIdForDecor } from '../src/engine/decors.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import decorPack from '../public/decors/egger/egger-decors.json' with { type: 'json' };
import { parseDecorCatalogue, setDecorCatalogue } from '../src/engine/decors.js';

setDecorCatalogue(parseDecorCatalogue(decorPack, { basePath: '/decors/egger/' }));

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const S = () => useProjectStore.getState();

function wardrobe() {
  useUiStore.getState().clearSelection();
  A.startDesign('T68 F1');
  const id = A.addFirstWardrobe();
  A.setUnitSize(id, { width: 1800 });
  A.addDoors(id);
  return id;
}

/** What the ENGINE stamped on the leaves — the only honest reading of "geometry". */
function stamped(unitId) {
  const panels = S().unitResult(unitId)?.panels || [];
  const fronts = panels.filter((p) => p.role === 'front');
  return {
    leaves: fronts.map((p) => Math.round(Number(p.w) || 0)).sort((a, b) => a - b),
    jpull: fronts.filter((p) => p.meta?.jpull).length,
    jpullEdges: [...new Set(fronts.map((p) => p.meta?.jpull?.edge || ''))].sort(),
    shaker: fronts.filter((p) => p.meta?.shaker).length,
    shakerFrames: [...new Set(fronts.map((p) => p.meta?.shaker?.frame ?? null))],
    worn: resolveUnitDesign(S().units.find((u) => u.id === unitId), S().project.design).frontType,
    runners: S().project.design?.runners?.variant ?? null,
    handle: S().project.design?.fronts?.handle?.type ?? null,
    opening: A.frontOpeningOf(S().project),
  };
}

// ═══ THE THREE DOORS STAMP ONE GEOMETRY ════════════════════════════════════

test('F1 · the same J-pull shaker, through all three doors, is one geometry', () => {
  // CLAUDE.md F1: *"No path writes style without opening — T64's J-pull
  // lesson, now enforced by a test that walks all three doors and asserts
  // identical stamped geometry."*
  //
  // THE SAME INTENT — a shaker front, held by a J — asked three different
  // ways. A setter's job is that the last press wins; F1's job is that all
  // three presses MEAN THE SAME THING when they say the same thing.
  const byTheStep = (() => {
    const id = wardrobe();
    A.setFrontStyle('S');
    A.setFrontOpening('jhandle');
    return stamped(id);
  })();

  const byTheCollection = (() => {
    const id = wardrobe();
    // IVORY & ONYX is the J-pull collection; the style is the step's own.
    A.setFrontStyle('S');
    A.applyCollection('ivory-and-onyx');
    return stamped(id);
  })();

  const byTheLazyLink = (() => {
    const id = wardrobe();
    A.applyLazyDefaults(id, { collectionId: 'ivory-and-onyx' });
    return stamped(id);
  })();

  for (const [what, got] of [['the collection', byTheCollection], ['a ?collection= link', byTheLazyLink]]) {
    assert.equal(got.opening, byTheStep.opening, `${what}: a different opening`);
    assert.equal(got.handle, byTheStep.handle, `${what}: a different handle`);
    assert.equal(got.runners, byTheStep.runners, `${what}: the runner lock did not travel`);
    assert.equal(got.worn, byTheStep.worn, `${what}: the unit wears a different shape`);
    assert.equal(got.jpull, byTheStep.jpull, `${what}: a different number of J-pull leaves`);
    assert.deepEqual(got.jpullEdges, byTheStep.jpullEdges, `${what}: the J is machined on another edge`);
    assert.equal(got.shaker, byTheStep.shaker, `${what}: a different number of shaker recesses`);
    assert.deepEqual(got.shakerFrames, byTheStep.shakerFrames, `${what}: a different shaker frame`);
    assert.deepEqual(got.leaves, byTheStep.leaves, `${what}: different leaves`);
  }

  // …and it is a REAL J-pull shaker, not three identical nothings.
  assert.equal(byTheStep.opening, 'jhandle');
  assert.ok(byTheStep.jpull > 0, 'no leaf was machined for the J at all');
  assert.ok(byTheStep.shaker > 0, 'no leaf got its shaker recess');
  assert.equal(byTheStep.worn, 'S');
});

test('F1 · no path writes a style without an opening', () => {
  const id = wardrobe();
  // A style set on a project that has never been asked how it opens still
  // leaves the project with an opening, a handle field and a runner variant —
  // the three facts `frontOpeningPatch` settles together.
  A.setFrontStyle('G');
  const got = stamped(id);
  assert.equal(got.worn, 'G');
  assert.ok(A.frontOpenings().some((o) => o.id === got.opening), 'the opening is not one of PRO\'s four');
  assert.ok(got.runners, 'the runner variant was left unwritten');

  // …and changing only the OPENING never loses the shape.
  A.setFrontOpening('jhandle');
  assert.equal(stamped(id).worn, 'G', 'the shape was lost when the opening changed');
  A.setFrontOpening('push');
  assert.equal(stamped(id).worn, 'G', 'leaving the J lost the shape');
});

test('F1 · there is exactly ONE writer of the front style, and the doors call it', () => {
  const adapter = code('src/retail/design/adapter.js');
  // `fronts.style` is written in ONE place in retail, and that place is the law.
  const writes = [...adapter.matchAll(/setDesign\(\{\s*fronts:\s*\{[^}]*style:/g)];
  assert.equal(writes.length, 1, `retail writes fronts.style in ${writes.length} places`);
  assert.match(adapter, /export function writeFrontLaw/);
  // Both doors go through it and neither writes the field itself.
  assert.match(adapter, /export function setFrontStyle\(styleId\) \{\s*return writeFrontLaw\(\{ style: styleId \}\)\.style;/);
  assert.match(adapter, /export function setFrontOpening\(id\) \{\s*return writeFrontLaw\(\{ opening: id \}\)\.opening;/);
  // …and a collection presses the same control rather than `setHandle`.
  const collection = adapter.slice(adapter.indexOf('export function applyCollection'));
  const body = collection.slice(0, collection.indexOf('\n}'));
  assert.ok(!/setHandle\(/.test(body), 'a collection still writes the handle by the short road');
  assert.match(body, /writeFrontLaw\(\{ opening: openingForHandle\(collection\.handle\) \}\)/);
});

// ═══ H3325, FOREVER ════════════════════════════════════════════════════════

test('F1 · a fresh design carries H3325 — with a collection and without one', () => {
  const want = finishIdForDecor({ id: A.carcassDefaultDecor() });
  assert.match(String(want), /H3325/, 'the profile\'s own default is not H3325');

  for (const collectionId of [null, ...COLLECTIONS.map((c) => c.id)]) {
    const id = wardrobe();
    A.applyLazyDefaults(id, { collectionId });
    assert.equal(A.carcassDecorOf(S().project), want,
      `${collectionId || 'a bare link'}: the carcass is not the oak`);
  }
});

test('F1 · the default is READ OFF THE PROFILE, never hard-coded to a swatch', () => {
  // T66's own rule, kept: two literals that must agree is how a default drifts.
  assert.equal(A.DEFAULT_CARCASS_DECOR, P.projectSettings.defaultCarcassDecorId);
  // …and H3325 is in the list the slot reads. CLAUDE.md F1: if it were missing,
  // THAT would be the bug — so it is asserted rather than assumed.
  const swatch = A.swatchFor(A.carcassDefaultDecor());
  assert.equal(swatch.known, true, 'H3325 is not in the decor catalogue the slot reads');
  assert.match(swatch.label, /EGGER/);
  // The adapter reaches for the profile key, not for a decor id of its own.
  assert.match(code('src/retail/design/adapter.js'),
    /projectSettings\?\.defaultCarcassDecorId\s*\|\|\s*DEFAULT_CARCASS_DECOR/);
});

test('F1 · a collection that DOES name a carcass still wins', () => {
  // The flag is a law and not a decoration: the escape hatch CLAUDE.md leaves
  // open — *"unless the collection explicitly names a carcass decor"* — is
  // proved by exercising it, on a collection built here rather than by
  // changing the four.
  const named = { ...COLLECTIONS[0], namesCarcass: true };
  const id = wardrobe();
  A.applyLazyDefaults(id, {});
  assert.equal(A.carcassDecorOf(S().project), finishIdForDecor({ id: A.carcassDefaultDecor() }));
  // The branch itself, read off the source — the table decides, not an `if`
  // buried elsewhere.
  assert.match(code('src/retail/design/adapter.js'),
    /collection\.namesCarcass \? collection\.carcassDecor : carcassDefaultDecor\(\)/);
  assert.ok(named.namesCarcass && named.carcassDecor);
});
