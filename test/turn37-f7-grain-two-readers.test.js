// ─── TURN 37 F7 — GRAIN, THE TWO READERS ────────────────────────────────────
//
// The owner, with a screenshot of a nest of drawer parts lying flat, and his
// nose for which half of a pair is lying: *"CNC jest ok, ale wizualizacja nie
// jest — sprawdź, co ci nadpisuje."*
//
// ONE FIELD, `cnc.grain`. TWO READERS, and they had drifted apart in opposite
// directions:
//
//   THE SHEET   `engine/cnc/layout.js sheetTurn` turned a part by its SIZE, and
//               asked the question only of four part NAMES. It had never heard
//               of `cnc.grain` at all — so every board that states its grain
//               and is drawn across it (the drawer bottoms, the shoe box's
//               boards) was nested with its figure lying across the page.
//
//   THE 3D      `engine/decors.js grainRun` DID read the field, and read it in
//               the wrong frame. `cnc.grain` is written inside the `cnc` block,
//               beside `drawn_w` and `drawn_h`, and it means what it says in
//               THAT frame — the CNC DRAWN frame. `grainRun` used it as if it
//               named the panel's own `w`/`h`. On a shelf, drawn `530 × 560`
//               with grain 'h', it resolved 530 = the DEPTH and painted the
//               figure front-to-back on every shelf in the app.
//
// CLAUDE.md T37-F7: *"Cross-frame tests are the point: for the same panels
// (shelf, drawer side, drawer front, plinth) one test asserts the SHEET lay and
// another the 3D figure axis, from the same stated field — so the two readers
// can never drift apart silently again."*
//
// ─── THE INVARIANT THIS FILE EXISTS FOR ─────────────────────────────────────
//
// Written as one sentence in millimetres of board, which is the only form both
// readers can be held to at once:
//
//     THE MILLIMETRES THAT RUN UP THE SHEET ARE THE MILLIMETRES THE FIGURE
//     RUNS ALONG IN THE ROOM.
//
// The sheet says it by turning the drawn frame; the 3D says it by naming an
// axis of the panel frame. They are two descriptions of one board, and if
// either reader is ever changed alone the two numbers stop being equal — which
// is the drift, caught as a number rather than as a letter.
//
// Every panel below comes out of a real `computeCabinet()`; nothing here is a
// hand-built literal, because a literal cannot drift with the engine.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { decorMapping, grainRun } from '../src/engine/decors.js';
import { sheetTurn } from '../src/engine/cnc/layout.js';

const unit = (type, over = {}) => computeCabinet({
  ...defaultParamsFor(type, P), unit_num: '01', ...over,
}, P);
const partOf = (r, part) => r.panels.find((p) => p.part === part) || null;

/** The CNC drawn frame of a panel — its own `w × h` when it declares none. */
function drawnFrame(panel) {
  const dw = Number(panel.cnc?.drawn_w) > 0 ? Number(panel.cnc.drawn_w) : panel.w;
  const dh = Number(panel.cnc?.drawn_h) > 0 ? Number(panel.cnc.drawn_h) : panel.h;
  return { dw, dh };
}

/**
 * How the drawn frame stands to the panel frame: 'same' or 'turned'.
 *
 * By SIZE, not by `cnc.rotated` — size is the fact and the flag is a claim
 * about it. This is the same test `decors.js statedPanelAxis` makes, written
 * out here independently so the test does not agree with the implementation by
 * importing it.
 */
function frameRelation(panel) {
  const { dw, dh } = drawnFrame(panel);
  if (Math.abs(dw - panel.w) < 0.5 && Math.abs(dh - panel.h) < 0.5) return 'same';
  if (Math.abs(dw - panel.h) < 0.5 && Math.abs(dh - panel.w) < 0.5) return 'turned';
  return 'other';
}

/**
 * The four panels CLAUDE.md names, plus the two that carry the rest of F7's
 * delta — every one lifted out of a real cabinet.
 */
