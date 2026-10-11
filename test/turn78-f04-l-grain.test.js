// ─── T78 · F4 · THE GRAIN OF THE L SHELVES: THE CUT TURNS, THE 3D FOLLOWS ──
//
// The owner, 11.10.2026: *"na L półkach odwróć na CNC i na wizualizacji słoje
// o 90 stopni."*  Grain has ONE source of truth (T40): the cut decides and the
// 3D shows what was cut. So the F is one field on three boards: `cnc.grain:
// 'w'` stated in the DRAWN frame (T37 F7a) on TOP-L, BOTTOM-L and every SHELF-L
// of the L builder, mirroring KIT_CORNER_L.lsp section 10 (CL:rot90,
// drawCL_LBOARD_ROT90, LISP FIRST), and every reader follows from it:
// `sheetTurn` 90, `sheetLay` axis 'w', `grainRun` along wall A, the nest DXF
// turned through `turnPoint`.
//
// THE PROBE (scratchpad f04-probe.mjs, 11.10.2026, the T78 working tree before
// the patch), the rows it printed:
//
//   board      kit                    w x h    drawn       grain  sheetTurn  sheetLay.axis  3D grainAxis
//   TOP-L      CORNER_L_BASE          864x864  864x864     none   0          h              v (along wall B)
//   BOTTOM-L   CORNER_L_BASE          864x864  864x864     none   0          h              v
//   SHELF-L-1  CORNER_L_BASE          862x862  862x862     none   0          h              v
//   TOP-L      CORNER_L_WALL          564x564  564x564     none   0          h              v
//   SHELF-L-1  CORNER_L_WALL          562x562  562x562     none   0          h              v
//   TOP-L      CORNER_L_WARDROBE      964x964  964x964     none   0          h              v
//   TOP-L      L 1000x800, right      964x764  964x764     none   0          h              v
//   SHELF-L-1  L 1000x800, right      962x762  962x762     none   90 (size)  w              u   <- shelf and top disagree
//   TOP        BUD 600 (beside the L) 564x542  542x564 R   none   0          w              u (along the wall)
//   SHELF-1    BUD 600 (beside the L) 560x522  522x560 R   h      0          w              u
//
// So on the square L of every kit the three L boards had their figure along
// WALL B (axis 'h' = box.d = z), at 90 degrees to the BUD top and shelf beside
// them on wall A (axis 'w' = box.w = x); and on a non-square L the SHELF
// family's size rule (sheetTurn step 3) turned the shelf and left the top: the
// T17 complaint reborn on the L. TOP-L and BOTTOM-L are the same way as the
// shelf, so all three turn (CLAUDE.md F4's parenthesis).
//
// Until scratchpad/patches/f04-cabinet-l-grain.patch is applied to
// src/engine/cabinet.js the engine rows below FAIL (grain undefined, turn 0,
// axis 'h'); the GOLDEN and LISP rows pass in both states.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import {
  layoutPanels, panelBounds, sheetLay, sheetTurn, turnPoint,
} from '../src/engine/cnc/layout.js';
import { sheetEntities } from '../src/engine/cnc/dxf.js';
import {
  DECOR_GRAIN_TEXTURE, decorMapping, grainRun, statedPanelAxis,
} from '../src/engine/decors.js';
import { decorPlacement } from '../src/3d/materials.js';
import { goldenOf } from '../scripts/t75-golden.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const golden = (name) => JSON.parse(read(`fixtures/${name}`));
const KITS = ['CORNER_L_BASE', 'CORNER_L_WALL', 'CORNER_L_WARDROBE'];
const L = (type = 'CORNER_L_BASE', over = {}) => computeCabinet({
  ...defaultParamsFor(type, P), unit_num: 'CL01', doors: true, shelves: 2, ...over,
}, P);
const BUD = () => computeCabinet({
  type: 'BUD', width: 600, height: 770, depth: 560, board_t: 18, front_t: 18, front_type: 'S',
  shelves: 1, doors: true, hinge: 'L', unit_num: '02', plinth: true,
}, P);
const panelOf = (r, id) => r.panels.find((p) => p.id === id);
/** The two picture families of T29 F1: a board scan runs down its V, our own tile along its U. */
const SCAN = { texture: 'oak.jpg', scanAlongGrainMm: 1200 };
const TILE = { texture: DECOR_GRAIN_TEXTURE, repeatMm: 900 };
const L_BOARDS = (r) => r.panels.filter((p) => ['TOP-L', 'BOTTOM-L', 'SHELF-L'].includes(p.meta?.lBoard));
/** The L shapes the law has to hold on: every kit, both hands, square and not. */
const CASES = [
  ['CORNER_L_BASE', {}],
  ['CORNER_L_WALL', {}],
  ['CORNER_L_WARDROBE', {}],
  ['CORNER_L_BASE', { width: 1000, depth: 800, corner_side: 'right' }],
  ['CORNER_L_BASE', { width: 800, depth: 1000, corner_side: 'left' }],
  ['CORNER_L_WALL', { width: 900, depth: 600, corner_side: 'right' }],
];

