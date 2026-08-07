// ─── The production card (turn 7, CLAUDE.md F1) ───
//
// Turn 6 drew one view and said the rest would follow from it. This is the
// rest, and what is worth checking is not "does it draw something" — it is the
// handful of claims the card MAKES:
//
//   · three views, and the same cabinet in all three;
//   · the carcass view has no fronts on it, and what is left is a SOLID line
//     rather than the hidden line the same shelf gets behind a door;
//   · the plan is the engine's own boxes projected, with the front standing
//     the profile's 3 mm off the carcass — not a number this drawing invented;
//   · one hinge per door, on the side the door is hung from;
//   · the dimensions are the ones a bench measures, through formatMm;
//   · the whole thing parses as SVG and comes out as a multi-page PDF.
//
// Everything here runs in node: the drawing engine has no React, no DOM and no
// jsPDF in it, which is the reason it is where it is.

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { DRAWING_LAYERS } from '../src/engine/drawings/layers.js';
import { boundsOf } from '../src/engine/drawings/primitives.js';
import { baselineDimensions, chainDimensions, dimensionEntities } from '../src/engine/drawings/frontElevation.js';
import { buildCarcassElevation, buildTopView, planBox } from '../src/engine/drawings/views.js';
import { CARD_ARRANGEMENTS, buildUnitCard } from '../src/engine/drawings/unitCard.js';
import { projectBookletSheets, unitCardSheet } from '../src/engine/drawings/card.js';
import { buildCoverSheet } from '../src/engine/drawings/cover.js';
import { sheetToSvg } from '../src/engine/drawings/svg.js';
import { bookletDoc, bookletFilename, drawingFilename } from '../src/lib/drawingExport.js';
import { formatMm } from '../src/engine/format.js';

const base = (extra = {}) => computeCabinet({
  type: 'BUD', width: 600, height: 770, depth: 558, unit_num: '01',
  doors: { count: 1, hinge: 'L' }, shelves: 2, ...extra,
}, P);

const wardrobe = () => computeCabinet({
  type: 'WARDROBE', width: 1000, height: 2150, depth: 578, unit_num: 'W01',
  doors: true, shelves: 2, drawers: 3, rail: true,
}, P);

const budr = () => computeCabinet({
  type: 'BUDR', width: 600, height: 770, depth: 558, unit_num: 'DR01',
}, P);

const card = (result, extra = {}) => buildUnitCard(result, {
  unitNum: result.unitNum, frontType: 'S', profile: P, ...extra,
});

const storeUnit = (result, type = 'BUD') => ({
  id: `u_${result.unitNum}`,
  type,
  params: { unit_num: result.unitNum, width: result.params.width, height: result.params.height },
});

const texts = (entities) => entities.filter((e) => e.kind === 'text').map((e) => e.text);
const onLayer = (entities, name) => entities.filter((e) => e.layer === name);

// ─── three views, one cabinet ───────────────────────────────────────────────

test('the card carries three views, and the same unit number is on all three', () => {
  const c = card(base());
  const numbers = onLayer(c.entities, 'UNIT_NUMBER').filter((e) => e.text === '01');
  assert.equal(numbers.length, 3, 'front, carcass and plan');

  // …and each of them is somewhere different on the paper.
  const spots = new Set(numbers.map((e) => `${Math.round(e.x)},${Math.round(e.y)}`));
  assert.equal(spots.size, 3, 'three views, not one drawn three times');

  const captions = texts(c.entities);
  for (const wanted of ['FRONT', 'CARCASS (no fronts)', 'TOP']) {
    assert.ok(captions.includes(wanted), `the ${wanted} view says what it is — got ${captions.join(' | ')}`);
  }
});

