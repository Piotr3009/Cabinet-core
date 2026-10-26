/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// --- T82 F9 . THE VANITY KITS: VANITY2, VANITY3, VANITY4 ---------------------
//
// The owner, 25.10.2026 (12:57): *"vanity unit (podobna zasada bedzie do chest
// drawers) vanity unit potrzebuje z szufladami nawierzchniowymi, wybor jak
// zawsze 2 3 i 4 ale pamietaj ze w vanity default to sa rowne"*, *"musimy miec
// tez wyciecie na trap, w razie czego jak nie bedzie miejsca to zostawimy
// informacje prosze uzyc shallow trap"*, *"miejsce z tylu na rurki minimum
// potrzebujemy okolo 80 mm do 100 mm i pamietaj ze nie ma plecow na vanity
// unit tylko sa poziome poprzeczki na dole i na gorze, plecy sa jakby
// wyciete"*; over the mockup (13:03): *"2 wyciecie u dookola zeby sie
// szuflada otwierala, 3 - 80, 4 - 100 na material carcasa grubosc"*; (13:46)
// *"6 - tak"*.
//
// What this file pins (CLAUDE.md T82 F8, F9), each number RUN out of
// reference/lisp/KIT_VANITY.lsp by test/lisp-mini.js and held to a bare
// computeCabinet of the kit:
//   . three kits, KIT_BUDR's grammar, the bathroom family, KIT_VANITY.lsp;
//   . born from profile.vanity.defaults (900 x 600 x 500), the service void
//     in `wall_gap` (the project's clearance + 80), read back by `wallGapOf`;
//   . EQUAL overlay fronts (D8), the parent's boxes on the runner less ten (D9);
//   . no BACK: RAIL-BOTTOM and RAIL-TOP, 100 high, in the carcass board, the
//     back's joint that lands inside them, the sides' back edges straight;
//   . the trap's U in the top drawer's box when a basin is asked for, the back
//     wall cut into boards, the bottom notched R 20, carried by the DXF;
//   . Check #39 in the LISP's sentences, yellow: the trap beyond the U (D15),
//     the shallow trap (D16); the engine never squashes;
//   . the joint systems the kit's table does not describe are refused in
//     words (#31), never cut half;
//   . the six and the chest hold; the new kits' own goldens hold.
//   . columns 2 (D10 to D12, D17), cut ONCE for every `drawerColumns` kit
//     (B5's `drawerColumnsPlan`, the chest's too), with the vanity's U in each
//     column's top box and the waste over the divider said in words.

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import {
  UNIT_NUM_PREFIX, UNIT_TYPES, UNIT_TYPE_ORDER, defaultParamsFor, getUnitType, isVanityKit,
} from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { CHECKS, runChecks } from '../src/engine/checks.js';
import { wallGapOf } from '../src/engine/runs.js';
import { takesWorktop } from '../src/engine/worktop.js';
import { buildUnitDxfFiles } from '../src/engine/cnc/dxf.js';
import { panelPlacement } from '../src/engine/joinery.js';
import { ELEMENT_TO_PART_ID } from '../src/engine/partRegistry.js';
import {
  vanityBoxesOf, vanityRailGeometry, vanitySpec, vanityTopBackDropped, vanityTopCutouts, vanityTrapVerdict,
  vanityWallGap, vanityWastes,
} from '../src/engine/vanity.js';
import { fitBasins } from '../src/engine/worktop.js';
import { notCutParts } from '../src/engine/readiness.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { rectCorners } from '../src/engine/room.js';
import { confirmDrawerBox } from './drawer-box-gate.js';
import { goldenOf } from '../scripts/t75-golden.mjs';
import { dump as dumpSix } from '../scripts/t64-classify.mjs';
import { loadLisp } from './lisp-mini.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const L = loadLisp(read('reference/lisp/KIT_VANITY.lsp'));

const VANITIES = [['VANITY2', 2], ['VANITY3', 3], ['VANITY4', 4]];
const near = (a, b, eps = 1e-3) => Math.abs(Number(a) - Number(b)) <= eps;
const kit = (id, extra = {}) => computeCabinet({ ...defaultParamsFor(id, P), unit_num: 'VU01', ...extra }, P);
const G = P.board.thickness;
const GB = P.wardrobe.drawers.boxSideThickness;
const FT = P.front.thickness;
const fronts = (r) => r.panels.filter((p) => p.part === 'DRAWER-FRONT' && p.role === 'front')
  .sort((a, b) => a.box.x - b.box.x || a.box.y - b.box.y);
const parts = (r, part) => r.panels.filter((p) => p.part === part);
const byId = (r, id) => r.panels.find((p) => p.id === id);
const runnerPairs = (r) => (r.hardware || []).find((h) => h.role === 'runner_pairs')?.qty ?? 0;
const trapSaid = (r) => r.warnings.filter((w) => w.code === 'VANITY_TRAP');
// AMENDED BY T83 F6 (25.10.2026, 22:41): *"carcas powinien byc do sciany, czyli wszystko w srodku carcasa mniejsze ale carcas do sciany"*:
// the vanity's boxes keep the service void behind them (KIT_VANITY.lsp D9, D27): vanity-boxes takes the void.
const VD = P.vanity.serviceVoidMm;

// ===========================================================================
// THE THREE KITS
// ===========================================================================

