/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T79 F5 · THE HORIZONTAL NOTCH: ALL FOUR EDGES OF THE SIDE. CLAUDE.md T79 PART C, the owner's list of 18.10.2026:
// *"cut the corner działa idealnie, ale możesz zrobić mi też poziome cut? wszystkich 4 rogów?"*  LISP first:
// KIT_NOTCH.lsp D22 THE EDGE NOTCH, its section H2 (the routines: the sides' L corner by the corner notch's own outline
// law, the TOP / BOTTOM narrower by ed, the BACK shorter by eh at a back edge, no closing boards, the run law that plans
// every jointed edge on what the cuts leave it, the compound outline and the met runs with the corner notch, the
// refusals) and its NUMBERS block I3 (BUD 600 BB 20 / 120 and TB 50 / 100, board by board; the coexistence case C);
// src/engine/notch.js mirrors it routine for routine (section H2) and cuts it (section Z2). The gate is the parameter:
// a unit with no `params.edgeNotch` reaches no line of it, so the six, the notch goldens and every other golden hold.

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

const OWNER = '*"cut the corner działa idealnie, ale możesz zrobić mi też poziome cut? wszystkich 4 rogów?"*';
const kit = (type, extra = {}) => ({ ...defaultParamsFor(type, P), unit_num: '01', ...extra });
const BB = { edge: 'BB', d: 20, h: 120 };
const TB = { edge: 'TB', d: 50, h: 100 };

export const GATES = {
  edgeNotch: {
    what: 'a unit with an edge notch: `params.edgeNotch` (KIT_NOTCH.lsp D22, a rebate along a whole horizontal edge of the '
      + 'side elevation, TB / BB / TF / BF). Opens on the parameter only; no golden, no fossil kit and no store default carries it',
    opens: (p) => Boolean(p?.edgeNotch) && typeof p.edgeNotch === 'object',
  },
};

