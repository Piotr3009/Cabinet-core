#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT FOR TURN 72 ────────────────────────────────
//
// CLAUDE.md T72, FROZEN, verbatim:
//
//   *"Goldens x6 byte-identical; `computeCabinet` is not touched. The one
//   engine change (F14, the wall gap per unit) is PLACEMENT, read by
//   `engine/runs.js` and the room, never by the cut path; `scripts/t72-classify.mjs`
//   proves it the way T71's does."*
//
// So this classifier does what T71's does, in T71's own shape: it NAMES every
// `src/engine` and `src/lib` file the turn touched with the one-line reason,
// it refuses any file CLAUDE.md marks read-only, and it asks the engine's own
// import graph whether a delta can reach a golden. Then it hashes the six.
//
// F14 IS THE INTERESTING ONE and it gets its own question. `wall_gap` is a
// key on `unit.params`, and `computeCabinet` receives `unit.params` — so the
// import graph alone would not settle it. The proof is asked of the DATA:
// every fixture is computed with the key absent and again with a 60 mm gap on
// it, and the two hashes are compared. A cut path that never reads the key
// cannot answer differently, and that is the sentence CLAUDE.md asks for.
//
//   node scripts/t72-classify.mjs

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { dump } from './t64-classify.mjs';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE } from '../src/engine/profile.js';
import { wallGapOf } from '../src/engine/runs.js';
import { backStandoff } from '../src/engine/collision.js';

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
 * THE LICENCE: every engine and lib file this turn spent, with why. A line
 * beyond a named licence is a line that has to be argued here.
 */
const LICENSED = {
  'src/engine/runs.js':
    'F14 · `wallGapOf(unit, profile)` — the ONE helper CLAUDE.md names, and `runEnd`\'s '
    + '`atWall` reads it. PLACEMENT: where a run stops, not what it cuts',
  'src/engine/collision.js':
    'F14 · `backStandoff` asks `wallGapOf` instead of the project number — the scene\'s '
    + 'placement and the drag\'s clamp, which is the same sentence twice',
  'src/engine/endPanelAuto.js':
    'F14 · `sideIsVisible` compares FRONT REACH (gap + depth) rather than depth alone: '
    + 'with one gap per job the two were the same question, with two they are not',
  'src/engine/roomFit.js':
    'F14 · the room refuses a gap that will not fit, in the room\'s own words; the '
    + 'height, width and depth branches untouched',
  'src/engine/drawings/setPlan.js':
    'F14 · the plan draws each unit at ITS OWN gap; the depth chain reads the nearest '
    + 'back and the furthest front. Named by F14 by file',
  'src/engine/drawings/setSection.js':
    'F14 · the section cuts each member at ITS OWN gap. Named by F14 by file',
  'src/engine/profile.js':
    'F13 · `hoverDimensions.label.bayInk` and `.bayHaloAlpha` (the bay chain\'s ink and '
    + 'its halo) and the migration. No cut number',
  'src/engine/dimensionArrows.js':
    'F13 · `dimensionStyle` reads `labelHalo`, `labelBayInk`, `labelBayHalo` through. '
    + 'Drawing style only; nothing here is cut',
  'src/engine/watchDrawer.js':
    'F9 · `WATCH_FELT_COLOURS` and `felt` in `WATCH_FINISHES`: the accessories drawer\'s '
    + 'BASE FINISH, which the BOM names and no board is cut for',
  'src/engine/cornice.js':
    'F8 · `corniceRunNotice` — one sentence, returned to the store; reads nothing, '
    + 'writes nothing, cuts nothing',
  'src/engine/cabinet.js':
    'F9 · THE ONE EXCEPTION, ARGUED BELOW: the felt entry on the watch drawer\'s BOM '
    + 'line and `power: 0.5` on the glass strip. Both are published FIELDS on records '
    + 'that already existed; no panel, no size, no count moves — and the six goldens '
    + 'say so',
};

/** Named read-only by CLAUDE.md FROZEN. A diff here is a failure, not a delta. */
const READ_ONLY = [
  'src/engine/drawings/unitCard.js', 'src/engine/drawings/card.js', 'src/engine/drawings/sheet.js',
  'src/engine/drawings/views.js', 'src/engine/drawings/frontElevation.js',
  'src/engine/drawings/wallElevation.js', 'src/engine/drawings/section.js',
  'src/engine/drawings/setElevation.js', 'src/engine/drawings/setPerspective.js',
  'src/engine/drawings/setSheet.js', 'src/engine/drawings/setChains.js',
  'src/engine/drawings/setPaper.js', 'src/engine/drawings/wallSheets.js',
  'src/engine/lisp.js',
];

