#!/usr/bin/env node
// ─── T41-F1 PROBE: DOES THE SHEET STAND THE BOARD UP? ───────────────────────
//
// The turn's discipline is "prove the thing, not the field", and this is the
// thing said out loud: for every board of every kit that is on the owner's
// standing list, the rectangle it occupies on the sheet — how many millimetres
// up the page, how many across — and the one-word verdict.
//
// Run it on any checkout, before or after the fix:
//
//     node verify/t41/f1-sheet-lay-probe.mjs
//
// On T40's code every line but the END PANEL prints LYING. On T41's every line
// prints STANDING. Exit code is the number of LYING boards, so it is also a
// check and not only a report.

import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';
import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { sheetLay } from '../../src/engine/cnc/layout.js';
import { CUT_GRAIN_AXIS_BY_PART } from '../../src/engine/grain.js';

// The owner's list, 18.08.2026: "drawer box back BB, drawer box front BF,
// drawer sides SL and SR, drawer fronts, PLINTH, and the left/right END PANEL."
// Named here rather than imported, so this probe reports on the ROLES the owner
// asked about even if the code's own list drifts away from them.
const OWNERS_ROLES = [
  'DRAWER-BOX-BACK', 'DRAWER-BOX-FRONT', 'DRAWER-SIDE', 'DRAWER-FRONT', 'PLINTH', 'END-PANEL',
];

const KITS = [
  ['BUDR', {}],
  ['BUDR2', {}],
  ['BUDR4', {}],
  ['WARDROBE', { drawers: 3 }],
  ['PANTRY', { drawers: 2 }],
  ['BUD', { plinth: true, end_panels: [{ side: 'L' }, { side: 'R' }] }],
];

const pad = (v, n) => String(v).padEnd(n);
let lying = 0;
let standing = 0;

process.stdout.write('T41-F1 — HOW THE SHEET LAYS THE OWNER\'S ROLES\n');
process.stdout.write('='.repeat(96) + '\n');

for (const [type, over] of KITS) {
  const r = computeCabinet({ ...defaultParamsFor(type, P), unit_num: '01', ...over }, P);
  const rows = r.panels.filter((p) => OWNERS_ROLES.includes(p.part));
  if (!rows.length) continue;
  process.stdout.write(`\n${type}\n`);
  process.stdout.write(`  ${pad('id', 10)}${pad('part', 18)}${pad('w × h', 14)}`
    + `${pad('drawn', 14)}${pad('table', 7)}${pad('turn', 6)}${pad('laid up × across', 20)}verdict\n`);
  const seen = new Set();
  for (const p of rows) {
    // One line per SHAPE, not per board: three identical drawer sides say the
    // same thing three times and a report nobody reads proves nothing.
    const key = `${p.part}|${Math.round(p.w)}x${Math.round(p.h)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const lay = sheetLay(p);
    const stands = lay.upMm >= lay.acrossMm;
    if (stands) standing += 1; else lying += 1;
    const dw = p.cnc?.drawn_w ?? '—';
    const dh = p.cnc?.drawn_h ?? '—';
    process.stdout.write(`  ${pad(p.id, 10)}${pad(p.part, 18)}`
      + `${pad(`${Math.round(p.w)} × ${Math.round(p.h)}`, 14)}`
      + `${pad(`${dw} × ${dh}`, 14)}`
      + `${pad(CUT_GRAIN_AXIS_BY_PART[p.part] ?? '—', 7)}`
      + `${pad(`${lay.turn}°`, 6)}`
      + `${pad(`${Math.round(lay.upMm)} × ${Math.round(lay.acrossMm)}`, 20)}`
      + `${stands ? 'STANDING' : 'LYING  <<<<'}\n`);
  }
}

process.stdout.write('\n' + '='.repeat(96) + '\n');
process.stdout.write(`STANDING: ${standing}   LYING: ${lying}\n`);
process.stdout.write(lying === 0
  ? 'The sheet stands the board up. T41-F1 holds.\n'
  : 'Boards are being laid across their own grain. T41-F1 does NOT hold.\n');
process.exit(lying === 0 ? 0 : 1);
