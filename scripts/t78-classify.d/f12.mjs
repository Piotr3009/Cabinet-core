// T78 F12 · the glass is in the door; smoke by default, with a choice.
import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

export const GATES = {
  glassKind: {
    what: 'a glazed leaf (`meta.glass`): its kind from `door_glass[id]`, `glass_kind` or the profile\'s default (smoke); the BOM '
      + 'line is named by kind. A leaf without glass is untouched',
    opens: (params, typeId) => params?.front_type === 'GL' || String(typeId || '').includes('GLASS')
      || Boolean(params?.door_glass) || Boolean(params?.glass_kind),
  },
};

export const LICENSED = {
  'src/engine/profile.js': {
    why: 'T78 F12: `front.glass` (kinds, default smoke the owner\'s, paneMm 4 proposed, labels); read on a glazed leaf only',
    gates: ['glassKind'],
  },
  'src/engine/cabinet.js': {
    why: 'T78 F12: `meta.glass.kind` / `paneMm` on a glazed leaf and the glass order line per kind and aperture, named; the '
      + 'aperture cut and the frame did not move',
    gates: ['glassKind'],
  },
  'src/engine/design.js': {
    why: 'T78 F12 / F13: `fronts.glassKind` and `fronts.hingeFamily` in the design\'s shape and migration (null = nobody said); '
      + 'the design layer, not a cut',
    gates: ['glassKind'],
  },
};

export const LIVENESS = {
  glassKind: () => {
    const r = computeCabinet({ ...defaultParamsFor('WUD_GLASS', P), unit_num: 'WG01', doors: true }, P);
    const leaf = r.panels.find((p) => p.part === 'FRONT' && p.meta?.glass);
    const line = r.hardware.find((h) => h.role === 'glass_pane');
    return {
      live: leaf?.meta.glass.kind === 'smoke' && line?.label === 'Smoked glass 4 mm',
      said: `WUD_GLASS: the leaf's glass is ${leaf?.meta.glass.kind}, the line reads "${line?.label}"`,
    };
  },
};

export const GOLDENS = [];

/** T78: the T75 store fixture the design's new keys moved; no cabinet moved. */
export const REPINNED = [
  { file: 'fixtures/t75-island.json', why: 'T78 F12 / F13 / F19: the saved design carries fronts.glassKind, fronts.hingeFamily and joints.system (null: nobody said), re-pinned through scripts/t75-fixtures.mjs after the full suite (7e92b89); no cabinet moved' },
];
