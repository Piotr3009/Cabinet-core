#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT FOR TURN 58b — AND FOR TURN 58 ─────────────
//
// CLAUDE.md, F4, verbatim:
//
//   *"t58 shipped without `t58-classify.mjs`. Pay it now: `scripts/t58b-
//   classify.mjs` carries the byte-identity contract for BOTH turns — goldens
//   hashed and asserted; named deltas for t58 (slope fixtures: phantom drills
//   gone; shoe fixtures: the insert; wall-infill fixtures: the top infill's
//   span) and for t58b (pane shelf strip; per-leaf J override); per-feature
//   `--probe` in the t55/t57 school; UNNAMED=0."*
//
// So this file answers for two nights, not one. The debt is named where a
// reader will find it: there is no `t56-classify.mjs` and no
// `t58-classify.mjs`; T58's engine work went in without one, and this is where
// it is argued.
//
// ─── THE FIVE NAMED DELTAS, AND WHY NONE OF THEM REACHES A GOLDEN ──────────
//
// A NAMED delta is one that is PROVED unable to reach a golden. A delta that
// DOES move a golden is never named — it becomes a FINDING. That is the iron
// rule, and it is the only rule this file exists to enforce.
//
// TURN 58:
//
//   (a) THE PHANTOM HINGE COLUMN. `hingedSidesOf` replaced a hard-coded table
//       that bored BOTH carcass sides for a two-door cabinet whatever the
//       leaves actually did. It differs from that table ONLY where a leaf has
//       been forced to one hand — `meta.hingeForced`, which T46/T55 set under
//       a SLOPE CUT and nowhere else. A golden carries no `slope_cut`, so the
//       new law and the old table answer identically there.
//
//   (b) THE SHOE INSERT. Born only inside a drawer whose item says
//       `variant: 'shoe'`, and refused in words on four further conditions. A
//       golden's drawers are ordinary drawers; `defaultParamsFor` names no
//       variant at all.
//
//   (c) THE TOP INFILL'S SPAN. `engine/runs.js runEnd` — a RUN law. It is
//       reached from the room's own arithmetic over a row of cabinets against
//       a wall. `computeCabinet` of one config knows no room, no run and no
//       wall, and never calls it.
//
// TURN 58b:
//
//   (d) THE PANE SHELF'S STRIP. The glass births one ordinary `kind: 'shelf'`
//       strip beside its aperture. The aperture exists only where a drawer
//       item says `watch_shelf_glass: true` AND a shelf stands over it. No
//       golden asks for a watch insert, let alone its glass. (`led_mm` and its
//       BOM line go with it — licensed — and they lived on the same record,
//       behind the same gate.)
//
//   (e) THE PER-LEAF J RUN. `front_jpull[panelId].jpull_run_mm` is an INPUT of
//       the design layer, like `front_handles` and the hinge rows before it.
//       It is read only after a HANDLE SYSTEM has been chosen, and only for a
//       leaf that names itself. A bare `computeCabinet` passes neither, so it
//       is `null ?? profile` on every golden — the same 500 as last night.
//
// And the features of tonight that touch no engine byte at all:
//
//   F1  the pane's material and the blind-recess floor — `src/3d/UnitView.jsx`
//       and `src/3d/panelSolid.js`. Pictures. Neither file is imported by
//       `src/engine/`, and `--probe f1` says so as an exit code.
//   F3's UI half — the deletion of the jpull numeric block and the one slider
//       — `src/components/`, `src/3d/` and `src/stores/`. A store setter that
//       nobody has called writes nothing.
//
// ─── TWO BASES, BECAUSE THIS FILE ANSWERS FOR TWO NIGHTS ───────────────────
//
// A comparison against `origin/main` alone would prove nothing about T58: its
// deltas are already IN that base. So the contract is run twice, and both
// comparisons are part of the claim:
//
//   6c50653  the last commit before PR #58 merged — T58's own base
//   c6a5969  origin/main with T58 merged        — T58b's base
//
//   git worktree add /tmp/base <commit>
//   cp scripts/t58b-classify.mjs /tmp/base/scripts/
//   (cd /tmp/base && node scripts/t58b-classify.mjs --dump > /tmp/base.json)
//   node scripts/t58b-classify.mjs --dump > /tmp/head.json
//   node scripts/t58b-classify.mjs /tmp/base.json /tmp/head.json
//
// Both answered UNNAMED: 0 on this branch — six IDENTICAL from before T58 was
// written to after T58b was, which is what "the goldens are byte-identical"
// has to mean when a turn is paying another turn's debt.
//
// Usage:
//   node scripts/t58b-classify.mjs                  the six goldens, hashed
//   node scripts/t58b-classify.mjs --dump           machine-readable, for the
//                                                   base/head comparison
//   node scripts/t58b-classify.mjs base.json head.json     the verdict
//   node scripts/t58b-classify.mjs --probe [name]   one feature, or all
//
// Run from the repository root — `kitCount` reads `reference/lisp` relatively.
//
// Zero dependencies.

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';

