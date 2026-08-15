// ─── Turn 33, CLAUDE.md F9: the MOVENTO ladder — the owner's list, at last ──
//
// His list, 15.08: lengths EVERY 50 mm UP TO 600; the lower bound read as 300
// ("od 00"), ONE profile line marked owner-to-confirm (Q1). The snap lands on
// a RUNG and the BOM orders what stands there; a rung the bucket has no
// article for prints YELLOW — never a shorter substitute — and an ask below
// the whole ladder says so. This closes the long-parked "wyrównanie drabinki
// długości prowadnic". The BOX ladder (depthSteps — what the saw cuts) is the
// LISP's and does not move.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import {
  clearRunnerCatalogue, ladderRungFor, parseRunnerManifest, runnerEntry,
  runnerLadder, runnerPairSpec, setRunnerCatalogue,
} from '../src/engine/runners.js';

const MANIFEST = JSON.parse(readFileSync(
  new URL('./fixtures/bucket/runners-blum-movento-manifest.json', import.meta.url),
));

function withCatalogue(fn) {
  setRunnerCatalogue(parseRunnerManifest(MANIFEST));
  try { fn(); } finally { clearRunnerCatalogue(); }
}

test('the ladder is ONE profile line: 300–600 every 50, lower bound marked', () => {
  assert.deepEqual(P.hardware.runner.movento.nominalLadder, [300, 350, 400, 450, 500, 550, 600]);
  assert.deepEqual(runnerLadder(P), [300, 350, 400, 450, 500, 550, 600]);
  // …and the BOX ladder — what the saw cuts, what the fixtures stand on —
  // has not moved a millimetre.
  assert.deepEqual(P.wardrobe.drawers.depthSteps,
    [250, 270, 300, 320, 350, 380, 390, 440, 490, 540, 590, 640, 690]);
});

test('an ask lands on the largest rung not above it', () => {
  assert.equal(ladderRungFor(440, P), 400);
  assert.equal(ladderRungFor(490, P), 450);
  assert.equal(ladderRungFor(600, P), 600);
  assert.equal(ladderRungFor(640, P), 600);
  assert.equal(ladderRungFor(300, P), 300);
  assert.equal(ladderRungFor(270, P), null, 'below the whole ladder: no rung, said out loud (Q1)');
});

test('the snap orders the ARTICLE at the rung — and only at the rung', () => {
  withCatalogue(() => {
    const ladder = runnerLadder(P);
    // 440 lands on 400 — the bucket HAS a 400: that article, tagged.
    const hit = runnerEntry({
      system: '760H', nl: 440, variant: 'S', side: 'L', ladder,
    });
    assert.equal(hit.nl, 400);
    assert.equal(hit.snappedFromNl, 440);
    // 540 lands on 500 — the bucket has NO 500: null, never the 450 beneath.
    assert.equal(runnerEntry({
      system: '760H', nl: 540, variant: 'S', side: 'L', ladder,
    }), null, 'a rung with no article is a YELLOW line, not a substitute');
    // 270 is below the ladder entirely.
    assert.equal(runnerEntry({
      system: '760H', nl: 270, variant: 'S', side: 'L', ladder,
    }), null);
    // Without a ladder the 15.08 chat-fix snap stands unchanged.
    const legacy = runnerEntry({
      system: '760H', nl: 440, variant: 'S', side: 'L',
    });
    assert.equal(legacy.nl, 420, 'no ladder: the catalogue snap of the chat fix');
  });
});

test('the pair spec ORDERS the snapped length and says when the ask fell off', () => {
  withCatalogue(() => {
    const spec = runnerPairSpec({ nl: 440, variant: 'S', profile: P });
    assert.equal(spec.nl, 400, 'the BOM orders the rung');
    assert.equal(spec.asked_nl, 440, 'the cut depth rides beside it');
    assert.equal(spec.on_ladder, true);
    assert.equal(spec.complete, true, 'both articles stand at 400');

    const off = runnerPairSpec({ nl: 270, variant: 'S', profile: P });
    assert.equal(off.nl, null);
    assert.equal(off.on_ladder, false);
    assert.equal(off.complete, false, 'below the ladder: yellow, nothing invented');

    const bare = runnerPairSpec({ nl: 540, variant: 'S', profile: P });
    assert.equal(bare.nl, 500, 'the rung is named…');
    assert.equal(bare.complete, false, '…and the bucket has no article there: yellow');
  });
});

test('consumer sweep: runnerModelFits judges against the rung the entry names', () => {
  // The chat fix's own law (Hardware.jsx judges w.entry?.nl): the entry now
  // carries the LADDER rung, so a 400 file fits a 440 ask snapped to 400.
  withCatalogue(() => {
    const hit = runnerEntry({
      system: '760H', nl: 440, variant: 'S', side: 'L', ladder: runnerLadder(P),
    });
    assert.equal(hit.nl, 400, 'the nl the 3D fit will be judged against');
  });
});
