/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1a F8 . FOUR TRIGGERS, ONE SAVE (law 6). No engine delta; no cut reads this file, no golden re-pinned.
const WHY = '*"dopiero caly json powinien sie zapisac do DB przy nacisnieciu Zapisz lub co 5 minut automatycznie"* (the owner, 30.10.2026)';
export const GATES = {};
export const LICENSED = {
  'src/lib/saveTriggers.js': { why: `T-CC1a F8: NEW, pure: Ctrl+S / Cmd+S (handleSaveKey), the autosave every profile.save.autosaveMinutes when dirty and not in flight, pagehide / visibilitychange hidden: the crash buffer flushed then ONE keepalive fetch to /api/rpc under profile.save.keepaliveMaxKb, and saveFirst for the six exports. ${WHY}`, gates: [] },
};
export const LIVENESS = {};
export const GOLDENS = [];
export const REPINNED = [];
