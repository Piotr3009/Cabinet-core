// ─── Front elevation, the style probe (turn 6, CLAUDE.md F7) ───
//
// One view, drawn the way Piotr's AutoLISP draws it, so turn 7 has a calibrated
// look to build the rest of the set on. What can be checked in node is
// everything except "does it look right": that the geometry comes from the
// ENGINE rather than being re-derived, that the door diagonals converge on the
// hinge side the way `drawDoorSwingLines` converges, that what is behind a
// front is a hidden line, that the scale is a scale a drawing office uses, and
// that the SVG parses.
//
// The scale test is the one worth reading twice. A drawing at 1:13.7 fits
// perfectly and is useless: nobody can measure off it. The largest STANDARD
// scale that fits is the answer, and the title block says which.

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { DRAWING_LAYERS, drawingLayer } from '../src/engine/drawings/layers.js';
import { boundsOf, buildFrontElevation, doorSwing } from '../src/engine/drawings/frontElevation.js';
import { PAGE_FORMATS, chooseScale, layoutSheet, scaleLabel } from '../src/engine/drawings/sheet.js';
import { sheetToSvg } from '../src/engine/drawings/svg.js';
import { drawingFilename } from '../src/lib/drawingExport.js';

const unit = (extra = {}) => computeCabinet({
  type: 'BUD', width: 600, height: 770, depth: 558, unit_num: '01',
  doors: { count: 1, hinge: 'L' }, shelves: 1, ...extra,
}, P);

const elevation = (result, extra = {}) => buildFrontElevation(result, {
  unitNum: '01', frontType: 'S', profile: P, ...extra,
});

const sheetFor = (result, format = 'A4', extra = {}) => layoutSheet({
  drawing: elevation(result, extra),
  format,
  title: { project: 'Hampstead kitchen', unit: '01', view: 'Front elevation', date: '07/08/2026' },
  profile: P,
});

const onLayer = (entities, name) => entities.filter((e) => e.layer === name);

// ─── the layers ───

