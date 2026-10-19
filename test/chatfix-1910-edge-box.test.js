/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── CHAT FIX 19.10.2026 · THE EDGE NOTCH'S CLOSING BOARDS (KIT_NOTCH.lsp D22) ─
//
// The owner, 19.10.2026 (15:16): *"2 cut dziala ale nie rozumiem dlaczego nie
// ma paneli plyt, w sensie jak tniemy pionowe to wszystko jest a jak poziome to
// nie ma, dlaczego?"*; asked "identycznie jak pionowe?" (the morning): *"tak,
// bez mockupu, identycznie jak pionowe"*.
//
// D22 (18.10) closed the edge notch with nothing: open to the wall or the
// floor. AMENDED tonight, LISP first: the corner notch's own box law (section
// 2, D1, D2, D4, D21) run the whole width: the EDGE-STEP at a back edge, the
// EDGE-LID over a bottom edge, the EDGE-FLOOR under a top edge, no RETURN, no
// screw; the END panel covers the STEP's end (D23). test/turn79-f05 holds the
// NUMBERS; these hold the law board by board, the front edges, the 3-D, the
// cut list, the gate, the coexistence with the corner notch, and the licence.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import * as N from '../src/engine/notch.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { buildUnitDxfFiles } from '../src/engine/cnc/dxf.js';
import { offBoardFindings } from '../src/engine/cnc/offBoardGuard.js';
import { resultFindings } from '../src/engine/cnc/edgeGuard.js';
import { unitFindings } from '../src/engine/cnc/exportGate.js';
import { panelSolids } from '../src/3d/panelSolid.js';
import { panelPlacement } from '../src/engine/joinery.js';
import { buildBom } from '../src/engine/bom.js';
import { asNominal } from './site-trim.js';
import { GATES, LIVENESS, REPINNED, LISP, LICENSED } from '../scripts/t78-classify.d/f38-owner-1910d.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const OWNER = 'jak tniemy pionowe to wszystko jest a jak poziome to nie ma';

const kit = (extra = {}) => ({ ...defaultParamsFor('BUD', P), unit_num: '01', shelves: 1, front_t: 25, hinge: 'L', ...extra });
const cut = (extra = {}) => computeCabinet(kit(extra), P);
const panelOf = (r, id) => r.panels.find((p) => p.id === id);
const EPL = { id: 'ep-l', side: 'L', height: 'floor', thickness: 25 };
const EPR = { id: 'ep-r', side: 'R', height: 'floor', thickness: 25 };
const boxes = (r) => r.panels.filter((p) => p.role === 'notch_box').map((p) => p.id);

test('the LISP first: D22 amended with his words, the four routines, edge-notch-end-cut, I3 and I4; licensed', () => {
  const text = read('reference/lisp/KIT_NOTCH.lsp');
  assert.ok(text.replace(/\n;;;\s+/g, ' ').includes(OWNER), 'his words, wrapped over the lines');
  assert.ok(text.includes('AMENDED 19.10.2026 (chat fix), the owner: *"2 cut dziala'));
  assert.ok(text.includes(';;;       STEP    a BACK edge only (D4: a front edge is the fronts\' opening):'));
  assert.ok(text.includes(';;;       NO RETURN, NO SCREW (D10): plain rectangles, the joiner\'s fixing.'));
  for (const routine of ['edge-notch-box-places (cw cd ch g ed eh edge', 'edge-notch-step (cw eh edge)', 'edge-notch-lid (cw g ed edge)', 'edge-notch-floor (cw g ed edge)']) {
    assert.ok(text.includes(`(defun ${routine}`), routine);
  }
  assert.ok(text.includes('(if (edge-notch-back-p edge) (+ sb ed) (+ ed sf))'), 'the END on the STEP\'s back face');
  assert.ok(text.includes(';;;   EDGE-LID   564 x 20    plan x 18..582, y 520..540, z 120..138'));
  assert.ok(text.includes(';;;   EDGE-FLOOR 564 x 50    plan x 18..582, y 490..540, z 652..670'));
  assert.ok(text.includes('END-L      (0 0) (566 0) (566 220) (596 220) (596 870) (0 870)'), 'I4 case F, the END on the STEP');
  assert.ok(/^[\x00-\x7F]*$/.test(text), 'ASCII');
  assert.ok(LISP['reference/lisp/KIT_NOTCH.lsp'].includes(OWNER));
  assert.ok(LICENSED['src/engine/notch.js'].why.includes(OWNER));
});

