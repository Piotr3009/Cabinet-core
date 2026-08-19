#!/usr/bin/env node
// ─── T41-F2 PROBE: ONE RAIL CHAIN ───────────────────────────────────────────
//
// The turn's discipline is "prove the thing, not the field", and for the rail
// the thing is THE ROD'S Y AFTER A DRAG — read from every place that claims to
// know it. A chain is one chain when they all say the same millimetre.
//
// It also counts holes, because the second fault this feature fixes is a rail
// that drills into thin air: a shelf-mounted COLUMN rail has no partitioner, so
// `set.railPartY` is null, and `null + G/2` is 9 — three screws on the bottom
// panel's own row and three off the board entirely.
//
//     node verify/t41/f2-rail-chain-probe.mjs
//
// Exit code is the number of disagreements.

import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';
import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { hangerDropMm } from '../../src/engine/railAssembly.js';
import { drillFindings } from '../../src/engine/cnc/drillGuard.js';
import { exportGate } from '../../src/engine/cnc/exportGate.js';

let bad = 0;
const say = (t) => process.stdout.write(t + '\n');
const check = (label, got, want) => {
  const ok = String(got) === String(want);
  if (!ok) bad += 1;
  say(`  ${ok ? 'OK  ' : 'FAIL'}  ${String(label).padEnd(46)} ${got}${ok ? '' : `   (expected ${want})`}`);
};

/** A wardrobe carrying a rail assembly: a FIX shelf with the rod under it. */
function assembly({ shelfAt, width = 900, extra = {} }) {
  const drop = hangerDropMm(P);
  const items = [
    { id: 'sh1', kind: 'shelf', variant: 'fixed', pos_mm: shelfAt, thickness_mm: 18 },
    { id: 'h1', kind: 'hanger', mount: 'shelf', shelf_id: 'sh1', pos_mm: shelfAt - drop },
  ];
  return computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: '01', width, height: 2150,
    sections: [{ items }], items, ...extra,
  }, P);
}

say('T41-F2 — ONE RAIL CHAIN');
say('='.repeat(78));

// ═══ 1. THE ROD'S Y, READ FROM EVERY PLACE THAT CLAIMS TO KNOW IT ═══════════
say('\n1. THE ROD\'S Y AFTER A DRAG — the shelf moves 1458 → 900');
const drop = hangerDropMm(P);
for (const shelfAt of [1458, 900]) {
  const r = assembly({ shelfAt });
  const want = shelfAt - drop;
  say(`\n  shelf at ${shelfAt} → the rod must be at ${want}`);
  check('engine assemblies.rail.y', r.assemblies?.rail?.y, want);
  check('derived.rail_y', r.derived?.rail_y, want);
  const brackets = (r.drills || []).filter((d) => d.kind === 'rail_bracket');
  check('rail_bracket drills, count', brackets.length, 2);
  for (const b of brackets) check(`rail_bracket on ${b.panel ?? b.id ?? '?'}`, b.y, want);
  const shelfPanel = (r.panels || []).find((p) => p.role === 'shelf' && Math.abs((p.box?.y ?? -1) - shelfAt) < 1);
  check('the fix shelf panel is where it was put', shelfPanel ? shelfPanel.box.y : 'missing', shelfAt);
  // The assembly cuts NO partitioner: its board IS the fix shelf.
  check('RAIL-PART boards (an assembly cuts none)', (r.panels || []).filter((p) => p.part === 'RAIL-PART').length, 0);
  check('rail_partition_screw holes (likewise none)',
    (r.drills || []).filter((d) => d.kind === 'rail_partition_screw').length, 0);
}

