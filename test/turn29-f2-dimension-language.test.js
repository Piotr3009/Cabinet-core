// ─── TURN 29 F2 — the two halves of the dimension language that did not land ─
//
// The owner walked turn 28's F8. One half landed and is not touched here:
// *"pozycja frontów pokazuje się dobrze, odsunięte od plusików — super."*
// Two halves did not, and both fail the same way — turn 28 wrote them into a
// path the eye never looks at.
//
//   F2.1  *"nie ma 100, plinthu nie pokazuje"* — the base unit's vertical chain
//         still reads a single 770. The law: TWO segments on ONE vertical line,
//         100 (the toe kick, stop arrows) below and 770 (the carcass, stop
//         arrows) above.
//   F2.2  *"nadal pokazuje na każdej szafce"* — a run of identical units
//         carries its W, and the 100 + 770 pair, ONCE, on the run's outermost
//         unit. An END PANEL does not break the run; a different cabinet does.
//
// ─── WHAT TURN 28'S TEST ACTUALLY ASSERTED ──────────────────────────────────
//
// `turn28-f8-dimension-language.test.js` asserted BOTH of these — and asserted
// them about `fullDimensions`, the memo behind `showAllDims`, which is the
// RIGHT-CLICK chain ("every number this cabinet has"). The chain the toolbar's
// "Show dimensions" draws is a different block forty lines further down the
// same file, and neither correction had reached it. The tests were green and
// the screen was unchanged, which is the same failure as F1's.
//
// So this file asserts the ROWS the visible chain is built from and the SET the
// scene hands each cabinet — and `scripts/e2e-turn29.mjs` counts the labels the
// mounted scene really draws, which is the half a source test cannot reach.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { dimensionCarriers, dimensionSignature } from '../src/engine/dimensions.js';
import { formatDimension } from '../src/engine/format.js';

const VIEW = readFileSync(new URL('../src/3d/UnitView.jsx', import.meta.url), 'utf8');
const SCENE = readFileSync(new URL('../src/3d/Scene.jsx', import.meta.url), 'utf8');

const placed = (id, type, x, extra = {}) => ({
  id,
  type,
  position: { wall: 0, x_mm: x, rotation_deg: 0 },
  params: { ...defaultParamsFor(type, P), unit_num: id, ...extra },
});
const build = (units) => units.map((u) => ({ unit: u, result: computeCabinet({ ...u.params }, P) }));

// ─── F2.1 — the 100 appears, on the chain the walk draws ────────────────────

/**
 * The visible chain's own rows, evaluated exactly as `3d/UnitView.jsx` builds
 * them. The memo is four lines of arithmetic over W, H, `legHeight` and
 * `isWallMounted`; running it here rather than matching its source is what lets
 * this test say what the NUMBERS are instead of what the file says.
 */
function heightChain({ W, H, legHeight, isWallMounted = false, sideOffset = 42 }) {
  const rows = [];
  if (!isWallMounted && legHeight > 0) {
    rows.push({
      key: 'kick', from: [W, -legHeight], to: [W, 0], offset: sideOffset, label: formatDimension(legHeight),
    });
  }
  rows.push({
    key: 'h', from: [W, 0], to: [W, H], offset: sideOffset, label: formatDimension(H),
  });
  return rows;
}

test('F2.1 the visible chain is the memo this test models — line for line', () => {
  // The guard that keeps the model above honest: the view's own rows, matched
  // as source, so a change to one without the other is a red test.
  const at = VIEW.indexOf('const heightChain = useMemo(');
  assert.ok(at > 0, 'the visible chain has its own memo');
  const block = VIEW.slice(at, VIEW.indexOf('}, [W, H, legHeight', at));
  assert.match(block, /if \(!isWallMounted && legHeight > 0\)/);
  assert.match(block, /key: 'kick', from: \[W, -legHeight\], to: \[W, 0\], offset: sideOffset, label: formatDimension\(legHeight\)/);
  assert.match(block, /key: 'h', from: \[W, 0\], to: \[W, H\], offset: sideOffset, label: formatDimension\(H\)/);
  // …and it is what the SHOWN chain is fed, not the right-click one.
  assert.match(VIEW, /rows=\{heightChain\}/);
});

test('F2.1 a base unit draws 100 and 770 — two rows, not one 770 across 870', () => {
  const rows = heightChain({ W: 600, H: 770, legHeight: 100 });
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((r) => r.label), ['100', '770']);
  // The toe kick is the segment BELOW zero and the carcass the one above it,
  // and zero is the outside of the carcass bottom — the datum every other
  // number on this cabinet is measured from.
  assert.deepEqual(rows[0].from, [600, -100]);
  assert.deepEqual(rows[0].to, [600, 0]);
  assert.deepEqual(rows[1].from, [600, 0]);
  assert.deepEqual(rows[1].to, [600, 770]);
  // …and they SHARE the line: one offset, one edge.
  assert.equal(rows[0].offset, rows[1].offset);
  assert.equal(rows[0].from[0], rows[1].from[0]);
  // The number the old chain printed is on no cut list at all.
  assert.ok(!rows.some((r) => r.label === '870'));
});

test('F2.1 the two numbers follow the project’s own toe kick, not a constant', () => {
  const rows = heightChain({ W: 600, H: 720, legHeight: 50 });
  assert.deepEqual(rows.map((r) => r.label), ['50', '720']);
  // A cabinet standing on the floor has no kick segment to draw.
  assert.deepEqual(heightChain({ W: 600, H: 770, legHeight: 0 }).map((r) => r.label), ['770']);
  // …and neither does a wall unit, which hangs.
  assert.deepEqual(
    heightChain({ W: 600, H: 720, legHeight: 100, isWallMounted: true }).map((r) => r.label),
    ['720'],
  );
});

