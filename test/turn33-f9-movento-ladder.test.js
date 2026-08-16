// ─── Turn 33, CLAUDE.md F9: the MOVENTO ladder — the owner's list, at last ──
//
// ─── REWRITTEN 16.08.2026 (turn 34, CLAUDE.md F3) ──────────────────────────
//
// T33 built the ladder 300–600/50 and asked it for the BOX DEPTH, so a 490 box
// ordered an NL450. The owner closed the F9 review the next day with the rule
// he has always worked to: *"powinien być skrzynka +10 mm"* — nominal 450 ↔
// box 440, 500 ↔ 490. And the bounds, same message: *"od 250"* … *"dopisujemy
// do 700"*.
//
// So two things move together, and this file is rewritten to both. The ladder
// is 250–700 every 50, and the ASK is `box + 10` — the T33 row that read
// "nl=450, asked_nl=490" now reads "nl=500, asked_nl=500 (box 490 + 10)".
// The snap grammar itself is untouched: land on a RUNG, order what stands
// there, a rung with no article prints YELLOW (never a shorter substitute),
// an ask below the whole ladder says so. The BOX ladder (depthSteps — what
// the saw cuts) is the LISP's and does not move (T34 iron rule 5).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import {
  clearRunnerCatalogue, ladderRungFor, parseRunnerManifest, runnerAskFor, runnerEntry,
  runnerLadder, runnerPairSpec, setRunnerCatalogue,
} from '../src/engine/runners.js';

const MANIFEST = JSON.parse(readFileSync(
  new URL('./fixtures/bucket/runners-blum-movento-manifest.json', import.meta.url),
));

function withCatalogue(fn) {
  setRunnerCatalogue(parseRunnerManifest(MANIFEST));
  try { fn(); } finally { clearRunnerCatalogue(); }
}

test('the ladder is ONE profile line: 250–700 every 50 (owner, 16.08)', () => {
  assert.deepEqual(P.hardware.runner.movento.nominalLadder,
    [250, 300, 350, 400, 450, 500, 550, 600, 650, 700]);
  assert.deepEqual(runnerLadder(P),
    [250, 300, 350, 400, 450, 500, 550, 600, 650, 700]);
  // …and the BOX ladder — what the saw cuts, what the fixtures stand on —
  // has not moved a millimetre (T34 iron rule 5).
  assert.deepEqual(P.wardrobe.drawers.depthSteps,
    [250, 270, 300, 320, 350, 380, 390, 440, 490, 540, 590, 640, 690]);
});

test('the ASK is the box + 10 — the owner\'s standing −10 rule, stated once', () => {
  assert.equal(P.hardware.runner.movento.nominalOverBoxMm, 10);
  assert.equal(runnerAskFor(490, P), 500);
  assert.equal(runnerAskFor(440, P), 450);
  assert.equal(runnerAskFor(640, P), 650);
  assert.equal(runnerAskFor(690, P), 700);
  assert.equal(runnerAskFor(null, P), null, 'no box, no ask');
});

test('the full −10 pairing sweep: every box step ≥ 240 ASKS for exactly step + 10', () => {
  for (const step of P.wardrobe.drawers.depthSteps) {
    if (step < 240) continue;
    assert.equal(runnerAskFor(step, P), step + 10, `box ${step} asks ${step + 10}`);
  }
});

// ─── THE DIVERGENCE, NAMED (T34 F3, reported in the PR body) ───────────────
//
// CLAUDE.md F3 asks for a sweep in which "every depthStep ≥ 240 maps to
// exactly step+10 ON THE LADDER". The ASK is always step + 10 — that half is
// the law and the row above pins it. But the ladder it is asked of has rungs
// only every 50 from 250, so an ask lands exactly on a rung only where the box
// step ends in 40 or 90 (plus 390, whose +10 is 400). The owner's own four
// worked examples are all of that shape — 490→500, 440→450, 640→650, 690→700 —
// and they are the depths this workshop actually cuts.
//
// The other six steps (250, 270, 300, 320, 350, 380) ask for a length the
// ladder has no rung at, and the T33-F9 grammar answers them unchanged: snap
// DOWN to the largest rung not above the ask, name both in the label. Nothing
// is invented and nothing is rounded up. Both halves are pinned here so the
// arithmetic cannot quietly change under either reading.
test('the owner\'s worked examples land ON a rung; the rest snap down and say so', () => {
  const ladder = runnerLadder(P);
  const onTheNose = [440, 490, 540, 590, 640, 690, 390];
  for (const step of onTheNose) {
    assert.ok(P.wardrobe.drawers.depthSteps.includes(step));
    const ask = runnerAskFor(step, P);
    const rung = ladderRungFor(ask, P);
    assert.ok(ladder.includes(ask), `${ask} is itself a rung`);
    assert.equal(rung, ask, `box ${step} → NL ${ask}, not one rung short`);
  }
  // The owner's four, spelled out in his own pairing.
  assert.equal(ladderRungFor(runnerAskFor(490, P), P), 500);
  assert.equal(ladderRungFor(runnerAskFor(440, P), P), 450);
  assert.equal(ladderRungFor(runnerAskFor(640, P), P), 650);
  assert.equal(ladderRungFor(runnerAskFor(690, P), P), 700);

  // And the six the ladder has no rung for: the ask still rises by ten, the
  // rung is the largest not above it, and the two are named apart.
  for (const step of [250, 270, 300, 320, 350, 380]) {
    const ask = runnerAskFor(step, P);
    assert.equal(ask, step + 10);
    const rung = ladderRungFor(ask, P);
    assert.ok(ladder.includes(rung), `${rung} is a rung`);
    assert.ok(rung <= ask, 'never rounded up');
    assert.ok(!ladder.includes(ask), `${ask} is deliberately NOT a rung`);
  }
});

