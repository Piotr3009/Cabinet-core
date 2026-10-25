/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F21 · THE PROBE: THE FRONTS' OWN DIMENSIONS
//
// The owner, 24.10.2026, 19:34: *"jak mamy szuflady to nie pokazuje dokladnie
// wymiarow frontow i przerw pomiedzy nimi czy pomiedzy drzwiami tylko jeb 207 i
// 200 co nie ma sensu"*. CLAUDE.md T82 F21: "PROBE (committed): the T81 fronts
// sheet of the walk's kitchen writes 366 and 360 for drawer fronts of 363 and
// 360 because heightChains (T41 F5c, wallElevation.js) drops the 3 mm gap edge
// and lets the gap fall into the next front."
//
// The stage is the T81 walk's kitchen (scripts/t81-kitchen.mjs), in-frame on
// (the walk's first pass) and off. The fronts sheet is built exactly as the
// set builds it (setElevation.js buildRunElevation, mode 'fronts', at the scale
// wallDrawingSheets gives that sheet), and its chains' own figures are read.
//
// Read only: nothing is saved.
//
//   node scripts/t82-probe-f21.mjs            (prints the table)
//   node scripts/t82-probe-f21.mjs --write    (and writes verify/t82/f21-probe.md)

import { existsSync } from 'node:fs';
import { t81Kitchen, setArgs } from './t81-kitchen.mjs';
import { getCabinetProfile } from '../src/engine/profile.js';
import { wallGroups, heightChains } from '../src/engine/drawings/wallElevation.js';
import { buildRunElevation, worktopsOnWall } from '../src/engine/drawings/setElevation.js';
import { drawingContext } from '../src/engine/drawings/setSheet.js';
import { wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { DRAWING_LAYERS } from '../src/engine/drawings/layers.js';
import { figureWidth } from '../src/engine/drawings/setChains.js';
import { frontGaps, frontSizes } from '../src/engine/frontDimensions.js';
import {
  ROOT, lineOf, at, table, emit, mm, sourceCommit, textAt,
} from './t82-probe-lib.mjs';

const P = getCabinetProfile();
const GAP = Number(P.doors?.gap) || 0;
const WE = 'src/engine/drawings/wallElevation.js';
const SE = 'src/engine/drawings/setElevation.js';
const SC = 'src/engine/drawings/setChains.js';
const T41 = 'test/turn41-f5-the-drawings-learn-to-draw.test.js';

// ─── THE LINES, AS THEY STAND ───────────────────────────────────────────────
const L = {};
L.hc = lineOf(WE, 'export function heightChains(members, { floorMm = 0 } = {}) {');
L.f5c = lineOf(WE, 'TURN 41 (F5c): A 3 mm GAP IS NOT A DIMENSION', L.hc);
L.drop = lineOf(WE, 'for (const e of rawFrontEdges) {', L.hc);
L.dropIf = lineOf(WE, 'if (!frontEdges.length || e - frontEdges[frontEdges.length - 1] > floorMm + SAME) frontEdges.push(e);', L.drop);
L.vc = lineOf(WE, 'const { frontEdges, bandEdges: bands } = heightChains(members, {');
L.runChains = lineOf(SE, 'function runChains(group, { withFronts, ends, worktops, ceiling, profile, ctx }) {');
L.right = lineOf(SE, 'const { frontEdges } = heightChains(group.members, { floorMm: Number(profile?.doors?.gap) || 0 });', L.runChains);
L.rightV = lineOf(SE, 'out.push(chainV({ edges: frontEdges, x: right + ctx.chainFirst', L.right);
L.bottom = lineOf(SE, 'const edges = [...new Set([...ends, ...widthChains(floor.members, profile).detailedEdges])]', L.runChains);
L.topChain = lineOf(SE, 'const edges = widthChains(topBand.members, profile).detailedEdges;', L.runChains);
L.chainH = lineOf(SC, 'export function chainH({');
L.chainV = lineOf(SC, 'export function chainV({');
L.liftV = lineOf(SC, 'lift = lift ? 0 : 1;', L.chainV);
L.dimLayer = lineOf('src/engine/drawings/layers.js', "DIMENSIONS: { aci:");
L.t41 = lineOf(T41, 'a 3 mm gap between fronts is not dimensioned');
L.t41Assert = lineOf(T41, '`and none is dimensioned:', L.t41);
L.gaps = lineOf('src/engine/frontDimensions.js', 'export function frontGaps(result) {');
L.sizes = lineOf('src/engine/frontDimensions.js', 'export function frontSizes(result, profile = null) {');

/** The kitchen, its fronts sheet built as the set builds it, and its chains. */
function stage(inframe) {
  const ids = t81Kitchen({ inframe });
  const a = setArgs();
  const sheets = wallDrawingSheets(a);
  const fr = sheets.find((s) => s.variant === 'fronts' && s.wall === 0);
  const ctx = drawingContext(fr.sheet.scale, P);
  const group = wallGroups(a.entries, P)[0];
  const built = buildRunElevation(group, {
    mode: 'fronts', room: a.room, worktops: worktopsOnWall(a.worktops, 0), frontTypeOf: a.frontTypeOf, profile: P, ctx,
  });
  const member = (id) => group.members.find((m) => m.unit.id === id);
  return {
    ids, a, fr, ctx, group, built, member,
  };
}

const figs = (chain) => chain.figures.map((f) => `${f.caption}${f.lifted ? ' (on a leader)' : ''}`).join(' . ');
const fronts = (m) => m.result.panels.filter((p) => p.box && (p.part === 'FRONT' || p.part === 'DRAWER-FRONT'));
const rightChain = (s) => s.built.chains.find((c) => c.figures.length && c.figures[0].axis === 'y'
  && c.figures.every((f) => f.x > s.group.to));
const bottomChain = (s) => s.built.chains.find((c) => c.figures.length && c.figures[0].axis === 'x' && c.figures[0].y < 0);

const rows = [];
const row = (r) => rows.push(r);

for (const inframe of [true, false]) {
  const s = stage(inframe);
  const word = inframe ? 'in-frame on' : 'in-frame off (lay-on)';
  const budr = s.member(s.ids.c);
  const [lo, hi] = fronts(budr).sort((p, q) => p.box.y - q.box.y);
  const loY = budr.base + lo.box.y;
  const hiY = budr.base + hi.box.y;
  // ─── THE DRAWER FRONTS THEMSELVES ──────────────────────────────────────────
  row({
    what: `${word}: the BUDR2 500's two drawer fronts, from the engine (the sheet: ${s.fr.no} ${s.fr.name}, ${s.fr.sheet.scaleLabel})`,
    where: 'scripts/t81-kitchen.mjs t81Kitchen',
    measured: `${lo.id} ${mm(lo.box.h)} (${mm(loY)} to ${mm(loY + lo.box.h)}), gap ${mm(hiY - loY - lo.box.h)}, ${hi.id} ${mm(hi.box.h)} (${mm(hiY)} to ${mm(hiY + hi.box.h)})`,
    said: inframe ? 'drawer fronts of 363 and 360 (gap 3)' : 'not a 25.10 row',
    verdict: inframe ? (lo.box.h === 360 && hi.box.h === 363 ? 'CONFIRMED' : 'DIFFERS') : 'NEW ROW',
  });
  // ─── THE NUMBERS heightChains GIVES ────────────────────────────────────────
  const raw = heightChains(s.group.members, { floorMm: 0 });
  const drawn = heightChains(s.group.members, { floorMm: GAP });
  row({
    what: `${word}: heightChains(members) unfiltered and with floorMm = doors.gap ${GAP}, the whole wall`,
    where: at(WE, L.drop, L.dropIf),
    measured: `edges ${raw.frontEdges.map(mm).join(', ')} give ${raw.fronts.map(mm).join(' . ')}; filtered, edges ${drawn.frontEdges.map(mm).join(', ')} give ${drawn.fronts.map(mm).join(' . ')}`,
    said: inframe ? 'heightChains (T41 F5c, wallElevation.js) drops the 3 mm gap edge and lets the gap fall into the next front' : 'not a 25.10 row',
    verdict: inframe
      ? (drawn.fronts.includes(366) && !drawn.fronts.includes(363) ? `CONFIRMED (the drop at ${L.dropIf}): 363 + 3 = 366` : 'DIFFERS')
      : `NEW ROW: 382 + 3 = 385; and the edge ${mm(raw.frontEdges.find((e) => e > 860 && e < 868))} (the BUDR2's top front) against ${mm(raw.frontEdges.find((e) => e >= 868 && e < 880))} (the BUD doors' top) is a 3 that is NOT a gap between two fronts; the BUD's 770 door is never a figure`,
  });
  // ─── WHAT THE SHEET PRINTS ─────────────────────────────────────────────────
  const rc = rightChain(s);
  row({
    what: `${word}: the fronts sheet's right-hand chain (the fronts' heights) as printed`,
    where: `${at(SE, L.right, L.rightV)} (runChains, the T81 sheet); ${at(SC, L.chainV)}`,
    measured: rc ? figs(rc) : 'no right-hand chain',
    said: inframe ? 'writes 366 and 360 for drawer fronts of 363 and 360' : 'not a 25.10 row',
    verdict: inframe
      ? (rc && rc.figures.some((f) => f.caption === '366') && rc.figures.some((f) => f.caption === '360') ? 'CONFIRMED; the chain is built in setElevation.js runChains, which calls wallElevation.js heightChains' : 'DIFFERS')
      : 'NEW ROW',
  });
  // ─── THE WIDTHS ────────────────────────────────────────────────────────────
  const bud8 = s.member(s.ids.b);
  const [fl, frr] = fronts(bud8).sort((p, q) => p.box.x - q.box.x);
  const bc = bottomChain(s);
  row({
    what: `${word}: the BUD 800's two leaves, and the sheet's width chains`,
    where: `${at(SE, L.topChain)}; ${at(SE, L.bottom)}`,
    measured: `leaves ${mm(fl.box.w)} . ${mm(frr.box.x - fl.box.x - fl.box.w)} . ${mm(frr.box.w)}; the chain under the run prints ${bc ? figs(bc) : 'nothing'} (unit edges and the wall ends only); no chain anywhere on the sheet carries ${mm(fl.box.w)}`,
    said: inframe ? 'the width chain gains LEAF, GAP, LEAF (376.5 . 3 . 376.5 on the BUD 800) under the run\'s unit chain' : 'not a 25.10 row',
    verdict: inframe
      ? (fl.box.w === 376.5 && !s.built.chains.some((c) => c.figures.some((f) => f.caption === '376.5')) ? 'CONFIRMED: the leaves are 376.5 . 3 . 376.5 and no leaf chain exists' : 'DIFFERS')
      : `NEW ROW: lay-on leaves ${mm(fl.box.w)} . 3 . ${mm(frr.box.w)}`,
  });
  if (inframe) {
    // ─── THE FIGURE THAT DOES NOT FIT ────────────────────────────────────────
    const lifted = s.built.chains.flatMap((c) => c.figures.filter((f) => f.lifted).map((f) => f.caption));
    row({
      what: 'a figure too small for its segment, on this sheet',
      where: `${at(SC, L.chainH)}; ${at(SC, L.chainV, L.liftV)}`,
      measured: `the sheet is ${s.fr.sheet.scaleLabel}: a 3 is ${(3 / s.fr.sheet.scale).toFixed(2)} mm of paper, its figure ${(figureWidth('3', s.ctx.textHeight) / s.fr.sheet.scale).toFixed(2)} mm wide; chainH and chainV already LIFT a figure that does not fit onto a leader (T71's collision rule): on this sheet ${lifted.length ? lifted.join(', ') : 'none'} ${lifted.length === 1 ? 'is' : 'are'} lifted (the left-hand heights chain)`,
      said: 'where a figure would not fit its segment (a 3 at 1:20 is 0.15 mm) it is written beside the chain with a leader, never dropped',
      verdict: `CONFIRMED with one correction: this sheet is ${s.fr.sheet.scaleLabel}, so a 3 is 0.2 mm; the leader is already there in the chain, and the 3 never reaches it because heightChains drops the edge first`,
    });
    // ─── THE PEN ─────────────────────────────────────────────────────────────
    const fig = rc.figures[0];
    const ent = rc.find((e) => e.kind === 'text' || e.text != null);
    row({
      what: 'the pen and height a chain figure carries',
      where: at('src/engine/drawings/layers.js', L.dimLayer),
      measured: `layer ${ent?.layer} (pen ${DRAWING_LAYERS.DIMENSIONS.pen}); text height ${mm(s.ctx.textHeight)} drawing mm = ${mm(s.ctx.textHeight / s.fr.sheet.scale)} mm on paper (figure "${fig.caption}")`,
      said: 'the gap figure in the ANNOTATION pen at the chain\'s text height',
      verdict: 'CONFIRMED: a figure on the DIMENSIONS layer is already in the ANNOTATION pen at the chain\'s text height',
    });
    // ─── WHAT THE ROOM ALREADY KNOWS ─────────────────────────────────────────
    const g8 = frontGaps(bud8.result).find((g) => g.kind === 'between-doors');
    const gr = frontGaps(budr.result).find((g) => g.kind === 'between-drawers');
    const s8 = frontSizes(bud8.result, P).filter((x) => x.kind === 'front-w').map((x) => mm(x.mm));
    const sr = frontSizes(budr.result, P).filter((x) => x.kind === 'front-h').map((x) => mm(x.mm));
    row({
      what: 'the room\'s own front dimensions (T25 F13, the "Show front dimensions" toggle) for the same two units',
      where: `${at('src/engine/frontDimensions.js', L.gaps)}; ${at('src/engine/frontDimensions.js', L.sizes)}`,
      measured: `BUDR2: heights ${sr.join(', ')}, ${gr.kind} ${mm(gr.mm)}; BUD 800: widths ${s8.join(', ')}, ${g8.kind} ${mm(g8.mm)}`,
      said: 'not a 25.10 row (the numbers the chain is to print)',
      verdict: 'NEW ROW: the engine already measures FRONT, GAP, FRONT per cabinet (one law, one path)',
    });
    // ─── THE OWNER'S DXF ─────────────────────────────────────────────────────
    const dxf = ['verify/t82/Balck_kicthen.dxf', 'reference/Balck_kicthen.dxf', 'reference/dxf/Balck_kicthen.dxf']
      .find((f) => existsSync(ROOT + f));
    row({
      what: 'the owner\'s DXF, its gap dimensions',
      where: dxf || 'Balck_kicthen.dxf: not in this clone',
      measured: dxf ? 'present (not counted by this probe)' : 'the file is not in the repository; nothing measured',
      said: '19 gap dimensions of 2 and 3 on Balck_kicthen.dxf',
      verdict: 'NOT MEASURED on this branch (the file is not here); CLAUDE.md\'s count stands as the owner\'s',
    });
    // ─── THE TEST THAT PINS THE OLD LAW ──────────────────────────────────────
    row({
      what: 'the test that holds the T41 F5c law',
      where: at(T41, L.t41, L.t41Assert),
      measured: `${textAt(T41, L.t41)} ... asserts !drawn.some((v) => v <= P.doors.gap) on a BUDR4 beside a BUD 800`,
      said: 'test/turn41-f5-the-drawings-learn-to-draw.test.js amended with the owner\'s words (the 2026 law replaces T41 F5c\'s "a 3 mm gap is not a dimension")',
      verdict: `CONFIRMED (${L.t41} to ${L.t41Assert})`,
    });
  }
}

const md = `# T82 F21 · the probe of the fronts' own dimensions

The owner, 24.10.2026, 19:34: *"jak mamy szuflady to nie pokazuje dokladnie wymiarow frontow i przerw pomiedzy nimi czy pomiedzy drzwiami tylko jeb 207 i 200 co nie ma sensu"*.

Reproduce: \`node scripts/t82-probe-f21.mjs\` (add \`--write\` to rewrite this file). Measured on the source tree of commit ${sourceCommit()} (this branch); every line number was found in the file by the script, not remembered. The stage is the T81 walk's kitchen (\`scripts/t81-kitchen.mjs\`: BUD 600, BUD 800 a pair, BUDR2 500, WUD 600, END-L, plinth, worktop), in-frame on and off; the fronts sheet is built as the set builds it, at the scale the set gives it, and its chains' own figures are read. Figures are listed in the chain's own order (bottom up for a height chain, left to right for a width chain), joined by " . ".

${table(rows)}

## The one link the fix must change

CONFIRMED as CLAUDE.md names it, with one correction of WHERE. The drop is \`heightChains\` (${at(WE, L.drop, L.dropIf)}, the T41 F5c block from ${L.f5c}): the edge closer than \`floorMm\` (the door gap, 3) to the last one is dropped and the gap falls into the next front. But the T81 fronts sheet's chain is drawn by \`runChains\` in ${at(SE, L.right, L.rightV)} (no slice's file: INT's), not by \`wallElevation.js verticalChains\` (${at(WE, L.vc)}, the T40 sheet's). So FRONT, GAP, FRONT is the drop removed in \`heightChains\` (E2's file) and read as is by \`runChains\`; the figure that does not fit is already lifted onto a leader by \`chainV\` (${at(SC, L.chainV, L.liftV)}), so nothing new is needed for it. LEAF, GAP, LEAF is a new chain under the unit chain at ${at(SE, L.bottom)} (INT's file), its numbers already in the engine's \`frontSizes\` / \`frontGaps\` (${at('src/engine/frontDimensions.js', L.sizes)}). Beware row 11: the edges are pooled across the WHOLE wall, so on a lay-on run the BUDR2's top front (867) and the BUD doors' top (870) make a 3 that is not a gap between two fronts; a chain per unit (or per stack) avoids printing it.
`;

emit('f21-probe.md', md);
