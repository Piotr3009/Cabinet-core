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
      + `marks (pocketDoorBarMarks, pocketPlanEntities, pocketSectionEntities). Read by the room and the sheets only. ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
