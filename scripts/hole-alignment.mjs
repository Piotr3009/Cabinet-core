#!/usr/bin/env node
// ─── THE PILOT GATE, AS A TABLE (turn 21, CLAUDE.md F1.4) ───────────────────
//
// "A test per kit family (BUDR, BUDR2, BUDR4, wardrobe with drawers, OVEN base)
// computes, for EVERY drawer, the world-space Y of the façade pilots and of the
// box-front pilots and asserts |Δ| = 0."
//
// The test is test/turn21-f1-hole-alignment.test.js. This script prints the
// same rows as a markdown table, and both of them ask the ENGINE —
// `engine/drawerPilots.js` — rather than carrying their own copy of the law.
// A document that recomputes what it documents proves nothing (rule R4, asked
// in its own key), and neither does a test.
//
//     node scripts/hole-alignment.mjs            # markdown
//     node scripts/hole-alignment.mjs --json

import { computeCabinet } from '../src/engine/cabinet.js';
import { drawerPilotRows } from '../src/engine/drawerPilots.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

const budr = (type) => computeCabinet({
  type, width: 600, height: 770, depth: 558, board_t: 18, front_t: 25, unit_num: 'DR1',
}, P);

/** The five kit families CLAUDE.md F1.4 names, exactly as the gate builds them. */
const CASES = [
  { kit: 'BUDR', build: () => budr('BUDR') },
  { kit: 'BUDR2', build: () => budr('BUDR2') },
  { kit: 'BUDR4', build: () => budr('BUDR4') },
  {
    kit: 'WARDROBE',
    build: () => computeCabinet({
      type: 'WARDROBE',
      width: 600,
      height: 2150,
      depth: 578,
      board_t: 18,
      front_t: 25,
      front_type: 'S',
      hinge: 'L',
      unit_num: 'W01',
      drawers: 3,
      drawer_heights: [300, 200, 150],
    }, P),
  },
  { kit: 'OVEN_BASE', build: () => budr('OVEN_BASE') },
];

const rows = [];
for (const { kit, build } of CASES) {
  for (const row of drawerPilotRows(build(), P)) rows.push({ kit, ...row });
}

if (process.argv.includes('--json')) {
  process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
} else {
  const head = '| kit | drawer | runner bottom | screw row (+38) | façade pilot Y | box-front pilot Y | Δ |';
  const rule = '| --- | ---: | ---: | ---: | ---: | ---: | ---: |';
  const body = rows.map((r) => `| ${r.kit} | ${r.drawer} | ${r.runnerBottom} | ${r.runnerScrewRow} `
    + `| ${r.facadeY} (${r.facadeSource}) | ${r.boxY} (${r.boxSource}) | **${r.delta}** |`);
  process.stdout.write(`${[head, rule, ...body].join('\n')}\n`);
}
