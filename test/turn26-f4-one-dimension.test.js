// ─── TURN 26 · F4 / R11 — ONE DIMENSION LANGUAGE, AT LAST ───────────────────
//
// The owner: the partition chain is right; shelves, sides and fronts are wrong
// — white labels, no arrows, badly placed, rounded to 1 mm.
//
// R11 is the rule that follows: **ONE DIMENSION COMPONENT.** The partition
// chain is the house style and the only implementation. Anything that
// dimensions anything — shelves, sides, fronts, gaps — feeds POINTS to that one
// component and draws nothing itself. Three existed (`DistanceArrows`,
// `HoverDimensions`, `DimLabel`) and that is exactly how four dialects
// happened.
//
// The proof CLAUDE.md asks for is grep-level: "no other module draws an
// arrowhead". That is what this file is, plus the two behaviours the rule is
// about — the half-millimetre precision and the placement.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { dimensionEntities, dimensionStyle } from '../src/engine/dimensionArrows.js';
import { DIMENSION_STEP_MM, formatDimension, formatMm } from '../src/engine/format.js';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(js|jsx)$/.test(name)) out.push(full);
  }
  return out;
}

const FILES = walk(SRC).map((f) => ({ path: relative(SRC, f), src: readFileSync(f, 'utf8') }));
const file = (rel) => FILES.find((f) => f.path === rel).src;

// ─── R11 — THE GREP ─────────────────────────────────────────────────────────

