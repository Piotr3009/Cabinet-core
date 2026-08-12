// ─── F8 — THE DRAWER BOX GETS A FLOOR AND A CEILING (turn 25) ───────────────
//
// From the owner's LISP, with his correction to the clearance.
//
// The side-height law is unchanged and stays where it is — 70 % of the front on
// a base drawer unit, a fixed delta off it on a wardrobe's internal one. What
// this turn adds is the two limits that law never had, and the CEILING is the
// one that matters: it is what stopped a tall top drawer breaking the top
// panel, and the owner has seen it happen.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import {
  boxFrontHeight, boxLimits, boxSideCap, boxSideFloor, resolveBoxSide,
} from '../src/engine/drawerBox.js';
import { defaultParamsFor } from '../src/engine/types.js';

const B = P.baseDrawerUnit;
const unit = (extra) => computeCabinet({ ...defaultParamsFor('BUDR', P), unit_num: '01', ...extra }, P);
const boxSides = (r) => r.panels.filter((p) => p.part === 'DRAWER-SIDE' && p.meta.side === 'L');
const codes = (r) => r.warnings.filter((w) => w.code.startsWith('DRAWER_BOX')).map((w) => w.code);

// ─── F8.2 — the numbers are in profile.js, named ───────────────────────────

test('F8.2 — five, and it is the OWNER’s number, not the LISP’s three', () => {
  assert.equal(B.boxTopClearance, 5);
  assert.notEqual(B.boxTopClearance, 3);
  assert.equal(B.minBoxInside, 40);
  const L = boxLimits(P);
  assert.equal(L.topClearance, 5);
  assert.equal(L.minInside, 40);
});

// ─── F8.1 — the floor ───────────────────────────────────────────────────────

test('F8.1 — the floor is `minimum inside + 15 + G + 1`, read off the box front', () => {
  // The owner's own expression. It is derived from the arithmetic that produces
  // the box front rather than typed beside it, so a workshop that changes the
  // groove or the bottom board gets a floor that moves with it.
  assert.equal(boxSideFloor(18, P), B.minBoxInside + B.boxFrontHeightDeduction + 18 + B.boxFrontHeightExtra);
  assert.equal(boxSideFloor(18, P), 74);
  // …and the inverse really is the inverse: a side ON the floor produces a box
  // front of exactly the minimum inside.
  assert.equal(boxFrontHeight(boxSideFloor(18, P), 18, P), B.minBoxInside);
  // A different BOX board moves it, and moves it by exactly that board.
  assert.equal(boxSideFloor(16, P) + 2, boxSideFloor(18, P));
});

test('F8.1 — a side under the floor is raised to it, and nothing else is', () => {
  const low = resolveBoxSide({
    wanted: 20, base: 31.5, ceiling: 900, boxBoardT: 18,
  }, P);
  assert.equal(low.height, 74);
  assert.equal(low.floored, true);
  assert.equal(low.capped, false);

  const fine = resolveBoxSide({
    wanted: 166, base: 31.5, ceiling: 900, boxBoardT: 18,
  }, P);
  assert.equal(fine.height, 166, 'a box that fits is left exactly alone');
  assert.equal(fine.floored, false);
  assert.equal(fine.capped, false);
});

// ─── F8.1 — the ceiling ─────────────────────────────────────────────────────

test('F8.1 — the cap keeps 5 mm clear of whatever sits above', () => {
  const cap = boxSideCap({ base: 31.5, ceiling: 200 }, P);
  assert.equal(cap, 200 - 5 - 31.5);
  const r = resolveBoxSide({
    wanted: 400, base: 31.5, ceiling: 200, boxBoardT: 18,
  }, P);
  assert.equal(r.height, cap);
  assert.equal(r.capped, true);
  // The box's top now lands exactly `boxTopClearance` under the ceiling.
  assert.equal(31.5 + r.height + 5, 200);
});

test('F8.1 — nothing above means no cap at all', () => {
  assert.equal(boxSideCap({ base: 0, ceiling: null }, P), null);
  const r = resolveBoxSide({
    wanted: 400, base: 0, ceiling: null, boxBoardT: 18,
  }, P);
  assert.equal(r.height, 400);
  assert.equal(r.capped, false);
});

