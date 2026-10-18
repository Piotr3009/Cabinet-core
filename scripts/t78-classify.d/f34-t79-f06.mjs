/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T79 F6 · THE DIA 3 ROWS ON THE BACK ARE NOT LOST TO A NOTCH OR A RECESS. CLAUDE.md T79 PART C, the owner's list of
// 18.10.2026: *"jak mamy cut the corners lub recess to nie rysujesz mi dziurek na śrubki 3 mm, to trzeba będzie dodać"*;
// 14:17: *"ale tylko na plecach."*  THE PROBE (verify/t79/f06-probe.md, HEAD 14b6fd1): the BACK has 10 dia 3 holes
// instead of 14 with BL or BR full (D10 of 17.10 dropped the column into the RETURN's end), 13 with a part-height notch
// either way (the run beside it and the edge over / under it carry none), 10 in the recess CASE A (13 until 17.10), the
// parent's 14 in CASE B (26 until 17.10), every EXT-BACK 0 (stated until 17.10, never drilled). LISP first: KIT_NOTCH.lsp
// D10 and KIT_RECESS.lsp D17 AMENDED under the owner's licence, their NUMBERS (KIT_NOTCH I and the new I5, I2's BACK
// rows; KIT_RECESS CASE A and CASE B): the dia 3 rows on a back follow EVERY edge of the back that meets a board. The
// box boards (STEP, RETURN, LID, FLOOR, RETURN-L, RETURN-R, the recess FLOOR and LID) still state nothing; BUL and BUR
// keep their 6 / 6. The gate is the notch at a back corner or the extension: a unit with neither reaches no changed
// line, so the six and every other golden hold byte for byte.
//
// fixtures/t75-wardrobe-corner.json is NOT re-pinned here: it holds the store's INPUT ({ project, units }, written by
// scripts/t75-fixtures.mjs), not the engine's cut, so F6 moves none of its bytes (its notched wardrobe's BACK is cut
// with 14 dia 3 holes again when the project is computed, and no file pins that count). Its drift against the base
// (corner_doors) is T78 F10's, named in f10.mjs.

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';
import { panelPlacement } from '../../src/engine/joinery.js';

const OWNER = '*"jak mamy cut the corners lub recess to nie rysujesz mi dziurek na śrubki 3 mm, to trzeba będzie dodać"*; '
  + '14:17: *"ale tylko na plecach."*';
const kit = (type, extra = {}) => ({ ...defaultParamsFor(type, P), unit_num: '01', ...extra });
const screwsOn = (r, id) => r.drills.filter((d) => d.panel === id && d.kind === 'screw');

export const GATES = {
  backRowsRoundTheBox: {
    what: 'a unit whose BACK meets a board the carcass does not have: a corner notch at a BACK corner (`params.notch.corner` '
      + 'BL or BR: the RETURN, the LID, the FLOOR behind its notched edges) or a recess extension (`params.extension`: '
      + 'RETURN-L, RETURN-R, the FLOOR and the LID behind the window, and the EXT-BACK, a back of its own). Opens on '
      + 'nothing else; a front notch (FL, FR) never reaches the BACK',
    opens: (p) => (Boolean(p?.notch) && typeof p.notch === 'object' && /^B[LR]$/.test(String(p.notch.corner || '')))
      || (Boolean(p?.extension) && typeof p.extension === 'object'),
  },
};

