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

import { existsSync, readdirSync, readFileSync } from 'node:fs';

import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { goldenOf, writeGolden } from './t75-golden.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const kit = (type, extra = {}) => ({ ...defaultParamsFor(type, P), unit_num: '01', ...extra });

const BASE_GOLDENS = [
  { file: 'golden-blind-base.json', F: 'F3', source: 'KIT_BUD_FULL.lsp (the carcass); the blank is a rectangle', params: () => kit('BLIND_BASE', { doors: { count: 1 } }) },
  { file: 'golden-blind-wall.json', F: 'F3', source: 'KIT_WUD_FULL.lsp (the carcass); the blank is a rectangle', params: () => kit('BLIND_WALL', { doors: { count: 1 } }) },
  { file: 'golden-blind-wardrobe.json', F: 'F3', source: 'KIT_WARDROBE_FULL.lsp (the carcass); the blank is a rectangle', params: () => kit('BLIND_WARDROBE', { doors: { count: 1 } }) },
  // T75 F7 · CLAUDE.md: *"a BUD 600 with a 200 x 200 full-height BL notch"*, the
  // LISP's own NUMBERS case (KIT_NOTCH.lsp section I: golden-bud.json's BUD-A,
  // front 25, one shelf, hinge L).
  {
    file: 'golden-notch.json',
    F: 'F7',
    source: 'KIT_NOTCH.lsp (the notch, its NUMBERS block) on KIT_BUD_FULL.lsp (the parent)',
    params: () => kit('BUD', { shelves: 1, notch: { corner: 'BL', w: 200, d: 200, h: 0 } }),
  },
];

// Every F after F6 names its goldens in its own fragment
// (`scripts/t75-classify.d/fNN.mjs`, export GOLDENS: the same shape as above,
// `params` a function of nothing), so no two writers share a line here.
const FRAGMENT_DIR = new URL('./t75-classify.d/', import.meta.url);
const fragmentGoldens = [];
if (existsSync(FRAGMENT_DIR)) {
  for (const name of readdirSync(FRAGMENT_DIR).filter((n) => /^f\d\d[a-z0-9-]*\.mjs$/.test(n)).sort()) {
    // eslint-disable-next-line no-await-in-loop
    const frag = await import(new URL(name, FRAGMENT_DIR));
    fragmentGoldens.push(...(frag.GOLDENS || []));
  }
}
export const T75_GOLDENS = [...BASE_GOLDENS, ...fragmentGoldens];

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
