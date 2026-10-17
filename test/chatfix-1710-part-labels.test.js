// ─── CHAT FIX 17.10.2026: THE PART LABELS ───────────────────────────────────
//
// The owner, 13:07: *"musimy zaprojektowac naklejki, 44 na A4 bo takie mam,
// kolorami: 3 szafy to 3 kolory, drugi kolor to kolor elementu, czyli polki,
// boki, plecy i top and bottom, parami ten sam kolor; szuflady nie trzeba;
// napis co to; i strzalka co oklejamy"*; 13:09: *"czy to nam sie przeniesie
// do VCarve? jak nie, to przynajmniej kolory napisow pod kolory szafki"*;
// 13:15: *"ponumerujemy wszystkie elementy"*; 13:18: *"ok koduj"*.
//
// What this file holds: the plan (engine/partNumbers.js), the formatter, the
// DXF (the text on the cabinet's own coloured layer, numbered; a file written
// without a plan byte for byte yesterday's), the sticker records and grid, the
// PDF's page count, and the Output menu's entry.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { getCabinetProfile, migrateCabinetProfile } from '../src/engine/profile.js';
import {
  LABEL_KIND_ORDER, dxfLabelsFor, edgeArrowGeometry, edgeArrowOf, formatPartNo, kindStyleOf, labelKindOf, labelLayerName, labelPages,
  labelRecords, labelSettings, labelSheetGrid, partDisplayName, partNumberPlan, unitAciOf, unitColourOf, unitScreenColourOf,
} from '../src/engine/partNumbers.js';
import { numberTag, partLabelText } from '../src/engine/cnc/partLabel.js';
import {
  buildUnitDxfFiles, labelFor, labelLayerRow, materialSheetDxf, panelDxf, parseDxf, sheetDxf,
} from '../src/engine/cnc/dxf.js';
import { layoutPanels } from '../src/engine/cnc/layout.js';
import { exportablePanels } from '../src/engine/cnc/groups.js';
import { buildOutputMenu } from '../src/lib/outputMenu.js';
import { labelsDoc, labelsFilename } from '../src/lib/labelsPdf.js';
import { labelsForUnit, planUnits, projectLabelPlan, projectLabelRecords } from '../src/lib/partLabels.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const P = getCabinetProfile();

const W = defaultParamsFor('WARDROBE', P);
const r1 = computeCabinet({ ...W, width: 1107, unit_num: 'W01', items: [{ kind: 'shelf', variant: 'adjustable', pos_mm: 600 }, { kind: 'shelf', variant: 'fixed', pos_mm: 1500 }] }, P);
const r2 = computeCabinet({ ...W, width: 800, unit_num: 'W 02/a', drawers: 2 }, P);
const r3 = computeCabinet({ ...W, width: 1000, unit_num: 'W03', items: [{ kind: 'partition', x_mm: 500 }] }, P);
const units = [
  { id: 'u1', unitNum: 'W01', panels: r1.panels },
  { id: 'u2', unitNum: 'W 02/a', panels: r2.panels },
  { id: 'u3', unitNum: 'W03', panels: r3.panels },
];

// ─── THE NUMBERS ARE THE PROFILE'S ──────────────────────────────────────────

