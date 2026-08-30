import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  SCENE_LIGHT_MAX, SCENE_LIGHT_MIN, migrateSceneLight, sceneLightScale,
} from '../src/engine/lighting.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { ledIconsOn } from '../src/stores/uiStore.js';

// ─── T54 · F5 — THE LED ICONS SHOW WHILE LIGHTING IS OPEN, AND THE ROOM
// LIGHT LIVES UNDER THEM ────────────────────────────────────────────────────
//
// The owner: *"po otwarciu modalu Lighting ikony LED mają być widoczne — nie
// dodajesz nic do szaf. teraz jak nie naciśniesz szafy to nie widać ikon
// left LED / right LED i ludzie nie wiedzą, że takie funkcje istnieją.
// żadnego nowego modalu."* And: *"ustawienie światła pokoju, czyli sceny,
// poniżej LED."*
//
// DECISIONS TAKEN for the owner, veto in one line each:
//   · the icons ride `useScreenScale`, the house constant-pixel clamp
//     (veto: "bez clampa");
//   · the scene light lives BESIDE `design` on the project, like the T51
//     rig, because `migrateLighting`'s whitelist would drop it inside.

const store = () => useProjectStore.getState();
const icons = readFileSync(new URL('../src/3d/LedIcons.jsx', import.meta.url), 'utf8');
const unitView = readFileSync(new URL('../src/3d/UnitView.jsx', import.meta.url), 'utf8');
const scene = readFileSync(new URL('../src/3d/Scene.jsx', import.meta.url), 'utf8');
const panel = readFileSync(new URL('../src/components/LightingPanel.jsx', import.meta.url), 'utf8');

test('F5.1 · the icons exist on EVERY unit while the panel is open', () => {
  // ─── AMENDED IN TURN 58 (F4), with the quote — the house rule for a
  // guard whose claim has been overruled ────────────────────────────────────
  //
  // This asserted the GATE, line for line:
  //
  //     assert.match(icons, /const lightingOpen = useUiStore\(\(s\) =>
  //       s\.modal === 'lighting'\);/);
  //     assert.match(icons, /if \(!lightingOpen\) return null;/);
  //
  // OVERRULED, and by name: turn 58's second licensed deletion takes that gate
  // out of the component. What is overruled is the "AND ONLY THEN" — a modal
  // being open is not a way of looking at a cabinet, so the icons could be
  // learnt but never kept on while working.
  //
  // WHAT THIS TEST WAS FOR IS NOT OVERRULED and is asserted harder than
  // before: opening the Lighting panel STILL shows the icons on every unit,
  // which is the owner's *"ludzie nie wiedzą, że takie funkcje istnieją"*.
  // It is now a rule with one home (`uiStore.ledIconsOn`) rather than a gate
  // inside a sprite, so it is asked of the law and not of the file.
  assert.equal(ledIconsOn({ ledIcons: false, modal: 'lighting' }), true,
    'the panel still brings them out — T54-F5\'s whole purpose, kept');
  assert.equal(ledIconsOn({ ledIcons: false, modal: null }), false,
    'and a joiner who has not asked for them still sees yesterday\'s scene');
  assert.match(icons, /useUiStore\(ledIconsOn\)/, 'one reading, and it is the law\'s');
  // No selected-unit gate anywhere in the component: visible on every unit.
  // (The word appears in the header PROSE naming the fault; the assertion is
  // about the code — no read of the selection state exists.)
  assert.doesNotMatch(icons, /selectedUnitId|s\.selected|props\.selected/);
  // The click writes the very item the panel's own buttons write.
  assert.match(icons, /addLightingItem\(\{ unitId: unit\.id, kind: 'side', ref: side \}\);/);
  assert.match(icons, /removeLightingItem\(has\.id\);/);
  // Pure UI: helpers, never a render or a shadow.
  assert.match(icons, /userData=\{\{ ccHelper: true \}\}/);
  // Mounted per unit in the scene, beside the strips, NOT behind a selection.
  assert.match(unitView, /<LedIcons unit=\{unit\} W=\{W\} H=\{H\} D=\{D\} \/>/);
});