test('R11 — exactly ONE module turns a dimension into geometry in the scene', () => {
  // The pure GENERATOR of the shape is `engine/dimensionArrows.js` and it is
  // shared on purpose — the CNC part detail draws the same entities as SVG, so
  // neither surface invents an arrowhead. What must be unique is the module
  // that turns those entities into MESHES.
  const scene = FILES.filter((f) => f.path.startsWith('3d/'));
  const draws = scene.filter((f) => /dimensionSet\(|dimensionEntities\(/.test(f.src));
  assert.deepEqual(
    draws.map((f) => f.path),
    ['3d/DimensionChain.jsx'],
    'a second module in the scene builds dimension geometry',
  );
});

test('R11 — no module but the one draws an ARROWHEAD', () => {
  // An arrowhead is made in exactly two places in this repository and neither
  // of them is a component: the pure generator (`engine/dimensionArrows.js`
  // `head`), and the paper drawing engine, which writes DXF entities for a
  // printed sheet and is a different medium with a different convention.
  const HEAD = /head\s*\(|arrowHead|tickAngle|coneGeometry|arrowMm/;
  const offenders = FILES
    .filter((f) => HEAD.test(f.src))
    .map((f) => f.path)
    .sort();
  assert.deepEqual(offenders, [
    // the pure generator both surfaces consume
    'engine/dimensionArrows.js',
    // …and the profile, which only MENTIONS the retired knobs, in the comment
    // that says they are retired.
    'engine/profile.js',
  ].sort(), `an arrowhead is being drawn somewhere new: ${offenders.join(', ')}`);
  // …and `profile.js` only MENTIONS the retired knobs, in the comment that says
  // they are retired. It does not carry them.
  assert.equal(P.dimensions.arrowHead, undefined, 'the end-style knobs are gone');
  assert.equal(P.dimensions.tickAngle, undefined);
  assert.equal(P.dimensions.head, undefined);
});

test('R11 — the two components that drew their own are POINTS now', () => {
  for (const rel of ['3d/DistanceArrows.jsx', '3d/HoverDimensions.jsx']) {
    const src = file(rel);
    assert.match(src, /import DimensionChain from '\.\/DimensionChain\.jsx'/, `${rel} feeds the one component`);
    assert.match(src, /<DimensionChain/, `${rel} renders it`);
    // Nothing left that makes a bar, a tick or a caption of its own.
    assert.ok(!/function Stroke\(/.test(src), `${rel} still has its own Stroke`);
    assert.ok(!/boxGeometry args=\{\[length/.test(src), `${rel} still builds a dimension bar`);
    assert.ok(!/from '\.\/DimLabel\.jsx'/.test(src), `${rel} still labels a dimension itself`);
  }
});

test('R11 — every remaining `DimLabel` in the scene is a CHIP, and it is named', () => {
  // F4.1: "`DimLabel`'s standalone use for dimensions ends (it may stay for
  // non-dimension chips like unit names)." These are the chips that stay. Each
  // is named with its reason, and the list is asserted so it cannot quietly
  // grow back into a fourth dialect.
  const CHIPS = {
    '3d/UnitView.jsx': [
      'the cabinet’s NAME and depth — a label, not a measurement (turn 17, F6.3)',
      'the height MAGNET’s value while a shelf is in the hand — F4.4 says in as '
      + 'many words that turn 25’s magnet stays, and its chip with it',
      'the dragged shelf’s own stored height, the magnet chip’s pair: a live '
      + 'readout of a field, beside the piece, for the length of the drag',
    ],
    '3d/Room.jsx': [
      'a WALL’s width — the room’s own caption, on the wall. A wall has no front '
      + 'edge to drop a witness line from and is not furniture',
      'the room’s HEIGHT, at its corner, for the same reason',
    ],
    '3d/Ruler.jsx': [
      'the ruler’s live span. The user has DRAWN the dimension line himself; '
      + 'the chip is its value',
    ],
  };
  const users = FILES
    .filter((f) => f.path.startsWith('3d/') && f.path !== '3d/DimLabel.jsx')
    .filter((f) => /from '\.\/DimLabel\.jsx'/.test(f.src))
    .map((f) => f.path)
    .sort();
  assert.deepEqual(users, Object.keys(CHIPS).sort(), 'a module started labelling dimensions again');
  for (const [rel, reasons] of Object.entries(CHIPS)) {
    const count = (file(rel).match(/<DimLabel/g) || []).length;
    assert.equal(count, reasons.length, `${rel}: ${count} chips, ${reasons.length} named`);
  }
});

// ─── F4.3 — HALF A MILLIMETRE ───────────────────────────────────────────────

test('F4.3 — a dimension reads to 0.5 mm, and the cut list still reads to 0.1', () => {
  assert.equal(DIMENSION_STEP_MM, 0.5);
  // The owner's own examples: a 3 mm gap and the half-millimetre differences
  // these are for.
  assert.equal(formatDimension(3), '3');
  assert.equal(formatDimension(2.5), '2.5');
  assert.equal(formatDimension(2.7), '2.5');
  assert.equal(formatDimension(2.8), '3');
  assert.equal(formatDimension(196.5), '196.5');
  assert.equal(formatDimension(704.7), '704.5');
  assert.equal(formatDimension(0), '0');
  assert.equal(formatDimension(null), '');
  assert.equal(formatDimension(600, { unit: true }), '600 mm');

  // …and it is a MODE. The cut list, the BOM and every field still print what
  // the saw is set to, which is a tenth and has been since turn 5.
  assert.equal(formatMm(704.7), '704.7');
  assert.equal(formatMm(2.7), '2.7');
  assert.notEqual(formatMm(2.7), formatDimension(2.7));
});

test('F4.3 — and the chain’s own caption is that number', () => {
  const style = dimensionStyle(P);
  const d = dimensionEntities({ from: [0, 0], to: [2.7, 0], style });
  assert.equal(d.text.value, '2.5', 'not "3" — which is what the owner was looking at');
  const gap = dimensionEntities({ from: [0, 0], to: [3, 0], style });
  assert.equal(gap.text.value, '3');
  // A caller may still name its own value — "W 600", "S1 300 fixed" — and that
  // label wins, because a chain that is telling you WHICH shelf is not only a
  // number.
  const named = dimensionEntities({
    from: [0, 0], to: [600, 0], style, label: 'W 600',
  });
  assert.equal(named.text.value, 'W 600');
});

// ─── F4.2 — WHERE THEY GO ───────────────────────────────────────────────────

test('F4.2 — a chain lies in ONE of two planes, and the caller says which', () => {
  const src = file('3d/DimensionChain.jsx');
  // The floor plane and the face plane, and nothing else: a chain is flat.
  assert.match(src, /plane === 'xz' \? \[mu, at, mv\] : \[mu, mv, at\]/);
  // Horizontal chains lie ON THE FLOOR in front of the run.
  const view = file('3d/UnitView.jsx');
  assert.match(view, /plane="xz"[\s\S]{0,120}at=\{floorY\}/, 'the width chain lies on the floor');
  assert.match(view, /const floorY = isWallMounted \? 0 : -legHeight;/);
  // …and vertical ones run down the SIDE: the chain's own points are at the
  // cabinet's right-hand edge, pushed clear of it by an offset.
  assert.match(view, /from: \[W, floorY\], to: \[W, H\], offset: sideOffset/);
  // The room's distances lie on the floor too.
  const room = file('3d/DistanceArrows.jsx');
  assert.match(room, /plane="xz"/);
});

test('F4.2 — the witness lines really are drawn, and only when there is an offset', () => {
  const style = dimensionStyle(P);
  // A measurement BETWEEN two features is drawn straight through them: no
  // witness lines, because there is nothing to carry the eye out to.
  const through = dimensionEntities({ from: [0, 0], to: [400, 0], offset: 0, style });
  // line + two heads × two strokes = 5 segments.
  assert.equal(through.segments.length, 5);
  // Pushed clear, it grows the two witness lines a drawing has.
  const clear = dimensionEntities({ from: [0, 0], to: [400, 0], offset: 60, style });
  assert.equal(clear.segments.length, 7);
  // …and they run from just off the measured point out past the line.
  const [w1] = clear.segments;
  assert.ok(Math.abs(w1[0][1] - style.gapMm) < 1e-9, 'a drawing leaves a gap at the feature');
  assert.ok(w1[1][1] > 60, 'and carries the line a little past the dimension');
});

test('F4.4 — shelves and side panels are in the one language too', async () => {
  const { pieceHoverRows } = await import('../src/engine/hoverRows.js');
  const { computeCabinet } = await import('../src/engine/cabinet.js');
  const { defaultParamsFor } = await import('../src/engine/types.js');
  const r = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01', shelves: 2 }, P);

  const shelf = r.panels.find((p) => p.part === 'SHELF');
  const side = r.panels.find((p) => p.id === 'BUL');
  for (const piece of [shelf, side]) {
    const set = pieceHoverRows(r, piece.id, P);
    assert.ok(set && set.rows.length, `${piece.id} has numbers worth reading`);
    // Every row is a PAIR OF POINTS, which is the whole of R11: the piece says
    // what to measure and the one component draws it.
    for (const row of set.rows) {
      assert.equal(row.from.length, 2);
      assert.equal(row.to.length, 2);
      // Horizontal or vertical and nothing else (turn 25, F14.3).
      assert.ok(row.from[0] === row.to[0] || row.from[1] === row.to[1], 'no sloping dimensions');
    }
  }
  // …and `HoverDimensions` hands exactly those rows over untouched.
  assert.match(file('3d/HoverDimensions.jsx'), /rows: set\.rows\.map\(\(r, i\) => \(\{/);
});
