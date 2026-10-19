/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── CHAT FIX 19.10.2026 · THE OFF-BOARD GUARD, AND WHAT IT FOUND ───────────
//
// The owner, 19.10.2026 (15:16): *"sprawdz dokladnie ale wiem ze czasami cnc
// rysuje items jak 3 mm drills czy cos takiego czy litery poza elementami, czy
// mozesz sie upewnic na milion procent ze wszystkie elementy sa zamkniete?"*
//
// PROBE first (scripts/chatfix-1910-offboard-probe.mjs): every kit at its
// defaults and the cut geometries of T75 to T79 through the real DXF writer,
// every entity asked whether it is on the board. It found three things, each
// fixed where it was wrong: the HOOD's hinge ladder (cups off a 367 door), the
// labels on a cut-out or a window (anchors read off the rectangle, not the
// outline), the BACK's side column through a recess bite (KIT_RECESS.lsp
// recess-side-row). Then the guard itself joined the export gate (Check #9's
// family), so the next one is a red row and not a surprise on the machine.
// These hold the guard to its law, the three fixes to their numbers, the probe
// to zero, and the gate to speaking.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  entityFindings, offBoardFindings, offBoardGateFindings, pointInPolygon, onEdge,
} from '../src/engine/cnc/offBoardGuard.js';
import {
  labelAnchors, onBoardPoint, roomAt, outlineBox, throughWindows,
} from '../src/engine/cnc/labelAnchor.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor, UNIT_TYPE_ORDER } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { buildUnitDxfFiles, panelEntities, panelNoteBlock } from '../src/engine/cnc/dxf.js';
import { unitFindings } from '../src/engine/cnc/exportGate.js';
import { hingeCentres } from '../src/engine/cabinet.js';
import { historyOpenMs } from '../src/engine/messages.js';
import * as X from '../src/engine/extension.js';
import { GATES, LIVENESS, REPINNED, LISP } from '../scripts/t78-classify.d/f38-owner-1910d.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const OWNER = 'czasami cnc rysuje items jak 3 mm drills czy cos takiego czy litery poza elementami';

const kit = (type, extra = {}) => ({ ...defaultParamsFor(type, P), unit_num: '01', ...extra });
const cut = (type, extra = {}) => computeCabinet(kit(type, extra), P);
const panelOf = (r, id) => r.panels.find((p) => p.id === id);
const RECT = [[0, 0], [600, 0], [600, 770], [0, 770]];
const outline = (pts = RECT) => ({ type: 'poly', layer: 'OUTLINE', closed: true, pts });

// ═══ THE GUARD'S LAW: ENTITIES IN, FINDINGS OUT ═════════════════════════════

test('a board with everything on it: no finding; the outline must be ONE closed loop of finite points', () => {
  const ok = [outline(), { type: 'circle', layer: 'SCREWS_3MM', cx: 50, cy: 9, r: 1.5 },
    { type: 'text', layer: 'UNIT_NUMBER', x: 300, y: 385, h: 16, str: '01 BACK' },
    { type: 'poly', layer: 'CORNER_4MM', closed: false, pts: [[386, 360], [386, 400], [426, 400]] }];
  assert.deepEqual(entityFindings(ok, { panelId: 'BACK' }), []);
  assert.deepEqual(entityFindings([], { panelId: 'X' }).map((f) => f.code), ['outline-count']);
  assert.deepEqual(entityFindings([outline(), outline()], { panelId: 'X' }).map((f) => f.code), ['outline-count']);
  assert.deepEqual(entityFindings([{ ...outline(), closed: false }], { panelId: 'X' }).map((f) => f.code), ['outline-open']);
  assert.deepEqual(entityFindings([outline([[0, 0], [600, 0]])], { panelId: 'X' }).map((f) => f.code), ['outline-too-few-points']);
  assert.deepEqual(entityFindings([outline([[0, 0], [600, 0], [NaN, 770], [0, 770]])], { panelId: 'X' }).map((f) => f.code), ['outline-nan']);
  assert.equal(pointInPolygon(300, 385, RECT), true);
  assert.equal(pointInPolygon(600, 385, RECT), true, 'ON the edge counts as on the board');
  assert.equal(pointInPolygon(600.1, 385, RECT), false);
  assert.equal(onEdge(600.005, 385, RECT), true);
});