// ═══ 2. NO HOLE OFF ITS BOARD, AND NO PARTITIONER SCREW WITHOUT A PARTITIONER
//
// The check is written as two FRAME-INDEPENDENT facts, because the boards in
// this app are not all drilled in the frame their cut rectangle is recorded in
// — a VPART is drilled depth-first, by the convention the bay-door hinges
// established — and a bounds test that ignores that reports faults that are not
// there. These two do not care which way round the frame is:
//
//   1. NO NEGATIVE COORDINATE. A hole at y = −9 is off the board in every frame
//      anyone could read it in.
//   2. A SHELF-MOUNTED RAIL CUTS NO `rail_partition_screw`. Its board IS a fix
//      shelf; the partitioner does not exist, so its screws cannot. This is the
//      fact the missing null guard broke, and it is exact — a count, not a
//      bound.
say('\n2. NO HOLE OFF ITS BOARD, AND NO PARTITIONER SCREW WITHOUT A PARTITIONER');

const COLUMN_ITEMS = [
  { id: 'p1', kind: 'partition', x_mm: 700 },
  { id: 'sh1', kind: 'shelf', variant: 'fixed', pos_mm: 1458, thickness_mm: 18, zone: 0 },
  { id: 'h1', kind: 'hanger', mount: 'shelf', shelf_id: 'sh1', pos_mm: 1418, zone: 0 },
];
const ASSEMBLY_ITEMS = [
  { id: 'sh1', kind: 'shelf', variant: 'fixed', pos_mm: 1458, thickness_mm: 18 },
  { id: 'h1', kind: 'hanger', mount: 'shelf', shelf_id: 'sh1', pos_mm: 1418 },
];
const ALONE_ITEMS = [{ id: 'h1', kind: 'hanger', mount: 'alone', pos_mm: 1400 }];

const withItems = (items, over = {}) => ({
  ...defaultParamsFor('WARDROBE', P), unit_num: '01', items, sections: [{ items }], ...over,
});

const CONFIGS = [
  ['unit-wide, legacy (params)', { ...defaultParamsFor('WARDROBE', P), unit_num: '01', rail: true, rail_offset: 1400 }, 9],
  ['unit-wide, alone (item)', withItems(ALONE_ITEMS), 9],
  ['unit-wide, the assembly', withItems(ASSEMBLY_ITEMS), 0],
  ['COLUMN rail, with its shelf', withItems(COLUMN_ITEMS, { width: 1400 }), 0],
];

for (const [label, params, wantPartScrews] of CONFIGS) {
  let r;
  try { r = computeCabinet(params, P); } catch (e) { say(`  FAIL  ${label}: threw ${e.message}`); bad += 1; continue; }
  const neg = (r.drills || []).filter((d) => d.x < -0.001 || d.y < -0.001);
  check(`${label}: holes at a NEGATIVE coordinate`,
    neg.length + (neg.length ? ` — ${neg.slice(0, 3).map((d) => `${d.panel ?? d.id} ${d.kind} (${d.x}, ${d.y})`).join('; ')}` : ''), 0);
  check(`${label}: rail_partition_screw holes`,
    (r.drills || []).filter((d) => d.kind === 'rail_partition_screw').length, wantPartScrews);
}

// ═══ 3. AND THE WORKSHOP CAN ACTUALLY EXPORT IT ═════════════════════════════
//
// The three screws the column assembly drilled at y = 9 landed exactly on the
// bottom panel's own screw row, so the duplicate-drill guard held two parts out
// of the export. A rail that cannot be exported is not a rail.
say('\n3. THE EXPORT ACCEPTS THE CABINET');
for (const [label, params] of CONFIGS) {
  const r = computeCabinet(params, P);
  const findings = drillFindings(r, { profile: P, unitNum: '01' });
  check(`${label}: duplicate/red drill findings`,
    findings.length + (findings.length ? ` — ${findings.slice(0, 2).map((f) => f.message || f.code).join('; ')}` : ''), 0);
  const gate = exportGate([{ unit: { id: 'u1', params }, result: r }], { profile: P });
  check(`${label}: export gate`, gate.ok === false ? `HELD — ${gate.message}` : 'accepts', 'accepts');
}

say('\n' + '='.repeat(78));
say(bad === 0 ? 'One chain, one millimetre, no hole off the board. T41-F2 holds.'
  : `${bad} disagreement(s). T41-F2 does NOT hold.`);
process.exit(bad === 0 ? 0 : 1);
