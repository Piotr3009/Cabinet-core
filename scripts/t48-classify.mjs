#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT (turn 48, CLAUDE.md iron rule 2) ────────────
//
// T47's classifier, RE-HEADED rather than reused, because the header is the
// argument and the argument is this turn's. CLAUDE.md, 25.08:
//
//   *"BYTE-IDENTITY. `t48-classify` (copy `t47-classify.mjs`, runnable from
//   inside `scripts/` with its relative imports intact): six IDENTICAL,
//   UNNAMED=0. The six goldens carry no infill run, no LED and no slope, so
//   nothing here may move them. F1 is the one that could: if the floor clamp
//   shifts a golden, that golden HAS a part below its own floor today — that
//   is a FINDING, not a licence. STOP that feature, write the finding into the
//   PR, and ship the clamp gated so the goldens stay byte-identical until the
//   owner rules."*
//
// So tonight's claim is not "the engine is closed" — F2 opens it, and opens it
// on a part the six DO cut. It is four sentences, one per feature that could
// reach a golden, and each of them is checkable by reading one function:
//
//   F1  THE FLOOR IS LAW.  The clamp is a PURE FUNCTION in `engine/items.js`
//       (`floorClampedPos`, born beside `centredShelfPos` because it is the
//       same station) and it is applied where an ELEMENT IS PLACED — the
//       store's one item station. `computeCabinet()` never calls it. A golden
//       is `defaultParamsFor()` handed straight to the engine and has no store
//       and no items at all, so the law cannot reach one. If it does, the
//       sentence above is what happens.
//
//   F2  THE TOP INFILL IS TWO BOARDS.  It is emitted under `if (runInfill)`,
//       and `runInfill` is `soloRun(Number(params?.top_infill_mm) || 0, …)`,
//       which answers null below `autoParts.topInfill.minHeight` (10).
//       `defaultParamsFor()` states no `top_infill_mm` for any of the six, so
//       `Number(undefined) || 0` is 0, `soloRun` is null and the whole block
//       is skipped. `--infill` below prints that census rather than asserting
//       it from memory.
//
//   F3  THE PLINTH DEFAULTS ON.  In the STORE's create path, never in
//       `defaultParamsFor()`. The goldens read the defaults.
//
//   F4/F5  THE GROOVE.  Cut in `lib/ledGroove.js`, off the placed lines, after
//       the engine has finished — T45's decision, kept for T45's reason.
//
// ─── THE GATE LEAKED ONCE, AND THIS IS WHAT CAUGHT IT ───────────────────────
//
// Worth keeping, because it is the whole reason rule 2 asks for a script rather
// than for care. T46's F3 needed the TOP board's socket row to be able to land
// part-way up a side panel, so `sidePanelGeometry` gained `topAt = null`. The
// guard was written `Number.isFinite(Number(topAt)) ? Number(topAt) : h` — and
// `Number(null)` is 0, not NaN. All six configs moved at once: every top socket
// row and every top screw in the app dropped to the floor. The classifier
// printed it on the first run. The fix is the house's own idiom — ask "has
// anybody said" BEFORE reading the number.
//
// Usage — the same three lines every classifier in this house has taken:
//
//     node scripts/t48-classify.mjs --dump > /tmp/base.json     # on the base
//     node scripts/t48-classify.mjs --dump > /tmp/head.json     # on the branch
//     node scripts/t48-classify.mjs /tmp/base.json /tmp/head.json
//
// `--census` prints T42's rail census, re-run rather than remembered.
// `--infill` is TONIGHT's own: the top-infill census, which is the proof of
// the F2 sentence above — every one of the six is asked whether it emits an
// INFILL-T part at all, and the answer has to be no six times.
// `--cut` is the other half of the slope claim, kept exactly as T47 left it —
// each of the six computed WITH a fixture cut, so a gate that lets nothing
// through when it is shut is shown to let the cut through when it is open.
//
// Zero dependencies beyond the engine and node:crypto.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';

// The six standard configs are T34's through T46's, unchanged — the same set,
// so a T46 dump and a T47 dump are directly comparable. They are re-stated here
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

/**
 * THE TOP-INFILL CENSUS — tonight’s own, and the proof of the F2 sentence in
 * the header. F2 rewrites the piece the run emits over a cabinet’s head, and
 * that piece is the only thing this turn touches that a golden could ever cut.
 * So each of the six is asked the two questions that decide it: what does it
 * state for the top infill, and how many INFILL parts does it come back with.
 * Six zeroes is the claim; a single non-zero voids it.
 */