test('a hole off the board, a hole breaking the edge, a text off the board, a mark off the board: each named, with its place', () => {
  const f = (e) => entityFindings([outline(), e], { panelId: 'BACK' });
  assert.deepEqual(f({ type: 'circle', layer: 'SCREWS_3MM', cx: 591, cy: -13, r: 1.5 }).map((x) => x.code), ['hole-off-board']);
  assert.match(f({ type: 'circle', layer: 'SCREWS_3MM', cx: 591, cy: -13, r: 1.5 })[0].message, /BACK: a dia 3 hole on SCREWS_3MM at \(591, -13\) is off the board/);
  assert.deepEqual(f({ type: 'circle', layer: 'FRONT_HINGES_35MM', cx: 600 - 10, cy: 100, r: 17.5 }).map((x) => x.code), ['hole-breaks-edge']);
  assert.deepEqual(f({ type: 'circle', layer: 'FRONT_HINGES_35MM', cx: 600 - 17.5, cy: 100, r: 17.5 }), [], 'tangent to the edge is on the board (EPS)');
  assert.deepEqual(f({ type: 'text', layer: 'UNIT_NUMBER', x: 300, y: 790, h: 16, str: 'OVERSIZE' }).map((x) => x.code), ['text-off-board']);
  assert.deepEqual(f({ type: 'text', layer: 'UNIT_NUMBER', x: NaN, y: 10, h: 16, str: 'x' }).map((x) => x.code), ['text-nan']);
  assert.deepEqual(f({ type: 'poly', layer: 'CORNER_4MM', closed: false, pts: [[-5, 10], [0, 10], [0, 50]] }).map((x) => x.code), ['line-off-board']);
  assert.deepEqual(f({ type: 'arc', layer: 'X', cx: -5, cy: 5, r: 2 }).map((x) => x.code), ['arc-off-board']);
});

test('a pocket may BREAK the edge by design (a socket, a dog bone, a drawer groove) and never lie wholly off the board; a through window keeps holes and texts out of it', () => {
  const f = (e, through = new Set()) => entityFindings([outline(), e], { panelId: 'BUL', throughPocketLayers: through });
  // The puzzle socket runs 6 past the edge: on the board.
  assert.deepEqual(f({ type: 'poly', layer: 'SOCKET', closed: true, pts: [[95 - 9, -6], [95 + 9, -6], [95 + 9, 9], [95 - 9, 9]] }), []);
  // A drawer side's groove runs off BOTH ends: on the board (its middle is).
  assert.deepEqual(f({ type: 'poly', layer: 'GROOVE', closed: true, pts: [[-6, 20], [606, 20], [606, 24], [-6, 24]] }), []);
  // Wholly off: no corner on the board, its centre off it, no board corner inside it.
  assert.deepEqual(f({ type: 'poly', layer: 'POCKET', closed: true, pts: [[-40, 10], [-20, 10], [-20, 30], [-40, 30]] }).map((x) => x.code), ['pocket-off-board']);
  // A window (a through pocket) is a hole in the board: a text in it is off the board, a hole in it too.
  const win = { type: 'poly', layer: 'RECESS_WINDOW', closed: true, pts: [[100, 100], [400, 100], [400, 500], [100, 500]] };
  assert.deepEqual(entityFindings([outline(), win, { type: 'text', layer: 'UNIT_NUMBER', x: 250, y: 300, h: 16, str: 'in the window' }],
    { panelId: 'BACK', throughPocketLayers: new Set(['RECESS_WINDOW']) }).map((x) => x.code), ['text-off-board']);
  assert.deepEqual(entityFindings([outline(), win, { type: 'circle', layer: 'SCREWS_3MM', cx: 250, cy: 300, r: 1.5 }],
    { panelId: 'BACK', throughPocketLayers: new Set(['RECESS_WINDOW']) }).map((x) => x.code), ['hole-off-board']);
  // A window with a corner off the board is a finding of its own.
  assert.deepEqual(entityFindings([outline(), { ...win, pts: [[500, 100], [700, 100], [700, 500], [500, 500]] }],
    { panelId: 'BACK', throughPocketLayers: new Set(['RECESS_WINDOW']) }).map((x) => x.code), ['pocket-off-board']);
});

// ═══ WHERE A LABEL STANDS ═══════════════════════════════════════════════════

