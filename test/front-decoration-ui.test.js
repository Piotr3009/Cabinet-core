import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FRONT_STYLE_OPTIONS, frontStyleSelection, migrateDesign, normaliseDoorStyle, resolveUnitDesign } from '../src/engine/design.js';
import { buildFrontDecoration, defaultFrontDecoration, newFrontDecoration } from '../src/engine/frontDecoration.js';
import { setFrontTypeCount, settingsSectionSnapshot } from '../src/engine/projectSettings.js';
import { DEFAULT_CABINET_PROFILE } from '../src/engine/profile.js';
import { drawnFrontStyleIds } from '../src/engine/frontStyleArt.js';
import { paramsForEngine, useProjectStore } from '../src/stores/projectStore.js';
// T76 F5 · one state: the line's state is T75's readiness.
import { readinessOf } from '../src/engine/readiness.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();
const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

test('old decorative names acquire no machining by migration or engine input resolution', () => {
  for (const style of ['G', 'GF', 'A', 'AH', 'S', 'F', 'HJ', 'GL']) {
    const design = migrateDesign({ fronts: { style } });
    assert.equal(Object.hasOwn(design.fronts, 'decoration'), false, style);
    assert.equal(Object.hasOwn(resolveUnitDesign({ params: {} }, design), 'frontDecoration'), false, style);
    const unit = { id: 'old', type: 'BUD', params: { width: 600, height: 720, depth: 560 }, position: { x_mm: 0 } };
    assert.equal(Object.hasOwn(paramsForEngine(unit, design), 'front_decoration'), false, style);
  }
});

test('selecting each decorative style stores an explicit recipe that survives a JSON save', () => {
  for (const style of ['G', 'GF', 'A', 'AH', 'FL', 'AM']) {
    const selected = frontStyleSelection(style);
    const design = migrateDesign(JSON.parse(JSON.stringify({ fronts: selected })));
    const resolved = resolveUnitDesign({ params: {} }, design);
    // AMENDED BY T82 F15 (25.10.2026): a NEW choice is born as `newFrontDecoration`
    // makes it, FL with the owner's reeds (*"fluted teraz to sa rowki a ja potrzebuje
    // chmurke"*); every other style's is still `defaultFrontDecoration`, T76's record.
    assert.deepEqual(resolved.frontDecoration, newFrontDecoration(style));
    if (style !== 'FL') assert.deepEqual(resolved.frontDecoration, defaultFrontDecoration(style));
    else assert.equal(resolved.frontDecoration.fluteProfile, 'reed', 'the reeds survive the JSON save');
    assert.equal(resolved.frontDecoration.style, style);
    assert.equal(resolved.frontDecoration.version, 1);
  }
});

test('decoration follows project, worn slot, saved style and unit in order without crossing styles', () => {
  const recipe = (width) => ({ ...defaultFrontDecoration('G'), grooveWidthMm: width });
  const design = migrateDesign({
    fronts: { style: 'G', decoration: recipe(3), types: [{ id: 'f1', style: 'G', decoration: recipe(4) }] },
    doorStyles: [{ id: 's1', frontType: 'G', decoration: recipe(5) }],
  });
  assert.equal(resolveUnitDesign({ params: {} }, design).frontDecoration.grooveWidthMm, 3);
  assert.equal(resolveUnitDesign({ params: { front_type_id: 'f1' } }, design).frontDecoration.grooveWidthMm, 4);
  assert.equal(resolveUnitDesign({ params: { front_type_id: 'f1', door_style_id: 's1' } }, design).frontDecoration.grooveWidthMm, 5);
  assert.equal(resolveUnitDesign({ params: { front_type_id: 'f1', door_style_id: 's1', front_decoration: recipe(7) } }, design).frontDecoration.grooveWidthMm, 7);
  assert.equal(resolveUnitDesign({ params: { front_type: 'F' } }, design).frontDecoration, undefined);
  assert.equal(resolveUnitDesign({ params: { front_type: 'GF' } }, design).frontDecoration, undefined);
  const savedStyle = normaliseDoorStyle({ id: 's2', frontType: 'GF', decoration: recipe(5) });
  assert.equal(Object.hasOwn(savedStyle, 'decoration'), false);
});

test('explicit unit recipe reaches the engine and changing to flat removes the stale recipe', () => {
  const unit = { id: 'own', type: 'BUD', params: { front_type: 'G', front_decoration: defaultFrontDecoration('G') }, position: { x_mm: 0 } };
  assert.deepEqual(paramsForEngine(unit, {}).front_decoration, defaultFrontDecoration('G'));
  unit.params.front_type = 'F';
  assert.equal(Object.hasOwn(paramsForEngine(unit, {}), 'front_decoration'), false);
});

