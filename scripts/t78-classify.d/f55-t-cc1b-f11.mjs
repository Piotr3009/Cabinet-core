/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1b F11 . NOT ASSIGNED MATERIALS IN EVERY EXPORT (law 7). No engine delta.
const WHY = '*"inaczej eksport BOM pisze not assigned materials"* (the owner, 01.11.2026)';
export const GATES = {};
export const LICENSED = {
  'src/lib/exporters.js': { why: `T-CC1b F11.1: the BOM PDF prints Not assigned materials on each unassigned line and on the cover in red, the total reads not a price; the CSV WARNING row carries the same words. ${WHY}`, gates: [] },
};
export const LIVENESS = {};
export const GOLDENS = [];
export const REPINNED = [];
