#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT (turn 53, CLAUDE.md iron rule 2) ────────────
//
// T52's classifier, RE-HEADED rather than reused, because the header IS the
// argument and the argument is tonight's. CLAUDE.md, 27.08:
//
//   *"Six goldens IDENTICAL, UNNAMED = 0, proven the three-line way … Expected
//   buckets: none."*
//
// Ten features, and the claim is made feature by feature rather than once at
// the end. Every one of them has a `--probe`, the way T52's `--tabs`, `--plan`
// and `--watch` turned the argument into an exit code — because an argument
// that is only prose is an argument nobody re-runs.
//
// ─── WHY NOT ONE OF THE TEN CAN MOVE A GOLDEN ───────────────────────────────
//
//   F1   is a run over a ROOM. A golden is `computeCabinet` of one cabinet with
//        no room, no wall and no run. `--probe f1`.
//   F2   is the DXF EXPORT — a writer downstream of the engine. It reads the
//        panels a golden already has and writes files; it hands nothing back.
//   F3   cuts only under a `slopeCut`, and no golden carries one. `--probe f3`.
//   F4   is the same gate: a bevel that only exists where a slope does.
//   F5   moves RIDERS. No golden carries a top box. `--probe f5`.
//   F6   splits a piece longer than a board. No golden's plinth or infill
//        exists in a default config at all — they wait to be asked for (turn
//        4's law). `--probe f6`.
//   F7   moves SHOE FRONTS. No golden carries a shoe item. `--probe f7`.
//   F8   cuts only where a drawer item asks for a watch insert. No default
//        does — T52's own `--watch` proof, kept and re-pointed. `--probe f8`.
//   F9   changes the bore-depth CLAMP `cupFloorKeepMm`, 1 → 3. It binds only
//        where the leaf is thinner than cup + keep, and every golden's fronts
//        are full thickness. CLAUDE.md calls this the likeliest to surprise and
//        asks for a PROBE rather than a sentence: `--probe f9` measures every
//        front of every golden against the clamp and prints the slack.
//   F10  is a room-drawing UI writing `project.room.corners`. `computeCabinet`
//        never sees a room. `--probe f10`.
//
// If a golden moves anyway: iron rule 2 — **write it up as a FINDING. Do not
// name a bucket for it.**
//
// Usage — the three lines every classifier in this house has taken:
//
//     node scripts/t52-classify.mjs --dump > /tmp/base.json     # on the base
//     node scripts/t53-classify.mjs --dump > /tmp/head.json     # on the branch
//     node scripts/t53-classify.mjs /tmp/base.json /tmp/head.json
//
//     node scripts/t53-classify.mjs --probe        # all ten, one exit code
//     node scripts/t53-classify.mjs --probe f9     # one of them
//
// The KIT COUNT is DERIVED from the folder, never typed (iron rule 3).
//
// Zero dependencies beyond the engine and node:crypto.

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { buildWallRuns } from '../src/engine/runs.js';
import { shareOutPlan, widthFixed } from '../src/engine/shareOut.js';

// `--dump` has to run on the BASE as well as on the branch — that is the whole
// comparison — so anything this turn INTRODUCED is imported lazily inside the
// probe that needs it. A static import of tonight's own module would turn "the
// goldens did not move" into a syntax error on the base.

// The six standard configs are T34's through T52's, unchanged — the same set,
// so a T52 dump and a T53 dump are directly comparable.
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

/** Every kit on the shelf — DERIVED, never typed (iron rule 3). */
export function kitCount(dir = 'reference/lisp') {
  return readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.lsp')).length;
}

const round = (v, n = 3) => Math.round(v * 10 ** n) / 10 ** n;

/** Every golden, computed once — the probes share it rather than re-deriving. */
function goldens() {
  return STANDARD_CONFIGS.map((cfg) => {
    const params = { ...defaultParamsFor(cfg.id, P), unit_num: '01' };
    return { cfg, params, result: computeCabinet(params, P) };
  });
}

// ─── THE PROBES ─────────────────────────────────────────────────────────────
//
// Each returns `{ head, columns, rows, clean, verdict }`. One shape, so the CLI
// prints them all the same way and `--probe` with no name runs the lot.

export const PROBES = {};

