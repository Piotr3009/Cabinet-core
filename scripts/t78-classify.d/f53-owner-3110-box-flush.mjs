/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// After T-CC1a . the owner's chat fix of 31.10.2026, named here so the strict run says why. THE DRAWER BOX WALLS ARE
// FLUSH WITH THE SIDES' TOP. The owner, 18.10.2026: *"cabineo musi byc na frontowej i tylnej sciance, czyli nawiercanie w
// bokach bedzie liczone od gory boxa"*; 31.10.2026, putting a side and a wall together: *"dziurki 5 mm byly za nisko, byly
// 24 od wyciecia i 26 od gory, a cabineo mialo 25 i tu i tu, i dlatego bylo zle ... powinny byc przesuniete o 1 mm do gory
// boxa"*. The kit cuts the wall side - 15 - GB - 1; its lower edge stands on the upper edge of the bottom's groove (15 + GB
// + 1 = 34), its top edge on the sides' top edge, the bottom slid in under it on the 1 mm of play (boxFrontHeightExtra).
// Turn 18 stood the wall ON the bottom board (1 mm low, in the picture and in the box's own frame) and T79 F14 wrote the
// sides' Cabineo holes 1 + offset under the top to meet it (PENDING_OWNER_VERIFICATION in its golden); the owner has now
// verified: the pockets were right, the holes 1 low. LISP FIRST (SKYLON_JOINTS_CABINEO.lsp D.2c, the box table's prose,
// c:CABINEO_BOX dTop 0, H.1 recomputed), then engine/cabinet.js (the four wall placements, + boxFrontHeightExtra) and
// engine/cabineo.js (dTop reads 0 off the boxes; no formula changes).
// WHAT MOVES: every DRAWER-BOX-FRONT and DRAWER-BOX-BACK box.y + 1 (placement, the 3D picture); the sides' dia 5 Cabineo
// holes 1 higher on a box with Cabineo (212 / 59 for the BUDR default, 79 for the wardrobe wall of 90), the wall's pockets
// never; AND THE FACADE PILOTS FOLLOW THE WALL: the box front's pilots at 50 above its lower edge stand 1 higher, so the
// drawer fronts' FRONT_HINGES_3MM circles are drilled at 97.5 (94.5 on the wardrobe's first drawer) instead of 96.5 /
// 93.5, the kits (KIT_BUDR_FULL.lsp, KIT_WARDROBE_FULL.lsp) and profile.baseDrawerUnit / wardrobe.drawers amended the same
// night, the owner's own test ("przyloz oba elementy") applied to the front. The owner, of the bench: *"pocialem dzisiaj
// szafe i mam przesuniecie o 1 milimetr"*. RE-PINNED, BY NAME, every golden that carries a drawer box: three of the fossil
// six (BUDR and BUDR4: the placement and the fronts' pilot circles; PANTRY: the placement, its inner fronts carry no
// facade pilot; w, h, pockets and rows byte for byte), the T75 and T78 goldens below (placement only: their summaries
// count drills), each by its own writer, its meta and params kept, the note in its meta.repinned.

import { computeCabinet } from '../../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';
import { defaultParamsFor } from '../../src/engine/types.js';

const OWNER = '*"dziurki 5 mm byly za nisko, byly 24 od wyciecia i 26 od gory, a cabineo mialo 25 i tu i tu ... powinny byc '
  + 'przesuniete o 1 mm do gory boxa"* (the owner, 31.10.2026); *"nawiercanie w bokach bedzie liczone od gory boxa"* '
  + '(18.10.2026)';

const itemsOf = (p) => [
  ...(Array.isArray(p?.items) ? p.items : []),
  ...(Array.isArray(p?.sections?.[0]?.items) ? p.sections[0].items : []),
];
/** Any job that cuts a drawer box: a kit with drawers, a drawer item, a chest, a vanity, a corner L with drawers. */
const hasBox = (p) => Number(p?.drawers) > 0 || Number(p?.internal_drawers) > 0
  || itemsOf(p).some((i) => i?.kind === 'drawer')
  || /BUDR|CHEST|VANITY|DRAWER/i.test(String(p?.type || ''))
  || (Array.isArray(p?.units) && p.units.some((u) => hasBox(u?.params || u)));

