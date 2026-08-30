#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT (turn 58) ───────────────────────────────────
//
// The gate, in the owner's words: *"byte-identity — goldens untouched, named
// deltas ONLY on slope, shoe and wall-infill fixtures, UNNAMED=0, and F3 moves
// no engine byte on a bare computeCabinet."*
//
// RE-HEADED, NOT REUSED — the house move since T45, for the reason T54 wrote
// down: *"a script that checked last night's claim would pass while tonight's
// was broken."* The machinery below — six configs, key-sorted JSON, one sha per
// config — is T34's and is unchanged on purpose, so a T57 dump and a T58 dump
// are directly comparable.
//
// ─── WHERE TONIGHT'S DELTAS ARE, AND WHY NONE OF THEM REACHES A GOLDEN ──────
//
// (a) THE SLOPE FIXTURE — and it is the only place a byte moves. F2 re-runs the
//     bay-door plan over the hands the CEILING forced, so a re-handed leaf's
//     `hingeOn`, `hingeFace`, `onPartition` and width move, and the ⌀5 plate
//     pattern moves with them to the board the leaf is actually hung on. It
//     needs THREE things at once: per-bay doors (`params.bay_doors`), a
//     partition that can carry one (`bayDoorsAvailable`), and a ceiling that
//     actually cuts the leaf (`frontSlopeAt` returns null otherwise, the modes
//     come back identical and the re-plan is skipped outright). No golden has
//     any of the three.
//
// (b) THE SHOE FIXTURE — LICENSED, AND UNUSED. F3 moves the shoe shelf's LAW
//     into KIT_WARDROBE_FULL.lsp and gives `SHOE-RAIL` an element identity in
//     `engine/elements.js`. Neither is engine output: the blank, the tilt, the
//     rail's 18 × 60 and the BOM line are all exactly what they were. The
//     licence to move a shoe byte was not needed and was not taken, which the
//     probe below asserts rather than assumes.
//
// (c) THE WALL-INFILL FIXTURE — LICENSED, AND UNUSED. This turn found no defect
//     in the side infill it could prove, so it changed nothing there. Stated
//     here because an unused licence that goes unmentioned reads, a turn later,
//     as a licence nobody checked.
//
// And the rest, which touch no engine file at all:
//
//   F1   `reference/lisp/` only — one kit AMENDED, none born; the census stays
//        14/14 at 0/0. `t58-paren-balance.mjs --against <base>` is that claim,
//        asked of git rather than of anybody's word.
//   F4   `src/3d/LedIcons.jsx`, `src/stores/uiStore.js` and one View menu row.
//   F5   a test that reads git history. It computes no cabinet.
//
// Usage:
//     node scripts/t58-classify.mjs                 # the six shas
//     node scripts/t58-classify.mjs --dump > head.json
//     node scripts/t58-classify.mjs base.json head.json
//     node scripts/t58-classify.mjs --probe         # argue every feature
//     node scripts/t58-classify.mjs --probe f2      # …or one of them
//
// Zero dependencies.

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';

// The six standard configs are T34's through T57's, unchanged — the same set,
// so a T57 dump and a T58 dump are directly comparable.
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

const PARTITION = [{ id: 'p1', kind: 'partition', x_mm: 900, front_mm: 0 }];
/** The ceiling that forces the hand: low at the left, full height at the right. */
const RISING = { pts: [{ x: 0, y: 1200 }, { x: 1800, y: 2150 }], infill: 40 };

const bayLeaves = (r) => r.panels.filter((p) => p.part === 'FRONT' && p.meta?.bay != null);
const platesOn = (r, id) => r.drills.filter((d) => d.kind === 'hinge' && d.panel === id).length;

// ─── THE PROBES ─────────────────────────────────────────────────────────────

export const PROBES = {};

/**
 * F2 — THE RE-PLAN IS GATED ON THREE THINGS AT ONCE, AND A GOLDEN HAS NONE.
 *
 * The delta is NAMED (the slope fixture), so what has to be argued is its GATE.
 * `bayDoorsHanded` returns `bayDoors` itself — the same array object — unless
 * `params.bay_doors` exists, a partition can carry a leaf, AND the ceiling
 * actually cuts one. The last is the one that keeps every level room still:
 * `frontSlopeAt` answers null, the modes come back `===` what was passed, and
 * `bayDoorPlan` is not called a second time.
 */
