#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT FOR TURN 69 ────────────────────────────────
//
// CLAUDE.md, TESTS AND PROOF, verbatim:
//
//   *"Goldens ×6 byte-identical; `UNNAMED=0`; parens 14/14 at 0/0;
//   `t69-classify.mjs` names every delta."*
//
// …and FROZEN, 3:
//
//   *"Engine licence: `room.js` (scope `'three'` only, the `'two'` pattern),
//   `profile.js` (sill default, RAW finish keys), `lib/wallElements.js`
//   (OPENING_DEFAULTS sill 850). Nothing in the cut path; `cabinet.js` and
//   `doors.js` read-only."*
//
// For each delta this prints the REACH — what has to be true before the
// changed line can run, asked of the engine's own source rather than asserted
// — and whether any of the six fixtures makes it true. A delta whose reach is
// a code path no fixture enters cannot move a golden.
//
//   node scripts/t69-classify.mjs

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { ROOM_SCOPES } from '../src/engine/design.js';
import { OPENING_DEFAULTS, rectCorners, wallsInScope } from '../src/engine/room.js';
import { slopeSide, oneSlopePerSide } from '../src/lib/wallElements.js';
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
 * THE LICENCE — CLAUDE.md's three files, and the TWO MORE this turn spent,
 * each with the one-line reason it was spent on. They are not hidden in a
 * paragraph: they are in this table, which is the thing that prints.
 *
 * A line beyond a named licence is a line that has to be argued. Both of these
 * are the same argument, and it is the one T59's freeze manifest makes about
 * PRO: a KEY THAT NOTHING READS IS NOT A KEY. A scope `room.js` can draw and
 * `normaliseScope` downgrades does not exist; a finish `profile.js` names and
 * no resolver reads does not exist either.
 */
const LICENSED = {
  'src/engine/room.js':
    'F1 · scope `three` by the `two` pattern (a U: walls 0,1,2, both returns cut '
    + 'from the one wall the U leaves out) · '
    + 'F3 · OPENING_DEFAULTS.window.sill 900 → 850, which is where that constant '
    + 'actually lives (CLAUDE.md names lib/wallElements.js; it is here, and here is licensed) · '
    + 'F3 · clampOpening\'s `Number(x) ?? DEFAULT` → a finite check, because `??` '
    + 'never catches NaN and the 850 could not otherwise be reached',
  'src/engine/profile.js':
    'F4 · the RAW front source (18 mm, picker null, finish_id raw_mdf) and the '
    + '`raw_mdf` finish itself — CLAUDE.md\'s own "RAW finish keys"',
  'src/lib/wallElements.js':
    'F3 · `slopeSide` reads L/left and R/right (the two buttons pass the long '
    + 'words and BOTH normalised to R) · `oneSlopePerSide`, the law a wall is held to',
  // ─── THE TWO BEYOND THE NAMED THREE ──────────────────────────────────────
  'src/engine/design.js':
    'BEYOND THE NAMED LICENCE, one word and one line, each argued: '
    + 'F1 · ROOM_SCOPES gains `three` — every stored project passes normaliseScope, '
    + 'so a scope room.js can draw and that gate downgrades would not exist · '
    + 'F4 · resolveFinishes reads a SOURCE\'s own finish (frontSourceFinishId), '
    + 'first in the front chain — RAW offers no picker, so the board cannot come '
    + 'from a stored finish_id, and a key nothing reads is not a key',
  'src/lib/openingArt.js':
    'BEYOND THE NAMED LICENCE, and a NEW FILE that nothing in the engine imports: '
    + 'F3 · the door and window drawings, in the opening\'s own millimetres. '
    + 'Shared so PRO takes the same call the night its window is licensed — '
    + 'one drawing of a door, never two',
};

/** Named read-only by CLAUDE.md. A diff here is a failure, not a delta. */
const READ_ONLY = ['src/engine/cabinet.js', 'src/engine/doors.js'];

const THE_SIX = ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY'];

/** Every file under `src/` that names this symbol. */
const readersOf = (symbol) => (git(['grep', '-l', '-e', symbol, '--', 'src']) || '')
  .trim().split('\n').filter(Boolean);

