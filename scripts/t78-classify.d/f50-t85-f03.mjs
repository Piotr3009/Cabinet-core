/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T85 F3 . THE STORE: THE COLUMN FOLLOWS THE RECESS (KIT_RECESS.lsp D29, CLAUDE.md PART B). The owner, 30.10.2026:
// when the cabinet moves (or the recess changes in Room) the store stands the recess column's marked dividers on the
// band's edges where the carcass now stands, takes away a divider whose edge left the carcass (or came within 30 of a
// side), and when the band leaves the carcass and the carcass alone cannot hold the drawers (D27) takes the drawers
// and their two dividers in the move's own undo step and says so in words. src/lib/recessColumn.js is the pure plan;
// its walls and its bay are the engine's own (recessColWalls, recessColZone). Nothing cut: computeCabinet() never
// reads the lib, no gate, no golden; the six hold byte for byte.

const OWNER = '*"jak przesuwam i mam recess lub komin to mi sie ladnie zmienia ksztalt elementow, to dziala super, ale '
  + 'jak mamy szuflady w recess to juz sie tak nie przesuwa, tylko przy przesunieciu calej szafy szuflady znikaja a '
  + 'zostaja dividery ktore sie robia do samej gory, nie powinno tak byc"*; *"2 - nie, tutaj musi byc minimum 30 mm"*; '
  + '*"3 - znikaja z szufladami, bo to sa dividery do szuflad"* (30.10.2026)';

export const GATES = {};

export const LICENSED = {
  'src/lib/recessColumn.js': {
    why: 'T85 F3 (KIT_RECESS.lsp D29): NEW, pure, followPlan(unit, band, profile): the moves of the marked dividers '
      + '(meta.recessColumn) onto the band\'s edges at the face, the divider whose edge is a SIDE or a RETURN removed, '
      + 'one put back where an edge is a DIVIDER again, the drawers\' zone (recessColZone), and the column that leaves '
      + '(no band, a band off the floor): kept where the ladder holds the carcass\'s depth (D27), else its drawers and '
      + 'dividers removed with the notice. The walls are engine/extension.js recessColWalls, the 30 the notch table\'s '
      + `'recess.minColumnSide'. Read by stores/projectStore.js only; computeCabinet() never reads it. ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
