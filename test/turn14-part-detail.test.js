// ─── Turn 14, F7: the element DETAIL drawing ────────────────────────────────
//
// The right-hand half of the detail window: the machined outline, every path on
// it, a layer legend and the dimensions that are always visible.
//
// CLAUDE.md asks for the turn-6/7 drawings machinery to be REUSED rather than
// forked, and the test that says so is the one about the dimension entities:
// they come out of `dimensionEntities`, on the DIMENSIONS layer, with the
// extension lines a draughtsman leaves — the same function the front elevation
// and the unit card are drawn with.

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { defaultParamsFor } from '../src/engine/types.js';
import {
  partDetailDrawing, partLegend, partMachinings, partSize,
} from '../src/engine/drawings/partDetail.js';
import { CNC_LAYERS } from '../src/engine/cnc/layers.js';

const wardrobe = computeCabinet({
  ...defaultParamsFor('WARDROBE', P), unit_num: 'A01', shelves: 2,
}, P);
const panelOf = (id) => wardrobe.panels.find((p) => p.id === id);
const drawingOf = (id) => partDetailDrawing(panelOf(id), { drills: wardrobe.drills, profile: P });

test('F7.2 — the drawing is the part: its outline, its size, its machining', () => {
  const d = drawingOf('BUL');
  assert.equal(d.id, 'BUL');
  assert.ok(d.outline.length > 4, 'a side panel is not a rectangle — it carries tabs');
  assert.deepEqual(partSize(panelOf('BUL')), { w: panelOf('BUL').w, h: panelOf('BUL').h, rotated: false });
  assert.ok(d.machinings.length > 0, 'and it carries paths');
});

test('F7.2 — a panel nested TURNED is drawn in its own frame', () => {
  const fridge = computeCabinet({ ...defaultParamsFor('FRIDGE', P), unit_num: 'F01' }, P);
  const back = fridge.panels.find((p) => p.part === 'BACK');
  const size = partSize(back);
  assert.equal(size.rotated, true);
  assert.equal(size.w, back.cnc.drawn_w, 'the DRAWING has its height along x');
  assert.equal(size.h, back.cnc.drawn_h);
});

test('F7.3 — every machining has an id, a layer and a NOTE a joiner would say', () => {
  const d = drawingOf('BUL');
  const ids = new Set();
  for (const m of d.machinings) {
    assert.ok(m.id && !ids.has(m.id), `${m.id} is unique`);
    ids.add(m.id);
    assert.ok(['pocket', 'hole', 'mark'].includes(m.kind), m.kind);
    assert.ok(m.layer, 'it names its layer');
    assert.ok(m.note && m.note.length > 8, `${m.id}: "${m.note}"`);
    assert.ok(Array.isArray(m.at) && m.at.length === 2, 'and where it is');
  }
});

test('F7.3 — SCREWS_3MM is there by name, with its diameter and where it is', () => {
  const d = drawingOf('BUL');
  const screws = d.machinings.filter((m) => m.layer === 'SCREWS_3MM');
  assert.ok(screws.length >= 2, 'a side panel is screwed top and bottom');
  const one = screws[0];
  assert.equal(one.kind, 'hole');
  assert.match(one.note, /Screws ⌀3/);
  assert.match(one.note, /⌀3/, 'the size the machine drills');
  assert.equal(one.d, P.puzzle.screwDiameter);
});

test('F7.2 — the LEGEND is what is ON this part, with the colours from cnc/layers.js', () => {
  const d = drawingOf('BUL');
  const names = d.legend.map((l) => l.name);
  assert.ok(names.includes(d.outlineLayer), 'the outline counts as an entry');
  assert.ok(names.includes('SCREWS_3MM'));
  assert.ok(names.includes('PUZZLE_DOG_BONES'), 'the dog bones the system is named for');
  // Only what is present: a legend listing fourteen layers of which two are on
  // the part is a legend nobody reads.
  assert.ok(names.length < CNC_LAYERS.length);
  for (const l of d.legend) {
    const table = CNC_LAYERS.find((x) => x.name === l.name);
    assert.ok(table, `${l.name} is in the table`);
    assert.equal(l.colour, table.screen, 'and wears the table’s own screen colour');
    assert.ok(l.count >= 1);
  }
  // The counts add up to what is drawn.
  const total = d.legend.reduce((n, l) => n + l.count, 0);
  assert.equal(total, d.machinings.length + 1, 'every path is in the legend, plus the outline');
});

test('F7.3 — the OVERALL dimensions are always there, and they are turn 7’s own', () => {
  const d = drawingOf('BUL');
  const texts = d.dimensions.filter((e) => e.kind === 'text').map((e) => e.text);
  assert.equal(texts.length, 2, 'the width and the height, and nothing else');
  assert.ok(texts.includes(String(Math.round(d.size.w))) || texts.some((t) => Number(t) === d.size.w),
    `the width is on the drawing (${texts})`);
  // Extension lines, ticks and a dimension line: the draughtsman's own, drawn
  // by `dimensionEntities` and therefore on the DIMENSIONS layer.
  const lines = d.dimensions.filter((e) => e.kind === 'line');
  assert.ok(lines.length >= 10, 'two full dimensions is ten lines and up');
  for (const e of d.dimensions) assert.equal(e.layer, 'DIMENSIONS');
});

test('F7 — a plain rectangular part still draws, and says so with an empty machining list', () => {
  const shelf = wardrobe.panels.find((p) => p.part === 'SHELF');
  const d = partDetailDrawing(shelf, { drills: wardrobe.drills, profile: P });
  assert.ok(d, 'it draws');
  assert.equal(d.outline.length, 4, 'a shelf is a rectangle');
  assert.deepEqual(d.legend.map((l) => l.name), [d.outlineLayer], 'and its legend is one line');
  assert.equal(d.dimensions.filter((e) => e.kind === 'text').length, 2, 'with its two numbers on it');
});

test('F7 — no panel, no drawing', () => {
  assert.equal(partDetailDrawing(null), null);
});

test('F7 — the pieces are separable: machinings, legend and drawing are three questions', () => {
  const panel = panelOf('BUL');
  const { outlineLayer, machinings } = partMachinings(panel, wardrobe.drills, P);
  const legend = partLegend(outlineLayer, machinings);
  const d = drawingOf('BUL');
  assert.deepEqual(legend.map((l) => l.name).sort(), d.legend.map((l) => l.name).sort());
  assert.equal(machinings.length, d.machinings.length);
});
