#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT (turn 42, CLAUDE.md iron rule 2) ────────────
//
// T34, T35 and T36 each wrote down, IN ADVANCE, the named buckets their
// engine-law changes were allowed to move in the BARE `computeCabinet()`
// answer for the six standard configs. T37 named none, T38 named none, T39
// named none, T40 named none, T41 named none, and THIS TURN NAMES NONE EITHER
// — even though this is the turn that cuts a whole branch out of the engine.
//
// The T42 brief, verbatim: *"Engine contract: BYTE-IDENTITY — and it HOLDS
// this turn despite the engine surgery, because none of the six configs
// carries a rail (t41-classify's own header records it; verify it again in
// t42's)."*
//
// ─── VERIFIED AGAIN, 19.08.2026, ON THE BRANCH POINT ───────────────────────
//
// Measured, not assumed — `computeCabinet(defaultParamsFor(id, P), P)` for
// each of the six, before a line of T42 was written:
//
//     config     params.rail   RAIL-PART panels   overlay stack
//     WARDROBE   false         []                 (none)
//     BUD        false         []                 (none)
//     WUD        false         []                 (none)
//     BUDR       false         []                 (none)
//     BUDR4      false         []                 (none)
//     PANTRY     false         []                 (none)
//
// `params.rail` is FALSE on all six. `hasRail` is therefore false on all six,
// so EVERY line this turn deletes — the pre-T37 `else if (hasRail)` body, the
// `RAIL-PART` panel block, the `railPartY`/`railPartCentreY` reads — is
// unreachable in the bare answer. That is not a hope about the diff; it is
// what makes the deletion safe to measure this way.
//
// Written down here, feature by feature, is WHY each of the three may not move
// a byte of the six:
//
//   F0 THE WALL PDF SPEAKS — `components/DrawingModal.jsx`,
//                            `pages/ConfiguratorPage.jsx` and
//                            `engine/drawings/**`. Every one of them is a
//                            CONSUMER of an already-computed result: arguments
//                            in, sheets and SVG out. The engine has never read
//                            any of them (the turn-31 layering law).
//   F1 THE RAIL, FINISHED  — the ALONE branch is reached only when a hanger
//                            ITEM exists and `cfg.rail` is true. A bare
//                            `computeCabinet()` is handed no items at all and
//                            `rail: false`, so the whole rail region — the new
//                            branch AND the deleted one — is dead code for the
//                            six. Measured above.
//   F2 OVERLAY RUNNERS GLB — a READER of `overlayPlan` in the 3-D channel
//                            (`engine/runners.js` → `3d/Hardware.jsx`), not a
//                            change to the engine's answer. None of the six
//                            carries an overlay stack. Measured above.
//
// Usage — the same three lines every classifier in this house has taken:
//
//     node scripts/t42-classify.mjs --dump > /tmp/base.json     # on main
//     node scripts/t42-classify.mjs --dump > /tmp/head.json     # on the branch
//     node scripts/t42-classify.mjs /tmp/base.json /tmp/head.json
//
// Zero dependencies beyond the engine and node:crypto.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';

// The six standard configs are T34's through T41's, unchanged — the same set,
// so a T41 dump and a T42 dump are directly comparable. They are re-stated here
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

/**
 * THE RAIL CENSUS — the sentence the header above claims, asked of the engine
 * rather than of a comment.
 *
 * CLAUDE.md: *"none of the six configs carries a rail (t41-classify's own
 * header records it; VERIFY IT AGAIN in t42's)"*. A header that records a
 * measurement somebody took once is a header that goes stale the first time a
 * default moves. This runs it, every time, and `--census` prints it.
 */
export function railCensus() {
  return STANDARD_CONFIGS.map((cfg) => {
    const params = { ...defaultParamsFor(cfg.id, P), unit_num: '01' };
    const result = computeCabinet(params, P);
    return {
      id: cfg.id,
      rail: params.rail === true,
      railParts: result.panels.filter((p) => p.part === 'RAIL-PART').map((p) => p.id),
      overlay: Boolean(result.drawers?.overlay),
    };
  });
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
 *
 * T42 is the turn that tests that sentence hardest: it DELETES engine code.
 * The brief says so in as many words — *"If any of the six moves a byte, the
 * surgery cut something it should not have — stop that cut and note it."*
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
} else if (argv.includes('--census')) {
  process.stdout.write('THE RAIL CENSUS — why byte-identity survives engine surgery\n\n');
  process.stdout.write(`${'config'.padEnd(12)}${'params.rail'.padEnd(14)}${'RAIL-PART panels'.padEnd(20)}overlay stack\n`);
  let clean = true;
  for (const row of railCensus()) {
    if (row.rail || row.railParts.length || row.overlay) clean = false;
    process.stdout.write(
      `${row.id.padEnd(12)}${String(row.rail).padEnd(14)}`
      + `${(row.railParts.length ? row.railParts.join(',') : '[]').padEnd(20)}`
      + `${row.overlay ? 'yes' : '(none)'}\n`,
    );
  }
  process.stdout.write(`\n${clean
    ? 'CLEAN — no rail, no RAIL-PART, no overlay stack in any of the six.'
    : 'NOT CLEAN — a config carries one of them; the byte-identity claim above is void.'}\n`);
  process.exit(clean ? 0 : 1);
} else if (argv.length >= 2) {
  const base = JSON.parse(readFileSync(argv[0], 'utf8'));
  const head = JSON.parse(readFileSync(argv[1], 'utf8'));
  const { rows, counts } = classify(base, head);
  process.stdout.write(`${rows.join('\n')}\n\n`);
  process.stdout.write('EXPECTED BUCKETS: none — T42 is a byte-identity turn.\n');
  process.stdout.write(`UNNAMED:          ${counts.UNNAMED}\n`);
  process.exit(counts.UNNAMED === 0 ? 0 : 1);
} else {
  const d = dump();
  for (const cfg of STANDARD_CONFIGS) {
    process.stdout.write(`${cfg.id.padEnd(12)} drawers=${cfg.drawers ? 'yes' : 'no '}  ${d[cfg.id].sha256 || d[cfg.id].error}\n`);
  }
}
