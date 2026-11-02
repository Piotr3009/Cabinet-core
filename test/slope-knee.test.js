/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// THE KNEE (01.11.2026, the owner, 23:04 to 23:14, screenshot in hand): a wardrobe under a sloped ceiling whose
// slope crosses the cabinet's own height. The roof is a sloped board and a flat one meeting at a knee; they met
// where their TOP faces meet, and the sloped board's underside stood 5.5 mm under the flat one's: a step INSIDE.
//
//   *"wyrownanie edga musi byc od srodka, nie od zewnatrz, wiec automatycznie skosna plyta bedzie troszeczke
//   dluzsza ... i dostosuj tez plecy"*; *"wariant B, koduj"*; *"plecy musza sie zgadzac, inaczej beda sie ludzie
//   martwili, ze sa za krotkie i co nie dziala"*.
//
// THE LAW (SKYLON_COMMON.lsp, beside "ONE BOARD PER SEGMENT"): the boundary of two roof boards is where their
// UNDERSIDES meet; each board keeps its own top line, its beta and its vertical ends; the back follows the boards.
// Every number below is re-derived here from the ceiling with plain trigonometry, then compared with the engine.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { roofBoards, trimOutlineOnSlope } from '../src/engine/puzzle.js';

const G = P.board.thickness;
const INFILL = 40;
const job = (over) => computeCabinet({ ...defaultParamsFor('WARDROBE', P), unit_num: '01', ...over }, P);
const byId = (r, id) => r.panels.find((p) => p.id === id);
const tops = (r) => r.panels.filter((p) => p.role === 'top');
const near = (a, b, tol = 1e-3) => Math.abs(a - b) < tol;

// ═══ WIKTOR'S JOB, THE OWNER'S SCREENSHOT ════════════════════════════════════
//
// WARDROBE 1000 x 2150, ceiling (0, 1700) to (1000, 2539), allowance 40, G = 18.
const W = 1000;
const H = 2150;
const CEIL = { pts: [{ x: 0, y: 1700 }, { x: 1000, y: 2539 }], infill: INFILL };
const beta = Math.atan(839 / 1000);
const m = Math.tan(beta);
const reserve = INFILL / Math.cos(beta);
const foot = G / Math.cos(beta);
/** The carcass cut line: the ceiling less the strip's reserve. The sloped board's TOP face runs along it. */
const cutAt = (x) => 1700 + m * x - reserve;
const kneeX = (H - (1700 - reserve)) / m;      // where the cut line reaches H: 598.5861
const e = G * Math.tan(beta / 2);               // the run-on: 6.5508

test('Wiktor\'s job: TOP-1 runs on to where the undersides meet, TOP-2 is shorter by the same', () => {
  const r = job({ width: W, height: H, slope_cut: CEIL });
  const [t1, t2] = tops(r);
  assert.deepEqual(tops(r).map((p) => p.id), ['TOP-1', 'TOP-2']);
  assert.ok(near(kneeX, 598.5861), `the knee at ${kneeX}`);
  // The boundary: the knee + G * tan(beta / 2).
  assert.ok(near(t1.meta.slopeCut.to, kneeX + e), `TOP-1 ends at ${t1.meta.slopeCut.to}`);
  assert.equal(t1.meta.slopeCut.to, t2.meta.slopeCut.from, 'one boundary, shared to the byte');
  // TOP-1: span 605.14, L = span / cos(beta) 789.91, blank = L + G * tan(beta) 805.01; its angle unchanged.
  const span1 = kneeX + e;
  assert.ok(near(t1.meta.slopeCut.span, span1));
  assert.ok(near(t1.meta.slopeCut.faceLen, span1 / Math.cos(beta)));
  assert.ok(near(t1.w, span1 / Math.cos(beta) + G * m));
  assert.equal(t1.meta.slopeCut.faceLen, 789.9114);
  assert.equal(t1.w, 805.0134, 'the blank on the cut list');
  assert.equal(t1.meta.slopeCut.deg, 39.9966, 'the cut angle unchanged');
  // Before tonight: span 598.5861, blank 796.4623. The blank grew by e / cos(beta) exactly.
  assert.ok(near(t1.w - 796.4623, e / Math.cos(beta)), `grew by ${t1.w - 796.4623}`);
  // TOP-2: the flat one, 401.4139 before, shorter by e.
  assert.equal(t2.w, 394.8631);
  assert.ok(near(t2.w, 401.4139 - e));
  assert.equal(t2.meta.slopeCut.deg, 0);
});