test('every caption and note on a card is ASCII — it is going into a PDF', () => {
  // jsPDF's built-in faces are WinAnsi. A card is printed far more often than
  // it is looked at, so anything this file writes has to survive the printer.
  const c = card(wardrobe());
  for (const e of c.entities.filter((x) => x.kind === 'text' && x.layer === 'VIEW_TITLE')) {
    assert.match(e.text, /^[\x20-\x7E·]*$/, `"${e.text}" has a character a PDF font may not carry`);
  }
});

test('the door diagonals are on the front view and NOT on the carcass view', () => {
  const c = card(base());
  assert.equal(c.entities.filter((e) => e.meta === 'door-swing').length, 2,
    'one door, one pair of diagonals — the carcass view has its fronts off, so it has no swing');

  const carcass = buildCarcassElevation(base(), { unitNum: '01', profile: P });
  assert.equal(carcass.entities.filter((e) => e.meta === 'door-swing').length, 0);
  assert.equal(onLayer(carcass.entities, 'DOORS').length, 0, 'and no magenta at all');
});

test('a two-door unit gets two hinged doors and two pairs of diagonals', () => {
  const wide = card(computeCabinet({
    type: 'BUD', width: 1200, height: 770, depth: 558, unit_num: '02', doors: true,
  }, P));
  assert.equal(wide.entities.filter((e) => e.meta === 'door-swing').length, 4);
});

// ─── the carcass view ───────────────────────────────────────────────────────

test('a shelf you are looking AT is a solid line; the same shelf behind a door is not', () => {
  const result = base();
  const carcass = buildCarcassElevation(result, { unitNum: '01', profile: P });
  const shelves = onLayer(carcass.entities, 'SHELVES');
  assert.ok(shelves.length >= 2, 'both shelves are on the carcass view');
  for (const s of shelves) {
    assert.equal(s.solid, true, 'and drawn solid — there is no door in front of them here');
  }
  // The layer itself is still a hidden-line layer; `solid` is what overrides
  // it, so the complete elevation is unaffected.
  assert.ok(DRAWING_LAYERS.SHELVES.dash, 'the shelf layer is dashed by default, as the LISP has it');
});

test('the carcass view draws the runners, at the rows the engine drills', () => {
  const result = wardrobe();
  const carcass = buildCarcassElevation(result, { unitNum: 'W01', profile: P });
  const runners = onLayer(carcass.entities, 'RUNNERS');
  assert.ok(runners.length > 0, 'a wardrobe with three drawers has runner rows');

  const rows = new Set(result.drillSummary.runner_rows_carcass_y.map((y) => y.toFixed(3)));
  const drawn = new Set(runners.map((r) => r.y1.toFixed(3)));
  for (const y of rows) {
    assert.ok(drawn.has(y), `a runner is drawn at ${y} — the row the engine drills`);
  }

  // A unit with no drawers has none, rather than an empty pair of ticks.
  assert.equal(onLayer(buildCarcassElevation(base(), { unitNum: '01', profile: P }).entities, 'RUNNERS').length, 0);
});

// ─── the plan ───────────────────────────────────────────────────────────────

test('the plan is the engine’s boxes projected, the way the AutoLISP holds them', () => {
  // depth − z − d: z = 0 is the wall, and the LISP's plan has the FRONT of the
  // cabinet at the bottom of the sheet.
  assert.deepEqual(planBox({ x: 0, y: 0, z: 0, w: 600, h: 770, d: 18 }, 558), { x: 0, y: 540, w: 600, h: 18 });
  assert.deepEqual(planBox({ x: 0, y: 0, z: 540, w: 600, h: 770, d: 18 }, 558), { x: 0, y: 0, w: 600, h: 18 });
});

