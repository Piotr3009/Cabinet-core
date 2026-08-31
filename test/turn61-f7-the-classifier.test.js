// ─── TURN 61 · THE CLASSIFIER'S OWN DEBT ───────────────────────────────────
//
// Modelled on `test/turn58b-f4-the-classifier-debt.test.js`, whose argument is
// the one that matters: *"a probe cannot pass by its feature being dead."* A
// classifier that asserts nothing passes everything, and a probe whose feature
// is switched off is a tautology wearing a tick.
//
// So the suite runs the classifier's own questions, and — the half T61 has to
// add — checks the one thing this turn's classifier says that T59's and T60's
// could not: that THREE engine files moved, all three licensed by name, and
// none of them reachable from a golden.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { dump } from '../scripts/t61-classify.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

test('the six configurations are the SAME six, and every one computes', () => {
  const d = dump();
  assert.deepEqual(Object.keys(d).sort(),
    ['BUD', 'BUDR', 'BUDR4', 'PANTRY', 'WARDROBE', 'WUD'].sort(),
    'the classifier changed its own question — a turn marking its own homework');
  for (const [id, row] of Object.entries(d)) {
    assert.ok(!row.error, `${id} did not compute: ${row.error}`);
    assert.match(row.sha256, /^[0-9a-f]{64}$/, `${id} has no hash`);
  }
});

test('a hash follows the geometry — the classifier is not a constant', () => {
  // The dump is only worth anything if a moved board moves a hash. Asked here
  // rather than trusted: two DIFFERENT configurations must not share one.
  const d = dump();
  const hashes = Object.values(d).map((r) => r.sha256);
  assert.equal(new Set(hashes).size, hashes.length,
    'two different cabinets hash the same — the digest is not reading the result');
});

test('the engine probe names the three files, and refuses a fourth', () => {
  const script = read('scripts/t61-classify.mjs');
  assert.match(script,
    /const LICENSED = \['src\/engine\/room\.js', 'src\/engine\/design\.js', 'src\/engine\/projectTypes\.js'\];/,
    'the whitelist is not CLAUDE.md\'s three');
  // The half that makes the whitelist honest: anything else under src/engine
  // is a finding, not a pass.
  assert.match(script, /const strays = moved\.filter\(\(f\) => !LICENSED\.includes\(f\)\);/);
  assert.match(script, /cells: \[strays\.length \? strays\.join\(' '\) : 'nothing', 'nothing'\],\s*\n\s*ok: strays\.length === 0,/);
});

test('the cut path really does not ask a scope — the probe\'s own claim', () => {
  // This is the sentence the whole byte-identity argument rests on, so it is
  // checked here as well as in the probe: `computeCabinet` takes a unit's
  // params and the profile. It is never handed a room.
  const cabinet = read('src/engine/cabinet.js');
  assert.ok(!/\bwallsInScope\b/.test(cabinet), 'the cut path asks which walls are in scope');
  assert.ok(!/\bnormaliseScope\b/.test(cabinet), 'the cut path normalises a scope');
  assert.ok(!/design\??\.scope/.test(cabinet), 'the cut path reads design.scope');
});

test('the chrome probe wants ELEVEN channels — it cannot pass by them being off', () => {
  const script = read('scripts/t61-classify.mjs');
  const at = script.indexOf('const CHANNELLED = {');
  const table = script.slice(at, script.indexOf('};', at));
  for (const part of ['dimensions', 'measure', 'drill', 'plus', 'machining',
    'led-icons', 'hover-dims', 'edge', 'share']) {
    assert.ok(table.includes(`chromeOn('${part}')`), `the probe does not check the '${part}' channel`);
  }
  assert.match(script, /cells: \[`\$\{guards\.length\}`, '11'\], ok: guards\.length === 11/);
  assert.match(script, /cells: \[`\$\{claimedParts\.length\}`, '11'\], ok: claimedParts\.length === 11/);
});
