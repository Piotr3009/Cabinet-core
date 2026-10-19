/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T79 F6, REWRITTEN 19.10.2026 · THE FIRST BACK STATES NO ROW INTO THE BOX ──
//
// T79 F6 (18.10.2026) drew the dia 3 rows of the BACK along the notch's box
// and round the recess window, and drilled the recess's EXT-BACK. The owner's
// eye-test of 19.10.2026: *"nie na pierwszych plecach tylko na tych drugich
// ktore sa we wnetrzu recess, na tych pierwszych nie, to juz bylo usuniete i
// znowu trzeba usunac"*. So the FIRST back is as on 17.10 (KIT_NOTCH.lsp D10,
// KIT_RECESS.lsp D17: drawBACK's rows into the sides, the TOP and the BOTTOM,
// nothing into a box, nothing round a window) and the SECOND back, the
// EXT-BACK, keeps its twelve of 18.10. The old test held the deleted rule and
// is rewritten whole (a green test beside the old rule is a lie).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import * as N from '../src/engine/notch.js';
import * as X from '../src/engine/extension.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { panelPlacement, machiningLines } from '../src/engine/joinery.js';
import { readinessOf } from '../src/engine/readiness.js';
import { buildCabinetPartQtys } from '../src/engine/bom.js';
import { buildUnitDxfFiles } from '../src/engine/cnc/dxf.js';
import { cutRows } from '../src/engine/drawings/setPaper.js';
import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { goldenOf } from '../scripts/t75-golden.mjs';
import { dump } from '../scripts/t64-classify.mjs';
import { GATES, LIVENESS } from '../scripts/t78-classify.d/f34-t79-f06.mjs';
import { REPINNED, LICENSED, LISP } from '../scripts/t78-classify.d/f36-owner-1910b.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const K = N.notchProfile(P);
const G = 18;
const OWNER = 'nie na pierwszych plecach tylko na tych drugich ktore sa we wnetrzu recess, na tych pierwszych nie, to juz bylo usuniete i znowu trzeba usunac';

const BUD = JSON.parse(read('fixtures/golden-notch.json')).params;
const PARENT = { ...BUD, notch: undefined };
const A = { x0: 310, x1: 600, z0: 0, z1: 770, d: 150 };
const B = { x0: 110, x1: 490, z0: 210, z1: 590, d: 150 };
const cutWith = (extra) => computeCabinet({ ...PARENT, ...extra }, P);
const panelOf = (r, id) => r.panels.find((p) => p.id === id);
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
  'CASE D': { notch: { corner: 'BL', w: 200, d: 200, h: 0 }, extension: A },
};
const R = Object.fromEntries(Object.entries(CASES).map(([k, extra]) => [k, cutWith(extra)]));

// ═══ THE LISP FIRST ════════════════════════════════════════════════════════

