/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F7, AFTER THE REVIEW · THE HAWA DOOR'S FINISH AND HANDLE ON THE SHEETS
//
// CLAUDE.md T82 F6: "the door in the front finish of the run (spray,
// decoration, in-frame as the neighbours)"; F7: "The fronts sheet (T81) draws
// the closed door over the pocket and the covered units". A2's review fix
// (T82 F6, after the review) cuts the run's finish on POCKET-DOOR (its
// meta.frontType, meta.shaker, the decoration pass) and, on a Pull door,
// drills the project's handle as a tall front's (meta.handle,
// drillSummary.handles); a Push door takes none (*"5 - tak"*, Push by
// default). The room draws what the engine cut, so the sheets do: the door's
// face detail as a front's, its handle from the engine's own drill summary,
// and never the sheet's default knob (F22) on a pocket door.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { getCabinetProfile } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { frontDecorationElevation } from '../src/engine/drawings/frontDecorationDrawing.js';
import { frontDetail } from '../src/engine/drawings/frontElevation.js';
import { defaultFrontDecoration } from '../src/engine/frontDecoration.js';
import { projectRun } from '../src/engine/drawings/projector.js';
import { wallGroups } from '../src/engine/drawings/wallElevation.js';

const P = () => getCabinetProfile();
const near = (a, b, eps = 0.01) => Math.abs(a - b) <= eps;
const golden = (name) => JSON.parse(readFileSync(new URL(`../verify/t82/goldens/${name}`, import.meta.url), 'utf8')).params.unit;
const cut = (params) => computeCabinet(params, P());

// KIT_HAWA.lsp EXAMPLE 1 (a shaker run, front_type 'S'): one door, hand R,
// over the BUD 500 on its right; Push as the golden has it.
const ONE = () => golden('golden-hawa-pocket-1door.json');
const PULL = (over = {}) => ({ ...ONE(), pocket: { ...ONE().pocket, push: false }, project_handle: { type: 'bar', centres: 128 }, ...over });

/** The pocket at x 1000 on wall A and the BUD 500 it covers: one wall group, as the sets build it. */
function stage(params) {
  const first = cut(params);
  const gap = (Number(P().room?.wallBackClearance) || 0) + (Number(first.hawa.frontAlignMm) || 0);
  const pocket = {
    id: 'hp', type: 'HAWA_POCKET', position: { wall: 0, x_mm: 1000 },
    params: { ...params, width: first.hawa.widthMm, depth: first.hawa.KT, wall_gap: gap },
  };
  const result = cut(pocket.params);
  const budParams = {
    ...defaultParamsFor('BUD', P()), width: 500, depth: 580, unit_num: '02',
    doors: { count: 1, hinge: 'L' }, pocket_covered: { pocketId: 'hp', unitNum: 'HP01' },
  };
  const bud = { id: 'b', type: 'BUD', position: { wall: 0, x_mm: 1000 + first.hawa.widthMm }, params: budParams };
  const group = wallGroups([{ unit: pocket, result }, { unit: bud, result: cut({ type: 'BUD', ...budParams }) }], P())[0];
  const m = group.members.find((x) => x.unit.id === 'hp');
  return { group, m, door: result.panels.find((p) => p.part === 'POCKET-DOOR'), result };
}

const frontsOf = (group) => projectRun(group, { view: 'front', mode: 'fronts', profile: P() }).entities;
const onDoor = (ents, m) => ents.filter((e) => e.src === `${m.unit.id}:POCKET-DOOR`);

/** The face detail of a front's own grammar, moved into the run's frame. */
function expectedDetail(m, door) {
  const shift = (e) => (e.kind === 'rect' ? { ...e, x: e.x + m.x, y: e.y + m.base } : e);
  return frontDetail(door.box, door.meta.frontType, P(), null).map(shift);
}

