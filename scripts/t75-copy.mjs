#!/usr/bin/env node
// ─── TURN 75 · THE COPY, AFTER TONIGHT'S EDITS INTO PRO ────────────────────
//
// CLAUDE.md T75, LAWS: *"1:1 = COPY. A PRO surface edited is re-copied to its
// retail copy by `scripts/t75-copy.mjs` (`t74-copy.mjs` pattern), never by
// hand."*
//
// T74's machine, pointed at tonight's list: this file NAMES the PRO files T75
// edits that have a retail copy, runs `scripts/t63-copy.mjs` (the manifest's
// own three mechanical passes and nothing else), then PROVES the only retail
// files that moved are the copies of the files named here.
//
// `src/components/BomPanel.jsx` and `src/pages/ConfiguratorPage.jsx` are
// edited tonight too (F5) and are NOT here: neither has a retail copy in the
// manifest (retail is the WARDROBE configurator; the worktop is a kitchen's).
//
//   node scripts/t75-copy.mjs            make the copies and check the set
//   node scripts/t75-copy.mjs --check    say which files tonight edited, and stop

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
export const T75_PRO_EDITS = [
  {
    pro: 'src/components/RoomModal.jsx',
    why: 'F9 · ADD ISLAND, the island in the plan (dragged whole, refused in words, its two figures '
      + 'clickable, Rotate 90°, Remove island), gated by the job\'s family: retail, a wardrobe job, never '
      + 'shows the button. *"twoja droga, plus dodawanie szafek po bokach lub end panele, w całości."*',
  },
  {
    pro: 'src/components/ContextMenu.jsx',
    why: 'F5 · the right-click offers the UPSTAND beside the plinth, on and off per run. '
      + '*"UPSTAND: an auto-part along the wall behind every base run that has a worktop ... '
      + 'on and off per run like the plinth."*',
  },
];

/** THE PRO FILES TONIGHT COPIES FOR THE FIRST TIME: none. */
export const T75_NEW_COPIES = [];

const hash = (rel) => (existsSync(join(ROOT, rel))
  ? createHash('sha256').update(readFileSync(join(ROOT, rel))).digest('hex')
  : null);
const retailOf = (pro) => ALL_COPIES.find((c) => c.pro === pro)?.retail || null;

if (check) {
  for (const { pro, why } of [...T75_PRO_EDITS, ...T75_NEW_COPIES]) {
    console.log(`${pro}\n  -> ${retailOf(pro)}\n  ${why}\n`);
  }
  process.exit(0);
}

// Every retail copy's hash BEFORE, so the set that moved can be named after.
const before = new Map(ALL_COPIES.map((c) => [c.retail, hash(c.retail)]));

execFileSync('node', [join(ROOT, 'scripts/t63-copy.mjs')], { cwd: ROOT, stdio: 'inherit' });
// RoomModal is one of T62's four, which T63's machine deliberately does not
// re-make: its copy is re-made by T69's (T67's rules, T62's class map), the
// machine every RoomModal edit since T67 has been copied with.
if (T75_PRO_EDITS.some((e) => e.pro === 'src/components/RoomModal.jsx')) {
  execFileSync('node', [join(ROOT, 'scripts/t69-copy.mjs')], { cwd: ROOT, stdio: 'inherit' });
}

const moved = ALL_COPIES.map((c) => c.retail).filter((rel) => hash(rel) !== before.get(rel));
const wanted = [...T75_PRO_EDITS, ...T75_NEW_COPIES].map((e) => retailOf(e.pro)).filter(Boolean);

console.log('');
for (const rel of wanted) {
  console.log(`${moved.includes(rel) ? 're-made' : 'unchanged'}  ${rel}`);
}

const stray = moved.filter((rel) => !wanted.includes(rel));
if (stray.length) {
  console.error(`\nTHE MACHINE TOUCHED A COPY NOTHING LICENSED:\n  ${stray.join('\n  ')}`);
  process.exit(1);
}
const missing = [...T75_PRO_EDITS, ...T75_NEW_COPIES].filter((e) => !retailOf(e.pro));
if (missing.length) {
  console.error(`\nNOT IN THE MANIFEST:\n  ${missing.map((e) => e.pro).join('\n  ')}`);
  process.exit(1);
}
console.log(`\n${moved.length} copy/copies re-made, all of them licensed.`);
