// ─── The new-project flow (turn 7, CLAUDE.md F2 / BACKLOG #41) ───
//
// The flow itself is five screens of React, and what can be checked in node is
// everything underneath them — which is where all the behaviour actually is:
//
//   · the project NUMBER proposal, which has to survive a workshop's own
//     numbering format rather than imposing one;
//   · SAVED SETTINGS SETS, a new stored thing: a complete set of project design
//     settings under a name, applied to a job without dragging that job's own
//     identity along with it;
//   · what a PROJECT TYPE actually decides — a Library category, a scope hint,
//     and the heights the job starts at, all of them starting points;
//   · the JOINERY system, and the fact that its preview is derived from the
//     profile rather than drawn by hand;
//   · the JoineryCore badge, which is a function of the material data and not a
//     flag anybody sets.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { memoryStorage, nextProjectNumber, listLocalProjects, saveLocalProject } from '../src/lib/projectLibrary.js';
import {
  applySettingsSet, deleteSettingsSet, listSettingsSets, loadSettingsSet,
  normaliseSetName, renameSettingsSet, saveSettingsSet,
} from '../src/lib/settingsSets.js';
import {
  DEFAULT_PROJECT_TYPE, PROJECT_TYPES, getProjectType, heightOverridesFor,
  heightsForProjectType, normaliseScope,
} from '../src/engine/projectTypes.js';
import { migrateDesign, projectHeights, resolveJoinery } from '../src/engine/design.js';
import { puzzlePreview } from '../src/engine/puzzle.js';
import { UNIT_CATEGORIES } from '../src/engine/types.js';
import { isJcMaterial, materialBadge, materialSlotState } from '../src/stores/materialAssignmentStore.js';

const shelf = (numbers = []) => {
  const storage = memoryStorage();
  numbers.forEach((number, i) => saveLocalProject(storage, {
    project: { id: `loc_${i}`, name: `Job ${i}`, number },
    units: [],
    at: 1000 + i,
  }));
  return storage;
};

// ─── the project number ─────────────────────────────────────────────────────

test('the first project on an empty shelf gets the seed, not a guess', () => {
  assert.equal(nextProjectNumber(memoryStorage()), '0001');
  assert.equal(nextProjectNumber(memoryStorage(), { seed: '2601' }), '2601');
});

test('the proposal counts on in the workshop’s OWN format, whatever that is', () => {
  // Plain digits, and the padding is kept: 0009 → 0010, not 10.
  assert.equal(nextProjectNumber(shelf(['0008', '0009'])), '0010');
  // A prefix is left alone.
  assert.equal(nextProjectNumber(shelf(['K-118'])), 'K-119');
  // …and so is everything before the LAST run of digits.
  assert.equal(nextProjectNumber(shelf(['2026/09'])), '2026/10');
  // The highest wins, not the most recently saved.
  assert.equal(nextProjectNumber(shelf(['0042', '0007'])), '0043');
});

test('a number nobody can parse does not derail the sequence', () => {
  assert.equal(nextProjectNumber(shelf(['0004', 'the smiths'])), '0005',
    'the unparseable row is skipped, not corrected and not crashed on');
  assert.equal(nextProjectNumber(shelf(['the smiths'])), '0001', 'and with nothing to count from, the seed');
});

test('a project’s number and client are on the shelf row, not only inside it', () => {
  const storage = shelf([]);
  saveLocalProject(storage, {
    project: { id: 'loc_x', name: 'Hampstead kitchen', number: '2601', client: 'Mrs Okafor' },
    units: [],
    at: 5,
  });
  const row = listLocalProjects(storage).find((p) => p.id === 'loc_x');
  assert.equal(row.number, '2601', 'so the start screen can show it without opening every project');
  assert.equal(row.client, 'Mrs Okafor');
});

// ─── saved settings sets ────────────────────────────────────────────────────

const designWith = (patch) => migrateDesign({
  carcass: { types: [{ id: 'c1', label: 'Carcass 1', material_id: 'mat_mfc18_oak', finish_id: 'light_oak' }] },
  fronts: { style: 'F' },
  infill: { sideWidth: 35 },
  heights: { base: 600, tall: 2400 },
  joinery: 'dogbone',
  ...patch,
});

test('a set is the WHOLE design, saved under a name', () => {
  const storage = memoryStorage();
  const { set, replaced } = saveSettingsSet(storage, { name: 'Standard kitchen', design: designWith({}), at: 10 });
  assert.equal(replaced, false);
  assert.equal(set.name, 'Standard kitchen');

  const back = loadSettingsSet(storage, set.id);
  assert.equal(back.design.fronts.style, 'F', 'the front style came back');
  assert.equal(back.design.infill.sideWidth, 35, '…and the infill width');
  assert.equal(back.design.heights.base, 600, '…and the heights, which is the half a subset would have dropped');
  assert.equal(back.design.carcass.types[0].finish_id, 'light_oak');
});

