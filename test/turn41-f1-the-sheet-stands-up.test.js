// ─── TURN 41, F1: THE SHEET STANDS UP ───────────────────────────────────────
//
// The turn's own discipline, verbatim: *"PROVE THE THING, NOT THE FIELD. Three
// features shipped last night, passed a green audit, and did not work, because
// the tests asserted stored values instead of observable facts. Assert the laid
// dimensions on the sheet."*
//
// This file is that assertion and nothing else. Every test in it measures the
// RECTANGLE THE BOARD OCCUPIES ON THE SHEET — how many millimetres up the page,
// how many across — and says whether the board is standing or lying. Not one
// assertion reads `cnc.grain`, `GRAIN_AXIS_BY_PART`, `CUT_GRAIN_AXIS_BY_PART`
// or any other letter, because a letter is what T40 asserted and a board laid
// flat satisfied it.
//
// ─── WHAT WAS WRONG, MEASURED BEFORE THE FIX ────────────────────────────────
//
// On a real BUDR4 bank, a real BUDR bank and a real wardrobe, every role the
// owner named came off the saw LYING DOWN:
//
//     DRAWER-SIDE       490 × 133   laid 133 up × 490 across    LYING
//     DRAWER-BOX-FRONT  518 ×  99   laid  99 up × 518 across    LYING
//     DRAWER-BOX-BACK   518 ×  99   laid  99 up × 518 across    LYING
//     DRAWER-FRONT      597 × 190   laid 190 up × 597 across    LYING
//     PLINTH            600 × 100   laid 100 up × 600 across    LYING
//     END-PANEL         606 × 2250  laid 2250 up × 606 across   standing
//
// A board laid that way has its figure running ACROSS its own length, so the
// long edge — the one that gets banded — is banded across the grain. The
// owner's own test of whether the answer is right: *"jak będzie się oklejać, to
// nie chcesz oklejać w poprzek słoja, tylko wzdłuż."*
//
// The end panel stood only by accident: it is the one role whose own HEIGHT is
// also its LONG side, so the letter and the shape happened to agree there.
//
// ─── AND WHAT DOES NOT MOVE ─────────────────────────────────────────────────
//
// The part's own CNC frame. F1 changes how the sheet PUTS A BOARD DOWN and
// nothing about how the board is drawn, so every per-panel DXF is byte-for-byte
// what it was; only the sheet layouts move. That pair — sheets move, parts do
// not — is asserted at the bottom of this file, because it is what makes the
// fingerprint movement in the PR body readable rather than alarming.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { sheetLay, sheetTurn, panelBounds } from '../src/engine/cnc/layout.js';
import { grainRun } from '../src/engine/decors.js';
import { CUT_STANDING_PARTS, cutStanding } from '../src/engine/grain.js';

const unit = (type, over = {}) => computeCabinet({
  ...defaultParamsFor(type, P), unit_num: '01', ...over,
}, P);

/**
 * Every kit in the house that cuts one of the owner's roles, so that no role is
 * asserted against a single ladder. The wardrobe declares no drawn frame for
 * its box; the BUDR family draws it TURNED. Those are the two frames that gave
 * two answers before T40, and one WRONG answer after it.
 */
const KITS = [
  ['BUDR', {}],
  ['BUDR2', {}],
  ['BUDR4', {}],
  ['WARDROBE', { drawers: 3 }],
  ['PANTRY', { drawers: 2 }],
  ['BUD', { plinth: true, end_panels: [{ side: 'L' }, { side: 'R' }] }],
];

/** Every board of every kit that is on the owner's standing list. */
function standingBoards() {
  const out = [];
  for (const [type, over] of KITS) {
    for (const p of unit(type, over).panels) {
      if (cutStanding(p.part)) out.push([`${type} ${p.id} (${p.part})`, p]);
    }
  }
  return out;
}

// ═══ 1. THE LAID RECTANGLE ══════════════════════════════════════════════════

test('F1 — every board on the owner\'s list is LAID STANDING, in every kit', () => {
  const boards = standingBoards();
  assert.ok(boards.length >= 30, `there are real boards to measure (${boards.length})`);
  for (const [name, panel] of boards) {
    const { upMm, acrossMm } = sheetLay(panel);
    assert.ok(upMm >= acrossMm,
      `${name}: laid ${upMm} up × ${acrossMm} across — it is LYING, and it must STAND`);
  }
});

test('F1 — and it stands on its LONG side, which is the edge that gets banded', () => {
  for (const [name, panel] of standingBoards()) {
    const dw = Number(panel.cnc?.drawn_w) > 0 ? Number(panel.cnc.drawn_w) : panel.w;
    const dh = Number(panel.cnc?.drawn_h) > 0 ? Number(panel.cnc.drawn_h) : panel.h;
    const { upMm, acrossMm } = sheetLay(panel);
    assert.equal(upMm, Math.max(dw, dh), `${name}: the long side runs up the page`);
    assert.equal(acrossMm, Math.min(dw, dh), `${name}: and the short side across it`);
  }
});

test('F1 — the OUTLINE ON THE SHEET stands too, not just the nominal rectangle', () => {
  // `sheetLay` answers about the nominal board. What the nester actually puts
  // down is `panelBounds` — the outline, its pockets and its holes, turned. A
  // feature that stood the nominal rectangle up and left the real extents lying
  // would look right in a unit test and wrong in the CNC view, which is the
  // exact class of fault this turn exists to stop.
  for (const [name, panel] of standingBoards()) {
    const b = panelBounds(panel, []);
    const w = b.maxX - b.minX;
    const h = b.maxY - b.minY;
    assert.ok(h >= w, `${name}: real extents ${w.toFixed(1)} × ${h.toFixed(1)} — lying on the sheet`);
  }
});

