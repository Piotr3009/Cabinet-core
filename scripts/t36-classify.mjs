#!/usr/bin/env node
// ─── THE NAMED-DELTAS CONTRACT (turn 36, CLAUDE.md iron rule 2) ─────────────
//
// Rule 2 writes down, IN ADVANCE, exactly what this turn's engine-law changes
// may move in the BARE `computeCabinet()` answer for the six standard configs,
// and declares everything else a failure:
//
//   GRAIN_AXIS   F5 — "drawer boxes, drawer fronts and the plinth stand along
//                the grain". The ONLY expected bucket this turn. Expected on
//                every drawer- and plinth-bearing config.
//   UNNAMED      anything else at all = exit 1.
//
// AND THE TWO THINGS RULE 2 SAYS MUST **NOT** MOVE, written down here so the
// run cannot quietly discover otherwise:
//
//   · SPLIT DOORS (F6) default to "no split". A bay with no `split_top_mm`
//     is the bay it was yesterday, so not one leaf of the six configs may
//     move. If the feature ever leaks a default, this file catches it as
//     UNNAMED and the run fails its own contract.
//   · THE TOP BOX (F7) is a NEW TYPE. A new key in `UNIT_TYPES` cannot reach
//     `WARDROBE`, `BUD`, `WUD`, `BUDR`, `BUDR4` or `PANTRY`, so the same
//     applies: silence here is the proof.
//
// Usage — the same three lines every classifier in this house has taken:
//
//     node scripts/t36-classify.mjs --dump > /tmp/base.json     # on main
//     node scripts/t36-classify.mjs --dump > /tmp/head.json     # on the branch
//     node scripts/t36-classify.mjs /tmp/base.json /tmp/head.json
//
// Zero dependencies beyond the engine and node:crypto.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';

// The six standard configs are T34's and T35's, unchanged — the same set, so a
// T35 dump and a T36 dump are directly comparable. They are re-stated here
// rather than imported because a classifier that quietly ran another
// classifier's CLI would be the last thing this contract needs.
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
 * F5's footprint: the grain axis on a drawer-box part, a drawer FRONT or the
 * PLINTH — and the drawn frame that follows it. Nothing else, and never on a
 * board of another role.
 *
 * The list is the OWNER'S OWN, verbatim: *"szuflady w pionie, wzdłuż słojów;
 * fronty szuflad też; plinth też."* A shelf is not on it (T28-F7 already
 * answered the shelf, and this turn does not reopen it); a side, a top, a back
 * and a door are not on it either.
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
  const counts = { GRAIN_AXIS: 0, UNNAMED: 0 };
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
      const bucket = isGrainLeaf(p, b.tree, h.tree) ? 'GRAIN_AXIS' : 'UNNAMED';
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
  process.stdout.write(`GRAIN_AXIS (F5): ${counts.GRAIN_AXIS}\n`);
  process.stdout.write(`UNNAMED:         ${counts.UNNAMED}\n`);
  process.exit(counts.UNNAMED === 0 ? 0 : 1);
} else {
  const d = dump();
  for (const cfg of STANDARD_CONFIGS) {
    process.stdout.write(`${cfg.id.padEnd(12)} drawers=${cfg.drawers ? 'yes' : 'no '}  ${d[cfg.id].sha256 || d[cfg.id].error}\n`);
  }
}
