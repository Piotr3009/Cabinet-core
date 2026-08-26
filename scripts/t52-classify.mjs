#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT (turn 52, CLAUDE.md iron rule 2) ────────────
//
// T51's classifier, RE-HEADED rather than reused, because the header IS the
// argument and the argument is tonight's. CLAUDE.md, 26.08:
//
//   *"BYTE-IDENTITY. `t52-classify`: six IDENTICAL, UNNAMED = 0. F3 and F4
//   touch drillings; if a golden moves, that is a FINDING to write up, not a
//   licence."*
//
// So the claim is made feature by feature, and the two that could move a golden
// are named and MEASURED rather than asserted.
//
// ─── THE TWO CLAUDE.md NAMES ────────────────────────────────────────────────
//
//   F3  THE DOG-BONE COUNTS. This one CUTS, and it cuts a tenon every one of
//       the six has. It is out of reach for one reason and the reason is
//       measurable: the counts are decided by the cabinet's HEIGHT, and the
//       switches are 600 (three tenons) and 300 (one). The shortest of the six
//       is 720 mm. `--tabs` is that measurement and it takes nothing on trust:
//       per config the height, the count and the centres, and then the SAME
//       rule asked at 700, 500 and 280 — where it gives three, two and one and
//       so is demonstrably not asleep.
//
//   F4  THE LEFTOVER, AND THE BAR. It is a WALL MARGIN passed into a plan
//       computed from a RUN, and a golden is one cabinet with no room around
//       it. `--plan` proves it: `buildWallRuns` of one cabinet is one run with
//       no wall to measure against, so there is nothing to share and no
//       parameter is written.
//
// ─── AND WHAT IS OUT OF THE ENGINE ALTOGETHER ───────────────────────────────
//
//   F1  the share-out's SCOPE and its anchor. Same reach as F4 exactly: it is
//       `engine/shareOut.js` and the store, over a run, and a golden has none.
//       `--plan` covers both.
//
//   F2  the cup's PLANES. It publishes four numbers on a hinge INSTANCE
//       (`engine/hardware3d.js`) and moves the model in the SCENE. Not one of
//       them is a hole: `computeCabinet` does not call `hardwareInstances`, and
//       `cupBoreOf` — which does cut — is untouched by this turn.
//
//   F5  the watch drawer. It cuts a great deal, and every millimetre of it is
//       in a piece that did not exist before tonight: the insert is built only
//       where a DRAWER ITEM carries `watch_insert`, and no default parameter
//       of any of the six does. `--watch` is that proof, per config, plus the
//       insert asked of a drawer that DOES want one so the gate is shown to be
//       a gate and not a dead branch.
//
// Usage — the three lines every classifier in this house has taken:
//
//     node scripts/t52-classify.mjs --dump > /tmp/base.json     # on the base
//     node scripts/t52-classify.mjs --dump > /tmp/head.json     # on the branch
//     node scripts/t52-classify.mjs /tmp/base.json /tmp/head.json
//
// `--tabs`, `--plan` and `--watch` are tonight's own proofs, turned into exit
// codes.
//
// Zero dependencies beyond the engine and node:crypto.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { buildWallRuns } from '../src/engine/runs.js';
import { shareOutPlan, widthFixed } from '../src/engine/shareOut.js';
import { tabCentres } from '../src/engine/puzzle.js';
import { watchInsertOn } from '../src/engine/watchDrawer.js';
// `--dump` has to run on the BASE as well as on the branch — that is the whole
// comparison — so anything this turn INTRODUCED is imported lazily inside the
// census that needs it. A static import of tonight's own module would turn "the
// goldens did not move" into a syntax error on the base.

// The six standard configs are T34's through T51's, unchanged — the same set,
// so a T51 dump and a T52 dump are directly comparable.
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
 * THE DOG-BONE COUNTS (F3) — tonight's own, and the one that CUTS.
 *
 * Per config: how tall it is, how many tenons its back edge takes and where
 * they sit. Then the SAME rule asked at the three heights CLAUDE.md's morning
 * audit names — 700, 500 and 280 — where it must give three, two and one.
 *
 * `same` is the claim: every one of the six cuts what it always cut, because
 * every one of them is at least 600 mm tall. `probe` differing across the three
 * heights is the rule WORKING — if all three agreed, F3 would be a comment.
 */
export function tabCensus() {
  const pz = P.puzzle;
  const rows = STANDARD_CONFIGS.map((cfg) => {
    const params = { ...defaultParamsFor(cfg.id, P), unit_num: '01' };
    const h = Number(params.height) || 0;
    const centres = tabCentres(h, pz);
    return {
      id: cfg.id,
      height: h,
      tabs: centres.length,
      centres: centres.map((c) => Math.round(c * 10) / 10),
      // The two switches, so the table says WHY rather than only WHAT.
      three: pz.middleTabBelow,
      one: pz.singleTabAtOrBelow,
    };
  });
  const probe = [700, 500, 280].map((h) => ({ h, tabs: tabCentres(h, pz).length }));
  return { rows, probe };
}

/**
 * THE WATCH INSERT'S REACH (F5) — a great deal of cutting, all of it new.
 *
 * The insert is built ONLY where a drawer ITEM carries `watch_insert`, and no
 * default parameter of any of the six does. Per config: whether it has drawer
 * items at all, whether any of them asks, and how many insert parts came out.
 * Then the same engine asked a drawer that DOES want one, so the gate is shown
 * to be a gate rather than a dead branch.
 */