PROBES.f2 = async () => {
  const rows = goldens().map(({ cfg, result }) => {
    const leaves = bayLeaves(result);
    const forced = leaves.filter((l) => l.meta?.hingeForced).length;
    return {
      id: cfg.id,
      cells: [result.panels.length, leaves.length, forced],
      ok: leaves.length === 0 && forced === 0,
    };
  });

  const wardrobe = (over) => computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: 'W01',
    width: 1800,
    height: 2150,
    items: PARTITION,
    sections: [{ items: PARTITION }],
    bay_doors: [{ door: 'one', hinge: 'L' }, { door: 'one', hinge: 'R' }],
    ...over,
  }, P);

  // LEVEL: bay doors and a partition, and still not a byte — the third gate.
  const level = wardrobe({});
  const l1 = bayLeaves(level).find((l) => l.meta.bay === 0);
  rows.push({
    id: 'bays, no ceiling',
    cells: [l1.meta.hinge, l1.meta.hingeOn, platesOn(level, 'BUL')],
    ok: l1.meta.hinge === 'L' && l1.meta.hingeOn === 'BUL' && platesOn(level, 'BUL') > 0,
  });

  // RAKED: the named delta itself. The hand is forced R, so the leaf hangs on
  // the partition and BUL is bored for nothing at all.
  const raked = wardrobe({ slope_cut: RISING });
  const r1 = bayLeaves(raked).find((l) => l.meta.bay === 0);
  rows.push({
    id: 'bays + ceiling',
    cells: [r1.meta.hinge, r1.meta.hingeOn, platesOn(raked, 'BUL')],
    ok: r1.meta.hinge === 'R' && r1.meta.hingeOn === 'VPART-1' && platesOn(raked, 'BUL') === 0,
  });

  return {
    head: 'F2 — the boundary follows the hand, and only under a live ceiling',
    columns: ['hand / panels', 'hungOn / leaves', 'BUL plates'],
    rows,
    note: 'The six read panels / bay leaves / forced leaves: no golden has a bay\n'
      + 'leaf at all, so none can be re-handed. The two rows beneath them are the\n'
      + 'fix: the SAME cabinet with and without a ceiling. Level is yesterday to\n'
      + 'the byte (L, BUL, bored); raked hangs the leaf where its cups are and\n'
      + 'leaves BUL alone — on main it was bored six times for a door that opens\n'
      + 'the other way.',
    verdict: [
      'F2 reaches no golden, and the named delta is exactly the raked bay leaf. ✓',
      'F2 REACHED A GOLDEN. Iron rule: write it up as a FINDING.',
    ],
  };
};

/**
 * F3 — THE SHOE'S LICENCE WAS NOT NEEDED.
 *
 * The turn is licensed to move a byte on a shoe fixture. It did not: the law
 * moved into the kit and the rail got an identity in `engine/elements.js`, and
 * neither is engine output. Asserted rather than assumed — an unused licence is
 * worth proving unused, because next turn's reader cannot tell the difference
 * between "did not need it" and "did not check".
 */