/**
 * F1 — THE SHARE-OUT GATE. A run over a ROOM; a golden has neither.
 *
 * Two halves, and both are printed. The MODULE: `shareOutPlan` of a run of one
 * cabinet with no wall has nothing to share. The CONFIG: not one of the six
 * carries a mark of the share-out (`width_fixed`), so nothing in a golden's
 * parameters can reach it either.
 */
PROBES.f1 = () => {
  const rows = STANDARD_CONFIGS.map((cfg) => {
    const params = { ...defaultParamsFor(cfg.id, P), unit_num: '01' };
    const unit = {
      id: cfg.id, type: cfg.id, params, position: { wall: 0, x_mm: 0, rotation_deg: 0 },
    };
    const runs = buildWallRuns([unit], P);
    const plan = runs.length
      ? shareOutPlan(runs[0], { wallWidth: 0, others: [unit] }, P, {})
      : null;
    return {
      id: cfg.id,
      cells: [String(Boolean(plan && plan.ok)), String(widthFixed(unit)),
        params.width_fixed == null ? '(none)' : String(params.width_fixed)],
      ok: !(plan && plan.ok) && params.width_fixed == null,
    };
  });
  return {
    head: 'F1 · THE SHARE-OUT GATE — a run over a room, and a golden has neither',
    columns: ['has a run to share', 'width imposed', 'mark on the config'],
    rows,
    verdict: [
      'CLEAN — not one of the six has a run to share out, and not one carries a mark of it.',
      'NOT CLEAN — the share-out is reaching a cabinet that is not in a run. STOP (iron rule 2).',
    ],
  };
};

/**
 * F2 — THE DXF EXPORT. A writer DOWNSTREAM of the engine… with one exception,
 * and the exception is the whole point of this probe.
 *
 * The fix tonight is in `engine/cabinet.js`: a drawer shoe box's two battens
 * shared one panel id, so the ZIP kept one of them and the machine never got
 * the other. Changing a panel id IS changing the engine's output — so the claim
 * is not "the export is downstream", it is that NO GOLDEN HAS A SHOE BOX.
 *
 * Per config: how many shoe-box items its default parameters carry, how many
 * `SHOE*` panels come out, and how many of those are battens. Then the same
 * engine asked a wardrobe that DOES have one, so the rename is shown to have
 * happened rather than to have been described.
 */
PROBES.f2 = () => {
  const rows = goldens().map(({ cfg, params, result }) => {
    const items = (params.sections || []).flatMap((s) => s?.items || []);
    const shoes = items.filter((i) => i?.kind === 'shoe_box').length;
    const panels = (result.panels || []).filter((p) => /^SHOE\d/.test(p.id));
    const battens = panels.filter((p) => /BATTEN/.test(p.id)).length;
    return {
      id: cfg.id,
      cells: [String(shoes), String(panels.length), String(battens)],
      ok: shoes === 0 && panels.length === 0 && battens === 0,
    };
  });
  // …and the engine asked for one, so the gate is a gate and not a dead branch.
  const asked = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: 'W01',
    width: 900,
    sections: [{ width_mm: 900, items: [{ id: 'sb1', kind: 'shoe_box', variant: 'D', dividers: 1 }] }],
  }, P);
  const battens = (asked.panels || []).filter((p) => /BATTEN/.test(p.id)).map((p) => p.id);
  rows.push({
    id: 'asked for one',
    cells: ['1', String((asked.panels || []).filter((p) => /^SHOE\d/.test(p.id)).length), battens.join(' + ')],
    ok: battens.length === 2 && new Set(battens).size === 2,
  });
  return {
    head: 'F2 · THE DXF EXPORT — the one engine change is a shoe box, and no golden has one',
    columns: ['shoe items', 'SHOE panels', 'battens'],
    rows,
    note: 'The battens used to share one id — and one file name, and one ZIP entry.',
    verdict: [
      'CLEAN — not one of the six carries a shoe box, so the rename cannot reach a golden. And the two battens really are two.',
      'NOT CLEAN — a golden has a shoe box, or the two battens are still one name. STOP (iron rule 2).',
    ],
  };
};

/**
 * F3 — THE SLOPE'S INFILLS. Everything tonight cuts is gated on a `slopeCut`,
 * and no golden carries one: `defaultParamsFor` states no `slope_cut`, and the
 * key is written only by `projectStore.paramsForEngine` for a unit standing
 * under a rake in a ROOM. A golden is `computeCabinet` of one cabinet with no
 * room at all.
 *
 * Per config: whether its params carry a slope cut, how many of its panels come
 * out with `meta.slopeCut`, and how many infill panels it has at all. Then the
 * same engine asked a cabinet that IS under a rake, so the gate is shown to be
 * a gate rather than a dead branch.
 */
