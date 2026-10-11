// T78 F7 · drawers in the L: Blum SPACE CORNER (two boxes a row, one L front).
import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

export const GATES = {
  lDrawers: {
    what: 'a drawer stack asked on an L (`params.drawers` or drawer items on a `type.corner` kit whose `supports.drawers` is on): '
      + 'the arms\' virtual parents become the drawer unit of that split and the L joins their boxes and fronts',
    opens: (params, typeId) => Boolean(typeId && String(typeId).startsWith('CORNER_L')
      && (Number(params?.drawers) > 0 || (params?.sections?.[0]?.items || []).some((i) => i?.kind === 'drawer'))),
  },
};

export const LICENSED = {
  'src/engine/cabinet.js': {
    why: 'T78 F7: `cornerL.drawers` (rows two to four, one or more than four refused in words), the arm\'s parent is BUDR2 / BUDR / '
      + 'BUDR4 with the row fronts trimmed at the inner corner (A gap/2, B gap/2 + front_t: one L front a row, the pair law retired), '
      + 'the boxes and fronts placed by the one `placeBox` rule the doors use, box ids take the arm\'s letter, every part of a row '
      + 'carries `meta.slide` and `meta.travel_mm`, one SPACE CORNER line and body per row, zero holes. Nothing of it runs without '
      + 'a stack asked; the doors\' `placeBox` is the same arithmetic moved into one helper',
    gates: ['lDrawers'],
  },
  'src/engine/types.js': {
    why: 'T78 F7: `supports.drawers: true` on CORNER_L_BASE, read only where a drawer is asked',
    gates: ['lDrawers'],
  },
  'src/engine/profile.js': {
    why: 'T78 F7: `corner.spaceCorner` (label, rowsMin 2, rowsMax 4, bracketMm 60), read only on an L with a stack',
    gates: ['lDrawers'],
  },
  'src/engine/corners.js': {
    why: 'T78 F7: `lClearanceView` hands the clearance family every front board of an arm, not the first one found; a view, not a cut',
    gates: ['lDrawers'],
  },
  'src/engine/drawerMotion.js': {
    why: 'T78 F7: `drawerTravel` prefers `meta.travel_mm` where a part states it (a box turned onto the adjacent wall); a scene value',
    gates: ['lDrawers'],
  },
  'src/engine/partRegistry.js': {
    why: 'T78 F7: the `kit_space_corner` row and the `space_corner` role; a list',
    gates: ['lDrawers'],
  },
};

export const LIVENESS = {
  lDrawers: () => {
    const r = computeCabinet({ ...defaultParamsFor('CORNER_L_BASE', P), unit_num: 'CL01', drawers: 3 }, P);
    const fronts = r.panels.filter((p) => p.part === 'DRAWER-FRONT');
    const boxes = r.panels.filter((p) => p.role === 'drawer_box');
    const kits = r.hardware.filter((h) => h.role === 'space_corner');
    const doors = r.panels.filter((p) => p.part === 'FRONT').length;
    return {
      live: fronts.length === 6 && boxes.length === 30 && kits.length === 3 && doors === 0
        && fronts.every((f) => f.meta.slide && f.meta.travel_mm > 0),
      said: `CORNER_L_BASE with drawers 3 cuts ${fronts.length} front boards and ${boxes.length} box boards, ${kits.length} SPACE CORNER lines, ${doors} doors`,
    };
  },
};

export const GOLDENS = [
  {
    file: 'golden-corner-l-drawers.json',
    F: 'F7',
    source: 'KIT_CORNER_L_DRAWERS.lsp: two boxes a row from the drawer unit of the split (per arm depth), one L front a row '
      + '(A to the inner back corner, B on A\'s face), the SPACE CORNER kit a line and a body, zero holes',
    params: () => ({ ...defaultParamsFor('CORNER_L_BASE', P), unit_num: '01', drawers: 3 }),
  },
];
