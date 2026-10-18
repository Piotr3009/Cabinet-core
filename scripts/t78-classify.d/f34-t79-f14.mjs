/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T79 F14 (PART E) · THE DRAWER BOX IS ON CABINEO 12. The owner, 18.10.2026: *"jak mamy wybrane jakąkolwiek funkcję
// łączenia czy dog bones czy inne zawsze projektuj cabineo na szuflady, na przednich i tylnych ściankach dodawaj cabineo
// jeden do 100 mm, 2 powyżej 100 mm, minimum odległość to 25 od góry i dołu"*; 14:45: *"cabineo musi być na frontowej i
// tylnej ściance, czyli nawiercanie w bokach będzie liczone od góry boxa bo [dół] jest inny"*; 14:51: the positions from
// the top *"tak"*, Cabineo 12 *"tak"*, *"przy wysokich nie rozsuwaj"*, the bottom *"tak, bo jest wsuwane więc nie ma po
// co dodawać cabineo"*. LISP first: SKYLON_JOINTS_CABINEO.lsp D.2c (after D.2b) and its H.1 NUMBERS; engine/cabineo.js Z2
// mirrors it routine for routine and the three box builders of engine/cabinet.js name their boxes to ONE verdict. THE
// GATE is the unit naming a joint system (`params.joints_system`, any id): the store names one on every unit a person
// builds (projectStore.js paramsForEngine, amended so 'puzzle' travels named too); a bare computeCabinet() names none, so
// the six and every golden before tonight are byte for byte what they were, and no golden opens the gate but the two new.

import { computeCabinet } from '../../src/engine/cabinet.js';
import { boxCabineoAsked } from '../../src/engine/cabineo.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

const OWNER = 'the owner, 18.10.2026: "jak mamy wybrane jakąkolwiek funkcję łączenia czy dog bones czy inne zawsze projektuj '
  + 'cabineo na szuflady, na przednich i tylnych ściankach dodawaj cabineo jeden do 100 mm, 2 powyżej 100 mm, minimum '
  + 'odległość to 25 od góry i dołu"; 14:45 "cabineo musi być na frontowej i tylnej ściance, czyli nawiercanie w bokach '
  + 'będzie liczone od góry boxa bo [dół] jest inny"; 14:51 "tak" (from the top), "tak" (Cabineo 12), "przy wysokich nie '
  + 'rozsuwaj", "tak, bo jest wsuwane więc nie ma po co dodawać cabineo" (the bottom)';

const BUDR_BOX = () => ({ ...defaultParamsFor('BUDR', P), unit_num: '01', joints_system: 'puzzle' });
const WARDROBE_BOX = () => ({
  ...defaultParamsFor('WARDROBE', P),
  width: 1200,
  unit_num: '01',
  joints_system: 'cabineo12',
  items: [1, 2, 3].map(() => ({ kind: 'drawer', mount: 'internal' })),
});

export const GATES = {
  boxCabineo: {
    what: 'a unit that NAMES a joint system (`params.joints_system`, any id: puzzle, dowel, biscuit, cabineo8, cabineo12) and '
      + 'cuts a drawer box (a box bought ready, `drawer_boxes: \'ready\'`, is not machined); the store names one on every unit, '
      + 'a bare kit call names none',
    opens: (p) => boxCabineoAsked(p)
      && computeCabinet({ ...p, joints_system: undefined }, P).panels.some((x) => x.role === 'drawer_box'),
  },
};

