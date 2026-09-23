// ─── TURN 74 · F9 · THE DIVIDER UNDER A SLOPE IS CUT TO IT ─────────────────
//
// The owner, 23.09.2026 (list point 8):
//
//   *"divider przy skosie nie skraca się i nie ma cięcia pod kątem. Ma
//   pokazywać najdłuższą krawędź plus kąt cięcia."*
//
// The probe (`verify/t74/f09-probe.md`, committed before the fix): the side
// (T47) and the end panel (T50 F5) were cut to the slope; the divider stood to
// `H - G` through the roof board with no record, no angle, no short face. It
// now takes the side's own treatment, from the side's own helpers.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { slopeNoteText } from '../src/engine/cnc/partLabel.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const G = 18;

const build = (slope, x = 491) => computeCabinet({
  ...defaultParamsFor('WARDROBE', P),
  unit_num: '01',
  width: 1000,
  items: [{ kind: 'partition', id: 'p1', x_mm: x }],
  ...(slope ? { slope_cut: slope } : {}),
}, P);
const RAKE = { y0: 2400, y1: 1200, infill: 40 };
const vpart = (r) => r.panels.find((p) => p.part === 'VPART');

test('T74 F9 · the probe\'s own case: the divider stops under the roof board, its blank is its longest edge', () => {
  const r = build(RAKE);
  const v = vpart(r);
  // The roof underside over the divider's own 18 mm, at its high face.
  assert.equal(v.box.y + v.box.h, 1720.2011, 'the divider does not stop under the roof');
  assert.equal(v.w, 1702.2011, 'the cut size is not the blank');
  assert.equal(v.meta.slopeCut.h, v.w, 'the record\'s blank is not the cut size');
  assert.equal(v.meta.slopeCut.low, 1680.6011, 'the short face is not stated');
  assert.ok(v.meta.slopeCut.low < v.meta.slopeCut.h);
  // The cut list line carries the blank (the longest edge).
  const line = r.csvLines.find((l) => l.split(',')[1] === v.id);
  assert.equal(Number(line.split(',')[2]), Math.round(v.w), `the cut list line does not carry the blank: ${line}`);
});

test('T74 F9 · the angle: the same record and the same words as the side beside it', () => {
  const r = build(RAKE);
  const v = vpart(r);
  const bur = r.panels.find((p) => p.part === 'BUR');
  assert.deepEqual(v.meta.slopeCut.angles.map((a) => a.deg), [bur.meta.slopeCut.angles[0].deg]);
  assert.equal(slopeNoteText(v), slopeNoteText(bur), 'the sheet does not print the divider\'s cut as it prints the side\'s');
  assert.match(slopeNoteText(v), /^CUT 50\.2°$/);
  // The wedge at its two faces, high face over the higher ceiling.
  const { a, b } = v.meta.slopeCut.bevel3d;
  assert.ok(a > b, 'the wedge runs the wrong way under a ceiling falling to the right');
  assert.equal(Math.max(a, b), v.box.y + v.box.h);
  // Seen from the front: the board's own frame, from its own bottom.
  assert.deepEqual(v.meta.elevation.slice(0, 2), [[0, 0], [G, 0]]);
  assert.ok(v.meta.elevation.slice(2).every(([, y]) => y <= v.box.h + 1e-6), 'the elevation stands above the board');
});

test('T74 F9 · it is still a full-height divider: a door on it is not lost', () => {
  const v = vpart(build(RAKE));
  assert.equal(v.meta.fullHeight, true);
});

test('T74 F9 · under the flat stretch, and with no slope at all, the divider is exactly what it was', () => {
  const flat = vpart(build(null));
  assert.equal(flat.box.y + flat.box.h, 2150 - G);
  assert.equal(flat.meta.slopeCut, undefined);
  assert.equal(flat.meta.elevation, undefined);
  // A slope that does not come down over the divider cuts nothing on it.
  const high = vpart(build({ y0: 2400, y1: 1900, infill: 40 }, 120));
  assert.equal(high.box.y + high.box.h, 2150 - G, 'a divider under a flat roof was cut');
  assert.equal(high.meta.slopeCut, undefined);
});

test('T74 F9 · the 3-D takes the wedge off the divider as it does off the side', () => {
  const src = read('src/3d/panelSolid.js');
  assert.match(src, /const bevel3d = \(panel\.part === 'BUL' \|\| panel\.part === 'BUR' \|\| panel\.part === 'VPART'\)\s*&& panel\.meta\?\.slopeCut\?\.bevel3d/);
  // T46 F6's exact gate string still stands.
  assert.ok(src.includes('&& !bevel3d && !jpull) {'));
});

test('T74 F9 · one path: the divider reads the side\'s own helpers, and no new one', () => {
  const src = read('src/engine/cabinet.js');
  assert.match(src, /const divCeil = roofList \? Math\.min\(H - G, sideTopAt\(x, x \+ slotG\)\) : H - G;/);
  assert.match(src, /angles: anglesOver\(x, x \+ slotG\),/);
  assert.match(src, /bevel3d: \{ a: sideEdgeAt\(x\), b: sideEdgeAt\(x \+ slotG\) \},/);
});
