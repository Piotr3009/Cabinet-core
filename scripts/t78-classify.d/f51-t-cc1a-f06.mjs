/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1a F6 . OPEN FROM FILE IS THE IMPORT ROAD (the owner's answer 10). No engine delta; no cut reads these files,
// no golden re-pinned.
const WHY = '*"w przyszlosci nie bedzie save to file, po co?"* (the owner, 31.10.2026, 01:06)';
export const GATES = {};
export const LICENSED = {
  'src/lib/projectFileRoad.js': { why: `T-CC1a F6: openProjectFromFile imports: the id-collision question against Joinery Core's items, the project picker, cc_create_item, the job opened under the server's id, ONE cc_save_item (itemDesign without profile, saveItem); the file's settings never applied, the shelf write deleted. ${WHY}`, gates: [] },
};
export const LIVENESS = {};
export const GOLDENS = [];
export const REPINNED = [];
