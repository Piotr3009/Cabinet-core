/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T79 F4 · THE NOTCH FROM THE TOP (a negative height). CLAUDE.md T79 PART C, the owner's list of 18.10.2026:
// *"cut corner ucina nam tylko od dołu a co jeśli będziemy chcieli od góry, nie powinno być funkcji -500 na przykład i
// wtedy ucina od góry? i mała informacja o tym."*  LISP first: KIT_NOTCH.lsp D21 THE TOP-ANCHORED NOTCH (a negative nh
// hangs the cut from the carcass top: the side's and the BACK's corner at the TOP of the notched edge, the TOP cut instead
// of the BOTTOM, the RETURN and the STEP hanging from the top, a FLOOR under the cut instead of a LID over it, the joints
// mirrored, |nh| leaving notch.minInterior under the cut) and its NUMBERS block I2 (BUD 600, BL 200 / 200 / -300, board
// by board); src/engine/notch.js mirrors it routine for routine. The gate is the sign: a unit with no notch, or a notch
// at h 0 or above, reaches the same lines as before, so the six, golden-notch.json and every other golden hold.

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

const OWNER = '*"nie powinno być funkcji -500 na przykład i wtedy ucina od góry? i mała informacja o tym."*';
const kit = (type, extra = {}) => ({ ...defaultParamsFor(type, P), unit_num: '01', ...extra });
const TOP_NOTCH = { corner: 'BL', w: 200, d: 200, h: -300 };

export const GATES = {
  notchTop: {
    what: 'a unit whose corner notch hangs from the TOP: `params.notch.h` below 0 (KIT_NOTCH.lsp D21; until T79 a negative '
      + 'height was refused in words and the parent was cut). Opens on h < 0 only; h 0 (full) and h > 0 (from the floor) never',
    opens: (p) => Boolean(p?.notch) && typeof p.notch === 'object' && Number(p.notch.h) < 0,
  },
};

export const LICENSED = {
  'src/engine/notch.js': {
    why: `T79 F4 · KIT_NOTCH.lsp D21 mirrored: notchFullP reads |nh|, notchFromTopP and notchFloor are new, notchHh is |nh|; `
      + 'notchSideFc and notchBackFc take the corner at the TOP for a notch from the top (a third / second argument, default '
      + 'false), notchSideRebate, notchSideJoints, notchBackJoints, notchBoxPlaces (the FLOOR), notchLid, notchShelfCrossesP, '
      + 'notchPlinth, notchCrossesP (z1), notchRebateEatsP, notchRefusal (the minInterior room under the cut; the old "cannot be '
      + 'below 0" refusal gone) and notchHangerCutouts follow the anchor; notchOf says anchor top; notchCarcass cuts the TOP '
      + 'instead of the BOTTOM and adds the NOTCH-FLOOR board; notchDrills leaves the legs where they stand. Every changed '
      + `line is behind h < 0. ${OWNER}`,
    gates: ['notchTop'],
  },
  'src/engine/partRegistry.js': {
    why: `T79 F4 · one registry row, NOTCH-FLOOR: carcase_horizontal (the LID's twin under a notch from the top), so the new `
      + `board is assignable. A registry, not a cut. ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {
  // The golden case, KIT_NOTCH.lsp I2: the TOP is cut (the BOTTOM is the parent's), BUL and the BACK lose their corner at
  // the top (x1y1, x0y1), the box is RETURN, STEP and FLOOR (no LID), the FLOOR at 452..470; the same unit at h 0 cuts
  // the BOTTOM too and stacks no FLOOR, so the delta is the sign's.
  notchTop: () => {
    const r = computeCabinet(kit('BUD', { shelves: 1, notch: TOP_NOTCH }), P);
    const full = computeCabinet(kit('BUD', { shelves: 1, notch: { ...TOP_NOTCH, h: 0 } }), P);
    const panel = (res, id) => res.panels.find((p) => p.id === id);
    const top = panel(r, 'TOP');
    const bottom = panel(r, 'BOTTOM');
    const bul = panel(r, 'BUL');
    const back = panel(r, 'BACK');
    const floor = panel(r, 'FLOOR');
    const refused = r.warnings.some((w) => w.code === 'NOTCH_REFUSED');
    return {
      live: !refused && top?.cnc?.notch?.fc === 'x0y1' && !bottom?.cnc?.notch
        && bul?.cnc?.notch?.fc === 'x1y1' && back?.cnc?.notch?.fc === 'x0y1'
        && floor?.part === 'NOTCH-FLOOR' && floor?.box?.y === 452 && !panel(r, 'LID')
        && r.derived?.notch?.anchor === 'top' && Boolean(panel(full, 'BOTTOM')?.cnc?.notch) && !panel(full, 'FLOOR'),
      said: `BUD with BL 200 / 200 / -300: TOP corner ${top?.cnc?.notch?.fc}, BOTTOM ${bottom?.cnc?.notch ? 'cut' : 'the parent\'s'}, `
        + `BUL corner ${bul?.cnc?.notch?.fc}, BACK corner ${back?.cnc?.notch?.fc}, the box ${(r.derived?.notch?.boards || []).join(' ')} `
        + `(FLOOR at y ${floor?.box?.y}), ${refused ? 'REFUSED' : 'cut'}; at h 0 the BOTTOM is ${panel(full, 'BOTTOM')?.cnc?.notch ? 'cut' : 'whole'} `
        + `and the box is ${(full.derived?.notch?.boards || []).join(' ')}`,
    };
  },
};

export const GOLDENS = [
  {
    file: 'golden-notch-top.json',
    F: 'F34',
    source: 'KIT_NOTCH.lsp D21 (the notch from the top, its NUMBERS block I2: BUD 600, BL 200 x 200 x -300) on KIT_BUD_FULL.lsp '
      + '(the parent, golden-bud.json\'s BUD-A with 1 shelf): the TOP cut instead of the BOTTOM, BUL and the BACK cut at the top, '
      + 'RETURN, STEP and FLOOR',
    params: () => kit('BUD', { shelves: 1, notch: TOP_NOTCH }),
  },
];

export const LISP = {
  'reference/lisp/KIT_NOTCH.lsp': `Owner 18.10.2026 (CLAUDE.md T79 F4): D21 THE TOP-ANCHORED NOTCH. ${OWNER} A negative nh hangs `
    + 'the notch from the carcass top (notch-from-top-p; notch-full-p and notch-hh read |nh|); notch-side-fc and notch-back-fc '
    + 'take the TOP corner; notch-side-rebate, notch-side-joints, notch-back-joints, notch-box-places (the FLOOR), notch-lid, '
    + 'the new notch-floor, notch-shelf-crosses-p, notch-plinth, notch-crosses-p (z1), notch-rebate-eats-p and notch-refusal '
    + '(the room under the cut, notch.minInterior) follow it; the command asks for it and draws the TOP and the FLOOR; the '
    + 'NUMBERS block I2 (BUD 600, BL 200 / 200 / -300, board by board). Sections 1 and 2 name it; every floor-notch answer is unchanged',
};