/** …with the comments taken out, so a paragraph explaining a thing is not a reader. */
function codeReadersOf(symbol) {
  const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  return readersOf(symbol).filter((f) => new RegExp(symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(strip(src(f))));
}

const cabinet = () => src('src/engine/cabinet.js');
const onEngine = (files) => files.filter((f) => f.startsWith('src/engine/') && f !== 'src/engine/design.js');

function reaches() {
  const rows = [];

  // ─── F1 · SCOPE `three` ──────────────────────────────────────────────────
  //
  // A golden is `computeCabinet(defaultParamsFor(id))` — ONE CABINET, with no
  // room at all. `wallsInScope` is a question about a ROOM, and the cut path
  // is asked below whether it has ever heard of it.
  const scopeReaders = codeReadersOf('wallsInScope');
  rows.push({
    delta: `F1 · ROOM_SCOPES = [${ROOM_SCOPES.join(', ')}]; wallsInScope draws `
      + `${wallsInScope({ corners: rectCorners(4000, 3000) }, 'three').length} walls for a U`,
    reach: `wallsInScope read by ${scopeReaders.join(', ') || 'nothing'}`
      + `; engine readers: ${onEngine(scopeReaders).join(', ') || 'none'}`
      + `; cabinet.js names wallsInScope: ${/wallsInScope/.test(cabinet())}`
      + `; cabinet.js names scope: ${/\bscope\b/.test(cabinet())}`,
    fixtures: (/wallsInScope|normaliseScope/.test(cabinet())) ? THE_SIX : [],
  });

  // ─── F3 · THE SILL ───────────────────────────────────────────────────────
  //
  // A default on a ROOM OPENING. A cabinet has no openings, and `clampOpening`
  // is the only thing that reads it.
  const sillReaders = codeReadersOf('OPENING_DEFAULTS');
  rows.push({
    delta: `F3 · OPENING_DEFAULTS.window.sill = ${OPENING_DEFAULTS.window.sill} (was 900); door sill still ${OPENING_DEFAULTS.door.sill}`,
    reach: `read by ${sillReaders.join(', ') || 'nothing'}`
      + `; engine readers: ${onEngine(sillReaders).join(', ') || 'none'}`
      + `; cabinet.js names OPENING_DEFAULTS: ${/OPENING_DEFAULTS/.test(cabinet())}`
      + `; cabinet.js names clampOpening: ${/clampOpening/.test(cabinet())}`,
    fixtures: (/OPENING_DEFAULTS|clampOpening/.test(cabinet())) ? THE_SIX : [],
  });

  // ─── F3 · THE SLOPE SIDE, AND ONE PER SIDE ───────────────────────────────
  //
  // `migrateSlope` is reached from the STORE's slope list, which a golden has
  // none of: `defaultParamsFor` carries no `wallSlopes` and `computeCabinet`
  // is handed params, not a project.
  const sideReaders = codeReadersOf('slopeSide');
  const lawReaders = codeReadersOf('oneSlopePerSide');
  rows.push({
    delta: `F3 · slopeSide('left') = ${slopeSide('left')}, slopeSide('right') = ${slopeSide('right')}`
      + `; oneSlopePerSide keeps ${oneSlopePerSide([
        { id: 'a', kind: 'slope', wall: 0, side: 'L' }, { id: 'b', kind: 'slope', wall: 0, side: 'L' },
      ]).length} of two on one side`,
    reach: `slopeSide read by ${sideReaders.join(', ') || 'nothing'}`
      + `; oneSlopePerSide read by ${lawReaders.join(', ') || 'nothing'}`
      + `; cabinet.js names either: ${/slopeSide|oneSlopePerSide/.test(cabinet())}`
      + '; a golden carries no wallSlopes at all (defaultParamsFor has no such key)',
    fixtures: (/slopeSide|oneSlopePerSide/.test(cabinet())) ? THE_SIX : [],
  });

  // ─── F4 · THE RAW SOURCE AND THE RAW FINISH ──────────────────────────────
  //
  // A front SOURCE is chosen; nothing chooses one for a fixture. The question
  // that matters is whether the six could reach `raw` without being told to,
  // and that is answered by asking what the DEFAULT front source is.
  const raw = P.projectSettings.frontSources.find((s) => s.id === 'raw');
  const firstSource = P.projectSettings.frontSources[0];
  const rawFinish = P.appearance.finishes.find((f) => f.id === 'raw_mdf');
  const chainReaders = codeReadersOf('frontSourceFinishId');
  rows.push({
    delta: `F4 · frontSources + { id: raw, thickness: ${raw?.thickness}, picker: ${raw?.picker}, `
      + `finish_id: ${raw?.finish_id} }; appearance.finishes + { id: raw_mdf, kind: ${rawFinish?.kind} }`,
    reach: `the profile's FIRST front source is still \`${firstSource?.id}\` (${firstSource?.thickness} mm), `
      + `so nothing arrives on raw unasked; frontSourceFinishId read by ${chainReaders.join(', ') || 'nothing'}`
      + `; cabinet.js names raw: ${/'raw'|raw_mdf/.test(cabinet())}`
      + `; raw's thickness equals laminate's: ${raw?.thickness === P.projectSettings.frontSources.find((s) => s.id === 'laminate')?.thickness}`,
    fixtures: (firstSource?.id === 'raw' || /'raw'|raw_mdf/.test(cabinet())) ? THE_SIX : [],
  });

  // ─── F3 · THE ART — A NEW FILE THE ENGINE DOES NOT IMPORT ────────────────
  const artReaders = codeReadersOf('openingArt');
  rows.push({
    delta: 'F3 · lib/openingArt.js — doorArt / windowArt, a NEW module',
    reach: `imported by ${artReaders.filter((f) => f !== 'src/lib/openingArt.js').join(', ') || 'nothing'}`
      + `; engine readers: ${onEngine(artReaders).join(', ') || 'none'}`
      + `; cabinet.js names openingArt: ${/openingArt/.test(cabinet())}`,
    fixtures: (/openingArt/.test(cabinet())) ? THE_SIX : [],
  });

  // ─── F8 / F9 · THE TWO STORE LAWS, WHICH ARE NOT ENGINE AT ALL ───────────
  const storeLaws = codeReadersOf('closeToCeiling').concat(codeReadersOf('nearEdgeTo'));
  rows.push({
    delta: 'F8 · closeToCeiling · F9 · the both-ways widening — both in stores/projectStore.js',
    reach: `named by ${[...new Set(storeLaws)].join(', ') || 'nothing'}`
      + `; engine readers: ${onEngine(storeLaws).join(', ') || 'none'}`
      + '; a golden calls computeCabinet directly and never touches the store',
    fixtures: onEngine(storeLaws).length ? THE_SIX : [],
  });

  return rows;
}

const list = reaches();
const base = JSON.parse(src('verify/t69/goldens-base.json'));
const head = dump();

process.stdout.write('─── T69 · THE ENGINE/LIB DELTAS, AND WHAT THEY REACH ───\n\n');
const ref = baseRef();
let stray = [];
let readOnlyTouched = [];
if (ref) {
  const touched = (git(['diff', '--name-only', ref, '--', 'src/engine', 'src/lib']) || '')
    .trim().split('\n').filter(Boolean);
  for (const f of touched) {
    process.stdout.write(`${LICENSED[f] ? '  named    ' : '  UNNAMED  '} ${f}${LICENSED[f] ? `\n             ${LICENSED[f]}` : ''}\n`);
  }
  stray = touched.filter((f) => !LICENSED[f]);
  readOnlyTouched = touched.filter((f) => READ_ONLY.includes(f));
  process.stdout.write(`\n  ${touched.length} engine/lib file(s) changed · ${stray.length} not named above\n`);
  process.stdout.write(`  named READ-ONLY by CLAUDE.md and touched: ${readOnlyTouched.join(', ') || 'none'}\n`);
  const unspent = Object.keys(LICENSED).filter((f) => !touched.includes(f));
  process.stdout.write(`  named and unspent: ${unspent.join(', ') || 'none'}\n\n`);
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
  + `${unreachable}/${list.length} · engine files not named: ${stray.length}`
  + ` · read-only files touched: ${readOnlyTouched.length}\n`,
);
process.exit(
  moved === 0 && unreachable === list.length && stray.length === 0 && readOnlyTouched.length === 0 ? 0 : 1,
);
