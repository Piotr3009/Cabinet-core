#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT (turn 49, CLAUDE.md iron rule 2) ────────────
//
// T48's classifier, RE-HEADED rather than reused, because the header is the
// argument and the argument is this turn's. CLAUDE.md, 25.08:
//
//   *"BYTE-IDENTITY. `t49-classify` (copy `t48-classify.mjs`, runnable from
//   inside `scripts/`): six IDENTICAL, UNNAMED=0. **Nothing in this turn has
//   any business near the engine.** If a golden moves, something was edited
//   that should not have been — stop and say so."*
//
// So tonight's claim is the SHORTEST one this house has ever made, and it is
// the strongest: THE ENGINE IS NOT OPENED AT ALL. T48 had to argue four
// sentences because F1 placed elements and F2 rewrote a piece the six cut;
// T49 argues one, because every feature in it is a DIALOG:
//
//   F1  the scope opens on One Wall — a wizard default, `lib/wizardSteps.js`.
//   F2  the room's canned shapes leave the WIZARD's door — `RoomModal.jsx`.
//   F3  one navigation row at a time — two `.jsx` footers.
//   F4  the carcass asks once — the second STOP of a walk, `WizardSettings`.
//   F5  the fronts ask for types first — the same file, the same walk.
//   F6  the fronts' two dialogs become one — likewise.
//   F7  edit mode jumps — the tab strip's `disabled`, and a footer button.
//   F8  the wall dialog takes Flat — `lib/slopeFlat.js` + `WallElevationModal`,
//       and NOTHING about `ceilingAt`, the cut line or the engine changes.
//   F9  the sheen moves veneer — `src/3d/materials.js`, which is the VIEW.
//       It decides roughness for a picture; it cuts nothing and no golden
//       reads it (`computeCabinet` never imports `src/3d/**`).
//   F10 a BACKLOG line is deleted — a markdown file.
//
// Not one of those paths is `src/engine/**`, and `dump()` below is
// `defaultParamsFor()` handed straight to `computeCabinet()` with no store, no
// items, no design and no profile edit anywhere near it. Six IDENTICAL is
// therefore not a hope this turn holds its nerve — it is arithmetic. If a
// golden moves, THE FEATURE DID NOT DO IT: something was edited that this turn
// never named, and the answer is to stop and say so in the PR, not to name a
// bucket for it.
//
// ─── THE GATE LEAKED ONCE, AND THIS IS WHAT CAUGHT IT ───────────────────────
//
// Kept, because it is the whole reason rule 2 asks for a script rather than for
// care. T46's F3 needed the TOP board's socket row to be able to land part-way
// up a side panel, so `sidePanelGeometry` gained `topAt = null`. The guard was
// written `Number.isFinite(Number(topAt)) ? Number(topAt) : h` — and
// `Number(null)` is 0, not NaN. All six configs moved at once: every top socket
// row and every top screw in the app dropped to the floor. The classifier
// printed it on the first run. The fix is the house's own idiom — ask "has
// anybody said" BEFORE reading the number.
//
// Usage — the same three lines every classifier in this house has taken:
//
//     node scripts/t49-classify.mjs --dump > /tmp/base.json     # on the base
//     node scripts/t49-classify.mjs --dump > /tmp/head.json     # on the branch
//     node scripts/t49-classify.mjs /tmp/base.json /tmp/head.json
//
// `--census` prints T42's rail census and `--infill` T48's top-infill census,
// both re-run rather than remembered. `--cut` is T47's open-gate proof, kept
// exactly as it was: a gate is only a gate if it OPENS.
//
// `--survivors` is TONIGHT's own, and it answers iron rule 3 rather than rule
// 2: the two merged dialogs' controls, each one looked for BY ITS OWN DOM HOOK
// in the surface, so "nothing is lost, only moved" is a thing a terminal says
// rather than a thing a PR claims. The SHEET SIZE is the first row, because the
// owner named it as the danger himself.
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


/**
 * THE SURVIVORS' AUDIT — iron rule 3, asked of the file rather than of a memory.
 *
 * *"Before deleting any step, list every control it owns and show in the PR
 * where each one now lives … A control that quietly disappears is the failure
 * this turn is most likely to produce."*
 *
 * So every control the two removed stops owned is listed here with the DOM hook
 * it is stamped with, and the file is READ and searched for that hook. A hook
 * that is not there is a control that went missing, and the exit code says so.
 * The `now` column is where it lives after tonight, which is what the PR quotes.
 */