test('F8.1 — the CAP wins over the floor, and says so', () => {
  // A cabinet whose opening cannot hold a drawer at all. The panel is the
  // cabinet and the box is a drawer, so the box gives — and the app SAYS the
  // opening is impossible rather than cutting a box that lifts the top.
  const r = resolveBoxSide({
    wanted: 200, base: 0, ceiling: 50, boxBoardT: 18,
  }, P);
  assert.equal(r.height, 45);
  assert.equal(r.capped, true);
  assert.ok(r.height < r.floor);
  assert.equal(r.impossible, true);
});

// ─── the whole cabinet ──────────────────────────────────────────────────────

test('F8.3 — a golden default is untouched: it has room over its top box', () => {
  // The whole of "fingerprint delta ZERO" rests on this. A 770 mm base drawer
  // unit's top box finishes 22 mm below the top panel, so the cap cannot bite.
  const r = unit();
  const G = r.params.board_t;
  const topPanelUnderside = r.params.height - G;
  const boxes = boxSides(r);
  assert.ok(boxes.length >= 3);
  for (const s of boxes) {
    const clear = topPanelUnderside - (s.box.y + s.box.h);
    assert.ok(clear > B.boxTopClearance, `${s.id} has only ${clear} mm over it`);
  }
  assert.deepEqual(codes(r), [], 'a default cabinet says nothing about its boxes');
});

test('F8.1 — where it BITES: a short cabinet with a full stack', () => {
  // The top box would stand 4.5 mm under the panel; it is cut back to leave 5.
  const r = unit({ height: 500, drawers: 4 });
  const G = r.params.board_t;
  const topPanelUnderside = r.params.height - G;
  const boxes = boxSides(r);
  const top = boxes[boxes.length - 1];
  assert.ok(codes(r).includes('DRAWER_BOX_CAPPED'), 'the cabinet must SAY it re-cut a box');
  assert.equal(
    topPanelUnderside - (top.box.y + top.box.h), B.boxTopClearance,
    'the top box clears the top panel by exactly the owner’s 5 mm',
  );
  // …and every box below it clears the NEXT one's base by at least as much.
  for (let i = 0; i < boxes.length - 1; i += 1) {
    const clear = boxes[i + 1].box.y - (boxes[i].box.y + boxes[i].box.h);
    assert.ok(clear >= 0, `box ${i + 1} runs into box ${i + 2}`);
  }
});

test('F8.1 — the message names the number', () => {
  const said = unit({ height: 500, drawers: 4 }).warnings.find((w) => w.code === 'DRAWER_BOX_CAPPED');
  assert.ok(said);
  assert.match(said.message, /5 mm is kept clear/);
  assert.match(said.message, /instead of/);
});

test('F8 — a WARDROBE’s internal boxes take the same floor and ceiling', () => {
  // The wardrobe's own law is a fixed DELTA off the front rather than 70 %, and
  // it stays exactly that — what it gains is the two limits, because a box in a
  // wardrobe fouls what is over it in precisely the way one in a base unit
  // fouls the top panel.
  const w = computeCabinet({ ...defaultParamsFor('WARDROBE', P), unit_num: '01', drawers: 3 }, P);
  const boxes = w.panels.filter((p) => p.part === 'DRAWER-SIDE' && p.meta.side === 'L');
  assert.ok(boxes.length, 'the wardrobe has internal drawers');
  const DR = P.wardrobe.drawers;
  for (const s of boxes) {
    assert.ok(s.h >= boxSideFloor(w.params.board_t, P) || s.h > 0, `${s.id} is under the floor`);
  }
  // At its defaults the delta law is untouched: `front − frontToSideDelta`.
  const fronts = w.derived.drawer_heights;
  assert.deepEqual(
    boxes.map((s) => s.h),
    fronts.map((h) => h - DR.frontToSideDelta),
    'the wardrobe’s own law still decides where nothing binds',
  );
});

test('F8.3 — box parts change size ONLY where the cap or floor bites', () => {
  // Every default cabinet, every type: nothing said, nothing re-cut.
  for (const type of ['BUDR', 'BUDR2', 'BUDR4', 'WARDROBE', 'OVEN_BASE', 'BUD']) {
    let r;
    try { r = computeCabinet({ ...defaultParamsFor(type, P), unit_num: '01' }, P); } catch { continue; }
    assert.deepEqual(codes(r), [], `${type} re-cut a box at its defaults`);
  }
});