test('labelAnchors: a rectangle\'s anchors are what they were (w / 2, h / 2; h - size * 1.2); a strip or a window moves them onto the board', () => {
  const rect = { w: 600, h: 770, cnc: { outline: RECT } };
  assert.deepEqual(labelAnchors(rect, { captionH: 16, noteSize: 10 }), { caption: [300, 385], note: [300, 758], noteCentre: [300, 758], box: [0, 0, 600, 770] });
  assert.deepEqual(labelAnchors({ w: 600, h: 770 }, { noteSize: 10 }).caption, [300, 385], 'no outline: w / h');
  // The dishwasher plinth's strip: the rectangle's middle (y 50) is the cut-out; the caption goes onto the strip.
  const strip = { w: 600, h: 100, cnc: { outline: [[0, 80], [600, 80], [600, 100], [0, 100]] } };
  const a = labelAnchors(strip, { captionH: 8, noteSize: 6 });
  assert.ok(a.caption[1] > 80 && a.caption[1] < 100, `the caption on the strip (${a.caption})`);
  assert.ok(roomAt(a.caption[0], a.caption[1], strip.cnc.outline) >= 0);
  // A window in the middle of a back: the caption steps out of it.
  const back = { w: 600, h: 770, thickness: 18, cnc: { outline: RECT, pockets: [{ layer: 'RECESS_WINDOW', x1: 110, y1: 210, x2: 490, y2: 590, depth: 18 }] } };
  assert.deepEqual(throughWindows(back), [[[110, 210], [490, 210], [490, 590], [110, 590]]]);
  const b = labelAnchors(back, { captionH: 20 });
  assert.equal(roomAt(300, 385, back.cnc.outline, throughWindows(back)), -1, 'the middle is the window');
  assert.ok(roomAt(b.caption[0], b.caption[1], back.cnc.outline, throughWindows(back)) >= 0, `moved onto the board (${b.caption})`);
  assert.ok(b.caption[1] < 210 || b.caption[1] > 590 || b.caption[0] < 110 || b.caption[0] > 490, 'out of the window');
  // A pocket that is not through (a 6 deep groove) is no window.
  assert.deepEqual(throughWindows({ ...back, cnc: { ...back.cnc, pockets: [{ ...back.cnc.pockets[0], depth: 6 }] } }), []);
  assert.deepEqual(outlineBox([[10, 5], [50, 5], [50, 40], [10, 40]]), [10, 5, 50, 40]);
  assert.deepEqual(onBoardPoint(300, 385, RECT, [], 8), [300, 385]);
  // A four-line note on a 140 board: the FIRST line is lifted so the last stays on the board.
  const short = { w: 640, h: 140, cnc: { outline: [[0, 0], [640, 0], [640, 140], [0, 140]] } };
  const n = labelAnchors(short, { noteSize: 25, noteBlockH: 25 + 3 * 31 });
  assert.ok(n.note[1] - 3 * 31 >= 12.5, `the last line on the board (first at ${n.note[1]})`);
  assert.ok(n.note[1] <= 140 - 12.5);
  assert.equal(n.noteCentre[1], n.note[1] - (3 * 31) / 2);
});

test('the DXF note is sized in the OUTLINE\'s box and stands on the board: the dishwasher plinth, the glass door, a back with a window', () => {
  const dw = cut('DW_PANEL', { plinth: true });
  const pl = panelOf(dw, 'PLINTH');
  const note = panelNoteBlock(pl, { profile: P, ascii: true });
  assert.ok(note.visible && note.lines.length <= 2, `the note fits the 40 mm strip in ${note.lines.length} line(s)`);
  const texts = panelEntities(pl, dw.drills, { unitNum: '01', profile: P }).filter((e) => e.type === 'text');
  assert.ok(texts.length >= 3);
  for (const t of texts) assert.ok(t.y >= 100 && t.y <= 140, `${t.str} at y ${t.y} is on the strip`);
  // A back with a recess window (CASE B of KIT_RECESS.lsp): both lines of its caption are out of the window.
  const b = cut('BUD', { shelves: 1, extension: { x0: 110, x1: 490, z0: 210, z1: 590, d: 150 } });
  const back = panelOf(b, 'BACK');
  const win = throughWindows(back);
  assert.equal(win.length, 1, 'the window is a through pocket');
  for (const t of panelEntities(back, b.drills, { unitNum: '01', profile: P }).filter((e) => e.type === 'text')) {
    assert.ok(roomAt(t.x, t.y, back.cnc.outline, win) >= 0, `${t.str} at (${t.x}, ${t.y}) is on the board`);
  }
});

// ═══ WHAT THE PROBE FOUND, FIXED ═══════════════════════════════════════════

