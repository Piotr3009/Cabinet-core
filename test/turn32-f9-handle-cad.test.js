// ─── Turn 32, CLAUDE.md F9: the handle preview — the owner's drawing ────────
//
// His screenshot is the spec: on hover the handle shows CAD-style dimension
// lines with arrowheads — the offset from the top edge (e.g. 50), the offset
// from the side edge, and the HOLE SPACING (e.g. 160) between the two drill
// centres — in the drawing-office blue, replacing the single orange number
// T31 F7 shipped. The aura (catchment) stays; only the label changes.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { handleCadRows } from '../src/engine/hoverAura.js';

const dist = (r) => Math.hypot(r.to[0] - r.from[0], r.to[1] - r.from[1]);

test('a bar draws the owner’s three figures: top offset, side offset, spacing', () => {
  const rows = handleCadRows({
    holes: [[550, 2100], [550, 1940]],   // two drill centres, 160 apart
    top: 2150,
    sides: [0, 600],
    axis: 'vertical',
  });
  assert.deepEqual(rows.map((r) => r.key), ['handle-top', 'handle-side', 'handle-centres']);
  const [topRow, sideRow, centres] = rows;
  assert.equal(dist(topRow), 50, '50 from the top edge');
  assert.equal(dist(sideRow), 50, '50 in from the side edge');
  assert.equal(dist(centres), 160, 'the hole spacing between the two drill centres');
  assert.notEqual(centres.offset, 0, 'the spacing line stands clear of the offsets');
});

test('the reference hole is the one nearest a side edge, measured to THAT edge', () => {
  const rows = handleCadRows({
    holes: [[100, 700], [260, 700]],     // horizontal bar near the left stile
    top: 720,
    sides: [0, 600],
    axis: 'horizontal',
  });
  const side = rows.find((r) => r.key === 'handle-side');
  assert.deepEqual(side.from, [0, 700], 'the LEFT edge — the nearer one');
  assert.equal(dist(side), 100);
  assert.equal(dist(rows.find((r) => r.key === 'handle-top')), 20);
});

test('a knob has one hole and no spacing row; nothing given, nothing drawn', () => {
  const knob = handleCadRows({
    holes: [[300, 700]], top: 720, sides: [0, 600], axis: 'vertical',
  });
  assert.deepEqual(knob.map((r) => r.key), ['handle-top', 'handle-side']);
  assert.deepEqual(handleCadRows({}), []);
  assert.deepEqual(handleCadRows({ holes: [[1, 2]], top: null, sides: [0, 10] }), []);
});

test('the drawing REPLACES the orange number — the aura and the linger stay', () => {
  const aura = readFileSync(new URL('../src/3d/HoverAura.jsx', import.meta.url), 'utf8');
  assert.match(aura, /hot && !dims/, 'no orange label while the drawing shows');
  assert.match(aura, /\{hot && dims\}/, 'the drawing shows only while the aura is hot');
  const hardware = readFileSync(new URL('../src/3d/Hardware.jsx', import.meta.url), 'utf8');
  assert.match(hardware, /dims=\{cadDims\(\[\[wx, wy\]\]\)\}/, 'the knob carries its drawing');
  assert.match(hardware, /dims=\{cadDims\(holes \? postAt : \[\[wx, wy\]\]\)\}/, 'the bar carries its drawing');
  assert.match(hardware, /dimensionStyle\(profile\)/, 'the drawing-office blue — the hover ink, never the orange');
});

test('the GLOBAL "Front dimensions" toggle stands in the View menu and the door modal — one flag', () => {
  const bar = readFileSync(new URL('../src/components/TopBar.jsx', import.meta.url), 'utf8');
  assert.match(bar, /Show front dimensions/);
  assert.match(bar, /checked: showFrontDimensions/);
  const modal = readFileSync(new URL('../src/components/DoorModal.jsx', import.meta.url), 'utf8');
  assert.match(modal, /showFrontDimensions/);
  assert.match(modal, /toggleFrontDimensions/, 'the same uiStore flag, both doors');
});