// ─── EVERYTHING THIS TURN ADDED IS IMPORTED LAZILY, AND THAT IS THE POINT ───
//
// `--dump` has to be runnable against THIS TURN'S BASE — a checkout of the
// merge that carried t58 — because a contract that can only be evaluated on
// one side of the diff is not a comparison. A top-level import of tonight's
// exports would throw there before a single cabinet was computed. So the
// probes that need them fetch them when they run, and the dump needs nothing
// that did not exist last night.
const ledStrips = () => import('../src/engine/ledStrips.js');
const watchDrawer = () => import('../src/engine/watchDrawer.js');
const runs = () => import('../src/engine/runs.js');

// The six standard configs are T34's through T57's, unchanged — the same set,
// so a T57 dump and a T58b dump are directly comparable.
export const STANDARD_CONFIGS = [
  { id: 'WARDROBE', drawers: false },
  { id: 'BUD', drawers: false },
  { id: 'WUD', drawers: false },
  { id: 'BUDR', drawers: true },
  { id: 'BUDR4', drawers: true },
  { id: 'PANTRY', drawers: true },
];

/** Key-sorted JSON, so two runs of the same engine serialise identically. */
export function canonical(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value === undefined ? null : value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
}

export function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

export function dump() {
  const out = {};
  for (const cfg of STANDARD_CONFIGS) {
    let result;
    try {
      result = computeCabinet({ ...defaultParamsFor(cfg.id, P), unit_num: '01' }, P);
    } catch (e) {
      out[cfg.id] = { error: e.message };
      continue;
    }
    const text = canonical(result);
    out[cfg.id] = { drawers: cfg.drawers, sha256: sha256(text), tree: JSON.parse(text) };
  }
  return out;
}

/** Every kit on the shelf — DERIVED, never typed. */
export function kitCount(dir = 'reference/lisp') {
  return readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.lsp')).length;
}

/** Every golden, computed once — the probes share it rather than re-deriving. */
function goldens() {
  return STANDARD_CONFIGS.map((cfg) => {
    const params = { ...defaultParamsFor(cfg.id, P), unit_num: '01' };
    return { cfg, params, result: computeCabinet(params, P) };
  });
}

const CEILING = { pts: [{ x: 0, y: 1300 }, { x: 520, y: 2200 }, { x: 1000, y: 2200 }], infill: 40 };
const src = (rel) => readFileSync(new URL(`../src/${rel}`, import.meta.url), 'utf8');

// ─── THE PROBES ─────────────────────────────────────────────────────────────

export const PROBES = {};

/**
 * T58 (a) — THE PHANTOM HINGE COLUMN.
 *
 * The delta is NAMED, so what has to be argued is its GATE. `hingedSidesOf`
 * differs from the table it replaced ONLY where a leaf carries
 * `meta.hingeForced`, which is set under a slope cut and nowhere else. So the
 * claim is: no golden carries a forced leaf, and therefore no golden's carcass
 * hinge columns can have moved. The seventh row builds the scene that DOES
 * force one, so the probe cannot pass by the feature being dead.
 */
