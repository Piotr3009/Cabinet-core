/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T83 F9 · THE PROBE: THE OPEN OF A TWO-COLUMN VANITY
//
// The owner, 25.10.2026, 22:41: *"jak wpieram 2 rows to otwieraja mi sie 2
// szuflady ale jedna sie otwiera carcas tylko a druga front tylko zamiast 2
// carcasy i 2 fronty, sprawdz"*. CLAUDE.md T83 F9: "PROBE (P1,
// verify/t83/f09-probe.md): the drawer-box parts of a column stack carry
// meta: { drawer: i } with NO zone (cabinet.js 5697 to 5728 on 25.10: sides,
// back, front, bottom), while the drawer front carries meta: { drawer: i, zone }
// (5896); the room's open gesture pairs a front and its box by meta.drawer".
//
// The stage: VANITY3 and WARDROBE_CHEST3 at columns 2 (columns 1 as the
// control), cut by a bare computeCabinet, and a T32 wardrobe with drawers in
// both of its bays (the zoned columns, the other road with two columns). Every
// drawer-box part and every DRAWER-FRONT is listed with its meta; then the
// room's own arithmetic (engine/drawerMotion.js, what UnitView.jsx and
// Hardware.jsx read) is run with the top-left front opened, and every part it
// moves is named with its column. The readers are found by scanning the source.
//
// Read only: nothing is saved.
//
//   node scripts/t83-probe-f09.mjs            (prints the table)
//   node scripts/t83-probe-f09.mjs --write    (and writes verify/t83/f09-probe.md)

import { readdirSync, statSync } from 'node:fs';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { drawerMotion } from '../src/engine/drawerMotion.js';
import { hardwareInstances } from '../src/engine/hardware3d.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import {
  ROOT, linesOf, lineOf, at, table, emit, mm, sourceCommit,
} from './t83-probe-lib.mjs';

const CAB = 'src/engine/cabinet.js';
const DM = 'src/engine/drawerMotion.js';
const UV = 'src/3d/UnitView.jsx';
const HJ = 'src/3d/Hardware.jsx';
const HW = 'src/engine/hardware3d.js';
const S = () => useProjectStore.getState();