function subjects() {
  const bud = unit('BUD', { shelves: 1, plinth: true });
  const budr = unit('BUDR');
  return [
    ['SHELF', partOf(bud, 'SHELF'), 'drawn `depth × width` since turn 26 F8'],
    ['DRAWER-SIDE', partOf(budr, 'DRAWER-SIDE'), 'drawn `height × depth`, turn 12\'s own frame'],
    ['DRAWER-FRONT', partOf(budr, 'DRAWER-FRONT'), 'drawn in its own frame — no translation to do'],
    ['PLINTH', partOf(bud, 'PLINTH'), 'drawn in its own frame — no translation to do'],
    ['DRAWER-BOX-FRONT', partOf(budr, 'DRAWER-BOX-FRONT'), 'the box\'s own turned frame'],
    ['DRAWER-BOTTOM', partOf(budr, 'DRAWER-BOTTOM'), 'the one that states `w` — "dno, słoje w poprzek"'],
  ];
}

// ═══ 1. THE SHEET ═══════════════════════════════════════════════════════════

test('F7a THE SHEET — a stated grain is laid running UP the page', () => {
  for (const [name, panel, why] of subjects()) {
    assert.ok(panel, `${name} is in the cabinet`);
    const stated = panel.cnc?.grain;
    assert.ok(stated === 'w' || stated === 'h', `${name} states an axis (${why})`);
    const { dw, dh } = drawnFrame(panel);
    // `cnc.grain` names an axis of the DRAWN frame. At turn 0 the drawn h is up
    // the page, so 'h' is already standing and 'w' is lying down and wants 90.
    const turn = sheetTurn(panel);
    assert.equal(turn, stated === 'w' ? 90 : 0,
      `${name}: drawn ${dw} × ${dh}, states '${stated}' — the drawn `
      + `${stated === 'w' ? 'WIDTH' : 'HEIGHT'} has to end up the page, so turn ${stated === 'w' ? 90 : 0}`);
    // …said as millimetres rather than as a letter: after the turn, the extent
    // standing up the page IS the one the piece states its grain along.
    const alongMm = stated === 'w' ? dw : dh;
    const upTheSheetMm = turn === 90 ? dw : dh;
    assert.equal(upTheSheetMm, alongMm,
      `${name}: ${alongMm} mm of grain up the sheet`);
  }
});

// ═══ 2. THE 3D ══════════════════════════════════════════════════════════════

test('F7b THE 3D — the stated axis is translated out of the DRAWN frame first', () => {
  for (const [name, panel, why] of subjects()) {
    const stated = panel.cnc.grain;
    const { dw, dh } = drawnFrame(panel);
    const relation = frameRelation(panel);
    assert.notEqual(relation, 'other', `${name}: the drawn frame is the panel frame or its turn (${why})`);
    // THE TRANSLATION, spelled out: the drawn frame is either the panel frame
    // or the panel frame turned, and when it is turned the two axes trade
    // places along with it.
    const wantAxis = relation === 'turned' ? (stated === 'w' ? 'h' : 'w') : stated;
    const run = grainRun(panel);
    assert.equal(run.axis, wantAxis,
      `${name}: drawn ${dw} × ${dh} is the panel frame ${relation === 'turned' ? 'TURNED' : 'ITSELF'} `
      + `(${panel.w} × ${panel.h}), so the stated '${stated}' is the panel's '${wantAxis}'`);
    assert.equal(run.lengthMm, wantAxis === 'w' ? panel.w : panel.h, `${name}: along the grain`);
    assert.equal(run.acrossMm, wantAxis === 'w' ? panel.h : panel.w, `${name}: across it`);
  }
});

// ═══ 3. THE TWO READERS, ON ONE BOARD ═══════════════════════════════════════

test('F7 THE TWO READERS AGREE — the mm up the sheet are the mm the figure runs along', () => {
  // This is the assertion the feature exists for. It reads the SAME stated
  // field through both readers and compares the answers as one number of
  // millimetres of board, so neither reader can be changed alone without this
  // going red — and neither can be changed to agree by weakening, because the
  // number is the board's own size.
  for (const [name, panel] of subjects()) {
    const stated = panel.cnc.grain;
    const { dw, dh } = drawnFrame(panel);
    const upTheSheetMm = sheetTurn(panel) === 90 ? dw : dh;
    const alongTheFigureMm = grainRun(panel).lengthMm;
    assert.equal(alongTheFigureMm, upTheSheetMm,
      `${name}: the sheet stands ${upTheSheetMm} mm up the page and the 3D runs `
      + `${alongTheFigureMm} mm along the figure — one board, one statement ('${stated}')`);
  }
});

