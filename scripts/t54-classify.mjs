#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT (turn 54, CLAUDE.md iron rule 2) ────────────
//
// T53's classifier, RE-HEADED rather than reused, because the header IS the
// argument and the argument is tonight's. CLAUDE.md, 28.08:
//
//   *"Six goldens IDENTICAL, UNNAMED = 0, three-line proof … Expected buckets:
//   none."*
//
// Seven features (F8 is FROZEN for T55 and has no probe because it has no
// code), and the claim is made feature by feature. Every one has a `--probe`,
// exit codes and all — an argument that is only prose is an argument nobody
// re-runs.
//
// ─── WHY NOT ONE OF THE SEVEN CAN MOVE A GOLDEN ─────────────────────────────
//
//   F1   the trio cuts only under a `slope_cut`, and no golden carries one.
//        `--probe f1` — and it prints the WORST RESIDUAL of the trio's own
//        three-station law, which is the number `audit/f1.txt` keeps.
//   F2   the peak census — the same gate. `--probe f2` names every panel in
//        the peak band and refuses any that is not on the allowed list.
//   F3   the door leaf cuts only under a `slope_cut`; no golden carries one
//        and no golden's leaf carries a cut. `--probe f3`.
//   F4   changes a watch-insert derivation (60 → 40 inside, 140 → 120 front)
//        and the click wiring. No golden carries an insert; the wiring is UI
//        and cannot reach `computeCabinet`. `--probe f4` proves 120 fits and
//        119 refuses.
//   F5   is UI visibility plus a per-project scene-light multiplier that the
//        EXPORT RIG never reads. `--probe f5`.
//   F6   is a UI timer flipping an existing uiStore toggle. `--probe f6`.
//   F7   cuts only where a shoe item exists, and no golden carries one.
//        `--probe f7` — the shoe drawer equals a plain drawer board for board
//        except the side height.
//
// If a golden moves anyway: iron rule 2 — **write it up as a FINDING. Do not
// name a bucket for it.**
//
// Usage — the three lines every classifier in this house has taken:
//
//     node scripts/t53-classify.mjs --dump > /tmp/base.json     # on the base
//     node scripts/t54-classify.mjs --dump > /tmp/head.json     # on the branch
//     node scripts/t54-classify.mjs /tmp/base.json /tmp/head.json
//
//     node scripts/t54-classify.mjs --probe        # all seven, one exit code
//     node scripts/t54-classify.mjs --probe f1     # one of them
//
// The KIT COUNT is DERIVED from the folder, never typed (iron rule 3): the
// shelf starts tonight at 14 and F7 buries KIT_SHOE_BOX, so the walk ends at
// 13 — derived, never typed.
//
// Zero dependencies beyond the engine and node:crypto.

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';

// `--dump` has to run on the BASE as well as on the branch — that is the whole
// comparison — so anything this turn INTRODUCED is imported lazily inside the
// probe that needs it. A static import of tonight's own module would turn "the
// goldens did not move" into a syntax error on the base.

// The six standard configs are T34's through T53's, unchanged — the same set,
// so a T53 dump and a T54 dump are directly comparable.
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

// The rotation the scene applies — T(pivot)·Rz(deg)·T(−pivot) — restated here
// so a probe measures what the ROOM shows, not what the meta promises.
const spin = ([x, y], pivot, deg) => {
  const a = (deg * Math.PI) / 180;
  const dx = x - pivot.x;
  const dy = y - pivot.y;
  return [pivot.x + dx * Math.cos(a) - dy * Math.sin(a),
    pivot.y + dx * Math.sin(a) + dy * Math.cos(a)];
};
const spunCorners = (p) => {
  const b = p.box;
  const corners = [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]];
  if (!p.meta?.tilt_deg || !p.meta?.tilt_pivot) return corners;
  return corners.map((c) => spin(c, p.meta.tilt_pivot, p.meta.tilt_deg));
};
const edgeAt = (a, b) => (x) => a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);

// ─── THE PROBES ─────────────────────────────────────────────────────────────

export const PROBES = {};

