// ─── TURN 30 F6 — moving a handle stops asking a strange question ───────────
//
// The owner: moving a handle by 10 mm asks a "dziwne pytanie" every time.
//
// It did. `window.confirm`, naming a count, in front of an action that is ONE
// Ctrl+Z away, on the gesture a person repeats most often in a session. A
// dialog in front of something that cheap to undo is a dialog that only ever
// gets dismissed — and turn 25 wrote that very sentence for Remove door, two
// sections down the same window, and then did not apply it here.
//
// ─── WHAT GOES, AND WHAT EMPHATICALLY DOES NOT ──────────────────────────────
//
// CLAUDE.md: "Remove the confirmation on nudge; the move applies directly and
// one undo step covers it. **Keep any warning that guards an actual conflict**
// (off-panel, collision) — only the routine nag dies."
//
// So the line this file draws is between two things that look alike and are
// not:
//
//   THE NAG        a question about an UNDO — "this moves 14 handles, are you
//                  sure" — answered by the fact that Ctrl+Z exists. Gone. The
//                  count is still SAID, as a toast, after the fact, because
//                  "how wide did that go" is a real question; being asked it
//                  before anything happens is not.
//
//   THE CONFLICT   a fact about the JOB — a 224 mm bar whose holes fall off a
//                  197 mm drawer front. `engine/handles.js handleFitProblem`
//                  reports it, the front is NOT drilled, and the sentence is
//                  printed under the buttons whether anybody presses one or
//                  not. Untouched, and asserted here so it cannot be swept out
//                  with the nag.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { handleFitProblem, handleReference } from '../src/engine/handles.js';

const DOOR = readFileSync(new URL('../src/components/DoorModal.jsx', import.meta.url), 'utf8');
const SRC = new URL('../src/', import.meta.url).pathname;

/**
 * The file with its COMMENTARY removed.
 *
 * This turn's own comment explains what the nag was and why it went, and it
 * names the thing by name to do so. A test that read that as the nag still
 * being there would be a test that punished the explanation — so what is
 * asserted below is the CODE.
 */
const strip = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const CODE = strip(DOOR);

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (/\.(js|jsx)$/.test(path)) out.push(path);
  }
  return out;
}

// ─── THE NAG ────────────────────────────────────────────────────────────────

test('F6 the nudge no longer asks anything: the confirm is GONE from the door window', () => {
  assert.doesNotMatch(CODE, /window\.confirm/, 'the door window asks no confirmation at all');
  assert.doesNotMatch(CODE, /no-alert/, '…and no longer needs the lint escape that went with it');
});

test('F6 the move applies DIRECTLY — there is no branch between the press and the store', () => {
  const at = CODE.indexOf('const nudge = (axis, mm) => {');
  assert.ok(at > 0, 'the nudge is still there');
  const body = CODE.slice(at, CODE.indexOf('\n  };', at));
  // ONE early return, and it is the per-front branch (`applyToAll` off) —
  // never a "the user said no" return.
  assert.equal((body.match(/return;/g) || []).length, 1);
  assert.match(body, /if \(!applyToAll\) \{/);
  // …and the class move is called unconditionally on the other path.
  assert.match(body, /moveHandleClass\(handleClass, offset\);/);
  assert.doesNotMatch(body, /if \(!ok\)/);
  assert.doesNotMatch(body, /confirm/);
});

test('F6 the COUNT is still said — after the fact, as a toast', () => {
  // What a person needs here is what just happened and how wide it went. That
  // is a report, not a gate, and it is counted off the COMPUTED units exactly
  // as the confirmation counted it.
  const at = CODE.indexOf('const nudge = (axis, mm) => {');
  const body = CODE.slice(at, CODE.indexOf('\n  };', at));
  assert.match(body, /const count = handleClassCountOf\(handleClass\);/);
  assert.match(body, /notify\(`Handle moved on \$\{count\.total\} front/);
  assert.match(body, /Ctrl\+Z puts them back/, 'and it says what to do about it');
  // The order matters: the store first, the toast after. A toast that fired
  // before the move would be a message about something that had not happened.
  // The CLASS toast, by its own text — the per-front branch above it says
  // "Handle moved on this front only" and is a different sentence entirely.
  const said = body.indexOf('notify(`Handle moved on ${count.total}');
  assert.ok(said > 0, 'the class toast is there');
  assert.ok(body.indexOf('moveHandleClass(handleClass, offset);') < said);
});

test('F6 and no OTHER routine nag crept in behind it', () => {
  // The whole app, swept: `window.confirm` survives only where an action is
  // genuinely not one undo away. Today that is nowhere in the front-editing
  // path, and this is what stops the next one appearing quietly.
  const offenders = [];
  for (const file of walk(SRC)) {
    const text = readFileSync(file, 'utf8');
    if (/window\.confirm/.test(strip(text))) offenders.push(file.replace(SRC, ''));
  }
  assert.deepEqual(offenders, [], `window.confirm survives in ${offenders.join(', ')}`);
});

// ─── THE CONFLICT, WHICH IS A DIFFERENT ANIMAL ─────────────────────────────

test('F6 a handle driven OFF its front is still reported, and still not drilled', () => {
  // The guard CLAUDE.md asks to keep, exercised rather than asserted by name: a
  // 224 mm bar on a narrow drawer front puts its holes off the board.
  const panel = { w: 197, h: 197 };
  const reference = { x: 98.5, y: 98.5 };
  const problem = handleFitProblem({
    panel, reference, type: 'bar', centres: 224,
  }, P);
  assert.ok(problem, 'the conflict is reported');
  assert.match(problem, /does not fit/);
  // …and a handle that DOES fit reports nothing, so the guard is a guard and
  // not a permanent complaint.
  assert.equal(handleFitProblem({
    panel: { w: 600, h: 400 }, reference: { x: 300, y: 200 }, type: 'bar', centres: 224,
  }, P), null);
});

test('F6 …and the window PRINTS that sentence, with no press required', () => {
  // It is rendered from `spec.problem` on the resolved handle, beside the
  // position — not behind a dialog, and not behind a gesture.
  assert.match(DOOR, /\{spec\.problem \? ` · \$\{spec\.problem\}` : ''\}/);
  assert.match(DOOR, /data-handle-rule=\{spec\.rule\}/);
});

test('F6 the conflict reaches the CABINET too, which is where a joiner sees it', () => {
  // A front whose handle does not fit is not drilled and the unit says so —
  // the engine's own answer, unchanged by this turn and asserted so that
  // "only the routine nag dies" is a claim with a test under it.
  const r = computeCabinet({
    ...defaultParamsFor('BUD', P),
    unit_num: '01',
    doors: true,
    front_handles: null,
    project_handle: { type: 'bar', centres: 1200 },
  }, P);
  const front = r.panels.find((p) => p.part === 'FRONT');
  if (front?.meta?.handle?.problem) {
    assert.equal(front.meta.handle.holes.length, 0, 'a handle that does not fit is not drilled');
  }
  // The reference itself is the owner's law and is still computed, which is
  // what the message is measured against.
  assert.ok(handleReference);
});