test('an ask lands on the largest rung not above it', () => {
  assert.equal(ladderRungFor(450, P), 450);
  assert.equal(ladderRungFor(500, P), 500);
  assert.equal(ladderRungFor(700, P), 700);
  assert.equal(ladderRungFor(720, P), 700, 'above the top: the top rung');
  assert.equal(ladderRungFor(250, P), 250, 'the new lower bound — "od 250"');
  assert.equal(ladderRungFor(249, P), null, 'below the whole ladder: no rung, said out loud');
});

test('the snap orders the ARTICLE at the rung — and only at the rung', () => {
  withCatalogue(() => {
    const ladder = runnerLadder(P);
    // A 440 box asks 450 — the bucket HAS a 450: that article, exactly.
    const hit = runnerEntry({
      system: '760H', nl: runnerAskFor(440, P), variant: 'S', side: 'L', ladder,
    });
    assert.equal(hit.nl, 450);
    assert.equal(hit.snappedFromNl, undefined, 'ask == rung: nothing was snapped');
    // A 490 box asks 500 — the bucket has NO 500: null, never the 450 beneath.
    assert.equal(runnerEntry({
      system: '760H', nl: runnerAskFor(490, P), variant: 'S', side: 'L', ladder,
    }), null, 'a rung with no article is a YELLOW line, not a substitute');
    // Below the ladder entirely.
    assert.equal(runnerEntry({
      system: '760H', nl: 200, variant: 'S', side: 'L', ladder,
    }), null);
    // An ask BETWEEN rungs still snaps down to one, and says it did.
    const between = runnerEntry({
      system: '760H', nl: 470, variant: 'S', side: 'L', ladder,
    });
    assert.equal(between.nl, 450);
    assert.equal(between.snappedFromNl, 470);
    // Without a ladder the 15.08 chat-fix snap stands unchanged.
    const legacy = runnerEntry({
      system: '760H', nl: 440, variant: 'S', side: 'L',
    });
    assert.equal(legacy.nl, 420, 'no ladder: the catalogue snap of the chat fix');
  });
});

test('the pair spec ORDERS the +10 nominal and says when the ask fell off', () => {
  withCatalogue(() => {
    // THE OWNER'S 16.08 CORRECTION, in one row. T33 read this box as
    // "nl=450, asked_nl=490"; it now reads "nl=500, asked_nl=500 (box 490+10)".
    const spec = runnerPairSpec({ nl: runnerAskFor(490, P), variant: 'S', profile: P });
    assert.equal(spec.nl, 500, 'the BOM orders the box + 10');
    assert.equal(spec.asked_nl, 500, 'and the ask IS the box + 10');
    assert.equal(spec.on_ladder, true);
    assert.equal(spec.complete, false, 'the bucket has no 500: yellow, nothing invented');

    // A 440 box: nominal 450, and the bucket knows it.
    const known = runnerPairSpec({ nl: runnerAskFor(440, P), variant: 'S', profile: P });
    assert.equal(known.nl, 450);
    assert.equal(known.asked_nl, 450);
    assert.equal(known.complete, true, 'both articles stand at 450');

    const off = runnerPairSpec({ nl: 200, variant: 'S', profile: P });
    assert.equal(off.nl, null);
    assert.equal(off.on_ladder, false);
    assert.equal(off.complete, false, 'below the ladder: yellow, nothing invented');
  });
});

test('consumer sweep: runnerModelFits judges against the rung the entry names', () => {
  // The chat fix's own law (Hardware.jsx judges w.entry?.nl): the entry carries
  // the LADDER rung, so a 450 file fits a 440 box asking 450.
  withCatalogue(() => {
    const hit = runnerEntry({
      system: '760H', nl: runnerAskFor(440, P), variant: 'S', side: 'L', ladder: runnerLadder(P),
    });
    assert.equal(hit.nl, 450, 'the nl the 3D fit will be judged against');
  });
});
