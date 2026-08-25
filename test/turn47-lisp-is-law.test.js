import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  T47_KITS, T47_ROUTINE, T47_SHARED, balanceOfKits, routineCensus, routineFaults,
} from '../scripts/t47-paren-balance.mjs';

// ─── TURN 47 · LISP IS LAW — FIRST (CLAUDE.md iron rule 3) ──────────────────
//
//   *"`SKY:slopeCutPts` in `SKYLON_COMMON.lsp` learns the polyline; the
//   roof-board top and the angled side tops are stated there before any JS.
//   Callers stay `KIT_WARDROBE_FULL` + `KIT_BUDTALL_FULL` — no other kit is
//   touched, and the PR says so. Paren balance 0/0 by script, all 13 kits."*
//
// So this file runs FIRST in the turn's order, and "the application follows the
// LISP" is what the F1/F2/F3 tests then assert against it: the JS port is
// checked against the SHAPES stated here, never the other way round.

const dir = new URL('../reference/lisp/', import.meta.url);
const read = (name) => readFileSync(new URL(name, dir), 'utf8');
const common = read(T47_SHARED);

test('all 13 kits balance 0/0, and none has a stray closing paren', () => {
  const rows = balanceOfKits();
  assert.equal(rows.length, 13, 'the whole shelf is read');
  for (const r of rows) {
    assert.equal(r.balance, 0, `${r.name} balance`);
    assert.equal(r.negativeAt, null, `${r.name} has a ) that closes nothing`);
  }
});

test('ONE routine, in the SHARED file, called from exactly the two kits', () => {
  const census = routineCensus();
  assert.deepEqual(routineFaults(census), []);
  assert.deepEqual(census.defined, [T47_SHARED]);
  assert.deepEqual(
    census.callers.filter((n) => n !== T47_SHARED).sort(),
    [...T47_KITS].sort(),
  );
});

test('no other kit has heard of the polyline, the roof or the bevel', () => {
  const others = ['KIT_BUD_FULL.lsp', 'KIT_BUDR_FULL.lsp', 'KIT_WUD_FULL.lsp',
    'KIT_SINK.lsp', 'KIT_FRIDGE.lsp', 'KIT_SHOE_BOX.lsp', 'KIT_LOW_CABINET_FULL.lsp',
    'KIT_DOOR_DOUBLE.lsp', 'KIT_SASH_STANDARD.lsp', 'KIT_LED_GROOVE.lsp'];
  for (const name of others) {
    const text = read(name);
    assert.equal(text.includes('SKY:slope'), false, `${name} is untouched`);
    assert.equal(text.includes('SKY:roof'), false, `${name} is untouched`);
    assert.equal(text.includes('SKY:cut'), false, `${name} is untouched`);
  }
});

// ─── THE LINE BENDS, AND THE ROUTINE SAYS SO ────────────────────────────────

test(`${T47_ROUTINE} takes a LINE, not two heights`, () => {
  assert.match(common, /\(defun SKY:slopeCutPts \(x0 y0 szer wys pts \/ top\)/);
  assert.match(common, /\(defun SKY:slopeTopPts \(szer wys pts/);
  assert.match(common, /\(defun SKY:cutHeightAt \(pts x/);
  assert.match(common, /\(defun SKY:slopeLine \(szer hL hR\)/);
  // The whole of T47 in one sentence, written where the routine is.
  assert.match(common, /Interpolated WITHIN the containing segment, never across the whole span/);
});

test('the top boundary is min(wys, at(x)) — which is why T46 comes back unchanged', () => {
  assert.match(common, /min\(wys, at\(x\)\)/);
  assert.match(common, /\(setq out \(append out \(list \(list bx \(min wys by\)\)\)\)\)/);
  // …and the crossing of the panel's own top is SOLVED, once per segment.
  assert.match(common, /\(setq kx \(\+ ax \(\/ \(\* \(- bx ax\) \(- wys ay\)\) \(- by ay\)\)\)\)/);
});

test('two slopes in one cabinet need no second code path — the line simply bends twice', () => {
  assert.match(common, /skosy mamy tylko po jednej stronie, a moze byc tak ze beda po 2 stronach/);
});

// ─── THE ROOF BOARD, STATED BEFORE ANY JS ───────────────────────────────────

test('the top board is a ROOF: L, L_MAX and the vertical footprint', () => {
  assert.match(common, /\(defun SKY:roofFaceLen \(span deg\)\n\s*\(\/ span \(cos/);
  assert.match(common, /\(defun SKY:roofBlankLen \(span deg G\)/);
  assert.match(common, /\(defun SKY:roofVertDrop \(G deg\)\n\s*\(\/ G \(cos/);
  assert.match(common, /\(defun SKY:roofBoards \(szer wys pts G/);
  // The owner's three rulings about this board, where the board is.
  assert.match(common, /pionowo lico do boku/);
  assert.match(common, /wieniec nie moze grubiec/);
  assert.match(common, /gorny wieniec w tym przypadku nie moze miec dog bonesow/);
  assert.match(common, /ONE BOARD PER SEGMENT\. A board does not bend at a knee\./);
});

test('the vertical footprint is named CLEARANCE and never a thickness', () => {
  assert.match(common, /a clearance fact for the\n;;; elevation and for what the sides stop under, NEVER a thickness/);
});

// ─── THE SIDES RUN TO THE POINT ─────────────────────────────────────────────

test('BUL and BUR run to the peak, and the angle is stated', () => {
  assert.match(common, /\(defun SKY:sideTopY \(pts wys xa xb G/);
  assert.match(common, /\(defun SKY:sideCutDeg \(pts xa xb\)/);
  assert.match(common, /\(defun SKY:cutPeakBetween \(pts xa xb/);
  assert.match(common, /\(defun SKY:cutValleyBetween \(pts xa xb/);
  assert.match(common, /BUL i BUR przedluzony do czubka skosu/);
  assert.match(common, /najlepiej zeby bylo napisane jaki kat ciecia, na CNC tez zeby bylo/);
});

test('five-axis is written down as OWED, in the file that cannot cut it', () => {
  assert.match(common, /BACKLOG 120/);
  assert.match(common, /narazie zrob 2D ale\n;;; zapisz do cabinet core ze to bedzie zalegle/);
});

// ─── AND THE TWO KITS FOLLOW IT ─────────────────────────────────────────────

test('both kits hand the routine a LINE and take their angles off it', () => {
  for (const kit of T47_KITS) {
    const text = read(kit);
    assert.match(text, /T47 - AND THE LINE BENDS|T47, the morning after/, `${kit} carries the turn`);
    assert.match(text, /SKY:slopeLine/, `${kit} can still spell the straight case`);
    assert.match(text, /SKY:sideTopY/, `${kit} runs its sides to the point`);
    assert.match(text, /SKY:roofBoards/, `${kit} lays a roof, not a lid`);
    assert.match(text, /\(strcat "CUT " \(rtos deg 2 1\) " DEG"\)/, `${kit} prints the cut angle`);
  }
});

test('the T46 rulings are still verbatim in both kits — nothing above the line changed', () => {
  for (const kit of T47_KITS) {
    const text = read(kit);
    assert.match(text, /tniemy po skosie/);
    assert.match(text, /brak wyboru otwierania, musi byc od skosu/);
    assert.match(text, /minimum 400/);
    assert.match(text, /jak ustawimy infill 40 to 40/);
    assert.match(text, /Nothing above this line changes - T46 iron rule 3/);
  }
});
