#!/usr/bin/env node
// ─── PAREN BALANCE 0/0, BY SCRIPT (turn 50, CLAUDE.md iron rule 3) ──────────
//
//   *"LISP IS LAW — FIRST, for F8 only. `drawBUL`/`drawBUR` in
//   `SKYLON_COMMON.lsp` learn the slope so they can skip their top socket row,
//   which the application has been doing alone since 25.08. No other LISP file
//   is touched. Paren 13/13 at 0/0 by script."*
//
// T48's script, RE-HEADED and re-pointed, because the claim is TONIGHT's and a
// script that checked last night's claim would pass while tonight's was broken.
// Three things are asked, and the third is the one a paren count cannot make:
//
//   1. EVERY KIT BALANCES 0/0, with no `)` that closes nothing. Thirteen files,
//      thirteen zeroes. The reader skips `;` comments and "strings" character
//      by character — these kits' sections are mostly prose and the prose is
//      full of brackets. Tonight this matters more than usual: F8 wraps two
//      blocks in each of two routines in an `(if (not (SKY:slopeOn)) (progn …))`,
//      which is four new open parens per routine and exactly the edit a hand
//      gets wrong.
//
//   2. ONLY `SKYLON_COMMON.lsp` MOVED. `--against <ref>` asks git rather than
//      taking anybody's word. Every other feature of this turn is application
//      code: F5's end panel, F6's shaker recess and F7's hinge ladder are all
//      `src/engine/**`, and none of them has a drawing law of its own that a
//      kit could state — the kits draw a CARCASS, and what those three cut is a
//      panel's outline, a pocket and a hole list the kits have never owned.
//
//   3. THE CALL GRAPH. `SKY:slopeOn` is DEFINED once, in the file that owns the
//      slope law, and CALLED by `drawBUL` and `drawBUR` in that same file — and
//      mentioned in no other kit. A kit that had grown its own copy would
//      balance perfectly and still be two answers to one question.
//
// Usage:
//     node scripts/t50-paren-balance.mjs                    # every kit
//     node scripts/t50-paren-balance.mjs --against 9bfacb2  # …and the diff rule
//
// `--against` takes THIS TURN'S OWN BASE — the commit this branch left from.
// `main` is older than T47 and would report three turns of LISP work as
// tonight's.
//
// Zero dependencies.

import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const LISP_DIR = 'reference/lisp';

/** The routine this turn TEACHES, and the one file that owns it. */
export const T50_ROUTINE = 'SKY:slopeOn';
export const T50_KIT = 'SKYLON_COMMON.lsp';
/** Who may call it. The file that defines it is also its only caller. */
export const T50_CALLERS = ['SKYLON_COMMON.lsp'];

/** Every file under reference/lisp/ this turn is allowed to have moved. */
export const T50_LISP_FILES = [T50_KIT];

/**
 * …and the two routines the gate has to be INSIDE. A switch defined and never
 * used is the failure this feature is most likely to produce: it balances, it
 * passes the census, and the kits go on drilling sockets into a bevel.
 */
export const T50_GATED = ['drawBUL', 'drawBUR'];

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
 * WHO DEFINES THE END EXTRA AND WHO CALLS IT.
 *
 * One `(defun ledGrooveEndExtra` in the whole tree, called by `drawLedGroove`
 * in that same kit, and NOT ONE mention anywhere else. That last clause is the
 * one a paren count cannot make: a kit that had grown its own 10.0 would
 * balance perfectly and still be a second answer to one question.
 */
export function routineCensus(dir = LISP_DIR) {
  const rows = readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.lsp'))
    .sort()
    .map((name) => {
      const text = readFileSync(join(dir, name), 'utf8');
      const esc = T50_ROUTINE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const defines = (text.match(new RegExp(`\\(defun\\s+${esc}[\\s(]`, 'g')) || []).length;
      // A `;` comment is prose, not a call. The census would otherwise count
      // the paragraph that explains the gate as a second caller.
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
  if (census.defined.length !== 1 || census.defined[0] !== T50_KIT) {
    faults.push(`${T50_ROUTINE} must be defined exactly once, in ${T50_KIT}`
      + ` — found in [${census.defined.join(', ') || 'nowhere'}]`);
  }
  for (const kit of T50_CALLERS) {
    if (!census.callers.includes(kit)) faults.push(`${kit} never calls ${T50_ROUTINE}`);
  }
  const strays = census.callers.filter((n) => n !== T50_KIT && !T50_CALLERS.includes(n));
  for (const s of strays) faults.push(`${s} mentions ${T50_ROUTINE} and is not the file that owns it`);
  // ─── AND IT IS INSIDE THE TWO ROUTINES THAT MATTER ────────────────────────
  // CLAUDE.md names them: *"`drawBUL`/`drawBUR` … take the slope and skip their
  // 'Puzzle sockets — TOP edge' block when it is on."*  A gate that balanced
  // and sat somewhere else would pass every other check in this file.
  for (const fault of gateFaults()) faults.push(fault);
  return faults;
}

/** Is the gate INSIDE drawBUL and drawBUR, and does each still gate its block? */
export function gateFaults(dir = LISP_DIR) {
  const text = readFileSync(join(dir, T50_KIT), 'utf8');
  const faults = [];
  for (const routine of T50_GATED) {
    const at = text.indexOf(`(defun ${routine} `);
    if (at < 0) { faults.push(`${routine} is not in ${T50_KIT}`); continue; }
    // The routine runs to the next top-level `(defun`, which is how this file
    // is laid out and has been since turn 1.
    const nextAt = text.indexOf('\n(defun ', at + 1);
    const body = text.slice(at, nextAt < 0 ? text.length : nextAt);
    const gates = (body.match(/\(if \(not \(SKY:slopeOn\)\)/g) || []).length;
    if (gates < 2) {
      faults.push(`${routine} gates ${gates} block(s) on the slope — the TOP sockets`
        + ' and the TOP screw row are two, and the law names both');
    }
    // …and it must still DRAW them when there is no slope.
    if (!/PUZZLE_SOCKET/.test(body)) faults.push(`${routine} no longer draws a puzzle socket at all`);
  }
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
  process.stdout.write(`\n${T50_ROUTINE} — defined in [${census.defined.join(', ')}], called from `
    + `[${census.callers.join(', ')}]\n`);
  const faults = routineFaults(census);
  for (const f of faults) process.stdout.write(`  ← ${f}\n`);
  bad += faults.length;
  if (!faults.length) {
    process.stdout.write(`  One switch, one file, and it is inside ${T50_GATED.join(' and ')}. ✓\n`);
  }

  const againstAt = argv.indexOf('--against');
  if (againstAt >= 0 && argv[againstAt + 1]) {
    const ref = argv[againstAt + 1];
    const changed = lispDiffAgainst(ref);
    process.stdout.write(`\nreference/lisp/ vs ${ref}:\n`);
    if (!changed.length) process.stdout.write('  nothing at all.\n');
    for (const c of changed) process.stdout.write(`  ${c.status}  ${c.file}\n`);
    const offenders = changed.filter((c) => !T50_LISP_FILES.some((f) => c.file.endsWith(f)));
    if (offenders.length) {
      process.stdout.write(`\nIRON RULE 3: ${offenders.length} other kit(s) touched — only `
        + `${T50_LISP_FILES.join(', ')} may move.\n`);
      bad += offenders.length;
    } else {
      process.stdout.write('\nNo other kit is touched. ✓\n');
    }
  }

  process.exit(bad === 0 ? 0 : 1);
}
