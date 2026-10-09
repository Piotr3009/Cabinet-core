#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT FOR TURN 75 ────────────────────────────────
//
// CLAUDE.md T75, FROZEN 1, verbatim:
//
//   *"Goldens x6 byte-identical (`scripts/t64-classify.mjs dump()` against
//   `verify/t70/goldens-base.json`). `scripts/t75-classify.mjs` (T74's
//   pattern) names every engine delta of this turn and proves no golden can
//   reach it. Every new kit and every new cut geometry gets a golden of its
//   own under `fixtures/` (named in each F) and a line in the classifier."*
//
// T74's shape: every `src/engine` and `src/lib` file the turn touched is NAMED
// here with its one-line reason; a file CLAUDE.md marks read-only is a failure;
// and the question "can a golden reach this delta" is asked twice: of the
// import graph, and, where the delta IS on the cut path, of the DATA. The six
// fixtures are `defaultParamsFor(type)` put through `computeCabinet`, so each
// cut-path delta names the GATE it hangs on (a new type, a param no default
// carries) and the six are asked whether any of them opens that gate. Then
// each gate is opened on a crafted cabinet, to show the delta is live and not
// decoration. Then the six are hashed, and every NEW golden this turn adds is
// re-computed and compared with its file under `fixtures/`.
//
//   node scripts/t75-classify.mjs

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

import { dump } from './t64-classify.mjs';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor, UNIT_TYPES } from '../src/engine/types.js';
import { T75_GOLDENS } from './t75-goldens.mjs';
import { goldenOf } from './t75-golden.mjs';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

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

const THE_SIX = ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY'];

/**
 * THE GATES a cut-path delta hangs on, each asked of one fixture's params:
 * true means the fixture OPENS it (and could reach the delta).
 */
export const GATES = {
  cornerPost: {
    what: 'a corner post on the unit (`params.corner_post_left_mm` / `corner_post_right_mm`, F2)',
    opens: (p) => Number(p.corner_post_left_mm) > 0 || Number(p.corner_post_right_mm) > 0,
  },
  blind: {
    what: 'a blind corner kit (BLIND_BASE, BLIND_WALL, BLIND_WARDROBE: `type.blind`, F3)',
    opens: (p, id) => Boolean(UNIT_TYPES[id]?.blind || UNIT_TYPES[p.type]?.blind),
  },
};

/**
 * THE LICENCE: every engine and lib file this turn spent, with why, and the
 * gates its cut-path delta hangs on (none where the file cannot reach a cut).
 */
export const LICENSED = {
  'src/engine/corners.js': {
    why: 'F1 · NEW: the corner rulebook, `cornersOf` and its four answers, the face, the stop and the '
      + 'Check sentence. F3 · `cornerEndOf` and `blindClearanceView` (the blind leaf measured against its '
      + 'blank). Read by the store, the checks and the retail adapter; computeCabinet never imports it',
    gates: [],
  },
  'src/engine/checks.js': {
    why: 'F1 · Check #27, red: a corner with nothing between the runs, asked of `cornersOf`. F3 · Check #2 '
      + 'measures a blind leaf through `blindClearanceView`. Reads a room; cuts nothing',
    gates: [],
  },
  'src/engine/cabinet.js': {
    why: 'F2 · the CORNER-POST board (front material, door plane, carcass high) cut when the store hands '
      + '`corner_post_*_mm`; `corner_post` and `blind_blank` join the front-material and finish-exposed roles. '
      + 'F3 · `normalizeParams` resolves a blind kit\'s blank (`cfg.blind`), the one leaf stands beside it and '
      + 'the BLIND-BLANK fixed piece is cut. IS the cut path: every delta is behind a gate below',
    gates: ['cornerPost', 'blind'],
  },
  'src/engine/partRegistry.js': {
    why: 'F2 · the `corner_post` part and its edging; F3 · BLIND-BLANK on the `false_front` row held open '
      + 'since T39 for the day the engine says FIX. No fixture emits either part',
    gates: ['cornerPost', 'blind'],
  },
  'src/engine/runs.js': {
    why: 'F2 · `unitVerticals` reports the corner post (kind `corner-post`) so rule 7 sees it. Read by the '
      + 'room\'s rulebooks; the six carry no post',
    gates: ['cornerPost'],
  },
  'src/engine/frontClearance.js': {
    why: 'FRONTS BOUNDARY licence 1 · rule 7 reads `doors.clearance.corner` (null when a profile names none), '
      + 'and the post vertical maps to NEIGHBOUR.CORNER (one line). Room-level, not a cut',
    gates: [],
  },
  'src/engine/collision.js': {
    why: 'F2 · the CORNER STOP: `wallObstacles` widens an obstacle round the corner by its `stopPad` (door '
      + 'gap, front, post). Placement and drag, not a cut',
    gates: [],
  },
  'src/engine/profile.js': {
    why: 'F2 · `corner` (postMm, overlap) and `doors.clearance.corner`; F3 · `blindBase`, `blindWall`, '
      + '`blindWardrobe` defaults; and their migrate lines. Every number marked T75 proposed. The six read none',
    gates: ['cornerPost', 'blind'],
  },
  'src/engine/types.js': {
    why: 'F3 · the three BLIND kits copied field by field from BUD, WUD and WARDROBE, their prefixes, order, '
      + 'the wardrobe category line, `isBlindKit`, and `blind_side` spread into their defaults alone',
    gates: ['blind'],
  },
  'src/engine/library.js': {
    why: 'F3 · the rows "Blind corner" (Base units) and "Blind corner wall" (Wall units). The library, not a cut',
    gates: [],
  },
  'src/engine/cnc/groups.js': {
    why: 'F2/F3 · the corner post goes with the infills and the blank with the fronts on the CNC sheet. '
      + 'Which sheet a cut part lands on, not the cut',
    gates: [],
  },
  'src/engine/bom.js': {
    why: 'F3 · the comment naming `blind_blank` among the front-sheet roles. No code',
    gates: [],
  },
  'src/engine/elements.js': {
    why: 'F2/F3 · the `corner-post` and `blind-blank` kinds: their labels, rows and actions, clicked as '
      + 'attached pieces. What a piece is CALLED and offered, not what it is cut',
    gates: [],
  },
};

