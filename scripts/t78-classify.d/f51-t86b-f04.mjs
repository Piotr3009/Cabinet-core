/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T86B F4 . THE CHEST ISLAND'S BOARDS (CLAUDE.md T86B laws 4, 5, 6). The plan of a chest made an island
// (lib/chestIsland.js, NEW, pure); the plinth of a chest standing on a chest island's face set back on EVERY exposed
// side by the front's own number (engine/cabinet.js, behind `params.plinth_free`, which only the store hands: a bare
// kit, every fixture and every golden pass none); the island record keeps its variant and its slab's overhang
// (engine/room.js migrateIsland, the keys absent on a kitchen island); the profile's two numbers (the slab's overhang
// 0, the worktop's finishes). No existing golden moves; two new ones pin the two variants' plinths.

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

const OWNER = '*"chest powinna byc mozliwosc odsuniecia od sciany ale nie na zasadzie back move tylko powinna byc '
  + 'mozliwosc na srodku pokoju cos jak wyspa ale przez grab i move; i dodanie panela z tylu lub polaczenie szuflad z 2 '
  + 'stron"* (22:52); *"nie koniecznie nawis, nawis jako opcja prosze; 1 - oba"* (22:56) (the owner, 30.10.2026)';

const chest = (free) => ({
  ...defaultParamsFor('WARDROBE_CHEST3', P), unit_num: '01', width: 1200, depth: 600, height: 900, plinth: true,
  plinth_free: free,
});
export const PANEL_FREE = { left: true, right: true, back: true, backFaceMm: 18 };
export const DOUBLE_FREE = { left: true, right: true, back: false, backFaceMm: 0 };

export const GATES = {
  plinthFree: {
    what: 'a chest on a chest island\'s face (`params.plinth_free`, handed by the store only): its plinth set back on '
      + 'every exposed side (PLINTH, PLINTH-L, PLINTH-R, and PLINTH-B behind a back panel). No golden but this F\'s own '
      + 'carries the key',
    opens: (p) => Boolean(p?.plinth_free && typeof p.plinth_free === 'object'),
  },
};

export const LICENSED = {
  'src/engine/cabinet.js': {
    why: `T86B F4 (law 5): behind \`params.plinth_free\` the single-unit plinth is cut as four boards (or three, the `
      + `backs meeting): the front and the back between the two set-back side faces, the side returns between them, `
      + `every exposed face \`autoParts.plinth.setback\` in from the carcass (the back from the panel's face); the run's `
      + `strips are not asked. ${OWNER}`,
    gates: ['plinthFree'],
  },
  'src/engine/profile.js': {
    why: `T86B F4 (laws 6, 7): \`autoParts.worktop.islandOverhangMm: 0\` (the chest island's and the desk's slab, `
      + `CONFIRMED none by default) and \`autoParts.worktop.finishes: ['decor', 'spray']\` (the enum, PROPOSED name), in `
      + `the worktop's one namespace (T75 F5). Read by the store and the design layer, never by computeCabinet. ${OWNER}`,
    gates: [],
  },
  'src/engine/room.js': {
    why: `T86B F4 (law 4): \`migrateIsland\` keeps a chest island's \`chestIsland: { variant }\` and its slab's own `
      + `\`islandOverhangMm\`; both keys absent on every other island. A room reader, never read by computeCabinet. `
      + OWNER,
    gates: [],
  },
  'src/lib/chestIsland.js': {
    why: `T86B F4 (NEW, pure): \`chestIslandPlan\` (the footprint, the two faces, the slab plus its overhang all `
      + `round), \`CHEST_ISLAND_KITS\` / \`isChestIslandKit\` (the chests of drawers), \`islandOverhangOf\`, `
      + `\`chestIslandPlinthSides\` (the exposed sides the store hands the engine). Never read by computeCabinet. ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {
  plinthFree: () => {
    const r = computeCabinet(chest(PANEL_FREE), P);
    const b = Object.fromEntries(r.panels.filter((p) => p.part === 'PLINTH').map((p) => [p.id, p.box]));
    const live = b.PLINTH?.x === 50 && b['PLINTH-B']?.z === 32 && b['PLINTH-L']?.x === 50 && b['PLINTH-R']?.x === 1132;
    return { live, said: `PLINTH x ${b.PLINTH?.x}, PLINTH-B z ${b['PLINTH-B']?.z}, the returns at ${b['PLINTH-L']?.x} / ${b['PLINTH-R']?.x}` };
  },
};

const SRC = 'A WARDROBE_CHEST3 1200 x 600 x 900 on a plinth 100, standing on face A of a chest island';

export const GOLDENS = [
  {
    file: 'golden-t86b-f04-chest-panel.json',
    F: 'T86B F4 (law 5, variant A)',
    source: `${SRC}, variant A (the sprayed back panel 18 on face C): PLINTH 1100 at z 532 (50 behind the front), `
      + `PLINTH-L and PLINTH-R 482 long 50 inside the sides, PLINTH-B 1100 at z 32 (50 behind the panel's face). ${OWNER}`,
    params: () => chest(PANEL_FREE),
  },
  {
    file: 'golden-t86b-f04-chest-double.json',
    F: 'T86B F4 (law 5, variant B)',
    source: `${SRC}, variant B (a second chest back to back on face C): PLINTH 1100 at z 532, PLINTH-L and PLINTH-R `
      + `532 long 50 inside the sides, to the carcass back; no back board. ${OWNER}`,
    params: () => chest(DOUBLE_FREE),
  },
];

export const REPINNED = [];
