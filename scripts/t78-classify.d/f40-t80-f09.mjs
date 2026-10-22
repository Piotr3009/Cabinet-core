/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T80 F9 · THE FRAME IN 3D. CLAUDE.md T80 F9: *"the frame of a run as ONE mesh (ExtrudeGeometry of a Shape with the
// openings as holes ...), the front material of the project (sprayed, the sheen ride applies to it as to a front), 25
// deep from the carcass face"*. The frame reaches the room by the road every board takes: `joinery.js panelPlacement`
// gives the part FRAME its seat (drawn as the sheet draws it, right-handed), and `3d/panelSolid.js` extrudes its
// outline with the RECESS_WINDOW cut-outs as holes (the T25 F1.2 window), whether or not the scene bores the rest;
// `3d/UnitView.jsx` builds that solid with no joint layers (the contour view). The owner, 21.10.2026 (20:31): *"4 - cnc
// blum in frame, 6 - mockup pls"*. Only a FRAME part takes the new seat, and only an in-frame project has one.

const OWNER = '*"4 - cnc blum in frame, 6 - mockup pls"*; *"rama cos takiego dokladnie"* (21.10.2026)';

export const GATES = {};

export const LICENSED = {
  'src/engine/joinery.js': {
    why: `T80 F9: panelPlacement gains case 'FRAME' (origin at the board's back face, u +x along the run, v +y up, n -z; `
      + `u x v = -n), so the scene's board is the sheet's, its openings cut through as holes. No other part's seat moves. ${OWNER}`,
    gates: ['inframe'],
  },
  'src/3d/panelSolid.js': {
    why: `T80 F9 (reported, beyond src/engine): a FRAME's RECESS_WINDOW cut-outs are its shape, read whether or not `
      + `appearance.cuts is on. ${OWNER}`,
    gates: ['inframe'],
  },
  'src/3d/UnitView.jsx': {
    why: `T80 F9 (reported, beyond src/engine): MovingPanel builds a FRAME's solid with no joint layers too (frameCut), `
      + `so the contour view never draws it as a slab over the inset fronts. ${OWNER}`,
    gates: ['inframe'],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