// ═══ THE STATEMENT: ONE FIELD, THREE BOARDS, THE CNC FRAME UNMOVED ══════════

test('F4 · TOP-L, BOTTOM-L and every SHELF-L state grain w in the drawn frame; the drawn frame is still the plan frame', () => {
  for (const [type, over] of CASES) {
    const r = L(type, over);
    const boards = L_BOARDS(r);
    assert.equal(boards.length, 4, `${type}: TOP-L, BOTTOM-L, SHELF-L-1, SHELF-L-2`);
    for (const p of boards) {
      assert.equal(p.cnc.grain, 'w', `${type} ${p.id}: the drawn width goes up the sheet`);
      // T17 F3: the placement turns, the part does not.
      assert.equal(p.cnc.rotated, false, `${p.id}: the CNC frame is not re-drawn`);
      assert.equal(p.cnc.drawn_w, p.w, `${p.id}: drawn width is the span along wall A`);
      assert.equal(p.cnc.drawn_h, p.h, `${p.id}: drawn height is the span along wall B`);
    }
    // ...and the statement lands on the three L boards only.
    const stated = r.panels.filter((p) => p.cnc?.grain === 'w').map((p) => p.id);
    assert.deepEqual(stated, ['TOP-L', 'BOTTOM-L', 'SHELF-L-1', 'SHELF-L-2'], `${type}: nothing else says w`);
  }
  // The shelf's own outline is T75's, to the millimetre (section 9 of the LISP).
  const shelf = panelOf(L('CORNER_L_BASE', { shelves: 1 }), 'SHELF-L-1');
  assert.deepEqual(shelf.cnc.outline, [[0, 0], [862, 0], [862, 520], [520, 520], [520, 862], [0, 862]]);
  assert.equal(shelf.area_m2, 0.62608);
});

// ═══ THE CUT: THE SHEET TURNS THE THREE, WHATEVER THEIR PROPORTIONS ═════════

test('F4 · the sheet turns every L board 90: sheetTurn, sheetLay, panelBounds and the layout agree, square or not, either hand', () => {
  for (const [type, over] of CASES) {
    const r = L(type, over);
    const layout = layoutPanels(r.panels, r.drills, { gap: 50, rowWidth: 6000 });
    for (const p of L_BOARDS(r)) {
      const tag = `${type} ${JSON.stringify(over)} ${p.id}`;
      assert.equal(sheetTurn(p), 90, `${tag}: turned`);
      assert.deepEqual(sheetLay(p), {
        turn: 90, upMm: p.w, acrossMm: p.h, axis: 'w',
      }, `${tag}: the wall-A span runs up the page`);
      assert.equal(panelBounds(p, r.drills).turn, 90, `${tag}: the bounds are the turned blank's`);
      const place = layout.places.find((pl) => pl.panel.id === p.id);
      assert.ok(place, `${tag}: on the sheet`);
      assert.equal(place.bounds.turn, 90, `${tag}: laid turned`);
    }
    // The size rule used to decide a non-square shelf; the statement decides now,
    // so the shelf and the top of one L can no longer disagree.
    const top = panelOf(r, 'TOP-L');
    const shelf = panelOf(r, 'SHELF-L-1');
    assert.equal(sheetLay(top).axis, sheetLay(shelf).axis, `${type}: the top and the shelf lie the same way`);
  }
});

// ═══ THE 3D: WHAT WAS CUT, AND THE SAME WAY AS THE BUD BESIDE THE L ═════════

