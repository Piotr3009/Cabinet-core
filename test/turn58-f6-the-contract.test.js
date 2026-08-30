import test from 'node:test';
import assert from 'node:assert/strict';

import { PROBES, STANDARD_CONFIGS, kitCount } from '../scripts/t58-classify.mjs';
import {
  T58_KIT, T58_LISP_FILES, T58_LISP_STATUS, T58_ROUTINE,
  balanceOfKits, gateFaults, routineFaults,
} from '../scripts/t58-paren-balance.mjs';

// ─── TURN 58 · F6 — THE CONTRACT, IN THE SUITE ──────────────────────────────
//
// The two proof scripts are run by hand at the end of a turn and their verdicts
// are copied into a report. That is one reading, on one night, by one person.
// These assertions are the same verdicts asked every time the suite runs, so a
// later turn that quietly breaks one of tonight's claims finds out from
// `npm test` rather than from a joiner.
//
// Nothing here re-derives a number. Each test calls the script's own export and
// asserts the answer, which is what keeps the script the single home of the
// claim and this file a reader of it.

// ═══ THE CENSUS ═════════════════════════════════════════════════════════════

test('F6 · every kit balances 0/0, with no stray closing paren', () => {
  const rows = balanceOfKits();
  for (const r of rows) {
    assert.equal(r.balance, 0, `${r.name} is ${r.balance > 0 ? 'unclosed' : 'over-closed'}`);
    assert.equal(r.negativeAt, null, `${r.name} closes something it never opened`);
  }
});

test('F6 · the shelf is FOURTEEN kits — derived from the folder, never typed', () => {
  // Tonight adds LINES, not a kit. A 15 here means somebody wrote a new file
  // and the paren census, which can only go up, would have said nothing.
  assert.equal(kitCount(), 14);
  assert.equal(balanceOfKits().length, 14);
});

test('F6 · one kit may move, and only as an amendment', () => {
  assert.deepEqual(T58_LISP_FILES, [T58_KIT]);
  assert.equal(T58_LISP_STATUS[T58_KIT], 'M', 'an A would be a census that should have gone to 15');
});

// ═══ THE LAW, AND ITS ONE OWNER ═════════════════════════════════════════════

test('F6 · the hand law is defined once and mentioned in no other kit', () => {
  const faults = routineFaults();
  assert.deepEqual(faults, [], `${T58_ROUTINE}: ${faults.join('; ')}`);
});

test('F6 · …and the kit states the law in words, not only in parens', () => {
  assert.deepEqual(gateFaults(), []);
});

// ═══ BYTE-IDENTITY ══════════════════════════════════════════════════════════

test('F6 · the six standard configs are the same six they have been since T34', () => {
  assert.deepEqual(STANDARD_CONFIGS.map((c) => c.id),
    ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY']);
});

test('F6 · every probe is CLEAN — no feature of tonight reaches a golden', async () => {
  for (const [name, probe] of Object.entries(PROBES)) {
    const { rows, head } = await probe();
    const bad = rows.filter((r) => r.ok === false);
    assert.deepEqual(bad.map((r) => r.id), [],
      `probe ${name} (${head}) is not clean`);
  }
});
