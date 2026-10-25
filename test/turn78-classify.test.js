// === TURN 78 . THE CLASSIFIER'S OWN DEBT ======================================
//
// CLAUDE.md T78, FROZEN 1: "`scripts/t78-classify.mjs` names every engine
// delta and proves no golden can reach it." A classifier nobody runs is a
// contract nobody signed (T58b, T61), so the suite runs it as the integrator
// does, as a child process with no flag (THE STRICT RUN), and asserts the exit
// code and the lines of its table. The run needs the base commit (the owner's
// "tura spray i cabneo", 16477df) in the clone: a shallow clone without it has
// no base to diff against, and the test SKIPS saying so rather than passing
// on a diff that read short.
//
// Three things are asserted without the run, so a clone without the base still
// holds the classifier to its shape: the fragments are read from the directory
// by pattern (a fragment landing later is picked up, nothing is listed by
// name), the base is the owner's commit, and the flag and the re-pin verdict
// exist in the source.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const ROOT = new URL('../', import.meta.url).pathname;
const SCRIPT = `${ROOT}scripts/t78-classify.mjs`;
const SRC = readFileSync(SCRIPT, 'utf8');
const BASE_COMMIT = '16477dfef32e0a2a38411a35f56a760e8c9d88f2';

const git = (args) => spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
const hasBase = git(['rev-parse', '--verify', '--quiet', `${BASE_COMMIT}^{commit}`]).status === 0;
const SKIP = hasBase ? false
  : `the base commit ${BASE_COMMIT.slice(0, 7)} (the owner's "tura spray i cabneo") is not in this clone: `
    + 'the classifier has no base to diff against; fetch the full history (git fetch --unshallow) and run again';

// The classifier is a 5 to 10 second child that reads the whole tree and
// every golden. Under the full suite (four files at once on four cores) a
// run once came back cut mid-table with no stderr, status null: a child the
// runner's reaper reached. So the helper records status and signal, tries a
// second time when the child did not END (a signal or a spawn error, never a
// non-zero exit of its own), and puts the diagnosis in the output a failing
// assertion prints.
const run = (...args) => {
  let r = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    r = spawnSync(process.execPath, [SCRIPT, ...args], {
      cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, NODE_NO_WARNINGS: '1' },
    });
    const ended = r.status != null && !r.signal && !r.error;
    if (ended) break;
    r.diagnosis = `attempt ${attempt}: the classifier did not end on its own (status ${r.status}, signal ${r.signal}, error ${r.error ? r.error.message : 'none'})`;
  }
  const out = `${r.stdout || ''}${r.stderr || ''}${r.diagnosis ? `\n[${r.diagnosis}]\n` : ''}`;
  return { status: r.status, signal: r.signal, out };
};

test('T78 classify . the fragments are read from the directory by pattern, not listed by name', () => {
  assert.match(SRC, /new URL\('\.\/t78-classify\.d\/', import\.meta\.url\)/, 'the fragment directory');
  assert.match(SRC, /readdirSync\(FRAGMENT_DIR\)\.filter\(\(n\) => \/\^f\\d\\d\[a-z0-9-\]\*\\\.mjs\$\/\.test\(n\)\)\.sort\(\)/,
    'every fNN*.mjs under scripts/t78-classify.d/ is merged, so f21.mjs is picked up the night it lands');
  assert.ok(!/f21\.mjs|f22\.mjs|f20-biscuit\.mjs/.test(SRC), 'no fragment is named in the classifier itself');
  assert.match(SRC, new RegExp(`const BASE_COMMIT = '${BASE_COMMIT}'`), 'the base is the owner\'s commit, not a branch');
  assert.match(SRC, /tura spray i cabneo/, 'the base is named by the owner\'s own subject');
});

test('T78 classify . the flag, the re-pin verdict and the exit are in the source', () => {
  assert.match(SRC, /--allow-unnamed/, 'the integrator\'s intermediate flag');
  assert.match(SRC, /'RE-PINNED \(named\)'/, 'a golden a fragment names in REPINNED is RE-PINNED (named), never MOVED');
  assert.match(SRC, /frag\.REPINNED \|\| \[\]/, 'REPINNED is read from the fragments');
  assert.match(SRC, /process\.exit\(okAll \? 0 : 1\)/, 'RED exits 1');
  assert.match(SRC, /import \{ T78_GOLDENS \} from '\.\/t78-goldens\.mjs'/, 'the T78 goldens come through scripts/t78-goldens.mjs');
  assert.match(SRC, /import \{ T75_GOLDENS \} from '\.\/t75-goldens\.mjs'/, 'T75\'s through scripts/t75-goldens.mjs');
  assert.match(SRC, /import \{ goldenOf \} from '\.\/t75-golden\.mjs'/, 'and the one summary function');
  assert.match(SRC, /import \{ dump \} from '\.\/t64-classify\.mjs'/, 'the six by the T64 dump');
});