/** THE NEW GOLDENS: each a fixture file and the params that re-make it. */
export const NEW_GOLDENS = [];

/** Named read-only by CLAUDE.md FROZEN 2. A diff here is a failure, not a delta. */
const READ_ONLY_PREFIX = ['src/engine/drawings/'];
const READ_ONLY = [
  'src/engine/lisp.js',
  // FROZEN 2: the lighting files.
  'src/engine/ledStrips.js', 'src/engine/lighting.js', 'src/engine/lightRig.js',
  // THE FRONTS BOUNDARY (GPT's branch): only `frontClearance.js` is licensed, by line.
  'src/engine/doors.js', 'src/engine/shaker.js', 'src/engine/handles.js', 'src/engine/splitDoors.js',
  'src/engine/frontStyleArt.js', 'src/engine/hinges.js', 'src/engine/hingeLadder.js',
  'src/engine/frontDimensions.js', 'src/engine/frontGapClash.js',
];
const isReadOnly = (f) => READ_ONLY.includes(f) || READ_ONLY_PREFIX.some((p) => f.startsWith(p));

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

// ─── THE SIX, ASKED OF EACH GATE ──────────────────────────────────────────

function gateTable() {
  const rows = [];
  for (const id of THE_SIX) {
    const params = defaultParamsFor(id, P);
    const open = Object.entries(GATES).filter(([, g]) => g.opens(params, id)).map(([k]) => k);
    rows.push({ id, open });
  }
  return rows;
}

// ─── …AND EACH GATE OPENED, SO THE DELTA IS SHOWN TO BE LIVE ─────────────

const LIVENESS = {
  cornerPost: () => {
    const r = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01', corner_post_left_mm: 50 }, P);
    const post = r.panels.find((p) => p.role === 'corner_post');
    return { live: Boolean(post) && post.w > 0, said: `BUD with a left post cuts ${post ? `${post.id} ${post.w} x ${post.h}` : 'nothing'}` };
  },
  blind: () => {
    const r = computeCabinet({ ...defaultParamsFor('BLIND_BASE', P), unit_num: '01', doors: { count: 1 } }, P);
    const blank = r.panels.find((p) => p.role === 'blind_blank');
    const door = r.panels.find((p) => p.role === 'front');
    return {
      live: Boolean(blank) && Boolean(door) && door.w < 1000 - 3,
      said: `BLIND_BASE cuts ${blank ? `${blank.id} ${blank.w}` : 'no blank'} and one leaf ${door?.w} hinged ${door?.meta?.hinge}`,
    };
  },
};

function liveness() {
  return Object.keys(GATES).map((gate) => {
    try {
      const r = LIVENESS[gate] ? LIVENESS[gate]() : { live: false, said: 'no liveness probe written' };
      return { gate, ...r };
    } catch (e) {
      return { gate, live: false, said: `threw: ${e.message}` };
    }
  });
}

// ─── THE NEW GOLDENS, RE-MADE AND COMPARED ─────────────────────────────────

const stable = (value) => JSON.stringify(value, (key, v) => {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]));
  }
  return v;
});

function newGoldens() {
  return [...NEW_GOLDENS, ...T75_GOLDENS].map((g) => {
    const file = `fixtures/${g.file}`;
    if (!existsSync(new URL(`../${file}`, import.meta.url))) return { ...g, ok: false, said: 'fixture missing' };
    const want = JSON.parse(src(file));
    const got = g.make ? g.make() : goldenOf(want.params, P);
    const ok = stable(want.expected ?? want) === stable(got);
    return { ...g, ok, said: ok ? 'byte-identical to its fixture' : 'DIFFERS from its fixture' };
  });
}

