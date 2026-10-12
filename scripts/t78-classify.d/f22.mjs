// T78 F22 . the top infill is always mitred at a corner: `infillCornerMitre`
// answers the 45 at a run end of kind 'corner' (the owner, 11.10.2026: "zawsze
// z mitra, gorny infill to samo co boczny"); the frame corner and its T-joint
// tolerance are what they were.
import { infillCornerMitre, runEnd } from '../../src/engine/runs.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

export const GATES = {
  cornerEnd: {
    what: 'a top infill whose RUN ends on a corner stop (`run_top_infill.ends.left|right === \'corner\'`: the end unit carries '
      + '`corner_post_*_mm` or a blind kit\'s `corner_butt_*_mm`, T75 F6 / T78 F10). The number reaches computeCabinet only as '
      + '`run_top_infill.mitre`, the store\'s run element; a lone cabinet (the six, every golden) carries no run element',
    opens: (params) => ['left', 'right'].some((side) => params?.run_top_infill?.ends?.[side] === 'corner'),
  },
};

export const LICENSED = {
  'src/engine/runs.js': {
    why: 'T78 F22: `infillCornerMitre` returns the 45 (the strip\'s own face height, the frame corner\'s number) at a `runEnd` of '
      + 'kind corner, not only against a side infill in the face plane; the T-joint tolerance and the room-for-the-cut cases stay; '
      + '`runInfillParams` hands `sideMitre` to a side filler at an infill end only. Read by `runTopInfill` into '
      + '`run_top_infill.mitre`, a RECORD on the part (`meta.corner`, T50-F11), never a cut',
    gates: ['cornerEnd'],
  },
};

export const LIVENESS = {
  cornerEnd: () => {
    const unit = {
      id: 'b', type: 'BUDTALL', position: { wall: 1, x_mm: 636 },
      params: { ...defaultParamsFor('BUDTALL', P), corner_post_left_mm: P.corner.postMm },
    };
    const run = { wall: 1, units: [unit], left: 636, right: 636 + unit.params.width, top: unit.params.height };
    const end = runEnd(run, 'left', { wallWidth: 3000, roomHeight: 2500 }, P);
    const mitre = infillCornerMitre(end, 40, unit.params.height + 40, P.autoParts.topInfill.runGap);
    return {
      live: end.kind === 'corner' && mitre === 40,
      said: `a BUDTALL on the corner stop: runEnd kind ${end.kind} at ${end.x}; the 40 mm strip's corner mitre is ${mitre}`,
    };
  },
};

export const GOLDENS = [];
