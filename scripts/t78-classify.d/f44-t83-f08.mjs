/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T83 F8 (slice V2) · THE BASIN 50 FORWARD, AND IT NEVER ENTERS A BOARD. The owner, 25.10.2026 (22:41): *"umywalki
// przesun bardziej do przodu o jakies 50 mm, powod: wchodza w tylna scianke, zlamana regula material nigdy nie wchodzi
// w drugi material"*. CLAUDE.md T83 F8: wasteFromBack 200 becomes 250, the engine checks the bowl's solid against every
// board, a bowl that would enter a board is refused in words (#48), the U of the top box follows the waste.
// LISP FIRST: reference/lisp/KIT_VANITY.lsp D29 written; D13, D14, D15, D18, D21, D25, D26 amended; vanityWasteFromBack
// 250.0; vanity-u-depth, vanity-bowl-enters, vanity-bowl-shell, vanity-box-boards, vanity-bowl-boards, vanity-bowl-hits,
// vanity-bowl-sentence, vanity-bowl-refused; vanity-trap-u, vanity-trap-reach and vanity-bowl-verdict amended; part 6.
// The engine mirrors it under the existing gate `vanity` (scripts/t78-classify.d/f43-t82-f09.mjs): every line runs for
// a vanity kit only (`type.vanity`, `isVanityKit` in fitBasins, profile.vanity read by engine/vanity.js only). NO golden
// moves: T75's summary counts a board's outline points and holes, and the U's 245 (T82: 120) keeps its six key points
// and two arcs, the TOP's oval is a NOTE (meta, never on its CNC), and the F6 goldens already cut RAIL-TOP's screw at 450
// (the basin refused at 200 then, its back joint whole now), so the six T82 vanity goldens and F7's new one hold byte
// for byte (scripts/t78-classify.mjs strict: T78 goldens 42/42).

const OWNER = 'The owner, 25.10.2026 (22:41): *"umywalki przesun bardziej do przodu o jakies 50 mm, powod: wchodza w '
  + 'tylna scianke, zlamana regula material nigdy nie wchodzi w drugi material"*.';
const FOLLOWS = 'CLAUDE.md T83 F8: *"The U of the top box (columns 1) follows the waste"*.';

export const GATES = {};

export const LICENSED = {
  'src/engine/vanity.js': {
    why: 'T83 F8: vanitySpec\'s waste 250 (vanityWasteFromBack, D29); vanityUDepth (vanity-u-depth): the U follows the '
      + 'waste, max(trapDepthMm, waste + trapWidthMm / 2 - its box\'s back face), never past what keeps backPieceMinMm of '
      + 'the bottom, read by vanityTrapU, vanityTrapReach and the REACH sentence, published as derived trap depthMm; '
      + 'vanityBowlEnters (the room\'s half ellipsoid against a board\'s box), vanityBowlShell, vanityBowlHits, '
      + 'vanityBowlSentence ("the bowl enters RAIL-TOP by N mm: move the basin forward or take a shallower bowl"), '
      + 'vanityBowlRefused; vanityBowlVerdict reads every board of the cut but the TOP and the fronts (T82\'s block '
      + 'reading of the box retired, D25 amended). ' + OWNER + ' ' + FOLLOWS,
    gates: ['vanity'],
  },
  'src/engine/cabinet.js': {
    why: 'T83 F8: computeCabinet hands vanityBowlVerdict the cut\'s panels (the bowl board by board, D29) in the block '
      + 'guarded by type.vanity; the vanityBoxesOf import it no longer reads is dropped. ' + OWNER,
    gates: ['vanity'],
  },
  'src/engine/worktop.js': {
    why: 'T83 F8: fitBasins (isVanityKit only) refuses a basin the stone takes whose bowl enters the shell the params fix '
      + '(the rails and the sides, vanityBowlRefused, KIT_VANITY.lsp vanity-bowl-refused): not cut in the slab or the '
      + 'TOP, drawn nowhere, its refusal `why: bowl` in CLAUDE.md T83 F8\'s sentence, read by Check #48 as every basin '
      + 'refusal is. ' + OWNER,
    gates: ['vanity'],
  },
  'src/engine/profile.js': {
    why: 'T83 F8: profile.vanity.wasteFromBackMm 200 to 250 (CONFIRMED 22:41, the 50 the PROPOSED reading of "about 50"), '
      + 'read by engine/vanity.js only (no kit but the vanity reads profile.vanity). ' + OWNER,
    gates: ['vanity'],
  },
  'src/engine/checks.js': {
    why: 'T83 F8: Check #48\'s label names the bowl that enters a board ("Basins that do not fit the vanity\'s top, or '
      + 'whose bowl enters a board"); its findings are the engine\'s and the slab\'s sentences as before. A word, never a '
      + 'cut. ' + OWNER,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];

export const LISP = {
  'reference/lisp/KIT_VANITY.lsp': 'T83 F8 (CLAUDE.md T83 F8, LISP FIRST): D29 THE BOWL NEVER ENTERS A BOARD written; '
    + 'D13, D14, D15, D18, D21, D25, D26 amended; vanityWasteFromBack 250.0; vanity-u-depth, vanity-bowl-enters, '
    + 'vanity-bowl-shell, vanity-box-boards, vanity-bowl-boards, vanity-bowl-hits, vanity-bowl-sentence, '
    + 'vanity-bowl-refused; vanity-trap-u, vanity-trap-reach and vanity-bowl-verdict amended; the command passes sinks; '
    + 'part 6 THE TRAP, THE TOPS and THE BOWL re-written. ' + OWNER + ' ' + FOLLOWS,
};