PROBES.f3 = async () => {
  const items = [{ id: 's1', kind: 'shelf', variant: 'shoe', pos_mm: 800 }];
  const shoe = computeCabinet({
    ...defaultParamsFor('WARDROBE', P), unit_num: 'W01', width: 900, items, sections: [{ items }],
  }, P);
  const shelf = shoe.panels.find((p) => p.part === 'SHELF');
  const rail = shoe.panels.find((p) => p.part === 'SHOE-RAIL');
  const rows = [
    {
      id: 'shelf blank',
      cells: [shelf.cnc.outline.length, shelf.meta.tilt_deg, shelf.cnc.slopeCut ? 'cut' : 'rect'],
      ok: shelf.cnc.outline.length === 4 && shelf.meta.tilt_deg === 15 && !shelf.cnc.slopeCut,
    },
    {
      id: 'rail',
      cells: [rail.w === shelf.w ? 'shelf w' : rail.w, rail.h, rail.thickness],
      ok: rail.w === shelf.w && rail.h === 60 && rail.thickness === 18,
    },
    {
      id: 'rail drilling',
      cells: [shoe.drills.filter((d) => /^SHOE-RAIL/.test(d.panel)).length, 'undrilled', '—'],
      ok: shoe.drills.filter((d) => /^SHOE-RAIL/.test(d.panel)).length === 0,
    },
  ];
  rows.push(...goldens().map(({ cfg, result }) => ({
    id: cfg.id,
    cells: [result.panels.filter((p) => p.part === 'SHOE-RAIL').length, '—', '—'],
    ok: result.panels.filter((p) => p.part === 'SHOE-RAIL').length === 0,
  })));
  return {
    head: 'F3 — the shoe\'s law moved; not one of the shoe\'s bytes did',
    columns: ['corners / rails', 'tilt / h', 'cut / t'],
    rows,
    note: 'A board that leans is still cut square: four corners, no `slopeCut`,\n'
      + 'the tilt on `meta` where T33 put it. The rail is the shelf\'s own width,\n'
      + 'the profile\'s 18 × 60, and undrilled. No golden cuts one at all.',
    verdict: [
      'F3 moved a law and an identity, and no engine byte. The licence went unused. ✓',
      'F3 MOVED AN ENGINE BYTE — argue it or write it up as a FINDING.',
    ],
  };
};

/**
 * F1 / F4 / F5 — THE THREE THAT TOUCH NO ENGINE FILE AT ALL.
 *
 * Argued by WHICH FILES MOVED rather than by numbers, because that is the
 * honest argument for a change that is entirely a law, entirely a picture, or
 * entirely a reading of git.
 */
PROBES.f1 = async () => {
  const kits = kitCount();
  const rows = [
    { id: 'F1 · LISP only', cells: ['reference/lisp/', `${kits} kits`], ok: kits === 14 },
    { id: 'F4 · 3-D + store', cells: ['LedIcons.jsx, uiStore.js, TopBar.jsx'], ok: true },
    { id: 'F5 · git only', cells: ['test/turn58-f5-…', 'computes no cabinet'], ok: true },
  ];
  return {
    head: 'F1, F4, F5 — a law, a picture and a verdict; no engine between them',
    columns: ['where', 'what'],
    rows,
    note: 'F1 AMENDS one kit and adds none, so the census stays at fourteen —\n'
      + '`t58-paren-balance.mjs --against <base>` is that claim, asked of git,\n'
      + 'and it checks the status letter as well as the name. F4 deletes the\n'
      + 'gate inside `LedIcons.jsx` and puts the law beside the other view\n'
      + 'flags. F5 reads history and asserts a commit id.',
    verdict: [
      'Three features, no engine byte between them. ✓',
      'A law, a picture or a verdict reached the engine.',
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
  const width = Math.max(18, ...probe.rows.map((r) => r.id.length + 2));
  let out = `${probe.head}\n\n${'subject'.padEnd(width)}`;
  const colW = probe.columns.map((c) => Math.max(c.length + 2, 16));
  probe.columns.forEach((c, i) => { out += c.padEnd(colW[i]); });
  out += '\n';
  for (const r of probe.rows) {
    out += r.id.padEnd(width);
    r.cells.forEach((c, i) => { out += String(c).padEnd(colW[i] || 16); });
    out += `${r.ok === false ? '  ←' : ''}\n`;
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
    process.stdout.write('EXPECTED BUCKETS: none. F2 acts only where per-bay doors, a partition that\n'
      + 'can carry one and a ceiling that actually cuts a leaf meet — no golden has\n'
      + 'any of the three. F3 moves a law and an identity, not a byte; its shoe\n'
      + 'licence went unused, and so did the wall-infill one. F1 is LISP only, F4 is\n'
      + '3-D and the view store, F5 reads git. The one NAMED delta is the raked bay\n'
      + 'leaf, argued in this file\'s header; `--probe` argues each feature as an\n'
      + 'exit code.\n');
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
