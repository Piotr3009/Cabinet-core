/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T80 F4 · THE FRAME ON THE CNC (DXF, sheet, guards) ──────────────────────
//
// CLAUDE.md T80 F4: *"the frame board is an ordinary board with its openings
// as CUTOUT pockets (clockwise, cutout: true), the T25 F1.2 window mechanism,
// on the layers the back window uses; the off-board guard (Check #9), the
// edge guard and the drill guard hold as they are ... The label FRAME (or
// FRAME-1), the EDGE arrow (the sheet's bottom edge = the frame's bottom
// rail), the run's name, the part number through the project as every board
// ... a frame longer than the sheet chosen in the profile is the LISP's join
// (b), never a layout refusal ... the frame appears in the tree under the run
// (as the plinth does), its openings drawn, its label anchored by
// labelAnchor.js (a frame's centre is an opening, so the anchor moves to a
// stile)."*  Tests: the DXF fingerprint of the mockup run's frame, the guards
// green on it, the cut-outs clockwise and point for point the LISP's, the
// label on a stile, the note on the top rail, the arrow on the bottom rail,
// the join within the chosen sheet, the layout and the tree.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { joinLimit, runFrameParams } from '../src/engine/inframe.js';
import { buildUnitDxfFiles } from '../src/engine/cnc/dxf.js';
import { offBoardFindings } from '../src/engine/cnc/offBoardGuard.js';
import { unitFindings } from '../src/engine/cnc/exportGate.js';
import { layoutPanels } from '../src/engine/cnc/layout.js';
import { exportablePanels, groupOfPanel, groupPanels } from '../src/engine/cnc/groups.js';
import { dxfLabelsFor, edgeArrowGeometry, edgeArrowOf, labelKindOf, partNumberPlan } from '../src/engine/partNumbers.js';
import { slopeNoteText } from '../src/engine/cnc/partLabel.js';
import { loadLisp } from './lisp-mini.js';

const ROOT = new URL('../', import.meta.url).pathname;
const L = loadLisp(readFileSync(`${ROOT}reference/lisp/KIT_INFRAME.lsp`, 'utf8'));

