// ─── TURN 30 F20 — two fronts, one hidden drawer behind them ───────────────
//
// CLAUDE.md: "Mechanism: an INTERNAL drawer = existing box + runner rows,
// `front: none`, sitting behind the front above it. Engine input on the drawer
// stack; BOM counts the box and the runners; drilling is the existing runner
// truth. This is the same mechanism F14 consumes."
//
// ─── THE MECHANISM WAS BUILT ONCE, IN F14 ───────────────────────────────────
//
// `internalDrawerSet` is F14's file and is not touched here. What F20 adds is
// the VISIBLE half, and it is the half CLAUDE.md names in four words —
// "sitting behind the front above it":
//
//   a hidden drawer would leave a HOLE in the façade unless the front over it
//   grows down across its zone.
//
// So a three-drawer unit with the middle one hidden shows TWO fronts and has
// THREE boxes, and the face is continuous. Every number for that comes off the
// kit's own zone table; there is no second set anywhere.
//
// ─── AND THE BOX IS UNTOUCHED ───────────────────────────────────────────────
//
// Three boxes, three pairs of runners, the same runner rows in the same places
// and the same holes in the carcass. The only difference between a plain stack
// and this one is which BOARDS are cut for the face — asserted below by
// fingerprint, not by description.

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

const budr = (over = {}) => computeCabinet({ ...defaultParamsFor('BUDR', P), unit_num: '01', ...over }, P);
const wardrobe = (over = {}) => computeCabinet({
  ...defaultParamsFor('WARDROBE', P), unit_num: '01', drawers: 3, doors: true, ...over,
}, P);
const faces = (r) => r.panels.filter((p) => p.part === 'DRAWER-FRONT');
const boxes = (r) => r.panels.filter((p) => p.part === 'DRAWER-SIDE').length / 2;
/** Every hole that is NOT on a drawer façade — the carcass and the boxes. */
const carcassHoles = (r) => r.drills
  .filter((d) => !/^[^-]*-F\d/.test(String(d.panel)))
  .map((d) => `${String(d.panel).replace(/^[^-]*-/, '')}|${d.layer}|${d.kind}|${d.x}|${d.y}|${d.d}`)
  .sort();

// ─── 1. TWO FRONTS, THREE DRAWERS ──────────────────────────────────────────

test('F20 hiding the middle drawer leaves TWO fronts and THREE boxes', () => {
  const plain = budr();
  const trend = budr({ internal_drawers: [2] });
  assert.equal(faces(plain).length, 3);
  assert.equal(faces(trend).length, 2, 'two fronts');
  assert.equal(boxes(trend), 3, 'three drawers');
  assert.deepEqual(faces(trend).map((p) => p.id), ['01-F1', '01-F3']);
});

test('F20 …and the face is CONTINUOUS: the front above grew over the hidden one', () => {
  const plain = budr();
  const trend = budr({ internal_drawers: [2] });
  const [f1, f3] = faces(trend);
  const was = Object.fromEntries(faces(plain).map((p) => [p.id, p]));
  // F3 now starts where F2 used to and is as tall as the two of them plus the
  // gap between — which is what "sitting behind the front above it" means.
  assert.equal(f3.box.y, was['01-F2'].box.y);
  assert.equal(f3.h, was['01-F2'].h + P.baseDrawerUnit.gap + was['01-F3'].h);
  // The bottom façade is untouched, and the two together cover the whole face
  // with the kit's own gap between them.
  assert.equal(f1.h, was['01-F1'].h);
  assert.equal(f1.box.y, was['01-F1'].box.y);
  assert.equal(f3.box.y - (f1.box.y + f1.h), P.baseDrawerUnit.gap, 'one gap, the kit’s own');
  // …and the face is exactly as tall as it was.
  const top = (r) => Math.max(...faces(r).map((p) => p.box.y + p.h));
  assert.equal(top(trend), top(plain));
});

test('F20 the screws stay on the BOX, not on the new bottom edge', () => {
  // The one thing that goes wrong quietly: a façade measured from its own
  // bottom edge, grown downward, screws itself to thin air. The absolute
  // height of the screw row must not move.
  const plain = budr();
  const trend = budr({ internal_drawers: [2] });
  const rowOf = (r) => {
    const f = r.panels.find((p) => p.id === '01-F3');
    return (f.cnc.holes || []).map((h) => f.box.y + h.y);
  };
  assert.deepEqual(rowOf(trend), rowOf(plain));
  assert.ok(rowOf(trend).length >= 2, 'and there really are screws to check');
});

