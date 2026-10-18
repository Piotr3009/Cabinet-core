/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T79 F13 . SETBACKS: SHELVES AND DIVIDERS 10 MM, DRAWERS UNTOUCHED. The owner, 18.10.2026: *"wszystkie cofnięcia
// zmień z 20 na 10 mm, 20 to stanowczo za dużo"*; 14:17: *"tylko półki i dividery, szuflady zostaw nie ruszaj."*
// By the fossil law the engine's bare numbers do not move: the project's 10 reaches the engine ONLY through
// paramsForEngine (`shelf_front_mm` from profile.carcass.shelfSetbackMm, `interior_setback_mm` from
// profile.carcass.dividerSetbackMm), and the board that caps a drawer stack, with the runner and bracket drilling
// read off it, takes its OWN `drawer_cap_setback_mm` (profile.wardrobe.drawers.capSetbackMm, the old 20). Absent,
// each falls back to exactly what a bare call read before: a shelf the LISP's 20, a divider 0, the cap what it read.
// No golden carries any of the three, so no golden opens the gate and every golden is byte for byte what it was.

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

export const GATES = {
  setback10: {
    what: 'a unit whose PROJECT setbacks are said (`shelf_front_mm`, `interior_setback_mm` or `drawer_cap_setback_mm`, '
      + 'injected by paramsForEngine from profile.carcass.shelfSetbackMm / dividerSetbackMm and '
      + 'profile.wardrobe.drawers.capSetbackMm); a bare computeCabinet() names none',
    opens: (p) => p?.shelf_front_mm != null || p?.interior_setback_mm != null || p?.drawer_cap_setback_mm != null,
  },
};

export const LICENSED = {
  'src/engine/cabinet.js': {
    why: 'T79 F13 · owner 18.10.2026 *"wszystkie cofnięcia zmień z 20 na 10 mm"*; *"tylko półki i dividery, szuflady '
      + 'zostaw nie ruszaj."* One law per family: a shelf reads `setbackOf(item.front_mm, params.shelf_front_mm ?? '
      + 'C.shelfDepthClearance)` (bare 20, as CLAUDE.md T79 F13 writes it) at its six sites (the cut depth, the box z, '
      + 'meta.front_mm, the shoe pivot, the stop rail, assemblies.shelves); `dividerSetback` = partition_front_mm, else interior_setback_mm (bare 0) for the '
      + 'vertical divider; `partitionDepth` (the drawer cap PARTITION and Z-PART boards, the column runner, screw and '
      + 'bracket drilling) = partition_front_mm, else `drawer_cap_setback_mm`, else interior_setback_mm (bare: what it '
      + 'read). The dead `shelfH` (no reader) deleted',
    gates: ['setback10'],
  },
  'src/engine/profile.js': {
    why: 'T79 F13 · `carcass.shelfSetbackMm: 10` and `carcass.dividerSetbackMm: 10` (the project\'s, the owner\'s 10) '
      + 'replace `carcass.interiorSetback: 20`; `wardrobe.drawers.capSetbackMm: 20` (*"szuflady zostaw"*). '
      + '`carcass.shelfDepthClearance` stays the LISP\'s 20. Read by the store only; the engine hears them through the gate',
    gates: ['setback10'],
  },
};

export const LIVENESS = {
  // A WARDROBE 1200 with a shelf, a divider and two internal drawers: bare, as a project after T79 F13, and as a
  // project before it (interior_setback_mm 20 alone). The shelf and the divider move to 10; the cap stays 20.
  setback10: () => {
    const W = defaultParamsFor('WARDROBE', P);
    const items = [
      { id: 's1', kind: 'shelf', pos_mm: 1400 },
      { id: 'p1', kind: 'partition', x_mm: 591 },
      { id: 'd1', kind: 'drawer', index: 1, mount: 'internal' },
      { id: 'd2', kind: 'drawer', index: 2, mount: 'internal' },
    ];
    const at = (extra) => computeCabinet({ ...W, width: 1200, unit_num: 'W1', items, ...extra }, P);
    const pick = (r, id) => r.panels.find((p) => p.id === id);
    const bare = at({});
    const now = at({ shelf_front_mm: 10, interior_setback_mm: 10, drawer_cap_setback_mm: 20 });
    const was = at({ interior_setback_mm: 20 });
    const front = (r, id) => pick(r, id)?.meta?.front_mm;
    const live = front(bare, 'SHELF-1') === 20 && front(now, 'SHELF-1') === 10
      && front(bare, 'VPART-1') === 0 && front(now, 'VPART-1') === 10
      && front(now, 'PARTITION') === 20 && pick(now, 'PARTITION')?.box?.d === pick(was, 'PARTITION')?.box?.d
      && pick(now, 'SHELF-1')?.box?.d - pick(bare, 'SHELF-1')?.box?.d === 10;
    return {
      live,
      said: `WARDROBE 1200: SHELF-1 front ${front(bare, 'SHELF-1')} bare, ${front(now, 'SHELF-1')} in a project `
        + `(depth ${pick(bare, 'SHELF-1')?.box?.d} to ${pick(now, 'SHELF-1')?.box?.d}); VPART-1 front ${front(bare, 'VPART-1')} `
        + `bare, ${front(now, 'VPART-1')} in a project; the drawer cap PARTITION front ${front(now, 'PARTITION')}, depth `
        + `${pick(now, 'PARTITION')?.box?.d} (before T79 F13: ${pick(was, 'PARTITION')?.box?.d})`,
    };
  },
};