/** 32-bit FNV-1a, scripts/cnc-fingerprint.mjs's own. */
function fingerprint(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

/** The mockup's run as the store hands it to the owner: END-L 18, BUD 600, BUD 800, BUDR2 500. */
function mockupRun(profile = P, extra = []) {
  const units = [['a', 'BUD', 0, 600, [{ id: 'ep', side: 'L', height: 'floor', thickness: 18 }]], ['b', 'BUD', 600, 800, []],
    ['c', 'BUDR2', 1400, 500, []], ...extra].map(([id, type, x, width, ends], i) => ({
    id, type, position: { wall: 0, x_mm: x, rotation_deg: 0 },
    params: { ...defaultParamsFor(type, profile), unit_num: ['01', '02', 'DR01', '04', '05', '06'][i], width, end_panels: ends },
  }));
  const el = runFrameParams(units, profile).get('a');
  return computeCabinet({ ...units[0].params, type: 'BUD', inframe: true, run_frame: el }, profile);
}

test('F4 · the DXF of the run\'s frame: its fingerprint, the outline, three cut-outs on the back window\'s layer, the label', () => {
  const r = mockupRun();
  const file = buildUnitDxfFiles(r, P).find((f) => f.panelId === 'FRAME');
  assert.equal(file.name, '01-FRAME.dxf');
  // Pinned on 22.10.2026; F11's golden carries the same number (golden-inframe-run.json).
  assert.equal(fingerprint(file.dxf), '70c1bd58', 'the FRAME file, byte for byte');
  const polys = file.entities.filter((e) => e.type === 'poly');
  assert.deepEqual(polys.map((e) => e.layer), ['OUTLINE', 'RECESS_WINDOW', 'RECESS_WINDOW', 'RECESS_WINDOW']);
  assert.deepEqual(polys[0].pts, [[0, 0], [1920, 0], [1920, 808], [0, 808]]);
  // Clockwise, and point for point the LISP's inframe-cutout (D10).
  const kit = L.call('inframe-frame', [[0, 600, 770, 0, 18], [600, 800, 770, 0, 18], [1400, 500, 770, 0, 18]], ['PANEL', 18], ['OPEN', 0]);
  polys.slice(1).forEach((p, i) => {
    assert.deepEqual(p.pts, L.call('inframe-cutout', kit[4][i]), `opening ${i + 1}`);
    const area = p.pts.reduce((s, [x, y], k) => { const [x2, y2] = p.pts[(k + 1) % p.pts.length]; return s + (x * y2 - x2 * y); }, 0);
    assert.ok(area < 0, `opening ${i + 1} is traced clockwise`);
  });
  const outlineArea = polys[0].pts.reduce((s, [x, y], k) => { const [x2, y2] = polys[0].pts[(k + 1) % 4]; return s + (x * y2 - x2 * y); }, 0);
  assert.ok(outlineArea > 0, 'the outline the other way round');
});

test('F4 · the guards hold as they are: the off-board guard, the edge guard, the drill guard and the export gate are green', () => {
  const r = mockupRun();
  const files = buildUnitDxfFiles(r, P);
  assert.deepEqual(offBoardFindings(files, r), [], 'Check #9: every entity on the board');
  assert.deepEqual(unitFindings(r, P), [], 'the export gate (edge, drill, off-board)');
});

test('F4 · the label: on a STILE (the frame\'s centre is an opening), numbered, the run\'s name on the top rail, the EDGE arrow on the bottom rail', () => {
  const r = mockupRun();
  const plan = partNumberPlan([{ id: 'a', unitNum: '01', panels: r.panels }], P);
  const files = buildUnitDxfFiles(r, P, { labels: dxfLabelsFor(plan, 'a') });
  const file = files.find((f) => f.panelId === 'FRAME');
  const texts = file.entities.filter((e) => e.type === 'text');
  const caption = texts.find((t) => /FRAME 1920x808$/.test(t.str));
  assert.match(caption.str, /^#\d\d 01 FRAME 1920x808$/, 'numbered through the project, as every board');
  assert.ok(caption.x > 600 && caption.x < 638, `the caption's anchor stands on the stile between 01 and 02 (x ${caption.x})`);
  assert.ok(caption.y > 38 && caption.y < 770);
  const note = texts.find((t) => t.str.startsWith('IN-FRAME RUN'));
  assert.equal(note.str, 'IN-FRAME RUN 01 02 DR01', 'the run\'s name');
  assert.ok(note.y - note.h / 2 > 770 && note.y + note.h / 2 < 808, 'the note stands in the top rail');
  const edge = texts.find((t) => t.str === 'EDGE');
  assert.ok(edge && edge.y + edge.h / 2 <= 38 && edge.y - edge.h / 2 >= 0, 'the word in the bottom rail');
  const arrow = edgeArrowGeometry(r.panels.find((p) => p.id === 'FRAME'), P, { textMm: 20 });
  assert.equal(arrow.arrow, 'down', 'the sheet\'s bottom edge = the frame\'s bottom rail');
  for (const line of arrow.lines) for (const [, y] of line) assert.ok(y >= 0 && y <= 38, 'the arrow on the rail');
  assert.equal(edgeArrowOf(r.panels.find((p) => p.id === 'FRAME')).arrow, 'down');
  assert.equal(labelKindOf(r.panels.find((p) => p.id === 'FRAME')), 'front', 'stickered with the fronts it is sprayed with');
});

test('F4 · joined: each piece says which of how many, its butt square at a stile', () => {
  const extra = [['d', 'BUD', 1900, 600, []], ['e', 'BUD', 2500, 600, []]];
  const r = mockupRun(P, extra);
  const boards = r.panels.filter((p) => p.role === 'frame');
  assert.deepEqual(boards.map((p) => p.id), ['FRAME-1', 'FRAME-2']);
  assert.deepEqual(boards.map((p) => slopeNoteText(p, { ascii: true })), [
    'IN-FRAME RUN 01 02 DR01 04 05; PIECE 1 OF 2 - SQUARE BUTT AT A STILE',
    'IN-FRAME RUN 01 02 DR01 04 05; PIECE 2 OF 2 - SQUARE BUTT AT A STILE',
  ]);
  const files = buildUnitDxfFiles(r, P);
  assert.deepEqual(offBoardFindings(files, r), []);
});

test('F4 · a frame longer than the chosen sheet is the LISP\'s join, never a layout refusal', () => {
  // The workshop's own sheet (cnc.sheet 2790 x 2060) bounds the owner's 2800 from below.
  assert.equal(joinLimit(P, 808), 2790);
  // A Standard 1220 x 2440 for the fronts: a 2700 run is cut into two boards, each within 2440.
  const std = migrateCabinetProfile({ ...P, cnc: { ...P.cnc, sheetFronts: { width: 1220, height: 2440 } } });
  assert.equal(joinLimit(std, 808), 2440);
  const extra = [['d', 'BUD', 1900, 800, []]];
  const r = mockupRun(std, extra);
  const boards = r.panels.filter((p) => p.role === 'frame');
  assert.equal(boards.length, 2);
  assert.ok(boards.every((p) => p.w <= 2440), boards.map((p) => p.w).join(' '));
  // A wardrobe-tall frame (2188) lies along the long side, so its pieces are bounded by the short one.
  assert.equal(joinLimit(P, 2188), 2060);
  // The layout takes every piece as any board.
  const panels = exportablePanels(r.panels);
  const lay = layoutPanels(panels, r.drills, { gap: P.cnc.layoutGap, rowWidth: P.cnc.layoutRowWidth });
  for (const b of boards) assert.ok(lay.places.some((p) => p.panel.id === b.id), `${b.id} is on the sheet`);
});

test('F4 · the tree: the frame stands in the fronts group under the run\'s owner, as the plinth stands under it', () => {
  const r = mockupRun();
  const frame = r.panels.find((p) => p.id === 'FRAME');
  assert.equal(groupOfPanel(frame), 'fronts');
  assert.ok(groupPanels(exportablePanels(r.panels)).get('fronts').some((p) => p.id === 'FRAME'));
  // A lay-on cabinet's groups are untouched.
  const plain = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01', plinth: true }, P);
  assert.equal(groupOfPanel(plain.panels.find((p) => p.id === 'PLINTH')), 'infills');
});