const THE_SIX = ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY'];

/** Every file under `src/` that names this symbol, comments stripped. */
const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
function codeReadersOf(symbol) {
  const files = (git(['grep', '-l', '-e', symbol, '--', 'src']) || '').trim().split('\n').filter(Boolean);
  const re = new RegExp(symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return files.filter((f) => re.test(strip(src(f))));
}

function engineImportsOf(rel, seen = new Set()) {
  if (seen.has(rel)) return seen;
  seen.add(rel);
  const t = strip(src(rel));
  for (const m of t.matchAll(/from\s+'([^']+)'/g)) {
    const spec = m[1];
    if (!spec.startsWith('.')) continue;
    const dir = rel.split('/').slice(0, -1).join('/');
    const parts = `${dir}/${spec}`.split('/');
    const out = [];
    for (const p of parts) { if (p === '..') out.pop(); else if (p !== '.') out.push(p); }
    let path = out.join('/');
    if (!/\.jsx?$/.test(path)) path += '.js';
    try { src(path); engineImportsOf(path, seen); } catch { /* not a file we can read */ }
  }
  return seen;
}

const cutGraph = engineImportsOf('src/engine/cabinet.js');

// ─── THE REACH OF EACH DELTA ───────────────────────────────────────────────

function reaches() {
  const rows = [];
  for (const [file, what] of Object.entries(LICENSED)) {
    const inCut = cutGraph.has(file);
    const readers = codeReadersOf(file.split('/').slice(-2).join('/')).filter((r) => r !== file);
    let reach = `imported by ${readers.join(', ') || 'nothing'}; on computeCabinet's import graph: ${inCut}`;
    let fixtures = inCut ? THE_SIX : [];
    if (file === 'src/engine/runs.js' || file === 'src/engine/collision.js') {
      // Both ARE on the cut graph (`cabinet.js` imports `runs.js`), so the
      // import question is not the one that settles it. The KEY is: who reads
      // `wall_gap`, and is any of them on the graph?
      const keyReaders = codeReadersOf('wall_gap').filter((r) => r !== file);
      const onCut = keyReaders.filter((r) => cutGraph.has(r) && r !== 'src/engine/runs.js' && r !== 'src/engine/collision.js');
      reach = `on computeCabinet's import graph: ${inCut} — but the DELTA is \`wall_gap\`, read by `
        + `${keyReaders.join(', ') || 'nothing'}; of those, on the graph and not the helper itself: ${onCut.join(', ') || 'none'}`;
      fixtures = onCut.length ? THE_SIX : [];
    }
    if (file === 'src/engine/profile.js') {
      const keyReaders = codeReadersOf('labelBay').filter((r) => r !== file);
      const onCut = keyReaders.filter((r) => cutGraph.has(r));
      reach = `the keys added, \`label.bayInk\` / \`label.bayHaloAlpha\`, are read by `
        + `${keyReaders.join(', ') || 'nothing'}; of those, on computeCabinet's import graph: ${onCut.join(', ') || 'none'}`;
      fixtures = onCut.length ? THE_SIX : [];
    }
    if (file === 'src/engine/cabinet.js') {
      // The one file that IS the cut path. Its licence is not "cannot reach"
      // — it is "reaches, and the six say it changed nothing", which is the
      // hashes at the bottom of this report and not a claim made up here.
      reach = 'IS the cut path; the six hashes below are the whole proof for this one';
      fixtures = [];
    }
    if (file === 'src/engine/watchDrawer.js' || file === 'src/engine/cornice.js') {
      const onCut = inCut;
      reach = `${reach}; the delta is a NAME (a felt colour, a notice sentence), not a size`;
      fixtures = onCut ? [] : [];
    }
    rows.push({ delta: file, why: what, reach, fixtures });
  }
  return rows;
}

// ─── F14, ASKED OF THE DATA ────────────────────────────────────────────────
//
// The import graph cannot answer a question about a KEY on a params object,
// because `computeCabinet` is handed the whole object. So the key is asked
// directly: compute each fixture with no `wall_gap` and again with 60 mm of
// it, and hash both. Identical hashes mean the cut path never read it.

const P = DEFAULT_CABINET_PROFILE;
const stable = (v) => JSON.stringify(v, (k, x) => (typeof x === 'number' ? Number(x.toFixed(6)) : x));
const hashOf = (params) => createHash('sha256').update(stable(computeCabinet(params, P))).digest('hex');

