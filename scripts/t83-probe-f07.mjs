/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T83 F7 · THE PROBE: THE TRAP'S U AT TWO COLUMNS WITH ONE BASIN
//
// The owner, 25.10.2026, 22:41: *"nie ma wyciecia na U na sinki nawet jak je
// wlacze ... jest wyciecie jak jest 1 szuflada ale nie jak sa 2 szuflady a
// mamy jeden sink"*. CLAUDE.md T83 F7: "PROBE (P1, verify/t83/f07-probe.md):
// engine/vanity.js vanityWastes puts one basin's waste at W / 2; at columns: 2
// the divider stands there, vanityTopBoxUnder finds no box under the waste and
// the plan's row is status: 'DIVIDER': no U is cut, no sentence is said."
//
// The stage: VANITY3 ({ ...defaultParamsFor("VANITY3", P), unit_num: "01" }) at
// columns 1 and 2, sinks 0, 1 and 2, cut by a bare computeCabinet; then the
// same unit born in a project (the store's own actions) for what Check #39
// says. Then the top row at columns 2 as the engine cuts it, so V2 can narrow
// it: its box parts, its runner rows, its bearer, and the lines that emit them.
//
// Read only: nothing is saved.
//
//   node scripts/t83-probe-f07.mjs            (prints the table)
//   node scripts/t83-probe-f07.mjs --write    (and writes verify/t83/f07-probe.md)

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { vanityWastes, vanityBoxesOf, vanitySpec } from '../src/engine/vanity.js';
import { hardwareInstances } from '../src/engine/hardware3d.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { rectCorners } from '../src/engine/room.js';
import {
  lineOf, at, table, emit, mm, sourceCommit, textAt,
} from './t83-probe-lib.mjs';

const CAB = 'src/engine/cabinet.js';
const VAN = 'src/engine/vanity.js';
const HW = 'src/engine/hardware3d.js';
const PRO = 'src/engine/profile.js';
const CHK = 'src/engine/checks.js';
const LSP = 'reference/lisp/KIT_VANITY.lsp';
const S = () => useProjectStore.getState();

