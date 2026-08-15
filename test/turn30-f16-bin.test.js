// ─── TURN 30 F16 — the bin unit ────────────────────────────────────────────
//
// CLAUDE.md: "Parent: KIT_BUD. Pull-out bin = hardware on the door/carcass per
// manufacturer: BOM + visual, no invented holes."
//
// ─── THE WHOLE FEATURE ──────────────────────────────────────────────────────
//
// A bin unit is a BASE UNIT, drilled hole for hole as KIT_BUD_FULL drills one,
// plus a line on the order form and a placeholder volume in the picture. The
// mechanism screws to the door and to the carcass floor per its own
// manufacturer, and neither of those fixings is written in a LISP line or in
// any published pattern this repo holds — so neither is bored.
//
// ─── "BOM + VISUAL", HONESTLY ───────────────────────────────────────────────
//
// There is no drawing of a bin here, and inventing one would be fiction of the
// same kind as an invented hole. What IS drawn is the SPACE the mechanism
// occupies, measured off the opening the engine already measured for the order
// line, inset on every side so that it reads as a volume rather than as the
// outline of a product. It is marked `placeholder: true` and it reaches no cut
// list, no drill and no quantity.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import {
  UNIT_NUM_PREFIX, UNIT_TYPE_ORDER, categoryOf, defaultParamsFor, getUnitType,
} from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { flattenLibrary, resolveEntry } from '../src/engine/library.js';
import { hardwareInstances, kitInstances } from '../src/engine/hardware3d.js';

const of = (type, over = {}) => computeCabinet({
  ...defaultParamsFor(type, P), unit_num: '01', doors: true, ...over,
}, P);
const holes = (r) => r.drills
  .map((d) => `${String(d.panel).replace(/^[^-]*-/, '')}|${d.layer}|${d.kind}|${d.x}|${d.y}|${d.d}`).sort();

// ─── 1. NO INVENTED HOLES ──────────────────────────────────────────────────

test('F16 a bin unit is drilled EXACTLY as KIT_BUD drills a base unit', () => {
  const bin = of('BIN');
  const bud = of('BUD');
  assert.equal(bin.drills.length, bud.drills.length);
  assert.deepEqual(holes(bin), holes(bud), 'hole for hole');
  assert.deepEqual(bin.drillSummary, bud.drillSummary);
  assert.deepEqual(
    bin.panels.map((p) => [p.part, p.w, p.h]),
    bud.panels.map((p) => [p.part, p.w, p.h]),
    'and board for board — the carcass and its door',
  );
});

test('F16 …at any size, and with the door hung either way', () => {
  for (const over of [{ width: 400 }, { width: 500, height: 720 }, { hinge: 'R' }]) {
    assert.deepEqual(holes(of('BIN', over)), holes(of('BUD', over)), JSON.stringify(over));
  }
});

test('F16 nothing anywhere is drilled for the MECHANISM', () => {
  const bin = of('BIN');
  assert.equal(bin.drills.filter((d) => /BIN|PULLOUT|BRACKET/i.test(d.layer || '')).length, 0);
  assert.equal(bin.drills.filter((d) => /bin|pullout/i.test(d.kind || '')).length, 0);
  // …and the DOOR — which is where the mechanism's own bracket screws — is
  // machined exactly as a base unit's door is. (What it DOES carry is the
  // shaker panel pocket its front style asks for, which is turn 3's and is
  // the same on both, so the comparison is the honest form of the claim.)
  const door = bin.panels.find((p) => p.role === 'front');
  const budDoor = of('BUD').panels.find((p) => p.role === 'front');
  assert.deepEqual(door.cnc.holes || [], budDoor.cnc.holes || []);
  assert.deepEqual(door.cnc.pockets || [], budDoor.cnc.pockets || []);
});

// ─── 2. THE ORDER LINE ─────────────────────────────────────────────────────

test('F16 the pull-out is ONE BOM line, to the size of the opening', () => {
  const bin = of('BIN');
  const line = bin.hardware.find((h) => h.role === 'bin_pullout');
  assert.ok(line);
  assert.equal(line.qty, 1);
  assert.equal(line.label, 'Pull-out bin unit');
  assert.equal(line.spec.opening_width_mm, 600 - 2 * P.board.thickness);
  assert.match(line.spec_label, /mm opening/);
  // A base unit buys none, which is what makes this a bin unit.
  assert.equal(of('BUD').hardware.filter((h) => h.role === 'bin_pullout').length, 0);
});

