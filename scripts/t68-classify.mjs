#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT FOR TURN 68 ────────────────────────────────
//
// CLAUDE.md, TESTS AND PROOF, verbatim:
//
//   *"Goldens ×6 byte-identical; `UNNAMED=0`; parens 14/14 at 0/0;
//   `t68-classify.mjs` naming every delta."*
//
// …and WHAT IS FROZEN, 3:
//
//   *"Engine licence: `src/engine/profile.js` ONLY (F5's plinth bounds and the
//   kitchen key). `doors.js`, `cabinet.js`, `room.js`: read-only."*
//
// ONE licensed engine/lib file tonight, and it is spent on two keys. For each
// delta this prints the REACH — what has to be true before the changed line
// can run, asked of the engine's own source rather than asserted — and whether
// any of the six fixtures makes it true. A delta whose reach is a code path no
// fixture enters cannot move a golden.
//
//   node scripts/t68-classify.mjs

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
 * THE LICENCE, from CLAUDE.md's own WHAT IS FROZEN, 3 — and it is ONE FILE.
 *
 * `doors.js`, `cabinet.js` and `room.js` are named READ-ONLY by the same
 * sentence, so they appear below as files that must NOT be in the diff at all.
 * F3's 17 mm bay-door asymmetry lives in that first one and was skipped for
 * exactly this reason; the skip is in the PR body with its line.
 */
const LICENSED = {
  'src/engine/profile.js':
    'F5 · wardrobe.plinth {50,150} — the plinth law the typed field reads · '
    + 'baseUnit.plinth {80,150} — the kitchen key, written now and read by nobody',
};

/** Named read-only by CLAUDE.md. A diff here is a failure, not a delta. */
const READ_ONLY = ['src/engine/doors.js', 'src/engine/cabinet.js', 'src/engine/room.js'];

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

/**
 * Every file under `src/` that READS this path into the profile.
 *
 * COMMENTS DO NOT COUNT, and that matters tonight: `adapter.js` names
 * `baseUnit.plinth` in the paragraph explaining that nothing reads it, and a
 * grep over raw source therefore convicts the very sentence that tells the
 * truth. So each candidate is stripped of its comments and asked again — the
 * same `code()` every test in this repo uses for the same reason.
 */
function pathReadersOf(expr) {
  const strip = (text) => text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  const re = new RegExp(expr.replace(/\./g, '\\.?\\.'));
  return (git(['grep', '-l', '-e', expr, '--', 'src']) || '')
    .trim().split('\n').filter(Boolean)
    .filter((f) => re.test(strip(src(f))));
}

