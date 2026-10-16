/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// After T78 · the owner's EVENING turn of 15.10.2026, part C: THE RECESS EXTENSION, named here so the strict run says
// why. *"czy reces nie moze dzialac jak komin, czyli front zawsze trzyma sie linii a jak wpada do reces to wtedy sie
// wydluza szafka?"* and his answers to the mockup "wneka jak komin": *"2 tak. 3 - glebszy karkas tak jak proponujesz,
// 4 - dowolny, 5 - glebsze"*, and *"na setup room jak widze sciane od frontu nie top tylko front to nie widze kresek,
// gdzie jest komin i gdzie wneka"*. LISP first: reference/lisp/KIT_RECESS.lsp, written and balanced before
// src/engine/extension.js; the engine mirrors it routine for routine.

import { computeCabinet } from '../../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';
import { defaultParamsFor } from '../../src/engine/types.js';

const BUD = () => ({ ...defaultParamsFor('BUD', P), unit_num: '01', front_t: 25, shelves: 1, hinge: 'L' });

export const GATES = {
  extension: {
    what: '`params.extension` { x0, x1, z0, z1, d }: the band of a recess a cabinet stands PARTLY in, in the carcass frame (the room '
      + 'derives it, projectStore recessExtensionFor; nobody types it). The carcass grows an extension behind its BACK over the band: '
      + 'the reached sides, the TOP, the BOTTOM and the shelves in the band bump back by d, the BACK loses the window (a through pocket '
      + 'on RECESS_WINDOW, a bite, a corner, or it is shortened or cut in two), RETURN-L/R, FLOOR, LID and EXT-BACK are added as '
      + 'hand-fixed boards. Without it every unit is byte for byte today\'s',
    opens: (params) => Boolean(params?.extension),
  },
};

export const LICENSED = {
  'src/engine/extension.js': {
    why: 'Owner 15.10.2026 (evening, "2 tak, 3 glebszy karkas, 4 dowolny, 5 glebsze"): KIT_RECESS.lsp\'s mirror, a new file: the band, '
      + 'the bump outline law, the TOP/BOTTOM/side/shelf bumps with their dog bones and re-planned joints, the BACK\'s pieces and its '
      + 'window / bite / corner, the five added boards with their stated screws, the refusals, the verdict, the two passes',
    gates: ['extension'],
  },
  'src/engine/cabinet.js': {
    why: 'Owner 15.10.2026 (evening): the extension asked of the parent first (extensionVerdict, withExtensionRefusal), cut in the '
      + 'notch\'s own place before the drilling (extensionCarcass) and re-origined after it (extensionDrills); derived.extension. '
      + 'Behind the gate: no params.extension, no line runs',
    gates: ['extension'],
  },
  'src/engine/notch.js': {
    why: 'Owner 15.10.2026 (evening): outlineWithTabs, tabBones, dogboneHole, polygonArea and shiftGeom exported for the extension '
      + '(the same helpers, shared, not copied); cutNotchCorner takes a second corner (`also`) for a side bumped over a mid band. '
      + 'Every notch answer unchanged',
  },
  'src/engine/cnc/layers.js': {
    why: 'Owner 15.10.2026 (evening): RECESS_WINDOW, ACI 52, a pocket: the window through the BACK into the extension (KIT_RECESS.lsp D9)',
  },
  'src/engine/machining.js': {
    why: 'Owner 15.10.2026 (evening): the RECESS_WINDOW policy, drawn through (its record states the board\'s depth)',
  },
  'src/3d/panelSolid.js': {
    why: 'Owner 15.10.2026 (evening): a BACK\'s BITE (`cnc.bite`) cut out of its polygon by engine/extension.js cutEdgeBite, a side\'s '
      + 'second corner through cutNotchCorner\'s `also`; both in the cache key. The grown TOP, BOTTOM and shelves travel the L\'s own '
      + 'planOutline road',
  },
  'src/stores/projectStore.js': {
    why: 'Owner 15.10.2026 (evening): the recess read like the chimney: wholly inside = a DEEPER carcass on the same line of fronts '
      + '(settleRecesses writes recess_mm, depth, depth_full; the night\'s step in the run is gone), partly inside = params.extension '
      + 'derived in paramsForEngine (recessExtensionFor, the band with the clearance, the LISP\'s own refusal silences a band too small); '
      + 'settleObstacles leaves a recessed cabinet alone. Placement numbers: no golden reaches them',
  },
  'src/engine/cnc/edgeGuard.js': {
    why: 'Owner 15.10.2026 (evening): isInterior asks the polygon, not only the bounds: a grown TOP\'s back-tab dog bones stand '
      + 'in the air beside its bump, inside the bounding box, and are not cut-outs. Every rectangle-less-a-corner answers as before',
  },
  'src/lib/wallElements.js': {
    why: 'Owner 15.10.2026 (evening, "dowolny"): a recess carries bottom_mm and top_mm (null = the floor, the ceiling), recessBand reads '
      + 'them; a chimney stands floor to ceiling',
  },
  'src/components/WallElevationModal.jsx': {
    why: 'Owner 15.10.2026 (evening, "nie widze kresek, gdzie jest komin i gdzie wneka"): the FRONT view draws the recess (its band) and '
      + 'the chimney, lists them, drags them sideways; the recess window gains Bottom and Top. Licensed in test/turn59-f1 EXEMPT, '
      + 're-frozen',
  },
  'src/retail/design/room/WallElevationModal.jsx': {
    why: 'Owner 15.10.2026 (evening): the same drawing and the same two fields in retail\'s copy (the owner\'s "kopiuj")',
  },
  'src/3d/Room.jsx': {
    why: 'Owner 15.10.2026 (evening, "dowolny"): the alcove\'s hole, back and reveals span its BAND, with a head and a sill where the '
      + 'band stops short of the ceiling and the floor',
  },
};

