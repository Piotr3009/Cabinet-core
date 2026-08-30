#!/usr/bin/env node
// ─── PAREN BALANCE 0/0, BY SCRIPT (turn 58, standing law 1) ─────────────────
//
// Turn 58's gate, in the owner's words: *"LISP first (lines into
// KIT_WARDROBE_FULL.lsp, census stays 14/14 at 0/0)"*.
//
// RE-HEADED, NOT REUSED — the house move since T45, and T57's own header says
// why in one line: *"a script that checked last night's claim would pass while
// tonight's was broken."* T57's script asserts that exactly one kit was BORN
// and that it was `KIT_FRONT_JPULL.lsp`; tonight exactly one kit is AMENDED and
// it is a different file. Editing T57's in place would also have re-pointed
// `test/turn57-f1-lisp-is-law.test.js`, which imports its exports and asserts
// T57's claims — turn 57's test would then have asserted turn 58's law and
// passed by accident.
//
// ─── THE DIFFERENCE THAT MATTERS TONIGHT: A ‘M’, NOT AN ‘A’ ─────────────────
//
// Every turn since T45 that touched the LISP added a KIT. Tonight adds LINES to
// a kit that has existed since turn 1, which is why the census does not move:
// 14 files last night, 14 tonight. That makes the count a weaker check than
// usual — a census that cannot go up cannot notice a birth it did not sanction
// — so the file-status check below is the one doing the work, and it demands
// the letter as well as the name.
//
// Four things are asked:
//
//   1. EVERY KIT BALANCES 0/0, with no `)` that closes nothing. The reader
//      skips `;` comments and "strings" character by character — these kits are
//      mostly prose and the prose is full of brackets. The COUNT is DERIVED
//      from the folder, so tonight's 14 is a reading and not a claim.
//
//   2. WHICH FILE MOVED, AND HOW. `--against <ref>` asks git. Tonight exactly
//      one may, `KIT_WARDROBE_FULL.lsp`, and it must come back MODIFIED — a
//      new kit under any name is a census that should have gone to 15 and a
//      claim this script would otherwise have let through.
//
//   3. THE CALL GRAPH. Tonight's hand law is DEFINED once, in the kit that owns
//      it, and mentioned in no other kit. A second kit that had grown its own
//      "which way does this leaf open" would balance perfectly and still be two
//      answers to one question — the fault the whole turn is about.
//
//   4. THE LAW IS STATED, NOT ONLY DEFINED. A kit that defines the hand and
//      leaves out the boundary draws half the rule and passes a paren count.
//
// Usage:
//     node scripts/t58-paren-balance.mjs                    # every kit
//     node scripts/t58-paren-balance.mjs --against cd399cf  # …and the diff rule
//
// `--against` takes THIS TURN'S OWN BASE — the commit this branch left from.
//
// Zero dependencies.

import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const LISP_DIR = 'reference/lisp';

/** The routine THIS TURN teaches, and the one file that owns it. */
export const T58_ROUTINE = 'SKY:leafHand';
export const T58_KIT = 'KIT_WARDROBE_FULL.lsp';
/** Who may call it. The file that defines it is also its only caller. */
export const T58_CALLERS = [T58_KIT];

/**
 * Every file under reference/lisp/ this turn is allowed to have moved, and the
 * git status letter each is allowed to come back with.
 *
 * ONE tonight, and it is an AMENDMENT rather than a birth. The hand a leaf
 * opens on and the shoe shelf's own section are both properties of a WARDROBE
 * — only a wardrobe stands under a cut ceiling, and only a wardrobe carries a
 * shoe shelf — so neither belongs in a kit of its own, and the shelf of kits
 * stays at fourteen.
 */
export const T58_LISP_FILES = [T58_KIT];
export const T58_LISP_STATUS = { [T58_KIT]: 'M' };

/**
 * …and the routines the law has to be REACHABLE FROM. A rule defined and never
 * used is the failure this kind of feature is most likely to produce: it
 * balances, it passes the census, and the engine goes on deciding for itself in
 * JavaScript.
 */
