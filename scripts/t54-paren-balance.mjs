#!/usr/bin/env node
// ─── PAREN BALANCE 0/0, BY SCRIPT (turn 54, CLAUDE.md iron rule 3) ──────────
//
//   *"LISP IS LAW, FIRST. F1's trio law and F3's leaf-under-slope law are cut
//   on machines, so they are written in `reference/lisp/` BEFORE the JS: F1 in
//   SKYLON_COMMON's slope section (amending the T47 words it corrects — leave
//   the history, add the correction with tonight's date and the owner's
//   ruling); F3 in the kit that owns the door leaf. F4's `WATCH_INSIDE 60 → 40`
//   lands in KIT_WATCH_DRAWER.lsp with the trade note amended. Paren: 14 kits,
//   every one 0/0, count derived."*
//
// …and then F7 buries one: *"paren 13×0/0 (post-F7, derived)"*. The COUNT is
// derived from the folder here and in the suite rather than typed, so the
// burial is a deleted file and not an edit — 14 before the F7 commit, 13
// after, and this script never knew either number.
//
// T53's script, RE-HEADED and re-pointed, because the claim is TONIGHT's and a
// script that checked last night's claim would pass while tonight's was broken.
//
// Three things are asked, and the third is the one a paren count cannot make:
//
//   1. EVERY KIT BALANCES 0/0, with no `)` that closes nothing. The reader
//      skips `;` comments and "strings" character by character — these kits'
//      sections are mostly prose and the prose is full of brackets.
//
//   2. WHICH FILES MOVED. `--against <ref>` asks git rather than taking
//      anybody's word. Tonight exactly FOUR may: `SKYLON_COMMON.lsp` (M),
//      which gains F1's two reach functions, the trio pivots and F2's peak
//      merge; `KIT_DOOR_DOUBLE.lsp` (M), which gains F3's leaf law;
//      `KIT_WATCH_DRAWER.lsp` (M), whose inside depth the owner re-sized
//      60 → 40; and `KIT_SHOE_BOX.lsp` (D) — F7's licence (2), the grave
//      named. Nothing else in the folder may be touched.
//
//   3. THE CALL GRAPH. Tonight's carcass cut line is DEFINED once, in the file
//      that owns every slope walk already, and mentioned in no other kit. A
//      kit that had grown its own cut-line walk would balance perfectly and
//      still be two answers to one question — which is the exact disease the
//      trio just died of (one reach fed three pivots).
//
// Usage:
//     node scripts/t54-paren-balance.mjs                    # every kit
//     node scripts/t54-paren-balance.mjs --against 69b87e1  # …and the diff rule
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
export const T54_ROUTINE = 'SKY:carcassCutPts';
export const T54_KIT = 'SKYLON_COMMON.lsp';
/** Who may call it. The file that defines it is also its only caller. */
export const T54_CALLERS = ['SKYLON_COMMON.lsp'];

/** The kit that owns the door leaf, where F3's law is born. */
export const T54_DOOR_KIT = 'KIT_DOOR_DOUBLE.lsp';

/** F7's grave. licence (2): this file is DELETED tonight, by name. */
export const T54_GRAVE = 'KIT_SHOE_BOX.lsp';

/**
 * Every file under reference/lisp/ this turn is allowed to have moved.
 *
 * FOUR tonight — three amendments and one burial. Iron rule 3 is about a law
 * being BORN in the LISP before any JS; sanctity licence (2) is about a world
 * dying whole. Both permissions are written down here rather than assumed.
 */
export const T54_LISP_FILES = [
  T54_KIT, T54_DOOR_KIT, 'KIT_WATCH_DRAWER.lsp', T54_GRAVE,
];

/**
 * …and the routines the law has to be REACHABLE FROM. A rule defined and never
 * used is the failure this kind of feature is most likely to produce: it
 * balances, it passes the census, and the trio goes on hanging from one line.
 * These live in SKYLON_COMMON beside the routine itself.
 */
export const T54_GATED = [
  'SKY:ceilReachAt', 'SKY:cutReachDrop', 'SKY:segDegAt', 'SKY:cutReachAt',
  'SKY:trioFacePivot', 'SKY:trioRoofPivot', 'SKY:trioShelfPivot',
  'SKY:roofPeakPts',
];

/** F3's two readers, in the door kit — the leaf line and its split sub-set. */
export const T54_DOOR_GATED = ['SKY:leafCeilAt', 'SKY:leafSegLineY'];

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
 * One `(defun SKY:carcassCutPts` in the whole tree, in the file that owns
 * every slope walk already, and NOT ONE mention anywhere else. That last
 * clause is the one a paren count cannot make: a kit that had grown its own
 * cut-line walk would balance perfectly and still be a second answer to one
 * question — the disease the trio died of.
 */
