import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { roofBoards } from '../src/engine/puzzle.js';
import { slopeNoteText } from '../src/engine/cnc/partLabel.js';

// ─── TURN 47 · F3 — THE TOP BOARD IS A ROOF, NOT A LID ──────────────────────
//
// The owner's correction, and it changes the board's whole identity:
//
//   *"boki sa w tym przypadku pod wiencem a nie obok, w tym przypadku jak mamy
//   skosy to wieniec jest na gorze."*
//   *"pionowo lico do boku."*
//   *"wieniec nie moze grubiec."*
//   *"gorny wieniec w tym przypadku nie moze miec dog bonesow."*
//
// And the rejection of T46's answer, by name: *"jak chcesz zeby szafa wygladala
// z wiencem poziomym jak jest skos?"*
//
// ─── THE ARITHMETIC IS RE-DERIVED, NOT RE-READ ──────────────────────────────
//
// Every number below is computed here from β and the span with plain
// trigonometry, and then compared with what the engine published. A test that
// restated the engine's own formula would prove only that the formula is
// spelled the same in two places.

const G = P.board.thickness;
const PARAMS = { ...defaultParamsFor('WARDROBE', P), unit_num: '01' };
const H = PARAMS.height;
const cut = (over) => computeCabinet({ ...PARAMS, ...over }, P);
const tops = (r) => r.panels.filter((p) => p.role === 'top');

// A single 45° run under the carcass at both ends: one board, easy numbers.
const ONE = { slope_cut: { pts: [{ x: 0, y: 2000 }, { x: 600, y: 1400 }], infill: 40 } };

// ═══ IT LIES ON THE SIDES, AND SPANS THE FULL WIDTH ═════════════════════════

test('the board spans the FULL width W, not the W − 2G between the sides', () => {
  const [top] = tops(cut(ONE));
  assert.equal(top.box.x, 0);
  assert.equal(top.box.w, 600, 'wall of the cabinet to wall of the cabinet');
  // The lid it replaces was `internalWidth` — 600 − 2·18 = 564 — and sat at G.
  const lid = computeCabinet(PARAMS, P).panels.find((p) => p.id === 'TOP');
  assert.equal(lid.box.x, G);
  assert.equal(lid.w, 600 - 2 * G);
});

test('…and the SIDES stop under it, by its own vertical footprint', () => {
  const r = cut(ONE);
  const [top] = tops(r);
  const foot = G / Math.cos(Math.PI / 4);
  assert.ok(Math.abs(top.meta.verticalFootprint - foot) < 1e-3, `${top.meta.verticalFootprint}`);
  // BUL's own 18 mm of the ceiling peaks at 2000; it stops `foot` under that.
  assert.ok(Math.abs(r.panels.find((p) => p.id === 'BUL').h - (2000 - foot)) < 1e-3);
  // …and the board's own lowest underside IS the low side's short face, which
  // is what "lies on" means when it is measured rather than asserted.
  assert.equal(top.box.y, r.panels.find((p) => p.id === 'BUR').meta.slopeCut.low);
});

// ═══ L, L_MAX AND β ═════════════════════════════════════════════════════════

test('L = W / cos β — the face, side face to side face', () => {
  const [top] = tops(cut(ONE));
  const beta = Math.atan(600 / 600);
  assert.equal(top.meta.slopeCut.deg, 45);
  assert.ok(Math.abs(top.meta.slopeCut.faceLen - 600 / Math.cos(beta)) < 1e-3);
  assert.equal(top.meta.slopeCut.faceLen, 848.5281);
});

test('L_MAX = L + G · tan β — the BLANK, and it is what the cut list says', () => {
  const [top] = tops(cut(ONE));
  const beta = Math.atan(600 / 600);
  const L = 600 / Math.cos(beta);
  const LMAX = L + G * Math.tan(beta);
  assert.ok(Math.abs(top.meta.slopeCut.blankLen - LMAX) < 1e-3);
  assert.equal(top.meta.slopeCut.blankLen, 866.5281);
  // The CUT SIZE — what the sheet gives up and the BOM prices — is the blank.
  assert.equal(top.w, 866.5281);
  assert.equal(top.cnc.drawn_h, 866.5281, 'and the drawn board is the blank too');
});

test('BOTH FACES MEASURE L: the ends are cut VERTICALLY, so it is a parallelogram', () => {
  // *"pionowo lico do boku."* A vertical end cut offsets the two faces along
  // the board by `G · tan β` and leaves their LENGTHS equal — which is exactly
  // why L_MAX − L is that offset and not something else.
  const [top] = tops(cut(ONE));
  const { faceLen, blankLen, deg } = top.meta.slopeCut;
  assert.ok(Math.abs((blankLen - faceLen) - G * Math.tan((deg * Math.PI) / 180)) < 1e-6);
});

