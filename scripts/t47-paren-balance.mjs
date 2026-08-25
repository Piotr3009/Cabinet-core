#!/usr/bin/env node
// ─── PAREN BALANCE 0/0, BY SCRIPT (turn 47, CLAUDE.md iron rule 3) ──────────
//
//   *"LISP IS LAW — FIRST. `SKY:slopeCutPts` in `SKYLON_COMMON.lsp` learns the
//   polyline; the roof-board top and the angled side tops are stated there
//   before any JS. Callers stay `KIT_WARDROBE_FULL` + `KIT_BUDTALL_FULL` — no
//   other kit is touched, and the PR says so. Paren balance 0/0 by script, all
//   13 kits."*
//
// T46's script, RE-HEADED and re-pointed, because the claim is TONIGHT's and a
// script that checked last night's claim would pass while tonight's was broken.
// Three things are asked, and the third is the one a paren count cannot make:
//
//   1. EVERY KIT BALANCES 0/0, with no `)` that closes nothing. The reader
//      skips `;` comments and "strings" character by character — this turn's
//      sections are mostly prose and the prose is full of brackets.
//
//   2. ONLY THE THREE NAMED FILES MOVED. `--against <ref>` asks git rather than
//      taking anybody's word: the shared routine goes into `SKYLON_COMMON.lsp`
//      (that is what "shared" means) and each of the two kits gains the calls.
//
//   3. THE CALL GRAPH. `SKY:slopeCutPts` is DEFINED once, CALLED from both
//      kits, and MENTIONED nowhere else. A kit that had quietly grown its own
//      polyline would balance perfectly and still be a second chain.
//
// Usage:
//     node scripts/t47-paren-balance.mjs                    # every kit
//     node scripts/t47-paren-balance.mjs --against b83b113  # …and the diff rule
//
// `--against` takes THIS TURN'S OWN BASE. b83b113 is the commit this branch
// left from; `main` is older than T38 and would report seven turns of LISP work
// as tonight's.
//
// Zero dependencies.

import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const LISP_DIR = 'reference/lisp';

/** The routine this turn TEACHES, and the two kits that may call it. */
export const T47_ROUTINE = 'SKY:slopeCutPts';
export const T47_SHARED = 'SKYLON_COMMON.lsp';
export const T47_KITS = ['KIT_WARDROBE_FULL.lsp', 'KIT_BUDTALL_FULL.lsp'];

/** Every file under reference/lisp/ this turn is allowed to have moved. */
export const T47_LISP_FILES = [T47_SHARED, ...T47_KITS];

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
 * WHO DEFINES THE DIAGONAL AND WHO CALLS IT.
 *
 * One `(defun SKY:slopeCutPts` in the whole tree; a call in each of the two
 * kits; and NOT ONE mention anywhere else. That last clause is the one a paren
 * count cannot make: a kit that had grown its own trapezium would balance
 * perfectly and still be a second chain.
 */
export function routineCensus(dir = LISP_DIR) {
  const rows = readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.lsp'))
    .sort()
    .map((name) => {
      const text = readFileSync(join(dir, name), 'utf8');
      const defines = (text.match(new RegExp(`\\(defun\\s+${T47_ROUTINE}\\b`, 'g')) || []).length;
      const mentions = (text.match(new RegExp(`${T47_ROUTINE}\\b`, 'g')) || []).length;
      return { name, defines, calls: mentions - defines };
    });
  const defined = rows.filter((r) => r.defines > 0).map((r) => r.name);
  const callers = rows.filter((r) => r.calls > 0).map((r) => r.name);
  return { rows, defined, callers };
}

/** Every complaint the census has, as plain sentences. */
export function routineFaults(census = routineCensus()) {
  const faults = [];
  if (census.defined.length !== 1 || census.defined[0] !== T47_SHARED) {
    faults.push(`${T47_ROUTINE} must be defined exactly once, in ${T47_SHARED}`
      + ` — found in [${census.defined.join(', ') || 'nowhere'}]`);
  }
  for (const kit of T47_KITS) {
    if (!census.callers.includes(kit)) faults.push(`${kit} never calls ${T47_ROUTINE}`);
  }
  const strays = census.callers.filter((n) => n !== T47_SHARED && !T47_KITS.includes(n));
  for (const s of strays) faults.push(`${s} mentions ${T47_ROUTINE} and is not one of the two kits`);
  return faults;
}

// ─── THE CLI, AND ONLY WHEN IT IS THE CLI ───────────────────────────────────
// The exports above are imported by the suite; the block below is what a
// terminal runs. Without this guard, `node --test` would import this file, hit
// a `process.exit` at module scope and take the test runner down with it — a
// script that kills its own proof is a script nobody runs twice.
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
  process.stdout.write(`\n${T47_ROUTINE} — defined in [${census.defined.join(', ')}], called from `
    + `[${census.callers.filter((n) => n !== T47_SHARED).join(', ')}]\n`);
  const faults = routineFaults(census);
  for (const f of faults) process.stdout.write(`  ← ${f}\n`);
  bad += faults.length;
  if (!faults.length) process.stdout.write('  One routine, two callers, no second diagonal. ✓\n');

  const againstAt = argv.indexOf('--against');
  if (againstAt >= 0 && argv[againstAt + 1]) {
    const ref = argv[againstAt + 1];
    const changed = lispDiffAgainst(ref);
    process.stdout.write(`\nreference/lisp/ vs ${ref}:\n`);
    if (!changed.length) process.stdout.write('  nothing at all.\n');
    for (const c of changed) process.stdout.write(`  ${c.status}  ${c.file}\n`);
    const offenders = changed.filter((c) => !T47_LISP_FILES.some((f) => c.file.endsWith(f)));
    if (offenders.length) {
      process.stdout.write(`\nIRON RULE 3: ${offenders.length} other kit(s) touched — only `
        + `${T47_LISP_FILES.join(', ')} may move.\n`);
      bad += offenders.length;
    } else {
      process.stdout.write('\nNo other kit is touched. ✓\n');
    }
  }

  process.exit(bad === 0 ? 0 : 1);
}
