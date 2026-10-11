// T78 F2 · the L worktop and the L mask are L-shaped.
import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';
import { worktopsFor } from '../../src/engine/worktop.js';
import { migrateRoom, rectCorners, roomWalls } from '../../src/engine/room.js';

export const GATES = {
  lMask: {
    what: 'a bottom mask asked on an L wall unit (`params.bottom_mask` on a `type.corner` kit): the L mask board',
    opens: (params, typeId) => Boolean(params?.bottom_mask === true && typeId && String(typeId).startsWith('CORNER_L')),
  },
};

export const LICENSED = {
  'src/engine/worktop.js': {
    why: 'T78 F2: the lone L slab runs to both walls and its arm B end butts a neighbour (`lSlabGeometry`); a record over the L and '
      + 'the cabinets along its arms is the L slab plus one straight slab per wall butting it at the arm end with the T75 F5 joint '
      + 'record (`lRunSlabs`). The design layer\'s, not a cut: `computeCabinet` never imports worktop.js',
    gates: ['cornerL'],
  },
  'src/engine/runs.js': {
    why: 'T78 F2: `maskSegments` closes a run\'s mask segment on both sides of an L and stands the L in one of its own. Read by '
      + 'the store (`runMaskParams` writes `params.run_mask`); a cut sees only that param, and only an L wall unit with a mask asks',
    gates: ['lMask'],
  },
  'src/engine/cabinet.js': {
    why: 'T78 F2: the bottom mask under an L (`lCorner` and `bottom_mask`) is ONE L board, MASK-L, the mask depth law on both '
      + 'arms, its outline in the cut list and its true area; every other mask keeps the rectangle (`!lCorner`)',
    gates: ['lMask'],
  },
  'src/engine/bom.js': {
    why: 'T78 F2: one worktop JOINT note per joint (the L\'s two arms are two), keyed where the joint is; T75\'s corner pair still '
      + 'collapses to one. A list, not a cut, and only with a design and a room',
    gates: ['cornerL'],
  },
  'src/engine/checks.js': {
    why: 'T78 F2: the readiness line of a worktop joint, one per joint, keyed where it is. A Check, not a cut',
    gates: ['cornerL'],
  },
};

export const LIVENESS = {
  lMask: () => {
    const r = computeCabinet({ ...defaultParamsFor('CORNER_L_WALL', P), unit_num: '01', doors: true, bottom_mask: true }, P);
    const m = r.panels.find((p) => p.part === 'MASK');
    const plain = computeCabinet({ ...defaultParamsFor('WUD', P), unit_num: '01', doors: true, bottom_mask: true }, P)
      .panels.find((p) => p.part === 'MASK');
    const walls = roomWalls(migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) }));
    const l = {
      id: 'l', type: 'CORNER_L_BASE', position: { wall: 0, x_mm: 10, rotation_deg: 0 },
      params: { ...defaultParamsFor('CORNER_L_BASE', P), unit_num: 'CL01', corner_side: 'left' },
    };
    const [slab] = worktopsFor({ records: [{ id: 'w', unitIds: ['l'], kind: 'L' }], units: [l], profile: P, walls });
    return {
      live: m?.id === 'MASK-L' && m.cnc.outline.length === 6 && plain?.id === 'MASK' && plain.cnc.outline.length === 4
        && slab?.geometry?.shape === 'L' && slab.geometry.outline.length === 6 && slab.geometry.x === 0,
      said: `CORNER_L_WALL with a mask cuts ${m?.id} (${m?.cnc?.outline?.length} vertices, ${m?.area_m2} m2); a WUD cuts ${plain?.id} `
        + `(${plain?.cnc?.outline?.length}); the lone L slab is ${slab?.geometry?.shape} with ${slab?.geometry?.outline?.length} vertices from x ${slab?.geometry?.x}`,
    };
  },
};
