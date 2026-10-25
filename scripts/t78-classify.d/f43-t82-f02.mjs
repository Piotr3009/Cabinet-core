/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F2 · THE POCKET IS A UNIT IN THE RUN. The owner, 25.10.2026 (11:40): *"potrzebujemy zaprojektowac to jako
// wstawienie pomiedzy 2 panele 110 mm przestrzen pomiedzy, wysuwasz pocket door i zakrywasz szafke lub szafki"*;
// (13:46) *"panele po bokach to jest nie carcas tylko front zawsze, wiec jesli jest 18 mm to daj zawsze 22 mm
// automatycznie"*. A NEW kit, HAWA_POCKET (types.js: prefix HP, the tall group, legs on the floor, `carcass.top:
// 'pocket'`), cut by a builder in cabinet.js from KIT_HAWA.lsp's mirror (engine/hawaPocket.js, NEW, routine for
// routine): POCKET-A, POCKET-B (two B in the two-door pocket), POCKET-BOTTOM, POCKET-TOP, POCKET-DOOR, published with
// the ONE derivation as `result.hawa`. THE GATE: the type, HAWA_POCKET; no existing kit's params carry it, so the
// six, T75's, T76's, T77's, T78's and every T79 to T81 golden hold by construction (the new roles pocket_panel and
// pocket_door join two Sets that no fossil panel's role is in). The goldens of the new kit are F3's (the door).
// T82 F2, the fragment of two slices merged by INT: A2 (the kit) above, A3 (the run) and B4 (the libraries) below.
// T82 F2 (slice A3) · THE POCKET IS A UNIT IN THE RUN: WHICH UNITS ITS DOOR COVERS. The owner, 25.10.2026 (11:40):
// *"wysuwasz pocket door i zakrywasz szafke lub szafki"*; CLAUDE.md F3: *"by default the ONE unit next to the pocket on
// that side; the owner may add the next"*. runs.js gains the pocket's own rows (isPocketUnit, pocketNeighbours,
// pocketCoverSides, runPocketParams): pure functions of where the units stand, read by the store's refreshAutoParts
// into state.runElements and handed to the engine by paramsForEngine (pocket_cover on a pocket, pocket_covered on a
// covered cabinet). Nothing here is read by a cut: no kit calls these rows, levelGroups and every run element
// function are byte for byte as they were, and a project with no HAWA_POCKET hands the engine exactly what it handed
// it on main. Every golden holds by construction; no golden is re-pinned. B4 applied A2's patch to library.js, the
// pocket's two library rows (the Kitchen library's Tall units, the wardrobe library).

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

const OWNER = '*"wstawienie pomiedzy 2 panele 110 mm przestrzen pomiedzy, wysuwasz pocket door i zakrywasz szafke lub '
  + 'szafki"* (25.10.2026, 11:40); *"panele po bokach to jest nie carcas tylko front zawsze"* (13:46)';
const OWNER_A3 = '*"wysuwasz pocket door i zakrywasz szafke lub szafki"* (25.10.2026, 11:40); *"3 tak moga"* (13:46)';

export const GATES = {
  hawaPocket: {
    what: 'a HAWA_POCKET unit (the type id; KIT_HAWA.lsp): its own builder cuts the pocket (two front-material panels, '
      + 'a bottom and a top board, the door per covered side, from params.pocket_cover) and the result carries `hawa`. '
      + 'No other kit reaches a changed line',
    opens: (p, typeId) => (typeId || p?.type) === 'HAWA_POCKET',
  },
};

