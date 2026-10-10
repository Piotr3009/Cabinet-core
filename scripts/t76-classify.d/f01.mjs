// ─── T76 · F1 · THE PATCH LANDS, CONFLICTS RESOLVED BY THE TABLE ───────────
//
// CLAUDE.md T76 F1: *"Resolutions, each one BOTH sides unless stated."*  The
// three engine and lib files where T75's lines and GPT's met, and what each
// resolution added on top of GPT's own licence (`scripts/t76-classify.mjs`).
// Merged by that file; the shape is T75's (GATES, LICENSED, LIVENESS).
//
// The L's gate is F1's own: *"the L block FIRST (it pushes the L's two
// leaves), GPT's `front_decoration` pass AFTER it, so the L's doors are
// decorated like every other front."*  None of the six is an L, and no
// golden carries a recipe; the probe shows the order is live.

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor, UNIT_TYPES } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';
import * as FRONT_DECORATION from '../../src/engine/frontDecoration.js';

export const GATES = {
  decoratedL: {
    what: 'a decorative recipe on a true L kit (`params.front_decoration` on CORNER_L_*: the L block pushes its two '
      + 'leaves, the decoration pass after it decorates them, F1)',
    opens: (p, id) => Boolean(p?.front_decoration) && Boolean(UNIT_TYPES[id]?.corner || UNIT_TYPES[p?.type]?.corner),
  },
};

export const LICENSED = {
  'src/engine/cabinet.js': {
    why: 'F1 · the conflict at ~9189, both sides in this order: T75 F4\'s L block FIRST (it pushes the L\'s two '
      + 'leaves), GPT\'s `front_decoration` pass AFTER it, so the L\'s leaves are decorated like every other front',
    gates: ['frontDecoration', 'appliedStrips', 'decoratedL'],
  },
  'src/engine/bom.js': {
    why: 'F1 · both on the row: T75\'s `readiness` and GPT\'s `manufacturing`; ONE merge key carrying both (two '
      + 'fronts with different recipes are never one line, an outline never merges into a cut part); '
      + '`FRONT_SHEET_PARTS` the union, `pelmet` AND `front_moulding`. Off computeCabinet\'s import graph',
    gates: [],
  },
  'src/lib/cncExport.js': {
    why: 'F1 · both files ride the unit ZIP: T75 F22\'s READINESS.txt and GPT\'s front-operations.json; the sheet '
      + 'and material exports stay synchronous (T75 F23\'s refusals still throw), a Promise only for a decorated '
      + 'selection. A file writer, not a cut',
    gates: [],
  },
};

export const LIVENESS = {
  decoratedL: () => {
    const recipe = typeof FRONT_DECORATION.defaultFrontDecoration === 'function'
      ? FRONT_DECORATION.defaultFrontDecoration('G', P) : null;
    if (!recipe) return { live: false, said: 'the engine gives no recipe for G (`defaultFrontDecoration`)' };
    const r = computeCabinet({
      ...defaultParamsFor('CORNER_L_BASE', P), unit_num: 'CL01', doors: true, front_type: 'G', front_decoration: recipe,
    }, P);
    const leaves = r.panels.filter((p) => p.part === 'FRONT');
    const ready = leaves.filter((p) => p.meta?.frontDecoration?.status === 'ready');
    const first = leaves.find((p) => p.meta?.opensFirst);
    return {
      live: leaves.length === 2 && ready.length === 2 && Boolean(first),
      said: `CORNER_L_BASE with G fronts: ${ready.length} of ${leaves.length} leaves decorated `
        + `(${leaves.map((d) => `${d.meta?.arm} ${d.meta?.frontDecoration?.operations?.length ?? 0} op`).join(', ')}), `
        + `door ${first?.meta?.arm || 'none'} opens first`,
    };
  },
};
