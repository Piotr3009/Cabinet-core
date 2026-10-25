/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F10 (slice B3) · THE VANITY'S TOP IS THE HOUSE WORKTOP. The owner, 25.10.2026: *"dodanie blat grubosc do
// wyboru"*, (13:03) *"5 - blat osobny element jak worktop"*. engine/worktop.js: serviceVoidOf (0 for every unit that
// is not a vanity) added to the slab's reach, so the top reaches the wall over the vanity's service void. A
// design-layer auto-part: computeCabinet neither knows nor asks about it (T30's law), so no golden can reach it.
// The store's birth line and setWorktopThickness, and the right panel's one field, are not engine/lib files.
// Draft for INT: drop into scripts/t78-classify.d/ as f43-t82-f10.mjs.

const OWNER = 'The owner, 25.10.2026 (12:57): *"dodanie blat grubosc do wyboru"*; (13:03) *"5 - blat osobny element '
  + 'jak worktop"*, *"3 - 80"*.';

export const GATES = {};

export const LICENSED = {
  'src/engine/worktop.js': {
    why: 'T82 F10: serviceVoidOf (the carcass\'s stand-off beyond the house\'s clearance, for a vanity only; 0 for '
      + 'every other unit) and the slab\'s reach plus it, so the vanity\'s top reaches the wall over the pipes. A '
      + 'design-layer slab: computeCabinet never reads worktop.js. After the review (topbasin 2, 3): a lone vanity '
      + 'takes its own top as a desk does (isLoneTopUnit, at the gate and when a record is resolved), and the '
      + `island's slab reads the record's thickness (slabThickness), as every other slab does. ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
