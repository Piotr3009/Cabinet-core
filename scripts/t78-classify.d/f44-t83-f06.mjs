/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T83 F6 (slice V1) · THE CARCASS TO THE WALL, THE VOID INSIDE. The owner, 25.10.2026 (22:41), after the eye-test of
// T82: *"jak mamy miejsce na rurki z tylu to super ze szuflady sa mniejsze ale carcas powinien byc do sciany, czyli
// wszystko w srodku carcasa mniejsze ale carcas do sciany"*. The turn's law (CLAUDE.md T83 LAWS): *"the carcass is to
// the wall: a service void is room taken INSIDE the carcass, never air between the carcass and the wall"*.
// LISP FIRST: reference/lisp/KIT_VANITY.lsp D27 written, D5, D6, D7, D9, D15 and D21 amended; the routines
// vanity-wall-gap (the clearance), vanity-box-room (the box keeps the void behind it), vanity-box-depth and
// vanity-boxes (take the void, 0 for the parent and the chest), vanity-top-depth (the stand-off, 0 at the wall),
// vanity-void-note (#45 "inside the vanity behind the drawers"), and part 6. The engine mirrors it under the existing
// gate `vanity` (scripts/t78-classify.d/f43-t82-f09.mjs): no new key, no new kit, every line behind `type.vanity` or
// a vanity type id, so the six, T75's to T82's goldens and every other kit cut what they cut. The six T82 vanity
// goldens are RE-PINNED on the owner's order (CLAUDE.md T83 FROZEN 1: *"PART B changes the vanity's cut on the
// owner's order: its T82 goldens are RE-PINNED with his words of 22:41 quoted in the fragment, every other golden
// untouched"*); the chest's three T82 goldens hold byte for byte (the chest asks no void).

const OWNER = 'The owner, 25.10.2026 (22:41): *"carcas powinien byc do sciany, czyli wszystko w srodku carcasa mniejsze '
  + 'ale carcas do sciany"*.';
const OWNER_FULL = 'The owner, 25.10.2026 (22:41): *"jak mamy miejsce na rurki z tylu to super ze szuflady sa mniejsze ale '
  + 'carcas powinien byc do sciany, czyli wszystko w srodku carcasa mniejsze ale carcas do sciany"*.';

export const GATES = {};