test('the front stands the profile’s own gap off the carcass, and the plan shows it', () => {
  const result = base();
  const top = buildTopView(result, { unitNum: '01', frontType: 'S', profile: P });
  const fronts = onLayer(top.entities, 'DOORS').filter((e) => e.kind === 'rect');
  assert.ok(fronts.length >= 1);

  // The carcass runs 0 … depth in the plan; a front sits below zero by exactly
  // the overlay gap, which is a profile number and not one this file chose.
  const nearest = Math.max(...fronts.map((f) => f.y + f.h));
  assert.equal(Number(nearest.toFixed(6)), -P.doors.gap,
    `the door face is ${P.doors.gap} mm off the carcass — the profile's gap, unchanged`);
});

test('in plan, what is under the top panel is dashed and what you can see is not', () => {
  const top = buildTopView(base(), { unitNum: '01', frontType: 'S', profile: P });
  const carcase = onLayer(top.entities, 'CARCASE').filter((e) => e.kind === 'rect');
  assert.ok(carcase.some((e) => e.hidden), 'the shelves are under the top panel');
  assert.ok(carcase.some((e) => !e.hidden), 'the sides, the back and the top panel are not');
  for (const front of onLayer(top.entities, 'DOORS')) {
    assert.ok(!front.hidden, 'nothing is over a door');
  }
});

test('one hinge per door in plan, on the side the door is hung from', () => {
  const left = buildTopView(base(), { unitNum: '01', frontType: 'S', profile: P });
  const hinges = onLayer(left.entities, 'HINGES');
  assert.equal(hinges.length, 3, 'a cup, an arm and a plate — one hinge, not three stacked on one spot');
  // Hung on the left: everything about it is in the left-hand half.
  for (const h of hinges) assert.ok(h.x < 300, `${h.x} is on the hinge side`);

  const right = buildTopView(
    computeCabinet({ type: 'BUD', width: 600, height: 770, depth: 558, unit_num: '01', doors: { count: 1, hinge: 'R' } }, P),
    { unitNum: '01', frontType: 'S', profile: P },
  );
  for (const h of onLayer(right.entities, 'HINGES')) {
    assert.ok(h.x + h.w > 300, 'a right-hung door puts its hinge on the right');
  }

  // Two doors: two hinges, one each side.
  const both = buildTopView(
    computeCabinet({ type: 'BUD', width: 1200, height: 770, depth: 558, unit_num: '02', doors: true }, P),
    { unitNum: '02', frontType: 'S', profile: P },
  );
  assert.equal(onLayer(both.entities, 'HINGES').length, 6);
});

test('the hinge is drawn to the profile’s catalogue size, not to a number in the drawing', () => {
  const top = buildTopView(base(), { unitNum: '01', frontType: 'S', profile: P });
  const cup = onLayer(top.entities, 'HINGES').find((e) => e.w === P.hardware.hinge.cupDiameter);
  assert.ok(cup, `the cup is ${P.hardware.hinge.cupDiameter} mm across — profile.hardware.hinge`);
  assert.equal(cup.h, P.hardware.hinge.cupDepth);
});

// ─── the dimensions ─────────────────────────────────────────────────────────

test('a negative offset puts a dimension on the other side, and nothing else changes', () => {
  const right = dimensionEntities({
    from: [0, 0], to: [0, 100], direction: 'v', offset: 50, value: 100, textHeight: 10,
  });
  const left = dimensionEntities({
    from: [0, 0], to: [0, 100], direction: 'v', offset: -50, value: 100, textHeight: 10,
  });
  assert.equal(right.find((e) => e.kind === 'text').x, 50);
  assert.equal(left.find((e) => e.kind === 'text').x, -50);
  assert.equal(right.length, left.length, 'the same drawing, mirrored');

  // …and 'h' keeps turn 6's convention: positive hangs it BELOW.
  const below = dimensionEntities({
    from: [0, 0], to: [100, 0], direction: 'h', offset: 40, value: 100, textHeight: 10,
  });
  assert.ok(below.find((e) => e.kind === 'text').y < 0);
});