// ─── THE LINES, AS THEY STAND ───────────────────────────────────────────────
const L = {};
L.wastes = lineOf(VAN, 'export function vanityWastes({ W, columns = 1, sinks = 0 }) {');
L.wastesOne = lineOf(VAN, 'if (s === 1) return [w / 2];', L.wastes);
L.under = lineOf(VAN, 'function vanityTopBoxUnder(boxes, n, xw, GB) {');
L.plan = lineOf(VAN, 'function vanityTrapPlan({ boxes, n, columns, sinks, W, GB }, profile) {');
L.planDiv = lineOf(VAN, "if (!b) { out.push({ x: xw, box: null, u: null, status: 'DIVIDER' }); continue; }", L.plan);
L.verdictDiv = lineOf(VAN, "sentence: '#39 The trap stands over the divider: no top drawer can take its U'");
L.spec = lineOf(VAN, 'trapClearMm: num(v.trapClearMm, 60),');
L.proClear = lineOf(PRO, 'trapClearMm: 60,');
L.lspClear = lineOf(LSP, '(defun vanityTrapClear ( / ) 60.0)');
L.lspWastes = lineOf(LSP, '(defun vanity-wastes (W columns sinks)');
L.lspDivider = lineOf(LSP, '(defun vanity-divider (W H D G columns)');
L.lspUnder = lineOf(LSP, '(defun vanity-top-box-under (boxes n xw GB / out b)');
L.lspPlan = lineOf(LSP, '(defun vanity-trap-plan (W H D G GB frontT n columns sinks / boxes out xw b u prev)');
L.chk = lineOf(CHK, 'VANITY_TRAP: 39,');
L.colsOf = lineOf(CAB, 'function drawerColumnsOf(type, params) {');
L.colsPlan = lineOf(CAB, 'function drawerColumnsPlan({ W, G, GB, unitNum, profile }) {');
L.openings = lineOf(CAB, 'const openings = [[G, (W - G) / 2], [(W + G) / 2, W - G]];', L.colsPlan);
L.boxLeft = lineOf(CAB, 'const boxLeftX = x0 + B.boxWidthClearance / 2;', L.colsPlan);
L.walls = lineOf(CAB, "walls: col === 1 ? { left: 'BUL', right: 'DIVIDER' } : { left: 'DIVIDER', right: 'BUR' },", L.colsPlan);
L.divFn = lineOf(CAB, 'function drawerColumnsDivider({ W, H, D, G }) {');
L.divRet = lineOf(CAB, "return { id: 'DIVIDER', x: (W - G) / 2, y: G, z: G, w: G, h: H - G - G, d: D - G };", L.divFn);
L.rb = lineOf(CAB, 'const runnerBottomY = frontY.map((y, i) => (i === 0 ? G : y));');
L.topOfBox = lineOf(CAB, 'const topOfBox = overlay ? overlay.shelfY : (hasTopPanel ? H - G : H);');
L.budrDiv = lineOf(CAB, 'divider: columns === 2 ? drawerColumnsDivider({ W, H, D, G }) : null,');
L.divPanel = lineOf(CAB, "id: dv.id, part: 'VPART', role: 'shelf', w: dv.h, h: dv.d, thickness: G,");
L.colMeta = lineOf(CAB, 'const colMeta = (c) => (c.col == null ? {} : { column: c.col });');
L.side = lineOf(CAB, "id: `${c.tag(i)}-${suffix}`, part: 'DRAWER-SIDE', role: 'drawer_box', w: budr.depth, h: sh, ...common,", L.colMeta);
L.wall = lineOf(CAB, "id: `${c.tag(i)}-${suffix}`, part: isFront ? 'DRAWER-BOX-FRONT' : 'DRAWER-BOX-BACK', role: 'drawer_box',", L.side);
L.dno = lineOf(CAB, "id: `${c.tag(i)}-DNO`, part: 'DRAWER-BOTTOM', role: 'drawer_box', w: c.bottomW, h: budr.depth, ...common,", L.wall);
L.front = lineOf(CAB, "id: c.frontId(i), part: 'DRAWER-FRONT', role: 'front', w: c.frontWidth, h: fh, thickness: frontT,", L.dno);
L.sideRunners = lineOf(CAB, 'for (const rowY of [...budr.runnerRows.filter((_, i) => i + 1 !== budr.dummy), ...(budr.innerRunnerRows || [])]) {');
L.divRunners = lineOf(CAB, "addDrill(dv.id, 'runner', RN.layer, face === 'R' ? dv.d - px : px, rowY - dv.y, RN.holeDiameter);");
L.dsDiv = lineOf(CAB, 'divider_runner_rows_y: budr.runnerRows.filter((_, i) => i + 1 !== budr.dummy).map((y) => y - budr.divider.y),');
L.trapCall = lineOf(CAB, 'const vanityTrap = type.vanity');
L.bomCols = lineOf(CAB, 'const budrColumns = budr ? budr.cols.length : 1;');
L.hwGroups = lineOf(HW, 'function columnGroupsOf(sides) {');
L.hwDrawer = lineOf(HW, 'const drawer = i + 1 + k * rows.length;');

const BASE = { ...defaultParamsFor('VANITY3', P), unit_num: '01' };
const cut = (extra) => computeCabinet({ ...BASE, ...extra }, P);
const byId = (r, id) => r.panels.find((p) => p.id === id);
const rows = [];
const row = (r) => rows.push(r);

// ─── 1 · THE NINE CONFIGURATIONS ────────────────────────────────────────────
const GB = (r) => Number(r.panels.find((p) => p.part === 'DRAWER-SIDE')?.thickness) || 18;
function plan(r, columns, sinks) {
  const n = r.derived.front_heights?.length || 3;
  const W = Number(r.params.width);
  const boxes = vanityBoxesOf(r.panels, { n, columns });
  const wastes = vanityWastes({ W, columns, sinks });
  const t = r.derived.vanity?.trap || { cuts: [], verdict: [] };
  const g = GB(r);
  return wastes.map((xw) => {
    // vanityTopBoxUnder, as the LISP reads it (between the box's own sides).
    let b = null;
    for (const x of boxes) if (x.idx === n && xw >= x.x0 + g && xw <= x.x0 + x.bw - g) b = x;
    const cutHere = t.cuts.find((c) => c.centres.some((c0) => Math.abs(c0 - xw) < 1e-6));
    const said = t.verdict.filter((v) => Math.abs(v.x - xw) < 1e-6);
    const status = cutHere ? 'CUT' : (said.some((v) => v.kind === 'DIVIDER') ? 'DIVIDER' : (said.some((v) => v.kind === 'FIT') ? 'FIT' : 'none'));
    return {
      xw, b, cutHere, said, status,
    };
  });
}

