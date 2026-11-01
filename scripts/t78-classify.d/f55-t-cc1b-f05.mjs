/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1b F5 . OUTPUT SHRINKS (law 5). No engine delta.
const WHY = '*"na dole Drawings dobre, ale myli sie z Output; Output zmniejszyc"*; *"Output tylko: cutting list, BOM PDF, labels 21 i 44"* (the owner, 01.11.2026)';
export const GATES = {};
export const LICENSED = {
  'src/lib/outputMenu.js': { why: `T-CC1b F5.1: Output holds Cutting list CSV, BOM PDF, Part labels 21 and 44; DRAWING_KINDS and the six other entries deleted, their doors named in test/turn-cc1b-f05-output.test.js. ${WHY}`, gates: [] },
};
export const LIVENESS = {};
export const GOLDENS = [];
export const REPINNED = [];