// ─── 3. THE VISUAL IS A PLACEHOLDER, AND SAYS SO ───────────────────────────

test('F16 the "visual" is the SPACE the mechanism takes, marked as a placeholder', () => {
  const bin = of('BIN');
  const kits = hardwareInstances(bin, P).kits;
  assert.equal(kits.length, 1);
  const [k] = kits;
  assert.equal(k.role, 'bin_pullout');
  assert.equal(k.body, 'bin');
  assert.equal(k.placeholder, true);
  // It is measured off the SAME opening the order line is specified by — no
  // second set of numbers anywhere.
  const spec = bin.hardware.find((h) => h.role === 'bin_pullout').spec;
  assert.ok(k.w < spec.opening_width_mm, 'inset, so it is not read as an outline');
  assert.ok(k.h < spec.opening_height_mm);
  assert.ok(k.d < spec.opening_depth_mm);
  assert.ok(k.w > spec.opening_width_mm * 0.7, 'but honestly close to the space it fills');
  // It stands INSIDE the carcass, above the bottom board.
  assert.ok(k.x >= P.board.thickness && k.y >= P.board.thickness);
});

test('F16 …and no other kit draws one', () => {
  for (const id of UNIT_TYPE_ORDER) {
    if (id === 'BIN') continue;
    const r = computeCabinet({ ...defaultParamsFor(id, P), unit_num: '01' }, P);
    assert.deepEqual(kitInstances(r), [], id);
  }
  // The cargo frame in particular: F13 ships a BOM line and an EMPTY slot,
  // because a larder frame's own fixing is the manufacturer's.
  assert.equal(getUnitType('CARGO').hardwareKit.body, undefined);
});

test('F16 the placeholder reaches no cut list and no drill', () => {
  const bin = of('BIN');
  assert.equal(bin.panels.filter((p) => /bin/i.test(p.part)).length, 0);
  assert.equal(bin.csvLines.filter((l) => /bin/i.test(l)).length, 0);
  // It is drawn by ONE component, off the instances, and it says what it is.
  const hw = readFileSync(new URL('../src/3d/Hardware.jsx', import.meta.url), 'utf8');
  assert.match(hw, /function KitBodies\(/);
  assert.match(hw, /ccKitPlaceholder: true/);
  assert.match(hw, /instances\.kits \|\| \[\]/);
});

// ─── 4. THE KIT ────────────────────────────────────────────────────────────

test('F16 every field is BUD’s, and it holds no shelves', () => {
  const bin = getUnitType('BIN');
  const bud = getUnitType('BUD');
  for (const key of ['lisp', 'hingeRule', 'cupRule', 'legs', 'legSource', 'mount', 'heightGroup', 'drawerStyle']) {
    assert.deepEqual(bin[key], bud[key], `${key} is the kit's`);
  }
  assert.equal(bin.lisp, 'KIT_BUD_FULL.lsp');
  assert.deepEqual(bin.carcass, bud.carcass);
  // The pull-out fills the carcass, which is what makes it a bin unit rather
  // than a base unit somebody keeps bins in.
  assert.equal(bin.supports.shelves, false);
  assert.equal(bin.supports.doors, true);
  assert.deepEqual(P.binUnit.defaults, { width: 600, height: 770, depth: 558 });
  assert.deepEqual(migrateCabinetProfile({}).binUnit.defaults, P.binUnit.defaults);
});

test('F16 it is in the KITCHEN category and the held-open row became a kit', () => {
  assert.equal(categoryOf('BIN').id, 'kitchen');
  const entry = flattenLibrary().find((e) => e.id === 'bin-storage');
  assert.equal(entry.kind, 'type');
  assert.equal(entry.typeId, 'BIN');
  assert.equal(resolveEntry(entry, P).enabled, true);
  assert.match(resolveEntry(entry, P).hint, /ordered, not cut/);
  assert.equal(UNIT_NUM_PREFIX.BIN, 'BN');
});
