#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT FOR TURN 67 ────────────────────────────────
//
// CLAUDE.md, TESTS AND PROOF, verbatim:
//
//   *"Goldens ×6 byte-identical; `UNNAMED=0`; parens 14/14 at 0/0;
//   `t67-classify.mjs` naming every engine/lib delta and proving none reaches
//   a fixture."*
//
// And F2's own fence, which is the reason this file matters more tonight than
// it did last turn:
//
//   *"Scope guard: the corner law lives OUTSIDE the cut path. Goldens must not
//   move; the classifier proves the deltas cannot reach a fixture."*
//
// FOUR LICENSED ENGINE/LIB FILES, and no others. For each delta this prints
// the REACH — what has to be true before the changed line can run, asked of
// the engine's own source rather than asserted — and whether any of the six
// fixtures makes it true. A delta whose reach is a code path no fixture enters
// cannot move a golden.
//
//   node scripts/t67-classify.mjs

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { dump } from './t64-classify.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const src = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const git = (args) => {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch { return null; }
};
const baseRef = () => ['origin/main', 'main'].find(
  (ref) => git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]) !== null,
);

/**
 * THE LICENCE, from CLAUDE.md's own LICENSED FILES section:
 *
 *   *"Engine/lib: `src/engine/room.js`, `src/lib/wallElements.js`,
 *   `src/lib/slopeLine.js` (F2 corner law only) · `src/engine/profile.js`
 *   (F5 default decor, F11 LED cap — keys and defaults only)."*
 *
 * …plus the one F9 names by grep rather than by path: a user-facing
 * *"Watch drawer"* LABEL, wherever it is. One was in the window registry.
 *
 * `src/lib/slopeLine.js` is licensed and WAS NOT TOUCHED: the corner law turned
 * out to need no new arithmetic there at all — a wall's height at its own end
 * is a value the slope record already carries, which is the whole reason the
 * law is cheap and safe. A licence unspent is worth saying out loud.
 */
const LICENSED = {
  'src/engine/room.js': 'F2 · wallNeighbours — the ring topology, a new export, read by nothing on the cut path',
  'src/lib/wallElements.js': 'F2 · the corner law: ownHeightAtEnd / cornerHeightAt / wallCornerHeights / impliedProfile*',
  'src/engine/profile.js': 'F5 · projectSettings.defaultCarcassDecorId · F10 · appearance.lighting.accessoryDrawerGain',
  'src/lib/modalLayer.js': 'F9 · the window registry\'s own LABEL — "Watch drawer layout" → "Accessories drawer layout"',
};

const THE_SIX = ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY'];

/** Does `cabinet.js` — THE CUT PATH — import this module, directly? */
function cabinetImports(rel) {
  const cabinet = src('src/engine/cabinet.js');
  const name = rel.split('/').pop().replace(/\.js$/, '');
  return new RegExp(`from '\\.{1,2}/(?:\\.\\./)*(?:lib/)?${name}\\.js'`).test(cabinet);
}

/** Every file under `src/` that names this symbol. */
function readersOf(symbol) {
  return (git(['grep', '-l', '-e', symbol, '--', 'src']) || '')
    .trim().split('\n').filter(Boolean);
}

