// ─── TURN 28 F7 — a shelf's grain in 3-D follows its own sheet ──────────────
//
// Turn 26 F8 turned the shelf's CNC frame along the grain: it is drawn
// `depth × width` now, the same convention the sides and (since turn 24) the
// partition are laid out in. The 3-D texture went on running the other way.
//
// The cause is that `engine/decors.js grainRun` falls back to the SAW's rule —
// the grain runs the longer of a part's two cut dimensions — and a shelf is
// nearly square: 560 across a 600 carcass against 520 deep. Forty millimetres
// decide it, and they decided it the wrong way round for the one piece whose
// nesting the owner had just written down.
//
// The piece SAYS SO now, in the field `grainRun` has always offered for exactly
// this: `cnc.grain`, "the only statement that could ever beat the saw". The CNC
// is untouched — `grainRun` is its only reader in the app.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { decorMapping, grainRun } from '../src/engine/decors.js';
import { decorPlacement } from '../src/3d/materials.js';
import { panelPlacement } from '../src/engine/joinery.js';

const unit = (type, extra = {}) => computeCabinet({
  ...defaultParamsFor(type, P), unit_num: '01', ...extra,
}, P);
const shelfOf = (r) => r.panels.find((p) => p.part === 'SHELF');

// A manufacturer SCAN — the finish whose placement is physical rather than a
// tile, and the one the owner is looking at when he says the grain is wrong.
const SCAN = { texture: 'oak.jpg', scanAlongGrainMm: 1200 };

test('F7 the shelf DECLARES its grain, and it is the depth', () => {
  const shelf = shelfOf(unit('BUD', { shelves: 1 }));
  assert.equal(shelf.cnc.grain, 'h', 'the record’s own h, which for a shelf is its depth');
  const g = grainRun(shelf);
  assert.equal(g.axis, 'h');
  assert.equal(g.lengthMm, shelf.h, 'front to back');
  assert.equal(g.acrossMm, shelf.w);
  // And it is a real correction, not a restatement: the saw's fallback would
  // have said the other axis on this very piece.
  assert.ok(shelf.w > shelf.h, 'a shelf is wider than it is deep — which is why the fallback got it wrong');
  assert.equal(grainRun({ ...shelf, cnc: { ...shelf.cnc, grain: undefined } }).axis, 'w');
});

test('F7 …so the SCENE lays the scan front-to-back on the shelf’s big face', () => {
  const shelf = shelfOf(unit('BUD', { shelves: 1 }));
  const map = decorMapping(shelf.box, grainRun(shelf).lengthMm);
  // The big face of a shelf is the ±Y pair: u runs along X (the cabinet's
  // width) and v along Z (its depth).
  assert.equal(map.widthMm, shelf.box.w);
  assert.equal(map.heightMm, shelf.box.d);
  assert.equal(map.rotate, false, 'grain along V — which on this face is front-to-back');

  const placed = decorPlacement(SCAN, shelf, P);
  assert.equal(placed.rotate, false);
  // One image is 1 200 mm of real board ALONG the grain, so the repeat down the
  // face's v axis is the shelf's own depth over that.
  assert.ok(Math.abs(placed.repeatY - shelf.box.d / SCAN.scanAlongGrainMm) < 1e-9,
    'the along-grain repeat is measured over the DEPTH');
});

test('F7 the picture and the sheet now agree about which way the figure runs', () => {
  const r = unit('BUD', { shelves: 1 });
  const shelf = shelfOf(r);
  // THE SHEET: turn 26 F8's frame — drawn `depth × width`, its CNC x running
  // from the FRONT of the cabinet towards the back.
  assert.equal(shelf.cnc.rotated, true);
  assert.equal(shelf.cnc.drawn_w, shelf.h, 'x spans the depth');
  assert.equal(shelf.cnc.drawn_h, shelf.w, 'y spans the width');
  const pl = panelPlacement(shelf);
  assert.deepEqual(pl.u, [0, 0, -1], 'the drawn x really is the cabinet’s depth axis');
  assert.deepEqual(pl.v, [1, 0, 0], '…and the drawn y its width');

  // THE PICTURE: the along-grain axis, as a direction in the room. `rotate`
  // false means the grain runs down the face's V, and V on this face is Z.
  const map = decorMapping(shelf.box, grainRun(shelf).lengthMm);
  const grainAxis = map.rotate ? 'x' : 'z';
  assert.equal(grainAxis, 'z', 'front to back in the room');
  // …which is the axis the sheet's own x runs along. One direction, two
  // drawings of it.
  assert.equal(Math.abs(pl.u[2]), 1);
});