test('saving the same NAME twice replaces it — a library of near-duplicates is a library nobody uses', () => {
  const storage = memoryStorage();
  saveSettingsSet(storage, { name: 'Standard kitchen', design: designWith({}), at: 10 });
  const second = saveSettingsSet(storage, {
    name: 'standard KITCHEN', design: designWith({ infill: { sideWidth: 12 } }), at: 20,
  });
  assert.equal(second.replaced, true, 'matched case-insensitively, which is how a person types a name twice');
  assert.equal(listSettingsSets(storage).length, 1);
  assert.equal(loadSettingsSet(storage, second.set.id).design.infill.sideWidth, 12);
});

test('an unnamed set is refused a blank name, because a blank name cannot be picked again', () => {
  assert.equal(normaliseSetName('   '), 'Untitled settings');
  assert.equal(normaliseSetName('  Contract spec '), 'Contract spec');
});

test('applying a set brings the way you BUILD, and leaves the job its own identity', () => {
  const set = { design: designWith({ projectType: 'kitchen', scope: 'room' }) };
  const project = migrateDesign({ projectType: 'vanity', scope: 'wall', infill: { sideWidth: 0 } });

  const applied = applySettingsSet(project, set);
  assert.equal(applied.infill.sideWidth, 35, 'the settings came across');
  assert.equal(applied.fronts.style, 'F');
  assert.equal(applied.projectType, 'vanity', 'but the job is still a vanity');
  assert.equal(applied.scope, 'wall', '…on one wall');
});

test('a set survives rename and delete, and a missing one answers null instead of throwing', () => {
  const storage = memoryStorage();
  const { set } = saveSettingsSet(storage, { name: 'Contract spec', design: designWith({}), at: 1 });
  assert.equal(renameSettingsSet(storage, set.id, 'Contract spec 2026'), true);
  assert.equal(listSettingsSets(storage)[0].name, 'Contract spec 2026');
  assert.equal(loadSettingsSet(storage, 'set_nope'), null);
  assert.equal(deleteSettingsSet(storage, set.id), true);
  assert.deepEqual(listSettingsSets(storage), []);
  assert.equal(deleteSettingsSet(storage, set.id), false);
});

test('a corrupted shelf is an empty shelf, not a crash on boot', () => {
  const storage = memoryStorage({ 'cc.settingsSets.v1': '{{{not json' });
  assert.deepEqual(listSettingsSets(storage), []);
});

// ─── the project type ───────────────────────────────────────────────────────

test('there are eight types, and every one of them opens a Library category that exists', () => {
  assert.equal(PROJECT_TYPES.length, 8);
  const categories = new Set(UNIT_CATEGORIES.map((c) => c.id));
  for (const t of PROJECT_TYPES) {
    assert.ok(categories.has(t.category), `${t.id} opens the ${t.category} category, and it exists`);
    assert.ok(['room', 'wall'].includes(t.scope), `${t.id} suggests a scope`);
    assert.ok(t.label && t.hint, `${t.id} says what it is`);
  }
  assert.equal(getProjectType('nonsense').id, DEFAULT_PROJECT_TYPE, 'an unknown type falls back, it does not throw');
  assert.equal(normaliseScope('nonsense'), 'room');
  assert.equal(normaliseScope('wall'), 'wall');
});

test('a vanity suggests one wall — which is the example CLAUDE.md gives', () => {
  assert.equal(getProjectType('vanity').scope, 'wall');
  assert.equal(getProjectType('kitchen').scope, 'room');
});

test('a kitchen IS the standard, so it changes no heights; the two that differ say why', () => {
  const standard = projectHeights(null, P);
  assert.deepEqual(heightOverridesFor('kitchen', P), {},
    'the profile heights ARE the kitchen — overriding them here would be two sources for one number');
  assert.deepEqual(heightsForProjectType('kitchen', P), standard);

  // ─── T50-F13: A WARDROBE IS THE STANDARD TOO, NOW ───────────────────────
  // This row said `{ tall: 2400 }` and made a third default height for one
  // cabinet (2400 here, 2100 in the wizard's own seed, 2150 in the profile).
  // The owner: *"default wysokości szaf 2150."*  So a wardrobe overrides
  // nothing and takes the project's own tall height, which IS 2150.
  assert.deepEqual(heightOverridesFor('wardrobe', P), {}, 'nothing of its own any more');
  assert.equal(heightsForProjectType('wardrobe', P).tall, standard.tall);
  assert.equal(heightsForProjectType('wardrobe', P).tall, 2150, 'his own number');
  assert.equal(heightsForProjectType('wardrobe', P).base, standard.base, 'and nothing else moves with it');
  // The MECHANISM is untouched — a workshop that really does build 2400
  // wardrobes puts one number back and nothing else changes.
  assert.equal(
    heightsForProjectType('wardrobe', { ...P, projectTypes: { ...P.projectTypes, wardrobe: { heights: { tall: 2400 } } } }).tall,
    2400,
  );
  assert.equal(heightsForProjectType('vanity', P).base, P.projectTypes.vanity.heights.base);
  assert.ok(heightsForProjectType('vanity', P).base < standard.base, 'a basin is lower than a worktop');
});

