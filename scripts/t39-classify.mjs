#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT (turn 39, CLAUDE.md iron rule 2) ────────────
//
// T34, T35 and T36 each wrote down, IN ADVANCE, the named buckets their
// engine-law changes were allowed to move in the BARE `computeCabinet()`
// answer for the six standard configs. T37 named none, T38 named none, and
// THIS TURN NAMES NONE EITHER.
//
// Rule 2, verbatim: *"Engine contract: BYTE-IDENTITY. `scripts/t39-classify.mjs`
// (sibling of t38's), no named buckets, UNNAMED=0. Materials and BOM are a
// READ-ONLY consumer of the engine's answer — assignment must not move a
// single byte of `computeCabinet()`. If a feature here seems to need an engine
// change, it does not: it needs a better read."*
//
// So this file is T38's with the bucket list still EMPTY, and that emptiness is
// the whole contract. Written down here, feature by feature, is WHY each of the
// eight may not move a byte of the six:
//
//   F1 THE PART REGISTRY  — `engine/partRegistry.js` is a NEW module: a
//                           hardcoded table of ids plus `ELEMENT_TO_PART_ID`.
//                           `cabinet.js` does not import it and never will;
//                           the registry reads the engine's answer, the engine
//                           does not read the registry.
//   F2 THE ASSIGNMENT STORE — `stores/materialAssignmentStore.js` is a zustand
//                           store. `computeCabinet()` imports no store (turn 23's
//                           architecture: the engine stays pure and ignorant).
//   F5 THE BOM ENGINE     — `engine/bom.js` gains pure functions that take the
//                           COMPUTED result as an argument. Arguments in, list
//                           out. It is downstream by construction.
//   F3/F6 THE MODAL + VIEW — React. No engine call that was not already made.
//   F4 THE AUTOMATICS     — rules that pick a PRODUCT for a part. They read
//                           `result.hardware`, `profile.materials.legRules` and
//                           the design's finish; they write into the assignment
//                           store, which the engine never reads.
//   F7 THE GATE           — `lib/` + checks. The gate ASKS the assignment store
//                           instead of the old flat map; the geometry it guards
//                           is unchanged.
//   F8 CUSTOM CONSUMABLES — rows the USER types, living in the assignment blob.
//                           They never reach `computeCabinet()`.
//
// Usage — the same three lines every classifier in this house has taken:
//
//     node scripts/t39-classify.mjs --dump > /tmp/base.json     # on main
//     node scripts/t39-classify.mjs --dump > /tmp/head.json     # on the branch
//     node scripts/t39-classify.mjs /tmp/base.json /tmp/head.json
//
// Zero dependencies beyond the engine and node:crypto.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';

// The six standard configs are T34's, T35's, T36's, T37's and T38's, unchanged
// — the same set, so a T38 dump and a T39 dump are directly comparable. They
// are re-stated here rather than imported because a classifier that quietly ran
// another classifier's CLI would be the last thing this contract needs.
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
  process.stdout.write('EXPECTED BUCKETS: none — T39 is a byte-identity turn.\n');
  process.stdout.write(`UNNAMED:          ${counts.UNNAMED}\n`);
  process.exit(counts.UNNAMED === 0 ? 0 : 1);
} else {
  const d = dump();
  for (const cfg of STANDARD_CONFIGS) {
    process.stdout.write(`${cfg.id.padEnd(12)} drawers=${cfg.drawers ? 'yes' : 'no '}  ${d[cfg.id].sha256 || d[cfg.id].error}\n`);
  }
}
