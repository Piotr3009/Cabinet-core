// ─── TURN 30 F13 — Cargo 300, the tall pull-out larder ─────────────────────
//
// CLAUDE.md: "Parent geometry: KIT_BUDTALL. Proposed width 300. Carcass + full
// door per the kit; the pull-out frame is HARDWARE (BOM + GLB slot when the
// owner uploads one), no invented runners drilling — the mechanism mounts to
// floor and top per manufacturer, which is not this repo's truth yet."
//
// ─── AND THE HARD RULE OF THE WHOLE BATCH ───────────────────────────────────
//
//   "A drilled hole exists only where a LISP line (`reference/lisp/`) or a
//    published Blum pattern (`reference/hardware/`) says so."
//
// So the strongest thing this file can say, and the first thing it says, is
// that a Cargo is drilled EXACTLY as KIT_BUDTALL_FULL drills a tall unit of the
// same size — hole for hole, layer for layer, to the micron. Not "similarly".
// Identically. Anything else would be an invented hole, and an invented hole is
// a miscut in somebody's workshop.
//
// The frame itself is a BOUGHT MECHANISM: one line in the BOM, to the size of
// the opening it has to fit, and nothing else anywhere in the app.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import {
  UNIT_NUM_PREFIX, UNIT_TYPE_ORDER, categoryOf, defaultParamsFor, getUnitType,
} from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { flattenLibrary, resolveEntry } from '../src/engine/library.js';
import { hardwareInstances } from '../src/engine/hardware3d.js';

const cargo = (over = {}) => computeCabinet({ ...defaultParamsFor('CARGO', P), unit_num: '01', ...over }, P);
const tall = (over = {}) => computeCabinet({ ...defaultParamsFor('BUDTALL', P), unit_num: '01', ...over }, P);

/** Every hole, as a comparable fingerprint. */
const holes = (r) => r.drills
  .map((d) => `${d.panel}|${d.layer}|${d.kind}|${d.x}|${d.y}|${d.d}`).sort();

// ─── 1. THE HARD RULE ───────────────────────────────────────────────────────

test('F13 a Cargo is drilled EXACTLY as KIT_BUDTALL drills a tall unit its size', () => {
  const c = cargo();
  const t = tall({ width: 300, height: 2100, depth: 558 });
  assert.equal(c.drills.length, t.drills.length, `${c.drills.length} vs ${t.drills.length} holes`);
  assert.deepEqual(holes(c), holes(t), 'hole for hole, layer for layer');
  // …and the SUMMARY the machine reads agrees too, which is the same claim
  // said in the other language.
  assert.deepEqual(c.drillSummary, t.drillSummary);
});

test('F13 …and it is the same CARCASS: the kit’s panels, the kit’s sizes', () => {
  const c = cargo();
  const t = tall({ width: 300, height: 2100, depth: 558 });
  assert.deepEqual(
    c.panels.map((p) => [p.part, p.w, p.h, p.thickness]),
    t.panels.map((p) => [p.part, p.w, p.h, p.thickness]),
  );
  assert.deepEqual(c.panels.map((p) => p.part), ['BUL', 'BUR', 'TOP', 'BOTTOM', 'BACK', 'FRONT']);
});

test('F13 …with a FULL DOOR on the kit’s own hinge ladder', () => {
  const c = cargo();
  assert.equal(c.panels.filter((p) => p.role === 'front').length, 1, 'one full-height leaf');
  assert.deepEqual(c.drillSummary.hinge_centers, tall({ width: 300 }).drillSummary.hinge_centers);
  assert.equal(c.drillSummary.hinge_centers.length, 6, 'a 2100 tall unit takes six');
});

// ─── 2. THE MECHANISM IS ORDERED, NOT CUT ──────────────────────────────────

test('F13 the pull-out frame is ONE BOM line, to the size of the opening', () => {
  const c = cargo();
  const line = c.hardware.find((h) => h.role === 'cargo_frame');
  assert.ok(line, 'the frame is on the order');
  assert.equal(line.qty, 1);
  assert.equal(line.unit, 'pcs');
  assert.equal(line.label, 'Pull-out larder frame');
  // The clear opening — between the sides, between the bottom and the top,
  // and back to the inside of the door — which is what a mechanism is bought
  // to fit. 300 − 2×18 = 264.
  assert.equal(line.spec.opening_width_mm, 264);
  assert.equal(line.spec.opening_height_mm, 2100 - 2 * P.board.thickness);
  assert.match(line.spec_label, /264 × 2064 × \d+ mm opening/);
});

test('F13 …and it drills NOTHING: no runner row, no floor fixing, no invented hole', () => {
  const c = cargo();
  const t = tall({ width: 300, height: 2100, depth: 558 });
  // Said twice on purpose: the fingerprint above, and the ABSENCE of every
  // layer a runner or a frame fixing would land on.
  assert.equal(c.drills.filter((d) => /RUNNER|CARGO|FRAME/i.test(d.layer || '')).length, 0);
  assert.equal(c.drills.filter((d) => /runner|cargo|frame/i.test(d.kind || '')).length, 0);
  assert.equal(holes(c).join('\n'), holes(t).join('\n'));
});

