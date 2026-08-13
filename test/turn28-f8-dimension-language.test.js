// ─── TURN 28 F8 — the dimension language, four corrections ──────────────────
//
// All four are the owner's own words, all four are VISUAL, and all four are in
// the ONE dimension component's inputs (R11) rather than in a second drawing.
//
//   1. HEIGHT IS NEVER "FROM THE FLOOR". A base unit's vertical chain is TWO
//      segments on one line: 100 (the toe kick) below and 770 (the carcass)
//      above, stacked, each with its own stop arrows.
//   2. A RUN OF IDENTICAL CABINETS DIMENSIONS ONCE, on the outermost unit —
//      not per cabinet. An end panel does NOT break the run; a different
//      cabinet does.
//   3. "Show front dimensions": the WIDTH label sits at a quarter of the
//      front's height from its BOTTOM, off the centre where the two labels
//      crossed each other.
//   4. The HEIGHT label moves clear to the right of centre — the centre is
//      where the plus buttons live and they covered everything.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { dimensionCarriers, dimensionSignature } from '../src/engine/dimensions.js';
import { frontRects, frontSizes } from '../src/engine/frontDimensions.js';

const VIEW = readFileSync(new URL('../src/3d/UnitView.jsx', import.meta.url), 'utf8');
const SCENE = readFileSync(new URL('../src/3d/Scene.jsx', import.meta.url), 'utf8');

const unit = (type, extra = {}) => computeCabinet({
  ...defaultParamsFor(type, P), unit_num: '01', ...extra,
}, P);

/** A cabinet standing on a wall, as the store shapes one. */
const placed = (id, type, x, extra = {}) => ({
  id,
  type,
  position: { wall: 0, x_mm: x, rotation_deg: 0 },
  params: { ...defaultParamsFor(type, P), unit_num: id, ...extra },
});
const build = (units) => units.map((u) => ({ unit: u, result: computeCabinet({ ...u.params }, P) }));

// ─── F8.1 — two segments on one line ────────────────────────────────────────