export const LICENSED = {
  'src/engine/cabineo.js': {
    why: `T79 F14 · NEW section Z2: SKYLON_JOINTS_CABINEO.lsp D.2c mirrored routine for routine (cabineoBoxRule, cabineoBoxProfile, `
      + 'cabineoBoxPositions, cabineoBoxJoint, cabineoBoxJointTable, cabineoBoxPockets, cabineoBoxHoles, cabineoBoxRefusal, '
      + 'cabineoBoxPocketRect, cabineoBoxPilotRefusal, cabineoBoxBomLines) and the engine half (boxCabineoAsked, the gate; '
      + 'cabineoBoxVerdict, cabineoBoxRefusalWarnings, cabineoBoxPocketsOnto with machinedFace outside on BOX-FRONT and BOX-BACK, '
      + 'cabineoBoxDrills, cabineoBoxHardwareLines, cabineoBoxSummary, cabineoBoxGateWarning); cabineoSummary gains box when a '
      + 'plan is handed in; the order line\'s mounting words read through one helper (mountLabelOf, the carcass line byte-identical). '
      + `The carcass table D.2 / D.2b and CABINEO_GATE untouched. ${OWNER}`,
    gates: ['boxCabineo'],
  },
  'src/engine/cabinet.js': {
    why: 'T79 F14 · the three box builders (the wardrobe\'s full-width stack, its columns, the BUDR and its inner double row) '
      + 'name each box to ONE helper (joinBoxWithCabineo); before the drilling pass one verdict joins them '
      + '(cabineoBoxVerdict, cabineoBoxPocketsOnto, the refusals as JOINTS_REFUSED), the side holes and the drill15 holes after '
      + 'the copy loop, the box\'s connector line beside the carcass\'s, derived.boxCabineo and cabineoSummary\'s box; an L corner\'s '
      + 'derived.boxCabineo summed off its two parents (each arm a BUDR joined by the same helper). Every line behind boxCabineoAsked',
    gates: ['boxCabineo'],
  },
  'src/engine/profile.js': {
    why: 'T79 F14 · joints.cabineo.box { variant 12, onePerJointUpToMm 100, fromEdgeMm 25 }, the owner\'s three numbers (the LISP\'s '
      + 'cabineo-box-rule), and its migrate line key by key. Read only behind the gate',
    gates: ['boxCabineo'],
  },
  'src/engine/joinery.js': {
    why: 'T79 F14 · panelPlacement reads a drawer box wall\'s frame off the rectangle the engine drew (wallLies), as the drawer '
      + 'side\'s since the chat fix of 15.08.2026: the wardrobe\'s walls are drawn lying and carry pockets now. The VIEW\'s frame '
      + '(3d/panelSolid.js), never the DXF\'s; the BUDR\'s upright walls keep turn 17\'s frame',
    gates: [],
  },
  'src/stores/projectStore.js': {
    why: 'T79 F14 · paramsForEngine names the joint system on EVERY unit (`joints_system`, the T22 ladder\'s answer, the profile\'s '
      + `own 'puzzle' included), so a unit a person builds always opens boxCabineo; a bare kit call names none. ${OWNER}`,
    gates: ['boxCabineo'],
  },
};

export const LIVENESS = {
  boxCabineo: () => {
    const bare = computeCabinet({ ...defaultParamsFor('BUDR', P), unit_num: '01' }, P);
    const r = computeCabinet(BUDR_BOX(), P);
    const holes = r.drills.filter((d) => d.panel === 'D1-SL' && d.kind === 'cabineo_hole').map((d) => `${d.x},${d.y}`);
    const lobes = r.drills.filter((d) => d.kind === 'cabineo_pocket').length;
    const bfFace = r.panels.find((p) => p.id === 'D1-BF')?.meta?.machinedFace;
    const line = r.hardware.find((h) => h.role === 'cabineo_connector');
    const bareCab = bare.drills.filter((d) => /^cabineo/.test(d.kind)).length;
    const sum = r.derived.boxCabineo;
    return {
      live: bareCab === 0 && sum?.joints === 12 && sum?.pockets === 20 && sum?.holes === 20 && lobes === 60
        && holes.join(' ') === '211,5.5 58,5.5 211,484.5 58,484.5' && bfFace === 'outside' && line?.qty === 20,
      said: `bare BUDR: ${bareCab} Cabineo cuts; named puzzle: ${sum?.joints} joints, ${sum?.pockets} pockets (${lobes} dia 15 holes from `
        + `the walls' outside faces, D1-BF machinedFace ${bfFace}), ${sum?.holes} dia 5 holes, D1-SL at ${holes.join(' ')}, `
        + `${line?.qty} x ${line?.label} on the order`,
    };
  },
};

export const GOLDENS = [
  {
    file: 'golden-cabineo12-budr-box.json',
    F: 'F34',
    source: 'SKYLON_JOINTS_CABINEO.lsp D.2c (its NUMBERS block H.1, the BUDR default: two a joint at 25 and 178 on D1 and D2, one at 42 '
      + 'on D3, the holes 1 + offset under the sides\' tops, 20 x Cabineo 12) on KIT_BUDR_FULL.lsp (the parent, its carcass the '
      + 'puzzle: joints_system named puzzle)',
    params: BUDR_BOX,
  },
  {
    file: 'golden-cabineo12-wardrobe-box.json',
    F: 'F34',
    source: 'SKYLON_JOINTS_CABINEO.lsp D.2c (H.1, the wardrobe at its default 200 front: walls 130, two a joint at 25 and 105, '
      + '24 x Cabineo 12) and D.2 / D.2b (the carcass on Cabineo 12) on KIT_WARDROBE_FULL.lsp, WARDROBE 1200, three internal drawers',
    params: WARDROBE_BOX,
  },
];

export const LISP = {
  'reference/lisp/SKYLON_JOINTS_CABINEO.lsp': 'T79 F14: D.2c THE DRAWER BOX after D.2b (cabineo-box-rule, cabineo-box-profile, '
    + 'cabineo-box-positions, cabineo-box-joint, cabineo-box-table, cabineo-box-pockets, cabineo-box-holes, cabineo-box-board-pt, '
    + 'cabineo-box-refusal, cabineo-box-pocket-rect, cabineo-box-pilot-refusal, cabineo-box-bom-lines), the command CABINEO_BOX '
    + `(G.3) and the NUMBERS block H.1; D.2, D.2b and every routine before untouched. ${OWNER}`,
};