export const LICENSED = {
  'src/engine/notch.js': {
    why: 'T79 F6 · KIT_NOTCH.lsp D10 AMENDED mirrored: notchEdgeRow (THE BACK SCREW ROW over a run a .. b of the BACK\'s '
      + 'edge, [] under one hole\'s offset); notchBackJoints draws the nearX column into the RETURN\'s end again at full '
      + 'height (the side\'s row moved by nw, between the parent\'s tabs), and beside a part-height notch the run into the '
      + 'RETURN\'s end plus the row over it into the LID\'s back edge (D21: under it, into the FLOOR\'s); SHORT names a run '
      + 'too short for a row; notchCarcass carries it as cut.backRowsShort and notchSummary as derived.notch.backRowsShort. '
      + 'The rows into the box are ONE routine, notchBackBoxRows (KIT_NOTCH.lsp notch-back-box-rows), which notchBackJoints '
      + 'draws on the notched BACK and extension.js recessBackJoints (F8, KIT_RECESS.lsp D13) on the extension\'s BACK piece '
      + 'that holds them: the F6 x F8 seam, every answer of notchBackJoints unchanged by it. '
      + `The box boards' *Screws routines still answer null. ${OWNER}`,
    gates: ['backRowsRoundTheBox'],
  },
  'src/engine/extension.js': {
    why: 'T79 F6 · KIT_RECESS.lsp D17 AMENDED mirrored: recessBackJoints draws the rows S outside each window edge a board '
      + 'stands behind again (a column into RETURN-L\'s / RETURN-R\'s front end over bz0 .. bz1, a row into the FLOOR\'s / '
      + 'the LID\'s front edge over wx0 .. wx1, notchEdgeRow); recessExtBackScrews answers the EXT-BACK\'s rows round the '
      + 'band (its horizontal rows THE BACK SCREW ROW over g .. w - g: drawBACK\'s row on every run over 2 x screwFromEnd, two '
      + 'at the quarters at exactly minInterior, never three holes in one place); extensionCarcass DRILLS them on the EXT-BACK (dia 3, the puzzle\'s screw layer), which is a cut part now (no '
      + `readiness 'geometry', no fixing 'manual'); RETURN-L, RETURN-R, the FLOOR and the LID unchanged. ${OWNER}`,
    gates: ['backRowsRoundTheBox'],
  },
  'src/engine/joinery.js': {
    why: 'T79 F6 · panelPlacement gives the recess EXT-BACK (part RECESS-BACK, drawn upright) the BACK\'s own frame, so '
      + 'the X-ray DrillRings and the machined solid draw its dia 3 rows where they are cut. Only a unit with an '
      + `extension has a RECESS-BACK. ${OWNER}`,
    gates: ['backRowsRoundTheBox'],
  },
};

export const LIVENESS = {
  // KIT_NOTCH.lsp I5 and KIT_RECESS.lsp CASE B: the BACK with BL full carries 14 (the column into the RETURN at own x 9),
  // the recess window's BACK 26 and its EXT-BACK 12, drilled and placed; the same BUD without either keeps its 14.
  backRowsRoundTheBox: () => {
    const full = computeCabinet(kit('BUD', { shelves: 1, front_t: 25, hinge: 'L', notch: { corner: 'BL', w: 200, d: 200, h: 0 } }), P);
    const win = computeCabinet(kit('BUD', { shelves: 1, front_t: 25, hinge: 'L', extension: { x0: 110, x1: 490, z0: 210, z1: 590, d: 150 } }), P);
    const plain = computeCabinet(kit('BUD', { shelves: 1, front_t: 25, hinge: 'L' }), P);
    const nearCol = screwsOn(full, 'BACK').filter((d) => d.x === 9).map((d) => d.y);
    const eb = win.panels.find((p) => p.id === 'EXT-BACK');
    const live = screwsOn(full, 'BACK').length === 14 && nearCol.join(' ') === '50 240 530 720'
      && screwsOn(win, 'BACK').length === 26 && screwsOn(win, 'EXT-BACK').length === 12
      && Boolean(panelPlacement(eb)) && eb?.meta?.readiness == null && screwsOn(plain, 'BACK').length === 14
      && ['RETURN', 'STEP'].every((id) => screwsOn(full, id).length === 0)
      && ['RETURN-L', 'RETURN-R', 'FLOOR', 'LID'].every((id) => screwsOn(win, id).length === 0);
    return {
      live,
      said: `BUD 600 with BL 200 / 200 / 0: the BACK ${screwsOn(full, 'BACK').length} dia 3 (the RETURN's column at own x 9: `
        + `${nearCol.join(' ') || 'none'}); with the window 110..490 x 210..590: the BACK ${screwsOn(win, 'BACK').length}, the `
        + `EXT-BACK ${screwsOn(win, 'EXT-BACK').length} (placed: ${Boolean(panelPlacement(eb))}, readiness ${eb?.meta?.readiness ?? 'cut'}); `
        + `the box boards ${['RETURN', 'STEP'].map((id) => screwsOn(full, id).length).join(' / ')} and `
        + `${['RETURN-L', 'RETURN-R', 'FLOOR', 'LID'].map((id) => screwsOn(win, id).length).join(' / ')}; the plain BUD `
        + `${screwsOn(plain, 'BACK').length}`,
    };
  },
};