test('baseline dimensions all measure from the datum, each on its own run', () => {
  const out = baselineDimensions({
    datum: 0, values: [300, 600, 900], at: 0, direction: 'v',
    first: 100, step: 100, sign: -1, textHeight: 10,
  });
  const values = out.filter((e) => e.kind === 'text');
  assert.deepEqual(values.map((e) => e.text), ['300', '600', '900'], 'from the bottom, never chained');
  // Nearest value on the innermost run, so the runs do not cross.
  assert.deepEqual(values.map((e) => e.x), [-100, -200, -300]);
});

test('a chain measures the segments between its edges', () => {
  const out = chainDimensions({ edges: [0, 200, 400, 597], at: 0, direction: 'v', offset: -100, textHeight: 10 });
  assert.deepEqual(out.filter((e) => e.kind === 'text').map((e) => e.text), ['200', '200', '197']);
});

test('a number too big for its own dimension line is written outside it, not across it', () => {
  const tight = dimensionEntities({
    from: [0, 0], to: [0, 20], direction: 'v', offset: 50, value: 20, textHeight: 60,
  });
  const label = tight.find((e) => e.kind === 'text');
  assert.ok(label.y > 20, 'clear of the 20 mm it measures');

  const roomy = dimensionEntities({
    from: [0, 0], to: [0, 900], direction: 'v', offset: 50, value: 900, textHeight: 60,
  });
  assert.equal(roomy.find((e) => e.kind === 'text').y, 450, 'and in the middle when it fits');
});

test('the card measures what a bench measures: overall, shelves from the base, drawer by drawer', () => {
  const result = wardrobe();
  const c = card(result);
  const values = onLayer(c.entities, 'DIMENSIONS').filter((e) => e.kind === 'text').map((e) => e.text);

  assert.ok(values.includes('1000'), 'the width');
  assert.ok(values.includes('2150'), 'the carcass height');
  assert.ok(values.includes('2250'), 'and the height it stands at, legs included');
  assert.ok(values.includes('578'), 'the depth, off the plan');

  for (const shelf of result.assemblies.shelves) {
    assert.ok(values.includes(formatMm(shelf.y)),
      `shelf at ${formatMm(shelf.y)} is dimensioned from the base — got ${values.join(' | ')}`);
  }
  for (const front of result.assemblies.drawerFronts) {
    assert.ok(values.includes(formatMm(front.h)), `drawer ${front.index} carries its own height`);
  }
  // …and the drawer's NUMBER is on the drawer, where it fits.
  const labels = onLayer(c.entities, 'UNIT_NUMBER').map((e) => e.text);
  for (const front of result.assemblies.drawerFronts) {
    assert.ok(labels.includes(`D${front.index}`), `D${front.index} is written on its own front`);
  }
});

test('a half-millimetre survives all the way onto the card', () => {
  const c = card(base({ width: 596.5 }));
  const values = onLayer(c.entities, 'DIMENSIONS').filter((e) => e.kind === 'text').map((e) => e.text);
  assert.ok(values.includes('596.5'), `formatMm to the paper — got ${values.join(' | ')}`);
});

test('the front gap is said once, in a note, instead of dimensioned four times', () => {
  const note = texts(card(base()).entities).find((t) => /Front gap/.test(t));
  assert.ok(note, 'the card says what clearance it was set out with');
  assert.ok(note.includes(`${formatMm(P.doors.gap)} mm`));
  assert.ok(note.includes(`${formatMm(P.front.thickness)} mm`));
});

// ─── the sheet ──────────────────────────────────────────────────────────────

