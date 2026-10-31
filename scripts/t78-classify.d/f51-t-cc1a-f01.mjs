/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1a F1 . ONE CLIENT, JC'S (law 2). No engine delta; no cut reads these files, no golden re-pinned.
const WHY = '*"oczywiscie do CC laczysz sie tylko przez JC"* (the owner, 30.10.2026)';
export const GATES = {};
export const LICENSED = {
  'src/lib/jcApi.js': { why: `T-CC1a F1: NEW, the one door: JC's window client, jcFetch, hasToken, isJcOffline, withDb with today's contract. ${WHY}`, gates: [] },
  'src/lib/supabase.js': { why: `T-CC1a F1: DELETED (kasacja), CC's own supabase-js client and its key. ${WHY}`, gates: [] },
  'src/lib/storageBase.js': { why: `T-CC1a F1.4: the storage root reads VITE_HARDWARE_STORAGE_URL first, VITE_SUPABASE_URL second. ${WHY}`, gates: [] },
  'src/lib/cloudSync.js': { why: `T-CC1a F1: withDb and the offline gate from jcApi.js (the auth and cc_projects roads die in F3). ${WHY}`, gates: [] },
  'src/lib/hardwareRegister.js': { why: `T-CC1a F1: withDb and isJcOffline from jcApi.js; local fallback kept (FROZEN 4, pending T-CC1b / T-CC2). ${WHY}`, gates: [] },
  'src/lib/hardwareSource.js': { why: `T-CC1a F1: withDb and isJcOffline from jcApi.js; local fallback kept (FROZEN 4, pending T-CC1b / T-CC2). ${WHY}`, gates: [] },
  'src/lib/settingsSetsDb.js': { why: `T-CC1a F1: withDb from jcApi.js (FROZEN 4, pending T-CC1b / T-CC2). ${WHY}`, gates: [] },
  'src/lib/warehouseDb.js': { why: `T-CC1a F1: withDb from jcApi.js (FROZEN 4, pending T-CC2). ${WHY}`, gates: [] },
  'src/lib/persist.js': { why: `T-CC1a F1: the offline gate from jcApi.js (the cloud branch dies in F3; PART C rewrites the file). ${WHY}`, gates: [] },
  'src/lib/runnerCatalogue.js': { why: `T-CC1a F1: a comment that named the deleted flag reworded; no code moved. ${WHY}`, gates: [] },
};
export const LIVENESS = {};
export const GOLDENS = [];
export const REPINNED = [];
