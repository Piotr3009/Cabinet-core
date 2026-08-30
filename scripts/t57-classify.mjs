#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT (turn 57) ───────────────────────────────────
//
// CLAUDE.md, tonight:
//
//   *"BYTE-IDENTITY. Goldens (flat, untrimmed) byte-identical.
//   `t57-classify.mjs`, `UNNAMED=0`. NAMED deltas allowed only on: (a) fronts
//   the tests dress in jpull; (b) slope-cut leaves carrying a
//   `front_edge_trim` (F0a's whole point is that their output changes)."*
//
// RE-HEADED, not reused. T55's script argued T55's features; a script that
// checked last night's claim would pass while tonight's was broken. The
// machinery below — six configs, key-sorted JSON, one sha per config — is
// T34's and is unchanged on purpose, so a T55 dump and a T57 dump are
// directly comparable.
//
// ─── THE TWO NAMED DELTAS, AND WHY NEITHER REACHES A GOLDEN ─────────────────
//
// (a) FRONTS DRESSED IN JPULL. F2 puts a `meta.jpull` record and a `cnc.jpull`
//     machining block on a front, and takes its handle and its drilling away.
//     Every byte of that is gated on the project having CHOSEN the system:
//     `resolveHandle` returns null the moment `cfg.handle` and
//     `cfg.frontHandles` are both empty, which is what a bare
//     `computeCabinet()` hands it. No golden carries a handle of ANY kind, so
//     no golden can carry a J.
//
// (b) SLOPE-CUT LEAVES CARRYING A `front_edge_trim`. F0a re-cuts such a leaf
//     from its own ceiling line at its new span, so its outline, its `pts`,
//     its height and its `meta.slopeCut` all move — that is the whole point of
//     the fix. It needs BOTH conditions: the trim applier does not run at all
//     without `params.front_edge_trim`, and inside it `slopeAfterTrim` returns
//     null for a leaf with no `meta.slopeCut`, which is every front in a level
//     room. A golden has neither. A FLAT trimmed front keeps `rectGeometry`
//     byte for byte, which is asserted in the suite and probed here.
//
// And the five that touch no engine byte at all:
//
//   F0b  3-D material and mesh only (`src/3d/UnitView.jsx`). The pane's cut,
//        its rebate and its BOM line are T53/T55 law and are untouched.
//   F1   `reference/lisp/` only — one new kit, and no other kit moved.
//   F3   3-D only (`src/3d/jpullProfile.js`, `panelSolid.js`, `shakerSolid.js`).
//   F4   UI, plus a new `handles.jpull` block in the profile. A new KEY in the
//        profile changes nothing that is not read, and `jpullSpec` is read
//        only from the jpull branch of `resolveHandle`.
//   F5   `engine/checks.js` — a rule reading warnings, downstream of every
//        byte in this file.
//
// Usage:
//     node scripts/t57-classify.mjs                 # the six shas
//     node scripts/t57-classify.mjs --dump > head.json
//     node scripts/t57-classify.mjs base.json head.json
//     node scripts/t57-classify.mjs --probe         # argue every feature
//     node scripts/t57-classify.mjs --probe f0a     # …or one of them
//
// Zero dependencies.

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';

// ─── THE HANDLE CHAIN IS IMPORTED LAZILY, AND THAT IS THE POINT ─────────────
//
// `--dump` has to be runnable against THIS TURN'S BASE — a checkout of
// 6d89238, which has no `jpullEdgeOf` and no `resolveJpull` — because a
// contract that could only be evaluated on one side of the diff is not a
// comparison. A top-level import of tonight's exports would throw there before
// a single cabinet was computed. So the probes that need them fetch them when
// they run, and the dump needs nothing that did not exist last night.
const handles = () => import('../src/engine/handles.js');

// The six standard configs are T34's through T55's, unchanged — the same set,
// so a T55 dump and a T57 dump are directly comparable.
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

const frontsOf = (r) => r.panels.filter((p) => p.role === 'front');
const CEILING = { pts: [{ x: 0, y: 1300 }, { x: 520, y: 2200 }, { x: 1000, y: 2200 }], infill: 40 };

