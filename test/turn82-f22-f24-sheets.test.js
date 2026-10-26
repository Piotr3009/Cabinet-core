/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F22 · HANDLES ON THE SHEETS, AND F24 · ONE DASHED LINE FOR THE PLINTH
//
// The owner, 24.10.2026 (19:34), over the T81 set: *"nie widac wogole zeby
// bylo jakiekolwiek handles nic, przerywana linia tez nie, bedzie jedna linia
// typu przerywana a nie podwojna bo to mylace bardzo jest"*.
//
// CLAUDE.md T82 F22: "when the project has no handle chosen, the fronts sheet
// draws the project's DEFAULT handle (the profile's `handles.default`, a knob
// of 30) at the engine's position, on the HANDLES layer, so a sheet never
// shows a front with nothing to pull (push-to-open projects say so in
// Settings: `handles: 'none'` is a choice, not an absence, and draws
// nothing). The drill summary is untouched."
//
// CLAUDE.md T82 F24: "on a plan, a board hidden under the cut that is SEEN
// EDGE-ON (the plinth, a rail) is one dashed line at its face toward the
// room, on a layer of its own, `PLINTH_HIDDEN` (one ink one layer), grey,
// FINE pen, dash as the HIDDEN role; the shelves keep their layer. The legend
// row follows."

import test from 'node:test';
import assert from 'node:assert/strict';

