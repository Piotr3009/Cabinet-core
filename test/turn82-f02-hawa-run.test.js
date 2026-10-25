/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// TURN 82 . F2 . THE POCKET IS A UNIT IN THE RUN (slice A3: the placement)
//
// The owner, 25.10.2026, 11:40: *"potrzebujemy zaprojektowac to jako
// wstawienie pomiedzy 2 panele 110 mm przestrzen pomiedzy, wysuwasz pocket
// door i zakrywasz szafke lub szafki"*.  CLAUDE.md T82 F2: *"The pocket is a
// unit: it is moved, numbered, listed and drawn by the roads every cabinet
// takes; `obstructs` treats it as a cabinet; a run's top infill, plinth,
// cornice and worktop span it as they span a cabinet."*  F3: *"by default the
// ONE unit next to the pocket on that side; the owner may add the next
// (*"zakrywasz szafke lub szafki"*) while TB stays within 440 to 750."*
//
// What is held here: the store's `addUnit` road for HAWA_POCKET (the hand by
// the side it was put on, `params.pocket` at birth, `covers` defaulting to
// the one neighbour on the hand), the pocket's run rows of `engine/runs.js`
// (`pocketNeighbours`, `pocketCoverSides`, `runPocketParams`), the run
// elements that span it (plinth, worktop, top infill, cornice), the store's
// pocket actions (`setPocket`, `setPocketCovers`, `pocketFiguresFor`), save
// and reload, and the right panel's POCKET DOOR section read from the source.
// The derived figures (TB, T1, M, E1, the class, the refusals) are A2's ONE
// engine function; this file never re-derives them, it only asks the store
// and checks they reach the panel.
//
// THE STAGE: a 5000 x 3000 room, 2500 high, the default profile (front 25,
// board 18, wall clearance 10, runGap 1, base units 770 on 100 legs).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { rectCorners } from '../src/engine/room.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { UNIT_NUM_PREFIX, getUnitType } from '../src/engine/types.js';
import * as runs from '../src/engine/runs.js';
import { useProjectStore, validateUnit } from '../src/stores/projectStore.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();
const unit = (id) => S().units.find((u) => u.id === id);
const POCKET = 'HAWA_POCKET';

/** The pocket's panel thickness for a front of `s` (F1(a): 22 under 19). */
function panelFor(s) {
  const min = Number(P.hawa?.panelMinMm) || 19;
  const thin = Number(P.hawa?.panelThinFrontMm) || 22;
  return s >= min ? s : thin;
}
/** The pocket's width: A + 55 + B (one door) or B + 110 + B (two doors). */
function pocketWidthFor(s, doors) {
  return 2 * panelFor(s) + (doors === 2 ? 110 : 55);
}

function room() {
  S().newProject();
  S().setRoom({ corners: rectCorners(5000, 3000), height: 2500 });
}

/** A BUD of `width` on wall 0 at `x`. */
function bud(x, width = 500) {
  const id = S().addUnit('BUD', { wall: 0, x }).id;
  S().updateUnitParams(id, { width });
  return id;
}

/** The resolved pocket element the run carries (state.runElements). */
const pocketElement = (id) => S().runElements?.[id]?.pocket ?? null;

// === 0 . THE KIT EXISTS ======================================================

test('T82 F2 . HAWA_POCKET is a kit of the room: a floor unit on legs, never a free panel', () => {
  const type = getUnitType(POCKET);
  assert.equal(type.id, POCKET, 'types.js has no HAWA_POCKET (A2, through INT)');
  assert.equal(type.mount, 'floor');
  assert.notEqual(type.freePanel, true, 'a pocket is a cabinet of the run, not a board in the room');
  assert.ok(runs.standsOnLegHeight(type), 'the pocket stands on the plinth line as a cabinet does');
  assert.equal(typeof UNIT_NUM_PREFIX[POCKET], 'string', 'the pocket has a number prefix of its own');
});

// === 1 . PLACED THROUGH addUnit, THE HAND BY THE SIDE =======================

