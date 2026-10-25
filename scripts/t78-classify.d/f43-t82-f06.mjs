/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F6 · THE ROOM: THE HAWA DOOR CLOSED AND OPEN. The owner, 25.10.2026 (11:40): *"wysuwasz pocket door i
// zakrywasz szafke lub szafki"*. A NEW pure module (engine/pocketDoorPose.js) says where the door stands between the
// engine's own two boxes (`result.hawa.doors[i].closed` and `.open`, KIT_HAWA.lsp hawa-door-box and hawa-door-open):
// a quarter turn about its hinge, then E1 straight back; with the cups the engine states, the symbols of D21 and the
// sheets' marks. It derives no HAWA figure and is read by no cut: computeCabinet does not import it.

const OWNER = '*"wysuwasz pocket door i zakrywasz szafke lub szafki"* (25.10.2026, 11:40)';

export const GATES = {};

export const LICENSED = {
  'src/engine/pocketDoorPose.js': {
    why: 'T82 F6: NEW. pocketDoorGeometry (the rig of each door off result.hawa), pocketDoorRig, pocketDoorPose '
      + '(t 0 the closed box, 0.5 the quarter turn, 1 the open box), pocketDoorHoles (the figures\' holes on the '
      + 'door\'s back), pocketHardwareBoxes (the two zones on B, the 17 x 60 profile, the Push ejector), and the F7 '
      + `marks (pocketDoorBarMarks, pocketPlanEntities, pocketSectionEntities). Read by the room and the sheets only. ${OWNER}`
      + ' T82 F6, after the review: the Push ejector is a length of the vertical profile, the carriage stays on its track.'
      + ' After the review (F7): the section\'s track entities know whether the cut sees panel B.',
    gates: [],
  },
  'src/engine/shaker.js': {
    why: 'T82 F6, after the review (CLAUDE.md T82 F6: *"the door in the front finish of the run (spray, decoration, in-frame as the neighbours)"*): isShakerFront and isGlassFront answer for the role pocket_door as for front, so the HAWA door wears the run\'s shaker or glass, off the piece\'s own meta.frontType.',
    gates: ['hawaPocket'],
  },
  'src/engine/cabinet.js': {
    why: 'T82 F6, after the review: the pocket door carries meta.frontType and the decoration pass takes it; a III/35 door whose steel groove meets a face cut with no board left is refused in words (#37).',
    gates: ['hawaPocket'],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
