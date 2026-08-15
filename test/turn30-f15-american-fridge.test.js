// ─── TURN 30 F15 — the american fridge housing ─────────────────────────────
//
// CLAUDE.md: "Parent: KIT_FRIDGE.lsp — it EXISTS and is the truth. Widen the
// parameter envelope to american sizes; drilling stays the kit's own."
//
// ─── WHY THIS IS THE SHORTEST FEATURE IN THE BATCH ──────────────────────────
//
// KIT_FRIDGE writes every panel it cuts in terms of the WIDTH and the APERTURE
// HEIGHT — the fixed panel, the spurs panel on its 25 × 25 blocks, the two back
// rails and the back above them — and the drilling follows the panels. So an
// american housing is that kit given bigger numbers, and "widen the envelope"
// is a set of DEFAULTS rather than a change to anything that cuts.
//
// The test says exactly that: a `FRIDGE_US` is drilled hole for hole as a
// `FRIDGE` of the same size. If that ever stops being true, something invented
// a hole.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import {
  UNIT_NUM_PREFIX, categoryOf, defaultParamsFor, getUnitType,
} from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { flattenLibrary, resolveEntry } from '../src/engine/library.js';

const of = (type, over = {}) => computeCabinet({
  ...defaultParamsFor(type, P), unit_num: '01', doors: true, ...over,
}, P);
const holes = (r) => r.drills
  .map((d) => `${String(d.panel).replace(/^[^-]*-/, '')}|${d.layer}|${d.kind}|${d.x}|${d.y}|${d.d}`).sort();

const US = P.americanFridgeUnit.defaults;

// ─── 1. THE DRILLING IS THE KIT'S OWN ──────────────────────────────────────

test('F15 an american housing is drilled EXACTLY as KIT_FRIDGE at the same size', () => {
  const us = of('FRIDGE_US');
  const built = of('FRIDGE', {
    width: US.width, height: US.height, depth: US.depth, fridge_h: US.fridgeH,
  });
  assert.equal(us.drills.length, built.drills.length);
  assert.deepEqual(holes(us), holes(built), 'hole for hole');
  assert.deepEqual(us.drillSummary, built.drillSummary);
  assert.deepEqual(
    us.panels.map((p) => [p.part, p.w, p.h]),
    built.panels.map((p) => [p.part, p.w, p.h]),
    'and board for board',
  );
});

test('F15 …and the BUILT-IN housing is exactly what it was — 600 mm, untouched', () => {
  // Widening the envelope must not move the kit every existing project uses,
  // which is the reason this is a second type rather than a wider default.
  const built = of('FRIDGE');
  assert.equal(built.params.width, 600);
  assert.equal(built.params.fridge_h, 1786);
  assert.deepEqual(P.fridgeUnit.defaults, {
    width: 600, height: 2100, depth: 558, fridgeH: 1786,
  });
  assert.equal(defaultParamsFor('FRIDGE', P).fridge_h, 1786);
});

test('F15 the kit really is parametric in both directions: every panel follows', () => {
  // The claim underneath the whole feature, stated as behaviour rather than
  // trusted: make it wider and taller and every board that should grow, grows.
  const narrow = of('FRIDGE');
  const wide = of('FRIDGE_US');
  const w = (r, part) => r.panels.find((p) => p.part === part);
  for (const part of ['TOP', 'BOTTOM', 'FIXED', 'SPURS', 'BACK']) {
    assert.ok(w(wide, part).w > w(narrow, part).w, `${part} follows the width`);
  }
  assert.equal(w(wide, 'TOP').w - w(narrow, 'TOP').w, US.width - 600, 'to the millimetre');
  // The aperture raises the fixed panel, so the BACK above it is shorter…
  assert.ok(wide.panels.filter((p) => p.part === 'BACK-RAIL').length === 2, 'two rails, as the kit says');
  // …and a 1000 mm face is two doors, which is the door rule and not a new one.
  assert.equal(wide.panels.filter((p) => p.role === 'front').length, 2);
  assert.equal(narrow.panels.filter((p) => p.role === 'front').length, 1);
});

// ─── 2. THE ENVELOPE ───────────────────────────────────────────────────────

test('F15 the envelope is a PROFILE block, and it is american', () => {
  assert.deepEqual(US, {
    width: 1000, height: 2100, depth: 558, fridgeH: 1900,
  });
  // The minimum CLEARS the kit's own aperture — above the fixed panel there
  // has to be room for a spurs panel and the back over it, which is what
  // `fridgeUnit.minHeight` does for the 1786 built-in.
  assert.equal(P.americanFridgeUnit.minHeight, 2000);
  assert.ok(P.americanFridgeUnit.minHeight > US.fridgeH + 3 * P.board.thickness,
    'the spurs panel has room at the smallest housing this kit allows');
  assert.ok(P.fridgeUnit.minHeight > P.fridgeUnit.defaults.fridgeH + 3 * P.board.thickness,
    'and the built-in has always been that way');
  assert.deepEqual(migrateCabinetProfile({}).americanFridgeUnit.defaults, US);
  // It is a STARTING SIZE and not a specification: a joiner types the
  // appliance's own numbers, and the kit follows them.
  const own = of('FRIDGE_US', { width: 1200, fridge_h: 1950 });
  assert.equal(own.params.width, 1200);
  assert.equal(own.panels.find((p) => p.part === 'TOP').w, 1200 - 2 * P.board.thickness);
  assert.deepEqual(
    holes(own),
    holes(of('FRIDGE', {
      width: 1200, height: US.height, depth: US.depth, fridge_h: 1950,
    })),
    'still the kit’s own holes, at any size',
  );
});

