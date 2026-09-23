#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT FOR TURN 74 ────────────────────────────────
//
// CLAUDE.md T74, FROZEN 1, verbatim:
//
//   *"Goldens x6 byte-identical (`scripts/t64-classify.mjs dump()` against
//   `verify/t70/goldens-base.json`). Slopes, shoe drawers, wall units in a
//   wardrobe run and corners are not in the six; `scripts/t74-classify.mjs`
//   (T72's pattern) names every engine delta and proves no golden can reach
//   it."*
//
// T72's shape: every `src/engine` and `src/lib` file the turn touched is NAMED
// here with its one-line reason; a file CLAUDE.md marks read-only is a failure;
// and the question "can a golden reach this delta" is asked twice: of the
// import graph, and, where the delta IS on the cut path, of the DATA. The six
// fixtures are `defaultParamsFor(type)` put through `computeCabinet`, so each
// cut-path delta names the GATE it hangs on (a slope, a shoe drawer, a
// mounting height, a new type) and the six are asked whether any of them opens
// that gate. Then each gate is opened on a crafted cabinet, to show the delta
// is live and not decoration. Then the six are hashed.
//
//   node scripts/t74-classify.mjs

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { dump } from './t64-classify.mjs';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor, UNIT_TYPES } from '../src/engine/types.js';
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
const drawerItems = (p) => (p.sections || []).flatMap((s) => s.items || []).concat(p.items || [])
  .filter((i) => i && i.kind === 'drawer');
export const GATES = {
  slope: {
    what: 'a slope over the cabinet (`params.slope_cut`)',
    opens: (p) => p.slope_cut != null,
  },
  shoe: {
    what: 'a SHOE drawer (`variant: \'shoe\'` on a drawer item)',
    opens: (p) => drawerItems(p).some((i) => i.variant === 'shoe'),
  },
  mount: {
    what: 'a drawer carrying its own MOUNTING HEIGHT (`pos_mm` on a drawer item)',
    opens: (p) => drawerItems(p).some((i) => Number.isFinite(Number(i.pos_mm))),
  },
  watch: {
    what: 'an ACCESSORIES (watch) drawer (`watch_insert` / `variant: \'watch\'` on a drawer item)',
    opens: (p) => drawerItems(p).some((i) => i.watch_insert === true || i.variant === 'watch'),
  },
  wallUnit: {
    what: 'the new WARDROBE_WALL type',
    opens: (p, id) => id === 'WARDROBE_WALL' || p.type === 'WARDROBE_WALL',
  },
  freePanel: {
    what: 'the new FREE_PANEL kit (`carcass.top: \'free\'`)',
    opens: (p, id) => id === 'FREE_PANEL' || p.type === 'FREE_PANEL',
  },
};

/**
 * THE LICENCE: every engine and lib file this turn spent, with why, and the
 * gates its cut-path delta hangs on (none where the file cannot reach a cut).
 */