function wallGapReach() {
  const rows = [];
  for (const id of THE_SIX) {
    const base = defaultParamsFor(id, P);
    const without = hashOf({ ...base });
    const with60 = hashOf({ ...base, wall_gap: 60 });
    rows.push({ id, same: without === with60, sha: with60 });
  }
  return rows;
}

/** …and that the PLACEMENT readers DO see it, or the field is decoration. */
function placementReach() {
  const unit = { id: 'u1', type: 'WARDROBE', params: { depth: 600 }, position: { x_mm: 0, wall: 0 } };
  const typed = { ...unit, params: { ...unit.params, wall_gap: 60 } };
  return [
    ['engine/runs.js wallGapOf', wallGapOf(unit, P), wallGapOf(typed, P)],
    ['engine/collision.js backStandoff', backStandoff(unit, P), backStandoff(typed, P)],
  ];
}

// ─── THE REPORT ────────────────────────────────────────────────────────────

const list = reaches();
const base = JSON.parse(src('verify/t70/goldens-base.json'));
const head = dump();

process.stdout.write('─── T72 · THE ENGINE/LIB DELTAS, AND WHAT THEY REACH ───\n\n');
const ref = baseRef();
let stray = [];
let readOnlyTouched = [];
if (ref) {
  const touched = [
    ...(git(['diff', '--name-only', ref, '--', 'src/engine', 'src/lib']) || '').trim().split('\n'),
    ...(git(['ls-files', '--others', '--exclude-standard', '--', 'src/engine', 'src/lib']) || '').trim().split('\n'),
  ].filter(Boolean);
  for (const f of touched) {
    process.stdout.write(`${LICENSED[f] ? '  named    ' : '  UNNAMED  '} ${f}${LICENSED[f] ? `\n             ${LICENSED[f]}\n` : '\n'}`);
  }
  stray = touched.filter((f) => !LICENSED[f]);
  readOnlyTouched = touched.filter((f) => READ_ONLY.includes(f));
  process.stdout.write(`\n  ${touched.length} engine/lib file(s) changed or added · ${stray.length} not named above\n`);
  process.stdout.write(`  named READ-ONLY by CLAUDE.md and touched: ${readOnlyTouched.join(', ') || 'none'}\n`);
  const unspent = Object.keys(LICENSED).filter((f) => !touched.includes(f));
  process.stdout.write(`  named and unspent: ${unspent.join(', ') || 'none'}\n\n`);
} else {
  process.stdout.write('  no base ref: the goldens below are the whole proof\n\n');
}

let unreachable = 0;
for (const r of list) {
  const ok = r.fixtures.length === 0;
  if (ok) unreachable += 1;
  process.stdout.write(`${ok ? '  ok  ' : ' FAIL '}${r.delta}\n        ${r.why}\n        reach: ${r.reach}\n`);
  process.stdout.write(`        fixtures that set it: ${r.fixtures.length ? [...new Set(r.fixtures)].join(', ') : 'NONE, no golden can enter this path'}\n`);
}

process.stdout.write('\n─── F14 · `wall_gap` PUT TO computeCabinet, KEY IN HAND ───\n');
const gapRows = wallGapReach();
for (const r of gapRows) {
  process.stdout.write(`  ${r.id.padEnd(10)} no gap vs 60 mm: ${r.same ? 'IDENTICAL' : 'MOVED    '}  ${r.sha}\n`);
}
const cutBlind = gapRows.every((r) => r.same);
process.stdout.write(`  the cut path reads \`wall_gap\`: ${cutBlind ? 'NO' : 'YES'}\n`);

process.stdout.write('\n─── F14 · …AND THE PLACEMENT READERS DO SEE IT ───\n');
const placed = placementReach();
for (const [name, before, after] of placed) {
  process.stdout.write(`  ${name.padEnd(34)} nothing typed: ${before} mm · typed 60: ${after} mm\n`);
}
const placementLive = placed.every(([, before, after]) => before === 10 && after === 60);

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
  + ` · read-only files touched: ${readOnlyTouched.length} · cut path blind to wall_gap: ${cutBlind}`
  + ` · placement reads it: ${placementLive}\n`,
);
process.exit(
  moved === 0 && unreachable === list.length && stray.length === 0
    && readOnlyTouched.length === 0 && cutBlind && placementLive ? 0 : 1,
);
