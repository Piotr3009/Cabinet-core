#!/usr/bin/env node
// ─── THE VERTEX PROBE (turn 47, CLAUDE.md F1–F4) ────────────────────────────
//
// T46's probe, re-pointed at the thing this turn changes. A screenshot of a cut
// cabinet proves it looks cut; it does not prove the CORNERS are where the LISP
// puts them, and the corners are the deliverable — they are what the machine
// cuts to.
//
//     node scripts/t47-vertices.mjs > verify/t47/vertices.txt
//
// FIVE STATIONS, and the first two are the safety net:
//
//   1  NO CUT              the kit's own wardrobe, for the eye to compare
//   2  T46's SPELLING      one straight run stated as `{y0, y1}`
//   3  T47's SPELLING      the SAME line stated as `{pts}` — and the two blocks
//                          must be identical CHARACTER FOR CHARACTER
//   4  A KNEE              flat, then falling, inside one cabinet
//   5  TWO SLOPES          rising, flat, falling — the case T44's schema always
//                          allowed and no code path had ever seen
//
// Everything below is read off `computeCabinet()`. Nothing is restated.

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { slopeSegDeg } from '../src/engine/puzzle.js';

const out = (t) => process.stdout.write(t);
const n = (v) => (v == null ? '—' : String(Math.round(Number(v) * 1e4) / 1e4));
const pts = (o) => (o || []).map(([x, y]) => `(${n(x)}, ${n(y)})`).join(' → ');

const BASE = { ...defaultParamsFor('WARDROBE', P), unit_num: '01' };
const SHOWN = ['BUL', 'BUR', 'TOP', 'TOP-1', 'TOP-2', 'TOP-3', 'BACK'];

function station(title, params) {
  const r = computeCabinet(params, P);
  const lines = [];
  lines.push(`── ${title} ──`);
  const cut = params.slope_cut;
  if (cut?.pts) {
    lines.push(`   line: ${cut.pts.map((p) => `(${n(p.x)}, ${n(p.y)})`).join(' → ')}`);
    for (let i = 1; i < cut.pts.length; i += 1) {
      const a = cut.pts[i - 1];
      const b = cut.pts[i];
      lines.push(`   segment ${i}: ${n(a.x)} → ${n(b.x)} mm, `
        + `${n(a.y)} → ${n(b.y)} mm, beta ${n(slopeSegDeg(b.x - a.x, b.y - a.y))}°`);
    }
  } else if (cut) {
    lines.push(`   line: y0 ${n(cut.y0)} → y1 ${n(cut.y1)}  (T46's own spelling)`);
  } else {
    lines.push('   line: none — the kit cuts what the AutoLISP cuts');
  }
  lines.push('');
  const shown = [
    ...r.panels.filter((p) => SHOWN.includes(p.id)),
    ...r.panels.filter((p) => p.part === 'FRONT'),
  ];
  for (const p of shown) {
    lines.push(`   ${p.id.padEnd(8)} ${n(p.w).padStart(9)} × ${n(p.h).padStart(9)} mm`
      + `   box y ${n(p.box?.y).padStart(9)} h ${n(p.box?.h).padStart(8)}`);
    lines.push(`   ${' '.repeat(8)} outline: ${pts(p.cnc?.outline)}`);
    if (p.meta?.slopeCut) lines.push(`   ${' '.repeat(8)} slopeCut: ${JSON.stringify(p.meta.slopeCut)}`);
    if (p.meta?.bevel) lines.push(`   ${' '.repeat(8)} bevel:    ${JSON.stringify(p.meta.bevel)}`);
    if (p.meta?.verticalFootprint != null) {
      lines.push(`   ${' '.repeat(8)} vertical footprint: ${n(p.meta.verticalFootprint)} mm `
        + '(clearance — the board is still 18 perpendicular)');
    }
    if (p.meta?.oversize) lines.push(`   ${' '.repeat(8)} oversize: ${JSON.stringify(p.meta.oversize)}`);
    lines.push('');
  }
  return lines.join('\n');
}

out('T47 · THE VERTICES, from computeCabinet() itself\n');
out('Re-run:  node scripts/t47-vertices.mjs\n\n');

out(station('1 · NO CUT — the kit\'s own wardrobe', BASE));
out('\n');
const pairBlock = station('2 · ONE STRAIGHT RUN, T46\'s spelling {y0, y1}: 2400 → 1200',
  { ...BASE, slope_cut: { y0: 2400, y1: 1200, infill: 40 } });
out(pairBlock);
out('\n');
const lineBlock = station('3 · THE SAME LINE, T47\'s spelling {pts}',
  { ...BASE, slope_cut: { pts: [{ x: 0, y: 2400 }, { x: 600, y: 1200 }], infill: 40 } });
out(lineBlock);
out('\n');
// THE SAFETY NET, stated in the probe as well as in the suite. The two blocks
// state the line differently — that is the point of them — so what is compared
// is everything from the first PANEL down: every board, every vertex, every
// record. They must agree character for character.
const boards = (block) => block.slice(block.indexOf('   BUL'));
const a = boards(pairBlock);
const b = boards(lineBlock);
out(a === b
  ? '   SAFETY NET: blocks 2 and 3 are IDENTICAL, character for character. ✓\n\n'
  : '   SAFETY NET: BLOCKS 2 AND 3 DIFFER — the rewrite moved a straight run. ✗\n\n');

out(station('4 · A KNEE AT 300 — flat at 2000, then falling to 1400 over 900',
  { ...BASE, width: 900, slope_cut: { pts: [{ x: 0, y: 2000 }, { x: 300, y: 2000 }, { x: 900, y: 1400 }], infill: 40 } }));
out('\n');
out(station('5 · TWO SLOPES — rising to 2000, flat, then falling to 1500',
  {
    ...BASE,
    width: 1200,
    slope_cut: {
      pts: [{ x: 0, y: 1600 }, { x: 300, y: 2000 }, { x: 900, y: 2000 }, { x: 1200, y: 1500 }],
      infill: 40,
    },
  }));

process.exit(a === b ? 0 : 1);
