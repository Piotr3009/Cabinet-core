#!/usr/bin/env node
// ─── T78 F2 · PROBE: THE L WORKTOP AND THE L MASK ARE NOT L-SHAPED ──────────
//
// CLAUDE.md T78 F2, the owner (11.10.2026): *"dolna maskująca płyta nie wycina
// się w kształcie L oraz worktop nie wycina się w kształcie L."*  T78 LAWS:
// *"diagnose before you cut (every BUG starts with a committed PROBE table)."*
//
// The questions are the ENGINE's (what slab is resolved, what board is cut,
// what the BOM counts, what the sheet draws), so they are asked of the engine
// and the store in node, with no browser. The browser half (a real Corner L
// from the library row, ADD WORKTOP by the real button) is
// `scripts/t78-f02-probe-browser.mjs`.
//
//   node scripts/t78-f02-probe.mjs            writes verify/t78/f02-probe.md (the table only;
//                                             THE FAULT and THE FIX below it are written by hand)
//   node scripts/t78-f02-probe.mjs --after    re-makes the table AFTER a fix into
//                                             verify/t78/f02-probe-after.md, the before table kept
//   node scripts/t78-f02-probe.mjs --json     prints the measured facts as JSON
//
// The committed table (verify/t78/f02-probe.md) was measured at 21:44 UTC on
// 11.10.2026 against the tree at dbef3f1 + 16477df, BEFORE the integrator's
// F2 edit of worktop.js / runs.js / cabinet.js (21:51 UTC); f02-probe-after.md
// is the same script run after it.
//
// Nothing here fixes anything; the table is the deliverable.

import { mkdirSync, writeFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { rectCorners, roomWalls } from '../src/engine/room.js';
import { worktopsFor, worktopGeometry, worktopEligible } from '../src/engine/worktop.js';
import { runMaskParams, maskDepthExtra } from '../src/engine/runs.js';
import { buildBom } from '../src/engine/bom.js';
import { migrateDesign } from '../src/engine/design.js';
import { wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { buildCuttingListCsv } from '../src/lib/exporters.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const OUT = new URL('../verify/t78/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const S = () => useProjectStore.getState();
const r2 = (v) => Math.round(Number(v) * 100) / 100;
const j = (v) => JSON.stringify(v);
const facts = {};
const rows = [];
let n = 0;
const row = (gesture, expected, observed, where) => {
  n += 1;
  rows.push({ n, gesture, expected, observed, where });
};
const cell = (s) => String(s).replace(/\|/g, '/').replace(/\n/g, ' ');

/** Shoelace, mm² to m², the BOM's own arithmetic (bom.js polygonAreaM2). */
function areaM2(points) {
  let a = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % points.length];
    a += x0 * y1 - x1 * y0;
  }
  return Math.round((Math.abs(a) / 2 / 1e6) * 10000) / 10000;
}

const slabView = (w) => {
  const g = w.geometry;
  return {
    slab: w.slabId || w.id,
    wall: g.wall,
    x: r2(g.x), w: r2(g.w), d: r2(g.d), y: r2(g.y), h: r2(g.h),
    shape: g.shape || null,
    points: Array.isArray(g.outline) ? g.outline.length : 0,
    outline: g.outline || null,
    joint: w.joint ? { at: w.joint.at, kind: w.joint.kind } : null,
    boxAreaM2: Math.round((g.w * g.d) / 1e6 * 10000) / 10000,
    outlineAreaM2: Array.isArray(g.outline) ? areaM2(g.outline) : null,
  };
};

