// T78 F18 · lift-up wall units, Blum AVENTOS (HK top, HS top, HL top, HF top): four front motions a wall unit chooses.
import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';
import { LIFT_SYSTEMS } from '../../src/engine/liftSystems.js';

const kit = (type, extra = {}) => ({ ...defaultParamsFor(type, P), unit_num: '01', ...extra });

export const GATES = {
  liftFront: {
    what: '`params.front_system` naming one of hk | hs | hl | hf on a wall unit that takes a lift (engine/liftSystems.js liftTakesKit: '
      + 'WUD, WUD_GLASS, WARDROBE_WALL): ONE full-width leaf with no cups and no plate rows, `meta.lift` on it, the lift bought as lines '
      + '(the set, the arm, the caps, the brackets, the HF hinge set), two placeholder bodies, zero holes; `hinged`, nothing, or any '
      + 'other kit is today\'s door byte for byte',
    opens: (params) => LIFT_SYSTEMS.includes(params?.front_system),
  },
};

export const LICENSED = {
  'src/engine/liftSystems.js': {
    why: 'T78 F18: the lift plan off reference/hardware/aventos.json t78_f18 (`liftTakesKit`, `liftSystemOf`, `liftPlanFor`, `liftRiseMm`, `liftTravelAt`): read by computeCabinet only where `params.front_system` names a lift.',
    gates: ['liftFront'],
  },
  'src/engine/liftChecks.js': {
    why: "T78 F18: Check #35, the lift leaf's rise against the room, a cornice and the unit above; a reader of results, it cuts nothing and no golden reaches it.",
    gates: [],
  },
  'src/engine/cabinet.js': {
    why: 'T78 F18: `liftSystemOf` read beside `dropsForward`; `liftOn` makes `leafCount` 1 and `hingedLeafCount` 0; the lift leaf (or the HF '
      + 'pair F-UP / F-LOW, the lower carrying `meta.lift.parent`) is cut in place of the face leaves; the cup loop passes a `meta.lift` leaf '
      + 'by; `hw(\'lift_unit\' | \'lift_arm\' | \'lift_caps\' | \'lift_bracket\' | \'lift_hinges\')` and the plan\'s sentences; `derived.lift` '
      + 'and `assemblies.liftKits` only where a lift is fitted. Every line of it is under `liftOn` / `liftPlan`, false and null on every other unit',
    gates: ['liftFront'],
  },
  'src/engine/checks.js': {
    why: 'T78 F18: Check #35 (engine/liftChecks.js liftClearanceFindings), a lift leaf\'s rise at full opening against the ceiling, a cornice '
      + 'and the unit above; a Check, never a cut; it reads `meta.lift` and finds none on every other unit',
    gates: ['liftFront'],
  },
  'src/engine/partRegistry.js': {
    why: 'T78 F18: five registry rows (lift_mechanism, lift_lever_arm, lift_cover_caps, lift_front_bracket, hinge_aventos_hf) and the five '
      + '`lift_*` role mappings; a list',
    gates: ['liftFront'],
  },
  'src/engine/hardware3d.js': {
    why: 'T78 F18: `liftKitInstances` hands `assemblies.liftKits` to the scene in the kit grammar (KitBodies draws the walled placeholder); '
      + 'empty on every unit without `liftKits`',
    gates: ['liftFront'],
  },
};

export const LIVENESS = {
  liftFront: () => {
    const r = computeCabinet(kit('WUD', { front_system: 'hk' }), P);
    const leaves = r.panels.filter((p) => p.part === 'FRONT');
    const unit = r.hardware.find((h) => h.role === 'lift_unit');
    const cups = r.drills.filter((d) => d.kind === 'cup').length;
    const plates = r.drills.filter((d) => d.kind === 'hinge').length;
    return {
      live: leaves.length === 1 && leaves[0]?.meta?.lift?.system === 'hk' && Boolean(unit) && cups === 0 && plates === 0
        && Array.isArray(r.assemblies?.liftKits) && r.assemblies.liftKits.length === 2,
      said: `WUD 600 x 720 with front_system hk: ${leaves.length} leaf (${leaves[0]?.meta?.lift?.system ?? 'no lift'}), `
        + `${unit ? `${unit.label} ${unit.spec?.article ?? 'no article'}` : 'no lift line'}, ${cups} cups, ${plates} plate holes, `
        + `${r.assemblies?.liftKits?.length ?? 0} bodies`,
    };
  },
};

/** The four goldens of F18: one per system on the 600 x 720 WUD of profile.wallUnit.defaults. */
export const GOLDENS = LIFT_SYSTEMS.map((system) => ({
  file: `golden-lift-${system}.json`,
  F: 'F18',
  source: `reference/hardware/aventos.json t78_f18.systems.${system} (owner to confirm): one full-width leaf${system === 'hf' ? ' in two halves (F-UP, F-LOW)' : ''}, `
    + 'no cups, no plate rows, the set chosen off the catalogue file (or refused in words), the arm, the caps, the brackets'
    + `${system === 'hf' ? ', the HF hinge set' : ''}; two placeholder bodies, zero holes. No LISP: no cut geometry moved`,
  params: () => kit('WUD', { front_system: system }),
}));