export const LICENSED = {
  'src/engine/hawaPocket.js': {
    why: 'T82 F2: NEW, KIT_HAWA.lsp\'s mirror routine for routine (hawaSpec; (a) panelT, panelSwapP, panelOkP, clearOf, '
      + 'widthOf, capOf, ehOf, thOf, zOf, shareOf, roundOf; (b) tbOf, kgOf, allowedKg, classFitsP, classOf; (c) t1Max, '
      + 't1Need, depthOf, depthOkP, trackLength; (d) taOf, cupVs, steelLength, steelRows, steelUs, steelGrooves, '
      + 'doorHoles; (e) rowOf, trackLast, bBracket, bHoles, aHoles, footOf; (f) doorBox, cutOf; (g) doorOpenOf; (h) '
      + 'systemHand, hawaSetName, connectorName; (i) check37, check37Cover, check38, check47) and the house\'s side: '
      + 'pocketCoverOf, hawaPocketFigures (the one derivation), hawaPocketDefaultParams; widthOf and lookup are the '
      + `module's own (not exported: their names are other files' locals, test/imports.test.js). ${OWNER}`,
    gates: ['hawaPocket'],
  },
  'src/engine/types.js': {
    why: 'T82 F2: HAWA_POCKET (label "HAWA pocket (Concepta III)", lisp KIT_HAWA.lsp, heightGroup tall, mount floor, '
      + 'legs, carcass top pocket and sides, bottom, back none, supports cornice, prefix HP), in UNIT_TYPE_ORDER before '
      + `the free panel, isHawaPocket, and its params spread in defaultParamsFor (hawaPocketDefaultParams). ${OWNER}`
      + ' T82 F2, after the review: HAWA_POCKET declares widthFixed, the flag the share-out reads for a hood or a fridge, so a share-out lays the run out around the pocket and never widens it.',
    gates: ['hawaPocket'],
  },
  'src/engine/cabinet.js': {
    why: 'T82 F2: the pocket builder beside the free panel\'s (`type.carcass.top === \'pocket\'`): the parts of '
      + 'hawaPocketFigures in hawa-cut\'s order, roles pocket_panel (front material, finish exposed), pocket_board, '
      + 'pocket_door (front material, finish exposed; no house front law reaches it), meta.pocket { kind, side, holes, '
      + 'grooves } in the LISP\'s face frames, the refusals and the note as warnings, and `hawa` on the result. '
      + `${OWNER}`,
    gates: ['hawaPocket'],
  },
  'src/engine/partRegistry.js': {
    why: 'T82 F2: POCKET-A and POCKET-B -> pocket_panel (a FRONT row of its own: 22 on an 18 front), POCKET-TOP and '
      + `POCKET-BOTTOM -> carcase_horizontal, POCKET-DOOR -> door; pocket_panel banded as front. No cut reads it. ${OWNER}`,
    gates: [],
  },
  'src/engine/elements.js': {
    why: 'T82 F2: POCKET-A and POCKET-B answer as sides, POCKET-TOP and POCKET-BOTTOM as the top and the bottom (the '
      + `editor window reaches them as a carcass\'s boards); the door is the pocket\'s, not a house door. ${OWNER}`,
    gates: [],
  },
  'src/engine/runs.js': {
    why: 'T82 F2: the HAWA pocket\'s rows: isPocketUnit; pocketNeighbours (the units butted one after another from '
      + 'the pocket on its wall, each side, within runGap, stopping at a pocket, a free panel, a hung, turned or riding '
      + 'unit); pocketCoverSides (the stored params.pocket.covers resolved as an unbroken chain, else the one nearest '
      + 'unit, on the hand\'s side or on both for two doors); runPocketParams (the pocket element: covers, sides, '
      + 'beyond kinds and hawaPocket.js pocketCoverOf\'s pocket_cover; and on a covered unit the pocket that closes '
      + `it). One import of hawaPocket.js (pocketChoiceOf, pocketCoverOf). No cut reads them. ${OWNER_A3}`
      + ' T82 F2, after the review: buttedChainOf (the cabinets butted one after another beside the pocket, which move with it when a new front re-cuts its width) and pocketRecutRefusal (where they cannot move, the sentence).'
      + ' After the review (one cabinet, one pocket door): runPocketParams gives a cabinet to the first pocket in the room\'s order, a later pocket\'s door stops short and carries refused (pocketClaimRefusal).'
      + ' After the review (the front plane): pocketFrontLine, the most forward of the covered cabinets\' front lines, is the pocket\'s front, so no closed door stands inside a carcass; each pocket_cover door carries the covered fronts for the engine.',
    gates: [],
  },
  'src/engine/library.js': {
    why: 'T82 F2 (slice B4, A2\'s patch): the HAWA pocket\'s row in the Kitchen library\'s Tall units group after '
      + 'Standard and one at the end of the wardrobe library, the kit with two homes. A library row; no cut reads it. '
      + '*"HAWA pocket (Concepta III)"*, CLAUDE.md T82 F2',
    gates: [],
  },
};

export const LIVENESS = {
  // KIT_HAWA.lsp EXAMPLE 1: one door, hand R, front 18, H 2100, a 500 cabinet on a 580 run, far 1.5.
  hawaPocket: () => {
    const r = computeCabinet({
      ...defaultParamsFor('HAWA_POCKET', P),
      unit_num: 'HP01',
      height: 2100,
      depth: 580,
      front_t: 18,
      pocket_cover: { doors: [{ side: 'R', units: ['b'], spanMm: 500, KT1: 580, freeEndClearanceMm: 1.5 }] },
    }, P);
    const d = r.panels.find((p) => p.part === 'POCKET-DOOR');
    const a = r.panels.find((p) => p.part === 'POCKET-A');
    const live = d && a && d.w === 572.5 && d.h === 2051.5 && a.thickness === 22 && a.w === 601 && r.hawa?.doors[0]?.M === 100.5;
    return { live: Boolean(live), said: `POCKET-DOOR ${d?.w} x ${d?.h}, POCKET-A ${a?.w} x ${a?.h} x ${a?.thickness}, M ${r.hawa?.doors[0]?.M}` };
  },
};

export const GOLDENS = [];

export const REPINNED = [];
