/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T81 F6 · THE PLANS AND THE SECTIONS FROM THE SAME PROJECTOR. The owner, 22.10.2026 (21:23): *"pozniej przekroj z
// gory, i pozniej przekroje pionowe"*; (22:57) *"zalezy mi zebys rysowal w pdf 1 do 1 co mamy na cabinet core"*. The
// two plans and every wall's sections are the projector's: the boards the knife's plane meets CUT (one bar each in
// the cut's pen), and what lies beyond the plane in painter's order; on the base plan the plinth a dashed line,
// never solid (the audit of 22.10, finding 3); on a section the frame of an in-frame run its FRAME board (the rails
// cut, the stile seen) and the T80 filler note as T80 F8 drew it. legHardware is retired (kasacja). Drawing modules
// only: computeCabinet reads none of them.

const OWNER = '*"pozniej przekroj z gory, i pozniej przekroje pionowe"* (22.10.2026)';

export const GATES = {};

export const LICENSED = {
  'src/engine/drawings/setPlan.js': {
    why: `T81 F6: the plans draw the cut units through the projector (plan view at the profile's cut heights), the `
      + `plinth dashed; the room's walls, the worktop, the stations and the chains as T71 hung them. ${OWNER}`,
    gates: [],
  },
  'src/engine/drawings/setSection.js': {
    why: `T81 F6: a station is the projector's section (the cut at the station, beyond as far as the cut cabinets `
      + `reach); the T80 filler note kept; the caption says the reader looks towards the wall's end. ${OWNER}`,
    gates: [],
  },
  'src/engine/drawings/setElevation.js': {
    why: `T81 F6: legHardware deleted, the sections no longer call it (kasacja). ${OWNER}`,
    gates: [],
  },
  'src/engine/drawings/projector.js': {
    why: `T81 F6: a cut face that is a rectangle is one bar in the cut's pen; the worktop's cut keeps the section's `
      + `fill. ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
