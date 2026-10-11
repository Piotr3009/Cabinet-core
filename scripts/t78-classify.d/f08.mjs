// T78 F8 · the bi-fold corner door: leaf B hangs on leaf A's free edge.
import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

export const GATES = {
  lBifold: {
    what: '`params.corner_doors === \'bifold\'` on a `type.corner` kit with doors: leaf B hangs on leaf A, its cups the bi-fold '
      + 'hinge\'s (none while the catalogue page is unread), SIDE-B carries no plate, one bi-fold hinge line',
    opens: (params, typeId) => Boolean(typeId && String(typeId).startsWith('CORNER_L') && params?.corner_doors === 'bifold'),
  },
};

export const LICENSED = {
  'src/engine/cabinet.js': {
    why: 'T78 F8: `cornerL.doorsMode`; in bifold leaf B\'s virtual parent hinges at the inner edge (its end side is the other one, '
      + 'so no plate row reaches SIDE-B), B\'s inner trim is front_t + 1.5 gap, its cups are dropped or moved to the catalogue\'s '
      + 'distance, A carries `bifold.child` and B `bifold.parent`, the parent\'s hinge line for B is not merged, one `bifold_hinges` '
      + 'line, CORNER_L_BIFOLD said once, `hinged_sides` SIDE-A only, `derived.corner_l.doors_mode / hinged_on`. The pair (`pair`, '
      + 'the default) is byte for byte what it was: `doors_mode` and `hinged_on` are two new keys on derived, nothing in a cut',
    gates: ['lBifold'],
  },
  'src/engine/hinges.js': {
    why: 'T78 F8 / F13: `setBlumHingeFamilies`, `blumHingeFamilies`, `bifoldHingeSpec` read reference/hardware/blum-hinges.json; '
      + 'new exports, nothing of the CLIP top angle rule moved',
    gates: ['lBifold'],
  },
  'src/engine/profile.js': {
    why: 'T78 F8: `corner.bifold` (angleDeg 60, label), the fallback while the catalogue file is not loaded; read only in bifold',
    gates: ['lBifold'],
  },
  'src/engine/partRegistry.js': {
    why: 'T78 F8: the `hinge_bifold` row and the `bifold_hinges` role; a list',
    gates: ['lBifold'],
  },
};

export const LIVENESS = {
  lBifold: () => {
    const r = computeCabinet({ ...defaultParamsFor('CORNER_L_BASE', P), unit_num: 'CL01', doors: true, corner_doors: 'bifold' }, P);
    const b = r.panels.find((p) => p.id === 'CL01-B-F');
    const line = r.hardware.find((h) => h.role === 'bifold_hinges');
    const said = r.warnings.find((w) => w.code === 'CORNER_L_BIFOLD');
    return {
      live: Boolean(b?.meta?.bifold?.parent === 'CL01-A-F' && line && said && r.drillSummary.hinged_sides.length === 1
        && r.drills.filter((d) => d.panel === 'SIDE-B' && d.kind === 'hinge').length === 0),
      said: `CORNER_L_BASE in bifold: B hangs on ${b?.meta?.bifold?.parent}, ${line?.qty} bi-fold hinges, hinged sides ${r.drillSummary.hinged_sides.join(',')}, `
        + `SIDE-B hinge drills ${r.drills.filter((d) => d.panel === 'SIDE-B' && d.kind === 'hinge').length}`,
    };
  },
};

export const GOLDENS = [
  {
    file: 'golden-corner-l-bifold.json',
    F: 'F8',
    source: 'KIT_CORNER_L_BIFOLD.lsp: leaf A on SIDE-A (the covered leaf, to the corner), leaf B on leaf A\'s free edge, inner trim '
      + 'front_t + 1.5 gap, no carcass hinge on B, no plate on SIDE-B, the bi-fold hinge a line (cups wait for the catalogue page)',
    params: () => ({ ...defaultParamsFor('CORNER_L_BASE', P), unit_num: '01', doors: true, corner_doors: 'bifold' }),
  },
];
