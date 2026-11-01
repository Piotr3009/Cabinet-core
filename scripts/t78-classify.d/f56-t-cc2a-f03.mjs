/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC2a F3 . ONE SOURCE OF A BOARD (law 2). The resolver behind the cut list carries the catalogue id; thickness.js :104 reads no stock row; design.js keeps design.boards. The four owner projects' cut lists and every golden IDENTICAL; no gate.
const WHY = '*"musimy miec liste materialow wszystkich materialow jakie CC uzywa i wtedy dopiero przypisujemy wszystko a lista BOM do danego projektu sie bierze z tej bazy danych"* (the owner, 01.11.2026, 12:34)';
export const GATES = {};
export const LICENSED = {
  'src/engine/materials.js': { why: `T-CC2a F3.1: resolvePanelMaterial\'s record carries the catalogue id and groups by cat:<id>; boardChoiceOfPanel (F11.2 reads design.boards); the finish, the label and the 3D surface unchanged. ${WHY}`, gates: [] },
  'src/engine/thickness.js': { why: `T-CC2a F3.3 (:104 only): the slot\'s nominal no longer reads a Joinery Core stock row; the three generic placeholders through catalogue.js OLD_CC_IDS (pinsThickness); the owner projects\' thicknesses as main. ${WHY}`, gates: [] },
  'src/engine/design.js': { why: `T-CC2a F11.2: migrateDesign keeps design.boards (back, drawerBottom and the four run pieces), a data passthrough present only when the stored design has the key; no other line moves. ${WHY}`, gates: [] },
};
export const LIVENESS = {};
export const GOLDENS = [];
export const REPINNED = [];