export function infillCensus() {
  return STANDARD_CONFIGS.map((cfg) => {
    const params = { ...defaultParamsFor(cfg.id, P), unit_num: '01' };
    const result = computeCabinet(params, P);
    const infills = result.panels.filter((p) => p.part === 'INFILL');
    return {
      id: cfg.id,
      said: params.top_infill_mm ?? null,
      parts: infills.map((p) => p.id),
      run: params.run_top_infill ?? null,
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
  } else if (argv.includes('--infill')) {
    process.stdout.write('THE TOP-INFILL CENSUS — why F2 may rewrite the piece without moving a golden\n\n');
    process.stdout.write(`${'config'.padEnd(12)}${'top_infill_mm'.padEnd(16)}${'run_top_infill'.padEnd(17)}INFILL parts\n`);
    let clean = true;
    for (const row of infillCensus()) {
      if (row.said || row.run || row.parts.length) clean = false;
      process.stdout.write(
        `${row.id.padEnd(12)}${String(row.said ?? '(unstated)').padEnd(16)}`
        + `${String(row.run ?? '(none)').padEnd(17)}`
        + `${row.parts.length ? row.parts.join(',') : '[]'}\n`,
      );
    }
    process.stdout.write(`\n${clean
      ? 'CLEAN — not one of the six states a top infill, and not one of them cuts an INFILL part. F2 cannot reach them.'
      : 'NOT CLEAN — a config carries a top infill; F2 rewrites the piece it cuts and the byte-identity claim is void.'}\n`);
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
    // ─── THE OTHER HALF OF THE CLAIM ─────────────────────────────────────────
    // A gate is only a gate if it OPENS. Each of the six is computed twice —
    // once as it ships, once with a fixture ceiling line — and what moves is
    // printed. Anything that prints "unchanged" here is a config the cut never
    // reached, which is a fault of the opposite kind and just as worth knowing.
    //
    // T47's fixture is the shape T46 could not hold: FLAT over the first third
    // of the cabinet's width and then FALLING to 55 % of its height. A straight
    // line between the two edges would cut that cabinet at an angle the wall
    // does not have, which is the defect this turn exists to fix — so the gate
    // test opens on a KNEE, not on a diagonal.
    const cutFor = (h, w) => ({
      pts: [
        { x: 0, y: Math.round(h + 200) },
        { x: Math.round(w / 3), y: Math.round(h + 200) },
        { x: Math.round(w), y: Math.round(h * 0.55) },
      ],
      infill: 40,
    });
    process.stdout.write('THE GATE, OPEN — each config with a fixture slope_cut that is FLAT '
      + 'for a third of its width and then falls to 55 % of its height, infill 40\n\n');
    process.stdout.write(`${'config'.padEnd(12)}${'BUL h'.padStart(9)}${'BUR h'.padStart(9)}`
      + `${'TOP ids'.padStart(22)}${'BACK h'.padStart(9)}${'BACK pts'.padStart(10)}`
      + `${'FRONT pts'.padStart(11)}  verdict\n`);
    let moved = 0;
    for (const cfg of STANDARD_CONFIGS) {
      const params = { ...defaultParamsFor(cfg.id, P), unit_num: '01' };
      const plain = computeCabinet(params, P);
      const sloped = computeCabinet({
        ...params,
        slope_cut: cutFor(Number(params.height) || 0, Number(params.width) || 0),
      }, P);
      const of = (r, id) => r.panels.find((p) => p.id === id) || null;
      const front = sloped.panels.find((p) => p.role === 'front');
      const tops = sloped.panels.filter((p) => p.role === 'top').map((p) => p.id).join(',') || '—';
      const changed = canonical(plain) !== canonical(sloped);
      if (changed) moved += 1;
      const n = (v) => (v == null ? '—' : String(Math.round(v * 100) / 100));
      process.stdout.write(
        `${cfg.id.padEnd(12)}${n(of(sloped, 'BUL')?.h).padStart(9)}`
        + `${n(of(sloped, 'BUR')?.h).padStart(9)}`
        + `${tops.padStart(22)}`
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
    process.stdout.write('EXPECTED BUCKETS: none — F1 places ELEMENTS and a golden has none; F2 is gated on `top_infill_mm`, which no config states; F3 lives in the store.\n');
    process.stdout.write(`UNNAMED:          ${counts.UNNAMED}\n`);
    process.exit(counts.UNNAMED === 0 ? 0 : 1);
  } else {
    const d = dump();
    for (const cfg of STANDARD_CONFIGS) {
      process.stdout.write(`${cfg.id.padEnd(12)} drawers=${cfg.drawers ? 'yes' : 'no '}  ${d[cfg.id].sha256 || d[cfg.id].error}\n`);
    }
  }
}
