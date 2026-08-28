// ─── T51 · F5 — THE CUP BORE RESPECTS THE SHAKER'S REBATE ───────────────────
//
// The owner, 26.08.2026, with the door in his hand:
//
//   *"puszka trochę odstaje od lica … drzwi mają 18 minus 6 daje 12, a puszka
//   jest na głębokość 11, więc nie powinno być widoczne. może puszka jest oka,
//   ale otwór jest za głęboki?"*
//
// He is right, and the last four words are the whole of it. The cup is the one
// hole in this app that does not go through, and its depth was measured against
// THE BOARD. On a shaker the board is not what is under the cup.
//
// LISP IS LAW, FIRST (iron rule 3): the rule is born in
// `reference/lisp/SKYLON_COMMON.lsp` as `SKY:cupThickness` / `SKY:cupDepth` /
// `SKY:cupTooThin`, and this file asserts the application says the same thing.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { cupBoreOf, cupThicknessAtBore, doorHingeDatum } from '../src/engine/doors.js';
import { getCabinetProfile } from '../src/engine/profile.js';

const P = getCabinetProfile();
const LISP = readFileSync(new URL('../reference/lisp/SKYLON_COMMON.lsp', import.meta.url), 'utf8');

const CUPS = P.hinges.cups;
const REACH = CUPS.xFromHingeEdge + CUPS.diameter / 2;      // 21.5 + 17.5 = 39

/** A front leaf, as the engine publishes one. */
const front = (thickness, meta = {}) => ({
  id: 'F1',
  part: 'FRONT',
  box: { x: 0, y: 0, z: 0, w: 600, h: 700, d: thickness },
  meta: { hinge: 'L', ...meta },
});

// ─── the law, where it is born ─────────────────────────────────────────────

