/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T81 F10 · THE WALK. The owner, 22.10.2026 (22:57): *"zalezy mi zebys rysowal w pdf 1 do 1 co mamy na cabinet core"*.
// scripts/t81-walk.mjs walks the set with a real mouse and reads every sheet off the glass. The one engine line it
// moved: the key plan's band (the wall in hand, on the fronts' tint) is named `key-plan`, as the legend's swatches are
// named `legend`, so a census of a sheet leaves the sheet's own conventions out by name (the sheet without fronts
// carries no DOORS entity of its drawing). Drawing modules only: computeCabinet reads none of them.

const OWNER = '*"zalezy mi zebys rysowal w pdf 1 do 1 co mamy na cabinet core"* (22.10.2026)';

export const GATES = {};

export const LICENSED = {
  'src/engine/drawings/setSheet.js': {
    why: `T81 F10: the key plan's band carries meta 'key-plan', the sheet's convention named as the legend's is. ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