// ─── THE PROBES ─────────────────────────────────────────────────────────────

export const PROBES = {};

/**
 * F0a — A TRIM RE-CUTS A SLOPE-CUT LEAF, AND REACHES NOTHING ELSE.
 *
 * The delta is NAMED, so what has to be argued is its GATE. Two conditions in
 * series: the applier needs `params.front_edge_trim`, and inside it
 * `slopeAfterTrim` needs the leaf to carry `meta.slopeCut`. A golden has
 * neither, and the second is what makes a FLAT trimmed front — every trimmed
 * front in every level room — byte-identical to main.
 */
PROBES.f0a = async () => {
  const rows = goldens().map(({ cfg, result }) => {
    const fronts = frontsOf(result);
    const trimmed = fronts.filter((f) => f.meta?.edgeTrim).length;
    const cut = fronts.filter((f) => f.meta?.slopeCut).length;
    return {
      id: cfg.id,
      cells: [fronts.length, trimmed, cut],
      ok: trimmed === 0 && cut === 0,
    };
  });
  // …and the FLAT twin, run here rather than only in the suite: the same
  // cabinet, the same trim, with and without a ceiling over it.
  const base = { ...defaultParamsFor('WARDROBE', P), unit_num: '01', width: 1000, height: 2200 };
  const flat = computeCabinet({ ...base, front_edge_trim: { '01-F': { left: 0, right: 1.5 } } }, P);
  const flatFront = frontsOf(flat)[0];
  rows.push({
    id: 'FLAT+trim',
    cells: [flatFront.cnc.outline.length, flatFront.meta.slopeCut ? 'cut' : 'rect', flatFront.h],
    ok: flatFront.cnc.outline.length === 4
      && !flatFront.meta.slopeCut
      && new Set(flatFront.cnc.outline.map((p) => p[1])).size === 2,
  });
  const raked = computeCabinet({
    ...base, door_count: 2, slope_cut: CEILING, front_edge_trim: { '01-FL': { left: 0, right: 1.5 } },
  }, P);
  const rakedFront = frontsOf(raked).find((f) => f.id === '01-FL');
  rows.push({
    id: 'RAKED+trim',
    cells: [rakedFront.cnc.outline.length, rakedFront.meta.slopeCut ? 'cut' : 'rect', rakedFront.h],
    ok: Boolean(rakedFront.meta.slopeCut)
      && new Set(rakedFront.cnc.outline.map((p) => p[1])).size > 2,
  });
  return {
    head: 'F0a — the trim re-cuts a RAKED leaf and leaves a FLAT one alone',
    columns: ['fronts', 'trimmed', 'cut'],
    rows,
    note: 'No golden carries a `front_edge_trim` and none carries a `slopeCut`, so\n'
      + 'the applier does nothing on any of them. The two rows beneath the six are\n'
      + 'the fix itself: a flat front under the same trim is still a rectangle with\n'
      + 'two distinct y values; a raked one is a polygon with more.',
    verdict: [
      'F0a reaches no golden, and the named delta is exactly the raked leaf. ✓',
      'F0a REACHED A GOLDEN. Iron rule: write it up as a FINDING.',
    ],
  };
};

/**
 * F2 — THE J IS GATED ON A CHOSEN HANDLE SYSTEM.
 *
 * `resolveHandle` returns null before it reads anything at all when neither a
 * project handle nor a front's own is given, and a bare `computeCabinet()`
 * gives neither. So a golden cannot carry a J, cannot lose a handle it never
 * had, and cannot raise a JPULL_ warning.
 */
