import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_SCOPE, stepsInScope, backStep } from '../src/lib/wizardSteps.js';
import { PROJECT_TYPES, normaliseScope } from '../src/engine/projectTypes.js';

// ─── TURN 49 · F1 — THE SCOPE ARRIVES AS ONE WALL ───────────────────────────
//
// The owner, 25.08.2026: *"default powinno sie ustawic na one wall, zawsze."*
//
// A new project opens with the scope already set to One Wall, every time. It is
// what he starts from, and choosing it by hand every time is a click that never
// had a reason.
//
// Two halves, and the second is the one that makes "zawsze" true: the constant
// says WALL, and nothing but the scope cards writes the scope any more. T44's
// flow re-derived it from the project type on every card touch, so a joiner who
// wanted a kitchen got a room back whatever he had chosen a moment earlier.

const FLOW = readFileSync(new URL('../src/components/NewProjectFlow.jsx', import.meta.url), 'utf8');

test('F1 — the wizard opens on One Wall', () => {
  assert.equal(DEFAULT_SCOPE, 'wall');
  // It is a scope the flow actually knows, not a spelling of one.
  assert.equal(normaliseScope(DEFAULT_SCOPE), 'wall');
});

test('F1 — and the step list that follows from it is the one-wall walk', () => {
  const shown = stepsInScope(DEFAULT_SCOPE);
  assert.deepEqual(shown, ['info', 'type', 'scope', 'wall', 'settings', 'summary']);
  // The room's own step is not in it — a one-wall job never sees the plan.
  assert.ok(!shown.includes('room'));
  // Back is untouched by this turn (F3 says why) and still walks that list.
  assert.equal(backStep('wall', DEFAULT_SCOPE), 'scope');
  assert.equal(backStep('settings', DEFAULT_SCOPE), 'wall');
});

test('F1 — the project type no longer writes the scope', () => {
  // The two lines that made the scope follow the type, and the flag that
  // existed only to stop them overwriting a hand.
  assert.doesNotMatch(FLOW, /scopeTouched\)? *(=|\?|&&|\))/, 'the follow-the-type flag');
  assert.doesNotMatch(FLOW, /setScope\(t\.scope\)/, 'the type CARD writing the scope');
  assert.doesNotMatch(FLOW, /setScope\(type\.scope\)/, 'the type COMMIT writing the scope');
  // …and the flow opens on the constant rather than on the first type's scope.
  assert.match(FLOW, /useState\(DEFAULT_SCOPE\)/);
  assert.doesNotMatch(FLOW, /useState\(PROJECT_TYPES\[0\]\.scope\)/);
});

test('F1 — the type still SUGGESTS, in a sentence, and the first type would have disagreed', () => {
  // The suggestion survives: it is advice on the scope step, one click from
  // being taken. That is the whole of what the removal cost.
  assert.match(FLOW, /usually starts as/);
  // And it is a real disagreement, not a decorative one: the first project type
  // is a whole-room job, so a flow that still followed the type would open on a
  // room and this test would be reading a comment rather than a rule.
  assert.equal(PROJECT_TYPES[0].scope, 'room');
});

test('F1 — the scope is written into the project the moment it is created', () => {
  // A job abandoned before step 3 is still a ONE WALL job: `commitInfo` writes
  // it, so the store never carries the engine default's `room` for a project
  // this wizard made.
  const commitInfo = FLOW.slice(FLOW.indexOf('const commitInfo'), FLOW.indexOf('const commitType'));
  assert.match(commitInfo, /setDesign\(\{ scope \}\)/);
});