test('T82 F2 . on the LEFT of a BUD the pocket stands butted, its door on the right covering the BUD', () => {
  room();
  const b = bud(1000);
  const res = S().addUnit(POCKET, { near: b, side: 'L' });
  assert.equal(res.error, null, res.error || '');
  const p = unit(res.id);
  assert.equal(p.position.wall, 0);
  const s = Number(p.params.front_t) || P.front.thickness;
  assert.equal(p.params.width, pocketWidthFor(s, 1), 'the one-door pocket is A + 55 + B');
  assert.ok(Math.abs(p.position.x_mm + p.params.width - unit(b).position.x_mm) <= P.autoParts.topInfill.runGap,
    'the pocket is butted onto the BUD');
  assert.deepEqual(
    { doors: p.params.pocket?.doors, hand: p.params.pocket?.hand, push: p.params.pocket?.push },
    { doors: 1, hand: 'R', push: true },
    'the pocket at the LEFT end of a run has its door on the right of it; Push by default (*"5 - tak"*)',
  );
  assert.ok(p.params.pocket.cls == null || [25, 35].includes(p.params.pocket.cls), 'cls null = auto (F3)');
  assert.deepEqual(p.params.pocket.covers, [b], 'the door covers the ONE unit on its hand by default');
  // Born matched: the run's height, the neighbours' legs, one top line.
  assert.equal(p.params.height, unit(b).params.height);
  assert.equal(runs.unitTop(p, P), runs.unitTop(unit(b), P), 'one top line, so one run');
});

test('T82 F2 . on the RIGHT of a BUD the hand is L', () => {
  room();
  const b = bud(1000);
  const p = S().addUnit(POCKET, { near: b, side: 'R' }).id;
  assert.equal(unit(p).params.pocket.hand, 'L');
  assert.deepEqual(unit(p).params.pocket.covers, [b]);
});

test('T82 F2 . a pocket born beside nothing covers nothing, and takes its neighbour when one arrives', () => {
  room();
  const p = S().addUnit(POCKET, { wall: 0, x: 1000 }).id;
  assert.deepEqual(unit(p).params.pocket.covers, [], 'nothing stands beside it yet');
  assert.equal(unit(p).params.pocket.hand, 'R', 'the documents draw the left-hand system: pocket left, door right');
  const b = S().addUnit('BUD', { near: p, side: 'R' }).id;
  assert.deepEqual(pocketElement(p)?.covers, [b], 'the run resolves the default neighbour on the hand');
});

// === 2 . NUMBERED AS EVERY CABINET IS ========================================

test('T82 F2 . numbered by its own prefix, the next free number, never a neighbour\'s', () => {
  room();
  const b = bud(1000);
  const p1 = S().addUnit(POCKET, { near: b, side: 'L' }).id;
  const b2 = S().addUnit('BUD', { near: b, side: 'R' }).id;
  const p2 = S().addUnit(POCKET, { near: b2, side: 'R' }).id;
  const prefix = UNIT_NUM_PREFIX[POCKET];
  assert.equal(unit(p1).params.unit_num, `${prefix}01`);
  assert.equal(unit(p2).params.unit_num, `${prefix}02`);
  const nums = S().units.map((u) => u.params.unit_num);
  assert.equal(new Set(nums).size, nums.length, 'two units wear one number');
});

// === 3 . THE RUN HOLDS IT ====================================================

/** BUD | pocket (door R over BUD2) | BUD2 on one run. */
function kitchenRun() {
  room();
  const b1 = bud(500);
  const p = S().addUnit(POCKET, { near: b1, side: 'R' }).id;
  S().setPocket(p, { hand: 'R' });
  const b2 = S().addUnit('BUD', { near: p, side: 'R' }).id;
  S().updateUnitParams(b2, { width: 500 });
  return { b1, p, b2 };
}

test('T82 F2 . levelGroups includes it: BUD, pocket and BUD stand in ONE run', () => {
  const { b1, p, b2 } = kitchenRun();
  const run = runs.buildRuns(S().units, P).find((r) => r.units.some((u) => u.id === p));
  assert.ok(run, 'the pocket is in no run');
  assert.deepEqual(run.units.map((u) => u.id), [b1, p, b2]);
  assert.deepEqual(runs.runMemberIds(S().units, p, P), [b1, p, b2]);
});