test('the view layers are the AutoLISP’s, indices and all', () => {
  // createViewLayers names eight; the sheet adds two of its own.
  for (const name of ['CARCASE', 'DOORS', 'SHELVES', 'DOOR_SWING', 'LEG_BLOCK', 'UNIT_NUMBER', 'HINGES', 'DIMENSIONS']) {
    assert.ok(DRAWING_LAYERS[name], `${name} is a layer the LISP creates`);
    assert.ok(Number.isFinite(DRAWING_LAYERS[name].aci), `${name} records the AutoCAD colour index it came from`);
  }
  assert.equal(DRAWING_LAYERS.CARCASE.aci, 7);
  assert.equal(DRAWING_LAYERS.DOORS.aci, 6, 'doors are magenta, and that is what makes it read as Piotr’s drawing');
  assert.match(DRAWING_LAYERS.DOORS.colour, /^#[dD]4/, 'a printable magenta');
  assert.equal(DRAWING_LAYERS.SHELVES.aci, 3);
  assert.equal(DRAWING_LAYERS.UNIT_NUMBER.aci, 94, 'green');
  assert.equal(DRAWING_LAYERS.DIMENSIONS.colour, P.dimensions.colours.navy,
    'one ink for every measurement this app draws (turn 5, BACKLOG #34)');
  assert.equal(drawingLayer('nonsense'), DRAWING_LAYERS.CARCASE, 'an unknown layer draws, it does not throw');
});

// ─── the geometry comes from the engine ───

test('every rectangle on the drawing is a panel box, not a second derivation', () => {
  const r = unit();
  const { entities } = elevation(r);
  const rects = entities.filter((e) => e.kind === 'rect');

  for (const p of r.panels) {
    if (!p.box || p.role === 'back' || p.role === 'drawer_box') continue;
    const found = rects.some((e) => Math.abs(e.x - p.box.x) < 1e-6 && Math.abs(e.y - p.box.y) < 1e-6
      && Math.abs(e.w - p.box.w) < 1e-6 && Math.abs(e.h - p.box.h) < 1e-6);
    assert.ok(found, `${p.id} is on the elevation at the box the cut list gives it`);
  }
});

test('what is behind a front is a HIDDEN line; what is in front of it is not', () => {
  const { entities } = elevation(unit({ shelves: 2 }));
  const shelves = onLayer(entities, 'SHELVES');
  assert.ok(shelves.length >= 2, 'both shelves are drawn');
  assert.ok(shelves.every((e) => e.hidden), 'and both of them dashed — you are looking through a door');

  for (const e of onLayer(entities, 'DOORS')) assert.ok(!e.hidden, 'a door is not a hidden line');
  for (const e of onLayer(entities, 'CARCASE')) assert.ok(!e.hidden, 'nor is the carcass');
});

// ─── the door swing, exactly as the LISP draws it ───

test('the swing diagonals converge on the HINGE side, at mid height', () => {
  const box = { x: 0, y: 0, w: 600, h: 800 };

  const left = doorSwing(box, 'L');
  assert.equal(left.length, 2);
  for (const l of left) {
    assert.equal(l.x1, 0, 'the apex is on the hinge edge');
    assert.equal(l.y1, 400, '…at mid height');
    assert.equal(l.x2, 600, 'and it opens out to the far edge');
  }
  assert.deepEqual(left.map((l) => l.y2).sort((a, b) => a - b), [0, 800], 'to both far corners');

  const right = doorSwing(box, 'R');
  for (const l of right) {
    assert.equal(l.x1, 600, 'a right-hung door converges on the right');
    assert.equal(l.x2, 0);
  }
});

test('a door gets swing lines and a drawer front does not', () => {
  const door = elevation(unit()).entities.filter((e) => e.meta === 'door-swing');
  assert.equal(door.length, 2, 'one door, two diagonals');

  const drawers = elevation(computeCabinet({
    type: 'BUDR', width: 600, height: 770, depth: 558, unit_num: 'DR01',
  }, P), { unitNum: 'DR01' });
  assert.equal(drawers.entities.filter((e) => e.meta === 'door-swing').length, 0,
    'a drawer does not swing, so it carries no diagonals');
  assert.ok(onLayer(drawers.entities, 'DOORS').length >= 3, 'but its three fronts ARE the face of it');
});

test('a two-door unit gets one pair of diagonals per door, each on its own hinge', () => {
  const wide = elevation(computeCabinet({
    type: 'BUD', width: 1200, height: 770, depth: 558, unit_num: '02', doors: true,
  }, P), { unitNum: '02' });
  const swing = wide.entities.filter((e) => e.meta === 'door-swing');
  assert.equal(swing.length, 4);
  // One pair converges on the left of the unit, the other on the right —
  // which is how a joiner reads "these open away from each other".
  const apexes = [...new Set(swing.map((l) => l.x1))].sort((a, b) => a - b);
  assert.equal(apexes.length, 2);
  assert.ok(apexes[0] < 100 && apexes[1] > 1100);
});

// ─── the rest of what CLAUDE.md asks for ───

test('the drawing carries a shaker frame, legs, a green unit number and two dimensions', () => {
  const { entities } = elevation(unit());

  // Shaker: the LISP's 50 mm frame, inset on the front.
  const doors = onLayer(entities, 'DOORS').filter((e) => e.kind === 'rect');
  assert.ok(doors.length >= 2, 'the front, and the frame line inside it');

  assert.ok(onLayer(entities, 'LEG_BLOCK').length >= 2, 'it stands on its legs');

  const number = onLayer(entities, 'UNIT_NUMBER');
  assert.equal(number.length, 1);
  assert.equal(number[0].text, '01');
  assert.equal(number[0].kind, 'text');

  // Two dimensions: the width under it and the height beside it.
  const dims = onLayer(entities, 'DIMENSIONS');
  const values = dims.filter((e) => e.kind === 'text').map((e) => e.text);
  assert.equal(values.length, 2);
  assert.ok(values.includes('600'), `the overall width, through formatMm — got ${values}`);
  assert.ok(values.includes('870'), 'and the overall height, legs included');
  // Architectural ticks, not filled arrowheads (turn 5, BACKLOG #34).
  assert.ok(dims.filter((e) => e.kind === 'line').length >= 10);
});

test('a half-millimetre reaches the drawing as a half-millimetre', () => {
  const { entities } = elevation(unit({ width: 596.5 }));
  const values = onLayer(entities, 'DIMENSIONS').filter((e) => e.kind === 'text').map((e) => e.text);
  assert.ok(values.includes('596.5'), `formatMm all the way to the paper — got ${values}`);
});

// ─── the sheet ───

test('the scale is one a drawing office uses, and the biggest that fits', () => {
  assert.deepEqual(P.drawings.scales, [5, 10, 20, 25, 50]);
  assert.equal(chooseScale({ w: 600, h: 900 }, { w: 250, h: 150 }, P.drawings.scales), 10);
  assert.equal(chooseScale({ w: 600, h: 500 }, { w: 250, h: 150 }, P.drawings.scales), 5);
  assert.equal(chooseScale({ w: 3600, h: 2400 }, { w: 250, h: 150 }, P.drawings.scales), 20);
  // Bigger than anything on the list: the largest step, so a drawing is still
  // produced and the title block says honestly what it is at.
  assert.equal(chooseScale({ w: 40000, h: 30000 }, { w: 250, h: 150 }, P.drawings.scales), 50);
  assert.equal(scaleLabel(20), '1:20');
});

test('a bigger sheet gets a bigger scale for the same cabinet', () => {
  const r = computeCabinet({ type: 'WARDROBE', width: 2400, height: 2150, depth: 578, unit_num: 'W01', doors: true }, P);
  const a4 = sheetFor(r, 'A4', { unitNum: 'W01' });
  const a3 = sheetFor(r, 'A3', { unitNum: 'W01' });
  assert.ok(a3.scale <= a4.scale, `A3 draws it at 1:${a3.scale}, A4 at 1:${a4.scale}`);
  // Whatever way up the paper ends, it is that sheet's two dimensions.
  for (const [sheet, f] of [[a4, PAGE_FORMATS.A4], [a3, PAGE_FORMATS.A3]]) {
    assert.deepEqual(
      [sheet.width, sheet.height].sort((x, y) => x - y),
      [f.short, f.long],
      `${f.id} is ${f.short} × ${f.long} whichever way up it is`,
    );
  }
});

test('the paper turns when that draws the cabinet bigger — and a run keeps it flat', () => {
  // A wardrobe is tall: portrait fits it at a larger scale, and a drawing
  // office turns the paper without being asked.
  const tall = computeCabinet({ type: 'WARDROBE', width: 1200, height: 2150, depth: 578, unit_num: 'W01', doors: true }, P);
  const turned = sheetFor(tall, 'A3', { unitNum: 'W01' });
  assert.equal(turned.format.orientation, 'portrait');
  assert.ok(turned.height > turned.width);
  // …and it really is a bigger drawing for it, not just a different shape.
  const forced = layoutSheet({
    drawing: elevation(tall, { unitNum: 'W01' }),
    format: 'A3',
    orientation: 'landscape',
    title: {},
    profile: P,
  });
  assert.ok(turned.scale < forced.scale, `turned 1:${turned.scale} beats flat 1:${forced.scale}`);

  // A wide, low run has no reason to turn, and does not.
  const wide = computeCabinet({ type: 'BUD', width: 1200, height: 770, depth: 558, unit_num: '01', doors: true }, P);
  assert.equal(sheetFor(wide, 'A3', { unitNum: '01' }).format.orientation, 'landscape');
});

test('everything lands inside the paper, clear of the frame', () => {
  for (const format of ['A4', 'A3']) {
    const sheet = sheetFor(unit(), format);
    const box = boundsOf(sheet.entities);
    assert.ok(box.x >= 0, `${format}: nothing off the left edge`);
    assert.ok(box.y >= 0, `${format}: nothing off the bottom`);
    assert.ok(box.x + box.w <= sheet.width + 1e-6, `${format}: nothing off the right`);
    assert.ok(box.y + box.h <= sheet.height + 1e-6, `${format}: nothing off the top`);
  }
});

test('the title block is what makes it read as a drawing', () => {
  const sheet = sheetFor(unit());
  const texts = sheet.entities.filter((e) => e.kind === 'text').map((e) => e.text);
  for (const wanted of ['CABINET CORE', 'Hampstead kitchen', '01', 'Front elevation', scaleLabel(sheet.scale), '07/08/2026']) {
    assert.ok(texts.includes(wanted), `the title block says ${wanted} — got ${texts.join(' | ')}`);
  }
  for (const label of ['Project', 'Unit', 'View', 'Scale', 'Date']) {
    assert.ok(texts.includes(label), `…and labels it ${label}`);
  }
});

test('text does not shrink with the scale past the point of being readable', () => {
  const big = computeCabinet({ type: 'WARDROBE', width: 3000, height: 2150, depth: 578, unit_num: 'W01', doors: true }, P);
  const sheet = sheetFor(big, 'A4', { unitNum: 'W01' });
  for (const e of sheet.entities.filter((t) => t.kind === 'text')) {
    assert.ok(e.height >= P.drawings.minTextHeight - 1e-9,
      `"${e.text}" is set at ${e.height} mm on paper — below the floor`);
  }
});

// ─── the SVG ───

test('the SVG parses, carries the drawing, and paints white paper', () => {
  const svg = sheetToSvg(sheetFor(unit()));

  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg, /<\/svg>$/);
  const sheet = sheetFor(unit());
  assert.match(svg, new RegExp(`width="${sheet.width}mm" height="${sheet.height}mm"`), 'a real paper size, not pixels');
  assert.match(svg, new RegExp(`viewBox="0 0 ${sheet.width} ${sheet.height}"`));
  assert.match(
    svg,
    new RegExp(`<rect x="0" y="0" width="${sheet.width}" height="${sheet.height}" fill="#ffffff"/>`),
    'white paper',
  );
  assert.equal(svg.split('data-cc="door-swing"').length - 1, 2, 'the door diagonals are in it, and findable');
  assert.match(svg, /stroke-dasharray/, 'and so are the hidden lines');
  assert.match(svg, /CABINET CORE/);

  // Every tag opened is closed: crude, and it is the check that catches a
  // renderer that emits a broken document.
  const opens = (svg.match(/<(line|rect|text)\b/g) || []).length;
  const closes = (svg.match(/(\/>|<\/text>)/g) || []).length;
  assert.equal(opens, closes, 'every element is closed');
});