test('F2.1 the engine agrees about what the two numbers are', () => {
  const r = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01', plinth: true, leg_height: 100 }, P);
  assert.equal(r.assemblies.carcass.legHeight, 100);
  assert.equal(r.params.height, 770);
  const rows = heightChain({ W: r.params.width, H: r.params.height, legHeight: r.assemblies.carcass.legHeight });
  assert.deepEqual(rows.map((row) => row.label), ['100', '770']);
});

// ─── F2.2 — the run says it once, on the chain the walk draws ───────────────

test('F2.2 the SCENE asks the run rule about the shown chain, not only the right-click one', () => {
  // Two carrier sets, two `wanted` lists, one function. The one this turn adds
  // is fed by the TOOLBAR's flag over every cabinet in the room.
  const at = SCENE.indexOf('const sizeChainOn = useMemo(');
  assert.ok(at > 0, 'the shown chain has a carrier set of its own');
  const block = SCENE.slice(at, SCENE.indexOf('const walls = useMemo(', at));
  assert.match(block, /dimensionCarriers\(\{/);
  assert.match(block, /wanted: showDimensions && !contourView \? results\.map\(\(e\) => e\.unit\.id\) : \[\]/);
  // …and it reaches the cabinet as its own prop.
  assert.match(SCENE, /carriesSizeChain=\{sizeChainOn\.has\(unit\.id\)\}/);
  assert.match(VIEW, /\{carriesSizeChain && \(/);
  // The NAME chip is not a dimension and is not gated by it (turn 17, F6.3).
  const shown = VIEW.slice(VIEW.indexOf('{showLabels && ('), VIEW.indexOf('{showAllDims && !contour && ('));
  assert.match(shown, /<DimLabel/);
  assert.ok(shown.indexOf('<DimLabel') > shown.indexOf('{carriesSizeChain && ('),
    'the chip stands outside the carrier gate');
});

test('F2.2 three identical base units: ONE carries the W and the 100 + 770', () => {
  const units = [placed('a', 'BUD', 0), placed('b', 'BUD', 600), placed('c', 'BUD', 1200)];
  const carriers = dimensionCarriers({
    results: build(units), wanted: units.map((u) => u.id), profile: P,
  });
  assert.deepEqual([...carriers], ['c'], 'the outermost unit of the run');
  // So the run of three draws THREE labels between them, not nine: one 600 on
  // the floor chain, one 100 and one 770 up the side.
  const rows = heightChain({ W: 600, H: 770, legHeight: 100 });
  assert.equal(carriers.size * (1 + rows.length), 3);
});

test('F2.2 a different cabinet breaks the run; an END PANEL does not', () => {
  const units = [
    placed('a', 'BUD', 0),
    placed('b', 'BUD', 600),
    placed('c', 'BUD', 1200, { width: 900 }),
    placed('d', 'BUD', 2100),
    placed('e', 'BUD', 2700),
  ];
  assert.deepEqual(
    [...dimensionCarriers({ results: build(units), wanted: units.map((u) => u.id), profile: P })].sort(),
    ['b', 'c', 'e'],
  );
  // An end panel is a piece attached to the RUN and not a fact about the
  // cabinet, so it changes no number the chain prints.
  const bare = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01' }, P);
  const panelled = computeCabinet({
    ...defaultParamsFor('BUD', P), unit_num: '01', end_panels: [{ side: 'R', thickness: 18 }],
  }, P);
  assert.ok(panelled.panels.some((p) => p.part === 'END-PANEL'));
  assert.equal(dimensionSignature(bare), dimensionSignature(panelled));
});

test('F2.2 a cabinet of a different HEIGHT keeps its own pair, because the pair differs', () => {
  // The rule compares the NUMBERS the chain would print, so a 720 beside a 770
  // is two cabinets and two chains — which is the whole reason this is not a
  // per-type comparison.
  const units = [placed('a', 'BUD', 0), placed('b', 'BUD', 600, { height: 720 })];
  const carriers = dimensionCarriers({
    results: build(units), wanted: ['a', 'b'], profile: P,
  });
  assert.deepEqual([...carriers].sort(), ['a', 'b']);
  assert.deepEqual(heightChain({ W: 600, H: 770, legHeight: 100 }).map((r) => r.label), ['100', '770']);
  assert.deepEqual(heightChain({ W: 600, H: 720, legHeight: 100 }).map((r) => r.label), ['100', '720']);
});

test('F2.2 with dimensions switched OFF nothing carries anything', () => {
  const units = [placed('a', 'BUD', 0), placed('b', 'BUD', 600)];
  assert.equal(dimensionCarriers({ results: build(units), wanted: [], profile: P }).size, 0);
});

// ─── and the half that landed is not touched ────────────────────────────────

test('F2 the FRONT labels the owner approved are exactly where turn 28 put them', () => {
  // *"pozycja frontów pokazuje się dobrze, odsunięte od plusików — super."*
  // The two placements are turn 28 F8.3 and F8.4 and this turn does not go
  // near them; the guard is here so that it cannot, quietly.
  const src = readFileSync(new URL('../src/engine/frontDimensions.js', import.meta.url), 'utf8');
  // A quarter of the way up from the front's bottom, off the centre line the
  // two labels used to cross on — and it is a NAMED profile number, not a
  // literal in the view (rule 3).
  assert.match(src, /widthFromBottom: num\(L\.widthFromBottom, 0\.25\)/);
  assert.match(src, /F8\.3: a quarter of the way up from the bottom/);
  // …and this turn changed nothing in that module.
  assert.doesNotMatch(src, /TURN 29|turn 29/);
});