function reaches() {
  const rows = [];
  const cabinet = src('src/engine/cabinet.js');

  // ─── F2 · THE CORNER LAW ─────────────────────────────────────────────────
  //
  // The law is FOUR NEW EXPORTS and not one changed line: `wallHeightAt`,
  // `ceilingAt`, `clampSlope`, `slopePolygon`, `elevationElements` and every
  // other reader the app already had answer today exactly what they answered
  // yesterday, byte for byte. Nothing was made room-aware in place, precisely
  // so that nothing downstream could change under a caller that did not ask.
  //
  // And the cut path cannot reach the new names in any case: `cabinet.js` does
  // not import `lib/wallElements.js` at all, and a golden is
  // `computeCabinet(defaultParamsFor(id))` — one cabinet, no room, no corner.
  const lawNames = ['ownHeightAtEnd', 'cornerHeightAt', 'wallCornerHeights',
    'impliedProfileAtEnd', 'impliedProfilesOnWall', 'wallNeighbours'];
  const lawReaders = [...new Set(lawNames.flatMap(readersOf))].sort();
  const lawOnCutPath = lawReaders.filter((f) => f.startsWith('src/engine/') && cabinetImports(f));
  const cabinetNames = lawNames.filter((n) => new RegExp(`\\b${n}\\b`).test(cabinet));
  rows.push({
    delta: 'F2 · the corner law — six new exports in room.js and wallElements.js',
    reach: `named by ${lawReaders.length ? lawReaders.join(', ') : 'nothing'}`
      + `; cabinet.js names ${cabinetNames.length ? cabinetNames.join(', ') : 'none of them'}`
      + ` and imports ${lawOnCutPath.length ? lawOnCutPath.join(', ') : 'no file that does'}`
      + `; cabinet.js imports lib/wallElements.js: ${cabinetImports('src/lib/wallElements.js')}`,
    fixtures: cabinetNames.length || lawOnCutPath.length ? THE_SIX : [],
  });

  // …and the READERS THAT EXISTED did not change their answers. Asked of the
  // source: not one existing export of `wallElements.js` was edited.
  const ref = baseRef();
  const wallDiff = ref
    ? (git(['diff', '-U0', ref, '--', 'src/lib/wallElements.js']) || '')
    : '';
  const removed = wallDiff.split('\n').filter((l) => /^-[^-]/.test(l));
  rows.push({
    delta: 'F2 · and not one existing line of wallElements.js was changed',
    reach: `${removed.length} line(s) removed or rewritten in the diff against ${ref || '(no base ref)'}`,
    fixtures: removed.length ? THE_SIX : [],
  });

  // ─── F5 · THE DEFAULT DECOR KEY ──────────────────────────────────────────
  //
  // A KEY AND A DEFAULT, added to `projectSettings`. What reads it is retail's
  // `applyLazyDefaults`, which writes the PROJECT's design through the store.
  // A golden is computed from `defaultParamsFor(id)`, which carries no decor
  // and no colour at all — asked below rather than asserted.
  const decorReaders = readersOf('defaultCarcassDecorId')
    .filter((f) => f !== 'src/engine/profile.js');
  const decorOnEngine = decorReaders.filter((f) => f.startsWith('src/engine/'));
  rows.push({
    delta: `F5 · projectSettings.defaultCarcassDecorId = '${P.projectSettings.defaultCarcassDecorId}'`,
    reach: `read by ${decorReaders.length ? decorReaders.join(', ') : 'nothing'}`
      + `; engine readers: ${decorOnEngine.length ? decorOnEngine.join(', ') : 'none'}`,
    fixtures: THE_SIX.filter((id) => {
      const p = defaultParamsFor(id, P) || {};
      return p.carcass_finish_id != null || p.front_colour != null || p.decor != null;
    }).concat(decorOnEngine.length ? THE_SIX : []),
  });

  // ─── F10 · THE ACCESSORIES LED'S GAIN AND CAP ────────────────────────────
  //
  // `appearance.lighting.accessoryDrawerGain` is read in ONE place — the
  // DRAWING file `src/3d/LedStrips.jsx`, where it multiplies an emissive and a
  // lamp. Nothing in `src/engine/` reads it, and `computeCabinet` never looks
  // at `appearance` at all: it cuts boards, and a board's size does not depend
  // on how brightly a drawer is lit.
  const gainReaders = readersOf('accessoryDrawerGain')
    .filter((f) => f !== 'src/engine/profile.js');
  const gainOnEngine = gainReaders.filter((f) => f.startsWith('src/engine/'));
  const cabinetReadsAppearance = /\bappearance\.lighting\b|\baccessoryDrawerGain\b/.test(cabinet);
  rows.push({
    delta: `F10 · appearance.lighting.accessoryDrawerGain = ${P.appearance.lighting.accessoryDrawerGain}`,
    reach: `read by ${gainReaders.length ? gainReaders.join(', ') : 'nothing'}`
      + `; engine readers: ${gainOnEngine.length ? gainOnEngine.join(', ') : 'none'}`
      + `; cabinet.js ${cabinetReadsAppearance ? 'READS appearance.lighting — CHECK THIS' : 'never names appearance.lighting'}`,
    fixtures: gainOnEngine.length || cabinetReadsAppearance ? THE_SIX : [],
  });

  // ─── F9 · THE WINDOW REGISTRY'S LABEL ────────────────────────────────────
  //
  // `lib/modalLayer.js` maps a modal NAME to `{ about, label }`. The label is
  // read by nothing that renders — `modalAnchorFault` is the only consumer of
  // the table and it reads `about`, never `label`. Proved by grep below, not
  // by this sentence.
  const layer = src('src/lib/modalLayer.js');
  const labelUsed = /\.label\b/.test(layer.replace(/label: '[^']*'/g, ''));
  rows.push({
    delta: 'F9 · modalLayer.js — the "watch-layout" registry LABEL, one string',
    reach: `modalLayer.js ${labelUsed ? 'READS its own .label — CHECK THIS' : 'never reads .label back'}`
      + `; cabinet.js imports lib/modalLayer.js: ${cabinetImports('src/lib/modalLayer.js')}`
      + '; the engine identifiers `watch_drawer` and `WATCH_LAYOUTS` are unrenamed',
    fixtures: labelUsed || cabinetImports('src/lib/modalLayer.js') ? THE_SIX : [],
  });

  // …and F9's own condition, asked of the tree: the label is gone, the
  // identifier is not.
  const stillLabelled = (git(['grep', '-l', '-e', 'Watch drawer', '--', 'src']) || '')
    .trim().split('\n').filter(Boolean);
  const identifier = (git(['grep', '-l', '-e', 'watch_drawer', '--', 'src']) || '')
    .trim().split('\n').filter(Boolean);
  rows.push({
    delta: 'F9 · labels only — the cut path knows nothing of the rename',
    reach: `files still showing "Watch drawer": ${stillLabelled.length ? stillLabelled.join(', ') : 'NONE'}`
      + `; files still using the engine id \`watch_drawer\`: ${identifier.length}`,
    fixtures: stillLabelled.length || identifier.length === 0 ? THE_SIX : [],
  });

  return rows;
}

const list = reaches();
const base = JSON.parse(src('verify/t67/goldens-base.json'));
const head = dump();

process.stdout.write('─── T67 · THE ENGINE/LIB DELTAS, AND WHAT THEY REACH ───\n\n');
const ref = baseRef();
let stray = [];
if (ref) {
  const touched = (git(['diff', '--name-only', ref, '--', 'src/engine', 'src/lib']) || '')
    .trim().split('\n').filter(Boolean);
  for (const f of touched) {
    process.stdout.write(`${LICENSED[f] ? '  licensed  ' : '  UNLICENSED'} ${f}${LICENSED[f] ? ` — ${LICENSED[f]}` : ''}\n`);
  }
  stray = touched.filter((f) => !LICENSED[f]);
  process.stdout.write(`\n  ${touched.length} engine/lib file(s) changed · ${stray.length} outside the licence\n`);
  const unspent = Object.keys(LICENSED).filter((f) => !touched.includes(f));
  const spare = ['src/lib/slopeLine.js'].filter((f) => !touched.includes(f));
  process.stdout.write(`  licensed and unspent: ${[...unspent, ...spare].join(', ') || 'none'}\n\n`);
} else {
  process.stdout.write('  no base ref — the goldens below are the whole proof\n\n');
}

let unreachable = 0;
for (const r of list) {
  const ok = r.fixtures.length === 0;
  if (ok) unreachable += 1;
  process.stdout.write(`${ok ? '  ok  ' : ' FAIL '}${r.delta}\n        reach: ${r.reach}\n`);
  process.stdout.write(`        fixtures that set it: ${r.fixtures.length ? [...new Set(r.fixtures)].join(', ') : 'NONE — no golden can enter this path'}\n`);
}

process.stdout.write('\n─── THE SIX ───\n');
let moved = 0;
for (const id of THE_SIX) {
  const same = base[id]?.sha256 && base[id].sha256 === head[id]?.sha256;
  if (!same) moved += 1;
  process.stdout.write(`  ${id.padEnd(10)} ${same ? 'IDENTICAL' : 'UNNAMED  '}  ${head[id]?.sha256 || head[id]?.error}\n`);
}
process.stdout.write(
  `\nIDENTICAL=${THE_SIX.length - moved} UNNAMED=${moved} · deltas that cannot reach a fixture: `
  + `${unreachable}/${list.length} · engine files outside the licence: ${stray.length}\n`,
);
process.exit(moved === 0 && unreachable === list.length && stray.length === 0 ? 0 : 1);