PROBES.t58a = async () => {
  const { hingedSidesOf } = await import('../src/engine/doors.js');
  const rows = goldens().map(({ cfg, result }) => {
    const leaves = result.panels.filter((p) => p.role === 'front');
    const forced = leaves.filter((p) => p.meta?.hingeForced).length;
    return { id: cfg.id, cells: [leaves.length, forced, forced === 0 ? 'none' : 'FORCED'], ok: forced === 0 };
  });
  // …and the scene that DOES force a hand: a raked two-door wardrobe.
  const raked = computeCabinet({
    ...defaultParamsFor('WARDROBE', P), unit_num: '01', width: 1000, height: 2200, door_count: 2, slope_cut: CEILING,
  }, P);
  const rakedLeaves = raked.panels.filter((p) => p.role === 'front');
  const rakedForced = rakedLeaves.filter((p) => p.meta?.hingeForced).length;
  rows.push({
    id: 'WARDROBE+rake',
    cells: [rakedLeaves.length, rakedForced, rakedForced > 0 ? 'forced ✓' : 'DEAD'],
    ok: rakedForced > 0,
  });
  return {
    head: 'T58 (a) — the hinged-side law differs from the old table only under a rake',
    columns: ['leaves', 'forced', 'verdict'],
    rows,
    note: `\`hingedSidesOf\` is a real export (${typeof hingedSidesOf}), and it reads the leaves\n`
      + 'the cabinet actually built. Where none is forced it answers what the\n'
      + 'hard-coded table answered; a golden has no `slope_cut`, so none is.',
    verdict: [
      'T58 (a) reaches no golden. ✓',
      'T58 (a) REACHED A GOLDEN. Iron rule: write it up as a FINDING.',
    ],
  };
};

/**
 * T58 (b) — THE SHOE INSERT.
 *
 * Born only inside a drawer whose item says `variant: 'shoe'`. `defaultParamsFor`
 * names no variant, so the gate is shut on every golden; the seventh row opens
 * it and the insert appears.
 */
PROBES.t58b = () => {
  const rows = goldens().map(({ cfg, result }) => {
    const parts = result.panels.filter((p) => p.role === 'shoe_insert').length;
    const built = (result.assemblies?.shoeInserts || []).length;
    return { id: cfg.id, cells: [parts, built, parts + built === 0 ? 'none' : 'BORN'], ok: parts + built === 0 };
  });
  // The shoe drawer's own front height is DERIVED — its 80 mm side plus the
  // wardrobe's front-to-side delta — never typed, exactly as T58's own test
  // derives it.
  const shoeFront = P.wardrobe.drawers.shoeSideMm + P.wardrobe.drawers.frontToSideDelta;
  const shoes = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: 'W01',
    width: 900,
    sections: [{
      width_mm: 900,
      items: [
        { id: 'd1', kind: 'drawer', index: 1, height_mm: 200 },
        {
          id: 's2', kind: 'drawer', index: 2, height_mm: shoeFront, variant: 'shoe',
        },
      ],
    }],
  }, P);
  const shoeParts = shoes.panels.filter((p) => p.role === 'shoe_insert').length;
  rows.push({
    id: 'WARDROBE+shoe',
    cells: [shoeParts, (shoes.assemblies?.shoeInserts || []).length, shoeParts > 0 ? 'born ✓' : 'DEAD'],
    ok: shoeParts > 0,
  });
  return {
    head: 'T58 (b) — the shoe insert needs a shoe drawer, and no golden has one',
    columns: ['pieces', 'assemblies', 'verdict'],
    rows,
    note: 'Four further conditions gate it besides the variant — top of the stack,\n'
      + 'nothing over it, watches XOR shoes, and room for the ramp — and each is\n'
      + 'refused IN WORDS. None of them can fire where the variant never does.',
    verdict: [
      'T58 (b) reaches no golden. ✓',
      'T58 (b) REACHED A GOLDEN. Iron rule: write it up as a FINDING.',
    ],
  };
};

