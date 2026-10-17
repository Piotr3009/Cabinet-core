/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// After T78 · the owner's MORNING of 17.10.2026 (07:44 and his answers of 07:56), named here so the strict run says
// why. *"jak mamy recess to super dziala, polki tez wycina ale nie wycina polek fix, czego nie rozumiem"*; *"element
// ktory jest frontowy jak najezdzasz na komin lub jak masz recess i back przykrywa to masz wkrety na niej a to nie
// dobrze bo nie bedziemy tam wkrecac wkretow, system wkrety dookola plecow w tym przypadku nie zadziala ... bedziemy
// montowac na ciastka (w przyszlosci dodamy lamello) teraz nic"*; *"wycinanie L shape polek etc nie, nie dodawaj
// wiercenia, dodaj jeden layer w samym cornerze okolo 40 mm w kazda strone na linii L shape i nazwij to corner 4 mm,
// wtedy ja wytne ten korner"* (asked: on all of them: *"na wszystkich"*); *"jak mamy szafe z czesciowa wneka i
// wstawimy divider to polki sie rozciagaja w ksztalcie trojkata do tylnej sciany"*. LISP first: KIT_RECESS.lsp D15
// to D18, KIT_NOTCH.lsp D9 and D10, KIT_CORNER_L.lsp section 4, all balanced before the engine moved.

export const LICENSED = {
  'src/engine/extension.js': {
    why: 'Owner 17.10.2026: D15 recessShelfBump clamps the bump to the shelf (a bay shelf beside a divider got a point '
      + 'beyond its own end and a slant: the PROBE\'s (960, 0) and (-200, 0)), recessShelfGrowsP; D16 the fixed shelf '
      + 'grows like any other (the engine\'s own exception gone, its joint the parent\'s); D17 no screw between the BACK '
      + 'and the box: recessBackJoints drops the window\'s columns and rows, recessReturnScrews / recessLidScrews / '
      + 'recessExtBackScrews answer []; D18 the CORNER_4MM marks (cornerMarkRecords on the nominal outline) replace the '
      + 'dog-bone holes on the grown sides, TOP, BOTTOM, the BACK\'s bite and corner, and the shelves. The *Dogbones '
      + 'routines stay as the record',
  },
  'src/engine/notch.js': {
    why: 'Owner 17.10.2026: D9 the corner mark: signedArea2, legPoint, cornerMarksOf (re-entrant vertices of a nominal '
      + 'outline, two legs of cnc.cornerMarkLeg clamped to the edge), cornerMarkRecords (cnc.marks on CORNER_4MM); the '
      + 'notch\'s side, TOP, BOTTOM, BACK and shelves carry the marks and no notch_dogbone hole (notchDogbone and its '
      + 'family stay as the record). D10 no screw between the BACK and the box: notchBackJoints drops the nearX column '
      + '(whole at full height, the run beside a part-height notch); notchStepScrews / notchReturnScrews / '
      + 'notchLidScrews answer null, their old bodies kept as *StatedUntil1710. notchProfile reads cnc.cornerMarkLeg',
  },
  'src/engine/cabinet.js': {
    why: 'Owner 17.10.2026 ("na wszystkich"): the L corner\'s TOP-L, BOTTOM-L and SHELF-L carry the CORNER_4MM marks '
      + 'from v3 along the two fronts (cornerMarkRecords on shape.nominal) and no relief circle (curves: []); the '
      + 'puzzle dog bones beside the tabs unchanged. Imports notchProfile, notchP, cornerMarkRecords',
  },
  'src/engine/profile.js': {
    why: 'Owner 17.10.2026: cnc.cornerMark.legMm 40 ("okolo 40 mm w kazda strone") and puzzle.layers.cornerMark '
      + 'CORNER_4MM ("nazwij to corner 4 mm"). Two names, no other number moves',
  },
  'src/engine/cnc/layers.js': {
    why: 'Owner 17.10.2026: CORNER_4MM, ACI 53, kind mark: the corner mark\'s layer, written to the DXF as an open '
      + 'two-point polyline like the biscuit line',
  },
  'src/engine/machining.js': {
    why: 'Owner 17.10.2026: the CORNER_4MM policy: a MARK, not drawn as a bore (nothing is removed by it); the sentence '
      + 'mirrored in verify/t26/sheet-vs-scene.md',
  },
};

export const LISP = {
  'reference/lisp/KIT_RECESS.lsp': 'Owner 17.10.2026: D15 (recess-shelf-bump clamped to the shelf, recess-shelf-grows-p), '
    + 'D16 (the fixed shelf grows: D10 names any shelf), D17 (recess-back-joints without the window rows; '
    + 'recess-return-screws, recess-lid-screws, recess-ext-back-screws nil), D18 (notch-corner-marks on CORNER_4MM in '
    + 'recess-draw-board, the dog bones retired from the drawing), D9 and D11 pointed at them, the NUMBERS block (CASE A, '
    + 'CASE B, the new CASE C of the PROBE)',
  'reference/lisp/KIT_NOTCH.lsp': 'Owner 17.10.2026: D9 (notch-signed-area2, notch-leg-point, notch-corner-marks; '
    + 'cnc.cornerMarkLeg 40 in notch-profile; notch-ensure-corner-layer, notch-draw-corner-marks in notch-draw-board, the '
    + 'circle no longer drawn), D10 (notch-back-joints without the nearX rows; notch-step-screws, notch-return-screws, '
    + 'notch-lid-screws nil, their bodies kept as *-stated-until-1710), section 2 and section 5 amended, the NUMBERS block',
  'reference/lisp/KIT_CORNER_L.lsp': 'Owner 17.10.2026 ("na wszystkich"): section 4 the corner mark, not the dog bone; '
    + 'CL:cornerMarkLeg, CL:legPoint, CL:cornerMarks, CL:ensureCornerLayer, CL:drawCornerMarks; drawCL_LBOARD and '
    + 'drawCL_LBOARD_ROT90 draw the marks and no relief circle (CL:innerRelief kept as the record); the NUMBERS of TOP-L '
    + 'and SHELF-L',
};

// Re-pinned knowingly: the three goldens the law moved, nothing else. The six base goldens, T75's L goldens and T78's
// L goldens hold byte for byte (no notch, no recess; the L's summary counts no curve and no mark).
export const REPINNED = [
  {
    file: 'fixtures/golden-notch.json',
    why: 'Owner 17.10.2026 (KIT_NOTCH.lsp D9, D10): no dog bone drilled on TOP, BOTTOM and SHELF-1 (holes 1 -> 0; the '
      + 'CORNER_4MM marks stand there), the BACK\'s notch-edge row into the RETURN\'s end gone (SCREWS_3MM|BACK 14 -> 10); '
      + 'outlines, the box boards and every other drilling unchanged',
  },
  {
    file: 'fixtures/golden-recess.json',
    why: 'Owner 17.10.2026 (KIT_RECESS.lsp D17, D18): no dog bone on TOP, BOTTOM and SHELF-1 (holes 1 -> 0), no column '
      + 'through the BACK into RETURN-L\'s end (SCREWS_3MM|BACK 13 -> 10); outlines and boards unchanged',
  },
  {
    file: 'fixtures/golden-recess-band.json',
    why: 'Owner 17.10.2026 (KIT_RECESS.lsp D17, D18): the twelve hand-fix screws round the window gone (SCREWS_3MM|BACK '
      + '26 -> 14, the parent\'s own), the shelf\'s two bump corners marked, not boned (holes 2 -> 0)',
  },
];