export const LICENSED = {
  'src/engine/cabinet.js': {
    why: 'F6 · `stackOffsets`: a drawer stands at its `pos_mm`, a stack that states none is the old sum; '
      + 'the lower of two shoe drawers keeps its ramp. F9 · the VPART under a slope is cut to it '
      + '(`divCeil`, `meta.slopeCut`). F10 · hinges on a sloped leaf re-laddered 150 mm clear of the '
      + 'apex (`apexPlan`, `hingeApex`). F13 · a kit whose carcass is `top: \'free\'` is cut as ONE '
      + 'board (`FP`), and `free_panel` joins the finish-exposed roles. IS the cut path: every delta is '
      + 'behind a gate below',
    gates: ['mount', 'shoe', 'slope', 'freePanel'],
  },
  'src/engine/freePanel.js': {
    why: 'F13 · NEW: the free panel\'s own arithmetic (its board, the box it fills at a lean, a size read '
      + 'as meant, the proposal a drop may take). Called by the cut path only for a `top: \'free\'` kit',
    gates: ['freePanel'],
  },
  'src/engine/library.js': {
    why: 'F13 · the Extras row held open since turn 12 (`free-standing-panels`) is a kit row now. The '
      + 'library, not a cut',
    gates: [],
  },
  'src/engine/elements.js': {
    why: 'F13 · the `free-panel` kind: its label, its two rows, its actions, and a click lands on it. '
      + 'What a panel is CALLED and offered, not what it is cut',
    gates: [],
  },
  'src/engine/partRegistry.js': {
    why: 'F13 · the `FREE-PANEL` part on its own BOM row (`free_panel`, board, banded as a shelf). No '
      + 'fixture emits that part',
    gates: ['freePanel'],
  },
  'src/engine/runs.js': {
    why: 'F13 · a free panel joins no run (no shared plinth, cornice or mask). The six are not runs of '
      + 'free panels',
    gates: ['freePanel'],
  },
  'src/engine/shoeInsert.js': {
    why: 'F8 · the ramp and its dividers pivot on their FRONT bottom edge, so the lean lifts the back '
      + 'inside the box (it had dropped the front through the floor)',
    gates: ['shoe'],
  },
  'src/engine/profile.js': {
    why: 'F10 · `hinges.slopeApexMinMm: 150` (read only under a slope); F12 · `appearance.jpull.grooveShade` '
      + '(read by the 3-D alone); F7 · `wardrobeWallUnit.defaults` and F13 · `freePanel.defaults` (each read '
      + 'by its new kit alone); and the four migrate lines',
    gates: ['slope', 'wallUnit', 'freePanel'],
  },
  'src/engine/types.js': {
    why: 'F7 · the new WARDROBE_WALL type (WUD copied 1:1 into the wardrobe family), its order, category '
      + 'and prefix, and `isWardrobeWallUnit`. F13 · the new FREE_PANEL kit, its prefix, `isFreePanel`, and '
      + 'its box spread into `defaultParamsFor` for that kit alone. The six types are untouched',
    gates: ['wallUnit', 'freePanel'],
  },
  'src/engine/watchDrawer.js': {
    why: 'F2 · the felt `red` entry reads "Wine red" at #722F37: a NAME on the watch drawer\'s BOM line and '
      + 'a colour, no board. F6 · `secondShoeItem`, the one question the UI and the store ask (the cut '
      + 'path never calls it)',
    gates: ['watch'],
  },
  'src/engine/room.js': {
    why: 'F5 · `wallsInScope(\'three\')` is left + front + right, open toward the camera. ROOM geometry '
      + '(which walls a design scope shows), not a cut',
    gates: [],
  },
  'src/engine/design.js': {
    why: 'F5 · the comment naming what \'three\' means. No code',
    gates: [],
  },
  'src/engine/checks.js': {
    why: 'F10 · Check #26, red: a door whose hinge edge cannot hold its hinges 150 mm clear of the apex. '
      + 'Reads the engine\'s own `meta.slopeCut.hingeApex`; cuts nothing',
    gates: [],
  },
  'src/engine/endPanelAuto.js': {
    why: 'F7 · `inPlayWardrobe` exported (the store asks it: the vanishing panel is wardrobe to wardrobe)',
    gates: [],
  },
  'src/engine/topBox.js': {
    why: 'F7 · `hostsRidersOf`: a top box stands on a wardrobe, never on a wall unit. PLACEMENT',
    gates: [],
  },
  'src/engine/roomFit.js': {
    why: 'F13 · `floorOf` reads a STATED mounting height of 0 as a height (a board on the floor), the way '
      + '`projectStore.floorYOf` reads it; only an unstated one falls back to the hanging height. The room '
      + 'check and the size refusal read it; a bare `computeCabinet` has no room, so no cut',
    gates: [],
  },
  'src/lib/contextActions.js': {
    why: 'F13 · the right-click on a free panel offers what a board has (rename, colour, template, delete): '
      + 'no end panel, filler, mask or rotation. UI',
    gates: [],
  },
  'src/lib/modalLayer.js': {
    why: 'F1 · the `add-panel` window kind (ADD END PANEL?) in the registry. UI',
    gates: [],
  },
};

/** Named read-only by CLAUDE.md FROZEN 2. A diff here is a failure, not a delta. */
const READ_ONLY_PREFIX = ['src/engine/drawings/'];
const READ_ONLY = ['src/engine/lisp.js'];
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