import { S, t81Kitchen, setArgs } from '../scripts/t81-kitchen.mjs';
import { getCabinetProfile } from '../src/engine/profile.js';
import { getUnitType } from '../src/engine/types.js';
import { handleClassOf, handleReference } from '../src/engine/handles.js';
import { frontOpeningPatch } from '../src/lib/frontOpening.js';
import { DRAWING_LAYERS, LAYER_ORDER } from '../src/engine/drawings/layers.js';
import { projectRun, sheetDefaultHandle } from '../src/engine/drawings/projector.js';
import { wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { wallGroups } from '../src/engine/drawings/wallElevation.js';
import { buildRunElevation, worktopsOnWall } from '../src/engine/drawings/setElevation.js';
import { drawingContext, SET_LEGEND } from '../src/engine/drawings/setSheet.js';
import { buildPlan, planWalls } from '../src/engine/drawings/setPlan.js';
import { rectCorners, roomWalls } from '../src/engine/room.js';
import { wallGapOf } from '../src/engine/runs.js';

const P = () => getCabinetProfile();
const ctx = () => drawingContext(20, P());
const near = (a, b, eps = 0.01) => Math.abs(a - b) <= eps;
const notLegend = (e) => e.meta !== 'legend';

/** The engine's own point for a knob on this front, had one been chosen (engine/handles.js). */
function enginePoint(m, p) {
  const handleClass = handleClassOf(p, getUnitType(m.unit.type));
  if (!handleClass) return null;
  const ref = handleReference({
    panel: p, handleClass, hinge: p.meta?.hinge || m.result.params.hinge || 'L', frame: p.meta?.shaker?.frame ?? null,
  }, P());
  // Out of the front's cut frame (origin bottom-right, x running left) as the room mirrors it.
  return [m.x + p.box.x + p.box.w - ref.x, m.base + p.box.y + ref.y];
}

/** The fronts elevation of wall A, in drawing mm, with the set's own default handle. */
function frontsOf(a, mode = 'fronts') {
  const group = wallGroups(a.entries, P())[0];
  const sheet = buildRunElevation(group, {
    mode, room: a.room, worktops: worktopsOnWall(a.worktops, 0), frontTypeOf: a.frontTypeOf, profile: P(), ctx: ctx(),
    defaultHandle: sheetDefaultHandle(a.design, P()),
  });
  return { group, sheet };
}

// ═══ F22 · HANDLES ON THE SHEETS ═══════════════════════════════════════════

test('F22 · the profile names the default handle: a knob, drawn at 30', () => {
  assert.deepEqual(P().handles.default, { type: 'knob' });
  assert.equal(P().handles.knob.diameter, 30);
  assert.equal(P().drawings.knobDiameter, 30);
});

test('F22 · which handle a sheet draws when the engine fitted none: the default, unless the project chose', () => {
  const D = (over = {}) => ({ fronts: { handle: null, style: 'F' }, runners: { variant: null }, hardware: { handles: null }, ...over });
  assert.deepEqual(sheetDefaultHandle(D(), P()), { type: 'knob', centres: 0 }, 'nothing chosen: the default knob');
  assert.deepEqual(sheetDefaultHandle(null, P()), { type: 'knob', centres: 0 }, 'no design at all: the default knob');
  // A handle chosen is the engine's answer, drawn where the engine drills it (or, for a J, not drawn).
  for (const type of ['knob', 'bar', 'jpull']) assert.equal(sheetDefaultHandle(D({ fronts: { handle: { type } } }), P()), null, type);
  assert.equal(sheetDefaultHandle(D({ fronts: { handle: null, style: 'HJ' } }), P()), null, 'a legacy J-pull project');
  // 'none' is a choice: push-to-open as Settings writes it, or the hardware block's own word.
  assert.equal(sheetDefaultHandle(D({ runners: { variant: 'T' } }), P()), null, 'push-to-open (TIP-ON)');
  assert.equal(sheetDefaultHandle(D({ hardware: { handles: 'none' } }), P()), null, "handles: 'none'");
  assert.deepEqual(sheetDefaultHandle(D({ runners: { variant: 'S' } }), P()), { type: 'knob', centres: 0 }, 'soft-close runners and no handle: not a choice of none');
  // A workshop whose default is none draws nothing.
  const none = { ...P(), handles: { ...P().handles, default: 'none' } };
  assert.equal(sheetDefaultHandle(D(), none), null);
  const bar = { ...P(), handles: { ...P().handles, default: { type: 'bar', centres: 160 } } };
  assert.deepEqual(sheetDefaultHandle(D(), bar), { type: 'bar', centres: 160 });
});

test('F22 · no handle chosen: a knob of 30 on every front, at the engine\'s point, on HANDLES; the drill summary untouched', () => {
  for (const inframe of [true, false]) {
    t81Kitchen({ inframe, knob: false });
    const a = setArgs();
    for (const e of a.entries) assert.deepEqual(e.result.drillSummary?.handles || [], [], `${e.unit.params.unit_num}: the engine drills no handle`);
    const { group, sheet } = frontsOf(a);
    const circles = sheet.entities.filter((e) => e.kind === 'circle' && e.layer === 'HANDLES');
    let expected = 0;
    for (const m of group.members) {
      for (const p of m.result.panels.filter((q) => q.box && q.role === 'front')) {
        const at = enginePoint(m, p);
        if (!at) continue;
        expected += 1;
        assert.ok(circles.some((c) => near(c.cx, at[0]) && near(c.cy, at[1]) && near(c.r, 15) && c.defaultHandle === true && c.handle === 'knob'),
          `${m.unit.params.unit_num} ${p.id}: the default knob at ${at}`);
      }
    }
    assert.equal(expected, 6, 'two single doors, a pair, two drawer fronts');
    assert.equal(circles.length, expected, 'one knob per front, nothing else on the layer');
    // The engine's position, proven against the engine itself: the same kitchen
    // with the knob CHOSEN drills its knobs exactly where the default stands.
    t81Kitchen({ inframe, knob: true });
    const chosen = frontsOf(setArgs()).sheet.entities.filter((e) => e.kind === 'circle' && e.layer === 'HANDLES');
    const key = (c) => `${c.cx.toFixed(2)},${c.cy.toFixed(2)}`;
    assert.deepEqual(circles.map(key).sort(), chosen.map(key).sort(), 'where the engine would drill them');
  }
});

test('F22 · the default rides where a chosen knob rides: fronts and X-ray; never on the 3D, the sheet without fronts, the plans or the sections', () => {
  t81Kitchen({ inframe: false, knob: false });
  const sheets = wallDrawingSheets(setArgs());
  const knobs = (variant) => sheets.filter((s) => s.variant === variant)
    .flatMap((s) => s.sheet.entities.filter((e) => e.layer === 'HANDLES' && notLegend(e)));
  assert.equal(knobs('fronts').filter((e) => e.kind === 'circle').length, 6);
  assert.equal(knobs('xray').filter((e) => e.kind === 'circle').length, 6);
  for (const v of ['3d', 'no-fronts', 'plan-base', 'plan-wall', 'sections']) assert.equal(knobs(v).length, 0, v);
});

test('F22 · a front opened by a push of its own takes no default: the one predicate a pushed kit (HAWA) answers', () => {
  t81Kitchen({ inframe: false, knob: false });
  const a = setArgs();
  const group = wallGroups(a.entries, P())[0];
  const m = group.members.find((x) => x.unit.type === 'BUD' && x.result.panels.filter((p) => p.part === 'FRONT').length === 1);
  const door = m.result.panels.find((p) => p.part === 'FRONT');
  const run = (members) => projectRun({ ...group, members }, { view: 'front', mode: 'fronts', profile: P(), defaultHandle: sheetDefaultHandle(a.design, P()) })
    .entities.filter((e) => e.layer === 'HANDLES' && e.src === `${m.unit.id}:${door.id}`);
  assert.equal(run([m]).length, 1, 'the door takes the knob');
  const pushed = { ...m, result: { ...m.result, panels: m.result.panels.map((p) => (p.id === door.id ? { ...p, meta: { ...p.meta, push: true } } : p)) } };
  assert.equal(run([pushed]).length, 0, 'a door that says push takes none');
  const pocket = { ...m, unit: { ...m.unit, params: { ...m.unit.params, pocket: { doors: 1, push: true } } } };
  assert.equal(run([pocket]).length, 0, 'nor a unit whose pocket says push');
  const other = { ...m, result: { ...m.result, panels: m.result.panels.map((p) => (p.id === door.id ? { ...p, role: 'pocket_door' } : p)) } };
  assert.equal(run([other]).length, 0, 'a role outside the house fronts takes none');
});

test('F22 · push-to-open said in Settings is a choice: not one handle on any sheet', () => {
  t81Kitchen({ inframe: false, knob: false });
  S().setDesign(frontOpeningPatch(S().project.design, 'push'));
  const a = setArgs();
  assert.equal(sheetDefaultHandle(a.design, P()), null);
  for (const s of wallDrawingSheets(a)) {
    assert.equal(s.sheet.entities.filter((e) => e.layer === 'HANDLES' && notLegend(e)).length, 0, s.name);
  }
});

test('F22 · a chosen knob is the engine\'s, as T81 drew it: one circle per drilled knob, none of them the default', () => {
  t81Kitchen({ inframe: false, knob: true });
  const a = setArgs();
  const { group, sheet } = frontsOf(a);
  const drilled = group.members.reduce((t, m) => t + (m.result.drillSummary?.handles || []).reduce((k, h) => k + h.holes.length, 0), 0);
  const circles = sheet.entities.filter((e) => e.kind === 'circle' && e.layer === 'HANDLES');
  assert.equal(drilled, 6);
  assert.equal(circles.length, drilled);
  assert.ok(circles.every((c) => !c.defaultHandle));
});

// AFTER THE REVIEW (verify:sheets:2): the default is only for a front with
// nothing to pull. A front the owner gave a handle of its own (DoorModal's
// per-front handle, a J-pull with "apply to all" unticked, a handleless
// shape) takes none, whatever the project says.
test('F22 · a front with its own handle takes no default knob: its own J-pull, its own bar; a plain door beside it still does', () => {
  const sheetsOf = () => {
    const a = setArgs();
    const sheets = wallDrawingSheets(a);
    return { a, fronts: sheets.find((s) => s.variant === 'fronts').sheet, xray: sheets.find((s) => s.variant === 'xray').sheet };
  };
  const knobsOn = (sheet, src) => sheet.entities.filter((e) => e.layer === 'HANDLES' && e.src === src && notLegend(e));
  for (const own of [{ type: 'jpull' }, { type: 'bar', centres: 128 }]) {
    const ids = t81Kitchen({ inframe: false, knob: false });
    S().setFrontHandle(ids.a, '01-F', own);
    const { a, fronts, xray } = sheetsOf();
    assert.deepEqual(sheetDefaultHandle(a.design, P()), { type: 'knob', centres: 0 }, 'the project chose none');
    const door = `${ids.a}:01-F`;
    const result = a.entries.find((e) => e.unit.id === ids.a).result;
    const leaf = result.panels.find((p) => p.id === '01-F');
    if (own.type === 'jpull') {
      assert.ok(leaf.meta.jpull, 'the engine machines the J on that door');
      assert.equal(knobsOn(fronts, door).length, 0, 'its own J-pull: no knob on the fronts sheet');
      assert.equal(knobsOn(xray, door).length, 0, '...nor on the X-ray');
    } else {
      // Its own bar is the engine's, drawn where it is drilled: a bar on two fixings, never the default.
      const got = knobsOn(fronts, door);
      assert.equal(got.filter((e) => e.handle === 'bar').length, 1, 'its own bar');
      assert.ok(got.every((e) => !e.defaultHandle), 'no default beside it');
    }
    // The plain door beside it, with nothing to pull, still takes the default.
    const pair = a.entries.find((e) => e.unit.id === ids.b).result.panels.find((p) => p.id.endsWith('-FL'));
    const plain = knobsOn(fronts, `${ids.b}:${pair.id}`);
    assert.equal(plain.length, 1, 'a plain door: one knob');
    assert.ok(plain[0].defaultHandle && plain[0].handle === 'knob');
  }
});

test('F22 · a handleless shape is its own pull: a J-type or J-groove front takes no default', () => {
  for (const style of ['HJ', 'H']) {
    const ids = t81Kitchen({ inframe: false, knob: false });
    S().updateUnitParams(ids.a, { front_type: style });
    const a = setArgs();
    const leaf = a.entries.find((e) => e.unit.id === ids.a).result.panels.find((p) => p.id === '01-F');
    assert.equal(leaf.meta.frontType, style, `the door is cut ${style}`);
    const { sheet } = frontsOf(a);
    assert.equal(sheet.entities.filter((e) => e.layer === 'HANDLES' && e.src === `${ids.a}:01-F`).length, 0, `${style}: no knob`);
    assert.equal(sheet.entities.filter((e) => e.layer === 'HANDLES' && e.defaultHandle).length, 5, `${style}: the other five fronts keep theirs`);
  }
});

// ═══ F24 · ONE DASHED LINE FOR THE PLINTH ══════════════════════════════════

test('F24 · PLINTH_HIDDEN: a layer of its own, grey, the FINE pen, dashed as the HIDDEN role, an ink nobody else wears', () => {
  const L = DRAWING_LAYERS.PLINTH_HIDDEN;
  assert.ok(L, 'on the table');
  assert.equal(L.pen, 'FINE');
  assert.match(L.colour, /^#([0-9A-Fa-f]{2})\1\1$/, 'a grey');
  assert.deepEqual(L.dash, DRAWING_LAYERS.SHELVES.dash, 'the hidden role\'s dash');
  for (const [name, other] of Object.entries(DRAWING_LAYERS)) {
    if (name !== 'PLINTH_HIDDEN') assert.notEqual(other.colour.toLowerCase(), L.colour.toLowerCase(), `${name} wears another ink`);
  }
  assert.ok(LAYER_ORDER.includes('PLINTH_HIDDEN'), 'in the pen order');
  // The shelves keep their layer.
  assert.deepEqual([DRAWING_LAYERS.SHELVES.colour, DRAWING_LAYERS.SHELVES.pen], ['#009A3D', 'HIDDEN']);
});

test('F24 · the base plan: each plinth board is ONE dashed line at its face toward the room, on PLINTH_HIDDEN, hiding nothing', () => {
  for (const inframe of [true, false]) {
    const ids = t81Kitchen({ inframe });
    const a = setArgs();
    const plan = buildPlan(a.entries, { which: 'base', room: a.room, worktops: a.worktops.map((w) => w.geometry || w), profile: P(), ctx: ctx(), frontTypeOf: a.frontTypeOf });
    // T83 F10 (*"przekroj z gory pokazuje jakby logike z dolu czyli lustrzane odbicie, sprawdz dokladnie"*): the wall in the plan's own frame, looking down.
    const wall = planWalls(roomWalls(a.room))[0];
    const at = (u, v) => [wall.start.x + wall.along.x * u + wall.inward.x * v, wall.start.y + wall.along.y * u + wall.inward.y * v];
    const e = a.entries.find((x) => x.unit.id === ids.a);
    const boards = e.result.panels.filter((p) => p.box && p.role === 'plinth');
    assert.ok(boards.length >= 1, 'the run has its plinth');
    for (const pl of boards) {
      const mine = plan.entities.filter((x) => x.src === `${ids.a}:${pl.id}`);
      assert.equal(mine.length, 1, `${pl.id}: one line, not two (${mine.length})`);
      const [l] = mine;
      assert.deepEqual([l.kind, l.layer, l.pen, l.hidden], ['line', 'PLINTH_HIDDEN', 'FINE', true]);
      // Its face toward the room: the far face from the wall, along the whole board.
      const v = wallGapOf(e.unit, P()) + pl.box.z + pl.box.d;
      const u0 = Number(e.unit.position.x_mm) + pl.box.x;
      const ends = [at(u0, v), at(u0 + pl.box.w, v)];
      const got = [[l.x1, l.y1], [l.x2, l.y2]].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
      ends.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
      for (let k = 0; k < 2; k += 1) assert.ok(near(got[k][0], ends[k][0]) && near(got[k][1], ends[k][1]), `${pl.id}: ${got[k]} is ${ends[k]}`);
    }
    assert.equal(plan.entities.filter((x) => x.layer === 'SHELVES' && boards.some((pl) => x.src === `${ids.a}:${pl.id}`)).length, 0, 'not on the shelves\' layer');
    assert.equal(plan.entities.filter((x) => x.layer === 'MASK' && boards.some((pl) => x.src === `${ids.a}:${pl.id}`)).length, 0, 'and it hides nothing');
    // Nowhere else: the elevations carry no plinth line of this ink.
    const sheets = wallDrawingSheets(a);
    for (const s of sheets.filter((x) => !String(x.variant).startsWith('plan'))) {
      assert.equal(s.sheet.entities.filter((x) => x.layer === 'PLINTH_HIDDEN' && notLegend(x)).length, 0, s.name);
    }
  }
});

test('F24 · a true L: each arm\'s toe kick is one line, at the face that looks at the open floor', () => {
  for (const doors of [true, false]) {
    S().newProject('T82 F24 L');
    S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
    const left = S().addUnit('CORNER_L_BASE', { wall: 0, x: 0 }).id;
    const right = S().addUnit('CORNER_L_BASE', { wall: 0, x: 3100 }).id;
    S().updateUnitParams(left, { plinth: true, corner_side: 'left', doors });
    S().updateUnitParams(right, { plinth: true, corner_side: 'right', doors });
    const a = setArgs();
    const plan = buildPlan(a.entries, { which: 'base', room: a.room, worktops: [], profile: P(), ctx: ctx(), frontTypeOf: a.frontTypeOf });
    // T83 F10 (*"przekroj z gory pokazuje jakby logike z dolu czyli lustrzane odbicie, sprawdz dokladnie"*): the wall in the plan's own frame, looking down.
    const wall = planWalls(roomWalls(a.room))[0];
    const at = (u, v) => [wall.start.x + wall.along.x * u + wall.inward.x * v, wall.start.y + wall.along.y * u + wall.inward.y * v];
    for (const id of [left, right]) {
      const e = a.entries.find((x) => x.unit.id === id);
      const gap = wallGapOf(e.unit, P());
      const x0 = Number(e.unit.position.x_mm);
      const A = e.result.panels.find((p) => p.id === 'PLINTH-A');
      const B = e.result.panels.find((p) => p.id === 'PLINTH-B');
      assert.ok(A && B, 'the L cuts two toe kicks');
      const lineOf = (p) => plan.entities.filter((x) => x.src === `${id}:${p.id}`);
      assert.equal(lineOf(A).length, 1);
      assert.equal(lineOf(B).length, 1);
      // Arm A runs along wall A: its face toward the room is its far face from the wall.
      const la = lineOf(A)[0];
      assert.ok(near(la.y1, at(0, gap + A.box.z + A.box.d)[1]) && near(la.y2, la.y1), `${e.unit.params.corner_side} A at its room face`);
      // Arm B runs across: its face toward the room is the one the L opens onto (where arm A runs on).
      const bx = e.unit.params.corner_side === 'left' ? B.box.x + B.box.w : B.box.x;
      const lb = lineOf(B)[0];
      assert.ok(near(lb.x1, at(x0 + bx, 0)[0]) && near(lb.x2, lb.x1), `${e.unit.params.corner_side} B at ${x0 + bx} (doors ${doors})`);
    }
  }
});

test('F24 · the legend names the plinth line (setSheet.js, E1\'s file: the row is E3\'s patch)', () => {
  const row = SET_LEGEND.find(([, layer]) => layer === 'PLINTH_HIDDEN');
  assert.ok(row, 'a legend row for the plinth line');
  assert.equal(row[0], 'dash', 'drawn dashed, as the line is');
  t81Kitchen({ inframe: false });
  const planSheet = wallDrawingSheets(setArgs()).find((s) => s.variant === 'plan-base').sheet;
  assert.ok(planSheet.entities.some((e) => e.kind === 'text' && e.text === row[2]), `the plan's legend says ${row[2]}`);
});