test('Wiktor\'s job: NO STEP INSIDE, the two undersides meet at the boundary', () => {
  const r = job({ width: W, height: H, slope_cut: CEIL });
  const [t1, t2] = tops(r);
  const xb = t1.meta.slopeCut.to;
  const slopedUnder = cutAt(xb) - foot;          // TOP-1's underside at its own end
  const flatUnder = H - G;                        // TOP-2's underside
  assert.ok(Math.abs(slopedUnder - flatUnder) < 0.01, `${slopedUnder} vs ${flatUnder}`);
  assert.equal(t2.meta.slopeCut.level, 2132);
  // …and the same from the boards' own elevation (the shape the drawings and the 3-D trace).
  const under1 = t1.box.y + t1.meta.elevation[1][1];
  const under2 = t2.box.y + t2.meta.elevation[0][1];
  assert.ok(Math.abs(under1 - under2) < 0.01, `elevation undersides ${under1} vs ${under2}`);
  // Outside, the sloped board's corner stands G * tan(beta / 2) * tan(beta) = 5.50 above the flat top, ON the cut line.
  const corner = t1.box.y + t1.meta.elevation[2][1];
  assert.ok(near(corner, H + e * m), `corner at ${corner}`);
  assert.ok(near(corner, cutAt(xb)), 'on the cut line');
  assert.ok(near(corner - H, 5.4962));
});

test('Wiktor\'s job: BUL, BUR and the doors do not move', () => {
  const r = job({ width: W, height: H, slope_cut: CEIL });
  const bul = byId(r, 'BUL');
  assert.equal(bul.h, 1639.3921);
  assert.equal(bul.meta.slopeCut.low, 1624.2901);
  assert.ok(near(bul.h, cutAt(G) - foot), 'BUL stops under TOP-1, as before');
  assert.equal(byId(r, 'BUR').h, 2132);
  // The doors follow the cut line, which did not change.
  const doors = r.panels.filter((p) => /^0\d-F/.test(p.id)).map((p) => [p.id, p.box.x, p.box.w]);
  assert.deepEqual(doors, [['01-FL', 1.5, 497], ['01-FR', 501.5, 497]]);
});

test('Wiktor\'s job: THE BACK FOLLOWS THE BOARDS, the step and all', () => {
  const r = job({ width: W, height: H, slope_cut: CEIL });
  const [t1, t2] = tops(r);
  const back = byId(r, 'BACK');
  const xb = t1.meta.slopeCut.to;
  // Before: [[0,0],[1000,0],[1000,2150],[598.5861,2150],[0,1647.7863]] (the knee of the tops).
  assert.deepEqual(back.cnc.outline,
    [[0, 0], [1000, 0], [1000, 2150], [605.1369, 2150], [605.1369, 2155.4962], [0, 1647.7863]]);
  assert.ok(near(back.cnc.outline[5][1], cutAt(0)), 'the left end on the cut line');
  // The two step corners ARE the two boards' end corners: TOP-1's top at its right end, TOP-2's top at its left end.
  const t1TopRight = [t1.box.x + t1.meta.elevation[2][0], t1.box.y + t1.meta.elevation[2][1]];
  const t2TopLeft = [t2.box.x + t2.meta.elevation[3][0], t2.box.y + t2.meta.elevation[3][1]];
  assert.ok(near(t1TopRight[0], xb) && near(t1TopRight[1], 2155.4962), `TOP-1 corner ${t1TopRight}`);
  assert.ok(near(t2TopLeft[0], xb) && near(t2TopLeft[1], H), `TOP-2 corner ${t2TopLeft}`);
  // The blank is as tall as the corner; the record says where the back steps.
  assert.equal(back.h, 2155.4962);
  assert.equal(back.cnc.drawn_h, 2155.4962);
  assert.deepEqual(back.meta.slopeCut.steps, [{ x: 598.5861, y: 2150, at: 605.1369, left: 2155.4962, right: 2150 }]);
  // …and the scene and the drawings rebuild the same outline from what the engine publishes.
  const { drawn_w: w, drawn_h: h } = back.cnc;
  const rebuilt = trimOutlineOnSlope([[0, 0], [w, 0], [w, h], [0, h]], { w, h, ...back.cnc.slopeCut });
  assert.deepEqual(rebuilt, back.cnc.outline);
  // No hole in air: every drill and pocket of the back under its own top.
  const topAt = (x) => (x <= xb ? cutAt(x) : H);
  for (const o of back.cnc.holes) assert.ok(o.y <= topAt(o.x) + 1e-6, `hole at ${o.x},${o.y}`);
});

