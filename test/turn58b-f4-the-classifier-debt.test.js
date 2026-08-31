import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

import {
  PROBES, STANDARD_CONFIGS, canonical, classify, dump, kitCount, sha256,
} from '../scripts/t58b-classify.mjs';

// ─── TURN 58b · F4 — THE CLASSIFIER DEBT, PAID FOR BOTH TURNS ──────────────
//
// CLAUDE.md: *"t58 shipped without `t58-classify.mjs`. Pay it now."*
//
// A classifier that is never run is a contract nobody signed, so the contract
// is asserted here as well as by the script's own exit code: every probe runs,
// every probe is clean, and UNNAMED counts what it says it counts.

const SRC = readFileSync(new URL('../scripts/t58b-classify.mjs', import.meta.url), 'utf8');

test('F4 · the six standard configs are T34\'s, unchanged — dumps stay comparable', () => {
  assert.deepEqual(
    STANDARD_CONFIGS.map((c) => c.id),
    ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY'],
  );
});

test('F4 · the serialiser cannot let key order masquerade as a delta', () => {
  assert.equal(canonical({ b: 1, a: 2 }), canonical({ a: 2, b: 1 }));
  // …and an added key whose value is undefined still moves the hash.
  assert.notEqual(canonical({ a: 1 }), canonical({ a: 1, b: undefined }));
  assert.equal(canonical([2, 1]), '[2,1]', 'arrays keep their order');
  assert.equal(sha256('x').length, 64);
});

test('F4 · every one of the five named deltas has a probe, and F1 has one too', () => {
  assert.deepEqual(Object.keys(PROBES), ['t58a', 't58b', 't58c', 'f2', 'f3', 'f1']);
});

test('F4 · every probe is CLEAN — no feature of either turn reaches a golden', async () => {
  for (const name of Object.keys(PROBES)) {
    // eslint-disable-next-line no-await-in-loop
    const probe = await PROBES[name]();
    // Two flavours, both of the school: a GOLDENS probe walks the six and then
    // the scene the feature does fire in; a SOURCE probe answers for a feature
    // that touches no engine file, where six cabinets have nothing to say.
    assert.ok(probe.kind === 'source' || probe.rows.length >= 7,
      `${name} tests the six goldens AND the scene the feature does fire in`);
    const dirty = probe.rows.filter((r) => r.ok === false);
    assert.deepEqual(dirty.map((r) => r.id), [], `${name}: ${probe.verdict[1]}`);
    assert.equal(probe.verdict.length, 2, `${name} says what clean and dirty mean`);
  }
});

test('F4 · a probe cannot pass by its feature being dead', async () => {
  // The seventh row of each probe builds the scene the feature DOES fire in,
  // and asserts it fires. Take it away and the probe is a tautology.
  for (const name of Object.keys(PROBES)) {
    // eslint-disable-next-line no-await-in-loop
    const probe = await PROBES[name]();
    const live = probe.kind === 'source' ? probe.rows : probe.rows.slice(6);
    assert.ok(live.length >= 1, `${name} has a does-fire row`);
    assert.ok(live.some((r) => /✓/.test(String(r.cells.join(' ')))),
      `${name}'s does-fire row proves the feature is alive`);
  }
});

test('F4 · UNNAMED counts a moved golden, and zero means zero', () => {
  const base = dump();
  assert.equal(classify(base, base).counts.UNNAMED, 0, 'a dump against itself moves nothing');
  const moved = { ...base, BUD: { ...base.BUD, sha256: 'deadbeef' } };
  const out = classify(base, moved);
  assert.equal(out.counts.UNNAMED, 1, 'one moved golden is one UNNAMED');
  assert.match(out.rows.join('\n'), /BUD\s+UNNAMED/);
  // A config that THREW has no sha, and a missing sha is never "identical".
  const gone = { ...base, WUD: { error: 'boom' } };
  assert.equal(classify(base, gone).counts.UNNAMED, 1);
});

test('F4 · the LISP census is DERIVED, and it is 14/14', () => {
  const onDisk = readdirSync(new URL('../reference/lisp/', import.meta.url))
    .filter((f) => f.toLowerCase().endsWith('.lsp')).length;
  assert.equal(kitCount('reference/lisp'), onDisk);
  assert.equal(onDisk, 14, 'no geometry law changed, so no kit moved');
});

test('F4 · the file argues BOTH turns, and names its two bases', () => {
  assert.match(SRC, /THE BYTE-IDENTITY CONTRACT FOR TURN 58b — AND FOR TURN 58/);
  assert.match(SRC, /6c50653/, 'T58\'s own base');
  assert.match(SRC, /c6a5969/, 'T58b\'s base');
  // Five named deltas, each argued by name.
  for (const claim of [
    'THE PHANTOM HINGE COLUMN', 'THE SHOE INSERT', 'THE TOP INFILL',
    'THE PANE SHELF', 'THE PER-LEAF J RUN',
  ]) {
    assert.ok(SRC.includes(claim), `${claim} is argued in the header`);
  }
  assert.match(SRC, /IF A GOLDEN MOVED:  iron rule/);
  assert.match(SRC, /UNNAMED:          \$\{counts\.UNNAMED\}/);
});

test('F4 · nothing this turn added is imported at the top level', () => {
  // `--dump` has to run on a checkout that predates this turn, so the probes
  // fetch tonight's exports lazily and the dump needs none of them.
  const head = SRC.slice(0, SRC.indexOf('export const STANDARD_CONFIGS'));
  const top = (head.match(/^import .*$/gm) || []).join('\n');
  assert.match(top, /from '\.\.\/src\/engine\/profile\.js'/);
  assert.match(top, /from '\.\.\/src\/engine\/cabinet\.js'/);
  assert.match(top, /from '\.\.\/src\/engine\/types\.js'/);
  for (const late of ['ledStrips.js', 'watchDrawer.js', 'runs.js', 'doors.js', 'handles.js']) {
    assert.ok(!top.includes(late), `${late} is fetched when a probe needs it, not at load`);
  }
});