test('F9 . three kits, the drawer unit\'s grammar, the bathroom family, KIT_VANITY.lsp', () => {
  for (const [id, n] of VANITIES) {
    const t = UNIT_TYPES[id];
    const parent = UNIT_TYPES[{ 2: 'BUDR2', 3: 'BUDR', 4: 'BUDR4' }[n]];
    assert.ok(t, `${id} is not a kit`);
    assert.equal(t.id, id);
    assert.equal(t.family, 'bathroom', 'CLAUDE.md F9: the bathroom family');
    assert.equal(t.lisp, 'KIT_VANITY.lsp', 'LISP IS LAW: the kit names its file');
    assert.equal(t.drawerStyle, 'budr', 'D1: KIT_BUDR_FULL the parent, overlay fronts');
    assert.equal(t.drawerVariant, parent.drawerVariant, 'the count is the drawer unit\'s of the same number');
    assert.equal(t.equalDrawers, true, 'D8');
    assert.equal(t.drawerColumns, true, 'D10: the two columns, cut once for every kit that declares them');
    assert.equal(t.vanity, true);
    assert.ok(isVanityKit(id));
    assert.equal(t.defaultsKey, 'vanity.defaults');
    assert.equal(t.mount, 'floor', 'D19: on the plinth by default; floating is a parameter');
    assert.equal(t.legs, true);
    assert.equal(t.legSource, 'baseUnit');
    assert.equal(t.heightGroup, null, 'its 600 is its own: the project\'s base height must not replace it');
    assert.equal(t.ownDepth, true, 'its 500 is its own: the project\'s 558 must not replace it');
    assert.deepEqual(t.carcass, { top: 'panel', back: 'cut' }, 'D2: the back cut out');
    assert.equal(t.supports.doors, false);
    assert.equal(t.supports.drawers, true);
    assert.equal(t.supports.topInfill, false, 'D7: what goes on it is a worktop');
    assert.ok(takesWorktop(id), 'the worktop takes it');
    assert.equal(t.countsDrawerFrontsInPanels, false, 'KIT_BUDR\'s count');
    assert.equal(t.label, `Vanity unit, ${n} drawers`);
    assert.doesNotMatch(t.label, /[\u2013\u2014]/);
    assert.ok(UNIT_TYPE_ORDER.includes(id), `${id} is not in the order`);
    assert.equal(UNIT_NUM_PREFIX[id], 'VU', 'D22');
    for (const key of ['hingeRule', 'cupRule', 'hangers', 'doorExtend']) assert.deepEqual(t[key], parent[key], `${id}.${key} is the parent's`);
  }
  // No other kit carries the flags.
  for (const id of UNIT_TYPE_ORDER) {
    assert.equal(Boolean(getUnitType(id).vanity), /^VANITY[234]$/.test(id), id);
    assert.equal(Boolean(getUnitType(id).equalDrawers), /^VANITY[234]$/.test(id), id);
    assert.equal(getUnitType(id).carcass.back === 'cut', /^VANITY[234]$/.test(id), id);
  }
  assert.ok(!isVanityKit('BUDR') && !isVanityKit('WARDROBE_CHEST3'));
});

test('F9 . born from profile.vanity.defaults: 900 x 600 x 500, one column, one basin, at the wall (D6, D27)', () => {
  assert.equal(P.vanity.serviceVoidMm, 80, '"3 - 80"');
  assert.equal(vanityWallGap(P), L.call('vanity-wall-gap', P.room.wallBackClearance));
  for (const [id] of VANITIES) {
    const p = defaultParamsFor(id, P);
    assert.equal(p.width, 900);
    assert.equal(p.height, 600);
    assert.equal(p.depth, 500);
    assert.equal(p.columns, 1);
    assert.equal(p.sinks, 1, 'the LISP\'s worked example: one basin');
    assert.equal(p.floating, false, 'D19: on the floor (the room\'s, F13)');
    assert.equal(p.float_height_mm, P.vanity.defaults.floatHeightMm);
    // AMENDED BY T83 F6 (25.10.2026, 22:41): *"carcas powinien byc do sciany, czyli wszystko w srodku carcasa mniejsze ale carcas do sciany"*:
    // no wall_gap is written at birth: the vanity stands at the house's clearance like every unit (T82: 90).
    assert.equal(p.wall_gap, undefined);
    assert.equal(wallGapOf({ type: id, params: p }, P), P.room.wallBackClearance);
    assert.equal(wallGapOf({ type: id, params: p }, P), 10);
  }
  // No kit written before tonight is born with a vanity key.
  for (const id of UNIT_TYPE_ORDER) {
    if (/^VANITY/.test(id)) continue;
    const p = defaultParamsFor(id, P);
    for (const key of ['sinks', 'floating', 'float_height_mm', 'wall_gap']) assert.equal(p[key], undefined, `${id}.${key}`);
  }
});

test('F9 . born in a room by the road every unit takes: its own 600 x 500, at the wall (T83 F6), #39 as the LISP says', () => {
  const S = () => useProjectStore.getState();
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  confirmDrawerBox();
  const { id, error } = S().addUnit('VANITY3');
  assert.equal(error, null);
  const u = S().units.find((x) => x.id === id);
  assert.equal(u.params.unit_num, 'VU01');
  assert.deepEqual([u.params.width, u.params.height, u.params.depth], [900, 600, 500], 'the project\'s 770 and 558 do not replace its own');
  // AMENDED BY T83 F6 (25.10.2026, 22:41): *"carcas powinien byc do sciany, czyli wszystko w srodku carcasa mniejsze ale carcas do sciany"*:
  // the carcass to the wall at the house's clearance (T82: 90, the void as air behind it).
  assert.equal(u.params.wall_gap, undefined);
  assert.equal(wallGapOf(u, P), 10, 'the room stands it at the clearance, as every unit');
  assert.equal((u.params.sections?.[0]?.items || []).filter((i) => i.kind === 'drawer').length, 3, 'one drawer item a front');
  const r = S().unitResult(id);
  assert.ok(byId(r, 'RAIL-TOP') && byId(r, 'D3-BB-1') && !byId(r, 'BACK'));
  const found = S().runChecks().filter((f) => f.check === 39);
  // T83 F6: the shorter box's U reaches 205 (T82: 155); #39 says what the LISP says for the waste the profile sets.
  const lispSaid = (L.call('vanity-trap-verdict', 900, 600, 500, G, GB, FT, 3, 1, 1) || []).map((e) => `VU01: ${e[2].replace(/^#39 /, '')}`);
  assert.deepEqual(found.map((f) => f.message), lispSaid);
  // Nothing red on a vanity as it is born (the runner catalogue's amber aside).
  assert.deepEqual(S().runChecks().filter((f) => f.level === 'red' && f.unitId === id).map((f) => f.check), []);
});

// ===========================================================================
// THE FRONTS AND THE BOXES: THE LISP, RUN
// ===========================================================================