export const LICENSED = {
  'src/engine/notch.js': {
    why: 'T79 F5 · KIT_NOTCH.lsp D22 mirrored: section H2 (edgeNotchOk, edgeNotchSideFc, edgeNotchSide, the run law '
      + 'edgeNotchRun / RunMeet / RunsMeet, edgeNotchSideRuns, notchSideRuns, edgeNotchPlanSide, edgeNotchTopCut / Outline / Runs, '
      + 'notchTopRuns, edgeNotchPlanTop, edgeNotchBackCut / Back / Runs, notchBackRuns, edgeNotchPlanBack, edgeNotchKeepout, '
      + 'edgeNotchCrossesP, edgeNotchSideRect, notchSideRect, notchCutsBoardP, the compound outline edgeNotchShrink / Corners / '
      + 'Walk / LessTwo, edgeNotchRefusal, edgeNotchMeetsRefusal, edgeNotchRebateEatsP, edgeNotchHoleRefusal) and section Z2 '
      + '(edgeNotchOf, edgeNotchVerdict, withEdgeNotchRefusal, edgeNotchCarcass, edgeNotchDrills, edgeNotchSummary); notchProfile '
      + 'reads notch.edgeDefaults; notchKitRefusal names the cut (default "a corner", the sentence byte for byte as before). '
      + `Every changed answer is behind params.edgeNotch. ${OWNER}`,
    gates: ['edgeNotch'],
  },
  'src/engine/cabinet.js': {
    why: 'T79 F5 · the edge notch wired where the corner notch is: its verdict asked of the parent (the corner notch '
      + 'included), edgeNotchCarcass after notchCarcass (cornerCut: a board both reach is cut by both), edgeNotchDrills after '
      + `notchDrills, derived.edgeNotch. Every line behind params.edgeNotch. ${OWNER}`,
    gates: ['edgeNotch'],
  },
  'src/engine/profile.js': {
    why: 'T79 F5 · profile.notch.edgeDefaults { edge BB, depthMm 20, heightMm 120 } (T79 proposed, owner to confirm), what the '
      + `CUT EDGE window opens with, merged key by key on migration; read only for a unit with an edge notch. ${OWNER}`,
    gates: ['edgeNotch'],
  },
  'src/engine/dowels.js': {
    why: 'T79 F5 · a carcass with an edge notch keeps the puzzle, in words, as one with a corner notch does (KIT_NOTCH.lsp '
      + `re-plans the puzzle's joints; SKYLON_JOINTS_DOWEL.lsp has no notch row). ${OWNER}`,
    gates: ['edgeNotch'],
  },
  'src/engine/cabineo.js': {
    why: 'T79 F5 · a carcass with an edge notch keeps the puzzle, in words, as one with a corner notch does '
      + `(SKYLON_JOINTS_CABINEO.lsp has no notch row). The carcass table D.2 / D.2b untouched. ${OWNER}`,
    gates: ['edgeNotch'],
  },
  'src/engine/biscuitJoints.js': {
    why: 'T79 F5 · a carcass with an edge notch keeps the puzzle, in words, as one with a corner notch does '
      + `(SKYLON_JOINTS_BISCUIT.lsp has no notch row). The biscuit numbers untouched. ${OWNER}`,
    gates: ['edgeNotch'],
  },
  'src/lib/modalLayer.js': {
    why: `T79 F5 · one registry row, 'edge-notch': the CUT EDGE window is an OBJECT window held to an anchor, as the corner's. `
      + `A registry, not a cut. ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {
  // The NUMBERS block I3, case A: BUL and BUR lose their rear bottom corner 20 x 120 (x1y0 / x0y0), the BOTTOM is 520
  // deep, the BACK 650 high; the same unit without the parameter is the parent, board for board.
  edgeNotch: () => {
    const r = computeCabinet(kit('BUD', { shelves: 1, edgeNotch: BB }), P);
    const t = computeCabinet(kit('BUD', { shelves: 1, edgeNotch: TB }), P);
    const parent = computeCabinet(kit('BUD', { shelves: 1 }), P);
    const panel = (res, id) => res.panels.find((p) => p.id === id);
    const refused = [r, t].some((x) => x.warnings.some((w) => w.code === 'NOTCH_REFUSED'));
    return {
      live: !refused && panel(r, 'BUL')?.cnc?.notch?.fc === 'x1y0' && panel(r, 'BUR')?.cnc?.notch?.fc === 'x0y0'
        && panel(r, 'BOTTOM')?.h === 520 && panel(r, 'BACK')?.h === 650 && panel(t, 'TOP')?.h === 490
        && panel(t, 'BACK')?.h === 670 && panel(parent, 'BOTTOM')?.h === 540 && !panel(parent, 'BUL')?.cnc?.notch
        && r.derived?.edgeNotch?.edge === 'BB',
      said: `BUD with BB 20 / 120: BUL corner ${panel(r, 'BUL')?.cnc?.notch?.fc}, BUR ${panel(r, 'BUR')?.cnc?.notch?.fc}, `
        + `BOTTOM ${panel(r, 'BOTTOM')?.h} deep, BACK ${panel(r, 'BACK')?.h} high; with TB 50 / 100 the TOP ${panel(t, 'TOP')?.h} deep, `
        + `the BACK ${panel(t, 'BACK')?.h}; ${refused ? 'REFUSED' : 'cut'}; without it the BOTTOM is ${panel(parent, 'BOTTOM')?.h}`,
    };
  },
};

export const GOLDENS = [
  {
    file: 'golden-edge-notch-bb.json',
    F: 'F34',
    source: 'KIT_NOTCH.lsp D22 (the edge notch, its NUMBERS block I3 case A: BUD 600, BB 20 x 120, a skirting board) on '
      + 'KIT_BUD_FULL.lsp (the parent, golden-bud.json\'s BUD-A with 1 shelf): BUL and BUR cut at the rear bottom, the BOTTOM 520 '
      + 'deep, the BACK 650 high, no closing boards',
    params: () => kit('BUD', { shelves: 1, edgeNotch: BB }),
  },
  {
    file: 'golden-edge-notch-tb.json',
    F: 'F34',
    source: 'KIT_NOTCH.lsp D22 (the edge notch, its NUMBERS block I3 case B: BUD 600, TB 50 x 100, a coving) on '
      + 'KIT_BUD_FULL.lsp: BUL and BUR cut at the rear top, the TOP 490 deep (drawn from its underside, D11), the BACK 670 high',
    params: () => kit('BUD', { shelves: 1, edgeNotch: TB }),
  },
];

export const LISP = {
  'reference/lisp/KIT_NOTCH.lsp': `Owner 18.10.2026 (CLAUDE.md T79 F5): D22 THE EDGE NOTCH. ${OWNER} A rebate along a whole `
    + 'horizontal edge of the side elevation (TB, BB, TF, BF): section H2 (edge-notch-ok, edge-notch-side-fc, edge-notch-side, '
    + 'the run law edge-notch-run / -run-meet / -runs-meet, edge-notch-side-runs, notch-side-runs, edge-notch-plan-side, '
    + 'edge-notch-top-cut / -outline / -runs, notch-top-runs, edge-notch-plan-top, edge-notch-back-cut / -back / -back-runs, '
    + 'notch-back-runs, edge-notch-plan-back, edge-notch-keepout, edge-notch-crosses-p, edge-notch-side-rect, notch-side-rect, '
    + 'notch-cuts-board-p, the compound outline edge-notch-shrink / -corners / -walk / -less-two, edge-notch-refusal, '
    + 'edge-notch-meets-refusal, edge-notch-rebate-eats-p, edge-notch-hole-refusal); notch-profile gains notch.edgeDefaults; '
    + 'the NUMBERS block I3 (BUD 600 BB 20 / 120 and TB 50 / 100, board by board, and the coexistence case C); the command '
    + 'EDGENOTCH_FULL (K2). Sections 1 and 3 name it; every corner notch answer is unchanged',
};
