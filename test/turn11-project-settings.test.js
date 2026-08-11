// ─── Turn 11, CLAUDE.md F9: the project's own settings ──────────────────────
//
// Step 5 of the new-project flow is where a workshop says how it builds THIS
// job: the heights and the depth every unit starts at, what the carcasses and
// the fronts are made of, which variant of each piece of ironmongery is fitted,
// and how thick the board is.
//
// All of it is DESIGN-layer and reaches the engine as INPUTS. The assertion that
// matters most is the last one in this file: a bare `computeCabinet()` with none
// of it set still cuts exactly what the AutoLISP kit cuts.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { DEFAULT_DESIGN, migrateDesign, projectHeights } from '../src/engine/design.js';
import {
  carcassSources, frontSources, hardwareChoices, hardwareVariant, normaliseFrontTypes,
  projectBoardThickness, projectDepth, projectDimensions, projectFrontThickness,
  setFrontTypeCount, sourceById, thicknessForSource,
} from '../src/engine/projectSettings.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { useProjectStore, paramsForEngine } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();
const unitOf = (id) => store().units.find((u) => u.id === id);

function project(design = {}) {
  store().loadProject({
    id: null, name: 't11', room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }), design,
  }, []);
}

// ─── F9.1: the five default dimensions ──────────────────────────────────────

test('step 5 asks for exactly the five dimensions CLAUDE.md names', () => {
  const design = migrateDesign(null);
  const dims = projectDimensions(design, P, projectHeights(design, P));
  assert.deepEqual(dims.map((d) => d.key), ['base', 'depth', 'tall', 'wall', 'toeKick']);
  // Pre-filled from the profile — "the UK numbers stand".
  assert.equal(dims.find((d) => d.key === 'base').value, P.projectHeights.base);
  assert.equal(dims.find((d) => d.key === 'tall').value, P.projectHeights.tall);
  assert.equal(dims.find((d) => d.key === 'wall').value, P.projectHeights.wall);
  assert.equal(dims.find((d) => d.key === 'toeKick').value, P.projectHeights.toeKick);
  assert.equal(dims.find((d) => d.key === 'depth').value, P.baseUnit.defaults.depth);
});

test('the project depth is ONE number for every standing unit', () => {
  project();
  store().setProjectDefaults({ depth: 600 });
  assert.equal(projectDepth(migrateDesign(store().project.design), P), 600);

  for (const type of ['BUD', 'BUDTALL', 'WARDROBE']) {
    const { id } = store().addUnit(type);
    assert.equal(unitOf(id).params.depth, 600, `${type} takes the project depth`);
  }
  // …but a WALL unit keeps its own: 400 is what a wall unit IS, and a 600 mm one
  // over a worktop is a cabinet you walk into.
  const { id } = store().addUnit('WUD');
  assert.equal(unitOf(id).params.depth, P.wallUnit.defaults.depth);
});

// ─── F9.2: three material sections ──────────────────────────────────────────

test('a carcass comes from EGGER decor, the spray booth — or, since turn 15, veneer', () => {
  const ids = carcassSources(P).map((s) => s.id);
  // Turn 15 (CLAUDE.md F3.3): "Carcasses gain the Veneer source — a third
  // button beside `EGGER decor | Sprayed`, wired to the same veneer collection".
  assert.deepEqual(ids, ['egger', 'sprayed', 'veneer']);
  // "yes, carcasses can be sprayed" — CLAUDE.md F9.2, in as many words.
  assert.equal(sourceById(carcassSources(P), 'sprayed').kind, 'spray');
  // …and 19 mm is PINNED by the source, exactly as EGGER's 18 is.
  assert.equal(sourceById(carcassSources(P), 'veneer').thickness, 19);
  assert.equal(sourceById(carcassSources(P), 'egger').thickness, 18);
});

