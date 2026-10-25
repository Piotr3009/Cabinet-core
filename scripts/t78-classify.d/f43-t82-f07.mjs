/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F7 · THE DRAWINGS OF THE HAWA POCKET. CLAUDE.md T82 F7: "The fronts sheet (T81) draws the closed door over
// the pocket and the covered units, 3 proud, with the hinge bars on its hinge edge (T81 F3's bar at the cup's y);
// the no-fronts sheet lifts it and shows the pocket's two panels; the plan cuts the pocket and draws the open door
// dashed (HIDDEN) inside it; the section through the pocket shows T1 and the tracks' zones (22 and 41 lines).
// Dimensions: TB and M on the plan." The projector learns the POCKET-DOOR as a front (plain, as the room draws it),
// the door's bars and the D21 symbols; the plan its open door, TB and M; the section a station through the pocket,
// its two track axes and T1. Nothing here is read by computeCabinet: this F draws, it never cuts.

const OWNER = '*"wysuwasz pocket door i zakrywasz szafke lub szafki"* (25.10.2026, 11:40); *"musze miec dzisiaj '
  + 'profesjonalne rysunki dla klientow"* (11:40)';

export const GATES = {};

export const LICENSED = {
  'src/engine/drawings/projector.js': {
    why: `T82 F7 (A5's patch, applied by E3): isRoomFront takes POCKET-DOOR; its face detail none (plain, as the room); `
      + `the HAWA symbols as HINGES solids; the door's hinge bars at the engine's cupY. ${OWNER}`,
    gates: [],
  },
  'src/engine/drawings/setPlan.js': {
    why: `T82 F7 (A5's patch, applied by E3): the open door dashed (DOORS, HIDDEN), TB and M, through the wall. ${OWNER}`,
    gates: [],
  },
  'src/engine/drawings/setSection.js': {
    why: `T82 F7: a station through a run's HAWA pocket (the next letter), its two track axes (22, 41) the track's `
      + `length from 5 behind the front edge, and T1. ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