test('F4 · the 3D shows what was cut: the figure runs along wall A, the axis a BUD shelf and top have on that wall', () => {
  const bud = BUD();
  const budShelf = grainRun(panelOf(bud, 'SHELF-1'));
  const budTop = panelOf(bud, 'TOP');
  assert.equal(budShelf.axis, 'w', 'a BUD shelf runs along the cabinet width (T28 F7, T40)');
  assert.equal(grainRun(budTop).axis, 'w', 'a BUD top runs along the cabinet width');
  for (const [type, over] of CASES) {
    const r = L(type, over);
    for (const p of L_BOARDS(r)) {
      const tag = `${type} ${JSON.stringify(over)} ${p.id}`;
      const run = grainRun(p);
      assert.equal(run.axis, 'w', `${tag}: the figure runs along wall A`);
      assert.equal(run.lengthMm, p.w, `${tag}: the length along the grain is the wall-A span`);
      assert.equal(run.acrossMm, p.h, tag);
      // decorMapping: u runs along box.w (x, wall A) on the big ±Y face. The
      // cut's axis goes with the length (3d/materials.js decorPlacement does
      // the same), because at every default the L board is SQUARE and a
      // length alone cannot tell its two face axes apart (the T78 F4 finding:
      // the tie fell to 'v', along wall B, whatever the sheet did).
      assert.equal(decorMapping(p.box, run.lengthMm, run.axis).grainAxis, 'u', `${tag}: painted along x`);
      assert.equal(run.axis, budShelf.axis, `${tag}: the same way as the BUD shelf on wall A`);
      // ...and the scene's own placement turns the picture exactly as it turns
      // it on the BUD top standing beside the L, for both picture families.
      for (const surface of [TILE, SCAN]) {
        assert.equal(decorPlacement(surface, p, P).rotate, decorPlacement(surface, budTop, P).rotate,
          `${tag}: the same quarter turn as the BUD top (${surface.texture})`);
      }
      // T40's cross-frame witness: the statement and the cut agree.
      assert.equal(statedPanelAxis(p), sheetLay(p).axis, `${tag}: the piece says what the cut does`);
    }
  }
  // The square face, in isolation: size cannot decide, the axis does, and a
  // rectangle is answered by size exactly as before.
  assert.equal(decorMapping({ w: 864, h: 18, d: 864 }, 864).grainAxis, 'v', 'no axis: the old tie-break');
  assert.equal(decorMapping({ w: 864, h: 18, d: 864 }, 864, 'h').grainAxis, 'v');
  assert.equal(decorMapping({ w: 864, h: 18, d: 864 }, 864, 'w').grainAxis, 'u');
  assert.equal(decorMapping({ w: 560, h: 18, d: 520 }, 520, 'w').grainAxis, 'v', 'a rectangle: size wins, the axis is not asked');
  assert.equal(decorMapping({ w: 560, h: 18, d: 520 }, 560, 'h').grainAxis, 'u');
});

// ═══ THE NEST DXF: THE BLANK TURNS THROUGH turnPoint, WHICH IS CL:rot90 ═════

test('F4 · the nest DXF lays the L blank turned: the wall-A span up the page, and the points are the LISP\'s CL:rot90', () => {
  const r = L('CORNER_L_BASE', { width: 1000, depth: 800, corner_side: 'right', shelves: 1 });
  const outlineLayer = P.puzzle.layers.outline;
  const rot90 = (pts, spanY) => pts.map(([x, y]) => [spanY - y, x]);

  // SHELF-L (no tabs): the nest's shift is +spanY exactly.
  const shelf = panelOf(r, 'SHELF-L-1');
  assert.deepEqual([shelf.w, shelf.h], [962, 762]);
  const spanY = shelf.cnc.outline[5][1];
  assert.equal(spanY, 762);
  let layout = layoutPanels([shelf], r.drills, { gap: 50, rowWidth: 6000 });
  let ents = sheetEntities({
    panels: [shelf], drills: r.drills, layout, unitNum: r.unitNum, profile: P,
  });
  let poly = ents.find((e) => e.type === 'poly' && e.layer === outlineLayer);
  assert.ok(poly, 'the shelf outline is on the sheet');
  assert.deepEqual(poly.pts, rot90(shelf.cnc.outline, spanY), 'the LISP section 10 worked example, on the sheet');
  assert.deepEqual(poly.pts, [[762, 0], [762, 962], [242, 962], [242, 520], [0, 520], [0, 0]]);
  const xs = poly.pts.map((q) => q[0]);
  const ys = poly.pts.map((q) => q[1]);
  assert.equal(Math.max(...xs) - Math.min(...xs), 762, 'across the page: the wall-B span');
  assert.equal(Math.max(...ys) - Math.min(...ys), 962, 'up the page: the wall-A span, along the grain');
  // ...and turnPoint IS CL:rot90Pt before the shift.
  for (const [x, y] of shelf.cnc.outline) {
    const [tx, ty] = turnPoint(x, y, 90);
    assert.deepEqual([tx + spanY, ty], [spanY - y, x]);
  }

  // TOP-L (tabs G proud on both axes): the LISP lays it G in on both axes.
  const top = panelOf(r, 'TOP-L');
  const G = top.thickness;
  const spanYTop = top.w === 964 ? 764 : null;
  assert.equal(spanYTop, 764);
  layout = layoutPanels([top], r.drills, { gap: 50, rowWidth: 6000 });
  ents = sheetEntities({
    panels: [top], drills: r.drills, layout, unitNum: r.unitNum, profile: P,
  });
  poly = ents.find((e) => e.type === 'poly' && e.layer === outlineLayer);
  assert.ok(poly);
  assert.equal(poly.pts.length, 86, 'the whole tabbed outline turns');
  assert.deepEqual(poly.pts, top.cnc.outline.map(([x, y]) => [spanYTop + G - y, G + x]),
    'drawCL_LBOARD_ROT90 at (cncX + G, cncY + G)');
});

