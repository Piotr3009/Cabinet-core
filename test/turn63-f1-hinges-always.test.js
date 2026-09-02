// ─── TURN 63 · F1 — HINGES, ALWAYS; AND PRO'S STAY X-RAY-ONLY ──────────────
//
// The owner: *"nadal nie widać zawiasów"* → *"1 — zawiasy zawsze"*.
//
// `src/3d/Hardware.jsx` states its own law: hinges and runners are X-RAY ONLY,
// because a working view of a cabinet is not a hardware drawing. That law is
// PRO's and stays PRO's. The client is buying the hardware and wants to see
// it, so the retail entry claims a channel — `hardware-always` — and the two
// X-ray gates read it beside `xray`.
//
// ─── THE TRAP CLAUDE.md WARNED ABOUT, AND HOW THE WIRING AVOIDS IT ─────────
//
// `chromeOn(part)` FALLS THROUGH to the master switch for a part nobody set,
// and PRO's master switch is ON. So a bare `chromeOn('hardware-always')` would
// read TRUE in PRO and draw every hinge in every joiner's Solid view — the one
// thing this turn was not allowed to do. The guard is therefore the channel
// AND the master switch OFF: `chromeOn('hardware-always') && !proChromeOn()`.
// Only an application that has switched PRO's chrome off can claim it, and
// only the retail entry does. This file proves both halves, off the live
// module and off the source.

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  chromeOn, proChromeOn, setChromePart, setProChrome,
} from '../src/3d/chrome.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const code = (rel) => read(rel)
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^[ \t]*\/\/.*$/gm, ' ');

/** `git grep -l`, which exits 1 when nothing matches — and nothing matching is the answer wanted. */
function grepL(word, paths) {
  try {
    return execFileSync('git', ['grep', '-l', '-e', word, '--', ...paths],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch { return ''; }
}

/** The exact expression Hardware.jsx evaluates — asserted below to BE this. */
const hardwareAlways = () => chromeOn('hardware-always') && !proChromeOn();

test('F1 · in PRO — no channel, master switch ON — the hardware stays X-ray-only', () => {
  // PRO's state: nobody has called setProChrome or setChromePart. Restore it
  // explicitly, because another test file in this process may have thrown
  // the switch.
  setProChrome(true);
  assert.equal(proChromeOn(), true, "PRO's master switch is on");
  // THE TRAP: the bare channel reads TRUE in PRO — the fall-through.
  assert.equal(chromeOn('hardware-always'), true, 'the bare channel falls through to the master switch');
  // …and the WIRED expression reads false, which is what keeps every joiner's
  // Solid view exactly what it was.
  assert.equal(hardwareAlways(), false, "PRO would draw every hinge in Solid — that is the trap, and it fired");
});

test('F1 · in retail — chrome OFF, channel claimed — the hardware draws in every view', () => {
  // The retail entry's own sequence, in its own order.
  setProChrome(false);
  setChromePart('hardware-always', true);
  assert.equal(hardwareAlways(), true, 'retail claimed the channel and the gate does not open');
  // Retail with the switch off but NO channel: still X-ray-only. The channel
  // is the decision, not the switch.
  setProChrome(false);
  assert.equal(hardwareAlways(), false, 'the switch alone must not draw hardware');
  // …and throwing the switch back to PRO clears the claim (chrome.js's own
  // rule: the master switch is the last word).
  setChromePart('hardware-always', true);
  setProChrome(true);
  assert.equal(hardwareAlways(), false, 'a claim survived the master switch');
});

test('F1 · Hardware.jsx reads that expression at BOTH gates, and PRO never names the channel', () => {
  const hw = code('src/3d/Hardware.jsx');
  assert.match(hw, /const hardwareAlways = \(\) => chromeOn\('hardware-always'\) && !proChromeOn\(\);/,
    'the guard is not the channel AND the switch');
  assert.match(hw, /\{\(xray \|\| hinges \|\| hardwareAlways\(\)\) && \(/, 'the hinge gate does not read the channel');
  assert.match(hw, /\{\(xray \|\| runners \|\| hardwareAlways\(\)\) && \(/, 'the runner gate does not read the channel — same law, same channel');
  assert.match(hw, /import \{ chromeOn, proChromeOn \} from '\.\/chrome\.js';/);

  // The retail entry claims it, at boot, beside the eleven.
  const entry = read('src/retail/main-retail.jsx');
  assert.match(entry, /setChromePart\('hardware-always', true\)/, 'the retail entry does not claim the channel');
  assert.ok(entry.indexOf("setChromePart('hardware-always', true)") < entry.indexOf("import('./RetailApp.jsx')"),
    'the channel is claimed after the app has been asked for');

  // PRO's own files never say the word. Read off the frozen surface itself.
  assert.equal(grepL('hardware-always', ['src/App.jsx', 'src/main.jsx', 'src/components', 'src/pages', 'index.html']),
    '', 'PRO names the channel');
});

test('F1 · not one byte of Hardware.jsx moved except the gate — the rest is the rule it states', () => {
  const hw = read('src/3d/Hardware.jsx');
  // The law is still written where it was, in the same words.
  assert.match(hw, /hinges and runners are X-RAY ONLY/);
  // …and nothing else in src/3d learnt the channel: the door's own hinges
  // (`DoorHinges`, rendered by UnitView) keep PRO's `showHinges || xray`
  // gate, which in retail's memory-only boot is the profile's own
  // `showInSolid: true`. One file licensed, one file touched.
  assert.match(read('src/3d/UnitView.jsx'), /front === 'door' && \(showHinges \|\| xray\)/);
  const others = grepL('hardware-always', ['src/3d']).split('\n').filter(Boolean);
  assert.deepEqual(others, ['src/3d/Hardware.jsx'], 'a second 3d file learnt the channel');
});