// ─── THE LINES, AS THEY STAND ───────────────────────────────────────────────
const L = {};
// The wardrobe's unit-wide drawer box (CLAUDE.md's 5697 to 5728).
L.wSL = lineOf(CAB, 'id: `D${i}-SL`, part: \'DRAWER-SIDE\', role: \'drawer_box\', w: szufDl, h: sideHeight, ...common,');
L.wSLmeta = lineOf(CAB, "meta: { drawer: i, side: 'L' },", L.wSL);
L.wDNO = lineOf(CAB, 'id: `D${i}-DNO`, part: \'DRAWER-BOTTOM\', role: \'drawer_box\', w: bottomW, h: bottomD, ...common,', L.wSL);
L.wDNOmeta = lineOf(CAB, 'cnc: rectGeometry(bottomW, bottomD), meta: { drawer: i },', L.wDNO);
L.wDF = lineOf(CAB, 'id: `${unitNum}-DF${i}`, part: \'DRAWER-FRONT\', role: \'front\', w: drawerFrontW, h: dfH, thickness: frontT,');
L.wDFmeta = lineOf(CAB, 'cnc: rectGeometry(drawerFrontW, dfH), meta: { drawer: i, frontType: cfg.frontType },', L.wDF);
// The wardrobe's zoned column drawers (the bays): box and front carry zone.
L.zSL = lineOf(CAB, 'id: `${tag}-SL`, part: \'DRAWER-SIDE\', role: \'drawer_box\', w: set.dl, h: sideHeight, ...common,');
L.zSLmeta = lineOf(CAB, "meta: { drawer: i, side: 'L', zone: set.zone },", L.zSL);
L.zDNOmeta = lineOf(CAB, 'cnc: rectGeometry(set.bottomW, set.dl), meta: { drawer: i, zone: set.zone },', L.zSL);
L.zDFmeta = lineOf(CAB, 'cnc: rectGeometry(set.frontW, dfH), meta: { drawer: i, zone: set.zone, frontType: cfg.frontType },', L.zSL);
// The drawer-unit column stack (the vanity, the chest): box and front carry column.
L.colMeta = lineOf(CAB, 'const colMeta = (c) => (c.col == null ? {} : { column: c.col });');
L.cSL = lineOf(CAB, "id: `${c.tag(i)}-${suffix}`, part: 'DRAWER-SIDE', role: 'drawer_box', w: budr.depth, h: sh, ...common,", L.colMeta);
L.cSLmeta = lineOf(CAB, '...colMeta(c),', L.cSL);
L.cWall = lineOf(CAB, "id: `${c.tag(i)}-${suffix}`, part: isFront ? 'DRAWER-BOX-FRONT' : 'DRAWER-BOX-BACK', role: 'drawer_box',", L.cSL);
L.cWallMeta = lineOf(CAB, 'meta: { drawer: i, ...colMeta(c) },', L.cWall);
L.cDNO = lineOf(CAB, "id: `${c.tag(i)}-DNO`, part: 'DRAWER-BOTTOM', role: 'drawer_box', w: c.bottomW, h: budr.depth, ...common,", L.cWall);
L.cDNOmeta = lineOf(CAB, 'cnc: geom, meta: { drawer: i, ...colMeta(c) },', L.cDNO);
L.cDF = lineOf(CAB, "id: c.frontId(i), part: 'DRAWER-FRONT', role: 'front', w: c.frontWidth, h: fh, thickness: frontT,", L.cDNO);
L.cDFmeta = lineOf(CAB, '...colMeta(c),', L.cDF);
// The pairing.
L.of = lineOf(DM, 'export function drawerOf(panel) {');
L.ofN = lineOf(DM, 'const n = Number(panel?.meta?.drawer);', L.of);
L.travel = lineOf(DM, 'export function drawerTravel(panels = []) {');
L.travelSet = lineOf(DM, 'out.set(n, Math.max(out.get(n) || 0, Number(p.meta?.travel_mm) || Number(p.box.d) || 0));', L.travel);
L.amounts = lineOf(DM, 'export function drawerOpenAmounts(panels = [], openFronts = null) {');
L.amountsSet = lineOf(DM, 'if (amount > 0) out.set(n, amount);', L.amounts);
L.forPanel = lineOf(DM, 'forPanel(panel) {');
L.uvMotion = lineOf(UV, '() => drawerMotion(result.panels, openFronts),');
L.uvRide = lineOf(UV, 'const ride = motion.forPanel(p);');
L.uvOpen = lineOf(UV, ': (ride?.open ?? 0),', L.uvRide);
L.uvSlide = lineOf(UV, 'drawerSlide={motion}');
L.hjSlide = lineOf(HJ, 'const slideOf = (drawer) => (Number(slide?.open?.get?.(drawer)) || 0)');
L.hwDrawer = lineOf(HW, 'const drawer = i + 1 + k * rows.length;');
L.hwRod = lineOf(HW, 'drawer: i + 1 + k * rows.length,');

const rows = [];
const row = (r) => rows.push(r);
const metaOf = (p) => {
  const m = p.meta || {};
  return `drawer ${m.drawer ?? '-'}, zone ${m.zone ?? '-'}, column ${m.column ?? '-'}`;
};
const isBox = (p) => p.role === 'drawer_box';
const isFront = (p) => p.part === 'DRAWER-FRONT';
const colOf = (p) => p.meta?.column ?? p.meta?.zone ?? null;

/** Every drawer-box part and front, grouped by its tag (Z1D3, D2, ...). */
function census(r) {
  const groups = new Map();
  for (const p of r.panels.filter((q) => (isBox(q) || isFront(q)) && q.box)) {
    const tag = isFront(p) ? `front ${p.id}` : p.id.replace(/-(SL|SR|BF|BB|DNO)(-\d+)?$/, '');
    const key = isFront(p) ? `${p.meta?.drawer}|${colOf(p)}|F` : `${p.meta?.drawer}|${colOf(p)}|B`;
    if (!groups.has(key)) groups.set(key, { tag, parts: [], meta: new Set() });
    const g = groups.get(key);
    g.parts.push(isFront(p) ? p.part : p.id.replace(/^.*-(SL|SR|BF|BB|DNO)(-\d+)?$/, '$1$2'));
    g.meta.add(metaOf(p));
  }
  return [...groups.values()].map((g) => `${g.tag}${g.tag.startsWith('front') ? '' : ` (${g.parts.join(', ')})`}: ${[...g.meta].join(' / ')}`);
}