test('a front comes from one of the FOUR sources — spray is one, not two (owner 09.08)', () => {
  // RAL vs Farrow & Ball is the colour PICKER's question; the source is just
  // "sprayed". Two buttons made one finish look like two.
  const ids = frontSources(P).map((s) => s.id);
  assert.deepEqual(ids, ['spray', 'veneer', 'laminate', 'wood']);
  // The option is present and its COLOURS are not — which is what F9.2 asks for.
  assert.equal(sourceById(frontSources(P), 'wood').coloursSoon, true);
});

test('at most two front types, and they start answered', () => {
  const one = setFrontTypeCount([], 1, P);
  assert.equal(one.length, 1);
  assert.equal(one[0].source, 'spray', 'the first source is the default, not null');

  assert.equal(setFrontTypeCount([], 2, P).length, 2);
  assert.equal(setFrontTypeCount([], 9, P).length, P.projectSettings.maxFrontTypes, 'capped at two');
  assert.equal(setFrontTypeCount([], 0, P).length, 1, 'and never none');

  // Growing keeps what is already answered.
  const grown = setFrontTypeCount([{ id: 'f1', source: 'veneer' }], 2, P);
  assert.equal(grown[0].source, 'veneer');
  assert.equal(grown[1].source, 'spray');
});

test('normalising a front type fills every field, so no consumer guesses', () => {
  const [t] = normaliseFrontTypes([{}], P);
  // `finish_id` joined the shape in turn 15 (CLAUDE.md F3): what a BOARD front
  // is faced with — the decor of a laminate, the veneer of a veneer.
  assert.deepEqual(Object.keys(t).sort(), ['colour', 'finish_id', 'id', 'label', 'material_id', 'source']);
});

test('every piece of ironmongery is automatic; only the VARIANT is a question', () => {
  const design = migrateDesign(null);
  const choices = hardwareChoices(design, P);
  assert.deepEqual(choices.map((c) => c.key), ['plinth', 'hinges', 'runners', 'handles', 'edgeBanding']);

  // The plinth's legs, bases and clips are FITTED, never chosen.
  const plinth = choices.find((c) => c.key === 'plinth');
  assert.deepEqual(plinth.fits, ['legs', 'bases', 'clips']);
  assert.equal(plinth.variants, null, 'nothing to pick — it just happens');
  // Edge banding likewise.
  assert.equal(choices.find((c) => c.key === 'edgeBanding').variants, null);

  // The three that DO have a variant arrive on the workshop's default.
  assert.equal(hardwareVariant(design, P, 'hinges'), 'soft-close');
  assert.equal(hardwareVariant(design, P, 'runners'), 'soft-close');
  assert.equal(hardwareVariant(design, P, 'handles'), 'j-pull');
});

test('a chosen variant sticks, and nonsense falls back to the default', () => {
  const design = migrateDesign({ hardware: { hinges: 'standard' } });
  assert.equal(hardwareVariant(design, P, 'hinges'), 'standard');
  assert.equal(hardwareVariant(migrateDesign({ hardware: { hinges: 'unicorn' } }), P, 'hinges'), 'soft-close');
});

// ─── F9.3: thickness follows the source ─────────────────────────────────────

test('thickness is automatic per source — EGGER 18, veneer 19, laminate 18', () => {
  assert.equal(thicknessForSource(P, 'carcass', 'egger'), 18);
  assert.equal(thicknessForSource(P, 'front', 'veneer'), 19);
  assert.equal(thicknessForSource(P, 'front', 'laminate'), 18);
});

test('a veneer front makes the project’s front board 19 without being told twice', () => {
  const design = migrateDesign({ fronts: { types: [{ id: 'f1', source: 'veneer' }] } });
  assert.equal(projectFrontThickness(design, P), 19);
  assert.equal(projectFrontThickness(migrateDesign(null), P), P.front.thickness, 'unanswered = the profile’s');
});

