// ─── T76 F4 · THE RECIPES MOVE INTO THE PROFILE, THE OWNER'S NUMBERS FIRST ──
//
// CLAUDE.md T76 F4: *"GPT put the recipe defaults in code (`RECIPES` in
// `src/engine/frontDecoration.js`). The house law: numbers live in
// `engine/profile.js`."*  And: *"The OWNER'S numbers (his DXF drawings,
// 31.08.2026) are the defaults where they exist; GPT's stand where the owner
// gave none."*  This file holds the move to that: no recipe in code, the
// owner's numbers read off the profile, the active workshop profile as the
// road, a V that is a V, a semicircle that is never an ellipse, and a board
// thinner than the recipe's said by the Check in words.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  DECORATIVE_FRONT_STYLES, buildFrontDecoration, defaultFrontDecoration, normaliseFrontDecoration,
} from '../src/engine/frontDecoration.js';
import {
  DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile, setActiveCabinetProfile,
} from '../src/engine/profile.js';
import { frontStyleSelection } from '../src/engine/design.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { runChecks, CHECKS } from '../src/engine/checks.js';
import { frontOperationsManifest, frontPanelEntities } from '../src/engine/cnc/frontOperations.js';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');
const leaf = { id: '01-F', w: 600, h: 720, thickness: 25 };
const build = (style, config = {}, panel = leaf) => buildFrontDecoration({
  panel, style, config: { ...defaultFrontDecoration(style, P), ...config }, profile: P,
});

test('F4 · RECIPES no longer exists in code; no recipe number is typed outside the profile', () => {
  const src = code(read('src/engine/frontDecoration.js'));
  assert.doesNotMatch(src, /\bRECIPES\b/, 'the recipe table is still in code');
  assert.doesNotMatch(src, /\bMIN_SKIN\s*=\s*\d/, 'the skin is still a number in code');
  assert.doesNotMatch(src, /archRatio/, 'the ellipse ratio survived');
  // *"Every caller that today reaches `DEFAULT_CABINET_PROFILE` for this takes
  // the active workshop profile instead."*
  assert.doesNotMatch(src, /DEFAULT_CABINET_PROFILE/, 'the decoration still reads the shipped defaults');
  for (const rel of ['src/engine/frontDecoration.js', 'src/engine/design.js', 'src/components/FrontDecorationControls.jsx']) {
    assert.doesNotMatch(code(read(rel)), /(?:groovePitchMm|grooveWidthMm|frameMm|recessDepthMm|mouldingInsetMm)\s*:\s*\d/, `${rel} types a recipe number`);
  }
});

test('F4 · the owner\'s numbers, read off the profile', () => {
  const D = P.front.decoration;
  assert.deepEqual(Object.keys(D).sort(), [...DECORATIVE_FRONT_STYLES].sort(), 'one entry per decorative style');
  // Owner, 31.08.2026.
  assert.deepEqual(D.G, {
    grooveCutter: 'v', grooveWidthMm: 4, grooveDepthMm: 3, groovePitchMm: 80, grooveInsetMm: 60, grooveDirection: 'vertical',
  });
  assert.equal(D.GF.frameMm, 60);
  assert.equal(D.GF.grooveCutter, 'v');
  assert.deepEqual([D.GF.grooveWidthMm, D.GF.grooveDepthMm, D.GF.groovePitchMm], [4, 3, 80]);
  assert.deepEqual(D.A, { boardMm: 30, frameMm: 60, recessDepthMm: 18 });
  assert.deepEqual(D.AH, D.A, 'AH is A\'s recipe; the J-pull is chosen under Opening');
  // Proposed, owner to confirm (GPT's).
  assert.deepEqual([D.GF.recessDepthMm, D.GF.grooveInsetMm], [6, 10]);
  assert.deepEqual(D.FL, {
    grooveCutter: 'ballnose', fluteDiameterMm: 12, grooveDepthMm: 3, groovePitchMm: 20, grooveInsetMm: 50, grooveDirection: 'vertical',
  });
  assert.deepEqual(D.AM, { mouldingInsetMm: 60, mouldingWidthMm: 20, mouldingProjectionMm: 8, mitreDeg: 45 });
  assert.equal(P.front.decorationMinSkinMm, 3);
  // The proposed ones say so where they stand.
  const block = read('src/engine/profile.js').split('T76 F4 · THE DECORATIVE RECIPES LIVE HERE')[1].split('decorationMinSkinMm')[0];
  assert.ok((block.match(/T76 proposed, owner to confirm/g) || []).length >= 4, 'GPT\'s numbers are not marked proposed');
  for (const style of DECORATIVE_FRONT_STYLES) {
    assert.deepEqual(defaultFrontDecoration(style, P), { version: 1, style, ...D[style] }, style);
  }
});

