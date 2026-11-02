/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// After T-CC2a . the owner's decision of 01.11.2026 (23:04 to 23:14), on his screenshot of a wardrobe under a sloped
// ceiling whose slope crosses the cabinet's height: the roof is a sloped board and a flat one meeting at a KNEE, and
// they met where their TOP faces meet, leaving a 5.5 mm step INSIDE. *"wyrownanie edga musi byc od srodka, nie od
// zewnatrz, wiec automatycznie skosna plyta bedzie troszeczke dluzsza ... i dostosuj tez plecy"*; *"wariant B,
// koduj"*; *"plecy musza sie zgadzac, inaczej beda sie ludzie martwili, ze sa za krotkie i co nie dziala"*.
// LISP FIRST (SKYLON_COMMON.lsp: the law beside "ONE BOARD PER SEGMENT", SKY:roofTopAt, SKY:roofKneeX,
// SKY:roofBoards at the knee, SKY:roofBackTopPts, SKY:roofBackPts, SKY:drawRoofBack), then engine/puzzle.js and
// engine/cabinet.js. WHAT MOVES: only a cabinet whose roof has TWO OR MORE boards (a knee), on the slope road: the
// boundary of two roof boards is where their UNDERSIDES meet (convex, flat then slope: the knee + G * tan(beta / 2)
// along the slope; WARDROBE 1000 x 2150 under (0,1700) to (1000,2539): TOP-1 blank 796.4623 to 805.0134, TOP-2
// 401.4139 to 394.8631); the sides and dividers stop under the boards' own lines (the inside flush); the BACK takes the
// step the two board ends make (its blank as tall as the sloped board's corner, 2150 to 2155.4962). A cabinet with no
// slope, or with one roof board, reaches the changed lines through expressions that are the old ones to the bit. No
// golden carries a slope: the six, T75's 16 and T78's 52 are IDENTICAL, nothing re-pinned.

import { computeCabinet } from '../../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';
import { defaultParamsFor } from '../../src/engine/types.js';

const OWNER = '*"wyrownanie edga musi byc od srodka, nie od zewnatrz, wiec automatycznie skosna plyta bedzie troszeczke '
  + 'dluzsza ... i dostosuj tez plecy"*; *"wariant B, koduj"*; *"plecy musza sie zgadzac, inaczej beda sie ludzie '
  + 'martwili, ze sa za krotkie i co nie dziala"* (the owner, 01.11.2026)';

/** A job under a sloped ceiling: the only road the changed lines stand on. */
const sloped = (p) => Boolean(p?.slope_cut)
  || (Array.isArray(p?.units) && p.units.some((u) => sloped(u?.params || u)));

export const GATES = {
  slopeKnee: {
    what: 'a job under a sloped ceiling (params.slope_cut): where its roof has two or more boards the boundary moves to '
      + 'the meeting of the undersides and the BACK steps with them; one board, or no slope, reaches no changed value',
    opens: (p) => sloped(p),
  },
};

export const LICENSED = {
  'src/engine/puzzle.js': {
    why: `Owner 01.11.2026, the knee: roofBoards puts the boundary of two boards where their undersides meet (roofKneeX, `
      + `held inside the pair; an unmoved end is the vertex it was, to the bit); roofBoardTopAt, roofKneeSteps, `
      + `roofStepHeightAt, stepOutlineAtKnees (new); trimOutlineOnSlope and trimGeometryOnSlope take cut.steps when `
      + `given (none given: the old return). ${OWNER}`,
    gates: ['slopeKnee'],
  },
  'src/engine/cabinet.js': {
    why: `Owner 01.11.2026, the knee: anglesOver, sideUnder, sideEdgeAt and bevelProfile read the boards' own top lines `
      + `(roofBoardTopAt: the old expression on a one-board roof); the BACK takes the knee steps, its blank as tall as its `
      + `outline (backTall), and publishes the roof line capped at H with the steps for the scene and the drawings. The `
      + `TOP-n records follow roofBoards unchanged in code. ${OWNER}`,
    gates: ['slopeKnee'],
  },
};

export const LISP = {
  'reference/lisp/SKYLON_COMMON.lsp': `Owner 01.11.2026, the knee: the law AT A KNEE THE TWO BOARDS MEET ON THEIR `
    + `UNDERSIDES beside "ONE BOARD PER SEGMENT", SKY:roofTopAt, SKY:roofKneeX, SKY:roofBoards (the boundary at a knee), `
    + `SKY:roofBackTopPts, SKY:roofBackPts, SKY:drawRoofBack. The colour amendment of 31.10.2026 (f52, createCNCLayers `
    + `PUZZLE_DOG_BONES "_C" 12) stands. ${OWNER}`,
};

export const LIVENESS = {
  slopeKnee: () => {
    const r = computeCabinet({
      ...defaultParamsFor('WARDROBE', P),
      unit_num: '01',
      width: 1000,
      height: 2150,
      slope_cut: { pts: [{ x: 0, y: 1700 }, { x: 1000, y: 2539 }], infill: 40 },
    }, P);
    const t1 = r.panels.find((p) => p.id === 'TOP-1');
    const t2 = r.panels.find((p) => p.id === 'TOP-2');
    const back = r.panels.find((p) => p.id === 'BACK');
    const live = t1?.w === 805.0134 && t2?.w === 394.8631 && back?.h === 2155.4962;
    return { live, said: `TOP-1 ${t1?.w}, TOP-2 ${t2?.w}, BACK ${back?.h} (796.4623, 401.4139, 2150 before)` };
  },
};

export const GOLDENS = [];
export const REPINNED = [];