test('a reselected style retains workshop edits and selecting another gets its own recipe', () => {
  const selected = { style: 'G', decoration: { ...defaultFrontDecoration('G'), groovePitchMm: 31 } };
  assert.equal(frontStyleSelection('G', selected).decoration.groovePitchMm, 31);
  // AMENDED BY T82 F15 (25.10.2026): FL is born with the owner's reeds (*"daj wariant b czyli na styk narazie"*).
  assert.deepEqual(frontStyleSelection('FL', selected).decoration, newFrontDecoration('FL'));
  assert.equal(frontStyleSelection('F', selected).decoration, null);
});

test('store changes and serialization retain front recipes at project, slot and saved style levels', () => {
  store().loadProject({ id: null, name: 'Decorative fronts', room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }), design: {} }, []);
  store().setProjectDefaults({ fronts: frontStyleSelection('G') });
  store().setFrontType('f1', { ...frontStyleSelection('FL'), label: 'Fluted fronts' });
  const styleId = store().addDoorStyle({ name: 'Arch', frontType: 'A', decoration: defaultFrontDecoration('A') });
  const saved = JSON.parse(JSON.stringify(store().project));
  store().loadProject(saved, []);
  const design = store().project.design;
  assert.equal(design.fronts.decoration.style, 'G');
  assert.equal(design.fronts.types[0].decoration.style, 'FL');
  assert.equal(design.doorStyles.find((style) => style.id === styleId).decoration.style, 'A');
});

test('new gallery styles all have artwork and the same controls reach PRO and retail', () => {
  for (const id of ['FL', 'AM']) {
    assert.ok(FRONT_STYLE_OPTIONS.some((style) => style.id === id));
    assert.ok(drawnFrontStyleIds().includes(id));
  }
  for (const file of ['src/components/SettingsPanel.jsx', 'src/components/WizardSettings.jsx', 'src/retail/design/Options.jsx']) {
    assert.match(read(file), /<FrontDecorationControls/);
  }
  const controls = read('src/components/FrontDecorationControls.jsx');
  const retail = read('src/retail/design/material/FrontDecorationControls.jsx');
  // T76 F4 · `archRatio` left with the ellipse: the owner's arch is a semicircle.
  for (const control of ['Activate decorative front', 'data-decoration-field', 'grooveDirection', 'fluteDiameterMm']) {
    assert.ok(controls.includes(control));
    assert.ok(retail.includes(control));
  }
});


test('palette edits preserve other slot recipes and decoration edits dirty the settings section', () => {
  const before = [{ id: 'f1', ...frontStyleSelection('G') }, { id: 'f2', ...frontStyleSelection('FL') }];
  const grown = setFrontTypeCount(before, 3, DEFAULT_CABINET_PROFILE);
  assert.deepEqual(grown[0].decoration, before[0].decoration);
  assert.deepEqual(grown[1].decoration, before[1].decoration);
  const original = migrateDesign({ fronts: { style: 'G', decoration: before[0].decoration, types: before } });
  const edited = migrateDesign({ fronts: { ...original.fronts, decoration: { ...before[0].decoration, groovePitchMm: 33 } } });
  assert.notEqual(settingsSectionSnapshot(original, 'fronts'), settingsSectionSnapshot(edited, 'fronts'));

  store().loadProject({ id: null, name: 'Palette', room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }), design: original }, []);
  store().setFrontType('f2', { material_id: 'different-board' });
  assert.deepEqual(store().project.design.fronts.types[0].decoration, before[0].decoration);
  assert.deepEqual(store().project.design.fronts.types[1].decoration, before[1].decoration);
});

test('non-finite recipe input stays invalid after JSON persistence instead of acquiring a cutting default', () => {
  for (const invalid of [NaN, Infinity, -Infinity, null, 'not-a-number', '']) {
    const raw = { fronts: { style: 'G', decoration: { ...defaultFrontDecoration('G'), grooveDepthMm: invalid } } };
    const saved = JSON.parse(JSON.stringify(migrateDesign(raw)));
    const recipe = resolveUnitDesign({ params: {} }, saved).frontDecoration;
    assert.ok(Number.isNaN(recipe.grooveDepthMm));
    const decoration = buildFrontDecoration({ panel: { w: 600, h: 720, thickness: 18 }, config: recipe, style: 'G' });
    assert.equal(decoration.status, 'blocked');
    assert.equal(decoration.problems[0].code, 'FRONT_DECORATION_PARAMETER');
    assert.equal(decoration.operations.length, 0);
    // T76 F5 · the LINE is the slab's: still cut; the refusal is the Check's.
    assert.equal(readinessOf({ id: '01-F', part: 'FRONT', cnc: {}, meta: { frontDecoration: decoration } }), 'cut');
  }
});