export const LICENSED = {
  'src/engine/cabinet.js': {
    why: 'T83 F6: the import of engine/vanity.js vanityBoxRoom, and in the BUDR drawer block the box\'s room for '
      + '`type.vanity` only: `vanityBoxRoom({ D, G, frontT })` (KIT_VANITY.lsp vanity-box-room, D9, D27: the parent\'s '
      + 'D - G - 20 and no more than D - front - serviceVoidMm) snapped on the same box ladder (the runner less ten, the '
      + '17.10 law), so a VANITY3 at D 500 cuts its boxes 390 on the 400 runner, their back faces 85 from the carcass '
      + 'back. Every other kit, the chest and the BUDR included, reads the very line it always read. ' + OWNER,
    gates: ['vanity'],
  },
  'src/engine/vanity.js': {
    why: 'T83 F6: vanityWallGap is the house\'s clearance (vanity-wall-gap, D6, D27; T82: the clearance + 80); '
      + 'vanityBoxRoom (vanity-box-room, D9, D27), read by computeCabinet for a vanity\'s box; vanityVoidNote '
      + '(vanity-void-note, Check #45 "Service void 80 inside the vanity behind the drawers"). ' + OWNER,
    gates: ['vanity'],
  },
  'src/engine/types.js': {
    why: 'T83 F6: defaultParamsFor writes no `wall_gap` for a vanity any more (T82 wrote the clearance + 80): the vanity '
      + 'is born at the house\'s clearance like every unit (runs.js wallGapOf), KIT_VANITY.lsp D6 and D27. No other kit '
      + 'ever carried the key at birth. ' + OWNER,
    gates: ['vanity'],
  },
  'src/engine/checks.js': {
    why: 'T83 F6: Check #45 says the void where it is now, one note per vanity kit, in the LISP\'s words (vanityVoidNote: '
      + '"Service void 80 inside the vanity behind the drawers."), its label "Service void inside a vanity, behind the '
      + 'drawers"; it no longer reads worktop.js serviceVoidOf (the stand-off, 0 at the wall). A note, never a cut. '
      + 'CLAUDE.md T83 F6: *"The Check\'s note #45 says "Service void 80 inside the vanity behind the drawers""*. ' + OWNER,
    gates: ['vanity'],
  },
  'src/engine/profile.js': {
    why: 'T83 F6: the comment over profile.vanity.serviceVoidMm says where the 80 is now (inside the carcass, behind the '
      + 'drawer boxes, KIT_VANITY.lsp D9 and D27); the number is unchanged (80, CONFIRMED). No key moves. ' + OWNER,
    gates: [],
  },
  'src/stores/projectStore.js': {
    why: 'T83 F6: migrateUnits gains migrateUnitVanityVoid: a vanity saved under T82 with exactly the birth gap (the '
      + 'clearance + serviceVoidMm, 90) drops it and stands at the house\'s clearance; a gap typed since stands. A load '
      + 'migration, never a cut. ' + OWNER,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

const WHY = 'T83 F6 · KIT_VANITY.lsp D27 (D9 amended): the carcass to the wall at the house\'s clearance (params.wall_gap '
  + '90 gone from the golden\'s params, the vanity born without it), the void 80 inside: every drawer box on the rung that '
  + 'keeps it behind its back face, 390 on the 400 runner at D 500 (T82: 440 on the 450), the box\'s back face at z 85 '
  + '(T82: 35); the sides, TOP, BOTTOM, rails, divider and fronts unchanged. With the carcass at the wall the basin\'s '
  + 'oval (its waste at wasteFromBack 200, T82\'s, moved by F8 to 250) stands 10 from the wall, inside the worktop\'s 20 '
  + 'margin, so engine/worktop.js fitBasins refuses it in words (#48) and the TOP takes no oval and keeps every back '
  + 'joint (RAIL-TOP\'s screw at W / 2 is cut again): F8 (slice V2) moves the basin 50 forward and re-pins these again. '
  + OWNER_FULL;

export const REPINNED = [
  { file: '../verify/t82/goldens/golden-vanity2.json', why: `${WHY} VANITY2 900 x 600 x 500, one basin.` },
  { file: '../verify/t82/goldens/golden-vanity3.json', why: `${WHY} VANITY3 900 x 600 x 500, one basin (the LISP's worked example).` },
  { file: '../verify/t82/goldens/golden-vanity4.json', why: `${WHY} VANITY4 900 x 600 x 500, one basin.` },
  { file: '../verify/t82/goldens/golden-vanity3-sinks0.json', why: `${WHY} VANITY3 with no basin: only the boxes and the params move.` },
  { file: '../verify/t82/goldens/golden-vanity3-sinks2.json', why: `${WHY} VANITY3, two basins on one column.` },
  { file: '../verify/t82/goldens/golden-vanity3-columns2.json', why: `${WHY} VANITY3, columns 2 and two basins: six boxes 390.` },
];

export const LISP = {
  'reference/lisp/KIT_VANITY.lsp': 'T83 F6 (CLAUDE.md T83 F6: *"KIT_VANITY.lsp\'s D rows of the void are re-written by V1 '
    + 'with the owner\'s words"*): D27 THE CARCASS TO THE WALL, THE VOID INSIDE written; D5, D6, D7, D9, D15, D21 '
    + 'amended; vanity-wall-gap the clearance; vanity-box-room new; vanity-box-depth and vanity-boxes take the void vd '
    + '(80 for the vanity, 0 for the parent and the chest); vanity-trap-plan, vanity-trap-verdict and vanity-bowl-verdict '
    + 'pass vanityServiceVoid; vanity-top-depth reads the stand-off (0 at the wall); vanity-void-note "inside the vanity '
    + 'behind the drawers"; part 6 THE VOID, THE BOXES and THE TRAP re-written. ' + OWNER_FULL,
};
