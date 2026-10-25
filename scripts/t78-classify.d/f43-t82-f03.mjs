/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F3 · THE DOOR, ITS WIDTH, ITS DEPTH, THE REFUSALS. The owner, 25.10.2026 (13:46): *"raczej zawsze wystaja
// troche wiec nie ma problemu"*, *"3 tak moga"*, *"4 - tak, 5 - tak"*; CLAUDE.md T82: *"The room refuses in words,
// the engine never squashes"*. KIT_HAWA.lsp D6 to D9 and D17: TB = span + B + (55 - Z3) - far (two doors: 110 / 2 -
// Z5 / 2 each), T1 = min(KT1, 567), M = TB + 92 + Z3 - T1, KT = min(T1 + RE, KT1), the class by height and weight
// with the owner's override; #37 and #38 red and #47 yellow in the kit's own sentences (checks.js); a unit a pocket
// door covers loses its own doors (`params.pocket_covered`, handed by paramsForEngine only to a covered unit: THE
// GATE pocketCovered; no golden carries it). Two NEW goldens of the new kit, pinned once under verify/t82/goldens
// (CLAUDE.md FROZEN 1: "the new kits get goldens of their own"), each the kit's own worked example; nothing re-pinned.

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';
import { goldenSummary } from '../t75-golden.mjs';

const OWNER = '*"raczej zawsze wystaja troche wiec nie ma problemu"*, *"3 tak moga"*, *"4 - tak, 5 - tak"* (25.10.2026, '
  + '13:46); *"jesli jest 18 mm to daj zawsze 22 mm automatycznie, i napisz informacje minimum 19 mm"*';

/** KIT_HAWA.lsp EXAMPLE 1: one door, hand R, front 18, H 2100, a 500 cabinet on a 580 run, far 1.5. */
const ONE_DOOR = () => ({
  ...defaultParamsFor('HAWA_POCKET', P),
  unit_num: 'HP01',
  height: 2100,
  depth: 580,
  front_t: 18,
  pocket: { doors: 1, hand: 'R', push: true, cls: null, covers: ['b'] },
  pocket_cover: { doors: [{ side: 'R', units: ['b'], spanMm: 500, KT1: 580, freeEndClearanceMm: 1.5 }] },
});
/** KIT_HAWA.lsp EXAMPLE 2: two doors, front 19, H 2400, a wardrobe 450 each side on a 600 run, far 1.5 both. */
const TWO_DOORS = () => ({
  ...defaultParamsFor('HAWA_POCKET', P),
  unit_num: 'HP01',
  height: 2400,
  depth: 600,
  front_t: 19,
  pocket: { doors: 2, hand: null, push: true, cls: null, covers: ['a', 'b'] },
  pocket_cover: {
    doors: [
      { side: 'L', units: ['a'], spanMm: 450, KT1: 600, freeEndClearanceMm: 1.5 },
      { side: 'R', units: ['b'], spanMm: 450, KT1: 600, freeEndClearanceMm: 1.5 },
    ],
  },
});

/** The golden's body: T75's summary of the cut, the figures every reader takes, the LISP's holes on every part. */
function pocketScene(params) {
  const r = computeCabinet(params, P);
  return {
    summary: goldenSummary(r),
    hawa: r.hawa,
    holes: r.panels.map((p) => ({ id: p.id, holes: p.meta?.pocket?.holes || [], grooves: p.meta?.pocket?.grooves || null })),
  };
}
function hawaPocketOneDoor() { return pocketScene(ONE_DOOR()); }
function hawaPocketTwoDoors() { return pocketScene(TWO_DOORS()); }

export const GATES = {
  pocketCovered: {
    what: 'a unit a HAWA pocket door covers (`params.pocket_covered`, handed by paramsForEngine only to a covered unit): '
      + 'its own door count is 0, the HAWA door is its door (KIT_HAWA.lsp D17). A bare kit and every golden carry none',
    opens: (p) => Boolean(p?.pocket_covered),
  },
};

