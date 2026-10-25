/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F21 · THE FRONTS' OWN DIMENSIONS. The owner, 24.10.2026 (19:34): *"jak mamy szuflady to nie pokazuje
// dokladnie wymiarow frontow i przerw pomiedzy nimi czy pomiedzy drzwiami tylko 207 i 200 co nie ma sensu"*. The
// height chain is FRONT, GAP, FRONT and one unit's own stack (engine/drawings/wallElevation.js frontStacks,
// frontChainLines: T41 F5c's drop rule retired, no two units' edges pooled, so the BUDR2 reads 363 · 3 · 360 and
// no false 3 appears on a lay-on run); the width chain gains LEAF, GAP, LEAF (leafChains): the floor run's on the
// second line under its unit chain with the overall stepped out to the third, a hung run's under its wall units in
// the open wall (engine/drawings/setElevation.js runChains). A figure that does not fit its segment is lifted
// beside the chain on a leader by T71's own grammar (setChains.js, untouched). Drawing modules only:
// computeCabinet reads none of them. DRAFT by slice E2 for INT: copy to scripts/t78-classify.d/f43-t82-f21.mjs.

const OWNER = '*"nie pokazuje dokladnie wymiarow frontow i przerw pomiedzy nimi czy pomiedzy drzwiami"* (24.10.2026, 19:34)';

export const GATES = {};

export const LICENSED = {
  'src/engine/drawings/wallElevation.js': {
    why: `T82 F21: frontStacks (every unit's own face fronts, FRONT, GAP, FRONT; T41 F5c's floorMm drop retired), `
      + `frontChainLines (stacks that overlap in height step out a line), leafChains (LEAF, GAP, LEAF, with or `
      + `without the run's carcass ends); heightChains publishes the stacks; verticalChains draws them. ${OWNER}`
      + ' After the C/D/E review (sheets 1): isFaceFront leaves out a leaf that does not look at the elevation (an L corner\'s B-arm door along z, the projector\'s own law), so the A leaf\'s width is on the chain.',
    gates: [],
  },
  'src/engine/drawings/setElevation.js': {
    why: `T82 F21: runChains draws the stacks up the right, the floor run's leaf chain on the second line under `
      + `its unit chain (the overall to the third) and a hung run's leaves under its wall units, on the fronts and `
      + `X-ray sheets. ${OWNER}`,
    gates: [],
  },
};

LICENSED['src/engine/drawings/setChains.js'] = {
  why: `T82 F21, after the review: a lifted figure whose alternating level is already taken at its spot takes the `
    + `other level, then the row just off the line beside its own arrows (a chain with no extension lines), then a `
    + `third level; where nothing stood in the way every figure stands where T71 put it (the walk's kitchen's sheets `
    + `byte for byte). The HAWA pocket's 1.5 · 22 · 3 needs three spots. After the C/D/E review: chainV's compact `
    + `mode (a gap's figure beside its own arrows first) and chainReachX, so the front chains step in and stay inside `
    + `their band. ${OWNER}`,
  gates: [],
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
