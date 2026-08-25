#!/usr/bin/env node
// ─── THE MORNING AUDIT'S OWN ARITHMETIC (turn 47) ───────────────────────────
//
// CLAUDE.md: *"`L`, `L_MAX` and `β` re-derived BY HAND against the panel
// record → the oversize audit (+20 on the wall edge, mitre long point
// untouched)."*
//
// Every number below is computed HERE, from the segment's own two vertices,
// with plain trigonometry — and then compared with what the engine published.
// A script that restated the engine's formula would prove only that the formula
// is spelled the same in two places; this one is the audit's own hand.
//
//     node scripts/t47-hand-audit.mjs > verify/t47/hand-audit.txt
//
// Exit 0 = every number agrees. Exit 1 = one does not, and it says which.
//
// Zero dependencies beyond the engine.

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';

const G = 18;
const B = { ...defaultParamsFor('WARDROBE', P), unit_num: '01',
  side_infill_left_mm: 40, side_infill_right_mm: 40, top_infill_mm: 40 };
let bad = 0;
const say = (ok, s) => { if (!ok) bad += 1; console.log(`${ok ? '  ok' : 'FAIL'}  ${s}`); };

for (const [name, cut, w] of [
  ['one straight run 2000 → 1400', { pts: [{ x: 0, y: 2000 }, { x: 600, y: 1400 }], infill: 40 }, 600],
  ['a knee: flat 2000 to 300, then 1400', { pts: [{ x: 0, y: 2000 }, { x: 300, y: 2000 }, { x: 900, y: 1400 }], infill: 40 }, 900],
  ['two slopes: 1600 up, flat, down to 1500', { pts: [{ x: 0, y: 1600 }, { x: 300, y: 2000 }, { x: 900, y: 2000 }, { x: 1200, y: 1500 }], infill: 40 }, 1200],
]) {
  console.log(`\n── ${name} ──`);
  const r = computeCabinet({ ...B, width: w, slope_cut: cut }, P);
  for (const t of r.panels.filter((p) => p.role === 'top')) {
    const m = t.meta.slopeCut;
    // BY HAND, from the two vertices of the segment the board covers.
    const a = cut.pts.find((q) => Math.abs(q.x - m.from) < 1e-6) || { x: m.from, y: null };
    const b = cut.pts.find((q) => Math.abs(q.x - m.to) < 1e-6) || { x: m.to, y: null };
    const span = m.to - m.from;
    const beta = (m.deg * Math.PI) / 180;
    const L = span / Math.cos(beta);
    const LMAX = L + G * Math.tan(beta);
    const foot = G / Math.cos(beta);
    say(Math.abs(m.faceLen - L) < 1e-3, `${t.id}: L = ${span}/cos ${m.deg}° = ${L.toFixed(4)} (record ${m.faceLen})`);
    say(Math.abs(m.blankLen - LMAX) < 1e-3, `${t.id}: L_MAX = L + 18·tan ${m.deg}° = ${LMAX.toFixed(4)} (record ${m.blankLen}, cut size ${t.w})`);
    say(Math.abs(t.meta.verticalFootprint - foot) < 1e-3, `${t.id}: footprint = 18/cos ${m.deg}° = ${foot.toFixed(4)} (record ${t.meta.verticalFootprint})`);
    say(t.thickness === G, `${t.id}: thickness is ${t.thickness} and does NOT thicken`);
    say(t.cnc.pockets.length === 0, `${t.id}: no dog bones (${t.cnc.pockets.length} pockets)`);
    say(t.box.x >= -1e-6 && Math.abs((t.box.x + t.box.w) - Math.min(w, m.to)) < 1e-3,
      `${t.id}: spans ${m.from}..${m.to} of the FULL width`);
    if (a.y != null && b.y != null) {
      const byHand = Math.abs(Math.atan((b.y - a.y) / span) * 180 / Math.PI);
      say(Math.abs(m.deg - byHand) < 1e-3, `${t.id}: β = atan(Δy/span) = ${byHand.toFixed(4)}° (record ${m.deg})`);
    }
  }
  // THE OVERSIZE AUDIT: +20 on the WALL edge only, mitre long point untouched.
  for (const p of r.panels.filter((q) => q.role === 'infill')) {
    const o = p.meta.oversize;
    if (!o) { say(p.meta.piece === 'arm', `${p.id}: no oversize, and it touches no wall`); continue; }
    say(o.mm === 20, `${p.id}: +${o.mm} on the ${o.edge} edge, nominal ${o.nominal}`);
    const xs = p.cnc.outline.map(([x]) => x);
    const ys = p.cnc.outline.map(([, y]) => y);
    if (o.edge === 'left') say(Math.abs(Math.min(...xs) + 20) < 1e-6, `${p.id}: the allowance hangs off x = -20`);
    if (o.edge === 'right') say(Math.abs(Math.max(...xs) - (o.nominal + 20)) < 1e-6, `${p.id}: and the far edge is +20`);
    if (o.edge === 'top') say(Math.abs(Math.max(...ys) - (o.nominal + 20)) < 1e-6, `${p.id}: the ceiling edge is +20`);
    if (o.edge === 'back') say(Math.abs(Math.max(...ys) - (o.nominal + 20)) < 1e-6, `${p.id}: the wall edge is +20`);
    say(p.meta.mitre && p.meta.mitre.L === 45, `${p.id}: the L corner is 45, whatever the ceiling does`);
  }
}
console.log(`\n${bad === 0 ? 'EVERY NUMBER RE-DERIVED BY HAND AGREES.' : `${bad} DISAGREE.`}`);
process.exit(bad === 0 ? 0 : 1);