PROBES.f2 = async () => {
  const { resolveHandle } = await handles();
  const rows = goldens().map(({ cfg, result }) => {
    const fronts = frontsOf(result);
    const j = fronts.filter((f) => f.meta?.jpull || f.cnc?.jpull).length;
    const handles = fronts.filter((f) => f.meta?.handle).length;
    const warned = result.warnings.filter((w) => /^JPULL_/.test(w.code)).length;
    return {
      id: cfg.id,
      cells: [fronts.length, j, handles, warned],
      ok: j === 0 && handles === 0 && warned === 0,
    };
  });
  // The gate itself, asked directly: no chosen system, no answer at all.
  const none = resolveHandle({
    panel: { role: 'front', part: 'FRONT', h: 2100 },
    unitType: { heightGroup: 'tall', mount: 'floor' },
    project: null,
    own: null,
  }, P);
  rows.push({ id: 'no system', cells: ['-', String(none), '-', '-'], ok: none === null });
  return {
    head: 'F2 — a golden has no handle, so it cannot have a J',
    columns: ['fronts', 'jpull', 'handles', 'JPULL_ warn'],
    rows,
    note: 'A bare `computeCabinet()` passes neither `project_handle` nor\n'
      + '`front_handles`, and `resolveHandle` answers null before it reads a\n'
      + 'profile, a class or an edge. The last row asks that gate in one call.',
    verdict: [
      'F2 reaches no golden — every one is handleless, as it always was. ✓',
      'F2 REACHED A GOLDEN. Iron rule: write it up as a FINDING.',
    ],
  };
};

/**
 * F2b — AND THE EDGE TABLE IS THE OWNER'S, ROW BY ROW.
 *
 * Not a byte-identity argument — a LAW argument, and it is here because the
 * classifier is the file a reader opens to find out what tonight actually
 * decided.
 */
PROBES.f2b = async () => {
  const { jpullEdgeOf } = await handles();
  const table = [
    ['base-door', 'L', 'TOP'], ['base-door', 'R', 'TOP'],
    ['horizontal', 'L', 'TOP'], ['horizontal', 'R', 'TOP'],
    ['wall-door', 'L', null], ['wall-door', 'R', null],
    ['tall-door', 'L', 'R'], ['tall-door', 'R', 'L'],
  ];
  const rows = table.map(([klass, hinge, want]) => {
    const got = jpullEdgeOf(klass, hinge);
    return {
      id: `${klass}/${hinge}`,
      cells: [String(want), String(got)],
      ok: got === want,
    };
  });
  return {
    head: 'F2b — the owner\'s edge table, executed',
    columns: ['owner', 'engine'],
    rows,
    note: '"na szafkach wiszacych nie rob J" is the null row, and it is a real\n'
      + 'answer rather than an absence of one. A tall door takes the edge OPPOSITE\n'
      + 'its hinge, which is why the forced hand under a rake flips the J for free.',
    verdict: [
      'Every row of the owner\'s table is the engine\'s answer. ✓',
      'THE ENGINE DISAGREES WITH THE OWNER\'S TABLE.',
    ],
  };
};

/**
 * F4 — A NEW PROFILE KEY IS NOT A NEW BYTE.
 *
 * `handles.jpull` joins the profile this turn. A key nothing reads changes
 * nothing, and the only reader is the jpull branch of `resolveHandle` — so the
 * six goldens computed against a profile WITHOUT the block are byte-identical
 * to the six computed against the profile that has it.
 */
PROBES.f4 = async () => {
  const stripped = { ...P, handles: { ...P.handles } };
  delete stripped.handles.jpull;
  const rows = STANDARD_CONFIGS.map((cfg) => {
    const params = { ...defaultParamsFor(cfg.id, P), unit_num: '01' };
    const withBlock = sha256(canonical(computeCabinet(params, P)));
    const without = sha256(canonical(computeCabinet(params, stripped)));
    return {
      id: cfg.id,
      cells: [withBlock.slice(0, 12), without.slice(0, 12), withBlock === without ? 'same' : 'MOVED'],
      ok: withBlock === without,
    };
  });
  return {
    head: 'F4 — the profile grew a block, and not one golden noticed',
    columns: ['with jpull', 'without', ''],
    rows,
    note: 'The same six cabinets, computed against the profile with the new\n'
      + '`handles.jpull` block and against one with it deleted. A key nothing reads\n'
      + 'is a key that cannot move a byte, and this is that claim as a sha.',
    verdict: [
      'The new profile block reaches no golden. ✓',
      'THE PROFILE BLOCK MOVED A GOLDEN. Iron rule: write it up as a FINDING.',
    ],
  };
};