test('F7 the BANDED edge is the long FRONT one, and it lies across the grain', () => {
  const r = unit('BUD', { shelves: 1 });
  const shelf = shelfOf(r);
  // Turn 8's own record: a shelf is edged on one long edge, and the length
  // banded is its WIDTH.
  assert.equal(shelf.edging.code, P.csv.codes.right);
  assert.ok(Math.abs(shelf.edging.len_m - shelf.w / 1000) < 1e-9, 'one long front edge');
  assert.equal(grainRun(shelf).acrossMm, shelf.w, 'and the grain crosses it');
});

test('F7 no other board moved: the sides, the partition and the top are as they were', () => {
  const r = unit('BUD', {
    shelves: 1,
    sections: [{ width_mm: 600, items: [{ id: 'p1', kind: 'partition', x_mm: 300 }] }],
  });
  for (const part of ['BUL', 'BUR', 'TOP', 'BOTTOM', 'BACK', 'VPART']) {
    const board = r.panels.find((p) => p.part === part);
    if (!board) continue;
    assert.equal(board.cnc.grain, undefined, `${part} says nothing — the saw's rule answers`);
  }
  // A SIDE runs its grain up its height and always has; nothing here touched it.
  const side = r.panels.find((p) => p.part === 'BUL');
  assert.equal(grainRun(side).lengthMm, side.h);
  assert.equal(decorMapping(side.box, grainRun(side).lengthMm).rotate, false);
});

test('F7 the CNC is untouched: nothing but grainRun reads the field', () => {
  // The DXF is written from the outline, the pockets, the holes and the drawn
  // size — the whole geometry of the piece is unchanged by this statement, and
  // that is asserted as the geometry rather than promised.
  const withGrain = shelfOf(unit('BUD', { shelves: 1 }));
  const asDrawn = {
    rotated: withGrain.cnc.rotated,
    drawn_w: withGrain.cnc.drawn_w,
    drawn_h: withGrain.cnc.drawn_h,
    outline: withGrain.cnc.outline,
    pockets: withGrain.cnc.pockets,
    holes: withGrain.cnc.holes,
    layer: withGrain.cnc.layer,
  };
  assert.deepEqual(asDrawn.outline, [
    [0, 0], [withGrain.h, 0], [withGrain.h, withGrain.w], [0, withGrain.w],
  ], 'a bare rectangle, depth by width, exactly as turn 26 left it');
  assert.deepEqual(asDrawn.pockets, []);
  assert.deepEqual(asDrawn.holes, []);
  // …and the CUT SIZE, which is what the CSV and the BOM print.
  assert.equal(withGrain.w, 560);
  assert.equal(withGrain.h, 520);
});

test('F7 the one thing it does NOT settle is asked, in BLOCKERS, as a question', () => {
  // `sheetTurn` lays a shelf down by its DRAWN size and F7 forbids touching the
  // CNC, so the nesting and the stated grain can differ on this one part. That
  // is a real question about the arkusz and it is asked rather than guessed.
  const doc = readFileSync(new URL('../BLOCKERS.md', import.meta.url), 'utf8');
  const at = doc.indexOf('## #95');
  assert.ok(at > 0, 'the question is on the list');
  const entry = doc.slice(at, at + 2600);
  assert.match(entry, /tura 28, F7/);
  assert.match(entry, /CNC untouched/);
  assert.match(entry, /Co Piotr ma zdecydować/);
  // …and the layout really is untouched, which is what makes it a question.
  const layout = readFileSync(new URL('../src/engine/cnc/layout.js', import.meta.url), 'utf8');
  assert.match(layout, /return w > h \? 90 : 0;/, 'nested by the drawn size, as turn 17 shipped it');
  const code = layout.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.doesNotMatch(code, /grain/, 'the nester does not read the statement');
});

test('F7 a fix shelf and an adjustable one are the same piece about this', () => {
  const r = unit('BUD', {
    sections: [{
      width_mm: 600,
      items: [
        { id: 's1', kind: 'shelf', pos_mm: 300, variant: 'adjustable' },
        { id: 's2', kind: 'shelf', pos_mm: 500, variant: 'fixed' },
      ],
    }],
  });
  const shelves = r.panels.filter((p) => p.part === 'SHELF');
  assert.equal(shelves.length, 2);
  for (const s of shelves) {
    assert.equal(s.cnc.grain, 'h', `${s.id}: nested the same way whichever way it is held`);
    assert.equal(decorMapping(s.box, grainRun(s).lengthMm).rotate, false);
  }
});
