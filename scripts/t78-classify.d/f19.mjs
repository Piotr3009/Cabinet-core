// T78 F19 · DOWELS 6 MM, EVERY 250, MINIMUM TWO; THE COMPANY CHOOSES THE SYSTEM.
// CLAUDE.md T78 PART E, the owner (11.10.2026): *"minimum 2 a kolki co mniej
// wiecej co 250 mm"*, dowels 6 mm; *"mamy puzzle i dogbones w systemie i niech
// tak bedzie ale tez trzeba zrobic wybor laczenia i mamy 4: puzzle, dowels,
// Cabineo, ciastka"*; Cabineo 8 AND 12, chosen in the company's default
// settings. LISP FIRST: reference/lisp/SKYLON_JOINTS_DOWEL.lsp (T75's file)
// amended to the owner's numbers (sections A and B, its NUMBERS block H
// recomputed by hand); `src/engine/dowels.js` mirrors it routine for routine.
// THE CHOICE: `engine/companyDefaults.js joints_system` (an id, never a
// number; the joints' numbers refused by name), `design.joints.system`
// (prefilled from the row), `params.joints_system` (the T75 F23 Joints row),
// ONE cascade (`dowels.js resolveJointSystem`, the T22 ladder); the store
// (`stores/projectStore.js paramsForEngine`) hands the ladder's answer to the
// engine as the unit's own key and ONLY where it is not the profile's own, so
// `computeCabinet` keeps its one reader (`jointSystemOf`).
//
// FROZEN 1, how no frozen golden reaches a line of this F: the six (WARDROBE,
// BUD, WUD, BUDR, BUDR4, PANTRY), T75's nine, T76's decoration file and T77's
// ornate records carry no `joints_system` (`defaultParamsFor` stamps none, the
// fixtures' params say none, the company row never reaches a bare kit call),
// so `jointSystemOf` answers 'puzzle' for every one of them and not one reads
// `profile.joints.dowel` or `dowelPositions`. The one golden that does,
// fixtures/golden-dowel-bud.json, is T75's (scripts/t75-classify.d/f23.mjs
// names it in GOLDENS; it is not named twice here) and is RE-PINNED below,
// knowingly.

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';
import { dowelProfile, jointSystemOf, resolveJointSystem } from '../../src/engine/dowels.js';
import { clearCompanyDefaults, setCompanyDefaults } from '../../src/engine/companyDefaults.js';
import { rectCorners } from '../../src/engine/room.js';
import { paramsForEngine, useProjectStore } from '../../src/stores/projectStore.js';

/** The frozen goldens' kits: none of their defaults names a joint system. */
const THE_SIX = ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY'];

export const GATES = {
  dowelSetOut: {
    what: 'a unit cut with dowels (`params.joints_system` \'dowel\'): F19 moved `profile.joints.dowel` to the owner\'s numbers '
      + '(dia 6, pitch 250, minPerJoint 2, end offset 50; `maxGapMm` gone) and `dowelPositions(L, e, p, nMin, dia)` to the even '
      + 'set-out between the two end offsets, never fewer than two, no gap over the pitch (SKYLON_JOINTS_DOWEL.lsp section B); a unit '
      + 'on any other system never reads either. No frozen golden names a joint system',
    opens: (p) => p?.joints_system === 'dowel',
  },
  jointSystemLadder: {
    what: '`params.joints_system` naming any system but the profile\'s own (\'puzzle\'): the ONLY road from the company row '
      + '(`companyDefaults.js joints_system`), the project (`design.joints.system`) or PRO\'s Joints row to the engine, written by '
      + '`projectStore.js paramsForEngine` off `resolveJointSystem` and only where the ladder\'s answer differs from '
      + '`jointSystemOf(null, profile)`; a bare kit call and every frozen golden carry no key and cut the puzzle',
    opens: (p) => p?.joints_system != null && String(p.joints_system).trim().toLowerCase() !== 'puzzle',
  },
};

export const LICENSED = {
  'src/engine/dowels.js': {
    why: 'F19 · `dowelProfile` reads the owner\'s numbers (6, 250, minPerJoint 2, 50) and no `maxGapMm`; `dowelPositions` takes '
      + '(L, e, p, nMin, dia) as `dowel-positions` does and spreads the dowels evenly between the two end offsets, never fewer than '
      + 'two; `dowelRefusal` says the pitch and the minimum in words. `resolveJointSystem` is the four-storey ladder (profile, company '
      + 'row, project, unit) and cuts nothing: the store hands its answer over as `params.joints_system`',
    gates: ['dowelSetOut'],
  },
  'src/engine/profile.js': {
    why: 'F19 · `joints.dowel` carries the owner\'s four numbers, `minPerJoint` in, `maxGapMm` out; the migrate line lets the code '
      + 'win for the four and drops a saved max gap. Read only by a dowel unit; the six cut the puzzle by `joints.system`',
    gates: ['dowelSetOut'],
  },
  'src/engine/companyDefaults.js': {
    why: 'F19 · `joints_system` on the row shape, `JOINT_SYSTEM_IDS`, the validator (an id and never a number: 250, "250", "6 mm", '
      + '"90deg" refused in words naming the ids; the joints\' pitches, diameters, depths and angle rule-owned by name), '
      + '`hasCompanyDefaults`, `prefillDesignFromCompany` writing `design.joints.system`. A preference row; it reaches the engine '
      + 'only as `params.joints_system` through the store',
    gates: [],
  },
  'src/engine/design.js': {
    why: 'F19 · `DEFAULT_DESIGN.joints = { system: null }` and its migrate line (a trimmed, lower-cased id or null). The project\'s '
      + 'storey of the ladder; cuts nothing, and a project saved before T78 comes back on null (the profile\'s own, the puzzle)',
    gates: [],
  },
};