test('T82 F2 . the plinth is one length across the pocket', () => {
  const { b1, p, b2 } = kitchenRun();
  assert.equal(unit(p).params.plinth, true, 'the pocket is born with the plinth, as a standing cabinet is');
  const owner = S().runElements?.[b1]?.plinth;
  assert.equal(owner?.role, 'owner');
  assert.deepEqual(owner.unitIds, [b1, p, b2], 'the toe kick breaks at the pocket');
  const right = unit(b2).position.x_mm + unit(b2).params.width;
  assert.equal(owner.length, right - unit(b1).position.x_mm);
});

test('T82 F2 . the worktop goes over the pocket as over any unit', () => {
  const { b1, p, b2 } = kitchenRun();
  const res = S().addWorktop([b1, p, b2]);
  assert.equal(res.ok, true, res.error || '');
  const [w] = S().worktopsOf();
  assert.ok(w?.geometry, 'no worktop resolved');
  assert.deepEqual(w.geometry.unitIds, [b1, p, b2], 'the slab lies on the pocket too');
  const left = unit(b1).position.x_mm;
  const right = unit(b2).position.x_mm + unit(b2).params.width;
  assert.ok(w.geometry.x <= left && w.geometry.x + w.geometry.w >= right, 'the slab spans the whole run');
});

test('T82 F2 . a wardrobe run: the top infill and the cornice run over the pocket', () => {
  room();
  const w1 = S().addUnit('WARDROBE', { wall: 0, x: 500, params: { width: 600 } }).id;
  const p = S().addUnit(POCKET, { near: w1, side: 'R' }).id;
  S().setPocket(p, { hand: 'R' });
  const w2 = S().addUnit('WARDROBE', { near: p, side: 'R', params: { width: 600 } }).id;
  assert.equal(runs.unitTop(unit(p), P), runs.unitTop(unit(w1), P), 'the pocket is born at the wardrobe height');
  S().setCornice(w1, 70);
  const el = S().runElements?.[w1];
  assert.deepEqual(el?.top_infill?.unitIds, [w1, p, w2], 'the top infill breaks at the pocket');
  assert.deepEqual(el?.cornice?.unitIds, [w1, p, w2], 'the cornice breaks at the pocket');
});

// === 4 . OBSTRUCTS AS A CABINET ==============================================

test('T82 F2 . the pocket holds a cabinet off as a cabinet does', () => {
  const { b1, p } = kitchenRun();
  // Dragging BUD 1 right into the pocket stops at the pocket's edge.
  S().moveUnit(b1, unit(p).position.x_mm + 50, 1);
  assert.ok(unit(b1).position.x_mm + unit(b1).params.width <= unit(p).position.x_mm + 1e-6,
    'the BUD drove into the pocket');
  // A BUD asked at the pocket's own x is refused, never dropped in it.
  const res = S().addUnit('BUD', { wall: 0, x: unit(p).position.x_mm });
  assert.equal(res.id, null);
  assert.match(res.error, /no room/i);
  // The Check sees no overlap on either.
  for (const id of [b1, p]) {
    const u = unit(id);
    const issues = validateUnit(u, S().unitResult(id), { room: S().project.room, units: S().units, wallSlopes: S().project.wallSlopes });
    assert.ok(!issues.some((i) => i.code === 'UNIT_OVERLAP'), `${u.params.unit_num} overlaps`);
  }
});