export const GATES = {
  boxWallsFlush: {
    what: 'a job with a drawer box: its BOX-FRONT and BOX-BACK stand flush with the sides\' top (box.y + 1 against the '
      + 'cut before 31.10.2026); a job without a box reaches no changed line',
    opens: (p) => hasBox(p),
  },
};

export const LICENSED = {
  'src/engine/cabinet.js': {
    why: `Chat fix 31.10.2026: the four drawer box wall placements (the wardrobe's box, a column's, the BUDR's, the inner `
      + `drawer's) stand the wall boxFrontHeightExtra higher: boxWallY = bottomY + GB + 1, the lower edge on the groove's `
      + `upper edge, the top edge flush with the sides'. Placement only; no cut, no hole. ${OWNER}`,
    gates: ['boxWallsFlush'],
  },
  'src/engine/cabineo.js': {
    why: `Chat fix 31.10.2026: comments only (dTop, read off the boxes, measures 0 now); no formula changes. ${OWNER}`,
    gates: ['boxWallsFlush'],
  },
  'src/engine/profile.js': {
    why: `Chat fix 31.10.2026: baseDrawerUnit.frontScrewFromBottom 96.5 to 97.5 and wardrobe.drawers.frontScrewFromBottom / `
      + `firstFrontScrewFromBottom 96.5 / 93.5 to 97.5 / 94.5: the facade pilots follow the wall standing on the groove's upper `
      + `edge (13.5 + 15 + 18 + 1 + 50), KIT_BUDR_FULL.lsp and KIT_WARDROBE_FULL.lsp amended first. ${OWNER}`,
    gates: ['boxWallsFlush'],
  },
  'src/engine/drawerPilots.js': {
    why: `Chat fix 31.10.2026: comments only (the chain reads 97.5); no formula changes. ${OWNER}`,
    gates: ['boxWallsFlush'],
  },
};

export const LISP = {
  'reference/lisp/KIT_BUDR_FULL.lsp': `Chat fix 31.10.2026: drawDRAWER_FRONT holeY 96.5 to 97.5 (+ G on drawer 1), one dated `
    + `comment; the pilots follow the wall standing on the groove's upper edge. The same night's colour amendment (f52) `
    + `stands. ${OWNER}`,
  'reference/lisp/KIT_WARDROBE_FULL.lsp': `Chat fix 31.10.2026: drawWDR_DRAWER_FRONT screwY 93.5 / 96.5 to 94.5 / 97.5, the `
    + `prose line and one dated comment. The same night's colour amendment (f52) stands. ${OWNER}`,
  'reference/lisp/KIT_VANITY.lsp': `Chat fix 31.10.2026: vanity-box-boards wy + vanityBoxWallExtra (the wall on the groove's `
    + `upper edge, as every box), the worked example's bowl numbers (22.1, 7.1; a bowl 113 deep clears). ${OWNER}`,
  'reference/lisp/SKYLON_JOINTS_CABINEO.lsp': `Chat fix 31.10.2026: D.2c THE TOPS ARE FLUSH (dTop = 0; the kit's 1 is `
    + `the bottom's play; the wall on the groove's upper edge), the box table's prose, c:CABINEO_BOX dTop 0.0, H.1 `
    + `recomputed (the BUDR holes 212 / 59, 153 / 59, 76; the wardrobe 79, 139 / 59; the pockets as they were). The same `
    + `night's colour amendment (f52) stands. ${OWNER}`,
};

export const LIVENESS = {
  boxWallsFlush: () => {
    const r = computeCabinet(defaultParamsFor('BUDR', P), P);
    const sl = r.panels.find((p) => p.id === 'D1-SL');
    const bf = r.panels.find((p) => p.id === 'D1-BF');
    const flush = sl && bf && Math.abs((sl.box.y + sl.box.h) - (bf.box.y + bf.box.h)) < 1e-9;
    return { live: Boolean(flush) && bf.box.y === 65.5, said: `D1-BF box.y ${bf?.box?.y}, the top edges ${flush ? 'one line' : 'apart'}` };
  },
};

