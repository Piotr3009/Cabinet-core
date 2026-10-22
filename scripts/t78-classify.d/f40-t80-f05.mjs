/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T80 F5 · DOORS AND DRAWER FRONTS, SET IN THE OPENING. The owner, 21.10.2026: *"3 mm zawsze"*; *"ramka 25, drzwi 22 i
// jest idealnie, 3 mm gap pomiedzy carcasem a drzwiami"*; *"jak podwojne drzwi to miedzy drzwiami nie ma ramki, tylko
// miedzy szafkami"*; 22:40 *"1 tak"*. KIT_INFRAME.lsp (c): behind params.inframe only, one pass before anything machines
// a front: each front laid on the carcass face is set in the frame's opening (its lay-on cell mapped in, 3 to the frame,
// 1.5 to a neighbour), its face on the frame's face, its own board behind it; the cups follow the hinge rows down the
// door, a leaf hung on a carcass side names it, a drawer front's screws keep the box's pilots (the box does not move);
// the lay-on clearance trims never reach an inset front; derived, drillSummary and assemblies state the cut board.
// The gate is F3's `inframe`; no golden opens it.

const OWNER = '*"3 mm zawsze"*; *"ramka 25, drzwi 22 i jest idealnie, 3 mm gap pomiedzy carcasem a drzwiami"*; *"jak '
  + 'podwojne drzwi to miedzy drzwiami nie ma ramki, tylko miedzy szafkami"* (21.10.2026)';

export const GATES = {};

export const LICENSED = {
  'src/engine/cabinet.js': {
    why: `T80 F5: the inset pass (insetFronts over the opening, the box, the outline, the area, the banding, the shifted `
      + `front screws, meta.cupY, meta.hingeOn, meta.inset), the T31 trim pass skipped under in-frame, and the restate of `
      + `derived (door_width, front_heights, drawer_front_w / _y), drillSummary (front_cup_y, drawer_front_screw_*) and `
      + `assemblies.drawerFronts from the inset boards. ${OWNER}`,
    gates: ['inframe'],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
