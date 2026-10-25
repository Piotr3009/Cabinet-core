/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T82 F15 · THE CLOUD: FLUTED AS CONVEX REEDS ────────────────────────────
//
// The owner, 25.10.2026, over his mockup (verify/t82/mockups/chmurka.png):
// *"fluted teraz to sa rowki a ja potrzebuje chmurke"*, *"daj wariant b czyli
// na styk narazie"*, *"do tego daj ustawienie srednicy walkow tez"*.
//
// CLAUDE.md T82 F15: FL carries `fluteProfile: 'groove' | 'reed'`, default
// `reed`; a reed is a row of CONVEX half-rounds TOUCHING, diameter
// `reedDiameterMm` (default 20, the ladder 16, 20, 25), the crests on the
// face, the valleys half the diameter into the board, sharp; the side margins
// are `grooveInsetMm`, top and bottom the reeds run to the edges. One CNC
// operation per valley (kind `reed`, tool `{ kind: 'reedProfile', diameter }`).
// The board under the valley is said in the Check when under 10 (#46 here:
// the in-frame project holds #41). A field that does not divide is centred
// and the remainder said. The goldens of FL grooves hold, and an FL front
// saved before tonight (no profile named) stays grooves.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import {
  buildFrontDecoration, boardRefusal, defaultFrontDecoration, FLUTE_PROFILES, newFrontDecoration,
  normaliseFrontDecoration, reedChoices,
} from '../src/engine/frontDecoration.js';
import { frontStyleSelection, migrateDesign, resolveUnitDesign } from '../src/engine/design.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { CHECKS, runChecks } from '../src/engine/checks.js';
import {
  frontDecorationLayers, frontDecorationProblems, frontLayerFindings, frontOperationsManifest, frontPanelEntities,
} from '../src/engine/cnc/frontOperations.js';
import { buildUnitDxfFiles } from '../src/engine/cnc/dxf.js';
import { frontDecorationDetailNote, frontDecorationElevation, frontDecorationMachinings } from '../src/engine/drawings/frontDecorationDrawing.js';
import { frontDecorationGeometry } from '../src/3d/frontDecorationSolid.js';
import { paramsForEngine, useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { t81Kitchen, setArgs } from '../scripts/t81-kitchen.mjs';
import { getCabinetProfile } from '../src/engine/profile.js';
import { wallGroups } from '../src/engine/drawings/wallElevation.js';
import { buildRunElevation, worktopsOnWall } from '../src/engine/drawings/setElevation.js';
import { drawingContext } from '../src/engine/drawings/setSheet.js';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const S = () => useProjectStore.getState();
const sha256 = (text) => createHash('sha256').update(text).digest('hex');
const leaf = (w, h, t) => ({ id: '01-F', w, h, thickness: t });
const reed = (extra = {}) => ({ ...newFrontDecoration('FL', P), ...extra });
const build = (w, h, t, config = reed()) => buildFrontDecoration({ panel: leaf(w, h, t), config, style: 'FL', profile: P });
const codes = (d) => d.advisories.map((a) => a.code);

/** The engine BUD with an FL leaf, as T76 and T77 cut it. */
function bud(decoration, frontT) {
  const params = { ...defaultParamsFor('BUD', P), unit_num: '01', front_type: 'FL', front_decoration: decoration };
  if (frontT !== undefined) params.front_t = frontT;
  const result = computeCabinet(params, P);
  const unit = { id: 'u1', type: 'BUD', params, position: { wall: 0, x_mm: 0 } };
  return { params, result, unit, front: result.panels.find((p) => p.meta?.frontDecoration) };
}

test('F15 · the numbers live in the profile, and T76\'s FL recipe is untouched beside them', () => {
  assert.deepEqual(P.front.flute, { profile: 'reed', reedDiameterMm: 20, reedLadderMm: [16, 20, 25], reedNoteUnderValleyMm: 10 });
  assert.deepEqual(P.front.decoration.FL, {
    grooveCutter: 'ballnose', fluteDiameterMm: 12, grooveDepthMm: 3, groovePitchMm: 20, grooveInsetMm: 50, grooveDirection: 'vertical',
  }, 'T76\'s groove recipe: the record a saved FL front without a profile reads');
  assert.deepEqual(FLUTE_PROFILES, ['groove', 'reed']);
  assert.deepEqual(reedChoices(P), { diameterMm: 20, ladderMm: [16, 20, 25] });
  const block = read('src/engine/profile.js').split('T82 F15 · THE CLOUD')[1].split('// ─── Carcass panel deductions')[0];
  assert.match(block, /reedDiameterMm: 20, +\/\/ T82 PROPOSED, owner to confirm/);
  assert.match(block, /reedLadderMm: \[16, 20, 25\], +\/\/ T82 PROPOSED, owner to confirm/);
});

test('F15 · a NEW Fluted choice is born reeds; T76\'s default recipe is still the grooves', () => {
  assert.deepEqual(defaultFrontDecoration('FL', P), { version: 1, style: 'FL', ...P.front.decoration.FL }, 'T76 F4 holds');
  assert.deepEqual(newFrontDecoration('FL', P), { ...defaultFrontDecoration('FL', P), fluteProfile: 'reed', reedDiameterMm: 20 });
  for (const style of ['G', 'GF', 'A', 'AH', 'AM']) assert.deepEqual(newFrontDecoration(style, P), defaultFrontDecoration(style, P), style);
  assert.deepEqual(frontStyleSelection('FL').decoration, newFrontDecoration('FL'));
  // A workshop that keeps grooves for its new fronts says so in its profile.
  const grooveShop = { ...P, front: { ...P.front, flute: { ...P.front.flute, profile: 'groove' } } };
  assert.equal(newFrontDecoration('FL', grooveShop).fluteProfile, 'groove');
  assert.equal(Object.hasOwn(newFrontDecoration('FL', grooveShop), 'reedDiameterMm'), false);
});

test('F15 · 596 x 726 at reed 20 and inset 50: (596 - 100) / 20 is 24.8, so 24 reeds, centred, the 16 said', () => {
  const d = build(596, 726, 22);
  assert.equal(d.status, 'ready', JSON.stringify(d.problems));
  assert.deepEqual(d.reeds, { count: 24, diameterMm: 20, fieldMm: 496, remainderMm: 16, marginMm: 58, underValleyMm: 12 });
  // One operation per valley: 24 reeds touching have 25 valleys, the two outer ones on the field's edges.
  assert.equal(d.operations.length, 25);
  const xs = d.operations.map((op) => op.centreline[0][0]);
  assert.deepEqual(xs, Array.from({ length: 25 }, (_, i) => 58 + 20 * i));
  assert.deepEqual(d.operations.map((op) => op.crossSection.edge), ['start', ...Array(23).fill(null), 'end']);
  for (const op of d.operations) {
    assert.equal(op.kind, 'reed');
    assert.equal(op.face, 'front');
    assert.deepEqual(op.tool, { kind: 'reedProfile', diameter: 20 });
    assert.equal(op.layer, 'FRONT_REED_D10_S0_T20', 'the FLUTE grammar: kind, depth, start, tool');
    assert.equal(op.depth, 10, 'the valley is half the diameter into the board');
    assert.equal(op.startDepth, 0);
    // Top and bottom the reeds run to the edges.
    assert.deepEqual([op.centreline[0][1], op.centreline[1][1]], [0, 726]);
    const depths = op.surface.vertices.map((v) => v[2]);
    assert.equal(Math.min(...depths), 0, 'the crests are ON the face');
    assert.equal(Math.max(...depths), 10);
  }
  // Touching, no flat: every crest is a single point of the section (depth 0 only at the flanks' ends).
  const mid = d.operations[5].crossSection.profile;
  assert.deepEqual(mid[0], [-10, 0]);
  assert.deepEqual(mid.at(-1), [10, 0]);
  assert.equal(mid.filter(([, depth]) => depth === 0).length, 2, 'no flat between two reeds');
  assert.equal(mid.filter(([, depth]) => depth === 10).length, 1, 'the valley is sharp: one point');
  // The section is a circle of radius 10 centred one radius under the crest.
  for (const [u, depth] of mid) {
    const c = u < 0 ? -10 : 10;
    assert.ok(Math.abs(Math.hypot(u - c, depth - 10) - 10) < 1e-6, `${u}, ${depth} is on the reed`);
  }
  // The field's edge: one flank and a vertical wall to the flat margin.
  const start = d.operations[0].crossSection.profile;
  assert.deepEqual(start.slice(0, 2), [[0, 0], [0, 10]]);
  assert.deepEqual(codes(d), ['FRONT_DECORATION_REED_REMAINDER']);
  assert.match(d.advisories[0].message, /24 reeds fit and 16 mm is over, so the row is centred and each side margin is 58 mm/);
});

test('F15 · a field that divides takes its reeds exactly, the margins as today\'s, and nothing is said', () => {
  const d = build(580, 726, 22);
  assert.deepEqual(d.reeds, { count: 24, diameterMm: 20, fieldMm: 480, remainderMm: 0, marginMm: 50, underValleyMm: 12 });
  assert.equal(d.operations[0].centreline[0][0], 50);
  assert.equal(d.operations.at(-1).centreline[0][0], 530);
  assert.deepEqual(codes(d), [], 'a 22 front with reeds of 20 leaves 12: no note');
  // The ladder: 16 and 25 cut 8 and 12.5 deep.
  assert.equal(build(580, 726, 22, reed({ reedDiameterMm: 16 })).reeds.count, 30);
  assert.equal(build(580, 726, 22, reed({ reedDiameterMm: 16 })).operations[0].layer, 'FRONT_REED_D8_S0_T16');
  assert.equal(build(600, 726, 22, reed({ reedDiameterMm: 25 })).reeds.count, 20);
  assert.equal(build(600, 726, 22, reed({ reedDiameterMm: 25 })).operations[0].depth, 12.5);
  // Horizontal reeds take the margins at the top and the bottom and run to the sides.
  const h = build(596, 580, 22, reed({ grooveDirection: 'horizontal' }));
  assert.equal(h.status, 'ready');
  assert.equal(h.reeds.count, 24);
  assert.deepEqual(h.operations[0].centreline, [[0, 50], [596, 50]]);
});

test('F15 · #46: an 18 front with reeds of 20 leaves 8 under the valley and the Check says so; a 22 says nothing', () => {
  assert.ok(CHECKS.some((c) => c.n === 46 && c.level === 'yellow'), 'the rule is in the list, yellow');
  assert.ok(!CHECKS.some((c) => c.n === 41 && /reed/i.test(c.label)), '#41 stays the in-frame project\'s');
  const thin = build(580, 726, 18);
  assert.equal(thin.status, 'ready', 'the leaf is cut: the note blocks nothing');
  assert.deepEqual(codes(thin), ['FRONT_DECORATION_REED_SKIN']);
  assert.match(thin.advisories[0].message, /^Reeds leave 8 mm under the valley: this 18 mm front takes reeds of 20 mm, cut 10 mm deep/);
  for (const t of [18, 22]) {
    const { result, unit, front } = bud(reed(), t);
    assert.equal(front.meta.frontDecoration.status, 'ready', `${t}: ${JSON.stringify(front.meta.frontDecoration.problems)}`);
    const found = runChecks({ entries: [{ unit, result }], profile: P }).filter((f) => f.check === 46);
    const skin = found.filter((f) => /under the valley/.test(f.message));
    if (t === 18) {
      assert.equal(skin.length, 1, 'one leaf, one sentence');
      assert.equal(skin[0].level, 'yellow');
      assert.match(skin[0].message, /^01 01-F: Reeds leave 8 mm under the valley/);
      assert.deepEqual(skin[0].subject, { unitId: 'u1', panelId: front.id, editor: 'element' });
    } else {
      assert.equal(skin.length, 0, `${t} mm leaves 12: no note`);
    }
    // The BUD's leaf (597 wide, a 497 field) does not divide by 20: the remainder is said, once, under the same row.
    assert.equal(front.w, 597);
    const over = found.filter((f) => /do not divide/.test(f.message));
    assert.equal(over.length, 1);
    assert.match(over[0].message, /24 reeds fit and 17 mm is over, so the row is centred and each side margin is 58\.5 mm/);
  }
  // A board too thin for the valley and the skin is refused in words (T76's skin law, not a squash).
  const refused = build(580, 726, 12);
  assert.equal(refused.status, 'blocked');
  assert.ok(refused.problems.some((p) => p.code === 'FRONT_DECORATION_SKIN'));
  // Retail asks the same board rule of what a pick gives: reeds of 20 need 13.
  assert.equal(boardRefusal('FL', 12, P).needMm, 13);
  assert.equal(boardRefusal('FL', 18, P), null);
});

test('F15 · the goldens of FL grooves hold: T76\'s record byte for byte, and `groove` cuts the same grooves', () => {
  const file = JSON.parse(read('fixtures/golden-decorative-fronts.json'));
  const bare = { ...defaultParamsFor('BUD', P), front_type: 'FL' };
  const decorated = (p) => Boolean(p?.meta?.frontDecoration || p?.meta?.frontDecorationParent);
  const cut = computeCabinet({ ...bare, front_decoration: defaultFrontDecoration('FL', P) }, P).panels.filter(decorated);
  assert.equal(sha256(JSON.stringify(cut)), file.FL.sha256, 'T76\'s FL record moved');
  const groove = computeCabinet({ ...bare, front_decoration: { ...defaultFrontDecoration('FL', P), fluteProfile: 'groove' } }, P)
    .panels.filter(decorated);
  assert.deepEqual(groove.map((p) => p.meta.frontDecoration.operations), cut.map((p) => p.meta.frontDecoration.operations));
  assert.ok(groove[0].meta.frontDecoration.operations.every((op) => op.kind === 'flute' && op.tool.kind === 'ballnose'));
  assert.equal(groove[0].meta.frontDecoration.parameters.fluteProfile, 'groove', 'the choice is kept on the record');
});

test('F15 · an FL decoration saved before tonight names no profile and stays grooves, through save and reload', () => {
  const old = { version: 1, style: 'FL', grooveCutter: 'ballnose', fluteDiameterMm: 12, grooveDepthMm: 3, groovePitchMm: 20, grooveInsetMm: 50, grooveDirection: 'vertical' };
  assert.deepEqual(normaliseFrontDecoration(old, 'FL', P), old, 'no key is added to an old record');
  assert.deepEqual(normaliseFrontDecoration({ version: 1, style: 'FL' }, 'FL', P), defaultFrontDecoration('FL', P), 'a bare one fills from T76\'s recipe');
  assert.ok(build(596, 726, 22, old).operations.every((op) => op.kind === 'flute'));
  // The store's road, an old project: the project's FL fronts carry T76's record.
  S().loadProject({
    id: null, name: 'Old fluted', room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
    design: { fronts: { style: 'FL', decoration: old } },
  }, []);
  const id = S().addUnit('BUD').id;
  S().setDoors(id, { count: 1, hinge: 'L' });
  const ops = () => S().unitResult(id).panels.find((p) => p.meta?.frontDecoration).meta.frontDecoration.operations;
  assert.ok(ops().length > 0 && ops().every((op) => op.kind === 'flute'), 'the old project cuts grooves');
  const saved = JSON.parse(JSON.stringify(S().project));
  const units = JSON.parse(JSON.stringify(S().units));
  S().loadProject(saved, units);
  assert.ok(ops().every((op) => op.kind === 'flute'), 'and after a reload');
  assert.equal(Object.hasOwn(S().project.design.fronts.decoration, 'fluteProfile'), false);
  // The owner picks Fluted again in Settings: the project's own record is kept (a reselection).
  S().setProjectDefaults({ fronts: frontStyleSelection('FL', S().project.design.fronts) });
  assert.ok(ops().every((op) => op.kind === 'flute'), 'a reselected style keeps its record');
  // He chooses reeds: they are cut, and they survive the save.
  S().setProjectDefaults({ fronts: { ...S().project.design.fronts, decoration: { ...S().project.design.fronts.decoration, fluteProfile: 'reed', reedDiameterMm: 20 } } });
  assert.ok(ops().every((op) => op.kind === 'reed'), 'reeds once chosen');
  S().loadProject(JSON.parse(JSON.stringify(S().project)), JSON.parse(JSON.stringify(S().units)));
  assert.ok(ops().every((op) => op.kind === 'reed'), 'and after a reload');
});

test('F15 · a new project that picks Fluted gets reeds, saved and reloaded; the engine reads the unit\'s params', () => {
  const design = migrateDesign(JSON.parse(JSON.stringify({ fronts: frontStyleSelection('FL') })));
  const resolved = resolveUnitDesign({ params: {} }, design);
  assert.equal(resolved.frontDecoration.fluteProfile, 'reed');
  assert.equal(resolved.frontDecoration.reedDiameterMm, 20);
  const unit = { id: 'n', type: 'BUD', params: { width: 600, height: 720, depth: 560 }, position: { x_mm: 0 } };
  assert.equal(paramsForEngine(unit, design).front_decoration.fluteProfile, 'reed');
  // A typed diameter is the decoration's own number and stays.
  const typed = normaliseFrontDecoration({ ...frontStyleSelection('FL').decoration, reedDiameterMm: '25' }, 'FL', P);
  assert.equal(typed.reedDiameterMm, 25);
  // A profile the engine does not know is refused in words, never read as something else.
  const odd = build(596, 726, 22, reed({ fluteProfile: 'wave' }));
  assert.equal(odd.status, 'blocked');
  assert.equal(odd.problems[0].code, 'FRONT_DECORATION_FLUTE_PROFILE');
  const bad = build(596, 726, 22, reed({ reedDiameterMm: 0 }));
  assert.equal(bad.status, 'blocked');
});

test('F15 · CNC: one open valley line per reed valley on the FRONT file, the manifest says reed, every existing export is what it was', () => {
  const { result, unit, front } = bud(reed(), 22);
  assert.deepEqual(frontDecorationProblems(front), [], 'the reeds are a ready recipe');
  const lines = frontPanelEntities(front).filter((e) => e.layer === 'FRONT_REED_D10_S0_T20');
  assert.equal(lines.length, front.meta.frontDecoration.operations.length);
  assert.ok(lines.every((e) => !e.closed && e.pts.length === 2), 'valley lines, open');
  const layers = frontDecorationLayers([front]).find((l) => l.name === 'FRONT_REED_D10_S0_T20');
  assert.equal(layers.label, 'Reed valley: 10 mm, 20 mm reed profile');
  assert.deepEqual(frontLayerFindings([{ unit, result }]), [], 'one layer, one recipe: the edge valleys agree with the rest');
  const manifest = frontOperationsManifest([{ unit, result }]);
  const op = manifest.parts[0].operations[0];
  assert.equal(op.kind, 'reed');
  assert.deepEqual(op.tool, { kind: 'reedProfile', diameter: 20 });
  assert.equal(op.vectorMeaning, 'reed profile cutter centre path along a valley');
  assert.equal(op.crossSection.edge, 'start');
  assert.match(manifest.machining.reed, /convex half-rounds touching/);
  const files = buildUnitDxfFiles(result, P).filter((f) => /FRONT/i.test(f.name) && f.dxf.includes('FRONT_REED_D10_S0_T20'));
  assert.equal(files.length, 1, 'the leaf\'s FRONT file carries the reed layer');
  // A groove export's manifest says nothing of reeds.
  const grooves = bud(defaultFrontDecoration('FL', P), 22);
  assert.equal(Object.hasOwn(frontOperationsManifest([{ unit: grooves.unit, result: grooves.result }]).machining, 'reed'), false);
});

test('F15 · the sheets draw the valleys; the part detail names the reeds', () => {
  const { front } = bud(reed(), 22);
  const lines = frontDecorationElevation(front);
  assert.equal(lines.length, front.meta.frontDecoration.operations.length, 'one line per valley, no strip outlines');
  assert.ok(lines.every((e) => e.layer === 'DOORS' && e.pen === 'FINE' && e.open === true && e.pts.length === 2));
  const xs = lines.map((e) => e.pts[0][0]).sort((a, b) => a - b);
  assert.ok(xs.every((x, i) => !i || Math.abs(x - xs[i - 1] - 20) < 1e-6), 'every 20 mm');
  const paths = frontDecorationMachinings(front);
  assert.ok(paths.every((p) => p.machiningKind === 'reed' && p.closed === false));
  assert.match(paths[0].note, /FRONT FACE reed · 10 mm total depth, reedProfile diameter 20 mm/);
  assert.match(frontDecorationDetailNote(front), /Reeded face: 24 convex reeds of 20 mm, touching, valleys 10 mm deep/);
});

test('F15 · the T81 fronts sheet draws the reeds through the same function: one fine line a valley, on the leaf', () => {
  const ids = t81Kitchen({ inframe: false, name: 'T82 F15 reeds' });
  // The Settings road (SettingsPanel.jsx, the FRONTS gallery's onPick), word for word.
  const fronts = S().project.design.fronts;
  S().setDesign({ fronts: { ...fronts, ...frontStyleSelection('FL', fronts) } });
  const a = setArgs();
  const group = wallGroups(a.entries, getCabinetProfile())[0];
  const sheet = buildRunElevation(group, {
    mode: 'fronts', room: a.room, worktops: worktopsOnWall(a.worktops, 0), frontTypeOf: a.frontTypeOf,
    profile: getCabinetProfile(), ctx: drawingContext(15, getCabinetProfile()),
  });
  const m = group.members.find((x) => x.unit.id === ids.a);
  const door = m.result.panels.find((p) => p.part === 'FRONT');
  const d = door.meta.frontDecoration;
  assert.equal(d.status, 'ready', JSON.stringify(d.problems));
  assert.ok(d.operations.every((op) => op.kind === 'reed'), 'the kitchen\'s Fluted fronts are born reeds');
  const marks = sheet.entities.filter((e) => e.meta === 'front-decoration' && JSON.stringify(e).includes(door.id));
  assert.ok(marks.length >= d.operations.length, `${marks.length} lines for ${d.operations.length} valleys`);
});

test('F15 · the room draws the reeds from the record as it draws the grooves: the face keeps only its margins', () => {
  const { front } = bud(reed(), 22);
  const g = frontDecorationGeometry(front, []);
  assert.ok(g, 'a solid');
  const pos = g.attributes.position.array;
  const half = 0.011;
  let face = 0;
  for (let i = 0; i < pos.length; i += 9) {
    const z = [pos[i + 2], pos[i + 5], pos[i + 8]];
    if (!z.every((v) => Math.abs(v - half) < 1e-9)) continue;
    const ab = [pos[i + 3] - pos[i], pos[i + 4] - pos[i + 1]];
    const ac = [pos[i + 6] - pos[i], pos[i + 7] - pos[i + 1]];
    face += Math.abs(ab[0] * ac[1] - ab[1] * ac[0]) / 2;
  }
  const r = front.meta.frontDecoration.reeds;
  assert.ok(Math.abs(face * 1e6 - 2 * r.marginMm * front.h) < 1, `the face is the two margins: ${face * 1e6}`);
});

test('F15 · the PRO Settings controls: the profile, the reed diameter with its ladder, the side margin', () => {
  const controls = read('src/components/FrontDecorationControls.jsx');
  for (const needle of ['data-decoration-field="fluteProfile"', 'data-decoration-field="reedDiameterMm"', 'data-reed-ladder={mm}',
    'reedChoices()', 'newFrontDecoration(style)', "'Reed side margin'"]) {
    assert.ok(controls.includes(needle), needle);
  }
  assert.doesNotMatch(controls, /\[16, 20, 25\]/, 'the ladder is the profile\'s, never typed into the UI');
});

// ─── T82 F15, AFTER THE REVIEW (a) · THE SCREW UNDER A CREST ───────────────
// The review of 25.10.2026 (reeds:0): every reeded drawer front of BUDR2 and
// BUDR4 on an 18 or 22 front was refused (FRONT_DECORATION_BACK_BORE), the
// back-bore rule reading each valley's strip as a flat pocket as deep as the
// valley. The screw at 89.5 sits 1 mm off a crest: the reed cuts 0.3 mm over
// it and 10.7 mm of board stays. The rule now measures the reed's own depth
// over the bore's disc; a screw under a valley is still refused in words.

test('F15 after the review (a) · a reeded drawer front whose screws sit under the crests is cut, on 18 and on 22', () => {
  for (const t of [18, 22]) {
    const params = { ...defaultParamsFor('BUDR2', P), unit_num: 'DR01', width: 600, front_type: 'FL', front_decoration: reed(), front_t: t };
    const result = computeCabinet(params, P);
    const fronts = result.panels.filter((p) => p.part === 'DRAWER-FRONT');
    assert.equal(fronts.length, 2);
    for (const f of fronts) {
      const d = f.meta.frontDecoration;
      assert.equal(f.w, 597);
      assert.equal(d.status, 'ready', `${t}: ${f.id} ${JSON.stringify(d.problems)}`);
      assert.equal(d.operations.length, 25);
      assert.ok(!d.problems.some((p) => p.code === 'FRONT_DECORATION_BACK_BORE'));
    }
    const screws = result.drills.filter((x) => x.kind === 'front_screw');
    assert.ok(screws.length >= 4, 'the drawer boxes are screwed to their fronts from the back');
    const unit = { id: 'u1', type: 'BUDR2', params, position: { wall: 0, x_mm: 0 } };
    assert.deepEqual(runChecks({ entries: [{ unit, result }], profile: P }).filter((x) => x.check === 9), [], `${t}: no red #9`);
  }
});

test('F15 after the review (a) · a screw under a valley is still refused in words, with the board it would leave', () => {
  // A 603 unit gives a 600 front: its 500 field divides, the valleys stand at 50 + 20 k, and the screws at 89.5 and
  // 510.5 sit 0.5 mm off the valleys at 90 and 510: the valley cuts 10 deep over them, 11 - 10 = 1 mm under 3 on 22.
  const params = { ...defaultParamsFor('BUDR2', P), unit_num: 'DR01', width: 603, front_type: 'FL', front_decoration: reed(), front_t: 22 };
  const result = computeCabinet(params, P);
  const front = result.panels.find((p) => p.part === 'DRAWER-FRONT');
  assert.equal(front.w, 600);
  const d = front.meta.frontDecoration;
  assert.equal(d.status, 'blocked');
  const said = d.problems.filter((p) => p.code === 'FRONT_DECORATION_BACK_BORE');
  assert.ok(said.length >= 1);
  assert.match(said[0].message, /reed-valley-\d+ cuts 10 mm deep over the back front_screw and leaves 1 mm between them, less than 3 mm/);
  // The same 600 front at reeds of 16 puts the screws off the valleys: it is cut.
  const small = computeCabinet({ ...params, front_decoration: reed({ reedDiameterMm: 16 }) }, P)
    .panels.find((p) => p.part === 'DRAWER-FRONT').meta.frontDecoration;
  assert.equal(small.status, 'ready', JSON.stringify(small.problems));
});

// ─── T82 F15, AFTER THE REVIEW (b) · THE REEDS AND THE J-PULL ──────────────
// The review (reeds:2): reeds run to the top edge by rule, so on a TOP J-pull
// they always cross the J's slot, and the refusal sent the owner to "Increase
// its frame or margin", a field that cannot help (no frame, and the reed
// margin acts on the sides). The refusal stays (a 10 mm valley through the
// J's 4.2 mm lip is real); the sentence now names what he can take.

const jBud = (type, extra = {}, more = {}) => {
  const params = {
    ...defaultParamsFor(type, P), unit_num: '01', front_type: 'FL', front_t: 22,
    front_decoration: reed(extra), project_handle: { type: 'jpull' }, ...more,
  };
  return computeCabinet(params, P).panels.filter((p) => p.meta?.frontDecoration);
};

test('F15 after the review (b) · a TOP J-pull with reeds is refused with the remedies that work, and they work', () => {
  const [door] = jBud('BUD');
  assert.equal(door.cnc.jpull.edge, 'TOP');
  const d = door.meta.frontDecoration;
  assert.equal(d.status, 'blocked');
  const said = d.problems.find((p) => p.code === 'FRONT_DECORATION_JPULL');
  assert.equal(said.message, 'Reeds run to the top edge and cross the J-pull\'s slot, 45 mm in from it: choose Grooves in the '
    + 'Flute profile for this front, or another handle.');
  assert.doesNotMatch(said.message, /frame or margin/);
  // The first remedy: Grooves, the same J door.
  assert.equal(jBud('BUD', { fluteProfile: 'groove' })[0].meta.frontDecoration.status, 'ready');
  // The second: another handle.
  const knob = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01', front_type: 'FL', front_t: 22, front_decoration: reed(), project_handle: { type: 'knob' } }, P)
    .panels.find((p) => p.meta?.frontDecoration);
  assert.equal(knob.meta.frontDecoration.status, 'ready');
  // The drawer fronts of a J kitchen say the same, and grooves cut them.
  for (const f of jBud('BUDR2')) {
    assert.equal(f.meta.frontDecoration.problems.find((p) => p.code === 'FRONT_DECORATION_JPULL')?.message, said.message);
  }
  assert.ok(jBud('BUDR2', { fluteProfile: 'groove' }).every((f) => f.meta.frontDecoration.status === 'ready'));
});

test('F15 after the review (b) · a side J-pull: the reeds keep their margin, and a margin too narrow names the number', () => {
  const [tall] = jBud('WD');
  assert.equal(tall.cnc.jpull.edge, 'L');
  assert.equal(tall.meta.frontDecoration.status, 'ready', 'the 50 margin clears the J\'s 45');
  const [narrow] = jBud('WD', { grooveInsetMm: 30 });
  const said = narrow.meta.frontDecoration.problems.find((p) => p.code === 'FRONT_DECORATION_JPULL');
  assert.equal(said.message, 'The reeds enter the J-pull\'s slot, 45 mm in from its edge: make the Reed side margin more than '
    + '45 mm, or choose Grooves in the Flute profile, or another handle.');
  assert.equal(jBud('WD', { grooveInsetMm: 46 })[0].meta.frontDecoration.status, 'ready', 'the remedy works');
  // Grooves keep T76's sentence, where the frame or the margin is the remedy.
  const groove = buildFrontDecoration({
    panel: { id: '01-F', w: 597, h: 767, thickness: 22, cnc: { jpull: { edge: 'L', profile: { slotDepth: 40, slotR: 5 } } } },
    config: { ...defaultFrontDecoration('FL', P), grooveInsetMm: 20 }, style: 'FL', profile: P,
  });
  assert.equal(groove.problems.find((p) => p.code === 'FRONT_DECORATION_JPULL').message,
    'The decoration enters the J-pull machining zone. Increase its frame or margin.');
});

test('F15 after the review (b) · a bore wider than a reed always meets a valley, and the sentence says so', () => {
  // Horizontal reeds run to the hinge edge, over the cups (fi 35 against reeds of 20).
  const [door] = jBud('BUD', { grooveDirection: 'horizontal' }, { project_handle: { type: 'knob' } });
  const said = door.meta.frontDecoration.problems.filter((p) => p.code === 'FRONT_DECORATION_BACK_BORE');
  assert.ok(said.length > 0);
  assert.match(said[0].message, /over the back cup .*A bore 35 mm wide always meets a valley of reeds of 20 mm: keep the reeds clear of it \(the margin, or the other direction\), or choose a thicker front\.$/);
  // Vertical reeds keep the cups in the margin: the same door is cut.
  const [upright] = jBud('BUD', {}, { project_handle: { type: 'knob' } });
  assert.equal(upright.meta.frontDecoration.status, 'ready');
});