test('F7 …and on the SHELF, which is CLAUDE.md’s own worked example', () => {
  const shelf = partOf(unit('BUD', { shelves: 1 }), 'SHELF');
  // The example, in its own numbers: drawn 520 × 560, grain 'h' — and the 560
  // is the cabinet's WIDTH, not its depth.
  assert.equal(shelf.w, 560);
  assert.equal(shelf.h, 520);
  assert.equal(shelf.cnc.drawn_w, 520, 'x spans the depth');
  assert.equal(shelf.cnc.drawn_h, 560, 'y spans the width');
  assert.equal(shelf.cnc.grain, 'h', 'stated in the DRAWN frame — the 560');
  // THE SHEET: already standing, so nothing to turn.
  assert.equal(sheetTurn(shelf), 0);
  // THE 3D: 'h' in a turned drawn frame is 'w' in the panel's own.
  assert.equal(grainRun(shelf).axis, 'w');
  assert.equal(grainRun(shelf).lengthMm, 560);
  // …and the figure lands left-to-right on the board's big face, which is the
  // picture the owner asked for: the same direction as the wieniec above it.
  assert.equal(decorMapping(shelf.box, grainRun(shelf).lengthMm).grainAxis, 'u');
  // The fault this replaces, named as the number it used to produce: 530/520 —
  // the DEPTH — read out of a field that never said depth.
  assert.notEqual(grainRun(shelf).lengthMm, shelf.h, 'no longer the depth');
});

// ═══ 4. THE PARTS THAT STATE NOTHING KEEP THE OLD RULE ══════════════════════

test('F7 a part that states nothing is answered exactly as it was yesterday', () => {
  const r = unit('WARDROBE', { shelves: 2 });
  const silent = ['BUL', 'BUR', 'TOP', 'BOTTOM', 'BACK', 'FRONT', 'PARTITION'];
  for (const name of silent) {
    const panel = partOf(r, name);
    if (!panel) continue;
    assert.equal(panel.cnc?.grain, undefined, `${name} states nothing`);
    // THE 3D: the SAW's rule — the grain runs the longer of the two cut
    // dimensions — untouched, and asserted as the arithmetic rather than as a
    // remembered letter.
    const run = grainRun(panel);
    assert.equal(run.axis, panel.w >= panel.h ? 'w' : 'h', `${name}: the saw's own rule`);
    assert.equal(run.lengthMm, Math.max(panel.w, panel.h), `${name}: the longer side`);
    // THE SHEET: turn 17 F3's size rule over the old SHELF_BOARD_PARTS set, and
    // nothing else is ever turned.
    const { dw, dh } = drawnFrame(panel);
    const shelfBoard = ['SHELF', 'PARTITION', 'RAIL-PART', 'FIXED'].includes(name);
    assert.equal(sheetTurn(panel), shelfBoard && dw > dh ? 90 : 0, `${name}: laid as turn 17 laid it`);
  }
});

test('F7 the old SHELF_BOARD_PARTS set folds in — it is not bolted beside the new law', () => {
  // The four names turn 17 F3 asked its question of. Of them only SHELF carries
  // a stated grain, so the other three are byte-identical: the same rule, the
  // same code, the same answer.
  const r = unit('WARDROBE', { shelves: 2, drawers: 3, rail: true });
  for (const name of ['PARTITION', 'RAIL-PART']) {
    const panel = partOf(r, name);
    assert.ok(panel, `${name} is in this wardrobe`);
    assert.equal(panel.cnc?.grain, undefined, `${name} states nothing, so the size rule answers`);
    const { dw, dh } = drawnFrame(panel);
    assert.ok(dw > dh, `${name} is drawn lying down`);
    assert.equal(sheetTurn(panel), 90, `${name} is stood up by the size rule, as it always was`);
  }
  // A FIXED panel is drawn `depth × width` — the TOP's own nesting — and
  // turning it would lay it across its own grain. Turn 17's note says so and it
  // is still true.
  const fridge = unit('FRIDGE');
  const fixed = partOf(fridge, 'FIXED');
  if (fixed) {
    const { dw, dh } = drawnFrame(fixed);
    assert.equal(sheetTurn(fixed), dw > dh ? 90 : 0, 'FIXED: asked of the DRAWING, not of the name');
  }
  // And a part outside the set that states nothing is never turned, whatever
  // shape it is: a door is 597 × 2147 and a filler 30 × 611.
  for (const name of ['FRONT', 'BACK', 'BUL']) {
    const panel = partOf(r, name);
    if (panel) assert.equal(sheetTurn(panel), 0, `${name} is outside the set`);
  }
});

