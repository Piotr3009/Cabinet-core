// T75 F23 · THE SECOND JOINT SYSTEM, DOWELS FIRST, CABINEO'S SLOT.
// CLAUDE.md T75 PART G, the owner: *"lisp najpierw."*  SKYLON_JOINTS_DOWEL.lsp
// was written and paren-balanced first (ceb5fde); `src/engine/dowels.js`
// mirrors it routine for routine.

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

export const GATES = {
  dowel: {
    what: 'a unit whose joint system is not the puzzle (`params.joints_system` \'dowel\', or \'cabineo\' which '
      + 'is refused; F23: the Joints row writes it, no default carries it, the default profile says \'puzzle\')',
    opens: (p) => p.joints_system === 'dowel' || p.joints_system === 'cabineo',
  },
};

export const LICENSED = {
  'src/engine/dowels.js': {
    why: 'F23 · NEW: SKYLON_JOINTS_DOWEL.lsp mirrored routine for routine (sections A to F), and the engine '
      + 'half (Z): the verdict asked of the parent\'s puzzle cut, the strip, the pairs as drills, the summary, '
      + 'the export refusal and the cut list\'s note. Every cut line is behind the joint system',
    gates: ['dowel'],
  },
  'src/engine/cabinet.js': {
    why: 'F23 · the joint system asked of the parent first (`dowelVerdict`, refused: the parent and '
      + 'JOINTS_REFUSED), `dowelStrip` before the drilling pass, `dowelDrills` after the copy loop, the FIX '
      + 'shelf the plan owns gives up its biscuit set and side screws, `derived.joints` and DOWEL_GATE',
    gates: ['dowel'],
  },
  'src/engine/profile.js': {
    why: 'F23 · `joints` (system \'puzzle\', the dowel numbers, the gate `confirmed: false`, the two layer '
      + 'names) and its migrate line key by key, every number T75 proposed. The six cut the puzzle by it',
    gates: ['dowel'],
  },
  'src/engine/checks.js': {
    why: 'F23 · Check #31, red: the engine\'s DOWEL_GATE and JOINTS_REFUSED in their own words. Reads a '
      + 'result; cuts nothing',
    gates: [],
  },
  'src/engine/bom.js': {
    why: 'F23 · `buildCabinetPartQtys` counts the `dowel` registry row off the dowel face holes (one per pair), '
      + 'and `buildBom` appends a dowel unit\'s NOTE row to its cut list rows. A purchase list, not a cut',
    gates: [],
  },
  'src/engine/machining.js': {
    why: 'F23 · the policy rows of DOWEL_8MM (bored, blind) and DOWEL_EDGE_8MM (not bored through the face, '
      + 'with its sentence). What the scene draws, not a cut',
    gates: [],
  },
  'src/engine/cnc/layers.js': {
    why: 'F23 · the two layer names DOWEL_8MM (ACI 45) and DOWEL_EDGE_8MM (ACI 46). A table of names, not a cut',
    gates: [],
  },
  'src/engine/cnc/dxf.js': {
    why: 'F23 · the machine file never carries a dowel\'s EDGE bore (`face: \'edge\'`): a 3-axis bed cannot '
      + 'make it. Only a dowel unit carries one',
    gates: ['dowel'],
  },
  'src/lib/cncExport.js': {
    why: 'F23 · THE GATE: each of the three exports throws "the dowel pattern is proposed, not confirmed by '
      + 'the owner" before `exportGate` when it would machine a dowel hole. A refusal, not a cut',
    gates: [],
  },
};

export const LIVENESS = {
  // T78 F19 (11.10.2026): the owner's numbers (*"minimum 2 a kołki co mniej więcej co 250 mm"*, 6 mm) replace
  // T75's proposals in SKYLON_JOINTS_DOWEL.lsp section A, and its NUMBERS block (section H) now counts 26 dowels
  // on the BUD 600 where T75's rule at pitch 32 counted 44. The probe moves with the LISP, knowingly.
  dowel: () => {
    const r = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01', joints_system: 'dowel' }, P);
    const bul = r.panels.find((p) => p.id === 'BUL');
    const dowels = r.drills.filter((d) => d.kind === 'dowel' && d.face !== 'edge').length;
    const edges = r.drills.filter((d) => d.kind === 'dowel' && d.face === 'edge').length;
    return {
      live: dowels === 26 && edges === 26 && bul?.cnc?.outline?.length === 4
        && !r.drills.some((d) => d.kind === 'puzzle') && r.warnings.some((w) => w.code === 'DOWEL_GATE'),
      said: `BUD with dowels cuts ${dowels} face holes and ${edges} edge bores, BUL outline ${bul?.cnc?.outline?.length} points, `
        + `${r.drills.filter((d) => d.kind === 'puzzle').length} puzzle holes`,
    };
  },
};

export const GOLDENS = [
  {
    file: 'golden-dowel-bud.json',
    F: 'F23',
    source: 'SKYLON_JOINTS_DOWEL.lsp (the dowel pairs, its NUMBERS block, section H) on KIT_BUD_FULL.lsp (the parent)',
    params: () => ({ ...defaultParamsFor('BUD', P), unit_num: '01', joints_system: 'dowel' }),
  },
];
