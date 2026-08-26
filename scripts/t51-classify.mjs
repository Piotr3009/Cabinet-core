#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT (turn 51, CLAUDE.md iron rule 2) ────────────
//
// T50's classifier, RE-HEADED rather than reused, because the header IS the
// argument and the argument is tonight's. CLAUDE.md, 26.08:
//
//   *"BYTE-IDENTITY. `t51-classify`: six IDENTICAL, UNNAMED = 0. F2, F3 and F5
//   touch the engine. F5 changes a BORE — if a golden moves, that golden has a
//   shaker front and the bore genuinely changed depth, which is a FINDING to
//   write up, not a licence."*
//
// So the claim is made feature by feature, and the one that could move a
// golden is named and MEASURED rather than asserted.
//
// ─── THE THREE THAT TOUCH THE ENGINE ────────────────────────────────────────
//
//   F2  THE SHARE-OUT, and `settleLayout` with it. Both live in the STORE and
//       in `engine/shareOut.js`, which computes a PLAN off a RUN. The six are
//       computed by `computeCabinet(defaultParamsFor(id))` with no store, no
//       room and no second cabinet: `buildRuns` of one cabinet is one run of
//       one cabinet with no wall to measure against, so there is nothing to
//       share and no parameter is written. `--plan` proves both.
//
//   F4  THE LEFTOVER, measured from the carcass. Same reach exactly: it is a
//       field on `runEndGap`'s answer, and a golden never asks the question.
//       `--plan` covers it — a config with no run has no end gap.
//
//   F5  THE CUP BORE. This one CUTS, and it cuts a hole every one of the six
//       has. It is out of reach for one reason and the reason is measurable:
//       the rule only bites where a rebate stands UNDER THE CUP.
//
//       FOUR OF THE SIX ARE SHAKERS — measured, not assumed, and that is not a
//       problem: a shaker's frame is not rebated, and the profile's 60 mm frame
//       carries the whole ⌀35 cup, whose far edge reaches 21.5 + 17.5 = 39 mm
//       from the hinge edge. So the material at the cup IS the board, and the
//       bore is the number it always was.
//
//       `--cup` is that measurement and it takes nothing on trust: per config
//       the frame, the board, the material at the cup and the bore — and then
//       the SAME rule asked CLAUDE.md's own worked example, a 16 mm leaf with a
//       frame the cup overhangs. It bores 9 rather than 11 and is REPORTED,
//       which is the through-hole F5 exists to end. A golden that MOVED would
//       mean one of the six had grown a frame narrower than 39 mm — the FINDING
//       CLAUDE.md asks for, not a bucket to name.
//
// ─── AND WHAT IS OUT OF THE ENGINE ALTOGETHER ───────────────────────────────
//
//   F1 (the room's plan obstacles), F6 (the light panel), F7 (the warehouse)
//   and F8 (a profile default for a ROOM) reach no cabinet: none of them is
//   read by `computeCabinet`, and none of the six carries a room at all.
//
// Usage — the three lines every classifier in this house has taken:
//
//     node scripts/t51-classify.mjs --dump > /tmp/base.json     # on the base
//     node scripts/t51-classify.mjs --dump > /tmp/head.json     # on the branch
//     node scripts/t51-classify.mjs /tmp/base.json /tmp/head.json
//
// `--cup` and `--plan` are tonight's own proofs, turned into exit codes.
//
// Zero dependencies beyond the engine and node:crypto.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { buildRuns } from '../src/engine/runs.js';
import { shareOutPlan, widthFixed } from '../src/engine/shareOut.js';
// F5's two helpers are imported LAZILY, inside `cupCensus`. `--dump` has to run
// on the BASE as well as on the branch — that is the whole comparison — and on
// the base `cupThicknessAtBore` does not exist yet. A static import would turn
// "the goldens did not move" into a syntax error.

// The six standard configs are T34's through T50's, unchanged — the same set,
// so a T50 dump and a T51 dump are directly comparable.
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
 * THE CUP BORE'S REACH (F5) — tonight's own, and the one that could cut.
 *
 * Per config: is there a hinged front at all, what is the material under its
 * cup, and how deep is the bore. Then the same board with a SHAKER frame
 * narrower than the cup reaches — which is the case the rule exists for.
 *
 * `same` is the claim: every one of the six bores what it always bored, because
 * none of them is a shaker. `narrow` differing from `bore` is the rule working
 * — if the two agreed, F5 would not be doing anything at all.
 */
