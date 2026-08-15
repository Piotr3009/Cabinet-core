// ─── TURN 30 F21 — glass wall units ────────────────────────────────────────
//
// CLAUDE.md: "Parent: KIT_WUD. Front style `glass`: frame + translucent panel
// in 3D, BOM says glass door; hinge rule unchanged (glass doors take the same
// cups unless the owner says otherwise — note it in the report)."
//
// ─── A GLASS DOOR IS A SHAKER WHOSE PANEL IS NOT THERE ──────────────────────
//
// That sentence is the whole design. The frame is the SHAKER's — the same
// number, cut by the same arithmetic in `engine/shaker.js` — and the recess
// goes all the way through instead of 6 mm deep. Borrowing the frame rather
// than giving glass one of its own is deliberate: a kitchen whose glass doors
// wear a different frame from its solid ones is a kitchen nobody meant to
// build, and one law is one thing to get right.
//
// ─── THE HINGE RULE IS UNCHANGED, AND THAT IS THE OWNER'S OWN INSTRUCTION ───
//
// "glass doors take the same cups unless the owner says otherwise" — so a glass
// wall unit is drilled HOLE FOR HOLE as a wall unit with a solid door, and the
// first test says exactly that. It is noted in the report as asked.

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCabinet } from '../src/engine/cabinet.js';
import {
  UNIT_NUM_PREFIX, categoryOf, defaultParamsFor, getUnitType,
} from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { FRONT_STYLE_OPTIONS } from '../src/engine/design.js';
import { FRONT_STYLE_ART } from '../src/engine/frontStyleArt.js';
import { flattenLibrary, resolveEntry } from '../src/engine/library.js';
import { glassAperture, isGlassFront, shakerFrameMm } from '../src/engine/shaker.js';

const of = (type, over = {}) => computeCabinet({
  ...defaultParamsFor(type, P), unit_num: '01', doors: true, ...over,
}, P);
const holes = (r) => r.drills
  .map((d) => `${String(d.panel).replace(/^[^-]*-/, '')}|${d.layer}|${d.kind}|${d.x}|${d.y}|${d.d}`).sort();
const leaf = (r) => r.panels.find((p) => p.role === 'front');

// ─── 1. THE HINGE RULE IS UNCHANGED ────────────────────────────────────────

test('F21 a glass wall unit is drilled EXACTLY as a wall unit with a solid door', () => {
  const glass = of('WUD_GLASS');
  const solid = of('WUD');
  assert.equal(glass.drills.length, solid.drills.length);
  assert.deepEqual(holes(glass), holes(solid), 'hole for hole — the same cups');
  assert.deepEqual(glass.drillSummary, solid.drillSummary);
  assert.equal(glass.drillSummary.hinge_centers.length, 3, 'the wall kit’s own three');
});

test('F21 …and the cups are bored in the LEAF exactly where they always were', () => {
  const glass = of('WUD_GLASS');
  const solid = of('WUD');
  assert.deepEqual(glass.drillSummary.front_cup_y, solid.drillSummary.front_cup_y);
  assert.deepEqual(
    glass.drills.filter((d) => d.layer === P.hinges.cups.layer).map((d) => [d.x, d.y, d.d]),
    solid.drills.filter((d) => d.layer === P.hinges.cups.layer).map((d) => [d.x, d.y, d.d]),
  );
  // The board is the same board, too: the hinge ladder reads the full
  // thickness and a glass door has not lost any.
  assert.equal(leaf(glass).thickness, leaf(solid).thickness);
});

// ─── 2. THE FRAME IS THE SHAKER'S ──────────────────────────────────────────

test('F21 the aperture is the shaker’s own panel rectangle, cut all the way through', () => {
  const glass = of('WUD_GLASS');
  const front = leaf(glass);
  const frame = shakerFrameMm({}, P);
  const cut = front.cnc.pockets.find((k) => k.layer === 'GLASS_APERTURE');
  assert.ok(cut, 'the aperture is machined');
  assert.equal(cut.cutout, true);
  assert.equal(cut.depth, front.thickness, 'all the way through — a pane, not a recess');
  // The same rectangle a shaker of the same leaf would recess.
  const shaker = of('WUD', { front_type: 'S' }).panels.find((p) => p.role === 'front');
  const recess = shaker.cnc.pockets.find((k) => k.layer === P.front.types.S.pocketLayer);
  assert.deepEqual(
    [cut.x1, cut.y1, cut.x2, cut.y2],
    [recess.x1, recess.y1, recess.x2, recess.y2],
    'one frame law, two styles',
  );
  assert.equal(front.meta.glass.frame, frame);
  assert.equal(front.meta.glass.aperture.w, cut.x2 - cut.x1);
});

test('F21 …and it is REFUSED, not clamped, exactly as the shaker is', () => {
  // A 200 mm frame on a 300 mm door is two frames overlapping, whether the
  // middle is glass or oak. The front is cut PLAIN and the cabinet says so.
  const bad = of('WUD_GLASS', { width: 300, shaker_frame_mm: 200 });
  assert.ok(bad.warnings.some((w) => w.code === 'GLASS_FRAME_TOO_WIDE'), 'it says so');
  const front = leaf(bad);
  assert.equal((front.cnc.pockets || []).filter((k) => k.layer === 'GLASS_APERTURE').length, 0);
  assert.equal(front.meta.glass, undefined, 'and no pane is ordered for a hole that is not there');
  assert.equal(bad.hardware.filter((h) => h.role === 'glass_pane').length, 0);
});

