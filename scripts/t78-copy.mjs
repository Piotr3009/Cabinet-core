#!/usr/bin/env node
// ─── TURN 78 · THE COPY: RETAIL ONLY THROUGH THE COPY SCRIPT ───────────────
//
// CLAUDE.md T77 F8, verbatim: *"`scripts/t77-copy.mjs` (retail only through
// the copy script; GPT's T63 copy of `FrontDecorationControls` re-run after F3
// to F6)"*, and the PR body: *"the retail divergences by file and line"*.
//
// T77's machine (`scripts/t77-copy.mjs`), pointed at this turn's list; the method
// is T77's: the T63 machine (`scripts/t63-copy.mjs`, untouched) is run
// IN MEMORY. Its two writers (`writeFileSync`, `mkdirSync`) are caught for the
// length of one import, so every file it makes comes back as bytes keyed by its
// repo path and nothing is written anywhere, not even a scratch tree. Then this
// script PROVES, against the base of the turn (405b98c, origin/main before the
// turn; its code is 2766045, the base of GPT's patch), that
//
//   1. every retail file (src/retail/**) that differs from the base is EITHER
//      a copy the machine makes byte for byte from its PRO original, that PRO
//      file named below with its reason, OR a retail edit named below with its
//      reason and its hunks (the `git diff -U0` headers, pinned);
//   2. nothing else under src/retail moved: no file outside the two lists, and
//      no hunk inside a named retail edit that its entry does not pin;
//
// and, on the way, that every PRO surface with a copy that moved is named and
// licensed (its `EXEMPT` line and its frozen hash in
// `test/turn59-f1-the-switch.test.js`, FROZEN 3), that the machine itself stands
// as at the base, and that every file the machine makes is what is on disk.
// It lists, for the PR, each retail edit by file and hunk with its lines, and
// each named copy's divergence from its PRO file (imports repointed, the skin).
//
// THE NAMED TABLES ARE THE ONLY THING A LATER EDIT TOUCHES. One entry per file:
// the file, who edited it (`by`), why, and the owner's or CLAUDE.md's words. A
// retail edit also pins its hunks; when a file moves again, `--check` prints the
// hunks on disk as a line ready to paste, and the entry's `why` says what the
// new hunk is.
//
//   node scripts/t78-copy.mjs --check    prove only; write nothing
//   node scripts/t78-copy.mjs            prove; if the only files the machine
//                                        would change are copies of named PRO
//                                        files, write those, and prove again

import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { syncBuiltinESMExports } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { ALL_COPIES } from './t63-copies.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const check = process.argv.includes('--check');

// THE BASE: the tree as this turn found it, 16477df (the owner's CLAUDE.md T78
// commit on dbef3f1, PR #76; its src/ is dbef3f1's byte for byte). Named as a
// COMMIT: origin/main moves when the owner merges this turn.
const BASE_COMMIT = '16477dfef32e0a2a38411a35f56a760e8c9d88f2';


/**
 * THE PRO FILES THIS TURN EDITS THAT HAVE A RETAIL COPY, each with its licence.
 * Every one that moved is also an `EXEMPT` entry in
 * `test/turn59-f1-the-switch.test.js` (FROZEN 3), frozen at the hash it has on
 * disk; this script asks the test file both.
 */
