/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// After T79 · the owner's eye-test of 19.10.2026, point F11, named here so the strict run says why. His words
// (09:16): *"nie ma mozliwosci dodania drugiego ponizej, dodaj to prosze, i proponuj (jak polki) 950 jedne od
// drugiego"*; asked "950 mm os do osi, drugi w tym samym bayu pod pierwszym?" (09:59): *"tak ale tylko jako
// propozycja"*; 10:15: *"koduj, nic juz nie pytaj"*. LISP first: reference/lisp/KIT_HANGER_TWO.lsp (a NEW file; the
// fossil kits untouched; KIT_WARDROBE_FULL's own rail routines are CALLED). The engine: every unit-wide hanger item
// after the first is a rod of its own, cut by the column-rail law with no column (zone null: the whole bay, BUL to
// BUR), so a cabinet with one rod reaches no changed line and the six and every other golden hold byte for byte.
// The store proposes the second 950 under the first and refuses a third or no room in words; the drag offers 950
// under and over the other rod as T79 F11 offers 50 under a shelf.

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

const OWNER = '*"nie ma mozliwosci dodania drugiego ponizej, dodaj to prosze, i proponuj (jak polki) 950 jedne od '
  + 'drugiego"*; *"tak ale tylko jako propozycja"* (19.10.2026)';

const unitWideHangers = (p) => ((p?.sections || []).flatMap((s) => s?.items || []))
  .filter((i) => i?.kind === 'hanger' && (i.zone == null || !Number.isFinite(Number(i.zone))));

export const GATES = {
  secondRail: {
    what: 'a unit whose section carries TWO or more unit-wide hanger items (no zone): the second and every later one '
      + 'is cut as a rod of its own, with its two bracket screws and its purchase line. One hanger, or hangers in '
      + 'columns only, reaches no changed line',
    opens: (p) => unitWideHangers(p).length >= 2,
  },
};

export const LICENSED = {
  'src/engine/cabinet.js': {
    why: `Owner 19.10.2026 (KIT_HANGER_TWO.lsp D4): cfg.columnRails gains the unit-wide hangers after the first as specs `
      + 'with zone null; the column-rail loop takes a null zone as the whole bay (BUL to BUR, the unit-wide shelves and '
      + 'stack as supports), its bracket screws into BUL and BUR, its BOM line without a column, its RAIL_TOO_HIGH '
      + `said as "Second rail"; counts.rail counts them. The first rod, rail / railOffset, untouched. ${OWNER}`,
    gates: ['secondRail'],
  },
  'src/engine/profile.js': {
    why: `Owner 19.10.2026: hardware.hanger.betweenRailsMm 950, PROPOSED, owner to confirm (KIT_HANGER_TWO.lsp D5); read `
      + `by the store's proposal and magnet only, never by a cut. ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {
  // KIT_HANGER_TWO.lsp NUMBERS: WARDROBE 600 x 2150, the first rod at 1418, the second at 468: four bracket screws
  // (BUL and BUR at 1418 and 468), two rail purchase lines of 564; the same wardrobe with one rod keeps its two and one.
  secondRail: () => {
    const kit = (items) => ({ ...defaultParamsFor('WARDROBE', P), unit_num: '01', sections: [{ width_mm: 600, items }] });
    const first = { id: 'h1', kind: 'hanger', pos_mm: 1400, datum: 'bottom', mount: 'alone' };
    const one = computeCabinet(kit([first]), P);
    const two = computeCabinet(kit([first, { id: 'h2', kind: 'hanger', pos_mm: 450, datum: 'bottom', mount: 'alone' }]), P);
    const brackets = (r) => r.drills.filter((d) => d.kind === 'rail_bracket').map((d) => `${d.panel}:${d.y}`).sort().join(' ');
    const rails = (r) => r.hardware.filter((h) => h.role === 'rail').reduce((n, h) => n + h.qty, 0);
    const rods = (r) => [r.assemblies.rail, ...(r.assemblies.columnRails || [])].filter(Boolean).map((x) => x.y).join(' ');
    const live = brackets(two) === 'BUL:1418 BUL:468 BUR:1418 BUR:468' && rails(two) === 2 && rods(two) === '1418 468'
      && brackets(one) === 'BUL:1418 BUR:1418' && rails(one) === 1 && two.warnings.length === 0;
    return {
      live,
      said: `WARDROBE 600 with one rod: brackets ${brackets(one)}, rails ${rails(one)}; with two: brackets ${brackets(two)}, `
        + `rails ${rails(two)}, rods at ${rods(two)}, ${two.warnings.length} warning(s)`,
    };
  },
};

export const GOLDENS = [
  {
    file: 'golden-rails-two.json',
    F: 'F37',
    source: 'KIT_HANGER_TWO.lsp NUMBERS on KIT_WARDROBE_FULL.lsp: WARDROBE 600 x 2150 x 568, the first rod ALONE at its '
      + 'default (railOffset 1400, axis 1418), the second born 950 under it (pos_mm 450, axis 468): two bracket screws per '
      + 'side on SCREWS_3MM, two rail lines of 564',
    params: () => ({
      ...defaultParamsFor('WARDROBE', P),
      unit_num: '01',
      sections: [{
        width_mm: 600,
        items: [
          { id: 'h1', kind: 'hanger', pos_mm: 1400, datum: 'bottom', mount: 'alone' },
          { id: 'h2', kind: 'hanger', pos_mm: 450, datum: 'bottom', mount: 'alone' },
        ],
      }],
    }),
  },
];
