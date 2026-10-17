/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// After T78 · the owner's LATE MORNING of 17.10.2026 (11:08 to 11:27), named here so the strict run says why. Of a
// full-height divider: *"na dividerze mamy wiercenie 3 mm w bottom ale nie mamy w top, a nie ma przeciez fix shelves
// zeby divider sie zatrzymal, i do tego nie mamy ciastek"*; asked whether the T13 set goes on the TOP and the BOTTOM in
// place of T30's two bare foot screws: *"tak"*; of a fix shelf under or over a divider: *"jak mamy polke fix to robisz
// tylko ciastka bez nawiertow"*; whatever the carcass joint system, as the fix shelf's joint is: *"tak, koduj"*.
// LISP first: SKYLON_JOINTS_BISCUIT.lsp section I (the law T23 said no kit had), balanced before the engine moved.

export const LICENSED = {
  'src/engine/dividerJoints.js': {
    why: 'Owner 17.10.2026 · NEW: the mirror of SKYLON_JOINTS_BISCUIT.lsp section I. Every VPART\'s foot and head finds '
      + 'its receiver (BOTTOM / TOP, a FIX shelf, a drawer stack\'s PARTITION) by face height and run; the joint line is '
      + 'the overlap in depth, the datum its front end, the across the divider\'s centre line, both projected into the '
      + 'receiver\'s own CNC frame through panelPlacement; the set through engine/biscuits.js (two dia 3 through screws '
      + 'and the 70 mark per set on a concealed receiver, the mark alone on a shelf); nothing on the divider itself '
      + '(T26 F7.1). Pure data: drills in addDrill\'s shape, marks in the fixed shelf\'s record shape',
    gates: [],
  },
  'src/engine/cabinet.js': {
    why: 'Owner 17.10.2026: dividerJointCuts beside the fixed shelf\'s joint (its drills through addDrill as '
      + 'divider_screw on SCREWS_3MM, its marks into shelfJointMarks before the one writer); the interactive VPART out '
      + 'of T30\'s partitionFoot list (the set\'s four screws stand on the same centre line; the wardrobe kit\'s DP keeps '
      + 'drawWardrobeDPHolesBOTTOM); derived.dividerJoints for the tests and the sheet. A cabinet with no VPART is '
      + 'untouched, which is why the six and every golden hold',
    gates: [],
  },
  'src/engine/partitionFixings.js': {
    why: 'Owner 17.10.2026: the note under THE TOP TAKES NOTHING says the owner answered the question it named: the '
      + 'interactive divider\'s ends are SKYLON_JOINTS_BISCUIT.lsp section I\'s, the foot here is the DP\'s alone. '
      + 'A comment; not one number or line of code moved',
    gates: [],
  },
};

export const LISP = {
  'reference/lisp/SKYLON_JOINTS_BISCUIT.lsp': 'Owner 17.10.2026: section I, THE DIVIDER\'S HEAD AND FOOT: the history '
    + '(T13 set, T23 subtraction, T30 foot, the named TOP gap), the joint (BOTTOM and TOP concealed: screws and marks; a '
    + 'fix shelf or any other horizontal board: the mark alone; the divider itself nothing), the overlap joint line and '
    + 'its front datum, the frames, biscuit-divider-receiver, biscuit-divider-end-cuts, biscuit-divider-x, NUMBERS I.1 '
    + 'and I.2 (the fixture\'s cases A and B of 09.08.2026 to the decimal)',
};