test('19.10 · KIT_NOTCH.lsp D10 and KIT_RECESS.lsp D17 carry the owner\'s withdrawal; the box-row routines are gone; the licences quote him', () => {
  const notch = read('reference/lisp/KIT_NOTCH.lsp');
  const recess = read('reference/lisp/KIT_RECESS.lsp');
  assert.match(notch, /WITHDRAWN 19\.10\.2026, the owner on\s+;;;\s+the eye-test of T79: \*"nie na pierwszych plecach/);
  assert.match(recess, /HALF\s+;;;\s+WITHDRAWN 19\.10\.2026, the owner on the eye-test of T79/);
  for (const [name, text, gone] of [
    ['KIT_NOTCH', notch, [/\(defun notch-back-box-rows/, /\(cons "SHORT"/, /;;; I5\. NUMBERS/]],
    ['KIT_RECESS', recess, [/\(defun recess-notch-box-rows/, /\(defun recess-put-hole/, /recess-notch-box-rows nb cw ch g\)/]],
  ]) {
    for (const m of gone) assert.doesNotMatch(text, m, `${name}: deleted, not kept`);
    assert.ok(/^[\x00-\x7F]*$/.test(text), `${name} is ASCII`);
  }
  assert.match(notch, /\(defun notch-edge-row \(a b e\)/, 'the EXT-BACK\'s helper stays');
  assert.match(recess, /\(defun recess-ext-back-screws \(cw ch g ex0 ex1 ez0 ez1 \/ S sfe eb bz0 bz1 out\)/, 'the EXT-BACK is still drilled');
  assert.match(notch, /so the BACK carries 10 dia 3 holes \(the parent 14\)/);
  assert.match(notch, /so the BACK carries 13 dia 3 holes/);
  assert.match(recess, /so the BACK carries 10 dia 3 holes \(13 from 18\.10 to 19\.10\.2026\)/);
  assert.match(recess, /so the BACK carries 6 dia 3 holes/);
  for (const why of Object.values(LISP)) assert.ok(why.includes(OWNER), 'each LISP licence quotes the owner');
  assert.deepEqual(Object.keys(LISP).sort(), ['reference/lisp/KIT_NOTCH.lsp', 'reference/lisp/KIT_RECESS.lsp']);
  for (const why of Object.values(LICENSED).map((l) => l.why)) assert.ok(why.includes(OWNER));
});

// ═══ THE ENGINE: THE FIRST BACK ════════════════════════════════════════════

test('19.10 · THE COUNTS: the BACK 10 with BL or BR full, 13 beside a part-height notch, 10 and 14 in the recess, 6 with both; every EXT-BACK 12; the box boards 0', () => {
  const want = { parent: 14, 'BL full': 10, 'BR full': 10, 'BL 300': 13, 'BL -300': 13, 'CASE A': 10, 'CASE B': 14, 'CASE D': 6 };
  for (const [name, n] of Object.entries(want)) assert.equal(holes(R[name], 'BACK').length, n, `${name}: the BACK`);
  for (const name of ['CASE A', 'CASE B', 'CASE D']) assert.equal(holes(R[name], 'EXT-BACK').length, 12, `${name}: the EXT-BACK keeps its twelve`);
  for (const name of ['BL full', 'BR full', 'BL 300', 'BL -300', 'CASE D']) {
    for (const id of ['STEP', 'RETURN', 'LID', 'FLOOR']) if (panelOf(R[name], id)) assert.deepEqual(holes(R[name], id), [], `${name} ${id}`);
  }
  for (const name of ['CASE A', 'CASE B', 'CASE D']) {
    for (const id of ['RETURN-L', 'RETURN-R', 'FLOOR', 'LID']) if (panelOf(R[name], id)) assert.deepEqual(holes(R[name], id), [], `${name} ${id}`);
  }
  for (const name of Object.keys(CASES)) {
    for (const id of ['BUL', 'BUR']) if (panelOf(R[name], id)) assert.equal(holes(R[name], id).length, 6, `${name} ${id}: 6 as always`);
  }
  // No board of any case carries two holes in one place.
  for (const [name, res] of Object.entries(R)) {
    for (const id of new Set(res.drills.filter((d) => d.kind === 'screw').map((d) => d.panel))) {
      const keys = holes(res, id).map(([x, y]) => `${x},${y}`);
      assert.equal(new Set(keys).size, keys.length, `${name} ${id}: every dia 3 hole stands alone`);
    }
  }
});

test('19.10 · edge by edge: no column into the RETURN, none into the LID or the FLOOR, none round the window; drawBACK\'s rows stand', () => {
  // KIT_NOTCH.lsp NUMBERS I: the BACK's own frame (400 wide at BL). No hole at x 9 (the RETURN's end).
  assert.deepEqual(at(R['BL full'], 'BACK', 0, 9), []);
  assert.deepEqual(at(R['BL full'], 'BACK', 0, 391), [50, 240, 530, 720], 'the far column');
  assert.deepEqual(at(R['BL full'], 'BACK', 1, 761), [68, 200, 332]);
  assert.deepEqual(at(R['BL full'], 'BACK', 1, 9), [68, 200, 332]);
  // NUMBERS I2 (from the floor, 300): the side's own rows above the notch at x 9; nothing at x 209 (the RETURN), nothing at y 309 (the LID).
  assert.deepEqual(at(R['BL 300'], 'BACK', 0, 9), [350, 535, 720]);
  assert.deepEqual(at(R['BL 300'], 'BACK', 0, 209), []);
  assert.deepEqual(at(R['BL 300'], 'BACK', 1, 309), []);
  // From the top (-300, D21): the run under the notch at x 9; nothing at x 209, nothing at y 461 (the FLOOR).
  assert.deepEqual(at(R['BL -300'], 'BACK', 0, 9), [50, 235, 420]);
  assert.deepEqual(at(R['BL -300'], 'BACK', 0, 209), []);
  assert.deepEqual(at(R['BL -300'], 'BACK', 1, 461), []);
  // KIT_RECESS.lsp CASE A: the BACK 328 wide; no column at x 319 (RETURN-L's end); the left column and the run's rows stand.
  assert.deepEqual(at(R['CASE A'], 'BACK', 0, 319), []);
  assert.deepEqual(at(R['CASE A'], 'BACK', 0, 9), [50, 240, 530, 720]);
  assert.deepEqual(at(R['CASE A'], 'BACK', 1, 9), [68, 173, 278]);
  // CASE B: nothing S outside the window (x 119, 481; z 219, 581).
  for (const x of [119, 481]) assert.deepEqual(at(R['CASE B'], 'BACK', 0, x), []);
  for (const y of [219, 581]) assert.deepEqual(at(R['CASE B'], 'BACK', 1, y), []);
  // CASE D (the notch and the band): the 128 wide piece between them carries its two rows and nothing else.
  assert.deepEqual(holes(R['CASE D'], 'BACK'), [[68, 9], [68, 761], [73, 9], [73, 761], [78, 9], [78, 761]]);
  // derived.notch no longer says a run short: there is no run.
  for (const name of ['BL full', 'BL 300', 'BL -300']) assert.equal('backRowsShort' in R[name].derived.notch, false, name);
});

test('19.10 · the pure routines: notchBackJoints and recessBackJoints answer no SHORT and no row into a box; the EXT-BACK\'s routine is 18.10\'s', () => {
  const bj = N.notchBackJoints(600, 770, G, 200, 0, 'BL', K);
  assert.equal('SHORT' in bj, false);
  assert.ok(bj.SCREWS.every(([x]) => x !== 209), 'no column at nw + S');
  assert.equal(bj.SCREWS.length, 10);
  const part = N.notchBackJoints(600, 770, G, 200, 300, 'BL', K);
  assert.ok(part.SCREWS.every(([x, y]) => x !== 209 && y !== 309));
  assert.equal(typeof N.notchBackBoxRows, 'undefined', 'the box-row routine is deleted');
  assert.equal(typeof X.recessNotchBoxRows, 'undefined');
  assert.equal(typeof X.recessPutHole, 'undefined');
  const window = X.recessWindow(600, 770, G, B.x0, B.x1, B.z0, B.z1);
  const rj = X.recessBackJoints([0, 0, 600, 770], window, 600, 770, G, B.x0, B.x1, B.z0, B.z1, [113, 487], [113, 487], [95, 385, 675], [95, 385, 675], K);
  assert.equal(rj.SCREWS.length, 14, 'the parent\'s fourteen, nothing round the window');
  assert.deepEqual(X.recessExtBackScrews(600, 770, G, 110, 490, 210, 590, K), [
    [9, 68], [371, 68], [9, 190], [371, 190], [9, 312], [371, 312],
    [68, 9], [68, 371], [190, 9], [190, 371], [312, 9], [312, 371],
  ], 'the EXT-BACK, a back: its rows round the band (18.10, kept)');
  assert.equal(N.notchEdgeRow(0, 40, 50).length, 0);
  assert.deepEqual(N.notchEdgeRow(100, 400, 50), [150, 250, 350]);
});

test('19.10 · the narrowest band (KIT_RECESS.lsp NUMBERS, D4): the EXT-BACK\'s eight at the quarters; the BACK carries the parent\'s fourteen', () => {
  const lisp = read('reference/lisp/KIT_RECESS.lsp');
  assert.ok(lisp.indexOf(';;; THE NARROWEST BAND') > 0, 'the NUMBERS block names it');
  assert.match(lisp, /\(foreach x \(notch-edge-row g \(- \(car eb\) g\) sfe\)/, 'the EXT-BACK row is THE BACK SCREW ROW over g .. w - g');
  const r = cutWith({ extension: { x0: 110, x1: 246, z0: 210, z1: 346, d: 150 } });
  assert.deepEqual(r.derived.extension.window, [128, 228, 228, 328]);
  assert.equal(holes(r, 'BACK').length, 14);
  assert.deepEqual(holes(r, 'EXT-BACK'), [[9, 43], [9, 93], [43, 9], [43, 127], [93, 9], [93, 127], [127, 43], [127, 93]]);
});

// ═══ THE 3-D, THE EXPORT, THE STORE ════════════════════════════════════════

test('19.10 · the 3-D and the export: the EXT-BACK keeps the BACK\'s frame and its twelve circles; the BACK\'s DXF carries its count', () => {
  for (const name of ['CASE A', 'CASE B']) {
    const r = R[name];
    const eb = panelOf(r, 'EXT-BACK');
    assert.equal(eb.part, 'RECESS-BACK');
    assert.deepEqual(panelPlacement(eb), { origin: [eb.box.x, eb.box.y, eb.box.z], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, -1] });
    assert.equal(machiningLines(eb, r.drills).filter((l) => l.kind === 'hole' && l.layer === 'SCREWS_3MM').length, 12);
    assert.equal(readinessOf(eb, { drills: r.drills }), 'cut');
  }
  const want = { 'BL full': 10, 'BR full': 10, 'BL 300': 13, 'BL -300': 13, 'CASE A': 10, 'CASE B': 14, 'CASE D': 6 };
  for (const [name, n] of Object.entries(want)) {
    const files = buildUnitDxfFiles(R[name], P);
    const circles = (id) => files.find((f) => f.panelId === id).entities.filter((e) => e.layer === 'SCREWS_3MM' && e.type === 'circle');
    assert.equal(circles('BACK').length, n, `${name}: the BACK's DXF`);
    if (name.startsWith('CASE')) assert.equal(circles('EXT-BACK').length, 12, `${name}: the EXT-BACK's DXF`);
  }
  const rows = Object.values(cutRows(R['CASE B'])).flat();
  const state = (id) => rows.find((x) => x.id === id).state;
  assert.equal(state('EXT-BACK'), 'cut');
  for (const id of ['RETURN-L', 'RETURN-R', 'FLOOR', 'LID']) assert.equal(state(id), 'geometry', id);
  // The BOM counts the screws off the drilling: every hole gone is a screw not bought.
  const bomScrews = { parent: 32, 'BL full': 28, 'BL 300': 31, 'BL -300': 31, 'CASE A': 40, 'CASE B': 44 };
  for (const [name, n] of Object.entries(bomScrews)) {
    assert.equal(buildCabinetPartQtys(R[name], { type: 'BUD' }).screw_confirmat.pcs, n, `${name}: the BOM's screws`);
    assert.equal(R[name].drills.filter((d) => /screw/.test(d.kind)).length, n, `${name}: the same holes`);
  }
});

const S = () => useProjectStore.getState();

test('19.10 · the store road: a BUD with CUT CORNER BL full and a BUD half across a recess, and again after a reload', () => {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  S().addWallSlope({ kind: 'recess', wall: 0, x_mm: 1000, width: 1300, depth: 300 });
  const n = S().addUnit('BUD', { wall: 0, x: 200 });
  assert.equal(n.error, null, n.error);
  assert.equal(S().setUnitNotch(n.id, { corner: 'BL', w: 200, d: 200, h: 0 }).ok, true);
  const e = S().addUnit('BUD', { wall: 0, x: 1800 });
  assert.equal(e.error, null, e.error);
  S().moveUnit(e.id, 1800, 1);
  const rn = S().unitResult(n.id);
  const re = S().unitResult(e.id);
  assert.equal(holes(rn, 'BACK').length, 10, 'the notched BUD');
  assert.deepEqual(re.derived.extension.boards, ['RETURN-R', 'EXT-BACK']);
  assert.equal(holes(re, 'EXT-BACK').length, 12, 'the recess BUD\'s EXT-BACK');
  assert.equal(holes(re, 'BACK').length, 10, 'the recess BUD\'s BACK: no column beside the band');
  const saved = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
  S().newProject();
  S().loadProject(saved.project, saved.units);
  assert.deepEqual(holes(S().unitResult(n.id), 'BACK'), holes(rn, 'BACK'));
  assert.deepEqual(holes(S().unitResult(e.id), 'BACK'), holes(re, 'BACK'));
  assert.deepEqual(holes(S().unitResult(e.id), 'EXT-BACK'), holes(re, 'EXT-BACK'));
});

// ═══ THE GOLDENS AND THE GATE ══════════════════════════════════════════════

test('19.10 · the seven goldens are the cut, byte for byte, re-pinned with the owner\'s words; the six hold; the gate is F6\'s, live', () => {
  const files = ['golden-notch.json', 'golden-notch-top.json', 'golden-recess.json', 'golden-recess-band.json',
    'golden-notch-and-recess.json', 'golden-notch-end-panel.json', 'golden-recess-end-panel.json'];
  for (const f of files) {
    const g = JSON.parse(read(`fixtures/${f}`));
    assert.deepEqual(goldenOf(g.params, P), g.expected, `${f} is the engine's cut`);
    assert.match(g.meta.repinned, /^19\.10\.2026 \(chat fix, the owner's eye-test of T79\)/, `${f}: the re-pin says why`);
    assert.ok(g.meta.repinned.includes(OWNER), `${f}: the owner's words`);
    assert.equal(GATES.backRowsRoundTheBox.opens(g.params), true, `${f} opens the gate`);
  }
  assert.deepEqual(REPINNED.map((x) => x.file).sort(), files.map((f) => `fixtures/${f}`).sort());
  for (const { why } of REPINNED) assert.ok(why.includes(OWNER));
  const back = (f) => JSON.parse(read(`fixtures/${f}`)).expected.drills.find(([k]) => k === 'SCREWS_3MM|BACK')[1];
  assert.deepEqual(files.map(back), [10, 13, 10, 14, 6, 13, 13]);
  const extBack = (f) => (JSON.parse(read(`fixtures/${f}`)).expected.drills.find(([k]) => k === 'SCREWS_3MM|EXT-BACK') || [null, 0])[1];
  assert.deepEqual(['golden-recess.json', 'golden-recess-band.json', 'golden-notch-and-recess.json'].map(extBack), [12, 12, 12]);
  const base = JSON.parse(read('verify/t70/goldens-base.json'));
  const head = dump();
  for (const id of ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY']) assert.equal(head[id].sha256, base[id].sha256, id);
  assert.equal(GATES.backRowsRoundTheBox.opens(PARENT), false);
  assert.equal(LIVENESS.backRowsRoundTheBox().live, true, LIVENESS.backRowsRoundTheBox().said);
});
