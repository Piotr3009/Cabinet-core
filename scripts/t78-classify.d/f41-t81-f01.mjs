/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T81 F1 · ONE PROJECTOR, FED BY WHAT THE ROOM DRAWS. The owner, 22.10.2026 (22:57): *"zalezy mi zebys rysowal w pdf
// 1 do 1 co mamy na cabinet core"*. A new drawing module (engine/drawings/projector.js) projects the boards the room
// draws (result.panels, seated by joinery.js panelPlacement, cut to the nominal outline panelSolid extrudes), the
// hardware instances (hardware3d.js hardwareInstances) and the handles (drillSummary.handles, out of the front's cut
// frame) through one exact hidden-line pass; engine/drawings/silhouettes.js is its question to PART D (no file yet:
// every family draws today's symbol). Three drawing numbers enter profile.drawings (the hinge bar 6 x 70, the knob 30,
// the card's run margin 50). Nothing here is read by computeCabinet: this turn draws, it never cuts.

const OWNER = '*"zalezy mi zebys rysowal w pdf 1 do 1 co mamy na cabinet core"* (22.10.2026)';

export const GATES = {};

export const LICENSED = {
  'src/engine/drawings/projector.js': {
    why: `T81 F1: new. The projector: every board, hardware instance and handle the room draws, as planar faces in the `
      + `run's frame, front / plan / section / perspective, fronts / no-fronts / X-ray, visibility by depth. ${OWNER}`,
    gates: [],
  },
  'src/engine/drawings/silhouettes.js': {
    why: `T81 F1: new. The projector's question to PART D (silhouetteMark); F1 answers null for every family. ${OWNER}`,
    gates: [],
  },
  'src/engine/profile.js': {
    why: `T81 F1: profile.drawings gains hingeBar { width 6, height 70 }, knobDiameter 30 and card.runMargin 50, the `
      + `APP'S numbers as the set's law is (CLAUDE.md T81 THE NUMBERS). computeCabinet reads no drawings key. ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
