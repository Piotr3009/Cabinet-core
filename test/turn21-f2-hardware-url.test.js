// ─── TURN 21 F2: THE HINGE MODELS ARRIVE — THE URL GETS ITS HOST BACK ───────
//
// The owner's console, the whole diagnosis in one line:
//
//     /hinges/blum/71B3550_42542984.glb  →  404
//
// No Supabase host, no `hardware` bucket: the app asked its OWN domain for the
// file. Turn 20's composer was right about the bucket and the folder and had
// nothing to put in front of them, because the build was made without
// `VITE_SUPABASE_URL` — and it returned the bucket-relative PATH anyway, which
// the GLTFLoader then resolved against the page.
//
// The runners never hit it: their catalogue is bucket-gated, so no host means
// no manifest, no entry and no url. The HINGE catalogue ships in the repository
// (`reference/hardware/cliptop-hinges.json`), so it always has a file to ask
// for — which is why this landed on the hinges and only on the hinges.
//
// Two answers, both asserted here:
//
//   1. A path with no host is NOT a url. `hardwareModelSrc` returns null and
//      the view draws the stand-in. No request leaves the page.
//   2. The host comes back, DERIVED from the app's own decor registry rather
//      than typed — the same derivation `scripts/bucket-live.mjs` uses for R2,
//      which now calls this engine function so the walk and the app cannot
//      disagree about where the bucket is (rule R4).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  hardwareModelSrc, hardwareModelUrl, modelBasename, storageBaseFrom,
} from '../src/engine/hardwareUrl.js';
import { hingeFamilies, hingeModelSrc, hingeModelUrl } from '../src/engine/hinges.js';
import {
  clearRunnerCatalogue, runnerEntry, runnerModelSrc, runnerModelUrl, setRunnerCatalogue,
} from '../src/engine/runners.js';
import { loadHardwareCatalogues, MOVENTO_CATALOGUE } from '../src/lib/hardwareCatalogue.js';
import { derivedStorageBase } from '../src/lib/storageBase.js';
import { parseDecorCatalogue } from '../src/engine/decors.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

const C = P.hardware.hinge.cliptop;
const M = P.hardware.runner.movento;
const BASE = 'https://uhzwyhvwngfnyhxxlvmq.supabase.co/storage/v1/object/public';

loadHardwareCatalogues();

// ─── F2.1 — one helper, two families, host + bucket + folder + basename ─────

test('F2.1 — a hinge url is host + bucket + family folder + basename', () => {
  const family = hingeFamilies(P)[0];
  assert.ok(family?.file, 'the catalogue names a file');
  const url = hingeModelSrc(family, P, BASE);
  assert.equal(url, `${BASE}/${C.bucket}/${C.path}${modelBasename(family.file)}`);
  // The manifest's own folder tree is NOT in the url — only its basename is.
  assert.ok(family.file.includes('cliptop'), 'the catalogue row does carry a tree');
  assert.ok(!url.includes('cliptop'), '…and none of it reaches the url');
  // Host once, bucket once. Turn 18's doubled bucket and turn 19's phantom
  // folder are both the same failure and both are excluded by construction.
  assert.equal(url.split('/hardware/').length, 2, 'the bucket appears exactly once');
  assert.ok(url.startsWith('https://'), 'and there IS a host');
});

test('F2.1 — a runner url composes exactly the same way, from the same helper', () => {
  const parsed = setRunnerCatalogue(MOVENTO_CATALOGUE);
  const first = parsed.files[0];
  const entry = runnerEntry({
    system: M.system, nl: first.nl, variant: first.variant, side: first.side,
  });
  assert.ok(entry?.file, 'the manifest names a file');
  assert.equal(
    runnerModelSrc(entry, P, BASE),
    `${BASE}/${M.bucket}/${M.path}${modelBasename(entry.file)}`,
  );
  // Same helper, same shape — the two families cannot drift apart the way turn
  // 19 and turn 20 let them.
  assert.equal(
    hardwareModelSrc({
      file: entry.file, bucket: M.bucket, path: M.path, storageBase: BASE,
    }),
    runnerModelSrc(entry, P, BASE),
  );
  clearRunnerCatalogue();
});

