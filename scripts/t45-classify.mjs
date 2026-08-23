#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT (turn 45, CLAUDE.md iron rule 2) ────────────
//
// T44's classifier, RE-HEADED rather than reused, because the header is the
// argument and the argument is this turn's, not last turn's. CLAUDE.md, 23.08:
//
//   *"BYTE-IDENTITY. Engine untouched EXCEPT F9-CNC, which is additive and
//   gated on LED lines existing — none of the six configs carries one, so
//   `t45-classify`: six IDENTICAL, UNNAMED=0. If a config moves, F9-CNC cut
//   wrong — stop it, note it."*
//
// So tonight's contract is T44's with ONE named door in it, and the door is
// bolted shut from the inside: the LED groove is only ever cut where a LED
// LINE has been placed, and `defaultParamsFor()` places none. The six standard
// configs therefore walk the same code they walked last night, and the sha256
// of each is the proof.
//
// `git diff --stat -- src/engine/` on this branch is the other half of the
// claim. It is EMPTY: the groove is born in `reference/lisp/` (iron rule 3)
// and applied in `src/lib/ledGroove.js` + the export layer, which is where a
// gated, additive cut belongs when the engine is closed.
//
// ─── WHY BYTE-IDENTITY SURVIVES NINE FEATURES ───────────────────────────────
//
//   F1 THE WALL            elevation DIMENSIONS (a drawing) and a TOP VIEW
//                          whose two new elements — recess and chimney — ride
//                          `project.wallElements` beside the room, exactly as
//                          T44's slope does. No cabinet reads either.
//   F2 THE TOGGLE DIES     `lib/appEntry.js` decides the audience from the
//                          ROUTE. It filters what is DRAWN and imports nothing
//                          from `src/engine/`.
//   F3 THE PICKER          a MODAL over the same `egger-decors.json`, the same
//                          `getVeneers()` and the same RAL/F&B lists, writing
//                          through the same setters. A window is not a cut.
//   F4 THE DUPLICATES      two surfaces removed and one step renamed. The
//                          joinery type still writes `design.joinery` from the
//                          Settings panel; the front shape still writes
//                          `fronts.style` from the per-front gallery.
//   F5 THE LOCK            `lib/pushToOpen.js` forces `runners.variant` to the
//                          soft-close 'S' when a handle is chosen. That field
//                          has existed since T18 and the BOM already reads it.
//   F6 PRODUCTION          a title line, and a relocated sheet-size row. Both
//                          are `.map`s over rows that already existed.
//   F7 VALIDATION          `lib/wizardConflicts.js` — a pure reader over the
//                          design, the heights and the room. It NAMES a
//                          conflict; it writes nothing.
//   F8 THE ENGLISH SWEEP   strings.
//   F9 LIGHTING            `project.ledSpec` (a lib-normalised record beside
//                          the room, like the wall elements) and
//                          `lib/ledDrivers.js`, a pure arithmetic over the
//                          strips the engine already computes. The 3D reads the
//                          same `stripsForUnit()` it always did.
//
// None of the nine is upstream of a panel box. If any of the six moves a byte,
// F9-CNC reached where it was told not to — stop it and note it.
//
// Usage — the same three lines every classifier in this house has taken:
//
//     node scripts/t45-classify.mjs --dump > /tmp/base.json     # on main
//     node scripts/t45-classify.mjs --dump > /tmp/head.json     # on the branch
//     node scripts/t45-classify.mjs /tmp/base.json /tmp/head.json
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

// The six standard configs are T34's through T44's, unchanged — the same set,
// so a T44 dump and a T45 dump are directly comparable. They are re-stated here
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
 * T45's own temptation is F9-CNC. A groove is a CUT, and the obvious place to
 * cut it is `engine/machining.js`, where every one of the six would then be
 * asked whether it carries a LED line. It is cut in `lib/ledGroove.js` instead,
 * off the placed lines and nowhere else, so a cabinet with no line is a cabinet
 * the feature never touches. That decision is the reason this file still prints
 * six IDENTICAL.
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
  process.stdout.write('EXPECTED BUCKETS: none — T45 is a byte-identity turn; F9-CNC is gated on a placed LED line.\n');
  process.stdout.write(`UNNAMED:          ${counts.UNNAMED}\n`);
  process.exit(counts.UNNAMED === 0 ? 0 : 1);
} else {
  const d = dump();
  for (const cfg of STANDARD_CONFIGS) {
    process.stdout.write(`${cfg.id.padEnd(12)} drawers=${cfg.drawers ? 'yes' : 'no '}  ${d[cfg.id].sha256 || d[cfg.id].error}\n`);
  }
}