test('F9 . the fronts: EQUAL, the project gap between them, exactly the LISP\'s vanity-fronts (D8)', () => {
  for (const [id, n] of VANITIES) {
    for (const H of [600, 560, 601, 720]) {
      const r = kit(id, { height: H });
      const f = fronts(r);
      const lisp = L.call('vanity-fronts', 900, H, n, 1);
      assert.equal(f.length, n, `${id} ${H}`);
      assert.deepEqual(f.map((x) => [x.box.x, x.box.y, x.w, x.h]), lisp.map(([, , x, y, w, h]) => [x, y, w, h]), `${id} at ${H}`);
      assert.equal(f.reduce((s, x) => s + x.h, 0), H - n * P.baseDrawerUnit.gap, `${id} ${H} fills the face`);
    }
  }
  // The worked example: 197 197 197 at y 0 200 400, 897 wide at x 1.5.
  assert.deepEqual(fronts(kit('VANITY3')).map((x) => [x.box.x, x.box.y, x.w, x.h]),
    [[1.5, 0, 897, 197], [1.5, 200, 897, 197], [1.5, 400, 897, 197]]);
  assert.deepEqual(fronts(kit('VANITY2')).map((x) => x.h), [297, 297]);
  assert.deepEqual(fronts(kit('VANITY4')).map((x) => x.h), [147, 147, 147, 147]);
  // The heights stay editable, as the chest's are: what he said wins (budrHeightsWithOwn, untouched).
  const own = fronts(kit('VANITY3', { drawer_heights: [250, null, null] }));
  assert.equal(own[0].h, 250);
  assert.equal(own[0].h + own[1].h + own[2].h, 591);
});

test('F9 . the boxes: the parent\'s law on the runner less ten, exactly the LISP\'s vanity-boxes (D9)', () => {
  for (const [id, n] of VANITIES) {
    for (const [W, H, D] of [[900, 600, 500], [600, 560, 450], [1200, 720, 560]]) {
      const r = kit(id, { width: W, height: H, depth: D, sinks: 0 });
      const lisp = L.call('vanity-boxes', W, H, D, G, GB, FT, n, 1, VD);
      const engine = vanityBoxesOf(r.panels, { n, columns: 1 });
      assert.deepEqual(engine.map((b) => [b.col, b.idx, b.x0, b.bw, b.side, b.base, b.depth, b.zBack]), lisp, `${id} ${W} x ${H} x ${D}`);
      for (const b of lisp) {
        const [, idx] = b;
        assert.equal(byId(r, `D${idx}-BB`).w, L.call('vanity-box-len', b, GB));
        assert.equal(byId(r, `D${idx}-BB`).h, L.call('vanity-box-wall-h', b, GB));
        assert.equal(byId(r, `D${idx}-DNO`).w, L.call('vanity-box-bottom-w', b, GB));
      }
      assert.equal(runnerPairs(r), n);
    }
  }
});

// ===========================================================================
// NO BACK: TWO RAILS
// ===========================================================================

test('F9 . no BACK: RAIL-BOTTOM and RAIL-TOP, 100 high, in the carcass board, where the back stood (D2)', () => {
  for (const [id] of VANITIES) {
    const r = kit(id);
    assert.equal(parts(r, 'BACK').length, 0, `${id}: "nie ma plecow na vanity unit"`);
    for (const [name, x0, y0, z0, length, height, t] of L.call('vanity-rails', 900, 600, G)) {
      const rail = byId(r, name);
      assert.ok(rail, `${id}: ${name}`);
      assert.equal(rail.part, name);
      assert.equal(rail.role, 'back');
      assert.equal(rail.material_role, 'board', '"na material carcasa grubosc"');
      assert.deepEqual([rail.box.x, rail.box.y, rail.box.z, rail.box.w, rail.box.h, rail.box.d], [x0, y0, z0, length, height, t]);
      assert.deepEqual([rail.w, rail.h, rail.thickness], [length, height, t]);
      assert.equal(rail.cnc.drawn_w, length, 'drawn in the back\'s own frame');
      assert.equal(rail.cnc.outline.length, 4);
    }
    // Between the rails the back is open: nothing stands in the back's plane there.
    const [y0, y1] = L.call('vanity-back-window', 600);
    const inBack = r.panels.filter((p) => p.box && p.box.z + p.box.d <= G + 1e-6
      && p.box.y < y1 - 1e-6 && p.box.y + p.box.h > y0 + 1e-6);
    assert.deepEqual(inBack.map((p) => p.id), [], `${id}: the back is open between the rails`);
  }
  // The rails take the CARCASS slot, the board the caliper measured.
  const r19 = kit('VANITY3', { thickness_slots: { carcass1: 19 } });
  assert.equal(byId(r19, 'RAIL-TOP').thickness, 19);
  assert.equal(byId(r19, 'RAIL-BOTTOM').thickness, 19);
  // On the cut list, bought with the carcass horizontals (never the back's board).
  const csv = kit('VANITY3').csvLines.join('\n');
  assert.match(csv, /,RAIL-BOTTOM,900,100,/);
  assert.match(csv, /,RAIL-TOP,900,100,/);
  assert.doesNotMatch(csv, /,BACK,/);
  assert.equal(ELEMENT_TO_PART_ID['RAIL-BOTTOM'], 'carcase_horizontal');
  assert.equal(ELEMENT_TO_PART_ID['RAIL-TOP'], 'carcase_horizontal');
  // The view finds their frame (the back's).
  assert.deepEqual(panelPlacement(byId(kit('VANITY3'), 'RAIL-TOP')).origin, [0, 500, 0]);
});

