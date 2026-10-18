/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T79 F6 · THE DIA 3 ROWS ON THE BACK ARE NOT LOST TO A NOTCH OR A RECESS ──
//
// The owner, 18.10.2026: *"jak mamy cut the corners lub recess to nie
// rysujesz mi dziurek na śrubki 3 mm, to trzeba będzie dodać"*; 14:17: *"ale
// tylko na plecach."*
//
// THE PROBE (verify/t79/f06-probe.md, the unmodified engine): the BACK had 10
// dia 3 holes instead of 14 with BL or BR full, 13 with a part-height notch
// either way, 10 in the recess CASE A, the parent's 14 in CASE B, and every
// EXT-BACK 0. LISP first: KIT_NOTCH.lsp D10 and KIT_RECESS.lsp D17 AMENDED
// (their NUMBERS: KIT_NOTCH I, I2 and the new I5; KIT_RECESS CASE A and B):
// the dia 3 rows on a back follow EVERY edge of the back that meets a board.
// These assertions are the probe's edge-by-edge table turned round (every row
// 1 to 10 now carries its row, row 11 unchanged), the counts board by board,
// the short run said, the 3-D, the export, the store, and the goldens.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import * as N from '../src/engine/notch.js';
import { recessBackJoints, recessBackPieces, recessWindow, recessExtBackScrews } from '../src/engine/extension.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { panelPlacement, machiningLines } from '../src/engine/joinery.js';
import { readinessOf } from '../src/engine/readiness.js';
import { buildCabinetPartQtys } from '../src/engine/bom.js';
import { buildUnitDxfFiles } from '../src/engine/cnc/dxf.js';
import { unitFindings } from '../src/engine/cnc/exportGate.js';
import { cutRows } from '../src/engine/drawings/setPaper.js';
import { panelSolids } from '../src/3d/panelSolid.js';
import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { goldenOf } from '../scripts/t75-golden.mjs';
import { dump } from '../scripts/t64-classify.mjs';
import { GATES, REPINNED, LISP } from '../scripts/t78-classify.d/f34-t79-f06.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const K = N.notchProfile(P);
const G = 18;
const OWNER_1 = 'jak mamy cut the corners lub recess to nie rysujesz mi dziurek na śrubki 3 mm, to trzeba będzie dodać';
const OWNER_2 = 'ale tylko na plecach.';