// ═══ THE ROOM, THE L, ITS NEIGHBOURS ════════════════════════════════════════
// A default room (4000 x 3000, 2500 high), an L in the corner of wall 0 at
// the wall gap (the T75 fixture's own placement), a Standard on wall 0 at the
// L's arm A end, a Standard on wall 3 at arm B's end.
const WG = Number(P.room?.wallBackClearance) || 0;
S().newProject('T78 F2 probe');
S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
const walls = roomWalls(S().project.room);
const L = S().addUnit('CORNER_L_BASE', { wall: 0, x: WG, params: { corner_side: 'left' } });
const lUnit = () => S().units.find((u) => u.id === L.id);
const Lp = lUnit().params;
facts.L = {
  id: L.id, type: 'CORNER_L_BASE', wall: 0, x_mm: lUnit().position.x_mm,
  width: Lp.width, depth: Lp.depth, height: Lp.height, arm_mm: Lp.arm_mm, front_t: Lp.front_t,
  corner_side: Lp.corner_side, leg_height: Lp.leg_height, wallGap: WG,
};
row('`addUnit(CORNER_L_BASE, {wall 0, x 10, corner_side left})` in a 4000 x 3000 room',
  'the L in the corner square, arm A along wall 0, arm B along wall 3',
  `x_mm ${facts.L.x_mm}, width ${Lp.width} (arm A), depth ${Lp.depth} (arm B), arm_mm ${Lp.arm_mm}, front_t ${Lp.front_t}, height ${Lp.height}, legs ${Lp.leg_height}`,
  'types.js:728 CORNER_L_BASE, profile.js:2073 cornerBase.defaults');

// ═══ 1 · THE LONE L: worktopEligible, addWorktop, worktopsFor ═══════════════
const gate1 = worktopEligible([lUnit()], P, { walls });
row('`worktopEligible([L])`', 'ok (T75 F4: one L is a run of its own)', j(gate1), 'worktop.js:133 loneL');
const add1 = S().addWorktop([L.id]);
const rec1 = migrateDesign(S().project.design).worktops.find((w) => w.id === add1.id);
facts.loneRecord = rec1;
row('`addWorktop([L.id])` (the Worktop row\'s ADD WORKTOP, `data-add-worktop-one`)',
  'one record, kind L, unitIds [L]', j({ ok: add1.ok, error: add1.error, record: rec1 }),
  'projectStore.js:8773 addWorktop, :8795 kind L');
const slabs1 = S().worktopsOf().map(slabView);
facts.loneSlabs = slabs1;
const g1 = slabs1[0];
row('`worktopsOf()` on the lone L record: `worktopsFor` → the `loneL` branch',
  'shape L, an L outline, flush at BOTH walls (x 0, z 0), front overhang 20 on both arms',
  g1 ? `shape ${g1.shape}, points ${g1.points}, x ${g1.x}, w ${g1.w}, d ${g1.d}, y ${g1.y}, h ${g1.h}; outline ${j(g1.outline)}`
    : 'NO SLAB', 'worktop.js:260 loneL → :434 lSlabGeometry');
// The L outline's own numbers, read against the spec.
if (g1 && g1.outline) {
  const reach = Lp.arm_mm + (P.doors?.gap || 0) + Lp.front_t + 20;
  const xs = g1.outline.map((p) => p[0]);
  const zs = g1.outline.map((p) => p[1]);
  facts.loneReach = reach;
  row('the L outline against the walls',
    `along wall 0 from x 0 (flush at wall 3) to the arm A end; out from wall 0 from z 0 to the arm B end; inner corner at (${reach}, ${reach})`,
    `x from ${Math.min(...xs)} to ${Math.max(...xs)} (${Math.min(...xs) > 0 ? `the slab starts ${Math.min(...xs)} mm off wall 3: the wall gap is left bare` : 'flush at wall 3'}); z from ${Math.min(...zs)} to ${Math.max(...zs)}; inner corner ${j(g1.outline.find((p) => p[0] === r2(facts.L.x_mm + reach)) || g1.outline[3])}; six vertices (an L has six; the spec says eight)`,
    'worktop.js:450 x0 = unit.position.x_mm, :457 local outline');
  row('the lone L slab\'s area: outline vs bounding box',
    'the BOM counts the L\'s true area',
    `outline ${g1.outlineAreaM2} m², bounding box ${g1.boxAreaM2} m²`, 'bom.js:213 polygonAreaM2 when g.outline');
}

