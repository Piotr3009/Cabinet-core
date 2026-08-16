#!/usr/bin/env node
// ─── THE NAMED-DELTAS CONTRACT (turn 34, CLAUDE.md iron rule 2) ─────────────
//
// T34 changes the engine in three named places — F3 (the runner nominal is the
// BOX + 10), F4 (the shoe box) and F6 (the appliance exception) — and rule 2
// writes down, in advance, exactly what each of them may move:
//
//   · configs WITHOUT drawers and WITHOUT appliances → BYTE-IDENTICAL;
//   · configs WITH drawers → the ONLY permitted delta is the runner-pair
//     hardware line (F3's NL law), and this script must NAME it and nothing
//     else;
//   · no standard config carries a shoe box or an appliance, so F4 and F6
//     contribute ZERO deltas to the set.
//
// "Anything unnamed = the run fails its own audit." So this is the audit. It
// walks the BARE `computeCabinet()` answer for the SIX STANDARD CONFIGS, takes
// a sha256 of each, and — where two runs disagree — walks the two trees leaf by
// leaf and puts every differing path into exactly one bucket:
//
//   RUNNER_PAIR_LINE  a leaf under a `runner_pairs` hardware entry. NAMED: F3.
//   UNNAMED           anything else at all.
//
// A green run is `UNNAMED 0`. Anything in UNNAMED exits 1, because a delta the
// spec did not name is the turn failing its own contract.
//
//     node scripts/t34-classify.mjs --dump > /tmp/base.json     # on main
//     node scripts/t34-classify.mjs --dump > /tmp/head.json     # on the branch
//     node scripts/t34-classify.mjs /tmp/base.json /tmp/head.json
//
// Zero dependencies beyond the engine and node:crypto.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';

/**
 * THE SIX STANDARD CONFIGS.
 *
 * Three that carry NO drawers and no appliance (rule 2's byte-identical half)
 * and three that carry drawers at two different box depths, so F3's `box + 10`
 * has to prove itself twice over rather than once: 490 → 500 and 440 → 450.
 * None of them contains a shoe box or an appliance, which is precisely what
 * makes F4's and F6's contribution to this set ZERO by construction.
 */
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

/** The bare engine's answer for one config, canonicalised. */
export function bareEngine(id) {
  const params = { ...defaultParamsFor(id, P), unit_num: '01' };
  return computeCabinet(params, P);
}

export function dump() {
  const out = {};
  for (const cfg of STANDARD_CONFIGS) {
    let result;
    try {
      result = bareEngine(cfg.id);
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
 * Is this leaf part of the ONE line F3 is allowed to move?
 *
 * The runner-pair hardware entry, and nothing else. `hardware` is an array, so
 * the path names an index — the classifier resolves that index back to the
 * entry and asks its `role`, because "index 4 changed" is not a name.
 */
function isRunnerPairLeaf(path, tree) {
  const m = /^\$\.hardware\[(\d+)\]/.exec(path);
  if (!m) return false;
  const entry = tree?.hardware?.[Number(m[1])];
  return entry?.role === 'runner_pairs';
}

export function classify(base, head) {
  const rows = [];
  let unnamed = 0;
  let named = 0;
  for (const cfg of STANDARD_CONFIGS) {
    const b = base[cfg.id];
    const h = head[cfg.id];
    if (!b || !h) {
      rows.push(`${cfg.id}  MISSING in ${!b ? 'base' : 'head'}`);
      unnamed += 1;
      continue;
    }
    if (b.sha256 === h.sha256) {
      rows.push(`${cfg.id}  IDENTICAL  ${h.sha256}`);
      continue;
    }
    const lb = leaves(b.tree, '$', new Map());
    const lh = leaves(h.tree, '$', new Map());
    const paths = new Set([...lb.keys(), ...lh.keys()]);
    const deltas = [];
    for (const p of [...paths].sort()) {
      const was = lb.get(p);
      const now = lh.get(p);
      if (canonical(was) === canonical(now)) continue;
      const runner = isRunnerPairLeaf(p, b.tree) || isRunnerPairLeaf(p, h.tree);
      if (runner) named += 1; else unnamed += 1;
      deltas.push({ path: p, was, now, bucket: runner ? 'RUNNER_PAIR_LINE' : 'UNNAMED' });
    }
    rows.push(`${cfg.id}  CHANGED  ${b.sha256} → ${h.sha256}`);
    for (const d of deltas) {
      rows.push(`    ${d.bucket.padEnd(16)} ${d.path}  ${JSON.stringify(d.was)} → ${JSON.stringify(d.now)}`);
    }
  }
  return { rows, named, unnamed };
}

const argv = process.argv.slice(2);
if (argv.includes('--dump')) {
  process.stdout.write(`${JSON.stringify(dump(), null, 1)}\n`);
} else if (argv.length >= 2) {
  const base = JSON.parse(readFileSync(argv[0], 'utf8'));
  const head = JSON.parse(readFileSync(argv[1], 'utf8'));
  const { rows, named, unnamed } = classify(base, head);
  process.stdout.write(`${rows.join('\n')}\n`);
  process.stdout.write(`\nNAMED (runner-pair line, F3): ${named}\nUNNAMED: ${unnamed}\n`);
  process.exit(unnamed === 0 ? 0 : 1);
} else {
  const d = dump();
  for (const cfg of STANDARD_CONFIGS) {
    process.stdout.write(`${cfg.id.padEnd(12)} drawers=${cfg.drawers ? 'yes' : 'no '}  ${d[cfg.id].sha256 || d[cfg.id].error}\n`);
  }
}
