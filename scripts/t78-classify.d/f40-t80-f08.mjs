/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T80 F8 · THE WORKTOP SITS ON THE FRAME; THE FILLER IS A NOTE AND TIMBER ON THE SECTION. The owner, 21.10.2026 (22:14):
// *"stolarz wypelni ta dziure i blat pojdzie na wierzch"*; (22:40) *"6 informacja i na pdf na przekroju pokaz kawalek
// timber"*. Under in-frame (design.inframe, handed by every caller of worktopsFor) a slab over a framed run stands 19
// higher, on the frame's top edge, and reaches over the frame's face; a framed wall unit's cornice stands on the frame's
// top edge and meets its face (T80 PROPOSED); the 19 over a base carcass is the joiner's filler: a NOTE on the run's
// FRAME (the BOM's note row, the unit card), never a board, never a DXF, and timber, hatched and named, on the PDF
// section, beside the frame's rails (cut) and its stile (seen). Every line behind in-frame; lay-on is main's.

const OWNER = '*"stolarz wypelni ta dziure i blat pojdzie na wierzch"*; *"6 informacja i na pdf na przekroju pokaz kawalek '
  + 'timber"* (21.10.2026)';

export const GATES = {};

export const LICENSED = {
  'src/engine/cabinet.js': {
    why: `T80 F8: derived.inframe (frameT, outside, lip, rail, boardT, frontT, the base carcass's filler) for the drawings; `
      + `assemblies.cornice under in-frame on the frame's top edge (H + 19) and face (D + 25); the run's first FRAME `
      + `piece carries the filler note over a base run (meta.inframe.fillerNote, runWidth, mount). ${OWNER}`,
    gates: ['inframe'],
  },
  'src/engine/inframe.js': {
    why: `T80 F8: fillerNote, the note's words (Site filler 19 mm x <run width> under the worktop (joiner, not supplied)). ${OWNER}`,
    gates: ['inframe'],
  },
  'src/engine/worktop.js': {
    why: `T80 F8: worktopsFor takes inframe (the design's) and lifts a slab over a framed run by the rail's 19 outside, `
      + `its depth over the frame's face (liftForFrames); an L slab and an island are left as they are. A design-layer `
      + `piece computeCabinet never reads; without inframe every slab is what it was. ${OWNER}`,
    gates: [],
  },
  'src/engine/cornice.js': {
    why: `T80 F8: runCorniceParams takes topLiftOf (the store's, 19 on a framed unit), so a segment's stack starts on the `
      + `frame's top edge; without it the stack is what it was. ${OWNER}`,
    gates: [],
  },
  'src/engine/checks.js': {
    why: `T80 F8: the worktop cut-out lines read the slabs as the store resolves them (inframe from the design). ${OWNER}`,
    gates: [],
  },
  'src/engine/bom.js': {
    why: `T80 F8: the slabs as the store resolves them (inframe from the design), and the filler NOTE row under the run's `
      + `owner (role inframe_note, material note, counted in nothing, merged with nothing). ${OWNER}`,
    gates: ['inframe'],
  },
  'src/engine/hoodClearance.js': {
    why: `T80 F8: the worktop over a hob is read as the store resolves it (inframe from the design). ${OWNER}`,
    gates: [],
  },
  'src/engine/drawings/wallSheets.js': {
    why: `T80 F8: the fallback slab resolution passes the design's inframe, as the store's does. ${OWNER}`,
    gates: [],
  },
  'src/engine/drawings/setSection.js': {
    why: `T80 F8: buildStation draws, for a member with derived.inframe, the frame's stile (seen) and its two rails (cut), `
      + `and over a base carcass the timber filler, hatched, labelled site filler 19 (timber). Lay-on: nothing. ${OWNER}`,
    gates: ['inframe'],
  },
  'src/engine/drawings/unitCard.js': {
    why: `T80 F8: the run owner's card carries the filler NOTE under the front-gap note. ${OWNER}`,
    gates: ['inframe'],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