// ═══ WHAT DOES NOT MOVE: THE CUT LIST, THE AREA, THE THREE GOLDENS ══════════

test('F4 · the cut list row, the area and the three L goldens hold: the summary carries no lay', () => {
  for (const name of ['golden-corner-l-base.json', 'golden-corner-l-wall.json', 'golden-corner-l-wardrobe.json']) {
    const file = golden(name);
    assert.deepEqual(goldenOf(file.params, P), file.expected, `${name} moved`);
  }
  const base = golden('golden-corner-l-base.json');
  const r = computeCabinet(base.params, P);
  assert.ok(r.csvLines.includes('01,SHELF-L-1,862,862,>,0.68,0.626'), 'the CSV has no grain column');
  assert.ok(r.csvLines.includes('01,TOP-L,864,864,>,0.65,0.642'));
  // The ordinary shelf and the drawer bottom are untouched by this F.
  const bud = BUD();
  assert.equal(panelOf(bud, 'SHELF-1').cnc.grain, 'h', 'T26 F8 / T28 F7, untouched');
  assert.equal(sheetTurn(panelOf(bud, 'SHELF-1')), 0);
  assert.equal(sheetTurn(panelOf(bud, 'TOP')), 0);
});

// ═══ LISP IS LAW: SECTION 10, THE ROUTINES, THE COMMAND ════════════════════

test('LISP · KIT_CORNER_L.lsp section 10: the owner\'s words, CL:rot90, drawCL_LBOARD_ROT90, and the command turns all three boards', () => {
  const lsp = read('reference/lisp/KIT_CORNER_L.lsp');
  assert.ok(lsp.includes('10. THE GRAIN OF THE L BOARDS (T78 F4, LISP FIRST)'));
  assert.ok(lsp.includes('"na L polkach odwroc na CNC i na wizualizacji sloje o 90 stopni"'), 'the owner\'s words');
  for (const defun of ['CL:rot90Pt', 'CL:rot90 ', 'CL:rot90Rect', 'drawCL_LBOARD_ROT90']) {
    assert.ok(lsp.includes(`(defun ${defun}`), defun);
  }
  assert.ok(lsp.includes('(defun drawCL_LBOARD '), 'the unturned routine is kept, not deleted');
  // The command: TOP-L, BOTTOM-L and the SHELF-L loop go through the turned routine, nothing through the old one.
  const command = lsp.slice(lsp.indexOf('(defun c:CORNER_L_FULL'));
  assert.equal((command.match(/\(drawCL_LBOARD_ROT90 /g) || []).length, 3, 'TOP-L, BOTTOM-L, SHELF-L');
  assert.equal((command.match(/\(drawCL_LBOARD /g) || []).length, 0, 'no L board is drawn unturned');
  // The turned board's across-the-page advance is spanY (v5's y), not spanX.
  assert.ok(command.includes('(setq cncX (+ cncX (cadr (nth 5 nomTop)) G odstep))'));
  assert.ok(command.includes('(setq cncX (+ cncX (cadr (nth 5 nomShelf)) odstep))'));
  assert.ok(!command.includes('(car (nth 1 nomTop)) G odstep'), 'the old advance is gone');
  // The LISP's worked example is the engine's arithmetic: CL:rot90Pt (x y) -> (spanY - y, x).
  const nominal = [[0, 0], [862, 0], [862, 520], [520, 520], [520, 862], [0, 862]];
  const turned = nominal.map(([x, y]) => [862 - y, x]);
  assert.deepEqual(turned, [[862, 0], [862, 862], [342, 862], [342, 520], [0, 520], [0, 0]]);
  assert.ok(lsp.includes('turns to (862 0) (862 862) (342 862) (342 520) (0 520)'));
  for (const [x, y] of nominal) assert.deepEqual(turnPoint(x, y, 90), [-y || 0, x], 'turnPoint is CL:rot90Pt before the shift');
  // No em or en dash in anything written this turn.
  const section = lsp.slice(lsp.indexOf('10. THE GRAIN OF THE L BOARDS'), lsp.indexOf(';;; Auto-load COMMON'));
  const dashes = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
  assert.ok(!dashes.test(section), 'section 10 carries no em or en dash');
});
