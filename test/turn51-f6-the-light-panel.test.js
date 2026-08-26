// ─── T51 · F6 — THE LIGHT PANEL, BUILT LIKE A ROOM ──────────────────────────
//
// The owner, 26.08.2026:
//
//   *"robimy w Light coś na wzór pokoju, czyli lewa ściana, sufit i prawa
//   ściana, i wtedy włącz/wyłącz światło poszczególną lampę."*
//
// Four lamps — ceiling, left wall, right wall, facing — each with an ON/OFF and
// a strength. NOTHING IS INVENTED: the panel drives the rig that is already
// there, and `engine/lightRig.js` is the mapping.
//
// The two decisions taken FOR him at the top of CLAUDE.md are asserted here as
// well, because they are the two a later turn is most likely to undo by
// accident:
//
//   1. the settings live WITH THE PROJECT;
//   2. a lamp has ON/OFF and a strength and does NOT slide along its wall.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  EXPORT_NOTICE, PRESET_IDS, RIG_LAMPS, RIG_PRESETS,
  defaultLightRig, exportGain, lampGain, matchesPreset, migrateLightRig, rigFromPreset,
} from '../src/engine/lightRig.js';
import { getCabinetProfile } from '../src/engine/profile.js';

const P = getCabinetProfile();
const read = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');
const SCENE = read('3d/Scene.jsx');
const CAPTURE = read('3d/renderCapture.js');
const PANEL = read('components/LightingPanel.jsx');
const STORE = read('stores/projectStore.js');

// ─── the model: a room with four sides ─────────────────────────────────────

test('F6 — four lamps, in the order you meet them standing in the room', () => {
  assert.deepEqual(RIG_LAMPS, ['ceiling', 'leftWall', 'rightWall', 'facing']);
});

test('F6 — a lamp is an ON/OFF and a strength, and NOTHING ELSE (decision 2)', () => {
  // *"A lamp has ON/OFF and a strength, and does not slide along its wall.
  // Position stays the rig's arithmetic."*
  const rig = defaultLightRig(P);
  for (const id of RIG_LAMPS) {
    assert.deepEqual(Object.keys(rig.lamps[id]).sort(), ['on', 'strength'],
      `${id} carries two fields — a third would be a slide`);
  }
  assert.doesNotMatch(JSON.stringify(rig), /x_mm|position|offset/i);
});

test('F6 — off is 0, on is its strength, and one function answers', () => {
  const rig = migrateLightRig({ lamps: { ceiling: { on: true, strength: 1.4 }, facing: { on: false, strength: 2 } } });
  assert.equal(lampGain(rig, 'ceiling'), 1.4);
  assert.equal(lampGain(rig, 'facing'), 0, 'off is off, whatever the slider says');
});

test('F6 — a strength is clamped, and nonsense takes the default', () => {
  assert.equal(migrateLightRig({ lamps: { ceiling: { strength: 99 } } }).lamps.ceiling.strength, 2);
  assert.equal(migrateLightRig({ lamps: { ceiling: { strength: -5 } } }).lamps.ceiling.strength, 0);
  assert.equal(migrateLightRig({ lamps: { ceiling: { strength: 'nonsense' } } }).lamps.ceiling.strength, 1);
  assert.equal(migrateLightRig(null).lamps.ceiling.strength, 1);
});

// ─── nothing gets brighter by default ──────────────────────────────────────

test('F6 — the DEFAULT is the rig as it ships: one pillar, on the right', () => {
  // The scene builds BOTH pillars now, so both switches have a lamp behind
  // them. Which of them is LIT is this, and it reads the very same profile keys
  // the scene used to read — so a project nobody has touched is lit by exactly
  // the lamps it was lit by before the panel existed.
  const rig = defaultLightRig(P);
  assert.equal(P.appearance.studio.pillars.count, 1, 'the profile still ships one');
  assert.equal(P.appearance.studio.pillars.side, 'right');
  assert.equal(rig.lamps.rightWall.on, true);
  assert.equal(rig.lamps.leftWall.on, false);
  assert.equal(rig.lamps.ceiling.on, true);
  assert.equal(rig.lamps.facing.on, true);
  assert.ok(RIG_LAMPS.every((id) => rig.lamps[id].strength === 1), 'and nothing is turned up');
});

test('F6 — a workshop that has set TWO pillars gets both switches on', () => {
  const both = { appearance: { studio: { pillars: { count: 2 } } } };
  const rig = defaultLightRig(both);
  assert.equal(rig.lamps.leftWall.on, true);
  assert.equal(rig.lamps.rightWall.on, true);
  // …and one that has moved the single pillar to the left gets the left.
  const left = { appearance: { studio: { pillars: { count: 1, side: 'left' } } } };
  assert.equal(defaultLightRig(left).lamps.leftWall.on, true);
  assert.equal(defaultLightRig(left).lamps.rightWall.on, false);
});

// ─── the presets ───────────────────────────────────────────────────────────

