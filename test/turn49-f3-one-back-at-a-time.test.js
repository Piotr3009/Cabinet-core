import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  closeWindow, isCovered, nextWindowSeq, openWindow, openWindows, resetWindows, subscribeWindows,
} from '../src/lib/modalStack.js';
import { backStep, stepsInScope } from '../src/lib/wizardSteps.js';

// ─── TURN 49 · F3 — ONE BACK AT A TIME ──────────────────────────────────────
//
// The owner, 25.08.2026, with the screenshot in his hand: *"jak mamy otwarty
// modal to inne przyciski z glownego modalu nie powinny byc widoczne, to sie
// myli."* Two Backs and two Nexts, stacked within an inch of each other, and he
// pressed the wrong one.
//
// And the half of the ruling that is a PROHIBITION, which matters as much:
// *"jak zniknie 2x back to automatycznie bedzie poprawny back dzialal jak
// dziala — poprostu byly 2 i to bylo confuse."* The step-back logic is correct
// today. Nothing in this turn may change where Back goes.

const MODAL = readFileSync(new URL('../src/components/Modal.jsx', import.meta.url), 'utf8');
const FLOW = readFileSync(new URL('../src/components/NewProjectFlow.jsx', import.meta.url), 'utf8');
const WIZ = readFileSync(new URL('../src/components/WizardSettings.jsx', import.meta.url), 'utf8');
const WALL = readFileSync(new URL('../src/components/WallElevationModal.jsx', import.meta.url), 'utf8');

// ══ the shell's own half: a covered window draws no footer ══════════════════

test('F3 — the stack answers "is there a window over me"', () => {
  resetWindows();
  const parent = nextWindowSeq();
  const child = nextWindowSeq();
  assert.ok(child > parent, 'render order: the parent takes its ticket first');

  openWindow(parent);
  assert.equal(isCovered(parent), false, 'one window alone is not covered');

  openWindow(child);
  assert.equal(isCovered(parent), true, 'the parent is covered by its child');
  assert.equal(isCovered(child), false, 'and the child, on top, is not');

  closeWindow(child);
  assert.equal(isCovered(parent), false, 'the child closes and the footer comes back');
  resetWindows();
});

test('F3 — a THIRD window over both, and the order is what decides', () => {
  resetWindows();
  const a = nextWindowSeq(); const b = nextWindowSeq(); const c = nextWindowSeq();
  openWindow(a); openWindow(b); openWindow(c);
  assert.deepEqual([isCovered(a), isCovered(b), isCovered(c)], [true, true, false]);
  // The middle one closing does not uncover the bottom one — there is still a
  // window over it, which is the whole question this function answers.
  closeWindow(b);
  assert.deepEqual([isCovered(a), isCovered(c)], [true, false]);
  resetWindows();
});

test('F3 — the list is a snapshot with a stable identity, and it is subscribable', () => {
  resetWindows();
  const a = nextWindowSeq();
  const before = openWindows();
  assert.equal(openWindows(), before, 'no change, same array — useSyncExternalStore needs that');
  let told = 0;
  const off = subscribeWindows(() => { told += 1; });
  openWindow(a);
  assert.equal(told, 1);
  assert.notEqual(openWindows(), before, 'a change is a new array');
  openWindow(a);
  assert.equal(told, 1, 'opening the same window twice is not a change');
  closeWindow(a);
  assert.equal(told, 2);
  off();
  openWindow(a);
  assert.equal(told, 2, 'unsubscribed');
  resetWindows();
});

