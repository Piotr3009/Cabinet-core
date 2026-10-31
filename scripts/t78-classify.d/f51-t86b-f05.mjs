/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T86B F5 . THE CHEST AS AN ISLAND (law 4). The owner, 30.10.2026 (22:52): *"cos jak wyspa ale przez grab i move"*;
// (22:56) *"1 - oba"*. A chest island record keeps its variant and its own overhang, its core the 0 deep line the two
// backs meet on; a kitchen island reads exactly as before (no key, the 50 mm least core, the 20 mm overhang). No kit's
// cut reads an island record; no golden is re-pinned.

const OWNER = '*"chest powinna byc mozliwosc odsuniecia od sciany ale nie na zasadzie back move tylko powinna byc '
  + 'mozliwosc na srodku pokoju cos jak wyspa ale przez grab i move; i dodanie panela z tylu lub polaczenie szuflad z 2 '
  + 'stron"* (30.10.2026, 22:52); *"nie koniecznie nawis, nawis jako opcja prosze; 1 - oba"* (22:56)';

export const GATES = {};

export const LICENSED = {
  'src/engine/room.js': {
    why: `T86B F5: migrateIsland keeps chestIsland { variant: 'panel' | 'double' } and islandOverhangMm on a chest island `
      + `and lets its core be 0 deep; islandFaces hands both to the faces the slab reads. ${OWNER}`,
    gates: [],
  },
  'src/engine/island.js': {
    why: `T86B F5: islandClash measures a chest island's back panel (a FREE PANEL) with the island, so a move or a turn `
      + `that would carry it through a wall or into a unit is refused in words. ${OWNER}`,
    gates: [],
  },
  'src/engine/worktop.js': {
    why: `T86B F5 (law 6): islandSlab over a chest island overhangs by the island's own islandOverhangMm (0 by default) `
      + `in place of the kitchen's front overhang. ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
