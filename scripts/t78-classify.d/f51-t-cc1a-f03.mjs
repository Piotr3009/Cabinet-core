/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1a F3 . THE KASACJA OF THE LOGIN, THE MOCK MODE AND THE CLOUD ROAD (law 2). No engine delta; no golden re-pinned.
const WHY = '*"oczywiscie do CC laczysz sie tylko przez JC"* (the owner, 30.10.2026)';
export const GATES = {};
export const LICENSED = {
  'src/lib/cloudSync.js': { why: `T-CC1a F3: the auth block, the cc_projects / cc_units road and the assignments' row deleted; the company defaults stay until T-CC1b, the owner passed in. ${WHY}`, gates: [] },
  'src/lib/warehouseDb.js': { why: `T-CC1a F3: the three writes (saveMaterialDb, saveManyDb, removeMaterialDb) deleted; the read stays, rows local until T-CC2. ${WHY}`, gates: [] },
  'src/lib/persist.js': { why: `T-CC1a F3: the cloud branch (saveProject, saveAssignments) deleted; the shelf alone until PART C's one request. ${WHY}`, gates: [] },
};
export const LIVENESS = {};
export const GOLDENS = [];
export const REPINNED = [];
