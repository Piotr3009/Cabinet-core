#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT (turn 38, CLAUDE.md iron rule 2) ────────────
//
// T34, T35 and T36 each wrote down, IN ADVANCE, the named buckets their
// engine-law changes were allowed to move in the BARE `computeCabinet()`
// answer for the six standard configs. T37 named none, and THIS TURN NAMES
// NONE EITHER.
//
// Rule 2, verbatim: *"Engine purity — this turn's contract is BYTE-IDENTITY.
// Sibling `scripts/t38-classify.mjs` (copy `t37-classify.mjs`, retitle): NO
// named buckets. Every change here is UI-side, overrides-side, checks-side, or
// touches units absent from the six configs (top box). Any delta in the bare
// `computeCabinet()` answer for the six = UNNAMED = exit 1."*
//
// So this file is T37's with the bucket list still EMPTY, and that emptiness
// is the whole contract. Written down here, feature by feature, is WHY each of
// the twelve may not move a byte of the six:
//
//   F1a CHECK FRESHNESS   — a React dependency list and one shared hook
//                           (`lib/checkFindings.js`). No engine call at all.
//   F1b TOP BOX HINGES    — `WARDROBE_TOP.hingeRule` moves from the wardrobe's
//                           `tall` ladder to `low`, the ladder that scales
//                           with the door's own height. `WARDROBE_TOP` is not
//                           one of the six and no golden fixture cuts one.
//   F1c TOP BOX BACK      — the full BACK states `cnc.grain: 'h'` ONLY where
//                           it is WIDER than it is tall, which is the case the
//                           saw's own longer-side rule gets wrong. Every back
//                           of the six is taller than it is wide, so no key is
//                           added to any of them and the field stays absent
//                           exactly as it was.
//   F2–F8, F11            — THE EDITOR. A full-screen shell, layers, snaps,
//                           drawing tools, select/verbs, measure, the 3-D
//                           thumbnail and undo. Every one of them writes into
//                           `params.part_edits`, which `computeCabinet()` is
//                           never handed (turn 23's architecture: the engine
//                           stays pure and ignorant, the pencil applies in a
//                           thin step AFTER it).
//   F9  THE RESIZE RULE   — `partEdits.js` again, plus two CHECK rules. The
//                           engine is not asked.
//   F10 DXF               — `cnc/dxf.js` is DOWNSTREAM of `computeCabinet()`.
//                           The new `arc` entity is additive and nothing in
//                           the six emits one.
//   F12 THE QUARTET       — pure geometry in `engine/partObjects.js`, reached
//                           only from the editor.
//
// Usage — the same three lines every classifier in this house has taken:
//
//     node scripts/t38-classify.mjs --dump > /tmp/base.json     # on main
//     node scripts/t38-classify.mjs --dump > /tmp/head.json     # on the branch
//     node scripts/t38-classify.mjs /tmp/base.json /tmp/head.json
//
// Zero dependencies beyond the engine and node:crypto.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';

// The six standard configs are T34's, T35's, T36's and T37's, unchanged — the same
// set, so a T37 dump and a T38 dump are directly comparable. They are
// re-stated here rather than imported because a classifier that quietly ran
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
  process.stdout.write('EXPECTED BUCKETS: none — T38 is a byte-identity turn.\n');
  process.stdout.write(`UNNAMED:          ${counts.UNNAMED}\n`);
  process.exit(counts.UNNAMED === 0 ? 0 : 1);
} else {
  const d = dump();
  for (const cfg of STANDARD_CONFIGS) {
    process.stdout.write(`${cfg.id.padEnd(12)} drawers=${cfg.drawers ? 'yes' : 'no '}  ${d[cfg.id].sha256 || d[cfg.id].error}\n`);
  }
}
