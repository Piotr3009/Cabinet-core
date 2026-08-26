#!/usr/bin/env node
// ─── PAREN BALANCE 0/0, BY SCRIPT (turn 52, CLAUDE.md iron rule 3) ──────────
//
//   *"LISP IS LAW — FIRST for F4 and F5. Dog-bone counts and the insert's
//   geometry are cut on the machine, so they are born in `reference/lisp/`
//   before any JS. Paren 13/13 at 0/0."*
//
// T51's script, RE-HEADED and re-pointed, because the claim is TONIGHT's and a
// script that checked last night's claim would pass while tonight's was broken.
//
// ─── AND THE COUNT IS FOURTEEN, NOT THIRTEEN ────────────────────────────────
//
// CLAUDE.md says "13/13" because thirteen files is what was on the shelf when
// it was written. F5 adds a FOURTEENTH — `KIT_WATCH_DRAWER.lsp`, the watch
// drawer's insert, which is exactly what iron rule 3 asks for: geometry that is
// cut on the machine is born in the LISP before any JS. The count is therefore
// DERIVED from the folder here and in the suite rather than typed, so a
// fifteenth kit is a file and not an edit. **14/14 at 0/0** is tonight's
// number and this script prints it.
//
// Three things are asked, and the third is the one a paren count cannot make:
//
//   1. EVERY KIT BALANCES 0/0, with no `)` that closes nothing. The reader
//      skips `;` comments and "strings" character by character — these kits'
//      sections are mostly prose and the prose is full of brackets.
//
//   2. WHICH FILES MOVED. `--against <ref>` asks git rather than taking
//      anybody's word. Tonight exactly two may: `SKYLON_COMMON.lsp`, which
//      gains F3's dog-bone count law, and the NEW `KIT_WATCH_DRAWER.lsp`.
//      Nothing else in the folder may be touched — F1, F2 and F4 are a room, a
//      scene and a number, and none of them has a drawing law a kit could
//      state.
//
//   3. THE CALL GRAPH. F3's law is DEFINED once, in the file that owns it, and
//      mentioned in no other kit. A kit that had grown its own 600 would
//      balance perfectly and still be two answers to one question — which is
//      the very fault the profile's own note about the 346 exists to prevent.
//
// Usage:
//     node scripts/t52-paren-balance.mjs                    # every kit
//     node scripts/t52-paren-balance.mjs --against 34f5fc1  # …and the diff rule
//
// `--against` takes THIS TURN'S OWN BASE — the commit this branch left from.
//
// Zero dependencies.

import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const LISP_DIR = 'reference/lisp';

/** The routine this turn TEACHES, and the one file that owns it. */
export const T50_ROUTINE = 'SKY:tabCount';
export const T50_KIT = 'SKYLON_COMMON.lsp';
/** Who may call it. The file that defines it is also its only caller. */
export const T50_CALLERS = ['SKYLON_COMMON.lsp'];

/**
 * Every file under reference/lisp/ this turn is allowed to have moved.
 *
 * TWO tonight, and the second is a birth rather than a change: F3's dog-bone
 * counts join `SKYLON_COMMON.lsp` where every tenon rule already lives, and F5
 * brings `KIT_WATCH_DRAWER.lsp` into the world. Iron rule 3 is about a law
 * being born in the LISP before any JS — it has never said the shelf may not
 * grow — and this list is where that permission is written down rather than
 * assumed.
 */
export const T52_NEW_KIT = 'KIT_WATCH_DRAWER.lsp';
export const T50_LISP_FILES = [T50_KIT, T52_NEW_KIT];

/**
 * …and the two routines the law has to be REACHABLE FROM. A rule defined and
 * never used is the failure this feature is most likely to produce: it
 * balances, it passes the census, and the kits go on boring 11 mm into 10 mm
 * of material.
 */
export const T50_GATED = ['SKY:tabCentres'];

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
  // ─── AND THE LAW IS ACTUALLY USED ────────────────────────────────────────
  // A rule defined and called by nothing balances, passes the census, and
  // changes not one hole.
  for (const fault of gateFaults()) faults.push(fault);
  return faults;
}

/**
 * Is the law actually USED by the two routines that state it?
 *
 * `SKY:cupDepth` is the bore and `SKY:cupTooThin` is the report, and CLAUDE.md
 * asks for both — *"Report in Check when a front is too thin to take a cup at
 * all, rather than silently boring a shallower one."*  Each must be defined
 * here and each must ask `SKY:cupThickness`, or the depth and the report are
 * two opinions about one door.
 */
export function gateFaults(dir = LISP_DIR) {
  const text = readFileSync(join(dir, T50_KIT), 'utf8');
  const faults = [];
  for (const routine of T50_GATED) {
    const at = text.indexOf(`(defun ${routine} `);
    if (at < 0) { faults.push(`${routine} is not defined in ${T50_KIT}`); continue; }
    const nextAt = text.indexOf('\n(defun ', at + 1);
    const body = text.slice(at, nextAt < 0 ? text.length : nextAt).replace(/;.*$/gm, '');
    // Directly, or through `SKY:cupDepth`, which asks it. The report reading
    // the BORE rather than re-deriving the thickness is the better of the two
    // and is what the file does: one derivation, one answer, one door.
    if (!body.includes('SKY:tabCount')) {
      faults.push(`${routine} does not reach ${T50_ROUTINE} — the bore and the report`
        + ' must read ONE derivation, which is the whole of F5');
    }
  }
  // …and the LAW must be stated, not just the arithmetic. Iron rule 3: the rule
  // is BORN here, so the prose that says why has to be here too.
  if (!/at or under 300\s+ONE tenon/i.test(text)) {
    faults.push(`${T50_KIT} states the arithmetic but not the law it comes from`);
  }
  // …and the one thing that would have shipped F3 dead: 300 is AT-or-under,
  // because `lowCabinet.minHeight` is exactly 300.
  if (!/could never fire on the one cabinet it exists for/i.test(text)) {
    faults.push(`${T50_KIT} does not say why 300 is AT-or-under — the feature would ship dead`);
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
    process.stdout.write(`  ${rows.length}/${rows.length} at 0/0 — CLAUDE.md's "13/13" plus F5's new ${T52_NEW_KIT}.\n`);
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
