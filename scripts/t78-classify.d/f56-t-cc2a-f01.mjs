/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC2a F1 . ONE CATALOGUE, IDS THAT NEVER CHANGE (law 1). Two NEW engine files, pure data and lookups; computeCabinet reads neither; no gate, no golden.
const WHY = '*"musimy miec liste materialow wszystkich materialow jakie CC uzywa"*; *"kazdy material musi miec identyfikator ... nie moze byc po nazwie"* (the owner, 01.11.2026)';
export const GATES = {};
export const LICENSED = {
  'src/engine/catalogue.js': { why: `T-CC2a F1: NEW, pure: DEPARTMENTS, SHEET_BRANDS, catalogueEntries, entryById, entriesOf over the generated data; ids never computed at run time. ${WHY}`, gates: [] },
  'src/engine/catalogueData.js': { why: `T-CC2a F1: NEW, generated append only by scripts/t-cc2a-catalogue.mjs: 589 entries (Egger 85 decors x 18/19/22/25, MDF, generic, Egger edging, hardware, paint), each id a literal written once. ${WHY}`, gates: [] },
};
export const LIVENESS = {};
export const GOLDENS = [];
export const REPINNED = [];