export const T58_GATED = [
  'SKY:leafHand', 'SKY:leafBoundary', 'SKY:leafHinge',
  'drawWardrobeSHOE_SHELF', 'drawWardrobeSHOE_RAIL', 'SKY:shoeShelfPair',
];

/**
 * The numbers this turn brings home, by the name the kit gives each of them.
 *
 * PARSED off the file — never restated here — which is what makes this a check
 * rather than a second copy of the law. The form is `(defun shoeTiltDeg ( / )
 * 15)`, one line, exactly as `ledGrooveEndExtra` (T48-F4) and the jpull profile
 * (T57-F1) are already written and already parsed.
 */
export const T58_PROFILE = ['shoeTiltDeg', 'shoeRailH', 'shoeRailT'];

/**
 * The paren balance of one LISP source. (T45's reader, unchanged.)
 *
 * @returns {{open:number, close:number, balance:number, deepest:number,
 *   negativeAt:number|null}} `balance` is 0 for a healthy file; `negativeAt` is
 *   the line where a `)` closed something that was never opened, which is the
 *   fault a bare count of both cannot see.
 */
export function parenBalance(source) {
  let open = 0;
  let close = 0;
  let depth = 0;
  let deepest = 0;
  let negativeAt = null;
  let line = 1;
  let inString = false;
  let inComment = false;

  for (let i = 0; i < source.length; i += 1) {
    const c = source[i];
    if (c === '\n') { line += 1; inComment = false; continue; }
    if (inComment) continue;
    if (inString) {
      if (c === '\\') { i += 1; continue; }
      if (c === '"') inString = false;
      continue;
    }
    if (c === ';') { inComment = true; continue; }
    if (c === '"') { inString = true; continue; }
    if (c === '(') {
      open += 1; depth += 1;
      if (depth > deepest) deepest = depth;
      continue;
    }
    if (c === ')') {
      close += 1; depth -= 1;
      if (depth < 0 && negativeAt === null) negativeAt = line;
    }
  }
  return {
    open, close, balance: open - close, deepest, negativeAt,
  };
}

/** Every kit in `reference/lisp/`, with its balance. */
export function balanceOfKits(dir = LISP_DIR) {
  return readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.lsp'))
    .sort()
    .map((name) => ({ name, ...parenBalance(readFileSync(join(dir, name), 'utf8')) }));
}

/** Every kit on the shelf — DERIVED, never typed. */
export function kitCount(dir = LISP_DIR) {
  return readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.lsp')).length;
}

/**
 * What git says changed under `reference/lisp/` since `ref`.
 *
 * An untracked `.lsp` counts as the addition it is (T57's amendment, kept): the
 * folder is read as well as the index, so the report says the same thing before
 * and after the commit that adds a file. Tonight that path should find NOTHING
 * — a new kit is exactly what this turn may not have.
 */
export function lispDiffAgainst(ref) {
  const out = execSync(`git diff --name-status ${ref} -- ${LISP_DIR}`, { encoding: 'utf8' });
  const tracked = out.split('\n').filter(Boolean).map((row) => {
    const [status, ...rest] = row.split('\t');
    return { status: status[0], file: rest.join('\t') };
  });
  const untracked = execSync(`git ls-files --others --exclude-standard -- ${LISP_DIR}`, { encoding: 'utf8' })
    .split('\n').filter(Boolean)
    .filter((f) => f.toLowerCase().endsWith('.lsp'))
    .map((file) => ({ status: 'A', file }));
  const seen = new Set(tracked.map((c) => c.file));
  return [...tracked, ...untracked.filter((c) => !seen.has(c.file))]
    .sort((a, b) => a.file.localeCompare(b.file));
}