test('F9 . the rails keep the back\'s joint that lands inside them; the sides keep no back tab (D3, D4)', () => {
  const r = kit('VANITY3');
  const pz = P.puzzle;
  // The sides: straight back edges, no dog bone (KIT_SINK's "no back tenons").
  for (const id of ['BUL', 'BUR']) {
    const s = byId(r, id);
    assert.equal(s.cnc.outline.length, 4, `${id}: no tab survives`);
    assert.equal(s.cnc.pockets.filter((p) => p.layer === pz.layers.dogbone).length, 0, `${id}: no dog bone`);
  }
  assert.equal(L.call('vanity-side-tabs-kept', 600), null, 'the LISP keeps none either');
  // The TOP's and BOTTOM's back tenons stay, in the rails' long-edge sockets.
  const budr = computeCabinet({ ...defaultParamsFor('BUDR', P), width: 900, height: 600, depth: 500 }, P);
  for (const id of ['TOP', 'BOTTOM']) assert.deepEqual(byId(r, id).cnc, byId(budr, id).cnc, `${id} is the parent's, tenons and all`);
  const back = byId(budr, 'BACK');
  const acrossBack = back.cnc.pockets.filter((p) => p.y1 < 0 || p.y2 > 600).map((p) => [p.x1, p.x2]).sort();
  const sockets = (id) => byId(r, id).cnc.pockets.map((p) => [p.x1, p.x2]);
  assert.deepEqual([...sockets('RAIL-BOTTOM'), ...sockets('RAIL-TOP')].sort(), acrossBack, 'the back\'s own sockets for them');
  // The screws: the back's end screws (50 into each rail, G / 2 in from its ends) and its row beside the sockets.
  for (const [rail, y] of L.call('vanity-rail-side-screws', 600)) {
    const holes = byId(r, rail).cnc.holes.filter((h) => h.kind === 'screw' && h.y === y);
    assert.deepEqual(holes.map((h) => h.x).sort((a, b) => a - b), [G / 2, 900 - G / 2], `${rail} at ${y}`);
  }
  // (after the review, D26: the rail's screw into the TOP's back edge at 450 stands in the basin's oval)
  const geom = vanityRailGeometry({
    W: 900, H: 600, G, puzzle: pz, dropped: vanityTopBackDropped(900, G, [450], pz, P),
  }, P)['RAIL-TOP'];
  const top = byId(r, 'RAIL-TOP').cnc;
  assert.deepEqual({ outline: top.outline, pockets: top.pockets, holes: top.holes }, geom);
  // And the drilling carries them: no hole on a BACK that is not there.
  assert.ok(r.drills.some((d) => d.panel === 'RAIL-BOTTOM' && d.kind === 'puzzle'));
  assert.equal(r.drills.filter((d) => d.panel === 'BACK').length, 0);
});

// ===========================================================================
// THE TRAP: THE U IN THE TOP DRAWER'S BOX
// ===========================================================================

test('F9 . the U: the top drawer\'s back wall cut into boards and its bottom notched, as the LISP cuts them (D13)', () => {
  const T = vanitySpec(P);
  assert.deepEqual([T.trapWidthMm, T.trapDepthMm, T.trapRadiusMm], [160, 120, 20], '"2 wyciecie u dookola", "6 - tak"');
  const r = kit('VANITY3', { sinks: 1 });
  const boxes = L.call('vanity-boxes', 900, 600, 500, G, GB, FT, 3, 1, VD);
  const [[tag, u]] = L.call('vanity-trap-us', 900, 600, 500, G, GB, FT, 3, 1, 1);
  assert.equal(tag, 'D3');
  const top = L.call('vanity-box-of', boxes, 1, 3);
  // The back wall: D3-BB-1 (0 329) and D3-BB-2 (489 818), no D3-BB.
  assert.equal(byId(r, 'D3-BB'), undefined);
  const pieces = L.call('vanity-back-pieces', top, [u], GB);
  const ids = L.call('vanity-piece-ids', tag, pieces.length);
  assert.deepEqual(ids, ['D3-BB-1', 'D3-BB-2']);
  pieces.forEach(([a0, a1], k) => {
    const p = byId(r, ids[k]);
    assert.ok(p, ids[k]);
    assert.equal(p.part, 'DRAWER-BOX-BACK', 'a box wall still');
    assert.equal(p.w, a1 - a0);
    assert.equal(p.box.x, top[2] + GB + a0);
    assert.equal(p.cnc.drawn_h, a1 - a0);
    assert.equal(p.meta.vanityTrap.widthMm, 160);
  });
  // The bottom: its back edge takes the notch, the LISP's six key points and two quarter arcs.
  const nt = L.call('vanity-u-in-bottom', top, u, GB);
  assert.deepEqual(nt, [335.5, 495.5, 120, 20]);
  const [keys, centres, rad] = L.call('vanity-u-outline', nt);
  const dno = byId(r, 'D3-DNO');
  const has = (x, y) => dno.cnc.outline.some(([px, py]) => near(px, x) && near(py, y));
  for (const [x, y] of keys) assert.ok(has(x, y), `the bottom's outline passes (${x}, ${y})`);
  const between = dno.cnc.outline.filter(([, y]) => y > 100 + 1e-6 && y < 120 - 1e-6);
  assert.ok(between.length >= 4, 'the two quarter arcs are traced');
  for (const [x, y] of between) {
    assert.ok(centres.some(([cx, cy]) => near(Math.hypot(x - cx, y - cy), rad, 1e-3)), `(${x}, ${y}) on an R ${rad} arc`);
  }
  assert.ok(near(dno.meta.vanityTrap.centreX, 450), 'centred under the waste');
  // The lower drawers are whole; no drawer below the top one ever takes a U.
  for (const id of ['D1-BB', 'D2-BB', 'D1-DNO', 'D2-DNO']) assert.equal(byId(r, id).cnc.outline.length, 4, id);
  // sinks 0: no basin, no U, every box whole.
  const none = kit('VANITY3', { sinks: 0 });
  assert.ok(byId(none, 'D3-BB'));
  assert.equal(none.panels.filter((p) => p.meta?.vanityTrap).length, 0);
  assert.equal(L.call('vanity-trap-us', 900, 600, 500, G, GB, FT, 3, 1, 0), null);
  // The CNC carries it: the top bottom's file is the U's, the wall's two boards are two files.
  const files = (x) => buildUnitDxfFiles(x, P);
  const f1 = files(r).find((f) => f.panelId === 'D3-DNO');
  const f0 = files(none).find((f) => f.panelId === 'D3-DNO');
  assert.notEqual(f1.dxf, f0.dxf, 'the U is in the export');
  assert.ok(files(r).some((f) => f.panelId === 'D3-BB-1') && files(r).some((f) => f.panelId === 'D3-BB-2'));
  // The cut list lists the two boards.
  assert.match(r.csvLines.join('\n'), /D3-BB-1/);
});

