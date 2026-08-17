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
//
// ─── RE-PINNED 17.08.2026 (CLAUDE.md T37-F7) ────────────────────────────────
//
// The owner, on the same shelves this file pinned: *"CNC jest ok, ale
// wizualizacja nie jest — sprawdź, co ci nadpisuje."*
//
// Everything above is kept because it is the record, and every word of it about
// the SHEET is still true. What it got wrong is one step of arithmetic, and the
// step is a FRAME. `cnc.grain` is written inside the `cnc` block, beside
// `drawn_w` and `drawn_h`, and it means what it says in THAT frame — the CNC
// DRAWN frame. This file read it as if it were in the PANEL frame and wrote
// "the record's own h, which for a shelf is its depth". It is not. A shelf is
// drawn `depth × width` (turn 26 F8), so the drawn `h` is the 560 — the
// cabinet's WIDTH — and the figure runs LEFT-TO-RIGHT, parallel to the wieniec
// above it, not front-to-back.
//
// `engine/decors.js statedPanelAxis` now TRANSLATES the stated axis out of the
// drawn frame before `grainRun` uses it, and the assertions below flip with it.
// The statement has not moved a character; only the reader that had been
// misreading it. BLOCKERS #95 asked exactly this question and this is its
// answer.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { decorMapping, grainRun } from '../src/engine/decors.js';
import { decorPlacement } from '../src/3d/materials.js';
import { panelPlacement } from '../src/engine/joinery.js';
// RE-PINNED 17.08.2026 (T37-F7a): the nester is now part of this file's subject,
// because the statement it used to ignore is the statement this file is about.
import { sheetTurn } from '../src/engine/cnc/layout.js';

const unit = (type, extra = {}) => computeCabinet({
  ...defaultParamsFor(type, P), unit_num: '01', ...extra,
}, P);
const shelfOf = (r) => r.panels.find((p) => p.part === 'SHELF');

// A manufacturer SCAN — the finish whose placement is physical rather than a
// tile, and the one the owner is looking at when he says the grain is wrong.
const SCAN = { texture: 'oak.jpg', scanAlongGrainMm: 1200 };

test('F7 the shelf DECLARES its grain, and it is the depth'
  + ' — RE-PINNED 17.08.2026 (T37-F7): read in its own drawn frame, it is the WIDTH', () => {
  const shelf = shelfOf(unit('BUD', { shelves: 1 }));
  // The STATEMENT is untouched — turn 26 F8 wrote it and it still reads 'h'.
  assert.equal(shelf.cnc.grain, 'h', 'the record’s own h, which for a shelf is its depth');
  const g = grainRun(shelf);
  // ─── RE-PINNED 17.08.2026 (CLAUDE.md T37-F7) ─────────────────────────────
  // *"CNC jest ok, ale wizualizacja nie jest — sprawdź, co ci nadpisuje."*
  // The line above called the record's `h` "its depth". The record's `h` is the
  // DRAWN one, and a shelf is drawn `depth × width`: `drawn_h` is 560, the
  // cabinet's WIDTH. `grainRun` now translates that axis out of the drawn frame
  // into the panel's own, where it is `w`. Same statement, read in the frame it
  // was written in. Was: axis 'h', lengthMm = shelf.h, acrossMm = shelf.w.
  assert.equal(shelf.cnc.drawn_w, shelf.h, 'the drawn frame is the panel frame TURNED…');
  assert.equal(shelf.cnc.drawn_h, shelf.w, '…so the stated `h` is the panel’s `w`');
  assert.equal(g.axis, 'w');
  assert.equal(g.lengthMm, shelf.w, 'left to right, along the banded front edge');
  assert.equal(g.acrossMm, shelf.h);
  // And it is a real correction, not a restatement: the saw's fallback would
  // have said the other axis on this very piece.
  assert.ok(shelf.w > shelf.h, 'a shelf is wider than it is deep — which is why the fallback got it wrong');
  assert.equal(grainRun({ ...shelf, cnc: { ...shelf.cnc, grain: undefined } }).axis, 'w');
  // ─── RE-PINNED 17.08.2026: …and where the two rules really DO part company ─
  // On this cabinet the translated statement and the saw now AGREE, which is
  // why the line above still reads 'w' and why it no longer proves anything on
  // its own. The piece that proves it is a cabinet DEEPER THAN IT IS WIDE: the
  // saw says "the longer side", the statement says "the width", and the
  // statement wins. If the translation were ever dropped this assertion is the
  // one that would go red.
  const deep = computeCabinet({
    type: 'BUD', width: 400, height: 770, depth: 700, unit_num: '01', shelves: 1,
  }, P);
  const ds = shelfOf(deep);
  assert.ok(ds.h > ds.w, 'deeper than it is wide — the saw would run the grain front-to-back');
  assert.equal(ds.cnc.grain, 'h', 'the same statement as every other shelf');
  assert.equal(grainRun({ ...ds, cnc: { ...ds.cnc, grain: undefined } }).axis, 'h', 'the saw’s answer');
  assert.equal(grainRun(ds).axis, 'w', '…and the piece’s own, which beats it');
});

