// ─── TURN 70 · F5 — FRONTS: SHEEN, AND MORE THAN ONE COLOUR ────────────────
//
// TWO THINGS, and the second is one of the two decisions CLAUDE.md took for
// the owner and left overturnable in one word.
//
//   *"A SHEEN control sits under the front colour (matt → satin → gloss), the
//   engine's own sheen vocabulary from the profile — read it before writing
//   the control; if PRO has a sheen surface, copy it."*
//
//   *"A design may carry two or three front colours … each colour applied to
//   the fronts the client picks on the stage … Uses the store's existing
//   `setUnitFinish` / `resetUnitFinish` — the per-unit override that has sat
//   unused since T60 — never a second palette law."*
//
// ─── AND PRO'S SHEEN SURFACE IS NOT COPIED, WHICH IS ARGUED, NOT SKIPPED ────
//
// PRO's is `components/SheenSlider.jsx`, an `<input type="range">`. The owner
// ruled on sliders in this room in T61 F5 — *"nie widze sensu [suwaków] bo i
// tak nie trafisz, trzeba bedzie wpisac"* — and retail has had none since. So
// the VOCABULARY, the VALUES and the ONE WRITE PATH are PRO's and the surface
// is retail's chip row. This file asserts all three.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import {
  migrateDesign, projectSheen, sheenLabel, sheenSteps,
} from '../src/engine/design.js';
import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import { describeDesign } from '../src/retail/estimate/document.js';
import * as A from '../src/retail/design/adapter.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const uncomment = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const S = () => useProjectStore.getState();
const U = () => useUiStore.getState();

function room(n = 1) {
  S().newProject();
  S().setRoom({ corners: rectCorners(6000, 3000), height: 2500 });
  const ids = [];
  for (let i = 0; i < n; i += 1) {
    const { id } = S().addUnit('WARDROBE', { params: { width: 900, height: 2200, depth: 600 } });
    // A wardrobe has no FRONT until doors are hung on it — and a front is what
    // this feature paints, so every wardrobe in this file has some.
    A.addDoors(id);
    ids.push(id);
  }
  return ids;
}

const WINE = { hex: '#5B3A45', name: '3005 Wine Red', system: 'RAL' };
const INK = { hex: '#1F2933', name: '9005 Jet Black', system: 'RAL' };

const frontOf = (unitId) => S().unitResult(unitId).panels.find((p) => p.role === 'front');

// ═══ 1 · THE SHEEN — THE ENGINE'S OWN VOCABULARY, NOT RETAIL'S ════════════

test('F5 · the six words are the ENGINE\'s, and every value is one of its own steps', () => {
  const choices = A.sheenChoices();
  assert.deepEqual(choices.map((c) => c.id),
    ['Dead matt', 'Matt', 'Eggshell', 'Satin', 'Semi-gloss', 'Gloss'],
    'retail invented a sheen vocabulary');
  const steps = sheenSteps(P);
  for (const c of choices) {
    assert.ok(steps.includes(c.value), `${c.id} sits at ${c.value} %, which is not a step on the scale`);
    assert.equal(sheenLabel(c.value, P), c.id, `${c.value} % is not what the engine calls ${c.id}`);
  }
  // …and the words run matt → satin → gloss, which is the brief's own order.
  assert.ok(choices[0].value < choices[3].value && choices[3].value < choices[5].value);
});

test('F5 · the chip that is lit is the band the PROJECT is actually in', () => {
  room(1);
  const now = projectSheen(migrateDesign(S().project.design), P);
  assert.equal(A.sheenOf(S().project), sheenLabel(now, P));
  assert.equal(A.sheenPercent(S().project), now);
  assert.equal(A.sheenWords(S().project), `${sheenLabel(now, P)} · ${now} % gloss`);
});

test('F5 · pressing a band writes the ONE field PRO\'s slider writes', () => {
  room(1);
  A.setSheen('Gloss');
  assert.equal(A.sheenOf(S().project), 'Gloss');
  assert.equal(A.sheenPercent(S().project), 100);
  assert.equal(migrateDesign(S().project.design).sheen, 100, 'the design\'s own field did not take it');
  A.setSheen('Dead matt');
  assert.equal(A.sheenPercent(S().project), 10);
});

test('F5 · a project already IN a band is left alone — the number does not creep', () => {
  room(1);
  S().setDesign({ sheen: 60 });
  assert.equal(A.sheenOf(S().project), 'Satin', 'the profile\'s own 60 is a satin');
  A.setSheen('Satin');
  assert.equal(A.sheenPercent(S().project), 60, 'pressing the lit band quietly moved the number');
});

