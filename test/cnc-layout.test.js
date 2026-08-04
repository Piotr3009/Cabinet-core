// ─── CNC sheet layout tests ───
//
// The flat layout behind the CNC view. It is pure geometry, so it is tested in
// node rather than by staring at the browser: parts must not overlap on the
// sheet, and the mapping from engine coordinates (y up) to sheet coordinates
// (y down) has to be exact or every hole is drawn in the wrong place.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE } from '../src/engine/profile.js';
import { layoutPanels, panelBounds, sheetRect, toSheet } from '../src/engine/cnc/layout.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const WARDROBE = JSON.parse(readFileSync(join(HERE, '..', 'fixtures', 'golden-wardrobe.json'), 'utf8'));
const PROFILE = DEFAULT_CABINET_PROFILE;
const WA = WARDROBE.cases.find((c) => c.id === 'W-A');

const RESULT = computeCabinet({
  type: WA.inputs.type, width: WA.inputs.width, height: WA.inputs.height, depth: WA.inputs.depth,
  board_t: WA.inputs.board_t, front_t: WA.inputs.front_t, front_type: WA.inputs.front_type,
  shelves: WA.inputs.shelves, drawers: WA.inputs.drawers, rail: WA.inputs.rail,
  rail_offset: WA.inputs.rail_offset, hinge: WA.inputs.hinge, unit_num: WA.inputs.unit_num,
}, PROFILE);

const OPTS = { gap: PROFILE.cnc.layoutGap, rowWidth: PROFILE.cnc.layoutRowWidth };

test('panelBounds covers the tabs and reliefs, not just the nominal rectangle', () => {
  const G = PROFILE.board.thickness;
  const bul = RESULT.panels.find((p) => p.id === 'BUL');
  const b = panelBounds(bul, RESULT.drills);
  // BUL: tabs run one board thickness past the panel width…
  assert.equal(b.maxX, bul.w + G);
  assert.equal(b.minX, 0);
  // …and the socket relief overshoots top and bottom by socketOvershoot.
  assert.equal(b.minY, -PROFILE.puzzle.socketOvershoot);
  assert.equal(b.maxY, bul.h + PROFILE.puzzle.socketOvershoot);
  assert.equal(b.w, bul.w + G);

  // BUR is the mirror: tabs run into negative x.
  const bur = panelBounds(RESULT.panels.find((p) => p.id === 'BUR'), RESULT.drills);
  assert.equal(bur.minX, -G);
  assert.equal(bur.maxX, RESULT.panels.find((p) => p.id === 'BUR').w);

  // A plain rectangle stays a plain rectangle.
  const shelf = RESULT.panels.find((p) => p.id === 'SHELF-1');
  const sb = panelBounds(shelf, RESULT.drills);
  assert.deepEqual([sb.minX, sb.minY, sb.maxX, sb.maxY], [0, 0, shelf.w, shelf.h]);
});

test('every part is placed exactly once, in cut-list order', () => {
  const { places } = layoutPanels(RESULT.panels, RESULT.drills, OPTS);
  assert.equal(places.length, RESULT.panels.length);
  assert.deepEqual(places.map((p) => p.panel.id), RESULT.panels.map((p) => p.id));
});

test('parts never overlap on the sheet', () => {
  const { places } = layoutPanels(RESULT.panels, RESULT.drills, OPTS);
  for (let i = 0; i < places.length; i += 1) {
    for (let j = i + 1; j < places.length; j += 1) {
      const a = places[i];
      const b = places[j];
      const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      assert.ok(!overlap, `${a.panel.id} overlaps ${b.panel.id}`);
    }
  }
});

test('rows wrap at the configured width and nothing escapes the sheet', () => {
  const { places, width, height } = layoutPanels(RESULT.panels, RESULT.drills, OPTS);
  for (const p of places) {
    assert.ok(p.x >= 0 && p.y >= 0, `${p.panel.id} placed at a negative coordinate`);
    assert.ok(p.x + p.w <= width + 1e-9, `${p.panel.id} runs past the sheet width`);
    assert.ok(p.y + p.h <= height + 1e-9, `${p.panel.id} runs past the sheet height`);
    // Only a part that is wider than the row limit on its own may exceed it.
    assert.ok(p.x === 0 || p.x + p.w <= OPTS.rowWidth + 1e-9, `${p.panel.id} was not wrapped`);
  }
  assert.ok(width > 0 && height > 0);
});

test('a part wider than the row limit still gets placed (no infinite wrap)', () => {
  const wide = { id: 'WIDE', w: 9000, h: 100, cnc: { outline: [[0, 0], [9000, 0], [9000, 100], [0, 100]], pockets: [] } };
  const small = { id: 'SMALL', w: 100, h: 100, cnc: { outline: [[0, 0], [100, 0], [100, 100], [0, 100]], pockets: [] } };
  const { places, width } = layoutPanels([wide, small], [], { gap: 50, rowWidth: 3600 });
  assert.equal(places.length, 2);
  assert.equal(places[0].x, 0);
  assert.equal(places[1].x, 0, 'the next part starts a fresh row');
  assert.ok(places[1].y > places[0].y);
  assert.equal(width, 9000);
});

test('engine y-up maps to sheet y-down, corner for corner', () => {
  const { places } = layoutPanels(RESULT.panels, RESULT.drills, OPTS);
  const place = places.find((p) => p.panel.id === 'SHELF-1');
  const { bounds } = place;

  // Bottom-left of the part (engine minX/minY) → bottom-left of its box on the
  // sheet, which in a y-down frame is the LARGEST y.
  assert.deepEqual(toSheet(place, bounds.minX, bounds.minY), [place.x, place.y + place.h]);
  assert.deepEqual(toSheet(place, bounds.minX, bounds.maxY), [place.x, place.y]);
  assert.deepEqual(toSheet(place, bounds.maxX, bounds.maxY), [place.x + place.w, place.y]);
});

test('a pocket becomes the same rectangle in sheet coordinates', () => {
  const { places } = layoutPanels(RESULT.panels, RESULT.drills, OPTS);
  const place = places.find((p) => p.panel.id === 'BUL');
  const pocket = place.panel.cnc.pockets[0];
  const r = sheetRect(place, pocket);
  assert.equal(r.w, Math.abs(pocket.x2 - pocket.x1));
  assert.equal(r.h, Math.abs(pocket.y2 - pocket.y1));
  // Its top-left corner is the engine's (min x, max y).
  assert.deepEqual([r.x, r.y], toSheet(place, Math.min(pocket.x1, pocket.x2), Math.max(pocket.y1, pocket.y2)));
  // …and it lands inside the part's own box on the sheet.
  assert.ok(r.x >= place.x - 1e-9 && r.x + r.w <= place.x + place.w + 1e-9);
  assert.ok(r.y >= place.y - 1e-9 && r.y + r.h <= place.y + place.h + 1e-9);
});

test('every hole lands inside the box its part occupies', () => {
  const { places } = layoutPanels(RESULT.panels, RESULT.drills, OPTS);
  for (const place of places) {
    for (const d of RESULT.drills) {
      if (d.panel !== place.panel.id) continue;
      const [cx, cy] = toSheet(place, d.x, d.y);
      assert.ok(cx >= place.x - 1e-9 && cx <= place.x + place.w + 1e-9,
        `${place.panel.id}: hole x ${cx} outside [${place.x}, ${place.x + place.w}]`);
      assert.ok(cy >= place.y - 1e-9 && cy <= place.y + place.h + 1e-9,
        `${place.panel.id}: hole y ${cy} outside [${place.y}, ${place.y + place.h}]`);
    }
  }
});
