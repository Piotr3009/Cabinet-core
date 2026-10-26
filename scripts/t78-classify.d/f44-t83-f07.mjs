/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T83 F7 (slice V2) · THE TRAP'S U AT TWO COLUMNS WITH ONE BASIN. The owner, 25.10.2026 (22:41): *"nie ma wyciecia
// na U na sinki nawet jak je wlacze ... jest wyciecie jak jest 1 szuflada ale nie jak sa 2 szuflady a mamy jeden sink,
// albo mam pomysl: zmniejszmy szuflady na szerokosc, tylko fronty zostawmy szerokie i pomiedzy szufladami zrobi sie
// miejsce na syfon (tylko gorna row)"*. PROBE first (verify/t83/f07-probe.md, P1): the waste at W / 2 stood inside the
// DIVIDER, status DIVIDER, no U; the columns rule fixes no shelf over the stacks; vanity.trapClearMm is #39's 60.
// LISP FIRST: reference/lisp/KIT_VANITY.lsp D28 written, D10, D11, D17, D21 amended; vanity-trap-gap, vanity-gap-box,
// vanity-gap-fits-p, vanity-gap-of, vanity-boxes-cut, vanity-divider-cut, vanity-trap-shallow; the GAP of
// vanity-trap-plan and the RUNNERS of vanity-trap-verdict; part 6 ONE BASIN ON TWO COLUMNS re-written. The engine
// mirrors it under the existing gate `vanity` (scripts/t78-classify.d/f43-t82-f09.mjs): every line runs only for a
// vanity at columns 2 with one basin (`budr.trapGap`, `meta.trapGap`), so the six, T75's to T82's goldens, the chest's
// three and every other kit cut what they cut. No existing golden is moved: golden-vanity3-columns2 is columns 2 with
// TWO basins, T82's road, byte for byte. One NEW golden, never re-pinned by this F: columns 2, one basin.

import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

const OWNER = 'The owner, 25.10.2026 (22:41): *"zmniejszmy szuflady na szerokosc, tylko fronty zostawmy szerokie i '
  + 'pomiedzy szufladami zrobi sie miejsce na syfon (tylko gorna row)"*.';
const kit = (type, extra = {}) => ({ ...defaultParamsFor(type, P), unit_num: '01', ...extra });

export const GATES = {};

export const LICENSED = {
  'src/engine/cabinet.js': {
    why: 'T83 F7: the import of engine/vanity.js vanityGapOf and vanityGapBox; in the BUDR drawer block `trapGap`, '
      + 'computed only for `type.vanity` at columns 2 (no hob dummy) when vanityGapOf answers (one basin, every narrowed '
      + 'box keeping walls of backPieceMinMm): the top row\'s two boxes narrowed to the gap, their walls, bottoms and front '
      + 'screw shifts by the parent\'s law; drawerColumnsDivider takes `top` (the top row\'s runner underside) and cuts '
      + 'the SHORT DIVIDER (`short: true`, meta.fullHeight false, meta.trapGap); the four box loops read `boxOf(c, i)` '
      + '(the column itself on every other unit and row) and add meta.trapGap to the narrowed boards only; the divider '
      + 'runner drilling and drillSummary.divider_runner_rows_y keep the rows below its head when `short`; '
      + 'applyVanityTrap is handed the gap. KIT_VANITY.lsp D28, vanity-boxes-cut, vanity-divider-cut. ' + OWNER,
    gates: ['vanity'],
  },
  'src/engine/vanity.js': {
    why: 'T83 F7: vanitySpec reads trapGapClearMm (20, PROPOSED); vanityTrapGap (vanity-trap-gap), vanityGapBox '
      + '(vanity-gap-box) and vanityGapOf (vanity-gap-of, vanity-gap-fits-p); vanityTrapPlan takes `gap`: the waste\'s '
      + 'status GAP, no U; vanityTrapVerdict says RUNNERS ("The trap stands in the gap between the top drawers: no wall '
      + 'carries their two inner runners") and the shallow-trap air as before (vanityTrapShallow, vanity-trap-shallow); '
      + 'applyVanityTrap takes `gap` and publishes it in derived.vanity.trap. KIT_VANITY.lsp D28. ' + OWNER,
    gates: ['vanity'],
  },
  'src/engine/profile.js': {
    why: 'T83 F7: profile.vanity.trapGapClearMm 20 (PROPOSED, CLAUDE.md T83 F7 "160 / 2 + 20 PROPOSED"), its own key '
      + 'beside trapClearMm (60, #39\'s shallow-trap air, the probe\'s name clash), read by engine/vanity.js only, for a '
      + 'vanity at columns 2 with one basin. ' + OWNER,
    gates: ['vanity'],
  },
  'src/engine/hardware3d.js': {
    why: 'T83 F7: runnerInstances places a pair on its OWN drawer\'s sides where those sides carry meta.trapGap (a '
      + 'vanity\'s top row narrowed to the trap\'s gap, KIT_VANITY.lsp D28: "their runners moved with them"); every '
      + 'other drawer\'s pair reads the column\'s faces as before. Display only, no hole. ' + OWNER,
    gates: ['vanity'],
  },
};

export const LIVENESS = {};

export const GOLDENS = [
  {
    file: '../verify/t83/goldens/golden-vanity3-columns2-sinks1.json',
    F: 'F44',
    source: 'T83 F7 (V2). KIT_VANITY.lsp D28 THE TRAP\'S GAP on VANITY3 900 x 600 x 500, columns 2, one basin: the gap '
      + '350..550 centred on the waste at 450; Z1D3 at x 23 and Z2D3 at x 550, 327 wide, walls 291, bottoms 304; the '
      + 'fronts 447 at x 1.5 and 451.5 unchanged; the SHORT DIVIDER at x 441, 18 x 382 x 482, to the top row\'s runner '
      + 'underside at 400; no U; #39 RUNNERS. ' + OWNER,
    params: () => kit('VANITY3', { columns: 2, sinks: 1 }),
  },
];

export const REPINNED = [];

export const LISP = {
  'reference/lisp/KIT_VANITY.lsp': 'T83 F7 (CLAUDE.md T83 F7, the owner\'s road): D28 THE TRAP\'S GAP written; D10, '
    + 'D11, D17, D21 amended; vanityTrapGapClear 20.0 (PROPOSED); vanity-trap-gap, vanity-gap-box, vanity-gap-fits-p, '
    + 'vanity-gap-of, vanity-boxes-cut, vanity-divider-cut, vanity-trap-shallow; vanity-trap-plan GAP, '
    + 'vanity-trap-verdict RUNNERS; the command draws vanity-divider-cut; part 6 ONE BASIN ON TWO COLUMNS. ' + OWNER,
};