// ═══ NO KNEE: IDENTICAL TO BEFORE TONIGHT ════════════════════════════════════
//
// The numbers below are the engine's own before the knee law (main at 70e98f5a), pinned.

test('the whole top sloped (one board): every number as before', () => {
  const r = job({ width: W, height: H, slope_cut: { pts: [{ x: 0, y: 1700 }, { x: 1000, y: 2100 }], infill: INFILL } });
  assert.deepEqual(tops(r).map((p) => [p.id, p.w]), [['TOP', 1084.233]]);
  assert.equal(byId(r, 'BUL').h, 1644.7321);
  assert.equal(byId(r, 'BUR').h, 2037.5321);
  const back = byId(r, 'BACK');
  assert.equal(back.h, 2056.9187);
  assert.deepEqual(back.cnc.outline, [[0, 0], [1000, 0], [1000, 2056.9187], [0, 1656.9187]]);
  assert.deepEqual(back.cnc.slopeCut, {
    pts: [{ x: 0, y: 1656.9187 }, { x: 1000, y: 2056.9187 }], hL: 1656.9187, hR: 2056.9187,
  });
  assert.equal(back.meta.slopeCut.steps, undefined, 'no knee, no step');
  // roofBoards on one segment carries no knee field at all.
  const [only] = roofBoards({ pts: [{ x: 0, y: 1656.9187 }, { x: 1000, y: 2056.9187 }] }, { h: Number.MAX_SAFE_INTEGER, G });
  assert.equal(only.knee0, undefined);
  assert.equal(only.knee1, undefined);
});

test('a peak merged by T54 (one board): as before', () => {
  const r = job({ width: W, height: H, slope_cut: { pts: [{ x: 0, y: 1700 }, { x: 1000, y: 2200 }], infill: INFILL } });
  assert.deepEqual(tops(r).map((p) => [p.id, p.w]), [['TOP', 1127.034]]);
  assert.equal(byId(r, 'BACK').h, 2150);
  assert.equal(byId(r, 'BACK').meta.slopeCut.steps, undefined);
});

test('no slope: the plain wardrobe, as before', () => {
  const r = job({ width: W, height: H });
  assert.deepEqual(tops(r).map((p) => [p.id, p.w]), [['TOP', 964]]);
  const back = byId(r, 'BACK');
  assert.equal(back.h, 2150);
  assert.equal(back.cnc.slopeCut, undefined);
  assert.equal(back.meta, undefined);
});

// ═══ THE CONCAVE KNEE, THE VALLEY, THE EQUAL PEAK ════════════════════════════

test('CONCAVE, flat then rising: the FLAT board runs on, the undersides meet, the back steps down to it', () => {
  // Ceiling flat at 1800 to x 400, then rising 300 over 500 (beta 30.9638) to (900, 2100). All under H.
  const r = job({ width: 900, slope_cut: { pts: [{ x: 0, y: 1800 }, { x: 400, y: 1800 }, { x: 900, y: 2100 }], infill: INFILL } });
  const b = Math.atan(300 / 500);
  const rise = (x) => 1800 + Math.tan(b) * (x - 400) - INFILL / Math.cos(b);  // the lowered rise
  const knee = 400 + (1800 - INFILL - (1800 - INFILL / Math.cos(b))) / Math.tan(b);  // where it meets the flat 1760
  const [flat, sloped] = tops(r);
  assert.equal(flat.meta.slopeCut.deg, 0);
  assert.ok(sloped.meta.slopeCut.deg > 0);
  // The boundary: the knee + G * tan(beta / 2), to the RIGHT of the knee: the flat board is the longer.
  const xb = flat.meta.slopeCut.to;
  assert.ok(near(xb, knee + G * Math.tan(b / 2)), `${xb} vs ${knee + G * Math.tan(b / 2)}`);
  assert.ok(xb > knee, 'the flatter board runs on');
  // No step inside.
  const under = rise(xb) - G / Math.cos(b);
  assert.ok(Math.abs(under - (1760 - G)) < 0.01, `${under} vs ${1760 - G}`);
  assert.equal(flat.meta.slopeCut.level, sloped.meta.slopeCut.level);
  // The back: along the flat top to the boundary, then up to the sloped board's end (a notch outside, under the ceiling).
  const back = byId(r, 'BACK');
  const at = back.cnc.outline.filter(([x]) => near(x, xb));
  assert.equal(at.length, 2, `two corners at the boundary: ${JSON.stringify(back.cnc.outline)}`);
  assert.ok(at.some(([, y]) => near(y, 1760)));
  assert.ok(at.some(([, y]) => near(y, rise(xb))));
  assert.ok(rise(xb) > 1760, 'the step is UP from the flat board to the sloped one');
});

