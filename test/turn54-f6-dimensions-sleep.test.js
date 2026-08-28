import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { createDimensionSleep, dimensionsIdleMs } from '../src/lib/dimensionSleep.js';
import { useUiStore } from '../src/stores/uiStore.js';

// ─── T54 · F6 — DIMENSIONS GO TO SLEEP AFTER 30 SECONDS ────────────────────
//
// The owner: *"wyłączenie dimension po 30 sekundach lub po minucie"* — the
// FIRST number wins: 30 000 ms, a profile constant (veto "60"). While the
// dimensions are shown, any interaction resets the clock; at 30 s of quiet
// the app flips the EXISTING Hide-dimensions toggle through the store's own
// action. Manual toggling untouched; the timer never turns dimensions ON;
// no timer while they are hidden; nothing persists across sessions.

test('F6 · the number is the profile\'s, and it is the owner\'s 30 000', () => {
  assert.equal(P.ui.dimensionsIdleMs, 30000, 'first number wins (veto "60")');
  assert.equal(dimensionsIdleMs(P), 30000);
  assert.equal(dimensionsIdleMs(null), 30000, 'and nobody-said is still his 30');
});

test('F6 · fake timers: shown → idle 30 s → hidden', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let hidden = 0;
  const sleep = createDimensionSleep({ idleMs: 30000, hide: () => { hidden += 1; } });
  sleep.touch();
  t.mock.timers.tick(29999);
  assert.equal(hidden, 0, 'a millisecond early is not asleep');
  t.mock.timers.tick(1);
  assert.equal(hidden, 1, 'at 30 s the toggle flips');
  assert.equal(sleep.armed(), false, 'and the clock is spent, not looping');
});

test('F6 · an interaction at 29 s DEFERS the sleep', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let hidden = 0;
  const sleep = createDimensionSleep({ idleMs: 30000, hide: () => { hidden += 1; } });
  sleep.touch();
  t.mock.timers.tick(29000);
  sleep.touch(); // the joiner moved the pointer
  t.mock.timers.tick(29999);
  assert.equal(hidden, 0, 'the clock restarted from the touch');
  t.mock.timers.tick(1);
  assert.equal(hidden, 1);
});

test('F6 · manual hide CANCELS — no timer runs while they are hidden', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let hidden = 0;
  const sleep = createDimensionSleep({ idleMs: 30000, hide: () => { hidden += 1; } });
  sleep.touch();
  assert.equal(sleep.armed(), true);
  sleep.cancel(); // the button was clicked; the page tears the clock down
  assert.equal(sleep.armed(), false);
  t.mock.timers.tick(120000);
  assert.equal(hidden, 0, 'a cancelled clock never fires');
});

test('F6 · the toggle it flips is the store\'s own, and it is not persisted', () => {
  const ui = useUiStore.getState();
  assert.equal(typeof ui.setShowDimensions, 'function');
  assert.equal(typeof ui.toggleDimensions, 'function');
  assert.equal(useUiStore.getState().showDimensions, true, 'dimensions start shown');
  ui.setShowDimensions(false);
  assert.equal(useUiStore.getState().showDimensions, false, 'the same action the button uses');
  ui.setShowDimensions(true);
  // Not persisted: the slice writes no localStorage key (contrast
  // showFrontDimensions, which rides `cc.showFrontDimensions`).
  const src = readFileSync(new URL('../src/stores/uiStore.js', import.meta.url), 'utf8');
  const slice = src.slice(src.indexOf('showDimensions: true'), src.indexOf('toggleDimensions'));
  assert.doesNotMatch(slice, /loadFlag|saveFlag|localStorage/, 'session-only, as F6 asks');
});

test('F6 · the wiring: shown-and-3d only, every interaction resets, teardown cancels', () => {
  const page = readFileSync(new URL('../src/pages/ConfiguratorPage.jsx', import.meta.url), 'utf8');
  assert.match(page, /if \(!showDimensionsNow \|\| viewMode !== '3d'\) return undefined;/,
    'no timer while hidden, and none behind the CNC lens');
  assert.match(page, /hide: \(\) => useUiStore\.getState\(\)\.setShowDimensions\(false\),/,
    'the same code path the button uses');
  assert.match(page, /\['pointerdown', 'pointermove', 'keydown', 'wheel'\]/,
    'pointer, key and camera (wheel) all reset');
  assert.match(page, /sleep\.cancel\(\);/, 'unmount and manual hide tear the clock down');
  // The timer never turns dimensions ON: the only write is the hide above.
  const effect = page.slice(page.indexOf('DIMENSIONS GO TO SLEEP'), page.indexOf('captureRef'));
  assert.doesNotMatch(effect, /setShowDimensions\(true\)/, 'sleep only ever hides');
});
