#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT (turn 46, CLAUDE.md iron rule 2) ────────────
//
// T45's classifier, RE-HEADED rather than reused, because the header is the
// argument and the argument is this turn's, not last turn's. CLAUDE.md, 24.08:
//
//   *"BYTE-IDENTITY. All engine work is GATED on a `slopeCut` input no config
//   carries: `t46-classify` — six IDENTICAL, UNNAMED=0. If one moves, the gate
//   leaks: stop, note."*
//
// Tonight is the first turn since T33 that OPENS `src/engine/**` — F3 cuts the
// carcass, F4 cuts the front, F5 cuts the interior — so the contract is not
// "the engine is closed" this time. It is one sentence, and it is stronger for
// being narrow:
//
//   EVERY CUT IS GATED ON `params.slope_cut`, AND NO CONFIG CARRIES ONE.
//
// `normaliseSlopeCut()` answers `null` to anything that is not a pair of real
// heights, `defaultParamsFor()` states no such key, and every expression under
// the gate falls back — by `?:`, by identity, or by a `Map` that is never
// built — to the number it evaluated to yesterday. `trimGeometryOnSlope`
// returns its ARGUMENT when there is nothing to trim, so an uncut panel's
// outline is not merely equal to yesterday's, it is the same array.
//
// ─── THE GATE LEAKED ONCE, AND THIS IS WHAT CAUGHT IT ───────────────────────
//
// Worth writing down, because it is the whole reason rule 2 asks for a script
// rather than for care. F3 needed the TOP board's socket row to be able to
// land part-way up a side panel (under a slope the top drops to the low end),
// so `sidePanelGeometry` gained `topAt = null`. The guard was written
// `Number.isFinite(Number(topAt)) ? Number(topAt) : h` — and `Number(null)` is
// 0, not NaN. All six configs moved at once: every top socket row and every
// top screw in the app dropped to the floor. The classifier printed it on the
// first run, before a line of F3 proper existed. The fix is the house's own
// idiom — ask "has anybody said" BEFORE reading the number — and this file is
// the only reason it took a minute rather than a morning.
//
// ─── WHY BYTE-IDENTITY SURVIVES A TURN THAT CUTS THE CARCASS ────────────────
//
//   F1 THE WALL CLOSES     `lib/slopeLine.js` + `3d/Room.jsx`. Nothing under
//                          `src/engine/` is upstream of a panel box; the room
//                          is drawn, not cut.
//   F2 THE ARRIVAL LAW     `clampUnitX` takes an OPTIONAL `slopeLimit`. Null
//                          for every unit on every wall with no slope, and the
//                          two lines it feeds do nothing. It is also not on
//                          `computeCabinet`'s road at all.
//   F3 THE CARCASS         gated on `cfg.slopeCut`. Sides, top, back and the
//                          drill guard each fall back to `H` when it is null.
//   F4 THE FRONT           the same gate, one branch further down.
//   F5 THE INTERIOR        the same gate again: no cut, no shelf refused, no
//                          rail shortened, no drawer stack questioned.
//   F6 PAPER AND EYES      readers. The 3-D and the sheets draw the engine's
//                          own panels and add no geometry of their own.
//
// If ANY of the six moves, a cut reached where it was told not to. Stop that
// cut and note it — that is the rule, and it has already been used once.
//
// Usage — the same three lines every classifier in this house has taken:
//
//     node scripts/t46-classify.mjs --dump > /tmp/base.json     # on the base
//     node scripts/t46-classify.mjs --dump > /tmp/head.json     # on the branch
//     node scripts/t46-classify.mjs /tmp/base.json /tmp/head.json
//
// `--census` prints T42's rail census, re-run rather than remembered.
// `--cut` is this turn's own: it computes each of the six WITH a fixture
// `slope_cut` and prints what moves, which is the other half of the claim —
// a gate that lets nothing through when it is shut has to let the cut through
// when it is open, or it is not a gate, it is a wall.
//
// Zero dependencies beyond the engine and node:crypto.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

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