export const T78_PRO_EDITS = [
  {
    pro: 'src/components/UnitSizeModal.jsx',
    by: 'T78 F5 (the one writer of the central files)',
    why: 'an L\'s two fields read ARM A (its width) and ARM B (its depth), both in the window, each through the same '
      + 'setter, which clamps each arm alone; every other unit\'s window is what it was.',
    words: 'the owner, 11.10.2026: *"powiekszenie L shape szafek prawa lewa strona."*',
  },
  {
    pro: 'src/components/AddItems.jsx',
    by: 'T78 F9 (the one writer of the central files)',
    why: 'a Carousel row on the L only: one click fits or takes out the bought mechanism through the store\'s '
      + '`setCornerKit` (one BOM line, a placeholder body, zero holes; a fixed shelf in its way is refused in words).',
    words: 'the owner, 11.10.2026: *"krecacy sie naroznik na garnki w srodku."*',
  },
  // Before T79: the chat fix of 17.10.2026 (16:10) moved this PRO surface after T78 closed; named here so the
  // T79 run can prove its copy (the machine's, byte for byte).
  {
    pro: 'src/components/PartDetailModal.jsx',
    by: 'chat fix 17.10.2026 (16:10), before T79',
    why: 'a mark is an open walk: the corner mark is drawn as one path through its three points (engine/marks.js) and '
      + 'its hit box is the box of every point of the walk.',
    words: 'the owner, 17.10.2026 (16:10): *"jeden, zaczynajacy sie od lewej do srodka i kontynuacja na prawo, jeden L wektor"*.',
  },
  {
    pro: 'src/components/AddItems.jsx',
    by: 'T79 F2',
    why: 'the shelves\' WHICH SIDE gains a third button, Above divider, shown only while the divider ends under a FIX '
      + 'shelf below the top; hovering lights the full-width opening over that shelf, Add puts full-width shelves '
      + 'centred in it (`addShelves(unit, n, \'above\')`), and a refusal said by the store is not said twice; an '
      + 'opening that goes away while picked asks for a bay again instead of leaving a mute Add.',
    words: 'the owner, 18.10.2026: *"jak dodamy fix półkę i divider pod spodem to nie mam możliwości dodania '
      + 'całkowitej półki powyżej bo kod dzieli mi całą szafę na bay 1 i 2, a nie mam czegoś takiego że jest bay '
      + 'nie dzielony powyżej."*; mockup approved 14:45: *"1 - tak."*',
  },
  {
    pro: 'src/components/ElementProperties.jsx',
    by: 'T79 F12',
    why: 'Center between beside Center all, the same width: one click arms the two-pick mode of the shared uiStore '
      + '(`centreBetween`), the panel says which pick is next, Escape cancels; the project store centres the shelves '
      + 'between the two picks (`centreShelvesBetween`) or refuses in words.',
    words: 'the owner, 18.10.2026: *"naciskasz wycentruj pomiędzy, wybierasz dolny i górny element i wtedy wszystkie '
      + 'półki pomiędzy tymi elementami się centrują."*',
  },
];

/**
 * THE T62 HAND COPIES MOVED BEFORE T79. RoomModal and WallElevationModal are
 * T62's copies (scripts/t63-copies.mjs T62_COPIES), made by their own machine,
 * not by scripts/t63-copy.mjs, so they cannot be named in T78_PRO_EDITS (the
 * machine does not make them) nor in T78_RETAIL_EDITS (they are manifest files).
 * Each entry names the PRO surface and its retail copy, both moved by the chat
 * fixes of 15.10 and 17.10.2026 after T78 closed; the PRO file still carries its
 * EXEMPT line and its frozen hash, and the copy's hunks are printed for the PR.
 */
export const HAND_COPY_EDITS = [
  {
    pro: 'src/components/RoomModal.jsx',
    retail: 'src/retail/design/room/RoomModal.jsx',
    by: 'chat fixes 14.10 and 17.10.2026, before T79',
    why: 'ADD ISLAND opens the island plan over the canvas (3d/IslandPlan.jsx); the window is 1290 px wide, the plan '
      + 'inside it untouched.',
    words: 'the owner, 14.10.2026: *"przy dodaniu wyspy chcialbym zeby byl widok z gory"*; 17.10.2026: '
      + '*"menu setup room (caly modal poszerz prosze o 50 procent)"*.',
  },
  {
    pro: 'src/components/WallElevationModal.jsx',
    retail: 'src/retail/design/room/WallElevationModal.jsx',
    by: 'chat fix 15.10.2026, before T79',
    why: 'the FRONT view draws the recess band and the chimney where they stand, drags them sideways and opens them; '
      + 'the recess window gains Bottom and Top.',
    words: 'the owner, 15.10.2026: *"na setup room jak widze sciane od frontu nie top tylko front to nie widze kresek, '
      + 'gdzie jest komin i gdzie wneka"*.',
  },
];

