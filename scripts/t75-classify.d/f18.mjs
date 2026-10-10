// ─── T75 F18 · THE LOW UNITS OF A WARDROBE JOB ─────────────────────────────
//
// CLAUDE.md T75 F18: *"`WARDROBE_LOW` copied from `LOW_CABINET`, family
// wardrobe, prefix `WL`, wardrobe depth, its own low height
// (`wardrobeLow.defaults`, 500). Hole for hole against LOW_CABINET."*
//
// Every engine delta hangs on a NEW TYPE id; none of the six is a low unit.

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

export const GATES = {
  low: {
    what: 'a wardrobe job\'s low unit (WARDROBE_LOW: a new type id, `type.besideWardrobe`, F18)',
    opens: (p, id) => id === 'WARDROBE_LOW' || p?.type === 'WARDROBE_LOW',
  },
};

export const LICENSED = {
  'src/engine/types.js': {
    why: 'F18 · WARDROBE_LOW copied field by field from LOW_CABINET (family wardrobe, the wardrobe\'s leg '
      + 'source, `besideWardrobe`), prefix WL, its order',
    gates: ['low'],
  },
  'src/engine/library.js': {
    why: 'F18 · the Wardrobes row "Low unit". The library, not a cut',
    gates: [],
  },
  'src/engine/profile.js': {
    why: 'F18 · `wardrobeLow.defaults` (600 x 500 x 568, rail offset 200) and its migrate line, marked T75 '
      + 'proposed. Read only by the low unit',
    gates: ['low'],
  },
};

const strip = (r) => JSON.stringify({
  panels: r.panels.map(({ id, box, cnc, w, h, role }) => ({ id, box, cnc, w, h, role })),
  drills: r.drills,
  hardware: r.hardware,
});

export const LIVENESS = {
  low: () => {
    const p = { ...defaultParamsFor('WARDROBE_LOW', P), unit_num: '01', doors: true };
    const r = computeCabinet(p, P);
    const q = computeCabinet({
      ...defaultParamsFor('LOW_CABINET', P), width: p.width, height: p.height, depth: p.depth, unit_num: '01', doors: true,
    }, P);
    const same = strip(r) === strip(q);
    return {
      live: same && r.panels.length > 0 && p.height === 500,
      said: `WARDROBE_LOW at ${p.width} x ${p.height} x ${p.depth} ${same ? 'cuts what LOW_CABINET cuts' : 'DIFFERS from LOW_CABINET'}`,
    };
  },
};

export const GOLDENS = [
  {
    file: 'golden-wardrobe-low.json',
    F: 'F18',
    source: 'KIT_LOW_CABINET_FULL.lsp (LOW_CABINET, hole for hole) at 600 x 500 x 568',
    params: () => ({ ...defaultParamsFor('WARDROBE_LOW', P), unit_num: '01' }),
  },
];
