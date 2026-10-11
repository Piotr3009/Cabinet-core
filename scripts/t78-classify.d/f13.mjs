// T78 F13 · wide-angle hinges (155 / 170): a family the door chooses, the angle derived.
import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

export const GATES = {
  wideHinges: {
    what: '`hinge_family: \'wide\'` or `door_hinge_family[id] === \'wide\'` (or an L in bifold, whose leaf A takes the wide family): '
      + 'the leaf carries `meta.openAngleDeg`, the BOM hinge line takes the family\'s article; the standard family is byte for byte today\'s',
    opens: (params) => params?.hinge_family === 'wide'
      || Object.values(params?.door_hinge_family || {}).includes('wide') || params?.corner_doors === 'bifold',
  },
};

export const LICENSED = {
  'src/engine/hinges.js': {
    why: 'T78 F13: `hingeAngleFor(..., family)` answers the wide family from reference/hardware/blum-hinges.json\'s rule, '
      + '`resolveDoorHinge(..., family)` the article; the standard path returns what it did plus `hingeFamily`',
    gates: ['wideHinges'],
  },
  'src/engine/cabinet.js': {
    why: 'T78 F13: `meta.hingeFamily` on every hinged leaf (a word), `meta.openAngleDeg` and HINGE_WIDE_NO_RUNG for the wide '
      + 'family only, the BOM hinge group keyed by the leaf\'s family; the cup pattern did not move',
    gates: ['wideHinges'],
  },
  'src/engine/doors.js': {
    why: 'T78 F13: `doorOpenAngle` takes `fullDeg` (a wide leaf\'s angle); without it the picture angle, as before',
    gates: ['wideHinges'],
  },
  'src/engine/frontClearance.js': {
    why: 'T78 F13: the clearance rows carry `openAngleDeg` and `hingeFamily`; a view for the Check',
    gates: ['wideHinges'],
  },
  'src/engine/checks.js': {
    why: 'T78 F13: Check #33, the wide swing into a neighbour, said in words; a Check, not a cut',
    gates: ['wideHinges'],
  },
};

export const LIVENESS = {
  wideHinges: () => {
    const r = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: 'B1', doors: { count: 1 }, hinge_family: 'wide' }, P);
    const leaf = r.panels.find((p) => p.part === 'FRONT');
    return {
      live: leaf?.meta.hingeFamily === 'wide',
      said: `BUD with the wide family: the leaf is ${leaf?.meta.hingeFamily}, its angle ${leaf?.meta.openAngleDeg ?? 'null (file not loaded here, or no rung)'}`,
    };
  },
};

export const GOLDENS = [];
