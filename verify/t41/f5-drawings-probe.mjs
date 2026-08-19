#!/usr/bin/env node
// ─── T41-F5 PROBE: THE DRAWINGS, MEASURED ───────────────────────────────────
//
// Everything a drawing is judged on, as numbers: the spread of pen weights on
// each sheet, whether the section's cut line is the heaviest thing on it,
// whether the DXF carries any pen information at all, whether the dimension
// chains name real cabinets, and how much of the paper the drawing uses.
//
//     node verify/t41/f5-drawings-probe.mjs
//
// Exit code is the number of disagreements.

import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';
import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { wallDrawingSheets } from '../../src/engine/drawings/wallSheets.js';
import { wallGroups, mountingBands, bandChains, widthChains } from '../../src/engine/drawings/wallElevation.js';
import { sheetToSvg } from '../../src/engine/drawings/svg.js';
import { sheetToDxf } from '../../src/engine/drawings/dxf.js';
import { buildUnitDxfFiles } from '../../src/engine/cnc/dxf.js';

let bad = 0;
const say = (t) => process.stdout.write(t + '\n');
const check = (label, got, want) => {
  const ok = String(got) === String(want);
  if (!ok) bad += 1;
  say(`  ${ok ? 'OK  ' : 'FAIL'}  ${String(label).padEnd(50)} ${got}${ok ? '' : `   (expected ${want})`}`);
};

const ROOM = { height: 2500, corners: [{ x: 0, y: 0 }, { x: 5000, y: 0 }, { x: 5000, y: 3000 }, { x: 0, y: 3000 }] };
const unit = (type, over, pos) => ({
  id: `u-${over.unit_num}`, type, params: { ...defaultParamsFor(type, P), ...over },
  position: { rotation_deg: 0, ...pos },
});
const entry = (u) => ({ unit: u, result: computeCabinet({ ...u.params }, P) });

// A base run with a WALL UNIT OVER IT — the case both chains got wrong.
const ENTRIES = [
  entry(unit('BUD', { unit_num: '01', width: 600, plinth: true }, { wall: 0, x_mm: 0 })),
  entry(unit('BUD', { unit_num: '02', width: 500, plinth: true }, { wall: 0, x_mm: 640 })),
  entry(unit('WUD', { unit_num: '03', width: 600, mount_height: 1500 }, { wall: 0, x_mm: 40 })),
];
const SHEETS = wallDrawingSheets({
  entries: ENTRIES, project: { name: 'T41' }, room: ROOM, profile: P, date: '19/08/2026',
});
const strokes = (svg) => [...svg.matchAll(/stroke-width="([\d.]+)"/g)].map((m) => Number(m[1]));
const lw370 = (dxf) => [...dxf.matchAll(/[\r\n]+370[\r\n]+(-?\d+)/g)].map((m) => Number(m[1]));

say('T41-F5 — THE DRAWINGS LEARN TO DRAW');
say('='.repeat(88));

// ═══ F5a — LINE WEIGHT ══════════════════════════════════════════════════════
say('\nF5a — THE SPREAD OF PEN WEIGHTS ON EACH SHEET');
for (const s of SHEETS) {
  const w = strokes(sheetToSvg(s.sheet, { kind: s.variant }));
  const c = {};
  for (const v of w) c[v] = (c[v] || 0) + 1;
  const vals = Object.keys(c).map(Number).sort((a, b) => a - b);
  const ratio = (Math.max(...vals) / Math.min(...vals)).toFixed(2);
  say(`  ${String(s.name).padEnd(20)} ${String(w.length).padStart(4)} strokes  `
    + `${vals.length} weights ${JSON.stringify(c)}  ratio ${ratio}:1`);
  check(`${s.name}: more than T40's 2.50:1 spread`, Number(ratio) > 2.5, true);
}
const section = SHEETS.find((s) => s.variant === 'section');
const sw = strokes(sheetToSvg(section.sheet, { kind: 'plan' }));
check('the section\'s heaviest stroke is the CUT weight', Math.max(...sw), 0.7);
check('…and there is more than one cut line', sw.filter((v) => v === 0.7).length >= 4, true);

// ═══ F5b — THE DXF ══════════════════════════════════════════════════════════
say('\nF5b — WHAT THE DXF TELLS AutoCAD');
for (const s of SHEETS) {
  const dxf = sheetToDxf(s.sheet);
  const lw = [...new Set(lw370(dxf))].sort((a, b) => a - b);
  say(`  ${String(s.name).padEnd(20)} 370 codes: ${String(lw370(dxf).length).padStart(3)} `
    + `${JSON.stringify(lw)}  LTYPE: ${/[\r\n]+2[\r\n]+LTYPE[\r\n]/.test(dxf)}`);
  check(`${s.name}: carries lineweights`, lw370(dxf).length > 0, true);
}
say('  …and the CNC path, which must carry NONE of it:');
const cnc = buildUnitDxfFiles(computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01' }, P), P);
check('CNC files carrying a 370 code', cnc.filter((f) => lw370(f.dxf).length).length, 0);
check('CNC files carrying an LTYPE table', cnc.filter((f) => /[\r\n]+2[\r\n]+LTYPE[\r\n]/.test(f.dxf)).length, 0);

// ═══ F5c — THE CHAINS ═══════════════════════════════════════════════════════
say('\nF5c — DO THE DIMENSION CHAINS NAME REAL CABINETS?');
const group = wallGroups(ENTRIES, P)[0];
const whole = widthChains(group.members, P);
say(`  the whole wall at once (what T40 drew):  detailed ${JSON.stringify(whole.detailed)}`
  + `  grouped ${JSON.stringify(whole.grouped)}`);
const widths = group.members.map((m) => Math.round(m.width));
say(`  the cabinets on this wall are           ${JSON.stringify(widths)}`);
// How many of T40's whole-wall segments are actually a cabinet on this wall.
// (500 matches by luck — it is the second base unit — which is exactly why a
// "some" test would have passed on the broken chain.)
const realIn = (chain) => chain.filter((v) => widths.includes(Math.round(v))).length;
say(`  of T40's ${whole.detailed.length} segments, ${realIn(whole.detailed)} name a cabinet on this wall`);
say(`  (that is the EVIDENCE, not a check — the whole-wall chain is the fault,`
  + ` and 500 matching is luck: it is the second base unit)`);
for (const band of mountingBands(group.members)) {
  const c = bandChains(band, P);
  say(`  band at ${String(band.base).padStart(5)}:  detailed ${JSON.stringify(c.detailed)}`
    + `  grouped ${JSON.stringify(c.grouped)}${c.same ? '   (identical — one chain drawn)' : ''}`);
  check(`band ${band.base}: every segment is a cabinet or a gap`,
    c.detailed.every((v) => widths.includes(Math.round(v)) || v < 100), true);
}

// ═══ F5d — THE PAPER ════════════════════════════════════════════════════════
say('\nF5d — HOW MUCH OF THE PAPER THE DRAWING USES');
for (const s of SHEETS) {
  const sh = s.sheet;
  say(`  ${String(s.name).padEnd(20)} 1:${(Math.round(sh.scale * 100) / 100)}  on ${Math.round(sh.width)} × ${Math.round(sh.height)}`);
  check(`${s.name}: not snapped to a ladder it does not print`,
    !P.drawings.scales.includes(sh.scale), true);
}

say('\n' + '='.repeat(88));
say(bad === 0 ? 'Weights, pens, honest chains, and a full sheet. T41-F5 holds.'
  : `${bad} disagreement(s). T41-F5 does NOT hold.`);
process.exit(bad === 0 ? 0 : 1);
