#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT (turn 40, CLAUDE.md iron rule 2) ────────────
//
// T34, T35 and T36 each wrote down, IN ADVANCE, the named buckets their
// engine-law changes were allowed to move in the BARE `computeCabinet()`
// answer for the six standard configs. T37 named none, T38 named none, T39
// named none, and THIS TURN NAMES NONE EITHER.
//
// Rule 2, verbatim: *"Engine contract: BYTE-IDENTITY. `scripts/t40-classify.mjs`
// (sibling of t39's), no named buckets, UNNAMED=0. Every feature here is
// downstream of `computeCabinet()`, in the drawing layer, in the check layer,
// or in UI. If a feature appears to need an engine change, it does not — it
// needs a better read. Skip it and note it rather than move a byte."*
//
// So this file is T39's with the bucket list still EMPTY, and that emptiness is
// the whole contract. Written down here, feature by feature, is WHY each of the
// seven may not move a byte of the six:
//
//   F1 THE SPLIT-DOOR CHAIN — the engine ALREADY cuts a split leaf as two
//                           segments with their own ladders (T36-F6,
//                           `meta.cupY` / `meta.plateY` /
//                           `drillSummary.hinge_rows_by_panel`). F1 is an
//                           investigation into who READS them, and its fix is
//                           in the readers: the store's `hingeRowsOf`, the
//                           Doors modal, and `engine/shelfHingeClash.js` (the
//                           CHECK layer). The one engine-side line — a split
//                           segment honouring a per-segment override list — is
//                           an ADDITIVE param channel exactly like
//                           `hinge_rows`, `front_edge_trim` and
//                           `hinge_plate_pilot_d`: a bare `computeCabinet()`
//                           is handed none, and none of the six splits a door
//                           at all (`split_top_mm` absent → `splitDoorActive`
//                           false → the whole pass is skipped).
//   F2 ONE GRAIN TRUTH    — the single source is `engine/cnc/layout.js
//                           sheetTurn` and its reader `engine/decors.js
//                           grainRun`. Neither is called by `computeCabinet()`:
//                           the CNC layout is a consumer of the engine's
//                           answer and the decor mapping is the SCENE's. CNC
//                           LAYOUT FINGERPRINTS WILL MOVE — that is F2's
//                           point — and a layout fingerprint is not an engine
//                           hash. This file measures the engine only.
//   F3 DRAWERS            — F3a is a DESIGN-LAYER decision
//                           (`paramsForEngine()`), which is the override
//                           channel arriving at the engine as millimetres it
//                           already accepts; F3b's overlay stack is likewise
//                           params in. A bare `computeCabinet()` is handed
//                           neither.
//   F4 THE CHECKS         — `engine/checks.js` and its panel. The check layer
//                           reads the engine; the engine has never read it
//                           (the turn-31 layering law).
//   F5 THE WALL DRAWINGS  — `engine/drawings/**` composes views out of an
//                           already-computed result. Arguments in, SVG out.
//   F6 THE RAIL MODAL     — a choice in the UI that lands on the same params
//                           the rail already travels on.
//   F7 plateBiteMm        — a stored-PROFILE migration. The profile is an
//                           input to `computeCabinet()`, and the six are
//                           computed against `DEFAULT_CABINET_PROFILE`, which
//                           has carried 10 since T37-F3.
//
// Usage — the same three lines every classifier in this house has taken:
//
//     node scripts/t40-classify.mjs --dump > /tmp/base.json     # on main
//     node scripts/t40-classify.mjs --dump > /tmp/head.json     # on the branch
//     node scripts/t40-classify.mjs /tmp/base.json /tmp/head.json
//
// Zero dependencies beyond the engine and node:crypto.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';

// The six standard configs are T34's through T39's, unchanged — the same set,
// so a T39 dump and a T40 dump are directly comparable. They are re-stated here
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
 * THE BUCKET LIST, AND IT IS EMPTY.
 *
 * There is deliberately no `isSomethingLeaf()` predicate in this file. A turn
 * whose contract is byte-identity has exactly one bucket, and adding a second
 * one here — for any reason, including "the delta looked harmless" — is the
 * act rule 2 forbids. If a feature turns out to need engine movement, the way
 * to get it is to amend CLAUDE.md and name the bucket, not to widen this.
 */
export function classify(base, head) {
  const rows = [];
  const counts = { UNNAMED: 0 };
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
      counts.UNNAMED += 1;
      rows.push(`    ${'UNNAMED'.padEnd(16)} ${p}  ${JSON.stringify(was)} → ${JSON.stringify(now)}`);
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
  process.stdout.write('EXPECTED BUCKETS: none — T40 is a byte-identity turn.\n');
  process.stdout.write(`UNNAMED:          ${counts.UNNAMED}\n`);
  process.exit(counts.UNNAMED === 0 ? 0 : 1);
} else {
  const d = dump();
  for (const cfg of STANDARD_CONFIGS) {
    process.stdout.write(`${cfg.id.padEnd(12)} drawers=${cfg.drawers ? 'yes' : 'no '}  ${d[cfg.id].sha256 || d[cfg.id].error}\n`);
  }
}