test('board by board, by the corner notch\'s law run the whole width: a back edge gets the STEP and the LID / FLOOR, a front edge the LID / FLOOR alone (D4)', () => {
  const bb = cut({ edgeNotch: { edge: 'BB', d: 20, h: 120 } });
  assert.deepEqual(boxes(bb), ['EDGE-STEP', 'EDGE-LID']);
  const step = panelOf(bb, 'EDGE-STEP');
  const lid = panelOf(bb, 'EDGE-LID');
  // The STEP: cw x eh, in the g behind both sides' cut ends; its back face at z 20 from the carcass back, ed behind it for the obstacle (D2).
  assert.deepEqual([step.w, step.h, step.thickness, step.box], [600, 120, 18, { x: 0, y: 0, z: 20, w: 600, h: 120, d: 18 }]);
  for (const id of ['BUL', 'BUR']) {
    const side = panelOf(bb, id);
    assert.deepEqual(side.cnc.notch, { fc: id === 'BUL' ? 'x1y0' : 'x0y0', nw: 20, nh: 120 });
    assert.equal(side.box.z + side.cnc.notch.nw, step.box.z + step.box.d, `${id} runs to the STEP's front face`);
  }
  // The LID: (cw - 2 g) x ed, on the STEP between the sides, from the STEP's front face to the BACK's.
  assert.deepEqual([lid.w, lid.h, lid.box], [564, 20, { x: 18, y: 120, z: 18, w: 564, h: 18, d: 20 }]);
  assert.equal(lid.box.y, step.box.y + step.box.h, 'it lies ON the STEP');
  assert.equal(lid.box.z, panelOf(bb, 'BACK').box.z + panelOf(bb, 'BACK').box.d, 'from the BACK\'s front face');
  assert.equal(lid.box.z + lid.box.d, step.box.z + step.box.d, 'to the STEP\'s front face');
  // Plain rectangles, no joint, no hole, no screw; the joiner's fixing (D10); none of the box boards banded at a back edge.
  for (const p of [step, lid]) {
    assert.deepEqual([p.cnc.outline.length, p.cnc.pockets.length, p.cnc.holes.length, p.edging.code, p.edging.len_m], [4, 0, 0, '', 0]);
    assert.deepEqual([p.meta.readiness, p.meta.fixing, p.meta.edgeNotch.box], ['geometry', 'manual', p.id]);
    assert.equal(bb.drills.filter((d) => d.panel === p.id).length, 0);
  }
  // TB: the STEP hangs from the top, the FLOOR under it (D21).
  const tb = cut({ edgeNotch: { edge: 'TB', d: 50, h: 100 } });
  assert.deepEqual(boxes(tb), ['EDGE-STEP', 'EDGE-FLOOR']);
  assert.deepEqual(panelOf(tb, 'EDGE-STEP').box, { x: 0, y: 670, z: 50, w: 600, h: 100, d: 18 });
  assert.deepEqual(panelOf(tb, 'EDGE-FLOOR').box, { x: 18, y: 652, z: 18, w: 564, h: 18, d: 50 });
  // BF: a front edge: no STEP (the fronts' opening, D4); the LID at the front, its front edge banded.
  const bf = cut({ edgeNotch: { edge: 'BF', d: 20, h: 120 } });
  assert.deepEqual(boxes(bf), ['EDGE-LID']);
  const flid = panelOf(bf, 'EDGE-LID');
  assert.deepEqual([flid.w, flid.h, flid.box, flid.edging.code, flid.edging.len_m], [564, 20, { x: 18, y: 120, z: 538, w: 564, h: 18, d: 20 }, P.csv.codes.right, 0.564]);
  // The box law's own answers.
  assert.deepEqual(N.edgeNotchBoxPlaces(600, 558, 770, 18, 20, 120, 'BF'), { LID: [18, 0, 120, 582, 20, 138] });
  assert.deepEqual(N.edgeNotchBoxPlaces(600, 558, 770, 18, 50, 100, 'TF'), { FLOOR: [18, 0, 652, 582, 50, 670] });
  assert.equal(Object.keys(N.edgeNotchBoxPlaces(600, 558, 770, 18, 20, 120, 'BB')).includes('RETURN'), false, 'no RETURN: no side face left to close');
  assert.deepEqual(tb.derived.edgeNotch.cut, ['BUL', 'BUR', 'TOP', 'BACK', 'EDGE-STEP', 'EDGE-FLOOR']);
});

