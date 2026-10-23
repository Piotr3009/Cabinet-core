/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T81 F9 · THE CARD DRAWS ITS OWN UNIT. The owner, 22.10.2026 (22:57): *"zalezy mi zebys rysowal w pdf 1 do 1 co mamy na
// cabinet core"*. The unit card's three views are the projector's for ONE member (the fronts, the carcass with the
// fronts off, the plan from above), the run parts the unit owns clipped to its width and the profile's margin
// either side (drawings.card.runMargin 50, T81 PROPOSED; the audit of 22.10, finding 2); the title block says the
// colour's system once (finding 4). buildTopView, planBox and planHinges are retired (kasacja). Drawing modules
// only: computeCabinet reads none of them.

const OWNER = '*"zalezy mi zebys rysowal w pdf 1 do 1 co mamy na cabinet core"* (22.10.2026)';

export const GATES = {};

export const LICENSED = {
  'src/engine/drawings/unitCard.js': {
    why: `T81 F9: the card's FRONT, CARCASS and TOP views through the projector for this one cabinet, the run's parts `
      + `clipped to the unit and its margin, the wall behind the plan; the dimensions and notes as before. ${OWNER}`,
    gates: [],
  },
  'src/engine/drawings/card.js': {
    why: `T81 F9: the card is handed its unit; the Fronts row says the colour's system once. ${OWNER}`,
    gates: [],
  },
  'src/engine/drawings/views.js': {
    why: `T81 F9: buildTopView, planBox and planHinges deleted (kasacja), nothing calls them. ${OWNER}`,
    gates: [],
  },
  'src/engine/drawings/projector.js': {
    why: `T81 F9: the reveal also reads a TOP view: a hinge arm in a leaf's 3 mm slot is no part of it. ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
