/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// After T78 · the owner's AFTERNOON of 17.10.2026 (12:15, 14:15), named here so the strict run says why. Of the
// nesting sheet: *"zobacz, a w 01 bottom i top nie powinno byc odbicie lustrzane?"*; at 14:15: *"3 - lustro bottom
// i top, prosze, koduj"*. THE FAULT: every board's drawing is the board seen from the face the machine works (BUL from
// the inside with x from the front, BUR its mirror, the BOTTOM from above), and the TOP alone was drawn in the BOTTOM's
// frame, which for the TOP is the view from ABOVE, its outside. The puzzle's cuts are symmetric and hid it since turn
// 1; the notch, the recess bite, a divider's slots and a Cabineo pocket are not. THE LAW: the TOP is drawn from its
// UNDERSIDE, its frame the BOTTOM's mirrored across the width (y' = W_int - y, x unchanged, every closed walk read
// backwards), ONE mirror applied once at the end of computeCabinet after every producer has drawn in the frame it
// always drew in; panelPlacement('TOP') publishes the same frame, so the scene, the sheet and the file agree. LISP
// first: SKYLON_JOINTS_BISCUIT.lsp section J, KIT_NOTCH.lsp D11, KIT_RECESS.lsp D19, the Cabineo kit's frame table.
// THE GOLDENS MOVE, knowingly: every TOP record in the six changes bytes (the same cut, written from the other face);
// T75's and T78's goldens count points and holes and hold.

export const LICENSED = {
  'src/engine/topFrame.js': {
    why: 'Owner 17.10.2026 (14:15) · NEW: the one mirror. isBoxTop; producerPlacement (the ROT90 frame every producer '
      + 'inside computeCabinet draws the TOP in; panelPlacement for every other board); mirrorOutline (y\' = H - y, the '
      + 'walk reversed, a bulge carried), mirrorPocket (the rectangle, its pts, its Cabineo meta and export frame), '
      + 'mirrorRecordMeta (axis, lobes, end Y0 <-> YH, export at / axis / lobes / pts / box), mirrorArc, '
      + 'mirrorCornerName (x0y0 <-> x0y1), mirrorTopCnc, mirrorTopRecords (the pass over panels and drills). Pure data',
    gates: [],
  },
  'src/engine/cabinet.js': {
    why: 'Owner 17.10.2026 (14:15): mirrorTopRecords({ panels, drills }) once, after the notch\'s and the recess\'s '
      + 'drilling and the canopy, before cutDrills: the TOP\'s record and its drills turned into the underside frame. '
      + 'Nothing else moved; every board but the TOP is byte for byte what it was',
    gates: [],
  },
  'src/engine/joinery.js': {
    why: 'Owner 17.10.2026 (14:15): panelPlacement\'s TOP case is its own: origin at the BUR end of the top face, '
      + 'u +z, v -x, n +y, so u x v = -n like every other board (turn 13\'s "TOP is the exception" is closed). The '
      + 'BOTTOM case stands alone with the numbers it had. The drilling did not move in the cabinet: the record and the '
      + 'frame turned together (T26 sheet-vs-scene holds it)',
    gates: [],
  },
  'src/engine/dividerJoints.js': {
    why: 'Owner 17.10.2026 (14:15): the one producer that sets out a cut on the TOP by projecting a cabinet point now '
      + 'projects through producerPlacement (the ROT90 frame), so the end mirror turns it once, not twice: the head '
      + 'set of NUMBERS I.1 lands at y 423 on the underside drawing, x 459 in the cabinet, as the foot set does',
    gates: [],
  },
  'src/lib/ledGroove.js': {
    why: 'Owner 17.10.2026 (14:15): toPanel maps a unit x onto a box TOP as (box.x + box.w) - x, the underside frame; '
      + 'the BOTTOM, a shelf and the sides keep the mapping they had. Not in the frozen lighting list (engine/ledStrips, '
      + 'lighting, lightRig, the panels), and no groove number moved',
    gates: [],
  },
};

export const LISP = {
  'reference/lisp/SKYLON_JOINTS_BISCUIT.lsp': 'Owner 17.10.2026 (14:15): section J, THE TOP IS DRAWN FROM ITS '
    + 'UNDERSIDE (what was wrong, the law, biscuit-top-mirror-y, biscuit-top-mirror-pts, NUMBERS J); section C\'s frame '
    + 'table (the TOP\'s y from the BUR end); section I (the receiver carries drawnH, the TOP\'s across mirrored in '
    + 'biscuit-divider-end-cuts; NUMBERS I.1 and I.2: the TOP at y 423, the fixture\'s 441 named as T13\'s frame)',
  'reference/lisp/KIT_NOTCH.lsp': 'Owner 17.10.2026 (14:15): D11 (the TOP\'s frame; notch-top-pts, notch-top-fc); the '
    + 'NUMBERS block carries the BOTTOM and the TOP, the corner "x0y1" and its mark at (200 364)',
  'reference/lisp/KIT_RECESS.lsp': 'Owner 17.10.2026 (14:15): D19 (the TOP\'s frame, by section J and D11); CASE A\'s '
    + 'NUMBERS carry both boards, the TOP\'s corner at (150 254)',
  'reference/lisp/SKYLON_JOINTS_CABINEO.lsp': 'Owner 17.10.2026 (14:15): section C\'s frame table says what the TOP\'s '
    + 'underside frame is and that "drawn from the inside" is true of it now; the ends named per board',
};

// Re-pinned knowingly: the six, every one of which has a TOP. The same boards, the same holes, the same cut list
// (csvLines untouched, asserted); the TOP's record written from its underside. T75's and T78's goldens hold.
export const REPINNED = [
  { file: 'verify/t70/goldens-base.json (WARDROBE)', why: 'Owner 17.10.2026 (14:15, "lustro bottom i top"): the TOP\'s record mirrored across the width (y\' = W_int - y, the walk reversed); the BOTTOM and every other board byte-identical' },
  { file: 'verify/t70/goldens-base.json (BUD)', why: 'Owner 17.10.2026 (14:15): the same, on the BUD\'s TOP' },
  { file: 'verify/t70/goldens-base.json (WUD)', why: 'Owner 17.10.2026 (14:15): the same, on the WUD\'s TOP' },
  { file: 'verify/t70/goldens-base.json (BUDR)', why: 'Owner 17.10.2026 (14:15): the same, on the BUDR\'s TOP' },
  { file: 'verify/t70/goldens-base.json (BUDR4)', why: 'Owner 17.10.2026 (14:15): the same, on the BUDR4\'s TOP' },
  { file: 'verify/t70/goldens-base.json (PANTRY)', why: 'Owner 17.10.2026 (14:15): the same, on the PANTRY\'s TOP' },
];
