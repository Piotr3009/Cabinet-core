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
import { projectRun, sheetDefaultHandle } from '../src/engine/drawings/projector.js';
import { wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { wallGroups } from '../src/engine/drawings/wallElevation.js';
import { buildRunElevation, worktopsOnWall } from '../src/engine/drawings/setElevation.js';
import { drawingContext } from '../src/engine/drawings/setSheet.js';

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
