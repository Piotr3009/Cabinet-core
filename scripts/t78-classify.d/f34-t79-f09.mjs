/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T79 F9 · THE END PANEL FOLLOWS ITS SIDE INTO THE RECESS AND INTO THE NOTCH. CLAUDE.md T79 PART C, the owner's list of
// 18.10.2026: *"nie wycina mi panelu bocznego do recess a powinno."*  PROBE first (verify/t79/f09-probe.md): the END panel
// was `rectGeometry(endPanelDepth, epH)` beside every cut, the recess band never told the engine it reached past it, and
// wholly inside a recess it was 596 deep at z 0..596 beside a carcass at z 18..858. LISP first: KIT_NOTCH.lsp D23 (the END
// panel takes its side's corner in its side's frame, its cut face where the keep-out begins; section H3: notch-end-h,
// notch-end-cut, edge-notch-end-cut, notch-end-in-p, notch-end-runs, notch-end-outline; NUMBERS block I4) and KIT_RECESS.lsp
// D21 (it grows with its side when the band reaches past its outer face, over the band's own height; recess-end-reach-p,
// recess-end-cuts; NUMBERS block F2). src/engine mirrors them routine for routine and cuts them in ONE pass after the three
// cuts (extension.js endPanelsFollowSides). The gate is an END panel beside a cut: a unit with no end panel, or with no
// notch, no edge notch, no extension and no recess_mm, reaches no line of it, so the six and every golden hold.

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

const OWNER = '*"nie wycina mi panelu bocznego do recess a powinno."*';
const kit = (type, extra = {}) => ({ ...defaultParamsFor(type, P), unit_num: '01', ...extra });
const EPL = { id: 'ep-l', side: 'L', height: 'floor', thickness: 25 };
const EPR = { id: 'ep-r', side: 'R', height: 'floor', thickness: 25 };
const NOTCH = { corner: 'BL', w: 200, d: 200, h: 300 };
const BAND = { x0: 310, x1: 600, z0: 210, z1: 590, d: 150, ends: ['R'] };

export const GATES = {
  endFollows: {
    what: 'an END panel beside a cut side: `params.end_panels` together with a corner notch, an edge notch, a recess '
      + 'extension or `recess_mm` (wholly inside a recess, with or without `recess_band`); KIT_NOTCH.lsp D23, KIT_RECESS.lsp '
      + 'D21. No golden of the six, '
      + 'no notch or recess golden before tonight and no fossil kit carries an end panel beside a cut',
    opens: (p) => Array.isArray(p?.end_panels) && p.end_panels.length > 0
      && (Boolean(p.notch) || Boolean(p.edgeNotch) || Boolean(p.extension) || Number(p.recess_mm) > 0),
  },
};

