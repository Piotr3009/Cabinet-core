/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC2a F5 . ONE PRODUCT, ONE LINE (laws 4, 5, 7). The purchase list keyed by catalogue id and priced through the company's links; the exports print its words. No quantity of the engine moves; computeCabinet reads none of it; no gate, no golden.
const WHY = '*"jedne produkt osobna linia, proste"*; *"jesli CC wybierze MDF 25 a nie mamy przypisanego materialu z JC to bedzie napisane MDF 25 materials not assigned"* (the owner, 01.11.2026)';
export const GATES = {};
export const LICENSED = {
  'src/engine/bom.js': { why: `T-CC2a F3.2, F5: purchaseBom keyed cat:<id> off the cut list\'s own catalogue ids, each row through its link to its stock row; Not linked, removed, not in the catalogue, sheet size missing, unit unknown: no price, counted incomplete; hardware one road; the board road\'s assignmentFor and the m2 qty x costPerUnit deleted (the Deletion licence). ${WHY}`, gates: [] },
  'src/lib/exporters.js': { why: `T-CC2a F5.3: the BOM PDF and the purchase CSV read purchaseBom\'s rows and the words of law 7 (Not linked, Incomplete total, <n> lines not linked), bespoke rows marked Bespoke; REWRITES T-CC1b F11\'s words by name. ${WHY}`, gates: [] },
};
export const LIVENESS = {};
export const GOLDENS = [];
export const REPINNED = [];
