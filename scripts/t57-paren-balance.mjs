#!/usr/bin/env node
// ─── PAREN BALANCE 0/0, BY SCRIPT (turn 57, CLAUDE.md standing law 1) ───────
//
//   *"LISP IS LAW. New geometry is written in `reference/lisp/` FIRST; the
//   engine follows. Paren census grows to 14/14 at 0/0 (13 kits today +
//   `KIT_FRONT_JPULL.lsp`) — extend `scripts/t50-paren-balance.mjs` and name
//   the change."*
//
// THE CHANGE, NAMED. CLAUDE.md points at `t50-paren-balance.mjs`; this is a
// NEW FILE beside it, re-headed and re-pointed from `t54`'s — which is the
// same thing every turn since T45 has done and the reason is written in T54's
// own header: *"a script that checked last night's claim would pass while
// tonight's was broken."* Editing t50's in place would have been worse than
// untidy: `test/turn50-f5-f8-the-slope-block.test.js` IMPORTS its exports and
// asserts T50's claims about T50's routine, so re-pointing that file would
// have made turn 50's test assert turn 57's law and pass by accident.
//
// Three things are asked, and the third is the one a paren count cannot make:
//
//   1. EVERY KIT BALANCES 0/0, with no `)` that closes nothing. The reader
//      skips `;` comments and "strings" character by character — these kits'
//      sections are mostly prose and the prose is full of brackets. The COUNT
//      is derived from the folder rather than typed, so tonight's 14 is a
//      reading and not a claim.
//
//   2. WHICH FILES MOVED. `--against <ref>` asks git rather than taking
//      anybody's word. Tonight exactly ONE may: `KIT_FRONT_JPULL.lsp` (A) —
//      a new file, and no amendment to any existing kit. Nothing else in the
//      folder may be touched, and that includes the twelve kits and COMMON.
//
//   3. THE CALL GRAPH. Tonight's edge law is DEFINED once, in the kit that
//      owns it, and mentioned in no other kit. A second kit that had grown
//      its own "which edge does the J go on" would balance perfectly and
//      still be two answers to one question — which is CLAUDE.md's own
//      "one path per job", asked of the LISP.
//
// …and a fourth, which is this turn's alone: THE DRAWING CLOSES. The owner's
// section is 4.212 + 10 + 3.788 = 18.000, and those three numbers are read
// OFF THE FILE rather than retyped here, so a kit whose profile stopped
// adding up to an 18 mm board is a failing run and not a comment nobody read.
//
// Usage:
//     node scripts/t57-paren-balance.mjs                    # every kit
//     node scripts/t57-paren-balance.mjs --against 6d89238  # …and the diff rule
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
export const T57_ROUTINE = 'SKY:jpullEdge';
export const T57_KIT = 'KIT_FRONT_JPULL.lsp';
/** Who may call it. The file that defines it is also its only caller. */
export const T57_CALLERS = ['KIT_FRONT_JPULL.lsp'];

/**
 * Every file under reference/lisp/ this turn is allowed to have moved.
 *
 * ONE tonight, and it is a BIRTH rather than an amendment. Iron rule 1 is
 * about a law being born in the LISP before any JS; nothing about tonight's
 * feature belongs in an existing kit, because a J-pull is not a property of a
 * wardrobe or of a base unit — it is a property of a FRONT, and it is stated
 * once for every front there is.
 */
export const T57_LISP_FILES = [T57_KIT];

/**
 * …and the routines the law has to be REACHABLE FROM. A rule defined and
 * never used is the failure this kind of feature is most likely to produce:
 * it balances, it passes the census, and the engine goes on deciding the edge
 * for itself in JavaScript.
 */
export const T57_GATED = [
  'SKY:jpullEdge', 'SKY:jpullRun', 'jpullMakeLayers', 'jpullNote',
  'drawJpullEdge', 'jpullOnPanel', 'jpullClosesOn', 'jpullReachDepth',
];