test('the HOOD: a SHORT door above its aperture, the low ladder over its own height lifted by the aperture; the cups on the door', () => {
  for (const type of ['WUD_HOOD', 'WUD_HOOD_SHORT']) {
    const r = cut(type);
    const door = r.panels.find((p) => p.role === 'front');
    const aperture = Number(defaultParamsFor(type, P).hood_aperture_mm) || 0;
    assert.ok(aperture > 0, `${type} has an aperture`);
    assert.equal(door.h, r.params.height - aperture - 3, `${type}: the door stands above the aperture`);
    const cups = r.drills.filter((d) => d.panel === door.id && d.kind === 'cup').map((d) => d.y).sort((x, y) => x - y);
    assert.deepEqual(cups, hingeCentres(door.h, P.hinges.rules.low, P), `${type}: the low ladder over the door's own height`);
    for (const y of cups) assert.ok(y > 17.5 && y < door.h - 17.5, `${type}: the cup at ${y} is on the ${door.h} door`);
    assert.deepEqual(r.drillSummary.hinge_centers, cups.map((c) => Math.round((c + aperture) * 10000) / 10000), `${type}: the plates in the carcass frame`);
    assert.deepEqual(offBoardFindings(buildUnitDxfFiles(r, P), r), [], `${type}: nothing off the board`);
  }
  const hood = cut('WUD_HOOD');
  assert.deepEqual(hood.drillSummary.hinge_centers, [450, 617]);
  assert.equal(GATES.hoodLadder.opens(kit('WUD_HOOD')), true);
  assert.equal(GATES.hoodLadder.opens(kit('WUD')), false);
  assert.equal(LIVENESS.hoodLadder().live, true, LIVENESS.hoodLadder().said);
  assert.ok(REPINNED.some((x) => x.file === 'fixtures/golden-hood-short.json' && x.why.includes(OWNER)));
});

test('the BACK\'s side column keeps off a recess BITE (KIT_RECESS.lsp recess-side-row amended): the window takes the edge wherever the band reaches that side', () => {
  // The LISP's own answer: a side the band reaches, no notch: the window cuts the run.
  // (the BACK's window for the band 310..600 x 210..590 is 328..600 x 228..572: the FLOOR and the LID stand in the g)
  assert.deepEqual(X.recessSideRow(770, 0, [95, 385, 675], null, [328, 228, 600, 572], false, true, 50), [50, 178, 622, 720]);
  assert.deepEqual(X.recessSideRow(770, 0, [95, 385, 675], null, [328, 228, 600, 572], false, false, 50), [50, 240, 530, 720], 'a side the band does not reach: the one run, as it always was');
  const r = cut('BUD', { shelves: 1, extension: { x0: 310, x1: 600, z0: 210, z1: 590, d: 150 } });
  const col = r.drills.filter((d) => d.panel === 'BACK' && d.layer === 'SCREWS_3MM' && d.x === 591).map((d) => d.y).sort((a, b) => a - b);
  assert.deepEqual(col, [50, 178, 622, 720], 'was 50, 392.5 (in the bite), 720');
  const left = r.drills.filter((d) => d.panel === 'BACK' && d.layer === 'SCREWS_3MM' && d.x === 9).map((d) => d.y).sort((a, b) => a - b);
  assert.deepEqual(left, [50, 240, 530, 720], 'the other side untouched');
  assert.deepEqual(offBoardFindings(buildUnitDxfFiles(r, P), r), []);
  assert.equal(GATES.recessBite.opens(kit('BUD', { extension: { x0: 310, x1: 600, z0: 210, z1: 590, d: 150 } })), true);
  assert.equal(GATES.recessBite.opens(kit('BUD', { extension: { x0: 110, x1: 490, z0: 210, z1: 590, d: 150 } })), false, 'a window inside the back');
  assert.equal(GATES.recessBite.opens(kit('BUD', { extension: { x0: 310, x1: 600, z0: 0, z1: 770, d: 150 } })), false, 'a band over the whole height');
  assert.equal(LIVENESS.recessBite().live, true, LIVENESS.recessBite().said);
  const lisp = read('reference/lisp/KIT_RECESS.lsp');
  assert.ok(lisp.includes('AMENDED 19.10.2026 (chat fix), the owner: *"czasami cnc rysuje items jak'));
  assert.ok(LISP['reference/lisp/KIT_RECESS.lsp'].includes(OWNER));
});

// ═══ THE PROBE AT ZERO, THE GATE SPEAKING ═══════════════════════════════════

