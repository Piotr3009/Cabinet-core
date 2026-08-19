#!/usr/bin/env node
// ─── T41-F4 PROBE: A HINGE COLUMN IS ONE BOARD ──────────────────────────────
//
// Two things T40-F1 broke at the machine, both measured here as HOLES and as
// whether the workshop can export the job:
//
//   1. Moving one hinge on ONE leaf bored four holes with no hinge in them —
//      two of them in the carcass side whose door was never touched.
//   2. On an out-of-the-box cabinet — a wardrobe with a partition, per-bay
//      doors and one bay split — a BUL row and a BUR row 10 mm apart were
//      compared to each other, raised a RED, and held BOTH carcass sides out
//      of the CNC export.
//
//     node verify/t41/f4-hinge-columns-probe.mjs
//
// Exit code is the number of disagreements.

import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';
import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { drillFindings } from '../../src/engine/cnc/drillGuard.js';
import { exportGate } from '../../src/engine/cnc/exportGate.js';

let bad = 0;
const say = (t) => process.stdout.write(t + '\n');
const check = (label, got, want) => {
  const ok = String(got) === String(want);
  if (!ok) bad += 1;
  say(`  ${ok ? 'OK  ' : 'FAIL'}  ${String(label).padEnd(50)} ${got}${ok ? '' : `   (expected ${want})`}`);
};

const plateRows = (r, side) => [...new Set((r.drills || [])
  .filter((d) => (d.panel === side || d.id === side) && String(d.kind).includes('hinge'))
  .map((d) => Math.round(d.y * 10) / 10))].sort((a, b) => a - b);
const plateHoles = (r) => (r.drills || []).filter((d) => String(d.kind).includes('hinge')).length;
const cups = (r) => (r.drills || []).filter((d) => String(d.kind) === 'cup').length;

say('T41-F4 — A HINGE COLUMN IS ONE BOARD');
say('='.repeat(84));

// ═══ 1. ONE LEAF MOVED, ONE SIDE RE-BORED ═══════════════════════════════════
say('\n1. MOVE ONE HINGE ON ONE LEAF — how many holes, and in which board?');
const base = { ...defaultParamsFor('WARDROBE', P), unit_num: 'W01', width: 900, height: 2150, split_top_mm: 600 };
const before = computeCabinet(base, P);
say(`  before:  ${plateHoles(before)} plate holes, ${cups(before)} cups`);
say(`           BUL ${JSON.stringify(plateRows(before, 'BUL'))}`);
say(`           BUR ${JSON.stringify(plateRows(before, 'BUR'))}`);

// Move ONE hinge on the LEFT top leaf, exactly as the Doors modal does.
const moved = computeCabinet({ ...base, split_hinge_rows: { 'W01-FL-T': [1700, 2047] } }, P);
say(`  after:   ${plateHoles(moved)} plate holes, ${cups(moved)} cups`);
say(`           BUL ${JSON.stringify(plateRows(moved, 'BUL'))}`);
say(`           BUR ${JSON.stringify(plateRows(moved, 'BUR'))}`);

check('every plate hole has a hinge in it', plateHoles(moved), plateHoles(before));
check('the UNTOUCHED side is bored where it was',
  JSON.stringify(plateRows(moved, 'BUR')), JSON.stringify(plateRows(before, 'BUR')));
check('…and the moved side really did move',
  JSON.stringify(plateRows(moved, 'BUL')) !== JSON.stringify(plateRows(before, 'BUL')), true);
check('the cups did not change', cups(moved), cups(before));

// ═══ 2. THE OUT-OF-THE-BOX FALSE RED ════════════════════════════════════════
say('\n2. A PARTITIONED WARDROBE WITH BAY DOORS AND ONE BAY SPLIT');
say('   (no hand editing at all — this is what the app builds)');
const items = [{ id: 'p1', kind: 'partition', x_mm: 900, front_mm: 0 }];
const bay = computeCabinet({
  ...defaultParamsFor('WARDROBE', P),
  unit_num: 'W01', width: 1800, height: 2150,
  items, sections: [{ items }],
  bay_doors: [{ door: 'one', hinge: 'L', split_top_mm: 600 }, { door: 'one', hinge: 'R' }],
}, P);
say(`  BUL plate rows ${JSON.stringify(plateRows(bay, 'BUL'))}`);
say(`  BUR plate rows ${JSON.stringify(plateRows(bay, 'BUR'))}`);
const findings = drillFindings(bay, { profile: P, unitNum: 'W01' });
const reds = findings.filter((f) => f.level === 'red');
for (const f of reds) say(`  RED: ${f.message}`);
check('red drill findings', reds.length + (reds.length ? ` — ${reds[0].message}` : ''), 0);
const gate = exportGate([{ unit: { id: 'u1', params: {} }, result: bay }], { profile: P });
check('the export gate', gate.ok === false ? `HELD — ${gate.message}` : 'accepts', 'accepts');

say('\n' + '='.repeat(84));
say(bad === 0 ? 'One column, one board, and the job exports. T41-F4 holds.'
  : `${bad} disagreement(s). T41-F4 does NOT hold.`);
process.exit(bad === 0 ? 0 : 1);
