/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// After T78 · the owner's AFTERNOON of 17.10.2026 (16:02 to 16:10), named here so the strict run says why. Cutting the
// CORNER_4MM marks in VCarve with the tool beside the line: *"VCarve tnie mi raz z jednej strony, raz z drugiej ...
// trzeba bedzie to ciac jako jeden L wektor"*; asked one L or two: *"jeden, zaczynajacy sie od lewej do srodka i
// kontynuacja na prawo, jeden L wektor; 2: obok linii."*  THE FAULT: D9's two legs both LEFT the corner, and the waste
// side of an open vector is a side of its direction: along one leg the waste lay to the right of the walk, along the
// other to the left, so one offset setting profiled the board on one leg. THE LAW: one open polyline of three points
// per re-entrant corner, in along the edge the outline arrives by, through the corner, out along the edge it leaves
// by, in the outline's own direction (anticlockwise, material on the left, waste on the right): the offset that
// profiles the outline's outside profiles the mark's waste side on both arms. LISP first: KIT_NOTCH.lsp D12
// (notch-corner-marks, notch-open-pline, notch-draw-corner-marks), KIT_RECESS.lsp D20, KIT_CORNER_L.lsp
// (CL:cornerMarks, CL:openPline, CL:drawCornerMarks). No golden counts a mark, so every golden holds; the six have no
// corner and are byte for byte what 1710g pinned.

export const LICENSED = {
  'src/engine/marks.js': {
    why: 'Owner 17.10.2026 (16:10) · NEW: a mark is an open walk. markPoints (its pts, or from to to), shiftMark, '
      + 'markLength: the one reader of a mark\'s points for the sheet, the DXF, the 3-D and the part detail',
    gates: [],
  },
  'src/engine/notch.js': {
    why: 'Owner 17.10.2026 (16:10): cornerMarksOf returns ONE open L per re-entrant corner, [a, v, b], walked the '
      + 'outline\'s way (KIT_NOTCH.lsp D12); cornerMarkRecords writes { layer, from: a, to: b, pts: [a, v, b] }; the '
      + 'keep-out filter and the re-origin read and move every point of a mark through engine/marks.js',
    gates: [],
  },
  'src/engine/topFrame.js': {
    why: 'Owner 17.10.2026 (16:10): the TOP\'s mirror reverses a mark\'s walk as it reverses the outline (the corner '
      + 'mark keeps its waste on its right), the pts with the ends',
    gates: [],
  },
  'src/engine/joinery.js': {
    why: 'Owner 17.10.2026 (16:10): jointLines and partCuts place every point of a mark (markPoints), so the scene '
      + 'draws the L the sheet draws',
    gates: [],
  },
  'src/engine/cnc/dxf.js': {
    why: 'Owner 17.10.2026 (16:10): a mark is written as the open polyline of its points: the corner mark ONE '
      + 'three-point LWPOLYLINE on CORNER_4MM, the biscuit line the two points it was',
    gates: [],
  },
  'src/engine/drawings/partDetail.js': {
    why: 'Owner 17.10.2026 (16:10): a mark\'s drawing carries its pts, its note the length of the whole walk, its '
      + 'label at the corner',
    gates: [],
  },
};

export const LISP = {
  'reference/lisp/KIT_NOTCH.lsp': 'Owner 17.10.2026 (16:10): D12 (the corner mark is one open L walked the outline\'s way: '
    + 'notch-corner-marks returns ((a v b) ...), notch-open-pline, notch-draw-corner-marks draws one open LWPOLYLINE per '
    + 'corner), the NUMBERS block (the L of the TOP, the BOTTOM and the shelf)',
  'reference/lisp/KIT_RECESS.lsp': 'Owner 17.10.2026 (16:10): D20 (the corner mark by KIT_NOTCH.lsp D12), CASE A\'s and '
    + 'CASE C\'s NUMBERS (one L per corner)',
  'reference/lisp/KIT_CORNER_L.lsp': 'Owner 17.10.2026 (16:10): CL:cornerMarks returns one open L ((a v3 b)), CL:openPline, '
    + 'CL:drawCornerMarks draws it as one open LWPOLYLINE (the ROT90 lay turns every point), the NUMBERS of TOP-L and SHELF-L',
};
