#!/usr/bin/env node
// ─── TURN 76 · THE COPY, AFTER GPT'S EDITS INTO PRO ────────────────────────
//
// CLAUDE.md T76 F6, verbatim: *"GPT edited `scripts/t63-copy.mjs` and
// `t63-copies.mjs` to add `FrontDecorationControls.jsx` and the retail
// `PartDetailModal.jsx` to the manifest. Keep that, then run
// `scripts/t76-copy.mjs` (T75's pattern): every PRO surface this turn edits is
// re-copied, and the script proves the only retail files that moved are the
// copies of the files named. Retail divergences (the design-system skin) are
// listed in the PR by file and line, as every turn since T63."*
//
// T75's machine (`scripts/t75-copy.mjs`), pointed at tonight's list: this file
// NAMES the PRO files T76 edits that have a retail copy, and the retail files
// GPT's patch edited by hand; it runs `scripts/t63-copy.mjs` (the manifest's
// own three mechanical passes and nothing else); then it PROVES, against the
// base of the turn, that
//
//   1. every PRO surface with a copy that moved is named here;
//   2. every file the machine makes is what is on disk (no copy is stale, and
//      the machine would touch no copy that nothing licenses);
//   3. every retail file that moved is a copy of a file named here, or a
//      retail edit named here with its reason;
//
// and it lists, by file and line, each named copy's divergence from its PRO
// file (the skin: imports repointed, classes and colours) and each retail
// edit's lines, for the PR.
//
// `--check` proves without writing: the machine runs untouched in a scratch
// tree (its two script files, `src/components/` and the stylesheet it reads),
// and what it makes there is compared with the disk. Nothing under `src/` is
// written. Without `--check` the same proof runs first; the machine then runs
// in place, unless it would touch a copy nothing licensed.
//
//   node scripts/t76-copy.mjs            prove, make the copies, prove again
//   node scripts/t76-copy.mjs --check    prove only; write nothing

import { execFileSync } from 'node:child_process';
import {
  cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { ALL_COPIES } from './t63-copies.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const check = process.argv.includes('--check');

// THE BASE: origin/main as this turn found it (b810560, "fronty tura"). Named
// as a COMMIT: origin/main moves when the owner merges this turn.
const BASE_COMMIT = 'b810560278e9853555e69fdb7c7b1332284dc28c';

/**
 * THE PRO FILES TONIGHT EDITS THAT HAVE A RETAIL COPY, each with its licence.
 * Every PRO file named here that moved is also an `EXEMPT` entry in
 * `test/turn59-f1-the-switch.test.js` (FROZEN 3), and this script asks the
 * test file so; the hash it is re-frozen at is the test's own proof.
 */
export const T76_PRO_EDITS = [
  {
    pro: 'src/components/PartDetailModal.jsx',
    why: 'GPT patch: Canonical decorative legend colour. A machining line is drawn in the colour of the '
      + 'legend the drawing generates for it. The owner, 9.10.2026: *"gpt robi fronty, reszta my."*',
  },
];

/**
 * THE PRO FILES TONIGHT COPIES FOR THE FIRST TIME: `DECORATIVE_FRONT_COPIES`
 * in the manifest, GPT's, kept per F6. The copy did not exist at the base.
 */
export const T76_NEW_COPIES = [
  {
    pro: 'src/components/FrontDecorationControls.jsx',
    why: 'GPT patch: Editable owner-authorised recipe controls. NEW in PRO, and copied by the machine the '
      + 'night it lands. The owner, 9.10.2026: *"gpt robi fronty, reszta my."*',
  },
];

/**
 * THE RETAIL FILES EDITED BY HAND TONIGHT: not copies (none is in the
 * manifest, so no machine re-makes them), each with its reason.
 */
export const T76_RETAIL_EDITS = [
  {
    retail: 'src/retail/design/FrontThumb.jsx',
    why: 'GPT patch: retail FRONTS step · Use shared style art, including the correct internal arch.',
  },
  {
    retail: 'src/retail/design/Options.jsx',
    why: 'GPT patch: retail FRONTS step · Retail decorative selection and copied controls.',
  },
  {
    retail: 'src/retail/design/adapter.js',
    why: 'GPT patch: retail FRONTS step · Persist recipes through the existing Retail update path. '
      + 'T76 F7 · a style the doors are too thin to route is offered greyed with the engine\'s answer (`boardRefusal`).',
  },
  {
    retail: 'src/retail/design/reasons.js',
    why: 'T76 F7 · the walk\'s finding: the sentence a refused style says (REASONS.styleNeedsThickerDoor).',
  },
];

const git = (args) => {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch { return null; }
};
const lines = (out) => (out || '').trim().split('\n').filter(Boolean);
const baseRef = () => [BASE_COMMIT, 'origin/main', 'main'].find(
  (ref) => git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]) !== null,
);
/** Every file under `path` changed against `ref`, or added and not yet committed. */
const movedSince = (ref, path) => [...new Set([
  ...lines(git(['diff', '--name-only', ref, '--', path])),
  ...lines(git(['ls-files', '--others', '--exclude-standard', '--', path])),
])].sort();
const atBase = (ref, rel) => git(['cat-file', '-e', `${ref}:${rel}`]) !== null;
const disk = (rel) => (existsSync(join(ROOT, rel)) ? readFileSync(join(ROOT, rel)) : null);
const retailOf = (pro) => ALL_COPIES.find((c) => c.pro === pro)?.retail || null;

