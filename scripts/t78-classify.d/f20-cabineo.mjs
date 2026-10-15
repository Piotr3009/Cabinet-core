// T78 F20 (the CABINEO part) · THE FOURTH JOINT SYSTEM: LAMELLO CABINEO 8 / 12.
// CLAUDE.md T78 PART E, the owner (11.10.2026): Cabineo 8 AND 12, chosen in
// the company's default settings; THE INVERTED SIDE: the pocket in the FACE of
// the horizontal board at its end, cut from the OUTSIDE face of the carcass
// ("ciecie nie od srodka korpusu tylko do zewnatrz"), the dia 5 hole in the
// side's inside face; the export reflected through T76's one reflection and
// labelled OUTSIDE FACE UP; the skin check; the `confirmed: false` gate.
// SKYLON_JOINTS_CABINEO.lsp was written and paren-balanced first;
// `src/engine/cabineo.js` mirrors it routine for routine and reads every
// Lamello number off reference/hardware/cabineo/cabineo.json (owner to confirm).

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

export const GATES = {
  cabineo: {
    what: 'a unit whose joint system is Cabineo (`params.joints_system` \'cabineo8\' | \'cabineo12\', or the company '
      + 'default `joints.system`; F20: the Joints row writes it, no default carries it, the default profile says \'puzzle\')',
    opens: (p) => p.joints_system === 'cabineo8' || p.joints_system === 'cabineo12',
  },
};

export const LICENSED = {
  'src/engine/cabineo.js': {
    why: 'F20 · NEW: SKYLON_JOINTS_CABINEO.lsp mirrored routine for routine (sections A to F: the sheet, the set-out, the '
      + 'inverted side and the one reflection, the pockets, the recess, the side holes, the gate, the refusals, the BOM), and '
      + 'the engine half (Z): the verdict asked of the parent\'s puzzle cut with the skin check, the strip, the pockets onto the '
      + 'horizontal boards with machinedFace outside, the holes as drills, the order lines, the summary, the export refusal, '
      + 'the note row, the operations manifest. Every cut line is behind the joint system',
    gates: ['cabineo'],
  },
  'src/engine/cabinet.js': {
    why: 'F20 · the Cabineo branch before the dowel verdict (`cabineoVerdict`, refused: the parent and JOINTS_REFUSED), '
      + '`cabineoStrip` and `cabineoPocketsOnto` beside `dowelStrip`, `cabineoDrills` beside `dowelDrills`, the FIX shelf the '
      + 'plan owns gives up its biscuit set and side screws (`cabineoShelf`), the connector and cap order lines, '
      + '`derived.joints` from `cabineoSummary` and CABINEO_GATE',
    gates: ['cabineo'],
  },
  'src/engine/dowels.js': {
    why: 'F20 · `JOINT_SYSTEMS` gains \'biscuit\', \'cabineo8\' and \'cabineo12\' so `jointSystemOf` returns them; the bare '
      + '\'cabineo\' stays reserved and refused. A list of names, not a cut',
    gates: [],
  },
  'src/engine/profile.js': {
    why: 'F20 · `joints.cabineo` (mounting flushCap, machining cutter12, pitch 250, end offset 50, min 2, caps all, the gate '
      + '`confirmed: false`, the five layer names) and its migrate line key by key, every choice T78 proposed; no Lamello number. '
      + 'The six cut the puzzle by it',
    gates: ['cabineo'],
  },
  'src/engine/cnc/layers.js': {
    why: 'F20 · the five layer names CABINEO_POCKET_15MM / _10MM / _12MM, CABINEO_RECESS, CABINEO_HOLE_5MM (ACI 47 to 51). '
      + 'A table of names, not a cut',
    gates: [],
  },
  'src/engine/machining.js': {
    why: 'F20 · the policy rows of the five Cabineo layers (the pockets and the recess bored blind to the record\'s depth; the '
      + 'dia 5 hole not bored, with its sentence: no depth on the sheet). What the scene draws, not a cut',
    gates: [],
  },
  'src/engine/checks.js': {
    why: 'F20 · Check #31 reads CABINEO_GATE beside DOWEL_GATE. Reads a result; cuts nothing',
    gates: [],
  },
  'src/engine/bom.js': {
    why: 'F20 · `buildBom` appends a Cabineo unit\'s NOTE row (OUTSIDE FACE UP, the gate) to its cut list rows. A note, not a cut',
    gates: [],
  },
  'src/engine/partRegistry.js': {
    why: 'F20 · two consumable rows (cabineo_connector, cabineo_cap) and their role map entries, so the order lines are '
      + 'assignable. A registry, not a cut',
    gates: [],
  },
  'src/engine/cnc/partLabel.js': {
    why: 'F20 · `faceTag`: a board with meta.machinedFace outside prints OUTSIDE FACE UP in its label (the LISP\'s '
      + 'cabineo-face-label); every other label is unchanged. Only a Cabineo unit carries the meta',
    gates: ['cabineo'],
  },
  'src/engine/cnc/frontOperations.js': {
    why: 'F20 · T76\'s one reflection extracted as `mirrorAboutVerticalAxis` and used in place (the FRONT files and the '
      + 'strips\' assembly points), so cabineo.js and dxf.js read the same helper. A refactor; every FRONT file is byte-identical',
    gates: [],
  },
  'src/engine/recesses.js': {
    why: 'F20 · a pocket or hole record\'s `face` rides the recess record for the scene. Carried, not decided; absent on every '
      + 'puzzle unit',
    gates: [],
  },
  'src/engine/cnc/dxf.js': {
    why: 'F20 · a panel with meta.machinedFace outside is written reflected through `mirrorAboutVerticalAxis` (the whole part, '
      + 'in its own frame, before it is laid down; its slot found from the reflected geometry), a blind inside-face hole held '
      + 'out of that file and named; the file record says setup outside. Only a Cabineo unit carries the meta',
    gates: ['cabineo'],
  },
  'src/lib/cncExport.js': {
    why: 'F20 · THE GATE: each of the three exports throws "the Cabineo pattern is proposed, not confirmed by the owner" before '
      + '`exportGate` when it would machine a Cabineo cut; the unit ZIP carries cabineo-operations.json for the OUTSIDE FACE UP '
      + 'boards. A refusal and a manifest, not a cut',
    gates: [],
  },
};

