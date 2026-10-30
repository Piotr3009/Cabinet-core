/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T85 F1 . LISP FIRST: KIT_RECESS.lsp D29 THE RECESS COLUMN FOLLOWS THE RECESS, D30 THE RETURNS ARE ON CABINEO, D31
// THE SWING, dated 30.10.2026 under D28; section I3 (recess-col-wall to recess-return-cabineo) and its NUMBERS I4 (the
// five cases of the mockup); recess-col-refusal AMENDED (the band reaching a side no longer refuses, the dividers' test
// asks only the edges whose wall is a DIVIDER). KIT_NOTCH.lsp's table carries recess.minColumnSide 30, the table
// KIT_RECESS.lsp reads; profile.recess.minColumnSideMm 30 and notchProfile's 'recess.minColumnSide' its engine mirror.
// The owner, 30.10.2026 (20:17 to 20:48): *"jak mamy szuflady w recess to juz sie tak nie przesuwa"*; *"1 - cabineo"*;
// *"2 - nie, tutaj musi byc minimum 30 mm"*; *"default zawiasy prosze zrob 90 stopni"*. A number read by nothing the
// engine cuts until F2: computeCabinet() reaches no changed line; no gate, no golden; the six hold byte for byte.

const OWNER = '*"jak mamy szuflady w recess to juz sie tak nie przesuwa, tylko przy przesunieciu calej szafy szuflady '
  + 'znikaja a zostaja dividery ktore sie robia do samej gory, nie powinno tak byc"*; *"1 - cabineo, 2 - jesli wneka '
  + 'wychodzi poza szafe to zostaje jeden divider"*; *"2 - nie, tutaj musi byc minimum 30 mm"*; *"3 - znikaja z '
  + 'szufladami, bo to sa dividery do szuflad"*; *"default zawiasy prosze zrob 90 stopni"* (30.10.2026)';

export const GATES = {};

export const LICENSED = {
  'src/engine/profile.js': {
    why: `T85 F1: recess.minColumnSideMm 30 (KIT_RECESS.lsp D29), the smallest slot beside a side in a recess column; `
      + `read through notchProfile only, by the recess column of F2. ${OWNER}`,
    gates: [],
  },
  'src/engine/notch.js': {
    why: `T85 F1: notchProfile carries 'recess.minColumnSide' (profile.recess.minColumnSideMm, 30), as KIT_NOTCH.lsp's `
      + `notch-profile does: one more row of the table, read by nothing a notch cuts. ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];

export const LISP = {
  'reference/lisp/KIT_RECESS.lsp': `T85 F1 (30.10.2026): D29 THE RECESS COLUMN FOLLOWS THE RECESS, D30 THE RETURNS ARE `
    + 'ON CABINEO (D11 amended for a RETURN so joined), D31 THE SWING; section I3 (recess-col-wall, recess-col-walls, '
    + 'recess-col-wall-p, recess-col-divider-count, recess-col-zone, recess-col-box-span, recess-col-bottom-edges, '
    + 'recess-col-cap-edges, recess-col-bottom-outline-walls, recess-col-cap-outline-walls, recess-col-top-joints-walls, '
    + 'recess-col-return-full, recess-col-return-full-place, recess-col-box-places-walls, recess-col-wall-fillers, '
    + 'recess-col-dead-pockets, recess-return-cabineo) and NUMBERS I4 (CASE G a to e); recess-col-refusal AMENDED; '
    + `table A names recess.minColumnSide; the head names SKYLON_JOINTS_CABINEO.lsp. ${OWNER}`,
  'reference/lisp/KIT_NOTCH.lsp': `T85 F1 (30.10.2026, KIT_RECESS.lsp D29): notch-profile carries "recess.minColumnSide" `
    + `30.0, the table KIT_RECESS.lsp reads. ${OWNER}`,
};
