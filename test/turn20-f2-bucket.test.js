// ─── TURN 20 F2: THE HARDWARE BUCKET, READ AS IT ACTUALLY IS ────────────────
//
// Three defects stacked, and all three are the same mistake: three documents
// agreed with each other about where the owner's files are, and the bucket
// disagreed with all three.
//
//   1. the runner path carried the BUCKET'S OWN NAME as well, so every request
//      went to `…/public/hardware/hardware/runners/…` and came back 400;
//   2. the hinge path carried the bucket name AND a `cliptop/` folder nobody
//      ever created;
//   3. the manifests name each `file` with a path that exists nowhere and carry
//      no per-row `system`, so the parser dropped every row and the match
//      filtered on a word the file never says.
//
// ─── R3: THE REAL MANIFEST IS A TEST FIXTURE ────────────────────────────────
// The parser is run over VERBATIM COPIES of the owner's own uploads
// (test/fixtures/bucket/, see the README there for provenance), not over a
// tidy fixture written to match the parser. That is the whole point: the two
// diverged silently in turn 18 and nothing failed.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  clearRunnerCatalogue, parseRunnerManifest, runnerEntry, runnerModelUrl, runnerPairSpec,
  setRunnerCatalogue,
} from '../src/engine/runners.js';
import {
  clearHingeCatalogue, hingeFamilies, hingeModelUrl, parseHingeCatalogue, setHingeCatalogue,
} from '../src/engine/hinges.js';
import { hardwareModelUrl, modelBasename } from '../src/engine/hardwareUrl.js';
import { DEFAULT_CABINET_PROFILE as P, PROFILE_SCHEMA, migrateCabinetProfile } from '../src/engine/profile.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const readBucket = (name) => JSON.parse(readFileSync(join(HERE, 'fixtures', 'bucket', name), 'utf8'));

const RUNNER_MANIFEST = readBucket('runners-blum-movento-manifest.json');
const HINGE_MANIFEST = readBucket('hinges-blum-manifest.json');

// The public storage host, DERIVED rather than typed — the same way R2 asks the
// walk to derive it: the EGGER decor pack in the repository carries absolute
// `tex` URLs and the first of them names the host.
function derivedStorageBase() {
  const pack = JSON.parse(readFileSync(join(HERE, '..', 'public', 'decors', 'egger', 'egger-decors.json'), 'utf8'));
  const find = (node) => {
    if (!node || typeof node !== 'object') return null;
    if (typeof node.tex === 'string' && node.tex.startsWith('http')) return node.tex;
    for (const value of Object.values(node)) {
      const hit = find(value);
      if (hit) return hit;
    }
    return null;
  };
  const tex = find(pack);
  assert.ok(tex, 'the decor pack carries an absolute texture URL to derive the host from');
  return tex.slice(0, tex.indexOf('/object/public') + '/object/public'.length);
}

const BASE = derivedStorageBase();

// ─── F2.1 / F2.2 — the two paths ────────────────────────────────────────────

test('F2.1 — the runner path is BUCKET-RELATIVE, and the manifest URL is the live one', () => {
  const M = P.hardware.runner.movento;
  assert.equal(M.bucket, 'hardware');
  assert.equal(M.path, 'runners/blum/movento/');
  assert.ok(!M.path.startsWith('hardware/'), 'the bucket name is not in the path as well');
  assert.equal(
    `${BASE}/${M.bucket}/${M.path}${M.manifest}`,
    `${BASE}/hardware/runners/blum/movento/manifest.json`,
  );
});

test('F2.2 — the hinge pack is at hinges/blum/, with no cliptop level', () => {
  const C = P.hardware.hinge.cliptop;
  assert.equal(C.bucket, 'hardware');
  assert.equal(C.path, 'hinges/blum/');
  assert.ok(!C.path.includes('cliptop'), 'the owner never created that folder');
  assert.ok(!C.path.startsWith('hardware/'));
});