test('T82 F2 . moved, it moves as a unit; its door follows what stands beside it', () => {
  const { b1, p, b2 } = kitchenRun();
  assert.deepEqual(pocketElement(p)?.covers, [b2]);
  assert.equal(S().setPocketCovers(p, [b2]).ok, true, 'the owner names BUD 2 himself');
  // BUD 2 dragged away: the door covers nothing on that side any more.
  S().moveUnit(b2, unit(b2).position.x_mm + 800, 1);
  assert.deepEqual(pocketElement(p)?.covers, [], 'a door cannot cover a cabinet a gap away');
  assert.deepEqual(unit(p).params.pocket.covers, [b2], 'the owner\'s choice is kept, only the run resolves it');
  // Back against the pocket: covered again.
  S().moveUnit(b2, unit(p).position.x_mm + unit(p).params.width, 1);
  assert.deepEqual(pocketElement(p)?.covers, [b2]);
  void b1;
});

// === 5 . TWO DOORS, ONE UNIT EACH SIDE =======================================

test('T82 F2 . the two-door pocket covers one unit each side and has no hand', () => {
  room();
  const left = bud(500);
  const p = S().addUnit(POCKET, { near: left, side: 'R', params: { pocket: { doors: 2 } } }).id;
  const right = S().addUnit('BUD', { near: p, side: 'R' }).id;
  S().updateUnitParams(right, { width: 500 });
  const u = unit(p);
  const s = Number(u.params.front_t) || P.front.thickness;
  assert.equal(u.params.width, pocketWidthFor(s, 2), 'the two-door pocket is B + 110 + B');
  assert.equal(u.params.pocket.doors, 2);
  assert.equal(u.params.pocket.hand ?? null, null, 'one door each side: no hand');
  assert.deepEqual(runs.pocketCoverSides(S().units, u, P), { L: [left], R: [right] });
  assert.deepEqual(pocketElement(p)?.covers, [left, right]);
});

test('T82 F2 . one door to two: setPocket widens the pocket through the room, or refuses in words', () => {
  const { b1, p, b2 } = kitchenRun();
  const before = unit(p).params.width;
  const res = S().setPocket(p, { doors: 2 });
  // b1 and b2 are butted on both sides: the pocket cannot grow without moving them.
  if (res.ok) {
    assert.ok(unit(p).params.width > before);
  } else {
    assert.equal(typeof res.error, 'string');
    assert.ok(res.error.length > 0, 'a refusal with no words');
    assert.equal(unit(p).params.width, before, 'refused, and still changed');
    assert.equal(unit(p).params.pocket.doors, 1);
  }
  void b1; void b2;
});

// === 6 . "ZAKRYWASZ SZAFKE LUB SZAFKI" =======================================

test('T82 F2 / F3 . the owner adds the next unit to the door while TB stays in 440 to 750', () => {
  room();
  const p = S().addUnit(POCKET, { wall: 0, x: 500 }).id;
  const a = S().addUnit('BUD', { near: p, side: 'R' }).id;
  S().updateUnitParams(a, { width: 300 });
  const b = S().addUnit('BUD', { near: a, side: 'R' }).id;
  S().updateUnitParams(b, { width: 300 });
  const c = S().addUnit('BUD', { near: b, side: 'R' }).id;
  S().updateUnitParams(c, { width: 300 });
  assert.deepEqual(pocketElement(p)?.covers, [a], 'the default is the one unit beside it');
  const two = S().setPocketCovers(p, [a, b]);
  assert.equal(two.ok, true, two.error || '');
  assert.deepEqual(unit(p).params.pocket.covers, [a, b]);
  const fig = S().pocketFiguresFor(p);
  const tb = fig?.doors?.[0]?.TB;
  assert.ok(tb >= 440 && tb <= 750, `TB ${tb} outside 440 to 750`);
  assert.deepEqual(fig.doors[0].covers, [a, b], 'the engine cut the door over both');
  // A third 300 takes the door past 750: refused in words, nothing changed.
  const three = S().setPocketCovers(p, [a, b, c]);
  assert.equal(three.ok, false);
  assert.match(three.error, /750/);
  assert.deepEqual(unit(p).params.pocket.covers, [a, b], 'refused, and still changed');
  // Covers must be a chain from the pocket: skipping a unit is refused.
  const skip = S().setPocketCovers(p, [b]);
  assert.equal(skip.ok, false);
});