export async function watchCensus() {
  const rows = STANDARD_CONFIGS.map((cfg) => {
    const params = { ...defaultParamsFor(cfg.id, P), unit_num: '01' };
    const items = (params.sections?.[0]?.items || []).filter((i) => i?.kind === 'drawer');
    const result = computeCabinet(params, P);
    return {
      id: cfg.id,
      drawerItems: items.length,
      asks: items.filter((i) => watchInsertOn(i)).length,
      parts: (result.panels || []).filter((p) => p.role === 'watch_insert').length,
      published: result.assemblies?.watchInserts != null,
    };
  });
  // …and the same engine, asked. A wardrobe whose top drawer wants one.
  const wanted = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: '01',
    width: 900,
    sections: [{ items: [{ kind: 'drawer', index: 1, height_mm: 220, watch_insert: true }] }],
  }, P);
  const built = wanted.assemblies?.watchInserts?.[0] || null;
  return {
    rows,
    built: built ? { pockets: built.pockets, width: built.pocket_w_mm, sections: built.sections } : null,
    parts: (wanted.panels || []).filter((p) => p.role === 'watch_insert').length,
  };
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
    const runs = buildWallRuns([unit], P);
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
  } else if (argv.includes('--tabs')) {
    const { rows, probe } = tabCensus();
    process.stdout.write('THE DOG-BONE COUNTS \u2014 why F3 cuts without moving a golden\n\n');
    process.stdout.write(`${'config'.padEnd(12)}${'height'.padEnd(9)}${'tabs'.padEnd(6)}centres\n`);
    let clean = true;
    for (const r of rows) {
      // A golden at or under the three-tenon switch would have MOVED. The six
      // are 720\u20132150 tall and the switch is 600.
      if (r.tabs !== 3 || r.height < r.three) clean = false;
      process.stdout.write(
        `${r.id.padEnd(12)}${String(r.height).padEnd(9)}${String(r.tabs).padEnd(6)}`
        + `${r.centres.join(' \u00b7 ')}\n`,
      );
    }
    process.stdout.write(`\nthe switches: three below ${rows[0].three}, one at or under ${rows[0].one}\n`);
    process.stdout.write(`the probe:    ${probe.map((p) => `${p.h} \u2192 ${p.tabs}`).join('   ')}\n`);
    // …and the rule must BITE, or F3 is a comment.
    if (probe[0].tabs !== 3 || probe[1].tabs !== 2 || probe[2].tabs !== 1) clean = false;
    process.stdout.write(`\n${clean
      ? 'CLEAN \u2014 every one of the six is at least 600 mm tall, so every one cuts the three tenons it always cut. And the rule is awake: 700, 500 and 280 give three, two and one.'
      : 'NOT CLEAN \u2014 a golden is under the switch, or the rule does not bite. Iron rule 2: a moved golden is a FINDING to write up, not a licence. STOP.'}\n`);
    process.exit(clean ? 0 : 1);
  } else if (argv.includes('--watch')) {
    const census = await watchCensus();
    process.stdout.write('THE WATCH INSERT\u2019S REACH \u2014 why F5 cuts a great deal and moves nothing\n\n');
    process.stdout.write(`${'config'.padEnd(12)}${'drawer items'.padEnd(14)}${'asking'.padEnd(9)}${'parts'.padEnd(7)}published\n`);
    let clean = true;
    for (const r of census.rows) {
      if (r.asks > 0 || r.parts > 0 || r.published) clean = false;
      process.stdout.write(
        `${r.id.padEnd(12)}${String(r.drawerItems).padEnd(14)}${String(r.asks).padEnd(9)}`
        + `${String(r.parts).padEnd(7)}${r.published ? 'yes \u2190' : 'no'}\n`,
      );
    }
    if (!census.built || census.parts < 6) clean = false;
    process.stdout.write(`\nasked for one: ${census.built
      ? `${census.built.pockets} pockets at ${census.built.width} mm, ${census.built.sections} sections, ${census.parts} pieces cut`
      : 'NOTHING \u2190'}\n`);
    process.stdout.write(`\n${clean
      ? 'CLEAN \u2014 not one of the six carries a drawer that asks for an insert, so not one of them grows a part or a key. And the gate is a gate: a drawer that DOES ask gets a whole tray.'
      : 'NOT CLEAN \u2014 the insert is reaching a cabinet that never asked for one, or the gate is dead. STOP (iron rule 2).'}\n`);
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
    process.stdout.write('EXPECTED BUCKETS: none. F3 CUTS — it changes how many tenons a back edge takes — but only BELOW 600 mm, and the shortest of the six is 720 (--tabs). F5 cuts a whole tray, and only where a drawer ITEM asks for one, which no default parameter of any of the six does (--watch). F1 and F4 have no run to reach (--plan). F2 publishes four numbers on a hinge INSTANCE and moves a model in the scene — computeCabinet calls neither.\n');
    process.stdout.write('IF A GOLDEN MOVED:  iron rule 2 — write it up as a FINDING. Do not name a bucket for it.\n');
    process.stdout.write(`UNNAMED:          ${counts.UNNAMED}\n`);
    process.exit(counts.UNNAMED === 0 ? 0 : 1);
  } else {
    const d = dump();
    for (const cfg of STANDARD_CONFIGS) {
      process.stdout.write(`${cfg.id.padEnd(12)} drawers=${cfg.drawers ? 'yes' : 'no '}  ${d[cfg.id].sha256 || d[cfg.id].error}\n`);
    }
  }
}
