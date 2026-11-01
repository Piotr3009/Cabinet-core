/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1b F3 . THE DATABASE MENU DIES. No engine delta.
const WHY = '*"Database: Company defaults do Settings, Database niepotrzebne, wszystko jest w JC, Assign materials juz jest po lewej"* (the owner, 01.11.2026)';
export const GATES = {};
export const LICENSED = {
  'src/lib/topMenu.js': { why: `T-CC1b F3: MENU_ORDER is File, View, Settings, Spraying, Lighting, Output; buildDatabaseMenu deleted (tombstone two lines), its entries housed in Settings and on the rail, Clients... and Projects... deleted. ${WHY}`, gates: [] },
};
export const LIVENESS = {};
export const GOLDENS = [];
export const REPINNED = [];