export const GOLDENS = [];

const WHY = 'Chat fix 31.10.2026: every drawer box wall box.y + 1 (flush with the sides\' top); no cut, hole, pocket or row '
  + 'moved; re-pinned by its own writer, meta and params kept. ' + OWNER;

export const REPINNED = [
  { file: 'verify/t70/goldens-base.json (BUDR)', why: `${WHY} (the fossil's hash holds the placement: 6 walls; and the three fronts' pilot circles 97.5 / 115.5, 96.5 / 114.5 until that day)` },
  { file: 'verify/t70/goldens-base.json (BUDR4)', why: `${WHY} (8 walls; and the four fronts' pilot circles)` },
  { file: 'verify/t70/goldens-base.json (PANTRY)', why: `${WHY} (6 walls)` },
  { file: 'fixtures/golden-budr.json', why: 'Chat fix 31.10.2026: drawer_front_screw_y_per_drawer 115.5 / 97.5 (114.5 / 96.5 until that day): the facade pilots follow the wall on the groove\'s upper edge; nothing else of the fixture. ' + OWNER },
  { file: 'fixtures/golden-budr2.json', why: 'Chat fix 31.10.2026: as golden-budr (two drawers). ' + OWNER },
  { file: 'fixtures/golden-budr4.json', why: 'Chat fix 31.10.2026: as golden-budr (four drawers). ' + OWNER },
  { file: 'fixtures/golden-cabineo12-budr-box.json', why: `${WHY}; and the sides' dia 5 holes 1 higher (212 / 59, 153 / 59, 76 from the lower edge)` },
  { file: 'fixtures/golden-cabineo12-wardrobe-box.json', why: `${WHY}; and the sides' dia 5 holes 1 higher (139 / 59)` },
  { file: 'fixtures/golden-corner-l-drawers.json', why: WHY },
  { file: 'fixtures/golden-arch-stack.json', why: WHY },
  { file: 'fixtures/golden-double-drawer.json', why: WHY },
  { file: 'fixtures/golden-drawer-columns.json', why: WHY },
  { file: 'fixtures/golden-inframe-run.json', why: WHY },
  { file: 'fixtures/golden-recess-drawers.json', why: WHY },
  { file: 'fixtures/golden-t85-a-both-in.json', why: WHY },
  { file: 'fixtures/golden-t85-b-left-out.json', why: WHY },
  { file: 'fixtures/golden-t85-c-left-15.json', why: WHY },
  { file: 'fixtures/golden-t85-e-558-out.json', why: WHY },
  { file: 'fixtures/golden-t86b-f03-shelf-over-column.json', why: WHY },
  { file: 'fixtures/golden-t86b-f04-chest-panel.json', why: WHY },
  { file: 'fixtures/golden-t86b-f04-chest-double.json', why: WHY },
  { file: 'fixtures/golden-bud-int.json', why: WHY },
  { file: 'fixtures/golden-budr-hob.json', why: WHY },
  { file: 'fixtures/golden-wardrobe-chest.json', why: WHY },
  { file: 'fixtures/golden-wardrobe-desk.json', why: WHY },
  { file: 'verify/t82/goldens/golden-wardrobe-chest2-columns2.json', why: WHY },
  { file: 'verify/t82/goldens/golden-wardrobe-chest3-columns2.json', why: WHY },
  { file: 'verify/t82/goldens/golden-wardrobe-chest4-columns2.json', why: WHY },
  { file: 'verify/t82/goldens/golden-vanity2.json', why: WHY },
  { file: 'verify/t82/goldens/golden-vanity3.json', why: WHY },
  { file: 'verify/t82/goldens/golden-vanity4.json', why: WHY },
  { file: 'verify/t82/goldens/golden-vanity3-sinks0.json', why: WHY },
  { file: 'verify/t82/goldens/golden-vanity3-sinks2.json', why: WHY },
  { file: 'verify/t82/goldens/golden-vanity3-columns2.json', why: WHY },
  { file: 'verify/t83/goldens/golden-vanity3-columns2-sinks1.json', why: WHY },
];