/**
 * THE RETAIL FILES EDITED BY HAND THIS TURN: not copies (none is in the
 * manifest, so no machine re-makes them). Each pins its hunks as
 * `git diff -U0 <base> -- <file>` prints their headers.
 */
export const T78_RETAIL_EDITS = [
  {
    retail: 'src/retail/design/Options.jsx',
    by: 'T78 F12 (the one writer of the central files)',
    why: 'the FRONTS step gains a GLASS list under the style list, shown for the GL style only: clear, smoke, reeded, one '
      + 'click writes the project\'s glass kind through the adapter (A.setGlassKind); no number on the page.',
    words: 'the owner, 11.10.2026: *"szyba powinna byc smoke ... domyslnie smoke ale z wyborem"*; CLAUDE.md T78 F12: '
      + '*"Retail: the choice in the FRONTS step for a GL style."*',
    hunks: ['@@ -783,0 +784,24 @@'],
  },
  {
    retail: 'src/retail/design/adapter.js',
    by: 'T78 F12 (the one writer of the central files)',
    why: 'glassKinds(), glassKind(project) and setGlassKind(kind): the profile\'s kinds and default, the project\'s choice '
      + '(design.fronts.glassKind) written through the store\'s setDesign; the engine validates the word.',
    words: 'the owner, 11.10.2026: *"domyslnie smoke ale z wyborem"*; CLAUDE.md T78 F12. Chat fix 15.10.2026, before T79 '
      + '(the import and doorCountRefusal\'s pair under the minimum leaf, through engine/cabinet.js leafCountRefusal): '
      + '*"zebym mial mozliwosc podzielenia ich na 2"*.',
    hunks: ['@@ -39 +39 @@', '@@ -1819,0 +1820,9 @@', '@@ -1918,0 +1928,25 @@'],
  },
  {
    retail: 'src/retail/styles/roomeditor.css',
    by: 'chat fix 17.10.2026, before T79',
    why: 'one class, pbi-re-w1290, the retail Room setup at PRO\'s new width (w-[1290px]).',
    words: 'the owner, 17.10.2026: *"caly modal poszerz prosze o 50 procent"*.',
    hunks: ['@@ -260,0 +261,2 @@'],
  },
];

/**
 * THE COPY MACHINE'S OWN FILES EDITED THIS TURN, each `{ file, by, why, words }`.
 * None: the machine and its manifest stand as at the base, so "GPT's T63 copy
 * re-run" is T63's machine and nobody else's.
 */
export const T78_MACHINE_EDITS = [];

// ─── THE TOOLS ─────────────────────────────────────────────────────────────

const MACHINE = 'scripts/t63-copy.mjs';
const MACHINE_FILES = ['scripts/t63-copy.mjs', 'scripts/t63-copies.mjs'];
const SHEET = 'src/retail/styles/copies.css';
const SWITCH = 'test/turn59-f1-the-switch.test.js';

