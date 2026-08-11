#!/usr/bin/env node
// ─── THE PROOF OF INNOCENCE (turn 24, CLAUDE.md F4) ─────────────────────────
//
// F4 removes `puzzle.centrelineExtra`, and that is a GLOBAL named delta: every
// DXF in the app that contains a screw axis shifts that axis by −0.5.
//
// A fingerprint cannot prove such a thing innocent. A fingerprint says "this
// file changed", and on a turn where two thousand files change it says nothing
// at all. CLAUDE.md F4.2 therefore asks for the one check that CAN:
//
//   "The proof of innocence: the per-entity probe diff between baseline and
//    turn must classify as EXACTLY `axis coordinate −0.5` on screw classes and
//    NOTHING else — no count changes, no other layers, no geometry."
//
// So this walks EVERY entity of EVERY per-panel DXF of every probe case, pairs
// the baseline's with this branch's, and puts each pair in exactly one bucket:
//
//   SAME         byte-for-byte the same entity
//   AXIS         the same entity with ONE axis moved by exactly 0.5 mm, on a
//                screw/socket class
//   OTHER        anything else — a different layer, a different size, a
//                different count, a moved outline, a changed label
//
// A green run is `OTHER 0` **and** no count change on any file. Anything in
// OTHER is the delta not being what it says it is, and the script exits 1.
//
//     node scripts/cnc-axis-classifier.mjs --dump > /tmp/head.txt
//     (cd <baseline> && node scripts/cnc-axis-classifier.mjs --dump > /tmp/base.txt)
//     node scripts/cnc-axis-classifier.mjs /tmp/base.txt /tmp/head.txt
//
// It shares `cases()` with `scripts/cnc-delta-probe.mjs` so both scripts ask
// the engine the SAME questions; a classifier that swept a different set of
// cabinets than the probe would be a second opinion rather than a proof.
//
// Zero dependencies beyond the engine.

import { readFileSync } from 'node:fs';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { buildUnitDxfFiles, parseDxf } from '../src/engine/cnc/dxf.js';
import { cases } from './cnc-delta-probe.mjs';

/**
 * The classes an AXIS may legitimately move on.
 *
 * A screw driven into the EDGE of a board and the socket that receives a tab
 * are the two things `centrelineExtra` was on. Everything else in the app —
 * the outline, the dog bones, the hinge patterns, the shelf pins, the labels —
 * must not move by so much as a micrometre, and this list is what makes that
 * a machine-checked statement rather than a promise.
 */
export const AXIS_LAYERS = new Set([
  P.puzzle.layers.screw,        // SCREWS_3MM
  P.puzzle.layers.socket,       // PUZZLE_SOCKET
  P.puzzle.layers.socketHole,   // PUZZLE_HOLES_7_5MM
]);

/** The shift F4 makes, in millimetres. One number, and it is the whole delta. */
export const AXIS_SHIFT_MM = 0.5;

const num = (n) => {
  const s = Number(n).toFixed(4).replace(/\.?0+$/, '');
  return s === '-0' ? '0' : s;
};

/** One entity as a line of text — everything a cutter would notice. */
export function describe(e) {
  if (e.type === 'poly') {
    return `poly ${e.layer} ${e.closed ? 'closed' : 'open'} ${e.pts.map(([x, y]) => `${num(x)},${num(y)}`).join(' ')}`;
  }
  if (e.type === 'circle') return `circle ${e.layer} ${num(e.cx)},${num(e.cy)} r${num(e.r)}`;
  return `text ${e.layer}|${e.str}|${num(e.h)}|${num(e.x)},${num(e.y)}`;
}

/** Every entity of every per-panel DXF of every probe case, in a stable order. */
export function dump() {
  const out = [];
  for (const { id: type, params } of cases()) {
    let result;
    try {
      result = computeCabinet(params, P);
    } catch {
      continue;                       // a kit this checkout does not have
    }
    for (const f of buildUnitDxfFiles(result, P)) {
      const parsed = parseDxf(f.dxf);
      parsed.entities.forEach((e, i) => {
        out.push(`${type}\t${f.name}\t${i}\t${describe(e)}`);
      });
    }
  }
  return out;
}

/** A dump line, split back into its key and its entity. */
export function parseDumpLine(line) {
  const [type, file, index, ...rest] = line.split('\t');
  return { key: `${type}\t${file}\t${index}`, type, file, index: Number(index), entity: rest.join('\t') };
}

const numbersOf = (text) => (text.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);

/**
 * The layer an entity line names — the second word for a poly/circle, and the
 * field after the first `|` for a text.
 */
export function layerOf(entity) {
  const kind = entity.split(' ')[0];
  if (kind === 'text') return entity.slice('text '.length).split('|')[0];
  return entity.split(' ')[1];
}

/**
 * WHICH BUCKET one pair belongs in.
 *
 * The test is deliberately strict about the SHAPE of the move as well as its
 * size: an entity qualifies as an AXIS shift only if it is the same kind, on
 * the same layer, with the same number of coordinates, and every coordinate
 * that moved at all moved by exactly ±`AXIS_SHIFT_MM` in the SAME direction.
 * A pocket whose two inner corners slid 0.5 mm passes; a pocket that also got
 * 0.3 mm wider does not.
 *
 * @returns {{bucket:'SAME'|'AXIS'|'OTHER', layer:string, why:string|null}}
 */
