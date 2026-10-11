#!/usr/bin/env node
// ─── T78 · F4 · PROBE: HOW EACH L BOARD IS LAID, AND WHICH WAY ITS GRAIN RUNS ─
//
// The owner, 11.10.2026: *"na L półkach odwróć na CNC i na wizualizacji słoje
// o 90 stopni."* Diagnose before you cut: this prints, for every horizontal
// board of the three L kits (square defaults, a non-square L in each hand) and
// for a BUD standing beside the L, what the ONE grain source says: the piece's
// statement (`cnc.grain`, drawn frame), `sheetTurn`, `sheetLay`, `grainRun`
// (the 3D's reader), `decorMapping`'s axis on the big face, the nest's turn.
//
//   node scripts/t78-f04-probe.mjs            the table, markdown
//
// The BEFORE and AFTER tables are kept in verify/t78/f04-probe.md and asserted
// in test/turn78-f04-l-grain.test.js.

import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { layoutPanels, sheetLay, sheetTurn } from '../src/engine/cnc/layout.js';
import { decorMapping, grainRun } from '../src/engine/decors.js';

const ROOT = new URL('../', import.meta.url).pathname;
const gold = (n) => JSON.parse(readFileSync(`${ROOT}fixtures/${n}`, 'utf8')).params;
const CASES = [
  ['CORNER_L_BASE, golden params (900 x 900, arm 558, left)', gold('golden-corner-l-base.json')],
  ['CORNER_L_WALL, golden params (600 x 600, arm 400, left)', gold('golden-corner-l-wall.json')],
  ['CORNER_L_WARDROBE, golden params (1000 x 1000, arm 568, left)', gold('golden-corner-l-wardrobe.json')],
  ['CORNER_L_BASE 1000 x 800, right hand', { ...gold('golden-corner-l-base.json'), width: 1000, depth: 800, corner_side: 'right' }],
  ['CORNER_L_BASE 800 x 1000, left hand', { ...gold('golden-corner-l-base.json'), width: 800, depth: 1000, corner_side: 'left' }],
  ['BUD 600 x 770 x 560 beside the L (the ordinary top and shelf)', {
    type: 'BUD', width: 600, height: 770, depth: 560, board_t: 18, front_t: 18, front_type: 'S',
    shelves: 1, doors: true, hinge: 'L', unit_num: '02', plinth: true,
  }],
];

const rows = [];
for (const [name, params] of CASES) {
  const r = computeCabinet(params, P);
  const layout = layoutPanels(r.panels, r.drills, { gap: 50, rowWidth: 6000 });
  for (const p of r.panels) {
    if (!['TOP', 'BOTTOM', 'SHELF'].includes(p.part)) continue;
    const lay = sheetLay(p);
    const run = grainRun(p);
    const map = decorMapping(p.box, run.lengthMm, run.axis);
    const place = layout.places.find((pl) => pl.panel.id === p.id);
    rows.push([
      name, p.id, `${p.w} x ${p.h}`,
      `${p.cnc.drawn_w} x ${p.cnc.drawn_h}${p.cnc.rotated ? ' R' : ''}`,
      p.cnc.grain ?? 'none', String(sheetTurn(p)), lay.axis, `${run.axis} (${run.lengthMm})`,
      `${map.grainAxis} (${map.grainAxis === 'u' ? 'along box.w = x = wall A' : 'along box.d = z = wall B'})`,
      String(place?.bounds?.turn ?? '-'),
    ]);
  }
}
const head = ['case', 'board', 'w x h', 'drawn', 'cnc.grain', 'sheetTurn', 'sheetLay.axis', 'grainRun', '3D decorMapping', 'nest turn'];
console.log(`| ${head.join(' | ')} |`);
console.log(`| ${head.map(() => '-').join(' | ')} |`);
for (const row of rows) console.log(`| ${row.join(' | ')} |`);