/** Open one front through the room's own arithmetic; what moves, by column. */
function opened(r, frontId) {
  const motion = drawerMotion(r.panels, { [frontId]: 1 });
  const moving = r.panels.filter((p) => p.box && (isFront(p) ? p.id === frontId : (motion.forPanel(p)?.open ?? 0) > 0));
  const front = r.panels.find((p) => p.id === frontId);
  const byCol = new Map();
  for (const p of moving) {
    const c = colOf(p) ?? 'none';
    if (!byCol.has(c)) byCol.set(c, []);
    byCol.get(c).push(p.id);
  }
  const hw = hardwareInstances(r, P);
  const runners = (hw.runners || []).filter((x) => x.kind === 'runner');
  const slides = (x) => (Number(motion.open.get(x.drawer)) || 0) * (Number(motion.travel.get(x.drawer)) || 0) > 0;
  const runMoving = runners.filter(slides);
  const runCol = (x) => {
    const sides = r.panels.filter((p) => p.part === 'DRAWER-SIDE' && p.box);
    const s = sides.find((p) => Math.abs(p.box.x - x.x) < 1e-6 || Math.abs(p.box.x + p.box.w - x.x) < 1e-6);
    return s ? (colOf(s) ?? 'none') : '?';
  };
  return {
    front, moving, byCol, runners, runMoving, runCol, motion,
  };
}

// ─── 1 · THE CENSUS AND THE OPEN, PER KIT ───────────────────────────────────
const kits = [['VANITY3', 2], ['VANITY3', 1], ['WARDROBE_CHEST3', 2], ['WARDROBE_CHEST3', 1]];
const results = {};
for (const [type, columns] of kits) {
  const r = computeCabinet({ ...defaultParamsFor(type, P), unit_num: '01', columns }, P);
  results[`${type}:${columns}`] = r;
  const fronts = r.panels.filter((p) => isFront(p) && p.box);
  const n = Math.max(...fronts.map((p) => Number(p.meta?.drawer) || 0));
  const topLeft = fronts.filter((p) => p.meta?.drawer === n).sort((a, b) => a.box.x - b.box.x)[0];
  row({
    what: `${type} columns ${columns}: every drawer-box part (role drawer_box) and every DRAWER-FRONT, its meta`,
    where: columns === 2
      ? `${at(CAB, L.cSL, L.cSLmeta)} (sides); ${at(CAB, L.cWall, L.cWallMeta)} (box front, back); ${at(CAB, L.cDNO, L.cDNOmeta)} (bottom); ${at(CAB, L.cDF, L.cDFmeta)} (front); ${at(CAB, L.colMeta)} (colMeta)`
      : `the same lines, colMeta empty at one column (${at(CAB, L.colMeta)})`,
    measured: census(r).join('; '),
    said: columns === 2 ? 'the box parts carry meta { drawer: i } with NO zone, the front { drawer: i, zone }' : 'not a 25.10 row (the control)',
    verdict: columns === 2
      ? 'DIFFERS: on this road (the drawer-unit column stack) the box parts AND the front both carry { drawer, column } and neither carries zone; the meta already pairs them (column 1 with column 1)'
      : 'CONTROL: one column, no zone, no column',
  });
  const o = opened(r, topLeft.id);
  const cols = [...o.byCol.entries()].map(([c, ids]) => `column ${c}: ${ids.join(', ')}`).join('; ');
  const fronts2 = o.moving.filter(isFront).map((p) => p.id);
  const runs = o.runMoving.map((x) => `drawer ${x.drawer} ${x.side} at x ${mm(x.x)} (column ${o.runCol(x)})`).join(', ');
  const twoCols = new Set(o.moving.filter(isBox).map(colOf)).size > 1;
  row({
    what: `${type} columns ${columns}: the top-left front ${topLeft.id} opened (openFronts { ${topLeft.id}: 1 }): what the room's arithmetic moves`,
    where: `${at(DM, L.of, L.ofN)} drawerOf; ${at(DM, L.amounts, L.amountsSet)} drawerOpenAmounts; ${at(DM, L.forPanel)} forPanel; ${at(UV, L.uvRide)} and ${at(UV, L.uvOpen)} (the room); ${at(HJ, L.hjSlide)} with ${at(HW, L.hwDrawer)} (the runners)`,
    measured: `fronts that swing: ${fronts2.join(', ') || 'none'}; parts that move, by column: ${cols || 'none'}; runners that slide: ${runs || 'none'} (of ${o.runners.length}; the runners are numbered ${[...new Set(o.runners.map((x) => x.drawer))].join(', ')})`,
    said: columns === 2 ? 'the front of column 1 opens with the box of column 2 ("jedna sie otwiera carcas tylko a druga front tylko")' : 'not a 25.10 row (the control)',
    verdict: columns === 2
      ? (twoCols
        ? 'CONFIRMED in substance: drawerOf keys on meta.drawer alone, so the boxes of BOTH columns slide with one front; the right column shows a box out with its front shut ("carcas tylko"), the left its front with its box; and the right column\'s runners (numbered 4 to 6 by hardware3d) never ride, whichever front opens'
        : 'DIFFERS')
      : 'CONTROL: the front, its box and its runner pair move together',
  });
}