export async function cupCensus() {
  const { cupBoreOf, cupThicknessAtBore } = await import('../src/engine/doors.js');
  const cups = P.hinges.cups;
  const reach = cups.xFromHingeEdge + cups.diameter / 2;
  // CLAUDE.md's own worked example: *"At 16 mm it would bore straight through
  // — `cupFloorKeepMm` exists to prevent exactly that and is measuring the
  // wrong thickness."*  A 16 mm board, a 6 mm rebate, and a frame the cup
  // overhangs: 10 mm of material, and the old rule bored 11 into it.
  const NARROW = { frame: Math.max(P.front.types.S.frameMin, reach - 10), depth: 6 };
  const THIN = 16;
  return STANDARD_CONFIGS.map((cfg) => {
    const result = computeCabinet({ ...defaultParamsFor(cfg.id, P), unit_num: '01' }, P);
    const front = (result.panels || []).find((p) => p.part === 'FRONT' && !p.meta?.appliance && p.box);
    if (!front) return { id: cfg.id, front: false };
    const bore = cupBoreOf(front, P);
    // The SAME rule asked a second question — nothing is stored, and no golden
    // is touched: a 16 mm leaf with a frame narrower than the cup reaches.
    const thin = {
      ...front,
      box: { ...front.box, d: THIN },
      meta: { ...front.meta, shaker: NARROW },
    };
    const thinBore = cupBoreOf(thin, P);
    return {
      id: cfg.id,
      front: true,
      shaker: Boolean(front.meta?.shaker),
      frame: Number(front.meta?.shaker?.frame) || null,
      board: Number(front.box.d),
      atCup: cupThicknessAtBore(front, P),
      bore: bore?.depth ?? null,
      short: Boolean(bore?.short),
      thinAtCup: cupThicknessAtBore(thin, P),
      thinBore: thinBore?.depth ?? null,
      thinShort: Boolean(thinBore?.short),
    };
  });
}

/**
 * THE SHARE-OUT'S REACH (F2 / F4) — asked of the engine, not of a comment.
 *
 * The six are single cabinets with no wall. `shareOutPlan` of one of them has
 * nothing to share out, and `computeCabinet` does not import the module at all.
 * Both halves are printed: what the module says, and whether the config's own
 * params carry a single mark of it.
 */
export function sharePlanCensus() {
  return STANDARD_CONFIGS.map((cfg) => {
    const params = { ...defaultParamsFor(cfg.id, P), unit_num: '01' };
    const unit = {
      id: cfg.id, type: cfg.id, params, position: { wall: 0, x_mm: 0, rotation_deg: 0 },
    };
    const runs = buildRuns([unit], P);
    const plan = runs.length
      ? shareOutPlan(runs[0], { wallWidth: 0, others: [unit] }, P, {})
      : null;
    return {
      id: cfg.id,
      shares: Boolean(plan && plan.ok),
      fixed: widthFixed(unit),
      mark: params.width_fixed ?? null,
    };
  });
}

