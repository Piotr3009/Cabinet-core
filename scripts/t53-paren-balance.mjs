#!/usr/bin/env node
// ─── PAREN BALANCE 0/0, BY SCRIPT (turn 53, CLAUDE.md iron rule 3) ──────────
//
//   *"LISP IS LAW, FIRST. F3's slope-infill geometry, F4's bevel direction,
//   F6's splitting rule and F8's insert v2 geometry are cut on the machine, so
//   they are born in `reference/lisp/` (SKYLON_COMMON.lsp for F3/F4/F6;
//   KIT_WATCH_DRAWER.lsp for F8) before any JS. `scripts/t53-paren-balance
//   .mjs`: every kit at 0/0 — the shelf is 14 files since T52; derive the
//   count."*
//
// T52's script, RE-HEADED and re-pointed, because the claim is TONIGHT's and a
// script that checked last night's claim would pass while tonight's was broken.
// The COUNT is derived from the folder here and in the suite rather than typed,
// so a fifteenth kit is a file and not an edit.
//
// Three things are asked, and the third is the one a paren count cannot make:
//
//   1. EVERY KIT BALANCES 0/0, with no `)` that closes nothing. The reader
//      skips `;` comments and "strings" character by character — these kits'
//      sections are mostly prose and the prose is full of brackets.
//
//   2. WHICH FILES MOVED. `--against <ref>` asks git rather than taking
//      anybody's word. Tonight exactly TWO may: `SKYLON_COMMON.lsp`, which
//      gains F3's infill law, F4's bevel direction and F6's splitting rule; and
//      `KIT_WATCH_DRAWER.lsp`, which F8 re-specifies. Nothing else in the
//      folder may be touched — F1, F2, F5, F7, F9 and F10 are a gate, a file
//      writer, a rider, a front plane, a clamp and a room, and the one of those
//      with a drawing law (F9's cup floor) states it in SKYLON_COMMON too.
//
//   3. THE CALL GRAPH. Tonight's laws are DEFINED once, in the file that owns
//      them, and mentioned in no other kit. A kit that had grown its own copy
//      would balance perfectly and still be two answers to one question —
//      which is the very fault the profile's own note about the 346 exists to
//      prevent.
//
// Usage:
//     node scripts/t53-paren-balance.mjs                    # every kit
//     node scripts/t53-paren-balance.mjs --against 6f67ce3  # …and the diff rule
//
// `--against` takes THIS TURN'S OWN BASE — the commit this branch left from.
//
// Zero dependencies.

import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const LISP_DIR = 'reference/lisp';

/** The routine THIS TURN teaches, and the one file that owns it. */
export const T53_ROUTINE = 'SKY:infillSegsUnder';
export const T53_KIT = 'SKYLON_COMMON.lsp';
/** Who may call it. The file that defines it is also its only caller. */
export const T53_CALLERS = ['SKYLON_COMMON.lsp'];

/**
 * Every file under reference/lisp/ this turn is allowed to have moved.
 *
 * TWO tonight, and both are changes rather than births: the shelf is already
 * fourteen. Iron rule 3 is about a law being BORN in the LISP before any JS —
 * it has never said the shelf may not grow — and this list is where the
 * permission is written down rather than assumed.
 */
export const T53_NEW_KIT = 'KIT_WATCH_DRAWER.lsp';
export const T53_LISP_FILES = [T53_KIT, T53_NEW_KIT];

/**
 * …and the routines the law has to be REACHABLE FROM. A rule defined and never
 * used is the failure this kind of feature is most likely to produce: it
 * balances, it passes the census, and the kits go on drawing a filler through
 * the plaster.
 */
export const T53_GATED = ['SKY:vertInfillTopY', 'SKY:vertInfillDeg'];

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

/** What git says changed under `reference/lisp/` since `ref`. */
export function lispDiffAgainst(ref) {
  const out = execSync(`git diff --name-status ${ref} -- ${LISP_DIR}`, { encoding: 'utf8' });
  return out.split('\n').filter(Boolean).map((row) => {
    const [status, ...rest] = row.split('\t');
    return { status: status[0], file: rest.join('\t') };
  });
}