test('F7 the ONE case where the fold is not a no-op: a cabinet deeper than it is wide', () => {
  // Recorded in `layout.js`'s own note, and pinned here because it is the only
  // place the generalised law and the old size rule give different answers on a
  // part that both of them look at. The size rule stood the shelf up the page
  // and laid its own stated figure across it; the stated field wins.
  const deep = computeCabinet({
    type: 'BUD', width: 400, height: 770, depth: 700, unit_num: '01', shelves: 1,
  }, P);
  const shelf = partOf(deep, 'SHELF');
  assert.ok(shelf.h > shelf.w, 'deeper than it is wide');
  assert.equal(shelf.cnc.grain, 'h', 'the same statement every shelf carries');
  const { dw, dh } = drawnFrame(shelf);
  assert.ok(dw > dh, 'drawn lying down — the old rule would turn it');
  assert.equal(sheetTurn({ ...shelf, cnc: { ...shelf.cnc, grain: undefined } }), 90, 'the old rule’s answer');
  assert.equal(sheetTurn(shelf), 0, '…and the statement’s, which beats it');
  // And the two readers still agree on this piece, which is the point of the
  // whole feature: 360 mm of grain up the sheet and 360 mm along the figure.
  assert.equal(grainRun(shelf).lengthMm, dh);
  assert.equal(grainRun(shelf).lengthMm, shelf.w);
});

// ═══ 4b. THE DIVERGENCE THIS FEATURE EXPOSES, PINNED AND REPORTED ═══════════

test('F7 THE DIVERGENCE — two ladders cut one role and the drawn frame decides its figure', () => {
  // ─── PINNED, NOT ENDORSED — reported in the PR body ──────────────────────
  //
  // F7b's ruling is that `cnc.grain` is written in the CNC DRAWN frame. It is
  // the ruling CLAUDE.md's own worked example turns on and both readers now
  // obey it, which is the point of this file. But the field has TWO WRITERS and
  // they do not describe their frame the same way:
  //
  //   engine/cabinet.js   passes the piece's own `grain` through, and the shelf
  //                       (turn 26 F8) states it in the DRAWN frame — 'h' means
  //                       the drawn 560, the cabinet's WIDTH.
  //   engine/grain.js     `GRAIN_AXIS_BY_PART`, in its own words, gives "the
  //                       axis each ROLE's grain runs along, IN THE PANEL'S OWN
  //                       `w × h` RECORD" — 'h' means "up the piece".
  //
  // Wherever the drawn frame equals the panel frame the two readings coincide
  // and nothing is at stake. They part company on exactly one family: a role
  // that turn 36 F5 answered AND that some kit draws turned. That is the drawer
  // BOX board, and it is cut by two different ladders:
  //
  //   a WARDROBE's box   no drawn frame at all → the statement is read as
  //                      written → the figure runs UP the side (its 164).
  //   a BUDR's box       drawn `height × depth` (turn 12) → the statement is
  //                      translated → the figure runs along the side's LENGTH
  //                      (its 490), which is the saw's own answer for that
  //                      board and NOT "szuflady w pionie, wzdłuż słojów".
  //
  // One role, two kits, two directions. It is pinned here as a number so that
  // it is on the record and cannot drift further while a decision is pending;
  // the fix, if the owner wants one, is a WRITER question (which frame
  // `grain.js` states in), not a reader question — and iron rule 4 forbids
  // touching either without his word.
  const wardrobeSide = partOf(unit('WARDROBE', { drawers: 3 }), 'DRAWER-SIDE');
  const budrSide = partOf(unit('BUDR'), 'DRAWER-SIDE');
  assert.equal(wardrobeSide.cnc.grain, 'h', 'the same statement…');
  assert.equal(budrSide.cnc.grain, 'h', '…on both ladders');
  assert.equal(frameRelation(wardrobeSide), 'same', 'the wardrobe box declares no drawn frame');
  assert.equal(frameRelation(budrSide), 'turned', 'the BUDR box is drawn `height × depth`');
  assert.equal(grainRun(wardrobeSide).axis, 'h', 'so the figure runs UP the wardrobe’s side');
  assert.equal(grainRun(wardrobeSide).lengthMm, wardrobeSide.h);
  assert.equal(grainRun(budrSide).axis, 'w', '…and along the BUDR’s — the divergence');
  assert.equal(grainRun(budrSide).lengthMm, budrSide.w);
  // Both readers still agree WITH EACH OTHER on both boards, which is what says
  // this is a writer's question and not a drift between the two readers.
  for (const side of [wardrobeSide, budrSide]) {
    const { dw, dh } = drawnFrame(side);
    assert.equal(grainRun(side).lengthMm, sheetTurn(side) === 90 ? dw : dh,
      'the sheet and the scene still say the same millimetres');
  }
});