test('F9 . two basins on one column: two U\'s at a third and two thirds, three boards (D14)', () => {
  assert.deepEqual(vanityWastes({ W: 900, columns: 1, sinks: 2 }), L.call('vanity-wastes', 900, 1, 2));
  assert.deepEqual(vanityWastes({ W: 900, columns: 1, sinks: 1 }), [450]);
  assert.deepEqual(vanityWastes({ W: 900, columns: 2, sinks: 2 }), L.call('vanity-wastes', 900, 2, 2));
  assert.deepEqual(vanityWastes({ W: 900, columns: 1, sinks: 0 }), []);
  const r = kit('VANITY3', { sinks: 2 });
  const top = L.call('vanity-box-of', L.call('vanity-boxes', 900, 600, 500, G, GB, FT, 3, 1, VD), 1, 3);
  const us = L.call('vanity-trap-us', 900, 600, 500, G, GB, FT, 3, 1, 2).map(([, u]) => u);
  const pieces = L.call('vanity-back-pieces', top, us, GB);
  assert.deepEqual(pieces, [[0, 179], [339, 479], [639, 818]]);
  assert.deepEqual(['D3-BB-1', 'D3-BB-2', 'D3-BB-3'].map((id) => byId(r, id)?.w), pieces.map(([a, b]) => b - a));
  assert.deepEqual(byId(r, 'D3-DNO').meta.vanityTrap.centres, [300, 600]);
});

// ===========================================================================
// CHECK #39: THE ROOM SAYS SO, IN THE LISP'S SENTENCES
// ===========================================================================

test('F9 . #39: the trap beyond the U (D15) and the shallow trap (D16), yellow, never a re-cut', () => {
  const row = CHECKS.find((c) => c.n === 39);
  assert.ok(row, 'Check #39 is registered');
  assert.equal(row.level, 'yellow');
  assert.match(row.label, /shallow trap/i);
  const sentences = (r) => trapSaid(r).map((w) => `#39 ${w.message}`);
  // The default sink vanity: the confirmed U (120) and the proposed waste disagree where the waste stands beyond
  // the U (D15). AMENDED BY T83 F6 (25.10.2026, 22:41): *"carcas powinien byc do sciany, czyli wszystko w srodku carcasa mniejsze ale carcas do sciany"*:
  // the shorter box's back face at 85, the U reaches 205 (T82: 155, "45 mm beyond" at the waste 200).
  const def = kit('VANITY3');
  const zw = P.vanity.wasteFromBackMm;
  const reach = 85 + 120 - zw;
  assert.deepEqual(sentences(def), (L.call('vanity-trap-verdict', 900, 600, 500, G, GB, FT, 3, 1, 1) || []).map((e) => e[2]));
  assert.deepEqual(sentences(def), reach < 0
    ? [`#39 The trap stands ${-reach} mm beyond the U: the U reaches 205 from the carcass back, the waste stands at ${zw}`] : []);
  // No basin, nothing to say.
  assert.deepEqual(trapSaid(kit('VANITY3', { sinks: 0 })), []);
  // Four drawers in a 560 carcass: the box under the top one stands 59 under the trap's bottom (D16).
  const tight = kit('VANITY4', { height: 560 });
  const lisp = L.call('vanity-trap-verdict', 900, 560, 500, G, GB, FT, 4, 1, 1);
  assert.deepEqual(sentences(tight), lisp.map((e) => e[2]));
  assert.ok(sentences(tight).includes('#39 Use a shallow trap: the drawer under it stands 59 mm under the trap\'s bottom, 60 wanted'));
  // ...the same at 600: 62 of air, no shallow trap.
  assert.ok(!sentences(kit('VANITY4')).some((s) => /shallow/.test(s)));
  // The engine never squashes: the top U is cut as asked, no second U anywhere.
  assert.ok(byId(tight, 'D4-BB-1') && byId(tight, 'D3-BB'));
  assert.equal(tight.panels.filter((p) => p.meta?.vanityTrap && p.meta.drawer !== 4).length, 0);
  // The engine's verdict is the LISP's, read off the boards as cut.
  assert.deepEqual(vanityTrapVerdict({
    boxes: vanityBoxesOf(tight.panels, { n: 4, columns: 1 }), n: 4, columns: 1, sinks: 1, W: 900, GB,
  }, P).map((v) => [v.kind, v.x, v.sentence]), lisp);
  // The Check reads the engine's own words, once per sentence, yellow.
  const unit = { id: 'u1', type: 'VANITY4', params: { ...defaultParamsFor('VANITY4', P), height: 560, unit_num: 'VU01' } };
  const found = runChecks({ entries: [{ unit, result: tight }], units: [unit], profile: P }).filter((f) => f.check === 39);
  // T83 F6: the REACH sentence only where the waste stands beyond the shorter box's U (205), as above.
  assert.equal(found.length, reach < 0 ? 2 : 1);
  for (const f of found) assert.equal(f.level, 'yellow');
  assert.ok(found.some((f) => f.message === 'VU01: Use a shallow trap: the drawer under it stands 59 mm under the trap\'s bottom, 60 wanted'));
  assert.equal(found.some((f) => f.trap === 'REACH'), reach < 0);
});

// ===========================================================================
// THE JOINT SYSTEMS: REFUSED IN WORDS WHERE THE TABLE IS SILENT
// ===========================================================================

test('F9 . Cabineo, biscuits and dowels on a vanity carcass are refused in words (#31) and it keeps the puzzle', () => {
  const puzzle = kit('VANITY3');
  for (const system of ['cabineo8', 'cabineo12', 'biscuit', 'dowel']) {
    const r = kit('VANITY3', { joints_system: system });
    const said = r.warnings.find((w) => w.code === 'JOINTS_REFUSED');
    assert.ok(said, `${system}: refused in words`);
    assert.match(said.message, /VANITY3/);
    for (const id of ['BUL', 'BUR', 'TOP', 'BOTTOM', 'RAIL-BOTTOM', 'RAIL-TOP']) {
      assert.deepEqual(byId(r, id).cnc, byId(puzzle, id).cnc, `${system}: ${id} is the puzzle cut`);
    }
  }
  // The box on Cabineo 12 (T79 F14) splits with the wall: each board keeps the joint at its own end.
  const cab = kit('VANITY3', { joints_system: 'cabineo12' });
  const whole = byId(cab, 'D2-BB').cnc.pockets.length;
  assert.ok(whole > 0, 'the box walls are on Cabineo');
  assert.equal(byId(cab, 'D3-BB-1').cnc.pockets.length + byId(cab, 'D3-BB-2').cnc.pockets.length, whole);
  assert.equal(cab.drills.filter((d) => d.panel === 'D3-BB').length, 0, 'no drill on a board that is not cut');
});