test('F21 the pure function is askable, and it answers off the piece', () => {
  assert.equal(isGlassFront({ role: 'front', meta: { frontType: 'GL' } }), true);
  assert.equal(isGlassFront({ role: 'front', meta: { frontType: 'S' } }), false);
  assert.equal(isGlassFront({ role: 'side', meta: { frontType: 'GL' } }), false);
  const a = glassAperture({
    w: 400, h: 700, frame: 70, thickness: 25,
  }, P);
  assert.equal(a.depth, 25);
  assert.equal(a.layer, 'GLASS_APERTURE');
  assert.equal(a.x2 - a.x1, 400 - 2 * 70);
  assert.equal(glassAperture({ w: 100, h: 700, frame: 70, thickness: 25 }, P), null, 'refused');
});

// ─── 3. "BOM SAYS GLASS DOOR" ──────────────────────────────────────────────

test('F21 the pane is ORDERED, to the aperture it fills — and never cut', () => {
  const glass = of('WUD_GLASS');
  const pane = glass.hardware.find((h) => h.role === 'glass_pane');
  assert.ok(pane, 'the pane is on the order form');
  assert.equal(pane.qty, 1);
  assert.equal(pane.label, 'Glass pane');
  assert.equal(pane.spec.aperture_w_mm, leaf(glass).meta.glass.aperture.w);
  assert.match(pane.spec_label, /mm aperture/);
  // Glass is not board: it reaches no panel, no sheet and no CSV line.
  assert.equal(glass.panels.filter((p) => /glass|pane/i.test(p.part)).length, 0);
  assert.equal(glass.csvLines.filter((l) => /glass|pane/i.test(l)).length, 0);
  // …and a solid door orders none.
  assert.equal(of('WUD').hardware.filter((h) => h.role === 'glass_pane').length, 0);
});

test('F21 two glass leaves are ONE order line of two', () => {
  const pair = of('WUD_GLASS', { width: 900 });
  assert.equal(pair.panels.filter((p) => p.role === 'front').length, 2);
  const panes = pair.hardware.filter((h) => h.role === 'glass_pane');
  assert.equal(panes.length, 1, 'one line');
  assert.equal(panes[0].qty, 2, 'of two');
});

// ─── 4. THE STYLE, AND THE KIT ─────────────────────────────────────────────

test('F21 `glass` is a front STYLE, so it can go on any front', () => {
  assert.ok(FRONT_STYLE_OPTIONS.some((o) => o.id === 'GL' && o.label === 'Glass'));
  assert.equal(P.front.types.GL.label, 'Glass');
  assert.equal(migrateCabinetProfile({}).front.types.GL.apertureLayer, 'GLASS_APERTURE');
  // The gallery has a picture for it, like every other shape.
  assert.ok(FRONT_STYLE_ART.GL?.length >= 2);
  // A BASE unit can wear it, and it is cut the same way.
  const base = of('BUD', { front_type: 'GL' });
  assert.ok(leaf(base).meta.glass, 'a glazed base door is a glazed door');
  assert.deepEqual(
    holes(base),
    holes(of('BUD')),
    'and the drilling is still the base kit’s own',
  );
  // …and a glass UNIT can wear a solid door, because the style is a default
  // and not a law.
  const solidGlassUnit = of('WUD_GLASS', { front_type: 'F' });
  assert.equal(leaf(solidGlassUnit).meta.glass, undefined);
  assert.equal(solidGlassUnit.hardware.filter((h) => h.role === 'glass_pane').length, 0);
});

test('F21 the KIT is KIT_WUD, and it arrives wearing glass', () => {
  const glass = getUnitType('WUD_GLASS');
  const wall = getUnitType('WUD');
  for (const key of ['lisp', 'hingeRule', 'cupRule', 'mount', 'heightGroup', 'hangers', 'doorExtend', 'legs']) {
    assert.deepEqual(glass[key], wall[key], `${key} is the wall kit's`);
  }
  assert.equal(glass.lisp, 'KIT_WUD_FULL.lsp');
  assert.equal(glass.frontType, 'GL');
  assert.equal(defaultParamsFor('WUD_GLASS', P).front_type, 'GL');
  // …and no kit written before tonight declares a front type, so every one of
  // them still takes the workshop's own default.
  assert.equal(wall.frontType, undefined);
  assert.equal(defaultParamsFor('WUD', P).front_type, P.front.defaultType);
  assert.deepEqual(P.glassWallUnit.defaults, {
    width: 600, height: 720, depth: 400, mountHeight: 1500,
  });
});

test('F21 it is in the KITCHEN category and the held-open row became a kit', () => {
  assert.equal(categoryOf('WUD_GLASS').id, 'kitchen');
  const entry = flattenLibrary().find((e) => e.id === 'glass-unit');
  assert.equal(entry.kind, 'type');
  assert.equal(entry.typeId, 'WUD_GLASS');
  assert.equal(resolveEntry(entry, P).enabled, true);
  assert.match(resolveEntry(entry, P).hint, /ordered, not cut/);
  assert.equal(UNIT_NUM_PREFIX.WUD_GLASS, 'WG');
});