test('F2.1/F2.2 — a profile saved before this turn comes back on the corrected paths', () => {
  // The doubled paths were SHIPPED, so they are in stored profiles. Neither is
  // a workshop choice — they are where the owner's bucket actually is — so a
  // migration that kept them would keep the 400.
  const stored = migrateCabinetProfile({
    schema: PROFILE_SCHEMA,
    hardware: {
      runner: { movento: { path: 'hardware/runners/blum/movento/' } },
      hinge: { cliptop: { path: 'hardware/hinges/blum/cliptop/' } },
    },
  });
  assert.equal(stored.hardware.runner.movento.path, 'runners/blum/movento/');
  assert.equal(stored.hardware.hinge.cliptop.path, 'hinges/blum/');
});

// ─── F2.3 — the parser, over the owner's own files ──────────────────────────

test('F2.3/R3 — all 40 runner rows survive the LIVE manifest', () => {
  const parsed = parseRunnerManifest(RUNNER_MANIFEST);
  assert.ok(parsed, 'the manifest parses at all');
  assert.equal(parsed.files.length, 40, 'forty rows in, forty rows out');
  // Not one of them says `system`; every one of them inherits the header.
  assert.ok(RUNNER_MANIFEST.items.every((row) => row.system === undefined));
  assert.ok(parsed.files.every((f) => f.system === RUNNER_MANIFEST.system));
  // The article numbers are the reason the file exists.
  assert.ok(parsed.files.every((f) => /^\d+$/.test(f.article)));
});

test('F2.3/R3 — every runner URL is the manifest’s own folder + the basename', () => {
  clearRunnerCatalogue();
  const parsed = setRunnerCatalogue(RUNNER_MANIFEST);
  for (const entry of parsed.files) {
    const url = runnerModelUrl(entry, P, BASE);
    const name = modelBasename(entry.file);
    assert.ok(/^[\w.]+\.glb$/.test(name), `a real basename: ${name}`);
    assert.equal(url, `${BASE}/hardware/runners/blum/movento/${name}`);
    // The disease the manifest carries, named: its own `file` is a path that
    // exists nowhere, and NONE of it reaches the URL.
    assert.ok(entry.file.startsWith('hardware/'));
    assert.ok(!url.includes('/hardware/hardware/'), 'the bucket is not doubled');
    assert.equal(url.split('/hardware/').length, 2, 'the tree appears exactly once');
  }
  clearRunnerCatalogue();
});

test('F2.3 — the match keys on nl/variant/side, not on a word the rows never say', () => {
  clearRunnerCatalogue();
  setRunnerCatalogue(RUNNER_MANIFEST);
  // `760H` is the profile's system string and the manifest's header says
  // `movento`. Before this turn that mismatch emptied the list in silence.
  const entry = runnerEntry({ system: P.hardware.runner.movento.system, nl: 400, variant: 'T' });
  assert.ok(entry, 'a 400 TIP-ON is found');
  assert.equal(entry.nl, 400);
  assert.equal(entry.variant, 'T');
  // …and the BOM gets its article numbers, which is the point of the file.
  const spec = runnerPairSpec({ nl: 400, variant: 'T', profile: P });
  assert.equal(spec.nl, 400);
  assert.ok(spec.articles.L, 'the pair has an article');
  clearRunnerCatalogue();
});

