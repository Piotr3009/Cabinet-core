/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC2a F2 . THE RESOLVER (law 2). catalogue.js answers which entry a board choice or a BOM line is; it reads the engine's result, never feeds it; no gate, no golden.
const WHY = '*"kod nie moze wybierac poprzez nazwe bo nazwe mozemy zmienic i koniec, CC powinien miec swoja (nie widoczna) numeracje materialow, a nazwa tylko sie wyswietla"* (the owner, 01.11.2026, 12:50)';
export const GATES = {};
export const LICENSED = {
  'src/engine/catalogue.js': { why: `T-CC2a F2: catalogueIdOfBoard (source, decor, thickness) and catalogueIdOfLine (role and structured fields, never spec_label), ONE bridge table for the label-only LED roles. ${WHY}`, gates: [] },
};
export const LIVENESS = {};
export const GOLDENS = [];
export const REPINNED = [];
