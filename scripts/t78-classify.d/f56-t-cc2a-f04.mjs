/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC2a F4 . THE LINKS CLIENT (law 3). A NEW lib file through withDb; no engine reads it; no gate, no golden.
const WHY = '*"najwazniejsze zeby te linki sie nigdy klientowi nie rozlaczyly z jego DB"* (the owner, 01.11.2026, 12:50)';
export const GATES = {};
export const LICENSED = {
  'src/lib/jcLinks.js': { why: `T-CC2a F4.1: NEW: loadLinks (cc_material_links, every column but tenant_id), saveLinks (one cc_save_material_links call per 500), clearLink; JC_OFFLINE, LINKS_NOT_SET_UP or JC\'s own words; never throws. ${WHY}`, gates: [] },
};
export const LIVENESS = {};
export const GOLDENS = [];
export const REPINNED = [];