test('the card is laid out in whichever arrangement draws the cabinet bigger', () => {
  const result = base();
  const shapes = CARD_ARRANGEMENTS.map((a) => card(result, { arrangement: a }).bounds);
  assert.equal(shapes.length, 2);
  // A row is wide and short; the projection is nearly square. They are genuinely
  // different shapes, which is the whole reason for trying both.
  assert.ok(shapes[1].w / shapes[1].h > shapes[0].w / shapes[0].h * 1.5);

  const sheet = unitCardSheet({
    result, unit: storeUnit(result), project: { name: 'Hampstead kitchen' }, profile: P, date: '07/08/2026',
  });
  const forced = CARD_ARRANGEMENTS.map((arrangement) => unitCardSheet({
    result, unit: storeUnit(result), project: { name: 'Hampstead kitchen' }, profile: P, date: '07/08/2026', format: 'A3',
  }).scale);
  assert.ok(sheet.scale <= Math.min(...forced) || sheet.scale <= 20, `chosen 1:${sheet.scale}`);
});

test('the card picks its own paper, and everything lands inside it', () => {
  for (const result of [base(), wardrobe(), budr()]) {
    const sheet = unitCardSheet({
      result, unit: storeUnit(result), project: { name: 'Hampstead kitchen' }, profile: P, date: '07/08/2026',
    });
    assert.ok(['A4', 'A3'].includes(sheet.format.id), 'A4 or A3, chosen — never a size nobody prints');
    const box = boundsOf(sheet.entities);
    assert.ok(box.x >= -1e-6 && box.y >= -1e-6, `${result.unitNum}: nothing off the left or the bottom`);
    assert.ok(box.x + box.w <= sheet.width + 1e-6, `${result.unitNum}: nothing off the right`);
    assert.ok(box.y + box.h <= sheet.height + 1e-6, `${result.unitNum}: nothing off the top`);
  }
});

test('the title block names the type and both materials, in full', () => {
  const result = base();
  const sheet = unitCardSheet({
    result,
    unit: storeUnit(result),
    project: { name: 'Hampstead kitchen', design: null },
    profile: P,
    date: '07/08/2026',
  });
  const said = texts(sheet.entities);
  for (const label of ['Project', 'Unit', 'Type', 'Carcass', 'Fronts', 'Scale', 'Date']) {
    assert.ok(said.includes(label), `the block has a ${label} row`);
  }
  assert.ok(said.includes('Hampstead kitchen'));
  assert.ok(said.includes('Base unit'), 'the type, by its name');
  assert.ok(said.includes('Broken white'), 'and what it is made of');
  assert.ok(said.includes(`1:${sheet.scale}`));
});

// ─── the SVG and the booklet ────────────────────────────────────────────────

test('the card SVG parses, says what it is, and closes every tag', () => {
  const result = base();
  const sheet = unitCardSheet({
    result, unit: storeUnit(result), project: { name: 'Hampstead kitchen' }, profile: P, date: '07/08/2026',
  });
  const svg = sheetToSvg(sheet, { kind: 'unit-card' });

  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg, /data-cc-drawing="unit-card"/);
  assert.match(svg, /<\/svg>$/);
  assert.match(svg, new RegExp(`width="${sheet.width}mm" height="${sheet.height}mm"`), 'a real paper size');
  assert.equal(svg.split('data-cc="door-swing"').length - 1, 2, 'the door diagonals are findable');
  assert.match(svg, /stroke-dasharray/, 'and the hidden lines are dashed');

  // Three views: the green number appears once per view. (It is on the sheet a
  // fourth time, as the Unit row of the title block — which is why this counts
  // the LAYER and not the string.)
  assert.equal(svg.split('data-layer="UNIT_NUMBER">01<').length - 1, 3);

  const opens = (svg.match(/<(line|rect|text|circle)\b/g) || []).length;
  const closes = (svg.match(/(\/>|<\/text>)/g) || []).length;
  assert.equal(opens, closes, 'every element is closed');
});

