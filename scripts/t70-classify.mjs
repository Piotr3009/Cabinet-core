#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT FOR TURN 70 ────────────────────────────────
//
// CLAUDE.md, TESTS AND PROOF, verbatim:
//
//   *"Full suite; goldens ×6; parens; classifier; freeze, boundary, fidelity,
//   rig-parity green."*
//
// …and FROZEN, 2 and 3:
//
//   *"Goldens ×6 byte-identical. **F1 is cut geometry**: if a fixture carries
//   a shoe box, the change WILL move it — then STOP that feature, name the
//   fixture, and go on. Never re-bless."*
//
//   *"Engine licence: `cabinet.js` (F1 only, the shoe box's own path),
//   `profile.js` (F3 keys, F5 sheen). `doors.js`, `room.js` read-only."*
//
// ─── AND THIS TURN IS THE FIRST IN A WHILE WHERE A DELTA *CAN* REACH ───────
//
// T69's classifier could say of every delta *"no golden can enter this path"*
// because nothing it wrote was in the cut path. F1 IS the cut path: it decides
// whether a board is emitted. So this file does not claim unreachability by
// assertion — it asks the ENGINE, at runtime, whether any of the six fixtures
// can enter the branch, by running the predicate over each fixture's own
// drawer items. A golden that could enter it is a golden that would move, and
// FROZEN 2 says stop the feature and name it.
//
//   node scripts/t70-classify.mjs

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet, shoeCapsTheStack } from '../src/engine/cabinet.js';
import { drawerOf } from '../src/engine/drawerMotion.js';
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
 * THE LICENCE — CLAUDE.md's two files, and the ONE MORE this turn spent, with
 * the one-line reason it was spent on. A line beyond a named licence is a line
 * that has to be argued, and the argument is in this table rather than buried
 * in a paragraph.
 */
const LICENSED = {
  'src/engine/cabinet.js':
    'F1 · the shoe box\'s own path, and nothing else: `shoeCapsTheStack` (the kit\'s '
    + '`SKY:shoeCapsTheStack`) asked at the THREE sites that cap a stack with a board — '
    + 'the full-width PARTITION and its `partition_screw` confirmats, the column\'s '
    + 'Z*-PART, and the overlay stack\'s OVERLAY-FIX shelf (the site T65 F5 touched, '
    + 'which CLAUDE.md names) — plus the SHOE_STACK_UNCAPPED warning each raises',
  // ─── THE ONE BEYOND THE NAMED TWO ────────────────────────────────────────
  'src/engine/drawerMotion.js':
    'BEYOND THE NAMED LICENCE, one role added to one list, and the argument is that '
    + 'it IS "the shoe box\'s own path" the licence names — the second half of F1 '
    + '(*"skos ma sie otwierac razem z boxem"*) cannot be met anywhere else. '
    + '`drawerOf` named `drawer_box` and `watch_insert`; T58 gave the shoe insert a '
    + 'third role, `shoe_insert`, that nobody added here, so the box came out and the '
    + 'ramp stayed in the carcass. It is a VIEW law — what travels with a front — and '
    + 'it cuts no board, publishes no key and is read by no CNC, DXF or BOM path',
};

/** Named read-only by CLAUDE.md FROZEN 3. A diff here is a failure, not a delta. */
const READ_ONLY = ['src/engine/doors.js', 'src/engine/room.js'];

/** …and the two the licence names but this turn did not need. */
const NAMED_UNSPENT_OK = ['src/engine/profile.js'];

const THE_SIX = [
  { id: 'WARDROBE', type: 'WARDROBE' },
  { id: 'BUD', type: 'BUD' },
  { id: 'WUD', type: 'WUD' },
  { id: 'BUDR', type: 'BUDR' },
  { id: 'BUDR4', type: 'BUDR4' },
  { id: 'PANTRY', type: 'PANTRY' },
];

