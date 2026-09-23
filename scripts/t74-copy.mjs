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
import { existsSync, readFileSync } from 'node:fs';
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
    pro: 'src/components/UnitSizeModal.jsx',
    why: 'F7 · the wardrobe wall unit\'s DEPTH is a figure too, with BACK | FRONT beside it, '
      + 'and the clicked figure\'s field keeps asking for the focus until it has it. '
      + '*"Zmiana przez klik w wymiar (szer/wys/głęb), głębokość wyrównana do tyłu albo do frontu."*',
  },
  {
    pro: 'src/components/ElementProperties.jsx',
    why: 'F6 · the second shoe drawer\'s own height is shown, not edited: it is set by '
      + 'its mounting height. *"Regulacja = WYSOKOŚĆ MONTAŻU, nie wysokość szuflady."* '
      + 'F13 · the free panel\'s two rows: how it stands (along or across the wall, vertical, '
      + 'horizontal or any angle) and its board (length, width, thickness). *"ustawia '
      + 'pion/poziom/każdą orientację, długość, grubość."*',
  },
];

// A copy the machine is about to make for the first time has no hash yet.
/**
 * THE PRO FILES TONIGHT COPIES FOR THE FIRST TIME, not edited: the manifest's
 * `T74_COPIES`. Their PRO original does not move; the copy is new.
 */
export const T74_NEW_COPIES = [
  {
    pro: 'src/components/PartDetailModal.jsx',
    why: 'F13 · the free panel\'s 2klik opens PRO\'s own piece editor. *"Dwuklik = wejście '
      + 'w edycję jak w PRO (wycięcie łuku itp.)."*',
  },
];

const hash = (rel) => (existsSync(join(ROOT, rel))
  ? createHash('sha256').update(readFileSync(join(ROOT, rel))).digest('hex')
  : null);
const retailOf = (pro) => ALL_COPIES.find((c) => c.pro === pro)?.retail || null;

if (check) {
  for (const { pro, why } of [...T74_PRO_EDITS, ...T74_NEW_COPIES]) {
    console.log(`${pro}\n  -> ${retailOf(pro)}\n  ${why}\n`);
  }
  process.exit(0);
}

// Every retail copy's hash BEFORE, so the set that moved can be named after.
const before = new Map(ALL_COPIES.map((c) => [c.retail, hash(c.retail)]));

execFileSync('node', [join(ROOT, 'scripts/t63-copy.mjs')], { cwd: ROOT, stdio: 'inherit' });

const moved = ALL_COPIES.map((c) => c.retail).filter((rel) => hash(rel) !== before.get(rel));
const wanted = [...T74_PRO_EDITS, ...T74_NEW_COPIES].map((e) => retailOf(e.pro)).filter(Boolean);

console.log('');
for (const rel of wanted) {
  console.log(`${moved.includes(rel) ? 're-made' : 'unchanged'}  ${rel}`);
}

const stray = moved.filter((rel) => !wanted.includes(rel));
if (stray.length) {
  console.error(`\nTHE MACHINE TOUCHED A COPY NOTHING LICENSED:\n  ${stray.join('\n  ')}`);
  process.exit(1);
}
const missing = [...T74_PRO_EDITS, ...T74_NEW_COPIES].filter((e) => !retailOf(e.pro));
if (missing.length) {
  console.error(`\nNOT IN THE MANIFEST:\n  ${missing.map((e) => e.pro).join('\n  ')}`);
  process.exit(1);
}
console.log(`\n${moved.length} copy/copies re-made, all of them licensed.`);
