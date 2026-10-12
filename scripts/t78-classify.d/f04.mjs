// T78 F4 · the grain of the L boards: TOP-L, BOTTOM-L and SHELF-L state
// `cnc.grain: 'w'` (KIT_CORNER_L.lsp section 10, LISP FIRST); the nest, the
// cut list arrow and the 3D follow from the one field.
import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';
import { sheetTurn } from '../../src/engine/cnc/layout.js';

export const LICENSED = {
  'src/engine/decors.js': {
    why: "T78 F4 (6fc07be): `decorMapping` breaks the square L face's tie by the cut's own axis (the grain the CNC cut decides, the 3D renders it): a picture, never a cut. Opens with the L grain gate only.",
    gates: ['lGrain'],
  },
  'src/engine/cabinet.js': {
    why: 'T78 F4: the L builder states `cnc.grain: \'w\'` on TOP-L, BOTTOM-L and every SHELF-L (the drawn frame, T37 F7a), '
      + 'mirroring KIT_CORNER_L.lsp section 10; the CNC frame does not move (outline, bones, relief, area, box, CSV row), so '
      + 'the three L goldens hold byte for byte (T75\'s summary carries no lay) and the six never cut an L board',
    gates: ['cornerL'],
  },
};

export const LIVENESS = {
  // The `cornerL` gate is F1's; this probe is read under it by the classifier's merge
  // (a second probe for a gate is a failure), so F4 states its own liveness under a name of its own.
};

export const GATES = {
  lGrain: {
    what: 'an L corner kit\'s TOP-L / BOTTOM-L / SHELF-L (cut by `type.corner` kits only)',
    opens: (params, typeId) => Boolean(typeId && String(typeId).startsWith('CORNER_L')),
  },
};

export const LIVENESS_L_GRAIN = {
  lGrain: () => {
    const r = computeCabinet({ ...defaultParamsFor('CORNER_L_BASE', P), unit_num: 'CL01', doors: true, shelves: 1 }, P);
    const boards = ['TOP-L', 'BOTTOM-L', 'SHELF-L-1'].map((id) => r.panels.find((p) => p.id === id));
    const grains = boards.map((b) => b?.cnc?.grain);
    const turns = boards.map((b) => (b ? sheetTurn(b, P) : null));
    const bud = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01', doors: true, shelves: 1 }, P);
    const shelf = bud.panels.find((p) => p.part === 'SHELF');
    return {
      live: grains.every((g) => g === 'w') && turns.every((t) => t === 90) && shelf?.cnc?.grain !== 'w',
      said: `L boards grain ${JSON.stringify(grains)}, sheetTurn ${JSON.stringify(turns)}; a BUD shelf grain ${shelf?.cnc?.grain ?? 'none'}`,
    };
  },
};
Object.assign(LIVENESS, LIVENESS_L_GRAIN);