// ===========================================================================
// COLUMNS 2: ONE CUT FOR EVERY drawerColumns KIT (B5's), THE VANITY'S U IN EACH
// ===========================================================================

test('F9 . columns 2: one DIVIDER mid-width, a stack each side, six boxes at three drawers (D10 to D12)', () => {
  const r = kit('VANITY3', { columns: 2, sinks: 2 });
  const [name, x0, y0, z0, w, h, d] = L.call('vanity-divider', 900, 600, 500, G, 2);
  const div = byId(r, name);
  assert.ok(div);
  assert.deepEqual([div.box.x, div.box.y, div.box.z, div.box.w, div.box.h, div.box.d], [x0, y0, z0, w, h, d]);
  assert.deepEqual(fronts(r).map((x) => [x.box.x, x.box.y, x.w, x.h]), L.call('vanity-fronts', 900, 600, 3, 2).map(([, , x, y, fw, fh]) => [x, y, fw, fh]));
  assert.deepEqual(vanityBoxesOf(r.panels, { n: 3, columns: 2 }).map((b) => [b.col, b.idx, b.x0, b.bw, b.side, b.base, b.depth, b.zBack]),
    L.call('vanity-boxes', 900, 600, 500, G, GB, FT, 3, 2, VD));
  assert.equal(runnerPairs(r), 6);
  assert.deepEqual(r.derived.vanity.trap.cuts.map((c) => c.tag), ['Z1D3', 'Z2D3']);
  assert.ok(byId(r, 'Z1D3-BB-1') && byId(r, 'Z1D3-BB-2') && byId(r, 'Z2D3-BB-2'));
  // One basin on two columns: its waste stands on the divider, no U, the sentence (D17).
  const one = kit('VANITY3', { columns: 2, sinks: 1 });
  assert.equal(one.panels.filter((p) => p.meta?.vanityTrap).length, 0);
  assert.deepEqual(trapSaid(one).map((x) => `#39 ${x.message}`), ['#39 The trap stands over the divider: no top drawer can take its U']);
});

// ===========================================================================
// AFTER THE REVIEW OF 25.10.2026 (KIT_VANITY.lsp D23 to D26)
// ===========================================================================

/** The back-wall boards a vanity's top boxes were cut into, by width. */
const backBoards = (r) => r.panels.filter((p) => /-BB-\d+$/.test(p.id)).map((p) => p.w);

test('F9, after the review . D23: no U leaves a back-wall board under 30; a U that misses it is FIT, said, never cut', () => {
  assert.equal(vanitySpec(P).backPieceMinMm, 30, 'PROPOSED, profile.vanity.backPieceMinMm');
  // The review's cases: W 484 on two columns with two basins (0 x 104 boards), W 242 with one, W 480 with two on one column.
  for (const [W, columns, sinks] of [[484, 2, 2], [242, 1, 1], [480, 1, 2]]) {
    const r = kit('VANITY3', { width: W, columns, sinks });
    const lisp = L.call('vanity-trap-verdict', W, 600, 500, G, GB, FT, 3, columns, sinks);
    assert.deepEqual(trapSaid(r).map((w) => `#39 ${w.message}`), lisp.map((e) => e[2]), `${W} / ${columns} / ${sinks}`);
    assert.ok(lisp.some((e) => e[0] === 'FIT'));
    assert.ok(trapSaid(r).some((w) => w.kind === 'FIT'
      && w.message === 'The trap\'s U does not fit the top drawer\'s box: every board of its back wall keeps 30'));
    const cut = (L.call('vanity-trap-us', W, 600, 500, G, GB, FT, 3, columns, sinks) || []).map(([tag]) => tag);
    assert.deepEqual(r.derived.vanity.trap.cuts.map((c) => c.tag), cut, 'the engine cuts exactly the LISP\'s U\'s');
    for (const w of backBoards(r)) assert.ok(w >= 30, `${W}: a ${w} board`);
  }
  // The first widths that take the U's (B1's report): 302 on one basin, 604 on two columns with two.
  assert.ok(byId(kit('VANITY3', { width: 302 }), 'D3-BB-1'));
  assert.ok(byId(kit('VANITY3', { width: 604, columns: 2, sinks: 2 }), 'Z2D3-BB-2'));
  // The sweep: every width, one and two columns, one and two basins: the LISP's U's, and no board under 30.
  for (let W = 240; W <= 2400; W += 22) {
    for (const [columns, sinks] of [[1, 1], [1, 2], [2, 1], [2, 2]]) {
      const r = kit('VANITY3', { width: W, columns, sinks });
      if (columns === 2 && !byId(r, 'DIVIDER')) continue;   // two columns refused in words below their walls (B5's)
      const r4 = (v) => Math.round(v * 1e4) / 1e4;
      const cut = (L.call('vanity-trap-us', W, 600, 500, G, GB, FT, 3, columns, sinks) || []).map(([tag, u]) => [tag, r4(u[1]), r4(u[2])]);
      assert.deepEqual(r.derived.vanity.trap.cuts.flatMap((c) => c.us.map((u) => [c.tag, u.from, u.to])), cut, `${W} / ${columns} / ${sinks}`);
      for (const w of backBoards(r)) assert.ok(w >= 30 - 1e-9, `${W} / ${columns} / ${sinks}: a ${w} board`);
    }
  }
});