test('F7 …so the SCENE lays the scan front-to-back on the shelf’s big face'
  + ' — RE-PINNED 17.08.2026 (T37-F7): LEFT-TO-RIGHT, with the wieniec', () => {
  const shelf = shelfOf(unit('BUD', { shelves: 1 }));
  const map = decorMapping(shelf.box, grainRun(shelf).lengthMm);
  // The big face of a shelf is the ±Y pair: u runs along X (the cabinet's
  // width) and v along Z (its depth).
  assert.equal(map.widthMm, shelf.box.w);
  assert.equal(map.heightMm, shelf.box.d);
  // ─── RE-PINNED 17.08.2026 (CLAUDE.md T37-F7): 'v' → 'u' ──────────────────
  // *"CNC jest ok, ale wizualizacja nie jest — sprawdź, co ci nadpisuje."*
  // The mapping has not changed a line; its INPUT has. `grainRun(shelf)` now
  // hands it 560 (the width) instead of 520 (the depth), because the stated
  // axis is read in the frame it was written in. Grain along U — which on this
  // face is left-to-right, the same direction as the wieniec above it.
  assert.equal(map.grainAxis, 'u', 'grain along U — which on this face is left-to-right');

  // ─── TURN 29 (CLAUDE.md F1): AND THIS IS WHERE F7 STOPPED SHORT ──────────
  //
  // It asserted `rotate === false` and called that "front to back". `rotate` is
  // not a direction in the room — it is whether the IMAGE takes a quarter turn
  // — and turn 8 decided that in a function that has never been shown an
  // image. For a manufacturer's SCAN, whose figure runs down its own height,
  // `false` really is front-to-back and this assertion was right. For the
  // procedural grain a machine with no network falls back to — whose figure
  // runs along its WIDTH — `false` laid it across the shelf, and that is the
  // picture the owner photographed. Same flag, two families of image, 90°
  // apart. The direction is the line above; which way the picture is turned is
  // `3d/materials.js decorPlacement`, and the SURFACE both produce is asserted
  // in `test/turn29-f1-shelf-grain-scene.test.js` off a mounted material.
  const placed = decorPlacement(SCAN, shelf, P);
  // ─── RE-PINNED 17.08.2026 (CLAUDE.md T37-F7): false → true ───────────────
  // A scan's figure runs down its own V. The shelf's now runs along the face's
  // U, so the image is the one that has to take the quarter turn — which is
  // exactly what it already does on the wieniec, and the shelf has joined it.
  // `decorPlacement` is untouched; the direction it is turning TO has moved.
  assert.equal(placed.rotate, true);
  // One image is 1 200 mm of real board ALONG the grain. Turned, the along-grain
  // repeat is measured over the face's U — the shelf's own WIDTH — and lands on
  // repeatY. Was: repeatY over the DEPTH, unturned.
  assert.ok(Math.abs(placed.repeatY - shelf.box.w / SCAN.scanAlongGrainMm) < 1e-9,
    'the along-grain repeat is measured over the WIDTH');
  assert.ok(Math.abs(placed.repeatX - shelf.box.d / SCAN.scanAlongGrainMm) < 1e-9,
    '…and the across-grain one over the depth');
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

  // THE PICTURE: the along-grain axis, as a direction in the room. `grainAxis`
  // 'v' means the grain runs down the face's V, and V on this face is Z.
  const map = decorMapping(shelf.box, grainRun(shelf).lengthMm);
  const grainAxis = map.grainAxis === 'u' ? 'x' : 'z';
  // ─── RE-PINNED 17.08.2026 (CLAUDE.md T37-F7): 'z' → 'x' ──────────────────
  // *"CNC jest ok, ale wizualizacja nie jest — sprawdź, co ci nadpisuje."*
  // The heading is still true and is now true for the right reason. The sheet
  // stands the grain UP THE PAGE — the drawn y — and this test used to match it
  // to the drawn X. `pl.v` is the drawn y, and it is [1,0,0]: the cabinet's
  // WIDTH. So the picture and the sheet agree on `x`, not on `z`.
  assert.equal(grainAxis, 'x', 'left to right in the room');
  // …which is the axis the sheet stands UP THE PAGE — its own y. One direction,
  // two drawings of it.
  assert.equal(Math.abs(pl.v[0]), 1);
  // The sheet's own x is the depth and always was; kept because it is the fact
  // the line above used to be matched against, and it has not moved.
  assert.equal(Math.abs(pl.u[2]), 1);
});