// The probe's parent: golden-notch.json's params (KIT_BUD_FULL, W 600, H 770, front 25, 1 shelf, hinge L).
const BUD = JSON.parse(read('fixtures/golden-notch.json')).params;
const PARENT = { ...BUD, notch: undefined };
const A = { x0: 310, x1: 600, z0: 0, z1: 770, d: 150 };
const B = { x0: 110, x1: 490, z0: 210, z1: 590, d: 150 };
const cutWith = (extra) => computeCabinet({ ...PARENT, ...extra }, P);
const panelOf = (r, id) => r.panels.find((p) => p.id === id);
/** The dia 3 holes of a board, its own frame, sorted by x then y (the probe's order). */
const holes = (r, id) => r.drills.filter((d) => d.panel === id && d.kind === 'screw')
  .map((d) => [d.x, d.y]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
const at = (r, id, axis, v) => holes(r, id).filter((h) => h[axis] === v).map((h) => h[1 - axis]);

const CASES = {
  parent: {},
  'BL full': { notch: { corner: 'BL', w: 200, d: 200, h: 0 } },
  'BR full': { notch: { corner: 'BR', w: 200, d: 200, h: 0 } },
  'BL 300': { notch: { corner: 'BL', w: 200, d: 200, h: 300 } },
  'BL -300': { notch: { corner: 'BL', w: 200, d: 200, h: -300 } },
  'CASE A': { extension: A },
  'CASE B': { extension: B },
};
const R = Object.fromEntries(Object.entries(CASES).map(([k, extra]) => [k, cutWith(extra)]));

// ═══ THE LISP FIRST ════════════════════════════════════════════════════════

test('F6 · KIT_NOTCH.lsp D10 and KIT_RECESS.lsp D17 are AMENDED under the owner\'s words, in ASCII, balanced; the licences quote him', () => {
  const notch = read('reference/lisp/KIT_NOTCH.lsp');
  const recess = read('reference/lisp/KIT_RECESS.lsp');
  for (const [name, text] of [['KIT_NOTCH', notch], ['KIT_RECESS', recess]]) {
    assert.match(text, /AMENDED 18\.10\.2026 \(CLAUDE\.md T79 F6\), the owner: \*"jak mamy cut the\s+;;;\s+corners lub recess to nie rysujesz mi dziurek na srubki 3 mm, to\s+;;;\s+trzeba bedzie dodac"\*; 14:17: \*"ale tylko na plecach\."\*/, `${name}: the licence in the file`);
    assert.ok(/^[\x00-\x7F]*$/.test(text), `${name} is ASCII`);
    let depth = 0;
    let min = 0;
    for (const line of text.split('\n')) {
      let inStr = false;
      for (let i = 0; i < line.length; i += 1) {
        const c = line[i];
        if (inStr) { if (c === '\\') i += 1; else if (c === '"') inStr = false; continue; }
        if (c === ';') break;
        if (c === '"') inStr = true;
        else if (c === '(') depth += 1;
        else if (c === ')') { depth -= 1; min = Math.min(min, depth); }
      }
    }
    assert.deepEqual([depth, min], [0, 0], `${name} balances`);
  }
  assert.match(notch, /\(defun notch-edge-row \(a b e\)\n\s+\(if \(< \(- b a\) e\) nil \(notch-shift \(notch-screw-row \(- b a\) e\) a\)\)\)/);
  assert.match(notch, /;;; I5\. NUMBERS - THE BACK'S ROWS ROUND THE BOX \(D10 AMENDED, 18\.10\.2026\)/);
  assert.match(recess, /\(defun recess-ext-back-screws \(cw ch g ex0 ex1 ez0 ez1 \/ S sfe eb bz0 bz1 out\)/);
  for (const why of Object.values(LISP)) {
    assert.ok(why.includes(OWNER_1) && why.includes(OWNER_2), 'each LISP licence quotes the owner');
  }
  assert.deepEqual(Object.keys(LISP).sort(), ['reference/lisp/KIT_NOTCH.lsp', 'reference/lisp/KIT_RECESS.lsp']);
});

test('F6 · the I5 block is the engine\'s cut, case by case (the BACK\'s own frame, the count, the run said short)', () => {
  const lisp = read('reference/lisp/KIT_NOTCH.lsp');
  const from = lisp.indexOf(';;; I5. NUMBERS');
  const block = lisp.slice(from, lisp.indexOf(';;; J. DRAWING', from)).split('\n').map((l) => l.replace(/^;;;\s?/, '')).join('\n');
  const rows = [
    ['BL 200/200/0', { corner: 'BL', w: 200, d: 200, h: 0 }, 14],
    ['BR 200/200/0', { corner: 'BR', w: 200, d: 200, h: 0 }, 14],
    ['BL 200/200/300', { corner: 'BL', w: 200, d: 200, h: 300 }, 19],
    ['BL 200/200/-300', { corner: 'BL', w: 200, d: 200, h: -300 }, 19],
    ['BR 100/200/300', { corner: 'BR', w: 100, d: 200, h: 300 }, 18],
    ['BL 60/200/40', { corner: 'BL', w: 60, d: 200, h: 40 }, 14],
  ];
  for (const [name, notch, count] of rows) {
    const line = block.split('\n').find((l) => l.startsWith(name));
    assert.ok(line, `I5 names ${name}`);
    assert.ok(line.trimEnd().endsWith(String(count)), `I5 ${name}: ${count} holes`);
    const r = cutWith({ notch });
    assert.equal(r.derived.notch.refused, undefined, `${name} cut`);
    assert.equal(holes(r, 'BACK').length, count, `${name}: the engine's BACK carries ${count}`);
  }
  // The literal runs the table states, read off the real cut.
  const bl300 = cutWith({ notch: rows[2][1] });
  assert.ok(block.includes('x 209: 50 150 250') && block.includes('LID, y 309: 68 109 150'));
  assert.deepEqual(at(bl300, 'BACK', 0, 209), [50, 150, 250]);
  assert.deepEqual(at(bl300, 'BACK', 1, 309), [68, 109, 150]);
  const br = cutWith({ notch: rows[4][1] });
  assert.ok(block.includes('x 491: 50 150 250') && block.includes('LID, y 309: 520.5 561.5'));
  assert.deepEqual(at(br, 'BACK', 0, 491), [50, 150, 250]);
  assert.deepEqual(at(br, 'BACK', 1, 309), [520.5, 561.5], 'the run 500..582 is 82, under 2 x 50: two at the quarters');
  // The short run: none drilled, and said (the LISP's command line, the engine's derived.notch).
  const short = cutWith({ notch: rows[5][1] });
  assert.deepEqual(short.derived.notch.backRowsShort, [{ board: 'RETURN', run: 40 }, { board: 'LID', run: 42 }]);
  assert.ok(block.includes('SHORT (("RETURN" 40) ("LID" 42))'));
  assert.match(lisp, /\(notch-say \(strcat "BACK rows into the box: none on the " \(car s\) " \(the run "/);
  assert.deepEqual(N.notchBackJoints(600, 770, G, 60, 40, 'BL', K).SHORT, [{ board: 'RETURN', run: 40 }, { board: 'LID', run: 42 }]);
  assert.equal(N.notchBackJoints(600, 770, G, 200, 300, 'BL', K).SHORT, undefined, 'present only when a run is short');
  assert.equal(R['BL 300'].derived.notch.backRowsShort, undefined);
  // notch-edge-row: e from each end and the middle; 2e or less two at the quarters; under e none.
  assert.deepEqual(N.notchEdgeRow(18, 200, 50), [68, 109, 150]);
  assert.deepEqual(N.notchEdgeRow(500, 582, 50), [520.5, 561.5]);
  assert.deepEqual(N.notchEdgeRow(0, 49.9, 50), []);
  assert.deepEqual(N.notchEdgeRow(0, 50, 50), [12.5, 37.5]);
});

// ═══ THE PROBE TABLE, TURNED ROUND ═════════════════════════════════════════

test('F6 · THE PROBE, edge by edge: rows 1 to 10 carry their row now; row 11 (BUL, BUR) is unchanged', () => {
  // 1 · BL full: the BACK's notched edge (own x 9 = carcass x 209) into the RETURN's end.
  assert.deepEqual(at(R['BL full'], 'BACK', 0, 9), [50, 240, 530, 720]);
  // 2 · BR full: the same at own x 391 (carcass 391, the BACK 0..400).
  assert.deepEqual(at(R['BR full'], 'BACK', 0, 391), [50, 240, 530, 720]);
  // 3 · BL 300: beside the notch, carcass x 209, 0..300, into the RETURN's end.
  assert.deepEqual(at(R['BL 300'], 'BACK', 0, 209), [50, 150, 250]);
  // 4 · BL 300: the edge over the notch, y 300 + 9, x 18..200, into the LID's back edge.
  assert.deepEqual(at(R['BL 300'], 'BACK', 1, 309), [68, 109, 150]);
  // 5 · BL -300: beside the notch, 470..770, into the RETURN's end.
  assert.deepEqual(at(R['BL -300'], 'BACK', 0, 209), [520, 620, 720]);
  // 6 · BL -300: the edge under the notch, y 470 - 9, into the FLOOR's back edge.
  assert.deepEqual(at(R['BL -300'], 'BACK', 1, 461), [68, 109, 150]);
  // 7 · CASE A: the BACK's right edge beside the band (x 328 - 9) into RETURN-L's front end.
  assert.deepEqual(at(R['CASE A'], 'BACK', 0, 319), [50, 385, 720]);
  // 8 · CASE B: the window's four edges.
  assert.deepEqual(at(R['CASE B'], 'BACK', 0, 119), [278, 400, 522], 'into RETURN-L');
  assert.deepEqual(at(R['CASE B'], 'BACK', 0, 481), [278, 400, 522], 'into RETURN-R');
  assert.deepEqual(at(R['CASE B'], 'BACK', 1, 219), [178, 300, 422], 'into the FLOOR');
  assert.deepEqual(at(R['CASE B'], 'BACK', 1, 581), [178, 300, 422], 'into the LID');
  // 9 · CASE A: the EXT-BACK round the band: RETURN-L, BUR's bump, the BOTTOM's and the TOP's bumps.
  assert.deepEqual(holes(R['CASE A'], 'EXT-BACK'), [
    [9, 50], [9, 385], [9, 720], [68, 9], [68, 761], [145, 9], [145, 761], [222, 9], [222, 761], [281, 50], [281, 385], [281, 720],
  ]);
  // 10 · CASE B: the EXT-BACK round the band: the two RETURNs, the FLOOR, the LID.
  assert.deepEqual(holes(R['CASE B'], 'EXT-BACK'), [
    [9, 68], [9, 190], [9, 312], [68, 9], [68, 371], [190, 9], [190, 371], [312, 9], [312, 371], [371, 68], [371, 190], [371, 312],
  ]);
  // 11 · BUL and BUR: their 6 / 6 in every case, as the parent's.
  for (const [name, r] of Object.entries(R)) {
    assert.equal(holes(r, 'BUL').length, 6, `${name} BUL`);
    assert.equal(holes(r, 'BUR').length, 6, `${name} BUR`);
  }
});

test('F6 · THE COUNTS: the BACK 14 again with BL or BR full, 19 round a part-height notch, 13 and 26 in the recess, every EXT-BACK 12; the box boards 0', () => {
  const want = { parent: 14, 'BL full': 14, 'BR full': 14, 'BL 300': 19, 'BL -300': 19, 'CASE A': 13, 'CASE B': 26 };
  for (const [name, n] of Object.entries(want)) assert.equal(holes(R[name], 'BACK').length, n, `${name}: the BACK`);
  assert.equal(holes(R['CASE A'], 'EXT-BACK').length, 12);
  assert.equal(holes(R['CASE B'], 'EXT-BACK').length, 12);
  // "ale tylko na plecach": the box boards carry none, and state none.
  for (const [name, ids] of [['BL full', ['RETURN', 'STEP']], ['BL 300', ['RETURN', 'STEP', 'LID']], ['BL -300', ['RETURN', 'STEP', 'FLOOR']],
    ['CASE A', ['RETURN-L']], ['CASE B', ['RETURN-L', 'RETURN-R', 'FLOOR', 'LID']]]) {
    for (const id of ids) {
      assert.deepEqual(holes(R[name], id), [], `${name} ${id}: no hole`);
      const stated = panelOf(R[name], id).meta.notch?.screws ?? panelOf(R[name], id).meta.extension?.screws;
      assert.deepEqual(stated, [], `${name} ${id}: nothing stated`);
    }
  }
  // A front notch never reaches the BACK; an unboxed rebate has no box: the parent's rows, untouched.
  const front = cutWith({ notch: { corner: 'FL', w: 200, d: 200, h: 0 }, hinge: 'R' });
  assert.equal(front.derived.notch.refused, undefined, JSON.stringify(front.warnings));
  assert.deepEqual(holes(front, 'BACK'), holes(R.parent, 'BACK'));
  // The rebate's BACK is what it was before F6 (the probe's engine): the parent's rows less the one the rebate
  // eats on BUR's back edge, (591, 50); no row of the box (there is none).
  const rebate = cutWith({ notch: { corner: 'BR', w: 10, d: 40, h: 50 } });
  assert.equal(panelOf(rebate, 'RETURN'), undefined, 'a rebate is not boxed');
  assert.deepEqual(holes(rebate, 'BACK'), holes(R.parent, 'BACK').filter(([x, y]) => !(x === 591 && y === 50)));
});

test('F6 · the pure routines: notchBackJoints in the carcass frame, recessBackJoints round the window, recessExtBackScrews round the band', () => {
  const full = N.notchBackJoints(600, 770, G, 200, 0, 'BL', K);
  assert.deepEqual(full.SCREWS.filter(([x]) => x === 209).map(([, y]) => y), [50, 240, 530, 720]);
  assert.equal(full.SCREWS.length, 14);
  const top = N.notchBackJoints(600, 770, G, 200, -300, 'BL', K);
  assert.deepEqual(top.SCREWS.filter(([x]) => x === 209), [[209, 520], [209, 620], [209, 720]]);
  assert.deepEqual(top.SCREWS.filter(([, y]) => y === 461), [[68, 461], [109, 461], [150, 461]]);
  const window = recessWindow(600, 770, G, 110, 490, 210, 590);
  const [piece] = recessBackPieces(600, 770, G, 110, 490, 210, 590);
  const bj = recessBackJoints(piece, window, 600, 770, G, 110, 490, 210, 590, [113, 487], [113, 487], [95, 385, 675], [95, 385, 675], K);
  assert.equal(bj.SCREWS.length, 26);
  assert.equal(recessExtBackScrews(600, 770, G, 310, 600, 0, 770, K).length, 12);
  assert.equal(recessExtBackScrews(600, 770, G, 110, 490, 210, 590, K).length, 12);
});

test('F6 · the narrowest band (KIT_RECESS.lsp NUMBERS, D4): every run round it is 100, two holes at its quarters, never three in one place', () => {
  const lisp = read('reference/lisp/KIT_RECESS.lsp');
  const from = lisp.indexOf(';;; THE NARROWEST BAND');
  assert.ok(from > 0, 'the NUMBERS block names it');
  const block = lisp.slice(from, lisp.indexOf(';;; G. DRAWING', from)).replace(/;;;\s?/g, ' ').replace(/\s+/g, ' ');
  for (const line of ['into RETURN-L: x 119, z 253 303', 'into RETURN-R: x 237, z 253 303', 'into the FLOOR: x 153 203, z 219',
    'into the LID: x 153 203, z 337', '(22 dia 3 holes)', 'into RETURN-L: x 9, z 43 93', 'into RETURN-R: x 127, z 43 93',
    'into the FLOOR: x 43 93, z 9', 'into the LID: x 43 93, z 127', '8 dia 3 holes']) {
    assert.ok(block.includes(line), `the block says ${line}`);
  }
  assert.match(lisp, /\(foreach x \(notch-edge-row g \(- \(car eb\) g\) sfe\)/, 'the EXT-BACK row is THE BACK SCREW ROW over g .. w - g');
  const r = cutWith({ extension: { x0: 110, x1: 246, z0: 210, z1: 346, d: 150 } });
  assert.deepEqual(r.derived.extension.window, [128, 228, 228, 328], 'the interior is exactly notch.minInterior each way');
  assert.equal(holes(r, 'BACK').length, 22);
  assert.deepEqual(at(r, 'BACK', 0, 119), [253, 303]);
  assert.deepEqual(at(r, 'BACK', 0, 237), [253, 303]);
  assert.deepEqual(at(r, 'BACK', 1, 219), [153, 203]);
  assert.deepEqual(at(r, 'BACK', 1, 337), [153, 203]);
  assert.deepEqual(holes(r, 'EXT-BACK'), [[9, 43], [9, 93], [43, 9], [43, 127], [93, 9], [93, 127], [127, 43], [127, 93]]);
  // On every run over 2 x 50 the EXT-BACK's row is drawBACK's own (CASE A and CASE B: x 68 145 222 and 68 190 312).
  assert.deepEqual(recessExtBackScrews(600, 770, G, 110, 490, 210, 590, K).filter(([, z]) => z === 9).map(([x]) => x), [68, 190, 312]);
  assert.deepEqual(recessExtBackScrews(600, 770, G, 310, 600, 0, 770, K).filter(([, z]) => z === 9).map(([x]) => x), [68, 145, 222]);
  // No board of any case carries two holes in one place.
  for (const [name, res] of [...Object.entries(R), ['narrowest', r]]) {
    for (const id of new Set(res.drills.filter((d) => d.kind === 'screw').map((d) => d.panel))) {
      const keys = holes(res, id).map(([x, y]) => `${x},${y}`);
      assert.equal(new Set(keys).size, keys.length, `${name} ${id}: every dia 3 hole stands alone`);
    }
  }
});

// ═══ THE 3-D, THE DRAWING, THE EXPORT ══════════════════════════════════════

test('F6 · the 3-D: the EXT-BACK has the BACK\'s frame, so DrillRings and the machined solid draw its twelve; the BACK\'s rows are drawn', () => {
  for (const name of ['CASE A', 'CASE B']) {
    const r = R[name];
    const eb = panelOf(r, 'EXT-BACK');
    assert.equal(eb.part, 'RECESS-BACK');
    const pl = panelPlacement(eb);
    assert.deepEqual(pl, { origin: [eb.box.x, eb.box.y, eb.box.z], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, -1] }, `${name}: the BACK's upright frame`);
    assert.equal(machiningLines(eb, r.drills).filter((l) => l.kind === 'hole' && l.layer === 'SCREWS_3MM').length, 12);
    const { solid } = panelSolids(eb, P.puzzle.layers, P, r.drills);
    assert.ok(solid, `${name}: the EXT-BACK renders as a machined board`);
    const back = panelOf(r, 'BACK');
    assert.equal(machiningLines(back, r.drills).filter((l) => l.kind === 'hole' && l.layer === 'SCREWS_3MM').length, holes(r, 'BACK').length);
  }
  // The three faces stay right-handed (u x v = -n), the turn 13 guard.
  const { u, v, n } = panelPlacement(panelOf(R['CASE B'], 'EXT-BACK'));
  const cross = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  assert.deepEqual(cross.map((c) => c + 0), n.map((c) => -c + 0));
  assert.match(read('src/3d/DrillRings.jsx'), /const placement = panelPlacement\(panel\);/, 'DrillRings reads the placement, nothing new drawn');
});

test('F6 · the export: the circles on SCREWS_3MM in every DXF, the EXT-BACK a cut part with its twelve, the gate clean where it was', () => {
  const want = { 'BL full': 14, 'BR full': 14, 'BL 300': 19, 'BL -300': 19, 'CASE A': 13, 'CASE B': 26 };
  for (const [name, n] of Object.entries(want)) {
    const files = buildUnitDxfFiles(R[name], P);
    const circles = (id) => files.find((f) => f.panelId === id).entities.filter((e) => e.layer === 'SCREWS_3MM' && e.type === 'circle');
    assert.equal(circles('BACK').length, n, `${name}: the BACK's DXF`);
    assert.ok(circles('BACK').every((c) => c.r === 1.5), 'dia 3');
    if (name.startsWith('CASE')) assert.equal(circles('EXT-BACK').length, 12, `${name}: the EXT-BACK's DXF`);
  }
  // The export gate: no new finding (CASE B's RECESS_WINDOW winding finding predates F6 and is not about a hole).
  for (const name of ['BL full', 'BR full', 'BL 300', 'BL -300', 'CASE A']) assert.deepEqual(unitFindings(R[name], { profile: P }), [], name);
  assert.deepEqual(unitFindings(R['CASE B'], { profile: P }).filter((f) => f.layer === 'SCREWS_3MM' || f.panel === 'EXT-BACK'), []);
  // Readiness and the parts card: the EXT-BACK is cut (outline and holes), the RETURNs, the FLOOR and the LID outlines only.
  const rows = Object.values(cutRows(R['CASE B'])).flat();
  const state = (id) => rows.find((x) => x.id === id).state;
  assert.equal(state('EXT-BACK'), 'cut');
  for (const id of ['RETURN-L', 'RETURN-R', 'FLOOR', 'LID']) assert.equal(state(id), 'geometry', id);
  assert.equal(readinessOf(panelOf(R['CASE A'], 'EXT-BACK'), { drills: R['CASE A'].drills }), 'cut');
  // The BOM counts the screws off the drilling (bom.js, one law with the invoice): every hole back is a screw
  // bought. The probe's engine counted 28 / 31 / 28 / 32 (BL full, BL 300, CASE A, CASE B); the parent 32.
  const bomScrews = { parent: 32, 'BL full': 32, 'BL 300': 37, 'BL -300': 37, 'CASE A': 43, 'CASE B': 56 };
  for (const [name, n] of Object.entries(bomScrews)) {
    assert.equal(buildCabinetPartQtys(R[name], { type: 'BUD' }).screw_confirmat.pcs, n, `${name}: the BOM's screws`);
    assert.equal(R[name].drills.filter((d) => /screw/.test(d.kind)).length, n, `${name}: the same holes`);
  }
  // The cut list: the boards and their sizes are what they were (only holes came back).
  assert.deepEqual(R['CASE B'].csvLines.slice(7), ['01,RETURN-L,132,344,,0,0.045', '01,RETURN-R,132,344,,0,0.045', '01,FLOOR,380,132,,0,0.050', '01,LID,380,132,,0,0.050', '01,EXT-BACK,380,380,,0,0.144']);
});

// ═══ THE STORE, SAVE AND RELOAD ════════════════════════════════════════════

const S = () => useProjectStore.getState();
const unitOf = (id) => S().units.find((u) => u.id === id);

test('F6 · the store road: a BUD with CUT CORNER BL full and a BUD half across a recess are cut with their rows, and again after a reload', () => {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  S().addWallSlope({ kind: 'recess', wall: 0, x_mm: 1000, width: 1300, depth: 300 });
  const n = S().addUnit('BUD', { wall: 0, x: 200 });
  assert.equal(n.error, null, n.error);
  const res = S().setUnitNotch(n.id, { corner: 'BL', w: 200, d: 200, h: 0 });
  assert.equal(res.ok, true, res.said);
  const e = S().addUnit('BUD', { wall: 0, x: 1800 });
  assert.equal(e.error, null, e.error);
  S().moveUnit(e.id, 1800, 1);
  const rn = S().unitResult(n.id);
  const re = S().unitResult(e.id);
  assert.equal(holes(rn, 'BACK').length, 14, 'the notched BUD');
  assert.deepEqual(re.derived.extension.boards, ['RETURN-R', 'EXT-BACK']);
  assert.equal(holes(re, 'EXT-BACK').length, 12, 'the recess BUD\'s EXT-BACK');
  const backRows = holes(re, 'BACK');
  assert.ok(backRows.length > 10, `the recess BUD's BACK carries the column beside the band (${backRows.length})`);
  const saved = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
  S().newProject();
  S().loadProject(saved.project, saved.units);
  assert.deepEqual(holes(S().unitResult(n.id), 'BACK'), holes(rn, 'BACK'));
  assert.deepEqual(holes(S().unitResult(e.id), 'BACK'), backRows);
  assert.deepEqual(holes(S().unitResult(e.id), 'EXT-BACK'), holes(re, 'EXT-BACK'));
  assert.deepEqual(unitOf(n.id).params.notch, { corner: 'BL', w: 200, d: 200, h: 0 });
});

// ═══ THE GOLDENS AND THE GATE ══════════════════════════════════════════════

test('F6 · the four goldens are the cut, byte for byte, re-pinned with the owner\'s words; the six hold; the gate opens on a back notch or a recess only', () => {
  const files = ['golden-notch.json', 'golden-notch-top.json', 'golden-recess.json', 'golden-recess-band.json'];
  for (const f of files) {
    const g = JSON.parse(read(`fixtures/${f}`));
    assert.deepEqual(goldenOf(g.params, P), g.expected, `${f} is the engine's cut`);
    assert.match(g.meta.repinned, /^18\.10\.2026 \(the owner's list, CLAUDE\.md T79 F6\)/, `${f}: the re-pin says why`);
    assert.equal(GATES.backRowsRoundTheBox.opens(g.params), true, `${f} opens the gate`);
  }
  assert.deepEqual(REPINNED.map((x) => x.file).sort(), files.map((f) => `fixtures/${f}`).sort());
  for (const { why } of REPINNED) assert.ok(why.includes(OWNER_1) && why.includes(OWNER_2), 'the owner\'s words');
  const back = (f) => JSON.parse(read(`fixtures/${f}`)).expected.drills.find(([k]) => k === 'SCREWS_3MM|BACK')[1];
  assert.deepEqual(files.map(back), [14, 19, 13, 26]);
  const base = JSON.parse(read('verify/t70/goldens-base.json'));
  const head = dump();
  for (const id of ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY']) assert.equal(head[id].sha256, base[id].sha256, id);
  assert.equal(GATES.backRowsRoundTheBox.opens(PARENT), false, 'no notch, no recess');
  assert.equal(GATES.backRowsRoundTheBox.opens({ ...PARENT, notch: { corner: 'FL', w: 200, d: 200, h: 0 } }), false, 'a front notch');
  assert.equal(GATES.backRowsRoundTheBox.opens({ ...PARENT, extension: B }), true);
});
