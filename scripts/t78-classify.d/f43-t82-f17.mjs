/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F17 . THE PANEL IN FRONT OF A CHIMNEY CAN GROW (slice D2). The owner, 25.10.2026 13:36: *"jak mam frontowy komin
// to nie moge powiekszyc panela bo mi wchodzi w sciane"*. The store's width edit, size window, Check and inset settle
// read the chat-fix's moveUnit rule (planObstaclesInWayOf in the store, outside this contract); one engine file moves:
// attachPanel.js gains freePanelInsetMax (a free panel's back inset capped by the room, not by editor.maxInset) and
// attachPlan refuses in words a surface past the far wall. Placement only, nothing cut: a bare computeCabinet() imports
// none of it, so every golden holds byte for byte.

const OWNER = '*"jak mam frontowy komin to nie moge powiekszyc panela bo mi wchodzi w sciane"* (25.10.2026 13:36)';

export const GATES = {};

export const LICENSED = {
  'src/engine/attachPanel.js': {
    why: `T82 F17: freePanelInsetMax (the far wall less the panel's box and its clearance, the one ceiling of a free `
      + `panel's back inset: setUnitInsets, the right panel's Back field, the drag off the wall, attachPlan); attachPlan `
      + `refuses in words a surface that would stand the panel past the far wall. Placement only, nothing cut. ${OWNER}`,
    gates: [],
  },
  'src/engine/collision.js': {
    why: `T82 F17, after the review of 25.10 (panel 0): boxSpansOnWall and wallObstacles take \`back\`, where the band `
      + `starts off the wall line (0 for every cabinet, unchanged; a free panel's own back line), and clampUnitDepth skips `
      + `a neighbour entirely behind the unit's back line (the old far <= 0 with no inset). Placement only: `
      + `computeCabinet imports none of it. ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