test('the END panel covers the STEP\'s end (D23): its cut face on the STEP\'s back face, sb + ed, as at a boxed back corner; a front edge flush with the side', () => {
  const r = cut({ edgeNotch: { edge: 'BB', d: 20, h: 120 }, end_panels: [EPL, EPR] });
  const step = panelOf(r, 'EDGE-STEP');
  for (const [id, hand] of [['END-L', 'L'], ['END-R', 'R']]) {
    const ep = asNominal(panelOf(r, id));
    assert.deepEqual(ep.cnc.notch, { fc: hand === 'L' ? 'x1y0' : 'x0y0', nw: 30, nh: 220 }, `${id}: sb 10 + ed 20`);
    // In the carcass: the END's back edge is at z -10; its cut face 30 in front of it is z 20, the STEP's back face.
    assert.equal(ep.box.z + ep.cnc.notch.nw, step.box.z, `${id} covers the STEP's end`);
    assert.equal(ep.box.z + ep.cnc.notch.nw, 20);
  }
  assert.deepEqual(asNominal(panelOf(r, 'END-L')).cnc.outline, [[0, 0], [566, 0], [566, 220], [596, 220], [596, 870], [0, 870]], 'I4 case F');
  assert.deepEqual(N.edgeNotchEndCut(770, 18, 20, 120, 'BF', 'L', 10, 28, 870, 100), ['x0y0', 48, 220], 'a front edge: flush with the side\'s cut face, ed + sf');
  // The corner notch's boxed back corner says the same thing (sb + nd): one law.
  assert.deepEqual(N.notchEndCut(770, 18, 200, 200, 300, 'BL', 'L', 10, 28, 870, 100), ['x1y0', 210, 400]);
});

test('the 3-D: the box boards are boxes in the room where the LISP puts them; the sides keep their frames', () => {
  const r = cut({ edgeNotch: { edge: 'BB', d: 20, h: 120 } });
  for (const id of ['EDGE-STEP', 'EDGE-LID']) {
    const p = panelOf(r, id);
    assert.equal(panelSolids(p, P.puzzle.layers, P, r.drills).solid, null, `${id} is a plain box`);
    assert.equal(panelPlacement(p), null, 'no machining frame: nothing is drilled or cut into it');
  }
  // Nothing enters anything: the LID stands above the STEP, inside the sides, in front of the BACK.
  const step = panelOf(r, 'EDGE-STEP');
  const lid = panelOf(r, 'EDGE-LID');
  const bul = panelOf(r, 'BUL');
  const back = panelOf(r, 'BACK');
  assert.ok(lid.box.x >= bul.box.x + bul.box.w && lid.box.x + lid.box.w <= panelOf(r, 'BUR').box.x);
  assert.ok(lid.box.z >= back.box.z + back.box.d - 1e-9, 'in front of the BACK');
  assert.equal(step.box.z + step.box.d, bul.box.z + bul.cnc.notch.nw, 'the STEP in the g the sides left (their cut face)');
  assert.ok(step.box.z > 0, 'and the obstacle has its ed behind it');
  assert.equal(back.box.y, 120, 'the BACK starts over the rebate');
});