test('F9, after the review . D24: under a basin the top row and the row under it refuse a double, in words; lower rows keep the parent\'s', () => {
  const refused = (r) => r.warnings.filter((w) => w.code === 'DOUBLE_DRAWER_REFUSED').map((w) => w.message);
  for (const [n, id] of [[3, 'VANITY3'], [4, 'VANITY4']]) {
    for (const sinks of [0, 1, 2]) {
      for (let row = 1; row <= n; row += 1) {
        const r = kit(id, { sinks, drawer_double: { [row]: true } });
        const lispSays = L.call('vanity-double-refused-p', row, n, sinks) === true;
        const said = refused(r).includes(L.call('vanity-double-refusal', row));
        assert.equal(said, lispSays, `${id} sinks ${sinks} row ${row}`);
        if (lispSays) {
          assert.equal(r.panels.filter((p) => p.meta?.inner && p.meta?.double).length, 0, 'one box is cut: no inner drawer');
          assert.equal(refused(r).length, 1, 'said once, in the LISP\'s words only');
        }
      }
    }
  }
  assert.equal(L.call('vanity-double-refusal', 3),
    'Drawer 3: a double drawer is not cut under a basin: the trap\'s U is the top box\'s and its air is measured to the box under it. One box is cut.');
  // The U stays the top box's, and the shallow air is measured to the one box under it.
  const r = kit('VANITY4', { height: 560, drawer_double: { 3: true, 4: true } });
  assert.ok(byId(r, 'D4-BB-1') && byId(r, 'D3-BB'));
  assert.ok(trapSaid(r).some((w) => w.kind === 'SHALLOW' && /59 mm/.test(w.message)));
});

test('F9, after the review . D18: the carcass TOP takes the oval of each basin the top takes, a NOTE the room reads, never on the CNC', () => {
  const r = kit('VANITY3');
  const fitted = fitBasins({ type: 'VANITY3', params: { ...defaultParamsFor('VANITY3', P), unit_num: 'VU01' } }, P).fitted.map((b) => b.cx);
  assert.deepEqual(fitted, [450], 'engine/worktop.js fitBasins, the one source');
  const top = byId(r, 'TOP');
  const rec = top.meta.vanityBasins;
  assert.ok(rec, 'the record the room draws the hole from: TOP.meta.vanityBasins');
  // The LISP's oval, in the TOP's own frame: (432 182 520 400 "EDGE").
  assert.deepEqual(rec.cutouts.map((c) => [c.cx, c.cz, c.w, c.d, c.opens]), L.call('vanity-top-cutouts', fitted, G));
  assert.deepEqual(rec.cutouts.map((c) => [c.x, c.z]), [[450, 200]], 'and in the unit\'s frame: the waste');
  assert.equal(rec.note, L.call('vanity-top-cutout-note', 'VU01'));
  assert.equal(rec.note, 'Basin cut-out 520 x 400 oval in the carcass top of VU01: cut on site to the basin\'s template.');
  assert.equal(rec.readiness, 'manual');
  assert.equal(rec.machined, false);
  assert.deepEqual(r.derived.vanity.top, rec);
  assert.deepEqual(r.derived.vanity.basins, fitted);
  // Never on the CNC: the TOP's outline is the parent's, no hole in it.
  const budr = computeCabinet({ ...defaultParamsFor('BUDR', P), width: 900, height: 600, depth: 500 }, P);
  assert.deepEqual(top.cnc.outline, byId(budr, 'TOP').cnc.outline);
  // The joiner's list says it: the TOP is cut, its hole is fitted on site (#30).
  assert.ok(notCutParts(r).some((x) => x.id === 'TOP basin cut-out' && x.state === 'manual'));
  // A basin the top refuses is cut in neither: two on a 900 column take one oval.
  const two = kit('VANITY3', { sinks: 2 });
  assert.deepEqual(byId(two, 'TOP').meta.vanityBasins.cutouts.map((c) => c.x), [300]);
  // No basin: no record, no note.
  const none = kit('VANITY3', { sinks: 0 });
  assert.equal(byId(none, 'TOP').meta?.vanityBasins, undefined);
  assert.ok(!notCutParts(none).some((x) => x.part === 'BASIN-CUTOUT'));
  assert.deepEqual(vanityTopCutouts([225, 675], G, P).map((c) => [c.cx, c.cz, c.w, c.d, c.opens]), L.call('vanity-top-cutouts', [225, 675], G));
});

test('F9, after the review . D26: the TOP\'s back joint the oval meets is not cut, on the TOP, on RAIL-TOP and in the drilling', () => {
  const pz = P.puzzle;
  // The LISP's: the default drops the rail's screw at 450; two basins on two columns both tenons.
  for (const [W, xs] of [[900, [450]], [900, [225, 675]], [900, [300, 600]], [1200, [300, 900]], [380, [190]]]) {
    assert.deepEqual(vanityTopBackDropped(W, G, xs, pz, P).map((f) => [f.kind, f.x]), L.call('vanity-top-back-dropped', W, G, xs) || [], `${W} ${xs}`);
  }
  const r = kit('VANITY3');
  assert.deepEqual(byId(r, 'TOP').meta.vanityBasins.dropped, [{ kind: 'SCREW', x: 450 }]);
  const railTop = byId(r, 'RAIL-TOP').cnc.holes.filter((h) => h.kind === 'screw').map((h) => [h.x, h.y]);
  assert.ok(!railTop.some(([x, y]) => x === 450 && y === 100 - G / 2), 'the rail\'s screw into the TOP\'s back edge at 450 is not cut');
  assert.ok(byId(r, 'RAIL-BOTTOM').cnc.holes.some((h) => h.x === 450 && h.y === G / 2), 'the bottom rail keeps its own');
  assert.equal(byId(r, 'RAIL-TOP').cnc.pockets.length, 2, 'the tenons at 113 and 787 stay, with their sockets');
  assert.ok(!r.drills.some((d) => d.panel === 'RAIL-TOP' && d.x === 450));
  // A tenon the oval meets: a 300 basin on a 380 vanity (the basin's size is the profile's).
  const P2 = { ...P, vanity: { ...P.vanity, basin: { ...P.vanity.basin, widthMm: 300 } } };
  const small = computeCabinet({ ...defaultParamsFor('VANITY3', P2), width: 380, unit_num: 'VU01' }, P2);
  const plain = computeCabinet({ ...defaultParamsFor('VANITY3', P2), width: 380, unit_num: 'VU01', sinks: 0 }, P2);
  assert.deepEqual(byId(small, 'TOP').meta.vanityBasins.dropped.map((f) => [f.kind, f.x]), [['TENON', 113], ['TENON', 267], ['SCREW', 190]]);
  const topOf = (x) => byId(x, 'TOP').cnc;
  assert.equal(topOf(small).outline.length, topOf(plain).outline.length - 2 * 10, 'the two back tenons are off the TOP\'s outline');
  assert.equal(topOf(small).pockets.length, topOf(plain).pockets.length - 2, '...with their dog bones');
  assert.equal(byId(small, 'RAIL-TOP').cnc.pockets.length, 0, 'RAIL-TOP cuts no socket for them');
  assert.equal(small.drills.filter((d) => d.panel === 'RAIL-TOP' && d.kind === 'puzzle').length, 0);
  // The TOP's long edges (its tenons into the sides) are the parent's still.
  const sideTabs = (cnc) => cnc.outline.filter(([, y]) => y < -1e-9 || y > cnc.drawn_h + 1e-9).length;
  assert.equal(sideTabs(topOf(small)), sideTabs(topOf(plain)));
});

