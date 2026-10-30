/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T85 F4 . THE DOORS OPEN TO 90, THE SILVER FINISH THE DEFAULT (CLAUDE.md T85 PART C, law 4 A SWING IS A PICTURE).
// The owner, 30.10.2026 20:48: *"default zawiasy prosze zrob 90 stopni, teraz mamy 150 to nie jest dobre, i silver
// prosze"*. profile.doors.openAngle 90 (was 99); engine/doors.js doorOpenAngle reads the profile's one number and no
// longer the leaf's hinge angle (T78 F13's fullDeg). The hinge's meta.openAngleDeg stays on the panel for the BOM and
// Check #8. Nothing cut: computeCabinet() reads neither doors.openAngle nor doorOpenAngle; the six hold byte for byte.

const OWNER = '*"default zawiasy prosze zrob 90 stopni, teraz mamy 150 to nie jest dobre, i silver prosze"* '
  + '(the owner, 30.10.2026 20:48)';

export const GATES = {};

export const LICENSED = {
  'src/engine/profile.js': {
    why: `T85 F4: profile.doors.openAngle 90 (was 99), openAngleAtWall 90 as it was; the swing in the 3D view only, `
      + `read by engine/doors.js doorOpenAngle; computeCabinet() reads neither. hardware.hinge.cliptop.defaultFinish `
      + `stays nickel and its material is unchanged. ${OWNER}`,
    gates: [],
  },
  'src/engine/doors.js': {
    why: `T85 F4: doorOpenAngle opens every hinged leaf to profile.doors.openAngle; the fullDeg argument (T78 F13, the `
      + `leaf's hinge angle) is no longer read. The wall law unchanged. A picture: nothing cut, no gate. ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
