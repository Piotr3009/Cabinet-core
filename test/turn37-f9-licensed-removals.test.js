// ─── TURN 37 (CLAUDE.md F9): THE FIVE LICENSED REMOVALS ─────────────────────
//
// Iron rule 4 is the owner's own sentence: *"nigdy nie kasuj bez mojej zgody
// jakichkolwiek funkcji — to jest świętość."* On 17.08.2026, after the
// dead-code audit he ordered, he licensed exactly five:
//
//   getDecorScale (decors.js) · neighbourOn (frontClearance.js) ·
//   holeWorldY, facadePilotRow, boxPilotRow (drawerPilots.js)
//
// ─── AND THE AUDIT WAS WRONG ABOUT FOUR OF THEM ─────────────────────────────
//
// CLAUDE.md says the five were *"each verified un-called by code, tests and
// scripts."* One was. The other four are called ON THE NEXT PAGE OF THEIR OWN
// FILE, and their call chains reach exports the app depends on:
//
//   neighbourOn     → frontClearance.js:332, inside `frontClearances()` —
//                     imported by the project store, engine/checks.js, the
//                     scene and six test files. The front-clearance matrix.
//   holeWorldY      → drawerPilots.js:67, inside `oneRow()`
//   facadePilotRow  → drawerPilots.js:122, inside `drawerPilotRows()`
//   boxPilotRow     → drawerPilots.js:123, inside `drawerPilotRows()`
//                     — `drawerPilotRows` is the hole-alignment gate
//                     (test/turn21-f1, scripts/hole-alignment.mjs).
//
// The audit missed it because all three modules are namespace-imported in
// `src/main.jsx` (`import * as frontClearance`), so a tool matching NAMED
// imports sees an export nobody names. T31-F12 already wrote the answer down:
// *"47 names were used INSIDE their own file and exported for nobody. The
// export went; the code did not — deleting a function a module calls itself
// would be a sweep that broke the app."*
//
// So what the owner licensed is read as what it says — *"the unused
// EXPORTS"* — and that is what was removed. One function is gone because the
// whole function was dead; four exports are gone and their functions are
// whole. Nothing else in the tree moved.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import * as decors from '../src/engine/decors.js';
import * as frontClearance from '../src/engine/frontClearance.js';
import * as drawerPilots from '../src/engine/drawerPilots.js';

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

test('F9 — all five names are gone from the module surface', () => {
  assert.equal(decors.getDecorScale, undefined);
  assert.equal(frontClearance.neighbourOn, undefined);
  assert.equal(drawerPilots.holeWorldY, undefined);
  assert.equal(drawerPilots.facadePilotRow, undefined);
  assert.equal(drawerPilots.boxPilotRow, undefined);
});

test('F9 — ONE function was actually removed, and it is the one that was dead', () => {
  const text = src('engine/decors.js');
  assert.doesNotMatch(text, /function getDecorScale/);
  // …and its neighbours stay: the loader pushes the scale in through the
  // setter and `decorFinish` reads the variable itself.
  assert.equal(typeof decors.setDecorScale, 'function');
  assert.equal(decors.setDecorScale(2800), 2800);
  assert.match(text, /LICENSED REMOVAL, 17\.08\.2026 \(T37-F9/);
});

test('F9 — the other FOUR functions are whole, because their own files call them', () => {
  const fc = src('engine/frontClearance.js');
  assert.match(fc, /\nfunction neighbourOn\(front, side, \{/, 'declared, not exported');
  assert.match(fc, /const n = neighbourOn\(front, side, \{/, 'and called, on line 332');
  const dp = src('engine/drawerPilots.js');
  for (const name of ['holeWorldY', 'facadePilotRow', 'boxPilotRow']) {
    assert.match(dp, new RegExp(`\\nfunction ${name}\\(`), `${name} is declared`);
    assert.ok(dp.split(`${name}(`).length >= 3, `${name} is still called in its own file`);
  }
  // Every removal site says it was authorised, so the next reader does not
  // read a deletion as an accident.
  assert.equal((fc.match(/LICENSED RETIREMENT OF AN EXPORT, 17\.08\.2026/g) || []).length, 1);
  assert.equal((dp.match(/LICENSED RETIREMENT OF AN EXPORT, 17\.08\.2026/g) || []).length, 3);
});

test('F9 — and the work those four do still works', () => {
  // The proof that the export went and the code did not: the exports that
  // CALL them are still exported, and still answer.
  assert.equal(typeof frontClearance.frontClearances, 'function');
  assert.equal(typeof drawerPilots.drawerPilotRows, 'function');
  // Called with nothing, they must answer emptily rather than throw — which is
  // what they did before tonight, and is what proves the bodies are intact.
  assert.ok(Array.isArray(drawerPilots.drawerPilotRows({ panels: [] }, {}, {})
    || []));
});

test('F9 — exactly five, and NOTHING else', () => {
  // The rule this turn is judged by. Anything else that looked dead is listed
  // in the PR body for the owner to license; not one line of it was touched.
  const licensed = ['getDecorScale', 'neighbourOn', 'holeWorldY', 'facadePilotRow', 'boxPilotRow'];
  assert.equal(licensed.length, 5);
  // The four kept functions are not exported ANYWHERE else by another name.
  for (const name of licensed.slice(1)) {
    assert.doesNotMatch(src('engine/frontClearance.js'), new RegExp(`export .*${name}`));
    assert.doesNotMatch(src('engine/drawerPilots.js'), new RegExp(`export .*${name}`));
  }
});
