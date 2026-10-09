// ─── T75 · F12 · THE APPLIANCE TOWER, ONE KIT, PARENT KIT_FRIDGE ───────────
//
// CLAUDE.md T75 F12: *"`APPLIANCE_TALL` in `engine/types.js`, copied field by
// field from `FRIDGE` ... with `apertures: [...]` read from its defaults block:
// each aperture `{ role, h }` cuts KIT_FRIDGE's own aperture pattern (the back
// rails, the fixed panel, the spurs panel on its blocks) at that height ...
// Golden `golden-appliance-tall.json`."*
//
// Every delta hangs on ONE gate: the kit is a tower (`type.applianceTower`).
// FRIDGE and FRIDGE_US are not, and none of the six is.

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor, UNIT_TYPES } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

const kit = (type, extra = {}) => ({ ...defaultParamsFor(type, P), unit_num: '01', ...extra });

export const GATES = {
  applianceTower: {
    what: 'an appliance tower (APPLIANCE_TALL, APPLIANCE_TALL2: `type.applianceTower`, its `apertures` from the defaults block, F12)',
    opens: (p, id) => Boolean(UNIT_TYPES[id]?.applianceTower || UNIT_TYPES[p.type]?.applianceTower),
  },
};

export const LICENSED = {
  'src/engine/applianceTower.js': {
    why: 'F12 · NEW: the tower\'s stack, pure. Each aperture given its height (its role\'s, or the number it names: '
      + 'the oven\'s `ovenUnit.ovenHeight`, the fridge\'s `fridgeH`), stood one on another from the BOTTOM panel, '
      + 'the `fridgeH` KIT_FRIDGE is handed (the top fixed panel) and the door\'s base (the top of the highest machine)',
    gates: ['applianceTower'],
  },
  'src/engine/cabinet.js': {
    why: 'F12 · `normalizeParams` hands a tower\'s stack to KIT_FRIDGE as its `fridgeH` (`cfg.tower`); the lower '
      + 'fixed panels are its FIXED again (`FIXED1`..) with the same fixed screws; the door starts on the highest '
      + 'machine (folded into the overlay door\'s base, its ladder the LISP\'s low one run over its own height); '
      + 'one `appliance` order line per aperture; `derived.apertures`. A tower names its stack in the two KIT_FRIDGE '
      + 'warnings. Every line behind `cfg.tower`, null on every other kit',
    gates: ['applianceTower'],
  },
  'src/engine/types.js': {
    why: 'F12 · APPLIANCE_TALL (fridge freezer) and APPLIANCE_TALL2 (washer + dryer), FRIDGE field by field plus '
      + '`applianceTower`, prefix AT, their order, and `apertures` spread into their defaults alone',
    gates: ['applianceTower'],
  },
  'src/engine/profile.js': {
    why: 'F12 · `applianceTall`: the roles (microwave 450, washer 850, dryer 850 proposed; the oven and the fridge '
      + 'read where their numbers live) and one defaults block per row, with its migrate line. The six read none',
    gates: ['applianceTower'],
  },
  'src/engine/library.js': {
    why: 'F12 · Tall units: "Fridge freezer" and "Washer + dryer" open, "Oven tall" and "Oven + microwave" held with '
      + 'the reason; "Small fridge" closes onto DW_PANEL; `libraryTypeIds` names a kit two rows insert once. '
      + 'The library, not a cut',
    gates: [],
  },
  'src/engine/partRegistry.js': {
    why: 'F12 · the `appliance` hardware role and its registry row (bought, one line per aperture). No fixture '
      + 'orders one',
    gates: ['applianceTower'],
  },
};

export const LIVENESS = {
  applianceTower: () => {
    const r = computeCabinet(kit('APPLIANCE_TALL2', { doors: true }), P);
    const lower = r.panels.find((p) => p.id === 'FIXED1');
    const door = r.panels.find((p) => p.role === 'front');
    const lines = r.hardware.filter((h) => h.role === 'appliance');
    return {
      live: Boolean(lower) && lines.length === 2 && door?.box?.y === r.derived.door_base_y && r.derived.door_base_y > 0,
      said: `APPLIANCE_TALL2 cuts ${lower ? `FIXED1 at ${lower.box.y}` : 'no lower fixed panel'}, `
        + `a ${door?.h} door from ${door?.box?.y}, and orders ${lines.map((h) => h.label).join(' + ')}`,
    };
  },
};

export const GOLDENS = [
  {
    file: 'golden-appliance-tall.json',
    F: 'F12',
    source: 'KIT_FRIDGE.lsp: one aperture, FRIDGE hole for hole; the machine an order line',
    params: () => kit('APPLIANCE_TALL', { doors: true }),
  },
  {
    file: 'golden-appliance-tall2.json',
    F: 'F12',
    source: 'KIT_FRIDGE.lsp: two apertures, the lower closed by its FIXED again; the door on the dryer',
    params: () => kit('APPLIANCE_TALL2', { doors: true }),
  },
];
