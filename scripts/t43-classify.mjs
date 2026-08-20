#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT (turn 43, CLAUDE.md iron rule 2) ────────────
//
// T34, T35 and T36 each wrote down, IN ADVANCE, the named buckets their
// engine-law changes were allowed to move in the BARE `computeCabinet()` answer
// for the six standard configs. T37 through T42 named NONE, and THIS TURN NAMES
// NONE EITHER — with one sentence of CLAUDE.md's own added on top of the usual
// one:
//
//   *"`computeCabinet` is not in any feature's blast radius; NO ADDITIVE FIELDS
//   EITHER — three of the six configs carry drawers, so even an 'innocent'
//   published extra would move their bytes."*
//
// That sentence is the whole reason this file is re-headed rather than reused:
// T43 draws DRAWERS, LEGS and SECTIONS, and the obvious way to draw a drawer
// box or a section depth would have been to publish one more number off the
// engine. Every one of those numbers is a PANEL BOX that `computeCabinet`
// already publishes, and the one quantity that is not — the runner's nominal
// length — is asked of `engine/runners.js runnerAskFor`, the module that has
// owned it since T42-F2.
//
// ─── WHY BYTE-IDENTITY SURVIVES SEVEN FEATURES ──────────────────────────────
//
//   F1 /1 IS FRONTS       `drawings/frontElevation.js` — a READER of an
//                         already-computed result. Arguments in, entities out.
//   F2 THE SHAKER'S MM    `engine/shaker.js` was already the law; what changed
//                         is that the DRAWINGS now hand it the project. The
//                         engine's own shaker path is untouched.
//   F3 DRAWERS AND LEGS   `drawings/views.js` — the drawer boxes are the
//                         published `DRAWER-SIDE` panels, grouped; the legs are
//                         the published `assemblies.legs`.
//   F4 THE PEN MAP        one word per drawing ENTITY. `layers.js`'s table is
//                         not edited at all.
//   F5 THE SECTIONS       `drawings/section.js` — the ZY projection of the same
//                         panel boxes the elevation projects on XY.
//   F6 THE PROOF KITCHEN  a fixture and a probe. No src change of its own.
//   F7 THE STAND-IN DIES  `3d/Hardware.jsx` (a view) and `engine/checks.js` (a
//                         reader that returns a list and refuses nothing).
//
// None of the seven is upstream of a panel box. If any of the six moves a byte,
// something in that list reached where it was told not to — stop it and note it.
//
// Usage — the same three lines every classifier in this house has taken:
//
//     node scripts/t43-classify.mjs --dump > /tmp/base.json     # on main
//     node scripts/t43-classify.mjs --dump > /tmp/head.json     # on the branch
//     node scripts/t43-classify.mjs /tmp/base.json /tmp/head.json
//
// `--census` prints the rail/overlay census T42 added, re-run rather than
// remembered, because a header that records a measurement somebody took once is
// a header that goes stale the first time a default moves.
//
// Zero dependencies beyond the engine and node:crypto.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';

// The six standard configs are T34's through T42's, unchanged — the same set,
// so a T42 dump and a T43 dump are directly comparable. They are re-stated here
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
 * THE RAIL CENSUS — asked of the engine rather than of a comment, exactly as
 * T42 left it. A header that records a measurement somebody took once is a
 * header that goes stale the first time a default moves, so this runs it every
 * time and `--census` prints it.
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
 * T43's own temptation is the ADDITIVE FIELD, and CLAUDE.md forbids it by name:
 * a published extra would be invisible to a diff of behaviour and fatal to a
 * diff of bytes, and three of the six carry drawers.
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
  process.stdout.write('EXPECTED BUCKETS: none — T43 is a byte-identity turn, additive fields included.\n');
  process.stdout.write(`UNNAMED:          ${counts.UNNAMED}\n`);
  process.exit(counts.UNNAMED === 0 ? 0 : 1);
} else {
  const d = dump();
  for (const cfg of STANDARD_CONFIGS) {
    process.stdout.write(`${cfg.id.padEnd(12)} drawers=${cfg.drawers ? 'yes' : 'no '}  ${d[cfg.id].sha256 || d[cfg.id].error}\n`);
  }
}