export function classifyPair(before, after, shift = AXIS_SHIFT_MM) {
  const layer = layerOf(before);
  if (before === after) return { bucket: 'SAME', layer, why: null };

  const kindA = before.split(' ')[0];
  const kindB = after.split(' ')[0];
  if (kindA !== kindB) return { bucket: 'OTHER', layer, why: 'the entity changed kind' };
  if (layer !== layerOf(after)) return { bucket: 'OTHER', layer, why: 'the entity changed layer' };
  if (!AXIS_LAYERS.has(layer)) return { bucket: 'OTHER', layer, why: `${layer} is not a screw or socket class` };
  // A TEXT that changed is never an axis: F4 does not touch the lettering.
  if (kindA === 'text') return { bucket: 'OTHER', layer, why: 'a label changed' };
  // The `closed` flag and the point COUNT are part of the shape.
  if (before.replace(/-?\d+(?:\.\d+)?/g, '#') !== after.replace(/-?\d+(?:\.\d+)?/g, '#')) {
    return { bucket: 'OTHER', layer, why: 'the entity changed shape' };
  }

  // ─── A RADIUS IS NOT AN AXIS ─────────────────────────────────────────────
  // A ⌀3 screw that became a ⌀4 screw has "moved a number by 0.5" and is a
  // different hole. The radius is compared on its own, first, so no size
  // change can ever be dressed up as a position.
  if (kindA === 'circle') {
    const r = (line) => line.slice(line.lastIndexOf(' r') + 2);
    if (r(before) !== r(after)) return { bucket: 'OTHER', layer, why: 'the hole changed diameter' };
  }

  const a = numbersOf(before);
  const b = numbersOf(after);
  if (a.length !== b.length) return { bucket: 'OTHER', layer, why: 'a different number of coordinates' };

  const moves = new Set();
  for (let i = 0; i < a.length; i += 1) {
    const d = Math.round((b[i] - a[i]) * 1e6) / 1e6;
    if (d !== 0) moves.add(d);
  }
  if (!moves.size) return { bucket: 'SAME', layer, why: null };
  if (moves.size > 1) return { bucket: 'OTHER', layer, why: `${moves.size} different deltas in one entity` };
  const [delta] = [...moves];
  if (Math.abs(delta) !== shift) {
    return { bucket: 'OTHER', layer, why: `moved by ${delta}, not ${shift}` };
  }
  return { bucket: 'AXIS', layer, why: null };
}

/**
 * The whole classification, as a report.
 *
 * @returns {{total:number, same:number, axis:number, other:number,
 *            byLayer:object, added:string[], removed:string[],
 *            offenders:Array<{key:string, why:string, before:string, after:string}>}}
 */
export function classify(baseLines, headLines) {
  const base = new Map(baseLines.filter(Boolean).map((l) => {
    const row = parseDumpLine(l);
    return [row.key, row.entity];
  }));
  const head = new Map(headLines.filter(Boolean).map((l) => {
    const row = parseDumpLine(l);
    return [row.key, row.entity];
  }));

  const report = {
    total: 0,
    same: 0,
    axis: 0,
    other: 0,
    byLayer: {},
    // A COUNT change is its own kind of failure and is reported apart: an
    // entity that only exists on one side has no pair to classify, and
    // "no count changes" is half of what F4.2 asks to be proved.
    added: [...head.keys()].filter((k) => !base.has(k)),
    removed: [...base.keys()].filter((k) => !head.has(k)),
    offenders: [],
  };

  for (const [key, before] of base) {
    const after = head.get(key);
    if (after === undefined) continue;
    report.total += 1;
    const { bucket, layer, why } = classifyPair(before, after);
    if (bucket === 'SAME') { report.same += 1; continue; }
    if (bucket === 'AXIS') {
      report.axis += 1;
      report.byLayer[layer] = (report.byLayer[layer] || 0) + 1;
      continue;
    }
    report.other += 1;
    if (report.offenders.length < 20) report.offenders.push({ key, why, before, after });
  }
  return report;
}

/** The report, as the lines that go into `verify/t24/cnc-export-identity.md`. */
export function summarise(report) {
  const lines = [];
  lines.push(`entities compared            ${report.total}`);
  lines.push(`identical                    ${report.same}`);
  lines.push(`axis shift ±${AXIS_SHIFT_MM} mm          ${report.axis}`);
  lines.push(`OTHER (must be 0)            ${report.other}`);
  lines.push(`entities added   (must be 0) ${report.added.length}`);
  lines.push(`entities removed (must be 0) ${report.removed.length}`);
  lines.push('');
  lines.push('every class that moved:');
  for (const layer of Object.keys(report.byLayer).sort()) {
    lines.push(`  ${String(report.byLayer[layer]).padStart(6)}  ${layer}`);
  }
  if (report.offenders.length) {
    lines.push('');
    lines.push('OFFENDERS:');
    for (const o of report.offenders) {
      lines.push(`  ${o.key}  — ${o.why}`);
      lines.push(`      was  ${o.before}`);
      lines.push(`      now  ${o.after}`);
    }
  }
  return lines.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--dump') {
    for (const line of dump()) process.stdout.write(`${line}\n`);
    return;
  }
  if (args.length !== 2) {
    process.stderr.write('usage: cnc-axis-classifier.mjs --dump | <baseline-dump> <head-dump>\n');
    process.exitCode = 2;
    return;
  }
  const read = (p) => readFileSync(p, 'utf8').split('\n');
  const report = classify(read(args[0]), read(args[1]));
  process.stdout.write(`${summarise(report)}\n`);
  const clean = report.other === 0 && !report.added.length && !report.removed.length;
  process.stdout.write(`\n${clean ? 'UNIFORM — the delta is exactly what it is named' : 'NOT UNIFORM'}\n`);
  if (!clean) process.exitCode = 1;
}

if (process.argv[1] && process.argv[1].endsWith('cnc-axis-classifier.mjs')) main();
