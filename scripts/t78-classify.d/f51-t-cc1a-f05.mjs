/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1a F5 . NEW ITEM BINDS TO A JC PROJECT (law 4). No engine delta; no cut reads these files, no golden re-pinned.
const WHY = '*"automatyczne polaczenie danego projektu do danego pipelinu lub production projektu"* (the owner, 30.10.2026)';
export const GATES = {};
export const LICENSED = {
  'src/lib/jcList.js': { why: `T-CC1a F5: createItem (cc_create_item with p_pipeline_id or p_project_id, never both) and startItem (the record built from the server's row by the store's newProject; a refusal builds nothing). ${WHY}`, gates: [] },
  'src/lib/projectLibrary.js': { why: `T-CC1a F5: no loc_ id is minted (newProjectId deleted); a job without an item id is not kept on the shelf, the refusal said in words. ${WHY}`, gates: [] },
};
export const LIVENESS = {};
export const GOLDENS = [];
export const REPINNED = [];
