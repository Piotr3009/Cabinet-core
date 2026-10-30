/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T86B F3 . A SHELF SPANS BETWEEN ITS WALLS AT ITS OWN HEIGHT (CLAUDE.md T86B law 3). A zoned shelf is measured
// between the nearest boards that REACH its height (the drilling's own `shelfBearers` law): above a recess column's
// cap (T85 D29) and above the ONE board over every column (T79 F3) no divider stands, so a shelf added there runs
// side to side of the carcass (less its clearance), the sides its bearers; a divider of the joiner's own narrows it
// as any divider does. The shelf's cut is unchanged (KIT_RECESS.lsp: one dated comment line beside
// recess-shelf-bump, the parent rectangle it is handed). A shelf whose bay walls reach it is untouched byte for byte.
// RE-PINNED: NONE. Every 28.10 and T85 recess-column fixture was read (golden-recess-drawers.json, golden-t85-a to
// e): none carries a shelf above the cap, so none moves; the new cut is pinned by its own golden below.

import { computeCabinet } from '../../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';
import { CASES } from './f50-t85-f02.mjs';

const OWNER = '*"zrob jak rekomendujesz"* (the owner, 30.10.2026, 23:02, on the shelf over a column)';

const itemsOf = (p) => [
  ...(Array.isArray(p?.items) ? p.items : []),
  ...(Array.isArray(p?.sections?.[0]?.items) ? p.sections[0].items : []),
];
const zoned = (i) => i?.zone != null && Number.isFinite(Number(i.zone));

/** The owner's recess wardrobe (T85 fixture a), a shelf added to Column 2 at 1200, above the cap at 629. */
export const SHELF_OVER_COLUMN = () => {
  const p = CASES.a();
  return { ...p, items: [...p.items, { id: 's1', kind: 'shelf', zone: 1, pos_mm: 1200 }] };
};

export const GATES = {
  shelfOverColumn: {
    what: 'a zoned shelf in a unit with a column of drawers (a shelf and a drawer item each in a zone): the shelf is '
      + 'measured between the walls that reach its height, so one above the column\'s cap runs side to side. A shelf '
      + 'whose bay walls reach it (below the cap, or with no cap) reaches no changed line',
    opens: (p) => itemsOf(p).some((i) => i?.kind === 'shelf' && zoned(i))
      && itemsOf(p).some((i) => i?.kind === 'drawer' && zoned(i)),
  },
};

export const LICENSED = {
  'src/engine/cabinet.js': {
    why: `T86B F3: one pass after the dividers are cut (before the recess extension and the drilling): a SHELF in a `
      + `zone whose bay walls do not reach its height (\`shelfBearers\` on \`bearingWalls\`, the drilling's own law) is `
      + `re-measured between the walls that do (the sides, or a divider that reaches), its clearance, depth, frame and `
      + `run as before, its shoe rail with it; a slope over the wider span keeps the bay. ${OWNER}`,
    gates: ['shelfOverColumn'],
  },
};

export const LISP = {
  'reference/lisp/KIT_RECESS.lsp': `T86B F3 (30.10.2026): one dated comment line beside recess-shelf-bump: above a `
    + `recess column's cap the parent shelf runs side to side (no divider stands there). No routine changes. ${OWNER}`,
};

export const LIVENESS = {
  shelfOverColumn: () => {
    const r = computeCabinet(SHELF_OVER_COLUMN(), P);
    const s = r.panels.find((p) => p.id === 'SHELF-1');
    const pins = [...new Set(r.drills.filter((d) => d.kind === 'shelf' && d.y >= 1150 && d.y <= 1250).map((d) => d.panel))];
    return {
      live: s?.box?.x === 20 && s?.w === 1160 && pins.join(' ') === 'BUL BUR',
      said: `SHELF-1 x ${s?.box?.x} w ${s?.w}, pins on ${pins.join(' ')}`,
    };
  },
};

export const GOLDENS = [
  {
    file: 'golden-t86b-f03-shelf-over-column.json',
    F: 'T86B F3 (law 3, the shelf over a column)',
    source: 'KIT_RECESS.lsp I4 CASE G (a) (the owner\'s wardrobe 1200 x 2150 x 300 before his recess 800 x 300, ed '
      + '290, the dividers 210 and 972 under the board over three drawers 200 at 629) with a shelf added to Column 2 '
      + 'at 1200: SHELF-1 runs side to side, x 20 w 1160 (the clearance 2 each end), its bump into the recess between '
      + `the RETURNs' inner faces (230 .. 970), its pins on BUL and BUR. ${OWNER}`,
    params: SHELF_OVER_COLUMN,
  },
];

export const REPINNED = [];
