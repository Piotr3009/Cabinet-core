#!/usr/bin/env node
// ─── T75 · THE NEW GOLDENS, WRITTEN ONCE, BY NAME ──────────────────────────
//
// CLAUDE.md T75, FROZEN 1: *"Every new kit and every new cut geometry gets a
// golden of its own under `fixtures/` (named in each F)."*  Each entry below
// is the F that owns a golden and the params it is cut from (a kit's own
// defaults, through `defaultParamsFor`). A golden is written when its F lands
// and then held: re-writing one is a decision named in the PR, never a way to
// make a test green.
//
//   node scripts/t75-goldens.mjs --write golden-blind-base.json   write one
//   node scripts/t75-goldens.mjs --check                          compare all

import { existsSync, readFileSync } from 'node:fs';

import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { goldenOf, writeGolden } from './t75-golden.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const kit = (type, extra = {}) => ({ ...defaultParamsFor(type, P), unit_num: '01', ...extra });

export const T75_GOLDENS = [
  { file: 'golden-blind-base.json', F: 'F3', source: 'KIT_BUD_FULL.lsp (the carcass); the blank is a rectangle', params: () => kit('BLIND_BASE', { doors: { count: 1 } }) },
  { file: 'golden-blind-wall.json', F: 'F3', source: 'KIT_WUD_FULL.lsp (the carcass); the blank is a rectangle', params: () => kit('BLIND_WALL', { doors: { count: 1 } }) },
  { file: 'golden-blind-wardrobe.json', F: 'F3', source: 'KIT_WARDROBE_FULL.lsp (the carcass); the blank is a rectangle', params: () => kit('BLIND_WARDROBE', { doors: { count: 1 } }) },
];

const args = process.argv.slice(2);
if (args[0] === '--write') {
  const g = T75_GOLDENS.find((x) => x.file === args[1]);
  if (!g) { console.error(`no golden named ${args[1]}`); process.exit(1); }
  writeGolden(`${ROOT}fixtures/${g.file}`, { name: g.file, F: g.F, source: g.source, params: g.params() });
  console.log(`wrote fixtures/${g.file}`);
} else if (args[0] === '--check') {
  let bad = 0;
  for (const g of T75_GOLDENS) {
    const path = `${ROOT}fixtures/${g.file}`;
    if (!existsSync(path)) { console.log(`MISSING  ${g.file}`); bad += 1; continue; }
    const file = JSON.parse(readFileSync(path, 'utf8'));
    const same = JSON.stringify(goldenOf(file.params, P)) === JSON.stringify(file.expected);
    if (!same) bad += 1;
    console.log(`${same ? 'ok      ' : 'MOVED   '} ${g.file} (${g.F})`);
  }
  process.exit(bad ? 1 : 0);
}
