#!/usr/bin/env node
// ─── TURN 72 · THE COPY, AFTER TONIGHT'S EDITS INTO PRO ────────────────────
//
// The standing law, unchanged and the whole reason this file exists:
//
//   *"jak piszę 1 do 1 to KOPIUJ. ale kopiuj — nie kasuj, nie zmieniaj PRO,
//   tylko zrób identycznie w retail."*
//
// CLAUDE.md T72, LAWS: *"1:1 = COPY: a PRO surface edited tonight is re-copied
// to its retail copy the same night by the copy machine (`scripts/t69-copy.mjs`
// pattern, extended to the files named here), never by hand."*
//
// ─── AND THE MACHINE IS ALREADY WRITTEN ────────────────────────────────────
//
// T69's script existed because T67 pointed a narrowed copy of T63's machine at
// ONE file. Tonight's three files are all IN `scripts/t63-copies.mjs`'s
// manifest already, and `scripts/t63-copy.mjs` is the machine that makes them —
// the same three mechanical passes (imports repointed, classes reskinned,
// colours swapped) and nothing else. A fourth hand-maintained copy of that map
// would be the drift the manifest exists to prevent.
//
// So this file NAMES tonight's edits, runs that machine, and then PROVES that
// the only retail files it touched are the copies of the files PRO edited. A
// copy machine that quietly rewrote a fourth file would be caught here rather
// than in a diff nobody read.
//
//   node scripts/t72-copy.mjs            make the copies and check the set
//   node scripts/t72-copy.mjs --check    say which files tonight edited, and stop

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ALL_COPIES } from './t63-copies.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const check = process.argv.includes('--check');

/**
 * THE PRO FILES TONIGHT EDITS, each with the F that licensed it. Every one of
 * them is also an `EXEMPT` entry in `test/turn59-f1-the-switch.test.js`, with
 * the owner's own words and its new hash, in the same commit as the edit.
 */
export const T72_PRO_EDITS = [
  {
    pro: 'src/components/ElementProperties.jsx',
    why: 'F2 · `shelf-type` becomes two chips (*"nie choose, tylko te 2 opcje"*) and '
      + 'SET BACK FROM THE FRONT gains its two chips beside the field; F3 · CENTER ALL '
      + 'at the bottom of the shelf menu; F12 · the divider reaches the same setback row',
  },
  {
    pro: 'src/components/DoorModal.jsx',
    why: 'F6 · the hinge block the owner asked to see again — *"mamy fajny w PRO to menu '
      + 'z zawiasami i ze strzałkami up and down, skopiuj z PRO"*',
  },
  {
    pro: 'src/components/JpullRunModal.jsx',
    why: 'F4 · the run length is a typed number with the engine\'s min and max beside it — '
      + '*"nie może być przesuwakiem, musimy wpisywać liczby"*',
  },
];

const hash = (rel) => createHash('sha256').update(readFileSync(join(ROOT, rel))).digest('hex');
const retailOf = (pro) => ALL_COPIES.find((c) => c.pro === pro)?.retail || null;

if (check) {
  for (const { pro, why } of T72_PRO_EDITS) {
    console.log(`${pro}\n  → ${retailOf(pro)}\n  ${why}\n`);
  }
  process.exit(0);
}

// Every retail copy's hash BEFORE, so the set that moved can be named after.
const before = new Map(ALL_COPIES.map((c) => [c.retail, hash(c.retail)]));

execFileSync('node', [join(ROOT, 'scripts/t63-copy.mjs')], { cwd: ROOT, stdio: 'inherit' });

const moved = ALL_COPIES.map((c) => c.retail).filter((rel) => hash(rel) !== before.get(rel));
const wanted = T72_PRO_EDITS.map((e) => retailOf(e.pro)).filter(Boolean);

console.log('');
for (const rel of wanted) {
  console.log(`${moved.includes(rel) ? 're-made' : 'unchanged'}  ${rel}`);
}

const stray = moved.filter((rel) => !wanted.includes(rel));
if (stray.length) {
  console.error(`\nTHE MACHINE TOUCHED A COPY NOTHING LICENSED:\n  ${stray.join('\n  ')}`);
  process.exit(1);
}
const missing = T72_PRO_EDITS.filter((e) => !retailOf(e.pro));
if (missing.length) {
  console.error(`\nNOT IN THE MANIFEST:\n  ${missing.map((e) => e.pro).join('\n  ')}`);
  process.exit(1);
}
console.log(`\n${moved.length} copy/copies re-made, all of them licensed.`);