// ─── THE REPORT ────────────────────────────────────────────────────────────

const base = JSON.parse(src('verify/t70/goldens-base.json'));
const head = dump();

process.stdout.write('─── T75 · THE ENGINE/LIB DELTAS, AND WHAT THEY REACH ───\n\n');
const ref = baseRef();
let stray = [];
let readOnlyTouched = [];
let unspent = [];
if (ref) {
  const touched = [
    ...(git(['diff', '--name-only', ref, '--', 'src/engine', 'src/lib']) || '').trim().split('\n'),
    ...(git(['ls-files', '--others', '--exclude-standard', '--', 'src/engine', 'src/lib']) || '').trim().split('\n'),
  ].filter(Boolean);
  for (const f of touched) {
    process.stdout.write(`${LICENSED[f] ? '  named    ' : '  UNNAMED  '} ${f}\n`);
  }
  stray = touched.filter((f) => !LICENSED[f]);
  readOnlyTouched = touched.filter(isReadOnly);
  unspent = Object.keys(LICENSED).filter((f) => !touched.includes(f));
  process.stdout.write(`\n  ${touched.length} engine/lib file(s) changed or added · ${stray.length} not named\n`);
  process.stdout.write(`  named READ-ONLY by CLAUDE.md and touched: ${readOnlyTouched.join(', ') || 'none'}\n`);
  process.stdout.write(`  named and unspent: ${unspent.join(', ') || 'none'}\n\n`);
} else {
  process.stdout.write('  no base ref: the goldens below are the whole proof\n\n');
}

const gates = gateTable();
let reachable = 0;
for (const [file, lic] of Object.entries(LICENSED)) {
  const inCut = cutGraph.has(file);
  const readers = codeReadersOf(`/${file.split('/').pop()}'`).filter((r) => r !== file);
  const fixtures = gates.filter((g) => lic.gates.some((k) => g.open.includes(k))).map((g) => g.id);
  if (fixtures.length) reachable += 1;
  process.stdout.write(`${fixtures.length ? ' FAIL ' : '  ok  '}${file}\n        ${lic.why}\n`);
  process.stdout.write(`        on computeCabinet's import graph: ${inCut}; imported by ${readers.length} file(s)\n`);
  process.stdout.write(`        gates: ${lic.gates.length ? lic.gates.map((k) => GATES[k].what).join('; ') : 'none (cannot reach a cut)'}\n`);
  process.stdout.write(`        fixtures that open them: ${fixtures.length ? fixtures.join(', ') : 'NONE, no golden can enter this path'}\n`);
}

process.stdout.write('\n─── THE SIX, GATE BY GATE ───\n');
for (const g of gates) {
  process.stdout.write(`  ${g.id.padEnd(10)} opens: ${g.open.length ? g.open.join(', ') : 'none'}\n`);
}

process.stdout.write('\n─── EACH GATE OPENED ON A CRAFTED CABINET: THE DELTA IS LIVE ───\n');
const live = liveness();
for (const l of live) process.stdout.write(`  ${l.live ? 'live' : 'DEAD'}  ${l.gate.padEnd(12)} ${l.said}\n`);
const allLive = live.every((l) => l.live);

process.stdout.write('\n─── THE NEW GOLDENS ───\n');
const fresh = newGoldens();
for (const g of fresh) process.stdout.write(`  ${g.ok ? 'ok  ' : 'FAIL'}  ${g.file.padEnd(34)} ${g.F}  ${g.said}\n`);
const goldensOk = fresh.every((g) => g.ok);

process.stdout.write('\n─── THE SIX ───\n');
let moved = 0;
for (const id of THE_SIX) {
  const same = base[id]?.sha256 && base[id].sha256 === head[id]?.sha256;
  if (!same) moved += 1;
  process.stdout.write(`  ${id.padEnd(10)} ${same ? 'IDENTICAL' : 'UNNAMED  '}  ${head[id]?.sha256 || head[id]?.error}\n`);
}
process.stdout.write(
  `\nIDENTICAL=${THE_SIX.length - moved} UNNAMED=${moved} · deltas a golden can reach: ${reachable}/${Object.keys(LICENSED).length}`
  + ` · engine files not named: ${stray.length} · named and unspent: ${unspent.length}`
  + ` · read-only files touched: ${readOnlyTouched.length} · every gate live: ${allLive}`
  + ` · new goldens: ${fresh.filter((g) => g.ok).length}/${fresh.length}\n`,
);
const hash = createHash('sha256').update(JSON.stringify(head)).digest('hex').slice(0, 16);
process.stdout.write(`dump ${hash}\n`);
process.exit(
  moved === 0 && reachable === 0 && stray.length === 0 && unspent.length === 0
    && readOnlyTouched.length === 0 && allLive && goldensOk ? 0 : 1,
);
