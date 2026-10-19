/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── CHAT FIX 19.10.2026 · THE SITE-TRIM ALLOWANCE (KIT_SITE_TRIM.lsp) ──────
//
// The owner, 19.10.2026 (15:18): *"side panele powinny byc wieksze o 20 mm, to
// samo z plinth, panele 20mm gora + dol + bok (nie przod, 0 to zawsze powinno
// byc ok)"*; 15:19: *"analiza i koduj"*.
//
// LISP first (reference/lisp/KIT_SITE_TRIM.lsp, a NEW file), then the engine
// (src/engine/siteTrim.js, one pass after endPanelsFollowSides). These hold
// the engine to the LISP's NUMBERS block line by line, the routines to the
// LISP's own answers, the record (cut, nominal, label, edging, area), the room
// (the scene draws the nominal), the cut list and the DXF (the cut), the
// profile switch (0 cuts every board as before), the goldens and the gate.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import * as ST from '../src/engine/siteTrim.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { slopeNoteText } from '../src/engine/cnc/partLabel.js';
import { buildUnitDxfFiles } from '../src/engine/cnc/dxf.js';
import { offBoardFindings } from '../src/engine/cnc/offBoardGuard.js';
import { unitFindings } from '../src/engine/cnc/exportGate.js';
import { buildBom } from '../src/engine/bom.js';
import { panelSolids } from '../src/3d/panelSolid.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { rectCorners } from '../src/engine/room.js';
import { nominal, asNominal, trimOf, withoutSiteTrim } from './site-trim.js';
import { GATES, LIVENESS, REPINNED, LICENSED } from '../scripts/t78-classify.d/f38-owner-1910d.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();
const OWNER = 'side panele powinny byc wieksze o 20 mm, to samo z plinth';

const kit = (type, extra = {}) => ({ ...defaultParamsFor(type, P), unit_num: '01', ...extra });
const cut = (type, extra = {}, profile = P) => computeCabinet(kit(type, extra), profile);
const panelOf = (r, id) => r.panels.find((p) => p.id === id);
const EPL = { id: 'ep-l', side: 'L', height: 'floor', thickness: 25 };
const EPR = { id: 'ep-r', side: 'R', height: 'floor', thickness: 25 };
const r4 = (v) => Math.round(v * 10000) / 10000;
const ptsOf = (list) => list.map(([x, y]) => `(${r4(x)} ${r4(y)})`).join(' ');

// ═══ THE LISP FIRST ════════════════════════════════════════════════════════

