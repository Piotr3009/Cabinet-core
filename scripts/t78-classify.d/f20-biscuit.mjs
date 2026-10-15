// T78 F20 (the BISCUIT part) · THE THIRD JOINT SYSTEM: THE OWNER'S OWN SET ON
// THE CARCASS. CLAUDE.md T78 PART E, the owner (11.10.2026): *"zostaw jak
// bylo, ciastka byly ustawione ok, nie grzeb w tym, polka stala to samo"*,
// *"bez ciastek na plecach."*  SKYLON_JOINTS_BISCUIT.lsp was written and
// paren-balanced first; `src/engine/biscuitJoints.js` mirrors it routine for
// routine and calls `engine/biscuits.js` for the set (one copy of the
// arithmetic). `profile.biscuits` does not move (FROZEN 5).

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

export const GATES = {
  biscuit: {
    what: 'a unit whose joint system is biscuit (`params.joints_system` \'biscuit\'; F20: the Joints row writes it, '
      + 'no default carries it, the default profile says \'puzzle\')',
    opens: (p) => p.joints_system === 'biscuit',
  },
};

export const LICENSED = {
  'src/engine/biscuitJoints.js': {
    why: 'F20 · NEW: SKYLON_JOINTS_BISCUIT.lsp mirrored routine for routine (sections A to E, the set through '
      + 'engine/biscuits.js), and the engine half (Z): the verdict asked of the parent\'s puzzle cut, the strip of the '
      + 'side to TOP and side to BOTTOM joints only, the screws as drills, the marks in the fixed shelf\'s record shape, '
      + 'the summary with no gate. Every cut line is behind the joint system',
    gates: ['biscuit'],
  },
  'src/engine/cabinet.js': {
    why: 'F20 · the biscuit branch before the dowel verdict (`biscuitVerdict`, refused: the parent and JOINTS_REFUSED), '
      + '`biscuitStrip` beside `dowelStrip`, `biscuitDrills` beside `dowelDrills`, the marks pushed into '
      + '`shelfJointMarks` before its one writer, `derived.joints` from `biscuitSummary`. The fixed shelf\'s block is untouched',
    gates: ['biscuit'],
  },
  'src/engine/dowels.js': {
    why: 'F20 · `JOINT_SYSTEMS` gains \'biscuit\' so `jointSystemOf` returns it. A list of names, not a cut',
    gates: [],
  },
};

export const LIVENESS = {
  // Amended 15.10.2026: the owner's "no dog bones" took the back joint too; the BACK is screwed (engine/screwedBack.js).
  biscuit: () => {
    const r = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01', joints_system: 'biscuit' }, P);
    const bul = r.panels.find((p) => p.id === 'BUL');
    const top = r.panels.find((p) => p.id === 'TOP');
    const screws = r.drills.filter((d) => d.kind === 'biscuit_screw').length;
    const marks = r.panels.reduce((n, p) => n + (p.cnc?.marks || []).length, 0);
    const puzzle = r.drills.filter((d) => d.kind === 'puzzle').length
      + r.panels.reduce((n, p) => n + (p.cnc?.pockets || []).filter((k) => /^PUZZLE/.test(k.layer)).length, 0);
    const backScrews = r.drills.filter((d) => d.panel === 'BACK' && d.kind === 'screw').length;
    return {
      live: r.derived?.joints?.system === 'biscuit' && screws === 16 && marks === 8
        && bul?.cnc?.outline?.length === 4 && top?.cnc?.outline?.length === 4
        && puzzle === 0 && backScrews === 14
        && !r.warnings.some((w) => w.code === 'JOINTS_REFUSED' || w.code === 'DOWEL_GATE'),
      said: `BUD with biscuits cuts ${screws} through screws and ${marks} marks on the sides, BUL outline `
        + `${bul?.cnc?.outline?.length} points, TOP outline ${top?.cnc?.outline?.length} points, ${puzzle} puzzle cuts anywhere, `
        + `the BACK screwed with its ${backScrews} dia 3 (bez ciastek na plecach, no dog bones)`,
    };
  },
};

export const GOLDENS = [
  {
    file: 'golden-biscuit-bud.json',
    F: 'F20',
    source: 'SKYLON_JOINTS_BISCUIT.lsp (the owner\'s set on the sides, its NUMBERS block, section H, the no-shelf case) '
      + 'on KIT_BUD_FULL.lsp (the parent); the BACK screwed, no puzzle anywhere (re-pinned 15.10.2026: no dog bones)',
    params: () => ({ ...defaultParamsFor('BUD', P), unit_num: '01', joints_system: 'biscuit' }),
  },
];
