// T78 F14 · the arch on small doors, and one arch across a drawer stack.
import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';
import { defaultFrontDecoration } from '../../src/engine/frontDecoration.js';

export const GATES = {
  archStack: {
    what: 'a decoration recipe asked (`params.front_decoration`) with the arched styles A / AH on a unit whose drawer fronts stand '
      + 'in one column: the arch is computed on the stack and sliced per front. A door, a flat front and every other style pass '
      + 'through the same code untouched (no `stack`)',
    opens: (params) => Boolean(params?.front_decoration) && ['A', 'AH'].includes(params?.front_type || params?.front_decoration?.style),
  },
};

export const LICENSED = {
  'src/engine/frontDecoration.js': {
    why: 'T78 F14: `buildFrontDecoration` takes `stack` ({ heightMm, offsetMm }); with it and an arched style the arch is made on '
      + 'the stack\'s inner polygon and this front receives its band (`sliceToBand`, the frame\'s own half-plane clip); without '
      + 'it the code is byte for byte what T76 cut',
    gates: ['archStack'],
  },
  'src/engine/cabinet.js': {
    why: 'T78 F14: the decoration pass groups DRAWER-FRONT panels of one column into a stack and hands each its y; the pass over '
      + 'doors is unchanged',
    gates: ['archStack'],
  },
};

export const LIVENESS = {
  archStack: () => {
    const r = computeCabinet({
      ...defaultParamsFor('BUDR', P), unit_num: 'D1', front_type: 'A', front_decoration: defaultFrontDecoration('A', P),
    }, P);
    const fronts = r.panels.filter((p) => p.part === 'DRAWER-FRONT');
    const stacked = fronts.filter((f) => f.meta.frontDecoration?.stack?.slice);
    return {
      live: stacked.length === 3 && stacked.every((f) => f.meta.frontDecoration.stack.heightMm > f.h),
      said: `BUDR with A: ${stacked.length} of ${fronts.length} fronts carry a slice of the one arch (stack ${stacked[0]?.meta.frontDecoration.stack.heightMm} high); `
        + `statuses ${fronts.map((f) => f.meta.frontDecoration?.status).join(', ')}`,
    };
  },
};

export const GOLDENS = [
  {
    file: 'golden-arch-stack.json',
    F: 'F14',
    source: 'engine/frontDecoration.js sliceToBand: the arch of the whole BUDR x3 stack (767 high, the two gaps included), each front '
      + 'its slice; the house 25 board, so the recipe\'s 18 recess reaches the box fixing screws of the two lower fronts (T76\'s skin law)',
    params: () => ({
      ...defaultParamsFor('BUDR', P), unit_num: '01', front_type: 'A', front_decoration: defaultFrontDecoration('A', P),
    }),
  },
];
