/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1a F7 . ONE SAVE, ONE REQUEST (law 5). No engine delta; no cut reads these files, no golden re-pinned.
const WHY = '*"dopiero caly json powinien sie zapisac do DB przy nacisnieciu Zapisz lub co 5 minut automatycznie"* (the owner, 30.10.2026)';
export const GATES = {};
export const LICENSED = {
  'src/lib/persist.js': { why: `T-CC1a F7: persistProject is ONE cc_save_item through withDb carrying projectForSave's item JSON (no profile, logo as { ref }); the shelf write deleted; the size guard (profile.save.maxBodyMb); Save as new item (cc_create_item in the same project, then the same save); markSaved with the row's updated_at. ${WHY}`, gates: [] },
  'src/lib/saveNumbers.js': { why: `T-CC1a F7 to F9: NEW, pure: the save's four numbers (autosaveMinutes 5, keepaliveMaxKb 64, maxBodyMb 3.5, bufferMaxMb 1) read from profile.save over their defaults; no engine delta. ${WHY}`, gates: [] },
  'src/lib/projectFileRoad.js': { why: `T-CC1a F7: the import's one save (saveItem) goes through persistProject; itemDesign is the store's projectForSave. ${WHY}`, gates: [] },
};
export const LIVENESS = {};
export const GOLDENS = [];
export const REPINNED = [];