test('T78 classify . THE STRICT RUN is green, and its table says what the contract says', { skip: SKIP }, () => {
  const { status, out } = run();
  assert.match(out, /^=== T78 \. THE ENGINE\/LIB DELTAS, AND WHAT THEY REACH ===/m, 'the report opens');
  assert.match(out, /base: 16477df \(the owner's commit, "tura spray i cabneo"/, 'diffed against the owner\'s commit');
  assert.match(out, /allow-unnamed: none \(the strict run\)/, 'no flag');
  // The exit first, so a RED night reads as the FAIL rows and the summary, not the whole table.
  assert.equal(status, 0, `the strict run is RED:\n${out.split('\n').filter((l) => /FAIL|UNNAMED|DEAD|MOVED|^SUMMARY|^RED/.test(l)).join('\n')}`);

  // The six: T78 left five identical and PANTRY re-pinned BY NAME (F15). The
  // chat fix of 17.10.2026 (14:15, the owner: *"lustro bottom i top, prosze,
  // koduj"*) re-pins all six BY NAME (f32: the TOP drawn from its underside);
  // PANTRY carries both names. None MOVED.
  for (const id of ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4']) {
    assert.match(out, new RegExp(`^  ${id}\\s+RE-PINNED \\(named\\)\\s+[0-9a-f]{64}\\s+f32-owner-1710d\\.mjs: Owner 17\\.10\\.2026`, 'm'),
      `${id} is re-pinned by name (f32), not MOVED`);
  }
  assert.match(out, /^  PANTRY\s+RE-PINNED \(named\)\s+[0-9a-f]{64}\s+f15\.mjs: T78 F15.*f32-owner-1710d\.mjs: Owner 17\.10\.2026/m,
    'PANTRY\'s re-pin is named by f15 and by f32, shown as RE-PINNED (named) and not MOVED');
  assert.match(out, /six IDENTICAL=0 RE-PINNED\(named\)=6 MOVED=0/);

  // Every delta named, every gate live, every golden held.
  assert.match(out, /not named: 0 \(allowed: 0\)/, 'every engine/lib delta is named by a fragment');
  assert.match(out, /named and unspent: 0/, 'every licence is spent');
  assert.match(out, /unknown gates: 0/);
  assert.match(out, /goldens opening a gate unheld: 0/, 'what a golden reaches a golden holds');
  assert.match(out, /every gate live: true \((\d+)\/\1\)/, 'every gate opens on a crafted cabinet');
  assert.match(out, /T75 goldens: (\d+)\/\1 /, 'T75\'s goldens re-made and byte-identical');
  assert.match(out, /T76 decoration records: (\d+)\/\1 \(the styles agree\)/, 'T76\'s decoration file record by record');
  assert.match(out, /T77 proposals: 4\/4/, 'T77\'s four ornate proposals, named and not pinned');
  assert.match(out, /T78 goldens: (\d+)\/\1 /, 'T78\'s own goldens through scripts/t78-goldens.mjs');
  assert.match(out, /fixtures moved and not named: 0/, 'every moved fixture is named in a REPINNED list');
  assert.match(out, /LISP existing amended unlicensed: 0 \. LISP unbalanced: 0/, 'FROZEN 2');
  assert.match(out, /lighting touched: 0/, 'FROZEN 4');
  assert.match(out, /biscuits frozen: true/, 'FROZEN 5');

  // The COMMIT section lists the turn's commits with their F.
  assert.match(out, /^=== THE COMMITS OF THE TURN \(git log BASE\.\.HEAD --oneline\) ===/m);
  assert.match(out, /^  F1\s+[0-9a-f]{7,} T78 F1: nothing could be added left of an L/m, 'F1\'s commit, named with its F');
  assert.match(out, /^  F2\s+[0-9a-f]{7,} T78 F2: the L worktop and the L mask are L-shaped/m);

  assert.match(out, /^GREEN: every delta is named, every gate is live, and what a golden reaches a golden holds$/m);
});

test('T78 classify . the --allow-unnamed flag is parsed and printed, and allows nothing it does not match', { skip: SKIP }, () => {
  const { out } = run('--allow-unnamed', '^never-a-file$');
  assert.match(out, /allow-unnamed: \/\^never-a-file\$\/ \(an intermediate run; the strict run passes no flag\)/);
  assert.match(out, /\(allowed: 0\)/, 'a regex matching no file allows nothing');
});
