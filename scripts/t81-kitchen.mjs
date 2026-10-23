/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T81 · THE KITCHEN EVERY T81 PROBE AND TEST STANDS ON
//
// CLAUDE.md T81 F1: "for the T80 walk's kitchen (BUD 600 one door, BUD 800 a
// pair, BUDR2 500, WUD 600, END-L, plinth, worktop, in-frame on and off)".
// This is that stage, put through the store's own actions exactly as
// scripts/t80-walk.mjs puts it (verify/t81/DECISIONS.md 4: plus the project's
// knob, so the knob law has something to draw). One stage, one file: the
// probe, the tests and the walk's node half read it from here.

import { useProjectStore } from '../src/stores/projectStore.js';
import { rectCorners } from '../src/engine/room.js';
import { resolveUnitDesign } from '../src/engine/design.js';
import { getCabinetProfile } from '../src/engine/profile.js';

export const S = () => useProjectStore.getState();

/**
 * Build the stage. Returns the four unit ids.
 * @param {{inframe?:boolean, knob?:boolean, name?:string}} opts
 */
export function t81Kitchen({ inframe = true, knob = true, name = 'T81 kitchen' } = {}) {
  S().newProject(name);
  S().setRoom({ corners: rectCorners(6000, 3000), height: 2500 });
  const add = (type, x) => S().addUnit(type, { wall: 0, x }).id;
  const ids = { a: add('BUD', 1000), b: add('BUD', 1600), c: add('BUDR2', 2400), w: add('WUD', 1000) };
  for (const [id, width] of [[ids.a, 600], [ids.b, 800], [ids.c, 500], [ids.w, 600]]) S().updateUnitParams(id, { width });
  S().setDoors(ids.a, { count: 1, hinge: 'L' });
  S().setDoors(ids.b, { count: 2, hinge: 'L' });
  S().setDoors(ids.w, { count: 1, hinge: 'L' });
  S().addEndPanel(ids.a, { side: 'L', thickness: 18 });
  S().addPlinth(ids.a);
  S().addWorktop([ids.a, ids.b, ids.c]);
  S().setFrontType('f1', { source: 'spray', material_id: 'generic-22' });
  S().setFrontColour({ hex: '#7b8f7a', name: 'F&B Card Room Green', system: 'F&B' }, 'f1');
  S().setDesign({ sheen: 30 });
  if (knob) S().setProjectHandle({ type: 'knob' });
  if (inframe) S().setDesign({ inframe: true });
  return ids;
}

/** The arguments `wallDrawingSheets` takes, read off the store as the window reads them. */
export function setArgs(extra = {}) {
  const st = S();
  return {
    entries: st.allResults(),
    project: st.project,
    room: st.project.room,
    worktops: st.worktopsOf(),
    design: st.project.design,
    frontTypeOf: (u) => resolveUnitDesign(u, st.project.design).frontType,
    profile: getCabinetProfile(),
    date: '22/10/2026',
    ...extra,
  };
}
