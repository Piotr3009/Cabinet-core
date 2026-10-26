/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T83 F2 . THE KIT: MIRROR_CABINET (slice M1). CLAUDE.md T83 F2: *"`engine/types.js`: `MIRROR_CABINET`, family
// bathroom ... `engine/cabinet.js` mirrors KIT_MIRROR.lsp byte for byte; `engine/mirrorCabinet.js` holds the arithmetic
// the kit shares ... A new golden `verify/t83/goldens/golden-mirror.json`"*. A NEW kit (FROZEN 1: new kits add, they
// never edit a fossil): every line of it is guarded by keys no kit written before tonight carries (`type.mirrorCabinet`,
// `carcass.top === 'mirror'`, the roles `mirror_door`, `mirror_panel`, `mirror_stile`, `led_stile`, `params.mirror`),
// so the gate `mirror_cabinet` is opened by MIRROR_CABINET only. Its golden is NEW (verify/t83/goldens, never
// re-pinned). Draft for INT: drop into scripts/t78-classify.d/ as f44-t83-f02.mjs.

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

const OWNER = 'The owner, 25.10.2026 (14:09): *"teraz zaprojektujmy dokladnie to co masz na rysunku szafka wiszaca"*; '
  + '*"lustro opcjonalnie, wtedy pamietaj ze drzwiczki 18 plus 4 mm lustro, przedluzamy panele do grubosci drzwiczek i '
  + 'lustra"*; (14:14) *"panele led trzeba bedzie zamontowac na rowno z drzwiami, nie wcisniete, mamy carcas w srodku i '
  + 'panele dookola tego"*; (22:41) *"daj wszystkie mozliwosci z panelami, z ledami, bez, szerokosc ustawianych '
  + 'drzwiczek etc"*.';

const kit = (extra = {}) => ({ ...defaultParamsFor('MIRROR_CABINET', P), unit_num: '01', ...extra });

export const GATES = {
  mirror_cabinet: {
    what: 'the mirror cabinet (`type.mirrorCabinet`, MIRROR_CABINET, `carcass.top: \'mirror\'`): KIT_MIRROR.lsp on its '
      + 'parent KIT_WUD_FULL, every part from engine/mirrorCabinet.js mirrorCabinetFigures (the panels round, the '
      + 'parent\'s five boards and their puzzle, BOX-TOP and BOX-FRONT, the DIVIDERs, the mirror doors, the stiles, the '
      + 'glass shelves), `derived.mirror`. No kit written before T83 F2 carries any of its keys.',
    opens: (params, typeId) => String(typeId || params?.type || '') === 'MIRROR_CABINET',
  },
};

export const LICENSED = {
  'src/engine/cabinet.js': {
    why: 'T83 F2: the import of engine/mirrorCabinet.js; `mirror_door`, `mirror_panel` and `mirror_stile` in '
      + 'FINISH_EXPOSED_ROLES and `mirror_door`, `mirror_panel` in FRONT_MATERIAL_ROLES (roles only this kit emits); '
      + 'one block behind `type.carcass.top === \'mirror\'` beside the HAWA pocket\'s that pushes the figures\' parts '
      + 'through panel() (a bought part `material_role` \'bought\') and their sentences (MIRROR_DOOR_WIDTHS, '
      + 'MIRROR_HINGE_REACH, MIRROR_SHELF_REFUSED); `derived.mirror`; the CSV and `pieces_total` leave the bought parts '
      + 'out, both behind `mirrorFigures` (null on every other kit, so the same panels reach both). The house\'s own '
      + 'passes take the kit\'s parts by their part names, as every kit\'s: the cups on part FRONT by `meta.cupY`, the '
      + `dividers' head and foot joint and their back screws on part VPART, the TOP's mirror at the end. ${OWNER}`,
    gates: ['mirror_cabinet'],
  },
  'src/engine/types.js': {
    why: 'T83 F2: MIRROR_CABINET after VANITY4 (family bathroom, mount wall, `mirrorCabinet: true`, `carcass.top: '
      + '\'mirror\'` and sides, bottom, back \'none\', supports all off, `mirror.defaults`), its id in UNIT_TYPE_ORDER, '
      + 'prefix MC, `isMirrorCabinet`, the import of mirrorDefaultParams and `defaultParamsFor`\'s spread of '
      + `params.mirror for this kit only. A kit written before tonight reads none of it. ${OWNER}`,
    gates: ['mirror_cabinet'],
  },
  'src/engine/mirrorCabinet.js': {
    why: 'T83 F2: new. The mirror of KIT_MIRROR.lsp part 5, routine for routine (mirror-carcass, mirror-panels, '
      + 'mirror-carcass-boards, mirror-box-lid, mirror-box-front, mirror-zones, mirror-doors, mirror-stiles, '
      + 'mirror-dividers, mirror-bays, mirror-door-kg, mirror-hinge-count, mirror-cups, mirror-plate-ys, mirror-pin-ys, '
      + 'mirror-shelf, mirror-back-panes, mirror-hanger-holes, mirror-widths-refusal ...), and mirrorCabinetFigures, '
      + `the one derivation computeCabinet cuts from, run only under \`carcass.top === 'mirror'\`. ${OWNER}`,
    gates: ['mirror_cabinet'],
  },
  'src/engine/partRegistry.js': {
    why: 'T83 F2: MIRROR-PANEL maps to end_panel (the panels round in the front material) and MIRROR-STILE to '
      + 'corner_post (a timber stile, a post in the fronts\' plane); the registry reads the engine\'s answer, the engine '
      + 'never reads it (test/t39-part-registry.test.js: zero unmapped part names).',
    gates: [],
  },
};