test('F8.1 the toe kick and the carcass are two chains, and they share a line', () => {
  // The chain is built in the view (it is a picture, not a cut), so the guard
  // is the source — the same shape turn 26's own R11 guard takes.
  const at = VIEW.indexOf('const fullDimensions = useMemo(');
  const block = VIEW.slice(at, VIEW.indexOf('}, [showAllDims', at));
  // The carcass runs from ZERO — the floor of the box — and not from −legHeight.
  assert.match(block, /column\('h', 0, H, `H \$\{formatDimension\(H\)\}`\);/);
  assert.doesNotMatch(block, /column\('h', isWallMounted \? 0 : -legHeight/, 'the floor-to-top total is gone');
  // …and the toe kick is the segment UNDER it, on the SAME offset step, which
  // is what puts the two on one vertical line.
  assert.match(block, /column\('kick', -legHeight, 0, `toe kick \$\{formatDimension\(legHeight\)\}`\);/);
  assert.match(block, /column\('mount', 0, -result\.assemblies\.mountHeight, [^;]*\);/);
  // The default step is 1 for both — a chain that passed 2 would stand off on
  // its own line, which is the thing being corrected.
  assert.match(block, /const column = \(key, from, to, label, step = 1, flank = unitFlank\)/);
});

test('F8.1 the two numbers ARE the two a joiner orders board to', () => {
  const r = unit('BUD', { plinth: true, leg_height: 100 });
  assert.equal(r.assemblies.carcass.legHeight, 100, 'the toe kick below');
  assert.equal(r.params.height, 770, 'the carcass above');
  // …and the total the old chain printed is on no cut list at all.
  assert.equal(100 + 770, 870);
  assert.ok(!r.panels.some((p) => Math.round(p.h) === 870), 'nobody cuts an 870');
});

// ─── F8.2 — a run of identical cabinets dimensions once ─────────────────────

test('F8.2 three identical base units draw ONE chain, on the outermost', () => {
  const units = [placed('a', 'BUD', 0), placed('b', 'BUD', 600), placed('c', 'BUD', 1200)];
  const carriers = dimensionCarriers({ results: build(units), wanted: ['a', 'b', 'c'], profile: P });
  assert.deepEqual([...carriers], ['c'], 'the right-hand end of the run carries it');
});

test('F8.2 a DIFFERENT cabinet breaks the run — both stretches keep a chain', () => {
  const units = [
    placed('a', 'BUD', 0),
    placed('b', 'BUD', 600),
    placed('c', 'BUD', 1200, { width: 900 }),
    placed('d', 'BUD', 2100),
    placed('e', 'BUD', 2700),
  ];
  const carriers = dimensionCarriers({
    results: build(units), wanted: ['a', 'b', 'c', 'd', 'e'], profile: P,
  });
  assert.deepEqual([...carriers].sort(), ['b', 'c', 'e'], 'one per stretch, plus the odd one out');
});

test('F8.2 an END PANEL does not break the run', () => {
  // An end panel is a piece attached to the RUN, not a fact about the cabinet,
  // so two cabinets that differ only by one are still identical here. Said as
  // the signature, which is what the comparison actually uses.
  const bare = unit('BUD');
  const panelled = unit('BUD', { end_panels: [{ side: 'R', thickness: 18 }] });
  assert.ok(panelled.panels.some((p) => p.part === 'END-PANEL'), 'it really grew one');
  assert.equal(dimensionSignature(bare), dimensionSignature(panelled));
});

test('F8.2 a different HEIGHT, DEPTH or interior is a different cabinet', () => {
  const base = dimensionSignature(unit('BUD'));
  assert.notEqual(base, dimensionSignature(unit('BUD', { height: 720 })));
  assert.notEqual(base, dimensionSignature(unit('BUD', { depth: 500 })));
  assert.notEqual(base, dimensionSignature(unit('BUD', { width: 900 })));
  assert.notEqual(base, dimensionSignature(unit('BUD', { shelves: 2 })));
  assert.notEqual(base, dimensionSignature(unit('SINK')), 'and so is a different kit');
  // …and two cabinets built the same way are the same, whatever they are called.
  assert.equal(base, dimensionSignature(unit('BUD', { unit_num: '77' })));
});

test('F8.2 one cabinet on its own is untouched, and so is one that is switched off', () => {
  const units = [placed('a', 'BUD', 0), placed('b', 'BUD', 600)];
  const results = build(units);
  assert.deepEqual([...dimensionCarriers({ results, wanted: ['a'], profile: P })], ['a']);
  assert.deepEqual([...dimensionCarriers({ results, wanted: [], profile: P })], []);
  // A neighbour that is switched OFF is not a duplicate as far as the drawing
  // is concerned, so the one that is ON still draws.
  assert.deepEqual([...dimensionCarriers({ results, wanted: ['b'], profile: P })], ['b']);
});

test('F8.2 two identical cabinets that are NOT in one run both draw', () => {
  const units = [placed('a', 'BUD', 0), placed('b', 'BUD', 3000)];
  const carriers = dimensionCarriers({ results: build(units), wanted: ['a', 'b'], profile: P });
  assert.deepEqual([...carriers].sort(), ['a', 'b'], 'a metre of wall between them is not a run');
});

test('F8.2 the SCENE asks the engine and draws what it is told', () => {
  assert.match(SCENE, /import \{ dimensionCarriers \} from '\.\.\/engine\/dimensions\.js';/);
  assert.match(SCENE, /const dimensionOn = useMemo\(/);
  assert.match(SCENE, /showAllDims=\{dimensionOn\.has\(unit\.id\)\}/);
  assert.doesNotMatch(SCENE, /showAllDims=\{Boolean\(unitDimensions\[unit\.id\]\)\}/, 'the per-cabinet reading is gone');
});

// ─── F8.3 / F8.4 — where a front's own two labels sit ───────────────────────

test('F8.3 the WIDTH label sits a quarter of the way up from the bottom', () => {
  const r = unit('BUD', { width: 900 });
  const rects = frontRects(r);
  const rows = frontSizes(r, P);
  assert.equal(P.hoverDimensions.frontLabels.widthFromBottom, 0.25);
  for (const f of rects) {
    const row = rows.find((x) => x.kind === 'front-w' && x.a === f.id);
    assert.ok(Math.abs(row.at - (f.y + f.h * 0.25)) < 1e-9);
    assert.notEqual(row.at, f.y + f.h / 2, 'off the centre, where they crossed');
    assert.ok(row.at > f.y && row.at < f.y + f.h, 'and still on the leaf');
  }
});

test('F8.4 the HEIGHT label stands clear to the RIGHT of centre', () => {
  const r = unit('BUD', { width: 900 });
  const rows = frontSizes(r, P);
  const L = P.hoverDimensions.frontLabels;
  for (const f of frontRects(r)) {
    const row = rows.find((x) => x.kind === 'front-h' && x.a === f.id);
    const shift = Math.min(L.heightOffsetMm, f.w * L.heightOffsetMaxShare);
    assert.ok(Math.abs(row.at - (f.x + f.w / 2 + shift)) < 1e-9);
    assert.ok(row.at > f.x + f.w / 2, 'to the RIGHT — where the plus button is not');
    assert.ok(row.at < f.x + f.w, 'and still on the leaf');
  }
});

test('F8.4 …and it cannot be carried off a narrow front', () => {
  // A 150 mm piece: the full 75 mm would land it exactly on its own right
  // edge, so the share is what answers instead.
  const L = P.hoverDimensions.frontLabels;
  const W = 150;
  const rows = frontSizes({
    params: { width: W, height: 200 },
    panels: [{
      id: 'x', role: 'front', part: 'DRAWER-FRONT', box: { x: 0, y: 0, w: W, h: 140, d: 25 },
    }],
  }, P);
  const row = rows.find((x) => x.kind === 'front-h');
  assert.ok(W * L.heightOffsetMaxShare < L.heightOffsetMm, 'the clamp is the one that bites here');
  assert.ok(Math.abs(row.at - (W / 2 + W * L.heightOffsetMaxShare)) < 1e-9);
  assert.ok(row.at < W, 'and it stays on the piece');
});

test('F8.3/F8.4 the two labels no longer cross, on any front in the app', () => {
  for (const type of ['BUD', 'BUDR', 'WARDROBE', 'WUD', 'DW_PANEL']) {
    const r = unit(type, { project_handle: { type: 'knob' } });
    const rows = frontSizes(r, P);
    for (const f of frontRects(r)) {
      const w = rows.find((x) => x.kind === 'front-w' && x.a === f.id);
      const h = rows.find((x) => x.kind === 'front-h' && x.a === f.id);
      // They cross where the horizontal row's y meets the vertical row's x. If
      // neither sits on the other's line there is no crossing to look at.
      assert.notEqual(w.at, f.y + f.h / 2, `${type} ${f.id}: the width is off centre`);
      assert.notEqual(h.at, f.x + f.w / 2, `${type} ${f.id}: and so is the height`);
    }
  }
});

test('F8.3/F8.4 the numbers are the PROFILE’s, and a caller with none draws the same', () => {
  const r = unit('BUD');
  assert.deepEqual(frontSizes(r), frontSizes(r, P), 'the defaults are the profile’s own values');
  // …and a workshop that wants them elsewhere changes a value, not a component.
  const moved = frontSizes(r, {
    hoverDimensions: { frontLabels: { widthFromBottom: 0.5, heightOffsetMm: 0, heightOffsetMaxShare: 1 } },
  });
  const f = frontRects(r)[0];
  assert.equal(moved.find((x) => x.kind === 'front-w').at, f.y + f.h / 2);
  assert.equal(moved.find((x) => x.kind === 'front-h').at, f.x + f.w / 2);
  assert.match(VIEW, /frontDimensionRows\(result, profile\)/, 'the view hands the profile in');
});
