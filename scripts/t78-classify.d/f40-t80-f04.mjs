/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T80 F4 · THE FRAME ON THE CNC. The owner, 21.10.2026 (20:31): *"4 - cnc blum in frame"*; 22:03: *"raczej plyta, malo
// kiedy bedzie jeden ciag dluzszy jak 2800, a jak bedzie to bedziemy laczyc"*. The frame is an ordinary board in the
// DXF: its openings cut-out pockets (clockwise, the back window's layer), its caption anchored by labelAnchor.js (on a
// stile: its centre is an opening), its note (the run's name, the piece of how many) in its top rail, its EDGE arrow in
// its bottom rail (the sheet's bottom edge = the frame's bottom rail), numbered and stickered with the fronts, in the
// tree's fronts group; a frame longer than the chosen fronts sheet is the LISP's join, never a layout refusal. Every
// line here is reached only by a panel of role 'frame' (meta.inframe), which only an in-frame project cuts.

const OWNER = '*"4 - cnc blum in frame"*; *"raczej plyta ... a jak bedzie to bedziemy laczyc"* (21.10.2026)';

export const GATES = {};

export const LICENSED = {
  'src/engine/inframe.js': {
    why: `T80 F4: joinLimit (the owner's 2800 bounded by the chosen fronts sheet, the frame's height across its short `
      + `side), and the run element names its cabinets (unitNums) for the label. ${OWNER}`,
    gates: ['inframe'],
  },
  'src/engine/cabinet.js': {
    why: `T80 F4: the FRAME's meta.inframe carries unitNums and the bottom rail (rail) for the label and the arrow; the `
      + `extension.js import names RECESS_WINDOW_LAYER on its own line (the imports test's reader). ${OWNER}`,
    gates: ['inframe'],
  },
  'src/engine/cnc/dxf.js': {
    why: `T80 F4: panelNoteBlock lays a frame's note out in half its top rail (meta.inframe), so the words stand on the `
      + `board under the top edge and never over a cut-out; every other board's note box is what it was. ${OWNER}`,
    gates: ['inframe'],
  },
  'src/engine/cnc/partLabel.js': {
    why: `T80 F4: slopeNoteText says a frame's run (IN-FRAME RUN 01 02 DR01) and, joined, its piece (PIECE 1 OF 2 - `
      + `SQUARE BUTT AT A STILE); a board without meta.inframe prints what it printed. ${OWNER}`,
    gates: ['inframe'],
  },
  'src/engine/partNumbers.js': {
    why: `T80 F4: labelKindOf counts a frame with the fronts; edgeArrowOf points a frame's arrow DOWN (its bottom rail), `
      + `edgeArrowGeometry draws it inside the rail (meta.inframe.rail); every banded board's arrow is what it was. ${OWNER}`,
    gates: ['inframe'],
  },
  'src/engine/cnc/groups.js': {
    why: `T80 F4: groupOfPanel puts role 'frame' in the fronts group of the tree (under the run's owner, as the plinth `
      + `stands under its owner in the infills). The export presets are untouched. ${OWNER}`,
    gates: ['inframe'],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
