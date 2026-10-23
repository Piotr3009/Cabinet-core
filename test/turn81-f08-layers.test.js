/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T81 F8 · ONE INK, ONE LAYER
//
// The owner, 22.10.2026 (22:56): *"5 zostaw nasze, tylko dodaj brakujace
// (kazdy kolor zrob inny layer)"*; *"6 nie export do dxf, zrob layery wedlug
// cabinet core"*. CLAUDE.md T81 F8: "Tests test/turn81-f08-layers.test.js: the
// table's colours are unique per layer; every sheet's entities are on the
// table; the SVG has one group per layer present; the PDF of the walk's set is
// bytes with the expected page count (today's assertPdfBytes)."

import test from 'node:test';
import assert from 'node:assert/strict';

import { t81Kitchen, setArgs } from '../scripts/t81-kitchen.mjs';
import { DRAWING_LAYERS, LAYER_ORDER, layerGroups } from '../src/engine/drawings/layers.js';
import { wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { SET_LEGEND } from '../src/engine/drawings/setSheet.js';
import { sheetToSvg } from '../src/engine/drawings/svg.js';
import { assertPdfBytes, bookletDoc, pdfBytes } from '../src/lib/drawingExport.js';

// The table as T80 left it: every one keeps its colour and its pen (*"zostaw nasze"*).
const OURS = {
  CARCASE: ['#111111', 'OUTLINE'],
  DOORS: ['#D400D4', 'VISIBLE'],
  SHELVES: ['#009A3D', 'HIDDEN'],
  DOOR_SWING: ['#8A8A8A', 'FINE'],
  LEG_BLOCK: ['#8A8A8A', 'THIN'],
  UNIT_NUMBER: ['#009A3D', 'ANNOTATION'],
  HINGES: ['#4C9A9A', 'THIN'],
  DIMENSIONS: ['#1B2A4A', 'ANNOTATION'],
  RUNNERS: ['#2E7D8C', 'THIN'],
  VIEW_TITLE: ['#111111', 'VISIBLE'],
  HANDLES: ['#009A3D', 'VISIBLE'],
  BUILDING: ['#C0392B', 'THIN'],
  FRAME: ['#111111', 'OUTLINE'],
  FRAME_LIGHT: ['#444444', 'FINE'],
  SHEET_MUTED: ['#6F6F6F', 'FINE'],
  SHEET_CUT: ['#151515', 'CUT'],
  APPLIANCE: ['#1A3CE6', 'THIN'],
};
// The inks T81 adds, as CLAUDE.md T81 F8 lists them (the colours T81 PROPOSED).
const ADDED = {
  HINGE_MARK: '#111111',
  WORKTOP: '#2E8B57',
  XRAY_FRONT: '#9A9A9A',
  XRAY_CARCASE: '#C9C9C9',
  MASK: '#ffffff',
  FRAME_BOARD: '#5A2D5A',
};

const sets = () => {
  const out = [];
  for (const inframe of [true, false]) {
    t81Kitchen({ inframe });
    out.push(...wallDrawingSheets(setArgs()).map((s) => ({ ...s, inframe })));
  }
  return out;
};

test('F8 · ours keep their colour and their pen; the missing inks are added, each a layer of its own', () => {
  for (const [name, [colour, pen]] of Object.entries(OURS)) {
    assert.equal(DRAWING_LAYERS[name].colour, colour, `${name} keeps its colour`);
    assert.equal(DRAWING_LAYERS[name].pen, pen, `${name} keeps its pen`);
  }
  for (const [name, colour] of Object.entries(ADDED)) assert.equal(DRAWING_LAYERS[name]?.colour, colour, `${name} is on the table`);
  // Unique per layer: every added ink is a colour no other added ink wears,
  // and the worktop's green is not the handles' (CLAUDE.md F8).
  const added = Object.values(ADDED);
  assert.equal(new Set(added).size, added.length);
  assert.notEqual(DRAWING_LAYERS.WORKTOP.colour, DRAWING_LAYERS.HANDLES.colour);
  assert.notEqual(DRAWING_LAYERS.FRAME_BOARD.colour, DRAWING_LAYERS.DOORS.colour, 'the frame and the fronts set in it told apart');
  // A layer that fills names its fill: the painter's white, the black bar, the slab's tint and its cut.
  assert.equal(DRAWING_LAYERS.MASK.fill, '#ffffff');
  assert.equal(DRAWING_LAYERS.HINGE_MARK.fill, '#111111');
  assert.deepEqual([DRAWING_LAYERS.WORKTOP.fill, DRAWING_LAYERS.WORKTOP.cutFill], ['#f3f3f3', '#d9d9d9']);
  // The pen order names every layer of the table once.
  assert.deepEqual([...LAYER_ORDER].sort(), Object.keys(DRAWING_LAYERS).sort());
});

test('F8 · every entity of every sheet of the walk\'s kitchen names a layer of the table, and a drawing ink fills only with its layer\'s fill', () => {
  for (const s of sets()) {
    const off = s.sheet.entities.filter((e) => !DRAWING_LAYERS[e.layer]);
    assert.deepEqual(off.map((e) => `${e.kind}:${e.layer}`), [], `${s.name} (in-frame ${s.inframe})`);
    // The projector's inks carry no colour of their own: a fill is the layer's.
    for (const e of s.sheet.entities.filter((x) => x.fill && x.src)) {
      const L = DRAWING_LAYERS[e.layer];
      assert.ok(e.fill === L.fill || e.fill === L.cutFill, `${s.name}: ${e.layer} fills with ${e.fill}`);
    }
  }
});

test('F8 · the SVG: one group per layer present, in the pen order, every element inside its own layer\'s group', () => {
  for (const s of sets()) {
    const svg = sheetToSvg(s.sheet, { kind: 'wall' });
    const groups = [...svg.matchAll(/<g data-layer="([A-Z_]+)">([\s\S]*?)<\/g>/g)].map((m) => ({ layer: m[1], body: m[2] }));
    const present = [...new Set(s.sheet.entities.map((e) => e.layer))];
    assert.deepEqual(groups.map((g) => g.layer).sort(), present.sort(), `${s.name}: one group per layer present`);
    const rank = groups.map((g) => LAYER_ORDER.indexOf(g.layer));
    assert.deepEqual(rank, [...rank].sort((a, b) => a - b), `${s.name}: in the pen order`);
    for (const g of groups) {
      const layers = [...g.body.matchAll(/data-layer="([A-Z_]+)"/g)].map((m) => m[1]);
      assert.ok(layers.every((l) => l === g.layer), `${s.name}: the ${g.layer} group holds ${g.layer} only`);
    }
    // Nothing drawn outside a group but the paper.
    const outside = svg.replace(/<g data-layer="[A-Z_]+">[\s\S]*?<\/g>/g, '');
    assert.equal((outside.match(/<(line|rect|path|circle|text|image)\b/g) || []).length, 1, 'the paper\'s own rect');
  }
  // The painter's white keeps its fill, and says what it is.
  t81Kitchen({ inframe: true });
  const fronts = wallDrawingSheets(setArgs()).find((x) => x.variant === 'fronts');
  assert.match(sheetToSvg(fronts.sheet, { kind: 'wall' }), /<path [^>]*fill="#ffffff"[^>]*data-layer="MASK"[^>]*data-fill="mask"/);
});

test('F8 · the layer groups: the painter\'s white first, the words last, a layer off the order after it', () => {
  const ents = [
    { layer: 'UNIT_NUMBER', kind: 'text' }, { layer: 'CARCASE', kind: 'line' }, { layer: 'MASK', kind: 'poly' },
    { layer: 'NOT_A_LAYER', kind: 'line' }, { layer: 'CARCASE', kind: 'line', n: 2 },
  ];
  const g = layerGroups(ents);
  assert.deepEqual(g.map(([l]) => l), ['MASK', 'CARCASE', 'UNIT_NUMBER', 'NOT_A_LAYER']);
  assert.equal(g[1][1].length, 2, 'a group keeps the sheet\'s own order');
});

test('F8 · the PDF of the walk\'s set: bytes, nine pages, one named layer per ink it draws', () => {
  t81Kitchen({ inframe: true });
  const sheets = wallDrawingSheets(setArgs());
  const doc = bookletDoc(sheets.map((s) => s.sheet));
  const bytes = pdfBytes(doc);
  assertPdfBytes(bytes, { pages: 9, sheets: sheets.length });
  const pdf = Buffer.from(bytes).toString('latin1');
  assert.match(pdf, /\/OCProperties << \/OCGs \[/);
  const used = new Set(sheets.flatMap((s) => s.sheet.entities.map((e) => e.layer)));
  for (const layer of used) assert.ok(pdf.includes(`/Type /OCG /Name (${layer})`), `the PDF names ${layer}`);
  assert.ok(/\/OC \/CC\d+ BDC/.test(pdf) && /EMC/.test(pdf), 'each layer\'s drawing is marked');
  // A second build of the same document is the same bytes (the groups are not written twice).
  assert.equal(Buffer.compare(Buffer.from(bytes), Buffer.from(pdfBytes(doc))), 0);
});

test('F8 · the legend names the inks T81 added', () => {
  const rows = new Map(SET_LEGEND.map(([, layer, label]) => [layer, label]));
  for (const layer of ['HINGE_MARK', 'WORKTOP', 'FRAME_BOARD', 'XRAY_FRONT', 'XRAY_CARCASE']) assert.ok(rows.has(layer), `${layer} in the legend`);
  t81Kitchen({ inframe: true });
  const fronts = wallDrawingSheets(setArgs()).find((x) => x.variant === 'fronts').sheet;
  const words = fronts.entities.filter((e) => e.kind === 'text').map((e) => e.text);
  for (const label of rows.values()) assert.ok(words.includes(label), `the sheet's legend says ${label}`);
});