export const LISP = {
  'reference/lisp/KIT_RECESS.lsp': 'Owner 15.10.2026 (evening): a NEW FILE, the law of the recess extension (sections 1 to 4, D1 to D14), '
    + 'the routines (B to E) and the NUMBERS of the two golden cases (F); balanced, ASCII',
};

export const LIVENESS = {
  extension: () => {
    const r = computeCabinet({ ...BUD(), extension: { x0: 310, x1: 600, z0: 0, z1: 770, d: 150 } }, P);
    const bur = r.panels.find((p) => p.id === 'BUR');
    const back = r.panels.find((p) => p.id === 'BACK');
    const added = r.panels.filter((p) => p.role === 'extension').map((p) => p.id);
    return {
      live: bur?.w === 690 && back?.w === 328 && added.join(',') === 'RETURN-L,EXT-BACK' && r.warnings.length === 0,
      said: `BUD 600 with the band 310..600 x 0..770, 150 deep: BUR ${bur?.w} x ${bur?.h}, BACK ${back?.w} x ${back?.h}, added ${added.join(' ')}`,
    };
  },
};

export const GOLDENS = [
  {
    file: 'golden-recess.json',
    F: 'chat-fix 15.10.2026 (evening) C',
    source: 'KIT_RECESS.lsp (CASE A of its NUMBERS block) on KIT_BUD_FULL.lsp: the band 310..600 x 0..770, 150 deep; BUR, TOP, BOTTOM '
      + 'and the shelf grow, the BACK is 328 wide, RETURN-L and EXT-BACK added',
    params: () => ({ ...BUD(), extension: { x0: 310, x1: 600, z0: 0, z1: 770, d: 150 } }),
  },
  {
    file: 'golden-recess-band.json',
    F: 'chat-fix 15.10.2026 (evening) C',
    source: 'KIT_RECESS.lsp (CASE B of its NUMBERS block) on KIT_BUD_FULL.lsp: a mid band 110..490 x 210..590, 150 deep; the BACK keeps '
      + 'a window on RECESS_WINDOW, two RETURNs, a FLOOR, a LID and the EXT-BACK added, the shelf grows',
    params: () => ({ ...BUD(), extension: { x0: 110, x1: 490, z0: 210, z1: 590, d: 150 } }),
  },
];