// ═══ 2 · THE L AND ITS RUN ON WALL 0 (one wall) ═════════════════════════════
const A1 = S().addUnit('BUD', { wall: 0, x: facts.L.x_mm + Lp.width });
const budA = () => S().units.find((u) => u.id === A1.id);
row('`addUnit(BUD, {wall 0, x = L arm A end})`', 'a Standard flush on the L\'s arm A end',
  `x_mm ${budA().position.x_mm}, w ${budA().params.width}, depth ${budA().params.depth}`, 'projectStore.js:4597 addUnit');
const add2 = S().addWorktop([L.id, A1.id]);
const slabs2 = S().worktopsOf().map(slabView);
facts.oneWallSlabs = slabs2;
row('`addWorktop([L, BUD on wall 0])` ("Add worktop (2)", `data-add-worktop`): `worktopsFor` on a 2-unit record',
  'ONE L slab butting a straight slab at the arm end (spec F2: a run that continues joins the L slab with the butt joint record)',
  `${add2.ok ? '' : `refused: ${add2.error}; `}slabs ${slabs2.length}: ${slabs2.map((s) => `${s.slab} shape ${s.shape} points ${s.points} x ${s.x} w ${s.w} d ${s.d} (box ${s.boxAreaM2} m²)`).join('; ')}`,
  'worktop.js:260 loneL is false (mine.length 2) → :298 worktopGeometry → :219 reach(u) = depth + gap + front_t + 20');
{
  const overStd = slabs2.find((s) => s.shape !== 'L') || slabs2[0];
  const want = 558 + (P.doors?.gap || 0) + budA().params.front_t + 20;
  const d = overStd ? overStd.d : null;
  row('the depth of the slab over the 558-deep Standard',
    `558 + ${P.doors?.gap || 0} + ${budA().params.front_t} + 20 = ${want} over the Standard`,
    overStd ? (slabs2.length === 1
      ? `${d} over the WHOLE run (the L's depth ${Lp.depth} + gap + front_t + 20): the slab over the Standard is ${r2(d - want)} mm too deep, and the L's inner corner is stone`
      : `${d} on the Standard's own slab (${overStd.slab}, x ${overStd.x} w ${overStd.w}); the L has its own`) : 'no slab',
    'worktop.js:219 to 224 Math.max(...list.map(reach))');
}

// ═══ 3 · THE L AND BOTH RUNS (two walls, the T75 walk's "Add worktop (3)") ══
// Wall 3 runs from corner 3 (0,3000) to corner 0 (0,0): its x runs toward the
// L's corner, so the arm B end lies at wall3.width - (wallGap + depth).
const wall3 = walls[3];
const armBEnd = wall3.width - (facts.L.x_mm + Lp.depth);
const B1 = S().addUnit('BUD', { wall: 3, x: armBEnd - 600 });
const budB = () => S().units.find((u) => u.id === B1.id);
row('`addUnit(BUD, {wall 3, x = arm B end - 600})`', 'a Standard flush on the L\'s arm B end on wall 3',
  budB() ? `x_mm ${budB().position.x_mm}, right end ${budB().position.x_mm + budB().params.width}, arm B end ${armBEnd}` : `refused: ${j(B1)}`,
  'projectStore.js:4597 addUnit');
const add3 = S().addWorktop([L.id, A1.id, B1.id].filter(Boolean));
const slabs3 = S().worktopsOf().map(slabView);
facts.twoWallSlabs = slabs3;
row('`addWorktop([L, BUD wall 0, BUD wall 3])` ("Add worktop (3)"): the T75 walk\'s gesture',
  'the L slab (L outline) and two straight slabs butting its arm ends, two joint records',
  `${add3.ok ? '' : `refused: ${add3.error}; `}slabs ${slabs3.length}: ${slabs3.map((s) => `${s.slab} wall ${s.wall} shape ${s.shape} points ${s.points} x ${s.x} w ${s.w} d ${s.d} joint ${j(s.joint)}`).join('; ')}`,
  'worktop.js:275 onWalls.length === 2 → :377 cornerSlabs → two worktopGeometry rectangles; the L is a 948-deep rectangle in slab A');