test('F4 · the active workshop profile is the road: a tuned number reaches the defaults and the selection', () => {
  const tuned = { ...P, front: { ...P.front, decoration: { ...P.front.decoration, G: { ...P.front.decoration.G, groovePitchMm: 100 } } } };
  setActiveCabinetProfile(tuned);
  try {
    assert.equal(defaultFrontDecoration('G').groovePitchMm, 100, 'no profile handed in: the active one answers');
    assert.equal(frontStyleSelection('G').decoration.groovePitchMm, 100, 'the style list asks the same profile');
    assert.equal(normaliseFrontDecoration({ style: 'G' }, 'G').groovePitchMm, 100);
  } finally {
    setActiveCabinetProfile(null);
  }
  assert.equal(defaultFrontDecoration('G').groovePitchMm, 80);
  // A stored profile that tuned ONE key keeps it and gets the owner's rest.
  const stored = migrateCabinetProfile({ ...P, front: { ...P.front, decoration: { A: { recessDepthMm: 12 } } } });
  assert.equal(stored.front.decoration.A.recessDepthMm, 12);
  assert.equal(stored.front.decoration.A.boardMm, 30);
  assert.deepEqual(stored.front.decoration.G, P.front.decoration.G);
});

test('F4 · a project that overrode a number keeps its number', () => {
  const saved = { version: 1, style: 'G', groovePitchMm: 64 };
  const n = normaliseFrontDecoration(saved, 'G', P);
  assert.equal(n.groovePitchMm, 64, 'the saved number stands');
  assert.equal(n.grooveWidthMm, 4, 'a key it lacks falls back to the profile');
});

test('F4 · the V is a V: its kind, its width and depth, its layer and its manifest entry say so', () => {
  const g = build('G');
  assert.equal(g.status, 'ready');
  for (const op of g.operations) {
    assert.equal(op.kind, 'vgroove');
    assert.deepEqual(op.tool, { kind: 'v' }, 'no diameter and no included angle is assumed');
    assert.equal(op.crossSection.kind, 'v');
    assert.deepEqual([op.crossSection.width, op.crossSection.depth], [4, 3]);
    assert.equal(op.layer, 'FRONT_VGROOVE_D3_S0_W4');
    // The floor is a V: deepest on the centre line, nothing at the mouth.
    const depths = op.crossSection.profile.map(([, d]) => d);
    assert.equal(Math.max(...depths), 3);
    assert.equal(depths[0], 0);
    assert.equal(depths.at(-1), 0);
  }
  const gf = build('GF');
  assert.equal(gf.operations[0].kind, 'pocket');
  for (const op of gf.operations.slice(1)) {
    assert.equal(op.kind, 'vgroove');
    assert.equal(op.layer, 'FRONT_VGROOVE_D9_S6_W4', 'inside the recess: from 6 down to 9');
  }
  const fl = build('FL');
  assert.ok(fl.operations.every((op) => op.kind === 'flute' && op.tool.kind === 'ballnose' && op.tool.diameter === 12));
  // The handoff: the FRONT DXF carries the centre line, the JSON says V.
  const result = computeCabinet({ ...defaultParamsFor('BUD', P), front_type: 'G', front_decoration: defaultFrontDecoration('G', P) }, P);
  const front = result.panels.find((p) => p.meta?.frontDecoration);
  const lines = frontPanelEntities(front).filter((e) => e.layer === 'FRONT_VGROOVE_D3_S0_W4');
  assert.ok(lines.length > 0 && lines.every((e) => !e.closed && e.pts.length === 2));
  const manifest = frontOperationsManifest([{ result }]);
  const op = manifest.parts[0].operations[0];
  assert.equal(op.kind, 'vgroove');
  assert.equal(op.tool.kind, 'v');
  assert.deepEqual([op.crossSection.width, op.crossSection.depth], [4, 3]);
  assert.equal(op.vectorMeaning, 'groove centre line');
  assert.match(manifest.machining.vgroove, /No included angle is assumed/);
});