/** Compare two dumps, config by config. */
export function classify(base, head) {
  const rows = [];
  const counts = { IDENTICAL: 0, UNNAMED: 0 };
  for (const cfg of STANDARD_CONFIGS) {
    const b = base[cfg.id];
    const h = head[cfg.id];
    const same = b?.sha256 && b.sha256 === h?.sha256;
    if (same) counts.IDENTICAL += 1;
    else counts.UNNAMED += 1;
    rows.push(`${cfg.id.padEnd(12)}${same ? 'IDENTICAL' : 'UNNAMED  '}  ${h?.sha256 || h?.error || '(missing)'}`);
  }
  return { rows, counts };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  // Top-level await is fine here: this file is an ES module and node 22 runs it.
  if (argv.includes('--dump')) {
    process.stdout.write(`${JSON.stringify(dump())}\n`);
  } else if (argv.includes('--cup')) {
    process.stdout.write('THE CUP BORE\u2019S REACH \u2014 why F5 cuts without moving a golden\n\n');
    process.stdout.write(`${'config'.padEnd(12)}${'shaker'.padEnd(8)}${'frame'.padEnd(8)}${'board'.padEnd(8)}${'at cup'.padEnd(9)}${'bore'.padEnd(8)}${'16mm+narrow: at cup'.padEnd(21)}${'bore'.padEnd(7)}reported\n`);
    let clean = true;
    for (const r of await cupCensus()) {
      if (!r.front) { process.stdout.write(`${r.id.padEnd(12)}(no hinged front)\n`); continue; }
      // THE FINDING iron rule 2 asks for: a golden whose cup actually sits over
      // a rebate, or whose bore had to be shortened. Being a SHAKER is not the
      // test — the six are, and their 60 mm frame carries the whole cup, so the
      // material at the cup IS the board and nothing moved.
      if (r.atCup !== r.board || r.short) clean = false;
      // …and the rule must BITE where it is meant to, or F5 is a comment.
      if (!(r.thinBore < r.bore) || !r.thinShort) clean = false;
      process.stdout.write(
        `${r.id.padEnd(12)}${(r.shaker ? 'yes' : 'no').padEnd(8)}${String(r.frame ?? '-').padEnd(8)}`
        + `${String(r.board).padEnd(8)}${String(r.atCup).padEnd(9)}${String(r.bore).padEnd(8)}`
        + `${String(r.thinAtCup).padEnd(21)}${String(r.thinBore).padEnd(7)}${r.thinShort ? 'yes' : 'NO \u2190'}\n`,
      );
    }
    process.stdout.write(`\n${clean
      ? 'CLEAN \u2014 four of the six ARE shakers, and that is fine: their 60 mm frame carries the whole \u230035 cup (reach 39), so the material at the cup IS the board and the bore is what it always was. And a 16 mm leaf with a frame the cup overhangs bores 9 instead of 11 and is REPORTED \u2014 which is CLAUDE.md\u2019s own worked example, and the through-hole F5 exists to end.'
      : 'NOT CLEAN \u2014 a golden\u2019s cup sits over a rebate, or the rule does not bite. Iron rule 2: a moved golden is a FINDING to write up, not a licence. STOP.'}\n`);
    process.exit(clean ? 0 : 1);
  } else if (argv.includes('--plan')) {
    process.stdout.write('THE SHARE-OUT’S REACH — why F2 and F4 cannot move a golden\n\n');
    process.stdout.write(`${'config'.padEnd(12)}${'has a run to share'.padEnd(20)}${'width imposed'.padEnd(16)}mark on the config\n`);
    let clean = true;
    for (const row of sharePlanCensus()) {
      if (row.shares || row.mark != null) clean = false;
      process.stdout.write(
        `${row.id.padEnd(12)}${String(row.shares).padEnd(20)}${String(row.fixed).padEnd(16)}`
        + `${row.mark == null ? '(none)' : String(row.mark)}\n`,
      );
    }
    process.stdout.write(`\n${clean
      ? 'CLEAN — not one of the six has a run to share out, and not one carries a mark of it.'
      : 'NOT CLEAN — the share-out is reaching a cabinet that is not in a run. STOP (iron rule 2).'}\n`);
    process.exit(clean ? 0 : 1);
  } else if (argv.length >= 2) {
    const base = JSON.parse(readFileSync(argv[0], 'utf8'));
    const head = JSON.parse(readFileSync(argv[1], 'utf8'));
    const { rows, counts } = classify(base, head);
    process.stdout.write(`${rows.join('\n')}\n\n`);
    process.stdout.write('EXPECTED BUCKETS: none. F5 CUTS — it changes the depth of a hole every one of the six has — but only where a REBATE stands UNDER THE CUP. Four of the six ARE shakers, and --cup measures rather than claims what that means: their 60 mm frame carries the whole \u230035 cup (reach 39), so the material at the cup IS the board and the bore is the number it always was. F2 and F4 have no run to reach (--plan). F1, F6, F7 and F8 are not read by computeCabinet at all.\n');
    process.stdout.write('IF A GOLDEN MOVED:  iron rule 2 — that golden has a shaker front and the bore genuinely changed depth. Write it up as a FINDING. Do not name a bucket for it.\n');
    process.stdout.write(`UNNAMED:          ${counts.UNNAMED}\n`);
    process.exit(counts.UNNAMED === 0 ? 0 : 1);
  } else {
    const d = dump();
    for (const cfg of STANDARD_CONFIGS) {
      process.stdout.write(`${cfg.id.padEnd(12)} drawers=${cfg.drawers ? 'yes' : 'no '}  ${d[cfg.id].sha256 || d[cfg.id].error}\n`);
    }
  }
}