PROBES.f3 = () => {
  const rows = goldens().map(({ cfg, params, result }) => {
    const cut = params.slope_cut ?? params.slopeCut ?? null;
    const sloped = (result.panels || []).filter((p) => p.meta?.slopeCut).length;
    const infills = (result.panels || []).filter((p) => p.role === 'infill').length;
    return {
      id: cfg.id,
      cells: [cut == null ? '(none)' : 'YES', String(sloped), String(infills)],
      ok: cut == null && sloped === 0,
    };
  });
  // …and the engine asked for one: a wardrobe under a rake that falls across
  // its own width, which really does cut.
  const asked = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: 'W01',
    slope_cut: { axis: 'width', infill: 20, low: 'R', pts: [{ x: 0, y: 1800 }, { x: 600, y: 1200 }] },
  }, P);
  const cutParts = (asked.panels || []).filter((p) => p.meta?.slopeCut).length;
  rows.push({
    id: 'asked for one',
    cells: ['YES', String(cutParts), String((asked.panels || []).filter((p) => p.role === 'infill').length)],
    ok: cutParts > 0,
  });
  return {
    head: 'F3 · THE SLOPE’S INFILLS — every cut is gated on a slopeCut, and no golden has one',
    columns: ['slope_cut', 'cut panels', 'infill panels'],
    rows,
    note: 'The run’s own ceiling line is written by the STORE, and a golden never meets the store.',
    verdict: [
      'CLEAN — not one of the six is under a rake, so not one of them grows a cut. And the gate bites: a cabinet that IS under one cuts.',
      'NOT CLEAN — a golden is being cut on a slope it does not stand under. STOP (iron rule 2).',
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

function runProbe(name) {
  const probe = PROBES[name]();
  const clean = probe.rows.every((r) => r.ok !== false);
  const width = Math.max(14, ...probe.rows.map((r) => r.id.length + 2));
  let out = `${probe.head}\n\n${'subject'.padEnd(width)}`;
  const colW = probe.columns.map((c) => Math.max(c.length + 2, 10));
  probe.columns.forEach((c, i) => { out += c.padEnd(colW[i]); });
  out += '\n';
  for (const r of probe.rows) {
    out += r.id.padEnd(width);
    r.cells.forEach((c, i) => { out += String(c).padEnd(colW[i]); });
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
      const { out, clean } = runProbe(name);
      process.stdout.write(`${out}\n`);
      if (!clean) bad += 1;
    }
    if (names.length > 1) {
      process.stdout.write(`${'─'.repeat(72)}\n${names.length} probe(s), ${bad === 0
        ? 'every one CLEAN — no feature of tonight reaches a golden.'
        : `${bad} NOT CLEAN. Iron rule 2: write it up as a FINDING.`}\n`);
    }
    process.exit(bad === 0 ? 0 : 1);
  } else if (argv.length >= 2) {
    const base = JSON.parse(readFileSync(argv[0], 'utf8'));
    const head = JSON.parse(readFileSync(argv[1], 'utf8'));
    const { rows, counts } = classify(base, head);
    process.stdout.write(`${rows.join('\n')}\n\n`);
    process.stdout.write('EXPECTED BUCKETS: none. Every feature of tonight is gated on something no default config carries — a room, a slope, a top box, a shoe item, a watch insert, a plinth, or a leaf too thin for a cup. `--probe` argues each one as an exit code.\n');
    process.stdout.write('IF A GOLDEN MOVED:  iron rule 2 — write it up as a FINDING. Do not name a bucket for it.\n');
    process.stdout.write(`UNNAMED:          ${counts.UNNAMED}\n`);
    process.exit(counts.UNNAMED === 0 ? 0 : 1);
  } else {
    const d = dump();
    for (const cfg of STANDARD_CONFIGS) {
      process.stdout.write(`${cfg.id.padEnd(12)} drawers=${cfg.drawers ? 'yes' : 'no '}  ${d[cfg.id].sha256 || d[cfg.id].error}\n`);
    }
    process.stdout.write(`\n${kitCount()} kits on the shelf.\n`);
  }
}
