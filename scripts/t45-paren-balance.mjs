#!/usr/bin/env node
// ─── PAREN BALANCE 0/0, BY SCRIPT (turn 45, CLAUDE.md iron rule 3) ──────────
//
//   *"LISP is law (F9-CNC only): the LED groove is born in `reference/lisp/`
//   first, application follows. Paren balance 0/0 by script. No other kit is
//   touched."*
//
// A LISP file with one paren out is a file AutoCAD loads silently and then
// behaves oddly under — the reader gets to the end of the last `defun`, finds
// it unterminated, and swallows whatever comes next as part of it. There is no
// error until the day a function nobody has called in a month does nothing.
// So the balance is a SCRIPT, run every time, rather than a thing somebody
// counted once.
//
// ─── WHAT COUNTS AS A PAREN ────────────────────────────────────────────────
//
// Not every one of them. A `;` starts a comment that runs to the end of the
// line, and this kit's comments are full of prose with brackets in it; a
// "string" may hold either. Both are skipped, character by character, which is
// what makes the count mean something rather than approximately something.
//
// The second half of the rule is the one a diff cannot state: NO OTHER KIT IS
// TOUCHED. `--against <ref>` asks git, so the claim is checked rather than
// asserted — on this branch exactly one file under `reference/lisp/` is new
// and none is modified.
//
// Usage:
//     node scripts/t45-paren-balance.mjs                 # every kit
//     node scripts/t45-paren-balance.mjs --against main  # …and the diff rule
//
// Exit 0 = every file balances 0/0 (and, when asked, only the LED groove is
// new). Exit 1 = a kit is out.
//
// Zero dependencies.

import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const LISP_DIR = 'reference/lisp';

/** The one file this turn is allowed to add, and the only one. */
export const T45_LISP_FILE = 'KIT_LED_GROOVE.lsp';

/**
 * The paren balance of one LISP source.
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

  const againstAt = argv.indexOf('--against');
  if (againstAt >= 0 && argv[againstAt + 1]) {
    const ref = argv[againstAt + 1];
    const changed = lispDiffAgainst(ref);
    process.stdout.write(`\nreference/lisp/ vs ${ref}:\n`);
    if (!changed.length) process.stdout.write('  nothing at all.\n');
    for (const c of changed) process.stdout.write(`  ${c.status}  ${c.file}\n`);
    const offenders = changed.filter((c) => !c.file.endsWith(T45_LISP_FILE));
    if (offenders.length) {
      process.stdout.write(`\nIRON RULE 3: ${offenders.length} other kit(s) touched — only ${T45_LISP_FILE} may move.\n`);
      bad += offenders.length;
    } else {
      process.stdout.write(`\nNo other kit is touched. ✓\n`);
    }
  }

  process.exit(bad === 0 ? 0 : 1);
}
