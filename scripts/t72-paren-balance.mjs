#!/usr/bin/env node
// ─── PAREN BALANCE 14/14 AT 0/0 (turn 72, CLAUDE.md TESTS AND PROOF) ───────
//
// CLAUDE.md T72 asks for it in four words — *"parens 14/14"* — and FROZEN 2
// says the reason in two more: *"LISP untouched."*
//
// So this turn's census makes TWO statements, and the second is the whole
// point of running it on a turn that wrote no LISP at all:
//
//   1. EVERY KIT BALANCES 0/0, with no `)` that closes nothing. The reader is
//      T45's, imported from `t57-paren-balance.mjs` rather than copied — one
//      reader, as R11 says about everything else in this application — and it
//      skips `;` comments and "strings" character by character, because these
//      kits are mostly prose and the prose is full of brackets. The COUNT is
//      derived from the folder, so tonight's 14 is a reading and not a claim.
//
//   2. NOT ONE FILE MOVED. `--against <ref>` asks git rather than taking
//      anybody's word, and tonight the allowed list is EMPTY: fourteen points
//      from one afternoon in the configurator, not one of them a new piece of
//      geometry, so not one line of the law may have changed. A turn that
//      quietly amended a kit would balance perfectly and still have broken
//      iron rule 1 the other way round.
//
// A NEW FILE, beside t57's, for T54's own reason: *"a script that checked
// last night's claim would pass while tonight's was broken."* T57's file goes
// on asserting T57's claim, and `test/turn57-*.test.js` goes on importing it.
//
// Usage:
//     node scripts/t72-paren-balance.mjs                    # the census
//     node scripts/t72-paren-balance.mjs --against main     # …and the diff rule
//
// Zero dependencies.

import { fileURLToPath } from 'node:url';
import { balanceOfKits, lispDiffAgainst } from './t57-paren-balance.mjs';

/** What CLAUDE.md T57 counted, and what T72 expects to find unchanged. */
export const T72_KITS = 14;

/**
 * Every file under `reference/lisp/` this turn is allowed to have moved.
 *
 * EMPTY, and that is the statement. FROZEN 2: *"LISP untouched."*
 */
export const T72_LISP_FILES = [];

/** The census: every kit, its balance, and whether the shelf adds up to 14. */
export function census(dir = 'reference/lisp') {
  const rows = balanceOfKits(dir);
  return {
    rows,
    total: rows.length,
    unbalanced: rows.filter((r) => r.balance !== 0 || r.negativeAt !== null),
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { argv } = process;
  let bad = 0;

  const { rows, total, unbalanced } = census();
  process.stdout.write('─── T72 · THE PAREN CENSUS ───\n\n');
  for (const r of rows) {
    const ok = r.balance === 0 && r.negativeAt === null;
    if (!ok) bad += 1;
    process.stdout.write(
      `  ${ok ? 'ok  ' : 'FAIL'} ${r.name.padEnd(30)} ${String(r.open).padStart(5)} open  `
      + `${String(r.close).padStart(5)} close  balance ${r.balance}  deepest ${r.deepest}`
      + `${r.negativeAt ? `  · a ) closed nothing at line ${r.negativeAt}` : ''}\n`,
    );
  }
  process.stdout.write(`\n  ${total - unbalanced.length}/${total} at 0/0 — derived from the folder, not typed.\n`);
  if (total !== T72_KITS) {
    process.stdout.write(`  THE SHELF MOVED: ${total} kits, and CLAUDE.md says ${T72_KITS}.\n`);
    bad += 1;
  }

  const againstAt = argv.indexOf('--against');
  if (againstAt >= 0 && argv[againstAt + 1]) {
    const ref = argv[againstAt + 1];
    const changed = lispDiffAgainst(ref);
    process.stdout.write(`\nreference/lisp/ vs ${ref}:\n`);
    if (!changed.length) process.stdout.write('  nothing at all.\n');
    for (const c of changed) process.stdout.write(`  ${c.status}  ${c.file}\n`);
    const offenders = changed.filter((c) => !T72_LISP_FILES.some((f) => c.file.endsWith(f)));
    if (offenders.length) {
      process.stdout.write(`\nFROZEN 2 says LISP UNTOUCHED: ${offenders.length} kit(s) moved tonight.\n`);
      bad += offenders.length;
    } else {
      process.stdout.write('\nLISP untouched, as FROZEN 2 says. ✓\n');
    }
  }

  process.exit(bad === 0 ? 0 : 1);
}
