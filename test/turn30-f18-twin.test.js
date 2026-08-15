// ─── TURN 30 F18 — the twin cupboard ───────────────────────────────────────
//
// CLAUDE.md: "Twin cupboard. Parent: KIT_DOOR_DOUBLE — it exists. Expose it in
// the Kitchen category with its own defaults."
//
// ─── WHAT KIT_DOOR_DOUBLE.lsp ACTUALLY IS ───────────────────────────────────
//
// It exists, and it is not a cupboard. It is an INTERIOR DOUBLE DOOR SET in a
// lining: "Double Doors with Frame", command DOOR_DOUBLE, base point "bottom-
// left of left door leaf", layers FRAME / DOOR_OUTSIDE / DOOR_INSIDE /
// DOOR_IRONMONGERY, asking for an overall FRAME width of 1603, a frame height
// of 2083, a frame DEPTH of 100 and a door number of "DD01". No carcass, no
// shelf, no leg, no cup bored into a cabinet side. The first test below reads
// the file and states that, so the correction is checked and not just claimed.
//
// ─── SO WHAT SHIPS ──────────────────────────────────────────────────────────
//
// The deliverable that survives the correction, which is the one that was
// asked for: a twin cupboard in the Kitchen category with its own defaults.
// KIT_BUD_FULL cuts it; the two-leaf face is the engine's own
// `doors.doubleTotalGap`, which is LISP truth and is not touched. The new thing
// is that it is a KIT — `doorCount: 2` — so a 700 mm twin is a twin rather than
// a single, and every hole in it is a base unit's.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import {
  UNIT_NUM_PREFIX, UNIT_TYPE_ORDER, categoryOf, defaultParamsFor, getUnitType,
} from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { flattenLibrary, resolveEntry } from '../src/engine/library.js';

const of = (type, over = {}) => computeCabinet({
  ...defaultParamsFor(type, P), unit_num: '01', doors: true, ...over,
}, P);
const holes = (r) => r.drills
  .map((d) => `${String(d.panel).replace(/^[^-]*-/, '')}|${d.layer}|${d.kind}|${d.x}|${d.y}|${d.d}`).sort();
const leaves = (r) => r.panels.filter((p) => p.role === 'front');

// ─── 1. THE CORRECTION, CHECKED AGAINST THE FILE ───────────────────────────

test('F18 KIT_DOOR_DOUBLE.lsp is an interior DOOR SET, not a cupboard', () => {
  const src = readFileSync(new URL('../reference/lisp/KIT_DOOR_DOUBLE.lsp', import.meta.url), 'utf8');
  // What it says it is.
  assert.match(src, /Double Doors with Frame/);
  assert.match(src, /Command: DOOR_DOUBLE/);
  assert.match(src, /Base point: bottom-left of left door leaf/);
  // What it asks for: a frame, in a lining, with a door number.
  assert.match(src, /Overall FRAME WIDTH incl frame members/);
  assert.match(src, /Overall FRAME HEIGHT incl frame members/);
  assert.match(src, /Frame depth \[mm\] <100>/);
  assert.match(src, /Door number <DD01>/);
  assert.match(src, /"DOOR_IRONMONGERY"/);
  // And what is NOT in it — the things a cupboard is made of.
  for (const word of ['BUL', 'SHELF', 'legW', 'hingeCupList']) {
    assert.ok(!src.includes(word), `a cupboard would need ${word}`);
  }
});

test('F18 …so the twin cupboard is cut by the kit that cuts cupboards', () => {
  assert.equal(getUnitType('TWIN').lisp, 'KIT_BUD_FULL.lsp');
  assert.equal(getUnitType('TWIN').lisp, getUnitType('BUD').lisp);
  // No type in the app claims the door set as its kit.
  for (const id of UNIT_TYPE_ORDER) {
    assert.notEqual(getUnitType(id).lisp, 'KIT_DOOR_DOUBLE.lsp', id);
  }
});

// ─── 2. IT IS A BASE UNIT, HOLE FOR HOLE ───────────────────────────────────

