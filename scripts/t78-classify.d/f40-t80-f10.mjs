/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T80 F10 · THE CHECKS. CLAUDE.md T80 F10: *"#40 red, front type not 22 under in-frame; #41 yellow, cabinets not
// butted (the stile grows); #42 yellow, a unit the frame stops at (the run split into frame segments); #43 yellow, the
// frame joined (wider than the board); #44 red, a cup within 3 of the lip. Each in the left messages and in the Check
// panel, each with its own test."*  The probe (verify/t80/f10-probe.md) found 40 to 44 free. The five live in
// engine/inframeChecks.js (the liftChecks.js pattern), re-deriving the frames through the store's own
// runFrameParams; the front-gap rule (#2) learns the frame as a neighbour of a set-in front (3 off its stile).
// Design-layer code computeCabinet never reads; a lay-on project hears nothing.

const OWNER = '*"drzwi 22 i jest idealnie"*; *"wszedzie ramke 38"*; *"a jak bedzie to bedziemy laczyc"*; '
  + '*"3 mm zawsze."* (21.10.2026)';

export const GATES = {};

export const LICENSED = {
  'src/engine/checks.js': {
    why: `T80 F10: the registry grows #40 (red), #41, #42, #43 (yellow), #44 (red), and runChecks pushes `
      + `inframeFindings (an in-frame project only). ${OWNER}`,
    gates: [],
  },
  'src/engine/inframeChecks.js': {
    why: `T80 F10: the five in-frame rules, pure: the front type not 22 (once per type), the stile grown by a gap, the `
      + `unit the frame stops at, the frame joined (or refused), the cup within 3 of the lip from the hinge file's K. ${OWNER}`,
    gates: [],
  },
  'src/engine/frontClearance.js': {
    why: `T80 F10: NEIGHBOUR.FRAME: a front set in a frame (meta.inset.opening) meets the frame's stile at the `
      + `opening's edge, nearer than anything outside it; its matrix correction is 0 (KIT_INFRAME.lsp (c) placed it). `
      + `A lay-on front carries no opening and meets what it met. ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