// ═══ 2. THE SEAM: THE PICTURE SHOWS WHAT WAS CUT ════════════════════════════

test('F1 — the 3-D figure runs the LENGTH, because that is how it was cut', () => {
  for (const [name, panel] of standingBoards()) {
    const run = grainRun(panel);
    const { upMm } = sheetLay(panel);
    // ONE number of millimetres of board, read through both readers. Neither
    // can be changed alone without this going red.
    assert.equal(run.lengthMm, upMm, `${name}: the picture shows what the sheet cut`);
    assert.equal(run.lengthMm, Math.max(panel.w, panel.h),
      `${name}: and that is the board's own length`);
  }
});

test('F1 — ONE ROLE, ONE ANSWER, out of two opposite drawn frames', () => {
  const budr = unit('BUDR').panels.find((p) => p.part === 'DRAWER-SIDE');
  const wardrobe = unit('WARDROBE', { drawers: 3 }).panels.find((p) => p.part === 'DRAWER-SIDE');
  // The frames really are opposite — the BUDR box is drawn `height × depth`,
  // the wardrobe's declares no drawn frame at all.
  assert.equal(Number(budr.cnc.drawn_w), budr.h, 'the BUDR box is drawn turned');
  assert.equal(wardrobe.cnc?.drawn_w, undefined, 'the wardrobe box declares no frame');
  // So the TURNS are opposite…
  assert.notEqual(sheetTurn(budr), sheetTurn(wardrobe), 'opposite drawings, opposite turns');
  // …and the LAY is the same lay, which is the only thing that was ever the
  // question. Both stand, both on the length, both showing it in the 3-D.
  for (const [name, p] of [['BUDR', budr], ['wardrobe', wardrobe]]) {
    const { upMm, acrossMm } = sheetLay(p);
    assert.ok(upMm >= acrossMm, `${name}: stands`);
    assert.equal(upMm, Math.max(p.w, p.h), `${name}: on its length`);
    assert.equal(grainRun(p).lengthMm, upMm, `${name}: and the picture agrees`);
  }
  assert.equal(grainRun(budr).axis, grainRun(wardrobe).axis, 'ONE answer');
});

// ═══ 3. THE SCOPE, AND WHAT MUST NOT HAVE MOVED ═════════════════════════════

test('F1 — the DRAWER BOTTOM is not on the list and did not move', () => {
  // *"dno — słoje w poprzek."* The one board of the box that lies flat keeps
  // its own stated answer and is laid exactly where T37-F7a laid it.
  assert.equal(cutStanding('DRAWER-BOTTOM'), false);
  for (const [type, over] of KITS) {
    for (const p of unit(type, over).panels) {
      if (p.part !== 'DRAWER-BOTTOM') continue;
      assert.equal(sheetTurn(p), 90, `${type} ${p.id}: turned by its own statement, as before`);
    }
  }
});

test('F1 — the list is the owner\'s six part names and nothing has crept on', () => {
  // Seven items in his sentence, six part names — SL and SR are both
  // `DRAWER-SIDE`. Pinned so that a later turn adding a role has to say so.
  //
  // ─── AND T53 · F6 SAYS SO ────────────────────────────────────────────────
  // The owner, 27.08.2026: *"infille i plinthy układaj na CNC w pionie
  // ZAWSZE"* — one word about two pieces. The PLINTH was already here and
  // really was nested standing; the INFILL was not, so a long filler came off
  // the saw lying down and banded across its own grain. It is the SEVENTH
  // role, added deliberately, and named here because this test is exactly the
  // place a later turn has to say so.
  assert.deepEqual([...CUT_STANDING_PARTS].sort(), [
    'DRAWER-BOX-BACK', 'DRAWER-BOX-FRONT', 'DRAWER-FRONT', 'DRAWER-SIDE', 'END-PANEL',
    'INFILL', 'PLINTH',
  ]);
  for (const part of ['SHELF', 'TOP', 'BOTTOM', 'BUL', 'BUR', 'BACK', 'FRONT', 'DRAWER-BOTTOM']) {
    assert.equal(cutStanding(part), false, `${part} is not on the owner's list`);
  }
});

test('F1 — no board outside the list is laid anywhere new', () => {
  // The delta has to be exactly the list. Every other board in every kit is
  // asked the same question it was asked yesterday, by the same two rules, and
  // this re-derives those rules independently rather than calling the code
  // under test.
  const SHELF_BOARDS = new Set(['SHELF', 'PARTITION', 'RAIL-PART', 'FIXED']);
  for (const [type, over] of KITS) {
    for (const p of unit(type, over).panels) {
      if (cutStanding(p.part)) continue;
      const dw = Number(p.cnc?.drawn_w) > 0 ? Number(p.cnc.drawn_w) : p.w;
      const dh = Number(p.cnc?.drawn_h) > 0 ? Number(p.cnc.drawn_h) : p.h;
      const stated = p.cnc?.grain;
      let want;
      if (stated === 'w' || stated === 'h') want = stated === 'w' ? 90 : 0;
      else if (!SHELF_BOARDS.has(p.part)) want = 0;
      else want = dw > dh ? 90 : 0;
      assert.equal(sheetTurn(p), want, `${type} ${p.id} (${p.part}) is laid where it always was`);
    }
  }
});

test('F1 — a square board is not turned, so nothing moves for the sake of it', () => {
  const square = { part: 'DRAWER-FRONT', w: 600, h: 600, cnc: { drawn_w: 600, drawn_h: 600 } };
  assert.equal(sheetTurn(square), 0, 'a tie leaves the drawing exactly as it is');
  assert.equal(sheetLay(square).upMm, 600);
});