test('F9, after the review . D25: the bowl that meets the top drawer\'s box or RAIL-TOP is said in #48, in the LISP\'s words, never clamped', () => {
  const bowl = (r) => r.warnings.filter((w) => w.code === 'VANITY_BOWL').map((w) => w.message);
  const T = vanitySpec(P);
  // The default: 150 deep under a 20 top, the oval over the rail and over the top box (68.5 clears).
  const def = kit('VANITY3');
  assert.deepEqual(bowl(def), [L.call('vanity-bowl-verdict', 'VU01', 900, 600, 500, G, GB, FT, 3, 1, [450], 20, T.basinH)]);
  assert.equal(def.derived.vanity.bowl, bowl(def)[0]);
  assert.match(bowl(def)[0], /the deepest bowl that clears the top drawer is 68\.5/);
  // The top's thickness is its slab's (the store hands `vanity_top_mm`): 40 clears 88.5.
  assert.deepEqual(bowl(kit('VANITY3', { vanity_top_mm: 40 })),
    [L.call('vanity-bowl-verdict', 'VU01', 900, 600, 500, G, GB, FT, 3, 1, [450], 40, T.basinH)]);
  // A shallower bowl that clears the box still stands over the rail: the rail's sentence alone.
  const P60 = { ...P, vanity: { ...P.vanity, basin: { ...P.vanity.basin, heightMm: 60 } } };
  const r60 = computeCabinet({ ...defaultParamsFor('VANITY3', P60), unit_num: 'VU01' }, P60);
  assert.deepEqual(bowl(r60), [L.call('vanity-bowl-verdict', 'VU01', 900, 600, 500, G, GB, FT, 3, 1, [450], 20, 60)]);
  assert.match(bowl(r60)[0], /meets RAIL-TOP: .* set the waste 218 from the carcass back\./);
  // Off the rail (a waste set 260 from the back), the box's sentence alone.
  const P260 = { ...P, vanity: { ...P.vanity, wasteFromBackMm: 260 } };
  const r260 = computeCabinet({ ...defaultParamsFor('VANITY3', P260), unit_num: 'VU01', depth: 560 }, P260);
  assert.deepEqual(bowl(r260), ['VU01: A bowl 150 deep meets the top drawer\'s box: the deepest bowl that clears it is 68.5; take a shallower or a vessel basin, or a shallower top drawer.']);
  // No basin, nothing; never a clamp: the drawer and the rail are cut as asked.
  assert.deepEqual(bowl(kit('VANITY3', { sinks: 0 })), []);
  assert.deepEqual(byId(def, 'RAIL-TOP').box, byId(kit('VANITY3', { sinks: 0 }), 'RAIL-TOP').box);
  // Check #48 says it, yellow, once, in the LISP's words.
  const unit = { id: 'u1', type: 'VANITY3', params: { ...defaultParamsFor('VANITY3', P), unit_num: 'VU01' } };
  const found = runChecks({ entries: [{ unit, result: def }], units: [unit], profile: P }).filter((f) => f.check === 48);
  assert.equal(found.length, 1);
  assert.equal(found[0].level, 'yellow');
  assert.equal(found[0].message, bowl(def)[0]);
});

test('F9, after the review . the store hands the slab\'s thickness (vanity_top_mm); the room\'s #48 follows a typed top', () => {
  const S = () => useProjectStore.getState();
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  confirmDrawerBox();
  const { id } = S().addUnit('VANITY3');
  const said = () => S().unitResult(id).warnings.filter((w) => w.code === 'VANITY_BOWL').map((w) => w.message)[0];
  assert.match(said(), /clears the top drawer is 68\.5/, 'born under its own 20 top');
  const slab = S().worktopsOf().find((w) => (w.unitIds || []).includes(id));
  assert.ok(slab, 'born under its own top');
  S().setWorktopThickness(slab.id, 40);
  assert.match(said(), /clears the top drawer is 88\.5/, 'a typed 40 top reaches the bowl');
  // With no record over it the store hands nothing: the kit's own 20.
  S().removeWorktop(slab.id);
  assert.ok(!S().worktopsOf().some((w) => (w.unitIds || []).includes(id)));
  assert.match(said(), /clears the top drawer is 68\.5/);
});

// ===========================================================================
// THE FOSSILS HOLD; THE NEW GOLDENS HOLD
// ===========================================================================

test('F9 . FROZEN 1: the six by their hashes (BUDR and BUDR4 the parents), and the chest by its golden', () => {
  const six = JSON.parse(read('verify/t70/goldens-base.json'));
  const head = dumpSix();
  for (const id of ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY']) {
    assert.equal(head[id]?.sha256, six[id]?.sha256, `${id} moved`);
  }
  const g = JSON.parse(read('fixtures/golden-wardrobe-chest.json'));
  assert.deepEqual(goldenOf(g.params, P), g.expected, 'golden-wardrobe-chest.json moved');
});

test('F9 . the new kits\' own goldens (verify/t82/goldens), NEW and held', () => {
  for (const name of ['vanity2', 'vanity3', 'vanity4', 'vanity3-sinks0', 'vanity3-sinks2', 'vanity3-columns2']) {
    const rel = `verify/t82/goldens/golden-${name}.json`;
    assert.ok(existsSync(`${ROOT}${rel}`), `${rel} is not written`);
    const g = JSON.parse(read(rel));
    assert.match(g.meta.source, /KIT_VANITY\.lsp/);
    assert.deepEqual(goldenOf(g.params, P), g.expected, `${rel} moved`);
  }
});