test('every height a type resolves is a real number a unit could be built to', () => {
  for (const t of PROJECT_TYPES) {
    const heights = heightsForProjectType(t.id, P);
    for (const [key, value] of Object.entries(heights)) {
      assert.ok(value >= P.projectHeights.min && value <= P.projectHeights.max,
        `${t.id}.${key} = ${value} is inside what a project height may be`);
    }
  }
});

// ─── the design object ──────────────────────────────────────────────────────

test('a project saved before turn 7 opens with no type, one wall’s worth of nothing changed', () => {
  const old = migrateDesign({ fronts: { style: 'F' } });
  assert.equal(old.projectType, null, 'it never went through the flow, and does not pretend it did');
  assert.equal(old.scope, 'room');
  assert.equal(old.joinery, null);
  assert.equal(old.fronts.style, 'F', 'and everything it DID carry is untouched');
});

test('the joinery system resolves, and an unknown one falls back instead of rendering nothing', () => {
  assert.equal(resolveJoinery(null, P).id, P.joinery.defaultType);
  assert.equal(resolveJoinery(migrateDesign({ joinery: 'dogbone' }), P).id, 'dogbone');
  assert.equal(resolveJoinery(migrateDesign({ joinery: 'dovetail-2030' }), P).id, P.joinery.types[0].id,
    'a system this install has never heard of falls back, the same way a removed decor does');
});

test('the joinery preview is DERIVED from the profile, not drawn by hand', () => {
  const preview = puzzlePreview(P);
  assert.ok(preview.outline.length > 4, 'the outline has a tab in it, not just four corners');

  // Every number in it traces back to profile.puzzle. Change the profile and
  // the picture changes — which is the only way a preview stays true.
  const wide = puzzlePreview({ ...P, puzzle: { ...P.puzzle, tabHalfWidth: P.puzzle.tabHalfWidth * 2 } });
  const spread = (p) => Math.max(...p.outline.map(([, y]) => y)) - Math.min(...p.outline.map(([, y]) => y));
  assert.ok(spread(wide) >= spread(preview), 'a wider tab draws a wider tab');

  assert.equal(preview.holes.length, 2, 'the socket’s two holes');
  assert.equal(preview.holes[0].d, P.puzzle.socketHoleDiameter);
  assert.equal(
    Number((preview.socket.y2 - preview.socket.y1).toFixed(6)),
    P.puzzle.socketHalfWidth * 2,
    'the pocket is the profile’s socket, at its own size',
  );
});

// ─── the JoineryCore half ───────────────────────────────────────────────────

test('the JC badge is a function of the material, not a flag somebody sets', () => {
  assert.equal(isJcMaterial({ id: 'mat_1' }), false);
  assert.equal(isJcMaterial({ id: 'mat_1', jc_uuid: 'a-b-c' }), true);
  assert.equal(isJcMaterial({ id: 'mat_1', source: 'jc' }), true);
  assert.equal(materialBadge({ jc_uuid: 'x' }), 'JC');
  assert.equal(materialBadge({}), null);
  assert.equal(materialBadge(null), null);
});

test('a slot with nothing behind it is what turns the section into "Not assigned"', () => {
  const materials = [
    { id: 'mat_own', name: 'MFC White 18 mm', category: 'board' },
    { id: 'mat_jc', name: 'Egger W980 18 mm', category: 'board', jc_uuid: 'stock-1' },
  ];
  const state = materialSlotState([
    { id: 'c1', label: 'Carcass 1', material_id: 'mat_jc' },
    { id: 'c2', label: 'Carcass 2', material_id: 'mat_own' },
    { id: 'c3', label: 'Carcass 3', material_id: null },
  ], materials);

  assert.equal(state.assigned.length, 2);
  assert.equal(state.missing.length, 1);
  assert.equal(state.missing[0].label, 'Carcass 3');
  assert.equal(state.fromJc, 1, 'one of them came from JoineryCore, and the tile says so');
  assert.equal(state.rows[0].badge, 'JC');
  assert.equal(state.rows[1].badge, null);

  // A material_id pointing at something that is no longer in the list reads as
  // unassigned rather than as a tile with no name.
  assert.equal(materialSlotState([{ id: 'c1', material_id: 'gone' }], materials).missing.length, 1);
});