export function routineCensus(dir = LISP_DIR) {
  const rows = readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.lsp'))
    .sort()
    .map((name) => {
      const text = readFileSync(join(dir, name), 'utf8');
      const esc = T54_ROUTINE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
  if (census.defined.length !== 1 || census.defined[0] !== T54_KIT) {
    faults.push(`${T54_ROUTINE} must be defined exactly once, in ${T54_KIT}`
      + ` — found in [${census.defined.join(', ') || 'nowhere'}]`);
  }
  const strays = census.callers.filter((n) => n !== T54_KIT && !T54_CALLERS.includes(n));
  for (const s of strays) faults.push(`${s} mentions ${T54_ROUTINE} and is not the file that owns it`);
  for (const fault of gateFaults()) faults.push(fault);
  return faults;
}

/**
 * Is the law actually STATED, and are its readers there?
 *
 * The two reach functions and the three pivots are the halves of F1; the leaf
 * line and its split sub-set are F3's; and a folder that still held the shoe
 * kit would mean F7's licence (2) was spent on nothing. A file that defined
 * the walk and left these out would draw two thirds of the feature.
 */
export function gateFaults(dir = LISP_DIR) {
  const text = readFileSync(join(dir, T54_KIT), 'utf8');
  const faults = [];
  for (const routine of T54_GATED) {
    if (!text.includes(`(defun ${routine} `)) faults.push(`${routine} is not defined in ${T54_KIT}`);
  }
  // …and the LAW must be STATED, not only the arithmetic. Iron rule 3: the
  // rule is BORN here, so the sentence that says why has to be here too.
  if (!/TWO REACH FUNCTIONS, NOT ONE/i.test(text)) {
    faults.push(`${T54_KIT} states the arithmetic but not the law it comes from`);
  }
  // …and the DISEASE, named, because the next turn will meet it again.
  if (!/one reach[^\n]*fed every pivot/i.test(text)) {
    faults.push(`${T54_KIT} does not name the disease — one reach fed every pivot`);
  }
  // …and the Petros law as GEOMETRY, because six turns of eyeballing merged.
  if (!/DISJOINT, MEASURED/i.test(text)) {
    faults.push(`${T54_KIT} does not state the disjointness as a measurement`);
  }

  // F3's law lives with the door leaf, not here.
  const door = readFileSync(join(dir, T54_DOOR_KIT), 'utf8');
  for (const routine of T54_DOOR_GATED) {
    if (!door.includes(`(defun ${routine} `)) faults.push(`${routine} is not defined in ${T54_DOOR_KIT}`);
  }
  if (!/Three surfaces, one line/i.test(door)) {
    faults.push(`${T54_DOOR_KIT} does not state the parity law — three surfaces, one line`);
  }

  // F4's re-size is an AMENDMENT with the history kept and the veto beside it.
  const watch = readFileSync(join(dir, 'KIT_WATCH_DRAWER.lsp'), 'utf8');
  if (!/60 -> 40/.test(watch)) {
    faults.push('KIT_WATCH_DRAWER.lsp does not carry the 60 -> 40 amendment');
  }
  if (!/120 prosze/i.test(watch)) {
    faults.push("KIT_WATCH_DRAWER.lsp does not carry the owner's words — 120 prosze");
  }

  // F7's grave: licence (2) says the file DIES. Present = the licence unspent.
  if (existsSync(join(dir, T54_GRAVE))) {
    faults.push(`${T54_GRAVE} still stands — F7's licence (2) names it a grave`);
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
  process.stdout.write(`\n${T54_ROUTINE} — defined in [${census.defined.join(', ')}], called from `
    + `[${census.callers.join(', ') || 'nowhere yet'}]\n`);
  const faults = routineFaults(census);
  for (const f of faults) process.stdout.write(`  ← ${f}\n`);
  bad += faults.length;
  if (!faults.length) {
    process.stdout.write('  Two reaches, three pivots, one owner — and the leaf law beside the leaf. ✓\n');
    process.stdout.write(`  ${rows.length}/${rows.length} at 0/0 — the shelf as it stands, derived not typed.\n`);
  }

  const againstAt = argv.indexOf('--against');
  if (againstAt >= 0 && argv[againstAt + 1]) {
    const ref = argv[againstAt + 1];
    const changed = lispDiffAgainst(ref);
    process.stdout.write(`\nreference/lisp/ vs ${ref}:\n`);
    if (!changed.length) process.stdout.write('  nothing at all.\n');
    for (const c of changed) process.stdout.write(`  ${c.status}  ${c.file}\n`);
    const offenders = changed.filter((c) => !T54_LISP_FILES.some((f) => c.file.endsWith(f)));
    if (offenders.length) {
      process.stdout.write(`\nIRON RULE 3: ${offenders.length} other kit(s) touched — only `
        + `${T54_LISP_FILES.join(', ')} may move.\n`);
      bad += offenders.length;
    } else {
      process.stdout.write('\nNo other kit is touched. ✓\n');
    }
  }

  process.exit(bad === 0 ? 0 : 1);
}
