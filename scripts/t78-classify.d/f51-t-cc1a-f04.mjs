/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1a F4 . THE START SCREEN IS JOINERY CORE'S PROJECT LIST (law 3). No engine delta; no cut reads these files, no
// golden re-pinned.
const WHY = '*"w cc musimy zapisywac na glownej stronie; projekty dzielimy na itemy; kazdy projekt dodany to folder w JC"* (the owner, 30.10.2026)';
export const GATES = {};
export const LICENSED = {
  'src/lib/jcList.js': { why: `T-CC1a F4: NEW, pure: the list from four reads through withDb (pipeline_projects, projects, clients, cc_items without design), grouped by project key, the search, Recent per tenant, Archive / Restore through cc_archive_item. ${WHY}`, gates: [] },
  'src/lib/projectLibrary.js': { why: `T-CC1a F4: reduced: nextProjectNumber, the shelf's Recent (recentProjects, touchLocalProject, RECENT_LIMIT), deleteLocalProject and mergeProjectLists deleted; the browser door, the logo kept once and the shelf rows stay. ${WHY}`, gates: [] },
};
export const LIVENESS = {};
export const GOLDENS = [];
export const REPINNED = [];