test('profile.labels holds the owner\'s paper (16:40: 21 per A4, L7160, 3 x 7, 63.5 x 38.1, 2.5 between the columns, the print 2.5 inside) and the two palettes; an old profile gets the block back', () => {
  assert.deepEqual([P.labels.sheet.preset, P.labels.sheet.cols, P.labels.sheet.rows, P.labels.sheet.labelW, P.labels.sheet.labelH, P.labels.sheet.gapX, P.labels.sheet.gapY, P.labels.sheet.insetMm],
    ['L7160', 3, 7, 63.5, 38.1, 2.5, 0, 2.5]);
  // the 44-up paper of 13:07 stays as a preset
  assert.deepEqual([P.labels.sheets.generic44.cols, P.labels.sheets.generic44.rows, P.labels.sheets.generic44.labelW, P.labels.sheets.generic44.labelH], [4, 11, 48.3, 25.4]);
  assert.deepEqual(P.labels.sheets.L7160, P.labels.sheet);
  assert.equal(P.labels.unitColours.length, P.labels.unitAci.length);
  assert.deepEqual(Object.keys(P.labels.kinds), LABEL_KIND_ORDER);
  const old = JSON.parse(JSON.stringify(P));
  delete old.labels;
  assert.deepEqual(migrateCabinetProfile(old).labels, P.labels);
  // a saved sheet that names its preset keeps what it saved; the rest of the block is filled in
  const partial = JSON.parse(JSON.stringify(P));
  partial.labels = { sheet: { preset: 'mine', cols: 2 } };
  const m = migrateCabinetProfile(partial);
  assert.equal(m.labels.sheet.cols, 2);
  assert.equal(m.labels.sheet.rows, 7);
  assert.equal(m.labels.dxf.layerPrefix, 'LABEL_');
  // a saved sheet with NO preset is the 44-up block of 13:07 and gives way to the paper of 16:40
  const morning = JSON.parse(JSON.stringify(P));
  morning.labels = { ...P.labels, sheet: { pageW: 210, pageH: 297, cols: 4, rows: 11, labelW: 48.3, labelH: 25.4, gapX: 0, gapY: 0, marginLeft: null, marginTop: null } };
  assert.deepEqual(migrateCabinetProfile(morning).labels.sheet, P.labels.sheet);
  // the settings reader never hands back NaN: a profile with no block gets the paper
  const bare = labelSettings({});
  assert.deepEqual([bare.sheet.cols, bare.sheet.rows, bare.sheet.labelW, bare.sheet.labelH, bare.sheet.gapX, bare.sheet.insetMm, bare.layerPrefix, bare.numberPad], [3, 7, 63.5, 38.1, 2.5, 2.5, 'LABEL_', 2]);
  assert.equal(labelSettings(P).sheet.marginLeft, null);
});

// ─── THE KINDS, THE PAIRS, THE EDGE ARROW ───────────────────────────────────