test('F15 the DEPTH stays the run’s, because the appliance stands proud', () => {
  assert.equal(US.depth, P.fridgeUnit.defaults.depth);
});

// ─── 3. THE TYPE IS THE FRIDGE TYPE ────────────────────────────────────────

test('F15 every field is FRIDGE’s except the envelope', () => {
  const us = getUnitType('FRIDGE_US');
  const built = getUnitType('FRIDGE');
  for (const key of ['lisp', 'hingeRule', 'cupRule', 'legs', 'legSource', 'mount', 'heightGroup', 'drawerStyle']) {
    assert.deepEqual(us[key], built[key], `${key} is the kit's`);
  }
  assert.deepEqual(us.carcass, built.carcass, 'the back on two rails');
  assert.deepEqual(us.supports, built.supports);
  assert.equal(us.lisp, 'KIT_FRIDGE.lsp');
  // …and ONLY the envelope differs.
  assert.notEqual(us.defaultsKey, built.defaultsKey);
  assert.equal(us.defaultsKey, 'americanFridgeUnit.defaults');
  // No mechanism is bought and none is invented.
  assert.equal(us.hardwareKit, undefined);
});

test('F15 the LISP it names exists, and it is the one that houses a fridge', () => {
  const src = readFileSync(new URL('../reference/lisp/KIT_FRIDGE.lsp', import.meta.url), 'utf8');
  assert.match(src, /Fridge Tall Unit/);
  // The three things the kit says about itself, which are the three this type
  // inherits without touching them.
  assert.match(src, /Back: 2 rails \(250mm\) \+ full back above fixed panel/);
  assert.match(src, /Fixed panel at fridgeH/);
  assert.match(src, /Spurs panel on 25x25 wood blocks above fixed panel/);
});

test('F15 the APERTURE control is offered by the kit, not by a type id', () => {
  const panel = readFileSync(new URL('../src/components/RightPanel.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(panel, /unit\.type === 'FRIDGE'/, 'no kit is named in a component');
  assert.match(panel, /apertureDefault != null/);
  assert.match(panel, /profilePath\(profile, type\.defaultsKey\)\?\.fridgeH/);
  // …and the same in the engine: a kit HAS an aperture by having one.
  const types = readFileSync(new URL('../src/engine/types.js', import.meta.url), 'utf8');
  assert.match(types, /\.\.\.\(d\.fridgeH != null \? \{ fridge_h: d\.fridgeH \} : \{\}\),/);
  assert.doesNotMatch(types, /type\.id === 'FRIDGE'/);
  // Both housings arrive with their own aperture, and nothing else does.
  assert.equal(defaultParamsFor('FRIDGE_US', P).fridge_h, 1900);
  assert.equal(defaultParamsFor('BUDTALL', P).fridge_h, undefined);
});

test('F15 it is in the KITCHEN category and the held-open row became a kit', () => {
  assert.equal(categoryOf('FRIDGE_US').id, 'kitchen');
  const entry = flattenLibrary().find((e) => e.id === 'american-fridge');
  assert.equal(entry.kind, 'type');
  assert.equal(entry.typeId, 'FRIDGE_US');
  assert.equal(resolveEntry(entry, P).enabled, true);
  assert.equal(UNIT_NUM_PREFIX.FRIDGE_US, 'AF');
});

// ─── 4. THE BUG THE WIDER ENVELOPE FOUND ───────────────────────────────────

test('F15 an IMPOSSIBLE aperture cuts no board — it has warned since turn 12', () => {
  // `FRIDGE_ZONE_TOO_TALL` has said "there is no room for the spurs panel"
  // since turn 12, and the two pieces above the fixed panel were cut anyway,
  // at NEGATIVE height. A board of −68 mm is not a warning: it is an inverted
  // outline on a machine file, and turn 25's edge guard finds it as a
  // clockwise loop. Found by widening the envelope; it was true of the
  // BUILT-IN housing too, which is why the case below is a FRIDGE.
  const bad = of('FRIDGE', { height: 1900, fridge_h: 1950 });
  assert.ok(bad.warnings.some((w) => w.code === 'FRIDGE_ZONE_TOO_TALL'), 'it still says so');
  assert.equal(bad.panels.filter((p) => p.part === 'BACK').length, 0, 'and cuts no back');
  assert.equal(bad.panels.filter((p) => p.part === 'SPURS').length, 0, 'and no spurs panel');
  for (const p of bad.panels) assert.ok(p.h > 0 && p.w > 0, `${p.part} ${p.w} × ${p.h}`);
});

test('F15 …and every housing that CAN be built still carries both pieces', () => {
  for (const [type, over] of [
    ['FRIDGE', {}], ['FRIDGE_US', {}],
    ['FRIDGE', { height: 2400 }], ['FRIDGE_US', { height: 2400, fridge_h: 2000 }],
  ]) {
    const r = of(type, over);
    assert.deepEqual(r.warnings.map((w) => w.code), [], `${type} ${JSON.stringify(over)}`);
    assert.equal(r.panels.filter((p) => p.part === 'BACK').length, 1);
    assert.equal(r.panels.filter((p) => p.part === 'SPURS').length, 1);
  }
});