test('F5.2 · legibility at distance: the icon rides the house pixel clamp (veto: "bez clampa")', () => {
  assert.match(icons, /import \{ useScreenScale \} from '\.\/DimLabel\.jsx';/);
  assert.match(icons, /useScreenScale\(hover \? 26 : 22, /,
    'a constant pixel height, whatever the camera does');
});

test('F5.3 · the scene light: one slider, 0.4×–1.5×, default today\'s 1.0', () => {
  assert.equal(SCENE_LIGHT_MIN, 0.4);
  assert.equal(SCENE_LIGHT_MAX, 1.5);
  assert.equal(sceneLightScale(undefined), 1, 'nothing said is today\'s picture');
  assert.equal(sceneLightScale(0.1), 0.4, 'clamped below');
  assert.equal(sceneLightScale(9), 1.5, 'clamped above');
  assert.equal(sceneLightScale('nonsense'), 1, 'nonsense is the default, never black');
  assert.deepEqual(migrateSceneLight(null), { scale: 1 });
  assert.deepEqual(migrateSceneLight({ scale: 0.7, junk: true }), { scale: 0.7 },
    'the record is normalised — one key, clamped');
});

test('F5.3 · the slider is in the SAME panel, under the LED controls, and the store carries it', () => {
  assert.match(panel, /data-scene-light="1"/);
  assert.match(panel, /data-scene-light-slider="1"/);
  assert.match(panel, /min=\{SCENE_LIGHT_MIN\}/);
  assert.match(panel, /max=\{SCENE_LIGHT_MAX\}/);
  // Under the LED controls: the section sits after the placement tools and
  // before the Placed list.
  const at = panel.indexOf('data-scene-light="1"');
  assert.ok(at > panel.indexOf('data-lighting-add-side'), 'below the LED buttons');
  assert.ok(at < panel.indexOf('what is placed'), 'above the Placed list');
  // The store: a per-project record with a clamping patch setter.
  const ROOM = migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) });
  store().loadProject({
    id: null, name: 'F5', number: '54', client: 'the owner', room: ROOM, design: {},
  }, []);
  assert.deepEqual(store().project.sceneLight, { scale: 1 }, 'a job saved before tonight opens at 1.0');
  store().setSceneLight({ scale: 1.3 });
  assert.deepEqual(store().project.sceneLight, { scale: 1.3 });
  store().setSceneLight({ scale: 99 });
  assert.deepEqual(store().project.sceneLight, { scale: 1.5 }, 'the setter clamps');
});

test('F5.3 · THE IRON RULE (24.08), asserted: exports ignore the slider — the fixed rig only', () => {
  // The multiplier rides `lamp()` — the LIVE half — and never `fixed()`.
  assert.match(scene,
    /const lamp = \(id\) => lampGain\(rig, id\) \* \(Number\(sceneScale\) > 0 \? Number\(sceneScale\) : 1\);/);
  assert.match(scene, /const fixed = \(id\) => exportGain\(profile, id\);/,
    'the export half reads the profile and nothing else');
  // Not ONE export stamp mentions the scene scale: the parameters the capture
  // swaps in are byte-equal across every slider position, by construction.
  const stamps = [...scene.matchAll(/ccExportIntensity:[^,}]*/g)].map((m) => m[0]);
  assert.ok(stamps.length >= 6, 'the six stamped lamps are still stamped');
  for (const s of stamps) {
    assert.doesNotMatch(s, /sceneScale|sceneLight/, `a stamp stays fixed: ${s}`);
  }
  // …and the unswitchable base lights (ambient, hemisphere, rim) do not read
  // the scale either — they are the export's own base light too.
  assert.doesNotMatch(scene, /studio\.ambient \* gain \* [a-z]*[sS]cene/,
    'the ambient is the room\'s base, in the editor and in a still');
});
