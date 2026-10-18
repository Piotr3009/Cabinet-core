// ─── T78 F19 · THE JOINT CHOICE: THE COMPANY CHOOSES THE SYSTEM, NEVER A NUMBER ──
//
// The owner, 11.10.2026: *"mamy puzzle i dogbones w systemie i niech tak
// bedzie ale tez trzeba zrobic wybor laczenia i mamy 4: puzzle, dowels,
// Cabineo, ciastka"*, and Cabineo *"8 AND 12, chosen in the company's default
// settings"*. CLAUDE.md T78 F19: *"`engine/companyDefaults.js` (T22, the
// missing storey) gets `joints.system: 'puzzle' | 'dowel' | 'biscuit' |
// 'cabineo8' | 'cabineo12'`, default `puzzle`; the project inherits, a unit
// may override (the T75 F23 Joints row) ... The validator refuses an angle or
// a number here (T22 law); it accepts a system id."*
//
// What is held here, storey by storey:
//   the ROW      `DEFAULT_COMPANY_DEFAULTS.joints_system`, `JOINT_SYSTEM_IDS`,
//                the validator (an id, never a number; the joints' numbers
//                refused by name as rule-owned), `hasCompanyDefaults`;
//   the PROJECT  `prefillDesignFromCompany` writes `design.joints.system`
//                where the design has not said; `migrateDesign` carries it;
//   the LADDER   `resolveJointSystem`: profile, company row, project, unit,
//                later wins, a stale id skipped, the reserved 'cabineo' let
//                through to the engine's refusal in words;
//   the ROAD     `paramsForEngine` hands the ladder's answer to the engine as
//                the unit's own key ONLY where it is not the profile's own, so
//                a fresh BUD under no row carries no key and cuts the puzzle,
//                and a BUD under a row that says dowel is cut with dowels;
//   the SCREENS  the Company defaults modal (a Choice, no number input) and
//                PRO's Joints row (five buttons, the reserved id a paragraph);
//   the TABLE    sql/007_tura78.sql says the same as the validator.
// No em or en dash in anything this F wrote (the house law).

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

import {
  DEFAULT_COMPANY_DEFAULTS, JOINT_SYSTEM_IDS, RULE_OWNED_KEYS, clearCompanyDefaults, companyDefaults,
  hasCompanyDefaults, prefillDesignFromCompany, setCompanyDefaults, validateCompanyDefaults,
} from '../src/engine/companyDefaults.js';
import { CABINEO_REFUSAL, JOINT_SYSTEMS, jointSystemOf, resolveJointSystem } from '../src/engine/dowels.js';
import { CABINEO_GATE_CODE } from '../src/engine/cabineo.js';
import { migrateDesign } from '../src/engine/design.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { rectCorners } from '../src/engine/room.js';
import { paramsForEngine, useProjectStore } from '../src/stores/projectStore.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();