/** What the machine READS besides PRO's components, laid out as in the repo. */
const MACHINE_INPUTS = ['scripts/t63-copy.mjs', 'scripts/t63-copies.mjs', 'src/retail/styles/roomeditor.css'];
const SHEET = 'src/retail/styles/copies.css';

/** Every file under `dir` (relative to `root`), as repo paths. */
function filesUnder(root, dir) {
  const out = [];
  const walk = (rel) => {
    for (const e of readdirSync(join(root, rel), { withFileTypes: true })) {
      const next = `${rel}/${e.name}`;
      if (e.isDirectory()) walk(next);
      else out.push(next);
    }
  };
  if (existsSync(join(root, dir))) walk(dir);
  return out.sort();
}

/**
 * THE MACHINE IN A SCRATCH TREE: it runs there untouched, and every file it
 * writes comes back keyed by its repo path. Nothing under the repo is written.
 */
function machineMakes() {
  const scratch = mkdtempSync(join(tmpdir(), 't76-copy-'));
  try {
    for (const rel of MACHINE_INPUTS) {
      mkdirSync(dirname(join(scratch, rel)), { recursive: true });
      cpSync(join(ROOT, rel), join(scratch, rel));
    }
    cpSync(join(ROOT, 'src/components'), join(scratch, 'src/components'), { recursive: true });
    try {
      execFileSync('node', [join(scratch, 'scripts/t63-copy.mjs')], { cwd: scratch, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      process.stderr.write(`THE MACHINE REFUSED (scripts/t63-copy.mjs):\n${e.stderr?.toString() || e.message}\n`);
      process.exit(1);
    }
    const inputs = new Set(MACHINE_INPUTS);
    return new Map(filesUnder(scratch, 'src/retail').filter((rel) => !inputs.has(rel))
      .map((rel) => [rel, readFileSync(join(scratch, rel))]));
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

/** Line numbers as ranges: [1, 2, 3, 7] reads "1-3, 7". */
function ranges(nums) {
  const out = [];
  for (const n of nums) {
    const last = out[out.length - 1];
    if (last && n === last[1] + 1) last[1] = n;
    else out.push([n, n]);
  }
  return out.map(([a, b]) => (a === b ? `${a}` : `${a}-${b}`)).join(', ') || 'none';
}

/** How many lines a text holds (a last line without its newline still counts). */
const lineCount = (text) => (text ? text.split('\n').length - (text.endsWith('\n') ? 1 : 0) : 0);

/** Where a file moved since the base: its lines now, and how many came and went. */
function hunks(ref, rel) {
  if (!atBase(ref, rel)) {
    const n = lineCount(disk(rel)?.toString('utf8') || '');
    return { now: n ? `1-${n} (new)` : 'none', added: n, removed: 0 };
  }
  const now = [];
  let added = 0;
  let removed = 0;
  for (const m of (git(['diff', '-U0', ref, '--', rel]) || '').matchAll(/^@@ -\d+(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/gm)) {
    const gone = m[1] === undefined ? 1 : Number(m[1]);
    const start = Number(m[2]);
    const count = m[3] === undefined ? 1 : Number(m[3]);
    removed += gone;
    added += count;
    for (let i = 0; i < count; i += 1) now.push(start + i);
  }
  return { now: ranges(now), added, removed };
}

/** A copy against its PRO file, line by line: the machine keeps PRO's line count. */
function divergence(pro, copy) {
  const proText = disk(pro)?.toString('utf8') || '';
  const copyText = disk(copy)?.toString('utf8') || '';
  const a = proText.split('\n');
  const b = copyText.split('\n');
  if (a.length !== b.length) return { same: false, a: lineCount(proText), b: lineCount(copyText) };
  const imports = [];
  const skin = [];
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] === b[i]) continue;
    (/^\s*import\s|\bfrom\s+'/.test(a[i]) ? imports : skin).push(i + 1);
  }
  return { same: true, n: lineCount(proText), imports, skin };
}

// ─── THE PROOF ─────────────────────────────────────────────────────────────

const ref = baseRef();
const failures = [];
const fail = (what) => failures.push(what);
const named = [...T76_PRO_EDITS, ...T76_NEW_COPIES];
const wanted = named.map((e) => retailOf(e.pro)).filter(Boolean);

process.stdout.write('─── T76 · THE COPY: TONIGHT\'S PRO EDITS, AND WHAT THE MACHINE MAKES OF THEM ───\n\n');
if (!ref) {
  process.stdout.write('  no base ref: nothing can be proved against the base\n');
  process.exit(1);
}
process.stdout.write(`  base: ${ref === BASE_COMMIT ? `${BASE_COMMIT.slice(0, 7)} (origin/main before this turn)`
  : `${ref} (the base commit ${BASE_COMMIT.slice(0, 7)} is not in this clone)`}\n`);
process.stdout.write(`  mode: ${check ? '--check · the machine runs in a scratch tree; nothing under src/ is written'
  : 'write · the machine runs in place once the proof allows it'}\n`);

let made = machineMakes();
const differs = () => [...made.keys()].filter((rel) => !made.get(rel).equals(disk(rel) || Buffer.alloc(0)));
let would = differs();
const stray = would.filter((rel) => !wanted.includes(rel));
const stale = would.filter((rel) => wanted.includes(rel));
const copiesMade = [...made.keys()].filter((rel) => rel !== SHEET).length;

// ─── THE NAMES ─────────────────────────────────────────────────────────────
for (const [title, list] of [
  ['THE PRO SURFACES TONIGHT EDITS THAT HAVE A RETAIL COPY', T76_PRO_EDITS],
  ['THE PRO SURFACES COPIED FOR THE FIRST TIME', T76_NEW_COPIES],
]) {
  process.stdout.write(`\n─── ${title} ───\n`);
  for (const { pro, why } of list) {
    const retail = retailOf(pro);
    process.stdout.write(`  ${pro}\n    -> ${retail || 'NOT IN THE MANIFEST'}\n    ${why}\n`);
    if (!retail) { fail(`${pro} is not in the manifest (scripts/t63-copies.mjs)`); continue; }
    if (!made.has(retail)) {
      fail(`${retail} is not made by scripts/t63-copy.mjs (T62's four have their own machines)`);
      process.stdout.write('    the copy: NOT MADE by scripts/t63-copy.mjs\n');
      continue;
    }
    process.stdout.write(`    the copy: ${stale.includes(retail)
      ? (check ? 'STALE: not what the machine makes from PRO today' : 'stale, re-made below')
      : 'the same as the machine makes from PRO today'}\n`);
  }
}

// ─── 1. EVERY PRO SURFACE WITH A COPY, AGAINST THE BASE ────────────────────
const proMoved = movedSince(ref, 'src/components');
const proWithCopy = ALL_COPIES.filter((c) => proMoved.includes(c.pro)).map((c) => c.pro);
const notNamed = proWithCopy.filter((pro) => !named.some((n) => n.pro === pro));
const unspentEdits = T76_PRO_EDITS.filter((e) => !proMoved.includes(e.pro)).map((e) => e.pro);
const notNew = T76_NEW_COPIES.filter((e) => retailOf(e.pro) && atBase(ref, retailOf(e.pro))).map((e) => retailOf(e.pro));
process.stdout.write('\n─── EVERY PRO SURFACE WITH A COPY, AGAINST THE BASE ───\n');
process.stdout.write(`  moved since the base: ${proWithCopy.join(', ') || 'none'}\n`);
process.stdout.write(`  moved and NOT named: ${notNamed.join(', ') || 'none'}\n`);
process.stdout.write(`  named and unspent: ${unspentEdits.join(', ') || 'none'}\n`);
process.stdout.write(`  named as a first copy but already at the base: ${notNew.join(', ') || 'none'}\n`);
// FROZEN 3: a PRO file that moved carries its EXEMPT line in the switch test.
const SWITCH = 'test/turn59-f1-the-switch.test.js';
const switchText = disk(SWITCH)?.toString('utf8') || '';
const exemptAt = switchText.indexOf('const EXEMPT = {');
const exemptBlock = exemptAt < 0 ? '' : switchText.slice(exemptAt, switchText.indexOf('\n};', exemptAt));
const unlicensed = named.map((n) => n.pro).filter((pro) => proMoved.includes(pro) && !exemptBlock.includes(`'${pro}':`));
process.stdout.write(`  moved and without an EXEMPT line in ${SWITCH}: ${exemptBlock ? (unlicensed.join(', ') || 'none') : 'NO EXEMPT BLOCK FOUND'}\n`);
if (!exemptBlock) fail(`${SWITCH} has no EXEMPT block this script can read`);
for (const pro of unlicensed) fail(`${pro} moved and has no EXEMPT line in ${SWITCH} (FROZEN 3)`);
for (const pro of notNamed) fail(`${pro} moved, has a retail copy, and is not named here`);
for (const pro of unspentEdits) fail(`${pro} is named as edited and did not move since the base`);
for (const rel of notNew) fail(`${rel} is named as a first copy and already stood at the base`);

// ─── 2. EVERY FILE THE MACHINE MAKES, AGAINST THE DISK ─────────────────────
process.stdout.write('\n─── EVERY FILE THE MACHINE MAKES, AGAINST THE DISK ───\n');
process.stdout.write(`  ${copiesMade} copies and the sheet: ${made.size - would.length} the same, ${would.length} would change\n`);
process.stdout.write(`  would change, named: ${stale.join(', ') || 'none'}\n`);
process.stdout.write(`  would change, NOTHING LICENSED: ${stray.join(', ') || 'none'}\n`);
for (const rel of stray) fail(`the machine would touch ${rel}, which nothing tonight licenses`);
if (check) {
  for (const rel of stale) fail(`${rel} is not what the machine makes from PRO today (run without --check)`);
} else if (stray.length) {
  process.stdout.write('  NOTHING WRITTEN: the machine would touch a copy nothing tonight licenses\n');
} else {
  // THE WRITE: the machine, in place, as T75 ran it. Then asked again.
  process.stdout.write('\n');
  execFileSync('node', [join(ROOT, 'scripts/t63-copy.mjs')], { cwd: ROOT, stdio: 'inherit' });
  made = machineMakes();
  would = differs();
  process.stdout.write('\n');
  for (const rel of wanted) process.stdout.write(`  ${stale.includes(rel) ? 're-made  ' : 'unchanged'}  ${rel}\n`);
  for (const rel of would) fail(`${rel} still differs from what the machine makes`);
}

// ─── 3. THE RETAIL FILES THAT MOVED SINCE THE BASE ─────────────────────────
const retailMoved = movedSince(ref, 'src/retail');
const ownEdits = T76_RETAIL_EDITS.map((e) => e.retail);
process.stdout.write('\n─── THE RETAIL FILES THAT MOVED SINCE THE BASE ───\n');
for (const rel of retailMoved) {
  const copyOf = named.find((n) => retailOf(n.pro) === rel)?.pro;
  const kind = copyOf ? `copy of ${copyOf}` : ownEdits.includes(rel) ? 'retail edit, named' : 'NEITHER a named copy nor a named retail edit';
  process.stdout.write(`  ${rel.padEnd(56)} ${kind}\n`);
  if (!copyOf && !ownEdits.includes(rel)) fail(`${rel} moved and is neither a copy of a named file nor a named retail edit`);
}
const editsUnspent = ownEdits.filter((rel) => !retailMoved.includes(rel));
const editsAreCopies = ownEdits.filter((rel) => ALL_COPIES.some((c) => c.retail === rel));
process.stdout.write(`  ${retailMoved.length} moved · retail edits named and unspent: ${editsUnspent.join(', ') || 'none'}`
  + ` · retail edits that are copies: ${editsAreCopies.join(', ') || 'none'}\n`);
for (const rel of editsUnspent) fail(`${rel} is named as a retail edit and did not move since the base`);
for (const rel of editsAreCopies) fail(`${rel} is a copy in the manifest: the machine re-makes it, so it cannot be edited by hand`);

// ─── FOR THE PR: THE RETAIL EDITS, BY FILE AND LINE ───────────────────────
process.stdout.write('\n─── THE RETAIL EDITS (NOT COPIES), BY FILE AND LINE ───\n');
for (const { retail, why } of T76_RETAIL_EDITS) {
  const h = hunks(ref, retail);
  process.stdout.write(`  ${retail}\n    ${why}\n    now at lines ${h.now} · +${h.added} -${h.removed}\n`);
}

// ─── FOR THE PR: EACH NAMED COPY'S DIVERGENCE FROM ITS PRO FILE ───────────
process.stdout.write('\n─── THE DIVERGENCES: EACH NAMED COPY AGAINST ITS PRO FILE, BY LINE ───\n');
for (const { pro } of named) {
  const retail = retailOf(pro);
  if (!retail) continue;
  const d = divergence(pro, retail);
  const h = hunks(ref, retail);
  process.stdout.write(`  ${retail}\n    moved since the base at lines ${h.now} · +${h.added} -${h.removed}\n`);
  if (!d.same) {
    process.stdout.write(`    LINE COUNTS DIFFER: PRO ${d.a}, the copy ${d.b} (the machine keeps PRO's lines)\n`);
    fail(`${retail} does not have its PRO file's line count`);
    continue;
  }
  process.stdout.write(`    ${d.n} lines, as PRO; ${d.imports.length + d.skin.length} differ\n`);
  process.stdout.write(`    imports repointed (${d.imports.length}): ${ranges(d.imports)}\n`);
  process.stdout.write(`    the skin, classes and colours (${d.skin.length}): ${ranges(d.skin)}\n`);
}

// ─── THE VERDICT ───────────────────────────────────────────────────────────
process.stdout.write('\n');
if (failures.length) {
  process.stdout.write(`NOT CLEAN · ${failures.length} finding(s):\n${failures.map((f) => `  ${f}`).join('\n')}\n`);
  process.exit(1);
}
process.stdout.write(`CLEAN · ${named.length} named PRO surface(s), each copy what the machine makes from PRO today; `
  + `${retailMoved.length} retail file(s) moved since the base, each a named copy or a named retail edit; `
  + `${check ? 'nothing written' : `${stale.length} copy/copies re-made`}.\n`);