/**
 * T58 (c) — THE TOP INFILL'S SPAN.
 *
 * `runEnd` is a RUN law: it answers where a row of cabinets stops against a
 * wall. `computeCabinet` of ONE config is handed no room, no run and no wall,
 * and the whole module is never reached. This is the strongest gate of the
 * five and the cheapest to prove: the engine's own import graph.
 */
PROBES.t58c = async () => {
  const { runEnd } = await runs();
  const cabinet = src('engine/cabinet.js');
  // `cabinet.js` DOES import from `runs.js` — three leg-height helpers — so the
  // gate is not the module, it is the SYMBOL. `runEnd` is not among them, and
  // a function a file never names is a function it cannot call.
  const named = (cabinet.match(/import \{([^}]*)\} from '\.\/runs\.js';/) || [, ''])[1]
    .split(',').map((t) => t.trim()).filter(Boolean);
  const rows = goldens().map(({ cfg, result }) => {
    const infill = result.panels.filter((p) => /INFILL/i.test(p.part || '')).length;
    return { id: cfg.id, cells: [infill, infill === 0 ? 'none' : 'PRESENT'], ok: infill === 0 };
  });
  rows.push({
    id: 'cabinet.js imports',
    cells: [named.join(' ') || '(none)', named.includes('runEnd') ? 'CHECK' : 'no runEnd ✓'],
    ok: !named.includes('runEnd'),
  });
  return {
    head: 'T58 (c) — the run law is not on a golden\'s road at all',
    columns: ['infill pieces', 'verdict'],
    rows,
    note: `\`runEnd\` is a real export (${typeof runEnd}). A golden is ONE cabinet computed\n`
      + 'from its own params; a run end is arithmetic over a ROW against a wall,\n'
      + 'and nothing in `computeCabinet` asks for one.',
    verdict: [
      'T58 (c) reaches no golden. ✓',
      'T58 (c) REACHED A GOLDEN. Iron rule: write it up as a FINDING.',
    ],
  };
};

/**
 * T58b (d) — THE PANE SHELF'S STRIP.
 *
 * Two gates in series: a drawer item saying `watch_shelf_glass: true`, and a
 * shelf standing over that drawer. A golden asks for neither. The strongest
 * form of the claim is a sha against a sha: the same six cabinets, computed by
 * an engine that can birth the strip, hash to what they hashed before the
 * strip existed — which is what the base/head dump comparison says globally
 * and this says per feature.
 */
