/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F19 . THE FRONT OF A UNIT (slice D2). CLAUDE.md T82 F19: *"a free panel whose back line stands at or beyond a
// unit's front line ... does not obstruct that unit and is not obstructed by it (collision.js, one predicate, named
// standsInFrontOf); Attach gains "Unit NN, front"."* collision.js gains unitFrontLine and standsInFrontOf (read by the
// store's obstructs, outside this contract); attachPanel.js gains the unit's front face. Placement only, nothing cut:
// computeCabinet imports neither file, so every golden holds byte for byte.

const WHY = '*"a free panel whose back line stands at or beyond a unit\'s front line ... does not obstruct that unit '
  + 'and is not obstructed by it"* (CLAUDE.md T82 F19; the owner\'s cladding of 24.10\'s list)';

export const GATES = {};

export const LICENSED = {
  'src/engine/collision.js': {
    why: `T82 F19: unitFrontLine (the unit's own back line, its carcass, the door gap and its front) and `
      + `standsInFrontOf (a free panel at or past that line, same wall, the unit square to it). Placement only. ${WHY}`,
    gates: [],
  },
  'src/engine/attachPanel.js': {
    why: `T82 F19: UNIT_FACES gains 'front' ("Unit NN, front"): along, upright, its back on the unit's door face plus `
      + `the gap. Placement only, nothing cut. ${WHY}`,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