// ─── 2. THE DRAWER ITSELF IS UNTOUCHED ─────────────────────────────────────

test('F20 the box, the runners and every hole are exactly what they were', () => {
  const plain = budr();
  const trend = budr({ internal_drawers: [2] });
  assert.deepEqual(carcassHoles(trend), carcassHoles(plain), 'not one hole moved');
  assert.deepEqual(
    trend.panels.filter((p) => p.role === 'drawer_box').map((p) => [p.id, p.w, p.h]),
    plain.panels.filter((p) => p.role === 'drawer_box').map((p) => [p.id, p.w, p.h]),
    'and every board of every box is the same board',
  );
  assert.deepEqual(trend.drillSummary.runner_rows_carcass_y, plain.drillSummary.runner_rows_carcass_y);
});

test('F20 the BOM still counts the box and the runners — three of each', () => {
  const trend = budr({ internal_drawers: [2] });
  const runners = trend.hardware.find((h) => h.role === 'runner_pairs');
  assert.equal(runners.qty, 3, 'the hidden drawer is bought like any other');
  assert.equal(
    trend.hardware.map((h) => `${h.role}:${h.qty}`).join(' '),
    budr().hardware.map((h) => `${h.role}:${h.qty}`).join(' '),
    'the order form is identical',
  );
  // The CUT LIST is the only thing that shrank, and by exactly one board.
  assert.equal(trend.panels.length, budr().panels.length - 1);
});

// ─── 3. THE INPUT ──────────────────────────────────────────────────────────

test('F20 it is an INPUT on the stack, and it is F14’s own mechanism', () => {
  // Nothing said, nothing hidden — every unit before tonight.
  assert.equal(faces(budr()).length, 3);
  assert.equal(faces(budr({ internal_drawers: [] })).length, 3);
  // Any drawer can be the hidden one.
  assert.deepEqual(faces(budr({ internal_drawers: [1] })).map((p) => p.id), ['01-F2', '01-F3']);
  assert.deepEqual(faces(budr({ internal_drawers: [3] })).map((p) => p.id), ['01-F1', '01-F2']);
  // …and two in a row are covered by the one front above them.
  const two = budr({ internal_drawers: [1, 2] });
  assert.equal(faces(two).length, 1);
  assert.equal(boxes(two), 3);
  assert.equal(faces(two)[0].box.y, budr().panels.find((p) => p.id === '01-F1').box.y,
    'the single façade reaches the bottom of the stack');
});

test('F20 hiding the TOP drawer leaves the face short — it is not covered from below', () => {
  // "…behind the front ABOVE it". There is no front above the top drawer, so
  // hiding it takes a board off the face rather than growing another one. That
  // is the mechanism being honest rather than clever.
  const top = budr({ internal_drawers: [3] });
  const plain = budr();
  const highest = (r) => Math.max(...faces(r).map((p) => p.box.y + p.h));
  assert.ok(highest(top) < highest(plain));
  assert.equal(boxes(top), 3, 'and the drawer is still there');
});

// ─── 4. THE SAME MECHANISM IN THE INTERNAL STACK ───────────────────────────

test('F20 a wardrobe/pantry stack covers a hidden drawer the same way', () => {
  const plain = wardrobe();
  const trend = wardrobe({ internal_drawers: [2] });
  assert.equal(faces(plain).length, 3);
  assert.equal(faces(trend).length, 2);
  assert.equal(boxes(trend), 3);
  const was = Object.fromEntries(faces(plain).map((p) => [p.id, p]));
  const covering = faces(trend).find((p) => p.id === '01-DF3');
  assert.equal(covering.box.y, was['01-DF2'].box.y, 'it grew down to the hidden zone');
  assert.equal(covering.h, (was['01-DF3'].box.y + was['01-DF3'].h) - was['01-DF2'].box.y);
  // …and the boxes and holes are untouched, as ever.
  assert.deepEqual(carcassHoles(trend), carcassHoles(plain));
});

test('F20 a PANTRY — every drawer internal — is unaffected by the covering rule', () => {
  // With no front-bearing drawer there is nothing to grow, and F14's cabinet
  // is exactly what F14 committed.
  const pantry = computeCabinet({
    ...defaultParamsFor('PANTRY', P), unit_num: '01', drawers: 3, doors: true,
  }, P);
  assert.equal(faces(pantry).length, 0);
  assert.equal(boxes(pantry), 3);
});