const git = (args) => {
  try {
    return execFileSync('git', args, {
      cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch { return null; }
};
const lines = (out) => (out || '').split('\n').filter(Boolean);
const hasCommit = (ref) => git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]) !== null;
/** Every file under `path` changed against `ref` (the working tree, so uncommitted edits count), or new and untracked. */
const movedSince = (ref, path) => [...new Set([
  ...lines(git(['diff', '--name-only', ref, '--', path])),
  ...lines(git(['ls-files', '--others', '--exclude-standard', '--', path])),
])].sort();
const atBase = (ref, rel) => git(['cat-file', '-e', `${ref}:${rel}`]) !== null;
const disk = (rel) => (fs.existsSync(join(ROOT, rel)) ? fs.readFileSync(join(ROOT, rel)) : null);
const retailOf = (pro) => ALL_COPIES.find((c) => c.pro === pro)?.retail || null;
const proOf = (retail) => ALL_COPIES.find((c) => c.retail === retail)?.pro || null;
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const literal = (text) => text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
/** No en or em dash reaches the output: a source line that carries one is printed with it escaped. */
const plain = (text) => text.replace(/\u2013/g, '\\u2013').replace(/\u2014/g, '\\u2014');
const say = (text) => process.stdout.write(plain(text));

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

/** A side of a hunk as lines: start 736, count 1 reads "736"; count 0 reads "none (after 23)". */
const span = (start, count) => (count === 0 ? `none (after ${start})`
  : count === 1 ? `${start}` : `${start}-${start + count - 1}`);

/**
 * The hunks of `rel` against the base, as `git diff -U0` prints them: the
 * header (its numbers only, no function context), both spans, and the lines
 * that went and came. A file new and untracked is one hunk of all its lines.
 */
function hunksOf(ref, rel) {
  const tracked = git(['ls-files', '--error-unmatch', '--', rel]) !== null;
  if (!tracked && !atBase(ref, rel)) {
    const text = disk(rel)?.toString('utf8') || '';
    const n = lineCount(text);
    return [{
      header: `@@ -0,0 +1,${n} @@`, oldStart: 0, oldCount: 0, newStart: 1, newCount: n,
      minus: [], plus: text.split('\n').slice(0, n), untracked: true,
    }];
  }
  const out = [];
  let cur = null;
  for (const line of (git(['diff', '-U0', '--no-color', ref, '--', rel]) || '').split('\n')) {
    const m = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
    if (m) {
      cur = {
        header: m[0],
        oldStart: Number(m[1]),
        oldCount: m[2] === undefined ? 1 : Number(m[2]),
        newStart: Number(m[3]),
        newCount: m[4] === undefined ? 1 : Number(m[4]),
        minus: [],
        plus: [],
      };
      out.push(cur);
    } else if (cur && line.startsWith('-')) cur.minus.push(line.slice(1));
    else if (cur && line.startsWith('+')) cur.plus.push(line.slice(1));
  }
  return out;
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

/**
 * THE MACHINE, IN MEMORY. `scripts/t63-copy.mjs` is imported as it stands; for
 * the length of that import `fs.writeFileSync` hands its bytes here instead of
 * to the disk, `fs.mkdirSync` does nothing, `process.argv` carries no flag (so
 * the machine makes, as it does when run bare), its stdout is kept, and
 * `process.exit` throws. The machine's own `import { writeFileSync } from
 * 'node:fs'` is a live binding, refreshed by `syncBuiltinESMExports()` both
 * ways. Every patched name is restored before this returns.
 */
let runs = 0;
async function machineMakes() {
  const made = new Map();
  const outside = [];
  let said = '';
  const real = {
    writeFileSync: fs.writeFileSync, mkdirSync: fs.mkdirSync, argv: process.argv,
    write: process.stdout.write, exit: process.exit,
  };
  fs.writeFileSync = (file, data, options) => {
    const abs = file instanceof URL ? fileURLToPath(file) : String(file);
    const rel = relative(ROOT, abs);
    const encoding = typeof options === 'string' ? options : options?.encoding || 'utf8';
    const bytes = typeof data === 'string' ? Buffer.from(data, encoding) : Buffer.from(data);
    if (rel.startsWith('..') || !rel.startsWith('src/retail/')) outside.push(rel);
    made.set(rel, bytes);
  };
  fs.mkdirSync = () => undefined;
  syncBuiltinESMExports();
  process.argv = [real.argv[0], join(ROOT, MACHINE)];
  process.stdout.write = (chunk, ...rest) => {
    said += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
    const done = rest.find((r) => typeof r === 'function');
    if (done) done();
    return true;
  };
  process.exit = (code) => { throw new Error(`the machine called process.exit(${code})`); };
  runs += 1;
  let refused = null;
  try {
    await import(`${pathToFileURL(join(ROOT, MACHINE)).href}?t78-copy-run=${runs}`);
  } catch (e) {
    refused = e;
  } finally {
    fs.writeFileSync = real.writeFileSync;
    fs.mkdirSync = real.mkdirSync;
    syncBuiltinESMExports();
    process.argv = real.argv;
    process.stdout.write = real.write;
    process.exit = real.exit;
  }
  return { made, outside, said, refused };
}

// ─── THE PROOF ─────────────────────────────────────────────────────────────

const failures = [];
const fail = (what) => failures.push(what);
const ref = BASE_COMMIT;
const named = T78_PRO_EDITS;
const wanted = named.map((e) => retailOf(e.pro)).filter(Boolean);
const ownEdits = T78_RETAIL_EDITS.map((e) => e.retail);
const handPro = HAND_COPY_EDITS.map((e) => e.pro);
const handRetail = HAND_COPY_EDITS.map((e) => e.retail);

say('─── T78 · THE COPY: RETAIL ONLY THROUGH THE COPY SCRIPT ───\n\n');
if (!hasCommit(BASE_COMMIT)) {
  say(`  base: ${BASE_COMMIT} is not in this clone; nothing can be proved against it\n\nNOT CLEAN · no base\n`);
  process.exit(1);
}
say(`  base: ${BASE_COMMIT.slice(0, 7)} (the tree as this turn found it: dbef3f1's src/ with the owner's CLAUDE.md commit)
`);
say(`  mode: ${check ? '--check · the machine runs in memory; nothing is written'
  : 'write · the machine runs in memory; named copies it would change are written, then it runs again'}\n`);

// ─── THE MACHINE STANDS AS AT THE BASE ────────────────────────────────────
const machineMoved = MACHINE_FILES.filter((rel) => movedSince(ref, rel).length);
const machineNamed = T78_MACHINE_EDITS.map((e) => e.file);
say('\n─── THE MACHINE ───\n');
say(`  ${MACHINE_FILES.join(', ')}\n`);
say(`  moved since the base: ${machineMoved.join(', ') || 'none'}\n`);
for (const rel of machineMoved.filter((r) => !machineNamed.includes(r))) fail(`${rel} (the copy machine) moved since the base and is not named in T78_MACHINE_EDITS`);
for (const rel of machineNamed.filter((r) => !machineMoved.includes(r))) fail(`${rel} is named in T78_MACHINE_EDITS and did not move since the base`);

let run = await machineMakes();
if (run.refused) {
  say(`  THE MACHINE REFUSED: ${run.refused.message}\n\nNOT CLEAN · the machine did not make the copies\n`);
  process.exit(1);
}
const copiedSaid = (run.said.match(/^ {2}copied /gm) || []).length;
const sheetSaid = run.said.match(/sheet\s+src\/retail\/styles\/copies\.css\s+\((\d+) rules\)/)?.[1];
say(`  run in memory: ${run.made.size} files made (${copiedSaid} copies said "copied", the sheet ${sheetSaid ?? '?'} rules); `
  + `0 bytes written by it\n`);
say(`  made outside src/retail: ${run.outside.join(', ') || 'none'}\n`);
for (const rel of run.outside) fail(`the machine made ${rel}, outside src/retail`);

const differs = () => [...run.made.keys()].filter((rel) => !run.made.get(rel).equals(disk(rel) || Buffer.alloc(0))).sort();
let would = differs();
const stray = would.filter((rel) => !wanted.includes(rel));
const stale = would.filter((rel) => wanted.includes(rel));
const copiesMade = [...run.made.keys()].filter((rel) => rel !== SHEET).length;

// ─── THE NAMES ─────────────────────────────────────────────────────────────
say('\n─── THE PRO SURFACES THIS TURN EDITS THAT HAVE A RETAIL COPY ───\n');
for (const { pro, by, why, words } of named) {
  const retail = retailOf(pro);
  say(`  ${pro}\n    -> ${retail || 'NOT IN THE MANIFEST'}\n    by: ${by}\n    why: ${why}\n    words: ${words}\n`);
  if (!retail) { fail(`${pro} is not in the manifest (scripts/t63-copies.mjs)`); continue; }
  if (!run.made.has(retail)) {
    fail(`${retail} is not made by ${MACHINE} (T62's four have their own machines)`);
    say(`    the copy: NOT MADE by ${MACHINE}\n`);
    continue;
  }
  say(`    the copy: ${stale.includes(retail)
    ? (check ? 'STALE: not what the machine makes from PRO today' : 'stale, re-made below')
    : 'byte for byte what the machine makes from PRO today'}\n`);
}

// ─── EVERY PRO SURFACE WITH A COPY, AGAINST THE BASE ──────────────────────
const proMoved = movedSince(ref, 'src/components');
const proWithCopy = ALL_COPIES.filter((c) => proMoved.includes(c.pro)).map((c) => c.pro);
const notNamed = proWithCopy.filter((pro) => !named.some((n) => n.pro === pro) && !handPro.includes(pro));
const unspent = [...named.map((e) => e.pro), ...handPro].filter((pro) => !proMoved.includes(pro));
say('\n─── EVERY PRO SURFACE WITH A COPY, AGAINST THE BASE ───\n');
say(`  PRO files moved since the base: ${proMoved.join(', ') || 'none'}\n`);
say(`  of them with a retail copy: ${proWithCopy.join(', ') || 'none'}\n`);
say(`  moved, with a copy, and NOT named: ${notNamed.join(', ') || 'none'}\n`);
say(`  named and unspent: ${unspent.join(', ') || 'none'}\n`);
for (const pro of notNamed) fail(`${pro} moved, has a retail copy, and is not named in T78_PRO_EDITS`);
for (const pro of unspent) fail(`${pro} is named in T78_PRO_EDITS and did not move since the base`);
// FROZEN 3: a PRO file that moved carries its EXEMPT line, and is frozen at the hash it has on disk.
const switchText = disk(SWITCH)?.toString('utf8') || '';
const blockOf = (open) => {
  const at = switchText.indexOf(open);
  return at < 0 ? '' : switchText.slice(at, switchText.indexOf('\n};', at));
};
const exemptBlock = blockOf('const EXEMPT = {');
const frozenBlock = blockOf('const FROZEN = {');
if (!exemptBlock) fail(`${SWITCH} has no EXEMPT block this script can read`);
if (!frozenBlock) fail(`${SWITCH} has no FROZEN block this script can read`);
for (const pro of [...named.map((n) => n.pro), ...handPro].filter((p) => proMoved.includes(p))) {
  const exempt = exemptBlock.includes(`'${pro}':`);
  const frozen = frozenBlock.match(new RegExp(`'${literal(pro)}':\\s*'([0-9a-f]{64})'`))?.[1] || null;
  const now = disk(pro) ? sha256(disk(pro)) : null;
  say(`  ${pro}: EXEMPT line ${exempt ? 'present' : 'MISSING'}; frozen at ${frozen ? frozen.slice(0, 12) : 'NO HASH'}, `
    + `on disk ${now ? now.slice(0, 12) : 'NO FILE'}: ${frozen && frozen === now ? 'the same' : 'NOT THE SAME'}\n`);
  if (!exempt) fail(`${pro} moved and has no EXEMPT line in ${SWITCH} (FROZEN 3)`);
  if (!frozen || frozen !== now) fail(`${pro} is not frozen at its hash on disk in ${SWITCH} (FROZEN 3)`);
}

// ─── EVERY FILE THE MACHINE MAKES, AGAINST THE DISK ───────────────────────
say('\n─── EVERY FILE THE MACHINE MAKES, AGAINST THE DISK ───\n');
say(`  ${copiesMade} copies and the sheet: ${run.made.size - would.length} byte for byte the same, ${would.length} would change\n`);
say(`  would change, a copy of a named PRO file: ${stale.join(', ') || 'none'}\n`);
say(`  would change, NOTHING LICENSED: ${stray.join(', ') || 'none'}\n`);
for (const rel of stray) fail(`the machine would change ${rel}, which nothing this turn licenses`);
if (check) {
  for (const rel of stale) fail(`${rel} is not what the machine makes from PRO today (run without --check)`);
} else if (stray.length) {
  say('  NOTHING WRITTEN: the machine would change a copy nothing this turn licenses\n');
} else {
  // THE WRITE: only the named copies the machine would change, its own bytes.
  for (const rel of stale) {
    fs.mkdirSync(dirname(join(ROOT, rel)), { recursive: true });
    fs.writeFileSync(join(ROOT, rel), run.made.get(rel));
    say(`  written  ${rel}\n`);
  }
  run = await machineMakes();
  if (run.refused) fail(`the machine refused on its second run: ${run.refused.message}`);
  would = differs();
  for (const rel of would) fail(`${rel} still differs from what the machine makes`);
  say(`  the machine again, in memory: ${run.made.size - would.length} of ${run.made.size} byte for byte the same\n`);
}

// ─── 1. THE RETAIL FILES THAT MOVED SINCE THE BASE ────────────────────────
const retailMoved = movedSince(ref, 'src/retail');
say('\n─── 1. EVERY RETAIL FILE THAT DIFFERS FROM THE BASE ───\n');
for (const rel of retailMoved) {
  const pro = proOf(rel);
  const isNamedCopy = pro && wanted.includes(rel);
  const isMade = run.made.has(rel) && run.made.get(rel).equals(disk(rel) || Buffer.alloc(0));
  let kind;
  if (handRetail.includes(rel)) kind = `T62 hand copy of ${pro}, named in HAND_COPY_EDITS`;
  else if (ownEdits.includes(rel)) kind = 'retail edit, named';
  else if (isNamedCopy && isMade) kind = `copy of ${pro}, byte for byte the machine's`;
  else if (isNamedCopy) kind = `copy of ${pro}, NOT what the machine makes`;
  else if (pro) kind = `copy of ${pro}, whose PRO file is NOT named`;
  else if (rel === SHEET) kind = 'the machine\'s sheet, NOT licensed by any name';
  else kind = 'NEITHER a named copy nor a named retail edit';
  say(`  ${rel.padEnd(56)} ${kind}\n`);
  if (ownEdits.includes(rel) || handRetail.includes(rel)) continue;
  if (isNamedCopy && !isMade) fail(`${rel} moved and is not byte for byte what the machine makes from ${pro}`);
  if (!isNamedCopy) fail(`${rel} moved and is neither a copy of a named PRO file nor a named retail edit`);
}
const editsUnspent = ownEdits.filter((rel) => !retailMoved.includes(rel));
const editsAreCopies = ownEdits.filter((rel) => proOf(rel) || rel === SHEET);
say(`  ${retailMoved.length} moved · retail edits named and unspent: ${editsUnspent.join(', ') || 'none'}`
  + ` · retail edits that are the machine's files: ${editsAreCopies.join(', ') || 'none'}\n`);
for (const rel of editsUnspent) fail(`${rel} is named as a retail edit and did not move since the base`);
for (const rel of editsAreCopies) fail(`${rel} is made by the machine (manifest or sheet), so it cannot be edited by hand`);

// ─── 2. NOTHING ELSE MOVED: THE RETAIL EDITS, BY FILE AND HUNK ────────────
const show = (text) => {
  const t = text.trim();
  return t.length > 150 ? `${t.slice(0, 147)}...` : t;
};
say(`\n─── 2. THE RETAIL EDITS (NOT COPIES), BY FILE AND HUNK (git diff -U0 ${ref.slice(0, 7)}) ───\n`);
for (const { retail, by, why, words, hunks: pinned } of T78_RETAIL_EDITS) {
  const hs = hunksOf(ref, retail);
  const onDisk = hs.map((h) => h.header);
  const plus = hs.reduce((s, h) => s + h.newCount, 0);
  const minus = hs.reduce((s, h) => s + h.oldCount, 0);
  say(`  ${retail}\n    by: ${by}\n    why: ${why}\n    words: ${words}\n`);
  say(`    ${hs.length} hunk(s) · +${plus} -${minus} · now at lines ${ranges(hs.flatMap((h) => Array.from({ length: h.newCount }, (_, i) => h.newStart + i)))}\n`);
  for (const h of hs) {
    say(`      ${h.header}${h.untracked ? ' (new, untracked)' : ''}  base ${span(h.oldStart, h.oldCount)} -> now ${span(h.newStart, h.newCount)}\n`);
    for (const l of h.minus) say(`        - ${show(l)}\n`);
    for (const l of h.plus) say(`        + ${show(l)}\n`);
  }
  const same = Array.isArray(pinned) && pinned.length === onDisk.length && pinned.every((p, i) => p === onDisk[i]);
  say(`    pinned hunks: ${same ? 'the same as on disk' : `NOT THE SAME; on disk now: hunks: [${onDisk.map((h) => `'${h}'`).join(', ')}]`}\n`);
  if (!same) fail(`${retail} has hunks its entry does not pin (on disk: ${onDisk.join(', ') || 'none'}; pinned: ${(pinned || []).join(', ') || 'none'})`);
}

// ─── THE T62 HAND COPIES, BY FILE AND HUNK ─────────────────────────────────
say('\n─── THE T62 HAND COPIES MOVED BEFORE T79 (HAND_COPY_EDITS), BY FILE AND HUNK ───\n');
for (const { pro, retail, by, why, words } of HAND_COPY_EDITS) {
  const hc = hunksOf(ref, retail);
  const hp = hunksOf(ref, pro);
  const at = (hs) => hs.map((h) => h.header).join(', ') || 'none';
  say(`  ${retail}\n    copy of ${pro} (T62's own machine)\n    by: ${by}\n    why: ${why}\n    words: ${words}\n`);
  say(`    the copy since the base: ${at(hc)}\n    PRO since the base:      ${at(hp)}\n`);
  if (!movedSince(ref, retail).length && !movedSince(ref, pro).length) fail(`${pro} and ${retail} are named in HAND_COPY_EDITS and neither moved since the base`);
}

// ─── FOR THE PR: EACH NAMED COPY, ITS HUNKS AND ITS DIVERGENCE FROM PRO ───
say('\n─── THE COPIES: EACH NAMED COPY\'S HUNKS SINCE THE BASE, AND ITS DIVERGENCE FROM ITS PRO FILE ───\n');
for (const { pro } of named) {
  const retail = retailOf(pro);
  if (!retail) continue;
  const hc = hunksOf(ref, retail);
  const hp = hunksOf(ref, pro);
  const at = (hs) => hs.map((h) => h.header).join(', ') || 'none';
  say(`  ${retail}\n    copy of ${pro}\n`);
  say(`    the copy since the base: ${at(hc)} · +${hc.reduce((s, h) => s + h.newCount, 0)} -${hc.reduce((s, h) => s + h.oldCount, 0)}\n`);
  say(`    PRO since the base:      ${at(hp)} · +${hp.reduce((s, h) => s + h.newCount, 0)} -${hp.reduce((s, h) => s + h.oldCount, 0)}`
    + ` (${at(hc) === at(hp) ? 'the same places' : 'other places'})\n`);
  const d = divergence(pro, retail);
  if (!d.same) {
    say(`    LINE COUNTS DIFFER: PRO ${d.a}, the copy ${d.b} (the machine keeps PRO's lines)\n`);
    fail(`${retail} does not have its PRO file's line count`);
    continue;
  }
  say(`    ${d.n} lines, as PRO; ${d.imports.length + d.skin.length} differ from PRO\n`);
  say(`    imports repointed (${d.imports.length}): ${ranges(d.imports)}\n`);
  say(`    the skin, classes and colours (${d.skin.length}): ${ranges(d.skin)}\n`);
}

// ─── THE VERDICT ───────────────────────────────────────────────────────────
say('\n');
if (failures.length) {
  say(`NOT CLEAN · ${failures.length} finding(s):\n${failures.map((f) => `  ${f}`).join('\n')}\n`);
  process.exit(1);
}
say(`CLEAN · ${named.length} named PRO surface(s), each copy byte for byte what the machine makes from PRO today; `
  + `${retailMoved.length} retail file(s) moved since the base, each a named copy or a named retail edit with its hunks pinned; `
  + `nothing else under src/retail moved; ${check ? 'nothing written' : `${stale.length} copy/copies written`}.\n`);