test('a VALLEY of two slopes: the undersides meet', () => {
  const r = job({ width: 1000, slope_cut: { pts: [{ x: 0, y: 2100 }, { x: 500, y: 1800 }, { x: 1000, y: 2000 }], infill: INFILL } });
  const [a, b] = tops(r);
  assert.ok(a.meta.slopeCut.deg > 0 && b.meta.slopeCut.deg > 0);
  assert.equal(a.meta.slopeCut.to, b.meta.slopeCut.from);
  // The boards' undersides at the boundary, read off their own elevation, equal.
  const ua = a.box.y + a.meta.elevation[1][1];
  const ub = b.box.y + b.meta.elevation[0][1];
  assert.ok(Math.abs(ua - ub) < 0.01, `${ua} vs ${ub}`);
});

test('two EQUAL slopes meet at the knee itself, as before: no run-on, no step', () => {
  const r = job({ width: 1000, slope_cut: { pts: [{ x: 0, y: 1500 }, { x: 500, y: 2000 }, { x: 1000, y: 1500 }], infill: INFILL } });
  const [a, b] = tops(r);
  assert.equal(a.meta.slopeCut.to, 500);
  assert.equal(b.meta.slopeCut.from, 500);
  assert.deepEqual([a.w, b.w], [725.1068, 725.1068], 'the boards as before');
  const back = byId(r, 'BACK');
  assert.equal(back.meta.slopeCut.steps, undefined);
  assert.deepEqual(back.cnc.outline, [[0, 0], [1000, 0], [1000, 1443.4315], [500, 1943.4315], [0, 1443.4315]]);
  // The back's blank is as tall as its outline (the ridge), not as its higher end: it was 1443.4315 and
  // short of its own outline by 500 mm; the owner's *"za krotkie"* by name.
  assert.equal(back.h, 1943.4315);
  assert.equal(back.cnc.drawn_h, 1943.4315);
});

// ═══ THE LAW IS WRITTEN WHERE THE KITS READ IT ═══════════════════════════════

test('SKYLON_COMMON.lsp states the knee law, with the owner\'s words, before any JS', () => {
  const lsp = readFileSync(new URL('../reference/lisp/SKYLON_COMMON.lsp', import.meta.url), 'utf8');
  assert.match(lsp, /ONE BOARD PER SEGMENT\. A board does not bend at a knee\./);
  assert.match(lsp, /AT A KNEE THE TWO BOARDS MEET ON THEIR UNDERSIDES \(01\.11\.2026/);
  assert.match(lsp, /wyrownanie edga musi byc od srodka, nie od zewnatrz/);
  assert.match(lsp, /"wariant B, koduj"/);
  assert.match(lsp, /plecy musza sie zgadzac, inaczej beda sie ludzie martwili/);
  assert.match(lsp, /\(defun SKY:roofKneeX \(a b G lo hi/);
  assert.match(lsp, /\(defun SKY:roofBoards \(szer wys pts G/);
  assert.match(lsp, /\(SKY:roofKneeX a b G \(car bnd\) \(nth 2 b\)\)/, 'SKY:roofBoards takes the boundary from it');
  assert.match(lsp, /\(defun SKY:roofBackPts \(x0 y0 szer wys pts G/);
  assert.match(lsp, /\(defun SKY:drawRoofBack \(x0 y0 szer wys pts G/);
  // No em or en dash in the lines the law added (the team's rule).
  const law = lsp.slice(lsp.indexOf('AT A KNEE THE TWO BOARDS MEET'), lsp.indexOf('A three-axis machine cannot cut'));
  assert.equal(/[\u2013\u2014]/.test(law), false);
});
