/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// After T84 . the owner's chat fix of 30.10.2026, named here so the strict run says why. His words, of Center between
// over drawers standing in a recess column: *"nawet nie pokazuje wymiaru pomiedzy polka a polka szufladowa"*;
// *"polka nad szufladami przez program nie jest brana jako polka"*; *"ok koduj te poprawki zobaczymy co sie dzieje"*
// (30.10.2026). THE SHELF LADDER STANDS ON THE COLUMN'S OWN CAP: the shelves were centred (the store's numbers); the
// ladder of dimensions in the view measured the lowest shelf from the bottom of the cabinet, because its floor came
// from assemblies.drawerZone, which only a full-width stack has (a column's stack, T79 F3 and the recess column of
// 28.10, closes under its own PARTITION board). engine/shelfHeights.js shelfColumns reads the cap under each column
// off the engine's own PARTITION boards; the full-width cap answers the number drawerZone did, to the millimetre.
// And the quick card's three numbers leave profile.ui.studio.inspector with the card (the panel's three stay).
// Nothing cut: computeCabinet() reaches neither file's change, no gate, no golden; the six hold byte for byte.

const OWNER = '*"nawet nie pokazuje wymiaru pomiedzy polka a polka szufladowa"*; *"polka nad szufladami przez program nie '
  + 'jest brana jako polka"*; *"ok koduj te poprawki zobaczymy co sie dzieje"* (30.10.2026)';

export const GATES = {};

export const LICENSED = {
  'src/engine/shelfHeights.js': {
    why: `Chat fix 30.10.2026 F1: shelfColumns gives each column its own floor, the top face of the highest PARTITION `
      + `board (the drawer cap: PARTITION, Z<n>-PART) standing under the column's lowest shelf and across its run, when `
      + `that is above the floor handed in; the view (3d/UnitView.jsx) hands the carcass floor only and reads drawerZone `
      + `no more. A reading of the engine's panels for the dimensions; nothing cut. ${OWNER}`,
    gates: [],
  },
  'src/engine/profile.js': {
    why: `Chat fix 30.10.2026 F2: profile.ui.studio.inspector loses quickPx, quickNarrowPx and quickNarrowBelowPx `
      + `with the quick card (kasacja); fullPx, fullNarrowPx and fullNarrowBelowPx stay. UI numbers, read by `
      + `components/studio/lib/studioSkin.js only; computeCabinet() reads none of profile.ui. *"nie nie nie, zwijanie `
      + `musi byc oczywiscie tak jak bylo zeby bylo widac ze jest osobne menu, tylko ten jeden przycisk usun, Full `
      + `settings"* (the owner, 30.10.2026). ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