test('F13 …and it places no BODY either — the GLB slot is empty until one arrives', () => {
  // "BOM + GLB slot when the owner uploads one". `hardwareInstances` is the
  // list of things the app DRAWS; a mechanism whose fixing this repo cannot
  // state is a mechanism this repo does not draw.
  const inst = hardwareInstances(cargo(), P);
  assert.equal(inst.cargo, undefined, 'no invented body');
  for (const list of Object.values(inst)) {
    for (const i of list) assert.doesNotMatch(String(i.role || i.kind || ''), /cargo/i);
  }
});

test('F13 the kit flag is DATA, and no kit written before tonight carries it', () => {
  // The BOM half of the library rule is one field on the type — so a future
  // type buys a mechanism by declaring one, not by an engine change.
  assert.deepEqual(getUnitType('CARGO').hardwareKit,
    { role: 'cargo_frame', label: 'Pull-out larder frame', by: 'opening' });
  // …and the OTHER kits that buy a mechanism buy their own, not this one.
  const older = UNIT_TYPE_ORDER.filter((id) => !['CARGO', 'BIN'].includes(id));
  for (const id of older) {
    assert.equal(getUnitType(id).hardwareKit, undefined, `${id} must not have gained one`);
  }
  // …so not one existing kit's BOM can have moved.
  for (const id of older) {
    const r = computeCabinet({ ...defaultParamsFor(id, P), unit_num: '01' }, P);
    assert.equal(r.hardware.filter((h) => h.role === 'cargo_frame').length, 0, id);
  }
});

// ─── 3. IT IS 300 WIDE, AND IT HOLDS NO SHELVES ────────────────────────────

test('F13 it arrives at 300 × 2100, from the profile and not from a literal', () => {
  assert.deepEqual(P.cargoUnit.defaults, { width: 300, height: 2100, depth: 558 });
  assert.equal(P.cargoUnit.minHeight, P.tallUnit.minHeight, 'the parent kit’s own minimum');
  assert.deepEqual(migrateCabinetProfile({}).cargoUnit.defaults, P.cargoUnit.defaults);
  const d = defaultParamsFor('CARGO', P);
  assert.equal(d.width, 300);
  assert.equal(d.height, 2100);
  // A workshop that stocks 400 frames changes one profile line.
  const wide = migrateCabinetProfile({
    ...P, cargoUnit: { ...P.cargoUnit, defaults: { ...P.cargoUnit.defaults, width: 400 } },
  });
  assert.equal(wide.cargoUnit.defaults.width, 400);
  assert.equal(wide.cargoUnit.defaults.height, 2100, 'and the rest stands');
});

test('F13 the frame is what fills it, so the carcass offers no shelves', () => {
  const s = getUnitType('CARGO').supports;
  assert.equal(s.shelves, false);
  assert.equal(s.drawers, false);
  assert.equal(s.doors, true);
  // …and it finishes below the ceiling like every other tall kit, so it takes
  // an infill and a cornice.
  assert.equal(s.topInfill, true);
  assert.equal(s.cornice, true);
});

// ─── 4. IT IS REACHABLE ────────────────────────────────────────────────────

test('F13 it is in the KITCHEN category, in the tall units, and it can be placed', () => {
  assert.equal(categoryOf('CARGO').id, 'kitchen');
  const entry = flattenLibrary().find((e) => e.id === 'cargo-300');
  assert.ok(entry, 'the library offers it');
  assert.equal(entry.typeId, 'CARGO');
  assert.equal(resolveEntry(entry, P).enabled, true, 'and it is not held open');
  assert.equal(UNIT_NUM_PREFIX.CARGO, 'CG', 'and a project reads like the LISP unit numbers');
});

test('F13 it names the LISP it is made of, and it is BUDTALL’s', () => {
  const type = getUnitType('CARGO');
  assert.equal(type.lisp, 'KIT_BUDTALL_FULL.lsp');
  assert.equal(type.lisp, getUnitType('BUDTALL').lisp, 'the same kit, said once');
  assert.equal(type.hingeRule, getUnitType('BUDTALL').hingeRule);
  assert.equal(type.cupRule, getUnitType('BUDTALL').cupRule);
  assert.equal(type.legSource, getUnitType('BUDTALL').legSource);
  // The file it names is really there — a kit that cites a LISP that does not
  // exist is the exact failure the batch rule is written against.
  const src = readFileSync(new URL(`../reference/lisp/${type.lisp}`, import.meta.url), 'utf8');
  assert.match(src, /KIT_BUDTALL_FULL/);
});