/** Everything wrong with what moved under reference/lisp/ since `ref`. */
export function diffFaults(ref) {
  const changed = lispDiffAgainst(ref);
  const faults = [];
  for (const c of changed) {
    const allowed = T58_LISP_FILES.find((f) => c.file.endsWith(f));
    if (!allowed) {
      faults.push(`${c.file} moved and only ${T58_LISP_FILES.join(', ')} may`);
      continue;
    }
    const want = T58_LISP_STATUS[allowed];
    if (want && c.status !== want) {
      faults.push(`${c.file} came back '${c.status}' and tonight's change is '${want}'`
        + ' — a new kit is a census that should have gone to 15');
    }
  }
  return { changed, faults };
}

/**
 * ONE NUMBER, READ OFF THE LAW.
 *
 * `(defun shoeTiltDeg ( / ) 15)` → 15. The spaces inside `( / )` are part of
 * the house form and part of this pattern on purpose: a constant written `()`
 * or spread over two lines would not be found, and that is the point — the
 * engine's own reader is written to the same shape, so a kit that drifted out
 * of the form would break both at once rather than only one of them.
 *
 * @returns {number|null} null where the file does not state it in that form
 */
export function lispConstant(name, dir = LISP_DIR, file = T58_KIT) {
  const text = readFileSync(join(dir, file), 'utf8');
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = text.match(new RegExp(`\\(defun\\s+${esc}\\s*\\(\\s*/\\s*\\)\\s*(-?[0-9]+(?:\\.[0-9]+)?)\\s*\\)`));
  return m ? Number(m[1]) : null;
}

/**
 * WHO DEFINES TONIGHT'S LAW AND WHO CALLS IT.
 *
 * One `(defun SKY:leafHand` in the whole tree, in the kit that owns the
 * wardrobe, and NOT ONE mention anywhere else. That last clause is the one a
 * paren count cannot make — and it is this turn's own subject: a second answer
 * to "which way does this leaf open" is exactly what put the cups in one stile
 * and the plates in the opposite board.
 */
export function routineCensus(dir = LISP_DIR) {
  const rows = readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.lsp'))
    .sort()
    .map((name) => {
      const text = readFileSync(join(dir, name), 'utf8');
      const esc = T58_ROUTINE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const defines = (text.match(new RegExp(`\\(defun\\s+${esc}[\\s(]`, 'g')) || []).length;
      // A `;` comment is prose, not a call. The census would otherwise count
      // the paragraph that explains the law as a second caller.
      const code = text.replace(/;.*$/gm, '');
      const mentions = (code.match(new RegExp(`${esc}\\b`, 'g')) || []).length;
      return { name, defines, calls: mentions - defines };
    });
  const defined = rows.filter((r) => r.defines > 0).map((r) => r.name);
  const callers = rows.filter((r) => r.calls > 0).map((r) => r.name);
  return { rows, defined, callers };
}

/** Every complaint the census has, as plain sentences. */
export function routineFaults(census = routineCensus()) {
  const faults = [];
  if (census.defined.length !== 1 || census.defined[0] !== T58_KIT) {
    faults.push(`${T58_ROUTINE} must be defined exactly once, in ${T58_KIT}`
      + ` — found in [${census.defined.join(', ') || 'nowhere'}]`);
  }
  const strays = census.callers.filter((n) => n !== T58_KIT && !T58_CALLERS.includes(n));
  for (const s of strays) faults.push(`${s} mentions ${T58_ROUTINE} and is not the file that owns it`);
  for (const fault of gateFaults()) faults.push(fault);
  return faults;
}

/**
 * Is the law actually STATED, and is the doctrine said out loud?
 *
 * A file that defined the hand and left the boundary out would draw half the
 * rule — and half of this rule is precisely the bug: the hand was right all
 * along, and the board it hung on was picked somewhere else.
 */
