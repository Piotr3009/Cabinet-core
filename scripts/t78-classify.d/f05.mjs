// T78 F5 · the L grows left and right on its own: arm A (width) and arm B
// (depth) are two figures and two fields, each clamped alone.
import { lArmMinMm } from '../../src/engine/corners.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

export const LICENSED = {
  'src/engine/corners.js': {
    why: 'T78 F5: `lArmMinMm` (the least an arm can be: its depth plus `profile.corner.leafMinMm`) and the two numbers in '
      + '`cornerSpec`; read by the store\'s clamp and the Check, never by a cut',
    gates: ['cornerL'],
  },
  'src/engine/profile.js': {
    why: 'T78 F5 / F6: `corner.leafMinMm` (200, T78 proposed) and `corner.wallLeafMaxMm` (700, the owner\'s) beside the '
      + 'post; no cut reads either (the store clamps and sizes with them)',
    gates: ['cornerL'],
  },
};

export const GATES = {
  lArms: {
    what: 'an L corner kit whose width or depth is being typed (the store\'s clamp); a cut reads W and D as before',
    opens: (params, typeId) => Boolean(typeId && String(typeId).startsWith('CORNER_L')),
  },
};

export const LIVENESS = {
  lArms: () => {
    const least = lArmMinMm({ type: 'CORNER_L_BASE', params: {} }, P);
    return {
      live: least === P.baseUnit.defaults.depth + 200 && P.corner.wallLeafMaxMm === 700,
      said: `a base L arm is at least ${least} mm (arm ${P.baseUnit.defaults.depth} + leaf ${P.corner.leafMinMm}); the wall leaf max is ${P.corner.wallLeafMaxMm}`,
    };
  },
};