test('F2.1 — a third copy is impossible: both families go through ONE function', () => {
  const hinges = readFileSync(new URL('../src/engine/hinges.js', import.meta.url), 'utf8');
  const runners = readFileSync(new URL('../src/engine/runners.js', import.meta.url), 'utf8');
  for (const [name, src] of [['hinges', hinges], ['runners', runners]]) {
    assert.ok(src.includes('hardwareModelSrc'), `${name}.js asks the shared helper`);
    // Neither builds a url out of string pieces of its own.
    assert.ok(!/storageBase\s*\}?\s*\)?\s*\}?\s*`/.test(src.replace(/hardwareModel(Src|Url)/g, '')),
      `${name}.js does not compose a url itself`);
  }
});

// ─── F2 — the 404 itself: no host, no url, no request ───────────────────────

test('F2 — a path with no host is NOT a url, and is never fetched', () => {
  const family = hingeFamilies(P)[0];
  // What turn 20 handed the loader — a true PATH, and a 404 as a url.
  assert.equal(hingeModelUrl(family, P, ''), `${C.path}${modelBasename(family.file)}`);
  assert.ok(!hingeModelUrl(family, P, '').startsWith('http'));
  // What turn 21 hands it: nothing at all, which is the stand-in path.
  assert.equal(hingeModelSrc(family, P, ''), null);
  assert.equal(hingeModelSrc(family, P, '   '), null);
  assert.equal(hardwareModelSrc({ file: 'x.glb', bucket: '', path: 'p/', storageBase: BASE }), null);
  assert.equal(hardwareModelSrc({ file: '', bucket: 'hardware', path: 'p/', storageBase: BASE }), null);
});

test('F2 — `hingeModelUrl` keeps its old meaning for everything that is not a fetch', () => {
  // The in-bucket path is still a true and useful answer — the manifest
  // reports and scripts/bucket-live.mjs both want it — so the turn 19/20
  // contract is unchanged and only the FETCHING caller moved.
  const family = hingeFamilies(P)[0];
  assert.equal(hingeModelUrl(family, P, BASE), hingeModelSrc(family, P, BASE));
  assert.equal(hingeModelUrl(null, P, BASE), null);
  assert.equal(runnerModelUrl({ file: 'a/b.glb' }, P, ''), `${M.path}b.glb`);
});

// ─── F2 — the host, derived and not typed ──────────────────────────────────

test('F2 — the storage host is derived from an absolute url, wherever it comes from', () => {
  assert.equal(storageBaseFrom(`${BASE}/decors/egger/H1180_37.jpg`), BASE);
  assert.equal(storageBaseFrom(`${BASE}/hardware/hinges/blum/71B3550.glb`), BASE);
  // Anything that is not an absolute storage url answers '' rather than
  // guessing — a wrong host is worse than no host.
  assert.equal(storageBaseFrom('/decors/egger/H1180_37.jpg'), '');
  assert.equal(storageBaseFrom('https://example.test/nothing/here.jpg'), '');
  assert.equal(storageBaseFrom(''), '');
  assert.equal(storageBaseFrom(null), '');
});

test('F2 — the app can find its own bucket from the decor pack it ships', () => {
  // This is the pack the browser fetches on start, read here as the file it
  // is. R2's derivation, asked of the app's own registry rather than of a
  // script's private copy of it.
  const raw = JSON.parse(readFileSync(new URL('../public/decors/egger/egger-decors.json', import.meta.url), 'utf8'));
  const parsed = parseDecorCatalogue(raw, { basePath: '/decors/egger/' });
  const base = derivedStorageBase(parsed);
  assert.ok(base.startsWith('https://'), 'a real host');
  assert.ok(base.endsWith('/object/public'), 'the public storage root, and nothing past it');
  assert.equal(base, BASE, 'and it is the bucket the workshop actually uses');
  // …which is enough to address a hinge, with no configuration anywhere.
  const url = hingeModelSrc(hingeFamilies(P)[0], P, base);
  assert.ok(url.startsWith(`${BASE}/${C.bucket}/${C.path}`));
  // An empty registry answers '' — "not yet", never a guess.
  assert.equal(derivedStorageBase({ decors: [] }), '');
  assert.equal(derivedStorageBase(null), '');
});

test('F2 — the composed url is exactly what the walk will be handed', () => {
  // R4 in miniature: the strings this turn's verification fetches come from
  // the app's own composer, so a test that passes here is a test about the
  // request the browser makes.
  const family = hingeFamilies(P).find((f) => f.role === 'hinge');
  const plate = hingeFamilies(P).find((f) => f.role === 'plate');
  for (const entry of [family, plate].filter(Boolean)) {
    const url = hingeModelSrc(entry, P, BASE);
    assert.match(url, /^https:\/\/[^/]+\/storage\/v1\/object\/public\/hardware\/hinges\/blum\/[^/]+\.glb$/);
  }
});
