/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T79 F3 · INTERNAL DRAWERS: 1 OR 2 COLUMNS, THE DIVIDER AND THE CAP COME BY THEMSELVES. The owner, 18.10.2026:
// *"wstawianie szuflad w szafie działa super z diverterem ale muszę wstawić diverter z półką fix, a nie powinno być tak
// że diverter powinien się wstawiać sam jak wybieramy ile kolumn szuflad wstawiamy 1 czy 2?"*; 14:17: *"jak ustawiamy
// sobie teraz 3 szuflady internal to niech pyta czy chcesz 1 czy 2 kolumny, coś jak baye."*; the mockup
// (verify/t79/mockup-03-drawer-columns.png), 14:45: *"2 - tak."* THE PROBE (verify/t79/f03-probe.md, HEAD 672da20):
// WARDROBE 1200, a divider at x 591, 2 full-width drawers: PARTITION x 18..1182 at y 426, the boxes x 71..1129, VPART-1
// from y 18 to 2132 through the PARTITION and six box boards, no warning. THE LAW (this turn's own): a vertical divider
// stands ON the board that crowns a drawer stack and never passes through the boxes. Over a full-width internal stack
// the divider starts on the top face of its PARTITION (partitionY + G), the board stays full width; with EVERY bay
// carrying a column stack the columns are closed by ONE full-width FIX PARTITION at the tallest column's line, and the
// divider stands on the base and stops under it (terminatesOn 'PARTITION'), its head the 1710d biscuit set (the mark
// alone on the FIX board), the board's confirmats the full-width board's. A lone column keeps its Z<k>-PART. No new cut
// geometry (the board and the divider are existing parts), so no LISP. No golden has a divider and drawers together,
// so the gate opens on none of them and every golden holds; the new golden pins the two columns.

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

const itemsOf = (p) => (Array.isArray(p?.items) ? p.items : (p?.sections || []).flatMap((s) => s?.items || []));

/** WARDROBE 1200, the divider where `columns: 2` stands it, and `drawers` per column (zone null when `fullWidth`). */
function wardrobe({ perColumn = [3, 3], fullWidth = 0 } = {}) {
  const W = 1200;
  const G = P.board.thickness;
  const h = P.wardrobe.drawers.frontHeight;
  const items = [{ id: 'p1', kind: 'partition', x_mm: (W - G) / 2, front_mm: 0 }];
  perColumn.forEach((n, zone) => {
    for (let i = 1; i <= n; i += 1) {
      items.push({ id: `z${zone}d${i}`, kind: 'drawer', index: i, mount: 'internal', zone, height_mm: h });
    }
  });
  for (let i = 1; i <= fullWidth; i += 1) items.push({ id: `d${i}`, kind: 'drawer', index: i, mount: 'internal', height_mm: h });
  return { ...defaultParamsFor('WARDROBE', P), unit_num: '01', width: W, sections: [{ width_mm: W, items }] };
}

export const GATES = {
  columns: {
    what: 'a unit with a vertical divider AND drawers (a `partition` item, and `params.drawers` or a `drawer` item): '
      + 'the divider\'s floor over a full-width internal stack, and the one board over the columns when every bay '
      + 'carries a stack',
    opens: (p) => {
      const items = itemsOf(p);
      return items.some((i) => i?.kind === 'partition')
        && (Number(p?.drawers) > 0 || items.some((i) => i?.kind === 'drawer'));
    },
  },
};

export const LICENSED = {
  'src/engine/cabinet.js': {
    why: 'T79 F3 · the owner 18.10.2026 (14:17, "niech pyta czy chcesz 1 czy 2 kolumny, coś jak baye"; mockup 14:45, '
      + '"2 - tak"): the column plan (columnDrawerSets) is made before the dividers are cut, unchanged; columnCap (every '
      + 'bay carries a stack, none shoe-topped, no full-width or overlay stack) is ONE full-width FIX PARTITION at the '
      + 'tallest partY (stackCapBoard, the full-width board\'s own builder) in place of the Z<k>-PART boards, its '
      + 'confirmats the full-width board\'s (stackCapScrews), the dividers stop under it (capCeil, terminatesOn '
      + '\'PARTITION\', no screw through a divider) and assemblies.columnDrawers[].top reads it; a divider over a '
      + 'full-width internal stack stands on its PARTITION (partitionFloor = max(overlay floor, partitionY + G)); '
      + 'over a full-width stack the shoe drawer tops (no board, T70 F1) it says in words that it stands on nothing '
      + '(DIVIDER_ON_NO_BOARD); assemblies.columnCap { top, zones } is published only where the one board is cut (the '
      + 'store\'s full-width shelf band stands on it). Every cabinet without a divider and drawers together runs the '
      + 'lines it ran',
    gates: ['columns'],
  },
};

export const LIVENESS = {
  columns: () => {
    const full = computeCabinet(wardrobe({ perColumn: [], fullWidth: 2 }), P);
    const cols = computeCabinet(wardrobe({ perColumn: [3, 3] }), P);
    const fp = full.panels.find((p) => p.id === 'PARTITION');
    const fv = full.panels.find((p) => p.id === 'VPART-1');
    const cp = cols.panels.filter((p) => p.part === 'PARTITION');
    const cv = cols.panels.find((p) => p.id === 'VPART-1');
    const G = P.board.thickness;
    const boxes = full.panels.filter((p) => p.role === 'drawer_box');
    const through = boxes.filter((b) => fv && b.box.y < fv.box.y + fv.box.h && b.box.y + b.box.h > fv.box.y
      && b.box.x < fv.box.x + fv.box.w && b.box.x + b.box.w > fv.box.x).length;
    const one = cp.length === 1 ? cp[0] : null;
    return {
      live: Boolean(fp && fv && fv.box.y === fp.box.y + G && fp.box.x === G && fp.box.w === 1200 - 2 * G && through === 0
        && one && one.id === 'PARTITION' && one.box.x === G && one.box.w === 1200 - 2 * G
        && cv && cv.box.y === G && cv.box.y + cv.box.h === one.box.y && cv.meta?.terminatesOn === 'PARTITION'),
      said: `full-width stack: PARTITION x ${fp?.box.x}..${fp ? fp.box.x + fp.box.w : '?'} at y ${fp?.box.y}, VPART-1 from y `
        + `${fv?.box.y} (the board's top face), ${through} box boards crossed; two columns of 3: ${cp.length} PARTITION board(s) `
        + `(${cp.map((p) => `${p.id} x ${p.box.x} w ${p.box.w} y ${p.box.y}`).join(', ')}), VPART-1 y ${cv?.box.y}..`
        + `${cv ? cv.box.y + cv.box.h : '?'} terminatesOn ${cv?.meta?.terminatesOn ?? null}`,
    };
  },
};

export const GOLDENS = [
  {
    file: 'golden-drawer-columns.json',
    F: 'F34',
    source: 'T79 F3 (no new LISP: the board and the divider are existing parts, KIT_WARDROBE_FULL.lsp\'s PARTITION and '
      + 'the T11 divider): WARDROBE 1200, columns 2 as the store builds it (one divider at (W - G) / 2 = 591, full depth, '
      + 'three internal drawers in zone 0 and three in zone 1), the kit defaults only: ONE full-width FIX PARTITION over '
      + 'both stacks at the tallest line, the divider from the base to its underside',
    params: () => wardrobe({ perColumn: [3, 3] }),
  },
];