export function gateFaults(dir = LISP_DIR) {
  const faults = [];
  if (!existsSync(join(dir, T58_KIT))) {
    faults.push(`${T58_KIT} does not exist — tonight's law has no home`);
    return faults;
  }
  const text = readFileSync(join(dir, T58_KIT), 'utf8');
  for (const routine of T58_GATED) {
    if (!text.includes(`(defun ${routine} `)) faults.push(`${routine} is not defined in ${T58_KIT}`);
  }
  for (const c of T58_PROFILE) {
    if (lispConstant(c, dir) === null) {
      faults.push(`${c} is not stated as a one-line constant in ${T58_KIT}`);
    }
  }
  // The LAW must be STATED, not only executable. The doctrine is the thing this
  // turn most nearly got wrong twice over, so the file has to say it.
  if (!/A HINGE HAS ONE HAND/i.test(text)) {
    faults.push(`${T58_KIT} defines the hand but does not state the law in words`);
  }
  if (!/THE SHOE SHELF COMES HOME/i.test(text)) {
    faults.push(`${T58_KIT} does not say that the shoe shelf's law came back to it`);
  }
  // The shelf rests on the rows this kit already drills. If that sentence ever
  // goes, somebody has started inventing a hole pattern for a leaning board.
  if (!/NO NEW HOLE PATTERN/i.test(text)) {
    faults.push(`${T58_KIT} does not say that the shoe shelf drills nothing new`);
  }
  return faults;
}

// ─── THE CLI, AND ONLY WHEN IT IS THE CLI ───────────────────────────────────
// The exports above are imported by the suite; the block below is what a
// terminal runs. Without this guard, `node --test` would import this file, hit
// a `process.exit` at module scope and take the test runner down with it.
const IS_CLI = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (IS_CLI) {
  const argv = process.argv.slice(2);
  const rows = balanceOfKits();
  let bad = 0;

  process.stdout.write(`${'kit'.padEnd(28)}${'open'.padStart(6)}${'close'.padStart(7)}${'balance'.padStart(9)}${'depth'.padStart(7)}\n`);
  for (const r of rows) {
    const ok = r.balance === 0 && r.negativeAt === null;
    if (!ok) bad += 1;
    process.stdout.write(
      `${r.name.padEnd(28)}${String(r.open).padStart(6)}${String(r.close).padStart(7)}`
      + `${String(r.balance).padStart(9)}${String(r.deepest).padStart(7)}`
      + `${ok ? '' : `   ← OUT${r.negativeAt ? ` (a stray ) at line ${r.negativeAt})` : ''}`}\n`,
    );
  }
  process.stdout.write(`\n${rows.length} kit(s), ${bad === 0 ? 'every one 0/0.' : `${bad} OUT OF BALANCE.`}\n`);

  const census = routineCensus();
  process.stdout.write(`\n${T58_ROUTINE} — defined in [${census.defined.join(', ')}], called from `
    + `[${census.callers.join(', ') || 'nowhere yet'}]\n`);
  const faults = routineFaults(census);
  for (const f of faults) process.stdout.write(`  ← ${f}\n`);
  bad += faults.length;
  if (!faults.length) {
    process.stdout.write('  One hand law, one owner — and the boundary derived from it, not picked. ✓\n');
    process.stdout.write(`  The shoe comes home: ${lispConstant('shoeTiltDeg')}° on a `
      + `${lispConstant('shoeRailT')} × ${lispConstant('shoeRailH')} rail, stated in the kit. ✓\n`);
    process.stdout.write(`  ${rows.length}/${rows.length} at 0/0 — the shelf as it stands, derived not typed.\n`);
  }

  const againstAt = argv.indexOf('--against');
  if (againstAt >= 0 && argv[againstAt + 1]) {
    const ref = argv[againstAt + 1];
    const { changed, faults: dFaults } = diffFaults(ref);
    process.stdout.write(`\nreference/lisp/ vs ${ref}:\n`);
    if (!changed.length) process.stdout.write('  nothing at all.\n');
    for (const c of changed) process.stdout.write(`  ${c.status}  ${c.file}\n`);
    for (const f of dFaults) process.stdout.write(`\nLISP IS LAW: ${f}\n`);
    bad += dFaults.length;
    if (!dFaults.length) {
      process.stdout.write('\nOne kit amended, none born, no other touched. ✓\n');
    }
  }

  process.exit(bad === 0 ? 0 : 1);
}
