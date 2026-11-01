/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1b F4 . THE LIBRARY IS THE RAIL'S (law 4). LICENSED engine DATA and BOOK files: library.js rows, types.js UNIT_CATEGORIES; computeCabinet reads neither; no gate, no golden.
const WHY = '*"Library powinno byc po lewej, w menu kitchen, rozwijac prawy panel"*; *"po co blokowac wyspe w pokoju albo mala szafe w kuchni"*; *"wszystkie rodzaje po lewej, czesc coming soon"*; *"lazienki w kuchniach"* (the owner, 01.11.2026)';
export const GATES = {};
export const LICENSED = {
  'src/engine/library.js': { why: `T-CC1b F4.2/F4.3: BATHROOM_GROUP leaves KITCHEN_LIBRARY and WARDROBE_LIBRARY as BATHROOM_LIBRARY, its own family; filterLibraryByProject and EVERY_JOB_FAMILIES deleted with the project-type gate. Rows only. ${WHY}`, gates: [] },
  'src/engine/types.js': { why: `T-CC1b F4.2: UNIT_CATEGORIES is Kitchen, Wardrobes, Bathroom, Sets, Saved sets, then Media wall, Hallway, Office held open as soon (no types by design); categoryOf answers bathroom for the four bathroom kits. The categories list only. ${WHY}`, gates: [] },
};
export const LIVENESS = {};
export const GOLDENS = [];
export const REPINNED = [];