test('the selector wins over the source, and "Other" wins over the selector', () => {
  const base = { fronts: { types: [{ id: 'f1', source: 'veneer' }] } };
  assert.equal(projectBoardThickness(migrateDesign(base), P), P.board.thickness);
  assert.equal(projectBoardThickness(migrateDesign({ ...base, thickness: { board: 22 } }), P), 22);
  assert.equal(
    projectBoardThickness(migrateDesign({ ...base, thickness: { board: 22, custom: 25.5 } }), P),
    25.5,
    'a typed board is what the workshop actually has',
  );
  // …and the options the selector offers are the three CLAUDE.md names.
  assert.deepEqual(P.projectSettings.boardThicknessOptions, [18, 22, 25]);
});

test('the project board reaches the units, and through them the engine', () => {
  project();
  store().setProjectDefaults({ thickness: { board: 22 } });
  const { id } = store().addUnit('BUD');
  assert.equal(unitOf(id).params.board_t, 22);
  const result = computeCabinet(paramsForEngine(unitOf(id)), P);
  // The maths is the engine's, unchanged: a side is still `depth − 1 × G`.
  const side = result.panels.find((p) => p.id === 'BUL');
  assert.equal(side.thickness, 22);
  assert.equal(side.w, unitOf(id).params.depth - 22);
});

// ─── the whole point: the kit is untouched ──────────────────────────────────

test('a bare computeCabinet with none of this set cuts what the AutoLISP cuts', () => {
  // The rule fixtures/README calls rule 1, checked against a kit call that
  // carries no design at all. If step 5 had reached into the engine rather than
  // feeding it, this is where it would show.
  const bare = computeCabinet({
    type: 'BUD', width: 600, height: 770, depth: 558, unit_num: '01', shelves: 1,
  }, P);
  assert.equal(bare.panels.find((p) => p.id === 'BUL').thickness, P.board.thickness);
  assert.equal(bare.panels.find((p) => p.id === 'BUL').w, 558 - P.board.thickness);
  assert.equal(bare.panels.some((p) => p.part === 'VPART'), false, 'no partition nobody asked for');
  assert.equal(bare.panels.some((p) => p.id === 'PLINTH'), false, 'no plinth nobody asked for');
});

test('the design defaults are all null — a project that answers nothing changes nothing', () => {
  assert.equal(DEFAULT_DESIGN.depth, null);
  // TURN 24 (CLAUDE.md F3.1): …and the caliper's six slots, all unmeasured and
  // all unconfirmed. Nothing answered = the manufacturer's nominal, which is
  // exactly what a project computed before the slots existed.
  assert.deepEqual(DEFAULT_DESIGN.thickness, { board: null, custom: null, slots: {} });
  assert.deepEqual(DEFAULT_DESIGN.hardware, { hinges: null, runners: null, handles: null });
  assert.deepEqual(DEFAULT_DESIGN.fronts.types, []);
  const d = migrateDesign(null);
  assert.equal(projectBoardThickness(d, P), P.board.thickness);
  assert.equal(projectFrontThickness(d, P), P.front.thickness);
});

test('a design saved before turn 11 opens with every new field filled in', () => {
  // The migration rule this file shares with every other schema in the app: a
  // project from turn 7 must not crash a formula that reads `design.thickness`.
  const ancient = migrateDesign({ carcass: { types: [{ id: 'c1' }] }, infill: { sideWidth: 20 } });
  assert.deepEqual(ancient.thickness.board, null);
  assert.deepEqual(ancient.thickness.custom, null);
  // Turn 24 (CLAUDE.md F3.1): the six slots arrive, empty — an old project is
  // told the question exists and is not answered on its behalf.
  assert.deepEqual(
    Object.keys(ancient.thickness.slots).sort(),
    ['box', 'carcass1', 'carcass2', 'carcass3', 'front1', 'front2'],
  );
  for (const row of Object.values(ancient.thickness.slots)) {
    assert.deepEqual(row, { measured: null, confirmed: false });
  }
  assert.deepEqual(ancient.hardware, { hinges: null, runners: null, handles: null });
  assert.deepEqual(ancient.fronts.types, []);
  assert.equal(ancient.carcass.types[0].source, null);
  assert.equal(ancient.colour.carcass, null);
  assert.equal(ancient.infill.sideWidth, 20, 'and what it DID say is untouched');
});