export const LIVENESS = {
  dowelSetOut: () => {
    const prof = dowelProfile(P);
    const r = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01', joints_system: 'dowel' }, P);
    const j = r.derived?.joints || null;
    const dowels = r.drills.filter((d) => d.kind === 'dowel');
    const dias = [...new Set(dowels.map((d) => d.d))];
    const everyJoint = (j?.joints || []).every((x) => x.dowels >= 2
      && (x.len - 2 * prof.endOffsetMm) / (x.dowels - 1) <= prof.pitchMm + 1e-6);
    const numbers = prof.diaMm === 6 && prof.pitchMm === 250 && prof.minPerJoint === 2 && prof.endOffsetMm === 50 && !('maxGapMm' in prof);
    return {
      live: j?.system === 'dowel' && j.dowels === 26 && everyJoint && dias.length === 1 && dias[0] === 6 && numbers,
      said: `BUD with dowels cuts ${j?.dowels} dowels of ${dias.join('/')} mm on ${j?.joints?.length} joints, every joint >= 2, `
        + `no gap over ${prof.pitchMm}; profile ${prof.diaMm} / ${prof.pitchMm} / min ${prof.minPerJoint} / ${prof.endOffsetMm}, `
        + `maxGapMm ${'maxGapMm' in prof ? 'still read' : 'gone'}`,
    };
  },
  jointSystemLadder: () => {
    const S = useProjectStore.getState;
    const fresh = () => {
      S().newProject();
      S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
      S().addUnit('BUD');
      return S().units[0];
    };
    clearCompanyDefaults();
    const bare = fresh();
    const bareParams = paramsForEngine(bare, S().project.design);
    const bareCut = S().unitResult(bare.id);
    setCompanyDefaults({ joints_system: 'dowel' }, P);
    const rowUnit = fresh();
    const rowParams = paramsForEngine(rowUnit, S().project.design);
    const rowCut = S().unitResult(rowUnit.id);
    const ladder = resolveJointSystem({ profile: P, design: { joints: { system: 'biscuit' } }, params: { joints_system: 'spaghetti' } });
    clearCompanyDefaults();
    S().newProject();
    const sixCarryNone = THE_SIX.every((id) => defaultParamsFor(id, P).joints_system === undefined
      && jointSystemOf(defaultParamsFor(id, P), P) === 'puzzle');
    return {
      live: !('joints_system' in bareParams) && bareCut.derived.joints === undefined
        && rowParams.joints_system === 'dowel' && rowUnit.params.joints_system === undefined
        && rowCut.derived.joints?.system === 'dowel' && ladder === 'biscuit' && sixCarryNone,
      said: `no row: a fresh BUD's engine params ${('joints_system' in bareParams) ? 'CARRY' : 'carry no'} joints_system and derived.joints is `
        + `${bareCut.derived.joints === undefined ? 'absent' : 'present'}; row dowel: the project says ${S().project.design.joints?.system ?? 'null'} `
        + `after reset, the BUD was cut ${rowCut.derived.joints?.system} with the unit's own key ${rowUnit.params.joints_system}; `
        + `a stale unit id falls to the project (${ladder}); the six kits' defaults ${sixCarryNone ? 'carry no' : 'CARRY a'} joint system`,
    };
  },
};

/** The dowel golden is T75's (scripts/t75-classify.d/f23.mjs GOLDENS); nothing new is pinned by F19. */
export const GOLDENS = [];

// Re-pinned by F19, knowingly (node scripts/t75-goldens.mjs --write golden-dowel-bud.json).
export const REPINNED = [
  {
    file: 'fixtures/golden-dowel-bud.json',
    why: 'T78 F19: the owner\'s numbers of 11.10.2026 (6 mm, every 250, min 2) replace T75\'s proposals; the cut moved with the LISP '
      + '(SKYLON_JOINTS_DOWEL.lsp sections A, B and H: 26 dowels on the BUD 600 where T75\'s rule at pitch 32 cut 44)',
  },
];
