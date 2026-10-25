/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── WHICH BOARDS TAKE THE UNIT'S DRILL RINGS (T26, T82 F6) ────────────────
//
// `3d/DrillRings.jsx` draws every hole of a unit as a decal, ONCE for the
// unit: the rings do not travel with a board that moves. So a board that
// moves takes none, and its holes are drawn by whatever carries it.
//
//   a front     it swings (T26): its cup and its handle bolts are covered by
//               the hardware mounted on the leaf
//   the HAWA    it turns on its hinges and slides into its pocket (T82 F6:
//   door        *"the hinge cups on the door's back as the engine drills
//               them"*): `3d/PocketDoor.jsx` draws its cups and screw holes on
//               its back, on the moving leaf. The review of PART A found the
//               unit's rings drawing them a second time, on the face the
//               client sees, and leaving them in the air when the door opened.
//
// Pure, so a node test holds it; the ring arithmetic stays in DrillRings.

import { isPocketDoor } from '../engine/pocketDoorPose.js';

/** Does this board take the unit's static drill rings? */
export function ringsOn(panel) {
  if (!panel) return false;
  if (panel.role === 'front' || panel.part === 'FRONT') return false;
  if (isPocketDoor(panel)) return false;
  return true;
}
