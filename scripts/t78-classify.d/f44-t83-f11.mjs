/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T83 F11 · EXPORT THE SHEETS YOU CHOOSE. The owner, 25.10.2026 (22:41): *"daj mozliwosc exportowania tylko
// naprzyklad frontow lub cos takiego, nie koniecznie wszystkie strony na raz"*. The Drawings window ticks the sheets
// of the set (its own state, never the project); the engine's two pure readers bind what it hands them:
// pickedSheets (the ticked, in the set's order) and numberPages (each bound page's SHEET cell counts the pages bound,
// 01 / 03 to 03 / 03; the whole set in order is the same objects). The PDF and the DXF writers number what they bind.
// Drawing modules and the drawing export only: computeCabinet reads none of them, no cut, no CNC, no BOM moves.
// DRAFT by slice E1 for INT.

const OWNER = '*"daj mozliwosc exportowania tylko naprzyklad frontow lub cos takiego, nie koniecznie wszystkie strony na raz"* (25.10.2026, 22:41)';

export const GATES = {};

export const LICENSED = {
  'src/engine/drawings/wallSheets.js': {
    why: `T83 F11: pickedSheets (the sheets the window ticked, in the set's order, the set's own entries) and `
      + `numberPages (copies of the bound sheets whose SHEET cell reads n / N counting the pages bound, stamp's two `
      + `digits; a page already reading its place is handed back as it is, so the whole set is byte for byte). `
      + `wallDrawingSheets untouched. ${OWNER}`,
    gates: [],
  },
  'src/lib/drawingExport.js': {
    why: `T83 F11: exportWallDrawingsPdf and exportWallDrawingsDxf bind the sheets they are handed through `
      + `numberPages, so three of nine print 01 / 03 to 03 / 03 and the whole set prints what it printed. ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