const a3 = slabs3.find((s) => /-A$/.test(s.slab));
if (a3) {
  row('slab A of the corner pair, over the L and the wall-0 Standard',
    'not this: the L is one slab of its own',
    `x ${a3.x}, w ${a3.w}, d ${a3.d}: a ${a3.w} x ${a3.d} rectangle (${a3.boxAreaM2} m²) covering the L's inner corner and standing ${r2(a3.d - (558 + (P.doors?.gap || 0) + 25 + 20))} mm too deep over the Standard; shape ${a3.shape}, points ${a3.points}`,
    'worktop.js:392 a = worktopGeometry({units: onA})');
}

// ═══ 4 · THE BOM AND THE CUT LIST ═══════════════════════════════════════════
// Back to the lone L record for the BOM row of the one L slab.
S().removeWorktop(add3.id);
S().addWorktop([L.id]);
const entries = S().allResults();
const bom = buildBom(entries, { design: migrateDesign(S().project.design), profile: P, room: S().project.room });
const wtBlock = (bom.units || []).find((u) => u.unitId === 'worktops');
const wtRows = (wtBlock?.rows || []).filter((r) => r.role === 'worktop');
facts.bomRows = wtRows.map((r) => ({ id: r.id, w: r.w, h: r.h, area_m2: r.area_m2, label: r.material_label, readiness: r.readiness }));
row('`buildBom(entries, {design, profile, room})`: the lone L slab\'s BOM row',
  'one WORKTOP line, L-shaped, true area, the outline on the line',
  wtRows.length ? wtRows.map((r) => `WORKTOP ${r.w} x ${r.h}, area ${r.area_m2} m², "${r.material_label}", ${r.readiness}; outline on the row: ${'outline' in r}`).join('; ') : 'no WORKTOP row',
  'bom.js:202 to 235 (w = g.w, h = g.d bounding box; area from outline)');
const csv = buildCuttingListCsv(entries, P);
const csvWorktop = csv.split('\r\n').filter((l) => /WORKTOP/i.test(l));
facts.csvWorktopLines = csvWorktop.length;
row('`buildCuttingListCsv(entries)`: lines naming WORKTOP', 'the slab\'s cut list line carries the outline',
  `${csvWorktop.length} lines (the cut list is result.csvLines of computeCabinet, which never sees a worktop)`,
  'exporters.js:55 buildCuttingListCsv; worktop.js:20 "it reaches no hole and no fixture"');

// ═══ 5 · THE T71 SHEET ══════════════════════════════════════════════════════
// The plan seen from above the worktop ('plan-wall'): the slab is the poly on
// CARCASE filled '#f6f6f6' (setPlan.js:159). Its vertex count is the shape.
function sheetWorktopPolys() {
  const sheets = wallDrawingSheets({
    entries: S().allResults(), project: S().project, design: migrateDesign(S().project.design), room: S().project.room,
    worktops: S().worktopsOf(), profile: P,
  });
  const planWall = sheets.find((s) => s.variant === 'plan-wall');
  const ents = planWall?.sheet?.entities || [];
  const slabs = ents.filter((e) => e.kind === 'poly' && e.fill === '#f6f6f6' && e.layer === 'CARCASE');
  return { sheets: sheets.length, plan: planWall ? `${planWall.no} ${planWall.name}` : null, entities: ents.length, slabs: slabs.map((e) => e.pts.length) };
}
const sheetLone = sheetWorktopPolys();
facts.planLone = sheetLone;
row('`wallDrawingSheets(...)` on the lone L record: the plan above the worktop (plan-wall), the slab polys',
  'the L drawn as its six-point outline',
  `${sheetLone.sheets} sheets, "${sheetLone.plan}", ${sheetLone.entities} entities, slab polys with vertex counts ${j(sheetLone.slabs)}`,
  'setPlan.js:152 to 159 draws w.outline when present; setElevation.js:246 a rect; setSection.js:102 w.d');
S().removeWorktop(migrateDesign(S().project.design).worktops[0].id);
S().addWorktop([L.id, A1.id, B1.id].filter(Boolean));
const sheetThree = sheetWorktopPolys();
facts.planThree = sheetThree;
row('the same sheet on the "Add worktop (3)" record', 'the L outline and two straight slabs',
  `slab polys with vertex counts ${j(sheetThree.slabs)}: rectangles, the sheet draws what worktopsFor hands it`,
  'setPlan.js:154 falls to the four-corner box when there is no outline');

