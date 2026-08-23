#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT (turn 44, CLAUDE.md iron rule 2) ────────────
//
// T43's classifier, RE-HEADED rather than reused, because the header is the
// argument and the argument is this turn's, not last turn's. CLAUDE.md, 23.08:
//
//   *"BYTE-IDENTITY — this is a UI/store turn. `computeCabinet()` and
//   `src/engine/**` are untouched, byte for byte. `t44-classify` (T43's,
//   re-headed): six IDENTICAL, UNNAMED=0."*
//
// Note what that sentence forbids that T43's did not: not only the ENGINE's
// answer but the ENGINE'S SOURCE. T43 was allowed to reach into `src/engine/`
// as long as the six configs came out the same; tonight the directory is shut.
// `git diff --stat -- src/engine/` on this branch is the other half of this
// file's claim, and it is empty.
//
// ─── WHY BYTE-IDENTITY SURVIVES EIGHT FEATURES ──────────────────────────────
//
//   F1 ONE WALL FIRST     a wall ELEVATION editor. Doors and windows are
//                         `room.openings` — the Room path's own records,
//                         written through `setRoom`, which no cabinet reads.
//                         The SLOPE is a new project-level list whose only
//                         reader is `lib/wallElements.js` and the editor
//                         drawing it. Nothing in it reaches a panel box.
//   F2 THE TABBED SHELL   `lib/wizardTabs.js` — a declarative tree and a
//                         filter. It decides what is DRAWN, never what is cut,
//                         and it imports nothing from `src/engine/` at all.
//   F3 USTAWIENIA         two fields made read-only, one dropdown, and a SEED:
//                         a wardrobe's 2100/100 are written onto the PROJECT
//                         through `setProjectHeights`. The profile's own 2150
//                         is untouched, which is why the six do not move —
//                         `defaultParamsFor` reads the profile, never a job.
//   F4 THE PICKER         `MaterialChoicePanel` — a view over
//                         `egger-decors.json`, `getVeneers()` and the RAL/F&B
//                         lists. Every write goes through the SAME setters the
//                         15.08 rebuild used.
//   F5 FRONTS + SHINE     `lib/frontOpening.js` translates four buttons into
//                         three fields the design already carried
//                         (`fronts.handle`, `fronts.style`, `runners.variant`).
//                         The shine is `design.sheen`, and the roughness
//                         formula it feeds is `engine/design.js`'s, unedited.
//   F6 HARDWARE           relocated rows and one `audience` prop. Same setters.
//   F7 PRODUKCJA          the SAME `thicknessSlotRows()` rows and the SAME
//                         `setSlotThickness`, grouped by material instead of
//                         piled. A grouping is a `.map`.
//   F8 THE SET            `cc_settings_sets` — a table, a modal and a payload.
//                         The payload is `migrateDesign(design)`, which is a
//                         read.
//
// None of the eight is upstream of a panel box. If any of the six moves a byte,
// something in that list reached where it was told not to — stop it and note it.
//
// Usage — the same three lines every classifier in this house has taken:
//
//     node scripts/t44-classify.mjs --dump > /tmp/base.json     # on main
//     node scripts/t44-classify.mjs --dump > /tmp/head.json     # on the branch
//     node scripts/t44-classify.mjs /tmp/base.json /tmp/head.json
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

// The six standard configs are T34's through T43's, unchanged — the same set,
// so a T43 dump and a T44 dump are directly comparable. They are re-stated here
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
 * T44's own temptation is a DEFAULT. F3 hands a wardrobe 2100 mm and a 100 mm
 * plinth, and the obvious place to put those is `engine/profile.js` — where
 * `defaultParamsFor` would read them, and where three of the six would come out
 * a different height. So they are written onto the PROJECT instead, through the
 * setter every other height already uses, and the workshop's own 2150 stands.
 * That decision is the reason this file still prints six IDENTICAL.
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
  process.stdout.write('EXPECTED BUCKETS: none — T44 is a byte-identity turn, additive fields included.\n');
  process.stdout.write(`UNNAMED:          ${counts.UNNAMED}\n`);
  process.exit(counts.UNNAMED === 0 ? 0 : 1);
} else {
  const d = dump();
  for (const cfg of STANDARD_CONFIGS) {
    process.stdout.write(`${cfg.id.padEnd(12)} drawers=${cfg.drawers ? 'yes' : 'no '}  ${d[cfg.id].sha256 || d[cfg.id].error}\n`);
  }
}