PROBES.f2 = async () => {
  const { stripsForUnit, lightingBomLines } = await ledStrips();
  const design = { lighting: { on: true, items: [] } };
  const rows = goldens().map(({ cfg, params, result }) => {
    const unit = { id: 'u', type: cfg.id, params };
    const born = (result.assemblies?.watchGlass || []).filter((p) => p.strip).length;
    const drawn = stripsForUnit({
      unit, result, design, profile: P,
    }).length;
    const bom = lightingBomLines({ entries: [{ unit, result }], design, profile: P }).length;
    return {
      id: cfg.id,
      cells: [born, drawn, bom, born + drawn + bom === 0 ? 'none' : 'BORN'],
      ok: born + drawn + bom === 0,
    };
  });
  // …and the cabinet that DOES ask for it.
  const { watchDrawerFixedHeight } = await watchDrawer();
  const glassParams = {
    ...defaultParamsFor('WARDROBE', P),
    unit_num: '01',
    width: 900,
    sections: [{
      width_mm: 900,
      items: [
        { id: 'd1', kind: 'drawer', index: 1, height_mm: 200 },
        {
          id: 'd2',
          kind: 'drawer',
          index: 2,
          height_mm: watchDrawerFixedHeight(P),
          watch_insert: true,
          watch_shelf_glass: true,
        },
      ],
    }],
  };
  const glass = computeCabinet(glassParams, P);
  const unit = { id: 'u', type: 'WARDROBE', params: glassParams };
  const bornStrips = (glass.assemblies?.watchGlass || []).filter((p) => p.strip).length;
  const drawnStrips = stripsForUnit({
    unit, result: glass, design, profile: P,
  }).length;
  rows.push({
    id: 'WARDROBE+pane',
    cells: [
      bornStrips,
      drawnStrips,
      lightingBomLines({ entries: [{ unit, result: glass }], design, profile: P }).length,
      bornStrips === 1 && drawnStrips === 1 ? 'born ✓' : 'DEAD',
    ],
    ok: bornStrips === 1 && drawnStrips === 1,
  });
  return {
    head: 'T58b (d) — the pane\'s strip needs a pane, and no golden has one',
    columns: ['born', 'drawn', 'bom lines', 'verdict'],
    rows,
    note: 'The strip is born beside the aperture and carries NO `ref`, so\n'
      + '`lib/ledGroove.js` can find no panel for it and cuts nothing: the T53\n'
      + 'ring drilled nothing either, and this module\'s rule 3 stands.\n'
      + '`led_mm` and its BOM line went with it — same record, same gate.',
    verdict: [
      'T58b (d) reaches no golden. ✓',
      'T58b (d) REACHED A GOLDEN. Iron rule: write it up as a FINDING.',
    ],
  };
};

/**
 * T58b (e) — THE PER-LEAF J RUN.
 *
 * A sha against a sha. The same six cabinets, computed with the override map
 * absent and with it present-but-empty, and again with every leaf's own run
 * named. The first pair must be identical (an input nobody passes cannot move
 * a byte); the third must be identical TOO, because a golden chooses no handle
 * system and `resolveHandle` never reaches the J at all.
 */
PROBES.f3 = () => {
  const rows = STANDARD_CONFIGS.map((cfg) => {
    const params = { ...defaultParamsFor(cfg.id, P), unit_num: '01' };
    const bare = sha256(canonical(computeCabinet(params, P)));
    const empty = sha256(canonical(computeCabinet({ ...params, front_jpull: {} }, P)));
    const named = sha256(canonical(computeCabinet({
      ...params,
      front_jpull: Object.fromEntries(
        computeCabinet(params, P).panels
          .filter((p) => p.role === 'front')
          .map((p) => [p.id, { jpull_run_mm: 1200 }]),
      ),
    }, P)));
    const same = bare === empty && bare === named;
    return {
      id: cfg.id,
      cells: [bare.slice(0, 10), empty.slice(0, 10), named.slice(0, 10), same ? 'same' : 'MOVED'],
      ok: same,
    };
  });
  // …and the cabinet that DOES read it: one that has chosen the J-pull system.
  const jp = { ...defaultParamsFor('WARDROBE', P), unit_num: '01', width: 1000, height: 2200, door_count: 2, project_handle: { type: 'jpull' } };
  const plain = computeCabinet(jp, P);
  const leaf = plain.panels.find((p) => p.role === 'front' && p.meta?.jpull?.run);
  const moved = leaf
    ? computeCabinet({ ...jp, front_jpull: { [leaf.id]: { jpull_run_mm: 1200 } } }, P)
      .panels.find((p) => p.id === leaf.id)
    : null;
  const before = leaf ? leaf.meta.jpull.run.to - leaf.meta.jpull.run.from : 0;
  const after = moved ? moved.meta.jpull.run.to - moved.meta.jpull.run.from : 0;
  rows.push({
    id: 'WARDROBE+jpull',
    cells: [`${before} mm`, `${after} mm`, '—', after === 1200 && before !== after ? 'reads ✓' : 'DEAD'],
    ok: after === 1200 && before !== after,
  });
  return {
    head: 'T58b (e) — the per-leaf J run is an input no golden passes, and no golden could read',
    columns: ['bare', 'empty map', 'every leaf', 'verdict'],
    rows,
    note: 'Two independent gates, and either alone would do: a golden passes no\n'
      + '`front_jpull`, AND a golden chooses no handle system, so `resolveHandle`\n'
      + 'returns before the J is reached. The third column names a run for every\n'
      + 'front of every golden and the sha still does not move.',
    verdict: [
      'T58b (e) reaches no golden. ✓',
      'T58b (e) REACHED A GOLDEN. Iron rule: write it up as a FINDING.',
    ],
  };
};

