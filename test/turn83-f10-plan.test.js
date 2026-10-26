/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T83 F10 · THE PLAN IS NOT A MIRROR
//
// The owner, 25.10.2026 (22:41): *"przekroj z gory pokazuje jakby logike z
// dolu czyli lustrzane odbicie, sprawdz dokladnie"*. CLAUDE.md T83 F10:
// "Tests test/turn83-f10-plan.test.js: the unit numbers' x on the plan
// increase left to right as on the fronts sheet for wall A; for wall C (the
// opposite wall) they decrease, as a real plan has them; the section marker
// A-A stands where the section is cut."
//
// The probe (verify/t83/f10-probe.md) warns that the x order alone passes on
// the mirror too (a y flip keeps it), so every wall is also read by its turn:
// a viewer facing a wall has its start on his left (the fronts sheet), and on
// a plan seen from ABOVE, with the room side of that wall pointing n on the
// paper (Y up), his right hand is (-n.y, n.x): cross(n, a) = +1 for a, the
// way from the first unit's number to the last. The view from below gives -1.
// Everything is read off the finished sheets of `wallDrawingSheets`, in paper
// mm with Y up, as the window builds them.

import test from 'node:test';
import assert from 'node:assert/strict';

import { t81Kitchen, setArgs, S } from '../scripts/t81-kitchen.mjs';
import { getCabinetProfile } from '../src/engine/profile.js';
import { rectCorners, roomWalls } from '../src/engine/room.js';
import { wallGroups, wallLabel } from '../src/engine/drawings/wallElevation.js';
import { sectionStations } from '../src/engine/drawings/setSection.js';
import { planWalls } from '../src/engine/drawings/setPlan.js';
import { wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';

const P = () => getCabinetProfile();
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const unit = (v) => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const signedArea = (pts) => pts.reduce((s, p, i) => s + cross(p, pts[(i + 1) % pts.length]), 0) / 2;

/** The probe's stage: BUD 600 one door, BUD 800 a pair, BUDR2 500 at 1000, 1600, 2400 on one wall. */
function threeUnitsOn(wall) {
  S().newProject(`T83 F10, wall ${wallLabel(wall)}`);
  S().setRoom({ corners: rectCorners(6000, 4000), height: 2500 });
  const add = (type, x) => S().addUnit(type, { wall, x }).id;
  const ids = { a: add('BUD', 1000), b: add('BUD', 1600), c: add('BUDR2', 2400) };
  for (const [id, width] of [[ids.a, 600], [ids.b, 800], [ids.c, 500]]) S().updateUnitParams(id, { width });
  S().setDoors(ids.a, { count: 1, hinge: 'L' });
  S().setDoors(ids.b, { count: 2, hinge: 'L' });
  S().addPlinth(ids.a);
  S().addWorktop([ids.a, ids.b, ids.c]);
  return ids;
}

/** The plan sheet and the wall's fronts sheet, read as paper. */
function read(ids, wall) {
  const args = setArgs();
  const sheets = wallDrawingSheets(args);
  const plan = sheets.find((s) => s.variant === 'plan-base');
  const fronts = sheets.find((s) => s.variant === 'fronts' && s.wall === wall);
  const numbers = (sh) => new Map(sh.sheet.entities.filter((e) => e.layer === 'UNIT_NUMBER' && e.unit).map((e) => [e.unit, e]));
  const pn = numbers(plan);
  const fn = numbers(fronts);
  const order = [ids.a, ids.b, ids.c];
  const pts = order.map((id) => [pn.get(id).x, pn.get(id).y]);
  const labels = new Map(plan.sheet.entities.filter((e) => e.kind === 'text' && /^WALL [A-Z]$/.test(e.text)).map((e) => [e.text.slice(5), [e.x, e.y]]));
  const colX = plan.sheet.zones.column.x;
  const key = new Map(plan.sheet.entities.filter((e) => e.kind === 'text' && e.layer === 'SHEET_MUTED' && /^[A-D]$/.test(e.text) && e.x > colX).map((e) => [e.text, [e.x, e.y]]));
  const mine = labels.get(wallLabel(wall));
  const centroid = [pts.reduce((s, p) => s + p[0], 0) / 3, pts.reduce((s, p) => s + p[1], 0) / 3];
  const along = unit(sub(pts[2], pts[0]));
  // The room side: the normal to the run pointing from the wall's label to the numbers.
  const n0 = [-along[1], along[0]];
  const n = dot(n0, sub(centroid, mine)) >= 0 ? n0 : [-n0[0], -n0[1]];
  return { args, sheets, plan, fronts, pn, fn, order, pts, labels, key, mine, along, n, hand: cross(n, along), colX };
}

test('T83 F10 · wall A of the T81 kitchen: the plan reads 01, 02, DR01 left to right, as its fronts sheet does', () => {
  const ids = t81Kitchen({ inframe: true });
  const r = read(ids, 0);
  const frontsX = r.order.map((id) => r.fn.get(id).x);
  const planX = r.order.map((id) => r.pn.get(id).x);
  const names = r.order.map((id) => r.pn.get(id).text);
  assert.deepEqual(names, ['01', '02', 'DR01'], 'the units of the T81 kitchen');
  assert.ok(frontsX[0] < frontsX[1] && frontsX[1] < frontsX[2], `the fronts sheet left to right: ${frontsX}`);
  assert.ok(planX[0] < planX[1] && planX[1] < planX[2], `the plan left to right, as the fronts: ${planX}`);
  // ...and seen from ABOVE, not from below: the turn is the room's, not its mirror's.
  assert.equal(Math.round(r.hand), 1, `cross(room side, the fronts' order) = ${r.hand}: +1 from above, -1 from below`);
  // Looking down, x to the right, the room's y runs DOWN the paper: wall A at the top, the room below it.
  assert.ok(r.mine[1] > Math.max(...r.pts.map((p) => p[1])), `WALL A's label ${r.mine} above its units`);
});

test('T83 F10 · every wall is seen from above: A at the top, B on the right, C at the bottom, D on the left; wall C reads right to left', () => {
  const want = {
    0: { side: (r) => r.mine[1] > r.pts[0][1], run: (p) => p[0][0] < p[1][0] && p[1][0] < p[2][0], said: 'A at the top, left to right' },
    1: { side: (r) => r.mine[0] > r.pts[0][0], run: (p) => p[0][1] > p[1][1] && p[1][1] > p[2][1], said: 'B on the right, top to bottom' },
    2: { side: (r) => r.mine[1] < r.pts[0][1], run: (p) => p[0][0] > p[1][0] && p[1][0] > p[2][0], said: 'C at the bottom, right to left' },
    3: { side: (r) => r.mine[0] < r.pts[0][0], run: (p) => p[0][1] < p[1][1] && p[1][1] < p[2][1], said: 'D on the left, bottom to top' },
  };
  for (const wall of [0, 1, 2, 3]) {
    const r = read(threeUnitsOn(wall), wall);
    const W = wallLabel(wall);
    assert.equal(Math.round(r.hand), 1, `wall ${W}: cross(room side, the fronts' order) = ${r.hand}, the view from above`);
    assert.ok(want[wall].side(r), `wall ${W}: ${want[wall].said} (label ${r.mine}, first number ${r.pts[0]})`);
    assert.ok(want[wall].run(r.pts), `wall ${W}: ${want[wall].said}: ${r.pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ; ')}`);
    // The fronts sheet itself is untouched: left to right from the wall's start, on every wall.
    const fx = r.order.map((id) => r.fn.get(id).x);
    assert.ok(fx[0] < fx[1] && fx[1] < fx[2], `wall ${W}'s fronts sheet left to right: ${fx}`);
  }
  // Wall C named in CLAUDE.md's own words: its numbers' x DECREASE left to right.
  const c = read(threeUnitsOn(2), 2);
  const xs = c.order.map((id) => c.pn.get(id).x);
  assert.ok(xs[0] > xs[1] && xs[1] > xs[2], `wall C: 01, 02, DR01 at x ${xs}, decreasing, as a real plan has them`);
});

test('T83 F10 · the walls run clockwise round the room on the plan and on its key plan, as the room editor draws them', () => {
  const ids = t81Kitchen({ inframe: false });
  const r = read(ids, 0);
  const ring = ['A', 'B', 'C', 'D'].map((k) => r.labels.get(k));
  // rectCorners runs clockwise seen from above (engine/room.js); on paper, Y up, clockwise is a negative area.
  assert.ok(signedArea(ring) < 0, `the plan's WALL A, B, C, D run clockwise: area ${signedArea(ring)}`);
  const keyRing = ['A', 'B', 'C', 'D'].map((k) => r.key.get(k));
  assert.ok(keyRing.every(Boolean), 'the key plan names the four walls');
  assert.ok(signedArea(keyRing) < 0, `the key plan's A, B, C, D run clockwise: area ${signedArea(keyRing)}`);
  assert.ok(r.key.get('A')[1] > r.key.get('C')[1] && r.key.get('B')[0] > r.key.get('D')[0], 'the key plan: A at the top, B on the right');
  // The fronts sheet of wall A: its key plan's arrow looks from the room at wall A, so it points UP the paper.
  const colX = r.fronts.sheet.zones.column.x;
  const arrow = r.fronts.sheet.entities.filter((e) => e.layer === 'FRAME' && e.kind === 'poly' && e.pts?.length === 3 && e.pts[0][0] > colX);
  assert.equal(arrow.length, 1, 'one arrow on the key plan');
  const [tip, b1, b2] = arrow[0].pts;
  assert.ok(tip[1] > (b1[1] + b2[1]) / 2, `the arrow points up at wall A: tip ${tip}, base ${b1} ${b2}`);
  const band = r.fronts.sheet.entities.find((e) => e.meta === 'key-plan');
  const bandY = band.pts.map((p) => p[1]);
  const keyYs = [...r.fronts.sheet.entities.filter((e) => e.kind === 'text' && e.layer === 'SHEET_MUTED' && /^[A-D]$/.test(e.text) && e.x > colX)].map((e) => e.y);
  assert.ok(Math.min(...bandY) > (Math.min(...keyYs) + Math.max(...keyYs)) / 2, 'wall A\'s band at the top of the key plan');
});

test('T83 F10 · the section marker A-A stands where the section is cut, its arrows looking the way the section looks', () => {
  const cases = [['the T81 kitchen', () => t81Kitchen({ inframe: true }), 0], ...[0, 1, 2, 3].map((w) => [`wall ${wallLabel(w)}`, () => threeUnitsOn(w), w])];
  for (const [label, make, wall] of cases) {
    const ids = make();
    const r = read(ids, wall);
    const group = wallGroups(r.args.entries, P()).find((g) => g.wall === wall);
    const [st] = sectionStations(group);
    assert.ok(st, `${label}: a station`);
    // Paper along the wall, from two numbers whose units' centres are known in mm: u -> paper.
    const centre = (id) => {
      const u = r.args.entries.find((e) => e.unit.id === id).unit;
      return Number(u.position.x_mm) + Number(u.params.width) / 2;
    };
    const [ua, uc] = [centre(ids.a), centre(ids.c)];
    const [pa, pc] = [r.pn.get(ids.a), r.pn.get(ids.c)];
    const toPaper = (u) => [pa.x + ((pc.x - pa.x) * (u - ua)) / (uc - ua), pa.y + ((pc.y - pa.y) * (u - ua)) / (uc - ua)];
    const want = toPaper(st.x);
    const heads = r.plan.sheet.entities.filter((e) => e.layer === 'FRAME' && e.kind === 'poly' && e.pts?.length === 3 && e.pts[0][0] < r.colX);
    assert.equal(heads.length, 2, `${label}: two arrowheads`);
    const letters = r.plan.sheet.entities.filter((e) => e.layer === 'FRAME' && e.kind === 'text' && e.text === st.letter && e.x < r.colX);
    assert.equal(letters.length, 2, `${label}: ${st.letter} at both ends`);
    for (const h of heads) {
      const base = [(h.pts[1][0] + h.pts[2][0]) / 2, (h.pts[1][1] + h.pts[2][1]) / 2];
      // Where: the arrow's base on the station's line along the wall (within half a paper mm).
      const off = dot(sub(base, want), r.along);
      assert.ok(Math.abs(off) < 0.5, `${label}: the marker ${off.toFixed(2)} mm of paper from the station at ${st.x}`);
      // Which way: the section looks along the wall towards its END (setSection.js buildStation).
      const look = dot(unit(sub(h.pts[0], base)), r.along);
      assert.ok(look > 0.9, `${label}: the arrow points to the wall's end (${look.toFixed(2)})`);
    }
    for (const l of letters) {
      // The letter stands behind its arrow, never across the cut line.
      assert.ok(dot(sub([l.x, l.y], want), r.along) < 0, `${label}: the letter ${st.letter} behind the arrow`);
    }
  }
});

test('T83 F10 · one frame: planWalls turns the room\'s y over and nothing else', () => {
  const room = { corners: rectCorners(4000, 3000), height: 2500 };
  const walls = roomWalls(room);
  const plan = planWalls(walls);
  assert.equal(plan.length, walls.length);
  plan.forEach((w, i) => {
    const o = walls[i];
    assert.deepEqual([w.start.x, w.end.x, w.along.x, w.inward.x, w.width, w.index], [o.start.x, o.end.x, o.along.x, o.inward.x, o.width, o.index]);
    assert.deepEqual([w.start.y, w.end.y, w.along.y, w.inward.y].map((v) => v + 0), [o.start.y, o.end.y, o.along.y, o.inward.y].map((v) => -v + 0));
  });
  // The room itself is untouched: the room, the 3D and the elevations read roomWalls as before.
  assert.deepEqual([roomWalls(room)[0].inward.x + 0, roomWalls(room)[0].inward.y], [0, 1]);
});