test('T82 F2 . the figures the panel shows come from the store, which asks the engine once', () => {
  const { p } = kitchenRun();
  const fig = S().pocketFiguresFor(p);
  assert.ok(fig, 'pocketFiguresFor gives nothing');
  assert.deepEqual(fig, S().unitResult(p).hawa, 'the figures are the engine\'s own result.hawa');
  const [door] = fig.doors;
  for (const k of ['TB', 'T1', 'M', 'E1']) assert.equal(typeof door[k], 'number', `${k} missing`);
  assert.equal(unit(p).params.width, fig.widthMm, 'params.width is the figures\' widthMm, never typed');
  assert.equal(unit(p).params.depth, fig.KT, 'params.depth is the figures\' KT');
  assert.equal(runs.wallGapOf(unit(p), P), runs.wallGapOf(unit(door.covers[0] ? S().units.find((u) => u.id === door.covers[0]) : null), P) + fig.frontAlignMm,
    'the pocket\'s front plane is the covered cabinet\'s');
});

// === 7 . SAVE AND RELOAD =====================================================

test('T82 F2 . save and reload keeps params.pocket, and the run resolves it the same', () => {
  const { p, b2 } = kitchenRun();
  S().setPocket(p, { push: false, cls: 35 });
  const before = JSON.parse(JSON.stringify(unit(p).params.pocket));
  const saved = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
  S().newProject();
  S().loadProject(saved.project, saved.units);
  assert.deepEqual(unit(p).params.pocket, before);
  assert.deepEqual(pocketElement(p)?.covers, [b2]);
  // An old project (no pocket anywhere) opens with no pocket element at all.
  room();
  bud(500);
  const old = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
  S().loadProject(old.project, old.units);
  assert.ok(Object.values(S().runElements || {}).every((e) => !e?.pocket));
});

// === 8 . THE RUN ROWS ARE PURE ==============================================

