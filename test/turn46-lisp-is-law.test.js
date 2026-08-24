import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  T46_KITS, T46_ROUTINE, T46_SHARED, balanceOfKits, parenBalance, routineCensus, routineFaults,
} from '../scripts/t46-paren-balance.mjs';

// ─── TURN 46 · LISP IS LAW — FIRST (CLAUDE.md iron rule 3) ──────────────────
//
//   *"The slope edge cut is born in `reference/lisp/`: one shared routine
//   (SKYLON_COMMON) that trims a side panel's top corner on a diagonal, called
//   from `KIT_WARDROBE_FULL` and `KIT_BUDTALL_FULL`. Other kits untouched —
//   say so in the PR. Paren balance 0/0 by script. The application follows the
//   LISP, never the reverse."*
//
// So this file runs BEFORE the engine's own tests in the turn's order, and it
// is what "the application follows the LISP" means in practice: the shape the
// engine cuts in F3 is asserted against the shape this routine returns.

const dir = new URL('../reference/lisp/', import.meta.url);
const read = (name) => readFileSync(new URL(name, dir), 'utf8');
const common = read(T46_SHARED);

test('every kit balances 0/0, and none has a stray closing paren', () => {
  const rows = balanceOfKits();
  assert.ok(rows.length >= 13, 'the whole shelf is read');
  for (const r of rows) {
    assert.equal(r.balance, 0, `${r.name} balance`);
    assert.equal(r.negativeAt, null, `${r.name} has a ) that closes nothing`);
  }
});

test('the paren reader skips comments and strings — the prose is full of brackets', () => {
  assert.equal(parenBalance('(a) ; ) ) )').balance, 0);
  assert.equal(parenBalance('(a "(((" )').balance, 0);
  assert.equal(parenBalance('(a').balance, 1);
  assert.equal(parenBalance(')(').negativeAt, 1);
});

test('ONE routine, in the SHARED file, called from exactly the two kits', () => {
  const census = routineCensus();
  assert.deepEqual(routineFaults(census), []);
  assert.deepEqual(census.defined, [T46_SHARED]);
  assert.deepEqual(
    census.callers.filter((n) => n !== T46_SHARED).sort(),
    [...T46_KITS].sort(),
  );
});

test('no other kit mentions the slope cut at all', () => {
  const others = ['KIT_BUD_FULL.lsp', 'KIT_BUDR_FULL.lsp', 'KIT_WUD_FULL.lsp',
    'KIT_SINK.lsp', 'KIT_FRIDGE.lsp', 'KIT_SHOE_BOX.lsp', 'KIT_LOW_CABINET_FULL.lsp',
    'KIT_DOOR_DOUBLE.lsp', 'KIT_SASH_STANDARD.lsp', 'KIT_LED_GROOVE.lsp'];
  for (const name of others) {
    assert.equal(read(name).includes('slopeCut'), false, `${name} is untouched`);
    assert.equal(read(name).includes('SKY:slope'), false, `${name} is untouched`);
    assert.equal(read(name).includes('SLOPE CUT (T46)'), false, `${name} is untouched`);
  }
  // KIT_SHOE_BOX's own `;; === SLOPE LAW ===` is the SHOE RAIL's tilt and has
  // been there since T30. It is named here so a future reader does not read
  // the word `SLOPE` in that file as tonight's work and go looking for a
  // second diagonal.
  assert.match(read('KIT_SHOE_BOX.lsp'), /;; === SLOPE LAW ===/);
});

// ── the SHAPE the routine returns, read out of the LISP itself ──
//
// The routine is AutoLISP and there is no AutoLISP in this suite, so the shape
// is asserted the only honest way: the three branches are read out of the
// source and pinned by name, and `engine/puzzle.js slopeCutGeometry` — the
// application half, written in F3 — is asserted against the SAME three cases
// in the F3 test. Two files, one law, and the LISP is the one that states it.

// ─── T47 AMENDS THIS ONE TEST, AND SAYS SO ─────────────────────────────────
//
// T47's F1 is an order to this file: *"`SKY:slopeCutPts` in `SKYLON_COMMON.lsp`
// learns the polyline"*. The three-branch `cond` this test pinned by name IS
// what learned it — the routine now takes a POINT LIST and its top boundary is
// `min(wys, at(x))` walked knee by knee, which returns T46's rectangle, T46's
// trapezium and T46's two pentagons corner for corner (turn47-lisp-is-law
// proves that against the numbers rather than against the source).
//
// So what survives here is the half that did not change: the KNEE IS SOLVED,
// and it is solved with the same expression it always was.
test('the routine states the answers the cut can have — and the knee is SOLVED', () => {
  assert.match(common, /\(defun SKY:slopeKneeX \(szer wys hL hR/);
  assert.match(common, /\(defun SKY:slopeCutPts \(x0 y0 szer wys pts/);
  assert.match(common, /\(defun SKY:slopeCutActive \(wys pts/);
  assert.match(common, /\(defun SKY:drawSlopeCut \(x0 y0 szer wys pts/);
  // the pentagon's knee, on a straight run, and its own routine kept intact
  assert.match(common, /\* szer \(\/ \(- wys hL\) d\)/);
  // …and the general form of the same solve, one per segment of the line
  assert.match(common, /\(setq kx \(\+ ax \(\/ \(\* \(- bx ax\) \(- wys ay\)\) \(- by ay\)\)\)\)/);
});

test('the owner\'s four decisions are written into both kits, verbatim', () => {
  for (const kit of T46_KITS) {
    const text = read(kit);
    assert.match(text, /tniemy po skosie/, `${kit} carries option A`);
    assert.match(text, /brak wyboru otwierania, musi byc od skosu/, `${kit} carries the hinge law`);
    assert.match(text, /minimum 400/, `${kit} carries the floor`);
    assert.match(text, /jak ustawimy infill 40 to 40/, `${kit} carries the scribe gap`);
    assert.match(text, /SLOPE CUT \(T46\)/);
    assert.match(text, /Nothing above this line changes - T46 iron rule 3/);
  }
});

// T47: the two heights became a LINE, so the hinge law is asked of the line's
// two ENDS instead of two loose numbers. The RULE is untouched — the door opens
// FROM the slope and the hinges live on the full-height edge.
test('the hinge side is FORCED in the LISP too — the full-height edge', () => {
  assert.match(read('KIT_WARDROBE_FULL.lsp'),
    /\(defun wardrobeSlopeHinge \(szerSzafki pts\)\n\s*\(if \(>= \(SKY:cutHeightAt pts 0\.0\) \(SKY:cutHeightAt pts szerSzafki\)\) "L" "R"\)\)/);
  assert.match(read('KIT_BUDTALL_FULL.lsp'),
    /\(defun budtallSlopeHinge \(szerSzafki pts\)\n\s*\(if \(>= \(SKY:cutHeightAt pts 0\.0\) \(SKY:cutHeightAt pts szerSzafki\)\) "L" "R"\)\)/);
});

test('the 400 floor is a named constant in both kits, not a magic number', () => {
  assert.match(read('KIT_WARDROBE_FULL.lsp'), /\(setq SLOPE_MIN_CLEAR 400\.0\)/);
  assert.match(read('KIT_BUDTALL_FULL.lsp'), /\(setq BUDTALL_SLOPE_MIN_CLEAR 400\.0\)/);
});
