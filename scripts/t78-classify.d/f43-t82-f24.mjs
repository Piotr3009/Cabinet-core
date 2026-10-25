/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F24 · ONE DASHED LINE FOR THE PLINTH. The owner, 24.10.2026 (19:34): *"przerywana linia tez nie, bedzie jedna
// linia typu przerywana a nie podwojna bo to mylace bardzo jest"*. On a plan a board hidden under the cut and seen
// edge-on (the plinth, a rail) is ONE dashed line at its face toward the room (where its unit's fronts stand), on a new
// layer PLINTH_HIDDEN (engine/drawings/layers.js: grey ACI 253 #828282, the FINE pen, SHELVES' dash; in LAYER_ORDER),
// drawn by engine/drawings/projector.js renderScene when hiddenAs names a layer; engine/drawings/setPlan.js names it for
// the plinth. The shelves keep their layer. The legend row is setSheet.js (E1, by patch, committed under F24).
// Drawing modules only: computeCabinet reads none of them. DRAFT by slice E3 for INT: copy to
// scripts/t78-classify.d/f43-t82-f24.mjs.

const OWNER = '*"bedzie jedna linia typu przerywana a nie podwojna bo to mylace bardzo jest"* (24.10.2026, 19:34)';

export const GATES = {};

export const LICENSED = {
  'src/engine/drawings/layers.js': {
    why: `T82 F24: PLINTH_HIDDEN { aci 253, #828282, FINE, dash [6, 4] } and its place in LAYER_ORDER after SHELVES. ${OWNER}`,
    gates: [],
  },
  'src/engine/drawings/projector.js': {
    why: `T82 F24: hiddenAs may name a layer; a board seen edge-on is then one dashed line at its face toward the `
      + `room (roomwardSide, edgeOnLine), hiding nothing. hiddenAs true keeps T81's dashed edges on SHELVES. ${OWNER}`,
    gates: [],
  },
  'src/engine/drawings/setPlan.js': {
    why: `T82 F24: buildPlan's hiddenAs names PLINTH_HIDDEN for the plinth. ${OWNER}`,
    gates: [],
  },
  'src/engine/drawings/setSheet.js': {
    why: `T82 F24: SET_LEGEND gains ['dash', 'PLINTH_HIDDEN', 'Plinth, below the cut'] (E1 applies E3's patch). ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