test('F4 · the arch is a semicircle; a leaf too short for its rise is refused in words', () => {
  // A 300 mm wide leaf, 200 high: inner 180 x 80, the rise 90.
  const refused = build('A', {}, { ...leaf, w: 300, h: 200 });
  assert.equal(refused.status, 'blocked');
  assert.deepEqual(refused.operations, []);
  const why = refused.problems.find((p) => p.code === 'FRONT_DECORATION_ARCH');
  assert.ok(why, JSON.stringify(refused.problems));
  assert.match(why.message, /90 mm here/);
  assert.match(why.message, /never squashed to an ellipse/);
  // The same leaf 700 high takes it.
  assert.equal(build('A', {}, { ...leaf, w: 300, h: 700 }).status, 'ready');
});

test('F4 · a pitch too tight for the leaf is refused, never clamped', () => {
  const r = build('G', { groovePitchMm: 25 }, { ...leaf, w: 100 });
  assert.equal(r.status, 'blocked');
  assert.deepEqual(r.operations, []);
  assert.ok(r.problems.length && r.problems.every((p) => typeof p.message === 'string' && p.message.length > 10));
  assert.equal(r.parameters.groovePitchMm, 25, 'the number asked is kept, not moved');
});

test('F4 · the board the arch was drawn for: the Check says it, nothing is shrunk or swapped', () => {
  assert.deepEqual(CHECKS.find((c) => c.n === 32), { n: 32, level: 'yellow', label: 'Front thinner than its decoration\'s board' });
  const params = { ...defaultParamsFor('BUD', P), unit_num: '01', front_type: 'A', front_decoration: defaultFrontDecoration('A', P) };
  const result = computeCabinet(params, P);
  const front = result.panels.find((p) => p.meta?.frontDecoration);
  assert.equal(front.thickness, 25);
  assert.equal(front.meta.frontDecoration.status, 'ready', 'the leaf is still cut');
  assert.equal(front.meta.frontDecoration.parameters.recessDepthMm, 18, 'the recipe is not shrunk');
  assert.equal(front.meta.frontDecoration.operations[0].depth, 18);
  const advice = front.meta.frontDecoration.advisories.find((a) => a.code === 'FRONT_DECORATION_BOARD');
  assert.ok(advice);
  assert.match(advice.message, /30 mm board and this front is 25 mm: the 18 mm recess leaves 7 mm/);
  assert.ok(result.warnings.some((w) => w.code === 'FRONT_DECORATION_BOARD' && w.panel === front.id));
  const unit = { id: 'u1', type: 'BUD', params, position: { wall: 0, x_mm: 0 } };
  const found = runChecks({ entries: [{ unit, result }], profile: P }).filter((f) => f.check === 32);
  assert.equal(found.length, 1);
  assert.equal(found[0].level, 'yellow');
  assert.match(found[0].message, /Assign a 30 mm front material, or keep this board by decision/);
  // On the owner's 30 board there is nothing to say.
  const thick = computeCabinet({ ...params, front_t: 30 }, P);
  const thickFront = thick.panels.find((p) => p.meta?.frontDecoration);
  assert.equal(thickFront.thickness, 30);
  assert.deepEqual(thickFront.meta.frontDecoration.advisories, []);
  assert.equal(runChecks({ entries: [{ unit, result: thick }], profile: P }).filter((f) => f.check === 32).length, 0);
});

test('F4 · AM\'s mitre is the profile\'s 45, and nothing else closes four strips', () => {
  const am = build('AM');
  assert.ok(am.additions.every((a) => a.mitres.start === 45 && a.mitres.end === 45));
  const r = build('AM', { mitreDeg: 30 });
  assert.equal(r.status, 'blocked');
  assert.ok(r.problems.some((p) => p.code === 'FRONT_DECORATION_MITRE'));
});