/**
 * T58b F1 — THE PANE'S MATERIAL AND THE LID.
 *
 * Not a named delta: a feature that touches no engine byte cannot have one.
 * The claim is the import graph — `src/engine/` reaches nothing in `src/3d/` —
 * plus the two facts the frames rest on, read out of the source so a later
 * turn cannot quietly put the transmission path back.
 */
PROBES.f1 = () => {
  const engineDir = new URL('../src/engine/', import.meta.url);
  const offenders = readdirSync(engineDir)
    .filter((f) => f.endsWith('.js'))
    .filter((f) => /from '\.\.\/(3d|components|pages|stores)\//.test(readFileSync(new URL(f, engineDir), 'utf8')));
  const view = src('3d/UnitView.jsx');
  const solid = src('3d/panelSolid.js');
  const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const rows = [
    {
      id: 'engine → 3d/ui',
      cells: [offenders.length, offenders.length === 0 ? 'never ✓' : offenders.join(' ')],
      ok: offenders.length === 0,
    },
    {
      id: 'transmission',
      cells: [(strip(view).match(/transmission=/g) || []).length, 'must be 0'],
      ok: !/transmission=/.test(strip(view)),
    },
    {
      id: 'alpha glass',
      cells: [/const PANE_ALPHA_GLASS = \{/.test(view) ? 'declared' : 'MISSING', 'one law'],
      ok: /const PANE_ALPHA_GLASS = \{/.test(view),
    },
    {
      id: 'no lid on a hole',
      cells: [/enclosesFeature\(f, o\)/.test(solid) ? 'punched' : 'MISSING', 'blind floor'],
      ok: /enclosesFeature\(f, o\)/.test(solid),
    },
  ];
  return {
    // The SOURCE flavour of the school (t54/t55 use it too): a feature that
    // touches no engine file has no per-golden fingerprint to look for, so the
    // claim is the import graph and the source, not six cabinets.
    kind: 'source',
    head: 'T58b F1 — the pane is paint, and paint cannot move a cut',
    columns: ['reading', 'want'],
    rows,
    note: 'Both files changed by F1 live in `src/3d`. No module in `src/engine`\n'
      + 'imports from `src/3d`, `src/components`, `src/pages` or `src/stores`, so\n'
      + 'no byte of a cut list can depend on either of them.',
    verdict: [
      'T58b F1 reaches no golden. ✓',
      'T58b F1 REACHED A GOLDEN. Iron rule: write it up as a FINDING.',
    ],
  };
};

// ─── THE COMPARISON ─────────────────────────────────────────────────────────

/** Compare two dumps, config by config. */
export function classify(base, head) {
  const rows = [];
  const counts = { IDENTICAL: 0, UNNAMED: 0 };
  for (const cfg of STANDARD_CONFIGS) {
    const b = base[cfg.id];
    const h = head[cfg.id];
    const same = b?.sha256 && b.sha256 === h?.sha256;
    if (same) counts.IDENTICAL += 1;
    else counts.UNNAMED += 1;
    rows.push(`${cfg.id.padEnd(12)}${same ? 'IDENTICAL' : 'UNNAMED  '}  ${h?.sha256 || h?.error || '(missing)'}`);
  }
  return { rows, counts };
}

async function runProbe(name) {
  const probe = await PROBES[name]();
  const clean = probe.rows.every((r) => r.ok !== false);
  const width = Math.max(20, ...probe.rows.map((r) => r.id.length + 2));
  let out = `${probe.head}\n\n${'subject'.padEnd(width)}`;
  // Wide enough for the widest CELL as well as the header: a sha slice that
  // exactly fills its column runs into the next one, which is how t57's own
  // `--probe f4` printed `f49a8c107dd6f49a8c107dd6same`.
  const colW = probe.columns.map((c, i) => Math.max(
    c.length + 2,
    14,
    ...probe.rows.map((r) => String(r.cells[i] ?? '').length + 2),
  ));
  probe.columns.forEach((c, i) => { out += c.padEnd(colW[i]); });
  out += '\n';
  for (const r of probe.rows) {
    out += r.id.padEnd(width);
    r.cells.forEach((c, i) => { out += String(c).padEnd(colW[i] || 14); });
    out += `${r.ok === false ? '  ← ' : ''}\n`;
  }
  if (probe.note) out += `\n${probe.note}\n`;
  out += `\n${clean ? probe.verdict[0] : probe.verdict[1]}\n`;
  return { out, clean };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const probeAt = argv.indexOf('--probe');
  if (argv.includes('--dump')) {
    process.stdout.write(`${JSON.stringify(dump())}\n`);
  } else if (probeAt >= 0) {
    const only = argv[probeAt + 1] && !argv[probeAt + 1].startsWith('--')
      ? argv[probeAt + 1].toLowerCase() : null;
    const names = only ? [only] : Object.keys(PROBES);
    if (only && !PROBES[only]) {
      process.stdout.write(`no probe named ${only} — have [${Object.keys(PROBES).join(', ')}]\n`);
      process.exit(2);
    }
    let bad = 0;
    for (const name of names) {
      // eslint-disable-next-line no-await-in-loop
      const { out, clean } = await runProbe(name);
      process.stdout.write(`${out}\n`);
      if (!clean) bad += 1;
    }
    if (names.length > 1) {
      process.stdout.write(`${'─'.repeat(72)}\n${names.length} probe(s), ${bad === 0
        ? 'every one CLEAN — no feature of these two turns reaches a golden.'
        : `${bad} NOT CLEAN. Iron rule: write it up as a FINDING.`}\n`);
    }
    process.exit(bad === 0 ? 0 : 1);
  } else if (argv.length === 2) {
    const base = JSON.parse(readFileSync(argv[0], 'utf8'));
    const head = JSON.parse(readFileSync(argv[1], 'utf8'));
    const { rows, counts } = classify(base, head);
    process.stdout.write(`${rows.join('\n')}\n\n`);
    process.stdout.write('EXPECTED BUCKETS: none. T58 (a) acts only under a `slope_cut`; (b) only\n'
      + 'inside a `variant: \'shoe\'` drawer; (c) only over a ROW against a wall, which\n'
      + '`computeCabinet` never builds. T58b (d) acts only where a drawer asks for\n'
      + '`watch_shelf_glass` AND a shelf stands over it; (e) only where a handle system\n'
      + 'has been chosen AND a leaf names its own run. F1 touches no engine file.\n'
      + 'The five NAMED deltas are argued in this file\'s header; `--probe` argues each\n'
      + 'feature as an exit code.\n');
    process.stdout.write('IF A GOLDEN MOVED:  iron rule — write it up as a FINDING. Do not name a bucket for it.\n');
    process.stdout.write(`UNNAMED:          ${counts.UNNAMED}\n`);
    process.exit(counts.UNNAMED === 0 ? 0 : 1);
  } else {
    const d = dump();
    for (const cfg of STANDARD_CONFIGS) {
      const row = d[cfg.id];
      process.stdout.write(`${cfg.id.padEnd(12)}drawers=${cfg.drawers ? 'yes' : 'no '}  ${row.sha256 || row.error}\n`);
    }
    process.stdout.write(`\n${kitCount()} kits on the shelf.\n`);
  }
}
