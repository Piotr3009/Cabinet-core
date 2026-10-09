// ─── T75 F19 · HOOKS AND THE VALET ROD ─────────────────────────────────────
//
// CLAUDE.md T75 F19: *"Two rows in Add items for the wardrobe family: `Hooks`
// (a row of N, BOM line, placeholder bodies, zero holes) and `Valet rod`
// (pull-out, BOM line, placeholder, zero holes)."*
//
// The cut-path delta hangs on an ITEM of kind hooks or valet_rod in a unit's
// section; the six carry no items at all. F19 cuts nothing: the liveness
// probe shows two bodies and two BOM lines appear and not one hole moves.

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

const NEW_KITS = ['hooks', 'valet_rod'];

export const GATES = {
  wardrobeKit2: {
    what: 'an item of kind hooks or valet_rod in the unit\'s section (F19)',
    opens: (p) => (p?.sections || []).some((s) => (s?.items || []).some((i) => NEW_KITS.includes(i?.kind))),
  },
};

export const LICENSED = {
  'src/engine/cabinet.js': {
    why: 'F19 · WARDROBE_KIT_KINDS gains hooks and valet_rod; a hooks item carries its `count` (the BOM qty, '
      + 'the profile\'s when it says none); a kit body may name its own depth. Placeholder bodies and BOM lines '
      + 'only: zero holes',
    gates: ['wardrobeKit2'],
  },
  'src/engine/profile.js': {
    why: 'F19 · `wardrobeAccessories.kits.hooks` (80 high, 60 deep, at 1500, 4 of them) and `.valet_rod` (40 high, '
      + 'at 1700): view numbers for the placeholders, marked T75 proposed. Kits are always the app\'s on migrate',
    gates: ['wardrobeKit2'],
  },
  'src/engine/partRegistry.js': {
    why: 'F19 · the `kit_hooks` and `kit_valet_rod` parts and their two `wardrobe_kit_*` roles, so the BOM '
      + 'knows the lines the engine now emits',
    gates: ['wardrobeKit2'],
  },
};

export const LIVENESS = {
  wardrobeKit2: () => {
    const base = { ...defaultParamsFor('WARDROBE', P), unit_num: '01' };
    const plain = computeCabinet(base, P);
    const r = computeCabinet({
      ...base,
      sections: [{ items: [{ id: 'h', kind: 'hooks', count: 6 }, { id: 'v', kind: 'valet_rod' }] }],
    }, P);
    const bodies = r.assemblies?.wardrobeKits || [];
    const hooks = r.hardware.find((h) => h.role === 'wardrobe_kit_hooks');
    const rod = r.hardware.find((h) => h.role === 'wardrobe_kit_valet_rod');
    const sameHoles = JSON.stringify(r.drills) === JSON.stringify(plain.drills);
    return {
      live: bodies.length === 2 && hooks?.qty === 6 && rod?.qty === 1 && sameHoles,
      said: `WARDROBE with hooks x ${hooks?.qty} and a valet rod: ${bodies.length} placeholder bodies, `
        + `${sameHoles ? 'not one hole moved' : 'HOLES MOVED'}`,
    };
  },
};