test('F5 · ONE law, two doors — PRO\'s slider is untouched and shares the write', () => {
  const pro = read('src/components/SheenSlider.jsx');
  assert.match(pro, /setDesign\(\{ sheen: Number\(e\.target\.value\) \}\)/, 'PRO\'s sheen surface moved');
  assert.match(uncomment(read('src/retail/design/adapter.js')), /S\(\)\.setDesign\(\{ sheen:/,
    'retail writes the sheen by another road');
  // …and retail did NOT copy the slider, on the owner's own standing ruling.
  const options = read('src/retail/design/Options.jsx');
  assert.doesNotMatch(options, /type="range"/, 'a slider came back into the client\'s room');
  assert.match(options, /testid="fronts-sheen"/, 'there is no sheen control at all');
  // The control stands UNDER the colour, which is where the brief puts it.
  assert.ok(options.indexOf('data-testid="fronts-material"') < options.indexOf('testid="fronts-sheen"'),
    'the sheen row stands above the colour it is about');
});

// ═══ 2 · TWO OR THREE FRONT COLOURS ═══════════════════════════════════════

test('F5 · a fresh design carries ONE colour, and it is ALL FRONTS', () => {
  const [a] = room(1);
  const rows = A.frontColourRows(S().project);
  assert.equal(rows.length, 1, 'a new design already has more than one colour');
  assert.equal(rows[0].label, 'ALL FRONTS');
  assert.equal(rows[0].wearing, 1, 'the wardrobe is not following the project\'s own colour');
  assert.equal(S().units.find((u) => u.id === a).params.front_type_id ?? null, null,
    'a fresh wardrobe carries an override it never asked for');
});

test('F5 · + ADD A SECOND COLOUR / + A THIRD grow the project\'s own type list', () => {
  room(1);
  assert.equal(A.frontTypeCap(), P.projectSettings.maxFrontTypes, 'the cap is not the profile\'s');
  const second = A.addFrontColour();
  assert.equal(second, 'f2');
  assert.equal(A.frontColourRows(S().project).length, 2);
  const third = A.addFrontColour();
  assert.equal(third, 'f3');
  assert.equal(A.frontColourRows(S().project).length, 3);
  // …and the profile's cap is a cap, not a suggestion.
  assert.equal(A.addFrontColour(), '', 'a fourth colour was added past the profile\'s cap');
  assert.equal(A.frontColourRows(S().project).length, A.frontTypeCap());
});

test('F5 · a colour row carries its own colour, through the ONE front setter', () => {
  room(1);
  A.addFrontColour();
  A.setFrontColourFor('f2', WINE);
  const rows = A.frontColourRows(S().project);
  assert.equal(rows[1].colour.hex.toLowerCase(), WINE.hex.toLowerCase(),
    'the second colour did not land on its own type');
  assert.equal(rows[1].source, 'spray', 'a sprayed colour arrived on a board source');
  assert.equal(rows[0].colour?.hex ?? null, null, 'it landed on the FIRST type as well');
});

test('F5 · clicking a front while a colour row is up gives THAT wardrobe the colour', () => {
  const [a, b] = room(2);
  A.addFrontColour();
  A.setFrontColourFor('f2', WINE);

  // A click on the stage is the shared store's own selection.
  U().selectElement(b, frontOf(b).id);
  const said = A.paintFrontOnStage(U().selectedElement, 'f2');
  assert.match(said, /fronts take colour 2/i, 'the paint said nothing');
  assert.equal(S().units.find((u) => u.id === b).params.front_type_id, 'f2');
  assert.equal(S().units.find((u) => u.id === a).params.front_type_id ?? null, null,
    'the other wardrobe was painted too');

  const rows = A.frontColourRows(S().project);
  assert.equal(rows[0].wearing, 1, 'ALL FRONTS lost count of what follows it');
  assert.equal(rows[1].wearing, 1, 'the second colour does not know what wears it');
});

test('F5 · ALL FRONTS is the RESET — the other half of the named pair', () => {
  const [a] = room(1);
  A.addFrontColour();
  U().selectElement(a, frontOf(a).id);
  A.paintFrontOnStage(U().selectedElement, 'f2');
  assert.equal(S().units.find((u) => u.id === a).params.front_type_id, 'f2');

  const said = A.paintFrontOnStage(U().selectedElement, 'f1');
  assert.match(said, /follows the project's own front colour again/);
  assert.equal(S().units.find((u) => u.id === a).params.front_type_id ?? null, null,
    'ALL FRONTS left the override standing');
});

test('F5 · it paints a FRONT and nothing else — a shelf click does not colour a wardrobe', () => {
  const [a] = room(1);
  S().addShelves(a, 2);
  A.addFrontColour();
  const shelf = S().unitResult(a).panels.find((p) => p.part === 'SHELF');
  assert.ok(shelf, 'the wardrobe cut no shelf to click');
  U().selectElement(a, shelf.id);
  assert.equal(A.paintFrontOnStage(U().selectedElement, 'f2'), '', 'a shelf painted the fronts');
  assert.equal(S().units.find((u) => u.id === a).params.front_type_id ?? null, null);
  // …and nothing at all is not a front either.
  assert.equal(A.paintFrontOnStage(null, 'f2'), '');
  assert.equal(A.paintFrontOnStage({ unitId: a, elementRef: 'NO-SUCH-PANEL' }, 'f2'), '');
});

test('F5 · removing a colour takes it off the cabinets FIRST — no unit left pointing at nothing', () => {
  const [a, b] = room(2);
  A.addFrontColour();
  for (const id of [a, b]) {
    U().selectElement(id, frontOf(id).id);
    A.paintFrontOnStage(U().selectedElement, 'f2');
  }
  assert.equal(A.frontColourRows(S().project)[1].wearing, 2);

  const said = A.removeFrontColour('f2');
  assert.match(said, /2 wardrobes went back to the first colour/);
  assert.equal(A.frontColourRows(S().project).length, 1, 'the type list did not shrink');
  for (const id of [a, b]) {
    assert.equal(S().units.find((u) => u.id === id).params.front_type_id ?? null, null,
      'a cabinet is still pointing at a colour that no longer exists');
  }
  // The first colour may never be removed — it is what everything falls back to.
  assert.equal(A.removeFrontColour('f1'), '', 'ALL FRONTS was removed');
  assert.equal(A.frontColourRows(S().project).length, 1);
});

test('F5 · NEVER A SECOND PALETTE LAW — one function writes a cabinet\'s front', () => {
  const adapter = uncomment(read('src/retail/design/adapter.js'));
  assert.equal((adapter.match(/S\(\)\.setUnitFinish\(/g) || []).length, 1);
  assert.equal((adapter.match(/S\(\)\.resetUnitFinish\(/g) || []).length, 1);
  assert.match(adapter, /const writeUnitFront = /);
  // …and the store's pair is exactly what the brief named, unchanged.
  const store = read('src/stores/projectStore.js');
  assert.match(store, /setUnitFinish: \(unitIds, patch\) => \{/);
  assert.match(store, /resetUnitFinish: \(unitIds\) => \{/);
});

// ═══ 3 · THE ESTIMATE AND REVIEW NAME EVERY COLOUR USED ═══════════════════

test('F5 · a one-colour design\'s summary is unchanged — no row reading "none"', () => {
  const [a] = room(1);
  const lines = describeDesign({ project: S().project, units: S().units });
  assert.equal(lines.filter((l) => /^Front finish/.test(l.label)).length, 1,
    'a one-colour design grew a second front-finish row');
  assert.ok(a);
});

test('F5 · …and every colour a cabinet WEARS is named, with the cabinet', () => {
  const [a, b] = room(2);
  A.addFrontColour();
  A.setFrontColourFor('f2', WINE);
  U().selectElement(b, frontOf(b).id);
  A.paintFrontOnStage(U().selectedElement, 'f2');

  const lines = describeDesign({ project: S().project, units: S().units });
  const second = lines.find((l) => l.label === 'Front finish 2');
  assert.ok(second, 'the estimate says nothing about the second colour');
  assert.match(second.value, /3005 Wine Red, sprayed/, 'the colour is not named the way the first one is');
  const num = S().units.find((u) => u.id === b).params.unit_num;
  assert.match(second.value, new RegExp(`on ${num}`), 'it does not say which wardrobe wears it');
  assert.ok(!second.value.includes(S().units.find((u) => u.id === a).params.unit_num),
    'it named a wardrobe that is not wearing it');
});

test('F5 · a colour nobody wears is NOT on the quotation', () => {
  room(1);
  A.addFrontColour();
  A.setFrontColourFor('f2', INK);
  const lines = describeDesign({ project: S().project, units: S().units });
  assert.equal(lines.filter((l) => /^Front finish/.test(l.label)).length, 1,
    'a colour the client added and gave to nothing reached the estimate');
});