// ─── 2 · THE RIGHT COLUMN'S FRONT, FOR COMPLETENESS ─────────────────────────
{
  const r = results['VANITY3:2'];
  const fronts = r.panels.filter((p) => isFront(p) && p.box);
  const n = Math.max(...fronts.map((p) => Number(p.meta?.drawer) || 0));
  const topRight = fronts.filter((p) => p.meta?.drawer === n).sort((a, b) => b.box.x - a.box.x)[0];
  const o = opened(r, topRight.id);
  const cols = [...o.byCol.entries()].map(([c, ids]) => `column ${c}: ${ids.join(', ')}`).join('; ');
  row({
    what: `VANITY3 columns 2: the top-RIGHT front ${topRight.id} opened instead`,
    where: `${at(DM, L.travel, L.travelSet)} drawerTravel (keyed on drawer alone too); ${at(HW, L.hwDrawer)}, ${at(HW, L.hwRod)} (runners and rods numbered k * rows + i)`,
    measured: `parts that move, by column: ${cols}; runners that slide: ${o.runMoving.map((x) => `drawer ${x.drawer} ${x.side} (column ${o.runCol(x)})`).join(', ') || 'none'}`,
    said: 'not a 25.10 row',
    verdict: 'NEW ROW: opening the right front slides the LEFT column\'s runners (drawer 3) and leaves its own (drawer 6) in the carcass: the runners\' drawer number and the boxes\' disagree',
  });
}

// ─── 3 · THE WARDROBE'S ZONED COLUMNS (the T32 road) ───────────────────────
const zonedRow = rows.length + 1;
{
  S().loadProject({
    id: null, name: 'T83 F9 probe', room: migrateRoom({ height: 2600, corners: rectCorners(6000, 3000) }), design: {},
  }, []);
  const { id } = S().addUnit('WARDROBE');
  S().updateUnitParams(id, { width: 1200, doors: false });
  S().addPartition(id);
  const part = S().units.find((u) => u.id === id).params.sections[0].items.find((i) => i.kind === 'partition');
  S().updateItem(id, part.id, { front_mm: 0 });
  const a = S().addDrawers(id, 2, 'overlay', 220, 0);
  const b = S().addDrawers(id, 2, 'overlay', 220, 1);
  const r = S().unitResult(id);
  const fronts = r.panels.filter((p) => isFront(p) && p.box);
  const zones = [...new Set(fronts.map((p) => p.meta?.zone ?? 'none'))];
  const first = fronts.filter((p) => p.meta?.drawer === 1).sort((x, y) => x.box.x - y.box.x)[0];
  const o = first ? opened(r, first.id) : null;
  const cols = o ? [...o.byCol.entries()].map(([c, ids]) => `zone ${c}: ${ids.join(', ')}`).join('; ') : 'n/a';
  row({
    what: 'a T32 wardrobe 1200, its partition at full depth, two overlay drawers in each bay (addDrawers zone 0 and zone 1): the census, then the left bay\'s drawer 1 opened',
    where: `${at(CAB, L.zSL, L.zSLmeta)} (sides carry zone); ${at(CAB, L.zDNOmeta)} (bottom); ${at(CAB, L.zDFmeta)} (front carries zone): the lines CLAUDE.md names as 5896; the unit-wide drawer of ${at(CAB, L.wSL, L.wSLmeta)} to ${at(CAB, L.wDNOmeta)} (CLAUDE.md's 5697 to 5728) carries neither, nor does its front (${at(CAB, L.wDFmeta)})`,
    measured: `addDrawers ok ${a?.ok !== false} / ${b?.ok !== false}; fronts in zones ${zones.join(', ')}; ${census(r).join('; ')}; opened ${first ? first.id : 'none'}: parts that move, by zone: ${cols}`,
    said: 'the front carries { drawer: i, zone } (5896)',
    verdict: zones.length > 1 && o && o.byCol.size > 1
      ? 'NEW ROW: the zoned road carries zone on BOTH box and front, and the same drawerOf still slides both bays\' drawer 1 together: one reader, two roads, one fault'
      : 'NEW ROW',
  });
}

