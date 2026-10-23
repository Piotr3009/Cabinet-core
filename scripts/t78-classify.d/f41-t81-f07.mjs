/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T81 F7 · SILHOUETTES FROM THE MODELS. The owner, 22.10.2026 (22:56): *"7 zrob wedlug glb"*. scripts/t81-silhouettes.mjs
// traces every hardware family the room draws from the GLB the room loads (front, side and top, rasterised at 0.5 mm,
// outer contour and holes over 2 mm) into reference/hardware/silhouettes.json; engine/drawings/silhouettes.js reads it
// and hands the projector a ring per instance in the room's own placement. A family with no model, or one whose file
// could not be read when the file was made, is a named fallback and the sheet draws today's symbol. Drawing modules
// only: computeCabinet reads none of them.

const OWNER = '*"7 zrob wedlug glb"* (22.10.2026)';

export const GATES = {};

export const LICENSED = {
  'src/engine/drawings/silhouettes.js': {
    why: `T81 F7: the reader of reference/hardware/silhouettes.json (silhouetteMark, silhouetteEntries, `
      + `silhouetteSource, silhouetteReader), setting each traced family down as 3d/Hardware.jsx does; null, so `
      + `today's symbol, for a fallback. ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