function reaches() {
  const rows = [];
  const cabinet = src('src/engine/cabinet.js');

  // ─── F5 · THE WARDROBE PLINTH LAW ────────────────────────────────────────
  //
  // A KEY AND A DEFAULT, added to `wardrobe`. What reads it is retail's
  // `plinthBounds`, which hands two numbers to a typed FIELD. A golden is
  // `computeCabinet(defaultParamsFor(id))`, and `defaultParamsFor` carries
  // `leg_height` off `wardrobe.legHeight` — which this turn did not touch —
  // so the six are asked below rather than assured.
  const plinthReaders = pathReadersOf('wardrobe.plinth').filter((f) => f !== 'src/engine/profile.js');
  const plinthOnEngine = plinthReaders.filter((f) => f.startsWith('src/engine/'));
  const legHeightMoved = P.wardrobe.legHeight !== 100;
  rows.push({
    delta: `F5 · wardrobe.plinth = { minMm: ${P.wardrobe.plinth.minMm}, maxMm: ${P.wardrobe.plinth.maxMm} }`,
    reach: `read by ${plinthReaders.length ? plinthReaders.join(', ') : 'nothing'}`
      + `; engine readers: ${plinthOnEngine.length ? plinthOnEngine.join(', ') : 'none'}`
      + `; cabinet.js names wardrobe.plinth: ${/wardrobe\.plinth/.test(cabinet)}`
      + `; wardrobe.legHeight is still ${P.wardrobe.legHeight}`,
    fixtures: (plinthOnEngine.length || /wardrobe\.plinth/.test(cabinet) || legHeightMoved)
      ? THE_SIX
      : THE_SIX.filter((id) => {
        // Does this fixture's DEFAULT PARAMS carry anything the new keys could
        // have moved? `leg_height` is the only plinth number a cut sees.
        const p = defaultParamsFor(id, P) || {};
        return p.plinth_min_mm != null || p.plinth_max_mm != null;
      }),
  });

  // ─── F5 · THE KITCHEN'S OWN KEY, WHICH NOTHING READS ─────────────────────
  //
  // CLAUDE.md asks for it *"written now, read by nobody yet, one comment
  // saying so"*. The comment is in `profile.js`; this is the proof, and it is
  // a grep rather than a promise. The ONLY file allowed to name it is the one
  // that declares it and the test that asserts it is unread.
  const kitchenReaders = pathReadersOf('baseUnit.plinth')
    .filter((f) => f !== 'src/engine/profile.js');
  rows.push({
    delta: `F5 · baseUnit.plinth = { minMm: ${P.baseUnit.plinth.minMm}, maxMm: ${P.baseUnit.plinth.maxMm} } — the kitchen key`,
    reach: `read by ${kitchenReaders.length ? kitchenReaders.join(', ') : 'NOTHING — as CLAUDE.md asks'}`
      + `; cabinet.js names baseUnit.plinth: ${/baseUnit\.plinth/.test(cabinet)}`,
    fixtures: kitchenReaders.length || /baseUnit\.plinth/.test(cabinet) ? THE_SIX : [],
  });

  // ─── F3 · THE DOOR COUNT — RETAIL ONLY, AND IT ASKS THE ENGINE ───────────
  //
  // The equal-pair fix is entirely in `adapter.setDoorCount`, which READS
  // `doorCountFor` and writes nothing in the engine. Asked of the tree: is
  // `doorCountFor` still exactly the function it was?
  const ref = baseRef();
  const cabinetDiff = ref ? (git(['diff', '--name-only', ref, '--', 'src/engine/cabinet.js']) || '').trim() : '';
  rows.push({
    delta: 'F3 · the equal pair — adapter.setDoorCount only, reading doorCountFor',
    reach: `cabinet.js in the diff: ${cabinetDiff ? 'YES — CHECK THIS' : 'no'}`
      + `; doorCountFor readers: ${readersOf('doorCountFor').join(', ')}`,
    fixtures: cabinetDiff ? THE_SIX : [],
  });

  // ─── F4 · THE DIVIDER — A VIEW PROP AND A SELECTION, NO ENGINE ───────────
  const dragReaders = readersOf('onMovePartition');
  const dragOnEngine = dragReaders.filter((f) => f.startsWith('src/engine/'));
  rows.push({
    delta: 'F4 · onMovePartition — a new optional prop on 3d/UnitView, passed by 3d/Scene',
    reach: `named by ${dragReaders.join(', ')}`
      + `; engine readers: ${dragOnEngine.length ? dragOnEngine.join(', ') : 'none'}`,
    fixtures: dragOnEngine.length ? THE_SIX : [],
  });

  // ─── F1 · THE FRONT LAW — RETAIL AND lib/frontOpening.js'S OWN PATCH ─────
  const lawReaders = readersOf('writeFrontLaw');
  const lawOnEngine = lawReaders.filter((f) => f.startsWith('src/engine/') || f.startsWith('src/lib/'));
  rows.push({
    delta: 'F1 · writeFrontLaw — one writer of style + opening, in retail\'s adapter',
    reach: `named by ${lawReaders.join(', ')}`
      + `; engine/lib readers: ${lawOnEngine.length ? lawOnEngine.join(', ') : 'none'}`
      + '; it calls lib/frontOpening.js `frontOpeningPatch`, which is unchanged',
    fixtures: lawOnEngine.length ? THE_SIX : [],
  });

  return rows;
}

const list = reaches();
const base = JSON.parse(src('verify/t68/goldens-base.json'));
const head = dump();

process.stdout.write('─── T68 · THE ENGINE/LIB DELTAS, AND WHAT THEY REACH ───\n\n');
const ref = baseRef();
let stray = [];
let readOnlyTouched = [];
if (ref) {
  const touched = (git(['diff', '--name-only', ref, '--', 'src/engine', 'src/lib']) || '')
    .trim().split('\n').filter(Boolean);
  for (const f of touched) {
    process.stdout.write(`${LICENSED[f] ? '  licensed  ' : '  UNLICENSED'} ${f}${LICENSED[f] ? ` — ${LICENSED[f]}` : ''}\n`);
  }
  stray = touched.filter((f) => !LICENSED[f]);
  readOnlyTouched = touched.filter((f) => READ_ONLY.includes(f));
  process.stdout.write(`\n  ${touched.length} engine/lib file(s) changed · ${stray.length} outside the licence\n`);
  process.stdout.write(`  named READ-ONLY by CLAUDE.md and touched: ${readOnlyTouched.join(', ') || 'none'}\n`);
  const unspent = Object.keys(LICENSED).filter((f) => !touched.includes(f));
  process.stdout.write(`  licensed and unspent: ${unspent.join(', ') || 'none'}\n\n`);
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
  + `${unreachable}/${list.length} · engine files outside the licence: ${stray.length}`
  + ` · read-only files touched: ${readOnlyTouched.length}\n`,
);
process.exit(
  moved === 0 && unreachable === list.length && stray.length === 0 && readOnlyTouched.length === 0 ? 0 : 1,
);
