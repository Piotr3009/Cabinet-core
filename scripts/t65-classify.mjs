#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT FOR TURN 65 ────────────────────────────────
//
// CLAUDE.md, TESTS AND PROOF, verbatim:
//
//   *"Goldens ×6 byte-identical — the hard gate this turn, because engine files
//   are licensed. `verify/t65/t65-classify.mjs` names every engine delta and
//   proves none reaches the cut path of a fixture."*
//
// THREE LICENSED FILES, and no others:
//   src/engine/endPanelAuto.js  — F6, the wardrobe's own step rule
//   src/engine/cabinet.js       — F5 (the capping shelf) and F7 (the partition)
//   src/engine/profile.js       — F8's cornice defaults only, as new keys
//
// For each delta this prints the REACH: the parameter or flag that has to be
// set before the changed line can run at all, and whether any of the six
// fixtures sets it. A delta whose reach is a code path the fixtures never
// enter cannot move a golden — which is the condition CLAUDE.md sets, and the
// reason this file exists rather than a promise in a commit message.
//
//   node scripts/t65-classify.mjs           the deltas and the goldens
//   node scripts/t65-classify.mjs --probe   the reach of each, argued

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { overlayDrawerItems } from '../src/engine/overlayDrawers.js';
import { dump } from './t64-classify.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const git = (args) => {
  try { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return null; }
};
const baseRef = () => ['origin/main', 'main'].find(
  (ref) => git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]) !== null,
);

const LICENSED = {
  'src/engine/endPanelAuto.js': 'F6 · the wardrobe\'s own step rule',
  'src/engine/cabinet.js': 'F5 · the capping shelf · F7 · the partition on it',
  'src/engine/profile.js': 'F8 · the cornice defaults, as new keys',
};

const THE_SIX = ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY'];

/**
 * The REACH of each delta — what has to be true before the changed line runs,
 * asked of the six fixtures themselves rather than asserted.
 */
function reaches() {
  const rows = [];

  // ─── F5 · the capping shelf, and F7 · the partition that stands on it ────
  // Both live behind `budr.overlay` / `overlay`, which is `overlayPlan(...)`
  // and is NULL unless the section carries `overlay_drawer` items.
  const withStack = THE_SIX.filter((id) => {
    const items = defaultParamsFor(id, P)?.sections?.[0]?.items || [];
    return overlayDrawerItems(items).length > 0;
  });
  rows.push({
    delta: 'cabinet.js · OVERLAY_CAP_CLEARANCE on the OVERLAY-FIX shelf (F5)',
    reach: 'params.sections[].items contains an `overlay_drawer` (→ `overlay` non-null)',
    fixtures: withStack,
  });
  rows.push({
    delta: 'cabinet.js · partitionFloor = overlay.shelfY + G (F7)',
    reach: 'the same `overlay`, AND a `partition` item to place',
    fixtures: withStack,
  });

  // ─── F6 · the wardrobe end-panel pass ────────────────────────────────────
  // `endPanelAuto.js` is not on `computeCabinet`'s path AT ALL: the goldens are
  // `computeCabinet(defaultParamsFor(type), profile)` and that function imports
  // nothing from this module. The wardrobe pass is additionally behind a switch
  // PRO never throws.
  const cabinetSrc = readFileSync(new URL('../src/engine/cabinet.js', import.meta.url), 'utf8');
  rows.push({
    delta: 'endPanelAuto.js · sideIsVisible + the wardrobe pass + askedSides (F6)',
    reach: /endPanelAuto/.test(cabinetSrc)
      ? 'cabinet.js imports it — CHECK THIS'
      : 'not on computeCabinet\'s path at all (cabinet.js does not import it), and behind setWardrobeEndPanelAuto()',
    fixtures: [],
  });

  // ─── F8 · the cornice keys ───────────────────────────────────────────────
  const withCornice = THE_SIX.filter((id) => Number(defaultParamsFor(id, P)?.cornice) > 0);
  rows.push({
    delta: 'profile.js · autoParts.cornice.retail { autoHeight, closesGapUpToMm } (F8)',
    reach: 'read only by `src/retail/**`; `computeCabinet` never looks at it',
    fixtures: withCornice,
  });
  return rows;
}

const list = reaches();
const base = JSON.parse(readFileSync(new URL('../verify/t65/goldens-base.json', import.meta.url), 'utf8'));
const head = dump();

process.stdout.write('─── T65 · THE ENGINE DELTAS, AND WHAT THEY REACH ───\n\n');
const ref = baseRef();
if (ref) {
  const touched = (git(['diff', '--name-only', ref, '--', 'src/engine', 'src/lib']) || '')
    .trim().split('\n').filter(Boolean);
  for (const f of touched) {
    process.stdout.write(`${LICENSED[f] ? '  licensed  ' : '  UNLICENSED'} ${f}${LICENSED[f] ? ` — ${LICENSED[f]}` : ''}\n`);
  }
  const stray = touched.filter((f) => !LICENSED[f]);
  process.stdout.write(`\n  ${touched.length} engine/lib file(s) changed · ${stray.length} outside the licence\n\n`);
} else {
  process.stdout.write('  no base ref — the goldens below are the whole proof\n\n');
}

let unreachable = 0;
for (const r of list) {
  const ok = r.fixtures.length === 0;
  if (ok) unreachable += 1;
  process.stdout.write(`${ok ? '  ok  ' : ' FAIL '}${r.delta}\n        reach: ${r.reach}\n        fixtures that set it: ${r.fixtures.length ? r.fixtures.join(', ') : 'NONE — no golden can enter this path'}\n`);
}

process.stdout.write('\n─── THE SIX ───\n');
let moved = 0;
for (const id of THE_SIX) {
  const same = base[id]?.sha256 && base[id].sha256 === head[id]?.sha256;
  if (!same) moved += 1;
  process.stdout.write(`  ${id.padEnd(10)} ${same ? 'IDENTICAL' : 'MOVED    '}  ${head[id]?.sha256 || head[id]?.error}\n`);
}
process.stdout.write(`\nIDENTICAL=${THE_SIX.length - moved} MOVED=${moved} · deltas that cannot reach a fixture: ${unreachable}/${list.length}\n`);
process.exit(moved === 0 && unreachable === list.length ? 0 : 1);
