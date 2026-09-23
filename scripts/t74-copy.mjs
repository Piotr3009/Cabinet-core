#!/usr/bin/env node
// ─── TURN 74 · THE COPY, AFTER TONIGHT'S EDITS INTO PRO ────────────────────
//
// CLAUDE.md T74, LAWS: *"1:1 = COPY: a PRO surface edited is re-copied to its
// retail copy by the copy script (`scripts/t72-copy.mjs` pattern), never by
// hand."*
//
// T72's machine, pointed at tonight's list: this file NAMES the PRO files T74
// edits, runs `scripts/t63-copy.mjs` (the manifest's own three mechanical
// passes and nothing else), then PROVES the only retail files that moved are
// the copies of the files named here.
//
// `src/components/DrawRoomModal.jsx` is edited tonight too (F3, F4) and is
// NOT here: its retail twin stopped being a copy at T69 F2 and is not in the
// manifest, so it was edited by hand, the way T69 left it.
//
//   node scripts/t74-copy.mjs            make the copies and check the set
//   node scripts/t74-copy.mjs --check    say which files tonight edited, and stop

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ALL_COPIES } from './t63-copies.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const check = process.argv.includes('--check');

/**
 * THE PRO FILES TONIGHT EDITS THAT HAVE A RETAIL COPY, each with the F that
 * licensed it. Every one is also an `EXEMPT` entry in
 * `test/turn59-f1-the-switch.test.js`, re-frozen at its new hash in the same
 * commit as the edit.
 */
export const T74_PRO_EDITS = [
  {
    pro: 'src/components/ElementProperties.jsx',
    why: 'F6 · the second shoe drawer\'s own height is shown, not edited: it is set by '
      + 'its mounting height. *"Regulacja = WYSOKOŚĆ MONTAŻU, nie wysokość szuflady."*',
  },
];

const hash = (rel) => createHash('sha256').update(readFileSync(join(ROOT, rel))).digest('hex');
const retailOf = (pro) => ALL_COPIES.find((c) => c.pro === pro)?.retail || null;

if (check) {
  for (const { pro, why } of T74_PRO_EDITS) {
    console.log(`${pro}\n  -> ${retailOf(pro)}\n  ${why}\n`);
  }
  process.exit(0);
}

// Every retail copy's hash BEFORE, so the set that moved can be named after.
const before = new Map(ALL_COPIES.map((c) => [c.retail, hash(c.retail)]));

execFileSync('node', [join(ROOT, 'scripts/t63-copy.mjs')], { cwd: ROOT, stdio: 'inherit' });

const moved = ALL_COPIES.map((c) => c.retail).filter((rel) => hash(rel) !== before.get(rel));
const wanted = T74_PRO_EDITS.map((e) => retailOf(e.pro)).filter(Boolean);

console.log('');
for (const rel of wanted) {
  console.log(`${moved.includes(rel) ? 're-made' : 'unchanged'}  ${rel}`);
}

const stray = moved.filter((rel) => !wanted.includes(rel));
if (stray.length) {
  console.error(`\nTHE MACHINE TOUCHED A COPY NOTHING LICENSED:\n  ${stray.join('\n  ')}`);
  process.exit(1);
}
const missing = T74_PRO_EDITS.filter((e) => !retailOf(e.pro));
if (missing.length) {
  console.error(`\nNOT IN THE MANIFEST:\n  ${missing.map((e) => e.pro).join('\n  ')}`);
  process.exit(1);
}
console.log(`\n${moved.length} copy/copies re-made, all of them licensed.`);
