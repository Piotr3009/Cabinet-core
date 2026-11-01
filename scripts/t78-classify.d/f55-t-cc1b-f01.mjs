/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1b F1 . THE HEADER (law 2). No engine delta; no cut reads these files, no golden re-pinned.
const WHY = '*"wprowadza w blad ... po prawej, z numerem projektu JC i nazwa"*; *"duzy przycisk Return to Joinery Core"* (the owner, 01.11.2026)';
export const GATES = {};
export const LICENSED = {
  'src/lib/topMenu.js': { why: `T-CC1b F1: BACK_TO_JC_LABEL, JC_DASHBOARD, jobProjectLine (number, JC project name, client; the number alone when the name is unknown) and goToJoineryCore, the job block's and the Back button's words and road. ${WHY}`, gates: [] },
  'src/lib/jcList.js': { why: `T-CC1b F1.3: startItem hands newProject the bound project's own name (jcProjectName), the store's only. ${WHY}`, gates: [] },
};
export const LIVENESS = {};
export const GOLDENS = [];
export const REPINNED = [];