test('the probe: every kit at its defaults and the cut geometries of T75 to T79 draw nothing off the board', () => {
  const cases = UNIT_TYPE_ORDER.map((t) => kit(t));
  const BUD = kit('BUD', { shelves: 1, front_t: 25, hinge: 'L' });
  cases.push({ ...BUD, notch: { corner: 'BL', w: 200, d: 200, h: 0 } });
  cases.push({ ...BUD, notch: { corner: 'BL', w: 200, d: 200, h: 300 } });
  cases.push({ ...BUD, notch: { corner: 'BL', w: 200, d: 200, h: -300 } });
  cases.push({ ...BUD, notch: { corner: 'FR', w: 200, d: 200, h: 300 } });
  for (const edge of ['TB', 'BB', 'TF', 'BF']) cases.push({ ...BUD, edgeNotch: { edge, d: 20, h: 120 } });
  cases.push({ ...BUD, extension: { x0: 310, x1: 600, z0: 0, z1: 770, d: 150 } });
  cases.push({ ...BUD, extension: { x0: 110, x1: 490, z0: 210, z1: 590, d: 150 } });
  cases.push({ ...BUD, extension: { x0: 310, x1: 600, z0: 210, z1: 590, d: 150 } });
  cases.push({ ...BUD, notch: { corner: 'BL', w: 200, d: 200, h: 0 }, extension: { x0: 310, x1: 600, z0: 0, z1: 770, d: 150 } });
  cases.push({ ...BUD, plinth: true, end_panels: [{ side: 'L', height: 'floor' }, { side: 'R', height: 'floor' }] });
  cases.push({ ...BUD, notch: { corner: 'BL', w: 200, d: 200, h: 300 }, end_panels: [{ side: 'L', height: 'floor' }] });
  cases.push({ ...BUD, edgeNotch: { edge: 'BB', d: 20, h: 120 }, end_panels: [{ side: 'L', height: 'floor' }, { side: 'R', height: 'floor' }] });
  cases.push(kit('DW_PANEL', { plinth: true }));
  cases.push(kit('WARDROBE', { sections: [{ width_mm: 600, items: [{ id: 's1', kind: 'shelf', pos_mm: 1200 }, { id: 'd1', kind: 'drawer', height_mm: 200, mount: 'overlay' }, { id: 'h1', kind: 'hanger', pos_mm: 1400, datum: 'bottom', mount: 'alone' }] }] }));
  let files = 0;
  const rows = [];
  for (const params of cases) {
    const r = computeCabinet(params, P);
    const dxf = buildUnitDxfFiles(r, P);
    files += dxf.length;
    rows.push(...offBoardFindings(dxf, r).map((f) => `${params.type}: ${f.message}`));
    assert.deepEqual(unitFindings(r, { profile: P }).filter((f) => f.check === 9 && f.code), [], `${params.type}: the gate's Check #9 is quiet`);
  }
  assert.ok(files > 300, `${files} files written`);
  assert.deepEqual(rows, []);
});

test('the gate SPEAKS (rule 4): a hole doctored off a board is a red Check #9 row with its place; the guard never moves a cut', () => {
  const r = cut('BUD', { shelves: 1 });
  const before = JSON.stringify(r.panels.map((p) => p.cnc));
  const bad = { ...r, drills: [...r.drills, { panel: 'BACK', kind: 'screw', layer: 'SCREWS_3MM', x: 591, y: -13, d: 3 }] };
  const found = offBoardGateFindings(bad, { profile: P, unitId: 'u1', unitNum: '01', panelEntities });
  assert.equal(found.length, 1);
  assert.deepEqual([found[0].check, found[0].level, found[0].panel, found[0].code], [9, 'red', 'BACK', 'hole-off-board']);
  assert.match(found[0].message, /^01 BACK: a dia 3 hole on SCREWS_3MM at \(591, -13\) is off the board$/);
  const viaGate = unitFindings(bad, { profile: P });
  assert.ok(viaGate.some((f) => f.check === 9 && f.code === 'hole-off-board'), 'the export gate carries it');
  assert.equal(JSON.stringify(r.panels.map((p) => p.cnc)), before, 'nothing was fixed in place');
  assert.deepEqual(offBoardGateFindings(r, { profile: P, panelEntities }), []);
  assert.deepEqual(offBoardGateFindings(r, { profile: P }), [], 'no entity builder, nothing to say');
});

// ═══ THE CHANGES LIST CLOSES ITSELF ════════════════════════════════════════

test('the Changes list closes itself after historyOpenMs (the owner: "czy mozemy za jakis czas zamknac? bo za bardzo przeszkadza")', () => {
  assert.equal(P.ui.messages.historyOpenMs, 10000, 'the number lives in the profile, PROPOSED');
  assert.equal(historyOpenMs(P), 10000);
  assert.equal(historyOpenMs({}), 10000, 'a stored profile from before tonight');
  assert.equal(historyOpenMs({ ui: { messages: { historyOpenMs: 4000 } } }), 4000);
  const src = read('src/components/Messages.jsx');
  assert.match(src, /setTimeout\(closeHistory, historyOpenMs\(getCabinetProfile\(\)\)\)/, 'the PRO history bar arms the clock when it opens');
  assert.match(src, /clearTimeout\(t\)/, 'and disarms it when it closes');
});
