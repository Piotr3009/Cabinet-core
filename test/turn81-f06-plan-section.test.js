/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T81 F6 · THE PLANS AND THE SECTIONS FROM THE SAME PROJECTOR
//
// The owner, 22.10.2026 (21:23): *"pozniej przekroj z gory, i pozniej
// przekroje pionowe"*; (22:56) *"7 zrob wedlug glb"* (the hardware on the
// sections as the models are, not symbols); (22:57) *"zalezy mi zebys rysowal
// w pdf 1 do 1 co mamy na cabinet core"*. CLAUDE.md T81 F6: "Tests
// test/turn81-f06-plan-section.test.js: the plan's cut rectangles equal the
// boards the plane meets (by part id); the plinth not solid on the base plan;
// the section through the BUDR2 shows two runner silhouettes at the engine's
// runner heights and the leg silhouettes at the leg positions; the T80 frame
// and the timber still there."

import test from 'node:test';
import assert from 'node:assert/strict';

import { t81Kitchen, setArgs } from '../scripts/t81-kitchen.mjs';
import { getCabinetProfile } from '../src/engine/profile.js';
import { hardwareInstances } from '../src/engine/hardware3d.js';
import { wallGroups } from '../src/engine/drawings/wallElevation.js';
import { worktopsOnWall } from '../src/engine/drawings/setElevation.js';
import { drawingContext } from '../src/engine/drawings/setSheet.js';
import { buildPlan, cutEntries, cutHeight } from '../src/engine/drawings/setPlan.js';
import { buildStation, sectionStations } from '../src/engine/drawings/setSection.js';
import { wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { unitBase, wallGapOf } from '../src/engine/runs.js';

const P = () => getCabinetProfile();
const ctx = () => drawingContext(20, P());
const near = (a, b, eps = 0.01) => Math.abs(a - b) <= eps;

/** The boards the plane at `cut` meets, by `${unitId}:${panelId}`, as the room places them. */
function boardsMet(entries, cut) {
  const out = new Set();
  for (const e of cutEntries(entries, cut, P())) {
    const base = unitBase(e.unit, P());
    for (const p of e.result.panels.filter((q) => q.box && !q.meta?.frontDecorationParent)) {
      if (base + p.box.y < cut - 1e-6 && base + p.box.y + p.box.h > cut + 1e-6) out.add(`${e.unit.id}:${p.id}`);
    }
  }
  return out;
}

for (const inframe of [true, false]) {
  const label = inframe ? 'in-frame ON' : 'in-frame OFF';

  test(`F6 · ${label}: the plan's cut rectangles are the boards the plane meets, by part id`, () => {
    t81Kitchen({ inframe });
    const a = setArgs();
    for (const which of ['base', 'wall']) {
      const cut = cutHeight(which, P());
      const plan = buildPlan(a.entries, { which, room: a.room, worktops: a.worktops.map((w) => w.geometry || w), profile: P(), ctx: ctx(), frontTypeOf: a.frontTypeOf });
      const cutRects = plan.entities.filter((e) => e.cut && (e.kind === 'rect' || e.kind === 'poly'));
      assert.ok(cutRects.length > 0, `${which}: the knife's bars`);
      assert.ok(cutRects.every((e) => e.pen === 'CUT'), 'in the cut\'s pen');
      const drawn = new Set(plan.entities.filter((e) => e.cut).map((e) => e.src));
      assert.deepEqual([...drawn].sort(), [...boardsMet(a.entries, cut)].sort(), `${which} at ${cut}`);
    }
  });

  test(`F6 · ${label}: the plinth is never solid on the base plan, a dashed line under the carcass`, () => {
    const ids = t81Kitchen({ inframe });
    const a = setArgs();
    const plan = buildPlan(a.entries, { which: 'base', room: a.room, worktops: a.worktops.map((w) => w.geometry || w), profile: P(), ctx: ctx(), frontTypeOf: a.frontTypeOf });
    const plinth = plan.entities.filter((e) => e.src === `${ids.a}:PLINTH`);
    assert.ok(plinth.length >= 4, 'the plinth is on the plan');
    assert.ok(plinth.every((e) => e.kind === 'line' && e.hidden && e.pen === 'HIDDEN' && e.layer === 'SHELVES'), 'dashed, in the hidden pen');
    assert.equal(plan.entities.filter((e) => e.layer === 'MASK' && e.src === `${ids.a}:PLINTH`).length, 0, 'and it hides nothing');
    // The worktop over the base run is above the base cut: today's hidden outline.
    assert.ok(plan.entities.some((e) => e.kind === 'poly' && e.hidden && e.layer === 'SHELVES'), 'the worktop, dashed');
    // The words: every cut unit numbered.
    const nums = plan.entities.filter((e) => e.kind === 'text' && e.layer === 'UNIT_NUMBER').map((e) => e.text).sort();
    assert.deepEqual(nums, ['01', '02', 'DR01']);
  });

  test(`F6 · ${label}: the section through the BUDR2: two runners at the engine's heights, the legs at theirs`, () => {
    const ids = t81Kitchen({ inframe });
    const a = setArgs();
    const group = wallGroups(a.entries, P())[0];
    const stations = sectionStations(group);
    const st = stations.find((s) => s.member.unit.id === ids.c);
    assert.ok(st, 'A-A is through the drawer unit');
    const sec = buildStation(group, st, { room: a.room, worktops: worktopsOnWall(a.worktops, 0), profile: P(), ctx: ctx(), frontTypeOf: a.frontTypeOf });
    const m = group.members.find((x) => x.unit.id === ids.c);
    const hw = hardwareInstances(m.result, P());
    // Beyond the plane (looking towards the wall's end): the right-hand runners.
    const beyond = hw.runners.filter((rn) => m.x + rn.x >= st.x);
    assert.equal(beyond.length, 2, 'one runner per drawer on the side the section looks at');
    const runners = sec.entities.filter((e) => e.layer === 'RUNNERS' && e.family === 'runner' && e.src.startsWith(`${ids.c}:`));
    for (const rn of beyond) {
      // The runner's strip stands on its row; on the lowest row its underside
      // is the bottom board's own cut edge, so the line seen there is its top.
      const y = m.base + rn.y;
      const on = runners.filter((e) => e.kind === 'line' && Math.abs(e.y1 - e.y2) < 1e-6 && e.y1 >= y - 0.01 && e.y1 <= y + 1.01);
      assert.ok(on.length > 0, `a runner on the row at ${y}`);
      const z0 = Math.min(...on.map((e) => Math.min(e.x1, e.x2)));
      const z1 = Math.max(...on.map((e) => Math.max(e.x1, e.x2)));
      assert.ok(z1 - z0 >= 450, `as long as the runner the BOM orders: ${z1 - z0}`);
    }
    // The legs beyond: at the engine's depths, standing on the floor.
    const legs = sec.entities.filter((e) => e.layer === 'LEG_BLOCK' && e.src.startsWith(`${ids.c}:hw:leg:`));
    const seen = hw.legs.filter((l) => m.x + l.x >= st.x);
    assert.ok(seen.length >= 2);
    const gap = wallGapOf(m.unit, P());
    for (const l of seen) {
      const z = gap + l.z;
      const at = legs.some((e) => e.kind === 'line' && Math.min(e.x1, e.x2) <= z + 0.01 && Math.max(e.x1, e.x2) >= z - 0.01);
      assert.ok(at, `a leg across depth ${z}`);
    }
    assert.ok(Math.min(...legs.flatMap((e) => [e.y1, e.y2])) <= 1e-6, 'standing on the floor');
    // The boards the knife meets are cut, and the drawer boxes beyond are seen.
    assert.ok(sec.entities.some((e) => e.cut && e.src === `${ids.c}:BOTTOM`), 'the bottom, cut');
    assert.ok(sec.entities.some((e) => e.src.startsWith(`${ids.c}:D1-`) && !e.cut), 'the first box, beyond');
    // The worktop, cut, filled as the section has always filled it.
    assert.ok(sec.entities.some((e) => e.kind === 'rect' && e.cut && e.layer === 'WORKTOP' && e.fill === '#d9d9d9'), 'the slab, cut');
    // The caption says which way the reader looks.
    assert.ok(sec.entities.some((e) => e.kind === 'text' && e.text === 'looking along the wall, towards its end'));
  });
}

test('F6 · the T80 frame on the section is the FRAME board: its rails cut 19 above and below, its stile beyond; the timber stays', () => {
  const ids = t81Kitchen({ inframe: true });
  const a = setArgs();
  const group = wallGroups(a.entries, P())[0];
  const m = group.members.find((x) => x.unit.id === ids.a);
  const st = { letter: 'A', x: m.x + m.width / 2, member: m };
  const sec = buildStation(group, st, { room: a.room, worktops: worktopsOnWall(a.worktops, 0), profile: P(), ctx: drawingContext(1, P()) });
  const fr = m.result.derived.inframe;
  const H = Number(m.result.params.height);
  const rails = sec.entities.filter((e) => e.kind === 'rect' && e.cut && e.src === `${ids.a}:FRAME`);
  assert.equal(rails.length, 2, 'the knife meets the two rails');
  const [bottom, topRail] = rails.sort((p, q) => p.y - q.y);
  assert.ok(near(bottom.y, m.base - fr.outside) && near(topRail.y + topRail.h, m.base + H + fr.outside), '19 under and 19 over the carcass');
  assert.ok(near(bottom.w, fr.frameT), `the frame ${fr.frameT} thick`);
  const stile = sec.entities.filter((e) => e.kind === 'line' && !e.cut && e.src === `${ids.a}:FRAME`);
  assert.ok(stile.length > 0, 'the stile, seen beyond the opening');
  // The timber: the T80 note, hatched and named.
  assert.equal(sec.entities.filter((e) => e.meta?.inframe === 'filler').length, 1);
  assert.ok(sec.entities.some((e) => e.text === 'site filler 19 (timber)'));
  // The inset door, cut where the engine put it: flush with the frame's face.
  const door = sec.entities.find((e) => e.kind === 'rect' && e.cut && e.layer === 'DOORS' && e.src === `${ids.a}:${m.result.panels.find((p) => p.part === 'FRONT').id}`);
  assert.ok(door, 'the door, cut');
  assert.ok(near(door.x + door.w, bottom.x + bottom.w), 'flush with the frame\'s face');
});

test('F6 · the set\'s sections sheet carries the same stations, the numbers and the frame', () => {
  t81Kitchen({ inframe: true });
  const sheets = wallDrawingSheets(setArgs());
  const sec = sheets.find((s) => s.variant === 'sections').sheet;
  assert.ok(sec.entities.some((e) => e.cut && e.src?.endsWith(':FRAME')), 'the frame, cut');
  assert.ok(sec.entities.some((e) => e.kind === 'text' && e.layer === 'UNIT_NUMBER' && e.text === 'DR01'));
});