test('F6 — the four presets CLAUDE.md names, and Showroom is the shipped rig', () => {
  assert.deepEqual(PRESET_IDS, ['showroom', 'bright', 'moody', 'neutral']);
  const showroom = rigFromPreset('showroom');
  assert.ok(RIG_LAMPS.every((id) => showroom.lamps[id].strength === 1),
    'a starting point, not a fifth rig');
  assert.equal(matchesPreset(showroom), true);
});

test('F6 — NEUTRAL is flat: the raking walls are off, for judging a colour', () => {
  // A pillar rakes a gloss front at a grazing angle ON PURPOSE (Fresnel), which
  // is exactly what you do not want when the question is "is this the right
  // white".
  const n = rigFromPreset('neutral');
  assert.equal(n.lamps.leftWall.on, false);
  assert.equal(n.lamps.rightWall.on, false);
  assert.equal(n.lamps.ceiling.on, true);
  assert.equal(n.lamps.facing.on, true);
  assert.match(RIG_PRESETS.neutral.hint, /judging a colour/);
});

test('F6 — a tuned rig stops matching its preset, and the panel can say so', () => {
  const tuned = migrateLightRig({ ...rigFromPreset('moody'), lamps: { ...rigFromPreset('moody').lamps, ceiling: { on: true, strength: 1.9 } } });
  assert.equal(matchesPreset(tuned), false);
  assert.equal(matchesPreset(rigFromPreset('moody')), true);
});

// ─── THE EXPORT IGNORES THE PANEL ──────────────────────────────────────────

test('F6 — the export rig does not move, whatever the switches say', () => {
  // *"A client compares a render against an Egger sample, and two renders of
  // the same decor must not differ because somebody flipped a lamp."*
  const before = RIG_LAMPS.map((id) => exportGain(P, id));
  // Nothing about the export takes a rig at all — it takes the PROFILE, which
  // is what makes this true by construction rather than by care.
  assert.deepEqual(before, [1, 0, 1, 1], 'every lamp the profile has, at 1');
  assert.equal(exportGain.length, 2, 'profile and lamp — there is no rig argument to pass');
});

test('F6 — and the capture SWAPS to it, on the light itself', () => {
  assert.match(CAPTURE, /const fixed = object\.userData\?\.ccExportIntensity;/);
  assert.match(CAPTURE, /object\.intensity = Number\(fixed\);/);
  assert.match(CAPTURE, /undo\(\(\) => \{ object\.intensity = prev; \}\);/);
  // Every lamp the panel can reach carries the stamp…
  for (const re of [
    /ccExportIntensity: \(studio\.band\?\.intensity \?\? 2\.2\) \* gain \* fixed\('ceiling'\)/,
    /ccExportIntensity: studio\.key \* gain \* fixed\('facing'\)/,
    /ccExportIntensity: studio\.fill \* gain \* fixed\('facing'\)/,
    /ccExportIntensity: s\.intensity \* balance\.spotScale \* gain \* fixed\('facing'\)/,
    /ccExportIntensity: balance\.ceiling\.intensity \* gain \* fixed\('ceiling'\)/,
    /exportIntensity=\{\(studio\.pillars\?\.intensity \?\? 22\) \* gain \* fixed\(p\.lamp\)\}/,
  ]) assert.match(SCENE, re, `a panel lamp carries no export number: ${re}`);
  // …and the ones it cannot reach carry none, because they never change.
  assert.match(SCENE, /userData=\{\{ ccLight: 'ambient' \}\}/);
  assert.match(SCENE, /userData=\{\{ ccLight: 'rim' \}\}/);
});

test('F6 — and the panel SAYS so, in one line', () => {
  assert.match(EXPORT_NOTICE, /ignore these switches/i);
  assert.match(EXPORT_NOTICE, /one fixed rig/i);
  assert.match(PANEL, /data-light-export-note="1"/);
  assert.match(PANEL, /\{EXPORT_NOTICE\}/);
});

// ─── decision 1: the settings live with the project ────────────────────────

test('F6 — the rig is PROJECT data, saved and migrated like every other record', () => {
  assert.match(STORE, /lightRig: migrateLightRig\(cached\.project\.lightRig\)/, 'restored from the cache');
  assert.match(STORE, /lightRig: project\?\.lightRig/, 'and from a saved job');
  assert.match(STORE, /setLightRig: \(patch\) => set\(\(s\) => \{/, 'a patch setter, like setLedSpec');
  // A job saved before tonight has none and opens on the rig it was drawn
  // under, which is the default rather than an empty one.
  assert.match(STORE, /: defaultLightRig\(getCabinetProfile\(\)\)/);
  // …and it is NOT in the profile, which is what "with the project" means.
  assert.doesNotMatch(read('engine/profile.js'), /lightRig/);
});

test('F6 — the panel reads and writes exactly there', () => {
  assert.match(PANEL, /const storedRig = useProjectStore\(\(s\) => s\.project\.lightRig\);/);
  assert.match(PANEL, /const setLightRig = useProjectStore\(\(s\) => s\.setLightRig\);/);
  // Four switches, four strengths, four presets, and the hooks a walk clicks.
  assert.match(PANEL, /data-light-switch=\{id\}/);
  assert.match(PANEL, /data-light-strength=\{id\}/);
  assert.match(PANEL, /data-light-preset=\{id\}/);
});