for (const columns of [1, 2]) {
  for (const sinks of [0, 1, 2]) {
    const r = cut({ columns, sinks });
    const dv = byId(r, 'DIVIDER');
    const p = plan(r, columns, sinks);
    const basins = r.derived.vanity?.basins || [];
    const box = (b) => (b ? `${b.tag} (x ${mm(b.x0)} to ${mm(b.x0 + b.bw)})` : 'none');
    const words = r.warnings.filter((w) => w.code === 'VANITY_TRAP').map((w) => `${w.kind}: "${w.message}"`);
    const isProbeRow = columns === 2 && sinks === 1;
    row({
      what: `VANITY3 900 x 600 x 500, columns ${columns}, sinks ${sinks}: wastes, DIVIDER, top box under each waste, plan status, U cut, #39`,
      where: `${at(VAN, L.wastes, L.wastesOne)}; ${at(VAN, L.under)}; ${at(VAN, L.planDiv)}; ${at(CAB, L.divRet)}`,
      measured: [
        `wastes ${p.length ? p.map((e) => mm(e.xw)).join(', ') : 'none'}`,
        `DIVIDER ${dv ? `x ${mm(dv.box.x)} to ${mm(dv.box.x + dv.box.w)}, y ${mm(dv.box.y)} to ${mm(dv.box.y + dv.box.h)} (h ${mm(dv.box.h)}), z ${mm(dv.box.z)} to ${mm(dv.box.z + dv.box.d)}` : 'none'}`,
        `box under: ${p.length ? p.map((e) => `${mm(e.xw)}: ${box(e.b)}`).join('; ') : 'n/a'}`,
        `status ${p.length ? p.map((e) => e.status).join(', ') : 'n/a'}`,
        `U cut ${r.derived.vanity.trap.cuts.length ? r.derived.vanity.trap.cuts.map((c) => `${c.tag} ${c.us.map((u) => `${mm(u.from)} to ${mm(u.to)}`).join(' and ')} (${c.pieces.join(', ')})`).join('; ') : 'none'}`,
        `#39 (VANITY_TRAP) ${words.length ? words.join('; ') : 'nothing said'}`,
        `basins the top takes ${basins.length ? basins.map(mm).join(', ') : 'none'}`,
      ].join('. '),
      said: isProbeRow ? 'the waste at W / 2, the divider there, no box under it, status DIVIDER: no U is cut, no sentence is said' : 'not a 25.10 row',
      verdict: isProbeRow
        ? (p[0]?.status === 'DIVIDER' && !r.derived.vanity.trap.cuts.length
          ? (words.length ? 'CONFIRMED with one correction: no U is cut (status DIVIDER), but a sentence IS said: #39 DIVIDER, in the LISP\'s words (vanity.js and checks.js read it as yellow)' : 'CONFIRMED')
          : 'DIFFERS')
        : (columns === 2 && sinks === 2 && !basins.length
          ? 'NEW ROW: the two U\'s are cut (one in each column\'s top box, the T82 road), but on a 900 the top takes NO basin (each 520 oval runs past the carcass face), so the room and the plan show none while the boxes are cut for two'
          : (columns === 1 && sinks === 2 && basins.length < 2
            ? `NEW ROW: two U's cut in D3, the top takes ${basins.length} basin (the two 520 ovals at 300 and 600 overlap)`
            : 'NEW ROW')),
    });
  }
}

// ─── 2 · WHAT CHECK #39 SAYS IN A PROJECT (the store's own actions) ────────
S().newProject('T83 F7 probe');
S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
const id = S().addUnit('VANITY3', { wall: 0, x: 1000 }).id;
S().updateUnitParams(id, { columns: 2, sinks: 1 });
const born = S().units.find((u) => u.id === id);
const findings = S().runChecks().filter((f) => f.check === 39 || f.check === 48);
row({
  what: 'the same unit born in a project (addUnit VANITY3, then columns 2, sinks 1): what Check reads off it',
  where: `${at(CHK, L.chk)} (VANITY_TRAP to #39, yellow)`,
  measured: `params columns ${born.params.columns}, sinks ${born.params.sinks}, drawer_split ${born.params.drawer_split}, wall_gap ${born.params.wall_gap}; findings ${findings.length ? findings.map((f) => `#${f.check} ${f.level}: "${f.message}"`).join('; ') : 'none'}`,
  said: '"no sentence is said"',
  verdict: findings.some((f) => f.check === 39 && /divider/.test(f.message))
    ? 'DIFFERS: the Check panel says #39 "The trap stands over the divider: no top drawer can take its U" (yellow); what is missing is the U, not the sentence'
    : 'CONFIRMED: nothing is said',
});

