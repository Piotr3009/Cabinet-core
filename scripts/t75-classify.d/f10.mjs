// T75 F10 · UNITS ON THE FACES, THE ENDS, THE PANELS. CLAUDE.md T75 F10.

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

export const GATES = {
  islandPanel: {
    what: 'an island automat panel (`params.island_panel` back or end on a FREE_PANEL, F10)',
    opens: (p) => p.island_panel === 'back' || p.island_panel === 'end',
  },
  plinthMitre: {
    what: 'a run plinth mitred round an island\'s external corner (`params.run_plinth.mitres`, F10)',
    opens: (p) => Boolean(p.run_plinth?.mitres),
  },
};

export const LICENSED = {
  'src/engine/cabinet.js': {
    why: 'F10 · a FREE_PANEL with `island_panel` is cut as the island\'s BACK-PANEL (role back_panel) or '
      + 'ISLAND-END (role end_panel), front material at the front\'s thickness; `back_panel` joins the front '
      + 'and finish roles; the run plinth carries `meta.mitres`. Behind the two gates below',
    gates: ['islandPanel', 'plinthMitre'],
  },
  'src/engine/runs.js': {
    why: 'F10 · `runEnd` does not ask rule 1 (the wall) at an island face\'s end (`island`); '
      + '`runPlinthParams` mitres two face kicks round an external corner both runs reach',
    gates: ['plinthMitre'],
  },
  'src/engine/cornice.js': {
    why: 'F10 · `segmentCornice` / `runCorniceParams` hand `runEnd` the island flag. The six carry no cornice',
    gates: [],
  },
  'src/engine/corners.js': {
    why: 'F10 · an external corner carries face A\'s length (`widthA`) for the plinth pass',
    gates: [],
  },
  'src/engine/island.js': {
    why: 'F10 · `islandPanelPlan` (an empty long face wants a back panel, an empty end face an end panel '
      + 'across the whole island depth) and `isIslandAutoPanel`',
    gates: [],
  },
  'src/engine/room.js': {
    why: 'F10 · `roomChangeGuard` lets the automat\'s own panels through (they are re-made after any change)',
    gates: [],
  },
  'src/engine/partRegistry.js': {
    why: 'F10 · the `back_panel` part (front), BACK-PANEL and ISLAND-END-PANEL mapped, the back panel\'s edging',
    gates: ['islandPanel'],
  },
  'src/engine/elements.js': {
    why: 'F10 · an island panel is clicked as the free panel it is',
    gates: [],
  },
};

export const LIVENESS = {
  islandPanel: () => {
    const r = computeCabinet({
      ...defaultParamsFor('FREE_PANEL', P), unit_num: 'FP01', island_panel: 'back', width: 1800, height: 870, depth: 25, panel_width: 870,
    }, P);
    const b = r.panels.find((p) => p.role === 'back_panel');
    return { live: Boolean(b) && b.material_role === 'front', said: `FREE_PANEL with island_panel back cuts ${b ? `${b.id} ${b.w} x ${b.h} x ${b.thickness}` : 'nothing'}` };
  },
  plinthMitre: () => {
    const run = {
      role: 'owner', offset: 0, length: 1118, unitIds: ['u'], spans: [], mitres: [{ side: 'right', mm: 518, deg: 45, external: true }],
    };
    const r = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01', plinth: true, run_plinth: run }, P);
    const k = r.panels.find((p) => p.id === 'PLINTH');
    return { live: k?.meta?.mitres?.[0]?.deg === 45, said: `BUD plinth carries ${JSON.stringify(k?.meta?.mitres || null)}` };
  },
};
