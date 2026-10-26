/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T83 F10 · THE PLAN IS NOT A MIRROR. The owner, 25.10.2026 (22:41): *"przekroj z gory pokazuje jakby logike z dolu
// czyli lustrzane odbicie, sprawdz dokladnie"*. The probe (verify/t83/f10-probe.md, P1): the plan laid the room's
// (x, y) with y UP the paper, the room seen from BELOW (cross -1 on walls A, B, C and D), and the key plan the same;
// the A-A arrows pointed to the wall's start while the section looks to its end. The fix: ONE frame, the plan's walls
// with the room's y turned over (engine/drawings/setPlan.js planWalls, read by measurePlan, roomFabric and buildPlan,
// so every entity, label, chain and marker follows), the key plan's one P (engine/drawings/setSheet.js keyPlan), and
// the marker's along sign. Drawing modules only: computeCabinet reads none of them, no cut, no CNC, no BOM moves.
// DRAFT by slice E1 for INT.

const OWNER = '*"przekroj z gory pokazuje jakby logike z dolu czyli lustrzane odbicie, sprawdz dokladnie"* (25.10.2026, 22:41)';

export const GATES = {};

export const LICENSED = {
  'src/engine/drawings/setPlan.js': {
    why: `T83 F10: planWalls (the room's walls with y turned over: looking DOWN, x to the right, the room's y down the `
      + `paper, wall A at the top as the room editor and the unit card draw it), read by measurePlan, roomFabric and `
      + `buildPlan; the section marker's arrows point along the wall to its END, the way buildStation looks. ${OWNER}`,
    gates: [],
  },
  'src/engine/drawings/setSheet.js': {
    why: `T83 F10: keyPlan's P lays the room's y DOWN the paper, as the plan now does (wall A at the top, B on the `
      + `right, C at the bottom, D on the left, clockwise as rectCorners runs); place, the frame and the strip untouched. ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