export const LIVENESS = {
  // Amended 15.10.2026 with the owner's own machining (the LISP's head, H.0): three dia 15 holes per pocket, the 0.5
  // skim, the dia 5 hole X deep; the back joint gone and the BACK on Cabineo too (D.2b: 14 more pockets, the sides'
  // from the inside face, 14 dia 5 holes in the BACK); no puzzle anywhere, no screw row; the gate open.
  cabineo: () => {
    const r = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01', joints_system: 'cabineo12' }, P);
    const top = r.panels.find((p) => p.id === 'TOP');
    const bul = r.panels.find((p) => p.id === 'BUL');
    const skims = r.panels.reduce((n, p) => n + (p.cnc?.pockets || []).filter((k) => k.kind === 'cabineo_recess').length, 0);
    const d15out = r.drills.filter((d) => d.kind === 'cabineo_pocket' && d.d === 15 && d.face === 'outside').length;
    const d15in = r.drills.filter((d) => d.kind === 'cabineo_pocket' && d.d === 15 && d.face === 'inside').length;
    const holes = r.drills.filter((d) => d.kind === 'cabineo_hole' && d.depth === 12).length;
    const backHoles = r.drills.filter((d) => d.kind === 'cabineo_hole' && d.panel === 'BACK').length;
    const puzzle = r.drills.filter((d) => d.kind === 'puzzle' || d.kind === 'screw').length
      + r.panels.reduce((n, p) => n + (p.cnc?.pockets || []).filter((k) => /^PUZZLE/.test(k.layer)).length, 0);
    const gateOpen = !r.warnings.some((w) => w.code === 'CABINEO_GATE');
    return {
      live: r.derived?.joints?.system === 'cabineo12' && r.derived?.joints?.pockets === 26 && skims === 26 && d15out === 54 && d15in === 24
        && holes === 26 && backHoles === 14
        && top?.meta?.machinedFace === 'outside' && bul?.meta?.machinedFace === undefined
        && top?.cnc?.outline?.length === 4 && bul?.cnc?.outline?.length === 4 && puzzle === 0 && gateOpen,
      said: `BUD with Cabineo 12 cuts ${d15out} dia 15 holes from the outside face of the TOP and BOTTOM (machinedFace ${top?.meta?.machinedFace}) `
        + `and ${d15in} from the sides' inside faces, ${skims} skims, ${holes} dia 5 holes 12 deep (${backHoles} in the BACK), `
        + `TOP outline ${top?.cnc?.outline?.length} points, BUL outline ${bul?.cnc?.outline?.length}, ${puzzle} puzzle or screw-row cuts anywhere, gate ${gateOpen ? 'open' : 'shut'}`,
    };
  },
};

export const GOLDENS = [
  {
    file: 'golden-cabineo8-bud.json',
    F: 'F20',
    source: 'SKYLON_JOINTS_CABINEO.lsp (Cabineo 8, the owner\'s three layers of 15.10.2026: drill15, the 0.5 skim, the dia 5 hole '
      + 'X deep; its NUMBERS block H.0, the no-shelf case: every coordinate the Cabineo 12 golden\'s, the variant decides the label '
      + 'and X only) on KIT_BUD_FULL.lsp (the parent); the BACK on Cabineo too (D.2b), no puzzle anywhere, the gate open (re-pinned 15.10.2026, twice)',
    params: () => ({ ...defaultParamsFor('BUD', P), unit_num: '01', joints_system: 'cabineo8' }),
  },
  {
    file: 'golden-cabineo12-bud.json',
    F: 'F20',
    source: 'SKYLON_JOINTS_CABINEO.lsp (Cabineo 12, the owner\'s three layers of 15.10.2026: drill15, the 0.5 skim, the dia 5 hole '
      + 'X deep; its NUMBERS block H.0, the no-shelf case) on KIT_BUD_FULL.lsp (the parent); the TOP and BOTTOM OUTSIDE FACE UP, '
      + 'reflected x\' = 540 - x; the BACK on Cabineo too (D.2b), no puzzle anywhere, the gate open (re-pinned 15.10.2026, twice)',
    params: () => ({ ...defaultParamsFor('BUD', P), unit_num: '01', joints_system: 'cabineo12' }),
  },
];