// ═══ 6 · THE MASK UNDER A CORNER_L_WALL ═════════════════════════════════════
S().newProject('T78 F2 probe mask');
S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
const LW = S().addUnit('CORNER_L_WALL', { wall: 0, x: WG, params: { corner_side: 'left' } });
const lw = () => S().units.find((u) => u.id === LW.id);
const WA = S().addUnit('WUD', { wall: 0, x: lw().position.x_mm + lw().params.width });
const armBEndW = wall3.width - (lw().position.x_mm + lw().params.depth);
const WB = S().addUnit('WUD', { wall: 3, x: armBEndW - 600 });
for (const id of [LW.id, WA.id, WB.id].filter(Boolean)) S().addBottomMask(id);
const maskUnits = S().units;
const maskMap = runMaskParams(maskUnits, P);
const lwMask = maskMap.get(LW.id);
const waMask = maskMap.get(WA.id);
const wbMask = maskMap.get(WB.id);
facts.mask = {
  L: { width: lw().params.width, depth: lw().params.depth, arm_mm: lw().params.arm_mm, x_mm: lw().position.x_mm, mount_height: lw().params.mount_height },
  elements: { L: lwMask, WA: waMask, WB: wbMask }, depthExtra: maskDepthExtra(P),
};
row('`addUnit(CORNER_L_WALL, corner)` + WUD at arm A end (wall 0) + WUD at arm B end (wall 3); `addBottomMask` on all three; `runMaskParams(units, P)`',
  'the L owns ONE L-shaped mask element (both arms, the mask depth law on each); the two WUDs own their own 400-deep boards from the arm ends',
  `L (${lw().params.width} x ${lw().params.depth}, arm ${lw().params.arm_mm}): ${j(lwMask)}; WUD wall 0: ${j(waMask)}; WUD wall 3: ${j(wbMask)}`,
  'runs.js:1209 segmentMask: length = right - left, depth = max(depth) + 10; runs.js:1179 maskSegments by run');
const lwResult = S().unitResult(LW.id);
const maskPanels = (lwResult?.panels || []).filter((p) => p.role === 'mask');
facts.maskPanels = maskPanels.map((p) => ({ id: p.id, w: p.w, h: p.h, t: p.thickness, box: p.box, cnc: p.cnc ? { kind: p.cnc.kind || p.cnc.type || null, keys: Object.keys(p.cnc), outline: p.cnc.outline ? p.cnc.outline.length : (p.cnc.points ? p.cnc.points.length : null) } : null, meta: p.meta }));
row('`computeCabinet` for the L with its run_mask: the MASK panel(s) cut',
  'one L board, front material, outline in the cut list',
  maskPanels.length ? maskPanels.map((p) => `${p.id} ${p.w} x ${p.h} x ${p.thickness}, box ${j(p.box)}, cnc ${p.cnc ? `${p.cnc.kind || p.cnc.type || Object.keys(p.cnc).join('/')}` : 'none'} (${p.cnc?.outline ? p.cnc.outline.length : (p.cnc?.points ? p.cnc.points.length : '?')} pts), meta ${j(p.meta)}`).join('; ') : 'NO MASK PANEL',
  'cabinet.js:5663 to 5684 rectGeometry(maskLen, maskD)');
const waResult = S().unitResult(WA.id);
const waPanels = (waResult?.panels || []).filter((p) => p.role === 'mask');
row('the wall-0 WUD beside the L: its own MASK panel', 'its own board, 400 + 10 deep, from the arm A end',
  waPanels.length ? waPanels.map((p) => `${p.id} ${p.w} x ${p.h}, box ${j(p.box)}`).join('; ') : `none: it is a MEMBER of the L's segment (${j(waMask)}), the L's one rectangle covers it at ${lwMask?.depth} deep`,
  'runs.js:1247 members cut nothing; cabinet.js:5664 maskMember');
