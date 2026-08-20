// ─── TURN 43, F3: /2 SHOWS THE DRAWERS IT IS FOR, AND THE LEGS BECOME LEGS ──
//
// The owner, 20.08.2026: *"Szuflady nie są narysowane"* and *"nóżki to jakieś
// klocki zamiast ładnej nóżki."*
//
// ─── WHAT WAS MEASURED ──────────────────────────────────────────────────────
//
//   · `buildCarcassElevation` filtered `role !== 'drawer_box'`, so a BUDR's
//     FIFTEEN drawer-box panels produced ZERO entities — six runner lines
//     floating in an empty box, on the one sheet whose job is "what is inside".
//   · every leg was ONE BARE RECT, on /1 AND on /2: eight LEG_BLOCK rects on a
//     three-unit wall, twice.
//
// Both assertions below are on the ENTITY LIST, and the drawer geometry is
// checked against the engine's own published panels rather than against a
// number this test made up.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { buildCarcassElevation, drawerBoxRects, legMark } from '../src/engine/drawings/views.js';
import { buildWallElevation, wallGroups } from '../src/engine/drawings/wallElevation.js';
import { PEN, penWidth } from '../src/engine/drawings/layers.js';
import { T43_DESIGN, T43_ROOM, t43Entries } from './fixtures/t43-kitchen.js';
import { resolveUnitDesign } from '../src/engine/design.js';

const walls = () => wallGroups(t43Entries(P), P);
const elevation = (group, withFronts) => buildWallElevation(group, {
  withFronts,
  room: T43_ROOM,
  profile: P,
  frontTypeOf: (u) => resolveUnitDesign(u, T43_DESIGN).frontType,
});

const near = (a, b) => Math.abs(a - b) < 1e-6;

test('F3 — a BUDR contributes exactly its BOX COUNT of solid drawer rects to /2', () => {
  const group = walls().find((g) => g.wall === 0);
  const two = elevation(group, false).entities;

  for (const m of group.members) {
    const boxes = drawerBoxRects(m.result);
    const stacks = new Set(m.result.panels
      .filter((p) => p.part === 'DRAWER-SIDE' && p.box)
      .map((p) => p.meta?.drawer)).size;
    assert.equal(boxes.length, stacks, `${m.unit.params.unit_num}: one rect per BOX, not per panel`);
    for (const b of boxes) {
      const hit = two.find((e) => e.kind === 'rect' && e.layer === 'SHELVES'
        && near(e.x, m.x + b.x) && near(e.y, m.base + b.y)
        && near(e.w, b.w) && near(e.h, b.h));
      assert.ok(hit, `${m.unit.params.unit_num}: the box at ${b.y} is drawn on /2`);
      assert.equal(hit.solid, true, 'the door is off — you are looking straight at it');
      assert.equal(penWidth(hit), PEN.VISIBLE, 'a visible edge, not a hidden one');
    }
  }
  // The proof kitchen's wall A carries exactly one drawer unit, of three boxes.
  const total = group.members.reduce((n, m) => n + drawerBoxRects(m.result).length, 0);
  assert.equal(total, 3, 'the BUDR 500 default stack is three drawers');
});

test('F3 — …and ZERO of them on /1, which is fronts', () => {
  const group = walls().find((g) => g.wall === 0);
  const one = elevation(group, true).entities;
  for (const m of group.members) {
    for (const b of drawerBoxRects(m.result)) {
      const hit = one.some((e) => e.kind === 'rect' && near(e.h, b.h) && near(e.w, b.w)
        && near(e.y, m.base + b.y));
      assert.ok(!hit, `${m.unit.params.unit_num}: no drawer box on the fronts sheet`);
    }
  }
});

test('F3 — the drawer box is read off the ENGINE, never re-derived', () => {
  const result = computeCabinet({ ...defaultParamsFor('BUDR', P), unit_num: '01' }, P);
  const sides = result.panels.filter((p) => p.part === 'DRAWER-SIDE' && p.box);
  const left = Math.min(...sides.map((p) => p.box.x));
  const right = Math.max(...sides.map((p) => p.box.x + p.box.w));
  for (const r of drawerBoxRects(result)) {
    assert.equal(r.x, left, 'the stack\'s own x-extent');
    assert.equal(r.w, right - left);
    // …and the height is one of the engine's own side panels, to the micron.
    assert.ok(sides.some((p) => near(p.box.y, r.y) && near(p.box.h, r.h)),
      `${r.y}×${r.h} is a side the engine cut`);
  }
});

test('F3 — LEG_BLOCK on /2 is legs.positions × 3 per legged unit, and 0 on /1', () => {
  for (const group of walls()) {
    const two = elevation(group, false).entities.filter((e) => e.layer === 'LEG_BLOCK');
    const one = elevation(group, true).entities.filter((e) => e.layer === 'LEG_BLOCK');
    const expected = group.members.reduce((n, m) => {
      const legs = m.result.assemblies.legs;
      const h = m.result.assemblies.carcass.legHeight || 0;
      return n + (legs && h > 0 ? legs.positions.length * 3 : 0);
    }, 0);
    assert.equal(two.length, expected, `Wall ${group.label} /2 draws three lines per leg`);
    assert.equal(one.length, 0, `Wall ${group.label} /1 draws no leg at all`);
    for (const e of two) {
      assert.equal(e.kind, 'line', 'a symbol, not a brick');
      assert.equal(penWidth(e), PEN.THIN, 'furniture, present but not the subject');
    }
  }
});

test('F3 — the symbol IS a top plate, a stem and a foot', () => {
  const mark = legMark({ x: 18 }, { width: 78, height: 100 });
  assert.equal(mark.length, 3);
  const [plate, stem, foot] = mark;
  assert.deepEqual([plate.x1, plate.y1, plate.x2, plate.y2], [18, 0, 96, 0], 'the plate, under the carcass bottom');
  assert.deepEqual([stem.x1, stem.y1, stem.x2, stem.y2], [57, 0, 57, -100], 'the stem, down the middle');
  assert.deepEqual([foot.x1, foot.y1, foot.x2, foot.y2], [18, -100, 96, -100], 'the foot, on the floor');
});

test('F3 — both options default OFF, so the unit card keeps its own carcass view', () => {
  const result = computeCabinet({ ...defaultParamsFor('BUDR', P), unit_num: '01', plinth: true }, P);
  const card = buildCarcassElevation(result, { unitNum: '01', profile: P });
  assert.equal(card.entities.filter((e) => e.layer === 'LEG_BLOCK' && e.kind === 'rect').length,
    result.assemblies.legs.positions.length, 'the card still draws the rectangle it always drew');
  assert.equal(card.entities.filter((e) => e.pen === 'VISIBLE' && e.layer === 'SHELVES').length, 0,
    'and no drawer boxes appear on it uninvited');
});
