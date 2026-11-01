/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1b F9 . THE STOCK IS JOINERY CORE'S (law 6). Four engine files change COMMENTS only (cc_materials named no more); no gate, no golden.
const WHY = '*"materialy z JC (jego baza), przypisanie w CC"*; *"materials w JC ma wlasny UUID, i to samo musimy zrobic: przypisac UUID z JC do naszego materialu"* (the owner, 01.11.2026)';
export const GATES = {};
export const LICENSED = {
  'src/lib/jcStock.js': { why: `T-CC1b F9.1: NEW, pure: stock_items and stock_categories through withDb with their column lists, toMaterial keyed by JC's uuid, ccKindOf from the row's words, categoryTree. ${WHY}`, gates: [] },
  'src/lib/modalLayer.js': { why: `T-CC1b F9.3: one registry row, 'jc-stock' { about: 'project', label: 'Stock' }, the rail's Stock... window. A registry, not a cut. ${WHY}`, gates: [] },
  'src/engine/warehouse.js': { why: `T-CC1b F9: a comment names Joinery Core's stock_items instead of cc_materials; no code moves. ${WHY}`, gates: [] },
  'src/engine/autoAssign.js': { why: `T-CC1b F9: a comment names Joinery Core's stock_items instead of cc_materials; no code moves. ${WHY}`, gates: [] },
  'src/lib/warehouseDb.js': { why: `T-CC1b F9: a comment names Joinery Core's stock_items instead of cc_materials; no code moves. ${WHY}`, gates: [] },
  'src/engine/profile.js': { why: `T-CC1b F9: a comment names Joinery Core's stock_items instead of cc_materials; no code moves. ${WHY}`, gates: [] },
};
export const LIVENESS = {};
export const GOLDENS = [];
export const REPINNED = [];
