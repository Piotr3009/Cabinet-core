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
//
// T54-F1 AMENDED (28.08.2026): the roof no longer rides the CEILING — it rides
// the carcass CUT line, cutReach(x) = ceil(x) − infill / cos β per segment
// (`carcassCutPts`, the mitred offset). Every formula in this file is
// unchanged; the LINE it runs on dropped by the reserve, so the absolute
// heights fell by infill / cos β and a knee between two βs shifted to the
// intersection of the two LOWERED segment lines. The T47 identity above —
// roof, not lid — stands untouched.

const G = P.board.thickness;
const PARAMS = { ...defaultParamsFor('WARDROBE', P), unit_num: '01' };
const H = PARAMS.height;
const cut = (over) => computeCabinet({ ...PARAMS, ...over }, P);
const tops = (r) => r.panels.filter((p) => p.role === 'top');

// A single 45° run under the carcass at both ends: one board, easy numbers.
const ONE = { slope_cut: { pts: [{ x: 0, y: 2000 }, { x: 600, y: 1400 }], infill: 40 } };

// ═══ IT LIES ON THE SIDES, AND SPANS THE FULL WIDTH ═════════════════════════

// Chat-fix 25.08.2026: the box is the LEVEL BOARD (its true faceLen × G) and
// the lean lives in the meta — so a claim about where the board STANDS is
// proved by doing the rotation, the same arithmetic the scene's group does.
const spin = ([x, y], pv, deg) => {
  const a = (deg * Math.PI) / 180;
  const dx = x - pv.x;
  const dy = y - pv.y;
  return [pv.x + dx * Math.cos(a) - dy * Math.sin(a),
    pv.y + dx * Math.sin(a) + dy * Math.cos(a)];
};