export const LICENSED = {
  'src/engine/notch.js': {
    why: 'T79 F9 · KIT_NOTCH.lsp D23 mirrored, section H3: notchEndH, notchEndCut (the corner notch on the END of the notched '
      + 'side, its cut face on the STEP\'s back face at a boxed back corner, flush with the side\'s cut face otherwise), '
      + 'edgeNotchEndCut (both ENDs, flush), notchEndInP, notchEndRuns, notchEndOutline (ONE walk round the cuts). Pure; '
      + `read only by extension.js endPanelsFollowSides for a unit with an end panel beside a cut. ${OWNER}`,
    gates: ['endFollows'],
  },
  'src/engine/extension.js': {
    why: 'T79 F9 · KIT_RECESS.lsp D21 mirrored: recessEndReachP (the room\'s test, called by projectStore), recessEndCuts '
      + '(the band\'s own height, ed wide, never past the recess\'s own bottom or top, rz0 / rz1, where the band was '
      + 'clipped to the carcass); extensionOf carries `ends` (and rz0 / rz1 with them) only when the room passed one, '
      + 'extensionSummary carries `ends`; '
      + 'section Z2 endPanelsFollowSides, ONE pass for the notch, the edge notch and the recess (wholly inside too: '
      + '`recess_band`, the room\'s rz0 / rz1, keeps the deeper END on the wall line under or over the recess): the END '
      + `panel's numbers off its own box, its outline, marks, 3-D corner record, area and edging the outline's. ${OWNER}`,
    gates: ['endFollows'],
  },
  'src/engine/cabinet.js': {
    why: 'T79 F9 · endPanelsFollowSides called once after extensionCarcass (with the params, for recess_mm and recess_band); '
      + 'the END panel\'s wall gap measured off the recess\'s '
      + 'own back wall wholly inside (wallGapOf + recess_mm: the depth the carcass gained is no longer lost from the panel; '
      + `the PROBE's row 12). With no recess_mm and no cut beside an end panel, nothing moves. ${OWNER}`,
    gates: ['endFollows'],
  },
  'src/engine/joinery.js': {
    why: 'T79 F9 · panelPlacement gains the END-PANEL case: END-L in BUL\'s frame, END-R in BUR\'s, so the scene cuts the '
      + 'corner the engine states (`cnc.notch`) as it does on the side. A placement, not a cut: an uncut END panel has no '
      + `feature and still renders as its box. ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {
  // The NUMBERS: I4 case A (END-L less 210 x 400 at x1y0), F2 case D (END-R 746 deep, its two corners), and wholly inside
  // (END-R reaching the recess back and the door face); the same unit without the cut keeps a plain 596 x 870.
  endFollows: () => {
    const panel = (res, id) => res.panels.find((p) => p.id === id);
    const n = computeCabinet(kit('BUD', { shelves: 1, notch: NOTCH, end_panels: [EPL] }), P);
    const b = computeCabinet(kit('BUD', { shelves: 1, extension: BAND, end_panels: [EPR] }), P);
    const w = computeCabinet(kit('BUD', { shelves: 1, depth: 708, depth_full: 558, recess_mm: 150, end_panels: [EPR] }), P);
    const parent = computeCabinet(kit('BUD', { shelves: 1, end_panels: [EPL] }), P);
    const en = panel(n, 'END-L');
    const eb = panel(b, 'END-R');
    const ew = panel(w, 'END-R');
    return {
      live: en?.cnc?.notch?.fc === 'x1y0' && en.cnc.notch.nw === 210 && en.cnc.notch.nh === 400
        && eb?.w === 746 && eb.box.z === -160 && eb.cnc?.notch?.also?.fc === 'x0y1'
        && ew?.w === 746 && ew.box.z === -10
        && panel(parent, 'END-L')?.w === 596 && !panel(parent, 'END-L')?.cnc?.notch,
      said: `BUD BL 200 / 200 / 300: END-L corner ${en?.cnc?.notch?.fc} ${en?.cnc?.notch?.nw} x ${en?.cnc?.notch?.nh}; the band `
        + `310..600 x 210..590 reaching past END-R: ${eb?.w} deep from z ${eb?.box?.z}; wholly inside 150: ${ew?.w} from z `
        + `${ew?.box?.z}; without a cut END-L is ${panel(parent, 'END-L')?.w} x ${panel(parent, 'END-L')?.h}`,
    };
  },
};

export const GOLDENS = [
  {
    file: 'golden-notch-end-panel.json',
    F: 'F34',
    source: 'KIT_NOTCH.lsp D23 (the END panel follows its side, its NUMBERS block I4 case A: BUD 600, BL 200 / 200 / 300, '
      + 'END-L 25 to the floor) on KIT_BUD_FULL.lsp: END-L less 210 x 400 at its rear bottom corner, its cut face on the '
      + 'STEP\'s back face',
    params: () => kit('BUD', { shelves: 1, notch: NOTCH, end_panels: [EPL] }),
  },
  {
    file: 'golden-recess-end-panel.json',
    F: 'F34',
    source: 'KIT_RECESS.lsp D21 (the END panel grows with its side, its NUMBERS block F2 case D: BUD 600, the band 310..600 x '
      + '210..590, 150 deep, to the right edge and past END-R) on KIT_BUD_FULL.lsp: END-R 746 deep, the bump over the band\'s '
      + 'own height',
    params: () => kit('BUD', { shelves: 1, extension: BAND, end_panels: [EPR] }),
  },
];

export const LISP = {
  'reference/lisp/KIT_NOTCH.lsp': `Owner 18.10.2026 (CLAUDE.md T79 F9): D23 THE END PANEL FOLLOWS ITS SIDE. ${OWNER} The END `
    + 'panel takes its side\'s corner in its side\'s frame (the corner notch, the notch from the top, the edge notch), run on to '
    + 'its own underside or top, its cut face where the keep-out begins: section H3 (notch-end-h, notch-end-cut, '
    + 'edge-notch-end-cut, notch-end-in-p, notch-end-runs, notch-end-outline) and the NUMBERS block I4. Every answer before '
    + 'tonight is unchanged',
  'reference/lisp/KIT_RECESS.lsp': `Owner 18.10.2026 (CLAUDE.md T79 F9): D21 THE END PANEL GROWS WITH ITS SIDE. ${OWNER} `
    + 'It grows by ed when the band reaches past its outer face, over the band\'s own height and never past the recess\'s '
    + 'own bottom or top (recess-end-reach-p, recess-end-cuts, in section D) and, wholly inside, reaches the recess back with '
    + 'the sides; the NUMBERS block F2. Every '
    + 'answer before tonight is unchanged',
};