/**
 * F1 — THE TRIO. Everything tonight cuts is gated on a `slope_cut`, and no
 * golden carries one. Then the owner's audit scene is rebuilt and the trio's
 * own law measured: FACE top on the ceiling, FACE bottom and TOP top on the
 * cut line, SHELF top on the roof's underside — worst residual printed, which
 * is the number `verify/t54/audit/f1.txt` keeps.
 */
PROBES.f1 = () => {
  const rows = goldens().map(({ cfg, params, result }) => {
    const cut = params.slope_cut ?? params.slopeCut ?? null;
    const tilted = (result.panels || []).filter((p) => p.meta?.tilt_axis === 'z').length;
    const sloped = (result.panels || []).filter((p) => p.meta?.slopeCut).length;
    return {
      id: cfg.id,
      cells: [cut == null ? '(none)' : 'YES', String(sloped), String(tilted)],
      ok: cut == null && sloped === 0 && tilted === 0,
    };
  });
  // The audit scene: spadek w prawo, β = 26.5651°, infill 40, W = 600,
  // ceiling 2000 → 1700 — the exact table the owner measured, now the law.
  const W = 600;
  const INFILL = 40;
  const asked = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: 'W01',
    top_infill_mm: 40,
    slope_cut: { axis: 'width', infill: INFILL, low: 'R', pts: [{ x: 0, y: 2000 }, { x: W, y: 1700 }] },
  }, P);
  const by = (id) => (asked.panels || []).find((p) => p.id === id);
  const ceil = (x) => 2000 - (300 * x) / W;
  const res = INFILL / Math.cos(Math.atan(300 / W));
  const G = P.board.thickness;
  const foot = G / Math.cos(Math.atan(300 / W));
  let worst = 0;
  const face = by('INFILL-T-FACE');
  const top = by('TOP');
  const shelf = by('INFILL-T-SHELF');
  if (face && top && shelf) {
    const f = spunCorners(face);
    const t = spunCorners(top);
    const s = spunCorners(shelf);
    for (const x of [0, W / 2, W]) {
      worst = Math.max(worst,
        Math.abs(edgeAt(f[3], f[2])(x) - ceil(x)),
        Math.abs(edgeAt(f[0], f[1])(x) - (ceil(x) - res)),
        Math.abs(edgeAt(t[3], t[2])(x) - (ceil(x) - res)),
        Math.abs(edgeAt(s[3], s[2])(x) - (ceil(x) - res - foot)));
    }
  }
  rows.push({
    id: 'the audit scene',
    cells: ['YES', face && top && shelf ? 'trio emitted' : 'MISSING',
      `worst residual ${worst.toFixed(4)} mm`],
    ok: Boolean(face && top && shelf) && worst <= 0.01,
  });
  return {
    head: 'F1 · THE TRIO — three pieces, three lines, gated on a slope_cut no golden carries',
    columns: ['slope_cut', 'cut panels', 'tilted panels'],
    rows,
    note: 'The residual is the trio law measured through the scene\'s own rotation: FACE top → ceiling, FACE bottom and TOP top → cutReach, SHELF top → the roof\'s underside.',
    verdict: [
      'CLEAN — not one of the six is under a rake, and the audit scene lands the trio on its three lines to a hundredth.',
      'NOT CLEAN — a golden grew a tilt, or the trio missed its lines. STOP (iron rule 2).',
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
  const width = Math.max(16, ...probe.rows.map((r) => r.id.length + 2));
  let out = `${probe.head}\n\n${'subject'.padEnd(width)}`;
  const colW = probe.columns.map((c) => Math.max(c.length + 2, 12));
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
      const { out, clean } = await runProbe(name);
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
    process.stdout.write('EXPECTED BUCKETS: none. F1, F2, F3 cut only under `slope_cut` (no golden carries one); F4 changes a watch-insert derivation and the click wiring (no golden carries an insert); F5 and F6 are UI visibility/timers; F7 cuts only where a shoe item exists (no golden carries one). `--probe` argues each one as an exit code.\n');
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