test('the board spans the FULL width W, not the W − 2G between the sides', () => {
  const [top] = tops(cut(ONE));
  const pv = top.meta.tilt_pivot;
  const deg = top.meta.tilt_deg;
  // The TOP edge is what hangs on the roof line — spin that, not the underside.
  const [leftX] = spin([top.box.x, top.box.y + top.box.h], pv, deg);
  const [rightX] = spin([top.box.x + top.box.w, top.box.y + top.box.h], pv, deg);
  assert.ok(Math.abs(Math.min(leftX, rightX) - 0) < 1e-3, 'leant, it starts at 0');
  assert.ok(Math.abs(Math.max(leftX, rightX) - 600) < 1e-3, 'wall of the cabinet to wall of the cabinet');
  assert.ok(Math.abs(top.box.w - top.meta.slopeCut.faceLen) < 1e-3, 'and the box IS the board');
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
  // T54-F1 AMENDED (28.08.2026): the side stops under the ROOF LINE, which is
  // now cutReach = ceiling − infill / cos β — over BUL's own 18 mm the line
  // peaks at 2000 − 40/cos 45° = 1943.4315, and it stops `foot` under THAT.
  const reserve = 40 / Math.cos(Math.PI / 4);
  assert.ok(Math.abs(r.panels.find((p) => p.id === 'BUL').h - ((2000 - reserve) - foot)) < 1e-3);
  // …and the leant board's lowest underside IS the low side's short face —
  // the pivot sits on the roof line, and a level board of perpendicular G
  // leant about Z hangs exactly G / cos β below it, vertically.
  assert.ok(Math.abs((top.meta.tilt_pivot.y - foot)
    - r.panels.find((p) => p.id === 'BUR').meta.slopeCut.low) < 1e-3);
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
    // Chat-fix 25.08.2026: the 3-D box is the BOARD (h = G, leant in the
    // scene) — the envelope is gone, and the footprint stays what it always
    // was: a clearance fact, never a box dimension.
    assert.equal(top.box.h, G);
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

test('the sides carry NO socket row under a roof — overruled 25.08.2026', () => {
  // F3 said the row moves to where the board lands. The owner struck it down:
  // *"jak jest skos to dog bonesy znikaja."* The board has no tab, so the row
  // caught nothing and its bones surfaced on a visible edge. Under a roof the
  // row is OFF — the KIT_SINK `edges` flag — and the board is glued and
  // screwed onto the bevel. The law lives beside `SKY:slopeCutPts`.
  const r = cut(ONE);
  for (const id of ['BUL', 'BUR']) {
    const p = r.panels.find((q) => q.id === id);
    const rows = p.cnc.pockets
      .filter((k) => k.layer === P.puzzle.layers.socket)
      .map((k) => Math.max(k.y1, k.y2));
    assert.equal(rows.some((y) => y > p.h - P.board.thickness), false,
      `${id}: no row at the cut edge — saw ${rows.join(', ') || 'none'}`);
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
  // T54-F1 AMENDED (28.08.2026): the boards ride the LOWERED line, and at a
  // knee its vertex is the INTERSECTION of the two lowered segments (the
  // mitred offset), no longer the ceiling's own knee at 300. Re-derived:
  //   flat run lowered by 40/cos 0° = 40           → y = 1960;
  //   raked run lowered by 40/cos 45° = 40√2       → through (300, 1943.4315)
  //     at slope −1, i.e. y = 2300 − 40√2 − x;
  //   1960 = 2300 − 40√2 − x  ⇒  knee x = 340 − 40√2 = 283.4315.
  // So the flat board spans 283.4315, the raked one 900 − 283.4315 = 616.5685
  // of plan, faceLen = 616.5685/cos 45° = 871.9595, blank = + G·tan 45° = 889.9595.
  const kneeX = 340 - 40 * Math.SQRT2; // = 283.43146
  // 01.11.2026 AMENDED (the owner, the knee: *"wyrownanie edga musi byc od
  // srodka, nie od zewnatrz, wiec automatycznie skosna plyta bedzie troszeczke
  // dluzsza"*, *"wariant B, koduj"*): the two boards meet on their
  // UNDERSIDES, not at the knee of their tops. Re-derived: the flat underside
  // is 1960 − 18 = 1942; the raked one hangs 18 / cos 45° = 25.4558 under
  // y = 2243.4315 − x, so it is 1942 at x = 2243.4315 − 25.4558 − 1942 =
  // 275.9757 = kneeX − 18 · tan 22.5°. The flat board spans 275.9757, the raked
  // one 900 − 275.9757 = 624.0243 of plan, faceLen 624.0243 / cos 45° =
  // 882.5037, blank + G · tan 45° = 900.5037. Each keeps its own β.
  const boundary = kneeX - G * Math.tan(Math.PI / 8); // = 275.97562
  assert.deepEqual(boards.map((p) => p.meta.slopeCut.span), [275.9757, 624.0243]);
  assert.deepEqual(boards.map((p) => p.meta.slopeCut.blankLen), [275.9757, 900.5037]);
  // Between them they span the whole width, edge to edge, with no gap and no
  // overlap — a roof with a hole in it is not a roof. The level board is
  // asserted as it stands; the leant one by DOING the rotation (chat-fix
  // 25.08.2026: the box is the level board, the lean is the meta's).
  assert.equal(boards[0].box.x, 0);
  assert.equal(boards[0].box.x + boards[0].box.w, 275.9757, 'the flat board ends where the undersides meet');
  assert.ok(Math.abs(275.9757 - boundary) < 1e-3, '…and 275.9757 IS 340 − 40√2 − 18 · tan 22.5°, re-derived');
  const pv = boards[1].meta.tilt_pivot;
  const topY = boards[1].box.y + boards[1].box.h;
  const [lx] = spin([boards[1].box.x, topY], pv, boards[1].meta.tilt_deg);
  const [rx] = spin([boards[1].box.x + boards[1].box.w, topY], pv, boards[1].meta.tilt_deg);
  assert.ok(Math.abs(Math.min(lx, rx) - boundary) < 1e-3, 'the leant board starts where the undersides meet');
  assert.ok(Math.abs(Math.max(lx, rx) - 900) < 1e-3, '…and ends at the wall');
  // …and the inside is flush: the two undersides at the boundary, equal.
  const flatUnder = boards[0].meta.slopeCut.level;
  const rakedUnder = (2243.4315 - boundary) - G / Math.cos(Math.PI / 4);
  assert.ok(Math.abs(flatUnder - rakedUnder) < 1e-3, `no step inside: ${flatUnder} vs ${rakedUnder}`);
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
  // T54-F1 AMENDED (28.08.2026): the roof line is cutReach capped at H, so the
  // pentagon's knee is where the LOWERED line crosses H — no longer the
  // ceiling's own 125. Re-derived: β = atan 2 ⇒ cos β = 1/√5, reserve =
  // 40√5 = 89.4427; the lowered fall runs 2310.5573 → 1110.5573 and crosses
  // H = 2150 at x = 125 − 20√5 = 80.2786.
  const kneeX = 125 - 20 * Math.sqrt(5); // = 80.27864
  // 01.11.2026 AMENDED (the owner, the knee: *"wariant B, koduj"*; *"plecy
  // musza sie zgadzac"*): the boards meet where their UNDERSIDES meet, the
  // knee less G · tan(β / 2) = 18 · tan 31.7175° = 11.1246, at 69.1540; the
  // back follows them, with the step the two ends make there (H up to the
  // raked board's corner, H + 11.1246 · 2 = 2172.2492).
  const boundary = kneeX - G * Math.tan(Math.atan(2) / 2); // = 69.15403
  assert.ok(Math.abs(boards[0].meta.slopeCut.to - boundary) < 1e-3);
  assert.equal(boards[0].meta.slopeCut.to, boards[1].meta.slopeCut.from,
    'one boundary, shared to the byte');
  const back = r.panels.find((p) => p.id === 'BACK');
  assert.ok(back.cnc.outline.some(([x, y]) => Math.abs(x - boundary) < 1e-3 && y === H)
    && back.cnc.outline.some(([x, y]) => Math.abs(x - boundary) < 1e-3 && Math.abs(y - 2172.2492) < 1e-3),
  'the boards and the back agree: the step at the boundary');
  assert.equal(boards[0].meta.slopeCut.deg, 0, 'level under the flat ceiling');
  assert.equal(boards[1].meta.slopeCut.deg, 63.4349);
});
