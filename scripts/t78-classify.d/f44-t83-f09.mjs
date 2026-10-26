/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T83 F9 (slice V3) · THE OPEN OF A TWO-COLUMN VANITY. The owner, 25.10.2026 (22:41): *"jak wpieram 2 rows to
// otwieraja mi sie 2 szuflady ale jedna sie otwiera carcas tylko a druga front tylko zamiast 2 carcasy i 2 fronty,
// sprawdz"*. PROBE first (verify/t83/f09-probe.md, P1): the column stack (cabinet.js colMeta, KIT_VANITY.lsp 5(c2))
// already stamps `{ drawer, column }` on every box part AND its front, a wardrobe's bay `{ drawer, zone }` on both: no
// meta line of the cut is missing, so cabinet.js is NOT touched and no part, drill, BOM line or golden moves. The fault
// was the reader: engine/drawerMotion.js keyed the open and the travel on meta.drawer alone (one front slid the box of
// that number in every column and every bay), and hardware3d.js numbers a second column's runners after the first's,
// which no front carries. The fix is the room's arithmetic only: `drawerKey` (the drawer, and its column or bay where
// it has one; the bare number on one stack, so every one-stack unit opens as it did), and on a column stack's runner
// pairs `ride` (the key of the drawer they carry), read by `runnerSlide` for 3d/Hardware.jsx. No new gate: the runner
// key is written only where `meta.column` is cut, which the existing gates `chest_columns` and `vanity`
// (f43-t82-f09.mjs) open; the motion is a scene value that no golden carries.

const OWNER = 'The owner, 25.10.2026 (22:41): *"jak wpieram 2 rows to otwieraja mi sie 2 szuflady ale jedna sie '
  + 'otwiera carcas tylko a druga front tylko zamiast 2 carcasy i 2 fronty, sprawdz"*.';

export const GATES = {};

export const LICENSED = {
  'src/engine/drawerMotion.js': {
    why: 'T83 F9: `drawerKey` (the drawer number alone where a part carries neither `meta.column` nor `meta.zone`, '
      + 'the number and its column or bay otherwise), `drawerKeyOf`; drawerTravel, drawerOpenAmounts and forPanel key '
      + 'on it, so a front opens its own column\'s box and no other; `runnerSlide` (a pair\'s `ride` key, or its drawer '
      + 'number where it has none) for 3d/Hardware.jsx. The room\'s motion, never a cut: computeCabinet does not read '
      + 'this file and no golden carries its maps. verify/t83/f09-probe.md rows 2, 6, 9, 10. ' + OWNER,
    gates: [],
  },
  'src/engine/hardware3d.js': {
    why: 'T83 F9: runnerInstances adds `ride` (drawerKey of its row and its group\'s `meta.column`) to the pairs of a '
      + 'column stack only, so the right column\'s pairs ride when its own front opens (they were numbered 4 to 6 and '
      + 'rode with none); `drawer`, x, y, z and the counts are as they were, and a stack with no column writes no key. '
      + 'Display only, no hole, no count. verify/t83/f09-probe.md rows 2 and 9. ' + OWNER,
    gates: ['chest_columns', 'vanity'],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
