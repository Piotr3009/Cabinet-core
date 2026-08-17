#!/usr/bin/env node
// ─── THE NAMED-DELTAS CONTRACT (turn 35, CLAUDE.md iron rule 2) ─────────────
//
// Rule 2 writes down, IN ADVANCE, exactly what this turn's engine-law changes
// may move in the BARE `computeCabinet()` answer for the six standard configs,
// and declares everything else a failure:
//
//   DOOR_TOP_FULL  F12 — "a door with NOTHING above it grows to full height
//                  (the 3 mm top gap goes). Expected on every doored config."
//   GRAIN_AXIS     F6  — "drawer boxes, drawer fronts and plinths carry the
//                  new grain axis. Expected on drawer- and plinth-bearing
//                  configs."
//   UNNAMED        anything else at all = exit 1.
//
// ─── WHAT ACTUALLY HAPPENED TO DOOR_TOP_FULL, AND WHY ──────────────────────
//
// The bucket is here, it is armed, and on the six standard configs it catches
// ONE leaf per doored config: `$.params.front_top_gap_mm`, `undefined → 3`.
// Not a millimetre of geometry. That is not the build falling short of the
// spec — it is rule 2 and rule 5 contradicting each other, and rule 5 winning
// on the merits:
//
//   · Rule 2 says the bare engine IS the AutoLISP.
//   · Rule 5 says the golden fixtures are untouchable — and those fixtures
//     ARE the AutoLISP's own cut list, `fixtures/golden-wardrobe.json` pinning
//     `W01-F` at 2147 = 2150 − 3, with `fixtures/README.md` adding "Tests read
//     these files. Engine output must match. If it doesn't — the ENGINE is
//     wrong. NEVER modify expected values."
//   · Every kit in `reference/lisp/` cuts `wysFront = (- wysSzafki 3.0)`
//     unconditionally, because a kit has no ROOM and cannot know what stands
//     over the cabinet.
//
// So "the bare engine grows the door" and "the fixtures are untouchable" cannot
// both be true. Making the bare engine grow it turned 75 tests red across six
// golden fixtures and a dozen earlier turns' pinned laws — the measurement is
// in the PR body. The build takes the road this house already paved for exactly
// this shape of problem (`shelf_pin_setback_mm`, `shaker_frame_mm`,
// `hinge_two_below_mm`): the LAW is real and it is the owner's, and it travels
// as an INPUT from the room layer, which is the only layer that can see what is
// above a cabinet. A bare kit call keeps cutting H − 3; the app cuts flush.
// The owner gets the behaviour he asked for on every path, including reload,
// and no fixture moved.
//
// The visible consequence is this file: DOOR_TOP_FULL catches the echoed
// parameter and nothing else. It is named rather than silenced, because a
// bucket that quietly caught nothing would be the run hiding its own deviation.
//
// ─── AND GRAIN_AXIS ────────────────────────────────────────────────────────
//
// Armed on the same terms. If F6 did not land in this run it catches nothing,
// and the PR body says so rather than this file pretending otherwise.
//
//     node scripts/t35-classify.mjs --dump > /tmp/base.json     # on main
//     node scripts/t35-classify.mjs --dump > /tmp/head.json     # on the branch
//     node scripts/t35-classify.mjs /tmp/base.json /tmp/head.json
//
// Zero dependencies beyond the engine and node:crypto.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';

// The six standard configs are T34's, unchanged — the same set, so a T34 dump
// and a T35 dump are directly comparable. They are re-stated here rather than
// imported because `t34-classify.mjs` runs its own CLI on import, and a
// classifier that quietly ran another classifier would be the last thing this
// contract needs.
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

/** Every leaf of a tree, as `path → value`. */
function leaves(node, path, into) {
  if (node === null || typeof node !== 'object') {
    into.set(path, node);
    return into;
  }
  if (Array.isArray(node)) {
    into.set(`${path}.length`, node.length);
    node.forEach((v, i) => leaves(v, `${path}[${i}]`, into));
    return into;
  }
  for (const k of Object.keys(node).sort()) leaves(node[k], `${path}.${k}`, into);
  return into;
}

