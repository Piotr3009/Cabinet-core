// ─── T75 · F13 · THE BASE UNIT WITH DRAWERS BEHIND ITS DOORS ───────────────
//
// CLAUDE.md T75 F13: *"`BUD_INT`: `BUD` with `drawerStyle: 'wardrobe'`,
// `internalDrawers: 'all'`, `supports.drawers: true` (PANTRY's own two lines
// at base height), the T33 F6 door setback for drawers behind doors applied as
// it is in a wardrobe. Test hole for hole against PANTRY's drawer rows at the
// same numbers."*
//
// A new TYPE and its defaults block; not one line of cabinet.js is written
// for it. The gate is the type id: none of the six is BUD_INT.

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

const kit = (type, extra = {}) => ({ ...defaultParamsFor(type, P), unit_num: '01', ...extra });

export const GATES = {
  budInt: {
    what: 'the drawers-behind-doors base unit (BUD_INT: BUD with PANTRY\'s two lines, F13)',
    opens: (p, id) => id === 'BUD_INT' || p.type === 'BUD_INT',
  },
};

export const LICENSED = {
  'src/engine/types.js': {
    why: 'F13 · BUD_INT, BUD field by field with `drawerStyle: \'wardrobe\'`, `internalDrawers: \'all\'` and '
      + '`supports.drawers`; prefix BI; its order',
    gates: ['budInt'],
  },
  'src/engine/profile.js': {
    why: 'F13 · `baseInternalDrawerUnit.defaults` (600 x 770 x 558, two drawers, proposed) and its migrate line',
    gates: ['budInt'],
  },
  'src/engine/library.js': {
    why: 'F13 · Base units "Drawers behind doors". The library, not a cut',
    gates: [],
  },
};

export const LIVENESS = {
  budInt: () => {
    const r = computeCabinet(kit('BUD_INT', { doors: true }), P);
    const boxes = r.panels.filter((p) => /^D\d+-DNO$/.test(p.id)).length;
    const fronts = r.panels.filter((p) => p.part === 'DRAWER-FRONT').length;
    const dp = r.panels.some((p) => p.id.startsWith('DP'));
    return {
      live: boxes === 2 && fronts === 0 && dp,
      said: `BUD_INT cuts ${boxes} drawer boxes, ${fronts} drawer fronts, ${dp ? 'a DP panel behind the door' : 'no DP panel'}`,
    };
  },
};

export const GOLDENS = [
  {
    file: 'golden-bud-int.json',
    F: 'F13',
    source: 'KIT_BUD_FULL.lsp (the carcass and door) + the wardrobe kit\'s internal drawer machinery (PANTRY\'s)',
    params: () => kit('BUD_INT', { doors: true }),
  },
];