/**
 * WHO DEFINES TONIGHT'S LAW AND WHO CALLS IT.
 *
 * One `(defun SKY:infillSegsUnder` in the whole tree, in the file that owns
 * every slope walk already, and NOT ONE mention anywhere else. That last clause
 * is the one a paren count cannot make: a kit that had grown its own segment
 * walk would balance perfectly and still be a second answer to one question.
 */
export function routineCensus(dir = LISP_DIR) {
  const rows = readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.lsp'))
    .sort()
    .map((name) => {
      const text = readFileSync(join(dir, name), 'utf8');
      const esc = T53_ROUTINE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
  if (census.defined.length !== 1 || census.defined[0] !== T53_KIT) {
    faults.push(`${T53_ROUTINE} must be defined exactly once, in ${T53_KIT}`
      + ` — found in [${census.defined.join(', ') || 'nowhere'}]`);
  }
  const strays = census.callers.filter((n) => n !== T53_KIT && !T53_CALLERS.includes(n));
  for (const s of strays) faults.push(`${s} mentions ${T53_ROUTINE} and is not the file that owns it`);
  for (const fault of gateFaults()) faults.push(fault);
  return faults;
}

/**
 * Is the law actually STATED, and are its two readers there?
 *
 * The vertical member's top and the vertical member's bevel angle are the two
 * halves of F3(a) and (c), and a file that defined the horizontal walk and left
 * those out would draw two thirds of the feature.
 */
export function gateFaults(dir = LISP_DIR) {
  const text = readFileSync(join(dir, T53_KIT), 'utf8');
  const faults = [];
  for (const routine of T53_GATED) {
    if (!text.includes(`(defun ${routine} `)) faults.push(`${routine} is not defined in ${T53_KIT}`);
  }
  // …and the LAW must be STATED, not only the arithmetic. Iron rule 3: the rule
  // is BORN here, so the sentence that says why has to be here too.
  if (!/EVERY PIECE THE MACHINE CUTS ON THE SLOPE IS DRAWN CUT IN THE ROOM/i.test(text)) {
    faults.push(`${T53_KIT} states the arithmetic but not the law it comes from`);
  }
  // …and the DISEASE, named, because the next turn will meet it again.
  if (/TWO SOURCES OF TRUTH/i.test(text) === false) {
    faults.push(`${T53_KIT} does not name the disease — two sources of truth`);
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
  process.stdout.write(`\n${T53_ROUTINE} — defined in [${census.defined.join(', ')}], called from `
    + `[${census.callers.join(', ') || 'nowhere yet'}]\n`);
  const faults = routineFaults(census);
  for (const f of faults) process.stdout.write(`  ← ${f}\n`);
  bad += faults.length;
  if (!faults.length) {
    process.stdout.write(`  One law, one file, and its two vertical readers stand beside it. ✓\n`);
    process.stdout.write(`  ${rows.length}/${rows.length} at 0/0 — the shelf as it stands, derived not typed.\n`);
  }

  const againstAt = argv.indexOf('--against');
  if (againstAt >= 0 && argv[againstAt + 1]) {
    const ref = argv[againstAt + 1];
    const changed = lispDiffAgainst(ref);
    process.stdout.write(`\nreference/lisp/ vs ${ref}:\n`);
    if (!changed.length) process.stdout.write('  nothing at all.\n');
    for (const c of changed) process.stdout.write(`  ${c.status}  ${c.file}\n`);
    const offenders = changed.filter((c) => !T53_LISP_FILES.some((f) => c.file.endsWith(f)));
    if (offenders.length) {
      process.stdout.write(`\nIRON RULE 3: ${offenders.length} other kit(s) touched — only `
        + `${T53_LISP_FILES.join(', ')} may move.\n`);
      bad += offenders.length;
    } else {
      process.stdout.write('\nNo other kit is touched. ✓\n');
    }
  }

  process.exit(bad === 0 ? 0 : 1);
}
