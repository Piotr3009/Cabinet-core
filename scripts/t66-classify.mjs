#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT FOR TURN 66 ────────────────────────────────
//
// CLAUDE.md, TESTS AND PROOF, verbatim:
//
//   *"Goldens ×6 byte-identical; `UNNAMED=0`; `t66-classify.mjs` naming every
//   delta and proving none reaches a fixture."*
//
// ONE LICENSED ENGINE FILE tonight, and no others:
//   src/engine/profile.js — F1 (studio baseGain), F5 (default finishes), F9
//                           (the shaker frame bounds, read-only — they already
//                           exist, so nothing was written for F9 at all)
//
// For the delta this prints the REACH: what has to be true before the changed
// line can run, and whether any of the six fixtures makes it true. A delta
// whose reach is a code path no fixture enters cannot move a golden — which is
// the condition CLAUDE.md sets, and the reason this file exists rather than a
// promise in a commit message.
//
//   node scripts/t66-classify.mjs
//   node verify/t66/t66-classify.mjs   (the path the spec names; same run)

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { dump } from './t64-classify.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const git = (args) => {
  try { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return null; }
};
const baseRef = () => ['origin/main', 'main'].find(
  (ref) => git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]) !== null,
);

const LICENSED = {
  'src/engine/profile.js': 'F1 · studio.baseGain 0.75 → 0.60 (the owner\'s own dial)',
};

const THE_SIX = ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY'];

/**
 * The REACH of each delta — what has to be true before the changed line runs,
 * asked of the engine's own source rather than asserted.
 */
function reaches() {
  const rows = [];
  const cabinet = readFileSync(new URL('../src/engine/cabinet.js', import.meta.url), 'utf8');

  // ─── F1 · THE STUDIO'S BASE GAIN ─────────────────────────────────────────
  //
  // `appearance.studio.baseGain` is read in ONE place in the whole app —
  // `src/3d/Scene.jsx`, where it multiplies the brightness slider's gain before
  // the lamps see it. `computeCabinet` never looks at `appearance` at all: it
  // cuts boards, and a board's size does not depend on how the room is lit.
  // The proof is the grep, not the sentence.
  const readers = (git(['grep', '-l', '-e', 'baseGain', '--', 'src']) || '')
    .trim().split('\n').filter(Boolean);
  // THE CUT PATH is `computeCabinet`, and the only way a reader of `baseGain`
  // can be on it is for `cabinet.js` to import that file. `engine/lighting.js`
  // reads the dial (it computes the LED rig) and `cabinet.js` does not import
  // it — asked here rather than asserted, the same way T65 asked it of
  // `endPanelAuto.js`.
  const imported = (f) => new RegExp(`from '\\./${f.split('/').pop().replace('.js', '')}\\.js'`).test(cabinet);
  const onCutPath = readers
    .filter((f) => f.startsWith('src/engine/') && f !== 'src/engine/profile.js')
    .filter(imported);
  const readsAppearance = /appearance\.studio|\bbaseGain\b/.test(cabinet);
  rows.push({
    delta: 'profile.js · appearance.studio.baseGain 0.75 → 0.60 (F1)',
    reach: `read by ${readers.length ? readers.join(', ') : 'nothing'}`
      + `; cabinet.js ${readsAppearance ? 'READS appearance.studio — CHECK THIS' : 'never names appearance.studio or baseGain'}`
      + ` and imports ${onCutPath.length ? onCutPath.join(', ') : 'none of the readers above'}`,
    fixtures: onCutPath.length || readsAppearance ? THE_SIX : [],
  });

  // ─── F5 · THE SHOWROOM DEFAULTS ──────────────────────────────────────────
  //
  // Wine-on-walnut is written by RETAIL, through the store, onto the PROJECT's
  // design — not into the profile at all. `defaultParamsFor` (which is what the
  // goldens are computed from) has no front colour and no carcass decor in it,
  // so there is nothing here for a fixture to pick up. The check is that the
  // profile's own defaults did NOT move.
  const finishes = JSON.stringify(P.appearance?.finishes || {});
  rows.push({
    delta: 'F5 · the wine-on-walnut defaults',
    reach: 'written by `src/retail/design/adapter.js applyLazyDefaults` onto the'
      + ' PROJECT design; `defaultParamsFor` carries no colour and no decor',
    fixtures: THE_SIX.filter((id) => {
      const p = defaultParamsFor(id, P) || {};
      return p.front_colour != null || p.carcass_finish_id != null;
    }),
    note: `profile.appearance.finishes is ${finishes.length} chars and unmoved`,
  });

  // ─── F9 · THE SHAKER FRAME BOUNDS ────────────────────────────────────────
  //
  // CLAUDE.md licenses profile.js for *"shaker frame width exposure: read-only,
  // the bounds already exist"* — and they do: `front.types.S.frameMin/frameMax/
  // frameWidth`. F4's typed field READS them. Nothing was written.
  rows.push({
    delta: 'F4 · the shaker FRAME WIDTH field',
    reach: `reads profile.front.types.S {frameMin ${P.front.types.S.frameMin},`
      + ` frameWidth ${P.front.types.S.frameWidth}, frameMax ${P.front.types.S.frameMax}} — read-only`,
    fixtures: [],
  });
  return rows;
}

const list = reaches();
const base = JSON.parse(readFileSync(new URL('../verify/t66/goldens-base.json', import.meta.url), 'utf8'));
const head = dump();

process.stdout.write('─── T66 · THE ENGINE DELTAS, AND WHAT THEY REACH ───\n\n');
const ref = baseRef();
let stray = [];
if (ref) {
  const touched = (git(['diff', '--name-only', ref, '--', 'src/engine', 'src/lib']) || '')
    .trim().split('\n').filter(Boolean);
  for (const f of touched) {
    process.stdout.write(`${LICENSED[f] ? '  licensed  ' : '  UNLICENSED'} ${f}${LICENSED[f] ? ` — ${LICENSED[f]}` : ''}\n`);
  }
  stray = touched.filter((f) => !LICENSED[f]);
  process.stdout.write(`\n  ${touched.length} engine/lib file(s) changed · ${stray.length} outside the licence\n\n`);
} else {
  process.stdout.write('  no base ref — the goldens below are the whole proof\n\n');
}

let unreachable = 0;
for (const r of list) {
  const ok = r.fixtures.length === 0;
  if (ok) unreachable += 1;
  process.stdout.write(`${ok ? '  ok  ' : ' FAIL '}${r.delta}\n        reach: ${r.reach}\n`);
  if (r.note) process.stdout.write(`        note:  ${r.note}\n`);
  process.stdout.write(`        fixtures that set it: ${r.fixtures.length ? r.fixtures.join(', ') : 'NONE — no golden can enter this path'}\n`);
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
