/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T85 F2 . THE ENGINE MIRRORS KIT_RECESS.lsp D29 AND D30 (engine/extension.js section I3, engine/cabinet.js
// recessColumn, engine/checks.js #50).
//
// CLAUDE.md T85 F2.5: *"every number of the five fixtures read off the engine's panels (the walls' x, the box span
// and depth, the cap's L, the RETURN's pockets and the board's holes by count and position, #30 silent on the
// RETURN), the refusal sentences, and the byte identity of the six."*  Every number here is KIT_RECESS.lsp I4's.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import * as X from '../src/engine/extension.js';
import { notchProfile } from '../src/engine/notch.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { CHECKS, runChecks } from '../src/engine/checks.js';
import { notCutParts } from '../src/engine/readiness.js';
import { cabineoPositions } from '../src/engine/cabineo.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { goldenOf } from '../scripts/t75-golden.mjs';
import { dump } from '../scripts/t64-classify.mjs';
import {
  CASES, GATES, LICENSED, LIVENESS, GOLDENS, REPINNED,
} from '../scripts/t78-classify.d/f50-t85-f02.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const K = notchProfile(P);
const cut = (k) => computeCabinet(CASES[k](), P);
const panelOf = (r, id) => r.panels.find((p) => p.id === id);
const size = (r, id) => { const p = panelOf(r, id); return p ? [p.w, p.h] : null; };
const ids = (r, re) => r.panels.filter((p) => re.test(p.id)).map((p) => p.id);
const drillsOf = (r, panel, kind) => r.drills.filter((d) => d.panel === panel && d.kind === kind).map((d) => [d.x, d.y]);
const capPlan = (r) => panelOf(r, 'PARTITION').meta.extension.outline;
const bottomPlan = (r) => panelOf(r, 'BOTTOM').meta.extension.outline;
const box = (r, id) => panelOf(r, id).box;
const hwOf = (r, role) => (r.hardware || []).find((h) => h.role === role);
const check = (r, n) => runChecks({ entries: [{ unit: { id: 'u1', params: r.params }, result: r }], profile: P })
  .filter((f) => f.check === n);

// ─── the mirrors, routine for routine ────────────────────────────────────────

test('F2 . extension.js mirrors I3: the walls, the zone, the span, the edges, the places, the fillers, the Cabineo', () => {
  assert.deepEqual(X.recessColWalls(1200, 18, 210, 990, 30), [['DIVIDER', 228], ['DIVIDER', 972]]);
  assert.deepEqual(X.recessColWalls(1200, 18, 0, 690, 30), [['SIDE', 18], ['DIVIDER', 672]]);
  assert.deepEqual(X.recessColWalls(1200, 18, 25, 805, 30), [['RETURN', 43], ['DIVIDER', 787]]);
  assert.deepEqual(X.recessColWalls(1200, 18, 510, 1200, 30), [['DIVIDER', 528], ['SIDE', 1182]]);
  assert.deepEqual(X.recessColWalls(1200, 18, 48, 1152, 30), [['DIVIDER', 66], ['DIVIDER', 1134]], 'the owner\'s 30 exactly');
  assert.equal(X.recessColZone([['SIDE', 18], ['DIVIDER', 672]]), 0);
  assert.equal(X.recessColZone([['DIVIDER', 528], ['SIDE', 1182]]), 1);
  assert.equal(X.recessColZone([['SIDE', 18], ['SIDE', 1182]]), null);
  assert.deepEqual(X.recessColBoxSpan([['RETURN', 43], ['DIVIDER', 787]]), [43, 787]);
  assert.deepEqual(X.recessColCapEdges(1200, 18, [['RETURN', 43], ['DIVIDER', 787]]), [25, 787]);
  assert.deepEqual(X.recessColBottomEdges(1200, 18, [['RETURN', 43], ['DIVIDER', 787]]), [7, 787]);
  // Two dividers: D22's routines point for point.
  const pair = X.recessColWalls(1000, 18, 110, 890, 30);
  assert.deepEqual(X.recessColCapOutlineWalls(1000, 18, pair, 150, 540), X.recessColCapOutline(1000, 18, 110, 890, 150, 540));
  assert.deepEqual(X.recessColBottomOutlineWalls(1000, 568, 18, pair, 150), X.recessColBottomOutline(1000, 568, 18, 110, 890, 150));
  assert.deepEqual(X.recessColBoxPlacesWalls(1000, 568, 2150, 18, 110, 890, 0, 2150, 150, 647, pair),
    X.recessColBoxPlaces(1000, 568, 2150, 18, 110, 890, 0, 2150, 150, 647));
  assert.deepEqual(X.recessColWallFillers(1000, 568, 18, 110, 890, 629, 90, pair), X.recessColFillers(1000, 568, 18, 110, 890, 629, 90));
  assert.deepEqual(X.recessColTopJointsWalls(1000, 568, 18, 110, 890, 150, pair, K), X.recessColTopJoints(1000, 568, 18, 110, 890, K));
  assert.deepEqual(X.recessColReturnFull(2150, 18, 2150, 290), [290, 2132]);
  assert.deepEqual(X.recessColReturnFullPlace(25, 300, 2150, 18, 2150, 290), [25, 282, 18, 43, 572, 2150]);
  assert.deepEqual(X.recessColDeadPockets(1200, 18, 25, 805, [['RETURN', 43], ['DIVIDER', 787]]), [[18, 25]]);
  assert.deepEqual(X.recessReturnCabineo(210, 282, 18, 290, true, 5.5, 50, 250, 2, 16.7), [[50, 215.5, 332], [240, 215.5, 522]]);
  assert.deepEqual(X.recessReturnCabineo(972, 282, 18, 290, false, 5.5, 50, 250, 2, 16.7), [[50, 984.5, 332], [240, 984.5, 522]]);
  assert.deepEqual(cabineoPositions(290, 50, 250, 2, 16.7), [50, 240], 'the Cabineo law\'s, read');
  // D26's button stands: the pair, or null when the band reaches a side.
  assert.deepEqual(X.recessColPairX(1200, 210, 990, 18), [210, 972]);
  assert.equal(X.recessColPairX(1200, 0, 690, 18), null);
  assert.equal(X.recessColDividerX(1200, 0, 690, 600, 18), 672);
  // The size the RETURNs take: the unit's Cabineo 8 or 12, else 12.
  assert.equal(X.recessReturnCabineoSystem('cabineo8'), 'cabineo8');
  assert.equal(X.recessReturnCabineoSystem('puzzle'), 'cabineo12');
  assert.equal(X.recessReturnCabineoSystem(null), 'cabineo12');
});

test('F2 . recessColRefusal AMENDED: the side no longer refuses; the dividers asked only where they stand', () => {
  assert.equal(X.recessColRefusal(1200, 2150, 18, 0, 690, 0, 2150, null, 672, 18, 629, K), null);
  assert.equal(X.recessColRefusal(1200, 2150, 18, 25, 805, 0, 2150, null, 787, 18, 629, K), null);
  assert.equal(X.recessColRefusal(1200, 2150, 18, 210, 990, 0, 2150, 210, 972, 18, 629, K), null);
  assert.match(X.recessColRefusal(1200, 2150, 18, 0, 690, 0, 2150, null, 600, 18, 629, K),
    /^RECESS DRAWERS: the dividers do not stand on the recess's edges; the drawers keep the carcass's depth\.$/);
  assert.match(X.recessColRefusal(1200, 2150, 18, 0, 690, 200, 2150, null, 672, 18, 629, K),
    /^RECESS DRAWERS: the recess does not start on the floor; the drawers keep the carcass's depth\.$/);
  assert.match(X.recessColRefusal(1200, 2150, 18, 0, 690, 0, 700, null, 672, 18, 629, K),
    /the recess ends too close over the board over the drawers/);
  const src = read('src/engine/extension.js');
  assert.doesNotMatch(src.slice(src.indexOf('export function recessColRefusal'), src.indexOf('export function recessColWindow')),
    /return 'RECESS DRAWERS: the recess reaches a side of the carcass/);
});

// ─── the five cases of the mockup, off the engine's panels ───────────────────

test('F2 . CASE G (a), both edges in: the dividers on 210 and 972, the box 233..967, 440 deep, the L 192..972', () => {
  const r = cut('a');
  assert.deepEqual(r.warnings, []);
  assert.deepEqual(ids(r, /^VPART/), ['VPART-1', 'VPART-2']);
  assert.deepEqual([box(r, 'VPART-1').x, box(r, 'VPART-2').x], [210, 972]);
  assert.deepEqual(size(r, 'VPART-1'), [611, 572]);
  const sl = panelOf(r, 'Z2D1-SL');
  const sr = panelOf(r, 'Z2D1-SR');
  assert.deepEqual([sl.box.x, sr.box.x + sr.box.w, sl.w], [233, 967, 440]);
  assert.deepEqual(size(r, 'PARTITION'), [1164, 562]);
  assert.deepEqual(capPlan(r), [[0, 0], [1164, 0], [1164, 272], [972, 272], [972, 562], [192, 562], [192, 272], [0, 272]]);
  assert.deepEqual(bottomPlan(r).map((p) => p[0]).filter((x) => x > 0 && x < 1164), [972, 972, 192, 192]);
  assert.deepEqual([size(r, 'RETURN-L'), size(r, 'RETURN-R')], [[290, 1503], [290, 1503]]);
  assert.deepEqual(ids(r, /FILLER/), ['Z2-FILLER-L1', 'Z2-FILLER-L2', 'Z2-FILLER-R1', 'Z2-FILLER-R2']);
  // D30: two Cabineo 12 a RETURN, the pockets x 50 and 240 at its bottom end, the holes in the board over the drawers.
  for (const id of ['RETURN-L', 'RETURN-R']) {
    const p = panelOf(r, id);
    assert.equal(p.meta.readiness, 'cut', id);
    assert.equal(p.meta.fixing, 'cabineo12', id);
    assert.equal(p.meta.machinedFace, 'outside', id);
    assert.deepEqual(drillsOf(r, id, 'cabineo_pocket'), [[50, 3.6], [50, 14.8], [50, 26], [240, 3.6], [240, 14.8], [240, 26]], id);
    assert.equal(p.cnc.pockets.filter((k) => k.kind === 'cabineo_recess').length, 2, `${id}: the flush collar's two recesses`);
  }
  assert.deepEqual(drillsOf(r, 'PARTITION', 'cabineo_hole'), [[197.5, 240], [197.5, 50], [966.5, 240], [966.5, 50]]);
  assert.equal(hwOf(r, 'cabineo_connector').qty, 4);
  assert.equal(hwOf(r, 'cabineo_cap').qty, 4);
  assert.equal(hwOf(r, 'cabineo_connector').label, 'Cabineo 12');
  // #30 silent on the RETURN: no part the machine does not finish.
  assert.deepEqual(notCutParts(r), []);
  assert.deepEqual(r.derived.extension.returnCabineo.joints.map((j) => [j.name, j.offs]),
    [['RETURN-L-PARTITION', [50, 240]], ['RETURN-R-PARTITION', [50, 240]]]);
});

test('F2 . CASE G (b), the left edge 100 outside: one divider at 672, BUL the wall grown to 572, the L from BUL', () => {
  const r = cut('b');
  assert.deepEqual(r.warnings, []);
  assert.deepEqual(r.derived.extension.column.walls, [['SIDE', 18], ['DIVIDER', 672]]);
  assert.deepEqual(r.derived.extension.column.dividers, ['VPART-1']);
  assert.equal(r.derived.extension.column.zone, 0);
  assert.deepEqual(size(r, 'BUL'), [572, 2150]);
  assert.deepEqual(size(r, 'VPART-1'), [611, 572]);
  assert.equal(box(r, 'VPART-1').x, 672);
  const sl = panelOf(r, 'Z1D1-SL');
  const sr = panelOf(r, 'Z1D1-SR');
  assert.deepEqual([sl.box.x, sr.box.x + sr.box.w, sl.w], [23, 667, 440], 'wall to wall, 18 .. 672 less the runners\' 5');
  assert.deepEqual(capPlan(r), [[0, 0], [1164, 0], [1164, 272], [672, 272], [672, 562], [0, 562]]);
  assert.deepEqual(ids(r, /RETURN/), ['RETURN-R']);
  assert.deepEqual(size(r, 'RETURN-R'), [290, 1503]);
  assert.deepEqual(ids(r, /FILLER/), ['Z1-FILLER-R1', 'Z1-FILLER-R2']);
  assert.deepEqual(size(r, 'Z1-FILLER-R1'), [492, 611]);
  assert.deepEqual(ids(r, /DP/), [], 'no DP in a recess column');
  // The runners on BUL from its own front, as on any side; on VPART-1 as on a divider.
  assert.deepEqual([...new Set(drillsOf(r, 'BUL', 'runner').map(([x]) => x))], [112, 144, 368]);
  assert.deepEqual(drillsOf(r, 'PARTITION', 'cabineo_hole'), [[666.5, 240], [666.5, 50]]);
  assert.equal(hwOf(r, 'cabineo_connector').qty, 2);
  assert.deepEqual(notCutParts(r), []);
  assert.deepEqual(check(r, 50), []);
});

test('F2 . CASE G (c), the left edge 15 inside: the full-height RETURN the wall, the box 43..787, the dead pocket a NOTE', () => {
  const r = cut('c');
  assert.deepEqual(r.derived.extension.column.walls, [['RETURN', 43], ['DIVIDER', 787]]);
  assert.deepEqual(size(r, 'RETURN-L'), [290, 2132]);
  assert.deepEqual(box(r, 'RETURN-L'), { x: 25, y: 18, z: -272, w: 18, h: 2132, d: 290 });
  assert.deepEqual(size(r, 'RETURN-R'), [290, 1503]);
  assert.deepEqual(size(r, 'BUL'), [282, 2150], 'BUL is not the wall: it does not grow');
  const sl = panelOf(r, 'Z1D1-SL');
  const sr = panelOf(r, 'Z1D1-SR');
  assert.deepEqual([sl.box.x, sr.box.x + sr.box.w, sl.w], [48, 782, 440]);
  assert.deepEqual(capPlan(r), [[0, 0], [1164, 0], [1164, 272], [787, 272], [787, 562], [25, 562], [25, 272], [0, 272]]);
  assert.deepEqual(bottomPlan(r).map((p) => p[0]).filter((x) => x > 0 && x < 1164), [787, 787, 7, 7]);
  assert.deepEqual(ids(r, /FILLER/), ['Z1-FILLER-R1', 'Z1-FILLER-R2'], 'no filler in the dead pocket');
  assert.deepEqual(size(r, 'Z1-FILLER-R1'), [377, 611]);
  // The runner on the RETURN where its holes fall on it: the back one of three (368 from the face, 86 from the
  // RETURN's own front end), in its own frame (its inside face's, x from its front end, D30).
  assert.deepEqual(drillsOf(r, 'RETURN-L', 'runner'), [[86, 38], [86, 241], [86, 444]]);
  // D30: RETURN-L into the BOTTOM, RETURN-R into the board.
  assert.deepEqual(drillsOf(r, 'BOTTOM', 'cabineo_hole'), [[240, 12.5], [50, 12.5]]);
  assert.deepEqual(drillsOf(r, 'PARTITION', 'cabineo_hole'), [[781.5, 240], [781.5, 50]]);
  assert.deepEqual(r.derived.extension.returnCabineo.joints.map((j) => j.name), ['RETURN-L-BOTTOM', 'RETURN-R-PARTITION']);
  assert.equal(hwOf(r, 'cabineo_connector').qty, 4);
  assert.deepEqual(r.warnings.filter((w) => w.code === 'RECESS_RETURN_SKIN'), [], 'the skin holds');
  // The NOTE: #50, never red.
  assert.deepEqual(r.warnings.map((w) => w.code), ['RECESS_DEAD_POCKET']);
  assert.deepEqual(r.derived.extension.deadPockets, [[18, 25]]);
  const rows = check(r, 50);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].level, 'note');
  assert.match(rows[0].message, /^01: RECESS DRAWERS: the recess ends 7 mm from BUL, under the 30 mm a divider needs beside a side, so RETURN-L stands on its edge as the column's wall/);
  assert.deepEqual(CHECKS.find((c) => c.n === 50), { n: 50, level: 'note', label: 'Dead pocket beside a recess column\'s RETURN' });
  assert.deepEqual(notCutParts(r), []);
});

test('F2 . CASE G (d) and (e): out of the band; the bare wardrobe, and the 558 a plain column stack, full height', () => {
  const d = cut('d');
  assert.deepEqual(ids(d, /VPART|DRAWER|RETURN|Z\d/), []);
  assert.equal(d.derived.extension, undefined);
  const e = cut('e');
  assert.deepEqual(e.warnings, []);
  assert.deepEqual([size(e, 'VPART-1'), size(e, 'VPART-2')], [[2114, 540], [2114, 540]]);
  assert.deepEqual(size(e, 'Z2-PART'), [744, 530]);
  assert.equal(panelOf(e, 'Z2D1-SL').w, 440);
  assert.equal(e.derived.extension, undefined);
});

test('F2 . the engine\'s sentences for one divider: the count, and the column it must be', () => {
  const two = computeCabinet({ ...CASES.b(), items: [...CASES.b().items, { id: 'p9', kind: 'partition', x_mm: 900, front_mm: 0 }] }, P);
  const w2 = two.warnings.find((w) => w.code === 'RECESS_DRAWERS_SHALLOW');
  assert.match(w2.message, /beside one divider, on its other edge; this cabinet has 2, so they keep the carcass's depth\./);
  const off = computeCabinet({ ...CASES.b(), items: CASES.b().items.map((i) => (i.kind === 'partition' ? { ...i, x_mm: 600 } : i)) }, P);
  assert.match(off.warnings.find((w) => w.code === 'RECESS_DRAWERS_SHALLOW').message,
    /the dividers do not stand on the recess's edges; the drawers keep the carcass's depth\. Double-click the divider: "Align with recess" stands it on the recess's edge, at the face\.$/);
  const col = computeCabinet({
    ...CASES.b(),
    items: CASES.b().items.map((i) => (i.kind === 'drawer' ? { ...i, zone: 1 } : { ...i, x_mm: 300 })),
  }, P);
  assert.match(col.warnings.find((w) => w.code === 'RECESS_DRAWERS_SHALLOW').message,
    /the drawers go into the recess in Column 1, beside the divider on its edge; these stand in Column 2/);
});

test('F2 . the unit\'s own Cabineo size: a Cabineo 8 profile gives the RETURNs Cabineo 8', () => {
  const plan = X.recessReturnCabineoPlan({
    returns: [{ id: 'RETURN-L', place: [210, 282, 647, 228, 572, 2150], lft: true, onto: 'PARTITION', toBoard: (x, y) => [x, y] }],
    system: 'cabineo8', profile: P, G: 18,
  });
  assert.equal(plan.system, 'cabineo8');
  assert.equal(plan.variant, '8');
  assert.equal(X.recessReturnHardwareLines(plan)[0].label, 'Cabineo 8');
  assert.equal(X.recessReturnCabineoPlan({ returns: [], system: null, profile: P, G: 18 }), null);
});

// ─── the goldens, the six, the classifier ────────────────────────────────────

test('F2 . the five goldens byte for byte; golden-recess-drawers re-pinned with "1 - cabineo"; the six hold', () => {
  assert.deepEqual(GOLDENS.map((g) => g.file), ['golden-t85-a-both-in.json', 'golden-t85-b-left-out.json',
    'golden-t85-c-left-15.json', 'golden-t85-d-out.json', 'golden-t85-e-558-out.json']);
  for (const g of GOLDENS) {
    const file = JSON.parse(read(`fixtures/${g.file}`));
    assert.deepEqual(goldenOf(file.params, P), file.expected, g.file);
    assert.deepEqual(file.params, g.params(), g.file);
  }
  const drawers = JSON.parse(read('fixtures/golden-recess-drawers.json'));
  assert.deepEqual(goldenOf(drawers.params, P), drawers.expected);
  assert.match(drawers.meta.repinned, /^30\.10\.2026 \(T85 F2, KIT_RECESS\.lsp D30, the RETURNs on Cabineo\): "1 - cabineo"/);
  assert.deepEqual(REPINNED.map((x) => x.file), ['fixtures/golden-recess-drawers.json']);
  assert.match(REPINNED[0].why, /\*"1 - cabineo"\* \(the owner, 30\.10\.2026, 20:38\)/);
  const base = JSON.parse(read('verify/t70/goldens-base.json'));
  const head = dump();
  for (const id of ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY']) assert.equal(head[id].sha256, base[id].sha256, id);
  // A recess WITHOUT drawers keeps D11's outlines (its goldens stand): CASE A's RETURN-L.
  const plain = JSON.parse(read('fixtures/golden-recess.json'));
  assert.deepEqual(goldenOf(plain.params, P), plain.expected);
});

test('F2 . the classifier: two gates, each live; three engine files licensed with his words', () => {
  assert.deepEqual(Object.keys(GATES), ['recessColumnWalls', 'recessReturnCabineo']);
  for (const k of Object.keys(GATES)) assert.equal(LIVENESS[k]().live, true, `${k}: ${LIVENESS[k]().said}`);
  assert.deepEqual(Object.keys(LICENSED).sort(), ['src/engine/cabinet.js', 'src/engine/checks.js', 'src/engine/extension.js']);
  for (const v of Object.values(LICENSED)) assert.match(v.why, /2 - nie, tutaj musi byc minimum 30 mm/);
  for (const g of GOLDENS) assert.ok(GATES.recessColumnWalls.opens(g.params()) || !g.params().extension, g.file);
});