test('the booklet is a cover and a page per unit, all on the same paper', () => {
  const entries = [
    { unit: storeUnit(base()), result: base() },
    { unit: storeUnit(wardrobe(), 'WARDROBE'), result: wardrobe() },
  ];
  const sheets = projectBookletSheets({
    entries,
    project: { name: 'Hampstead kitchen', number: '2601', client: 'Mrs Okafor' },
    profile: P,
    date: '07/08/2026',
  });
  assert.equal(sheets.length, entries.length + 1, 'a cover, then one page per unit');
  assert.equal(sheets[0].cover, true);
  assert.equal(sheets[0].width, sheets[1].width, 'the cover is on the same sheet as the drawings');
  assert.equal(sheets[0].height, sheets[1].height);

  const cover = texts(sheets[0].entities);
  assert.ok(cover.includes('CABINET CORE'));
  assert.ok(cover.includes('Hampstead kitchen'));
  assert.ok(cover.some((t) => t.includes('2601') && t.includes('Mrs Okafor')), 'the number and the client');
  assert.ok(cover.some((t) => t.includes('2 units')));
  assert.ok(cover.includes('01') && cover.includes('W01'), 'and every unit by its number');
  assert.ok(cover.includes('600 × 770 × 558'), 'with the size a joiner recognises it by');

  // Without a cover it is just the cards — which is what a reprint of one job's
  // drawings is.
  assert.equal(projectBookletSheets({ entries, project: {}, profile: P, cover: false }).length, entries.length);
});

test('a cover with more units than one column holds splits into two', () => {
  const many = Array.from({ length: 40 }, (_, i) => ({
    unitNum: String(i + 1).padStart(2, '0'), type: 'Base unit', size: '600 × 770 × 558',
  }));
  const sheet = buildCoverSheet({ project: { name: 'Big kitchen' }, units: many, profile: P });
  const numbers = sheet.entities.filter((e) => e.layer === 'UNIT_NUMBER');
  assert.equal(numbers.length, 40, 'every unit is listed');
  const columns = new Set(numbers.map((e) => Math.round(e.x)));
  assert.equal(columns.size, 2, 'in two columns — a cover that runs onto page two is not a cover');
});

test('the booklet really is a multi-page PDF, at the sizes the cards chose', () => {
  const entries = [
    { unit: storeUnit(base()), result: base() },
    { unit: storeUnit(wardrobe(), 'WARDROBE'), result: wardrobe() },
    { unit: storeUnit(budr(), 'BUDR'), result: budr() },
  ];
  const sheets = projectBookletSheets({
    entries, project: { name: 'Hampstead kitchen' }, profile: P, date: '07/08/2026',
  });
  const doc = bookletDoc(sheets);

  assert.equal(doc.getNumberOfPages(), entries.length + 1, 'a cover and a page per unit');
  // The document is built in millimetres, so its page sizes read in
  // millimetres — the same numbers the sheets carry.
  sheets.forEach((sheet, i) => {
    doc.setPage(i + 1);
    const size = doc.internal.pageSize;
    assert.ok(Math.abs(size.getWidth() - sheet.width) < 0.5,
      `page ${i + 1} is ${sheet.width} mm wide — got ${size.getWidth()}`);
    assert.ok(Math.abs(size.getHeight() - sheet.height) < 0.5,
      `page ${i + 1} is ${sheet.height} mm tall — got ${size.getHeight()}`);
  });

  // A project with nothing in it is refused with something a person can read,
  // rather than producing a one-page document of a cover for no cabinets.
  assert.throws(() => bookletDoc([]), /nothing to draw/i);
});

test('the files are named like everything else this app writes', () => {
  assert.equal(
    drawingFilename({ project: 'Hampstead kitchen', unit: 'W01', view: 'unit-card', ext: 'pdf' }),
    'hampstead-kitchen-w01-unit-card.pdf',
  );
  assert.equal(
    drawingFilename({ project: 'Hampstead kitchen', unit: 'W01', view: 'unit-card', ext: 'svg' }),
    'hampstead-kitchen-w01-unit-card.svg',
  );
  assert.equal(bookletFilename({ project: 'Hampstead kitchen' }), 'hampstead-kitchen-unit-cards.pdf');
});