test('F18 a twin is drilled EXACTLY as KIT_BUD drills a base unit its size', () => {
  const twin = of('TWIN');
  const bud = of('BUD', { width: 900 });
  assert.equal(twin.drills.length, bud.drills.length);
  assert.deepEqual(holes(twin), holes(bud), 'hole for hole');
  assert.deepEqual(twin.drillSummary, bud.drillSummary);
  assert.deepEqual(
    twin.panels.map((p) => [p.part, p.w, p.h]),
    bud.panels.map((p) => [p.part, p.w, p.h]),
  );
});

test('F18 the two leaves are the engine’s own arithmetic, untouched', () => {
  const twin = of('TWIN');
  const two = leaves(twin);
  assert.equal(two.length, 2);
  // (W − doubleTotalGap) / 2 each, and 3 mm between them — turn 1's numbers.
  const leafW = (900 - P.doors.doubleTotalGap) / 2;
  assert.equal(two[0].w, leafW);
  assert.equal(two[1].w, leafW);
  assert.equal(two[1].box.x - (two[0].box.x + two[0].box.w), P.doors.gap);
  assert.equal(two[0].meta.hinge, 'L');
  assert.equal(two[1].meta.hinge, 'R');
});

// ─── 3. WHAT MAKES IT A TWIN ───────────────────────────────────────────────

test('F18 it is a PAIR at any width — a 700 twin is a twin, not a single', () => {
  // The whole of the new behaviour, in one comparison: at 700 the width
  // threshold gives a base unit ONE leaf, and the twin two.
  assert.equal(leaves(of('BUD', { width: 700 })).length, 1);
  assert.equal(leaves(of('TWIN', { width: 700 })).length, 2);
  // …and the cups follow the leaves, because they always have.
  assert.equal(of('TWIN', { width: 700 }).drillSummary.front_cup_y.length,
    of('BUD', { width: 900 }).drillSummary.front_cup_y.length);
});

test('F18 …and a job that says otherwise still wins', () => {
  assert.equal(leaves(of('TWIN', { doors: { count: 1 } })).length, 1);
  assert.equal(leaves(of('TWIN', { doors: false })).length, 0);
});

test('F18 no kit written before tonight has a `doorCount`, so none moved', () => {
  for (const id of UNIT_TYPE_ORDER) {
    if (id === 'TWIN') continue;
    assert.equal(getUnitType(id).doorCount, undefined, id);
  }
  // The width threshold is exactly what it was, on the kit it was written for.
  assert.equal(leaves(of('BUD', { width: 704 })).length, 1);
  assert.equal(leaves(of('BUD', { width: 705 })).length, 2);
});

// ─── 4. THE KIT ────────────────────────────────────────────────────────────

test('F18 it has its OWN defaults, and they are a pair’s width', () => {
  assert.deepEqual(P.twinCupboard.defaults, { width: 900, height: 770, depth: 558 });
  assert.deepEqual(migrateCabinetProfile({}).twinCupboard.defaults, P.twinCupboard.defaults);
  assert.equal(defaultParamsFor('TWIN', P).width, 900);
  // Everything else is a base unit's.
  const twin = getUnitType('TWIN');
  const bud = getUnitType('BUD');
  for (const key of ['hingeRule', 'cupRule', 'legs', 'legSource', 'mount', 'heightGroup', 'drawerStyle']) {
    assert.deepEqual(twin[key], bud[key], key);
  }
  assert.deepEqual(twin.carcass, bud.carcass);
  assert.equal(twin.supports.shelves, true, 'a cupboard holds shelves');
  assert.equal(twin.hardwareKit, undefined, 'nothing is ordered');
});

test('F18 it is in the KITCHEN category, among the base units, and can be placed', () => {
  assert.equal(categoryOf('TWIN').id, 'kitchen');
  const entry = flattenLibrary().find((e) => e.id === 'twin-cupboard');
  assert.equal(entry.typeId, 'TWIN');
  assert.equal(resolveEntry(entry, P).enabled, true);
  assert.equal(UNIT_NUM_PREFIX.TWIN, 'TW');
  // The slimline filler unit is a DIFFERENT product and stays held open.
  const space = flattenLibrary().find((e) => e.id === 'twin-space');
  assert.equal(space.kind, 'soon');
});