test('F2.3 → TURN 25 (F9): the two ladders MEET now, and here is where', () => {
  // Turn 20 found a fourth defect by reading the pack rather than the documents
  // about it, and deliberately did not fix it: the app chose a runner's nominal
  // length off `wardrobe.drawers.depthSteps` (390…690 — the LISP's drawer BOX
  // lengths) while the owner's MOVENTO pack carries 250…450, so the two ladders
  // did not intersect AT ALL. With the paths corrected the catalogue loaded, the
  // URLs resolved, and no cabinet in the app could match a row. It was pinned
  // here "so the day it is fixed this test says so".
  //
  // ─── THIS IS THAT DAY (turn 25, CLAUDE.md F9) ────────────────────────────
  // The owner asked for NL 250, 270, 300, 320, 350 and 380 by name, and every
  // one of them is in the pack. The assertion is INVERTED rather than deleted:
  // what was "they must not meet" is now "they meet at exactly these six", so
  // the day somebody trims the ladder this test says so too.
  clearRunnerCatalogue();
  const parsed = setRunnerCatalogue(RUNNER_MANIFEST);
  const packLadder = new Set(parsed.files.map((f) => f.nl));
  const appLadder = P.wardrobe.drawers.depthSteps;
  assert.deepEqual(
    appLadder.filter((step) => packLadder.has(step)),
    [250, 270, 300, 320, 350, 380],
    'the owner’s six short runners are the ladders’ meeting point',
  );
  clearRunnerCatalogue();
});

test('F2.3 — a row that cannot say WHICH runner it is is still dropped', () => {
  const parsed = parseRunnerManifest({
    system: 'movento',
    items: [
      { file: 'a.glb', nl: 450, variant: 'T', article: '1' },
      { file: 'b.glb', variant: 'T', article: '2' },        // no nl
      { file: 'c.glb', nl: 450, article: '3' },              // no variant
      { nl: 450, variant: 'T', article: '4' },               // no file
    ],
  });
  assert.equal(parsed.files.length, 1, 'half an entry is how a workshop buys the wrong runner');
});

test('F2.3/R3 — all 19 hinge rows survive, with real basenames and resolvable URLs', () => {
  clearHingeCatalogue();
  const parsed = parseHingeCatalogue(HINGE_MANIFEST);
  assert.equal(parsed.items.length, 19, 'nineteen rows in, nineteen rows out');
  setHingeCatalogue(HINGE_MANIFEST);
  for (const item of parsed.items) {
    const url = hingeModelUrl(item, P, BASE);
    const name = modelBasename(item.file);
    assert.ok(/\.glb$/.test(name), `a real basename: ${name}`);
    assert.equal(url, `${BASE}/hardware/hinges/blum/${name}`);
    assert.ok(!url.includes('cliptop'), 'the folder turn 19 invented is gone');
    assert.ok(!url.includes('/hardware/hardware/'));
  }
  // And the families the view actually asks for resolve to a file.
  const families = hingeFamilies({ angle: 110, finish: 'nickel' });
  assert.ok(families.length, 'the 110° nickel hinge is in the pack');
  assert.ok(hingeModelUrl(families[0], P, BASE).endsWith('.glb'));
  clearHingeCatalogue();
});

// ─── the rule itself ────────────────────────────────────────────────────────

test('F2.3 — the basename rule survives every shape a manifest might use', () => {
  assert.equal(modelBasename('hardware/blum/movento/760H4500T_1.glb'), '760H4500T_1.glb');
  assert.equal(modelBasename('760H4500T_1.glb'), '760H4500T_1.glb');
  assert.equal(modelBasename('C:\\packs\\blum\\71B3550.glb'), '71B3550.glb');
  assert.equal(modelBasename(''), '');
  assert.equal(modelBasename(null), '');
});

test('F2.3 — with no storage host the path is still true, and has no host on it', () => {
  assert.equal(
    hardwareModelUrl({ file: 'x/y/z.glb', bucket: 'hardware', path: 'hinges/blum/' }),
    'hinges/blum/z.glb',
  );
  assert.equal(hardwareModelUrl({ file: '', bucket: 'hardware', path: 'hinges/blum/' }), null);
});

test('F2 — none of this reaches a hole: it is where a file is, not where a hole is', () => {
  // The paths and the parser are display and purchasing. The proof that they
  // cannot move a drilling is that the engine never asks them anything while
  // computing: `computeCabinet` imports neither URL builder.
  const source = readFileSync(join(HERE, '..', 'src', 'engine', 'cabinet.js'), 'utf8');
  assert.ok(!source.includes('runnerModelUrl'));
  assert.ok(!source.includes('hingeModelUrl'));
});
