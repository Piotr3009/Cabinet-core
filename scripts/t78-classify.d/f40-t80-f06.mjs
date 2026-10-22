/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T80 F6 · THE HINGE: ON THE SIDE, A BLUM IN-FRAME HINGE, FROM A REFERENCE FILE. The owner, 21.10.2026: *"zawias na
// boku szafki (specjalne zawiasy z Bluma)"*; 22:40 *"5 tak"*. The inset hinge's numbers enter the engine ONLY through
// reference/hardware/blum-inframe-hinge.json (every number PROPOSED with its source), read by hingeLadder.js's inset
// branch beside the lay-on ladder (FROZEN 7: not one lay-on line moves): the plate column on the side at the file's
// set-back (20.5 for a 22 door, KIT_INFRAME.lsp D13), the cup at the file's K (21.5, today's), the order line naming the
// file's article and angle (71B3750, 110), the 3-D plate at the same column. Reached only by an inset leaf
// (meta.insetHinge), which only the F3 gate `inframe` cuts.

const OWNER = '*"zawias na boku szafki (specjalne zawiasy z Bluma)"*; *"5 tak"* (21.10.2026)';

export const GATES = {};

export const LICENSED = {
  'src/engine/cabinet.js': {
    why: `T80 F6: an inset leaf carries meta.insetHinge (the file's set-back, cup line, article, angle); the side plate `
      + `loop drills a side an inset leaf hangs on at its column (insetColumn), side_hinge_holes_x says it; the cup loop `
      + `reads the leaf's cup line; the family loop gives an inset leaf the file's angle and no ladder; the hinge order `
      + `groups an inset leaf under the file's article and system. ${OWNER}`,
    gates: ['inframe'],
  },
  'src/engine/hingeLadder.js': {
    why: `T80 F6: the inset branch beside the ladder (inframeHinge, isInsetLeaf, insetPlateSetback, insetCupFromEdge, `
      + `insetCupClear, insetHingeSpec, insetLadder), reading reference/hardware/blum-inframe-hinge.json; the lay-on `
      + `functions above are not touched. ${OWNER}`,
    gates: ['inframe'],
  },
  'src/engine/hardware3d.js': {
    why: `T80 F6: doorHingeInstances puts an inset leaf's cup at its cup line and its plate at its column `
      + `(meta.insetHinge); every lay-on leaf's instance is what it was. ${OWNER}`,
    gates: ['inframe'],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
