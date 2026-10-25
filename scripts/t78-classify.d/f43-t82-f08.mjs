/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F8 · THE LISP OF THE VANITY, FIRST. The owner, 25.10.2026 (12:57): *"pamietaj ze nie ma plecow na vanity unit
// tylko sa poziome poprzeczki na dole i na gorze, plecy sa jakby wyciete"*; 13:03, over the mockup: *"2 wyciecie u
// dookola zeby sie szuflada otwierala, 3 - 80, 4 - 100 na material carcasa grubosc, 5 - blat osobny element jak
// worktop, 6 - do BOM tez, 7 - tak"*. A NEW kit, reference/lisp/KIT_VANITY.lsp (the drawer base with its back cut out:
// RAIL-BOTTOM and RAIL-TOP keeping the back's joint that lands inside them, the service void, equal overlay drawers,
// THE TWO COLUMNS the chest takes too, the trap's U and Check #39's sentences, plinth or floating), and its numbers as
// profile.vanity. Nothing here is read by computeCabinet: F8 writes the law, B2 (F9) cuts it. A new LISP file needs no
// LISP licence (the export is for an existing file an F amends); its paren row is test/turn35-lisp-parens.test.js.

const OWNER = '*"nie ma plecow na vanity unit tylko sa poziome poprzeczki na dole i na gorze, plecy sa jakby wyciete"* (25.10.2026, 12:57)';

export const GATES = {};

export const LICENSED = {
  'src/engine/profile.js': {
    why: `T82 F8: profile.vanity { serviceVoidMm 80, railHeightMm 100, trapWidthMm 160, trapDepthMm 120, trapRadiusMm 20, `
      + `trapClearMm 60, wasteFromBackMm 200, basin, defaults, hangers }, each the constant of KIT_VANITY.lsp section 3 `
      + `(CONFIRMED in the owner's words or PROPOSED), and its key-by-key merge in migrateCabinetProfile. computeCabinet `
      + `reads no vanity key (test/turn82-f08-vanity-lisp.test.js cuts BUD, BUDR, BUDR2, BUDR4, SINK, WARDROBE and `
      + `WARDROBE_CHEST3 with and without the block). ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