// ─── 3 · THE TOP ROW AT COLUMNS 2, AS THE ENGINE CUTS IT ───────────────────
const r2 = cut({ columns: 2, sinks: 1 });
const n = r2.derived.front_heights.length;
const top = r2.panels.filter((p) => p.meta?.drawer === n && (p.role === 'drawer_box' || p.part === 'DRAWER-FRONT'));
for (const col of [1, 2]) {
  const mine = top.filter((p) => p.meta?.column === col);
  row({
    what: `columns 2, the top row (drawer ${n}), column ${col}: every part of its box and its front (id, part, x to x + w, y, z, d, meta)`,
    where: `${at(CAB, L.side)} (sides); ${at(CAB, L.wall)} (box front and back); ${at(CAB, L.dno)} (bottom); ${at(CAB, L.front)} (front); ${at(CAB, L.colMeta)} (meta.column)`,
    measured: mine.map((p) => `${p.id} ${p.part} x ${mm(p.box.x)} to ${mm(p.box.x + p.box.w)}, y ${mm(p.box.y)}, z ${mm(p.box.z)}, d ${mm(p.box.d)}, meta ${JSON.stringify(Object.fromEntries(Object.entries(p.meta || {}).filter(([k]) => ['drawer', 'side', 'column', 'zone'].includes(k))))}`).join('; '),
    said: 'not a 25.10 row (the parts V2 narrows)',
    verdict: 'NEW ROW',
  });
}
{
  const sides = top.filter((p) => p.part === 'DRAWER-SIDE').sort((a, b) => a.box.x - b.box.x);
  const inner = [sides[1], sides[2]];
  const dv = byId(r2, 'DIVIDER');
  const W = Number(r2.params.width);
  const xw = vanityWastes({ W, columns: 2, sinks: 1 })[0];
  row({
    what: 'columns 2, the top row: the air between the two top boxes, against the waste and the divider',
    where: `${at(CAB, L.openings)}; ${at(CAB, L.boxLeft)}`,
    measured: `column 1's right side outer face ${mm(inner[0].box.x + inner[0].box.w)}, column 2's left side outer face ${mm(inner[1].box.x)}: ${mm(inner[1].box.x - inner[0].box.x - inner[0].box.w)} of air, the DIVIDER (${mm(dv.box.x)} to ${mm(dv.box.x + dv.box.w)}) in it; the waste at ${mm(xw)} stands inside the divider`,
    said: 'the divider stands where the waste is',
    verdict: 'CONFIRMED',
  });
}
{
  const ds = r2.drillSummary;
  const runnersOn = (panel) => r2.drills.filter((d) => d.panel === panel && d.kind === 'runner');
  const ys = (panel) => [...new Set(runnersOn(panel).map((d) => mm(d.y)))].join(', ');
  const pairs = r2.hardware.find((h) => h.role === 'runner_pairs');
  const inst = hardwareInstances(r2, P).runners.filter((x) => x.kind === 'runner');
  const topInst = inst.filter((x) => Math.abs(x.y - ds.runner_bottoms_carcass_y[n - 1]) < 1e-6);
  row({
    what: `columns 2: the runner rows (the top row is row ${n}), the walls that carry them, and the runner on order`,
    where: `${at(CAB, L.rb)}; ${at(CAB, L.sideRunners)} (BUL, BUR); ${at(CAB, L.divRunners)} (DIVIDER, both faces); ${at(CAB, L.dsDiv)}; ${at(CAB, L.walls)}; ${at(HW, L.hwGroups)}`,
    measured: `runner undersides (carcass y) ${ds.runner_bottoms_carcass_y.map(mm).join(', ')}; screw rows (carcass y) ${ds.runner_rows_carcass_y.map(mm).join(', ')}; drilled on BUL y ${ys('BUL')}, BUR y ${ys('BUR')}, DIVIDER y ${ys('DIVIDER')} (its own frame, from its foot at ${mm(byId(r2, 'DIVIDER').box.y)}: drillSummary.divider_runner_rows_y ${ds.divider_runner_rows_y.map(mm).join(', ')}); on order ${pairs.qty} pairs, NL ${pairs.spec.nl}, length ${pairs.spec.length_mm}; the room's top-row runners (hardware3d) ${topInst.map((x) => `drawer ${x.drawer} ${x.side} at x ${mm(x.x)}`).join(', ')}`,
    said: 'not a 25.10 row (the runners V2 moves with the narrowed boxes)',
    verdict: `NEW ROW: the top row's inner runners are screwed to the DIVIDER at its own y ${mm(ds.divider_runner_rows_y[n - 1])}; a divider that stops under the top row leaves them no wall, so the narrowed boxes' inner runners need one (a runner wall each side of the gap) or the room and the drilling place them in air`,
  });
}
{
  const over = r2.panels.filter((p) => p.box && p.role !== 'drawer_box' && p.role !== 'front'
    && p.box.x <= 18 + 1e-6 && p.box.x + p.box.w >= Number(r2.params.width) - 18 - 1e-6
    && p.box.h <= 100 && p.box.y > r2.drillSummary.runner_bottoms_carcass_y[n - 1]);
  const fixed = r2.panels.filter((p) => p.role === 'fixed' || /FIX/.test(String(p.part)) || p.part === 'HPART');
  row({
    what: 'columns 2: the top row\'s bearer, every board that spans both stacks above the top row',
    where: `${at(CAB, L.topOfBox)} (the top box's ceiling: the TOP's underside H - G); ${at(CAB, L.divRet)} (the divider stands on the BOTTOM, under the TOP)`,
    measured: `${over.map((p) => `${p.id} ${p.part} (${p.role}) y ${mm(p.box.y)} to ${mm(p.box.y + p.box.h)}, z ${mm(p.box.z)} to ${mm(p.box.z + p.box.d)}`).join('; ')}; fixed shelf or HPART over the stacks: ${fixed.length ? fixed.map((p) => p.id).join(', ') : 'none'}`,
    said: 'the top row\'s bearer a rail or the fixed shelf the columns rule already fixes over both stacks',
    verdict: fixed.length ? 'CONFIRMED' : 'DIFFERS: the columns rule fixes NO shelf over the stacks; over the top row stand only the carcass TOP and RAIL-TOP (in the back plane). The divider\'s head joint is under the TOP; a short divider stands free at its head unless V2 gives it a bearer',
  });
}
{
  const T = vanitySpec(P);
  const W = Number(r2.params.width);
  const xw = W / 2;
  const half = T.trapWidthMm / 2 + 20;
  const sides = top.filter((p) => p.part === 'DRAWER-SIDE').sort((a, b) => a.box.x - b.box.x);
  const l0 = sides[0].box.x; const r1 = sides[3].box.x + sides[3].box.w;
  const fr = top.filter((p) => p.part === 'DRAWER-FRONT').sort((a, b) => a.box.x - b.box.x);
  const rb = r2.drillSummary.runner_bottoms_carcass_y[n - 1];
  const dv = byId(r2, 'DIVIDER');
  row({
    what: 'what F7 asks, in this unit\'s numbers (vanity.trapWidthMm / 2 + the PROPOSED 20 a side)',
    where: `${at(PRO, L.proClear)}; ${at(VAN, L.spec)}; ${at(LSP, L.lspClear)}`,
    measured: `the gap ${mm(xw - half)} to ${mm(xw + half)} (${mm(2 * half)}, centred on ${mm(xw)}); column 1's top box ${mm(l0)} to ${mm(xw - half)} (outer width ${mm(xw - half - l0)}, was ${mm(sides[1].box.x + sides[1].box.w - l0)}), column 2's ${mm(xw + half)} to ${mm(r1)} (${mm(r1 - xw - half)}, was ${mm(r1 - sides[2].box.x)}); the fronts unchanged ${fr.map((f) => `${f.id} ${mm(f.box.x)} to ${mm(f.box.x + f.box.w)}`).join(', ')}; the short divider y ${mm(dv.box.y)} to ${mm(rb)} (h ${mm(rb - dv.box.y)}, the top row's runner underside), was to ${mm(dv.box.y + dv.box.h)}. BEWARE the key: profile.vanity.trapClearMm is ALREADY 60, the air under the trap to the box below (#39 SHALLOW, LISP vanityTrapClear)`,
    said: 'the two top boxes are each NARROWED toward the centre by vanity.trapWidthMm / 2 + vanity.trapClearMm (160 / 2 + 20 PROPOSED), a 200 gap centred on W / 2',
    verdict: `NAME CLASH: "vanity.trapClearMm (20)" would move #39 SHALLOW's 60 (${at(PRO, L.proClear)}, read at ${at(VAN, L.spec)}, LISP ${at(LSP, L.lspClear)}); the 20 needs its own key (e.g. vanity.trapGapClearMm), the 60 stays`,
  });
}