function liveness() {
  const out = [];
  // mount + shoe (F6, F8): two shoe drawers, the second at 450.
  {
    const params = {
      ...defaultParamsFor('WARDROBE', P),
      unit_num: '01',
      sections: [{
        width_mm: 1000,
        items: [
          { id: 'd1', kind: 'drawer', index: 1, variant: 'shoe', height_mm: 116 },
          { id: 'd2', kind: 'drawer', index: 2, variant: 'shoe', height_mm: 116, pos_mm: 450 },
        ],
      }],
      width: 1000,
    };
    const r = computeCabinet(params, P);
    const f2 = r.panels.find((p) => p.part === 'DRAWER-FRONT' && p.meta?.drawer === 2);
    const ramps = r.panels.filter((p) => p.part === 'SHOE-RAMP');
    const pivotFront = ramps.every((p) => Math.abs(p.meta.tilt_pivot.z - (p.box.z + p.box.d)) < 1e-3);
    out.push({ gate: 'mount', live: f2?.box?.y === 450, said: `second shoe front at ${f2?.box?.y} (asked 450)` });
    out.push({ gate: 'shoe', live: ramps.length === 2 && pivotFront, said: `${ramps.length} ramps, pivot on the front edge: ${pivotFront}` });
  }
  // slope (F9, F10): a wardrobe under a slope, a divider in it.
  {
    const params = {
      ...defaultParamsFor('WARDROBE', P),
      unit_num: '01',
      width: 1000,
      items: [{ kind: 'partition', id: 'p1', x_mm: 491 }],
      slope_cut: { y0: 2400, y1: 1200, infill: 40 },
    };
    const r = computeCabinet(params, P);
    const vpart = r.panels.find((p) => p.part === 'VPART');
    const leaves = r.panels.filter((p) => p.meta?.slopeCut?.hingeApex);
    out.push({
      gate: 'slope',
      live: Boolean(vpart?.meta?.slopeCut) && leaves.length > 0,
      said: `VPART cut to the slope: ${Boolean(vpart?.meta?.slopeCut)}; leaves carrying hingeApex: ${leaves.length}`,
    });
  }
  // watch (F2): the red felt names itself wine on the BOM line.
  {
    const params = {
      ...defaultParamsFor('WARDROBE', P),
      unit_num: '01',
      sections: [{
        width_mm: 1000,
        items: [{ id: 'd1', kind: 'drawer', index: 1, watch_insert: true, watch_finish: 'felt', watch_felt: 'red' }],
      }],
      width: 1000,
    };
    const r = computeCabinet(params, P);
    const line = (r.hardware || []).find((h) => h.role === 'watch_insert');
    const text = JSON.stringify(line || {});
    out.push({ gate: 'watch', live: /Wine red felt/.test(text), said: `watch insert line names "${(text.match(/Wine red felt[^"]*/) || ['(no wine)'])[0]}"` });
  }
  // freePanel (F13): the kit cuts ONE board, 800 x 400, banded all round.
  {
    const r = computeCabinet({ ...defaultParamsFor('FREE_PANEL', P), unit_num: '01' }, P);
    out.push({
      gate: 'freePanel',
      live: r.panels.length === 1 && r.panels[0].part === 'FREE-PANEL' && r.csvLines[0] === '01,FP,800,400,<>^v,2.40,0.320',
      said: `FREE_PANEL cuts ${r.csvLines.join(' ')}`,
    });
  }
  // wallUnit (F7): the new type cuts what WUD cuts.
  {
    const same = { width: 800, height: 720, depth: 400, mount_height: 1500, unit_num: '01' };
    const a = computeCabinet({ ...defaultParamsFor('WUD', P), ...same }, P);
    const b = computeCabinet({ ...defaultParamsFor('WARDROBE_WALL', P), ...same }, P);
    const boards = (r) => JSON.stringify(r.panels.map((p) => [p.id, p.box]));
    out.push({ gate: 'wallUnit', live: Boolean(UNIT_TYPES.WARDROBE_WALL) && boards(a) === boards(b), said: 'WARDROBE_WALL cuts the boards WUD cuts' });
  }
  return out;
}

// ─── THE REPORT ────────────────────────────────────────────────────────────

const base = JSON.parse(src('verify/t70/goldens-base.json'));
const head = dump();

process.stdout.write('─── T74 · THE ENGINE/LIB DELTAS, AND WHAT THEY REACH ───\n\n');
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
for (const l of live) process.stdout.write(`  ${l.live ? 'live' : 'DEAD'}  ${l.gate.padEnd(9)} ${l.said}\n`);
const allLive = live.every((l) => l.live);

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
  + ` · read-only files touched: ${readOnlyTouched.length} · every gate live: ${allLive}\n`,
);
const hash = createHash('sha256').update(JSON.stringify(head)).digest('hex').slice(0, 16);
process.stdout.write(`dump ${hash}\n`);
process.exit(
  moved === 0 && reachable === 0 && stray.length === 0 && unspent.length === 0
    && readOnlyTouched.length === 0 && allLive ? 0 : 1,
);