test('F7 the BANDED edge is the long FRONT one, and it lies across the grain'
  + ' — RE-PINNED 17.08.2026 (T37-F7): the grain runs ALONG it', () => {
  const r = unit('BUD', { shelves: 1 });
  const shelf = shelfOf(r);
  // Turn 8's own record: a shelf is edged on one long edge, and the length
  // banded is its WIDTH.
  assert.equal(shelf.edging.code, P.csv.codes.right);
  assert.ok(Math.abs(shelf.edging.len_m - shelf.w / 1000) < 1e-9, 'one long front edge');
  // ─── RE-PINNED 17.08.2026 (CLAUDE.md T37-F7): ACROSS → ALONG ─────────────
  // The banded edge has not moved: it is the long front one, and it is the
  // width. What moved is which way the figure runs past it. Read in its own
  // drawn frame the shelf's statement is the WIDTH, so the grain runs ALONG the
  // banded edge — exactly as it does on the wieniec above, whose front edge is
  // banded the same way. Was: `acrossMm === shelf.w`, "the grain crosses it".
  assert.equal(grainRun(shelf).lengthMm, shelf.w, 'and the grain runs along it');
  assert.equal(grainRun(shelf).acrossMm, shelf.h, '…with the depth across');
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
  assert.equal(decorMapping(side.box, grainRun(side).lengthMm).grainAxis, 'v');
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

test('F7 the one thing it does NOT settle is asked, in BLOCKERS, as a question'
  + ' — RE-PINNED 17.08.2026 (T37-F7a): and this turn answers it', () => {
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
  // ─── RE-PINNED 17.08.2026 (CLAUDE.md T37-F7a): THE QUESTION IS ANSWERED ──
  //
  // *"CNC jest ok, ale wizualizacja nie jest — sprawdź, co ci nadpisuje."*
  //
  // This assertion was `doesNotMatch(code, /grain/)` — "the nester does not
  // read the statement" — and F7a is the ruling that it must. A part that
  // STATES its grain is laid with that grain running UP the sheet; the old size
  // rule stays as the fall-through for a part that states nothing. So the guard
  // is INVERTED rather than dropped, and both halves are pinned: the statement
  // is read, and the old rule still answers where there is no statement. The
  // BLOCKERS entry above stays exactly as it is — it is the record of the
  // question, and this turn is its answer.
  assert.match(code, /grain/, 'the nester DOES read the statement now (T37-F7a)');
  assert.match(code, /SHELF_BOARD_PARTS\.has/, '…and the old set is still the fall-through');
  // The two rules on the one piece that tells them apart: a cabinet deeper than
  // it is wide. The size rule stood the shelf up the page and laid its own
  // stated figure across it; the statement wins and it is left alone.
  const deep = computeCabinet({
    type: 'BUD', width: 400, height: 770, depth: 700, unit_num: '01', shelves: 1,
  }, P);
  const ds = shelfOf(deep);
  assert.ok(Number(ds.cnc.drawn_w) > Number(ds.cnc.drawn_h), 'drawn lying down — the size rule would turn it');
  assert.equal(sheetTurn({ ...ds, cnc: { ...ds.cnc, grain: undefined } }), 90, 'the old rule’s answer');
  assert.equal(sheetTurn(ds), 0, '…and the statement’s, which beats it');
  // A part that states nothing is asked exactly the question it was asked
  // yesterday, by exactly the code that asked it.
  const partition = deep.panels.find((p) => p.part === 'PARTITION')
    || computeCabinet({ ...defaultParamsFor('WARDROBE', P), unit_num: '01' }, P).panels.find((p) => p.part === 'PARTITION');
  if (partition) {
    assert.equal(partition.cnc?.grain, undefined, 'it states nothing…');
    assert.equal(sheetTurn(partition), 90, '…and the drawn size answers, as it always did');
  }
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
    // RE-PINNED 17.08.2026 (CLAUDE.md T37-F7): 'v' → 'u'. The statement is
    // unchanged on both pieces; it is now read in the drawn frame it was
    // written in, so both figures run left-to-right. The point of the test —
    // that a fix shelf and an adjustable one are the SAME piece about this —
    // is untouched, which is why both still assert the same letter.
    assert.equal(decorMapping(s.box, grainRun(s).lengthMm).grainAxis, 'u');
  }
});