// ═══ IT IS 18 mm, PERPENDICULAR, AND IT DOES NOT THICKEN ════════════════════

test('THICKNESS IS G, PERPENDICULAR, at every angle — "wieniec nie moze grubiec"', () => {
  for (const [y1, label] of [[1900, 'shallow'], [1400, '45°'], [400, 'steep']]) {
    const [top] = tops(cut({ slope_cut: { pts: [{ x: 0, y: 2000 }, { x: 600, y: y1 }], infill: 40 } }));
    assert.equal(top.thickness, G, `${label}: the board is 18 and stays 18`);
  }
});

test('…and the VERTICAL FOOTPRINT is G / cos β — carried as clearance, never as thickness', () => {
  for (const y1 of [1900, 1400, 400]) {
    const [top] = tops(cut({ slope_cut: { pts: [{ x: 0, y: 2000 }, { x: 600, y: y1 }], infill: 40 } }));
    const beta = Math.atan((2000 - y1) / 600);
    assert.ok(Math.abs(top.meta.verticalFootprint - G / Math.cos(beta)) < 1e-3);
    assert.notEqual(top.thickness, top.meta.verticalFootprint, 'the two are never the same field');
    // The 3-D box's `h` is the board's vertical ENVELOPE — its footprint plus
    // its rise — and not its thickness either.
    assert.ok(Math.abs(top.box.h - (top.meta.verticalFootprint + (2000 - y1))) < 1e-3);
  }
  // A LEVEL board's footprint is exactly G, which is what makes the flat
  // segment the ordinary board this engine has always cut.
  const flat = roofBoards({ pts: [{ x: 0, y: 1800 }, { x: 600, y: 1800 }] }, { h: H, G });
  assert.equal(flat[0].vertical, G);
  assert.equal(flat[0].blankLen, 600);
});

// ═══ NO DOG BONES ═══════════════════════════════════════════════════════════

test('NO DOG BONES ON THAT BOARD — and no tabs either: the blank is a rectangle', () => {
  const [top] = tops(cut(ONE));
  assert.deepEqual(top.cnc.outline, [[0, 0], [550, 0], [550, 866.5281], [0, 866.5281]]);
  assert.equal(top.cnc.pockets.length, 0, 'not one pocket, so not one dog bone');
  assert.equal(top.cnc.holes.length, 0);
  // The LID it replaces carried both, and still does on an uncut cabinet.
  const lid = computeCabinet(PARAMS, P).panels.find((p) => p.id === 'TOP');
  assert.ok(lid.cnc.pockets.some((k) => k.layer === P.puzzle.layers.dogbone));
  assert.ok(lid.cnc.outline.length > 4, 'and its tabs');
});

test('the sides still carry the socket row the board lands on', () => {
  // F3: *"the top's sockets sit where the roof board lands, on the angled
  // edge."* The board has no tab, so this row is the register it is screwed and
  // glued down onto — but it MOVES with the board, which is the rule.
  const r = cut(ONE);
  for (const id of ['BUL', 'BUR']) {
    const p = r.panels.find((q) => q.id === id);
    const rows = p.cnc.pockets
      .filter((k) => k.layer === P.puzzle.layers.socket)
      .map((k) => Math.max(k.y1, k.y2));
    assert.ok(rows.some((y) => Math.abs(y - (p.h + P.puzzle.socketOvershoot)) < 1e-3),
      `${id}: the row is at the board's landing — saw ${rows.join(', ')}`);
  }
});

// ═══ ONE BOARD PER SEGMENT ══════════════════════════════════════════════════

test('ONE BOARD PER SEGMENT — a board does not bend at a knee', () => {
  const r = cut({
    width: 900,
    slope_cut: { pts: [{ x: 0, y: 2000 }, { x: 300, y: 2000 }, { x: 900, y: 1400 }], infill: 40 },
  });
  const boards = tops(r);
  assert.equal(boards.length, 2);
  assert.deepEqual(boards.map((p) => p.id), ['TOP-1', 'TOP-2'], 'left to right');
  assert.deepEqual(boards.map((p) => p.meta.slopeCut.deg), [0, 45], 'each with its own β');
  assert.deepEqual(boards.map((p) => p.meta.slopeCut.span), [300, 600]);
  assert.deepEqual(boards.map((p) => p.meta.slopeCut.blankLen), [300, 866.5281]);
  // Between them they span the whole width, edge to edge, with no gap and no
  // overlap — a roof with a hole in it is not a roof.
  assert.equal(boards[0].box.x, 0);
  assert.equal(boards[0].box.x + boards[0].box.w, boards[1].box.x);
  assert.equal(boards[1].box.x + boards[1].box.w, 900);
});