/** The owner's five, in the order the screens offer them. */
const IDS = ['puzzle', 'dowel', 'biscuit', 'cabineo8', 'cabineo12'];
/** The joints' numbers T78 added to RULE_OWNED_KEYS, every spelling. */
const JOINT_NUMBER_KEYS = [
  'joints_pitch', 'joints_pitch_mm', 'dowel_pitch', 'dowel_pitch_mm', 'dowel_diameter', 'dowel_dia_mm',
  'dowel_depth', 'dowels_per_joint', 'cabineo_pitch', 'cabineo_pitch_mm', 'biscuit_pitch', 'joints_angle',
];
const DASH = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`);

/** The text between two markers, the end looked for AFTER the start. */
function segment(src, start, end, where) {
  const i = src.indexOf(start);
  assert.ok(i >= 0, `${where}: "${start}" is not in the file`);
  const j = src.indexOf(end, i);
  assert.ok(j >= 0, `${where}: "${end}" does not follow "${start}"`);
  return src.slice(i, j + end.length);
}

/** A fresh project in a 4000 x 3000 room with one BUD; the unit is returned. */
function freshBud() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  S().addUnit('BUD');
  return S().units[0];
}

// ═══ (a) THE ROW ════════════════════════════════════════════════════════════

test('F19 · the row: `joints_system` is null until the shop says; the five ids are the owner\'s four with Cabineo in two variants', () => {
  assert.ok('joints_system' in DEFAULT_COMPANY_DEFAULTS, 'the key is on the row shape');
  assert.equal(DEFAULT_COMPANY_DEFAULTS.joints_system, null, 'null is "the shop has not said" (puzzle)');
  assert.deepEqual([...JOINT_SYSTEM_IDS], IDS);
  assert.ok(Object.isFrozen(JOINT_SYSTEM_IDS), 'the list is frozen: nobody appends a system at runtime');
  // The engine's own list carries the five AND the reserved 'cabineo' of T75; the company's list does not offer the reserved one.
  for (const id of IDS) assert.ok(JOINT_SYSTEMS.includes(id), `${id} is a system the engine cuts`);
  assert.ok(JOINT_SYSTEMS.includes('cabineo'), 'the reserved id is still the engine\'s (refused in words)');
  assert.equal(JOINT_SYSTEM_IDS.includes('cabineo'), false, 'and is not something the company may choose');
});

// ═══ (b) THE VALIDATOR ══════════════════════════════════════════════════════

test('F19 · the validator accepts each of the five ids, and normalises the spelling (" Cabineo8 " is cabineo8)', () => {
  for (const id of IDS) {
    const { value, rejected } = validateCompanyDefaults({ joints_system: id }, P);
    assert.equal(value.joints_system, id);
    assert.deepEqual(rejected, [], `${id} is accepted without a word`);
  }
  assert.equal(validateCompanyDefaults({ joints_system: ' Cabineo8 ' }, P).value.joints_system, 'cabineo8');
  assert.equal(validateCompanyDefaults({ joints_system: 'DOWEL' }, P).value.joints_system, 'dowel', 'case is not a different system');
  assert.equal(validateCompanyDefaults({ joints_system: 'Cabineo 12' }, P).value.joints_system, 'cabineo12', 'a space inside the id is not a different system');
  // Nothing said is nothing said.
  assert.equal(validateCompanyDefaults({ joints_system: '' }, P).value.joints_system, null);
  assert.equal(validateCompanyDefaults({ joints_system: null }, P).value.joints_system, null);
  assert.equal(validateCompanyDefaults({}, P).value.joints_system, null);
});

test('F19 · the validator refuses a NUMBER (250, "250", "6 mm", "90deg") in words that name the ids: the T22 law', () => {
  for (const typed of [250, '250', '6 mm', '90deg', 6, '32', '110°', '-5']) {
    const { value, rejected } = validateCompanyDefaults({ joints_system: typed }, P);
    assert.equal(value.joints_system, null, `${JSON.stringify(typed)} never reaches the row`);
    assert.equal(rejected.length, 1, `${JSON.stringify(typed)} is refused exactly once`);
    const [hit] = rejected;
    assert.equal(hit.key, 'joints_system');
    assert.equal(typeof hit.why, 'string');
    assert.match(hit.why, /is a number/, `${JSON.stringify(typed)}: the why names it a number`);
    assert.match(hit.why, /a joint system is an id/);
    for (const id of IDS) assert.ok(hit.why.includes(id), `${JSON.stringify(typed)}: the why lists ${id}`);
    assert.match(hit.why, /profile'?s and the LISP'?s/, 'and says whose the numbers are');
  }
});

test('F19 · the validator refuses the reserved "cabineo" and an unknown id as "not something this workshop offers"', () => {
  for (const stale of ['cabineo', 'spaghetti', 'cabineo16', 'dowels']) {
    const { value, rejected } = validateCompanyDefaults({ joints_system: stale }, P);
    assert.equal(value.joints_system, null);
    assert.equal(rejected.length, 1);
    assert.equal(rejected[0].key, 'joints_system');
    assert.match(rejected[0].why, /not something this workshop offers/, `${stale}`);
    assert.ok(rejected[0].why.includes(stale), 'the stale word is quoted back');
  }
});

test('F19 · the joints\' NUMBERS are rule-owned keys: joints_pitch, dowel_pitch, cabineo_pitch, joints_angle and their spellings are refused by name, the value dropped', () => {
  for (const key of JOINT_NUMBER_KEYS) assert.ok(RULE_OWNED_KEYS.includes(key), `${key} is on RULE_OWNED_KEYS`);
  for (const key of ['joints_pitch', 'dowel_pitch', 'cabineo_pitch', 'joints_angle', ...JOINT_NUMBER_KEYS]) {
    const { value, rejected } = validateCompanyDefaults({ [key]: 250, joints_system: 'dowel' }, P);
    assert.equal(value[key], undefined, `${key} never reaches the row`);
    const hit = rejected.find((r) => r.key === key);
    assert.ok(hit, `${key} is said out loud, not dropped quietly`);
    assert.match(hit.why, /rule/, `${key}: the why names the rule`);
    assert.equal(value.joints_system, 'dowel', 'the SYSTEM beside the refused number is kept: the id is a preference, the number is not');
  }
  // The T22 keys are still refused beside them.
  const out = validateCompanyDefaults({ hinge_angle: 110, joints_system: 'biscuit' }, P);
  assert.ok(out.rejected.some((r) => r.key === 'hinge_angle'));
  assert.equal(out.value.joints_system, 'biscuit');
});

// ═══ (c) IS THE ROW SAYING ANYTHING ════════════════════════════════════════

test('F19 · a row whose only entry is the joint system is a row that is saying something', () => {
  assert.equal(hasCompanyDefaults({ joints_system: 'dowel' }), true);
  assert.equal(hasCompanyDefaults({ joints_system: 'puzzle' }), true, 'puzzle said out loud is still said');
  assert.equal(hasCompanyDefaults({}), false);
  assert.equal(hasCompanyDefaults({ joints_system: null }), false);
  assert.equal(hasCompanyDefaults({ joints_system: '' }), false);
  // ...and the ACTIVE row keeps it.
  clearCompanyDefaults();
  try {
    assert.equal(setCompanyDefaults({ joints_system: 'cabineo12' }, P)?.joints_system, 'cabineo12');
    assert.equal(companyDefaults().joints_system, 'cabineo12');
    // A row of nothing but a refused number is no row at all.
    setCompanyDefaults({ joints_system: 250 }, P);
    assert.equal(companyDefaults(), null);
  } finally {
    clearCompanyDefaults();
  }
  assert.equal(companyDefaults(), null);
});

// ═══ (d) THE PREFILL ═══════════════════════════════════════════════════════

test('F19 · prefillDesignFromCompany writes design.joints.system where the design has not said, leaves a design that has, is the identity on a silent row', () => {
  const bare = migrateDesign({});
  const filled = prefillDesignFromCompany(bare, { joints_system: 'biscuit' }, P);
  assert.equal(filled.joints.system, 'biscuit');
  assert.equal(bare.joints.system, null, 'the given design is not mutated');
  assert.equal(migrateDesign(filled).joints.system, 'biscuit', 'and the store\'s migrate on the way in keeps it');
  // The project has answered: the workshop's default is not a later decision than the one in front of it.
  const said = migrateDesign({ joints: { system: 'dowel' } });
  assert.equal(prefillDesignFromCompany(said, { joints_system: 'biscuit' }, P).joints.system, 'dowel');
  // A row that says nothing about joints leaves the field null while prefilling the rest.
  const other = prefillDesignFromCompany(bare, { hinge_finish: 'onyx' }, P);
  assert.equal(other.joints.system, null);
  assert.equal(other.hinges.finish, 'onyx');
  // Identity when the row says nothing at all.
  assert.equal(prefillDesignFromCompany(bare, null, P), bare);
  assert.equal(prefillDesignFromCompany(bare, {}, P), bare);
  assert.equal(prefillDesignFromCompany(bare, { joints_system: null }, P), bare);
  // `company` undefined reads the ACTIVE row.
  clearCompanyDefaults();
  try {
    assert.equal(prefillDesignFromCompany(bare, undefined, P), bare, 'no active row: identity');
    setCompanyDefaults({ joints_system: 'cabineo8' }, P);
    assert.equal(prefillDesignFromCompany(bare, undefined, P).joints.system, 'cabineo8');
  } finally {
    clearCompanyDefaults();
  }
});

// ═══ (e) THE DESIGN ════════════════════════════════════════════════════════

test('F19 · migrateDesign: joints { system: null } on a bare design; a saved id is trimmed and lower-cased', () => {
  assert.deepEqual(migrateDesign({}).joints, { system: null });
  assert.deepEqual(migrateDesign({ joints: {} }).joints, { system: null });
  assert.equal(migrateDesign({ joints: { system: ' Cabineo12 ' } }).joints.system, 'cabineo12');
  assert.equal(migrateDesign({ joints: { system: 'DOWEL' } }).joints.system, 'dowel');
  assert.equal(migrateDesign({ joints: { system: '' } }).joints.system, null);
  // A project saved before T78 carries no `joints` and comes back on the profile's own answer.
  assert.deepEqual(migrateDesign({ hinges: { finish: 'onyx' } }).joints, { system: null });
});

// ═══ (f) THE LADDER ════════════════════════════════════════════════════════

test('F19 · resolveJointSystem: profile, company row, project, unit; later wins; a stale id is skipped; the reserved id reaches the engine', () => {
  // Nothing said anywhere: the puzzle.
  assert.equal(resolveJointSystem({ company: null }), 'puzzle');
  assert.equal(resolveJointSystem({ params: {}, design: {}, profile: {}, company: null }), 'puzzle');
  // The profile alone.
  assert.equal(resolveJointSystem({ profile: { joints: { system: 'dowel' } }, company: null }), 'dowel');
  assert.equal(resolveJointSystem({ profile: P, company: null }), P.joints.system, 'the default profile\'s own answer');
  assert.equal(resolveJointSystem({ profile: P, company: null }), 'puzzle');
  // The company row beats the profile.
  assert.equal(resolveJointSystem({ profile: P, company: { joints_system: 'dowel' } }), 'dowel');
  // The project beats the company row.
  const row = { joints_system: 'dowel' };
  const design = { joints: { system: 'biscuit' } };
  assert.equal(resolveJointSystem({ profile: P, company: row, design }), 'biscuit');
  // The unit beats the project (later wins), even back to the puzzle.
  assert.equal(resolveJointSystem({ profile: P, company: row, design, params: { joints_system: 'puzzle' } }), 'puzzle');
  assert.equal(resolveJointSystem({ profile: P, company: row, design, params: { joints_system: 'cabineo12' } }), 'cabineo12');
  // A stale id at the unit is not an override: the project's answer stands.
  assert.equal(resolveJointSystem({ profile: P, company: row, design, params: { joints_system: 'spaghetti' } }), 'biscuit');
  assert.equal(resolveJointSystem({ profile: P, company: row, design: { joints: { system: 'zzz' } } }), 'dowel', 'a stale project answer falls to the row');
  // The spelling is normalised on the way up the ladder.
  assert.equal(resolveJointSystem({ profile: P, company: null, params: { joints_system: ' Cabineo8 ' } }), 'cabineo8');
  // The reserved 'cabineo' IS an engine id: it climbs the ladder and reaches the engine's refusal in words.
  assert.equal(resolveJointSystem({ profile: P, company: null, params: { joints_system: 'cabineo' } }), 'cabineo');
  assert.equal(jointSystemOf({ joints_system: 'cabineo' }, P), 'cabineo');
  assert.match(CABINEO_REFUSAL, /^Cabineo is reserved/);
  // `company` undefined reads the ACTIVE row; null is "no row".
  clearCompanyDefaults();
  try {
    assert.equal(resolveJointSystem({ profile: P }), 'puzzle', 'no active row');
    setCompanyDefaults({ joints_system: 'cabineo8' }, P);
    assert.equal(resolveJointSystem({ profile: P }), 'cabineo8', 'the active row is read when company is left out');
    assert.equal(resolveJointSystem({ profile: P, company: null }), 'puzzle', 'null is "no row", whatever is active');
    assert.equal(resolveJointSystem({ profile: P, design: { joints: { system: 'biscuit' } } }), 'biscuit', 'the project still beats the active row');
    clearCompanyDefaults();
    assert.equal(resolveJointSystem({ profile: P }), 'puzzle', 'and it is forgotten cleanly');
  } finally {
    clearCompanyDefaults();
  }
});

// ═══ (g) THE STORE ROAD ════════════════════════════════════════════════════

// REWRITTEN BY T79 F14: the hand-off names the system on EVERY unit, the profile's own 'puzzle' included. The owner,
// 18.10.2026: *"jak mamy wybrane jakąkolwiek funkcję łączenia czy dog bones czy inne zawsze projektuj cabineo na szuflady"*.
test('F19 · THE ROAD, no row: a fresh BUD\'s engine params name the puzzle (T79 F14), the cut is the puzzle, derived.joints is absent', () => {
  clearCompanyDefaults();
  const unit = freshBud();
  assert.equal(S().project.design.joints.system, null, 'the new project inherits nothing');
  assert.equal(unit.params.joints_system, undefined, 'the unit says nothing');
  const engineParams = paramsForEngine(unit, S().project.design);
  assert.equal(engineParams.joints_system, 'puzzle', 'T79 F14: the hand-off names the ladder\'s answer on every unit, the profile\'s own too');
  assert.equal(jointSystemOf(engineParams, P), 'puzzle');
  const r = S().unitResult(unit.id);
  assert.equal(r.derived.joints, undefined, 'a puzzle unit runs no line of the joint systems');
  assert.ok(r.drills.some((d) => d.kind === 'puzzle'), 'the puzzle\'s own holes are cut');
  assert.equal(r.drills.some((d) => d.kind === 'dowel' || d.kind === 'biscuit_screw' || d.kind === 'cabineo_hole'), false);
  assert.equal(r.warnings.some((w) => /JOINTS|DOWEL_GATE|CABINEO_GATE/.test(w.code)), false);
});

test('F19 · THE ROAD, a row that says dowel: a NEW project inherits it and its BUD is cut with dowels with no unit key; the unit\'s own "puzzle" brings the puzzle back', () => {
  clearCompanyDefaults();
  try {
    setCompanyDefaults({ joints_system: 'dowel' }, P);
    const unit = freshBud();
    assert.equal(S().project.design.joints.system, 'dowel', 'prefilled into the project at creation');
    assert.equal(unit.params.joints_system, undefined, 'the unit itself carries no key: the choice is the project\'s, not stamped on the cabinet');
    const engineParams = paramsForEngine(unit, S().project.design);
    assert.equal(engineParams.joints_system, 'dowel', 'the ladder\'s answer travels as the unit\'s own key');
    const before = S().unitResult(unit.id);
    assert.equal(before.derived.joints.system, 'dowel', before.derived.joints.refused);
    assert.equal(before.derived.joints.dowels, 26, 'the owner\'s numbers on the BUD 600 (T78 F19)');
    assert.equal(before.drills.some((d) => d.kind === 'puzzle'), false, 'the puzzle is gone from the five boards');
    assert.ok(before.warnings.some((w) => w.code === 'DOWEL_GATE'), 'the gate is still shut');

    // The unit overrides the project, back to the puzzle.
    S().updateUnitParams(unit.id, { joints_system: 'puzzle' });
    const back = S().units.find((u) => u.id === unit.id);
    assert.equal(jointSystemOf(paramsForEngine(back, S().project.design), P), 'puzzle');
    const after = S().unitResult(unit.id);
    assert.equal(after.derived.joints, undefined);
    assert.ok(after.drills.some((d) => d.kind === 'puzzle'));
    assert.equal(after.drills.some((d) => d.kind === 'dowel'), false);

    // ...and forward again to the project's answer, by handing the key back (null).
    S().updateUnitParams(unit.id, { joints_system: null });
    assert.equal(S().unitResult(unit.id).derived.joints?.system, 'dowel', 'a unit that says nothing again follows the project');

    // SAVE AND RELOAD: the project's answer is in the design, so the reloaded job cuts the same with no row at all.
    const saved = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
    clearCompanyDefaults();
    S().newProject();
    assert.equal(S().project.design.joints.system, null, 'a new project under no row starts on the profile');
    S().loadProject(saved.project, saved.units);
    assert.equal(S().project.design.joints.system, 'dowel');
    const reloaded = S().unitResult(unit.id);
    assert.equal(reloaded.derived.joints.system, 'dowel');
    assert.deepEqual(reloaded.drills, S().unitResult(unit.id).drills);
    assert.equal(reloaded.derived.joints.dowels, 26);
  } finally {
    clearCompanyDefaults();
  }
});

test('F19 · THE ROAD, every id the company may choose reaches the engine as that system (biscuit, cabineo8, cabineo12); the Cabineo gate open since 15.10.2026', () => {
  clearCompanyDefaults();
  try {
    const want = {
      biscuit: (r) => {
        assert.equal(r.derived.joints.system, 'biscuit', r.derived.joints.refused);
        assert.ok(r.derived.joints.sets > 0);
        assert.equal(r.warnings.some((w) => w.code === CABINEO_GATE_CODE || w.code === 'DOWEL_GATE'), false, 'the owner\'s own set, no gate');
      },
      cabineo8: (r) => {
        assert.equal(r.derived.joints.system, 'cabineo8', r.derived.joints.refused);
        assert.equal(String(r.derived.joints.variant), '8');
        assert.equal(r.warnings.some((w) => w.code === CABINEO_GATE_CODE), false, 'the Cabineo gate is open (the owner, 15.10.2026: otworz)');
      },
      cabineo12: (r) => {
        assert.equal(r.derived.joints.system, 'cabineo12', r.derived.joints.refused);
        assert.equal(String(r.derived.joints.variant), '12');
        assert.equal(r.warnings.some((w) => w.code === CABINEO_GATE_CODE), false, 'the Cabineo gate is open (the owner, 15.10.2026: otworz)');
      },
    };
    for (const [id, check] of Object.entries(want)) {
      setCompanyDefaults({ joints_system: id }, P);
      const unit = freshBud();
      assert.equal(S().project.design.joints.system, id);
      assert.equal(unit.params.joints_system, undefined);
      assert.equal(paramsForEngine(unit, S().project.design).joints_system, id);
      check(S().unitResult(unit.id));
      clearCompanyDefaults();
    }
    // A row that says puzzle out loud is the same cut as no row.
    setCompanyDefaults({ joints_system: 'puzzle' }, P);
    const unit = freshBud();
    assert.equal(S().project.design.joints.system, 'puzzle');
    assert.equal(paramsForEngine(unit, S().project.design).joints_system, 'puzzle', 'T79 F14: the profile\'s own answer travels named');
    assert.equal(S().unitResult(unit.id).derived.joints, undefined);
  } finally {
    clearCompanyDefaults();
  }
});

// ═══ (h) THE COMPANY DEFAULTS MODAL ════════════════════════════════════════

test('F19 · the Company defaults screen offers the joint system as a CHOICE (data-company-field joints_system), the five labels, and no number input', () => {
  const src = read('src/components/CompanyDefaultsModal.jsx');
  assert.match(src, /import \{ BOARD_FAMILIES, JOINT_SYSTEM_IDS \} from '\.\.\/engine\/companyDefaults\.js'/);
  // The Choice component stamps its testKey on the field.
  assert.match(src, /const Choice = \(\{ label, hint, value, options, onPick, testKey \}\) => \(\n\s*<label className="block" data-company-field=\{testKey\}>/);
  assert.match(src, /<select\n/, 'a Choice is a select');
  // The joints Choice, field by field.
  const choice = segment(src, '<Choice\n            testKey="joints_system"', '/>', 'the joints Choice');
  assert.match(choice, /label="Joints"/);
  assert.match(choice, /hint=\{profile\.joints\?\.system \|\| 'puzzle'\}/, 'the hint is the profile\'s own answer');
  assert.match(choice, /value=\{row\.joints_system\}/);
  assert.match(choice, /options=\{JOINT_SYSTEM_IDS\.map\(\(id\) => \(\{ id, label: JOINT_LABELS\[id\] \|\| id \}\)\)\}/, 'the ids are the engine\'s list, never retyped');
  assert.match(choice, /onPick=\{\(v\) => setField\(\{ joints_system: v \}\)\}/);
  assert.doesNotMatch(choice, /type="number"|NumberField|Number\(|parseFloat|parseInt/, 'not one number on the joints field');
  // The labels, by id, in the owner's order.
  const labels = Function(`return ${segment(src, 'const JOINT_LABELS = ', '};', 'JOINT_LABELS').replace(/^const JOINT_LABELS = /, '').replace(/;$/, '')}`)();
  assert.deepEqual(Object.keys(labels), IDS);
  assert.match(labels.puzzle, /puzzle/i);
  assert.equal(labels.dowel, 'Dowels');
  assert.equal(labels.biscuit, 'Biscuits');
  assert.equal(labels.cabineo8, 'Lamello Cabineo 8');
  assert.equal(labels.cabineo12, 'Lamello Cabineo 12');
  // No number input for joints anywhere on this screen (the screen has no NumberField at all).
  assert.doesNotMatch(src, /NumberField/);
  assert.doesNotMatch(src, /type="number"/);
  assert.doesNotMatch(src, /joints_pitch|dowel_pitch|cabineo_pitch|joints_angle/, 'no rule-owned key is offered');
});

// ═══ (i) PRO'S JOINTS ROW ══════════════════════════════════════════════════

test('F19 · PRO\'s Joints row renders the five ids as buttons, each disabled only by its kit refusal, the reserved id a paragraph, no number, the import line kept', () => {
  const rp = read('src/components/RightPanel.jsx');
  assert.ok(rp.includes("import { CABINEO_REFUSAL, dowelKitRefusal, jointSystemOf } from '../engine/dowels.js';\n"), 'the T75 import line, byte for byte');
  assert.match(rp, /import \{ biscuitKitRefusal \} from '\.\.\/engine\/biscuitJoints\.js';/);
  assert.match(rp, /import \{ cabineoKitRefusal, isCabineoSystem \} from '\.\.\/engine\/cabineo\.js';/);
  // The five choices, as the buttons will carry them in data-joints.
  const choices = Function(`return ${segment(rp, 'const JOINT_CHOICES = [', '];', 'JOINT_CHOICES').replace(/^const JOINT_CHOICES = /, '').replace(/;$/, '')}`)();
  assert.deepEqual(choices.map((c) => c.id), IDS);
  assert.deepEqual(choices.map((c) => c.label), ['Puzzle', 'Dowel', 'Biscuit', 'Cabineo 8', 'Cabineo 12']);
  for (const c of choices) assert.equal(typeof c.title, 'string');
  const row = rp.split('function JointsRow(')[1].split('\n}\n')[0];
  assert.match(row, /JOINT_CHOICES\.map\(\(c\) => \{/);
  assert.match(row, /data-joints=\{c\.id\}/, 'every button carries its id');
  assert.match(row, /disabled=\{Boolean\(refusal\)\}/, 'disabled only by a refusal');
  assert.match(row, /const refusal = refusals\[c\.id\] \|\| null;/);
  for (const [id, fn] of [['dowel', 'dowelKitRefusal'], ['biscuit', 'biscuitKitRefusal'], ['cabineo8', 'cabineoKitRefusal'], ['cabineo12', 'cabineoKitRefusal']]) {
    assert.match(row, new RegExp(`${id}: ${fn}\\(type\\),`), `${id} is refused by its own kit rule`);
  }
  assert.doesNotMatch(row, /puzzle: \w+Refusal/, 'the puzzle is never refused');
  assert.match(row, /onClick=\{\(\) => onSet\(c\.id\)\}/);
  // The reserved id of T75: a paragraph, only when a saved unit asks for it; no button.
  assert.match(row, /\{asked === 'cabineo' && <p className="[^"]*" data-joints-cabineo="1">\{CABINEO_REFUSAL\}<\/p>\}/);
  assert.doesNotMatch(row, /data-joints="cabineo"/, 'the reserved id is not a button');
  assert.doesNotMatch(row, /disabled\n|title=\{CABINEO_REFUSAL\}/, 'the T75 hard-wired disabled Cabineo button is gone');
  assert.doesNotMatch(row, /NumberField|<input/, 'a typed number in the joints row');
  // The row writes the unit's own key through the store.
  assert.match(rp, /<JointsRow\n/);
  assert.match(rp, /onSet=\{\(system\) => updateUnitParams\(unit\.id, \{ joints_system: system \}\)\}/);
  // The lit button is what the ENGINE cut, read back off `result.derived.joints`.
  assert.match(row, /const cut = result\?\.derived\?\.joints \|\| null;/);
  assert.match(row, /const lit = cut\?\.system && JOINT_CHOICES\.some\(\(c\) => c\.id === cut\.system\) \? cut\.system : 'puzzle';/);
});

// ═══ (j) THE TABLE ═════════════════════════════════════════════════════════

test('F19 · sql/007_tura78.sql: the CHECK constraint carries the five ids and the joints\' rule-owned keys (the app is not the only door)', () => {
  assert.ok(existsSync(`${ROOT}sql/007_tura78.sql`));
  const text = read('sql/007_tura78.sql');
  assert.match(text, /SQL PRZED push/);
  assert.match(text, /alter table public\.cc_company_defaults\s+drop constraint if exists cc_company_defaults_no_rule_keys;/);
  assert.match(text, /add constraint cc_company_defaults_no_rule_keys check \(/);
  assert.match(text, /defaults->>'joints_system' in \('puzzle', 'dowel', 'biscuit', 'cabineo8', 'cabineo12'\)/);
  assert.match(text, /not \(defaults \? 'joints_system'\)/, 'a row without the key is still a row');
  for (const key of JOINT_NUMBER_KEYS) assert.ok(text.includes(`'${key}'`), `${key} is refused by the table too`);
  for (const key of ['hinge_angle', 'hingeAngle', 'angle', 'hinge_count', 'hinge_centres', 'hinge_positions', 'drilling', 'cup_diameter', 'cup_depth']) {
    assert.ok(text.includes(`'${key}'`), `the T22 key ${key} is still refused`);
  }
  assert.match(text, /comment on column public\.cc_company_defaults\.defaults is\s+'[^']*joints_system \(T78: puzzle \| dowel \| biscuit \| cabineo8 \| cabineo12\)/);
  // The migration is named, never run, by the app.
  assert.doesNotMatch(read('src/lib/cloudSync.js'), /create table|alter table|enable row level security/i);
});

// ═══ (k) THE HOUSE LAW ═════════════════════════════════════════════════════

test('F19 · no em or en dash in anything this F wrote', () => {
  // Whole files.
  for (const rel of ['sql/007_tura78.sql', 'test/turn78-f19-joint-choice.test.js', 'src/engine/dowels.js', 'scripts/t78-classify.d/f19.mjs']) {
    assert.doesNotMatch(read(rel), DASH, `${rel} carries a dash`);
  }
  // The T78 blocks of files that are older than the law.
  const cd = read('src/engine/companyDefaults.js');
  for (const [start, end] of [
    ['T78 F19 (CLAUDE.md T78 PART E): THE JOINT SYSTEM', 'joints_system: null,'],
    ['T78 F19 · the five joint systems', 'JOINT_SYSTEM_IDS = Object.freeze('],
    ['T78 F19: the joints\' NUMBERS', '\'joints_angle\','],
    ['T78 F19: THE JOINT SYSTEM, AN ID AND NEVER A NUMBER', 'TURN 30 (CLAUDE.md F5): THE SHELF-PIN SETBACK'],
    ['T78 F19: a row whose only entry', 'if (row.joints_system) return true;'],
    ['T78 F19: the shop\'s joint system', 'joints.system = row.joints_system;'],
  ]) {
    assert.doesNotMatch(segment(cd, start, end, 'companyDefaults.js'), DASH, `companyDefaults.js: the block "${start}" carries a dash`);
  }
  const modal = read('src/components/CompanyDefaultsModal.jsx');
  for (const [start, end] of [
    ['T78 F19 · what the five ids', '};'],
    ['T78 F19 (CLAUDE.md T78 PART E): the owner\'s four joint systems', 'onPick={(v) => setField({ joints_system: v })}'],
  ]) {
    assert.doesNotMatch(segment(modal, start, end, 'CompanyDefaultsModal.jsx'), DASH, `CompanyDefaultsModal.jsx: the block "${start}" carries a dash`);
  }
  const design = read('src/engine/design.js');
  for (const [start, end] of [
    ['T78 F19 (CLAUDE.md T78 PART E): WHICH JOINT SYSTEM', 'joints: { system: null },'],
    ['T78 F19: the joint system, an id or nothing', 'String(d.joints.system).trim().toLowerCase() : null,'],
  ]) {
    assert.doesNotMatch(segment(design, start, end, 'design.js'), DASH, `design.js: the block "${start}" carries a dash`);
  }
  const rp = read('src/components/RightPanel.jsx');
  assert.doesNotMatch(segment(rp, 'T78 F19 / F20 (CLAUDE.md T78 PART E): the owner\'s four systems', '\n}\n', 'RightPanel.jsx'), DASH, 'RightPanel.jsx: the Joints row carries a dash');
  const store = read('src/stores/projectStore.js');
  // T79 F14: the hand-off is one line now (the IIFE that wrote no key went), so the block ends on it.
  assert.doesNotMatch(segment(store, 'T78 F19 (CLAUDE.md T78 PART E): THE JOINT SYSTEM', 'joints_system: resolveJointSystem({ params: p, design, profile }),', 'projectStore.js'), DASH, 'projectStore.js: the hand-off carries a dash');
});
