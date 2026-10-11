// T78 F1 · nothing could be added left of an L: the plus, the placement and
// the Wall select learn the L stands on two walls.
import { getUnitType } from '../../src/engine/types.js';
import { addPlusPoints, cornerLAdjacentSpan } from '../../src/engine/runs.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';
import { migrateRoom, rectCorners, roomWalls } from '../../src/engine/room.js';

export const GATES = {
  cornerL: {
    what: 'an L corner kit (`type.corner`: CORNER_L_BASE / WALL / WARDROBE); the six and T75\'s goldens other than the three L goldens never are one',
    opens: (params, typeId) => Boolean(getUnitType(typeId || params?.type)?.corner),
  },
};

export const LICENSED = {
  'src/engine/runs.js': {
    why: 'T78 F1: `addPlusPoints` offers the L\'s second plus on the adjacent wall and keeps a run on that wall from offering one '
      + 'inside the L (`cornerLAdjacentSpan`, the one arithmetic the plus, the placement and the Wall select read). Read by the '
      + 'scene and the store, never by a cut: `computeCabinet` imports runs.js for `impliedLegHeight` and `maskDepthExtra` only',
    gates: ['cornerL'],
  },
};

export const LIVENESS = {
  cornerL: () => {
    const walls = roomWalls(migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) }));
    const l = {
      id: 'l', type: 'CORNER_L_BASE', position: { wall: 0, x_mm: 10, rotation_deg: 0 },
      params: { width: 900, depth: 900, height: 770, unit_num: 'CL01', corner_side: 'left' },
    };
    const adj = cornerLAdjacentSpan(l, walls, P);
    const points = addPlusPoints([l], { walls }, P);
    const onB = points.find((p) => p.wall === 3 && p.unitId === 'l');
    return {
      live: Boolean(adj && adj.wall === 3 && onB && onB.x_mm === 3000 - 10 - 900),
      said: `a left-hand L on wall 0: arm B on wall ${adj?.wall} ends ${adj?.x_mm}; plus points ${JSON.stringify(points.map((p) => [p.wall, p.side, p.x_mm]))}`,
    };
  },
};
