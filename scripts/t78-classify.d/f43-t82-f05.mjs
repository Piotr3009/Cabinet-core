/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F5 · CNC: THE PANELS' HOLES AND THE DOOR'S CUPS. CLAUDE.md T82 F5: *"the hole patterns of F1(d) as drill
// operations on the pocket panels (fi 4.5 pilot PROPOSED 3 mm diameter 10 deep ...), on the layer grammar the CNC
// already has for hinge plates; the door's cups and holes as the hinge drilling is done today (fi 35 x 13, fi 5 x 13,
// fi 8 x 13). The CNC export fingerprint of every EXISTING fixture is unchanged (FROZEN 2)."*  engine/cnc/hawa.js
// seats every part's own LISP holes (meta.pocket.holes, KIT_HAWA.lsp D10 to D14) in the house's frame for that board
// (a panel left of the pocket as BUL, right as BUR, the door as a FRONT, the bottom across and back), the III/35
// grooves as pockets on the door; five CNC layers (ACI 54 to 58, KIT_HAWA.lsp createHawaLayers), their machining
// policy, and the boards' placements for the room and the sheets. Reached only by a HAWA_POCKET (A2's gate). The
// fingerprint of every existing case is unchanged (scripts/cnc-fingerprint.mjs base d0f84ebe to head: HAWA rows
// added, none moved). A2's two NEW goldens carry the drills and the grooves: written again in this F.

const OWNER = '*"zaczniemy od hawa dodanie"*, *"potrzebujemy zaprojektowac to jako wstawienie pomiedzy 2 panele"* '
  + '(25.10.2026); CLAUDE.md T82: *"The manufacturer\'s sheet is the law of the hardware"*';

export const GATES = {};

export const LICENSED = {
  'src/engine/cnc/hawa.js': {
    why: `T82 F5: hawaDrills (the LISP's holes seated in each board's CNC frame, a depth only where blind, kinds that `
      + `never say screw), hawaGroovesOnto (III/35, HAWA_GROOVE_12MM, 12 deep), hawaSeatsOnto (meta.pocket.seat). ${OWNER}`,
    gates: ['hawaPocket'],
  },
  'src/engine/cabinet.js': {
    why: `T82 F5: the pocket's drills pushed beside the Cabineo's, its grooves and its seats, only where result.hawa `
      + `exists. ${OWNER}`,
    gates: ['hawaPocket'],
  },
  'src/engine/cnc/layers.js': {
    why: `T82 F5: five rows, HAWA_3MM 54, FRONT_HINGES_5MM 55, FRONT_HINGES_8MM 56, HAWA_FOOT_35MM 57, `
      + `HAWA_GROOVE_12MM 58; a file declares only the layers it uses, so no existing file changes. ${OWNER}`,
    gates: ['hawaPocket'],
  },
  'src/engine/machining.js': {
    why: `T82 F5: the five classes drawn, each with its reason (T26 F3.3: silence is not allowed). ${OWNER}`,
    gates: ['hawaPocket'],
  },
  'src/engine/joinery.js': {
    why: `T82 F5: panelPlacement reads the pocket's boards (POCKET-A / POCKET-B by meta.pocket.seat as BUL or BUR, `
      + `POCKET-DOOR as a FRONT, POCKET-BOTTOM / POCKET-TOP across and back); every other part is placed as it was. ${OWNER}`,
    gates: ['hawaPocket'],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