test('the kinds: sides with their dividers, top with bottom, the shelves (a fix board with them), the back; 17:38 the drawer boxes, the fronts and the rest of the sheet too', () => {
  const kinds = Object.fromEntries(r2.panels.map((p) => [p.id, labelKindOf(p)]));
  assert.equal(kinds.BUL, 'side');
  assert.equal(kinds.BUR, 'side');
  assert.equal(kinds.TOP, 'topbottom');
  assert.equal(kinds.BOTTOM, 'topbottom');
  assert.equal(kinds.BACK, 'back');
  assert.equal(kinds.PARTITION, 'shelf', 'the drawer stack\'s board is a shelf\'s kind');
  assert.ok(r2.panels.some((p) => p.part === 'DP'), 'the kit has a drawer panel');
  assert.ok(r2.panels.filter((p) => p.part === 'DP').every((p) => labelKindOf(p) === 'side'));
  // 17:38, the owner: *"Kazdy element z cnc musi miec naklejke"*: a front and a drawer box have a kind of their own.
  assert.ok(r2.panels.filter((p) => p.role === 'front').every((p) => labelKindOf(p) === 'front'), 'a front wears the front strip');
  const rd = computeCabinet({ ...W, width: 1200, unit_num: 'W09', items: [{ kind: 'drawer', pos_mm: 200, height_mm: 180 }, { kind: 'drawer', pos_mm: 400, height_mm: 180 }] }, P);
  assert.ok(rd.panels.some((p) => p.role === 'drawer_box'), 'the wardrobe has drawer boxes');
  assert.ok(rd.panels.filter((p) => p.role === 'drawer_box').every((p) => labelKindOf(p) === 'drawer'));
  assert.ok(rd.panels.filter((p) => p.part === 'DRAWER-FRONT').every((p) => labelKindOf(p) === 'front'));
  assert.ok(rd.panels.some((p) => p.part === 'FILLER'), 'the drawer stack has fillers');
  assert.ok(rd.panels.filter((p) => p.part === 'FILLER').every((p) => labelKindOf(p) === 'other'), 'a filler is a board of the sheet: PART');
  // 1:1 with the sheet: every exportable part has a kind, a part with no outline has none
  assert.deepEqual(exportablePanels(rd.panels).filter((p) => !labelKindOf(p)), []);
  assert.equal(labelKindOf({ id: 'x', part: 'WHATEVER', role: 'hardware' }), null);
  assert.equal(partDisplayName(rd.panels.find((p) => p.part === 'DRAWER-SIDE')), 'DRAWER SIDE');
  assert.equal(partDisplayName(rd.panels.find((p) => p.part === 'DRAWER-FRONT')), 'DRAWER FRONT');
  assert.equal(partDisplayName(r2.panels.find((p) => p.part === 'FRONT')), 'DOOR');
  assert.equal(partDisplayName(r2.panels.find((p) => p.part === 'DRAWER-FRONT')), 'DRAWER FRONT');
  assert.equal(partDisplayName(rd.panels.find((p) => p.part === 'FILLER')), 'FILLER');
  assert.deepEqual(LABEL_KIND_ORDER.map((k) => kindStyleOf(k, P).order), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(labelKindOf(r3.panels.find((p) => p.part === 'VPART')), 'side');
  assert.equal(kindStyleOf('topbottom', P).colour, kindStyleOf('topbottom', P).colour);
  assert.equal(partDisplayName(r1.panels.find((p) => p.id === 'SHELF-1')), 'SHELF ADJ');
  assert.equal(partDisplayName(r1.panels.find((p) => p.id === 'SHELF-2')), 'SHELF FIX');
  assert.equal(partDisplayName(r3.panels.find((p) => p.part === 'VPART')), 'DIVIDER');
  assert.equal(partDisplayName(r1.panels.find((p) => p.id === 'BUL')), 'SIDE L');
});

test('the edge arrow is read off the part\'s own edging code, in the drawn frame', () => {
  assert.deepEqual(edgeArrowOf(r1.panels.find((p) => p.id === 'BUL')), { left: true, right: false, top: false, bottom: false, arrow: 'left' });
  assert.deepEqual(edgeArrowOf(r1.panels.find((p) => p.id === 'BUR')).arrow, 'right');
  assert.deepEqual(edgeArrowOf(r1.panels.find((p) => p.id === 'BACK')), { left: false, right: false, top: false, bottom: false, arrow: 'none' });
  assert.equal(edgeArrowOf({ edging: { code: '<>^v' } }).arrow, 'all');
  assert.equal(edgeArrowOf({ edging: { code: '^v' } }).arrow, 'up');
});

test('the edge arrow on the board (14:10): a line inside the banded edge, the arrow at it, the word; nothing on a back or a front; the line alone on a small board', () => {
  const bul = r1.panels.find((p) => p.id === 'BUL');
  const g = edgeArrowGeometry(bul, P, { textMm: 10 });
  assert.equal(g.arrow, 'left');
  assert.equal(g.lines.length, 3, 'the edge line, the shaft, the head');
  assert.deepEqual(g.lines[0], [[3, 215], [3, 1935]], '3 mm inside the left edge, over the middle 80 percent');
  assert.deepEqual(g.lines[1], [[57, 1612.5], [12, 1612.5]], 'the shaft, 45 long, in the upper quarter');
  assert.deepEqual(g.lines[2], [[12, 1609.35], [5, 1612.5], [12, 1615.65]], 'the head, tip 5 mm off the edge');
  assert.deepEqual(g.text, { x: 59, y: 1612.5, h: 10, str: 'EDGE', anchor: 'start' });
  const top = edgeArrowGeometry(r1.panels.find((p) => p.id === 'TOP'), P, { textMm: 8 });
  assert.equal(top.arrow, 'right');
  assert.equal(top.lines[0][0][0], 547, 'the TOP\'s front edge is at the right of its drawing');
  assert.equal(edgeArrowGeometry(r1.panels.find((p) => p.id === 'BACK'), P), null, 'no banded edge, nothing');
  assert.equal(edgeArrowGeometry(r1.panels.find((p) => p.id === 'W01-FL'), P), null, 'banded all round, nothing');
  const small = edgeArrowGeometry({ w: 40, h: 300, edging: { code: '>' } }, P, { textMm: 5 });
  assert.equal(small.lines.length, 1, 'too narrow for the arrow: the line alone');
  assert.equal(small.text, null);
  const up = edgeArrowGeometry({ w: 400, h: 300, edging: { code: '^' } }, P, { textMm: 5 });
  assert.equal(up.arrow, 'up');
  assert.deepEqual(up.lines[0], [[40, 297], [360, 297]]);
  assert.equal(up.text.anchor, 'top');
});

// ─── THE PLAN: ONE NUMBER THROUGH THE PROJECT ───────────────────────────────

test('partNumberPlan numbers every part of the sheet through the project, cabinet by cabinet: sides, top/bottom, shelves, back, the rest, drawer boxes, fronts', () => {
  const plan = partNumberPlan(units, P);
  const u1 = plan.byUnit.get('u1');
  // 17:38: the two doors come last in their cabinet, numbered like every other part of the sheet.
  assert.deepEqual([...u1.byPanel].map(([id, v]) => `${id}:${v.no}`), ['BUL:1', 'BUR:2', 'BOTTOM:3', 'TOP:4', 'SHELF-1:5', 'SHELF-2:6', 'BACK:7', 'W01-FL:8', 'W01-FR:9']);
  assert.equal(u1.byPanel.size, exportablePanels(r1.panels).length, '1:1 with the sheet');
  const u2 = plan.byUnit.get('u2');
  assert.equal(Math.min(...[...u2.byPanel.values()].map((v) => v.no)), 10, 'the second cabinet starts where the first stopped');
  assert.equal(u2.byPanel.size, exportablePanels(r2.panels).length);
  const u3 = plan.byUnit.get('u3');
  assert.ok(u3.byPanel.has('VPART-1'));
  assert.equal(plan.total, [...plan.units].reduce((n, u) => n + u.byPanel.size, 0));
  // colours and layers
  assert.deepEqual(plan.units.map((u) => u.colour), [unitColourOf(0, P), unitColourOf(1, P), unitColourOf(2, P)]);
  // 14:15: *"zamien zolty na inny, malo widoczny na nadrukach, zolty ostatecznie"*: the third is orange, yellow last.
  assert.deepEqual(plan.units.map((u) => u.aci), [1, 5, 30]);
  assert.equal(P.labels.unitColours[P.labels.unitColours.length - 1], '#e0a100');
  assert.equal(P.labels.unitAci[P.labels.unitAci.length - 1], 2);
  assert.deepEqual(plan.units.map((u) => u.layer), ['LABEL_W01', 'LABEL_W_02_A', 'LABEL_W03']);
  assert.equal(unitColourOf(8, P), unitColourOf(0, P), 'the palette cycles');
  assert.equal(unitAciOf(9, P), unitAciOf(1, P));
  assert.notEqual(unitScreenColourOf(3, P), unitColourOf(3, P), 'the sheet lifts the colour towards white');
  assert.equal(labelLayerName('', P), 'LABEL_UNIT');
  assert.equal(formatPartNo(7, P), '#07');
  assert.equal(formatPartNo(123, P), '#123');
});

test('a cabinet with no result keeps its place and the numbers after it do not move (lib/partLabels.js)', () => {
  const resultOf = (id) => ({ u1: r1, u2: null, u3: r3 })[id];
  const storeUnits = [{ id: 'u1', params: { unit_num: 'W01' } }, { id: 'u2', params: { unit_num: 'W02' } }, { id: 'u3', params: { unit_num: 'W03' } }];
  const pu = planUnits(storeUnits, resultOf);
  assert.deepEqual(pu.map((u) => [u.unitNum, u.panels.length]), [['W01', r1.panels.length], ['W02', 0], ['W03', r3.panels.length]]);
  const plan = projectLabelPlan({ units: storeUnits, resultOf, profile: P });
  assert.equal(plan.byUnit.get('u2').byPanel.size, 0);
  assert.equal(Math.min(...[...plan.byUnit.get('u3').byPanel.values()].map((v) => v.no)), exportablePanels(r1.panels).length + 1);
  assert.equal(labelsForUnit(plan, 'u3').layer, 'LABEL_W03');
  assert.equal(labelsForUnit(plan, 'nope'), null);
  assert.equal(projectLabelRecords({ units: storeUnits, resultOf, profile: P }).length, plan.total);
});

// ─── THE FORMATTER ──────────────────────────────────────────────────────────

test('the label leads with the number when it has one, and prints yesterday\'s words when it has none', () => {
  const top = r1.panels.find((p) => p.id === 'TOP');
  assert.equal(partLabelText('W01', top), 'W01 TOP 1071x550');
  assert.equal(partLabelText('W01', top, { no: 4 }), '#04 W01 TOP 1071x550');
  assert.equal(numberTag(null), '');
  assert.equal(numberTag(12), '#12');
});

// ─── THE DXF: THE CABINET'S LAYER, ITS COLOUR, THE NUMBER ───────────────────

test('a unit\'s files written with its labels put every text on LABEL_<cabinet> (colour 1), numbered; without labels the bytes are yesterday\'s', () => {
  const plan = partNumberPlan(units, P);
  const labels = dxfLabelsFor(plan, 'u1');
  assert.deepEqual(labelLayerRow(labels), [{ name: 'LABEL_W01', aci: 1 }]);
  assert.deepEqual(labelFor(labels, 'TOP'), { layer: 'LABEL_W01', no: 4 });
  assert.deepEqual(labelFor(labels, 'W01-FL'), { layer: 'LABEL_W01', no: 8 }, 'a front: the layer and, since 17:38, its number');
  assert.equal(labelFor(null, 'TOP'), null);

  const plain = buildUnitDxfFiles(r1, P);
  const again = buildUnitDxfFiles(r1, P, { labels: null });
  assert.equal(plain.map((f) => f.dxf).join('\n'), again.map((f) => f.dxf).join('\n'), 'no plan, no change');
  assert.ok(plain.find((f) => f.panelId === 'TOP').dxf.includes('UNIT_NUMBER'));

  const files = buildUnitDxfFiles(r1, P, { labels });
  const top = files.find((f) => f.panelId === 'TOP');
  const texts = top.entities.filter((e) => e.type === 'text' && e.str !== 'EDGE');
  assert.ok(texts.length >= 1);
  assert.ok(top.entities.filter((e) => e.type === 'text').every((e) => e.layer === 'LABEL_W01'));
  assert.equal(texts.map((e) => e.str).join(' '), '#04 W01 TOP 1071x550');
  assert.ok(!top.dxf.includes('UNIT_NUMBER'), 'the old text layer is not declared when nothing is on it');
  const parsed = parseDxf(top.dxf);
  const row = parsed.layers?.find?.((l) => l.name === 'LABEL_W01');
  if (row) assert.equal(Number(row.color), 1);
  const lines = top.dxf.split('\r\n');
  const at = lines.indexOf('LABEL_W01');
  assert.deepEqual(lines.slice(at, at + 5), ['LABEL_W01', '70', '0', '62', '1'], 'the layer row carries the cabinet\'s colour index');
  // every other entity of the file is where it was
  const strip = (f) => f.entities.filter((e) => e.type !== 'text' && !(e.type === 'poly' && e.layer === 'LABEL_W01'));
  assert.deepEqual(strip(top), strip(plain.find((f) => f.panelId === 'TOP')));
  // the edge arrow (14:10): three open polylines and the word on the same layer, on a numbered board only
  const arrows = top.entities.filter((e) => e.type === 'poly' && e.layer === 'LABEL_W01' && !e.closed);
  assert.equal(arrows.length, 3);
  assert.equal(texts.filter((e) => e.str === 'EDGE').length + top.entities.filter((e) => e.type === 'text' && e.str === 'EDGE').length, 1);
  const word = top.entities.find((e) => e.type === 'text' && e.str === 'EDGE');
  assert.equal(word.halign, 2, 'right-justified before a rightward arrow');
  // the front: on the cabinet's layer, numbered since 17:38; banded all round, so no EDGE arrow
  const fl = files.find((f) => f.panelId === 'W01-FL');
  assert.ok(fl.entities.filter((e) => e.type === 'text').every((e) => e.layer === 'LABEL_W01'));
  assert.ok(fl.entities.some((e) => e.type === 'text' && /^#08 /.test(e.str)), 'the door\'s text leads with its number');
  assert.equal(fl.entities.filter((e) => e.type === 'text' && e.str === 'EDGE').length, 0);
  assert.ok(!fl.entities.some((e) => e.type === 'poly' && e.layer === 'LABEL_W01'), 'no arrow on a front (banded all round)');
  // one part, through panelDxf, the same answer
  const one = panelDxf(r1.panels.find((p) => p.id === 'TOP'), r1.drills, { unitNum: 'W01', profile: P, labels });
  assert.equal(one, top.dxf);
});

test('the material sheet across cabinets declares one coloured layer per cabinet and numbers on through them', () => {
  const plan = partNumberPlan(units, P);
  const opts = { gap: P.cnc.layoutGap, rowWidth: P.cnc.layoutRowWidth };
  const block = (r, id) => {
    const panels = exportablePanels(r.panels);
    return { unitNum: r.unitNum, panels, drills: r.drills, layout: layoutPanels(panels, r.drills, opts), labels: dxfLabelsFor(plan, id) };
  };
  const dxf = materialSheetDxf({ blocks: [block(r1, 'u1'), block(r2, 'u2')], gap: P.cnc.layoutGap, profile: P });
  const lines = dxf.split('\r\n');
  for (const [name, aci] of [['LABEL_W01', '1'], ['LABEL_W_02_A', '5']]) {
    const at = lines.indexOf(name);
    assert.ok(at > 0, `${name} declared`);
    assert.deepEqual(lines.slice(at, at + 5), [name, '70', '0', '62', aci]);
  }
  assert.ok(lines.some((l) => /^#08\b/.test(l)), 'the second cabinet\'s first board is #08');
  assert.ok(!lines.includes('UNIT_NUMBER'));
  // and the one-cabinet sheet file the same way
  const b = block(r1, 'u1');
  const sheet = sheetDxf({ panels: b.panels, drills: b.drills, layout: b.layout, unitNum: 'W01', profile: P, labels: b.labels });
  assert.ok(sheet.includes('LABEL_W01') && sheet.includes('#01'));
  const sheetPlain = sheetDxf({ panels: b.panels, drills: b.drills, layout: b.layout, unitNum: 'W01', profile: P });
  assert.ok(sheetPlain.includes('UNIT_NUMBER') && !sheetPlain.includes('LABEL_W01'));
});

// ─── THE STICKERS ───────────────────────────────────────────────────────────

test('labelRecords: one per numbered board, in number order, with both colours, the name, the size and the arrow', () => {
  const recs = labelRecords(units, P);
  const plan = partNumberPlan(units, P);
  assert.equal(recs.length, plan.total);
  assert.deepEqual(recs.map((r) => r.no), recs.map((_, i) => i + 1));
  const first = recs[0];
  assert.equal(first.noText, '#01');
  assert.equal(first.total, plan.total);
  assert.deepEqual([first.unitNum, first.name, first.code, first.size, first.kindLabel], ['W01', 'SIDE L', 'BUL', '550 x 2150', 'SIDE']);
  assert.equal(first.unitColour, unitColourOf(0, P));
  assert.equal(first.kindColour, kindStyleOf('side', P).colour);
  assert.equal(first.edge.arrow, 'left');
  assert.ok(first.drawnW > 0 && first.drawnH > 0);
  const top = recs.find((r) => r.panelId === 'TOP' && r.unitNum === 'W01');
  assert.equal(top.kindColour, recs.find((r) => r.panelId === 'BOTTOM' && r.unitNum === 'W01').kindColour, 'top and bottom one colour');
  // 17:38: the doors have stickers too, with the front strip and the ALL edge icon
  const door = recs.find((r) => r.panelId === 'W01-FL');
  assert.ok(door, 'the door has a sticker');
  assert.deepEqual([door.name, door.kind, door.kindLabel, door.edge.arrow], ['DOOR', 'front', 'FRONT', 'all']);
  assert.equal(recs.length, units.reduce((n, u) => n + exportablePanels(u.panels).length, 0), 'one sticker per part of the sheet');
  const w2 = recs.filter((r) => r.unitId === 'u2');
  assert.ok(w2.every((r) => r.unitColour === unitColourOf(1, P)));
  assert.equal(w2.filter((r) => r.name === 'DIVIDER').length, r2.panels.filter((p) => p.part === 'DP').length);
});

test('the sheet grid: 21 cells, 3 x 7, centred on A4 (7.25 left, 15.15 top: Avery\'s 7.2 / 15.1), 66 pitch across, 38.1 down, and the pages cut to it', () => {
  const grid = labelSheetGrid(P);
  assert.equal(grid.perPage, 21);
  assert.equal(grid.cells.length, 21);
  assert.equal(grid.insetMm, 2.5);
  assert.deepEqual(grid.cells[0], { x: 7.25, y: 15.15, w: 63.5, h: 38.1 });
  assert.deepEqual(grid.cells[1], { x: 73.25, y: 15.15, w: 63.5, h: 38.1 }, '66 mm pitch: 63.5 + the 2.5 gutter');
  assert.deepEqual(grid.cells[20], { x: 139.25, y: 243.75, w: 63.5, h: 38.1 });
  const custom = migrateCabinetProfile({ ...P, labels: { ...P.labels, sheet: { ...P.labels.sheet, marginLeft: 10, marginTop: 12, gapX: 2 } } });
  assert.deepEqual(labelSheetGrid(custom).cells[1], { x: 10 + 63.5 + 2, y: 12, w: 63.5, h: 38.1 });
  const fifty = Array.from({ length: 50 }, (_, i) => ({ no: i + 1 }));
  assert.deepEqual(labelPages(fifty, P).map((pg) => pg.length), [21, 21, 8]);
  // the 44-up preset still lays out as it did on 13:07
  const forty4 = migrateCabinetProfile({ ...P, labels: { ...P.labels, sheet: P.labels.sheets.generic44 } });
  const g44 = labelSheetGrid(forty4);
  assert.equal(g44.perPage, 44);
  assert.deepEqual(g44.cells[0], { x: 8.4, y: 8.8, w: 48.3, h: 25.4 });
});

test('the labels PDF: a page per 21 stickers, real PDF bytes, named by the one naming law', () => {
  const recs = labelRecords(units, P);
  const one = labelsDoc({ records: recs, profile: P });
  assert.equal(one.labels, recs.length);
  assert.ok(one.bytes > 1000);
  const many = labelsDoc({ records: [...recs, ...recs, ...recs].map((r, i) => ({ ...r, no: i + 1, noText: formatPartNo(i + 1, P), total: recs.length * 3 })), profile: P });
  assert.equal(one.pages, Math.ceil(recs.length / 21));
  assert.equal(many.pages, Math.ceil(recs.length * 3 / 21));
  // the design scaled into the inset: the 44-up preset draws the same records on its own paper
  const forty4 = migrateCabinetProfile({ ...P, labels: { ...P.labels, sheet: P.labels.sheets.generic44 } });
  assert.equal(labelsDoc({ records: recs, profile: forty4 }).pages, Math.ceil(recs.length / 44));
  assert.throws(() => labelsDoc({ records: [], profile: P }), /nothing to label/);
  assert.match(labelsFilename({ project: 'H1180 ST37', now: new Date(2026, 9, 17, 13, 20) }), /^H1180-ST37-labels-1710-1320\.pdf$/);
});

// ─── THE MENU, THE SHEET ────────────────────────────────────────────────────

test('Output has Part labels (PDF), once, beside the BOM PDF, and it runs the handler', () => {
  let ran = 0;
  const menu = buildOutputMenu({ onExportLabels: () => { ran += 1; } });
  const flat = menu.items.filter((i) => i.label);
  const idx = flat.findIndex((i) => i.label === 'Part labels (PDF)');
  assert.ok(idx > 0, 'the entry is there');
  assert.equal(flat.filter((i) => i.label === 'Part labels (PDF)').length, 1);
  assert.equal(flat[idx - 1].label, 'BOM PDF');
  flat[idx].run();
  assert.equal(ran, 1);
});

test('the CNC sheet\'s caption carries the number and wears the cabinet\'s colour; the tree hands the downloads the plan', () => {
  const view = read('src/components/CncView.jsx');
  assert.match(view, /projectLabelPlan\(\{ units, resultOf: unitCncResult, profile \}\)/);
  assert.match(view, /partNo=\{labelPlan\.byUnit\.get\(b\.unit\.id\)\?\.byPanel\.get\(place\.panel\.id\)\?\.no \?\? null\}/);
  assert.match(view, /fill=\{labelColour \|\| '#d6d6d2'\}/);
  assert.match(view, /no: partNo,/);
  assert.match(view, /edgeArrowGeometry\(panel, profile, \{ textMm: label\.size \* 0\.9 \}\)/, 'the sheet draws the one arrow geometry');
  assert.match(view, /data-edge-arrow=\{panel\.id\}/);
  const tree = read('src/components/CncTree.jsx');
  assert.match(tree, /plan: labelPlan,/);
  assert.match(tree, /labels: labelsForUnit\(labelPlan, sheet\.unit\.id\)/);
  const page = read('src/pages/ConfiguratorPage.jsx');
  assert.match(page, /exportLabelsPdf\(\{ records, profile, project: project\.name \}\)/);
  assert.match(page, /onExportLabels=\{onExportLabels\}/);
});