// No new golden: F6 adds no cut geometry, it puts holes back on the backs. The goldens it moves, knowingly:
export const REPINNED = [
  {
    file: 'fixtures/golden-notch.json',
    why: `T79 F6 · KIT_NOTCH.lsp D10 AMENDED: the BACK's row on its notched edge into the RETURN's end (own x 9, y 50 240 `
      + `530 720) is back (SCREWS_3MM|BACK 10 -> 14, the BACK's holes 24 -> 28); the box boards, the outlines and every other `
      + `drilling unchanged. ${OWNER}`,
  },
  {
    file: 'fixtures/golden-notch-top.json',
    why: `T79 F6 · KIT_NOTCH.lsp D10 AMENDED (I2's BACK rows, I5): beside the notch from the top the row into the RETURN's `
      + `end (x 209, y 520 620 720), under it the row into the FLOOR's back edge (y 461, x 68 109 150) (SCREWS_3MM|BACK 13 -> `
      + `19, the BACK's holes 31 -> 37); the box boards and every other drilling unchanged. ${OWNER}`,
  },
  {
    file: 'fixtures/golden-recess.json',
    why: `T79 F6 · KIT_RECESS.lsp D17 AMENDED (CASE A): the column through the BACK into RETURN-L's end is back (x 319, z 50 `
      + `385 720; SCREWS_3MM|BACK 10 -> 13, the BACK's holes 24 -> 27) and the EXT-BACK, a back, is drilled round the band `
      + `(SCREWS_3MM|EXT-BACK 0 -> 12, its holes 0 -> 12, readiness geometry -> cut); RETURN-L unchanged. ${OWNER}`,
  },
  {
    file: 'fixtures/golden-recess-band.json',
    why: `T79 F6 · KIT_RECESS.lsp D17 AMENDED (CASE B): the twelve rows round the window (into RETURN-L, RETURN-R, the FLOOR `
      + `and the LID) are back (SCREWS_3MM|BACK 14 -> 26, the BACK's holes 34 -> 46) and the EXT-BACK is drilled round the `
      + `band (SCREWS_3MM|EXT-BACK 0 -> 12, its holes 0 -> 12, readiness geometry -> cut); RETURN-L, RETURN-R, the FLOOR and `
      + `the LID unchanged. ${OWNER}`,
  },
];

export const LISP = {
  'reference/lisp/KIT_NOTCH.lsp': `Owner 18.10.2026 (CLAUDE.md T79 F6): D10 AMENDED. ${OWNER} The 17.10 removal is reversed on `
    + 'the BACK only: notch-edge-row (THE BACK SCREW ROW over a run, nil under one hole\'s offset); notch-back-joints draws '
    + 'the nearX column at full height again, and beside a part-height notch the RETURN\'s run and the row into the LID\'s '
    + '(D21: the FLOOR\'s) back edge, SHORT naming a run too short for a row; the command says the BACK\'s dia 3 count and '
    + 'every SHORT run; sections 2 and 3 (D10), the NUMBERS block I, I2\'s BACK rows and the new I5 (six notches, board by '
    + 'board). The box boards\' *-screws still answer nil. The F6 x F8 seam: the rows into the box are ONE routine, '
    + 'notch-back-box-rows (the RETURN\'s column at full height, the RETURN\'s run and the LID\'s, D21 the FLOOR\'s, row at '
    + 'part height, SHORT), which notch-back-joints draws (every answer as it was) and KIT_RECESS.lsp recess-back-joints draws '
    + 'on the extension\'s BACK piece that holds them (D13, recess-notch-box-rows); D10\'s text and I5 name it. (D21, the '
    + 'notch from the top, is F4\'s: f34-t79-f04.mjs)',
  'reference/lisp/KIT_RECESS.lsp': `Owner 18.10.2026 (CLAUDE.md T79 F6): D17 AMENDED. ${OWNER} The 17.10 removal is reversed `
    + 'on the backs only: recess-back-joints draws the rows S outside each window edge a board stands behind again '
    + '(notch-edge-row), recess-ext-back-screws answers the EXT-BACK\'s rows round the band (notch-edge-row on every run, '
    + 'its horizontal rows over g .. w - g) and the command draws them; sections 1, 2 (the EXT-BACK a cut part), D11, D17 '
    + 'and the NUMBERS of CASE A, CASE B and THE NARROWEST BAND (every run 100, two holes each). recess-return-screws and '
    + 'recess-lid-screws still answer nil',
};