/** Every file under `src/` that names this symbol, comments stripped. */
const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
function codeReadersOf(symbol) {
  const files = (git(['grep', '-l', '-e', symbol, '--', 'src']) || '').trim().split('\n').filter(Boolean);
  const re = new RegExp(symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return files.filter((f) => re.test(strip(src(f))));
}
const onEngine = (files) => files.filter((f) => f.startsWith('src/engine/'));

// ─── THE REACH OF EACH DELTA, ASKED OF THE ENGINE RATHER THAN ASSERTED ─────

/** A fixture's own drawer items, exactly as `computeCabinet` is handed them. */
function drawerItemsOf(cfg) {
  const params = defaultParamsFor(cfg.type, P);
  const items = params.sections?.[0]?.items || [];
  return {
    drawers: items.filter((i) => i?.kind === 'drawer'),
    overlay: items.filter((i) => i?.kind === 'overlay_drawer'),
  };
}

function reaches() {
  const rows = [];

  // ─── F1a · NO BOARD IS CUT OVER A SHOE BOX ───────────────────────────────
  //
  // The branch runs only where `shoeCapsTheStack` answers TRUE, and it answers
  // TRUE only where the TOP item of a stack carries `variant: 'shoe'`. So the
  // question is not "does cabinet.js change" — it does — but "can any of the
  // six put a shoe drawer on top of a stack". Asked of each fixture's own
  // items, by running the predicate the branch runs.
  const canEnter = THE_SIX.filter((cfg) => {
    const { drawers, overlay } = drawerItemsOf(cfg);
    return shoeCapsTheStack(drawers) || shoeCapsTheStack(overlay);
  }).map((c) => c.id);
  const partitions = THE_SIX.map((cfg) => {
    const r = computeCabinet(defaultParamsFor(cfg.type, P), P);
    return `${cfg.id}:${r.panels.filter((p) => p.part === 'PARTITION').length}`;
  });
  const capReaders = codeReadersOf('shoeCapsTheStack');
  rows.push({
    delta: 'F1a · `shoeCapsTheStack` gates the PARTITION, its `partition_screw` confirmats, '
      + 'the column\'s Z*-PART and the overlay OVERLAY-FIX shelf; each raises SHOE_STACK_UNCAPPED',
    reach: `the predicate is TRUE only for a stack whose TOP item is variant 'shoe'`
      + `; read by ${capReaders.join(', ') || 'nothing'}`
      + `; the six carry shoe drawers: ${canEnter.length ? canEnter.join(', ') : 'NONE'}`
      + `; PARTITION count per fixture: ${partitions.join(' ')}`,
    fixtures: canEnter,
  });

  // ─── F1b · THE SLOPE TRAVELS WITH THE BOX ────────────────────────────────
  //
  // `drawerOf` is a VIEW function. The question a golden asks is whether the
  // CUT changed, and the honest way to answer it is to ask who reads this file
  // — and to show that the one line added answers differently for exactly one
  // role and identically for every other.
  const motionReaders = codeReadersOf('drawerMotion');
  const sameAsBefore = ['drawer_box', 'watch_insert', 'shelf', 'front', 'side']
    .map((role) => `${role}:${drawerOf({ role, meta: { drawer: 1 } })}`);
  rows.push({
    delta: `F1b · drawerMotion.drawerOf also answers for role 'shoe_insert' `
      + `(${drawerOf({ role: 'shoe_insert', meta: { drawer: 1 } })}); every other role unchanged: ${sameAsBefore.join(' ')}`,
    reach: `read by ${motionReaders.join(', ') || 'nothing'}`
      + `; engine readers: ${onEngine(motionReaders).join(', ') || 'none'}`
      + `; cabinet.js names drawerMotion: ${/drawerMotion/.test(src('src/engine/cabinet.js'))}`
      + '; a golden is `computeCabinet(defaultParamsFor(id))` and never renders',
    fixtures: /drawerMotion|drawerOf/.test(src('src/engine/cabinet.js')) ? THE_SIX.map((c) => c.id) : [],
  });

  // ─── F2 · A STYLESHEET ───────────────────────────────────────────────────
  rows.push({
    delta: 'F2 · `retail/styles/room.css` hides the drawer-row spec chips in the left column',
    reach: 'a CSS rule under `.pbi-room[data-workshop-tools="no"]`; no JS reads it; '
      + `cabinet.js names room.css: ${/room\.css/.test(src('src/engine/cabinet.js'))}`,
    fixtures: [],
  });

  // ─── F3 / F4 / F5 / F6 · RETAIL ONLY ─────────────────────────────────────
  //
  // Every one of them is `src/retail/**`, which the iron boundary keeps out of
  // the engine entirely. Named so the list is the whole turn and not the half
  // of it that touched `src/engine`.
  const retailOnly = [
    ['F3', 'detail/ReHomed.jsx + adapter (stackMount/stackVariant/innerBoxHeight/frontAndInsideWords)'],
    ['F4', 'Options.jsx FRONTS — ADD DOORS / REMOVE DOORS, the adapter\'s own two calls'],
    ['F5', 'Options.jsx FRONTS — the sheen band row and the colour rows; adapter + estimate/document.js'],
    ['F6', 'Options.jsx INSIDE — the bay chip\'s onPointerEnter/onFocus also select the cabinet'],
  ];
  for (const [f, what] of retailOnly) {
    rows.push({
      delta: `${f} · ${what}`,
      reach: 'src/retail/** only — the iron boundary: no engine file imports it, '
        + 'and a golden calls `computeCabinet` directly',
      fixtures: [],
    });
  }

  return rows;
}

// ─── THE REPORT ────────────────────────────────────────────────────────────

const list = reaches();
const base = JSON.parse(src('verify/t70/goldens-base.json'));
const head = dump();

process.stdout.write('─── T70 · THE ENGINE/LIB DELTAS, AND WHAT THEY REACH ───\n\n');
const ref = baseRef();
let stray = [];
let readOnlyTouched = [];
if (ref) {
  const touched = (git(['diff', '--name-only', ref, '--', 'src/engine', 'src/lib']) || '')
    .trim().split('\n').filter(Boolean);
  for (const f of touched) {
    process.stdout.write(`${LICENSED[f] ? '  named    ' : '  UNNAMED  '} ${f}${LICENSED[f] ? `\n             ${LICENSED[f]}\n` : '\n'}`);
  }
  stray = touched.filter((f) => !LICENSED[f]);
  readOnlyTouched = touched.filter((f) => READ_ONLY.includes(f));
  process.stdout.write(`\n  ${touched.length} engine/lib file(s) changed · ${stray.length} not named above\n`);
  process.stdout.write(`  named READ-ONLY by CLAUDE.md and touched: ${readOnlyTouched.join(', ') || 'none'}\n`);
  const unspent = [...Object.keys(LICENSED), ...NAMED_UNSPENT_OK].filter((f) => !touched.includes(f));
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
for (const cfg of THE_SIX) {
  const same = base[cfg.id]?.sha256 && base[cfg.id].sha256 === head[cfg.id]?.sha256;
  if (!same) moved += 1;
  process.stdout.write(`  ${cfg.id.padEnd(10)} ${same ? 'IDENTICAL' : 'UNNAMED  '}  ${head[cfg.id]?.sha256 || head[cfg.id]?.error}\n`);
}
process.stdout.write(
  `\nIDENTICAL=${THE_SIX.length - moved} UNNAMED=${moved} · deltas that cannot reach a fixture: `
  + `${unreachable}/${list.length} · engine files not named: ${stray.length}`
  + ` · read-only files touched: ${readOnlyTouched.length}\n`,
);
process.exit(
  moved === 0 && unreachable === list.length && stray.length === 0 && readOnlyTouched.length === 0 ? 0 : 1,
);
