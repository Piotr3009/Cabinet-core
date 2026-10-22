/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T81 F4 · THE SHEET WITHOUT FRONTS. The owner, 22.10.2026 (21:23): *"nastepnie widok wszystkich scian bez frontow, tak
// jakbysmy ukryli albo sciagneli fronty"*. Every wall's sheet without fronts is the projector's, as the room's Hide
// fronts lens shows the wall: the doors and the drawer fronts off with what is screwed to them, the carcass, its
// shelves, the drawer boxes, the runners, the plates, the frame of an in-frame run, the plinth, the appliances; the
// front-material boards the room keeps in the carcass's ink. The composed internal layout is deleted (kasacja).
// Drawing modules only: computeCabinet reads none of them.

const OWNER = '*"nastepnie widok wszystkich scian bez frontow, tak jakbysmy ukryli albo sciagneli fronty"* (22.10.2026)';

export const GATES = {};

export const LICENSED = {
  'src/engine/drawings/setElevation.js': {
    why: `T81 F4: buildRunElevation draws every sheet of a wall through the projector; the composed internal layout `
      + `(buildCarcassElevation per unit, hingePlateMarks, numberSlot, maskNumbers, applianceMarks, the appliance table) `
      + `is deleted. ${OWNER}`,
    gates: [],
  },
  'src/engine/drawings/projector.js': {
    why: `T81 F4: with the fronts off, an end panel, an infill and the cornice the room keeps are drawn in the `
      + `carcass's ink. ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