/**
 * The owner's own numbers, by the name the kit gives each of them.
 *
 * These are PARSED off the file (section B) — never restated here — which is
 * what makes this a check rather than a second copy of the drawing. The form
 * is `(defun jpullLipT ( / ) 4.212)`, one line, exactly as
 * `ledGrooveEndExtra` is already written and already parsed.
 */
export const T57_PROFILE = [
  'jpullBoardT', 'jpullLipT', 'jpullSlotW', 'jpullSlotDepth', 'jpullSlotR',
  'jpullRearLeg', 'jpullReliefMm', 'jpullRunMm', 'jpullFromBottomMm',
  'jpullRampR',
];

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

/**
 * What git says changed under `reference/lisp/` since `ref`.
 *
 * ─── TURN 57: AND AN UNTRACKED FILE IS A CHANGE ───────────────────────────
 * `git diff` compares the ref to the working tree for TRACKED files only, so
 * a brand-new kit sitting un-added in the folder came back as *"nothing at
 * all"* — which is the one answer this turn must never get, because tonight's
 * whole LISP change IS a new file. `ls-files --others` asks the second
 * question, and the two answers are merged and sorted so the report reads the
 * same before and after the commit that adds it.
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

/**
 * ONE NUMBER, READ OFF THE LAW.
 *
 * `(defun jpullLipT ( / ) 4.212)` → 4.212. The spaces inside `( / )` are part
 * of the house form and part of this pattern on purpose: a constant written
 * `()` or spread over two lines would not be found, and that is the point —
 * the engine's own reader is written to the same shape, so a kit that drifted
 * out of the form would break both at once rather than only one of them.
 *
 * @returns {number|null} null where the file does not state it in that form
 */
export function lispConstant(name, dir = LISP_DIR, file = T57_KIT) {
  const text = readFileSync(join(dir, file), 'utf8');
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = text.match(new RegExp(`\\(defun\\s+${esc}\\s*\\(\\s*/\\s*\\)\\s*(-?[0-9]+(?:\\.[0-9]+)?)\\s*\\)`));
  return m ? Number(m[1]) : null;
}

/**
 * WHO DEFINES TONIGHT'S LAW AND WHO CALLS IT.
 *
 * One `(defun SKY:jpullEdge` in the whole tree, in the kit that owns the
 * J-pull, and NOT ONE mention anywhere else. That last clause is the one a
 * paren count cannot make: a kit that had grown its own edge rule would
 * balance perfectly and still be a second answer to one question.
 */
