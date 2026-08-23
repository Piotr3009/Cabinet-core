import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  HANDLED_OPENINGS, SOFT_CLOSE_VARIANT, TIP_ON_VARIANT, lockPatchFor, pushToOpenLock,
  pushToOpenOn, pushToOpenPatch,
} from '../src/lib/pushToOpen.js';
import { FRONT_OPENING_IDS, frontOpening, frontOpeningPatch } from '../src/lib/frontOpening.js';
import { migrateDesign } from '../src/engine/design.js';
import { resolveRunnerVariant } from '../src/engine/runners.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

// ─── TURN 45 · F5 — PUSH-TO-OPEN OBEYS THE HANDLES ──────────────────────────
//
// CLAUDE.md, 23.08.2026:
//
//   *"Any handles chosen (J-pull / bar / knobs / any hands) → push-to-open is
//   forced OFF and LOCKED, with a one-line reason under it. Handleless →
//   available as before. The BOM follows the lock.
//   Test: toggling handles flips the lock both ways."*
//
// A TIP-ON drawer under a bar handle comes out on the pull and re-latches on
// the next push. It is not a preference the screen was letting somebody get
// wrong; it is an order nobody could fill.

const HW = readFileSync(new URL('../src/components/WizardHardware.jsx', import.meta.url), 'utf8');
const WIZ = readFileSync(new URL('../src/components/WizardSettings.jsx', import.meta.url), 'utf8');
const SUM = readFileSync(new URL('../src/components/WizardSummary.jsx', import.meta.url), 'utf8');

/** A project on one of the four openings, as the wizard would leave it. */
const on = (openingId) => {
  const base = migrateDesign({ fronts: { style: 'F' }, runners: { variant: 'T' } });
  return migrateDesign({ ...base, ...frontOpeningPatch(base, openingId) });
};

// ══ the rule ════════════════════════════════════════════════════════════════

test('F5 — the three handled openings lock it; handleless does not', () => {
  assert.deepEqual(HANDLED_OPENINGS, ['handles', 'knobs', 'jhandle']);
  // …and that is every opening but one, out of the four T44 fixed as law.
  assert.deepEqual(
    FRONT_OPENING_IDS.filter((id) => !HANDLED_OPENINGS.includes(id)),
    ['push'],
  );

  for (const id of HANDLED_OPENINGS) {
    const lock = pushToOpenLock(on(id));
    assert.equal(lock.locked, true, `${id} must lock push-to-open`);
    assert.equal(lock.opening, id);
    assert.match(lock.reason, /push-to-open cannot be fitted/, 'a ONE-LINE reason, not a tooltip');
  }
  const free = pushToOpenLock(on('push'));
  assert.equal(free.locked, false);
  assert.equal(free.reason, null);
});

test('F5 — TOGGLING HANDLES FLIPS THE LOCK BOTH WAYS (CLAUDE.md’s own test)', () => {
  let design = on('push');
  assert.equal(pushToOpenLock(design).locked, false);
  assert.equal(pushToOpenOn(design, P), true);

  // …handles on: locked, and the field itself is off.
  design = migrateDesign({ ...design, ...frontOpeningPatch(design, 'handles') });
  assert.equal(frontOpening(design), 'handles');
  assert.equal(pushToOpenLock(design).locked, true);
  assert.equal(pushToOpenOn(design, P), false);

  // …handles off again: available, exactly as before.
  design = migrateDesign({ ...design, ...frontOpeningPatch(design, 'push') });
  assert.equal(frontOpening(design), 'push');
  assert.equal(pushToOpenLock(design).locked, false);
  assert.equal(pushToOpenOn(design, P), true);
});

test('F5 — the lock is not a new field: it writes the runner variant T18 gave', () => {
  assert.equal(TIP_ON_VARIANT, 'T');
  assert.equal(SOFT_CLOSE_VARIANT, 'S');
  for (const id of HANDLED_OPENINGS) {
    assert.equal(on(id).runners.variant, SOFT_CLOSE_VARIANT, `${id} writes the soft-close runner`);
  }
  assert.equal(on('push').runners.variant, TIP_ON_VARIANT);
  // `lockPatchFor` is what `frontOpeningPatch` merges — nothing for handleless,
  // because turning the handles OFF must not silently turn TIP-ON on for
  // somebody who never asked for it.
  assert.equal(lockPatchFor(on('push'), 'push'), null);
  assert.deepEqual(lockPatchFor(on('push'), 'knobs').runners.variant, SOFT_CLOSE_VARIANT);
});

test('F5 — THE BOM FOLLOWS THE LOCK, because it reads the field the lock wrote', () => {
  // `resolveRunnerVariant` is what the BOM, the 3D and the CNC all ask. No
  // second sentence anywhere had to learn about handles.
  for (const id of HANDLED_OPENINGS) {
    assert.equal(resolveRunnerVariant({ design: on(id), profile: P }), 'S');
  }
  assert.equal(resolveRunnerVariant({ design: on('push'), profile: P }), 'T');
});

test('F5 — a locked project cannot be given TIP-ON through the patch either', () => {
  const handled = on('handles');
  // The control is disabled in the surface; the RULE is what makes that safe.
  assert.equal(pushToOpenPatch(handled, true).runners.variant, SOFT_CLOSE_VARIANT);
  assert.equal(pushToOpenPatch(handled, false).runners.variant, SOFT_CLOSE_VARIANT);
  const free = on('push');
  assert.equal(pushToOpenPatch(free, true).runners.variant, TIP_ON_VARIANT);
  assert.equal(pushToOpenPatch(free, false).runners.variant, SOFT_CLOSE_VARIANT);
});

// ══ the surfaces ════════════════════════════════════════════════════════════

test('F5 — the hardware control is dead, LOOKS dead, and says why in one line', () => {
  assert.match(HW, /import \{ pushToOpenLock, pushToOpenPatch \} from '\.\.\/lib\/pushToOpen\.js'/);
  assert.match(HW, /const lock = pushToOpenLock\(design\);/);
  assert.match(HW, /data-push-locked=\{lock\.locked \? '1' : '0'\}/);
  assert.match(HW, /disabled=\{lock\.locked\}/);
  assert.match(HW, /opacity-45 cursor-not-allowed/, 'a disabled button that looks enabled is a lie');
  assert.match(HW, /data-push-lock-reason="1"/);
  assert.match(HW, /onClick=\{\(\) => setDesign\(pushToOpenPatch\(design, id === 'T'\)\)\}/);
});

test('F5 — the workshop’s runner-variant row cannot let TIP-ON in by the back door', () => {
  assert.match(WIZ, /const ptoLock = pushToOpenLock\(design\);/);
  assert.match(WIZ, /const barred = ptoLock\.locked && v\.id\.toUpperCase\(\) === 'T';/);
  assert.match(WIZ, /disabled=\{barred\}/);
  assert.match(WIZ, /data-runner-lock-reason="1"/);
});

test('F5 — the summary says what will be ordered, and why', () => {
  assert.match(SUM, /label="Push-to-open"/);
  assert.match(SUM, /data-summary-push-lock="1"/);
  assert.match(SUM, /pushToOpenOn\(design, profile\)/);
});

test('F5 — ONE sentence, from ONE rule, wherever it is asked', () => {
  // The reason lives in the lib. A surface that wrote its own would one day
  // write a different one.
  for (const src of [HW, WIZ, SUM]) {
    assert.doesNotMatch(src, /push-to-open cannot be fitted/, 'the sentence is the lib’s');
    assert.match(src, /pushToOpenLock/);
  }
});