/**
 * F12's footprint on the bare engine.
 *
 * Deliberately narrow, so it can swallow nothing else:
 *   · `$.params.front_top_gap_mm` — the demand, echoed so the panel's reader
 *     and the cut piece cannot drift; and
 *   · a FRONT panel's own height and its box height, IF the bare engine is
 *     ever taken off the kit's 3 (it is not, today — see the note above).
 */
function isDoorTopLeaf(path, base, head) {
  if (path === '$.params.front_top_gap_mm') return true;
  const m = /^\$\.panels\[(\d+)\]\.(h|box\.h|edgeLen|cnc\.outline)/.exec(path);
  if (!m) return false;
  const panel = head?.panels?.[Number(m[1])] || base?.panels?.[Number(m[1])];
  return panel?.role === 'front' && panel?.part === 'FRONT';
}

/**
 * F6's footprint: the grain axis on a drawer-box part, a drawer FRONT or a
 * PLINTH — and the drawn frame that follows it. Nothing else, and never on a
 * board of another role.
 */
const GRAIN_ROLE_PARTS = new Set([
  'DRAWER-SIDE', 'DRAWER-BOX-FRONT', 'DRAWER-BOX-BACK', 'DRAWER-BOTTOM',
  'DRAWER-FRONT', 'PLINTH',
]);

function isGrainLeaf(path, base, head) {
  const m = /^\$\.panels\[(\d+)\]\.cnc\.(grain|rotated|drawn_w|drawn_h)$/.exec(path);
  if (!m) return false;
  const panel = head?.panels?.[Number(m[1])] || base?.panels?.[Number(m[1])];
  return GRAIN_ROLE_PARTS.has(panel?.part);
}

export function classify(base, head) {
  const rows = [];
  const counts = { DOOR_TOP_FULL: 0, GRAIN_AXIS: 0, UNNAMED: 0 };
  for (const cfg of STANDARD_CONFIGS) {
    const b = base[cfg.id];
    const h = head[cfg.id];
    if (!b || !h) {
      rows.push(`${cfg.id}  MISSING in ${!b ? 'base' : 'head'}`);
      counts.UNNAMED += 1;
      continue;
    }
    if (b.sha256 === h.sha256) {
      rows.push(`${cfg.id}  IDENTICAL  ${h.sha256}`);
      continue;
    }
    const lb = leaves(b.tree, '$', new Map());
    const lh = leaves(h.tree, '$', new Map());
    const paths = new Set([...lb.keys(), ...lh.keys()]);
    rows.push(`${cfg.id}  CHANGED  ${b.sha256} → ${h.sha256}`);
    for (const p of [...paths].sort()) {
      const was = lb.get(p);
      const now = lh.get(p);
      if (canonical(was) === canonical(now)) continue;
      let bucket = 'UNNAMED';
      if (isDoorTopLeaf(p, b.tree, h.tree)) bucket = 'DOOR_TOP_FULL';
      else if (isGrainLeaf(p, b.tree, h.tree)) bucket = 'GRAIN_AXIS';
      counts[bucket] += 1;
      rows.push(`    ${bucket.padEnd(16)} ${p}  ${JSON.stringify(was)} → ${JSON.stringify(now)}`);
    }
  }
  return { rows, counts };
}

const argv = process.argv.slice(2);
if (argv.includes('--dump')) {
  process.stdout.write(`${JSON.stringify(dump(), null, 1)}\n`);
} else if (argv.length >= 2) {
  const base = JSON.parse(readFileSync(argv[0], 'utf8'));
  const head = JSON.parse(readFileSync(argv[1], 'utf8'));
  const { rows, counts } = classify(base, head);
  process.stdout.write(`${rows.join('\n')}\n\n`);
  process.stdout.write(`DOOR_TOP_FULL (F12): ${counts.DOOR_TOP_FULL}\n`);
  process.stdout.write(`GRAIN_AXIS    (F6):  ${counts.GRAIN_AXIS}\n`);
  process.stdout.write(`UNNAMED:             ${counts.UNNAMED}\n`);
  process.exit(counts.UNNAMED === 0 ? 0 : 1);
} else {
  const d = dump();
  for (const cfg of STANDARD_CONFIGS) {
    process.stdout.write(`${cfg.id.padEnd(12)} drawers=${cfg.drawers ? 'yes' : 'no '}  ${d[cfg.id].sha256 || d[cfg.id].error}\n`);
  }
}
