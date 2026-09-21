#!/usr/bin/env node
// ─── T71 · RENDER THE SET FOR THE PROOF KITCHEN, HEADLESS ───────────────────
//
//   node scripts/t71-render.mjs [--out verify/t71/]
//
// Every sheet of the set for the 3-7 Herbal Hill fixture, as SVG, straight
// from the engine, no browser. What a test asserts on and what the PR shows.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { sheetToSvg } from '../src/engine/drawings/svg.js';
import { wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { hhEntries, hhWorktops, HH_PROJECT, HH_ROOM } from '../test/fixtures/t71-herbal-hill.js';

const argOf = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const OUT = argOf('--out', new URL('../verify/t71/', import.meta.url).pathname);
mkdirSync(OUT, { recursive: true });

const sheets = wallDrawingSheets({
  entries: hhEntries(P),
  project: HH_PROJECT,
  room: HH_ROOM,
  worktops: hhWorktops(P),
  profile: P,
  date: '21.09.2026',
  design: { fronts: { style: 'F' } },
});
for (const s of sheets) {
  const file = join(OUT, `${String(s.no ?? '').padStart(2, '0')}-${s.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.svg`);
  writeFileSync(file, sheetToSvg(s.sheet, { kind: s.variant }));
  console.log(`${String(s.no ?? '').padStart(2, '0')}  ${s.name.padEnd(34)} ${s.sheet.scaleLabel || ''}  entities ${s.sheet.entities.length}  -> ${file}`);
}