test('…and a ceiling that bends twice makes THREE', () => {
  const r = cut({
    width: 1200,
    slope_cut: {
      pts: [{ x: 0, y: 1600 }, { x: 300, y: 2000 }, { x: 900, y: 2000 }, { x: 1200, y: 1500 }],
      infill: 40,
    },
  });
  const boards = tops(r);
  assert.deepEqual(boards.map((p) => p.id), ['TOP-1', 'TOP-2', 'TOP-3']);
  assert.equal(boards[1].meta.slopeCut.deg, 0, 'the middle one is the flat run');
  assert.ok(boards[0].meta.slopeCut.deg > 0);
  assert.ok(boards[2].meta.slopeCut.deg > 0);
});

test('ONE segment keeps the plain `TOP` every cut list already speaks', () => {
  const boards = tops(cut(ONE));
  assert.equal(boards.length, 1);
  assert.equal(boards[0].id, 'TOP');
});

// ═══ THE BLANK IS A RECTANGLE AND THE BEVEL IS AN ANNOTATION ════════════════

test('the BLANK is a rectangle L_MAX × depth, and the bevel is stated in words', () => {
  const [top] = tops(cut(ONE));
  assert.equal(top.cnc.outline.length, 4, 'a rectangle — a 3-axis file can cut this');
  assert.deepEqual(top.meta.bevel, { deg: 45, ends: 'both', axis: '5-AXIS' });
  assert.equal(slopeNoteText(top), 'BEVEL 45.0° BOTH ENDS · 5-AXIS');
  assert.equal(slopeNoteText(top, { ascii: true }), 'BEVEL 45.0 DEG BOTH ENDS - 5-AXIS');
});

test('a LEVEL board carries no bevel note at all', () => {
  const r = cut({
    width: 900,
    slope_cut: { pts: [{ x: 0, y: 2000 }, { x: 300, y: 2000 }, { x: 900, y: 1400 }], infill: 40 },
  });
  const [flat, sloped] = tops(r);
  assert.equal(flat.meta.bevel, undefined);
  assert.equal(slopeNoteText(flat), '');
  assert.equal(slopeNoteText(sloped), 'BEVEL 45.0° BOTH ENDS · 5-AXIS');
});

// ═══ THE LID DOES NOT SURVIVE BEHIND A FLAG ═════════════════════════════════

test('T46\'s flat lid is GONE — no input brings it back', () => {
  // CLAUDE.md licence 2: *"The old behaviour does not survive behind a flag;
  // the owner rejected it by name."*
  for (const over of [ONE, { slope_cut: { y0: 2400, y1: 1200, infill: 40 } }]) {
    for (const top of tops(cut(over))) {
      assert.equal(top.meta.slopeCut.roof, true);
      assert.equal(top.meta.slopeCut.level !== undefined && top.meta.slopeCut.roof !== true, false);
      assert.notEqual(top.box.x, G, 'never between the sides');
    }
  }
  // …and with NO cut the level board is exactly the one it always was.
  const plain = computeCabinet(PARAMS, P).panels.find((p) => p.id === 'TOP');
  assert.equal(plain.box.y, H - G);
  assert.equal(plain.meta, undefined);
});

// ═══ THE ROOF LINE IS THE CUT LINE, CAPPED ══════════════════════════════════

test('the roof over a PENTAGON is two boards: the flat top, then the fall', () => {
  const r = cut({ slope_cut: { y0: 2400, y1: 1200, infill: 40 } });
  const boards = tops(r);
  assert.equal(boards.length, 2);
  // The cut line crosses H = 2150 at x = 125 — the pentagon's own knee, and the
  // same 125 the BACK's outline carries.
  assert.equal(boards[0].meta.slopeCut.to, 125);
  assert.equal(boards[1].meta.slopeCut.from, 125);
  const back = r.panels.find((p) => p.id === 'BACK');
  assert.ok(back.cnc.outline.some(([x, y]) => x === 125 && y === H),
    'the board and the outline agree, because they are the same walk');
  assert.equal(boards[0].meta.slopeCut.deg, 0, 'level under the flat ceiling');
  assert.equal(boards[1].meta.slopeCut.deg, 63.4349);
});