export function routineCensus(dir = LISP_DIR) {
  const rows = readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.lsp'))
    .sort()
    .map((name) => {
      const text = readFileSync(join(dir, name), 'utf8');
      const esc = T57_ROUTINE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
  if (census.defined.length !== 1 || census.defined[0] !== T57_KIT) {
    faults.push(`${T57_ROUTINE} must be defined exactly once, in ${T57_KIT}`
      + ` — found in [${census.defined.join(', ') || 'nowhere'}]`);
  }
  const strays = census.callers.filter((n) => n !== T57_KIT && !T57_CALLERS.includes(n));
  for (const s of strays) faults.push(`${s} mentions ${T57_ROUTINE} and is not the file that owns it`);
  for (const fault of gateFaults()) faults.push(fault);
  return faults;
}

/**
 * Is the law actually STATED, is the drawing CLOSED, and is the doctrine said
 * out loud?
 *
 * A file that defined the edge resolver and left the run, the ramp or the
 * profile out would draw a third of the feature and pass a paren count.
 */
export function gateFaults(dir = LISP_DIR) {
  const faults = [];
  if (!existsSync(join(dir, T57_KIT))) {
    faults.push(`${T57_KIT} does not exist — tonight's law has no home`);
    return faults;
  }
  const text = readFileSync(join(dir, T57_KIT), 'utf8');
  for (const routine of T57_GATED) {
    if (!text.includes(`(defun ${routine} `)) faults.push(`${routine} is not defined in ${T57_KIT}`);
  }
  for (const c of T57_PROFILE) {
    if (lispConstant(c, dir) === null) {
      faults.push(`${c} is not stated as a one-line constant in ${T57_KIT}`);
    }
  }

  // ─── THE DRAWING CLOSES ────────────────────────────────────────────────
  // 4.212 + 10 + 3.788 = 18.000, read off the file. This is the check on the
  // whole section: three parts that do not add up to the board are a profile
  // that eats the next board or leaves a rib nobody drew.
  const lip = lispConstant('jpullLipT', dir);
  const slot = lispConstant('jpullSlotW', dir);
  const leg = lispConstant('jpullRearLeg', dir);
  const board = lispConstant('jpullBoardT', dir);
  if ([lip, slot, leg, board].every((v) => typeof v === 'number')) {
    const sum = lip + slot + leg;
    if (Math.abs(sum - board) > 1e-6) {
      faults.push(`the owner's section does not close: ${lip} + ${slot} + ${leg}`
        + ` = ${sum}, and the board is ${board}`);
    }
  }

  // …and the LAW must be STATED, not only the arithmetic. The doctrine is
  // the thing this turn most nearly got wrong, so the file has to say it.
  if (!/A J-PULL IS A HANDLE SYSTEM/i.test(text)) {
    faults.push(`${T57_KIT} states the profile but not the axis it lives on`);
  }
  if (!/nie rob J/i.test(text)) {
    faults.push(`${T57_KIT} does not carry the owner's words about wall doors`);
  }
  if (!/wjazd po luku/i.test(text)) {
    faults.push(`${T57_KIT} does not carry the owner's words about the arc lead-in`);
  }
  // NEVER on a diagonal. Stated, and made unsayable by the resolver's three
  // answers — the sentence is what tells the next reader that is deliberate.
  if (!/NEVER on a diagonal edge/i.test(text)) {
    faults.push(`${T57_KIT} does not forbid the diagonal edge in words`);
  }
  // The ramp radius is a PLACEHOLDER and the file must admit it, because the
  // owner is going to tune it and nobody should have to guess which number.
  if (!/PLACEHOLDER/.test(text)) {
    faults.push(`${T57_KIT} does not name the ramp radius as a placeholder`);
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
  process.stdout.write(`\n${T57_ROUTINE} — defined in [${census.defined.join(', ')}], called from `
    + `[${census.callers.join(', ') || 'nowhere yet'}]\n`);
  const faults = routineFaults(census);
  for (const f of faults) process.stdout.write(`  ← ${f}\n`);
  bad += faults.length;
  if (!faults.length) {
    const lip = lispConstant('jpullLipT');
    const slot = lispConstant('jpullSlotW');
    const leg = lispConstant('jpullRearLeg');
    const board = lispConstant('jpullBoardT');
    process.stdout.write('  One edge law, one owner — and the run, the ramp and the note beside it. ✓\n');
    process.stdout.write(`  The drawing closes: ${lip} + ${slot} + ${leg} = ${lip + slot + leg} on a ${board} mm board. ✓\n`);
    process.stdout.write(`  ${rows.length}/${rows.length} at 0/0 — the shelf as it stands, derived not typed.\n`);
  }

  const againstAt = argv.indexOf('--against');
  if (againstAt >= 0 && argv[againstAt + 1]) {
    const ref = argv[againstAt + 1];
    const changed = lispDiffAgainst(ref);
    process.stdout.write(`\nreference/lisp/ vs ${ref}:\n`);
    if (!changed.length) process.stdout.write('  nothing at all.\n');
    for (const c of changed) process.stdout.write(`  ${c.status}  ${c.file}\n`);
    const offenders = changed.filter((c) => !T57_LISP_FILES.some((f) => c.file.endsWith(f)));
    if (offenders.length) {
      process.stdout.write(`\nLISP IS LAW: ${offenders.length} other kit(s) touched — only `
        + `${T57_LISP_FILES.join(', ')} may move.\n`);
      bad += offenders.length;
    } else {
      process.stdout.write('\nNo other kit is touched. ✓\n');
    }
  }

  process.exit(bad === 0 ? 0 : 1);
}
