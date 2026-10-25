/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F23 . THE HINGES AND THE RUNNERS FROM THE MODELS. The owner, 24.10.2026 (19:34): *"narysowane zawiasy to jakas
// karykatura, dalem ci przeciez dxf z dokladnymi rysunkami"*. reference/hardware/silhouettes.json becomes the tracer's
// own output against the live bucket of 25.10 (24 traced of 45: six hinges, two plates, fifteen runners, the CONERO);
// the probe (verify/t82/f23-probe.md, scripts/t82-probe-f23.mjs) found the reader's match and the projector's wiring
// sound, the 25.10 pages rendered where the hinge catalogue is never handed over, and the BUDR2's NL500 T without a GLB.
// engine/drawings/silhouettes.js gains a comment saying so (no code moves). Drawing modules only: computeCabinet reads
// none of them, and no golden reaches them.

const OWNER = '*"narysowane zawiasy to jakas karykatura, dalem ci przeciez dxf z dokladnymi rysunkami"* (24.10.2026)';

export const GATES = {};

export const LICENSED = {
  'src/engine/drawings/silhouettes.js': {
    why: `T82 F23: a comment in the header (WHAT A HEADLESS CALLER SEES): the door's file is the room's own resolution `
      + `through the engine's hinge catalogue, which the app hands over at start; a node render without it draws `
      + `today's symbol, as the room mounts no model. No code line moves. ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
