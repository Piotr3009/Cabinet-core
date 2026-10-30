/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T86B F2 . A STACK IN A COLUMN HAS THE SAME NUMBERS AS A STACK ACROSS (CLAUDE.md T86B law 2). `derived.columnStacks
// [zone] = { drawerTotalH, partition_bottom_y }`, per column stack, read from the column's boxes and the board that
// closes it (its own Z<k>-PART, the ONE board over the columns, or the recess column's cap) as the full-width
// `drawerTotalH` and `partition_bottom_y` (T79) are from theirs. `derived` is not a cut: no panel, drill or mark
// moves, no golden hashes it, and the key is absent without a column stack. The six IDENTICAL by definition.

import { computeCabinet } from '../../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';
import { CASES } from './f50-t85-f02.mjs';

const OWNER = '*"zrob jak rekomendujesz"* (the owner, 30.10.2026, 23:02, on the Section for a column stack)';

const itemsOf = (p) => [
  ...(Array.isArray(p?.items) ? p.items : []),
  ...(Array.isArray(p?.sections?.[0]?.items) ? p.sections[0].items : []),
];

export const GATES = {
  columnStackNumbers: {
    what: 'a unit with a column of drawers (a drawer item in a zone): `derived.columnStacks` is written for each column '
      + 'stack the engine cuts. Derived only: no board, hole or mark of such a unit moves, so every golden that opens '
      + 'it is held by its own bytes',
    opens: (p) => itemsOf(p).some((i) => i?.kind === 'drawer' && i.zone != null && Number.isFinite(Number(i.zone))),
  },
};

export const LICENSED = {
  'src/engine/cabinet.js': {
    why: `T86B F2: each column set carries its stack's height (\`totalH\`, the twin of the full-width \`drawerTotalH\`) `
      + `and \`derived.columnStacks[zone]\` publishes it with the closing board's underside (\`columnCap.y\` or the `
      + `column's own \`partY\`), read by the Section's "Stack height" and "Partition (locked, required above the `
      + `stack)" rows. Derived only. ${OWNER}`,
    gates: ['columnStackNumbers'],
  },
};

export const LIVENESS = {
  // T85's fixture a: three drawers 200 in Column 2, the board over them at 629.
  columnStackNumbers: () => {
    const r = computeCabinet(CASES.a(), P);
    const s = r.derived.columnStacks?.[1];
    return {
      live: s?.drawerTotalH === 606 && s?.partition_bottom_y === 629,
      said: `Column 2: stack ${s?.drawerTotalH}, partition ${s?.partition_bottom_y}`,
    };
  },
};