test('F7 · a shaker run: the HAWA door carries the shaker field the engine cut, drawn as a front\'s', () => {
  for (const params of [ONE(), PULL()]) {
    const { group, m, door } = stage(params);
    assert.equal(door.meta.frontType, 'S', 'the run\'s style on the door (A2)');
    assert.ok(door.meta.shaker, 'and its recess');
    const ents = onDoor(frontsOf(group), m).filter((e) => e.layer === 'DOORS');
    const want = expectedDetail(m, door).filter((e) => e.kind === 'rect');
    assert.ok(want.length > 0, 'a shaker has a field');
    for (const w of want) {
      assert.ok(ents.some((e) => e.kind === 'rect' && near(e.x, w.x) && near(e.y, w.y) && near(e.w, w.w) && near(e.h, w.h)),
        `the field ${w.w} x ${w.h} at ${w.x}, ${w.y}`);
    }
    // The leaf and its field: more than the one rectangle a plain door is.
    assert.ok(ents.filter((e) => e.kind === 'rect').length >= 2);
  }
});

test('F7 · a flat run: the HAWA door is plain, one rectangle', () => {
  const { group, m, door } = stage({ ...ONE(), front_type: 'F' });
  assert.equal(door.meta.frontType, 'F');
  const rects = onDoor(frontsOf(group), m).filter((e) => e.layer === 'DOORS' && e.kind === 'rect');
  assert.equal(rects.length, 1);
});

test('F7 · a decorated run (fluted, applied moulding): the door carries the decoration the engine put on it', () => {
  for (const style of ['FL', 'AM']) {
    const { group, m, door } = stage({ ...ONE(), front_type: style, front_decoration: defaultFrontDecoration(style, P()) });
    assert.ok(door.meta.frontDecoration, `${style}: the decoration pass took the door (A2)`);
    const want = frontDecorationElevation(door);
    assert.ok(want.length > 0, `${style}: contours to draw`);
    const got = onDoor(frontsOf(group), m).filter((e) => e.meta === 'front-decoration');
    assert.equal(got.length, want.length, `${style}: every contour of it, as on a front`);
  }
});

test('F7 · Pull: the bar on the door where the engine drills it, mirrored out of its cut frame; Push: no handle at all', () => {
  const pull = stage(PULL());
  const h = (pull.result.drillSummary?.handles || []).find((x) => x.panel === 'POCKET-DOOR');
  assert.ok(h && h.type === 'bar' && h.holes.length === 2, 'the engine drills the Pull door\'s bar (A2)');
  const ents = onDoor(frontsOf(pull.group), pull.m).filter((e) => e.layer === 'HANDLES');
  const fixings = ents.filter((e) => e.kind === 'circle' && e.handle === 'fixing');
  assert.equal(ents.filter((e) => e.kind === 'line' && e.handle === 'bar').length, 1, 'one bar');
  assert.equal(fixings.length, 2, 'on its two fixings');
  const b = pull.door.box;
  for (const [hx, hy] of h.holes) {
    const cx = pull.m.x + b.x + b.w - hx;
    const cy = pull.m.base + b.y + hy;
    assert.ok(fixings.some((c) => near(c.cx, cx) && near(c.cy, cy)), `a fixing at ${cx}, ${cy}`);
  }
  assert.ok(ents.every((e) => !e.defaultHandle), 'the engine\'s handle, never the sheet\'s default');
  const push = stage(ONE());
  assert.equal((push.result.drillSummary?.handles || []).filter((x) => x.panel === 'POCKET-DOOR').length, 0, 'Push: the engine drills none');
  assert.equal(onDoor(frontsOf(push.group), push.m).filter((e) => e.layer === 'HANDLES').length, 0, 'Push: none drawn');
  // Fronts off: the door and its handle are lifted together.
  const off = projectRun(pull.group, { view: 'front', mode: 'no-fronts', profile: P() }).entities;
  assert.equal(onDoor(off, pull.m).length, 0);
});