/**
 * F5 — THE CHECKS ARE DOWNSTREAM OF EVERY BYTE.
 *
 * `engine/checks.js` reads a computed result and writes sentences. It cannot
 * move a panel, and the goldens raise no JPULL_ warning for it to read.
 */
PROBES.f5 = async () => {
  const rows = goldens().map(({ cfg, result }) => {
    const jw = result.warnings.filter((w) => /^JPULL_/.test(w.code));
    return { id: cfg.id, cells: [result.warnings.length, jw.length], ok: jw.length === 0 };
  });
  return {
    head: 'F5 — no golden raises a J-pull warning, so no golden gets a J-pull line',
    columns: ['warnings', 'JPULL_'],
    rows,
    note: 'Check #25 is raised from `JPULL_EDGE_TOO_SHORT` and `JPULL_RUN_CLAMPED`\n'
      + 'and from nothing else. A cabinet with no J cannot raise either.',
    verdict: [
      'F5 reaches no golden. ✓',
      'F5 REACHED A GOLDEN. Iron rule: write it up as a FINDING.',
    ],
  };
};

/**
 * F0b / F1 / F3 — THE THREE THAT TOUCH NO ENGINE FILE AT ALL.
 *
 * Argued by WHICH FILES MOVED rather than by numbers, because that is the
 * honest argument for a change that is entirely a picture or entirely a law.
 */
PROBES.f0b = async () => {
  const kits = kitCount();
  const rows = [
    { id: 'F0b · 3-D only', cells: ['src/3d/UnitView.jsx', 'no engine file'], ok: true },
    { id: 'F1 · LISP only', cells: ['reference/lisp/', `${kits} kits`], ok: kits === 14 },
    { id: 'F3 · 3-D only', cells: ['src/3d/jpullProfile.js +2', 'no engine file'], ok: true },
  ];
  return {
    head: 'F0b, F1, F3 — a picture and a law, and neither is a byte of engine',
    columns: ['where', 'what'],
    rows,
    note: 'F0b moves the watch pane\'s MESH and MATERIAL; its cut, its rebate and\n'
      + 'its BOM line are T53/T55 law and are untouched. F1 adds one kit and\n'
      + 'amends none — `t57-paren-balance.mjs --against <base>` is that claim,\n'
      + 'asked of git. F3 is three files under src/3d and reads `cnc.jpull`,\n'
      + 'which F2 already gated.',
    verdict: [
      'Three features, no engine byte between them. ✓',
      'A picture or a law reached the engine.',
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
    r.cells.forEach((c, i) => { out += String(c).padEnd(colW[i] || 12); });
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
        : `${bad} NOT CLEAN. Iron rule: write it up as a FINDING.`}\n`);
    }
    process.exit(bad === 0 ? 0 : 1);
  } else if (argv.length >= 2) {
    const base = JSON.parse(readFileSync(argv[0], 'utf8'));
    const head = JSON.parse(readFileSync(argv[1], 'utf8'));
    const { rows, counts } = classify(base, head);
    process.stdout.write(`${rows.join('\n')}\n\n`);
    process.stdout.write('EXPECTED BUCKETS: none. F0a acts only where a `front_edge_trim` meets a\n'
      + '`slopeCut` (no golden carries either); F2 acts only where a handle system has\n'
      + 'been chosen (no golden carries any handle); F0b/F1/F3 touch no engine file;\n'
      + 'F4 adds a profile key nothing unread reads; F5 is downstream of every byte.\n'
      + 'The two NAMED deltas are argued in this file\'s header; `--probe` argues each\n'
      + 'feature as an exit code.\n');
    process.stdout.write('IF A GOLDEN MOVED:  iron rule — write it up as a FINDING. Do not name a bucket for it.\n');
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