const wbResult = S().unitResult(WB.id);
const wbPanels = (wbResult?.panels || []).filter((p) => p.role === 'mask');
row('the wall-3 WUD beside arm B: its own MASK panel', 'its own board, 400 + 10 deep, starting at the arm B end',
  wbPanels.length ? wbPanels.map((p) => `${p.id} ${p.w} x ${p.h}, box ${j(p.box)}; x_mm ${WB.id ? S().units.find((u) => u.id === WB.id).position.x_mm : '?'}, arm B end ${armBEndW}`).join('; ') : 'none',
  'runs.js:236 buildRuns (wall 3 is its own run)');
// The bare L alone (a golden's view): what the mask is with no run.
const bare = computeCabinet({ ...defaultParamsFor('CORNER_L_WALL', P), corner_side: 'left', bottom_mask: true }, P);
const bareMask = (bare.panels || []).filter((p) => p.role === 'mask');
facts.bareMask = bareMask.map((p) => ({ w: p.w, h: p.h, box: p.box }));
row('`computeCabinet(defaultParamsFor(CORNER_L_WALL) + bottom_mask)` alone', 'one L board',
  bareMask.length ? bareMask.map((p) => `${p.id} ${p.w} x ${p.h} x ${p.thickness}, cnc outline ${p.cnc?.outline ? p.cnc.outline.length : '?'} pts${p.cnc?.outline && p.cnc.outline.length === 4 ? ` (a rectangle W x (D + ${maskDepthExtra(P)}))` : ''}; box ${j(p.box)}; area ${p.area_m2}`).join('; ') : 'none',
  'cabinet.js:5665 wantsMask → :5681 rectGeometry');
const lwL = lwResult?.derived?.corner_l || null;
facts.cornerL = lwL;
row('the L\'s own plan (`derived.corner_l`) for comparison', 'arm, side, the inner corner the mask should follow',
  lwL ? j({ arm: lwL.arm, side: lwL.side, keys: Object.keys(lwL) }) : 'none', 'cabinet.js:3654 cornerLPlan');

// ═══ WRITE ══════════════════════════════════════════════════════════════════
if (process.argv.includes('--json')) {
  process.stdout.write(`${JSON.stringify({ facts, rows }, null, 2)}\n`);
}
const lines = [
  '# T78 F2 · PROBE: THE L WORKTOP AND THE L MASK ARE NOT L-SHAPED',
  '',
  'The owner (11.10.2026): *"dolna maskująca płyta nie wycina się w kształcie L oraz worktop nie wycina się w kształcie L."*',
  '',
  `Measured in node against the engine and the store (\`node scripts/t78-f02-probe.mjs\`), ${new Date().toISOString().slice(0, 10)}, tree at HEAD of \`claude/t78-the-list-of-11-10\`. Room 4000 x 3000 x 2500, wall gap ${WG}, doors.gap ${P.doors?.gap}, worktop 38 / front overhang 20 / side overhang 10, mask depthExtra ${maskDepthExtra(P)}. Every number below is what the code returned.`,
  '',
  '| # | Gesture or call | Expected | Observed | File:line that decides it |',
  '| - | - | - | - | - |',
  ...rows.map((r) => `| ${r.n} | ${cell(r.gesture)} | ${cell(r.expected)} | ${cell(r.observed)} | ${cell(r.where)} |`),
  '',
];
const AFTER = process.argv.includes('--after');
const name = AFTER ? 'f02-probe-after' : 'f02-probe';
if (AFTER) lines.splice(2, 0, 'The same probe RE-MADE after the F2 fix (worktop.js `lRunSlabs`, runs.js `maskSegments`, cabinet.js `MASK-L`); the committed BEFORE table is `f02-probe.md`.', '');
writeFileSync(`${OUT}${name}.md`, `${lines.join('\n')}\n`);
writeFileSync(`${OUT}${name}.json`, `${JSON.stringify(facts, null, 2)}\n`);
process.stdout.write(`written verify/t78/${name}.md (${rows.length} rows) and verify/t78/${name}.json\n`);