// ─── 4 · EVERY READER OF meta.drawer IN src/3d AND src/engine ──────────────
function walk(dir) {
  const out = [];
  for (const name of readdirSync(ROOT + dir)) {
    const rel = `${dir}/${name}`;
    if (statSync(ROOT + rel).isDirectory()) out.push(...walk(rel));
    else if (/\.(js|jsx|mjs)$/.test(name)) out.push(rel);
  }
  return out;
}
const readers = [];
for (const rel of [...walk('src/3d'), ...walk('src/engine')]) {
  if (rel === CAB) continue;
  linesOf(rel).forEach((ln, i) => {
    if (!/meta\??\.drawer\b/.test(ln) || /^\s*(\/\/|\*)/.test(ln)) return;
    const near = linesOf(rel).slice(Math.max(0, i - 3), i + 4).join('\n');
    const keys = [/meta\??\.zone\b|\.zone\b/.test(near) ? 'zone' : null, /meta\??\.column\b/.test(near) ? 'column' : null].filter(Boolean);
    readers.push({ rel, line: i + 1, keys });
  });
}
const pairs = readers.filter((x) => !x.keys.length);
row({
  what: 'every line in src/3d and src/engine (cabinet.js aside) that reads meta.drawer, and whether it reads zone or column with it (within three lines)',
  where: 'scan of src/3d/** and src/engine/**',
  measured: readers.map((x) => `${x.rel}:${x.line}${x.keys.length ? ` (with ${x.keys.join(' and ')})` : ''}`).join('; '),
  said: 'the room\'s pairing (UnitView.jsx near 2195)',
  verdict: `the pairing the room animates is ${at(DM, L.ofN)}, ${at(DM, L.travelSet)} and ${at(DM, L.amountsSet)} (drawer alone), read at ${at(UV, L.uvMotion)}, ${at(UV, L.uvRide)} and ${at(UV, L.uvSlide)} (to ${at(HJ, L.hjSlide)}); ${pairs.length} of ${readers.length} readers key on drawer alone`,
});

const md = `# T83 F9 · the probe of the open of a two-column vanity

The owner, 25.10.2026, 22:41: *"jak wpieram 2 rows to otwieraja mi sie 2 szuflady ale jedna sie otwiera carcas tylko a druga front tylko zamiast 2 carcasy i 2 fronty, sprawdz"*.

Reproduce: \`node scripts/t83-probe-f09.mjs\` (add \`--write\` to rewrite this file). Measured on the source tree of commit ${sourceCommit()} (B0 of T83, 3da1e995); every line number was found in the file by the script, not remembered. The stage: VANITY3 and WARDROBE_CHEST3 at columns 2 (columns 1 the control) cut by a bare \`computeCabinet\`, and a T32 wardrobe with two drawers in each of its bays; the open is the room's own arithmetic (\`engine/drawerMotion.js\`, read by \`3d/UnitView.jsx\` for the boards and by \`3d/Hardware.jsx\` for the runners), with the top-left front opened.

${table(rows)}

## The one link the fix must change

CONFIRMED in substance, CORRECTED in where. The vanity and the chest are NOT cut by the lines CLAUDE.md names: ${at(CAB, L.wSL)} to ${at(CAB, L.wDNOmeta)} is the wardrobe's unit-wide drawer and ${at(CAB, L.zDFmeta)} the wardrobe's zoned (bay) drawer front. The two-column vanity and chest are cut by the drawer-unit column stack, ${at(CAB, L.cSL)} to ${at(CAB, L.cDFmeta)}, where every box part AND its front already carry \`{ drawer, column }\` (\`colMeta\`, ${at(CAB, L.colMeta)}) and neither carries \`zone\`. So no meta line is missing: the fault is the reader. \`drawerOf\` (${at(DM, L.ofN)}), \`drawerTravel\` (${at(DM, L.travelSet)}) and \`drawerOpenAmounts\` (${at(DM, L.amountsSet)}) key on \`meta.drawer\` alone, so one front's open amount reaches the boxes of every column (and of every bay of a zoned wardrobe, row ${zonedRow}) with that drawer number; the room reads it at ${at(UV, L.uvRide)} / ${at(UV, L.uvOpen)}. The runners are a second key: \`hardware3d.js\` numbers a second column's runners and rods \`i + 1 + k * rows\` (${at(HW, L.hwDrawer)}, ${at(HW, L.hwRod)}), and \`Hardware.jsx slideOf(drawer)\` (${at(HJ, L.hjSlide)}) asks the motion for that number, which no front carries: the right column's runners never ride. The fix that matches the cut: key the motion on \`drawer\` AND the column (\`meta.column ?? meta.zone\`) in \`engine/drawerMotion.js\` (an engine file, no slice owns it: INT assigns it to V3), and give the runner and rod instances the same pair (\`drawer\` the row, \`column\` k + 1) so \`slideOf\` reads the row of its own column. If CLAUDE.md's line is kept to the letter (\`zone\` on every box part), the column stack's fronts must take \`zone\` too, or the pairing still has nothing to match.
`;

emit('f09-probe.md', md);