test('T82 F2 . runs.js: the pocket rows are pure functions of the units', () => {
  for (const name of ['pocketNeighbours', 'pocketCoverSides', 'runPocketParams']) {
    assert.equal(typeof runs[name], 'function', `runs.js has no ${name}`);
  }
  const { b1, p, b2 } = kitchenRun();
  const n = runs.pocketNeighbours(S().units, unit(p), P);
  assert.deepEqual(n.L.map((u) => u.id), [b1]);
  assert.deepEqual(n.R.map((u) => u.id), [b2]);
  const map = runs.runPocketParams(S().units, P);
  assert.ok(map instanceof Map);
  assert.deepEqual(map.get(p)?.covers, [b2]);
  assert.equal(map.get(b1) ?? null, null, 'a cabinet carries no pocket element');
  const src = read('src/engine/runs.js');
  assert.doesNotMatch(src, /from '\.\.\/stores\//, 'runs.js stays pure');
});

// === 9 . THE RIGHT PANEL: POCKET DOOR =======================================

test('T82 F2 . RightPanel has the POCKET DOOR section, its figures read off the store, never re-derived', () => {
  const src = read('src/components/RightPanel.jsx');
  assert.match(src, /data-section="Pocket door"/);
  for (const hook of ['setPocket', 'setPocketCovers', 'pocketFiguresFor']) {
    assert.match(src, new RegExp(`useProjectStore\\(\\(s\\) => s\\.${hook}\\)`), `the panel does not read ${hook}`);
  }
  for (const word of ['Doors', 'Hand', 'Push', 'Pull', 'III/25', 'III/35', 'Door covers']) {
    assert.ok(src.includes(word), `the section has no "${word}"`);
  }
  // The figures are A2's: no HAWA arithmetic in the panel.
  const section = src.slice(src.indexOf('function PocketDoorSection'));
  assert.ok(section.length > 0, 'no PocketDoorSection');
  assert.doesNotMatch(section.slice(0, 6000), /\+ 92|TB - M|- 320/, 'the panel re-derives a HAWA figure');
});

// === 10 . AFTER THE REVIEW OF PART A =========================================
//
// Four faults the adversarial review of PART A reproduced (verify:store:0 to 3)
// and CLAUDE.md's own laws decide: *"the room refuses in words, the engine
// never squashes"*, *"never a silent change of the door the owner asked
// for"*, *"the pocket's and the cabinets' front edges in one plane"* (F3).

/** Every pair of units on wall 0 whose carcasses overlap along it, by number. */
function overlapsOnWall() {
  const us = S().units.filter((u) => (u.position?.wall ?? 0) === 0 && getUnitType(u.type).mount === 'floor');
  const out = [];
  for (let i = 0; i < us.length; i += 1) {
    for (let j = i + 1; j < us.length; j += 1) {
      const a = us[i];
      const b = us[j];
      const ov = Math.min(a.position.x_mm + a.params.width, b.position.x_mm + b.params.width)
        - Math.max(a.position.x_mm, b.position.x_mm);
      if (ov > 1e-6) out.push([a.params.unit_num, b.params.unit_num, ov]);
    }
  }
  return out;
}
const rightOf = (id) => unit(id).position.x_mm + unit(id).params.width;

test('T82 F2, after the review (store:0) . the share-out lays the run out AROUND the pocket: its width is worked out, never shared', () => {
  S().newProject();
  S().setRoom({ corners: rectCorners(1500, 3000), height: 2500 });
  const w1 = S().addUnit('WARDROBE', { wall: 0, x: 500, params: { width: 500 } }).id;
  S().moveUnit(w1, -100, 0);
  const p = S().addUnit(POCKET, { near: w1, side: 'R' }).id;
  S().setPocket(p, { hand: 'R' });
  const w2 = S().addUnit('WARDROBE', { near: p, side: 'R', params: { width: 500 } }).id;
  const width = unit(p).params.width;
  assert.deepEqual(pocketElement(p)?.covers, [w2]);
  const view = S().shareOutView(w2);
  assert.ok(view?.plan, 'the stage offers no share-out (the gap is the review\'s 355)');
  const res = S().shareOutRun(w2);
  assert.equal(res.ok, true, res.message || '');
  assert.equal(unit(p).params.width, width, 'the share-out changed the pocket\'s width');
  const tol = P.autoParts.topInfill.runGap + 1e-6;
  assert.ok(Math.abs(rightOf(w1) - unit(p).position.x_mm) <= tol, 'a hole opened left of the pocket');
  assert.ok(Math.abs(rightOf(p) - unit(w2).position.x_mm) <= tol, 'a hole opened right of the pocket');
  assert.deepEqual(overlapsOnWall(), []);
  assert.deepEqual(pocketElement(p)?.covers, [w2], 'the covered wardrobe lost its door');
});

/** BUD 500 | pocket | BUD 500 at front `from`, the pocket's doors and hand as asked. */
function frontStage(from, doors, hand = 'R', { leftAtWall = false } = {}) {
  room();
  S().setSlotThickness('front1', { measured: from });
  const b1 = bud(500);
  if (leftAtWall) S().moveUnit(b1, -1000, 0);
  const p = S().addUnit(POCKET, { near: b1, side: 'R', params: { pocket: { doors, hand } } }).id;
  const b2 = S().addUnit('BUD', { near: p, side: 'R' }).id;
  S().updateUnitParams(b2, { width: 500 });
  return { b1, p, b2 };
}
const runOf = (id) => runs.buildRuns(S().units, P).find((r) => r.units.some((u) => u.id === id)).units.map((u) => u.id);

test('T82 F2, after the review (store:1) . a new front re-cuts the pocket through the room: the neighbours move, nothing overlaps, no gap opens, no door drops', () => {
  for (const doors of [1, 2]) {
    for (const [from, to] of [[18, 25], [25, 18]]) {
      const { b1, p, b2 } = frontStage(from, doors);
      const covers = pocketElement(p)?.covers;
      const said = `doors ${doors}, front ${from} to ${to}`;
      S().setSlotThickness('front1', { measured: to });
      assert.equal(unit(p).params.width, pocketWidthFor(to, doors), `${said}: the pocket kept its old width`);
      assert.deepEqual(overlapsOnWall(), [], `${said}: a cabinet stands in another`);
      assert.deepEqual(runOf(p), [b1, p, b2], `${said}: the run broke at the pocket`);
      assert.deepEqual(pocketElement(p)?.covers, covers, `${said}: a door dropped`);
      assert.equal(S().pocketFiguresFor(p).doors.length, doors, `${said}: the engine cut ${S().pocketFiguresFor(p).doors.length} doors`);
    }
  }
});

test('T82 F2, after the review (store:1) . no room to re-cut: nothing overlaps, the width stays, and the Check says why in words', () => {
  // BUD 01 pressed against the left wall's stop; the one-door pocket (hand R)
  // keeps its right edge, so growing it has to push 01 into the wall.
  const { b1, p, b2 } = frontStage(18, 1, 'R', { leftAtWall: true });
  const before = unit(p).params.width;
  S().setSlotThickness('front1', { measured: 25 });
  assert.deepEqual(overlapsOnWall(), [], 'the re-cut drove the pocket into 01');
  assert.equal(unit(p).params.width, before, 'refused, and still changed');
  assert.deepEqual(runOf(p), [b1, p, b2]);
  const said = S().runChecks().filter((f) => f.unitId === p && f.check === 37);
  assert.ok(said.some((f) => /no room/i.test(f.message) && f.message.includes(unit(p).params.unit_num)),
    `no Check sentence: ${JSON.stringify(said.map((f) => f.message))}`);
  // Room made beside it: the pocket re-cuts itself on the next refresh.
  S().updateUnitParams(b1, { width: 480 });
  assert.equal(unit(p).params.width, pocketWidthFor(25, 1), 'room was made and the pocket did not follow');
  assert.deepEqual(overlapsOnWall(), []);
});

test('T82 F2, after the review (store:2) . two pockets cannot both close one cabinet: the first keeps it, the second is refused in words', () => {
  room();
  const w = S().addUnit('WARDROBE', { wall: 0, x: 1000, params: { width: 600 } }).id;
  const p1 = S().addUnit(POCKET, { near: w, side: 'L' }).id;
  const p2 = S().addUnit(POCKET, { near: w, side: 'R' }).id;
  assert.equal(unit(p1).params.pocket.hand, 'R');
  assert.equal(unit(p2).params.pocket.hand, 'L');
  assert.deepEqual(pocketElement(p1)?.covers, [w], 'the first pocket keeps its cabinet');
  assert.deepEqual(pocketElement(p2)?.covers, [], 'the second pocket still covers the first one\'s cabinet');
  assert.deepEqual(S().runElements?.[w]?.pocket, {
    role: 'covered', pocketId: p1, unitNum: unit(p1).params.unit_num, side: 'R',
  });
  // One door is cut over it, not two.
  assert.equal(S().pocketFiguresFor(p1).doors.length, 1);
  assert.equal(S().pocketFiguresFor(p2).doors.length, 0, 'a second HAWA door is cut over the same wardrobe');
  // The refusal is said: in the element, in the Check, by setPocketCovers.
  const [refused] = pocketElement(p2)?.refused || [];
  assert.deepEqual({ unitId: refused?.unitId, by: refused?.by }, { unitId: w, by: p1 });
  const num = (id) => unit(id).params.unit_num;
  const said = S().runChecks().filter((f) => f.unitId === p2 && f.check === 37);
  assert.ok(said.some((f) => f.message.includes(num(w)) && f.message.includes(num(p1))),
    `no Check sentence: ${JSON.stringify(said.map((f) => f.message))}`);
  const res = S().setPocketCovers(p2, [w]);
  assert.equal(res.ok, false);
  assert.ok(res.error.includes(num(p1)), res.error);
  // The first pocket's door turned away: the second may take the cabinet.
  assert.equal(S().setPocket(p1, { hand: 'L' }).ok, true);
  assert.deepEqual(pocketElement(p2)?.covers, [w], 'freed, the cabinet is not offered to the second pocket');
  assert.deepEqual(pocketElement(p2)?.refused || [], []);
});