test('the cut list, the BOM and the gate: two rows more, no joint, nothing off the board; the goldens re-pinned with his words', () => {
  const r = cut({ edgeNotch: { edge: 'BB', d: 20, h: 120 } });
  assert.ok(r.csvLines.includes('01,EDGE-STEP,600,120,,0,0.072'));
  assert.ok(r.csvLines.includes('01,EDGE-LID,564,20,,0,0.011'));
  const bom = buildBom([{ unit: { id: 'u1', type: 'BUD', params: r.params }, result: r }]);
  assert.deepEqual(bom.units[0].rows.filter((x) => x.role === 'notch_box').map((x) => [x.id, x.w, x.h]), [['EDGE-STEP', 600, 120], ['EDGE-LID', 564, 20]]);
  for (const res of [r, cut({ edgeNotch: { edge: 'TB', d: 50, h: 100 } }), cut({ edgeNotch: { edge: 'BF', d: 20, h: 120 } }), cut({ edgeNotch: { edge: 'BB', d: 20, h: 120 }, end_panels: [EPL, EPR] })]) {
    assert.deepEqual(resultFindings(res), [], 'no outline fault');
    assert.deepEqual(unitFindings(res, { profile: P }), [], 'the export gate holds');
    assert.deepEqual(offBoardFindings(buildUnitDxfFiles(res, P), res), [], 'nothing off the board');
  }
  for (const file of ['golden-edge-notch-bb.json', 'golden-edge-notch-tb.json']) {
    const g = JSON.parse(read(`fixtures/${file}`));
    assert.ok(g.meta.repinned.includes(OWNER), `${file} says why`);
    assert.ok(REPINNED.some((x) => x.file === `fixtures/${file}` && x.why.includes(OWNER)));
    assert.ok(g.expected.csvLines.some((l) => l.startsWith('01,EDGE-STEP,600,')));
  }
  assert.equal(GATES.edgeBox.opens(kit({ edgeNotch: { edge: 'BB', d: 20, h: 120 } })), true);
  assert.equal(GATES.edgeBox.opens(kit()), false);
  assert.equal(LIVENESS.edgeBox().live, true, LIVENESS.edgeBox().said);
});

test('with the corner notch: apart, both are cut with both boxes; overlapping, the EDGE notch is the one refused, in its own words (D22)', () => {
  const both = cut({ notch: { corner: 'BL', w: 200, d: 200, h: 300 }, edgeNotch: { edge: 'TB', d: 50, h: 100 } });
  assert.deepEqual(both.warnings.filter((w) => /REFUSED/.test(w.code)), []);
  assert.deepEqual(boxes(both), ['RETURN', 'STEP', 'LID', 'EDGE-STEP', 'EDGE-FLOOR']);
  assert.equal(both.derived.edgeNotch.withCorner, true);
  const overlap = cut({ notch: { corner: 'BL', w: 200, d: 200, h: 300 }, edgeNotch: { edge: 'BB', d: 20, h: 120 } });
  const refused = overlap.warnings.find((w) => w.code === 'NOTCH_REFUSED');
  assert.ok(refused, 'refused');
  assert.equal(refused.message, 'NOTCH: the edge notch and the corner notch overlap on BUL. Move one of them, or make it smaller.');
  assert.deepEqual(boxes(overlap), ['RETURN', 'STEP', 'LID'], 'the corner notch stands, its box with it; the edge notch and its boards are not cut');
  assert.ok(overlap.derived.notch, 'the corner notch is cut');
});
