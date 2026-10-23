/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T81 F5 · THE X-RAY SHEET. The owner, 22.10.2026 (22:57): *"zalezy mi zebys rysowal w pdf 1 do 1 co mamy na cabinet
// core, a przeciez mamy x-ray, to tez mozna zrobic x-ray prosze."* Every wall's X-ray sheet is the projector's: the
// fronts and the shell unfilled on the two X-ray greys, drawn first, and the internals over them in their own inks
// (the drawer boxes, the runners, the hinges, the legs), as the room's X-ray fades them (3d/UnitView.jsx, fronts
// appearance.xray.front 0.42, carcass 0.2). Drawing modules only: computeCabinet reads none of them.

const OWNER = '*"a przeciez mamy x-ray, to tez mozna zrobic x-ray prosze"* (22.10.2026)';

export const GATES = {};

export const LICENSED = {
  'src/engine/drawings/projector.js': {
    why: `T81 F5: on the X-ray the faded shell and fronts are drawn first and the internals over them in their own `
      + `inks, as the room's X-ray shows them. ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