export const SURVIVORS = [
  // ── the carcasses' removed `sheets` stop (F4) ──
  {
    was: 'carcases · sheets',
    control: 'Sheet size (jumbo etc.)',
    hook: 'data-sheet-family=',
    file: 'src/components/SettingsPanel.jsx',
    now: 'carcases · the material dialog — under the stock board, in the same panel',
  },
  {
    was: 'carcases · sheets',
    control: 'Stock board select, per carcass type',
    hook: 'data-stock-board=',
    file: 'src/components/WizardSettings.jsx',
    now: 'carcases · the material dialog — where it has ALSO always been (this was the repeat)',
  },
  {
    was: 'carcases · sheets',
    control: 'Board thickness gate (recompute / keep)',
    hook: 'data-thickness-gate=',
    file: 'src/components/WizardSettings.jsx',
    now: 'carcases · the material dialog — it travels with the stock board select',
  },
  {
    was: 'carcases · sheets',
    control: 'The sheets node itself (audience: factory)',
    hook: "'carcases.sheets'",
    file: 'src/lib/wizardTabs.js',
    now: 'carcases · the material dialog — same node id, same audience, drawn one screen earlier',
  },
  // ── the fronts' removed `sheets` stop (F6) ──
  {
    was: 'fronts · sheets',
    control: 'Sheet size (jumbo etc.), fronts family',
    hook: 'data-sheet-family=',
    file: 'src/components/SettingsPanel.jsx',
    now: 'fronts · the colour dialog — under the stock board, in the same panel',
  },
  {
    was: 'fronts · sheets',
    control: 'Stock board select, per front type',
    hook: 'data-front-material=',
    file: 'src/components/WizardSettings.jsx',
    now: 'fronts · the colour dialog — where it has ALSO always been (this was the repeat)',
  },
  {
    was: 'fronts · sheets',
    control: 'Front thickness gate (recompute / keep)',
    hook: 'data-front-thickness-gate=',
    file: 'src/components/WizardSettings.jsx',
    now: 'fronts · the colour dialog — it travels with the stock board select',
  },
  {
    was: 'fronts · sheets',
    control: 'The fronts-sheets node (audience: factory)',
    hook: "'fronts.sheets'",
    file: 'src/lib/wizardTabs.js',
    now: 'fronts · the colour dialog — same node id, same audience, drawn one screen earlier',
  },
  // ── the fronts' counting step, stripped back to number + type (F5) ──
  {
    was: 'fronts · how many (the source strip)',
    control: 'Spraying / Veneer / Laminate',
    hook: 'data-source-seg=',
    file: 'src/components/WizardSettings.jsx',
    now: 'fronts · the colour dialog — the FULL-WIDTH category strip it has carried since T44',
  },
  // ── the wizard's room step, stripped of its canned shapes (F2) ──
  {
    was: 'wizard · room step',
    control: 'Rectangle / L-shape / + Box',
    hook: 'data-room-presets=',
    file: 'src/components/RoomModal.jsx',
    now: 'Settings ▸ Room setup — the same editor, the same buttons, the menu door only',
  },
];

export function survivors(readFile) {
  return SURVIVORS.map((s) => {
    let found = false;
    try { found = readFile(s.file).includes(s.hook); } catch { found = false; }
    return { ...s, found };
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
  } else if (argv.includes('--survivors')) {
    process.stdout.write("THE SURVIVORS' AUDIT — every control the two merged dialogs owned, and where it lives now\n\n");
    const rows = survivors((f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'));
    let lost = 0;
    for (const r of rows) {
      if (!r.found) lost += 1;
      process.stdout.write(
        `${(r.found ? 'HERE' : 'LOST').padEnd(6)}${r.was.padEnd(32)}${r.control.padEnd(40)}${r.now}\n`,
      );
    }
    process.stdout.write(`\n${lost === 0
      ? `NOTHING LOST — all ${rows.length} controls of the removed stops answer to their own hook in the surface.`
      : `${lost} CONTROL(S) LOST — a hook the removed stops owned is in no file. Iron rule 3 is broken.`}\n`);
    process.exit(lost === 0 ? 0 : 1);
  } else if (argv.length >= 2) {
    const base = JSON.parse(readFileSync(argv[0], 'utf8'));
    const head = JSON.parse(readFileSync(argv[1], 'utf8'));
    const { rows, counts } = classify(base, head);
    process.stdout.write(`${rows.join('\n')}\n\n`);
    process.stdout.write('EXPECTED BUCKETS: none — and none is not a hope tonight. `src/engine/**` is not edited by ANY feature of this turn; every one of the ten is a dialog, a wizard default, a lib beside them, the 3D view or a markdown file.\n');
    process.stdout.write(`UNNAMED:          ${counts.UNNAMED}\n`);
    process.exit(counts.UNNAMED === 0 ? 0 : 1);
  } else {
    const d = dump();
    for (const cfg of STANDARD_CONFIGS) {
      process.stdout.write(`${cfg.id.padEnd(12)} drawers=${cfg.drawers ? 'yes' : 'no '}  ${d[cfg.id].sha256 || d[cfg.id].error}\n`);
    }
  }
}
