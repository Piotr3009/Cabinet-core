/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T81 F2 · THE SHEET LIST, IN THE OWNER'S ORDER. The owner, 22.10.2026 (21:23): *"najpierw chce widziec 3d jak zrobiles
// pierwsza strona, pozniej chce widziec wszystkie fronty ... nastepnie widok wszystkich scian bez frontow ... pozniej
// przekroj z gory, i pozniej przekroje pionowe, a na koncu wizualizacja"*; (22:57) *"to tez mozna zrobic x-ray"*. The set
// is 01 3D (the room in perspective through the projector, the cover's index and revisions in its column), every
// wall's fronts, every wall without fronts, every wall in X-ray (new, through the projector), the two plans, every
// wall's sections, the visualisation, the cut list. Drawing modules only: computeCabinet reads none of them.

const OWNER = '*"najpierw chce widziec 3d jak zrobiles pierwsza strona ... a na koncu wizualizacja"* (22.10.2026)';

export const GATES = {};

export const LICENSED = {
  'src/engine/drawings/wallSheets.js': {
    why: `T81 F2: the set in the owner's order, numbered from 01; the cover as a page of its own retired into the 3D `
      + `sheet's column (T81 PROPOSED); the X-ray sheet per wall. ${OWNER}`,
    gates: [],
  },
  'src/engine/drawings/setElevation.js': {
    why: `T81 F2: buildRunElevation takes a mode; the X-ray sheet is drawn through the projector (the boards, the `
      + `hardware and the handles the room draws, the unit numbers, the appliance words, the building, the chains). ${OWNER}`,
    gates: [],
  },
  'src/engine/drawings/setPerspective.js': {
    why: `T81 F2: buildRoom3d, the 3D sheet: every run of the room through the projector's perspective, its building `
      + `hidden behind the units, the unit numbers on their faces. ${OWNER}`,
    gates: [],
  },
  'src/engine/drawings/setSheet.js': {
    why: `T81 F2: indexColumn, the cover's project, sheet index and revisions in the 3D sheet's right-hand column. ${OWNER}`,
    gates: [],
  },
  'src/engine/drawings/setPaper.js': {
    why: `T81 F2: buildCover deleted (kasacja): the cover as a page of its own is retired into the 3D sheet's column; `
      + `the cut list and the visualisation are untouched. ${OWNER}`,
    gates: [],
  },
  'src/engine/drawings/projector.js': {
    why: `T81 F2: the 3D sheet's building (the floor, the ceiling and the wall ends) hidden behind the solids like any `
      + `edge (projectRoom's extras). ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