test('the SVG escapes a project name that would otherwise break it', () => {
  const sheet = layoutSheet({
    drawing: elevation(unit()),
    format: 'A4',
    title: { project: 'Ben & Jerry <flat> "3"', unit: '01', view: 'Front elevation', date: '07/08/2026' },
    profile: P,
  });
  const svg = sheetToSvg(sheet);
  assert.match(svg, /Ben &amp; Jerry &lt;flat&gt; &quot;3&quot;/);
  assert.ok(!/<flat>/.test(svg), 'nothing in a project name can open a tag');
});

test('the file is named like everything else this app writes', () => {
  // ─── TURN 31 (CLAUDE.md F5) ──────────────────────────────────────────────
  // "Same pattern for any other export the app writes": the job, the kind, the
  // subject and the MINUTE. The minute is what turn 30's name was missing —
  // exporting the same elevation twice after a correction produced two
  // identical names, which is the owner's own "nine identical filenames" by a
  // different door. The stamp is injected so this is a fact rather than a race.
  const at = new Date(2026, 7, 15, 21, 30);
  assert.equal(
    drawingFilename({ project: 'Hampstead kitchen', unit: 'W01', ext: 'svg', now: at }),
    'Hampstead-kitchen-drawing-w01-front-elevation-1508-2130.svg',
  );
  assert.equal(
    drawingFilename({ project: 'Hampstead kitchen', unit: 'W01', ext: 'pdf', now: at }),
    'Hampstead-kitchen-drawing-w01-front-elevation-1508-2130.pdf',
  );
});
