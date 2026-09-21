#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT FOR TURN 71 ────────────────────────────────
//
// CLAUDE.md T71, FROZEN, verbatim:
//
//   *"Goldens x6 byte-identical. The set is DRAWING code: it reads
//   `computeCabinet`'s published result and writes nothing back. No delta
//   tonight is on the cut path, and this file proves it by naming every
//   engine file touched and asking, of each, who reads it."*
//
//   *"The unit card and the booklet are untouched (iron rule 4): the T43
//   golden of the card is compared byte for byte."*
//
// So this classifier does two things. It names every `src/engine` and
// `src/lib` file the turn touched with the one-line reason, and it asks the
// engine, at runtime, whether any of the six fixtures can enter a changed
// path: `computeCabinet` names none of the drawing modules, so the answer is
// NONE for every delta, and the six hashes say the same thing twice.
//
//   node scripts/t71-classify.mjs

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

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
 * THE LICENCE: every engine and lib file this turn spent, with why. A line
 * beyond a named licence is a line that has to be argued here.
 */
const LICENSED = {
  // ─── THE SET, NEW ────────────────────────────────────────────────────────
  'src/engine/drawings/setSheet.js':
    'F1 · the sheet law: A3 zones, the scale ladder, the title strip with the seven '
    + 'cells, the key plan, legend, notes; `layoutSetSheet` places a built drawing',
  'src/engine/drawings/setChains.js':
    'F2 · the dimension chains with homes: figures lifted with a leader when the '
    + 'segment is too short, alternating; `figureCollisions` is the invariant',
  'src/engine/drawings/setElevation.js':
    'F3 · the wall\'s front view and internal layout: the engine\'s fronts, shelves, '
    + 'drawer boxes, hinge plates (`drillSummary`), the scene\'s leg (plate, stem, foot), '
    + 'appliance spaces by TYPE, the design layer\'s worktop, the wall ends and ceiling',
  'src/engine/drawings/setPlan.js':
    'F4 · the two plans, cut at `set.planCut` through the base and the wall run, '
    + 'measured on the walls, with the room fabric and the section marks',
  'src/engine/drawings/setSection.js':
    'F4 · the sections: A-A through the drawer unit, B-B through the sink, a chosen '
    + 'cabinet as one more station, side by side at one scale; `cutCabinet` draws',
  'src/engine/drawings/setPerspective.js':
    'F6 · the perspective: the engine\'s boxes through a pinhole camera, painted far '
    + 'to near, NTS',
  'src/engine/drawings/setPaper.js':
    'F7 · the cover (index, revisions), the cut list (paged down four columns, the '
    + 'totals last) and the visualisation (the render in a frame, the finishes)',
  // ─── THE SET, BOUND ──────────────────────────────────────────────────────
  'src/engine/drawings/wallSheets.js':
    'F5 · `wallDrawingSheets` binds the set in order and numbers it; `titleFor` reads '
    + '`project.titleBlock`; the worktops resolve here when the caller passes none; '
    + '`wallSetReport`, `wallSectionUnits`, `wallDrawingPages` untouched',
  // ─── THE ENTITY MODEL AND THE RENDERERS ──────────────────────────────────
  'src/engine/drawings/primitives.js':
    'F8 · `entPoly` (a closed or open run of points, filled or not); `moveEntities` '
    + 'and `boundsOf` learn poly and image; the four older kinds untouched',
  'src/engine/drawings/svg.js':
    'F8 · poly and image; text learns right alignment, a white mask, bold, a colour',
  'src/engine/drawings/dxf.js':
    'F8 · poly as a POLYLINE, an image as its frame, right-aligned text',
  'src/lib/drawingExport.js':
    'F8 · `drawSheet` fills a rect or a poly, adds an image, masks and aligns text; '
    + 'the byte assertion and the booklet paths untouched',
  'src/engine/drawings/layers.js':
    'F8 · three layers added (SHEET_MUTED, SHEET_CUT, APPLIANCE); no existing layer edited',
  'src/engine/drawings/views.js':
    'F3 · one guard: `legSymbol === \'none\'` skips the grammar\'s three-line leg so the '
    + 'set draws the scene\'s; the card passes nothing and draws exactly what it drew',
  'src/engine/profile.js':
    'F1 · `drawings.set` (the sheet law\'s numbers) and its migration; no cut number',
  'src/lib/outputMenu.js':
    'F5 · the two menu entries say "Drawing set"; ids unchanged',
};

/** Named read-only by CLAUDE.md FROZEN. A diff here is a failure, not a delta. */
const READ_ONLY = [
  'src/engine/cabinet.js', 'src/engine/doors.js', 'src/engine/room.js', 'src/engine/worktop.js',
  'src/engine/drawings/sheet.js', 'src/engine/drawings/unitCard.js', 'src/engine/drawings/card.js',
  'src/engine/drawings/frontElevation.js', 'src/engine/drawings/wallElevation.js', 'src/engine/drawings/section.js',
];

const THE_SIX = ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY'];

/** Every file under `src/` that names this symbol, comments stripped. */
const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
function codeReadersOf(symbol) {
  const files = (git(['grep', '-l', '-e', symbol, '--', 'src']) || '').trim().split('\n').filter(Boolean);
  const re = new RegExp(symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return files.filter((f) => re.test(strip(src(f))));
}

// ─── THE REACH OF EACH DELTA ───────────────────────────────────────────────
//
// A golden is `computeCabinet(defaultParamsFor(id))`, hashed. The question for
// every delta is therefore one question: does `cabinet.js` (or anything it
// imports) read the changed file? The engine's import graph answers it.

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

function reaches() {
  const cutGraph = engineImportsOf('src/engine/cabinet.js');
  const rows = [];
  for (const [file, what] of Object.entries(LICENSED)) {
    const inCut = cutGraph.has(file);
    // Who imports it: the file's last two path segments, so `drawings/svg.js`
    // is not every `svg` in the app.
    const readers = codeReadersOf(file.split('/').slice(-2).join('/')).filter((r) => r !== file);
    let reach = `${what.slice(5)}; imported by ${readers.join(', ') || 'nothing'}; on computeCabinet's import graph: ${inCut}`;
    let fixtures = inCut ? THE_SIX : [];
    if (file === 'src/engine/profile.js') {
      // The profile is on every path. The DELTA is one key, `drawings.set`,
      // and the question is who reads THAT key: the drawing modules, none of
      // which `computeCabinet` imports.
      const keyReaders = codeReadersOf('drawings.set').filter((r) => r !== file);
      const onCut = keyReaders.filter((r) => cutGraph.has(r));
      reach = `${what.slice(5)}; the one key added, \`drawings.set\`, is read by ${keyReaders.join(', ') || 'nothing'}`
        + `; of those, on computeCabinet's import graph: ${onCut.join(', ') || 'none'}`;
      fixtures = onCut.length ? THE_SIX : [];
    }
    rows.push({ delta: `${what.slice(0, 2)} · ${file}`, reach, fixtures });
  }
  return rows;
}

// ─── THE REPORT ────────────────────────────────────────────────────────────

const list = reaches();
const base = JSON.parse(src('verify/t70/goldens-base.json'));
const head = dump();

process.stdout.write('─── T71 · THE ENGINE/LIB DELTAS, AND WHAT THEY REACH ───\n\n');
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
  process.stdout.write(`${ok ? '  ok  ' : ' FAIL '}${r.delta}\n        reach: ${r.reach}\n`);
  process.stdout.write(`        fixtures that set it: ${r.fixtures.length ? [...new Set(r.fixtures)].join(', ') : 'NONE, no golden can enter this path'}\n`);
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
