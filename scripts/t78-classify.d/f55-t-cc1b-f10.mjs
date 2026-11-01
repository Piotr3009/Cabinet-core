/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1b F10 . ASSIGN MATERIALS, EVERY LINE (law 7). LICENSED: bom.js the hardware key read, partRegistry.js the blob's schema 3. No quantity, spec label or geometry moves; computeCabinet reads neither; no gate, no golden.
const WHY = '*"kazda funkcja przypisana (10 rodzajow zawiasow, wszystkie przypisane), inaczej eksport BOM pisze not assigned materials"* (the owner, 01.11.2026)';
export const GATES = {};
export const LICENSED = {
  'src/engine/bom.js': { why: `T-CC1b F10.2: hardwareDemand reads assignments.hardware[role|spec_label] first, the legacy role second, and carries key and assigned; two comments name stock_items. ${WHY}`, gates: [] },
  'src/engine/partRegistry.js': { why: `T-CC1b F10.1: the assignment blob's schema 3, hardware { [role|spec_label]: { material_id } }, and migrateHardwareKeys copying a schema 2 role value to every key of that role, once. ${WHY}`, gates: [] },
};
export const LIVENESS = {};
export const GOLDENS = [];
export const REPINNED = [];