test('F3 — the shell hides the FOOTER of a covered window, and nothing else', () => {
  assert.match(MODAL, /\{footer && !covered && \(/);
  assert.match(MODAL, /data-modal-covered=\{covered \? '1' : '0'\}/);
  // The ticket is taken on the first RENDER, not in an effect: React renders
  // parents before children and runs their effects the other way round.
  assert.match(MODAL, /useState\(\(\) => nextWindowSeq\(\)\)/);
  // The × and Escape are untouched — a covered window is never one you cannot
  // leave. Both are outside the footer and neither is gated on `covered`.
  const close = MODAL.slice(MODAL.indexOf('data-modal-close="1"'), MODAL.indexOf('data-modal-close="1"') + 200);
  assert.doesNotMatch(close, /covered/);
  assert.doesNotMatch(MODAL, /covered[^\n]*escapeCloses|escapeCloses[^\n]*covered/);
});

test('F3 — the wall dialog is the stack case, and it needs no line of its own', () => {
  // The elevation's footer (Back / Save) used to stand under the element
  // window's (Remove / Done). It is the shell that fixes it, so this file has
  // no `childOpen` condition anywhere — which is the point of doing it once.
  assert.match(WALL, /<ElementModal/);
  assert.doesNotMatch(WALL, /editingElement \? null :/);
  assert.doesNotMatch(WALL, /!editing(Element)? &&\s*\(?\s*<>?\s*<button[^>]*data-elevation-back/);
});

// ══ the wizard's own half: step 5 has one row ═══════════════════════════════

test('F3 — the flow draws no Back and no Next on step 5', () => {
  assert.match(FLOW, /index > 0 && step !== 'settings' &&/);
  // The second Next is gone from this footer entirely: the only `Next` left in
  // it belongs to steps 1–3, and `Start designing` to step 6.
  const footer = FLOW.slice(FLOW.indexOf('footer={('), FLOW.indexOf('data-wizard-step={step}'));
  assert.doesNotMatch(footer, /data-next-summary="1"/);
  assert.doesNotMatch(footer, /step === 'settings' &&/);
  assert.match(footer, /data-start-designing="1"/, 'step 6 keeps its one button');
});

test('F3 — and hands the sequence the two ends of the walk', () => {
  assert.match(FLOW, /onStepBack=\{\(\) => setStep\(backStep\(step, scope\)\)\}/);
  assert.match(FLOW, /onStepNext=\{\(\) => setStep\('summary'\)\}/);
});

test('F3 — the sequence draws them, with the same gate and the same hooks', () => {
  assert.match(WIZ, /onStepBack = null, onStepNext = null/);
  // The step-Next carries the gate the flow's button carried, word for word.
  assert.match(WIZ, /nextBlocked = !carcSaved \|\| !frontsSaved;/);
  assert.match(WIZ, /'Save the carcasses and the fronts to continue'/);
  // …and both of the hooks it carried, so a walk written against T44 or T45
  // finds the same button.
  assert.match(WIZ, /data-next-hardware=\{nextTarget === 'step' \? '1' : undefined\}/);
  assert.match(WIZ, /data-next-summary=\{nextTarget === 'step' \? '1' : undefined\}/);
  // Back on 5.1 reaches the step only when there is no earlier TAB — inside a
  // container's walk and between tabs it is untouched.
  assert.match(WIZ, /if \(!backTarget && onStepBack\) \{/);
});

// ══ the prohibition ════════════════════════════════════════════════════════

test('F3 — Back’s arithmetic is NOT touched', () => {
  // The same function, the same answers, for both scopes. If this turn had
  // "fixed" the Back that jumped too far, this is the test that would have
  // caught it — the owner said it would come right on its own once there was
  // only one button, and it does.
  assert.deepEqual(stepsInScope('wall'), ['info', 'type', 'scope', 'wall', 'settings', 'summary']);
  assert.equal(backStep('info', 'wall'), 'info', 'nowhere behind the first step');
  assert.equal(backStep('type', 'wall'), 'info');
  assert.equal(backStep('scope', 'wall'), 'type');
  assert.equal(backStep('wall', 'wall'), 'scope');
  assert.equal(backStep('settings', 'wall'), 'wall');
  assert.equal(backStep('summary', 'wall'), 'settings');
  // …and the room walk, which skips the wall exactly as it always did.
  assert.equal(backStep('settings', 'room'), 'room');
  assert.equal(backStep('room', 'room'), 'scope');
});