export const LICENSED = {
  'src/engine/cabinet.js': {
    why: 'T82 F3: normalizeParams, a unit with `params.pocket_covered` cuts no door of its own (the HAWA door covers it, '
      + `KIT_HAWA.lsp D17); nothing else of its cut moves. ${OWNER}`,
    gates: ['pocketCovered'],
  },
  'src/engine/checks.js': {
    why: 'T82 F3: the registry grows #37 red "HAWA door out of range", #38 red "HAWA pocket too shallow for the door", '
      + '#47 yellow "HAWA pocket panels 22 on an 18 front" (CLAUDE.md\'s #42; the brief: the in-frame project holds #40 to '
      + '#44), read off the engine\'s HAWA_OUT_OF_RANGE, HAWA_POCKET_DEPTH and HAWA_PANEL_22 in the kit\'s own sentences. '
      + `${OWNER}`
      + ' T82 F2, after the review: #37 also says a pocket the room could not re-cut to its front\'s width (runs.js pocketRecutRefusal), in its words.'
      + ' After the review: #37 says a cabinet another pocket\'s door already closes (runs.js pocketClaimRefusal).',
    gates: [],
  },
  'src/engine/hawaPocket.js': {
    why: 'T82 F3: the door: hawaPocketFigures per covered side (TB, TH, T1, M, E1, KT, the class by height and weight, '
      + 'the hinges, TA, the cups, the steel profile, the closed and the open box), check37 / check37Cover / check38 / '
      + `check47 in the kit\'s words, pocketCoverOf (span, KT1, the house\'s far clearance, drawer fronts refused). ${OWNER}`
      + ' T82 F3, after the review: ONE KT1 per pocket (KIT_HAWA.lsp D8, the shallowest covered cabinet) for every door, KT the deeper door\'s T1 + RE capped at it; covered fronts out of one line refused in #38\'s words, each door\'s own depth as coverKT1.'
      + ' After the review (the front plane): pocketCoverOf gives each covered cabinet\'s front plane from the wall (frontPlanes), hawaPocketFigures publishes frontPlaneMm and backFromWallMm, so the store stands the pocket on that plane.',
    gates: ['hawaPocket'],
  },
};

export const LIVENESS = {
  // A tall unit with its door; a pocket covers it: no door of its own, the carcass untouched.
  pocketCovered: () => {
    const bud = { ...defaultParamsFor('BUDTALL', P), unit_num: '01', width: 500, depth: 580, doors: { count: 1, hinge: 'L' } };
    const own = computeCabinet(bud, P).panels.filter((p) => p.part === 'FRONT').length;
    const covered = computeCabinet({ ...bud, pocket_covered: { pocketId: 'p', unitNum: 'HP01' } }, P).panels.filter((p) => p.part === 'FRONT').length;
    return { live: own === 1 && covered === 0, said: `its own door ${own}, covered ${covered}` };
  },
};

export const GOLDENS = [
  {
    file: '../verify/t82/goldens/golden-hawa-pocket-1door.json',
    F: 'F43',
    source: 'T82 F2, F3: KIT_HAWA.lsp EXAMPLE 1 (hawa-cut, hawa-door-open, hawa-b-holes, hawa-a-holes, hawa-foot, '
      + 'hawa-door-holes): one door, hand R, front 18 (the panels 22, #47), H 2100, a 500 cabinet on a 580 run, far 1.5: '
      + 'W 99, EH 2057.5, TH 2051.5, TB 572.5, T1 567, M 100.5, E1 472, KT 580, III/25, TA 28, A 601 deep, the boards '
      + `99 x 601, the door closed at x 25, z 583, open at x 42, z 108. ${OWNER}`,
    make: hawaPocketOneDoor,
    params: () => ({ scene: 'hawaPocketOneDoor: KIT_HAWA.lsp EXAMPLE 1', type: 'HAWA_POCKET', unit: ONE_DOOR() }),
  },
  {
    file: '../verify/t82/goldens/golden-hawa-pocket-2door.json',
    F: 'F43',
    source: 'T82 F2, F3: KIT_HAWA.lsp EXAMPLE 2: two doors in one 110 pocket, front 19, H 2400, a 450 cabinet each side '
      + 'on a 600 run, far 1.5 both: W 148, TH 2358, TB 521 each, T1 567, M 49, KT 587, III/35, TA 29.5, the steel '
      + `profile 475 and its grooves, the doors at x -448.5 and 75.5 (Z5 3 between). ${OWNER}`,
    make: hawaPocketTwoDoors,
    params: () => ({ scene: 'hawaPocketTwoDoors: KIT_HAWA.lsp EXAMPLE 2', type: 'HAWA_POCKET', unit: TWO_DOORS() }),
  },
];

export const REPINNED = [];