const md = `# T83 F7 · the probe of the trap's U at two columns with one basin

The owner, 25.10.2026, 22:41: *"nie ma wyciecia na U na sinki nawet jak je wlacze ... jest wyciecie jak jest 1 szuflada ale nie jak sa 2 szuflady a mamy jeden sink, albo mam pomysl: zmniejszmy szuflady na szerokosc, tylko fronty zostawmy szerokie i pomiedzy szufladami zrobi sie miejsce na syfon (tylko gorna row)"*.

Reproduce: \`node scripts/t83-probe-f07.mjs\` (add \`--write\` to rewrite this file). Measured on the source tree of commit ${sourceCommit()} (B0 of T83, 3da1e995); every line number was found in the file by the script, not remembered. The stage is VANITY3 (\`{ ...defaultParamsFor("VANITY3", P), unit_num: "01" }\`, 900 x 600 x 500, three equal drawers) cut by a bare \`computeCabinet\` at columns 1 and 2 and sinks 0, 1 and 2, then born in a project through the store for what Check #39 says.

${table(rows)}

## What V2 cuts, and where

CONFIRMED as CLAUDE.md names it, with two corrections. (1) At columns 2 with one basin the waste stands at W / 2 = 450 (${at(VAN, L.wastesOne)}), inside the DIVIDER (441 to 459, ${at(CAB, L.divRet)}); \`vanityTopBoxUnder\` (${at(VAN, L.under)}) finds no box between its own sides there, so \`vanityTrapPlan\` writes status DIVIDER (${at(VAN, L.planDiv)}) and no U is cut. But a sentence IS said: #39 "The trap stands over the divider: no top drawer can take its U" (${at(VAN, L.verdictDiv)}), on the Check panel as a yellow row (${at(CHK, L.chk)}). (2) The columns rule fixes NO shelf over the two stacks: the top boxes run under the carcass TOP (${at(CAB, L.topOfBox)}) and the divider stands on the BOTTOM under the TOP (${at(CAB, L.divRet)}), so a divider cut short under the top row (its runner underside, y 400) is held at its head by nothing unless F7 gives it a bearer. The parts to narrow are the column stack's (${at(CAB, L.side)} sides, ${at(CAB, L.wall)} box front and back, ${at(CAB, L.dno)} bottom; the plan of each column at ${at(CAB, L.colsPlan)}); the fronts (${at(CAB, L.front)}) stay; the top row's inner runners are drilled on the DIVIDER (${at(CAB, L.divRunners)}, published at ${at(CAB, L.dsDiv)}) and placed in the room per column by \`columnGroupsOf\` (${at(HW, L.hwGroups)}), so they need a wall each side of the gap once the divider stops. The LISP is first: \`vanity-divider\` (${at(LSP, L.lspDivider)}), \`vanity-top-box-under\` (${at(LSP, L.lspUnder)}) and \`vanity-trap-plan\` (${at(LSP, L.lspPlan)}). Beware the profile key CLAUDE.md names for the 20: \`vanity.trapClearMm\` is already the 60 of #39 SHALLOW (${at(PRO, L.proClear)}, LISP \`vanityTrapClear\` ${at(LSP, L.lspClear)}); the 20 takes a new key. And at columns 2 with two basins on a 900 the top takes no basin while both U's are cut (row 6): T82's road, untouched by F7, but worth the owner's eye.
`;

emit('f07-probe.md', md);
void textAt;
