/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC2a F6 . SHEETS ARE COUNTED (law 6). The one offcut number in the profile; the invoice reads it. No gate, no golden.
const WHY = '*"dajmy 10 procent na offcuts bo zawsze zaokraglamy do gory, nawet jesli wyjdzie 2.1 plyty musimy zamowic 3"* (the owner, 01.11.2026, 13:28)';
export const GATES = {};
export const LICENSED = {
  'src/engine/bom.js': { why: `T-CC2a F6: sheets = ceil(m2 x yield / (w x l / 1e6)) from the link\'s sizes and yield or profile.materials.sheetYield; the cost by the stock row\'s unit. ${WHY}`, gates: [] },
  'src/engine/profile.js': { why: `T-CC2a THE NUMBERS: materials.sheetYield 1.10, spray.solventPct 5, spray.primerCoats 1, projectSettings.defaultCarcassDecorId read for the new item; bom.wastePct deleted (the Deletion licence). ${WHY}`, gates: [] },
  'src/engine/bomInvoice.js': { why: `T-CC2a F6.1: bomWastePct reads profile.materials.sheetYield, the one offcut number (the second, bom.wastePct 15, deleted by the Deletion licence). ${WHY}`, gates: [] },
};
export const LIVENESS = {};
export const GOLDENS = [];
export const REPINNED = [];