test('F5 — the rule is stated in the LISP, and the LISP is where it is born', () => {
  assert.match(LISP, /\(defun SKY:cupThickness \(boardT frameW recessD cupX cupDia\)/);
  assert.match(LISP, /\(defun SKY:cupDepth \(boardT frameW recessD cupX cupDia want keep/);
  assert.match(LISP, /\(defun SKY:cupTooThin \(boardT frameW recessD cupX cupDia want keep\)/);
  assert.match(LISP, /thickness AT THE CUP/, 'the law, not only the arithmetic');
  // The owner's own sentence, so the reason survives the next reader.
  assert.match(LISP, /puszka troche odstaje od lica/);
});

// ─── the material under the cup ────────────────────────────────────────────

test('F5 — a PLAIN door gets its board back, to the millimetre', () => {
  assert.equal(cupThicknessAtBore(front(18), P), 18);
  assert.equal(cupThicknessAtBore(front(25), P), 25);
});

test('F5 — a shaker whose FRAME carries the whole cup is a full board', () => {
  // The default 60 mm frame: the cup's far edge reaches 39, so it never leaves
  // the frame and the frame is not rebated.
  const leaf = front(18, { shaker: { frame: 60, depth: 6 } });
  assert.ok(REACH <= 60, 'the ⌀35 cup at 21.5 reaches 39 mm in');
  assert.equal(cupThicknessAtBore(leaf, P), 18);
  assert.equal(cupBoreOf(leaf, P).depth, P.hardware.hinge.cupDepth, 'so the bore is untouched');
});

test('F5 — a shaker whose frame the cup OVERHANGS is the board less the rebate', () => {
  // The owner's own arithmetic: 18 − 6 = 12.
  const leaf = front(18, { shaker: { frame: 30, depth: 6 } });
  assert.ok(REACH > 30, 'the cup reaches past a 30 mm frame');
  assert.equal(cupThicknessAtBore(leaf, P), 12);
});

test('F5 — what decides is the cup’s FAR EDGE, not its centre', () => {
  // A frame between the centre (21.5) and the reach (39) still has the cup
  // hanging over the field. Measured at the centre this would read "on the
  // frame" and bore into 12 mm believing it had 18.
  const between = front(18, { shaker: { frame: 30, depth: 6 } });
  assert.ok(CUPS.xFromHingeEdge < 30 && REACH > 30);
  assert.equal(cupThicknessAtBore(between, P), 12, 'the far edge is in the field');
  // …and exactly at the reach it is carried whole.
  assert.equal(cupThicknessAtBore(front(18, { shaker: { frame: REACH, depth: 6 } }), P), 18);
});

// ─── the bore, and the through-hole this ends ──────────────────────────────

test('F5 — CLAUDE.md’s own case: at 16 mm it used to bore straight through', () => {
  const leaf = front(16, { shaker: { frame: 20, depth: 6 } });
  assert.equal(cupThicknessAtBore(leaf, P), 10, 'ten millimetres of material');
  const bore = cupBoreOf(leaf, P);
  // The OLD rule: min(11, 16 − 1) = 11 into 10 mm of material — a through hole.
  assert.ok(bore.depth < 10, 'the bore stays inside the material');
  // ─── AMENDED BY T53 · F9, AND THE AMENDMENT IS NAMED ────────────────────
  //
  // The floor was ONE millimetre and is THREE. One is not a number: it reads
  // through a sprayed face the first time the door is knocked
  // (SKYLON_COMMON.lsp's own note, and T52's finding 2). The CLAIM this test
  // makes is untouched — the bore stays inside the material and is REPORTED
  // rather than silently shortened — and it is now made with two millimetres
  // more board under the cup.
  assert.equal(P.hardware.hinge.cupFloorKeepMm, 3, 'T53 F9: the decision taken');
  assert.equal(bore.depth, 7, '10 − the 3 mm floor the profile keeps');
  assert.equal(bore.short, true, 'and it is REPORTED, not silently shortened');
  assert.equal(bore.wanted, 11);
});

test('F5 — a GLASS front is refused past its frame, not bored into the aperture', () => {
  const leaf = front(18, { glass: { frame: 20, aperture: { w: 100, h: 100 } } });
  assert.equal(cupThicknessAtBore(leaf, P), 0, 'past the frame there is no material at all');
  assert.equal(cupBoreOf(leaf, P).short, true);
  // …and where the frame carries it, it is an ordinary board.
  assert.equal(cupThicknessAtBore(front(18, { glass: { frame: 60 } }), P), 18);
});

test('F5 — the DATUM is untouched: two planes and the board', () => {
  // *"the rebate is in the outer face and moves neither plane."*  That half of
  // T26's sentence was right and stays right — what was wrong was measuring the
  // BORE against the board.
  const leaf = front(18, { shaker: { frame: 20, depth: 6 } });
  const datum = doorHingeDatum(leaf);
  assert.equal(datum.innerZ, 0);
  assert.equal(datum.outerZ, 18);
  assert.equal(datum.thickness, 18, 'the board is still the board');
  assert.equal(cupBoreOf(leaf, P).thicknessAtCup, 12, 'and the cup knows better');
});

test('F5 — an appliance front still takes no cup at all', () => {
  assert.equal(doorHingeDatum(front(18, { appliance: true })), null);
  assert.equal(cupBoreOf(front(18, { appliance: true }), P), null);
});

// ─── the JS says what the LISP says ────────────────────────────────────────

test('F5 — the application follows the LISP, case for case', () => {
  // `SKY:cupThickness`, transcribed, and asked the same questions.
  const lisp = (boardT, frameW, recessD) => (
    (recessD <= 0 || CUPS.xFromHingeEdge + CUPS.diameter / 2 <= frameW)
      ? boardT
      : boardT - recessD);
  const keep = P.hardware.hinge.cupFloorKeepMm;
  const want = P.hardware.hinge.cupDepth;
  const lispDepth = (b, f, r) => Math.max(0, Math.min(want, lisp(b, f, r) - keep));

  for (const [board, frame, rebate] of [
    [18, 60, 6], [18, 30, 6], [16, 20, 6], [25, 60, 6], [18, 0, 0], [25, 70, 6], [19, 39, 6],
  ]) {
    const leaf = rebate > 0 ? front(board, { shaker: { frame, depth: rebate } }) : front(board);
    assert.equal(cupThicknessAtBore(leaf, P), lisp(board, frame, rebate),
      `thickness at the cup: ${board}/${frame}/${rebate}`);
    assert.equal(cupBoreOf(leaf, P).depth, lispDepth(board, frame, rebate),
      `bore: ${board}/${frame}/${rebate}`);
  }
});
