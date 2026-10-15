// T78 F6 · the wall L follows the base L and splits above 700.
import { lArmKinds, lLeafTrimMm } from '../../src/engine/corners.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

export const LICENSED = {
  'src/engine/corners.js': {
    why: 'T78 F6: `lArmKinds` and `lLeafTrimMm` restate the L builder\'s own door trim so the store can hold a wall leaf '
      + 'at 700 by the same arithmetic; read by the store, never by a cut',
    gates: ['cornerL'],
  },
};

export const GATES = {
  wallLFollows: {
    what: 'a CORNER_L_WALL standing in a corner that holds a CORNER_L_BASE (the store\'s refreshAutoParts law); no cut',
    opens: (params, typeId) => typeId === 'CORNER_L_WALL',
  },
};

export const LIVENESS = {
  wallLFollows: () => {
    const kinds = lArmKinds(P);
    const a = lLeafTrimMm(kinds.A, P, 25);
    const b = lLeafTrimMm(kinds.B, P, 25);
    // 15.10.2026 (f26): the overlapping leaf's end clears the covered leaf's
    // face by clearance.corner, so its trim carries the gap too: 3 + 25 + 3 + 1.5.
    const bifold = lArmKinds(P, 'bifold');
    return {
      live: kinds.B === 'overlap' && kinds.A === 'covered' && a === 1.5 && b === 3 + 25 + 3 + 1.5
        && bifold.B === 'bifold' && lLeafTrimMm('bifold', P, 25) === 3 + 25 + 4.5,
      said: `arm A ${kinds.A} trims the leaf by ${a}, arm B ${kinds.B} by ${b} (gap 3, clearance.corner 3, front 25; the bi-fold B by ${lLeafTrimMm('bifold', P, 25)})`,
    };
  },
};
