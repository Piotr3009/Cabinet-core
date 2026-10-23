/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T81 F3 · THE FRONTS SHEET. The owner, 22.10.2026 (21:23): *"pozniej chce widziec wszystkie fronty, bez przebijania
// carcasow, tylko to co widac za frontami, i tyle, fronty magenta"*; (22:56) *"1 shaker zostaw jak jest"*, *"2 zawiasy
// na elewacji wedlug silnika i podobnie jak na moim dxf"*, *"3 galki 30 mm, wysokosc wedlug silnika (pozycja jak kto
// ustawi)"*. Every wall's fronts sheet is drawn by the projector: what a camera in the room sees, the hinge bars at
// the ladder's cups, the knob circles at the drill summary's holes, the shaker's field and a decoration's contour as
// the single front elevation writes them, a leaf seen whole as one rectangle, the slab tinted as the set always
// tinted it. Drawing modules only: computeCabinet reads none of them.

const OWNER = '*"pozniej chce widziec wszystkie fronty, bez przebijania carcasow, tylko to co widac za frontami"* (22.10.2026)';

export const GATES = {};

export const LICENSED = {
  'src/engine/drawings/setElevation.js': {
    why: `T81 F3: buildRunElevation draws the fronts sheet through the projector, as F2 drew the X-ray. ${OWNER}`,
    gates: [],
  },
  'src/engine/drawings/projector.js': {
    why: `T81 F3: a leaf seen whole is written as one rect, the worktop's face as the tinted slab; a front's own `
      + `detail (the shaker field, a decorative contour, the swing) seen whole is the entity the single front `
      + `elevation writes. ${OWNER}`,
    gates: [],
  },
};

// After the gates, the fronts sheet's two drawing numbers (the 0.25 paper mm a printed piece needs, the 0.05 mm hair
// a face is seen whole by) moved from the code into the profile, values unchanged (the run's rule 3: a new number
// goes into profile.js under drawings with a source line).
LICENSED['src/engine/profile.js'] = {
  why: `T81 F3: profile.drawings.projector { minEdgePaperMm 0.25, wholeFaceHairMm 0.05 }, T81 PROPOSED, merged from the `
    + `code's defaults; computeCabinet reads no drawings key. ${OWNER}`,
  gates: [],
};
LICENSED['src/engine/drawings/setPlan.js'] = { why: `T81 F3: the plan reads minEdgePaperMm from the profile. ${OWNER}`, gates: [] };
LICENSED['src/engine/drawings/setSection.js'] = { why: `T81 F3: a section reads minEdgePaperMm from the profile. ${OWNER}`, gates: [] };

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
