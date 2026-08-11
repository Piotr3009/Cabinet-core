// ─── TURN 22 F3 — hardware health, without DevTools ─────────────────────────
//
// "The owner has diagnosed two turns from his console. Give him the line in the
// app instead."
//
// What is proved here is the two halves of F3.1: the numbers are read from the
// EXISTING registries (and are right), and nothing here fetches — a health line
// that went and looked would be reporting on its own requests rather than on
// the app's, which is exactly the mistake R4 exists to stop.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { hardwareHealth, hardwareHealthLine } from '../src/lib/hardwareHealth.js';
import { clearHardwareSources, resolveHardwareCatalogue } from '../src/lib/hardwareSource.js';
import { clearHingeCatalogue, hingeCatalogue, setHingeCatalogue } from '../src/engine/hinges.js';
import { clearRunnerCatalogue, runnerCatalogue, setRunnerCatalogue } from '../src/engine/runners.js';
import { clearGlbSources, glbSource, glbStats } from '../src/3d/glbSource.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

const fixture = (name) => JSON.parse(
  readFileSync(new URL(`./fixtures/bucket/${name}`, import.meta.url), 'utf8'),
);
const RUNNERS = fixture('runners-blum-movento-manifest.json');
const HINGES = fixture('hinges-blum-manifest.json');

const reset = () => {
  clearHardwareSources();
  clearRunnerCatalogue();
  clearHingeCatalogue();
  clearGlbSources();
};

test('F3.1 the row names every family, with its own short name', () => {
  reset();
  const rows = hardwareHealth(P);
  assert.deepEqual(rows.map((r) => r.family), ['runners', 'hinges', 'lifts']);
  assert.deepEqual(rows.map((r) => r.short), ['Movento', 'CLIP top', 'AVENTOS']);
  reset();
});

test('F3.1 "expected" is what the CATALOGUE names — read, never counted twice', () => {
  reset();
  setRunnerCatalogue(RUNNERS);
  setHingeCatalogue(HINGES);
  const rows = hardwareHealth(P);
  const runners = rows.find((r) => r.family === 'runners');
  const hinges = rows.find((r) => r.family === 'hinges');
  // The SAME number the registries carry — not a copy of it in this module.
  assert.equal(runners.expected, runnerCatalogue().files.filter((f) => f.file).length);
  assert.equal(hinges.expected, hingeCatalogue().items.filter((i) => i.file).length);
  assert.ok(runners.expected > 0 && hinges.expected > 0);
  reset();
});

test('F3.1 with no catalogue at all the row says 0/0 rather than lying', () => {
  reset();
  const rows = hardwareHealth(P);
  for (const r of rows) {
    assert.equal(r.expected, 0);
    assert.equal(r.loaded, 0);
    assert.equal(r.failed, 0);
  }
  assert.equal(hardwareHealthLine(rows), '');
  reset();
});

test('F3.1 the SOURCE is the answer the resolver settled on — db / bucket / mock', async () => {
  reset();
  const answer = await resolveHardwareCatalogue({
    family: 'hinges', profile: P, readRow: async () => null, fetchImpl: null, storageBase: '',
  });
  assert.equal(answer.source, 'mock');
  assert.equal(hardwareHealth(P).find((r) => r.family === 'hinges').source, 'mock');

  reset();
  await resolveHardwareCatalogue({
    family: 'hinges',
    profile: P,
    readRow: async () => ({ manifest: HINGES }),
    fetchImpl: null,
    storageBase: '',
  });
  assert.equal(hardwareHealth(P).find((r) => r.family === 'hinges').source, 'db');

  // A family nobody has asked about says so, rather than claiming "mock".
  assert.equal(hardwareHealth(P).find((r) => r.family === 'runners').source, null);
  reset();
});

test('F3.1 loaded / failed come from the DECODE CACHE, per family folder', async () => {
  reset();
  setRunnerCatalogue(RUNNERS);
  // An unreachable host, so the loader gives up quickly and deterministically.
  // The PATHS are the profile's own, because the row buckets by folder.
  const base = 'https://cabinet-core.invalid/storage/v1/object/public';
  const M = P.hardware.runner.movento;
  const C = P.hardware.hinge.cliptop;
  glbSource(`${base}/${M.bucket}/${M.path}one.glb`);
  glbSource(`${base}/${M.bucket}/${M.path}two.glb`);
  glbSource(`${base}/${C.bucket}/${C.path}hinge.glb`);

  // The ASK is recorded at once — which is the half that matters for "no new
  // fetching": the row counts what the app already asked for.
  const asked = hardwareHealth(P);
  assert.equal(asked.find((r) => r.family === 'runners').asked, 2,
    'this family’s own folder, and nobody else’s');
  assert.equal(asked.find((r) => r.family === 'hinges').asked, 1);
  assert.equal(glbStats().asked, 3);

  // …and the verdict arrives when the loader gives up.
  for (let i = 0; i < 40 && glbStats().pending > 0; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => { setTimeout(r, 50); });
  }
  const rows = hardwareHealth(P);
  const runners = rows.find((r) => r.family === 'runners');
  assert.equal(runners.loaded + runners.failed + runners.pending, 2, 'every ask is in exactly one state');
  if (runners.failed > 0) {
    assert.ok(runners.firstFailure.includes(M.path), 'the FIRST failing url, copyable');
  }
  reset();
});

test('F3.1 a model nobody has needed yet is neither loaded nor failed', () => {
  reset();
  setRunnerCatalogue(RUNNERS);
  const row = hardwareHealth(P).find((r) => r.family === 'runners');
  assert.ok(row.expected > 0, 'the catalogue names forty of them');
  assert.equal(row.asked, 0);
  assert.equal(row.failed, 0, 'a project with no drawers must not light the row red');
  reset();
});

test('F3.1 the line reads as the owner wrote it: "Movento 40/40 · CLIP top 19/19"', () => {
  reset();
  setRunnerCatalogue(RUNNERS);
  setHingeCatalogue(HINGES);
  const line = hardwareHealthLine(hardwareHealth(P));
  assert.ok(/^Movento \d+\/\d+ · CLIP top \d+\/\d+$/.test(line), line);
  reset();
});

test('F3.1 it FETCHES NOTHING — the module cannot, by construction', () => {
  const src = readFileSync(new URL('../src/lib/hardwareHealth.js', import.meta.url), 'utf8');
  // `refreshHardwareCatalogues` is F2a's resolution and is allowed to; the
  // health reader is not, and neither is anything else in the file.
  assert.ok(!/\bfetch\s*\(/.test(src), 'no fetch of its own');
  assert.ok(!/XMLHttpRequest|axios/.test(src));
  // What it reads is the three registries and nothing else.
  for (const name of ['hingeCatalogue', 'runnerCatalogue', 'glbStats', 'hardwareSourceOf']) {
    assert.ok(src.includes(name), `it reads ${name}`);
  }
});