test('KIT_SITE_TRIM.lsp: a new file, the owner\'s header and words, ASCII, its five decisions and routines; the fossil kits untouched', () => {
  const text = read('reference/lisp/KIT_SITE_TRIM.lsp');
  assert.ok(text.startsWith(';;; Copyright (c) 2026 Skylon Development Ltd. All rights reserved.'));
  assert.ok(text.includes(OWNER), 'his words');
  assert.ok(text.includes('(nie przod, 0 to zawsze powinno byc ok)'));
  for (const d of ['D1  ONE NUMBER PER PART', 'D2  THE FRONT EDGE OF AN END PANEL NEVER GROWS', 'D3  A PLINTH\'S MACHINE-CUT JOIN NEVER GROWS',
    'D4  THE NOMINAL IS STATED', 'D5  THE OUTLINE GROWS BY ITS EDGES, NOT BY A SCALE']) {
    assert.ok(text.includes(`;;; ${d}`), d);
  }
  for (const routine of ['site-trim-grow (pts w h t edges', 'site-trim-size (w h t edges)', 'site-trim-shift (t edges)',
    'site-trim-end-edges (hand)', 'site-trim-plinth-edges (leftOpen rightOpen', 'c:SITETRIM_FULL']) {
    assert.ok(text.includes(`(defun ${routine}`), routine);
  }
  assert.ok(/^[\x00-\x7F]*$/.test(text), 'ASCII');
  assert.doesNotMatch(text, /[\u2013\u2014]/, 'no em or en dash');
  // The fossil kits are not touched by this file (it is a MODIFIER): no fossil routine redefined.
  assert.doesNotMatch(text, /\(defun draw(BUL|BUR|BACK|TOP|BOTTOM)/);
  assert.ok(LICENSED['src/engine/siteTrim.js'].why.includes(OWNER), 'the engine file licensed with his words');
});

// ═══ THE ROUTINES, THE LISP'S OWN ANSWERS (section 3) ═════════════════════

test('the routines: grow by edges (a vertex on a growing edge moves out, the rest with the origin), size, shift, edges by part', () => {
  const rect = [[0, 0], [600, 0], [600, 100], [0, 100]];
  assert.deepEqual(ST.growOutline(rect, 600, 100, 20, ['L', 'R', 'T', 'B']), [[0, 0], [640, 0], [640, 140], [0, 140]]);
  assert.deepEqual(ST.growOutline(rect, 600, 100, 20, ['R', 'T', 'B']), [[0, 0], [620, 0], [620, 140], [0, 140]]);
  assert.deepEqual(ST.growOutline(rect, 600, 100, 20, ['L', 'T', 'B']), [[0, 0], [620, 0], [620, 140], [0, 140]]);
  assert.deepEqual(ST.growOutline(rect, 600, 100, 20, ['T', 'B']), [[0, 0], [600, 0], [600, 140], [0, 140]]);
  assert.deepEqual(ST.growOutline(rect, 600, 100, 0, ['L', 'R', 'T', 'B']), rect, 'trim 0: nothing moves');
  // The notch keeps its size from the FINAL edges: the END-L of I4 case A (nominal 596 x 870 less 210 x 400 at x1y0).
  const notched = [[0, 0], [386, 0], [386, 400], [596, 400], [596, 870], [0, 870]];
  assert.deepEqual(ST.growOutline(notched, 596, 870, 20, ['R', 'T', 'B']), [[0, 0], [386, 0], [386, 420], [616, 420], [616, 910], [0, 910]]);
  // The DW strip: its bottom is a machine cut, not the board's bottom edge; it moves with the origin.
  assert.deepEqual(ST.growOutline([[0, 80], [600, 80], [600, 100], [0, 100]], 600, 100, 20, ['L', 'R', 'T', 'B']),
    [[0, 100], [640, 100], [640, 140], [0, 140]]);
  assert.deepEqual(ST.grownSize(596, 870, 20, ['R', 'T', 'B']), { w: 616, h: 910, dx: 0, dy: 20 });
  assert.deepEqual(ST.grownSize(600, 100, 20, ['L', 'R', 'T', 'B']), { w: 640, h: 140, dx: 20, dy: 20 });
  assert.deepEqual(ST.trimDeltas(20, ['L', 'T']), { dl: 20, dr: 0, dt: 20, db: 0 });
  assert.deepEqual([ST.endPanelTrimEdges('L'), ST.endPanelTrimEdges('R')], [['R', 'T', 'B'], ['L', 'T', 'B']], 'END-L as BUL (the back is R), END-R as BUR');
  assert.deepEqual(ST.plinthTrimEdges({ leftOpen: true, rightOpen: true }), ['L', 'R', 'T', 'B']);
  assert.deepEqual(ST.plinthTrimEdges({ leftOpen: false, rightOpen: true }), ['R', 'T', 'B']);
  assert.deepEqual(ST.plinthTrimEdges({ leftOpen: false, rightOpen: false }), ['T', 'B']);
  assert.deepEqual(ST.growNotchRecord({ fc: 'x1y0', nw: 210, nh: 400 }, 20, ['R', 'T', 'B']), { fc: 'x1y0', nw: 230, nh: 420 });
  assert.deepEqual(ST.growNotchRecord({ fc: 'x0y1', nw: 150, nh: 180, also: { fc: 'x0y0', nw: 150, nh: 310 } }, 20, ['L', 'T', 'B']),
    { fc: 'x0y1', nw: 170, nh: 200, also: { fc: 'x0y0', nw: 170, nh: 330 } });
  assert.deepEqual(ST.growNotchRecord({ fc: 'x1y0', nw: 178, nh: 400 }, 20, ['L', 'T', 'B']), { fc: 'x1y0', nw: 178, nh: 420 }, 'a front corner on END-R: the front never grows');
  assert.equal(ST.growNotchRecord(null, 20, ['L']), null);
  assert.deepEqual([ST.siteTrimMm(P, 'END-PANEL'), ST.siteTrimMm(P, 'PLINTH'), ST.siteTrimMm(P, 'BUL'), ST.siteTrimMm(withoutSiteTrim(), 'PLINTH')], [20, 20, 0, 0]);
});

test('plinthOpenEnds: a run\'s ends, a corner butt, a mitre, the strips, an L\'s arm (D3)', () => {
  assert.deepEqual(ST.plinthOpenEnds({ id: 'PLINTH', meta: undefined }), { leftOpen: true, rightOpen: true });
  assert.deepEqual(ST.plinthOpenEnds({ meta: { run: true, corner: { side: 'left', mm: 50, butt: 'square' } } }), { leftOpen: false, rightOpen: true });
  assert.deepEqual(ST.plinthOpenEnds({ meta: { run: true, mitres: [{ side: 'right', mm: 68, deg: 45, external: true }] } }), { leftOpen: true, rightOpen: false });
  assert.deepEqual(ST.plinthOpenEnds({ meta: { run: true, unitIds: ['a', 'b'], strip: { index: 1, of: 2 } } }), { leftOpen: true, rightOpen: false });
  assert.deepEqual(ST.plinthOpenEnds({ meta: { run: true, unitIds: ['c'], strip: { index: 2, of: 2 } } }), { leftOpen: false, rightOpen: true });
  assert.deepEqual(ST.plinthOpenEnds({ meta: { run: true, unitIds: ['b'], strip: { index: 2, of: 3 } } }), { leftOpen: false, rightOpen: false });
  assert.deepEqual(ST.plinthOpenEnds({ meta: { run: true, unitIds: ['corner-butt', 'a'], strip: { index: 1, of: 2 } } }), { leftOpen: false, rightOpen: false }, 'a corner grown onto the run rides the first strip');
  assert.deepEqual(ST.plinthOpenEnds({ meta: { arm: 'A', lCorner: 'through' } }), { leftOpen: false, rightOpen: true, far: true });
  assert.deepEqual(ST.trimEdgeWords('PLINTH', ['L', 'R', 'T', 'B']), ['all edges']);
  assert.deepEqual(ST.trimEdgeWords('PLINTH', ['R', 'T', 'B']), ['R end', 'top', 'bottom']);
  assert.deepEqual(ST.trimEdgeWords('PLINTH', ['R', 'T', 'B'], 'L', { far: true }), ['far end', 'top', 'bottom']);
  assert.deepEqual(ST.trimEdgeWords('END-PANEL', ['R', 'T', 'B'], 'L'), ['back', 'top', 'bottom']);
});

// ═══ THE NUMBERS BLOCK (section 4), LINE BY LINE ═══════════════════════════

function block(file, from, to) {
  const text = read(file);
  const a = text.indexOf(from);
  const b = text.indexOf(to, a);
  assert.ok(a > 0 && b > a, `${file} has its block`);
  return text.slice(a, b).split('\n').map((l) => l.replace(/^;;;\s?/, '')).join(' ').replace(/\s+/g, ' ');
}

test('section 4, line by line, is the engine\'s cut: the wardrobe END, the notched END, the plinths, the L\'s two', () => {
  const prose = block('reference/lisp/KIT_SITE_TRIM.lsp', ';;; 4. NUMBERS', ';;; 5. THE COMMAND');
  const say = (s) => assert.ok(prose.includes(s), `section 4 states ${s}`);
  // END PANEL, KIT_WARDROBE_FULL W 600 H 2150 D 578, END-L to the floor: nominal 606 x 2250, CUT 626 x 2290.
  const w = cut('WARDROBE', { end_panels: [{ ...EPL }, { ...EPR }] });
  const el = panelOf(w, 'END-L');
  const er = panelOf(w, 'END-R');
  assert.deepEqual([nominal(el).w, nominal(el).h, el.w, el.h], [606, 2250, 626, 2290]);
  say(`nominal ${nominal(el).w} x ${nominal(el).h}`);
  say(`CUT ${el.w} x ${el.h}`);
  say(`the outline ${ptsOf(el.cnc.outline)}`);
  assert.deepEqual(el.meta.oversize.frame, ['R', 'T', 'B']);
  say('Edges R T B');
  assert.deepEqual([er.w, er.h, er.meta.oversize.frame], [626, 2290, ['L', 'T', 'B']]);
  say(`END-R the same board drawn from the back: edges L T B, CUT ${er.w} x ${er.h}`);
  // END PANEL with a corner notch (T79 F9): nominal (0 0) (386 0) (386 400) (596 400) (596 870) (0 870), CUT (0 0) (386 0) (386 420) (616 420) (616 910) (0 910).
  const n = cut('BUD', { shelves: 1, front_t: 25, notch: { corner: 'BL', w: 200, d: 200, h: 300 }, end_panels: [EPL] });
  const en = panelOf(n, 'END-L');
  say(`nominal ${ptsOf(asNominal(en).cnc.outline)}`);
  say(`trim 20: ${ptsOf(en.cnc.outline)}`);
  assert.deepEqual(en.cnc.notch, { fc: 'x1y0', nw: 230, nh: 420 });
  say('the notch is 230 x 420 from the NEW edges');
  say(`(${en.cnc.marks[0].pts.map(([x, y]) => `${r4(x)} ${r4(y)}`).join(' .. ')})`);
  // PLINTH, KIT_BUD_FULL W 600, leg 100: 600 x 100 -> 640 x 140.
  const b = cut('BUD', { plinth: true });
  const pl = panelOf(b, 'PLINTH');
  assert.deepEqual([nominal(pl).w, nominal(pl).h, pl.w, pl.h, pl.meta.oversize.frame], [600, 100, 640, 140, ['L', 'R', 'T', 'B']]);
  say(`CUT ${pl.w} x ${pl.h}`);
  // The DW panel's plinth: the strip (0 80) (600 80) (600 100) (0 100) -> (0 100) (640 100) (640 140) (0 140).
  const dw = cut('DW_PANEL', { plinth: true });
  const dpl = panelOf(dw, 'PLINTH');
  say(`nominal ${ptsOf(asNominal(dpl).cnc.outline)}`);
  say(ptsOf(dpl.cnc.outline));
  // A DW panel in a run of three: the mouth stays on the bottom edge.
  const run = cut('DW_PANEL', { plinth: true, run_plinth: { role: 'owner', length: 1800, offset: -600, spans: [{ id: 'a', width: 600 }, { id: 'b', width: 600 }, { id: 'c', width: 600 }], unitIds: ['a', 'b', 'c'] } });
  say(ptsOf(panelOf(run, 'PLINTH').cnc.outline));
  // A run plinth in two strips, 2800 over a 2440 board (1800 + 1000): 1820 x 140 (L T B) and 1020 x 140 (R T B).
  const strips = cut('BUD', { plinth: true, run_plinth: { role: 'owner', length: 2800, offset: 0, spans: [{ id: 'a', width: 600 }, { id: 'b', width: 600 }, { id: 'c', width: 600 }, { id: 'd', width: 1000 }], unitIds: ['a', 'b', 'c', 'd'] } });
  const s1 = panelOf(strips, 'PLINTH-1');
  const s2 = panelOf(strips, 'PLINTH-2');
  assert.deepEqual([s1.w, s1.h, s1.meta.oversize.frame, s2.w, s2.h, s2.meta.oversize.frame], [1820, 140, ['L', 'T', 'B'], 1020, 140, ['R', 'T', 'B']]);
  say(`strip 1 edges L T B, CUT ${s1.w} x ${s1.h}; strip 2 edges R T B, CUT ${s2.w} x ${s2.h}`);
  // A run grown 50 onto a corner butt at its left: edges R T B only.
  const butt = cut('BUD', { plinth: true, run_plinth: { role: 'owner', length: 1250, offset: -50, spans: [{ id: 'corner-butt', width: 50 }, { id: 'a', width: 600 }, { id: 'b', width: 600 }], unitIds: ['a', 'b'], corner: { side: 'left', mm: 50, butt: 'square', faceOf: 'x' } } });
  assert.deepEqual(panelOf(butt, 'PLINTH').meta.oversize.frame, ['R', 'T', 'B']);
  say('A run grown 50 onto a corner butt (T75 F6) at its left: edges R T B only');
  // THE L's TWO PLINTHS (golden-corner-l-base): A 410 x 100 and B 392 x 100 -> 430 x 140 and 412 x 140.
  const l = computeCabinet(JSON.parse(read('fixtures/golden-corner-l-base.json')).params, P);
  const a = panelOf(l, 'PLINTH-A');
  const bb = panelOf(l, 'PLINTH-B');
  assert.deepEqual([nominal(a).w, a.w, a.h, nominal(bb).w, bb.w, bb.h], [410, 430, 140, 392, 412, 140]);
  assert.deepEqual([a.meta.oversize.frame, a.meta.oversize.edges], [['R', 'T', 'B'], ['far end', 'top', 'bottom']]);
  say(`${a.w} x ${a.h} and ${bb.w} x ${bb.h}`);
  // The 3-D: the box of every one of them is the nominal.
  assert.deepEqual([el.box.d, el.box.h, pl.box.w, pl.box.h], [606, 2250, 600, 100]);
  say('the box of every one of them is the nominal (606 x 2250, 600 x 100)');
  // The label.
  assert.equal(slopeNoteText(el, { ascii: true }), 'OVERSIZE +20 BACK/TOP/BOTTOM - TRIM ON SITE (NOM 606 x 2250)');
  say('OVERSIZE +20 BACK/TOP/BOTTOM - TRIM ON SITE (NOM 606 x 2250)');
  assert.equal(slopeNoteText(pl, { ascii: true }), 'OVERSIZE +20 ALL EDGES - TRIM ON SITE (NOM 600 x 100)');
  assert.equal(slopeNoteText(s1, { ascii: true }), 'OVERSIZE +20 L END/TOP/BOTTOM - TRIM ON SITE (NOM 1800 x 100)');
});

// ═══ THE RECORD: CUT, NOMINAL, AREA, EDGING, THE SCENE ═════════════════════

test('the record: w / h the cut, the box and meta.oversize.nominal the nominal, the area and the banding the cut\'s, the filler untouched', () => {
  const r = cut('BUD', { shelves: 1, front_t: 25, notch: { corner: 'BL', w: 200, d: 200, h: 300 }, end_panels: [EPL], plinth: true });
  const ep = panelOf(r, 'END-L');
  assert.equal(ep.area_m2, 0.46396, 'the cut board: 616 x 910 less 230 x 420');
  assert.equal(ep.meta.oversize.nominal.area_m2, 0.43452, 'the nominal kept beside it');
  assert.equal(ep.edging.len_m, 3.052, 'banded all round, the cut\'s perimeter');
  assert.equal(ep.meta.oversize.nominal.edging.len_m, 2.932);
  assert.deepEqual(ep.meta.oversize.edges, ['back', 'top', 'bottom']);
  assert.deepEqual(asNominal(ep).cnc.marks, [{ layer: 'CORNER_4MM', from: [386, 360], to: [426, 400], pts: [[386, 360], [386, 400], [426, 400]] }]);
  assert.deepEqual(ep.cnc.marks, [{ layer: 'CORNER_4MM', from: [386, 380], to: [426, 420], pts: [[386, 380], [386, 420], [426, 420]] }], 'the mark moved with its corner');
  const pl = panelOf(r, 'PLINTH');
  assert.equal(pl.edging.len_m, 1.28, 'the two long edges, 640 each');
  assert.equal(pl.area_m2, 0.0896);
  // The side infill's own allowance is untouched: one edge, a number for its nominal, its note as it was.
  const inf = cut('BUD', { shelves: 1, side_infill_left_mm: 40 }).panels.find((p) => p.part === 'INFILL' && p.meta?.piece === 'face');
  assert.ok(inf, 'the side infill is there');
  assert.equal(inf.meta.oversize.edge, 'left');
  assert.equal(inf.meta.oversize.nominal, 40);
  assert.equal(inf.w, 60);
  assert.match(slopeNoteText(inf, { ascii: true }), /^OVERSIZE \+20 - TRIM ON SITE \(NOM 40\)/);
});

test('the scene draws the NOMINAL (D4): a notched END panel\'s solid is 596 deep, not 616; a plain END and a plinth are their boxes', () => {
  const r = cut('BUD', { shelves: 1, front_t: 25, notch: { corner: 'BL', w: 200, d: 200, h: 300 }, end_panels: [EPL, EPR], plinth: true });
  const { solid } = panelSolids(panelOf(r, 'END-L'), P.puzzle.layers, P, r.drills);
  assert.ok(solid, 'the notched END is a shape');
  solid.computeBoundingBox();
  assert.ok(Math.abs(solid.boundingBox.max.z - solid.boundingBox.min.z - 0.596) < 1e-6, 'its depth is the nominal 596');
  assert.ok(Math.abs(solid.boundingBox.max.y - solid.boundingBox.min.y - 0.87) < 1e-6, 'its height the nominal 870');
  assert.equal(panelSolids(panelOf(r, 'END-R'), P.puzzle.layers, P, r.drills).solid, null, 'a plain END is its box');
  assert.equal(panelSolids(panelOf(r, 'PLINTH'), P.puzzle.layers, P, r.drills).solid, null, 'a plinth is its box');
  assert.deepEqual(panelOf(r, 'END-R').box, { x: 600, y: -100, z: -10, w: 25, h: 870, d: 596 });
  const scene = ST.sceneBoard(panelOf(r, 'END-L'));
  assert.deepEqual([scene.w, scene.h, scene.cnc.notch], [596, 870, { fc: 'x1y0', nw: 210, nh: 400 }]);
  assert.equal(ST.sceneBoard(panelOf(r, 'BUL')), panelOf(r, 'BUL'), 'any other panel comes back as itself');
});

// ═══ THE CUT LIST, THE DXF, THE GATE ════════════════════════════════════════

test('the cut list and the DXF carry the CUT; nothing is drawn off the board; the export gate holds; the BOM prices the cut', () => {
  const r = cut('BUD', { shelves: 1, front_t: 25, notch: { corner: 'BL', w: 200, d: 200, h: 300 }, end_panels: [EPL], plinth: true });
  assert.ok(r.csvLines.includes('01,END-L,616,910,<>^v,3.05,0.464'));
  assert.ok(r.csvLines.includes('01,PLINTH,640,140,^v,1.28,0.090'));
  const files = buildUnitDxfFiles(r, P);
  const ep = files.find((f) => f.panelId === 'END-L');
  assert.deepEqual(ep.entities.find((e) => e.layer === 'OUTLINE').pts, [[0, 0], [386, 0], [386, 420], [616, 420], [616, 910], [0, 910]]);
  assert.ok(ep.entities.some((e) => e.type === 'text' && /OVERSIZE \+20/.test(e.str)), 'the note is in the file');
  const pl = files.find((f) => f.panelId === 'PLINTH');
  assert.deepEqual(pl.entities.find((e) => e.layer === 'OUTLINE').pts, [[0, 0], [640, 0], [640, 140], [0, 140]]);
  assert.deepEqual(offBoardFindings(files, r), []);
  assert.deepEqual(unitFindings(r, { profile: P }), []);
  const bom = buildBom([{ unit: { id: 'u1', type: 'BUD', params: r.params }, result: r }]);
  const row = bom.units[0].rows.find((x) => x.part === 'END-PANEL');
  assert.deepEqual([row.w, row.h], [616, 910], 'the BOM row is the cut');
  // The dishwasher plinth's note stands on its 40 mm strip, not in the cut-out.
  const dw = cut('DW_PANEL', { plinth: true });
  const dwFiles = buildUnitDxfFiles(dw, P);
  assert.deepEqual(offBoardFindings(dwFiles, dw), []);
  const texts = dwFiles.find((f) => f.panelId === 'PLINTH').entities.filter((e) => e.type === 'text');
  assert.ok(texts.every((e) => e.y >= 100 && e.y <= 140), `every text on the strip: ${texts.map((e) => e.y).join(' ')}`);
});

// ═══ THE SWITCH, THE STORE, THE GOLDENS AND THE GATE ═══════════════════════

test('siteTrim 0 cuts every board as before tonight: no record, the nominal sizes, the six and every golden untouched by the switch', () => {
  const off = withoutSiteTrim();
  const r = cut('BUD', { shelves: 1, front_t: 25, notch: { corner: 'BL', w: 200, d: 200, h: 300 }, end_panels: [EPL, EPR], plinth: true }, off);
  for (const id of ['END-L', 'END-R', 'PLINTH']) assert.equal(panelOf(r, id).meta?.oversize, undefined, `${id}: nothing grew`);
  assert.deepEqual([panelOf(r, 'END-L').w, panelOf(r, 'END-L').h, panelOf(r, 'PLINTH').w, panelOf(r, 'PLINTH').h], [596, 870, 600, 100]);
  assert.deepEqual(panelOf(r, 'END-L').cnc.outline, [[0, 0], [386, 0], [386, 400], [596, 400], [596, 870], [0, 870]]);
  assert.equal(ST.applySiteTrim({ panels: r.panels, profile: off }), null);
  // The numbers live in the profile (D1), PROPOSED.
  assert.equal(P.autoParts.endPanel.siteTrim, 20);
  assert.equal(P.autoParts.plinth.siteTrim, 20);
  assert.equal(trimOf(panelOf(r, 'END-L')), 20);
});

test('the store: a unit placed in a room with an end panel and a plinth cuts them with the allowance; the goldens, the gate, the liveness', () => {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const a = S().addUnit('BUD', { wall: 0, x: 900 });
  assert.equal(a.error, null);
  S().addEndPanel(a.id, { side: 'R' });
  S().addPlinth(a.id);
  const r = S().unitResult(a.id);
  const ep = panelOf(r, 'END-R');
  const pl = panelOf(r, 'PLINTH');
  assert.deepEqual([nominal(ep).w, ep.w, ep.h - nominal(ep).h, nominal(pl).w, pl.w, pl.h - nominal(pl).h], [596, 616, 40, 600, 640, 40]);
  // The gate opens on an END panel or a plinth only.
  assert.equal(GATES.siteTrim.opens(kit('BUD')), false);
  assert.equal(GATES.siteTrim.opens(kit('BUD', { plinth: true })), true);
  assert.equal(GATES.siteTrim.opens(kit('BUD', { end_panels: [EPL] })), true);
  for (const id of ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY']) assert.equal(GATES.siteTrim.opens(defaultParamsFor(id, P)), false, id);
  assert.equal(LIVENESS.siteTrim().live, true, LIVENESS.siteTrim().said);
  for (const file of ['golden-notch-end-panel.json', 'golden-recess-end-panel.json', 'golden-corner-l-base.json']) {
    assert.ok(REPINNED.some((x) => x.file === `fixtures/${file}` && x.why.includes(OWNER)), `${file} re-pinned with his words`);
    const g = JSON.parse(read(`fixtures/${file}`));
    assert.ok(g.meta.repinned.includes(OWNER), `${file}: the fixture says why`);
  }
});