export const LIVENESS = {
  // KIT_MIRROR.lsp section 6, THE WORKED EXAMPLE: 1350 x 1100 x 215, panels 30, doors 327 / 477 / 327 x 937 at y 130,
  // the stiles 75 x 937 x 22 at x 360 and 915, DIVIDER-1 and DIVIDER-2 at 388.5 and 943.5, fifteen glass shelves.
  mirror_cabinet: () => {
    const r = computeCabinet(kit(), P);
    const doors = r.panels.filter((p) => p.part === 'FRONT');
    const stiles = r.panels.filter((p) => p.part === 'MIRROR-STILE');
    const dvs = r.panels.filter((p) => p.part === 'VPART');
    const glass = r.panels.filter((p) => p.part === 'SHELF');
    const panels = r.panels.filter((p) => p.part === 'MIRROR-PANEL');
    const live = JSON.stringify(doors.map((p) => [p.w, p.h, p.box.d])) === JSON.stringify([[327, 937, 22], [477, 937, 22], [327, 937, 22]])
      && JSON.stringify(stiles.map((p) => p.box.x)) === JSON.stringify([360, 915])
      && JSON.stringify(dvs.map((p) => p.box.x)) === JSON.stringify([388.5, 943.5])
      && glass.length === 15 && panels.length === 4 && panels.every((p) => p.box.d === 237);
    return {
      live,
      said: `MIRROR_CABINET 1350 x 1100 x 215 cuts doors ${doors.map((p) => p.w).join(' / ')} x ${doors[0]?.h}, stiles at `
        + `${stiles.map((p) => p.box.x).join(' and ')}, dividers at ${dvs.map((p) => p.box.x).join(' and ')}, ${glass.length} `
        + `glass shelves, ${panels.length} panels ${panels[0]?.box.d} deep`,
    };
  },
};

export const GOLDENS = [
  {
    file: '../verify/t83/goldens/golden-mirror.json',
    F: 'F44',
    source: 'T83 F2 (M1). KIT_MIRROR.lsp on its parent KIT_WUD_FULL, the worked example of section 6 (elevation 34 and '
      + 'section 33): MC 1350 x 1100 x 215, panels 30 round, the carcass 1290 x 1040, the bottom box 100 (BOX-TOP, '
      + 'BOX-FRONT 1287 x 97), doors 327 / 477 / 327 x 937 (330 / 480 / 330 less the gaps) 18 + 4, LED stiles 75 x 937 x 22, '
      + 'DIVIDER-1 and DIVIDER-2 at 388.5 and 943.5, fifteen glass shelves 6, three hinges a door on the Blum table, the '
      + `parent's hanger holes and cut-outs. ${OWNER}`,
    params: () => kit(),
  },
];

export const REPINNED = [];