// ═══ 5. THE ENGINE DID NOT MOVE (CLAUDE.md T37 iron rule 2) ═════════════════

test('F7 BYTE-IDENTITY — computeCabinet’s own `cnc.grain` and drawn frame are untouched', () => {
  // F7a changes sheet PLACEMENT and F7b is a 3D reader. Neither writes to a
  // panel, and this is the assertion that says so in the fields themselves: the
  // statements and the drawn frames are exactly what turns 26, 34 and 36 left.
  const bud = unit('BUD', { shelves: 1, plinth: true });
  const budr = unit('BUDR');
  const wardrobe = unit('WARDROBE', { drawers: 3, shelves: 2 });

  const shelf = partOf(bud, 'SHELF');
  assert.deepEqual(
    { g: shelf.cnc.grain, r: shelf.cnc.rotated, dw: shelf.cnc.drawn_w, dh: shelf.cnc.drawn_h, w: shelf.w, h: shelf.h },
    { g: 'h', r: true, dw: 520, dh: 560, w: 560, h: 520 }, 'SHELF — turn 26 F8',
  );
  assert.deepEqual(
    { g: partOf(bud, 'PLINTH').cnc.grain, dw: partOf(bud, 'PLINTH').cnc.drawn_w },
    { g: 'h', dw: undefined }, 'PLINTH — turn 36 F5 states, it does not turn',
  );
  const side = partOf(budr, 'DRAWER-SIDE');
  assert.deepEqual(
    { g: side.cnc.grain, r: side.cnc.rotated, dw: side.cnc.drawn_w, dh: side.cnc.drawn_h },
    { g: 'h', r: true, dw: side.h, dh: side.w }, 'DRAWER-SIDE — turn 12\'s frame, turn 36\'s statement',
  );
  const df = partOf(budr, 'DRAWER-FRONT');
  assert.deepEqual(
    { g: df.cnc.grain, r: df.cnc.rotated, dw: df.cnc.drawn_w },
    { g: 'h', r: undefined, dw: undefined }, 'DRAWER-FRONT — stated, with no frame invented for it',
  );
  assert.equal(partOf(budr, 'DRAWER-BOTTOM').cnc.grain, 'w', 'dno — słoje w poprzek');
  // …and the boards that say nothing still say nothing. A reader that had
  // started writing would show up here first.
  for (const name of ['BUL', 'BUR', 'TOP', 'BOTTOM', 'BACK', 'FRONT']) {
    const panel = partOf(wardrobe, name);
    if (panel) assert.equal(panel.cnc?.grain, undefined, `${name} states nothing, still`);
  }
  // Reading twice must not change what is read — the cheapest possible guard
  // against a reader that memoises onto the panel it was handed.
  const before = JSON.stringify(shelf.cnc);
  grainRun(shelf);
  sheetTurn(shelf);
  grainRun(shelf);
  sheetTurn(shelf);
  assert.equal(JSON.stringify(shelf.cnc), before, 'both readers are pure');
});
