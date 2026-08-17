#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT (turn 37, CLAUDE.md iron rule 2) ────────────
//
// T34, T35 and T36 each wrote down, IN ADVANCE, the named buckets their
// engine-law changes were allowed to move in the BARE `computeCabinet()`
// answer for the six standard configs. THIS TURN NAMES NONE.
//
// Rule 2, verbatim: *"Engine purity — this turn's contract is BYTE-IDENTITY.
// Sibling `scripts/t37-classify.mjs`: NO named buckets are expected. Every
// change here is UI-side, 3D-side, layout-side, project-level law, or touches
// parts absent from the six configs (rails, split, top box, shoe). Any delta
// at all = UNNAMED = exit 1."*
//
// So this file is its predecessors with the bucket list EMPTY, and that
// emptiness is the whole contract. Written down here, feature by feature, is
// WHY each of the nine may not move a byte of the six:
//
//   F1  MULTI-SELECT       — selection and drag priority. No engine call.
//   F2  THE RAIL ASSEMBLY  — a shelf-mounted rail is a rail item carrying
//                            `mount: 'shelf'` and a `shelf_id`. The six
//                            configs carry NO items at all, so `railShelfId`
//                            arrives null on every one of them and the rail
//                            block runs the T35 path it has always run.
//   F3  HINGE PLATE BITE   — `hardware.hinge.plateBiteMm` is a HARDWARE
//                            number read by the hinge-plate pilot law, not by
//                            the carcass. If it reaches a panel or a drill of
//                            the six, this file says so.
//   F4  SPLIT DOORS        — a bay with no `split_top_mm` is the bay it was
//                            yesterday (T36's own contract, re-asserted). The
//                            centring BOUNDARY is a design-layer law computed
//                            over items; the six have none.
//   F5  TOP BOX            — a separate UNIT of a type that is not in the six.
//   F6  SHOE DRAWER        — a `shoe_box` ITEM. The six carry none.
//   F7  GRAIN, TWO READERS — (a) is SHEET PLACEMENT (`cnc/layout.js`), which
//                            is downstream of `computeCabinet()` and not in
//                            its return; (b) is a 3D reader (`decors.js`).
//                            Neither writes `cnc.grain`, so the stated field
//                            on every panel of the six must come back
//                            character for character.
//   F9  THE FIVE REMOVALS  — five unused exports. Nothing imports them.
//
// Usage — the same three lines every classifier in this house has taken:
//
//     node scripts/t37-classify.mjs --dump > /tmp/base.json     # on main
//     node scripts/t37-classify.mjs --dump > /tmp/head.json     # on the branch
//     node scripts/t37-classify.mjs /tmp/base.json /tmp/head.json
//
// Zero dependencies beyond the engine and node:crypto.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';

// The six standard configs are T34's, T35's and T36's, unchanged — the same
// set, so a T36 dump and a T37 dump are directly comparable. They are
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
  process.stdout.write('EXPECTED BUCKETS: none — T37 is a byte-identity turn.\n');
  process.stdout.write(`UNNAMED:          ${counts.UNNAMED}\n`);
  process.exit(counts.UNNAMED === 0 ? 0 : 1);
} else {
  const d = dump();
  for (const cfg of STANDARD_CONFIGS) {
    process.stdout.write(`${cfg.id.padEnd(12)} drawers=${cfg.drawers ? 'yes' : 'no '}  ${d[cfg.id].sha256 || d[cfg.id].error}\n`);
  }
}