// ─── THE CLI, AND ONLY WHEN IT IS THE CLI ───────────────────────────────────
// The exports above are imported by the suite; the block below is what a
// terminal runs. Without this guard, `node --test` would import this file, hit
// a `process.exit` at module scope and take the test runner down with it — a
// script that kills its own proof is a script nobody runs twice.
const IS_CLI = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (IS_CLI) {
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
  } else if (argv.includes('--cut')) {
    // ─── THE OTHER HALF OF THE CLAIM ─────────────────────────────────────────
    // A gate is only a gate if it OPENS. Each of the six is computed twice —
    // once as it ships, once with a fixture ceiling line 2400 → 1200 across its
    // own width — and what moves is printed. Anything that prints "unchanged"
    // here is a config the cut never reached, which is a fault of the opposite
    // kind and just as worth knowing.
    // A cut proportional to the config's OWN height, because a 770 mm base
    // unit under a 1200 mm ceiling is not cut and should not be — the gate
    // opening is the claim, not the arithmetic of one fixture number.
    const cutFor = (h) => ({ y0: Math.round(h + 200), y1: Math.round(h * 0.55), infill: 40 });
    process.stdout.write('THE GATE, OPEN — each config with a fixture slope_cut '
      + 'of (its own height + 200) → (55 % of it), infill 40\n\n');
    process.stdout.write(`${'config'.padEnd(12)}${'BUL h'.padStart(9)}${'BUR h'.padStart(9)}`
      + `${'TOP y'.padStart(9)}${'BACK h'.padStart(9)}${'BACK pts'.padStart(10)}`
      + `${'FRONT pts'.padStart(11)}  verdict\n`);
    let moved = 0;
    for (const cfg of STANDARD_CONFIGS) {
      const params = { ...defaultParamsFor(cfg.id, P), unit_num: '01' };
      const plain = computeCabinet(params, P);
      const sloped = computeCabinet({ ...params, slope_cut: cutFor(Number(params.height) || 0) }, P);
      const of = (r, id) => r.panels.find((p) => p.id === id) || null;
      const front = sloped.panels.find((p) => p.role === 'front');
      const changed = canonical(plain) !== canonical(sloped);
      if (changed) moved += 1;
      const n = (v) => (v == null ? '—' : String(Math.round(v * 100) / 100));
      process.stdout.write(
        `${cfg.id.padEnd(12)}${n(of(sloped, 'BUL')?.h).padStart(9)}`
        + `${n(of(sloped, 'BUR')?.h).padStart(9)}`
        + `${n(of(sloped, 'TOP')?.box?.y).padStart(9)}`
        + `${n(of(sloped, 'BACK')?.h).padStart(9)}`
        + `${n(of(sloped, 'BACK')?.cnc?.outline?.length).padStart(10)}`
        + `${n(front?.cnc?.outline?.length).padStart(11)}`
        + `  ${changed ? 'CUT' : 'unchanged ←'}\n`,
      );
    }
    process.stdout.write(`\n${moved}/${STANDARD_CONFIGS.length} configs are cut when the gate is open.\n`);
    process.exit(moved === STANDARD_CONFIGS.length ? 0 : 1);
  } else if (argv.length >= 2) {
    const base = JSON.parse(readFileSync(argv[0], 'utf8'));
    const head = JSON.parse(readFileSync(argv[1], 'utf8'));
    const { rows, counts } = classify(base, head);
    process.stdout.write(`${rows.join('\n')}\n\n`);
    process.stdout.write('EXPECTED BUCKETS: none — every T46 cut is gated on `params.slope_cut`, and no config carries one.\n');
    process.stdout.write(`UNNAMED:          ${counts.UNNAMED}\n`);
    process.exit(counts.UNNAMED === 0 ? 0 : 1);
  } else {
    const d = dump();
    for (const cfg of STANDARD_CONFIGS) {
      process.stdout.write(`${cfg.id.padEnd(12)} drawers=${cfg.drawers ? 'yes' : 'no '}  ${d[cfg.id].sha256 || d[cfg.id].error}\n`);
    }
  }
}
